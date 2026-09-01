import asyncio
from datetime import datetime, timezone
import structlog
from app.database import get_sync_db
from app.llm import get_llm_gateway
from app.models import (
    AuditLog,
    BenchmarkProfile,
    Candidate,
    MailQueue,
    Role,
    Round,
    RoundResult,
)
from app.workers.resume_tasks import publish_event
from app.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(bind=True)
def run_comparative_resume_matching(self, role_id: str):
    """
    Comparative Resume Matching Engine:
    1. Gathers candidate projects/experience in token-bounded batches.
    2. Runs sliding-window tournament synthesis to extract the definitive Top 10 Benchmark Projects.
    3. Saves Top 10 Benchmark Projects to BenchmarkProfile.
    4. Evaluates each candidate against the benchmark + JD, generating comparative scores and personalized project recommendations.
    5. Sorts candidates and applies cutoff threshold.
    6. Advances qualifying candidates to Round 2 (current_round = 1, status = 'screened').
    7. For disqualified candidates outside the cutoff, queues personalized rejection emails explaining what level/kind of project to build.
    """
    db = get_sync_db()
    llm = get_llm_gateway()
    try:
        role = db.query(Role).filter(Role.id == role_id).first()
        if not role:
            raise ValueError(f"Role {role_id} not found")

        candidates = (
            db.query(Candidate)
            .filter(Candidate.role_id == role_id)
            .all()
        )
        if not candidates:
            logger.info("no_candidates_for_comparative_matching", role_id=role_id)
            return {"status": "completed", "candidates_processed": 0}

        publish_event(
            role_id=role_id,
            event_type="comparative_matching_started",
            payload={"message": f"Starting Comparative Resume Matching across {len(candidates)} candidates..."},
        )

        jd_text = role.description or role.title

        # ── Step 1: Chunk candidate projects into token-bounded batches (5-8 candidates per batch) ──
        batches: list[list[dict]] = []
        current_batch: list[dict] = []
        for cand in candidates:
            cand_projects = cand.projects if isinstance(cand.projects, list) else []
            cand_proj_str = ", ".join(cand_projects[:2]) if cand_projects else (cand.resume_text[:200] if cand.resume_text else "")

            project_entry = {
                "id": cand.id,
                "title": f"{cand.name}'s Systems Work",
                "description": f"Skills: {', '.join((cand.skills or [])[:4])}. Exp: {cand.experience_years}y. Projects: {cand_proj_str}",
                "technologies": (cand.skills or [])[:4] or ["Backend", "Systems"],
                "complexity_score": min(10, max(5, cand.experience_years + 3)),
            }
            current_batch.append(project_entry)
            if len(current_batch) >= 10:
                batches.append(current_batch)
                current_batch = []
        if current_batch:
            batches.append(current_batch)

        # ── Step 2: Tournament Sliding-Window Synthesis of Top 10 Benchmark Projects ──
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            top_10_projects = loop.run_until_complete(
                llm.synthesize_top_benchmark_projects(jd_text, batches)
            )
        finally:
            loop.close()

        # Persist Top 10 Projects to BenchmarkProfile
        bench_profile = (
            db.query(BenchmarkProfile)
            .filter(BenchmarkProfile.role_id == role_id)
            .first()
        )
        if not bench_profile:
            bench_profile = BenchmarkProfile(
                role_id=role_id,
                source_type="comparative_tournament",
                top_projects=top_10_projects,
            )
            db.add(bench_profile)
        else:
            bench_profile.top_projects = top_10_projects
        db.commit()

        publish_event(
            role_id=role_id,
            event_type="top_benchmark_synthesized",
            payload={
                "message": f"Synthesized Top 10 Benchmark Projects for {role.title}",
                "top_projects_count": len(top_10_projects),
            },
        )

        # ── Step 3: Comparative Scoring of Each Candidate ──
        resume_round = (
            db.query(Round)
            .filter(Round.role_id == role_id, Round.type == "resume_screen")
            .first()
        )
        round_id = resume_round.id if resume_round else "resume_round"

        async def _score_all_candidates():
            sem = asyncio.Semaphore(4)

            async def _score_one(c):
                async with sem:
                    comp_res = await llm.comparative_score_candidate(
                        jd_text=jd_text,
                        top_benchmark_projects=top_10_projects,
                        candidate_resume=c.resume_text or "",
                        candidate_projects=c.projects if isinstance(c.projects, list) else [],
                        candidate_name=c.name,
                    )
                    return {
                        "candidate": c,
                        "score": comp_res.comparative_score,
                        "relative_depth": comp_res.relative_depth,
                        "missing_areas": comp_res.missing_areas,
                        "recommended_project": comp_res.recommended_project_to_build,
                    }

            return await asyncio.gather(*[_score_one(c) for c in candidates])

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            eval_results = list(loop.run_until_complete(_score_all_candidates()))
        finally:
            loop.close()

        # ── Step 4: Sort by Comparative Score & Apply Cutoff Threshold ──
        eval_results.sort(key=lambda x: x["score"], reverse=True)

        cutoff_limit = 300
        if resume_round:
            if getattr(resume_round, "cutoff_type", None) == "count" and getattr(resume_round, "cutoff_count", None):
                cutoff_limit = resume_round.cutoff_count
            elif getattr(resume_round, "cutoff_threshold", 0) > 0:
                cutoff_limit = resume_round.cutoff_threshold

        for rank, item in enumerate(eval_results, start=1):
            cand = item["candidate"]
            score = item["score"]
            rec_proj = item["recommended_project"]
            is_qualified = rank <= cutoff_limit

            cand.overall_score = score
            cand.ai_match_score = score
            cand.status = "screened" if is_qualified else "rejected"
            cand.current_round = 1 if is_qualified else 0

            # Update or create RoundResult
            rr = (
                db.query(RoundResult)
                .filter(RoundResult.candidate_id == cand.id, RoundResult.round_type == "resume_screen")
                .first()
            )
            summary_text = (
                f"Rank #{rank} (Top {round((rank/len(eval_results))*100)}%). "
                f"Comparative Score: {score}/100. "
                f"Level: {item['relative_depth'].replace('_', ' ').title()}."
            )
            if not rr:
                rr = RoundResult(
                    candidate_id=cand.id,
                    round_id=round_id,
                    round_name=resume_round.name if resume_round else "Resume Screen",
                    round_type="resume_screen",
                    status="passed" if is_qualified else "failed",
                    score=score,
                    ai_verdict=rec_proj,
                    ai_summary=summary_text,
                    evaluated_at=datetime.now(timezone.utc),
                )
                db.add(rr)
            else:
                rr.score = score
                rr.status = "passed" if is_qualified else "failed"
                rr.ai_verdict = rec_proj
                rr.ai_summary = summary_text
                rr.evaluated_at = datetime.now(timezone.utc)

            # Audit log
            audit = AuditLog(
                candidate_id=cand.id,
                action=f"Comparative Benchmark Ranking #{rank}",
                actor="AI Comparative Evaluator",
                actor_type="ai",
                detail=f"Score: {score} | Qualified: {is_qualified} | Recommended: {rec_proj[:120]}",
                prompt_template_id="comparative_eval_v1",
                model_name="omniroute",
                model_input_snapshot=f"Role: {role.title} | Rank: {rank}",
                model_output_raw=rec_proj,
                final_decision="passed" if is_qualified else "failed",
                timestamp=datetime.now(timezone.utc),
            )
            db.add(audit)

            # If rejected (outside cutoff), queue personalized email with project recommendation
            if not is_qualified and cand.email:
                missing_str = ", ".join(item["missing_areas"]) if item["missing_areas"] else "depth in distributed systems architecture"
                mail_body = (
                    f"Thank you for taking the time to apply for the {role.title} position at our company. "
                    f"While our team was genuinely impressed by your background, we experienced an exceptionally high volume of applications "
                    f"for this role.\n\n"
                    f"Based on our comparative evaluation against the top benchmark candidates in the applicant pool:\n"
                    f"• Areas of focus: {missing_str}.\n"
                    f"• Recommended project direction: {rec_proj}\n\n"
                    f"We encourage you to continue building projects at this level and invite you to apply for future opportunities with our team."
                )
                mail_entry = MailQueue(
                    candidate_id=cand.id,
                    template_name="comparative_rejection_feedback",
                    recipient_email=cand.email,
                    recipient_name=cand.name,
                    subject=f"Update on your application for {role.title}",
                    body_html=mail_body.replace("\n", "<br/>"),
                    body_text=mail_body,
                    status="queued",
                    sent_at=None,
                )
                db.add(mail_entry)

        db.commit()

        publish_event(
            role_id=role_id,
            event_type="comparative_matching_completed",
            payload={
                "role_id": role_id,
                "total_evaluated": len(eval_results),
                "qualified_count": min(len(eval_results), cutoff_limit),
                "disqualified_count": max(0, len(eval_results) - cutoff_limit),
                "cutoff_limit": cutoff_limit,
            },
        )

        return {
            "status": "completed",
            "total_evaluated": len(eval_results),
            "qualified": min(len(eval_results), cutoff_limit),
            "cutoff_limit": cutoff_limit,
        }

    except Exception as exc:
        db.rollback()
        logger.error("comparative_matching_failed", role_id=role_id, error=str(exc))
        raise exc
    finally:
        db.close()

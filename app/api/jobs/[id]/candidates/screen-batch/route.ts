import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  screenResumeWith50PercentRule,
  runComparativeResumeMatchingPass,
} from "@/lib/ai/screening-engine";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const rescreenAll = Boolean(body.rescreenAll);
    const customCutoff = body.cutoff ? Number(body.cutoff) : null;

    const job = await prisma.jobProfile.findUnique({
      where: { id: jobId },
      include: {
        pipeline: {
          orderBy: { order: "asc" },
        },
        candidates: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job profile not found." }, { status: 404 });
    }

    const resumeRound = job.pipeline.find((r) => r.type === "RESUME_SCREENING") || job.pipeline[0];
    let cutoff = customCutoff || 50;

    if (!customCutoff && resumeRound?.config) {
      try {
        const parsedConfig = JSON.parse(resumeRound.config);
        if (parsedConfig.cutoff && Number(parsedConfig.cutoff) > 0) {
          cutoff = Number(parsedConfig.cutoff);
        }
      } catch (e) {
        // ignore JSON parse error
      }
    }

    // Identify candidates to screen
    const targetCandidates = rescreenAll
      ? job.candidates
      : job.candidates.filter((c) => c.status === "PENDING");

    if (targetCandidates.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending candidates to screen.",
        processedCount: 0,
        shortlistedCount: job.candidates.filter((c) => c.status === "SHORTLISTED").length,
        rejectedCount: job.candidates.filter((c) => c.status === "REJECTED").length,
      });
    }

    // Step 1: Screen each candidate with the >= 50% Match Rule
    const initialScreeningResults = [];
    for (const cand of targetCandidates) {
      const evalResult = await screenResumeWith50PercentRule({
        candidateName: cand.name,
        candidateEmail: cand.email,
        resumeText: cand.resumeText || "",
        jobTitle: job.title,
        jobDescription: job.description,
      });

      initialScreeningResults.push({
        candidate: cand,
        evalResult,
      });
    }

    // Split candidates based on the 50% rule
    const matchingPool = initialScreeningResults.filter((r) => r.evalResult.matches);
    const nonMatchingPool = initialScreeningResults.filter((r) => !r.evalResult.matches);

    let finalShortlistedIds = new Set<string>();
    let comparativeApplied = false;
    let comparativeRankMap = new Map<string, { comparativeScore: number; mailBody?: string }>();

    // Step 2: Comparative Matching if Matching Count > Cutoff
    if (matchingPool.length > cutoff) {
      comparativeApplied = true;
      const comparativeResults = await runComparativeResumeMatchingPass({
        jobTitle: job.title,
        jobDescription: job.description,
        candidates: matchingPool.map((m) => ({
          id: m.candidate.id,
          name: m.candidate.name,
          email: m.candidate.email,
          resumeText: m.candidate.resumeText || "",
          initialScore: m.evalResult.score,
          matchedSkills: m.evalResult.matchedSkills,
          missingSkills: m.evalResult.missingSkills,
        })),
        cutoff,
      });

      comparativeResults.forEach((cr) => {
        if (cr.isQualified) {
          finalShortlistedIds.add(cr.candidateId);
        }
        comparativeRankMap.set(cr.candidateId, {
          comparativeScore: cr.comparativeScore,
          mailBody: cr.mailBody,
        });
      });
    } else {
      // All matching candidates qualify
      matchingPool.forEach((m) => finalShortlistedIds.add(m.candidate.id));
    }

    // Step 3: Persist updates to SQLite Database
    for (const item of initialScreeningResults) {
      const cand = item.candidate;
      const isShortlisted = finalShortlistedIds.has(cand.id);
      const isComparativeCutoff = matchingPool.some((m) => m.candidate.id === cand.id) && !isShortlisted;

      let score = item.evalResult.score;
      let finalMailBody = item.evalResult.mailBody;

      if (comparativeRankMap.has(cand.id)) {
        const comp = comparativeRankMap.get(cand.id)!;
        score = comp.comparativeScore;
        if (comp.mailBody && !isShortlisted) {
          finalMailBody = comp.mailBody;
        }
      }

      const status = isShortlisted ? "SHORTLISTED" : "REJECTED";

      await prisma.candidate.update({
        where: { id: cand.id },
        data: {
          status,
          currentRound: isShortlisted ? 1 : 0,
          personalizedReply: finalMailBody,
        },
      });

      if (resumeRound) {
        // Create or update RoundResult
        const existingResult = await prisma.roundResult.findFirst({
          where: {
            candidateId: cand.id,
            pipelineRoundId: resumeRound.id,
          },
        });

        const trace = [
          {
            stepName: "50% Core Skill & Requirement Matching Gate",
            category: "STACK_EXTRACTION",
            timestamp: new Date().toISOString(),
            status: item.evalResult.matches ? "PASSED" : "FAILED",
            reasoning: item.evalResult.reasoning,
            metric: `${item.evalResult.matchPercentage}% match ratio (threshold: 50%)`,
          },
          ...(comparativeApplied && matchingPool.some((m) => m.candidate.id === cand.id)
            ? [
                {
                  stepName: "Comparative Pool Tournament Ranking",
                  category: "IMPACT_ANALYSIS",
                  timestamp: new Date().toISOString(),
                  status: isShortlisted ? "PASSED" : "FAILED",
                  reasoning: isShortlisted
                    ? `Candidate placed within Top ${cutoff} cutoff threshold in comparative tournament.`
                    : `Candidate fell outside Top ${cutoff} cutoff threshold. Personalized project recommendation generated.`,
                  metric: `Comparative Score: ${score}/100`,
                },
              ]
            : []),
        ];

        if (existingResult) {
          await prisma.roundResult.update({
            where: { id: existingResult.id },
            data: {
              score,
              passed: isShortlisted,
              feedback: item.evalResult.reasoning,
              agentTrace: JSON.stringify(trace),
            },
          });
        } else {
          await prisma.roundResult.create({
            data: {
              candidateId: cand.id,
              pipelineRoundId: resumeRound.id,
              score,
              passed: isShortlisted,
              feedback: item.evalResult.reasoning,
              agentTrace: JSON.stringify(trace),
            },
          });
        }
      }
    }

    const updatedJob = await prisma.jobProfile.findUnique({
      where: { id: jobId },
      include: {
        candidates: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const shortlisted = (updatedJob?.candidates || []).filter((c) => c.status === "SHORTLISTED");
    const notShortlisted = (updatedJob?.candidates || []).filter((c) => c.status === "REJECTED");

    return NextResponse.json({
      success: true,
      processedCount: targetCandidates.length,
      shortlistedCount: shortlisted.length,
      rejectedCount: notShortlisted.length,
      cutoff,
      comparativeApplied,
      candidates: updatedJob?.candidates || [],
    });
  } catch (err: any) {
    console.error("Error executing batch resume screening:", err);
    return NextResponse.json(
      { error: err.message || "Failed to execute batch AI screening." },
      { status: 500 }
    );
  }
}


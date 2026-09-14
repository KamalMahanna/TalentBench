import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runResumeScreeningAgent } from "@/lib/ai/resume-screener";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { jobProfileId, files, autoScreen } = body;

    if (!jobProfileId) {
      return NextResponse.json(
        { error: "Target Job Profile ID is required." },
        { status: 400 }
      );
    }

    const job = await prisma.jobProfile.findUnique({
      where: { id: jobProfileId },
      include: {
        pipeline: {
          where: { type: "RESUME_SCREENING" },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job profile not found." }, { status: 404 });
    }

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "No candidate files provided for ingestion." },
        { status: 400 }
      );
    }

    const createdCandidates = [];
    const resumeScreeningRoundId = job.pipeline[0]?.id;

    for (const file of files) {
      // Clean candidate metadata or infer from filename/mock content
      const name = file.name ? file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ") : "Candidate Applicant";
      const cleanEmail = file.email || `${name.toLowerCase().replace(/\s+/g, ".")}@applicant.io`;
      const expYears = file.experienceYears !== undefined ? Number(file.experienceYears) : Math.floor(Math.random() * 5) + 4;
      const skills = file.skills || "Distributed Systems, Go, Kubernetes, Cloud Architecture, SQL";
      const resumeText = file.resumeText || `Seasoned software engineer with ${expYears} years of experience architecting distributed services, microservices, and databases. Proven track record in high-scale production systems.`;

      const candidate = await prisma.candidate.create({
        data: {
          name,
          email: cleanEmail,
          phone: file.phone || "+1 (555) 234-5678",
          experienceYears: expYears,
          resumeText,
          skills,
          jobProfileId,
          status: "PENDING",
        },
      });

      // Optionally trigger immediate autonomous AI screening
      if (autoScreen && resumeScreeningRoundId) {
        try {
          const screening = await runResumeScreeningAgent({
            candidateName: candidate.name,
            candidateEmail: candidate.email,
            candidateExperience: candidate.experienceYears,
            resumeText: candidate.resumeText || "",
            jobTitle: job.title,
            jobDescription: job.description,
            minExperience: job.minExperience,
            maxExperience: job.maxExperience,
          });

          await prisma.roundResult.create({
            data: {
              candidateId: candidate.id,
              pipelineRoundId: resumeScreeningRoundId,
              score: screening.score,
              passed: screening.passed,
              agentTrace: JSON.stringify(screening.agentTrace),
              feedback: screening.feedbackSummary,
            },
          });

          await prisma.candidate.update({
            where: { id: candidate.id },
            data: {
              status: screening.status,
              personalizedReply: screening.personalizedReply,
              currentRound: screening.passed ? 1 : 0,
            },
          });
        } catch (screenErr) {
          console.error("Auto screen failed for candidate:", candidate.id, screenErr);
        }
      }

      createdCandidates.push(candidate);
    }

    return NextResponse.json({
      success: true,
      processed: createdCandidates.length,
      candidates: createdCandidates,
    });
  } catch (err: any) {
    console.error("Bulk upload failed:", err);
    return NextResponse.json(
      { error: "Bulk upload ingestion failed." },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runResumeScreeningAgent } from "@/lib/ai/resume-screener";

export async function POST(req: Request) {
  try {
    const { candidateId, pipelineRoundId } = await req.json();

    if (!candidateId) {
      return NextResponse.json({ error: "candidateId is required." }, { status: 400 });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        jobProfile: {
          include: {
            pipeline: {
              where: { type: "RESUME_SCREENING" },
            },
          },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
    }

    const targetRoundId =
      pipelineRoundId || candidate.jobProfile.pipeline[0]?.id;

    if (!targetRoundId) {
      return NextResponse.json(
        { error: "No Resume Screening round configured for this pipeline." },
        { status: 400 }
      );
    }

    // Execute the AI Screening Agent
    const screening = await runResumeScreeningAgent({
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      candidateExperience: candidate.experienceYears,
      resumeText: candidate.resumeText || "",
      jobTitle: candidate.jobProfile.title,
      jobDescription: candidate.jobProfile.description,
      minExperience: candidate.jobProfile.minExperience,
      maxExperience: candidate.jobProfile.maxExperience,
    });

    // Store RoundResult with full agent trace
    const roundResult = await prisma.roundResult.create({
      data: {
        candidateId: candidate.id,
        pipelineRoundId: targetRoundId,
        score: screening.score,
        passed: screening.passed,
        agentTrace: JSON.stringify(screening.agentTrace),
        feedback: screening.feedbackSummary,
      },
    });

    // Update candidate status and generated personalized reply
    const updatedCandidate = await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        status: screening.status,
        personalizedReply: screening.personalizedReply,
        currentRound: screening.passed ? 1 : 0,
      },
      include: {
        roundResults: {
          include: { pipelineRound: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      screening,
      roundResult,
      candidate: updatedCandidate,
    });
  } catch (err: any) {
    console.error("Error during AI resume screening:", err);
    return NextResponse.json(
      { error: "AI resume screening failed." },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await context.params;
    const body = await req.json().catch(() => ({}));

    const {
      candidateId,
      pipelineRoundId,
      score,
      passed,
      feedback,
      agentTrace,
      action = "SAVE_EVALUATION", // "ADVANCE" | "REJECT" | "HIRE" | "SAVE_EVALUATION"
      targetRoundOrder,
      personalizedReply,
    } = body;

    if (!jobId || !candidateId) {
      return NextResponse.json(
        { error: "jobId and candidateId are required." },
        { status: 400 }
      );
    }

    // Verify candidate exists and belongs to this job
    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, jobProfileId: jobId },
      include: {
        jobProfile: {
          include: {
            pipeline: { orderBy: { order: "asc" } },
          },
        },
        roundResults: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found for this job profile." },
        { status: 404 }
      );
    }

    // Identify target pipeline round
    let round = null;
    if (pipelineRoundId) {
      round = candidate.jobProfile.pipeline.find((p) => p.id === pipelineRoundId);
    }
    if (!round) {
      round =
        candidate.jobProfile.pipeline.find((p) => p.order === candidate.currentRound) ||
        candidate.jobProfile.pipeline[0];
    }

    if (!round) {
      return NextResponse.json(
        { error: "No matching pipeline round found." },
        { status: 404 }
      );
    }

    // 1. Create or update RoundResult
    let roundResult = null;
    const existingResult = candidate.roundResults.find(
      (r) => r.pipelineRoundId === round.id
    );

    const serializedTrace =
      typeof agentTrace === "string"
        ? agentTrace
        : agentTrace
        ? JSON.stringify(agentTrace)
        : null;

    if (existingResult) {
      roundResult = await prisma.roundResult.update({
        where: { id: existingResult.id },
        data: {
          score: score !== undefined ? Number(score) : existingResult.score,
          passed: passed !== undefined ? Boolean(passed) : existingResult.passed,
          feedback: feedback !== undefined ? feedback : existingResult.feedback,
          agentTrace: serializedTrace || existingResult.agentTrace,
        },
      });
    } else {
      roundResult = await prisma.roundResult.create({
        data: {
          candidateId: candidate.id,
          pipelineRoundId: round.id,
          score: score !== undefined ? Number(score) : 75,
          passed: passed !== undefined ? Boolean(passed) : true,
          feedback: feedback || `Evaluated for ${round.title}`,
          agentTrace: serializedTrace,
        },
      });
    }

    // 2. Determine Candidate Status and currentRound transition
    let updatedStatus = candidate.status;
    let updatedRound = candidate.currentRound;

    const pipelineRounds = candidate.jobProfile.pipeline;
    const currentRoundIdx = round.order;
    const nextRoundOrderCalculated =
      targetRoundOrder !== undefined
        ? Number(targetRoundOrder)
        : currentRoundIdx + 1;

    const isLastRound = currentRoundIdx >= pipelineRounds.length - 1;

    if (action === "HIRE" || (isLastRound && passed && action === "ADVANCE")) {
      updatedStatus = "HIRED";
      updatedRound = pipelineRounds.length;
    } else if (action === "ADVANCE") {
      updatedStatus = "SHORTLISTED";
      updatedRound = Math.max(candidate.currentRound, nextRoundOrderCalculated);
    } else if (action === "REJECT") {
      updatedStatus = "REJECTED";
    } else if (action === "IN_REVIEW") {
      updatedStatus = "IN_REVIEW";
    }

    const updatePayload: any = {
      status: updatedStatus,
      currentRound: updatedRound,
    };

    if (personalizedReply) {
      updatePayload.personalizedReply = personalizedReply;
    }

    const updatedCandidate = await prisma.candidate.update({
      where: { id: candidate.id },
      data: updatePayload,
      include: {
        roundResults: {
          include: { pipelineRound: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Candidate ${candidate.name} updated: status=${updatedStatus}, round=${updatedRound}`,
      candidate: updatedCandidate,
      roundResult,
    });
  } catch (err: any) {
    console.error("Error evaluating round candidate:", err);
    return NextResponse.json(
      { error: err.message || "Failed to evaluate candidate in round." },
      { status: 500 }
    );
  }
}


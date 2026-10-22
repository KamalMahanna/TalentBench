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
      pipelineRoundId,
      candidateIds = [],
      action = "ADVANCE", // "ADVANCE" | "REJECT" | "HIRE"
      defaultScore = 80,
      feedback = "Batch updated by recruiter",
    } = body;

    if (!jobId || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json(
        { error: "jobId and candidateIds array are required." },
        { status: 400 }
      );
    }

    const job = await prisma.jobProfile.findUnique({
      where: { id: jobId },
      include: { pipeline: { orderBy: { order: "asc" } } },
    });

    if (!job) {
      return NextResponse.json({ error: "Job Profile not found." }, { status: 404 });
    }

    const round =
      job.pipeline.find((p) => p.id === pipelineRoundId) || job.pipeline[0];

    const currentRoundIdx = round ? round.order : 0;
    const isLastRound = currentRoundIdx >= job.pipeline.length - 1;
    const nextRoundOrder = currentRoundIdx + 1;

    let updatedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const candId of candidateIds) {
        const cand = await tx.candidate.findFirst({
          where: { id: candId, jobProfileId: jobId },
        });

        if (!cand) continue;

        let newStatus = cand.status;
        let newRound = cand.currentRound;

        if (action === "HIRE" || (isLastRound && action === "ADVANCE")) {
          newStatus = "HIRED";
          newRound = job.pipeline.length;
        } else if (action === "ADVANCE") {
          newStatus = "SHORTLISTED";
          newRound = Math.max(cand.currentRound, nextRoundOrder);
        } else if (action === "REJECT") {
          newStatus = "REJECTED";
        }

        await tx.candidate.update({
          where: { id: cand.id },
          data: {
            status: newStatus,
            currentRound: newRound,
          },
        });

        // Add round result if round exists
        if (round) {
          const existingResult = await tx.roundResult.findFirst({
            where: { candidateId: cand.id, pipelineRoundId: round.id },
          });

          if (existingResult) {
            await tx.roundResult.update({
              where: { id: existingResult.id },
              data: {
                passed: action !== "REJECT",
                score: defaultScore,
                feedback,
              },
            });
          } else {
            await tx.roundResult.create({
              data: {
                candidateId: cand.id,
                pipelineRoundId: round.id,
                score: defaultScore,
                passed: action !== "REJECT",
                feedback,
              },
            });
          }
        }

        updatedCount++;
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully batch updated ${updatedCount} candidate(s).`,
      updatedCount,
    });
  } catch (err: any) {
    console.error("Batch round evaluate failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to batch evaluate candidates." },
      { status: 500 }
    );
  }
}


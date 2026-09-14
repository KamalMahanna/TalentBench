import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        jobProfile: {
          include: {
            pipeline: {
              orderBy: { order: "asc" },
            },
          },
        },
        roundResults: {
          include: {
            pipelineRound: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({ candidate });
  } catch (err: any) {
    console.error("Error fetching candidate:", err);
    return NextResponse.json({ error: "Failed to fetch candidate details" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { status, roundResultId, passed, score, overrideReason, personalizedReply } = body;

    // 1. If override on specific RoundResult
    if (roundResultId) {
      const existingRound = await prisma.roundResult.findUnique({
        where: { id: roundResultId },
      });

      if (existingRound) {
        let traceData = [];
        try {
          if (existingRound.agentTrace) {
            traceData = JSON.parse(existingRound.agentTrace);
          }
        } catch {}

        traceData.push({
          stepName: "Recruiter Human-in-the-Loop Override",
          category: "RECOMMENDATION",
          timestamp: new Date().toISOString(),
          status: passed ? "PASSED" : "FAILED",
          reasoning: overrideReason || "Decision manually overridden by recruiter.",
          metric: score !== undefined ? `Adjusted Score: ${score}%` : undefined,
        });

        await prisma.roundResult.update({
          where: { id: roundResultId },
          data: {
            passed: passed !== undefined ? passed : existingRound.passed,
            score: score !== undefined ? Number(score) : existingRound.score,
            agentTrace: JSON.stringify(traceData),
            feedback: overrideReason
              ? `[Recruiter Override]: ${overrideReason}`
              : existingRound.feedback,
          },
        });
      }
    }

    // 2. Update candidate status / reply
    const updateData: any = {};
    if (status) updateData.status = status;
    if (personalizedReply !== undefined) updateData.personalizedReply = personalizedReply;

    const updatedCandidate = await prisma.candidate.update({
      where: { id },
      data: updateData,
      include: {
        jobProfile: {
          include: {
            pipeline: {
              orderBy: { order: "asc" },
            },
          },
        },
        roundResults: {
          include: {
            pipelineRound: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({ success: true, candidate: updatedCandidate });
  } catch (err: any) {
    console.error("Error updating candidate:", err);
    return NextResponse.json({ error: "Failed to update candidate" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await prisma.candidate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Candidate deleted" });
  } catch (err: any) {
    console.error("Error deleting candidate:", err);
    return NextResponse.json({ error: "Failed to delete candidate" }, { status: 500 });
  }
}


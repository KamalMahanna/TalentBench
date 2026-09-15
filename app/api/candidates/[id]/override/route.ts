import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { targetStatus = "SHORTLISTED", reason = "HR Manual Override" } = body;

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        roundResults: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
    }

    // STRICT USER RULE: Shortlisted cannot be changed to rejected
    if (candidate.status === "SHORTLISTED") {
      return NextResponse.json(
        {
          error:
            "Invalid Action: Candidates already marked as Shortlisted cannot be downgraded to Rejected.",
        },
        { status: 400 }
      );
    }

    // Only non-shortlisted can be promoted to SHORTLISTED
    if (targetStatus !== "SHORTLISTED") {
      return NextResponse.json(
        {
          error: "Only overrides to Shortlisted are permitted by system policy.",
        },
        { status: 400 }
      );
    }

    const updated = await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        status: "SHORTLISTED",
        currentRound: 1,
        isOverridden: true,
        overrideReason: reason,
      },
    });

    // Also update their latest RoundResult if one exists
    if (candidate.roundResults.length > 0) {
      const latestResult = candidate.roundResults[0];
      await prisma.roundResult.update({
        where: { id: latestResult.id },
        data: {
          passed: true,
          feedback: `Candidate qualified via ${reason}.`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Candidate ${candidate.name} has been manually promoted to Shortlisted.`,
      candidate: updated,
    });
  } catch (err: any) {
    console.error("Error overriding candidate status:", err);
    return NextResponse.json(
      { error: err.message || "Failed to override candidate status." },
      { status: 500 }
    );
  }
}


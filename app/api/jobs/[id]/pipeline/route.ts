import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, getOrCreateDemoUser } from "@/lib/auth";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobProfileId } = await context.params;
    let user = await getSessionUser();
    if (!user) {
      user = await getOrCreateDemoUser();
    }

    const { type, title, description, config } = await req.json();

    if (!type || !title) {
      return NextResponse.json(
        { error: "Round type and title are required." },
        { status: 400 }
      );
    }

    // Verify job belongs to user
    const job = await prisma.jobProfile.findFirst({
      where: { id: jobProfileId, userId: user.id },
      include: { pipeline: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job profile not found." }, { status: 404 });
    }

    const nextOrder = job.pipeline.length;

    const newRound = await prisma.pipelineRound.create({
      data: {
        type,
        title: title.trim(),
        description: description?.trim() || null,
        config: config ? JSON.stringify(config) : null,
        order: nextOrder,
        jobProfileId,
      },
    });

    return NextResponse.json({ success: true, round: newRound }, { status: 201 });
  } catch (err: any) {
    console.error("Error adding pipeline round:", err);
    return NextResponse.json({ error: "Failed to add pipeline round" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobProfileId } = await context.params;
    let user = await getSessionUser();
    if (!user) {
      user = await getOrCreateDemoUser();
    }

    const { rounds } = await req.json();

    if (!Array.isArray(rounds)) {
      return NextResponse.json(
        { error: "Rounds must be an array." },
        { status: 400 }
      );
    }

    // Reorder/update rounds in transaction
    const updatePromises = rounds.map((r: { id: string; order: number; title?: string; type?: string; description?: string; config?: string }, index: number) =>
      prisma.pipelineRound.update({
        where: { id: r.id },
        data: {
          order: typeof r.order === "number" ? r.order : index,
          ...(r.title ? { title: r.title } : {}),
          ...(r.type ? { type: r.type } : {}),
          ...(r.description !== undefined ? { description: r.description } : {}),
          ...(r.config !== undefined ? { config: r.config } : {}),
        },
      })
    );

    await prisma.$transaction(updatePromises);

    const updatedPipeline = await prisma.pipelineRound.findMany({
      where: { jobProfileId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ success: true, pipeline: updatedPipeline });
  } catch (err: any) {
    console.error("Error updating pipeline:", err);
    return NextResponse.json({ error: "Failed to update pipeline" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(req.url);
    const roundId = searchParams.get("roundId");

    if (!roundId) {
      return NextResponse.json({ error: "Round ID is required." }, { status: 400 });
    }

    await prisma.pipelineRound.delete({
      where: { id: roundId },
    });

    return NextResponse.json({ success: true, message: "Round deleted." });
  } catch (err: any) {
    console.error("Error deleting pipeline round:", err);
    return NextResponse.json({ error: "Failed to delete round" }, { status: 500 });
  }
}


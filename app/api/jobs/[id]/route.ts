import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, getOrCreateDemoUser } from "@/lib/auth";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    let user = await getSessionUser();
    if (!user) {
      user = await getOrCreateDemoUser();
    }

    const job = await prisma.jobProfile.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        pipeline: {
          orderBy: { order: "asc" },
        },
        candidates: {
          include: {
            roundResults: {
              include: {
                pipelineRound: true,
              },
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job profile not found." }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (err: any) {
    console.error("Error fetching job profile:", err);
    return NextResponse.json({ error: "Failed to fetch job profile" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    let user = await getSessionUser();
    if (!user) {
      user = await getOrCreateDemoUser();
    }

    const existingJob = await prisma.jobProfile.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingJob) {
      return NextResponse.json({ error: "Job profile not found." }, { status: 404 });
    }

    await prisma.jobProfile.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Job profile deleted successfully." });
  } catch (err: any) {
    console.error("Error deleting job profile:", err);
    return NextResponse.json({ error: "Failed to delete job profile" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    let user = await getSessionUser();
    if (!user) {
      user = await getOrCreateDemoUser();
    }

    const { title, description, minExperience, maxExperience } = await req.json();

    const existingJob = await prisma.jobProfile.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingJob) {
      return NextResponse.json({ error: "Job profile not found." }, { status: 404 });
    }

    const updatedJob = await prisma.jobProfile.update({
      where: { id },
      data: {
        ...(title ? { title: title.trim() } : {}),
        ...(description ? { description: description.trim() } : {}),
        ...(minExperience !== undefined ? { minExperience: Number(minExperience) } : {}),
        ...(maxExperience !== undefined ? { maxExperience: Number(maxExperience) } : {}),
      },
    });

    return NextResponse.json({ success: true, job: updatedJob });
  } catch (err: any) {
    console.error("Error updating job profile:", err);
    return NextResponse.json({ error: "Failed to update job profile" }, { status: 500 });
  }
}


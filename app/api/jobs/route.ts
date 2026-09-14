import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, getOrCreateDemoUser } from "@/lib/auth";

export async function GET() {
  try {
    let user = await getSessionUser();
    if (!user) {
      user = await getOrCreateDemoUser();
    }

    const jobs = await prisma.jobProfile.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: {
            pipeline: true,
            candidates: true,
          },
        },
        pipeline: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ jobs });
  } catch (err: any) {
    console.error("Error fetching jobs:", err);
    return NextResponse.json({ error: "Failed to fetch job profiles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let user = await getSessionUser();
    if (!user) {
      user = await getOrCreateDemoUser();
    }

    const { title, description, minExperience, maxExperience, initialRounds } = await req.json();

    // Strict validation for mandatory fields per user prompt
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Job title is mandatory." }, { status: 400 });
    }

    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json(
        { error: "Job description is mandatory." },
        { status: 400 }
      );
    }

    const minExp = Number(minExperience);
    const maxExp = Number(maxExperience);

    if (isNaN(minExp) || isNaN(maxExp) || minExp < 0 || maxExp < minExp) {
      return NextResponse.json(
        {
          error:
            "Required years of experience range is mandatory (minimum must be >= 0, maximum must be >= minimum).",
        },
        { status: 400 }
      );
    }

    // Default connector stages if none specified
    const defaultRounds =
      Array.isArray(initialRounds) && initialRounds.length > 0
        ? initialRounds
        : [
            {
              type: "RESUME_SCREENING",
              title: "Autonomous AI Resume Screening",
              description: "AI agent scans candidates against description and experience.",
              order: 0,
            },
            {
              type: "APTITUDE",
              title: "Cognitive Aptitude Assessment",
              description: "Core problem-solving and numerical aptitude.",
              order: 1,
            },
            {
              type: "DSA",
              title: "Data Structures & Algorithms Challenge",
              description: "Sandboxed live coding and technical problem solving.",
              order: 2,
            },
            {
              type: "COMMUNICATION",
              title: "Communication & Architecture Round",
              description: "Structured design walkthrough and verbal reasoning.",
              order: 3,
            },
            {
              type: "HR_ROUND",
              title: "Executive HR & Culture Alignment",
              description: "Team fit, ethics, and compensation discussion.",
              order: 4,
            },
          ];

    const job = await prisma.jobProfile.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        minExperience: minExp,
        maxExperience: maxExp,
        userId: user.id,
        pipeline: {
          create: defaultRounds.map((r: any, idx: number) => ({
            type: r.type || "RESUME_SCREENING",
            title: r.title || `Round ${idx + 1}`,
            description: r.description || null,
            order: idx,
            config: r.config ? JSON.stringify(r.config) : null,
          })),
        },
      },
      include: {
        pipeline: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, job }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating job profile:", err);
    return NextResponse.json(
      { error: "Failed to create job profile." },
      { status: 500 }
    );
  }
}


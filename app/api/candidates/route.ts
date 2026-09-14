import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Ensure demo data exists if empty
    const count = await prisma.candidate.count();
    if (count === 0) {
      await getOrCreateDemoUser();
    }

    const where: any = {};
    if (jobId && jobId !== "all") {
      where.jobProfileId = jobId;
    }
    if (status && status !== "all") {
      where.status = status;
    }
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim() } },
        { email: { contains: search.trim() } },
        { skills: { contains: search.trim() } },
      ];
    }

    const candidates = await prisma.candidate.findMany({
      where,
      include: {
        jobProfile: {
          select: {
            id: true,
            title: true,
            minExperience: true,
            maxExperience: true,
          },
        },
        roundResults: {
          include: {
            pipelineRound: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ candidates });
  } catch (err: any) {
    console.error("Error fetching candidates:", err);
    return NextResponse.json({ error: "Failed to fetch candidates" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, experienceYears, resumeText, skills, jobProfileId } = body;

    if (!name || !email || !jobProfileId) {
      return NextResponse.json(
        { error: "Name, email, and target Job Profile are required." },
        { status: 400 }
      );
    }

    const candidate = await prisma.candidate.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        phone: phone ? phone.trim() : null,
        experienceYears: Number(experienceYears) || 0,
        resumeText: resumeText || "",
        skills: skills || "",
        jobProfileId,
        status: "PENDING",
      },
      include: {
        jobProfile: true,
        roundResults: true,
      },
    });

    return NextResponse.json({ success: true, candidate }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating candidate:", err);
    return NextResponse.json({ error: "Failed to create candidate" }, { status: 500 });
  }
}


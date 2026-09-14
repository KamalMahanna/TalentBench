import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, getOrCreateDemoUser } from "@/lib/auth";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobProfileId } = await context.params;

    const candidates = await prisma.candidate.findMany({
      where: { jobProfileId },
      include: {
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

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobProfileId } = await context.params;
    const { name, email, phone, experienceYears, resumeText, skills } = await req.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Candidate name and email are required." },
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
    });

    return NextResponse.json({ success: true, candidate }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating candidate:", err);
    return NextResponse.json({ error: "Failed to add candidate" }, { status: 500 });
  }
}


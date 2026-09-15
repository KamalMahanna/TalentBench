import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractEmailFromText } from "@/lib/client/resume-parser";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await context.params;
    const body = await req.json();

    const {
      candidateName,
      email: rawEmail,
      resumeText,
      experienceYears,
      skills,
    } = body;

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required." }, { status: 400 });
    }

    const job = await prisma.jobProfile.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: "Job Profile not found." }, { status: 404 });
    }

    // Auto-extract email from resume text if not explicitly provided
    let email = rawEmail?.trim()?.toLowerCase();
    if (!email && resumeText) {
      const extracted = extractEmailFromText(resumeText);
      if (extracted.email) {
        email = extracted.email;
      }
    }

    if (!email) {
      email = `candidate_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@talentbench.local`;
    }

    const name = candidateName?.trim() || (email ? email.split("@")[0].replace(/[._]/g, " ") : "Candidate");
    const parsedExp = Number(experienceYears) || 0;

    // Create candidate in PENDING / QUEUED state
    const candidate = await prisma.candidate.create({
      data: {
        jobProfileId: jobId,
        name,
        email,
        resumeText: resumeText || "",
        experienceYears: parsedExp,
        skills: typeof skills === "string" ? skills : (Array.isArray(skills) ? skills.join(", ") : ""),
        status: "PENDING",
      },
    });

    const totalQueued = await prisma.candidate.count({
      where: { jobProfileId: jobId, status: "PENDING" },
    });

    return NextResponse.json({
      success: true,
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        jobId,
      },
      queuedCount: totalQueued,
    });
  } catch (err: any) {
    console.error("Error queueing candidate resume:", err);
    return NextResponse.json(
      { error: err.message || "Failed to queue resume." },
      { status: 500 }
    );
  }
}


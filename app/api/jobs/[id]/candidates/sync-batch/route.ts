import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface CandidateSyncItem {
  id?: string;
  name: string;
  email: string;
  experienceYears?: number;
  resumeText?: string;
  skills?: string[] | string;
  status: "SHORTLISTED" | "REJECTED" | "PENDING";
  score: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  reasoning?: string;
  personalizedReply?: string;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const candidates: CandidateSyncItem[] = body.candidates || [];

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required." }, { status: 400 });
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No candidates to sync." });
    }

    const job = await prisma.jobProfile.findUnique({
      where: { id: jobId },
      include: { pipeline: { orderBy: { order: "asc" } } },
    });

    if (!job) {
      return NextResponse.json({ error: "Job Profile not found." }, { status: 404 });
    }

    const resumeRound = job.pipeline.find((r) => r.type === "RESUME_SCREENING") || job.pipeline[0];
    const resumeRoundId = resumeRound?.id;

    let syncedCount = 0;

    // Process all candidates in an atomic transaction or batch
    await prisma.$transaction(async (tx) => {
      for (const item of candidates) {
        const skillsStr = Array.isArray(item.skills)
          ? item.skills.join(", ")
          : (typeof item.skills === "string" ? item.skills : "");

        const passed = item.status === "SHORTLISTED";
        const currentRound = passed ? 1 : 0;

        // Upsert candidate record
        let candidateRecord = null;
        const isTemporaryId =
          !item.id ||
          item.id.startsWith("client_") ||
          item.id.startsWith("staged_") ||
          item.id.startsWith("eval_");

        if (!isTemporaryId && item.id) {
          candidateRecord = await tx.candidate.findUnique({
            where: { id: item.id },
          });
        }

        if (!candidateRecord && item.email) {
          candidateRecord = await tx.candidate.findFirst({
            where: { jobProfileId: jobId, email: item.email.toLowerCase() },
          });
        }

        if (candidateRecord) {
          candidateRecord = await tx.candidate.update({
            where: { id: candidateRecord.id },
            data: {
              name: item.name || candidateRecord.name,
              resumeText: item.resumeText || candidateRecord.resumeText,
              skills: skillsStr || candidateRecord.skills,
              status: item.status,
              currentRound,
              personalizedReply: item.personalizedReply || null,
              experienceYears: item.experienceYears || candidateRecord.experienceYears,
            },
          });
        } else {
          candidateRecord = await tx.candidate.create({
            data: {
              jobProfileId: jobId,
              name: item.name || item.email.split("@")[0],
              email: item.email.toLowerCase(),
              resumeText: item.resumeText || "",
              skills: skillsStr,
              experienceYears: item.experienceYears || 0,
              status: item.status,
              currentRound,
              personalizedReply: item.personalizedReply || null,
            },
          });
        }

        // Create RoundResult if pipeline round exists
        if (resumeRoundId && candidateRecord) {
          const traceData = {
            matchedSkills: item.matchedSkills || [],
            missingSkills: item.missingSkills || [],
            reasoning: item.reasoning || "",
            timestamp: new Date().toISOString(),
          };

          await tx.roundResult.create({
            data: {
              candidateId: candidateRecord.id,
              pipelineRoundId: resumeRoundId,
              score: item.score,
              passed,
              feedback: item.reasoning || `Match score: ${item.score}%`,
              agentTrace: JSON.stringify(traceData),
            },
          });
        }

        syncedCount++;
      }
    });

    return NextResponse.json({
      success: true,
      syncedCount,
      message: `Successfully synchronized ${syncedCount} candidate(s) to database.`,
    });
  } catch (err: any) {
    console.error("Batch candidate sync failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to synchronize candidates to database." },
      { status: 500 }
    );
  }
}


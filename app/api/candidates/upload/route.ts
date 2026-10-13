import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runResumeScreeningAgent } from "@/lib/ai/resume-screener";
import { extractCandidateNameFromResume, stripEmojis } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { jobProfileId, files, autoScreen } = body;

    if (!jobProfileId) {
      return NextResponse.json(
        { error: "Target Job Profile ID is required." },
        { status: 400 }
      );
    }

    const job = await prisma.jobProfile.findUnique({
      where: { id: jobProfileId },
      include: {
        pipeline: {
          where: { type: "RESUME_SCREENING" },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job profile not found." }, { status: 404 });
    }

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "No candidate files provided for ingestion." },
        { status: 400 }
      );
    }

    const createdCandidates = [];
    const resumeScreeningRoundId = job.pipeline[0]?.id;

    // 1. Deduplicate incoming batch by email (primary key), keeping only the latest resume
    const dedupedFilesMap = new Map<string, (typeof files)[0]>();
    for (const f of files) {
      const emailKey = f.email?.trim().toLowerCase();
      if (emailKey) {
        dedupedFilesMap.set(emailKey, f);
      } else {
        dedupedFilesMap.set(`no_email_${f.name || Math.random()}`, f);
      }
    }
    const deduplicatedFiles = Array.from(dedupedFilesMap.values());

    for (const file of deduplicatedFiles) {
      const cleanEmail =
        file.email?.trim().toLowerCase() ||
        `cand_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@applicant.io`;
      const resumeText = stripEmojis(file.resumeText || "");
      const expYears =
        file.experienceYears !== undefined
          ? Number(file.experienceYears)
          : Math.floor(Math.random() * 4) + 3;
      const skills =
        file.skills || "Distributed Systems, Backend Engineering, Cloud Infrastructure";

      // Deduplicate: check if candidate with this email already exists for this job requisition
      const existingCandidate = await prisma.candidate.findFirst({
        where: {
          email: cleanEmail,
          jobProfileId,
        },
      });

      // Name is extracted from resume text when checking against Job Description
      let candidateName = existingCandidate?.name || "Candidate";
      if (autoScreen && resumeScreeningRoundId) {
        candidateName = extractCandidateNameFromResume(resumeText, cleanEmail, file.name);
      }

      let candidate;
      if (existingCandidate) {
        // Update existing candidate with latest resume
        candidate = await prisma.candidate.update({
          where: { id: existingCandidate.id },
          data: {
            name: candidateName,
            resumeText,
            experienceYears: expYears,
            skills,
            status: "PENDING",
            updatedAt: new Date(),
          },
        });
      } else {
        // Create candidate record
        candidate = await prisma.candidate.create({
          data: {
            name: candidateName,
            email: cleanEmail,
            phone: file.phone || "+1 (555) 234-5678",
            experienceYears: expYears,
            resumeText,
            skills,
            jobProfileId,
            status: "PENDING",
          },
        });
      }

      // Check resume against Job Description for skill matching (AI screening)
      if (autoScreen && resumeScreeningRoundId) {
        try {
          // Extract candidate name from resume text during JD skill matching
          const finalCandidateName = extractCandidateNameFromResume(
            resumeText,
            cleanEmail,
            file.name
          );

          const screening = await runResumeScreeningAgent({
            candidateName: finalCandidateName,
            candidateEmail: candidate.email,
            candidateExperience: candidate.experienceYears,
            resumeText: candidate.resumeText || "",
            jobTitle: job.title,
            jobDescription: job.description,
            minExperience: job.minExperience,
            maxExperience: job.maxExperience,
          });

          // Name extracted by LLM in structured output
          const llmResolvedName = screening.candidateName || finalCandidateName;

          await prisma.roundResult.create({
            data: {
              candidateId: candidate.id,
              pipelineRoundId: resumeScreeningRoundId,
              score: screening.score,
              passed: screening.passed,
              agentTrace: JSON.stringify(screening.agentTrace),
              feedback: screening.feedbackSummary,
            },
          });

          candidate = await prisma.candidate.update({
            where: { id: candidate.id },
            data: {
              name: llmResolvedName,
              status: screening.status,
              personalizedReply: screening.personalizedReply,
              currentRound: screening.passed ? 1 : 0,
            },
          });
        } catch (screenErr) {
          console.error("Auto screen failed for candidate:", candidate.id, screenErr);
        }
      }

      createdCandidates.push(candidate);
    }

    return NextResponse.json({
      success: true,
      processed: createdCandidates.length,
      candidates: createdCandidates,
    });
  } catch (err: any) {
    console.error("Bulk upload failed:", err);
    return NextResponse.json(
      { error: "Bulk upload ingestion failed." },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { GeminiProvider, defaultGeminiProvider } from "@/lib/ai/gemini-provider";
import { extractCandidateNameFromResume, sanitizeMailBodyGreeting } from "@/lib/utils";
import {
  PoolBenchmark,
  BenchmarkProject,
  BenchmarkExperience,
  extractDeterministicBenchmark,
  scoreCandidateDeterministicallyAgainstBenchmark,
  generateDeterministicCutoffEmail,
} from "@/lib/client/client-tournament";

function cleanJsonText(raw: string): string {
  let clean = raw.trim();
  if (clean.startsWith("```json")) clean = clean.slice(7);
  if (clean.startsWith("```")) clean = clean.slice(3);
  if (clean.endsWith("```")) clean = clean.slice(0, -3);
  return clean.trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    const reqHeaderKey = req.headers.get("x-gemini-api-key");
    const activeApiKey = reqHeaderKey || body.apiKey;
    const provider = activeApiKey ? new GeminiProvider({ apiKey: activeApiKey }) : defaultGeminiProvider;

    // ACTION 1: Extract or Update Benchmark (Batches of 3-4 resumes)
    if (action === "extract_or_update_benchmark") {
      const { jobTitle, jobDescription, currentBenchmark, resumes } = body;
      if (!jobTitle || !jobDescription || !Array.isArray(resumes)) {
        return NextResponse.json(
          { error: "jobTitle, jobDescription, and resumes array are required." },
          { status: 400 }
        );
      }

      const systemPrompt = `You are a principal recruiting calibration architect and technical screener.
Your task is to maintain a global high-water mark benchmark of the TOP 10 PROJECTS and TOP 10 WORK EXPERIENCES across candidate resumes for this job requisition.
Always prioritize technical depth, architectural scale, and relevance to the Job Description. Capping rule: at most 10 top projects and 10 top experiences.`;

      const prompt = `JOB TITLE: ${jobTitle}
JOB DESCRIPTION:
${jobDescription}

${
  currentBenchmark && (currentBenchmark.topProjects?.length > 0 || currentBenchmark.topExperiences?.length > 0)
    ? `CURRENT RUNNING TOP BENCHMARK:
Top Projects (${currentBenchmark.topProjects.length}):
${JSON.stringify(currentBenchmark.topProjects, null, 2)}

Top Experiences (${currentBenchmark.topExperiences.length}):
${JSON.stringify(currentBenchmark.topExperiences, null, 2)}`
    : "INITIAL BATCH: No previous benchmark exists yet. Extract the highest caliber projects and experiences from these resumes."
}

NEW CANDIDATE RESUMES IN THIS BATCH:
${resumes
  .map((r: any, idx: number) => {
    const cleanName = extractCandidateNameFromResume(r.resumeText || "", r.email, r.name);
    return `---
RESUME ${idx + 1}: ${cleanName} (${r.email})
${(r.resumeText || "").slice(0, 3000)}`;
  })
  .join("\n\n")}

INSTRUCTIONS:
1. Extract candidate projects and work experiences from the new resumes that best align with the Job Description.
2. ${
        currentBenchmark?.topProjects?.length > 0
          ? "Compare them directly against the CURRENT RUNNING TOP BENCHMARK. If a project or experience from the new resumes demonstrates greater technical complexity, scale, or closer relevance to the Job Description, replace or update items in the benchmark."
          : "Identify the top projects and experiences from these initial resumes that demonstrate highest technical competence."
      }
3. Capping rules: Return AT MOST 10 top projects (can be fewer if not available) and AT MOST 10 top experiences (can be fewer if not available).
4. Strictly avoid placeholders or file names.

STRICT JSON OUTPUT FORMAT:
{
  "topProjects": [
    {
      "title": "Project Name",
      "techStack": ["Tech1", "Tech2"],
      "description": "Crisp 1-2 sentence description of technical challenge",
      "scaleOrImpact": "Scale / impact metric (e.g. 50k QPS, microservices, real-time)",
      "candidateName": "Firstname Lastname"
    }
  ],
  "topExperiences": [
    {
      "role": "Role Title",
      "domainOrCompany": "Company or Domain",
      "yearsOrSeniority": "Years or Seniority level",
      "responsibilities": "Key architectural ownership & production systems delivered",
      "scaleOrImpact": "Production scale metric",
      "candidateName": "Firstname Lastname"
    }
  ]
}`;

      try {
        const res = await provider.complete(prompt, {
          systemPrompt,
          temperature: 0.1,
          jsonMode: true,
          maxTokens: 2500,
        });

        const parsed = JSON.parse(cleanJsonText(res.text));
        const benchmark: PoolBenchmark = {
          topProjects: Array.isArray(parsed.topProjects)
            ? parsed.topProjects.slice(0, 10).map((p: any) => ({
                title: String(p.title || "Technical Project"),
                techStack: Array.isArray(p.techStack) ? p.techStack : [],
                description: String(p.description || ""),
                scaleOrImpact: String(p.scaleOrImpact || "Production scale"),
                candidateName: p.candidateName,
              }))
            : [],
          topExperiences: Array.isArray(parsed.topExperiences)
            ? parsed.topExperiences.slice(0, 10).map((e: any) => ({
                role: String(e.role || "Software Engineer"),
                domainOrCompany: String(e.domainOrCompany || "Technology"),
                yearsOrSeniority: String(e.yearsOrSeniority || "Senior"),
                responsibilities: String(e.responsibilities || ""),
                scaleOrImpact: String(e.scaleOrImpact || "Core systems ownership"),
                candidateName: e.candidateName,
              }))
            : [],
        };

        return NextResponse.json({ success: true, benchmark });
      } catch (llmErr) {
        console.warn("[TournamentRoute] LLM benchmark extraction error, applying deterministic fallback:", llmErr);
        const fallback = extractDeterministicBenchmark(resumes, currentBenchmark);
        return NextResponse.json({ success: true, benchmark: fallback, fallback: true });
      }
    }

    // ACTION 2: Score Candidate Against Global Benchmark
    if (action === "score_against_benchmark") {
      const { jobTitle, jobDescription, benchmark, candidate } = body;
      if (!jobTitle || !jobDescription || !benchmark || !candidate) {
        return NextResponse.json(
          { error: "jobTitle, jobDescription, benchmark, and candidate are required." },
          { status: 400 }
        );
      }

      const cleanName = extractCandidateNameFromResume(candidate.resumeText || "", candidate.email, candidate.name);

      const systemPrompt = `You are a principal technical calibration architect.
You score an applicant's resume directly against the pool's TOP 10 PROJECTS and TOP 10 EXPERIENCES benchmark established for this job requisition.`;

      const prompt = `JOB TITLE: ${jobTitle}
JOB DESCRIPTION:
${jobDescription}

POOL TOP BENCHMARK:
Top Projects (${(benchmark.topProjects || []).length}):
${(benchmark.topProjects || []).map((p: any, i: number) => `${i + 1}. ${p.title} (${(p.techStack || []).join(", ")}): ${p.description} [${p.scaleOrImpact}]`).join("\n")}

Top Experiences (${(benchmark.topExperiences || []).length}):
${(benchmark.topExperiences || []).map((e: any, i: number) => `${i + 1}. ${e.role} at ${e.domainOrCompany} (${e.yearsOrSeniority}): ${e.responsibilities} [${e.scaleOrImpact}]`).join("\n")}

CANDIDATE TO SCORE:
Name: ${cleanName}
Email: ${candidate.email}
Reported Experience: ${candidate.experienceYears || "Not specified"} years
Resume:
${(candidate.resumeText || "").slice(0, 3500)}

EVALUATION RULES:
1. Compare this candidate's projects against the top benchmark projects. Do they demonstrate equivalent architectural complexity and technical breadth?
2. Compare their work history against the top benchmark experiences. Do they demonstrate equivalent seniority and production scale?
3. Assign a calibrated score from 0 to 100 representing their relative standing against this top benchmark pool.
4. List 2-3 matched benchmark aspects (where this candidate demonstrated comparable strength).
5. List 2-3 missing benchmark gaps (specific project complexities, technologies, or experience depth they lack compared to the top benchmark).

STRICT JSON OUTPUT FORMAT:
{
  "score": <number 0-100>,
  "matchedBenchmarkAspects": ["Aspect 1", "Aspect 2"],
  "missingBenchmarkGaps": ["Gap 1", "Gap 2"]
}`;

      try {
        const res = await provider.complete(prompt, {
          systemPrompt,
          temperature: 0.1,
          jsonMode: true,
          maxTokens: 1000,
        });

        const parsed = JSON.parse(cleanJsonText(res.text));
        const score = Math.min(98, Math.max(20, Number(parsed.score) || 65));

        return NextResponse.json({
          success: true,
          score,
          matchedBenchmarkAspects: Array.isArray(parsed.matchedBenchmarkAspects) ? parsed.matchedBenchmarkAspects : [],
          missingBenchmarkGaps: Array.isArray(parsed.missingBenchmarkGaps) ? parsed.missingBenchmarkGaps : [],
        });
      } catch (llmErr) {
        console.warn("[TournamentRoute] LLM scoring error, using deterministic scorer:", llmErr);
        const fallback = scoreCandidateDeterministicallyAgainstBenchmark(candidate, benchmark, jobTitle);
        return NextResponse.json({
          success: true,
          score: fallback.score,
          matchedBenchmarkAspects: fallback.matchedBenchmarkAspects,
          missingBenchmarkGaps: fallback.missingBenchmarkGaps,
          fallback: true,
        });
      }
    }

    // ACTION 3: Generate Feedback Email for Candidate Under Cutoff
    if (action === "generate_cutoff_email") {
      const { jobTitle, candidateName, rank, cutoff, score, missingGaps, benchmark } = body;
      const cleanName = candidateName || "Candidate";

      const systemPrompt = `You are an empathetic, highly professional technical recruiting director.
You write personalized feedback emails to candidates who passed initial screening but fell below the final cutoff threshold after comparative benchmark evaluation.
Always address the candidate by their real name. Strictly avoid file names, resume numbers, or bracketed placeholders.`;

      const prompt = `JOB TITLE: ${jobTitle}
APPLICANT POOL CUTOFF: Top ${cutoff} positions

CANDIDATE:
Name: ${cleanName}
Rank in Pool: #${rank}
Calibrated Benchmark Score: ${score}/100
Missing Gaps Compared to Top Benchmark:
${(missingGaps || []).map((g: string) => `- ${g}`).join("\n")}

TOP BENCHMARK CONTEXT:
Top Pool Projects:
${((benchmark?.topProjects || []).slice(0, 3) as BenchmarkProject[]).map((p) => `• ${p.title}: ${p.description} (${(p.techStack || []).join(", ")})`).join("\n")}

Top Pool Experiences:
${((benchmark?.topExperiences || []).slice(0, 3) as BenchmarkExperience[]).map((e) => `• ${e.role} (${e.yearsOrSeniority}): ${e.responsibilities}`).join("\n")}

INSTRUCTIONS:
Write a polite, personalized, constructive rejection feedback email (BODY PART ONLY, no subject line, no headers).
1. GREET THE CANDIDATE BY THEIR ACTUAL NAME: "Dear ${cleanName},"
2. Acknowledge that they qualified in initial screening, but due to capacity constraints, only the top ${cutoff} candidates advanced.
3. Clearly and specifically explain what skills and experience depth were missing by directly comparing their profile to the top projects and experiences in the applicant pool. Mention the caliber of projects and production scale that set the top applicants apart.
4. Provide a concrete project recommendation with suggested technologies they should build to reach this top-tier benchmark.
5. End with encouraging, warm regards.

Return strict JSON:
{
  "mailBody": "Dear ${cleanName},\\n\\n...",
  "recommendedProject": "Description of recommended portfolio project to build"
}`;

      try {
        const res = await provider.complete(prompt, {
          systemPrompt,
          temperature: 0.1,
          jsonMode: true,
          maxTokens: 1200,
        });

        const parsed = JSON.parse(cleanJsonText(res.text));
        const mailBody = sanitizeMailBodyGreeting(parsed.mailBody || "", cleanName);

        return NextResponse.json({
          success: true,
          mailBody,
          recommendedProject: parsed.recommendedProject || "Advanced cloud portfolio implementation",
        });
      } catch (llmErr) {
        console.warn("[TournamentRoute] LLM email generation error, applying deterministic fallback:", llmErr);
        const fallback = generateDeterministicCutoffEmail({
          candidateName: cleanName,
          jobTitle,
          rank,
          cutoff,
          missingGaps: missingGaps || [],
          benchmark: benchmark || { topProjects: [], topExperiences: [] },
        });

        return NextResponse.json({
          success: true,
          mailBody: fallback.mailBody,
          recommendedProject: fallback.recommendedProject,
          fallback: true,
        });
      }
    }

    return NextResponse.json({ error: `Unknown tournament action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("[TournamentRoute] Handler failed:", err);
    return NextResponse.json({ error: err.message || "Tournament execution failed." }, { status: 500 });
  }
}


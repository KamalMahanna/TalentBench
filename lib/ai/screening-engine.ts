import { llmGateway } from "./llm-gateway";
import { extractCandidateNameFromResume, sanitizeMailBodyGreeting } from "@/lib/utils";

export interface ScreeningEvaluation {
  verdict: "YES" | "NO";
  matches: boolean;
  score: number; // 0 - 100
  matchPercentage: number;
  experienceMatch: boolean;
  experienceAnalysis: string;
  matchedSkills: string[];
  missingSkills: string[];
  reasoning: string;
  mailBody: string; // Body part only explaining what is missing (or congratulating if YES)
}

/**
 * Clean and parse JSON from LLM output
 */
function cleanJsonText(raw: string): string {
  let clean = raw.trim();
  if (clean.startsWith("```json")) {
    clean = clean.slice(7);
  } else if (clean.startsWith("```")) {
    clean = clean.slice(3);
  }
  if (clean.endsWith("```")) {
    clean = clean.slice(0, -3);
  }
  return clean.trim();
}

/**
 * Screen a single resume against the Job Description following the strict:
 * 1. EXPERIENCE LEVEL EVALUATION (First Priority)
 * 2. SKILL GAP EVALUATION (Second Priority, >= 30% rule)
 */
export async function screenResumeWith30PercentRule({
  candidateName,
  candidateEmail,
  resumeText,
  experienceYears,
  minExperience,
  maxExperience,
  jobTitle,
  jobDescription,
}: {
  candidateName: string;
  candidateEmail: string;
  resumeText: string;
  experienceYears?: number;
  minExperience?: number;
  maxExperience?: number;
  jobTitle: string;
  jobDescription: string;
}): Promise<ScreeningEvaluation> {
  const systemPrompt = `You are a principal technical recruiter and talent calibration architect.
You evaluate resumes with a strict "EXPERIENCE FIRST, THEN SKILL GAP" methodology:

STEP 1: EXPERIENCE LEVEL EVALUATION (First Priority)
- Extract the candidate's total years of relevant professional experience and seniority level from their resume.
- Compare against the experience level required in the Job Description (e.g. required minimum years, junior/mid/senior level).
- Determine "experience_match": true if their professional background satisfies the minimum seniority and years required; false if under-experienced or misaligned.
- Provide "experience_analysis": A crisp 1-2 sentence breakdown of the candidate's verified experience vs the role's requirements.

STEP 2: SKILL GAP EVALUATION (Second Priority)
- Evaluate whether the candidate's skills, technologies, and competencies match the Job Description.
- Follow this STRICT RULE:
  - If the candidate meets the experience requirements AND matches at least 30% of the skills/technologies from the Job Description, they MUST BE SHORTLISTED (verdict "YES").
  - If the candidate has less than 30% skill match OR their experience level is insufficient/unmatched, DO NOT shortlist them (verdict "NO").

  STEP 3: REASONING & EMAIL GENERATION (EXPERIENCE FIRST, THEN SKILL GAP)
  - In "reasoning", evaluate EXPERIENCE FIRST, followed by skill match percentage and specific skill gaps.
  - In "mail_body", write a polite, professional email (BODY PART ONLY, no subject line, no email headers):
    - GREET THE CANDIDATE BY THEIR ACTUAL PERSONAL NAME (e.g. "Dear Firstname Lastname,"). Extract their actual name from the resume header or CANDIDATE NAME. NEVER use file names (e.g. "resume 16..."), document labels, numbers, or generic brackets like "[Candidate Name]".
    - Address their EXPERIENCE LEVEL FIRST (e.g., acknowledging their background/experience level vs what the role requires).
    - Then address the TECHNICAL SKILL GAP and missing competencies with actionable suggestions on what to build or learn.
    - Conclude with a warm, encouraging sign-off.

  STRICT JSON OUTPUT FORMAT:
  Return ONLY valid JSON with keys:
  {
    "verdict": "YES" | "NO",
    "experience_match": true | false,
    "experience_analysis": "Candidate possesses ~X years of relevant experience vs required Y+ years.",
    "match_percentage": <integer 0-100>,
    "matched_skills": ["Skill 1", "Skill 2"],
    "missing_skills": ["Missing Skill 1", "Missing Skill 2"],
    "reasoning": "Experience Evaluation: [Analysis]. Skill Calibration: [Analysis].",
    "mail_body": "Dear <Actual Candidate Name>,\n\nThank you for applying... [Evaluates experience first, then technical skill gaps, ending with encouragement]"
  }`;

  const realCandidateName = extractCandidateNameFromResume(resumeText, candidateEmail, candidateName);

  const expContext = [
    minExperience != null ? `MINIMUM REQUIRED EXPERIENCE: ${minExperience} years` : "",
    maxExperience != null ? `MAXIMUM EXPERIENCE: ${maxExperience} years` : "",
    experienceYears != null && experienceYears > 0 ? `CANDIDATE REPORTED EXPERIENCE: ${experienceYears} years` : "",
  ].filter(Boolean).join("\n");

  const userPrompt = `JOB TITLE: ${jobTitle}
${expContext ? `${expContext}\n` : ""}
JOB DESCRIPTION:
${jobDescription}

CANDIDATE NAME: ${realCandidateName}
CANDIDATE EMAIL: ${candidateEmail}

RESUME CONTENT:
${resumeText.slice(0, 4000)}

Please evaluate following the EXPERIENCE FIRST, THEN SKILL GAP (>= 30% match) rule. Remember to address the candidate by their actual personal name (${realCandidateName}) in mail_body, and return the strict JSON format.`;

  try {
    const res = await llmGateway.complete(userPrompt, {
      systemPrompt,
      temperature: 0.1,
      maxTokens: 1200,
    });

    const parsed = JSON.parse(cleanJsonText(res.text));
    const matchPct =
      typeof parsed.match_percentage === "number"
        ? parsed.match_percentage
        : Number(parsed.match_percentage) || (parsed.verdict === "YES" ? 75 : 20);
    const experienceMatch =
      typeof parsed.experience_match === "boolean"
        ? parsed.experience_match
        : parsed.verdict === "YES" || matchPct >= 30;
    const experienceAnalysis =
      parsed.experience_analysis ||
      (experienceMatch
        ? "Candidate's demonstrated experience level aligns with the role requirements."
        : "Candidate lacks sufficient demonstrated years or seniority level for this role.");

    const matches = parsed.verdict === "YES" || (experienceMatch && matchPct >= 30);
    const verdict = matches ? "YES" : "NO";
    const matchedSkills = Array.isArray(parsed.matched_skills) ? parsed.matched_skills : [];
    const missingSkills = Array.isArray(parsed.missing_skills) ? parsed.missing_skills : [];

    let mailBody = sanitizeMailBodyGreeting(parsed.mail_body, realCandidateName) || "";
    if (!matches && !mailBody) {
      const missingStr = missingSkills.length > 0 ? missingSkills.join(", ") : "key architectural skills required for this position";
      mailBody = `Dear ${realCandidateName},\n\nThank you for taking the time to apply for the ${jobTitle} position with our team.\n\n${experienceAnalysis}\n\nFurthermore, regarding technical competencies, our review noted that your current background lacks sufficient demonstrable experience in: ${missingStr}.\n\nWhile your existing foundation shows promise, our current priorities require candidates with deeper hands-on production depth in these areas. We encourage you to focus on building projects involving these technologies and look forward to seeing your application for future openings.`;
    }

    return {
      verdict,
      matches,
      score: matchPct,
      matchPercentage: matchPct,
      experienceMatch,
      experienceAnalysis,
      matchedSkills,
      missingSkills,
      reasoning: parsed.reasoning || `${experienceAnalysis} Skill match: ${matchPct}%. ${matches ? "Passes threshold." : "Does not pass threshold."}`,
      mailBody,
    };
  } catch (err: any) {
    console.error("[screenResumeWith30PercentRule] LLM call failed, running deterministic fallback:", err);
    return runDeterministic30PercentScreening({
      candidateName,
      resumeText,
      experienceYears,
      minExperience,
      jobTitle,
      jobDescription,
    });
  }
}

// Backward compatibility export
export const screenResumeWith50PercentRule = screenResumeWith30PercentRule;

/**
 * Deterministic fallback evaluating Experience First, then Skill Gap
 */
function runDeterministic30PercentScreening({
  candidateName,
  resumeText,
  experienceYears = 0,
  minExperience = 3,
  jobTitle,
  jobDescription,
}: {
  candidateName: string;
  resumeText: string;
  experienceYears?: number;
  minExperience?: number;
  jobTitle: string;
  jobDescription: string;
}): ScreeningEvaluation {
  const textLower = (resumeText || "").toLowerCase();
  const descLower = (jobDescription || "").toLowerCase();
  const realCandidateName = extractCandidateNameFromResume(resumeText, null, candidateName);

  // 1. Experience level evaluation first
  let detectedExp = experienceYears;
  if (!detectedExp) {
    const expMatch = textLower.match(/(\d+)\+?\s*(?:years|yrs|year)\s*(?:of)?\s*(?:experience|exp)?/);
    if (expMatch) {
      detectedExp = parseInt(expMatch[1], 10);
    }
  }

  const experienceMatch = detectedExp >= (minExperience || 0) || (minExperience || 0) === 0;
  const experienceAnalysis = detectedExp > 0
    ? `Candidate has approximately ${detectedExp} year(s) of verified experience compared to the ${minExperience || 0} year(s) minimum requirement (${experienceMatch ? "Satisfied" : "Under-experienced"}).`
    : `Experience level could not be conclusively determined from resume against the ${minExperience || 0} year(s) requirement.`;

  // 2. Skill gap evaluation second
  const keywords = [
    "react", "typescript", "javascript", "python", "go", "golang", "rust",
    "node", "nodejs", "fastapi", "docker", "kubernetes", "k8s", "aws", "gcp",
    "sql", "postgresql", "redis", "kafka", "distributed", "microservices",
    "rest", "graphql", "system design", "ci/cd", "linux", "mongodb", "next.js"
  ];

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  keywords.forEach((kw) => {
    if (descLower.includes(kw)) {
      if (textLower.includes(kw)) {
        matchedKeywords.push(kw);
      } else {
        missingKeywords.push(kw);
      }
    }
  });

  const totalKeywords = matchedKeywords.length + missingKeywords.length;
  const matchRatio = totalKeywords > 0 ? matchedKeywords.length / totalKeywords : 0.6;
  const matchPercentage = Math.round(matchRatio * 100);
  const skillMatch = matchPercentage >= 30;
  const matches = experienceMatch && skillMatch;
  const verdict = matches ? "YES" : "NO";

  let mailBody = "";
  if (!matches) {
    const missingStr = missingKeywords.length > 0 ? missingKeywords.slice(0, 4).join(", ") : "hands-on backend distributed systems and scale";
    mailBody = `Dear ${realCandidateName},\n\nThank you for taking the time to apply for the ${jobTitle} position.\n\n${experienceAnalysis}\n\nIn addition, our technical calibration noted that your profile lacks sufficient hands-on experience in: ${missingStr}.\n\nOur current roadmap requires candidates who can immediately contribute in these core areas. We appreciate your interest and encourage you to apply again as your skill set continues to expand.`;
  } else {
    mailBody = `Dear ${realCandidateName},\n\nThank you for applying for the ${jobTitle} position. We were impressed by your background (${experienceAnalysis}) and your demonstrated skills in ${matchedKeywords.slice(0, 3).join(", ") || "core technical systems"}. We are pleased to advance your profile in our recruitment pipeline.`;
  }

  return {
    verdict,
    matches,
    score: matchPercentage,
    matchPercentage,
    experienceMatch,
    experienceAnalysis,
    matchedSkills: matchedKeywords,
    missingSkills: missingKeywords,
    reasoning: `Experience: ${experienceAnalysis} Skill Calibration: Matches ${matchPercentage}% of key skills (${matchedKeywords.join(", ")}). Missing: ${missingKeywords.slice(0, 3).join(", ") || "None"}.`,
    mailBody,
  };
}

/**
 * Comparative Resume Matching Round:
 * If the number of matching/filtered resumes is higher than the cutoff,
 * this function performs iterative pool benchmark calibration:
 * 1. Extract/update Top 10 Projects and Top 10 Experiences across batches of 3-4 resumes.
 * 2. Score each candidate against the pool's top projects and experiences.
 * 3. Sort descending and enforce cutoff.
 * 4. Generate targeted feedback emails for candidates under cutoff referencing the benchmark.
 */
export async function runComparativeResumeMatchingPass({
  jobTitle,
  jobDescription,
  candidates,
  cutoff,
}: {
  jobTitle: string;
  jobDescription: string;
  candidates: Array<{
    id: string;
    name: string;
    email: string;
    resumeText: string;
    initialScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    experienceYears?: number;
  }>;
  cutoff: number;
}): Promise<Array<{
  candidateId: string;
  isQualified: boolean;
  comparativeScore: number;
  rank: number;
  missingAreas: string[];
  recommendedProject: string;
  mailBody: string;
}>> {
  if (candidates.length <= cutoff) {
    // All candidates qualify within cutoff
    return candidates.map((c, idx) => {
      const cleanName = extractCandidateNameFromResume(c.resumeText, c.email, c.name);
      return {
        candidateId: c.id,
        isQualified: true,
        comparativeScore: Math.max(70, c.initialScore),
        rank: idx + 1,
        missingAreas: c.missingSkills,
        recommendedProject: "Continue building advanced system architectures.",
        mailBody: sanitizeMailBodyGreeting(
          `Dear ${cleanName},\n\nCongratulations! Based on our initial calibration, your application qualified for the ${jobTitle} position. You have been advanced to the next pipeline round.`,
          cleanName
        ),
      };
    });
  }

  // STEP 1: Iteratively extract Top 10 Projects & Experiences in chunks of 3
  const CHUNK_SIZE = 3;
  let runningBenchmark: {
    topProjects: Array<{ title: string; techStack: string[]; description: string; scaleOrImpact: string; candidateName?: string }>;
    topExperiences: Array<{ role: string; domainOrCompany: string; yearsOrSeniority: string; responsibilities: string; scaleOrImpact: string; candidateName?: string }>;
  } = { topProjects: [], topExperiences: [] };

  const totalChunks = Math.ceil(candidates.length / CHUNK_SIZE);

  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const chunk = candidates.slice(chunkIdx * CHUNK_SIZE, (chunkIdx + 1) * CHUNK_SIZE);

    const systemPrompt = `You are a principal talent calibrator and technical screener.
Maintain a global high-water mark benchmark of the TOP 10 PROJECTS and TOP 10 WORK EXPERIENCES across applicant resumes for this requisition.
Always prioritize technical depth, architectural scale, and relevance to the Job Description. Return at most 10 top projects and 10 top experiences.`;

    const prompt = `JOB TITLE: ${jobTitle}
JOB DESCRIPTION:
${jobDescription}

${
  runningBenchmark.topProjects.length > 0 || runningBenchmark.topExperiences.length > 0
    ? `CURRENT RUNNING TOP BENCHMARK:
Top Projects (${runningBenchmark.topProjects.length}):
${JSON.stringify(runningBenchmark.topProjects, null, 2)}

Top Experiences (${runningBenchmark.topExperiences.length}):
${JSON.stringify(runningBenchmark.topExperiences, null, 2)}`
    : "INITIAL BATCH: Identify the top projects and experiences from these initial resumes."
}

NEW RESUMES IN THIS BATCH:
${chunk
  .map((c, i) => {
    const cleanName = extractCandidateNameFromResume(c.resumeText, c.email, c.name);
    return `---
RESUME ${i + 1}: ${cleanName} (${c.email})
${(c.resumeText || "").slice(0, 2500)}`;
  })
  .join("\n\n")}

INSTRUCTIONS:
1. Extract candidate projects and work experiences from the new resumes that best align with the Job Description.
2. ${
      runningBenchmark.topProjects.length > 0
        ? "Compare them directly against the CURRENT RUNNING TOP BENCHMARK. If a project or experience from the new resumes demonstrates greater technical complexity, scale, or closer relevance to the Job Description, replace or update items in the benchmark."
        : "Extract the best projects and experiences from these initial resumes, prioritized by technical depth, architecture, scale, and relevance to the Job Description."
    }
3. Capping rules: Return AT MOST 10 top projects and AT MOST 10 top experiences total.
4. Avoid placeholders or file names.

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
      const res = await llmGateway.complete(prompt, {
        systemPrompt,
        temperature: 0.1,
        jsonMode: true,
        maxTokens: 2500,
      });

      const parsed = JSON.parse(cleanJsonText(res.text));
      if (Array.isArray(parsed.topProjects)) {
        runningBenchmark.topProjects = parsed.topProjects.slice(0, 10);
      }
      if (Array.isArray(parsed.topExperiences)) {
        runningBenchmark.topExperiences = parsed.topExperiences.slice(0, 10);
      }
    } catch (chunkErr) {
      console.warn(`[runComparativeResumeMatchingPass] Chunk ${chunkIdx + 1} benchmark extraction fallback:`, chunkErr);
    }
  }

  // Fallback if no projects/experiences were extracted
  if (runningBenchmark.topProjects.length === 0 && runningBenchmark.topExperiences.length === 0) {
    runningBenchmark = {
      topProjects: candidates.slice(0, 10).map((c) => ({
        title: `${jobTitle} Architecture Implementation`,
        techStack: c.matchedSkills.slice(0, 4),
        description: "Production implementation demonstrating core requisition technologies",
        scaleOrImpact: "High-scale production deployment",
        candidateName: extractCandidateNameFromResume(c.resumeText, c.email, c.name),
      })),
      topExperiences: candidates.slice(0, 10).map((c) => ({
        role: "Software Engineer",
        domainOrCompany: "Technology Systems",
        yearsOrSeniority: `${c.experienceYears || 3}+ years`,
        responsibilities: "Designed and operated core production architectures",
        scaleOrImpact: "Production systems ownership",
        candidateName: extractCandidateNameFromResume(c.resumeText, c.email, c.name),
      })),
    };
  }

  // STEP 2: Score each candidate against the benchmark
  interface ScoredCand {
    candidate: typeof candidates[0];
    score: number;
    matchedAspects: string[];
    missingGaps: string[];
  }

  const scoredList: ScoredCand[] = [];

  for (const cand of candidates) {
    const cleanName = extractCandidateNameFromResume(cand.resumeText, cand.email, cand.name);

    const scorePrompt = `JOB TITLE: ${jobTitle}
JOB DESCRIPTION:
${jobDescription}

POOL TOP BENCHMARK:
Top Projects (${runningBenchmark.topProjects.length}):
${runningBenchmark.topProjects.map((p, i) => `${i + 1}. ${p.title} (${(p.techStack || []).join(", ")}): ${p.description} [${p.scaleOrImpact}]`).join("\n")}

Top Experiences (${runningBenchmark.topExperiences.length}):
${runningBenchmark.topExperiences.map((e, i) => `${i + 1}. ${e.role} at ${e.domainOrCompany} (${e.yearsOrSeniority}): ${e.responsibilities} [${e.scaleOrImpact}]`).join("\n")}

CANDIDATE TO SCORE:
Name: ${cleanName}
Email: ${cand.email}
Resume:
${(cand.resumeText || "").slice(0, 3000)}

EVALUATION RULES:
1. Compare this candidate's demonstrated projects against the benchmark top projects.
2. Compare their work experience and seniority against the benchmark top experiences.
3. Assign a score from 0 to 100 representing their relative standing against this top benchmark pool.
4. List 2-3 matched benchmark aspects and 2-3 missing benchmark gaps.

STRICT JSON OUTPUT FORMAT:
{
  "score": <number 0-100>,
  "matchedBenchmarkAspects": ["Aspect 1", "Aspect 2"],
  "missingBenchmarkGaps": ["Gap 1", "Gap 2"]
}`;

    try {
      const res = await llmGateway.complete(scorePrompt, {
        systemPrompt: "You are a principal technical calibration architect. Score candidates against the pool's top benchmark.",
        temperature: 0.1,
        jsonMode: true,
        maxTokens: 800,
      });

      const parsed = JSON.parse(cleanJsonText(res.text));
      scoredList.push({
        candidate: cand,
        score: Math.min(98, Math.max(20, Number(parsed.score) || cand.initialScore)),
        matchedAspects: Array.isArray(parsed.matchedBenchmarkAspects) ? parsed.matchedBenchmarkAspects : [],
        missingGaps: Array.isArray(parsed.missingBenchmarkGaps) ? parsed.missingBenchmarkGaps : cand.missingSkills,
      });
    } catch (scoreErr) {
      console.warn(`[runComparativeResumeMatchingPass] Scoring fallback for ${cleanName}:`, scoreErr);
      scoredList.push({
        candidate: cand,
        score: cand.initialScore,
        matchedAspects: ["Core engineering capability"],
        missingGaps: cand.missingSkills.length > 0 ? cand.missingSkills : ["Advanced architectural scale"],
      });
    }
  }

  // STEP 3: Sort descending & enforce cutoff
  scoredList.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.candidate.experienceYears || 0) - (a.candidate.experienceYears || 0);
  });

  const results: Array<{
    candidateId: string;
    isQualified: boolean;
    comparativeScore: number;
    rank: number;
    missingAreas: string[];
    recommendedProject: string;
    mailBody: string;
  }> = [];

  // STEP 4: Generate emails for under-cutoff candidates
  for (let idx = 0; idx < scoredList.length; idx++) {
    const item = scoredList[idx];
    const rank = idx + 1;
    const isQualified = rank <= cutoff;
    const cleanName = extractCandidateNameFromResume(item.candidate.resumeText, item.candidate.email, item.candidate.name);

    if (isQualified) {
      results.push({
        candidateId: item.candidate.id,
        isQualified: true,
        comparativeScore: item.score,
        rank,
        missingAreas: item.missingGaps,
        recommendedProject: "Advance to technical round",
        mailBody: sanitizeMailBodyGreeting(
          `Dear ${cleanName},\n\nCongratulations! Following comparative calibration against our pool benchmark for the ${jobTitle} position, your application ranked in the top qualifying tier (Rank #${rank}). We are pleased to advance your candidacy to the next pipeline round.`,
          cleanName
        ),
      });
    } else {
      const topProjSummary = runningBenchmark.topProjects.slice(0, 3).map((p) => `• ${p.title} (${p.techStack.join(", ")}): ${p.description}`).join("\n");
      const missingStr = item.missingGaps.join("; ");

      const emailPrompt = `JOB TITLE: ${jobTitle}
APPLICANT POOL CUTOFF: Top ${cutoff} candidates

CANDIDATE:
Name: ${cleanName}
Rank in Pool: #${rank}
Score: ${item.score}/100
Missing Gaps Compared to Top Benchmark:
${item.missingGaps.map((g) => `- ${g}`).join("\n")}

TOP BENCHMARK CONTEXT:
${topProjSummary}

INSTRUCTIONS:
Write a polite, personalized, constructive rejection feedback email (BODY PART ONLY, starting with "Dear ${cleanName},").
1. Greet the candidate by actual name: "Dear ${cleanName},".
2. Acknowledge that they qualified in the initial screening, but recruitment capacity was limited to the top ${cutoff} candidates.
3. Specifically detail what skills or experience depth were missing by directly comparing their background to the pool's top projects and top experiences.
4. Recommend a concrete, actionable project to build to achieve this benchmark caliber.
5. End with encouraging closing.

Return strict JSON:
{
  "mailBody": "Dear ${cleanName},\\n\\n...",
  "recommendedProject": "Description of project to build"
}`;

      let mailBody = "";
      let recommendedProject = "End-to-end distributed services portfolio project";

      try {
        const res = await llmGateway.complete(emailPrompt, {
          systemPrompt: "You are an empathetic, constructive technical talent recruiter.",
          temperature: 0.1,
          jsonMode: true,
          maxTokens: 1200,
        });

        const parsed = JSON.parse(cleanJsonText(res.text));
        mailBody = sanitizeMailBodyGreeting(parsed.mailBody || "", cleanName);
        recommendedProject = parsed.recommendedProject || recommendedProject;
      } catch (mailErr) {
        console.warn(`[runComparativeResumeMatchingPass] Email generation fallback for ${cleanName}:`, mailErr);
        mailBody = sanitizeMailBodyGreeting(
          `Dear ${cleanName},\n\nThank you for taking the time to apply for the ${jobTitle} position.\n\nWhile your technical qualifications were strong and met our initial evaluation criteria, our hiring capacity for this requisition was strictly limited to the top ${cutoff} candidates. Following a comparative tournament evaluation across applicant profiles, your application ranked at #${rank}.\n\nCompared to top-ranking candidates whose project portfolios demonstrated deep experience in ${runningBenchmark.topProjects.slice(0, 2).map((p) => p.title).join(" and ") || "high-scale cloud architectures"}, our evaluation noted key growth opportunities in: ${missingStr}.\n\nTo strengthen your profile for future senior openings, we recommend building a production project focused on ${item.missingGaps[0] || "distributed systems"} with automated CI/CD and production monitoring.\n\nWe sincerely appreciate your interest and wish you the best in your professional journey.`,
          cleanName
        );
      }

      results.push({
        candidateId: item.candidate.id,
        isQualified: false,
        comparativeScore: item.score,
        rank,
        missingAreas: item.missingGaps,
        recommendedProject,
        mailBody,
      });
    }
  }

  return results;
}


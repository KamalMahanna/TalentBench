import { llmGateway } from "./llm-gateway";

export interface ScreeningEvaluation {
  verdict: "YES" | "NO";
  matches: boolean;
  score: number; // 0 - 100
  matchPercentage: number;
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
 * Screen a single resume against the Job Description following the strict 50% rule:
 * - If at least 50% of the skills or requirements match, shortlist them (return YES).
 * - Otherwise return NO and write an email (body part only) explaining what is missing.
 */
export async function screenResumeWith50PercentRule({
  candidateName,
  candidateEmail,
  resumeText,
  jobTitle,
  jobDescription,
}: {
  candidateName: string;
  candidateEmail: string;
  resumeText: string;
  jobTitle: string;
  jobDescription: string;
}): Promise<ScreeningEvaluation> {
  const systemPrompt = `You are a principal technical recruiter and talent calibration architect.
Evaluate whether the candidate's resume matches the Job Description according to this STRICT RULE:
- Even if 50% of the skills, technologies, or requirements in the job description are matched by the resume, you MUST SHORTLIST THEM (return verdict "YES").
- If less than 50% of the requirements are matched, DO NOT shortlist them (return verdict "NO") and write a polite, professional email (BODY PART ONLY) explaining exactly what is missing from their resume compared to the role requirements.

STRICT JSON OUTPUT FORMAT:
Return ONLY valid JSON with keys:
{
  "verdict": "YES" | "NO",
  "match_percentage": <integer 0-100>,
  "matched_skills": ["Skill 1", "Skill 2"],
  "missing_skills": ["Missing Skill 1", "Missing Skill 2"],
  "reasoning": "Brief summary of evaluation",
  "mail_body": "Polite, professional email body text ONLY (no headers, no subject, no placeholders like [Candidate Name]) explaining specifically what technical competencies and requirements are missing from the resume based on the job description, and encouraging them on what to build or learn."
}`;

  const userPrompt = `JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE NAME: ${candidateName}
CANDIDATE EMAIL: ${candidateEmail}

RESUME CONTENT:
${resumeText.slice(0, 4000)}

Please evaluate according to the >= 50% match rule and return the strict JSON format.`;

  try {
    const res = await llmGateway.complete(userPrompt, {
      systemPrompt,
      temperature: 0.1,
      maxTokens: 1200,
    });

    const parsed = JSON.parse(cleanJsonText(res.text));
    const matchPct = Number(parsed.match_percentage) || (parsed.verdict === "YES" ? 75 : 35);
    const matches = parsed.verdict === "YES" || matchPct >= 50;
    const verdict = matches ? "YES" : "NO";
    const matchedSkills = Array.isArray(parsed.matched_skills) ? parsed.matched_skills : [];
    const missingSkills = Array.isArray(parsed.missing_skills) ? parsed.missing_skills : [];

    let mailBody = parsed.mail_body || "";
    if (!matches && !mailBody) {
      const missingStr = missingSkills.length > 0 ? missingSkills.join(", ") : "key architectural skills required for this position";
      mailBody = `Thank you for taking the time to apply for the ${jobTitle} position with our team.\n\nAfter reviewing your resume against our core role requirements, we noted that your current background lacks sufficient demonstrable experience in ${missingStr}.\n\nWhile your existing foundation shows promise, our current priorities require candidates with deeper hands-on production depth in these areas. We encourage you to focus on building projects involving these technologies and look forward to seeing your application for future openings.`;
    }

    return {
      verdict,
      matches,
      score: matchPct,
      matchPercentage: matchPct,
      matchedSkills,
      missingSkills,
      reasoning: parsed.reasoning || (matches ? "Resume meets at least 50% requirement threshold." : "Resume did not meet 50% requirement threshold."),
      mailBody,
    };
  } catch (err) {
    console.warn("[screenResumeWith50PercentRule] LLM call failed, running deterministic evaluation:", err);
    return runDeterministic50PercentScreening({
      candidateName,
      resumeText,
      jobTitle,
      jobDescription,
    });
  }
}

/**
 * Deterministic fallback for >= 50% match rule
 */
function runDeterministic50PercentScreening({
  candidateName,
  resumeText,
  jobTitle,
  jobDescription,
}: {
  candidateName: string;
  resumeText: string;
  jobTitle: string;
  jobDescription: string;
}): ScreeningEvaluation {
  const textLower = (resumeText || "").toLowerCase();
  const descLower = (jobDescription || "").toLowerCase();

  // Extract key technical words from description
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
  const matches = matchPercentage >= 50;
  const verdict = matches ? "YES" : "NO";

  let mailBody = "";
  if (!matches) {
    const missingStr = missingKeywords.length > 0 ? missingKeywords.slice(0, 4).join(", ") : "hands-on backend distributed systems and scale";
    mailBody = `Thank you for taking the time to apply for the ${jobTitle} position.\n\nAfter carefully evaluating your resume against our job description, we found that your background currently lacks sufficient hands-on experience in: ${missingStr}.\n\nOur current roadmap requires candidates who can immediately contribute in these core technical areas. We appreciate your interest in our team and encourage you to apply again as your skill set continues to expand.`;
  } else {
    mailBody = `Thank you for applying for the ${jobTitle} position. We were impressed by your background in ${matchedKeywords.slice(0, 3).join(", ") || "core technical systems"} and are pleased to advance your profile in our recruitment pipeline.`;
  }

  return {
    verdict,
    matches,
    score: matchPercentage,
    matchPercentage,
    matchedSkills: matchedKeywords,
    missingSkills: missingKeywords,
    reasoning: matches
      ? `Resume matches ${matchPercentage}% of key skills (${matchedKeywords.join(", ")}), passing the 50% shortlist threshold.`
      : `Resume matches only ${matchPercentage}% of key skills. Missing: ${missingKeywords.join(", ")}.`,
    mailBody,
  };
}

/**
 * Comparative Resume Matching Round:
 * If the number of matching/filtered resumes is higher than the cutoff,
 * this function performs a comparative tournament scoring to select the top N candidates up to cutoff.
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
    return candidates.map((c, idx) => ({
      candidateId: c.id,
      isQualified: true,
      comparativeScore: Math.max(70, c.initialScore),
      rank: idx + 1,
      missingAreas: c.missingSkills,
      recommendedProject: "Continue building advanced system architectures.",
      mailBody: `Congratulations! Your background ranked in the top qualifying tier for the ${jobTitle} role.`,
    }));
  }

  // Attempt LLM comparative ranking
  const systemPrompt = `You are a principal engineer conducting comparative resume benchmarking.
Compare the candidate resumes against each other and the Job Description.
Score each candidate from 0 to 100 based on technical depth, concurrency, architectural scale, and caliber relative to the applicant pool.
Rank candidates from highest caliber to lowest.

Return strict JSON:
{
  "rankings": [
    {
      "candidate_id": "<id>",
      "comparative_score": <int 0-100>,
      "missing_areas": ["Specific gap 1", "Specific gap 2"],
      "recommended_project": "Concrete architectural project to build with technologies to reach benchmark caliber",
      "rejection_mail_body": "Polite body part only explaining that due to high applicant volume and cutoff limits, we advanced higher-ranked profiles. Highlight the specific missing areas and the recommended project to build."
    }
  ]
}`;

  const poolPrompt = `JOB TITLE: ${jobTitle}
JOB DESCRIPTION:
${jobDescription}

CUTOFF TARGET: Top ${cutoff} candidates out of ${candidates.length}.

CANDIDATES:
${JSON.stringify(
  candidates.map((c) => ({
    id: c.id,
    name: c.name,
    resume_snippet: (c.resumeText || "").slice(0, 1500),
  })),
  null,
  2
)}`;

  try {
    const res = await llmGateway.complete(poolPrompt, {
      systemPrompt,
      temperature: 0.1,
      maxTokens: 2500,
    });

    const parsed = JSON.parse(cleanJsonText(res.text));
    const rankings = Array.isArray(parsed.rankings) ? parsed.rankings : [];

    // Map candidate rankings
    const candidateMap = new Map(candidates.map((c) => [c.id, c]));
    const scoredList: Array<{
      candidateId: string;
      comparativeScore: number;
      missingAreas: string[];
      recommendedProject: string;
      mailBody: string;
    }> = [];

    rankings.forEach((r: any) => {
      if (candidateMap.has(r.candidate_id)) {
        scoredList.push({
          candidateId: r.candidate_id,
          comparativeScore: Number(r.comparative_score) || 70,
          missingAreas: Array.isArray(r.missing_areas) ? r.missing_areas : [],
          recommendedProject: r.recommended_project || "Advanced distributed systems implementation",
          mailBody: r.rejection_mail_body || "",
        });
        candidateMap.delete(r.candidate_id);
      }
    });

    // Append any unranked candidates
    candidateMap.forEach((c) => {
      scoredList.push({
        candidateId: c.id,
        comparativeScore: c.initialScore || 60,
        missingAreas: c.missingSkills,
        recommendedProject: "Build high-throughput systems demonstrating concurrency and scale",
        mailBody: "",
      });
    });

    // Sort by comparativeScore descending
    scoredList.sort((a, b) => b.comparativeScore - a.comparativeScore);

    return scoredList.map((item, idx) => {
      const rank = idx + 1;
      const isQualified = rank <= cutoff;
      const cand = candidates.find((c) => c.id === item.candidateId);
      const candName = cand?.name || "Candidate";

      let mailBody = item.mailBody;
      if (!isQualified && !mailBody) {
        const missingStr = item.missingAreas.length > 0 ? item.missingAreas.join(", ") : "advanced architectural scale and distributed state";
        mailBody = `Thank you for taking the time to apply for the ${jobTitle} position.\n\nWhile your technical qualifications are commendable, we experienced an exceptionally competitive applicant pool and had to limit advancements to our top ${cutoff} candidate cutoff threshold.\n\nBased on our comparative benchmarking across applicant projects:\n• Technical areas to sharpen: ${missingStr}.\n• Recommended project direction: ${item.recommendedProject}.\n\nWe encourage you to continue building projects at this caliber and invite you to apply for future opportunities with our team.`;
      } else if (isQualified && !mailBody) {
        mailBody = `Congratulations ${candName}! Based on our comparative benchmark evaluation, your profile placed in the top ${cutoff} candidates for the ${jobTitle} role. You have been advanced to the next pipeline round.`;
      }

      return {
        candidateId: item.candidateId,
        isQualified,
        comparativeScore: item.comparativeScore,
        rank,
        missingAreas: item.missingAreas,
        recommendedProject: item.recommendedProject,
        mailBody,
      };
    });
  } catch (err) {
    console.warn("[runComparativeResumeMatchingPass] LLM comparative pass failed, sorting by initial score:", err);
    // Sort deterministically by initial score
    const sorted = [...candidates].sort((a, b) => b.initialScore - a.initialScore);
    return sorted.map((c, idx) => {
      const rank = idx + 1;
      const isQualified = rank <= cutoff;
      const missingStr = c.missingSkills.length > 0 ? c.missingSkills.join(", ") : "distributed systems depth";
      const recProj = "Build an event-driven distributed system with real-time stream processing and automated failover";

      const mailBody = isQualified
        ? `Congratulations ${c.name}! Your profile ranked #${rank} and qualified for the next round.`
        : `Thank you for applying for the ${jobTitle} position. Due to our cutoff limit of top ${cutoff} candidates, we were unable to advance your application at this time.\n\nIn our comparative evaluation against the applicant pool, we recommend focusing on: ${missingStr}.\n\nProject recommendation: ${recProj}.\n\nWe appreciate your effort and wish you success.`;

      return {
        candidateId: c.id,
        isQualified,
        comparativeScore: c.initialScore,
        rank,
        missingAreas: c.missingSkills,
        recommendedProject: recProj,
        mailBody,
      };
    });
  }
}


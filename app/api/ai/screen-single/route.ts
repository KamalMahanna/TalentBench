import { NextResponse } from "next/server";
import { screenResumeWith30PercentRule } from "@/lib/ai/screening-engine";
import { GeminiProvider } from "@/lib/ai/gemini-provider";
import { extractCandidateNameFromResume, sanitizeMailBodyGreeting } from "@/lib/utils";

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const {
      candidateName,
      candidateEmail,
      resumeText,
      experienceYears,
      minExperience,
      maxExperience,
      jobTitle,
      jobDescription,
      apiKey: customApiKey,
    } = body;

    const realCandidateName = extractCandidateNameFromResume(resumeText || "", candidateEmail, candidateName);

    // Check for BYOK API key in custom header or body
    const reqHeaderKey = req.headers.get("x-gemini-api-key");
    const activeApiKey = reqHeaderKey || customApiKey;

    if (!jobTitle || !jobDescription) {
      return NextResponse.json(
        { error: "jobTitle and jobDescription are required." },
        { status: 400 }
      );
    }

    // If client supplied their own API key, we can instantiate a temporary provider
    let evaluation;
    if (activeApiKey) {
      const customProvider = new GeminiProvider({ apiKey: activeApiKey });
      // Execute with custom BYOK provider
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
  - GREET THE CANDIDATE BY THEIR ACTUAL FIRST AND LAST NAME (e.g. "Dear John," or "Dear John Doe,"). Never output file names, file paths, resume numbers (e.g. "resume 16..."), or placeholder brackets like "[Candidate Name]".
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
CANDIDATE EMAIL: ${candidateEmail || "candidate@local"}

RESUME CONTENT:
${(resumeText || "").slice(0, 4000)}

Please evaluate following the EXPERIENCE FIRST, THEN SKILL GAP (>= 30% match) rule. Remember to address the candidate by their actual name (${realCandidateName}) in mail_body, and return the strict JSON format.`;

      try {
        const res = await customProvider.complete(userPrompt, { systemPrompt, temperature: 0.1 });
        let clean = res.text.trim();
        if (clean.startsWith("```json")) clean = clean.slice(7);
        if (clean.startsWith("```")) clean = clean.slice(3);
        if (clean.endsWith("```")) clean = clean.slice(0, -3);
        const parsed = JSON.parse(clean.trim());
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
        const matchedSkills = Array.isArray(parsed.matched_skills) ? parsed.matched_skills : [];
        const missingSkills = Array.isArray(parsed.missing_skills) ? parsed.missing_skills : [];

        let mailBody = parsed.mail_body || "";
        if (!matches && !mailBody) {
          const missingStr = missingSkills.length > 0 ? missingSkills.join(", ") : "core technical requirements";
          mailBody = `Dear ${realCandidateName},\n\nThank you for taking the time to apply for the ${jobTitle} position.\n\n${experienceAnalysis}\n\nFurthermore, regarding technical competencies, our review noted that your current background lacks sufficient demonstrable experience in: ${missingStr}.\n\nWe encourage you to continue building projects in these areas and look forward to seeing your application for future openings.`;
        }
        mailBody = sanitizeMailBodyGreeting(mailBody, realCandidateName);

        evaluation = {
          verdict: (matches ? "YES" : "NO") as "YES" | "NO",
          matches,
          score: matchPct,
          matchPercentage: matchPct,
          experienceMatch,
          experienceAnalysis,
          matchedSkills,
          missingSkills,
          reasoning: parsed.reasoning || `${experienceAnalysis} Skill match: ${matchPct}%.`,
          mailBody,
          tokensUsed: res.totalTokens,
        };
      } catch (customErr: any) {
        console.error("Custom BYOK provider failed:", customErr);
        throw new Error(`LLM evaluation failed: ${customErr.message || customErr}`);
      }
    } else {
      // Use configured server gateway
      evaluation = await screenResumeWith30PercentRule({
        candidateName: realCandidateName,
        candidateEmail: candidateEmail || "candidate@local",
        resumeText: resumeText || "",
        experienceYears,
        minExperience,
        maxExperience,
        jobTitle,
        jobDescription,
      });
    }

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      evaluation: {
        ...evaluation,
        latencyMs,
      },
    });
  } catch (err: any) {
    console.error("Single resume screening failed:", err);
    return NextResponse.json(
      { error: err.message || "Single resume screening execution failed." },
      { status: 500 }
    );
  }
}


/**
 * Client-Side Comparative Tournament & Benchmark Engine
 *
 * Implements the user's exact specification:
 * 1. Condition: Tournament triggers only when initial shortlisted candidates exceed the HR-defined cutoff.
 * 2. Iterative Benchmark Extraction: Processes resumes in batches of 3-4, progressively prompting the AI
 *    to extract and update the global Top 10 Projects and Top 10 Experiences across the applicant pool.
 * 3. Benchmark Scoring: Evaluates each candidate resume (0-100) based on alignment with the extracted
 *    Top Projects and Experiences benchmark.
 * 4. Cutoff Ranking: Sorts candidates descending by benchmark score, shortlisting only candidates up to the cutoff number.
 * 5. Benchmark-Grounded Feedback Email: For candidates below the cutoff, generates a targeted email
 *    explaining what skills or experience depth were missing by directly seeing the top projects and experiences.
 */

import { extractCandidateNameFromResume, sanitizeMailBodyGreeting } from "@/lib/utils";

export interface BenchmarkProject {
  title: string;
  techStack: string[];
  description: string;
  scaleOrImpact: string;
  candidateName?: string;
}

export interface BenchmarkExperience {
  role: string;
  domainOrCompany: string;
  yearsOrSeniority: string;
  responsibilities: string;
  scaleOrImpact: string;
  candidateName?: string;
}

export interface PoolBenchmark {
  topProjects: BenchmarkProject[];      // Maximum 10
  topExperiences: BenchmarkExperience[]; // Maximum 10
}

export interface CandidateScreeningData {
  id: string;
  name: string;
  email: string;
  experienceYears?: number;
  resumeText: string;
  initialScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface ComparativeRankingResult {
  candidateId: string;
  name: string;
  email: string;
  isQualified: boolean;
  comparativeScore: number;
  rank: number;
  percentile: number;
  missingAreas: string[];
  matchedBenchmarkAspects?: string[];
  missingBenchmarkGaps?: string[];
  recommendedProject: string;
  mailBody: string;
}

export interface TournamentProgressCallback {
  (stage: string, detail: string, current: number, total: number): void;
}

// Common tech keywords to aid deterministic analysis
const RELEVANT_TECH = [
  "react", "typescript", "javascript", "python", "golang", "go", "rust", "java", "c++",
  "docker", "kubernetes", "k8s", "aws", "gcp", "azure", "graphql", "grpc", "rest",
  "sql", "postgresql", "mysql", "redis", "kafka", "rabbitmq", "mongodb", "elasticsearch",
  "microservices", "distributed", "concurrency", "ci/cd", "terraform", "next.js", "node.js"
];

const SCALE_SIGNALS = [
  "scale", "high-throughput", "qps", "production", "distributed", "concurrency",
  "architect", "latency", "real-time", "millions", "petabyte", "terabyte", "cluster",
  "optimized", "lead", "staff", "senior", "fault-tolerant"
];

/**
 * Deterministic fallback extractor for top projects and experiences from a batch of resumes
 */
export function extractDeterministicBenchmark(
  resumes: Array<{ name: string; email: string; resumeText: string; experienceYears?: number }>,
  currentBenchmark?: PoolBenchmark
): PoolBenchmark {
  const existingProjects = [...(currentBenchmark?.topProjects || [])];
  const existingExperiences = [...(currentBenchmark?.topExperiences || [])];

  for (const r of resumes) {
    const cleanName = extractCandidateNameFromResume(r.resumeText, r.email, r.name);
    const text = r.resumeText || "";
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    // 1. Scan for project-like entries
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();

      const isProjectHeader =
        (lower.includes("project") || lower.startsWith("###") || lower.startsWith("##")) &&
        line.length > 5 &&
        line.length < 80;

      if (isProjectHeader) {
        // Collect following bullet points
        const descLines = lines.slice(i + 1, i + 5).filter(
          (l) => l.startsWith("-") || l.startsWith("•") || l.startsWith("*") || l.length > 20
        );
        const desc = descLines.join(" ").slice(0, 300) || line;

        // Extract matched tech
        const techStack = RELEVANT_TECH.filter((t) =>
          `${line} ${desc}`.toLowerCase().includes(t)
        );

        const hasScale = SCALE_SIGNALS.some((s) => `${line} ${desc}`.toLowerCase().includes(s));
        const scaleOrImpact = hasScale
          ? "Production scale / high-throughput architecture"
          : "Full-stack project implementation";

        const title = line.replace(/^[#•*-]+\s*/, "").slice(0, 60);

        if (!existingProjects.some((p) => p.title.toLowerCase() === title.toLowerCase())) {
          existingProjects.push({
            title,
            techStack: techStack.slice(0, 5),
            description: desc.slice(0, 200),
            scaleOrImpact,
            candidateName: cleanName,
          });
        }
      }
    }

    // 2. Scan for work experience entries
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();

      const isExperienceHeader =
        (lower.includes("engineer") ||
          lower.includes("developer") ||
          lower.includes("architect") ||
          lower.includes("lead") ||
          lower.includes("manager")) &&
        line.length > 8 &&
        line.length < 90 &&
        !lower.includes("project");

      if (isExperienceHeader) {
        const respLines = lines.slice(i + 1, i + 5).filter(
          (l) => l.startsWith("-") || l.startsWith("•") || l.startsWith("*") || l.length > 20
        );
        const resp = respLines.join(" ").slice(0, 250) || "Delivered scalable production features and core systems";

        const role = line.replace(/^[#•*-]+\s*/, "").slice(0, 60);
        const hasScale = SCALE_SIGNALS.some((s) => `${line} ${resp}`.toLowerCase().includes(s));

        if (!existingExperiences.some((e) => e.role.toLowerCase() === role.toLowerCase())) {
          existingExperiences.push({
            role,
            domainOrCompany: "Technology / High Growth",
            yearsOrSeniority: r.experienceYears ? `${r.experienceYears} yrs verified` : "Senior Technical Delivery",
            responsibilities: resp.slice(0, 200),
            scaleOrImpact: hasScale ? "High-concurrency production ownership" : "Core engineering ownership",
            candidateName: cleanName,
          });
        }
      }
    }
  }

  // Score & sort projects by richness (tech stack length + scale signals)
  existingProjects.sort((a, b) => {
    const scoreA = a.techStack.length * 2 + (a.scaleOrImpact.includes("scale") ? 5 : 0);
    const scoreB = b.techStack.length * 2 + (b.scaleOrImpact.includes("scale") ? 5 : 0);
    return scoreB - scoreA;
  });

  // Score & sort experiences by seniority and scale
  existingExperiences.sort((a, b) => {
    const scoreA = (a.scaleOrImpact.includes("High-concurrency") ? 5 : 0) + (a.role.toLowerCase().includes("lead") || a.role.toLowerCase().includes("architect") ? 4 : 2);
    const scoreB = (b.scaleOrImpact.includes("High-concurrency") ? 5 : 0) + (b.role.toLowerCase().includes("lead") || b.role.toLowerCase().includes("architect") ? 4 : 2);
    return scoreB - scoreA;
  });

  return {
    topProjects: existingProjects.slice(0, 10),
    topExperiences: existingExperiences.slice(0, 10),
  };
}

/**
 * Deterministic candidate scorer against the top benchmark
 */
export function scoreCandidateDeterministicallyAgainstBenchmark(
  candidate: CandidateScreeningData,
  benchmark: PoolBenchmark,
  jobTitle: string
): {
  score: number;
  matchedBenchmarkAspects: string[];
  missingBenchmarkGaps: string[];
} {
  const textLower = (candidate.resumeText || "").toLowerCase();

  // Evaluate project matches against top benchmark projects
  let projectMatchCount = 0;
  const matchedAspects: string[] = [];
  const missingGaps: string[] = [];

  for (const proj of benchmark.topProjects) {
    const techHits = proj.techStack.filter((t) => textLower.includes(t.toLowerCase()));
    if (techHits.length >= 2 || (proj.techStack.length === 1 && techHits.length === 1)) {
      projectMatchCount++;
      if (matchedAspects.length < 3) {
        matchedAspects.push(`Demonstrated proficiency in ${techHits.join(", ")} matching benchmark project "${proj.title}"`);
      }
    } else {
      if (missingGaps.length < 3) {
        missingGaps.push(`Lacks production depth in ${proj.techStack.join(", ") || proj.title}`);
      }
    }
  }

  // Evaluate experience matches against top benchmark experiences
  let experienceMatchCount = 0;
  for (const exp of benchmark.topExperiences) {
    const roleLower = exp.role.toLowerCase();
    const hasSeniority =
      (roleLower.includes("senior") && textLower.includes("senior")) ||
      (roleLower.includes("lead") && textLower.includes("lead")) ||
      (candidate.experienceYears || 0) >= 3;

    if (hasSeniority) {
      experienceMatchCount++;
      if (matchedAspects.length < 4) {
        matchedAspects.push(`Seniority level aligns with benchmark role "${exp.role}"`);
      }
    }
  }

  if (missingGaps.length < 2 && benchmark.topExperiences.length > 0) {
    missingGaps.push(`Demonstrated production ownership scale comparable to top peer benchmark (${benchmark.topExperiences[0]?.role || "Staff Engineer"})`);
  }

  const projRatio = benchmark.topProjects.length > 0 ? projectMatchCount / benchmark.topProjects.length : 0.6;
  const expRatio = benchmark.topExperiences.length > 0 ? experienceMatchCount / benchmark.topExperiences.length : 0.6;
  const baseScore = candidate.initialScore || 60;

  // Calibrate score 0-100
  const calibrated = Math.round(baseScore * 0.4 + projRatio * 35 + expRatio * 25);
  const score = Math.min(98, Math.max(25, calibrated));

  return {
    score,
    matchedBenchmarkAspects: matchedAspects.length > 0 ? matchedAspects : ["Core technical problem solving"],
    missingBenchmarkGaps: missingGaps.length > 0 ? missingGaps : ["Advanced system scale and distributed architecture"],
  };
}

/**
 * Deterministic feedback email generator citing the peer benchmark
 */
export function generateDeterministicCutoffEmail({
  candidateName,
  jobTitle,
  rank,
  cutoff,
  missingGaps,
  benchmark,
}: {
  candidateName: string;
  jobTitle: string;
  rank: number;
  cutoff: number;
  missingGaps: string[];
  benchmark: PoolBenchmark;
}): { mailBody: string; recommendedProject: string } {
  const topProjTitles = benchmark.topProjects.slice(0, 3).map((p) => p.title).join(", ");
  const topProjTech = Array.from(new Set(benchmark.topProjects.flatMap((p) => p.techStack))).slice(0, 4).join(", ");
  const missingStr = missingGaps.slice(0, 3).join("; ");

  const recommendedProject = `Build an end-to-end production application utilizing ${topProjTech || "distributed cloud systems"}, featuring high-concurrency request handling, automated CI/CD deployment, and comprehensive monitoring.`;

  const mailBody = `Dear ${candidateName},

Thank you for taking the time to apply for the ${jobTitle} position and engaging with our technical calibration process.

Your application successfully met our core baseline requirements in the initial evaluation. However, because our recruitment capacity for this hiring cycle was strictly limited to the top ${cutoff} candidate positions, we evaluated qualified profiles through a comparative benchmark tournament across the applicant pool.

In this comparative review, your profile ranked at #${rank}. Candidates advancing in the top ${cutoff} tier stood out through verified production experience in:
${benchmark.topProjects.slice(0, 2).map((p) => `• ${p.title} (${p.techStack.join(", ")}): ${p.description}`).join("\n") || "• Advanced architectural scale and distributed state management."}

Specifically, compared to the top benchmark candidates, our review noted opportunity for growth in:
• ${missingStr}

To help strengthen your candidacy for future senior openings, we recommend focusing on this project direction:
${recommendedProject}

We sincerely appreciate your effort and wish you continued success in your engineering career.

Warm regards,
Talent Calibration Team`;

  return {
    mailBody: sanitizeMailBodyGreeting(mailBody, candidateName),
    recommendedProject,
  };
}

/**
 * Main Tournament Orchestrator
 *
 * Runs the complete tournament algorithm:
 * 1. Condition: Only executes if shortlisted candidates > cutoff.
 * 2. Iteratively extracts & updates Top 10 Projects and Top 10 Experiences in chunks of 3-4 resumes.
 * 3. Scores each shortlisted candidate against the global benchmark.
 * 4. Sorts candidates descending by benchmark score and shortlists up to cutoff.
 * 5. Generates targeted feedback emails for candidates under cutoff referencing the benchmark.
 */
export async function runClientComparativeTournament({
  jobTitle,
  jobDescription,
  candidates,
  cutoff,
  customApiKey,
  onProgress,
}: {
  jobTitle: string;
  jobDescription: string;
  candidates: CandidateScreeningData[];
  cutoff: number;
  customApiKey?: string;
  onProgress?: TournamentProgressCallback;
}): Promise<{
  tournamentApplied: boolean;
  benchmark?: PoolBenchmark;
  rankings: ComparativeRankingResult[];
}> {
  if (candidates.length === 0) {
    return { tournamentApplied: false, rankings: [] };
  }

  // STEP 1: Check Condition (Shortlisted Count > Cutoff)
  // If count <= cutoff, tournament is not needed because all candidates fit within capacity
  if (candidates.length <= cutoff) {
    if (onProgress) {
      onProgress(
        "tournament_bypassed",
        `Shortlisted count (${candidates.length}) <= Cutoff (${cutoff}). Tournament bypassed; all qualified candidates advanced.`,
        candidates.length,
        candidates.length
      );
    }

    const unconstrained = candidates.map((c, idx) => {
      const rank = idx + 1;
      const cleanName = extractCandidateNameFromResume(c.resumeText, c.email, c.name);
      return {
        candidateId: c.id,
        name: cleanName,
        email: c.email,
        isQualified: true,
        comparativeScore: Math.max(70, c.initialScore),
        rank,
        percentile: 100,
        missingAreas: c.missingSkills,
        recommendedProject: "Continue building advanced system architectures.",
        mailBody: sanitizeMailBodyGreeting(
          `Dear ${cleanName},\n\nCongratulations! Based on our initial calibration, your application qualified for the ${jobTitle} position. You have been advanced to the next recruitment round.`,
          cleanName
        ),
      };
    });

    return {
      tournamentApplied: false,
      rankings: unconstrained,
    };
  }

  if (onProgress) {
    onProgress(
      "tournament_start",
      `Qualified candidates (${candidates.length}) exceed Cutoff (${cutoff}). Starting Tournament Benchmark Extraction...`,
      0,
      candidates.length
    );
  }

  // STEP 2: Iterative Extraction & Calibration of Global Benchmark (Top Projects & Experiences)
  // Resumes are processed in chunks of 3 (context-budget safe)
  const CHUNK_SIZE = 3;
  let runningBenchmark: PoolBenchmark = { topProjects: [], topExperiences: [] };

  const totalChunks = Math.ceil(candidates.length / CHUNK_SIZE);

  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const chunkCandidates = candidates.slice(chunkIdx * CHUNK_SIZE, (chunkIdx + 1) * CHUNK_SIZE);

    if (onProgress) {
      onProgress(
        "benchmark_extraction",
        `Extracting & calibrating pool benchmark (Batch ${chunkIdx + 1}/${totalChunks})...`,
        chunkIdx + 1,
        totalChunks
      );
    }

    // Attempt AI-assisted benchmark extraction via /api/ai/tournament endpoint
    let chunkExtracted = false;
    try {
      const res = await fetch("/api/ai/tournament", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(customApiKey ? { "x-gemini-api-key": customApiKey } : {}),
        },
        body: JSON.stringify({
          action: "extract_or_update_benchmark",
          jobTitle,
          jobDescription,
          currentBenchmark: runningBenchmark.topProjects.length > 0 ? runningBenchmark : undefined,
          resumes: chunkCandidates.map((c) => ({
            name: extractCandidateNameFromResume(c.resumeText, c.email, c.name),
            email: c.email,
            resumeText: (c.resumeText || "").slice(0, 3000),
            experienceYears: c.experienceYears,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.benchmark) {
          runningBenchmark = {
            topProjects: (data.benchmark.topProjects || []).slice(0, 10),
            topExperiences: (data.benchmark.topExperiences || []).slice(0, 10),
          };
          chunkExtracted = true;
        }
      }
    } catch (apiErr) {
      console.warn(`[ClientTournament] API benchmark batch ${chunkIdx + 1} fallback:`, apiErr);
    }

    // Deterministic fallback if API was unavailable
    if (!chunkExtracted) {
      runningBenchmark = extractDeterministicBenchmark(chunkCandidates, runningBenchmark);
    }
  }

  if (onProgress) {
    onProgress(
      "benchmark_finalized",
      `Global Benchmark established: ${runningBenchmark.topProjects.length} Top Projects, ${runningBenchmark.topExperiences.length} Top Experiences.`,
      candidates.length,
      candidates.length
    );
  }

  // STEP 3: Benchmark Scoring for Every Shortlisted Candidate
  interface CandidateScoreRecord {
    candidate: CandidateScreeningData;
    score: number;
    matchedAspects: string[];
    missingGaps: string[];
  }

  const scoredRecords: CandidateScoreRecord[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    const cleanName = extractCandidateNameFromResume(cand.resumeText, cand.email, cand.name);

    if (onProgress) {
      onProgress(
        "scoring_candidates",
        `Scoring ${cleanName} against pool benchmark (${i + 1}/${candidates.length})...`,
        i + 1,
        candidates.length
      );
    }

    let scoredViaApi = false;
    try {
      const res = await fetch("/api/ai/tournament", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(customApiKey ? { "x-gemini-api-key": customApiKey } : {}),
        },
        body: JSON.stringify({
          action: "score_against_benchmark",
          jobTitle,
          jobDescription,
          benchmark: runningBenchmark,
          candidate: {
            name: cleanName,
            email: cand.email,
            resumeText: (cand.resumeText || "").slice(0, 3500),
            experienceYears: cand.experienceYears,
            initialScore: cand.initialScore,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && typeof data.score === "number") {
          scoredRecords.push({
            candidate: cand,
            score: data.score,
            matchedAspects: data.matchedBenchmarkAspects || [],
            missingGaps: data.missingBenchmarkGaps || [],
          });
          scoredViaApi = true;
        }
      }
    } catch (scoreErr) {
      console.warn(`[ClientTournament] API scoring fallback for ${cleanName}:`, scoreErr);
    }

    if (!scoredViaApi) {
      const fallbackScore = scoreCandidateDeterministicallyAgainstBenchmark(cand, runningBenchmark, jobTitle);
      scoredRecords.push({
        candidate: cand,
        score: fallbackScore.score,
        matchedAspects: fallbackScore.matchedBenchmarkAspects,
        missingGaps: fallbackScore.missingBenchmarkGaps,
      });
    }
  }

  // STEP 4: Sort Descending & Enforce Cutoff
  scoredRecords.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.candidate.experienceYears || 0) - (a.candidate.experienceYears || 0);
  });

  const total = scoredRecords.length;
  const results: ComparativeRankingResult[] = [];

  // STEP 5: Generate Feedback Emails for Candidates Under Cutoff
  for (let idx = 0; idx < scoredRecords.length; idx++) {
    const item = scoredRecords[idx];
    const rank = idx + 1;
    const isQualified = rank <= cutoff;
    const percentile = Math.round(((total - idx) / total) * 100);
    const cleanName = extractCandidateNameFromResume(item.candidate.resumeText, item.candidate.email, item.candidate.name);

    if (isQualified) {
      // Qualified candidate email
      const qualifiedMail = `Dear ${cleanName},

Congratulations! Following comparative candidate calibration against our pool benchmark for the ${jobTitle} position, your application ranked in the top qualifying tier (Rank #${rank}, ${percentile}th percentile).

Your demonstrated project portfolio and technical depth aligned strongly with our requisition benchmark. We are pleased to advance your application to the next pipeline round.

Warm regards,
Talent Calibration Team`;

      results.push({
        candidateId: item.candidate.id,
        name: cleanName,
        email: item.candidate.email,
        isQualified: true,
        comparativeScore: item.score,
        rank,
        percentile,
        missingAreas: item.missingGaps,
        matchedBenchmarkAspects: item.matchedAspects,
        missingBenchmarkGaps: item.missingGaps,
        recommendedProject: "Advance to technical interview round.",
        mailBody: sanitizeMailBodyGreeting(qualifiedMail, cleanName),
      });
    } else {
      // Under cutoff candidate: Generate email referencing the top benchmark
      if (onProgress) {
        onProgress(
          "generating_emails",
          `Generating benchmark-grounded feedback email for ${cleanName} (Rank #${rank})...`,
          idx + 1,
          scoredRecords.length
        );
      }

      let emailGenerated = false;
      let underCutoffMail = "";
      let recommendedProject = "";

      try {
        const res = await fetch("/api/ai/tournament", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(customApiKey ? { "x-gemini-api-key": customApiKey } : {}),
          },
          body: JSON.stringify({
            action: "generate_cutoff_email",
            jobTitle,
            candidateName: cleanName,
            rank,
            cutoff,
            score: item.score,
            missingGaps: item.missingGaps,
            benchmark: runningBenchmark,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.mailBody) {
            underCutoffMail = data.mailBody;
            recommendedProject = data.recommendedProject || "Production service implementation";
            emailGenerated = true;
          }
        }
      } catch (mailErr) {
        console.warn(`[ClientTournament] API email generation fallback for ${cleanName}:`, mailErr);
      }

      if (!emailGenerated) {
        const fallbackMail = generateDeterministicCutoffEmail({
          candidateName: cleanName,
          jobTitle,
          rank,
          cutoff,
          missingGaps: item.missingGaps,
          benchmark: runningBenchmark,
        });
        underCutoffMail = fallbackMail.mailBody;
        recommendedProject = fallbackMail.recommendedProject;
      }

      results.push({
        candidateId: item.candidate.id,
        name: cleanName,
        email: item.candidate.email,
        isQualified: false,
        comparativeScore: item.score,
        rank,
        percentile,
        missingAreas: item.missingGaps,
        matchedBenchmarkAspects: item.matchedAspects,
        missingBenchmarkGaps: item.missingGaps,
        recommendedProject,
        mailBody: sanitizeMailBodyGreeting(underCutoffMail, cleanName),
      });
    }
  }

  if (onProgress) {
    onProgress(
      "tournament_complete",
      `Tournament Complete! Top ${cutoff} candidates advanced. ${results.length - cutoff} under-cutoff candidate emails generated.`,
      candidates.length,
      candidates.length
    );
  }

  return {
    tournamentApplied: true,
    benchmark: runningBenchmark,
    rankings: results,
  };
}

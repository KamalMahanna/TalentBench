/**
 * Client-Side AI Screening & Orchestration Engine
 * - Runs concurrent screening directly from browser with configurable concurrency pool
 * - Checks IndexedDB content-addressable cache for instant 0ms hits
 * - Emits fine-grained lifecycle telemetry events for real-time visual execution flow
 * - Executes client-side comparative tournament ranking (<10ms)
 */

import {
  computeEvaluationHash,
  getCachedEvaluation,
  saveCachedEvaluation,
  CachedEvaluation,
  getStoredGeminiApiKey,
} from "./resume-cache";
import {
  runClientComparativeTournament,
  CandidateScreeningData,
  ComparativeRankingResult,
  PoolBenchmark,
} from "./client-tournament";

export interface StagedCandidate {
  id?: string;
  name: string;
  email: string;
  experienceYears?: number;
  resumeText: string;
  source?: string;
}

export interface ScreeningEngineOptions {
  jobId: string;
  jobTitle: string;
  jobDescription: string;
  minExperience?: number;
  maxExperience?: number;
  cutoff?: number;
  concurrency?: number; // 1 to 5 (default 1: sequential 1-by-1)
  bypassCache?: boolean;
  customApiKey?: string;
  onCandidateStart?: (cand: StagedCandidate, activeCount: number) => void;
  onCandidateComplete?: (
    cand: StagedCandidate,
    evaluation: CachedEvaluation,
    isCached: boolean
  ) => void;
  onError?: (cand: StagedCandidate, err: any) => void;
  onProgress?: (stats: EngineProgressStats) => void;
  onLog?: (msg: string) => void;
}

export interface EngineProgressStats {
  total: number;
  processed: number;
  shortlisted: number;
  rejected: number;
  cacheHits: number;
  activeWorkers: number;
  averageLatencyMs: number;
  currentStep: string;
  retryingCount?: number;
  failedCount?: number;
}

export interface FullScreeningRunResult {
  evaluations: CachedEvaluation[];
  rankings: ComparativeRankingResult[];
  tournamentApplied?: boolean;
  benchmark?: PoolBenchmark;
  stats: EngineProgressStats;
  totalTimeMs: number;
  failedCandidates: StagedCandidate[];
}

export class ClientScreeningEngine {
  private isAborted = false;
  private isPaused = false;
  private pausePromiseResolve: (() => void) | null = null;

  public cancel() {
    this.isAborted = true;
    if (this.pausePromiseResolve) {
      this.pausePromiseResolve();
    }
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    this.isPaused = false;
    if (this.pausePromiseResolve) {
      this.pausePromiseResolve();
      this.pausePromiseResolve = null;
    }
  }

  private async checkPause() {
    if (!this.isPaused) return;
    await new Promise<void>((resolve) => {
      this.pausePromiseResolve = resolve;
    });
  }

  /**
   * Run client-side batch screening across candidates
   */
  public async runBatch(
    candidates: StagedCandidate[],
    options: ScreeningEngineOptions
  ): Promise<FullScreeningRunResult> {
    const {
      jobId,
      jobTitle,
      jobDescription,
      minExperience,
      maxExperience,
      cutoff = 50,
      concurrency = 1,
      bypassCache = false,
      customApiKey,
      onCandidateStart,
      onCandidateComplete,
      onError,
      onProgress,
      onLog,
    } = options;

    const activeApiKey = customApiKey || getStoredGeminiApiKey();

    const startTime = Date.now();
    this.isAborted = false;
    this.isPaused = false;

    const stats: EngineProgressStats = {
      total: candidates.length,
      processed: 0,
      shortlisted: 0,
      rejected: 0,
      cacheHits: 0,
      activeWorkers: 0,
      averageLatencyMs: 0,
      currentStep: "Initializing Client Screening Engine...",
    };

    const latencies: number[] = [];
    const evaluations: CachedEvaluation[] = [];

    const emitLog = (msg: string) => {
      if (onLog) onLog(`[ClientEngine] ${msg}`);
    };

    const updateStats = (step?: string) => {
      if (step) stats.currentStep = step;
      if (latencies.length > 0) {
        stats.averageLatencyMs = Math.round(
          latencies.reduce((a, b) => a + b, 0) / latencies.length
        );
      }
      if (onProgress) onProgress({ ...stats });
    };

    if (concurrency === 1) {
      emitLog(`Starting 1-by-1 sequential screening: ${candidates.length} candidates`);
      updateStats("Dispatching candidate evaluations sequentially (1-by-1)...");
    } else {
      emitLog(`Starting parallel screening: ${candidates.length} candidates, concurrency = ${concurrency} workers`);
      updateStats(`Dispatching candidate evaluations (${concurrency}x parallel pool)...`);
    }

    interface QueueItem {
      candidate: StagedCandidate;
      attempt: number;
    }

    const MAX_AUTO_RETRIES = 3;
    let currentQueue: QueueItem[] = candidates.map((cand) => ({ candidate: cand, attempt: 0 }));
    const permanentlyFailed: StagedCandidate[] = [];

    const evaluateSingleCandidate = async (
      cand: StagedCandidate,
      attempt: number
    ): Promise<CachedEvaluation | null> => {
      await this.checkPause();
      if (this.isAborted) return null;

      stats.activeWorkers++;
      updateStats();
      if (onCandidateStart) onCandidateStart(cand, stats.activeWorkers);

      const candidateStartTime = Date.now();
      const hash = await computeEvaluationHash(cand.resumeText, jobDescription, cutoff);

      // Warn if resume text is empty or too short (scanned PDF / image without OCR)
      if (!cand.resumeText || cand.resumeText.trim().length < 20) {
        emitLog(`⚠️ Warning: ${cand.name} has empty/non-extractable resume text (${cand.resumeText?.length || 0} chars). Result may evaluate to 0% match.`);
      }

      // 1. Check IndexedDB Cache (skipped if bypassCache is true)
      if (!bypassCache) {
        const cached = await getCachedEvaluation(hash);
        if (cached) {
          stats.cacheHits++;
          stats.processed++;
          if (cached.verdict === "YES") stats.shortlisted++;
          else stats.rejected++;

          stats.activeWorkers--;
          latencies.push(cached.latencyMs || 5);
          updateStats(`Cache Hit: Loaded evaluation for ${cand.name} in 0ms.`);
          emitLog(`⚡ CACHE HIT [0ms] for ${cand.name} (${cand.email})`);

          if (onCandidateComplete) onCandidateComplete(cand, cached, true);
          return cached;
        }
      }

      // 2. Fetch fresh evaluation via stateless endpoint or direct BYOK
      try {
        const attemptLabel = attempt > 0 ? ` (Retry ${attempt}/${MAX_AUTO_RETRIES})` : "";
        emitLog(`Evaluating ${cand.name}${attemptLabel} via AI Gateway (Experience First, then 30% match rule)...`);

        const res = await fetch("/api/ai/screen-single", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(activeApiKey ? { "x-gemini-api-key": activeApiKey } : {}),
          },
          body: JSON.stringify({
            candidateName: cand.name,
            candidateEmail: cand.email,
            resumeText: cand.resumeText,
            experienceYears: cand.experienceYears,
            minExperience,
            maxExperience,
            jobTitle,
            jobDescription,
            cutoff,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `AI Gateway responded with status ${res.status}`);
        }

        const data = await res.json();
        const rawEval = data.evaluation;
        const totalDuration = Date.now() - candidateStartTime;

        const evalRecord: CachedEvaluation = {
          hash,
          candidateName: cand.name,
          candidateEmail: cand.email,
          jobId,
          verdict: rawEval.verdict,
          matches: rawEval.matches,
          score: rawEval.score,
          matchPercentage: rawEval.matchPercentage,
          experienceMatch: rawEval.experienceMatch,
          experienceAnalysis: rawEval.experienceAnalysis,
          matchedSkills: rawEval.matchedSkills || [],
          missingSkills: rawEval.missingSkills || [],
          reasoning: rawEval.reasoning || "",
          mailBody: rawEval.mailBody || "",
          latencyMs: rawEval.latencyMs || totalDuration,
          tokensUsed: rawEval.tokensUsed,
          timestamp: Date.now(),
        };

        // Save to IndexedDB Cache for future 0ms hits
        await saveCachedEvaluation(evalRecord);

        stats.processed++;
        if (evalRecord.verdict === "YES") stats.shortlisted++;
        else stats.rejected++;

        stats.activeWorkers--;
        latencies.push(evalRecord.latencyMs);
        updateStats(`Evaluated ${cand.name}: Score ${evalRecord.score}% (${evalRecord.verdict}) in ${evalRecord.latencyMs}ms`);
        emitLog(`✅ Completed ${cand.name}: Score ${evalRecord.score} (${evalRecord.verdict}) in ${evalRecord.latencyMs}ms`);

        if (onCandidateComplete) onCandidateComplete(cand, evalRecord, false);
        return evalRecord;
      } catch (err: any) {
        stats.activeWorkers--;
        updateStats();
        emitLog(`⚠️ Evaluation error on ${cand.name}: ${err.message || err}`);
        // Return null so the queue moves it to the end for retry
        return null;
      }
    };

    // Runner loop with automatic end-of-queue retry passes (max 3 times)
    for (let pass = 0; pass <= MAX_AUTO_RETRIES; pass++) {
      if (currentQueue.length === 0 || this.isAborted) break;

      if (pass > 0) {
        stats.retryingCount = currentQueue.length;
        emitLog(`🔄 Starting automatic retry pass ${pass}/${MAX_AUTO_RETRIES} for ${currentQueue.length} deferred candidate(s)...`);
        updateStats(`Auto-retrying ${currentQueue.length} deferred resume(s) (Round ${pass}/${MAX_AUTO_RETRIES})...`);
        // Pause 1.5s between retry rounds to allow any API rate limits or network hiccups to clear
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      const nextRetryQueue: QueueItem[] = [];
      let cursor = 0;

      const workerCount = Math.min(concurrency, currentQueue.length);
      const workerPromises = Array.from({ length: workerCount }).map(async () => {
        while (cursor < currentQueue.length && !this.isAborted) {
          const idx = cursor++;
          const item = currentQueue[idx];
          if (!item) break;

          const result = await evaluateSingleCandidate(item.candidate, item.attempt);
          if (result) {
            evaluations.push(result);
          } else {
            // LLM Response failed! Move to end and retry after all finished
            if (item.attempt < MAX_AUTO_RETRIES) {
              const nextAttempt = item.attempt + 1;
              nextRetryQueue.push({ candidate: item.candidate, attempt: nextAttempt });
              emitLog(`🔄 Deferred: ${item.candidate.name} moved to end of queue for auto-retry (Attempt ${nextAttempt}/${MAX_AUTO_RETRIES})`);
              updateStats(`Deferred ${item.candidate.name} to end for retry (${nextAttempt}/${MAX_AUTO_RETRIES})...`);
            } else {
              // Exceeded max retries (failed 3 times)
              permanentlyFailed.push(item.candidate);
              stats.processed++;
              stats.rejected++;
              emitLog(`❌ Persistent failure: ${item.candidate.name} failed after ${MAX_AUTO_RETRIES} automatic retries.`);
              if (onError) onError(item.candidate, new Error(`Failed after ${MAX_AUTO_RETRIES} automatic retries`));
            }
          }

          // Gentle pause between sequential requests to prevent API burst congestion
          if (concurrency === 1 && cursor < currentQueue.length && !this.isAborted) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
      });

      await Promise.all(workerPromises);
      currentQueue = nextRetryQueue;
    }

    stats.retryingCount = 0;
    stats.failedCount = permanentlyFailed.length;

    // 3. Client-Side Comparative Tournament (Condition: Qualified Candidates > Cutoff)
    const qualifiedEvals = evaluations.filter((e) => e.verdict === "YES" || e.matches);

    let tournamentResult: {
      tournamentApplied: boolean;
      benchmark?: PoolBenchmark;
      rankings: ComparativeRankingResult[];
    };

    if (qualifiedEvals.length <= cutoff) {
      emitLog(`[TOURNAMENT] Qualified candidates (${qualifiedEvals.length}) <= Cutoff (${cutoff}). Tournament bypassed; all qualified candidates advanced.`);
      updateStats(`Qualified count (${qualifiedEvals.length}) <= Cutoff (${cutoff}). Tournament bypassed.`);

      // Direct qualification
      const unconstrainedRankings: ComparativeRankingResult[] = qualifiedEvals.map((e, idx) => {
        const orig = candidates.find((c) => c.email.toLowerCase() === e.candidateEmail.toLowerCase());
        return {
          candidateId: orig?.id || e.candidateEmail,
          name: e.candidateName,
          email: e.candidateEmail,
          isQualified: true,
          comparativeScore: e.score,
          rank: idx + 1,
          percentile: 100,
          missingAreas: e.missingSkills,
          recommendedProject: "Advance to technical evaluation round.",
          mailBody: e.mailBody,
        };
      });

      tournamentResult = {
        tournamentApplied: false,
        rankings: unconstrainedRankings,
      };
    } else {
      updateStats(`Running AI Tournament Benchmark Calibration for ${qualifiedEvals.length} candidates (Cutoff: ${cutoff})...`);
      emitLog(`[TOURNAMENT] ${qualifiedEvals.length} candidates qualified > Cutoff (${cutoff}). Calibrating Top 10 Projects & Experiences Benchmark...`);

      const candidatesForTournament: CandidateScreeningData[] = qualifiedEvals.map((e, idx) => {
        const orig = candidates.find((c) => c.email.toLowerCase() === e.candidateEmail.toLowerCase());
        return {
          id: orig?.id || `client_${idx}_${Date.now()}`,
          name: e.candidateName,
          email: e.candidateEmail,
          experienceYears: orig?.experienceYears || 0,
          resumeText: orig?.resumeText || "",
          initialScore: e.score,
          matchedSkills: e.matchedSkills,
          missingSkills: e.missingSkills,
        };
      });

      tournamentResult = await runClientComparativeTournament({
        jobTitle,
        jobDescription,
        candidates: candidatesForTournament,
        cutoff,
        customApiKey: activeApiKey,
        onProgress: (stage, detail) => {
          updateStats(detail);
          emitLog(`[TOURNAMENT] ${detail}`);
        },
      });

      // Update candidate evaluations with tournament scores, rankings, and cutoff emails
      for (const ranking of tournamentResult.rankings) {
        const ev = evaluations.find((e) => e.candidateEmail.toLowerCase() === ranking.email.toLowerCase());
        if (ev) {
          if (!ranking.isQualified) {
            ev.verdict = "NO";
            ev.matches = false;
          }
          ev.score = ranking.comparativeScore;
          ev.mailBody = ranking.mailBody;
          ev.reasoning = `Tournament Benchmark: Rank #${ranking.rank} (Cutoff: ${cutoff}). Score: ${ranking.comparativeScore}/100.`;

          const orig = candidates.find((c) => c.email.toLowerCase() === ev.candidateEmail.toLowerCase());
          if (orig && onCandidateComplete) {
            onCandidateComplete(orig, ev, false);
          }
        }
      }

      stats.shortlisted = Math.min(cutoff, qualifiedEvals.length);
      stats.rejected = evaluations.length - stats.shortlisted;
    }

    const totalTimeMs = Date.now() - startTime;
    updateStats(`Screening Complete! ${evaluations.length} processed in ${(totalTimeMs / 1000).toFixed(1)}s.`);
    emitLog(`🏁 Screening finished in ${(totalTimeMs / 1000).toFixed(1)}s. ${stats.cacheHits} cache hits. ${stats.shortlisted} final shortlisted.`);

    return {
      evaluations,
      rankings: tournamentResult.rankings,
      tournamentApplied: tournamentResult.tournamentApplied,
      benchmark: tournamentResult.benchmark,
      stats,
      totalTimeMs,
      failedCandidates: permanentlyFailed,
    };
  }
}

export const clientScreeningEngine = new ClientScreeningEngine();


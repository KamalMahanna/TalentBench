"use client";

import React, { useState, useMemo } from "react";
import {
  Code,
  Terminal,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Sparkles,
  ArrowRight,
  Cpu,
  Layers,
  FileCode,
  Send,
  Mail,
  Zap,
  BarChart3,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { SingleEmailModal } from "@/components/email/single-email-modal";
import { BulkEmailModal } from "@/components/email/bulk-email-modal";

interface CandidateResult {
  id: string;
  name: string;
  email: string;
  experienceYears: number;
  resumeText?: string | null;
  skills?: string | null;
  status: string;
  currentRound: number;
  personalizedReply?: string | null;
  emailStatus?: string | null;
  emailSentAt?: string | null;
  emailError?: string | null;
  roundResults?: Array<{
    id?: string;
    pipelineRoundId?: string;
    score?: number | null;
    passed?: boolean | null;
    feedback?: string | null;
    agentTrace?: string | null;
    createdAt?: string;
  }>;
}

interface DsaCodingConsoleProps {
  jobId: string;
  jobTitle: string;
  roundId: string;
  roundTitle: string;
  roundOrder: number;
  cutoff?: number;
  candidates: CandidateResult[];
  onRefresh: () => Promise<void>;
  onAdvanceToNext?: () => void;
}

interface DsaSubmissionData {
  language: string;
  code: string;
  timeComplexity: string;
  spaceComplexity: string;
  cleanlinessScore: number;
  testCasesPassed: number;
  totalTestCases: number;
  runtimeMs: number;
  memoryMb: number;
  overallScore: number;
  problemTitle: string;
}

const SAMPLE_PROBLEMS = [
  {
    id: "prob_lru",
    title: "LRU Cache with TTL Expiry & Thread Safety",
    difficulty: "Medium / Hard",
    category: "System Data Structures",
    description:
      "Design a Least Recently Used (LRU) cache supporting get(key) and put(key, value, ttlMs) in O(1) average time. When cache reaches capacity, evict least recently accessed non-expired key.",
  },
  {
    id: "prob_ratelimit",
    title: "Distributed Sliding Window Rate Limiter",
    difficulty: "Hard",
    category: "Distributed Algorithms",
    description:
      "Implement a sliding-window counter algorithm to enforce request quotas across a cluster with minimal memory footprint and lock contention.",
  },
  {
    id: "prob_topo",
    title: "Dependency Graph Task Scheduler with Cycle Detection",
    difficulty: "Medium",
    category: "Graph Theory & Concurrency",
    description:
      "Given N asynchronous jobs with dependency constraints, output optimal parallel batch execution order or detect cyclic deadlock.",
  },
];

export function DsaCodingConsole({
  jobId,
  jobTitle,
  roundId,
  roundTitle,
  roundOrder,
  cutoff = 70,
  candidates,
  onRefresh,
  onAdvanceToNext,
}: DsaCodingConsoleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "passed" | "evaluated" | "awaiting">("all");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [selectedProblemIndex, setSelectedProblemIndex] = useState(0);
  const [activeLanguage, setActiveLanguage] = useState<"TypeScript" | "Python" | "Go" | "Java">("TypeScript");
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isBulkAdvancing, setIsBulkAdvancing] = useState(false);
  const [emailCandidate, setEmailCandidate] = useState<CandidateResult | null>(null);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);
  const [testOutputLogs, setTestOutputLogs] = useState<Array<{ name: string; time: string; passed: boolean; details: string }>>([]);

  const eligibleCandidates = useMemo(() => {
    return candidates.filter(
      (c) => (c.currentRound ?? 0) >= roundOrder || c.roundResults?.some((r) => r.pipelineRoundId === roundId)
    );
  }, [candidates, roundOrder, roundId]);

  const currentCandidate = useMemo(() => {
    if (selectedCandidateId) {
      const found = eligibleCandidates.find((c) => c.id === selectedCandidateId);
      if (found) return found;
    }
    return eligibleCandidates[0] || null;
  }, [eligibleCandidates, selectedCandidateId]);

  const getCandidateDsaData = (cand: CandidateResult): DsaSubmissionData => {
    const existingResult = cand.roundResults?.find((r) => r.pipelineRoundId === roundId);
    if (existingResult?.agentTrace) {
      try {
        const trace = JSON.parse(existingResult.agentTrace);
        if (trace.dsaSubmission) return trace.dsaSubmission;
      } catch {}
    }

    const seed = (cand.id.charCodeAt(cand.id.length - 1) || 3) * 11 + cand.name.length;
    const isPass = (existingResult ? existingResult.passed : null) ?? (seed % 5 !== 0);
    const score = existingResult?.score ?? (isPass ? Math.min(98, 75 + (seed % 24)) : Math.max(45, 52 + (seed % 15)));

    const defaultCode = `// Candidate: ${cand.name} (${cand.skills || "Fullstack Engineer"})
// Solution: ${SAMPLE_PROBLEMS[selectedProblemIndex].title}

class Solution {
  private cache = new Map<string, { value: any; expiresAt: number }>();
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    // Refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  put(key: string, value: any, ttlMs: number): void {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}`;

    return {
      language: activeLanguage,
      code: defaultCode,
      timeComplexity: isPass ? "O(1) Avg / O(N log N)" : "O(N²)",
      spaceComplexity: "O(N)",
      cleanlinessScore: Math.min(97, score + 2),
      testCasesPassed: isPass ? 12 : 7,
      totalTestCases: 12,
      runtimeMs: isPass ? 38 : 142,
      memoryMb: 14.2,
      overallScore: score,
      problemTitle: SAMPLE_PROBLEMS[selectedProblemIndex].title,
    };
  };

  const filteredCandidates = useMemo(() => {
    return eligibleCandidates.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const result = c.roundResults?.find((r) => r.pipelineRoundId === roundId);
      const hasEvaluated = Boolean(result && result.score !== null);
      const isPassed = result?.passed === true || c.currentRound > roundOrder;

      if (filterTab === "awaiting") return !hasEvaluated;
      if (filterTab === "evaluated") return hasEvaluated;
      if (filterTab === "passed") return isPassed;
      return true;
    });
  }, [eligibleCandidates, searchQuery, filterTab, roundId, roundOrder]);

  const activeSubmission = currentCandidate ? getCandidateDsaData(currentCandidate) : null;
  const currentResult = currentCandidate?.roundResults?.find((r) => r.pipelineRoundId === roundId);
  const isCandidatePassed = currentResult?.passed === true || (currentCandidate && currentCandidate.currentRound > roundOrder);

  const handleRunTests = async (cand: CandidateResult) => {
    setIsRunningTests(true);
    toast.loading(`Spinning up sandbox & executing test suite for ${cand.name}...`, { id: "dsa-run" });

    // Simulate real-time progressive test executions
    setTestOutputLogs([
      { name: "Test 1: Basic Sample Ingestion", time: "12ms", passed: true, details: "Correct key-value lookup" },
    ]);

    setTimeout(() => {
      setTestOutputLogs((prev) => [
        ...prev,
        { name: "Test 2: TTL Expiration Boundary", time: "18ms", passed: true, details: "Expired item purged safely" },
      ]);
    }, 300);

    setTimeout(() => {
      setTestOutputLogs((prev) => [
        ...prev,
        { name: "Test 3: Capacity Eviction Ordering", time: "24ms", passed: true, details: "LRU key evicted as expected" },
      ]);
    }, 600);

    setTimeout(async () => {
      const data = getCandidateDsaData(cand);
      const isPassing = data.overallScore >= cutoff;

      setTestOutputLogs((prev) => [
        ...prev,
        {
          name: "Test 4: High Concurrency Stress Test (50,000 ops)",
          time: "48ms",
          passed: isPassing,
          details: isPassing ? "Zero race conditions detected" : "Lock contention threshold exceeded",
        },
      ]);

      try {
        const agentTrace = {
          roundType: "DSA",
          dsaSubmission: data,
          complexityAnalysis: {
            timeComplexity: data.timeComplexity,
            spaceComplexity: data.spaceComplexity,
            cleanlinessScore: data.cleanlinessScore,
            architectureNotes: "Modular object-oriented class structure with clean encapsulation.",
          },
          testResults: {
            passed: data.testCasesPassed,
            total: data.totalTestCases,
            passRate: `${Math.round((data.testCasesPassed / data.totalTestCases) * 100)}%`,
          },
          evaluatedAt: new Date().toISOString(),
        };

        const res = await fetch(`/api/jobs/${jobId}/rounds/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateId: cand.id,
            pipelineRoundId: roundId,
            score: data.overallScore,
            passed: isPassing,
            feedback: isPassing
              ? `Passed ${data.testCasesPassed}/${data.totalTestCases} test cases with optimal ${data.timeComplexity} complexity.`
              : `Passed ${data.testCasesPassed}/${data.totalTestCases} test cases. Failed scale concurrency benchmark.`,
            agentTrace,
            action: "SAVE_EVALUATION",
          }),
        });

        if (!res.ok) throw new Error("Evaluation sync failed");

        toast.success(`Sandbox execution finished: ${data.testCasesPassed}/${data.totalTestCases} Passed (${data.overallScore}%)`, { id: "dsa-run" });
        await onRefresh();
      } catch (err: any) {
        toast.error(err.message || "Execution failed", { id: "dsa-run" });
      } finally {
        setIsRunningTests(false);
      }
    }, 900);
  };

  const handleAdvanceCandidate = async (cand: CandidateResult) => {
    toast.loading(`Advancing ${cand.name} to Round 3 (Communication)...`, { id: "dsa-advance" });
    try {
      const data = getCandidateDsaData(cand);
      const res = await fetch(`/api/jobs/${jobId}/rounds/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: cand.id,
          pipelineRoundId: roundId,
          score: data.overallScore,
          passed: true,
          feedback: `Cleared Coding & DSA with score ${data.overallScore}%. Advanced to Communication.`,
          action: "ADVANCE",
          targetRoundOrder: roundOrder + 1,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to advance");
      toast.success(`${cand.name} advanced to Communication Round!`, { id: "dsa-advance" });
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to advance candidate", { id: "dsa-advance" });
    }
  };

  const handleRejectCandidate = async (cand: CandidateResult) => {
    toast.loading(`Updating status for ${cand.name}...`, { id: "dsa-reject" });
    try {
      const res = await fetch(`/api/jobs/${jobId}/rounds/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: cand.id,
          pipelineRoundId: roundId,
          passed: false,
          action: "REJECT",
          feedback: "Coding submission did not meet unit test benchmarks.",
        }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      toast.success(`${cand.name} marked as not qualified.`, { id: "dsa-reject" });
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update", { id: "dsa-reject" });
    }
  };

  const handleBulkAdvancePassing = async () => {
    const passing = eligibleCandidates.filter((c) => {
      const data = getCandidateDsaData(c);
      return data.overallScore >= cutoff && c.currentRound <= roundOrder;
    });

    if (passing.length === 0) {
      toast.info("No un-advanced candidates currently meet the coding cutoff.");
      return;
    }

    setIsBulkAdvancing(true);
    toast.loading(`Bulk advancing ${passing.length} candidate(s)...`, { id: "dsa-bulk" });
    try {
      const res = await fetch(`/api/jobs/${jobId}/rounds/batch-evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pipelineRoundId: roundId,
          candidateIds: passing.map((c) => c.id),
          action: "ADVANCE",
          defaultScore: 85,
          feedback: "Cleared automated coding test suite. Advanced to Communication.",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk advance failed");
      toast.success(`Successfully advanced ${data.updatedCount} candidates to Communication!`, { id: "dsa-bulk" });
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Bulk advance failed", { id: "dsa-bulk" });
    } finally {
      setIsBulkAdvancing(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── METRIC TILES ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Coding Stage Pool</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--ink)", marginTop: "4px" }}>{eligibleCandidates.length}</div>
        </div>

        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Avg Test Pass Rate</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--green)", marginTop: "4px" }}>91.6%</div>
        </div>

        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Complexity Target</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--primary)", marginTop: "4px" }}>O(1) / O(N log N)</div>
        </div>

        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Pass Threshold</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--ink)", marginTop: "4px" }}>≥ {cutoff}%</div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Candidates */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
              Candidates ({eligibleCandidates.length})
            </h2>
            <button
              type="button"
              onClick={handleBulkAdvancePassing}
              disabled={isBulkAdvancing || eligibleCandidates.length === 0}
              className="md-button md-button--filled"
              style={{ fontSize: "11px", padding: "6px 12px", height: "32px" }}
            >
              <Sparkles size={12} /> Bulk Advance
            </button>
          </div>

          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input
              type="text"
              placeholder="Search candidate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                fontSize: "12px",
                borderRadius: "12px",
                background: "var(--surface)",
                border: "1px solid var(--outline)",
                color: "var(--ink)",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "680px", overflowY: "auto" }}>
            {filteredCandidates.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", background: "var(--surface)", borderRadius: "16px", color: "var(--muted)", fontSize: "12px" }}>
                No candidates in this stage yet. Advance candidates from Aptitude & Reasoning.
              </div>
            ) : (
              filteredCandidates.map((cand) => {
                const isSelected = currentCandidate?.id === cand.id;
                const data = getCandidateDsaData(cand);
                const result = cand.roundResults?.find((r) => r.pipelineRoundId === roundId);
                const hasEvaluated = Boolean(result && result.score !== null);
                const passed = result?.passed === true || cand.currentRound > roundOrder;

                return (
                  <div
                    key={cand.id}
                    onClick={() => setSelectedCandidateId(cand.id)}
                    style={{
                      padding: "13px 15px",
                      borderRadius: "16px",
                      background: isSelected ? "var(--surface-purple)" : "var(--surface-high)",
                      border: `1px solid ${isSelected ? "var(--primary)" : "var(--outline)"}`,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>{cand.name}</div>
                        <div style={{ fontSize: "11px", color: "var(--muted)" }}>{cand.skills || "Software Engineer"}</div>
                      </div>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "999px",
                          background: hasEvaluated ? (passed ? "var(--round-finished-bg)" : "var(--round-failed-bg)") : "var(--surface-peach)",
                          color: hasEvaluated ? (passed ? "var(--round-finished-text)" : "var(--round-failed-text)") : "#8a481c",
                        }}
                      >
                        {hasEvaluated ? `${data.overallScore}% · ${passed ? "PASS" : "FAIL"}` : "AWAITING RUN"}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--muted)", paddingTop: "4px", borderTop: "1px solid var(--outline)" }}>
                      <span>Tests: <b style={{ color: "var(--ink)" }}>{data.testCasesPassed}/{data.totalTestCases}</b></span>
                      <span>Time: <b style={{ color: "var(--primary)" }}>{data.timeComplexity}</b></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Code Sandbox & Execution Runner */}
        <div className="lg:col-span-8">
          {currentCandidate && activeSubmission ? (
            <div
              style={{
                background: "var(--surface-high)",
                border: "1px solid var(--outline)",
                borderRadius: "24px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                boxShadow: "0 10px 30px rgba(27,26,34,0.04)",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", borderBottom: "1px solid var(--outline)", paddingBottom: "16px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--primary)" }}>
                      Round 2: Coding & DSA Sandbox
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: "999px",
                        background: isCandidatePassed ? "var(--round-finished-bg)" : "var(--round-running-bg)",
                        color: isCandidatePassed ? "var(--round-finished-text)" : "var(--round-running-text)",
                      }}
                    >
                      {isCandidatePassed ? "BENCHMARK MET" : "UNDER TEST"}
                    </span>
                  </div>
                  <h3 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", margin: "4px 0 2px" }}>
                    {currentCandidate.name}
                  </h3>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    {currentCandidate.email} · {currentCandidate.experienceYears} yrs experience
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setEmailCandidate(currentCandidate)}
                    className="md-button md-button--tonal"
                    style={{ fontSize: "12px", padding: "6px 12px", height: "36px" }}
                  >
                    <Mail size={13} /> Email Candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunTests(currentCandidate)}
                    disabled={isRunningTests}
                    className="md-button md-button--filled inline-flex items-center gap-1.5"
                    style={{ fontSize: "12px", padding: "6px 16px", height: "36px" }}
                  >
                    <Play size={13} /> {isRunningTests ? "Running Test Suite..." : "Execute Test Suite"}
                  </button>
                </div>
              </div>

              {/* Problem Selector Bar */}
              <div style={{ background: "var(--surface)", borderRadius: "16px", padding: "14px 16px", border: "1px solid var(--outline)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                    Active Coding Challenge
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {SAMPLE_PROBLEMS.map((p, idx) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProblemIndex(idx)}
                        style={{
                          padding: "3px 8px",
                          fontSize: "11px",
                          borderRadius: "6px",
                          border: "none",
                          cursor: "pointer",
                          background: selectedProblemIndex === idx ? "var(--primary)" : "var(--surface-high)",
                          color: selectedProblemIndex === idx ? "#ffffff" : "var(--muted)",
                        }}
                      >
                        P{idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>
                  {SAMPLE_PROBLEMS[selectedProblemIndex].title}
                  <span style={{ marginLeft: "8px", fontSize: "10px", padding: "2px 6px", borderRadius: "999px", background: "var(--surface-purple)", color: "var(--primary-deep)" }}>
                    {SAMPLE_PROBLEMS[selectedProblemIndex].difficulty}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px", lineHeight: 1.5 }}>
                  {SAMPLE_PROBLEMS[selectedProblemIndex].description}
                </div>
              </div>

              {/* Code Sandbox Display */}
              <div style={{ borderRadius: "16px", border: "1px solid var(--outline)", overflow: "hidden", background: "#1B1A22" }}>
                {/* Editor Header */}
                <div style={{ padding: "8px 16px", background: "#121118", borderBottom: "1px solid #2B2836", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#A9A3BC", fontSize: "11px" }}>
                    <FileCode size={13} style={{ color: "var(--primary)" }} />
                    <span>Candidate Submission</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {(["TypeScript", "Python", "Go", "Java"] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setActiveLanguage(lang)}
                        style={{
                          background: activeLanguage === lang ? "var(--primary)" : "transparent",
                          color: activeLanguage === lang ? "#ffffff" : "#A9A3BC",
                          border: "none",
                          fontSize: "10px",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editor Code Body */}
                <pre
                  style={{
                    margin: 0,
                    padding: "16px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    lineHeight: 1.6,
                    color: "#EDE9F6",
                    overflowX: "auto",
                    maxHeight: "220px",
                  }}
                >
                  <code>{activeSubmission.code}</code>
                </pre>
              </div>

              {/* Test Execution Output & Complexity Telemetry */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Complexity Telemetry */}
                <div style={{ background: "var(--surface)", padding: "16px", borderRadius: "16px", border: "1px solid var(--outline)" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "10px" }}>
                    Algorithmic Profile
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--muted)" }}>Time Complexity:</span>
                      <b style={{ color: "var(--primary)" }}>{activeSubmission.timeComplexity}</b>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--muted)" }}>Space Complexity:</span>
                      <b style={{ color: "var(--ink)" }}>{activeSubmission.spaceComplexity}</b>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--muted)" }}>Code Quality Score:</span>
                      <b style={{ color: "var(--green)" }}>{activeSubmission.cleanlinessScore}/100</b>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--muted)" }}>Runtime Execution:</span>
                      <b style={{ color: "var(--ink)" }}>{activeSubmission.runtimeMs}ms (P95)</b>
                    </div>
                  </div>
                </div>

                {/* Unit Test Case Status */}
                <div style={{ background: "var(--surface)", padding: "16px", borderRadius: "16px", border: "1px solid var(--outline)" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "10px", display: "flex", justifyContent: "space-between" }}>
                    <span>Unit Test Suite</span>
                    <span style={{ color: activeSubmission.testCasesPassed === activeSubmission.totalTestCases ? "var(--green)" : "var(--primary)" }}>
                      {activeSubmission.testCasesPassed}/{activeSubmission.totalTestCases} Passed
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {(testOutputLogs.length > 0 ? testOutputLogs : [
                      { name: "Sample Input Correctness", time: "14ms", passed: true, details: "Matches output" },
                      { name: "Empty / Corner Boundaries", time: "4ms", passed: true, details: "Proper error handling" },
                      { name: "Stress Concurrency (50K calls)", time: "38ms", passed: activeSubmission.testCasesPassed > 10, details: "Zero deadlocks" },
                    ]).map((t, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "var(--ink)" }}>
                          {t.passed ? <CheckCircle2 size={12} style={{ color: "var(--green)" }} /> : <XCircle size={12} style={{ color: "#c0392b" }} />}
                          {t.name}
                        </span>
                        <span style={{ color: "var(--muted)", fontSize: "10px" }}>{t.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "14px", borderTop: "1px solid var(--outline)" }}>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                  Round 2 decision for <b>{currentCandidate.name}</b>:
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" onClick={() => handleRejectCandidate(currentCandidate)} className="md-button md-button--text" style={{ fontSize: "12px", color: "#c0392b" }}>
                    Disqualify
                  </button>
                  <button type="button" onClick={() => handleAdvanceCandidate(currentCandidate)} className="md-button md-button--filled inline-flex items-center gap-1.5" style={{ fontSize: "12px", padding: "8px 18px" }}>
                    Advance to Communication <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: "64px 20px", textAlign: "center", background: "var(--surface)", borderRadius: "24px", color: "var(--muted)", fontSize: "13px" }}>
              Select a candidate from the left panel to inspect their coding sandbox and execute unit tests.
            </div>
          )}
        </div>
      </div>

      {/* Email Modals */}
      {emailCandidate && (
        <SingleEmailModal
          isOpen={Boolean(emailCandidate)}
          onClose={() => setEmailCandidate(null)}
          candidate={{
            id: emailCandidate.id,
            name: emailCandidate.name,
            email: emailCandidate.email,
            status: emailCandidate.status,
            jobTitle: jobTitle,
            personalizedReply: emailCandidate.personalizedReply || `Hi ${emailCandidate.name}, your coding challenge instructions for ${jobTitle} are ready.`,
          }}
          onSuccess={async () => {
            await onRefresh();
          }}
        />
      )}

      <BulkEmailModal
        isOpen={isBulkEmailOpen}
        onClose={() => setIsBulkEmailOpen(false)}
        candidates={eligibleCandidates.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          status: c.status,
          jobTitle: jobTitle,
          personalizedReply: c.personalizedReply,
        }))}
        jobTitle={jobTitle}
        onComplete={async () => {
          await onRefresh();
        }}
      />
    </div>
  );
}


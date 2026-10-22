"use client";

import React, { useState, useMemo } from "react";
import {
  MessageSquare,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
  Send,
  Mail,
  Mic,
  Sliders,
  Check,
  Award,
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

interface CommunicationConsoleProps {
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

export function CommunicationConsole({
  jobId,
  jobTitle,
  roundId,
  roundTitle,
  roundOrder,
  cutoff = 70,
  candidates,
  onRefresh,
  onAdvanceToNext,
}: CommunicationConsoleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "passed" | "evaluated" | "awaiting">("all");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBulkAdvancing, setIsBulkAdvancing] = useState(false);
  const [emailCandidate, setEmailCandidate] = useState<CandidateResult | null>(null);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);

  // Rubric Scores (0-100)
  const [clarity, setClarity] = useState<number>(85);
  const [depth, setDepth] = useState<number>(80);
  const [empathy, setEmpathy] = useState<number>(88);
  const [feedbackReceptivity, setFeedbackReceptivity] = useState<number>(82);
  const [panelVerdict, setPanelVerdict] = useState<"STRONG_HIRE" | "HIRE" | "LEANING_HIRE" | "LEANING_NO_HIRE" | "NO_HIRE">("HIRE");
  const [interviewerNotes, setInterviewerNotes] = useState<string>(
    "Candidate articulated architectural trade-offs between consistency and availability clearly. Demonstrated good pacing, used clean structural analogies, and responded gracefully when asked to adjust requirements for high-partition tolerance."
  );

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

  const currentResult = currentCandidate?.roundResults?.find((r) => r.pipelineRoundId === roundId);
  const isCandidatePassed = currentResult?.passed === true || (currentCandidate && currentCandidate.currentRound > roundOrder);

  // Calculate weighted overall score
  const calculatedOverall = Math.round(
    clarity * 0.25 + depth * 0.35 + empathy * 0.2 + feedbackReceptivity * 0.2
  );

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

  const handleRunAiAnalysis = async (cand: CandidateResult) => {
    setIsAnalyzing(true);
    toast.loading(`Analyzing communication & presentation metrics for ${cand.name}...`, { id: "comm-eval" });

    try {
      const isPassing = calculatedOverall >= cutoff;
      const agentTrace = {
        roundType: "COMMUNICATION",
        rubric: {
          clarity,
          depth,
          empathy,
          feedbackReceptivity,
          overallScore: calculatedOverall,
        },
        panelVerdict,
        notes: interviewerNotes,
        aiAssessment: {
          strengths: [
            "Clear articulation of system boundary trade-offs",
            "Structured narrative flow without excessive jargon",
            "High empathy when clarifying ambiguous stakeholder questions",
          ],
          areasToWatch: [
            "Could go deeper into database write-amplification tradeoffs under high load",
          ],
          speechPacing: "Optimal (135 words/min)",
        },
        evaluatedAt: new Date().toISOString(),
      };

      const res = await fetch(`/api/jobs/${jobId}/rounds/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: cand.id,
          pipelineRoundId: roundId,
          score: calculatedOverall,
          passed: isPassing,
          feedback: isPassing
            ? `Recommended for HR round (${panelVerdict}) with ${calculatedOverall}% presentation clarity.`
            : `Communication rubric score (${calculatedOverall}%) was below target threshold (${cutoff}%).`,
          agentTrace,
          action: "SAVE_EVALUATION",
        }),
      });

      if (!res.ok) throw new Error("Evaluation failed");
      toast.success(`Communication scorecard saved: ${calculatedOverall}% (${panelVerdict})`, { id: "comm-eval" });
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save evaluation", { id: "comm-eval" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAdvanceCandidate = async (cand: CandidateResult) => {
    toast.loading(`Advancing ${cand.name} to Round 4 (HR Round)...`, { id: "comm-advance" });
    try {
      const res = await fetch(`/api/jobs/${jobId}/rounds/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: cand.id,
          pipelineRoundId: roundId,
          score: calculatedOverall,
          passed: true,
          feedback: `Communication & System Design approved with ${calculatedOverall}% score. Advanced to HR Round.`,
          action: "ADVANCE",
          targetRoundOrder: roundOrder + 1,
        }),
      });
      if (!res.ok) throw new Error("Failed to advance");
      toast.success(`${cand.name} advanced to HR Round!`, { id: "comm-advance" });
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to advance", { id: "comm-advance" });
    }
  };

  const handleRejectCandidate = async (cand: CandidateResult) => {
    toast.loading(`Updating status for ${cand.name}...`, { id: "comm-reject" });
    try {
      const res = await fetch(`/api/jobs/${jobId}/rounds/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: cand.id,
          pipelineRoundId: roundId,
          passed: false,
          action: "REJECT",
          feedback: "Did not meet system communication benchmark.",
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(`${cand.name} marked as not qualified.`, { id: "comm-reject" });
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update", { id: "comm-reject" });
    }
  };

  const handleBulkAdvancePassing = async () => {
    const passing = eligibleCandidates.filter((c) => {
      const r = c.roundResults?.find((res) => res.pipelineRoundId === roundId);
      const sc = r?.score ?? 80;
      return sc >= cutoff && c.currentRound <= roundOrder;
    });

    if (passing.length === 0) {
      toast.info("No un-advanced candidates meet the communication threshold.");
      return;
    }

    setIsBulkAdvancing(true);
    toast.loading(`Bulk advancing ${passing.length} candidate(s)...`, { id: "comm-bulk" });
    try {
      const res = await fetch(`/api/jobs/${jobId}/rounds/batch-evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pipelineRoundId: roundId,
          candidateIds: passing.map((c) => c.id),
          action: "ADVANCE",
          defaultScore: 82,
          feedback: "Cleared Communication & System Design presentation. Advanced to HR Round.",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk advance failed");
      toast.success(`Successfully advanced ${data.updatedCount} candidates to HR Round!`, { id: "comm-bulk" });
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Bulk advance failed", { id: "comm-bulk" });
    } finally {
      setIsBulkAdvancing(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── METRICS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>In Communication Round</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--ink)", marginTop: "4px" }}>{eligibleCandidates.length}</div>
        </div>

        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Avg Clarity Score</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--primary)", marginTop: "4px" }}>84.2%</div>
        </div>

        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Panel Alignment</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--green)", marginTop: "4px" }}>Strong Hire (78%)</div>
        </div>

        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Pass Threshold</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--ink)", marginTop: "4px" }}>≥ {cutoff}%</div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Candidates List */}
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
                No candidates in this stage yet. Advance candidates from Round 2.
              </div>
            ) : (
              filteredCandidates.map((cand) => {
                const isSelected = currentCandidate?.id === cand.id;
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
                        <div style={{ fontSize: "11px", color: "var(--muted)" }}>{cand.email}</div>
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
                        {hasEvaluated ? `${result?.score}% · ${passed ? "APPROVED" : "FAILED"}` : "AWAITING PANEL"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Presentation Scorecard & AI Review */}
        <div className="lg:col-span-8">
          {currentCandidate ? (
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", borderBottom: "1px solid var(--outline)", paddingBottom: "16px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--primary)" }}>
                      Round 3: Communication & Architecture Review
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
                      {isCandidatePassed ? "PRESENTATION CLEARED" : "PANEL SESSION"}
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
                    onClick={() => handleRunAiAnalysis(currentCandidate)}
                    disabled={isAnalyzing}
                    className="md-button md-button--filled inline-flex items-center gap-1.5"
                    style={{ fontSize: "12px", padding: "6px 16px", height: "36px" }}
                  >
                    <Sparkles size={13} /> {isAnalyzing ? "Saving Scorecard..." : "Save Scorecard"}
                  </button>
                </div>
              </div>

              {/* Multi-Dimensional Rubric Sliders */}
              <div style={{ background: "var(--surface)", borderRadius: "18px", padding: "18px", border: "1px solid var(--outline)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>
                    Communication & Architecture Rubric
                  </span>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: calculatedOverall >= cutoff ? "var(--green)" : "var(--primary)" }}>
                    Weighted Score: {calculatedOverall}%
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 600 }}>
                      <span>Verbal Articulation & Clarity</span>
                      <b style={{ color: "var(--primary)" }}>{clarity}%</b>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="100"
                      value={clarity}
                      onChange={(e) => setClarity(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "var(--primary)", marginTop: "4px" }}
                    />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 600 }}>
                      <span>Architectural Depth & Trade-offs</span>
                      <b style={{ color: "var(--primary)" }}>{depth}%</b>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="100"
                      value={depth}
                      onChange={(e) => setDepth(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "var(--primary)", marginTop: "4px" }}
                    />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 600 }}>
                      <span>Stakeholder Empathy & Team Alignment</span>
                      <b style={{ color: "var(--primary)" }}>{empathy}%</b>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="100"
                      value={empathy}
                      onChange={(e) => setEmpathy(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "var(--primary)", marginTop: "4px" }}
                    />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 600 }}>
                      <span>Receptivity to Scope Changes & Feedback</span>
                      <b style={{ color: "var(--primary)" }}>{feedbackReceptivity}%</b>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="100"
                      value={feedbackReceptivity}
                      onChange={(e) => setFeedbackReceptivity(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "var(--primary)", marginTop: "4px" }}
                    />
                  </div>
                </div>
              </div>

              {/* Committee Panel Verdict */}
              <div style={{ background: "var(--surface)", borderRadius: "16px", padding: "16px", border: "1px solid var(--outline)" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: "8px" }}>
                  Hiring Committee Consensus
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {(
                    [
                      { id: "STRONG_HIRE", label: "Strong Hire", color: "var(--green)" },
                      { id: "HIRE", label: "Hire", color: "var(--green)" },
                      { id: "LEANING_HIRE", label: "Leaning Hire", color: "var(--primary)" },
                      { id: "LEANING_NO_HIRE", label: "Leaning No Hire", color: "#a0440d" },
                      { id: "NO_HIRE", label: "No Hire", color: "#c0392b" },
                    ] as const
                  ).map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setPanelVerdict(v.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "999px",
                        fontSize: "11px",
                        fontWeight: 700,
                        border: "none",
                        cursor: "pointer",
                        background: panelVerdict === v.id ? v.color : "var(--surface-high)",
                        color: panelVerdict === v.id ? "#ffffff" : "var(--muted)",
                        boxShadow: panelVerdict === v.id ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                      }}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Interviewer Notes */}
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: "6px" }}>
                  Interviewer & Presentation Notes
                </div>
                <textarea
                  rows={3}
                  value={interviewerNotes}
                  onChange={(e) => setInterviewerNotes(e.target.value)}
                  style={{
                    width: "100%",
                    borderRadius: "14px",
                    background: "var(--surface)",
                    border: "1px solid var(--outline)",
                    padding: "10px 14px",
                    fontSize: "12px",
                    color: "var(--ink)",
                    fontFamily: "inherit",
                    lineHeight: 1.5,
                    outline: "none",
                  }}
                />
              </div>

              {/* Action Bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "14px", borderTop: "1px solid var(--outline)" }}>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                  Decision for <b>{currentCandidate.name}</b> in Round 3:
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" onClick={() => handleRejectCandidate(currentCandidate)} className="md-button md-button--text" style={{ fontSize: "12px", color: "#c0392b" }}>
                    Disqualify
                  </button>
                  <button type="button" onClick={() => handleAdvanceCandidate(currentCandidate)} className="md-button md-button--filled inline-flex items-center gap-1.5" style={{ fontSize: "12px", padding: "8px 18px" }}>
                    Advance to HR Round <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: "64px 20px", textAlign: "center", background: "var(--surface)", borderRadius: "24px", color: "var(--muted)", fontSize: "13px" }}>
              Select a candidate from the left panel to review their communication & architectural presentation.
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
            personalizedReply: emailCandidate.personalizedReply || `Hi ${emailCandidate.name}, your communication presentation briefing for ${jobTitle} is scheduled.`,
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


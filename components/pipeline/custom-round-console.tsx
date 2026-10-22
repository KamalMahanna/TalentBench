"use client";

import React, { useState, useMemo } from "react";
import {
  Settings,
  CheckCircle2,
  XCircle,
  Search,
  Sparkles,
  ArrowRight,
  Mail,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { SingleEmailModal } from "@/components/email/single-email-modal";

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

interface CustomRoundConsoleProps {
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

export function CustomRoundConsole({
  jobId,
  jobTitle,
  roundId,
  roundTitle,
  roundOrder,
  cutoff = 70,
  candidates,
  onRefresh,
}: CustomRoundConsoleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [score, setScore] = useState(85);
  const [feedback, setFeedback] = useState("Custom round evaluation completed successfully.");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [emailCandidate, setEmailCandidate] = useState<CandidateResult | null>(null);

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

  const handleSaveAndAdvance = async (cand: CandidateResult) => {
    setIsEvaluating(true);
    toast.loading(`Advancing ${cand.name}...`, { id: "cust-advance" });
    try {
      const res = await fetch(`/api/jobs/${jobId}/rounds/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: cand.id,
          pipelineRoundId: roundId,
          score,
          passed: score >= cutoff,
          feedback,
          action: "ADVANCE",
          targetRoundOrder: roundOrder + 1,
        }),
      });
      if (!res.ok) throw new Error("Evaluation sync failed");
      toast.success(`${cand.name} updated & advanced!`, { id: "cust-advance" });
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to advance", { id: "cust-advance" });
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Stage Pool</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--ink)", marginTop: "4px" }}>{eligibleCandidates.length}</div>
        </div>
        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Stage Type</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--primary)", marginTop: "4px" }}>Custom Evaluation</div>
        </div>
        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Pass Cutoff</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--green)", marginTop: "4px" }}>≥ {cutoff}%</div>
        </div>
        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Evaluator Mode</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--ink)", marginTop: "4px" }}>Flexible Rubric</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 flex flex-col gap-3">
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
            Candidates ({eligibleCandidates.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "680px", overflowY: "auto" }}>
            {eligibleCandidates.map((cand) => {
              const isSelected = currentCandidate?.id === cand.id;
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
                  }}
                >
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>{cand.name}</div>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>{cand.email}</div>
                </div>
              );
            })}
          </div>
        </div>

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
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--outline)", paddingBottom: "16px" }}>
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", margin: 0 }}>{currentCandidate.name}</h3>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>{roundTitle}</div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" onClick={() => setEmailCandidate(currentCandidate)} className="md-button md-button--tonal" style={{ fontSize: "12px", padding: "6px 12px" }}>
                    <Mail size={13} /> Email
                  </button>
                  <button type="button" onClick={() => handleSaveAndAdvance(currentCandidate)} disabled={isEvaluating} className="md-button md-button--filled" style={{ fontSize: "12px", padding: "6px 16px" }}>
                    <Sparkles size={13} /> Save & Advance
                  </button>
                </div>
              </div>

              <div style={{ background: "var(--surface)", borderRadius: "18px", padding: "18px", border: "1px solid var(--outline)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600 }}>Score Evaluation</span>
                  <b style={{ color: "var(--primary)" }}>{score}%</b>
                </div>
                <input type="range" min="0" max="100" value={score} onChange={(e) => setScore(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--primary)" }} />

                <div style={{ marginTop: "14px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                    Evaluation Notes / Rubric Feedback
                  </label>
                  <textarea
                    rows={3}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    style={{ width: "100%", borderRadius: "12px", background: "var(--surface-high)", border: "1px solid var(--outline)", padding: "10px", fontSize: "12px", color: "var(--ink)" }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: "64px 20px", textAlign: "center", background: "var(--surface)", borderRadius: "24px", color: "var(--muted)", fontSize: "13px" }}>
              Select a candidate to review.
            </div>
          )}
        </div>
      </div>

      {emailCandidate && (
        <SingleEmailModal
          isOpen={Boolean(emailCandidate)}
          onClose={() => setEmailCandidate(null)}
          candidate={{
            id: emailCandidate.id,
            name: emailCandidate.name,
            email: emailCandidate.email,
            status: emailCandidate.status,
            jobTitle,
            personalizedReply: emailCandidate.personalizedReply,
          }}
          onSuccess={async () => {
            await onRefresh();
          }}
        />
      )}
    </div>
  );
}


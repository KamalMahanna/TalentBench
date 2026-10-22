"use client";

import React, { useState, useMemo } from "react";
import {
  Terminal,
  Cpu,
  Layers,
  CheckCircle2,
  XCircle,
  Search,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Mail,
  Shield,
  Server,
  Database,
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

interface TechnicalConsoleProps {
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

export function TechnicalConsole({
  jobId,
  jobTitle,
  roundId,
  roundTitle,
  roundOrder,
  cutoff = 70,
  candidates,
  onRefresh,
  onAdvanceToNext,
}: TechnicalConsoleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [emailCandidate, setEmailCandidate] = useState<CandidateResult | null>(null);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);

  // Competency Ratings
  const [concurrency, setConcurrency] = useState(85);
  const [databaseDesign, setDatabaseDesign] = useState(80);
  const [apiResilience, setApiResilience] = useState(90);
  const [securityAuth, setSecurityAuth] = useState(85);
  const [notes, setNotes] = useState(
    "Demonstrated profound understanding of distributed transactions, idempotent API design, and connection pool tuning."
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
  const overallScore = Math.round((concurrency + databaseDesign + apiResilience + securityAuth) / 4);

  const handleSaveEvaluation = async (cand: CandidateResult) => {
    setIsEvaluating(true);
    toast.loading(`Saving technical evaluation for ${cand.name}...`, { id: "tech-eval" });
    try {
      const isPassing = overallScore >= cutoff;
      const res = await fetch(`/api/jobs/${jobId}/rounds/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: cand.id,
          pipelineRoundId: roundId,
          score: overallScore,
          passed: isPassing,
          feedback: `Technical competence score: ${overallScore}%. ${notes}`,
          action: "SAVE_EVALUATION",
        }),
      });
      if (!res.ok) throw new Error("Evaluation sync failed");
      toast.success(`Technical evaluation saved: ${overallScore}%`, { id: "tech-eval" });
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save evaluation", { id: "tech-eval" });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleAdvance = async (cand: CandidateResult) => {
    toast.loading(`Advancing ${cand.name}...`, { id: "tech-advance" });
    try {
      const res = await fetch(`/api/jobs/${jobId}/rounds/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: cand.id,
          pipelineRoundId: roundId,
          score: overallScore,
          passed: true,
          action: "ADVANCE",
          targetRoundOrder: roundOrder + 1,
        }),
      });
      if (!res.ok) throw new Error("Failed to advance");
      toast.success(`${cand.name} advanced to next stage!`, { id: "tech-advance" });
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to advance", { id: "tech-advance" });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Pool in Technical</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--ink)", marginTop: "4px" }}>{eligibleCandidates.length}</div>
        </div>
        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Avg Competency</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--primary)", marginTop: "4px" }}>85%</div>
        </div>
        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Architecture Depth</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--green)", marginTop: "4px" }}>Senior Grade</div>
        </div>
        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Cutoff</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--ink)", marginTop: "4px" }}>≥ {cutoff}%</div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Candidates */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
            Candidates ({eligibleCandidates.length})
          </h2>
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
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>{cand.skills || "Technical Specialist"}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Technical Scorecard */}
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
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>Technical Deep-Dive Evaluation</div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" onClick={() => setEmailCandidate(currentCandidate)} className="md-button md-button--tonal" style={{ fontSize: "12px", padding: "6px 12px" }}>
                    <Mail size={13} /> Email
                  </button>
                  <button type="button" onClick={() => handleSaveEvaluation(currentCandidate)} disabled={isEvaluating} className="md-button md-button--filled" style={{ fontSize: "12px", padding: "6px 16px" }}>
                    <Sparkles size={13} /> Save Scorecard
                  </button>
                </div>
              </div>

              {/* Rubric */}
              <div style={{ background: "var(--surface)", borderRadius: "18px", padding: "18px", border: "1px solid var(--outline)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>Core Engineering Competencies</span>
                  <b style={{ color: "var(--primary)" }}>Score: {overallScore}%</b>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <span>Concurrency & Distributed Systems</span>
                      <b>{concurrency}%</b>
                    </div>
                    <input type="range" min="30" max="100" value={concurrency} onChange={(e) => setConcurrency(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--primary)" }} />
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <span>Database Indexing & Query Tuning</span>
                      <b>{databaseDesign}%</b>
                    </div>
                    <input type="range" min="30" max="100" value={databaseDesign} onChange={(e) => setDatabaseDesign(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--primary)" }} />
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <span>API Resilience & Fault Tolerance</span>
                      <b>{apiResilience}%</b>
                    </div>
                    <input type="range" min="30" max="100" value={apiResilience} onChange={(e) => setApiResilience(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--primary)" }} />
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <span>Security, Auth & Threat Modeling</span>
                      <b>{securityAuth}%</b>
                    </div>
                    <input type="range" min="30" max="100" value={securityAuth} onChange={(e) => setSecurityAuth(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--primary)" }} />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: "6px" }}>Technical Notes</div>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: "100%", borderRadius: "14px", background: "var(--surface)", border: "1px solid var(--outline)", padding: "10px 14px", fontSize: "12px", color: "var(--ink)", outline: "none" }}
                />
              </div>

              {/* Action Bar */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "14px", borderTop: "1px solid var(--outline)" }}>
                <button type="button" onClick={() => handleAdvance(currentCandidate)} className="md-button md-button--filled inline-flex items-center gap-1.5" style={{ fontSize: "12px", padding: "8px 18px" }}>
                  Advance Candidate <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: "64px 20px", textAlign: "center", background: "var(--surface)", borderRadius: "24px", color: "var(--muted)", fontSize: "13px" }}>
              Select a candidate to review technical competency.
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


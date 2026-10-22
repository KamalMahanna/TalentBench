"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  HeartHandshake,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Send,
  Mail,
  DollarSign,
  Calendar,
  Check,
  Award,
  Briefcase,
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

interface HrRoundConsoleProps {
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

export function HrRoundConsole({
  jobId,
  jobTitle,
  roundId,
  roundTitle,
  roundOrder,
  cutoff = 75,
  candidates,
  onRefresh,
  onAdvanceToNext,
}: HrRoundConsoleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "hired" | "evaluated" | "awaiting">("all");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [isHiring, setIsHiring] = useState(false);
  const [isBulkHiring, setIsBulkHiring] = useState(false);
  const [emailCandidate, setEmailCandidate] = useState<CandidateResult | null>(null);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);

  // Compensation & Logistics States
  const [expectedCtc, setExpectedCtc] = useState<string>("$165,000 / yr");
  const [offeredCtc, setOfferedCtc] = useState<string>("$170,000 / yr");
  const [equityGrant, setEquityGrant] = useState<string>("0.15% (4-yr vest)");
  const [signOnBonus, setSignOnBonus] = useState<string>("$15,000");
  const [noticePeriod, setNoticePeriod] = useState<string>("30 Days");
  const [cultureScore, setCultureScore] = useState<number>(90);
  const [hrNotes, setHrNotes] = useState<string>(
    "Outstanding culture alignment. Demonstrates high agency, transparent communication, and genuine curiosity about our engineering challenges. Compensation expectations fit comfortably within the approved band."
  );

  const eligibleCandidates = useMemo(() => {
    return candidates.filter(
      (c) => (c.currentRound ?? 0) >= roundOrder || c.status === "HIRED" || c.roundResults?.some((r) => r.pipelineRoundId === roundId)
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
  const isCandidateHired = currentCandidate?.status === "HIRED";

  const filteredCandidates = useMemo(() => {
    return eligibleCandidates.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const result = c.roundResults?.find((r) => r.pipelineRoundId === roundId);
      const hasEvaluated = Boolean(result && result.score !== null);
      const isHired = c.status === "HIRED";

      if (filterTab === "hired") return isHired;
      if (filterTab === "evaluated") return hasEvaluated;
      if (filterTab === "awaiting") return !hasEvaluated && !isHired;
      return true;
    });
  }, [eligibleCandidates, searchQuery, filterTab, roundId]);

  const handleExtendOfferAndHire = async (cand: CandidateResult) => {
    setIsHiring(true);
    toast.loading(`Extending offer & marking ${cand.name} as HIRED...`, { id: "hr-hire" });

    try {
      const agentTrace = {
        roundType: "HR_ROUND",
        compensation: {
          expectedCtc,
          offeredCtc,
          equityGrant,
          signOnBonus,
          noticePeriod,
        },
        cultureScore,
        notes: hrNotes,
        offerExtendedAt: new Date().toISOString(),
      };

      const offerLetterNote = `Congratulations ${cand.name}! Official offer extended for ${jobTitle} at ${offeredCtc} with ${equityGrant} equity grant.`;

      const res = await fetch(`/api/jobs/${jobId}/rounds/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: cand.id,
          pipelineRoundId: roundId,
          score: cultureScore,
          passed: true,
          feedback: `Official Offer Extended: ${offeredCtc} (${equityGrant} equity). Candidate status updated to HIRED.`,
          personalizedReply: offerLetterNote,
          agentTrace,
          action: "HIRE",
        }),
      });

      if (!res.ok) throw new Error("Failed to finalize hire");

      toast.success(`🎉 ${cand.name} is now HIRED! Official offer registered.`, { id: "hr-hire" });
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to extend offer", { id: "hr-hire" });
    } finally {
      setIsHiring(false);
    }
  };

  const handleRejectCandidate = async (cand: CandidateResult) => {
    toast.loading(`Updating status for ${cand.name}...`, { id: "hr-reject" });
    try {
      const res = await fetch(`/api/jobs/${jobId}/rounds/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: cand.id,
          pipelineRoundId: roundId,
          passed: false,
          action: "REJECT",
          feedback: "Culture or compensation alignment did not match current hiring criteria.",
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(`${cand.name} marked as not selected.`, { id: "hr-reject" });
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update", { id: "hr-reject" });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── METRICS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Finalists in HR</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--ink)", marginTop: "4px" }}>{eligibleCandidates.length}</div>
        </div>

        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Offers Extended / Hired</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--green)", marginTop: "4px" }}>
            {eligibleCandidates.filter((c) => c.status === "HIRED").length}
          </div>
        </div>

        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Avg Culture Fit</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--primary)", marginTop: "4px" }}>91%</div>
        </div>

        <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "20px", padding: "18px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Budget Compliance</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--ink)", marginTop: "4px" }}>100% In-Band</div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Candidates */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
            Finalists ({eligibleCandidates.length})
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
            {filteredCandidates.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", background: "var(--surface)", borderRadius: "16px", color: "var(--muted)", fontSize: "12px" }}>
                No finalists in HR stage yet.
              </div>
            ) : (
              filteredCandidates.map((cand) => {
                const isSelected = currentCandidate?.id === cand.id;
                const isHired = cand.status === "HIRED";

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
                          background: isHired ? "var(--round-finished-bg)" : "var(--surface-peach)",
                          color: isHired ? "var(--round-finished-text)" : "#8a481c",
                        }}
                      >
                        {isHired ? "HIRED 🎉" : "OFFER PENDING"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: HR & Offer Composer */}
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
                      Round 4: HR & Executive Culture Fit
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: "999px",
                        background: isCandidateHired ? "var(--round-finished-bg)" : "var(--round-running-bg)",
                        color: isCandidateHired ? "var(--round-finished-text)" : "var(--round-running-text)",
                      }}
                    >
                      {isCandidateHired ? "OFFER ACCEPTED & HIRED" : "FINAL OFFER REVIEW"}
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
                    <Mail size={13} /> Draft Offer Email
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExtendOfferAndHire(currentCandidate)}
                    disabled={isHiring || isCandidateHired}
                    className="md-button md-button--filled inline-flex items-center gap-1.5"
                    style={{ fontSize: "12px", padding: "6px 16px", height: "36px" }}
                  >
                    <Award size={13} /> {isCandidateHired ? "Candidate Hired" : "Extend Offer & Mark Hired"}
                  </button>
                </div>
              </div>

              {/* Offer Package Composer */}
              <div style={{ background: "var(--surface)", borderRadius: "18px", padding: "18px", border: "1px solid var(--outline)" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: "12px" }}>
                  Executive Offer Package Builder
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Base CTC
                    </label>
                    <input
                      type="text"
                      value={offeredCtc}
                      onChange={(e) => setOfferedCtc(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", fontSize: "12px", borderRadius: "10px", background: "var(--surface-high)", border: "1px solid var(--outline)", color: "var(--ink)" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Equity / Units
                    </label>
                    <input
                      type="text"
                      value={equityGrant}
                      onChange={(e) => setEquityGrant(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", fontSize: "12px", borderRadius: "10px", background: "var(--surface-high)", border: "1px solid var(--outline)", color: "var(--ink)" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Sign-on Bonus
                    </label>
                    <input
                      type="text"
                      value={signOnBonus}
                      onChange={(e) => setSignOnBonus(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", fontSize: "12px", borderRadius: "10px", background: "var(--surface-high)", border: "1px solid var(--outline)", color: "var(--ink)" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Notice Period
                    </label>
                    <input
                      type="text"
                      value={noticePeriod}
                      onChange={(e) => setNoticePeriod(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", fontSize: "12px", borderRadius: "10px", background: "var(--surface-high)", border: "1px solid var(--outline)", color: "var(--ink)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Culture Score & Recruiter Notes */}
              <div style={{ background: "var(--surface)", borderRadius: "18px", padding: "18px", border: "1px solid var(--outline)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>
                    Culture & Values Score
                  </span>
                  <b style={{ fontSize: "14px", color: "var(--green)" }}>{cultureScore}%</b>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={cultureScore}
                  onChange={(e) => setCultureScore(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--primary)", marginBottom: "14px" }}
                />

                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: "6px" }}>
                  HR Committee & Offer Notes
                </div>
                <textarea
                  rows={3}
                  value={hrNotes}
                  onChange={(e) => setHrNotes(e.target.value)}
                  style={{
                    width: "100%",
                    borderRadius: "14px",
                    background: "var(--surface-high)",
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
                  Final decision for <b>{currentCandidate.name}</b>:
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" onClick={() => handleRejectCandidate(currentCandidate)} className="md-button md-button--text" style={{ fontSize: "12px", color: "#c0392b" }}>
                    Decline Candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExtendOfferAndHire(currentCandidate)}
                    disabled={isCandidateHired}
                    className="md-button md-button--filled inline-flex items-center gap-1.5"
                    style={{ fontSize: "12px", padding: "8px 18px" }}
                  >
                    <CheckCircle2 size={13} /> {isCandidateHired ? "Offer Accepted" : "Mark as HIRED"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: "64px 20px", textAlign: "center", background: "var(--surface)", borderRadius: "24px", color: "var(--muted)", fontSize: "13px" }}>
              Select a finalist from the left panel to review compensation and compose their offer package.
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
            personalizedReply: emailCandidate.personalizedReply || `Dear ${emailCandidate.name}, we are delighted to extend you an offer for ${jobTitle} at TalentBench!`,
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


"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Brain,
  FileText,
  MessageSquare,
  Copy,
  GitBranch,
  ShieldCheck,
  AlertTriangle,
  Info,
  Calendar,
  Phone,
  Mail,
  Briefcase,
  SlidersHorizontal,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/context/theme-context";
import { EmailStatusBadge } from "@/components/email/email-status-badge";
import { SingleEmailModal } from "@/components/email/single-email-modal";

interface AgentTraceStep {
  stepName: string;
  category: string;
  timestamp: string;
  status: "PASSED" | "FAILED" | "WARNING" | "INFO";
  reasoning: string;
  metric?: string;
}

interface PipelineRound {
  id: string;
  type: string;
  title: string;
  description: string | null;
  order: number;
}

interface RoundResult {
  id: string;
  pipelineRoundId: string;
  score: number | null;
  passed: boolean | null;
  agentTrace: string | null;
  feedback: string | null;
  createdAt: string;
  pipelineRound?: PipelineRound;
}

interface CandidateDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  experienceYears: number;
  resumeText: string | null;
  skills: string | null;
  status: string;
  currentRound: number;
  personalizedReply: string | null;
  emailStatus?: string | null;
  emailSentAt?: string | null;
  emailError?: string | null;
  jobProfile: {
    id: string;
    title: string;
    description: string;
    minExperience: number;
    maxExperience: number;
    pipeline: PipelineRound[];
  };
  roundResults: RoundResult[];
}

export default function CandidateDossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { theme } = useTheme();

  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"trace" | "pipeline" | "resume" | "reply">("trace");
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Recruiter Human-in-the-Loop Override Dialog
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<"SHORTLISTED" | "REJECTED">("SHORTLISTED");
  const [overrideScore, setOverrideScore] = useState<number>(85);
  const [overrideReason, setOverrideReason] = useState("");
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const fetchCandidate = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/candidates/${id}`);
      const data = await res.json();
      if (data.candidate) {
        setCandidate(data.candidate);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load candidate profile.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidate();
  }, [id]);

  const handleRunScreening = async () => {
    try {
      setScreeningLoading(true);
      toast.loading("Autonomous AI Agent evaluating candidate against pipeline...", { id: "screen-load" });
      const res = await fetch("/api/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Screening failed", { id: "screen-load" });
        setScreeningLoading(false);
        return;
      }
      toast.success(
        `AI Evaluation complete! Status: ${data.screening?.status || "Evaluated"} (${data.screening?.score || 0}%)`,
        { id: "screen-load" }
      );
      setScreeningLoading(false);
      fetchCandidate();
    } catch (err) {
      toast.error("Network error executing AI screener.", { id: "screen-load" });
      setScreeningLoading(false);
    }
  };

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate) return;

    try {
      setSubmittingOverride(true);
      const primaryResultId = candidate.roundResults[0]?.id;
      const res = await fetch(`/api/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: overrideStatus,
          score: overrideScore,
          overrideReason: overrideReason.trim(),
          roundResultId: primaryResultId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to commit override.");
        setSubmittingOverride(false);
        return;
      }

      toast.success("Human override successfully recorded to audit log.");
      setShowOverrideModal(false);
      setSubmittingOverride(false);
      fetchCandidate();
    } catch (err) {
      toast.error("Network error applying override.");
      setSubmittingOverride(false);
    }
  };

  const copyReplyToClipboard = () => {
    if (candidate?.personalizedReply) {
      navigator.clipboard.writeText(candidate.personalizedReply);
      toast.success("Draft response copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ height: "32px", width: "160px", borderRadius: "12px", background: "var(--surface)", opacity: 0.6 }} />
        <div style={{ height: "240px", borderRadius: "24px", background: "var(--surface)", opacity: 0.6 }} />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div style={{ padding: "64px", textAlign: "center", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)" }}>Candidate Not Found</h2>
        <Link href="/dashboard/candidates" className="md-button md-button--tonal">
          Back to Candidate Pool
        </Link>
      </div>
    );
  }

  const primaryResult = candidate.roundResults?.[0];
  let traceSteps: AgentTraceStep[] = [];
  if (primaryResult?.agentTrace) {
    try {
      traceSteps = JSON.parse(primaryResult.agentTrace);
    } catch {}
  }

  const initials = candidate.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", maxWidth: "1080px", margin: "0 auto" }}>
      {/* Back Link */}
      <Link
        href="/dashboard/candidates"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "13px",
          color: "var(--muted)",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        <ArrowLeft size={16} />
        Back to Candidate Pool
      </Link>

      {/* Candidate Profile Header Card */}
      <div
        style={{
          background: "var(--surface-high)",
          border: "1px solid var(--outline)",
          borderRadius: "28px",
          padding: "32px",
          boxShadow: "0 14px 30px rgba(53, 42, 70, 0.08)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            {/* Identity & Details */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "20px",
                  background: "var(--surface-purple)",
                  color: "var(--primary-deep)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--ink)", margin: 0, letterSpacing: "-0.03em" }}>
                    {candidate.name}
                  </h1>

                  <Badge
                    variant={
                      candidate.status === "SHORTLISTED"
                        ? "success"
                        : candidate.status === "REJECTED"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {candidate.status === "SHORTLISTED" && (
                      <CheckCircle size={13} style={{ marginRight: "4px" }} />
                    )}
                    {candidate.status === "REJECTED" && (
                      <XCircle size={13} style={{ marginRight: "4px" }} />
                    )}
                    {candidate.status === "PENDING" && (
                      <Clock size={13} style={{ marginRight: "4px" }} />
                    )}
                    {candidate.status}
                  </Badge>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "16px",
                    fontSize: "13px",
                    color: "var(--muted)",
                    marginTop: "8px",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Mail size={14} />
                    {candidate.email}
                  </span>
                  {candidate.phone && (
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Phone size={14} />
                      {candidate.phone}
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Calendar size={14} />
                    {candidate.experienceYears} Years Verified
                  </span>
                </div>

                {candidate.jobProfile && (
                  <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: "999px",
                        background: "var(--surface-purple)",
                        color: "var(--primary-deep)",
                      }}
                    >
                      <Briefcase size={12} />
                      {candidate.jobProfile.title}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      Tier: {candidate.jobProfile.minExperience}–{candidate.jobProfile.maxExperience} yrs
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
              <EmailStatusBadge
                status={candidate.emailStatus}
                sentAt={candidate.emailSentAt}
                error={candidate.emailError}
                onRetry={() => setShowEmailModal(true)}
              />

              <button
                type="button"
                onClick={() => setShowEmailModal(true)}
                className="md-button md-button--filled inline-flex items-center gap-1.5"
                style={{ fontSize: "12px", padding: "8px 16px" }}
              >
                <Send size={14} />
                Send Email
              </button>

              <button
                type="button"
                onClick={() => setShowOverrideModal(true)}
                className="md-button md-button--tonal"
                style={{ fontSize: "12px", padding: "8px 16px" }}
              >
                <SlidersHorizontal size={14} />
                Human Override
              </button>

              <Link
                href={`/dashboard/candidates/${candidate.id}/report`}
                className="md-button md-button--tonal"
                style={{ fontSize: "12px", padding: "8px 16px" }}
              >
                <FileText size={14} />
                Benchmark Report
              </Link>

              <button
                type="button"
                onClick={handleRunScreening}
                disabled={screeningLoading}
                className="md-button md-button--tonal"
                style={{ fontSize: "12px", padding: "8px 18px" }}
              >
                <Sparkles size={14} className={screeningLoading ? "animate-spin" : ""} />
                {screeningLoading ? "Screening..." : "Re-evaluate with AI"}
              </button>
            </div>
          </div>

          {/* Skills Strip */}
          {candidate.skills && (
            <div
              style={{
                borderTop: "1px solid var(--outline)",
                paddingTop: "16px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)" }}>Extracted Stack:</span>
              {candidate.skills.split(",").map((s, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    padding: "3px 10px",
                    borderRadius: "999px",
                    background: "var(--surface)",
                    color: "var(--ink)",
                    border: "1px solid var(--outline)",
                  }}
                >
                  {s.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "var(--surface)",
          borderRadius: "16px",
          padding: "4px",
          border: "1px solid var(--outline)",
        }}
      >
        {[
          { id: "trace", label: "Autonomous AI Trace", icon: Brain },
          { id: "pipeline", label: "Evaluation Pipeline", icon: GitBranch },
          { id: "resume", label: "Resume & Evidence", icon: FileText },
          { id: "reply", label: "Candidate Feedback Draft", icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "12px",
                border: "none",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.15s",
                background: isActive ? "var(--surface-high)" : "transparent",
                color: isActive ? "var(--ink)" : "var(--muted)",
                boxShadow: isActive ? "0 2px 6px rgba(0,0,0,0.05)" : "none",
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Autonomous AI Trace */}
      {activeTab === "trace" && (
        <div
          style={{
            background: "var(--surface-high)",
            border: "1px solid var(--outline)",
            borderRadius: "24px",
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                Deterministic Agent Reasoning Engine
              </h3>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
                Full step-by-step trace generated during autonomous evaluation.
              </p>
            </div>

            {primaryResult?.score !== null && primaryResult?.score !== undefined && (
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "var(--muted)" }}>
                  Composite Score
                </span>
                <span style={{ display: "block", fontSize: "28px", fontWeight: 700, color: "var(--primary)", lineHeight: 1 }}>
                  {Math.round(primaryResult.score)}%
                </span>
              </div>
            )}
          </div>

          {traceSteps.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", fontSize: "13px", color: "var(--muted)", background: "var(--surface)", borderRadius: "16px" }}>
              No trace generated yet. Run AI Screening to populate step-by-step reasoning.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {traceSteps.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    background: "var(--surface)",
                    border: "1px solid var(--outline)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {step.status === "PASSED" ? (
                        <CheckCircle size={18} style={{ color: "var(--green)" }} />
                      ) : step.status === "FAILED" ? (
                        <XCircle size={18} style={{ color: "#c0392b" }} />
                      ) : step.status === "WARNING" ? (
                        <AlertTriangle size={18} style={{ color: "#a0440d" }} />
                      ) : (
                        <Info size={18} style={{ color: "#1a6098" }} />
                      )}

                      <div>
                        <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>
                          Step {idx + 1} · {step.category}
                        </span>
                        <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", margin: "2px 0 0" }}>
                          {step.stepName}
                        </h4>
                      </div>
                    </div>

                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                      {new Date(step.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>

                  <p style={{ fontSize: "13px", color: "var(--ink)", margin: 0, lineHeight: 1.5 }}>
                    {step.reasoning}
                  </p>

                  {step.metric && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingTop: "6px", borderTop: "1px solid var(--outline)" }}>
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>Metric Signal:</span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: "var(--surface-purple)",
                          color: "var(--primary-deep)",
                        }}
                      >
                        {step.metric}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Evaluation Pipeline */}
      {activeTab === "pipeline" && (
        <div
          style={{
            background: "var(--surface-high)",
            border: "1px solid var(--outline)",
            borderRadius: "24px",
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div>
            <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--ink)", margin: 0 }}>
              Multi-Round Recruitment Timeline
            </h3>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
              Candidate status across all connector rounds configured for {candidate.jobProfile?.title}.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {candidate.jobProfile?.pipeline?.map((round, idx) => {
              const result = candidate.roundResults?.find((r) => r.pipelineRoundId === round.id);

              return (
                <div
                  key={round.id}
                  style={{
                    padding: "16px 20px",
                    borderRadius: "16px",
                    background: "var(--surface)",
                    border: "1px solid var(--outline)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "10px",
                        background: "var(--surface-purple)",
                        color: "var(--primary-deep)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {idx + 1}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                          {round.title}
                        </h4>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "999px",
                            background: "var(--surface-blue)",
                            color: "#1a6098",
                            textTransform: "uppercase",
                          }}
                        >
                          {round.type}
                        </span>
                      </div>
                      {round.description && (
                        <p style={{ fontSize: "12px", color: "var(--muted)", margin: "2px 0 0" }}>
                          {round.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    {result ? (
                      <div>
                        <Badge variant={result.passed ? "success" : "destructive"}>
                          {result.passed ? "Cleared" : "Failed"}
                        </Badge>
                        {result.score !== null && (
                          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", marginTop: "4px" }}>
                            Score: {Math.round(result.score)}%
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: "12px", color: "var(--muted)" }}>Pending Round</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Resume & Evidence */}
      {activeTab === "resume" && (
        <div
          style={{
            background: "var(--surface-high)",
            border: "1px solid var(--outline)",
            borderRadius: "24px",
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                Resume Artifact &amp; Extracted Text
              </h3>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
                Parsed text used for autonomous screening evaluation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (candidate.resumeText) {
                  navigator.clipboard.writeText(candidate.resumeText);
                  toast.success("Resume text copied to clipboard!");
                }
              }}
              className="md-button md-button--tonal"
              style={{ fontSize: "12px", padding: "6px 14px" }}
            >
              <Copy size={13} /> Copy Text
            </button>
          </div>

          <div
            style={{
              padding: "20px",
              borderRadius: "16px",
              background: "var(--surface)",
              border: "1px solid var(--outline)",
              fontSize: "13px",
              color: "var(--ink)",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              maxHeight: "480px",
              overflowY: "auto",
            }}
          >
            {candidate.resumeText || "No resume artifact extracted."}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Candidate Feedback Draft */}
      {activeTab === "reply" && (
        <div
          style={{
            background: "var(--surface-high)",
            border: "1px solid var(--outline)",
            borderRadius: "24px",
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                Personalized Communication Draft
              </h3>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
                AI-generated feedback tailored to the candidate's exact background and evaluation outcome.
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
              <EmailStatusBadge
                status={candidate.emailStatus}
                sentAt={candidate.emailSentAt}
                error={candidate.emailError}
                onRetry={() => setShowEmailModal(true)}
              />
              <button
                type="button"
                onClick={copyReplyToClipboard}
                className="md-button md-button--tonal"
                style={{ fontSize: "12px", padding: "6px 14px" }}
              >
                <Copy size={13} /> Copy Draft
              </button>
              <button
                type="button"
                onClick={() => setShowEmailModal(true)}
                className="md-button md-button--filled"
                style={{ fontSize: "12px", padding: "6px 16px" }}
              >
                <Send size={13} /> Send Candidate Email
              </button>
            </div>
          </div>

          <div
            style={{
              padding: "20px",
              borderRadius: "16px",
              background: "var(--surface-blue)",
              border: "1px solid var(--outline)",
              fontSize: "13px",
              color: "var(--ink)",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              fontStyle: "italic",
            }}
          >
            {candidate.personalizedReply ||
              "No personalized response generated yet. Run AI Screening to synthesize custom feedback."}
          </div>
        </div>
      )}

      {/* RECRUITER HUMAN OVERRIDE MODAL */}
      {showOverrideModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "480px",
              background: "var(--surface-high)",
              border: "1px solid var(--outline)",
              borderRadius: "24px",
              padding: "28px",
              boxShadow: "0 22px 55px rgba(60,48,83,0.18)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldCheck size={20} style={{ color: "var(--primary)" }} />
                <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                  Human-in-the-Loop Override
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--muted)" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
              Manually overturn or calibrate an automated AI recommendation. All overrides are logged into the compliance audit trace.
            </p>

            <form onSubmit={handleApplyOverride} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                  Calibrated Decision
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setOverrideStatus("SHORTLISTED")}
                    style={{
                      padding: "10px",
                      borderRadius: "12px",
                      border: `1px solid ${overrideStatus === "SHORTLISTED" ? "var(--green)" : "var(--outline)"}`,
                      background: overrideStatus === "SHORTLISTED" ? "#d5f0e0" : "var(--surface)",
                      color: overrideStatus === "SHORTLISTED" ? "var(--green)" : "var(--muted)",
                      fontWeight: 600,
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    Shortlist Candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideStatus("REJECTED")}
                    style={{
                      padding: "10px",
                      borderRadius: "12px",
                      border: `1px solid ${overrideStatus === "REJECTED" ? "#c0392b" : "var(--outline)"}`,
                      background: overrideStatus === "REJECTED" ? "#fde8e8" : "var(--surface)",
                      color: overrideStatus === "REJECTED" ? "#c0392b" : "var(--muted)",
                      fontWeight: 600,
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    Reject Candidate
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                  Adjusted Score (0–100%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(Number(e.target.value))}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: "10px",
                    background: "var(--surface)",
                    border: "1px solid var(--outline)",
                    padding: "9px 12px",
                    fontSize: "13px",
                    color: "var(--ink)",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                  Audit Reason &amp; Recruiter Justification *
                </label>
                <textarea
                  required
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Explain why this candidate was manually recalibrated..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: "10px",
                    background: "var(--surface)",
                    border: "1px solid var(--outline)",
                    padding: "9px 12px",
                    fontSize: "13px",
                    color: "var(--ink)",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "8px", borderTop: "1px solid var(--outline)" }}>
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="md-button md-button--text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOverride}
                  className="md-button md-button--filled"
                >
                  {submittingOverride ? "Saving..." : "Commit Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Candidate Email Modal */}
      {candidate && (
        <SingleEmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          candidate={{
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            status: candidate.status,
            jobTitle: candidate.jobProfile?.title,
            personalizedReply: candidate.personalizedReply,
          }}
          onSuccess={async () => {
            await fetchCandidate();
          }}
        />
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState, use } from "react";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Trash2,
  Cpu,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  GitBranch,
  Users,
  FileText,
  Brain,
  Code,
  Upload,
  Sparkles,
  Mail,
  Send,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PipelineCanvas, PipelineStageItem } from "@/components/pipeline/pipeline-canvas";
import { ResumeScreeningConsole } from "@/components/pipeline/resume-screening-console";
import { EmailStatusBadge } from "@/components/email/email-status-badge";
import { SingleEmailModal } from "@/components/email/single-email-modal";
import { BulkEmailModal } from "@/components/email/bulk-email-modal";

interface PipelineRound {
  id: string;
  type: string;
  title: string;
  description: string | null;
  order: number;
  config: string | null;
}

interface RoundResult {
  id: string;
  pipelineRoundId: string;
  score: number | null;
  passed: boolean | null;
  agentTrace: string | null;
  feedback: string | null;
  createdAt: string;
}

interface Candidate {
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
  isOverridden?: boolean;
  overrideReason?: string | null;
  emailStatus?: string | null;
  emailSentAt?: string | null;
  emailError?: string | null;
  roundResults: RoundResult[];
}

interface JobDetail {
  id: string;
  title: string;
  description: string;
  minExperience: number;
  maxExperience: number;
  pipeline: PipelineRound[];
  candidates: Candidate[];
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: "10px",
  background: "var(--surface)",
  border: "1px solid var(--outline)",
  padding: "9px 12px",
  fontSize: "13px",
  color: "var(--ink)",
  fontFamily: "DM Sans, system-ui, sans-serif",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  color: "var(--muted)",
  marginBottom: "5px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

export default function JobWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pipeline" | "screening" | "candidates">("pipeline");

  const [showAddRoundModal, setShowAddRoundModal] = useState(false);
  const [newRoundType, setNewRoundType] = useState("DSA");
  const [newRoundTitle, setNewRoundTitle] = useState("");

  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [candName, setCandName] = useState("");
  const [candEmail, setCandEmail] = useState("");
  const [candExp, setCandExp] = useState<number>(5);
  const [candSkills, setCandSkills] = useState("");
  const [candResume, setCandResume] = useState("");

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [emailCandidate, setEmailCandidate] = useState<Candidate | null>(null);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);

  const fetchJob = async () => {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      const data = await res.json();
      if (data.job) {
        setJob(data.job);
        if (data.job.candidates?.length > 0 && !selectedCandidate) {
          setSelectedCandidate(data.job.candidates[0]);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => { fetchJob(); }, [id]);

  const handleSyncPipeline = async (newStages: PipelineStageItem[]) => {
    if (!job) return;
    const newStageIds = new Set(newStages.map((s) => s.id).filter(Boolean));
    const deletedStages = job.pipeline.filter((p) => !newStageIds.has(p.id));
    for (const d of deletedStages) {
      try { await fetch(`/api/jobs/${id}/pipeline?roundId=${d.id}`, { method: "DELETE" }); } catch {}
    }
    for (const s of newStages) {
      if (!s.id) {
        try {
          await fetch(`/api/jobs/${id}/pipeline`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: s.type, title: s.title, description: s.description || null, config: s.config || null }),
          });
        } catch {}
      }
    }
    const existingToUpdate = newStages.filter((s) => Boolean(s.id)).map((s, idx) => ({ id: s.id!, order: idx, title: s.title, type: s.type, description: s.description || null, config: s.config || null }));
    if (existingToUpdate.length > 0) {
      try {
        await fetch(`/api/jobs/${id}/pipeline`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rounds: existingToUpdate }),
        });
      } catch {}
    }
    toast.success("Pipeline configuration updated.");
    await fetchJob();
  };

  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoundTitle.trim()) { toast.error("Please enter a title for the round."); return; }
    try {
      const res = await fetch(`/api/jobs/${id}/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newRoundType, title: newRoundTitle.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to add round"); return; }
      toast.success(`Connector added: ${newRoundTitle}`);
      setShowAddRoundModal(false);
      setNewRoundTitle("");
      fetchJob();
    } catch { toast.error("Error adding round"); }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candName.trim() || !candEmail.trim()) { toast.error("Candidate name and email are required."); return; }
    try {
      const res = await fetch(`/api/jobs/${id}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: candName.trim(), email: candEmail.trim(), experienceYears: Number(candExp) || 0, skills: candSkills.trim(), resumeText: candResume.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to add candidate"); return; }
      toast.success(`Candidate ${candName} registered.`);
      setShowAddCandidateModal(false);
      setCandName(""); setCandEmail(""); setCandSkills(""); setCandResume("");
      fetchJob();
    } catch { toast.error("Error adding candidate"); }
  };

  const handleRunScreening = async (candidateId: string) => {
    setScreeningLoading(true);
    toast.loading("AI Agent evaluating resume...", { id: "screening-toast" });
    try {
      const res = await fetch("/api/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "AI screening failed.", { id: "screening-toast" }); setScreeningLoading(false); return; }
      toast.success(`Screening Complete: ${data.screening.status} (${data.screening.score}/100)`, { id: "screening-toast" });
      setScreeningLoading(false);
      await fetchJob();
      if (data.candidate) setSelectedCandidate(data.candidate);
    } catch { toast.error("Error communicating with AI agent.", { id: "screening-toast" }); setScreeningLoading(false); }
  };

  if (loading) {
    return <div style={{ padding: "64px", textAlign: "center", color: "var(--muted)" }}>Loading job workspace…</div>;
  }

  if (!job) {
    return (
      <div style={{ padding: "64px", textAlign: "center", color: "var(--muted)" }}>
        <p>Job profile not found.</p>
        <Link href="/dashboard/jobs" style={{ color: "var(--primary)", textDecoration: "none" }}>Return to jobs list</Link>
      </div>
    );
  }

  let parsedTrace: { stepName: string; status: string; reasoning: string; metric?: string }[] = [];
  const latestResult = selectedCandidate?.roundResults?.[0];
  if (latestResult?.agentTrace) {
    try { parsedTrace = JSON.parse(latestResult.agentTrace); } catch {}
  }

  const tabStyle = (active: boolean, color?: string): React.CSSProperties => ({
    padding: "8px 16px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: active ? 600 : 500,
    fontFamily: "DM Sans, system-ui, sans-serif",
    transition: "all 0.15s",
    background: active ? (color || "var(--surface-purple)") : "transparent",
    color: active ? (color ? "var(--on-primary)" : "var(--primary-deep)") : "var(--muted)",
  });

  const modalOverlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    background: "rgba(0,0,0,0.4)",
    backdropFilter: "blur(4px)",
  };

  const modalCard: React.CSSProperties = {
    width: "100%",
    maxWidth: "440px",
    background: "var(--surface-high)",
    border: "1px solid var(--outline)",
    borderRadius: "24px",
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "0 22px 55px rgba(60,48,83,0.15)",
  };

  const statusBadgeStyle = (status: string): React.CSSProperties => ({
    fontSize: "10px",
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: "999px",
    textTransform: "uppercase",
    background: status === "SHORTLISTED" ? "#d5f0e0" : status === "REJECTED" ? "#fde8e8" : "var(--surface-peach)",
    color: status === "SHORTLISTED" ? "var(--green)" : status === "REJECTED" ? "#c0392b" : "#a0440d",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <Link href="/dashboard/jobs" style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "var(--muted)", textDecoration: "none", marginBottom: "8px" }}>
            <ArrowLeft size={14} /> Back to Job Profiles
          </Link>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.04em", color: "var(--ink)", margin: 0 }}>{job.title}</h1>
            <Badge variant="default">
              {job.minExperience}–{job.maxExperience} yrs
            </Badge>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--surface)", borderRadius: "14px", padding: "4px" }}>
          <button onClick={() => setActiveTab("pipeline")} style={tabStyle(activeTab === "pipeline")}>
            Pipeline ({job.pipeline.length})
          </button>
          <button onClick={() => setActiveTab("screening")} style={tabStyle(activeTab === "screening", "var(--green)")}>
            <Upload size={13} style={{ display: "inline", marginRight: "4px" }} />
            Screening ({job.candidates.length})
          </button>
          <button onClick={() => setActiveTab("candidates")} style={tabStyle(activeTab === "candidates")}>
            AI Traces ({job.candidates.length})
          </button>
        </div>
      </div>

      {/* TAB 1: Pipeline Builder */}
      {activeTab === "pipeline" && (
        <PipelineCanvas
          stages={job.pipeline.map((p) => {
            let cutoff = 50;
            if (p.config) { try { const parsed = JSON.parse(p.config); if (parsed.cutoff) cutoff = Number(parsed.cutoff); } catch {} }
            return { id: p.id, type: p.type, title: p.title, description: p.description, order: p.order, cutoff, config: p.config };
          })}
          onChange={handleSyncPipeline}
          onExecuteStage={() => setActiveTab("screening")}
          isEditable={true}
        />
      )}

      {/* TAB 2: Resume Screening */}
      {activeTab === "screening" && (
        <ResumeScreeningConsole
          jobId={job.id}
          jobTitle={job.title}
          jobDescription={job.description}
          cutoff={(() => {
            const r = job.pipeline.find((r) => r.type === "RESUME_SCREENING") || job.pipeline[0];
            if (r?.config) { try { return JSON.parse(r.config).cutoff || 50; } catch {} }
            return 50;
          })()}
          candidates={job.candidates}
          onRefresh={fetchJob}
        />
      )}

      {/* TAB 3: AI Traces */}
      {activeTab === "candidates" && (
        <div style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: "24px", alignItems: "start" }}>
          {/* Left: Candidate list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                Candidates ({job.candidates.length})
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsBulkEmailOpen(true)}
                  disabled={job.candidates.length === 0}
                  className="md-button md-button--filled inline-flex items-center gap-1.5"
                  style={{ fontSize: "12px", padding: "6px 14px" }}
                >
                  <Send size={12} /> Email All
                </button>
                <button onClick={() => setShowAddCandidateModal(true)} className="md-button md-button--tonal" style={{ fontSize: "12px", padding: "6px 14px" }}>
                  + Register
                </button>
              </div>
            </div>

            {job.candidates.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", background: "var(--surface)", borderRadius: "16px", border: "1px dashed var(--outline)" }}>
                <p style={{ fontSize: "13px", color: "var(--muted)", margin: "0 0 12px" }}>No candidates yet.</p>
                <button onClick={() => setShowAddCandidateModal(true)} className="md-button md-button--tonal" style={{ fontSize: "12px" }}>Add Candidate</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {job.candidates.map((cand) => {
                  const isSelected = selectedCandidate?.id === cand.id;
                  return (
                    <div
                      key={cand.id}
                      onClick={() => setSelectedCandidate(cand)}
                      style={{
                        padding: "14px 16px",
                        borderRadius: "16px",
                        border: `1px solid ${isSelected ? "var(--primary)" : "var(--outline)"}`,
                        background: isSelected ? "var(--surface-purple)" : "var(--surface-high)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>{cand.name}</div>
                          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>{cand.email}</div>
                          <div style={{ fontSize: "11px", color: "var(--primary)", marginTop: "3px" }}>{cand.experienceYears} yrs exp</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                          <span style={statusBadgeStyle(cand.status)}>{cand.status}</span>
                          <EmailStatusBadge
                            status={cand.emailStatus}
                            sentAt={cand.emailSentAt}
                            error={cand.emailError}
                            onRetry={() => setEmailCandidate(cand)}
                            size="sm"
                          />
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEmailCandidate(cand);
                              }}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "var(--primary)", display: "flex", alignItems: "center", gap: "3px", fontFamily: "DM Sans, system-ui, sans-serif" }}
                            >
                              <Mail size={11} /> Email
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRunScreening(cand.id); }}
                              disabled={screeningLoading}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "var(--primary)", display: "flex", alignItems: "center", gap: "3px", fontFamily: "DM Sans, system-ui, sans-serif" }}
                            >
                              <Cpu size={11} />
                              {cand.roundResults?.length > 0 ? "Re-Screen" : "Run AI Screener"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: AI Trace panel */}
          <div>
            {selectedCandidate ? (
              <div style={{ background: "var(--surface-high)", border: "1px solid var(--outline)", borderRadius: "22px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Candidate header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", paddingBottom: "16px", borderBottom: "1px solid var(--outline)" }}>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>AI Screening Console</div>
                    <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--ink)", margin: "4px 0 2px", letterSpacing: "-0.03em" }}>{selectedCandidate.name}</h3>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {selectedCandidate.experienceYears} yrs · Target [{job.minExperience}–{job.maxExperience} yrs]
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <EmailStatusBadge
                      status={selectedCandidate.emailStatus}
                      sentAt={selectedCandidate.emailSentAt}
                      error={selectedCandidate.emailError}
                      onRetry={() => setEmailCandidate(selectedCandidate)}
                      size="sm"
                    />
                    <button
                      onClick={() => setEmailCandidate(selectedCandidate)}
                      className="md-button md-button--tonal inline-flex items-center gap-1.5"
                      style={{ fontSize: "12px", padding: "8px 14px" }}
                    >
                      <Mail size={13} /> Send Email
                    </button>
                    <button
                      onClick={() => handleRunScreening(selectedCandidate.id)}
                      disabled={screeningLoading}
                      className="md-button md-button--filled"
                      style={{ fontSize: "12px", padding: "8px 16px" }}
                    >
                      <Cpu size={13} /> {screeningLoading ? "Evaluating…" : "Trigger AI Screening"}
                    </button>
                  </div>
                </div>

                {/* Trace steps */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "999px", background: "var(--primary)", display: "inline-block" }} />
                    <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--primary)" }}>Live Agent Inference Steps</span>
                  </div>

                  {parsedTrace.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {parsedTrace.map((t, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: "12px 14px",
                            borderRadius: "14px",
                            background: "var(--surface)",
                            border: "1px solid var(--outline)",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "10px",
                          }}
                        >
                          {t.status === "PASSED" ? (
                            <CheckCircle size={15} style={{ color: "var(--green)", flexShrink: 0, marginTop: "1px" }} />
                          ) : t.status === "FAILED" ? (
                            <XCircle size={15} style={{ color: "#c0392b", flexShrink: 0, marginTop: "1px" }} />
                          ) : (
                            <Clock size={15} style={{ color: "#a0440d", flexShrink: 0, marginTop: "1px" }} />
                          )}
                          <div>
                            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                              {t.stepName}
                              {t.metric && (
                                <span style={{ fontSize: "10px", padding: "1px 7px", borderRadius: "999px", background: "var(--surface-purple)", color: "var(--primary-deep)", fontWeight: 500 }}>
                                  {t.metric}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "3px 0 0", lineHeight: 1.5 }}>{t.reasoning}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: "32px", textAlign: "center", background: "var(--surface)", borderRadius: "14px", fontSize: "13px", color: "var(--muted)" }}>
                      No screening run yet. Click &quot;Trigger AI Screening&quot; above to evaluate this candidate.
                    </div>
                  )}
                </div>

                {/* Personalized reply */}
                {selectedCandidate.personalizedReply && (
                  <div style={{ background: "var(--surface-blue)", borderRadius: "16px", padding: "16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#1a6098", marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <MessageSquare size={13} /> Generated Personalized Reply
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--ink)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-line", fontStyle: "italic" }}>
                      {selectedCandidate.personalizedReply}
                    </p>
                  </div>
                )}

                {/* Resume snippet */}
                {selectedCandidate.resumeText && (
                  <div style={{ borderTop: "1px solid var(--outline)", paddingTop: "16px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: "8px" }}>Parsed Resume</div>
                    <p style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.6, margin: 0, maxHeight: "120px", overflowY: "auto", background: "var(--surface)", borderRadius: "10px", padding: "10px 12px" }}>
                      {selectedCandidate.resumeText}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: "64px", textAlign: "center", color: "var(--muted)", fontSize: "13px", background: "var(--surface)", borderRadius: "22px" }}>
                Select a candidate to inspect their AI trace.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Add Connector Stage */}
      {showAddRoundModal && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--ink)", margin: 0 }}>Add Connector Stage</h3>
            <form onSubmit={handleAddRound} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>Stage Type</label>
                <select
                  value={newRoundType}
                  onChange={(e) => {
                    setNewRoundType(e.target.value);
                    const defaults: Record<string, string> = {
                      RESUME_SCREENING: "AI Resume Screening Round", APTITUDE: "Cognitive Aptitude Assessment",
                      DSA: "Data Structures & Algorithms Challenge", COMMUNICATION: "Architecture & Communication Interview",
                      HR_ROUND: "Executive HR & Culture Alignment", TECHNICAL: "Systems Engineering Review",
                      CULTURE_FIT: "Team Fit Round", CUSTOM: "Custom Evaluation Round",
                    };
                    setNewRoundTitle(defaults[e.target.value] || "Custom Round");
                  }}
                  style={inputStyle}
                >
                  <option value="DSA">DSA & Coding Round</option>
                  <option value="APTITUDE">Aptitude & Logic</option>
                  <option value="COMMUNICATION">Communication & Architecture</option>
                  <option value="HR_ROUND">Executive HR Round</option>
                  <option value="RESUME_SCREENING">AI Resume Screening</option>
                  <option value="TECHNICAL">Technical Deep Dive</option>
                  <option value="CULTURE_FIT">Culture Fit Round</option>
                  <option value="CUSTOM">Custom Stage</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Stage Name</label>
                <input type="text" required value={newRoundTitle} onChange={(e) => setNewRoundTitle(e.target.value)} placeholder="e.g. Distributed Systems DSA" style={inputStyle} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" onClick={() => setShowAddRoundModal(false)} className="md-button md-button--text">Cancel</button>
                <button type="submit" className="md-button md-button--filled">Attach Connector</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Register Candidate */}
      {showAddCandidateModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalCard, maxWidth: "520px" }}>
            <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--ink)", margin: 0 }}>Register Candidate</h3>
            <form onSubmit={handleAddCandidate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input type="text" required value={candName} onChange={(e) => setCandName(e.target.value)} placeholder="e.g. Rachel Sterling" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" required value={candEmail} onChange={(e) => setCandEmail(e.target.value)} placeholder="rachel@domain.com" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Years of Experience</label>
                  <input type="number" min={0} max={40} value={candExp} onChange={(e) => setCandExp(parseInt(e.target.value) || 0)} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Skills / Tech Stack</label>
                <input type="text" value={candSkills} onChange={(e) => setCandSkills(e.target.value)} placeholder="e.g. React, Node.js, PostgreSQL" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Resume Bio / Content</label>
                <textarea rows={3} value={candResume} onChange={(e) => setCandResume(e.target.value)} placeholder="Paste resume text for AI evaluation..." style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" onClick={() => setShowAddCandidateModal(false)} className="md-button md-button--text">Cancel</button>
                <button type="submit" className="md-button md-button--filled">Save Candidate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Email Modals */}
      {emailCandidate && (
        <SingleEmailModal
          isOpen={Boolean(emailCandidate)}
          onClose={() => setEmailCandidate(null)}
          candidate={{
            id: emailCandidate.id,
            name: emailCandidate.name,
            email: emailCandidate.email,
            status: emailCandidate.status,
            jobTitle: job.title,
            personalizedReply: emailCandidate.personalizedReply,
          }}
          onSuccess={async () => {
            await fetchJob();
          }}
        />
      )}

      <BulkEmailModal
        isOpen={isBulkEmailOpen}
        onClose={() => setIsBulkEmailOpen(false)}
        candidates={job.candidates.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          status: c.status,
          jobTitle: job.title,
          personalizedReply: c.personalizedReply,
        }))}
        jobTitle={job.title}
        onComplete={async () => {
          await fetchJob();
        }}
      />
    </div>
  );
}

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
  Code,
  Upload,
  Sparkles,
  Mail,
  Send,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  PipelineCanvas,
  PipelineStageItem,
  StageStatus,
  getSimplifiedRoundTitle,
} from "@/components/pipeline/pipeline-canvas";
import { RoundExecutionRouter } from "@/components/pipeline/round-execution-router";
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

function computeRoundStatus(
  round: { id: string; type: string; order: number; config?: string | null },
  orderIdx: number,
  candidates: Candidate[],
  screeningLoading: boolean
): StageStatus {
  // 1. Explicit override if present in config JSON
  if (round.config) {
    try {
      const parsed = JSON.parse(round.config);
      if (parsed.status && parsed.status !== "auto") {
        return parsed.status as StageStatus;
      }
    } catch {}
  }

  // 2. If screening is actively running and this is the active screening stage
  if (screeningLoading && (round.type === "RESUME_SCREENING" || orderIdx === 0)) {
    return "running";
  }

  if (!candidates || candidates.length === 0) {
    return "pending";
  }

  // 3. For RESUME_SCREENING (order 0)
  if (round.type === "RESUME_SCREENING" || orderIdx === 0) {
    const hasInReview = candidates.some((c) => c.status === "IN_REVIEW");
    if (hasInReview) return "running";

    const hasAdvanced = candidates.some(
      (c) => c.status === "SHORTLISTED" || c.status === "HIRED" || (c.currentRound && c.currentRound > 0)
    );
    if (hasAdvanced) return "finished";

    const allRejected = candidates.length > 0 && candidates.every((c) => c.status === "REJECTED");
    if (allRejected) return "failed";

    const anyEvaluated = candidates.some(
      (c) => c.status === "SHORTLISTED" || c.status === "REJECTED" || c.status === "HIRED" || (c.roundResults && c.roundResults.length > 0)
    );
    if (anyEvaluated) return "finished";

    return "pending";
  }

  // 4. For subsequent rounds (orderIdx > 0)
  // Check if any candidate has already progressed past this round
  const passedPast = candidates.some((c) => (c.currentRound ?? 0) > orderIdx);
  if (passedPast) {
    return "finished";
  }

  // Check candidates currently in this round
  const candidatesInThisRound = candidates.filter((c) => (c.currentRound ?? 0) === orderIdx);
  if (candidatesInThisRound.length === 0) {
    return "pending";
  }

  // If any candidate in this round is in review
  if (candidatesInThisRound.some((c) => c.status === "IN_REVIEW")) {
    return "running";
  }

  // Check round results specifically for this round
  const resultsForThisRound = candidates
    .flatMap((c) => c.roundResults || [])
    .filter((r) => r.pipelineRoundId === round.id);

  if (resultsForThisRound.length > 0) {
    const anyPassed = resultsForThisRound.some((r) => r.passed === true);
    const allFailed = resultsForThisRound.every((r) => r.passed === false);
    if (anyPassed) return "finished";
    if (allFailed) return "failed";
  }

  return "pending";
}

export default function JobWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pipeline" | "stage">("pipeline");
  const [selectedStage, setSelectedStage] = useState<PipelineStageItem | null>(null);

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
    toast.success("Hiring rounds updated.");
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
          {activeTab === "pipeline" ? (
            <Link
              href="/dashboard/jobs"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "12px",
                color: "var(--muted)",
                textDecoration: "none",
                marginBottom: "8px",
              }}
            >
              <ArrowLeft size={14} /> Back to Job Profiles
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setActiveTab("pipeline");
                setSelectedStage(null);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "12px",
                color: "var(--muted)",
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                marginBottom: "8px",
                fontFamily: "inherit",
              }}
              className="hover:text-[var(--primary)] transition-colors"
            >
              <ArrowLeft size={14} /> Back to Rounds
            </button>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.04em", color: "var(--ink)", margin: 0 }}>
              {activeTab === "pipeline"
                ? job.title
                : getSimplifiedRoundTitle(selectedStage || { type: "RESUME_SCREENING" })}
            </h1>
            <Badge variant={activeTab === "pipeline" ? "default" : "ice"}>
              {activeTab === "pipeline"
                ? `${job.minExperience}–${job.maxExperience} yrs`
                : `${job.candidates.length} Candidate${job.candidates.length === 1 ? "" : "s"}`}
            </Badge>
          </div>
        </div>

        {activeTab === "pipeline" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setIsBulkEmailOpen(true)}
              disabled={job.candidates.length === 0}
              className="md-button md-button--tonal inline-flex items-center gap-1.5"
              style={{ fontSize: "12px", padding: "8px 14px" }}
            >
              <Send size={13} /> Email Pool
            </button>
            <button
              type="button"
              onClick={() => setShowAddCandidateModal(true)}
              className="md-button md-button--filled inline-flex items-center gap-1.5"
              style={{ fontSize: "12px", padding: "8px 16px" }}
            >
              <Users size={13} /> + Register Candidate
            </button>
          </div>
        )}
      </div>

      {/* Main View: Pipeline Canvas by default */}
      {activeTab === "pipeline" && (
        <PipelineCanvas
          stages={job.pipeline.map((p, idx) => {
            let cutoff = 50;
            if (p.config) { try { const parsed = JSON.parse(p.config); if (parsed.cutoff) cutoff = Number(parsed.cutoff); } catch {} }
            const status = computeRoundStatus(p, idx, job.candidates, screeningLoading);
            return { id: p.id, type: p.type, title: p.title, description: p.description, order: p.order, cutoff, config: p.config, status };
          })}
          onChange={handleSyncPipeline}
          onExecuteStage={(stage) => {
            setSelectedStage(stage);
            setActiveTab("stage");
          }}
          candidateCount={job.candidates.length}
          isEditable={true}
        />
      )}

      {/* ── STAGE EXECUTION CONSOLE ── */}
      {activeTab === "stage" && (
        <RoundExecutionRouter
          jobId={job.id}
          jobTitle={job.title}
          jobDescription={job.description}
          minExperience={job.minExperience}
          maxExperience={job.maxExperience}
          stages={job.pipeline.map((p, idx) => {
            let cutoff = 50;
            if (p.config) {
              try {
                const parsed = JSON.parse(p.config);
                if (parsed.cutoff) cutoff = Number(parsed.cutoff);
              } catch {}
            }
            const status = computeRoundStatus(p, idx, job.candidates, screeningLoading);
            return {
              id: p.id,
              type: p.type,
              title: p.title,
              description: p.description,
              order: p.order,
              cutoff,
              config: p.config,
              status,
            };
          })}
          initialStageId={selectedStage?.id}
          candidates={job.candidates}
          onRefresh={fetchJob}
          onBackToCanvas={() => {
            setActiveTab("pipeline");
            setSelectedStage(null);
          }}
        />
      )}

      {/* MODAL: Add Connector Stage */}
      {showAddRoundModal && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--ink)", margin: 0 }}>Add Round</h3>
            <form onSubmit={handleAddRound} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>Round Type</label>
                <select
                  value={newRoundType}
                  onChange={(e) => {
                    setNewRoundType(e.target.value);
                    const defaults: Record<string, string> = {
                      RESUME_SCREENING: "Resume Shortlisting",
                      APTITUDE: "Aptitude & Reasoning",
                      DSA: "Coding & DSA",
                      COMMUNICATION: "Communication",
                      HR_ROUND: "HR round",
                      TECHNICAL: "Technical Round",
                      CULTURE_FIT: "Culture Fit",
                      CUSTOM: "Custom Round",
                    };
                    setNewRoundTitle(defaults[e.target.value] || "Custom Round");
                  }}
                  style={inputStyle}
                >
                  <option value="RESUME_SCREENING">Resume Shortlisting</option>
                  <option value="APTITUDE">Aptitude & Reasoning</option>
                  <option value="DSA">Coding & DSA</option>
                  <option value="COMMUNICATION">Communication</option>
                  <option value="HR_ROUND">HR round</option>
                  <option value="TECHNICAL">Technical Round</option>
                  <option value="CULTURE_FIT">Culture Fit</option>
                  <option value="CUSTOM">Custom Round</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Round Name</label>
                <input type="text" required value={newRoundTitle} onChange={(e) => setNewRoundTitle(e.target.value)} placeholder="e.g. Distributed Systems DSA" style={inputStyle} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" onClick={() => setShowAddRoundModal(false)} className="md-button md-button--text">Cancel</button>
                <button type="submit" className="md-button md-button--filled">Add Round</button>
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

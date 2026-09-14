"use client";

import React, { useEffect, useState, use } from "react";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Trash,
  ArrowUp,
  ArrowDown,
  Cpu,
  CheckCircle,
  XCircle,
  Clock,
  ChatCircleText,
  TreeStructure,
  UsersThree,
  FileText,
  Brain,
  Code,
  ChatTeardropDots,
} from "@phosphor-icons/react";
import Link from "next/link";
import { toast } from "sonner";

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

export default function JobWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pipeline" | "candidates">("pipeline");

  // Pipeline builder modal state
  const [showAddRoundModal, setShowAddRoundModal] = useState(false);
  const [newRoundType, setNewRoundType] = useState("DSA");
  const [newRoundTitle, setNewRoundTitle] = useState("");

  // Candidate add modal state
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [candName, setCandName] = useState("");
  const [candEmail, setCandEmail] = useState("");
  const [candExp, setCandExp] = useState<number>(5);
  const [candSkills, setCandSkills] = useState("");
  const [candResume, setCandResume] = useState("");

  // Active candidate for agent trace inspection
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [screeningLoading, setScreeningLoading] = useState(false);

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

  useEffect(() => {
    fetchJob();
  }, [id]);

  const getRoundIcon = (type: string) => {
    switch (type) {
      case "RESUME_SCREENING":
        return FileText;
      case "APTITUDE":
        return Brain;
      case "DSA":
        return Code;
      case "COMMUNICATION":
        return ChatTeardropDots;
      case "HR_ROUND":
      case "CULTURE_FIT":
        return UsersThree;
      default:
        return TreeStructure;
    }
  };

  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoundTitle.trim()) {
      toast.error("Please enter a title for the round.");
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${id}/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newRoundType,
          title: newRoundTitle.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add round");
        return;
      }

      toast.success(`Connector added: ${newRoundTitle}`);
      setShowAddRoundModal(false);
      setNewRoundTitle("");
      fetchJob();
    } catch (err) {
      toast.error("Error adding round");
    }
  };

  const moveRound = async (index: number, direction: "up" | "down") => {
    if (!job) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= job.pipeline.length) return;

    const newPipeline = [...job.pipeline];
    const temp = newPipeline[index];
    newPipeline[index] = newPipeline[targetIndex];
    newPipeline[targetIndex] = temp;

    const formatted = newPipeline.map((r, i) => ({ id: r.id, order: i }));

    try {
      const res = await fetch(`/api/jobs/${id}/pipeline`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rounds: formatted }),
      });

      if (res.ok) {
        setJob({ ...job, pipeline: newPipeline });
        toast.success("Pipeline reordered.");
      }
    } catch (err) {
      toast.error("Failed to reorder pipeline.");
    }
  };

  const handleDeleteRound = async (roundId: string) => {
    if (!job || job.pipeline.length <= 1) {
      toast.error("Pipeline must have at least one round.");
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${id}/pipeline?roundId=${roundId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Round removed from pipeline.");
        fetchJob();
      }
    } catch (err) {
      toast.error("Error deleting round");
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candName.trim() || !candEmail.trim()) {
      toast.error("Candidate name and email are required.");
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${id}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: candName.trim(),
          email: candEmail.trim(),
          experienceYears: Number(candExp) || 0,
          skills: candSkills.trim(),
          resumeText: candResume.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add candidate");
        return;
      }

      toast.success(`Candidate ${candName} registered.`);
      setShowAddCandidateModal(false);
      setCandName("");
      setCandEmail("");
      setCandSkills("");
      setCandResume("");
      fetchJob();
    } catch (err) {
      toast.error("Error adding candidate");
    }
  };

  const handleRunScreening = async (candidateId: string) => {
    setScreeningLoading(true);
    toast.loading("AI Agent parsing resume against requirements...", { id: "screening-toast" });

    try {
      const res = await fetch("/api/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "AI screening failed.", { id: "screening-toast" });
        setScreeningLoading(false);
        return;
      }

      toast.success(
        `Screening Complete: Verdict ${data.screening.status} (${data.screening.score}/100)`,
        { id: "screening-toast" }
      );

      setScreeningLoading(false);
      await fetchJob();
      if (data.candidate) {
        setSelectedCandidate(data.candidate);
      }
    } catch (err) {
      toast.error("Error communicating with AI agent.", { id: "screening-toast" });
      setScreeningLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-xs font-mono text-[#7C91B4]">
        Loading Job Workspace...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-16 text-center text-[#7C91B4]">
        <p>Job profile not found.</p>
        <Link href="/dashboard/jobs" className="text-[#8FB6E8] underline text-xs mt-2 block">
          Return to jobs list
        </Link>
      </div>
    );
  }

  let parsedTrace: any[] = [];
  const latestResult = selectedCandidate?.roundResults?.[0];
  if (latestResult?.agentTrace) {
    try {
      parsedTrace = JSON.parse(latestResult.agentTrace);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#7C91B4] hover:text-[#EAF1FB] transition-colors mb-2"
          >
            <ArrowLeft size={14} /> Back to Job Profiles
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              {job.title}
            </h1>
            <Badge variant="ice">
              Mandatory Experience: {job.minExperience} - {job.maxExperience} yrs
            </Badge>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-[#060B18]/70 border border-[#8FB6E8]/20 shrink-0">
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === "pipeline"
                ? "bg-[#8FB6E8]/20 text-white border border-[#8FB6E8]/40 shadow-[0_0_15px_rgba(143,182,232,0.2)]"
                : "text-[#7C91B4] hover:text-[#EAF1FB]"
            }`}
          >
            Pipeline Builder ({job.pipeline.length})
          </button>
          <button
            onClick={() => setActiveTab("candidates")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === "candidates"
                ? "bg-[#8FB6E8]/20 text-white border border-[#8FB6E8]/40 shadow-[0_0_15px_rgba(143,182,232,0.2)]"
                : "text-[#7C91B4] hover:text-[#EAF1FB]"
            }`}
          >
            Candidates &amp; AI Traces ({job.candidates.length})
          </button>
        </div>
      </div>

      {/* TAB 1: VISUAL CONNECTOR PIPELINE BUILDER */}
      {activeTab === "pipeline" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0D1633] border border-[#8FB6E8]/15 shadow-lg">
            <div>
              <h2 className="text-base font-display font-semibold text-white">
                Modular Connector Architecture
              </h2>
              <p className="text-xs text-[#7C91B4] mt-0.5">
                Add Aptitude, DSA, Communication, or HR rounds as many times as you like. Reorder stages or remove them freely.
              </p>
            </div>
            <GlassButton
              size="sm"
              variant="primary"
              onClick={() => {
                setNewRoundTitle("Coding & System Design DSA");
                setShowAddRoundModal(true);
              }}
            >
              + Add Connector Stage
            </GlassButton>
          </div>

          {/* Connected Pipeline Nodes Visualization */}
          <div className="space-y-4">
            {job.pipeline.map((round, idx) => {
              const Icon = getRoundIcon(round.type);
              const isLast = idx === job.pipeline.length - 1;

              return (
                <div key={round.id} className="relative">
                  {/* Connector Node Card */}
                  <div className="rounded-2xl p-5 bg-[#0D1633] border border-[#8FB6E8]/20 hover:border-[#8FB6E8]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-4">
                      {/* Step Indicator */}
                      <div className="w-9 h-9 rounded-xl bg-[#8FB6E8]/10 border border-[#8FB6E8]/30 text-[#8FB6E8] flex items-center justify-center font-mono text-xs font-bold shrink-0">
                        0{idx + 1}
                      </div>

                      <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#EAF1FB] shrink-0">
                        <Icon size={20} weight="duotone" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">{round.title}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#8FB6E8]/10 border border-[#8FB6E8]/25 text-[#8FB6E8] uppercase">
                            {round.type}
                          </span>
                        </div>
                        <p className="text-xs text-[#7C91B4] mt-0.5">
                          {round.description || "Active evaluation gate in recruitment pipeline."}
                        </p>
                      </div>
                    </div>

                    {/* Stage Controls: Move Up, Move Down, Delete */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => moveRound(idx, "up")}
                        disabled={idx === 0}
                        className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-[#7C91B4] hover:text-white disabled:opacity-30 transition-colors"
                        title="Move Round Earlier"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => moveRound(idx, "down")}
                        disabled={isLast}
                        className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-[#7C91B4] hover:text-white disabled:opacity-30 transition-colors"
                        title="Move Round Later"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteRound(round.id)}
                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors ml-1"
                        title="Remove Stage"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Visual SVG Connector Cable between stages */}
                  {!isLast && (
                    <div className="h-6 flex items-center justify-center my-1">
                      <div className="w-0.5 h-full bg-gradient-to-b from-[#8FB6E8]/40 via-[#60A5FA]/40 to-[#8FB6E8]/40" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CANDIDATES & AI AGENT TRACE VERIFICATION */}
      {activeTab === "candidates" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Candidates List (col-span-5) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-semibold text-white">
                Candidate Applications ({job.candidates.length})
              </h2>
              <GlassButton
                size="sm"
                variant="secondary"
                onClick={() => setShowAddCandidateModal(true)}
              >
                + Register Candidate
              </GlassButton>
            </div>

            {job.candidates.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
                <p className="text-xs text-[#7C91B4]">No candidate applications registered yet.</p>
                <div className="mt-4">
                  <GlassButton
                    size="sm"
                    variant="primary"
                    onClick={() => setShowAddCandidateModal(true)}
                  >
                    Add Test Candidate
                  </GlassButton>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {job.candidates.map((cand) => {
                  const isSelected = selectedCandidate?.id === cand.id;
                  const isShortlisted = cand.status === "SHORTLISTED";
                  const isRejected = cand.status === "REJECTED";

                  return (
                    <div
                      key={cand.id}
                      onClick={() => setSelectedCandidate(cand)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#0D1633] border-[#8FB6E8]/50 shadow-[0_0_25px_rgba(143,182,232,0.2)]"
                          : "bg-[#0A1228] border-white/5 hover:border-white/15"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-white">{cand.name}</div>
                          <div className="text-xs text-[#7C91B4] font-mono mt-0.5">
                            {cand.email}
                          </div>
                          <div className="text-[11px] font-mono text-[#8FB6E8] mt-1">
                            {cand.experienceYears} Years Experience
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${
                              isShortlisted
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : isRejected
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                            }`}
                          >
                            {cand.status}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunScreening(cand.id);
                            }}
                            disabled={screeningLoading}
                            className="text-[10px] font-mono text-[#8FB6E8] hover:text-white underline underline-offset-2 flex items-center gap-1"
                          >
                            <Cpu size={12} />
                            {cand.roundResults?.length > 0 ? "Re-Screen" : "Run AI Screener"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Agent Trace & Verification Panel (col-span-7) */}
          <div className="lg:col-span-7">
            {selectedCandidate ? (
              <div className="rounded-3xl p-1.5 bg-white/[0.04] ring-1 ring-[#8FB6E8]/25 shadow-2xl backdrop-blur-2xl">
                <div className="rounded-[calc(1.5rem-4px)] bg-[#070D1E] p-6 sm:p-8 border border-white/10 space-y-6">
                  {/* Candidate Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                    <div>
                      <div className="text-[10px] font-mono text-[#7C91B4] uppercase tracking-wider">
                        AUDITABLE AI SCREENING CONSOLE
                      </div>
                      <h3 className="text-xl font-display font-bold text-white mt-1">
                        {selectedCandidate.name}
                      </h3>
                      <div className="text-xs text-[#7C91B4] font-mono mt-0.5">
                        {selectedCandidate.experienceYears} Years Verified Exp · Target Range [
                        {job.minExperience} - {job.maxExperience} yrs]
                      </div>
                    </div>

                    <GlassButton
                      size="sm"
                      variant="primary"
                      onClick={() => handleRunScreening(selectedCandidate.id)}
                      disabled={screeningLoading}
                    >
                      <Cpu size={14} className="mr-1.5" />
                      {screeningLoading ? "Auditing Resume..." : "Trigger AI Screening"}
                    </GlassButton>
                  </div>

                  {/* AI Agent Step-by-Step Reasoning Trace (Auditable) */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono text-[#8FB6E8] uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#8FB6E8] animate-pulse" />
                        Live Agent Inference Steps
                      </span>
                      <span className="text-[11px] font-mono text-[#7C91B4]">
                        HR Verification Mode
                      </span>
                    </div>

                    {parsedTrace.length > 0 ? (
                      <div className="space-y-2.5 font-mono text-xs">
                        {parsedTrace.map((t: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-[#040814]/70 border border-white/5 flex items-start gap-3"
                          >
                            {t.status === "PASSED" ? (
                              <CheckCircle size={16} weight="bold" className="text-[#8FB6E8] shrink-0 mt-0.5" />
                            ) : t.status === "FAILED" ? (
                              <XCircle size={16} weight="bold" className="text-rose-400 shrink-0 mt-0.5" />
                            ) : (
                              <Clock size={16} weight="bold" className="text-amber-400 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="text-[#EAF1FB] font-semibold flex items-center gap-2">
                                <span>{t.stepName}</span>
                                {t.metric && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#8FB6E8] font-normal">
                                    {t.metric}
                                  </span>
                                )}
                              </div>
                              <p className="text-[#7C91B4] text-[11px] mt-1 leading-relaxed">
                                {t.reasoning}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center rounded-xl bg-white/[0.02] border border-white/5 text-xs text-[#7C91B4] font-mono">
                        No screening run yet for this candidate. Click &quot;Trigger AI Screening&quot; above to watch the agent evaluate resume data.
                      </div>
                    )}
                  </div>

                  {/* Generated Personalized Candidate Reply */}
                  {selectedCandidate.personalizedReply && (
                    <div className="p-5 rounded-2xl bg-[#0E1736] border border-[#8FB6E8]/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-[#8FB6E8] font-semibold flex items-center gap-1.5">
                          <ChatCircleText size={16} weight="bold" />
                          Generated Personalized Reply
                        </span>
                        <span className="text-[10px] font-mono text-[#7C91B4]">
                          Auto-personalized to strengths &amp; gaps
                        </span>
                      </div>
                      <p className="text-xs text-[#EAF1FB] whitespace-pre-line leading-relaxed italic bg-[#060B18]/50 p-4 rounded-xl border border-white/5">
                        {selectedCandidate.personalizedReply}
                      </p>
                    </div>
                  )}

                  {/* Candidate Resume Snippet */}
                  {selectedCandidate.resumeText && (
                    <div className="pt-4 border-t border-white/5">
                      <span className="text-xs font-mono text-[#7C91B4] uppercase block mb-2">
                        Parsed Resume Credentials
                      </span>
                      <p className="text-xs text-[#7C91B4] leading-relaxed font-sans bg-white/[0.01] p-4 rounded-xl border border-white/5 max-h-36 overflow-y-auto">
                        {selectedCandidate.resumeText}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-16 text-center text-xs font-mono text-[#7C91B4] rounded-3xl border border-white/5">
                Select a candidate from the left panel to inspect their screening trace.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD CONNECTOR STAGE */}
      {showAddRoundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl p-1.5 bg-white/[0.04] ring-1 ring-[#8FB6E8]/30 shadow-2xl">
            <div className="rounded-[calc(1.5rem-4px)] bg-[#0D1633] p-6 sm:p-8 border border-white/10 space-y-5">
              <h3 className="text-lg font-display font-bold text-white">
                Add Connector Stage
              </h3>

              <form onSubmit={handleAddRound} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-[#7C91B4] mb-1.5 uppercase">
                    Stage Type
                  </label>
                  <select
                    value={newRoundType}
                    onChange={(e) => {
                      setNewRoundType(e.target.value);
                      const defaults: Record<string, string> = {
                        RESUME_SCREENING: "AI Resume Screening Round",
                        APTITUDE: "Cognitive Aptitude Assessment",
                        DSA: "Data Structures & Algorithms Challenge",
                        COMMUNICATION: "Architecture & Communication Interview",
                        HR_ROUND: "Executive HR & Culture Alignment",
                        TECHNICAL: "In-Depth Systems Engineering Review",
                        CULTURE_FIT: "Team Dynamic & Leadership Fit",
                        CUSTOM: "Specialized Custom Evaluation Round",
                      };
                      setNewRoundTitle(defaults[e.target.value] || "Custom Round");
                    }}
                    className="w-full rounded-xl bg-[#0A1228] border border-[#8FB6E8]/20 px-4 py-2.5 text-sm text-[#EAF1FB] focus:outline-none focus:border-[#8FB6E8]"
                  >
                    <option value="DSA" className="bg-[#0A1228]">DSA &amp; Coding Round</option>
                    <option value="APTITUDE" className="bg-[#0A1228]">Aptitude &amp; Logic Round</option>
                    <option value="COMMUNICATION" className="bg-[#0A1228]">Communication &amp; Architecture Round</option>
                    <option value="HR_ROUND" className="bg-[#0A1228]">Executive HR Round</option>
                    <option value="RESUME_SCREENING" className="bg-[#0A1228]">AI Resume Screening Round</option>
                    <option value="TECHNICAL" className="bg-[#0A1228]">Technical Deep Dive</option>
                    <option value="CULTURE_FIT" className="bg-[#0A1228]">Culture Fit Round</option>
                    <option value="CUSTOM" className="bg-[#0A1228]">Custom Stage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#7C91B4] mb-1.5 uppercase">
                    Stage Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoundTitle}
                    onChange={(e) => setNewRoundTitle(e.target.value)}
                    placeholder="e.g. Distributed Consensus DSA"
                    className="w-full rounded-xl bg-[#0A1228] border border-[#8FB6E8]/20 px-4 py-2.5 text-sm text-[#EAF1FB] focus:outline-none focus:border-[#8FB6E8]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <GlassButton
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAddRoundModal(false)}
                  >
                    Cancel
                  </GlassButton>
                  <GlassButton type="submit" variant="primary">
                    Attach Connector
                  </GlassButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER CANDIDATE */}
      {showAddCandidateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl p-1.5 bg-white/[0.04] ring-1 ring-[#8FB6E8]/30 shadow-2xl">
            <div className="rounded-[calc(1.5rem-4px)] bg-[#0D1633] p-6 sm:p-8 border border-white/10 space-y-4">
              <h3 className="text-lg font-display font-bold text-white">
                Register Candidate Application
              </h3>

              <form onSubmit={handleAddCandidate} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={candName}
                    onChange={(e) => setCandName(e.target.value)}
                    placeholder="e.g. Rachel Sterling"
                    className="w-full rounded-xl bg-[#0A1228] border border-[#8FB6E8]/20 px-4 py-2.5 text-sm text-[#EAF1FB] focus:outline-none focus:border-[#8FB6E8]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-[#7C91B4] mb-1.5 uppercase">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={candEmail}
                      onChange={(e) => setCandEmail(e.target.value)}
                      placeholder="rachel@domain.com"
                      className="w-full rounded-xl bg-[#0A1228] border border-[#8FB6E8]/20 px-4 py-2.5 text-sm text-[#EAF1FB] focus:outline-none focus:border-[#8FB6E8]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-[#7C91B4] mb-1.5 uppercase">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={candExp}
                      onChange={(e) => setCandExp(parseInt(e.target.value) || 0)}
                      className="w-full rounded-xl bg-[#0A1228] border border-[#8FB6E8]/20 px-4 py-2.5 text-sm text-[#8FB6E8] focus:outline-none focus:border-[#8FB6E8] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#7C91B4] mb-1.5 uppercase">
                    Skills / Tech Stack
                  </label>
                  <input
                    type="text"
                    value={candSkills}
                    onChange={(e) => setCandSkills(e.target.value)}
                    placeholder="e.g. Rust, Go, Raft, Kubernetes, gRPC"
                    className="w-full rounded-xl bg-[#0A1228] border border-[#8FB6E8]/20 px-4 py-2.5 text-sm text-[#EAF1FB] focus:outline-none focus:border-[#8FB6E8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#7C91B4] mb-1.5 uppercase">
                    Resume Bio / Content Snippet
                  </label>
                  <textarea
                    rows={4}
                    value={candResume}
                    onChange={(e) => setCandResume(e.target.value)}
                    placeholder="Paste resume text or summary for AI agent parsing..."
                    className="w-full rounded-xl bg-[#0A1228] border border-[#8FB6E8]/20 p-3 text-sm text-[#EAF1FB] focus:outline-none focus:border-[#8FB6E8]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <GlassButton
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAddCandidateModal(false)}
                  >
                    Cancel
                  </GlassButton>
                  <GlassButton type="submit" variant="primary">
                    Save Candidate
                  </GlassButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

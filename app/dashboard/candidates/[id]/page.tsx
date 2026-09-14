"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Sparkle,
  Brain,
  FileText,
  ChatCircleText,
  Copy,
  TreeStructure,
  ShieldCheck,
  Warning,
  Info,
  Calendar,
  Phone,
  Envelope,
  Briefcase,
  SlidersHorizontal,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useTheme } from "@/context/theme-context";

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
  const isLight = theme === "light";

  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"trace" | "pipeline" | "resume" | "reply">("trace");
  const [screeningLoading, setScreeningLoading] = useState(false);

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
      } else {
        toast.error("Candidate not found.");
      }
      setLoading(false);
    } catch (err) {
      console.error("Error loading candidate:", err);
      toast.error("Failed to load candidate details.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidate();
  }, [id]);

  const handleRunScreening = async () => {
    setScreeningLoading(true);
    try {
      const res = await fetch("/api/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: id }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Screening failed.");
        setScreeningLoading(false);
        return;
      }

      toast.success(`Screening Complete: ${data.screening.status} (${data.screening.score}%)`);
      await fetchCandidate();
      setScreeningLoading(false);
    } catch (err) {
      toast.error("Network error during screening.");
      setScreeningLoading(false);
    }
  };

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate) return;

    setSubmittingOverride(true);
    try {
      const primaryResultId = candidate.roundResults[0]?.id;
      const res = await fetch(`/api/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: overrideStatus,
          roundResultId: primaryResultId,
          passed: overrideStatus === "SHORTLISTED",
          score: overrideScore,
          overrideReason: overrideReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Override failed.");
        setSubmittingOverride(false);
        return;
      }

      toast.success(`Decision overridden to ${overrideStatus}. Audit trail updated.`);
      setShowOverrideModal(false);
      setOverrideReason("");
      await fetchCandidate();
      setSubmittingOverride(false);
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
      <div className="space-y-6">
        <div className="h-8 w-40 rounded-xl bg-white/5 animate-pulse" />
        <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="p-16 text-center space-y-4">
        <h2 className="text-xl font-display font-semibold">Candidate Not Found</h2>
        <GlassButton variant="secondary" href="/dashboard/candidates">
          Back to Candidate Pool
        </GlassButton>
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

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Back Link */}
      <Link
        href="/dashboard/candidates"
        className="inline-flex items-center gap-2 text-xs font-mono text-[#7C91B4] hover:text-[#EAF1FB] transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Candidate Pool
      </Link>

      {/* Candidate Profile Header Card */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border shadow-xl relative overflow-hidden ${
          isLight
            ? "bg-white border-slate-200"
            : "bg-gradient-to-br from-[#10162E] via-[#0D1633] to-[#0A1228] border-white/15"
        }`}
      >
        {/* Subtle accent glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#8FB6E8]/10 blur-[100px]" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Identity & Badges */}
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/20 border border-white/20 flex items-center justify-center font-display font-bold text-2xl text-[#8FB6E8] shrink-0 shadow-inner">
              {candidate.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className={`text-2xl sm:text-3xl font-display font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
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
                    <CheckCircle size={14} className="mr-1" weight="fill" />
                  )}
                  {candidate.status === "REJECTED" && (
                    <XCircle size={14} className="mr-1" weight="fill" />
                  )}
                  {candidate.status === "PENDING" && (
                    <Clock size={14} className="mr-1" weight="fill" />
                  )}
                  {candidate.status}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm mt-2 text-[#7C91B4]">
                <span className="flex items-center gap-1.5">
                  <Envelope size={14} />
                  {candidate.email}
                </span>
                {candidate.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone size={14} />
                    {candidate.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  {candidate.experienceYears} Years Verified
                </span>
              </div>

              {candidate.jobProfile && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[#8FB6E8]">
                    <Briefcase size={14} />
                    {candidate.jobProfile.title}
                  </span>
                  <span className="text-xs font-mono text-[#7C91B4]">
                    Tier: {candidate.jobProfile.minExperience}–{candidate.jobProfile.maxExperience} yrs
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Hub */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <GlassButton
              variant="secondary"
              onClick={() => setShowOverrideModal(true)}
              className="text-xs"
            >
              <SlidersHorizontal size={16} />
              Human Override
            </GlassButton>

            <GlassButton
              variant="secondary"
              href={`/dashboard/candidates/${candidate.id}/report`}
              className="text-xs"
            >
              <FileText size={16} />
              Benchmark Report
            </GlassButton>

            <GlassButton
              variant="primary"
              onClick={handleRunScreening}
              disabled={screeningLoading}
              className="text-xs"
            >
              <Sparkle size={16} className={screeningLoading ? "animate-spin" : ""} />
              {screeningLoading ? "Screening..." : "Re-evaluate with AI"}
            </GlassButton>
          </div>
        </div>

        {/* Skills Chips Strip */}
        {candidate.skills && (
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-[#7C91B4] mr-2">Extracted Stack:</span>
            {candidate.skills.split(",").map((s, idx) => (
              <span
                key={idx}
                className={`text-xs font-mono px-3 py-1 rounded-full border ${
                  isLight
                    ? "bg-slate-100 border-slate-200 text-slate-700"
                    : "bg-white/5 border-[#8FB6E8]/20 text-[#EAF1FB]"
                }`}
              >
                {s.trim()}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div
        className={`flex items-center gap-2 p-1.5 rounded-2xl border ${
          isLight ? "bg-slate-100 border-slate-200" : "bg-[#060B18]/70 border-white/10 backdrop-blur-xl"
        }`}
      >
        {[
          { id: "trace", label: "Autonomous AI Trace", icon: Brain },
          { id: "pipeline", label: "Evaluation Pipeline", icon: TreeStructure },
          { id: "resume", label: "Resume & Evidence", icon: FileText },
          { id: "reply", label: "Candidate Feedback Draft", icon: ChatCircleText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? isLight
                    ? "bg-white text-slate-900 shadow-sm font-semibold"
                    : "bg-[#8FB6E8]/20 text-white border border-[#8FB6E8]/30 shadow"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-[#7C91B4] hover:text-[#EAF1FB]"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Autonomous AI Trace */}
      {activeTab === "trace" && (
        <div className="space-y-4">
          <div
            className={`p-6 rounded-3xl border ${
              isLight ? "bg-white border-slate-200" : "bg-[#0D1633] border-white/10"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`text-lg font-display font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                  Deterministic Agent Reasoning Engine
                </h3>
                <p className="text-xs text-[#7C91B4] mt-0.5">
                  Full step-by-step trace generated during autonomous evaluation.
                </p>
              </div>

              {primaryResult?.score !== null && primaryResult?.score !== undefined && (
                <div className="text-right">
                  <span className="text-[11px] font-mono text-[#7C91B4] uppercase block">
                    Composite Score
                  </span>
                  <span className="text-2xl font-display font-bold text-emerald-400">
                    {Math.round(primaryResult.score)}%
                  </span>
                </div>
              )}
            </div>

            {traceSteps.length === 0 ? (
              <div className="p-12 text-center text-xs font-mono text-[#7C91B4]">
                No trace generated yet. Run AI Screening to populate step-by-step reasoning.
              </div>
            ) : (
              <div className="space-y-3 mt-6">
                {traceSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      step.status === "PASSED"
                        ? isLight
                          ? "bg-emerald-50/70 border-emerald-200"
                          : "bg-emerald-950/20 border-emerald-500/20"
                        : step.status === "FAILED"
                        ? isLight
                          ? "bg-rose-50/70 border-rose-200"
                          : "bg-rose-950/20 border-rose-500/20"
                        : isLight
                        ? "bg-slate-50 border-slate-200"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {step.status === "PASSED" ? (
                          <CheckCircle size={18} className="text-emerald-400 shrink-0" weight="fill" />
                        ) : step.status === "FAILED" ? (
                          <XCircle size={18} className="text-rose-400 shrink-0" weight="fill" />
                        ) : step.status === "WARNING" ? (
                          <Warning size={18} className="text-amber-400 shrink-0" weight="fill" />
                        ) : (
                          <Info size={18} className="text-[#8FB6E8] shrink-0" weight="fill" />
                        )}

                        <div>
                          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#7C91B4]">
                            Step {idx + 1} · {step.category}
                          </span>
                          <h4 className={`text-sm font-display font-semibold mt-0.5 ${isLight ? "text-slate-900" : "text-white"}`}>
                            {step.stepName}
                          </h4>
                        </div>
                      </div>

                      <span className="text-[11px] font-mono text-[#7C91B4] shrink-0">
                        {new Date(step.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>

                    <p className={`text-xs sm:text-sm mt-3 leading-relaxed ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      {step.reasoning}
                    </p>

                    {step.metric && (
                      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-2">
                        <span className="text-[11px] font-mono text-[#7C91B4]">Metric Signal:</span>
                        <span className="text-xs font-mono font-medium text-[#8FB6E8] bg-white/5 px-2 py-0.5 rounded">
                          {step.metric}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Evaluation Pipeline */}
      {activeTab === "pipeline" && (
        <div
          className={`p-6 sm:p-8 rounded-3xl border ${
            isLight ? "bg-white border-slate-200" : "bg-[#0D1633] border-white/10"
          }`}
        >
          <div className="mb-6">
            <h3 className={`text-lg font-display font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
              Multi-Round Recruitment Timeline
            </h3>
            <p className="text-xs text-[#7C91B4] mt-0.5">
              Candidate status across all connector rounds configured for {candidate.jobProfile?.title}.
            </p>
          </div>

          <div className="space-y-4">
            {candidate.jobProfile?.pipeline?.map((round, idx) => {
              const result = candidate.roundResults?.find((r) => r.pipelineRoundId === round.id);
              const isCurrent = candidate.currentRound === round.order;

              return (
                <div
                  key={round.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    result?.passed
                      ? isLight
                        ? "bg-emerald-50/50 border-emerald-300"
                        : "bg-emerald-950/20 border-emerald-500/25"
                      : result?.passed === false
                      ? isLight
                        ? "bg-rose-50/50 border-rose-300"
                        : "bg-rose-950/20 border-rose-500/25"
                      : isCurrent
                      ? isLight
                        ? "bg-blue-50/50 border-blue-300"
                        : "bg-blue-950/20 border-[#8FB6E8]/30"
                      : isLight
                      ? "bg-slate-50 border-slate-200"
                      : "bg-white/[0.02] border-white/5"
                  }`}
                >
                  <div className="flex items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-bold ${
                          result?.passed
                            ? "bg-emerald-500/20 text-emerald-400"
                            : result?.passed === false
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-white/10 text-slate-400"
                        }`}
                      >
                        {idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-display font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                            {round.title}
                          </h4>
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/5 text-[#7C91B4]">
                            {round.type}
                          </span>
                        </div>
                        {round.description && (
                          <p className="text-xs text-[#7C91B4] mt-1">{round.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {result ? (
                        <div>
                          <Badge variant={result.passed ? "success" : "destructive"}>
                            {result.passed ? "Cleared" : "Failed"}
                          </Badge>
                          {result.score !== null && (
                            <div className="text-xs font-mono font-bold mt-1 text-[#8FB6E8]">
                              Score: {Math.round(result.score)}%
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-[#7C91B4]">Pending Round</span>
                      )}
                    </div>
                  </div>

                  {result?.feedback && (
                    <div className="mt-3 pt-3 border-t border-white/10 text-xs text-slate-300 italic">
                      "{result.feedback}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Resume & Evidence */}
      {activeTab === "resume" && (
        <div
          className={`p-6 sm:p-8 rounded-3xl border ${
            isLight ? "bg-white border-slate-200" : "bg-[#0D1633] border-white/10"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-lg font-display font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                Resume Artifact & Extracted Text
              </h3>
              <p className="text-xs text-[#7C91B4] mt-0.5">
                Parsed text used for autonomous screening evaluation.
              </p>
            </div>
            <GlassButton
              variant="secondary"
              onClick={() => {
                if (candidate.resumeText) {
                  navigator.clipboard.writeText(candidate.resumeText);
                  toast.success("Resume text copied to clipboard!");
                }
              }}
              className="text-xs"
            >
              <Copy size={14} />
              Copy Text
            </GlassButton>
          </div>

          <div
            className={`p-5 rounded-2xl border font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap ${
              isLight
                ? "bg-slate-50 border-slate-200 text-slate-800"
                : "bg-[#060B18] border-white/10 text-slate-300"
            }`}
          >
            {candidate.resumeText || "No resume artifact extracted."}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Candidate Feedback Draft */}
      {activeTab === "reply" && (
        <div
          className={`p-6 sm:p-8 rounded-3xl border ${
            isLight ? "bg-white border-slate-200" : "bg-[#0D1633] border-white/10"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-lg font-display font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                Personalized Communication Draft
              </h3>
              <p className="text-xs text-[#7C91B4] mt-0.5">
                AI-generated feedback tailored to the candidate's exact background and evaluation outcome.
              </p>
            </div>
            <GlassButton variant="primary" onClick={copyReplyToClipboard} className="text-xs">
              <Copy size={14} />
              Copy Draft
            </GlassButton>
          </div>

          <div
            className={`p-6 rounded-2xl border text-sm leading-relaxed whitespace-pre-wrap ${
              isLight
                ? "bg-slate-50 border-slate-200 text-slate-800"
                : "bg-[#060B18] border-white/10 text-slate-200"
            }`}
          >
            {candidate.personalizedReply ||
              "No personalized response generated yet. Run AI Screening to synthesize custom feedback."}
          </div>
        </div>
      )}

      {/* RECRUITER HUMAN OVERRIDE MODAL */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div
            className={`w-full max-w-lg p-6 sm:p-8 rounded-3xl border shadow-2xl ${
              isLight ? "bg-white border-slate-300" : "bg-[#0D1633] border-white/20 text-white"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={22} className="text-[#8FB6E8]" />
                <h3 className="text-lg font-display font-bold">Human-in-the-Loop Override</h3>
              </div>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="text-[#7C91B4] hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#7C91B4] mb-6">
              Manually overturn or calibrate an automated AI recommendation. All overrides are logged into the immutable compliance audit trace.
            </p>

            <form onSubmit={handleApplyOverride} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[#7C91B4] mb-1.5">
                  Calibrated Decision
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOverrideStatus("SHORTLISTED")}
                    className={`py-2.5 rounded-xl border text-xs font-medium transition-all ${
                      overrideStatus === "SHORTLISTED"
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-400 font-bold"
                        : "bg-white/5 border-white/10 text-[#7C91B4]"
                    }`}
                  >
                    Shortlist Candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideStatus("REJECTED")}
                    className={`py-2.5 rounded-xl border text-xs font-medium transition-all ${
                      overrideStatus === "REJECTED"
                        ? "bg-rose-500/20 border-rose-400 text-rose-400 font-bold"
                        : "bg-white/5 border-white/10 text-[#7C91B4]"
                    }`}
                  >
                    Reject Candidate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#7C91B4] mb-1.5">
                  Adjusted Score (0–100%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-1 focus:ring-[#8FB6E8] ${
                    isLight ? "bg-slate-50 border-slate-300" : "bg-white/5 border-white/15"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#7C91B4] mb-1.5">
                  Audit Reason &amp; Recruiter Justification *
                </label>
                <textarea
                  required
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Explain why this candidate was manually recalibrated (e.g. strong open source contributions offset experience gap)..."
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border focus:outline-none focus:ring-1 focus:ring-[#8FB6E8] ${
                    isLight ? "bg-slate-50 border-slate-300" : "bg-white/5 border-white/15"
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={() => setShowOverrideModal(false)}
                >
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="primary" disabled={submittingOverride}>
                  {submittingOverride ? "Saving..." : "Commit Override"}
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


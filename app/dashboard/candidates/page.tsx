"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import {
  UsersThree,
  MagnifyingGlass,
  Funnel,
  Briefcase,
  CheckCircle,
  Clock,
  XCircle,
  Sparkle,
  ArrowSquareOut,
  FileText,
  TrayArrowUp,
  SlidersHorizontal,
  Brain,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useTheme } from "@/context/theme-context";

interface RoundResult {
  id: string;
  score: number | null;
  passed: boolean | null;
  feedback: string | null;
  pipelineRound: {
    title: string;
    type: string;
  };
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  experienceYears: number;
  skills: string | null;
  status: string;
  currentRound: number;
  personalizedReply: string | null;
  jobProfile: {
    id: string;
    title: string;
    minExperience: number;
    maxExperience: number;
  };
  roundResults: RoundResult[];
}

interface JobOption {
  id: string;
  title: string;
}

export default function CandidatesPoolPage() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [screeningId, setScreeningId] = useState<string | null>(null);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/candidates");
      const data = await res.json();
      if (data.candidates) {
        setCandidates(data.candidates);

        // Extract distinct jobs
        const uniqueJobs: Record<string, string> = {};
        data.candidates.forEach((c: Candidate) => {
          if (c.jobProfile?.id) {
            uniqueJobs[c.jobProfile.id] = c.jobProfile.title;
          }
        });
        setJobs(Object.entries(uniqueJobs).map(([id, title]) => ({ id, title })));
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching candidates:", err);
      toast.error("Failed to load candidate database.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleScreenCandidate = async (candidateId: string) => {
    setScreeningId(candidateId);
    try {
      const res = await fetch("/api/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Screening failed.");
        setScreeningId(null);
        return;
      }

      toast.success(
        `Screening Complete: ${data.screening.status} (${data.screening.score}%)`
      );

      // Refresh candidate list
      await fetchCandidates();
      setScreeningId(null);
    } catch (err) {
      toast.error("Network error during screening.");
      setScreeningId(null);
    }
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.skills && c.skills.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.jobProfile?.title && c.jobProfile.title.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesJob = selectedJob === "all" || c.jobProfile?.id === selectedJob;
      const matchesStatus = selectedStatus === "all" || c.status === selectedStatus;

      return matchesSearch && matchesJob && matchesStatus;
    });
  }, [candidates, searchQuery, selectedJob, selectedStatus]);

  const stats = useMemo(() => {
    const total = candidates.length;
    const shortlisted = candidates.filter((c) => c.status === "SHORTLISTED").length;
    const pending = candidates.filter((c) => c.status === "PENDING").length;
    const rejected = candidates.filter((c) => c.status === "REJECTED").length;
    return { total, shortlisted, pending, rejected };
  }, [candidates]);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className={`text-2xl sm:text-3xl font-display font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
              Candidate Benchmark Pool
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#8FB6E8]/15 text-[#8FB6E8] border border-[#8FB6E8]/25">
              {candidates.length} Profiles
            </span>
          </div>
          <p className={`text-xs sm:text-sm mt-1 ${isLight ? "text-slate-600" : "text-[#7C91B4]"}`}>
            Cross-role talent calibration, autonomous multi-round benchmarks, and candidate dossiers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GlassButton variant="secondary" onClick={fetchCandidates} className="cursor-pointer">
            <ArrowsClockwise size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </GlassButton>
          <GlassButton variant="primary" withArrow href="/dashboard/upload">
            <TrayArrowUp size={16} />
            Bulk Ingest
          </GlassButton>
        </div>
      </div>

      {/* Benchmark Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0D1633] border-[#8FB6E8]/20 shadow-lg"}`}>
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#7C91B4]">
            <span>Total Ingested</span>
            <UsersThree size={16} weight="duotone" className="text-[#8FB6E8]" />
          </div>
          <div className={`mt-2 text-2xl sm:text-3xl font-display font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
            {stats.total}
          </div>
          <div className="mt-1 text-[11px] font-mono text-[#8FB6E8]">
            Across all active requisitions
          </div>
        </div>

        <div className={`p-5 rounded-2xl border ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0D1633] border-[#8FB6E8]/20 shadow-lg"}`}>
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#7C91B4]">
            <span>AI Shortlisted</span>
            <CheckCircle size={16} weight="duotone" className="text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-display font-bold text-emerald-400">
            {stats.shortlisted}
          </div>
          <div className="mt-1 text-[11px] font-mono text-emerald-400/80">
            {stats.total ? Math.round((stats.shortlisted / stats.total) * 100) : 0}% benchmark pass rate
          </div>
        </div>

        <div className={`p-5 rounded-2xl border ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0D1633] border-[#8FB6E8]/20 shadow-lg"}`}>
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#7C91B4]">
            <span>Pending Evaluation</span>
            <Clock size={16} weight="duotone" className="text-amber-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-display font-bold text-amber-400">
            {stats.pending}
          </div>
          <div className="mt-1 text-[11px] font-mono text-amber-400/80">
            Awaiting screening run
          </div>
        </div>

        <div className={`p-5 rounded-2xl border ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0D1633] border-[#8FB6E8]/20 shadow-lg"}`}>
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#7C91B4]">
            <span>Calibrated Out</span>
            <XCircle size={16} weight="duotone" className="text-rose-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-display font-bold text-rose-400">
            {stats.rejected}
          </div>
          <div className="mt-1 text-[11px] font-mono text-rose-400/80">
            Detailed gap summary delivered
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-4 rounded-2xl border backdrop-blur-xl flex flex-col md:flex-row gap-4 items-center justify-between ${
        isLight ? "bg-white/80 border-slate-200 shadow-sm" : "bg-[#060B18]/70 border-white/10 shadow-lg"
      }`}>
        {/* Search */}
        <div className="relative w-full md:w-80">
          <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C91B4]" />
          <input
            type="text"
            placeholder="Search by name, skill, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm border transition-all focus:outline-none focus:ring-1 focus:ring-[#8FB6E8] ${
              isLight
                ? "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400"
                : "bg-white/5 border-white/10 text-white placeholder:text-[#7C91B4]/70"
            }`}
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Job Filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-[#7C91B4]">Requisition:</span>
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className={`py-1.5 px-3 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#8FB6E8] cursor-pointer ${
                isLight
                  ? "bg-slate-50 border-slate-300 text-slate-800"
                  : "bg-[#0D1633] border-white/15 text-[#EAF1FB]"
              }`}
            >
              <option value="all">All Requisitions</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
          <div className={`flex items-center p-1 rounded-xl border ${
            isLight ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/10"
          }`}>
            {[
              { id: "all", label: "All" },
              { id: "SHORTLISTED", label: "Shortlisted" },
              { id: "PENDING", label: "Pending" },
              { id: "REJECTED", label: "Rejected" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  selectedStatus === tab.id
                    ? isLight
                      ? "bg-white text-slate-900 shadow-sm"
                      : "bg-[#8FB6E8]/20 text-white border border-[#8FB6E8]/30 shadow"
                    : isLight
                    ? "text-slate-600 hover:text-slate-900"
                    : "text-[#7C91B4] hover:text-[#EAF1FB]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Candidate Cards / Table */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-24 rounded-2xl border animate-pulse ${
                isLight ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/5"
              }`}
            />
          ))}
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className={`p-16 text-center rounded-3xl border border-dashed ${
          isLight ? "border-slate-300 bg-slate-50" : "border-white/10 bg-white/[0.01]"
        }`}>
          <UsersThree size={48} className="mx-auto text-[#7C91B4] mb-3" weight="duotone" />
          <h3 className={`text-lg font-display font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
            No Candidates Found
          </h3>
          <p className={`text-xs mt-1 max-w-md mx-auto ${isLight ? "text-slate-600" : "text-[#7C91B4]"}`}>
            {searchQuery || selectedJob !== "all" || selectedStatus !== "all"
              ? "No candidate matches the selected filters. Try broadening your query or selecting another requisition."
              : "No candidates have been ingested yet. Use the Bulk Ingest tool to upload resumes."}
          </p>
          <div className="mt-6">
            <GlassButton variant="primary" href="/dashboard/upload">
              <TrayArrowUp size={16} /> Ingest Resumes
            </GlassButton>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCandidates.map((candidate) => {
            const primaryResult = candidate.roundResults?.[0];
            const score = primaryResult?.score;
            const isScreening = screeningId === candidate.id;

            return (
              <div
                key={candidate.id}
                className={`p-5 rounded-2xl border transition-all duration-200 ${
                  isLight
                    ? "bg-white border-slate-200 hover:border-blue-400 hover:shadow-md"
                    : "bg-[#0D1633]/80 border-white/10 hover:border-[#8FB6E8]/30 hover:bg-[#0D1633]"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Avatar & Identity */}
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/20 border border-white/20 flex items-center justify-center font-display font-bold text-base text-[#8FB6E8] shrink-0">
                      {candidate.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/dashboard/candidates/${candidate.id}`}
                          className={`font-display font-semibold text-base hover:underline ${
                            isLight ? "text-slate-900" : "text-white"
                          }`}
                        >
                          {candidate.name}
                        </Link>

                        {/* Status Badge */}
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
                            <CheckCircle size={12} className="mr-1" weight="fill" />
                          )}
                          {candidate.status === "REJECTED" && (
                            <XCircle size={12} className="mr-1" weight="fill" />
                          )}
                          {candidate.status === "PENDING" && (
                            <Clock size={12} className="mr-1" weight="fill" />
                          )}
                          {candidate.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-1 text-[#7C91B4]">
                        <span>{candidate.email}</span>
                        {candidate.phone && <span>· {candidate.phone}</span>}
                        <span>· {candidate.experienceYears} yrs exp</span>
                      </div>

                      {/* Requisition Pill */}
                      {candidate.jobProfile && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[#8FB6E8]">
                            <Briefcase size={12} />
                            {candidate.jobProfile.title}
                          </span>
                        </div>
                      )}

                      {/* Skills tags */}
                      {candidate.skills && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {candidate.skills.split(",").slice(0, 4).map((s, idx) => (
                            <span
                              key={idx}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                                isLight
                                  ? "bg-slate-100 border-slate-200 text-slate-700"
                                  : "bg-white/5 border-white/10 text-slate-300"
                              }`}
                            >
                              {s.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Score Metric & Actions */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/10">
                    {/* Autonomous Score Gauge */}
                    <div className="text-right">
                      <div className="text-[11px] font-mono uppercase text-[#7C91B4]">
                        Benchmark Score
                      </div>
                      <div className="flex items-baseline justify-end gap-1 mt-0.5">
                        <span
                          className={`font-display text-2xl font-bold ${
                            score !== null && score !== undefined
                              ? score >= 80
                                ? "text-emerald-400"
                                : score >= 60
                                ? "text-amber-400"
                                : "text-rose-400"
                              : "text-[#7C91B4]"
                          }`}
                        >
                          {score !== null && score !== undefined ? `${Math.round(score)}%` : "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {candidate.status === "PENDING" && (
                        <GlassButton
                          variant="primary"
                          onClick={() => handleScreenCandidate(candidate.id)}
                          disabled={isScreening}
                          className="text-xs"
                        >
                          <Sparkle size={14} className={isScreening ? "animate-spin" : ""} />
                          {isScreening ? "Screening..." : "Run AI Screen"}
                        </GlassButton>
                      )}

                      <GlassButton
                        variant="secondary"
                        href={`/dashboard/candidates/${candidate.id}`}
                        className="text-xs"
                      >
                        <Brain size={14} />
                        Dossier
                      </GlassButton>

                      <GlassButton
                        variant="secondary"
                        href={`/dashboard/candidates/${candidate.id}/report`}
                        className="text-xs"
                      >
                        <FileText size={14} />
                        Report
                      </GlassButton>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


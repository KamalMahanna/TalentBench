"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Search,
  Briefcase,
  CheckCircle,
  Clock,
  XCircle,
  Sparkles,
  FileText,
  Upload,
  Brain,
  RefreshCw,
  ChevronDown,
  Check,
  Layers,
  Filter,
  Mail,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/context/theme-context";
import { motion, AnimatePresence } from "motion/react";
import { EmailStatusBadge } from "@/components/email/email-status-badge";
import { SingleEmailModal } from "@/components/email/single-email-modal";
import { BulkEmailModal } from "@/components/email/bulk-email-modal";

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
  emailStatus?: string | null;
  emailSentAt?: string | null;
  emailError?: string | null;
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

  // Email modal states
  const [emailCandidate, setEmailCandidate] = useState<Candidate | null>(null);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);

  // Requisition popover dropdown state
  const [isRequisitionOpen, setIsRequisitionOpen] = useState(false);
  const [jobSearchFilter, setJobSearchFilter] = useState("");
  const requisitionDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        requisitionDropdownRef.current &&
        !requisitionDropdownRef.current.contains(event.target as Node)
      ) {
        setIsRequisitionOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsRequisitionOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const filteredJobs = useMemo(() => {
    if (!jobSearchFilter.trim()) return jobs;
    return jobs.filter((j) =>
      j.title.toLowerCase().includes(jobSearchFilter.toLowerCase())
    );
  }, [jobs, jobSearchFilter]);

  const selectedJobTitle = useMemo(() => {
    if (selectedJob === "all") return "All Requisitions";
    return jobs.find((j) => j.id === selectedJob)?.title || "Selected Requisition";
  }, [selectedJob, jobs]);

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

  const handleSingleEmailSuccess = (candidateId: string, result: any) => {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId || c.email === result?.to
          ? {
              ...c,
              emailStatus: "SENT",
              emailSentAt: result?.sentAt || new Date().toISOString(),
              emailError: undefined,
            }
          : c
      )
    );
  };

  const handleBulkEmailComplete = (results: any[]) => {
    const resultMap = new Map(
      results.map((r) => [r.candidateId || (r.to ? r.to.toLowerCase() : ""), r])
    );

    setCandidates((prev) =>
      prev.map((c) => {
        const res = resultMap.get(c.id) || resultMap.get(c.email.toLowerCase());
        if (!res) return c;
        return {
          ...c,
          emailStatus: res.success ? "SENT" : "FAILED",
          emailSentAt: res.success ? (res.sentAt || new Date().toISOString()) : c.emailSentAt,
          emailError: res.success ? undefined : (res.error || "Failed to send"),
        };
      })
    );
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
            <h1 style={{ color: "var(--ink)" }} className="text-2xl sm:text-3xl font-bold tracking-tight">
              Candidate Benchmark Pool
            </h1>
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={{
                background: "var(--surface-purple)",
                color: "var(--primary)",
                border: "1px solid var(--outline)",
              }}
            >
              {candidates.length} Profiles
            </span>
          </div>
          <p style={{ color: "var(--muted)" }} className="text-xs sm:text-sm mt-1">
            Cross-role talent calibration, autonomous multi-round benchmarks, and candidate dossiers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            className="md-button md-button--filled inline-flex items-center gap-2 cursor-pointer text-xs"
            onClick={() => setIsBulkEmailOpen(true)}
            disabled={candidates.length === 0}
          >
            <Send size={15} />
            Send All Candidates Mail
          </button>
          <button
            className="md-button md-button--tonal inline-flex items-center gap-2 cursor-pointer text-xs"
            onClick={fetchCandidates}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link href="/dashboard/upload">
            <button className="md-button md-button--tonal inline-flex items-center gap-2 text-xs">
              <Upload size={15} />
              Bulk Ingest
            </button>
          </Link>
        </div>
      </div>

      {/* Benchmark Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div
          style={{ background: "var(--surface)", border: "1px solid var(--outline)" }}
          className="p-5 rounded-2xl shadow-sm"
        >
          <div className="flex items-center justify-between text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            <span>Total Ingested</span>
            <Users size={16} style={{ color: "var(--primary)" }} />
          </div>
          <div style={{ color: "var(--ink)" }} className="mt-2 text-2xl sm:text-3xl font-bold">
            {stats.total}
          </div>
          <div className="mt-1 text-[11px]" style={{ color: "var(--primary)" }}>
            Across all active requisitions
          </div>
        </div>

        {/* Shortlisted */}
        <div
          style={{ background: "var(--surface)", border: "1px solid var(--outline)" }}
          className="p-5 rounded-2xl shadow-sm"
        >
          <div className="flex items-center justify-between text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            <span>AI Shortlisted</span>
            <CheckCircle size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-emerald-500">
            {stats.shortlisted}
          </div>
          <div className="mt-1 text-[11px] text-emerald-500/80">
            {stats.total ? Math.round((stats.shortlisted / stats.total) * 100) : 0}% benchmark pass rate
          </div>
        </div>

        {/* Pending */}
        <div
          style={{ background: "var(--surface)", border: "1px solid var(--outline)" }}
          className="p-5 rounded-2xl shadow-sm"
        >
          <div className="flex items-center justify-between text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            <span>Pending Evaluation</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-amber-500">
            {stats.pending}
          </div>
          <div className="mt-1 text-[11px] text-amber-500/80">
            Awaiting screening run
          </div>
        </div>

        {/* Rejected */}
        <div
          style={{ background: "var(--surface)", border: "1px solid var(--outline)" }}
          className="p-5 rounded-2xl shadow-sm"
        >
          <div className="flex items-center justify-between text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            <span>Calibrated Out</span>
            <XCircle size={16} className="text-rose-500" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-rose-500">
            {stats.rejected}
          </div>
          <div className="mt-1 text-[11px] text-rose-500/80">
            Detailed gap summary delivered
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{ background: "var(--surface)", border: "1px solid var(--outline)" }}
        className="p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm"
      >
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={18} style={{ color: "var(--muted)" }} className="absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, skill, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm focus:outline-none transition-all"
            style={{
              background: "var(--canvas)",
              border: "1px solid var(--outline)",
              color: "var(--ink)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--outline)")}
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Custom Material 3 Requisition Popover */}
          <div className="relative" ref={requisitionDropdownRef}>
            <div className="flex items-center gap-2 text-xs">
              <span style={{ color: "var(--muted)" }} className="font-medium hidden sm:inline">
                Requisition:
              </span>
              <button
                type="button"
                onClick={() => setIsRequisitionOpen(!isRequisitionOpen)}
                className="inline-flex items-center gap-2 py-1.5 px-3 rounded-xl text-xs font-medium transition-all shadow-sm focus:outline-none select-none"
                style={{
                  background: isRequisitionOpen ? "var(--surface-purple)" : "var(--canvas)",
                  border: `1px solid ${isRequisitionOpen ? "var(--primary)" : "var(--outline)"}`,
                  color: isRequisitionOpen ? "var(--primary-deep)" : "var(--ink)",
                  boxShadow: isRequisitionOpen ? "0 0 0 2px rgba(103, 80, 164, 0.15)" : undefined,
                }}
              >
                <Briefcase size={13} style={{ color: "var(--primary)" }} />
                <span className="truncate max-w-[150px] sm:max-w-[210px] text-left">
                  {selectedJobTitle}
                </span>
                <span
                  className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium"
                  style={{
                    background: isRequisitionOpen ? "var(--primary)" : "var(--surface)",
                    color: isRequisitionOpen ? "var(--on-primary)" : "var(--muted)",
                    border: isRequisitionOpen ? "none" : "1px solid var(--outline)",
                  }}
                >
                  {selectedJob === "all"
                    ? candidates.length
                    : candidates.filter((c) => c.jobProfile?.id === selectedJob).length}
                </span>
                <ChevronDown
                  size={14}
                  className="transition-transform duration-200"
                  style={{
                    transform: isRequisitionOpen ? "rotate(180deg)" : "rotate(0deg)",
                    color: "var(--muted)",
                  }}
                />
              </button>
            </div>

            <AnimatePresence>
              {isRequisitionOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border shadow-2xl z-50 overflow-hidden"
                  style={{
                    background: "var(--surface-high)",
                    borderColor: "var(--outline)",
                    boxShadow: "0 16px 40px -6px rgba(0, 0, 0, 0.16), 0 4px 16px -2px rgba(0, 0, 0, 0.08)",
                  }}
                >
                  {/* Options List */}
                  <div className="p-1.5 max-h-72 overflow-y-auto space-y-1">
                    {/* All Requisitions Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedJob("all");
                        setIsRequisitionOpen(false);
                        setJobSearchFilter("");
                      }}
                      className="w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group"
                      style={{
                        background: selectedJob === "all" ? "var(--surface-purple)" : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedJob !== "all") {
                          e.currentTarget.style.background = "var(--surface)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedJob !== "all") {
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                          style={{
                            background: selectedJob === "all" ? "var(--primary)" : "var(--surface)",
                            color: selectedJob === "all" ? "var(--on-primary)" : "var(--primary)",
                          }}
                        >
                          <Layers size={16} />
                        </div>
                        <div className="min-w-0">
                          <div
                            className="text-xs font-semibold truncate"
                            style={{ color: "var(--ink)" }}
                          >
                            All Requisitions
                          </div>
                          <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                            All candidate cohorts combined
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium"
                          style={{
                            background: "var(--canvas)",
                            color: "var(--muted)",
                            border: "1px solid var(--outline)",
                          }}
                        >
                          {candidates.length}
                        </span>
                        {selectedJob === "all" && (
                          <Check size={16} style={{ color: "var(--primary)" }} />
                        )}
                      </div>
                    </button>

                    <div className="my-1 border-t" style={{ borderColor: "var(--outline)" }} />

                    {/* Filtered Job Items */}
                    {filteredJobs.length === 0 ? (
                      <div className="py-6 text-center text-xs" style={{ color: "var(--muted)" }}>
                        No matching requisitions found
                      </div>
                    ) : (
                      filteredJobs.map((job) => {
                        const count = candidates.filter((c) => c.jobProfile?.id === job.id).length;
                        const isSelected = selectedJob === job.id;
                        return (
                          <button
                            key={job.id}
                            type="button"
                            onClick={() => {
                              setSelectedJob(job.id);
                              setIsRequisitionOpen(false);
                              setJobSearchFilter("");
                            }}
                            className="w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group"
                            style={{
                              background: isSelected ? "var(--surface-purple)" : "transparent",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = "var(--surface)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = "transparent";
                              }
                            }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                                style={{
                                  background: isSelected ? "var(--primary)" : "var(--surface)",
                                  color: isSelected ? "var(--on-primary)" : "var(--primary)",
                                }}
                              >
                                <Briefcase size={15} />
                              </div>
                              <div className="min-w-0">
                                <div
                                  className="text-xs font-semibold truncate"
                                  style={{ color: "var(--ink)" }}
                                  title={job.title}
                                >
                                  {job.title}
                                </div>
                                <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                                  {count} candidate{count === 1 ? "" : "s"} enrolled
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium"
                                style={{
                                  background: "var(--canvas)",
                                  color: "var(--muted)",
                                  border: "1px solid var(--outline)",
                                }}
                              >
                                {count}
                              </span>
                              {isSelected && (
                                <Check size={16} style={{ color: "var(--primary)" }} />
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Status Tabs */}
          <div
            className="flex items-center p-1 rounded-xl"
            style={{ background: "var(--canvas)", border: "1px solid var(--outline)" }}
          >
            {[
              { id: "all", label: "All" },
              { id: "SHORTLISTED", label: "Shortlisted" },
              { id: "PENDING", label: "Pending" },
              { id: "REJECTED", label: "Rejected" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className="px-3 py-1 text-xs font-medium rounded-lg transition-all"
                style={
                  selectedStatus === tab.id
                    ? {
                        background: "var(--surface-purple)",
                        color: "var(--primary)",
                        border: "1px solid var(--outline)",
                      }
                    : { color: "var(--muted)" }
                }
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
              className="h-24 rounded-2xl border animate-pulse"
              style={{ background: "var(--surface)", borderColor: "var(--outline)" }}
            />
          ))}
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div
          className="p-16 text-center rounded-3xl border border-dashed"
          style={{ borderColor: "var(--outline)", background: "var(--surface)" }}
        >
          <Users size={48} style={{ color: "var(--muted)" }} className="mx-auto mb-3" />
          <h3 style={{ color: "var(--ink)" }} className="text-lg font-semibold">
            No Candidates Found
          </h3>
          <p style={{ color: "var(--muted)" }} className="text-xs mt-1 max-w-md mx-auto">
            {searchQuery || selectedJob !== "all" || selectedStatus !== "all"
              ? "No candidate matches the selected filters. Try broadening your query or selecting another requisition."
              : "No candidates have been ingested yet. Use the Bulk Ingest tool to upload resumes."}
          </p>
          <div className="mt-6">
            <Link href="/dashboard/upload">
              <button className="md-button md-button--filled inline-flex items-center gap-2">
                <Upload size={16} /> Ingest Resumes
              </button>
            </Link>
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
                className="p-5 rounded-2xl border transition-all duration-200 hover:shadow-md"
                style={{ background: "var(--surface)", borderColor: "var(--outline)" }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Avatar & Identity */}
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base shrink-0"
                      style={{
                        background: "var(--surface-purple)",
                        color: "var(--primary)",
                        border: "1px solid var(--outline)",
                      }}
                    >
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
                          className="font-semibold text-base hover:underline"
                          style={{ color: "var(--ink)" }}
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
                            <CheckCircle size={12} className="mr-1" />
                          )}
                          {candidate.status === "REJECTED" && (
                            <XCircle size={12} className="mr-1" />
                          )}
                          {candidate.status === "PENDING" && (
                            <Clock size={12} className="mr-1" />
                          )}
                          {candidate.status}
                        </Badge>

                        {/* Email Status Badge */}
                        <EmailStatusBadge
                          status={candidate.emailStatus}
                          sentAt={candidate.emailSentAt}
                          error={candidate.emailError}
                          onRetry={() => setEmailCandidate(candidate)}
                          size="sm"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-1" style={{ color: "var(--muted)" }}>
                        <span>{candidate.email}</span>
                        {candidate.phone && <span>· {candidate.phone}</span>}
                        <span>· {candidate.experienceYears} yrs exp</span>
                      </div>

                      {/* Requisition Pill */}
                      {candidate.jobProfile && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <span
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md"
                            style={{
                              background: "var(--surface-blue)",
                              border: "1px solid var(--outline)",
                              color: "var(--primary)",
                            }}
                          >
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
                              className="text-[10px] px-2 py-0.5 rounded"
                              style={{
                                background: "var(--surface-purple)",
                                border: "1px solid var(--outline)",
                                color: "var(--muted)",
                              }}
                            >
                              {s.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Score Metric & Actions */}
                  <div
                    className="flex flex-wrap items-center justify-between lg:justify-end gap-4 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0"
                    style={{ borderColor: "var(--outline)" }}
                  >
                    {/* Autonomous Score Gauge */}
                    <div className="text-right">
                      <div className="text-[11px] uppercase" style={{ color: "var(--muted)" }}>
                        Benchmark Score
                      </div>
                      <div className="flex items-baseline justify-end gap-1 mt-0.5">
                        <span
                          className={`text-2xl font-bold ${
                            score !== null && score !== undefined
                              ? score >= 80
                                ? "text-emerald-500"
                                : score >= 60
                                ? "text-amber-500"
                                : "text-rose-500"
                              : ""
                          }`}
                          style={
                            score === null || score === undefined
                              ? { color: "var(--muted)" }
                              : {}
                          }
                        >
                          {score !== null && score !== undefined ? `${Math.round(score)}%` : "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {candidate.status === "PENDING" && (
                        <button
                          className="md-button md-button--filled inline-flex items-center gap-1.5 text-xs disabled:opacity-60"
                          onClick={() => handleScreenCandidate(candidate.id)}
                          disabled={isScreening}
                        >
                          <Sparkles size={14} className={isScreening ? "animate-spin" : ""} />
                          {isScreening ? "Screening..." : "Run AI Screen"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setEmailCandidate(candidate)}
                        className="md-button md-button--tonal inline-flex items-center gap-1.5 text-xs cursor-pointer"
                      >
                        <Mail size={14} />
                        Send Mail
                      </button>

                      <Link href={`/dashboard/candidates/${candidate.id}`}>
                        <button className="md-button md-button--tonal inline-flex items-center gap-1.5 text-xs">
                          <Brain size={14} />
                          Dossier
                        </button>
                      </Link>

                      <Link href={`/dashboard/candidates/${candidate.id}/report`}>
                        <button className="md-button md-button--tonal inline-flex items-center gap-1.5 text-xs">
                          <FileText size={14} />
                          Report
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Single Candidate Email Modal */}
      <SingleEmailModal
        isOpen={Boolean(emailCandidate)}
        onClose={() => setEmailCandidate(null)}
        candidate={
          emailCandidate
            ? {
                id: emailCandidate.id,
                name: emailCandidate.name,
                email: emailCandidate.email,
                status: emailCandidate.status,
                jobTitle: emailCandidate.jobProfile?.title,
                personalizedReply: emailCandidate.personalizedReply,
              }
            : null
        }
        onSuccess={handleSingleEmailSuccess}
      />

      {/* Bulk Candidates Email Modal */}
      <BulkEmailModal
        isOpen={isBulkEmailOpen}
        onClose={() => setIsBulkEmailOpen(false)}
        candidates={candidates.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          status: c.status,
          jobTitle: c.jobProfile?.title,
          personalizedReply: c.personalizedReply,
        }))}
        jobTitle={selectedJob !== "all" ? jobs.find((j) => j.id === selectedJob)?.title : "Target Requisition"}
        onComplete={handleBulkEmailComplete}
      />
    </div>
  );
}

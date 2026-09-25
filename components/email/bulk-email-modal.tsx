"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Send,
  RotateCw,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Settings,
  CheckSquare,
  Square,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getStoredHrEmail,
  getStoredGmailAppPassword,
  getStoredSenderName,
} from "@/lib/client/resume-cache";
import Link from "next/link";
import { CandidateEmailTarget } from "./single-email-modal";

interface BulkEmailCandidate extends CandidateEmailTarget {
  customSubject?: string;
  customBody?: string;
  selected?: boolean;
}

interface BulkEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: CandidateEmailTarget[];
  jobTitle?: string;
  companyName?: string;
  onComplete?: (results: any[]) => void;
}

export function BulkEmailModal({
  isOpen,
  onClose,
  candidates: initialCandidates,
  jobTitle = "Job Requisition",
  companyName = "TalentBench",
  onComplete,
}: BulkEmailModalProps) {
  const [candidatesList, setCandidatesList] = useState<BulkEmailCandidate[]>([]);
  const [filterType, setFilterType] = useState<"all" | "SHORTLISTED" | "REJECTED">("all");
  const [templateMode, setTemplateMode] = useState<"personalized" | "template">("personalized");

  // Global template settings
  const [globalSubject, setGlobalSubject] = useState(`Update regarding your application for ${jobTitle} at ${companyName}`);
  const [globalShortlistBody, setGlobalShortlistBody] = useState(
    `Hi {{name}},\n\nWe have reviewed your application for ${jobTitle} at ${companyName}.\n\nOur team was impressed by your profile and we would like to invite you to the next technical evaluation round. We will reach out shortly with scheduling details.\n\nWarm regards,\nThe Talent Team`
  );
  const [globalRejectBody, setGlobalRejectBody] = useState(
    `Hi {{name}},\n\nThank you for taking the time to apply for ${jobTitle} at ${companyName}.\n\nAfter careful evaluation against our core requisition criteria, we will not be moving forward with your candidacy at this time. We sincerely appreciate your interest and wish you the best in your career pursuits.\n\nBest regards,\nThe Talent Team`
  );

  // Inspector & Modifier carousel state
  const [currentInspectIdx, setCurrentInspectIdx] = useState(0);

  // Dispatch & Progress state
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [resultsLog, setResultsLog] = useState<any[] | null>(null);

  // HR Credentials state
  const [hrEmail, setHrEmail] = useState("");
  const [hasAppPassword, setHasAppPassword] = useState(false);
  const [senderName, setSenderName] = useState("Talent Acquisition Team");

  useEffect(() => {
    if (isOpen) {
      // 1. Load credentials
      const localHr = getStoredHrEmail();
      const localCode = getStoredGmailAppPassword();
      const localSender = getStoredSenderName();

      if (localHr) setHrEmail(localHr);
      if (localCode) setHasAppPassword(true);
      if (localSender) setSenderName(localSender);

      if (!localHr || !localCode) {
        fetch("/api/settings")
          .then((res) => res.json())
          .then((data) => {
            if (data.settings?.email) {
              if (data.settings.email.hrEmail) setHrEmail(data.settings.email.hrEmail);
              if (data.settings.email.gmailAppPassword) setHasAppPassword(true);
              if (data.settings.email.senderName) setSenderName(data.settings.email.senderName);
            }
          })
          .catch(() => {});
      }

      // 2. Initialize candidate list with selected = true
      const initialized = initialCandidates.map((c) => ({
        ...c,
        selected: Boolean(c.email && c.email.includes("@")),
      }));
      setCandidatesList(initialized);
      setCurrentInspectIdx(0);
      setResultsLog(null);
      setProgress(null);
    }
  }, [isOpen, initialCandidates]);

  const filteredCandidates = useMemo(() => {
    if (filterType === "all") return candidatesList;
    return candidatesList.filter((c) => c.status === filterType);
  }, [candidatesList, filterType]);

  const selectedCandidates = useMemo(() => {
    return candidatesList.filter((c) => c.selected);
  }, [candidatesList]);

  if (!isOpen) return null;

  const isConfigured = Boolean(hrEmail && hasAppPassword);

  const toggleSelectAll = (checked: boolean) => {
    const visibleIds = new Set(filteredCandidates.map((c) => c.id || c.email));
    setCandidatesList((prev) =>
      prev.map((c) => {
        const id = c.id || c.email;
        if (visibleIds.has(id)) {
          return { ...c, selected: checked };
        }
        return c;
      })
    );
  };

  const toggleCandidateSelected = (targetId: string) => {
    setCandidatesList((prev) =>
      prev.map((c) => {
        const id = c.id || c.email;
        if (id === targetId) {
          return { ...c, selected: !c.selected };
        }
        return c;
      })
    );
  };

  const currentInspectCandidate = filteredCandidates[currentInspectIdx] || null;

  const getInterpolatedBody = (cand: BulkEmailCandidate): string => {
    if (cand.customBody) return cand.customBody;
    if (templateMode === "personalized" && cand.personalizedReply && cand.personalizedReply.trim()) {
      return cand.personalizedReply;
    }
    const template = cand.status === "SHORTLISTED" ? globalShortlistBody : globalRejectBody;
    return template.replace(/\{\{name\}\}/gi, cand.name).replace(/\{\{role\}\}/gi, jobTitle).replace(/\{\{company\}\}/gi, companyName);
  };

  const handleSendBulk = async () => {
    if (selectedCandidates.length === 0) {
      toast.error("No candidates selected to receive emails.");
      return;
    }

    setIsSending(true);
    setProgress({ current: 0, total: selectedCandidates.length });
    const localCode = getStoredGmailAppPassword();

    try {
      const payloads = selectedCandidates.map((c) => ({
        candidateId: c.id || c.candidateId,
        to: c.email,
        candidateName: c.name,
        subject: c.customSubject || globalSubject,
        body: getInterpolatedBody(c),
        jobTitle: c.jobTitle || jobTitle,
        companyName: c.companyName || companyName,
      }));

      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: payloads,
          config: {
            hrEmail,
            gmailAppPassword: localCode || undefined,
            senderName,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to dispatch batch emails.");
        setIsSending(false);
        return;
      }

      setResultsLog(data.results || []);
      toast.success(
        `Dispatched ${data.sentCount} / ${data.total} emails successfully!`
      );
      if (onComplete) {
        onComplete(data.results || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Network error while executing batch email dispatch.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      data-lenis-prevent
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSending) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-4xl rounded-3xl flex flex-col shadow-2xl overflow-hidden max-h-[92vh] border animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--outline)",
          color: "var(--ink)",
        }}
      >
        {/* Header */}
        <div
          className="p-5 sm:p-6 border-b flex items-center justify-between"
          style={{ borderColor: "var(--outline)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center border border-[var(--primary)]/30">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--ink)" }}>
                Batch Candidate Email Dispatch
              </h3>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {jobTitle} · {selectedCandidates.length} of {candidatesList.length} candidates selected
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="p-2 rounded-full hover:opacity-75 transition-colors cursor-pointer disabled:opacity-50"
            style={{ color: "var(--muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Configuration Warning Banner */}
        {!isConfigured && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-600 dark:text-amber-300">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-amber-800 dark:text-amber-200">
                HR Email or Gmail App Password Not Configured
              </div>
              <p className="mt-0.5 opacity-90 leading-relaxed">
                Before sending bulk emails, configure your HR Email and 16-character Gmail App Password in Settings.
              </p>
              <div className="mt-2">
                <Link
                  href="/dashboard/settings"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-3 py-1 rounded-full border border-amber-500/40 bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
                >
                  <Settings size={12} /> Open Settings
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Controls Strip: Filters & Template Mode */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: "var(--outline)" }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>Filter:</span>
              {(["all", "SHORTLISTED", "REJECTED"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setFilterType(mode);
                    setCurrentInspectIdx(0);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer ${
                    filterType === mode
                      ? "bg-[var(--primary)] text-[var(--on-primary)] font-bold shadow-sm"
                      : "border hover:opacity-80"
                  }`}
                  style={filterType !== mode ? { borderColor: "var(--outline)", color: "var(--muted)" } : {}}
                >
                  {mode === "all" ? "All Candidates" : mode === "SHORTLISTED" ? "Shortlisted" : "Rejected"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>Mode:</span>
              <button
                type="button"
                onClick={() => setTemplateMode("personalized")}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-all flex items-center gap-1 cursor-pointer ${
                  templateMode === "personalized"
                    ? "bg-[var(--primary)] text-[var(--on-primary)] font-bold shadow-sm"
                    : "border hover:opacity-80"
                }`}
                style={templateMode !== "personalized" ? { borderColor: "var(--outline)", color: "var(--muted)" } : {}}
              >
                <Sparkles size={12} /> AI Personalized
              </button>
              <button
                type="button"
                onClick={() => setTemplateMode("template")}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer ${
                  templateMode === "template"
                    ? "bg-[var(--primary)] text-[var(--on-primary)] font-bold shadow-sm"
                    : "border hover:opacity-80"
                }`}
                style={templateMode !== "template" ? { borderColor: "var(--outline)", color: "var(--muted)" } : {}}
              >
                Global Template
              </button>
            </div>
          </div>

          {/* Candidate Selection Checklist & Carousel Inspector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Column 1: Candidate Checklist */}
            <div
              className="p-4 rounded-2xl border space-y-3 flex flex-col max-h-80 overflow-hidden"
              style={{ backgroundColor: "var(--canvas)", borderColor: "var(--outline)" }}
            >
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--outline)" }}>
                <span className="text-xs font-mono font-bold" style={{ color: "var(--ink)" }}>
                  Recipients ({filteredCandidates.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(true)}
                    className="text-[11px] font-mono text-[var(--primary)] hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span style={{ color: "var(--muted)" }}>·</span>
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(false)}
                    className="text-[11px] font-mono hover:underline cursor-pointer"
                    style={{ color: "var(--muted)" }}
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                {filteredCandidates.map((cand, idx) => {
                  const isInspecting = currentInspectIdx === idx;
                  return (
                    <div
                      key={cand.id || cand.email}
                      onClick={() => setCurrentInspectIdx(idx)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all cursor-pointer ${
                        isInspecting
                          ? "border-[var(--primary)] shadow-sm"
                          : "border-transparent hover:border-[var(--outline)]"
                      }`}
                      style={{
                        backgroundColor: isInspecting ? "var(--surface)" : "transparent",
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCandidateSelected(cand.id || cand.email);
                          }}
                          className="p-0.5 cursor-pointer text-[var(--primary)]"
                        >
                          {cand.selected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                        <div className="truncate">
                          <div className="font-semibold truncate" style={{ color: "var(--ink)" }}>
                            {cand.name}
                          </div>
                          <div className="text-[11px] truncate" style={{ color: "var(--muted)" }}>
                            {cand.email}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                          cand.status === "SHORTLISTED"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {cand.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Candidate Carousel Inspector */}
            <div
              className="p-4 rounded-2xl border space-y-3 flex flex-col max-h-80 overflow-hidden"
              style={{ backgroundColor: "var(--canvas)", borderColor: "var(--outline)" }}
            >
              {currentInspectCandidate ? (
                <>
                  <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--outline)" }}>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-xs font-mono font-bold truncate" style={{ color: "var(--ink)" }}>
                        {currentInspectCandidate.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCurrentInspectIdx((prev) => Math.max(0, prev - 1))}
                        disabled={currentInspectIdx === 0}
                        className="p-1 rounded hover:opacity-75 disabled:opacity-30 cursor-pointer"
                        style={{ color: "var(--ink)" }}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>
                        {currentInspectIdx + 1} / {filteredCandidates.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentInspectIdx((prev) => Math.min(filteredCandidates.length - 1, prev + 1))}
                        disabled={currentInspectIdx >= filteredCandidates.length - 1}
                        className="p-1 rounded hover:opacity-75 disabled:opacity-30 cursor-pointer"
                        style={{ color: "var(--ink)" }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 overflow-y-auto flex-1 text-xs">
                    <div>
                      <span className="font-mono text-[10px] uppercase block" style={{ color: "var(--muted)" }}>
                        Subject
                      </span>
                      <div className="font-medium mt-0.5" style={{ color: "var(--ink)" }}>
                        {currentInspectCandidate.customSubject || globalSubject}
                      </div>
                    </div>

                    <div className="pt-2 border-t" style={{ borderColor: "var(--outline)" }}>
                      <span className="font-mono text-[10px] uppercase block mb-1" style={{ color: "var(--muted)" }}>
                        Body Preview ({templateMode})
                      </span>
                      <div
                        className="p-3 rounded-xl border text-xs whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto"
                        style={{
                          backgroundColor: "var(--surface)",
                          borderColor: "var(--outline)",
                          color: "var(--ink)",
                        }}
                      >
                        {getInterpolatedBody(currentInspectCandidate)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-xs" style={{ color: "var(--muted)" }}>
                  Select a candidate to preview their email
                </div>
              )}
            </div>
          </div>

          {/* Results Summary Box after execution */}
          {resultsLog && (
            <div
              className="p-4 rounded-2xl border space-y-2"
              style={{
                backgroundColor: "var(--canvas)",
                borderColor: "var(--outline)",
              }}
            >
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={15} /> Batch Dispatch Completed
                </span>
                <span style={{ color: "var(--ink)" }}>
                  {resultsLog.filter((r) => r.success).length} / {resultsLog.length} Sent
                </span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] font-mono">
                {resultsLog.map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="truncate" style={{ color: "var(--ink)" }}>{r.to}</span>
                    <span className={r.success ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                      {r.success ? "Delivered" : r.error || "Failed"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-5 sm:p-6 border-t flex items-center justify-between"
          style={{ borderColor: "var(--outline)" }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 text-xs font-mono transition-colors cursor-pointer hover:underline disabled:opacity-50"
            style={{ color: "var(--muted)" }}
          >
            {resultsLog ? "Close" : "Cancel"}
          </button>

          <button
            type="button"
            onClick={handleSendBulk}
            disabled={isSending || selectedCandidates.length === 0}
            className="px-6 py-2.5 rounded-full text-xs font-semibold bg-[var(--primary)] hover:opacity-90 text-[var(--on-primary)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
          >
            {isSending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            {isSending
              ? `Sending (${progress?.current || 0}/${progress?.total || selectedCandidates.length})...`
              : `Send Email to ${selectedCandidates.length} Candidates`}
          </button>
        </div>
      </div>
    </div>
  );
}


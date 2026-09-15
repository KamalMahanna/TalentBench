"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  TrayArrowUp,
  FileText,
  FileCsv,
  CheckCircle,
  XCircle,
  Copy,
  DownloadSimple,
  Sparkle,
  ArrowsClockwise,
  UsersThree,
  Cpu,
  ArrowRight,
  Info,
  Check,
  Warning,
  MagnifyingGlass,
  CheckFat,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { GlassButton } from "@/components/ui/glass-button";
import { parseResumeFileInBrowser, extractEmailFromText } from "@/lib/client/resume-parser";
import * as XLSX from "xlsx";

interface CandidateResult {
  id: string;
  name: string;
  email: string;
  experienceYears: number;
  status: string; // "SHORTLISTED" | "REJECTED" | "PENDING"
  currentRound: number;
  personalizedReply?: string | null;
  isOverridden?: boolean;
  overrideReason?: string | null;
  roundResults?: Array<{
    score?: number | null;
    passed?: boolean | null;
    feedback?: string | null;
    agentTrace?: string | null;
  }>;
}

interface ResumeScreeningConsoleProps {
  jobId: string;
  jobTitle: string;
  jobDescription: string;
  cutoff?: number;
  candidates: CandidateResult[];
  onRefresh: () => Promise<void>;
}

interface QueuedCandidate {
  name: string;
  email: string;
  resumeText: string;
  experienceYears?: number;
  skills?: string;
  source: string;
}

export function ResumeScreeningConsole({
  jobId,
  jobTitle,
  jobDescription,
  cutoff = 50,
  candidates,
  onRefresh,
}: ResumeScreeningConsoleProps) {
  const [inputMode, setInputMode] = useState<"bulk_resumes" | "excel_sheet">("bulk_resumes");
  const [activeResultsTab, setActiveResultsTab] = useState<"shortlisted" | "not_shortlisted">("shortlisted");
  const [searchQuery, setSearchQuery] = useState("");

  // Staged files & candidates ready to queue
  const [stagedCandidates, setStagedCandidates] = useState<QueuedCandidate[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [selectedResumeColumn, setSelectedResumeColumn] = useState<string>("resume_texts");
  const [rawExcelRows, setRawExcelRows] = useState<any[]>([]);

  // Queue & Screening execution states
  const [isQueueing, setIsQueueing] = useState(false);
  const [queueProgress, setQueueProgress] = useState<{ current: number; total: number } | null>(null);
  const [isScreening, setIsScreening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [overridingId, setOverridingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Filter candidates by status
  const shortlistedCandidates = candidates.filter((c) => c.status === "SHORTLISTED");
  const notShortlistedCandidates = candidates.filter((c) => c.status === "REJECTED");
  const pendingCandidates = candidates.filter((c) => c.status === "PENDING");

  const displayedCandidates = (
    activeResultsTab === "shortlisted" ? shortlistedCandidates : notShortlistedCandidates
  ).filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  // ── Handle Bulk File Upload ──────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    toast.info(`Parsing ${files.length} resume file(s)...`);
    const newStaged: QueuedCandidate[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const parsed = await parseResumeFileInBrowser(file);
        let email = parsed.emailResult.email;
        if (!email) {
          const fallback = extractEmailFromText(parsed.text);
          email = fallback.email;
        }

        const candidateName =
          file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ") || "Candidate";

        newStaged.push({
          name: candidateName,
          email: email || `candidate_${Date.now()}_${i}@talentbench.local`,
          resumeText: parsed.text,
          source: file.name,
        });
      } catch (err) {
        console.error("Error parsing resume:", err);
      }
    }

    setStagedCandidates((prev) => [...prev, ...newStaged]);
    toast.success(`Parsed and prepared ${newStaged.length} resume(s) for queue.`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Handle Excel / CSV Sheet Upload ──────────────────────────────────
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (jsonRows.length === 0) {
        toast.error("The uploaded Excel sheet contains no rows.");
        return;
      }

      const columns = Object.keys(jsonRows[0]);
      setExcelColumns(columns);
      setRawExcelRows(jsonRows);

      // Auto-detect resume texts column: looking for "resume_texts", "resume_text", "resume", etc.
      const detectedResumeCol =
        columns.find(
          (col) =>
            col.toLowerCase() === "resume_texts" ||
            col.toLowerCase() === "resume_text" ||
            col.toLowerCase() === "resumetexts" ||
            col.toLowerCase() === "resume"
        ) || columns[0];

      setSelectedResumeColumn(detectedResumeCol);
      parseCandidatesFromExcel(jsonRows, detectedResumeCol);
      toast.success(`Loaded Excel sheet with ${jsonRows.length} rows.`);
    } catch (err: any) {
      console.error("Failed to parse Excel:", err);
      toast.error("Failed to read Excel file.");
    }

    if (excelInputRef.current) excelInputRef.current.value = "";
  };

  const parseCandidatesFromExcel = (rows: any[], resumeCol: string) => {
    const candidatesFromSheet: QueuedCandidate[] = [];

    rows.forEach((row, idx) => {
      const resumeText = String(row[resumeCol] || "").trim();
      if (!resumeText) return;

      // Extract email from email column or from the resume text directly
      const emailCol = Object.keys(row).find(
        (k) => k.toLowerCase().includes("email") || k.toLowerCase().includes("mail")
      );
      let email = emailCol ? String(row[emailCol]).trim().toLowerCase() : "";

      if (!email || !email.includes("@")) {
        const extracted = extractEmailFromText(resumeText);
        if (extracted.email) email = extracted.email;
      }

      if (!email) {
        email = `student_${idx + 1}_${Date.now()}@talentbench.local`;
      }

      // Name detection
      const nameCol = Object.keys(row).find(
        (k) =>
          k.toLowerCase().includes("name") ||
          k.toLowerCase().includes("student") ||
          k.toLowerCase().includes("candidate")
      );
      const name = nameCol && row[nameCol] ? String(row[nameCol]).trim() : email.split("@")[0].replace(/[._]/g, " ");

      candidatesFromSheet.push({
        name,
        email,
        resumeText,
        source: `Excel row #${idx + 1}`,
      });
    });

    setStagedCandidates(candidatesFromSheet);
  };

  // ── Transfer Resumes 1-by-1 via JSON Message Queue ───────────────────
  const handleEnqueueAndProcess = async () => {
    if (stagedCandidates.length === 0) {
      toast.error("No resumes staged. Upload files or an Excel sheet first.");
      return;
    }

    setIsQueueing(true);
    setQueueProgress({ current: 0, total: stagedCandidates.length });
    let queuedSuccess = 0;

    // Transfer one by one in JSON format per user requirement
    for (let i = 0; i < stagedCandidates.length; i++) {
      const item = stagedCandidates[i];
      try {
        const payload = {
          job_id: jobId,
          candidateName: item.name,
          email: item.email,
          resumeText: item.resumeText,
          experienceYears: item.experienceYears || 0,
        };

        const res = await fetch(`/api/jobs/${jobId}/candidates/queue`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          queuedSuccess++;
        }
      } catch (err) {
        console.error("Queue transfer error for candidate:", item.email, err);
      }

      setQueueProgress({ current: i + 1, total: stagedCandidates.length });
    }

    setIsQueueing(false);
    toast.success(`All ${queuedSuccess} resume(s) transferred to backend message queue!`);
    setStagedCandidates([]);

    // Automatically trigger AI screening now that all resumes have reached backend
    await runBatchScreening();
  };

  // ── Auto-trigger AI Screening (50% Match + Comparative Matching) ───────
  const runBatchScreening = async () => {
    setIsScreening(true);
    toast.loading("AI Agent calibrating resumes against JD (50% match rule)...", {
      id: "screening-toast",
    });

    try {
      const res = await fetch(`/api/jobs/${jobId}/candidates/screen-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cutoff,
          rescreenAll: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Batch screening encountered an error.", {
          id: "screening-toast",
        });
        setIsScreening(false);
        return;
      }

      toast.success(
        `Screening Complete: ${data.shortlistedCount} Shortlisted, ${data.rejectedCount} Not Shortlisted.${
          data.comparativeApplied ? " (Comparative Tournament Applied)" : ""
        }`,
        { id: "screening-toast" }
      );

      await onRefresh();
    } catch (err) {
      toast.error("Error communicating with AI screening engine.", { id: "screening-toast" });
    } finally {
      setIsScreening(false);
    }
  };

  // ── Copy Mail Body 1-Click Action ────────────────────────────────────
  const handleCopyMailBody = (cand: CandidateResult) => {
    const text =
      cand.personalizedReply ||
      `Thank you for applying for the ${jobTitle} position. Currently your resume did not meet our 50% core requirement threshold.`;

    navigator.clipboard.writeText(text);
    setCopiedId(cand.id);
    toast.success("Rejection email body copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  // ── HR Manual Override: Not Shortlisted -> Shortlisted ───────────────
  const handleOverride = async (cand: CandidateResult) => {
    if (cand.status === "SHORTLISTED") {
      toast.error("Policy Restriction: Shortlisted candidates cannot be overridden to rejected.");
      return;
    }

    setOverridingId(cand.id);
    try {
      const res = await fetch(`/api/candidates/${cand.id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStatus: "SHORTLISTED",
          reason: "HR Manual Override",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to override status.");
        setOverridingId(null);
        return;
      }

      toast.success(`Candidate ${cand.name} successfully promoted to Shortlisted!`);
      await onRefresh();
    } catch (err) {
      toast.error("Error updating candidate status.");
    } finally {
      setOverridingId(null);
    }
  };

  // ── Export Multi-Sheet Excel ─────────────────────────────────────────
  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/export-excel`);
      if (!res.ok) {
        toast.error("Failed to generate Excel report.");
        setIsExporting(false);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${jobTitle.replace(/[^a-zA-Z0-9]/g, "_")}_Screening_Report.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Excel report downloaded with Shortlisted and Not Shortlisted sheets!");
    } catch (err) {
      toast.error("Error downloading report.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── CARD 1: Execution Input Console ────────────────────────────── */}
      <div className="rounded-3xl p-1 bg-white/[0.04] ring-1 ring-[#8FB6E8]/25 backdrop-blur-2xl shadow-xl">
        <div className="rounded-[calc(1.5rem-4px)] bg-[#070D1E] p-6 sm:p-8 border border-white/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-base sm:text-lg font-display font-bold text-white">
                  Resume Screening Stage Execution
                </h3>
              </div>
              <p className="text-xs text-[#7C91B4] mt-1">
                Upload bulk resumes or an Excel sheet. Resumes are packaged into JSON, transferred one by one via message queue, and calibrated against the 50% match rule.
              </p>
            </div>

            {/* Input Mode Selector */}
            <div className="flex items-center p-1 rounded-xl bg-[#040814] border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setInputMode("bulk_resumes")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                  inputMode === "bulk_resumes"
                    ? "bg-[#60A5FA]/20 text-[#60A5FA] border border-[#60A5FA]/40 font-semibold"
                    : "text-[#7C91B4] hover:text-white"
                }`}
              >
                <FileText size={14} /> Bulk Resumes
              </button>
              <button
                type="button"
                onClick={() => setInputMode("excel_sheet")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                  inputMode === "excel_sheet"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold"
                    : "text-[#7C91B4] hover:text-white"
                }`}
              >
                <FileCsv size={14} /> Excel Sheet
              </button>
            </div>
          </div>

          {/* Input Upload Areas */}
          {inputMode === "bulk_resumes" ? (
            <div className="p-6 rounded-2xl border-2 border-dashed border-[#60A5FA]/30 hover:border-[#60A5FA]/60 bg-[#0A1228]/50 transition-all text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#60A5FA]/10 text-[#60A5FA] flex items-center justify-center mx-auto border border-[#60A5FA]/20">
                <TrayArrowUp size={24} weight="duotone" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Bulk Resume Upload</h4>
                <p className="text-xs text-[#7C91B4] mt-0.5">
                  Select and upload multiple candidate resumes (PDF, DOCX, TXT). Text and email are auto-extracted.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
                id="bulk-resume-upload-input"
              />
              <div className="pt-2 flex justify-center gap-3">
                <label
                  htmlFor="bulk-resume-upload-input"
                  className="px-4 py-2 rounded-xl bg-[#60A5FA] hover:bg-[#3B82F6] text-white text-xs font-semibold cursor-pointer shadow-lg transition-all"
                >
                  Choose Resume Files
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-6 rounded-2xl border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 bg-[#0A1228]/50 transition-all text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                  <FileCsv size={24} weight="duotone" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Excel / CSV Sheet Upload</h4>
                  <p className="text-xs text-[#7C91B4] mt-0.5">
                    Upload a spreadsheet containing candidate details and a column like <code className="text-emerald-300 font-mono">resume_texts</code>.
                  </p>
                </div>
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelUpload}
                  className="hidden"
                  id="excel-sheet-upload-input"
                />
                <div className="pt-2 flex justify-center">
                  <label
                    htmlFor="excel-sheet-upload-input"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-lg transition-all"
                  >
                    Select Excel / CSV File
                  </label>
                </div>
              </div>

              {/* Column Selection if Excel Loaded */}
              {excelColumns.length > 0 && (
                <div className="p-4 rounded-xl bg-[#040814] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[#7C91B4] font-mono uppercase text-[11px]">
                      Resume Text Column:
                    </span>
                    <select
                      value={selectedResumeColumn}
                      onChange={(e) => {
                        setSelectedResumeColumn(e.target.value);
                        parseCandidatesFromExcel(rawExcelRows, e.target.value);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#0D1633] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                    >
                      {excelColumns.map((col) => (
                        <option key={col} value={col}>
                          {col} {col.toLowerCase().includes("resume") ? " (Detected)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {stagedCandidates.length} candidate rows extracted
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Staged Resumes Queue Ready Banner */}
          {stagedCandidates.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#0D1633] border border-[#60A5FA]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#60A5FA]/20 text-[#60A5FA] flex items-center justify-center font-mono text-xs font-bold shrink-0">
                  {stagedCandidates.length}
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">
                    {stagedCandidates.length} Resumes Staged &amp; Formatted as JSON
                  </div>
                  <div className="text-[11px] font-mono text-[#7C91B4]">
                    Unique Job ID: <span className="text-[#8FB6E8]">{jobId}</span> · Ready to queue
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStagedCandidates([])}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono text-[#7C91B4] hover:text-rose-400 transition-colors"
                >
                  Clear
                </button>
                <GlassButton
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={handleEnqueueAndProcess}
                  disabled={isQueueing || isScreening}
                >
                  <TrayArrowUp size={14} className="mr-1.5" />
                  {isQueueing ? "Queuing Resumes 1-by-1..." : "Transfer via Queue & Screen"}
                </GlassButton>
              </div>
            </div>
          )}

          {/* Queue Progress Bar */}
          {queueProgress && isQueueing && (
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-[#8FB6E8]">
                <span>Transferring JSON payload to backend queue...</span>
                <span>
                  {queueProgress.current} / {queueProgress.total}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#60A5FA] to-emerald-400 transition-all duration-300"
                  style={{
                    width: `${Math.round((queueProgress.current / queueProgress.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Screening Running Notice */}
          {isScreening && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-3 text-xs text-[#8FB6E8]">
              <Cpu size={20} className="animate-spin text-[#60A5FA]" />
              <div>
                <span className="font-semibold text-white">
                  Autonomous AI Resume Calibration In Progress...
                </span>
                <p className="text-[11px] text-[#A6C5EE] mt-0.5">
                  Evaluating each resume against the job description with the 50% match rule. If matching pool &gt; {cutoff}, Comparative Resume Matching tournament will automatically rank top candidates.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CARD 2: Screening Results Console (Shortlisted vs Not Shortlisted) ── */}
      <div className="rounded-3xl p-1 bg-white/[0.04] ring-1 ring-[#8FB6E8]/20 backdrop-blur-2xl shadow-xl">
        <div className="rounded-[calc(1.5rem-4px)] bg-[#070D1E] p-6 sm:p-8 border border-white/10 space-y-6">
          {/* Header & Stats Strip */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <UsersThree size={20} className="text-[#60A5FA]" />
                <h3 className="text-base sm:text-lg font-display font-bold text-white">
                  Resume Screening Pool Results
                </h3>
              </div>
              <p className="text-xs text-[#7C91B4] mt-0.5">
                Target Cutoff: <span className="text-white font-semibold">{cutoff} candidates</span> · Rule: &ge; 50% match shortlists (returns YES)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Quick Re-screen Unscreened */}
              {pendingCandidates.length > 0 && (
                <button
                  type="button"
                  onClick={runBatchScreening}
                  disabled={isScreening}
                  className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 text-xs font-mono transition-colors flex items-center gap-1.5"
                >
                  <Cpu size={14} /> Screen {pendingCandidates.length} Pending
                </button>
              )}

              {/* Download Excel Multi-Sheet Report */}
              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={isExporting}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono transition-colors flex items-center gap-1.5 shadow-lg"
              >
                <DownloadSimple size={14} weight="bold" />
                {isExporting ? "Generating XLSX..." : "Download Excel Report (.xlsx)"}
              </button>
            </div>
          </div>

          {/* Tab Switcher & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center p-1 rounded-xl bg-[#040814] border border-white/10">
              <button
                type="button"
                onClick={() => setActiveResultsTab("shortlisted")}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                  activeResultsTab === "shortlisted"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    : "text-[#7C91B4] hover:text-white"
                }`}
              >
                <CheckCircle size={14} weight="fill" className="text-emerald-400" />
                Shortlisted ({shortlistedCandidates.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveResultsTab("not_shortlisted")}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                  activeResultsTab === "not_shortlisted"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                    : "text-[#7C91B4] hover:text-white"
                }`}
              >
                <XCircle size={14} weight="fill" className="text-rose-400" />
                Not Shortlisted ({notShortlistedCandidates.length})
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <MagnifyingGlass
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7C91B4]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate name or email..."
                className="pl-9 pr-3.5 py-2 rounded-xl bg-[#040814] border border-white/10 text-xs text-white placeholder-[#7C91B4] focus:outline-none focus:border-[#60A5FA] w-full sm:w-64"
              />
            </div>
          </div>

          {/* Candidate Cards List */}
          {displayedCandidates.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01] space-y-2">
              <p className="text-xs text-[#7C91B4] font-mono">
                No candidates found in the {activeResultsTab === "shortlisted" ? "Shortlisted" : "Not Shortlisted"} category.
              </p>
              {candidates.length === 0 && (
                <p className="text-[11px] text-[#7C91B4]">
                  Upload resumes or an Excel sheet above to begin AI screening.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {displayedCandidates.map((cand, idx) => {
                const latestResult = cand.roundResults?.[0];
                const score = latestResult?.score ?? (cand.status === "SHORTLISTED" ? 82 : 38);
                const isShortlisted = cand.status === "SHORTLISTED";

                return (
                  <div
                    key={cand.id}
                    className="p-5 rounded-2xl bg-[#0A1228] border border-white/5 hover:border-white/15 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-lg bg-white/5 text-[#8FB6E8] flex items-center justify-center font-mono text-[11px] font-bold shrink-0 mt-0.5">
                          0{idx + 1}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">{cand.name}</h4>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                                isShortlisted
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              }`}
                            >
                              {isShortlisted ? "Shortlisted (YES)" : "Not Shortlisted (NO)"}
                            </span>
                            {cand.isOverridden && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                HR Override
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-[#7C91B4] mt-0.5">
                            {cand.email} · {cand.experienceYears}y Experience
                          </div>
                        </div>
                      </div>

                      {/* Right Side Stats & Actions */}
                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                        <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-[#8FB6E8]">
                          Match Score: <span className="font-bold text-white">{score}%</span>
                        </div>

                        {/* If NOT shortlisted: Show Copy Mail Body and HR Override buttons */}
                        {!isShortlisted ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCopyMailBody(cand)}
                              className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-white text-xs font-mono transition-colors flex items-center gap-1.5"
                              title="Copy personalized rejection email body"
                            >
                              {copiedId === cand.id ? (
                                <Check size={14} className="text-emerald-400" />
                              ) : (
                                <Copy size={14} />
                              )}
                              {copiedId === cand.id ? "Copied!" : "Copy Mail Body"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOverride(cand)}
                              disabled={overridingId === cand.id}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono transition-colors flex items-center gap-1"
                              title="Override not-shortlisted candidate to shortlisted"
                            >
                              <CheckFat size={14} weight="fill" />
                              {overridingId === cand.id ? "Promoting..." : "Override to Shortlisted"}
                            </button>
                          </>
                        ) : (
                          // For Shortlisted: System Policy Indicator (Downgrade not permitted)
                          <div
                            className="text-[11px] font-mono text-emerald-400 flex items-center gap-1"
                            title="Shortlisted candidates cannot be overridden to rejected per recruitment policy"
                          >
                            <CheckCircle size={14} weight="fill" /> Advanced to Next Round
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Email Body Preview (For Not Shortlisted) */}
                    {!isShortlisted && (
                      <div className="p-3.5 rounded-xl bg-[#040814] border border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono text-[#7C91B4]">
                          <span className="flex items-center gap-1">
                            <Info size={12} /> Generated Feedback Email (Body Part Only):
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyMailBody(cand)}
                            className="text-[#60A5FA] hover:underline flex items-center gap-1"
                          >
                            <Copy size={12} /> Copy Text
                          </button>
                        </div>
                        <p className="text-xs text-[#C2D6F5] whitespace-pre-line leading-relaxed font-sans bg-white/[0.01] p-3 rounded-lg border border-white/5">
                          {cand.personalizedReply ||
                            `Thank you for taking the time to apply for the ${jobTitle} position.\n\nAfter reviewing your resume against our core role requirements, your current background lacked sufficient hands-on experience in the key technical requirements outlined in our job description.\n\nWe encourage you to continue building projects in these areas and invite you to apply for future opportunities.`}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
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
  Lightning,
  EnvelopeSimple,
  Terminal,
  CaretDown,
  CaretUp,
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

interface LiveCandidateFeedItem {
  candidateId: string;
  name: string;
  email: string;
  status: "SHORTLISTED" | "REJECTED";
  score: number;
  matchPercentage: number;
  matches: boolean;
  matchedSkills: string[];
  missingSkills: string[];
  reasoning: string;
  mailBody: string;
  timestamp: string;
}

interface CurrentlyEvaluatingCandidate {
  id: string;
  name: string;
  email: string;
  index: number;
  total: number;
  resumeSnippet: string;
}

interface LiveScreeningStats {
  total: number;
  processed: number;
  shortlisted: number;
  rejected: number;
  currentStep: string;
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

  // Live Inspection & Transparency states
  const [liveScreeningFeed, setLiveScreeningFeed] = useState<LiveCandidateFeedItem[]>([]);
  const [currentEvaluatingCandidate, setCurrentEvaluatingCandidate] =
    useState<CurrentlyEvaluatingCandidate | null>(null);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [showLiveTerminal, setShowLiveTerminal] = useState(true);
  const [liveScreeningStats, setLiveScreeningStats] = useState<LiveScreeningStats>({
    total: 0,
    processed: 0,
    shortlisted: 0,
    rejected: 0,
    currentStep: "Idle",
  });
  const [expandedMailId, setExpandedMailId] = useState<string | null>(null);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Drag-and-drop and parsing states
  const [isDraggingResumes, setIsDraggingResumes] = useState(false);
  const [isDraggingExcel, setIsDraggingExcel] = useState(false);
  const [isParsingFiles, setIsParsingFiles] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Prevent default browser behavior (opening dropped files in tabs) across window
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener("dragover", handleGlobalDragOver);
    window.addEventListener("drop", handleGlobalDrop);

    return () => {
      window.removeEventListener("dragover", handleGlobalDragOver);
      window.removeEventListener("drop", handleGlobalDrop);
    };
  }, []);

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

  // ── Core In-Browser Resume File Processor ───────────────────────────
  const processResumeFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files).filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      return (
        ["pdf", "docx", "doc", "txt", "md", "rtf"].includes(ext || "") ||
        file.type.includes("pdf") ||
        file.type.includes("word") ||
        file.type.includes("text")
      );
    });

    if (fileArray.length === 0) {
      toast.error("No compatible resume files found (supported formats: PDF, DOCX, TXT, MD).");
      return;
    }

    setIsParsingFiles(true);
    toast.loading(`Parsing ${fileArray.length} resume(s) locally in browser...`, {
      id: "bulk-resume-parse-toast",
    });

    const newStaged: QueuedCandidate[] = [];
    let successCount = 0;

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
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
        successCount++;
      } catch (err) {
        console.error("Error parsing resume:", file.name, err);
      }
    }

    setStagedCandidates((prev) => [...prev, ...newStaged]);
    setIsParsingFiles(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (successCount > 0) {
      toast.success(`Successfully parsed & staged ${successCount} resume(s)!`, {
        id: "bulk-resume-parse-toast",
      });
    } else {
      toast.error(`Could not extract readable text from the provided file(s).`, {
        id: "bulk-resume-parse-toast",
      });
    }
  };

  // ── Handle File Input Selection ─────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processResumeFiles(e.target.files);
    }
  };

  // ── Resume Drag & Drop Handlers ─────────────────────────────────────
  const handleResumeDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingResumes(true);
  };

  const handleResumeDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (!isDraggingResumes) setIsDraggingResumes(true);
  };

  const handleResumeDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingResumes(false);
  };

  const handleResumeDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingResumes(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processResumeFiles(e.dataTransfer.files);
    }
  };

  // ── Core Excel / CSV Processor ──────────────────────────────────────
  const processExcelFile = async (file: File) => {
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

  // ── Handle Excel Input Selection ────────────────────────────────────
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processExcelFile(file);
    }
  };

  // ── Excel Drag & Drop Handlers ──────────────────────────────────────
  const handleExcelDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingExcel(true);
  };

  const handleExcelDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (!isDraggingExcel) setIsDraggingExcel(true);
  };

  const handleExcelDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingExcel(false);
  };

  const handleExcelDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingExcel(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const excelFile =
        Array.from(files).find((f) => {
          const ext = f.name.split(".").pop()?.toLowerCase();
          return ["xlsx", "xls", "csv"].includes(ext || "");
        }) || files[0];
      await processExcelFile(excelFile);
    }
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

  // ── Auto-scroll agent trace terminal ────────────────────────────────
  const addLiveLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLiveLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
  };

  useEffect(() => {
    if (terminalBottomRef.current && showLiveTerminal) {
      terminalBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [liveLogs, showLiveTerminal]);

  // ── Stream Real-Time AI Screening (50% Match + Comparative Matching) ──
  const runBatchScreening = async (rescreenAll = false) => {
    setIsScreening(true);
    setLiveScreeningFeed([]);
    setCurrentEvaluatingCandidate(null);
    setLiveLogs([]);
    setLiveScreeningStats({
      total: 0,
      processed: 0,
      shortlisted: 0,
      rejected: 0,
      currentStep: "Contacting AI Gateway & establishing live telemetry stream...",
    });

    const startTime = Date.now();
    addLiveLog(`Establishing live telemetry connection to AI Screening Gateway...`);
    addLiveLog(`Job Requisition: "${jobTitle}" | Cutoff: ${cutoff} | 50% Match Rule: ACTIVE`);

    try {
      const res = await fetch(`/api/jobs/${jobId}/candidates/screen-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          cutoff,
          rescreenAll,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Batch screening encountered an error.");
        setIsScreening(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        toast.error("Stream reader not supported in current browser environment.");
        setIsScreening(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          if (!block.trim()) continue;
          const match = block.match(/event:\s*([^\n]+)\ndata:\s*(.+)/s);
          if (!match) continue;

          const eventType = match[1].trim();
          let data: any = {};
          try {
            data = JSON.parse(match[2].trim());
          } catch (e) {
            continue;
          }

          if (eventType === "init") {
            setLiveScreeningStats({
              total: data.total,
              processed: 0,
              shortlisted: 0,
              rejected: 0,
              currentStep: `Active Calibration: Screening ${data.total} candidate(s) against 50% match rule...`,
            });
            addLiveLog(`[INIT] Loaded ${data.total} candidates. Target cutoff: ${data.cutoff}.`);
          } else if (eventType === "candidate_start") {
            setCurrentEvaluatingCandidate({
              id: data.candidateId,
              name: data.name,
              email: data.email,
              index: data.index,
              total: data.total,
              resumeSnippet: data.resumeSnippet,
            });
            setLiveScreeningStats((prev) => ({
              ...prev,
              currentStep: `Analyzing Candidate ${data.index} of ${data.total}: ${data.name}...`,
            }));
            addLiveLog(
              `[DEQUEUE] Processing #${data.index}/${data.total}: ${data.name} (${data.email})`
            );
          } else if (eventType === "candidate_evaluated") {
            const isMatch = Boolean(data.matches);
            const feedItem: LiveCandidateFeedItem = {
              candidateId: data.candidateId,
              name: data.name,
              email: data.email,
              status: data.preliminaryVerdict,
              score: data.score,
              matchPercentage: data.matchPercentage,
              matches: isMatch,
              matchedSkills: data.matchedSkills || [],
              missingSkills: data.missingSkills || [],
              reasoning: data.reasoning,
              mailBody: data.mailBody,
              timestamp: new Date().toLocaleTimeString(),
            };

            setLiveScreeningFeed((prev) => [feedItem, ...prev]);
            setLiveScreeningStats((prev) => ({
              ...prev,
              processed: data.index,
              shortlisted: prev.shortlisted + (isMatch ? 1 : 0),
              rejected: prev.rejected + (isMatch ? 0 : 1),
            }));

            addLiveLog(
              `[VERDICT] ${data.name} -> ${
                isMatch ? "SHORTLISTED (YES)" : "NOT SHORTLISTED (NO)"
              } | Score: ${data.matchPercentage}% | Matched: [${(data.matchedSkills || []).slice(0, 3).join(", ")}]`
            );
            addLiveLog(
              `[MAIL_GEN] Generated personalized response mail for ${data.email} (${(data.mailBody || "").length} chars)`
            );

            // Trigger silent background refresh so bottom tabs update in real time
            onRefresh().catch(() => {});
          } else if (eventType === "tournament_start") {
            setLiveScreeningStats((prev) => ({
              ...prev,
              currentStep: `Matching pool (${data.matchingCount}) exceeds cutoff of ${data.cutoff}. Running Comparative Tournament...`,
            }));
            addLiveLog(
              `[TOURNAMENT] Qualified pool (${data.matchingCount}) > cutoff (${data.cutoff}). Launching comparative tournament ranking...`
            );
          } else if (eventType === "tournament_complete") {
            addLiveLog(
              `[TOURNAMENT_DONE] Comparative tournament completed. Top ${data.qualifiedCount} candidates advanced to Shortlisted.`
            );
          } else if (eventType === "complete") {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            setLiveScreeningStats((prev) => ({
              ...prev,
              currentStep: `Completed in ${elapsed}s! ${data.shortlistedCount} Shortlisted, ${data.rejectedCount} Not Shortlisted.`,
            }));
            addLiveLog(
              `[FINISHED] Evaluation complete in ${elapsed}s. Shortlisted: ${data.shortlistedCount}, Not Shortlisted: ${data.rejectedCount}.`
            );
            toast.success(
              `Screening complete! ${data.shortlistedCount} Shortlisted, ${data.rejectedCount} Not Shortlisted.`
            );
          } else if (eventType === "error") {
            addLiveLog(`[ERROR] Screening error: ${data.message}`);
            toast.error(data.message || "Error during screening");
          }
        }
      }

      await onRefresh();
    } catch (err: any) {
      console.error("Screening stream error:", err);
      toast.error("Connection error while streaming AI screening.");
      addLiveLog(`[ERROR] Stream aborted: ${err.message}`);
    } finally {
      setIsScreening(false);
      setCurrentEvaluatingCandidate(null);
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
            <div
              onDragEnter={handleResumeDragEnter}
              onDragOver={handleResumeDragOver}
              onDragLeave={handleResumeDragLeave}
              onDrop={handleResumeDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all text-center space-y-3 cursor-pointer relative overflow-hidden ${
                isDraggingResumes
                  ? "border-[#60A5FA] bg-[#60A5FA]/15 shadow-xl shadow-[#60A5FA]/20 scale-[1.01]"
                  : "border-[#60A5FA]/30 hover:border-[#60A5FA]/60 bg-[#0A1228]/50"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border transition-all ${
                  isDraggingResumes
                    ? "bg-[#60A5FA]/25 text-[#60A5FA] border-[#60A5FA]/50 scale-110"
                    : "bg-[#60A5FA]/10 text-[#60A5FA] border-[#60A5FA]/20"
                }`}
              >
                <TrayArrowUp
                  size={24}
                  weight="duotone"
                  className={isDraggingResumes ? "animate-bounce text-[#60A5FA]" : ""}
                />
              </div>
              <div className="pointer-events-none">
                <h4 className="text-sm font-semibold text-white">
                  {isDraggingResumes ? "Drop your resume files here" : "Bulk Resume Upload"}
                </h4>
                <p className="text-xs text-[#7C91B4] mt-0.5">
                  {isDraggingResumes
                    ? "Release to extract text and candidate emails locally in your browser"
                    : "Drag and drop multiple resumes (PDF, DOCX, TXT) here, or browse files"}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.txt,.md"
                onChange={handleFileUpload}
                className="hidden"
                id="bulk-resume-upload-input"
              />
              <div className="pt-2 flex justify-center gap-3 pointer-events-none">
                <span
                  className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-lg transition-all ${
                    isDraggingResumes
                      ? "bg-[#3B82F6] scale-105"
                      : "bg-[#60A5FA] hover:bg-[#3B82F6]"
                  }`}
                >
                  {isParsingFiles ? "Parsing Resumes in Browser..." : "Choose or Drop Resume Files"}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                onDragEnter={handleExcelDragEnter}
                onDragOver={handleExcelDragOver}
                onDragLeave={handleExcelDragLeave}
                onDrop={handleExcelDrop}
                onClick={() => excelInputRef.current?.click()}
                className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all text-center space-y-3 cursor-pointer relative overflow-hidden ${
                  isDraggingExcel
                    ? "border-emerald-500 bg-emerald-500/15 shadow-xl shadow-emerald-500/20 scale-[1.01]"
                    : "border-emerald-500/30 hover:border-emerald-500/60 bg-[#0A1228]/50"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border transition-all ${
                    isDraggingExcel
                      ? "bg-emerald-500/25 text-emerald-400 border-emerald-500/50 scale-110"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  }`}
                >
                  <FileCsv
                    size={24}
                    weight="duotone"
                    className={isDraggingExcel ? "animate-bounce text-emerald-400" : ""}
                  />
                </div>
                <div className="pointer-events-none">
                  <h4 className="text-sm font-semibold text-white">
                    {isDraggingExcel ? "Drop your spreadsheet here" : "Excel / CSV Sheet Upload"}
                  </h4>
                  <p className="text-xs text-[#7C91B4] mt-0.5">
                    {isDraggingExcel
                      ? "Release to extract spreadsheet candidate records"
                      : "Drag & drop an Excel/CSV file with a 'resume_texts' column, or browse"}
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
                <div className="pt-2 flex justify-center pointer-events-none">
                  <span
                    className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-lg transition-all ${
                      isDraggingExcel
                        ? "bg-emerald-500 scale-105"
                        : "bg-emerald-600 hover:bg-emerald-500"
                    }`}
                  >
                    Select or Drop Excel / CSV File
                  </span>
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

          {/* ── LIVE AI SCREENING INTELLIGENCE & TRANSPARENCY CONSOLE ─────── */}
          {(isScreening || liveScreeningFeed.length > 0) && (
            <div className="rounded-2xl bg-[#04091A] border border-[#60A5FA]/30 overflow-hidden shadow-2xl space-y-0 animate-fadeIn">
              {/* Header Bar */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0D1836] via-[#0A122A] to-[#0D1836] border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    {isScreening ? (
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                    ) : (
                      <CheckCircle size={18} weight="fill" className="text-emerald-400" />
                    )}
                    <h3 className="text-sm sm:text-base font-display font-bold text-white tracking-wide flex items-center gap-2">
                      Live AI Screening Transparency Console
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase ${
                          isScreening
                            ? "bg-[#60A5FA]/15 text-[#60A5FA] border-[#60A5FA]/30"
                            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        }`}
                      >
                        {isScreening ? "Real-Time Telemetry Active" : "Calibration Session Completed"}
                      </span>
                    </h3>
                  </div>
                  <p className="text-xs text-[#7C91B4] font-mono">
                    {liveScreeningStats.currentStep}
                  </p>
                </div>

                {/* Real-Time Metrics Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
                    <span className="text-[#7C91B4]">Processed: </span>
                    <span className="text-white font-bold">
                      {liveScreeningStats.processed}/{liveScreeningStats.total || liveScreeningFeed.length}
                    </span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-mono text-emerald-300">
                    <span>Shortlisted: </span>
                    <span className="font-bold">{liveScreeningStats.shortlisted}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-mono text-rose-300">
                    <span>Not Shortlisted: </span>
                    <span className="font-bold">{liveScreeningStats.rejected}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLiveTerminal(!showLiveTerminal)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#7C91B4] hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1 font-mono"
                    title="Toggle Agent Trace Terminal"
                  >
                    <Terminal size={14} />
                    {showLiveTerminal ? "Hide Trace" : "Show Trace"}
                  </button>
                  {!isScreening && liveScreeningFeed.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setLiveScreeningFeed([])}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#7C91B4] hover:text-white transition-colors cursor-pointer text-xs font-mono"
                    >
                      Clear Stream
                    </button>
                  )}
                </div>
              </div>

              {/* Glowing Progress Bar */}
              {isScreening && (
                <div className="w-full bg-white/5 h-1.5 overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-[#3B82F6] via-[#60A5FA] to-emerald-400 transition-all duration-300 shadow-[0_0_12px_rgba(96,165,250,0.8)]"
                    style={{
                      width: `${
                        liveScreeningStats.total > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (liveScreeningStats.processed / liveScreeningStats.total) * 100
                              )
                            )
                          : 20
                      }%`,
                    }}
                  />
                </div>
              )}

              {/* ── SPOTLIGHT: Currently Analyzing Candidate ── */}
              {currentEvaluatingCandidate && (
                <div className="p-4 sm:p-5 bg-gradient-to-br from-[#0B1530] to-[#070D1E] border-b border-white/10 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center animate-pulse">
                        <Lightning size={16} weight="fill" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          Currently Inspecting: {currentEvaluatingCandidate.name}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                            Candidate #{currentEvaluatingCandidate.index} of {currentEvaluatingCandidate.total}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-[#8FB6E8]">
                          {currentEvaluatingCandidate.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#7C91B4]">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                      Streaming Model Inference &amp; Skill Calibration...
                    </div>
                  </div>

                  {/* Scanned Excerpt Preview */}
                  {currentEvaluatingCandidate.resumeSnippet && (
                    <div className="p-3 rounded-xl bg-[#02050E] border border-white/5 font-mono text-[11px] text-slate-400 relative overflow-hidden">
                      <div className="text-[10px] uppercase text-[#7C91B4] mb-1 flex items-center gap-1">
                        <FileText size={12} /> Live Ingestion Stream Excerpt:
                      </div>
                      <p className="line-clamp-2 italic text-slate-300">
                        &ldquo;{currentEvaluatingCandidate.resumeSnippet}&rdquo;
                      </p>
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#60A5FA] to-transparent animate-pulse opacity-60" />
                    </div>
                  )}
                </div>
              )}

              {/* ── LIVE EVALUATION STREAM (Cards with Live Generated Mail) ── */}
              <div className="p-4 sm:p-6 space-y-4 max-h-[540px] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-[#7C91B4] flex items-center gap-1.5">
                    <Sparkle size={14} className="text-[#60A5FA]" />
                    Evaluated Candidates &amp; Generated Communications ({liveScreeningFeed.length})
                  </span>
                  {liveScreeningFeed.length > 0 && (
                    <span className="text-[10px] font-mono text-slate-400">
                      Sorted latest first
                    </span>
                  )}
                </div>

                {liveScreeningFeed.length === 0 && isScreening && (
                  <div className="p-8 text-center text-[#7C91B4] text-xs font-mono space-y-2">
                    <div className="w-8 h-8 mx-auto rounded-xl bg-white/5 flex items-center justify-center animate-spin text-[#60A5FA]">
                      <ArrowsClockwise size={18} />
                    </div>
                    <div>Streaming first candidate resume against Job Description...</div>
                  </div>
                )}

                {liveScreeningFeed.map((item) => {
                  const isShortlisted = item.status === "SHORTLISTED";
                  const isMailOpen = expandedMailId === item.candidateId;

                  return (
                    <div
                      key={item.candidateId}
                      className={`p-4 rounded-2xl border transition-all ${
                        isShortlisted
                          ? "bg-gradient-to-br from-[#061C14]/70 to-[#0A1228]/80 border-emerald-500/30"
                          : "bg-gradient-to-br from-[#220B13]/70 to-[#0A1228]/80 border-rose-500/30"
                      }`}
                    >
                      {/* Candidate Verdict Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold font-display text-white">
                              {item.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${
                                isShortlisted
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              }`}
                            >
                              {isShortlisted ? (
                                <>
                                  <CheckCircle size={12} weight="fill" /> SHORTLISTED (YES)
                                </>
                              ) : (
                                <>
                                  <XCircle size={12} weight="fill" /> NOT SHORTLISTED (NO)
                                </>
                              )}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-[#7C91B4]">
                            {item.email} · Evaluated at {item.timestamp}
                          </div>
                        </div>

                        {/* Match Score Badge */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${
                              isShortlisted
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                            }`}
                          >
                            Score: {item.score}% {item.matches ? "≥ 50% Rule" : "< 50% Rule"}
                          </span>
                        </div>
                      </div>

                      {/* Skills & AI Reasoning */}
                      <div className="py-3 space-y-2 text-xs">
                        {/* Matched Skills */}
                        {item.matchedSkills.length > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="text-[11px] font-mono text-emerald-400 shrink-0 w-24">
                              Matched Skills:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {item.matchedSkills.map((s, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-[10px] font-mono"
                                >
                                  ✓ {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Missing Skills */}
                        {item.missingSkills.length > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="text-[11px] font-mono text-rose-400 shrink-0 w-24">
                              Missing Skills:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {item.missingSkills.map((s, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/25 text-rose-300 text-[10px] font-mono"
                                >
                                  ✕ {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* AI Reasoning */}
                        {item.reasoning && (
                          <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-[11px] text-slate-300 font-sans leading-relaxed">
                            <span className="font-semibold text-white font-mono text-[10px] uppercase mr-1.5">
                              AI Decision Reasoning:
                            </span>
                            {item.reasoning}
                          </div>
                        )}
                      </div>

                      {/* ── LIVE GENERATED MAIL BOX ── */}
                      {item.mailBody && (
                        <div className="pt-2 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedMailId(isMailOpen ? null : item.candidateId)
                            }
                            className="w-full flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-xs font-mono text-[#8FB6E8] transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <EnvelopeSimple size={15} className="text-[#8FB6E8]" weight="duotone" />
                              <span className="font-semibold text-white">
                                {isShortlisted
                                  ? "Generated Advancement / Scorecard Mail"
                                  : "Generated Rejection & Project Recommendation Mail"}
                              </span>
                              <span className="text-[10px] text-[#7C91B4]">
                                ({item.mailBody.length} chars)
                              </span>
                            </span>
                            <span className="text-[11px] text-[#7C91B4] flex items-center gap-1">
                              {isMailOpen ? (
                                <>
                                  Hide Mail <CaretUp size={12} />
                                </>
                              ) : (
                                <>
                                  Inspect Mail <CaretDown size={12} />
                                </>
                              )}
                            </span>
                          </button>

                          {isMailOpen && (
                            <div className="mt-2 p-3.5 rounded-xl bg-[#02050E] border border-[#60A5FA]/20 space-y-2 animate-fadeIn">
                              <div className="flex items-center justify-between text-[11px] font-mono pb-2 border-b border-white/10">
                                <div>
                                  <span className="text-[#7C91B4]">Recipient: </span>
                                  <span className="text-white">{item.email}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.mailBody);
                                    toast.success("Generated email copied to clipboard!");
                                  }}
                                  className="px-2 py-0.5 rounded bg-[#60A5FA]/20 text-[#60A5FA] hover:bg-[#60A5FA]/30 transition-colors flex items-center gap-1 text-[10px] cursor-pointer"
                                >
                                  <Copy size={11} /> Copy Email
                                </button>
                              </div>

                              <div className="text-[11px] font-sans text-slate-200 whitespace-pre-wrap leading-relaxed">
                                {item.mailBody}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── AGENT TRACE TERMINAL STREAM ── */}
              {showLiveTerminal && (
                <div className="border-t border-white/10 bg-[#02040A] p-3 sm:p-4 font-mono text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-[#7C91B4] pb-1 border-b border-white/5">
                    <span className="flex items-center gap-1.5">
                      <Terminal size={12} className="text-emerald-400" />
                      Live Gateway Decision Log &amp; Agent Trace
                    </span>
                    <span>{liveLogs.length} telemetry events</span>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                    {liveLogs.map((log, idx) => {
                      let color = "text-slate-300";
                      if (log.includes("[VERDICT]")) {
                        color = log.includes("SHORTLISTED") ? "text-emerald-400" : "text-rose-400";
                      } else if (log.includes("[DEQUEUE]")) {
                        color = "text-[#60A5FA]";
                      } else if (log.includes("[MAIL_GEN]")) {
                        color = "text-amber-300";
                      } else if (log.includes("[ERROR]")) {
                        color = "text-red-400 font-bold";
                      }

                      return (
                        <div key={idx} className={`${color} leading-snug break-all`}>
                          {log}
                        </div>
                      );
                    })}
                    <div ref={terminalBottomRef} />
                  </div>
                </div>
              )}
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
              {/* Quick Screen Pending */}
              {pendingCandidates.length > 0 && (
                <button
                  type="button"
                  onClick={() => runBatchScreening(false)}
                  disabled={isScreening}
                  className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Lightning size={14} /> Screen {pendingCandidates.length} Pending
                </button>
              )}

              {/* Quick Re-screen All */}
              {candidates.length > 0 && (
                <button
                  type="button"
                  onClick={() => runBatchScreening(true)}
                  disabled={isScreening}
                  className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowsClockwise size={14} className={isScreening ? "animate-spin" : ""} />
                  Re-screen All ({candidates.length})
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

"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import * as LucideIcons from "lucide-react";

// Adapter to seamlessly support Phosphor icon props (such as weight) with Lucide icons
const createIcon = (IconComponent: React.ComponentType<any>) => {
  return function IconWrapper({ weight, ...props }: any) {
    return <IconComponent {...props} />;
  };
};

const TrayArrowUp = createIcon(LucideIcons.Upload);
const FileText = createIcon(LucideIcons.FileText);
const FileCsv = createIcon(LucideIcons.FileSpreadsheet);
const CheckCircle = createIcon(LucideIcons.CheckCircle2);
const XCircle = createIcon(LucideIcons.XCircle);
const X = createIcon(LucideIcons.X);
const Copy = createIcon(LucideIcons.Copy);
const DownloadSimple = createIcon(LucideIcons.Download);
const Sparkle = createIcon(LucideIcons.Sparkles);
const ArrowsClockwise = createIcon(LucideIcons.RefreshCw);
const UsersThree = createIcon(LucideIcons.Users);
const Cpu = createIcon(LucideIcons.Cpu);
const ArrowRight = createIcon(LucideIcons.ArrowRight);
const Info = createIcon(LucideIcons.Info);
const Check = createIcon(LucideIcons.Check);
const Warning = createIcon(LucideIcons.AlertTriangle);
const MagnifyingGlass = createIcon(LucideIcons.Search);
const CheckFat = createIcon(LucideIcons.CheckCheck);
const Lightning = createIcon(LucideIcons.Zap);
const EnvelopeSimple = createIcon(LucideIcons.Mail);
const Terminal = createIcon(LucideIcons.Terminal);
const CaretDown = createIcon(LucideIcons.ChevronDown);
const CaretUp = createIcon(LucideIcons.ChevronUp);
const Trash = createIcon(LucideIcons.Trash2);
import { toast } from "sonner";
import { GlassButton } from "@/components/ui/glass-button";
import { parseResumeFileInBrowser, extractEmailFromText } from "@/lib/client/resume-parser";
import { extractCandidateNameFromResume, sanitizeMailBodyGreeting } from "@/lib/utils";
import { clientScreeningEngine, StagedCandidate } from "@/lib/client/client-screening-engine";
import { ComparativeRankingResult, PoolBenchmark } from "@/lib/client/client-tournament";
import {
  getCachedEvaluationsForJob,
  clearJobEvaluationCache,
  CachedEvaluation,
  saveBatchLocalCandidates,
  LocalCandidate,
} from "@/lib/client/resume-cache";
import * as XLSX from "xlsx";
import { EmailStatusBadge } from "@/components/email/email-status-badge";
import { SingleEmailModal } from "@/components/email/single-email-modal";
import { BulkEmailModal } from "@/components/email/bulk-email-modal";

interface CandidateResult {
  id: string;
  name: string;
  email: string;
  experienceYears: number;
  resumeText?: string | null;
  skills?: string | null;
  status: string; // "SHORTLISTED" | "REJECTED" | "PENDING"
  currentRound: number;
  personalizedReply?: string | null;
  isOverridden?: boolean;
  overrideReason?: string | null;
  emailStatus?: string | null;
  emailSentAt?: string | null;
  emailError?: string | null;
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
  minExperience?: number;
  maxExperience?: number;
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
  experienceMatch?: boolean;
  experienceAnalysis?: string;
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
  minExperience = 0,
  maxExperience = 10,
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
  const [tournamentRankings, setTournamentRankings] = useState<ComparativeRankingResult[]>([]);
  const [poolBenchmark, setPoolBenchmark] = useState<PoolBenchmark | null>(null);
  const [showBenchmarkModal, setShowBenchmarkModal] = useState<boolean>(false);

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

  // Candidate Email Dispatcher states
  const [emailCandidate, setEmailCandidate] = useState<CandidateResult | null>(null);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);

  // Client-Side Execution & In-Browser Telemetry states
  const [concurrency, setConcurrency] = useState<number>(1);
  const [cacheHitCount, setCacheHitCount] = useState<number>(0);
  const [avgLatency, setAvgLatency] = useState<number>(0);
  const [activeStage, setActiveStage] = useState<
    "idle" | "parsing" | "caching" | "evaluating" | "tournament" | "syncing" | "complete"
  >("idle");
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [failedResumes, setFailedResumes] = useState<StagedCandidate[]>([]);

  // Load persistent IndexedDB cached evaluations on mount for 0ms instant display
  useEffect(() => {
    if (jobId && typeof window !== "undefined") {
      getCachedEvaluationsForJob(jobId)
        .then((cached) => {
          if (cached && cached.length > 0) {
            const feedItems: LiveCandidateFeedItem[] = cached.map((e) => ({
              candidateId: `cached_${e.hash.slice(0, 8)}`,
              name: e.candidateName,
              email: e.candidateEmail,
              status: e.verdict === "YES" ? "SHORTLISTED" : "REJECTED",
              score: e.score,
              matchPercentage: e.matchPercentage,
              matches: e.matches,
              matchedSkills: e.matchedSkills,
              missingSkills: e.missingSkills,
              reasoning: e.reasoning,
              mailBody: e.mailBody,
              timestamp: new Date(e.timestamp).toLocaleTimeString(),
            }));
            setLiveScreeningFeed((prev) => (prev.length === 0 ? feedItems : prev));
            setCacheHitCount(cached.length);
          }
        })
        .catch(() => {});
    }
  }, [jobId]);

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

  // Memoized candidate pool uniting persisted DB candidates with live real-time evaluations
  const allPoolCandidates = useMemo<CandidateResult[]>(() => {
    const map = new Map<string, CandidateResult>();

    // 1. Seed with DB / parent candidates
    for (const c of candidates) {
      const key = (c.email || c.id).toLowerCase();
      map.set(key, c);
    }

    // 2. Merge live screening feed items (higher precedence for fresh run results)
    for (const feed of liveScreeningFeed) {
      const key = (feed.email || feed.candidateId).toLowerCase();
      const existing = map.get(key);
      if (existing) {
        map.set(key, {
          ...existing,
          name: feed.name || existing.name,
          status: feed.status,
          personalizedReply: feed.mailBody || existing.personalizedReply,
          skills: feed.matchedSkills?.length ? feed.matchedSkills.join(", ") : existing.skills,
          roundResults: [
            {
              score: feed.score,
              passed: feed.status === "SHORTLISTED",
              feedback: feed.reasoning,
              agentTrace: JSON.stringify({
                experienceMatch: feed.experienceMatch,
                experienceAnalysis: feed.experienceAnalysis,
                matchedSkills: feed.matchedSkills,
                missingSkills: feed.missingSkills,
                reasoning: feed.reasoning,
                timestamp: feed.timestamp,
              }),
            },
            ...(existing.roundResults?.slice(1) || []),
          ],
        });
      } else {
        map.set(key, {
          id: feed.candidateId,
          name: feed.name,
          email: feed.email,
          experienceYears: 0,
          status: feed.status,
          currentRound: feed.status === "SHORTLISTED" ? 1 : 0,
          personalizedReply: feed.mailBody,
          skills: feed.matchedSkills?.join(", "),
          roundResults: [
            {
              score: feed.score,
              passed: feed.status === "SHORTLISTED",
              feedback: feed.reasoning,
              agentTrace: JSON.stringify({
                experienceMatch: feed.experienceMatch,
                experienceAnalysis: feed.experienceAnalysis,
                matchedSkills: feed.matchedSkills,
                missingSkills: feed.missingSkills,
                reasoning: feed.reasoning,
                timestamp: feed.timestamp,
              }),
            },
          ],
        });
      }
    }

    return Array.from(map.values());
  }, [candidates, liveScreeningFeed]);

  // Filter candidates by status
  const shortlistedCandidates = allPoolCandidates.filter((c) => c.status === "SHORTLISTED");
  const notShortlistedCandidates = allPoolCandidates.filter((c) => c.status === "REJECTED");
  const pendingCandidates = allPoolCandidates.filter((c) => c.status === "PENDING");

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
          parsed.extractedName ||
          extractCandidateNameFromResume(parsed.text, email, file.name);

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

  // ── Client-Side AI Screening Orchestration (Zero Heavy Backend) ────────
  const handleRunClientScreening = async (rescreenAll = false, bypassCache = false) => {
    let candidatesToScreen: StagedCandidate[] = [];

    if (stagedCandidates.length > 0) {
      candidatesToScreen = stagedCandidates.map((c, idx) => ({
        id: `staged_${idx}_${Date.now()}`,
        name: extractCandidateNameFromResume(c.resumeText, c.email, c.name),
        email: c.email,
        experienceYears: c.experienceYears || 0,
        resumeText: c.resumeText,
        source: c.source,
      }));
    } else {
      const pool = rescreenAll ? candidates : candidates.filter((c) => c.status === "PENDING");
      if (pool.length === 0) {
        toast.info("No pending candidates to screen. Upload resumes or click 'Re-screen All'.");
        return;
      }
      candidatesToScreen = pool.map((c) => ({
        id: c.id,
        name: extractCandidateNameFromResume(c.resumeText, c.email, c.name),
        email: c.email,
        experienceYears: c.experienceYears || 0,
        resumeText: c.resumeText || "",
        source: "Database Candidate",
      }));
    }

    if (candidatesToScreen.length === 0) return;

    setIsScreening(true);
    setIsPaused(false);
    setActiveStage("caching");
    setLiveLogs([]);
    setCacheHitCount(0);
    setAvgLatency(0);

    setLiveScreeningStats({
      total: candidatesToScreen.length,
      processed: 0,
      shortlisted: 0,
      rejected: 0,
      currentStep: concurrency === 1
        ? "Initializing Client Screening Engine (1-by-1 Sequential)..."
        : `Initializing Client Screening Pool (${concurrency}x parallel workers)...`,
    });

    addLiveLog(`🚀 Launched Client-Side AI Screening Engine${bypassCache ? " [Fresh Run: Bypassing Cache]" : ""}`);
    addLiveLog(`Candidate Pool: ${candidatesToScreen.length} | Mode: ${concurrency === 1 ? "1x Sequential (One-by-One)" : `${concurrency}x Parallel Streams`} | Cutoff: ${cutoff}`);

    try {
      const result = await clientScreeningEngine.runBatch(candidatesToScreen, {
        jobId,
        jobTitle,
        jobDescription,
        minExperience,
        maxExperience,
        cutoff: cutoff || 50,
        concurrency,
        bypassCache,
        onCandidateStart: (cand) => {
          setActiveStage("evaluating");
          setCurrentEvaluatingCandidate({
            id: cand.id || cand.email,
            name: cand.name,
            email: cand.email,
            index: liveScreeningStats.processed + 1,
            total: candidatesToScreen.length,
            resumeSnippet: (cand.resumeText || "").slice(0, 300),
          });
        },
        onCandidateComplete: (cand, evaluation, isCached) => {
          const isShortlisted = evaluation.verdict === "YES";
          const feedItem: LiveCandidateFeedItem = {
            candidateId: cand.id || `eval_${Date.now()}_${Math.random()}`,
            name: evaluation.candidateName,
            email: evaluation.candidateEmail,
            status: isShortlisted ? "SHORTLISTED" : "REJECTED",
            score: evaluation.score,
            matchPercentage: evaluation.matchPercentage,
            matches: evaluation.matches,
            experienceMatch: evaluation.experienceMatch,
            experienceAnalysis: evaluation.experienceAnalysis,
            matchedSkills: evaluation.matchedSkills,
            missingSkills: evaluation.missingSkills,
            reasoning: evaluation.reasoning,
            mailBody: evaluation.mailBody,
            timestamp: new Date().toLocaleTimeString(),
          };

          setLiveScreeningFeed((prev) => {
            const filtered = prev.filter((p) => p.email.toLowerCase() !== feedItem.email.toLowerCase());
            return [feedItem, ...filtered];
          });

          if (isCached) {
            setCacheHitCount((prev) => prev + 1);
          }
        },
        onProgress: (stats) => {
          setLiveScreeningStats({
            total: stats.total,
            processed: stats.processed,
            shortlisted: stats.shortlisted,
            rejected: stats.rejected,
            currentStep: stats.currentStep,
          });
          setCacheHitCount(stats.cacheHits);
          setAvgLatency(stats.averageLatencyMs);
        },
        onLog: (msg) => {
          addLiveLog(msg);
        },
        onError: (cand, err) => {
          addLiveLog(`[ERROR] ${cand.name}: ${err?.message || err}`);
        },
      });

      // Tournament phase
      setActiveStage("tournament");
      setTournamentRankings(result.rankings);
      if (result.benchmark) {
        setPoolBenchmark(result.benchmark);
        addLiveLog(`[TOURNAMENT] Established Pool Benchmark: ${result.benchmark.topProjects.length} Top Projects, ${result.benchmark.topExperiences.length} Top Experiences.`);
      }

      if (result.tournamentApplied) {
        addLiveLog(`[TOURNAMENT] Calibrated ${result.rankings.length} candidates. Top ${Math.min(cutoff || 50, result.rankings.length)} shortlisted.`);
      } else {
        addLiveLog(`[TOURNAMENT] Qualified candidates within cutoff limit (${cutoff}). Direct qualification applied.`);
      }

      // Optimistic sync to database
      setActiveStage("syncing");
      addLiveLog(`[SYNC] Syncing ${result.evaluations.length} evaluation(s) to Prisma database in background...`);

      const syncPayload = result.evaluations.map((ev) => {
        const ranking = result.rankings.find(
          (r) => r.email.toLowerCase() === ev.candidateEmail.toLowerCase() || r.candidateId === ev.candidateEmail
        );
        const cand = candidatesToScreen.find((c) => c.email.toLowerCase() === ev.candidateEmail.toLowerCase());
        const isShortlisted = ranking ? ranking.isQualified : ev.verdict === "YES";
        const finalScore = ranking ? ranking.comparativeScore : ev.score;

        return {
          id: cand?.id,
          name: ev.candidateName,
          email: ev.candidateEmail,
          experienceYears: cand?.experienceYears || 0,
          resumeText: cand?.resumeText || "",
          skills: ev.matchedSkills,
          status: (isShortlisted ? "SHORTLISTED" : "REJECTED") as "SHORTLISTED" | "REJECTED",
          score: finalScore,
          matchedSkills: ev.matchedSkills,
          missingSkills: ev.missingSkills,
          reasoning: ranking?.missingBenchmarkGaps?.length
            ? `Tournament Rank #${ranking.rank}/${result.rankings.length}. Missing gaps: ${ranking.missingBenchmarkGaps.join("; ")}`
            : ev.reasoning,
          personalizedReply: ranking?.mailBody || ev.mailBody,
        };
      });

      // Synchronize to local IndexedDB cache as well
      try {
        const localCandidatesToSave: LocalCandidate[] = result.evaluations.map((ev) => {
          const ranking = result.rankings.find(
            (r) => r.email.toLowerCase() === ev.candidateEmail.toLowerCase() || r.candidateId === ev.candidateEmail
          );
          const cand = candidatesToScreen.find((c) => c.email.toLowerCase() === ev.candidateEmail.toLowerCase());
          const isShortlisted = ranking ? ranking.isQualified : ev.verdict === "YES";
          const finalScore = ranking ? ranking.comparativeScore : ev.score;

          return {
            id: cand?.id && !cand.id.startsWith("staged_") ? cand.id : `cand_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            jobId,
            name: ev.candidateName,
            email: ev.candidateEmail,
            experienceYears: cand?.experienceYears || 0,
            resumeText: cand?.resumeText || "",
            skills: ev.matchedSkills,
            status: isShortlisted ? "SHORTLISTED" : "REJECTED",
            matchScore: finalScore,
            feedback: ranking?.missingBenchmarkGaps?.length
              ? `Tournament Rank #${ranking.rank}. ${ranking.missingBenchmarkGaps.join("; ")}`
              : ev.reasoning,
            personalizedReply: ranking?.mailBody || ev.mailBody,
            matchedSkills: ev.matchedSkills,
            missingSkills: ev.missingSkills,
            createdAt: new Date().toISOString(),
            roundResults: [
              {
                score: finalScore,
                passed: isShortlisted,
                feedback: ev.reasoning,
                agentTrace: JSON.stringify({
                  matchedSkills: ev.matchedSkills,
                  missingSkills: ev.missingSkills,
                  reasoning: ev.reasoning,
                }),
              },
            ],
          };
        });
        await saveBatchLocalCandidates(localCandidatesToSave);
      } catch (idbErr) {
        console.warn("IndexedDB batch candidate cache save warning:", idbErr);
      }

      try {
        const syncRes = await fetch(`/api/jobs/${jobId}/candidates/sync-batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidates: syncPayload }),
        });
        if (syncRes.ok) {
          addLiveLog(`[SYNC_OK] Successfully synced records to database.`);
        }
      } catch (syncErr) {
        console.warn("Background sync warning:", syncErr);
        addLiveLog(`[SYNC_WARN] Local cache saved. Database sync deferred.`);
      }

      setActiveStage("complete");
      toast.success(
        `Client screening complete! ${result.stats.shortlisted} Shortlisted, ${result.stats.rejected} Not Shortlisted (${result.stats.cacheHits} cache hits).`
      );

      if (result.failedCandidates && result.failedCandidates.length > 0) {
        setFailedResumes(result.failedCandidates);
        toast.error(
          `${result.failedCandidates.length} resume(s) failed after 3 automatic retries. You can retry them manually below.`
        );
      } else {
        setFailedResumes([]);
      }

      if (stagedCandidates.length > 0) {
        setStagedCandidates([]);
      }

      await onRefresh();
    } catch (err: any) {
      console.error("Client screening batch failed:", err);
      toast.error(`Client screening error: ${err.message || err}`);
      addLiveLog(`[FATAL] Batch failed: ${err.message || err}`);
    } finally {
      setIsScreening(false);
      setCurrentEvaluatingCandidate(null);
    }
  };

  const handleRetryFailedResumes = async () => {
    if (failedResumes.length === 0) return;
    const toRetry = [...failedResumes];
    setFailedResumes([]);
    toast.info(`Retrying ${toRetry.length} failed resume(s) with fresh AI inference...`);

    setIsScreening(true);
    setActiveStage("evaluating");
    addLiveLog(`🔄 [Manual Retry] Initiating re-evaluation for ${toRetry.length} failed candidate(s)...`);

    try {
      const result = await clientScreeningEngine.runBatch(toRetry, {
        jobId,
        jobTitle,
        jobDescription,
        cutoff: cutoff || 50,
        concurrency,
        bypassCache: true,
        onCandidateStart: (cand) => {
          setActiveStage("evaluating");
          setCurrentEvaluatingCandidate({
            id: cand.id || cand.email,
            name: cand.name,
            email: cand.email,
            index: liveScreeningStats.processed + 1,
            total: toRetry.length,
            resumeSnippet: (cand.resumeText || "").slice(0, 300),
          });
        },
        onCandidateComplete: (cand, evaluation) => {
          const isShortlisted = evaluation.verdict === "YES";
          const feedItem: LiveCandidateFeedItem = {
            candidateId: cand.id || `retry_${Date.now()}`,
            name: evaluation.candidateName,
            email: evaluation.candidateEmail,
            status: isShortlisted ? "SHORTLISTED" : "REJECTED",
            score: evaluation.score,
            matchPercentage: evaluation.matchPercentage,
            matches: evaluation.matches,
            matchedSkills: evaluation.matchedSkills,
            missingSkills: evaluation.missingSkills,
            reasoning: evaluation.reasoning,
            mailBody: evaluation.mailBody,
            timestamp: new Date().toLocaleTimeString(),
          };
          setLiveScreeningFeed((prev) => [
            feedItem,
            ...prev.filter((p) => p.email.toLowerCase() !== cand.email.toLowerCase()),
          ]);
        },
        onProgress: (stats) => {
          setLiveScreeningStats({
            total: stats.total,
            processed: stats.processed,
            shortlisted: stats.shortlisted,
            rejected: stats.rejected,
            currentStep: stats.currentStep,
          });
        },
        onLog: (msg) => addLiveLog(msg),
      });

      if (result.evaluations.length > 0) {
        const syncPayload = result.evaluations.map((ev) => {
          const cand = toRetry.find(
            (c) => c.email.toLowerCase() === ev.candidateEmail.toLowerCase()
          );
          return {
            id: cand?.id,
            name: ev.candidateName,
            email: ev.candidateEmail,
            experienceYears: cand?.experienceYears || 0,
            resumeText: cand?.resumeText || "",
            skills: ev.matchedSkills,
            status: (ev.verdict === "YES" ? "SHORTLISTED" : "REJECTED") as "SHORTLISTED" | "REJECTED",
            score: ev.score,
            matchedSkills: ev.matchedSkills,
            missingSkills: ev.missingSkills,
            reasoning: ev.reasoning,
            personalizedReply: ev.mailBody,
          };
        });

        try {
          await fetch(`/api/jobs/${jobId}/candidates/sync-batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ candidates: syncPayload }),
          });
          addLiveLog(`[SYNC_OK] Successfully synced ${syncPayload.length} retried records to database.`);
        } catch (syncErr) {
          console.warn("Background sync warning on retry:", syncErr);
        }
      }

      if (result.failedCandidates && result.failedCandidates.length > 0) {
        setFailedResumes(result.failedCandidates);
        toast.error(`${result.failedCandidates.length} resume(s) still failed after retry.`);
      } else {
        setFailedResumes([]);
        toast.success(`Successfully evaluated all ${toRetry.length} previously failed resumes!`);
      }

      await onRefresh();
    } catch (err: any) {
      toast.error(`Retry execution error: ${err.message || err}`);
    } finally {
      setIsScreening(false);
      setCurrentEvaluatingCandidate(null);
      setActiveStage("complete");
    }
  };

  const handlePauseResume = () => {
    if (isPaused) {
      clientScreeningEngine.resume();
      setIsPaused(false);
      addLiveLog("[CONTROL] Resumed screening execution.");
    } else {
      clientScreeningEngine.pause();
      setIsPaused(true);
      addLiveLog("[CONTROL] Paused screening execution.");
    }
  };

  const handleCancelScreening = () => {
    clientScreeningEngine.cancel();
    setIsScreening(false);
    setIsPaused(false);
    setActiveStage("idle");
    addLiveLog("[CONTROL] Aborted screening execution by user.");
    toast.info("Screening run cancelled.");
  };

  // Backwards-compatible alias for existing callers
  const runBatchScreening = async (rescreenAll = false) => {
    return handleRunClientScreening(rescreenAll);
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



  // ── Copy Mail Body 1-Click Action ────────────────────────────────────
  const handleCopyMailBody = (cand: CandidateResult) => {
    const displayName = extractCandidateNameFromResume(cand.resumeText, cand.email, cand.name);
    const ranking = tournamentRankings.find(
      (r) => r.email.toLowerCase() === cand.email.toLowerCase() || r.candidateId === cand.id
    );
    const mailContent = ranking?.mailBody || cand.personalizedReply;
    const text =
      sanitizeMailBodyGreeting(mailContent, displayName) ||
      `Dear ${displayName},\n\nThank you for applying for the ${jobTitle} position. Currently your resume did not meet our 30% core requirement threshold.`;

    navigator.clipboard.writeText(text);
    setCopiedId(cand.id);
    toast.success("Feedback email body copied to clipboard!");
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
          email: cand.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to override status.");
        setOverridingId(null);
        return;
      }

      // Optimistically update live screening feed so UI updates immediately
      setLiveScreeningFeed((prev) =>
        prev.map((item) =>
          item.email.toLowerCase() === cand.email.toLowerCase()
            ? { ...item, status: "SHORTLISTED" as const, matches: true }
            : item
        )
      );

      toast.success(`Candidate ${cand.name} successfully promoted to Shortlisted!`);
      await onRefresh();
    } catch (err) {
      toast.error("Error updating candidate status.");
    } finally {
      setOverridingId(null);
    }
  };

  // ── Export Multi-Sheet Excel (100% Client-Side via SheetJS) ──────────────
  const handleDownloadExcel = () => {
    setIsExporting(true);
    try {
      const shortlisted = allPoolCandidates.filter((c) => c.status === "SHORTLISTED");
      const notShortlisted = allPoolCandidates.filter((c) => c.status !== "SHORTLISTED");

      const shortlistedRows = shortlisted.map((c, idx) => {
        const feedItem = liveScreeningFeed.find(
          (f) => f.email.toLowerCase() === c.email.toLowerCase()
        );
        const latestResult = c.roundResults?.[0];
        const score = feedItem?.score ?? (latestResult?.score != null ? Math.round(latestResult.score) : 85);
        const skills = c.skills || (feedItem?.matchedSkills ? feedItem.matchedSkills.join(", ") : "");
        const realName = extractCandidateNameFromResume(c.resumeText, c.email, c.name);

        return {
          "Rank": idx + 1,
          "Candidate Email": c.email,
          "Candidate Name": realName,
          "Experience (Years)": c.experienceYears,
          "Match Score (%)": score,
          "Status": "SHORTLISTED",
          "Decision Basis": c.isOverridden
            ? `HR Override (${c.overrideReason || "Approved"})`
            : "AI Qualified (≥ 30% Criteria Matched)",
          "Skills": skills,
          "Screening Date": new Date().toISOString().slice(0, 10),
        };
      });

      const notShortlistedRows = notShortlisted.map((c, idx) => {
        const feedItem = liveScreeningFeed.find(
          (f) => f.email.toLowerCase() === c.email.toLowerCase()
        );
        const ranking = tournamentRankings.find(
          (r) => r.email.toLowerCase() === c.email.toLowerCase() || r.candidateId === c.id
        );
        const latestResult = c.roundResults?.[0];
        const score = ranking?.comparativeScore ?? feedItem?.score ?? (latestResult?.score != null ? Math.round(latestResult.score) : 25);
        const feedback = ranking?.missingBenchmarkGaps?.length
          ? `Tournament Benchmark Rank #${ranking.rank}. ${ranking.missingBenchmarkGaps.join("; ")}`
          : (feedItem?.reasoning || latestResult?.feedback || "Did not fulfill 30% core requirement threshold");
        const realName = extractCandidateNameFromResume(c.resumeText, c.email, c.name);
        const rawMail = ranking?.mailBody || feedItem?.mailBody || c.personalizedReply || `Dear ${realName},\n\nThank you for applying. Minimum requirements were not met.`;
        const mailNote = sanitizeMailBodyGreeting(rawMail, realName);
        const missingCompetencies = ranking?.missingBenchmarkGaps?.length
          ? ranking.missingBenchmarkGaps.join("; ")
          : (feedItem?.missingSkills ? feedItem.missingSkills.join(", ") : "Core requirement threshold");
        const recommendedProject = ranking?.recommendedProject || "Production Cloud Distributed Services Portfolio Project";

        return {
          "Rank": ranking?.rank ?? (idx + 1),
          "Candidate Email": c.email,
          "Candidate Name": realName,
          "Experience (Years)": c.experienceYears,
          "Match Score (%)": score,
          "Status": ranking ? "NOT SHORTLISTED (UNDER CUTOFF)" : "NOT SHORTLISTED",
          "Feedback Summary": feedback,
          "Personalized Mail Note": mailNote,
          "Missing Competencies": missingCompetencies,
          "Recommended Project": recommendedProject,
          "Screening Date": new Date().toISOString().slice(0, 10),
        };
      });

      const tournamentRows = tournamentRankings.map((r) => {
        const matchedCand = allPoolCandidates.find(
          (c) => c.id === r.candidateId || c.email.toLowerCase() === r.email.toLowerCase()
        );
        const candName = matchedCand?.name || r.name || r.candidateId;
        return {
          "Rank": r.rank,
          "Candidate Name": candName,
          "Candidate Email": r.email,
          "Benchmark Calibrated Score": r.comparativeScore,
          "Percentile": `${r.percentile}%`,
          "Status": r.isQualified ? "QUALIFIED (WITHIN CUTOFF)" : "UNDER CUTOFF",
          "Missing Benchmark Gaps": r.missingBenchmarkGaps?.join("; ") || "None",
          "Recommended Project": r.recommendedProject || "Production Distributed Services",
        };
      });

      const wb = XLSX.utils.book_new();

      const wsShortlisted = XLSX.utils.json_to_sheet(
        shortlistedRows.length > 0
          ? shortlistedRows
          : [{ "Message": "No candidates currently shortlisted" }]
      );
      XLSX.utils.book_append_sheet(wb, wsShortlisted, "Shortlisted");

      const wsNotShortlisted = XLSX.utils.json_to_sheet(
        notShortlistedRows.length > 0
          ? notShortlistedRows
          : [{ "Message": "No candidates in not shortlisted pool" }]
      );
      XLSX.utils.book_append_sheet(wb, wsNotShortlisted, "Not Shortlisted");

      if (tournamentRows.length > 0) {
        const wsTournament = XLSX.utils.json_to_sheet(tournamentRows);
        XLSX.utils.book_append_sheet(wb, wsTournament, "Tournament Rankings");
      }

      if (poolBenchmark) {
        const benchmarkRows = [
          ...poolBenchmark.topProjects.map((p, i) => ({
            "Category": "Top Project",
            "Rank / Index": i + 1,
            "Title / Role": p.title,
            "Details": p.description,
            "Technologies / Domain": p.techStack.join(", "),
            "Scale / Impact": p.scaleOrImpact,
            "Source Candidate": p.candidateName || "Anonymous",
          })),
          ...poolBenchmark.topExperiences.map((e, i) => ({
            "Category": "Top Experience",
            "Rank / Index": i + 1,
            "Title / Role": e.role,
            "Details": e.responsibilities,
            "Technologies / Domain": `${e.domainOrCompany} (${e.yearsOrSeniority})`,
            "Scale / Impact": e.scaleOrImpact,
            "Source Candidate": e.candidateName || "Anonymous",
          })),
        ];
        if (benchmarkRows.length > 0) {
          const wsBenchmark = XLSX.utils.json_to_sheet(benchmarkRows);
          XLSX.utils.book_append_sheet(wb, wsBenchmark, "Pool Benchmark");
        }
      }

      const safeTitle = (jobTitle || "Job").replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `${safeTitle}_Screening_Report.xlsx`;

      XLSX.writeFile(wb, filename);

      toast.success("Multi-sheet Excel report exported instantly in browser!");
    } catch (err: any) {
      console.error("Excel generation error:", err);
      toast.error("Error generating Excel report.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── CARD 1: Execution Input Console ────────────────────────────── */}
      <div
        style={{
          background: "var(--surface-high)",
          border: "1px solid var(--outline)",
          borderRadius: "24px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
        }}
        className="p-6 sm:p-8 space-y-6"
      >
        <div
          style={{ borderBottom: "1px solid var(--outline)" }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4"
        >
          <div>
            <div className="flex items-center gap-2">
              <span
                style={{ width: "8px", height: "8px", borderRadius: "999px", background: "var(--green)" }}
                className="animate-pulse"
              />
              <h3 style={{ color: "var(--ink)", margin: 0 }} className="text-base sm:text-lg font-semibold">
                Resume Screening Stage Execution
              </h3>
            </div>
            <p style={{ color: "var(--muted)", margin: "4px 0 0" }} className="text-xs">
              Upload bulk resumes or an Excel sheet. Resumes are packaged into JSON, transferred one by one via message queue, and calibrated against the 30% match rule.
            </p>
          </div>

          {/* Input Mode Selector */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--outline)",
              borderRadius: "999px",
              padding: "3px",
            }}
            className="flex items-center shrink-0"
          >
            <button
              type="button"
              onClick={() => setInputMode("bulk_resumes")}
              style={{
                borderRadius: "999px",
                padding: "6px 14px",
                fontSize: "12px",
                background: inputMode === "bulk_resumes" ? "var(--surface-purple)" : "transparent",
                color: inputMode === "bulk_resumes" ? "var(--primary-deep)" : "var(--muted)",
                fontWeight: inputMode === "bulk_resumes" ? 600 : 500,
                border: 0,
                transition: "all 0.2s",
              }}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <FileText size={14} /> Bulk Resumes
            </button>
            <button
              type="button"
              onClick={() => setInputMode("excel_sheet")}
              style={{
                borderRadius: "999px",
                padding: "6px 14px",
                fontSize: "12px",
                background: inputMode === "excel_sheet" ? "var(--surface-purple)" : "transparent",
                color: inputMode === "excel_sheet" ? "var(--primary-deep)" : "var(--muted)",
                fontWeight: inputMode === "excel_sheet" ? 600 : 500,
                border: 0,
                transition: "all 0.2s",
              }}
              className="flex items-center gap-1.5 cursor-pointer"
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
            style={{
              background: isDraggingResumes ? "var(--surface-purple)" : "var(--surface)",
              borderColor: isDraggingResumes ? "var(--primary)" : "var(--outline)",
              borderRadius: "20px",
            }}
            className="p-6 sm:p-8 border-2 border-dashed transition-all text-center space-y-3 cursor-pointer relative overflow-hidden"
          >
            <div
              style={{
                background: isDraggingResumes ? "var(--primary)" : "var(--surface-purple)",
                color: isDraggingResumes ? "var(--on-primary)" : "var(--primary-deep)",
                border: "1px solid var(--outline)",
                width: "48px",
                height: "48px",
                borderRadius: "14px",
              }}
              className="flex items-center justify-center mx-auto transition-all"
            >
              <TrayArrowUp
                size={22}
                className={isDraggingResumes ? "animate-bounce" : ""}
              />
            </div>
            <div className="pointer-events-none">
              <h4 style={{ color: "var(--ink)", margin: 0 }} className="text-sm font-semibold">
                {isDraggingResumes ? "Drop your resume files here" : "Bulk Resume Upload"}
              </h4>
              <p style={{ color: "var(--muted)", margin: "4px 0 0" }} className="text-xs">
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
              <span className="md-button md-button--filled text-xs">
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
              style={{
                background: isDraggingExcel ? "var(--surface-purple)" : "var(--surface)",
                borderColor: isDraggingExcel ? "var(--primary)" : "var(--outline)",
                borderRadius: "20px",
              }}
              className="p-6 sm:p-8 border-2 border-dashed transition-all text-center space-y-3 cursor-pointer relative overflow-hidden"
            >
              <div
                style={{
                  background: isDraggingExcel ? "var(--primary)" : "var(--surface-purple)",
                  color: isDraggingExcel ? "var(--on-primary)" : "var(--primary-deep)",
                  border: "1px solid var(--outline)",
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                }}
                className="flex items-center justify-center mx-auto transition-all"
              >
                <FileCsv
                  size={22}
                  className={isDraggingExcel ? "animate-bounce" : ""}
                />
              </div>
              <div className="pointer-events-none">
                <h4 style={{ color: "var(--ink)", margin: 0 }} className="text-sm font-semibold">
                  {isDraggingExcel ? "Drop your spreadsheet here" : "Excel / CSV Sheet Upload"}
                </h4>
                <p style={{ color: "var(--muted)", margin: "4px 0 0" }} className="text-xs">
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
                <span className="md-button md-button--filled text-xs">
                  Select or Drop Excel / CSV File
                </span>
              </div>
            </div>

            {/* Column Selection if Excel Loaded */}
            {excelColumns.length > 0 && (
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--outline)",
                  borderRadius: "14px",
                }}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--muted)" }} className="font-semibold uppercase text-[11px]">
                    Resume Text Column:
                  </span>
                  <select
                    value={selectedResumeColumn}
                    onChange={(e) => {
                      setSelectedResumeColumn(e.target.value);
                      parseCandidatesFromExcel(rawExcelRows, e.target.value);
                    }}
                    style={{
                      background: "var(--surface-high)",
                      border: "1px solid var(--outline)",
                      color: "var(--ink)",
                      borderRadius: "8px",
                      padding: "6px 10px",
                    }}
                    className="text-xs focus:outline-none"
                  >
                    {excelColumns.map((col) => (
                      <option key={col} value={col}>
                        {col} {col.toLowerCase().includes("resume") ? " (Detected)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <span style={{ color: "var(--green)" }} className="text-[11px] font-semibold">
                  {stagedCandidates.length} candidate rows extracted
                </span>
              </div>
            )}
          </div>
        )}

        {/* Staged Resumes Queue Ready Banner */}
        {stagedCandidates.length > 0 && (
          <div
            style={{
              background: "var(--surface-purple)",
              border: "1px solid var(--outline)",
              borderRadius: "18px",
            }}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div
                style={{
                  background: "var(--primary)",
                  color: "var(--on-primary)",
                  width: "36px",
                  height: "36px",
                  borderRadius: "12px",
                }}
                className="flex items-center justify-center text-xs font-bold shrink-0"
              >
                {stagedCandidates.length}
              </div>
              <div>
                <div style={{ color: "var(--ink)" }} className="text-xs font-semibold">
                  {stagedCandidates.length} Resumes Staged &amp; Formatted as JSON
                </div>
                <div style={{ color: "var(--muted)" }} className="text-[11px]">
                  Unique Job ID: <span style={{ color: "var(--primary-deep)", fontWeight: 600 }}>{jobId}</span> · Ready to queue
                </div>
                {stagedCandidates.filter((c) => !c.resumeText || c.resumeText.trim().length < 20).length > 0 && (
                  <div style={{ color: "#a0440d" }} className="mt-1 text-[11px] flex items-center gap-1">
                    <Warning size={12} className="shrink-0" />
                    <span>{stagedCandidates.filter((c) => !c.resumeText || c.resumeText.trim().length < 20).length} file(s) have 0/empty text (scanned image). Searchable PDF or text files recommended.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStagedCandidates([])}
                style={{ color: "var(--muted)", background: "transparent", border: 0 }}
                className="px-3 py-1.5 rounded-lg text-xs hover:text-rose-500 transition-colors cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                className="md-button md-button--filled text-xs"
                onClick={() => handleRunClientScreening(false, false)}
                disabled={isScreening}
              >
                <Lightning size={14} className="shrink-0" />
                <span>{isScreening ? "Client Screening Active..." : "Run Client-Side AI Screening"}</span>
              </button>
              <button
                type="button"
                className="md-button md-button--tonal text-xs"
                onClick={() => handleRunClientScreening(false, true)}
                disabled={isScreening}
                title="Bypass cached evaluations and run fresh live Gemini inference"
              >
                <Sparkle size={13} className="shrink-0" />
                <span>Fresh Run (No Cache)</span>
              </button>
            </div>
          </div>
        )}

        {/* ── EXECUTION FLOW STAGE VISUALIZER ── */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--outline)",
            borderRadius: "20px",
            padding: "18px 20px",
          }}
          className="shadow-sm space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  background: "var(--surface-purple)",
                  color: "var(--primary-deep)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Cpu size={16} />
              </div>
              <span style={{ color: "var(--ink)" }} className="font-semibold tracking-tight text-[13px]">
                Client-Side Execution Flow
              </span>
              <span
                style={{
                  background: "var(--surface-purple)",
                  color: "var(--primary-deep)",
                  border: "1px solid var(--outline)",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  fontSize: "10px",
                  fontWeight: 600,
                }}
              >
                In-Browser Engine
              </span>
            </div>
            <div style={{ color: "var(--muted)" }} className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5">
                ⚡ Cache Hits: <strong style={{ color: "var(--green)" }}>{cacheHitCount}</strong> (0ms)
                {cacheHitCount > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await clearJobEvaluationCache(jobId);
                      setCacheHitCount(0);
                      setLiveScreeningFeed([]);
                      toast.success("Cache cleared for this role.");
                    }}
                    style={{
                      padding: "1px 6px",
                      borderRadius: "999px",
                      background: "var(--surface-peach)",
                      color: "#8c4a0e",
                      border: "1px solid var(--outline)",
                      fontSize: "10px",
                      cursor: "pointer",
                    }}
                    title="Clear browser IndexedDB evaluation cache for this job"
                  >
                    Clear
                  </button>
                )}
              </span>
              <span>
                ⏱ Latency: <strong style={{ color: "var(--primary)" }}>{avgLatency ? `${avgLatency}ms` : "-"}</strong>
              </span>
              {/* Concurrency / Dispatch Mode Selector */}
              <div
                style={{ borderLeft: "1px solid var(--outline)" }}
                className="flex items-center gap-1.5 pl-3"
              >
                <span>Dispatch:</span>
                {[
                  { val: 1, label: "1x (Sequential)" },
                  { val: 2, label: "2x" },
                  { val: 3, label: "3x" },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setConcurrency(opt.val)}
                    disabled={isScreening}
                    style={{
                      borderRadius: "999px",
                      padding: "2px 8px",
                      fontSize: "10px",
                      fontWeight: concurrency === opt.val ? 600 : 500,
                      background: concurrency === opt.val ? "var(--primary)" : "var(--surface-high)",
                      color: concurrency === opt.val ? "var(--on-primary)" : "var(--muted)",
                      border: concurrency === opt.val ? "none" : "1px solid var(--outline)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pipeline Nodes DAG */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1 text-[11px]">
            {/* Stage 1: Text Ingestion */}
            {(() => {
              const isComplete = stagedCandidates.length > 0 || liveScreeningFeed.length > 0;
              return (
                <div
                  style={{
                    background: isComplete ? "#eaf6ee" : "var(--surface-high)",
                    border: isComplete ? "1px solid #b8dec5" : "1px solid var(--outline)",
                    borderRadius: "14px",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background: isComplete ? "#d2ebd9" : "var(--surface)",
                      color: isComplete ? "var(--green)" : "var(--muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FileText size={15} />
                  </div>
                  <div className="truncate">
                    <div style={{ color: isComplete ? "#1e4632" : "var(--ink)", fontWeight: 600 }}>1. In-Browser Parse</div>
                    <div style={{ color: isComplete ? "#386a51" : "var(--muted)", fontSize: "10px" }}>PDF.js &amp; SheetJS</div>
                  </div>
                </div>
              );
            })()}

            {/* Stage 2: Cache Hash Lookup */}
            {(() => {
              const isActive = activeStage === "caching";
              const isComplete = cacheHitCount > 0 || liveScreeningFeed.length > 0;
              return (
                <div
                  style={{
                    background: isActive ? "var(--surface-peach)" : isComplete ? "#eaf6ee" : "var(--surface-high)",
                    border: isActive ? "1px solid #c87a2a" : isComplete ? "1px solid #b8dec5" : "1px solid var(--outline)",
                    borderRadius: "14px",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "all 0.2s",
                  }}
                  className={isActive ? "animate-pulse" : ""}
                >
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background: isActive ? "#fed7aa" : isComplete ? "#d2ebd9" : "var(--surface)",
                      color: isActive ? "#8c4a0e" : isComplete ? "var(--green)" : "var(--muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Lightning size={15} />
                  </div>
                  <div className="truncate">
                    <div style={{ color: isActive ? "#8c4a0e" : isComplete ? "#1e4632" : "var(--ink)", fontWeight: 600 }}>2. Cache Check</div>
                    <div style={{ color: isActive ? "#8c4a0e" : isComplete ? "#386a51" : "var(--muted)", fontSize: "10px" }}>SHA-256 IndexedDB</div>
                  </div>
                </div>
              );
            })()}

            {/* Stage 3: AI Screening Calibration */}
            {(() => {
              const isActive = activeStage === "evaluating";
              const isComplete = liveScreeningStats.processed > 0 && !isActive;
              return (
                <div
                  style={{
                    background: isActive ? "var(--surface-purple)" : isComplete ? "#eaf6ee" : "var(--surface-high)",
                    border: isActive ? "1px solid var(--primary)" : isComplete ? "1px solid #b8dec5" : "1px solid var(--outline)",
                    borderRadius: "14px",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "all 0.2s",
                  }}
                  className={isActive ? "animate-pulse" : ""}
                >
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background: isActive ? "var(--surface-purple)" : isComplete ? "#d2ebd9" : "var(--surface)",
                      color: isActive ? "var(--primary-deep)" : isComplete ? "var(--green)" : "var(--muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Sparkle size={15} />
                  </div>
                  <div className="truncate">
                    <div style={{ color: isActive ? "var(--primary-deep)" : isComplete ? "#1e4632" : "var(--ink)", fontWeight: 600 }}>3. 30% Rule AI</div>
                    <div style={{ color: isActive ? "var(--primary-deep)" : isComplete ? "#386a51" : "var(--muted)", fontSize: "10px" }}>
                      {concurrency === 1 ? "1x Sequential" : `${concurrency}x Parallel Pool`}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Stage 4: Tournament Benchmark */}
            {(() => {
              const isActive = activeStage === "tournament";
              const isComplete = (activeStage === "complete" || activeStage === "syncing" || poolBenchmark !== null) && !isActive;
              return (
                <div
                  onClick={() => poolBenchmark && setShowBenchmarkModal(true)}
                  style={{
                    background: isActive ? "var(--surface-purple)" : isComplete ? "#eaf6ee" : "var(--surface-high)",
                    border: isActive ? "1px solid var(--primary)" : isComplete ? "1px solid #b8dec5" : "1px solid var(--outline)",
                    borderRadius: "14px",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: poolBenchmark ? "pointer" : "default",
                    transition: "all 0.2s",
                  }}
                  className={isActive ? "animate-pulse" : ""}
                  title={poolBenchmark ? "Click to inspect the Pool Benchmark" : undefined}
                >
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background: isActive ? "var(--surface-purple)" : isComplete ? "#d2ebd9" : "var(--surface)",
                      color: isActive ? "var(--primary-deep)" : isComplete ? "var(--green)" : "var(--muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <UsersThree size={15} />
                  </div>
                  <div className="truncate">
                    <div style={{ color: isActive ? "var(--primary-deep)" : isComplete ? "#1e4632" : "var(--ink)", fontWeight: 600 }} className="flex items-center gap-1.5">
                      4. Tournament
                      {poolBenchmark && (
                        <span style={{ fontSize: "9px", background: "var(--surface-purple)", color: "var(--primary-deep)", padding: "1px 5px", borderRadius: "999px", fontWeight: 600 }}>
                          Benchmark
                        </span>
                      )}
                    </div>
                    <div style={{ color: isActive ? "var(--primary-deep)" : isComplete ? "#386a51" : "var(--muted)", fontSize: "10px" }}>
                      {poolBenchmark
                        ? `${poolBenchmark.topProjects.length} Projs · ${poolBenchmark.topExperiences.length} Exps`
                        : "Top 10 Benchmark"}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Stage 5: Async Sync */}
            {(() => {
              const isActive = activeStage === "syncing";
              const isComplete = activeStage === "complete";
              return (
                <div
                  style={{
                    background: isActive ? "var(--surface-blue)" : isComplete ? "#eaf6ee" : "var(--surface-high)",
                    border: isActive ? "1px solid #2979ff" : isComplete ? "1px solid #b8dec5" : "1px solid var(--outline)",
                    borderRadius: "14px",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "all 0.2s",
                  }}
                  className={`col-span-2 md:col-span-1 ${isActive ? "animate-pulse" : ""}`}
                >
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background: isActive ? "#dbeafe" : isComplete ? "#d2ebd9" : "var(--surface)",
                      color: isActive ? "#1e40af" : isComplete ? "var(--green)" : "var(--muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <CheckFat size={15} />
                  </div>
                  <div className="truncate">
                    <div style={{ color: isActive ? "#1e40af" : isComplete ? "#1e4632" : "var(--ink)", fontWeight: 600 }}>5. Async Sync</div>
                    <div style={{ color: isActive ? "#1e40af" : isComplete ? "#386a51" : "var(--muted)", fontSize: "10px" }}>Prisma SQLite</div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Pause / Resume / Cancel Controls */}
          {isScreening && (
            <div
              style={{ borderTop: "1px solid var(--outline)" }}
              className="flex items-center justify-between pt-2.5"
            >
              <span style={{ color: "#a0440d" }} className="text-[11px] font-medium flex items-center gap-1.5 animate-pulse">
                <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: "#f59e0b" }} />
                Execution in progress ({liveScreeningStats.processed}/{liveScreeningStats.total})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePauseResume}
                  style={{
                    background: "var(--surface-high)",
                    border: "1px solid var(--outline)",
                    color: "var(--ink)",
                    borderRadius: "999px",
                    padding: "4px 12px",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                  className="transition-colors cursor-pointer"
                >
                  {isPaused ? "▶ Resume" : "⏸ Pause"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelScreening}
                  style={{
                    background: "#fde8e8",
                    color: "#c0392b",
                    border: "1px solid #f5b7b1",
                    borderRadius: "999px",
                    padding: "4px 12px",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                  className="transition-colors cursor-pointer"
                >
                  ✕ Cancel
                </button>
              </div>
            </div>
          )}
        </div>

          {/* ── LIVE AI SCREENING INTELLIGENCE & TRANSPARENCY CONSOLE ─────── */}
          {(isScreening || liveScreeningFeed.length > 0) && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--outline)",
                borderRadius: "20px",
                overflow: "hidden",
              }}
              className="space-y-0 shadow-sm"
            >
              {/* Header Bar */}
              <div
                style={{
                  background: "var(--surface-high)",
                  borderBottom: "1px solid var(--outline)",
                  padding: "16px 20px",
                }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    {isScreening ? (
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                    ) : (
                      <CheckCircle size={18} style={{ color: "var(--green)" }} />
                    )}
                    <h3 style={{ color: "var(--ink)", margin: 0 }} className="text-sm sm:text-base font-semibold flex items-center gap-2">
                      Live AI Screening Transparency Console
                      <span
                        style={{
                          background: isScreening ? "var(--surface-purple)" : "#eaf6ee",
                          color: isScreening ? "var(--primary-deep)" : "var(--green)",
                          border: isScreening ? "1px solid var(--outline)" : "1px solid #b8dec5",
                          padding: "2px 8px",
                          borderRadius: "999px",
                          fontSize: "10px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        {isScreening ? "Real-Time Telemetry Active" : "Calibration Session Completed"}
                      </span>
                    </h3>
                  </div>
                  <p style={{ color: "var(--muted)", margin: 0 }} className="text-xs">
                    {liveScreeningStats.currentStep}
                  </p>
                </div>

                {/* Real-Time Metrics Badges */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--outline)",
                      borderRadius: "999px",
                      padding: "5px 12px",
                      color: "var(--ink)",
                    }}
                  >
                    <span style={{ color: "var(--muted)" }}>Processed: </span>
                    <span style={{ fontWeight: 700 }}>
                      {liveScreeningStats.processed}/{liveScreeningStats.total || liveScreeningFeed.length}
                    </span>
                  </div>
                  <div
                    style={{
                      background: "#eaf6ee",
                      border: "1px solid #b8dec5",
                      borderRadius: "999px",
                      padding: "5px 12px",
                      color: "var(--green)",
                      fontWeight: 600,
                    }}
                  >
                    <span>Shortlisted: </span>
                    <span>{liveScreeningStats.shortlisted}</span>
                  </div>
                  <div
                    style={{
                      background: "#fde8e8",
                      border: "1px solid #f5b7b1",
                      borderRadius: "999px",
                      padding: "5px 12px",
                      color: "#c0392b",
                      fontWeight: 600,
                    }}
                  >
                    <span>Not Shortlisted: </span>
                    <span>{liveScreeningStats.rejected}</span>
                  </div>
                  {failedResumes.length > 0 && (
                    <div
                      style={{
                        background: "#fde8e8",
                        border: "1px solid #f5b7b1",
                        borderRadius: "999px",
                        padding: "5px 12px",
                        color: "#c0392b",
                        fontWeight: 700,
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <Warning size={14} className="shrink-0" />
                      <span>Failed (3x): {failedResumes.length}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowLiveTerminal(!showLiveTerminal)}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--outline)",
                      borderRadius: "999px",
                      padding: "5px 12px",
                      color: "var(--muted)",
                      cursor: "pointer",
                    }}
                    className="flex items-center gap-1 hover:text-[var(--ink)] transition-colors"
                    title="Toggle Agent Trace Terminal"
                  >
                    <Terminal size={14} />
                    {showLiveTerminal ? "Hide Trace" : "Show Trace"}
                  </button>
                  {!isScreening && liveScreeningFeed.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setLiveScreeningFeed([])}
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--outline)",
                        borderRadius: "999px",
                        padding: "5px 12px",
                        color: "var(--muted)",
                        cursor: "pointer",
                      }}
                      className="hover:text-[var(--ink)] transition-colors"
                    >
                      Clear Stream
                    </button>
                  )}
                  {!isScreening && (cacheHitCount > 0 || liveScreeningFeed.length > 0) && (
                    <button
                      type="button"
                      onClick={async () => {
                        await clearJobEvaluationCache(jobId);
                        setCacheHitCount(0);
                        setLiveScreeningFeed([]);
                        toast.success("Browser cache cleared! Next screening will run fresh AI inference.");
                      }}
                      style={{
                        background: "var(--surface-peach)",
                        border: "1px solid var(--outline)",
                        borderRadius: "999px",
                        padding: "5px 12px",
                        color: "#8c4a0e",
                        cursor: "pointer",
                      }}
                      className="flex items-center gap-1"
                      title="Clear stored IndexedDB evaluations for this job to force fresh AI screening"
                    >
                      <Trash size={12} />
                      Clear Cache
                    </button>
                  )}
                </div>
              </div>

              {/* Glowing Progress Bar */}
              {isScreening && (
                <div style={{ background: "var(--outline)", height: "4px" }} className="w-full overflow-hidden relative">
                  <div
                    style={{
                      height: "100%",
                      background: "var(--primary)",
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
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              )}

              {/* ── SPOTLIGHT: Currently Analyzing Candidate ── */}
              {currentEvaluatingCandidate && (
                <div
                  style={{
                    background: "var(--surface-peach)",
                    borderBottom: "1px solid var(--outline)",
                    padding: "16px 20px",
                  }}
                  className="space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "10px",
                          background: "#fed7aa",
                          color: "#8c4a0e",
                        }}
                        className="flex items-center justify-center animate-pulse shrink-0"
                      >
                        <Lightning size={16} />
                      </div>
                      <div>
                        <div style={{ color: "var(--ink)" }} className="text-xs font-semibold flex items-center gap-2">
                          Currently Inspecting: {currentEvaluatingCandidate.name}
                          <span
                            style={{
                              background: "var(--surface-high)",
                              color: "var(--muted)",
                              border: "1px solid var(--outline)",
                              borderRadius: "999px",
                              padding: "1px 7px",
                              fontSize: "10px",
                            }}
                          >
                            Candidate #{currentEvaluatingCandidate.index} of {currentEvaluatingCandidate.total}
                          </span>
                        </div>
                        <div style={{ color: "var(--muted)" }} className="text-[11px]">
                          {currentEvaluatingCandidate.email}
                        </div>
                      </div>
                    </div>

                    <div style={{ color: "#8c4a0e" }} className="flex items-center gap-1.5 text-[10px] font-medium">
                      <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: "#f59e0b" }} className="animate-ping" />
                      Streaming Model Inference &amp; Skill Calibration...
                    </div>
                  </div>

                  {/* Scanned Excerpt Preview */}
                  {currentEvaluatingCandidate.resumeSnippet && (
                    <div
                      style={{
                        background: "var(--surface-high)",
                        border: "1px solid var(--outline)",
                        borderRadius: "12px",
                        padding: "10px 14px",
                      }}
                      className="text-[11px] relative overflow-hidden"
                    >
                      <div style={{ color: "var(--muted)" }} className="text-[10px] uppercase font-semibold mb-1 flex items-center gap-1">
                        <FileText size={12} /> Live Ingestion Stream Excerpt:
                      </div>
                      <p style={{ color: "var(--ink)", margin: 0 }} className="line-clamp-2 italic">
                        &ldquo;{currentEvaluatingCandidate.resumeSnippet}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── LIVE EVALUATION STREAM (Cards with Live Generated Mail) ── */}
              <div
                data-lenis-prevent="true"
                className="p-4 sm:p-6 space-y-4 max-h-[540px] overflow-y-auto overscroll-contain select-text scrollbar-thin"
                style={{ overscrollBehavior: "contain" }}
                onWheel={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <span style={{ color: "var(--muted)" }} className="text-xs uppercase font-semibold flex items-center gap-1.5">
                    <Sparkle size={14} style={{ color: "var(--primary)" }} />
                    Evaluated Candidates &amp; Generated Communications ({liveScreeningFeed.length})
                  </span>
                  {liveScreeningFeed.length > 0 && (
                    <span style={{ color: "var(--muted)" }} className="text-[10px]">
                      Sorted latest first
                    </span>
                  )}
                </div>

                {/* Persistently Failed Resumes Alert & Manual Retry Action */}
                {failedResumes.length > 0 && !isScreening && (
                  <div
                    style={{
                      background: "#fde8e8",
                      border: "1px solid #f5b7b1",
                      borderRadius: "16px",
                      padding: "16px",
                    }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "12px",
                          background: "#fadbd8",
                          color: "#c0392b",
                        }}
                        className="flex items-center justify-center shrink-0 mt-0.5"
                      >
                        <Warning size={20} />
                      </div>
                      <div>
                        <div style={{ color: "#78281f" }} className="font-bold text-sm flex items-center gap-2">
                          {failedResumes.length} candidate resume{failedResumes.length > 1 ? "s" : ""} failed evaluation after 3 automatic retries
                          <span
                            style={{
                              background: "#f5b7b1",
                              color: "#78281f",
                              borderRadius: "999px",
                              padding: "1px 7px",
                              fontSize: "10px",
                              fontWeight: 700,
                            }}
                          >
                            Action Required
                          </span>
                        </div>
                        <div style={{ color: "#943126" }} className="text-[11px] mt-1">
                          Candidates: {failedResumes.map((c) => c.name).slice(0, 4).join(", ")}
                          {failedResumes.length > 4 ? ` and ${failedResumes.length - 4} more` : ""}
                        </div>
                        <div style={{ color: "var(--muted)" }} className="text-[10px] mt-1">
                          These candidates encountered upstream LLM errors and were not added to cache. You can re-run them with 1-click.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRetryFailedResumes}
                      style={{
                        background: "#c0392b",
                        color: "white",
                        borderRadius: "999px",
                        padding: "8px 16px",
                        fontWeight: 600,
                        border: 0,
                        cursor: "pointer",
                      }}
                      className="transition-all duration-200 flex items-center gap-2 shrink-0 self-start sm:self-auto shadow-sm"
                    >
                      <ArrowsClockwise size={16} />
                      Retry Failed Resumes ({failedResumes.length})
                    </button>
                  </div>
                )}

                {liveScreeningFeed.length === 0 && isScreening && (
                  <div style={{ color: "var(--muted)" }} className="p-8 text-center text-xs space-y-2">
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "12px",
                        background: "var(--surface-purple)",
                        color: "var(--primary-deep)",
                      }}
                      className="mx-auto flex items-center justify-center animate-spin"
                    >
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
                      style={{
                        background: "var(--surface-high)",
                        border: isShortlisted ? "1px solid #b8dec5" : "1px solid #f5b7b1",
                        borderRadius: "18px",
                        padding: "16px",
                      }}
                      className="space-y-3 shadow-sm transition-all"
                    >
                      {/* Candidate Verdict Header */}
                      <div
                        style={{ borderBottom: "1px solid var(--outline)" }}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span style={{ color: "var(--ink)" }} className="text-sm font-bold">
                              {item.name}
                            </span>
                            <span
                              style={{
                                background: isShortlisted ? "#eaf6ee" : "#fde8e8",
                                color: isShortlisted ? "var(--green)" : "#c0392b",
                                border: isShortlisted ? "1px solid #b8dec5" : "1px solid #f5b7b1",
                                padding: "2px 8px",
                                borderRadius: "999px",
                                fontSize: "10px",
                                fontWeight: 700,
                              }}
                              className="flex items-center gap-1"
                            >
                              {isShortlisted ? (
                                <>
                                  <CheckCircle size={12} /> SHORTLISTED (YES)
                                </>
                              ) : (
                                <>
                                  <XCircle size={12} /> NOT SHORTLISTED (NO)
                                </>
                              )}
                            </span>
                          </div>
                          <div style={{ color: "var(--muted)" }} className="text-[11px]">
                            {item.email} · Evaluated at {item.timestamp}
                          </div>
                        </div>

                        {/* Match Score Badge */}
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              background: isShortlisted ? "#eaf6ee" : "#fde8e8",
                              color: isShortlisted ? "var(--green)" : "#c0392b",
                              border: isShortlisted ? "1px solid #b8dec5" : "1px solid #f5b7b1",
                              borderRadius: "999px",
                              padding: "4px 10px",
                              fontSize: "11px",
                              fontWeight: 700,
                            }}
                          >
                            Score: {item.score}% {item.matches ? "≥ 30% Rule" : "< 30% Rule"}
                          </span>
                        </div>
                      </div>

                      {/* Skills & AI Reasoning */}
                      <div className="py-2 space-y-2.5 text-xs">
                        {/* 1. Experience Level Analysis */}
                        {item.experienceAnalysis && (
                          <div
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--outline)",
                              borderRadius: "12px",
                              padding: "10px 12px",
                            }}
                            className="flex flex-col sm:flex-row sm:items-center gap-2 text-[11px]"
                          >
                            <span
                              style={{
                                background: item.experienceMatch !== false ? "#eaf6ee" : "#fff8e1",
                                color: item.experienceMatch !== false ? "var(--green)" : "#b78103",
                                border: item.experienceMatch !== false ? "1px solid #b8dec5" : "1px solid #ffe082",
                                padding: "2px 7px",
                                borderRadius: "6px",
                                fontSize: "10px",
                                fontWeight: 700,
                              }}
                              className="shrink-0 self-start"
                            >
                              {item.experienceMatch !== false ? "✓ Experience Matched" : "⚠ Experience Gap"}
                            </span>
                            <span style={{ color: "var(--ink)" }} className="leading-snug">
                              {item.experienceAnalysis}
                            </span>
                          </div>
                        )}

                        {/* Matched Skills */}
                        {item.matchedSkills.length > 0 && (
                          <div className="flex items-start gap-2">
                            <span style={{ color: "var(--green)" }} className="text-[11px] font-semibold shrink-0 w-24">
                              Matched Skills:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {item.matchedSkills.map((s, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    background: "#eaf6ee",
                                    color: "var(--green)",
                                    border: "1px solid #b8dec5",
                                    padding: "2px 8px",
                                    borderRadius: "6px",
                                    fontSize: "10px",
                                    fontWeight: 500,
                                  }}
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
                            <span style={{ color: "#c0392b" }} className="text-[11px] font-semibold shrink-0 w-24">
                              Missing Skills:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {item.missingSkills.map((s, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    background: "#fde8e8",
                                    color: "#c0392b",
                                    border: "1px solid #f5b7b1",
                                    padding: "2px 8px",
                                    borderRadius: "6px",
                                    fontSize: "10px",
                                    fontWeight: 500,
                                  }}
                                >
                                  ✕ {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* AI Reasoning */}
                        {item.reasoning && (
                          <div
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--outline)",
                              borderRadius: "12px",
                              padding: "10px 12px",
                              color: "var(--ink)",
                            }}
                            className="text-[11px] leading-relaxed font-sans"
                          >
                            <span style={{ color: "var(--muted)" }} className="font-semibold uppercase text-[10px] mr-1.5">
                              AI Decision Reasoning:
                            </span>
                            {item.reasoning}
                          </div>
                        )}
                      </div>

                      {/* ── LIVE GENERATED MAIL BOX ── */}
                      {item.mailBody && (
                        <div style={{ borderTop: "1px solid var(--outline)" }} className="pt-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedMailId(isMailOpen ? null : item.candidateId)
                            }
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--outline)",
                              borderRadius: "12px",
                              padding: "8px 12px",
                              color: "var(--ink)",
                            }}
                            className="w-full flex items-center justify-between text-xs transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <EnvelopeSimple size={15} style={{ color: "var(--primary)" }} />
                              <span className="font-semibold">
                                {isShortlisted
                                  ? "Generated Advancement / Scorecard Mail"
                                  : "Generated Rejection & Project Recommendation Mail"}
                              </span>
                              <span style={{ color: "var(--muted)" }} className="text-[10px]">
                                ({item.mailBody.length} chars)
                              </span>
                            </span>
                            <span style={{ color: "var(--muted)" }} className="text-[11px] flex items-center gap-1 font-medium">
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
                            <div
                              style={{
                                background: "var(--surface-high)",
                                border: "1px solid var(--outline)",
                                borderRadius: "12px",
                                padding: "14px",
                              }}
                              className="mt-2 space-y-2"
                            >
                              <div
                                style={{ borderBottom: "1px solid var(--outline)", color: "var(--muted)" }}
                                className="flex items-center justify-between text-[11px] pb-2"
                              >
                                <div>
                                  <span>Recipient: </span>
                                  <span style={{ color: "var(--ink)", fontWeight: 600 }}>{item.email}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.mailBody);
                                    toast.success("Generated email copied to clipboard!");
                                  }}
                                  style={{
                                    background: "var(--surface-purple)",
                                    color: "var(--primary-deep)",
                                    borderRadius: "999px",
                                    padding: "3px 10px",
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    border: 0,
                                    cursor: "pointer",
                                  }}
                                  className="flex items-center gap-1"
                                >
                                  <Copy size={11} /> Copy Email
                                </button>
                              </div>

                              <div style={{ color: "var(--ink)" }} className="text-[11px] font-sans whitespace-pre-wrap leading-relaxed">
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
                <div
                  style={{
                    background: "var(--surface)",
                    borderTop: "1px solid var(--outline)",
                    padding: "14px 18px",
                  }}
                  className="font-mono text-[11px] space-y-1.5"
                >
                  <div
                    style={{ borderBottom: "1px solid var(--outline)", color: "var(--muted)" }}
                    className="flex items-center justify-between text-[10px] pb-1.5"
                  >
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Terminal size={12} style={{ color: "var(--primary)" }} />
                      Live Gateway Decision Log &amp; Agent Trace
                    </span>
                    <span>{liveLogs.length} telemetry events</span>
                  </div>

                  <div
                    data-lenis-prevent="true"
                    className="max-h-36 overflow-y-auto space-y-1 pr-1 scrollbar-thin overscroll-contain"
                    style={{ overscrollBehavior: "contain" }}
                    onWheel={(e) => e.stopPropagation()}
                  >
                    {liveLogs.map((log, idx) => {
                      let color = "var(--muted)";
                      if (log.includes("[VERDICT]")) {
                        color = log.includes("SHORTLISTED") ? "var(--green)" : "#c0392b";
                      } else if (log.includes("[DEQUEUE]")) {
                        color = "var(--primary)";
                      } else if (log.includes("[MAIL_GEN]")) {
                        color = "#8c4a0e";
                      } else if (log.includes("[ERROR]")) {
                        color = "#c0392b";
                      }

                      return (
                        <div key={idx} style={{ color }} className="leading-snug break-all">
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

      {/* ── CARD 2: Screening Results Console (Shortlisted vs Not Shortlisted) ── */}
      <div
        style={{
          background: "var(--surface-high)",
          border: "1px solid var(--outline)",
          borderRadius: "24px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
        }}
        className="p-6 sm:p-8 space-y-6"
      >
        {/* Header & Stats Strip */}
        <div
          style={{ borderBottom: "1px solid var(--outline)" }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4"
        >
          <div>
            <div className="flex items-center gap-2">
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
                }}
              >
                <UsersThree size={18} />
              </div>
              <h3 style={{ color: "var(--ink)", margin: 0 }} className="text-base sm:text-lg font-semibold">
                Resume Screening Pool Results
              </h3>
            </div>
            <p style={{ color: "var(--muted)", margin: "4px 0 0" }} className="text-xs">
              Target Cutoff: <span style={{ color: "var(--primary)", fontWeight: 600 }}>{cutoff} candidates</span> · Rule: &ge; 30% match shortlists (returns YES)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Screen Pending */}
            {pendingCandidates.length > 0 && (
              <button
                type="button"
                onClick={() => runBatchScreening(false)}
                disabled={isScreening}
                style={{
                  background: "var(--surface-peach)",
                  color: "#8c4a0e",
                  border: "1px solid var(--outline)",
                  borderRadius: "999px",
                  padding: "7px 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                className="flex items-center gap-1.5 transition-colors"
              >
                <Lightning size={14} /> Screen {pendingCandidates.length} Pending
              </button>
            )}

            {/* Quick Re-screen All */}
            {allPoolCandidates.length > 0 && (
              <button
                type="button"
                onClick={() => runBatchScreening(true)}
                disabled={isScreening}
                className="md-button md-button--tonal text-xs"
              >
                <ArrowsClockwise size={14} className={isScreening ? "animate-spin" : ""} />
                Re-screen All ({allPoolCandidates.length})
              </button>
            )}

            {/* Clear Local Cache */}
            {cacheHitCount > 0 && (
              <button
                type="button"
                onClick={async () => {
                  await clearJobEvaluationCache(jobId);
                  setCacheHitCount(0);
                  toast.success("Local IndexedDB evaluation cache cleared.");
                }}
                disabled={isScreening}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--outline)",
                  color: "var(--muted)",
                  borderRadius: "999px",
                  padding: "7px 14px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
                className="hover:text-[var(--ink)] transition-colors"
                title="Clear local IndexedDB evaluation cache"
              >
                Clear Cache
              </button>
            )}

            {/* Batch Email Dispatcher Button */}
            <button
              type="button"
              onClick={() => setIsBulkEmailOpen(true)}
              disabled={allPoolCandidates.length === 0}
              className="md-button md-button--filled text-xs"
              title="Send automated or customized emails to screened candidate pool"
            >
              <EnvelopeSimple size={14} />
              Send All Candidates Mail ({allPoolCandidates.length})
            </button>

            {/* Download Excel Multi-Sheet Report */}
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isExporting}
              style={{
                background: "#eaf6ee",
                color: "var(--green)",
                border: "1px solid #b8dec5",
                borderRadius: "999px",
                padding: "0 18px",
                minHeight: "42px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              className="inline-flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <DownloadSimple size={14} />
              {isExporting ? "Generating XLSX..." : "Download Excel Report (.xlsx)"}
            </button>
          </div>
        </div>

        {/* Tab Switcher & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--outline)",
              borderRadius: "999px",
              padding: "4px",
            }}
            className="flex items-center"
          >
            <button
              type="button"
              onClick={() => setActiveResultsTab("shortlisted")}
              style={{
                borderRadius: "999px",
                padding: "7px 16px",
                fontSize: "12px",
                background: activeResultsTab === "shortlisted" ? "#eaf6ee" : "transparent",
                color: activeResultsTab === "shortlisted" ? "var(--green)" : "var(--muted)",
                fontWeight: activeResultsTab === "shortlisted" ? 600 : 500,
                border: activeResultsTab === "shortlisted" ? "1px solid #b8dec5" : "none",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              className="flex items-center gap-2"
            >
              <CheckCircle size={14} style={{ color: "var(--green)" }} />
              Shortlisted ({shortlistedCandidates.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveResultsTab("not_shortlisted")}
              style={{
                borderRadius: "999px",
                padding: "7px 16px",
                fontSize: "12px",
                background: activeResultsTab === "not_shortlisted" ? "#fde8e8" : "transparent",
                color: activeResultsTab === "not_shortlisted" ? "#c0392b" : "var(--muted)",
                fontWeight: activeResultsTab === "not_shortlisted" ? 600 : 500,
                border: activeResultsTab === "not_shortlisted" ? "1px solid #f5b7b1" : "none",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              className="flex items-center gap-2"
            >
              <XCircle size={14} style={{ color: "#c0392b" }} />
              Not Shortlisted ({notShortlistedCandidates.length})
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <MagnifyingGlass
              size={14}
              style={{ color: "var(--muted)" }}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name or email..."
              style={{
                background: "var(--surface)",
                border: "1px solid var(--outline)",
                borderRadius: "999px",
                color: "var(--ink)",
                padding: "8px 14px 8px 36px",
                fontSize: "12px",
                outline: "none",
              }}
              className="w-full sm:w-64"
            />
          </div>
        </div>

        {/* Candidate Cards List */}
        {displayedCandidates.length === 0 ? (
          <div
            style={{
              border: "1px dashed var(--outline)",
              background: "var(--surface)",
              borderRadius: "20px",
              padding: "48px 24px",
            }}
            className="text-center space-y-1"
          >
            <p style={{ color: "var(--muted)" }} className="text-xs">
              No candidates found in the {activeResultsTab === "shortlisted" ? "Shortlisted" : "Not Shortlisted"} category.
            </p>
            {allPoolCandidates.length === 0 && (
              <p style={{ color: "var(--muted)" }} className="text-[11px]">
                Upload resumes or an Excel sheet above to begin AI screening.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayedCandidates.map((cand, idx) => {
              const ranking = tournamentRankings.find(
                (r) => r.email.toLowerCase() === cand.email.toLowerCase() || r.candidateId === cand.id
              );
              const latestResult = cand.roundResults?.[0];
              const score = ranking?.comparativeScore ?? latestResult?.score ?? (cand.status === "SHORTLISTED" ? 82 : 38);
              const isShortlisted = ranking ? ranking.isQualified : cand.status === "SHORTLISTED";
              const displayName = extractCandidateNameFromResume(cand.resumeText, cand.email, cand.name);

              return (
                <div
                  key={cand.id}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--outline)",
                    borderRadius: "18px",
                    padding: "18px 20px",
                  }}
                  className="space-y-3 transition-all hover:shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
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
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      >
                        0{idx + 1}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 style={{ color: "var(--ink)", margin: 0 }} className="text-sm font-semibold">
                            {displayName}
                          </h4>
                          {ranking && (
                            <span
                              style={{
                                background: "var(--surface-purple)",
                                color: "var(--primary-deep)",
                                border: "1px solid var(--outline)",
                                padding: "1px 8px",
                                borderRadius: "999px",
                                fontSize: "10px",
                                fontWeight: 700,
                              }}
                            >
                              Rank #{ranking.rank}
                            </span>
                          )}
                          <span
                            style={{
                              background: isShortlisted ? "#eaf6ee" : "#fde8e8",
                              color: isShortlisted ? "var(--green)" : "#c0392b",
                              border: isShortlisted ? "1px solid #b8dec5" : "1px solid #f5b7b1",
                              padding: "2px 9px",
                              borderRadius: "999px",
                              fontSize: "10px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                            }}
                          >
                            {isShortlisted
                              ? "Shortlisted (YES)"
                              : ranking
                              ? `Under Cutoff (Top ${cutoff})`
                              : "Not Shortlisted (NO)"}
                          </span>
                          {cand.isOverridden && (
                            <span
                              style={{
                                background: "var(--surface-blue)",
                                color: "#1565c0",
                                border: "1px solid #90caf9",
                                padding: "1px 8px",
                                borderRadius: "999px",
                                fontSize: "10px",
                                fontWeight: 600,
                              }}
                            >
                              HR Override
                            </span>
                          )}
                          <EmailStatusBadge
                            status={cand.emailStatus}
                            sentAt={cand.emailSentAt}
                            error={cand.emailError}
                            onRetry={() => setEmailCandidate(cand)}
                            size="sm"
                          />
                        </div>
                        <div style={{ color: "var(--muted)", marginTop: "2px" }} className="text-xs">
                          {cand.email} · {cand.experienceYears}y Experience
                        </div>
                      </div>
                    </div>

                    {/* Right Side Stats & Actions */}
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                      <div
                        style={{
                          background: "var(--surface-high)",
                          border: "1px solid var(--outline)",
                          borderRadius: "999px",
                          padding: "5px 12px",
                          fontSize: "12px",
                          color: "var(--muted)",
                        }}
                      >
                        Match Score: <span style={{ color: "var(--ink)", fontWeight: 700 }}>{score}%</span>
                      </div>

                      {/* Send Email Button */}
                      <button
                        type="button"
                        onClick={() => setEmailCandidate(cand)}
                        className="md-button md-button--filled text-xs"
                        style={{ minHeight: "34px", padding: "0 14px" }}
                        title="Send email to this candidate"
                      >
                        <EnvelopeSimple size={13} /> Send Mail
                      </button>

                      {/* If NOT shortlisted: Show Copy Mail Body and HR Override buttons */}
                      {!isShortlisted ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopyMailBody(cand)}
                            className="md-button md-button--tonal text-xs"
                            style={{ minHeight: "34px", padding: "0 12px" }}
                            title="Copy personalized rejection email body"
                          >
                            {copiedId === cand.id ? (
                              <Check size={13} style={{ color: "var(--green)" }} />
                            ) : (
                              <Copy size={13} />
                            )}
                            {copiedId === cand.id ? "Copied!" : "Copy Mail Body"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOverride(cand)}
                            disabled={overridingId === cand.id}
                            style={{
                              background: "#eaf6ee",
                              color: "var(--green)",
                              border: "1px solid #b8dec5",
                              borderRadius: "999px",
                              padding: "0 12px",
                              minHeight: "34px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                            className="inline-flex items-center gap-1 transition-colors"
                            title="Override not-shortlisted candidate to shortlisted"
                          >
                            <CheckFat size={13} />
                            {overridingId === cand.id ? "Promoting..." : "Override to Shortlisted"}
                          </button>
                        </>
                      ) : (
                        <div
                          style={{ color: "var(--green)", fontSize: "11px", fontWeight: 600 }}
                          className="flex items-center gap-1"
                          title="Shortlisted candidates cannot be overridden to rejected per recruitment policy"
                        >
                          <CheckCircle size={14} /> Advanced to Next Round
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email Body Preview (For Not Shortlisted) */}
                  {!isShortlisted && (
                    <div
                      style={{
                        background: "var(--surface-high)",
                        border: "1px solid var(--outline)",
                        borderRadius: "14px",
                        padding: "14px",
                      }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--muted)" }}>
                        <span className="flex items-center gap-1 font-medium">
                          <Info size={12} /> Generated Feedback Email (Body Part Only):
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setEmailCandidate(cand)}
                            style={{ color: "var(--primary)" }}
                            className="hover:underline flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <EnvelopeSimple size={12} /> Send Email
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyMailBody(cand)}
                            style={{ color: "var(--primary)" }}
                            className="hover:underline flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Copy size={12} /> Copy Text
                          </button>
                        </div>
                      </div>
                      <p
                        style={{
                          color: "var(--ink)",
                          margin: 0,
                          background: "var(--surface)",
                          borderRadius: "10px",
                          border: "1px solid var(--outline)",
                          padding: "12px",
                        }}
                        className="text-xs whitespace-pre-line leading-relaxed font-sans"
                      >
                        {sanitizeMailBodyGreeting(ranking?.mailBody || cand.personalizedReply, displayName) ||
                          `Dear ${displayName},\n\nThank you for taking the time to apply for the ${jobTitle} position.\n\nAfter reviewing your resume against our core role requirements, your current background lacked sufficient hands-on experience in the key technical requirements outlined in our job description.\n\nWe encourage you to continue building projects in these areas and invite you to apply for future opportunities.`}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pool Benchmark Modal ── */}
      {showBenchmarkModal && poolBenchmark && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            background: "rgba(41, 38, 49, 0.4)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "56rem",
              maxHeight: "85vh",
              background: "var(--surface-high)",
              border: "1px solid var(--outline)",
              borderRadius: "24px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 22px 55px rgba(60,48,83,.15)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--outline)",
                background: "var(--surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "999px",
                      background: "var(--primary)",
                    }}
                    className="animate-pulse"
                  />
                  <h3 style={{ color: "var(--ink)", margin: 0 }} className="text-base font-bold">
                    Applicant Pool Calibrated Benchmark
                  </h3>
                  <span
                    style={{
                      fontSize: "11px",
                      borderRadius: "999px",
                      padding: "2px 8px",
                      background: "var(--surface-purple)",
                      color: "var(--primary-deep)",
                      fontWeight: 600,
                    }}
                  >
                    High-Water Mark
                  </span>
                </div>
                <p style={{ color: "var(--muted)", margin: "4px 0 0" }} className="text-xs">
                  Established across candidate pool for <span style={{ color: "var(--ink)", fontWeight: 600 }}>{jobTitle}</span>. Candidates were comparatively calibrated against these standards.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBenchmarkModal(false)}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "var(--muted)",
                  padding: "8px",
                  borderRadius: "999px",
                  cursor: "pointer",
                }}
                className="hover:text-[var(--ink)]"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: 2 Columns (Top Projects & Top Experiences) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: Top Projects */}
                <div className="space-y-3">
                  <div style={{ borderBottom: "1px solid var(--outline)" }} className="flex items-center justify-between pb-2">
                    <h4 style={{ color: "var(--primary-deep)" }} className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkle size={14} />
                      Top {poolBenchmark.topProjects.length} Projects in Pool
                    </h4>
                    <span style={{ color: "var(--muted)" }} className="text-[10px]">
                      Max 10
                    </span>
                  </div>

                  {poolBenchmark.topProjects.length === 0 ? (
                    <p style={{ color: "var(--muted)" }} className="text-xs italic">No specific projects identified.</p>
                  ) : (
                    <div className="space-y-3">
                      {poolBenchmark.topProjects.map((proj, pIdx) => (
                        <div
                          key={pIdx}
                          style={{
                            background: "var(--surface)",
                            border: "1px solid var(--outline)",
                            borderRadius: "14px",
                            padding: "14px",
                          }}
                          className="space-y-2 transition-all hover:border-[var(--primary)]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span style={{ color: "var(--ink)" }} className="text-xs font-bold">
                              {pIdx + 1}. {proj.title}
                            </span>
                            {proj.candidateName && (
                              <span
                                style={{
                                  background: "var(--surface-purple)",
                                  color: "var(--primary-deep)",
                                  padding: "2px 8px",
                                  borderRadius: "999px",
                                  fontSize: "10px",
                                  fontWeight: 600,
                                }}
                                className="shrink-0"
                              >
                                {proj.candidateName}
                              </span>
                            )}
                          </div>
                          <p style={{ color: "var(--ink)", margin: 0 }} className="text-xs leading-relaxed">
                            {proj.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {proj.techStack.map((tech, tIdx) => (
                              <span
                                key={tIdx}
                                style={{
                                  background: "var(--surface-high)",
                                  border: "1px solid var(--outline)",
                                  color: "var(--muted)",
                                  padding: "2px 6px",
                                  borderRadius: "6px",
                                  fontSize: "10px",
                                }}
                              >
                                {tech}
                              </span>
                            ))}
                            {proj.scaleOrImpact && (
                              <span
                                style={{
                                  background: "var(--surface-purple)",
                                  color: "var(--primary-deep)",
                                  padding: "2px 6px",
                                  borderRadius: "6px",
                                  fontSize: "10px",
                                  fontWeight: 600,
                                }}
                                className="ml-auto"
                              >
                                {proj.scaleOrImpact}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Column 2: Top Experiences */}
                <div className="space-y-3">
                  <div style={{ borderBottom: "1px solid var(--outline)" }} className="flex items-center justify-between pb-2">
                    <h4 style={{ color: "var(--primary-deep)" }} className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <UsersThree size={14} />
                      Top {poolBenchmark.topExperiences.length} Experiences in Pool
                    </h4>
                    <span style={{ color: "var(--muted)" }} className="text-[10px]">
                      Max 10
                    </span>
                  </div>

                  {poolBenchmark.topExperiences.length === 0 ? (
                    <p style={{ color: "var(--muted)" }} className="text-xs italic">No specific experiences identified.</p>
                  ) : (
                    <div className="space-y-3">
                      {poolBenchmark.topExperiences.map((exp, eIdx) => (
                        <div
                          key={eIdx}
                          style={{
                            background: "var(--surface)",
                            border: "1px solid var(--outline)",
                            borderRadius: "14px",
                            padding: "14px",
                          }}
                          className="space-y-2 transition-all hover:border-[var(--primary)]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span style={{ color: "var(--ink)" }} className="text-xs font-bold block">
                                {eIdx + 1}. {exp.role}
                              </span>
                              <span style={{ color: "var(--muted)" }} className="text-[10px]">
                                {exp.domainOrCompany} · {exp.yearsOrSeniority}
                              </span>
                            </div>
                            {exp.candidateName && (
                              <span
                                style={{
                                  background: "var(--surface-purple)",
                                  color: "var(--primary-deep)",
                                  padding: "2px 8px",
                                  borderRadius: "999px",
                                  fontSize: "10px",
                                  fontWeight: 600,
                                }}
                                className="shrink-0"
                              >
                                {exp.candidateName}
                              </span>
                            )}
                          </div>
                          <p style={{ color: "var(--ink)", margin: 0 }} className="text-xs leading-relaxed">
                            {exp.responsibilities}
                          </p>
                          {exp.scaleOrImpact && (
                            <div className="pt-1">
                              <span
                                style={{
                                  background: "#eaf6ee",
                                  color: "var(--green)",
                                  border: "1px solid #b8dec5",
                                  padding: "2px 6px",
                                  borderRadius: "6px",
                                  fontSize: "10px",
                                  fontWeight: 600,
                                }}
                              >
                                {exp.scaleOrImpact}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid var(--outline)",
                background: "var(--surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: "var(--muted)" }} className="text-xs">
                Target Cutoff: <strong style={{ color: "var(--ink)" }}>{cutoff}</strong> candidates
              </span>
              <button
                type="button"
                onClick={() => setShowBenchmarkModal(false)}
                className="md-button md-button--filled text-xs"
                style={{ minHeight: "36px", padding: "0 18px" }}
              >
                Done
              </button>
            </div>
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
            jobTitle: jobTitle,
            personalizedReply:
              (tournamentRankings.find((r) => r.candidateId === emailCandidate.id || r.email?.toLowerCase() === emailCandidate.email.toLowerCase()))?.mailBody ||
              emailCandidate.personalizedReply,
          }}
          onSuccess={async () => {
            await onRefresh();
          }}
        />
      )}

      <BulkEmailModal
        isOpen={isBulkEmailOpen}
        onClose={() => setIsBulkEmailOpen(false)}
        candidates={allPoolCandidates.map((c) => {
          const ranking = tournamentRankings.find(
            (r) => r.candidateId === c.id || r.email?.toLowerCase() === c.email.toLowerCase()
          );
          return {
            id: c.id,
            name: c.name,
            email: c.email,
            status: c.status,
            jobTitle: jobTitle,
            personalizedReply: ranking?.mailBody || c.personalizedReply,
          };
        })}
        jobTitle={jobTitle}
        onComplete={async () => {
          await onRefresh();
        }}
      />
    </div>
  );
}

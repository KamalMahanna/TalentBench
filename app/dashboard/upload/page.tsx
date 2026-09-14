"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import {
  TrayArrowUp,
  FileText,
  FilePdf,
  FileDoc,
  Trash,
  CheckCircle,
  Clock,
  Sparkle,
  ArrowRight,
  Briefcase,
  Warning,
  ArrowsClockwise,
  UsersThree,
  EnvelopeSimple,
  Eye,
  X,
  HardDrive,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useTheme } from "@/context/theme-context";
import { parseResumeFileInBrowser, extractEmailFromText } from "@/lib/client/resume-parser";
import {
  saveCachedResume,
  loadCachedResumes,
  removeCachedResume,
  clearCachedResumes,
  CachedResume,
} from "@/lib/client/resume-cache";

interface QueuedFile {
  id: string;
  name: string;
  size: number;
  status: "pending" | "parsing" | "parsed" | "processing" | "completed" | "error";
  progress: number;
  candidateName?: string;
  experienceYears?: number;
  skills?: string;
  resumeText?: string;
  extractedEmail?: string | null;
  isGmail?: boolean;
  wordCount?: number;
  charCount?: number;
}

interface JobProfileSummary {
  id: string;
  title: string;
  minExperience: number;
  maxExperience: number;
}

const SAMPLE_RESUMES = [
  {
    name: "Siddharth_Nair_Senior_Systems.pdf",
    candidateName: "Siddharth Nair",
    extractedEmail: "siddharth.nair@gmail.com",
    isGmail: true,
    experienceYears: 6,
    skills: "Rust, Go, Raft, Distributed Systems, gRPC, PostgreSQL",
    resumeText:
      "Siddharth Nair\nEmail: siddharth.nair@gmail.com | Phone: +1 (555) 349-2019\nSenior Infrastructure Engineer with 6 years experience architecting fault-tolerant consensus mechanisms in Go and Rust. Led engineering for distributed KV storage system handling 1.2M queries/sec. Deep background in Linux networking and systems optimization.",
  },
  {
    name: "Anya_Petrova_Distributed_Staff.pdf",
    candidateName: "Anya Petrova",
    extractedEmail: "anya.petrova.eng@gmail.com",
    isGmail: true,
    experienceYears: 8,
    skills: "Distributed Databases, Go, Kubernetes, RocksDB, Storage Engines",
    resumeText:
      "Anya Petrova\nEmail: anya.petrova.eng@gmail.com\nStaff Systems Architect with 8 years building distributed storage engines and multi-region consensus clusters. Contributor to open source Raft consensus implementations. Expert in low-latency systems and kernel tuning.",
  },
  {
    name: "Lucas_Muller_Backend_Lead.docx",
    candidateName: "Lucas Müller",
    extractedEmail: "lucas.muller@vanguard.tech",
    isGmail: false,
    experienceYears: 5,
    skills: "Go, Kubernetes, Kafka, gRPC, Docker, Cloud Architecture",
    resumeText:
      "Lucas Müller\nEmail: lucas.muller@vanguard.tech\nBackend Lead with 5 years experience scaling event-driven streaming clusters using Kafka and Go microservices. Managed zero-downtime cluster migrations on AWS and GCP with strict SLA guarantees.",
  },
  {
    name: "Mei_Ling_Systems_Junior.pdf",
    candidateName: "Mei Ling",
    extractedEmail: "meiling.dev@gmail.com",
    isGmail: true,
    experienceYears: 2,
    skills: "Python, FastAPI, Docker, SQL, Basic Go",
    resumeText:
      "Mei Ling\nEmail: meiling.dev@gmail.com\nJunior Software Developer with 2 years experience building REST APIs with Python and FastAPI. Keen interest in expanding into distributed systems and cloud infrastructure.",
  },
];

export default function BulkUploadPage() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [jobs, setJobs] = useState<JobProfileSummary[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [autoScreen, setAutoScreen] = useState(true);
  const [isIngesting, setIsIngesting] = useState(false);
  const [completedCount, setCompletedCount] = useState<number | null>(null);

  // Preview Modal
  const [previewItem, setPreviewItem] = useState<QueuedFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Load active jobs
  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => {
        if (data.jobs && data.jobs.length > 0) {
          setJobs(data.jobs);
          setSelectedJobId(data.jobs[0].id);
        }
      })
      .catch((err) => console.error("Error loading jobs:", err));
  }, []);

  // 2. Load cached resumes from browser IndexedDB on mount
  useEffect(() => {
    loadCachedResumes()
      .then((cached) => {
        if (cached && cached.length > 0) {
          const restoredQueue: QueuedFile[] = cached.map((c) => ({
            id: c.id,
            name: c.fileName,
            size: c.fileSize,
            status: "parsed",
            progress: 100,
            resumeText: c.resumeText,
            extractedEmail: c.extractedEmail,
            isGmail: c.isGmail,
            wordCount: c.wordCount,
            charCount: c.charCount,
          }));
          setQueue(restoredQueue);
          toast.info(`Restored ${cached.length} resume(s) from local browser cache.`);
        }
      })
      .catch((err) => console.warn("Failed to load IndexedDB cache:", err));
  }, []);

  // 3. Add files and trigger in-browser text & email extraction
  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Create initial pending entries
    const initialItems: QueuedFile[] = fileArray.map((file, idx) => ({
      id: `file-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      size: file.size,
      status: "parsing",
      progress: 20,
    }));

    setQueue((prev) => [...prev, ...initialItems]);
    toast.loading(`Scraping text locally in browser for ${fileArray.length} file(s)...`, {
      id: "parsing-toast",
    });

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const targetId = initialItems[i].id;

      try {
        // Run in-browser scraper (PDF, DOCX, or TXT)
        const parseResult = await parseResumeFileInBrowser(file);

        // Update item in state
        setQueue((prev) =>
          prev.map((item) =>
            item.id === targetId
              ? {
                  ...item,
                  status: "parsed",
                  progress: 100,
                  resumeText: parseResult.text,
                  extractedEmail: parseResult.emailResult.email,
                  isGmail: parseResult.emailResult.isGmail,
                  wordCount: parseResult.wordCount,
                  charCount: parseResult.charCount,
                }
              : item
          )
        );

        // Save to IndexedDB cache
        const cacheEntry: CachedResume = {
          id: targetId,
          fileName: file.name,
          fileSize: file.size,
          resumeText: parseResult.text,
          extractedEmail: parseResult.emailResult.email,
          isGmail: parseResult.emailResult.isGmail,
          allEmails: parseResult.emailResult.allEmails,
          wordCount: parseResult.wordCount,
          charCount: parseResult.charCount,
          status: "ready",
          jobId: selectedJobId,
          createdAt: Date.now(),
        };
        await saveCachedResume(cacheEntry);
      } catch (err) {
        console.error(`Error parsing file ${file.name}:`, err);
        setQueue((prev) =>
          prev.map((item) =>
            item.id === targetId ? { ...item, status: "error" } : item
          )
        );
      }
    }

    toast.success(`Text & Email extracted locally in browser!`, {
      id: "parsing-toast",
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [selectedJobId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleLoadSampleBatch = async () => {
    const sampleItems: QueuedFile[] = SAMPLE_RESUMES.map((s, idx) => ({
      id: `sample-${Date.now()}-${idx}`,
      name: s.name,
      size: 145000 + idx * 28000,
      status: "parsed",
      progress: 100,
      candidateName: s.candidateName,
      experienceYears: s.experienceYears,
      skills: s.skills,
      resumeText: s.resumeText,
      extractedEmail: s.extractedEmail,
      isGmail: s.isGmail,
      wordCount: s.resumeText.split(/\s+/).length,
      charCount: s.resumeText.length,
    }));

    setQueue((prev) => [...prev, ...sampleItems]);

    // Cache samples in IndexedDB
    for (const s of sampleItems) {
      await saveCachedResume({
        id: s.id,
        fileName: s.name,
        fileSize: s.size,
        resumeText: s.resumeText || "",
        extractedEmail: s.extractedEmail || null,
        isGmail: Boolean(s.isGmail),
        allEmails: s.extractedEmail ? [s.extractedEmail] : [],
        wordCount: s.wordCount || 50,
        charCount: s.charCount || 200,
        status: "ready",
        jobId: selectedJobId,
        createdAt: Date.now(),
      });
    }

    toast.success("Loaded 4 sample resume profiles with extracted Gmail IDs into queue!");
  };

  const removeFile = async (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    await removeCachedResume(id);
  };

  const clearQueue = async () => {
    setQueue([]);
    setCompletedCount(null);
    await clearCachedResumes();
    toast.info("Cleared queue and browser cache.");
  };

  const handleStartIngestion = async () => {
    if (!selectedJobId) {
      toast.error("Please select a target Job Requisition.");
      return;
    }

    if (queue.length === 0) {
      toast.error("Please add resumes to the ingestion queue.");
      return;
    }

    setIsIngesting(true);
    setCompletedCount(null);

    // Update status to processing
    setQueue((prev) =>
      prev.map((item) => ({ ...item, status: "processing", progress: 40 }))
    );

    try {
      // Send extracted text and emails directly to backend
      const res = await fetch("/api/candidates/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobProfileId: selectedJobId,
          autoScreen,
          files: queue.map((f) => ({
            name: f.candidateName || f.name,
            email: f.extractedEmail,
            experienceYears: f.experienceYears,
            skills: f.skills,
            resumeText: f.resumeText,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Ingestion failed.");
        setIsIngesting(false);
        setQueue((prev) =>
          prev.map((item) => ({ ...item, status: "error" }))
        );
        return;
      }

      // Mark all as completed
      setQueue((prev) =>
        prev.map((item) => ({ ...item, status: "completed", progress: 100 }))
      );
      setCompletedCount(data.processed);
      setIsIngesting(false);

      // Clear successfully ingested files from IndexedDB cache
      await clearCachedResumes();

      toast.success(
        `Successfully ingested ${data.processed} candidate(s)${
          autoScreen ? " and executed AI screening" : ""
        }!`
      );
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Network error during bulk ingestion.");
      setIsIngesting(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FilePdf size={22} weight="duotone" className="text-rose-400" />;
    if (ext === "docx" || ext === "doc") return <FileDoc size={22} weight="duotone" className="text-blue-400" />;
    return <FileText size={22} weight="duotone" className="text-[#8FB6E8]" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className={`text-2xl sm:text-3xl font-display font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
              Bulk Resume Ingestion Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5">
              <HardDrive size={13} weight="fill" /> In-Browser Scraping &amp; Cache Active
            </span>
          </div>
          <p className={`text-xs sm:text-sm mt-1 ${isLight ? "text-slate-600" : "text-[#7C91B4]"}`}>
            Resumes are scraped locally in your browser with automatic Gmail regex extraction and IndexedDB caching.
          </p>
        </div>

        <GlassButton variant="secondary" onClick={handleLoadSampleBatch} className="text-xs">
          <Sparkle size={16} />
          Load Sample Cohort
        </GlassButton>
      </div>

      {/* Requisition Selector & Options Card */}
      <div
        className={`p-6 rounded-3xl border shadow-lg ${
          isLight ? "bg-white border-slate-200" : "bg-[#0D1633] border-white/15"
        }`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
          <div className="sm:col-span-8">
            <label className="block text-xs font-mono uppercase text-[#7C91B4] mb-2">
              Target Job Requisition *
            </label>
            <div className="relative">
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className={`w-full py-2.5 px-4 rounded-xl text-sm border focus:outline-none focus:ring-1 focus:ring-[#8FB6E8] cursor-pointer ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900"
                    : "bg-[#060B18] border-white/20 text-[#EAF1FB]"
                }`}
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} (Tier: {j.minExperience}–{j.maxExperience} yrs)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sm:col-span-4 pt-4 sm:pt-0">
            <label className="flex items-center gap-3 cursor-pointer text-xs sm:text-sm font-medium">
              <input
                type="checkbox"
                checked={autoScreen}
                onChange={(e) => setAutoScreen(e.target.checked)}
                className="w-4 h-4 rounded text-[#8FB6E8] focus:ring-[#8FB6E8] border-white/20 cursor-pointer"
              />
              <span className={isLight ? "text-slate-700" : "text-slate-300"}>
                Trigger Autonomous AI Screen immediately
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`p-10 sm:p-14 rounded-3xl border-2 border-dashed text-center transition-all cursor-pointer relative overflow-hidden ${
          isDragging
            ? "border-[#8FB6E8] bg-[#8FB6E8]/10 scale-[1.01]"
            : isLight
            ? "border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/50"
            : "border-white/15 bg-white/[0.01] hover:border-[#8FB6E8]/40 hover:bg-white/[0.03]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.doc,.md"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
          className="hidden"
        />

        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#8FB6E8]/10 text-[#8FB6E8] flex items-center justify-center mb-4">
          <TrayArrowUp size={32} weight="duotone" />
        </div>

        <h3 className={`text-lg sm:text-xl font-display font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
          Drag &amp; Drop Resumes Here
        </h3>
        <p className={`text-xs sm:text-sm mt-1.5 max-w-md mx-auto ${isLight ? "text-slate-600" : "text-[#7C91B4]"}`}>
          Supports PDF, DOCX, TXT. Files are <span className="text-emerald-400 font-medium">scraped locally in your browser</span> and cached in IndexedDB before uploading.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#8FB6E8]">
            Click to Browse Files
          </span>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            Gmail Regex Auto-Detect
          </span>
        </div>
      </div>

      {/* Ingestion Queue Table */}
      {queue.length > 0 && (
        <div
          className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
            isLight ? "bg-white border-slate-200" : "bg-[#0D1633] border-white/15"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className={`text-base sm:text-lg font-display font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                Ingestion Queue ({queue.length})
              </h3>
              {completedCount !== null && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  {completedCount} Ingested
                </span>
              )}
            </div>

            <button
              onClick={clearQueue}
              className="text-xs font-mono text-[#7C91B4] hover:text-rose-400 transition-colors cursor-pointer"
            >
              Clear Queue &amp; Cache
            </button>
          </div>

          <div className="space-y-3">
            {queue.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/10"
                }`}
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    {getFileIcon(item.name)}
                  </div>

                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className={`text-sm font-semibold truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                        {item.name}
                      </h4>
                      <span className="text-xs font-mono text-[#7C91B4]">
                        {(item.size / 1024).toFixed(1)} KB
                      </span>
                    </div>

                    {/* Extracted Email & Metrics Pills */}
                    <div className="flex flex-wrap items-center gap-2">
                      {item.extractedEmail ? (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                            item.isGmail
                              ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                              : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                          }`}
                        >
                          <EnvelopeSimple size={13} weight="fill" />
                          {item.extractedEmail}
                          {item.isGmail && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-500/25 px-1 rounded ml-0.5">
                              Gmail
                            </span>
                          )}
                        </span>
                      ) : item.status === "parsed" ? (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          No email detected
                        </span>
                      ) : null}

                      {item.charCount !== undefined && (
                        <span className="text-[10px] font-mono text-[#7C91B4] bg-white/5 px-2 py-0.5 rounded-full">
                          {item.charCount.toLocaleString()} chars · {item.wordCount} words
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                  {/* Preview Text Button */}
                  {item.resumeText && (
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="px-2.5 py-1 rounded-xl text-xs font-mono flex items-center gap-1.5 text-[#8FB6E8] bg-[#8FB6E8]/10 hover:bg-[#8FB6E8]/20 transition-all cursor-pointer"
                    >
                      <Eye size={14} />
                      Preview Text
                    </button>
                  )}

                  {/* Status Badges */}
                  {item.status === "completed" && (
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full">
                      <CheckCircle size={14} weight="fill" /> Ingested
                    </span>
                  )}
                  {item.status === "processing" && (
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-[#8FB6E8] bg-[#8FB6E8]/15 px-2.5 py-1 rounded-full animate-pulse">
                      <ArrowsClockwise size={14} className="animate-spin" /> Ingesting...
                    </span>
                  )}
                  {item.status === "parsing" && (
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-full animate-pulse">
                      <ArrowsClockwise size={14} className="animate-spin" /> Scraping...
                    </span>
                  )}
                  {item.status === "parsed" && (
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full">
                      <CheckCircle size={14} weight="fill" /> Ready (Cached)
                    </span>
                  )}
                  {item.status === "pending" && (
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-[#7C91B4] bg-white/5 px-2.5 py-1 rounded-full">
                      <Clock size={14} /> Queued
                    </span>
                  )}

                  {!isIngesting && (
                    <button
                      onClick={() => removeFile(item.id)}
                      className="p-1.5 rounded-lg text-[#7C91B4] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-mono text-[#7C91B4]">
              {queue.filter((q) => q.status === "parsed" || q.status === "completed").length} of {queue.length} resume(s) scraped &amp; cached locally.
            </div>

            <div className="flex items-center gap-3">
              {completedCount !== null && (
                <GlassButton variant="secondary" href="/dashboard/candidates">
                  <UsersThree size={16} />
                  View in Candidate Pool
                </GlassButton>
              )}

              <GlassButton
                variant="primary"
                onClick={handleStartIngestion}
                disabled={isIngesting || queue.some((q) => q.status === "parsing")}
                withArrow
              >
                {isIngesting ? "Ingesting Cohort..." : "Execute Ingestion"}
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* Extracted Text Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            className={`w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
              isLight ? "bg-white border-slate-300" : "bg-[#0D1633] border-white/20 text-white"
            }`}
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-display font-bold truncate">
                  {previewItem.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {previewItem.extractedEmail && (
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
                        previewItem.isGmail
                          ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                      }`}
                    >
                      {previewItem.extractedEmail} ({previewItem.isGmail ? "Gmail" : "Email"})
                    </span>
                  )}
                  <span className="text-xs font-mono text-[#7C91B4]">
                    {previewItem.charCount?.toLocaleString()} characters
                  </span>
                </div>
              </div>

              <button
                onClick={() => setPreviewItem(null)}
                className="p-2 rounded-xl text-[#7C91B4] hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap bg-[#060B18]/60 selection:bg-[#8FB6E8]/30">
              {previewItem.resumeText || "No text could be extracted from this document."}
            </div>

            <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-[#7C91B4]">
              <span>Scraped locally in-browser · Zero server upload for parsing</span>
              <GlassButton variant="secondary" onClick={() => setPreviewItem(null)} className="text-xs">
                Close Preview
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

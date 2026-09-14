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
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useTheme } from "@/context/theme-context";

interface QueuedFile {
  id: string;
  name: string;
  size: number;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  candidateName?: string;
  experienceYears?: number;
  skills?: string;
  resumeText?: string;
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
    experienceYears: 6,
    skills: "Rust, Go, Raft, Distributed Systems, gRPC, PostgreSQL",
    resumeText:
      "Senior Infrastructure Engineer with 6 years experience architecting fault-tolerant consensus mechanisms in Go and Rust. Led engineering for distributed KV storage system handling 1.2M queries/sec. Deep background in Linux networking and systems optimization.",
  },
  {
    name: "Anya_Petrova_Distributed_Staff.pdf",
    candidateName: "Anya Petrova",
    experienceYears: 8,
    skills: "Distributed Databases, Go, Kubernetes, RocksDB, Storage Engines",
    resumeText:
      "Staff Systems Architect with 8 years building distributed storage engines and multi-region consensus clusters. Contributor to open source Raft consensus implementations. Expert in low-latency systems and kernel tuning.",
  },
  {
    name: "Lucas_Muller_Backend_Lead.docx",
    candidateName: "Lucas Müller",
    experienceYears: 5,
    skills: "Go, Kubernetes, Kafka, gRPC, Docker, Cloud Architecture",
    resumeText:
      "Backend Lead with 5 years experience scaling event-driven streaming clusters using Kafka and Go microservices. Managed zero-downtime cluster migrations on AWS and GCP with strict SLA guarantees.",
  },
  {
    name: "Mei_Ling_Systems_Junior.pdf",
    candidateName: "Mei Ling",
    experienceYears: 2,
    skills: "Python, FastAPI, Docker, SQL, Basic Go",
    resumeText:
      "Junior Software Developer with 2 years experience building REST APIs with Python and FastAPI. Keen interest in expanding into distributed systems and cloud infrastructure.",
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const addFilesToQueue = (files: FileList | File[]) => {
    const newItems: QueuedFile[] = Array.from(files).map((file, idx) => ({
      id: `file-${Date.now()}-${idx}`,
      name: file.name,
      size: file.size,
      status: "pending",
      progress: 0,
    }));
    setQueue((prev) => [...prev, ...newItems]);
    toast.success(`Added ${newItems.length} resume(s) to queue`);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleLoadSampleBatch = () => {
    const sampleItems: QueuedFile[] = SAMPLE_RESUMES.map((s, idx) => ({
      id: `sample-${Date.now()}-${idx}`,
      name: s.name,
      size: 145000 + idx * 28000,
      status: "pending",
      progress: 0,
      candidateName: s.candidateName,
      experienceYears: s.experienceYears,
      skills: s.skills,
      resumeText: s.resumeText,
    }));

    setQueue((prev) => [...prev, ...sampleItems]);
    toast.success("Loaded 4 sample production resume profiles into queue!");
  };

  const removeFile = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearQueue = () => {
    setQueue([]);
    setCompletedCount(null);
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

    // Simulate animated upload progress
    setQueue((prev) =>
      prev.map((item) => ({ ...item, status: "processing", progress: 25 }))
    );

    try {
      // Step 1: Advance progress
      setTimeout(() => {
        setQueue((prev) =>
          prev.map((item) => ({ ...item, progress: 65 }))
        );
      }, 400);

      // Step 2: Send payload to bulk upload API
      const res = await fetch("/api/candidates/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobProfileId: selectedJobId,
          autoScreen,
          files: queue.map((f) => ({
            name: f.candidateName || f.name,
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className={`text-2xl sm:text-3xl font-display font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
              Bulk Resume Ingestion Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#8FB6E8]/15 text-[#8FB6E8] border border-[#8FB6E8]/25">
              Multi-Format Dropzone
            </span>
          </div>
          <p className={`text-xs sm:text-sm mt-1 ${isLight ? "text-slate-600" : "text-[#7C91B4]"}`}>
            Ingest candidate cohorts, extract structural signals, and trigger autonomous evaluation.
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
                className="w-4 h-4 rounded text-[#8FB6E8] focus:ring-[#8FB6E8] rounded border-white/20 cursor-pointer"
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
        className={`p-10 sm:p-16 rounded-3xl border-2 border-dashed text-center transition-all cursor-pointer relative overflow-hidden ${
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
          accept=".pdf,.docx,.txt,.doc"
          onChange={(e) => e.target.files && addFilesToQueue(e.target.files)}
          className="hidden"
        />

        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#8FB6E8]/10 text-[#8FB6E8] flex items-center justify-center mb-4">
          <TrayArrowUp size={32} weight="duotone" />
        </div>

        <h3 className={`text-lg sm:text-xl font-display font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
          Drag &amp; Drop Resumes Here
        </h3>
        <p className={`text-xs sm:text-sm mt-1.5 max-w-sm mx-auto ${isLight ? "text-slate-600" : "text-[#7C91B4]"}`}>
          Supports PDF, DOCX, TXT. Ingest single files or batch cohorts up to 50 resumes at once.
        </p>

        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#8FB6E8]">
            Click to Browse Files
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
              className="text-xs font-mono text-[#7C91B4] hover:text-rose-400 transition-colors"
            >
              Clear Queue
            </button>
          </div>

          <div className="space-y-3">
            {queue.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/10"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#8FB6E8]/10 text-[#8FB6E8] flex items-center justify-center shrink-0">
                    <FilePdf size={22} weight="duotone" />
                  </div>

                  <div className="min-w-0">
                    <h4 className={`text-sm font-semibold truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                      {item.name}
                    </h4>
                    <span className="text-xs font-mono text-[#7C91B4]">
                      {(item.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {/* Progress Bar if processing */}
                  {item.status === "processing" && (
                    <div className="w-28 sm:w-36 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-[#8FB6E8] rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
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
                  {item.status === "pending" && (
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-[#7C91B4] bg-white/5 px-2.5 py-1 rounded-full">
                      <Clock size={14} /> Ready
                    </span>
                  )}

                  {!isIngesting && (
                    <button
                      onClick={() => removeFile(item.id)}
                      className="p-1.5 rounded-lg text-[#7C91B4] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
              Ready to process {queue.length} resume(s) for selected requisition.
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
                disabled={isIngesting}
                withArrow
              >
                {isIngesting ? "Ingesting Cohort..." : "Execute Ingestion"}
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


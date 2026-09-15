"use client";

import React, { useState } from "react";
import { GlassButton } from "@/components/ui/glass-button";
import { ArrowLeft, Plus, Trash } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PipelineCanvas, PipelineStageItem } from "@/components/pipeline/pipeline-canvas";

export default function NewJobProfilePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [minExperience, setMinExperience] = useState<number>(3);
  const [maxExperience, setMaxExperience] = useState<number>(7);
  const [loading, setLoading] = useState(false);

  // Modular connector stages (starts with resume screening with cutoff 50, but can be customized or deleted to see the empty centered + canvas)
  const [stages, setStages] = useState<PipelineStageItem[]>([
    {
      type: "RESUME_SCREENING",
      title: "RESUME SCREENING",
      description: "",
      cutoff: 50,
      order: 0,
      config: JSON.stringify({
        cutoff: 50,
        inputType: "BULK_RESUME_OR_EXCEL",
        inputSpecText: "Bulk Resume Upload (PDF / DOCX / TXT) or Excel Sheet with column like 'resume_texts'.",
        outputSpecText: "Shortlisted candidates pool, automated rejection email bodies detailing missing skills, and Comparative Benchmark ranking.",
      }),
    },
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Job title is required.");
      return;
    }

    if (!description.trim()) {
      toast.error("Job description is required.");
      return;
    }

    if (minExperience < 0 || maxExperience < minExperience) {
      toast.error("Experience range: Maximum must be greater than or equal to minimum (>= 0).");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          minExperience: Number(minExperience),
          maxExperience: Number(maxExperience),
          initialRounds: stages.map((s, i) => ({
            type: s.type,
            title: s.title,
            description: s.description || null,
            config: s.config || null,
            order: i,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create job profile.");
        setLoading(false);
        return;
      }

      toast.success("Job profile and recruitment pipeline initialized!");
      router.push(`/dashboard/jobs/${data.job.id}`);
    } catch (err) {
      toast.error("Network error while creating profile.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back Link */}
      <Link
        href="/dashboard/jobs"
        className="inline-flex items-center gap-2 text-xs font-mono text-[#7C91B4] hover:text-[#EAF1FB] transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Job Profiles
      </Link>

      <div>
        <h1 className="text-2xl sm:text-4xl font-display font-bold text-white tracking-tight">
          Create Job Profile &amp; Pipeline
        </h1>
        <p className="text-xs sm:text-sm text-[#7C91B4] mt-1">
          Define strict qualification boundaries and configure the connector evaluation pipeline.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Card 1: Job Details & Mandatory Description */}
        <div className="rounded-3xl p-1.5 bg-white/[0.04] ring-1 ring-[#8FB6E8]/20 backdrop-blur-2xl shadow-xl">
          <div className="rounded-[calc(1.5rem-4px)] bg-[#0D1633] p-6 sm:p-8 border border-white/10 space-y-6">
            <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#8FB6E8]" />
              Core Role Specification
            </h2>

            {/* Title */}
            <div>
              <label className="block text-xs font-mono text-[#7C91B4] mb-1.5 uppercase">
                Job Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lead Distributed Consensus Engineer"
                className="w-full rounded-xl bg-[#060B18]/60 border border-[#8FB6E8]/20 px-4 py-2.5 text-sm text-[#EAF1FB] placeholder:text-[#7C91B4]/50 focus:outline-none focus:border-[#8FB6E8] focus:ring-1 focus:ring-[#8FB6E8] transition-all font-sans"
              />
            </div>

            {/* Job Description */}
            <div>
              <label className="block text-xs font-mono text-[#7C91B4] mb-1.5 uppercase">
                Job Description
              </label>
              <textarea
                required
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail technical requirements, expected deliverables, architecture challenges, tech stack (e.g., Rust, Raft, Kubernetes, high-concurrency systems)..."
                className="w-full rounded-xl bg-[#060B18]/60 border border-[#8FB6E8]/20 p-4 text-sm text-[#EAF1FB] placeholder:text-[#7C91B4]/50 focus:outline-none focus:border-[#8FB6E8] focus:ring-1 focus:ring-[#8FB6E8] transition-all font-sans leading-relaxed"
              />
            </div>

            {/* Years of Experience Range */}
            <div>
              <label className="block text-xs font-mono text-[#7C91B4] mb-1.5 uppercase">
                Required Years of Experience Range
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#060B18]/40 border border-[#8FB6E8]/15">
                  <span className="text-xs font-mono text-[#7C91B4]">MINIMUM EXPERIENCE (YEARS)</span>
                  <input
                    type="number"
                    required
                    min={0}
                    max={30}
                    value={minExperience}
                    onChange={(e) => setMinExperience(Math.max(0, parseInt(e.target.value) || 0))}
                    className="mt-2 w-full rounded-lg bg-[#0A1228] border border-[#8FB6E8]/20 px-3 py-2 text-base font-mono font-bold text-[#8FB6E8] focus:outline-none focus:border-[#8FB6E8]"
                  />
                </div>

                <div className="p-4 rounded-xl bg-[#060B18]/40 border border-[#8FB6E8]/15">
                  <span className="text-xs font-mono text-[#7C91B4]">MAXIMUM EXPERIENCE (YEARS)</span>
                  <input
                    type="number"
                    required
                    min={minExperience}
                    max={40}
                    value={maxExperience}
                    onChange={(e) => setMaxExperience(Math.max(minExperience, parseInt(e.target.value) || minExperience))}
                    className="mt-2 w-full rounded-lg bg-[#0A1228] border border-[#8FB6E8]/20 px-3 py-2 text-base font-mono font-bold text-[#60A5FA] focus:outline-none focus:border-[#60A5FA]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Initial Pipeline Connector Configuration */}
        <PipelineCanvas
          stages={stages}
          onChange={setStages}
          isEditable={true}
        />

        {/* Submit */}
        <div className="flex justify-end gap-4 pt-2">
          <GlassButton
            variant="secondary"
            href="/dashboard/jobs"
          >
            Cancel
          </GlassButton>
          <GlassButton
            variant="primary"
            type="submit"
            size="lg"
            withArrow
            disabled={loading}
          >
            {loading ? "Initializing..." : "Create Profile & Open Workspace"}
          </GlassButton>
        </div>
      </form>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { GlassButton } from "@/components/ui/glass-button";
import { ArrowLeft, Plus, Trash } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function NewJobProfilePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [minExperience, setMinExperience] = useState<number>(3);
  const [maxExperience, setMaxExperience] = useState<number>(7);
  const [loading, setLoading] = useState(false);

  // Default modular connector rounds
  const [rounds, setRounds] = useState([
    { type: "RESUME_SCREENING", title: "Autonomous AI Resume Screening" },
    { type: "APTITUDE", title: "Cognitive Logic & Problem Solving" },
    { type: "DSA", title: "Live DSA & System Algorithms" },
    { type: "COMMUNICATION", title: "Technical Communication & Architecture" },
    { type: "HR_ROUND", title: "Executive HR & Cultural Alignment" },
  ]);

  const addRound = (type: string, defaultTitle: string) => {
    setRounds([...rounds, { type, title: defaultTitle }]);
    toast.success(`Added ${defaultTitle} to pipeline`);
  };

  const removeRound = (index: number) => {
    if (rounds.length <= 1) {
      toast.error("Pipeline must have at least one round.");
      return;
    }
    setRounds(rounds.filter((_, i) => i !== index));
  };

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
          initialRounds: rounds.map((r, i) => ({
            ...r,
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
        <div className="rounded-3xl p-1.5 bg-white/[0.04] ring-1 ring-[#8FB6E8]/20 backdrop-blur-2xl shadow-xl">
          <div className="rounded-[calc(1.5rem-4px)] bg-[#0D1633] p-6 sm:p-8 border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#60A5FA]" />
                  Connector Pipeline Stages
                </h2>
                <p className="text-xs text-[#7C91B4] mt-0.5">
                  HR can add aptitude, DSA, communication, or HR rounds as many times as desired.
                </p>
              </div>

              {/* Quick Add Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addRound("DSA", "Additional Technical DSA Round")}
                  className="px-2.5 py-1 rounded-lg bg-[#60A5FA]/10 hover:bg-[#60A5FA]/20 text-[#60A5FA] text-xs font-mono border border-[#60A5FA]/30 transition-colors flex items-center gap-1"
                >
                  <Plus size={12} /> + DSA Round
                </button>
                <button
                  type="button"
                  onClick={() => addRound("APTITUDE", "Additional Aptitude Round")}
                  className="px-2.5 py-1 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 text-xs font-mono border border-amber-400/30 transition-colors flex items-center gap-1"
                >
                  <Plus size={12} /> + Aptitude Round
                </button>
                <button
                  type="button"
                  onClick={() => addRound("COMMUNICATION", "Leadership Communication Round")}
                  className="px-2.5 py-1 rounded-lg bg-[#A78BFA]/10 hover:bg-[#A78BFA]/20 text-[#A78BFA] text-xs font-mono border border-[#A78BFA]/30 transition-colors flex items-center gap-1"
                >
                  <Plus size={12} /> + Comm Round
                </button>
              </div>
            </div>

            {/* Current Stages List */}
            <div className="space-y-3">
              {rounds.map((round, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[#060B18]/50 border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/5 font-mono text-[10px] text-[#8FB6E8] flex items-center justify-center">
                      0{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={round.title}
                      onChange={(e) => {
                        const next = [...rounds];
                        next[idx].title = e.target.value;
                        setRounds(next);
                      }}
                      className="bg-transparent text-xs sm:text-sm font-medium text-white focus:outline-none border-b border-transparent focus:border-[#8FB6E8]/50 px-1 py-0.5"
                    />
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8FB6E8]/10 text-[#8FB6E8] border border-[#8FB6E8]/20 uppercase">
                      {round.type}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeRound(idx)}
                    className="p-1.5 text-[#7C91B4] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

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

"use client";

import React, { useEffect, useState } from "react";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Trash,
  UsersThree,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface JobProfileItem {
  id: string;
  title: string;
  description: string;
  minExperience: number;
  maxExperience: number;
  _count: {
    pipeline: number;
    candidates: number;
  };
  pipeline: { id: string; type: string; title: string }[];
  createdAt: string;
}

export default function JobsListPage() {
  const [jobs, setJobs] = useState<JobProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchJobs = () => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => {
        if (data.jobs) setJobs(data.jobs);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}" and all its candidate records?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to delete profile.");
        setDeletingId(null);
        return;
      }

      toast.success(`Job profile "${title}" deleted.`);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      setDeletingId(null);
    } catch (err) {
      toast.error("Network error while deleting.");
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            Job Profiles &amp; Pipelines
          </h1>
          <p className="text-xs sm:text-sm text-[#7C91B4] mt-1">
            Manage your open requisitions, mandatory experience parameters, and connector pipelines.
          </p>
        </div>
        <GlassButton variant="primary" withArrow href="/dashboard/jobs/new">
          Add Job Profile
        </GlassButton>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs font-mono text-[#7C91B4] rounded-3xl border border-white/5 bg-white/[0.01]">
          Loading job profiles...
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-16 text-center rounded-3xl border border-dashed border-white/10 bg-white/[0.01]">
          <Briefcase size={40} className="mx-auto text-[#7C91B4] mb-3" weight="duotone" />
          <h3 className="text-lg font-display font-semibold text-white">
            No Job Profiles Configured
          </h3>
          <p className="text-xs text-[#7C91B4] mt-1 max-w-sm mx-auto">
            Mandatory criteria: Add job description and minimum-maximum experience range to deploy your autonomous screening pipeline.
          </p>
          <div className="mt-6">
            <GlassButton variant="primary" withArrow href="/dashboard/jobs/new">
              Create First Profile
            </GlassButton>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-3xl p-1.5 bg-white/[0.04] ring-1 ring-[#8FB6E8]/20 shadow-xl backdrop-blur-2xl hover:ring-[#8FB6E8]/40 transition-all duration-300"
            >
              <div className="rounded-[calc(1.5rem-4px)] bg-[#0D1633] p-6 sm:p-8 border border-white/10">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-3 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-xl font-display font-bold text-white tracking-tight">
                        {job.title}
                      </h2>
                      <Badge variant="ice">
                        Experience: {job.minExperience} - {job.maxExperience} Years
                      </Badge>
                      <span className="text-[11px] font-mono text-[#7C91B4]">
                        Created {formatDate(job.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-[#7C91B4] leading-relaxed line-clamp-2">
                      {job.description}
                    </p>
                  </div>

                  {/* Right side CTAs: Open Workspace or Delete */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-start">
                    <GlassButton
                      size="sm"
                      variant="primary"
                      withArrow
                      href={`/dashboard/jobs/${job.id}`}
                    >
                      Pipeline &amp; Candidates
                    </GlassButton>
                    <button
                      onClick={() => handleDelete(job.id, job.title)}
                      disabled={deletingId === job.id}
                      className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/20 transition-all disabled:opacity-50"
                      title="Delete Job Profile"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>

                {/* Pipeline Connectors Strip */}
                <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-[#7C91B4]">Connector Rounds:</span>
                    {job.pipeline.map((round) => (
                      <span
                        key={round.id}
                        className="text-xs font-mono px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[#EAF1FB] flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8FB6E8]" />
                        {round.title}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono text-[#7C91B4] shrink-0">
                    <span className="flex items-center gap-1.5">
                      <UsersThree size={16} className="text-[#8FB6E8]" />
                      <strong className="text-white">{job._count.candidates}</strong> Candidates
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

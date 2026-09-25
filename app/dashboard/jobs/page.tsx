"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Trash2, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
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
          <h1 style={{ color: "var(--ink)" }} className="text-2xl sm:text-3xl font-bold tracking-tight">
            Job Profiles &amp; Pipelines
          </h1>
          <p style={{ color: "var(--muted)" }} className="text-xs sm:text-sm mt-1">
            Manage your open requisitions, mandatory experience parameters, and connector pipelines.
          </p>
        </div>
        <Link href="/dashboard/jobs/new">
          <button className="md-button md-button--filled inline-flex items-center gap-2">
            Add Job Profile
            <ArrowRight size={16} />
          </button>
        </Link>
      </div>

      {loading ? (
        <div
          style={{ color: "var(--muted)", borderColor: "var(--outline)", background: "var(--surface)" }}
          className="p-16 text-center text-xs rounded-3xl border"
        >
          Loading job profiles...
        </div>
      ) : jobs.length === 0 ? (
        <div
          style={{ borderColor: "var(--outline)", background: "var(--surface)" }}
          className="p-16 text-center rounded-3xl border border-dashed"
        >
          <Briefcase size={40} style={{ color: "var(--muted)" }} className="mx-auto mb-3" />
          <h3 style={{ color: "var(--ink)" }} className="text-lg font-semibold">
            No Job Profiles Configured
          </h3>
          <p style={{ color: "var(--muted)" }} className="text-xs mt-1 max-w-sm mx-auto">
            Mandatory criteria: Add job description and minimum-maximum experience range to deploy your autonomous screening pipeline.
          </p>
          <div className="mt-6">
            <Link href="/dashboard/jobs/new">
              <button className="md-button md-button--filled inline-flex items-center gap-2">
                Create First Profile
                <ArrowRight size={16} />
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {jobs.map((job) => (
            <div
              key={job.id}
              style={{
                background: "var(--surface)",
                borderColor: "var(--outline)",
              }}
              className="rounded-3xl border shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div
                style={{ background: "var(--surface-high)", borderColor: "var(--outline)" }}
                className="rounded-3xl p-6 sm:p-8 border"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-3 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 style={{ color: "var(--ink)" }} className="text-xl font-bold tracking-tight">
                        {job.title}
                      </h2>
                      <Badge variant="ice">
                        Experience: {job.minExperience} - {job.maxExperience} Years
                      </Badge>
                      <span style={{ color: "var(--muted)" }} className="text-[11px]">
                        Created {formatDate(job.createdAt)}
                      </span>
                    </div>

                    <p style={{ color: "var(--muted)" }} className="text-xs sm:text-sm leading-relaxed line-clamp-2">
                      {job.description}
                    </p>
                  </div>

                  {/* Right side CTAs: Open Workspace or Delete */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-start">
                    <Link href={`/dashboard/jobs/${job.id}`}>
                      <button className="md-button md-button--filled inline-flex items-center gap-2 text-sm">
                        Pipeline &amp; Candidates
                        <ArrowRight size={14} />
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDelete(job.id, job.title)}
                      disabled={deletingId === job.id}
                      className="p-2.5 rounded-xl transition-all disabled:opacity-50"
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        color: "#f87171",
                        border: "1px solid rgba(239,68,68,0.2)",
                      }}
                      title="Delete Job Profile"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Pipeline Connectors Strip */}
                <div
                  style={{ borderColor: "var(--outline)" }}
                  className="mt-6 pt-6 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span style={{ color: "var(--muted)" }} className="text-xs">
                      Connector Rounds:
                    </span>
                    {job.pipeline.map((round) => (
                      <span
                        key={round.id}
                        style={{
                          background: "var(--surface-purple)",
                          borderColor: "var(--outline)",
                          color: "var(--ink)",
                        }}
                        className="text-xs px-3 py-1 rounded-lg border flex items-center gap-1.5"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: "var(--primary)" }}
                        />
                        {round.title}
                      </span>
                    ))}
                  </div>

                  <div style={{ color: "var(--muted)" }} className="flex items-center gap-4 text-xs shrink-0">
                    <span className="flex items-center gap-1.5">
                      <Users size={16} style={{ color: "var(--primary)" }} />
                      <strong style={{ color: "var(--ink)" }}>{job._count.candidates}</strong> Candidates
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

"use client";

import React, { useEffect, useState } from "react";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  UsersThree,
  Cpu,
  ArrowUpRight,
  TreeStructure,
} from "@phosphor-icons/react";
import Link from "next/link";

interface JobSummary {
  id: string;
  title: string;
  minExperience: number;
  maxExperience: number;
  _count: {
    pipeline: number;
    candidates: number;
  };
  pipeline: { id: string; type: string; title: string }[];
  createdAt: string;
}

export default function DashboardOverview() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => {
        if (data.jobs) {
          setJobs(data.jobs);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading jobs:", err);
        setLoading(false);
      });
  }, []);

  const totalCandidates = jobs.reduce((acc, job) => acc + (job._count?.candidates || 0), 0);
  const totalStages = jobs.reduce((acc, job) => acc + (job._count?.pipeline || 0), 0);

  return (
    <div className="space-y-10">
      {/* Header with Title and Create CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            Recruitment Command Center
          </h1>
          <p className="text-xs sm:text-sm text-[#7C91B4] mt-1">
            Monitor active candidate pipelines, review AI screening traces, and customize evaluation stages.
          </p>
        </div>
        <GlassButton variant="primary" withArrow href="/dashboard/jobs/new">
          New Job Profile
        </GlassButton>
      </div>

      {/* Metric Cards Grid in Deep Navy and Ice Blue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 bg-[#0D1633] border border-[#8FB6E8]/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#7C91B4] uppercase">Active Profiles</span>
            <div className="w-7 h-7 rounded-lg bg-[#8FB6E8]/10 text-[#8FB6E8] flex items-center justify-center">
              <Briefcase size={16} weight="duotone" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-display font-bold text-white">
            {loading ? "..." : jobs.length}
          </div>
          <div className="mt-1 text-[11px] font-mono text-[#8FB6E8]">
            Mandatory ranges verified
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-[#0D1633] border border-[#8FB6E8]/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#7C91B4] uppercase">Active Candidates</span>
            <div className="w-7 h-7 rounded-lg bg-[#60A5FA]/10 text-[#60A5FA] flex items-center justify-center">
              <UsersThree size={16} weight="duotone" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-display font-bold text-white">
            {loading ? "..." : totalCandidates}
          </div>
          <div className="mt-1 text-[11px] font-mono text-[#60A5FA]">
            Tracked across stages
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-[#0D1633] border border-[#8FB6E8]/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#7C91B4] uppercase">Pipeline Connectors</span>
            <div className="w-7 h-7 rounded-lg bg-[#A78BFA]/10 text-[#A78BFA] flex items-center justify-center">
              <TreeStructure size={16} weight="duotone" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-display font-bold text-white">
            {loading ? "..." : totalStages}
          </div>
          <div className="mt-1 text-[11px] font-mono text-[#A78BFA]">
            Total active rounds
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-[#0D1633] border border-[#8FB6E8]/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#7C91B4] uppercase">AI Trace Status</span>
            <div className="w-7 h-7 rounded-lg bg-[#8FB6E8]/10 text-[#8FB6E8] flex items-center justify-center">
              <Cpu size={16} weight="duotone" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-display font-bold text-[#8FB6E8] flex items-center gap-2">
            <span>100%</span>
            <span className="text-xs font-normal text-[#7C91B4] font-mono">Auditable</span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-[#8FB6E8]">
            Zero black-box verdicts
          </div>
        </div>
      </div>

      {/* Active Job Profiles List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold text-white">
            Active Job Profiles &amp; Pipelines
          </h2>
          <Link
            href="/dashboard/jobs"
            className="text-xs font-mono text-[#8FB6E8] hover:underline flex items-center gap-1"
          >
            View all ({jobs.length})
            <ArrowUpRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-[#7C91B4] rounded-2xl border border-white/5">
            Loading job profiles...
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
            <Briefcase size={36} className="mx-auto text-[#7C91B4] mb-3" weight="duotone" />
            <h3 className="text-base font-display font-semibold text-white">
              No job profiles created yet
            </h3>
            <p className="text-xs text-[#7C91B4] mt-1 max-w-sm mx-auto">
              Create your first job profile with job description and experience boundaries to set up your pipeline.
            </p>
            <div className="mt-6">
              <GlassButton variant="primary" withArrow href="/dashboard/jobs/new">
                Create First Profile
              </GlassButton>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl p-6 bg-[#0D1633] border border-[#8FB6E8]/15 hover:border-[#8FB6E8]/40 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 group shadow-lg"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-lg font-display font-semibold text-white group-hover:text-[#8FB6E8] transition-colors">
                      {job.title}
                    </h3>
                    <Badge variant="ice">
                      {job.minExperience} - {job.maxExperience} yrs experience
                    </Badge>
                  </div>

                  {/* Pipeline Preview Tags */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] font-mono text-[#7C91B4]">Pipeline:</span>
                    {job.pipeline.map((r, rIdx) => (
                      <span
                        key={r.id}
                        className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-[#EAF1FB] flex items-center gap-1.5"
                      >
                        <span className="text-[9px] text-[#7C91B4]">#{rIdx + 1}</span>
                        {r.title}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">
                      {job._count.candidates} Candidates
                    </div>
                    <div className="text-[11px] font-mono text-[#7C91B4]">
                      {job._count.pipeline} connector rounds
                    </div>
                  </div>
                  <GlassButton
                    size="sm"
                    variant="secondary"
                    withArrow
                    href={`/dashboard/jobs/${job.id}`}
                  >
                    Open Workspace
                  </GlassButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

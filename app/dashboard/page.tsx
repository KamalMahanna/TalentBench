"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Briefcase, Cpu, Plus, Users } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

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

const statCards = [
  {
    key: "jobs",
    label: "Active Profiles",
    sublabel: "Job requisitions open",
    icon: Briefcase,
    tone: "purple",
  },
  {
    key: "candidates",
    label: "Active Candidates",
    sublabel: "Tracked across stages",
    icon: Users,
    tone: "blue",
  },
  {
    key: "stages",
    label: "Pipeline Connectors",
    sublabel: "Total active rounds",
    icon: BarChart3,
    tone: "peach",
  },
  {
    key: "ai",
    label: "AI Trace Status",
    sublabel: "Zero black-box verdicts",
    icon: Cpu,
    tone: "purple",
    fixed: "100%",
    fixedSub: "Auditable",
  },
];

export default function DashboardOverview() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => {
        if (data.jobs) setJobs(data.jobs);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading jobs:", err);
        setLoading(false);
      });
  }, []);

  const totalCandidates = jobs.reduce(
    (acc, job) => acc + (job._count?.candidates || 0),
    0
  );
  const totalStages = jobs.reduce(
    (acc, job) => acc + (job._count?.pipeline || 0),
    0
  );

  const statValues: Record<string, string | number> = {
    jobs: loading ? "—" : jobs.length,
    candidates: loading ? "—" : totalCandidates,
    stages: loading ? "—" : totalStages,
    ai: "100%",
  };

  const toneStyle = (tone: string) => {
    const map: Record<string, { background: string; color: string }> = {
      purple: { background: "var(--surface-purple)", color: "var(--primary-deep)" },
      blue: { background: "var(--surface-blue)", color: "#1a6098" },
      peach: { background: "var(--surface-peach)", color: "#a0440d" },
    };
    return map[tone] || map.purple;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: "var(--ink)",
              margin: 0,
            }}
          >
            Recruitment Overview
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "var(--muted)",
              marginTop: "6px",
            }}
          >
            Monitor active candidate pipelines, review AI screening traces, and
            customize evaluation stages.
          </p>
        </div>
        <Link
          href="/dashboard/jobs/new"
          className="md-button md-button--filled"
        >
          <Plus size={16} /> New Job Profile
        </Link>
      </div>

      {/* Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        {statCards.map(({ key, label, sublabel, icon: Icon, tone, fixed, fixedSub }, i) => {
          const style = toneStyle(tone);
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              transition={{ delay: i * 0.07, duration: 0.4, ease: "easeOut" }}
              style={{
                background: style.background,
                borderRadius: "20px",
                padding: "22px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                cursor: "default",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: style.color,
                  }}
                >
                  {label}
                </span>
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    background: "rgba(255,255,255,0.55)",
                    borderRadius: "999px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--primary)",
                  }}
                >
                  <Icon size={16} />
                </div>
              </div>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  letterSpacing: "-0.06em",
                  color: "var(--ink)",
                  lineHeight: 1,
                }}
              >
                {fixed || statValues[key]}
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                {fixedSub || sublabel}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Active Jobs List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 600,
              letterSpacing: "-0.03em",
              color: "var(--ink)",
              margin: 0,
            }}
          >
            Active Job Profiles
          </h2>
          <Link
            href="/dashboard/jobs"
            style={{
              fontSize: "13px",
              color: "var(--primary)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            View all ({jobs.length}) →
          </Link>
        </div>

        {loading ? (
          <div
            style={{
              padding: "48px",
              textAlign: "center",
              color: "var(--muted)",
              fontSize: "14px",
              background: "var(--surface)",
              borderRadius: "20px",
            }}
          >
            Loading job profiles...
          </div>
        ) : jobs.length === 0 ? (
          <div
            style={{
              padding: "48px",
              textAlign: "center",
              background: "var(--surface)",
              borderRadius: "20px",
              border: "1px dashed var(--outline)",
            }}
          >
            <Briefcase
              size={36}
              style={{ color: "var(--muted)", margin: "0 auto 12px" }}
            />
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--ink)",
                margin: "0 0 8px",
              }}
            >
              No job profiles yet
            </h3>
            <p style={{ fontSize: "13px", color: "var(--muted)", margin: "0 0 20px" }}>
              Create your first job profile with a description and pipeline to
              start screening candidates.
            </p>
            <Link href="/dashboard/jobs/new" className="md-button md-button--filled">
              Create First Profile
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {jobs.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2, transition: { duration: 0.15 } }}
                transition={{ delay: 0.2 + i * 0.05, duration: 0.35, ease: "easeOut" }}
                style={{
                  background: "var(--surface-high)",
                  border: "1px solid var(--outline)",
                  borderRadius: "20px",
                  padding: "22px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "24px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "8px",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "var(--ink)",
                        margin: 0,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {job.title}
                    </h3>
                    <Badge variant="default">
                      {job.minExperience}–{job.maxExperience} yrs
                    </Badge>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--muted)",
                        fontWeight: 500,
                      }}
                    >
                      Pipeline:
                    </span>
                    {job.pipeline.map((r, rIdx) => (
                      <span
                        key={r.id}
                        style={{
                          fontSize: "11px",
                          padding: "2px 10px",
                          borderRadius: "999px",
                          background: "var(--surface-purple)",
                          color: "var(--primary-deep)",
                          fontWeight: 500,
                        }}
                      >
                        {rIdx + 1}. {r.title}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "var(--ink)",
                      }}
                    >
                      {job._count.candidates} Candidates
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                      {job._count.pipeline} pipeline stages
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/jobs/${job.id}`}
                    className="md-button md-button--tonal"
                    style={{ fontSize: "13px", padding: "8px 18px" }}
                  >
                    Open Workspace
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

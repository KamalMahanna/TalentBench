"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Share2,
  Printer,
  Trophy,
  Target,
  CheckCircle,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Brain,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/context/theme-context";

interface RadarMetric {
  subject: string;
  candidate: number;
  benchmark: number;
  fullMark: number;
}

interface BenchmarkReport {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  status: string;
  overallScore: number;
  percentile: number;
  cohortTotal: number;
  radarScores: RadarMetric[];
  strengths: string[];
  growthAreas: string[];
  feedbackSummary: string;
  generatedAt: string;
}

export default function CandidateBenchmarkReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { theme } = useTheme();

  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/candidates/${id}/report`)
      .then((res) => res.json())
      .then((data) => {
        if (data.report) {
          setReport(data.report);
        } else {
          toast.error("Report could not be generated.");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error generating report:", err);
        toast.error("Failed to load benchmark report.");
        setLoading(false);
      });
  }, [id]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Sharable report URL copied to clipboard!");
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ height: "32px", width: "120px", borderRadius: "12px", background: "var(--surface)", opacity: 0.6 }} />
        <div style={{ height: "320px", borderRadius: "24px", background: "var(--surface)", opacity: 0.6 }} />
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ padding: "64px", textAlign: "center", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)" }}>Report Not Available</h2>
        <Link href={`/dashboard/candidates/${id}`} className="md-button md-button--tonal">
          Back to Candidate Dossier
        </Link>
      </div>
    );
  }

  // SVG Radar Chart Geometry Calculation
  const size = 320;
  const center = size / 2;
  const radius = center - 45;
  const numPoints = report.radarScores.length;

  const getCoordinates = (value: number, index: number, maxVal = 100) => {
    const angle = ((Math.PI * 2) / numPoints) * index - Math.PI / 2;
    const r = (value / maxVal) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const candidatePolygon = report.radarScores
    .map((d, i) => {
      const { x, y } = getCoordinates(d.candidate, i);
      return `${x},${y}`;
    })
    .join(" ");

  const benchmarkPolygon = report.radarScores
    .map((d, i) => {
      const { x, y } = getCoordinates(d.benchmark, i);
      return `${x},${y}`;
    })
    .join(" ");

  const isShortlisted = report.status === "SHORTLISTED";

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "32px", paddingBottom: "48px" }}>
      {/* Top Action Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }} className="print:hidden">
        <Link
          href={`/dashboard/candidates/${id}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            color: "var(--muted)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} />
          Back to Dossier
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={handleShare}
            className="md-button md-button--tonal"
            style={{ fontSize: "12px", padding: "8px 16px" }}
          >
            <Share2 size={14} /> Share Report
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="md-button md-button--filled"
            style={{ fontSize: "12px", padding: "8px 18px" }}
          >
            <Printer size={14} /> Download PDF
          </button>
        </div>
      </div>

      {/* Hero Scorecard */}
      <div
        style={{
          background: "var(--surface-purple)",
          borderRadius: "28px",
          padding: "48px 32px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 14px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: 600,
            background: "rgba(255,255,255,0.6)",
            color: "var(--primary-deep)",
          }}
        >
          {isShortlisted ? <Trophy size={14} /> : <Target size={14} />}
          {isShortlisted ? "Benchmarked: Top Tier Recommendation" : "Calibrated Candidate Evaluation"}
        </div>

        <h1
          style={{
            fontSize: "clamp(2rem, 4vw, 3rem)",
            fontWeight: 700,
            color: "var(--ink)",
            margin: 0,
            letterSpacing: "-0.04em",
          }}
        >
          {report.candidateName}
        </h1>

        <p style={{ fontSize: "15px", color: "var(--muted)", margin: 0 }}>
          Benchmarked against{" "}
          <strong style={{ color: "var(--primary)" }}>{report.jobTitle}</strong> Requisition Cohort
        </p>

        {/* Percentile Gauge */}
        <div style={{ padding: "16px 0" }}>
          <div
            style={{
              fontSize: "clamp(3.5rem, 8vw, 5rem)",
              fontWeight: 800,
              letterSpacing: "-0.06em",
              color: "var(--primary)",
              lineHeight: 1,
            }}
          >
            {report.percentile}
            <span style={{ fontSize: "24px", fontWeight: 500, color: "var(--muted)" }}>th</span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--muted)", margin: "8px 0 0" }}>
            Cohort Percentile Rank across all active applicants
          </p>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--outline)",
            paddingTop: "16px",
            width: "100%",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            fontSize: "12px",
            color: "var(--muted)",
          }}
        >
          <span>Generated: {new Date(report.generatedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
          <span>·</span>
          <span>
            Status:{" "}
            <strong style={{ color: isShortlisted ? "var(--green)" : "#a0440d" }}>
              {report.status}
            </strong>
          </span>
          <span>·</span>
          <span>Evaluation: Verified by AI Engine</span>
        </div>
      </div>

      {/* Multi-Dimensional Radar Comparison Card */}
      <div
        style={{
          background: "var(--surface-high)",
          border: "1px solid var(--outline)",
          borderRadius: "28px",
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          boxShadow: "0 14px 30px rgba(53, 42, 70, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--ink)", margin: 0, letterSpacing: "-0.03em" }}>
              Multi-Dimensional Skill Calibration
            </h2>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
              Relative performance compared to the benchmark median cohort.
            </p>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "999px", background: "var(--primary)" }} />
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>Candidate</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "999px", background: "var(--outline)" }} />
              <span style={{ color: "var(--muted)" }}>Cohort Median</span>
            </div>
          </div>
        </div>

        {/* Radar Graphic & Table */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "32px", alignItems: "center" }}>
          {/* Radar Visualization */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <svg width={size} height={size} style={{ overflow: "visible" }}>
              {[0.25, 0.5, 0.75, 1.0].map((level, i) => (
                <circle
                  key={i}
                  cx={center}
                  cy={center}
                  r={radius * level}
                  fill="none"
                  stroke="var(--outline)"
                  strokeDasharray={level < 1 ? "3,3" : undefined}
                />
              ))}

              {report.radarScores.map((_, i) => {
                const { x, y } = getCoordinates(100, i);
                return (
                  <line
                    key={i}
                    x1={center}
                    y1={center}
                    x2={x}
                    y2={y}
                    stroke="var(--outline)"
                  />
                );
              })}

              {/* Benchmark polygon */}
              <polygon
                points={benchmarkPolygon}
                fill="rgba(111, 106, 120, 0.12)"
                stroke="var(--muted)"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />

              {/* Candidate polygon */}
              <polygon
                points={candidatePolygon}
                fill="rgba(103, 80, 164, 0.25)"
                stroke="var(--primary)"
                strokeWidth="2.5"
              />

              {/* Candidate data dots */}
              {report.radarScores.map((d, i) => {
                const { x, y } = getCoordinates(d.candidate, i);
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={4}
                    fill="var(--primary)"
                    stroke="var(--surface-high)"
                    strokeWidth={2}
                  />
                );
              })}

              {/* Axis Labels */}
              {report.radarScores.map((d, i) => {
                const labelCoord = getCoordinates(120, i);
                return (
                  <text
                    key={i}
                    x={labelCoord.x}
                    y={labelCoord.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      fill: "var(--ink)",
                      fontFamily: "inherit",
                    }}
                  >
                    {d.subject}
                  </text>
                );
              })}
            </svg>
          </div>

          {/* Dimension Score Bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {report.radarScores.map((dim, idx) => {
              const delta = dim.candidate - dim.benchmark;
              return (
                <div
                  key={idx}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "14px",
                    background: "var(--surface)",
                    border: "1px solid var(--outline)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ fontWeight: 600, color: "var(--ink)" }}>{dim.subject}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <strong style={{ color: "var(--primary)" }}>{dim.candidate}%</strong>
                      <span style={{ color: "var(--muted)", fontSize: "11px" }}>vs {dim.benchmark}%</span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "999px",
                          background: delta >= 0 ? "#d5f0e0" : "#fde8e8",
                          color: delta >= 0 ? "var(--green)" : "#c0392b",
                        }}
                      >
                        {delta >= 0 ? `+${delta}%` : `${delta}%`}
                      </span>
                    </div>
                  </div>

                  <div style={{ width: "100%", height: "6px", borderRadius: "999px", background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: "999px",
                        background: "var(--primary)",
                        width: `${dim.candidate}%`,
                        transition: "width 0.5s",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Strengths and Growth Areas Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
        <div
          style={{
            background: "var(--surface-high)",
            border: "1px solid var(--outline)",
            borderRadius: "24px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle size={18} style={{ color: "var(--green)" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--ink)", margin: 0 }}>
              Verified Strengths &amp; Signals
            </h3>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
            {report.strengths.map((str, i) => (
              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "var(--ink)", lineHeight: 1.5 }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: "var(--green)", marginTop: "6px", flexShrink: 0 }} />
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          style={{
            background: "var(--surface-high)",
            border: "1px solid var(--outline)",
            borderRadius: "24px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Lightbulb size={18} style={{ color: "#a0440d" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--ink)", margin: 0 }}>
              Calibration Points for Subsequent Rounds
            </h3>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
            {report.growthAreas.map((gro, i) => (
              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "var(--ink)", lineHeight: 1.5 }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: "var(--surface-peach)", marginTop: "6px", flexShrink: 0 }} />
                <span>{gro}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Narrative Executive Summary */}
      <div
        style={{
          background: "var(--surface-blue)",
          borderRadius: "24px",
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Brain size={16} style={{ color: "#1a6098" }} />
          <h3 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#1a6098", margin: 0 }}>
            AI Synthesis &amp; Recruiter Summary
          </h3>
        </div>
        <p style={{ fontSize: "13px", color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>
          {report.feedbackSummary}
        </p>
      </div>
    </div>
  );
}

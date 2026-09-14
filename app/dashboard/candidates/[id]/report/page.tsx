"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ShareNetwork,
  Printer,
  Trophy,
  Target,
  CheckCircle,
  TrendUp,
  Sparkle,
  ShieldCheck,
  Brain,
  Lightbulb,
} from "@phosphor-icons/react";
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
  const isLight = theme === "light";

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
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-32 rounded-xl bg-white/5 animate-pulse" />
        <div className="h-96 rounded-3xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-16 text-center space-y-4">
        <h2 className="text-xl font-display font-semibold">Report Not Available</h2>
        <GlassButton variant="secondary" href={`/dashboard/candidates/${id}`}>
          Back to Candidate Dossier
        </GlassButton>
      </div>
    );
  }

  // Pure SVG Radar Chart Geometry Calculation
  const size = 320;
  const center = size / 2;
  const radius = center - 45;
  const numPoints = report.radarScores.length;

  const getCoordinates = (value: number, index: number, maxVal = 100) => {
    const angle = (Math.PI * 2 / numPoints) * index - Math.PI / 2;
    const r = (value / maxVal) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Polygon coordinate paths
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
    <div className="max-w-4xl mx-auto space-y-8 pb-12 print:p-0">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/dashboard/candidates/${id}`}
          className="inline-flex items-center gap-2 text-xs font-mono text-[#7C91B4] hover:text-[#EAF1FB] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dossier
        </Link>

        <div className="flex items-center gap-3">
          <GlassButton variant="secondary" onClick={handleShare} className="text-xs">
            <ShareNetwork size={16} />
            Share Report
          </GlassButton>

          <GlassButton variant="primary" onClick={handlePrint} className="text-xs">
            <Printer size={16} />
            Download PDF
          </GlassButton>
        </div>
      </div>

      {/* Hero Scorecard */}
      <div
        className={`p-8 sm:p-12 rounded-3xl border text-center relative overflow-hidden shadow-2xl ${
          isLight
            ? "bg-white border-slate-200"
            : "bg-gradient-to-b from-[#10162E] to-[#0A1228] border-white/20"
        }`}
      >
        {/* Glow orb */}
        <div className="pointer-events-none absolute left-1/2 -top-24 -translate-x-1/2 w-96 h-96 rounded-full bg-[#8FB6E8]/15 blur-[120px]" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-medium bg-[#8FB6E8]/15 text-[#8FB6E8] border border-[#8FB6E8]/30">
            {isShortlisted ? <Trophy size={14} weight="fill" /> : <Target size={14} />}
            {isShortlisted ? "Benchmarked: Top Tier Recommendation" : "Calibrated Candidate Evaluation"}
          </div>

          <h1 className={`text-3xl sm:text-5xl font-display font-extrabold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            {report.candidateName}
          </h1>

          <p className={`text-sm sm:text-base ${isLight ? "text-slate-600" : "text-[#7C91B4]"}`}>
            Benchmarked against <span className="font-semibold text-[#8FB6E8]">{report.jobTitle}</span> Requisition Cohort
          </p>

          {/* Percentile Highlight Gauge */}
          <div className="pt-6 pb-4">
            <div className="text-6xl sm:text-7xl font-display font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#8FB6E8] via-blue-400 to-indigo-300">
              {report.percentile}
              <span className="text-2xl sm:text-3xl font-normal text-[#7C91B4]">th</span>
            </div>
            <p className="text-xs sm:text-sm font-mono text-[#7C91B4] mt-2">
              Cohort Percentile Rank across all active applicants
            </p>
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-mono text-[#7C91B4]">
            <span>Generated: {new Date(report.generatedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
            <span>·</span>
            <span>Status: <strong className={isShortlisted ? "text-emerald-400" : "text-amber-400"}>{report.status}</strong></span>
            <span>·</span>
            <span>Evaluation: Verified by AI Engine</span>
          </div>
        </div>
      </div>

      {/* Multi-Dimensional Radar Comparison Card */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border shadow-xl ${
          isLight ? "bg-white border-slate-200" : "bg-[#0D1633] border-white/15"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className={`text-xl font-display font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
              Multi-Dimensional Skill Calibration
            </h2>
            <p className="text-xs text-[#7C91B4] mt-1">
              Relative performance compared to the benchmark median cohort.
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#8FB6E8]" />
              <span className={isLight ? "text-slate-800" : "text-[#EAF1FB]"}>Candidate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-500 border border-white/40" />
              <span className="text-[#7C91B4]">Cohort Median</span>
            </div>
          </div>
        </div>

        {/* Radar Graphic & Dimension Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Radar Visualization */}
          <div className="lg:col-span-6 flex justify-center">
            <svg width={size} height={size} className="overflow-visible">
              {/* Concentric grid rings */}
              {[0.25, 0.5, 0.75, 1.0].map((level, i) => (
                <circle
                  key={i}
                  cx={center}
                  cy={center}
                  r={radius * level}
                  fill="none"
                  stroke={isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}
                  strokeDasharray={level < 1 ? "3,3" : undefined}
                />
              ))}

              {/* Radial spoke lines */}
              {report.radarScores.map((_, i) => {
                const { x, y } = getCoordinates(100, i);
                return (
                  <line
                    key={i}
                    x1={center}
                    y1={center}
                    x2={x}
                    y2={y}
                    stroke={isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"}
                  />
                );
              })}

              {/* Benchmark polygon */}
              <polygon
                points={benchmarkPolygon}
                fill="rgba(124, 145, 180, 0.15)"
                stroke="rgba(124, 145, 180, 0.6)"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />

              {/* Candidate polygon with glow */}
              <polygon
                points={candidatePolygon}
                fill="rgba(143, 182, 232, 0.35)"
                stroke="#8FB6E8"
                strokeWidth="2.5"
              />

              {/* Data points for candidate */}
              {report.radarScores.map((d, i) => {
                const { x, y } = getCoordinates(d.candidate, i);
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={4}
                    fill="#8FB6E8"
                    stroke="#0A1228"
                    strokeWidth={2}
                  />
                );
              })}

              {/* Axis Labels */}
              {report.radarScores.map((d, i) => {
                const labelCoord = getCoordinates(122, i);
                return (
                  <text
                    key={i}
                    x={labelCoord.x}
                    y={labelCoord.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`text-[10px] font-mono font-semibold ${
                      isLight ? "fill-slate-700" : "fill-[#EAF1FB]"
                    }`}
                  >
                    {d.subject}
                  </text>
                );
              })}
            </svg>
          </div>

          {/* Dimension Score Table */}
          <div className="lg:col-span-6 space-y-3">
            {report.radarScores.map((dim, idx) => {
              const delta = dim.candidate - dim.benchmark;
              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className={`font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>
                      {dim.subject}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-[#8FB6E8] font-bold">{dim.candidate}%</span>
                      <span className="text-[#7C91B4]">vs {dim.benchmark}%</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          delta >= 0
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-rose-500/15 text-rose-400"
                        }`}
                      >
                        {delta >= 0 ? `+${delta}%` : `${delta}%`}
                      </span>
                    </div>
                  </div>

                  {/* Progress comparisons */}
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden relative">
                    <div
                      className="h-full rounded-full bg-[#8FB6E8] transition-all duration-500"
                      style={{ width: `${dim.candidate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Strengths and Growth Areas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className={`p-6 sm:p-8 rounded-3xl border shadow-lg ${
            isLight ? "bg-white border-slate-200" : "bg-[#0D1633] border-white/15"
          }`}
        >
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={20} className="text-emerald-400" weight="fill" />
            <h3 className={`text-base font-display font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
              Verified Strengths &amp; Signals
            </h3>
          </div>
          <ul className="space-y-3">
            {report.strengths.map((str, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                <span className={isLight ? "text-slate-700" : "text-slate-300"}>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          className={`p-6 sm:p-8 rounded-3xl border shadow-lg ${
            isLight ? "bg-white border-slate-200" : "bg-[#0D1633] border-white/15"
          }`}
        >
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={20} className="text-amber-400" weight="fill" />
            <h3 className={`text-base font-display font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
              Calibration Points for Subsequent Rounds
            </h3>
          </div>
          <ul className="space-y-3">
            {report.growthAreas.map((gro, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                <span className={isLight ? "text-slate-700" : "text-slate-300"}>{gro}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Narrative Executive Summary */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border ${
          isLight ? "bg-white border-slate-200" : "bg-[#0D1633] border-white/15"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <Brain size={18} className="text-[#8FB6E8]" />
          <h3 className={`text-sm font-display font-bold uppercase tracking-wider ${isLight ? "text-slate-900" : "text-white"}`}>
            AI Synthesis &amp; Recruiter Summary
          </h3>
        </div>
        <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? "text-slate-700" : "text-slate-300"}`}>
          {report.feedbackSummary}
        </p>
      </div>
    </div>
  );
}

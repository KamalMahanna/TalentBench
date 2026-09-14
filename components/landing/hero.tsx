"use client";

import React from "react";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import { motion } from "motion/react";
import {
  ShieldCheck,
  Cpu,
  Code,
  Users,
  Compass,
  CheckCircle,
  TrendUp,
  Sparkle,
} from "@phosphor-icons/react";
import { useTheme } from "@/context/theme-context";
import Link from "next/link";

export function HeroSection() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const chipsData = [
    { label: "RESUME AI SCREEN", icon: ShieldCheck, position: "-top-3 -left-4 sm:-top-4 sm:-left-6" },
    { label: "DSA STRESS BENCHMARK", icon: Code, position: "top-1/3 -right-4 sm:-right-8" },
    { label: "REASONING & LOGIC", icon: Cpu, position: "bottom-16 -left-4 sm:-left-6" },
    { label: "EXECUTIVE INTERVIEW", icon: Users, position: "-bottom-4 right-6 sm:right-10" },
  ];

  return (
    <section className="relative min-h-[100dvh] pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex items-center">
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* Left Column: Typography & CTAs (col-span-7) */}
        <div className="lg:col-span-7 z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className={`mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono tracking-widest ${
              isLight
                ? "text-blue-700 bg-blue-50/80 border border-blue-200"
                : "text-[#8FB6E8] bg-white/5 border border-white/10"
            }`}
          >
            <Compass className={`h-3 w-3 animate-spin ${isLight ? "text-blue-600" : "text-[#8FB6E8]"}`} style={{ animationDuration: "10s" }} />
            <span>AWWWARDS CERTIFIED BENCHMARK PROTOCOL</span>
          </motion.div>

          {/* 2-line desktop iron rule headline with signature ice gradient */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="text-4xl sm:text-6xl lg:text-[76px] font-display font-extrabold tracking-tight leading-[1.04] text-transparent bg-clip-text max-w-4xl"
            style={{
              backgroundImage: isLight
                ? "linear-gradient(135deg, #0A1228 0%, #16244C 35%, #2563EB 70%, #1D4ED8 100%)"
                : "linear-gradient(135deg, #FFFFFF 0%, #EAF1FB 30%, #8FB6E8 70%, #4B73AE 100%)",
            }}
          >
            Autonomous pipelines. <br />
            <span className={isLight ? "text-blue-600" : "text-[#8FB6E8]"}>Verified decisions.</span>
          </motion.h1>

          {/* Subtext: under 20 words */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className={`mt-6 text-base sm:text-lg max-w-[50ch] leading-relaxed ${
              isLight ? "text-slate-600" : "text-[#7C91B4]"
            }`}
          >
            Build multi-stage recruitment pipelines, automate resume shortlisting with inspectable agent traces, and deliver personalized candidate feedback.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <GlassButton size="lg" variant="primary" withArrow href="/dashboard/jobs/new">
              Build a Pipeline
            </GlassButton>
            <GlassButton size="lg" variant="secondary" href="#ai-screening">
              Inspect Agent Trace
            </GlassButton>
          </motion.div>

          {/* Key proof metrics */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className={`mt-12 pt-8 border-t grid grid-cols-3 gap-6 max-w-lg ${
              isLight ? "border-slate-200" : "border-white/10"
            }`}
          >
            <div>
              <div className={`text-2xl font-bold font-display ${isLight ? "text-slate-900" : "text-white"}`}>100%</div>
              <div className={`text-xs font-mono mt-0.5 ${isLight ? "text-slate-500" : "text-[#7C91B4]"}`}>Trace Auditability</div>
            </div>
            <div>
              <div className={`text-2xl font-bold font-display ${isLight ? "text-blue-600" : "text-[#8FB6E8]"}`}>8.4x</div>
              <div className={`text-xs font-mono mt-0.5 ${isLight ? "text-slate-500" : "text-[#7C91B4]"}`}>Screening Velocity</div>
            </div>
            <div>
              <div className={`text-2xl font-bold font-display ${isLight ? "text-indigo-600" : "text-[#60A5FA]"}`}>&lt; 120ms</div>
              <div className={`text-xs font-mono mt-0.5 ${isLight ? "text-slate-500" : "text-[#7C91B4]"}`}>Pipeline Latency</div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Frosted Glassmorphism Showcase Card + Floating Chips (replaces globe star animation) */}
        <div className="lg:col-span-5 relative flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="w-full relative py-6"
          >
            {/* Luminous atmospheric focal glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-[#8FB6E8]/20 via-[#C084FC]/15 to-[#FDA4AF]/15 blur-[100px]" />
            </div>

            {/* Central Glassmorphism Reference Showcase Card ("GLASSMORPHISM — blurs") */}
            <motion.div
              animate={{
                y: [0, -10, 0],
                rotate: [0, 0.5, 0, -0.5, 0],
              }}
              transition={{
                duration: 6,
                ease: "easeInOut",
                repeat: Infinity,
              }}
              className="relative w-full max-w-lg mx-auto p-6 sm:p-8 rounded-3xl glass-specimen-box cursor-default transform hover:-translate-y-1 transition-all duration-500 shadow-2xl z-10"
            >
              {/* Card Top Pill Badge matching talentbench_00001 (2) */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[11px] font-mono tracking-wider font-semibold text-[#8FB6E8] uppercase">
                    GLASSMORPHISM — blurs
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${
                    isLight
                      ? "bg-blue-50 text-blue-700 border-blue-200 font-semibold"
                      : "bg-white/10 text-[#EAF1FB] border-white/15"
                  }`}
                >
                  CALIBRATED BENCHMARK
                </span>
              </div>

              {/* Candidate Profile Specimen */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                    alt="Elena Rostova"
                    className="h-16 w-16 rounded-2xl object-cover border-2 border-white/50 shadow-md"
                  />
                  <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-sm">
                    <CheckCircle size={12} weight="bold" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3
                      className={`font-display text-lg sm:text-xl font-bold ${
                        isLight ? "text-[#0F172A]" : "text-white"
                      }`}
                    >
                      Elena Rostova
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-semibold">
                      TOP 1%
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isLight ? "text-slate-600" : "text-[#7C91B4]"}`}>
                    Senior Distributed Systems Architect
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[11px] font-mono font-bold ${isLight ? "text-blue-600" : "text-[#8FB6E8]"}`}>
                      Cohort Percentile: 98.4th
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className={`text-[11px] font-mono ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      Score: 94/100
                    </span>
                  </div>
                </div>
              </div>

              {/* Real-time Benchmark Metrics */}
              <div className="space-y-3 mb-6">
                {[
                  { name: "Algorithmic Concurrency", score: 99, pct: "99.2%" },
                  { name: "Distributed Consensus & Raft", score: 97, pct: "98.5%" },
                  { name: "AI-Synthesized Reasoning", score: 95, pct: "96.8%" },
                ].map((metric) => (
                  <div key={metric.name} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className={isLight ? "text-slate-700 font-medium" : "text-[#EAF1FB]"}>
                        {metric.name}
                      </span>
                      <span className={`font-bold ${isLight ? "text-blue-600" : "text-[#8FB6E8]"}`}>{metric.pct}</span>
                    </div>
                    <div
                      className={`h-1.5 w-full rounded-full overflow-hidden ${
                        isLight ? "bg-slate-200/80" : "bg-white/10"
                      }`}
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#8FB6E8] via-[#60A5FA] to-[#A78BFA] transition-all duration-1000"
                        style={{ width: `${metric.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Card Footer */}
              <div className="pt-4 border-t border-white/15 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
                  <TrendUp size={14} weight="bold" />
                  <span>Calibrated across 12,400+ submissions</span>
                </div>
                <Link
                  href="/dashboard"
                  className={`text-xs font-semibold hover:underline flex items-center gap-1 cursor-pointer ${
                    isLight ? "text-blue-600" : "text-[#8FB6E8]"
                  }`}
                >
                  <span>View Dossier</span>
                  <Sparkle size={13} weight="fill" />
                </Link>
              </div>
            </motion.div>

            {/* Floating Glass Tag Chips (§7 from talentbench_00001 (2)) */}
            {chipsData.map((chip, idx) => {
              const Icon = chip.icon;
              return (
                <div
                  key={chip.label}
                  className={`absolute hidden xl:flex items-center gap-2 px-3.5 py-1.5 glass-tag-chip z-20 text-[11px] font-mono tracking-wider text-[#EAF1FB] border border-[#8FB6E8]/25 shadow-[0_10px_25px_-5px_rgba(4,8,20,0.8)] ${chip.position}`}
                  style={{
                    animation: `auraFloat${(idx % 4) + 1} 12s ease-in-out infinite alternate`,
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#8FB6E8] animate-ping" />
                  <Icon className="h-3.5 w-3.5 text-[#8FB6E8]" />
                  <span>{chip.label}</span>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

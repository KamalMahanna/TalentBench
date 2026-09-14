"use client";

import React from "react";
import {
  TreeStructure,
  ShieldCheck,
  ClockAfternoon,
  Broadcast,
  Sparkle,
} from "@phosphor-icons/react";

export function FeaturesBento() {
  return (
    <section id="architecture" className="relative py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="max-w-3xl mb-16">
        <h2 className="text-3xl sm:text-5xl font-display font-bold text-white tracking-tight leading-tight">
          Recruitment infrastructure engineered for absolute precision.
        </h2>
        <p className="mt-4 text-[#7C91B4] text-sm sm:text-base leading-relaxed">
          Replace fragmented ATS spreadsheets with a unified, auditable candidate evaluation platform.
        </p>
      </div>

      {/* Gapless Bento Grid with grid-flow-dense */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 grid-flow-dense">
        {/* Card 1: Main Highlight (col-span-8 row-span-2) with navy-ice gradient tint */}
        <div className="md:col-span-8 md:row-span-2 rounded-3xl p-1.5 bg-white/[0.04] ring-1 ring-[#8FB6E8]/20 shadow-2xl backdrop-blur-2xl">
          <div className="rounded-[calc(1.5rem-4px)] bg-gradient-to-br from-[#0E1736] via-[#0A1228] to-[#060B18] p-8 md:p-10 border border-white/10 h-full flex flex-col justify-between relative overflow-hidden">
            {/* Background geometric aura */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#8FB6E8]/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#8FB6E8]/10 ring-1 ring-[#8FB6E8]/30 text-[#8FB6E8] flex items-center justify-center mb-6">
                <TreeStructure size={24} weight="duotone" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight max-w-lg">
                Dynamic Connector Pipeline Engine
              </h3>
              <p className="mt-4 text-[#7C91B4] text-sm sm:text-base leading-relaxed max-w-xl">
                Add, reorder, and configure custom evaluation stages without writing code. Duplicate technical rounds, set passing thresholds, and auto-route candidates between rounds.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[#7C91B4]">STAGE REORDERING</div>
                <div className="text-white font-semibold mt-1">Drag &amp; Spring Physics</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[#7C91B4]">ROUND ITERATIONS</div>
                <div className="text-[#8FB6E8] font-semibold mt-1">Unlimited Duplication</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[#7C91B4]">TRANSITIONS</div>
                <div className="text-[#60A5FA] font-semibold mt-1">Zero-Latency Flow</div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: AI Verification (col-span-4) */}
        <div className="md:col-span-4 rounded-3xl p-1.5 bg-white/[0.04] ring-1 ring-[#8FB6E8]/20 shadow-2xl backdrop-blur-2xl">
          <div className="rounded-[calc(1.5rem-4px)] bg-[#0D1633] p-8 border border-white/10 h-full flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-[#60A5FA]/10 ring-1 ring-[#60A5FA]/30 text-[#60A5FA] flex items-center justify-center mb-4">
                <ShieldCheck size={20} weight="duotone" />
              </div>
              <h4 className="text-lg font-display font-semibold text-white">
                Human-in-the-Loop Auditability
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-[#7C91B4] leading-relaxed">
                HR retains 100% oversight. Review full agent inference logs, score distributions, and override recommendations with one click.
              </p>
            </div>
            <div className="mt-6 text-xs font-mono text-[#8FB6E8] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8FB6E8]" />
              Full Explainability Guaranteed
            </div>
          </div>
        </div>

        {/* Card 3: Experience Boundary Enforcement (col-span-4) */}
        <div className="md:col-span-4 rounded-3xl p-1.5 bg-white/[0.04] ring-1 ring-[#8FB6E8]/20 shadow-2xl backdrop-blur-2xl">
          <div className="rounded-[calc(1.5rem-4px)] bg-[#0D1633] p-8 border border-white/10 h-full flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-amber-400/10 ring-1 ring-amber-400/30 text-amber-300 flex items-center justify-center mb-4">
                <ClockAfternoon size={20} weight="duotone" />
              </div>
              <h4 className="text-lg font-display font-semibold text-white">
                Strict Experience Gates
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-[#7C91B4] leading-relaxed">
                Mandatory minimum and maximum years of experience validation eliminates mismatched applicants before manual review.
              </p>
            </div>
            <div className="mt-6 text-xs font-mono text-[#7C91B4]">
              Min-Max Range Verification
            </div>
          </div>
        </div>

        {/* Card 4: Personalized Candidate Communications (col-span-6) */}
        <div className="md:col-span-6 rounded-3xl p-1.5 bg-white/[0.04] ring-1 ring-[#8FB6E8]/20 shadow-2xl backdrop-blur-2xl">
          <div className="rounded-[calc(1.5rem-4px)] bg-gradient-to-br from-[#0E1736] via-[#0A1228] to-[#060B18] p-8 border border-white/10 h-full flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-[#8FB6E8]/10 ring-1 ring-[#8FB6E8]/30 text-[#8FB6E8] flex items-center justify-center mb-4">
                <Sparkle size={20} weight="duotone" />
              </div>
              <h4 className="text-xl font-display font-semibold text-white">
                Empathetic Personalized Replies
              </h4>
              <p className="mt-2 text-sm text-[#7C91B4] leading-relaxed">
                Automatically generate respectful, context-aware correspondence for both accepted and rejected applicants with specific feedback on strengths.
              </p>
            </div>
            <div className="mt-6 text-xs font-mono text-[#8FB6E8]">
              Zero Generic Form Letters
            </div>
          </div>
        </div>

        {/* Card 5: Real-time Telemetry (col-span-6) */}
        <div className="md:col-span-6 rounded-3xl p-1.5 bg-white/[0.04] ring-1 ring-[#8FB6E8]/20 shadow-2xl backdrop-blur-2xl">
          <div className="rounded-[calc(1.5rem-4px)] bg-[#0D1633] p-8 border border-white/10 h-full flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-[#A78BFA]/10 ring-1 ring-[#A78BFA]/30 text-[#A78BFA] flex items-center justify-center mb-4">
                <Broadcast size={20} weight="duotone" />
              </div>
              <h4 className="text-xl font-display font-semibold text-white">
                Live Conversion Funnels
              </h4>
              <p className="mt-2 text-sm text-[#7C91B4] leading-relaxed">
                Track pass-through rates between resume screening, coding assessments, and final round interviews to spot candidate drop-off patterns instantly.
              </p>
            </div>
            <div className="mt-6 text-xs font-mono text-[#A78BFA]">
              Stage Drop-off Analytics
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

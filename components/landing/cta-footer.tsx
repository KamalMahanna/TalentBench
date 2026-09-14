"use client";

import React from "react";
import Image from "next/image";
import { GlassButton } from "@/components/ui/glass-button";
import { Sparkle } from "@phosphor-icons/react";
import Link from "next/link";
import { useTheme } from "@/context/theme-context";

export function CtaFooter() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <footer
      className={`relative pt-24 pb-16 px-4 sm:px-6 lg:px-8 border-t overflow-hidden transition-colors duration-300 ${
        isLight
          ? "bg-white/40 border-slate-200/80 backdrop-blur-md text-slate-800"
          : "bg-[#060B18]/40 border-white/10 backdrop-blur-md text-[#7C91B4]"
      }`}
    >
      {/* Massive Call to Action Section */}
      <div className="max-w-5xl mx-auto rounded-3xl p-1.5 bg-white/[0.04] ring-1 ring-[#8FB6E8]/25 shadow-2xl backdrop-blur-3xl text-center mb-24 relative z-10">
        <div className={`rounded-[calc(1.5rem-4px)] p-10 sm:p-16 border ${
          isLight
            ? "bg-gradient-to-b from-white/95 to-slate-50/90 border-white/80 shadow-xl"
            : "bg-gradient-to-b from-[#0E1736] to-[#070D20] border-white/10"
        }`}>
          <h2 className={`text-3xl sm:text-5xl font-display font-bold tracking-tight leading-tight max-w-2xl mx-auto ${
            isLight ? "text-slate-900" : "text-white"
          }`}>
            Ready to deploy your autonomous hiring pipeline?
          </h2>
          <p className={`mt-4 text-sm sm:text-base max-w-xl mx-auto leading-relaxed ${
            isLight ? "text-slate-600" : "text-[#7C91B4]"
          }`}>
            Create custom connector stages, configure AI screening with full trace visibility, and start shortlisting top candidates today.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <GlassButton size="lg" variant="primary" withArrow href="/dashboard/jobs/new">
              Create Your First Job Profile
            </GlassButton>
            <GlassButton size="lg" variant="secondary" href="/dashboard">
              Enter Workspace
            </GlassButton>
          </div>
        </div>
      </div>

      {/* Structured Minimal Footer */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-white/10 text-xs text-[#7C91B4] font-mono">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="TalentBench Logo"
              width={24}
              height={24}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-[#EAF1FB] font-display font-semibold text-sm">
            Talent<span className="text-[#8FB6E8]">Bench</span>
          </span>
          <span className="text-zinc-600">/</span>
          <span>Awwwards-Tier Engineering</span>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="hover:text-[#EAF1FB] transition-colors">
            Workspace
          </Link>
          <Link href="/login" className="hover:text-[#EAF1FB] transition-colors">
            HR Access
          </Link>
          <a href="#pipeline" className="hover:text-[#EAF1FB] transition-colors">
            Pipeline Architect
          </a>
          <span className="flex items-center gap-1.5 text-[#8FB6E8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8FB6E8] animate-pulse" />
            Telemetry Operational
          </span>
        </div>

        <div>
          &copy; {new Date().getFullYear()} TalentBench Platform. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

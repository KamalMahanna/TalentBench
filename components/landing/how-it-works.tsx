"use client";

import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";
import { initGSAP } from "@/lib/animations/gsap-setup";
import {
  Briefcase,
  GitMerge,
  Cpu,
  ChatCircleText,
  CheckCircle,
} from "@phosphor-icons/react";
import { useTheme } from "@/context/theme-context";

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const steps = [
    {
      step: "01",
      icon: Briefcase,
      title: "Define Target Profiles with Exact Experience Ranges",
      description:
        "Input rich job specifications and strict experience bounds. TalentBench converts unstructured criteria into quantifiable evaluation matrices.",
      highlight: "Mandatory Experience Boundaries",
      metric: "5 min setup",
      preview: (
        <div className={`rounded-2xl p-5 border font-mono text-xs ${
          isLight
            ? "bg-slate-50 border-slate-200 text-slate-800"
            : "bg-[#080E22] border-[#8FB6E8]/20 text-[#EAF1FB]"
        }`}>
          <div className={`flex items-center justify-between pb-3 border-b ${isLight ? "border-slate-200" : "border-white/10"}`}>
            <span className={isLight ? "text-blue-600 font-semibold" : "text-[#8FB6E8] font-semibold"}>JOB SPECIFICATION</span>
            <span className="text-emerald-500 flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ACTIVE
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between">
              <span className={isLight ? "text-slate-500" : "text-[#7C91B4]"}>Role:</span>
              <span className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>Senior Distributed Systems Engineer</span>
            </div>
            <div className="flex justify-between">
              <span className={isLight ? "text-slate-500" : "text-[#7C91B4]"}>Experience Range:</span>
              <span className={`font-bold ${isLight ? "text-blue-600" : "text-[#8FB6E8]"}`}>5 - 9 Years</span>
            </div>
            <div className="flex justify-between">
              <span className={isLight ? "text-slate-500" : "text-[#7C91B4]"}>Core Stack:</span>
              <span className={isLight ? "text-slate-700" : "text-[#EAF1FB]"}>Rust, Raft, Kubernetes, gRPC</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      step: "02",
      icon: GitMerge,
      title: "Assemble Multi-Stage Connector Pipelines",
      description:
        "Chain interview stages like functional microservices. Add aptitude, DSA, system design, or cultural rounds in any order, with multiple iterations per profile.",
      highlight: "Infinite Stage Composition",
      metric: "Modular Connectors",
      preview: (
        <div className={`rounded-2xl p-5 border text-xs ${
          isLight
            ? "bg-slate-50 border-slate-200"
            : "bg-[#080E22] border-[#8FB6E8]/20"
        }`}>
          <div className={`text-[11px] font-mono uppercase mb-3 ${isLight ? "text-slate-500" : "text-[#7C91B4]"}`}>
            Pipeline Architecture Flow
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <span className={`px-3 py-1.5 rounded-lg border whitespace-nowrap ${
              isLight
                ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold"
                : "bg-[#8FB6E8]/10 border-[#8FB6E8]/30 text-[#8FB6E8]"
            }`}>
              Resume Screening
            </span>
            <span className={isLight ? "text-slate-400" : "text-[#7C91B4]"}>→</span>
            <span className={`px-3 py-1.5 rounded-lg border whitespace-nowrap ${
              isLight
                ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold"
                : "bg-[#60A5FA]/10 border-[#60A5FA]/30 text-[#60A5FA]"
            }`}>
              DSA Round
            </span>
            <span className={isLight ? "text-slate-400" : "text-[#7C91B4]"}>→</span>
            <span className={`px-3 py-1.5 rounded-lg border whitespace-nowrap ${
              isLight
                ? "bg-purple-50 border-purple-200 text-purple-700 font-semibold"
                : "bg-[#A78BFA]/10 border-[#A78BFA]/30 text-[#A78BFA]"
            }`}>
              Communication
            </span>
            <span className={isLight ? "text-slate-400" : "text-[#7C91B4]"}>→</span>
            <span className={`px-3 py-1.5 rounded-lg border whitespace-nowrap ${
              isLight
                ? "bg-slate-100 border-slate-300 text-slate-700"
                : "bg-white/5 border border-white/10 text-[#EAF1FB]"
            }`}>
              HR Round
            </span>
          </div>
        </div>
      ),
    },
    {
      step: "03",
      icon: Cpu,
      title: "Autonomous AI Screening with Auditable Traces",
      description:
        "The agent parses each resume against your exact requirements. Every inference, weighted qualification, and shortlisting rationale is preserved in an auditable trace.",
      highlight: "Zero Black-Box Guesswork",
      metric: "100% Trace Transparency",
      preview: (
        <div className={`rounded-2xl p-5 border font-mono text-[11px] leading-relaxed ${
          isLight
            ? "bg-slate-50 border-slate-200 text-slate-700"
            : "bg-[#080E22] border-[#8FB6E8]/20 text-[#7C91B4]"
        }`}>
          <div className={`font-semibold mb-2 flex items-center gap-2 ${isLight ? "text-blue-600" : "text-[#8FB6E8]"}`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${isLight ? "bg-blue-600" : "bg-[#8FB6E8]"}`} />
            AGENT_TRACE_LOG_VERIFIED
          </div>
          <div className="space-y-1">
            <p className={isLight ? "text-slate-900" : "text-[#EAF1FB]"}>&gt; Parsing candidate experience: 6.5 yrs (in range [5-9])</p>
            <p className="text-emerald-600 font-medium">&gt; Distributed consensus match: Raft implementation detected</p>
            <p className={isLight ? "text-slate-500" : "text-[#7C91B4]"}>&gt; Verification Score: 94.2/100 · Verdict: SHORTLISTED</p>
          </div>
        </div>
      ),
    },
    {
      step: "04",
      icon: ChatCircleText,
      title: "Personalized Replies to 100% of Candidates",
      description:
        "No applicant is left in silence. TalentBench crafts tailored, respectful, and constructive feedback for every applicant based on their exact screening trace.",
      highlight: "Candidate Experience at Scale",
      metric: "0 Ghosted Applicants",
      preview: (
        <div className={`rounded-2xl p-5 border text-xs ${
          isLight
            ? "bg-slate-50 border-slate-200"
            : "bg-[#080E22] border-[#8FB6E8]/20"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              isLight ? "bg-blue-100 text-blue-700" : "bg-[#8FB6E8]/20 text-[#8FB6E8]"
            }`}>
              AI
            </div>
            <span className={`font-medium ${isLight ? "text-slate-900" : "text-[#EAF1FB]"}`}>Personalized Candidate Email Preview</span>
          </div>
          <p className={`text-[11px] leading-relaxed italic p-3 rounded-xl border ${
            isLight
              ? "bg-white border-slate-200 text-slate-600"
              : "bg-white/[0.02] border-white/5 text-[#7C91B4]"
          }`}>
            &ldquo;Hi Alex, thank you for applying. Our engineering team was particularly impressed by your hands-on Raft consensus engine at ScaleCraft...&rdquo;
          </p>
        </div>
      ),
    },
  ];

  useEffect(() => {
    if (reduce || !containerRef.current) return;
    initGSAP();

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".how-it-works-card");

      cards.forEach((card, i) => {
        if (i === cards.length - 1) return;

        ScrollTrigger.create({
          trigger: card,
          start: "top 12%",
          endTrigger: cards[cards.length - 1],
          end: "top 12%",
          pin: true,
          pinSpacing: false,
        });

        // ONLY scale slightly without touching opacity, so it NEVER becomes transparent!
        gsap.to(card, {
          scale: 0.95,
          ease: "none",
          scrollTrigger: {
            trigger: cards[i + 1],
            start: "top 70%",
            end: "top 12%",
            scrub: true,
          },
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, [reduce]);

  return (
    <section ref={containerRef} className="relative py-28 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-20">
        <h2 className={`text-3xl sm:text-5xl font-display font-bold tracking-tight ${
          isLight ? "text-slate-900" : "text-white"
        }`}>
          How TalentBench Works
        </h2>
        <p className={`mt-4 text-base leading-relaxed ${
          isLight ? "text-slate-600" : "text-[#7C91B4]"
        }`}>
          From role specification to verified shortlist in four seamless stages.
        </p>
      </div>

      {/* Cards stack on scroll */}
      <div className="space-y-12">
        {steps.map((item, idx) => {
          return (
            <div
              key={item.step}
              className="how-it-works-card min-h-[460px] flex items-center justify-center will-change-transform"
            >
              {/* Card envelope with transparent frosted-glass bezel matching Infinite Pipeline Composability */}
              <div
                className={`w-full rounded-3xl p-1.5 ring-1 transition-all duration-300 shadow-2xl backdrop-blur-2xl ${
                  isLight
                    ? "bg-white/40 ring-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
                    : "bg-white/[0.04] ring-[#8FB6E8]/20 shadow-[0_25px_60px_-15px_rgba(4,8,20,0.95)] hover:ring-[#8FB6E8]/40"
                }`}
              >
                <div
                  className={`relative h-full w-full rounded-[calc(1.5rem-4px)] p-6 md:p-10 overflow-hidden border ${
                    isLight
                      ? "bg-white border-slate-100 text-slate-900"
                      : "bg-gradient-to-br from-[#0E1633] via-[#0A1228] to-[#070D1E] border-white/10 text-[#EAF1FB]"
                  }`}
                >
                  {/* Subtle top edge highlight */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8FB6E8]/40 to-transparent" />

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                    <div className="md:col-span-7">
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`font-mono text-sm font-semibold ${isLight ? "text-blue-600" : "text-[#8FB6E8]"}`}>
                          STEP {item.step}
                        </span>
                        <span className={`w-1.5 h-1.5 rounded-full ${isLight ? "bg-slate-300" : "bg-white/20"}`} />
                        <span className={`text-xs font-mono ${isLight ? "text-slate-500" : "text-[#7C91B4]"}`}>
                          {item.highlight}
                        </span>
                      </div>

                      <h3 className={`text-2xl sm:text-3xl font-display font-bold tracking-tight ${
                        isLight ? "text-slate-900" : "text-white"
                      }`}>
                        {item.title}
                      </h3>

                      <p className={`mt-4 text-sm sm:text-base leading-relaxed max-w-xl ${
                        isLight ? "text-slate-600" : "text-[#7C91B4]"
                      }`}>
                        {item.description}
                      </p>

                      <div className={`mt-6 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono ${
                        isLight
                          ? "bg-blue-50 border border-blue-200 text-blue-700 font-semibold"
                          : "bg-[#8FB6E8]/10 border border-[#8FB6E8]/25 text-[#8FB6E8]"
                      }`}>
                        <CheckCircle size={14} weight="bold" />
                        {item.metric}
                      </div>
                    </div>

                    <div className="md:col-span-5">{item.preview}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

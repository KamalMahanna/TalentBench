"use client";

import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";
import { initGSAP } from "@/lib/animations/gsap-setup";
import {
  FileText,
  Code,
  Brain,
  ChatTeardropDots,
  UsersThree,
  Plus,
  ArrowRight,
} from "@phosphor-icons/react";
import { useTheme } from "@/context/theme-context";

export function PipelinePreview() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const pipelineStages = [
    {
      id: "node-1",
      icon: FileText,
      name: "Resume Screening",
      tag: "Autonomous AI",
      color: "border-[#8FB6E8]/40 text-[#8FB6E8] bg-[#8FB6E8]/10",
      rules: ["Min 5+ yrs experience", "Tech stack match > 75%", "No career gap penalty"],
    },
    {
      id: "node-2",
      icon: Brain,
      name: "Aptitude Assessment",
      tag: "Cognitive Logic",
      color: "border-amber-400/40 text-amber-300 bg-amber-400/10",
      rules: ["Logical deduction (20 Qs)", "Quantitative reasoning", "80% passing threshold"],
    },
    {
      id: "node-3",
      icon: Code,
      name: "DSA & System Coding",
      tag: "Live Sandboxed",
      color: "border-[#60A5FA]/40 text-[#60A5FA] bg-[#60A5FA]/10",
      rules: ["Graph traversal algorithms", "Concurrency handling", "Clean code standards"],
    },
    {
      id: "node-4",
      icon: ChatTeardropDots,
      name: "Communication Round",
      tag: "Audio / Video",
      color: "border-[#A78BFA]/40 text-[#A78BFA] bg-[#A78BFA]/10",
      rules: ["Articulation clarity", "Cross-team empathy", "Structured problem explanation"],
    },
    {
      id: "node-5",
      icon: UsersThree,
      name: "HR Culture Alignment",
      tag: "Values & Compensation",
      color: "border-rose-400/40 text-rose-300 bg-rose-400/10",
      rules: ["Notice period verification", "Team compensation alignment", "Leadership ethos"],
    },
    {
      id: "node-6",
      icon: Plus,
      name: "Add Custom Connector",
      tag: "Unlimited Extensibility",
      color: "border-dashed border-white/20 text-[#7C91B4] bg-white/[0.01]",
      rules: ["Repeat any round type", "Reorder stages effortlessly", "Plug custom webhooks"],
    },
  ];

  useEffect(() => {
    if (reduce || !wrapRef.current || !trackRef.current) return;
    initGSAP();

    const ctx = gsap.context(() => {
      const track = trackRef.current!;

      const getPositions = () => {
        const cards = track.querySelectorAll<HTMLElement>(".pipeline-node-card");
        if (cards.length === 0) {
          const fallbackDist = track.scrollWidth - window.innerWidth + 120;
          return { startX: 0, endX: -fallbackDist, distance: fallbackDist };
        }

        const firstCard = cards[0];
        const lastCard = cards[cards.length - 1];

        const currentX = (gsap.getProperty(track, "x") as number) || 0;
        const trackRect = track.getBoundingClientRect();
        const trackBaseLeft = trackRect.left - currentX;

        const firstCardRect = firstCard.getBoundingClientRect();
        const firstCardCenterRel = firstCardRect.left - trackRect.left + firstCardRect.width / 2;

        const lastCardRect = lastCard.getBoundingClientRect();
        const lastCardCenterRel = lastCardRect.left - trackRect.left + lastCardRect.width / 2;

        const viewportCenter = window.innerWidth / 2;

        // Position where "Resume Screening" (first card) is centered horizontally in the middle of the screen
        const startX = viewportCenter - trackBaseLeft - firstCardCenterRel;

        // Position where "Add Custom Connector" (last card) reaches the middle of the screen
        const endX = viewportCenter - trackBaseLeft - lastCardCenterRel;

        const distance = Math.max(100, Math.abs(startX - endX));

        return { startX, endX, distance };
      };

      // Set initial position immediately so "Resume Screening" starts in the middle
      const initialPositions = getPositions();
      gsap.set(track, { x: initialPositions.startX });

      // Horizontal Conveyor Track: start centered on Resume Screening, end centered on Add Custom Connector
      gsap.fromTo(
        track,
        {
          x: () => getPositions().startX,
        },
        {
          x: () => getPositions().endX,
          ease: "none",
          scrollTrigger: {
            trigger: wrapRef.current,
            start: "top top",
            end: () => `+=${getPositions().distance}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        }
      );
    }, wrapRef);

    return () => ctx.revert();
  }, [reduce]);

  return (
    <section
      id="pipeline"
      ref={wrapRef}
      className={`relative overflow-hidden border-t transition-colors duration-300 bg-transparent ${
        isLight ? "border-slate-200/80" : "border-[#8FB6E8]/15"
      }`}
    >
      {/* Background layer with gradual transparency gradient (static in the background itself, not on scroll) */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 pointer-events-none z-0 transition-opacity duration-500 ${
          isLight
            ? "bg-gradient-to-b from-white/75 via-white/35 to-transparent"
            : "bg-gradient-to-b from-[#060B18]/80 via-[#060B18]/35 to-transparent"
        }`}
      />
      <div
        aria-hidden="true"
        className={`absolute inset-0 pointer-events-none z-0 transition-opacity duration-500 ${
          isLight
            ? "bg-gradient-to-r from-white/50 via-white/20 to-transparent"
            : "bg-gradient-to-r from-[#060B18]/60 via-[#060B18]/20 to-transparent"
        }`}
      />

      {/* Atmospheric center radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="w-[700px] h-[450px] rounded-full bg-[#8FB6E8]/10 blur-[130px]" />
      </div>

      <div className="relative z-10 pt-20 px-6 sm:px-12 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className={`font-mono text-xs uppercase tracking-wider ${isLight ? "text-blue-700 font-semibold" : "text-[#8FB6E8]"}`}>
            Modular Connector Architecture
          </span>
          <h2 className={`mt-2 text-3xl sm:text-5xl font-display font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            Infinite Pipeline Composability
          </h2>
        </div>
        <p className={`text-sm max-w-md ${isLight ? "text-slate-600" : "text-[#7C91B4]"}`}>
          Scroll horizontally through your pipeline. Reorder stages, chain technical rounds, and insert automated gates in any configuration.
        </p>
      </div>

      {/* Horizontal Scroll Track */}
      <div
        ref={trackRef}
        className="relative z-10 flex items-center gap-8 px-6 sm:px-12 py-20 min-h-[600px] w-max will-change-transform"
      >
        {pipelineStages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div key={stage.id} className="flex items-center gap-8">
              {/* Connector Node Card */}
              <div className="pipeline-node-card w-[320px] sm:w-[360px] rounded-3xl p-1.5 bg-white/[0.04] ring-1 ring-[#8FB6E8]/20 shadow-2xl backdrop-blur-2xl group hover:ring-[#8FB6E8]/50 transition-all duration-300">
                <div className={`rounded-[calc(1.5rem-4px)] p-6 border transition-colors duration-300 ${
                  isLight
                    ? "bg-white/80 border-slate-200 text-slate-900 shadow-md backdrop-blur-xl"
                    : "bg-[#0A1228]/80 border-white/10 backdrop-blur-xl"
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono text-[#7C91B4]">
                      STAGE 0{idx + 1}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full uppercase ${stage.color}`}
                    >
                      {stage.tag}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${stage.color}`}
                    >
                      <Icon size={22} weight="duotone" />
                    </div>
                    <div>
                      <h4 className={`text-base font-display font-semibold ${
                        isLight ? "text-slate-900" : "text-white"
                      }`}>
                        {stage.name}
                      </h4>
                      <p className="text-xs text-[#7C91B4] font-mono">Plug-and-play round</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-white/10">
                    <span className="text-[11px] font-mono text-[#7C91B4] uppercase">
                      Evaluation Criteria:
                    </span>
                    {stage.rules.map((rule, rIdx) => (
                      <div
                        key={rIdx}
                        className={`text-xs flex items-center gap-2 ${
                          isLight ? "text-slate-700" : "text-[#EAF1FB]"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8FB6E8]" />
                        {rule}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Animated Connector Arrow between stages */}
              {idx < pipelineStages.length - 1 && (
                <div className="flex items-center text-zinc-600">
                  <div className="w-12 h-0.5 bg-gradient-to-r from-white/10 via-[#8FB6E8]/50 to-white/10 relative">
                    <span className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-[#8FB6E8] animate-ping" />
                  </div>
                  <ArrowRight size={16} className="text-[#8FB6E8]/70 ml-1" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

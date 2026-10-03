"use client";

import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";
import { initGSAP } from "@/lib/animations/gsap-setup";
import {
  FileText,
  Brain,
  Code2,
  MessagesSquare,
  Users,
  Plus,
} from "lucide-react";

export function PipelinePreview() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const pipelineStages = [
    {
      id: "node-1",
      icon: FileText,
      name: "Resume Screening",
      tag: "Autonomous AI",
      color: "border-primary/20 text-primary-deep bg-surface-purple",
      iconBg: "bg-surface-purple text-primary",
      arrowColor: "text-violet-400 dark:text-[#B9A4FF]",
      lineBg: "bg-violet-400 dark:bg-[#B9A4FF]",
      rules: ["Min 5+ yrs experience", "Tech stack match > 75%", "No career gap penalty"],
    },
    {
      id: "node-2",
      icon: Brain,
      name: "Aptitude Assessment",
      tag: "Cognitive Logic",
      color: "border-orange-400/20 text-[#8a481c] dark:text-[#ffdcc6] bg-surface-peach",
      iconBg: "bg-surface-peach text-[#8a481c] dark:text-[#ffdcc6]",
      arrowColor: "text-orange-400 dark:text-[#ffdcc6]",
      lineBg: "bg-orange-400 dark:bg-[#ffdcc6]",
      rules: ["Logical deduction (20 Qs)", "Quantitative reasoning", "80% passing threshold"],
    },
    {
      id: "node-3",
      icon: Code2,
      name: "DSA & System Coding",
      tag: "Live Sandboxed",
      color: "border-blue-400/20 text-[#1e4a7a] dark:text-[#9bc2f5] bg-surface-blue",
      iconBg: "bg-surface-blue text-[#1e4a7a] dark:text-[#9bc2f5]",
      arrowColor: "text-blue-400 dark:text-[#9bc2f5]",
      lineBg: "bg-blue-400 dark:bg-[#9bc2f5]",
      rules: ["Graph traversal algorithms", "Concurrency handling", "Clean code standards"],
    },
    {
      id: "node-4",
      icon: MessagesSquare,
      name: "Communication Round",
      tag: "Audio / Video",
      color: "border-primary/20 text-primary-deep bg-surface-purple",
      iconBg: "bg-surface-purple text-primary",
      arrowColor: "text-violet-400 dark:text-[#B9A4FF]",
      lineBg: "bg-violet-400 dark:bg-[#B9A4FF]",
      rules: ["Articulation clarity", "Cross-team empathy", "Structured problem explanation"],
    },
    {
      id: "node-5",
      icon: Users,
      name: "HR Culture Alignment",
      tag: "Values & Ethos",
      color: "border-orange-400/20 text-[#8a481c] dark:text-[#ffdcc6] bg-surface-peach",
      iconBg: "bg-surface-peach text-[#8a481c] dark:text-[#ffdcc6]",
      arrowColor: "text-orange-400 dark:text-[#ffdcc6]",
      lineBg: "bg-orange-400 dark:bg-[#ffdcc6]",
      rules: ["Notice period verification", "Team compensation alignment", "Leadership ethos"],
    },
    {
      id: "node-6",
      icon: Plus,
      name: "Add Custom Connector",
      tag: "Extensible",
      color: "border border-dashed border-outline text-muted bg-surface",
      iconBg: "bg-surface border border-outline text-primary",
      arrowColor: "text-violet-400 dark:text-[#B9A4FF]",
      lineBg: "bg-violet-400 dark:bg-[#B9A4FF]",
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

        // Position where "Resume Screening" (first card) starts centered in viewport
        const startX = viewportCenter - trackBaseLeft - firstCardCenterRel;

        // Position where "Add Custom Connector" (last card) reaches the middle of the screen
        const endX = viewportCenter - trackBaseLeft - lastCardCenterRel;

        const distance = Math.max(120, Math.abs(startX - endX));

        return { startX, endX, distance };
      };

      // Set initial position immediately
      const initialPositions = getPositions();
      gsap.set(track, { x: initialPositions.startX });

      // Unified GSAP Timeline tied to ScrollTrigger
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapRef.current,
          start: "top top",
          end: () => `+=${getPositions().distance}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      // 1. Horizontal Conveyor Track: start centered on Resume Screening, end centered on Add Custom Connector
      tl.fromTo(
        track,
        {
          x: () => getPositions().startX,
        },
        {
          x: () => getPositions().endX,
          ease: "none",
          duration: 1,
        },
        0
      );

      // 2. Animate connector arrows and line from left to right in lockstep
      const bridges = track.querySelectorAll<HTMLElement>(".connector-bridge");
      const numBridges = bridges.length;

      if (numBridges > 0) {
        bridges.forEach((bridge, bIdx) => {
          const arrow = bridge.querySelector<HTMLElement>(".connector-arrow");
          const lineActive = bridge.querySelector<HTMLElement>(".connector-line-active");
          if (!arrow || !lineActive) return;

          // Each bridge transition is mapped across its active scroll window
          const segDuration = 1 / numBridges;
          const startTime = bIdx * segDuration;
          const duration = segDuration * 0.95;

          const arrowWidth = 20;
          const startX = 0;
          const getEndX = () => Math.max(arrowWidth, bridge.clientWidth - arrowWidth);

          // The line extends from left to right behind the moving arrow
          tl.fromTo(
            lineActive,
            { width: startX },
            {
              width: () => getEndX() + 2,
              ease: "none",
              duration: duration,
            },
            startTime
          );

          // The arrow (tail + head) glides along the line
          tl.fromTo(
            arrow,
            { x: startX },
            {
              x: () => getEndX(),
              ease: "none",
              duration: duration,
            },
            startTime
          );
        });
      }
    }, wrapRef);

    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 120);

    return () => {
      clearTimeout(refreshTimer);
      ctx.revert();
    };
  }, [reduce]);

  return (
    <section
      id="pipeline"
      ref={wrapRef}
      className="relative overflow-hidden bg-canvas transition-colors duration-300 py-24"
    >
      <div className="relative z-10 px-6 sm:px-12 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="section-kicker">Modular connector architecture</div>
          <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-[-0.04em] text-ink">
            Infinite Pipeline <span>Composability.</span>
          </h2>
        </div>
        <p className="text-sm sm:text-base max-w-md text-muted leading-relaxed">
          Scroll horizontally through your pipeline. Reorder stages, chain technical rounds,
          and insert automated gates in any configuration.
        </p>
      </div>

      {/* Horizontal Scroll Track */}
      <div
        ref={trackRef}
        className="relative z-10 flex items-center gap-8 px-6 sm:px-12 py-16 min-h-[520px] w-max will-change-transform"
      >
        {pipelineStages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div key={stage.id} className="flex items-center gap-8">
              {/* Connector Node Card */}
              <div className="pipeline-node-card w-[320px] sm:w-[350px] rounded-3xl p-1 bg-surface-high border border-outline shadow-[0_12px_32px_rgba(27,26,34,0.06)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition-all duration-300 hover:border-primary/40">
                <div className="rounded-[calc(1.5rem-2px)] p-6 bg-surface-high">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted font-semibold">
                      STAGE 0{idx + 1}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase border ${stage.color}`}
                    >
                      {stage.tag}
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 mb-5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${stage.iconBg}`}
                    >
                      <Icon size={22} />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-ink tracking-tight">
                        {stage.name}
                      </h4>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-outline">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-2">
                      Evaluation Criteria:
                    </span>
                    {stage.rules.map((rule, rIdx) => (
                      <div
                        key={rIdx}
                        className="text-xs flex items-center gap-2.5 text-ink/80"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Connector Bridge between stages */}
              {idx < pipelineStages.length - 1 && (() => {
                const nextStage = pipelineStages[idx + 1];
                return (
                  <div className="connector-bridge relative flex items-center w-16 sm:w-20 h-6 shrink-0 mx-2">
                    {/* 1. Base 2px guide track */}
                    <div className="w-full h-0.5 bg-outline/70 dark:bg-white/15" />

                    {/* 2. Active line in color of card it is coming from */}
                    <div
                      className={`connector-line-active absolute left-0 top-1/2 -mt-[1px] h-0.5 ${stage.lineBg}`}
                      style={{ width: reduce ? "100%" : "0px" }}
                    />

                    {/* 3. Arrow with tail & head in color of next card, centered seamlessly on the line */}
                    <div
                      className={`connector-arrow absolute left-0 top-1/2 -mt-[1px] h-0.5 flex items-center z-10 pointer-events-none ${nextStage.arrowColor}`}
                      style={{
                        transform: reduce
                          ? "translateX(calc(100% - 20px))"
                          : "translateX(0px)",
                      }}
                    >
                      {/* Arrow Tail: identical 2px height HTML bar */}
                      <div className="w-3.5 h-0.5 bg-current shrink-0" />

                      {/* Arrowhead: precision chevron aligned with the 2px bar */}
                      <svg
                        width="9"
                        height="12"
                        viewBox="0 0 9 12"
                        fill="none"
                        className="shrink-0 -ml-[2px] block overflow-visible"
                      >
                        <path
                          d="M 2 1.5 L 7.5 6 L 2 10.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </section>
  );
}

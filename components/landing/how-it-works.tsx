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
  MessageSquareText,
  CheckCircle2,
} from "lucide-react";

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

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
        <div className="rounded-2xl p-5 border border-outline bg-surface text-ink text-xs font-sans shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-outline">
            <span className="text-primary font-bold text-[11px] tracking-wider uppercase">
              Job Specification
            </span>
            <span className="bg-green/10 text-green px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
              ACTIVE
            </span>
          </div>
          <div className="mt-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted">Target Role:</span>
              <span className="font-semibold text-ink text-right">
                Senior Distributed Systems
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Experience Band:</span>
              <span className="font-bold text-primary-deep bg-surface-purple px-2 py-0.5 rounded-md">
                5 - 9 Years
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Core Criteria:</span>
              <span className="text-ink font-mono text-[11px]">
                Rust, Raft, Kubernetes, gRPC
              </span>
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
        <div className="rounded-2xl p-5 border border-outline bg-surface text-ink text-xs shadow-sm">
          <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-3">
            Connector Pipeline Sequence
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <span className="px-3 py-1.5 rounded-xl border border-primary/20 bg-surface-purple text-primary-deep font-semibold whitespace-nowrap text-xs">
              Resume Screening
            </span>
            <span className="text-muted text-xs">→</span>
            <span className="px-3 py-1.5 rounded-xl border border-blue-400/20 bg-surface-blue text-[#1e4a7a] dark:text-[#9bc2f5] font-semibold whitespace-nowrap text-xs">
              DSA Round
            </span>
            <span className="text-muted text-xs">→</span>
            <span className="px-3 py-1.5 rounded-xl border border-orange-400/20 bg-surface-peach text-[#8a481c] dark:text-[#ffdcc6] font-semibold whitespace-nowrap text-xs">
              Communication
            </span>
            <span className="text-muted text-xs">→</span>
            <span className="px-3 py-1.5 rounded-xl border border-outline bg-surface-high text-ink font-medium whitespace-nowrap text-xs">
              Final Review
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
        <div className="rounded-2xl p-5 border border-outline bg-surface text-ink text-xs font-mono shadow-sm">
          <div className="font-semibold mb-2.5 flex items-center gap-2 text-primary">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="tracking-wide text-[11px]">TRACE_EVALUATION_PASS</span>
          </div>
          <div className="space-y-1.5 text-[11px] leading-relaxed">
            <p className="text-ink">&gt; Experience parsed: 6.5 yrs (in range [5-9])</p>
            <p className="text-green font-medium">&gt; Tech match: Raft implementation detected</p>
            <div className="mt-2 pt-2 border-t border-outline flex items-center justify-between font-sans">
              <span className="text-muted text-[11px]">Composite Score:</span>
              <span className="bg-green/10 text-green font-bold px-2 py-0.5 rounded-md text-xs">
                94.2/100 · Shortlisted
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      step: "04",
      icon: MessageSquareText,
      title: "Personalized Replies to 100% of Candidates",
      description:
        "No applicant is left in silence. TalentBench crafts tailored, respectful, and constructive feedback for every applicant based on their exact screening trace.",
      highlight: "Candidate Experience at Scale",
      metric: "0 Ghosted Applicants",
      preview: (
        <div className="rounded-2xl p-5 border border-outline bg-surface text-ink text-xs shadow-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-6 h-6 rounded-full bg-surface-purple text-primary-deep flex items-center justify-center text-[10px] font-bold">
              AI
            </div>
            <span className="font-semibold text-ink text-xs">
              Personalized Candidate Note
            </span>
          </div>
          <p className="text-[11px] leading-relaxed italic p-3 rounded-xl border border-outline bg-surface-high text-muted">
            &ldquo;Hi Alex, thank you for applying. Our engineering team was particularly
            impressed by your hands-on Raft consensus engine at ScaleCraft...&rdquo;
          </p>
          <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-muted">
            <CheckCircle2 size={12} className="text-green" />
            <span>0 ghosted applicants · Sent automatically</span>
          </div>
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
          start: "top 14%",
          endTrigger: cards[cards.length - 1],
          end: "top 14%",
          pin: true,
          pinSpacing: false,
        });

        // Smooth scale down on scroll to create physical card-stacking depth
        gsap.to(card, {
          scale: 0.95,
          ease: "none",
          scrollTrigger: {
            trigger: cards[i + 1],
            start: "top 70%",
            end: "top 14%",
            scrub: true,
          },
        });
      });
    }, containerRef);

    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 120);

    return () => {
      clearTimeout(timer);
      ctx.revert();
    };
  }, [reduce]);

  return (
    <section
      ref={containerRef}
      id="how-it-works"
      className="relative py-28 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto"
    >
      <div className="text-center max-w-2xl mx-auto mb-20">
        <div className="section-kicker">How it works</div>
        <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.04em] text-ink">
          From role specification to <span>verified shortlist.</span>
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Four transparent, structured stages engineered to eliminate hiring guesswork and
          save your team dozens of hours.
        </p>
      </div>

      {/* Cards stack on scroll */}
      <div className="space-y-12">
        {steps.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={item.step}
              className="how-it-works-card min-h-[440px] flex items-center justify-center will-change-transform relative"
              style={{ zIndex: 10 + idx }}
            >
              {/* Card envelope in Material You theme */}
              <div className="w-full rounded-3xl p-1 bg-surface-high border border-outline shadow-[0_12px_36px_rgba(27,26,34,0.06)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition-all duration-300">
                <div className="relative h-full w-full rounded-[calc(1.5rem-2px)] p-6 md:p-10 overflow-hidden bg-surface-high">
                  {/* Subtle top edge Material You accent highlight */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                    <div className="md:col-span-7">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-purple text-primary-deep text-xs font-semibold">
                          <Icon size={14} />
                          STEP {item.step}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-outline" />
                        <span className="text-xs text-muted font-medium">
                          {item.highlight}
                        </span>
                      </div>

                      <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-ink">
                        {item.title}
                      </h3>

                      <p className="mt-4 text-sm sm:text-base leading-relaxed text-muted max-w-xl">
                        {item.description}
                      </p>

                      <div className="mt-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-surface-purple text-primary-deep border border-outline/50">
                        <CheckCircle2 size={14} className="text-primary" />
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

"use client";

import React, { useRef, useEffect, useState } from "react";
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
      title: "Assemble Multi-Stage Hiring Rounds",
      description:
        "Chain interview stages like functional microservices. Add aptitude, DSA, system design, or cultural rounds in any order, with multiple iterations per profile.",
      highlight: "Infinite Stage Composition",
      metric: "Modular Connectors",
      preview: (
        <div className="rounded-2xl p-5 border border-outline bg-surface text-ink text-xs shadow-sm">
          <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-3">
            Hiring Rounds Sequence
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

  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (reduce || !sectionRef.current) return;
    initGSAP();

    const section = sectionRef.current;
    const cards = cardRefs.current.filter(Boolean) as HTMLElement[];
    if (cards.length === 0) return;

    let lastActiveStep = 0;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      // 1. Initial configuration
      // Card 0 starts locked front and center at 100% solid opacity
      gsap.set(cards[0], {
        y: 0,
        scale: 1,
        opacity: 1,
        transformOrigin: "center top",
        force3D: true,
      });

      const getInitialY = () =>
        Math.min(Math.round(window.innerHeight * 0.55), 440);

      // Cards 1, 2, 3 wait below with natural offset, slight scale and zero opacity
      for (let i = 1; i < cards.length; i++) {
        gsap.set(cards[i], {
          y: getInitialY(),
          scale: 0.96,
          opacity: 0,
          transformOrigin: "center top",
          force3D: true,
        });
      }

      const navOffset = () => (window.innerWidth <= 600 ? 66 : 76);
      const scrollDistance = () =>
        Math.max(1600, Math.round(window.innerHeight * 2.2));

      // 2. Master timeline pinned once with responsive scrub synced to Lenis
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: () => `top ${navOffset()}px`,
          end: () => `+=${scrollDistance()}`,
          pin: true,
          pinSpacing: true,
          scrub: 0.3,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const p = self.progress;
            let nextStep = 0;
            if (p < 0.2) {
              nextStep = 0;
            } else if (p < 0.5) {
              nextStep = 1;
            } else if (p < 0.8) {
              nextStep = 2;
            } else {
              nextStep = 3;
            }
            if (nextStep !== lastActiveStep) {
              lastActiveStep = nextStep;
              setActiveStep(nextStep);
            }
          },
        },
      });

      // Step 01 reading dwell
      tl.to({}, { duration: 0.35 });

      // STEP 01 -> STEP 02
      // Card 1 glides up to center at 100% solid opacity
      // Card 0 steps back into the card stack while maintaining solid opacity
      tl.to(cards[1], {
        y: 0,
        scale: 1,
        opacity: 1,
        duration: 1.0,
        ease: "power2.out",
      });
      tl.to(
        cards[0],
        {
          y: -16,
          scale: 0.96,
          duration: 1.0,
          ease: "power2.out",
        },
        "<"
      );

      // Step 02 reading dwell
      tl.to({}, { duration: 0.35 });

      // STEP 02 -> STEP 03
      // Card 2 glides up to center; cards 1 and 0 step back
      tl.to(cards[2], {
        y: 0,
        scale: 1,
        opacity: 1,
        duration: 1.0,
        ease: "power2.out",
      });
      tl.to(
        cards[1],
        {
          y: -16,
          scale: 0.96,
          duration: 1.0,
          ease: "power2.out",
        },
        "<"
      );
      tl.to(
        cards[0],
        {
          y: -32,
          scale: 0.92,
          duration: 1.0,
          ease: "power2.out",
        },
        "<"
      );

      // Step 03 reading dwell
      tl.to({}, { duration: 0.35 });

      // STEP 03 -> STEP 04
      // Card 3 glides up to center; cards 2, 1, 0 step back
      tl.to(cards[3], {
        y: 0,
        scale: 1,
        opacity: 1,
        duration: 1.0,
        ease: "power2.out",
      });
      tl.to(
        cards[2],
        {
          y: -16,
          scale: 0.96,
          duration: 1.0,
          ease: "power2.out",
        },
        "<"
      );
      tl.to(
        cards[1],
        {
          y: -32,
          scale: 0.92,
          duration: 1.0,
          ease: "power2.out",
        },
        "<"
      );
      tl.to(
        cards[0],
        {
          y: -48,
          scale: 0.88,
          duration: 1.0,
          ease: "power2.out",
        },
        "<"
      );

      // Gentle final cushion on Step 04 before unpinning
      tl.to({}, { duration: 0.4 });
    });

    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);

    return () => {
      clearTimeout(timer);
      mm.revert();
    };
  }, [reduce]);

  // Reduced motion fallback: static clean vertical stack
  if (reduce) {
    return (
      <section
        id="how-it-works"
        className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto"
      >
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="section-kicker">How it works</div>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.04em] text-ink">
            From role specification to <span>verified shortlist.</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Four transparent, structured stages engineered to eliminate hiring guesswork and
            save your team dozens of hours.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="w-full rounded-3xl p-1 bg-surface-high border border-outline shadow-sm"
              >
                <div className="relative h-full w-full rounded-[calc(1.5rem-2px)] p-6 md:p-8 overflow-hidden bg-surface-high">
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
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative w-full overflow-hidden py-12 sm:py-16 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-5xl mx-auto flex flex-col items-center">
        {/* Section Header */}
        <div className="how-it-works-header text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <div className="section-kicker">How it works</div>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.04em] text-ink">
            From role specification to <span>verified shortlist.</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Four transparent, structured stages engineered to eliminate hiring guesswork and
            save your team dozens of hours.
          </p>
        </div>

        {/* Mobile Vertical Stack (< 768px) */}
        <div className="flex md:hidden flex-col gap-6 w-full pt-2">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="w-full rounded-3xl p-1 bg-surface-high border border-outline shadow-sm"
              >
                <div className="relative h-full w-full rounded-[calc(1.5rem-2px)] p-5 sm:p-6 overflow-hidden bg-surface-high">
                  <div className="flex items-center gap-2.5 mb-3.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-purple text-primary-deep text-xs font-semibold">
                      <Icon size={13} />
                      STEP {item.step}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-outline" />
                    <span className="text-[11px] text-muted font-medium">
                      {item.highlight}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-semibold tracking-[-0.03em] text-ink">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-xs sm:text-sm leading-relaxed text-muted">
                    {item.description}
                  </p>

                  <div className="my-5">{item.preview}</div>

                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-surface-purple text-primary-deep border border-outline/50">
                    <CheckCircle2 size={13} className="text-primary" />
                    {item.metric}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Fluid Card Deck Stage (>= 768px) */}
        <div className="hidden md:block relative w-full max-w-4xl mx-auto pt-4">
          <div className="grid grid-cols-1 grid-rows-1 items-start w-full">
            {steps.map((item, idx) => {
              const Icon = item.icon;
              const isFront = activeStep === idx;
              return (
                <div
                  key={item.step}
                  ref={(el) => {
                    cardRefs.current[idx] = el;
                  }}
                  className={`how-it-works-card col-start-1 row-start-1 w-full will-change-transform ${
                    isFront ? "pointer-events-auto" : "pointer-events-none"
                  }`}
                  style={{ zIndex: 10 + idx }}
                >
                  {/* Card envelope in Material You theme */}
                  <div className="w-full rounded-3xl p-1 bg-surface-high border border-outline shadow-[0_16px_40px_rgba(27,26,34,0.08)] dark:shadow-[0_20px_48px_rgba(0,0,0,0.45)] transition-shadow duration-300">
                    <div className="relative h-full w-full rounded-[calc(1.5rem-2px)] p-6 md:p-8 overflow-hidden bg-surface-high">
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
        </div>
      </div>
    </section>
  );
}

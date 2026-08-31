'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { FileStack, Brain, Code2, MessageSquare, Report } from '@/components/marketing/icons';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STEPS = [
  {
    icon: FileStack,
    label: 'Resume Screen',
    title: 'AI reads every resume against your job description',
    desc: 'Upload via Excel or let candidates apply directly. Our AI scores each resume for JD match — skills, experience, project depth — and ranks them instantly.',
    metric: '12,000 resumes scored in 8 minutes',
  },
  {
    icon: Brain,
    label: 'Aptitude & Reasoning',
    title: 'Configurable tests, auto-generated and AI-graded',
    desc: 'Generate an aptitude test link with one click. Logical reasoning, quantitative, verbal — every answer scored automatically with category-level breakdowns.',
    metric: '4 categories, 40 questions, zero manual grading',
  },
  {
    icon: Code2,
    label: 'DSA Round',
    title: 'Data structures and algorithms, evaluated by AI',
    desc: 'Candidates solve coding problems through a generated link. The AI evaluates not just correctness but approach, complexity, and code quality.',
    metric: 'Problem decomposition, optimal solution design, code quality',
  },
  {
    icon: MessageSquare,
    label: 'Technical Interview',
    title: 'Communication scored on a structured rubric',
    desc: 'Interviewers enter feedback; the AI compiles it into rubric scores — clarity, confidence, technical articulation, active listening.',
    metric: '4-dimension rubric, calibrated against top performers',
  },
  {
    icon: Report,
    label: 'Performance Report',
    title: 'Every candidate gets a personalized scorecard',
    desc: 'Pass or fail, every applicant receives a shareable report: how their resume, projects, test scores, and communication compared to the shortlisted cohort — and what to improve.',
    metric: 'Radar charts, benchmark comparisons, AI-generated feedback',
  },
];

export function FeatureStory() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const ctx = gsap.context(() => {
        const sections = gsap.utils.toArray<HTMLElement>('.feature-step');
        const stickys = gsap.utils.toArray<HTMLElement>('.feature-sticky');

        sections.forEach((section, i) => {
          const sticky = stickys[i];
          if (!sticky) return;

          gsap.fromTo(
            sticky,
            { opacity: 0, scale: 0.96, y: 30 },
            {
              opacity: 1,
              scale: 1,
              y: 0,
              duration: 0.8,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: section,
                start: 'top 70%',
                end: 'top 30%',
                toggleActions: 'play none none reverse',
              },
            },
          );
        });

        // Progress line
        const progressLine = containerRef.current?.querySelector('.progress-line-fill');
        if (progressLine) {
          gsap.fromTo(
            progressLine,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: containerRef.current,
                start: 'top 50%',
                end: 'bottom 80%',
                scrub: 1,
              },
            },
          );
        }
      }, containerRef);
      return () => ctx.revert();
    },
    { scope: containerRef },
  );

  return (
    <section ref={containerRef} className="relative px-6 py-32">
      <div className="mx-auto max-w-5xl">
        <div className="mb-24 text-center">
          <span className="text-sm font-medium uppercase tracking-widest text-primary">How it works</span>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            One pipeline. Five rounds. Zero guesswork.
          </h2>
        </div>

        {/* Progress line */}
        <div className="absolute left-1/2 top-48 hidden h-[calc(100%-16rem)] w-px -translate-x-1/2 bg-border lg:block">
          <div className="progress-line-fill h-full w-full origin-top bg-gradient-to-b from-primary via-chart-3 to-accent" />
        </div>

        <div className="space-y-32">
          {STEPS.map((step, i) => (
            <div key={i} className="feature-step relative">
              <div className="feature-sticky grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
                {/* Visual side */}
                <div className={`lg:order-${i % 2 === 0 ? 1 : 2}`}>
                  <div className="glass glass-hover relative aspect-[4/3] overflow-hidden rounded-3xl p-8">
                    <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-[60px]" />
                    <div className="relative flex h-full flex-col">
                      <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                        <step.icon className="h-7 w-7" />
                      </div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                        Round {i + 1} — {step.label}
                      </div>
                      <h3 className="mb-4 font-display text-2xl font-bold leading-tight">{step.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                      <div className="mt-auto pt-6">
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-medium text-primary">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-glow" />
                          {step.metric}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Number side */}
                <div className={`flex flex-col items-start lg:order-${i % 2 === 0 ? 2 : 1} ${i % 2 === 0 ? 'lg:items-end lg:text-right' : ''}`}>
                  <span className="font-display text-7xl font-bold text-foreground/10 sm:text-9xl">
                    0{i + 1}
                  </span>
                  <div className={`mt-4 max-w-xs ${i % 2 === 0 ? 'lg:text-right' : ''}`}>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {step.label}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

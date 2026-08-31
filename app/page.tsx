'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Sparkles, Zap, BarChart3, FileCheck2, Users, Shield } from 'lucide-react';
import { GlowButton } from '@/components/glow-button';
import { Reveal, Stagger, StaggerItem } from '@/components/motion';
import { LandingNav } from '@/components/marketing/landing-nav';
import { FeatureStory } from '@/components/marketing/feature-story';
import { SocialProof } from '@/components/marketing/social-proof';
import { LandingFooter } from '@/components/marketing/landing-footer';

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  return (
    <div className="mesh-bg noise relative min-h-screen overflow-x-hidden">
      <LandingNav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative flex min-h-screen items-center justify-center px-6 pt-20">
        <motion.div
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
          className="relative z-10 mx-auto max-w-5xl text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-xs font-medium text-muted-foreground"
          >
            <span className="flex h-2 w-2 rounded-full bg-primary pulse-glow" />
            Now with AI-powered performance reports for every candidate
          </motion.div>

          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl lg:text-8xl">
            <motion.span
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="block"
            >
              Hire with
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="block text-gradient-primary text-glow"
            >
              evidence,
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="block"
            >
              not guesswork.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground sm:text-xl"
          >
            Post a job, receive thousands of applications, and run candidates through a
            configurable pipeline of AI-scored rounds. Every applicant — pass or fail —
            gets a personalized performance report.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.75 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link href="/auth/login">
              <GlowButton size="lg" className="group">
                Start hiring
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </GlowButton>
            </Link>
            <Link href="/auth/signup">
              <GlowButton variant="outline" size="lg">
                See a demo report
              </GlowButton>
            </Link>
          </motion.div>

          {/* Floating stat cards */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {[
              { label: 'Applications processed', value: '2.4M+' },
              { label: 'Avg. time to hire', value: '23 days' },
              { label: 'AI-scored rounds', value: '4 types' },
              { label: 'Candidate satisfaction', value: '94%' },
            ].map((stat, i) => (
              <div key={i} className="glass glass-hover rounded-2xl p-5 text-left">
                <div className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Background glow orbs */}
        <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[120px] float" />
        <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full bg-chart-3/10 blur-[100px] float" style={{ animationDelay: '2s' }} />
      </section>

      {/* ── Feature storytelling ──────────────────────────────────────────── */}
      <FeatureStory />

      {/* ── Feature grid ───────────────────────────────────────────────────── */}
      <section className="relative px-6 py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-16 text-center">
            <span className="text-sm font-medium uppercase tracking-widest text-primary">Everything included</span>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              From job post to candidate report
            </h2>
          </Reveal>

          <Stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Zap, title: 'Configurable pipelines', desc: 'Drag-and-drop rounds: resume screen, aptitude tests, DSA, interviews. Set AI scoring and cutoffs per round.' },
              { icon: BarChart3, title: 'Visual funnel analytics', desc: 'See applied → screened → tested → interviewed → hired at a glance. Spot bottlenecks instantly.' },
              { icon: FileCheck2, title: 'AI match scoring', desc: 'Every resume scored against your JD. AI verdicts per round with full audit trails.' },
              { icon: Users, title: '10,000+ candidates', desc: 'Virtualized tables handle tens of thousands of rows without jank. Bulk actions and live status updates.' },
              { icon: Sparkles, title: 'Performance reports', desc: 'Every candidate — pass or fail — receives a personalized scorecard comparing them to the cohort.' },
              { icon: Shield, title: 'Human-in-the-loop', desc: 'Override any AI decision with a reason. Full audit trail of what the AI saw and decided.' },
            ].map((f, i) => (
              <StaggerItem key={i}>
                <div className="glass glass-hover group h-full rounded-2xl p-7">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 font-display text-xl font-semibold">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Social proof ──────────────────────────────────────────────────── */}
      <SocialProof />

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="relative px-6 py-32">
        <Reveal className="mx-auto max-w-3xl">
          <div className="glass-strong relative overflow-hidden rounded-3xl px-8 py-16 text-center sm:px-16">
            <div className="pointer-events-none absolute -top-20 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-primary/20 blur-[80px]" />
            <h2 className="relative font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Ready to hire with evidence?
            </h2>
            <p className="relative mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Start your first role in minutes. Every candidate gets a report. Every hire has a trail.
            </p>
            <div className="relative mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/signup">
                <GlowButton size="lg" className="group">
                  Get started free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </GlowButton>
              </Link>
              <Link href="/auth/login">
                <GlowButton variant="outline" size="lg">
                  Sign in
                </GlowButton>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <LandingFooter />
    </div>
  );
}

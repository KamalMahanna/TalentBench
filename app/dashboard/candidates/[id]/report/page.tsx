'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Star, TrendingUp, TrendingDown, Award, Target, Lightbulb,
  CheckCircle2, AlertCircle, Share, Download, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { GlowButton } from '@/components/glow-button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Reveal, Stagger, StaggerItem } from '@/components/motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';

export default function PerformanceReportPage() {
  const params = useParams();
  const candidateId = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ['performance-report', candidateId],
    queryFn: () => api.getPerformanceReport(candidateId),
  });

  if (isLoading) return <Skeleton className="h-screen rounded-2xl" />;

  const report = data?.data;
  if (!report) return <div>Report not found</div>;

  const outcomeColor = report.outcome === 'passed' ? 'text-success' : report.outcome === 'shortlisted' ? 'text-primary' : 'text-destructive';
  const outcomeBg = report.outcome === 'passed' ? 'bg-success/10' : report.outcome === 'shortlisted' ? 'bg-primary/10' : 'bg-destructive/10';

  return (
    <div className="mesh-bg noise relative min-h-screen">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/4 top-0 h-96 w-96 rounded-full bg-primary/10 blur-[120px] float" />
      <div className="pointer-events-none absolute right-1/4 bottom-0 h-80 w-80 rounded-full bg-chart-3/10 blur-[100px] float" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        {/* Top bar */}
        <div className="mb-8 flex items-center justify-between">
          <Link href={`/dashboard/candidates/${candidateId}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-3">
            <GlowButton variant="outline" size="sm">
              <Share className="h-4 w-4" /> Share
            </GlowButton>
            <GlowButton size="sm">
              <Download className="h-4 w-4" /> Download PDF
            </GlowButton>
          </div>
        </div>

        {/* Hero scorecard */}
        <Reveal>
          <div className="glass-strong relative overflow-hidden rounded-3xl p-8 text-center sm:p-12">
            <div className="pointer-events-none absolute -top-20 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-primary/20 blur-[80px]" />

            <div className={cn('relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium', outcomeBg, outcomeColor)}>
              {report.outcome === 'passed' ? <Award className="h-4 w-4" /> : <Target className="h-4 w-4" />}
              {report.outcome === 'passed' ? 'Passed' : report.outcome === 'shortlisted' ? 'Shortlisted' : 'Not Selected'}
            </div>

            <h1 className="relative mt-6 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              {report.candidate_name}
            </h1>
            <p className="relative mt-2 text-lg text-muted-foreground">
              Performance Report · {report.role_title}
            </p>

            {/* Percentile */}
            <div className="relative mt-8">
              <div className="font-display text-6xl font-bold text-gradient-primary sm:text-7xl">
                {report.overall_percentile}
                <span className="text-2xl text-muted-foreground">th</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">percentile among all candidates</p>
            </div>

            <div className="relative mt-6 text-xs text-muted-foreground">
              Generated on {new Date(report.generated_at).toLocaleDateString('en-US', { dateStyle: 'long' })} · {report.company_name}
            </div>
          </div>
        </Reveal>

        {/* Radar chart */}
        <Reveal delay={0.1}>
          <div className="glass mt-6 rounded-3xl p-8">
            <h2 className="mb-2 font-display text-xl font-semibold">Multi-dimensional Comparison</h2>
            <p className="mb-6 text-sm text-muted-foreground">Your scores vs. the shortlisted cohort benchmark</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={report.radar_scores}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <Radar name="You" dataKey="candidate" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} strokeWidth={2} />
                  <Radar name="Benchmark" dataKey="benchmark" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.15} strokeWidth={2} strokeDasharray="4 4" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-center gap-6 text-sm">
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-primary" /> You</span>
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-accent" /> Benchmark</span>
            </div>
          </div>
        </Reveal>

        {/* Resume match */}
        <Reveal delay={0.1}>
          <div className="glass mt-6 rounded-3xl p-8">
            <h2 className="mb-2 flex items-center gap-2 font-display text-xl font-semibold">
              <Star className="h-5 w-5 text-primary" /> Resume Match vs Job Description
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">How your skills align with the role requirements</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.resume_match} layout="vertical" margin={{ left: 80, right: 20 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis type="category" dataKey="skill" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} width={80} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                  <Bar dataKey="candidate_score" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} name="Your Score" />
                  <Bar dataKey="benchmark_score" fill="hsl(var(--accent))" radius={[0, 6, 6, 0]} name="Benchmark" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Reveal>

        {/* Aptitude + Communication */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="glass h-full rounded-3xl p-8">
              <h2 className="mb-2 font-display text-lg font-semibold">Aptitude Breakdown</h2>
              <p className="mb-4 text-xs text-muted-foreground">Category-level reasoning scores</p>
              <div className="space-y-3">
                {report.aptitude_breakdown.map((cat) => {
                  const diff = cat.candidate_score - cat.benchmark_score;
                  return (
                    <div key={cat.category}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span>{cat.category}</span>
                        <span className={cn('flex items-center gap-1 text-xs', diff >= 0 ? 'text-success' : 'text-destructive')}>
                          {diff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {cat.candidate_score} vs {cat.benchmark_score}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary to-chart-4" style={{ width: `${cat.candidate_score}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="glass h-full rounded-3xl p-8">
              <h2 className="mb-2 font-display text-lg font-semibold">Communication Rubric</h2>
              <p className="mb-4 text-xs text-muted-foreground">Interview evaluation scores</p>
              <div className="space-y-3">
                {report.communication_rubric.map((cat) => {
                  const diff = cat.candidate_score - cat.benchmark_score;
                  return (
                    <div key={cat.category}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span>{cat.category}</span>
                        <span className={cn('flex items-center gap-1 text-xs', diff >= 0 ? 'text-success' : 'text-destructive')}>
                          {diff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {cat.candidate_score} vs {cat.benchmark_score}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-gradient-to-r from-chart-3 to-accent" style={{ width: `${cat.candidate_score}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </div>

        {/* AI Feedback */}
        <Reveal delay={0.1}>
          <div className="glass-strong mt-6 rounded-3xl p-8">
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
              <Lightbulb className="h-5 w-5 text-accent" /> AI-Generated Feedback
            </h2>
            <p className="text-sm leading-relaxed text-foreground/90">{report.ai_feedback}</p>
          </div>
        </Reveal>

        {/* Strengths + Improvements */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="glass h-full rounded-3xl p-8">
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-success">
                <CheckCircle2 className="h-5 w-5" /> Your Strengths
              </h2>
              <Stagger className="space-y-3">
                {report.strengths.map((s, i) => (
                  <StaggerItem key={i}>
                    <div className="flex items-start gap-3 rounded-xl bg-success/5 p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span className="text-sm">{s}</span>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </Reveal>

          <Reveal>
            <div className="glass h-full rounded-3xl p-8">
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-accent">
                <AlertCircle className="h-5 w-5" /> Areas to Improve
              </h2>
              <Stagger className="space-y-3">
                {report.improvement_areas.map((s, i) => (
                  <StaggerItem key={i}>
                    <div className="flex items-start gap-3 rounded-xl bg-accent/5 p-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span className="text-sm">{s}</span>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </Reveal>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-muted-foreground">
          <p>This report was generated by TalentBench AI. Scores are comparative, not absolute.</p>
          <p className="mt-1">© 2026 TalentBench · {report.company_name}</p>
        </div>
      </div>
    </div>
  );
}

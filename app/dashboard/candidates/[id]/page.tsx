'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, Mail, Phone, MapPin, Briefcase, GraduationCap, FileText,
  CheckCircle2, XCircle, Clock, Zap, Shield, History, Edit3, AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { GlowButton } from '@/components/glow-button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Reveal, Stagger, StaggerItem } from '@/components/motion';
import type { RoundResult, AuditLog } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const rawId = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const candidateId = decodeURIComponent(rawId || '');

  const { data: candidateData, isLoading } = useQuery({
    queryKey: ['candidate', candidateId],
    queryFn: () => api.getCandidate(candidateId),
  });
  const { data: auditData } = useQuery({
    queryKey: ['audit', candidateId],
    queryFn: () => api.getAuditLog(candidateId),
  });

  const [overrideTarget, setOverrideTarget] = useState<RoundResult | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<'passed' | 'failed'>('passed');
  const [overrideReason, setOverrideReason] = useState('');
  const [overriding, setOverriding] = useState(false);

  async function handleOverride() {
    if (!overrideTarget) return;
    setOverriding(true);
    try {
      await api.overrideDecision(candidateId, overrideTarget.round_id, overrideStatus, overrideReason);
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['audit', candidateId] });
      toast.success(`Decision overridden to ${overrideStatus}`);
      setOverrideTarget(null);
      setOverrideReason('');
    } catch {
      toast.error('Failed to override decision');
    } finally {
      setOverriding(false);
    }
  }

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;

  const candidate = candidateData?.data;
  if (!candidate) return <div>Candidate not found</div>;

  const auditLogs = auditData?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <Link href={`/dashboard/roles/${candidate.role_id}/candidates`} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to candidates
      </Link>

      {/* Header */}
      <Reveal className="mb-6">
        <div className="glass-strong rounded-2xl p-6">
          <div className="flex flex-col gap-6 sm:flex-row">
            {/* Left: avatar + info */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-primary/30">
                <AvatarImage src={candidate.avatar_url} alt={candidate.name} />
                <AvatarFallback>{candidate.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight">{candidate.name}</h1>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {candidate.email}</span>
                  <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {candidate.phone}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {candidate.location}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {candidate.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                </div>
              </div>
            </div>

            {/* Right: scores */}
            <div className="flex gap-4 sm:ml-auto">
              <div className="glass rounded-2xl p-4 text-center">
                <div className="text-xs text-muted-foreground">AI Match</div>
                <div className={cn(
                  'mt-1 font-display text-3xl font-bold',
                  candidate.ai_match_score >= 75 ? 'text-success' : candidate.ai_match_score >= 50 ? 'text-accent' : 'text-destructive',
                )}>
                  {candidate.ai_match_score}
                </div>
              </div>
              <div className="glass rounded-2xl p-4 text-center">
                <div className="text-xs text-muted-foreground">Overall</div>
                <div className={cn(
                  'mt-1 font-display text-3xl font-bold',
                  candidate.overall_score >= 75 ? 'text-success' : candidate.overall_score >= 50 ? 'text-accent' : 'text-destructive',
                )}>
                  {candidate.overall_score}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Resume + background */}
        <div className="space-y-6 lg:col-span-1">
          <Reveal>
            <div className="glass rounded-2xl p-6">
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
                <FileText className="h-5 w-5 text-primary" /> Resume Preview
              </h2>
              <div className="space-y-4 text-sm">
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Briefcase className="h-4 w-4" /> Experience</div>
                  <p className="mt-1">{candidate.experience_years} years at {candidate.current_company}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground"><GraduationCap className="h-4 w-4" /> Education</div>
                  <p className="mt-1">{candidate.education}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground"><FileText className="h-4 w-4" /> Projects</div>
                  <div className="mt-1 space-y-1">
                    {candidate.projects.map((p) => <p key={p} className="text-sm">• {p}</p>)}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Right: Round history + audit */}
        <div className="space-y-6 lg:col-span-2">
          {/* Round-by-round history */}
          <Reveal>
            <div className="glass rounded-2xl p-6">
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
                <Zap className="h-5 w-5 text-primary" /> Round History & AI Verdicts
              </h2>
              {candidate.round_results.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rounds evaluated yet.</p>
              ) : (
                <Stagger className="space-y-3">
                  {candidate.round_results.map((result) => (
                    <StaggerItem key={result.id}>
                      <div className={cn(
                        'rounded-xl border p-4 transition-colors',
                        result.status === 'passed' ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5',
                      )}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {result.status === 'passed' ? (
                              <CheckCircle2 className="h-5 w-5 text-success" />
                            ) : (
                              <XCircle className="h-5 w-5 text-destructive" />
                            )}
                            <div>
                              <div className="font-medium">{result.round_name}</div>
                              <div className="text-xs text-muted-foreground">
                                Score: {result.score}/100 · Cutoff: {candidate.round_results[0] ? '65' : '—'}%
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {result.overridden && (
                              <Badge variant="secondary" className="gap-1">
                                <Edit3 className="h-3 w-3" /> Overridden
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setOverrideTarget(result);
                                setOverrideStatus(result.status === 'passed' ? 'failed' : 'passed');
                              }}
                            >
                              Override
                            </Button>
                          </div>
                        </div>
                        {/* AI verdict */}
                        <div className="mt-3 rounded-lg bg-background-elevated p-3">
                          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
                            <Shield className="h-3.5 w-3.5" /> AI Verdict
                          </div>
                          <p className="text-sm text-foreground/90">{result.ai_verdict}</p>
                        </div>
                        {result.overridden && result.override_reason && (
                          <div className="mt-2 rounded-lg bg-accent/5 p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-accent">
                              <AlertCircle className="h-3.5 w-3.5" /> Override Reason
                            </div>
                            <p className="text-sm text-foreground/90">{result.override_reason}</p>
                          </div>
                        )}
                      </div>
                    </StaggerItem>
                  ))}
                </Stagger>
              )}
            </div>
          </Reveal>

          {/* Audit trail */}
          <Reveal>
            <div className="glass rounded-2xl p-6">
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
                <History className="h-5 w-5 text-primary" /> Audit Trail
              </h2>
              <div className="space-y-3">
                {auditLogs.map((log: AuditLog) => (
                  <div key={log.id} className="flex items-start gap-3 border-l-2 border-border pl-4">
                    <div className={cn(
                      'mt-1 h-2 w-2 shrink-0 rounded-full',
                      log.actor_type === 'ai' ? 'bg-primary' : log.actor_type === 'recruiter' ? 'bg-accent' : 'bg-muted-foreground',
                    )} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{log.action}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{log.detail}</p>
                      <span className="text-xs text-muted-foreground">by {log.actor}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Override dialog */}
      <Dialog open={!!overrideTarget} onOpenChange={(open) => !open && setOverrideTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override AI Decision</DialogTitle>
            <DialogDescription>
              Override the AI verdict for {overrideTarget?.round_name}. This will be logged in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New decision</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOverrideStatus('passed')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all',
                    overrideStatus === 'passed' ? 'border-success bg-success/10 text-success' : 'border-border hover:border-success/40',
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" /> Pass
                </button>
                <button
                  onClick={() => setOverrideStatus('failed')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all',
                    overrideStatus === 'failed' ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border hover:border-destructive/40',
                  )}
                >
                  <XCircle className="h-4 w-4" /> Fail
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Explain why you're overriding the AI decision..."
                className="bg-background-elevated"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideTarget(null)}>Cancel</Button>
            <GlowButton onClick={handleOverride} disabled={overriding || !overrideReason}>
              {overriding ? 'Overriding...' : 'Confirm override'}
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlowButton } from '@/components/glow-button';
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Sparkles,
  Terminal,
  Pause,
  ArrowDown,
  Trash2,
  Users,
  ChevronRight,
  ExternalLink,
  Bot,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, subscribeToLiveUpdates } from '@/lib/api-client';
import type { Round, RoundWorkflowState, AgentWorkflowLog, LiveUpdateEvent } from '@/lib/types';
import { cn } from '@/lib/utils';

interface RoundWorkflowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleId: string;
  round: Round | null;
  onWorkflowComplete?: () => void;
}

const WORKFLOW_STAGES = [
  { id: 1, name: 'Candidate Discovery', desc: 'Pool & criteria setup' },
  { id: 2, name: 'Skills & Experience', desc: 'JD competency matching' },
  { id: 3, name: 'Top 10 Benchmark', desc: 'Tournament synthesis' },
  { id: 4, name: 'Comparative Scoring', desc: 'Engineering depth ranking' },
  { id: 5, name: 'Cutoff & Notifications', desc: 'Rejection email generation' },
  { id: 6, name: 'Round Advancement', desc: 'Promote qualified candidates' },
];

export function RoundWorkflowModal({
  open,
  onOpenChange,
  roleId,
  round,
  onWorkflowComplete,
}: RoundWorkflowModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [state, setState] = useState<RoundWorkflowState | null>(null);
  const [logs, setLogs] = useState<AgentWorkflowLog[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Poll or fetch initial status on open
  useEffect(() => {
    if (!open || !round) return;

    let mounted = true;
    api.getRoundWorkflowStatus(roleId, round.id).then((res) => {
      if (!mounted) return;
      const data = res.data;
      setState(data);
      if (data.logs && data.logs.length > 0) {
        setLogs(data.logs);
      }
      setIsRunning(data.status === 'running');
    });

    return () => {
      mounted = false;
    };
  }, [open, roleId, round]);

  // Subscribe to real-time Server-Sent Events (SSE)
  useEffect(() => {
    if (!open || !round) return;

    const unsubscribe = subscribeToLiveUpdates(roleId, (evt: LiveUpdateEvent) => {
      if (evt.type === 'agent_workflow_event' && evt.payload) {
        const payload = evt.payload;
        if (payload.round_id === round.id) {
          if (!isPaused && payload.log) {
            setLogs((prev) => [...prev, payload.log!]);
          }

          setState((prev) => {
            const currentStats = prev?.stats || { total: 0, processed: 0, advanced: 0, disqualified: 0 };
            return {
              role_id: roleId,
              round_id: round.id,
              status: 'running',
              current_step: payload.current_step || prev?.current_step || 1,
              total_steps: payload.total_steps || 6,
              step_name: payload.step_name || prev?.step_name || 'Processing',
              logs: [],
              stats: {
                ...currentStats,
                ...(payload.stats || {}),
              },
            };
          });
          setIsRunning(true);
        }
      } else if (evt.type === 'workflow_completed' && evt.payload) {
        if (evt.payload.round_id === round.id) {
          setIsRunning(false);
          setState((prev) => prev ? { ...prev, status: 'completed', current_step: 6 } : null);
          onWorkflowComplete?.();
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [open, roleId, round, isPaused, onWorkflowComplete]);

  // Auto-scroll terminal
  useEffect(() => {
    if (autoScroll && !isPaused && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, isPaused]);

  async function handleStartWorkflow() {
    if (!round) return;
    setIsRunning(true);
    setLogs([]);
    setState({
      role_id: roleId,
      round_id: round.id,
      status: 'running',
      current_step: 1,
      total_steps: 6,
      step_name: 'Starting workflow...',
      logs: [],
      stats: { total: 0, processed: 0, advanced: 0, disqualified: 0 },
    });

    try {
      await api.startRoundWorkflow(roleId, round.id);
    } catch {
      setIsRunning(false);
    }
  }

  async function handleResetWorkflow() {
    if (!round) return;
    try {
      await api.resetRoundWorkflow(roleId, round.id);
      setIsRunning(false);
      setLogs([]);
      setState({
        role_id: roleId,
        round_id: round.id,
        status: 'idle',
        current_step: 0,
        total_steps: 6,
        step_name: 'Ready to run',
        logs: [],
        stats: { total: stats.total || 20, processed: 0, advanced: 0, disqualified: 0 },
      });
      toast.success('Workflow reset! All candidates returned to applied state.');
      onWorkflowComplete?.();
    } catch {
      toast.error('Failed to reset workflow');
    }
  }

  if (!round) return null;

  const currentStep = state?.current_step || (state?.status === 'completed' ? 6 : 0);
  const stats = state?.stats || { total: 0, processed: 0, advanced: 0, disqualified: 0 };

  const tagColor = (tag: string) => {
    if (tag.includes('INIT')) return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    if (tag.includes('INGEST')) return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    if (tag.includes('THOUGHT')) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    if (tag.includes('ANALYSIS')) return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    if (tag.includes('BENCHMARK')) return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    if (tag.includes('RANK')) return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
    if (tag.includes('ADVANCE')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (tag.includes('MAIL')) return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
    if (tag.includes('COMPLETE')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (tag.includes('WARN') || tag.includes('ERROR')) return 'bg-red-500/10 text-red-400 border-red-500/30';
    return 'bg-secondary text-muted-foreground border-border';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-6 gap-0 bg-background-elevated border-border">
        <DialogHeader className="pb-4 border-b border-border/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/25">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                  <span>Round Workflow: {round.name}</span>
                  {isRunning ? (
                    <Badge variant="outline" className="text-xs border-primary text-primary animate-pulse">
                      Running Stage {currentStep}/6
                    </Badge>
                  ) : state?.status === 'completed' ? (
                    <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs py-0.5">
                      Ready to Run
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Autonomous agent pipeline evaluating candidates, synthesizing benchmarks, and managing round advancement.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[11px] text-muted-foreground gap-1">
                <Zap className="h-3 w-3 text-amber-400" /> OmniRoute / Qwen-27B
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetWorkflow}
                disabled={isRunning}
                className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                title="Reset candidates to initial applied state to re-demonstrate"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
              <GlowButton
                size="sm"
                onClick={handleStartWorkflow}
                disabled={isRunning}
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                {isRunning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
                {isRunning ? 'Agent Processing...' : state?.status === 'completed' ? 'Re-run Workflow' : 'Start Workflow'}
              </GlowButton>
            </div>
          </div>
        </DialogHeader>

        {/* ── Multi-Stage Pipeline Progress Tracker ────────────────────────── */}
        <div className="py-3 border-b border-border/30 bg-muted/20 -mx-6 px-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="font-medium text-foreground">
              {isRunning
                ? `Stage ${currentStep} of 6: ${state?.step_name || 'Processing'}`
                : state?.status === 'completed'
                ? 'All 6 Stages Successfully Completed'
                : 'Pipeline Stages (Ready)'}
            </span>
            <span className="font-mono text-[11px]">
              {isRunning ? `${Math.round((currentStep / 6) * 100)}% Complete` : state?.status === 'completed' ? '100%' : '0%'}
            </span>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {WORKFLOW_STAGES.map((st) => {
              const isDone = currentStep > st.id || state?.status === 'completed';
              const isCurrent = currentStep === st.id && isRunning;
              return (
                <div
                  key={st.id}
                  className={cn(
                    'flex flex-col gap-1 p-2 rounded-lg border text-left transition-all',
                    isDone
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : isCurrent
                      ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/20'
                      : 'border-border/40 bg-background/50 opacity-60'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-semibold text-muted-foreground">
                      0{st.id}
                    </span>
                    {isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : isCurrent ? (
                      <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                    ) : (
                      <Clock className="h-3 w-3 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="text-[11px] font-medium truncate text-foreground leading-tight">
                    {st.name}
                  </div>
                  <div className="text-[9px] text-muted-foreground truncate">
                    {st.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── KPI Counter Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3 py-3">
          <div className="rounded-xl border border-border/50 bg-background p-2.5">
            <div className="text-[11px] text-muted-foreground font-medium">Candidates in Pool</div>
            <div className="text-lg font-bold mt-0.5">{stats.total || 0}</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-background p-2.5">
            <div className="text-[11px] text-muted-foreground font-medium">Processed</div>
            <div className="text-lg font-bold mt-0.5">{stats.processed || 0}</div>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5">
            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Advanced
            </div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{stats.advanced || 0}</div>
          </div>
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-2.5">
            <div className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Disqualified
            </div>
            <div className="text-lg font-bold text-rose-400 mt-0.5">{stats.disqualified || 0}</div>
          </div>
        </div>

        {/* ── Live Agent Thought Stream / Terminal ─────────────────────────── */}
        <div className="flex-1 min-h-[260px] flex flex-col rounded-xl border border-border bg-[#0B0F17] overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/40 bg-black/40 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
              </div>
              <span className="font-mono text-muted-foreground text-[11px] ml-1 flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-primary" />
                agent-thought-stream://{roleId.slice(0, 8)}/{round.id.slice(0, 8)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted/40 transition-colors"
              >
                {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                type="button"
                onClick={() => setAutoScroll(!autoScroll)}
                className={cn(
                  'text-[11px] flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors',
                  autoScroll ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <ArrowDown className="h-3 w-3" />
                Auto-scroll
              </button>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="text-[11px] text-muted-foreground hover:text-rose-400 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted/40 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 p-3.5 font-mono text-xs overflow-y-auto space-y-1.5 leading-relaxed selection:bg-primary/30">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground/60 p-6">
                <Bot className="h-8 w-8 mb-2 stroke-1 opacity-50" />
                <p>Agent thought stream is idle.</p>
                <p className="text-[11px]">Click &quot;Start Workflow&quot; above to launch autonomous evaluation.</p>
              </div>
            ) : (
              logs.map((item) => (
                <div key={item.id} className="flex items-start gap-2 group hover:bg-white/[0.02] p-0.5 rounded">
                  <span className="text-[10px] text-muted-foreground/50 shrink-0 select-none font-mono">
                    [{item.timestamp}]
                  </span>
                  <span
                    className={cn(
                      'text-[9px] px-1.5 py-0.2 rounded border font-semibold shrink-0 uppercase tracking-wide',
                      tagColor(item.tag)
                    )}
                  >
                    {item.tag}
                  </span>
                  <span className="text-foreground/90 break-words flex-1">
                    {item.message}
                  </span>
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="pt-4 border-t border-border/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/roles/${roleId}/candidates`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5" />
                Open Candidate Workspace
                <ExternalLink className="h-3 w-3 ml-0.5 opacity-60" />
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close Console
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


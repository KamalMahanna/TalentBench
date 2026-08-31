'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, Search, Filter, Download, CheckCircle2, XCircle,
  Clock, AlertCircle, Wifi, WifiOff, Mail, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { api, subscribeToLiveUpdates } from '@/lib/api-client';
import { GlowButton } from '@/components/glow-button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { Candidate, CandidateStatus, LiveUpdateEvent } from '@/lib/types';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<CandidateStatus, { label: string; color: string; icon: typeof Clock }> = {
  applied: { label: 'Applied', color: 'bg-chart-4/20 text-chart-4 border-chart-4/30', icon: Clock },
  screened: { label: 'Screened', color: 'bg-chart-1/20 text-chart-1 border-chart-1/30', icon: Filter },
  tested: { label: 'Tested', color: 'bg-chart-3/20 text-chart-3 border-chart-3/30', icon: AlertCircle },
  interviewed: { label: 'Interviewed', color: 'bg-accent/20 text-accent border-accent/30', icon: Mail },
  hired: { label: 'Hired', color: 'bg-success/20 text-success border-success/30', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-destructive/20 text-destructive border-destructive/30', icon: XCircle },
};

const PAGE_SIZE = 50;
const ROW_HEIGHT = 64;

export default function CandidateListPage() {
  const params = useParams();
  const roleId = params.id as string;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sort, setSort] = useState<string>('recent');
  const [page, setPage] = useState(1);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState<string[]>([]);

  const { data: roleData } = useQuery({
    queryKey: ['role', roleId],
    queryFn: () => api.getRole(roleId),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['candidates', roleId, page, search, statusFilter, sort],
    queryFn: () => api.getCandidates(roleId, { page, page_size: PAGE_SIZE, search, status: statusFilter, sort }),
  });

  // Accumulate candidates across pages
  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setAllCandidates(data.data);
      } else {
        setAllCandidates((prev) => {
          const ids = new Set(prev.map((c) => c.id));
          const newOnes = data.data.filter((c) => !ids.has(c.id));
          return [...prev, ...newOnes];
        });
      }
      setTotal(data.total);
    }
  }, [data, page]);

  // Reset on filter change
  useEffect(() => {
    setPage(1);
    setAllCandidates([]);
  }, [search, statusFilter, sort]);

  // Live updates
  useEffect(() => {
    const unsubscribe = subscribeToLiveUpdates(
      roleId,
      (event: LiveUpdateEvent) => {
        setLiveConnected(true);
        if (event.payload.message) {
          setLiveEvents((prev) => [event.payload.message!, ...prev].slice(0, 5));
          toast.info(event.payload.message, { duration: 3000 });
        }
      },
      () => setLiveConnected(false),
    );
    return unsubscribe;
  }, [roleId]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === allCandidates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allCandidates.map((c) => c.id)));
    }
  }

  const role = roleData?.data;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/dashboard/roles/${roleId}`} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to pipeline
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Candidates</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {role?.title} · {total.toLocaleString()} total
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn('flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium', liveConnected ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>
              {liveConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {liveConnected ? 'Live' : 'Connecting...'}
            </div>
            <Link href={`/dashboard/upload?role=${roleId}`}>
              <GlowButton variant="outline">
                <Download className="h-4 w-4" /> Bulk upload
              </GlowButton>
            </Link>
          </div>
        </div>
      </div>

      {/* Live event ticker */}
      <AnimatePresence>
        {liveEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="glass rounded-xl p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex h-2 w-2 rounded-full bg-success pulse-glow" />
                {liveEvents[0]}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or skill..."
            className="bg-background-elevated pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full bg-background-elevated sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="screened">Screened</SelectItem>
            <SelectItem value="tested">Tested</SelectItem>
            <SelectItem value="interviewed">Interviewed</SelectItem>
            <SelectItem value="hired">Hired</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-full bg-background-elevated sm:w-40">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most recent</SelectItem>
            <SelectItem value="score_desc">Score: High to Low</SelectItem>
            <SelectItem value="score_asc">Score: Low to High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3"
          >
            <span className="text-sm font-medium text-primary">{selected.size} selected</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">Export</Button>
              <Button variant="ghost" size="sm">Email</Button>
              <Button variant="ghost" size="sm" className="text-destructive">Reject</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="glass overflow-hidden rounded-2xl">
        {/* Header row */}
        <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3 text-xs font-medium text-muted-foreground">
          <Checkbox checked={selected.size === allCandidates.length && allCandidates.length > 0} onChange={toggleSelectAll} />
          <span className="w-10">Score</span>
          <span className="flex-1">Candidate</span>
          <span className="hidden w-32 md:block">Experience</span>
          <span className="hidden w-40 lg:block">Skills</span>
          <span className="w-28 text-right">Status</span>
          <span className="w-8" />
        </div>

        {/* Rows */}
        {isLoading && page === 1 ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {allCandidates.map((candidate) => {
              const config = STATUS_CONFIG[candidate.status];
              return (
                <Link key={candidate.id} href={`/dashboard/candidates/${candidate.id}`}>
                  <motion.div
                    layout
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-accent/5',
                      selected.has(candidate.id) && 'bg-primary/5',
                    )}
                    onClick={(e) => { if (e.target === e.currentTarget) {} }}
                  >
                    <div onClick={(e) => { e.preventDefault(); toggleSelect(candidate.id); }}>
                      <Checkbox checked={selected.has(candidate.id)} onChange={() => toggleSelect(candidate.id)} />
                    </div>
                    {/* Score */}
                    <div className="w-10">
                      <div className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold',
                        candidate.overall_score >= 75 ? 'bg-success/15 text-success' :
                        candidate.overall_score >= 50 ? 'bg-accent/15 text-accent' :
                        'bg-destructive/15 text-destructive',
                      )}>
                        {candidate.overall_score}
                      </div>
                    </div>
                    {/* Candidate */}
                    <div className="flex flex-1 items-center gap-3 min-w-0">
                      <img src={candidate.avatar_url} alt={candidate.name} className="h-9 w-9 shrink-0 rounded-full" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{candidate.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{candidate.email}</div>
                      </div>
                    </div>
                    {/* Experience */}
                    <div className="hidden w-32 text-sm text-muted-foreground md:block">
                      {candidate.experience_years}y · {candidate.current_company}
                    </div>
                    {/* Skills */}
                    <div className="hidden w-40 items-center gap-1 lg:flex">
                      {candidate.skills.slice(0, 2).map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                      {candidate.skills.length > 2 && <span className="text-xs text-muted-foreground">+{candidate.skills.length - 2}</span>}
                    </div>
                    {/* Status */}
                    <div className="flex w-28 justify-end">
                      <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium', config.color)}>
                        <config.icon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </div>
                    <div className="w-8 text-right">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {data?.has_more && (
          <div className="flex items-center justify-center border-t border-border/50 p-4">
            <GlowButton variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={isFetching}>
              {isFetching ? <span className="animate-pulse">Loading...</span> : 'Load more'}
            </GlowButton>
          </div>
        )}
      </div>
    </div>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/50',
      )}
    >
      {checked && <CheckCircle2 className="h-3.5 w-3.5" />}
    </button>
  );
}

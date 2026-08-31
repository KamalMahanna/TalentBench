'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Briefcase, TrendingUp, Clock, DollarSign, Users, ArrowRight, Plus, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import { GlowButton } from '@/components/glow-button';
import { Reveal, Stagger, StaggerItem } from '@/components/motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { Role, DashboardStats, FunnelStage } from '@/lib/types';
import { cn } from '@/lib/utils';

const STAGE_COLORS: Record<string, string> = {
  applied: 'from-chart-4/80 to-chart-4/40',
  screened: 'from-chart-1/80 to-chart-1/40',
  tested: 'from-chart-3/80 to-chart-3/40',
  interviewed: 'from-accent/80 to-accent/40',
  hired: 'from-success/80 to-success/40',
  rejected: 'from-destructive/60 to-destructive/30',
};

const STAGE_ORDER = ['applied', 'screened', 'tested', 'interviewed', 'hired'] as const;

export default function DashboardHome() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getDashboardStats(),
  });
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.getRoles(),
  });

  const roles = rolesData?.data ?? [];

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back. Here&apos;s your hiring overview.</p>
        </div>
        <Link href="/dashboard/roles">
          <GlowButton>
            <Plus className="h-4 w-4" />
            New Role
          </GlowButton>
        </Link>
      </div>

      {/* Stats grid */}
      <Stagger className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Briefcase, label: 'Active Roles', value: stats?.data.active_roles, loading: statsLoading, color: 'text-primary' },
          { icon: Users, label: 'Total Candidates', value: stats?.data.total_candidates?.toLocaleString(), loading: statsLoading, color: 'text-chart-4' },
          { icon: TrendingUp, label: 'Hired This Month', value: stats?.data.hired_this_month, loading: statsLoading, color: 'text-success' },
          { icon: Clock, label: 'Avg Time to Hire', value: stats?.data.avg_time_to_hire_days ? `${stats.data.avg_time_to_hire_days}d` : undefined, loading: statsLoading, color: 'text-accent' },
        ].map((stat, i) => (
          <StaggerItem key={i}>
            <div className="glass glass-hover rounded-2xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-current/10', stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              {stat.loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="font-display text-2xl font-bold">{stat.value}</div>
              )}
              <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      {/* Active roles */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Active Roles</h2>
        <Link href="/dashboard/roles" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          View all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {rolesLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.filter((r) => r.status === 'active').map((role) => (
            <StaggerItem key={role.id}>
              <RoleCard role={role} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}

function RoleCard({ role }: { role: Role }) {
  // Simulate funnel data from applicant count
  const total = role.applicant_count;
  const funnel: FunnelStage[] = STAGE_ORDER.map((stage, i) => {
    const factor = [1, 0.45, 0.25, 0.12, 0.05][i];
    return { stage, count: Math.round(total * factor) };
  });

  return (
    <Link href={`/dashboard/roles/${role.id}`}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="glass glass-hover group h-full rounded-2xl p-6"
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg font-bold leading-tight">{role.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{role.department} · {role.location}</p>
          </div>
          <Badge variant={role.status === 'active' ? 'default' : 'secondary'} className="shrink-0">
            {role.status}
          </Badge>
        </div>

        {/* Applicant count */}
        <div className="mb-5 flex items-baseline gap-2">
          <span className="font-display text-3xl font-bold">{total.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">applicants</span>
        </div>

        {/* Funnel visualization */}
        <div className="space-y-1.5">
          {funnel.map((stage, i) => {
            const pct = total > 0 ? (stage.count / total) * 100 : 0;
            return (
              <div key={stage.stage} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs capitalize text-muted-foreground">{stage.stage}</span>
                <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-muted/50">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className={cn('h-full rounded-md bg-gradient-to-r', STAGE_COLORS[stage.stage])}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums">{stage.count.toLocaleString()}</span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
          <span className="text-xs text-muted-foreground">{role.rounds.length} rounds configured</span>
          <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            View pipeline <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

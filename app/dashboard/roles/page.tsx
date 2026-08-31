'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Briefcase, MapPin, Users, MoreVertical, Trash2, Copy } from 'lucide-react';
import { api } from '@/lib/api-client';
import { GlowButton } from '@/components/glow-button';
import { Stagger, StaggerItem } from '@/components/motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Role } from '@/lib/types';

export default function RolesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.getRoles(),
  });

  async function handleDelete(id: string) {
    await api.deleteRole(id);
    queryClient.invalidateQueries({ queryKey: ['roles'] });
    toast.success('Role deleted');
  }

  async function handleCreate() {
    const res = await api.createRole({ title: 'Untitled Role', department: 'Engineering', status: 'draft' });
    toast.success('Role created');
    window.location.href = `/dashboard/roles/${res.data.id}`;
  }

  const roles = data?.data ?? [];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your open positions and pipelines</p>
        </div>
        <GlowButton onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          New Role
        </GlowButton>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <StaggerItem key={role.id}>
              <RoleListCard role={role} onDelete={handleDelete} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}

function RoleListCard({ role, onDelete }: { role: Role; onDelete: (id: string) => void }) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
      <div className="glass glass-hover group h-full rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <Link href={`/dashboard/roles/${role.id}`} className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Briefcase className="h-5 w-5" />
              </div>
            </div>
            <h3 className="font-display text-lg font-bold leading-tight">{role.title}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {role.location}</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {role.applicant_count.toLocaleString()}</span>
            </div>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Copy className="mr-2 h-4 w-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(role.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
          <Badge variant={role.status === 'active' ? 'default' : 'secondary'}>{role.status}</Badge>
          <span className="text-xs text-muted-foreground">{role.rounds.length} rounds</span>
        </div>
      </div>
    </motion.div>
  );
}

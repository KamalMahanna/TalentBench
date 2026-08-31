'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Briefcase, Users, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Stagger, StaggerItem } from '@/components/motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function AllCandidatesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.getRoles(),
  });

  const roles = data?.data ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">All Candidates</h1>
        <p className="mt-1 text-sm text-muted-foreground">Browse candidates across all roles</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : (
        <Stagger className="space-y-3">
          {roles.map((role) => (
            <StaggerItem key={role.id}>
              <Link href={`/dashboard/roles/${role.id}/candidates`}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className="glass glass-hover flex items-center gap-4 rounded-2xl p-5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold">{role.title}</h3>
                    <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {role.applicant_count.toLocaleString()} candidates</span>
                      <span>·</span>
                      <Badge variant={role.status === 'active' ? 'default' : 'secondary'}>{role.status}</Badge>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </motion.div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}

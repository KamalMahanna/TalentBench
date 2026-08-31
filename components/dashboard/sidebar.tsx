'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Layers, LayoutDashboard, Briefcase, Users, Upload, Settings, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/roles', label: 'Roles', icon: Briefcase },
  { href: '/dashboard/candidates', label: 'Candidates', icon: Users },
  { href: '/dashboard/upload', label: 'Bulk Upload', icon: Upload },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile overlay handled by topbar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r border-border/50 transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <div className="glass-strong flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between p-4">
            <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Layers className="h-5 w-5" />
              </div>
              {!collapsed && <span className="font-display text-lg font-bold tracking-tight">TalentBench</span>}
            </Link>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden rounded-lg p-1.5 text-muted-foreground hover:bg-accent/10 hover:text-foreground lg:block"
            >
              <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {NAV.map((item) => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground',
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                  {active && !collapsed && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 h-8 w-1 rounded-r-full bg-primary"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Upgrade card */}
          {!collapsed && (
            <div className="p-4">
              <div className="glass rounded-2xl p-4">
                <div className="mb-2 text-sm font-semibold">Pro Plan</div>
                <p className="text-xs text-muted-foreground">Unlimited roles, AI scoring, and performance reports.</p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[53%] rounded-full bg-gradient-to-r from-primary to-chart-4" />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">8 of 15 seats used</div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

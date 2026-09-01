'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlowButton } from '@/components/glow-button';
import { ThemeToggle } from '@/components/theme-toggle';

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'fixed left-0 right-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'py-3' : 'py-5',
      )}
    >
      <div className="mx-auto max-w-6xl px-6">
        <div
          className={cn(
            'flex items-center justify-between rounded-2xl px-5 py-3 transition-all duration-300',
            scrolled ? 'glass-strong' : '',
          )}
        >
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">TalentBench</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {['Features', 'How it works', 'Pricing', 'Reports'].map((item) => (
              <Link
                key={item}
                href="#"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/auth/login" className="hidden sm:block">
              <span className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Sign in
              </span>
            </Link>
            <Link href="/auth/signup">
              <GlowButton size="sm" glow={false}>Get started</GlowButton>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

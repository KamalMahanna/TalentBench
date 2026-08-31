'use client';

import { Layers } from 'lucide-react';
import Link from 'next/link';

const LINKS = {
  Product: ['Features', 'Pricing', 'Pipeline Builder', 'Performance Reports', 'Integrations'],
  Company: ['About', 'Careers', 'Blog', 'Press', 'Contact'],
  Resources: ['Documentation', 'API Reference', 'Help Center', 'Community', 'Status'],
  Legal: ['Privacy', 'Terms', 'Security', 'GDPR', 'Cookies'],
};

export function LandingFooter() {
  return (
    <footer className="relative border-t border-border/50 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Layers className="h-5 w-5" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight">TalentBench</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Hire with evidence, not guesswork. Every candidate gets a report. Every hire has a trail.
            </p>
          </div>

          {Object.entries(LINKS).map(([title, items]) => (
            <div key={title}>
              <h4 className="mb-4 text-sm font-semibold">{title}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">© 2026 TalentBench. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">Built for recruiters who care about candidates.</p>
        </div>
      </div>
    </footer>
  );
}

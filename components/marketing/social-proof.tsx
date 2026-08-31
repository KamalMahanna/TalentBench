'use client';

import { Reveal, Stagger, StaggerItem } from '@/components/motion';
import { Star } from 'lucide-react';

const COMPANIES = ['Stripe', 'Vercel', 'Linear', 'Figma', 'Notion', 'Airbnb', 'Datadog', 'Ramp'];

const TESTIMONIALS = [
  {
    quote: 'We processed 8,000 applications for a single role in under a day. The AI scoring cut our screening time by 90%.',
    author: 'Priya Sharma',
    role: 'Head of Talent, Ramp',
    avatar: 'https://i.pravatar.cc/100?u=priya',
  },
  {
    quote: 'The candidate performance reports are a game-changer. Rejected candidates actually thank us — they finally understand why.',
    author: 'Marcus Chen',
    role: 'Engineering Hiring Manager, Datadog',
    avatar: 'https://i.pravatar.cc/100?u=marcus',
  },
  {
    quote: 'The pipeline builder is the most intuitive hiring tool I have used. Drag, configure, done. Every round is accounted for.',
    author: 'Sofia Rodriguez',
    role: 'Senior Recruiter, Shopify',
    avatar: 'https://i.pravatar.cc/100?u=sofia',
  },
];

export function SocialProof() {
  return (
    <section className="relative px-6 py-32">
      <div className="mx-auto max-w-6xl">
        {/* Logo strip */}
        <Reveal className="mb-20 text-center">
          <p className="mb-8 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Trusted by recruiting teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {COMPANIES.map((c) => (
              <span key={c} className="font-display text-xl font-semibold text-muted-foreground/60 transition-colors hover:text-foreground">
                {c}
              </span>
            ))}
          </div>
        </Reveal>

        {/* Testimonials */}
        <Stagger className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <StaggerItem key={i}>
              <div className="glass glass-hover flex h-full flex-col rounded-2xl p-7">
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-foreground/90">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <img src={t.avatar} alt={t.author} className="h-10 w-10 rounded-full" />
                  <div>
                    <div className="text-sm font-medium">{t.author}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

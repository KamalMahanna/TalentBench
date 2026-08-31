'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Layers, ArrowRight, ArrowLeft, Mail, Lock, User, Building2, Loader2, Check } from 'lucide-react';
import { GlowButton } from '@/components/glow-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

const STEPS = ['Account', 'Organization', 'Confirm'] as const;

export default function SignupPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    orgName: '',
    orgSize: '1-10',
  });

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function next() {
    if (step < 2) setStep(step + 1);
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await api.signup(form.email, form.name, form.orgName);
      setUser(res.data);
      toast.success('Account created!');
      router.push('/dashboard');
    } catch {
      toast.error('Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const canProceed = step === 0
    ? form.name && form.email && form.password
    : step === 1
      ? form.orgName
      : true;

  return (
    <div className="mesh-bg noise relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[120px] float" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full bg-chart-3/10 blur-[100px] float" style={{ animationDelay: '2s' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong relative z-10 w-full max-w-md rounded-3xl p-8 sm:p-10"
      >
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Layers className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">TalentBench</span>
        </Link>

        {/* Progress bar */}
        <div className="mb-8 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-all duration-300 ${
                  i < step
                    ? 'bg-primary text-primary-foreground'
                    : i === step
                      ? 'bg-primary/20 text-primary ring-2 ring-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 transition-colors duration-300 ${i < step ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="account"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="font-display text-2xl font-bold tracking-tight">Create your account</h1>
              <p className="mt-2 text-sm text-muted-foreground">Step 1 — Tell us about you</p>

              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="name" value={form.name} onChange={(e) => update('name', e.target.value)} className="bg-background-elevated pl-10" placeholder="Alex Morgan" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="bg-background-elevated pl-10" placeholder="you@company.com" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="password" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} className="bg-background-elevated pl-10" placeholder="••••••••" required />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="org"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="font-display text-2xl font-bold tracking-tight">Set up your organization</h1>
              <p className="mt-2 text-sm text-muted-foreground">Step 2 — Tell us about your company</p>

              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="orgName" value={form.orgName} onChange={(e) => update('orgName', e.target.value)} className="bg-background-elevated pl-10" placeholder="Acme Inc." required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Company size</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {['1-10', '11-50', '51-200', '200+'].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => update('orgSize', size)}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                          form.orgSize === size
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background-elevated text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="font-display text-2xl font-bold tracking-tight">You&apos;re all set</h1>
              <p className="mt-2 text-sm text-muted-foreground">Step 3 — Review and create</p>

              <div className="mt-6 space-y-3 rounded-2xl bg-background-elevated p-5">
                {[
                  { label: 'Name', value: form.name || '—' },
                  { label: 'Email', value: form.email || '—' },
                  { label: 'Organization', value: form.orgName || '—' },
                  { label: 'Company size', value: form.orgSize },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex items-center gap-3">
          {step > 0 && (
            <GlowButton variant="outline" onClick={back} disabled={loading}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </GlowButton>
          )}
          {step < 2 ? (
            <GlowButton onClick={next} disabled={!canProceed} className="flex-1">
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </GlowButton>
          ) : (
            <GlowButton onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </GlowButton>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

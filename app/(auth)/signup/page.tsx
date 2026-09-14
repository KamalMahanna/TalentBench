"use client";

import React, { useState } from "react";
import Image from "next/image";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Sparkle, ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, company }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Signup failed.");
        setLoading(false);
        return;
      }

      toast.success("Account created successfully!");
      router.push("/dashboard");
    } catch (err) {
      toast.error("Network error during registration.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center px-4 py-12 bg-[#0A1228] overflow-hidden">
      <Link
        href="/"
        className="fixed top-6 left-6 inline-flex items-center gap-2 text-xs font-mono text-[#7C91B4] hover:text-[#EAF1FB] transition-colors z-20"
      >
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <div className="w-full max-w-md relative z-10">
        <GlassCard className="w-full">
          <div className="text-center mb-8">
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <Image
                src="/logo.png"
                alt="TalentBench Logo"
                width={48}
                height={48}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">
              Create HR Account
            </h1>
            <p className="text-xs text-[#7C91B4] mt-1">
              Deploy autonomous recruitment pipelines with verifiable screening
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-[#7C91B4] mb-1.5 uppercase">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jordan Hayes"
                className="w-full rounded-xl bg-[#060B18]/60 border border-[#8FB6E8]/20 px-4 py-2.5 text-sm text-[#EAF1FB] placeholder:text-[#7C91B4]/50 focus:outline-none focus:border-[#8FB6E8] focus:ring-1 focus:ring-[#8FB6E8] transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#7C91B4] mb-1.5 uppercase">
                Corporate Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jordan@company.com"
                className="w-full rounded-xl bg-[#060B18]/60 border border-[#8FB6E8]/20 px-4 py-2.5 text-sm text-[#EAF1FB] placeholder:text-[#7C91B4]/50 focus:outline-none focus:border-[#8FB6E8] focus:ring-1 focus:ring-[#8FB6E8] transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#7C91B4] mb-1.5 uppercase">
                Company / Organization
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Vanguard Dynamics"
                className="w-full rounded-xl bg-[#060B18]/60 border border-[#8FB6E8]/20 px-4 py-2.5 text-sm text-[#EAF1FB] placeholder:text-[#7C91B4]/50 focus:outline-none focus:border-[#8FB6E8] focus:ring-1 focus:ring-[#8FB6E8] transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#7C91B4] mb-1.5 uppercase">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className="w-full rounded-xl bg-[#060B18]/60 border border-[#8FB6E8]/20 px-4 py-2.5 text-sm text-[#EAF1FB] placeholder:text-[#7C91B4]/50 focus:outline-none focus:border-[#8FB6E8] focus:ring-1 focus:ring-[#8FB6E8] transition-all font-sans"
              />
            </div>

            <div className="pt-2">
              <GlassButton
                variant="primary"
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Create Organization Account"}
              </GlassButton>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center text-xs text-[#7C91B4]">
            Already have an active account?{" "}
            <Link href="/login" className="text-white hover:underline">
              Sign In
            </Link>
          </div>
        </GlassCard>
      </div>
    </main>
  );
}

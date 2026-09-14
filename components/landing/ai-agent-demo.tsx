"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  ChatCircleText,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";

interface CandidateMock {
  id: string;
  name: string;
  role: string;
  experience: number;
  score: number;
  status: "SHORTLISTED" | "REJECTED";
  trace: { step: string; detail: string; pass: boolean }[];
  reply: string;
}

export function AiAgentDemo() {
  const candidates: CandidateMock[] = [
    {
      id: "cand-1",
      name: "Devon Chen",
      role: "Staff Backend Engineer",
      experience: 7.2,
      score: 95.4,
      status: "SHORTLISTED",
      trace: [
        {
          step: "Experience Boundary Check",
          detail: "Detected 7.2 years total backend experience. Target range [5-9 yrs]. PASS",
          pass: true,
        },
        {
          step: "Core Stack Verification",
          detail: "Found Go (5 yrs), Rust (3 yrs), Distributed Consensus (Raft/Paxos). PASS",
          pass: true,
        },
        {
          step: "Architecture Provenance",
          detail: "Shipped low-latency event broker handling 450k msgs/sec in production. EXCELLENT",
          pass: true,
        },
        {
          step: "Agent Recommendation",
          detail: "Candidate exceeds core engineering threshold. Auto-advancing to DSA Round.",
          pass: true,
        },
      ],
      reply:
        "Hi Devon, we thoroughly reviewed your background and were particularly impressed by your high-throughput broker architecture work. We would love to fast-track you to our DSA round.",
    },
    {
      id: "cand-2",
      name: "Marcus Vance",
      role: "Frontend Engineer",
      experience: 3.1,
      score: 61.2,
      status: "REJECTED",
      trace: [
        {
          step: "Experience Boundary Check",
          detail: "Detected 3.1 years experience. Job requires mandatory [5-9 yrs]. FAIL",
          pass: false,
        },
        {
          step: "Domain Alignment",
          detail: "Primary emphasis on React/CSS; role requires deep Linux internals & distributed systems.",
          pass: false,
        },
        {
          step: "Agent Recommendation",
          detail: "Does not meet minimum seniority threshold. Personalized growth reply prepared.",
          pass: false,
        },
      ],
      reply:
        "Hi Marcus, thank you for your interest in TalentBench. While your frontend craft is strong, this specific role mandates 5+ years in distributed systems internals. We will keep your resume on file for frontend openings.",
    },
  ];

  const [activeCandidate, setActiveCandidate] = useState<CandidateMock>(candidates[0]);

  return (
    <section id="ai-screening" className="relative py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: Context & Candidate Picker (col-span-5) */}
        <div className="lg:col-span-5 lg:sticky lg:top-28">
          <Badge variant="ice" pulse>
            Auditable AI Agent
          </Badge>
          <h2 className="mt-4 text-3xl sm:text-5xl font-display font-bold text-white tracking-tight leading-tight">
            Inspect every thought. <br />
            <span className="text-[#8FB6E8]">Trust every shortlist.</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#7C91B4] leading-relaxed max-w-md">
            The AI screening agent parses resumes against your exact experience ranges and tech criteria. Every inference is rendered in real-time for HR verification.
          </p>

          <div className="mt-8 space-y-3">
            <span className="text-[11px] font-mono text-[#7C91B4] uppercase tracking-wider">
              Select Candidate to Inspect Trace:
            </span>
            {candidates.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCandidate(c)}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between ${
                  activeCandidate.id === c.id
                    ? "bg-[#8FB6E8]/10 border-[#8FB6E8]/40 text-white shadow-[0_0_20px_rgba(143,182,232,0.15)]"
                    : "bg-white/[0.02] border-white/5 text-[#7C91B4] hover:bg-white/[0.04]"
                }`}
              >
                <div>
                  <div className="font-display font-semibold text-sm text-white">{c.name}</div>
                  <div className="text-xs text-[#7C91B4] font-mono mt-0.5">
                    {c.role} · {c.experience} yrs exp
                  </div>
                </div>
                <div
                  className={`text-xs font-mono px-2.5 py-1 rounded-full ${
                    c.status === "SHORTLISTED"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {c.status}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Live Terminal & Agent Trace (col-span-7) */}
        <div className="lg:col-span-7">
          <div className="rounded-3xl p-1.5 bg-white/[0.04] ring-1 ring-[#8FB6E8]/20 shadow-[0_24px_60px_-15px_rgba(4,8,20,0.85)] backdrop-blur-2xl">
            <div className="rounded-[calc(1.5rem-4px)] bg-[#070D1E] p-6 sm:p-8 border border-white/10">
              {/* Terminal Titlebar */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs font-mono text-[#7C91B4] ml-2">
                    agent-trace://eval-{activeCandidate.id}.log
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#8FB6E8]">
                  <span className="w-2 h-2 rounded-full bg-[#8FB6E8] animate-ping" />
                  VERIFIED_TRACE
                </div>
              </div>

              {/* Terminal Body */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCandidate.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="mt-6 space-y-4"
                >
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div>
                      <div className="text-xs text-[#7C91B4] font-mono">CANDIDATE UNDER REVIEW</div>
                      <div className="text-base font-bold text-white mt-0.5">
                        {activeCandidate.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#7C91B4] font-mono">EVALUATION SCORE</div>
                      <div
                        className={`text-xl font-mono font-bold ${
                          activeCandidate.score >= 80 ? "text-[#8FB6E8]" : "text-rose-400"
                        }`}
                      >
                        {activeCandidate.score} / 100
                      </div>
                    </div>
                  </div>

                  {/* Trace Steps */}
                  <div className="space-y-2.5 font-mono text-xs">
                    <div className="text-[#7C91B4] text-[11px] uppercase tracking-wider mb-2">
                      Inference Reasoning Steps:
                    </div>
                    {activeCandidate.trace.map((t, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-[#040814]/70 border border-white/5 flex items-start gap-3"
                      >
                        {t.pass ? (
                          <CheckCircle
                            size={16}
                            weight="bold"
                            className="text-[#8FB6E8] mt-0.5 flex-shrink-0"
                          />
                        ) : (
                          <XCircle
                            size={16}
                            weight="bold"
                            className="text-rose-400 mt-0.5 flex-shrink-0"
                          />
                        )}
                        <div>
                          <div className="text-[#EAF1FB] font-medium">{t.step}</div>
                          <div className="text-[#7C91B4] text-[11px] mt-0.5">{t.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Personalized Reply Card */}
                  <div className="mt-6 p-5 rounded-2xl bg-[#0D1633] border border-[#8FB6E8]/30">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#8FB6E8] mb-2">
                      <ChatCircleText size={16} weight="bold" />
                      GENERATED PERSONALIZED REPLY (AUTO-DISPATCH READY)
                    </div>
                    <p className="text-xs sm:text-sm text-[#EAF1FB] italic leading-relaxed">
                      &ldquo;{activeCandidate.reply}&rdquo;
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

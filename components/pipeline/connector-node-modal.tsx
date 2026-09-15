"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  Brain,
  Code,
  TerminalWindow,
  UsersThree,
  Gear,
  X,
  Sparkle,
  Info,
} from "@phosphor-icons/react";
import { GlassButton } from "@/components/ui/glass-button";

export interface ConnectorStageConfig {
  type: string;
  title: string;
  description: string;
  cutoff: number;
  inputType: "BULK_RESUME_OR_EXCEL" | "ASSESSMENT_LINK" | "CODING_SANDBOX" | "INTERVIEW_PANEL" | "CUSTOM";
  inputSpecText: string;
  outputSpecText: string;
}

interface ConnectorNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stage: ConnectorStageConfig) => void;
  initialStage?: {
    type?: string;
    title?: string;
    description?: string | null;
    cutoff?: number;
    inputType?: "BULK_RESUME_OR_EXCEL" | "ASSESSMENT_LINK" | "CODING_SANDBOX" | "INTERVIEW_PANEL" | "CUSTOM";
    inputSpecText?: string;
    outputSpecText?: string;
  };
  mode?: "create" | "edit";
}

const ROUND_TYPES = [
  {
    type: "RESUME_SCREENING",
    name: "Resume Screening",
    icon: FileText,
    badge: "Active",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    isUpcoming: false,
    defaultTitle: "RESUME SCREENING",
    defaultDesc: "",
    inputType: "BULK_RESUME_OR_EXCEL" as const,
    inputSpecText: "Bulk Resume Upload (PDF / DOCX / TXT) or Excel Sheet with column like 'resume_texts'. Resumes transferred 1-by-1 via JSON queue.",
    outputSpecText: "Shortlisted candidates pool, automated feedback email bodies detailing missing skills, and Comparative Benchmark ranking if pool exceeds cutoff.",
  },
  {
    type: "APTITUDE",
    name: "Aptitude and Reasoning",
    icon: Brain,
    badge: "Upcoming",
    badgeColor: "bg-amber-400/10 text-amber-300 border-amber-400/20",
    isUpcoming: true,
    defaultTitle: "Cognitive Logic & Reasoning Assessment",
    defaultDesc: "Timed quantitative aptitude, analytical reasoning, and data interpretation challenges.",
    inputType: "ASSESSMENT_LINK" as const,
    inputSpecText: "Automated test link dispatch or proctored question bank specification.",
    outputSpecText: "Percentile scores, accuracy breakdown, and time-per-question telemetry.",
  },
  {
    type: "DSA",
    name: "DSA Round",
    icon: Code,
    badge: "Upcoming",
    badgeColor: "bg-blue-400/10 text-blue-300 border-blue-400/20",
    isUpcoming: true,
    defaultTitle: "Live DSA & System Algorithms",
    defaultDesc: "Interactive algorithmic challenges, time/space complexity evaluation, and test suite execution.",
    inputType: "CODING_SANDBOX" as const,
    inputSpecText: "Curated problem set (LeetCode/HackerRank style) with unit test boundaries.",
    outputSpecText: "Automated test case pass rate, memory usage, runtime complexity analysis, and code quality score.",
  },
  {
    type: "TECHNICAL",
    name: "Technical Interview",
    icon: TerminalWindow,
    badge: "Upcoming",
    badgeColor: "bg-purple-400/10 text-purple-300 border-purple-400/20",
    isUpcoming: true,
    defaultTitle: "Deep Technical & System Design Round",
    defaultDesc: "Comprehensive architectural discussion, concurrency, database design, and framework mastery.",
    inputType: "INTERVIEW_PANEL" as const,
    inputSpecText: "Interview scorecard rubric, technical topic checklist, and interviewer assignment.",
    outputSpecText: "Detailed competency matrix, architectural depth rating, and hiring committee notes.",
  },
  {
    type: "HR_ROUND",
    name: "HR Interview",
    icon: UsersThree,
    badge: "Upcoming",
    badgeColor: "bg-pink-400/10 text-pink-300 border-pink-400/20",
    isUpcoming: true,
    defaultTitle: "Executive HR & Cultural Alignment",
    defaultDesc: "Values alignment, compensation expectations, behavioral traits, and team fit verification.",
    inputType: "INTERVIEW_PANEL" as const,
    inputSpecText: "Behavioral question bank and candidate availability windows.",
    outputSpecText: "Culture fit score, salary expectations log, and definitive offer recommendation.",
  },
  {
    type: "CUSTOM",
    name: "Custom Round",
    icon: Gear,
    badge: "Upcoming",
    badgeColor: "bg-slate-400/10 text-slate-300 border-slate-400/20",
    isUpcoming: true,
    defaultTitle: "Custom Evaluation Gate",
    defaultDesc: "Tailored recruiter stage configured with proprietary company requirements.",
    inputType: "CUSTOM" as const,
    inputSpecText: "Custom file submission, presentation review, or manual review rubric.",
    outputSpecText: "Structured evaluator checklist and pass/fail decision.",
  },
];

export function ConnectorNodeModal({
  isOpen,
  onClose,
  onSave,
  initialStage,
  mode = "create",
}: ConnectorNodeModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedType, setSelectedType] = useState(
    initialStage?.type || "RESUME_SCREENING"
  );
  const [title, setTitle] = useState(initialStage?.title || "");
  const [description, setDescription] = useState(initialStage?.description || "");
  const [cutoff, setCutoff] = useState<number>(initialStage?.cutoff || 50);

  const currentTypeInfo =
    ROUND_TYPES.find((r) => r.type === selectedType) || ROUND_TYPES[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialStage?.type) {
      setSelectedType(initialStage.type);
      setTitle(initialStage.title || "");
      setDescription(initialStage.description || "");
      setCutoff(initialStage.cutoff || 50);
    } else {
      const def = ROUND_TYPES[0];
      setSelectedType(def.type);
      setTitle(def.defaultTitle);
      setDescription(def.defaultDesc);
      setCutoff(50);
    }
  }, [initialStage, isOpen]);

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSelectRoundType = (type: string) => {
    const info = ROUND_TYPES.find((r) => r.type === type);
    if (!info || info.isUpcoming) return;
    setSelectedType(type);
    setTitle(info.defaultTitle);
    setDescription(info.defaultDesc);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = (selectedType === "CUSTOM" ? title : title || currentTypeInfo.defaultTitle).trim();
    if (!finalTitle) return;

    onSave({
      type: selectedType,
      title: finalTitle,
      description: (description || currentTypeInfo.defaultDesc).trim(),
      cutoff: Math.max(1, Number(cutoff) || 50),
      inputType: currentTypeInfo.inputType,
      inputSpecText: currentTypeInfo.inputSpecText,
      outputSpecText: currentTypeInfo.outputSpecText,
    });
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl my-auto rounded-3xl p-1 bg-white/[0.04] ring-1 ring-[#8FB6E8]/30 shadow-2xl flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-[calc(1.5rem-2px)] bg-[#070D1E] border border-white/10 flex flex-col overflow-hidden max-h-[calc(88vh-8px)]">
          {/* Fixed Header */}
          <div className="flex items-center justify-between p-6 sm:p-7 pb-4 border-b border-white/10 shrink-0 bg-[#070D1E]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#60A5FA] animate-pulse" />
                <h3 className="text-lg font-display font-bold text-white">
                  {mode === "create" ? "Configure Connector Stage Node" : "Edit Connector Stage"}
                </h3>
              </div>
              <p className="text-xs text-[#7C91B4] mt-1">
                Select your round type, configure input/output specifications, and set candidate shortlist cutoffs.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#7C91B4] hover:text-white hover:bg-white/5 transition-colors"
              title="Close modal (Esc)"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form with Scrollable Body and Fixed Footer */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            {/* Scrollable Body */}
            <div className="p-6 sm:p-7 overflow-y-auto space-y-6 flex-1 pr-4 overscroll-contain">
              {/* 1. Select Round Type Grid */}
              <div>
                <label className="block text-xs font-mono text-[#8FB6E8] uppercase tracking-wider mb-2.5">
                  1. Select Round Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {ROUND_TYPES.map((rt) => {
                    const Icon = rt.icon;
                    const isSelected = selectedType === rt.type;
                    const isUpcoming = rt.isUpcoming;
                    return (
                      <button
                        key={rt.type}
                        type="button"
                        disabled={isUpcoming}
                        onClick={() => handleSelectRoundType(rt.type)}
                        className={`p-3 rounded-xl border text-left transition-all relative ${
                          isUpcoming
                            ? "bg-[#0A1228]/40 border-white/5 opacity-40 cursor-not-allowed select-none"
                            : isSelected
                            ? "bg-[#60A5FA]/15 border-[#60A5FA] shadow-[0_0_15px_rgba(96,165,250,0.2)]"
                            : "bg-[#0A1228] border-white/5 hover:border-white/15"
                        }`}
                        title={isUpcoming ? `${rt.name} is upcoming and cannot be selected` : undefined}
                      >
                        <div className="flex items-start justify-between gap-1 mb-2">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isUpcoming
                                ? "bg-white/[0.03] text-white/30"
                                : isSelected
                                ? "bg-[#60A5FA]/20 text-[#60A5FA]"
                                : "bg-white/5 text-[#7C91B4]"
                            }`}
                          >
                            <Icon size={18} weight="duotone" />
                          </div>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase ${rt.badgeColor}`}
                          >
                            {rt.badge}
                          </span>
                        </div>
                        <div
                          className={`text-xs font-semibold leading-tight ${
                            isUpcoming ? "text-white/40" : "text-white"
                          }`}
                        >
                          {rt.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Stage Title & Cutoff */}
              {selectedType === "CUSTOM" && (
                <div>
                  <label className="block text-xs font-mono text-[#7C91B4] uppercase mb-1.5">
                    Stage Display Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#040814] border border-white/10 text-white text-xs focus:outline-none focus:border-[#60A5FA]"
                    placeholder="e.g. Custom Evaluation Gate"
                    required
                  />
                </div>
              )}

              {selectedType === "RESUME_SCREENING" && (
                <div>
                  <label className="block text-xs font-mono text-[#7C91B4] uppercase mb-1.5 flex items-center justify-between">
                    <span>Candidate Shortlist Cutoff</span>
                    <span className="text-[10px] text-[#60A5FA]">Target to Advance</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={cutoff}
                    onChange={(e) => setCutoff(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#040814] border border-white/10 text-white text-xs focus:outline-none focus:border-[#60A5FA]"
                    placeholder="50"
                    required
                  />
                </div>
              )}

              {/* Explanatory banner for Cutoff and Comparative Matching - ONLY shown for Resume Screening */}
              {selectedType === "RESUME_SCREENING" && (
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2.5 text-xs text-[#8FB6E8]">
                  <Sparkle size={18} weight="fill" className="text-[#60A5FA] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Cutoff &amp; Comparative Tournament Rule:</span>
                    <p className="text-[11px] text-[#A6C5EE] mt-0.5 leading-relaxed">
                      HR can select how many candidates to shortlist for Round 2. If the number of matching resumes (&ge; 50% match) exceeds this cutoff ({cutoff}), the <strong>Comparative Resume Matching</strong> tournament will automatically rank candidates and advance the top {cutoff}.
                    </p>
                  </div>
                </div>
              )}

              {/* 3. Input & Output Specification (What is needed during execution) */}
              <div className="space-y-3 p-4 rounded-2xl bg-[#030712]/80 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#8FB6E8] uppercase tracking-wider flex items-center gap-1.5">
                    <Info size={14} /> Pipeline Input &amp; Output Specification
                  </span>
                  <span className="text-[10px] font-mono text-[#7C91B4] bg-white/5 px-2 py-0.5 rounded">
                    Supplied at Execution
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Input Option */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="font-semibold text-white flex items-center gap-1.5 mb-1 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Input Option (When Executing):
                    </div>
                    <p className="text-[#7C91B4] text-[11px] leading-relaxed">
                      {currentTypeInfo.inputSpecText}
                    </p>
                  </div>

                  {/* Output Option */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="font-semibold text-white flex items-center gap-1.5 mb-1 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      Output Generated:
                    </div>
                    <p className="text-[#7C91B4] text-[11px] leading-relaxed">
                      {currentTypeInfo.outputSpecText}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-white/10 shrink-0 bg-[#040814]/90 backdrop-blur-md">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#7C91B4] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <GlassButton variant="primary" size="md" type="submit">
                {mode === "create" ? "Add Connector Stage" : "Save Changes"}
              </GlassButton>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

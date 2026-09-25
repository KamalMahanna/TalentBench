"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  Brain,
  Code,
  Terminal,
  Users,
  Settings,
  X,
  Sparkles,
  Info,
} from "lucide-react";

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
    isUpcoming: true,
    defaultTitle: "Live DSA & System Algorithms",
    defaultDesc: "Interactive algorithmic challenges, time/space complexity evaluation, and test suite execution.",
    inputType: "CODING_SANDBOX" as const,
    inputSpecText: "Curated problem set with unit test boundaries.",
    outputSpecText: "Automated test case pass rate, memory usage, runtime complexity analysis, and code quality score.",
  },
  {
    type: "TECHNICAL",
    name: "Technical Interview",
    icon: Terminal,
    badge: "Upcoming",
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
    icon: Users,
    badge: "Upcoming",
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
    icon: Settings,
    badge: "Upcoming",
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
  const [selectedType, setSelectedType] = useState(initialStage?.type || "RESUME_SCREENING");
  const [title, setTitle] = useState(initialStage?.title || "");
  const [description, setDescription] = useState(initialStage?.description || "");
  const [cutoff, setCutoff] = useState<number>(initialStage?.cutoff || 50);

  const currentTypeInfo = ROUND_TYPES.find((r) => r.type === selectedType) || ROUND_TYPES[0];

  useEffect(() => { setMounted(true); }, []);

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
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: "10px",
    background: "var(--surface)",
    border: "1px solid var(--outline)",
    padding: "9px 12px",
    fontSize: "13px",
    color: "var(--ink)",
    fontFamily: "DM Sans, system-ui, sans-serif",
    outline: "none",
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          background: "var(--surface-high)",
          border: "1px solid var(--outline)",
          borderRadius: "28px",
          boxShadow: "0 22px 55px rgba(60,48,83,0.2)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "88vh",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "22px 24px 16px", borderBottom: "1px solid var(--outline)", flexShrink: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "999px", background: "var(--primary)", display: "inline-block" }} />
              <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                {mode === "create" ? "Configure Connector Stage" : "Edit Connector Stage"}
              </h3>
            </div>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
              Select a round type, configure input/output specs, and set shortlist cutoffs.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "4px", borderRadius: "8px", display: "flex" }}
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", overflow: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Round type selection */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary)", marginBottom: "10px", display: "block" }}>
                1. Select Round Type
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {ROUND_TYPES.map((rt) => {
                  const Icon = rt.icon;
                  const isSelected = selectedType === rt.type;
                  return (
                    <button
                      key={rt.type}
                      type="button"
                      disabled={rt.isUpcoming}
                      onClick={() => handleSelectRoundType(rt.type)}
                      style={{
                        padding: "12px",
                        borderRadius: "14px",
                        border: `1px solid ${isSelected ? "var(--primary)" : "var(--outline)"}`,
                        background: isSelected ? "var(--surface-purple)" : rt.isUpcoming ? "var(--surface)" : "var(--surface-high)",
                        cursor: rt.isUpcoming ? "not-allowed" : "pointer",
                        textAlign: "left",
                        opacity: rt.isUpcoming ? 0.45 : 1,
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: isSelected ? "var(--primary)" : "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: isSelected ? "var(--on-primary)" : "var(--muted)" }}>
                          <Icon size={16} />
                        </div>
                        <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "999px", background: rt.isUpcoming ? "var(--surface-peach)" : "var(--surface-blue)", color: rt.isUpcoming ? "#a0440d" : "#1a6098", textTransform: "uppercase" }}>
                          {rt.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>{rt.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom title */}
            {selectedType === "CUSTOM" && (
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "6px" }}>Stage Display Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="e.g. Custom Evaluation Gate" required />
              </div>
            )}

            {/* Cutoff for resume screening */}
            {selectedType === "RESUME_SCREENING" && (
              <>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "6px" }}>Candidate Shortlist Cutoff</label>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={cutoff}
                    onChange={(e) => setCutoff(Math.max(1, parseInt(e.target.value) || 1))}
                    style={inputStyle}
                    placeholder="50"
                    required
                  />
                </div>
                <div style={{ padding: "12px 14px", borderRadius: "14px", background: "var(--surface-blue)", border: "1px solid var(--outline)", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <Sparkles size={16} style={{ color: "var(--primary)", flexShrink: 0, marginTop: "1px" }} />
                  <div style={{ fontSize: "12px" }}>
                    <strong style={{ color: "var(--ink)" }}>Cutoff & Comparative Tournament Rule: </strong>
                    <span style={{ color: "var(--muted)" }}>
                      If matching resumes exceed {cutoff}, the Comparative Resume Matching tournament automatically ranks candidates and advances the top {cutoff}.
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* I/O Spec */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--outline)", borderRadius: "16px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary)", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Info size={13} /> Pipeline Input & Output Specification
                </span>
                <span style={{ fontSize: "10px", color: "var(--muted)", background: "var(--surface-high)", padding: "2px 8px", borderRadius: "999px" }}>Supplied at execution</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ background: "var(--surface-high)", borderRadius: "12px", padding: "10px 12px", border: "1px solid var(--outline)" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--green)", display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
                    <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: "var(--green)", display: "inline-block" }} />
                    Input Option:
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>{currentTypeInfo.inputSpecText}</p>
                </div>
                <div style={{ background: "var(--surface-high)", borderRadius: "12px", padding: "10px 12px", border: "1px solid var(--outline)" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
                    <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: "var(--primary)", display: "inline-block" }} />
                    Output Generated:
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>{currentTypeInfo.outputSpecText}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", padding: "16px 24px", borderTop: "1px solid var(--outline)", flexShrink: 0, background: "var(--surface-high)" }}>
            <button type="button" onClick={onClose} className="md-button md-button--text">Cancel</button>
            <button type="submit" className="md-button md-button--filled">
              {mode === "create" ? "Add Connector Stage" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

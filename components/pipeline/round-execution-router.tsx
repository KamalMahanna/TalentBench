"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Brain,
  Code,
  MessageSquare,
  Users,
  Terminal,
  Settings,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { ResumeScreeningConsole } from "@/components/pipeline/resume-screening-console";
import { AptitudeConsole } from "@/components/pipeline/aptitude-console";
import { DsaCodingConsole } from "@/components/pipeline/dsa-coding-console";
import { CommunicationConsole } from "@/components/pipeline/communication-console";
import { HrRoundConsole } from "@/components/pipeline/hr-round-console";
import { TechnicalConsole } from "@/components/pipeline/technical-console";
import { CustomRoundConsole } from "@/components/pipeline/custom-round-console";
import { StageStatus, getSimplifiedRoundTitle } from "@/components/pipeline/pipeline-canvas";

export interface PipelineRoundItem {
  id: string;
  type: string;
  title: string;
  description: string | null;
  order: number;
  config: string | null;
  status?: StageStatus;
  cutoff?: number;
}

interface RoundExecutionRouterProps {
  jobId: string;
  jobTitle: string;
  jobDescription: string;
  minExperience?: number;
  maxExperience?: number;
  stages: PipelineRoundItem[];
  initialStageId?: string;
  candidates: any[];
  onRefresh: () => Promise<void>;
  onBackToCanvas: () => void;
}

const getStageIcon = (type: string) => {
  switch (type?.toUpperCase()) {
    case "RESUME_SCREENING":
      return FileText;
    case "APTITUDE":
      return Brain;
    case "DSA":
      return Code;
    case "COMMUNICATION":
      return MessageSquare;
    case "HR_ROUND":
    case "CULTURE_FIT":
      return Users;
    case "TECHNICAL":
      return Terminal;
    default:
      return Settings;
  }
};

export function RoundExecutionRouter({
  jobId,
  jobTitle,
  jobDescription,
  minExperience = 0,
  maxExperience = 10,
  stages,
  initialStageId,
  candidates,
  onRefresh,
  onBackToCanvas,
}: RoundExecutionRouterProps) {
  const [selectedStageId, setSelectedStageId] = useState<string>(
    initialStageId || stages[0]?.id || ""
  );

  useEffect(() => {
    if (initialStageId) {
      setSelectedStageId(initialStageId);
    } else if (stages.length > 0 && !selectedStageId) {
      setSelectedStageId(stages[0].id);
    }
  }, [initialStageId, stages]);

  const activeStage =
    stages.find((s) => s.id === selectedStageId) || stages[0];

  if (!activeStage) {
    return (
      <div style={{ padding: "48px", textAlign: "center", color: "var(--muted)" }}>
        No rounds configured for this job profile.
      </div>
    );
  }

  // Parse cutoff from stage config
  let stageCutoff = 50;
  if (activeStage.config) {
    try {
      const parsed = JSON.parse(activeStage.config);
      if (parsed.cutoff) stageCutoff = Number(parsed.cutoff);
    } catch {}
  }

  const renderActiveConsole = () => {
    const type = activeStage.type?.toUpperCase() || "";

    switch (type) {
      case "RESUME_SCREENING":
        return (
          <ResumeScreeningConsole
            jobId={jobId}
            jobTitle={jobTitle}
            jobDescription={jobDescription}
            minExperience={minExperience}
            maxExperience={maxExperience}
            cutoff={stageCutoff}
            candidates={candidates}
            onRefresh={onRefresh}
          />
        );

      case "APTITUDE":
        return (
          <AptitudeConsole
            jobId={jobId}
            jobTitle={jobTitle}
            roundId={activeStage.id}
            roundTitle={getSimplifiedRoundTitle(activeStage)}
            roundOrder={activeStage.order}
            cutoff={stageCutoff}
            candidates={candidates}
            onRefresh={onRefresh}
          />
        );

      case "DSA":
        return (
          <DsaCodingConsole
            jobId={jobId}
            jobTitle={jobTitle}
            roundId={activeStage.id}
            roundTitle={getSimplifiedRoundTitle(activeStage)}
            roundOrder={activeStage.order}
            cutoff={stageCutoff}
            candidates={candidates}
            onRefresh={onRefresh}
          />
        );

      case "COMMUNICATION":
        return (
          <CommunicationConsole
            jobId={jobId}
            jobTitle={jobTitle}
            roundId={activeStage.id}
            roundTitle={getSimplifiedRoundTitle(activeStage)}
            roundOrder={activeStage.order}
            cutoff={stageCutoff}
            candidates={candidates}
            onRefresh={onRefresh}
          />
        );

      case "HR_ROUND":
      case "CULTURE_FIT":
        return (
          <HrRoundConsole
            jobId={jobId}
            jobTitle={jobTitle}
            roundId={activeStage.id}
            roundTitle={getSimplifiedRoundTitle(activeStage)}
            roundOrder={activeStage.order}
            cutoff={stageCutoff}
            candidates={candidates}
            onRefresh={onRefresh}
          />
        );

      case "TECHNICAL":
        return (
          <TechnicalConsole
            jobId={jobId}
            jobTitle={jobTitle}
            roundId={activeStage.id}
            roundTitle={getSimplifiedRoundTitle(activeStage)}
            roundOrder={activeStage.order}
            cutoff={stageCutoff}
            candidates={candidates}
            onRefresh={onRefresh}
          />
        );

      default:
        return (
          <CustomRoundConsole
            jobId={jobId}
            jobTitle={jobTitle}
            roundId={activeStage.id}
            roundTitle={getSimplifiedRoundTitle(activeStage)}
            roundOrder={activeStage.order}
            cutoff={stageCutoff}
            candidates={candidates}
            onRefresh={onRefresh}
          />
        );
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* ── TOP STAGE SELECTOR TABS & NAVIGATION ── */}
      <div
        style={{
          background: "var(--surface-high)",
          border: "1px solid var(--outline)",
          borderRadius: "20px",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          boxShadow: "0 4px 18px rgba(27,26,34,0.03)",
        }}
      >
        {/* Left: Back button & Stage pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1 }}>
          <button
            type="button"
            onClick={onBackToCanvas}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              borderRadius: "999px",
              background: "var(--surface)",
              border: "1px solid var(--outline)",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--muted)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            className="hover:text-[var(--primary)] hover:border-[var(--primary)]"
          >
            <ArrowLeft size={13} />
            <span>Rounds Overview</span>
          </button>

          <div style={{ width: "1px", height: "20px", background: "var(--outline)" }} />

          {/* Horizontal stage switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", overflowX: "auto", padding: "2px 0" }}>
            {stages.map((stage, idx) => {
              const isSelected = stage.id === activeStage.id;
              const Icon = getStageIcon(stage.type);
              const status = stage.status || "pending";

              let statusDotColor = "var(--outline)";
              if (status === "finished") statusDotColor = "var(--green)";
              else if (status === "running") statusDotColor = "#d97706";
              else if (status === "failed") statusDotColor = "#c0392b";

              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setSelectedStageId(stage.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "6px 14px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: isSelected ? 700 : 500,
                    border: isSelected ? "1px solid var(--primary)" : "1px solid var(--outline)",
                    background: isSelected ? "var(--surface-purple)" : "var(--surface)",
                    color: isSelected ? "var(--primary-deep)" : "var(--muted)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: isSelected ? "var(--primary)" : "var(--outline)",
                      color: isSelected ? "#ffffff" : "var(--muted)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "9px",
                      fontWeight: 700,
                    }}
                  >
                    {idx}
                  </span>

                  <Icon size={13} />
                  <span>{getSimplifiedRoundTitle(stage)}</span>

                  {/* Status indicator dot */}
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: statusDotColor,
                      display: "inline-block",
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Job Context Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: "999px",
              background: "var(--surface)",
              color: "var(--muted)",
              border: "1px solid var(--outline)",
            }}
          >
            {candidates.length} Candidate{candidates.length === 1 ? "" : "s"} In Pool
          </span>
        </div>
      </div>

      {/* ── ACTIVE ROUND CONSOLE ── */}
      <div>{renderActiveConsole()}</div>
    </div>
  );
}


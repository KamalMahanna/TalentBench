"use client";

import React, { useState, useEffect } from "react";
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
  onBackToCanvas?: () => void;
}

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
    <div>
      {renderActiveConsole()}
    </div>
  );
}


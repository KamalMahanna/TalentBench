"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Pencil,
  Upload,
  FileText,
  Brain,
  Code,
  MessageSquare,
  Users,
  Terminal,
  Sparkles,
} from "lucide-react";
import { ConnectorNodeModal, ConnectorStageConfig } from "./connector-node-modal";

export type StageStatus = "finished" | "running" | "failed" | "pending";

export interface PipelineStageItem {
  id?: string;
  type: string;
  title: string;
  description?: string | null;
  cutoff?: number;
  order: number;
  config?: string | null;
  status?: StageStatus | string;
}

interface PipelineCanvasProps {
  stages: PipelineStageItem[];
  onChange: (newStages: PipelineStageItem[]) => void;
  onExecuteStage?: (stage: PipelineStageItem) => void;
  onViewTraces?: (stage: PipelineStageItem) => void;
  candidateCount?: number;
  isEditable?: boolean;
}

export function getRoundStatusStyles(status?: string | null) {
  const s = (status || "").toLowerCase().trim();
  if (s === "finished" || s === "completed" || s === "passed" || s === "success") {
    return {
      background: "var(--round-finished-bg, #E8F5E9)",
      color: "var(--round-finished-text, #166534)",
      border: "1px solid var(--round-finished-border, #C7EED8)",
      label: "Finished",
      status: "finished" as const,
      isRunning: false,
    };
  }
  if (s === "running" || s === "in_progress" || s === "active" || s === "evaluating") {
    return {
      background: "var(--round-running-bg, #FEF3C7)",
      color: "var(--round-running-text, #92400E)",
      border: "1px solid var(--round-running-border, #FDE68A)",
      label: "Running",
      status: "running" as const,
      isRunning: true,
    };
  }
  if (s === "failed" || s === "rejected" || s === "error") {
    return {
      background: "var(--round-failed-bg, #FEE2E2)",
      color: "var(--round-failed-text, #991B1B)",
      border: "1px solid var(--round-failed-border, #FECACA)",
      label: "Failed",
      status: "failed" as const,
      isRunning: false,
    };
  }
  return {
    background: "var(--round-pending-bg, var(--surface-purple))",
    color: "var(--round-pending-text, var(--primary-deep))",
    border: "1px solid var(--round-pending-border, transparent)",
    label: "Not Finished",
    status: "pending" as const,
    isRunning: false,
  };
}

export function getSimplifiedRoundTitle(stage: { title?: string | null; type?: string | null } | null | undefined): string {
  if (!stage) return "Round";
  const type = stage.type?.toUpperCase() || "";
  const title = (stage.title || "").trim();

  if (
    type === "RESUME_SCREENING" ||
    title.toUpperCase() === "RESUME SCREENING" ||
    title.toLowerCase().includes("resume")
  ) {
    return "Resume Shortlisting";
  }
  if (
    type === "APTITUDE" ||
    title.toLowerCase().includes("cognitive aptitude") ||
    title.toLowerCase().includes("aptitude")
  ) {
    return "Aptitude & Reasoning";
  }
  if (
    type === "DSA" ||
    title.toLowerCase().includes("distributed algorithms") ||
    title.toLowerCase().includes("dsa")
  ) {
    return "Coding & DSA";
  }
  if (
    type === "COMMUNICATION" ||
    title.toLowerCase().includes("technical communication") ||
    title.toLowerCase().includes("communication")
  ) {
    return "Communication";
  }
  if (
    type === "HR_ROUND" ||
    title.toLowerCase().includes("executive hr") ||
    title.toLowerCase().includes("hr round") ||
    title.toLowerCase().includes("culture alignment")
  ) {
    return "HR round";
  }

  return stage.title || "Round";
}

export function getStageButtonConfig(stage: { title?: string | null; type?: string | null } | null | undefined) {
  const type = stage?.type?.toUpperCase() || "";
  const title = (stage?.title || "").toLowerCase();

  if (type === "RESUME_SCREENING" || title.includes("resume")) {
    return { label: "Screening Console", Icon: FileText };
  }
  if (type === "APTITUDE" || title.includes("aptitude")) {
    return { label: "Aptitude Console", Icon: Brain };
  }
  if (type === "DSA" || title.includes("dsa") || title.includes("coding")) {
    return { label: "Coding Sandbox", Icon: Code };
  }
  if (type === "COMMUNICATION" || title.includes("communication")) {
    return { label: "Communication Console", Icon: MessageSquare };
  }
  if (type === "HR_ROUND" || type === "CULTURE_FIT" || title.includes("hr") || title.includes("culture")) {
    return { label: "HR & Culture Console", Icon: Users };
  }
  if (type === "TECHNICAL" || title.includes("technical")) {
    return { label: "Technical Console", Icon: Terminal };
  }
  return { label: "Review Console", Icon: Sparkles };
}

export function PipelineCanvas({
  stages,
  onChange,
  onExecuteStage,
  onViewTraces,
  candidateCount,
  isEditable = true,
}: PipelineCanvasProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const handleOpenCreateModal = () => {
    setEditIndex(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (idx: number) => {
    setEditIndex(idx);
    setModalOpen(true);
  };

  const handleCycleStatus = (idx: number) => {
    if (!isEditable) return;
    const currentStage = stages[idx];
    const currentStatus = (currentStage.status || "pending").toLowerCase();
    let nextStatus: StageStatus = "finished";
    if (currentStatus === "pending") nextStatus = "running";
    else if (currentStatus === "running") nextStatus = "finished";
    else if (currentStatus === "finished") nextStatus = "failed";
    else if (currentStatus === "failed") nextStatus = "pending";

    let updatedConfig = currentStage.config;
    try {
      const parsed = currentStage.config ? JSON.parse(currentStage.config) : {};
      parsed.status = nextStatus;
      updatedConfig = JSON.stringify(parsed);
    } catch {
      updatedConfig = JSON.stringify({ status: nextStatus });
    }

    const updated = stages.map((s, i) =>
      i === idx ? { ...s, status: nextStatus, config: updatedConfig } : s
    );
    onChange(updated);
  };

  const handleSaveStage = (config: ConnectorStageConfig) => {
    const configString = JSON.stringify({
      cutoff: config.cutoff,
      inputType: config.inputType,
      inputSpecText: config.inputSpecText,
      outputSpecText: config.outputSpecText,
      status: config.status && config.status !== "auto" ? config.status : undefined,
    });

    if (editIndex !== null && editIndex >= 0) {
      const updated = [...stages];
      updated[editIndex] = {
        ...updated[editIndex],
        type: config.type,
        title: config.title,
        description: config.description,
        cutoff: config.cutoff,
        status: config.status && config.status !== "auto" ? (config.status as StageStatus) : undefined,
        config: configString,
      };
      onChange(updated);
    } else {
      const newStage: PipelineStageItem = {
        type: config.type,
        title: config.title,
        description: config.description,
        cutoff: config.cutoff,
        status: config.status && config.status !== "auto" ? (config.status as StageStatus) : undefined,
        order: stages.length,
        config: configString,
      };
      onChange([...stages, newStage]);
    }
  };

  const handleDelete = (index: number) => {
    const next = stages
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, order: i }));
    onChange(next);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const next = [...stages];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;

    const reordered = next.map((s, i) => ({ ...s, order: i }));
    onChange(reordered);
  };

  // ── EMPTY STATE ──
  if (stages.length === 0) {
    return (
      <div
        style={{
          background: "var(--surface-high)",
          border: "1px dashed var(--outline)",
          borderRadius: "24px",
          padding: "48px 24px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <button
          type="button"
          onClick={handleOpenCreateModal}
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "20px",
            background: "var(--surface-purple)",
            border: "1px solid var(--outline)",
            color: "var(--primary-deep)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "transform 0.15s",
          }}
          title="Configure First Node"
        >
          <Plus size={28} />
        </button>

        <div>
          <h3
            style={{
              fontSize: "17px",
              fontWeight: 600,
              color: "var(--ink)",
              margin: "0 0 6px",
            }}
          >
            Configure First Round
          </h3>
          <p
            style={{
              fontSize: "13px",
              color: "var(--muted)",
              margin: 0,
              maxWidth: "420px",
            }}
          >
            Select your initial round (Resume Screening, Aptitude, DSA, Technical, HR, or Custom).
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              padding: "4px 12px",
              borderRadius: "999px",
              background: "var(--surface)",
              color: "var(--muted)",
            }}
          >
            6 Modular Round Types
          </span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              padding: "4px 12px",
              borderRadius: "999px",
              background: "var(--surface)",
              color: "var(--muted)",
            }}
          >
            Input &amp; Output Specs
          </span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              padding: "4px 12px",
              borderRadius: "999px",
              background: "var(--surface)",
              color: "var(--muted)",
            }}
          >
            Cutoff &amp; Comparative Matching
          </span>
        </div>

        <ConnectorNodeModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveStage}
          mode="create"
        />
      </div>
    );
  }

  // ── ACTIVE STAGES CANVAS ──
  return (
    <div
      style={{
        background: "var(--surface-high)",
        border: "1px solid var(--outline)",
        borderRadius: "24px",
        padding: "28px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--outline)",
          paddingBottom: "16px",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--ink)",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "999px",
                background: "var(--primary)",
              }}
            />
            Hiring Rounds ({stages.length})
          </h2>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {stages.map((stage, idx) => {
          const isLast = idx === stages.length - 1;

          return (
            <motion.div
              key={stage.id || idx}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {/* Node Card */}
              <motion.div
                whileHover={{ y: -2, transition: { duration: 0.15 } }}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--outline)",
                  borderRadius: "18px",
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
                  {/* Step Number */}
                  {(() => {
                    const statusStyle = getRoundStatusStyles(stage.status);
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCycleStatus(idx);
                        }}
                        className={statusStyle.isRunning ? "round-no-running" : ""}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          background: statusStyle.background,
                          color: statusStyle.color,
                          border: statusStyle.border,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: 700,
                          flexShrink: 0,
                          cursor: isEditable ? "pointer" : "default",
                          transition: "all 0.25s ease",
                          padding: 0,
                        }}
                        title={
                          isEditable
                            ? `Round 0${idx + 1} (${statusStyle.label}) · Click to toggle status`
                            : `Round 0${idx + 1} (${statusStyle.label})`
                        }
                      >
                        0{idx + 1}
                      </button>
                    );
                  })()}

                  {/* Details */}
                  <div style={{ minWidth: 0 }}>
                    <h3
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "var(--ink)",
                        margin: 0,
                      }}
                    >
                      {getSimplifiedRoundTitle(stage)}
                    </h3>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-[var(--outline)]">
                  {onExecuteStage && (() => {
                    const btn = getStageButtonConfig(stage);
                    const BtnIcon = btn.Icon;
                    return (
                      <button
                        type="button"
                        onClick={() => onExecuteStage(stage)}
                        className="md-button md-button--tonal inline-flex items-center gap-1.5"
                        style={{ fontSize: "12px", padding: "6px 13px" }}
                      >
                        <BtnIcon size={13} /> {btn.label}
                      </button>
                    );
                  })()}


                  {isEditable && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(idx)}
                        style={{
                          background: "var(--surface-high)",
                          border: "1px solid var(--outline)",
                          borderRadius: "8px",
                          padding: "6px",
                          cursor: "pointer",
                          color: "var(--muted)",
                          display: "flex",
                        }}
                        title="Edit Round"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, "up")}
                        disabled={idx === 0}
                        style={{
                          background: "var(--surface-high)",
                          border: "1px solid var(--outline)",
                          borderRadius: "8px",
                          padding: "6px",
                          cursor: idx === 0 ? "not-allowed" : "pointer",
                          color: "var(--muted)",
                          opacity: idx === 0 ? 0.3 : 1,
                          display: "flex",
                        }}
                        title="Move Up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, "down")}
                        disabled={isLast}
                        style={{
                          background: "var(--surface-high)",
                          border: "1px solid var(--outline)",
                          borderRadius: "8px",
                          padding: "6px",
                          cursor: isLast ? "not-allowed" : "pointer",
                          color: "var(--muted)",
                          opacity: isLast ? 0.3 : 1,
                          display: "flex",
                        }}
                        title="Move Down"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(idx)}
                        disabled={stages.length <= 1}
                        style={{
                          background: "#fde8e8",
                          border: "none",
                          borderRadius: "8px",
                          padding: "6px",
                          cursor: stages.length <= 1 ? "not-allowed" : "pointer",
                          color: "#c0392b",
                          opacity: stages.length <= 1 ? 0.3 : 1,
                          display: "flex",
                        }}
                        title="Remove Round"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Connecting line */}
              {!isLast && (
                <div
                  style={{
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: "2px",
                      height: "100%",
                      background: "var(--outline)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      width: "6px",
                      height: "6px",
                      borderRadius: "999px",
                      background: "var(--primary)",
                    }}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {isEditable && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "4px" }}>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="md-button md-button--tonal"
            style={{ fontSize: "12px", padding: "8px 18px" }}
          >
            <Plus size={14} /> Add Round
          </button>
        </div>
      )}

      <ConnectorNodeModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditIndex(null);
        }}
        onSave={handleSaveStage}
        initialStage={editIndex !== null ? stages[editIndex] : undefined}
        mode={editIndex !== null ? "edit" : "create"}
      />
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  Brain,
  Code,
  Terminal,
  Users,
  Settings,
  Pencil,
  Sparkles,
  Upload,
} from "lucide-react";
import { ConnectorNodeModal, ConnectorStageConfig } from "./connector-node-modal";

export interface PipelineStageItem {
  id?: string;
  type: string;
  title: string;
  description?: string | null;
  cutoff?: number;
  order: number;
  config?: string | null;
}

interface PipelineCanvasProps {
  stages: PipelineStageItem[];
  onChange: (newStages: PipelineStageItem[]) => void;
  onExecuteStage?: (stage: PipelineStageItem) => void;
  isEditable?: boolean;
}

const getRoundIcon = (type: string) => {
  switch (type) {
    case "RESUME_SCREENING":
      return FileText;
    case "APTITUDE":
      return Brain;
    case "DSA":
      return Code;
    case "TECHNICAL":
      return Terminal;
    case "HR_ROUND":
      return Users;
    default:
      return Settings;
  }
};

export function PipelineCanvas({
  stages,
  onChange,
  onExecuteStage,
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

  const handleSaveStage = (config: ConnectorStageConfig) => {
    const configString = JSON.stringify({
      cutoff: config.cutoff,
      inputType: config.inputType,
      inputSpecText: config.inputSpecText,
      outputSpecText: config.outputSpecText,
    });

    if (editIndex !== null && editIndex >= 0) {
      const updated = [...stages];
      updated[editIndex] = {
        ...updated[editIndex],
        type: config.type,
        title: config.title,
        description: config.description,
        cutoff: config.cutoff,
        config: configString,
      };
      onChange(updated);
    } else {
      const newStage: PipelineStageItem = {
        type: config.type,
        title: config.title,
        description: config.description,
        cutoff: config.cutoff,
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
            Configure First Connector Stage
          </h3>
          <p
            style={{
              fontSize: "13px",
              color: "var(--muted)",
              margin: 0,
              maxWidth: "420px",
            }}
          >
            Select your initial pipeline round (Resume Screening, Aptitude, DSA, Technical, HR, or Custom).
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
            Connector Pipeline Stages ({stages.length})
          </h2>
          <p style={{ fontSize: "12px", color: "var(--muted)", margin: "3px 0 0" }}>
            Modular sequence of screening &amp; evaluation rounds
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {stages.map((stage, idx) => {
          const Icon = getRoundIcon(stage.type);
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
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "var(--surface-purple)",
                      color: "var(--primary-deep)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    0{idx + 1}
                  </div>

                  {/* Icon */}
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      background: "var(--surface-high)",
                      border: "1px solid var(--outline)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--ink)",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>

                  {/* Details */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <h3
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "var(--ink)",
                          margin: 0,
                        }}
                      >
                        {stage.type === "RESUME_SCREENING" ? "RESUME SCREENING" : stage.title}
                      </h3>
                      {stage.type !== "RESUME_SCREENING" && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "999px",
                            background: "var(--surface-blue)",
                            color: "#1a6098",
                            textTransform: "uppercase",
                          }}
                        >
                          {stage.type.replace("_", " ")}
                        </span>
                      )}
                    </div>
                    {stage.type !== "RESUME_SCREENING" && stage.description && (
                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--muted)",
                          margin: "3px 0 0",
                        }}
                      >
                        {stage.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {onExecuteStage && stage.type === "RESUME_SCREENING" && (
                    <button
                      type="button"
                      onClick={() => onExecuteStage(stage)}
                      className="md-button md-button--tonal"
                      style={{ fontSize: "12px", padding: "6px 14px", gap: "5px" }}
                    >
                      <Upload size={14} /> Execute Stage
                    </button>
                  )}

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
                        title="Edit Stage"
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
                        title="Remove Stage"
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
            <Plus size={14} /> Add Connector Stage
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

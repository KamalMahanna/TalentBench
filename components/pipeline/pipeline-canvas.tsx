"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash,
  ArrowUp,
  ArrowDown,
  FileText,
  Brain,
  Code,
  TerminalWindow,
  UsersThree,
  Gear,
  PencilSimple,
  Sparkle,
  TrayArrowUp,
} from "@phosphor-icons/react";
import { ConnectorNodeModal, ConnectorStageConfig } from "./connector-node-modal";
import { GlassButton } from "@/components/ui/glass-button";

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
      return TerminalWindow;
    case "HR_ROUND":
      return UsersThree;
    default:
      return Gear;
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
      // Edit existing stage
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
      // Add new stage
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

  // ── EMPTY STATE: Centered Plus Icon Canvas ────────────────────────────
  if (stages.length === 0) {
    return (
      <div className="rounded-3xl p-1 bg-white/[0.04] ring-1 ring-[#8FB6E8]/20 backdrop-blur-2xl shadow-xl">
        <div className="rounded-[calc(1.5rem-4px)] bg-[#0A1228]/90 p-8 sm:p-14 border border-white/10 flex flex-col items-center justify-center text-center space-y-6 min-h-[320px]">
          {/* Centered Plus Icon Button */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="group relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-[#60A5FA]/20 via-[#3B82F6]/10 to-[#8FB6E8]/20 border border-[#60A5FA]/40 hover:border-[#60A5FA] shadow-[0_0_30px_rgba(96,165,250,0.25)] hover:shadow-[0_0_50px_rgba(96,165,250,0.5)] transition-all transform hover:scale-105 active:scale-95"
            title="Configure First Node"
          >
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#60A5FA] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#60A5FA]" />
            </span>
            <Plus
              size={36}
              weight="bold"
              className="text-[#60A5FA] group-hover:text-white transition-colors"
            />
          </button>

          <div className="space-y-1 max-w-md">
            <h3 className="text-base sm:text-lg font-display font-semibold text-white">
              Configure First Connector Stage
            </h3>
            <p className="text-xs text-[#7C91B4] leading-relaxed">
              Click the center plus icon to select your initial pipeline round (Resume Screening, Aptitude, DSA, Technical, HR, or Custom).
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#8FB6E8]">
              6 Modular Round Types
            </span>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#8FB6E8]">
              Input &amp; Output Specs
            </span>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#8FB6E8]">
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
      </div>
    );
  }

  // ── ACTIVE STAGES CANVAS: Connected Nodes with Cables ───────────────────
  return (
    <div className="rounded-3xl p-1 bg-white/[0.04] ring-1 ring-[#8FB6E8]/20 backdrop-blur-2xl shadow-xl">
      <div className="rounded-[calc(1.5rem-4px)] bg-[#070D1E] p-6 sm:p-8 border border-white/10 space-y-6">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-display font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#60A5FA] animate-pulse" />
              Connector Pipeline Stages ({stages.length})
            </h2>
            <p className="text-xs text-[#7C91B4] mt-0.5">
              Modular sequential stages. First stage processes candidate resumes; subsequent rounds advance qualified cohorts.
            </p>
          </div>

          {isEditable && (
            <GlassButton
              type="button"
              size="sm"
              variant="primary"
              onClick={handleOpenCreateModal}
            >
              <Plus size={14} className="mr-1.5" /> Add Next Stage
            </GlassButton>
          )}
        </div>

        {/* Connected Stages Sequence */}
        <div className="space-y-0">
          {stages.map((stage, idx) => {
            const Icon = getRoundIcon(stage.type);
            const isLast = idx === stages.length - 1;

            let cutoffVal = stage.cutoff || 50;
            if (stage.config) {
              try {
                const parsed = JSON.parse(stage.config);
                if (parsed.cutoff) cutoffVal = parsed.cutoff;
              } catch (e) {}
            }

            return (
              <div key={stage.id || idx} className="relative group">
                {/* Node Card */}
                <div className="rounded-2xl p-5 bg-[#0D1633] border border-[#8FB6E8]/20 hover:border-[#60A5FA]/50 transition-all shadow-lg hover:shadow-[0_0_25px_rgba(96,165,250,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Step Number */}
                    <div className="w-9 h-9 rounded-xl bg-[#60A5FA]/10 border border-[#60A5FA]/30 text-[#60A5FA] flex items-center justify-center font-mono text-xs font-bold shrink-0">
                      0{idx + 1}
                    </div>

                    {/* Round Icon */}
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#EAF1FB] shrink-0">
                      <Icon size={20} weight="duotone" />
                    </div>

                    {/* Details */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-white truncate">
                          {stage.title}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#60A5FA]/10 border border-[#60A5FA]/25 text-[#60A5FA] uppercase">
                          {stage.type.replace("_", " ")}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                          Cutoff: {cutoffVal} candidates
                        </span>
                      </div>
                      <p className="text-xs text-[#7C91B4] mt-1 line-clamp-1">
                        {stage.description || "Active evaluation gate in recruitment pipeline."}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Stage Controls */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {onExecuteStage && stage.type === "RESUME_SCREENING" && (
                      <button
                        type="button"
                        onClick={() => onExecuteStage(stage)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-mono transition-colors flex items-center gap-1.5"
                      >
                        <TrayArrowUp size={14} /> Execute Stage
                      </button>
                    )}

                    {isEditable && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(idx)}
                          className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-[#7C91B4] hover:text-white transition-colors"
                          title="Edit Stage Configuration"
                        >
                          <PencilSimple size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(idx, "up")}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-[#7C91B4] hover:text-white disabled:opacity-30 transition-colors"
                          title="Move Earlier"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(idx, "down")}
                          disabled={isLast}
                          className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-[#7C91B4] hover:text-white disabled:opacity-30 transition-colors"
                          title="Move Later"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(idx)}
                          disabled={stages.length <= 1}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 disabled:opacity-30 transition-colors ml-1"
                          title="Remove Stage"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Glowing Connector Cable between stages */}
                {!isLast && (
                  <div className="h-8 flex items-center justify-center my-1 relative">
                    <div className="w-0.5 h-full bg-gradient-to-b from-[#60A5FA] via-[#3B82F6] to-[#60A5FA] opacity-70" />
                    <div className="absolute w-2 h-2 rounded-full bg-[#60A5FA] shadow-[0_0_8px_#60A5FA]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Plus Adder Button at the bottom of the active pipeline */}
        {isEditable && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-dashed border-[#60A5FA]/40 hover:border-[#60A5FA] text-[#60A5FA] text-xs font-mono transition-all flex items-center gap-2"
            >
              <Plus size={14} /> Add Connector Stage
            </button>
          </div>
        )}

        {/* Modal */}
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
    </div>
  );
}


"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, AlertTriangle, Info, X, Loader2 } from "lucide-react";

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
  itemName?: string;
  itemTypeLabel?: string;
  warningNote?: string;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
  itemName,
  itemTypeLabel = "Target Item",
  warningNote,
}: ConfirmationModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen || !mounted) return null;

  const isDanger = variant === "danger";
  const isWarning = variant === "warning";

  const iconBg = isDanger
    ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
    : isWarning
    ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
    : "bg-blue-500/15 text-blue-500 border border-blue-500/30";

  const confirmBtnClasses = isDanger
    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_2px_10px_rgba(225,29,72,0.3)]"
    : isWarning
    ? "bg-amber-600 hover:bg-amber-500 text-white shadow-[0_2px_10px_rgba(217,119,6,0.3)]"
    : "bg-[var(--primary)] hover:opacity-90 text-[var(--on-primary)] shadow-[0_2px_10px_rgba(103,80,164,0.3)]";

  return createPortal(
    <div
      data-lenis-prevent
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        className="relative w-full max-w-md rounded-3xl p-6 sm:p-7 border shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--outline)",
          color: "var(--ink)",
        }}
      >
        {/* Top Header Strip with Icon */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl shrink-0 ${iconBg}`}>
              {isDanger ? (
                <Trash2 size={22} className="shrink-0" />
              ) : isWarning ? (
                <AlertTriangle size={22} className="shrink-0" />
              ) : (
                <Info size={22} className="shrink-0" />
              )}
            </div>
            <div>
              <h3
                id="confirmation-modal-title"
                className="text-base sm:text-lg font-bold leading-tight"
                style={{ color: "var(--ink)" }}
              >
                {title}
              </h3>
              {itemTypeLabel && (
                <span
                  className="text-[11px] font-mono uppercase tracking-wider block mt-0.5"
                  style={{ color: "var(--muted)" }}
                >
                  {itemTypeLabel}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-full hover:opacity-75 transition-colors cursor-pointer"
            style={{ color: "var(--muted)" }}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Item Spotlight Badge if provided */}
        {itemName && (
          <div
            className="px-3.5 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-mono"
            style={{
              backgroundColor: "var(--canvas)",
              borderColor: "var(--outline)",
              color: "var(--ink)",
            }}
          >
            <span style={{ color: "var(--muted)" }}>Target:</span>
            <span className="font-bold truncate">{itemName}</span>
          </div>
        )}

        {/* Description Body */}
        <div
          className="text-xs sm:text-sm leading-relaxed"
          style={{ color: "var(--muted)" }}
        >
          {description}
        </div>

        {/* Warning Callout if provided */}
        {warningNote && (
          <div className="p-3.5 rounded-xl border flex items-start gap-2 text-xs bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400 leading-normal">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>{warningNote}</span>
          </div>
        )}

        {/* Action Controls */}
        <div
          className="flex items-center justify-end gap-3 pt-3 border-t"
          style={{ borderColor: "var(--outline)" }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: "var(--canvas)",
              color: "var(--ink)",
              border: "1px solid var(--outline)",
            }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            disabled={isLoading}
            className={`px-5 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${confirmBtnClasses}`}
          >
            {isLoading && <Loader2 size={13} className="animate-spin" />}
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}


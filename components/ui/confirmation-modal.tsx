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

  const iconBgStyle: React.CSSProperties = isDanger
    ? {
        background: "rgba(239, 68, 68, 0.12)",
        color: "#dc2626",
        border: "1px solid rgba(239, 68, 68, 0.25)",
      }
    : isWarning
    ? {
        background: "rgba(245, 158, 11, 0.12)",
        color: "#d97706",
        border: "1px solid rgba(245, 158, 11, 0.25)",
      }
    : {
        background: "var(--surface-purple)",
        color: "var(--primary-deep)",
        border: "1px solid var(--outline)",
      };

  const confirmBtnStyle: React.CSSProperties = isDanger
    ? {
        background: "#dc2626",
        color: "#ffffff",
        boxShadow: "0 3px 12px rgba(220, 38, 38, 0.3)",
      }
    : isWarning
    ? {
        background: "#d97706",
        color: "#ffffff",
        boxShadow: "0 3px 12px rgba(217, 119, 6, 0.3)",
      }
    : {
        background: "var(--primary)",
        color: "var(--on-primary)",
        boxShadow: "0 3px 12px rgba(108, 76, 220, 0.25)",
      };

  return createPortal(
    <div
      data-lenis-prevent
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(0, 0, 0, 0.65)",
      }}
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
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "460px",
          background: "var(--surface-high)",
          border: "1px solid var(--outline)",
          borderRadius: "24px",
          padding: "26px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          boxShadow: "0 22px 55px rgba(27, 26, 34, 0.18)",
          fontFamily: '"DM Sans", system-ui, sans-serif',
          color: "var(--ink)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                ...iconBgStyle,
              }}
            >
              {isDanger ? (
                <Trash2 size={20} />
              ) : isWarning ? (
                <AlertTriangle size={20} />
              ) : (
                <Info size={20} />
              )}
            </div>
            <div>
              <h3
                id="confirmation-modal-title"
                style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "var(--ink)",
                  margin: 0,
                  letterSpacing: "-0.03em",
                }}
              >
                {title}
              </h3>
              {itemTypeLabel && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--muted)",
                    display: "block",
                    marginTop: "2px",
                  }}
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
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              borderRadius: "50%",
            }}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Item Spotlight Badge */}
        {itemName && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "14px",
              background: "var(--surface)",
              border: "1px solid var(--outline)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
            }}
          >
            <span style={{ color: "var(--muted)", fontWeight: 600 }}>Target:</span>
            <span style={{ color: "var(--ink)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {itemName}
            </span>
          </div>
        )}

        {/* Description Body */}
        <div
          style={{
            fontSize: "13px",
            color: "var(--muted)",
            lineHeight: 1.6,
          }}
        >
          {description}
        </div>

        {/* Warning Callout */}
        {warningNote && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "14px",
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.22)",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              fontSize: "12px",
              color: "#b45309",
              lineHeight: 1.5,
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{warningNote}</span>
          </div>
        )}

        {/* Action Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "10px",
            paddingTop: "14px",
            borderTop: "1px solid var(--outline)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="md-button md-button--text"
            style={{
              fontSize: "12px",
              minHeight: "38px",
              padding: "0 16px",
              color: "var(--muted)",
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
            className="md-button"
            style={{
              fontSize: "12px",
              minHeight: "38px",
              padding: "0 18px",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              ...confirmBtnStyle,
            }}
          >
            {isLoading && <Loader2 size={13} className="animate-spin" />}
            {isLoading ? "Deleting..." : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ChevronDown,
  Check,
  Zap,
} from "lucide-react";
import { StageStatus } from "./pipeline-canvas";

export interface RoundStatusOption {
  value: string;
  label: string;
  shortLabel: string;
  description: string;
  badgeStyle: {
    background: string;
    color: string;
    border: string;
  };
  Icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  pulse?: boolean;
}

export const ROUND_STATUS_OPTIONS: RoundStatusOption[] = [
  {
    value: "auto",
    label: "Auto (Calculated)",
    shortLabel: "Auto",
    description: "Dynamically evaluated from candidate progression",
    badgeStyle: {
      background: "var(--surface-purple)",
      color: "var(--primary-deep)",
      border: "1px solid var(--outline)",
    },
    Icon: Sparkles,
  },
  {
    value: "pending",
    label: "Not Finished / Pending",
    shortLabel: "Not Finished",
    description: "Awaiting candidate submissions or evaluation",
    badgeStyle: {
      background: "var(--round-pending-bg, var(--surface-purple))",
      color: "var(--round-pending-text, var(--primary-deep))",
      border: "1px solid var(--outline)",
    },
    Icon: Clock,
  },
  {
    value: "running",
    label: "Running",
    shortLabel: "Running",
    description: "Screening or test evaluations currently active",
    badgeStyle: {
      background: "var(--round-running-bg, #FEF3C7)",
      color: "var(--round-running-text, #92400E)",
      border: "1px solid var(--round-running-border, #FDE68A)",
    },
    Icon: Zap,
    pulse: true,
  },
  {
    value: "finished",
    label: "Finished",
    shortLabel: "Finished",
    description: "Candidates qualified or advanced past this round",
    badgeStyle: {
      background: "var(--round-finished-bg, #E8F5E9)",
      color: "var(--round-finished-text, #166534)",
      border: "1px solid var(--round-finished-border, #C7EED8)",
    },
    Icon: CheckCircle2,
  },
  {
    value: "failed",
    label: "Failed",
    shortLabel: "Failed",
    description: "All evaluated candidates in this round were rejected",
    badgeStyle: {
      background: "var(--round-failed-bg, #FEE2E2)",
      color: "var(--round-failed-text, #991B1B)",
      border: "1px solid var(--round-failed-border, #FECACA)",
    },
    Icon: XCircle,
  },
];

interface RoundStatusDropdownProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

export function RoundStatusDropdown({
  value,
  onChange,
  disabled = false,
  compact = false,
  className = "",
}: RoundStatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedValue = (value || "auto").toLowerCase();
  const currentOption =
    ROUND_STATUS_OPTIONS.find((opt) => opt.value === normalizedValue) ||
    ROUND_STATUS_OPTIONS[0];

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const IconComponent = currentOption.Icon;

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${compact ? "" : "w-full"} ${className}`}
      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
    >
      {/* Trigger Button */}
      {compact ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setIsOpen(!isOpen);
          }}
          disabled={disabled}
          style={{
            ...currentOption.badgeStyle,
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 8px 3px 6px",
            borderRadius: "999px",
            fontSize: "11px",
            fontWeight: 700,
            cursor: disabled ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
            boxShadow: isOpen ? "0 0 0 2px var(--primary)" : "none",
          }}
          className={currentOption.pulse ? "round-no-running" : ""}
          title={`Status: ${currentOption.label} · Click to change`}
        >
          <IconComponent size={11} />
          <span>{currentOption.shortLabel}</span>
          <ChevronDown
            size={11}
            style={{
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.18s ease",
              opacity: 0.7,
            }}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (!disabled) setIsOpen(!isOpen);
          }}
          disabled={disabled}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface)",
            border: isOpen ? "1px solid var(--primary)" : "1px solid var(--outline)",
            borderRadius: "12px",
            padding: "8px 12px",
            fontSize: "13px",
            color: "var(--ink)",
            cursor: disabled ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
            outline: "none",
            boxShadow: isOpen ? "0 0 0 2px rgba(108, 76, 220, 0.15)" : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                ...currentOption.badgeStyle,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 8px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 700,
              }}
              className={currentOption.pulse ? "round-no-running" : ""}
            >
              <IconComponent size={11} />
              <span>{currentOption.shortLabel}</span>
            </span>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              ({currentOption.label})
            </span>
          </div>

          <ChevronDown
            size={14}
            style={{
              color: "var(--muted)",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.18s ease",
            }}
          />
        </button>
      )}

      {/* Themed Dropdown Menu Popover */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: compact ? "auto" : 0,
            right: compact ? 0 : "auto",
            minWidth: compact ? "240px" : "100%",
            background: "var(--surface-high)",
            border: "1px solid var(--outline)",
            borderRadius: "16px",
            padding: "6px",
            boxShadow: "0 14px 38px rgba(27, 26, 34, 0.18)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: "6px 10px 4px",
              fontSize: "10px",
              fontWeight: 700,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              borderBottom: "1px solid var(--outline)",
              marginBottom: "4px",
            }}
          >
            Select Round Status
          </div>

          {ROUND_STATUS_OPTIONS.map((opt) => {
            const isSelected = opt.value === normalizedValue;
            const OptIcon = opt.Icon;

            return (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  background: isSelected ? "var(--surface-purple)" : "transparent",
                  transition: "background 0.12s ease",
                }}
                className="hover:bg-[var(--surface)]"
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", minWidth: 0 }}>
                  <span
                    style={{
                      ...opt.badgeStyle,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "22px",
                      height: "22px",
                      borderRadius: "6px",
                      flexShrink: 0,
                      marginTop: "1px",
                    }}
                    className={opt.pulse ? "round-no-running" : ""}
                  >
                    <OptIcon size={12} />
                  </span>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: isSelected ? 700 : 600,
                        color: "var(--ink)",
                        lineHeight: 1.2,
                      }}
                    >
                      {opt.label}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--muted)",
                        marginTop: "2px",
                        lineHeight: 1.3,
                      }}
                    >
                      {opt.description}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <Check
                    size={14}
                    style={{ color: "var(--primary)", flexShrink: 0, marginLeft: "6px" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

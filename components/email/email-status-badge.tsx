"use client";

import React from "react";
import { CheckCircle2, XCircle, Mail, RotateCw } from "lucide-react";

interface EmailStatusBadgeProps {
  status?: "SENT" | "FAILED" | "NOT_SENT" | string | null;
  sentAt?: string | null;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
  size?: "sm" | "md";
}

export function EmailStatusBadge({
  status,
  sentAt,
  error,
  onRetry,
  className = "",
  size = "md",
}: EmailStatusBadgeProps) {
  const isSmall = size === "sm";

  const formattedTime = sentAt
    ? (() => {
        try {
          const date = new Date(sentAt);
          return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } catch {
          return null;
        }
      })()
    : null;

  if (status === "SENT") {
    return (
      <span
        title={sentAt ? `Dispatched on ${new Date(sentAt).toLocaleString()}` : "Email dispatched"}
        className={`inline-flex items-center gap-1 font-mono font-medium rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 ${
          isSmall ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
        } ${className}`}
      >
        <CheckCircle2 size={isSmall ? 11 : 13} className="shrink-0" />
        <span>Mail Sent</span>
        {formattedTime && <span className="opacity-75 text-[10px]">({formattedTime})</span>}
      </span>
    );
  }

  if (status === "FAILED") {
    return (
      <span
        title={error || "Delivery failed. Click retry to attempt sending again."}
        className={`inline-flex items-center gap-1 font-mono font-medium rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 ${
          isSmall ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
        } ${className}`}
      >
        <XCircle size={isSmall ? 11 : 13} className="shrink-0" />
        <span className="truncate max-w-[90px] sm:max-w-none">Send Failed</span>
        {onRetry && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
            className="hover:underline ml-0.5 cursor-pointer flex items-center gap-0.5 text-[10px]"
            title="Retry sending"
          >
            <RotateCw size={10} /> Retry
          </button>
        )}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-normal rounded-full border ${
        isSmall ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      } ${className}`}
      style={{
        backgroundColor: "var(--canvas)",
        borderColor: "var(--outline)",
        color: "var(--muted)",
      }}
    >
      <Mail size={isSmall ? 11 : 13} className="shrink-0 opacity-70" />
      <span>Not Sent</span>
    </span>
  );
}


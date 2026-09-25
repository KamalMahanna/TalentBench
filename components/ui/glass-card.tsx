"use client";

// GlassCard → M3 surface card stub for backward compatibility

import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div
      className={cn(className)}
      style={{
        background: "var(--surface-high)",
        border: "1px solid var(--outline)",
        borderRadius: "24px",
        padding: "32px",
        boxShadow: "0 22px 55px rgba(60,48,83,0.1)",
      }}
    >
      {children}
    </div>
  );
}

export default GlassCard;


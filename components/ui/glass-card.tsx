import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "accent" | "bordered" | "interactive";
  glow?: boolean;
}

export function GlassCard({
  children,
  className,
  variant = "default",
  glow = false,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-3xl p-1.5 transition-all duration-500 ease-out-expo group",
        "bg-white/[0.04] ring-1 ring-white/[0.12] hover:ring-[#8FB6E8]/40",
        variant === "accent" && "ring-[#8FB6E8]/40 bg-[#10162E]/60",
        glow && "before:absolute before:-inset-px before:rounded-3xl before:bg-gradient-to-b before:from-[#8FB6E8]/25 before:to-transparent before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "relative h-full w-full rounded-[calc(1.5rem-4px)] p-6 md:p-8 overflow-hidden",
          "glass-card-dark",
          "transition-colors duration-500",
          variant === "accent" && "border-[#8FB6E8]/30"
        )}
      >
        {/* Subtle top edge highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8FB6E8]/35 to-transparent" />
        {children}
      </div>
    </div>
  );
}

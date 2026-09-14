import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: "default" | "ice" | "emerald" | "cyan" | "amber" | "rose" | "purple" | "success" | "destructive" | "secondary";
  pulse?: boolean;
}

export function Badge({
  children,
  className,
  variant = "ice",
  pulse = false,
  ...props
}: BadgeProps) {
  const variantClasses = {
    default: "bg-white/[0.05] text-[#EAF1FB] border border-white/10",
    ice: "bg-white/5 border border-white/10 text-[#8FB6E8] shadow-[0_4px_20px_rgba(143,182,232,0.15)]",
    emerald: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25",
    cyan: "bg-cyan-500/10 text-cyan-300 border border-cyan-500/25",
    amber: "bg-amber-500/10 text-amber-300 border border-amber-500/25",
    rose: "bg-rose-500/10 text-rose-300 border border-rose-500/25",
    purple: "bg-purple-500/10 text-purple-300 border border-purple-500/25",
    success: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25",
    destructive: "bg-rose-500/10 text-rose-300 border border-rose-500/25",
    secondary: "bg-white/5 border border-white/10 text-[#8FB6E8]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium tracking-widest uppercase font-mono backdrop-blur-md",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8FB6E8] opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#8FB6E8]" />
        </span>
      )}
      {children}
    </span>
  );
}

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useTheme } from "@/context/theme-context";

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "glass" | "danger";
  size?: "sm" | "md" | "lg";
  withArrow?: boolean;
  href?: string;
  className?: string;
}

export function GlassButton({
  children,
  variant = "primary",
  size = "md",
  withArrow = false,
  href,
  className,
  ...props
}: GlassButtonProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const sizeClasses = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-3.5 text-base",
  };

  const variantClasses = {
    primary: isLight
      ? "bg-[#101B37] hover:bg-[#0C1A38] text-white keep-white shadow-[0_10px_25px_-8px_rgba(16,27,55,0.3)] border border-[#305A9C]/40 hover:border-[#305A9C]"
      : "bg-[#0B1226] hover:bg-[#141E3C] text-[#EAF1FB] border border-[#8FB6E8]/40 hover:border-[#8FB6E8] shadow-[0_12px_35px_-10px_rgba(143,182,232,0.35)]",
    secondary: isLight
      ? "bg-slate-100/90 hover:bg-slate-200 text-slate-800 border border-slate-300 shadow-sm"
      : "bg-[#0E152E]/90 hover:bg-[#141E3F] text-[#EAF1FB] border border-white/15 hover:border-[#8FB6E8]/40 shadow-[0_10px_25px_-10px_rgba(6,11,24,0.7)]",
    glass: isLight
      ? "bg-white/80 hover:bg-white text-slate-800 border border-slate-200 shadow-sm backdrop-blur-xl"
      : "bg-white/[0.04] hover:bg-white/[0.09] text-[#EAF1FB] border border-[#8FB6E8]/20 backdrop-blur-xl",
    danger:
      "bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 border border-rose-500/30",
  };

  const content = (
    <>
      <span className="tracking-wide font-medium">{children}</span>
      {withArrow && (
        <span
          className={cn(
            "ml-2 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-1",
            isLight && variant === "primary" ? "text-blue-200" : "text-[#8FB6E8]"
          )}
        >
          <ArrowRight size={size === "sm" ? 13 : size === "md" ? 15 : 17} weight="bold" />
        </span>
      )}
    </>
  );

  const combinedClasses = cn(
    "group inline-flex items-center justify-center rounded-full transition-all duration-200 ease-out-expo active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none",
    sizeClasses[size],
    variantClasses[variant],
    className
  );

  if (href) {
    return (
      <Link href={href} className={combinedClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button className={combinedClasses} {...props}>
      {content}
    </button>
  );
}

"use client";

// GlassButton → M3 pill button stub
// Retained for backward compatibility while pages are being migrated.
// The real M3 button is .md-button in globals.css

import React from "react";
import Link from "next/link";

interface GlassButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "glass" | "danger";
  size?: "sm" | "md" | "lg";
  withArrow?: boolean;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
  title?: string;
}

export function GlassButton({
  children,
  variant = "secondary",
  size,
  withArrow,
  href,
  onClick,
  type = "button",
  disabled,
  className = "",
  title,
}: GlassButtonProps) {
  const cls =
    variant === "primary"
      ? `md-button md-button--filled ${className}`
      : variant === "danger"
      ? `md-button ${className}`
      : `md-button md-button--tonal ${className}`;

  const dangerStyle: React.CSSProperties =
    variant === "danger"
      ? { background: "#fde8e8", color: "#c0392b" }
      : {};

  if (href) {
    return (
      <Link href={href} className={cls} style={dangerStyle} title={title}>
        {children}
        {withArrow && " →"}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cls}
      title={title}
      style={{ ...dangerStyle, opacity: disabled ? 0.6 : 1 }}
    >
      {children}
      {withArrow && " →"}
    </button>
  );
}

export default GlassButton;


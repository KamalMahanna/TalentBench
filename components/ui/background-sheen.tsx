"use client";

import React from "react";
import { useTheme } from "@/context/theme-context";

export function TopAtmosphericSheen() {
  const { theme } = useTheme();
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed top-0 inset-x-0 h-96 z-0 transition-opacity duration-700 ${
        theme === "light"
          ? "bg-gradient-to-b from-[#8FB6E8]/15 via-white/40 to-transparent"
          : "bg-gradient-to-b from-white/[0.04] via-white/[0.015] to-transparent"
      }`}
    />
  );
}


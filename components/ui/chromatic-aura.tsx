"use client";

import React from "react";
import { useTheme } from "@/context/theme-context";

export function ChromaticGlassAura() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-0 select-none transition-opacity duration-700"
    >
      {/* Orb 1: Soft Pastel Lilac / Violet Glow (Top-Left) */}
      <div
        className={`absolute -top-24 -left-24 sm:-top-32 sm:-left-32 w-[600px] sm:w-[750px] h-[600px] sm:h-[750px] rounded-full blur-[130px] sm:blur-[160px] transition-all duration-700 ${
          isLight
            ? "bg-gradient-to-br from-[#DDD6FE]/70 via-[#C084FC]/50 to-[#A78BFA]/30 opacity-75"
            : "bg-gradient-to-br from-[#7C3AED]/20 via-[#9333EA]/15 to-[#6366F1]/10 opacity-60"
        }`}
        style={{
          animation: "auraFloat1 18s ease-in-out infinite alternate",
        }}
      />

      {/* Orb 2: Radiant Sky Blue / Celestial Periwinkle Glow (Center / Top-Right) */}
      <div
        className={`absolute top-1/4 left-1/3 sm:left-1/2 -translate-x-1/2 w-[550px] sm:w-[700px] h-[550px] sm:h-[700px] rounded-full blur-[130px] sm:blur-[160px] transition-all duration-700 ${
          isLight
            ? "bg-gradient-to-tr from-[#BAE6FD]/80 via-[#93C5FD]/60 to-[#8FB6E8]/40 opacity-80"
            : "bg-gradient-to-tr from-[#38BDF8]/18 via-[#60A5FA]/12 to-[#8FB6E8]/10 opacity-60"
        }`}
        style={{
          animation: "auraFloat2 22s ease-in-out infinite alternate",
        }}
      />

      {/* Orb 3: Warm Soft Blush Rose / Peach Glow (Bottom-Right) */}
      <div
        className={`absolute -bottom-20 -right-20 sm:-bottom-32 sm:-right-32 w-[550px] sm:w-[700px] h-[550px] sm:h-[700px] rounded-full blur-[130px] sm:blur-[160px] transition-all duration-700 ${
          isLight
            ? "bg-gradient-to-tl from-[#FBCFE8]/75 via-[#FDA4AF]/55 to-[#F472B6]/35 opacity-70"
            : "bg-gradient-to-tl from-[#E11D48]/15 via-[#DB2777]/12 to-[#C026D3]/10 opacity-55"
        }`}
        style={{
          animation: "auraFloat3 20s ease-in-out infinite alternate",
        }}
      />

      {/* Orb 4: Subtle Mid-Bottom Indigo / Lavender Secondary Accent */}
      <div
        className={`absolute bottom-1/4 left-10 sm:left-24 w-[450px] sm:w-[550px] h-[450px] sm:h-[550px] rounded-full blur-[120px] sm:blur-[150px] transition-all duration-700 ${
          isLight
            ? "bg-gradient-to-r from-[#E0E7FF]/70 via-[#C7D2FE]/50 to-[#DDD6FE]/40 opacity-65"
            : "bg-gradient-to-r from-[#4F46E5]/15 via-[#6366F1]/10 to-transparent opacity-50"
        }`}
        style={{
          animation: "auraFloat4 25s ease-in-out infinite alternate",
        }}
      />
    </div>
  );
}

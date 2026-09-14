"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { GlassButton } from "./glass-button";
import { Sparkle, List, X, Sun, Moon } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "@/context/theme-context";

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  const navLinks = [
    { label: "Pipeline", href: "#pipeline" },
    { label: "AI Screening", href: "#ai-screening" },
    { label: "Architecture", href: "#architecture" },
    { label: "Reviews", href: "#reviews" },
  ];

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 px-4 pt-5 pointer-events-none">
        <nav
          className={`mx-auto max-w-4xl h-14 px-4 sm:px-6 rounded-full backdrop-blur-2xl flex items-center justify-between pointer-events-auto transition-all duration-300 ${
            isLight
              ? "bg-white/85 border border-white/70 shadow-[0_12px_36px_rgba(0,0,0,0.08),0_1px_0_0_rgba(255,255,255,0.9)_inset] text-slate-800"
              : "bg-gradient-to-r from-white/[0.12] via-[#0B1226]/85 to-white/[0.08] border border-[#8FB6E8]/20 shadow-[0_16px_40px_-10px_rgba(4,8,20,0.85),0_1px_0_0_rgba(255,255,255,0.3)_inset] text-[#EAF1FB]"
          }`}
        >
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 flex items-center justify-center transition-transform duration-300 ease-out-expo group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="TalentBench Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <span className={`font-display font-semibold text-base tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
              Talent<span className={isLight ? "text-blue-600" : "text-[#8FB6E8]"}>Bench</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className={`hidden md:flex items-center gap-7 text-xs font-medium ${isLight ? "text-slate-600" : "text-[#7C91B4]"}`}>
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`transition-colors duration-200 ${
                  isLight ? "hover:text-slate-950 font-medium" : "hover:text-[#EAF1FB]"
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Action CTAs & Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sun / Moon Theme Toggle */}
            <button
              id="theme-toggle-button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className={`p-2 rounded-full border transition-all duration-200 cursor-pointer flex items-center justify-center ${
                isLight
                  ? "bg-slate-100/80 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-sm"
                  : "bg-white/5 hover:bg-white/10 text-[#7C91B4] hover:text-white border-white/15"
              }`}
            >
              {theme === "dark" ? (
                <Sun size={15} weight="bold" className="text-amber-300 transition-transform duration-300 hover:rotate-45" />
              ) : (
                <Moon size={15} weight="bold" className="text-indigo-600 transition-transform duration-300 hover:-rotate-12" />
              )}
            </button>

            <Link
              href="/login"
              className={`hidden sm:inline text-xs font-medium px-3 py-1.5 transition-colors ${
                isLight ? "text-slate-600 hover:text-slate-950" : "text-[#7C91B4] hover:text-[#EAF1FB]"
              }`}
            >
              Sign In
            </Link>
            <GlassButton size="sm" variant="primary" withArrow href="/dashboard">
              Dashboard
            </GlassButton>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`sm:hidden p-2 focus:outline-none ${
                isLight ? "text-slate-700 hover:text-slate-950" : "text-[#7C91B4] hover:text-white"
              }`}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X size={20} /> : <List size={20} />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className={`fixed inset-x-4 top-24 z-50 p-6 rounded-3xl backdrop-blur-3xl border sm:hidden shadow-2xl ${
              isLight
                ? "bg-white/95 border-slate-200 text-slate-900"
                : "bg-[#0A1228]/95 border-[#8FB6E8]/25 text-[#EAF1FB]"
            }`}
          >
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`text-base font-medium py-2 border-b ${
                    isLight
                      ? "text-slate-700 hover:text-slate-950 border-slate-100"
                      : "text-[#7C91B4] hover:text-white border-white/5"
                  }`}
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-2 flex flex-col gap-3">
                <GlassButton variant="secondary" href="/login" className="w-full">
                  Sign In
                </GlassButton>
                <GlassButton variant="primary" withArrow href="/dashboard" className="w-full">
                  Open Dashboard
                </GlassButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

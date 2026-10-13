"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/context/theme-context";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
  Briefcase,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  User,
  X,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    company?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch((err) => console.error("Error fetching user session:", err));
  }, []);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Handle ESC key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out successfully.");
    router.push("/login");
  };

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: BarChart3 },
    { label: "Job Profiles", href: "/dashboard/jobs", icon: Briefcase },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--canvas)] text-[var(--ink)]">
      {/* ── MOBILE TOP APP BAR (Visible on < lg) ── */}
      <header className="lg:hidden sticky top-0 z-30 w-full h-16 px-4 bg-[var(--surface-high)]/90 backdrop-blur-md border-b border-[var(--outline)] flex items-center justify-between">
        <Link href="/" className="brand text-sm sm:text-base flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="TalentBench Logo"
            width={26}
            height={26}
            className="w-6.5 h-6.5 object-contain"
            priority
          />
          <span className="font-bold tracking-tight">TalentBench</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--outline)] text-[var(--primary)] flex items-center justify-center hover:border-[var(--primary)] transition-colors cursor-pointer"
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--outline)] text-[var(--ink)] flex items-center justify-center hover:border-[var(--primary)] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* ── MOBILE SLIDE-OVER DRAWER & BACKDROP ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 260 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw] bg-[var(--surface-high)] border-r border-[var(--outline)] flex flex-col justify-between p-5 shadow-2xl overflow-y-auto"
            >
              <div>
                {/* Header in Drawer */}
                <div className="flex items-center justify-between pb-5 mb-5 border-b border-[var(--outline)]">
                  <Link href="/" className="brand text-base flex items-center gap-2.5">
                    <Image
                      src="/logo.png"
                      alt="TalentBench Logo"
                      width={28}
                      height={28}
                      className="w-7 h-7 object-contain"
                    />
                    <span className="font-bold">TalentBench</span>
                  </Link>

                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
                    aria-label="Close menu"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Nav Links */}
                <nav className="flex flex-col gap-1.5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                          isActive
                            ? "bg-[var(--surface-purple)] text-[var(--primary-deep)] font-semibold shadow-xs"
                            : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                        }`}
                      >
                        <Icon size={17} className={isActive ? "text-[var(--primary)]" : ""} />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* User Profile + Logout in Mobile Drawer */}
              <div className="pt-4 border-t border-[var(--outline)] mt-6 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[var(--surface-purple)] text-[var(--primary)] flex items-center justify-center shrink-0">
                    <User size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--ink)] truncate">
                      {user?.name || "HR Admin"}
                    </div>
                    <div className="text-[10px] text-[var(--muted)] truncate">
                      {user?.company || "Talent Operations"}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── DESKTOP SIDEBAR (Visible on lg and above) ── */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col justify-between border-r border-[var(--outline)] bg-[var(--surface-high)] p-6 sticky top-0 h-screen overflow-y-auto">
        <div>
          {/* Brand + Theme Toggle */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="brand text-[15px] flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt="TalentBench Logo"
                width={28}
                height={28}
                className="w-7 h-7 object-contain"
                priority
              />
              <span className="font-bold">TalentBench</span>
            </Link>
            <button
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light" : "Switch to dark"}
              className="bg-[var(--surface)] border border-[var(--outline)] rounded-xl p-2 cursor-pointer text-[var(--primary)] flex items-center justify-center hover:border-[var(--primary)] transition-colors"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {/* Desktop Nav Links */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-all ${
                    isActive
                      ? "bg-[var(--surface-purple)] text-[var(--primary-deep)] font-semibold"
                      : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)] font-medium"
                  }`}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile + Logout */}
        <div className="border-t border-[var(--outline)] pt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[var(--surface-purple)] text-[var(--primary)] flex items-center justify-center shrink-0">
              <User size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--ink)] truncate">
                {user?.name || "HR Admin"}
              </div>
              <div className="text-[10px] text-[var(--muted)] truncate">
                {user?.company || "Talent Operations"}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="text-[var(--muted)] hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 xl:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

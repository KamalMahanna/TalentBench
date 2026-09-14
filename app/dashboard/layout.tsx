"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/context/theme-context";
import {
  Briefcase,
  SquaresFour,
  PlusCircle,
  Sparkle,
  SignOut,
  UserCircle,
  Sun,
  Moon,
  UsersThree,
  TrayArrowUp,
  GearSix,
} from "@phosphor-icons/react";
import { toast } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
  const [user, setUser] = useState<{ name: string; email: string; company?: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch((err) => console.error("Error fetching user session:", err));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out successfully.");
    router.push("/login");
  };

  const navItems = [
    { label: "Dashboard Overview", href: "/dashboard", icon: SquaresFour },
    { label: "Job Profiles", href: "/dashboard/jobs", icon: Briefcase },
    { label: "Candidate Pool", href: "/dashboard/candidates", icon: UsersThree },
    { label: "Bulk Ingestion", href: "/dashboard/upload", icon: TrayArrowUp },
    { label: "Settings", href: "/dashboard/settings", icon: GearSix },
    { label: "New Job Profile", href: "/dashboard/jobs/new", icon: PlusCircle },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${
        isLight ? "bg-[#F6F9FD] text-slate-900" : "bg-[#0A1228] text-[#EAF1FB]"
      }`}
    >
      {/* Fixed/Sticky Glassmorphic Sidebar in Royal Navy / Clean White */}
      <aside
        className={`w-full md:w-64 border-b md:border-b-0 md:border-r p-6 flex flex-col justify-between shrink-0 z-30 transition-colors duration-300 ${
          isLight
            ? "border-slate-200/80 bg-white/95 text-slate-800 shadow-[2px_0_20px_rgba(0,0,0,0.03)]"
            : "border-[#8FB6E8]/15 bg-[#060B18]/90 text-[#EAF1FB] backdrop-blur-2xl"
        }`}
      >
        <div>
          {/* Brand & Theme Switcher Header */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                <Image
                  src="/logo.png"
                  alt="TalentBench Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className={`font-display font-semibold text-base tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                  Talent<span className={isLight ? "text-blue-600" : "text-[#8FB6E8]"}>Bench</span>
                </span>
                <span className={`block text-[10px] font-mono uppercase tracking-wider ${isLight ? "text-slate-500" : "text-[#7C91B4]"}`}>
                  HR WORKSPACE
                </span>
              </div>
            </Link>

            {/* Light / Dark Mode Toggle Button */}
            <button
              id="dashboard-theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className={`p-1.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-sm"
                  : "bg-white/5 hover:bg-white/10 text-[#7C91B4] hover:text-white border-white/15"
              }`}
            >
              {theme === "dark" ? (
                <Sun size={15} weight="bold" className="text-amber-300" />
              ) : (
                <Moon size={15} weight="bold" className="text-indigo-600" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
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
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? isLight
                        ? "bg-blue-50 text-blue-700 border border-blue-200 font-semibold shadow-sm"
                        : "bg-[#8FB6E8]/15 text-white border border-[#8FB6E8]/35 shadow-[0_0_20px_rgba(143,182,232,0.15)]"
                      : isLight
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                      : "text-[#7C91B4] hover:text-[#EAF1FB] hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon size={18} weight={isActive ? "duotone" : "regular"} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Quick System Indicators */}
          <div className={`mt-8 pt-6 border-t ${isLight ? "border-slate-200" : "border-white/10"}`}>
            <div className={`text-[11px] font-mono uppercase mb-3 ${isLight ? "text-slate-500" : "text-[#7C91B4]"}`}>
              Infrastructure
            </div>
            <div className={`space-y-2 text-xs font-mono ${isLight ? "text-slate-600" : "text-[#7C91B4]"}`}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isLight ? "bg-emerald-500" : "bg-[#8FB6E8]"}`} />
                  AI Screener
                </span>
                <span className={isLight ? "text-emerald-600 font-semibold" : "text-[#8FB6E8]"}>Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Trace Engine</span>
                <span className={isLight ? "text-slate-400" : "text-[#7C91B4]/70"}>v2.4 Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* User profile & Logout */}
        <div className={`pt-6 border-t mt-8 md:mt-0 ${isLight ? "border-slate-200" : "border-white/10"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isLight
                    ? "bg-blue-50 text-blue-600 border border-blue-200"
                    : "bg-white/[0.05] ring-1 ring-white/15 text-[#8FB6E8]"
                }`}
              >
                <UserCircle size={20} weight="duotone" />
              </div>
              <div className="truncate">
                <div className={`text-xs font-medium truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                  {user?.name || "HR Admin"}
                </div>
                <div className={`text-[10px] font-mono truncate ${isLight ? "text-slate-500" : "text-[#7C91B4]"}`}>
                  {user?.company || "Talent Operations"}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className={`p-1.5 rounded-lg transition-colors ${
                isLight
                  ? "text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                  : "text-[#7C91B4] hover:text-rose-400 hover:bg-rose-500/10"
              }`}
              title="Sign Out"
            >
              <SignOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto overflow-y-auto w-full">
        {children}
      </main>
    </div>
  );
}

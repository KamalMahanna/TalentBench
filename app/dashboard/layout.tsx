"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/context/theme-context";
import { toast } from "sonner";
import {
  BarChart3,
  Briefcase,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sparkles,
  Sun,
  User,
  Users,
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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out successfully.");
    router.push("/login");
  };

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: BarChart3 },
    { label: "Job Profiles", href: "/dashboard/jobs", icon: Briefcase },
    { label: "Candidate Pool", href: "/dashboard/candidates", icon: Users },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
    { label: "New Job Profile", href: "/dashboard/jobs/new", icon: Plus },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "row",
        background: "var(--canvas)",
        color: "var(--ink)",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: "240px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRight: "1px solid var(--outline)",
          background: "var(--surface-high)",
          padding: "24px 16px",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        <div>
          {/* Brand + Theme Toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "32px",
            }}
          >
            <Link href="/" className="brand" style={{ fontSize: "15px" }}>
              <Image
                src="/logo.png"
                alt="TalentBench Logo"
                width={28}
                height={28}
                className="w-7 h-7 object-contain"
                priority
              />
              <span>TalentBench</span>
            </Link>
            <button
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light" : "Switch to dark"}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--outline)",
                borderRadius: "10px",
                padding: "6px",
                cursor: "pointer",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {/* Nav Links */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "9px 12px",
                    borderRadius: "12px",
                    fontSize: "13px",
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: "none",
                    transition: "all 0.15s",
                    background: isActive ? "var(--surface-purple)" : "transparent",
                    color: isActive ? "var(--primary-deep)" : "var(--muted)",
                  }}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile + Logout */}
        <div
          style={{
            borderTop: "1px solid var(--outline)",
            paddingTop: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "999px",
                background: "var(--surface-purple)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: "var(--primary)",
              }}
            >
              <User size={17} />
            </div>
            <div style={{ overflow: "hidden" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--ink)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.name || "HR Admin"}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.company || "Talent Operations"}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--muted)",
              padding: "4px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          padding: "40px 48px",
          overflowY: "auto",
          minWidth: 0,
        }}
      >
        {children}
      </main>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { GlassButton } from "@/components/ui/glass-button";
import { Badge } from "@/components/ui/badge";
import {
  GearSix,
  UsersThree,
  Building,
  EnvelopeSimple,
  Sliders,
  PaintBrush,
  UserPlus,
  Trash,
  CheckCircle,
  Copy,
  FloppyDisk,
  ShieldCheck,
  Lightning,
  Eye,
  Sun,
  Moon,
  Key,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useTheme } from "@/context/theme-context";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status: string;
  joinedAt: string;
}

interface SettingsData {
  org: {
    name: string;
    domain: string;
    seatsTotal: number;
    seatsUsed: number;
    careerWebhook: string;
  };
  members: Member[];
  templates: {
    shortlist: string;
    rejection: string;
    review: string;
  };
  rubrics: {
    experienceToleranceYears: number;
    strictKeywordMatching: boolean;
    autoShortlistScoreThreshold: number;
    autoRejectScoreThreshold: number;
    enableDeterministicTracers: boolean;
  };
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  const [activeTab, setActiveTab] = useState<"team" | "org" | "templates" | "rubrics" | "appearance">("team");
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("recruiter");

  // Selected email template subtab
  const [templateSubTab, setTemplateSubTab] = useState<"shortlist" | "rejection" | "review">("shortlist");

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setSettings(data.settings);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading settings:", err);
        setLoading(false);
      });
  }, []);

  const handleSaveSettings = async (overrideData?: any) => {
    setSaving(true);
    try {
      const payload = overrideData || {
        org: settings?.org,
        templates: settings?.templates,
        rubrics: settings?.rubrics,
      };

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save settings.");
        setSaving(false);
        return;
      }

      setSettings(data.settings);
      toast.success("Settings updated successfully!");
      setSaving(false);
    } catch (err) {
      toast.error("Network error saving settings.");
      setSaving(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error("Please provide an email address.");
      return;
    }

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newMember: {
            email: inviteEmail.trim(),
            role: inviteRole,
          },
        }),
      });

      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
        toast.success(`Invite sent to ${inviteEmail}`);
        setShowInviteModal(false);
        setInviteEmail("");
      }
    } catch (err) {
      toast.error("Failed to send invite.");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to revoke this member's access?")) return;

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeMemberId: memberId }),
      });

      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
        toast.success("Team member access revoked.");
      }
    } catch (err) {
      toast.error("Failed to remove team member.");
    }
  };

  const insertVariableTag = (tag: string) => {
    if (!settings) return;
    const currentText = settings.templates[templateSubTab];
    const updated = currentText + " " + tag;
    setSettings({
      ...settings,
      templates: {
        ...settings.templates,
        [templateSubTab]: updated,
      },
    });
    toast.info(`Inserted ${tag}`);
  };

  if (loading || !settings) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-40 rounded-xl bg-white/5 animate-pulse" />
        <div className="h-96 rounded-3xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className={`text-2xl sm:text-3xl font-display font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
              Workspace &amp; Recruiter Settings
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#8FB6E8]/15 text-[#8FB6E8] border border-[#8FB6E8]/25">
              Organization Admin
            </span>
          </div>
          <p className={`text-xs sm:text-sm mt-1 ${isLight ? "text-slate-600" : "text-[#7C91B4]"}`}>
            Configure hiring teams, automated candidate communication, and AI evaluation strictness.
          </p>
        </div>

        <GlassButton variant="primary" onClick={() => handleSaveSettings()} disabled={saving} className="text-xs">
          <FloppyDisk size={16} />
          {saving ? "Saving..." : "Save Changes"}
        </GlassButton>
      </div>

      {/* Tabs Menu */}
      <div
        className={`flex items-center gap-2 p-1.5 rounded-2xl border overflow-x-auto ${
          isLight ? "bg-slate-100 border-slate-200" : "bg-[#060B18]/70 border-white/10 backdrop-blur-xl"
        }`}
      >
        {[
          { id: "team", label: "Team Members", icon: UsersThree },
          { id: "org", label: "Organization", icon: Building },
          { id: "templates", label: "Mail Templates", icon: EnvelopeSimple },
          { id: "rubrics", label: "AI Rubrics & Strictness", icon: Sliders },
          { id: "appearance", label: "Appearance", icon: PaintBrush },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
                isActive
                  ? isLight
                    ? "bg-white text-slate-900 shadow-sm font-semibold"
                    : "bg-[#8FB6E8]/20 text-white border border-[#8FB6E8]/30 shadow"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-[#7C91B4] hover:text-[#EAF1FB]"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Team Members */}
      {activeTab === "team" && (
        <div
          className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
            isLight ? "bg-white border-slate-200" : "bg-[#0D1633] border-white/15"
          }`}
        >
          {/* Seat Meter Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <h3 className={`text-lg font-display font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                Hiring Team Roster
              </h3>
              <p className="text-xs text-[#7C91B4] mt-0.5">
                {settings.org.seatsUsed} of {settings.org.seatsTotal} team seats allocated.
              </p>
            </div>

            <GlassButton variant="primary" onClick={() => setShowInviteModal(true)} className="text-xs">
              <UserPlus size={16} />
              Invite Member
            </GlassButton>
          </div>

          {/* Members List */}
          <div className="space-y-3">
            {settings.members.map((member) => (
              <div
                key={member.id}
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/10"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-white/20 flex items-center justify-center font-display font-bold text-sm text-[#8FB6E8]">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                        {member.name}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#8FB6E8]">
                        {member.role}
                      </span>
                      {member.status === "invited" && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">
                          Pending Invite
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#7C91B4]">{member.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-[#7C91B4]">
                    Joined {member.joinedAt}
                  </span>

                  {member.role !== "admin" && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1.5 rounded-lg text-[#7C91B4] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove Member"
                    >
                      <Trash size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Organization Profile */}
      {activeTab === "org" && (
        <div
          className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
            isLight ? "bg-white border-slate-200" : "bg-[#0D1633] border-white/15"
          }`}
        >
          <div className="border-b border-white/10 pb-4">
            <h3 className={`text-lg font-display font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
              Organization Settings &amp; Webhooks
            </h3>
            <p className="text-xs text-[#7C91B4] mt-0.5">
              Branding metadata and applicant streaming endpoints.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-[#7C91B4] mb-1.5">
                Organization Legal Name
              </label>
              <input
                type="text"
                value={settings.org.name}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    org: { ...settings.org, name: e.target.value },
                  })
                }
                className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-1 focus:ring-[#8FB6E8] ${
                  isLight ? "bg-slate-50 border-slate-300" : "bg-[#060B18] border-white/15 text-white"
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-[#7C91B4] mb-1.5">
                Company Domain
              </label>
              <input
                type="text"
                value={settings.org.domain}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    org: { ...settings.org, domain: e.target.value },
                  })
                }
                className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-1 focus:ring-[#8FB6E8] ${
                  isLight ? "bg-slate-50 border-slate-300" : "bg-[#060B18] border-white/15 text-white"
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-[#7C91B4] mb-1.5">
                Career Page Applicant Ingestion Webhook
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={settings.org.careerWebhook}
                  className={`w-full px-4 py-2.5 rounded-xl text-xs font-mono border focus:outline-none ${
                    isLight ? "bg-slate-100 border-slate-300 text-slate-700" : "bg-[#060B18] border-white/15 text-slate-300"
                  }`}
                />
                <GlassButton
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(settings.org.careerWebhook);
                    toast.success("Webhook URL copied!");
                  }}
                  className="shrink-0 text-xs"
                >
                  <Copy size={16} />
                  Copy
                </GlassButton>
              </div>
              <p className="text-[11px] text-[#7C91B4] mt-1.5">
                POST multipart/form-data resume payloads to this webhook to ingest automatically into your pipelines.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Automated Mail Templates */}
      {activeTab === "templates" && (
        <div
          className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
            isLight ? "bg-white border-slate-200" : "bg-[#0D1633] border-white/15"
          }`}
        >
          <div className="border-b border-white/10 pb-4">
            <h3 className={`text-lg font-display font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
              Automated Candidate Communication Templates
            </h3>
            <p className="text-xs text-[#7C91B4] mt-0.5">
              Personalized emails dispatched when candidates pass screening or receive calibration feedback.
            </p>
          </div>

          {/* Template Subtabs */}
          <div className="flex items-center gap-2">
            {[
              { id: "shortlist", label: "Shortlist Invitation" },
              { id: "rejection", label: "Calibrated Rejection" },
              { id: "review", label: "In Review Update" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setTemplateSubTab(st.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  templateSubTab === st.id
                    ? isLight
                      ? "bg-blue-50 border-blue-300 text-blue-600 font-bold"
                      : "bg-[#8FB6E8]/20 border-[#8FB6E8]/40 text-[#8FB6E8] font-bold"
                    : isLight
                    ? "bg-slate-100 border-slate-200 text-slate-600"
                    : "bg-white/5 border-white/10 text-[#7C91B4]"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Variable Insertion Chips */}
          <div>
            <span className="block text-[11px] font-mono text-[#7C91B4] uppercase mb-2">
              Available Dynamic Variables (Click to Insert):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {["{{name}}", "{{role}}", "{{company}}", "{{score}}", "{{skills}}", "{{report_link}}"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertVariableTag(tag)}
                  className={`text-xs font-mono px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    isLight
                      ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
                      : "bg-white/5 hover:bg-white/10 border-white/15 text-[#8FB6E8]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <div>
            <label className="block text-xs font-mono uppercase text-[#7C91B4] mb-1.5">
              Email Body Content
            </label>
            <textarea
              rows={8}
              value={settings.templates[templateSubTab]}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  templates: {
                    ...settings.templates,
                    [templateSubTab]: e.target.value,
                  },
                })
              }
              className={`w-full p-4 rounded-2xl text-xs sm:text-sm font-mono border focus:outline-none focus:ring-1 focus:ring-[#8FB6E8] leading-relaxed ${
                isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-[#060B18] border-white/15 text-slate-200"
              }`}
            />
          </div>
        </div>
      )}

      {/* TAB 4: AI Rubrics & Strictness */}
      {activeTab === "rubrics" && (
        <div
          className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
            isLight ? "bg-white border-slate-200" : "bg-[#0D1633] border-white/15"
          }`}
        >
          <div className="border-b border-white/10 pb-4">
            <h3 className={`text-lg font-display font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
              Autonomous AI Screening Calibration
            </h3>
            <p className="text-xs text-[#7C91B4] mt-0.5">
              Adjust thresholds for experience boundary checks and automated shortlisting decisions.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                <span className={`font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>
                  Experience Tolerance Buffer
                </span>
                <span className="font-mono text-[#8FB6E8] font-bold">
                  ±{settings.rubrics.experienceToleranceYears} Year(s)
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={3}
                step={1}
                value={settings.rubrics.experienceToleranceYears}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rubrics: {
                      ...settings.rubrics,
                      experienceToleranceYears: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-[#8FB6E8] cursor-pointer"
              />
              <p className="text-[11px] text-[#7C91B4] mt-1">
                Allows candidates slightly under mandatory experience to pass boundary verification if skill depth is exceptionally high.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                <span className={`font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>
                  Auto-Shortlist Score Threshold
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {settings.rubrics.autoShortlistScoreThreshold}%
                </span>
              </div>
              <input
                type="range"
                min={60}
                max={95}
                step={5}
                value={settings.rubrics.autoShortlistScoreThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rubrics: {
                      ...settings.rubrics,
                      autoShortlistScoreThreshold: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <p className="text-[11px] text-[#7C91B4] mt-1">
                Candidates scoring at or above this score are automatically moved to SHORTLISTED.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                <span className={`font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>
                  Auto-Reject Score Ceiling
                </span>
                <span className="font-mono text-rose-400 font-bold">
                  {settings.rubrics.autoRejectScoreThreshold}%
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={60}
                step={5}
                value={settings.rubrics.autoRejectScoreThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rubrics: {
                      ...settings.rubrics,
                      autoRejectScoreThreshold: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-rose-400 cursor-pointer"
              />
              <p className="text-[11px] text-[#7C91B4] mt-1">
                Candidates scoring below this ceiling are automatically set to REJECTED with personalized constructive feedback.
              </p>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <div>
                <span className={`text-sm font-semibold block ${isLight ? "text-slate-800" : "text-white"}`}>
                  Strict Architecture Keyword Matching
                </span>
                <span className="text-xs text-[#7C91B4]">
                  Enforce strict exact-term matching for critical system stack keywords.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.rubrics.strictKeywordMatching}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rubrics: {
                      ...settings.rubrics,
                      strictKeywordMatching: e.target.checked,
                    },
                  })
                }
                className="w-5 h-5 rounded text-[#8FB6E8] focus:ring-[#8FB6E8] cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Appearance */}
      {activeTab === "appearance" && (
        <div
          className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
            isLight ? "bg-white border-slate-200" : "bg-[#0D1633] border-white/15"
          }`}
        >
          <div className="border-b border-white/10 pb-4">
            <h3 className={`text-lg font-display font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
              Visual Theme Selection
            </h3>
            <p className="text-xs text-[#7C91B4] mt-0.5">
              Switch between Royal Deep Navy and Frosted Clean White themes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Dark Navy Preview Card */}
            <div
              onClick={() => theme !== "dark" && toggleTheme()}
              className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                theme === "dark"
                  ? "border-[#8FB6E8] bg-[#0A1228] shadow-lg shadow-[#8FB6E8]/10"
                  : "border-white/10 bg-[#0A1228]/50 opacity-60 hover:opacity-100"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-white font-display font-bold">
                  <Moon size={18} className="text-[#8FB6E8]" weight="fill" />
                  Royal Deep Navy
                </div>
                {theme === "dark" && (
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle size={14} weight="fill" /> Active
                  </span>
                )}
              </div>
              <p className="text-xs text-[#7C91B4]">
                Award-winning dark visual hierarchy with chromatic auroras and frosted glassmorphism.
              </p>
            </div>

            {/* Light White Preview Card */}
            <div
              onClick={() => theme !== "light" && toggleTheme()}
              className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                theme === "light"
                  ? "border-blue-500 bg-[#F6F9FD] shadow-lg"
                  : "border-slate-300 bg-white/50 opacity-60 hover:opacity-100"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-900 font-display font-bold">
                  <Sun size={18} className="text-blue-600" weight="fill" />
                  Frosted Clean White
                </div>
                {theme === "light" && (
                  <span className="text-[11px] font-mono text-blue-600 flex items-center gap-1">
                    <CheckCircle size={14} weight="fill" /> Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600">
                High-clarity editorial light theme designed for bright office environments.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* INVITE MEMBER MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div
            className={`w-full max-w-md p-6 sm:p-8 rounded-3xl border shadow-2xl ${
              isLight ? "bg-white border-slate-300" : "bg-[#0D1633] border-white/20 text-white"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-bold">Invite Hiring Member</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-[#7C91B4] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[#7C91B4] mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="colleague@vanguard.io"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-1 focus:ring-[#8FB6E8] ${
                    isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-white/5 border-white/15"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#7C91B4] mb-1.5">
                  Role Permission
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-1 focus:ring-[#8FB6E8] cursor-pointer ${
                    isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-[#060B18] border-white/15"
                  }`}
                >
                  <option value="recruiter">Recruiter (Screen &amp; Calibrate)</option>
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="viewer">Viewer (Read-Only Scorecards)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="primary">
                  Send Invitation
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


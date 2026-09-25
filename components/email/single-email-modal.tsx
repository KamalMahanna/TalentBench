"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Mail,
  Send,
  RotateCw,
  Eye,
  Edit3,
  AlertTriangle,
  Settings,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getStoredHrEmail,
  getStoredGmailAppPassword,
  getStoredSenderName,
} from "@/lib/client/resume-cache";
import Link from "next/link";

export interface CandidateEmailTarget {
  id?: string;
  candidateId?: string;
  name: string;
  email: string;
  status?: string;
  jobTitle?: string;
  companyName?: string;
  personalizedReply?: string | null;
  emailStatus?: string;
  emailSentAt?: string;
}

interface SingleEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: CandidateEmailTarget | null;
  onSuccess?: (candidateId: string, result: any) => void;
}

export function SingleEmailModal({
  isOpen,
  onClose,
  candidate,
  onSuccess,
}: SingleEmailModalProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  // HR Credentials state
  const [hrEmail, setHrEmail] = useState("");
  const [hasAppPassword, setHasAppPassword] = useState(false);
  const [senderName, setSenderName] = useState("Talent Acquisition Team");

  useEffect(() => {
    if (isOpen && candidate) {
      // 1. Load HR credentials from localStorage or settings API
      const localHr = getStoredHrEmail();
      const localCode = getStoredGmailAppPassword();
      const localSender = getStoredSenderName();

      if (localHr) setHrEmail(localHr);
      if (localCode) setHasAppPassword(true);
      if (localSender) setSenderName(localSender);

      // Check /api/settings if local is not set
      if (!localHr || !localCode) {
        fetch("/api/settings")
          .then((res) => res.json())
          .then((data) => {
            if (data.settings?.email) {
              if (data.settings.email.hrEmail) setHrEmail(data.settings.email.hrEmail);
              if (data.settings.email.gmailAppPassword) setHasAppPassword(true);
              if (data.settings.email.senderName) setSenderName(data.settings.email.senderName);
            }
          })
          .catch(() => {});
      }

      // 2. Initialize subject & body
      const jobName = candidate.jobTitle || "Job Application";
      const compName = candidate.companyName || "TalentBench";
      const isShortlisted = candidate.status === "SHORTLISTED";

      const defaultSubject = isShortlisted
        ? `Next Steps: Your application for ${jobName} at ${compName}`
        : `Update on your application for ${jobName} at ${compName}`;

      setSubject(defaultSubject);

      if (candidate.personalizedReply && candidate.personalizedReply.trim()) {
        setBody(candidate.personalizedReply);
      } else {
        const fallbackText = isShortlisted
          ? `Hi ${candidate.name},\n\nWe have completed our initial evaluation of your background for the ${jobName} position at ${compName}.\n\nOur team was impressed by your profile, and we would like to invite you to the next phase of our interview process. We will reach out shortly with scheduling details.\n\nBest regards,\n${senderName || "The Talent Team"}`
          : `Hi ${candidate.name},\n\nThank you for taking the time to apply for the ${jobName} position at ${compName}.\n\nAfter reviewing your qualifications against our current requisition criteria, we have decided not to advance your candidacy for this particular role. We truly appreciate your interest and wish you the best in your career pursuits.\n\nWarm regards,\n${senderName || "The Talent Team"}`;
        setBody(fallbackText);
      }
    }
  }, [isOpen, candidate]);

  if (!isOpen || !candidate) return null;

  const isConfigured = Boolean(hrEmail && hasAppPassword);

  const handleSend = async () => {
    if (!candidate.email) {
      toast.error("Candidate does not have a valid email address.");
      return;
    }
    if (!body.trim()) {
      toast.error("Email body cannot be empty.");
      return;
    }

    setSending(true);
    try {
      const localCode = getStoredGmailAppPassword();
      const payload = {
        candidate: {
          candidateId: candidate.id || candidate.candidateId,
          to: candidate.email,
          candidateName: candidate.name,
          subject: subject.trim(),
          body: body.trim(),
          jobTitle: candidate.jobTitle,
          companyName: candidate.companyName,
        },
        config: {
          hrEmail,
          gmailAppPassword: localCode || undefined,
          senderName,
        },
      };

      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to dispatch email.");
        setSending(false);
        return;
      }

      toast.success(`Email successfully sent to ${candidate.name} (${candidate.email})!`);
      if (onSuccess) {
        onSuccess(candidate.id || candidate.candidateId || "", data.result);
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Network error while sending email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      data-lenis-prevent
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !sending) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl rounded-3xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh] border animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--outline)",
          color: "var(--ink)",
        }}
      >
        {/* Modal Header */}
        <div
          className="p-5 sm:p-6 border-b flex items-center justify-between"
          style={{ borderColor: "var(--outline)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center border border-[var(--primary)]/30">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--ink)" }}>
                Send Candidate Email
              </h3>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Dispatch personalized feedback or next steps directly to candidate
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:opacity-75 transition-colors cursor-pointer"
            style={{ color: "var(--muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Configuration Warning Banner if HR settings missing */}
        {!isConfigured && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-600 dark:text-amber-300">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-amber-800 dark:text-amber-200">
                HR Email or Gmail Code Not Configured
              </div>
              <p className="mt-0.5 opacity-90 leading-relaxed">
                To send emails from your company or personal Gmail, configure your HR Mail ID and 16-character Gmail App Password in Settings.
              </p>
              <div className="mt-2">
                <Link
                  href="/dashboard/settings"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-3 py-1 rounded-full border border-amber-500/40 bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
                >
                  <Settings size={12} /> Open Settings
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Metadata Row: To & From */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div
              className="p-3 rounded-2xl border space-y-1"
              style={{
                backgroundColor: "var(--canvas)",
                borderColor: "var(--outline)",
              }}
            >
              <div className="text-[10px] uppercase" style={{ color: "var(--muted)" }}>
                Recipient (To)
              </div>
              <div className="font-semibold truncate" style={{ color: "var(--ink)" }}>
                {candidate.name}
              </div>
              <div className="text-[11px] truncate text-[var(--primary)]">
                {candidate.email}
              </div>
            </div>

            <div
              className="p-3 rounded-2xl border space-y-1"
              style={{
                backgroundColor: "var(--canvas)",
                borderColor: "var(--outline)",
              }}
            >
              <div className="text-[10px] uppercase" style={{ color: "var(--muted)" }}>
                Sender (From)
              </div>
              <div className="font-semibold truncate" style={{ color: "var(--ink)" }}>
                {senderName}
              </div>
              <div className="text-[11px] truncate text-[var(--primary)]">
                {hrEmail || "Not configured yet"}
              </div>
            </div>
          </div>

          {/* Subject Field */}
          <div className="space-y-1.5">
            <label
              className="block text-xs font-mono uppercase"
              style={{ color: "var(--muted)" }}
            >
              Email Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Application update..."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-sans border focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              style={{
                backgroundColor: "var(--canvas)",
                borderColor: "var(--outline)",
                color: "var(--ink)",
              }}
            />
          </div>

          {/* Edit / Preview Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                className="block text-xs font-mono uppercase"
                style={{ color: "var(--muted)" }}
              >
                Email Body Content
              </label>

              <div
                className="flex items-center p-1 rounded-xl border text-xs"
                style={{
                  backgroundColor: "var(--canvas)",
                  borderColor: "var(--outline)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab("edit")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeTab === "edit"
                      ? "bg-[var(--primary)] text-[var(--on-primary)] font-medium shadow-sm"
                      : "hover:opacity-80"
                  }`}
                  style={{ color: activeTab === "edit" ? "var(--on-primary)" : "var(--muted)" }}
                >
                  <Edit3 size={13} /> Edit Draft
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeTab === "preview"
                      ? "bg-[var(--primary)] text-[var(--on-primary)] font-medium shadow-sm"
                      : "hover:opacity-80"
                  }`}
                  style={{ color: activeTab === "preview" ? "var(--on-primary)" : "var(--muted)" }}
                >
                  <Eye size={13} /> Preview
                </button>
              </div>
            </div>

            {activeTab === "edit" ? (
              <textarea
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email body here..."
                className="w-full p-4 rounded-xl text-xs sm:text-sm font-sans border leading-relaxed focus:outline-none focus:ring-1 focus:ring-[var(--primary)] resize-y"
                style={{
                  backgroundColor: "var(--canvas)",
                  borderColor: "var(--outline)",
                  color: "var(--ink)",
                }}
              />
            ) : (
              <div
                className="p-5 rounded-2xl border text-xs sm:text-sm space-y-4 max-h-64 overflow-y-auto"
                style={{
                  backgroundColor: "var(--canvas)",
                  borderColor: "var(--outline)",
                  color: "var(--ink)",
                }}
              >
                <div
                  className="border-b pb-3"
                  style={{ borderColor: "var(--outline)" }}
                >
                  <div className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                    Subject:{" "}
                    <strong style={{ color: "var(--ink)" }}>{subject}</strong>
                  </div>
                </div>
                <div className="whitespace-pre-line leading-relaxed">
                  {body}
                </div>
                <div
                  className="pt-3 border-t text-xs"
                  style={{
                    borderColor: "var(--outline)",
                    color: "var(--muted)",
                  }}
                >
                  {senderName} · {candidate.companyName || "TalentBench"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="p-5 sm:p-6 border-t flex items-center justify-between"
          style={{ borderColor: "var(--outline)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono transition-colors cursor-pointer hover:underline"
            style={{ color: "var(--muted)" }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !candidate.email}
            className="px-5 py-2 rounded-full text-xs font-semibold bg-[var(--primary)] hover:opacity-90 text-[var(--on-primary)] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
          >
            {sending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            {sending ? "Sending..." : "Send Email"}
          </button>
        </div>
      </div>
    </div>
  );
}


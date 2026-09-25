"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  AlertCircle,
  Save,
  Zap,
  RefreshCw,
  Mail,
  Key,
  Eye,
  EyeOff,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/context/theme-context";
import {
  getStoredHrEmail,
  setStoredHrEmail,
  getStoredGmailAppPassword,
  setStoredGmailAppPassword,
  getStoredSenderName,
  setStoredSenderName,
} from "@/lib/client/resume-cache";

interface LlmConfig {
  provider: "gemini";
  geminiApiKey: string;
  geminiModel: string;
  geminiRpm: number;
  geminiTpm: number;
}

interface EmailSettings {
  hrEmail: string;
  gmailAppPassword: string;
  senderName: string;
  smtpHost: string;
  smtpPort: number;
}

interface SettingsData {
  llm?: LlmConfig;
  email?: EmailSettings;
  org?: any;
  templates?: any;
  rubrics?: any;
}

const DEFAULT_LLM_CONFIG: LlmConfig = {
  provider: "gemini",
  geminiApiKey: "",
  geminiModel: "gemini-3.5-flash-lite",
  geminiRpm: 15,
  geminiTpm: 250000,
};

const DEFAULT_EMAIL_CONFIG: EmailSettings = {
  hrEmail: "",
  gmailAppPassword: "",
  senderName: "Talent Acquisition Team",
  smtpHost: "smtp.gmail.com",
  smtpPort: 465,
};

function getMaskedApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 6) return key;
  return `${key.slice(0, 3)}••••••••••••••••••••••••${key.slice(-3)}`;
}

export default function SettingsPage() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingLlm, setTestingLlm] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Email SMTP testing and guide state
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showGmailCode, setShowGmailCode] = useState(false);
  const [showAppPasswordGuide, setShowAppPasswordGuide] = useState(false);
  const [testRecipientEmail, setTestRecipientEmail] = useState("");

  // Masked API key editing state
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          const loadedSettings = data.settings;
          // Hydrate email from localStorage if server has defaults
          const localHr = getStoredHrEmail();
          const localPass = getStoredGmailAppPassword();
          const localSender = getStoredSenderName();

          if (!loadedSettings.email) {
            loadedSettings.email = { ...DEFAULT_EMAIL_CONFIG };
          }
          if (localHr && !loadedSettings.email.hrEmail) loadedSettings.email.hrEmail = localHr;
          if (localPass && !loadedSettings.email.gmailAppPassword) loadedSettings.email.gmailAppPassword = localPass;
          if (localSender && (!loadedSettings.email.senderName || loadedSettings.email.senderName === DEFAULT_EMAIL_CONFIG.senderName)) {
            loadedSettings.email.senderName = localSender;
          }

          setSettings(loadedSettings);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading settings:", err);
        setLoading(false);
      });
  }, []);

  const currentLlm: LlmConfig = settings?.llm || DEFAULT_LLM_CONFIG;
  const currentEmail: EmailSettings = settings?.email || DEFAULT_EMAIL_CONFIG;

  const updateLlm = (partial: Partial<LlmConfig>) => {
    if (!settings) return;
    setSettings({
      ...settings,
      llm: {
        ...currentLlm,
        ...partial,
      },
    });
  };

  const updateEmail = (partial: Partial<EmailSettings>) => {
    if (!settings) return;
    const updated = {
      ...currentEmail,
      ...partial,
    };
    setSettings({
      ...settings,
      email: updated,
    });
    // Sync with client-side localStorage
    if (partial.hrEmail !== undefined) setStoredHrEmail(partial.hrEmail);
    if (partial.gmailAppPassword !== undefined) setStoredGmailAppPassword(partial.gmailAppPassword);
    if (partial.senderName !== undefined) setStoredSenderName(partial.senderName);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        llm: settings?.llm || DEFAULT_LLM_CONFIG,
        email: settings?.email || DEFAULT_EMAIL_CONFIG,
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

  const handleTestEmail = async () => {
    if (!currentEmail.hrEmail || !currentEmail.gmailAppPassword) {
      toast.error("Please enter both HR Mail ID and Gmail Code (App Password) before testing.");
      return;
    }

    setTestingEmail(true);
    setTestEmailResult(null);

    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hrEmail: currentEmail.hrEmail,
          gmailAppPassword: currentEmail.gmailAppPassword,
          senderName: currentEmail.senderName,
          testRecipient: testRecipientEmail.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestEmailResult({ success: true, message: data.message });
        toast.success(data.message);
      } else {
        setTestEmailResult({ success: false, message: data.error || "SMTP connection test failed." });
        toast.error(data.error || "SMTP connection test failed.");
      }
    } catch (err: any) {
      setTestEmailResult({ success: false, message: err.message || "Failed to reach email verification endpoint." });
      toast.error("Failed to connect to email service.");
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestLlm = async () => {
    setTestingLlm(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/test-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings?.llm || {}),
      });
      const data = await res.json();
      if (res.ok && data.success && data.test) {
        setTestResult(data.test);
        toast.success(`Connection verified: routed to ${data.test.model}`);
      } else {
        const failedResult = data.test || {
          status: "FAILED",
          model: currentLlm.geminiModel,
          error: data.error || "Model test connection failed.",
        };
        setTestResult(failedResult);
        toast.error(data.error || "Model test connection failed.");
      }
    } catch (err: any) {
      const failedResult = {
        status: "FAILED",
        model: currentLlm.geminiModel,
        error: err.message || "Error connecting to LLM service.",
      };
      setTestResult(failedResult);
      toast.error("Error connecting to LLM service.");
    } finally {
      setTestingLlm(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-64 rounded-xl animate-pulse" style={{ background: "var(--surface)" }} />
        <div className="h-96 rounded-3xl animate-pulse" style={{ background: "var(--surface)" }} />
      </div>
    );
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl text-sm font-mono focus:outline-none transition-all";
  const inputStyle = {
    background: "var(--canvas)",
    border: "1px solid var(--outline)",
    color: "var(--ink)",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header without badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 style={{ color: "var(--ink)" }} className="text-2xl sm:text-3xl font-bold tracking-tight">
              AI &amp; Model Gateway Architecture
            </h1>
          </div>
          <p style={{ color: "var(--muted)" }} className="text-xs sm:text-sm mt-1">
            Configure candidate screening models and API keys.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            className="md-button md-button--tonal inline-flex items-center gap-2 text-xs disabled:opacity-60"
            onClick={handleTestLlm}
            disabled={testingLlm}
          >
            {testingLlm ? (
              <RefreshCw size={15} className="animate-spin" style={{ color: "var(--primary)" }} />
            ) : (
              <Zap size={15} style={{ color: "var(--primary)" }} />
            )}
            {testingLlm ? "Testing Gateway..." : "Test Connection"}
          </button>

          <button
            className="md-button md-button--filled inline-flex items-center gap-2 text-xs disabled:opacity-60"
            onClick={handleSaveSettings}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Main Gateway Card */}
      <div
        className="p-6 sm:p-8 rounded-3xl border shadow-sm space-y-8"
        style={{ background: "var(--surface)", borderColor: "var(--outline)" }}
      >
        {/* Gemini Settings Form */}
        <div className="space-y-6">
          {/* Gemini API Key */}
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              Google AI Studio / Gemini API Key
            </label>

            {!isEditingKey ? (
              <div className="relative flex items-center">
                <input
                  type="text"
                  readOnly
                  value={getMaskedApiKey(currentLlm.geminiApiKey)}
                  placeholder="No API key set (server uses default GEMINI_API_KEY)"
                  className={`${inputClass} pr-28`}
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => {
                    setKeyInput(currentLlm.geminiApiKey || "");
                    setIsEditingKey(true);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
                  style={{
                    background: "var(--surface-purple)",
                    color: "var(--primary)",
                    border: "1px solid var(--outline)",
                  }}
                >
                  Change Key
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  autoFocus
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Paste new Gemini API Key (e.g. AIzaSy...)"
                  className={inputClass}
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--outline)")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      updateLlm({ geminiApiKey: keyInput.trim() });
                      setIsEditingKey(false);
                    } else if (e.key === "Escape") {
                      setIsEditingKey(false);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    updateLlm({ geminiApiKey: keyInput.trim() });
                    setIsEditingKey(false);
                  }}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                  style={{ background: "var(--primary)", color: "var(--on-primary)" }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingKey(false)}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                  style={{ background: "var(--surface)", border: "1px solid var(--outline)", color: "var(--muted)" }}
                >
                  Cancel
                </button>
              </div>
            )}

            <p className="text-[11px]" style={{ color: "var(--muted)" }}>
              API key is securely masked. Only the first and last 3 letters are visible. If left blank, server uses <code style={{ color: "var(--primary)" }} className="font-mono">GEMINI_API_KEY</code>.
            </p>
          </div>

          {/* Active Model Tag (Editable, defaults to gemini-3.5-flash-lite) */}
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              Active Model Tag
            </label>
            <input
              type="text"
              value={currentLlm.geminiModel || "gemini-3.5-flash-lite"}
              onChange={(e) => updateLlm({ geminiModel: e.target.value })}
              placeholder="gemini-3.5-flash-lite"
              className={inputClass}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--outline)")}
            />
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>
              Specify the active Gemini model tag for candidate evaluations. Defaults to <span style={{ color: "var(--ink)" }} className="font-semibold font-mono">gemini-3.5-flash-lite</span>.
            </p>
          </div>
        </div>

        {/* Test Connection Results Box */}
        {testResult && (testResult.status === "FAILED" || testResult.error) ? (
          <div
            className="p-4 rounded-2xl border text-xs space-y-1.5 transition-all"
            style={{
              background: "rgba(239, 68, 68, 0.06)",
              borderColor: "rgba(239, 68, 68, 0.25)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-rose-500">
                <AlertCircle size={15} /> Error
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-500 border border-rose-500/30">
                FAILED
              </span>
            </div>
            <p className="text-[11px] font-mono break-words leading-relaxed" style={{ color: "var(--ink)" }}>
              {testResult.error}
            </p>
          </div>
        ) : testResult && testResult.status === "OPERATIONAL" ? (
          <div
            className="p-4 rounded-2xl border space-y-3 transition-all"
            style={{ background: "var(--surface)", border: "1px solid rgba(34,197,94,0.3)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                <CheckCircle size={15} /> Gateway Connectivity Verified
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                {testResult.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-xl" style={{ background: "var(--canvas)" }}>
                <div className="text-[10px]" style={{ color: "var(--muted)" }}>Routed Model</div>
                <div className="font-bold truncate" style={{ color: "var(--ink)" }}>{testResult.model}</div>
              </div>
              <div className="p-2.5 rounded-xl" style={{ background: "var(--canvas)" }}>
                <div className="text-[10px]" style={{ color: "var(--muted)" }}>Roundtrip Latency</div>
                <div className="font-bold" style={{ color: "var(--ink)" }}>{testResult.latencyMs} ms</div>
              </div>
              <div className="p-2.5 rounded-xl" style={{ background: "var(--canvas)" }}>
                <div className="text-[10px]" style={{ color: "var(--muted)" }}>Tokens Evaluated</div>
                <div className="font-bold" style={{ color: "var(--ink)" }}>{testResult.tokensUsed} tok</div>
              </div>
              <div className="p-2.5 rounded-xl" style={{ background: "var(--canvas)" }}>
                <div className="text-[10px]" style={{ color: "var(--muted)" }}>Mode</div>
                <div className="font-bold" style={{ color: "var(--ink)" }}>Live API</div>
              </div>
            </div>

            {testResult.quotas?.flashLite && (
              <div
                className="pt-2 border-t flex flex-wrap items-center gap-4 text-[11px] font-mono"
                style={{ borderColor: "var(--outline)", color: "var(--muted)" }}
              >
                <div>
                  Quota Remaining: <span style={{ color: "var(--ink)" }} className="font-bold">{testResult.quotas.flashLite.remainingRpm} RPM</span> / <span style={{ color: "var(--ink)" }} className="font-bold">{testResult.quotas.flashLite.remainingTpm} TPM</span>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Card 2: Gmail SMTP & Recruiter Email Delivery */}
      <div
        className="rounded-3xl p-6 sm:p-8 border shadow-sm space-y-6"
        style={{
          background: "var(--surface)",
          borderColor: "var(--outline)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: "var(--outline)" }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
              <Mail size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold" style={{ color: "var(--ink)" }}>
                Gmail SMTP &amp; Recruiter Email Dispatch
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                Configure your recruiter Gmail credentials to dispatch feedback, test scores, and interview invites.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestEmail}
              disabled={testingEmail || !currentEmail.hrEmail || !currentEmail.gmailAppPassword}
              className="px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              style={{
                background: "var(--canvas)",
                border: "1px solid var(--outline)",
                color: "var(--ink)",
              }}
            >
              <RefreshCw size={13} className={testingEmail ? "animate-spin" : ""} />
              {testingEmail ? "Verifying..." : "Test Connection"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* HR Mail ID */}
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              HR / Recruiter Email Address
            </label>
            <input
              type="email"
              value={currentEmail.hrEmail || ""}
              onChange={(e) => updateEmail({ hrEmail: e.target.value })}
              placeholder="e.g. talent@yourcompany.com or recruiter@gmail.com"
              className={inputClass}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--outline)")}
            />
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>
              The Gmail account used to dispatch candidate correspondence.
            </p>
          </div>

          {/* Gmail Code / App Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Gmail Code (16-char App Password)
              </label>
              <button
                type="button"
                onClick={() => setShowAppPasswordGuide(!showAppPasswordGuide)}
                className="text-[11px] hover:underline flex items-center gap-1 cursor-pointer text-[var(--primary)] font-medium"
              >
                <Info size={12} /> {showAppPasswordGuide ? "Hide Guide" : "How to get code?"}
              </button>
            </div>
            <div className="relative">
              <input
                type={showGmailCode ? "text" : "password"}
                value={currentEmail.gmailAppPassword || ""}
                onChange={(e) => updateEmail({ gmailAppPassword: e.target.value })}
                placeholder="16-character Google App Password (e.g. abcd efgh ijkl mnop)"
                className={`${inputClass} pr-10`}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--outline)")}
              />
              <button
                type="button"
                onClick={() => setShowGmailCode(!showGmailCode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full cursor-pointer hover:opacity-75"
                style={{ color: "var(--muted)" }}
                aria-label="Toggle password visibility"
              >
                {showGmailCode ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>
              Generated from Google Account security settings. Spaces are automatically stripped.
            </p>
          </div>

          {/* Sender Display Name */}
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              Sender Display Name
            </label>
            <input
              type="text"
              value={currentEmail.senderName || ""}
              onChange={(e) => updateEmail({ senderName: e.target.value })}
              placeholder="e.g. Talent Acquisition Team or Alexandra Sterling"
              className={inputClass}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--outline)")}
            />
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>
              Friendly name displayed to candidates in their inbox.
            </p>
          </div>

          {/* Test Recipient Email */}
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              Test Destination Email (Optional)
            </label>
            <input
              type="email"
              value={testRecipientEmail}
              onChange={(e) => setTestRecipientEmail(e.target.value)}
              placeholder={`Leave blank to test send to ${currentEmail.hrEmail || "your HR email"}`}
              className={inputClass}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--outline)")}
            />
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>
              When clicking &quot;Test Connection&quot;, a verification message is sent here.
            </p>
          </div>
        </div>

        {/* Step-by-Step App Password Guide */}
        {showAppPasswordGuide && (
          <div
            className="p-4 sm:p-5 rounded-2xl border space-y-3"
            style={{
              backgroundColor: "var(--canvas)",
              borderColor: "var(--outline)",
            }}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--primary)]">
              <Key size={16} />
              Generating your 16-character Gmail App Password (Step-by-Step)
            </div>
            <ol className="text-xs space-y-2 list-decimal list-inside leading-relaxed" style={{ color: "var(--muted)" }}>
              <li>
                Visit your <strong>Google Account</strong> settings at{" "}
                <a
                  href="https://myaccount.google.com/security"
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-[var(--primary)]"
                >
                  myaccount.google.com/security
                </a>.
              </li>
              <li>
                In the <strong>&quot;How you sign in to Google&quot;</strong> section, make sure <strong>2-Step Verification</strong> is enabled.
              </li>
              <li>
                Search for <strong>&quot;App passwords&quot;</strong> in the search bar at the top of the Google Account page, or navigate to <strong>2-Step Verification &gt; App passwords</strong>.
              </li>
              <li>
                Type a name for the app (e.g. <code className="font-mono text-[var(--primary)]">TalentBench</code>) and click <strong>Create</strong>.
              </li>
              <li>
                Copy the 16-character code shown (e.g. <code className="font-mono text-[var(--primary)]">abcd efgh ijkl mnop</code>) and paste it into the <strong>Gmail Code</strong> field above.
              </li>
            </ol>
          </div>
        )}

        {/* Test Connection Results Box */}
        {testEmailResult && (
          <div
            className="p-4 rounded-2xl border space-y-2 transition-all"
            style={{
              backgroundColor: testEmailResult.success ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
              borderColor: testEmailResult.success ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)",
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-bold flex items-center gap-1.5 ${
                  testEmailResult.success ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {testEmailResult.success ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <AlertTriangle size={15} />
                )}
                {testEmailResult.success
                  ? "SMTP Connection & Test Email Verified"
                  : "SMTP Connection Test Failed"}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  testEmailResult.success
                    ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                    : "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                }`}
              >
                {testEmailResult.success ? "Ready to Dispatch" : "Attention Required"}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--ink)" }}>
              {testEmailResult.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

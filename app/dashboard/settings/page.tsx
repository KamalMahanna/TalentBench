"use client";

import React, { useState, useEffect } from "react";
import { GlassButton } from "@/components/ui/glass-button";
import {
  CheckCircle,
  FloppyDisk,
  ShieldCheck,
  Lightning,
  Eye,
  EyeSlash,
  Cpu,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useTheme } from "@/context/theme-context";

interface LlmConfig {
  provider: "gemini" | "omniroute";
  geminiApiKey: string;
  omnirouteBaseUrl: string;
  omnirouteApiKey: string;
  omnirouteModel: string;
  omnirouteFallbackModels: string[];
  tokenThreshold: number;
  gemmaModel: string;
  gemmaRpm: number;
  gemmaTpm: number;
  geminiFlashLiteModel: string;
  geminiFlashLiteRpm: number;
  geminiFlashLiteTpm: number;
}

interface SettingsData {
  llm?: LlmConfig;
  org?: any;
  templates?: any;
  rubrics?: any;
}

const DEFAULT_LLM_CONFIG: LlmConfig = {
  provider: "gemini",
  geminiApiKey: "",
  omnirouteBaseUrl: "http://localhost:20128/v1",
  omnirouteApiKey: "sk-omniroute-key",
  omnirouteModel: "kamalai",
  omnirouteFallbackModels: [],
  tokenThreshold: 12000,
  gemmaModel: "gemma-4-31b-it",
  gemmaRpm: 30,
  gemmaTpm: 16000,
  geminiFlashLiteModel: "gemini-3.5-flash-lite",
  geminiFlashLiteRpm: 15,
  geminiFlashLiteTpm: 250000,
};

export default function SettingsPage() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingLlm, setTestingLlm] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOmniRouteKey, setShowOmniRouteKey] = useState(false);

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

  const currentLlm: LlmConfig = settings?.llm || DEFAULT_LLM_CONFIG;

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

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        llm: settings?.llm || DEFAULT_LLM_CONFIG,
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
      toast.success("AI Gateway architecture settings updated successfully!");
      setSaving(false);
    } catch (err) {
      toast.error("Network error saving settings.");
      setSaving(false);
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
      if (res.ok && data.test) {
        setTestResult(data.test);
        toast.success(`Connection verified: routed to ${data.test.model}`);
      } else {
        toast.error(data.error || "Model test connection failed.");
      }
    } catch (err: any) {
      toast.error("Error connecting to LLM service.");
    } finally {
      setTestingLlm(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-64 rounded-xl bg-white/5 animate-pulse" />
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
              AI &amp; Model Gateway Architecture
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#8FB6E8]/15 text-[#8FB6E8] border border-[#8FB6E8]/25">
              Production Gateway
            </span>
          </div>
          <p className={`text-xs sm:text-sm mt-1 ${isLight ? "text-slate-600" : "text-[#7C91B4]"}`}>
            Configure candidate screening models, dynamic token routing, and strict sliding-window quotas.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <GlassButton
            variant="secondary"
            onClick={handleTestLlm}
            disabled={testingLlm}
            className="text-xs"
          >
            {testingLlm ? (
              <ArrowsClockwise size={15} className="animate-spin text-[#8FB6E8]" />
            ) : (
              <Lightning size={15} className="text-[#8FB6E8]" />
            )}
            {testingLlm ? "Testing Gateway..." : "Test Connection"}
          </GlassButton>

          <GlassButton variant="primary" onClick={handleSaveSettings} disabled={saving} className="text-xs">
            <FloppyDisk size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </GlassButton>
        </div>
      </div>

      {/* Main Gateway Card */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-8 ${
          isLight ? "bg-white border-slate-200" : "bg-[#0D1633] border-white/15"
        }`}
      >
        {/* Provider Selection Cards */}
        <div className="space-y-3">
          <label className="block text-xs font-mono uppercase text-[#7C91B4]">
            Active LLM Provider Selection
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: Google Gemini & Gemma */}
            <div
              onClick={() => updateLlm({ provider: "gemini" })}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                (currentLlm.provider || "gemini") === "gemini"
                  ? isLight
                    ? "border-blue-600 bg-blue-50/60 shadow-md"
                    : "border-[#8FB6E8] bg-[#0A1228] shadow-lg shadow-[#8FB6E8]/10"
                  : isLight
                  ? "border-slate-200 bg-slate-50/60 opacity-70 hover:opacity-100"
                  : "border-white/10 bg-white/[0.02] opacity-70 hover:opacity-100"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                    <Cpu size={18} weight="bold" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold font-display ${isLight ? "text-slate-900" : "text-white"}`}>
                      Google Gemini &amp; Gemma
                    </h4>
                    <p className="text-[11px] font-mono text-[#8FB6E8]">
                      Dynamic Token-Size Router
                    </p>
                  </div>
                </div>

                {(currentLlm.provider || "gemini") === "gemini" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                    <CheckCircle size={12} weight="fill" /> Active
                  </span>
                )}
              </div>

              <p className="text-xs text-[#7C91B4] leading-relaxed mb-3">
                Smart routing between <span className={`font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>gemma-4-31b-it</span> (&lt;12k tokens) and <span className={`font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>gemini-3.5-flash-lite</span> (≥12k tokens) with sliding-window quota queues.
              </p>

              <div className={`flex flex-wrap items-center gap-1.5 pt-2 border-t ${isLight ? "border-slate-200" : "border-white/10"}`}>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-white/5 border-white/10 text-slate-300"}`}>
                  &lt;12k: 30 RPM / 16K TPM
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-white/5 border-white/10 text-slate-300"}`}>
                  ≥12k: 15 RPM / 250K TPM
                </span>
              </div>
            </div>

            {/* Option 2: OmniRoute Gateway */}
            <div
              onClick={() => updateLlm({ provider: "omniroute" })}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                currentLlm.provider === "omniroute"
                  ? isLight
                    ? "border-blue-600 bg-blue-50/60 shadow-md"
                    : "border-[#8FB6E8] bg-[#0A1228] shadow-lg shadow-[#8FB6E8]/10"
                  : isLight
                  ? "border-slate-200 bg-slate-50/60 opacity-70 hover:opacity-100"
                  : "border-white/10 bg-white/[0.02] opacity-70 hover:opacity-100"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
                    <Lightning size={18} weight="bold" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold font-display ${isLight ? "text-slate-900" : "text-white"}`}>
                      OmniRoute AI Gateway
                    </h4>
                    <p className="text-[11px] font-mono text-emerald-400">
                      OpenAI-Compatible /v1
                    </p>
                  </div>
                </div>

                {currentLlm.provider === "omniroute" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                    <CheckCircle size={12} weight="fill" /> Active
                  </span>
                )}
              </div>

              <p className="text-xs text-[#7C91B4] leading-relaxed mb-3">
                Routes requests via your self-hosted or managed OmniRoute cluster with fallback models and custom routing configurations.
              </p>

              <div className={`flex flex-wrap items-center gap-1.5 pt-2 border-t ${isLight ? "border-slate-200" : "border-white/10"}`}>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-white/5 border-white/10 text-slate-300"}`}>
                  Model: {currentLlm.omnirouteModel || "kamalai"}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-white/5 border-white/10 text-slate-300"}`}>
                  Preserved API
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Provider Specific Settings */}
        {(currentLlm.provider || "gemini") === "gemini" ? (
          <div className="space-y-6 pt-4 border-t border-white/10">
            {/* Dynamic Routing Visualizer */}
            <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/10"}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className={`text-sm font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                  Dynamic Token Threshold Routing Rules
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#8FB6E8]/15 text-[#8FB6E8] border border-[#8FB6E8]/25 self-start">
                  Threshold: 12,000 Tokens
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className={`p-3.5 rounded-xl border space-y-2 ${isLight ? "bg-white border-blue-200 shadow-sm" : "bg-gradient-to-br from-indigo-950/40 to-slate-900/60 border-indigo-500/20"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono font-bold uppercase ${isLight ? "text-indigo-600" : "text-indigo-300"}`}>
                      Prompt &lt; 12,000 Tokens
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                      Fast Screening
                    </span>
                  </div>
                  <div className={`text-sm font-bold font-mono ${isLight ? "text-slate-900" : "text-white"}`}>
                    gemma-4-31b-it
                  </div>
                  <div className={`grid grid-cols-2 gap-2 text-[11px] font-mono text-[#7C91B4] pt-1 border-t ${isLight ? "border-slate-100" : "border-indigo-500/15"}`}>
                    <div>RPM Limit: <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>30 req/min</span></div>
                    <div>TPM Limit: <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>16K tok/min</span></div>
                  </div>
                </div>

                <div className={`p-3.5 rounded-xl border space-y-2 ${isLight ? "bg-white border-blue-200 shadow-sm" : "bg-gradient-to-br from-blue-950/40 to-slate-900/60 border-blue-500/20"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono font-bold uppercase ${isLight ? "text-blue-600" : "text-blue-300"}`}>
                      Prompt ≥ 12,000 Tokens
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                      High Context
                    </span>
                  </div>
                  <div className={`text-sm font-bold font-mono ${isLight ? "text-slate-900" : "text-white"}`}>
                    gemini-3.5-flash-lite
                  </div>
                  <div className={`grid grid-cols-2 gap-2 text-[11px] font-mono text-[#7C91B4] pt-1 border-t ${isLight ? "border-slate-100" : "border-blue-500/15"}`}>
                    <div>RPM Limit: <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>15 req/min</span></div>
                    <div>TPM Limit: <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>250K tok/min</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gemini API Key */}
            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase text-[#7C91B4]">
                Google AI Studio / Gemini API Key
              </label>
              <div className="relative">
                <input
                  type={showGeminiKey ? "text" : "password"}
                  value={currentLlm.geminiApiKey || ""}
                  onChange={(e) => updateLlm({ geminiApiKey: e.target.value })}
                  placeholder="AIzaSy... (leave blank to inherit GEMINI_API_KEY environment variable)"
                  className={`w-full pr-10 pl-3.5 py-2.5 rounded-xl text-sm font-mono border focus:outline-none focus:ring-1 focus:ring-[#8FB6E8] ${
                    isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-white/5 border-white/15 text-white"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7C91B4] hover:text-white cursor-pointer"
                >
                  {showGeminiKey ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-[#7C91B4]">
                If left blank, the server-side environment variable <code className="font-mono text-[#8FB6E8]">GEMINI_API_KEY</code> will be used automatically.
              </p>
            </div>

            {/* Resilience & Retry Strategy Info */}
            <div className={`p-4 rounded-xl border space-y-2 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/10"}`}>
              <div className={`flex items-center gap-2 text-xs font-mono font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                <ShieldCheck size={16} className="text-emerald-400" />
                Resilience, Retry &amp; Quota Protection
              </div>
              <ul className="text-[11px] text-[#7C91B4] space-y-1 list-disc list-inside">
                <li>Sliding 60-second in-memory request &amp; token queue prevents HTTP 429 quota exhaustion.</li>
                <li>Exponential backoff with randomized jitter on transient timeouts and rate limits (up to 3 retries).</li>
                <li>Automatic graceful fallback to local calibration engine if remote network is offline.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div>
              <label className="block text-xs font-mono uppercase text-[#7C91B4] mb-1.5">
                OmniRoute Gateway Endpoint URL *
              </label>
              <input
                type="text"
                value={currentLlm.omnirouteBaseUrl || "http://localhost:20128/v1"}
                onChange={(e) => updateLlm({ omnirouteBaseUrl: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono border focus:outline-none focus:ring-1 focus:ring-[#8FB6E8] ${
                  isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-white/5 border-white/15 text-white"
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-[#7C91B4] mb-1.5">
                OmniRoute API Key
              </label>
              <div className="relative">
                <input
                  type={showOmniRouteKey ? "text" : "password"}
                  value={currentLlm.omnirouteApiKey || ""}
                  onChange={(e) => updateLlm({ omnirouteApiKey: e.target.value })}
                  placeholder="sk-omniroute-key"
                  className={`w-full pr-10 pl-3.5 py-2.5 rounded-xl text-sm font-mono border focus:outline-none focus:ring-1 focus:ring-[#8FB6E8] ${
                    isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-white/5 border-white/15 text-white"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowOmniRouteKey(!showOmniRouteKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7C91B4] hover:text-white cursor-pointer"
                >
                  {showOmniRouteKey ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-[#7C91B4] mb-1.5">
                Primary Routing Model
              </label>
              <input
                type="text"
                value={currentLlm.omnirouteModel || "kamalai"}
                onChange={(e) => updateLlm({ omnirouteModel: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono border focus:outline-none focus:ring-1 focus:ring-[#8FB6E8] ${
                  isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-white/5 border-white/15 text-white"
                }`}
              />
            </div>
          </div>
        )}

        {/* Test Connection Results Box */}
        {testResult && (
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle size={15} weight="fill" /> Gateway Connectivity Verified
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {testResult.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-white/5">
                <div className="text-[10px] text-[#7C91B4]">Routed Model</div>
                <div className="font-bold text-white truncate">{testResult.model}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5">
                <div className="text-[10px] text-[#7C91B4]">Roundtrip Latency</div>
                <div className="font-bold text-white">{testResult.latencyMs} ms</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5">
                <div className="text-[10px] text-[#7C91B4]">Tokens Evaluated</div>
                <div className="font-bold text-white">{testResult.tokensUsed} tok</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5">
                <div className="text-[10px] text-[#7C91B4]">Mode</div>
                <div className="font-bold text-white">
                  {testResult.fallbackUsed ? "Simulated Safe" : "Live API"}
                </div>
              </div>
            </div>

            {testResult.quotas && (
              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-4 text-[11px] font-mono text-[#7C91B4]">
                <div>
                  Gemma Remaining: <span className="text-white font-bold">{testResult.quotas.gemma.remainingRpm} RPM</span> / <span className="text-white font-bold">{testResult.quotas.gemma.remainingTpm} TPM</span>
                </div>
                <div>
                  Flash Lite Remaining: <span className="text-white font-bold">{testResult.quotas.flashLite.remainingRpm} RPM</span> / <span className="text-white font-bold">{testResult.quotas.flashLite.remainingTpm} TPM</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

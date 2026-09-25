import { GeminiProvider, defaultGeminiProvider } from "./gemini-provider";
import { getAllRateLimiterStatuses } from "./rate-limiter";
import { ScreeningResult } from "./types";

export type LLMProviderType = "gemini";

export interface GatewayConfig {
  provider: LLMProviderType;
  geminiApiKey?: string;
  geminiModel?: string;
}

// In-memory active configuration initialized from environment variables
let currentGatewayConfig: GatewayConfig = {
  provider: "gemini",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
};

export function updateGatewayConfig(newConfig: Partial<GatewayConfig>) {
  currentGatewayConfig = { ...currentGatewayConfig, ...newConfig };
  if (newConfig.geminiApiKey !== undefined) {
    defaultGeminiProvider.setApiKey(newConfig.geminiApiKey);
  }
  if (newConfig.geminiModel !== undefined) {
    defaultGeminiProvider.setModel(newConfig.geminiModel);
  }
}

export function getGatewayConfig(): GatewayConfig {
  return { ...currentGatewayConfig };
}

export class LLMGatewayService {
  public async screenCandidate(params: {
    candidateName: string;
    candidateEmail: string;
    candidateExperience: number;
    resumeText: string;
    jobTitle: string;
    jobDescription: string;
    minExperience: number;
    maxExperience: number;
    rubrics?: any;
  }): Promise<ScreeningResult> {
    return await defaultGeminiProvider.screenCandidate(params);
  }

  public async complete(
    prompt: string,
    options: { systemPrompt?: string; temperature?: number; maxTokens?: number; jsonMode?: boolean } = {}
  ) {
    return await defaultGeminiProvider.complete(prompt, options);
  }

  public async testConnection(override?: Partial<GatewayConfig>) {
    const testPrompt =
      "Verify technical talent screening calibration agent connectivity.";

    const targetApiKey =
      override?.geminiApiKey !== undefined
        ? override.geminiApiKey
        : currentGatewayConfig.geminiApiKey;
    const targetModel =
      override?.geminiModel !== undefined
        ? override.geminiModel
        : currentGatewayConfig.geminiModel;

    if (!targetApiKey || targetApiKey === "mock" || targetApiKey === "test-key") {
      return {
        success: false,
        status: "FAILED",
        provider: "gemini",
        model: targetModel || "gemini-3.5-flash-lite",
        error: "Missing or unconfigured Gemini API Key. Please provide a valid Gemini API Key.",
        fallbackUsed: false,
      };
    }

    const provider = new GeminiProvider({
      apiKey: targetApiKey,
      model: targetModel,
    });

    try {
      const shortTest = await provider.complete(testPrompt, { allowFallback: false });
      const quotaStatuses = getAllRateLimiterStatuses();

      return {
        success: true,
        provider: "gemini",
        model: shortTest.model || targetModel || "gemini-3.5-flash-lite",
        latencyMs: shortTest.executionTimeMs,
        tokensUsed: shortTest.totalTokens,
        fallbackUsed: false,
        quotas: quotaStatuses,
        status: "OPERATIONAL",
      };
    } catch (err: any) {
      console.error("[LLMGatewayService] Test connection failed:", err.message || err);
      return {
        success: false,
        status: "FAILED",
        provider: "gemini",
        model: targetModel || "gemini-3.5-flash-lite",
        error: err.message || "Failed to connect to Google Gemini API",
        fallbackUsed: false,
      };
    }
  }
}

export const llmGateway = new LLMGatewayService();

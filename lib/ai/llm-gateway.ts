import { GeminiProvider, defaultGeminiProvider } from "./gemini-provider";
import { OmniRouteProvider, defaultOmniRouteProvider } from "./omniroute-provider";
import { getAllRateLimiterStatuses } from "./rate-limiter";
import { ScreeningResult } from "./types";

export type LLMProviderType = "gemini" | "omniroute";

export interface GatewayConfig {
  provider: LLMProviderType;
  geminiApiKey?: string;
  omnirouteBaseUrl?: string;
  omnirouteApiKey?: string;
  omnirouteModel?: string;
}

// In-memory active configuration initialized from environment variables
let currentGatewayConfig: GatewayConfig = {
  provider: (process.env.LLM_PROVIDER as LLMProviderType) || "gemini",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  omnirouteBaseUrl: process.env.OMNIROUTE_BASE_URL || "http://localhost:20128/v1",
  omnirouteApiKey: process.env.OMNIROUTE_API_KEY || "sk-omniroute-key",
  omnirouteModel: process.env.OMNIROUTE_MODEL || "kamalai",
};

export function updateGatewayConfig(newConfig: Partial<GatewayConfig>) {
  currentGatewayConfig = { ...currentGatewayConfig, ...newConfig };
  if (newConfig.geminiApiKey !== undefined) {
    defaultGeminiProvider.setApiKey(newConfig.geminiApiKey);
  }
  if (
    newConfig.omnirouteBaseUrl ||
    newConfig.omnirouteApiKey ||
    newConfig.omnirouteModel
  ) {
    defaultOmniRouteProvider.setConfig({
      baseUrl: newConfig.omnirouteBaseUrl,
      apiKey: newConfig.omnirouteApiKey,
      model: newConfig.omnirouteModel,
    });
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
    const config = getGatewayConfig();
    if (config.provider === "omniroute") {
      return await defaultOmniRouteProvider.screenCandidate(params);
    }
    // Default to Google Gemini & Gemma dynamic router
    return await defaultGeminiProvider.screenCandidate(params);
  }

  public async complete(
    prompt: string,
    options: { systemPrompt?: string; temperature?: number; maxTokens?: number; jsonMode?: boolean } = {}
  ) {
    const config = getGatewayConfig();
    if (config.provider === "omniroute") {
      return await defaultOmniRouteProvider.complete(prompt, options);
    }
    return await defaultGeminiProvider.complete(prompt, options);
  }

  public async testConnection(override?: Partial<GatewayConfig>) {
    const activeProvider = override?.provider || currentGatewayConfig.provider;
    const testPrompt =
      "Verify technical talent screening calibration agent connectivity.";

    if (activeProvider === "omniroute") {
      const provider = override?.omnirouteBaseUrl
        ? new OmniRouteProvider({
            baseUrl: override.omnirouteBaseUrl,
            apiKey: override.omnirouteApiKey || currentGatewayConfig.omnirouteApiKey,
            model: override.omnirouteModel || currentGatewayConfig.omnirouteModel,
          })
        : defaultOmniRouteProvider;

      const res = await provider.complete(testPrompt);
      return {
        provider: "omniroute",
        model: res.model,
        latencyMs: res.executionTimeMs,
        tokensUsed: res.totalTokens,
        fallbackUsed: res.fallbackUsed,
        status: "OPERATIONAL",
      };
    }

    // Google Gemini & Gemma
    const provider = override?.geminiApiKey
      ? new GeminiProvider({ apiKey: override.geminiApiKey })
      : defaultGeminiProvider;

    const shortTest = await provider.complete(testPrompt);
    const quotaStatuses = getAllRateLimiterStatuses();

    return {
      provider: "gemini",
      model: shortTest.model,
      latencyMs: shortTest.executionTimeMs,
      tokensUsed: shortTest.totalTokens,
      fallbackUsed: shortTest.fallbackUsed,
      routingThreshold: "12,000 tokens (<12k: gemma-4-31b-it, >=12k: gemini-3.5-flash-lite)",
      quotas: quotaStatuses,
      status: "OPERATIONAL",
    };
  }
}

export const llmGateway = new LLMGatewayService();

/**
 * Sliding-window rate limiter & retry engine for LLM API calls.
 * Enforces strict quotas:
 * - gemma-4-31b-it: 30 requests/min, 16,000 tokens/min
 * - gemini-3.5-flash-lite: 15 requests/min, 250,000 tokens/min
 */

export interface ModelQuota {
  rpm: number;
  tpm: number;
}

export const MODEL_QUOTAS: Record<string, ModelQuota> = {
  "gemma-4-31b-it": {
    rpm: 30,
    tpm: 16000,
  },
  "gemini-3.5-flash-lite": {
    rpm: 15,
    tpm: 250000,
  },
};

interface TokenLog {
  timestamp: number;
  tokens: number;
}

class SlidingWindowLimiter {
  private requestTimestamps: number[] = [];
  private tokenLogs: TokenLog[] = [];
  private readonly windowMs = 60000; // 60 seconds

  constructor(
    public readonly modelName: string,
    public readonly rpm: number,
    public readonly tpm: number
  ) {}

  private prune(now: number) {
    const cutoff = now - this.windowMs;
    while (this.requestTimestamps.length > 0 && this.requestTimestamps[0] <= cutoff) {
      this.requestTimestamps.shift();
    }
    while (this.tokenLogs.length > 0 && this.tokenLogs[0].timestamp <= cutoff) {
      this.tokenLogs.shift();
    }
  }

  public getStatus() {
    const now = Date.now();
    this.prune(now);
    const currentTokens = this.tokenLogs.reduce((acc, curr) => acc + curr.tokens, 0);
    return {
      model: this.modelName,
      rpmLimit: this.rpm,
      currentRpm: this.requestTimestamps.length,
      remainingRpm: Math.max(0, this.rpm - this.requestTimestamps.length),
      tpmLimit: this.tpm,
      currentTpm: currentTokens,
      remainingTpm: Math.max(0, this.tpm - currentTokens),
    };
  }

  public async acquire(estimatedTokens: number = 500): Promise<void> {
    while (true) {
      const now = Date.now();
      this.prune(now);

      const currentTokens = this.tokenLogs.reduce((acc, curr) => acc + curr.tokens, 0);
      let waitMs = 0;

      // Check RPM limit
      if (this.requestTimestamps.length >= this.rpm) {
        const oldestReq = this.requestTimestamps[0];
        const reqWait = this.windowMs - (now - oldestReq) + 50;
        waitMs = Math.max(waitMs, reqWait);
      }

      // Check TPM limit
      if (currentTokens + estimatedTokens > this.tpm && this.tokenLogs.length > 0) {
        const oldestToken = this.tokenLogs[0].timestamp;
        const tokenWait = this.windowMs - (now - oldestToken) + 50;
        waitMs = Math.max(waitMs, tokenWait);
      }

      if (waitMs > 0) {
        const cappedWait = Math.min(waitMs, 5000);
        console.warn(
          `[RateLimiter] Model ${this.modelName} quota throttle. Waiting ${cappedWait}ms (RPM: ${this.requestTimestamps.length}/${this.rpm}, TPM: ${currentTokens}/${this.tpm})`
        );
        await new Promise((resolve) => setTimeout(resolve, cappedWait));
        continue;
      }

      // Reserve slot
      this.requestTimestamps.push(now);
      this.tokenLogs.push({ timestamp: now, tokens: estimatedTokens });
      break;
    }
  }

  public recordActualTokens(actualTokens: number, estimatedTokens: number = 500) {
    const diff = actualTokens - estimatedTokens;
    if (diff === 0 || this.tokenLogs.length === 0) return;
    const last = this.tokenLogs[this.tokenLogs.length - 1];
    last.tokens = Math.max(0, last.tokens + diff);
  }
}

// Global singletons per model to ensure strict sliding window quota across requests
const gemmaLimiter = new SlidingWindowLimiter(
  "gemma-4-31b-it",
  MODEL_QUOTAS["gemma-4-31b-it"].rpm,
  MODEL_QUOTAS["gemma-4-31b-it"].tpm
);

const flashLiteLimiter = new SlidingWindowLimiter(
  "gemini-3.5-flash-lite",
  MODEL_QUOTAS["gemini-3.5-flash-lite"].rpm,
  MODEL_QUOTAS["gemini-3.5-flash-lite"].tpm
);

export function getRateLimiterForModel(modelName: string): SlidingWindowLimiter {
  if (modelName.includes("gemma")) {
    return gemmaLimiter;
  }
  return flashLiteLimiter;
}

export function getAllRateLimiterStatuses() {
  return {
    gemma: gemmaLimiter.getStatus(),
    flashLite: flashLiteLimiter.getStatus(),
  };
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
}

export async function withRetry<T>(
  action: (signal: AbortSignal) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1200,
    maxDelayMs = 25000,
    timeoutMs = 45000,
  } = options;

  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await action(controller.signal);
      clearTimeout(timeoutId);
      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);
      attempt++;

      const isTimeout = err?.name === "AbortError" || err?.message?.includes("aborted");
      const isRateLimited =
        err?.status === 429 ||
        err?.message?.includes("429") ||
        err?.message?.toLowerCase().includes("rate limit") ||
        err?.message?.toLowerCase().includes("quota");
      const isServerTransient =
        err?.status >= 500 && err?.status < 600;

      const shouldRetry =
        attempt <= maxRetries && (isTimeout || isRateLimited || isServerTransient);

      if (!shouldRetry) {
        throw err;
      }

      // Parse retry-after seconds if present in error message or headers
      let waitTime = 0;
      if (err?.headers && typeof err.headers.get === "function") {
        const retryAfter = err.headers.get("retry-after");
        if (retryAfter) {
          const parsed = parseFloat(retryAfter);
          if (!isNaN(parsed)) {
            waitTime = parsed * 1000;
          }
        }
      }

      if (waitTime === 0) {
        // Exponential backoff with jitter
        const jitter = Math.random() * 400;
        waitTime = Math.min(
          maxDelayMs,
          baseDelayMs * Math.pow(2, attempt - 1) + jitter
        );
      }

      console.warn(
        `[withRetry] Attempt ${attempt}/${maxRetries} failed (${err.message || err}). Retrying in ${Math.round(waitTime)}ms...`
      );
      await new Promise((res) => setTimeout(res, waitTime));
    }
  }
}


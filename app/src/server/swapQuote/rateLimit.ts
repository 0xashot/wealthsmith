/**
 * rateLimit — Step 23B.1 (SERVER-ONLY). Because each quote comparison triggers several external requests, the
 * endpoint applies server-side protection: max body size, per-caller burst + sustained limits, and global +
 * per-provider concurrency caps. Limits are VERSIONED config. A limited request gets a safe 429 with a
 * `retryAfterMs` — never a raw provider error. Frontend throttling is never relied upon.
 */
export const SWAP_RATE_LIMIT_VERSION = "swap_rate_limit_1.0.0" as const;

export const SWAP_RATE_LIMIT_CONFIG = {
  maxBodyBytes: 4096,
  /** Per-caller (IP or equivalent) short burst allowance. */
  perCallerBurst: 8,
  /** Per-caller sustained requests per minute. */
  perCallerPerMinute: 30,
  /** Global in-flight comparison cap. */
  globalConcurrency: 16,
  /** Per-provider in-flight request cap (bounds external fan-out). */
  providerConcurrency: 8,
} as const;

export interface RateDecision {
  allowed: boolean;
  reason: "ok" | "burst_exceeded" | "sustained_exceeded" | "global_concurrency_exceeded";
  retryAfterMs: number;
}

interface CallerState {
  windowStartMs: number;
  countInWindow: number;
  burstTokens: number;
  lastRefillMs: number;
}

/** In-memory limiter (per process). A deployment with multiple instances would back this with shared storage. */
export class SwapRateLimiter {
  private callers = new Map<string, CallerState>();
  private inFlight = 0;
  constructor(private cfg = SWAP_RATE_LIMIT_CONFIG, private now: () => number = () => Date.now()) {}

  /** Decide whether a caller may start a comparison now. Call `release()` when the comparison finishes. */
  acquire(callerId: string): RateDecision {
    const t = this.now();
    if (this.inFlight >= this.cfg.globalConcurrency) return { allowed: false, reason: "global_concurrency_exceeded", retryAfterMs: 1000 };
    const s = this.callers.get(callerId) ?? { windowStartMs: t, countInWindow: 0, burstTokens: this.cfg.perCallerBurst, lastRefillMs: t };
    // Refill burst tokens proportionally (token bucket over the sustained rate).
    const refill = ((t - s.lastRefillMs) / 60_000) * this.cfg.perCallerPerMinute;
    s.burstTokens = Math.min(this.cfg.perCallerBurst, s.burstTokens + refill);
    s.lastRefillMs = t;
    // Sustained window (fixed 60s).
    if (t - s.windowStartMs >= 60_000) { s.windowStartMs = t; s.countInWindow = 0; }
    if (s.burstTokens < 1) { this.callers.set(callerId, s); return { allowed: false, reason: "burst_exceeded", retryAfterMs: Math.ceil((1 - s.burstTokens) / this.cfg.perCallerPerMinute * 60_000) }; }
    if (s.countInWindow >= this.cfg.perCallerPerMinute) { this.callers.set(callerId, s); return { allowed: false, reason: "sustained_exceeded", retryAfterMs: 60_000 - (t - s.windowStartMs) }; }
    s.burstTokens -= 1;
    s.countInWindow += 1;
    this.callers.set(callerId, s);
    this.inFlight += 1;
    return { allowed: true, reason: "ok", retryAfterMs: 0 };
  }

  release(): void {
    if (this.inFlight > 0) this.inFlight -= 1;
  }
}

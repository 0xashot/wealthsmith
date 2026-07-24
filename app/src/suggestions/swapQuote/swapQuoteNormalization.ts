/**
 * swapQuoteNormalization — Step 23A. PURE adapters that map an ALREADY-FETCHED, quote-only provider response
 * into the neutral `SwapQuoteCandidate`. No network I/O happens here (a later slice supplies the raw object);
 * these functions only normalize + disclose. Every adapter:
 *   • rejects any raw payload containing a transaction/instructions/signature field (fails closed →
 *     `normalization_failed`) so executable data can never enter the quote layer;
 *   • drops the raw payload — only normalized fields survive;
 *   • records the EXECUTION SURFACE (Jupiter/Raydium/Orca) separately from the UNDERLYING VENUES (the DEX pools
 *     actually providing liquidity), because a Jupiter candidate may route through Raydium/Orca — those are not
 *     independent economic routes and must not be shown as such;
 *   • applies the shared conservative network-fee estimate consistently (never a per-route simulated fee).
 */
import type {
  SwapQuoteCandidate,
  SwapRouteLiquidityAssessment,
  SwapQuoteFreshness,
} from "./swapQuoteContracts";
import { SWAP_PROVIDER_NAME } from "./swapQuoteContracts";
import { assertNoTransactionFields } from "./swapQuoteSecurityGuard";
import { rawToTokens, rawToUsd, isRawIntegerString } from "./swapAmountMath";
import { SWAP_NETWORK_FEE_POLICY, SWAP_QUOTE_OPERATIONAL_POLICY } from "./swapQuotePolicy";

/**
 * Step 23C — EXPLICIT, VERSIONED per-provider price-impact units (the ambiguous `≤1 → ×100` heuristic is removed).
 * Units were verified empirically against live mainnet quotes (23C §1 hard gate):
 *   • Jupiter: `priceImpactPct` is a DECIMAL FRACTION (e.g. 0.0000816 = 0.00816%) → ×100 to get percent.
 *   • Raydium: `priceImpactPct` is PERCENTAGE POINTS already (e.g. 0.93 = 0.93%) → use as-is.
 *   • Orca: the injected Whirlpools computer supplies a DECIMAL FRACTION (SDK convention) → ×100.
 * The exclusive < 0.50% threshold is unchanged; exactly 0.50% stays ineligible.
 */
export const SWAP_NORMALIZATION_VERSION = "swap_normalization_2.0.0" as const;
const toNum = (v: string | number | undefined): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};
/** Jupiter/Orca: fraction → percent. */
const fractionImpactToPercent = (v: string | number | undefined): number | null => { const n = toNum(v); return n == null ? null : Math.abs(n) * 100; };
/** Raydium: already percentage points → percent. */
const percentImpactToPercent = (v: string | number | undefined): number | null => { const n = toNum(v); return n == null ? null : Math.abs(n); };

/** The shared snapshot every candidate in one comparison is normalized against (same prices, same window). */
export interface SwapQuoteSnapshotContext {
  inputMint: string;
  outputMint: string;
  inputDecimals: number;
  outputDecimals: number;
  /** Exact requested raw input (base units) — must match the action leg; a mismatch is caught in eligibility. */
  inputAmountRaw: string;
  /** USD unit price of the OUTPUT token from the shared snapshot (null → expectedOutputUsd unavailable). */
  outputUnitPriceUsd: number | null;
  /** The moment the comparison window opened (freshness/expiry are judged against this). */
  comparedAtMs: number;
  freshnessWindowMs?: number;
}

const UNRESOLVED_LIQUIDITY: SwapRouteLiquidityAssessment = { status: "unresolved", minimumRouteLegLiquidityUsd: null, legs: [] };

/** Compute freshness from an optional provider `expiresAt` and the quote age vs the policy window. */
export function computeFreshness(quotedAtMs: number | null, expiresAtMs: number | null, comparedAtMs: number, windowMs: number = SWAP_QUOTE_OPERATIONAL_POLICY.freshnessWindowMs): SwapQuoteFreshness {
  if (quotedAtMs == null || !Number.isFinite(quotedAtMs)) return "unresolved";
  if (expiresAtMs != null && Number.isFinite(expiresAtMs)) return comparedAtMs > expiresAtMs ? "expired" : "fresh";
  return comparedAtMs - quotedAtMs > windowMs ? "stale" : "fresh";
}

const toMs = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
};

interface NormalizeCommonArgs {
  ctx: SwapQuoteSnapshotContext;
  liquidity?: SwapRouteLiquidityAssessment;
}

/** Build the shared normalized fields (post-rejection). Returns a partial candidate the adapter completes. */
function baseCandidate(
  providerId: SwapQuoteCandidate["providerId"],
  args: {
    expectedOutputRaw: string;
    minimumOutputRaw: string | null;
    priceImpactPct: number | null;
    includedSwapFeeUsd: number | null;
    explicitPlatformFeeUsd: number | null;
    quotedAtIso: string;
    expiresAtIso: string | null;
    quoteLatencyMs: number | null;
    underlyingVenues: string[];
    ctx: SwapQuoteSnapshotContext;
    liquidity?: SwapRouteLiquidityAssessment;
  },
): SwapQuoteCandidate {
  const { ctx } = args;
  const expectedOutputTokens = rawToTokens(args.expectedOutputRaw, ctx.outputDecimals) ?? "0";
  const expectedOutputUsd = rawToUsd(args.expectedOutputRaw, ctx.outputDecimals, ctx.outputUnitPriceUsd);
  const freshness = computeFreshness(toMs(args.quotedAtIso), toMs(args.expiresAtIso), ctx.comparedAtMs, ctx.freshnessWindowMs);
  return {
    providerId,
    providerName: SWAP_PROVIDER_NAME[providerId],
    executionSurface: providerId,
    underlyingVenues: args.underlyingVenues,
    inputMint: ctx.inputMint,
    outputMint: ctx.outputMint,
    inputAmountRaw: ctx.inputAmountRaw,
    expectedOutputRaw: args.expectedOutputRaw,
    minimumOutputRaw: args.minimumOutputRaw,
    expectedOutputTokens,
    expectedOutputUsd,
    quotedAt: args.quotedAtIso,
    expiresAt: args.expiresAtIso,
    quoteLatencyMs: args.quoteLatencyMs,
    priceImpactPct: args.priceImpactPct,
    includedSwapFeeUsd: args.includedSwapFeeUsd,
    explicitPlatformFeeUsd: args.explicitPlatformFeeUsd,
    // Non-included costs: the SAME conservative estimate for every candidate (never a simulated per-route fee).
    estimatedNetworkFeeUsd: SWAP_NETWORK_FEE_POLICY.conservativeNetworkFeeUsd,
    estimatedRentFeeUsd: SWAP_NETWORK_FEE_POLICY.conservativeRentFeeUsd,
    liquidityAssessment: args.liquidity ?? UNRESOLVED_LIQUIDITY,
    freshness,
    eligible: false, // eligibility is decided by swapQuoteEligibility, never by the adapter
    exclusionReasons: [],
  };
}

/** A candidate the provider could not route / normalize (kept for transparent exclusion reporting). */
export function normalizationFailedCandidate(providerId: SwapQuoteCandidate["providerId"], ctx: SwapQuoteSnapshotContext, reason: "no_route" | "normalization_failed"): SwapQuoteCandidate {
  return {
    providerId,
    providerName: SWAP_PROVIDER_NAME[providerId],
    executionSurface: providerId,
    underlyingVenues: [],
    inputMint: ctx.inputMint,
    outputMint: ctx.outputMint,
    inputAmountRaw: ctx.inputAmountRaw,
    expectedOutputRaw: "0",
    minimumOutputRaw: null,
    expectedOutputTokens: "0",
    expectedOutputUsd: null,
    quotedAt: new Date(ctx.comparedAtMs).toISOString(),
    expiresAt: null,
    quoteLatencyMs: null,
    priceImpactPct: null,
    includedSwapFeeUsd: null,
    explicitPlatformFeeUsd: null,
    estimatedNetworkFeeUsd: SWAP_NETWORK_FEE_POLICY.conservativeNetworkFeeUsd,
    estimatedRentFeeUsd: SWAP_NETWORK_FEE_POLICY.conservativeRentFeeUsd,
    liquidityAssessment: UNRESOLVED_LIQUIDITY,
    freshness: "unresolved",
    eligible: false,
    exclusionReasons: [reason],
  };
}

/* ------------------------------------------------------------------ *
 * Jupiter — Swap V2 Meta-Aggregator, quote-only (no taker → transaction must be null). A Jupiter candidate's
 * underlying venues come from the routePlan swapInfo labels (e.g. "Raydium CLMM", "Orca Whirlpool").
 * ------------------------------------------------------------------ */
export interface JupiterRawQuote {
  inAmount?: string;
  outAmount?: string;
  otherAmountThreshold?: string;
  priceImpactPct?: string | number;
  swapUsdValue?: string | number;
  platformFee?: { amount?: string; feeBps?: number; amountUsd?: number } | null;
  routePlan?: Array<{ swapInfo?: { ammKey?: string; label?: string; inputMint?: string; outputMint?: string; feeAmount?: string; feeMint?: string }; percent?: number }>;
  contextSlot?: number;
  timeTaken?: number;
  /** Must be null/absent for quote-only. Presence is rejected by the security guard. */
  transaction?: unknown;
}

export function normalizeJupiterQuote(raw: JupiterRawQuote, quotedAtIso: string, args: NormalizeCommonArgs): SwapQuoteCandidate {
  try {
    assertNoTransactionFields(raw);
    if (!raw || !isRawIntegerString(String(raw.outAmount ?? ""))) return normalizationFailedCandidate("jupiter", args.ctx, "no_route");
    const underlyingVenues = (raw.routePlan ?? [])
      .map((r) => r.swapInfo?.label)
      .filter((l): l is string => typeof l === "string" && l.length > 0);
    return baseCandidate("jupiter", {
      expectedOutputRaw: String(raw.outAmount),
      minimumOutputRaw: isRawIntegerString(String(raw.otherAmountThreshold ?? "")) ? String(raw.otherAmountThreshold) : null,
      priceImpactPct: fractionImpactToPercent(raw.priceImpactPct), // Jupiter: decimal fraction → percent
      includedSwapFeeUsd: null, // Jupiter route fees are reflected in outAmount (included) — not re-subtracted
      explicitPlatformFeeUsd: typeof raw.platformFee?.amountUsd === "number" ? raw.platformFee.amountUsd : null,
      quotedAtIso,
      expiresAtIso: null, // Jupiter quotes carry no explicit expiry → judged by the freshness window
      quoteLatencyMs: typeof raw.timeTaken === "number" ? Math.round(raw.timeTaken * 1000) : null,
      underlyingVenues,
      ctx: args.ctx,
      liquidity: args.liquidity,
    });
  } catch {
    return normalizationFailedCandidate("jupiter", args.ctx, "normalization_failed");
  }
}

/* ------------------------------------------------------------------ *
 * Raydium — exact-input quote-only. Raydium is its own execution surface (Raydium-native routing).
 * ------------------------------------------------------------------ */
export interface RaydiumRawQuote {
  outputAmount?: string;
  otherAmountThreshold?: string;
  priceImpactPct?: string | number;
  feeAmount?: string;
  feeMint?: string;
  quotedAt?: string;
  expiresAt?: string;
  routePlan?: Array<{ poolId?: string; ammLabel?: string }>;
  transaction?: unknown;
}

export function normalizeRaydiumQuote(raw: RaydiumRawQuote, quotedAtIso: string, args: NormalizeCommonArgs): SwapQuoteCandidate {
  try {
    assertNoTransactionFields(raw);
    if (!raw || !isRawIntegerString(String(raw.outputAmount ?? ""))) return normalizationFailedCandidate("raydium", args.ctx, "no_route");
    const underlyingVenues = (raw.routePlan ?? []).map((r) => r.ammLabel ?? (r.poolId ? `Raydium ${r.poolId.slice(0, 6)}…` : "")).filter((l): l is string => l.length > 0);
    return baseCandidate("raydium", {
      expectedOutputRaw: String(raw.outputAmount),
      minimumOutputRaw: isRawIntegerString(String(raw.otherAmountThreshold ?? "")) ? String(raw.otherAmountThreshold) : null,
      priceImpactPct: percentImpactToPercent(raw.priceImpactPct), // Raydium: percentage points already (verified 23C §1)
      includedSwapFeeUsd: null, // Raydium pool fee is reflected in outputAmount (included)
      explicitPlatformFeeUsd: null,
      quotedAtIso: raw.quotedAt ?? quotedAtIso,
      expiresAtIso: raw.expiresAt ?? null,
      quoteLatencyMs: null,
      underlyingVenues: underlyingVenues.length > 0 ? underlyingVenues : ["Raydium"],
      ctx: args.ctx,
      liquidity: args.liquidity,
    });
  } catch {
    return normalizationFailedCandidate("raydium", args.ctx, "normalization_failed");
  }
}

/* ------------------------------------------------------------------ *
 * Orca — Whirlpools quote tooling, quote-only. If Orca cannot route the exact pair/amount, that is `no_route`
 * (a normal exclusion), never a system failure.
 * ------------------------------------------------------------------ */
export interface OrcaRawQuote {
  estimatedAmountOut?: string;
  minAmountOut?: string;
  otherAmountThreshold?: string;
  estimatedFeeAmount?: string;
  estimatedFeeAmountUsd?: number;
  priceImpactPct?: string | number;
  whirlpoolAddress?: string;
  direction?: "aToB" | "bToA";
  quotedAt?: string;
  transaction?: unknown;
}

export function normalizeOrcaQuote(raw: OrcaRawQuote, quotedAtIso: string, args: NormalizeCommonArgs): SwapQuoteCandidate {
  try {
    assertNoTransactionFields(raw);
    if (!raw || !isRawIntegerString(String(raw.estimatedAmountOut ?? ""))) return normalizationFailedCandidate("orca", args.ctx, "no_route");
    const minOut = raw.minAmountOut ?? raw.otherAmountThreshold;
    return baseCandidate("orca", {
      expectedOutputRaw: String(raw.estimatedAmountOut),
      minimumOutputRaw: isRawIntegerString(String(minOut ?? "")) ? String(minOut) : null,
      priceImpactPct: fractionImpactToPercent(raw.priceImpactPct), // Orca: SDK fraction → percent
      includedSwapFeeUsd: typeof raw.estimatedFeeAmountUsd === "number" ? raw.estimatedFeeAmountUsd : null, // Orca swap fee is reflected in estimatedAmountOut (included, disclosed)
      explicitPlatformFeeUsd: null,
      quotedAtIso: raw.quotedAt ?? quotedAtIso,
      expiresAtIso: null,
      quoteLatencyMs: null,
      underlyingVenues: raw.whirlpoolAddress ? [`Orca Whirlpool ${raw.whirlpoolAddress.slice(0, 6)}…`] : ["Orca Whirlpool"],
      ctx: args.ctx,
      liquidity: args.liquidity,
    });
  } catch {
    return normalizationFailedCandidate("orca", args.ctx, "normalization_failed");
  }
}

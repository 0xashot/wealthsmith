/**
 * yieldStrategyMarketDataPolicy — Step 16C. The canonical, versioned FRESHNESS + VALIDITY policy for
 * Stable Yield market data: supported APY windows / APY definitions / withdrawal statuses, the TVL
 * threshold, the two-lane freshness rules, and the deterministic field-freshness + APY-sufficiency
 * evaluators. POLICY ONLY — it fetches nothing, compares nothing, ranks nothing, and enables nothing.
 *
 * FRESHNESS PRECEDENTS in the repo: contribution PRICE data is <= 60 minutes
 * (`SOL_CONTRIBUTION_PRICE_MAX_AGE_MS`); the SOL staking market cache (APY/TVL) uses a looser 24-hour
 * window. A Stable Yield decision deploys USDC PRINCIPAL, so it adopts the STRICTER 60-minute canonical
 * bound as the Excess-USDC-lane default and a stricter 15-minute bound for the Safety-Buffer lane
 * (which touches reserve capital). These are formalized here as `yield_strategy_market_data_v1`.
 */
import {
  YIELD_STRATEGY_MARKET_DATA_POLICY_ID,
  YIELD_STRATEGY_MARKET_DATA_POLICY_VERSION,
  YIELD_STRATEGY_MARKET_DATA_SCHEMA_VERSION,
  type YieldApyData,
  type YieldApyDefinition,
  type YieldApyWindow,
  type YieldLiquidityConfidence,
  type YieldMarketFieldStatus,
  type YieldWithdrawalStatus,
} from "./yieldStrategyMarketDataTypes";

export const YIELD_STRATEGY_MARKET_DATA_POLICY_EXISTS = true;

/** Excess-USDC-lane freshness bound: 60 minutes (the stricter canonical price/market bound in the repo). */
export const YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS = 60 * 60 * 1000;
/** Safety-Buffer-lane freshness bound: 15 minutes — stricter, because buffer capital is more sensitive. */
export const YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS = 15 * 60 * 1000;
/** Small clock-skew tolerance for a fetchedAt slightly ahead of checkedAt. */
export const YIELD_STRATEGY_MARKET_DATA_FUTURE_SKEW_MS = 5000;

/** APY windows the policy understands. `unknown` is preserved but fails closed for windowed comparison. */
export const YIELD_SUPPORTED_APY_WINDOWS: readonly YieldApyWindow[] = ["spot", "current", "7d", "30d", "unknown"];

/** APY definitions the policy understands. Only `net`/`gross` are comparison-sufficient. */
export const YIELD_SUPPORTED_APY_DEFINITIONS: readonly YieldApyDefinition[] = ["net", "gross", "estimated", "current", "variable", "unknown"];

/** APY definitions that carry a defined, comparable interpretation for a LATER comparison step. */
export const YIELD_COMPARISON_SUFFICIENT_APY_DEFINITIONS: readonly YieldApyDefinition[] = ["net", "gross"];

/** Every explicit withdrawal state. `unknown` is a valid recorded state but blocks the buffer lane later. */
export const YIELD_SUPPORTED_WITHDRAWAL_STATUSES: readonly YieldWithdrawalStatus[] = [
  "instant_currently_available",
  "partial_currently_available",
  "withdrawal_required",
  "queue_possible",
  "unavailable",
  "unknown",
];

/** Withdrawal states the Safety-Buffer lane may later accept (instant liquidity only). */
export const YIELD_BUFFER_LANE_WITHDRAWAL_STATUSES: readonly YieldWithdrawalStatus[] = ["instant_currently_available"];

export const YIELD_SUPPORTED_LIQUIDITY_CONFIDENCE: readonly YieldLiquidityConfidence[] = ["explicit_source", "partial", "unknown"];

/** A TVL value must be a finite number strictly above this floor to be considered present/valid. */
export const YIELD_MARKET_TVL_MIN_USD = 0;

/** Strategy types that may carry market data (the 16A taxonomy; `future_other` is never evaluable). */
export const YIELD_MARKET_SUPPORTED_STRATEGY_TYPES: readonly string[] = ["lending", "managed_vault", "staking_like_vault", "stable_liquidity_strategy"];

export const YIELD_MARKET_SUPPORTED_LANES: readonly string[] = ["safety_buffer_yield", "excess_usdc_yield"];

/**
 * APPROVED-VERSUS-NONAPPROVED behavior. Only an APPROVED registry entry with a documented exact address
 * may carry live market data and become a future comparison candidate. A `documentation_required` (or
 * any non-approved) entry is deterministically kept as a documentation-only, `unavailable` snapshot —
 * never auto-approved, never given fabricated data. A zero-approved registry is a valid, empty state.
 */
export const YIELD_MARKET_APPROVED_LIFECYCLES: readonly string[] = ["approved"];

export interface YieldMarketDataPolicy {
  schemaVersion: "1.0.0";
  policyId: string;
  policyVersion: "1.0.0";
  excessLaneMaxAgeMs: number;
  bufferLaneMaxAgeMs: number;
  futureSkewMs: number;
  supportedApyWindows: YieldApyWindow[];
  supportedApyDefinitions: YieldApyDefinition[];
  comparisonSufficientApyDefinitions: YieldApyDefinition[];
  supportedWithdrawalStatuses: YieldWithdrawalStatus[];
  bufferLaneWithdrawalStatuses: YieldWithdrawalStatus[];
  tvlMinUsd: number;
  approvedLifecycles: string[];
  notes: string[];
}

/** The full deterministic market-data policy. */
export function getYieldStrategyMarketDataPolicy(): YieldMarketDataPolicy {
  return {
    schemaVersion: YIELD_STRATEGY_MARKET_DATA_SCHEMA_VERSION,
    policyId: YIELD_STRATEGY_MARKET_DATA_POLICY_ID,
    policyVersion: YIELD_STRATEGY_MARKET_DATA_POLICY_VERSION,
    excessLaneMaxAgeMs: YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS,
    bufferLaneMaxAgeMs: YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS,
    futureSkewMs: YIELD_STRATEGY_MARKET_DATA_FUTURE_SKEW_MS,
    supportedApyWindows: [...YIELD_SUPPORTED_APY_WINDOWS],
    supportedApyDefinitions: [...YIELD_SUPPORTED_APY_DEFINITIONS],
    comparisonSufficientApyDefinitions: [...YIELD_COMPARISON_SUFFICIENT_APY_DEFINITIONS],
    supportedWithdrawalStatuses: [...YIELD_SUPPORTED_WITHDRAWAL_STATUSES],
    bufferLaneWithdrawalStatuses: [...YIELD_BUFFER_LANE_WITHDRAWAL_STATUSES],
    tvlMinUsd: YIELD_MARKET_TVL_MIN_USD,
    approvedLifecycles: [...YIELD_MARKET_APPROVED_LIFECYCLES],
    notes: [
      "Excess lane 60m (stricter canonical price bound); Safety Buffer lane 15m (stricter still).",
      "Only an approved registry entry with a documented address carries market data; zero approved is valid.",
      "No silent refresh, no browser fetch. Stale data stays stale.",
    ],
  };
}

/** The stricter freshness bound for a lane. Buffer lane is the tightest. */
export function laneMaxAgeMs(lane: "safety_buffer_yield" | "excess_usdc_yield"): number {
  return lane === "safety_buffer_yield" ? YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS : YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS;
}

/**
 * Evaluate one field's freshness deterministically. Returns:
 *  - "missing" when there is no fetch timestamp,
 *  - "invalid" when a timestamp is unparseable or in the future beyond skew,
 *  - "stale" when older than maximumAgeMs,
 *  - "fresh" otherwise.
 * Never silently refreshes; never assumes a default timestamp.
 */
export function evaluateMarketFreshness(
  fetchedAt: string | undefined,
  checkedAt: string,
  maximumAgeMs: number,
): { status: YieldMarketFieldStatus; ageMs?: number } {
  if (!fetchedAt) return { status: "missing" };
  const fetchedMs = Date.parse(fetchedAt);
  const checkedMs = Date.parse(checkedAt);
  if (Number.isNaN(fetchedMs) || Number.isNaN(checkedMs)) return { status: "invalid" };
  if (fetchedMs - checkedMs > YIELD_STRATEGY_MARKET_DATA_FUTURE_SKEW_MS) return { status: "invalid" };
  const ageMs = Math.max(0, checkedMs - fetchedMs);
  return { status: ageMs > maximumAgeMs ? "stale" : "fresh", ageMs };
}

/** A finite, non-negative number is a valid market magnitude (APY/TVL/liquidity). */
export function isValidMarketNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

/** True only when the source APY carries a comparison-sufficient (net/gross) interpretation. */
export function isApyDefinitionSufficientForComparison(def: YieldApyDefinition): boolean {
  return (YIELD_COMPARISON_SUFFICIENT_APY_DEFINITIONS as readonly string[]).includes(def);
}

/** Whether a recorded APY payload is internally consistent (definition/window supported, values finite). */
export function isApyPayloadValid(apy: Pick<YieldApyData, "apyDefinition" | "apyWindow" | "currentApyPct" | "sevenDayApyPct" | "thirtyDayApyPct" | "grossApyPct" | "netApyPct">): boolean {
  if (!(YIELD_SUPPORTED_APY_DEFINITIONS as readonly string[]).includes(apy.apyDefinition)) return false;
  if (!(YIELD_SUPPORTED_APY_WINDOWS as readonly string[]).includes(apy.apyWindow)) return false;
  for (const v of [apy.currentApyPct, apy.sevenDayApyPct, apy.thirtyDayApyPct, apy.grossApyPct, apy.netApyPct]) {
    if (v !== undefined && !isValidMarketNumber(v)) return false;
  }
  return true;
}

/**
 * yieldStrategyProductCapacity — Step 16G. The exact-product DEPOSIT-CAPACITY contract + validators.
 * Deposit capacity is DISTINCT from 16C withdrawal liquidity / TVL / APY / position value — it is
 * injected read-only, must match the exact registry product (protocol + address + asset), never
 * approves a product, never alters eligibility or the comparison leader, and is never inferred from TVL,
 * withdrawal liquidity, or protocol brand. Freshness reuses the lane market-data bounds (buffer 15m /
 * excess 60m); stale/future/missing/unknown/paused/full fail closed. `verified_uncapped` never
 * serializes Infinity — the effective ceiling is the user's lane capital.
 */
import { YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS, YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS, YIELD_STRATEGY_MARKET_DATA_FUTURE_SKEW_MS } from "./yieldStrategyMarketDataPolicy";
import type { YieldMarketProvenanceKind } from "./yieldStrategyMarketDataTypes";
import type { YieldStrategyEligibilityLane } from "./yieldStrategyEligibilityTypes";

export const YIELD_STRATEGY_PRODUCT_CAPACITY_SCHEMA_VERSION = "1.0.0";
export const YIELD_STRATEGY_PRODUCT_CAPACITY_POLICY_ID = "yield_strategy_product_capacity_v1";
export const YIELD_STRATEGY_PRODUCT_CAPACITY_POLICY_VERSION = "1.0.0";
export const YIELD_STRATEGY_PRODUCT_CAPACITY_EXISTS = true;

export type YieldStrategyCapacityMode = "explicit_remaining_capacity" | "verified_uncapped" | "deposits_paused" | "product_full" | "unavailable" | "unknown" | "invalid";
export type YieldStrategyProductCapacityStatus = "complete" | "partial" | "stale" | "invalid" | "unavailable";

export interface YieldStrategyProductCapacitySnapshot {
  schemaVersion: "1.0.0";
  policyId: string;
  policyVersion: "1.0.0";

  strategyId: string;
  protocolId: string;
  productAddress: string;
  principalAssetId: string;

  capacityMode: YieldStrategyCapacityMode;
  acceptingDeposits: boolean;

  remainingDepositCapacityUsd?: number;
  userRemainingDepositCapacityUsd?: number;
  minimumDepositUsd?: number;
  maximumDepositUsd?: number;

  sourceId: string;
  sourceLabel?: string;
  sourceUrl?: string;
  provenanceKind?: YieldMarketProvenanceKind;
  browserFetched?: boolean;

  fetchedAt: string;
  checkedAt: string;
  maximumAgeMs?: number;
  ageMs?: number;

  status: YieldStrategyProductCapacityStatus;

  warnings: string[];
  blockers: string[];

  productSelected: false;
  amountSelected: false;
  planGenerated: false;
  suggestionGenerated: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

export interface YieldStrategyProductCapacityValidationResult { valid: boolean; errors: string[]; }

const isFiniteNonNeg = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const isIso = (s: unknown): boolean => typeof s === "string" && s.length > 0 && !Number.isNaN(Date.parse(s));
const MODES = new Set(["explicit_remaining_capacity", "verified_uncapped", "deposits_paused", "product_full", "unavailable", "unknown", "invalid"]);

/** The canonical capacity freshness bound for a lane (reused from 16C). */
export function capacityMaxAgeMs(lane: YieldStrategyEligibilityLane): number {
  return lane === "buffer" ? YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS : YIELD_STRATEGY_MARKET_DATA_MAX_AGE_MS;
}

/** Freshness verdict for a capacity snapshot against the lane bound. */
export function capacityFreshness(snapshot: YieldStrategyProductCapacitySnapshot, lane: YieldStrategyEligibilityLane): "fresh" | "stale" | "invalid" | "missing" {
  if (!snapshot.fetchedAt) return "missing";
  const fetchedMs = Date.parse(snapshot.fetchedAt);
  const checkedMs = Date.parse(snapshot.checkedAt);
  if (Number.isNaN(fetchedMs) || Number.isNaN(checkedMs)) return "invalid";
  if (fetchedMs - checkedMs > YIELD_STRATEGY_MARKET_DATA_FUTURE_SKEW_MS) return "invalid";
  const ageMs = Math.max(0, checkedMs - fetchedMs);
  return ageMs > capacityMaxAgeMs(lane) ? "stale" : "fresh";
}

/**
 * The effective, bounded deposit capacity in USD for a fresh accepting product. `verified_uncapped`
 * returns the `laneCapitalCeilingUsd` (never Infinity). Non-accepting/unbounded/unknown → 0.
 */
export function effectiveProductCapacityUsd(snapshot: YieldStrategyProductCapacitySnapshot, laneCapitalCeilingUsd: number): number {
  if (snapshot.capacityMode === "verified_uncapped") return Math.max(0, laneCapitalCeilingUsd);
  if (snapshot.capacityMode === "explicit_remaining_capacity") {
    const bounds = [snapshot.remainingDepositCapacityUsd, snapshot.userRemainingDepositCapacityUsd].filter((v): v is number => isFiniteNonNeg(v));
    if (bounds.length === 0) return 0;
    return Math.min(...bounds);
  }
  return 0;
}

/** Validate a capacity snapshot against the exact expected registry product identity. Fails closed. */
export function validateYieldStrategyProductCapacitySnapshot(snapshot: unknown, expected?: { strategyId: string; protocolId: string; productAddress: string; principalAssetId: string }): YieldStrategyProductCapacityValidationResult {
  const errors: string[] = [];
  if (!snapshot || typeof snapshot !== "object") return { valid: false, errors: ["capacity_not_an_object"] };
  const s = snapshot as YieldStrategyProductCapacitySnapshot;
  if (s.schemaVersion !== YIELD_STRATEGY_PRODUCT_CAPACITY_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (s.policyId !== YIELD_STRATEGY_PRODUCT_CAPACITY_POLICY_ID) errors.push("wrong_policy_id");
  if (!s.strategyId || !s.protocolId || !s.productAddress) errors.push("missing_identity");
  if (!MODES.has(s.capacityMode)) errors.push("invalid_capacity_mode");
  if (s.browserFetched === true) errors.push("browser_fetched");
  if (!isIso(s.fetchedAt)) errors.push("invalid_fetched_at");
  const flagsOff = s.productSelected === false && s.amountSelected === false && s.planGenerated === false && s.suggestionGenerated === false && s.transactionsEnabled === false && s.walletSignatureRequired === false;
  if (!flagsOff) errors.push("capability_flag_enabled");
  // explicit capacity requires a finite non-negative bound; verified_uncapped must not serialize a number as Infinity.
  if (s.capacityMode === "explicit_remaining_capacity") {
    if (!isFiniteNonNeg(s.remainingDepositCapacityUsd) && !isFiniteNonNeg(s.userRemainingDepositCapacityUsd)) errors.push("explicit_capacity_without_bound");
  }
  for (const v of [s.remainingDepositCapacityUsd, s.userRemainingDepositCapacityUsd, s.minimumDepositUsd, s.maximumDepositUsd]) {
    if (v !== undefined && !isFiniteNonNeg(v)) errors.push("non_finite_capacity_value");
  }
  if (s.capacityMode === "deposits_paused" && s.acceptingDeposits !== false) errors.push("paused_but_accepting");
  if (s.capacityMode === "product_full" && s.acceptingDeposits !== false) errors.push("full_but_accepting");
  // Identity cross-check.
  if (expected) {
    if (s.strategyId !== expected.strategyId) errors.push("strategy_id_mismatch");
    if (s.protocolId !== expected.protocolId) errors.push("protocol_id_mismatch");
    if (s.productAddress !== expected.productAddress) errors.push("address_mismatch");
    if (s.principalAssetId !== expected.principalAssetId) errors.push("principal_asset_mismatch");
  }
  return { valid: errors.length === 0, errors };
}

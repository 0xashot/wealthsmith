/**
 * yieldStrategyPlanPolicy — Step 16G. Deterministic plan-selection policy: lane priority, lane
 * minimums, effective min/max helpers, exact-cent flooring (reused Step-15 behavior), and the STABLE
 * plan-ID hash. The excess minimum REUSES the canonical `DCA_EXCESS_USDC_TRIGGER_USD` ($250). NO
 * canonical Safety-Buffer-Yield deposit minimum exists (the $50 is contribution/DCA-scoped, not
 * reused): the buffer lane fails closed with `buffer_yield_minimum_policy_missing` unless a future
 * canonical buffer minimum is explicitly supplied.
 */
import { usdToPlanCents } from "./contributionPlanAmount";
import { YIELD_STRATEGY_EXCESS_YIELD_MINIMUM_USD } from "./yieldStrategyCapitalPolicy";
import {
  YIELD_STRATEGY_PLAN_POLICY_VERSION,
  YIELD_STRATEGY_PLAN_SELECTION_POLICY_VERSION,
  type YieldStrategyPlanActionMode,
} from "./yieldStrategyPlanTypes";
import { YIELD_STRATEGY_COMPARISON_POLICY_VERSION } from "./yieldStrategyComparisonTypes";
import { YIELD_STRATEGY_CAPITAL_POLICY_VERSION } from "./yieldStrategyPositionTypes";
import { YIELD_STRATEGY_PRODUCT_CAPACITY_POLICY_VERSION } from "./yieldStrategyProductCapacity";
import type { YieldStrategyEligibilityLane } from "./yieldStrategyEligibilityTypes";

export const YIELD_STRATEGY_PLAN_POLICY_EXISTS = true;

/** Deterministic lane priority: Safety Buffer Yield before Excess USDC Yield. */
export const YIELD_STRATEGY_PLAN_LANE_PRIORITY: readonly YieldStrategyEligibilityLane[] = ["buffer", "excess"];

/** The canonical excess minimum ($250), reused — never re-declared. */
export const YIELD_STRATEGY_PLAN_EXCESS_MINIMUM_USD = YIELD_STRATEGY_EXCESS_YIELD_MINIMUM_USD;

/** No canonical Safety-Buffer-Yield deposit minimum is documented (the $50 is contribution-scoped). */
export const YIELD_STRATEGY_PLAN_BUFFER_MINIMUM_POLICY_AVAILABLE = false;

/**
 * The lane deposit minimum, or `undefined` when no policy applies (buffer, unless a future canonical
 * minimum is injected via `bufferMinimumOverrideUsd`). Excess is always the canonical $250.
 */
export function laneMinimumUsd(lane: YieldStrategyEligibilityLane, bufferMinimumOverrideUsd?: number): number | undefined {
  if (lane === "excess") return YIELD_STRATEGY_PLAN_EXCESS_MINIMUM_USD;
  if (typeof bufferMinimumOverrideUsd === "number" && Number.isFinite(bufferMinimumOverrideUsd) && bufferMinimumOverrideUsd >= 0) return bufferMinimumOverrideUsd;
  return undefined; // no canonical buffer minimum → the lane fails closed
}

/** Floor USD to exact cents using the canonical Step-15 helper. Never rounds up. */
export function floorToExactCents(usd: number): number {
  return usdToPlanCents(Math.max(0, usd)).cents / 100;
}
export function usdToCents(usd: number): number {
  return usdToPlanCents(Math.max(0, usd)).cents;
}

/** effectiveMaximumUsd = min of every explicit bound present (never invents a missing bound). */
export function effectiveMaximumUsd(bounds: Array<number | undefined>): number {
  const present = bounds.filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0);
  return present.length === 0 ? 0 : Math.min(...present);
}
/** effectiveMinimumUsd = max(laneMinimum, productMinimum) among present values. */
export function effectiveMinimumUsd(laneMinimum: number | undefined, productMinimum: number | undefined): number {
  const present = [laneMinimum, productMinimum].filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0);
  return present.length === 0 ? 0 : Math.max(...present);
}

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
/** FNV-1a hash (reused Step-15 plan-ID architecture). */
function fnv1a(str: string): string {
  let h = FNV_OFFSET;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, FNV_PRIME); }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export interface PlanIdInputs {
  ownerAddress: string;
  lane: YieldStrategyEligibilityLane;
  actionMode: YieldStrategyPlanActionMode;
  strategyId: string;
  productAddress: string;
  amountCents: number;
}

/**
 * Stable plan id from the CANONICAL decision identity — never `generatedAt`/`checkedAt`/`ageMs`/warnings/
 * diagnostics/UI copy. A material change (lane / action mode / strategy / product / amount cents / a
 * relevant policy version) changes the id; a mere re-evaluation clock does not.
 */
export function buildYieldStrategyPlanId(inputs: PlanIdInputs): string {
  return `ysplan_${fnv1a([
    YIELD_STRATEGY_PLAN_POLICY_VERSION,
    YIELD_STRATEGY_PLAN_SELECTION_POLICY_VERSION,
    YIELD_STRATEGY_COMPARISON_POLICY_VERSION,
    YIELD_STRATEGY_CAPITAL_POLICY_VERSION,
    YIELD_STRATEGY_PRODUCT_CAPACITY_POLICY_VERSION,
    inputs.ownerAddress,
    inputs.lane,
    inputs.actionMode,
    inputs.strategyId,
    inputs.productAddress,
    `c:${inputs.amountCents}`,
  ].join("|"))}`;
}

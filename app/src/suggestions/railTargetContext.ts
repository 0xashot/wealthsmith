/**
 * railTargetContext — Step 22F (slice 2). The PURE, deterministic per-refresh plumbing that turns the published
 * market-conditions cache result + the saved profile into the ONE shared canonical-target context the rail exposes.
 * It derives exactly one MarketConditionAssessment, one five-factor TargetAllocationAssessment, and one canonical
 * target-adapter result per call — reusing a single `generatedAt`. It fetches NOTHING (the component-layer hook
 * reads the same-origin static artifact) and recomputes no score/band/freshness/source governance.
 *
 * SLICE-2 ISOLATION: nothing here is consumed by Rebalance / DCA / On Track / the dashboard yet. There is NO
 * risk-only fallback — loading/unresolved/blocked/unavailable states yield a null canonical target, never a
 * legacy target.
 */
import type { SavedGoal } from "../types/goal";
import {
  deriveMarketConditionAssessmentFromCache,
} from "./marketConditionCacheLoader";
import {
  blockedMarketConditionAssessment,
  unresolvedMarketConditionAssessment,
  type MarketConditionAssessment,
} from "./marketConditionAssessment";
import { deriveTargetAllocationAssessment, type TargetAllocationAssessment } from "./targetAllocationAssessment";
import { buildCanonicalTargetAllocation, type CanonicalTargetAllocation } from "./canonicalTargetAllocation";

/** The ingestion state the component-layer cache hook reports for the same-origin artifact. */
export type MarketConditionsCacheState = "loading" | "loaded" | "missing" | "malformed" | "failed";

/** The rail-facing loading lens (adds `stale` as a substate of a loaded-but-expired artifact). */
export type RailTargetLoadingState = "loading" | "loaded" | "stale" | "missing" | "malformed" | "failed";

export interface RailTargetContext {
  marketConditionAssessment: MarketConditionAssessment;
  targetAllocationAssessment: TargetAllocationAssessment;
  /** null for unavailable/blocked/unresolved target confidence — never a risk-only fallback. */
  canonicalTargetAllocation: CanonicalTargetAllocation | null;
  targetLoadingState: RailTargetLoadingState;
  targetGeneratedAt: number;
}

/**
 * Map a cache ingestion state → one governed MarketConditionAssessment via the canonical loader. `loading`/`failed`
 * are transient → unresolved (never Neutral, never risk-only); `missing` → excluded_unavailable; `malformed` →
 * blocked; `loaded` → the loader classifies full/stale/blocked from `observedAt` (never `retrievedAt`).
 */
export function mapCacheStateToMarketAssessment(
  cacheState: MarketConditionsCacheState,
  cacheInput: unknown | null,
  generatedAt: number,
): MarketConditionAssessment {
  switch (cacheState) {
    case "loading":
      return unresolvedMarketConditionAssessment(generatedAt, ["market_cache_loading"]);
    case "failed":
      return unresolvedMarketConditionAssessment(generatedAt, ["market_cache_fetch_failed"]);
    case "missing":
      return deriveMarketConditionAssessmentFromCache(null, { generatedAt }).assessment;
    case "malformed":
      return blockedMarketConditionAssessment(generatedAt, ["market_cache_malformed"]);
    case "loaded":
    default:
      return deriveMarketConditionAssessmentFromCache(cacheInput, { generatedAt }).assessment;
  }
}

function railLoadingState(cacheState: MarketConditionsCacheState, market: MarketConditionAssessment): RailTargetLoadingState {
  if (cacheState !== "loaded") return cacheState;
  return market.overallReadiness === "excluded_market_stale" ? "stale" : "loaded";
}

/**
 * Build the one shared canonical-target context for a rail refresh. Reads the profile off the SavedGoal (never the
 * monthly contribution as Net Cash Flow, never wallet positions or the current allocation), derives the single
 * MarketConditionAssessment → single TargetAllocationAssessment → single canonical target, all on one `generatedAt`.
 */
export function buildRailTargetContext(args: {
  goal: SavedGoal | null | undefined;
  cacheInput: unknown | null;
  cacheState: MarketConditionsCacheState;
  generatedAt: number;
  /** Canonical portfolio denominator for target dollar amounts; null when not priced. */
  totalPricedUsd: number | null;
}): RailTargetContext {
  const market = mapCacheStateToMarketAssessment(args.cacheState, args.cacheInput, args.generatedAt);
  const target = deriveTargetAllocationAssessment({
    riskTolerance: args.goal?.risk_tolerance ?? null,
    timeline: args.goal?.timeline ?? null,
    financialGoal: args.goal?.financial_goal ?? null,
    monthlyIncomeUsd: args.goal?.income_monthly ?? null,
    monthlyExpensesUsd: args.goal?.expenses_monthly ?? null,
    marketConditionAssessment: market,
    generatedAt: args.generatedAt,
  });
  const canonicalTargetAllocation = buildCanonicalTargetAllocation(target, { totalPricedUsd: args.totalPricedUsd });
  return {
    marketConditionAssessment: market,
    targetAllocationAssessment: target,
    canonicalTargetAllocation,
    targetLoadingState: railLoadingState(args.cacheState, market),
    targetGeneratedAt: args.generatedAt,
  };
}

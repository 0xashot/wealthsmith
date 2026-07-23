/**
 * canonicalTargetTestingScenario — Step 22F (slice 7B). One DETERMINISTIC, reusable production scenario foundation for
 * market-aware `/testing` cases. It runs the FULL production chain (no duplicated factor weights, band thresholds,
 * freshness logic, or target math): a deterministic governed market observation → production MarketConditionAssessment
 * → production TargetAllocationAssessment → buildCanonicalTargetAllocation (all via `buildRailTargetContext`). Visible
 * cards are built from the production Rebalance mapper by the caller; this builder only exposes the shared production
 * assessments + canonical target. No wall-clock, no real cache, no provider request, no API key.
 */
import type { SavedGoal } from "../../types/goal";
import { buildRailTargetContext, type RailTargetContext, type MarketConditionsCacheState } from "../railTargetContext";
import { MARKET_CONDITION_CACHE_VERSION } from "../marketConditionCache";
import { classifyMarketConditionScore } from "../marketConditionTypes";

/** A deterministic testing market state. `fresh` uses a fixed score; `stale`/`missing` drive the degraded path. */
export type TestingMarketState =
  | { kind: "fresh"; score: number }
  | { kind: "stale"; score: number }
  | { kind: "missing" };

/** A fixed reference clock for every testing scenario (never Date.now — scenarios can't age with the wall clock). */
export const TESTING_SCENARIO_GENERATED_AT_MS = Date.parse("2026-05-01T12:00:00.000Z");
const iso = (ms: number) => new Date(ms).toISOString();

/** A complete deterministic profile; only risk varies across the required gallery cases unless a case needs otherwise. */
export function testingGoal(over: Partial<SavedGoal> = {}): SavedGoal {
  return {
    financial_goal: "build_long_term_wealth",
    risk_tolerance: "medium",
    timeline: "5_years",
    contribution_frequency: "monthly",
    income_monthly: 6000,
    expenses_monthly: 2000,
    monthly_saving_goal: 1000,
    ...over,
  } as SavedGoal;
}

/** Build the deterministic governed cache input for a market state (approved CoinMarketCap identity; band from score). */
function marketCache(state: TestingMarketState) {
  if (state.kind === "missing") return null;
  const observedAgoMs = state.kind === "stale" ? 200 * 3_600_000 : 3_600_000; // stale: 200h (> 36h window); fresh: 1h
  return {
    cacheVersion: MARKET_CONDITION_CACHE_VERSION,
    generatedAt: iso(TESTING_SCENARIO_GENERATED_AT_MS),
    sourceId: "coinmarketcap_crypto_fear_greed",
    indexId: "cmc_crypto_fear_greed",
    indexName: "CMC Crypto Fear & Greed Index",
    methodology: "cmc_crypto_fear_greed_composite",
    methodologyVersion: "cmc_fng_methodology_2026_1",
    score: state.score,
    band: classifyMarketConditionScore(state.score) ?? "neutral", // production classifier (never a duplicated threshold)
    observedAt: iso(TESTING_SCENARIO_GENERATED_AT_MS - observedAgoMs),
    retrievedAt: iso(TESTING_SCENARIO_GENERATED_AT_MS),
    validUntil: null,
    retrievalState: "cached" as const,
    evidence: ["deterministic testing market fixture (no live provider, no real cache)"],
  };
}

export interface CanonicalTargetTestingScenario {
  context: RailTargetContext;
}

/**
 * Run the production market → target → canonical chain for a deterministic profile + market state + priced total.
 * `market: { kind: "missing" }` passes cacheState "missing"; `stale` passes "loaded" with an out-of-window observation.
 */
export function buildCanonicalTargetTestingScenario(input: {
  goal: SavedGoal;
  totalPricedUsd: number | null;
  market: TestingMarketState;
}): CanonicalTargetTestingScenario {
  const cacheInput = marketCache(input.market);
  const cacheState: MarketConditionsCacheState = input.market.kind === "missing" ? "missing" : "loaded";
  const context = buildRailTargetContext({
    goal: input.goal,
    cacheInput,
    cacheState,
    generatedAt: TESTING_SCENARIO_GENERATED_AT_MS,
    totalPricedUsd: input.totalPricedUsd,
  });
  return { context };
}

/**
 * demoMarketConditions — Step 22F (slice 7). A DETERMINISTIC governed market observation for Demo mode. Demo NEVER
 * fetches the real generated cache, never calls CoinMarketCap, and never depends on wall-clock time. This fixture uses
 * the APPROVED CoinMarketCap source identity + a fixed score/band, and is fed through the SAME production
 * MarketConditionAssessment → TargetAllocationAssessment → CanonicalTargetAllocation chain the real wallet uses. The
 * band is DERIVED by the production assessment from the score (no UI/fixture threshold logic). Freshness is
 * deterministic: `observedAt` is fixed one hour before the scenario's fixed `generatedAt`, always inside the approved
 * 36-hour window, so Demo can never go stale with the passage of time.
 */
import { MARKET_CONDITION_CACHE_VERSION } from "./marketConditionCache";

/** Deterministic Demo Fear reading (score 39 → the production assessment classifies it as `fear`). */
export const DEMO_MARKET_SCORE = 39;
export const DEMO_MARKET_CACHE_STATE = "loaded" as const;
const iso = (ms: number) => new Date(ms).toISOString();

/**
 * Build the deterministic Demo market cache input for a scenario's fixed `generatedAt` (its `pricedAsOf`). `observedAt`
 * is one hour earlier → always fresh under the 36-hour policy, independent of the current date.
 */
export function buildDemoMarketCacheInput(generatedAtMs: number) {
  return {
    cacheVersion: MARKET_CONDITION_CACHE_VERSION,
    generatedAt: iso(generatedAtMs),
    sourceId: "coinmarketcap_crypto_fear_greed",
    indexId: "cmc_crypto_fear_greed",
    indexName: "CMC Crypto Fear & Greed Index",
    methodology: "cmc_crypto_fear_greed_composite",
    methodologyVersion: "cmc_fng_methodology_2026_1",
    score: DEMO_MARKET_SCORE,
    band: "fear", // the production assessment reclassifies from the score; this is only the transported field
    observedAt: iso(generatedAtMs - 3_600_000),
    retrievedAt: iso(generatedAtMs),
    validUntil: null,
    retrievalState: "cached",
    evidence: ["deterministic demo market fixture (no live provider, no real cache)"],
  };
}

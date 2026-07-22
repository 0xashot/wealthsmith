/**
 * marketConditionCacheLoader — Step 22E. NON-MOUNTED production cache-loading boundary. Given the PARSED published
 * cache artifact (the caller reads the static file — this module never fetches a provider or the network), it
 * validates the cache, builds the cached MarketConditionObservation, and derives the governed MarketConditionAssessment.
 *
 * Contract: no artifact → excluded/unavailable market; malformed artifact → blocked; a structurally-valid but stale
 * artifact keeps its stale classification (the assessment marks it excluded, NOT blocked). Imported by NOTHING in the
 * mounted engine/rail/React — it is the future integration boundary for Step 22F.
 */
import {
  deriveMarketConditionAssessment,
  blockedMarketConditionAssessment,
  type MarketConditionAssessment,
} from "./marketConditionAssessment";
import { validateMarketConditionCache } from "./marketConditionCache";
import {
  MARKET_CONDITION_SOURCES,
  MARKET_CONDITION_FRESHNESS_POLICIES,
  type MarketConditionSource,
  type MarketConditionFreshnessPolicy,
} from "./marketConditionPolicy";

export interface MarketConditionCacheLoadResult {
  status: "loaded" | "missing" | "malformed";
  cacheErrors: string[];
  assessment: MarketConditionAssessment;
}

export interface MarketConditionCacheLoadOptions {
  knownSources?: readonly MarketConditionSource[];
  sourcePolicies?: readonly MarketConditionSource[];
  freshnessPolicies?: readonly MarketConditionFreshnessPolicy[];
  generatedAt: number;
}

/**
 * Load a published market-conditions cache into a governed assessment. `cacheInput` is the already-parsed JSON object
 * (or null when no artifact exists). Never passes `now` to the cache validator, so a stale-but-structurally-valid
 * artifact is NOT hard-rejected — freshness is judged by the assessment via `observedAt`.
 */
export function deriveMarketConditionAssessmentFromCache(
  cacheInput: unknown | null,
  opts: MarketConditionCacheLoadOptions,
): MarketConditionCacheLoadResult {
  const knownSources = opts.knownSources ?? MARKET_CONDITION_SOURCES;
  const sourcePolicies = opts.sourcePolicies ?? MARKET_CONDITION_SOURCES;
  const freshnessPolicies = opts.freshnessPolicies ?? MARKET_CONDITION_FRESHNESS_POLICIES;
  const { generatedAt } = opts;

  if (cacheInput == null) {
    return {
      status: "missing",
      cacheErrors: [],
      assessment: deriveMarketConditionAssessment({ observation: null, sourcePolicies, freshnessPolicies, generatedAt }),
    };
  }

  const validation = validateMarketConditionCache(cacheInput, { knownSources });
  if (!validation.valid || !validation.observation) {
    return { status: "malformed", cacheErrors: validation.errors, assessment: blockedMarketConditionAssessment(generatedAt, validation.errors) };
  }

  // The observation is served from the published static artifact.
  const observation = { ...validation.observation, retrievalState: "cached" as const };
  return {
    status: "loaded",
    cacheErrors: [],
    assessment: deriveMarketConditionAssessment({ observation, sourcePolicies, freshnessPolicies, generatedAt }),
  };
}

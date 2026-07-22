/**
 * marketConditionTypes — Step 22C. Pure, NON-MOUNTED type + band contracts for the governed Market Conditions
 * (Fear & Greed) input to the future TargetAllocationAssessment. This module (and the whole marketCondition* set)
 * is imported by NOTHING in the mounted engine — the mounted target stays risk-only (`wallet/recommendedAllocation`).
 *
 * The market band → stable-target matrix is REUSED from the approved policy (`targetAllocationPolicy.ts`,
 * `MARKET_STABLE_TARGET_BANDS`); it is never duplicated here. `classifyMarketConditionScore` derives the band
 * from the same approved band boundaries (inclusive, no rounding). No provider is contacted; no score is invented.
 */
import { MARKET_STABLE_TARGET_BANDS } from "./targetAllocationPolicy";

/** Internal canonical band identifiers (the same ids the approved market matrix uses). */
export type MarketConditionBand = "extreme_fear" | "fear" | "neutral" | "greed" | "extreme_greed";

/** How the observation was obtained (data-ingestion boundary). */
export type MarketRetrievalState =
  | "retrieved_current_refresh"
  | "cached"
  | "fetch_failed"
  | "unavailable"
  | "malformed"
  | "unresolved";

/** Whether the observation is fresh under the exact source-specific policy (never a global default). */
export type MarketSourceFreshnessState = "fresh" | "stale" | "unresolved" | "not_applicable";

/** Whether the source/methodology is governed and approved. */
export type MarketSourcePolicyState = "approved" | "missing" | "unsupported" | "stale" | "invalid" | "unresolved";

/** The evidence signal a freshness policy relies on (retrievedAt alone is deliberately NOT a valid signal). */
export type MarketFreshnessSignal =
  | "source_observed_at"
  | "source_valid_until"
  | "source_publication_period"
  | "endpoint_guarantee"
  | "published_cache_state"
  | "unavailable";

/** Overall readiness of the governed market component (never Neutral-substituted). */
export type MarketAssessmentReadiness =
  | "full"
  | "excluded_market_unavailable"
  | "excluded_market_stale"
  | "excluded_market_unapproved"
  | "excluded_market_failed"
  | "blocked_invalid_score"
  | "blocked_methodology_mismatch"
  | "unresolved";

/** How the future TargetAllocationAssessment should treat the market component. */
export type MarketComponentAvailability = "available_full" | "excluded_degraded" | "blocked" | "unresolved";

/** Gate status convention shared across the assessment gates. */
export type MarketGateStatus = "allowed" | "blocked" | "unresolved" | "not_applicable";

/**
 * The governed observation the deterministic engine consumes. It carries provenance + governance evidence ONLY —
 * never raw provider payloads or secrets (`rawPayloadVersion` is a version tag, not the payload).
 */
export interface MarketConditionObservation {
  sourceId: string;
  indexId: string;
  indexName: string;
  methodology: string;
  methodologyVersion: string;
  /** Provider raw score (0–100 for the crypto F&G index). */
  rawScore: number;
  /** Canonical score used for classification (equal to rawScore for a native 0–100 index). */
  normalizedScore: number;
  /** Provider-labeled band (compared against the recomputed canonical band; never trusted blindly). */
  band: MarketConditionBand;
  /** ISO — the source's own "as of" timestamp. */
  observedAt: string;
  /** ISO — when the value was retrieved. */
  retrievedAt: string;
  /** ISO — optional source-supplied validity horizon. */
  validUntil?: string | null;
  retrievalState: MarketRetrievalState;
  sourceFreshnessState: MarketSourceFreshnessState;
  sourcePolicyState: MarketSourcePolicyState;
  /** Safe governance evidence strings only (no payloads/keys). */
  evidence: string[];
  /** Version tag for the provider payload shape — NOT the payload itself. */
  rawPayloadVersion?: string;
  cacheVersion?: string;
}

/** Safe display labels, mapped separately from the internal band ids. */
export const MARKET_BAND_DISPLAY_LABEL: Record<MarketConditionBand, string> = {
  extreme_fear: "Extreme Fear",
  fear: "Fear",
  neutral: "Neutral",
  greed: "Greed",
  extreme_greed: "Extreme Greed",
};

/**
 * Classify a 0–100 score into its canonical band using the APPROVED matrix boundaries (inclusive, no rounding).
 * Returns null for out-of-range / non-finite / NaN scores. Fractional scores are classified without rounding.
 */
export function classifyMarketConditionScore(score: number): MarketConditionBand | null {
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100) return null;
  // The approved bands use INTEGER-inclusive boundaries ([0,24], [25,49], …). To classify FRACTIONAL scores
  // without rounding and without gaps, treat each band's upper bound as exclusive at (maxInclusive + 1): e.g.
  // extreme_fear covers [0, 25) so 24.9 → extreme_fear, while the integer boundaries (24, 25, …) are unchanged.
  const band = MARKET_STABLE_TARGET_BANDS.find((b) => score >= b.minInclusive && score < b.maxInclusive + 1);
  return (band?.id as MarketConditionBand | undefined) ?? null;
}

/** Approved stable-target % for a band, from the approved policy matrix (never invented here). */
export function marketStableTargetPctForBand(band: MarketConditionBand): number | null {
  return MARKET_STABLE_TARGET_BANDS.find((b) => b.id === band)?.stableTargetPct ?? null;
}

/** Volatile target = 100 − stable target (null when the band is unknown). */
export function marketVolatileTargetPctForBand(band: MarketConditionBand): number | null {
  const stable = marketStableTargetPctForBand(band);
  return stable == null ? null : 100 - stable;
}

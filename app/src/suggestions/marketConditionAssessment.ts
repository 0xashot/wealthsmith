/**
 * marketConditionAssessment — Step 22C. The pure, deterministic, NON-MOUNTED assessment that turns a governed
 * `MarketConditionObservation` into a single market component for the FUTURE TargetAllocationAssessment. It does
 * NOT compute the five-factor target and produces NO suggestion. It requires exact source + index + methodology
 * approval and source-specific freshness; missing/stale/failed/unapproved data is EXCLUDED (never Neutral).
 *
 * Nothing in the mounted engine imports this module — the mounted target stays risk-only. The stable/volatile
 * percentages come only from the approved policy matrix (via `marketConditionTypes`), never invented here.
 */
import {
  classifyMarketConditionScore,
  marketStableTargetPctForBand,
  marketVolatileTargetPctForBand,
  MARKET_BAND_DISPLAY_LABEL,
  type MarketConditionObservation,
  type MarketConditionBand,
  type MarketAssessmentReadiness,
  type MarketComponentAvailability,
  type MarketSourceFreshnessState,
  type MarketSourcePolicyState,
  type MarketGateStatus,
} from "./marketConditionTypes";
import {
  evaluateMarketConditionSourceGovernance,
  resolveMarketConditionFreshnessPolicy,
  type MarketConditionSource,
  type MarketConditionFreshnessPolicy,
} from "./marketConditionPolicy";

export const MARKET_CONDITION_ASSESSMENT_VERSION = "market_condition_assessment_1.0.0";

export interface MarketConditionAssessmentInput {
  observation: MarketConditionObservation | null;
  sourcePolicies: readonly MarketConditionSource[];
  freshnessPolicies: readonly MarketConditionFreshnessPolicy[];
  /** ms epoch — the reference "now" for freshness (never uses wall-clock inside the pure function). */
  generatedAt: number;
  methodologyVersion?: string;
}

export interface MarketConditionAssessment {
  observation: MarketConditionObservation | null;
  sourceId: string | null;
  indexId: string | null;
  score: number | null;
  normalizedScore: number | null;
  band: MarketConditionBand | null;
  displayBand: string | null;
  /** Only populated when readiness === "full"; excluded/blocked/unresolved expose no percentage. */
  marketStableTargetPct: number | null;
  marketVolatileTargetPct: number | null;
  retrievalState: MarketConditionObservation["retrievalState"] | null;
  sourcePolicyState: MarketSourcePolicyState;
  freshnessState: MarketSourceFreshnessState;
  observationAgeMs: number | null;
  sourceGate: MarketGateStatus;
  scoreGate: MarketGateStatus;
  bandGate: MarketGateStatus;
  freshnessGate: MarketGateStatus;
  calculationGate: MarketGateStatus;
  overallReadiness: MarketAssessmentReadiness;
  componentAvailability: MarketComponentAvailability;
  warnings: string[];
  blockingReasons: string[];
  observedAt: string | null;
  retrievedAt: string | null;
  validUntil: string | null;
  generatedAt: number;
  methodologyVersion: string;
}

/** Evaluate freshness ONLY from the approved source-specific signal. retrievedAt alone never establishes freshness. */
function evaluateFreshness(
  observation: MarketConditionObservation,
  policy: MarketConditionFreshnessPolicy,
  generatedAt: number,
): { state: MarketSourceFreshnessState; ageMs: number | null } {
  switch (policy.freshnessSignal) {
    case "source_observed_at": {
      const observed = Date.parse(observation.observedAt);
      if (Number.isNaN(observed) || policy.maximumObservationAgeMs == null) return { state: "unresolved", ageMs: null };
      const ageMs = generatedAt - observed;
      if (ageMs < 0) return { state: "unresolved", ageMs: null }; // observed in the future ⇒ can't classify safely
      const max = policy.maximumObservationAgeMs + (policy.gracePeriodMs ?? 0);
      return { state: ageMs <= max ? "fresh" : "stale", ageMs };
    }
    case "source_valid_until": {
      if (!observation.validUntil) return { state: "unresolved", ageMs: null };
      const validUntil = Date.parse(observation.validUntil);
      if (Number.isNaN(validUntil)) return { state: "unresolved", ageMs: null };
      return { state: generatedAt <= validUntil ? "fresh" : "stale", ageMs: null };
    }
    // retrievedAt-only, current-refresh-only, endpoint guarantees, and unspecified signals never prove freshness.
    default:
      return { state: "unresolved", ageMs: null };
  }
}

function shell(input: MarketConditionAssessmentInput, over: Partial<MarketConditionAssessment>): MarketConditionAssessment {
  const o = input.observation;
  return {
    observation: o,
    sourceId: o?.sourceId ?? null,
    indexId: o?.indexId ?? null,
    score: o?.rawScore ?? null,
    normalizedScore: o?.normalizedScore ?? null,
    band: null,
    displayBand: null,
    marketStableTargetPct: null,
    marketVolatileTargetPct: null,
    retrievalState: o?.retrievalState ?? null,
    sourcePolicyState: "unresolved",
    freshnessState: "unresolved",
    observationAgeMs: null,
    sourceGate: "unresolved",
    scoreGate: "unresolved",
    bandGate: "unresolved",
    freshnessGate: "unresolved",
    calculationGate: "unresolved",
    overallReadiness: "unresolved",
    componentAvailability: "unresolved",
    warnings: [],
    blockingReasons: [],
    observedAt: o?.observedAt ?? null,
    retrievedAt: o?.retrievedAt ?? null,
    validUntil: o?.validUntil ?? null,
    generatedAt: input.generatedAt,
    methodologyVersion: input.methodologyVersion ?? MARKET_CONDITION_ASSESSMENT_VERSION,
    ...over,
  };
}

/**
 * Derive the governed market component. Pure + deterministic. Never invents a Neutral score; excluded states carry
 * an exclusion reason and expose no percentage. Precedence: unavailable → invalid score → methodology mismatch →
 * unapproved source → freshness (unresolved/stale/failed) → full.
 */
export function deriveMarketConditionAssessment(input: MarketConditionAssessmentInput): MarketConditionAssessment {
  const { observation, sourcePolicies, freshnessPolicies, generatedAt } = input;

  // 1) No observation ⇒ market unavailable (future target degrades; never Neutral).
  if (!observation) {
    return shell(input, {
      overallReadiness: "excluded_market_unavailable",
      componentAvailability: "excluded_degraded",
      retrievalState: "unavailable",
      sourceGate: "not_applicable",
      scoreGate: "not_applicable",
      bandGate: "not_applicable",
      freshnessGate: "not_applicable",
      calculationGate: "not_applicable",
      warnings: ["market_observation_unavailable"],
    });
  }

  // 2) Score validity (before anything else that assumes a usable score).
  const band = classifyMarketConditionScore(observation.normalizedScore);
  if (band == null) {
    return shell(input, {
      overallReadiness: "blocked_invalid_score",
      componentAvailability: "blocked",
      scoreGate: "blocked",
      bandGate: "blocked",
      sourceGate: "unresolved",
      freshnessGate: "unresolved",
      calculationGate: "blocked",
      blockingReasons: ["market_score_invalid"],
    });
  }
  const displayBand = MARKET_BAND_DISPLAY_LABEL[band];
  const providerBandMismatch = observation.band !== band;

  // 3) Source governance: methodology mismatch (blocked) vs unapproved/unknown (excluded).
  const gov = evaluateMarketConditionSourceGovernance(observation, sourcePolicies);
  if (gov.methodologyMismatch) {
    return shell(input, {
      band, displayBand,
      overallReadiness: "blocked_methodology_mismatch",
      componentAvailability: "blocked",
      sourcePolicyState: "invalid",
      scoreGate: "allowed",
      bandGate: "allowed",
      sourceGate: "blocked",
      freshnessGate: "unresolved",
      calculationGate: "blocked",
      blockingReasons: ["market_source_methodology_mismatch"],
      ...(providerBandMismatch ? { warnings: ["provider_band_mismatch"] } : {}),
    });
  }
  if (gov.policyState !== "approved") {
    return shell(input, {
      band, displayBand,
      overallReadiness: "excluded_market_unapproved",
      componentAvailability: "excluded_degraded",
      sourcePolicyState: gov.policyState,
      scoreGate: "allowed",
      bandGate: "allowed",
      sourceGate: "blocked",
      freshnessGate: "unresolved",
      calculationGate: "not_applicable",
      warnings: ["market_source_unapproved"],
    });
  }

  // 4) Source-specific freshness (approved source required to get here).
  const freshnessPolicy = resolveMarketConditionFreshnessPolicy(freshnessPolicies, observation.sourceId, observation.indexId);
  if (!freshnessPolicy || freshnessPolicy.policyState !== "approved") {
    return shell(input, {
      band, displayBand,
      overallReadiness: "unresolved",
      componentAvailability: "unresolved",
      sourcePolicyState: "approved",
      freshnessState: "unresolved",
      scoreGate: "allowed",
      bandGate: "allowed",
      sourceGate: "allowed",
      freshnessGate: "unresolved",
      calculationGate: "unresolved",
      warnings: ["market_freshness_policy_missing"],
    });
  }
  const { state: freshnessState, ageMs } = evaluateFreshness(observation, freshnessPolicy, generatedAt);

  if (freshnessState === "unresolved") {
    return shell(input, {
      band, displayBand,
      overallReadiness: "unresolved",
      componentAvailability: "unresolved",
      sourcePolicyState: "approved",
      freshnessState: "unresolved",
      observationAgeMs: ageMs,
      scoreGate: "allowed", bandGate: "allowed", sourceGate: "allowed",
      freshnessGate: "unresolved",
      calculationGate: "unresolved",
      warnings: ["market_freshness_unresolved"],
    });
  }

  if (freshnessState === "stale") {
    // A failed refresh with no fresh observation is "failed"; an otherwise-stale observation is "stale".
    const failed = observation.retrievalState === "fetch_failed";
    return shell(input, {
      band, displayBand,
      overallReadiness: failed ? "excluded_market_failed" : "excluded_market_stale",
      componentAvailability: "excluded_degraded",
      sourcePolicyState: "approved",
      freshnessState: "stale",
      observationAgeMs: ageMs,
      scoreGate: "allowed", bandGate: "allowed", sourceGate: "allowed",
      freshnessGate: "blocked",
      calculationGate: "not_applicable",
      warnings: [failed ? "market_refresh_failed_stale_cache" : "market_observation_stale"],
    });
  }

  // 5) Fresh + approved + valid ⇒ full. A stale-proof fetch failure served from a still-fresh cache is usable + warned.
  const warnings: string[] = [];
  if (observation.retrievalState === "fetch_failed") warnings.push("served_from_fresh_cache_after_fetch_failure");
  if (providerBandMismatch) warnings.push("provider_band_mismatch");
  return shell(input, {
    band, displayBand,
    marketStableTargetPct: marketStableTargetPctForBand(band),
    marketVolatileTargetPct: marketVolatileTargetPctForBand(band),
    overallReadiness: "full",
    componentAvailability: "available_full",
    sourcePolicyState: "approved",
    freshnessState: "fresh",
    observationAgeMs: ageMs,
    sourceGate: "allowed", scoreGate: "allowed", bandGate: "allowed",
    freshnessGate: "allowed",
    calculationGate: "allowed",
    warnings,
  });
}

/** A blocked assessment for a structurally-invalid input (e.g. a malformed published cache). No observation, no score. */
export function blockedMarketConditionAssessment(generatedAt: number, blockingReasons: string[], methodologyVersion?: string): MarketConditionAssessment {
  return shell({ observation: null, sourcePolicies: [], freshnessPolicies: [], generatedAt, methodologyVersion }, {
    overallReadiness: "blocked_invalid_score",
    componentAvailability: "blocked",
    sourceGate: "unresolved", scoreGate: "blocked", bandGate: "blocked", freshnessGate: "unresolved", calculationGate: "blocked",
    blockingReasons,
  });
}

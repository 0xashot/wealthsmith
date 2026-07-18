/**
 * directUsdcLendingSelector — Step 16H-S.1. The deterministic sole-candidate selector and suggestion
 * trigger for the direct-USDC-lending category.
 *
 * DETERMINISM + FAIL-CLOSED. Only Kamino Direct can ever be returned. Steakhouse and Jupiter are
 * never selected and are never a fallback when Kamino is blocked. No APY ranking, TVL ranking, or
 * brand preference can override a disposition. Every uncertainty resolves to "no candidate", never to
 * a weaker candidate. Missing governance returns no production candidate. A single eligible candidate
 * never auto-creates a Top Pick.
 *
 * NO EXECUTION. The selector and trigger are pure predicates over supplied state. They construct no
 * transaction, request no signature, and read no wallet directly.
 */
import {
  CANDIDATE_DISPOSITIONS,
  EXCLUDED_CANDIDATE_IDS,
  KAMINO_GOVERNANCE_RESOLUTION,
  getDisposition,
} from "./directUsdcLendingDispositions";

export const DIRECT_USDC_LENDING_SELECTOR_VERSION = "1.0.0" as const;
export const SELECTABLE_CANDIDATE_ID = "kamino_usdc_lending" as const;

/* ------------------------------------------------------------------ *
 * Selector result states
 * ------------------------------------------------------------------ */

export type SelectorResultState =
  | "eligible_candidate_selected"
  | "blocked_governance"
  | "blocked_freshness"
  | "blocked_availability"
  | "blocked_capacity"
  | "blocked_invalidation"
  | "no_approved_candidate";

export interface SelectorProductState {
  /** Identity of the exact Kamino reserve still resolves. */
  identityValid: boolean;
  /** Automated assessment still valid (not invalidated). */
  assessmentValid: boolean;
  /** Category-floor evaluation passes. */
  categoryFloorPassed: boolean;
  /** Assessment materially invalidated (upgrade, socialize_loss, oracle change, etc.). */
  assessmentInvalidated: boolean;
  /** Governance: all three gates complete (human review + signoff + approval). */
  governanceComplete: boolean;
  /** Deposits currently mechanically available. */
  depositsAvailable: boolean;
  /** Emergency mode active on the reserve. */
  emergencyModeActive: boolean;
  /** Capacity is fresh and sufficient. */
  capacityFreshAndSufficient: boolean;
  /** APY is fresh and comparison-ready. */
  apyFreshAndComparisonReady: boolean;
  /** Current risk-policy version is active. */
  riskPolicyVersionActive: boolean;
}

export interface SelectorResult {
  state: SelectorResultState;
  selectedCandidateId: string | null;
  consideredCandidateIds: string[];
  excludedCandidateIds: string[];
  fallbackUsed: false;
  reason: string;
}

/**
 * Deterministic selection. Order of checks is fail-closed: disposition eligibility first, then
 * governance, then invalidation, then freshness/availability/capacity. Any failure yields NO
 * candidate — never Steakhouse, never Jupiter.
 */
export function selectDirectUsdcLendingCandidate(product: SelectorProductState): SelectorResult {
  const base = {
    consideredCandidateIds: [SELECTABLE_CANDIDATE_ID],
    excludedCandidateIds: [...EXCLUDED_CANDIDATE_IDS],
    fallbackUsed: false as const,
  };
  const none = (state: SelectorResultState, reason: string): SelectorResult => ({ state, selectedCandidateId: null, ...base, reason });

  // Only Kamino is ever a candidate; disposition must be the selected category candidate.
  const kamino = getDisposition(SELECTABLE_CANDIDATE_ID);
  if (!kamino || kamino.disposition !== "selected_category_candidate" || kamino.selectorEligibility !== true)
    return none("no_approved_candidate", "no candidate holds the selected_category_candidate disposition");

  // Identity / assessment validity / category floor are prerequisites.
  if (!product.identityValid || !product.assessmentValid || !product.categoryFloorPassed)
    return none("no_approved_candidate", "Kamino identity, assessment validity, or category-floor passage is not satisfied");

  // Material invalidation forces no candidate (checked before freshness so it is never masked).
  if (product.assessmentInvalidated || !product.riskPolicyVersionActive)
    return none("blocked_invalidation", "assessment materially invalidated or risk-policy version inactive — reopen review");

  // Governance is the hard gate for a PRODUCTION candidate.
  if (!product.governanceComplete)
    return none("blocked_governance", `governance incomplete — first missing gate: ${KAMINO_GOVERNANCE_RESOLUTION.firstMissingGate ?? "unknown"}`);

  // Availability / emergency mode / deposits.
  if (product.emergencyModeActive || !product.depositsAvailable)
    return none("blocked_availability", "emergency mode active or deposits mechanically unavailable");

  // Capacity.
  if (!product.capacityFreshAndSufficient)
    return none("blocked_capacity", "capacity is stale or insufficient");

  // Freshness of APY (comparison-ready).
  if (!product.apyFreshAndComparisonReady)
    return none("blocked_freshness", "APY is stale or not comparison-ready");

  return { state: "eligible_candidate_selected", selectedCandidateId: SELECTABLE_CANDIDATE_ID, ...base, reason: "all direct-lending gates satisfied" };
}

/* ------------------------------------------------------------------ *
 * Suggestion trigger — user conditions AND product conditions, all required
 * ------------------------------------------------------------------ */

export interface SuggestionTriggerUserState {
  holdsCanonicalUsdc: boolean;
  safetyBufferFullySatisfiedByVerifiedLiquidCoverage: boolean;
  relevantUsdcIsExcessCapital: boolean;
  deterministicEligibleAmountIsPositive: boolean;
  userSuitableForCategory: boolean;
  noSuitabilityRuleProhibitsDefiLending: boolean;
}

export type SuggestionTriggerResult =
  | { generate: true; candidateId: string; reason: string }
  | { generate: false; candidateId: null; blockingReason: string; blockedBy: "product" | "user" };

/**
 * The suggestion is generated ONLY when the selector returns an eligible candidate AND every user
 * condition holds. Product gate is checked first (a below-gate product never reaches user logic).
 */
export function evaluateSuggestionTrigger(product: SelectorProductState, user: SuggestionTriggerUserState): SuggestionTriggerResult {
  const selection = selectDirectUsdcLendingCandidate(product);
  if (selection.state !== "eligible_candidate_selected")
    return { generate: false, candidateId: null, blockingReason: selection.reason, blockedBy: "product" };

  if (!user.holdsCanonicalUsdc)
    return { generate: false, candidateId: null, blockingReason: "user does not hold canonical USDC", blockedBy: "user" };
  if (!user.safetyBufferFullySatisfiedByVerifiedLiquidCoverage)
    return { generate: false, candidateId: null, blockingReason: "Safety Buffer not fully satisfied by verified liquid coverage", blockedBy: "user" };
  if (!user.relevantUsdcIsExcessCapital)
    return { generate: false, candidateId: null, blockingReason: "relevant USDC is not classified as excess capital", blockedBy: "user" };
  if (!user.deterministicEligibleAmountIsPositive)
    return { generate: false, candidateId: null, blockingReason: "deterministic eligible amount is not positive", blockedBy: "user" };
  if (!user.userSuitableForCategory || !user.noSuitabilityRuleProhibitsDefiLending)
    return { generate: false, candidateId: null, blockingReason: "user is not suitable for the direct-USDC-lending category", blockedBy: "user" };

  return { generate: true, candidateId: SELECTABLE_CANDIDATE_ID, reason: "all product and user conditions satisfied" };
}

/* ------------------------------------------------------------------ *
 * Validation — the selector cannot be tricked into an excluded candidate
 * ------------------------------------------------------------------ */

export function validateSelector(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const fresh: SelectorProductState = {
    identityValid: true, assessmentValid: true, categoryFloorPassed: true, assessmentInvalidated: false,
    governanceComplete: true, depositsAvailable: true, emergencyModeActive: false,
    capacityFreshAndSufficient: true, apyFreshAndComparisonReady: true, riskPolicyVersionActive: true,
  };

  // With governance complete and everything fresh, Kamino selects.
  const ok = selectDirectUsdcLendingCandidate(fresh);
  if (ok.state !== "eligible_candidate_selected" || ok.selectedCandidateId !== "kamino_usdc_lending")
    errors.push("Kamino should select when all gates pass");

  // With governance incomplete (the real state), it must block and select nothing.
  const gov = selectDirectUsdcLendingCandidate({ ...fresh, governanceComplete: false });
  if (gov.state !== "blocked_governance" || gov.selectedCandidateId !== null) errors.push("incomplete governance must block");

  // No product state can ever return an excluded candidate or use a fallback.
  const states: Partial<SelectorProductState>[] = [
    { governanceComplete: false }, { depositsAvailable: false }, { emergencyModeActive: true },
    { capacityFreshAndSufficient: false }, { apyFreshAndComparisonReady: false }, { assessmentInvalidated: true },
    { identityValid: false }, { assessmentValid: false }, { categoryFloorPassed: false }, { riskPolicyVersionActive: false },
  ];
  for (const s of states) {
    const r = selectDirectUsdcLendingCandidate({ ...fresh, ...s });
    if (r.selectedCandidateId !== null && r.selectedCandidateId !== "kamino_usdc_lending") errors.push(`selector returned a non-Kamino candidate for ${JSON.stringify(s)}`);
    if (r.fallbackUsed !== false) errors.push("selector used a fallback");
    if (EXCLUDED_CANDIDATE_IDS.includes(r.selectedCandidateId ?? "")) errors.push("selector returned an excluded candidate");
  }

  // Excluded candidates are never in the considered set.
  const considered = ok.consideredCandidateIds;
  if (considered.some((c) => EXCLUDED_CANDIDATE_IDS.includes(c))) errors.push("excluded candidate appeared in considered set");
  if (CANDIDATE_DISPOSITIONS.filter((d) => d.selectorEligibility).length !== 1) errors.push("more than one selector-eligible disposition");

  return { valid: errors.length === 0, errors };
}

export const SELECTOR_VALIDATION = validateSelector();

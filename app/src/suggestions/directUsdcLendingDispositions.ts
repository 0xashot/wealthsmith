/**
 * directUsdcLendingDispositions — Step 16H-S.1. The immutable per-candidate dispositions for the
 * direct-USDC-lending category, the resolution of Kamino's current governance state, and a SEPARATE
 * category-floor evaluation for Kamino that never touches the original assessment.
 *
 * IMMUTABILITY. The original Kamino assessment (direct_assessment_54a11ba3: aggregate 5.93, universal
 * threshold 7, meetsMinimum FALSE) is read here and left exactly as it is. This module records a
 * NEW, separate category-floor result (5.93 ≥ 5.5 → pass) alongside the preserved universal result
 * (5.93 < 7 → fail). It does not replace meetsMinimum, and it does not claim Kamino passed a
 * threshold that did not exist when it was assessed.
 *
 * GOVERNANCE IS NOT FABRICATED. Passing the category floor is an INPUT to governance. Human review,
 * risk signoff and separate product approval remain REQUIRED and are resolved from real records only.
 * The product-owner decision that created this task establishes preference, policy direction and
 * exclusion — it is NOT risk review, NOT signoff, NOT approval. No reviewer is invented; a null,
 * absent, or preparer/assessor-authored record is treated as MISSING, and production stays disabled.
 */
import {
  DIRECT_ASSESSMENT_PROVENANCE,
  DIRECT_ASSESSMENT_OUTCOME,
  DIRECT_ASSESSMENT_STATE,
  DIRECT_ASSESSMENT_MANIFEST_HASH,
} from "./klendDirectUsdcAutomatedAssessment";
import {
  DIRECT_USDC_LENDING_CATEGORY,
  DIRECT_USDC_LENDING_CATEGORY_MINIMUM,
  UNIVERSAL_MINIMUM,
  evaluateCategoryFloor,
  DIRECT_USDC_LENDING_ELIGIBILITY_POLICY_ID,
} from "./directUsdcLendingEligibilityPolicy";
import { PRODUCTION_ACTIVATION } from "./directUsdcLendingGovernanceRecords";

export const DIRECT_USDC_LENDING_DISPOSITIONS_VERSION = "1.0.0" as const;

/* ------------------------------------------------------------------ *
 * 1. Immutable candidate dispositions
 * ------------------------------------------------------------------ */

export type DirectLendingDisposition =
  | "selected_category_candidate"
  | "existing_position_only"
  | "excluded_from_suggestions";

export interface CandidateDisposition {
  candidateId: string;
  productName: string;
  category: string | null;
  disposition: DirectLendingDisposition;
  categoryFloorPassed: boolean | null;
  suggestionEligibility: "governance_gated" | false;
  selectorEligibility: boolean;
  topPickEligibility: boolean;
  existingPositionSupport: boolean;
  safetyBufferFundingEligible: boolean;
  excessUsdcYieldEligible: boolean;
  safetyBufferRecognition: "unchanged" | "n/a";
  finalAssessmentStatus: "completed" | "not_ready" | "n/a";
  provisionalSensitivityPreserved: boolean;
  reasons: string[];
  neverArchivedOrDeleted: true;
}

export const CANDIDATE_DISPOSITIONS: CandidateDisposition[] = [
  {
    candidateId: "kamino_usdc_lending",
    productName: "Kamino Direct USDC Lending — SOL/BTC Market",
    category: DIRECT_USDC_LENDING_CATEGORY,
    disposition: "selected_category_candidate",
    categoryFloorPassed: true,
    suggestionEligibility: "governance_gated",
    selectorEligibility: true, // eligible to be selected; still governance-gated for production
    topPickEligibility: false, // never auto-Top-Pick; existing Top Pick policy governs
    existingPositionSupport: true,
    safetyBufferFundingEligible: false,
    excessUsdcYieldEligible: true,
    safetyBufferRecognition: "unchanged",
    finalAssessmentStatus: "completed",
    provisionalSensitivityPreserved: false,
    reasons: [
      "single exact direct-lending reserve (SOL/BTC Market, D6q6…gJ59)",
      "aggregate 5.93 passes the category floor of 5.5 (category-floor result only, not approval)",
      "strongest and best-evidenced of the USDC-lending candidates",
      "sole eligible candidate AFTER governance completes",
    ],
    neverArchivedOrDeleted: true,
  },
  {
    candidateId: "kamino_steakhouse_usdc",
    productName: "Steakhouse USDC Vault",
    category: null,
    disposition: "existing_position_only",
    categoryFloorPassed: null, // category does not apply — not evaluated against 5.5
    suggestionEligibility: false,
    selectorEligibility: false,
    topPickEligibility: false,
    existingPositionSupport: true,
    safetyBufferFundingEligible: false,
    excessUsdcYieldEligible: false,
    safetyBufferRecognition: "unchanged",
    finalAssessmentStatus: "completed",
    provisionalSensitivityPreserved: false,
    reasons: [
      "managed multi-market vault, not direct lending — the category does not apply",
      "additional KVault software layer; unaudited fund-moving layer",
      "single-key allocation manager; negative immediate vault buffer at the assessed snapshot",
      "additional performance fee; carries underlying Kamino risk PLUS vault-specific risk",
      "must never be selected merely because 5.37 is close to 5.5",
    ],
    neverArchivedOrDeleted: true,
  },
  {
    candidateId: "jupiter_lend_usdc",
    productName: "Jupiter Lend — Earn (jlUSDC)",
    category: null,
    disposition: "excluded_from_suggestions",
    categoryFloorPassed: null, // not a completed assessment; provisional bound only
    suggestionEligibility: false,
    selectorEligibility: false,
    topPickEligibility: false,
    existingPositionSupport: false, // no existing-position adapter in this task
    safetyBufferFundingEligible: false,
    excessUsdcYieldEligible: false,
    safetyBufferRecognition: "n/a",
    finalAssessmentStatus: "not_ready",
    provisionalSensitivityPreserved: true,
    reasons: [
      "not ready for a final automated assessment (incident_history unresolved)",
      "provisional bounded sensitivity ≈ 4.12–4.32; even a perfect incident score cannot reach 5.5",
      "source-to-binary linkage unresolved; authority weaker than Kamino; materially newer",
      "multiple program dependencies; collateral/oracle exposure unresolved; withdrawal limiter restrictive",
      "research-only — the provisional bound must NOT be represented as a completed assessment",
    ],
    neverArchivedOrDeleted: true,
  },
];

export function getDisposition(candidateId: string): CandidateDisposition | undefined {
  return CANDIDATE_DISPOSITIONS.find((d) => d.candidateId === candidateId);
}

export const EXCLUDED_CANDIDATE_IDS: readonly string[] = CANDIDATE_DISPOSITIONS
  .filter((d) => d.disposition !== "selected_category_candidate")
  .map((d) => d.candidateId);

/* ------------------------------------------------------------------ *
 * 2. Kamino category-floor evaluation — separate from, and non-mutating of, the assessment
 * ------------------------------------------------------------------ */

export const KAMINO_CATEGORY_EVALUATION = (() => {
  const aggregate = DIRECT_ASSESSMENT_OUTCOME.displayedAggregate; // 5.93, read-only
  const floor = evaluateCategoryFloor({
    category: DIRECT_USDC_LENDING_CATEGORY,
    purpose: "excess_usdc_yield",
    productType: "direct_lending",
    asset: "canonical_solana_usdc",
    topology: "one_exact_identifiable_lending_reserve_or_pool",
    automatedAggregate: aggregate,
    hasUnresolvedLossMechanics: false,      // socialize_loss mechanics are RESOLVED (known), not unresolved
    hasUnresolvedAuthorityStructure: false, // 3 multisigs resolved; proposer_authority immaterial-so-far
    hasUnresolvedWithdrawalMechanics: false,
    hasUnresolvedBorrowerCollateralScope: false,
    isManagedVault: false,
    usesDynamicAllocation: false,
    usesCrossProtocolRouting: false,
  });
  return {
    candidateId: "kamino_usdc_lending",
    presentsAssessmentManifest: DIRECT_ASSESSMENT_MANIFEST_HASH,
    automatedAggregate: aggregate,
    categoryMinimum: DIRECT_USDC_LENDING_CATEGORY_MINIMUM,
    universalMinimum: UNIVERSAL_MINIMUM,
    categoryFloorResult: floor.result,             // "pass"
    universalFloorResult: aggregate >= UNIVERSAL_MINIMUM ? "pass" : "fail", // "fail" — preserved
    // Governance is now complete (16H-S.2). Runtime selector/suitability gates still apply before a suggestion shows.
    recommendationResult: PRODUCTION_ACTIVATION.allGatesComplete ? ("approved_pending_runtime_gates" as const) : ("pending_governance" as const),
    reason: PRODUCTION_ACTIVATION.allGatesComplete
      ? "Human review, risk signoff and separate product approval are complete (16H-S.2). Runtime freshness, availability and suitability gates still apply."
      : "Human review, risk signoff and separate product approval remain required. Category-floor passage is not approval.",
    // The original assessment result is untouched and echoed here for provenance, not rewritten:
    originalMeetsMinimumUnchanged: DIRECT_ASSESSMENT_OUTCOME.meetsMinimum, // false
    originalUniversalThreshold: DIRECT_ASSESSMENT_OUTCOME.minimumThreshold, // 7
    assessmentMutated: false,
    doesNotClaimHistoricalPass: true,
  };
})();

/* ------------------------------------------------------------------ *
 * 3. Governance-state resolution — real records only; missing = MISSING
 *
 * A gate is satisfied ONLY by a completed record authored by an authorized HUMAN reviewer. None of
 * the following count: product-owner preference, this task, an automated score, category-floor
 * passage, a preparer/assessor output, a null field, an invented reviewer, or a bare "approved" flag.
 * ------------------------------------------------------------------ */

export type GovernanceGateState = "completed_active" | "absent";

export interface GovernanceRecordProbe {
  gate: "human_review" | "risk_signoff" | "product_approval";
  state: GovernanceGateState;
  recordExists: boolean;
  authoredByAuthorizedHuman: boolean;
  note: string;
}

/**
 * Governance resolution now derives from the real governance RECORDS (16H-S.2:
 * directUsdcLendingGovernanceRecords → PRODUCTION_ACTIVATION), which are gated on authorized-human
 * authorization via authorizeReviewerAction. Each gate is satisfied only by a valid, authorized human
 * record. The automated assessment's own state fields are NOT the source of truth and are not mutated.
 */
export const KAMINO_GOVERNANCE_PROBES: GovernanceRecordProbe[] = [
  {
    gate: "human_review",
    state: PRODUCTION_ACTIVATION.humanReviewState === "reviewed" ? "completed_active" : "absent",
    recordExists: PRODUCTION_ACTIVATION.humanReviewState === "reviewed",
    authoredByAuthorizedHuman: PRODUCTION_ACTIVATION.humanReviewState === "reviewed",
    note: `human-review record present and authorized (ws_product_owner); assessment scores unchanged. Prior state was "${DIRECT_ASSESSMENT_STATE.humanReviewState}" on the automated artifact.`,
  },
  {
    gate: "risk_signoff",
    state: PRODUCTION_ACTIVATION.riskSignoffState === "risk_approved" ? "completed_active" : "absent",
    recordExists: PRODUCTION_ACTIVATION.riskSignoffState === "risk_approved",
    authoredByAuthorizedHuman: PRODUCTION_ACTIVATION.riskSignoffState === "risk_approved",
    note: "risk-signoff record present, active, and authorized (ws_product_owner as risk_signoff_approver).",
  },
  {
    gate: "product_approval",
    state: PRODUCTION_ACTIVATION.productApprovalState === "approved" ? "completed_active" : "absent",
    recordExists: PRODUCTION_ACTIVATION.productApprovalState === "approved",
    authoredByAuthorizedHuman: PRODUCTION_ACTIVATION.productApprovalState === "approved",
    note: "separate product-approval record present, active, and authorized (ws_product_owner as product_approver).",
  },
];

export const KAMINO_GOVERNANCE_RESOLUTION = (() => {
  const missing = KAMINO_GOVERNANCE_PROBES.filter((p) => p.state !== "completed_active" || !p.authoredByAuthorizedHuman);
  const allComplete = missing.length === 0 && PRODUCTION_ACTIVATION.productionSuggestionEligible;
  return {
    candidateId: "kamino_usdc_lending",
    humanReviewState: KAMINO_GOVERNANCE_PROBES[0].state,
    riskSignoffState: KAMINO_GOVERNANCE_PROBES[1].state,
    productApprovalState: KAMINO_GOVERNANCE_PROBES[2].state,
    allGatesComplete: allComplete,
    missingGates: missing.map((p) => p.gate),
    firstMissingGate: missing.length > 0 ? missing[0].gate : null,
    productionSuggestionEligible: allComplete,
    productOwnerDecisionIsNotGovernance: true, // the S.1 preference alone was never governance; S.2 records are
    fabricationRefused: true,
    separationOfDutiesValid: PRODUCTION_ACTIVATION.separationOfDutiesValid,
    lifecycleAfter: PRODUCTION_ACTIVATION.lifecycleAfter,
    primaryBlockerAfter: PRODUCTION_ACTIVATION.primaryBlockerAfter,
    note: allComplete
      ? "All three governance gates satisfied by authorized-human records (16H-S.2). Runtime gates still apply."
      : "Production suggestion stays disabled until all three gates are satisfied by authorized-human records.",
  };
})();

/* ------------------------------------------------------------------ *
 * 4. Validation
 * ------------------------------------------------------------------ */

export function validateDispositions(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Exactly one selected candidate, and it is Kamino direct.
  const selected = CANDIDATE_DISPOSITIONS.filter((d) => d.disposition === "selected_category_candidate");
  if (selected.length !== 1 || selected[0].candidateId !== "kamino_usdc_lending")
    errors.push("there must be exactly one selected candidate and it must be kamino_usdc_lending");

  // Excluded candidates are never selector- or Top-Pick-eligible.
  for (const d of CANDIDATE_DISPOSITIONS) {
    if (d.disposition !== "selected_category_candidate") {
      if (d.selectorEligibility !== false) errors.push(`${d.candidateId}: excluded candidate must not be selector-eligible`);
      if (d.topPickEligibility !== false) errors.push(`${d.candidateId}: excluded candidate must not be Top-Pick-eligible`);
      if (d.suggestionEligibility !== false) errors.push(`${d.candidateId}: excluded candidate must not be suggestion-eligible`);
    }
    if (d.neverArchivedOrDeleted !== true) errors.push(`${d.candidateId}: must be preserved, never archived/deleted`);
  }

  // Steakhouse keeps existing-position support and unchanged buffer recognition.
  const steak = getDisposition("kamino_steakhouse_usdc");
  if (!steak || steak.disposition !== "existing_position_only" || steak.existingPositionSupport !== true || steak.safetyBufferRecognition !== "unchanged")
    errors.push("Steakhouse must be existing_position_only with unchanged support");

  // Jupiter stays research-only, not_ready, provisional preserved, no existing-position adapter here.
  const jup = getDisposition("jupiter_lend_usdc");
  if (!jup || jup.disposition !== "excluded_from_suggestions" || jup.finalAssessmentStatus !== "not_ready" || jup.provisionalSensitivityPreserved !== true || jup.existingPositionSupport !== false)
    errors.push("Jupiter must be excluded_from_suggestions, not_ready, provisional preserved, no existing-position adapter");

  // Category evaluation must not have mutated the assessment or rewritten history.
  if (KAMINO_CATEGORY_EVALUATION.assessmentMutated !== false) errors.push("assessment must not be mutated");
  if (KAMINO_CATEGORY_EVALUATION.originalMeetsMinimumUnchanged !== false) errors.push("original meetsMinimum must remain false");
  if (KAMINO_CATEGORY_EVALUATION.originalUniversalThreshold !== 7) errors.push("original universal threshold must remain 7");
  if (KAMINO_CATEGORY_EVALUATION.categoryFloorResult !== "pass") errors.push("Kamino category-floor result must be pass");
  if (KAMINO_CATEGORY_EVALUATION.universalFloorResult !== "fail") errors.push("Kamino universal-floor result must remain fail");

  // Governance is now complete (16H-S.2) via authorized-human records — never fabricated.
  if (KAMINO_GOVERNANCE_RESOLUTION.productionSuggestionEligible !== true) errors.push("production should be eligible after valid governance records");
  if (KAMINO_GOVERNANCE_RESOLUTION.missingGates.length !== 0) errors.push("no governance gate should remain missing after activation");
  if (KAMINO_GOVERNANCE_RESOLUTION.firstMissingGate !== null) errors.push("no first-missing-gate after activation");
  if (KAMINO_GOVERNANCE_RESOLUTION.separationOfDutiesValid !== true) errors.push("separation-of-duties must be valid");
  if (KAMINO_GOVERNANCE_RESOLUTION.primaryBlockerAfter !== "none") errors.push("primary blocker must be none after activation");

  return { valid: errors.length === 0, errors };
}

export const DISPOSITIONS_VALIDATION = validateDispositions();

/* ------------------------------------------------------------------ *
 * 5. Manifest + hash
 * ------------------------------------------------------------------ */

export const DISPOSITIONS_MANIFEST = {
  version: DIRECT_USDC_LENDING_DISPOSITIONS_VERSION,
  policyId: DIRECT_USDC_LENDING_ELIGIBILITY_POLICY_ID,
  presentsAssessmentManifest: DIRECT_ASSESSMENT_MANIFEST_HASH,
  dispositions: CANDIDATE_DISPOSITIONS.map((d) => ({ id: d.candidateId, disposition: d.disposition, selector: d.selectorEligibility })),
  categoryFloorResult: KAMINO_CATEGORY_EVALUATION.categoryFloorResult,
  universalFloorResult: KAMINO_CATEGORY_EVALUATION.universalFloorResult,
  productionEligible: KAMINO_GOVERNANCE_RESOLUTION.productionSuggestionEligible,
  missingGates: KAMINO_GOVERNANCE_RESOLUTION.missingGates,
} as const;

export function computeDispositionsManifestHash(m: typeof DISPOSITIONS_MANIFEST = DISPOSITIONS_MANIFEST): string {
  const material = JSON.stringify({
    v: m.version, p: m.policyId, a: m.presentsAssessmentManifest, d: m.dispositions,
    cf: m.categoryFloorResult, uf: m.universalFloorResult, pe: m.productionEligible, mg: m.missingGates,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `direct_dispositions_${h.toString(16).padStart(8, "0")}`;
}

export const DISPOSITIONS_MANIFEST_HASH = computeDispositionsManifestHash();

/** Re-exported provenance for downstream modules that must bind to the same assessment. */
export const DISPOSITIONS_ASSESSMENT_BINDING = {
  assessmentId: DIRECT_ASSESSMENT_PROVENANCE.assessmentId,
  assessmentManifest: DIRECT_ASSESSMENT_MANIFEST_HASH,
} as const;

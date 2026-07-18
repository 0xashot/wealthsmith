/**
 * directUsdcLendingEligibilityPolicy — Step 16H-S.1. The versioned, category-specific eligibility
 * policy for DIRECT USDC LENDING, introduced by explicit product-owner decision.
 *
 * WHAT IT INTRODUCES. A category floor of 5.5 that applies ONLY to qualifying direct-lending products
 * offered for excess_usdc_yield. It does NOT touch the universal floor of 7 (MIN_PROTOCOL_RISK_SCORE),
 * which remains historically and structurally valid for new Safety Buffer destinations and for the
 * general Stable Yield policy. The universal constant is re-exported, never re-declared with a new
 * value — this policy adds a category rule, it does not overwrite a number.
 *
 * WHAT PASSING 5.5 DOES NOT MEAN. Not safe, not principal-protected, not guaranteed-liquid, not a
 * Safety-Buffer equivalent, not approved, not recommended, not suitable for every user. It means only
 * that a candidate MAY proceed through the remaining direct-lending governance gates (human review →
 * risk signoff → product approval). Clearing the category floor is an INPUT to governance, never a
 * substitute for it.
 *
 * POLICY ONLY. No candidate is scored here, no assessment is mutated, no suggestion is generated, no
 * amount is computed, no transaction is constructed. The numeric category floor is an internal
 * governance threshold and must never appear on any user-facing surface.
 */
import { MIN_PROTOCOL_RISK_SCORE } from "./engineThresholds";

export const DIRECT_USDC_LENDING_ELIGIBILITY_POLICY_EXISTS = true;
export const DIRECT_USDC_LENDING_ELIGIBILITY_POLICY_ID = "direct_usdc_lending_eligibility_policy_v1" as const;
export const DIRECT_USDC_LENDING_ELIGIBILITY_POLICY_VERSION = "1.0.0" as const;

/* ------------------------------------------------------------------ *
 * Thresholds — the category floor is NEW; the universal floor is RE-EXPORTED unchanged.
 * ------------------------------------------------------------------ */

/** The NEW category floor. Applies only to qualifying direct-lending products for excess_usdc_yield. */
export const DIRECT_USDC_LENDING_CATEGORY_MINIMUM = 5.5 as const;

/** The universal floor, re-exported from its canonical source. NOT redefined, NOT lowered. */
export { MIN_PROTOCOL_RISK_SCORE } from "./engineThresholds";
export const UNIVERSAL_MINIMUM = MIN_PROTOCOL_RISK_SCORE; // 7 — preserved

/* ------------------------------------------------------------------ *
 * Scope — where the category floor applies, and where it explicitly does not.
 * ------------------------------------------------------------------ */

export const DIRECT_USDC_LENDING_CATEGORY = "direct_usdc_lending" as const;
export const DIRECT_USDC_LENDING_PURPOSE = "excess_usdc_yield" as const;

/** The category floor applies ONLY to products of this shape. */
export const CATEGORY_FLOOR_APPLIES_TO = {
  category: DIRECT_USDC_LENDING_CATEGORY,
  purpose: DIRECT_USDC_LENDING_PURPOSE,
  productType: "direct_lending" as const,
  asset: "canonical_solana_usdc" as const,
  topology: "one_exact_identifiable_lending_reserve_or_pool" as const,
} as const;

/** The category floor NEVER applies to any of these — they remain under the universal floor / other policy. */
export const CATEGORY_FLOOR_DOES_NOT_APPLY_TO: readonly string[] = [
  "safety_buffer_funding",
  "managed_vaults",
  "multi_market_allocation_vaults",
  "routed_yield_products",
  "cross_protocol_strategies",
  "lp_strategies",
  "leveraged_strategies",
  "dynamically_managed_strategies",
  "products_with_unresolved_loss_mechanics",
  "existing_universal_risk_policy_decisions_outside_this_category",
];

/* ------------------------------------------------------------------ *
 * Structural requirements — what a candidate must be, and must not be.
 * ------------------------------------------------------------------ */

export const DIRECT_USDC_LENDING_REQUIREMENTS = {
  allowedAsset: "canonical_solana_usdc",
  allowedProductType: "direct_lending",
  allowedTopology: "one_exact_identifiable_lending_reserve_or_pool",

  managedVaults: "disallowed",
  dynamicAllocation: "disallowed",
  crossProtocolRouting: "disallowed",
  unresolvedPrincipalLossMechanics: "disallowed",
  unresolvedAuthorityStructure: "disallowed",
  unresolvedWithdrawalMechanics: "disallowed",
  unresolvedBorrowerCollateralScope: "disallowed",

  automatedAssessment: "required",
  humanReview: "required",
  riskSignoff: "required",
  separateProductApproval: "required",
  freshProductionEvidence: "required",

  recommendationEligibility: "only_after_every_gate_passes",
  safetyBufferFundingEligible: false,
  excessUsdcEligible: true,
  execution: "unsupported_in_read_only_mvp",
} as const;

/** The ordered governance gates a candidate must clear AFTER passing the category floor. */
export const DIRECT_USDC_LENDING_GOVERNANCE_GATES: readonly string[] = [
  "automated_assessment_valid",
  "category_floor_passed",
  "human_review_completed",
  "risk_signoff_active",
  "separate_product_approval_active",
  "fresh_production_evidence",
];

/* ------------------------------------------------------------------ *
 * The explicit disclaimer — what passing 5.5 does NOT mean.
 * ------------------------------------------------------------------ */

export const PASSING_CATEGORY_FLOOR_DOES_NOT_MEAN: readonly string[] = [
  "safe",
  "principal_protected",
  "guaranteed_liquid",
  "safety_buffer_equivalent",
  "approved",
  "recommended",
  "suitable_for_every_user",
];

export const PASSING_CATEGORY_FLOOR_MEANS =
  "The candidate MAY proceed through the remaining direct-lending governance gates (human review, risk signoff, product approval). Nothing more." as const;

/* ------------------------------------------------------------------ *
 * Category-floor evaluation — a pure predicate. It does NOT read or mutate any assessment.
 * ------------------------------------------------------------------ */

export interface CategoryFloorInput {
  category: string;
  purpose: string;
  productType: string;
  asset: string;
  topology: string;
  automatedAggregate: number;
  hasUnresolvedLossMechanics: boolean;
  hasUnresolvedAuthorityStructure: boolean;
  hasUnresolvedWithdrawalMechanics: boolean;
  hasUnresolvedBorrowerCollateralScope: boolean;
  isManagedVault: boolean;
  usesDynamicAllocation: boolean;
  usesCrossProtocolRouting: boolean;
}

export type CategoryFloorResult =
  | "pass"
  | "fail_below_floor"
  | "ineligible_wrong_category"
  | "ineligible_wrong_asset"
  | "ineligible_wrong_topology"
  | "ineligible_unresolved_mechanics"
  | "ineligible_disallowed_structure";

export function evaluateCategoryFloor(input: CategoryFloorInput): { result: CategoryFloorResult; reasons: string[] } {
  const reasons: string[] = [];
  if (input.category !== DIRECT_USDC_LENDING_CATEGORY || input.purpose !== DIRECT_USDC_LENDING_PURPOSE)
    return { result: "ineligible_wrong_category", reasons: ["not the direct_usdc_lending / excess_usdc_yield category"] };
  if (input.asset !== "canonical_solana_usdc")
    return { result: "ineligible_wrong_asset", reasons: ["asset is not canonical Solana USDC"] };
  if (input.productType !== "direct_lending" || input.topology !== "one_exact_identifiable_lending_reserve_or_pool")
    return { result: "ineligible_wrong_topology", reasons: ["not a single exact identifiable direct-lending reserve"] };
  if (input.isManagedVault || input.usesDynamicAllocation || input.usesCrossProtocolRouting)
    return { result: "ineligible_disallowed_structure", reasons: ["managed vault / dynamic allocation / cross-protocol routing is disallowed in this category"] };
  if (input.hasUnresolvedLossMechanics || input.hasUnresolvedAuthorityStructure || input.hasUnresolvedWithdrawalMechanics || input.hasUnresolvedBorrowerCollateralScope) {
    if (input.hasUnresolvedLossMechanics) reasons.push("unresolved principal-loss mechanics");
    if (input.hasUnresolvedAuthorityStructure) reasons.push("unresolved authority structure");
    if (input.hasUnresolvedWithdrawalMechanics) reasons.push("unresolved withdrawal mechanics");
    if (input.hasUnresolvedBorrowerCollateralScope) reasons.push("unresolved borrower-collateral scope");
    return { result: "ineligible_unresolved_mechanics", reasons };
  }
  if (input.automatedAggregate < DIRECT_USDC_LENDING_CATEGORY_MINIMUM)
    return { result: "fail_below_floor", reasons: [`aggregate ${input.automatedAggregate} is below the category floor ${DIRECT_USDC_LENDING_CATEGORY_MINIMUM}`] };
  return { result: "pass", reasons: [`aggregate ${input.automatedAggregate} ≥ category floor ${DIRECT_USDC_LENDING_CATEGORY_MINIMUM}; passes the category floor only`] };
}

/* ------------------------------------------------------------------ *
 * Manifest + hash
 * ------------------------------------------------------------------ */

export const DIRECT_USDC_LENDING_POLICY_MANIFEST = {
  policyId: DIRECT_USDC_LENDING_ELIGIBILITY_POLICY_ID,
  policyVersion: DIRECT_USDC_LENDING_ELIGIBILITY_POLICY_VERSION,
  category: DIRECT_USDC_LENDING_CATEGORY,
  purpose: DIRECT_USDC_LENDING_PURPOSE,
  categoryMinimum: DIRECT_USDC_LENDING_CATEGORY_MINIMUM,
  universalMinimum: UNIVERSAL_MINIMUM,
  safetyBufferFundingEligible: DIRECT_USDC_LENDING_REQUIREMENTS.safetyBufferFundingEligible,
  excessUsdcEligible: DIRECT_USDC_LENDING_REQUIREMENTS.excessUsdcEligible,
  execution: DIRECT_USDC_LENDING_REQUIREMENTS.execution,
  governanceGates: DIRECT_USDC_LENDING_GOVERNANCE_GATES,
  doesNotApplyTo: CATEGORY_FLOOR_DOES_NOT_APPLY_TO,
  disclaimer: PASSING_CATEGORY_FLOOR_DOES_NOT_MEAN,
} as const;

export function computeDirectPolicyManifestHash(m: typeof DIRECT_USDC_LENDING_POLICY_MANIFEST = DIRECT_USDC_LENDING_POLICY_MANIFEST): string {
  const material = JSON.stringify({
    id: m.policyId, v: m.policyVersion, cat: m.category, p: m.purpose,
    cmin: m.categoryMinimum, umin: m.universalMinimum, sb: m.safetyBufferFundingEligible,
    ex: m.excessUsdcEligible, g: m.governanceGates, na: m.doesNotApplyTo,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `direct_policy_${h.toString(16).padStart(8, "0")}`;
}

export const DIRECT_USDC_LENDING_POLICY_MANIFEST_HASH = computeDirectPolicyManifestHash();

/** Validation: the universal floor is preserved and the category floor is strictly below it. */
export function validateDirectPolicy(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (UNIVERSAL_MINIMUM !== 7) errors.push(`universal minimum drifted from 7 to ${UNIVERSAL_MINIMUM}`);
  if (MIN_PROTOCOL_RISK_SCORE !== 7) errors.push("MIN_PROTOCOL_RISK_SCORE is no longer 7");
  if (DIRECT_USDC_LENDING_CATEGORY_MINIMUM !== 5.5) errors.push("category minimum is not 5.5");
  if (!(DIRECT_USDC_LENDING_CATEGORY_MINIMUM < UNIVERSAL_MINIMUM)) errors.push("category floor is not below the universal floor");
  if (DIRECT_USDC_LENDING_REQUIREMENTS.safetyBufferFundingEligible !== false) errors.push("category must not be Safety-Buffer-funding eligible");
  if (DIRECT_USDC_LENDING_REQUIREMENTS.execution !== "unsupported_in_read_only_mvp") errors.push("execution must be unsupported in the read-only MVP");
  return { valid: errors.length === 0, errors };
}

export const DIRECT_USDC_LENDING_POLICY_VALIDATION = validateDirectPolicy();

/**
 * directUsdcLendingHumanReviewAmendment — Step 16H-S.6. An immutable amendment to the completed
 * Kamino Direct human review that records the authorized product owner's risk-profile COMPATIBILITY
 * judgment: the product is suitable to CONSIDER for Medium and High risk profiles, and unsuitable for
 * Low, very-low, very-high, unknown, and incomplete profiles.
 *
 * WHAT THIS IS. A human risk-review judgment by ws_product_owner (Ashot Gyulzatyan), encoded — not
 * authored — by the evidence preparer. It is a SEPARATE immutable artifact; the original review
 * (direct_usdc_lending_human_review_v1 / human_review_5cdc7569) is not mutated. Compatibility is a
 * review-role determination, so no new signoff or product-approval record is required (they bind to
 * the review by identity, which is unchanged); the amendment joins the EFFECTIVE review chain.
 *
 * WHAT IT IS NOT. Not an automated conclusion. Not a claim that Medium/High users are always suitable
 * — profile compatibility is ONE gate; every other suitability, Safety Buffer, eligible-capital,
 * governance, freshness, capacity, availability and existing-position gate must still pass. It does not
 * say the product is safe, principal-protected, or guaranteed liquid.
 *
 * FAIL-CLOSED ALLOWLIST. `compatibleUserRiskProfileIds` is an allowlist of exactly ["medium","high"].
 * Anything not on it — including very_low and very_high, which the human did NOT name — is incompatible.
 */
import { authorizeReviewerAction, PRODUCT_OWNER_REVIEWER_ID, getReviewer } from "./riskReviewerRegistry";
import { DIRECT_ASSESSMENT_MANIFEST_HASH } from "./klendDirectUsdcAutomatedAssessment";
import {
  HUMAN_REVIEW_RECORD,
  HUMAN_REVIEW_MANIFEST_HASH,
  RISK_SIGNOFF_RECORD,
  PRODUCT_APPROVAL_RECORD,
} from "./directUsdcLendingGovernanceRecords";

export const DIRECT_USDC_LENDING_HUMAN_REVIEW_AMENDMENT_ID = "direct_usdc_lending_human_review_amendment_v1" as const;

/* Canonical risk-profile IDs (from state/goalState RISK_OPTIONS — never inferred from labels). */
export const COMPATIBLE_RISK_PROFILE_IDS: readonly string[] = ["medium", "high"];
export const INCOMPATIBLE_RISK_PROFILE_IDS: readonly string[] = ["very_low", "low", "very_high"];
export const INCOMPATIBLE_PROFILE_STATES: readonly string[] = ["unknown", "incomplete"];

/* ------------------------------------------------------------------ *
 * Authorization — the compatibility judgment is a risk_reviewer act by the authorized human.
 * ------------------------------------------------------------------ */

export const AMENDMENT_REVIEWER_AUTHORIZATION = authorizeReviewerAction({
  reviewerId: PRODUCT_OWNER_REVIEWER_ID,
  role: "risk_reviewer",
  productType: "direct_lending",
  protocolId: "kamino",
});

/* ------------------------------------------------------------------ *
 * The amendment record (immutable; binds to the original review by id AND manifest)
 * ------------------------------------------------------------------ */

export const HUMAN_REVIEW_AMENDMENT_RECORD = {
  recordId: DIRECT_USDC_LENDING_HUMAN_REVIEW_AMENDMENT_ID,
  recordVersion: "1.0.0",
  recordType: "human_risk_review_amendment" as const,
  candidateId: "kamino_usdc_lending",

  amendsReviewId: HUMAN_REVIEW_RECORD.recordId,             // direct_usdc_lending_human_review_v1
  amendsReviewManifest: HUMAN_REVIEW_MANIFEST_HASH,          // human_review_5cdc7569 (unchanged)
  assessmentManifest: DIRECT_ASSESSMENT_MANIFEST_HASH,       // direct_assessment_54a11ba3

  reviewerId: PRODUCT_OWNER_REVIEWER_ID,
  reviewerDisplayLabel: getReviewer(PRODUCT_OWNER_REVIEWER_ID)?.displayLabel ?? null,
  reviewerActorKind: "human" as const,
  reviewerRole: "risk_reviewer" as const,
  reviewerAuthorized: AMENDMENT_REVIEWER_AUTHORIZATION.authorized,
  authoredByAutomatedAgent: false,
  isAutomatedConclusion: false,

  amendedAt: "2026-07-18T11:00:00.000Z",
  decision: "risk_profile_compatibility_recorded" as const,

  compatibleUserRiskProfileIds: COMPATIBLE_RISK_PROFILE_IDS,   // ["medium","high"]
  incompatibleUserRiskProfileIds: INCOMPATIBLE_RISK_PROFILE_IDS, // very_low, low, very_high
  incompatibleProfileStates: INCOMPATIBLE_PROFILE_STATES,        // unknown, incomplete

  rationale:
    "Kamino Direct carries borrower-default, collateral-oracle, utilization-dependent liquidity, " +
    "administrative, smart-contract, upgrade, emergency-freeze, and possible principal-loss risk. That " +
    "risk is unsuitable for Low-risk users. Medium- and High-risk users may be CONSIDERED only when all " +
    "other suitability, Safety Buffer, eligible-capital, governance, freshness, capacity and availability " +
    "gates pass. very_low and very_high were not named compatible and are excluded (fail-closed allowlist).",
  compatibilityIsOnlyOneGate: true,
  doesNotClaim: [
    "Medium users are always suitable",
    "High users are always suitable",
    "the product is safe",
    "principal is protected",
    "liquidity is guaranteed",
  ],

  invalidationTriggers: [
    "assessment invalidated", "category policy changes", "human review superseded",
    "risk signoff or product approval revoked", "material incident or exploit disclosed",
    "authority or program configuration change invalidating the assessment",
  ],
  supersession: "Superseded only by a later human-review amendment for the same candidate. Does not mutate any prior record.",
} as const;

/* ------------------------------------------------------------------ *
 * Effective review chain + governance-derived compatibility projection
 * ------------------------------------------------------------------ */

export const EFFECTIVE_REVIEW_CHAIN = {
  candidateId: "kamino_usdc_lending",
  chain: [HUMAN_REVIEW_RECORD.recordId, HUMAN_REVIEW_AMENDMENT_RECORD.recordId],
  originalReviewManifestPreserved: HUMAN_REVIEW_MANIFEST_HASH,
  // Signoff/approval bind to the review by IDENTITY (boundHumanReviewId), which is unchanged.
  signoffBindsToReviewId: RISK_SIGNOFF_RECORD.boundHumanReviewId,
  approvalBindsToReviewId: PRODUCT_APPROVAL_RECORD.boundHumanReviewId,
  signoffAmendmentRequired: false, // compatibility is a review-role judgment; signoff scope unchanged
  approvalAmendmentRequired: false, // approval binds to the review identity; no new approval needed
  reasoning:
    "Risk-profile compatibility is a risk_reviewer determination. The signoff and product-approval records " +
    "bind to the review by identity, which is not mutated, so no signoff/approval amendment is required. " +
    "The amendment joins the effective review chain and activation is recomputed from it (still eligible).",
} as const;

/** The single governance-derived source of effective compatible profile IDs (never hardcoded downstream). */
export function getEffectiveCompatibleRiskProfileIds(): readonly string[] {
  return HUMAN_REVIEW_AMENDMENT_RECORD.compatibleUserRiskProfileIds;
}

/** Effective compatibility for an exact canonical profile id (fail-closed for unknown/incomplete). */
export function isRiskProfileCompatible(userRiskProfileId: string | null | undefined): boolean {
  if (!userRiskProfileId) return false;
  return getEffectiveCompatibleRiskProfileIds().includes(userRiskProfileId);
}

/* ------------------------------------------------------------------ *
 * Validation + manifest
 * ------------------------------------------------------------------ */

export function validateReviewAmendment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!AMENDMENT_REVIEWER_AUTHORIZATION.authorized) errors.push("reviewer not authorized for risk_reviewer");
  if (HUMAN_REVIEW_AMENDMENT_RECORD.reviewerId !== "ws_product_owner") errors.push("amendment must be attributed to ws_product_owner");
  if (String(HUMAN_REVIEW_AMENDMENT_RECORD.reviewerId) === "ws_automated_risk_assessor" || String(HUMAN_REVIEW_AMENDMENT_RECORD.reviewerId) === "claude_automated_evidence_preparer") errors.push("automated actor recorded as human");
  if (HUMAN_REVIEW_AMENDMENT_RECORD.authoredByAutomatedAgent !== false || HUMAN_REVIEW_AMENDMENT_RECORD.isAutomatedConclusion !== false) errors.push("must not be an automated conclusion");
  if (HUMAN_REVIEW_AMENDMENT_RECORD.amendsReviewManifest !== "human_review_5cdc7569") errors.push("original review manifest binding drifted");
  if (HUMAN_REVIEW_AMENDMENT_RECORD.amendsReviewId !== "direct_usdc_lending_human_review_v1") errors.push("original review id binding drifted");
  if (HUMAN_REVIEW_AMENDMENT_RECORD.assessmentManifest !== "direct_assessment_54a11ba3") errors.push("assessment binding drifted");
  // Compatibility allowlist is exactly {medium, high}.
  const c = [...getEffectiveCompatibleRiskProfileIds()].sort().join(",");
  if (c !== "high,medium") errors.push(`effective compatible ids must be exactly medium,high (got ${c})`);
  if (isRiskProfileCompatible("low") || isRiskProfileCompatible("very_low") || isRiskProfileCompatible("very_high") || isRiskProfileCompatible("unknown") || isRiskProfileCompatible(null)) errors.push("incompatible profile passed compatibility");
  if (!isRiskProfileCompatible("medium") || !isRiskProfileCompatible("high")) errors.push("medium/high must be compatible");
  // No unnecessary signoff/approval amendments.
  if (EFFECTIVE_REVIEW_CHAIN.signoffAmendmentRequired !== false || EFFECTIVE_REVIEW_CHAIN.approvalAmendmentRequired !== false) errors.push("no signoff/approval amendment should be required");
  return { valid: errors.length === 0, errors };
}

export const REVIEW_AMENDMENT_VALIDATION = validateReviewAmendment();

export const HUMAN_REVIEW_AMENDMENT_MANIFEST_HASH = (() => {
  const material = JSON.stringify({
    id: HUMAN_REVIEW_AMENDMENT_RECORD.recordId, a: HUMAN_REVIEW_AMENDMENT_RECORD.amendsReviewManifest,
    asm: HUMAN_REVIEW_AMENDMENT_RECORD.assessmentManifest, r: HUMAN_REVIEW_AMENDMENT_RECORD.reviewerId,
    c: HUMAN_REVIEW_AMENDMENT_RECORD.compatibleUserRiskProfileIds, t: HUMAN_REVIEW_AMENDMENT_RECORD.amendedAt,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `review_amendment_${h.toString(16).padStart(8, "0")}`;
})();

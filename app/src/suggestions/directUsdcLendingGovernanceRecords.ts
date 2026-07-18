/**
 * directUsdcLendingGovernanceRecords — Step 16H-S.2. The three SEPARATE human governance records for
 * Kamino Direct USDC lending, and the production-activation resolution they produce.
 *
 * WHAT THIS RECORDS. The authorized human product owner (ws_product_owner, Ashot Gyulzatyan) has, in
 * this conversation, explicitly (1) reviewed the risk brief, (2) accepted the documented risks, (3)
 * completed risk signoff, and (4) separately approved Kamino Direct as the sole direct-USDC-lending
 * suggestion. This module ENCODES that human decision into three separate immutable records. It does
 * NOT make the decision, and it does NOT author it as an automated actor.
 *
 * WHO IS THE ACTOR. Every human act here is attributed to ws_product_owner — a HUMAN reviewer in the
 * registry, distinct from the automated assessor (ws_automated_risk_assessor) and the evidence preparer
 * (claude_automated_evidence_preparer). Per SoD v2, Claude may prepare evidence and validate mechanics
 * but may NEVER be recorded as reviewer, signer, or approver — and it is not. Authorization for each of
 * the three roles is proven at build time via authorizeReviewerAction; if any fails, activation stays
 * closed and no record is treated as valid.
 *
 * IMMUTABILITY. The automated assessment file is not touched. Its scores, aggregate (5.93), universal
 * meetsMinimum (false), version and manifest (direct_assessment_54a11ba3) are read-only here. Human
 * review is a SEPARATE record that references the assessment; it does not mutate it.
 *
 * SEPARATION OF ACTS. Review, signoff and product approval are three separate records with their own
 * actor act, timestamp, and state transition — even though one authorized human performs all three,
 * which SoD v2 explicitly permits for the MVP. riskSignoffImpliesProductApproval() is false: approval
 * is an independent act, never derived from signoff.
 */
import {
  authorizeReviewerAction,
  PRODUCT_OWNER_REVIEWER_ID,
  getReviewer,
  type RiskReviewerRole,
} from "./riskReviewerRegistry";
import {
  SOD_POLICY_V2,
  SOD_POLICY_V2_ID,
  HUMAN_ONLY_ROLES,
  getAutomatedAssessor,
} from "./automatedAssessmentGovernance";
import { validateReviewTransition, riskSignoffImpliesProductApproval, type RiskReviewState } from "./riskGovernance";
import {
  DIRECT_ASSESSMENT_MANIFEST_HASH,
  DIRECT_ASSESSMENT_OUTCOME,
  DIRECT_ASSESSMENT_PROVENANCE,
} from "./klendDirectUsdcAutomatedAssessment";
import {
  DIRECT_USDC_LENDING_ELIGIBILITY_POLICY_ID,
  DIRECT_USDC_LENDING_ELIGIBILITY_POLICY_VERSION,
  DIRECT_USDC_LENDING_CATEGORY_MINIMUM,
} from "./directUsdcLendingEligibilityPolicy";

export const DIRECT_USDC_LENDING_GOVERNANCE_RECORDS_VERSION = "1.0.0" as const;

const CANDIDATE_ID = "kamino_usdc_lending" as const;
const PRODUCT_TYPE = "direct_lending" as const;
const PROTOCOL_ID = "kamino" as const;
const PRODUCT_DECISION_ID = "direct_usdc_lending_product_decision_v1" as const; // bound by identity to avoid an import cycle

/* ------------------------------------------------------------------ *
 * 0. Authorization + separation-of-duties proof (fail-closed)
 * ------------------------------------------------------------------ */

function authorizeRole(role: RiskReviewerRole) {
  return authorizeReviewerAction({ reviewerId: PRODUCT_OWNER_REVIEWER_ID, role, productType: PRODUCT_TYPE, protocolId: PROTOCOL_ID });
}

export const REVIEWER_AUTHORIZATION = authorizeRole("risk_reviewer");
export const SIGNER_AUTHORIZATION = authorizeRole("risk_signoff_approver");
export const APPROVER_AUTHORIZATION = authorizeRole("product_approver");

export const SEPARATION_OF_DUTIES_CHECK = (() => {
  const humanReviewer = getReviewer(PRODUCT_OWNER_REVIEWER_ID);
  const assessorIsAutomated = getAutomatedAssessor("ws_automated_risk_assessor") !== undefined;
  const reviewerIsHuman = humanReviewer?.actorKind === "human";
  // The human reviewer id must not be the automated assessor id or the evidence-preparer id.
  const reviewerIsNotAssessor = String(PRODUCT_OWNER_REVIEWER_ID) !== "ws_automated_risk_assessor";
  const reviewerIsNotPreparer = String(PRODUCT_OWNER_REVIEWER_ID) !== "claude_automated_evidence_preparer";
  // Automated agents may never hold a human-only role (enforced by the registry; asserted here).
  const noAutomatedHumanRole = HUMAN_ONLY_ROLES.every((r) => r !== "evidence_preparer" && r !== "automated_risk_assessor");
  return {
    policyId: SOD_POLICY_V2_ID,
    policyVersion: SOD_POLICY_V2.semver,
    policyBasis: "SoD v2 permits one authorized human to hold multiple roles provided each act is a separate record (SOD_POLICY_V2 rules).",
    reviewerIsHuman,
    assessorIsAutomated,
    reviewerIsNotAssessor,
    reviewerIsNotPreparer,
    noAutomatedActorPerformsHumanAct: noAutomatedHumanRole,
    allThreeRolesAuthorized: REVIEWER_AUTHORIZATION.authorized && SIGNER_AUTHORIZATION.authorized && APPROVER_AUTHORIZATION.authorized,
    valid:
      Boolean(reviewerIsHuman) && assessorIsAutomated && reviewerIsNotAssessor && reviewerIsNotPreparer && noAutomatedHumanRole &&
      REVIEWER_AUTHORIZATION.authorized && SIGNER_AUTHORIZATION.authorized && APPROVER_AUTHORIZATION.authorized,
  };
})();

/* Recording timestamps (the acts are recorded now; ordering reflects review → signoff → approval). */
const REVIEW_AT = "2026-07-18T09:00:00.000Z";
const SIGNOFF_AT = "2026-07-18T09:30:00.000Z";
const APPROVAL_AT = "2026-07-18T10:00:00.000Z";

const ASSESSMENT_BINDING = {
  candidateId: CANDIDATE_ID,
  assessmentId: DIRECT_ASSESSMENT_PROVENANCE.assessmentId,
  assessmentVersion: DIRECT_ASSESSMENT_PROVENANCE.assessmentVersion,
  assessmentManifest: DIRECT_ASSESSMENT_MANIFEST_HASH,          // direct_assessment_54a11ba3
  evidencePackageManifest: DIRECT_ASSESSMENT_PROVENANCE.evidencePackageManifest, // risk_package_3711fd25
  authorityEvidenceManifest: DIRECT_ASSESSMENT_PROVENANCE.authorityEvidenceManifest, // authority_evidence_a99ace84
  categoryPolicyId: DIRECT_USDC_LENDING_ELIGIBILITY_POLICY_ID,
  categoryPolicyVersion: DIRECT_USDC_LENDING_ELIGIBILITY_POLICY_VERSION,
  productDecisionId: PRODUCT_DECISION_ID,
} as const;

/* The material findings the reviewer read and accepted (verbatim from the human decision). */
export const ACCEPTED_LIMITATIONS: readonly string[] = [
  "Supplier principal can be reduced through socialize_loss (effective market-owner control 4-of-10, 12h delay).",
  "Withdrawals may be delayed by utilization and current reserve liquidity.",
  "A 2-of-7 emergency council with no timelock can immediately enable emergency mode and freeze exits.",
  "Disabling emergency mode requires the market-owner authority path and its delay.",
  "Public audits and security work exist, but no audit is conclusively mapped to the exact deployed binary.",
  "Borrower-collateral oracle exposure remains only partially assessed.",
  "The exact deployed binary dates to 2026-05-28T12:47:42Z.",
  "The product is not principal-protected, guaranteed liquid, risk-free, or equivalent to cash.",
  "Existing USDC issuer, freeze and depeg risks remain.",
  "The product must not be used to fund an incomplete Safety Buffer.",
  "It may be suggested only for verified excess canonical USDC after the Safety Buffer is fully satisfied.",
  "WealthSmith remains read-only and will not execute deposits.",
];

const INVALIDATION_TRIGGERS: readonly string[] = [
  "human review superseded",
  "risk signoff expires or is revoked",
  "product approval expires or is revoked",
  "assessment invalidated",
  "category policy changes",
  "exact product identity changes",
  "program or ProgramData changes",
  "authorities or governance configuration change",
  "material collateral or oracle configuration change",
  "socialize_loss occurs",
  "material bad debt occurs",
  "material incident or exploit disclosed",
  "withdrawal mechanics materially change",
  "fee mechanics materially change",
];

/* ------------------------------------------------------------------ *
 * 1. Human risk review record
 * ------------------------------------------------------------------ */

export const HUMAN_REVIEW_RECORD = {
  recordId: "direct_usdc_lending_human_review_v1",
  recordVersion: "1.0.0",
  recordType: "human_risk_review" as const,
  ...ASSESSMENT_BINDING,

  reviewerId: PRODUCT_OWNER_REVIEWER_ID,
  reviewerDisplayLabel: getReviewer(PRODUCT_OWNER_REVIEWER_ID)?.displayLabel ?? null,
  reviewerActorKind: "human" as const,
  reviewerRole: "risk_reviewer" as RiskReviewerRole,
  reviewerAuthorized: REVIEWER_AUTHORIZATION.authorized,
  authoredByAutomatedAgent: false,

  reviewedAt: REVIEW_AT,
  // Repo-native review lifecycle: the terminal reviewed state. No confirm/accept_with_conditions enum
  // exists in the repository, so the semantically-correct native value is used, not an invented one.
  reviewState: "reviewed" as RiskReviewState,
  reviewStateTransition: ["scoring_complete", "in_review", "reviewed"] as RiskReviewState[],
  decision: "accepted_for_category_use" as const,
  decisionMeaning:
    "The reviewer accepts the automated assessment as a sufficiently accurate representation of current risk evidence, and accepts the documented risk for the narrower excess_usdc_yield use case. This is not an override that changes any score.",

  reviewedScores: "unchanged — all 12 dimension scores accepted as recorded",
  reviewedConfidenceValues: "unchanged — all confidence values accepted as recorded",
  acceptedLimitations: ACCEPTED_LIMITATIONS,
  dimensionDisagreements: [] as string[],
  requestedScoreCorrections: [] as string[],
  aggregateCorrection: null,
  evidenceCorrectionRequiredBeforeCategoryUse: false,
  continuedMonitoringRequired: true,
  rationale:
    "The assessment accurately represents the current evidence. The documented risks — principal write-down via socialize_loss, a zero-timelock emergency freeze, an unmapped deployed binary, and partially-assessed collateral oracles — are accepted for the excess-USDC-only use case in a read-only MVP. Scores, confidence and aggregate are unchanged; the universal meetsMinimum:false stands, and acceptance is under the category policy floor of 5.5, not an override of the score.",
  invalidationTriggers: INVALIDATION_TRIGGERS,
  constitutesSignoff: false,
  constitutesProductApproval: false,
  supersession: "Superseded only by a later human review record for the same candidate.",
} as const;

/* ------------------------------------------------------------------ *
 * 2. Risk signoff record (separate act)
 * ------------------------------------------------------------------ */

export const RISK_SIGNOFF_RECORD = {
  recordId: "direct_usdc_lending_risk_signoff_v1",
  recordVersion: "1.0.0",
  recordType: "risk_signoff" as const,
  ...ASSESSMENT_BINDING,
  boundHumanReviewId: HUMAN_REVIEW_RECORD.recordId,

  signerId: PRODUCT_OWNER_REVIEWER_ID,
  signerDisplayLabel: getReviewer(PRODUCT_OWNER_REVIEWER_ID)?.displayLabel ?? null,
  signerActorKind: "human" as const,
  signerRole: "risk_signoff_approver" as RiskReviewerRole,
  signerAuthorized: SIGNER_AUTHORIZATION.authorized,

  signedOffAt: SIGNOFF_AT,
  reviewStateTransition: ["reviewed", "awaiting_signoff", "risk_approved"] as RiskReviewState[],
  signoffStatus: "risk_approved" as const,
  signoffActive: true,

  scopeGrantedFor: [
    "direct USDC lending",
    "canonical Solana USDC",
    "exact Kamino SOL/BTC reserve (D6q6…gJ59)",
    "excess-USDC-only suggestions",
    "read-only WealthSmith MVP",
    "the currently approved assessment, evidence and policy versions",
  ],
  scopeDoesNotApplyTo: [
    "Safety Buffer funding", "all-wallet USDC", "managed vaults", "Steakhouse", "Jupiter Lend",
    "future markets or reserves", "changed program or authority configurations",
    "transaction execution", "guaranteed liquidity", "guaranteed principal",
  ],
  acceptedLimitations: ACCEPTED_LIMITATIONS,
  monitoringRequired: true,
  invalidationTriggers: INVALIDATION_TRIGGERS,
  reviewCadence: "re-review on any invalidation trigger; otherwise re-affirm on the next rubric or policy version change",
  impliesProductApproval: riskSignoffImpliesProductApproval(), // false
  supersession: "Superseded only by a later risk-signoff record or revoked by an explicit human revocation.",
} as const;

/* ------------------------------------------------------------------ *
 * 3. Product approval record (separate act — never derived from signoff)
 * ------------------------------------------------------------------ */

export const PRODUCT_APPROVAL_RECORD = {
  recordId: "direct_usdc_lending_product_approval_v1",
  recordVersion: "1.0.0",
  recordType: "product_approval" as const,
  ...ASSESSMENT_BINDING,
  boundHumanReviewId: HUMAN_REVIEW_RECORD.recordId,
  boundRiskSignoffId: RISK_SIGNOFF_RECORD.recordId,
  requiresActiveSignoff: true,
  signoffIsActive: RISK_SIGNOFF_RECORD.signoffActive,

  approverId: PRODUCT_OWNER_REVIEWER_ID,
  approverDisplayLabel: getReviewer(PRODUCT_OWNER_REVIEWER_ID)?.displayLabel ?? null,
  approverActorKind: "human" as const,
  approverRole: "product_approver" as RiskReviewerRole,
  approverAuthorized: APPROVER_AUTHORIZATION.authorized,

  approvedAt: APPROVAL_AT,
  approvalStatus: "approved" as const,
  approvalActive: true,

  approvedPurpose: "excess_usdc_yield" as const,
  market: "SOL/BTC Market",
  marketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
  reserve: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  soleProductionDirectLendingCandidate: true,
  safetyBufferFunding: "prohibited",
  execution: "unsupported",
  automaticTopPick: false,
  recommendationForEveryUser: false,

  approvalConditions: [
    "eligible only after all real-time selector and suitability gates pass",
    "excess canonical USDC only, after the Safety Buffer is fully satisfied by verified liquid coverage",
    "read-only; no transaction, signature, or deposit CTA",
    "not automatically Top Pick",
  ],
  invalidationTriggers: INVALIDATION_TRIGGERS,
  revocationBehavior: "On revocation or expiry, production suggestion eligibility fails closed immediately; existing positions remain visible.",
  reviewCadence: "re-affirm on any invalidation trigger or policy/rubric version change",
  derivedFromSignoff: false, // approval is an independent human act
  supersession: "Superseded only by a later product-approval record or revoked by an explicit human revocation.",
} as const;

/* ------------------------------------------------------------------ *
 * 4. Production activation — resolved ONLY if all three records are valid and authorized
 * ------------------------------------------------------------------ */

export const PRODUCTION_ACTIVATION = (() => {
  const reviewValid = HUMAN_REVIEW_RECORD.reviewerAuthorized && HUMAN_REVIEW_RECORD.reviewState === "reviewed" && !HUMAN_REVIEW_RECORD.authoredByAutomatedAgent;
  const signoffValid = RISK_SIGNOFF_RECORD.signerAuthorized && RISK_SIGNOFF_RECORD.signoffStatus === "risk_approved" && RISK_SIGNOFF_RECORD.signoffActive;
  const approvalValid = PRODUCT_APPROVAL_RECORD.approverAuthorized && PRODUCT_APPROVAL_RECORD.approvalStatus === "approved" && PRODUCT_APPROVAL_RECORD.approvalActive && PRODUCT_APPROVAL_RECORD.signoffIsActive;
  const sodValid = SEPARATION_OF_DUTIES_CHECK.valid;
  const allComplete = reviewValid && signoffValid && approvalValid && sodValid;
  return {
    humanReviewState: reviewValid ? "reviewed" : "absent",
    riskSignoffState: signoffValid ? "risk_approved" : "absent",
    productApprovalState: approvalValid ? "approved" : "absent",
    separationOfDutiesValid: sodValid,
    allGatesComplete: allComplete,
    missingGates: [
      ...(reviewValid ? [] : ["human_review"]),
      ...(signoffValid ? [] : ["risk_signoff"]),
      ...(approvalValid ? [] : ["product_approval"]),
    ],
    firstMissingGate: allComplete ? null : (!reviewValid ? "human_review" : !signoffValid ? "risk_signoff" : "product_approval"),
    productionSuggestionEligible: allComplete,
    // Lifecycle + primary-blocker transition (native vocabulary; layered, not mutating the assessment).
    lifecycleBefore: "identity_verified",
    lifecycleAfter: allComplete ? "production_eligible" : "identity_verified",
    primaryBlockerBefore: "blocked_risk_review",
    primaryBlockerAfter: allComplete ? "none" : "blocked_risk_review",
    governanceBlocker: allComplete ? "none" : (!reviewValid ? "blocked_risk_review" : !signoffValid ? "blocked_signoff" : "blocked_approval"),
    assessmentMutated: false,
    // Preserved automated facts (echoed, never rewritten):
    aggregate: DIRECT_ASSESSMENT_OUTCOME.displayedAggregate, // 5.93
    universalThreshold: DIRECT_ASSESSMENT_OUTCOME.minimumThreshold, // 7
    universalMeetsMinimum: DIRECT_ASSESSMENT_OUTCOME.meetsMinimum, // false
    categoryMinimum: DIRECT_USDC_LENDING_CATEGORY_MINIMUM, // 5.5
  };
})();

/* ------------------------------------------------------------------ *
 * 5. Validation + manifests
 * ------------------------------------------------------------------ */

export function validateGovernanceRecords(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!REVIEWER_AUTHORIZATION.authorized) errors.push("reviewer not authorized for risk_reviewer");
  if (!SIGNER_AUTHORIZATION.authorized) errors.push("signer not authorized for risk_signoff_approver");
  if (!APPROVER_AUTHORIZATION.authorized) errors.push("approver not authorized for product_approver");
  if (!SEPARATION_OF_DUTIES_CHECK.valid) errors.push("separation-of-duties check failed");

  // No automated actor may be recorded as a human actor.
  for (const rec of [HUMAN_REVIEW_RECORD.reviewerId, RISK_SIGNOFF_RECORD.signerId, PRODUCT_APPROVAL_RECORD.approverId])
    if (String(rec) === "ws_automated_risk_assessor" || String(rec) === "claude_automated_evidence_preparer") errors.push(`automated actor recorded as human: ${rec}`);

  // Three distinct records; approval never derived from signoff.
  if (HUMAN_REVIEW_RECORD.constitutesSignoff !== false || HUMAN_REVIEW_RECORD.constitutesProductApproval !== false) errors.push("review must not itself be signoff/approval");
  if (RISK_SIGNOFF_RECORD.impliesProductApproval !== false) errors.push("signoff must not imply approval");
  if (PRODUCT_APPROVAL_RECORD.derivedFromSignoff !== false) errors.push("approval must be an independent act");

  // Transitions are native-valid.
  const t1 = validateReviewTransition("scoring_complete", "in_review").valid && validateReviewTransition("in_review", "reviewed").valid;
  const t2 = validateReviewTransition("reviewed", "awaiting_signoff").valid && validateReviewTransition("awaiting_signoff", "risk_approved").valid;
  if (!t1 || !t2) errors.push("review/signoff state transitions are not native-valid");

  // Assessment preserved.
  if (PRODUCTION_ACTIVATION.assessmentMutated !== false) errors.push("assessment must not be mutated");
  if (PRODUCTION_ACTIVATION.aggregate !== 5.93) errors.push("aggregate must remain 5.93");
  if (PRODUCTION_ACTIVATION.universalMeetsMinimum !== false) errors.push("universal meetsMinimum must remain false");
  if (ASSESSMENT_BINDING.assessmentManifest !== "direct_assessment_54a11ba3") errors.push("assessment manifest binding drifted");
  if (ASSESSMENT_BINDING.evidencePackageManifest !== "risk_package_3711fd25") errors.push("evidence manifest binding drifted");
  if (ASSESSMENT_BINDING.authorityEvidenceManifest !== "authority_evidence_a99ace84") errors.push("authority manifest binding drifted");

  // Activation only when all three valid.
  if (PRODUCTION_ACTIVATION.allGatesComplete && (!REVIEWER_AUTHORIZATION.authorized || !SIGNER_AUTHORIZATION.authorized || !APPROVER_AUTHORIZATION.authorized))
    errors.push("activation must require all three authorizations");

  return { valid: errors.length === 0, errors };
}

export const GOVERNANCE_RECORDS_VALIDATION = validateGovernanceRecords();

function fnv(material: string, prefix: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `${prefix}_${h.toString(16).padStart(8, "0")}`;
}

export const HUMAN_REVIEW_MANIFEST_HASH = fnv(JSON.stringify({ id: HUMAN_REVIEW_RECORD.recordId, a: HUMAN_REVIEW_RECORD.assessmentManifest, r: HUMAN_REVIEW_RECORD.reviewerId, d: HUMAN_REVIEW_RECORD.decision, s: HUMAN_REVIEW_RECORD.reviewState, t: HUMAN_REVIEW_RECORD.reviewedAt }), "human_review");
export const RISK_SIGNOFF_MANIFEST_HASH = fnv(JSON.stringify({ id: RISK_SIGNOFF_RECORD.recordId, a: RISK_SIGNOFF_RECORD.assessmentManifest, r: RISK_SIGNOFF_RECORD.signerId, s: RISK_SIGNOFF_RECORD.signoffStatus, hr: RISK_SIGNOFF_RECORD.boundHumanReviewId, t: RISK_SIGNOFF_RECORD.signedOffAt }), "risk_signoff");
export const PRODUCT_APPROVAL_MANIFEST_HASH = fnv(JSON.stringify({ id: PRODUCT_APPROVAL_RECORD.recordId, a: PRODUCT_APPROVAL_RECORD.assessmentManifest, r: PRODUCT_APPROVAL_RECORD.approverId, s: PRODUCT_APPROVAL_RECORD.approvalStatus, so: PRODUCT_APPROVAL_RECORD.boundRiskSignoffId, t: PRODUCT_APPROVAL_RECORD.approvedAt }), "product_approval");
export const PRODUCTION_ACTIVATION_MANIFEST_HASH = fnv(JSON.stringify({ hr: HUMAN_REVIEW_MANIFEST_HASH, so: RISK_SIGNOFF_MANIFEST_HASH, ap: PRODUCT_APPROVAL_MANIFEST_HASH, e: PRODUCTION_ACTIVATION.productionSuggestionEligible, b: PRODUCTION_ACTIVATION.primaryBlockerAfter }), "production_activation");

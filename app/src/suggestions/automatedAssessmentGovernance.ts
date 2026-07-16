/**
 * automatedAssessmentGovernance — Step 16H-M.2.
 *
 * Records the product owner's explicit decision to permit an AUTHORIZED AUTOMATED RISK ASSESSOR
 * (including Claude) to assign evidence-based dimension scores and confidence values.
 *
 * WHAT THIS DOES NOT LOOSEN. Human review remains mandatory. Risk signoff remains human-only. Product
 * approval remains human-only and separate. An automated assessor may never review its own work, and
 * may never hold rubric_approver, risk_signoff_approver or product_approver. Those are the load-bearing
 * constraints, and they are enforced in code below rather than asserted in prose.
 *
 * SUPERSEDING, NOT MUTATING. Both prior policies stay in the repository, marked `superseded`, with
 * their original approval provenance intact. Editing an approved governance artifact in place would
 * destroy the record of what was approved and when — which is the whole point of versioning them.
 *
 * This module assigns no score. It defines who may.
 */
import type { RiskReviewConfidence } from "./riskReviewConfidencePolicy";
import { ALLOWED_CONFIDENCE_VALUES } from "./riskReviewConfidencePolicy";

/* ------------------------------------------------------------------ *
 * 1. Separation-of-duties policy v2
 * ------------------------------------------------------------------ */

export const SOD_POLICY_V1_ID = "risk_separation_of_duties_v1" as const;
export const SOD_POLICY_V2_ID = "risk_separation_of_duties_v2" as const;

/** The v1 policy, preserved. Its rule "only a human may assign dimension scores" is what v2 supersedes. */
export const SOD_POLICY_V1_RECORD = {
  policyId: SOD_POLICY_V1_ID,
  semver: "1.0.0",
  status: "superseded" as const,
  approvedBy: "ws_product_owner",
  approvedAt: "2026-07-16T12:33:58.794Z",
  supersededBy: `${SOD_POLICY_V2_ID}@1.0.0`,
  supersededAt: "2026-07-16T18:15:00.000Z",
  supersededReason: "Automated evidence-based scoring is now permitted. v1's human-only scoring rule no longer reflects approved governance. Retained, not deleted: it is the record of what was approved between 16H-K.1 and 16H-M.2.",
  originalRule: "Only an authorized human may assign dimension scores; automated agents may prepare evidence only.",
} as const;

export type AssessmentRole =
  | "evidence_preparer"
  | "automated_risk_assessor"
  | "human_risk_scorer"
  | "risk_reviewer"
  | "risk_signoff_approver"
  | "rubric_approver"
  | "product_approver";

export interface RoleResponsibility {
  role: AssessmentRole;
  actorKinds: ("human" | "automated_agent")[];
  may: string[];
  mayNot: string[];
}

export const SOD_POLICY_V2_ROLES: RoleResponsibility[] = [
  {
    role: "evidence_preparer",
    actorKinds: ["human", "automated_agent"],
    may: ["gather evidence", "structure evidence", "bind evidence to exact product identity"],
    mayNot: ["assign scores", "review", "sign off", "approve products", "alter evidence to justify a score"],
  },
  {
    role: "automated_risk_assessor",
    actorKinds: ["automated_agent"],
    may: ["assign dimension scores", "assign confidence", "provide rationale", "cite evidence", "submit a complete scoring record"],
    mayNot: [
      "review its own scores",
      "perform risk signoff",
      "approve products",
      "alter rubric rules",
      "alter evidence to justify a score",
      "act as rubric_approver",
      "act as risk_signoff_approver",
      "act as product_approver",
    ],
  },
  {
    role: "human_risk_scorer",
    actorKinds: ["human"],
    may: ["assign dimension scores manually", "assign confidence", "provide rationale", "cite evidence"],
    mayNot: ["sign off own scores without a separate signoff act", "approve products"],
  },
  {
    role: "risk_reviewer",
    actorKinds: ["human"],
    may: [
      "review an automated assessment",
      "accept it",
      "reject it",
      "request changes",
      "override an individual score through an explicit recorded human decision",
    ],
    mayNot: ["silently replace an automated score — the original must be preserved", "sign off without a separate signoff act", "approve the product"],
  },
  { role: "risk_signoff_approver", actorKinds: ["human"], may: ["perform the separate final risk decision"], mayNot: ["approve the product — that is a separate act", "sign off an assessment they authored as the automated assessor (impossible: the assessor is not human)"] },
  { role: "rubric_approver", actorKinds: ["human"], may: ["approve a rubric version"], mayNot: ["be an automated agent"] },
  { role: "product_approver", actorKinds: ["human"], may: ["perform the separate product-approval decision"], mayNot: ["be an automated agent", "treat risk signoff as approval"] },
];

export const SOD_POLICY_V2 = {
  policyId: SOD_POLICY_V2_ID,
  semver: "1.0.0",
  status: "approved" as const,
  approvedBy: "ws_product_owner",
  approverDisplayLabel: "Ashot Gyulzatyan",
  approvedAt: "2026-07-16T18:15:00.000Z",
  supersedes: `${SOD_POLICY_V1_ID}@1.0.0`,
  rationale:
    "Automated evidence-based scoring is permitted, while human review, human risk signoff, and separate human product approval remain mandatory.",
  approvalEvidence: "Explicit product-owner governance decision recorded in the Step 16H-M.2 task instruction.",
  roles: SOD_POLICY_V2_ROLES,
  humanReviewMandatory: true,
  riskSignoffHumanOnly: true,
  productApprovalHumanOnly: true,
  automatedMayReviewOwnWork: false,
  internalOnly: true,
} as const;

/** Roles an automated agent may NEVER hold. Enforced, not just documented. */
export const HUMAN_ONLY_ROLES: AssessmentRole[] = ["human_risk_scorer", "risk_reviewer", "risk_signoff_approver", "rubric_approver", "product_approver"];

/* ------------------------------------------------------------------ *
 * 2. Confidence policy v2
 * ------------------------------------------------------------------ */

export const CONFIDENCE_POLICY_V1_ID = "risk_review_confidence_v1" as const;
export const CONFIDENCE_POLICY_V2_ID = "risk_review_confidence_v2" as const;
export const CONFIDENCE_POLICY_V2_REFERENCE = "risk_review_confidence_v2@1.0.0" as const;

export const CONFIDENCE_POLICY_V1_RECORD = {
  policyId: CONFIDENCE_POLICY_V1_ID,
  semver: "1.0.0",
  status: "superseded" as const,
  approvedBy: "ws_product_owner",
  approvedAt: "2026-07-16T17:58:00.000Z",
  supersededBy: CONFIDENCE_POLICY_V2_REFERENCE,
  supersededAt: "2026-07-16T18:15:00.000Z",
  supersededReason: "v1 prohibited automated agents from selecting confidence. v2 changes ONLY that actor rule. Retained, not mutated.",
  originalActorRule: "Automated agents may not select or prefill a confidence value.",
} as const;

/**
 * v2 preserves everything about v1 except the actor rule. The enum, the absence of numeric mapping, the
 * zero aggregation weight, the inability to modify a score, and the internal-only boundary are all
 * carried forward UNCHANGED — v2 exists to move one line, not to reopen the policy.
 */
export const CONFIDENCE_POLICY_V2 = {
  policyId: CONFIDENCE_POLICY_V2_ID,
  semver: "1.0.0",
  status: "approved" as const,
  approvedBy: "ws_product_owner",
  approverDisplayLabel: "Ashot Gyulzatyan",
  approvedAt: "2026-07-16T18:15:00.000Z",
  supersedes: `${CONFIDENCE_POLICY_V1_ID}@1.0.0`,
  appliesTo: "protocol_risk_rubric_v1@1.0.0 scoring records",
  /** Carried forward from v1, unchanged. */
  allowedValues: ALLOWED_CONFIDENCE_VALUES,
  hasNumericMapping: false,
  hasWeight: false,
  entersAggregation: false,
  modifiesScore: false,
  canOverrideMandatoryBlocker: false,
  internalOnly: true,
  /** The ONLY change. */
  changedRule: "An authorized automated risk assessor may assign confidence as part of an automated assessment.",
  automatedAssessorMayAssignConfidence: true,
  rules: [
    "Confidence must describe confidence in the EVIDENCE supporting the chosen score — never product safety, score magnitude, or loss probability.",
    "Low confidence may NOT be used to submit a guess when evidence is insufficient.",
    "If evidence is insufficient to select an anchor, no score may be submitted at all.",
    "A human reviewer may later accept or challenge the confidence value.",
    "Confidence still has no numeric mapping, no weight, and never enters aggregation.",
  ],
  rubricUnchanged: { rubricId: "protocol_risk_rubric_v1", semver: "1.0.0" },
} as const;

/* ------------------------------------------------------------------ *
 * 3. Automated assessor registry
 * ------------------------------------------------------------------ */

export interface AutomatedAssessorRecord {
  actorId: string;
  /** NEVER "human". An automated actor must not be representable as a person. */
  actorType: "automated_agent";
  role: "automated_risk_assessor";
  provider: string;
  executionEnvironment: string;
  status: "active" | "inactive" | "revoked";
  authorizedScopes: string[];
  authorizedBy: string;
  authorizedAt: string;
  authorizationEvidence: string;
  displayLabel: string;
  notes: string[];
}

/**
 * One authorized automated actor, per the product owner's decision.
 *
 * NOTE ON MODEL IDENTITY: the actor record deliberately does NOT pin a model version. The actor is the
 * authorized ROLE-HOLDER; the model that actually ran is a property of each individual assessment and
 * is captured there (`AutomatedAssessmentProvenance.modelIdentifier`). Pinning a model here would
 * require re-authorizing the actor on every model change, and would silently misattribute past
 * assessments after an upgrade.
 */
const AUTOMATED_ASSESSORS: AutomatedAssessorRecord[] = [
  {
    actorId: "ws_automated_risk_assessor",
    actorType: "automated_agent",
    role: "automated_risk_assessor",
    provider: "Anthropic",
    executionEnvironment: "Claude Code",
    status: "active",
    authorizedScopes: ["solana_staking", "stable_yield", "wealthsmith_mvp"],
    authorizedBy: "ws_product_owner",
    authorizedAt: "2026-07-16T18:15:00.000Z",
    authorizationEvidence: "Explicit product-owner decision recorded in the Step 16H-M.2 task instruction.",
    displayLabel: "WealthSmith Automated Risk Assessor (automated agent — NOT a person)",
    notes: [
      "This actor is SOFTWARE. It must never be presented as a human reviewer, and its assessment is never a human risk signoff.",
      "It may score and assign confidence. It may NOT review its own assessment, sign off risk, or approve a product.",
      "This record is INTERNAL. It must never surface on a user-facing surface.",
    ],
  },
];

export type AssessorRejectionReason =
  | "automated_assessor_missing"
  | "automated_assessor_unauthorized"
  | "automated_assessor_out_of_scope"
  | "automated_assessor_inactive"
  | "automated_assessor_role_forbidden";

export interface AssessorAuthorizationResult {
  authorized: boolean;
  reason?: AssessorRejectionReason;
  detail?: string;
}

/**
 * Ordering matters. The forbidden-role check runs BEFORE the scope check so that an assessor
 * attempting to sign off is rejected as role-forbidden regardless of scope — the reason a caller sees
 * should be the real one.
 */
export function authorizeAutomatedAssessor(args: {
  actorId?: string;
  role: AssessmentRole;
  scope?: string;
  registry?: AutomatedAssessorRecord[];
}): AssessorAuthorizationResult {
  const registry = args.registry ?? AUTOMATED_ASSESSORS;
  if (!args.actorId) return { authorized: false, reason: "automated_assessor_missing", detail: "no actorId supplied" };
  const a = registry.find((x) => x.actorId === args.actorId);
  if (!a) return { authorized: false, reason: "automated_assessor_missing", detail: `no record for '${args.actorId}'` };

  if (HUMAN_ONLY_ROLES.includes(args.role)) {
    return { authorized: false, reason: "automated_assessor_role_forbidden", detail: `'${args.role}' is human-only; an automated agent may never hold it` };
  }
  if (args.role !== "automated_risk_assessor" && args.role !== "evidence_preparer") {
    return { authorized: false, reason: "automated_assessor_unauthorized", detail: `role '${args.role}' is not granted to automated actors` };
  }
  if (a.status !== "active") return { authorized: false, reason: "automated_assessor_inactive", detail: `status is ${a.status}` };
  if (args.role === "automated_risk_assessor" && a.role !== "automated_risk_assessor") {
    return { authorized: false, reason: "automated_assessor_unauthorized", detail: "actor does not hold the automated_risk_assessor role" };
  }
  if (args.scope && !a.authorizedScopes.includes(args.scope)) {
    return { authorized: false, reason: "automated_assessor_out_of_scope", detail: `'${args.scope}' not in [${a.authorizedScopes.join(", ")}]` };
  }
  return { authorized: true };
}

export function getAutomatedAssessor(actorId: string): AutomatedAssessorRecord | undefined {
  return AUTOMATED_ASSESSORS.find((a) => a.actorId === actorId);
}

export function listAutomatedAssessors(): AutomatedAssessorRecord[] {
  return AUTOMATED_ASSESSORS.map((a) => ({ ...a }));
}

/** Confidence validation under v2 — identical to v1 except an authorized automated assessor is allowed. */
export function validateConfidenceUnderV2(i: { score: number | null; confidence: unknown; actorKind: "human" | "automated_agent"; actorAuthorizedAsAssessor: boolean }): { valid: boolean; reason?: string } {
  const scoreSubmitted = i.score !== null && i.score !== undefined;
  if (!scoreSubmitted) {
    if (i.confidence === null || i.confidence === undefined) return { valid: true };
    return { valid: false, reason: "confidence_present_without_score" };
  }
  if (i.actorKind === "automated_agent" && !i.actorAuthorizedAsAssessor) {
    return { valid: false, reason: "automated_assessor_unauthorized" };
  }
  if (i.confidence === null || i.confidence === undefined || i.confidence === "") return { valid: false, reason: "automated_score_missing_confidence" };
  if (typeof i.confidence === "number") return { valid: false, reason: "confidence_numeric" };
  if (typeof i.confidence !== "string") return { valid: false, reason: "confidence_value_unknown" };
  if (/%/.test(i.confidence)) return { valid: false, reason: "confidence_percentage" };
  if (/^\s*\d+(\.\d+)?\s*$/.test(i.confidence)) return { valid: false, reason: "confidence_numeric" };
  if (!(ALLOWED_CONFIDENCE_VALUES as readonly string[]).includes(i.confidence)) return { valid: false, reason: "confidence_outside_enum" };
  return { valid: true };
}

/* ------------------------------------------------------------------ *
 * 4. Diagnostics
 * ------------------------------------------------------------------ */

export type AutomatedAssessmentDiagnostic =
  | "automated_assessor_missing"
  | "automated_assessor_unauthorized"
  | "automated_assessor_out_of_scope"
  | "automated_assessment_invalid"
  | "automated_assessment_incomplete"
  | "automated_score_anchor_mismatch"
  | "automated_score_missing_rationale"
  | "automated_score_missing_confidence"
  | "automated_score_missing_evidence"
  | "automated_assessment_requires_human_review"
  | "human_review_pending"
  | "automated_assessment_invalidated";

export const AUTOMATED_ASSESSMENT_DIAGNOSTICS: AutomatedAssessmentDiagnostic[] = [
  "automated_assessor_missing",
  "automated_assessor_unauthorized",
  "automated_assessor_out_of_scope",
  "automated_assessment_invalid",
  "automated_assessment_incomplete",
  "automated_score_anchor_mismatch",
  "automated_score_missing_rationale",
  "automated_score_missing_confidence",
  "automated_score_missing_evidence",
  "automated_assessment_requires_human_review",
  "human_review_pending",
  "automated_assessment_invalidated",
];

/** SOL staking compatibility — stated once, asserted by fixture. */
export const SOL_STAKING_COMPATIBILITY = {
  existingStakingScoresChanged: false,
  automaticMigrationOccurs: false,
  selectorOrderingChanged: false,
  note: "This policy formalizes automated scoring for FUTURE assessments. Existing SOL staking scores are untouched and no automatic migration occurs. A future v1 rescoring may use the automated-assessment policy, but that would be a separate, explicitly recorded act.",
} as const;

export type { RiskReviewConfidence };

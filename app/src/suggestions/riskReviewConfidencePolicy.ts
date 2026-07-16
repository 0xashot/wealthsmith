/**
 * riskReviewConfidencePolicy — the canonical Risk Review Confidence Policy v1.
 *
 * WHY THIS EXISTS AS A SEPARATE FILE. Protocol Risk Rubric v1.0.0 mandates a confidence value per
 * dimension (`requiresConfidence: true`) but never defined the allowed values. Step 16H-M surfaced
 * that gap rather than inventing an enum, because pinning one is a human governance decision. The
 * WealthSmith product owner has now made it.
 *
 * IT IS DELIBERATELY NOT A RUBRIC AMENDMENT. Bumping the rubric to v1.0.1 for this would invalidate
 * the recorded rubric hash and the human approval provenance attached to v1.0.0 — for a clarification
 * that changes no dimension, weight, anchor, aggregation rule, threshold or blocker. So confidence is
 * a SEPARATELY VERSIONED GOVERNANCE DEPENDENCY that scoring packets, score submissions, worksheet
 * validation and review provenance reference by ID. The approved rubric remains
 * protocol_risk_rubric_v1 @ 1.0.0, untouched.
 *
 * THE ONE THING TO UNDERSTAND: confidence describes confidence in the EVIDENCE supporting a chosen
 * score. It is not a second score, not a risk measure, and not an opinion about the product. It never
 * enters aggregation, has no numeric mapping, and cannot move a score in either direction. A reviewer
 * who is very confident that the evidence supports a low score records `high`.
 *
 * This module assigns no score, prefills no confidence, and transitions no lifecycle.
 */

export const RISK_REVIEW_CONFIDENCE_POLICY_ID = "risk_review_confidence_v1" as const;
export const RISK_REVIEW_CONFIDENCE_POLICY_VERSION = "1.0.0" as const;

/* ------------------------------------------------------------------ *
 * 1. Policy identity + approval provenance
 * ------------------------------------------------------------------ */

/**
 * TRANSCRIBED from the product owner's explicit decision. Claude did not infer this, did not choose
 * the values, and is not a party to it. Claude surfaced the gap; a human closed it.
 */
export const RISK_REVIEW_CONFIDENCE_POLICY = {
  policyId: RISK_REVIEW_CONFIDENCE_POLICY_ID,
  semver: RISK_REVIEW_CONFIDENCE_POLICY_VERSION,
  status: "approved" as const,
  approvedBy: "ws_product_owner",
  approverDisplayLabel: "Ashot Gyulzatyan",
  approvedAt: "2026-07-16T17:58:00.000Z",
  appliesTo: "protocol_risk_rubric_v1@1.0.0 scoring records",
  /** The rubric is a DEPENDENT, not a parent. This policy does not modify it. */
  rubricUnchanged: { rubricId: "protocol_risk_rubric_v1", semver: "1.0.0" },
  approvalEvidence:
    "Explicit product-owner governance decision recorded in the Step 16H-M confidence-policy task instruction, closing the open governance item that 16H-M surfaced (rubric v1.0.0 mandates confidence but defines no enum).",
  internalOnly: true,
} as const;

/* ------------------------------------------------------------------ *
 * 2. The enum + canonical definitions
 * ------------------------------------------------------------------ */

export type RiskReviewConfidence = "high" | "medium" | "low";

/** The complete allowed set. No other value is valid — including numbers, percentages and "none". */
export const ALLOWED_CONFIDENCE_VALUES: readonly RiskReviewConfidence[] = ["high", "medium", "low"] as const;

export interface ConfidenceDefinition {
  value: RiskReviewConfidence;
  useWhen: string[];
}

/**
 * Canonical definitions, transcribed verbatim in substance from the product owner's decision.
 *
 * Read them as a ladder of EVIDENCE QUALITY, not of product quality. Note that all three describe
 * situations in which a score CAN be chosen — even `low`. The case where a score cannot be chosen is
 * not a confidence value at all; it is `CONFIDENCE_RULES.insufficientEvidenceMeansNoSubmission`.
 */
export const CONFIDENCE_DEFINITIONS: ConfidenceDefinition[] = [
  {
    value: "high",
    useWhen: [
      "evidence is directly bound to the exact product, program, reserve, or deployment",
      "sources are authoritative and current",
      "the relevant behavior is verified from deployed source or exact on-chain state",
      "important contradictions are resolved",
      "remaining uncertainty is minor and unlikely to materially change the chosen score",
    ],
  },
  {
    value: "medium",
    useWhen: [
      "evidence is sufficient to choose a score",
      "important facts are verified",
      "some scope, freshness, provenance, operational, or historical limitations remain",
      "the uncertainty is bounded and explicitly documented",
      "additional evidence could reasonably change the score, but scoring is still defensible",
    ],
  },
  {
    value: "low",
    useWhen: [
      "evidence is sufficient for human scoring only because uncertainty is explicitly bounded",
      "evidence is partial, indirect, limited in scope, historically incomplete, or dependent on unresolved operational facts",
      "the score is defensible but could materially change if missing evidence becomes available",
    ],
  },
];

/* ------------------------------------------------------------------ *
 * 3. Meaning + restrictions
 * ------------------------------------------------------------------ */

export const CONFIDENCE_MEANING = {
  describes: "confidence in the evidence supporting the selected dimension score",
  doesNotDescribe: [
    "whether the product is safe",
    "whether the score is high or low",
    "whether the product should pass",
    "whether the reviewer likes the product",
    "probability of loss",
    "severity of risk",
  ],
  note: "A reviewer who is certain the evidence supports a LOW score records HIGH confidence. Confidence and score are orthogonal axes; conflating them would double-count the same judgement.",
} as const;

/**
 * The rules, stated as data so fixtures can assert them rather than trusting prose.
 *
 * The load-bearing pair is `highCannotIncreaseScore` / `lowCannotDecreaseScore`: confidence must never
 * become a back-door score modifier. If it could nudge a score, a reviewer's uncertainty would silently
 * change the product's suitability — which is exactly the coupling this policy forbids.
 */
export const CONFIDENCE_RULES = {
  exactlyOneValuePerSubmittedScore: true,
  cannotReplaceRationale: true,
  cannotReplaceEvidenceReferences: true,
  highCannotIncreaseScore: true,
  lowCannotDecreaseScoreAutomatically: true,
  hasNumericMapping: false,
  hasWeight: false,
  entersAggregation: false,
  canOverrideMandatoryBlocker: false,
  canMakeIncompleteEvidenceComplete: false,
  insufficientEvidenceMeansNoSubmission: true,
  automatedAgentsMayPrefill: false,
  internalOnly: true,
  notes: [
    "If evidence is insufficient to choose a score, the scorer must NOT submit a score. `low` is for a defensible score under bounded uncertainty — it is not a way to submit a guess.",
    "Confidence is required only WHEN a score is submitted. A blank packet legitimately carries null confidence.",
    "Automated agents (including Claude) may never select or prefill a confidence value. Preparing a packet with null confidence is assembly; choosing a value is judgement.",
  ],
} as const;

/* ------------------------------------------------------------------ *
 * 4. Validation
 * ------------------------------------------------------------------ */

export type ConfidenceRejectionReason =
  | "confidence_missing_on_submitted_score"
  | "confidence_value_unknown"
  | "confidence_numeric"
  | "confidence_percentage"
  | "confidence_outside_enum"
  | "confidence_selected_by_automated_agent"
  | "confidence_present_without_score";

export interface ConfidenceSubmissionInputs {
  /** null means "no score submitted" — a blank packet row. */
  score: number | null;
  confidence: unknown;
  actorKind: "human" | "automated_agent";
}

export interface ConfidenceValidationResult {
  valid: boolean;
  reason?: ConfidenceRejectionReason;
  detail?: string;
}

/** Pure and deterministic. Rejects before inspecting the value, so a valid-looking value from a bot still fails. */
export function validateConfidenceSubmission(i: ConfidenceSubmissionInputs): ConfidenceValidationResult {
  const scoreSubmitted = i.score !== null && i.score !== undefined;

  // A blank row is legitimate: confidence is required only when a score is submitted.
  if (!scoreSubmitted) {
    if (i.confidence === null || i.confidence === undefined) return { valid: true };
    return { valid: false, reason: "confidence_present_without_score", detail: "confidence without a score is meaningless — it would describe evidence for a judgement nobody made" };
  }

  if (i.actorKind === "automated_agent") {
    return { valid: false, reason: "confidence_selected_by_automated_agent", detail: "automated agents may not select or prefill confidence" };
  }
  if (i.confidence === null || i.confidence === undefined || i.confidence === "") {
    return { valid: false, reason: "confidence_missing_on_submitted_score", detail: "every submitted dimension score requires exactly one confidence value" };
  }
  if (typeof i.confidence === "number") {
    return { valid: false, reason: "confidence_numeric", detail: "confidence has no numeric mapping" };
  }
  if (typeof i.confidence !== "string") {
    return { valid: false, reason: "confidence_value_unknown", detail: `unsupported type ${typeof i.confidence}` };
  }
  if (/^\s*\d+(\.\d+)?\s*%\s*$/.test(i.confidence) || /%/.test(i.confidence)) {
    return { valid: false, reason: "confidence_percentage", detail: "confidence is not a percentage" };
  }
  if (/^\s*\d+(\.\d+)?\s*$/.test(i.confidence)) {
    return { valid: false, reason: "confidence_numeric", detail: "a numeric string is still numeric" };
  }
  if (!(ALLOWED_CONFIDENCE_VALUES as readonly string[]).includes(i.confidence)) {
    return { valid: false, reason: "confidence_outside_enum", detail: `'${i.confidence}' is not one of: ${ALLOWED_CONFIDENCE_VALUES.join(" | ")}` };
  }
  return { valid: true };
}

/** Type guard for callers that only need the enum check. */
export function isRiskReviewConfidence(v: unknown): v is RiskReviewConfidence {
  return typeof v === "string" && (ALLOWED_CONFIDENCE_VALUES as readonly string[]).includes(v);
}

/* ------------------------------------------------------------------ *
 * 5. Aggregation + exposure boundaries
 * ------------------------------------------------------------------ */

/**
 * Confidence is INERT in aggregation, and this function exists to make that a tested fact rather than
 * an absence someone might later "fix". It takes a confidence value and returns the aggregate
 * unchanged — by construction, not by convention.
 */
export function applyConfidenceToAggregate(aggregate: number, _confidence: RiskReviewConfidence): number {
  return aggregate;
}

export const CONFIDENCE_AGGREGATION_BEHAVIOR = {
  entersAggregation: false,
  hasWeight: false,
  hasNumericMapping: false,
  modifiesScore: false,
  modifiesBlockerBehavior: false,
  modifiesEligibility: false,
  note: "Confidence is metadata ON a score, never an input TO one. The aggregate of a set of scores is identical for every confidence assignment.",
} as const;

/** Surfaces confidence must never reach. Mirrors riskScoreExposurePolicy's forbidden surfaces. */
export const CONFIDENCE_FORBIDDEN_SURFACES = [
  "suggestion cards",
  "review modals or drawers",
  "dashboard surfaces",
  "portfolio pages",
  "user-facing protocol details",
  "Smith AI responses",
  "Qdrant-generated answers",
  "public documentation",
  "analytics events",
  "customer-facing APIs",
] as const;

export const CONFIDENCE_EXPOSURE_POLICY = {
  internalOnly: true,
  userFacingConfidenceExists: false,
  forbiddenSurfaces: CONFIDENCE_FORBIDDEN_SURFACES,
  reason:
    "Confidence is a component of the internal Risk Suitability Score record. Exposing it would leak ordinal information about an internal scoring process — and would invite users to read it as a safety signal, which it explicitly is not.",
} as const;

/** The reference scoring packets, submissions, worksheets and provenance records cite. */
export const CONFIDENCE_POLICY_REFERENCE = `${RISK_REVIEW_CONFIDENCE_POLICY_ID}@${RISK_REVIEW_CONFIDENCE_POLICY_VERSION}` as const;

/** Exported so a fixture can assert this policy changed nothing it was forbidden to change. */
export const CONFIDENCE_POLICY_CONFERS = {
  rubricModified: false,
  rubricVersionChanged: false,
  dimensionsChanged: false,
  weightsChanged: false,
  anchorsChanged: false,
  aggregationChanged: false,
  thresholdChanged: false,
  blockerRulesChanged: false,
  evidenceChanged: false,
  anyScoreAssigned: false,
  anyConfidencePrefilled: false,
  lifecycleTransitioned: false,
  productApproved: false,
  note: "A clarification of a field's allowed values. It defines a vocabulary and nothing else.",
} as const;

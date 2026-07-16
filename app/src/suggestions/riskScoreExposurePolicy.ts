/**
 * riskScoreExposurePolicy — Step 16H-K.1. The INTERNAL-ONLY boundary for the Risk Suitability Score.
 *
 * THE DECISION (WealthSmith product owner): the numeric risk result is an internal **Risk Suitability
 * Score**. It exists for deterministic eligibility, product comparison, risk governance, approval
 * workflows, diagnostics, and auditability. It is NOT a user feature and must never reach a user.
 *
 * SEMANTICS — note the direction, because the legacy field name misleads:
 *
 *   `riskScore` is a legacy internal field name, preserved because renaming it would ripple through
 *   `protocolEligibility`, `YieldStrategyRiskReview`, the staking modules and their fixtures. Despite
 *   the name, **higher = STRONGER evidence-supported suitability**, not higher risk. `MIN_PROTOCOL_RISK_SCORE = 7`
 *   is a FLOOR. Read it as "suitability score", not "how risky is this".
 *
 * WHAT USERS GET INSTEAD: approved qualitative disclosures derived from reviewed evidence — "the
 * strategy is managed", "the program is upgradeable", "withdrawals may depend on underlying liquidity".
 * These describe mechanics a user can act on. They deliberately carry no ordinal information, so no
 * combination of them lets anyone reconstruct a number, a band, or a ranking.
 *
 * This module is pure and has no dependencies on scoring internals — it exists to NAME the boundary and
 * to give the fixtures something concrete to enforce.
 */

export const RISK_SCORE_INTERNAL_ONLY_POLICY_EXISTS = true;
export const RISK_SCORE_USER_FACING_SUPPRESSION_EXISTS = true;
/** There is no user-facing numeric risk score, and there is no plan for one. */
export const USER_FACING_NUMERIC_RISK_SCORE_EXISTS = false;

/** The internal name for the numeric result. Use this in governance prose; never show it to a user. */
export const RISK_SUITABILITY_SCORE_LABEL = "Risk Suitability Score (internal)" as const;

/**
 * KNOWN LIMITATION — client-side eligibility (Step 16H-K.2). Recorded, not hidden.
 *
 * Eligibility is computed in the browser today, so internal values can exist in the application source
 * and in shipped bundles. Anyone determined enough to read a bundle can find them.
 *
 * That is ACCEPTED, because the product requirement is presentation and contract suppression — the
 * score must not appear on a user-facing surface or in a public contract — NOT cryptographic secrecy.
 * A user must never be shown, or handed, a number that ranks products; they get qualitative
 * disclosures. Nothing about the read-only MVP depends on the number being unknowable.
 *
 * Genuine confidentiality would require moving eligibility behind a server-side boundary, so the client
 * receives only decisions and never the inputs. That migration is NOT required for the read-only MVP
 * and is NOT a release blocker. It becomes worth revisiting if the score ever gains commercial
 * sensitivity, or if a public API would otherwise have to expose it.
 */
export const RISK_SCORE_CLIENT_SIDE_LIMITATION = {
  eligibilityComputedClientSide: true,
  internalValuesMayExistInBundles: true,
  requirementIsPresentationSuppression: true,
  requirementIsCryptographicSecrecy: false,
  serverSideBoundaryRequiredForMvp: false,
  isReleaseBlocker: false,
  note: "Presentation and contract suppression is the requirement; the internal score is not treated as a secret. A server-side eligibility boundary is the future option if that ever changes.",
} as const;

/** Where the score MAY be used. */
export const RISK_SCORE_PERMITTED_USES = [
  "deterministic product eligibility",
  "product comparison",
  "risk governance",
  "approval workflows",
  "internal diagnostics",
  "internal auditability",
] as const;

/** Surfaces the score must NEVER reach. */
export const RISK_SCORE_FORBIDDEN_SURFACES = [
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

/**
 * Fields that must never appear in a user-facing contract, and which the exposure scan hunts for.
 * Reconstruction matters as much as direct exposure: publishing weights + dimension scores would let
 * anyone recompute the aggregate, so the components are as forbidden as the total.
 */
export const RISK_SCORE_FORBIDDEN_FIELDS = [
  "riskScore",
  "riskSuitabilityScore",
  "dimensionScores",
  "dimensionWeights",
  "weightedScore",
  "riskBand",
  "reviewerConfidence",
  "minimumRiskScore",
  "mandatoryBlockerCodes",
  "riskDiagnosticCode",
  "reviewerNotes",
] as const;

/**
 * The APPROVED qualitative disclosure vocabulary. Each entry is a plain-language mechanic derived from
 * reviewed evidence. None of them is ordinal, graded, or comparative — that is deliberate.
 */
export type QualitativeRiskDisclosureId =
  | "strategy_is_managed"
  | "protocol_and_smart_contract_risk"
  | "program_is_upgradeable"
  | "withdrawals_depend_on_liquidity"
  | "yield_may_change"
  | "not_passed_required_review";

export interface QualitativeRiskDisclosure {
  id: QualitativeRiskDisclosureId;
  /** User-facing copy. Contains no number, band, threshold, or comparative claim. */
  text: string;
  /** The kind of reviewed evidence this is derived from. NOT a score, and never a score's proxy. */
  derivedFrom: string;
}

export const QUALITATIVE_RISK_DISCLOSURES: QualitativeRiskDisclosure[] = [
  { id: "strategy_is_managed", text: "This strategy is actively managed. The manager can change how funds are allocated.", derivedFrom: "reviewed manager/allocation-authority evidence" },
  { id: "protocol_and_smart_contract_risk", text: "This strategy may involve protocol and smart-contract risk.", derivedFrom: "reviewed audit and contract evidence" },
  { id: "program_is_upgradeable", text: "The underlying program can be upgraded by its maintainers.", derivedFrom: "reviewed upgrade-authority evidence" },
  { id: "withdrawals_depend_on_liquidity", text: "Withdrawals may depend on available liquidity in the underlying strategy.", derivedFrom: "reviewed withdrawal-model evidence" },
  { id: "yield_may_change", text: "Yield rates can change over time.", derivedFrom: "reviewed market-data evidence" },
  { id: "not_passed_required_review", text: "This product has not passed a required review and is not available.", derivedFrom: "risk-review state (the STATE, never the score)" },
];

/**
 * Assert a disclosure leaks nothing ordinal. A disclosure that contained a digit, a band name, or a
 * comparative would be a score in disguise — which is precisely what the policy forbids.
 */
export function disclosureLeaksNumericSignal(d: QualitativeRiskDisclosure): boolean {
  const banned = /\d|\bscore\b|\bband\b|\brating\b|\brank\b|\bout of\b|\b(low|medium|high|higher|lower|safer|riskier|best|worst)\b/i;
  return banned.test(d.text);
}

/** The full approved disclosure set, for a UI layer to render. Copy only — no numbers, ever. */
export function listQualitativeRiskDisclosures(): QualitativeRiskDisclosure[] {
  return QUALITATIVE_RISK_DISCLOSURES.map((d) => ({ ...d }));
}

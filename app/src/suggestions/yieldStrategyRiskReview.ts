/**
 * yieldStrategyRiskReview — Step 16D. The static, versioned product RISK-REVIEW contract + validators.
 * The registry (16B) stays identity-only and the market snapshot (16C) stays live-data-only; reviewed
 * STRUCTURAL + OPERATIONAL risk (operational status, exposure, custody, audit, leverage, risk tier /
 * score, user-risk compatibility) belongs here.
 *
 * HARD RULES: a review's exact strategyId/protocolId/address MUST match the registry; a review NEVER
 * approves a `documentation_required` (or any non-approved) registry entry; `reviewStatus: "approved"`
 * does NOT override the registry lifecycle; a risk score is only meaningful against the canonical
 * documented threshold (`MIN_PROTOCOL_RISK_SCORE`); no audit link / review date / address is invented;
 * and NO production risk review exists for a currently-undocumented product (synthetic reviews live only
 * in fixtures). It compares nothing, selects no leader, calculates no amount, and enables no execution.
 */
import {
  YIELD_STRATEGY_RISK_REVIEW_POLICY_ID,
  YIELD_STRATEGY_RISK_REVIEW_POLICY_VERSION,
  YIELD_STRATEGY_RISK_REVIEW_SCHEMA_VERSION,
  type YieldStrategyEligibilityValidationResult,
  type YieldStrategyRiskReview,
} from "./yieldStrategyEligibilityTypes";
import { getYieldStrategy } from "./yieldStrategyRegistry";
import { RECOGNIZED_PROFILE_RISK_IDS } from "./contributionTargetSuitability";

export const YIELD_STRATEGY_RISK_REVIEW_EXISTS = true;

/**
 * PRODUCTION risk reviews. Deliberately EMPTY: no 16B product is `approved` with a documented address,
 * so no production review may exist (a review must not approve an undocumented product). Synthetic
 * reviews for the "when approved" path live only in fixtures — they never touch this array.
 */
const RISK_REVIEWS: YieldStrategyRiskReview[] = [];

const clone = (r: YieldStrategyRiskReview): YieldStrategyRiskReview => JSON.parse(JSON.stringify(r));

/* ------------------------------------------------------------------ *
 * Read-only accessors.
 * ------------------------------------------------------------------ */
export function listYieldStrategyRiskReviews(): YieldStrategyRiskReview[] {
  return RISK_REVIEWS.map(clone);
}
export function getYieldStrategyRiskReview(strategyId: string): YieldStrategyRiskReview | undefined {
  const r = RISK_REVIEWS.find((x) => x.strategyId === strategyId);
  return r ? clone(r) : undefined;
}

const REVIEW_STATUSES = new Set(["approved", "conditional", "rejected", "expired", "incomplete"]);
const OPERATIONAL_STATUSES = new Set(["active", "paused", "deprecated", "disabled", "unknown"]);
const EXPOSURES = new Set(["usdc_only", "stablecoin_pair", "stable_basket", "mixed_asset", "unknown"]);
const CUSTODY = new Set(["non_custodial", "custodial", "hybrid", "unknown"]);
const AUDIT = new Set(["verified", "partial", "none", "unknown"]);
const RISK_TIERS = new Set(["conservative", "moderate", "elevated", "unknown"]);

const isIso = (s: unknown): boolean => typeof s === "string" && s.length > 0 && !Number.isNaN(Date.parse(s));

/* ------------------------------------------------------------------ *
 * Validation (fails closed). Registry identity is verified against the live registry.
 * ------------------------------------------------------------------ */
export interface ValidateRiskReviewOptions {
  /** When provided, expiry is checked against this instant (an expired review fails as "current"). */
  checkedAt?: string;
}

/** Validate one risk review. Fails closed; verifies exact registry identity + address. */
export function validateYieldStrategyRiskReview(review: unknown, options: ValidateRiskReviewOptions = {}): YieldStrategyEligibilityValidationResult {
  const errors: string[] = [];
  if (!review || typeof review !== "object") return { valid: false, errors: ["review_not_an_object"] };
  const r = review as YieldStrategyRiskReview;

  if (r.schemaVersion !== YIELD_STRATEGY_RISK_REVIEW_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (r.policyId !== YIELD_STRATEGY_RISK_REVIEW_POLICY_ID) errors.push("wrong_policy_id");
  if (r.policyVersion !== YIELD_STRATEGY_RISK_REVIEW_POLICY_VERSION) errors.push("wrong_policy_version");
  if (!r.reviewId || typeof r.reviewId !== "string") errors.push("missing_review_id");
  if (!r.reviewVersion || typeof r.reviewVersion !== "string") errors.push("missing_review_version");
  if (!r.strategyId) errors.push("missing_strategy_id");
  if (!r.address || typeof r.address !== "string") errors.push("missing_address");

  // Enum sanity.
  if (!REVIEW_STATUSES.has(r.reviewStatus)) errors.push("invalid_review_status");
  if (!OPERATIONAL_STATUSES.has(r.operationalStatus)) errors.push("invalid_operational_status");
  if (!EXPOSURES.has(r.resultingExposure)) errors.push("invalid_resulting_exposure");
  if (!CUSTODY.has(r.custodyModel)) errors.push("invalid_custody_model");
  if (!AUDIT.has(r.auditStatus)) errors.push("invalid_audit_status");
  if (!RISK_TIERS.has(r.smartContractRiskTier)) errors.push("invalid_risk_tier");
  if (!(r.leverageUsed === true || r.leverageUsed === false || r.leverageUsed === "unknown")) errors.push("invalid_leverage_value");

  // Dates.
  if (!isIso(r.reviewedAt)) errors.push("invalid_reviewed_at");
  if (r.validUntil !== undefined && !isIso(r.validUntil)) errors.push("invalid_valid_until");
  // An expired review must not be presented as current.
  if (options.checkedAt && isIso(options.checkedAt) && r.validUntil && isIso(r.validUntil)) {
    if (Date.parse(r.validUntil) < Date.parse(options.checkedAt)) errors.push("review_expired");
  }

  // User risk profile ids must be the canonical onboarding ids.
  if (!Array.isArray(r.compatibleUserRiskProfileIds) || r.compatibleUserRiskProfileIds.some((id) => !RECOGNIZED_PROFILE_RISK_IDS.includes(id))) errors.push("unsupported_user_risk_profile_id");

  // Risk score, when present, must be a finite 0–10 value.
  if (r.riskScore !== undefined && !(typeof r.riskScore === "number" && Number.isFinite(r.riskScore) && r.riskScore >= 0 && r.riskScore <= 10)) errors.push("invalid_risk_score");

  // Capability flags must all be off.
  const flagsOff = r.comparisonPerformed === false && r.leaderSelected === false && r.amountCalculated === false && r.suggestionGenerated === false && r.transactionsEnabled === false && r.walletSignatureRequired === false;
  if (!flagsOff) errors.push("capability_flag_enabled");

  // Exact registry identity — the review must point at a real registry entry with the same protocol/address.
  const entry = getYieldStrategy(r.strategyId);
  if (!entry) errors.push("strategy_not_registered");
  else {
    if (entry.protocolId !== r.protocolId) errors.push("protocol_id_mismatch");
    // A review must never carry an address the registry does not document (no fabricated address).
    if (entry.address !== undefined && entry.address !== r.address) errors.push("address_mismatch");
    if (entry.address === undefined) errors.push("review_for_undocumented_product");
  }

  // An APPROVED review must be fully determined (no unknown custody / audit / leverage / exposure).
  if (r.reviewStatus === "approved") {
    if (r.custodyModel === "unknown") errors.push("approved_review_unknown_custody");
    if (r.auditStatus === "unknown") errors.push("approved_review_unknown_audit");
    if (r.leverageUsed === "unknown") errors.push("approved_review_unknown_leverage");
    if (r.resultingExposure === "unknown") errors.push("approved_review_unknown_exposure");
  }

  return { valid: errors.length === 0, errors };
}

/** Validate a set of risk reviews. Fails closed; rejects duplicate ids / same-version strategy dupes. */
export function validateYieldStrategyRiskReviewSet(reviews: unknown, options: ValidateRiskReviewOptions = {}): YieldStrategyEligibilityValidationResult {
  const errors: string[] = [];
  if (!Array.isArray(reviews)) return { valid: false, errors: ["reviews_not_an_array"] };
  const ids = reviews.map((r) => (r as YieldStrategyRiskReview)?.reviewId);
  if (new Set(ids).size !== ids.length) errors.push("duplicate_review_ids");
  const strategyVersionKeys = reviews.map((r) => `${(r as YieldStrategyRiskReview)?.strategyId}@${(r as YieldStrategyRiskReview)?.reviewVersion}`);
  if (new Set(strategyVersionKeys).size !== strategyVersionKeys.length) errors.push("duplicate_strategy_review_version");
  for (const r of reviews) {
    const v = validateYieldStrategyRiskReview(r, options);
    if (!v.valid) errors.push(`review_${(r as YieldStrategyRiskReview)?.reviewId ?? "unknown"}:${v.errors.join("/")}`);
  }
  return { valid: errors.length === 0, errors };
}

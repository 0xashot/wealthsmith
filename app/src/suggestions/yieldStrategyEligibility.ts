/**
 * yieldStrategyEligibility — Step 16D. The deterministic Stable Yield ELIGIBILITY evaluator + set
 * builder + validators. For one EXACT product and one lane it answers "may this proceed to a later
 * (16E) comparison?" by running a fixed gate order over registry identity/lifecycle (16B), the 16A
 * strategy/lane policy, the static risk review, and the 16C market snapshot, plus user-risk
 * compatibility for the excess lane. It accumulates blockers in gate order and a later pass never
 * erases an earlier blocker.
 *
 * It COMPARES nothing, ranks nothing, selects no leader, calculates NO amount, consumes NO wallet
 * balance / position, and enables NO execution. A zero-approved production registry produces an empty
 * eligibility set — a valid state.
 */
import {
  ELIGIBLE_STRATEGY_TYPES,
  YIELD_STRATEGY_ELIGIBILITY_POLICY_ID,
  YIELD_STRATEGY_ELIGIBILITY_POLICY_VERSION,
  YIELD_STRATEGY_ELIGIBILITY_SCHEMA_VERSION,
  type YieldStrategyEligibilityBlocker,
  type YieldStrategyEligibilityLane,
  type YieldStrategyEligibilitySet,
  type YieldStrategyEligibilityValidationResult,
  type YieldStrategyLaneEligibilityResult,
  type YieldStrategyLaneEligibilityStatus,
  type YieldStrategyRiskReview,
} from "./yieldStrategyEligibilityTypes";
import {
  MIN_LIQUIDITY_USD,
  MIN_PROTOCOL_RISK_SCORE,
  getYieldStrategyLaneRule,
} from "./yieldStrategyEligibilityPolicy";
import { evaluateMarketFreshness } from "./yieldStrategyMarketDataPolicy";
import { listYieldStrategies } from "./yieldStrategyRegistry";
import { listYieldStrategyRiskReviews } from "./yieldStrategyRiskReview";
import { RECOGNIZED_PROFILE_RISK_IDS } from "./contributionTargetSuitability";
import type { YieldStrategyRegistryEntry } from "./yieldStrategyRegistryTypes";
import type { YieldStrategyMarketDataSet, YieldStrategyMarketSnapshot } from "./yieldStrategyMarketDataTypes";

export const YIELD_STRATEGY_ELIGIBILITY_EXISTS = true;

/* ------------------------------------------------------------------ *
 * Blocker classification (for the final status; identical membership everywhere).
 * ------------------------------------------------------------------ */
const INVALID_BLOCKERS = new Set<YieldStrategyEligibilityBlocker>(["input_invalid", "unknown_lane", "checked_at_invalid", "market_snapshot_invalid", "apy_invalid", "tvl_invalid", "risk_review_invalid", "risk_score_invalid"]);
const UNSUPPORTED_BLOCKERS = new Set<YieldStrategyEligibilityBlocker>(["lane_not_supported", "risk_lane_not_supported", "principal_asset_not_supported", "strategy_type_not_supported"]);
const STALE_BLOCKERS = new Set<YieldStrategyEligibilityBlocker>(["market_snapshot_stale", "risk_review_stale"]);
const MISSING_BLOCKERS = new Set<YieldStrategyEligibilityBlocker>(["strategy_not_registered", "strategy_not_approved", "exact_identity_missing", "address_missing", "lifecycle_not_active", "market_snapshot_missing", "market_snapshot_partial", "market_provenance_missing", "apy_missing", "apy_definition_unknown", "tvl_missing", "liquidity_missing", "liquidity_unknown", "withdrawal_status_unknown", "withdrawal_delay_unknown", "fee_definition_missing", "market_capacity_unavailable", "risk_review_missing", "operational_status_unknown", "audit_status_unknown", "custody_model_unknown", "leverage_status_unknown", "resulting_exposure_unknown", "risk_score_missing", "risk_tier_unknown"]);
const MARKET_READINESS_BLOCKERS = new Set<YieldStrategyEligibilityBlocker>(["market_snapshot_missing", "market_snapshot_invalid", "market_snapshot_partial", "market_snapshot_stale", "market_provenance_missing", "apy_missing", "apy_invalid", "apy_definition_unknown", "apy_definition_not_comparable", "tvl_missing", "tvl_invalid", "tvl_below_minimum", "liquidity_missing", "liquidity_unknown", "liquidity_confidence_insufficient", "withdrawal_status_unknown", "withdrawal_unavailable", "withdrawal_queue_active", "withdrawal_delay_unknown", "withdrawal_delay_exceeds_policy", "fee_definition_missing", "market_capacity_unavailable"]);
const REVIEW_READINESS_BLOCKERS = new Set<YieldStrategyEligibilityBlocker>(["risk_review_missing", "risk_review_invalid", "risk_review_stale", "review_identity_mismatch", "operational_status_unknown", "strategy_paused", "strategy_deprecated", "audit_status_unknown", "audit_requirement_not_met", "custody_model_unknown", "non_custodial_requirement_not_met", "leverage_status_unknown", "leverage_not_allowed", "resulting_exposure_unknown", "resulting_exposure_not_allowed", "risk_score_missing", "risk_score_invalid", "risk_score_below_minimum", "risk_tier_unknown", "buffer_strategy_not_conservative", "buffer_strategy_not_usdc_only", "buffer_strategy_uses_leverage", "buffer_strategy_has_lp_exposure", "excess_strategy_not_compatible"]);
const IDENTITY_BLOCKERS = new Set<YieldStrategyEligibilityBlocker>(["strategy_not_registered", "exact_identity_missing", "address_missing", "lane_not_supported", "risk_lane_not_supported", "principal_asset_not_supported", "strategy_type_not_supported"]);

const isIso = (s: unknown): boolean => typeof s === "string" && s.length > 0 && !Number.isNaN(Date.parse(s));
const isFiniteNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export interface EvaluateYieldStrategyLaneEligibilityInput {
  lane: YieldStrategyEligibilityLane;
  registryEntry: YieldStrategyRegistryEntry;
  marketSnapshot?: YieldStrategyMarketSnapshot;
  riskReview?: YieldStrategyRiskReview;
  userRiskProfileId?: string;
  checkedAt: string;
}

/**
 * Evaluate ONE exact strategy for ONE lane. Deterministic gate order (1 input → 21 eligibility).
 * Pure; mutates nothing; consumes no wallet/capital data.
 */
export function evaluateYieldStrategyLaneEligibility(input: EvaluateYieldStrategyLaneEligibilityInput): YieldStrategyLaneEligibilityResult {
  const { lane, registryEntry: e, marketSnapshot: snap, riskReview: rev, userRiskProfileId, checkedAt } = input;
  const rule = getYieldStrategyLaneRule(lane);
  const blockers: YieldStrategyEligibilityBlocker[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];
  const push = (b: YieldStrategyEligibilityBlocker) => { if (!blockers.includes(b)) blockers.push(b); };

  // Requirement flags.
  let apyDefinitionReady = false;
  let tvlRequirementPassed = false;
  let liquidityRequirementPassed = false;
  let withdrawalRequirementPassed = false;
  let auditRequirementPassed = false;
  let custodyRequirementPassed = false;
  let leverageRequirementPassed = false;
  let exposureRequirementPassed = false;
  let operationalRequirementPassed = false;
  let userRiskCompatible = lane === "buffer"; // buffer never depends on user risk

  // ---- Gate 1: input validity ----
  if (lane !== "buffer" && lane !== "excess") push("unknown_lane");
  if (!isIso(checkedAt)) push("checked_at_invalid");
  if (!e || typeof e !== "object") push("input_invalid");

  // ---- Gate 2–5: registry identity + lifecycle + lane + address + asset + type ----
  const hasIdentity = !!e && !!e.strategyId && !!e.protocolId;
  if (!hasIdentity) push("exact_identity_missing");
  const address = typeof e?.address === "string" && e.address.length > 0 ? e.address : undefined;
  if (!address) push("address_missing");

  const registryApproved = e?.lifecycle === "approved";
  if (!registryApproved) {
    push("strategy_not_approved");
    if (e?.lifecycle === "deprecated" || e?.lifecycle === "disabled") push("lifecycle_not_active");
  }

  if (lane === "buffer") {
    if (e?.supportedLane !== "safety_buffer_yield") push("lane_not_supported");
    if (e?.riskLane !== "buffer_eligible") push("risk_lane_not_supported");
  } else {
    if (!(e?.riskLane === "buffer_eligible" || e?.riskLane === "excess_only")) push("risk_lane_not_supported");
  }
  if (e?.principalAsset !== "USDC") push("principal_asset_not_supported");
  if (!e || !(ELIGIBLE_STRATEGY_TYPES as readonly string[]).includes(e.strategyType)) push("strategy_type_not_supported");

  // ---- Gate 6–12: risk review ----
  if (!rev) {
    push("risk_review_missing");
  } else {
    // Identity match against the exact registry entry.
    if (rev.strategyId !== e?.strategyId || rev.protocolId !== e?.protocolId || (address !== undefined && rev.address !== address)) push("review_identity_mismatch");

    // Review status + expiry.
    if (rev.reviewStatus === "incomplete" || rev.reviewStatus === "rejected") push("risk_review_invalid");
    if (rev.reviewStatus === "expired") push("risk_review_stale");
    if (rev.validUntil && isIso(rev.validUntil) && isIso(checkedAt) && Date.parse(rev.validUntil) < Date.parse(checkedAt)) push("risk_review_stale");
    if (rev.reviewStatus === "conditional") warnings.push("risk_review_conditional");

    // Operational status.
    if (rev.operationalStatus === "active") operationalRequirementPassed = true;
    else if (rev.operationalStatus === "paused") push("strategy_paused");
    else if (rev.operationalStatus === "deprecated" || rev.operationalStatus === "disabled") push("strategy_deprecated");
    else push("operational_status_unknown");

    // Resulting exposure.
    if (rev.resultingExposure === "unknown") push("resulting_exposure_unknown");
    else if (!(rule.allowedExposures as readonly string[]).includes(rev.resultingExposure)) {
      push("resulting_exposure_not_allowed");
      if (lane === "buffer") push("buffer_strategy_not_usdc_only");
    } else {
      exposureRequirementPassed = true;
    }
    if (lane === "buffer" && e?.strategyType === "stable_liquidity_strategy") { push("buffer_strategy_has_lp_exposure"); exposureRequirementPassed = false; }

    // Custody.
    if (rev.custodyModel === "unknown") push("custody_model_unknown");
    else if (rev.custodyModel !== rule.requiredCustodyModel) push("non_custodial_requirement_not_met");
    else custodyRequirementPassed = true;

    // Audit — canonical requirement is a verified audit.
    if (rev.auditStatus === "unknown") push("audit_status_unknown");
    else if (rev.auditStatus !== "verified") push("audit_requirement_not_met");
    else auditRequirementPassed = true;

    // Leverage — never permitted today.
    if (rev.leverageUsed === "unknown") push("leverage_status_unknown");
    else if (rev.leverageUsed === true) { push("leverage_not_allowed"); if (lane === "buffer") push("buffer_strategy_uses_leverage"); }
    else leverageRequirementPassed = true;

    // Risk score — reuses the canonical documented threshold (0–10, >= 7).
    if (rev.riskScore === undefined) push("risk_score_missing");
    else if (!(isFiniteNum(rev.riskScore) && rev.riskScore >= 0 && rev.riskScore <= 10)) push("risk_score_invalid");
    else if (rev.riskScore < MIN_PROTOCOL_RISK_SCORE) push("risk_score_below_minimum");

    // Risk tier / user-risk compatibility.
    if (lane === "buffer") {
      if (rev.smartContractRiskTier === "unknown") push("risk_tier_unknown");
      else if (rev.smartContractRiskTier !== "conservative") push("buffer_strategy_not_conservative");
      if (!rev.bufferUseReviewed) { push("risk_review_invalid"); notes.push("buffer use not reviewed"); }
    } else {
      // Excess — user risk must be listed in the reviewed compatible ids (fail closed).
      if (!rev.excessUseReviewed) push("excess_strategy_not_compatible");
      if (rev.smartContractRiskTier === "unknown") push("risk_tier_unknown");
      if (rule.requireUserRiskCompatibility) {
        if (!userRiskProfileId || !RECOGNIZED_PROFILE_RISK_IDS.includes(userRiskProfileId)) { push("user_risk_incompatible"); userRiskCompatible = false; }
        else if (!rev.compatibleUserRiskProfileIds.includes(userRiskProfileId)) { push("user_risk_incompatible"); userRiskCompatible = false; }
        else userRiskCompatible = true;
      }
    }
  }

  // ---- Gate 13–20: market data ----
  if (!snap) {
    push("market_snapshot_missing");
  } else {
    if (snap.strategyId !== e?.strategyId) push("market_snapshot_invalid");
    // Snapshot status.
    if (snap.status === "unavailable") push("market_snapshot_missing");
    else if (snap.status === "invalid") push("market_snapshot_invalid");
    else if (snap.status === "partial") push("market_snapshot_partial");
    else if (snap.status === "stale") push("market_snapshot_stale");

    // Re-evaluate freshness against THIS lane's bound (buffer is stricter than the product's own bound).
    const fresh = evaluateMarketFreshness(snap.fetchedAt, checkedAt, rule.marketFreshnessMaxAgeMs);
    if (fresh.status === "stale") push("market_snapshot_stale");
    else if (fresh.status === "invalid") push("market_snapshot_invalid");
    else if (fresh.status === "missing") push("market_snapshot_missing");

    // Provenance.
    if (!snap.provenance || snap.provenance.present !== true || snap.provenance.browserFetched !== false) push("market_provenance_missing");

    // APY — readiness only (NO minimum, NO magnitude preference).
    const apyVal = snap.apy?.currentApyPct;
    if (apyVal === undefined && snap.apy?.netApyPct === undefined && snap.apy?.grossApyPct === undefined) push("apy_missing");
    else if (apyVal !== undefined && !isFiniteNum(apyVal)) push("apy_invalid");
    if (snap.apy?.apyDefinition === "unknown") push("apy_definition_unknown");
    else if (snap.apy && !snap.apy.definitionSufficientForComparison) push("apy_definition_not_comparable");
    apyDefinitionReady = !!snap.apy && snap.apy.definitionSufficientForComparison && (isFiniteNum(apyVal) || isFiniteNum(snap.apy.netApyPct) || isFiniteNum(snap.apy.grossApyPct));

    // TVL — canonical floor.
    const tvl = snap.tvl?.tvlUsd;
    if (tvl === undefined) push("tvl_missing");
    else if (!(isFiniteNum(tvl) && tvl >= 0)) push("tvl_invalid");
    else if (tvl < rule.tvlMinUsd) push("tvl_below_minimum");
    else tvlRequirementPassed = true;

    // Liquidity — separate from withdrawal; never inferred from TVL/APY.
    const liq = snap.liquidity;
    if (!liq || liq.withdrawalStatus === undefined) {
      push("liquidity_missing");
    } else if (rule.requireExplicitAvailableLiquidity) {
      // Buffer: explicit confidence + an explicit available-liquidity figure at/above the canonical floor.
      if (liq.liquidityConfidence !== "explicit_source") push("liquidity_confidence_insufficient");
      if (!isFiniteNum(liq.availableLiquidityUsd)) push("liquidity_missing");
      else if ((liq.availableLiquidityUsd as number) < (rule.minAvailableLiquidityUsd ?? MIN_LIQUIDITY_USD)) push("market_capacity_unavailable");
      else if (liq.liquidityConfidence === "explicit_source") liquidityRequirementPassed = true;
    } else {
      // Excess: confidence must be known (not unknown).
      if (liq.liquidityConfidence === "unknown") push("liquidity_unknown");
      else liquidityRequirementPassed = true;
    }

    // Withdrawal — separate check.
    const ws = liq?.withdrawalStatus;
    if (ws === undefined || ws === "unknown") push("withdrawal_status_unknown");
    else if (ws === "unavailable") push("withdrawal_unavailable");
    else if (!(rule.allowedWithdrawalStatuses as readonly string[]).includes(ws)) {
      if (lane === "buffer") push("buffer_strategy_not_immediately_liquid");
      else push("withdrawal_status_unknown");
    } else {
      withdrawalRequirementPassed = true;
    }
    if (liq?.withdrawalQueueActive === true) {
      if (lane === "buffer") { push("withdrawal_queue_active"); withdrawalRequirementPassed = false; }
      else if (liq.withdrawalDelayHours === undefined) { push("withdrawal_delay_unknown"); withdrawalRequirementPassed = false; }
    }
    if (isFiniteNum(liq?.withdrawalDelayHours)) {
      if ((liq!.withdrawalDelayHours as number) > rule.maxWithdrawalHours) { push("withdrawal_delay_exceeds_policy"); withdrawalRequirementPassed = false; }
    } else if (lane === "excess" && (ws === "withdrawal_required" || ws === "queue_possible")) {
      push("withdrawal_delay_unknown"); withdrawalRequirementPassed = false;
    }

    // Fees — a defined fee model must exist.
    if (!snap.fees || snap.fees.feeModel === "unknown") push("fee_definition_missing");
  }

  // ---- Composite readiness ----
  const marketDataReady = !!snap && !blockers.some((b) => MARKET_READINESS_BLOCKERS.has(b));
  const riskReviewReady = !!rev && !blockers.some((b) => REVIEW_READINESS_BLOCKERS.has(b));
  const exactIdentityReady = registryApproved && !!address && !blockers.some((b) => IDENTITY_BLOCKERS.has(b));

  // ---- Gate 21: status ----
  let status: YieldStrategyLaneEligibilityStatus;
  if (blockers.some((b) => INVALID_BLOCKERS.has(b))) status = "invalid";
  else if (blockers.some((b) => UNSUPPORTED_BLOCKERS.has(b))) status = "unsupported";
  else if (blockers.length === 0) status = "eligible_for_comparison";
  else if (blockers.some((b) => STALE_BLOCKERS.has(b))) status = "blocked_stale_data";
  else if (blockers.some((b) => MISSING_BLOCKERS.has(b))) status = "blocked_missing_data";
  else status = "ineligible";

  const eligibleForComparison = status === "eligible_for_comparison";

  return {
    schemaVersion: "1.0.0",
    policyId: YIELD_STRATEGY_ELIGIBILITY_POLICY_ID,
    policyVersion: YIELD_STRATEGY_ELIGIBILITY_POLICY_VERSION,
    strategyId: e?.strategyId ?? "",
    protocolId: e?.protocolId ?? "",
    ...(address ? { address } : {}),
    lane,
    status,
    registryApproved,
    exactIdentityReady,
    marketDataReady,
    riskReviewReady,
    userRiskCompatible,
    eligibleForComparison,
    apyDefinitionReady,
    tvlRequirementPassed,
    liquidityRequirementPassed,
    withdrawalRequirementPassed,
    auditRequirementPassed,
    custodyRequirementPassed,
    leverageRequirementPassed,
    exposureRequirementPassed,
    operationalRequirementPassed,
    comparisonPerformed: false,
    rankAssigned: false,
    leaderSelected: false,
    userCapitalEvaluated: false,
    amountCalculated: false,
    planGenerated: false,
    suggestionGenerated: false,
    updatesProductOutput: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    blockers,
    warnings,
    notes,
  };
}

/* ------------------------------------------------------------------ *
 * Set builder — evaluates only APPROVED registry entries, in canonical order.
 * ------------------------------------------------------------------ */
export interface BuildYieldStrategyEligibilitySetInput {
  /** Defaults to the production registry. */
  registry?: YieldStrategyRegistryEntry[];
  marketDataSet: YieldStrategyMarketDataSet;
  /** Defaults to production risk reviews (empty today). */
  riskReviews?: YieldStrategyRiskReview[];
  userRiskProfileId?: string;
  checkedAt: string;
}

function bufferApplicable(e: YieldStrategyRegistryEntry): boolean {
  return e.supportedLane === "safety_buffer_yield" && e.riskLane === "buffer_eligible";
}
function excessApplicable(e: YieldStrategyRegistryEntry): boolean {
  return e.riskLane === "buffer_eligible" || e.riskLane === "excess_only";
}

/**
 * Build the eligibility set. Only APPROVED entries produce lane results (production has none → empty).
 * Preserves canonical registry order; never sorts by APY; assigns no rank/leader.
 */
export function buildYieldStrategyEligibilitySet(input: BuildYieldStrategyEligibilitySetInput): YieldStrategyEligibilitySet {
  const registry = input.registry ?? listYieldStrategies();
  const reviews = input.riskReviews ?? listYieldStrategyRiskReviews();
  const reviewById = new Map(reviews.map((r) => [r.strategyId, r] as const));
  const checkedAt = input.checkedAt;

  const bufferResults: YieldStrategyLaneEligibilityResult[] = [];
  const excessResults: YieldStrategyLaneEligibilityResult[] = [];
  const bufferEligibleStrategyIds: string[] = [];
  const excessEligibleStrategyIds: string[] = [];
  const blockedStrategyIds: string[] = [];
  const unsupportedStrategyIds: string[] = [];

  const approvedEntries = registry.filter((e) => e.lifecycle === "approved");
  const emptyApprovedSet = approvedEntries.length === 0;

  for (const e of registry) {
    if (e.lifecycle !== "approved") continue; // only approved products are evaluated for eligibility
    const snap = input.marketDataSet.snapshots[e.strategyId];
    const rev = reviewById.get(e.strategyId);

    if (bufferApplicable(e)) {
      const r = evaluateYieldStrategyLaneEligibility({ lane: "buffer", registryEntry: e, marketSnapshot: snap, riskReview: rev, userRiskProfileId: input.userRiskProfileId, checkedAt });
      bufferResults.push(r);
      if (r.eligibleForComparison) bufferEligibleStrategyIds.push(e.strategyId);
      else if (r.status === "unsupported" && !unsupportedStrategyIds.includes(e.strategyId)) unsupportedStrategyIds.push(e.strategyId);
      else if (!blockedStrategyIds.includes(e.strategyId)) blockedStrategyIds.push(e.strategyId);
    }
    if (excessApplicable(e)) {
      const r = evaluateYieldStrategyLaneEligibility({ lane: "excess", registryEntry: e, marketSnapshot: snap, riskReview: rev, userRiskProfileId: input.userRiskProfileId, checkedAt });
      excessResults.push(r);
      if (r.eligibleForComparison) excessEligibleStrategyIds.push(e.strategyId);
      else if (r.status === "unsupported" && !unsupportedStrategyIds.includes(e.strategyId)) unsupportedStrategyIds.push(e.strategyId);
      else if (!blockedStrategyIds.includes(e.strategyId)) blockedStrategyIds.push(e.strategyId);
    }
  }

  const anyInvalid = [...bufferResults, ...excessResults].some((r) => r.status === "invalid");
  const status: YieldStrategyEligibilitySet["status"] = emptyApprovedSet ? "empty_approved_set" : anyInvalid ? "invalid" : "complete";

  return {
    schemaVersion: YIELD_STRATEGY_ELIGIBILITY_SCHEMA_VERSION,
    policyId: YIELD_STRATEGY_ELIGIBILITY_POLICY_ID,
    policyVersion: YIELD_STRATEGY_ELIGIBILITY_POLICY_VERSION,
    status,
    checkedAt,
    bufferResults,
    excessResults,
    bufferEligibleStrategyIds,
    excessEligibleStrategyIds,
    blockedStrategyIds,
    unsupportedStrategyIds,
    emptyApprovedSet,
    comparisonPerformed: false,
    rankingPerformed: false,
    leaderSelected: false,
    walletPositionsEvaluated: false,
    userCapitalEvaluated: false,
    amountCalculated: false,
    planGenerated: false,
    suggestionGenerated: false,
    updatesProductOutput: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    blockers: [],
    warnings: [],
    notes: [
      "Eligibility only — no comparison, ranking, leader, capital, amount, plan, or suggestion.",
      emptyApprovedSet ? "No approved products in the registry; eligibility set is empty (valid)." : "Evaluated approved products only, in canonical registry order.",
    ],
  };
}

/** The canonical production eligibility set: production registry + reviews + a checkedAt (empty today). */
export function buildProductionYieldStrategyEligibilitySet(marketDataSet: YieldStrategyMarketDataSet, checkedAt: string, userRiskProfileId?: string): YieldStrategyEligibilitySet {
  return buildYieldStrategyEligibilitySet({ marketDataSet, checkedAt, userRiskProfileId });
}

/* ------------------------------------------------------------------ *
 * Validation (fails closed).
 * ------------------------------------------------------------------ */
const LANE_STATUSES = new Set(["eligible_for_comparison", "ineligible", "blocked_missing_data", "blocked_stale_data", "unsupported", "invalid"]);

/** Validate one lane result. Fails closed on any eligibility/flag inconsistency. */
export function validateYieldStrategyLaneEligibilityResult(result: unknown): YieldStrategyEligibilityValidationResult {
  const errors: string[] = [];
  if (!result || typeof result !== "object") return { valid: false, errors: ["result_not_an_object"] };
  const r = result as YieldStrategyLaneEligibilityResult;
  if (r.schemaVersion !== YIELD_STRATEGY_ELIGIBILITY_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (r.policyId !== YIELD_STRATEGY_ELIGIBILITY_POLICY_ID) errors.push("wrong_policy_id");
  if (r.lane !== "buffer" && r.lane !== "excess") errors.push("unknown_lane");
  if (!LANE_STATUSES.has(r.status)) errors.push("invalid_status");

  const flagsOff = r.comparisonPerformed === false && r.rankAssigned === false && r.leaderSelected === false && r.userCapitalEvaluated === false && r.amountCalculated === false && r.planGenerated === false && r.suggestionGenerated === false && r.updatesProductOutput === false && r.transactionsEnabled === false && r.walletSignatureRequired === false;
  if (!flagsOff) errors.push("capability_flag_enabled");

  // eligible ⇒ complete, no blockers, all readiness true, lane-appropriate user compat.
  if (r.eligibleForComparison === true) {
    if (r.status !== "eligible_for_comparison") errors.push("eligible_wrong_status");
    if ((r.blockers?.length ?? 0) > 0) errors.push("eligible_with_blockers");
    if (!r.registryApproved) errors.push("eligible_without_approval");
    if (!r.exactIdentityReady) errors.push("eligible_without_identity");
    if (!r.marketDataReady) errors.push("eligible_without_market_data");
    if (!r.riskReviewReady) errors.push("eligible_without_risk_review");
    if (!r.address) errors.push("eligible_without_address");
    if (r.lane === "excess" && !r.userRiskCompatible) errors.push("eligible_excess_without_user_compat");
  }
  if (r.status === "eligible_for_comparison" && r.eligibleForComparison !== true) errors.push("status_eligible_flag_false");
  if (r.status !== "eligible_for_comparison" && r.eligibleForComparison === true) errors.push("blocked_marked_eligible");
  return { valid: errors.length === 0, errors };
}

/** Validate the eligibility set. Fails closed; enforces registry order + eligible-id consistency. */
export function validateYieldStrategyEligibilitySet(set: unknown): YieldStrategyEligibilityValidationResult {
  const errors: string[] = [];
  if (!set || typeof set !== "object") return { valid: false, errors: ["set_not_an_object"] };
  const s = set as YieldStrategyEligibilitySet;
  if (s.schemaVersion !== YIELD_STRATEGY_ELIGIBILITY_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (s.policyId !== YIELD_STRATEGY_ELIGIBILITY_POLICY_ID) errors.push("wrong_policy_id");
  if (!["complete", "empty_approved_set", "blocked", "invalid"].includes(s.status)) errors.push("invalid_set_status");

  const flagsOff = s.comparisonPerformed === false && s.rankingPerformed === false && s.leaderSelected === false && s.walletPositionsEvaluated === false && s.userCapitalEvaluated === false && s.amountCalculated === false && s.planGenerated === false && s.suggestionGenerated === false && s.updatesProductOutput === false && s.transactionsEnabled === false && s.walletSignatureRequired === false;
  if (!flagsOff) errors.push("capability_flag_enabled");

  // Registry order must be preserved within each lane (subset, in order); no duplicate within a lane.
  const registryOrder = listYieldStrategies().map((e) => e.strategyId);
  const orderIndex = (id: string) => registryOrder.indexOf(id);
  for (const [laneName, results] of [["buffer", s.bufferResults], ["excess", s.excessResults]] as const) {
    const ids = (results ?? []).map((r) => r.strategyId);
    if (new Set(ids).size !== ids.length) errors.push(`duplicate_${laneName}_result`);
    for (const r of results ?? []) {
      const v = validateYieldStrategyLaneEligibilityResult(r);
      if (!v.valid) errors.push(`${laneName}_result_${r.strategyId}_invalid:${v.errors.join("/")}`);
      if (r.lane !== laneName) errors.push(`${laneName}_result_wrong_lane`);
    }
    const positioned = ids.filter((id) => orderIndex(id) >= 0);
    const sorted = [...positioned].sort((a, b) => orderIndex(a) - orderIndex(b));
    if (JSON.stringify(positioned) !== JSON.stringify(sorted)) errors.push(`${laneName}_order_drift`);
  }

  // Eligible id arrays must exactly match the eligible results (and preserve order).
  const bufferEligible = (s.bufferResults ?? []).filter((r) => r.eligibleForComparison).map((r) => r.strategyId);
  const excessEligible = (s.excessResults ?? []).filter((r) => r.eligibleForComparison).map((r) => r.strategyId);
  if (JSON.stringify(bufferEligible) !== JSON.stringify(s.bufferEligibleStrategyIds ?? [])) errors.push("buffer_eligible_ids_mismatch");
  if (JSON.stringify(excessEligible) !== JSON.stringify(s.excessEligibleStrategyIds ?? [])) errors.push("excess_eligible_ids_mismatch");

  // Empty-approved consistency.
  if (s.emptyApprovedSet === true && s.status !== "empty_approved_set") errors.push("empty_flag_status_mismatch");
  if (s.status === "empty_approved_set" && (s.bufferResults?.length ?? 0) + (s.excessResults?.length ?? 0) > 0) errors.push("empty_set_has_results");
  return { valid: errors.length === 0, errors };
}

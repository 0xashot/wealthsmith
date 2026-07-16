/**
 * yieldStrategyPlanSuggestion — Step 16H-A. Converts a Step 16G ready plan DECISION into a
 * deterministic, read-only Suggestion Engine suggestion (category `stable_yield`), plus a structured
 * diagnostic for every suppressed case. The 16G plan is the SOLE source of truth — nothing is
 * re-selected, re-computed, inferred, or altered. No transaction/execution/signature is built; no
 * user-facing copy is generated (only copy KEYS + structured fields).
 */
import type { EngineSuggestion, SuggestionGuardrail, SuggestionReasonCode } from "./engineTypes";
import { SUGGESTION_ENGINE_VERSION } from "./engineThresholds";
import type { YieldStrategyPlan, YieldStrategyPlanDecision } from "./yieldStrategyPlanTypes";
import { validateYieldStrategyPlan } from "./yieldStrategyPlan";
import {
  YIELD_STRATEGY_SUGGESTION_ID_PREFIX,
  YIELD_STRATEGY_SUGGESTION_POLICY_ID,
  YIELD_STRATEGY_SUGGESTION_POLICY_VERSION,
  YIELD_STRATEGY_SUGGESTION_SCHEMA_VERSION,
  type StableYieldPlanSuggestionMeta,
  type StableYieldPlanSuggestionValidationResult,
  type StableYieldSuggestionApyProvenance,
  type StableYieldSuggestionDiagnostic,
} from "./yieldStrategyPlanSuggestionTypes";

export const YIELD_STRATEGY_PLAN_SUGGESTION_EXISTS = true;

const round4 = (n: number) => Math.round(n * 10000) / 10000;

/** The single primary reason code for a lane (deterministic, never stacked). */
function primaryReasonCode(lane: "buffer" | "excess"): SuggestionReasonCode {
  return lane === "buffer" ? "stable_yield_buffer_lane_ready" : "stable_yield_excess_lane_ready";
}

/** The stable suggestion id — derived from the stable Step 16G plan id (timestamp-independent). */
export function stableYieldSuggestionId(planId: string): string {
  return `${YIELD_STRATEGY_SUGGESTION_ID_PREFIX}${planId}`;
}

function buildMeta(plan: YieldStrategyPlan, apy?: StableYieldSuggestionApyProvenance): StableYieldPlanSuggestionMeta {
  return {
    schemaVersion: YIELD_STRATEGY_SUGGESTION_SCHEMA_VERSION,
    suggestionPolicyId: YIELD_STRATEGY_SUGGESTION_POLICY_ID,
    suggestionPolicyVersion: YIELD_STRATEGY_SUGGESTION_POLICY_VERSION,
    sourcePlanId: plan.planId,
    planPolicyId: plan.policyId,
    planPolicyVersion: plan.policyVersion,
    lane: plan.lane,
    actionMode: plan.actionMode,
    strategyId: plan.strategyId,
    displayName: plan.displayName,
    protocolId: plan.protocolId,
    protocolDisplayName: plan.protocolDisplayName,
    productAddress: plan.productAddress,
    principalAssetId: plan.principalAssetId,
    amountUsd: plan.amountUsd,
    amountCents: plan.amountCents,
    fundingSource: "direct_wallet_usdc",
    fundingAvailableUsd: plan.source.availableUsd,
    laneCapitalUsd: plan.laneCapitalUsd,
    effectiveMinimumUsd: plan.effectiveMinimumUsd,
    effectiveMaximumUsd: plan.effectiveMaximumUsd,
    effectiveProductCapacityUsd: plan.effectiveProductCapacityUsd,
    capacityMode: plan.capacityMode,
    capacitySourceId: plan.capacitySourceId,
    capacityFetchedAt: plan.capacityFetchedAt,
    comparisonStatus: plan.comparisonStatus,
    comparisonLeaderReason: plan.comparisonLeaderReason,
    ...(typeof plan.comparisonLeaderScore === "number" ? { comparisonLeaderScore: plan.comparisonLeaderScore } : {}),
    leaderPositionStatus: plan.leaderPositionStatus,
    projection: {
      directLiquidUsdcBeforeUsd: plan.projection.directLiquidUsdcBeforeUsd,
      directLiquidUsdcAfterUsd: plan.projection.directLiquidUsdcAfterUsd,
      directWalletEligibleBufferBeforeUsd: plan.projection.directWalletEligibleBufferBeforeUsd,
      directWalletEligibleBufferAfterUsd: plan.projection.directWalletEligibleBufferAfterUsd,
      existingEligibleBufferYieldBeforeUsd: plan.projection.existingEligibleBufferYieldBeforeUsd,
      existingEligibleBufferYieldAfterUsd: plan.projection.existingEligibleBufferYieldAfterUsd,
      currentEligibleBufferBeforeUsd: plan.projection.currentEligibleBufferBeforeUsd,
      currentEligibleBufferAfterUsd: plan.projection.currentEligibleBufferAfterUsd,
      requiredBufferUsd: plan.projection.requiredBufferUsd,
      requiredWalletFloorUsd: plan.projection.requiredWalletFloorUsd,
      selectedProductCountsTowardBuffer: plan.projection.selectedProductCountsTowardBuffer,
      bufferCoveragePreserved: plan.projection.bufferCoveragePreserved,
      walletFloorPreserved: plan.projection.walletFloorPreserved,
    },
    ...(apy ? { apy } : {}),
    readOnly: true,
    externalManagementRequired: true,
    productSelected: true,
    amountSelected: true,
    planGenerated: true,
    suggestionGenerated: true,
    updatesProductOutput: false,
    executionPrepared: false,
    transactionBuilt: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

export interface BuildStableYieldPlanSuggestionOptions {
  generatedAt?: number;
  /** APY provenance from already-approved upstream data — preserved verbatim; never inferred here. */
  apyProvenance?: StableYieldSuggestionApyProvenance;
}

export interface StableYieldPlanSuggestionResult {
  suggestion: EngineSuggestion | null;
  meta: StableYieldPlanSuggestionMeta | null;
  diagnostic: StableYieldSuggestionDiagnostic;
}

/**
 * Convert a Step 16G plan decision into a `stable_yield` engine suggestion. Emits a suggestion ONLY
 * for a ready decision with a valid selected plan; every other case returns `suggestion: null` with a
 * deterministic diagnostic. `is_top_pick` stays false (only `selectTopPick` may set it).
 */
export function buildStableYieldPlanSuggestion(decision: YieldStrategyPlanDecision, options: BuildStableYieldPlanSuggestionOptions = {}): StableYieldPlanSuggestionResult {
  const generatedAt = options.generatedAt ?? Date.now();
  const bufferStatus = decision.bufferLaneEvaluation.status;
  const excessStatus = decision.excessLaneEvaluation.status;

  const diagnosticBase = {
    planStatus: decision.status,
    bufferLaneStatus: bufferStatus,
    excessLaneStatus: excessStatus,
    category: "stable_yield" as const,
  };

  // Suppressed at the planning layer (no ready plan). Preserve the most SPECIFIC reason: a lane that
  // got further (a withheld-leader / capacity / minimum / position block) is more informative than a
  // plain "no comparison leader", so prefer it deterministically (buffer lane first on a tie).
  if (decision.status !== "ready" || !decision.selectedPlan) {
    const GENERIC = new Set(["no_buffer_comparison_leader", "no_excess_comparison_leader", "no_ready_lane"]);
    const laneReasons = [decision.bufferLaneEvaluation.noPlanReason, decision.excessLaneEvaluation.noPlanReason].filter((r): r is NonNullable<typeof r> => r != null);
    const noPlanReason = laneReasons.find((r) => !GENERIC.has(r)) ?? laneReasons[0];
    return {
      suggestion: null,
      meta: null,
      diagnostic: {
        ...diagnosticBase,
        emitted: false,
        suppressionStage: "planning",
        reason: noPlanReason ?? (decision.status === "no_plan" ? "no_ready_lane" : decision.status),
        ...(noPlanReason ? { noPlanReason } : {}),
        actionable: false,
        topPickEligible: false,
      },
    };
  }

  const plan = decision.selectedPlan;

  // Step 16H-F fail-closed: never convert a plan whose own identity/amount is corrupted (`unstable_plan_id`
  // proves the id no longer matches its material inputs), nor a decision whose mirrored summary fields
  // disagree with the selected plan. Conflicting duplicates are REJECTED, never silently resolved in
  // favour of one side. 16G builds these consistently; this guards a tampered/malformed decision.
  const planIntegrity = validateYieldStrategyPlan(plan);
  const mirrorsAgree =
    decision.planCount === 1 &&
    decision.selectedLane === plan.lane &&
    decision.selectedStrategyId === plan.strategyId &&
    decision.selectedAmountUsd === plan.amountUsd &&
    decision.selectedAmountCents === plan.amountCents;
  if (!planIntegrity.valid || !mirrorsAgree) {
    return {
      suggestion: null,
      meta: null,
      diagnostic: {
        ...diagnosticBase,
        emitted: false,
        suppressionStage: "suggestion_conversion",
        reason: !planIntegrity.valid ? `invalid_source_plan:${planIntegrity.errors.join("/")}` : "decision_plan_mismatch",
        selectedLane: plan.lane,
        lane: plan.lane,
        actionable: false,
        topPickEligible: false,
        sourcePlanId: plan.planId,
      },
    };
  }

  const meta = buildMeta(plan, options.apyProvenance);
  const id = stableYieldSuggestionId(plan.planId);

  const guardrails: SuggestionGuardrail[] = [
    { code: "pricing_available", status: "passed" },
    // The plan preserves the required buffer coverage + the direct-wallet floor (validated in 16G).
    { code: "buffer_protection", status: "passed" },
    { code: "min_trade_size", status: "passed" },
  ];

  const suggestion: EngineSuggestion = {
    id,
    category: "stable_yield",
    reason_codes: [primaryReasonCode(plan.lane)],
    title_key: `suggestion.stable_yield_plan.${plan.lane}.title`,
    description_key: `suggestion.stable_yield_plan.${plan.lane}.description`,
    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false, // set only by selectTopPick
    amount: { valueUsd: plan.amountUsd },
    from: { bucket: "stables" },
    scores: {
      // Deterministic, bounded, and derived only from the plan (no external portfolio data inferred).
      impact: round4(Math.min(plan.amountUsd / Math.max(plan.amountUsd + plan.projection.requiredBufferUsd, 1), 1)),
      urgency: 0.25,
      efficiency: 0.6,
    },
    guardrails,
    stableYieldPlan: meta,
    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };

  // Defensive: the built suggestion must be structurally valid; else suppress at conversion.
  const v = validateStableYieldPlanSuggestion(suggestion);
  if (!v.valid) {
    return {
      suggestion: null,
      meta: null,
      diagnostic: { ...diagnosticBase, emitted: false, suppressionStage: "suggestion_conversion", reason: `invalid_suggestion:${v.errors.join("/")}`, selectedLane: plan.lane, lane: plan.lane, actionable: false, topPickEligible: false, sourcePlanId: plan.planId },
    };
  }

  return {
    suggestion,
    meta,
    diagnostic: {
      ...diagnosticBase,
      emitted: true,
      suppressionStage: "none",
      reason: primaryReasonCode(plan.lane),
      selectedLane: plan.lane,
      lane: plan.lane,
      actionable: true,
      // Top-Pick eligibility mirrors selectTopPick's rule (actionable + review_only + not on_track).
      topPickEligible: true,
      suggestionId: id,
      sourcePlanId: plan.planId,
    },
  };
}

/** Validate a plan-backed Stable Yield suggestion. Fails closed on any execution/identity/flag issue. */
export function validateStableYieldPlanSuggestion(suggestion: unknown): StableYieldPlanSuggestionValidationResult {
  const errors: string[] = [];
  if (!suggestion || typeof suggestion !== "object") return { valid: false, errors: ["suggestion_not_an_object"] };
  const s = suggestion as EngineSuggestion;
  if (s.category !== "stable_yield") errors.push("wrong_category");
  if (!s.id.startsWith(YIELD_STRATEGY_SUGGESTION_ID_PREFIX)) errors.push("wrong_id_prefix");
  if (s.reason_codes.length !== 1) errors.push("reason_not_singular");
  if (!(s.reason_codes[0] === "stable_yield_buffer_lane_ready" || s.reason_codes[0] === "stable_yield_excess_lane_ready")) errors.push("invalid_reason_code");
  if (s.action_kind !== "review_only") errors.push("action_kind_not_review_only");
  if (s.is_actionable !== true) errors.push("not_actionable");
  if (s.is_top_pick !== false) errors.push("top_pick_preset");
  const m = s.stableYieldPlan;
  if (!m) return { valid: errors.length === 0 ? false : false, errors: [...errors, "missing_meta"] };
  if (m.schemaVersion !== YIELD_STRATEGY_SUGGESTION_SCHEMA_VERSION) errors.push("wrong_meta_schema");
  if (!m.sourcePlanId || !s.id.endsWith(m.sourcePlanId)) errors.push("id_plan_mismatch");
  if (m.lane !== "buffer" && m.lane !== "excess") errors.push("invalid_lane");
  if ((m.lane === "buffer" && s.reason_codes[0] !== "stable_yield_buffer_lane_ready") || (m.lane === "excess" && s.reason_codes[0] !== "stable_yield_excess_lane_ready")) errors.push("lane_reason_mismatch");
  if (m.fundingSource !== "direct_wallet_usdc") errors.push("invalid_funding_source");
  if (s.amount?.valueUsd !== m.amountUsd) errors.push("amount_mismatch");
  if (m.amountCents !== Math.round(m.amountUsd * 100)) errors.push("amount_cents_mismatch");
  if (m.projection.bufferCoveragePreserved !== true || m.projection.walletFloorPreserved !== true) errors.push("projection_not_preserving_buffer");
  // Read-only / non-custodial flags must be pinned.
  const flagsOk = m.readOnly === true && m.externalManagementRequired === true && m.updatesProductOutput === false && m.executionPrepared === false && m.transactionBuilt === false && m.transactionsEnabled === false && m.walletSignatureRequired === false;
  if (!flagsOk) errors.push("capability_flag_invalid");
  // No execution/transaction keys leaked onto the suggestion object.
  const forbidden = ["transaction", "signature", "instruction", "route", "swapQuote", "executionPayload", "deepLink"];
  for (const k of forbidden) if (k in (s as unknown as Record<string, unknown>)) errors.push(`forbidden_field_${k}`);
  return { valid: errors.length === 0, errors };
}

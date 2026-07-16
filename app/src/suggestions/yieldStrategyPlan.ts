/**
 * yieldStrategyPlan — Step 16G. The deterministic single read-only Stable Yield plan engine: evaluates
 * the buffer + excess lanes independently, applies deterministic lane priority (buffer > excess),
 * requires a real 16E comparison leader (no fallback), consumes the 16F leader-position status for
 * start-vs-add, applies lane/product minimums + product deposit capacity + exact-cent flooring, builds
 * a before/after projection that preserves the Safety Buffer + wallet floor, and produces AT MOST ONE
 * plan funded ONLY by direct liquid USDC. It reruns no comparison, switches/withdraws nothing, and
 * generates no suggestion / UI / deep link / transaction / signature.
 */
import {
  YIELD_STRATEGY_PLAN_POLICY_ID,
  YIELD_STRATEGY_PLAN_POLICY_VERSION,
  YIELD_STRATEGY_PLAN_SCHEMA_VERSION,
  type YieldStrategyLaneEvaluation,
  type YieldStrategyPlan,
  type YieldStrategyPlanActionMode,
  type YieldStrategyPlanDecision,
  type YieldStrategyPlanProjection,
  type YieldStrategyPlanValidationResult,
} from "./yieldStrategyPlanTypes";
import {
  buildYieldStrategyPlanId,
  effectiveMaximumUsd,
  effectiveMinimumUsd,
  floorToExactCents,
  laneMinimumUsd,
  usdToCents,
  YIELD_STRATEGY_PLAN_EXCESS_MINIMUM_USD,
} from "./yieldStrategyPlanPolicy";
import {
  capacityFreshness,
  effectiveProductCapacityUsd,
  validateYieldStrategyProductCapacitySnapshot,
  type YieldStrategyProductCapacitySnapshot,
} from "./yieldStrategyProductCapacity";
import { listYieldStrategies } from "./yieldStrategyRegistry";
import type { YieldStrategyEligibilityLane, YieldStrategyEligibilitySet } from "./yieldStrategyEligibilityTypes";
import type { YieldStrategyComparisonSet } from "./yieldStrategyComparisonTypes";
import type { YieldStrategyEligibleCapitalSnapshot } from "./yieldStrategyPositionTypes";
import type { YieldStrategyRegistryEntry } from "./yieldStrategyRegistryTypes";

export const YIELD_STRATEGY_PLAN_EXISTS = true;
export const YIELD_STRATEGY_PLAN_SELECTION_EXISTS = true;
export const YIELD_STRATEGY_PLAN_AMOUNT_SELECTION_EXISTS = true;

const isFiniteNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export interface BuildYieldStrategyPlanDecisionInput {
  ownerAddress: string;
  checkedAt: string;
  registry?: YieldStrategyRegistryEntry[];
  eligibilitySet: YieldStrategyEligibilitySet;
  comparisonSet: YieldStrategyComparisonSet;
  capitalSnapshot: YieldStrategyEligibleCapitalSnapshot;
  productCapacitySet?: YieldStrategyProductCapacitySnapshot[];
  /** A future canonical Safety-Buffer-Yield minimum. Absent → the buffer lane fails closed. */
  bufferMinimumOverrideUsd?: number;
}

interface LaneCtx {
  lane: YieldStrategyEligibilityLane;
  input: BuildYieldStrategyPlanDecisionInput;
  registry: YieldStrategyRegistryEntry[];
  capacityByStrategy: Map<string, YieldStrategyProductCapacitySnapshot>;
}

function emptyEval(lane: YieldStrategyEligibilityLane, comparisonStatus: string, leaderReason: string): YieldStrategyLaneEvaluation {
  return { lane, status: "no_comparison_leader", comparisonStatus, leaderSelectionReason: leaderReason, leaderPositionStatus: "no_comparison_leader", laneCapitalUsd: 0, blockers: [], warnings: [], notes: [] };
}

function buildProjection(amount: number, cap: YieldStrategyEligibleCapitalSnapshot, leaderCountsBuffer: boolean, laneCap: number): YieldStrategyPlanProjection {
  const directLiquidUsdcBeforeUsd = cap.directLiquidUsdcUsd;
  const directWalletEligibleBufferBeforeUsd = cap.directWalletEligibleBufferUsd;
  const existingEligibleBufferYieldBeforeUsd = cap.existingEligibleBufferYieldUsd;
  const currentEligibleBufferBeforeUsd = cap.currentEligibleBufferUsd;

  const directWalletEligibleBufferAfterUsd = directWalletEligibleBufferBeforeUsd - amount;
  const existingEligibleBufferYieldAfterUsd = leaderCountsBuffer ? existingEligibleBufferYieldBeforeUsd + amount : existingEligibleBufferYieldBeforeUsd;
  const currentEligibleBufferAfterUsd = directWalletEligibleBufferAfterUsd + existingEligibleBufferYieldAfterUsd;

  return {
    directLiquidUsdcBeforeUsd,
    directLiquidUsdcAfterUsd: directLiquidUsdcBeforeUsd - amount,
    directWalletEligibleBufferBeforeUsd,
    directWalletEligibleBufferAfterUsd,
    existingEligibleBufferYieldBeforeUsd,
    existingEligibleBufferYieldAfterUsd,
    currentEligibleBufferBeforeUsd,
    currentEligibleBufferAfterUsd,
    requiredBufferUsd: cap.requiredBufferUsd,
    requiredWalletFloorUsd: cap.requiredWalletFloorUsd,
    selectedProductCountsTowardBuffer: leaderCountsBuffer,
    bufferCoveragePreserved: currentEligibleBufferAfterUsd >= cap.requiredBufferUsd - 1e-9,
    walletFloorPreserved: directWalletEligibleBufferAfterUsd >= cap.requiredWalletFloorUsd - 1e-9,
    remainingLaneCapitalUsd: Math.max(0, laneCap - amount),
  };
}

function evaluateLane(ctx: LaneCtx): YieldStrategyLaneEvaluation {
  const { lane, input, registry } = ctx;
  const cap = input.capitalSnapshot;
  const comparison = lane === "buffer" ? input.comparisonSet.bufferComparison : input.comparisonSet.excessComparison;
  const laneCap = lane === "buffer" ? cap.bufferYieldEligibleCapitalUsd : cap.excessYieldEligibleCapitalUsd;
  const leaderPos = lane === "buffer" ? cap.bufferLeaderPositionStatus : cap.excessLeaderPositionStatus;
  const blockers: string[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];
  const base = { lane, comparisonStatus: comparison.status, leaderSelectionReason: comparison.leaderSelectionReason, leaderPositionStatus: leaderPos.status, laneCapitalUsd: laneCap };

  // ---- Gate: a real, stable comparison leader is required (no fallback) ----
  const leaderId = comparison.comparisonLeaderStrategyId;
  const leaderAccepted = (comparison.status === "single_eligible_candidate" || comparison.status === "complete") && (comparison.leaderSelectionReason === "only_eligible_candidate" || comparison.leaderSelectionReason === "highest_stable_score") && !!leaderId;
  if (!leaderAccepted) {
    const e = emptyEval(lane, comparison.status, comparison.leaderSelectionReason);
    e.leaderPositionStatus = leaderPos.status;
    e.noPlanReason = comparison.status === "leader_withheld_tie" ? "comparison_leader_withheld_tie"
      : comparison.status === "leader_withheld_sensitivity" ? "comparison_leader_withheld_sensitivity"
        : comparison.status === "leader_withheld_incomparable_data" ? "comparison_leader_withheld_incomparable_data"
          : lane === "buffer" ? "no_buffer_comparison_leader" : "no_excess_comparison_leader";
    return e;
  }

  // ---- Gate: exact leader identity (approved + documented address + eligible in this lane) ----
  const entry = registry.find((x) => x.strategyId === leaderId);
  if (!entry || entry.lifecycle !== "approved" || !entry.address) { blockers.push("leader_not_approved_or_no_address"); return { ...base, status: "blocked", blockers, warnings, notes }; }
  const laneEligible = lane === "buffer" ? input.eligibilitySet.bufferEligibleStrategyIds.includes(leaderId!) : input.eligibilitySet.excessEligibleStrategyIds.includes(leaderId!);
  if (!laneEligible) { blockers.push("leader_not_eligible_in_lane"); return { ...base, status: "blocked", blockers, warnings, notes }; }

  // ---- Gate: leader-position status → action mode ----
  if (leaderPos.status === "leader_position_ambiguous") return { ...base, status: "leader_position_ambiguous", noPlanReason: "leader_position_ambiguous", blockers: ["leader_position_ambiguous"], warnings, notes };
  if (leaderPos.status === "leader_position_unavailable") return { ...base, status: "leader_position_unavailable", noPlanReason: "leader_position_unavailable", blockers: ["leader_position_unavailable"], warnings, notes };
  const actionMode: YieldStrategyPlanActionMode = leaderPos.status === "leader_held" || leaderPos.status === "leader_held_multiple_positions" ? "add_to_existing_strategy" : "start_new_position";
  if (leaderPos.status === "leader_held_multiple_positions") notes.push("multiple existing accounts detected on the leader strategy; no specific protocol account is selected");

  // ---- Gate: lane capital ----
  if (!(isFiniteNum(laneCap) && laneCap > 0)) return { ...base, status: "no_eligible_capital", noPlanReason: lane === "buffer" ? "buffer_capital_unavailable" : "excess_capital_unavailable", actionMode, blockers, warnings, notes };

  // ---- Gate: lane minimum policy ----
  const laneMin = laneMinimumUsd(lane, input.bufferMinimumOverrideUsd);
  if (lane === "buffer" && laneMin === undefined) return { ...base, status: "buffer_minimum_policy_missing", noPlanReason: "buffer_yield_minimum_policy_missing", actionMode, laneMinimumUsd: undefined, blockers: ["buffer_yield_minimum_policy_missing"], warnings, notes };

  // ---- Gate: exact product deposit capacity ----
  const capacity = ctx.capacityByStrategy.get(leaderId!);
  if (!capacity) return { ...base, status: "product_capacity_unavailable", noPlanReason: "product_capacity_missing", actionMode, blockers, warnings, notes };
  const capV = validateYieldStrategyProductCapacitySnapshot(capacity, { strategyId: entry.strategyId, protocolId: entry.protocolId, productAddress: entry.address, principalAssetId: entry.principalAsset });
  if (!capV.valid) return { ...base, status: "invalid", noPlanReason: "product_capacity_unknown", actionMode, blockers: capV.errors, warnings, notes };
  const fresh = capacityFreshness(capacity, lane);
  if (fresh !== "fresh") return { ...base, status: "product_capacity_unavailable", noPlanReason: fresh === "stale" ? "product_capacity_stale" : "product_capacity_unknown", actionMode, capacityMode: capacity.capacityMode, blockers, warnings, notes };
  if (capacity.capacityMode === "product_full") return { ...base, status: "product_capacity_unavailable", noPlanReason: "product_full", actionMode, capacityMode: capacity.capacityMode, blockers, warnings, notes };
  if (capacity.capacityMode === "deposits_paused" || !capacity.acceptingDeposits) return { ...base, status: "product_capacity_unavailable", noPlanReason: "deposits_paused", actionMode, capacityMode: capacity.capacityMode, blockers, warnings, notes };
  if (capacity.capacityMode === "unavailable" || capacity.capacityMode === "unknown" || capacity.capacityMode === "invalid") return { ...base, status: "product_capacity_unavailable", noPlanReason: "product_capacity_unknown", actionMode, capacityMode: capacity.capacityMode, blockers, warnings, notes };

  // ---- Effective bounds + candidate amount ----
  const effCapacity = effectiveProductCapacityUsd(capacity, laneCap);
  const laneSubCaps = lane === "buffer"
    ? [laneCap, cap.directLiquidUsdcUsd, cap.maximumCombinedSourceCapitalUsd, cap.remainingBufferYieldCapacityUsd]
    : [laneCap, cap.directLiquidUsdcUsd, cap.maximumCombinedSourceCapitalUsd, cap.canonicalBufferSurplusUsd];
  const effMax = effectiveMaximumUsd([...laneSubCaps, effCapacity, capacity.maximumDepositUsd]);
  const effMin = effectiveMinimumUsd(laneMin, capacity.minimumDepositUsd);
  const candidateAmountUsd = floorToExactCents(effMax);
  const candidateAmountCents = usdToCents(effMax);

  if (!(candidateAmountUsd > 0)) return { ...base, status: "no_eligible_capital", noPlanReason: lane === "buffer" ? "buffer_capital_unavailable" : "excess_capital_unavailable", actionMode, effectiveMaximumUsd: effMax, effectiveMinimumUsd: effMin, capacityMode: capacity.capacityMode, blockers, warnings, notes };
  if (candidateAmountUsd + 1e-9 < effMin) {
    const capacityBinding = effCapacity < effMin || (isFiniteNum(capacity.maximumDepositUsd) && (capacity.maximumDepositUsd as number) < effMin);
    return { ...base, status: capacityBinding ? "product_capacity_insufficient" : "below_minimum", noPlanReason: capacityBinding ? "minimum_deposit_not_met" : lane === "buffer" ? "buffer_amount_below_minimum" : "excess_amount_below_minimum", actionMode, effectiveMaximumUsd: effMax, effectiveMinimumUsd: effMin, effectiveProductCapacityUsd: effCapacity, candidateAmountUsd, candidateAmountCents, capacityMode: capacity.capacityMode, blockers, warnings, notes };
  }

  // ---- Projection ----
  const leaderCountsBuffer = lane === "buffer" ? true : input.eligibilitySet.bufferEligibleStrategyIds.includes(leaderId!);
  const projection = buildProjection(candidateAmountUsd, cap, leaderCountsBuffer, laneCap);
  if (!projection.bufferCoveragePreserved || !projection.walletFloorPreserved) { blockers.push("projection_violates_buffer_or_floor"); return { ...base, status: "blocked", actionMode, projection, effectiveMaximumUsd: effMax, effectiveMinimumUsd: effMin, candidateAmountUsd, candidateAmountCents, capacityMode: capacity.capacityMode, blockers, warnings, notes }; }

  // ---- Build the read-only plan ----
  const plan: YieldStrategyPlan = {
    schemaVersion: YIELD_STRATEGY_PLAN_SCHEMA_VERSION,
    policyId: YIELD_STRATEGY_PLAN_POLICY_ID,
    policyVersion: YIELD_STRATEGY_PLAN_POLICY_VERSION,
    planId: buildYieldStrategyPlanId({ ownerAddress: input.ownerAddress, lane, actionMode, strategyId: entry.strategyId, productAddress: entry.address, amountCents: candidateAmountCents }),
    status: "ready",
    ownerAddress: input.ownerAddress,
    checkedAt: input.checkedAt,
    lane,
    actionMode,
    strategyId: entry.strategyId,
    displayName: entry.displayName,
    protocolId: entry.protocolId,
    protocolDisplayName: entry.protocolDisplayName,
    productAddress: entry.address,
    principalAssetId: entry.principalAsset,
    comparisonStatus: comparison.status,
    comparisonLeaderReason: comparison.leaderSelectionReason,
    ...(isFiniteNum(comparison.comparisonLeaderScore) ? { comparisonLeaderScore: comparison.comparisonLeaderScore } : {}),
    leaderPositionStatus: leaderPos.status,
    source: { type: "direct_wallet_usdc", assetId: "USDC", availableUsd: cap.directLiquidUsdcUsd },
    amountUsd: candidateAmountUsd,
    amountCents: candidateAmountCents,
    laneCapitalUsd: laneCap,
    effectiveProductCapacityUsd: effCapacity,
    effectiveMinimumUsd: effMin,
    effectiveMaximumUsd: effMax,
    capacityMode: capacity.capacityMode,
    capacitySourceId: capacity.sourceId,
    capacityFetchedAt: capacity.fetchedAt,
    projection,
    readOnly: true,
    productSelected: true,
    amountSelected: true,
    planGenerated: true,
    suggestionGenerated: false,
    updatesProductOutput: false,
    executionPrepared: false,
    transactionBuilt: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    warnings,
    blockers: [],
    notes,
  };

  return { ...base, status: "ready", actionMode, laneMinimumUsd: laneMin, effectiveMinimumUsd: effMin, effectiveMaximumUsd: effMax, effectiveProductCapacityUsd: effCapacity, candidateAmountUsd, candidateAmountCents, capacityMode: capacity.capacityMode, projection, candidatePlan: plan, blockers, warnings, notes };
}

/** Build the single read-only Stable Yield plan decision (≤1 plan; buffer > excess priority). */
export function buildYieldStrategyPlanDecision(input: BuildYieldStrategyPlanDecisionInput): YieldStrategyPlanDecision {
  const registry = input.registry ?? listYieldStrategies();
  const capacityByStrategy = new Map<string, YieldStrategyProductCapacitySnapshot>();
  for (const c of input.productCapacitySet ?? []) if (!capacityByStrategy.has(c.strategyId)) capacityByStrategy.set(c.strategyId, c);

  const bufferEval = evaluateLane({ lane: "buffer", input, registry, capacityByStrategy });
  const excessEval = evaluateLane({ lane: "excess", input, registry, capacityByStrategy });

  let selectedLane: YieldStrategyEligibilityLane | undefined;
  let selectedPlan: YieldStrategyPlan | undefined;
  if (bufferEval.status === "ready" && bufferEval.candidatePlan) {
    selectedLane = "buffer"; selectedPlan = bufferEval.candidatePlan;
    if (excessEval.status === "ready") { excessEval.status = "suppressed_by_higher_priority_lane"; excessEval.candidatePlan = undefined; excessEval.notes = [...excessEval.notes, "suppressed: a higher-priority buffer-yield plan is ready and both lanes share the same direct-wallet USDC source"]; }
  } else if (excessEval.status === "ready" && excessEval.candidatePlan) {
    selectedLane = "excess"; selectedPlan = excessEval.candidatePlan;
  }

  const anyInvalid = bufferEval.status === "invalid" || excessEval.status === "invalid" || input.capitalSnapshot.status === "invalid";
  const anyBlocked = bufferEval.status === "blocked" || excessEval.status === "blocked";
  const status: YieldStrategyPlanDecision["status"] = selectedPlan ? "ready" : anyInvalid ? "invalid" : anyBlocked ? "blocked" : "no_plan";

  const unselectedLane: YieldStrategyEligibilityLane | undefined = selectedLane === "buffer" ? "excess" : selectedLane === "excess" ? "buffer" : undefined;
  const notes: string[] = ["At most one plan is created; lane-level capacities share the same direct-wallet USDC source and are never added."];
  if (input.capitalSnapshot.status === "buffer_incomplete") notes.push("Safety Buffer is incomplete — both lanes are blocked upstream by the 16F capital snapshot.");

  return {
    schemaVersion: YIELD_STRATEGY_PLAN_SCHEMA_VERSION,
    policyId: YIELD_STRATEGY_PLAN_POLICY_ID,
    policyVersion: YIELD_STRATEGY_PLAN_POLICY_VERSION,
    ownerAddress: input.ownerAddress,
    checkedAt: input.checkedAt,
    status,
    bufferLaneEvaluation: bufferEval,
    excessLaneEvaluation: excessEval,
    ...(selectedLane ? { selectedLane } : {}),
    ...(selectedPlan ? { selectedPlan } : {}),
    ...(selectedPlan ? { selectedStrategyId: selectedPlan.strategyId, selectedAmountUsd: selectedPlan.amountUsd, selectedAmountCents: selectedPlan.amountCents } : {}),
    planCount: selectedPlan ? 1 : 0,
    ...(selectedPlan ? { selectedLaneCapitalUsd: selectedPlan.laneCapitalUsd } : {}),
    ...(unselectedLane ? { unselectedLane, unselectedLaneStatus: unselectedLane === "excess" ? excessEval.status : bufferEval.status } : {}),
    sharedSourceOverlapUsd: input.capitalSnapshot.sharedSourceOverlapUsd,
    sharedSourceResolvedBySinglePlan: true,
    productSelected: !!selectedPlan,
    amountSelected: !!selectedPlan,
    planGenerated: !!selectedPlan,
    suggestionGenerated: false,
    updatesProductOutput: false,
    executionPrepared: false,
    transactionBuilt: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    warnings: [],
    blockers: selectedPlan ? [] : [...bufferEval.blockers, ...excessEval.blockers],
    notes,
  };
}

/* ------------------------------------------------------------------ *
 * Validators (fail closed).
 * ------------------------------------------------------------------ */
export function validateYieldStrategyPlan(plan: unknown): YieldStrategyPlanValidationResult {
  const errors: string[] = [];
  if (!plan || typeof plan !== "object") return { valid: false, errors: ["plan_not_an_object"] };
  const p = plan as YieldStrategyPlan;
  if (p.schemaVersion !== YIELD_STRATEGY_PLAN_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (p.policyId !== YIELD_STRATEGY_PLAN_POLICY_ID) errors.push("wrong_policy_id");
  if (p.status !== "ready") errors.push("plan_not_ready");
  if (p.lane !== "buffer" && p.lane !== "excess") errors.push("invalid_lane");
  if (p.actionMode !== "start_new_position" && p.actionMode !== "add_to_existing_strategy") errors.push("invalid_action_mode");
  if (p.source?.type !== "direct_wallet_usdc" || p.source?.assetId !== "USDC") errors.push("invalid_source");
  if (p.readOnly !== true) errors.push("not_read_only");
  const flagsOk = p.productSelected === true && p.amountSelected === true && p.planGenerated === true && p.suggestionGenerated === false && p.updatesProductOutput === false && p.executionPrepared === false && p.transactionBuilt === false && p.transactionsEnabled === false && p.walletSignatureRequired === false;
  if (!flagsOk) errors.push("capability_flag_invalid");
  // Amount bounds.
  if (!(isFiniteNum(p.amountUsd) && p.amountUsd > 0)) errors.push("invalid_amount");
  if (Math.abs(Math.round(p.amountUsd * 100) - p.amountUsd * 100) > 1e-6) errors.push("cents_precision_violation");
  if (p.amountCents !== Math.round(p.amountUsd * 100)) errors.push("amount_cents_mismatch");
  if (p.amountUsd > p.effectiveMaximumUsd + 1e-9) errors.push("amount_exceeds_effective_maximum");
  if (p.amountUsd > p.laneCapitalUsd + 1e-9) errors.push("amount_exceeds_lane_capital");
  if (p.amountUsd + 1e-9 < p.effectiveMinimumUsd) errors.push("amount_below_effective_minimum");
  if (p.amountUsd > p.source.availableUsd + 1e-9) errors.push("amount_exceeds_direct_usdc");
  if (p.lane === "excess" && p.amountUsd + 1e-9 < YIELD_STRATEGY_PLAN_EXCESS_MINIMUM_USD) errors.push("excess_below_250");
  // Projection safety.
  if (p.projection.bufferCoveragePreserved !== true) errors.push("buffer_coverage_not_preserved");
  if (p.projection.walletFloorPreserved !== true) errors.push("wallet_floor_not_preserved");
  if (p.projection.currentEligibleBufferAfterUsd + 1e-9 < p.projection.requiredBufferUsd) errors.push("projected_buffer_below_required");
  if (p.projection.directWalletEligibleBufferAfterUsd + 1e-9 < p.projection.requiredWalletFloorUsd) errors.push("projected_wallet_below_floor");
  // action-mode ↔ leader-position consistency.
  if (p.actionMode === "add_to_existing_strategy" && !(p.leaderPositionStatus === "leader_held" || p.leaderPositionStatus === "leader_held_multiple_positions")) errors.push("add_without_held_leader");
  if (p.actionMode === "start_new_position" && p.leaderPositionStatus !== "leader_not_held") errors.push("start_with_held_leader");
  // Stable id recomputation.
  const expectedId = buildYieldStrategyPlanId({ ownerAddress: p.ownerAddress, lane: p.lane, actionMode: p.actionMode, strategyId: p.strategyId, productAddress: p.productAddress, amountCents: p.amountCents });
  if (p.planId !== expectedId) errors.push("unstable_plan_id");
  return { valid: errors.length === 0, errors };
}

export function validateYieldStrategyPlanDecision(decision: unknown): YieldStrategyPlanValidationResult {
  const errors: string[] = [];
  if (!decision || typeof decision !== "object") return { valid: false, errors: ["decision_not_an_object"] };
  const d = decision as YieldStrategyPlanDecision;
  if (d.schemaVersion !== YIELD_STRATEGY_PLAN_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (d.planCount !== 0 && d.planCount !== 1) errors.push("invalid_plan_count");
  if (d.planCount > 1) errors.push("more_than_one_plan");
  const flagsOff = d.suggestionGenerated === false && d.updatesProductOutput === false && d.executionPrepared === false && d.transactionBuilt === false && d.transactionsEnabled === false && d.walletSignatureRequired === false;
  if (!flagsOff) errors.push("capability_flag_enabled");
  if (d.status === "ready") {
    if (!d.selectedPlan) errors.push("ready_without_plan");
    if (d.planCount !== 1) errors.push("ready_plan_count_not_one");
    if (!d.productSelected || !d.amountSelected || !d.planGenerated) errors.push("ready_without_selection_flags");
    if (d.selectedPlan) { const v = validateYieldStrategyPlan(d.selectedPlan); if (!v.valid) errors.push(`selected_plan:${v.errors.join("/")}`); }
    if (d.selectedPlan && (d.selectedStrategyId !== d.selectedPlan.strategyId || d.selectedAmountCents !== d.selectedPlan.amountCents)) errors.push("selected_fields_mismatch");
    // Both lanes can never both be a selected ready plan.
    if (d.bufferLaneEvaluation.status === "ready" && d.excessLaneEvaluation.status === "ready") errors.push("both_lanes_selected");
  } else {
    if (d.selectedPlan || d.productSelected || d.amountSelected || d.selectedStrategyId || d.selectedAmountUsd !== undefined) errors.push("no_plan_with_selection");
  }
  if (d.sharedSourceResolvedBySinglePlan !== true) errors.push("shared_source_not_resolved");
  return { valid: errors.length === 0, errors };
}

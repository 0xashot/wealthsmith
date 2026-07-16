/**
 * yieldStrategyPlanDiagnostics — Step 16G. Deterministic, read-only diagnostics for a plan decision,
 * plus recommendation-free explanations. Reports facts only — never best / safest / winner /
 * recommended / you should / move your funds / deposit now / guaranteed / risk-free.
 */
import type { YieldStrategyPlanDecision } from "./yieldStrategyPlanTypes";

export interface YieldStrategyPlanDiagnostics {
  decisionStatus: string;
  planCount: 0 | 1;
  selectedLane: string | null;
  selectedStrategyId: string | null;
  selectedProductAddress: string | null;
  comparisonLeaderReason: string | null;
  actionMode: string | null;
  leaderPositionStatus: string | null;
  laneEligibleCapitalUsd: { buffer: number; excess: number };
  productCapacityMode: string | null;
  effectiveProductCapacityUsd: number | null;
  laneMinimumUsd: number | null;
  productMinimumUsd: number | null;
  effectiveMinimumUsd: number | null;
  effectiveMaximumUsd: number | null;
  selectedAmountUsd: number | null;
  selectedAmountCents: number | null;
  sourceType: string | null;
  sourceAvailableUsd: number | null;
  sharedSourceOverlapUsd: number;
  suppressedAlternativeLane: string | null;
  unselectedLaneStatus: string | null;
  bufferBeforeUsd: number | null;
  bufferAfterUsd: number | null;
  walletFloorPreserved: boolean | null;
  bufferCoveragePreserved: boolean | null;
  planId: string | null;
  bufferNoPlanReason: string | null;
  excessNoPlanReason: string | null;
  blockers: string[];
  warnings: string[];
  suggestionGenerated: false;
  updatesProductOutput: false;
  executionPrepared: false;
  transactionBuilt: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

export function getYieldStrategyPlanDiagnostics(d: YieldStrategyPlanDecision): YieldStrategyPlanDiagnostics {
  const p = d.selectedPlan;
  return {
    decisionStatus: d.status,
    planCount: d.planCount,
    selectedLane: d.selectedLane ?? null,
    selectedStrategyId: p?.strategyId ?? null,
    selectedProductAddress: p?.productAddress ?? null,
    comparisonLeaderReason: p?.comparisonLeaderReason ?? null,
    actionMode: p?.actionMode ?? null,
    leaderPositionStatus: p?.leaderPositionStatus ?? null,
    laneEligibleCapitalUsd: { buffer: d.bufferLaneEvaluation.laneCapitalUsd, excess: d.excessLaneEvaluation.laneCapitalUsd },
    productCapacityMode: p?.capacityMode ?? null,
    effectiveProductCapacityUsd: p?.effectiveProductCapacityUsd ?? null,
    laneMinimumUsd: (d.selectedLane === "buffer" ? d.bufferLaneEvaluation.laneMinimumUsd : d.excessLaneEvaluation.laneMinimumUsd) ?? null,
    productMinimumUsd: null,
    effectiveMinimumUsd: p?.effectiveMinimumUsd ?? null,
    effectiveMaximumUsd: p?.effectiveMaximumUsd ?? null,
    selectedAmountUsd: d.selectedAmountUsd ?? null,
    selectedAmountCents: d.selectedAmountCents ?? null,
    sourceType: p?.source.type ?? null,
    sourceAvailableUsd: p?.source.availableUsd ?? null,
    sharedSourceOverlapUsd: d.sharedSourceOverlapUsd,
    suppressedAlternativeLane: d.excessLaneEvaluation.status === "suppressed_by_higher_priority_lane" ? "excess" : null,
    unselectedLaneStatus: d.unselectedLaneStatus ?? null,
    bufferBeforeUsd: p?.projection.currentEligibleBufferBeforeUsd ?? null,
    bufferAfterUsd: p?.projection.currentEligibleBufferAfterUsd ?? null,
    walletFloorPreserved: p?.projection.walletFloorPreserved ?? null,
    bufferCoveragePreserved: p?.projection.bufferCoveragePreserved ?? null,
    planId: p?.planId ?? null,
    bufferNoPlanReason: d.bufferLaneEvaluation.noPlanReason ?? null,
    excessNoPlanReason: d.excessLaneEvaluation.noPlanReason ?? null,
    blockers: d.blockers,
    warnings: d.warnings,
    suggestionGenerated: false,
    updatesProductOutput: false,
    executionPrepared: false,
    transactionBuilt: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

/** Recommendation-free explanation of the decision. */
export function explainYieldStrategyPlanDecision(d: YieldStrategyPlanDecision): string {
  const p = d.selectedPlan;
  if (p && d.selectedLane === "buffer") {
    return `A read-only buffer-yield plan is available for $${p.amountUsd.toFixed(2)} of direct wallet USDC. The destination is the current comparison leader for the Safety Buffer lane${p.actionMode === "add_to_existing_strategy" ? " — the wallet already holds it, so the plan adds to the same exact strategy" : ""}.`;
  }
  if (p && d.selectedLane === "excess") {
    if (p.actionMode === "add_to_existing_strategy") return `The wallet already holds the current excess-lane comparison leader, so the plan adds $${p.amountUsd.toFixed(2)} of eligible direct wallet USDC to the same exact strategy.`;
    return `A read-only excess-yield plan is available for $${p.amountUsd.toFixed(2)} of direct wallet USDC. The destination is the current comparison leader for the Excess USDC lane.`;
  }
  if (d.excessLaneEvaluation.status === "suppressed_by_higher_priority_lane") return "The excess lane was not selected because a higher-priority Safety Buffer Yield plan is ready and both lanes rely on the same direct wallet USDC source.";
  const reason = d.bufferLaneEvaluation.noPlanReason ?? d.excessLaneEvaluation.noPlanReason ?? "no_ready_lane";
  if (reason === "comparison_leader_withheld_sensitivity") return "No plan was created because the comparison leader was withheld after sensitivity testing.";
  if (reason === "comparison_leader_withheld_tie") return "No plan was created because the top two strategies are within the material-tie threshold.";
  if (reason === "product_capacity_missing" || reason === "product_capacity_stale" || reason === "product_capacity_unknown") return "No plan was created because the exact product's current deposit capacity is unavailable.";
  if (reason === "excess_amount_below_minimum") return "No plan was created because the final excess amount is below the $250 minimum.";
  if (reason === "buffer_yield_minimum_policy_missing") return "No buffer-yield plan was created because no canonical Safety Buffer Yield deposit minimum is defined yet.";
  return "No plan was created because no lane is currently plan-ready.";
}

/**
 * solStakingSelectorActivationGate — Step 14X. The formal, deterministic activation-REVIEW gate.
 * It combines the Step 14W comparison, the Step 14X sensitivity analysis, the historical
 * analysis, and truthful operational readiness into a single activation-review decision — and
 * even its best outcome (`ready_for_human_activation_review`) ACTIVATES NOTHING. No status
 * changes `selectedProtocolId`, sets a product winner, updates UI / Top Pick / ordering, or
 * enables transactions/signatures.
 */
import type { SolStakingSelectorComparisonResult } from "./solStakingSelectorTypes";
import type { SolStakingSelectorSensitivityResult, SolStakingHistoricalSensitivityAnalysis } from "./solStakingSelectorSensitivityTypes";
import {
  SOL_STAKING_ACTIVATION_MIN_CONSECUTIVE_REFRESH_SUCCESSES,
  SOL_STAKING_ACTIVATION_MAX_REFRESH_INTERVAL_HOURS,
} from "./solStakingSelectorSensitivityPolicy";
import { JITOSOL_BETA_PROTOCOL_ID } from "./jitoSolBetaActivation";

export const SOL_STAKING_SELECTOR_ACTIVATION_GATE_EXISTS = true;
export const SOL_STAKING_SELECTOR_ACTIVATION_PERFORMED = false;
export const SOL_STAKING_SELECTOR_ACTIVATION_ENABLED = false;
export const SOL_STAKING_SELECTOR_UPDATES_SELECTED_PROTOCOL = false;
export const SOL_STAKING_SELECTOR_UPDATES_TOP_PICK = false;
export const SOL_STAKING_SELECTOR_UPDATES_ENGINE_ORDERING = false;
export const SOL_STAKING_SELECTOR_UPDATES_PRODUCT_UI = false;
export const SOL_STAKING_SELECTOR_ENABLES_TRANSACTIONS = false;
export const SOL_STAKING_SELECTOR_REQUIRES_SIGNATURE = false;

export type SolStakingActivationReviewStatus =
  | "ready_for_human_activation_review"
  | "blocked_invalid_input"
  | "blocked_insufficient_candidates"
  | "blocked_historical_coverage"
  | "blocked_leader_unstable"
  | "blocked_policy_sensitive"
  | "blocked_market_sensitive"
  | "blocked_operational_readiness"
  | "blocked_human_approval";

export interface SolStakingSelectorOperationalReadiness {
  scheduledRefreshConfigured: boolean;
  refreshIntervalHours?: number;
  consecutiveSuccessfulRefreshes: number;
  latestCacheFresh: boolean;
  repeatedSourceFailureAlertingConfigured: boolean;
  rollbackFlagAvailable: boolean;
  rollbackProcedureDocumented: boolean;
  regressionQaComplete: boolean;
  productCopyReviewComplete: boolean;
  humanPolicySignOff: boolean;
  humanActivationApproval: boolean;
  notes: string[];
}

export interface SolStakingSelectorActivationReviewDecision {
  status: SolStakingActivationReviewStatus;

  comparisonLeaderCandidateId?: string;
  currentSelectedCandidateId: string;
  leaderDiffersFromCurrentSelection: boolean;

  sensitivityPassed: boolean;
  historyPassed: boolean;
  operationalReadinessPassed: boolean;
  humanPolicySignOffPassed: boolean;
  humanActivationApprovalPassed: boolean;

  baselineMargin?: number;
  leaderRetentionRate?: number;
  historicalLeaderRetentionRate?: number;

  blockers: string[];
  warnings: string[];
  requiredActions: string[];

  activationPerformed: false;
  selectedProtocolIdChanged: false;
  winnerActivated: false;
  updatesLiveRecommendations: false;
  updatesProductUi: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

export interface EvaluateActivationGateInput {
  comparisonResult: SolStakingSelectorComparisonResult;
  sensitivityResult: SolStakingSelectorSensitivityResult;
  historicalAnalysis: SolStakingHistoricalSensitivityAnalysis;
  operationalReadiness: SolStakingSelectorOperationalReadiness;
}

/** Operational readiness passes only when every automated prerequisite is truthfully met. */
export function evaluateOperationalReadiness(o: SolStakingSelectorOperationalReadiness): { passed: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!o.scheduledRefreshConfigured) missing.push("scheduled_refresh_not_configured");
  if (!(typeof o.refreshIntervalHours === "number" && o.refreshIntervalHours <= SOL_STAKING_ACTIVATION_MAX_REFRESH_INTERVAL_HOURS)) missing.push("refresh_interval_too_high");
  if (o.consecutiveSuccessfulRefreshes < SOL_STAKING_ACTIVATION_MIN_CONSECUTIVE_REFRESH_SUCCESSES) missing.push("insufficient_consecutive_refresh_successes");
  if (!o.latestCacheFresh) missing.push("latest_cache_not_fresh");
  if (!o.repeatedSourceFailureAlertingConfigured) missing.push("source_failure_alerting_not_configured");
  if (!o.rollbackFlagAvailable) missing.push("rollback_flag_unavailable");
  if (!o.rollbackProcedureDocumented) missing.push("rollback_procedure_undocumented");
  if (!o.regressionQaComplete) missing.push("regression_qa_incomplete");
  if (!o.productCopyReviewComplete) missing.push("product_copy_review_incomplete");
  return { passed: missing.length === 0, missing };
}

/**
 * Evaluate the activation gate in strict order. The first failing gate sets the status; a
 * fully-passing evaluation reaches `ready_for_human_activation_review` — which still activates
 * nothing. Every activation flag on the decision is hard-`false`.
 */
export function evaluateSolStakingSelectorActivationGate(input: EvaluateActivationGateInput): SolStakingSelectorActivationReviewDecision {
  const { comparisonResult, sensitivityResult, historicalAnalysis, operationalReadiness } = input;
  const currentSelectedCandidateId = JITOSOL_BETA_PROTOCOL_ID;
  const leaderId = comparisonResult?.comparisonLeaderCandidateId;
  const opCheck = evaluateOperationalReadiness(operationalReadiness ?? ({} as SolStakingSelectorOperationalReadiness));

  const sensitivityPassed = Boolean(sensitivityResult?.leaderStable && !sensitivityResult?.policySensitive && !sensitivityResult?.marketSensitive);
  const historyPassed = Boolean(historicalAnalysis?.historyRequirementsPass);
  const operationalReadinessPassed = opCheck.passed;
  const humanPolicySignOffPassed = Boolean(operationalReadiness?.humanPolicySignOff);
  const humanActivationApprovalPassed = Boolean(operationalReadiness?.humanActivationApproval);

  const blockers: string[] = [];
  const requiredActions: string[] = [];
  let status: SolStakingActivationReviewStatus;

  const invalidInput = !comparisonResult || !sensitivityResult || !historicalAnalysis || comparisonResult.status === "invalid_input";
  const insufficient = !invalidInput && (comparisonResult.status !== "complete" || comparisonResult.eligibleCandidateIds.length < 2);

  if (invalidInput) {
    status = "blocked_invalid_input";
    blockers.push("invalid_input");
    requiredActions.push("Provide a complete comparison, sensitivity, and historical analysis.");
  } else if (insufficient) {
    status = "blocked_insufficient_candidates";
    blockers.push("insufficient_candidates");
    requiredActions.push("Ensure at least two selector-ready candidates with fresh, complete data.");
  } else if (!historyPassed) {
    status = "blocked_historical_coverage";
    blockers.push("historical_coverage_insufficient");
    requiredActions.push(`Collect >= ${12} valid snapshots spanning >= ${72}h from the scheduled refresh job.`);
  } else if (!sensitivityResult.leaderStable) {
    status = "blocked_leader_unstable";
    blockers.push("leader_unstable");
    requiredActions.push("Improve leader margin / retention until stability thresholds pass, or revise the policy.");
  } else if (sensitivityResult.policySensitive) {
    status = "blocked_policy_sensitive";
    blockers.push("policy_sensitive");
    requiredActions.push("Resolve policy sensitivity (weight review / sign-off) before activation review.");
  } else if (sensitivityResult.marketSensitive) {
    status = "blocked_market_sensitive";
    blockers.push("market_sensitive");
    requiredActions.push("Resolve market sensitivity (more history / wider margin) before activation review.");
  } else if (!operationalReadinessPassed) {
    status = "blocked_operational_readiness";
    blockers.push(...opCheck.missing);
    requiredActions.push("Complete operational readiness: scheduled refresh, alerting, rollback, regression QA, product-copy review.");
  } else if (!humanPolicySignOffPassed) {
    status = "blocked_human_approval";
    blockers.push("human_policy_sign_off_missing");
    requiredActions.push("Obtain explicit human policy sign-off.");
  } else if (!humanActivationApprovalPassed) {
    status = "blocked_human_approval";
    blockers.push("human_activation_approval_missing");
    requiredActions.push("Obtain explicit human activation approval to change selectedProtocolId.");
  } else {
    status = "ready_for_human_activation_review";
    requiredActions.push("Human reviewers may now decide on activation in a separate, explicitly-gated step. This decision performs no activation.");
  }

  return {
    status,
    ...(leaderId ? { comparisonLeaderCandidateId: leaderId } : {}),
    currentSelectedCandidateId,
    leaderDiffersFromCurrentSelection: leaderId != null && leaderId !== currentSelectedCandidateId,
    sensitivityPassed,
    historyPassed,
    operationalReadinessPassed,
    humanPolicySignOffPassed,
    humanActivationApprovalPassed,
    ...(typeof sensitivityResult?.scenarios?.find((s) => s.scenarioId === "baseline")?.leaderMargin === "number" ? { baselineMargin: sensitivityResult.scenarios.find((s) => s.scenarioId === "baseline")!.leaderMargin } : {}),
    ...(sensitivityResult?.leaderRetentionRate != null ? { leaderRetentionRate: sensitivityResult.leaderRetentionRate } : {}),
    ...(historicalAnalysis?.historicalLeaderRetentionRate != null ? { historicalLeaderRetentionRate: historicalAnalysis.historicalLeaderRetentionRate } : {}),
    blockers,
    warnings: [...(sensitivityResult?.warnings ?? [])],
    requiredActions,
    activationPerformed: false,
    selectedProtocolIdChanged: false,
    winnerActivated: false,
    updatesLiveRecommendations: false,
    updatesProductUi: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

export interface ActivationValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate the activation decision. Fails closed; `ready` is impossible if any gate fails. */
export function validateSolStakingSelectorActivationReviewDecision(decision: unknown): ActivationValidationResult {
  const errors: string[] = [];
  if (!decision || typeof decision !== "object") return { valid: false, errors: ["decision_not_an_object"] };
  const d = decision as SolStakingSelectorActivationReviewDecision;
  if (d.activationPerformed !== false || d.selectedProtocolIdChanged !== false || d.winnerActivated !== false || d.updatesProductUi !== false || d.updatesLiveRecommendations !== false || d.transactionsEnabled !== false || d.walletSignatureRequired !== false) errors.push("activation_flag_enabled");
  if (d.status === "ready_for_human_activation_review") {
    if (!(d.sensitivityPassed && d.historyPassed && d.operationalReadinessPassed && d.humanPolicySignOffPassed && d.humanActivationApprovalPassed)) errors.push("ready_without_all_gates");
    if (d.blockers.length > 0) errors.push("ready_with_blockers");
  } else {
    if (d.blockers.length === 0) errors.push("blocked_without_blocker");
  }
  return { valid: errors.length === 0, errors };
}

export interface ActivationReviewDiagnostics {
  status: string;
  comparisonLeader?: string;
  currentSelected: string;
  leaderDiffers: boolean;
  sensitivityPassed: boolean;
  historyPassed: boolean;
  operationalReadinessPassed: boolean;
  humanPolicySignOffPassed: boolean;
  humanActivationApprovalPassed: boolean;
  blockers: string[];
  requiredActions: string[];
}

/** Diagnostics for the activation review (no product-recommendation copy). */
export function getSolStakingActivationReviewDiagnostics(decision: SolStakingSelectorActivationReviewDecision): ActivationReviewDiagnostics {
  return {
    status: decision.status,
    ...(decision.comparisonLeaderCandidateId ? { comparisonLeader: decision.comparisonLeaderCandidateId } : {}),
    currentSelected: decision.currentSelectedCandidateId,
    leaderDiffers: decision.leaderDiffersFromCurrentSelection,
    sensitivityPassed: decision.sensitivityPassed,
    historyPassed: decision.historyPassed,
    operationalReadinessPassed: decision.operationalReadinessPassed,
    humanPolicySignOffPassed: decision.humanPolicySignOffPassed,
    humanActivationApprovalPassed: decision.humanActivationApprovalPassed,
    blockers: decision.blockers,
    requiredActions: decision.requiredActions,
  };
}

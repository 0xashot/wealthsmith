/**
 * contributionPriorityDiagnostics — Step 15E. Deterministic, read-only diagnostics for the
 * contribution-priority decision. It states the priority category and the canonical Safety Buffer
 * facts in NEUTRAL, non-advisory language — never "buy", "invest now", "recommended amount", or any
 * implication of execution. Diagnostic only.
 */
import { CONTRIBUTION_PRIORITY_ORDER } from "./contributionPriorityPolicy";
import type { ContributionPriorityDecision } from "./contributionPriorityTypes";

export interface ContributionPriorityDiagnostics {
  status: string;
  purpose?: string;
  priorityOrder: readonly string[];
  safetyBufferSourcePolicyId: string;
  safetyBufferSourcePolicyVersion: string;
  requiredBufferUsd: number;
  currentEligibleBufferUsd: number;
  shortfallUsd: number;
  safetyBufferComplete: boolean;
  lowerPrioritiesSuppressed: boolean;
  stableTargetIds: string[];
  stableUnderweightTargetIds: string[];
  stableTriggerMetTargetIds: string[];
  growthEligibleTargetIds: string[];
  growthUnderweightTargetIds: string[];
  growthTriggerMetTargetIds: string[];
  priorityTargetIds: string[];
  blockers: string[];
  warnings: string[];
  // False planning/execution flags surfaced for auditability.
  contributionFrequencyApplied: false;
  fundingSourceSelected: false;
  fundingAvailabilityEvaluated: false;
  excessUsdcCalculated: false;
  contributionAmountCalculated: false;
  residualAmountCalculated: false;
  targetSelected: false;
  dcaPlanGenerated: false;
  suggestionGenerated: false;
  updatesProductOutput: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

export function getContributionPriorityDiagnostics(decision: ContributionPriorityDecision): ContributionPriorityDiagnostics {
  return {
    status: decision.status,
    purpose: decision.purpose,
    priorityOrder: CONTRIBUTION_PRIORITY_ORDER,
    safetyBufferSourcePolicyId: decision.safetyBuffer.sourcePolicyId,
    safetyBufferSourcePolicyVersion: decision.safetyBuffer.sourcePolicyVersion,
    requiredBufferUsd: decision.safetyBuffer.requiredBufferUsd,
    currentEligibleBufferUsd: decision.safetyBuffer.currentEligibleBufferUsd,
    shortfallUsd: decision.safetyBuffer.shortfallUsd,
    safetyBufferComplete: decision.safetyBuffer.complete,
    lowerPrioritiesSuppressed: decision.lowerPriorityEvaluationSuppressed,
    stableTargetIds: decision.stableContext?.stableTargetIds ?? [],
    stableUnderweightTargetIds: decision.stableContext?.underweightStableTargetIds ?? [],
    stableTriggerMetTargetIds: decision.stableContext?.triggerMetStableTargetIds ?? [],
    growthEligibleTargetIds: decision.growthContext?.eligibleGrowthTargetIds ?? [],
    growthUnderweightTargetIds: decision.growthContext?.underweightGrowthTargetIds ?? [],
    growthTriggerMetTargetIds: decision.growthContext?.triggerMetGrowthTargetIds ?? [],
    priorityTargetIds: decision.priorityTargetIds,
    blockers: decision.blockers,
    warnings: decision.warnings,
    contributionFrequencyApplied: false,
    fundingSourceSelected: false,
    fundingAvailabilityEvaluated: false,
    excessUsdcCalculated: false,
    contributionAmountCalculated: false,
    residualAmountCalculated: false,
    targetSelected: false,
    dcaPlanGenerated: false,
    suggestionGenerated: false,
    updatesProductOutput: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

const usd = (n: number): string => (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * A neutral, non-advisory diagnostic sentence for a priority decision. States the priority category
 * and the canonical Safety Buffer facts, and explicitly notes that no amount or funding source has
 * been selected. Never recommends an action or an amount.
 */
export function explainContributionPriorityDecision(decision: ContributionPriorityDecision): string {
  const sb = decision.safetyBuffer;
  if (decision.status !== "complete") {
    return `Contribution priority could not be determined (${decision.status}: ${decision.blockers.join(", ") || "no detail"}). No contribution amount or funding source has been selected.`;
  }
  if (decision.purpose === "safety_buffer") {
    return `The canonical Safety Buffer requirement is $${usd(sb.requiredBufferUsd)} and current eligible coverage is $${usd(sb.currentEligibleBufferUsd)}, leaving a $${usd(sb.shortfallUsd)} shortfall. Safety Buffer funding therefore has priority. Stable-allocation and growth-allocation actions are suppressed. No contribution amount or funding source has been selected.`;
  }
  if (decision.purpose === "stable_allocation") {
    const ids = decision.priorityTargetIds.map((s) => s.toUpperCase()).join(", ");
    return `The Safety Buffer is complete. ${ids} is below its configured portfolio target and meets the existing 5-point trigger, so stable allocation has priority before growth allocation. No contribution amount or funding source has been selected.`;
  }
  if (decision.purpose === "growth_allocation") {
    const ids = decision.priorityTargetIds.map((s) => s.toUpperCase()).join(", ");
    return `The Safety Buffer is complete and no stable target meets the allocation trigger. ${ids} is below its configured target and is policy-ready, so growth allocation may proceed to later funding and plan evaluation. No contribution amount has been calculated.`;
  }
  return `The Safety Buffer is complete and no stable or eligible growth target meets the contribution-allocation trigger. No contribution-allocation correction is currently prioritized.`;
}

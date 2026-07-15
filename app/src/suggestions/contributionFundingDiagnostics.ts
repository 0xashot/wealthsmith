/**
 * contributionFundingDiagnostics — Step 15F. Deterministic, read-only diagnostics for the funding
 * selection. It states the priority, the source order, the primary/alternative sources, and the
 * mathematical capacities in NEUTRAL language — never "buy", "invest now", "available to deploy", a
 * final amount, or any implied transfer/reservation. Diagnostic only.
 */
import { CONTRIBUTION_FUNDING_SOURCE_ORDER } from "./contributionFundingPolicy";
import type { ContributionFundingSelectionResult, ContributionFundingSourceOption } from "./contributionFundingTypes";

export interface ContributionFundingSourceDiagnostics {
  sourceId: string;
  timing: string;
  status: string;
  capacityKind: string;
  grossSourceCapacityUsd?: number;
  minimumGrossSourceCapacityUsd?: number;
  maximumGrossSourceCapacityUsd?: number;
  mathematicalPlanningCapUsd?: number;
  cappedSourceCapacityUsd?: number;
  minimumCappedSourceCapacityUsd?: number;
  maximumCappedSourceCapacityUsd?: number;
  minimumPolicyApplied: string;
  minimumPassed: boolean;
  safetyBufferPreserved: boolean;
  applicableTargetIds: string[];
  blockers: string[];
  warnings: string[];
}

export interface ContributionFundingDiagnostics {
  status: string;
  priorityPurpose?: string;
  priorityTargetIds: string[];
  sourcePolicyId: string;
  sourcePolicyVersion: string;
  sourceOrder: readonly string[];
  primaryFundingSourceId?: string;
  alternativeFundingSourceIds: string[];
  sources: ContributionFundingSourceDiagnostics[];
  liquidUsdcAvailableNowUsd?: number;
  canonicalBufferSurplusUsd?: number;
  excessLiquidUsdcAboveBufferUsd?: number;
  projectedEligibleBufferAfterMaximumExcessUseUsd?: number;
  blockers: string[];
  warnings: string[];
  // False plan/suggestion/execution flags surfaced for auditability.
  mixedFundingSelected: false;
  finalContributionAmountCalculated: false;
  residualAmountCalculated: false;
  finalTargetSelected: false;
  targetAllocationAcrossIdsCalculated: false;
  dcaPlanGenerated: false;
  suggestionGenerated: false;
  updatesProductOutput: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

function sourceDiag(o: ContributionFundingSourceOption): ContributionFundingSourceDiagnostics {
  return {
    sourceId: o.sourceId,
    timing: o.timing,
    status: o.status,
    capacityKind: o.capacityKind,
    grossSourceCapacityUsd: o.grossSourceCapacityUsd,
    minimumGrossSourceCapacityUsd: o.minimumGrossSourceCapacityUsd,
    maximumGrossSourceCapacityUsd: o.maximumGrossSourceCapacityUsd,
    mathematicalPlanningCapUsd: o.mathematicalPlanningCapUsd,
    cappedSourceCapacityUsd: o.cappedSourceCapacityUsd,
    minimumCappedSourceCapacityUsd: o.minimumCappedSourceCapacityUsd,
    maximumCappedSourceCapacityUsd: o.maximumCappedSourceCapacityUsd,
    minimumPolicyApplied: o.minimumPolicyApplied,
    minimumPassed: o.minimumPassed,
    safetyBufferPreserved: o.safetyBufferPreserved,
    applicableTargetIds: o.applicableTargetIds,
    blockers: o.blockers,
    warnings: o.warnings,
  };
}

export function getContributionFundingDiagnostics(result: ContributionFundingSelectionResult): ContributionFundingDiagnostics {
  return {
    status: result.status,
    priorityPurpose: result.priorityPurpose,
    priorityTargetIds: result.priorityTargetIds,
    sourcePolicyId: result.policyId,
    sourcePolicyVersion: result.policyVersion,
    sourceOrder: CONTRIBUTION_FUNDING_SOURCE_ORDER,
    primaryFundingSourceId: result.primaryFundingSourceId,
    alternativeFundingSourceIds: result.alternativeFundingSourceIds,
    sources: result.sourceOptions.map(sourceDiag),
    liquidUsdcAvailableNowUsd: result.liquidUsdcAvailableNowUsd,
    canonicalBufferSurplusUsd: result.canonicalBufferSurplusUsd,
    excessLiquidUsdcAboveBufferUsd: result.excessLiquidUsdcAboveBufferUsd,
    projectedEligibleBufferAfterMaximumExcessUseUsd: result.projectedEligibleBufferAfterMaximumExcessUseUsd,
    blockers: result.blockers,
    warnings: result.warnings,
    mixedFundingSelected: false,
    finalContributionAmountCalculated: false,
    residualAmountCalculated: false,
    finalTargetSelected: false,
    targetAllocationAcrossIdsCalculated: false,
    dcaPlanGenerated: false,
    suggestionGenerated: false,
    updatesProductOutput: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

/**
 * A neutral, non-advisory diagnostic sentence for a funding selection. States the priority, the
 * applicable source(s), and the caps, and notes that no final amount/target/residual was produced.
 * Never recommends an action, an amount, or implies a transfer.
 */
export function explainContributionFundingSelection(result: ContributionFundingSelectionResult): string {
  if (result.status === "no_action_required") {
    return "No contribution-allocation correction is prioritized (On Track). No corrective funding source is selected and no funding capacity is proposed.";
  }
  if (result.status !== "source_selected") {
    return `No funding source was selected (${result.status}: ${result.blockers.join(", ") || "no eligible source"}). No final contribution amount or funding source has been chosen.`;
  }
  const purpose = result.priorityPurpose;
  const primary = result.primaryFundingSourceId;
  if (purpose === "safety_buffer") {
    return "The Safety Buffer has priority. The normalized upcoming contribution is the only applicable funding source, capped at the canonical buffer shortfall. Existing USDC is not classified as excess while the buffer is incomplete. No final contribution amount or residual destination has been calculated.";
  }
  if (purpose === "stable_allocation") {
    return "The Safety Buffer is complete and stable allocation has priority. The upcoming contribution is the applicable source, capped by the stable target's external-contribution allocation limit. Existing USDC cannot correct the current USDC stable-allocation shortfall by remaining in the same asset. No final amount has been calculated.";
  }
  // growth_allocation
  if (primary === "existing_excess_usdc") {
    return "Growth allocation has priority, but the upcoming contribution is unavailable or below the applicable threshold. Existing liquid USDC above the Safety Buffer is the primary eligible source, capped by the internal-reallocation allocation limit and preserving the Safety Buffer. No DCA plan has been generated.";
  }
  const alt = result.alternativeFundingSourceIds.includes("existing_excess_usdc") ? " Liquid USDC above the Safety Buffer is also eligible as an alternative; the sources are not combined." : "";
  return `Growth allocation has priority. The upcoming contribution is the primary source because WealthSmith follows the user's contribution frequency before considering existing capital.${alt} No final DCA amount has been calculated.`;
}

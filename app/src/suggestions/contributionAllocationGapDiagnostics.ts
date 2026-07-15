/**
 * contributionAllocationGapDiagnostics — Step 15D. Deterministic, read-only diagnostics for the
 * allocation-gap analysis. It renders the mathematical facts (current %, target %, signed gap, the
 * static current-total gap, the internal-reallocation cap, and the external-contribution cap) using
 * NEUTRAL wording — "cap before target", never "available"/"deployable"/"suggested". It produces no
 * user-facing financial advice and never says buy / invest now / available to deploy / recommended.
 */
import type {
  ContributionAllocationGapAnalysisResult,
  ContributionAllocationProjection,
  ContributionTargetAllocationGapResult,
} from "./contributionAllocationGapTypes";

export interface ContributionTargetGapDiagnostics {
  targetId: string;
  assetId: string;
  currentValueUsd: number;
  currentPct?: number;
  targetPct: number;
  signedGapPercentagePoints?: number;
  classification: string;
  underweightTriggerMet: boolean;
  signedStaticGapAtCurrentTotalUsd?: number;
  internalReallocationCapBeforeTargetUsd?: number;
  externalContributionCapBeforeTargetUsd?: number;
  currentOverweightUsdAtCurrentTotal?: number;
  hypotheticalProjection?: ContributionAllocationProjection;
  contributionTargetPolicyReady: boolean;
  eligibleForFutureGrowthContributionEvaluation: boolean;
  blockers: string[];
  // Explicit reminders that nothing was deployed/selected.
  fundingAvailabilityEvaluated: false;
  safetyBufferEvaluated: false;
  contributionAmountCalculated: false;
  targetSelected: false;
}

export interface ContributionAllocationGapDiagnostics {
  status: string;
  snapshotId?: string;
  checkedAt: string;
  sourcePortfolioVersion?: string;
  sourceAllocationPolicyId?: string;
  sourceAllocationPolicyVersion?: string;
  totalPortfolioValueUsd?: number;
  mappedTargetValueUsd?: number;
  registeredNonTargetValueUsd?: number;
  unmappedOtherValueUsd?: number;
  targetOrder: string[];
  targets: ContributionTargetGapDiagnostics[];
  blockers: string[];
  // False planning/execution flags surfaced for auditability.
  fundingSourceEvaluated: false;
  fundingAvailabilityEvaluated: false;
  safetyBufferEvaluated: false;
  contributionFrequencyApplied: false;
  contributionPriorityEvaluated: false;
  contributionAmountCalculated: false;
  targetSelected: false;
  dcaPlanGenerated: false;
  suggestionGenerated: false;
  updatesProductOutput: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

export function getContributionAllocationGapDiagnostics(result: ContributionAllocationGapAnalysisResult): ContributionAllocationGapDiagnostics {
  return {
    status: result.status,
    snapshotId: result.sourceSnapshotId,
    checkedAt: result.checkedAt,
    sourcePortfolioVersion: result.sourcePortfolioVersion,
    sourceAllocationPolicyId: result.sourceAllocationPolicyId,
    sourceAllocationPolicyVersion: result.sourceAllocationPolicyVersion,
    totalPortfolioValueUsd: result.totalPortfolioValueUsd,
    mappedTargetValueUsd: result.mappedTargetValueUsd,
    registeredNonTargetValueUsd: result.registeredNonTargetValueUsd,
    unmappedOtherValueUsd: result.unmappedOtherValueUsd,
    targetOrder: result.targetResults.map((t) => t.targetId),
    targets: result.targetResults.map((t) => ({
      targetId: t.targetId,
      assetId: t.assetId,
      currentValueUsd: t.currentValueUsd,
      currentPct: t.currentPct,
      targetPct: t.targetPct,
      signedGapPercentagePoints: t.signedGapPercentagePoints,
      classification: t.classification,
      underweightTriggerMet: t.underweightTriggerMet,
      signedStaticGapAtCurrentTotalUsd: t.signedStaticGapAtCurrentTotalUsd,
      internalReallocationCapBeforeTargetUsd: t.maximumInternalReallocationIncreaseWithoutOvershootUsd,
      externalContributionCapBeforeTargetUsd: t.maximumExternalContributionIncreaseWithoutOvershootUsd,
      currentOverweightUsdAtCurrentTotal: t.currentOverweightUsdAtCurrentTotal,
      hypotheticalProjection: t.hypotheticalProjection,
      contributionTargetPolicyReady: t.contributionTargetPolicyReady,
      eligibleForFutureGrowthContributionEvaluation: t.eligibleForFutureGrowthContributionEvaluation,
      blockers: t.blockers,
      fundingAvailabilityEvaluated: false,
      safetyBufferEvaluated: false,
      contributionAmountCalculated: false,
      targetSelected: false,
    })),
    blockers: result.blockers,
    fundingSourceEvaluated: false,
    fundingAvailabilityEvaluated: false,
    safetyBufferEvaluated: false,
    contributionFrequencyApplied: false,
    contributionPriorityEvaluated: false,
    contributionAmountCalculated: false,
    targetSelected: false,
    dcaPlanGenerated: false,
    suggestionGenerated: false,
    updatesProductOutput: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

const round2 = (n: number): string => (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const round1 = (n: number): string => (Math.round(n * 10) / 10).toString();

/**
 * A neutral, non-advisory diagnostic sentence for one target result. It states the mathematical
 * facts and the internal-vs-external distinction, and explicitly notes that funding availability and
 * the Safety Buffer were not evaluated. It never recommends an action or an amount.
 */
export function explainContributionTargetAllocationGap(result: ContributionTargetAllocationGapResult): string {
  const sym = result.targetId.toUpperCase();
  if (!Number.isFinite(result.currentPct as number)) {
    return `${sym} allocation could not be evaluated for this portfolio snapshot.`;
  }
  const cur = round1(result.currentPct as number);
  const tgt = round1(result.targetPct);
  const total = Number.isFinite(result.totalPortfolioValueUsd) ? `$${round2(result.totalPortfolioValueUsd)}` : "the portfolio";

  if (result.classification === "at_target") {
    return `${sym} currently represents ${cur}% of the ${total} portfolio, matching its ${tgt}% target. No allocation gap. Funding availability and the Safety Buffer have not been evaluated.`;
  }
  if (result.classification === "overweight") {
    const over = result.currentOverweightUsdAtCurrentTotal;
    const overStr = Number.isFinite(over as number) ? ` It sits about $${round2(over as number)} above its target share at the current total.` : "";
    return `${sym} currently represents ${cur}% of the ${total} portfolio against a ${tgt}% target, so it is overweight.${overStr} No contribution gap applies. Funding availability and the Safety Buffer have not been evaluated.`;
  }
  // Underweight.
  const gap = round1((result.signedGapPercentagePoints as number));
  const internal = result.internalReallocationUsdToReachTarget;
  const external = result.externalContributionUsdToReachTarget;
  const internalStr = Number.isFinite(internal as number) ? `Reaching ${tgt}% through an internal reallocation would mathematically require $${round2(internal as number)}. ` : "";
  const externalStr = Number.isFinite(external as number)
    ? `Reaching ${tgt}% using only new external contributions would mathematically require $${round2(external as number)} because the contribution also increases total portfolio value. `
    : `A finite external contribution cannot reach ${tgt}% at this snapshot. `;
  return `${sym} currently represents ${cur}% of the ${total} portfolio against a ${tgt}% target, a ${gap}-percentage-point underweight gap. ${internalStr}${externalStr}Funding availability and the Safety Buffer have not been evaluated.`;
}

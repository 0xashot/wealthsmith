/**
 * contributionPlanDiagnostics — Step 15G. Deterministic, read-only diagnostics for a generated plan.
 * NEUTRAL, internal wording only — never a user-facing suggestion, "buy now", "recommended trade", a
 * promised future token quantity, or any implication that funds are reserved or moved.
 */
import { EXCESS_USDC_DCA_POLICY_ID, EXCESS_USDC_DCA_POLICY_VERSION, type ContributionPlanGenerationResult, type ContributionPlan } from "./contributionPlanTypes";

export interface ContributionPlanStepDiagnostics {
  stepIndex: number;
  relativeDayOffset?: number;
  amountCents?: number;
  amountUsd?: number;
  sourceId: string;
  sourceAssetId?: string;
  targetId: string;
}

export interface ContributionPlanDiagnostics {
  status: string;
  planId?: string;
  planPolicyId: string;
  planPolicyVersion: string;
  stagedDcaPolicyId?: string;
  stagedDcaPolicyVersion?: string;
  kind?: string;
  priorityPurpose?: string;
  fundingSourceId?: string;
  fundingTiming?: string;
  alternativeFundingSourceIds: string[];
  selectedTargetId?: string;
  sourceAssetId?: string;
  amountKind?: string;
  exactAmountUsd?: number;
  minimumAmountUsd?: number;
  maximumAmountUsd?: number;
  allocationCapUsd?: number;
  roundingMode?: string;
  unallocatedCapacityCalculated: boolean;
  residualRouted: boolean;
  cadenceMode?: string;
  contributionFrequencyId?: string;
  contributionsPerYear?: number;
  trancheCount?: number;
  durationDays?: number;
  relativeDayOffsets?: number[];
  steps: ContributionPlanStepDiagnostics[];
  sourceTargetPct?: number;
  projectedTargetPct?: number;
  targetPct?: number;
  projectedGapPercentagePoints?: number;
  sourceEligibleBufferUsd?: number;
  projectedEligibleBufferUsd?: number;
  requiredBufferUsd?: number;
  projectedBufferShortfallUsd?: number;
  safetyBufferPreserved?: boolean;
  blockers: string[];
  warnings: string[];
  // Execution + product-output flags surfaced for auditability.
  executionReady: false;
  routeEvaluated: false;
  protocolEvaluated: false;
  costEvaluated: false;
  slippageEvaluated: false;
  automationEnabled: false;
  suggestionGenerated: false;
  updatesProductOutput: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

function pickPoint(plan: ContributionPlan) {
  return plan.projection.kind === "exact" ? plan.projection.exact : plan.projection.maximum ?? plan.projection.minimum;
}

export function getContributionPlanDiagnostics(res: ContributionPlanGenerationResult): ContributionPlanDiagnostics {
  const p = res.plan;
  const pt = p ? pickPoint(p) : undefined;
  return {
    status: res.status,
    planId: p?.planId,
    planPolicyId: res.policyId,
    planPolicyVersion: res.policyVersion,
    ...(p?.kind === "growth_excess_usdc_dca" ? { stagedDcaPolicyId: EXCESS_USDC_DCA_POLICY_ID, stagedDcaPolicyVersion: EXCESS_USDC_DCA_POLICY_VERSION } : {}),
    kind: p?.kind,
    priorityPurpose: p?.priorityPurpose,
    fundingSourceId: p?.fundingSourceId,
    fundingTiming: p?.fundingTiming,
    alternativeFundingSourceIds: p?.alternativeFundingSourceIds ?? [],
    selectedTargetId: p?.selectedTargetId,
    sourceAssetId: p?.sourceAssetId,
    amountKind: p?.amount.kind,
    exactAmountUsd: p?.amount.exactAmountUsd,
    minimumAmountUsd: p?.amount.minimumAmountUsd,
    maximumAmountUsd: p?.amount.maximumAmountUsd,
    allocationCapUsd: p?.amount.allocationCapUsd,
    roundingMode: p?.amount.roundingMode,
    unallocatedCapacityCalculated: p?.unallocatedSourceCapacity.calculated ?? false,
    residualRouted: p?.residualRouted ?? false,
    cadenceMode: p?.cadence.mode,
    contributionFrequencyId: p?.cadence.contributionFrequencyId,
    contributionsPerYear: p?.cadence.contributionsPerYear,
    trancheCount: p?.cadence.trancheCount,
    durationDays: p?.cadence.durationDays,
    relativeDayOffsets: p?.cadence.relativeDayOffsets,
    steps: (p?.steps ?? []).map((s) => ({ stepIndex: s.stepIndex, relativeDayOffset: s.relativeDayOffset, amountCents: s.amount.exactAmountCents, amountUsd: s.amount.exactAmountUsd, sourceId: s.sourceId, sourceAssetId: s.sourceAssetId, targetId: s.targetId })),
    sourceTargetPct: pt?.sourceTargetPct,
    projectedTargetPct: pt?.projectedTargetPct,
    targetPct: pt?.targetPct,
    projectedGapPercentagePoints: pt?.projectedGapPercentagePoints,
    sourceEligibleBufferUsd: pt?.sourceEligibleBufferUsd,
    projectedEligibleBufferUsd: pt?.projectedEligibleBufferUsd,
    requiredBufferUsd: pt?.requiredBufferUsd,
    projectedBufferShortfallUsd: pt?.projectedBufferShortfallUsd,
    safetyBufferPreserved: pt?.safetyBufferPreserved,
    blockers: res.blockers,
    warnings: res.warnings,
    executionReady: false,
    routeEvaluated: false,
    protocolEvaluated: false,
    costEvaluated: false,
    slippageEvaluated: false,
    automationEnabled: false,
    suggestionGenerated: false,
    updatesProductOutput: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

const usd = (n: number): string => (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** A neutral, non-advisory diagnostic sentence for a generated plan. */
export function explainContributionPlan(res: ContributionPlanGenerationResult): string {
  if (res.status === "no_action_required") return "No contribution-allocation correction is currently prioritized, so no contribution plan is generated.";
  if (!res.plan) return `No contribution plan was generated (${res.status}: ${res.blockers.join(", ") || "no plan"}).`;
  const p = res.plan;
  const tgt = p.selectedTargetId.toUpperCase();
  if (p.kind === "safety_buffer_contribution") {
    const pt = p.projection.exact;
    if (pt) return `The Safety Buffer has priority. The plan directs $${usd(pt.amountUsd)} from the next contribution to ${tgt}, reducing the canonical buffer shortfall to $${usd(pt.projectedBufferShortfallUsd as number)}. The contribution is expected future funding and has not been transferred. No unused amount is routed.`;
    return `The Safety Buffer has priority. The normalized contribution is between $${usd(p.amount.minimumAmountUsd as number)} and $${usd(p.amount.maximumAmountUsd as number)} because annual cents cannot divide into identical whole-cent contributions. The plan directs that contribution range toward ${tgt}. No exact current amount or calendar date is assumed.`;
  }
  if (p.kind === "stable_allocation_contribution") {
    return `The Safety Buffer is complete. The plan directs the upcoming contribution to ${tgt}, capped by the stable target's external-contribution limit. The projected stable allocation remains at or below its configured target. No residual destination is selected.`;
  }
  if (p.kind === "growth_recurring_contribution") {
    return `The Safety Buffer is complete and ${tgt} is the single eligible growth target with priority. The plan directs the upcoming contribution toward ${tgt}. The user's contribution cadence is the gradual contribution structure, so the individual contribution is not split into additional tranches.`;
  }
  // growth_excess_usdc_dca
  const total = p.amount.exactAmountUsd as number;
  const offsets = (p.cadence.relativeDayOffsets ?? []).join(", ");
  return `The Safety Buffer is complete. The plan stages $${usd(total)} of existing liquid excess USDC toward ${tgt} across ${p.steps.length} USD-denominated tranches over ${p.cadence.durationDays} days: days ${offsets}. The total is capped by the internal-reallocation allocation limit and preserves the Safety Buffer. No swap route, future ${tgt} quantity, or transaction has been prepared.`;
}

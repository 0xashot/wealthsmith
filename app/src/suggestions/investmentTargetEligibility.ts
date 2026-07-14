/**
 * investmentTargetEligibility — Step 15A. Evaluates TECHNICAL readiness of an investment target
 * (is it enabled, is a required holding source present, is required pricing fresh, are the
 * target-allocation / suitability / minimum POLICY KEYS configured). It does NOT check the user's
 * risk level / goal / time horizon / allocation gap, does NOT decide whether the user should
 * invest, does NOT select or rank targets, and does NOT calculate any amount or generate a
 * suggestion. It fails closed.
 */
import { getEnabledContributionGrowthTargets, listInvestmentTargets } from "./investmentTargetRegistry";
import type {
  InvestmentTargetDefinition,
  InvestmentTargetHoldingSource,
  InvestmentTargetReadinessBlocker,
} from "./investmentTargetTypes";

export const INVESTMENT_TARGET_ELIGIBILITY_EXISTS = true;

export interface InvestmentTargetTechnicalContext {
  checkedAt: string;
  availableHoldingSources: InvestmentTargetHoldingSource[];
  priceStatusByTargetId: Record<string, { available: boolean; fetchedAt?: string }>;
  configuredAllocationPolicyKeys: string[];
  configuredMinimumPolicyKeys: string[];
  configuredSuitabilityPolicyKeys: string[];
  approvedTargetIds: string[];
}

export interface InvestmentTargetTechnicalEligibility {
  targetId: string;
  eligibleAsContributionTarget: boolean;
  eligibleAsFundingSource: boolean;
  eligibleAsSafetyBufferAsset: boolean;
  eligibleAsStableAllocationDestination: boolean;

  blockers: InvestmentTargetReadinessBlocker[];
  warnings: string[];

  checkedAt: string;

  userSuitabilityEvaluated: false;
  allocationGapEvaluated: false;
  contributionAmountCalculated: false;
  suggestionGenerated: false;

  transactionsEnabled: false;
  walletSignatureRequired: false;
}

/**
 * Evaluate a target's TECHNICAL eligibility against a context. Contribution-target eligibility
 * requires all readiness gates to pass; funding-source / safety-buffer / stable-allocation
 * eligibility are evaluated separately (they need only enabled state + a supported holding source,
 * since a stable funding asset needs no growth pricing/allocation/suitability policy).
 */
export function evaluateInvestmentTargetTechnicalEligibility(
  target: InvestmentTargetDefinition,
  context: InvestmentTargetTechnicalContext,
): InvestmentTargetTechnicalEligibility {
  const blockers: InvestmentTargetReadinessBlocker[] = [];
  const warnings: string[] = [];
  const push = (b: InvestmentTargetReadinessBlocker) => { if (!blockers.includes(b)) blockers.push(b); };

  const enabled = target.lifecycleStatus === "enabled" && target.enabledForMvp === true;
  if (target.lifecycleStatus === "blocked") push("target_blocked");
  if (!enabled) push("target_disabled");
  // Carry intrinsic definition-level blockers.
  for (const b of target.activationBlockers) push(b);

  const hasHoldingSource = target.holdingSources.some((s) => context.availableHoldingSources.includes(s));
  if (!hasHoldingSource) push("holding_source_not_supported");
  if (target.holdingSources.includes("manual_entry") && !context.availableHoldingSources.includes("manual_entry")) push("manual_entry_not_supported");

  // Pricing (only when required for contribution planning).
  if (target.priceRequirements.priceRequiredForContributionPlanning) {
    const ps = context.priceStatusByTargetId[target.targetId];
    if (!ps) push("price_source_not_configured");
    else if (!ps.available) push("price_unavailable");
    else {
      const maxAge = target.priceRequirements.maximumPriceAgeMs;
      if (maxAge != null) {
        const age = Date.parse(context.checkedAt) - Date.parse(ps.fetchedAt ?? "");
        if (Number.isNaN(age) || age < 0 || age > maxAge) push("price_stale");
      }
    }
  }

  // Target-allocation policy (contribution growth targets).
  if (target.allocationRequirements.targetAllocationRequired) {
    const key = target.allocationRequirements.allocationPolicyKey;
    if (!key || !context.configuredAllocationPolicyKeys.includes(key)) push("target_allocation_not_configured");
  }

  // Suitability policy (must be CONFIGURED — the user's actual suitability is NOT evaluated here).
  if (target.suitabilityPolicyKey && !context.configuredSuitabilityPolicyKeys.includes(target.suitabilityPolicyKey)) {
    push("suitability_policy_not_configured");
  }

  // Minimum policy (contribution targets need a configured minimum before amounts can be planned).
  if (target.canBeContributionTarget) {
    const mk = target.minimumRequirements.minimumPolicyKey;
    const hasMin = (mk != null && context.configuredMinimumPolicyKeys.includes(mk)) || target.minimumRequirements.minimumSuggestedAmountUsd != null;
    if (!hasMin) push("minimum_amount_not_configured");
  }

  // RWA product approval.
  if (target.category === "rwa" && !context.approvedTargetIds.includes(target.targetId)) push("product_not_approved");

  const eligibleAsContributionTarget = target.canBeContributionTarget && enabled && blockers.length === 0;
  // Funding-source-family eligibility: enabled + supported holding source (no growth policy needed).
  const baseUsable = enabled && hasHoldingSource && target.lifecycleStatus !== "blocked";
  const eligibleAsFundingSource = target.canFundContributionPlan && baseUsable;
  const eligibleAsSafetyBufferAsset = target.canServeAsSafetyBuffer && baseUsable;
  const eligibleAsStableAllocationDestination = target.canReceiveStableAllocation && baseUsable;

  return {
    targetId: target.targetId,
    eligibleAsContributionTarget,
    eligibleAsFundingSource,
    eligibleAsSafetyBufferAsset,
    eligibleAsStableAllocationDestination,
    blockers,
    warnings,
    checkedAt: context.checkedAt,
    userSuitabilityEvaluated: false,
    allocationGapEvaluated: false,
    contributionAmountCalculated: false,
    suggestionGenerated: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

/** Technically-eligible growth contribution targets, in registry order (no ranking). */
export function listTechnicallyEligibleContributionTargets(context: InvestmentTargetTechnicalContext): InvestmentTargetDefinition[] {
  return getEnabledContributionGrowthTargets().filter((t) => evaluateInvestmentTargetTechnicalEligibility(t, context).eligibleAsContributionTarget);
}

/** Technically-eligible funding sources, in registry order (no ranking). */
export function listTechnicallyEligibleFundingSources(context: InvestmentTargetTechnicalContext): InvestmentTargetDefinition[] {
  return listInvestmentTargets().filter((t) => evaluateInvestmentTargetTechnicalEligibility(t, context).eligibleAsFundingSource);
}

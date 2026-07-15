/**
 * contributionTargetPolicyEligibility — Step 15C. Combines a target's technical eligibility (15A),
 * the growth-allocation policy, the profile suitability policy, the price policy, and the DCA
 * minimum policy into a single deterministic readiness verdict: is the target's POLICY
 * configuration complete enough for a LATER allocation-gap engine to evaluate it?
 *
 * `ready_for_allocation_gap_evaluation` never means the target is eligible for a suggestion,
 * selected for a contribution, approved for a DCA plan, or approved for execution. It evaluates no
 * Safety Buffer, no allocation gap, no amount. Fails closed.
 */
import type { InvestmentTargetTechnicalEligibility } from "./investmentTargetEligibility";
import type { GrowthTargetAllocationPolicyResult } from "./growthTargetAllocationPolicy";
import type { ContributionTargetSuitabilityResult } from "./contributionTargetSuitability";
import { validateContributionPriceQuote, type ContributionPriceQuote } from "./contributionPricePolicy";
import { validateDcaMinimumPolicy, type DcaMinimumPolicy } from "./dcaMinimumPolicy";

export const CONTRIBUTION_TARGET_POLICY_ELIGIBILITY_EXISTS = true;

export interface ContributionTargetPolicyEligibilityInput {
  targetId: string;
  checkedAt: string;
  technicalEligibility: InvestmentTargetTechnicalEligibility;
  targetAllocationResult: GrowthTargetAllocationPolicyResult;
  suitabilityResult: ContributionTargetSuitabilityResult;
  priceQuote?: ContributionPriceQuote;
  minimumPolicy: DcaMinimumPolicy;
}

export interface ContributionTargetPolicyEligibility {
  targetId: string;

  status:
    | "ready_for_allocation_gap_evaluation"
    | "blocked_technical_readiness"
    | "blocked_target_allocation"
    | "blocked_suitability"
    | "blocked_price"
    | "blocked_minimum_policy"
    | "invalid";

  technicallyReady: boolean;
  allocationPolicyReady: boolean;
  suitabilityPolicyReady: boolean;
  pricePolicyReady: boolean;
  minimumPolicyReady: boolean;

  readyForAllocationGapEvaluation: boolean;

  safetyBufferEvaluated: false;
  allocationGapEvaluated: false;
  contributionFrequencyApplied: false;
  contributionAmountCalculated: false;
  targetSelected: false;
  planGenerated: false;
  suggestionGenerated: false;

  blockers: string[];
  warnings: string[];

  transactionsEnabled: false;
  walletSignatureRequired: false;
}

function base(targetId: string, status: ContributionTargetPolicyEligibility["status"], extra: Partial<ContributionTargetPolicyEligibility> = {}): ContributionTargetPolicyEligibility {
  return {
    targetId,
    status,
    technicallyReady: false,
    allocationPolicyReady: false,
    suitabilityPolicyReady: false,
    pricePolicyReady: false,
    minimumPolicyReady: false,
    readyForAllocationGapEvaluation: false,
    safetyBufferEvaluated: false,
    allocationGapEvaluated: false,
    contributionFrequencyApplied: false,
    contributionAmountCalculated: false,
    targetSelected: false,
    planGenerated: false,
    suggestionGenerated: false,
    blockers: [],
    warnings: [],
    transactionsEnabled: false,
    walletSignatureRequired: false,
    ...extra,
  };
}

/**
 * Evaluate combined policy readiness in strict gate order. The first failing gate sets the status;
 * a fully-passing evaluation reaches `ready_for_allocation_gap_evaluation` — which activates nothing.
 */
export function evaluateContributionTargetPolicyEligibility(input: ContributionTargetPolicyEligibilityInput): ContributionTargetPolicyEligibility {
  if (!input || typeof input !== "object" || !input.targetId || !input.technicalEligibility || !input.targetAllocationResult || !input.suitabilityResult || !input.minimumPolicy) {
    return base(input?.targetId ?? "", "invalid", { blockers: ["invalid_input"] });
  }
  const targetId = input.targetId;

  const technicallyReady = input.technicalEligibility.eligibleAsContributionTarget === true;
  const allocationPolicyReady = input.targetAllocationResult.status === "configured";
  const suitabilityPolicyReady = input.suitabilityResult.status === "suitable_for_gap_evaluation";
  const priceValid = input.priceQuote ? validateContributionPriceQuote(input.priceQuote).valid : false;
  const minimumPolicyReady = validateDcaMinimumPolicy(input.minimumPolicy).valid;

  const partial: Partial<ContributionTargetPolicyEligibility> = { technicallyReady, allocationPolicyReady, suitabilityPolicyReady, pricePolicyReady: priceValid, minimumPolicyReady };

  // Gate order.
  if (!technicallyReady) return base(targetId, "blocked_technical_readiness", { ...partial, blockers: [...input.technicalEligibility.blockers, "target_disabled"].filter((v, i, a) => a.indexOf(v) === i).slice(0, 8) });
  if (!allocationPolicyReady) return base(targetId, "blocked_target_allocation", { ...partial, blockers: input.targetAllocationResult.blockers.length ? input.targetAllocationResult.blockers : ["target_allocation_invalid"] });
  if (!suitabilityPolicyReady) return base(targetId, "blocked_suitability", { ...partial, blockers: input.suitabilityResult.blockers.length ? input.suitabilityResult.blockers : ["target_not_suitable"] });
  if (!input.priceQuote) return base(targetId, "blocked_price", { ...partial, blockers: ["price_missing"] });
  if (!priceValid) {
    const pb = input.priceQuote.blockers.length ? input.priceQuote.blockers : [input.priceQuote.status === "stale" ? "price_stale" : "price_invalid"];
    return base(targetId, "blocked_price", { ...partial, blockers: pb });
  }
  if (!minimumPolicyReady) return base(targetId, "blocked_minimum_policy", { ...partial, blockers: ["minimum_policy_invalid"] });

  return base(targetId, "ready_for_allocation_gap_evaluation", {
    ...partial,
    readyForAllocationGapEvaluation: true,
    warnings: ["Policy configuration is complete enough for the future allocation-gap engine to evaluate this target. This does NOT select the target, size a contribution, approve a DCA plan, or approve execution."],
  });
}

export interface PolicyEligibilityValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateContributionTargetPolicyEligibility(result: unknown): PolicyEligibilityValidationResult {
  const errors: string[] = [];
  if (!result || typeof result !== "object") return { valid: false, errors: ["result_not_an_object"] };
  const r = result as ContributionTargetPolicyEligibility;
  const flagsFalse = r.safetyBufferEvaluated === false && r.allocationGapEvaluated === false && r.contributionFrequencyApplied === false && r.contributionAmountCalculated === false && r.targetSelected === false && r.planGenerated === false && r.suggestionGenerated === false && r.transactionsEnabled === false && r.walletSignatureRequired === false;
  if (!flagsFalse) errors.push("capability_flag_enabled");
  if (r.status === "ready_for_allocation_gap_evaluation") {
    if (!(r.technicallyReady && r.allocationPolicyReady && r.suitabilityPolicyReady && r.pricePolicyReady && r.minimumPolicyReady && r.readyForAllocationGapEvaluation)) errors.push("ready_without_all_gates");
    if (r.blockers.length > 0) errors.push("ready_with_blockers");
  } else if (r.blockers.length === 0) errors.push("blocked_without_blocker");
  return { valid: errors.length === 0, errors };
}

export interface PolicyEligibilityDiagnostics {
  targetId: string;
  status: string;
  technicallyReady: boolean;
  allocationPolicyReady: boolean;
  suitabilityPolicyReady: boolean;
  pricePolicyReady: boolean;
  minimumPolicyReady: boolean;
  readyForAllocationGapEvaluation: boolean;
  safetyBufferEvaluated: false;
  allocationGapEvaluated: false;
  contributionAmountCalculated: false;
  blockers: string[];
  warnings: string[];
}

export function getContributionTargetPolicyEligibilityDiagnostics(result: ContributionTargetPolicyEligibility): PolicyEligibilityDiagnostics {
  return {
    targetId: result.targetId,
    status: result.status,
    technicallyReady: result.technicallyReady,
    allocationPolicyReady: result.allocationPolicyReady,
    suitabilityPolicyReady: result.suitabilityPolicyReady,
    pricePolicyReady: result.pricePolicyReady,
    minimumPolicyReady: result.minimumPolicyReady,
    readyForAllocationGapEvaluation: result.readyForAllocationGapEvaluation,
    safetyBufferEvaluated: false,
    allocationGapEvaluated: false,
    contributionAmountCalculated: false,
    blockers: result.blockers,
    warnings: result.warnings,
  };
}

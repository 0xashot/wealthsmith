/**
 * contributionTargetSuitability — Step 15C. Evaluates a target's PROFILE-LEVEL suitability for
 * FUTURE allocation-gap evaluation WITHOUT duplicating the onboarding allocation matrices. It does
 * not add a second risk matrix or independently ban Very Low risk / short horizon / Big Purchase
 * goal — the EXISTING stable/volatile engine already reduces growth exposure for those inputs. When
 * that engine returns a positive growth allocation for the target, the target MAY be considered by
 * the later allocation-gap engine. `suitable_for_gap_evaluation` means only "may be considered" —
 * never "buy SOL". It evaluates no buffer, no gap, no amount, and generates no suggestion.
 */
import {
  CONTRIBUTION_PLANNING_POLICY_SCHEMA_VERSION,
  SOL_GROWTH_SUITABILITY_POLICY_ID,
  SOL_GROWTH_SUITABILITY_POLICY_VERSION,
} from "./contributionPlanningPolicyTypes";
import type { GrowthTargetAllocationPolicyResult } from "./growthTargetAllocationPolicy";
import type { InvestmentTargetDefinition } from "./investmentTargetTypes";

export const SOL_GROWTH_SUITABILITY_POLICY_EXISTS = true;

/** Recognized onboarding/profile IDs (must match state/goalState.ts option values exactly). */
export const RECOGNIZED_PROFILE_GOAL_IDS: readonly string[] = ["retire_early", "build_long_term_wealth", "generate_passive_income", "save_for_big_purchase", "not_sure_yet"];
export const RECOGNIZED_PROFILE_RISK_IDS: readonly string[] = ["very_low", "low", "medium", "high", "very_high"];
export const RECOGNIZED_PROFILE_HORIZON_IDS: readonly string[] = ["6_months", "1_year", "2_years", "5_years", "10_plus_years", "not_sure_yet"];

export interface ContributionTargetSuitabilityContext {
  checkedAt: string;
  targetId: string;
  profile: { goal: unknown; riskLevel: unknown; timeHorizon: unknown };
  targetAllocationResult: GrowthTargetAllocationPolicyResult;
}

export interface ContributionTargetSuitabilityResult {
  schemaVersion: "1.0.0";
  policyId: string;
  policyVersion: string;

  targetId: string;

  status: "suitable_for_gap_evaluation" | "not_suitable" | "invalid_profile" | "invalid_allocation" | "target_disabled";

  profileInputsRecognized: boolean;
  growthTargetPct: number;

  suitableForAllocationGapEvaluation: boolean;

  safetyBufferEvaluated: false;
  allocationGapEvaluated: false;
  contributionAmountCalculated: false;
  targetSelectedForSuggestion: false;
  suggestionGenerated: false;

  blockers: string[];
  warnings: string[];

  transactionsEnabled: false;
  walletSignatureRequired: false;
}

function shell(targetId: string, status: ContributionTargetSuitabilityResult["status"], extra: Partial<ContributionTargetSuitabilityResult> = {}): ContributionTargetSuitabilityResult {
  return {
    schemaVersion: CONTRIBUTION_PLANNING_POLICY_SCHEMA_VERSION,
    policyId: SOL_GROWTH_SUITABILITY_POLICY_ID,
    policyVersion: SOL_GROWTH_SUITABILITY_POLICY_VERSION,
    targetId,
    status,
    profileInputsRecognized: false,
    growthTargetPct: 0,
    suitableForAllocationGapEvaluation: false,
    safetyBufferEvaluated: false,
    allocationGapEvaluated: false,
    contributionAmountCalculated: false,
    targetSelectedForSuggestion: false,
    suggestionGenerated: false,
    blockers: [],
    warnings: [],
    transactionsEnabled: false,
    walletSignatureRequired: false,
    ...extra,
  };
}

/**
 * Evaluate profile-level suitability. The target must be an enabled growth contribution target,
 * the profile inputs must resolve to recognized onboarding IDs, the existing allocation result must
 * be configured, and the target's mapped growth percentage must be > 0. No duplicate risk matrix.
 */
export function evaluateContributionTargetSuitability(
  target: InvestmentTargetDefinition,
  context: ContributionTargetSuitabilityContext,
): ContributionTargetSuitabilityResult {
  const targetId = target?.targetId ?? context?.targetId ?? "";

  // Target must be enabled as a growth contribution target (fail closed for disabled BTC/ETH/RWA).
  const enabledGrowthTarget = target && target.lifecycleStatus === "enabled" && target.enabledForMvp === true && target.canBeContributionTarget === true && target.suggestionRoles.includes("contribution_growth_target");
  if (!enabledGrowthTarget) return shell(targetId, "target_disabled", { blockers: ["target_disabled"] });

  // Profile inputs must resolve to the actual onboarding IDs (no independent risk judgement).
  const goalOk = typeof context.profile.goal === "string" && RECOGNIZED_PROFILE_GOAL_IDS.includes(context.profile.goal);
  const riskOk = typeof context.profile.riskLevel === "string" && RECOGNIZED_PROFILE_RISK_IDS.includes(context.profile.riskLevel);
  const horizonOk = typeof context.profile.timeHorizon === "string" && RECOGNIZED_PROFILE_HORIZON_IDS.includes(context.profile.timeHorizon);
  if (!goalOk || !riskOk || !horizonOk) return shell(targetId, "invalid_profile", { blockers: ["profile_invalid"] });

  // The existing engine's allocation result must be valid + configured.
  const alloc = context.targetAllocationResult;
  if (!alloc || alloc.status !== "configured") return shell(targetId, "invalid_allocation", { profileInputsRecognized: true, blockers: ["target_allocation_invalid"] });

  const growthTargetPct = alloc.targetPctByInvestmentTargetId[targetId] ?? 0;
  if (!(growthTargetPct > 0)) {
    return shell(targetId, "not_suitable", { profileInputsRecognized: true, growthTargetPct, blockers: ["target_not_suitable"], warnings: ["The existing target-allocation engine currently maps 0% growth to this target for this profile."] });
  }

  return shell(targetId, "suitable_for_gap_evaluation", {
    profileInputsRecognized: true,
    growthTargetPct,
    suitableForAllocationGapEvaluation: true,
    warnings: ["'suitable_for_gap_evaluation' means the later allocation-gap engine MAY consider this target. It does not mean the user should buy it; amount, Safety Buffer, and current holdings still constrain any future suggestion."],
  });
}

export interface SuitabilityValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateContributionTargetSuitabilityResult(result: unknown): SuitabilityValidationResult {
  const errors: string[] = [];
  if (!result || typeof result !== "object") return { valid: false, errors: ["result_not_an_object"] };
  const r = result as ContributionTargetSuitabilityResult;
  if (r.schemaVersion !== CONTRIBUTION_PLANNING_POLICY_SCHEMA_VERSION) errors.push("wrong_schema_version");
  const flagsFalse = r.safetyBufferEvaluated === false && r.allocationGapEvaluated === false && r.contributionAmountCalculated === false && r.targetSelectedForSuggestion === false && r.suggestionGenerated === false && r.transactionsEnabled === false && r.walletSignatureRequired === false;
  if (!flagsFalse) errors.push("capability_flag_enabled");
  if (r.status === "suitable_for_gap_evaluation") {
    if (!(r.growthTargetPct > 0) || !r.suitableForAllocationGapEvaluation) errors.push("suitable_requires_positive_growth");
    if (r.blockers.length > 0) errors.push("suitable_with_blockers");
  } else if (r.blockers.length === 0) errors.push("failure_without_blocker");
  return { valid: errors.length === 0, errors };
}

export interface SuitabilityDiagnostics {
  policyId: string;
  policyVersion: string;
  targetId: string;
  status: string;
  profileInputsRecognized: boolean;
  growthTargetPct: number;
  suitableForAllocationGapEvaluation: boolean;
  safetyBufferEvaluated: false;
  allocationGapEvaluated: false;
  contributionAmountCalculated: false;
  blockers: string[];
  warnings: string[];
}

export function getContributionTargetSuitabilityDiagnostics(result: ContributionTargetSuitabilityResult): SuitabilityDiagnostics {
  return {
    policyId: result.policyId,
    policyVersion: result.policyVersion,
    targetId: result.targetId,
    status: result.status,
    profileInputsRecognized: result.profileInputsRecognized,
    growthTargetPct: result.growthTargetPct,
    suitableForAllocationGapEvaluation: result.suitableForAllocationGapEvaluation,
    safetyBufferEvaluated: false,
    allocationGapEvaluated: false,
    contributionAmountCalculated: false,
    blockers: result.blockers,
    warnings: result.warnings,
  };
}

/**
 * dcaMinimumPolicy — Step 15C. The versioned DCA minimum-size + trigger policy. It FORMALIZES the
 * documented product rules — $50 absolute minimum meaningful suggestion, $250 excess-USDC DCA
 * trigger, 5-percentage-point underweight trigger, zero target overshoot — as deterministic
 * constants. It calculates NO amount, reads NO portfolio, evaluates NO safety buffer or gap, and
 * generates NO plan. The evaluator accepts a hypothetical amount for fixtures/diagnostics only.
 *
 * The $50 absolute minimum equals the existing engine constant MIN_DCA_SUGGESTION_USD (the engine
 * already suppresses sub-$50 suggestions, e.g. a $30 amount). The older "$50 OR 0.25% of portfolio"
 * wording has NO canonical implementation in this repo; it is documented as an unresolved
 * execution/materiality rule and is NOT enforced or reinterpreted here.
 */
import {
  CONTRIBUTION_PLANNING_POLICY_SCHEMA_VERSION,
  DCA_MINIMUM_POLICY_ID,
  DCA_MINIMUM_POLICY_VERSION,
} from "./contributionPlanningPolicyTypes";

export const DCA_MINIMUM_POLICY_EXISTS = true;

export const DCA_ABSOLUTE_MINIMUM_SUGGESTION_USD = 50;
export const DCA_EXCESS_USDC_TRIGGER_USD = 250;
export const DCA_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS = 5;
export const DCA_MAX_TARGET_OVERSHOOT_PERCENTAGE_POINTS = 0;
export const DCA_MINIMUM_POLICY_CURRENCY = "USD" as const;
/** The 0.25%-of-portfolio reference is documented but NOT implemented/enforced by this policy. */
export const DCA_QUARTER_PERCENT_RULE_ENFORCED = false;

export interface DcaMinimumPolicy {
  policyId: "dca_minimum_v1";
  policyVersion: "1.0.0";
  schemaVersion: "1.0.0";

  absoluteMinimumSuggestionUsd: 50;
  excessUsdcTriggerUsd: 250;
  underweightTriggerPercentagePoints: 5;
  maximumTargetOvershootPercentagePoints: 0;

  currency: "USD";

  recurringContributionMayUseAbsoluteMinimum: true;
  excessUsdcPlanRequiresExcessTrigger: true;

  quarterPercentRuleEnforced: false;

  executionCostEvaluated: false;
  allocationGapEvaluated: false;
  safetyBufferEvaluated: false;
  amountCalculated: false;
  planGenerated: false;
}

export function getDcaMinimumPolicy(): DcaMinimumPolicy {
  return {
    policyId: DCA_MINIMUM_POLICY_ID,
    policyVersion: DCA_MINIMUM_POLICY_VERSION,
    schemaVersion: CONTRIBUTION_PLANNING_POLICY_SCHEMA_VERSION,
    absoluteMinimumSuggestionUsd: 50,
    excessUsdcTriggerUsd: 250,
    underweightTriggerPercentagePoints: 5,
    maximumTargetOvershootPercentagePoints: 0,
    currency: "USD",
    recurringContributionMayUseAbsoluteMinimum: true,
    excessUsdcPlanRequiresExcessTrigger: true,
    quarterPercentRuleEnforced: false,
    executionCostEvaluated: false,
    allocationGapEvaluated: false,
    safetyBufferEvaluated: false,
    amountCalculated: false,
    planGenerated: false,
  };
}

export interface DcaPolicyValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDcaMinimumPolicy(policy: unknown): DcaPolicyValidationResult {
  const errors: string[] = [];
  if (!policy || typeof policy !== "object") return { valid: false, errors: ["policy_not_an_object"] };
  const p = policy as DcaMinimumPolicy;
  if (p.policyId !== DCA_MINIMUM_POLICY_ID) errors.push("wrong_policy_id");
  if (p.policyVersion !== DCA_MINIMUM_POLICY_VERSION) errors.push("wrong_policy_version");
  if (p.absoluteMinimumSuggestionUsd !== 50) errors.push("wrong_absolute_minimum");
  if (p.excessUsdcTriggerUsd !== 250) errors.push("wrong_excess_trigger");
  if (p.underweightTriggerPercentagePoints !== 5) errors.push("wrong_underweight_trigger");
  if (p.maximumTargetOvershootPercentagePoints !== 0) errors.push("wrong_overshoot");
  if (p.currency !== "USD") errors.push("wrong_currency");
  if (p.quarterPercentRuleEnforced !== false) errors.push("quarter_percent_rule_enforced");
  const flagsFalse = p.executionCostEvaluated === false && p.allocationGapEvaluated === false && p.safetyBufferEvaluated === false && p.amountCalculated === false && p.planGenerated === false;
  if (!flagsFalse) errors.push("capability_flag_enabled");
  return { valid: errors.length === 0, errors };
}

export type DcaFundingMode = "upcoming_contribution" | "existing_excess_usdc";

export interface DcaMinimumEvaluation {
  status: "passes_absolute_minimum" | "below_absolute_minimum" | "passes_excess_usdc_trigger" | "below_excess_usdc_trigger" | "invalid";
  amountUsd: number;
  fundingMode: DcaFundingMode;
  absoluteMinimumPassed: boolean;
  excessUsdcTriggerPassed?: boolean;
  allocationGapEvaluated: false;
  safetyBufferEvaluated: false;
  planGenerated: false;
  suggestionGenerated: false;
  blockers: string[];
}

/**
 * Evaluate a HYPOTHETICAL amount against the minimum policy (fixtures/diagnostics only). It reads
 * no portfolio and generates no plan. Upcoming recurring contributions are gated by the $50
 * absolute minimum; existing excess-USDC plans additionally require the $250 excess trigger.
 */
export function evaluateDcaAmountAgainstMinimumPolicy(amountUsd: unknown, fundingMode: DcaFundingMode, policy: DcaMinimumPolicy = getDcaMinimumPolicy()): DcaMinimumEvaluation {
  const base: DcaMinimumEvaluation = { status: "invalid", amountUsd: NaN, fundingMode, absoluteMinimumPassed: false, allocationGapEvaluated: false, safetyBufferEvaluated: false, planGenerated: false, suggestionGenerated: false, blockers: [] };
  if (typeof amountUsd !== "number" || !Number.isFinite(amountUsd) || amountUsd < 0) return { ...base, blockers: ["invalid_amount"] };

  const absoluteMinimumPassed = amountUsd >= policy.absoluteMinimumSuggestionUsd;
  if (fundingMode === "upcoming_contribution") {
    return { ...base, amountUsd, absoluteMinimumPassed, status: absoluteMinimumPassed ? "passes_absolute_minimum" : "below_absolute_minimum", ...(absoluteMinimumPassed ? {} : { blockers: ["below_absolute_minimum"] }) };
  }
  // existing_excess_usdc — must also clear the $250 excess trigger.
  const excessUsdcTriggerPassed = amountUsd >= policy.excessUsdcTriggerUsd;
  return {
    ...base,
    amountUsd,
    absoluteMinimumPassed,
    excessUsdcTriggerPassed,
    status: excessUsdcTriggerPassed ? "passes_excess_usdc_trigger" : "below_excess_usdc_trigger",
    ...(excessUsdcTriggerPassed ? {} : { blockers: ["below_excess_usdc_trigger"] }),
  };
}

export interface DcaMinimumDiagnostics {
  policyId: string;
  policyVersion: string;
  absoluteMinimumSuggestionUsd: number;
  excessUsdcTriggerUsd: number;
  underweightTriggerPercentagePoints: number;
  maximumTargetOvershootPercentagePoints: number;
  quarterPercentRuleEnforced: false;
  allocationGapEvaluated: false;
  safetyBufferEvaluated: false;
  amountCalculated: false;
  planGenerated: false;
}

export function getDcaMinimumPolicyDiagnostics(policy: DcaMinimumPolicy = getDcaMinimumPolicy()): DcaMinimumDiagnostics {
  return {
    policyId: policy.policyId,
    policyVersion: policy.policyVersion,
    absoluteMinimumSuggestionUsd: policy.absoluteMinimumSuggestionUsd,
    excessUsdcTriggerUsd: policy.excessUsdcTriggerUsd,
    underweightTriggerPercentagePoints: policy.underweightTriggerPercentagePoints,
    maximumTargetOvershootPercentagePoints: policy.maximumTargetOvershootPercentagePoints,
    quarterPercentRuleEnforced: false,
    allocationGapEvaluated: false,
    safetyBufferEvaluated: false,
    amountCalculated: false,
    planGenerated: false,
  };
}

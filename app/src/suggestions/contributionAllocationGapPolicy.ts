/**
 * contributionAllocationGapPolicy — Step 15D. The deterministic classification policy for the
 * allocation-gap engine: the tolerances and the underweight/at-target/overweight + 5-point-trigger
 * rules. It REUSES the existing 5-percentage-point underweight trigger from dcaMinimumPolicy.ts
 * (no conflicting duplicate) and introduces no additional "near target" threshold.
 */
import { DCA_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS } from "./dcaMinimumPolicy";

/** Percentage-point comparison tolerance (allocation percentages). */
export const CONTRIBUTION_ALLOCATION_PERCENTAGE_TOLERANCE = 1e-9;
/** USD value comparison tolerance. */
export const CONTRIBUTION_ALLOCATION_VALUE_TOLERANCE_USD = 1e-9;

/** The underweight DCA trigger, reused verbatim from the Step 15C minimum policy. */
export const CONTRIBUTION_ALLOCATION_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS = DCA_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS;

export type ContributionGapClassification =
  | "underweight_trigger_met"
  | "underweight_below_trigger"
  | "at_target"
  | "overweight"
  | "not_evaluable";

export interface ContributionGapClassificationResult {
  classification: ContributionGapClassification;
  /** targetPct − currentPct (positive = underweight). Undefined when no valid current percentage. */
  signedGapPercentagePoints?: number;
  underweight: boolean;
  overweight: boolean;
  atTarget: boolean;
  underweightTriggerMet: boolean;
}

/**
 * Classify a target given its current and target percentages. `currentPct` may be undefined when no
 * valid current allocation exists (→ `not_evaluable`). Uses the shared percentage tolerance and the
 * reused 5-point trigger. Underweight trigger met when `signedGap + tolerance >= trigger`.
 */
export function classifyContributionAllocationGap(
  currentPct: number | undefined,
  targetPct: number,
  triggerPercentagePoints: number = CONTRIBUTION_ALLOCATION_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS,
): ContributionGapClassificationResult {
  const tol = CONTRIBUTION_ALLOCATION_PERCENTAGE_TOLERANCE;
  if (currentPct == null || !Number.isFinite(currentPct) || !Number.isFinite(targetPct)) {
    return { classification: "not_evaluable", underweight: false, overweight: false, atTarget: false, underweightTriggerMet: false };
  }
  const signedGap = targetPct - currentPct;
  if (signedGap > tol) {
    const underweightTriggerMet = signedGap + tol >= triggerPercentagePoints;
    return {
      classification: underweightTriggerMet ? "underweight_trigger_met" : "underweight_below_trigger",
      signedGapPercentagePoints: signedGap,
      underweight: true,
      overweight: false,
      atTarget: false,
      underweightTriggerMet,
    };
  }
  if (-signedGap > tol) {
    return { classification: "overweight", signedGapPercentagePoints: signedGap, underweight: false, overweight: true, atTarget: false, underweightTriggerMet: false };
  }
  return { classification: "at_target", signedGapPercentagePoints: signedGap, underweight: false, overweight: false, atTarget: true, underweightTriggerMet: false };
}

export interface ContributionAllocationGapPolicyValidation {
  valid: boolean;
  errors: string[];
}

/** Validate the policy constants (fails closed; guards against a drifted/duplicated trigger). */
export function validateContributionAllocationGapPolicy(): ContributionAllocationGapPolicyValidation {
  const errors: string[] = [];
  if (!(CONTRIBUTION_ALLOCATION_PERCENTAGE_TOLERANCE > 0) || CONTRIBUTION_ALLOCATION_PERCENTAGE_TOLERANCE > 1e-6) errors.push("invalid_percentage_tolerance");
  if (!(CONTRIBUTION_ALLOCATION_VALUE_TOLERANCE_USD > 0) || CONTRIBUTION_ALLOCATION_VALUE_TOLERANCE_USD > 1e-6) errors.push("invalid_value_tolerance");
  if (CONTRIBUTION_ALLOCATION_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS !== 5) errors.push("wrong_underweight_trigger");
  if (CONTRIBUTION_ALLOCATION_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS !== DCA_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS) errors.push("trigger_not_reused_from_dca_policy");
  return { valid: errors.length === 0, errors };
}

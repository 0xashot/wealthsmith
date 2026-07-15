/**
 * contributionPriorityPolicy — Step 15E. The fixed priority ORDER and tolerances for the
 * contribution-priority gate. Category priority (Safety Buffer → stable → growth → On Track) always
 * overrides gap size — the engine never compares the largest USD or percentage gap to decide
 * priority. It REUSES the existing 5-percentage-point underweight trigger (via the Step 15D
 * classification / `underweightTriggerMet` fields) and introduces NO second allocation trigger and
 * NO "near target" state.
 */
import { DCA_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS } from "./dcaMinimumPolicy";

/** The deterministic priority order. Index 0 is highest priority. */
export const CONTRIBUTION_PRIORITY_ORDER = ["safety_buffer", "stable_allocation", "growth_allocation", "on_track"] as const;

/** USD tolerance for the Safety Buffer shortfall completeness test. */
export const CONTRIBUTION_PRIORITY_VALUE_TOLERANCE_USD = 1e-9;

/** The reused underweight trigger (stable + growth both use the Step 15D result, not a new trigger). */
export const CONTRIBUTION_PRIORITY_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS = DCA_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS;

export interface ContributionPriorityPolicyValidation {
  valid: boolean;
  errors: string[];
}

/** Validate the priority policy constants (fails closed; guards order + reused trigger). */
export function validateContributionPriorityPolicy(): ContributionPriorityPolicyValidation {
  const errors: string[] = [];
  const expected = ["safety_buffer", "stable_allocation", "growth_allocation", "on_track"];
  if (CONTRIBUTION_PRIORITY_ORDER.join(",") !== expected.join(",")) errors.push("wrong_priority_order");
  if (!(CONTRIBUTION_PRIORITY_VALUE_TOLERANCE_USD > 0) || CONTRIBUTION_PRIORITY_VALUE_TOLERANCE_USD > 1e-6) errors.push("invalid_value_tolerance");
  if (CONTRIBUTION_PRIORITY_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS !== 5) errors.push("wrong_underweight_trigger");
  if (CONTRIBUTION_PRIORITY_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS !== DCA_UNDERWEIGHT_TRIGGER_PERCENTAGE_POINTS) errors.push("trigger_not_reused");
  return { valid: errors.length === 0, errors };
}

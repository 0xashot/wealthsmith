/**
 * contributionPlanPolicy — Step 15G. Plan-level constants + the v1 staged-DCA policy for existing
 * excess USDC. No canonical implemented tranche policy exists in the repo, so this formalizes the
 * documented MVP rule: 4 tranches over 14 days with deterministic relative day offsets [0, 5, 9, 14]
 * (no calendar dates, no timezone, no market-timing, no volatility prediction). The per-tranche
 * minimum REUSES the Step 15C $50 (`DCA_ABSOLUTE_MINIMUM_SUGGESTION_USD`) — no duplicate constant.
 */
import { DCA_ABSOLUTE_MINIMUM_SUGGESTION_USD } from "./dcaMinimumPolicy";

export const CONTRIBUTION_PLAN_USE_FULL_CAPPED_PRIMARY_CAPACITY = true;
export const CONTRIBUTION_PLAN_MIXED_FUNDING_ALLOWED = false;
export const CONTRIBUTION_PLAN_ALTERNATIVE_PLAN_GENERATED = false;
export const CONTRIBUTION_PLAN_RESIDUAL_ROUTING_ENABLED = false;
export const CONTRIBUTION_PLAN_CALENDAR_DATES_GENERATED = false;

export const EXCESS_USDC_DCA_TRANCHE_COUNT = 4;
export const EXCESS_USDC_DCA_DURATION_DAYS = 14;
export const UPCOMING_CONTRIBUTION_ADDITIONAL_TRANCHE_SPLIT = false;

/** Minimum allowed tranche size — reused from the Step 15C minimum policy ($50). */
export const CONTRIBUTION_PLAN_MINIMUM_TRANCHE_USD = DCA_ABSOLUTE_MINIMUM_SUGGESTION_USD;

/**
 * Deterministic relative day offsets for the staged existing-excess-USDC DCA plan:
 * `round(index * durationDays / (trancheCount - 1))` → [0, 5, 9, 14] for 4 tranches over 14 days.
 * No calendar date, timezone, market-timing, or volatility logic is applied.
 */
export function getExcessUsdcDcaRelativeDayOffsets(trancheCount: number = EXCESS_USDC_DCA_TRANCHE_COUNT, durationDays: number = EXCESS_USDC_DCA_DURATION_DAYS): number[] {
  const offsets: number[] = [];
  for (let i = 0; i < trancheCount; i++) offsets.push(Math.round((i * durationDays) / (trancheCount - 1)));
  return offsets;
}

export interface ContributionPlanPolicyValidation {
  valid: boolean;
  errors: string[];
}

/** Validate the plan + staged-DCA policy constants (fails closed; guards offsets + reused minimum). */
export function validateContributionPlanPolicy(): ContributionPlanPolicyValidation {
  const errors: string[] = [];
  if (CONTRIBUTION_PLAN_USE_FULL_CAPPED_PRIMARY_CAPACITY !== true) errors.push("full_capped_capacity_disabled");
  if (CONTRIBUTION_PLAN_MIXED_FUNDING_ALLOWED !== false) errors.push("mixed_funding_enabled");
  if (CONTRIBUTION_PLAN_ALTERNATIVE_PLAN_GENERATED !== false) errors.push("alternative_plan_enabled");
  if (CONTRIBUTION_PLAN_RESIDUAL_ROUTING_ENABLED !== false) errors.push("residual_routing_enabled");
  if (CONTRIBUTION_PLAN_CALENDAR_DATES_GENERATED !== false) errors.push("calendar_dates_enabled");
  if (UPCOMING_CONTRIBUTION_ADDITIONAL_TRANCHE_SPLIT !== false) errors.push("upcoming_tranche_split_enabled");
  if (EXCESS_USDC_DCA_TRANCHE_COUNT !== 4) errors.push("wrong_tranche_count");
  if (EXCESS_USDC_DCA_DURATION_DAYS !== 14) errors.push("wrong_duration_days");
  if (CONTRIBUTION_PLAN_MINIMUM_TRANCHE_USD !== 50 || CONTRIBUTION_PLAN_MINIMUM_TRANCHE_USD !== DCA_ABSOLUTE_MINIMUM_SUGGESTION_USD) errors.push("minimum_not_reused");

  const offsets = getExcessUsdcDcaRelativeDayOffsets();
  if (offsets.join(",") !== "0,5,9,14") errors.push("wrong_offsets");
  if (offsets[0] !== 0) errors.push("first_offset_not_zero");
  if (offsets[offsets.length - 1] !== EXCESS_USDC_DCA_DURATION_DAYS) errors.push("last_offset_not_duration");
  if (new Set(offsets).size !== offsets.length) errors.push("offsets_not_unique");
  for (let i = 1; i < offsets.length; i++) if (!(offsets[i] > offsets[i - 1])) errors.push("offsets_not_ascending");
  return { valid: errors.length === 0, errors };
}

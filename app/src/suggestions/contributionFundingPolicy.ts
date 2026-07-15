/**
 * contributionFundingPolicy — Step 15F. The deterministic source ORDER and tolerances for funding
 * selection. Upcoming contribution is preferred (WealthSmith follows the user's onboarding
 * contribution size/frequency first); existing excess USDC is a growth-only alternative. Mixed
 * funding is disabled in v1. Source order — never largest capacity or highest liquidity — decides
 * the primary. It REUSES the Step 15C minimums ($50 absolute, $250 excess-USDC) and defines no new
 * thresholds.
 */
import { DCA_ABSOLUTE_MINIMUM_SUGGESTION_USD, DCA_EXCESS_USDC_TRIGGER_USD } from "./dcaMinimumPolicy";

/** Deterministic funding-source preference order. Index 0 is primary-preferred. */
export const CONTRIBUTION_FUNDING_SOURCE_ORDER = ["upcoming_contribution", "existing_excess_usdc"] as const;

export const CONTRIBUTION_FUNDING_VALUE_TOLERANCE_USD = 1e-9;

export const CONTRIBUTION_MIXED_FUNDING_ALLOWED = false;

/** Reused Step 15C minimums (no new thresholds introduced here). */
export const CONTRIBUTION_FUNDING_ABSOLUTE_MINIMUM_USD = DCA_ABSOLUTE_MINIMUM_SUGGESTION_USD;
export const CONTRIBUTION_FUNDING_EXCESS_USDC_TRIGGER_USD = DCA_EXCESS_USDC_TRIGGER_USD;

export interface ContributionFundingPolicyValidation {
  valid: boolean;
  errors: string[];
}

/** Validate the funding policy constants (fails closed; guards order, tolerance, reused minimums). */
export function validateContributionFundingPolicy(): ContributionFundingPolicyValidation {
  const errors: string[] = [];
  if (CONTRIBUTION_FUNDING_SOURCE_ORDER.join(",") !== "upcoming_contribution,existing_excess_usdc") errors.push("wrong_source_order");
  if (!(CONTRIBUTION_FUNDING_VALUE_TOLERANCE_USD > 0) || CONTRIBUTION_FUNDING_VALUE_TOLERANCE_USD > 1e-6) errors.push("invalid_value_tolerance");
  if (CONTRIBUTION_MIXED_FUNDING_ALLOWED !== false) errors.push("mixed_funding_enabled");
  if (CONTRIBUTION_FUNDING_ABSOLUTE_MINIMUM_USD !== 50 || CONTRIBUTION_FUNDING_ABSOLUTE_MINIMUM_USD !== DCA_ABSOLUTE_MINIMUM_SUGGESTION_USD) errors.push("absolute_minimum_not_reused");
  if (CONTRIBUTION_FUNDING_EXCESS_USDC_TRIGGER_USD !== 250 || CONTRIBUTION_FUNDING_EXCESS_USDC_TRIGGER_USD !== DCA_EXCESS_USDC_TRIGGER_USD) errors.push("excess_trigger_not_reused");
  return { valid: errors.length === 0, errors };
}

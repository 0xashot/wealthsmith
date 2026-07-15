/**
 * contributionPlanningPolicyTypes — Step 15C. Shared versions, policy IDs, statuses, and blocker
 * IDs for the deterministic contribution-planning POLICY layer. These policies configure the
 * generic investment-target registry (Step 15A) so a LATER allocation-gap engine can evaluate a
 * target — they do NOT calculate a user's gap, decide where a contribution goes, size an amount,
 * build a plan, or generate a suggestion. Read-only; no execution/signatures.
 */
export const CONTRIBUTION_PLANNING_POLICY_SCHEMA_VERSION = "1.0.0";

export const GROWTH_TARGET_ALLOCATION_POLICY_ID = "growth_target_allocation_v1";
export const GROWTH_TARGET_ALLOCATION_POLICY_VERSION = "1.0.0";

export const DCA_MINIMUM_POLICY_ID = "dca_minimum_v1";
export const DCA_MINIMUM_POLICY_VERSION = "1.0.0";

export const SOL_GROWTH_SUITABILITY_POLICY_ID = "sol_growth_suitability_v1";
export const SOL_GROWTH_SUITABILITY_POLICY_VERSION = "1.0.0";

export const CONTRIBUTION_PRICE_POLICY_ID = "contribution_price_freshness_v1";
export const CONTRIBUTION_PRICE_POLICY_VERSION = "1.0.0";

export type ContributionPlanningPolicyStatus = "configured" | "incomplete" | "invalid" | "unsupported";

export type ContributionPlanningReadinessBlocker =
  | "target_allocation_missing"
  | "target_allocation_invalid"
  | "target_allocation_version_unsupported"
  | "target_not_in_enabled_bucket"
  | "multiple_growth_targets_require_suballocation_policy"
  | "minimum_policy_missing"
  | "minimum_policy_invalid"
  | "suitability_policy_missing"
  | "profile_invalid"
  | "target_not_suitable"
  | "target_disabled"
  | "price_missing"
  | "price_unavailable"
  | "price_stale"
  | "price_invalid"
  | "price_source_unapproved"
  | "price_timestamp_in_future"
  | "price_provenance_missing"
  | "safety_buffer_not_evaluated"
  | "allocation_gap_not_evaluated"
  | "contribution_amount_not_calculated";

/**
 * investmentTargetTypes — Step 15A. The versioned, ASSET-AGNOSTIC investment-target model that
 * future contribution-planning and DCA logic will consume. It describes WHAT an asset is allowed
 * to do (identity, category, lifecycle, holding sources, suggestion roles, data/technical
 * requirements, future suitability-policy references) — it does NOT decide whether an asset is
 * suitable for a user, whether it is underweight, how much to contribute, or whether to show a
 * suggestion. Those are later deterministic policy layers.
 *
 * GENERIC BY CONSTRUCTION: no type assumes the target is SOL, that the holding lives in a Solana
 * wallet, or that BTC/ETH are wrapped Solana tokens. Manual holdings are representable. A future
 * RWA must be a SPECIFIC reviewed product (its own pricing/liquidity/lockup/eligibility/
 * jurisdiction/minimum/risk) — a generic "RWA" asset is forbidden. No execution-capable status
 * exists in this step.
 */
export const INVESTMENT_TARGET_SCHEMA_VERSION = "1.0.0";
export const INVESTMENT_TARGET_REGISTRY_VERSION = "1.0.0";

/**
 * MVP default freshness policy for a contribution-planning price (a later step may override this
 * per target via `configuredPriceSourceId` / a policy key). There is no pre-existing DCA-price
 * freshness constant to reuse, so this is the documented default — not a conflicting redefinition.
 */
export const INVESTMENT_TARGET_DEFAULT_PRICE_MAX_AGE_MS = 3_600_000; // 60 minutes

export type InvestmentTargetId = string;

export type InvestmentTargetCategory = "growth_crypto" | "stable_asset" | "rwa";

export type InvestmentTargetLifecycleStatus = "enabled" | "modeled_not_enabled" | "blocked";

export type InvestmentTargetHoldingSource =
  | "connected_wallet"
  | "manual_entry"
  | "protocol_position"
  | "future_external_import";

export type InvestmentTargetSuggestionRole =
  | "contribution_growth_target"
  | "contribution_funding_source"
  | "safety_buffer_asset"
  | "stable_allocation_destination"
  | "rebalance_increase_target"
  | "rebalance_reduce_source"
  | "trim_destination"
  | "yield_source_asset";

export type InvestmentTargetExecutionStatus = "read_only_only" | "execution_not_supported";

export type InvestmentTargetReadinessBlocker =
  | "target_disabled"
  | "target_blocked"
  | "price_source_not_configured"
  | "price_unavailable"
  | "price_stale"
  | "target_allocation_not_configured"
  | "minimum_amount_not_configured"
  | "suitability_policy_not_configured"
  | "holding_source_not_supported"
  | "manual_entry_not_supported"
  | "product_not_approved"
  | "jurisdiction_rules_not_configured"
  | "liquidity_rules_not_configured"
  | "lockup_rules_not_configured"
  | "risk_review_incomplete";

export interface InvestmentTargetPriceRequirements {
  priceRequiredForContributionPlanning: boolean;
  maximumPriceAgeMs?: number;
  configuredPriceSourceId?: string;
}

export interface InvestmentTargetAllocationRequirements {
  targetAllocationRequired: boolean;
  allocationPolicyKey?: string;
  maximumOvershootAllowed: false;
}

export interface InvestmentTargetMinimumRequirements {
  minimumSuggestedAmountUsd?: number;
  minimumPolicyKey?: string;
}

export interface InvestmentTargetRwaRequirements {
  productSpecificApprovalRequired: true;
  jurisdictionEligibilityRequired: true;
  liquidityReviewRequired: true;
  lockupReviewRequired: true;
  issuerOrProtocolReviewRequired: true;
  pricingMethodRequired: true;
}

export interface InvestmentTargetDefinition {
  schemaVersion: "1.0.0";

  targetId: InvestmentTargetId;
  /** Canonical asset identity. For native BTC/ETH this is a NATIVE-CHAIN id (never a Solana mint). */
  assetId: string;
  symbol: string;
  displayName: string;

  category: InvestmentTargetCategory;
  lifecycleStatus: InvestmentTargetLifecycleStatus;

  holdingSources: InvestmentTargetHoldingSource[];
  suggestionRoles: InvestmentTargetSuggestionRole[];

  canBeContributionTarget: boolean;
  canFundContributionPlan: boolean;
  canServeAsSafetyBuffer: boolean;
  canReceiveStableAllocation: boolean;

  priceRequirements: InvestmentTargetPriceRequirements;
  allocationRequirements: InvestmentTargetAllocationRequirements;
  minimumRequirements: InvestmentTargetMinimumRequirements;

  suitabilityPolicyKey?: string;
  rwaRequirements?: InvestmentTargetRwaRequirements;

  executionStatus: "read_only_only";
  transactionsEnabled: false;
  walletSignatureRequired: false;

  enabledForMvp: boolean;

  /** Intrinsic (definition-level) readiness blockers — e.g. a modeled-not-enabled target. Runtime
   *  blockers (price/policy/holding source) are evaluated by the eligibility layer from context. */
  activationBlockers: InvestmentTargetReadinessBlocker[];
  notes: string[];
}

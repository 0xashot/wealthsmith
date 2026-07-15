/**
 * investmentTargetRegistry — Step 15A. The deterministic, versioned, asset-agnostic canonical
 * registry of investment targets + read-only accessors + validators. It is consumed ONLY by its
 * own validators, its eligibility layer, fixtures, and docs — no product-facing file imports it
 * yet. It never calculates contribution amounts, allocation gaps, DCA plans, or suggestions, and
 * never enables execution/signatures.
 *
 * MVP: SOL is the only enabled growth-asset contribution target; USDC funds plans / protects the
 * buffer / receives stable allocation (not a growth DCA target). BTC and ETH are MODELED but not
 * enabled, as NATIVE-chain assets (never wrapped Solana tokens). No generic RWA entry exists —
 * RWA support is proven only through the type system + synthetic fixtures.
 */
import {
  INVESTMENT_TARGET_SCHEMA_VERSION,
  INVESTMENT_TARGET_DEFAULT_PRICE_MAX_AGE_MS,
  type InvestmentTargetDefinition,
  type InvestmentTargetId,
  type InvestmentTargetReadinessBlocker,
  type InvestmentTargetSuggestionRole,
} from "./investmentTargetTypes";
export { INVESTMENT_TARGET_SCHEMA_VERSION, INVESTMENT_TARGET_REGISTRY_VERSION } from "./investmentTargetTypes";

/* ------------------------------------------------------------------ *
 * Explicit feature-state constants (Step 15A scope).
 * ------------------------------------------------------------------ */
export const INVESTMENT_TARGET_REGISTRY_EXISTS = true;

export const CONTRIBUTION_PLANNING_EXISTS = false;
// Step 15B — contribution-frequency (rhythm) normalization now exists. Both names refer to the
// same layer (the field is "contribution_frequency" in onboarding); no contradictory duplicate.
export const CONTRIBUTION_RHYTHM_NORMALIZATION_EXISTS = true;
export const CONTRIBUTION_FREQUENCY_NORMALIZATION_EXISTS = true;
export const CONTRIBUTION_PRIORITY_ENGINE_EXISTS = false;
// Step 15D — the deterministic allocation-gap engine now exists (mathematical gaps/caps only; it
// never selects a target, evaluates funding/the Safety Buffer, or changes product output).
export const TARGET_ALLOCATION_GAP_ENGINE_EXISTS = true;
export const TARGET_ALLOCATION_GAP_UPDATES_PRODUCT_OUTPUT = false;
export const TARGET_ALLOCATION_GAP_SELECTS_TARGET = false;
export const TARGET_ALLOCATION_GAP_EVALUATES_FUNDING = false;
export const TARGET_ALLOCATION_GAP_EVALUATES_SAFETY_BUFFER = false;
export const DCA_PLAN_GENERATION_EXISTS = false;
export const DCA_SUGGESTION_ENABLED = false;
export const CONTRIBUTION_DATES_GENERATED = false;
export const CONTRIBUTION_TARGET_SELECTION_ENABLED = false;
export const CONTRIBUTION_AUTOMATION_ENABLED = false;
// Step 15C — contribution-planning POLICY layers now exist (config-only; no gap/plan/suggestion).
export const GROWTH_TARGET_ALLOCATION_POLICY_EXISTS = true;
export const DCA_MINIMUM_POLICY_EXISTS = true;
export const SOL_GROWTH_SUITABILITY_POLICY_EXISTS = true;
export const CONTRIBUTION_PRICE_POLICY_EXISTS = true;
export const CONTRIBUTION_TARGET_POLICY_ELIGIBILITY_EXISTS = true;
export const CONTRIBUTION_LIVE_PRICE_FETCH_ENABLED = false;
export const CONTRIBUTION_POLICY_UPDATES_PRODUCT_OUTPUT = false;

export const SOL_CONTRIBUTION_TARGET_MODELED = true;
export const SOL_CONTRIBUTION_TARGET_ENABLED_FOR_MVP = true;

export const BTC_CONTRIBUTION_TARGET_MODELED = true;
export const BTC_CONTRIBUTION_TARGET_ENABLED = false;

export const ETH_CONTRIBUTION_TARGET_MODELED = true;
export const ETH_CONTRIBUTION_TARGET_ENABLED = false;

export const RWA_TARGET_MODEL_SUPPORTED = true;
export const RWA_CONTRIBUTION_TARGET_ENABLED = false;

export const USDC_GROWTH_DCA_TARGET_ENABLED = false;
export const USDC_CONTRIBUTION_FUNDING_SOURCE_ENABLED = true;
export const USDC_SAFETY_BUFFER_ROLE_ENABLED = true;

export const INVESTMENT_TARGET_TRANSACTIONS_ENABLED = false;
export const INVESTMENT_TARGET_SIGNATURE_REQUIRED = false;

/** Canonical public Solana mints (reused from wallet/walletPosition.ts TOKEN_REGISTRY). */
const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/** Forbidden generic RWA identifiers — a future RWA must be a SPECIFIC reviewed product. */
export const FORBIDDEN_GENERIC_RWA_TARGET_IDS: readonly string[] = ["rwa", "generic_rwa", "rwa_placeholder", "all_rwa"];

/** A base58 string shaped like a Solana mint (32–44 chars). Native BTC/ETH must NOT look like this. */
const SOLANA_MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/* ------------------------------------------------------------------ *
 * Canonical registry (order: usdc, sol, btc, eth — display determinism, NOT ranking).
 * ------------------------------------------------------------------ */
const REGISTRY: InvestmentTargetDefinition[] = [
  // USDC — stable funding source / safety buffer / stable allocation destination (NOT growth DCA).
  {
    schemaVersion: INVESTMENT_TARGET_SCHEMA_VERSION,
    targetId: "usdc",
    assetId: USDC_MINT,
    symbol: "USDC",
    displayName: "USD Coin",
    category: "stable_asset",
    lifecycleStatus: "enabled",
    holdingSources: ["connected_wallet"],
    suggestionRoles: ["contribution_funding_source", "safety_buffer_asset", "stable_allocation_destination", "trim_destination", "yield_source_asset"],
    canBeContributionTarget: false,
    canFundContributionPlan: true,
    canServeAsSafetyBuffer: true,
    canReceiveStableAllocation: true,
    priceRequirements: { priceRequiredForContributionPlanning: false },
    allocationRequirements: { targetAllocationRequired: false, maximumOvershootAllowed: false },
    minimumRequirements: {},
    executionStatus: "read_only_only",
    transactionsEnabled: false,
    walletSignatureRequired: false,
    enabledForMvp: true,
    activationBlockers: [],
    notes: ["USDC funds contribution plans, protects the safety buffer, and receives stable allocation. It is NOT a normal growth DCA target."],
  },
  // SOL — the ONLY enabled MVP growth-asset contribution target.
  {
    schemaVersion: INVESTMENT_TARGET_SCHEMA_VERSION,
    targetId: "sol",
    assetId: SOL_MINT,
    symbol: "SOL",
    displayName: "Solana",
    category: "growth_crypto",
    lifecycleStatus: "enabled",
    holdingSources: ["connected_wallet", "protocol_position"],
    suggestionRoles: ["contribution_growth_target", "rebalance_increase_target", "rebalance_reduce_source"],
    canBeContributionTarget: true,
    canFundContributionPlan: false,
    canServeAsSafetyBuffer: false,
    canReceiveStableAllocation: false,
    // Step 15C — real versioned policy keys + canonical internal price source (token_price_service,
    // i.e. wallet/tokenPrices.ts; providers sit behind it, never called from React for planning).
    priceRequirements: { priceRequiredForContributionPlanning: true, maximumPriceAgeMs: INVESTMENT_TARGET_DEFAULT_PRICE_MAX_AGE_MS, configuredPriceSourceId: "token_price_service" },
    allocationRequirements: { targetAllocationRequired: true, allocationPolicyKey: "growth_target_allocation_v1", maximumOvershootAllowed: false },
    minimumRequirements: { minimumPolicyKey: "dca_minimum_v1" },
    suitabilityPolicyKey: "sol_growth_suitability_v1",
    executionStatus: "read_only_only",
    transactionsEnabled: false,
    walletSignatureRequired: false,
    enabledForMvp: true,
    activationBlockers: [],
    notes: ["SOL is the enabled MVP growth DCA target. Contribution amount, allocation gap, and suitability are decided later by deterministic policy layers, not here."],
  },
  // BTC — NATIVE Bitcoin, MODELED but not enabled. Never wrapped BTC.
  {
    schemaVersion: INVESTMENT_TARGET_SCHEMA_VERSION,
    targetId: "btc",
    assetId: "bitcoin:native",
    symbol: "BTC",
    displayName: "Bitcoin",
    category: "growth_crypto",
    lifecycleStatus: "modeled_not_enabled",
    holdingSources: ["manual_entry"],
    suggestionRoles: ["contribution_growth_target", "rebalance_increase_target", "rebalance_reduce_source"],
    canBeContributionTarget: false,
    canFundContributionPlan: false,
    canServeAsSafetyBuffer: false,
    canReceiveStableAllocation: false,
    priceRequirements: { priceRequiredForContributionPlanning: true, maximumPriceAgeMs: INVESTMENT_TARGET_DEFAULT_PRICE_MAX_AGE_MS },
    allocationRequirements: { targetAllocationRequired: true, allocationPolicyKey: "growth_target_allocation_v_future", maximumOvershootAllowed: false },
    minimumRequirements: { minimumPolicyKey: "dca_minimum_v_future" },
    suitabilityPolicyKey: "btc_growth_suitability_v_future",
    executionStatus: "read_only_only",
    transactionsEnabled: false,
    walletSignatureRequired: false,
    enabledForMvp: false,
    activationBlockers: ["target_disabled", "price_source_not_configured", "target_allocation_not_configured", "suitability_policy_not_configured", "manual_entry_not_supported"],
    notes: ["Native Bitcoin (assetId 'bitcoin:native'), NOT wrapped BTC. Manual entry is MODELED only — no BTC wallet connector, no ownership verification, no execution. Disabled until a future step explicitly activates it."],
  },
  // ETH — NATIVE Ethereum, MODELED but not enabled. Never wrapped ETH.
  {
    schemaVersion: INVESTMENT_TARGET_SCHEMA_VERSION,
    targetId: "eth",
    assetId: "ethereum:native",
    symbol: "ETH",
    displayName: "Ethereum",
    category: "growth_crypto",
    lifecycleStatus: "modeled_not_enabled",
    holdingSources: ["manual_entry"],
    suggestionRoles: ["contribution_growth_target", "rebalance_increase_target", "rebalance_reduce_source"],
    canBeContributionTarget: false,
    canFundContributionPlan: false,
    canServeAsSafetyBuffer: false,
    canReceiveStableAllocation: false,
    priceRequirements: { priceRequiredForContributionPlanning: true, maximumPriceAgeMs: INVESTMENT_TARGET_DEFAULT_PRICE_MAX_AGE_MS },
    allocationRequirements: { targetAllocationRequired: true, allocationPolicyKey: "growth_target_allocation_v_future", maximumOvershootAllowed: false },
    minimumRequirements: { minimumPolicyKey: "dca_minimum_v_future" },
    suitabilityPolicyKey: "eth_growth_suitability_v_future",
    executionStatus: "read_only_only",
    transactionsEnabled: false,
    walletSignatureRequired: false,
    enabledForMvp: false,
    activationBlockers: ["target_disabled", "price_source_not_configured", "target_allocation_not_configured", "suitability_policy_not_configured", "manual_entry_not_supported"],
    notes: ["Native Ethereum (assetId 'ethereum:native'), NOT wrapped ETH. Manual entry is MODELED only — no ETH wallet connector, no ownership verification, no execution. Disabled until a future step explicitly activates it."],
  },
];

const clone = (t: InvestmentTargetDefinition): InvestmentTargetDefinition => JSON.parse(JSON.stringify(t));

/* ------------------------------------------------------------------ *
 * Read-only accessors (canonical order preserved; no ranking).
 * ------------------------------------------------------------------ */
export function listInvestmentTargets(): InvestmentTargetDefinition[] {
  return REGISTRY.map(clone);
}
export function getInvestmentTarget(targetId: InvestmentTargetId): InvestmentTargetDefinition | undefined {
  const t = REGISTRY.find((x) => x.targetId === targetId);
  return t ? clone(t) : undefined;
}
export function getEnabledInvestmentTargets(): InvestmentTargetDefinition[] {
  return listInvestmentTargets().filter((t) => t.lifecycleStatus === "enabled");
}
export function getMvpInvestmentTargets(): InvestmentTargetDefinition[] {
  return listInvestmentTargets().filter((t) => t.enabledForMvp === true);
}
const hasRole = (t: InvestmentTargetDefinition, r: InvestmentTargetSuggestionRole) => t.suggestionRoles.includes(r);
export function getContributionFundingSources(): InvestmentTargetDefinition[] {
  return listInvestmentTargets().filter((t) => t.lifecycleStatus === "enabled" && t.canFundContributionPlan && hasRole(t, "contribution_funding_source"));
}
export function getSafetyBufferTargets(): InvestmentTargetDefinition[] {
  return listInvestmentTargets().filter((t) => t.lifecycleStatus === "enabled" && t.canServeAsSafetyBuffer && hasRole(t, "safety_buffer_asset"));
}
export function getStableAllocationDestinations(): InvestmentTargetDefinition[] {
  return listInvestmentTargets().filter((t) => t.lifecycleStatus === "enabled" && t.canReceiveStableAllocation && hasRole(t, "stable_allocation_destination"));
}
/** ENABLED growth contribution targets only — SOL today; never USDC/BTC/ETH until enabled. */
export function getEnabledContributionGrowthTargets(): InvestmentTargetDefinition[] {
  return listInvestmentTargets().filter((t) => t.lifecycleStatus === "enabled" && t.enabledForMvp && t.canBeContributionTarget && hasRole(t, "contribution_growth_target"));
}
export function getModeledFutureTargets(): InvestmentTargetDefinition[] {
  return listInvestmentTargets().filter((t) => t.lifecycleStatus === "modeled_not_enabled");
}

/* ------------------------------------------------------------------ *
 * Validation (fails closed).
 * ------------------------------------------------------------------ */
export interface InvestmentTargetValidationResult {
  valid: boolean;
  errors: string[];
}

const ALL_ROLES: InvestmentTargetSuggestionRole[] = [
  "contribution_growth_target", "contribution_funding_source", "safety_buffer_asset", "stable_allocation_destination",
  "rebalance_increase_target", "rebalance_reduce_source", "trim_destination", "yield_source_asset",
];
const CRITICAL_BLOCKERS: InvestmentTargetReadinessBlocker[] = ["target_disabled", "target_blocked", "product_not_approved", "risk_review_incomplete"];

/** Validate one target definition. Fails closed. */
export function validateInvestmentTargetDefinition(target: unknown): InvestmentTargetValidationResult {
  const errors: string[] = [];
  if (!target || typeof target !== "object") return { valid: false, errors: ["target_not_an_object"] };
  const t = target as InvestmentTargetDefinition;

  if (t.schemaVersion !== INVESTMENT_TARGET_SCHEMA_VERSION) errors.push("missing_or_wrong_schema_version");
  if (!t.targetId || typeof t.targetId !== "string") errors.push("missing_target_id");
  if (!["growth_crypto", "stable_asset", "rwa"].includes(t.category)) errors.push("invalid_category");
  if (!["enabled", "modeled_not_enabled", "blocked"].includes(t.lifecycleStatus)) errors.push("invalid_lifecycle_status");
  if (t.enabledForMvp === true && t.lifecycleStatus !== "enabled") errors.push("enabled_for_mvp_without_enabled_lifecycle");

  // Execution must never be enabled.
  if (t.executionStatus !== "read_only_only" || (t.transactionsEnabled as boolean) !== false || (t.walletSignatureRequired as boolean) !== false) errors.push("execution_or_signature_enabled");

  // Unknown roles.
  if (!Array.isArray(t.suggestionRoles) || t.suggestionRoles.some((r) => !ALL_ROLES.includes(r))) errors.push("unknown_suggestion_role");

  // Capability ↔ role consistency.
  if (t.canBeContributionTarget && !t.suggestionRoles.includes("contribution_growth_target")) errors.push("contribution_target_without_role");
  if (t.canFundContributionPlan && !t.suggestionRoles.includes("contribution_funding_source")) errors.push("funding_source_without_role");
  if (t.canServeAsSafetyBuffer && !t.suggestionRoles.includes("safety_buffer_asset")) errors.push("buffer_without_role");
  if (t.canReceiveStableAllocation && !t.suggestionRoles.includes("stable_allocation_destination")) errors.push("stable_destination_without_role");
  // Enabled growth contribution target must carry the contribution role.
  if (t.lifecycleStatus === "enabled" && t.enabledForMvp && t.canBeContributionTarget && !t.suggestionRoles.includes("contribution_growth_target")) errors.push("enabled_contribution_target_missing_role");

  // Enabled target must not carry a critical activation blocker.
  if (t.lifecycleStatus === "enabled" && Array.isArray(t.activationBlockers) && t.activationBlockers.some((b) => CRITICAL_BLOCKERS.includes(b))) errors.push("enabled_target_with_critical_blocker");

  // Freshness / minimum sanity.
  if (t.priceRequirements?.maximumPriceAgeMs != null && !(t.priceRequirements.maximumPriceAgeMs > 0)) errors.push("invalid_max_price_age");
  if (t.minimumRequirements?.minimumSuggestedAmountUsd != null && !(t.minimumRequirements.minimumSuggestedAmountUsd >= 0)) errors.push("invalid_minimum_amount");

  // Native BTC/ETH must not be represented as a wrapped Solana token (i.e. a Solana-mint assetId).
  if (t.category === "growth_crypto" && (t.symbol === "BTC" || t.symbol === "ETH")) {
    if (SOLANA_MINT_RE.test(t.assetId)) errors.push("wrapped_representation_for_native_asset");
  }

  // RWA rules.
  if (FORBIDDEN_GENERIC_RWA_TARGET_IDS.includes(t.targetId)) errors.push("generic_rwa_placeholder_id");
  if (t.category === "rwa") {
    if (FORBIDDEN_GENERIC_RWA_TARGET_IDS.includes(t.targetId) || !t.targetId || t.targetId.length < 3) errors.push("rwa_missing_specific_product_id");
    if (!t.displayName || t.displayName.trim().length === 0) errors.push("rwa_missing_product_display_name");
    const r = t.rwaRequirements;
    if (!r) errors.push("rwa_missing_requirements");
    else {
      if (r.productSpecificApprovalRequired !== true) errors.push("rwa_missing_product_approval");
      if (r.jurisdictionEligibilityRequired !== true) errors.push("rwa_missing_jurisdiction");
      if (r.liquidityReviewRequired !== true) errors.push("rwa_missing_liquidity_review");
      if (r.lockupReviewRequired !== true) errors.push("rwa_missing_lockup_review");
      if (r.issuerOrProtocolReviewRequired !== true) errors.push("rwa_missing_issuer_review");
      if (r.pricingMethodRequired !== true) errors.push("rwa_missing_pricing_method");
    }
  } else if (t.rwaRequirements) {
    // Non-RWA targets must not carry RWA requirements (keeps the model honest).
    errors.push("non_rwa_with_rwa_requirements");
  }

  return { valid: errors.length === 0, errors };
}

/** Validate the whole registry (or an arbitrary list). Fails closed; rejects duplicates. */
export function validateInvestmentTargetRegistry(targets: InvestmentTargetDefinition[] = REGISTRY): InvestmentTargetValidationResult {
  const errors: string[] = [];
  if (!Array.isArray(targets)) return { valid: false, errors: ["registry_not_an_array"] };
  const ids = targets.map((t) => t.targetId);
  if (new Set(ids).size !== ids.length) errors.push("duplicate_target_ids");
  const assetIds = targets.map((t) => t.assetId);
  if (new Set(assetIds).size !== assetIds.length) errors.push("duplicate_asset_ids");
  for (const t of targets) {
    const v = validateInvestmentTargetDefinition(t);
    if (!v.valid) errors.push(`target_${t?.targetId ?? "unknown"}_invalid:${v.errors.join("/")}`);
  }
  return { valid: errors.length === 0, errors };
}

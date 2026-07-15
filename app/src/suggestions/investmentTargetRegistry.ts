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

// Step 15G — the deterministic read-only contribution + DCA plan generator now exists (selects one
// final target, calculates the final amount/range, stages existing-excess-USDC DCA, and projects
// post-plan allocation/buffer). It generates NO suggestion, updates NO product output, and prepares
// NO transaction/route/protocol. Product-facing target selection stays disabled until Step 15H.
export const CONTRIBUTION_PLANNING_EXISTS = true;
export const CONTRIBUTION_PLAN_GENERATOR_EXISTS = true;
export const CONTRIBUTION_PLAN_TARGET_SELECTION_EXISTS = true;
export const CONTRIBUTION_PLAN_AMOUNT_CALCULATION_EXISTS = true;
export const CONTRIBUTION_PLAN_PROJECTION_EXISTS = true;
export const CONTRIBUTION_PLAN_STAGED_DCA_EXISTS = true;
// Step 15H — the plan-backed pipeline now updates product output and generates suggestions through
// the integration layer (still no execution/automation; those flags remain false).
export const CONTRIBUTION_PLAN_UPDATES_PRODUCT_OUTPUT = true;
export const CONTRIBUTION_PLAN_GENERATES_SUGGESTION = true;
export const CONTRIBUTION_PLAN_EXECUTION_ENABLED = false;
export const CONTRIBUTION_PLAN_AUTOMATION_ENABLED = false;
export const CONTRIBUTION_PLAN_MIXED_FUNDING_ENABLED = false;
export const CONTRIBUTION_PLAN_RESIDUAL_ROUTING_ENABLED = false;
export const CONTRIBUTION_PLAN_CALENDAR_DATES_ENABLED = false;
// Step 15H — the product integration layer now exists: it consumes the 15A–15G pipeline, enriches
// the buffer suggestion / creates plan-backed DCA + contribution suggestions, renders the shared
// card + review modal, and adds /testing scenarios. It is the ONLY layer that updates UI output.
// Execution stays external and user-initiated (all transaction/signature flags remain false).
export const CONTRIBUTION_PRODUCT_INTEGRATION_EXISTS = true;
export const CONTRIBUTION_SUGGESTION_INTEGRATION_EXISTS = true;
export const CONTRIBUTION_SUGGESTION_UI_ENABLED = true;
export const CONTRIBUTION_REVIEW_MODAL_ENABLED = true;
export const CONTRIBUTION_DEMO_PIPELINE_ENABLED = true;
export const CONTRIBUTION_REAL_WALLET_PIPELINE_ENABLED = true;
export const CONTRIBUTION_TESTING_SCENARIOS_EXIST = true;
// Step 16A — the deterministic Stable USDC Yield POLICY foundation now exists (lanes, strategy
// taxonomy, protocol scope, suppression vocabulary). Everything downstream stays disabled: no
// registry, comparison, wallet/protocol detection, market data, suggestions, UI, /testing, execution.
export const STABLE_YIELD_POLICY_EXISTS = true;
// Step 16B — the generic Yield Strategy Registry now exists (catalog of exact USDC products across
// the documented Kamino/Raydium/Meteora/Hubble scope). Everything downstream stays disabled.
export const STABLE_YIELD_REGISTRY_EXISTS = true;
export const YIELD_STRATEGY_REGISTRY_EXISTS = true;
// Step 16C — the deterministic Stable Yield market-data layer now exists (per-approved-product APY /
// TVL / liquidity / withdrawal snapshots with freshness + provenance, joined from the 16B registry).
// It compares nothing, ranks nothing, suggests nothing, and reads nothing from React; the approved
// candidate set is empty until documented products are promoted. Everything downstream stays disabled.
export const YIELD_STRATEGY_MARKET_DATA_EXISTS = true;
// Step 16D — the deterministic eligibility + static risk-review gates now exist (per-lane buffer/excess
// eligibility over exact approved products, reusing the canonical 12E thresholds + 16C freshness). It
// compares nothing, ranks nothing, selects no leader, consumes no wallet capital, and calculates no
// amount; the approved set is empty in production, so eligibility is empty. Downstream stays disabled.
export const YIELD_STRATEGY_RISK_REVIEW_EXISTS = true;
export const YIELD_STRATEGY_ELIGIBILITY_EXISTS = true;
export const STABLE_YIELD_ELIGIBILITY_EXISTS = true;
// Step 16D.1 — strategy TYPE describes mechanics; the exact registry riskLane + static risk review
// determine Safety Buffer eligibility. A managed_vault TYPE no longer hardcoded excess-only; no product
// is promoted (production stays documentation_required / empty eligibility).
export const STABLE_YIELD_PRODUCT_LEVEL_LANE_POLICY_EXISTS = true;
export const STABLE_YIELD_ELIGIBILITY_UPDATES_PRODUCT_OUTPUT = false;
export const STABLE_YIELD_ELIGIBILITY_EVALUATES_CAPITAL = false;
export const STABLE_YIELD_ELIGIBILITY_SELECTS_LEADER = false;
export const STABLE_YIELD_COMPARISON_EXISTS = false;
export const STABLE_YIELD_WALLET_DETECTION_EXISTS = false;
export const STABLE_YIELD_PLANS_EXIST = false;
export const STABLE_YIELD_SUGGESTIONS_EXIST = false;
export const STABLE_YIELD_UI_ENABLED = false;
export const STABLE_YIELD_TESTING_EXISTS = false;
export const STABLE_YIELD_EXECUTION_ENABLED = false;
// Step 15B — contribution-frequency (rhythm) normalization now exists. Both names refer to the
// same layer (the field is "contribution_frequency" in onboarding); no contradictory duplicate.
export const CONTRIBUTION_RHYTHM_NORMALIZATION_EXISTS = true;
export const CONTRIBUTION_FREQUENCY_NORMALIZATION_EXISTS = true;
// Step 15E — the contribution-priority + Safety Buffer gate now exists (decides the priority
// category only; reuses the canonical Safety Buffer, selects no funding source, calculates no
// amount, generates no plan/suggestion, and changes no product output).
export const CONTRIBUTION_PRIORITY_ENGINE_EXISTS = true;
export const CONTRIBUTION_SAFETY_BUFFER_GATE_EXISTS = true;
export const CONTRIBUTION_PRIORITY_UPDATES_PRODUCT_OUTPUT = false;
export const CONTRIBUTION_PRIORITY_SELECTS_FUNDING_SOURCE = false;
export const CONTRIBUTION_PRIORITY_CALCULATES_AMOUNT = false;
export const CONTRIBUTION_PRIORITY_GENERATES_PLAN = false;
export const CONTRIBUTION_PRIORITY_GENERATES_SUGGESTION = false;
// Step 15F — the deterministic funding-source selection + availability layer now exists (identifies
// the primary/alternative source and each source's mathematical capacity; selects no target,
// calculates no final amount, routes no residual, generates no plan/suggestion, changes no output).
export const CONTRIBUTION_FUNDING_SOURCE_SELECTION_EXISTS = true;
export const CONTRIBUTION_FUNDING_AVAILABILITY_EXISTS = true;
export const CONTRIBUTION_FUNDING_UPDATES_PRODUCT_OUTPUT = false;
export const CONTRIBUTION_FUNDING_MIXED_SOURCES_ENABLED = false;
export const CONTRIBUTION_FUNDING_CALCULATES_FINAL_AMOUNT = false;
export const CONTRIBUTION_FUNDING_ROUTES_RESIDUAL = false;
export const CONTRIBUTION_FUNDING_GENERATES_PLAN = false;
export const CONTRIBUTION_FUNDING_GENERATES_SUGGESTION = false;
// Step 15D — the deterministic allocation-gap engine now exists (mathematical gaps/caps only; it
// never selects a target, evaluates funding/the Safety Buffer, or changes product output).
export const TARGET_ALLOCATION_GAP_ENGINE_EXISTS = true;
export const TARGET_ALLOCATION_GAP_UPDATES_PRODUCT_OUTPUT = false;
export const TARGET_ALLOCATION_GAP_SELECTS_TARGET = false;
export const TARGET_ALLOCATION_GAP_EVALUATES_FUNDING = false;
export const TARGET_ALLOCATION_GAP_EVALUATES_SAFETY_BUFFER = false;
// Step 15G — DCA plan generation (the deterministic staged plan) now exists; the DCA SUGGESTION
// (product-facing) stays disabled until Step 15H.
export const DCA_PLAN_GENERATION_EXISTS = true;
// Step 15H — the DCA/contribution SUGGESTION is now enabled (product-facing, plan-backed).
export const DCA_SUGGESTION_ENABLED = true;
export const CONTRIBUTION_DATES_GENERATED = false;
// Step 15H — product-facing target selection (from the completed plan) is now enabled.
export const CONTRIBUTION_TARGET_SELECTION_ENABLED = true;
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

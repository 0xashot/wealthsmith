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
// Step 16E — the deterministic comparison engine now exists (per-lane six-dimension weighted scoring,
// deterministic ordering, material-tie detection, weight-sensitivity analysis, and a comparison leader
// only when stable). It compares only exact 16D-eligible products, separates buffer/excess, and reads
// no wallet/capital; production is empty (no eligible candidates). Downstream stays disabled.
export const YIELD_STRATEGY_COMPARISON_EXISTS = true;
export const YIELD_STRATEGY_SCORING_EXISTS = true;
export const YIELD_STRATEGY_SENSITIVITY_EXISTS = true;
export const STABLE_YIELD_COMPARISON_EXISTS = true;
export const STABLE_YIELD_COMPARISON_EVALUATES_WALLET = false;
export const STABLE_YIELD_COMPARISON_EVALUATES_CAPITAL = false;
export const STABLE_YIELD_COMPARISON_GENERATES_PLANS = false;
export const STABLE_YIELD_COMPARISON_UPDATES_PRODUCT_OUTPUT = false;
// Step 16F — existing-position normalization + exact registry matching + duplicate resolution + the
// user-level eligible-capital snapshot now exist. It consumes injected read-only positions + canonical
// Safety-Buffer + direct-USDC, matches only by exact identity (no name/symbol), never promotes/mutates
// the registry, reports current-leader holdings, and calculates lane-level source capacity — no product,
// no final amount, no plan/suggestion/UI/execution. Production may show detected positions with zero
// approved matches, zero buffer-qualified positions, and zero held leaders (valid fail-closed state).
export const YIELD_STRATEGY_POSITION_NORMALIZATION_EXISTS = true;
export const YIELD_STRATEGY_POSITION_MATCHING_EXISTS = true;
export const YIELD_STRATEGY_POSITION_DEDUPLICATION_EXISTS = true;
export const YIELD_STRATEGY_POSITION_DETECTION_EXISTS = true;
export const YIELD_STRATEGY_ELIGIBLE_CAPITAL_EXISTS = true;
export const STABLE_YIELD_CAPITAL_EVALUATION_EXISTS = true;
export const STABLE_YIELD_CAPITAL_SELECTS_PRODUCT = false;
export const STABLE_YIELD_CAPITAL_SELECTS_FINAL_AMOUNT = false;
export const STABLE_YIELD_CAPITAL_GENERATES_PLAN = false;
export const STABLE_YIELD_CAPITAL_UPDATES_PRODUCT_OUTPUT = false;
export const STABLE_YIELD_WALLET_DETECTION_EXISTS = true;
// Step 16G — the single deterministic read-only plan engine now exists: exact product deposit-capacity
// contract, buffer>excess lane priority, real-comparison-leader-only selection, start-vs-add action
// mode, lane/product minimums, exact-cent amount, before/after buffer projection, and a stable plan ID.
// It selects one lane + one exact product + one amount funded only by direct liquid USDC; it generates
// no suggestion/UI/deep link/transaction/signature and updates no product output. Production returns
// no_plan (zero approved products / zero comparison leaders).
export const YIELD_STRATEGY_PRODUCT_CAPACITY_EXISTS = true;
export const YIELD_STRATEGY_PLAN_EXISTS = true;
export const YIELD_STRATEGY_PLAN_SELECTION_EXISTS = true;
export const YIELD_STRATEGY_PLAN_AMOUNT_SELECTION_EXISTS = true;
export const YIELD_STRATEGY_PLAN_SELECTS_PRODUCT = true;
export const YIELD_STRATEGY_PLAN_SELECTS_FINAL_AMOUNT = true;
export const STABLE_YIELD_PLANS_EXIST = true;
export const STABLE_YIELD_PLAN_UPDATES_PRODUCT_OUTPUT = false;
export const STABLE_YIELD_PLAN_GENERATES_SUGGESTION = false;
export const STABLE_YIELD_PLAN_PREPARES_EXECUTION = false;
export const STABLE_YIELD_PLAN_BUILDS_TRANSACTION = false;
export const STABLE_YIELD_PLAN_REQUESTS_SIGNATURE = false;
// Step 16H-A — a Step 16G ready plan can now be converted into a deterministic, read-only
// `stable_yield` engine suggestion that participates in ordering + Top Pick. Engine-only: no card,
// modal, Demo/Real-Wallet UI, Smith-AI, execution, or signature. Production still emits none (no
// approved product → no ready plan). The PLAN layer itself still generates no suggestion (the
// converter does), so STABLE_YIELD_PLAN_GENERATES_SUGGESTION stays false.
export const STABLE_YIELD_SUGGESTIONS_EXIST = true;
export const STABLE_YIELD_SUGGESTION_CONTRACT_EXISTS = true;
export const STABLE_YIELD_PLAN_TO_SUGGESTION_EXISTS = true;
export const STABLE_YIELD_SUGGESTION_PARTICIPATES_IN_ORDERING = true;
export const STABLE_YIELD_SUGGESTION_TOP_PICK_ELIGIBLE = true;
// Step 16H-F — these five are ALIASES of the canonical 16H-C/16H-D flags below and were left `false`
// after the UI actually shipped. Reconciled to the real behavior so no two flags contradict:
//   _SUGGESTION_CARD_EXISTS         ≡ STABLE_YIELD_RENDERED_CARD_EXISTS
//   _SUGGESTION_REVIEW_MODAL_EXISTS ≡ STABLE_YIELD_RENDERED_REVIEW_MODAL_EXISTS
//   _SUGGESTION_UI_INTEGRATION_EXISTS ≡ STABLE_YIELD_SHARED_CARD_MAPPER_EXISTS + _REVIEW_UI_EXISTS
//   _SUGGESTION_DEMO_UI_EXISTS      ≡ STABLE_YIELD_DEMO_MODE_INTEGRATION_EXISTS
//   _SUGGESTION_REAL_WALLET_UI_EXISTS ≡ STABLE_YIELD_REAL_WALLET_INTEGRATION_EXISTS
// Prefer the canonical names in new code.
export const STABLE_YIELD_SUGGESTION_CARD_EXISTS = true;
export const STABLE_YIELD_SUGGESTION_REVIEW_MODAL_EXISTS = true;
export const STABLE_YIELD_SUGGESTION_UI_INTEGRATION_EXISTS = true;
export const STABLE_YIELD_SUGGESTION_DEMO_UI_EXISTS = true;
export const STABLE_YIELD_SUGGESTION_REAL_WALLET_UI_EXISTS = true;
export const STABLE_YIELD_SMITH_AI_INTEGRATION_EXISTS = false;
export const STABLE_YIELD_SUGGESTION_EXECUTION_EXISTS = false;
export const STABLE_YIELD_SUGGESTION_TRANSACTION_CONSTRUCTION_EXISTS = false;
export const STABLE_YIELD_SUGGESTION_SIGNATURE_FLOW_EXISTS = false;
// Step 16H-B — deterministic card + review PRESENTATION contracts + copy mapping now exist (view models
// only; no React). Defines exactly what future UI may render, with a read-only "Review Strategy" CTA
// intent (no execution URL / transaction / signature). No rendered card/modal, /testing visual fixtures,
// Demo/Real-Wallet UI, or Smith AI yet.
export const STABLE_YIELD_CARD_PRESENTATION_CONTRACT_EXISTS = true;
export const STABLE_YIELD_REVIEW_PRESENTATION_CONTRACT_EXISTS = true;
export const STABLE_YIELD_DETERMINISTIC_COPY_MAPPING_EXISTS = true;
export const STABLE_YIELD_PRESENTATION_VALIDATION_EXISTS = true;
export const STABLE_YIELD_REVIEW_ONLY_CTA_INTENT_EXISTS = true;
// Step 16H-C — the Stable Yield card + review render through the shared SuggestionCard + review drawer,
// with dedicated /testing visual fixtures. Read-only ("Review Strategy" opens the shared drawer only).
// No Demo/Real-Wallet product integration, Smith AI, execution, transaction, external protocol CTA, or
// signature. Production still renders no card (no approved product → no suggestion).
export const STABLE_YIELD_RENDERED_CARD_EXISTS = true;
export const STABLE_YIELD_RENDERED_REVIEW_MODAL_EXISTS = true;
export const STABLE_YIELD_TESTING_VISUAL_FIXTURES_EXIST = true;
export const STABLE_YIELD_SHARED_CARD_MAPPER_EXISTS = true;
export const STABLE_YIELD_REVIEW_UI_EXISTS = true;
export const STABLE_YIELD_ACCESSIBILITY_BEHAVIOR_EXISTS = true;
// Step 16H-D — the Stable Yield suggestion is now integrated into BOTH product flows through the shared
// `deriveStableYieldPlanSuggestion` orchestration → `runSuggestionEngine`'s optional 4th param → shared
// card + review drawer. Demo Mode visibly demonstrates one valid excess-lane suggestion from DEMO-ONLY
// injected inputs (synthetic approved product; never the production registry). Real Wallet runs the
// production pipeline (production registry + empty market/risk/capacity data) → no approved product →
// no_plan → no suggestion → no card (the correct production state). Still read-only: "Review Strategy"
// opens the shared drawer only. No Smith AI, execution, transaction, signature, or external protocol CTA.
export const STABLE_YIELD_DEMO_MODE_INTEGRATION_EXISTS = true;
export const STABLE_YIELD_REAL_WALLET_INTEGRATION_EXISTS = true;
export const STABLE_YIELD_SHARED_PRODUCT_ORCHESTRATION_EXISTS = true;
export const STABLE_YIELD_PROTOCOL_EXTERNAL_ACTION_CTA_EXISTS = false;
export const STABLE_YIELD_EXECUTES_TRANSACTION = false;
export const STABLE_YIELD_REQUIRES_WALLET_SIGNATURE = false;
// Step 16H-F — reconciled. The Stable Yield UI genuinely ships (16H-C rendered card + review drawer,
// 16H-D Demo/Real-Wallet product surfaces) and a dedicated /testing section exists, so leaving these
// `false` contradicted STABLE_YIELD_RENDERED_CARD_EXISTS / _TESTING_VISUAL_FIXTURES_EXIST. They describe
// UI EXISTENCE, not execution — execution stays disabled below and is asserted independently.
export const STABLE_YIELD_UI_ENABLED = true;
export const STABLE_YIELD_TESTING_EXISTS = true;
export const STABLE_YIELD_EXECUTION_ENABLED = false;
// Step 16H-G — the PRODUCTION data-adapter layer + evidence package. Real, exercised code (a strict
// Kamino vault-state parser, exact-address identity resolution, freshness validation, capacity
// normalization, structured diagnostics, versioned evidence manifests, a readiness matrix, and a
// developer-only probe) — not empty interfaces. The adapters feed the canonical 16C join.
//
// They approve NOTHING. Every registry entry is still `documentation_required` with `address:
// undefined`, so every candidate fails closed at identity (`missing_product_address`) and production
// still emits no suggestion and renders no card. Approval is Step 16H-H; the canonical buffer-yield
// minimum remains a separate, undefined policy step.
export const STABLE_YIELD_PRODUCTION_ADAPTER_CONTRACT_EXISTS = true;
export const STABLE_YIELD_PRODUCTION_IDENTITY_ADAPTERS_EXIST = true;
export const STABLE_YIELD_PRODUCTION_FRESHNESS_VALIDATION_EXISTS = true;
export const STABLE_YIELD_PRODUCTION_DEPOSIT_STATE_NORMALIZATION_EXISTS = true;
export const STABLE_YIELD_PRODUCTION_EVIDENCE_MANIFESTS_EXIST = true;
export const STABLE_YIELD_PRODUCTION_ADAPTER_DIAGNOSTICS_EXIST = true;
export const STABLE_YIELD_PRODUCTION_ORCHESTRATION_CONSUMES_ADAPTERS = true;
export const STABLE_YIELD_PRODUCTION_SOURCE_PROBE_EXISTS = true;
// Hard false until an explicit, evidence-backed review says otherwise.
export const STABLE_YIELD_PRODUCTION_PRODUCT_APPROVAL_EXISTS = false;
export const STABLE_YIELD_PRODUCTION_APPROVED_PRODUCTS_EXIST = false;
export const STABLE_YIELD_PRODUCTION_CARD_AVAILABLE = false;
export const STABLE_YIELD_BUFFER_YIELD_MINIMUM_EXISTS = false;
export const STABLE_YIELD_QDRANT_INTEGRATION_EXISTS = false;
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

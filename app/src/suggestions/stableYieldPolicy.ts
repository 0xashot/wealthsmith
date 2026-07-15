/**
 * stableYieldPolicy — Step 16A. The canonical, deterministic Stable USDC Yield policy: the generic
 * strategy-type catalog, the two lane policies (Safety-Buffer yield / Excess-USDC yield), the
 * documented protocol scope, the intended priority, and validators. POLICY ONLY — no registry, no
 * market data, no eligibility/comparison, no detection, no plan/suggestion, no UI, no execution.
 */
import {
  STABLE_YIELD_POLICY_SCHEMA_VERSION,
  STABLE_YIELD_POLICY_ID,
  STABLE_YIELD_POLICY_VERSION,
  STABLE_BUFFER_YIELD_POLICY_ID,
  STABLE_BUFFER_YIELD_POLICY_VERSION,
  STABLE_EXCESS_YIELD_POLICY_ID,
  STABLE_EXCESS_YIELD_POLICY_VERSION,
  type StableYieldLane,
  type StableYieldLanePolicy,
  type StableYieldPolicy,
  type StableYieldStrategyDefinition,
  type StableYieldStrategyType,
  type StableYieldSupportedProtocol,
  type StableYieldSuppressionReason,
} from "./stableYieldPolicyTypes";

export const STABLE_YIELD_POLICY_EXISTS = true;

/** Documented WealthSmith protocol universe in scope (identity only — no products assigned in 16A). */
export const STABLE_YIELD_SUPPORTED_PROTOCOLS: readonly StableYieldSupportedProtocol[] = ["kamino", "raydium", "meteora", "hubble"];

/** Protocols explicitly OUT of scope for Stable Yield (never introduced). */
export const STABLE_YIELD_FORBIDDEN_PROTOCOLS: readonly string[] = ["save", "marginfi", "drift", "loopscale"];

/**
 * The DOCUMENTED intended priority order once Stable Yield is integrated. 16A does NOT change engine
 * ordering (`topPick.ts` CATEGORY_PRIORITY is untouched); this is a policy-level statement only.
 */
export const STABLE_YIELD_INTENDED_PRIORITY_ORDER: readonly string[] = ["safety_buffer", "rebalance", "stable_yield", "contribution_dca", "trim", "other_optimization"];

/** All suppression reasons the policy defines (vocabulary; no checks implemented in 16A). */
export const STABLE_YIELD_SUPPRESSION_REASONS: readonly StableYieldSuppressionReason[] = [
  "safety_buffer_incomplete",
  "price_data_unavailable",
  "protocol_data_unavailable",
  "risk_policy_unavailable",
  "yield_strategy_not_approved",
  "unknown_strategy",
  "unknown_asset",
  "unknown_liquidity",
  "unknown_withdrawal_behavior",
  "no_eligible_capital",
];

const flagsOff = {
  registryConfigured: false as const,
  marketDataEvaluated: false as const,
  eligibilityEvaluated: false as const,
  comparisonEvaluated: false as const,
  suggestionGenerated: false as const,
  transactionsEnabled: false as const,
  walletSignatureRequired: false as const,
};

/* ------------------------------------------------------------------ *
 * Generic strategy-type catalog (types, not products).
 * ------------------------------------------------------------------ */
const STRATEGY_TYPES: StableYieldStrategyDefinition[] = [
  {
    schemaVersion: "1.0.0",
    strategyType: "lending",
    displayLabel: "Stable lending",
    principalAsset: "USDC",
    resultingExposure: "stable_usd",
    withdrawalModel: "immediate",
    liquidityModel: "liquid",
    feeModel: "spread_or_amm_fee",
    riskProfile: "conservative_stable",
    eligibleLanes: ["safety_buffer_yield", "excess_usdc_yield"],
    defaultRiskLane: "buffer_eligible",
    activationSuppressionReasons: [],
    ...flagsOff,
    notes: ["Supplying USDC to a documented lending market keeps a pure stable USD principal that can be withdrawn immediately. A specific product's lane is decided by the registry (16B) and eligibility (16D)."],
  },
  {
    schemaVersion: "1.0.0",
    strategyType: "managed_vault",
    displayLabel: "Managed stable vault",
    principalAsset: "USDC",
    resultingExposure: "stable_usd",
    withdrawalModel: "requires_withdrawal",
    liquidityModel: "semi_liquid",
    feeModel: "management_fee",
    riskProfile: "moderate_stable",
    // Step 16D.1 — a managed vault is a STABLE-USD, non-locked mechanic, so the TYPE permits BOTH lanes.
    // The buffer lane is NOT automatic: it defaults to excess, and an exact product only becomes
    // buffer-eligible when its registry riskLane, static risk review (conservative / non-custodial /
    // verified audit / USDC-only / no leverage / bufferUseReviewed) and live market data (instant
    // withdrawal, ≥15m-fresh, TVL/liquidity floors) all pass in Step 16D. Type ≠ automatic lane.
    eligibleLanes: ["safety_buffer_yield", "excess_usdc_yield"],
    defaultRiskLane: "excess_only",
    activationSuppressionReasons: [],
    ...flagsOff,
    notes: ["A managed stable vault keeps a stable USDC principal and is not intrinsically locked/epoch-bound, so the TYPE permits the Safety Buffer lane as well as Excess. It NEVER becomes buffer-eligible automatically: it defaults to Excess-USDC, and only an exact reviewed product (buffer_eligible riskLane + risk review + live instant-withdrawal market data) may qualify for the buffer lane in Step 16D."],
  },
  {
    schemaVersion: "1.0.0",
    strategyType: "staking_like_vault",
    displayLabel: "Staking-like stable vault",
    principalAsset: "USDC",
    resultingExposure: "stable_usd",
    withdrawalModel: "epoch_or_lockup",
    liquidityModel: "locked",
    feeModel: "performance_fee",
    riskProfile: "moderate_stable",
    eligibleLanes: ["excess_usdc_yield"],
    defaultRiskLane: "excess_only",
    activationSuppressionReasons: [],
    ...flagsOff,
    notes: ["A staking-like vault may lock the principal for an epoch/lockup, so it can never serve the Safety Buffer lane; it is Excess-USDC only."],
  },
  {
    schemaVersion: "1.0.0",
    strategyType: "stable_liquidity_strategy",
    displayLabel: "Stable liquidity strategy",
    principalAsset: "USDC",
    resultingExposure: "stable_lp",
    withdrawalModel: "requires_withdrawal",
    liquidityModel: "semi_liquid",
    feeModel: "spread_or_amm_fee",
    riskProfile: "moderate_stable",
    eligibleLanes: ["excess_usdc_yield"],
    defaultRiskLane: "excess_only",
    activationSuppressionReasons: [],
    ...flagsOff,
    notes: ["A stable-stable liquidity strategy holds stable LP exposure (no volatile leg). Excess-USDC lane only; a product with a volatile leg is `unsupported`."],
  },
  {
    schemaVersion: "1.0.0",
    strategyType: "future_other",
    displayLabel: "Future strategy (not yet approved)",
    principalAsset: "unknown",
    resultingExposure: "unknown",
    withdrawalModel: "unknown",
    liquidityModel: "unknown",
    feeModel: "unknown",
    riskProfile: "unsupported",
    eligibleLanes: [],
    defaultRiskLane: "unsupported",
    activationSuppressionReasons: ["yield_strategy_not_approved", "unknown_strategy"],
    ...flagsOff,
    notes: ["Reserved for a future strategy type. It is never approved by 16A and carries no lanes; a future step must define and approve it explicitly."],
  },
];

const laneFlagsOff = { registryConfigured: false as const, suggestionGenerated: false as const, transactionsEnabled: false as const, walletSignatureRequired: false as const, volatileExposureAllowed: false as const, leveragedExposureAllowed: false as const, unsupportedAssetsAllowed: false as const };

const BUFFER_LANE: StableYieldLanePolicy = {
  schemaVersion: "1.0.0",
  policyId: STABLE_BUFFER_YIELD_POLICY_ID,
  policyVersion: STABLE_BUFFER_YIELD_POLICY_VERSION,
  lane: "safety_buffer_yield",
  purpose: "Allow part of an already-complete Safety Buffer to earn yield while preserving the required reserve and coverage.",
  requiresCompleteSafetyBuffer: true,
  preservesRequiredBufferCoverage: true,
  allowedResultingExposures: ["stable_usd"],
  allowedRiskLanes: ["buffer_eligible"],
  blockingSuppressionReasons: ["safety_buffer_incomplete", "unknown_liquidity", "unknown_withdrawal_behavior", "unknown_asset", "yield_strategy_not_approved"],
  ...laneFlagsOff,
  notes: ["Activates ONLY after the Safety Buffer is fully satisfied. No volatile, leveraged, or unsupported exposure; only conservative, immediately-liquid stable-USD strategies may hold buffer capital."],
};

const EXCESS_LANE: StableYieldLanePolicy = {
  schemaVersion: "1.0.0",
  policyId: STABLE_EXCESS_YIELD_POLICY_ID,
  policyVersion: STABLE_EXCESS_YIELD_POLICY_VERSION,
  lane: "excess_usdc_yield",
  purpose: "Deploy liquid USDC that is ABOVE the Safety Buffer into an approved stable yield strategy.",
  requiresCompleteSafetyBuffer: true,
  preservesRequiredBufferCoverage: true,
  allowedResultingExposures: ["stable_usd", "stable_lp"],
  allowedRiskLanes: ["buffer_eligible", "excess_only"],
  blockingSuppressionReasons: ["safety_buffer_incomplete", "no_eligible_capital", "yield_strategy_not_approved", "unknown_asset"],
  ...laneFlagsOff,
  notes: ["Requires the Safety Buffer complete; the exact excess-USDC amount is determined later (16D+). Deterministic policy only — no execution."],
};

export function getStableYieldStrategyTypes(): StableYieldStrategyDefinition[] {
  return STRATEGY_TYPES.map((s) => JSON.parse(JSON.stringify(s)));
}

export function getStableYieldStrategyDefinition(type: StableYieldStrategyType): StableYieldStrategyDefinition | undefined {
  const s = STRATEGY_TYPES.find((x) => x.strategyType === type);
  return s ? JSON.parse(JSON.stringify(s)) : undefined;
}

export function getStableYieldLanePolicy(lane: StableYieldLane): StableYieldLanePolicy {
  return JSON.parse(JSON.stringify(lane === "safety_buffer_yield" ? BUFFER_LANE : EXCESS_LANE));
}

/** The full deterministic Stable Yield policy. */
export function getStableYieldPolicy(): StableYieldPolicy {
  return {
    schemaVersion: STABLE_YIELD_POLICY_SCHEMA_VERSION,
    policyId: STABLE_YIELD_POLICY_ID,
    policyVersion: STABLE_YIELD_POLICY_VERSION,
    suggestionFamily: "capital_efficiency",
    lanes: [getStableYieldLanePolicy("safety_buffer_yield"), getStableYieldLanePolicy("excess_usdc_yield")],
    strategyTypes: getStableYieldStrategyTypes(),
    supportedProtocolScope: [...STABLE_YIELD_SUPPORTED_PROTOCOLS],
    forbiddenProtocols: [...STABLE_YIELD_FORBIDDEN_PROTOCOLS],
    intendedPriorityOrder: [...STABLE_YIELD_INTENDED_PRIORITY_ORDER],
    existingPositionPolicy: { existingPositionsRemainVisible: true, suggestionRequiresAdditionalEligibleUsdc: true, detectionImplemented: false },
    registryExists: false,
    comparisonExists: false,
    walletDetectionExists: false,
    suggestionsExist: false,
    uiExists: false,
    testingExists: false,
    executionEnabled: false,
    notes: ["Stable Yield is a Capital Efficiency intent that improves returns on idle USDC and never increases portfolio risk. 16A defines policy only; the registry (16B) and later steps build on it."],
  };
}

/* ------------------------------------------------------------------ *
 * Validators (fail closed).
 * ------------------------------------------------------------------ */
export interface StableYieldValidationResult {
  valid: boolean;
  errors: string[];
}

const ALL_SUPPRESSION = new Set<string>(STABLE_YIELD_SUPPRESSION_REASONS);

export function validateStableYieldStrategyDefinition(def: unknown): StableYieldValidationResult {
  const errors: string[] = [];
  if (!def || typeof def !== "object") return { valid: false, errors: ["strategy_not_an_object"] };
  const d = def as StableYieldStrategyDefinition;
  if (d.schemaVersion !== STABLE_YIELD_POLICY_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (!["lending", "managed_vault", "staking_like_vault", "stable_liquidity_strategy", "future_other"].includes(d.strategyType)) errors.push("invalid_strategy_type");
  const flags = d.registryConfigured === false && d.marketDataEvaluated === false && d.eligibilityEvaluated === false && d.comparisonEvaluated === false && d.suggestionGenerated === false && d.transactionsEnabled === false && d.walletSignatureRequired === false;
  if (!flags) errors.push("capability_flag_enabled");
  if (!Array.isArray(d.eligibleLanes) || d.eligibleLanes.some((l) => l !== "safety_buffer_yield" && l !== "excess_usdc_yield")) errors.push("invalid_lane");
  if (d.activationSuppressionReasons.some((r) => !ALL_SUPPRESSION.has(r))) errors.push("unknown_suppression_reason");
  // Step 16D.1 — a TYPE may PERMIT the buffer lane only when its principal stays pure stable-USD and it
  // is not intrinsically locked/epoch-bound (so LP `stable_lp` and locked/epoch types can never serve
  // the buffer). This is a mechanics gate, NOT a per-product guarantee: the EXACT product's conservative
  // risk tier and live instant withdrawal are enforced per-product by Step 16D, never hardcoded here.
  if (d.eligibleLanes.includes("safety_buffer_yield")) {
    if (d.resultingExposure !== "stable_usd") errors.push("buffer_lane_requires_stable_usd_exposure");
    if (d.withdrawalModel === "epoch_or_lockup") errors.push("buffer_lane_forbids_epoch_or_lockup_type");
    if (d.liquidityModel === "locked") errors.push("buffer_lane_forbids_locked_liquidity_type");
  }
  // The unapproved placeholder must carry no lanes and its non-approval reasons.
  if (d.strategyType === "future_other") {
    if (d.eligibleLanes.length !== 0) errors.push("future_other_must_have_no_lanes");
    if (!d.activationSuppressionReasons.includes("yield_strategy_not_approved")) errors.push("future_other_must_be_unapproved");
  }
  return { valid: errors.length === 0, errors };
}

export function validateStableYieldLanePolicy(lane: unknown): StableYieldValidationResult {
  const errors: string[] = [];
  if (!lane || typeof lane !== "object") return { valid: false, errors: ["lane_not_an_object"] };
  const l = lane as StableYieldLanePolicy;
  if (l.schemaVersion !== STABLE_YIELD_POLICY_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (l.lane !== "safety_buffer_yield" && l.lane !== "excess_usdc_yield") errors.push("invalid_lane");
  if (l.requiresCompleteSafetyBuffer !== true) errors.push("lane_must_require_complete_buffer");
  if (l.volatileExposureAllowed !== false || l.leveragedExposureAllowed !== false || l.unsupportedAssetsAllowed !== false) errors.push("risk_exposure_allowed");
  if (l.suggestionGenerated !== false || l.transactionsEnabled !== false || l.walletSignatureRequired !== false || l.registryConfigured !== false) errors.push("capability_flag_enabled");
  if (!l.blockingSuppressionReasons.includes("safety_buffer_incomplete")) errors.push("lane_must_block_on_incomplete_buffer");
  if (l.blockingSuppressionReasons.some((r) => !ALL_SUPPRESSION.has(r))) errors.push("unknown_suppression_reason");
  if (l.lane === "safety_buffer_yield" && (l.allowedResultingExposures.length !== 1 || l.allowedResultingExposures[0] !== "stable_usd")) errors.push("buffer_lane_stable_usd_only");
  return { valid: errors.length === 0, errors };
}

export function validateStableYieldPolicy(policy: unknown = getStableYieldPolicy()): StableYieldValidationResult {
  const errors: string[] = [];
  if (!policy || typeof policy !== "object") return { valid: false, errors: ["policy_not_an_object"] };
  const p = policy as StableYieldPolicy;
  if (p.schemaVersion !== STABLE_YIELD_POLICY_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (p.policyId !== STABLE_YIELD_POLICY_ID || p.policyVersion !== STABLE_YIELD_POLICY_VERSION) errors.push("wrong_policy_id_or_version");
  if (p.suggestionFamily !== "capital_efficiency") errors.push("wrong_suggestion_family");
  // Only the documented protocol universe; forbidden protocols never appear.
  if (p.supportedProtocolScope.join(",") !== "kamino,raydium,meteora,hubble") errors.push("wrong_protocol_scope");
  if (p.forbiddenProtocols.some((f) => p.supportedProtocolScope.includes(f as StableYieldSupportedProtocol))) errors.push("forbidden_protocol_in_scope");
  if (["save", "marginfi", "drift", "loopscale"].some((f) => p.supportedProtocolScope.includes(f as StableYieldSupportedProtocol))) errors.push("out_of_scope_protocol");
  // Intended priority: Stable Yield below Rebalance, above Contribution/DCA.
  const order = p.intendedPriorityOrder;
  if (!(order.indexOf("rebalance") < order.indexOf("stable_yield") && order.indexOf("stable_yield") < order.indexOf("contribution_dca") && order.indexOf("safety_buffer") === 0)) errors.push("wrong_intended_priority");
  // Everything downstream stays off in 16A.
  const off = p.registryExists === false && p.comparisonExists === false && p.walletDetectionExists === false && p.suggestionsExist === false && p.uiExists === false && p.testingExists === false && p.executionEnabled === false;
  if (!off) errors.push("downstream_capability_enabled");
  if (p.existingPositionPolicy.suggestionRequiresAdditionalEligibleUsdc !== true || p.existingPositionPolicy.detectionImplemented !== false) errors.push("existing_position_policy_invalid");
  for (const l of p.lanes) { const v = validateStableYieldLanePolicy(l); if (!v.valid) errors.push(...v.errors.map((e) => `lane:${e}`)); }
  for (const s of p.strategyTypes) { const v = validateStableYieldStrategyDefinition(s); if (!v.valid) errors.push(...v.errors.map((e) => `strategy_${s.strategyType}:${e}`)); }
  return { valid: errors.length === 0, errors };
}

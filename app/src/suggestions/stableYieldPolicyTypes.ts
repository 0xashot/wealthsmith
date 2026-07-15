/**
 * stableYieldPolicyTypes — Step 16A. The versioned, deterministic POLICY contract for the new Stable
 * USDC Yield suggestion family. It defines WHEN Stable Yield is allowed, the two independent lanes
 * (Safety-Buffer yield vs Excess-USDC yield), the generic yield-strategy taxonomy, the risk lanes,
 * the suppression-reason vocabulary, and the existing-position vs new-deployment distinction.
 *
 * POLICY ONLY. It builds NO protocol/vault registry, fetches NO APY/TVL, detects NO wallet/protocol
 * positions, computes NO eligibility/comparison, generates NO plan/suggestion, and adds NO UI /
 * Demo / Real Wallet / /testing / execution — those are Steps 16B–16H. Stable Yield is a Capital
 * Efficiency intent that improves returns on IDLE USDC and never increases portfolio risk; it always
 * preserves the Safety Buffer, determinism, and the read-only architecture.
 */
export const STABLE_YIELD_POLICY_SCHEMA_VERSION = "1.0.0";

export const STABLE_YIELD_POLICY_ID = "stable_yield_policy_v1";
export const STABLE_YIELD_POLICY_VERSION = "1.0.0";

export const STABLE_BUFFER_YIELD_POLICY_ID = "stable_buffer_yield_v1";
export const STABLE_BUFFER_YIELD_POLICY_VERSION = "1.0.0";

export const STABLE_EXCESS_YIELD_POLICY_ID = "stable_excess_yield_v1";
export const STABLE_EXCESS_YIELD_POLICY_VERSION = "1.0.0";

/** The two completely separate capital lanes Stable Yield supports. */
export type StableYieldLane = "safety_buffer_yield" | "excess_usdc_yield";

/**
 * Generic yield-strategy TYPES. The engine never thinks only in terms of lending — the specific
 * product (not the protocol) is the strategy. No product/protocol is assigned in 16A.
 */
export type StableYieldStrategyType = "lending" | "managed_vault" | "staking_like_vault" | "stable_liquidity_strategy" | "future_other";

/** Risk lanes a strategy product may later be placed into (the registry decides membership in 16B). */
export type StableYieldRiskLane = "buffer_eligible" | "excess_only" | "unsupported";

/** The documented WealthSmith protocol universe in scope for Stable Yield (identity only, no products). */
export type StableYieldSupportedProtocol = "kamino" | "raydium" | "meteora" | "hubble";

/** Whether a strategy's principal keeps a pure stable USD exposure, or something the policy forbids. */
export type StableYieldResultingExposure = "stable_usd" | "stable_lp" | "volatile" | "leveraged" | "unknown";

/** How a strategy's principal can be recovered — informs which lane it may serve. */
export type StableYieldWithdrawalModel = "immediate" | "requires_withdrawal" | "epoch_or_lockup" | "unknown";

/** Liquidity model of the strategy principal. */
export type StableYieldLiquidityModel = "liquid" | "semi_liquid" | "locked" | "unknown";

/** Fee model (documented, not calculated in 16A). */
export type StableYieldFeeModel = "none_documented" | "management_fee" | "performance_fee" | "spread_or_amm_fee" | "unknown";

/** Deterministic risk profile buckets. */
export type StableYieldRiskProfile = "conservative_stable" | "moderate_stable" | "elevated" | "unsupported";

export type StableYieldAllowanceStatus = "allowed" | "suppressed" | "not_applicable";

/** The policy-level suppression VOCABULARY. 16A defines these reasons; it implements no checks. */
export type StableYieldSuppressionReason =
  | "safety_buffer_incomplete"
  | "price_data_unavailable"
  | "protocol_data_unavailable"
  | "risk_policy_unavailable"
  | "yield_strategy_not_approved"
  | "unknown_strategy"
  | "unknown_asset"
  | "unknown_liquidity"
  | "unknown_withdrawal_behavior"
  | "no_eligible_capital";

/** Existing deployed position vs a new deployment of additional eligible USDC. */
export type StableYieldDeploymentKind = "existing_position" | "new_deployment";

/**
 * The deterministic definition of one generic strategy TYPE (not a product). Documents the intrinsic
 * shape a later registry product of this type must satisfy. No APY, no TVL, no protocol.
 */
export interface StableYieldStrategyDefinition {
  schemaVersion: "1.0.0";

  strategyType: StableYieldStrategyType;
  displayLabel: string;

  /** The principal asset the strategy holds (MVP: USDC only). */
  principalAsset: "USDC" | "unknown";

  resultingExposure: StableYieldResultingExposure;
  withdrawalModel: StableYieldWithdrawalModel;
  liquidityModel: StableYieldLiquidityModel;
  feeModel: StableYieldFeeModel;
  riskProfile: StableYieldRiskProfile;

  /** Which lanes this strategy TYPE is intrinsically allowed to serve (a product may be narrower). */
  eligibleLanes: StableYieldLane[];
  /** The risk lane this strategy TYPE defaults to before a product-specific review. */
  defaultRiskLane: StableYieldRiskLane;

  /** Intrinsic definition-level suppression reasons (e.g. `future_other` is not yet approved). */
  activationSuppressionReasons: StableYieldSuppressionReason[];

  /** Every capability stays off at the policy layer. */
  registryConfigured: false;
  marketDataEvaluated: false;
  eligibilityEvaluated: false;
  comparisonEvaluated: false;
  suggestionGenerated: false;

  transactionsEnabled: false;
  walletSignatureRequired: false;

  notes: string[];
}

/** The lane policy for one lane (buffer or excess) — its intent, gates, and constraints. */
export interface StableYieldLanePolicy {
  schemaVersion: "1.0.0";
  policyId: string;
  policyVersion: string;

  lane: StableYieldLane;

  /** Human-readable intent (not user-facing copy). */
  purpose: string;

  /** The Safety Buffer must be COMPLETE before either lane may activate. */
  requiresCompleteSafetyBuffer: true;
  /** The buffer lane additionally preserves the required reserve/coverage floor. */
  preservesRequiredBufferCoverage: boolean;

  allowedResultingExposures: StableYieldResultingExposure[];
  allowedRiskLanes: StableYieldRiskLane[];

  /** Suppression reasons that fully block this lane (definition-level list, not runtime checks). */
  blockingSuppressionReasons: StableYieldSuppressionReason[];

  volatileExposureAllowed: false;
  leveragedExposureAllowed: false;
  unsupportedAssetsAllowed: false;

  registryConfigured: false;
  suggestionGenerated: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  notes: string[];
}

/** The top-level Stable Yield policy shell tying the taxonomy, lanes, and scope together. */
export interface StableYieldPolicy {
  schemaVersion: "1.0.0";
  policyId: "stable_yield_policy_v1";
  policyVersion: "1.0.0";

  /** Stable Yield is a Capital Efficiency intent (never a higher-priority category). */
  suggestionFamily: "capital_efficiency";

  lanes: StableYieldLanePolicy[];
  strategyTypes: StableYieldStrategyDefinition[];

  supportedProtocolScope: StableYieldSupportedProtocol[];
  forbiddenProtocols: string[];

  /** Documented INTENDED priority order (16A does NOT change engine ordering). */
  intendedPriorityOrder: string[];

  existingPositionPolicy: {
    existingPositionsRemainVisible: true;
    suggestionRequiresAdditionalEligibleUsdc: true;
    detectionImplemented: false;
  };

  registryExists: false;
  comparisonExists: false;
  walletDetectionExists: false;
  suggestionsExist: false;
  uiExists: false;
  testingExists: false;
  executionEnabled: false;

  notes: string[];
}

/** The deterministic allowance/lane diagnostic result (describes policy; recommends nothing). */
export interface StableYieldAllowanceResult {
  policyId: "stable_yield_policy_v1";
  policyVersion: "1.0.0";

  status: StableYieldAllowanceStatus;
  lane?: StableYieldLane;

  suppressionReasons: StableYieldSuppressionReason[];

  bufferLaneApplicable: boolean;
  excessLaneApplicable: boolean;

  recommendationGenerated: false;
  suggestionGenerated: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  notes: string[];
}

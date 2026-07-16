/**
 * yieldStrategyPositionTypes — Step 16F. Versioned contracts for existing Stable Yield POSITION
 * normalization + exact registry matching + duplicate resolution, and the user-level ELIGIBLE-CAPITAL
 * snapshot. This layer consumes INJECTED read-only position + canonical Safety-Buffer + direct-USDC data
 * (never fetched from React). It normalizes existing yield positions, distinguishes technical
 * representations from one economic position, matches to EXACT registry products (never by name/symbol),
 * preserves non-approved/unmatched positions without promoting them, reports current-leader holdings,
 * and calculates lane-level source capacity. It selects NO product, NO final amount, generates NO plan
 * or suggestion, updates NO product output, and enables NO transaction/signature.
 */
import type { StableYieldRiskLane } from "./stableYieldPolicyTypes";
import type { YieldStrategyLifecycle } from "./yieldStrategyRegistryTypes";
import type { YieldMarketProvenanceKind } from "./yieldStrategyMarketDataTypes";

export const YIELD_STRATEGY_POSITION_SCHEMA_VERSION = "1.0.0";
export const YIELD_STRATEGY_POSITION_POLICY_ID = "yield_strategy_position_v1";
export const YIELD_STRATEGY_POSITION_POLICY_VERSION = "1.0.0";
export const YIELD_STRATEGY_POSITION_MATCHING_POLICY_ID = "yield_strategy_position_matching_v1";
export const YIELD_STRATEGY_POSITION_MATCHING_POLICY_VERSION = "1.0.0";
export const YIELD_STRATEGY_CAPITAL_SCHEMA_VERSION = "1.0.0";
export const YIELD_STRATEGY_CAPITAL_POLICY_ID = "yield_strategy_capital_v1";
export const YIELD_STRATEGY_CAPITAL_POLICY_VERSION = "1.0.0";

/** The documented WealthSmith protocol scope (identity only). */
export const YIELD_POSITION_SUPPORTED_PROTOCOLS: readonly string[] = ["kamino", "raydium", "meteora", "hubble"];
/** Canonical public USDC mint (reused from wallet/investmentTargetRegistry). */
export const CANONICAL_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export type YieldStrategyPositionMechanic = "lending_deposit" | "managed_vault_deposit" | "staking_like_vault_deposit" | "stable_liquidity_position" | "unknown";
export type YieldStrategyPositionRepresentation = "protocol_api_position" | "decoded_protocol_account" | "direct_vault_share" | "farm_staked_vault_share" | "liquidity_position" | "receipt_token" | "wallet_token_fallback" | "unknown";
export type YieldStrategyPositionMatchStatus = "matched_approved" | "matched_nonapproved" | "unmatched" | "ambiguous" | "invalid";
export type YieldStrategyPositionStatus = "active" | "inactive" | "zero_balance" | "unavailable" | "invalid";
export type YieldStrategyPositionValuationStatus = "complete" | "partial" | "unavailable" | "stale" | "invalid";
/** What kind of protocol usage the record represents — only *_deposit / liquidity are yield candidates. */
export type YieldStrategyPositionKind = "yield_deposit" | "stable_liquidity" | "borrow" | "cdp_collateral" | "debt" | "volatile_lp" | "unknown";

export interface YieldStrategyPositionInput {
  ownerAddress: string;
  protocolId: string;

  sourceId: string;
  sourceLabel?: string;
  sourceType?: string;
  provenanceKind?: YieldMarketProvenanceKind;
  browserFetched?: boolean;

  fetchedAt?: string;
  checkedAt: string;
  maximumAgeMs?: number;

  protocolPositionId?: string;
  protocolAccountAddress?: string;

  productAddress?: string;
  marketAddress?: string;
  vaultAddress?: string;
  poolAddress?: string;
  reserveAddress?: string;

  receiptMint?: string;
  shareMint?: string;
  underlyingMint?: string;

  mechanic?: YieldStrategyPositionMechanic;
  representation: YieldStrategyPositionRepresentation;

  rawAmount?: number;
  decimals?: number;
  shareAmountRaw?: number;
  underlyingAmountRaw?: number;

  currentValueUsd?: number;
  principalValueUsd?: number;

  /** Adapter hint — must still match exact registry identity to be honored. */
  matchedStrategyIdHint?: string;
  principalAssetId?: string;
  principalAssetMint?: string;

  metadata?: { positionKind?: YieldStrategyPositionKind; stableUnderlyingConfirmed?: boolean; [k: string]: unknown };
}

export interface YieldStrategyPositionProvenance {
  kind: YieldMarketProvenanceKind;
  sourceId: string;
  sourceLabel?: string;
  browserFetched: false;
  present: boolean;
}

export interface YieldStrategyPosition {
  schemaVersion: "1.0.0";
  policyId: string;
  policyVersion: "1.0.0";

  positionId: string;
  economicPositionId: string;

  ownerAddress: string;
  protocolId: string;
  protocolDisplayName: string;

  mechanic: YieldStrategyPositionMechanic;
  representation: YieldStrategyPositionRepresentation;
  positionKind: YieldStrategyPositionKind;
  status: YieldStrategyPositionStatus;

  productAddress?: string;
  marketAddress?: string;
  vaultAddress?: string;
  poolAddress?: string;
  reserveAddress?: string;
  protocolAccountAddress?: string;
  receiptMint?: string;
  shareMint?: string;
  underlyingMint?: string;

  principalAssetId: string;
  principalAssetMint?: string;

  rawAmount?: number;
  decimals?: number;
  shareAmountRaw?: number;
  underlyingAmountRaw?: number;

  currentValueUsd?: number;
  principalValueUsd?: number;
  valuationStatus: YieldStrategyPositionValuationStatus;

  sourceId: string;
  sourceLabel?: string;
  sourceType?: string;
  provenance: YieldStrategyPositionProvenance;
  fetchedAt?: string;
  checkedAt: string;
  maximumAgeMs: number;
  ageMs?: number;

  matchStatus: YieldStrategyPositionMatchStatus;
  matchedStrategyId?: string;
  matchedRegistryLifecycle?: YieldStrategyLifecycle;
  matchedRiskLane?: StableYieldRiskLane;

  /** True only when this exact product currently passes the 16D buffer lane (never inferred here). */
  countsTowardSafetyBuffer: boolean;
  countsTowardExcessPositionValue: boolean;

  comparisonLeaderForBuffer: boolean;
  comparisonLeaderForExcess: boolean;

  /** Deduplication role: canonical value record, or a duplicate representation of the same economic position. */
  isDuplicateRepresentation: boolean;
  duplicateOfEconomicPositionId?: string;

  warnings: string[];
  blockers: string[];
  notes: string[];

  comparisonPerformed: false;
  capitalEvaluated: false;
  amountSelected: false;
  planGenerated: false;
  suggestionGenerated: false;
  updatesProductOutput: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

/** A runtime-observed exact product address that is not in the registry — diagnostic only. */
export interface ObservedYieldStrategyProduct {
  protocolId: string;
  observedProductAddress: string;
  principalAssetId: string;
  mechanic: YieldStrategyPositionMechanic;
  sourceId: string;
  firstObservedAt?: string;
  checkedAt: string;
  matchingRegistryStrategyIds: string[];
  requiresDocumentation: true;
  autoApproved: false;
  registryMutated: false;
}

export interface YieldStrategyExistingPositionSummary {
  strategyId?: string;
  protocolId: string;
  exactProductAddress?: string;

  matchStatus: YieldStrategyPositionMatchStatus;
  registryLifecycle?: YieldStrategyLifecycle;

  positionIds: string[];
  economicPositionIds: string[];

  currentValueUsd?: number;
  freshValueUsd?: number;
  staleValueUsd?: number;
  unavailableValueUsd?: number;

  bufferEligibleValueUsd: number;
  excessPositionValueUsd: number;

  currentlyBufferEligible: boolean;
  currentlyExcessEligible: boolean;

  isBufferComparisonLeader: boolean;
  isExcessComparisonLeader: boolean;

  warnings: string[];
  blockers: string[];
}

export type YieldStrategyLeaderPositionStatus = "no_comparison_leader" | "leader_not_held" | "leader_held" | "leader_held_multiple_positions" | "leader_position_unavailable" | "leader_position_ambiguous";

export interface YieldStrategyLeaderPositionResult {
  lane: "buffer" | "excess";
  comparisonLeaderStrategyId?: string;
  held: boolean;
  matchedPositionIds: string[];
  currentValueUsd?: number;
  freshValueUsd?: number;
  positionCount: number;
  status: YieldStrategyLeaderPositionStatus;
  warnings: string[];
  blockers: string[];
}

export type YieldStrategyPositionSetStatus = "complete" | "partial" | "empty" | "blocked" | "invalid";

export interface YieldStrategyPositionSet {
  schemaVersion: "1.0.0";
  policyId: string;
  policyVersion: "1.0.0";

  ownerAddress: string;
  checkedAt: string;
  status: YieldStrategyPositionSetStatus;

  normalizedPositions: YieldStrategyPosition[];
  canonicalEconomicPositions: YieldStrategyPosition[];
  duplicateRepresentations: YieldStrategyPosition[];
  conflictingPositions: YieldStrategyPosition[];

  matchedApprovedPositionIds: string[];
  matchedNonapprovedPositionIds: string[];
  unmatchedPositionIds: string[];
  ambiguousPositionIds: string[];
  invalidPositionIds: string[];

  observedUndocumentedProducts: ObservedYieldStrategyProduct[];

  positionsByProtocol: Record<string, number>;
  positionsByStrategy: Record<string, number>;
  positionsByMechanic: Record<string, number>;

  existingPositionSummaries: YieldStrategyExistingPositionSummary[];

  totalRecognizedValueUsd?: number;
  totalMatchedApprovedValueUsd?: number;
  totalMatchedNonapprovedValueUsd?: number;
  totalUnmatchedValueUsd?: number;

  comparisonPerformed: false;
  capitalEvaluated: false;
  amountSelected: false;
  planGenerated: false;
  suggestionGenerated: false;
  updatesProductOutput: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  warnings: string[];
  blockers: string[];
  notes: string[];
}

export type YieldStrategyCapitalStatus = "ready" | "partial" | "buffer_incomplete" | "below_minimum" | "blocked" | "invalid";

export interface YieldStrategyEligibleCapitalSnapshot {
  schemaVersion: "1.0.0";
  policyId: string;
  policyVersion: "1.0.0";

  ownerAddress: string;
  checkedAt: string;
  userRiskProfileId?: string;

  status: YieldStrategyCapitalStatus;

  requiredBufferUsd: number;
  directWalletEligibleBufferUsd: number;
  existingEligibleBufferYieldUsd: number;
  currentEligibleBufferUsd: number;
  bufferShortfallUsd: number;
  canonicalBufferSurplusUsd: number;
  bufferComplete: boolean;

  vaultAllocationPct: number;
  walletAllocationPct: number;
  allowedBufferYieldUsd: number;
  requiredWalletFloorUsd: number;
  remainingBufferYieldCapacityUsd: number;

  directLiquidUsdcUsd: number;

  rawBufferYieldCapitalUsd: number;
  bufferYieldEligibleCapitalUsd: number;
  bufferYieldMinimumUsd?: number;
  bufferYieldMinimumPolicyAvailable: boolean;

  rawExcessYieldCapitalUsd: number;
  excessYieldEligibleCapitalUsd: number;
  excessYieldMinimumUsd: number;
  excessYieldMeetsMinimum: boolean;

  maximumCombinedSourceCapitalUsd: number;
  sharedSourceOverlapPossible: boolean;
  sharedSourceOverlapUsd: number;

  bufferLeaderPositionStatus: YieldStrategyLeaderPositionResult;
  excessLeaderPositionStatus: YieldStrategyLeaderPositionResult;

  comparisonPerformed: false;
  productSelected: false;
  amountSelected: false;
  planGenerated: false;
  suggestionGenerated: false;
  updatesProductOutput: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  blockers: string[];
  warnings: string[];
  notes: string[];
}

export interface YieldStrategyPositionValidationResult {
  valid: boolean;
  errors: string[];
}

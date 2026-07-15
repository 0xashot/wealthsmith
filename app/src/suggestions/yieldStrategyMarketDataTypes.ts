/**
 * yieldStrategyMarketDataTypes — Step 16C. The versioned, deterministic contract for the Stable Yield
 * LIVE MARKET-DATA layer: the per-product market snapshot (APY / TVL / liquidity / withdrawal / fees /
 * freshness / provenance) and the market-data set that joins the Step 16B registry to that data.
 *
 * This is the canonical LIVE-MARKET contract for the future comparison + eligibility steps (16D–16E).
 * It is deliberately SEPARATE from the registry (which knows WHAT products exist, never their market
 * values). It COMPARES nothing, RANKS nothing, chooses NO leader, generates NO suggestion, adds NO UI,
 * wires NO Demo / Real Wallet, prepares NO execution, and NEVER fetches from React. It preserves exact
 * product identity from the registry, preserves each source's APY MEANING (net/gross/estimated/...),
 * preserves TVL and liquidity/withdrawal state, attaches freshness + provenance, and fails closed. It
 * NEVER fabricates an address, an APY, a TVL, or a withdrawal behavior, and it NEVER auto-approves a
 * `documentation_required` registry entry. A zero-approved-product registry is a fully valid state:
 * the approved-candidate set is simply empty.
 */
import type { StableYieldLane, StableYieldRiskLane, StableYieldStrategyType } from "./stableYieldPolicyTypes";
import type { YieldStrategyLifecycle, YieldStrategyPrincipalAsset } from "./yieldStrategyRegistryTypes";
import type { StableYieldSupportedProtocol } from "./stableYieldPolicyTypes";

export const YIELD_STRATEGY_MARKET_DATA_SCHEMA_VERSION = "1.0.0";
export const YIELD_STRATEGY_MARKET_DATA_POLICY_ID = "yield_strategy_market_data_v1";
export const YIELD_STRATEGY_MARKET_DATA_POLICY_VERSION = "1.0.0";

/**
 * What a source's APY MEANS. Sources do NOT share one definition — a source that reports `net` APY is
 * preserved as `net`; a `gross` source stays `gross`. `unknown` is preserved as unknown and fails
 * closed for any later step that requires a defined interpretation. Never collapsed to a single number.
 */
export type YieldApyDefinition = "net" | "gross" | "estimated" | "current" | "variable" | "unknown";

/** The time window an APY figure describes. `unknown` fails closed for windowed comparison. */
export type YieldApyWindow = "spot" | "current" | "7d" | "30d" | "unknown";

/**
 * Explicit withdrawal state — a FIRST-CLASS field because it gates the Safety Buffer lane. Never
 * inferred from token names, protocol names, TVL, or product category.
 */
export type YieldWithdrawalStatus =
  | "instant_currently_available"
  | "partial_currently_available"
  | "withdrawal_required"
  | "queue_possible"
  | "unavailable"
  | "unknown";

/** How confidently liquidity is known. Liquidity is NEVER guessed — absent source data → `unknown`. */
export type YieldLiquidityConfidence = "explicit_source" | "partial" | "unknown";

/** Snapshot status. `unavailable` covers a non-approved / no-market-input product (documentation-only). */
export type YieldMarketSnapshotStatus = "complete" | "partial" | "stale" | "invalid" | "unavailable";

/** Per-field data status. */
export type YieldMarketFieldStatus = "fresh" | "stale" | "invalid" | "missing";

/** Where the market data came from. A browser-provider fetch is never accepted (browserFetched:false). */
export type YieldMarketProvenanceKind =
  | "documented_source"
  | "backend_normalized"
  | "same_origin_runtime_payload"
  | "none";

/** Source provenance for a snapshot. `present:false` when no market data is attached (documentation-only). */
export interface YieldMarketProvenance {
  kind: YieldMarketProvenanceKind;
  sourceId?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  /** The browser must never call an external yield-data provider — always false. */
  browserFetched: false;
  present: boolean;
}

/**
 * APY data for one product. Every value is optional and preserved exactly from the source; the
 * definition + window preserve the source's MEANING. `definitionSufficientForComparison` is true ONLY
 * when a comparable interpretation (net or gross) is present — otherwise later comparison must fail closed.
 */
export interface YieldApyData {
  status: YieldMarketFieldStatus;
  apyDefinition: YieldApyDefinition;
  apyWindow: YieldApyWindow;
  currentApyPct?: number;
  sevenDayApyPct?: number;
  thirtyDayApyPct?: number;
  grossApyPct?: number;
  netApyPct?: number;
  /** true only when a net/gross interpretation is present. `unknown`/`estimated`/`variable` → false. */
  definitionSufficientForComparison: boolean;
  notes: string[];
}

/** TVL data — current, numeric, currency-bearing, freshness carried at the snapshot level. */
export interface YieldTvlData {
  status: YieldMarketFieldStatus;
  tvlUsd?: number;
  currency: "USD";
  notes: string[];
}

/**
 * Liquidity / withdrawal data. Explicit only — never inferred from TVL / APY / protocol / category.
 * Withdrawal state is first-class (Safety Buffer lane depends on it).
 */
export interface YieldLiquidityData {
  status: YieldMarketFieldStatus;
  withdrawalStatus: YieldWithdrawalStatus;
  availableLiquidityUsd?: number;
  availableLiquidityRatio?: number;
  withdrawalDelayHours?: number;
  withdrawalQueueActive?: boolean;
  withdrawalWindowHours?: number;
  liquidityConfidence: YieldLiquidityConfidence;
  notes: string[];
}

/** Fee data — each fee preserved separately; never summed into a synthetic total. */
export interface YieldFeeData {
  status: YieldMarketFieldStatus;
  managementFeePct?: number;
  performanceFeePct?: number;
  withdrawalFeePct?: number;
  feeModel: "none_documented" | "management_fee" | "performance_fee" | "spread_or_amm_fee" | "unknown";
  notes: string[];
}

/**
 * Lane-compatibility metadata carried WITH the snapshot. 16C never SELECTS a lane; it only preserves
 * the registry lane + the lane-specific freshness/liquidity/withdrawal expectations for later steps.
 */
export interface YieldLaneCompatibility {
  supportedLane: StableYieldLane;
  riskLane: StableYieldRiskLane;
  bufferLaneCandidate: boolean;
  excessLaneCandidate: boolean;
  /** Stricter freshness bound the Safety Buffer lane must satisfy later. */
  bufferLaneFreshnessMaxAgeMs: number;
  /** Broader freshness bound the Excess-USDC lane must satisfy later. */
  excessLaneFreshnessMaxAgeMs: number;
  bufferLaneRequiresInstantLiquidity: true;
  bufferLaneRequiresDefinedWithdrawal: true;
  notes: string[];
}

/**
 * One EXACT product's live market snapshot. Identity is copied verbatim from the registry entry.
 * All comparison / eligibility / suggestion / execution capabilities stay pinned false.
 */
export interface YieldStrategyMarketSnapshot {
  schemaVersion: "1.0.0";
  policyVersion: "1.0.0";

  // ---- Exact registry identity (never re-derived) ----
  strategyId: string;
  displayName: string;
  protocolId: StableYieldSupportedProtocol;
  protocolDisplayName: string;
  strategyType: StableYieldStrategyType;
  principalAsset: YieldStrategyPrincipalAsset;
  supportedLane: StableYieldLane;
  riskLane: StableYieldRiskLane;
  lifecycle: YieldStrategyLifecycle;
  /** Exact on-chain identity from the registry — `undefined` until documented, never fabricated. */
  address?: string;

  status: YieldMarketSnapshotStatus;

  apy: YieldApyData;
  tvl: YieldTvlData;
  liquidity: YieldLiquidityData;
  fees: YieldFeeData;

  laneCompatibility: YieldLaneCompatibility;

  // ---- Provenance + freshness ----
  sourceId?: string;
  sourceLabel?: string;
  provenance: YieldMarketProvenance;
  fetchedAt?: string;
  checkedAt: string;
  maximumAgeMs: number;
  ageMs?: number;

  warnings: string[];
  blockers: string[];

  // ---- Data-readiness only (NEVER selection) ----
  /** lifecycle === "approved" AND an exact address is documented. */
  approvedForMarketData: boolean;
  marketDataComplete: boolean;
  marketDataFresh: boolean;
  /** approved + complete + fresh + no blockers. Data-readiness for a FUTURE step; enables nothing now. */
  eligibleForFutureComparison: boolean;

  comparisonEvaluated: false;
  eligibilityEvaluated: false;
  rankingCalculated: false;
  leaderSelected: false;
  suggestionGenerated: false;
  updatesProductOutput: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

/**
 * The market-data SET: the registry (in canonical order) joined to its market data. The approved set
 * may be empty (the honest state today). Comparison / ranking / leader / suggestion stay false.
 */
export interface YieldStrategyMarketDataSet {
  schemaVersion: "1.0.0";
  policyId: string;
  policyVersion: "1.0.0";

  generatedAt: string;
  checkedAt: string;

  /** Registry order — display determinism, never a ranking. */
  canonicalCandidateOrder: string[];

  snapshots: Record<string, YieldStrategyMarketSnapshot>;

  /** lifecycle === "approved" registry entries (may be empty). */
  approvedCandidateIds: string[];
  documentationRequiredCandidateIds: string[];
  /** Data-readiness gate only (approved + complete + fresh). Empty while no product is approved. */
  marketReadyCandidateIds: string[];
  unavailableCandidateIds: string[];

  /** True when no product is approved — a valid, deterministic, empty-allowed state. */
  emptyApprovedSet: boolean;

  comparisonEvaluated: false;
  rankingCalculated: false;
  leaderSelected: false;
  suggestionGenerated: false;
  updatesProductOutput: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  notes: string[];
}

/**
 * A raw per-product market-data INPUT from a documented source. Deterministically INJECTED (never
 * fetched here). Only matched to an APPROVED registry entry with a documented address; anything else is
 * ignored and the product stays a documentation-only, unavailable snapshot.
 */
export interface YieldStrategyMarketDataInput {
  strategyId: string;

  sourceId?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  provenanceKind?: YieldMarketProvenanceKind;
  /** true is REJECTED — the browser must not call external yield-data providers. */
  browserFetched?: boolean;

  fetchedAt?: string;
  maximumAgeMs?: number;

  apy?: {
    currentApyPct?: number;
    sevenDayApyPct?: number;
    thirtyDayApyPct?: number;
    grossApyPct?: number;
    netApyPct?: number;
    apyDefinition?: YieldApyDefinition;
    apyWindow?: YieldApyWindow;
  };
  tvlUsd?: number;
  liquidity?: {
    withdrawalStatus?: YieldWithdrawalStatus;
    availableLiquidityUsd?: number;
    availableLiquidityRatio?: number;
    withdrawalDelayHours?: number;
    withdrawalQueueActive?: boolean;
    withdrawalWindowHours?: number;
    liquidityConfidence?: YieldLiquidityConfidence;
  };
  fees?: {
    managementFeePct?: number;
    performanceFeePct?: number;
    withdrawalFeePct?: number;
    feeModel?: YieldFeeData["feeModel"];
  };
}

export interface YieldStrategyMarketDataValidationResult {
  valid: boolean;
  errors: string[];
}

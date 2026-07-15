/**
 * yieldStrategyRegistryTypes — Step 16B. The versioned type contract for the GENERIC Yield Strategy
 * Registry. It answers "what products exist?" — never "which is better?" (no comparison, scoring, or
 * ranking). Entries are EXACT products (one vault / one lending market / one liquidity strategy),
 * never protocol names. The MVP asset is USDC, but the schema supports future assets, protocols,
 * strategy types, and risk lanes WITHOUT schema changes.
 *
 * It reuses the Step 16A strategy taxonomy and risk lanes verbatim (never redefines them). It fetches
 * no APY/TVL, detects no wallet/protocol positions, computes no eligibility/comparison, generates no
 * plan/suggestion, and adds no UI / testing / execution — those are Steps 16C–16H. No address is ever
 * fabricated: an undocumented product carries `address: undefined` and lifecycle `documentation_required`.
 */
import type { StableYieldLane, StableYieldRiskLane, StableYieldStrategyType, StableYieldSupportedProtocol } from "./stableYieldPolicyTypes";

export const YIELD_STRATEGY_REGISTRY_SCHEMA_VERSION = "1.0.0";
export const YIELD_STRATEGY_REGISTRY_VERSION = "1.0.0";
export const YIELD_STRATEGY_REGISTRY_POLICY_ID = "yield_strategy_registry_v1";

/**
 * Product lifecycle (this IS the registry status). Only `approved` products may later become
 * candidates in Step 16C. `documentation_required` marks a product whose exact address / full
 * documentation is not yet available (never fabricated).
 */
export type YieldStrategyLifecycle = "approved" | "review" | "documentation_required" | "deprecated" | "disabled" | "future";

/** Principal asset held by the strategy. MVP: USDC. The union is open for future assets. */
export type YieldStrategyPrincipalAsset = "USDC";

/**
 * One EXACT registry product. Reuses the 16A `StableYieldStrategyType`, `StableYieldLane`, and
 * `StableYieldRiskLane` verbatim. Carries no market/risk/APY/liquidity data (16C+).
 */
export interface YieldStrategyRegistryEntry {
  schemaVersion: "1.0.0";
  registryVersion: "1.0.0";

  strategyId: string;
  displayName: string;

  protocolId: StableYieldSupportedProtocol;
  protocolDisplayName: string;

  strategyType: StableYieldStrategyType;
  principalAsset: YieldStrategyPrincipalAsset;

  supportedLane: StableYieldLane;
  riskLane: StableYieldRiskLane;

  lifecycle: YieldStrategyLifecycle;

  /** Official app/manage URL — reused from repo documentation only; undefined when not documented. */
  officialUrl?: string;
  /** Documentation URL — undefined when not documented. */
  documentationUrl?: string;
  /** Stable documentation identity for duplicate detection — undefined when no doc reference exists. */
  documentationId?: string;

  /** Exact on-chain identity. `undefined` until documented — NEVER fabricated. */
  address?: string;

  /** Every downstream capability stays off at the registry layer. */
  marketDataEvaluated: false;
  eligibilityEvaluated: false;
  comparisonEvaluated: false;
  suggestionGenerated: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  notes: string[];
}

export interface YieldStrategyRegistryValidationResult {
  valid: boolean;
  errors: string[];
}

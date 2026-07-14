/**
 * solStakingMarketDataTypes — Step 14U. The data model for the PRODUCTION SOL staking
 * market-data refresh + last-known-good cache layer.
 *
 * This is the LIVE MARKET CACHE model, deliberately SEPARATE from the point-in-time
 * approval evidence (`solLiquidStakingFreshEvidenceRecords` / `solNativeStakingBaselineEvidence`).
 * Approval evidence is reviewed once and drives risk score + read-only approval; it must NEVER
 * be mutated by a live refresh. This live cache is refreshed periodically, can go stale /
 * partial / unavailable, must fail closed, and is used LATER by candidate normalization
 * (Step 14V) and the deterministic selector comparison (Step 14W) — NOT here.
 *
 * HARD BOUNDARIES (all live-affecting capabilities OFF): this model never selects a protocol,
 * never ranks candidates, never chooses a winner, never replaces Jito, never updates live
 * recommendations, and never carries a transaction/signature path. Every snapshot pins
 * `selectedByProtocolLogic`, `currentWinner`, `updatesLiveRecommendations`,
 * `transactionsEnabled`, and `walletSignatureRequired` to `false`.
 */
import { JITOSOL_BETA_PROTOCOL_ID } from "./jitoSolBetaActivation";
import { JUPITER_NATIVE_STAKE_PROTOCOL_ID } from "./nativeValidatorMarketData";

/* ------------------------------------------------------------------ *
 * Module-level flags (all live-affecting capabilities OFF).
 * ------------------------------------------------------------------ */
export const SOL_STAKING_MARKET_DATA_MODEL_EXISTS = true;
export const SOL_STAKING_MARKET_DATA_ENABLES_SELECTOR = false;
export const SOL_STAKING_MARKET_DATA_RANKS_CANDIDATES = false;
export const SOL_STAKING_MARKET_DATA_SELECTS_WINNER = false;
export const SOL_STAKING_MARKET_DATA_UPDATES_LIVE_RECOMMENDATIONS = false;
export const SOL_STAKING_MARKET_DATA_MUTATES_APPROVAL_EVIDENCE = false;
export const SOL_STAKING_MARKET_DATA_MUTATES_RISK_SCORES = false;
export const SOL_STAKING_MARKET_DATA_ENABLES_TRANSACTIONS = false;
export const SOL_STAKING_MARKET_DATA_REQUIRES_WALLET_SIGNATURE = false;

/* ------------------------------------------------------------------ *
 * Canonical candidate IDs — reuse the EXISTING registry identifiers, no duplicates.
 * ------------------------------------------------------------------ */
export const SOL_STAKING_MARKET_CANDIDATE_IDS = {
  jito: JITOSOL_BETA_PROTOCOL_ID, // "jito"
  marinade: "marinade",
  jupiter: "jupiter",
  blazestake: "blazestake",
  jupiterNativeStake: JUPITER_NATIVE_STAKE_PROTOCOL_ID, // "jupiter_native_stake"
  sanctum: "sanctum",
} as const;

/**
 * The LIVE market set, in canonical registry order. INF (sanctum) is included as a
 * MONITORED but BLOCKED candidate — it may be refreshed, but stays approvedForReadOnlyReview
 * false / blockedByRiskApproval true / eligibleForFutureComparison false unless separately
 * re-approved.
 */
export const SOL_STAKING_MARKET_CANDIDATE_ORDER: readonly string[] = [
  SOL_STAKING_MARKET_CANDIDATE_IDS.jito,
  SOL_STAKING_MARKET_CANDIDATE_IDS.jupiter,
  SOL_STAKING_MARKET_CANDIDATE_IDS.marinade,
  SOL_STAKING_MARKET_CANDIDATE_IDS.blazestake,
  SOL_STAKING_MARKET_CANDIDATE_IDS.jupiterNativeStake,
  SOL_STAKING_MARKET_CANDIDATE_IDS.sanctum,
];

export type SolStakingMarketCandidateType = "liquid_staking_token" | "native_staking";

export type SolStakingMarketFieldName =
  | "current_apy_pct"
  | "apy_30d_pct"
  | "tvl_usd"
  | "delegated_stake_sol"
  | "validator_commission_pct"
  | "validator_delinquent"
  | "source_epoch";

export type SolStakingMarketFieldUnit = "pct" | "usd" | "sol" | "boolean" | "epoch";

export type SolStakingMarketFieldStatus = "fresh" | "stale" | "invalid" | "missing";

/** A single source-attributed market field. Freshness is per-field (sources differ). */
export interface SolStakingMarketField<T> {
  value: T;
  unit: SolStakingMarketFieldUnit;
  sourceName: string;
  sourceUrl: string;
  fetchedAt: string;
  sourceAsOf?: string;
  sourceEpoch?: number;
  status: SolStakingMarketFieldStatus;
  notes: string[];
}

export type SolStakingMarketSnapshotStatus =
  | "complete"
  | "partial"
  | "missing"
  | "stale"
  | "invalid"
  | "source_error";

export interface SolStakingMarketSnapshotFields {
  currentApyPct?: SolStakingMarketField<number>;
  apy30dPct?: SolStakingMarketField<number>;
  tvlUsd?: SolStakingMarketField<number>;
  delegatedStakeSol?: SolStakingMarketField<number>;
  validatorCommissionPct?: SolStakingMarketField<number>;
  validatorDelinquent?: SolStakingMarketField<boolean>;
  sourceEpoch?: SolStakingMarketField<number>;
}

export interface SolStakingMarketSnapshot {
  candidateId: string;
  protocolName: string;
  assetSymbol: string;
  candidateType: SolStakingMarketCandidateType;

  fields: SolStakingMarketSnapshotFields;

  fetchedAt: string;
  checkedAt: string;

  status: SolStakingMarketSnapshotStatus;

  missingFields: string[];
  staleFields: string[];
  blockers: string[];
  notes: string[];

  /** Reflects the EXISTING deterministic approval decision — never recomputed from market values. */
  approvedForReadOnlyReview: boolean;
  blockedByRiskApproval: boolean;

  /** Data-readiness only (complete + fresh). Does NOT enable the selector. */
  freshEnoughForFutureComparison: boolean;
  /** approved AND fresh-enough AND not blocked. Data-readiness only. Does NOT enable the selector. */
  eligibleForFutureComparison: boolean;

  selectedByProtocolLogic: false;
  currentWinner: false;
  updatesLiveRecommendations: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

export type SolStakingMarketRefreshStatus = "complete" | "partial" | "failed";

export interface SolStakingMarketCache {
  schemaVersion: string;
  generatedAt: string;
  checkedAt: string;
  refreshAttemptedAt: string;

  candidates: Record<string, SolStakingMarketSnapshot>;

  refreshStatus: SolStakingMarketRefreshStatus;

  successfulCandidateIds: string[];
  failedCandidateIds: string[];
  staleCandidateIds: string[];

  notes: string[];
}

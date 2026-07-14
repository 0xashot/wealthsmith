/**
 * solStakingCandidateNormalizationTypes — Step 14V. The shared, deterministic comparison model
 * that Step 14W will consume. It aligns FIELD NAMES across LST and native-staking candidates
 * while PRESERVING SEMANTICS — it never flattens unlike concepts (LST TVL in USD vs native
 * delegated stake in SOL; LST management fee vs native validator commission; market liquidity
 * vs epoch-based native unstaking) into misleading equivalences.
 *
 * NORMALIZATION ONLY. Every metric carries a `comparisonScope` so a consumer knows exactly
 * which fields are genuinely comparable across all candidates and which are type-specific or
 * descriptive-only. Nothing here computes a selector score, defines weights, ranks, sorts,
 * chooses a winner, changes selection/approval/evidence/live-cache, or touches
 * transactions/signatures. Every capability flag is pinned `false`.
 */
import { SOL_STAKING_MARKET_CANDIDATE_IDS, SOL_STAKING_MARKET_CANDIDATE_ORDER } from "./solStakingMarketDataTypes";

export const SOL_STAKING_NORMALIZATION_SCHEMA_VERSION = "1.0.0";

/** Reuse the Step 14U canonical IDs + order — no duplicate identifiers. */
export const SOL_STAKING_NORMALIZATION_CANDIDATE_IDS = SOL_STAKING_MARKET_CANDIDATE_IDS;
export const SOL_STAKING_NORMALIZATION_CANDIDATE_ORDER = SOL_STAKING_MARKET_CANDIDATE_ORDER;

/** Module-level flags (all live-affecting capabilities OFF). */
export const SOL_STAKING_NORMALIZATION_MODEL_EXISTS = true;
export const SOL_STAKING_NORMALIZATION_CALCULATES_SELECTOR_SCORE = false;
export const SOL_STAKING_NORMALIZATION_DEFINES_SELECTOR_WEIGHTS = false;
export const SOL_STAKING_NORMALIZATION_RANKS_CANDIDATES = false;
export const SOL_STAKING_NORMALIZATION_SELECTS_WINNER = false;
export const SOL_STAKING_NORMALIZATION_RECALCULATES_RISK_SCORES = false;
export const SOL_STAKING_NORMALIZATION_MUTATES_APPROVAL = false;
export const SOL_STAKING_NORMALIZATION_MUTATES_LIVE_CACHE = false;
export const SOL_STAKING_NORMALIZATION_MUTATES_EVIDENCE = false;
export const SOL_STAKING_NORMALIZATION_ENABLES_TRANSACTIONS = false;
export const SOL_STAKING_NORMALIZATION_REQUIRES_WALLET_SIGNATURE = false;

export type NormalizedSolStakingDataClass =
  | "live_market"
  | "reviewed_evidence"
  | "derived_transparent"
  | "descriptive_static";

export type NormalizedSolStakingComparisonScope =
  | "all_candidates"
  | "lst_only"
  | "native_only"
  | "candidate_type_specific"
  | "descriptive_only"
  | "not_comparable";

export type NormalizedSolStakingMetricStatus =
  | "available"
  | "missing"
  | "stale"
  | "invalid"
  | "not_applicable";

export type NormalizedSolStakingMetricUnit =
  | "pct"
  | "pct_points"
  | "usd"
  | "sol"
  | "boolean"
  | "epoch"
  | "hours"
  | "text";

export interface NormalizedSolStakingMetric<T> {
  key: string;
  value?: T;
  unit: NormalizedSolStakingMetricUnit;

  dataClass: NormalizedSolStakingDataClass;
  comparisonScope: NormalizedSolStakingComparisonScope;
  status: NormalizedSolStakingMetricStatus;

  sourceName?: string;
  sourceUrl?: string;
  sourceFetchedAt?: string;
  sourceAsOf?: string;
  sourceEpoch?: number;

  methodology?: string;
  notes: string[];
}

export interface NormalizedSolStakingCandidate {
  candidateId: string;
  protocolName: string;
  assetSymbol: string;

  candidateType: "liquid_staking_token" | "native_staking";
  tokenModel: "spl_liquid_staking_token" | "native_stake_account";

  isLiquidStakingToken: boolean;
  splTokenMint: string | null;

  approval: {
    approvedForReadOnlyReview: boolean;
    blockedByRiskApproval: boolean;
    reviewedRiskScore?: number;
    reviewThreshold: number;
    selectedByProtocolLogic: false;
    currentWinner: false;
  };

  yield: {
    currentApyPct: NormalizedSolStakingMetric<number>;
    apy30dPct: NormalizedSolStakingMetric<number>;

    apyDeltaPctPoints: NormalizedSolStakingMetric<number>;
    absoluteApyDeltaPctPoints: NormalizedSolStakingMetric<number>;

    methodologyNotes: string[];
  };

  adoption: {
    metricKind: "tvl_usd" | "delegated_stake_sol";
    metric: NormalizedSolStakingMetric<number>;
    directlyComparableAcrossAllCandidates: false;
    notes: string[];
  };

  fees: {
    annualManagementFeePct: NormalizedSolStakingMetric<number>;
    validatorCommissionPct: NormalizedSolStakingMetric<number>;
    directUnstakeFeePct: NormalizedSolStakingMetric<number>;

    feeModel: "lst_protocol_fee_model" | "native_validator_commission_model";
    directlyComparableAcrossCandidateTypes: false;
    notes: string[];
  };

  exit: {
    liquidityClass: "liquid_token" | "native_stake_account";

    immediateExitAvailable: NormalizedSolStakingMetric<boolean>;
    delayedExitAvailable: NormalizedSolStakingMetric<boolean>;

    delayModel: "market_or_instant" | "epoch_based" | "variable" | "unknown";
    delayDescription: NormalizedSolStakingMetric<string>;

    notes: string[];
  };

  risk: {
    reviewedRiskScore: NormalizedSolStakingMetric<number>;
    operationalRiskSummary: NormalizedSolStakingMetric<string>;
    incidentSummary: NormalizedSolStakingMetric<string>;
    riskScoreRecalculatedByNormalization: false;
  };

  liveMarket: {
    sourceSnapshotStatus: "complete" | "partial" | "missing" | "stale" | "invalid" | "source_error";
    sourceSnapshotFetchedAt: string;
    sourceCacheGeneratedAt: string;
    liveFieldsFresh: boolean;
  };

  readiness: {
    approved: boolean;
    liveMarketComplete: boolean;
    liveMarketFresh: boolean;
    staticFactsComplete: boolean;

    normalized: boolean;
    eligibleForFutureSelectorInput: boolean;

    blockers: string[];
    warnings: string[];
  };

  selectedByProtocolLogic: false;
  currentWinner: false;
  selectorScoreCalculated: false;
  rankingCalculated: false;
  updatesLiveRecommendations: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

export interface NormalizedSolStakingCandidateSet {
  schemaVersion: "1.0.0";
  generatedAt: string;
  checkedAt: string;

  sourceMarketCacheSchemaVersion: string;
  sourceMarketCacheGeneratedAt: string;

  canonicalCandidateOrder: string[];

  candidates: Record<string, NormalizedSolStakingCandidate>;

  selectorReadyCandidateIds: string[];
  excludedCandidateIds: string[];

  exclusions: Record<string, string[]>;

  selectorScoreCalculated: false;
  rankingCalculated: false;
  winnerSelected: false;
  updatesLiveRecommendations: false;

  notes: string[];
}

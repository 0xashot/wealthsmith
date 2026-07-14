/**
 * solStakingSelectorTypes — Step 14W. Result types for the deterministic, READ-ONLY SOL
 * staking selector COMPARISON. This is an internal comparison only: it identifies a
 * "comparison leader" under an explicit policy — it never activates that leader, never changes
 * `selectedProtocolId`, never sets any product `currentWinner` / `selectedByProtocolLogic`
 * flag, and never touches UI, Top Pick, engine ordering, transactions, or signatures.
 *
 * Terminology is deliberately internal: "comparison", "comparison score", "ranked comparison",
 * "comparison leader", "proposed leader", "policy", "score breakdown", "tie-break". No
 * product-facing claims (best/safest/recommended/guaranteed) appear here.
 */

export type SolStakingSelectorDimensionKey =
  | "reviewed_risk_score"
  | "apy_30d"
  | "current_apy"
  | "apy_stability";

export type SolStakingSelectorStatus =
  | "complete"
  | "insufficient_candidates"
  | "invalid_input"
  | "no_ready_candidates";

export type SolStakingSelectorActivationStatus = "comparison_only_not_activated";

export interface SolStakingSelectorDimensionScore {
  dimension: SolStakingSelectorDimensionKey;
  rawValue: number;
  rawUnit: "score_0_10" | "pct" | "pct_points";
  normalizedScore: number;
  weight: number;
  weightedContribution: number;
  methodology: string;
  sourceNotes: string[];
}

export interface SolStakingSelectorContextMetric {
  key: string;
  value?: number | string | boolean;
  unit?: string;
  comparisonScope: "lst_only" | "native_only" | "candidate_type_specific" | "descriptive_only" | "not_comparable";
  usedInScore: false;
  notes: string[];
}

export interface SolStakingSelectorCandidateResult {
  candidateId: string;
  protocolName: string;
  assetSymbol: string;
  candidateType: "liquid_staking_token" | "native_staking";

  canonicalOrderIndex: number;

  dimensions: {
    reviewedRiskScore: SolStakingSelectorDimensionScore;
    apy30d: SolStakingSelectorDimensionScore;
    currentApy: SolStakingSelectorDimensionScore;
    apyStability: SolStakingSelectorDimensionScore;
  };

  totalScore: number;
  rank: number;

  context: {
    adoption: SolStakingSelectorContextMetric;
    annualManagementFee: SolStakingSelectorContextMetric;
    validatorCommission: SolStakingSelectorContextMetric;
    directUnstakeFee: SolStakingSelectorContextMetric;
    exitModel: SolStakingSelectorContextMetric;
    tokenModel: SolStakingSelectorContextMetric;
  };

  tieBreakersApplied: string[];
  scoreCalculated: true;

  selectedByProtocolLogic: false;
  currentWinner: false;
  activated: false;
  updatesLiveRecommendations: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  notes: string[];
}

export interface SolStakingSelectorComparisonResult {
  policyId: string;
  policyVersion: string;

  generatedAt: string;
  checkedAt: string;

  sourceNormalizationSchemaVersion: string;
  sourceMarketCacheGeneratedAt: string;

  status: SolStakingSelectorStatus;
  activationStatus: "comparison_only_not_activated";

  eligibleCandidateIds: string[];
  excludedCandidateIds: string[];
  exclusions: Record<string, string[]>;

  rankedCandidateIds: string[];
  candidateResults: Record<string, SolStakingSelectorCandidateResult>;

  comparisonLeaderCandidateId?: string;
  currentSelectedCandidateId: string;
  leaderDiffersFromCurrentSelection: boolean;

  scoreCalculated: boolean;
  rankingCalculated: boolean;
  comparisonLeaderIdentified: boolean;

  selectedProtocolIdChanged: false;
  winnerActivated: false;
  multiProtocolSelectionEnabled: false;
  topPickChanged: false;
  engineOrderingChanged: false;
  updatesLiveRecommendations: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  notes: string[];
}

/**
 * solStakingSelectorSensitivityTypes — Step 14X. Types for the deterministic sensitivity
 * analysis and the historical-snapshot analysis that feed the activation gate. These answer
 * "is the Step 14W comparison lead robust or knife-edge under reasonable changes in policy and
 * market inputs, and is there enough fresh operational/historical evidence to even CONSIDER
 * activation?" — while remaining strictly comparison-only and read-only.
 *
 * Nothing here activates anything: no `selectedProtocolId` change, no product winner, no UI,
 * no execution. Synthetic stress scenarios are labeled and must never be presented as observed
 * market history.
 */
import type { NormalizedSolStakingCandidateSet } from "./solStakingCandidateNormalizationTypes";

export type SolStakingSensitivityScenarioClass =
  | "baseline"
  | "policy_weights"
  | "normalization_ranges"
  | "market_perturbation"
  | "data_availability"
  | "historical_snapshot";

export type SolStakingSensitivityScenarioStatus =
  | "complete"
  | "insufficient_candidates"
  | "invalid_input"
  | "skipped";

export interface SolStakingSensitivityScenario {
  scenarioId: string;
  scenarioName: string;
  scenarioClass: SolStakingSensitivityScenarioClass;
  description: string;

  syntheticScenario: boolean;
  includedInLeaderRetentionRate: boolean;

  policyOverrides?: {
    reviewedRiskWeight?: number;
    apy30dWeight?: number;
    currentApyWeight?: number;
    apyStabilityWeight?: number;
    apyMinimumRangePctPoints?: number;
    stabilityMinimumRangePctPoints?: number;
  };

  /** Keys may be concrete candidate IDs or symbolic targets ($baseline_leader, $baseline_runner_up, $highest_risk, $all). */
  marketOverrides?: Record<string, {
    currentApyDeltaPctPoints?: number;
    apy30dDeltaPctPoints?: number;
    replaceCurrentApyWith30d?: boolean;
    markCandidateStale?: boolean;
    markCandidatePartial?: boolean;
    excludeCandidate?: boolean;
  }>;

  sourceSnapshotGeneratedAt?: string;
  notes: string[];
}

export interface SolStakingSensitivityScenarioResult {
  scenarioId: string;
  scenarioName: string;
  scenarioClass: SolStakingSensitivityScenarioClass;
  syntheticScenario: boolean;
  status: SolStakingSensitivityScenarioStatus;

  eligibleCandidateIds: string[];
  excludedCandidateIds: string[];

  rankedCandidateIds: string[];
  comparisonLeaderCandidateId?: string;

  baselineLeaderRetained: boolean;
  baselineLeaderRank?: number;

  leaderScore?: number;
  runnerUpCandidateId?: string;
  runnerUpScore?: number;
  leaderMargin?: number;

  candidateScores: Record<string, number>;
  blockers: string[];
  notes: string[];
}

export interface SolStakingSelectorSensitivityResult {
  schemaVersion: string;
  generatedAt: string;
  checkedAt: string;

  sourceSelectorPolicyId: string;
  sourceSelectorPolicyVersion: string;
  baselineLeaderCandidateId?: string;

  scenarios: SolStakingSensitivityScenarioResult[];

  completedScenarioCount: number;
  retentionEligibleScenarioCount: number;

  leaderRetentionRate?: number;
  baselineLeaderAverageRank?: number;
  baselineLeaderWorstRank?: number;

  minimumLeaderMargin?: number;
  medianLeaderMargin?: number;
  knifeEdgeScenarioCount: number;
  leaderSwitchScenarioCount: number;

  uniqueLeaderCandidateIds: string[];
  leaderFrequency: Record<string, number>;

  policySensitive: boolean;
  marketSensitive: boolean;
  dataAvailabilitySensitive: boolean;
  leaderStable: boolean;

  scoreCalculated: true;
  activationPerformed: false;
  selectedProtocolIdChanged: false;
  updatesLiveRecommendations: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  blockers: string[];
  warnings: string[];
  notes: string[];
}

/* ------------------------------------------------------------------ *
 * Historical snapshot analysis.
 * ------------------------------------------------------------------ */
export interface SolStakingHistoricalSensitivityInput {
  snapshotId: string;
  cacheGeneratedAt: string;
  checkedAt: string;
  normalizedSet: NormalizedSolStakingCandidateSet;
}

export interface SolStakingHistoricalSensitivityAnalysis {
  validSnapshotCount: number;
  invalidSnapshotCount: number;
  firstSnapshotAt?: string;
  lastSnapshotAt?: string;
  historySpanHours: number;

  leaderPerSnapshot: Record<string, string | undefined>;
  leaderFrequency: Record<string, number>;
  sameLeaderAsBaselineCount: number;
  historicalLeaderRetentionRate?: number;

  scoreMargins: number[];
  sourceErrorSnapshotCount: number;
  staleSnapshotCount: number;

  historyRequirementsPass: boolean;
  blockers: string[];
  notes: string[];
}

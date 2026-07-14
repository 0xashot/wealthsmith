/**
 * solStakingLeaderExplanationTypes — Step 14Z. The deterministic, cross-candidate
 * "Why this protocol currently leads" model. It compares the current comparison LEADER against
 * the RUNNER-UP on the four SCORED Step 14W dimensions only (reviewed risk, 30-day APY, current
 * APY, APY consistency), using the exact existing raw values, normalized scores, weights, and
 * weighted contributions — never recalculating the ranking and never generating an extra score.
 *
 * It never uses non-scored dimensions (TVL, delegated stake, fees, validator commission, direct
 * unstake fee, token model, liquidity, exit mechanics) as ranking reasons, and never uses
 * best / safest / guaranteed / risk-free / winner / recommended / "selected" copy.
 */
export type SolStakingLeaderExplanationDimensionKey = "reviewed_risk" | "apy_30d" | "current_apy" | "apy_consistency";

export interface SolStakingLeaderExplanationDimension {
  dimension: SolStakingLeaderExplanationDimensionKey;
  label: string;

  leaderRawValue: number;
  runnerUpRawValue?: number;

  leaderNormalizedScore: number;
  runnerUpNormalizedScore?: number;

  weight: number;

  leaderContribution: number;
  runnerUpContribution?: number;

  leaderAdvantageContribution?: number;

  leaderPerformsBetter: boolean;
  leaderPerformsWorse: boolean;
  approximatelyEqual: boolean;

  explanation: string;
  usedInScore: true;
}

export interface SolStakingLeaderExplanation {
  leaderCandidateId: string;
  leaderProtocolName: string;

  runnerUpCandidateId?: string;
  runnerUpProtocolName?: string;

  leaderScore: number;
  runnerUpScore?: number;
  scoreDifference?: number;

  strongestAdvantages: SolStakingLeaderExplanationDimension[];
  tradeOffs: SolStakingLeaderExplanationDimension[];
  approximatelyEqualDimensions: SolStakingLeaderExplanationDimension[];

  compactSummary: string;
  comparisonDisclosure: string;

  deterministic: true;
  aiGenerated: false;
}

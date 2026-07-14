/**
 * solStakingLeaderExplanation — Step 14Z. Builds the deterministic "Why this protocol currently
 * leads" explanation by comparing the leader against the runner-up on the four scored Step 14W
 * dimensions. It reads the EXACT values from the Step 14Y presentation (which itself carries the
 * exact Step 14W numbers) — it never recalculates the ranking, never invents a score, and never
 * uses non-scored dimensions as reasons.
 */
import type { SolStakingSelectorPresentation, SolStakingProtocolPresentationCandidate } from "./solStakingSelectorPresentationTypes";
import type {
  SolStakingLeaderExplanation,
  SolStakingLeaderExplanationDimension,
  SolStakingLeaderExplanationDimensionKey,
} from "./solStakingLeaderExplanationTypes";

export const SOL_STAKING_LEADER_EXPLANATION_EXISTS = true;
/** Contribution difference within this epsilon is "approximately equal" (not a material advantage). */
export const SOL_STAKING_LEADER_EXPLANATION_EPSILON = 0.01;
/** A total-score gap below this is "close" for the compact summary. */
export const SOL_STAKING_LEADER_EXPLANATION_CLOSE_THRESHOLD = 0.1;
/**
 * Strict float tolerance for the internal RECONCILIATION invariant: the four contribution
 * differences must sum to the leader-minus-runner-up comparison-score difference. This is not a
 * product threshold — it only guards floating-point noise.
 */
export const SOL_STAKING_LEADER_EXPLANATION_RECONCILIATION_TOLERANCE = 1e-9;

/** Canonical dimension order — the final tie-break for advantage/trade-off sorting. */
const DIMENSION_ORDER: SolStakingLeaderExplanationDimensionKey[] = ["reviewed_risk", "apy_30d", "current_apy", "apy_consistency"];

const DIMENSION_LABEL: Record<SolStakingLeaderExplanationDimensionKey, string> = {
  reviewed_risk: "Reviewed protocol risk",
  apy_30d: "30-day APY",
  current_apy: "Current APY",
  apy_consistency: "APY consistency",
};

const ADVANTAGE_PHRASE: Record<SolStakingLeaderExplanationDimensionKey, string> = {
  reviewed_risk: "Stronger reviewed protocol risk",
  apy_30d: "Stronger recent (30-day) yield",
  current_apy: "Stronger current yield",
  apy_consistency: "Stronger APY consistency",
};

const TRADEOFF_PHRASE: Record<SolStakingLeaderExplanationDimensionKey, string> = {
  reviewed_risk: "its lower reviewed-risk contribution",
  apy_30d: "its lower 30-day-APY contribution",
  current_apy: "its lower current-APY contribution",
  apy_consistency: "its lower APY-consistency contribution",
};

interface DimAccess {
  raw: (c: SolStakingProtocolPresentationCandidate) => number;
  norm: (c: SolStakingProtocolPresentationCandidate) => number;
  weight: (c: SolStakingProtocolPresentationCandidate) => number;
  contribution: (c: SolStakingProtocolPresentationCandidate) => number;
}
const DIM_ACCESS: Record<SolStakingLeaderExplanationDimensionKey, DimAccess> = {
  reviewed_risk: { raw: (c) => c.reviewedRiskScore, norm: (c) => c.breakdown.reviewedRisk.normalizedScore, weight: (c) => c.breakdown.reviewedRisk.weight, contribution: (c) => c.breakdown.reviewedRisk.contribution },
  apy_30d: { raw: (c) => c.apy30dPct, norm: (c) => c.breakdown.apy30d.normalizedScore, weight: (c) => c.breakdown.apy30d.weight, contribution: (c) => c.breakdown.apy30d.contribution },
  current_apy: { raw: (c) => c.currentApyPct, norm: (c) => c.breakdown.currentApy.normalizedScore, weight: (c) => c.breakdown.currentApy.weight, contribution: (c) => c.breakdown.currentApy.contribution },
  apy_consistency: { raw: (c) => c.absoluteApyDeltaPctPoints, norm: (c) => c.breakdown.apyConsistency.normalizedScore, weight: (c) => c.breakdown.apyConsistency.weight, contribution: (c) => c.breakdown.apyConsistency.contribution },
};

function dimensionExplanation(
  dim: SolStakingLeaderExplanationDimensionKey,
  leaderName: string,
  runnerUpName: string,
  lRaw: number,
  ruRaw: number,
  weight: number,
  favored: "leader" | "runner_up" | "equal",
): string {
  const wpct = Math.round(weight * 100);
  const favoredName = favored === "leader" ? leaderName : favored === "runner_up" ? runnerUpName : "neither materially";
  const favorClause = favored === "equal" ? "the two are approximately equal on this dimension" : `this dimension currently favors ${favoredName}`;
  switch (dim) {
    case "reviewed_risk":
      return `${leaderName}'s reviewed risk score is ${lRaw}/10, while ${runnerUpName}'s is ${ruRaw}/10. Reviewed risk contributes ${wpct}% of the comparison score, so ${favorClause}.`;
    case "apy_30d":
      return `${leaderName} has a ${lRaw}% 30-day APY compared with ${runnerUpName}'s ${ruRaw}%. This dimension contributes ${wpct}% of the comparison score, so ${favorClause}.`;
    case "current_apy":
      return `${leaderName}'s current APY is ${lRaw}%, compared with ${runnerUpName}'s ${ruRaw}%. This dimension contributes ${wpct}% of the comparison score, so ${favorClause}.`;
    case "apy_consistency":
      return `${leaderName}'s current APY differs from its 30-day APY by ${lRaw} percentage points, compared with ${ruRaw} for ${runnerUpName}. This dimension contributes ${wpct}% of the comparison score, so ${favorClause}.`;
  }
}

/**
 * Build the "Why this protocol currently leads" explanation from a presentation. Returns
 * undefined unless the presentation is available with both a leader and a runner-up. Deterministic.
 */
export function buildSolStakingLeaderComparisonExplanation(presentation: SolStakingSelectorPresentation): SolStakingLeaderExplanation | undefined {
  const leader = presentation.topProtocol;
  const runnerUp = presentation.runnerUp;
  if (presentation.status !== "available" || !leader || !runnerUp) return undefined;

  const eps = SOL_STAKING_LEADER_EXPLANATION_EPSILON;
  const dims: SolStakingLeaderExplanationDimension[] = DIMENSION_ORDER.map((dim) => {
    const a = DIM_ACCESS[dim];
    const lContribution = a.contribution(leader);
    const ruContribution = a.contribution(runnerUp);
    // Full-precision contribution difference from the EXACT Step 14W weighted contributions.
    // Not rounded here — rounding happens only at display. The advantage/trade-off classification
    // uses the product-level epsilon; the reconciliation invariant uses the exact values.
    const adv = lContribution - ruContribution;
    const leaderPerformsBetter = adv > eps;
    const leaderPerformsWorse = adv < -eps;
    const approximatelyEqual = Math.abs(adv) <= eps;
    const favored: "leader" | "runner_up" | "equal" = leaderPerformsBetter ? "leader" : leaderPerformsWorse ? "runner_up" : "equal";
    return {
      dimension: dim,
      label: DIMENSION_LABEL[dim],
      leaderRawValue: a.raw(leader),
      runnerUpRawValue: a.raw(runnerUp),
      leaderNormalizedScore: a.norm(leader),
      runnerUpNormalizedScore: a.norm(runnerUp),
      weight: a.weight(leader),
      leaderContribution: lContribution,
      runnerUpContribution: ruContribution,
      leaderAdvantageContribution: adv,
      leaderPerformsBetter,
      leaderPerformsWorse,
      approximatelyEqual,
      explanation: dimensionExplanation(dim, leader.protocolName, runnerUp.protocolName, a.raw(leader), a.raw(runnerUp), a.weight(leader), favored),
      usedInScore: true,
    };
  });

  const orderIndex = (d: SolStakingLeaderExplanationDimension) => DIMENSION_ORDER.indexOf(d.dimension);
  const strongestAdvantages = dims.filter((d) => d.leaderPerformsBetter).sort((x, y) => (y.leaderAdvantageContribution! - x.leaderAdvantageContribution!) || (orderIndex(x) - orderIndex(y)));
  const tradeOffs = dims.filter((d) => d.leaderPerformsWorse).sort((x, y) => (x.leaderAdvantageContribution! - y.leaderAdvantageContribution!) || (orderIndex(x) - orderIndex(y)));
  const approximatelyEqualDimensions = dims.filter((d) => d.approximatelyEqual);

  // Full-precision score difference from the EXACT Step 14W comparison totals (leader − runner-up).
  // Rounded only for display. By construction this equals the sum of the four contribution
  // differences within SOL_STAKING_LEADER_EXPLANATION_RECONCILIATION_TOLERANCE.
  const scoreDifference = leader.comparisonScore - runnerUp.comparisonScore;

  // Compact summary — derived from the actual largest advantage + most important trade-off.
  let compactSummary: string;
  if (Math.abs(scoreDifference) < SOL_STAKING_LEADER_EXPLANATION_CLOSE_THRESHOLD) {
    compactSummary = "The current comparison is close and may change with the next market refresh.";
  } else {
    const primaryAdvantage = strongestAdvantages[0];
    const primaryTradeOff = tradeOffs[0];
    const advPhrase = primaryAdvantage ? ADVANTAGE_PHRASE[primaryAdvantage.dimension] : "Its combined comparison contributions";
    if (primaryTradeOff) {
      compactSummary = `${advPhrase} currently outweighs ${TRADEOFF_PHRASE[primaryTradeOff.dimension]} under WealthSmith's safety-first comparison policy.`;
    } else {
      compactSummary = `${advPhrase} currently leads under WealthSmith's safety-first comparison policy.`;
    }
  }

  return {
    leaderCandidateId: leader.candidateId,
    leaderProtocolName: leader.protocolName,
    runnerUpCandidateId: runnerUp.candidateId,
    runnerUpProtocolName: runnerUp.protocolName,
    leaderScore: leader.comparisonScore,
    runnerUpScore: runnerUp.comparisonScore,
    scoreDifference,
    strongestAdvantages,
    tradeOffs,
    approximatelyEqualDimensions,
    compactSummary,
    comparisonDisclosure: "This comparison uses fresh market data and WealthSmith's reviewed protocol policy. The top protocol may change as yields and market conditions update.",
    deterministic: true,
    aiGenerated: false,
  };
}

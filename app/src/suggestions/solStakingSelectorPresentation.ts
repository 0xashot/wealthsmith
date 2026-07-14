/**
 * solStakingSelectorPresentation — Step 14Y. Builds the READ-ONLY, user-facing presentation of the
 * current Step 14W comparison leader ("Top protocol to review right now"). It consumes the EXACT
 * Step 14W ranked result — it never recalculates ranking, never introduces a hidden score, and
 * never changes the selected protocol. Copy is deterministic (never AI-generated) and never uses
 * best / safest / guaranteed / risk-free / winner / recommended.
 */
import type { SolStakingMarketCache } from "./solStakingMarketDataTypes";
import type { NormalizedSolStakingCandidateSet } from "./solStakingCandidateNormalizationTypes";
import type { SolStakingSelectorComparisonResult, SolStakingSelectorCandidateResult } from "./solStakingSelectorTypes";
import { evaluateSolStakingSelectorDisplayGate } from "./solStakingSelectorDisplayGate";
import { buildSolStakingLeaderComparisonExplanation } from "./solStakingLeaderExplanation";
import { JITOSOL_BETA_PROTOCOL_ID } from "./jitoSolBetaActivation";
import {
  SOL_STAKING_SELECTOR_PRESENTATION_SCHEMA_VERSION,
  type SolStakingLeaderExplanation,
  type SolStakingProtocolPresentationCandidate,
  type SolStakingSelectorPresentation,
} from "./solStakingSelectorPresentationTypes";

export const SOL_STAKING_SELECTOR_PRESENTATION_EXISTS = true;
export const SOL_STAKING_SELECTOR_PRESENTATION_ACTIVATION_PERFORMED = false;
export const SOL_STAKING_SELECTOR_PRESENTATION_UPDATES_SELECTED_PROTOCOL = false;

export interface BuildPresentationInput {
  marketCache?: SolStakingMarketCache;
  normalizedSet?: NormalizedSolStakingCandidateSet;
  comparisonResult?: SolStakingSelectorComparisonResult;
  checkedAt: string;
}

/** Deterministic "Updated YYYY-MM-DD HH:MM UTC" (no locale ambiguity). */
function formatUpdated(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `Updated ${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

function toPresentationCandidate(
  cr: SolStakingSelectorCandidateResult,
  normalized: NormalizedSolStakingCandidateSet,
  marketCacheGeneratedAt: string,
  comparisonGeneratedAt: string,
): SolStakingProtocolPresentationCandidate {
  const norm = normalized.candidates[cr.candidateId];
  const d = cr.dimensions;
  const adoption = norm.adoption;
  const feeCtx = [
    { label: "Annual management fee", ...(cr.context.annualManagementFee.value != null ? { value: cr.context.annualManagementFee.value as number } : {}), unit: "pct" as const, usedInScore: false as const },
    { label: "Validator commission", ...(cr.context.validatorCommission.value != null ? { value: cr.context.validatorCommission.value as number } : {}), unit: "pct" as const, usedInScore: false as const },
    { label: "Direct unstake fee", ...(cr.context.directUnstakeFee.value != null ? { value: cr.context.directUnstakeFee.value as number } : {}), unit: "pct" as const, usedInScore: false as const },
  ];
  return {
    candidateId: cr.candidateId,
    protocolName: cr.protocolName,
    assetSymbol: cr.assetSymbol,
    candidateType: cr.candidateType,
    rank: cr.rank,
    comparisonScore: cr.totalScore,
    reviewedRiskScore: d.reviewedRiskScore.rawValue,
    currentApyPct: d.currentApy.rawValue,
    apy30dPct: d.apy30d.rawValue,
    absoluteApyDeltaPctPoints: d.apyStability.rawValue,
    currentlyLeadsComparison: cr.rank === 1,
    currentRunnerUp: cr.rank === 2,
    breakdown: {
      reviewedRisk: { rawScore: d.reviewedRiskScore.rawValue, normalizedScore: d.reviewedRiskScore.normalizedScore, weight: d.reviewedRiskScore.weight, contribution: d.reviewedRiskScore.weightedContribution },
      apy30d: { rawPct: d.apy30d.rawValue, normalizedScore: d.apy30d.normalizedScore, weight: d.apy30d.weight, contribution: d.apy30d.weightedContribution },
      currentApy: { rawPct: d.currentApy.rawValue, normalizedScore: d.currentApy.normalizedScore, weight: d.currentApy.weight, contribution: d.currentApy.weightedContribution },
      apyConsistency: { absoluteDeltaPctPoints: d.apyStability.rawValue, normalizedScore: d.apyStability.normalizedScore, weight: d.apyStability.weight, contribution: d.apyStability.weightedContribution },
    },
    adoptionDisplay: {
      label: adoption.metricKind === "tvl_usd" ? "TVL" : "Delegated stake",
      value: (adoption.metric.value as number) ?? 0,
      unit: adoption.metricKind === "tvl_usd" ? "usd" : "sol",
      comparisonScope: adoption.metricKind === "tvl_usd" ? "lst_only" : "native_only",
      usedInScore: false,
    },
    feeContext: feeCtx,
    exitContext: {
      label: norm.exit.liquidityClass === "liquid_token" ? "Liquid token exit" : "Native stake-account exit",
      description: norm.exit.delayDescription.value ?? norm.exit.delayModel,
      usedInScore: false,
    },
    tokenModelLabel: cr.candidateType === "liquid_staking_token" ? "Liquid staking token" : "Native stake account",
    sourceFreshness: { marketCacheGeneratedAt, comparisonGeneratedAt, status: "fresh" },
    selectedByProtocolLogic: false,
    currentWinner: false,
    activated: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

const COPY = {
  available: {
    headline: "Top protocol to review right now",
    disclosure: "This may change as market data refreshes. Review only — WealthSmith will not move funds for you.",
  },
  stale: {
    headline: "Protocol comparison is being refreshed",
    supporting: "We'll show the current top protocol once fresh market data is available.",
  },
  unavailable: {
    headline: "Current protocol comparison is unavailable",
    supporting: "Protocol options remain available to review without a current top designation.",
  },
  insufficient: {
    headline: "More market data is needed",
    supporting: "We need at least two fresh eligible protocols before showing a current top protocol.",
  },
} as const;

/**
 * Build the read-only presentation. Evaluates the display gate first; only when `available` does it
 * surface a dynamic top protocol / runner-up / ranking (consuming the exact Step 14W order).
 */
export function buildSolStakingSelectorPresentation(input: BuildPresentationInput): SolStakingSelectorPresentation {
  const checkedAt = input.checkedAt;
  const gate = evaluateSolStakingSelectorDisplayGate(input);
  const currentUnderlyingSelectedProtocolId = JITOSOL_BETA_PROTOCOL_ID;

  const shell = (extra: Partial<SolStakingSelectorPresentation>): SolStakingSelectorPresentation => ({
    schemaVersion: SOL_STAKING_SELECTOR_PRESENTATION_SCHEMA_VERSION,
    generatedAt: checkedAt,
    checkedAt,
    status: gate.status,
    displayGate: gate,
    headline: "",
    supportingText: "",
    freshnessText: "",
    disclosureText: "Review only — WealthSmith will not move funds for you.",
    rankedCandidates: [],
    currentUnderlyingSelectedProtocolId,
    leaderDiffersFromUnderlyingSelection: false,
    topProtocolIsDynamic: true,
    topProtocolMayChange: true,
    activationPerformed: false,
    selectedProtocolIdChanged: false,
    topPickChanged: false,
    engineOrderingChanged: false,
    updatesLiveRecommendations: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    blockers: gate.blockers,
    warnings: gate.warnings,
    ...extra,
  });

  if (gate.status !== "available" || !input.marketCache || !input.normalizedSet || !input.comparisonResult) {
    if (gate.status === "stale") return shell({ headline: COPY.stale.headline, supportingText: COPY.stale.supporting });
    if (gate.status === "insufficient_candidates") return shell({ headline: COPY.insufficient.headline, supportingText: COPY.insufficient.supporting });
    // unavailable OR invalid.
    return shell({ headline: COPY.unavailable.headline, supportingText: COPY.unavailable.supporting });
  }

  const cmp = input.comparisonResult;
  const normalized = input.normalizedSet;
  const marketCacheGeneratedAt = input.marketCache.generatedAt;
  const comparisonGeneratedAt = cmp.generatedAt;

  const ranked = cmp.rankedCandidateIds.map((id) => toPresentationCandidate(cmp.candidateResults[id], normalized, marketCacheGeneratedAt, comparisonGeneratedAt));
  const topProtocol = ranked[0];
  const runnerUp = ranked[1];

  const built = shell({
    headline: COPY.available.headline,
    supportingText: `${topProtocol.protocolName} currently leads WealthSmith's comparison based on fresh market data and the reviewed protocol policy.`,
    freshnessText: formatUpdated(comparisonGeneratedAt),
    disclosureText: COPY.available.disclosure,
    topProtocol,
    runnerUp,
    rankedCandidates: ranked,
    leaderDiffersFromUnderlyingSelection: topProtocol.candidateId !== currentUnderlyingSelectedProtocolId,
  });
  // Attach the deterministic leader-vs-runner-up explanation (Step 14Z).
  built.leaderExplanation = buildSolStakingLeaderComparisonExplanation(built);
  return built;
}

/**
 * Deterministic "why it leads" content — ONLY the four scored dimensions, with exact weights and
 * contributions. Never invents reasons; never presents non-scored adoption/fees/exit as reasons.
 */
export function buildSolStakingLeaderExplanation(presentation: SolStakingSelectorPresentation): SolStakingLeaderExplanation | undefined {
  const top = presentation.topProtocol;
  if (!top) return undefined;
  const b = top.breakdown;
  const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;
  const items: SolStakingLeaderExplanation["items"] = [
    { dimension: "reviewed_risk", label: "Reviewed risk", rawValue: `${top.reviewedRiskScore}/10`, weightPct: Math.round(b.reviewedRisk.weight * 100), contribution: b.reviewedRisk.contribution, explanation: `Reviewed risk — ${top.reviewedRiskScore}/10, weighted at ${pct(b.reviewedRisk.weight)}.` },
    { dimension: "apy_30d", label: "30-day APY", rawValue: `${top.apy30dPct}%`, weightPct: Math.round(b.apy30d.weight * 100), contribution: b.apy30d.contribution, explanation: `30-day APY — ${top.apy30dPct}%, weighted at ${pct(b.apy30d.weight)}.` },
    { dimension: "current_apy", label: "Current APY", rawValue: `${top.currentApyPct}%`, weightPct: Math.round(b.currentApy.weight * 100), contribution: b.currentApy.contribution, explanation: `Current APY — ${top.currentApyPct}%, weighted at ${pct(b.currentApy.weight)}.` },
    { dimension: "apy_consistency", label: "APY consistency", rawValue: `${top.absoluteApyDeltaPctPoints} pct pts`, weightPct: Math.round(b.apyConsistency.weight * 100), contribution: b.apyConsistency.contribution, explanation: `APY consistency — ${top.absoluteApyDeltaPctPoints} percentage-point difference, weighted at ${pct(b.apyConsistency.weight)}.` },
  ];
  return {
    protocolName: top.protocolName,
    items,
    summary: `${top.protocolName} can lead even without the highest reviewed risk score, because the comparison policy combines reviewed risk with 30-day APY, current APY, and APY consistency.`,
    usesOnlyScoredDimensions: true,
  };
}

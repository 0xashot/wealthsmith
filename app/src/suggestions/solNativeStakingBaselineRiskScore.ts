/**
 * solNativeStakingBaselineRiskScore — Step 14P. The risk-score module for the Native SOL /
 * Jupiter Native Stake BASELINE candidate, adapted from the shared draft rubric.
 *
 * OUTCOME IN 14P: NO SCORE ASSIGNED. Native-staking evidence is INCOMPLETE (the three
 * market categories — delegated stake / current APY / 30-day APY — are missing because
 * Jupiter does not publish them and they must not be invented or reused from JupSOL). So
 * `readyForRiskGate` is false and `getNativeStakingBaselineRiskScoreAssignment` returns
 * `null`. This module still defines the native-adapted rubric mapping and the qualitative
 * risk rationale (which is knowable independent of the missing market data), so a score can
 * be assigned deterministically once the market evidence is completed in a later step.
 *
 * SCORE ASSIGNMENT ONLY (never approves, selects, replaces Jito, enables the disabled
 * selector comparison, updates live recommendations, or enables transactions/signatures).
 * This is a native stake account, NOT an LST and NOT JupSOL.
 */
import {
  getProtocolRiskRubricDimensions,
  PROTOCOL_RISK_RUBRIC_VERSION,
  type ProtocolRiskRubricDimensionId,
} from "./protocolRiskRubric";
import { summarizeNativeSolStakeEvidence, type NativeStakingEvidenceOptions } from "./solNativeStakingBaselineEvidence";

export const SOL_NATIVE_STAKING_BASELINE_RISK_SCORE_EXISTS = true;
export const SOL_NATIVE_STAKING_BASELINE_RISK_SCORE_IS_LST = false;
export const SOL_NATIVE_STAKING_BASELINE_RISK_SCORE_APPROVES_READ_ONLY_RECOMMENDATION = false;
export const SOL_NATIVE_STAKING_BASELINE_RISK_SCORE_ENABLES_SELECTOR_COMPARISON = false;
export const SOL_NATIVE_STAKING_BASELINE_RISK_SCORE_UPDATES_LIVE_RECOMMENDATIONS = false;
export const SOL_NATIVE_STAKING_BASELINE_RISK_SCORE_ENABLES_TRANSACTIONS = false;
export const SOL_NATIVE_STAKING_BASELINE_RISK_SCORE_REQUIRES_WALLET_SIGNATURE = false;
export const SOL_NATIVE_STAKING_BASELINE_RISK_SCORE_REPLACES_JITO = false;

export type NativeStakingReviewerRole = "founder" | "product" | "risk" | "engineering" | "compliance";

/**
 * The native-staking rubric, mapped onto the shared draft rubric weights so the weighted
 * total is comparable to the LST candidates. The weights come from `protocolRiskRubric.ts`
 * (25/20/15/15/15/10 = 100); only the labels are adapted for native staking.
 */
export interface NativeStakingRubricDimension {
  id: ProtocolRiskRubricDimensionId;
  nativeLabel: string;
  weight: number;
}

export function getNativeStakingRubricDimensions(): NativeStakingRubricDimension[] {
  const LABELS: Record<ProtocolRiskRubricDimensionId, string> = {
    audit_security: "Security / custody / protocol model",
    maturity: "Maturity / adoption",
    tvl_adoption: "Delegated stake / validator adoption",
    withdrawal_fee_transparency: "Withdrawal / fee transparency",
    operational_dependency_risk: "Operational / validator dependency",
    incident_history: "Incident history",
  };
  return getProtocolRiskRubricDimensions().map((d) => ({ id: d.id, nativeLabel: LABELS[d.id], weight: d.weight }));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Deterministic weighted score (0–10) from the rubric weights, for a full dimension set. */
export function computeNativeStakingWeightedScore(dimensionScores: Record<ProtocolRiskRubricDimensionId, number>): number {
  const dims = getProtocolRiskRubricDimensions();
  const totalWeight = dims.reduce((s, d) => s + d.weight, 0);
  const weighted = dims.reduce((s, d) => s + (dimensionScores[d.id] ?? 0) * d.weight, 0) / totalWeight;
  return round2(weighted);
}

/**
 * Qualitative native-staking risk rationale. Knowable independent of the missing market
 * data, so it is defined now (required by spec): it states native staking is NOT an LST,
 * and includes validator/delegation risk, epoch-based unstake timing, and lower DeFi
 * composability than LSTs.
 */
export const NATIVE_STAKING_RISK_RATIONALE = {
  isNotLiquidStakingToken: true,
  notLstStatement: "This is native SOL staking (a native Solana stake account of delegated SOL), NOT a liquid staking token — it is not JupSOL/mSOL/JupSOL/bSOL/INF and has no SPL LST mint.",
  positives: [
    "Non-custodial: SOL is staked on-chain directly from your wallet and you own the native stake account (no LST smart-contract wrapper).",
    "Security rests on the base Solana staking program rather than an LST token contract, so there is no LST token-contract exploit surface; Solana currently has no stake slashing.",
    "Transparent, simple fee model: a 5% validator commission on inflation rewards (0% MEV) and no separate management/performance fee.",
  ],
  risks: [
    "Validator / delegation exposure: stake is delegated to a single validator (the Jupiter validator), so validator performance, downtime, or a future commission change affects rewards.",
    "Epoch-based unstake timing: exiting requires deactivating the stake account and waiting until the end of the current epoch (~2 days), during which no rewards accrue — there is no instant liquidity.",
    "Lower DeFi composability than LSTs: a native stake account is not a liquid token (unlike an LST), even though Jupiter Lend now accepts native stake as collateral.",
    "It is NOT an LST: there is no LST liquidity token and no instant-swap exit path.",
  ],
  limitations: [
    "This is an internal review input, not an approval; native staking is not selected, does not replace JitoSOL, and moves no funds.",
    "Market/adoption evidence (delegated stake, current APY, 30-day APY) is not yet available, so no risk score is assigned in this step.",
  ],
} as const;

export interface NativeStakingBaselineRiskScoreAssignment {
  protocolId: "jupiter_native_stake";
  protocolName: "Jupiter Native Stake";
  assetSymbol: "SOL";
  candidateType: "native_staking";
  isLiquidStakingToken: false;

  score: number;
  scoreStatus: "assigned_for_review";
  scoreScale: "0_to_10";

  readyForRiskGate: boolean;
  evidenceFresh: boolean;

  assignedAt: string;
  assignedBy: string;
  reviewerRole: NativeStakingReviewerRole;

  rubricVersion: string;

  dimensionScores: Record<ProtocolRiskRubricDimensionId, number>;
  weightedScore: number;

  rationale: typeof NATIVE_STAKING_RISK_RATIONALE;

  approvedForReadOnlyRecommendation: false;
  selectedByProtocolLogic: false;
  currentWinner: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

export interface NativeStakingBaselineRiskScoreStatus {
  protocolId: "jupiter_native_stake";
  isLiquidStakingToken: false;
  scoreAssigned: boolean;
  score?: number;
  readyForRiskGate: boolean;
  evidenceFresh: boolean;
  approvedForReadOnlyRecommendation: false;
  selectedByProtocolLogic: false;
  updatesLiveRecommendations: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
  blockers: string[];
}

/**
 * The gate for native-staking score assignment. A score may be assigned only when the
 * evidence is complete AND fresh (`readyForRiskGate`). In 14P the market categories are
 * missing, so this reports `scoreAssigned: false` with the evidence blockers. Never
 * approves or selects.
 */
export function evaluateNativeStakingBaselineRiskScoreAssignmentStatus(options: NativeStakingEvidenceOptions = {}): NativeStakingBaselineRiskScoreStatus {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const summary = summarizeNativeSolStakeEvidence({ checkedAt });
  const readyForRiskGate = summary.readyForRiskGate;
  const evidenceFresh = summary.allEvidenceFresh;

  const blockers = [...summary.blockers];
  if (!readyForRiskGate && !blockers.includes("not_ready_for_risk_gate")) blockers.push("not_ready_for_risk_gate");

  return {
    protocolId: "jupiter_native_stake",
    isLiquidStakingToken: false,
    scoreAssigned: false, // never assigned while evidence is incomplete
    readyForRiskGate,
    evidenceFresh,
    approvedForReadOnlyRecommendation: false,
    selectedByProtocolLogic: false,
    updatesLiveRecommendations: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    blockers,
  };
}

/**
 * The native-staking risk-score assignment, or `null` when evidence is not fresh / not
 * `readyForRiskGate`. In 14P it always returns `null` (market evidence incomplete). Because
 * no market-dependent dimension scores can be finalized without that evidence, none are
 * fabricated here — the score is deferred to a later step where the market data is recorded.
 */
export function getNativeStakingBaselineRiskScoreAssignment(options: NativeStakingEvidenceOptions = {}): NativeStakingBaselineRiskScoreAssignment | null {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const summary = summarizeNativeSolStakeEvidence({ checkedAt });
  if (!summary.readyForRiskGate) return null;
  // Unreachable in 14P (evidence incomplete). A future step that completes the market
  // evidence will supply real dimension scores and assign a deterministic weighted score
  // via `computeNativeStakingWeightedScore`.
  return null;
}

/** Void reference so `PROTOCOL_RISK_RUBRIC_VERSION` import is available for future scoring. */
export const NATIVE_STAKING_RUBRIC_VERSION = PROTOCOL_RISK_RUBRIC_VERSION;

/**
 * solStakingCandidateStaticFacts — Step 14V. A single READ-ONLY adapter that surfaces existing
 * REVIEWED candidate facts (risk score, approval, fees, exit mechanics, operational/incident
 * summaries, token model) through one shape — WITHOUT duplicating, recalculating, or mutating
 * any of them. These are point-in-time reviewed facts, distinct from the live market cache.
 *
 * It reads from the existing modules only: the LST fresh-evidence arrays, the per-candidate
 * risk-score modules, the approval flags, the candidate registry, and the JitoSOL beta module.
 * It never creates a new risk score, never copies a total when an exported value exists, never
 * changes evidence or approval, and never assumes a missing value (missing stays undefined).
 *
 * Fee rule: each fee is preserved SEPARATELY — validator commission is never added to a
 * management fee, no synthetic "total fee" is created, and a direct-unstake fee is never
 * treated as an annual cost. Exit rule: epoch-based / variable timing keeps its descriptive
 * text; no fixed hours are invented. Native staking stays SOL / native_staking /
 * native_stake_account / isLiquidStakingToken false / splTokenMint null, and JupSOL stays
 * separate from Jupiter Native Stake. INF stays blocked.
 */
import { SOL_STAKING_MARKET_CANDIDATE_IDS, SOL_STAKING_MARKET_CANDIDATE_ORDER } from "./solStakingMarketDataTypes";
import { getSolLiquidStakingCandidateById } from "./solLiquidStakingCandidateRegistry";
import {
  getJitoSolBetaMarketData,
  JITOSOL_BETA_APPROVED_RISK_SCORE,
  JITOSOL_BETA_READ_ONLY_RECOMMENDATION_ENABLED,
} from "./jitoSolBetaActivation";
import {
  MARINADE_MSOL_FRESH_EVIDENCE_INPUTS,
  JUPITER_JUPSOL_FRESH_EVIDENCE_INPUTS,
  BLAZESTAKE_BSOL_FRESH_EVIDENCE_INPUTS,
  SANCTUM_INF_FRESH_EVIDENCE_INPUTS,
} from "./solLiquidStakingFreshEvidenceRecords";
import type { SolLstFreshEvidenceInput } from "./solLiquidStakingFreshEvidenceIntake";
import { NATIVE_SOL_STAKE_EVIDENCE_INPUTS } from "./solNativeStakingBaselineEvidence";
import { getMsolRiskScoreAssignment } from "./solLiquidStakingMsolRiskScore";
import { getJupsolRiskScoreAssignment } from "./solLiquidStakingJupsolRiskScore";
import { getBsolRiskScoreAssignment } from "./solLiquidStakingBsolRiskScore";
import { getInfRiskScoreAssignment } from "./solLiquidStakingInfRiskScore";
import { computeNativeStakingScore } from "./solNativeStakingBaselineRiskScore";
import { SOL_LST_MSOL_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE, MSOL_READ_ONLY_APPROVAL_MIN_RISK_SCORE } from "./solLiquidStakingMsolReadOnlyApproval";
import { SOL_LST_JUPSOL_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE } from "./solLiquidStakingJupsolReadOnlyApproval";
import { SOL_LST_BSOL_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE } from "./solLiquidStakingBsolReadOnlyApproval";
import { SOL_LST_INF_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE } from "./solLiquidStakingInfReadOnlyApproval";
import { SOL_NATIVE_STAKING_BASELINE_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE } from "./solNativeStakingBaselineReadOnlyApproval";

export const SOL_STAKING_STATIC_FACTS_EXISTS = true;
export const SOL_STAKING_STATIC_FACTS_RECALCULATES_RISK = false;
export const SOL_STAKING_STATIC_FACTS_MUTATES_APPROVAL = false;
export const SOL_STAKING_STATIC_FACTS_MUTATES_EVIDENCE = false;

/** The read-only review threshold (shared across the approval modules). */
export const SOL_STAKING_REVIEW_THRESHOLD = MSOL_READ_ONLY_APPROVAL_MIN_RISK_SCORE; // 7

/**
 * An anchor inside the reviewed-evidence freshness window so the already-assigned reviewed
 * risk scores read deterministically regardless of the live-market clock. Reviewed facts are
 * point-in-time; this reads them at their review era, it does NOT recalculate them.
 */
export const SOL_STAKING_REVIEW_FACTS_ANCHOR = "2026-07-14T02:50:00Z";

export type SolStakingStaticCandidateType = "liquid_staking_token" | "native_staking";
export type SolStakingStaticTokenModel = "spl_liquid_staking_token" | "native_stake_account";
export type SolStakingStaticDelayModel = "market_or_instant" | "epoch_based" | "variable" | "unknown";

export interface SolStakingCandidateStaticFacts {
  candidateId: string;
  protocolName: string;
  assetSymbol: string;
  candidateType: SolStakingStaticCandidateType;
  tokenModel: SolStakingStaticTokenModel;

  isLiquidStakingToken: boolean;
  splTokenMint: string | null;

  reviewedRiskScore?: number;
  approvedForReadOnlyReview: boolean;
  blockedByRiskApproval: boolean;

  annualManagementFeePct?: number;
  validatorCommissionPct?: number;
  directUnstakeFeePct?: number;

  immediateExitAvailable?: boolean;
  delayedExitAvailable?: boolean;
  delayModel: SolStakingStaticDelayModel;
  delayDescription?: string;

  operationalRiskSummary?: string;
  incidentSummary?: string;

  sourceModules: string[];
  notes: string[];
}

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.length > 0 ? v : undefined);

/** Read one reviewed evidence value by category from a candidate's fresh-evidence array. */
function evidenceVal(inputs: SolLstFreshEvidenceInput[], protocolId: string, category: string): unknown {
  return inputs.find((r) => r.protocolId === protocolId && r.category === category)?.value;
}

interface LstStaticArgs {
  candidateId: string;
  protocolName: string;
  assetSymbol: string;
  evidence: SolLstFreshEvidenceInput[];
  reviewedRiskScore?: number;
  approved: boolean;
  sourceModule: string;
}

/** Build LST static facts from reviewed evidence + the reviewed score. */
function lstStaticFacts(a: LstStaticArgs): SolStakingCandidateStaticFacts {
  const base = getSolLiquidStakingCandidateById(a.candidateId);
  const v = (cat: string) => evidenceVal(a.evidence, a.candidateId, cat);
  return {
    candidateId: a.candidateId,
    protocolName: a.protocolName,
    assetSymbol: a.assetSymbol,
    candidateType: "liquid_staking_token",
    tokenModel: "spl_liquid_staking_token",
    isLiquidStakingToken: true,
    splTokenMint: base?.mint ?? null,
    ...(a.reviewedRiskScore != null ? { reviewedRiskScore: a.reviewedRiskScore } : {}),
    approvedForReadOnlyReview: a.approved,
    blockedByRiskApproval: !a.approved,
    ...(num(v("annual_management_fee")) != null ? { annualManagementFeePct: num(v("annual_management_fee")) } : {}),
    // validatorCommissionPct intentionally omitted for LSTs (not a user-facing native commission).
    ...(num(v("direct_unstake_fee")) != null ? { directUnstakeFeePct: num(v("direct_unstake_fee")) } : {}),
    // Every reviewed LST documents an instant market/LP exit route + a delayed direct path.
    immediateExitAvailable: true,
    delayedExitAvailable: true,
    delayModel: "market_or_instant",
    ...(str(v("direct_unstake_time")) != null ? { delayDescription: str(v("direct_unstake_time")) } : {}),
    ...(str(v("operational_risk")) != null ? { operationalRiskSummary: str(v("operational_risk")) } : {}),
    ...(str(v("incident_review")) != null ? { incidentSummary: str(v("incident_review")) } : {}),
    sourceModules: [a.sourceModule, "solLiquidStakingCandidateRegistry"],
    notes: ["LST reviewed facts. TVL/APY live values come from the market cache, not from these reviewed evidence values."],
  };
}

function jitoStaticFacts(): SolStakingCandidateStaticFacts {
  const md = getJitoSolBetaMarketData();
  const base = getSolLiquidStakingCandidateById(SOL_STAKING_MARKET_CANDIDATE_IDS.jito);
  return {
    candidateId: SOL_STAKING_MARKET_CANDIDATE_IDS.jito,
    protocolName: "Jito",
    assetSymbol: "JitoSOL",
    candidateType: "liquid_staking_token",
    tokenModel: "spl_liquid_staking_token",
    isLiquidStakingToken: true,
    splTokenMint: base?.mint ?? null,
    reviewedRiskScore: JITOSOL_BETA_APPROVED_RISK_SCORE,
    approvedForReadOnlyReview: JITOSOL_BETA_READ_ONLY_RECOMMENDATION_ENABLED,
    blockedByRiskApproval: false,
    annualManagementFeePct: md.annualManagementFeePct,
    directUnstakeFeePct: md.directUnstakeFeePct,
    immediateExitAvailable: true,
    delayedExitAvailable: true,
    delayModel: "market_or_instant",
    delayDescription: `Delayed direct unstake takes approximately ${md.directUnstakeTimeHours} hours; JitoSOL is also a liquid token with an instant market/DEX swap route.`,
    sourceModules: ["jitoSolBetaActivation", "solLiquidStakingCandidateRegistry"],
    notes: ["JitoSOL is the reviewed, selected read-only beta. TVL/APY live values come from the market cache."],
  };
}

function nativeStaticFacts(): SolStakingCandidateStaticFacts {
  const v = (cat: string) => evidenceVal(NATIVE_SOL_STAKE_EVIDENCE_INPUTS as unknown as SolLstFreshEvidenceInput[], "jupiter_native_stake", cat);
  return {
    candidateId: SOL_STAKING_MARKET_CANDIDATE_IDS.jupiterNativeStake,
    protocolName: "Jupiter Native Stake",
    assetSymbol: "SOL",
    candidateType: "native_staking",
    tokenModel: "native_stake_account",
    isLiquidStakingToken: false,
    splTokenMint: null,
    reviewedRiskScore: computeNativeStakingScore(),
    approvedForReadOnlyReview: SOL_NATIVE_STAKING_BASELINE_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE,
    blockedByRiskApproval: !SOL_NATIVE_STAKING_BASELINE_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE,
    ...(num(v("annual_management_fee")) != null ? { annualManagementFeePct: num(v("annual_management_fee")) } : {}),
    ...(num(v("validator_commission")) != null ? { validatorCommissionPct: num(v("validator_commission")) } : {}),
    // No native direct-unstake fee category exists — left undefined, not invented.
    immediateExitAvailable: false, // native staking has no instant liquidity route
    delayedExitAvailable: true,
    delayModel: "epoch_based",
    ...(str(v("unstake_time")) != null ? { delayDescription: str(v("unstake_time")) } : {}),
    ...(str(v("operational_risk")) != null ? { operationalRiskSummary: str(v("operational_risk")) } : {}),
    ...(str(v("incident_review")) != null ? { incidentSummary: str(v("incident_review")) } : {}),
    sourceModules: ["solNativeStakingBaselineEvidence", "solNativeStakingBaselineRiskScore"],
    notes: ["Native SOL staking (not an LST, not JupSOL). Delegated stake live value comes from the market cache."],
  };
}

const ANCHOR = SOL_STAKING_REVIEW_FACTS_ANCHOR;

/** Reviewed static facts for one canonical candidate, or undefined for an unknown id. */
export function getSolStakingCandidateStaticFacts(candidateId: string): SolStakingCandidateStaticFacts | undefined {
  switch (candidateId) {
    case SOL_STAKING_MARKET_CANDIDATE_IDS.jito:
      return jitoStaticFacts();
    case SOL_STAKING_MARKET_CANDIDATE_IDS.jupiter:
      return lstStaticFacts({ candidateId: "jupiter", protocolName: "Jupiter", assetSymbol: "JupSOL", evidence: JUPITER_JUPSOL_FRESH_EVIDENCE_INPUTS, reviewedRiskScore: getJupsolRiskScoreAssignment({ checkedAt: ANCHOR })?.score, approved: SOL_LST_JUPSOL_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE, sourceModule: "solLiquidStakingJupsolRiskScore" });
    case SOL_STAKING_MARKET_CANDIDATE_IDS.marinade:
      return lstStaticFacts({ candidateId: "marinade", protocolName: "Marinade", assetSymbol: "mSOL", evidence: MARINADE_MSOL_FRESH_EVIDENCE_INPUTS, reviewedRiskScore: getMsolRiskScoreAssignment({ checkedAt: ANCHOR })?.score, approved: SOL_LST_MSOL_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE, sourceModule: "solLiquidStakingMsolRiskScore" });
    case SOL_STAKING_MARKET_CANDIDATE_IDS.blazestake:
      return lstStaticFacts({ candidateId: "blazestake", protocolName: "BlazeStake", assetSymbol: "bSOL", evidence: BLAZESTAKE_BSOL_FRESH_EVIDENCE_INPUTS, reviewedRiskScore: getBsolRiskScoreAssignment({ checkedAt: ANCHOR })?.score, approved: SOL_LST_BSOL_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE, sourceModule: "solLiquidStakingBsolRiskScore" });
    case SOL_STAKING_MARKET_CANDIDATE_IDS.jupiterNativeStake:
      return nativeStaticFacts();
    case SOL_STAKING_MARKET_CANDIDATE_IDS.sanctum:
      return lstStaticFacts({ candidateId: "sanctum", protocolName: "Sanctum", assetSymbol: "INF", evidence: SANCTUM_INF_FRESH_EVIDENCE_INPUTS, reviewedRiskScore: getInfRiskScoreAssignment({ checkedAt: ANCHOR })?.score, approved: SOL_LST_INF_READ_ONLY_APPROVAL_APPROVES_REVIEW_EXPOSURE, sourceModule: "solLiquidStakingInfRiskScore" });
    default:
      return undefined;
  }
}

/** All reviewed static facts, in canonical registry order. */
export function listSolStakingCandidateStaticFacts(): SolStakingCandidateStaticFacts[] {
  return SOL_STAKING_MARKET_CANDIDATE_ORDER
    .map((id) => getSolStakingCandidateStaticFacts(id))
    .filter((f): f is SolStakingCandidateStaticFacts => f != null);
}

/**
 * solLiquidStakingCandidateRegistry — Step 14A. A READ-ONLY, data-model-only
 * registry of the MVP SOL liquid-staking candidates and the data each still needs
 * before it could become eligible for an exact read-only recommendation.
 *
 * DATA MODEL ONLY. This does NOT change live selection: JitoSOL stays the only
 * approved read-only candidate; mSOL / JupSOL / bSOL / INF are STAGED (not
 * approved, no risk score, source re-verification required). Nothing here enables
 * multi-protocol selection, updates live recommendations, or enables a
 * transaction/signature. It is not imported by `stakingSuggestion` or any live/UI
 * file — only by docs and fixtures.
 *
 * HONESTY: no TVL/APY/fee/unstake/risk value is invented for staged candidates.
 * Reviewer-confirmed DefiLlama values exist in the non-production confirmation
 * ledger (`protocolSolLiquidStakingRealValueConfirmations.ts`), but they are NOT
 * carried in as verified here — staged market/mechanics stay `needs_review` until
 * Step 14B re-verifies them.
 */
import {
  JITOSOL_BETA_PROTOCOL_ID,
  JITOSOL_BETA_PROTOCOL_NAME,
  JITOSOL_BETA_LST_SYMBOL,
  JITOSOL_BETA_APPROVED_RISK_SCORE,
  JITOSOL_STAKING_EXTERNAL_URL,
  JITOSOL_EXTERNAL_LINK_LABEL,
  getJitoSolBetaMarketData,
} from "./jitoSolBetaActivation";

/* ------------------------------------------------------------------ *
 * Registry-level flags (all live-affecting capabilities OFF).
 * ------------------------------------------------------------------ */
export const SOL_LST_CANDIDATE_REGISTRY_EXISTS = true;
export const SOL_LST_CANDIDATE_REGISTRY_ENABLES_MULTI_PROTOCOL_SELECTION = false;
export const SOL_LST_CANDIDATE_REGISTRY_UPDATES_LIVE_RECOMMENDATIONS = false;
export const SOL_LST_CANDIDATE_REGISTRY_ENABLES_TRANSACTIONS = false;
export const SOL_LST_CANDIDATE_REGISTRY_REQUIRES_WALLET_SIGNATURE = false;

/* ------------------------------------------------------------------ *
 * Types.
 * ------------------------------------------------------------------ */
export type SolLstCandidateStatus =
  | "active_read_only_beta"
  | "staged_candidate"
  | "blocked"
  | "rejected";

export type SolLstCandidateApprovalStatus =
  | "approved_read_only"
  | "pending_review"
  | "missing_data"
  | "rejected";

export type SolLstCandidateDataStatus =
  | "verified"
  | "partially_verified"
  | "missing"
  | "stale"
  | "needs_review";

export type SolLstCandidateRiskScoreStatus = "approved" | "missing" | "needs_review" | "rejected";

export interface SolLstCandidateExternalReviewLink {
  label: string;
  url: string;
  enabled: boolean;
}

export interface SolLstCandidate {
  protocolId: string;
  protocolName: string;
  lstSymbol: string;
  mint?: string;
  status: SolLstCandidateStatus;
  approvalStatus: SolLstCandidateApprovalStatus;
  approvedForReadOnlyRecommendation: boolean;
  transactionsEnabled: false;
  walletSignaturesEnabled: false;
  autoExecutionEnabled: false;
  externalReviewLink?: SolLstCandidateExternalReviewLink;
  marketData: {
    tvlUsd?: number;
    apyPct?: number;
    apy30dPct?: number;
    sourceStatus: SolLstCandidateDataStatus;
    asOf?: string;
  };
  mechanics: {
    directUnstakeTimeHours?: number;
    directUnstakeFeePct?: number;
    annualManagementFeePct?: number;
    annualManagementFeeAppliesTo?: string;
    sourceStatus: SolLstCandidateDataStatus;
  };
  risk: {
    riskScore?: number;
    riskScoreStatus: SolLstCandidateRiskScoreStatus;
    rubricVersion?: string;
  };
  evidence: {
    auditSecurityStatus: SolLstCandidateDataStatus;
    operationalRiskStatus: SolLstCandidateDataStatus;
    incidentReviewStatus: SolLstCandidateDataStatus;
    sourceReverificationRequired: boolean;
  };
  blockers: string[];
}

/** Canonical public mints (verifiable on-chain; from the protocol registry). */
const MINTS = {
  JitoSOL: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
  mSOL: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  JupSOL: "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v",
  bSOL: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
} as const;

/** Every staged candidate carries these blockers until later steps clear them. */
const STAGED_BLOCKERS = [
  "source_reverification_required",
  "approved_risk_score_missing",
  "read_only_approval_missing",
] as const;

/* ------------------------------------------------------------------ *
 * The candidates.
 * ------------------------------------------------------------------ */

/** JitoSOL — the approved active read-only beta candidate (verified data, 13G/13I/13J). */
function jitoCandidate(): SolLstCandidate {
  const md = getJitoSolBetaMarketData();
  return {
    protocolId: JITOSOL_BETA_PROTOCOL_ID,
    protocolName: JITOSOL_BETA_PROTOCOL_NAME,
    lstSymbol: JITOSOL_BETA_LST_SYMBOL,
    mint: MINTS.JitoSOL,
    status: "active_read_only_beta",
    approvalStatus: "approved_read_only",
    approvedForReadOnlyRecommendation: true,
    transactionsEnabled: false,
    walletSignaturesEnabled: false,
    autoExecutionEnabled: false,
    externalReviewLink: { label: JITOSOL_EXTERNAL_LINK_LABEL, url: JITOSOL_STAKING_EXTERNAL_URL, enabled: true },
    marketData: {
      tvlUsd: md.tvlUsd,
      apyPct: md.apyPct,
      apy30dPct: md.apy30dPct,
      sourceStatus: "verified",
    },
    mechanics: {
      directUnstakeTimeHours: md.directUnstakeTimeHours,
      directUnstakeFeePct: md.directUnstakeFeePct,
      annualManagementFeePct: md.annualManagementFeePct,
      annualManagementFeeAppliesTo: md.annualManagementFeeAppliesTo,
      sourceStatus: "verified",
    },
    risk: {
      riskScore: JITOSOL_BETA_APPROVED_RISK_SCORE,
      riskScoreStatus: "approved",
    },
    evidence: {
      auditSecurityStatus: "verified",
      operationalRiskStatus: "verified",
      incidentReviewStatus: "verified",
      sourceReverificationRequired: false,
    },
    blockers: [],
  };
}

/**
 * A STAGED candidate. Conservative by construction: not approved, no risk score,
 * market/mechanics/evidence stay `needs_review`, and no value is invented. The
 * external review link records the known official URL but stays DISABLED (the
 * candidate is not approved and its page is not yet vetted as the exact review
 * surface). Values are omitted, not faked.
 */
function stagedCandidate(args: {
  protocolId: string;
  protocolName: string;
  lstSymbol: string;
  mint?: string;
  externalUrl?: string;
}): SolLstCandidate {
  return {
    protocolId: args.protocolId,
    protocolName: args.protocolName,
    lstSymbol: args.lstSymbol,
    ...(args.mint ? { mint: args.mint } : {}),
    status: "staged_candidate",
    approvalStatus: "pending_review",
    approvedForReadOnlyRecommendation: false,
    transactionsEnabled: false,
    walletSignaturesEnabled: false,
    autoExecutionEnabled: false,
    ...(args.externalUrl
      ? { externalReviewLink: { label: `Open ${args.protocolName} staking page`, url: args.externalUrl, enabled: false } }
      : {}),
    marketData: { sourceStatus: "needs_review" },
    mechanics: { sourceStatus: "needs_review" },
    risk: { riskScoreStatus: "missing" },
    evidence: {
      auditSecurityStatus: "needs_review",
      operationalRiskStatus: "needs_review",
      incidentReviewStatus: "needs_review",
      sourceReverificationRequired: true,
    },
    blockers: [...STAGED_BLOCKERS],
  };
}

/** The five MVP SOL liquid-staking candidates, in stable order. */
const CANDIDATES: SolLstCandidate[] = [
  jitoCandidate(),
  stagedCandidate({ protocolId: "marinade", protocolName: "Marinade", lstSymbol: "mSOL", mint: MINTS.mSOL, externalUrl: "https://app.marinade.finance" }),
  stagedCandidate({ protocolId: "jupiter", protocolName: "Jupiter", lstSymbol: "JupSOL", mint: MINTS.JupSOL, externalUrl: "https://jup.ag" }),
  stagedCandidate({ protocolId: "blazestake", protocolName: "BlazeStake", lstSymbol: "bSOL", mint: MINTS.bSOL, externalUrl: "https://stake.solblaze.org" }),
  // Sanctum's exact INF mint is resolved by adapters later; omitted here (not invented).
  stagedCandidate({ protocolId: "sanctum", protocolName: "Sanctum", lstSymbol: "INF", externalUrl: "https://app.sanctum.so" }),
];

/* ------------------------------------------------------------------ *
 * Query helpers (read-only; never select, rank, or mutate live behavior).
 * ------------------------------------------------------------------ */

/** All five candidates (fresh copies), in stable registry order. */
export function getSolLiquidStakingCandidates(): SolLstCandidate[] {
  return CANDIDATES.map((c) => ({ ...c }));
}

export function getSolLiquidStakingCandidateById(protocolId: string): SolLstCandidate | undefined {
  const c = CANDIDATES.find((x) => x.protocolId === protocolId);
  return c ? { ...c } : undefined;
}

export function getApprovedSolLiquidStakingCandidates(): SolLstCandidate[] {
  return getSolLiquidStakingCandidates().filter((c) => c.approvedForReadOnlyRecommendation === true);
}

export function getStagedSolLiquidStakingCandidates(): SolLstCandidate[] {
  return getSolLiquidStakingCandidates().filter((c) => c.status === "staged_candidate");
}

export function getSolLiquidStakingCandidateBlockers(protocolId: string): string[] {
  return getSolLiquidStakingCandidateById(protocolId)?.blockers ?? [];
}

export function isSolLstCandidateApprovedForReadOnly(protocolId: string): boolean {
  return getSolLiquidStakingCandidateById(protocolId)?.approvedForReadOnlyRecommendation === true;
}

export interface SolLstCandidateRegistrySummary {
  totalCandidates: number;
  approvedReadOnlyCandidates: number;
  stagedCandidates: number;
  transactionsEnabledCandidates: number;
  walletSignatureCandidates: number;
}

export function summarizeSolLiquidStakingCandidateRegistry(): SolLstCandidateRegistrySummary {
  const all = getSolLiquidStakingCandidates();
  return {
    totalCandidates: all.length,
    approvedReadOnlyCandidates: all.filter((c) => c.approvedForReadOnlyRecommendation === true).length,
    stagedCandidates: all.filter((c) => c.status === "staged_candidate").length,
    transactionsEnabledCandidates: all.filter((c) => (c.transactionsEnabled as boolean) === true).length,
    walletSignatureCandidates: all.filter((c) => (c.walletSignaturesEnabled as boolean) === true).length,
  };
}

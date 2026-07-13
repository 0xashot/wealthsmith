/**
 * jitoSolBetaActivation — Step 13G. Enables the READ-ONLY real-wallet exact SOL
 * staking recommendation for JitoSOL, behind an explicit beta flag.
 *
 * PRODUCT DECISION (recorded): the founder verified and approved the JitoSOL source
 * data, risk scoring, and the required gates for a READ-ONLY recommendation.
 *
 * READ-ONLY BOUNDARY — hard limits that stay OFF:
 *  - no transactions (`JITOSOL_BETA_TRANSACTIONS_ENABLED = false`),
 *  - no wallet signatures (`..._WALLET_SIGNATURES_ENABLED = false`),
 *  - no auto-execution (`..._AUTO_EXECUTION_ENABLED = false`),
 *  - no auto external navigation (`..._EXTERNAL_NAVIGATION_ENABLED = false`).
 *
 * This surfaces a "Suggested protocol to review" + verified market data in the
 * shared card/modal. It never signs, moves funds, or completes anything.
 * Rollback: set `JITOSOL_BETA_READ_ONLY_RECOMMENDATION_ENABLED = false` (real-wallet
 * staking returns to `protocolSelection.status = not_evaluated`).
 */
import type { ProtocolSelectionDisplay, RouteEvaluationDisplay } from "./engineTypes";
import { getJitoSolDirectProtocolRouteEvaluationDisplay } from "./jitoSolReadOnlyRouteEvaluation";

/** Read-only recommendation is ENABLED for the JitoSOL beta. */
export const JITOSOL_BETA_READ_ONLY_RECOMMENDATION_ENABLED = true;
/** Hard-off: transactions / signatures / auto-execution / auto external navigation. */
export const JITOSOL_BETA_TRANSACTIONS_ENABLED = false;
export const JITOSOL_BETA_WALLET_SIGNATURES_ENABLED = false;
export const JITOSOL_BETA_AUTO_EXECUTION_ENABLED = false;
export const JITOSOL_BETA_EXTERNAL_NAVIGATION_ENABLED = false;

export const JITOSOL_BETA_PROTOCOL_ID = "jito";
export const JITOSOL_BETA_PROTOCOL_NAME = "Jito";
export const JITOSOL_BETA_LST_SYMBOL = "JitoSOL";

/**
 * The founder-approved beta riskScore (0–10). This is an APPROVED beta production
 * score — NOT a QA-only score, and it carries no QA_ONLY label.
 */
export const JITOSOL_BETA_APPROVED_RISK_SCORE = 7.75;

/** Verified JitoSOL market data for the read-only recommendation (source-approved). */
export interface JitoSolBetaMarketData {
  tvlUsd: number;
  apyPct: number;
  apy30dPct: number;
  directUnstakeTimeHours: number;
  directUnstakeFeePct: number;
  annualManagementFeePct: number;
  annualManagementFeeAppliesTo: string;
}

export function getJitoSolBetaMarketData(): JitoSolBetaMarketData {
  return {
    tvlUsd: 767950000,
    apyPct: 5.36,
    apy30dPct: 5.45,
    directUnstakeTimeHours: 48,
    directUnstakeFeePct: 0.1,
    annualManagementFeePct: 4,
    annualManagementFeeAppliesTo: "rewards",
  };
}

/** Whether the read-only beta recommendation is enabled (rollback = false). */
export function isJitoSolBetaReadOnlyEnabled(): boolean {
  return JITOSOL_BETA_READ_ONLY_RECOMMENDATION_ENABLED === true;
}

/**
 * The production-mode protocol-selection display for the real-wallet recommendation.
 * `mode: "production"` (no demo label); source status "Verified source data".
 * `productionStatus` keeps selection read-only and transactions off.
 */
export function getJitoSolBetaProtocolSelectionDisplay(): ProtocolSelectionDisplay {
  const md = getJitoSolBetaMarketData();
  return {
    label: "Suggested protocol to review",
    protocolName: JITOSOL_BETA_PROTOCOL_NAME,
    assetSymbol: JITOSOL_BETA_LST_SYMBOL,
    mode: "production",
    sourceStatusLabel: "Verified source data",
    marketData: { ...md },
    productionStatus: {
      realWalletSelectionEnabled: true,
      transactionsEnabled: false,
    },
  };
}

export type JitoSolBetaRiskScoreStatus = "approved";

/**
 * Beta-activated JitoSOL metadata for READ-ONLY selection. This is a distinct beta
 * record (the strict staged `SolLstProductionMetadataCandidate` stays blocked): it
 * marks the candidate active for read-only recommendation with an approved score,
 * while transactions stay off and full production readiness is NOT claimed.
 */
export interface JitoSolBetaMetadata {
  protocolId: string;
  protocolName: string;
  lstSymbol: string;
  status: "active";
  /** True for READ-ONLY recommendation display only (not full public/transaction rollout). */
  productionReadyForReadOnly: true;
  selectionEnabled: true;
  transactionsEnabled: false;
  liveSuggestionsUpdated: true;
  riskScoreStatus: JitoSolBetaRiskScoreStatus;
  riskScore: number;
  marketData: JitoSolBetaMarketData;
  sourceStatusLabel: string;
}

export function getJitoSolBetaActivatedMetadata(): JitoSolBetaMetadata {
  return {
    protocolId: JITOSOL_BETA_PROTOCOL_ID,
    protocolName: JITOSOL_BETA_PROTOCOL_NAME,
    lstSymbol: JITOSOL_BETA_LST_SYMBOL,
    status: "active",
    productionReadyForReadOnly: true,
    selectionEnabled: true,
    transactionsEnabled: false,
    liveSuggestionsUpdated: true,
    riskScoreStatus: "approved",
    riskScore: JITOSOL_BETA_APPROVED_RISK_SCORE,
    marketData: getJitoSolBetaMarketData(),
    sourceStatusLabel: "Verified source data",
  };
}

export interface JitoSolReadOnlyBetaGoNoGo {
  /** Read-only recommendation is ready. */
  readOnlyBetaReady: boolean;
  /** Full public production (incl. transactions) is NOT ready. */
  productionReady: false;
  /** Transactions are never ready in this beta. */
  transactionsReady: false;
}

/** Read-only beta go/no-go — separate from full production go/no-go. */
export function getJitoSolReadOnlyBetaGoNoGo(): JitoSolReadOnlyBetaGoNoGo {
  return {
    readOnlyBetaReady: isJitoSolBetaReadOnlyEnabled(),
    productionReady: false,
    transactionsReady: false,
  };
}

/** The JitoSOL recommendation uses the READ-ONLY route evaluation (Step 13I). */
export const JITOSOL_BETA_ROUTE_EVALUATION_READ_ONLY = true;

/**
 * The read-only "Route and execution checks" display for the JitoSOL recommendation.
 * Idle SOL → JitoSOL is a DIRECT PROTOCOL stake, so route cost is reviewed and DEX
 * liquidity depth / slippage are not applicable. Never a transaction/signature.
 * See `jitoSolReadOnlyRouteEvaluation.ts`.
 */
export function getJitoSolBetaRouteEvaluationDisplay(args: {
  inputAmountSol: number;
  checkedAt: string;
}): RouteEvaluationDisplay {
  return getJitoSolDirectProtocolRouteEvaluationDisplay(args);
}

/**
 * protocolSolLiquidStakingSelector — the exact SOL liquid-staking protocol SELECTOR
 * SHELL (Step 13A). HARD-DISABLED and INTERNAL-ONLY.
 *
 * This defines the contract and evaluation path for "idle SOL → which liquid-
 * staking protocol to review" once production metadata, approval, a real riskScore,
 * and go/no-go are all ready. It selects NOTHING today:
 *  - `PROTOCOL_SOL_LST_SELECTOR_ENABLED = false`, so the default result is
 *    `disabled` with no `selectedProtocolId`/`Name`/`LstSymbol`,
 *  - `internalOnly`/`showsUi`/`updatesLiveSuggestions`/`transactionsEnabled` are
 *    ALWAYS false/true-internal — it can never reach live UI or suggestions,
 *  - it mutates no production metadata, registry, mappings, or evidence drafts,
 *  - it is never imported by any live/engine/UI file.
 *
 * The QA-only 7.75 score is never accepted as production. No user-facing
 * recommendation is produced. `PROTOCOL_SELECTION_IMPLEMENTED = false`;
 * `productionReady = false`.
 */
import { PROTOCOL_SELECTION_IMPLEMENTED } from "./protocolSelectionFeatureFlags";
import { getProtocolSelectionGoNoGo } from "./protocolSelectionGoNoGo";
import {
  buildJitoSolProductionMetadataCandidate,
  type SolLstProductionMetadataCandidate,
  type BuildProductionMetadataOptions,
} from "./protocolSolLiquidStakingProductionMetadata";
import {
  isJitoSolBetaReadOnlyEnabled,
  getJitoSolBetaMarketData,
  JITOSOL_BETA_PROTOCOL_ID,
  JITOSOL_BETA_PROTOCOL_NAME,
  JITOSOL_BETA_LST_SYMBOL,
  JITOSOL_BETA_APPROVED_RISK_SCORE,
} from "./jitoSolBetaActivation";

export const PROTOCOL_SOL_LST_SELECTOR_EXISTS = true;
export const PROTOCOL_SOL_LST_SELECTOR_ENABLED = false;
export const PROTOCOL_SOL_LST_SELECTOR_INTERNAL_ONLY = true;
export const PROTOCOL_SOL_LST_SELECTOR_SHOWS_UI = false;
export const PROTOCOL_SOL_LST_SELECTOR_USES_PRODUCTION_METADATA = true;
export const PROTOCOL_SOL_LST_SELECTOR_USES_QA_SCORE = false;
export const PROTOCOL_SOL_LST_SELECTOR_ENABLES_TRANSACTIONS = false;
export const PROTOCOL_SOL_LST_SELECTOR_UPDATES_LIVE_SUGGESTIONS = false;

/** Minimum idle SOL a selector would consider (shell threshold; not a live rule). */
export const MIN_SELECTOR_STAKE_SOL = 0.1;

export type SolLstSelectorStatus =
  | "disabled"
  | "blocked"
  | "insufficient_data"
  | "stale_data"
  | "no_eligible_candidates"
  | "selected";

export type SolLstSelectorBlocker =
  | "selector_disabled"
  | "go_no_go_not_passed"
  | "production_metadata_inactive"
  | "production_metadata_not_ready"
  | "protocol_selection_feature_disabled"
  | "approved_risk_score_missing"
  | "qa_score_rejected"
  | "source_reverification_missing"
  | "stale_data"
  | "unsupported_asset"
  | "eligible_amount_too_small"
  | "transaction_not_allowed";

export type SolLstSelectorCandidateStatus = "eligible" | "blocked" | "stale" | "rejected";

export interface SolLstSelectorInput {
  assetSymbol: string;
  eligibleAmountSol: number;
  eligibleAmountUsd?: number;
  asOf?: string;
  internalPreview?: boolean;
}

export interface SolLstSelectorCandidateEvaluation {
  protocolId: string;
  lstSymbol: string;
  protocolName: string;
  status: SolLstSelectorCandidateStatus;
  riskScore?: number;
  tvlUsd?: number;
  apyPct?: number;
  apy30dPct?: number;
  withdrawalTimeHours?: number;
  blockers: SolLstSelectorBlocker[];
  reasons: string[];
  sourceNames: string[];
}

export interface SolLstSelectorResult {
  status: SolLstSelectorStatus;
  selectedProtocolId?: string;
  selectedProtocolName?: string;
  selectedLstSymbol?: string;
  candidates: SolLstSelectorCandidateEvaluation[];
  blockers: SolLstSelectorBlocker[];
  reasons: string[];
  internalOnly: true;
  showsUi: false;
  updatesLiveSuggestions: false;
  transactionsEnabled: false;
  checkedAt: string;
}

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

/**
 * Evaluate one production-metadata candidate against the selector gates. Returns
 * every unmet gate as a blocker. `eligible` only when ALL gates pass — impossible
 * today (selector disabled, metadata blocked, no approved score, go/no-go false).
 */
export function evaluateSolLstSelectorCandidate(
  metadataCandidate: SolLstProductionMetadataCandidate,
  input: SolLstSelectorInput
): SolLstSelectorCandidateEvaluation {
  const blockers: SolLstSelectorBlocker[] = [];
  const reasons: string[] = [];

  if (!PROTOCOL_SOL_LST_SELECTOR_ENABLED) blockers.push("selector_disabled");
  if (input.assetSymbol.toUpperCase() !== "SOL") blockers.push("unsupported_asset");
  if (!(input.eligibleAmountSol > MIN_SELECTOR_STAKE_SOL)) blockers.push("eligible_amount_too_small");
  if (!PROTOCOL_SELECTION_IMPLEMENTED) blockers.push("protocol_selection_feature_disabled");
  // productionReady fields are literal `false` today — cast to read them as boolean.
  if (!(getProtocolSelectionGoNoGo().productionReady as boolean)) blockers.push("go_no_go_not_passed");
  if (metadataCandidate.status !== "active") blockers.push("production_metadata_inactive");
  if (!(metadataCandidate.productionReady as boolean)) blockers.push("production_metadata_not_ready");
  if (metadataCandidate.dataFreshnessStatus !== "fresh") blockers.push("stale_data");
  if (metadataCandidate.risk.riskScoreStatus === "qa_only") blockers.push("qa_score_rejected");
  if (metadataCandidate.risk.riskScoreStatus !== "approved" || metadataCandidate.risk.riskScore == null) blockers.push("approved_risk_score_missing");
  if (metadataCandidate.blockers.includes("source_reverification_required_before_beta")) blockers.push("source_reverification_missing");

  const deduped = uniq(blockers);
  const status: SolLstSelectorCandidateStatus =
    deduped.length === 0 ? "eligible" : deduped.includes("stale_data") ? "stale" : "blocked";
  if (status !== "eligible") reasons.push("Candidate is not selectable until every production gate passes.");

  return {
    protocolId: metadataCandidate.protocolId,
    lstSymbol: metadataCandidate.lstSymbol,
    protocolName: metadataCandidate.protocolName,
    status,
    // Only surface a riskScore when it is an APPROVED production score (never today).
    ...(metadataCandidate.risk.riskScoreStatus === "approved" && metadataCandidate.risk.riskScore != null ? { riskScore: metadataCandidate.risk.riskScore } : {}),
    ...(metadataCandidate.tvlUsd != null ? { tvlUsd: metadataCandidate.tvlUsd } : {}),
    ...(metadataCandidate.apyPct != null ? { apyPct: metadataCandidate.apyPct } : {}),
    ...(metadataCandidate.apy30dPct != null ? { apy30dPct: metadataCandidate.apy30dPct } : {}),
    ...(metadataCandidate.withdrawal.withdrawalTimeHours != null ? { withdrawalTimeHours: metadataCandidate.withdrawal.withdrawalTimeHours } : {}),
    blockers: deduped,
    reasons,
    sourceNames: metadataCandidate.sources.map((s) => s.sourceName),
  };
}

/**
 * Deterministic comparator for future use over ELIGIBLE candidates: highest
 * approved riskScore → highest TVL → lowest withdrawal hours → highest APY-30d →
 * protocolId asc. Unreachable today (no candidate is ever eligible).
 */
export function compareSolLstSelectorCandidates(
  a: SolLstSelectorCandidateEvaluation,
  b: SolLstSelectorCandidateEvaluation
): number {
  if ((b.riskScore ?? -1) !== (a.riskScore ?? -1)) return (b.riskScore ?? -1) - (a.riskScore ?? -1);
  if ((b.tvlUsd ?? -1) !== (a.tvlUsd ?? -1)) return (b.tvlUsd ?? -1) - (a.tvlUsd ?? -1);
  if ((a.withdrawalTimeHours ?? Infinity) !== (b.withdrawalTimeHours ?? Infinity)) return (a.withdrawalTimeHours ?? Infinity) - (b.withdrawalTimeHours ?? Infinity);
  if ((b.apy30dPct ?? -1) !== (a.apy30dPct ?? -1)) return (b.apy30dPct ?? -1) - (a.apy30dPct ?? -1);
  return a.protocolId < b.protocolId ? -1 : a.protocolId > b.protocolId ? 1 : 0;
}

function metadataCandidates(input: SolLstSelectorInput): SolLstProductionMetadataCandidate[] {
  const opts: BuildProductionMetadataOptions = { asOf: input.asOf };
  return [buildJitoSolProductionMetadataCandidate(opts)];
}

const shell = (
  status: SolLstSelectorStatus,
  candidates: SolLstSelectorCandidateEvaluation[],
  blockers: SolLstSelectorBlocker[],
  reasons: string[]
): SolLstSelectorResult => ({
  status,
  candidates,
  blockers: uniq(blockers),
  reasons,
  internalOnly: true,
  showsUi: false,
  updatesLiveSuggestions: false,
  transactionsEnabled: false,
  checkedAt: new Date().toISOString(),
});

/**
 * The selector. HARD-DISABLED: because `PROTOCOL_SOL_LST_SELECTOR_ENABLED` is
 * false, it returns `disabled` with `selector_disabled` and no selected protocol.
 * Input validation still runs so callers see `unsupported_asset` /
 * `eligible_amount_too_small` too. The enabled path (deterministic selection) is
 * unreachable today and never uses the QA score.
 */
export function selectSolLiquidStakingProtocol(input: SolLstSelectorInput): SolLstSelectorResult {
  const blockers: SolLstSelectorBlocker[] = [];
  if (input.assetSymbol.toUpperCase() !== "SOL") blockers.push("unsupported_asset");
  if (!(input.eligibleAmountSol > MIN_SELECTOR_STAKE_SOL)) blockers.push("eligible_amount_too_small");

  if (!PROTOCOL_SOL_LST_SELECTOR_ENABLED) {
    blockers.push("selector_disabled");
    return shell("disabled", [], blockers, ["Selector is hard-disabled; no protocol is selected."]);
  }

  // --- Unreachable today: full production selection path. ---
  const evaluations = metadataCandidates(input).map((c) => evaluateSolLstSelectorCandidate(c, input));
  const eligible = evaluations.filter((e) => e.status === "eligible").slice().sort(compareSolLstSelectorCandidates);
  if (eligible.length === 0) {
    return shell("no_eligible_candidates", evaluations, [...blockers, ...uniq(evaluations.flatMap((e) => e.blockers))], ["No candidate passed every production gate."]);
  }
  const winner = eligible[0];
  return {
    ...shell("selected", evaluations, blockers, ["Deterministic selection over eligible candidates."]),
    selectedProtocolId: winner.protocolId,
    selectedProtocolName: winner.protocolName,
    selectedLstSymbol: winner.lstSymbol,
  };
}

/**
 * Internal dry-run: evaluate candidates and surface every blocker WITHOUT enabling
 * the selector. Never returns a `selectedProtocolId`, mutates metadata, updates
 * live suggestions, or enables UI/transactions.
 */
export function dryRunSolLstSelector(input: SolLstSelectorInput): SolLstSelectorResult {
  const evaluations = metadataCandidates(input).map((c) => evaluateSolLstSelectorCandidate(c, input));
  const topBlockers: SolLstSelectorBlocker[] = [];
  if (!PROTOCOL_SOL_LST_SELECTOR_ENABLED) topBlockers.push("selector_disabled");
  topBlockers.push(...evaluations.flatMap((e) => e.blockers));
  const status: SolLstSelectorStatus = PROTOCOL_SOL_LST_SELECTOR_ENABLED ? "blocked" : "disabled";
  return shell(status, evaluations, topBlockers, ["Internal dry-run only; selector is not enabled."]);
}

/* ------------------------------------------------------------------ *
 * Step 13G — JitoSOL READ-ONLY beta selection (behind the beta flag).
 * The generic `selectSolLiquidStakingProtocol` stays hard-disabled; this is the
 * separate, approved read-only path that surfaces a "Suggested protocol to review".
 * ------------------------------------------------------------------ */
export interface SelectJitoSolReadOnlyBetaOptions {
  /** Rollback override for tests; defaults to the beta flag. */
  betaEnabled?: boolean;
}

/**
 * Read-only JitoSOL selection for the real-wallet beta. Returns `selected` (with
 * `selectedProtocolId`/`Name`/`LstSymbol` + a candidate carrying verified market
 * data) ONLY when the beta is enabled and the input is SOL above the minimum.
 * Rejects USDC, at/below-minimum amounts, and disables cleanly on rollback. It
 * never enables transactions (`transactionsEnabled` stays false).
 */
export function selectJitoSolReadOnlyBeta(
  input: SolLstSelectorInput,
  options?: SelectJitoSolReadOnlyBetaOptions
): SolLstSelectorResult {
  const betaEnabled = options?.betaEnabled ?? isJitoSolBetaReadOnlyEnabled();
  const blockers: SolLstSelectorBlocker[] = [];
  if (input.assetSymbol.toUpperCase() !== "SOL") blockers.push("unsupported_asset");
  if (!(input.eligibleAmountSol > MIN_SELECTOR_STAKE_SOL)) blockers.push("eligible_amount_too_small");

  if (!betaEnabled) {
    return shell("disabled", [], [...blockers, "selector_disabled"], ["JitoSOL read-only beta is disabled."]);
  }
  if (blockers.length > 0) {
    return shell("no_eligible_candidates", [], blockers, ["Input not eligible for the JitoSOL read-only recommendation."]);
  }

  const md = getJitoSolBetaMarketData();
  const candidate: SolLstSelectorCandidateEvaluation = {
    protocolId: JITOSOL_BETA_PROTOCOL_ID,
    lstSymbol: JITOSOL_BETA_LST_SYMBOL,
    protocolName: JITOSOL_BETA_PROTOCOL_NAME,
    status: "eligible",
    riskScore: JITOSOL_BETA_APPROVED_RISK_SCORE,
    tvlUsd: md.tvlUsd,
    apyPct: md.apyPct,
    apy30dPct: md.apy30dPct,
    withdrawalTimeHours: md.directUnstakeTimeHours,
    blockers: [],
    reasons: ["Verified source data · read-only recommendation (no transactions)."],
    sourceNames: ["Verified source data"],
  };
  return {
    ...shell("selected", [candidate], [], ["Read-only JitoSOL recommendation (verified source data; no transactions)."]),
    selectedProtocolId: JITOSOL_BETA_PROTOCOL_ID,
    selectedProtocolName: JITOSOL_BETA_PROTOCOL_NAME,
    selectedLstSymbol: JITOSOL_BETA_LST_SYMBOL,
  };
}

export interface SolLstSelectorReadinessPreview {
  canSelect: false;
  blockers: SolLstSelectorBlocker[];
  candidateCount: number;
  eligibleCandidateCount: number;
  blockedCandidateCount: number;
  nextRequiredActions: string[];
}

/** Human-readable internal readiness report. `canSelect` is always false today. */
export function previewSolLstSelectorReadiness(input: SolLstSelectorInput): SolLstSelectorReadinessPreview {
  const evaluations = metadataCandidates(input).map((c) => evaluateSolLstSelectorCandidate(c, input));
  const blockers = uniq([
    ...(PROTOCOL_SOL_LST_SELECTOR_ENABLED ? [] : (["selector_disabled"] as SolLstSelectorBlocker[])),
    ...evaluations.flatMap((e) => e.blockers),
  ]);
  return {
    canSelect: false,
    blockers,
    candidateCount: evaluations.length,
    eligibleCandidateCount: evaluations.filter((e) => e.status === "eligible").length,
    blockedCandidateCount: evaluations.filter((e) => e.status !== "eligible").length,
    nextRequiredActions: [
      "Approve the risk rubric (recorded human decision).",
      "Assign an approved non-QA riskScore.",
      "Complete source re-verification before beta.",
      "Activate the production metadata candidate.",
      "Pass the production go/no-go.",
      "Enable the selector feature flag.",
      "Approve product / copy / compliance and UI readiness.",
    ],
  };
}

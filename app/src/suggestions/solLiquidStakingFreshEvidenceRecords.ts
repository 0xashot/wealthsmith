/**
 * solLiquidStakingFreshEvidenceRecords — Step 14E. The place to record REAL, freshly
 * verified evidence for the staged SOL liquid-staking candidates (mSOL / JupSOL /
 * bSOL / INF), using the 14D intake format.
 *
 * EVIDENCE RECORDING ONLY. It never assigns a risk score, approves a candidate,
 * enables multi-protocol selection, updates a live recommendation, or replaces Jito
 * as the selected protocol. No transaction/signature path. Not imported by
 * `stakingSuggestion` or any live/UI file — only by docs and fixtures.
 *
 * MODE A (empty/partial) — CURRENT. No fresh verified values are available to
 * record yet, so the per-candidate input arrays are EMPTY and every staged
 * candidate stays blocked. Nothing is invented and the stale 14B values are NOT
 * reused as fresh. When Ashot/engineering verifies a real value, append a fully
 * populated `SolLstFreshEvidenceInput` (value + unit + sourceName + sourceUrl +
 * confirmedAt + confirmedBy + reviewerRole + notes) to the matching array; the 14D
 * intake will accept it only if it is complete AND within the 24h freshness window.
 */
import {
  createSolLstFreshEvidenceRecord,
  summarizeSolLstFreshEvidenceRecords,
  previewSolLstRiskGateWithFreshEvidence,
  type SolLstFreshEvidenceInput,
  type SolLstFreshEvidenceRecord,
  type SolLstFreshEvidenceCandidateSummary,
  type SolLstFreshEvidenceRiskGatePreview,
} from "./solLiquidStakingFreshEvidenceIntake";

export const SOL_LST_FRESH_EVIDENCE_RECORDS_EXISTS = true;
export const SOL_LST_FRESH_EVIDENCE_RECORDS_ASSIGN_RISK_SCORES = false;
export const SOL_LST_FRESH_EVIDENCE_RECORDS_APPROVE_CANDIDATES = false;
export const SOL_LST_FRESH_EVIDENCE_RECORDS_ENABLE_MULTI_PROTOCOL_SELECTION = false;
export const SOL_LST_FRESH_EVIDENCE_RECORDS_UPDATE_LIVE_RECOMMENDATIONS = false;
export const SOL_LST_FRESH_EVIDENCE_RECORDS_ENABLE_TRANSACTIONS = false;
export const SOL_LST_FRESH_EVIDENCE_RECORDS_REQUIRE_WALLET_SIGNATURE = false;

/* ------------------------------------------------------------------ *
 * Per-candidate REAL fresh-evidence inputs.
 *
 * EMPTY until real values are verified. Each staged candidate may carry up to ten
 * categories: market (tvl, current_apy, apy_30d), mechanics/fees
 * (withdrawal_mechanics, direct_unstake_time, direct_unstake_fee,
 * annual_management_fee), and evidence (audit_security, operational_risk,
 * incident_review). Partial arrays are fine — missing categories stay missing, and
 * the candidate stays blocked until every required category has a fresh accepted
 * record. DO NOT add a record with a placeholder or stale value.
 * ------------------------------------------------------------------ */
export const MARINADE_MSOL_FRESH_EVIDENCE_INPUTS: SolLstFreshEvidenceInput[] = [];
export const JUPITER_JUPSOL_FRESH_EVIDENCE_INPUTS: SolLstFreshEvidenceInput[] = [];
export const BLAZESTAKE_BSOL_FRESH_EVIDENCE_INPUTS: SolLstFreshEvidenceInput[] = [];
export const SANCTUM_INF_FRESH_EVIDENCE_INPUTS: SolLstFreshEvidenceInput[] = [];

export interface FreshEvidenceRecordsOptions {
  checkedAt?: string;
}

/** All recorded fresh-evidence inputs across the four staged candidates. */
export function getSolLstFreshEvidenceInputs(): SolLstFreshEvidenceInput[] {
  return [
    ...MARINADE_MSOL_FRESH_EVIDENCE_INPUTS,
    ...JUPITER_JUPSOL_FRESH_EVIDENCE_INPUTS,
    ...BLAZESTAKE_BSOL_FRESH_EVIDENCE_INPUTS,
    ...SANCTUM_INF_FRESH_EVIDENCE_INPUTS,
  ];
}

/** The inputs run through the 14D intake validator (adds status + blockers). */
export function getSolLstFreshEvidenceRecords(options: FreshEvidenceRecordsOptions = {}): SolLstFreshEvidenceRecord[] {
  return getSolLstFreshEvidenceInputs().map((input) => createSolLstFreshEvidenceRecord(input, options.checkedAt));
}

/** Per-candidate completeness summaries from the recorded evidence. */
export function getSolLstFreshEvidenceSummaries(options: FreshEvidenceRecordsOptions = {}): SolLstFreshEvidenceCandidateSummary[] {
  return summarizeSolLstFreshEvidenceRecords(getSolLstFreshEvidenceRecords(options), options.checkedAt);
}

/** Non-live risk-gate preview for the recorded evidence (never scores/approves). */
export function getSolLstFreshEvidenceRiskGatePreview(options: FreshEvidenceRecordsOptions = {}): SolLstFreshEvidenceRiskGatePreview[] {
  return previewSolLstRiskGateWithFreshEvidence(getSolLstFreshEvidenceRecords(options), options.checkedAt);
}

export interface SolLstFreshEvidenceRecordStatus {
  totalInputs: number;
  acceptedRecords: number;
  staleRecords: number;
  incompleteRecords: number;
  candidatesWithCompleteMarketData: number;
  candidatesWithCompleteMechanics: number;
  candidatesWithCompleteEvidence: number;
  candidatesReadyForRiskGate: number;
  assignsRiskScores: false;
  approvesCandidates: false;
  updatesLiveRecommendations: false;
  transactionsEnabled: false;
}

/** Roll-up status across all recorded evidence (0/blocked while arrays are empty). */
export function summarizeSolLstFreshEvidenceRecordStatus(options: FreshEvidenceRecordsOptions = {}): SolLstFreshEvidenceRecordStatus {
  const records = getSolLstFreshEvidenceRecords(options);
  const summaries = getSolLstFreshEvidenceSummaries(options);
  const isIncomplete = (s: SolLstFreshEvidenceRecord["status"]) =>
    s === "incomplete" || s === "rejected" || s === "unsupported_protocol" || s === "invalid_category";
  return {
    totalInputs: getSolLstFreshEvidenceInputs().length,
    acceptedRecords: records.filter((r) => r.status === "accepted").length,
    staleRecords: records.filter((r) => r.status === "stale").length,
    incompleteRecords: records.filter((r) => isIncomplete(r.status)).length,
    candidatesWithCompleteMarketData: summaries.filter((s) => s.marketDataComplete).length,
    candidatesWithCompleteMechanics: summaries.filter((s) => s.mechanicsComplete).length,
    candidatesWithCompleteEvidence: summaries.filter((s) => s.evidenceComplete).length,
    candidatesReadyForRiskGate: summaries.filter((s) => s.readyForRiskGate).length,
    assignsRiskScores: false,
    approvesCandidates: false,
    updatesLiveRecommendations: false,
    transactionsEnabled: false,
  };
}

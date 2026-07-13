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
// Step 14F — Marinade · mSOL. PARTIAL: 5 of 10 categories verified from public
// sources (founder-authorized fetch, 2026-07-13). Market data is fresh from the
// DefiLlama mSOL pool; withdrawal MECHANISM and audit list from official Marinade
// docs. The other 5 categories stay MISSING because they could not be verified
// unambiguously: direct_unstake_time + direct_unstake_fee + annual_management_fee
// (Marinade's FAQ vs. search results CONFLICT — 0% vs 0.2% unstake fee, 1 vs 1-2
// epochs, and management fee is ambiguous), and operational_risk + incident_review
// (no clean official source obtained). No stale 14B value is reused and nothing is
// invented. mSOL stays NOT readyForRiskGate (market complete; mechanics + evidence
// incomplete).
export const MARINADE_MSOL_FRESH_EVIDENCE_INPUTS: SolLstFreshEvidenceInput[] = [
  {
    protocolId: "marinade",
    category: "tvl",
    value: 182837237,
    unit: "usd",
    sourceName: "DefiLlama — Marinade mSOL pool",
    sourceUrl: "https://yields.llama.fi/chart/b3f93865-5ec8-4662-90a0-11808e0aa2bd",
    confirmedAt: "2026-07-13T12:10:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: ["Fresh mSOL TVL verified from the DefiLlama pool chart API; most-recent data point 2026-07-13T12:01:27.808Z."],
  },
  {
    protocolId: "marinade",
    category: "current_apy",
    value: 4.73658,
    unit: "pct",
    sourceName: "DefiLlama — Marinade mSOL pool",
    sourceUrl: "https://yields.llama.fi/chart/b3f93865-5ec8-4662-90a0-11808e0aa2bd",
    confirmedAt: "2026-07-13T12:10:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: ["Latest DefiLlama APY snapshot (data point 2026-07-13T12:01:27.808Z). mSOL's daily APY snapshot oscillates with the Solana epoch boundary (last-30-day range ~4.7%-7.1%); this is the point-in-time value. See apy_30d for the smoothed mean."],
  },
  {
    protocolId: "marinade",
    category: "apy_30d",
    value: 5.84,
    unit: "pct",
    sourceName: "DefiLlama — Marinade mSOL pool",
    sourceUrl: "https://yields.llama.fi/chart/b3f93865-5ec8-4662-90a0-11808e0aa2bd",
    confirmedAt: "2026-07-13T12:10:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: ["30-day mean APY computed deterministically from the last 30 daily 'apy' values of the DefiLlama pool chart (min 4.69%, max 7.07%); mean 5.84%."],
  },
  {
    protocolId: "marinade",
    category: "withdrawal_mechanics",
    value: "Delayed unstake issues an on-chain claim ticket; SOL becomes claimable after ~1-2 Solana epochs (~2-4 days). Instant unstake is also available via the liquidity pool for a variable fee.",
    unit: "text",
    sourceName: "Marinade Documentation — FAQ",
    sourceUrl: "https://docs.marinade.finance/marinade-protocol/faq",
    confirmedAt: "2026-07-13T12:10:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: ["Withdrawal MECHANISM only. The exact delayed-unstake fee and precise epoch count are recorded separately and stay UNVERIFIED — the FAQ and search results conflict (0% vs 0.2% fee; 1 vs 1-2 epochs)."],
  },
  {
    protocolId: "marinade",
    category: "audit_security",
    value: "Marinade liquid staking (mSOL) smart contracts audited by Kudelski Security, Ackee Blockchain, Neodyme, and Sec3 per the official audits page; Marinade also holds SOC 2 Type I/II.",
    unit: "text",
    sourceName: "Marinade Documentation — Security / Audits",
    sourceUrl: "https://docs.marinade.finance/marinade-protocol/security/audits",
    confirmedAt: "2026-07-13T12:10:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: ["Auditor list verified from Marinade's official audits page. Point-in-time review; an audit does not by itself ensure future safety."],
  },
];
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

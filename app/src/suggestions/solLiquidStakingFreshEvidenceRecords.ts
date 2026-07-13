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
// Step 14F/14G/14H/14I — Marinade · mSOL. COMPLETE: all 10 categories verified from
// public sources (founder-authorized fetch, 2026-07-13). 14F: market data (DefiLlama
// pool) + withdrawal MECHANISM + audit list. 14G: direct_unstake_fee (FAQ verbatim
// 0.2% direct/delayed path), operational_risk, incident_review (documented SAM
// auction-logic bug — NOT a clean-history claim). 14H: annual_management_fee = 0
// (Marinade docs verbatim "No performance fees on staking rewards"; SAM revenue
// model). 14I: direct_unstake_time recorded as sourced EPOCH-BASED TEXT (claimable
// after epoch n+1, up to n+2) — the intake now accepts dual-format timing so no
// fixed hours are invented for an epoch-based protocol. No stale 14B value is reused
// and nothing is invented. mSOL is now readyForRiskGate = true WITHIN the 24h
// freshness window — but still unscored and NOT approved (rubric + risk-approval
// decision are separate later gates).
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
  {
    protocolId: "marinade",
    category: "direct_unstake_fee",
    value: 0.2,
    unit: "pct",
    sourceName: "Marinade Documentation — FAQ",
    sourceUrl: "https://docs.marinade.finance/marinade-protocol/faq",
    confirmedAt: "2026-07-13T13:30:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: ["Direct (delayed) mSOL unstake fee: 0.2% (20 bps) per the Marinade FAQ (quoted verbatim). This is the direct-protocol path (claim ticket, ~1 epoch). Marinade's SEPARATE instant-unstake path adds no extra Marinade protocol fee but is priced via the LP / Jupiter DEX route (market slippage), so it is not a single fixed fee — see withdrawal_mechanics."],
  },
  {
    protocolId: "marinade",
    category: "operational_risk",
    value: "Operational dependencies: (a) validator delegation — Marinade becomes the staking authority and delegates pooled SOL to validators via its Stake Auction Market; (b) stake pool — mSOL represents SOL held in Marinade's stake pool; (c) liquidity dependency — instant unstake routes mSOL to SOL via a Jupiter DEX route and depends on LP depth; (d) program control — the mSOL smart contract is controlled by a 13-party community multisig requiring 6 signers.",
    unit: "text",
    sourceName: "Marinade Documentation — What is mSOL? / Audits",
    sourceUrl: "https://docs.marinade.finance/marinade-protocol/protocol-overview/marinade-liquid/what-is-msol",
    confirmedAt: "2026-07-13T13:30:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: ["Sourced summary of operational dependencies (delegation via SAM, stake pool, LP/Jupiter instant-unstake dependency, 13-party/6-signer multisig program control). Descriptive only — not an endorsement or safety claim."],
  },
  {
    protocolId: "marinade",
    category: "incident_review",
    value: "Point-in-time review (2026-07-13): a Marinade community forum incident report documents a bug in the Stake Auction Market unstake-priority logic that let validators retain delegation while underpaying the pool, causing ~37,000 SOL (~$5M) in losses / missed staker rewards (~28% of advertised APY on affected stake) over epochs 652-777. Classified as a program logic bug in the auction mechanism, not a theft or drain of staked principal. Marinade's response was criticized in the thread.",
    unit: "text",
    sourceName: "Marinade community forum — Incident Report: 37,000 SOL in Losses",
    sourceUrl: "https://forum.marinade.finance/t/incident-report-37-000-sol-in-losses-a-call-for-investigation-and-action/1853",
    confirmedAt: "2026-07-13T13:30:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: ["Community forum report (not an official Marinade postmortem). Point-in-time finding, NOT a clean-history claim; concerns the SAM rewards mechanism, not a loss of staked principal. A bug bounty (Immunefi) exists."],
  },
  {
    protocolId: "marinade",
    category: "annual_management_fee",
    value: 0,
    unit: "pct",
    sourceName: "Marinade Documentation — Marinade Liquid (full docs export)",
    sourceUrl: "https://docs.marinade.finance/llms-full.txt",
    confirmedAt: "2026-07-13T14:15:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: ["Current Marinade docs state 'No performance fees on staking rewards' (verbatim), i.e. no reward/management fee on mSOL; protocol revenue comes from validators via the Stake Auction Market. Recorded as 0% on rewards. Supersedes the historical ~6% management-fee figure cited by older sources."],
  },
  {
    protocolId: "marinade",
    category: "direct_unstake_time",
    value: "Claimable after epoch n+1; may become n+2 when unstaking in an epoch's final 4 hours. Marinade describes epoch length as approximate, so this is recorded as sourced epoch-based timing rather than fixed hours.",
    unit: "text",
    sourceName: "Marinade Documentation — FAQ",
    sourceUrl: "https://docs.marinade.finance/marinade-protocol/faq",
    confirmedAt: "2026-07-13T14:45:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: [
      "Fresh mSOL delayed-unstake timing verified as epoch-based evidence.",
      "No fixed-hour conversion was recorded because the source gives approximate epoch timing rather than a deterministic hour value.",
      "This record completes the direct_unstake_time category without inventing hours.",
    ],
  },
];
// Step 14M — Jupiter · JupSOL. COMPLETE: all 10 categories verified from public
// sources (founder-authorized fetch, 2026-07-13). Market data from the DefiLlama
// JupSOL pool; mechanics/fees/audit/operational from official Jupiter docs
// (jupsol.md + stake-sol FAQ). The stale 14B JupSOL figures were NOT reused as fresh
// and nothing is invented.
export const JUPITER_JUPSOL_FRESH_EVIDENCE_INPUTS: SolLstFreshEvidenceInput[] = [
  {
    protocolId: "jupiter",
    category: "tvl",
    value: 391943484,
    unit: "usd",
    sourceName: "DefiLlama — Jupiter JupSOL pool",
    sourceUrl: "https://yields.llama.fi/chart/52bd72a7-9e81-4112-abb4-71673e8de9bf",
    confirmedAt: "2026-07-13T19:15:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: ["Fresh JupSOL TVL verified from the DefiLlama pool chart API; most-recent data point 2026-07-13T19:01:31.961Z."],
  },
  {
    protocolId: "jupiter",
    category: "current_apy",
    value: 5.68777,
    unit: "pct",
    sourceName: "DefiLlama — Jupiter JupSOL pool",
    sourceUrl: "https://yields.llama.fi/chart/52bd72a7-9e81-4112-abb4-71673e8de9bf",
    confirmedAt: "2026-07-13T19:15:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: ["Latest DefiLlama APY snapshot (data point 2026-07-13T19:01:31.961Z). JupSOL's APY is stable (last-30 range ~5.55%-5.69%)."],
  },
  {
    protocolId: "jupiter",
    category: "apy_30d",
    value: 5.6,
    unit: "pct",
    sourceName: "DefiLlama — Jupiter JupSOL pool",
    sourceUrl: "https://yields.llama.fi/chart/52bd72a7-9e81-4112-abb4-71673e8de9bf",
    confirmedAt: "2026-07-13T19:15:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: ["30-day mean APY computed deterministically from the last 30 'apy' values of the DefiLlama pool chart (min 5.55%, max 5.69%); mean 5.60%."],
  },
  {
    protocolId: "jupiter",
    category: "withdrawal_mechanics",
    value: "Instant: swap JupSOL to SOL at any time via Jupiter or any DEX. Delayed unstake: JupSOL is converted to a stake account that deactivates over ~2 days (one epoch), after which SOL can be claimed.",
    unit: "text",
    sourceName: "Jupiter Documentation — JupSOL / Stake SOL FAQ",
    sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/jupsol.md",
    confirmedAt: "2026-07-13T19:15:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: ["Withdrawal MECHANISM per official Jupiter docs (instant DEX swap or delayed stake-account withdrawal)."],
  },
  {
    protocolId: "jupiter",
    category: "direct_unstake_time",
    value: "Delayed (direct) unstake takes approximately 2 days (one epoch) for the stake account to deactivate before SOL can be claimed; recorded as sourced epoch-based timing rather than a fixed hour value. Instant swap is available anytime via a DEX.",
    unit: "text",
    sourceName: "Jupiter Documentation — JupSOL / Stake SOL FAQ",
    sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/jupsol.md",
    confirmedAt: "2026-07-13T19:15:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: ["Epoch-based timing (~2 days / one epoch) recorded as text per the 14I dual-format rule; no fixed-hour conversion is claimed."],
  },
  {
    protocolId: "jupiter",
    category: "direct_unstake_fee",
    value: 0.1,
    unit: "pct",
    sourceName: "Jupiter Documentation — Stake SOL FAQ",
    sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/faq.md",
    confirmedAt: "2026-07-13T19:15:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: ["0.1% withdrawal fee applies when unwrapping JupSOL directly from the pool (direct/delayed path), per Jupiter docs. Instant swap is priced by the DEX/market instead."],
  },
  {
    protocolId: "jupiter",
    category: "annual_management_fee",
    value: 5,
    unit: "pct",
    sourceName: "Jupiter Documentation — JupSOL",
    sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/jupsol.md",
    confirmedAt: "2026-07-13T19:15:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: ["Jupiter validator commission is 5% on inflation rewards, 0% on MEV, with priority fees unaffected (official Jupiter docs). NOTE: a SEPARATE Sanctum epoch/infrastructure fee also applies to base staking rewards (~5% per Jupiter docs; a 2.5% Sanctum figure is also referenced); the recorded value is Jupiter's validator commission on inflation rewards."],
  },
  {
    protocolId: "jupiter",
    category: "audit_security",
    value: "JupSOL is built on Sanctum's SPL Stake Pool Program (SanctumSplMulti deployment). Per Jupiter docs the SPL stake pool program has been audited 9 times by multiple security firms and has secured over $4B in staked SOL across the ecosystem.",
    unit: "text",
    sourceName: "Jupiter Documentation — JupSOL",
    sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/jupsol.md",
    confirmedAt: "2026-07-13T19:15:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: ["Program + audit statement from official Jupiter docs. Point-in-time; audit history does not by itself ensure future safety."],
  },
  {
    protocolId: "jupiter",
    category: "operational_risk",
    value: "Operational dependencies: SOL is delegated to a single Jupiter validator (validator concentration); JupSOL runs on Sanctum's SPL stake-pool infrastructure; the program's upgrade authority is controlled by an 11-member multisig (not Sanctum alone), and the management authority held by Sanctum cannot access user funds.",
    unit: "text",
    sourceName: "Jupiter Documentation — JupSOL / Stake SOL FAQ",
    sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/faq.md",
    confirmedAt: "2026-07-13T19:15:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: ["Sourced summary of operational dependencies (single-validator concentration, Sanctum SPL stake-pool infra, 11-member multisig upgrade authority). Descriptive only — not an endorsement or safety claim."],
  },
  {
    protocolId: "jupiter",
    category: "incident_review",
    value: "Point-in-time review (2026-07-13): no independent JupSOL-specific incident or postmortem was found during this review window. Jupiter's official docs state the underlying SPL stake pool program has secured over $4B without exploits — this is a protocol statement, not an independent verification of clean history.",
    unit: "text",
    sourceName: "Jupiter Documentation — JupSOL",
    sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/jupsol.md",
    confirmedAt: "2026-07-13T19:15:00Z",
    confirmedBy: "Ashot",
    reviewerRole: "founder",
    notes: ["Point-in-time finding, NOT a clean-history claim. No independent incident/postmortem obtained; the 'without exploits' statement is Jupiter's own."],
  },
];
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

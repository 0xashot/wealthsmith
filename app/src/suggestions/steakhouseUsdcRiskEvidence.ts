/**
 * steakhouseUsdcRiskEvidence — Step 16H-J. The versioned, exact-vault RISK EVIDENCE PACKAGE for the one
 * selected candidate: Kamino "Steakhouse USDC" (HDsay…RS5E).
 *
 * WHAT THIS IS: assembled, traceable evidence + reviewer-facing gaps. It is INPUT to a human 16D review.
 *
 * WHAT THIS IS NOT: a risk score, a risk review, or an approval. No score is assigned here, and none may
 * be, for two reasons the repository itself already encodes:
 *
 *   1. `protocolRiskRubric.ts` is `approvalStatus: "draft"` (v0.1.0-draft) with
 *      `PROTOCOL_RISK_RUBRIC_APPROVED = false` and `PROTOCOL_RISK_RUBRIC_ASSIGNS_SCORES = false`.
 *   2. `protocolRiskScoreAssignment.ts` (Step 12Y) gates any 0–10 score on an approved rubric PLUS a
 *      per-dimension reviewer-scored input with rationale + sources. Its default is `not_submitted`, so
 *      every candidate — including the far more mature JitoSOL work — stays `blocked` with no score.
 *
 * Claude assembled this evidence and may apply deterministic rubric mechanics, but is NOT an authorized
 * human reviewer and does not represent itself as one. The signoff state below is `awaiting_human_signoff`.
 *
 * Nothing here mutates the registry, approves a product, or renders a card.
 */

export const STEAKHOUSE_RISK_EVIDENCE_EXISTS = true;
export const STEAKHOUSE_RISK_EVIDENCE_VERSION = "1.0.0" as const;
/** UTC date every on-chain/official fact below was checked. Facts age; this is the cutoff. */
export const STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT = "2026-07-16T11:27:33.000Z";

/** How a fact was established. `on_chain` is the strongest; `official_docs` is protocol-published. */
export type SteakhouseEvidenceSourceType = "on_chain" | "official_sdk" | "official_docs" | "not_established";

/** Whether a fact may move a score, gate eligibility, or is context only. Reviewer decides scores. */
export type SteakhouseEvidenceEffect = "score_input" | "eligibility_blocker" | "descriptive_only";

export interface SteakhouseEvidenceItem {
  evidenceId: string;
  dimension: string;
  sourceType: SteakhouseEvidenceSourceType;
  /** A reference, never a copied document. */
  source: string;
  checkedAt: string;
  /** How this evidence attaches to THIS exact vault (not to Kamino generally). */
  productRelationship: string;
  summary: string;
  effect: SteakhouseEvidenceEffect;
  confidence: "high" | "medium" | "low";
  /** Reviewer-facing note. Explicitly separated from the evidence itself. */
  reviewerNote?: string;
}

/* ------------------------------------------------------------------ *
 * The evidence. Every item is a checked fact or an explicit gap.
 * ------------------------------------------------------------------ */
const EVIDENCE: SteakhouseEvidenceItem[] = [
  // ---- Identity + program ----
  {
    evidenceId: "sh-id-01",
    dimension: "program_identity",
    sourceType: "on_chain",
    source: "Solana mainnet account read (vault + program), via the official klend-sdk v9.1.2",
    checkedAt: STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT,
    productRelationship: "the exact vault HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E",
    summary: "Vault is owned by the Kamino vault program KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd; on-chain state.name decodes to 'Steakhouse USDC'; tokenMint is the canonical USDC mint; sharesMint is 7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS; mint decimals 6.",
    effect: "eligibility_blocker",
    confidence: "high",
    reviewerNote: "Program identity is established. The program id also matches the constant shipped in the official SDK.",
  },
  {
    evidenceId: "sh-upg-01",
    dimension: "upgrade_admin_risk",
    sourceType: "on_chain",
    source: "getAccountInfo(program) + getAccountInfo(programData), BPF upgradeable loader",
    checkedAt: STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT,
    productRelationship: "the vault program that custodies this vault's funds",
    summary: "The program is OWNED BY BPFLoaderUpgradeab1e1111... — it is UPGRADEABLE. An ACTIVE upgrade authority exists: GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW (not None/immutable). programData GeZ7nkkcbJ6VVV1XVFbmFnLCY3F1LPBGk6cufDZvrbGn.",
    effect: "score_input",
    confidence: "high",
    reviewerNote: "MATERIAL: an active upgrade authority can replace the program logic that holds user funds. Whether that authority is a multisig, a timelocked governance account, or a single key is NOT established on-chain by this read and must be determined before approval.",
  },
  {
    evidenceId: "sh-upg-02",
    dimension: "upgrade_admin_risk",
    sourceType: "on_chain",
    source: "programData lastDeployedSlot",
    checkedAt: STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT,
    productRelationship: "the deployed bytecode currently custodying this vault",
    summary: "lastDeployedSlot = 432874668, roughly 389,000 slots (~2 days) before the read at slot 433263778. The program was upgraded very recently.",
    effect: "score_input",
    confidence: "high",
    reviewerNote: "MATERIAL: a ~2-day-old deployment cannot be assumed to be the version any published audit covered. This is the crux of the audit-linkage gap (sh-aud-02).",
  },

  // ---- Manager / governance ----
  {
    evidenceId: "sh-mgr-01",
    dimension: "manager_governance_risk",
    sourceType: "on_chain",
    source: "VaultState authority fields",
    checkedAt: STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT,
    productRelationship: "the exact vault",
    summary: "vaultAdminAuthority = 9ceRgz579BcfWogs3RE11FKNQaWW7Lmtnev3MXspxUjF; pendingAdmin equals the same account; allocationAdmin = CuEC7JoZtHx9v5MQWrNTsLSGMEixbCEvTX6K6kWZzz7q (a DIFFERENT account); baseVaultAuthority = AyY6VCkHfTWdFs7SqBbu6AnCqLUhgzVHBzW3WcJu5Jc8.",
    effect: "score_input",
    confidence: "high",
    reviewerNote: "Admin and allocation (strategy) control are separate accounts. Whether either is a multisig/timelock is NOT established. Manager reputation is not a substitute for this permission analysis.",
  },
  {
    evidenceId: "sh-mgr-02",
    dimension: "manager_governance_risk",
    sourceType: "not_established",
    source: "no official source located that enumerates vault-admin vs allocation-admin permissions for this vault",
    checkedAt: STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT,
    productRelationship: "the exact vault",
    summary: "GAP: the precise permission set of vaultAdminAuthority and allocationAdmin (fee changes, cap changes, reserve whitelist, pause, withdrawal control, timelocks) is not established from an official source.",
    effect: "eligibility_blocker",
    confidence: "high",
  },

  // ---- Strategy exposure ----
  {
    evidenceId: "sh-exp-01",
    dimension: "strategy_exposure",
    sourceType: "on_chain",
    source: "VaultState.vaultAllocationStrategy",
    checkedAt: STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT,
    productRelationship: "the exact vault's current allocation",
    summary: "The vault allocates deposited USDC across FOUR Kamino lending reserves (4 active of 25 slots), with target weights ~23.0% (Ga4rZytCpq1unD4DbEJ5bkHeUz9g3oh9AAFEi6vSauXp), ~74.2% (D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59), ~1.8% (9FRZvAsjDJ6WM8BJ2S45h9PoDCLAq8DNY9zZDX7MyGzT), ~1.0% (Atj6UREVWa7WxbF2EMKNyfmYUY1U1txughe2gjhcPDCo).",
    effect: "score_input",
    confidence: "high",
    reviewerNote: "MATERIAL: this is NOT a single-venue USDC deposit. It is a managed multi-reserve lending allocation, and allocationAdmin can change it. Each reserve carries its own collateral, oracle, and liquidation risk — none of which is reviewed here. 'USDC vault' does not mean pure USDC lending.",
  },
  {
    evidenceId: "sh-exp-02",
    dimension: "strategy_exposure",
    sourceType: "not_established",
    source: "the four reserve accounts were not resolved to their parent lending markets or collateral sets",
    checkedAt: STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT,
    productRelationship: "the exact vault's underlying venues",
    summary: "GAP: the four reserves' parent markets, accepted collateral, oracle providers, and liquidation parameters are not established. Composition can also change at allocationAdmin's discretion, so a point-in-time snapshot is not a durable exposure model.",
    effect: "eligibility_blocker",
    confidence: "high",
  },

  // ---- Audits ----
  {
    evidenceId: "sh-aud-01",
    dimension: "audit_security",
    sourceType: "official_docs",
    source: "kamino.com/docs/security/audits (official audit inventory)",
    checkedAt: STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT,
    productRelationship: "the Kamino EARN VAULTS program family (the program class this vault belongs to)",
    summary: "Three audits are published for Kamino Earn Vaults: Offside Labs (2025-04-12), Sec3 (2025-02-06), OtterSec (2024-12-09). Kamino also publishes formal verification, fuzzing, and a $1.5M ImmuneFi bug bounty.",
    effect: "score_input",
    confidence: "high",
    reviewerNote: "Audit coverage of the program family EXISTS and is non-trivial. An audit is not a safety guarantee, and this is program-family coverage, not a review of this vault's configuration.",
  },
  {
    evidenceId: "sh-aud-02",
    dimension: "audit_security",
    sourceType: "not_established",
    source: "the official audit inventory publishes no audited commit hash or program version",
    checkedAt: STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT,
    productRelationship: "the bytecode currently deployed at KvauGMspG5k…",
    summary: "GAP: no audited commit/version is published, and the deployed program was upgraded ~2 days before this read (sh-upg-02). The currently deployed bytecode therefore CANNOT be related to any audited version.",
    effect: "eligibility_blocker",
    confidence: "high",
    reviewerNote: "This is the single most consequential gap: audits exist, but their linkage to what is running today is unproven.",
  },

  // ---- Oracles ----
  {
    evidenceId: "sh-orc-01",
    dimension: "oracle_risk",
    sourceType: "official_docs",
    source: "kamino.com/docs/security/oracles (Scope aggregator) + oracles/price-protection",
    checkedAt: STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT,
    productRelationship: "Kamino's protocol-wide oracle architecture, which the underlying reserves rely on",
    summary: "Kamino documents a Scope oracle aggregator with multi-provider redundancy and validation, plus published price-protection mechanics. Scope has three published audits (Sec3 2024-12-16, OtterSec 2023-12-16, Offside Labs 2023-12-08).",
    effect: "score_input",
    confidence: "medium",
    reviewerNote: "Protocol-level oracle architecture is documented. Which oracles THIS vault's four reserves actually depend on is unresolved (sh-exp-02), so a vault-specific oracle model cannot be asserted.",
  },

  // ---- Liquidity / withdrawal ----
  {
    evidenceId: "sh-liq-01",
    dimension: "liquidity_withdrawal_risk",
    sourceType: "on_chain",
    source: "VaultState limit fields",
    checkedAt: STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT,
    productRelationship: "the exact vault",
    summary: "minWithdrawAmount = 1000 raw (0.001 USDC); minInvestAmount = 1000000 raw (1 USDC); minInvestDelaySlots = 0. The SDK's VaultHoldings models `queuedForWithdrawalForReserves`, indicating withdrawals can be queued against reserves rather than always instant.",
    effect: "score_input",
    confidence: "medium",
    reviewerNote: "The presence of a queued-withdrawal concept means instant liquidity must NOT be assumed. Whether a withdrawal is instant depends on uninvested balance vs. the need to unwind reserve positions.",
  },
  {
    evidenceId: "sh-liq-02",
    dimension: "liquidity_withdrawal_risk",
    sourceType: "not_established",
    source: "no official source located that specifies this vault's exact withdrawal path, delay, or emergency behaviour",
    checkedAt: STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT,
    productRelationship: "the exact vault",
    summary: "GAP: exact withdrawal semantics (instant vs queued conditions, cooldown, manager involvement, partial-withdrawal behaviour, withdrawal fee, performance-fee crystallisation on exit, emergency withdrawal) are not established.",
    effect: "eligibility_blocker",
    confidence: "high",
  },

  // ---- Fees ----
  {
    evidenceId: "sh-fee-01",
    dimension: "fee_transparency",
    sourceType: "on_chain",
    source: "VaultState.performanceFeeBps / managementFeeBps",
    checkedAt: STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT,
    productRelationship: "the exact vault",
    summary: "performanceFeeBps = 500 (5%); managementFeeBps = 0. The SDK's computeNetAPR deducts BOTH from the net APY WealthSmith consumes, so the displayed rate is already net of these two fees.",
    effect: "descriptive_only",
    confidence: "high",
    reviewerNote: "Fees are on-chain readable and change-detectable. Whether an authority can change them without notice is part of the unresolved permission gap (sh-mgr-02). Underlying reserve-level costs are not represented.",
  },

  // ---- Stablecoin ----
  {
    evidenceId: "sh-stb-01",
    dimension: "stablecoin_risk",
    sourceType: "on_chain",
    source: "VaultState.tokenMint compared to the canonical repository USDC mint",
    checkedAt: STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT,
    productRelationship: "the exact vault's principal asset",
    summary: "Principal is canonical Circle USDC (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v) — not a bridged or wrapped variant. USDC carries issuer centralisation and freeze-authority risk inherent to the token itself.",
    effect: "score_input",
    confidence: "high",
    reviewerNote: "Do not score this favourably merely because USDC is widely used. Whether the four reserves introduce OTHER stablecoin or collateral exposure is unresolved (sh-exp-02).",
  },

  // ---- Incidents ----
  {
    evidenceId: "sh-inc-01",
    dimension: "incident_history",
    sourceType: "not_established",
    source: "no incident review was conducted for this vault, the vault program, the four reserves, the manager, or Scope",
    checkedAt: STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT,
    productRelationship: "the exact vault and its dependencies",
    summary: "GAP: no sourced incident history was assembled. Per the repository's own rubric guidance, absence of a discovered incident is NOT evidence of a clean record — it is missing evidence.",
    effect: "eligibility_blocker",
    confidence: "high",
  },

  // ---- Capacity / deposit state (carried from 16H-I; NOT resolved here) ----
  {
    evidenceId: "sh-cap-01",
    dimension: "operational_dependency_risk",
    sourceType: "on_chain",
    source: "VaultState.depositCap (live read)",
    checkedAt: STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT,
    productRelationship: "the exact vault HDsay…RS5E on the kvault mainnet program KvauGMspG5k…",
    summary: "depositCap = 0 (and unallocatedTokensCap = 0). Two of the four reserve allocations carry tokenAllocationCap = u64::MAX.",
    effect: "descriptive_only",
    confidence: "high",
    reviewerNote: "See sh-cap-02: deposit_cap=0 is RESOLVED as uncapped from the official program source. Note tokenAllocationCap is a DIFFERENT field on a different account — its U64_MAX sentinel says nothing about deposit_cap.",
  },
  {
    evidenceId: "sh-cap-02",
    dimension: "operational_dependency_risk",
    sourceType: "official_docs",
    source: "github.com/Kamino-Finance/kvault, release/v2.2.2, commit 1d146d7087a76edbbadc14d848ae14295c0745a4, programs/kvault/src/operations/vault_operations.rs, common::get_max_depositable_in_vault (L1003-1012)",
    checkedAt: "2026-07-16T12:01:51.000Z",
    productRelationship: "the kvault program that governs deposits into this exact vault (mainnet KvauGMspG5k…)",
    summary: "RESOLVED: `get_max_depositable_in_vault` contains an explicit branch `if vault.deposit_cap == 0 { u64::MAX } else { vault.deposit_cap }`, then returns `deposit_cap.saturating_sub(aum_rounded_up)` against a dynamically computed AUM. deposit_cap=0 therefore means UNCAPPED, not closed. `init_vault` writes deposit_cap = u64::MAX (L44), so 0 is the legacy zero-initialised encoding retained for backward compatibility. No stored used-counterpart exists or is needed — AUM is computed at deposit time.",
    effect: "score_input",
    confidence: "high",
    reviewerNote: "This SUPERSEDES the earlier 16H-J speculation that 0 might mean 'closed'. That speculation reasoned from tokenAllocationCap's U64_MAX sentinel — a different field — and is refuted by the program's own deposit path. Capacity for THIS vault is verified_uncapped, bound to the reviewed revision above. Scope is narrow: this proves nothing for lending reserves, LP pools, or any other product type, which still fail closed.",
  },
];

export function listSteakhouseRiskEvidence(): SteakhouseEvidenceItem[] {
  return EVIDENCE.map((e) => ({ ...e }));
}

/** Evidence items that must be closed before a 16D review can conclude. */
export function listSteakhouseEvidenceBlockers(): SteakhouseEvidenceItem[] {
  return listSteakhouseRiskEvidence().filter((e) => e.effect === "eligibility_blocker" && e.sourceType === "not_established");
}

/* ------------------------------------------------------------------ *
 * Review state — deliberately NOT a score.
 * ------------------------------------------------------------------ */

export type SteakhouseRiskReviewState =
  | "evidence_incomplete"
  | "evidence_complete_awaiting_human_signoff"
  | "risk_review_complete_eligible_for_approval_review"
  | "risk_review_complete_blocked";

export interface SteakhouseRiskReviewStatus {
  evidenceVersion: typeof STEAKHOUSE_RISK_EVIDENCE_VERSION;
  evidenceCutoffAt: string;
  strategyId: string;
  productAddress: string;
  sharesMint: string;
  programId: string;

  state: SteakhouseRiskReviewState;

  /** Always false here: the rubric is a draft and no reviewer input exists. */
  rubricScoreComplete: false;
  /** Always false here: no authorized human reviewer record exists in the repository. */
  humanSignoffComplete: false;
  /** Always false: this record cannot approve anything. */
  eligibleForApprovalReview: boolean;

  /** No score is asserted. `undefined` is the honest value; 0 would be a claim. */
  riskScore: undefined;

  openBlockers: string[];
  reviewerActionsRequired: string[];
}

/**
 * The current review status. Deterministic: derived from the evidence gaps + the repository's own
 * rubric/score gates, not from a judgement call.
 */
export function getSteakhouseRiskReviewStatus(): SteakhouseRiskReviewStatus {
  const gaps = listSteakhouseEvidenceBlockers();
  return {
    evidenceVersion: STEAKHOUSE_RISK_EVIDENCE_VERSION,
    evidenceCutoffAt: STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT,
    strategyId: "kamino_steakhouse_usdc",
    productAddress: "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E",
    sharesMint: "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS",
    programId: "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd",
    state: "evidence_incomplete",
    rubricScoreComplete: false,
    humanSignoffComplete: false,
    eligibleForApprovalReview: false,
    riskScore: undefined,
    openBlockers: gaps.map((g) => `${g.evidenceId}:${g.dimension}`),
    reviewerActionsRequired: [
      "Approve the protocol risk rubric (protocolRiskRubric.ts is v0.1.0-draft, approvalStatus 'draft', PROTOCOL_RISK_RUBRIC_APPROVED=false). No 0-10 score may be assigned against a draft rubric.",
      "Provide per-dimension reviewer-scored input with rationale + sources (required by protocolRiskScoreAssignment.ts, Step 12Y; default is not_submitted).",
      "Determine whether the upgrade authority GzFgdRJXmaw… is a multisig/timelock or a single key (sh-upg-01).",
      "Establish an explicit deposit-enabled/paused state. Capacity is now verified_uncapped (sh-cap-02), but that resolves CAPACITY ONLY — it is not evidence that deposits are enabled, and the vault state exposes no pause field.",
      "Relate the currently deployed bytecode (lastDeployedSlot 432874668) to an audited version — no audited commit is published (sh-aud-02).",
      "Enumerate vaultAdminAuthority + allocationAdmin permissions and any timelocks (sh-mgr-02).",
      "Resolve the four allocated reserves to their markets, collateral, oracles and liquidation parameters (sh-exp-02).",
      "Establish the exact withdrawal model, delay, fees and emergency behaviour (sh-liq-02).",
      "Conduct a sourced incident review for the vault, program, reserves, manager and Scope (sh-inc-01).",
      "Record an authorized reviewer identity + role: the repository has no reviewer field on YieldStrategyRiskReview and no authorized reviewer record. Claude is not an authorized reviewer.",
    ],
  };
}

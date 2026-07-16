/**
 * steakhouseDeploymentAndDepositEvidence — Step 16H-L.1.
 *
 * The second half of the Steakhouse USDC evidence closure: verified-build linkage, audit
 * re-evaluation against that linkage, the exact current withdrawal configuration, reserve-level
 * withdrawal behaviour, official API status semantics, permissioning, and the canonical read-only
 * deposit-state policy.
 *
 * This module assigns NO score, fills NO worksheet, completes NO review, approves NOTHING, and
 * constructs NO transaction and NO simulation. It reports what primary sources prove and preserves
 * precisely what they do not.
 *
 * THE HEADLINE CHANGE IN 16H-L.1: the deployed binary is now cryptographically linked to an exact
 * source commit — and it is the SAME commit this project already reviewed. Every source-derived
 * conclusion in the 16H series (capacity semantics, fee maths, the absence of a pause flag, the
 * absence of a withdrawal queue) was previously a claim about source that was *chronologically
 * plausible* as the deployment. It is now a claim about the ACTUAL deployed bytecode. That is a
 * genuine strengthening, and it is the reason several questions could be struck from the
 * questionnaire rather than asked of Kamino.
 *
 * It does NOT make the audits linkable. See AUDIT_LINKAGE_REASSESSMENT: knowing the deployed commit
 * exactly tells us the audits do not state a commit at all, which sharpens the gap rather than
 * closing it.
 */
import type { RiskRubricV1DimensionId } from "./riskGovernance";

export const DEPLOYMENT_DEPOSIT_EVIDENCE_VERSION = "1.0.0" as const;

/** Live read-only mainnet + official API reads for this step. Facts age; this is the cutoff. */
export const L1_EVIDENCE_CUTOFF_AT = "2026-07-16T15:56:03.000Z";
export const L1_EVIDENCE_SLOT = "433302860";
export const L1_EVIDENCE_BLOCK_TIME = "2026-07-16T15:56:03.000Z";

export const L1_BINDING = {
  strategyId: "kamino_steakhouse_usdc",
  vaultAddress: "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E",
  programId: "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd",
  depositMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
} as const;

/* ------------------------------------------------------------------ *
 * 1. Verified-build record (solana-verify / OtterSec)
 * ------------------------------------------------------------------ */

export type VerificationClassification =
  | "verified_current_binary_exact_commit"
  | "verified_commit_but_upgraded_after_verification"
  | "verified_historical_binary_only"
  | "current_binary_mismatch"
  | "verification_record_missing"
  | "unresolved";

export interface VerificationRecord {
  registry: string;
  registryEndpoint: string;
  programId: string;
  status: "verified" | "not_verified" | "missing";
  repositoryUrl: string;
  verifiedCommit: string;
  verificationTimestamp: string;
  /** The hash the registry computed FROM the repo at that commit. */
  executableHash: string;
  /** The hash of the bytecode actually on chain. */
  onChainHash: string;
  hashesMatch: boolean;
  isFrozen: boolean;
  isClosed: boolean;
  /** Who submitted the record. Provenance matters: a record signed by the upgrade authority is stronger. */
  recordSigner: string;
  recordSignerIsUpgradeAuthority: boolean;
  currentProgramDataAccount: string;
  currentDeploymentSlot: string;
  currentDeploymentTimestamp: string;
  upgradedAfterVerification: boolean;
  classification: VerificationClassification;
}

/**
 * VERIFIED 2026-07-16 against the official solana-verify registry (verify.osec.io), the registry the
 * `solana-verify` CLI and OtterSec publish to.
 *
 * The two timestamps are the whole ballgame, so read them in order:
 *   deployment    2026-07-14T14:54:02Z  (chain time of programData slot 432874668)
 *   verification  2026-07-14T15:00:30Z  (6m28s LATER)
 * The verification therefore describes the binary that is deployed RIGHT NOW, and `getAccountInfo`
 * confirms no upgrade has landed since (lastDeployedSlot is unchanged at 432874668). Had the order
 * been reversed, this would be `verified_commit_but_upgraded_after_verification` and worth far less.
 *
 * `on_chain_hash === executable_hash === 5b1eac16…` is the actual proof: the registry rebuilt the repo
 * at commit 1d146d70… and got bytes identical to mainnet. This is NOT inferred from a tag, a release
 * date, a README, or source chronology — it is a hash comparison.
 *
 * PROVENANCE: the record is signed by GzFgdRJXmaw… — the program's own upgrade authority, which
 * 16H-L.1 proved is the 5-of-10 Squads vault PDA. So the verification was submitted by the same
 * multisig-gated authority that performed the deploy.
 *
 * A SECOND, STALE RECORD EXISTS and must not be confused with this one: signer Cyjb5r4P…, commit
 * 0321f628…, `is_verified: false`, executable_hash cb75ee29… ≠ the on-chain hash. It is a third-party
 * submission for an older commit that does NOT match the deployed binary. Recorded in
 * `SUPERSEDED_VERIFICATION_RECORDS` so that a future reader cannot mistake it for evidence.
 */
export const VERIFICATION_RECORD: VerificationRecord = {
  registry: "solana-verify / OtterSec verified builds",
  registryEndpoint: "https://verify.osec.io/status/KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd",
  programId: "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd",
  status: "verified",
  repositoryUrl: "https://github.com/Kamino-Finance/kvault/tree/1d146d7087a76edbbadc14d848ae14295c0745a4",
  verifiedCommit: "1d146d7087a76edbbadc14d848ae14295c0745a4",
  verificationTimestamp: "2026-07-14T15:00:30.889898Z",
  executableHash: "5b1eac1695f68e4e3889a10bce0797e96f9cfd0d0aaa8d7b8f4e37d730fbc609",
  onChainHash: "5b1eac1695f68e4e3889a10bce0797e96f9cfd0d0aaa8d7b8f4e37d730fbc609",
  hashesMatch: true,
  isFrozen: false,
  isClosed: false,
  recordSigner: "GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW",
  recordSignerIsUpgradeAuthority: true,
  currentProgramDataAccount: "GeZ7nkkcbJ6VVV1XVFbmFnLCY3F1LPBGk6cufDZvrbGn",
  currentDeploymentSlot: "432874668",
  currentDeploymentTimestamp: "2026-07-14T14:54:02.000Z",
  upgradedAfterVerification: false,
  classification: "verified_current_binary_exact_commit",
};

/** Kept deliberately: a stale non-matching record is a trap, and naming it is cheaper than re-finding it. */
export const SUPERSEDED_VERIFICATION_RECORDS = [
  {
    signer: "Cyjb5r4P1j1YPEyUemWxMZKbTpBiyNQML1S1YpPvi9xE",
    commit: "0321f6287d236b8286495ff7b7a410fcb93f0599",
    isVerified: false,
    executableHash: "cb75ee2922a94a2dff8873afee5f363d363019a6e5efaa3234224ed85096c2cc",
    verifiedAt: "2026-06-19T10:58:10.098083Z",
    whyNotEvidence:
      "is_verified is false and the rebuilt hash does NOT match the on-chain hash. It is a third-party submission for a superseded commit. It proves nothing about the deployed binary and must never be cited as verification.",
  },
] as const;

/**
 * The consequence worth stating explicitly, because it upgrades earlier work rather than replacing it.
 *
 * `CLOSURE_BINDING.reviewedSourceCommit` is 1d146d70… — the same commit the registry verified against
 * the deployed bytecode. So the source this project read IS the deployed program, proven by hash.
 */
export const REVIEWED_SOURCE_MATCHES_DEPLOYED_BINARY = {
  reviewedSourceCommit: "1d146d7087a76edbbadc14d848ae14295c0745a4",
  verifiedDeployedCommit: "1d146d7087a76edbbadc14d848ae14295c0745a4",
  match: true,
  whatThisUpgrades: [
    "deposit_cap === 0 → uncapped (16H-J.1) is now a statement about the deployed binary, not just about source.",
    "The absence of any deposit/withdrawal pause flag (16H-L) is now a verified property of the deployed binary.",
    "The absence of any withdrawal queue / FIFO construct is now a verified property of the deployed binary.",
    "computeNetAPR fee maths matches the deployed fee logic.",
  ],
  whatThisDoesNotUpgrade:
    "Audit coverage. Knowing the deployed commit exactly does not make an audit that never stated a commit apply to it. See AUDIT_LINKAGE_REASSESSMENT.",
} as const;

/* ------------------------------------------------------------------ *
 * 2. Audit linkage, re-evaluated against the verified deployment
 * ------------------------------------------------------------------ */

export type AuditToBinaryRelationship =
  | "covers_current_binary_proven"
  | "predates_current_binary"
  | "unknown_relationship";

export interface AuditRecordV2 {
  auditor: string;
  reportDate: string;
  reportReference: string;
  repository: string | null;
  auditedCommitOrTag: string | null;
  moduleScope: string;
  managedAllocationCoverage: "covered" | "not_covered" | "unknown";
  withdrawalCoverage: "covered" | "not_covered" | "unknown";
  authorityAdminCoverage: "covered" | "not_covered" | "unknown";
  findingsAndRemediationEvidence: string;
  relationshipToCurrentBinary: AuditToBinaryRelationship;
}

/**
 * Re-evaluated 16H-L.1 with the verified deployment in hand.
 *
 * The verified commit was authored/deployed 2026-07-14. Every known Earn Vaults report predates it by
 * 15–19 months. Kamino's official audit inventory states NO commit, tag, or release for any of them,
 * so there is no artifact that could link a report to 1d146d70… even in principle.
 *
 * The closed historical program (kvauTFR8…, last active 2026-03-25) makes this worse rather than
 * better: reports dated 2024-12 → 2025-04 fall inside that program's active life, so they may well
 * have audited a program that is now closed. That is a HYPOTHESIS, not a finding — it is recorded to
 * stop anyone reasoning "Kamino Earn Vaults was audited, therefore this binary was audited".
 *
 * `predates_current_binary` is a statement about DATES ONLY. It is not a coverage finding: an audit
 * of an earlier commit may well still cover most of the deployed logic. It says only that no evidence
 * establishes that it does.
 */
export const AUDIT_RECORDS_V2: AuditRecordV2[] = [
  {
    auditor: "Offside Labs",
    reportDate: "2025-04-12",
    reportReference: "Kamino Earn Vaults (official audit inventory; no commit stated)",
    repository: null,
    auditedCommitOrTag: null,
    moduleScope: "Kamino Earn Vaults",
    managedAllocationCoverage: "unknown",
    withdrawalCoverage: "unknown",
    authorityAdminCoverage: "unknown",
    findingsAndRemediationEvidence: "No per-finding remediation evidence tied to a commit is published in the official inventory.",
    relationshipToCurrentBinary: "predates_current_binary",
  },
  {
    auditor: "Sec3",
    reportDate: "2025-02-06",
    reportReference: "Kamino Earn Vaults (official audit inventory; no commit stated)",
    repository: null,
    auditedCommitOrTag: null,
    moduleScope: "Kamino Earn Vaults",
    managedAllocationCoverage: "unknown",
    withdrawalCoverage: "unknown",
    authorityAdminCoverage: "unknown",
    findingsAndRemediationEvidence: "No per-finding remediation evidence tied to a commit is published in the official inventory.",
    relationshipToCurrentBinary: "predates_current_binary",
  },
  {
    auditor: "OtterSec",
    reportDate: "2024-12-09",
    reportReference: "Kamino Earn Vaults (official audit inventory; no commit stated)",
    repository: null,
    auditedCommitOrTag: null,
    moduleScope: "Kamino Earn Vaults",
    managedAllocationCoverage: "unknown",
    withdrawalCoverage: "unknown",
    authorityAdminCoverage: "unknown",
    findingsAndRemediationEvidence: "No per-finding remediation evidence tied to a commit is published in the official inventory.",
    relationshipToCurrentBinary: "predates_current_binary",
  },
];

export const AUDIT_LINKAGE_REASSESSMENT = {
  version: "2.0.0",
  result: "unverified_linkage" as const,
  buildVerificationChangesLinkage: false,
  reasoning:
    "16H-L.1 resolved WHICH binary is deployed (commit 1d146d70…, hash-verified). It did not resolve whether any audit covers it. No published report states a commit, tag or release, and all three predate the 2026-07-14 deployment by 15–19 months. A verified build proves source↔binary correspondence; it says nothing about whether that source was audited. Those are different claims and conflating them would be the single easiest mistake to make here. OtterSec appearing in BOTH roles — as an auditor in 2024 and as the verified-build registry in 2026 — is a coincidence of names and is explicitly NOT treated as linkage.",
  whatWouldResolveIt: [
    "A report from any of the three auditors that names commit 1d146d7087a76edbbadc14d848ae14295c0745a4, or a range/tag provably containing it.",
    "A Kamino statement of which audit covers the currently deployed commit, and which findings were remediated in it.",
    "Confirmation of whether the 2024–2025 reports targeted the now-closed kvauTFR8… program or the current KvauGMsp… program.",
  ],
  evidenceCutoffAt: L1_EVIDENCE_CUTOFF_AT,
} as const;

/* ------------------------------------------------------------------ *
 * 3. Exact current withdrawal configuration
 * ------------------------------------------------------------------ */

/**
 * Read from ON-CHAIN VaultState via the SDK at slot 433302860.
 *
 * NOTE ON SOURCE CHOICE: the official REST API does NOT return withdrawalPenaltyBps,
 * withdrawalPenaltyLamports, unallocatedWeight or unallocatedTokensCap at all — they exist in the IDL
 * but are omitted from the API projection. On-chain state is therefore the only authoritative source
 * for the withdrawal configuration, and is what is recorded here.
 */
export const WITHDRAWAL_CONFIG = {
  version: "1.0.0",
  vaultAddress: L1_BINDING.vaultAddress,
  sourceSlot: L1_EVIDENCE_SLOT,
  sourceBlockTime: L1_EVIDENCE_BLOCK_TIME,
  retrievedAt: "2026-07-16T15:56:04.000Z",
  evidenceCutoffAt: L1_EVIDENCE_CUTOFF_AT,
  source: "on-chain VaultState via @kamino-finance/klend-sdk 9.1.2 (NOT the REST API, which omits these fields)",

  /** PENALTY — proportional and flat are separate mechanisms and are never summed. */
  penalty: {
    /** Proportional penalty, basis points of the withdrawn amount. */
    withdrawalPenaltyBps: 0,
    /** Flat penalty, in TOKEN BASE UNITS (USDC has 6 decimals) — not lamports of SOL despite the name. */
    withdrawalPenaltyLamports: "0",
    interpretation:
      "0 / 0 = NO configured withdrawal penalty at the vault level as of this slot. This CORRECTS the 16H-L claim that a withdrawal penalty was a live third exit cost — that was written before these fields were read, and it was wrong. Both mechanisms are configurable, so a zero value is a CURRENT STATE, not a guarantee, and the vault admin multisig (3-of-10, no time lock) can set them with immediate effect.",
  },

  /** BUFFER POLICY — the target. Distinct from the current balance below. */
  bufferPolicy: {
    unallocatedWeight: 0,
    unallocatedTokensCap: "0",
    interpretation:
      "Both zero: the vault's policy is to hold NO unallocated buffer — every deposited token is targeted for investment into reserves. This is a POLICY (a target the invest crank works toward), not an observation of the current balance.",
  },

  /** CURRENT BALANCE — an observation at one slot. Distinct from the policy above. */
  currentBalance: {
    /** Raw unallocated balance sitting in the vault's token account, in USDC base units. */
    tokenAvailable: "69969583509",
    tokenAvailableUsdc: 69969.583509,
    /** Fees already accrued and owed out of that balance. */
    pendingFeesUsdc: 70038.768215,
    /**
     * tokenAvailable MINUS pendingFees. NEGATIVE at this slot: the accrued fees exceed the entire
     * unallocated balance. The free buffer is not merely small, it is overdrawn on paper.
     */
    unencumberedBufferUsdc: -69.184706,
    prevAumUsdc: 20696359.65,
    interpretation:
      "THE POINT OF THIS SECTION: tokenAvailable must NOT be described as instantly withdrawable liquidity. At this slot the unallocated balance (~69,969 USDC) is entirely spoken for by pendingFees (~70,038 USDC) — the difference is NEGATIVE. Consistent with unallocatedWeight=0, the vault deliberately keeps ~0% of its ~20.7M USDC AUM as free buffer. Effectively every withdrawal of any size must pull from reserves. Treating tokenAvailable as a withdrawable float would overstate instant liquidity by roughly its entire value.",
  },

  /** Minimums enforced by the deployed (hash-verified) program. */
  minimums: {
    minDepositAmount: "100000",
    minDepositUsdc: 0.1,
    minWithdrawAmount: "1000",
    minWithdrawUsdc: 0.001,
    minInvestAmount: "1000000",
    minInvestUsdc: 1,
    minInvestDelaySlots: 0,
  },
} as const;

/* ------------------------------------------------------------------ *
 * 4. Reserve-level withdrawal behaviour
 * ------------------------------------------------------------------ */

export interface ReserveWithdrawalBehavior {
  reserveAddress: string;
  lendingMarket: string;
  /** Resolved from Kamino's OFFICIAL market list — never guessed from the address. */
  marketName: string | null;
  targetAllocationWeight: number;
  allocationSharePct: number;
  tokenAllocationCapRaw: string;
  /** 0 = Active, 1 = Obsolete, 2 = Hidden — per the klend Reserve config. */
  reserveStatus: number;
  reserveStatusLabel: "active" | "obsolete" | "hidden" | "unknown";
  emergencyMode: number;
  blockCtokenUsage: number;
  reserveAvailableLiquidityUsdc: number;
  reserveBorrowedUsdc: number;
  utilizationPct: number;
  depositLimitUsdc: number;
  /**
   * The vault's position value in this reserve. APPROXIMATE: derived as
   * (vault ctokens / ctoken total supply) × (available + borrowed). It is NOT an exact SDK-computed
   * position and must not be presented as one.
   */
  vaultPositionValueUsdcApprox: number;
  /** Whether this reserve's CURRENT free liquidity covers the vault's whole position in it. */
  reserveLiquidityCoversVaultPosition: boolean;
}

/**
 * All four active reserves read at slot 433302860. `Atj6URE…` — recorded as an UNRESOLVED market in
 * 16H-L — now resolves to "Maple Market" via Kamino's official market list.
 *
 * Every reserve is status 0 (Active), emergencyMode 0, blockCtokenUsage 0 — nothing is frozen,
 * obsolete or restricted at this slot.
 *
 * THE MATERIAL FINDING: two of the four reserves (Bitcoin Market, Maple Market) currently hold LESS
 * free liquidity than the vault's own position in them. Aggregate free liquidity across all four
 * (~27.4M USDC) does exceed the vault's total position (~20.7M USDC) — but withdrawal is executed
 * PER RESERVE, so aggregate coverage does not imply a full exit is possible. Netting the totals would
 * hide exactly the constraint that matters.
 */
export const RESERVE_WITHDRAWAL_BEHAVIOR: ReserveWithdrawalBehavior[] = [
  {
    reserveAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
    lendingMarket: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
    marketName: "SOL/BTC Market",
    targetAllocationWeight: 876111,
    allocationSharePct: 87.61,
    tokenAllocationCapRaw: "18446744073709551615",
    reserveStatus: 0,
    reserveStatusLabel: "active",
    emergencyMode: 0,
    blockCtokenUsage: 0,
    reserveAvailableLiquidityUsdc: 24364762.09,
    reserveBorrowedUsdc: 89299469.63,
    utilizationPct: 78.56,
    depositLimitUsdc: 1000000000,
    vaultPositionValueUsdcApprox: 18150021.84,
    reserveLiquidityCoversVaultPosition: true,
  },
  {
    reserveAddress: "Ga4rZytCpq1unD4DbEJ5bkHeUz9g3oh9AAFEi6vSauXp",
    lendingMarket: "DxXdAyU3kCjnyggvHmY5nAwg5cRbbmdyX3npfDMjjMek",
    marketName: "JLP Market",
    targetAllocationWeight: 102850,
    allocationSharePct: 10.29,
    tokenAllocationCapRaw: "18446744073709551615",
    reserveStatus: 0,
    reserveStatusLabel: "active",
    emergencyMode: 0,
    blockCtokenUsage: 0,
    reserveAvailableLiquidityUsdc: 2690472.76,
    reserveBorrowedUsdc: 19792699.84,
    utilizationPct: 88.03,
    depositLimitUsdc: 50000000,
    vaultPositionValueUsdcApprox: 2129575.93,
    reserveLiquidityCoversVaultPosition: true,
  },
  {
    reserveAddress: "Atj6UREVWa7WxbF2EMKNyfmYUY1U1txughe2gjhcPDCo",
    lendingMarket: "6WEGfej9B9wjxRs6t4BYpb9iCXd8CpTpJ8fVSNzHCC5y",
    marketName: "Maple Market",
    targetAllocationWeight: 14389,
    allocationSharePct: 1.44,
    tokenAllocationCapRaw: "25000000000000",
    reserveStatus: 0,
    reserveStatusLabel: "active",
    emergencyMode: 0,
    blockCtokenUsage: 0,
    reserveAvailableLiquidityUsdc: 261430.67,
    reserveBorrowedUsdc: 2097592.22,
    utilizationPct: 88.92,
    depositLimitUsdc: 30000000,
    vaultPositionValueUsdcApprox: 297902.35,
    reserveLiquidityCoversVaultPosition: false,
  },
  {
    reserveAddress: "9FRZvAsjDJ6WM8BJ2S45h9PoDCLAq8DNY9zZDX7MyGzT",
    lendingMarket: "GMqmFygF5iSm5nkckYU6tieggFcR42SyjkkhK5rswFRs",
    marketName: "Bitcoin Market",
    targetAllocationWeight: 6650,
    allocationSharePct: 0.66,
    tokenAllocationCapRaw: "10000000000000",
    reserveStatus: 0,
    reserveStatusLabel: "active",
    emergencyMode: 0,
    blockCtokenUsage: 0,
    reserveAvailableLiquidityUsdc: 100529.17,
    reserveBorrowedUsdc: 441117.38,
    utilizationPct: 81.44,
    depositLimitUsdc: 10000000,
    vaultPositionValueUsdcApprox: 137802.91,
    reserveLiquidityCoversVaultPosition: false,
  },
];

/**
 * Withdrawal mechanics, derived from the deployed (hash-verified) program surface.
 *
 * The instruction set of commit 1d146d70… is exactly:
 *   initVault, updateReserveAllocation, deposit, buy, withdraw, sell, invest, investWithMaxAmount,
 *   updateVaultConfig, withdrawPendingFees, updateAdmin, giveUpPendingFees,
 *   initializeSharesMetadata, updateSharesMetadata, withdrawFromAvailable, removeAllocation,
 *   initGlobalConfig, updateGlobalConfig, updateGlobalConfigAdmin, addUpdateWhitelistedReserve,
 *   topupRewards, withdrawRewards, redeemInKind
 *
 * There is NO queue, FIFO, pending-withdrawal, request, epoch, cooldown or unstake construct anywhere
 * in the IDL. Because the IDL belongs to the verified deployed commit, that is now a property of the
 * DEPLOYED BINARY, not merely of some source we read.
 */
export const WITHDRAWAL_MECHANICS = {
  version: "1.0.0",
  vaultAddress: L1_BINDING.vaultAddress,
  boundToVerifiedCommit: "1d146d7087a76edbbadc14d848ae14295c0745a4",
  sourceSlot: L1_EVIDENCE_SLOT,
  evidenceCutoffAt: L1_EVIDENCE_CUTOFF_AT,

  withdrawalQueueSupported: false,
  queueConfiguration: null,
  queueState: null,
  fifoSemanticsConfirmedBySource: false,
  fifoNote:
    "NOT APPLICABLE rather than unknown: no queue construct exists in the verified binary, so there is no ordering to be FIFO or otherwise. Recorded as an authoritative negative.",

  partialImmediateWithdrawalSupported: true,
  partialWithdrawalNote:
    "`withdrawFromAvailable` withdraws against the unallocated balance only. It exists — but see WITHDRAWAL_CONFIG.currentBalance: the unencumbered buffer is currently NEGATIVE, so the amount it can actually serve is ~0. The capability exists; the liquidity does not.",

  immediatelyAvailableLiquidityUsdc: 0,
  immediatelyAvailableNote:
    "Effectively zero at this slot. tokenAvailable (~69,969 USDC) is fully consumed by pendingFees (~70,038 USDC), and the buffer policy targets zero. Every practical withdrawal must therefore go through `withdraw`, which pulls from reserves.",

  liquidityDependsOnReservesPct: 100,

  remainingValueCanBeQueued: false,
  remainingValueNote:
    "There is no queue to fall back on. If a reserve lacks free liquidity for the requested amount, the withdrawal cannot be fulfilled from that reserve at that moment — it is bounded by reserve liquidity in real time, not deferred. `redeemInKind` exists as a separate exit path, but WealthSmith has NOT verified its semantics or preconditions and does not rely on it.",

  anyActiveReserveFrozenObsoleteOrRestricted: false,
  reserveStatusNote:
    "All four active reserves are status 0 (Active), emergencyMode 0, blockCtokenUsage 0 at slot 433302860. Nothing is frozen, obsolete, hidden or restricted at this slot.",

  fullExitCurrentlyPossible: false,
  fullExitNote:
    "Two of four reserves (Maple Market, Bitcoin Market) hold LESS free liquidity than the vault's position in them, so those positions cannot currently be exited in full. They are small (1.44% and 0.66% of allocation), so a typical user withdrawal would very likely be served — but 'likely served' is not 'unconditionally available'. Withdrawals must NOT be described as instant.",

  withdrawalsAreInstant: false,
  reserveLiquidityIsPermanent: false,
  reserveLiquidityNote:
    "Reserve liquidity is a live observation at one slot, driven by third-party borrowers at 78–89% utilization. It can fall at any time with no action by the vault, the user, or WealthSmith. It must never be cached, treated as a floor, or re-used as a standing fact.",
} as const;

/* ------------------------------------------------------------------ *
 * 5. Official API vault-status semantics
 * ------------------------------------------------------------------ */

/**
 * Inspected 2026-07-16: GET https://api.kamino.finance/kvaults/vaults/HDsayqAsDWy…
 *
 * THE FINDING IS A NEGATIVE, and it is decisive: the response has NO status field. Its top level is
 * exactly {address, state, programId}, and `state` is a projection of on-chain VaultState containing
 * no status/state/enabled/paused/active/halted/frozen/closed/deprecated/visibility field of any kind.
 *
 * So the premise "identify the exact status field and its enum values" cannot be satisfied — there is
 * no such field to have semantics. This is not an unresolved lookup; it is an authoritative absence,
 * and it settles the question the spec asked: the API status CANNOT be used as an eligibility gate,
 * because there is no API status.
 *
 * The API is also strictly WEAKER than on-chain state here: it omits withdrawalPenaltyBps,
 * withdrawalPenaltyLamports, unallocatedWeight and unallocatedTokensCap, all of which exist in the
 * IDL. An indexer projection that silently drops fields is not a source to prefer over the chain.
 */
export const API_STATUS_SEMANTICS = {
  version: "1.0.0",
  endpoint: "GET https://api.kamino.finance/kvaults/vaults/HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E",
  inspectedAt: "2026-07-16T15:52:00.000Z",
  httpStatus: 200,
  responseTopLevelKeys: ["address", "state", "programId"],

  statusFieldExists: false,
  statusFieldName: null,
  statusCurrentValue: null,
  knownEnumValues: null,
  officialSchemaDefiningValues: null,
  calculatedByIndexerOrOnChain:
    "The `state` object is a direct projection of on-chain VaultState (field names and raw values match a `VaultState.decode` of the account). It is a projection, NOT an indexer-calculated status — and it is a LOSSY one.",
  fieldsOmittedVsOnChain: ["withdrawalPenaltyBps", "withdrawalPenaltyLamports", "unallocatedWeight", "unallocatedTokensCap", "depositCap", "allowInvestInWhitelistedReservesOnly", "allowAllocationsInWhitelistedReservesOnly"],
  refreshBehavior: "unresolved — no cache-control or as-of/slot field is exposed in the response, so response freshness cannot be established from the response itself.",
  missingOrErrorBehavior: "unresolved — not probed. Probing 404/5xx behaviour would require requesting vaults WealthSmith has no reason to request.",
  deprecatedHiddenPermissionedFrozenClosedRepresented: false,
  representationNote:
    "With no status field, the API cannot represent a deprecated, hidden, permissioned, frozen or closed vault. A vault in any of those states would presumably still return HTTP 200 with a populated `state`. So a successful API response is NOT evidence that a vault is available.",

  usableAsEligibilityGate: false,
  usableAsEligibilityGateReason:
    "There is no status field, so there are no semantics to prove. Per the 16H-L.1 rule 'do not treat the API status as an eligibility gate until its semantics are proven', it is excluded — here because the field does not exist at all. Freshness is also unestablishable from the response, which would independently disqualify it.",
  evidenceCutoffAt: L1_EVIDENCE_CUTOFF_AT,
} as const;

/* ------------------------------------------------------------------ *
 * 6. Permissioning
 * ------------------------------------------------------------------ */

export type VaultPermissioningModel =
  | "public"
  | "permissioned"
  | "kperm_controlled"
  | "allowlist_restricted"
  | "unresolved";

/**
 * Resolved from the verified deployed binary + full on-chain VaultState.
 *
 * The complete VaultState field set was enumerated (43 fields). It contains NO depositor allowlist, no
 * kperm binding, no permission-program pubkey, and no user-scoped gate. The `deposit` instruction of
 * the verified commit takes 4 accounts and no permission account.
 *
 * WHY THIS IS A CONCLUSION AND NOT AN ABSENCE-OF-EVIDENCE FALLACY — the distinction matters, so it is
 * spelled out: normally "we found no allowlist field" would be weak, because we might be reading the
 * wrong version. Here the deployed bytecode is hash-verified against commit 1d146d70…, so the field
 * set and instruction surface we enumerated ARE the deployed ones. A user-permission check cannot be
 * enforced by a program that contains no such field and no such account. This is exhaustive
 * enumeration of a verified surface, not a failure to find something.
 *
 * TWO WHITELIST FLAGS EXIST AND ARE NOT USER PERMISSIONING — do not conflate them:
 *   allowAllocationsInWhitelistedReservesOnly = 1
 *   allowInvestInWhitelistedReservesOnly      = 1
 * These restrict which RESERVES the ALLOCATION ADMIN may deploy into (maintained via the
 * `addUpdateWhitelistedReserve` instruction at global-config level). They constrain the manager, not
 * the depositor. They are a MITIGATION on allocation-admin discretion and are recorded as such in
 * ALLOCATION_ADMIN_RUBRIC_MAPPING — not as a restriction on users.
 */
export const PERMISSIONING = {
  version: "1.0.0",
  vaultAddress: L1_BINDING.vaultAddress,
  model: "public" as VaultPermissioningModel,
  boundToVerifiedCommit: "1d146d7087a76edbbadc14d848ae14295c0745a4",
  sourceSlot: L1_EVIDENCE_SLOT,
  evidenceCutoffAt: L1_EVIDENCE_CUTOFF_AT,

  vaultStateHasDepositorAllowlist: false,
  vaultStateHasKpermBinding: false,
  vaultStateHasPermissionProgramAccount: false,
  depositInstructionTakesPermissionAccount: false,
  vaultStateFieldsEnumerated: 43,

  reserveWhitelistFlags: {
    allowAllocationsInWhitelistedReservesOnly: 1,
    allowInvestInWhitelistedReservesOnly: 1,
    appliesTo: "the allocation admin (which reserves may be used) — NOT depositors",
    maintainedBy: "addUpdateWhitelistedReserve at global-config level",
  },

  userSpecificPermissioning: false,
  failClosedRequired: false,
  failClosedNote:
    "The 16H-L.1 rule is that user-specific permissioning must fail closed, because the read-only MVP never constructs or simulates a transaction with the user's depositor account and so could not evaluate a per-user gate. That rule is not triggered: permissioning is not user-specific. Had ANY user-scoped gate been found, this would be `permissioned_user_specific` and unavailable.",

  residualUncertainty:
    "Off-chain restrictions (geofencing, front-end terms, jurisdictional blocks) are NOT visible on-chain and are NOT ruled out. This finding is about the PROGRAM's permissioning only. Remains an open questionnaire item.",
} as const;

/* ------------------------------------------------------------------ *
 * 7. Read-only deposit-state policy
 * ------------------------------------------------------------------ */

export type ReadOnlyDepositState =
  | "verified_read_only_available"
  | "verified_read_only_unavailable"
  | "conditionally_available"
  | "permissioned_user_specific"
  | "unknown_without_transaction_simulation";

export interface DepositStateInputs {
  /** Whether an API status field exists AND its semantics are proven. */
  apiStatusSemanticsProven: boolean;
  apiStatusValue: string | null;
  /** Whether the evidence is fresh enough to act on. */
  evidenceFresh: boolean;
  /** Whether the vault identity is exactly bound (address + mint + program + verified binary). */
  vaultIdentityVerified: boolean;
  minDepositKnown: boolean;
  capacityVerifiedUncapped: boolean;
  /** Unencumbered buffer headroom, USDC. May be negative. */
  bufferHeadroomUsdc: number;
  /** Whether at least one active reserve can accept more deposits. */
  activeReserveHeadroomExists: boolean;
  allActiveReservesHealthy: boolean;
  permissioning: VaultPermissioningModel;
  userSpecificPermissioning: boolean;
}

/**
 * THE CANONICAL WEALTHSMITH READ-ONLY DEPOSIT-STATE POLICY.
 *
 * Deliberately NOT "can a deposit be constructed" — the read-only MVP never constructs or simulates a
 * transaction, and never will. The question this answers is narrower and honest: *on read-only
 * evidence alone, is WealthSmith entitled to RECOMMEND this product?*
 *
 * The gap between the two is real. Only a simulation can prove a specific deposit by a specific user
 * would succeed. So the best attainable outcome for any product under this policy is
 * `verified_read_only_available`, meaning: every read-only precondition is satisfied and nothing
 * observable blocks a deposit. It never means "a deposit is guaranteed to succeed."
 *
 * FAIL-CLOSED LADDER — order matters; the first match wins:
 *   1. user-specific permissioning     → permissioned_user_specific  (cannot evaluate without the user's account)
 *   2. permissioning unresolved        → unknown_without_transaction_simulation
 *   3. stale evidence                  → unknown_without_transaction_simulation  (never act on stale state)
 *   4. identity unverified             → unknown_without_transaction_simulation
 *   5. minimum deposit unknown         → unknown_without_transaction_simulation
 *   6. capacity NOT verified uncapped  → verified_read_only_unavailable
 *   7. an active reserve unhealthy     → verified_read_only_unavailable  (observed blocker)
 *   8. no reserve headroom AND no buffer headroom → verified_read_only_unavailable
 *   9. everything above satisfied      → verified_read_only_available
 *
 * `conditionally_available` is reserved for a product whose availability depends on a condition
 * WealthSmith can state and check at suggestion time (e.g. an amount ceiling). It is intentionally not
 * reachable for Steakhouse today; it exists so a future product is not forced into a wrong bucket.
 */
export const DEPOSIT_STATE_POLICY = {
  version: "1.0.0",
  question: "On read-only evidence alone, is WealthSmith entitled to recommend this product?",
  neverAnswers: "Whether a specific user's deposit transaction would succeed. That requires simulation, which the read-only MVP does not and will not perform.",
  rules: [
    "verified_uncapped does NOT imply available — capacity is one input, not a verdict.",
    "The absence of a pause flag does NOT imply available — nothing to pause is not permission to proceed.",
    "Readable accounts do NOT imply available — a 200 response and a decodable account prove the vault exists, nothing more.",
    "API status is insufficient unless its semantics are authoritative. For this vault no status field exists at all, so it contributes nothing.",
    "Stale evidence fails closed.",
    "Permissioned / user-specific eligibility fails closed.",
    "Anything that would need simulation to settle stays unknown.",
    "No simulation or transaction-construction code may be added to satisfy this policy.",
  ],
  /** The exact conjunction sufficient for WealthSmith to recommend. All must hold. */
  sufficientEvidenceForRecommendation: [
    "vault identity verified (address + deposit mint + program + hash-verified binary)",
    "permissioning is `public` and NOT user-specific",
    "evidence is fresh at suggestion time",
    "minimum deposit is known",
    "capacity is verified_uncapped (or a verified cap with headroom)",
    "at least one active reserve has deposit headroom, or the buffer does",
    "every active reserve is healthy (status Active, no emergency mode, ctoken usage not blocked)",
  ],
  note:
    "This governs DEPOSIT availability only. It is NOT an approval, and it is NOT sufficient for a suggestion on its own: the product must independently pass human risk review. Steakhouse currently satisfies this deposit-state policy while remaining unapproved and unsuggestible — the two gates are orthogonal by design.",
} as const;

export interface DepositStateResult {
  state: ReadOnlyDepositState;
  reason: string;
  /** Always false here. Deposit availability is NEVER an approval. */
  impliesApproval: false;
  /** Always false. Deposit availability is NEVER sufficient to suggest. */
  sufficientToSuggest: false;
}

/** Pure and deterministic — no network, no clock, no simulation. */
export function evaluateReadOnlyDepositState(i: DepositStateInputs): DepositStateResult {
  const no = (state: ReadOnlyDepositState, reason: string): DepositStateResult => ({ state, reason, impliesApproval: false, sufficientToSuggest: false });

  if (i.userSpecificPermissioning || i.permissioning === "permissioned" || i.permissioning === "kperm_controlled" || i.permissioning === "allowlist_restricted") {
    return no("permissioned_user_specific", "Eligibility is user-specific. The read-only MVP has no user depositor account and performs no simulation, so it cannot evaluate this. Fails closed.");
  }
  if (i.permissioning === "unresolved") {
    return no("unknown_without_transaction_simulation", "The permissioning model is unresolved. Fails closed rather than assuming public access.");
  }
  if (!i.evidenceFresh) {
    return no("unknown_without_transaction_simulation", "Evidence is stale. Reserve liquidity, allocation weights and fees all change without notice, so stale state is not a basis for a recommendation.");
  }
  if (!i.vaultIdentityVerified) {
    return no("unknown_without_transaction_simulation", "Vault identity is not fully verified (address + deposit mint + program + verified binary).");
  }
  if (!i.minDepositKnown) {
    return no("unknown_without_transaction_simulation", "The minimum deposit is unknown, so WealthSmith cannot tell whether a suggested amount would even be accepted.");
  }
  if (!i.capacityVerifiedUncapped) {
    return no("verified_read_only_unavailable", "Capacity is not verified as uncapped and no verified headroom was supplied.");
  }
  if (!i.allActiveReservesHealthy) {
    return no("verified_read_only_unavailable", "At least one active reserve is obsolete, hidden, in emergency mode, or has ctoken usage blocked — an OBSERVED blocker, not an inference.");
  }
  if (!i.activeReserveHeadroomExists && i.bufferHeadroomUsdc <= 0) {
    return no("verified_read_only_unavailable", "Neither an active reserve nor the unallocated buffer has headroom to accept a deposit.");
  }
  return no("verified_read_only_available", "Every read-only precondition is satisfied: identity verified against a hash-verified binary, permissioning public and not user-specific, evidence fresh, minimum known, capacity verified uncapped, reserves healthy with headroom. This means nothing observable blocks a deposit — NOT that a specific deposit would succeed, and NOT that the product may be recommended (risk review is a separate, unmet gate).");
}

/** The current inputs for the exact Steakhouse vault, at the 16H-L.1 cutoff. */
export const STEAKHOUSE_DEPOSIT_STATE_INPUTS: DepositStateInputs = {
  apiStatusSemanticsProven: false,
  apiStatusValue: null,
  evidenceFresh: true,
  vaultIdentityVerified: true,
  minDepositKnown: true,
  capacityVerifiedUncapped: true,
  bufferHeadroomUsdc: -69.184706,
  activeReserveHeadroomExists: true,
  allActiveReservesHealthy: true,
  permissioning: "public",
  userSpecificPermissioning: false,
};

export function getSteakhouseDepositState(): DepositStateResult {
  return evaluateReadOnlyDepositState(STEAKHOUSE_DEPOSIT_STATE_INPUTS);
}

/* ------------------------------------------------------------------ *
 * 8. Allocation-admin evidence → rubric mapping
 * ------------------------------------------------------------------ */

export interface AllocationAdminRubricMapping {
  dimension: RiskRubricV1DimensionId;
  whyThisDimension: string;
  evidenceForReviewer: string[];
  mitigationsTheReviewerMustAlsoWeigh: string[];
  /** Whether the approved rubric defines this evidence as a mandatory blocker for this dimension. */
  isRubricDefinedBlocker: boolean;
  blockerReasoning: string;
}

/**
 * THE MODELLING REQUIREMENT OF 16H-L.1, stated as code.
 *
 * The upgrade authority turned out to be strongly controlled (5-of-10, 24h time lock). The allocation
 * admin did not (a raw keypair, no multisig, no time lock). The failure mode to avoid is letting the
 * first fact bury the second — "authority risk" is NOT globally complete, and there is deliberately no
 * aggregate "authority risk" verdict anywhere in this module.
 *
 * The allocation admin is routed to the dimensions that actually govern it. It is NOT routed to
 * `upgrade_admin_authority`: that dimension's blockers are specifically about the UPGRADE authority,
 * and they are genuinely absent. Stretching them to cover the allocation admin would misuse the
 * approved rubric — the right move is to surface the evidence under the dimensions that own it, and
 * let the reviewer weigh it.
 *
 * NOT A DISQUALIFIER. Rubric v1 defines no mandatory blocker of the form "single-key manager
 * authority", so per 16H-L.1 this is NOT treated as a verified disqualifying condition. It is material
 * evidence for the reviewer, and no score is assigned here.
 */
export const ALLOCATION_ADMIN_RUBRIC_MAPPING: AllocationAdminRubricMapping[] = [
  {
    dimension: "manager_discretion",
    whyThisDimension:
      "This dimension governs what a manager may unilaterally do with user funds. The allocation admin IS the manager: it decides which reserves hold user USDC, and it is a single on-curve keypair that signs directly with no multisig and no time lock.",
    evidenceForReviewer: [
      "CuEC7JoZtHx9v5MQWrNTsLSGMEixbCEvTX6K6kWZzz7q is ON-curve — a keypair address, verified via ed25519 curve membership.",
      "Its transaction history shows it as the SOLE signer, invoking the kvault program directly with no Squads program involved. Unlike the upgrade and vault-admin authorities, it is not a Squads vault PDA.",
      "No time lock: allocation changes take effect immediately with no window for a user to react.",
      "OBSERVED DRIFT across three independent reads with no user action: SOL/BTC weight 74.2% (16H-J) → 69.37% (16H-L) → 87.61% (16H-L.1). Reallocation is not theoretical; it is routine and ongoing.",
      "The vault currently holds ~20.7M USDC of user funds across four reserves under this key's direction.",
      "It can add or remove reserves from the allocation strategy (21 of 25 slots are free).",
    ],
    mitigationsTheReviewerMustAlsoWeigh: [
      "allowAllocationsInWhitelistedReservesOnly = 1 and allowInvestInWhitelistedReservesOnly = 1 on the verified binary: allocations are restricted to a whitelist maintained at GLOBAL-CONFIG level via addUpdateWhitelistedReserve — i.e. NOT by the allocation admin itself. This meaningfully bounds the blast radius: the key can move funds AMONG whitelisted reserves, not to arbitrary ones. WealthSmith has NOT enumerated the whitelist contents or verified who controls global config, so the strength of this bound is itself unverified.",
      "The allocation admin cannot withdraw user funds to itself — no instruction in the verified binary permits it. Its power is redirection between reserves, not extraction.",
      "Per-reserve tokenAllocationCap values are set for two reserves (Maple 25M, Bitcoin 10M), bounding concentration in those.",
    ],
    isRubricDefinedBlocker: false,
    blockerReasoning:
      "Rubric v1's manager_discretion mandatory blockers do not include 'single-key manager authority'. Per the explicit 16H-L.1 instruction, a raw allocation-admin key is NOT automatically a verified disqualifier. It is material evidence the reviewer must weigh — not a mechanical fail, and not a score.",
  },
  {
    dimension: "operational_dependency_risk",
    whyThisDimension:
      "The vault's target state depends on an off-chain crank calling `invest`, driven by this same single key. Its liveness and key hygiene are operational dependencies of the product.",
    evidenceForReviewer: [
      "lastInvestSlot is identical (433302017) across all four reserves — consistent with a single crank operating them together.",
      "unallocatedWeight = 0 means the vault targets zero buffer, so it depends on the crank to deploy deposits rather than leaving them idle.",
      "The key is an actively-used hot operational wallet (~11.9 SOL balance, frequent transactions), which is a different key-hygiene posture from a cold multisig signer.",
      "Compromise or loss of this single key is an operational risk that no on-chain control mitigates — no time lock, no threshold.",
    ],
    mitigationsTheReviewerMustAlsoWeigh: [
      "The reserve whitelist bounds where a compromised key could send funds.",
      "The key cannot extract funds, only redirect them among whitelisted reserves.",
    ],
    isRubricDefinedBlocker: false,
    blockerReasoning:
      "No rubric v1 operational_dependency_risk blocker matches this evidence. Recorded for the reviewer; not scored.",
  },
];

/**
 * The explicit statement that authority risk is NOT globally resolved.
 *
 * Exported so a fixture can assert it and a reader cannot miss it.
 */
export const AUTHORITY_RISK_IS_NOT_GLOBALLY_COMPLETE = {
  globallyComplete: false,
  perAuthorityConclusions: [
    { authority: "program_upgrade_authority", conclusion: "Squads v4 vault PDA, 5-of-10, 24h time lock, config_authority default. Strongly controlled. Its rubric dimension (upgrade_admin_authority) has no remaining blocker.", strength: "strong" },
    { authority: "vault_admin_authority", conclusion: "Squads v4 vault PDA, 3-of-10, NO time lock. Multisig-gated but materially weaker than the upgrade authority: fee, cap and minimum changes take effect immediately.", strength: "moderate" },
    { authority: "allocation_admin", conclusion: "Raw on-curve keypair, no multisig, no time lock, directing ~20.7M USDC across reserves, with observed ongoing reallocation. Bounded by a reserve whitelist it does not itself control. This is the weakest authority on the vault and it remains a distinct, material, unresolved fact.", strength: "weak" },
  ],
  warning:
    "The strong upgrade-authority controls MUST NOT be read as resolving authority risk generally. Three authorities, three different control models, three separate conclusions. Collapsing them into one verdict would hide the weakest link behind the strongest — which is precisely the error 16H-L.1 exists to prevent.",
} as const;

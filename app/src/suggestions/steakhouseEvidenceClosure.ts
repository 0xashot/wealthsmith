/**
 * steakhouseEvidenceClosure — Step 16H-L. The evidence-closure artifacts for the exact Steakhouse USDC
 * vault: authority control model, permission surface, reserve exposure, audit linkage, withdrawal
 * semantics, incident review, deposit-state semantics, the review-readiness evaluator, and the Kamino
 * outreach questionnaire.
 *
 * This assigns NO score, fills NO worksheet, completes NO review, signs off NOTHING, approves NOTHING.
 * It reports what primary sources prove, and preserves — precisely — what they do not.
 *
 * EVERY factual claim below is bound to the exact vault and carries its source + cutoff. Where a fact
 * could not be established, it is recorded as unresolved with the exact evidence that would resolve it.
 * Absence of evidence is never recorded as favourable evidence.
 */
import type { RiskRubricV1DimensionId } from "./riskGovernance";

export const STEAKHOUSE_EVIDENCE_CLOSURE_VERSION = "1.0.0" as const;
/** Live read-only mainnet reads for this step. Facts age; this is the cutoff. */
export const CLOSURE_EVIDENCE_CUTOFF_AT = "2026-07-16T12:40:00.000Z";
export const CLOSURE_EVIDENCE_SLOT = "433291120";

/* ---- Exact product binding. Every artifact below is bound to THIS vault only. ---- */
export const CLOSURE_BINDING = {
  strategyId: "kamino_steakhouse_usdc",
  vaultAddress: "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E",
  sharesMint: "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS",
  depositMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  programId: "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd",
  reviewedSourceRelease: "release/v2.2.2",
  reviewedSourceCommit: "1d146d7087a76edbbadc14d848ae14295c0745a4",
  sdkVersion: "@kamino-finance/klend-sdk 9.1.2",
  idlVersion: "kamino_vault 2.2.1",
} as const;

/* ------------------------------------------------------------------ *
 * 1. Authority control model
 * ------------------------------------------------------------------ */

/** How an authority is actually controlled, per ON-CHAIN evidence. Never inferred from importance. */
export type AuthorityControlModel =
  | "externally_owned_account_single_key"
  | "onchain_multisig"
  | "governance_program"
  | "program_derived_authority"
  | "immutable_none"
  | "unknown";

export interface AuthorityEvidence {
  role: string;
  address: string;
  /** The program that OWNS the authority account — the decisive evidence for the control model. */
  ownerProgram: string;
  controlModel: AuthorityControlModel;
  /** What the on-chain read proves. */
  proves: string;
  /** What it explicitly does NOT prove. The most important field here. */
  doesNotProve: string;
  timelockStatus: "verified_timelocked" | "verified_no_timelock" | "unknown";
  evidenceCutoffAt: string;
}

/**
 * VERIFIED 2026-07-16 by reading each authority account's owner program.
 *
 * A Squads multisig account is owned by the Squads program; an SPL-Governance authority is owned by the
 * governance program; a PDA is owned by its program. All three privileged authorities here are owned by
 * the **System Program** with **zero data bytes** — the signature of a plain keypair account.
 *
 * THE LIMIT OF THIS EVIDENCE, stated plainly: this proves there is no ON-CHAIN multisig or governance
 * program gating these authorities. It does NOT prove a single human holds the key. An off-chain
 * threshold/MPC custody arrangement (Fireblocks, Turnkey, a shared HSM) is indistinguishable from a
 * single keypair on-chain. That distinction matters enormously and only Kamino can settle it.
 */
export const AUTHORITY_EVIDENCE: AuthorityEvidence[] = [
  {
    role: "program_upgrade_authority",
    address: "GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW",
    ownerProgram: "11111111111111111111111111111111",
    controlModel: "externally_owned_account_single_key",
    proves: "The upgrade authority for the kvault program is a System-Program-owned account with 0 data bytes. It is NOT a Squads multisig, NOT SPL Governance, NOT a PDA. A keypair signature can replace the program bytecode that custodies user funds.",
    doesNotProve: "Whether the private key is held under an off-chain threshold/MPC scheme. An MPC wallet is indistinguishable from a single keypair on-chain. Only Kamino can confirm the custody model.",
    timelockStatus: "unknown",
    evidenceCutoffAt: CLOSURE_EVIDENCE_CUTOFF_AT,
  },
  {
    role: "vault_admin_authority",
    address: "9ceRgz579BcfWogs3RE11FKNQaWW7Lmtnev3MXspxUjF",
    ownerProgram: "11111111111111111111111111111111",
    controlModel: "externally_owned_account_single_key",
    proves: "The vault admin is a System-Program-owned keypair account, not an on-chain multisig or governance authority. `pendingAdmin` currently equals the same account.",
    doesNotProve: "Off-chain custody model; whether admin actions are announced or delayed operationally.",
    timelockStatus: "unknown",
    evidenceCutoffAt: CLOSURE_EVIDENCE_CUTOFF_AT,
  },
  {
    role: "allocation_admin",
    address: "CuEC7JoZtHx9v5MQWrNTsLSGMEixbCEvTX6K6kWZzz7q",
    ownerProgram: "11111111111111111111111111111111",
    controlModel: "externally_owned_account_single_key",
    proves: "The allocation admin — which controls where user USDC is deployed — is a System-Program-owned keypair account with an ~11.9 SOL balance (an actively-used operational wallet), not an on-chain multisig.",
    doesNotProve: "Off-chain custody model; whether allocation changes are announced, delayed, or bounded by policy.",
    timelockStatus: "unknown",
    evidenceCutoffAt: CLOSURE_EVIDENCE_CUTOFF_AT,
  },
  {
    role: "base_vault_authority",
    address: "AyY6VCkHfTWdFs7SqBbu6AnCqLUhgzVHBzW3WcJu5Jc8",
    ownerProgram: "(account does not exist on-chain)",
    controlModel: "program_derived_authority",
    proves: "The account is uninitialised, consistent with a PDA used purely as a signing authority derived by the program. It holds no state of its own.",
    doesNotProve: "The exact PDA seeds were not independently re-derived in this step.",
    timelockStatus: "unknown",
    evidenceCutoffAt: CLOSURE_EVIDENCE_CUTOFF_AT,
  },
];

/* ------------------------------------------------------------------ *
 * 2. Authority permission surface (from the reviewed program source)
 * ------------------------------------------------------------------ */

export interface AuthorityPermission {
  power: string;
  /** Which role the reviewed source lets perform it. */
  heldBy: "program_upgrade_authority" | "vault_admin_authority" | "allocation_admin" | "kamino_global_config" | "unknown";
  supportedByProgramSource: boolean;
  /** Whether that power is proven to be gated by a multisig or timelock for THIS vault. */
  controlProven: false;
  note: string;
}

/**
 * Deliberately NOT collapsed into one "admin risk" statement. Program upgrade, vault admin, allocation
 * admin, and the protocol-level GlobalConfig are four distinct surfaces with different blast radii.
 *
 * `controlProven` is hard-coded `false` across the board: no authority's control model is proven (see
 * AUTHORITY_EVIDENCE), so no power can be described as safely gated.
 */
export const AUTHORITY_PERMISSIONS: AuthorityPermission[] = [
  { power: "replace the entire program bytecode holding user funds", heldBy: "program_upgrade_authority", supportedByProgramSource: true, controlProven: false, note: "The largest blast radius: an upgrade can change every rule below. Verified upgradeable via the BPF upgradeable loader with an active authority." },
  { power: "change reserve allocations / weights", heldBy: "allocation_admin", supportedByProgramSource: true, controlProven: false, note: "OBSERVED IN PRACTICE: allocation weights changed between the 16H-J and 16H-L reads with no user action (see RESERVE_EXPOSURE.allocationIsDynamic)." },
  { power: "add or remove reserves from the allocation strategy", heldBy: "allocation_admin", supportedByProgramSource: true, controlProven: false, note: "25 allocation slots exist; 4 are active. A reserve in a market WealthSmith has not reviewed could be added." },
  { power: "change the deposit cap", heldBy: "vault_admin_authority", supportedByProgramSource: true, controlProven: false, note: "Capacity is currently verified_uncapped (deposit_cap = 0 → u64::MAX). The admin can set a real cap." },
  { power: "change min deposit / min withdraw / min invest", heldBy: "vault_admin_authority", supportedByProgramSource: true, controlProven: false, note: "min_deposit_amount is enforced in the deposit path." },
  { power: "change management / performance fees", heldBy: "vault_admin_authority", supportedByProgramSource: true, controlProven: false, note: "Currently 0 bps / 500 bps. computeNetAPR deducts both from the APY WealthSmith surfaces." },
  { power: "set withdrawal penalty parameters", heldBy: "kamino_global_config", supportedByProgramSource: true, controlProven: false, note: "MATERIAL: `calculate_withdrawal_penalty_params(global_config, vault)` sources a penalty from a PROTOCOL-LEVEL GlobalConfig plus vault state. This is an exit cost that the SDK's net APY does NOT include. Its current value is UNRESOLVED (the GlobalConfig account was not read)." },
  { power: "transfer vault administration (pendingAdmin handoff)", heldBy: "vault_admin_authority", supportedByProgramSource: true, controlProven: false, note: "pendingAdmin currently equals the existing admin." },
  { power: "pause or restrict DEPOSITS", heldBy: "unknown", supportedByProgramSource: false, controlProven: false, note: "No pause/enabled/halt/emergency/status field or check exists anywhere in the reviewed source. See DEPOSIT_STATE." },
  { power: "pause or restrict WITHDRAWALS", heldBy: "unknown", supportedByProgramSource: false, controlProven: false, note: "No withdrawal pause mechanism was found in the reviewed source. Withdrawal availability instead depends on reserve liquidity." },
];

/* ------------------------------------------------------------------ *
 * 3. Reserve exposure snapshot (slot-bound)
 * ------------------------------------------------------------------ */

export interface ReserveExposure {
  reserveAddress: string;
  lendingMarket: string;
  /** Resolved from Kamino's OFFICIAL market list — never guessed from the address. */
  marketName: string | null;
  liquidityMint: string;
  liquidityMintIsCanonicalUsdc: boolean;
  collateralMint: string;
  scopeOracleFeed: string;
  targetAllocationWeight: number;
  allocationSharePct: number;
  tokenAllocationCapRaw: string;
  active: boolean;
}

/**
 * The exposure snapshot. Slot-bound and NON-PERMANENT: the allocation admin can change it at any time.
 *
 * THE FINDING THAT MATTERS: the vault only ever holds USDC, but it SUPPLIES that USDC into lending
 * markets whose BORROWERS post different collateral. So the credit risk is exposure to JLP, SOL/BTC and
 * Bitcoin collateral markets — if collateral there collapses and liquidations fail, the USDC suppliers
 * (this vault, and therefore the user) bear the bad debt. Four USDC reserves are NOT equivalent.
 */
export const RESERVE_EXPOSURE = {
  version: "1.0.0",
  vaultAddress: CLOSURE_BINDING.vaultAddress,
  sourceSlot: CLOSURE_EVIDENCE_SLOT,
  evidenceCutoffAt: CLOSURE_EVIDENCE_CUTOFF_AT,
  activeSlots: 4,
  totalSlots: 25,
  /** PROVEN, not asserted: the weights moved between two reads with no user action. */
  allocationIsDynamic: true,
  allocationDriftEvidence:
    "16H-J read (slot 433263778): ~23.0% / ~74.2% / ~1.8% / ~1.0%. 16H-L read (slot 433291120): 29.37% / 69.37% / 0.00% / 1.26%. The allocation changed between reads with no user action — the allocation admin controls it, and a snapshot is a point in time, not a commitment.",
  reserves: [
    { reserveAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59", lendingMarket: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF", marketName: "SOL/BTC Market", liquidityMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", liquidityMintIsCanonicalUsdc: true, collateralMint: "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D", scopeOracleFeed: "3t4JZcueEzTbVP6kLxXrL3VpWx45jDer4eqysweBchNH", targetAllocationWeight: 693703, allocationSharePct: 69.37, tokenAllocationCapRaw: "18446744073709551615", active: true },
    { reserveAddress: "Ga4rZytCpq1unD4DbEJ5bkHeUz9g3oh9AAFEi6vSauXp", lendingMarket: "DxXdAyU3kCjnyggvHmY5nAwg5cRbbmdyX3npfDMjjMek", marketName: "JLP Market", liquidityMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", liquidityMintIsCanonicalUsdc: true, collateralMint: "32XLsweyeQwWgLKRVAzS72nxHGU1JmmNQQZ3C3q6fBjJ", scopeOracleFeed: "3t4JZcueEzTbVP6kLxXrL3VpWx45jDer4eqysweBchNH", targetAllocationWeight: 293705, allocationSharePct: 29.37, tokenAllocationCapRaw: "18446744073709551615", active: true },
    { reserveAddress: "Atj6UREVWa7WxbF2EMKNyfmYUY1U1txughe2gjhcPDCo", lendingMarket: "(not resolved in this read)", marketName: null, liquidityMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", liquidityMintIsCanonicalUsdc: true, collateralMint: "(not resolved)", scopeOracleFeed: "3t4JZcueEzTbVP6kLxXrL3VpWx45jDer4eqysweBchNH", targetAllocationWeight: 12592, allocationSharePct: 1.26, tokenAllocationCapRaw: "25000000000000", active: true },
    { reserveAddress: "9FRZvAsjDJ6WM8BJ2S45h9PoDCLAq8DNY9zZDX7MyGzT", lendingMarket: "GMqmFygF5iSm5nkckYU6tieggFcR42SyjkkhK5rswFRs", marketName: "Bitcoin Market", liquidityMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", liquidityMintIsCanonicalUsdc: true, collateralMint: "5J8om3Mwx8FGuu3GaD29ibRLtjX9z1ZK3oX112ruUheG", scopeOracleFeed: "3t4JZcueEzTbVP6kLxXrL3VpWx45jDer4eqysweBchNH", targetAllocationWeight: 0, allocationSharePct: 0, tokenAllocationCapRaw: "10000000000000", active: false },
  ] as ReserveExposure[],
  unresolved: [
    "The 4th reserve (Atj6URE…, 1.26%) was not resolved to its lending market or collateral mint.",
    "Each market's COLLATERAL-side oracles, liquidation parameters and borrower composition were not enumerated. The Scope feed recorded per reserve is the USDC liquidity price, not the collateral price.",
    "Bad-debt / socialised-loss behaviour in each market was not reviewed.",
  ],
  invalidationTriggers: ["any allocation change by the allocation admin", "a reserve added or removed", "a market parameter change", "a program upgrade"],
} as const;

/* ------------------------------------------------------------------ *
 * 4. Audit → deployment linkage
 * ------------------------------------------------------------------ */

export type AuditLinkageResult =
  | "verified_exact_deployment_linkage"
  | "verified_release_family_linkage"
  | "partial_linkage"
  | "unverified_linkage"
  | "conflicting_linkage";

export const AUDIT_LINKAGE = {
  version: "1.0.0",
  programId: CLOSURE_BINDING.programId,
  audits: [
    { auditor: "Offside Labs", reportDate: "2025-04-12", scope: "Kamino Earn Vaults", auditedCommit: null, allocationLogicInScope: "unknown", withdrawalLogicInScope: "unknown", adminControlsInScope: "unknown" },
    { auditor: "Sec3", reportDate: "2025-02-06", scope: "Kamino Earn Vaults", auditedCommit: null, allocationLogicInScope: "unknown", withdrawalLogicInScope: "unknown", adminControlsInScope: "unknown" },
    { auditor: "OtterSec", reportDate: "2024-12-09", scope: "Kamino Earn Vaults", auditedCommit: null, allocationLogicInScope: "unknown", withdrawalLogicInScope: "unknown", adminControlsInScope: "unknown" },
  ],
  deployedEvidence: {
    programDataAccount: "GeZ7nkkcbJ6VVV1XVFbmFnLCY3F1LPBGk6cufDZvrbGn",
    lastDeployedSlot: "432874668",
    lastDeployedApprox: "~2026-07-14 (about 2 days before the evidence cutoff)",
    reviewedSourceRelease: CLOSURE_BINDING.reviewedSourceRelease,
    reviewedSourceCommit: CLOSURE_BINDING.reviewedSourceCommit,
    reproducibleBuildAvailable: false,
    programHashVerified: false,
  },
  result: "unverified_linkage" as AuditLinkageResult,
  reasoning:
    "Kamino's official audit inventory publishes NO audited commit, tag, or release for any of the three Earn Vaults audits. The deployed bytecode was last written at slot 432874668, roughly two days before the cutoff, and no reproducible build or published program hash exists to relate it to any audited source. A matching program NAME and a plausible date are not linkage. The source we reviewed (release/v2.2.2, committed 2026-07-08) is chronologically consistent with that deployment — but chronological consistency is a hypothesis, not evidence.",
  whatWouldResolveIt: [
    "The exact commit/tag currently deployed at KvauGMspG5k…",
    "Which audit report covers that exact commit",
    "A reproducible-build procedure or a published program hash we can verify independently",
    "Confirmation that all critical findings were remediated in the deployed version",
    "Whether managed-allocation and withdrawal logic were in each audit's scope",
  ],
  invalidationTriggers: ["any program upgrade", "a new audit", "a newly published audited commit"],
} as const;

/* ------------------------------------------------------------------ *
 * 5. Withdrawal semantics
 * ------------------------------------------------------------------ */

export const WITHDRAWAL_SEMANTICS = {
  version: "1.0.0",
  vaultAddress: CLOSURE_BINDING.vaultAddress,
  sourceRelease: CLOSURE_BINDING.reviewedSourceRelease,
  sourceCommit: CLOSURE_BINDING.reviewedSourceCommit,
  minWithdrawRaw: "1000",
  minWithdrawUsdc: 0.001,
  /** PROVEN from the reviewed source. Never asserted from UI behaviour. */
  programGuarantees: [
    "The withdraw path rejects zero shares (CannotWithdrawZeroShares) and zero lamports (CannotWithdrawZeroLamports).",
    "A WITHDRAWAL PENALTY is applied: `get_withdrawal_penalty(vault, global_config, amount)` = max(amount × penalty_bps / FULL_BPS, penalty_lamports). A withdrawal whose value is below the penalty is rejected (WithdrawAmountLessThanWithdrawalPenalty).",
    "No deposit-style pause or withdrawal-disable flag exists in the reviewed source.",
  ],
  sdkModels: [
    "`VaultHoldings` models `queuedForWithdrawalForReserves`, i.e. cTokens queued for withdrawal per reserve — so redemption can depend on unwinding reserve positions rather than being unconditionally immediate.",
  ],
  /** The single most important line: what we must NOT claim. */
  instantWithdrawalClaim: "NOT PROVEN. The reviewed source does not establish unconditional immediate redemption. Withdrawal draws on uninvested vault tokens first and otherwise depends on liquidity in the underlying reserves — which are lending markets whose liquidity varies with borrower utilisation. Instant liquidity must not be claimed.",
  unresolved: [
    "MATERIAL: the CURRENT withdrawal penalty value is unresolved — `penalty_bps`/`penalty_lamports` derive from a protocol-level GlobalConfig account that was not read. This is an EXIT COST that the SDK's net APY does NOT include, so the surfaced APY does not represent it.",
    "Exact conditions under which a withdrawal is queued vs immediate.",
    "Queue ordering, cancellation, and cooldown behaviour.",
    "Whether a withdrawal can be partially fulfilled, and what the user receives if so.",
    "Whether the user can ever receive an asset other than USDC.",
    "Performance-fee crystallisation behaviour on exit.",
    "Emergency withdrawal behaviour.",
    "Whether behaviour differs when vault shares are farm-staked (wallet/kaminoVaults.ts shows shares CAN be farm-staked).",
  ],
  invalidationTriggers: ["program upgrade", "GlobalConfig penalty change", "vault fee change"],
} as const;

/* ------------------------------------------------------------------ *
 * 6. Incident review
 * ------------------------------------------------------------------ */

export type IncidentReviewState =
  | "confirmed_incident_found"
  | "no_confirmed_incident_found_within_review_scope"
  | "review_incomplete"
  | "conflicting_reports";

export const INCIDENT_REVIEW = {
  version: "1.0.0",
  state: "review_incomplete" as IncidentReviewState,
  cutoffAt: CLOSURE_EVIDENCE_CUTOFF_AT,
  scopeReviewed: [
    "Kamino's official security documentation index (security overview, audits, formal verification, fuzzing, bug bounty)",
    "Kamino's official risk documentation index",
  ],
  scopeNotReviewed: [
    "Official Kamino incident disclosures or postmortems (no such index was located)",
    "The kvault program's own incident history",
    "The four active reserves and their lending markets",
    "The Scope oracle aggregator",
    "The allocation-admin operator's history",
    "Bug-bounty disclosures and their remediation",
  ],
  confirmedIncidents: [],
  /** The rule that keeps this honest. */
  absenceInterpretation:
    "No confirmed incident was found — but the review scope above is INCOMPLETE, so this is `review_incomplete`, NOT `no_confirmed_incident_found_within_review_scope`, and emphatically not a clean record. Kamino publishes no incident/postmortem index we could locate; a null result from an incomplete search is missing evidence.",
  whatWouldResolveIt: [
    "An official Kamino incident/postmortem index, or written confirmation of incident history for this vault, the kvault program, and the active reserves",
    "Bug-bounty disclosure history with remediation status",
  ],
  invalidationTriggers: ["any new incident", "cutoff older than the review-freshness policy"],
} as const;

/* ------------------------------------------------------------------ *
 * 7. Deposit-state semantics
 * ------------------------------------------------------------------ */

export type DepositStateFinding =
  | "verified_enabled"
  | "verified_disabled"
  | "verified_no_explicit_deposit_state_control"
  | "conditionally_available"
  | "unknown";

export const DEPOSIT_STATE = {
  version: "1.0.0",
  vaultAddress: CLOSURE_BINDING.vaultAddress,
  sourceRelease: CLOSURE_BINDING.reviewedSourceRelease,
  /**
   * RESOLVED — but read the two fields below together, because they answer DIFFERENT questions.
   *
   * `programMechanismFinding` answers "does the program have a deposit switch?" → No. Verified by
   * exhaustive search of the reviewed source for pause/enabled/halt/shutdown/emergency/status: zero hits.
   *
   * `currentAvailability` answers "will a deposit succeed right now?" → Still unknown, and NOT inferable
   * from the above. The absence of a switch is not proof the light is on.
   */
  programMechanismFinding: "verified_no_explicit_deposit_state_control" as DepositStateFinding,
  currentAvailability: "unknown" as DepositStateFinding,
  /** Every condition in the reviewed deposit path that can reject a deposit. */
  depositFailureConditions: [
    "VaultDepositCapReached — max_depositable_to_cap == 0 (currently uncapped: deposit_cap = 0 → u64::MAX)",
    "DepositAmountBelowMinimum — user_tokens_to_deposit < vault.min_deposit_amount (currently 0.1 USDC)",
    "DepositAmountsZeroShares — the deposit would mint zero shares",
    "SharesOutBelowMinimum — a slippage guard on shares received",
    "Ordinary account/token/identity and arithmetic constraints, plus any CPI failure in the reserve refresh path",
  ],
  explicitStateControls: {
    depositEnabledFlag: false,
    pauseFlag: false,
    emergencyState: false,
    vaultStatusEnum: false,
    globalShutdown: false,
    adminDepositRestriction: false,
  },
  /** The distinctions that stop this becoming a false positive. */
  mustNotInfer: [
    "verified_uncapped does NOT mean verified_enabled — capacity answers 'is there room', not 'is the door open'.",
    "A successful account read does NOT mean deposits are enabled.",
    "The absence of a pause flag does NOT prove a deposit will currently succeed — it only proves the PROGRAM has no switch. Kamino could still restrict deposits operationally (front-end gating, an allowlist elsewhere, or by upgrading the program, which a single key can do).",
  ],
  transactionConstructedOrSimulated: false,
  whatWouldResolveIt: [
    "Kamino confirming whether the exact vault is currently accepting deposits",
    "Whether any off-chain or operational deposit restriction exists that is not represented on-chain",
    "A canonical API field or state an integrator should poll to detect future suspension",
  ],
  invalidationTriggers: ["program upgrade (could introduce a pause mechanism)", "vault admin action"],
} as const;

/* ------------------------------------------------------------------ *
 * 8. Review-readiness evaluator
 * ------------------------------------------------------------------ */

export type DimensionEvidenceState = "complete" | "partial" | "blocked" | "stale" | "not_applicable";

export type ReviewReadinessResult =
  | "ready_for_human_scoring"
  | "conditionally_ready_for_human_scoring"
  | "blocked_pending_protocol_confirmation"
  | "unsuitable_to_continue_review";

export interface DimensionReadiness {
  dimension: RiskRubricV1DimensionId;
  state: DimensionEvidenceState;
  mandatoryBlockerPresent: boolean;
  detail: string;
}

/** Per-dimension evidence state. Deterministic — derived from the artifacts above, not judgement. */
export const DIMENSION_READINESS: DimensionReadiness[] = [
  { dimension: "audit_security", state: "blocked", mandatoryBlockerPresent: true, detail: "Audits exist but linkage to the deployed bytecode is unverified_linkage. The rubric's blocker 'the audited version cannot be related to the deployed bytecode' is PRESENT." },
  { dimension: "upgrade_admin_authority", state: "blocked", mandatoryBlockerPresent: true, detail: "Upgrade authority IS determined (an EOA, no on-chain multisig) — so the 'cannot be determined' blocker is resolved. But the rubric's second blocker, 'an active single-key upgrade authority over user funds with no timelock', cannot be cleared: off-chain custody and timelock policy are unknown. Kamino confirmation required." },
  { dimension: "manager_discretion", state: "partial", mandatoryBlockerPresent: true, detail: "Permissions are now enumerated from the reviewed source (see AUTHORITY_PERMISSIONS), so they are no longer wholly unknown. But the rubric's blocker 'manager permissions cannot be determined' is only partly addressed: the CONTROL model for every authority is unproven, and the GlobalConfig withdrawal-penalty authority is unread." },
  { dimension: "strategy_complexity", state: "partial", mandatoryBlockerPresent: false, detail: "Current exposure IS determined: 4 reserves, weights, markets for 3 of 4. Allocation is proven dynamic. No leverage or recursive borrowing was found in the vault's own allocation strategy. The blocker 'current exposure cannot be determined' is RESOLVED; the 4th reserve's market remains a bounded gap." },
  { dimension: "composability_dependency", state: "partial", mandatoryBlockerPresent: false, detail: "Dependencies enumerated: the kvault program, KLend reserves in JLP / SOL-BTC / Bitcoin markets, and Scope. Each market's collateral, liquidation parameters and bad-debt behaviour are unreviewed — a bounded gap, not an unknown surface." },
  { dimension: "oracle_risk", state: "partial", mandatoryBlockerPresent: false, detail: "Each active reserve's USDC liquidity price uses Scope feed 3t4JZcue… (chain [13]). Collateral-side oracles for each market are not enumerated. The blocker 'oracle model cannot be established' is partly resolved: the vault-side model is known; the collateral-side is not." },
  { dimension: "liquidity_withdrawal", state: "blocked", mandatoryBlockerPresent: true, detail: "The rubric's blocker 'withdrawal model cannot be determined' remains PRESENT. A withdrawal PENALTY mechanism was found whose current value is unresolved, queue conditions are unknown, and farm-staked behaviour is unknown. Instant liquidity is NOT proven." },
  { dimension: "incident_history", state: "blocked", mandatoryBlockerPresent: true, detail: "The rubric's blocker 'no sourced incident review exists' is PRESENT. Review scope is incomplete and no official incident index was located." },
  { dimension: "asset_stablecoin_risk", state: "partial", mandatoryBlockerPresent: false, detail: "Principal is canonical USDC and every active reserve's liquidity mint is canonical USDC — verified. But the vault's credit exposure is to JLP / SOL-BTC / Bitcoin collateral markets, which is a materially different risk from 'holds USDC'." },
  { dimension: "withdrawal_fee_transparency", state: "partial", mandatoryBlockerPresent: false, detail: "mgmt 0 bps / perf 500 bps are on-chain readable and are inside the SDK's net APY. NEWLY FOUND: a withdrawal penalty from GlobalConfig + vault state is an exit cost the net APY does NOT include; its current value is unresolved." },
  { dimension: "operational_dependency_risk", state: "complete", mandatoryBlockerPresent: false, detail: "Resolved at 16H-I: official SDK/RPC source path, proven net + fraction APY, chain block time as the authoritative timestamp, validated artifact and published same-origin cache with browserFetched:false." },
  { dimension: "maturity", state: "partial", mandatoryBlockerPresent: false, detail: "The vault and program are live on mainnet, but the deployed bytecode is ~2 days old at the cutoff, which resets battle-testing regardless of protocol age." },
];

/**
 * Deterministic readiness. Assigns NO score and makes NO approval decision.
 *
 * The rule order encodes the spec's distinction precisely: `unsuitable` requires VERIFIED evidence of a
 * disqualifying condition — missing evidence can never produce it, no matter how much is missing.
 */
export function evaluateReviewReadiness(args?: {
  dimensions?: DimensionReadiness[];
  /** Set only when verified evidence itself establishes a disqualifier. Never "we couldn't find out". */
  verifiedDisqualifyingCondition?: string | null;
}): { result: ReviewReadinessResult; reason: string; blockedDimensions: string[]; protocolConfirmationRequired: string[] } {
  const dims = args?.dimensions ?? DIMENSION_READINESS;
  const disqualifier = args?.verifiedDisqualifyingCondition ?? null;

  // 1) A VERIFIED disqualifier — and only that — makes the candidate unsuitable.
  if (disqualifier) {
    return { result: "unsuitable_to_continue_review", reason: `verified disqualifying condition: ${disqualifier}`, blockedDimensions: [], protocolConfirmationRequired: [] };
  }

  const blocked = dims.filter((d) => d.state === "blocked");
  const withBlockers = dims.filter((d) => d.mandatoryBlockerPresent);
  const stale = dims.filter((d) => d.state === "stale");

  // 2) Any mandatory blocker or blocked dimension → protocol confirmation is required.
  if (blocked.length > 0 || withBlockers.length > 0) {
    return {
      result: "blocked_pending_protocol_confirmation",
      reason: `${withBlockers.length} dimension(s) carry an unresolved mandatory blocker; a direct Kamino confirmation could resolve them. Missing evidence is NOT a disqualifier — it is a blocker.`,
      blockedDimensions: blocked.map((d) => d.dimension),
      protocolConfirmationRequired: withBlockers.map((d) => d.dimension),
    };
  }
  if (stale.length > 0) {
    return { result: "blocked_pending_protocol_confirmation", reason: "stale evidence must be refreshed before scoring", blockedDimensions: stale.map((d) => d.dimension), protocolConfirmationRequired: [] };
  }

  // 3) No mandatory gaps, but bounded uncertainty remains → conditionally ready.
  if (dims.some((d) => d.state === "partial")) {
    return { result: "conditionally_ready_for_human_scoring", reason: "no mandatory evidence is missing; remaining gaps are non-mandatory and bounded", blockedDimensions: [], protocolConfirmationRequired: [] };
  }

  // 4) Everything complete.
  return { result: "ready_for_human_scoring", reason: "all mandatory evidence available; no unresolved mandatory blockers", blockedDimensions: [], protocolConfirmationRequired: [] };
}

/* ------------------------------------------------------------------ *
 * 9. Kamino outreach questionnaire
 * ------------------------------------------------------------------ */

/** Short enough to actually send. Every question is bound to the exact product. NOT sent. */
export const KAMINO_QUESTIONNAIRE = {
  version: "1.0.0",
  sent: false,
  bindsTo: { vault: CLOSURE_BINDING.vaultAddress, sharesMint: CLOSURE_BINDING.sharesMint, program: CLOSURE_BINDING.programId },
  preamble:
    "We are evaluating the Kamino 'Steakhouse USDC' vault (HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E, shares mint 7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS, program KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd) for a read-only, non-custodial recommendation surface. We recommend only; we never move user funds. We have completed what we can from your public sources, SDK and on-chain state. Six questions remain that only you can answer.",
  sections: [
    { id: "A_upgrade_governance", title: "Upgrade & governance", questions: [
      "The program upgrade authority GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW is a System-Program-owned account on-chain. Is the key held under a multisig/MPC or threshold scheme off-chain, and if so what is the threshold and signer policy?",
      "Is there a timelock or public announcement policy before a kvault upgrade reaches mainnet?",
    ] },
    { id: "B_vault_allocation_admin", title: "Vault & allocation administration", questions: [
      "Are the vault admin (9ceRgz579BcfWogs3RE11FKNQaWW7Lmtnev3MXspxUjF) and allocation admin (CuEC7JoZtHx9v5MQWrNTsLSGMEixbCEvTX6K6kWZzz7q) multisig-controlled, and by whom?",
      "Are reserve-allocation changes bounded by policy, timelocked, or announced? We observed the allocation change between two reads with no user action.",
    ] },
    { id: "C_audit_linkage", title: "Audit linkage", questions: [
      "Which exact commit or release is currently deployed at the kvault program, and which audit report covers that commit?",
      "Is a reproducible build or verifiable program hash available, and were all critical findings remediated in the deployed version?",
    ] },
    { id: "D_withdrawals", title: "Withdrawals", questions: [
      "Under what conditions is a withdrawal queued or delayed rather than immediate, and can it be partially fulfilled?",
      "What are the current withdrawal penalty parameters (penalty_bps / penalty_lamports) for this vault, and can a user ever receive an asset other than USDC?",
    ] },
    { id: "E_deposit_state", title: "Deposit state", questions: [
      "Is this exact vault currently accepting deposits, and is there any operational restriction not represented on-chain?",
      "Since the program has no deposit-pause field, is there a canonical API or state field an integrator should poll to detect a future deposit suspension?",
    ] },
    { id: "F_incidents", title: "Incident history", questions: [
      "Has this vault, the kvault program, or its active reserves (JLP, SOL/BTC and Bitcoin markets) experienced any security, accounting, liquidity, withdrawal or administrative incident?",
      "Are there official disclosures or postmortems we should review?",
    ] },
  ],
} as const;

/* ------------------------------------------------------------------ *
 * 10. Diagnostics
 * ------------------------------------------------------------------ */

export type SteakhouseClosureDiagnostic =
  | "upgrade_authority_control_unknown"
  | "upgrade_authority_not_multisig_verified"
  | "admin_permissions_unknown"
  | "allocation_admin_control_unknown"
  | "reserve_exposure_incomplete"
  | "reserve_market_identity_unknown"
  | "oracle_dependency_unknown"
  | "audit_deployment_linkage_unverified"
  | "withdrawal_model_incomplete"
  | "incident_review_incomplete"
  | "deposit_state_unknown"
  | "protocol_confirmation_required"
  | "evidence_stale"
  | "review_not_ready"
  | "verified_disqualifying_condition";

/** The diagnostics currently RAISED. Internal only — never user copy. */
export const RAISED_DIAGNOSTICS: SteakhouseClosureDiagnostic[] = [
  "upgrade_authority_not_multisig_verified",
  "upgrade_authority_control_unknown",
  "allocation_admin_control_unknown",
  "reserve_exposure_incomplete",
  "reserve_market_identity_unknown",
  "oracle_dependency_unknown",
  "audit_deployment_linkage_unverified",
  "withdrawal_model_incomplete",
  "incident_review_incomplete",
  "deposit_state_unknown",
  "protocol_confirmation_required",
  "review_not_ready",
];

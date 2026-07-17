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
/** The incident review was re-run 16H-L.1 against official docs + the Kamino governance forum. */
export const L1_INCIDENT_REVIEW_CUTOFF_AT = "2026-07-16T16:10:00.000Z";

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
  | "verified_squads_vault_pda"
  | "verified_raw_keypair"
  | "verified_other_program_authority"
  | "verified_governance_authority"
  | "unresolved_authority_model";

/**
 * The multisig that controls a `verified_squads_vault_pda`.
 *
 * The state account and the signing PDA are DIFFERENT IDENTITIES. `multisigStateAccount` holds the
 * members and threshold; `derivedFromSeeds` records how the authority address itself was reproduced
 * from it. Recording only one of the two would misidentify the authority.
 */
export interface SquadsControl {
  /** The Squads program that owns the multisig STATE account. */
  squadsProgram: string;
  squadsVersion: "v4";
  /** The state account — NOT the authority address. */
  multisigStateAccount: string;
  /** Seeds proving `address` is this multisig's vault PDA. Derivation, not assertion. */
  derivedFromSeeds: string;
  vaultIndex: number;
  threshold: number;
  memberCount: number;
  /** Members holding the Vote permission — the population the threshold applies to. */
  votingMemberCount: number;
  timeLockSeconds: number;
  /**
   * Squads `config_authority`. Default (System Program) means reconfiguration goes through member
   * vote. A non-default value would mean an EXTERNAL account can rewrite members/threshold, which
   * would make the threshold meaningless — so this field must always be checked, never assumed.
   */
  configAuthority: string;
  configAuthorityIsDefault: boolean;
}

export interface AuthorityEvidence {
  role: string;
  address: string;
  /** The program that OWNS the authority account. NOT sufficient alone to establish the control model. */
  ownerProgram: string;
  /**
   * ed25519 curve membership — the decisive keypair test. A keypair address is ON the curve; a PDA is
   * OFF it by construction. Off-curve therefore PROVES no private key can exist for the address.
   */
  isOnCurve: boolean;
  controlModel: AuthorityControlModel;
  /** Present only when controlModel is `verified_squads_vault_pda`. */
  squadsControl?: SquadsControl;
  /** What the on-chain read proves. */
  proves: string;
  /** What it explicitly does NOT prove. The most important field here. */
  doesNotProve: string;
  timelockStatus: "verified_timelocked" | "verified_no_timelock" | "unknown";
  evidenceCutoffAt: string;
}

/**
 * CORRECTED 2026-07-16 (Step 16H-L.1). The previous revision of this module classified three
 * authorities as `externally_owned_account_single_key` on the strength of one signal: they are owned
 * by the System Program and carry zero data bytes.
 *
 * THAT INFERENCE WAS WRONG. A Squads Vault authority PDA is ALSO System-Program-owned with zero data
 * — it is a signing identity that holds no state. Owner-program evidence alone therefore cannot
 * distinguish a raw keypair from a Squads vault PDA, and must never again be used to conclude:
 * raw keypair, EOA custody, absence of multisig, absence of governance, or absence of threshold
 * control. The earlier claim that "a keypair signature can replace the program bytecode" was false.
 *
 * WHAT ACTUALLY SETTLES IT — three independent checks, all run:
 *
 *  1. CURVE MEMBERSHIP. A keypair address is ON the ed25519 curve; a PDA is OFF it by construction.
 *     Off-curve is PROOF that no private key exists for the address. This needs no network access
 *     and is the check the previous revision missed.
 *  2. DERIVATION. For each off-curve authority, the controlling Squads multisig state account was
 *     located in the authority's own transaction history (accounts owned by the Squads v4 program),
 *     and the authority address was REPRODUCED from it via the documented vault-PDA seeds. A match
 *     is proof of identity; "the Squads program appears in the transaction" would not have been.
 *  3. STATE DESERIALIZATION. Members, threshold, time lock and config authority were read from the
 *     multisig state account. Cross-check: the observed transaction signer is a decoded member in
 *     both cases (`6vkzAQ…` is member 2 of `6hhBGCtmg…`; `vieuhps4…` is member 1 of `4WUP4FFwg…`),
 *     which validates the layout decode rather than assuming it.
 *
 * THE LIMIT OF THIS EVIDENCE: threshold control by N member ADDRESSES is proven. Who or what holds
 * those member keys is NOT — each could be a hardware wallet, an MPC/threshold custodian, a shared
 * HSM, or one person with ten keys. Membership addresses being on-curve proves only that each is a
 * keypair address, NOT that a distinct human holds it. Key-holder independence is unproven and only
 * Kamino can settle it.
 */
export const AUTHORITY_EVIDENCE: AuthorityEvidence[] = [
  {
    role: "program_upgrade_authority",
    address: "GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW",
    ownerProgram: "11111111111111111111111111111111",
    isOnCurve: false,
    controlModel: "verified_squads_vault_pda",
    squadsControl: {
      squadsProgram: "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf",
      squadsVersion: "v4",
      multisigStateAccount: "6hhBGCtmg7tPWUSgp3LG6X2rsmYWAc4tNsA6G4CnfQbM",
      derivedFromSeeds: '["multisig", 6hhBGCtmg7tPWUSgp3LG6X2rsmYWAc4tNsA6G4CnfQbM, "vault", 0u8]',
      vaultIndex: 0,
      threshold: 5,
      memberCount: 10,
      votingMemberCount: 10,
      timeLockSeconds: 86400,
      configAuthority: "11111111111111111111111111111111",
      configAuthorityIsDefault: true,
    },
    proves: "The kvault program's upgrade authority is OFF-curve — no private key can exist for it — and is reproduced exactly by the Squads v4 vault-PDA seeds of multisig 6hhBGCtmg7tPWUSgp3LG6X2rsmYWAc4tNsA6G4CnfQbM at vault index 0. Replacing the program bytecode requires 5 of 10 member approvals AND a 24-hour time lock. config_authority is default, so members/threshold can only be changed by member vote, not by an external account.",
    doesNotProve: "Who controls the 10 member keys, or whether they are independently held. The 24h time lock bounds when an approved upgrade can execute; it does not bound what that upgrade may contain.",
    timelockStatus: "verified_timelocked",
    evidenceCutoffAt: CLOSURE_EVIDENCE_CUTOFF_AT,
  },
  {
    role: "vault_admin_authority",
    address: "9ceRgz579BcfWogs3RE11FKNQaWW7Lmtnev3MXspxUjF",
    ownerProgram: "11111111111111111111111111111111",
    isOnCurve: false,
    controlModel: "verified_squads_vault_pda",
    squadsControl: {
      squadsProgram: "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf",
      squadsVersion: "v4",
      multisigStateAccount: "4WUP4FFwgWd6gsCd8hR2umCLQA2pFCEaMm21vbyDZubA",
      derivedFromSeeds: '["multisig", 4WUP4FFwgWd6gsCd8hR2umCLQA2pFCEaMm21vbyDZubA, "vault", 0u8]',
      vaultIndex: 0,
      threshold: 3,
      memberCount: 10,
      votingMemberCount: 7,
      timeLockSeconds: 0,
      configAuthority: "11111111111111111111111111111111",
      configAuthorityIsDefault: true,
    },
    proves: "The vault admin is OFF-curve — no private key can exist for it — and is reproduced exactly by the Squads v4 vault-PDA seeds of multisig 4WUP4FFwgWd6gsCd8hR2umCLQA2pFCEaMm21vbyDZubA at vault index 0. It is a 3-of-10 multisig with NO time lock (7 of the 10 members hold the Vote permission; the threshold applies to those). `pendingAdmin` equals the same account.",
    doesNotProve: "Who controls the member keys. Note this multisig is materially weaker than the upgrade multisig: a lower threshold and, with no time lock, admin changes take effect immediately with no window for a user to react.",
    timelockStatus: "verified_no_timelock",
    evidenceCutoffAt: CLOSURE_EVIDENCE_CUTOFF_AT,
  },
  {
    role: "allocation_admin",
    address: "CuEC7JoZtHx9v5MQWrNTsLSGMEixbCEvTX6K6kWZzz7q",
    ownerProgram: "11111111111111111111111111111111",
    isOnCurve: true,
    controlModel: "verified_raw_keypair",
    proves: "UNLIKE the other two, this authority is ON-curve, and its transaction history shows it SIGNING ITS OWN transactions directly (it appears as the sole signer) and invoking the kvault program with no Squads program involved. It is a live single-key operational wallet — the one authority here where a single key genuinely does suffice, and it is the authority that decides where user USDC is deployed.",
    doesNotProve: "Whether the key is held under an off-chain threshold/MPC scheme — an MPC-backed signer is indistinguishable from a single keypair on-chain, so this does NOT prove one person can act alone. It also does not prove allocation changes are unannounced or unbounded by off-chain policy.",
    timelockStatus: "verified_no_timelock",
    evidenceCutoffAt: CLOSURE_EVIDENCE_CUTOFF_AT,
  },
  {
    role: "base_vault_authority",
    address: "AyY6VCkHfTWdFs7SqBbu6AnCqLUhgzVHBzW3WcJu5Jc8",
    ownerProgram: "(account does not exist on-chain)",
    isOnCurve: false,
    controlModel: "verified_other_program_authority",
    proves: "Off-curve and uninitialised — a PDA used purely as a program signing authority, holding no state of its own. No private key can exist for it.",
    doesNotProve: "The exact kvault PDA seeds were not independently re-derived, so it is not proven WHICH program derives it. Off-curve alone does not identify the deriving program.",
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
  /**
   * How this power is gated for THIS vault, per verified AUTHORITY_EVIDENCE.
   *
   * `multisig_threshold_and_timelock` / `multisig_threshold_only` are statements about the on-chain
   * GATE, never about the trustworthiness of the key holders behind it — those are unproven.
   */
  controlGate:
    | "multisig_threshold_and_timelock"
    | "multisig_threshold_only"
    | "single_key"
    | "unresolved";
  note: string;
}

/**
 * Deliberately NOT collapsed into one "admin risk" statement. Program upgrade, vault admin, allocation
 * admin, and the protocol-level GlobalConfig are four distinct surfaces with different blast radii —
 * and, as of 16H-L.1, with materially different and separately verified control gates.
 */
export const AUTHORITY_PERMISSIONS: AuthorityPermission[] = [
  { power: "replace the entire program bytecode holding user funds", heldBy: "program_upgrade_authority", supportedByProgramSource: true, controlGate: "multisig_threshold_and_timelock", note: "The largest blast radius: an upgrade can change every rule below. VERIFIED GATE: Squads v4, 5-of-10, 24h time lock. The time lock is the meaningful protection — an approved upgrade cannot execute for 24h, which is a window in which a user could withdraw. It bounds WHEN, not WHAT." },
  { power: "change reserve allocations / weights", heldBy: "allocation_admin", supportedByProgramSource: true, controlGate: "single_key", note: "VERIFIED GATE: a single on-curve key, signing directly, no multisig and no time lock. OBSERVED IN PRACTICE: allocation weights changed between the 16H-J and 16H-L reads with no user action (see RESERVE_EXPOSURE.allocationIsDynamic). This is the weakest gate on the vault and it governs where user USDC is deployed." },
  { power: "add or remove reserves from the allocation strategy", heldBy: "allocation_admin", supportedByProgramSource: true, controlGate: "single_key", note: "25 allocation slots exist; 4 are active. A reserve in a market WealthSmith has not reviewed could be added by a single key, with no time lock and no user action." },
  { power: "change the deposit cap", heldBy: "vault_admin_authority", supportedByProgramSource: true, controlGate: "multisig_threshold_only", note: "Capacity is currently verified_uncapped (deposit_cap = 0 → uncapped). VERIFIED GATE: Squads v4, 3-of-10, NO time lock — a real cap can be set with immediate effect." },
  { power: "change min deposit / min withdraw / min invest", heldBy: "vault_admin_authority", supportedByProgramSource: true, controlGate: "multisig_threshold_only", note: "min_deposit_amount is enforced in the deposit path. VERIFIED GATE: Squads v4, 3-of-10, no time lock." },
  { power: "change management / performance fees", heldBy: "vault_admin_authority", supportedByProgramSource: true, controlGate: "multisig_threshold_only", note: "Currently 0 bps / 500 bps. computeNetAPR deducts both from the APY WealthSmith surfaces. VERIFIED GATE: Squads v4, 3-of-10, NO time lock — fees can change with immediate effect on a displayed APY." },
  { power: "set withdrawal penalty parameters", heldBy: "kamino_global_config", supportedByProgramSource: true, controlGate: "unresolved", note: "MATERIAL: `calculate_withdrawal_penalty_params(global_config, vault)` sources a penalty from a PROTOCOL-LEVEL GlobalConfig plus vault state. This is an exit cost that the SDK's net APY does NOT include. Its current value is UNRESOLVED (the GlobalConfig account was not read)." },
  { power: "transfer vault administration (pendingAdmin handoff)", heldBy: "vault_admin_authority", supportedByProgramSource: true, controlGate: "multisig_threshold_only", note: "pendingAdmin currently equals the existing admin. VERIFIED GATE: Squads v4, 3-of-10, no time lock." },
  { power: "pause or restrict DEPOSITS", heldBy: "unknown", supportedByProgramSource: false, controlGate: "unresolved", note: "No pause/enabled/halt/emergency/status field or check exists anywhere in the reviewed source. See DEPOSIT_STATE." },
  { power: "pause or restrict WITHDRAWALS", heldBy: "unknown", supportedByProgramSource: false, controlGate: "unresolved", note: "No withdrawal pause mechanism was found in the reviewed source. Withdrawal availability instead depends on reserve liquidity." },
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
    /** Resolved via getBlockTime(432874668) — chain time, not an estimate. */
    lastDeployedAt: "2026-07-14T14:54:02.000Z",
    bytecodeBytes: 10485715,
    reviewedSourceRelease: CLOSURE_BINDING.reviewedSourceRelease,
    reviewedSourceCommit: CLOSURE_BINDING.reviewedSourceCommit,
    reproducibleBuildAvailable: false,
    programHashVerified: false,
  },
  /**
   * 16H-L.1 — deployment history, verified on-chain rather than assumed.
   *
   * Two kvault program IDs exist. They are NOT interchangeable, and only one is live.
   */
  deploymentHistory: {
    current: {
      programId: "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd",
      status: "live_canonical",
      evidence:
        "Owned by the BPF upgradeable loader, executable, with a live programData account (GeZ7nkkcbJ6…) and an active upgrade authority. Decisively: the Steakhouse vault account HDsayqAsDWy… is itself OWNED by this program — so this is the program that actually holds the reviewed vault. It is also the only kvault program ID appearing in Kamino's official docs (7 occurrences in llms-full.txt).",
    },
    historical: {
      programId: "kvauTFR8qm1dhniz6pYuBZkuene3Hfrs1VQhVRgCNrr",
      status: "closed_historical",
      evidence:
        "Still executable and BPF-loader-owned, but its programData account 9ud9nKmiDt4CphHWF3jKZC8y8ByPfWQ4E3wPpcSFkf4Z DOES NOT EXIST — the account was closed, which deallocates the bytecode and permanently removes the ability to upgrade or invoke it. Its last on-chain activity was slot 408761960 (2026-03-25). It appears nowhere in Kamino's official docs. It does not own the reviewed vault.",
      relevanceToThisReview:
        "None for the deployed bytecode — but it matters for audit linkage: audits dated 2024-12 to 2025-04 predate the current program's deployment and may have been performed against this now-closed program. That possibility is UNRESOLVED and makes the linkage gap worse, not better.",
    },
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

/**
 * 16H-L.1 incident-history follow-up. UPGRADED from `review_incomplete` in substance but NOT in
 * verdict — an official, scoped track record was located, and it does not cover this product.
 *
 * WHAT WAS FOUND (official, primary): kamino.com/docs/risk/index carries a "Battle-Tested Track
 * Record" section stating **$0 bad debt since November 2023 across all protocol markets**, with a
 * table of 5 named stress events (Feb 2025 → Feb 2026), each recording $0 bad debt, and the statement
 * that the protocol "continued operating normally throughout the event with no degradation in
 * service". The Feb 5-6 2026 event has a detailed analysis on Kamino's official governance forum.
 *
 * WHY THAT DOES NOT CLOSE THIS DIMENSION — four scope gaps, each fatal on its own:
 *
 *  1. WRONG SUBJECT. The claim is about BAD DEBT in LENDING MARKETS. This product is a VAULT on a
 *     separate program (KvauGMsp…). "$0 bad debt" is not a claim of no security, withdrawal,
 *     allocation, oracle, administrative or operational incident, which is what was asked.
 *  2. THE PROGRAM IS UNCOVERED. Zero incident coverage for the kvault program exists anywhere located:
 *     no postmortem in the docs, and a governance-forum search for "kvault" returns NO topics.
 *  3. ~~THE DOMINANT MARKET IS UNCOVERED~~ — CORRECTED AT 16H-O.2, NO LONGER A GAP. This gap rested on
 *     an IDENTITY ERROR: the Feb 2026 case study lists "Main", and "Main Market" was renamed to
 *     "SOL/BTC Market" — the same account, 7u3He… (on-chain LendingMarket.name is a mutable field on a
 *     stable address; Kamino's API marks that exact address isPrimary: true, "Primary market on
 *     mainnet"; the UI states the rename verbatim). So the dominant 87.61% IS named, as "Main", and
 *     coverage is 98.56% (SOL/BTC 87.61 + JLP 10.29 + Bitcoin 0.66), not 10.95%. Only Maple Market
 *     (1.44%) remains uncovered — it is not a KLend stress-event market, so coverage cannot reach 100%.
 *     The prior figure is retained at steakhouseIncidentEvidence.SUPERSEDED_COVERAGE_CALCULATION.
 *     CRUCIALLY this changes SCOPE, not SAFETY: gaps 1, 2 and 4 below are untouched, each is fatal on
 *     its own, and the rubric blocker "no sourced incident review exists for this product" still
 *     stands. High coverage of EXPOSURE is not coverage of the PRODUCT.
 *  4. STALE FOR THIS BINARY. The last documented event is 2026-02-05/06. [CORRECTED AT 16H-S.0: the
 *     original text said "most recent monthly risk report found is April 2026" — a search failure;
 *     Insights run through June 2026 (published 2026-07-03).] The deployed binary is from 2026-07-14,
 *     after even the June report. No published review postdates the code currently holding user funds.
 *
 * So the rubric blocker "no sourced incident review exists" REMAINS PRESENT: a sourced review exists
 * for the lending-market layer, but not for this product. The state moves review_incomplete → partial
 * to record the genuine progress without inflating it.
 *
 * ABSENCE IS NOT EVIDENCE: "no incident found" is NOT "no incident occurred". Every negative below is
 * a statement about what was searched, never about what happened.
 */
export const INCIDENT_REVIEW = {
  version: "2.0.0",
  state: "review_incomplete" as IncidentReviewState,
  cutoffAt: L1_INCIDENT_REVIEW_CUTOFF_AT,
  scopeReviewed: [
    "Kamino's official security documentation index (security overview, audits, formal verification, fuzzing, bug bounty)",
    "Kamino's official risk documentation index, including the 'Battle-Tested Track Record' section (kamino.com/docs/risk/index)",
    "Kamino's full official documentation corpus (llms-full.txt, 2.25MB) searched for: postmortem, incident, exploit, hack, bad debt, insolvency, emergency mode, pause, disclosure, breach, attack, vulnerability",
    "Kamino's official governance forum (gov.kamino.finance), including the Feb 5-6 2026 Risk Event Analysis and searches for the vault's markets and the kvault program",
  ],
  scopeNotReviewed: [
    "The kvault program's own incident history — NO source covering it was located anywhere",
    "SOL/BTC Market (87.61% of allocation) and Maple Market (1.44%) — absent from the official stress-event breakdown",
    "Any period after 2026-05-05 (latest monthly risk report found), which includes the entire life of the currently deployed binary",
    "The Scope oracle aggregator",
    "The allocation-admin operator's history",
    "Bug-bounty disclosures and their remediation",
    "Non-public incident history",
  ],
  /** Confirmed incidents affecting THIS product. Still empty — and that is a search result, not a finding. */
  confirmedIncidents: [],
  /**
   * Official Kamino claims located. Recorded verbatim in substance, WITH their scope, because a claim
   * and its scope are inseparable — quoting the number without the scope would be the whole problem.
   */
  officialClaims: [
    {
      claim: "$0 bad debt across all protocol markets since launch (November 2023), across 5 significant stress events.",
      source: "https://kamino.com/docs/risk/index — 'Battle-Tested Track Record'",
      sourceType: "official_primary",
      scope: "bad debt only; lending markets only; from 2023-11",
      statedCutoffDate: null,
      latestEventDocumented: "2026-02-06",
      coversThisVaultOrProgram: false,
      coversAllActiveMarkets: false,
      note: "The 5 stress events are market-volatility episodes that produced $0 bad debt — they are documented as tests passed, not as incidents. They are not evidence about the vault layer.",
    },
    {
      claim: "Kamino has been live on mainnet for 3 years. 0 bad debt. 0 exploits. 0 Incidents.",
      source: "Kamino official X account, post 1955968425735397501",
      sourceType: "official_marketing",
      scope: "none stated",
      statedCutoffDate: null,
      latestEventDocumented: null,
      coversThisVaultOrProgram: false,
      coversAllActiveMarkets: false,
      note: "This is the ONLY located Kamino statement that asserts '0 Incidents' rather than '$0 bad debt'. It is a promotional post with no scope, no cutoff, no definition of 'incident' and no methodology. It is recorded because the questionnaire asked whether such a statement exists — it does — but it is NOT treated as a scoped disclosure and must not be cited as one.",
    },
  ],
  /**
   * Leads that a THIRD PARTY raised and that primary sources have NOT settled. Recorded so they are
   * not silently dropped; explicitly NOT findings.
   */
  unresolvedThirdPartyLeads: [
    {
      lead: "A third-party article asserts ~$1.26M of bad debt across Solend, Coin98 and 'Kamino' lending pools arising from USDH oracle manipulation.",
      sourceType: "third_party_unverified",
      whyNotRecordedAsFact: "No primary source was located. Per the standing rule, a third-party source may LOCATE primary evidence but can never establish a fact. It also appears to predate Kamino Lend's stated November 2023 launch, so it may concern a different product or be a misattribution — that is a hypothesis, not a finding, and it is not resolved either way.",
      resolvedBy: "A primary Kamino disclosure, or confirmation of which product and date the claim refers to.",
    },
  ],
  /** The rule that keeps this honest. */
  absenceInterpretation:
    "No confirmed incident affecting this vault, the kvault program or its reserves was found — but the scope above is INCOMPLETE and, critically, the located official track record covers neither the vault layer nor 87.61% of this vault's allocation nor any period after the current binary was deployed. So this stays `review_incomplete`. It is NOT `no_confirmed_incident_found_within_reviewed_scope`, and it is emphatically NOT 'no incident occurred'.",
  whatWouldResolveIt: [
    "A Kamino statement of incident history — scoped and dated — for THIS vault, the kvault program, and specifically SOL/BTC Market and Maple Market.",
    "Confirmation of whether any incident affected the vault layer as distinct from the lending markets.",
    "Bug-bounty disclosure history with remediation status.",
    "Any non-public incident history.",
  ],
  invalidationTriggers: ["any new incident", "cutoff older than the review-freshness policy", "a new binary deployment postdating the review"],
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
  // 16H-L.2: UNBLOCKED — and the reason is narrow, so read it carefully. The rubric blocker is "the
  // audited version cannot be related to the deployed bytecode". 16H-L.2 related them DIRECTLY: the
  // deployed binary is hash-verified to public commit 1d146d70…, and the audited redeem_in_kind and
  // reward function bodies are BYTE-IDENTICAL to the public releases their reports name. The blocker
  // is therefore absent — not because the coverage is good, but because the relation now exists and
  // is readable. Coverage is explicitly PARTIAL and the reviewer scores it.
  { dimension: "audit_security", state: "complete", mandatoryBlockerPresent: false, detail: "Blocker 'the audited version cannot be related to the deployed bytecode' — ABSENT as of 16H-L.2, established by direct source inspection rather than by a private-to-public commit mapping (which still does not exist). Deployed release resolved by git ancestry: release/v2.2.2 @ 1d146d70…, tag points exactly at the deployed commit, previous release/v2.2.1 @ 0426eb12. WHAT IS VERIFIED: all 7 documented remediations from the four 2026 feature audits are verified_present_in_deployed_source by reading commit 1d146d70… — redeem-in-kind minimum-withdrawal validation (same canonical min_withdraw_amount field as standard withdraw, checked against the POST-cap amount), cToken-vault mint validation (closed constraint chain: ctoken_vault PDA seeded by (vault_state, reserve) + token::mint = ctoken_mint + ctoken_mint pinned to reserve.collateral.mint_pubkey), two-stage penalty (proven by ALGEBRA — inclusive uses bps/FULL_BPS, exclusive uses f/(1-f) — with Fraction precision end-to-end and no intermediate rounding), and four reward remediations (saturating pending-reward arithmetic, exhaustion-timestamp reset in topup_rewards, refresh ordering across 9 call sites, duplicate-refresh removal in invest). STRUCTURAL CORROBORATION: vault_operations::redeem_in_kind and both penalty helpers are byte-identical between release/v2.1.0 (their audit target) and the deployed release/v2.2.2; refresh_rewards and topup_rewards are byte-identical between release/v2.1.1 and v2.2.2. The audited logic IS the running logic. WHAT IS NOT COVERED, and it is material: klend_operations.rs changed 214 lines in v2.2.2 — the CPI layer that actually moves user funds — plus three new instructions (update_reserve_allocation_v2, deposit_with_min_shares_out, buy_with_min_shares_out), the new CtokenCap state concept, the allocation-admin surface (46 lines), and the reserve whitelist (15 lines) that manager-discretion mitigation relies on. All bounded and enumerated in PUBLICLY_UNCOVERED_SURFACE. The 2024-2025 baselines predate the first public tag and are NOT credited with covering later changed code. (CORRECTED 16H-M.3: this previously said they 'state no commit'. Parsing the reports disproved that — Sec3 states a full commit hash, Offside states branch `master` plus four hashes, OtterSec references a short hash. None exists in the public repo, so they are private-repo commits: the linkage gap stands, but the reports are more rigorous than the earlier claim allowed.) Classification: deployed_feature_remediations_verified_with_partial_coverage. Evidence is COMPLETE FOR HUMAN SCORING and distinctly mixed — that is a scoreable input, not a favourable one. NOT scored here; no approval." },
  // 16H-L.1: this dimension was blocked ONLY because of the incorrect single-key finding. Both of the
  // rubric's mandatory blockers are now verifiably ABSENT, and every item of mandatoryEvidence is
  // supplied. That makes the dimension scoreable — it does NOT score it, and it is NOT an approval.
  // The reviewer still assigns the score, and the product stays unapproved.
  { dimension: "upgrade_admin_authority", state: "complete", mandatoryBlockerPresent: false, detail: "Blocker 'upgrade authority cannot be determined' — ABSENT: the authority is the Squads v4 vault PDA of multisig 6hhBGCtmg7tPWUSgp3LG6X2rsmYWAc4tNsA6G4CnfQbM (index 0), proven by seed derivation. Blocker 'an active single-key upgrade authority over user funds with no timelock' — ABSENT on both limbs: it is NOT single-key (5-of-10 threshold, config_authority default so members/threshold need member vote) and it is NOT untimelocked (86400s / 24h). Mandatory evidence supplied: upgradeable (BPF upgradeable loader), current upgrade authority, authority type (multisig + timelock, not single key), and the admin authority set. NOT scored here. Two facts the reviewer must weigh rather than inherit: (1) who holds the 10 member keys is unproven, so threshold control is proven at the ADDRESS level only; (2) the vault ADMIN is a separate and weaker 3-of-10 multisig with no time lock — this dimension covers both upgrade and admin authority." },
  // 16H-L.1: the rubric's ONLY manager_discretion blocker is "manager permissions cannot be
  // determined". They ARE determined — enumerated from a binary that is now hash-verified against
  // commit 1d146d70…, so this is the deployed permission surface, not a plausible one. The blocker is
  // therefore ABSENT. That is NOT a favourable finding: what the evidence determines is that a single
  // raw key directs ~20.7M USDC with no time lock. Rubric v1 defines no "single-key manager" blocker,
  // so per 16H-L.1 this is material evidence for the reviewer, NOT a mechanical disqualifier.
  { dimension: "manager_discretion", state: "complete", mandatoryBlockerPresent: false, detail: "Blocker 'manager permissions cannot be determined' — ABSENT. The manager is the allocation admin CuEC7JoZtHx9v5MQWrNTsLSGMEixbCEvTX6K6kWZzz7q: a raw ON-CURVE keypair that signs directly, with NO multisig and NO time lock — unlike the upgrade authority (5-of-10 + 24h) and vault admin (3-of-10). It can move user USDC between reserves and add/remove reserves (21 of 25 slots free). Reallocation is OBSERVED, not theoretical: SOL/BTC weight drifted 74.2% → 69.37% → 87.61% across three reads with no user action. MITIGATION the reviewer must weigh: allowAllocationsInWhitelistedReservesOnly=1 and allowInvestInWhitelistedReservesOnly=1 on the verified binary confine allocations to a whitelist maintained at GLOBAL-CONFIG level (not by this key), and no instruction lets the key extract funds — its power is redirection, not extraction. WealthSmith has NOT enumerated the whitelist or verified who controls global config, so the strength of that bound is itself unverified. Determined, unscored, and NOT treated as a verified disqualifier. See ALLOCATION_ADMIN_RUBRIC_MAPPING." },
  { dimension: "strategy_complexity", state: "partial", mandatoryBlockerPresent: false, detail: "Current exposure IS determined: 4 reserves, weights, markets for 3 of 4. Allocation is proven dynamic. No leverage or recursive borrowing was found in the vault's own allocation strategy. The blocker 'current exposure cannot be determined' is RESOLVED; the 4th reserve's market remains a bounded gap." },
  { dimension: "composability_dependency", state: "partial", mandatoryBlockerPresent: false, detail: "Dependencies enumerated: the kvault program, KLend reserves in JLP / SOL-BTC / Bitcoin markets, and Scope. Each market's collateral, liquidation parameters and bad-debt behaviour are unreviewed — a bounded gap, not an unknown surface." },
  { dimension: "oracle_risk", state: "partial", mandatoryBlockerPresent: false, detail: "Each active reserve's USDC liquidity price uses Scope feed 3t4JZcue… (chain [13]). Collateral-side oracles for each market are not enumerated. The blocker 'oracle model cannot be established' is partly resolved: the vault-side model is known; the collateral-side is not." },
  // 16H-L.1: blocker "withdrawal model cannot be determined" is now ABSENT — the model is fully
  // determined against the hash-verified binary. Determined does not mean good; see the detail.
  { dimension: "liquidity_withdrawal", state: "complete", mandatoryBlockerPresent: false, detail: "Blocker 'withdrawal model cannot be determined' — ABSENT. The model, bound to verified commit 1d146d70…: NO withdrawal queue, FIFO, cooldown or pending-withdrawal construct exists anywhere in the deployed binary (authoritative negative, not an unknown). Withdrawal is synchronous via `withdraw` (pulls from reserves) or `withdrawFromAvailable` (unallocated buffer only). CORRECTION to 16H-L: withdrawalPenaltyBps=0 and withdrawalPenaltyLamports=0 — there is NO configured withdrawal penalty; the earlier 'third exit cost' claim was written before these fields were read and was wrong. Both remain admin-configurable with immediate effect (3-of-10, no time lock). MATERIAL: unallocatedWeight=0 (policy: hold NO buffer) and at slot 433302860 tokenAvailable (69,969.58 USDC) is LESS than pendingFees (70,038.77 USDC) — the unencumbered buffer is NEGATIVE, so effectively 100% of any withdrawal must come from reserves. Two of four active reserves (Maple 1.44%, Bitcoin 0.66%) currently hold LESS free liquidity than the vault's position in them, so those cannot be exited in full right now; aggregate coverage (27.4M vs 20.7M) does NOT imply this, because withdrawal is per-reserve. All four reserves are Active, emergencyMode 0, blockCtokenUsage 0. Withdrawals must NOT be described as instant. Determined and unscored." },
  // 16H-L.2 incident addendum: UNBLOCKED — on completeness, NOT on a clean record. The rubric blocker
  // is "no sourced incident review exists". A sourced, scoped, bounded review now exists for this exact
  // product: sources enumerated, the covered allocation quantified (10.95%), gaps named, the unresolved
  // lead retained, and the structural loss mechanism verified against the deployed KLend binary.
  // Confirmed incidents remain ZERO — a search result, never a finding.
  { dimension: "incident_history", state: "complete", mandatoryBlockerPresent: false, detail: "Blocker 'no sourced incident review exists' — ABSENT as of the 16H-L.2 incident addendum. This is completeness, NOT a clean record. OFFICIAL PRIMARY: kamino.com/docs/risk 'Battle-Tested Track Record' — $0 bad debt across all protocol LENDING MARKETS since 2023-11 across 5 named stress events (Feb 2025 → Feb 2026, latest 2026-02-05/06, detailed on Kamino's governance forum by Allez Labs). SCOPE, which is the point: it is a BAD-DEBT claim about LENDING MARKETS with no stated cutoff; it does not cover the exact vault, does not cover the current KVault deployment (2026-07-14, which postdates every published review), does not establish absence of security/withdrawal/allocation/oracle/administrative/operational incidents, and does not cover all active markets. EXACT COVERAGE: official stress-event material names Main/JLP/Bitcoin/Fartcoin/JTO; this vault allocates 87.61% to SOL/BTC Market and 1.44% to Maple Market, neither named — so the official reports demonstrably speak to 10.95% of current allocation (JLP 10.29 + Bitcoin 0.66) and 89.05% is UNEXAMINED, which is not the same as adverse. Percentage used for scope description only; allocation is dynamic so it must be recomputed, not cached. STRUCTURAL LOSS MECHANISM, premise CORRECTED: the task and Kamino's prose docs state the per-market emergency_council may invoke socialize_loss. The VERIFIED DEPLOYED KLend binary (commit 37592174…, hash-verified) shows otherwise — SocializeLoss requires `lending_market_owner: Signer` with `has_one = lending_market_owner`, and emergency_council is not referenced in the handler at all. socialize_loss on 99.34% of allocation therefore requires a 4-of-10 Squads multisig behind a 12-HOUR time lock (owner 24LjDBuk…, corroborating Kamino's published '12h on SOL/BTC Market'); the remaining 0.66% (Bitcoin Market) has an owner whose control model is UNRESOLVED. The council (4VtJ1yCC… — ONE Squads 2-of-7, NO time lock, over ALL FOUR markets) holds only a restrictive-only allowlist (limits to 0, emergency mode on, LTV to 0; `_ => false` otherwise) — a one-way brake that cannot loosen anything or impose a loss. Residual: a brake can still impede exit, which compounds the ~0-buffer finding. Vault depositors are NOT treated differently from direct depositors — the vault holds ordinary cTokens and dilutes pro rata. HISTORY SEARCH: history_search_incomplete. The current owner of the 99.34% markets has 166 signatures = its COMPLETE history (2026-02-24 → 2026-07-16); all 166 inspected, 162 involve KLend, ZERO socialize_loss invocations. But that address's history begins 2026-02-24 and the markets are older, so a PREVIOUS owner's period is unsearched; the Bitcoin owner's history hit the RPC cap. No invocation found is NOT never invoked. MARKETING: one X post claims '0 Incidents' — no scope, cutoff, methodology or taxonomy; context only, never evidence. UNRESOLVED LEAD retained: ~$1.26M bad debt allegation involving Solend/Coin98/'Kamino' pools via USDH oracle manipulation — no primary source, may predate Kamino Lend's 2023-11 launch; NOT a confirmed incident, NOT deleted. Confirmed incidents: 0 — a search result, not a finding. No clean-history claim is made. Evidence complete for human scoring; unscored; no approval." },
  { dimension: "asset_stablecoin_risk", state: "partial", mandatoryBlockerPresent: false, detail: "Principal is canonical USDC and every active reserve's liquidity mint is canonical USDC — verified. But the vault's credit exposure is to JLP / SOL-BTC / Bitcoin collateral markets, which is a materially different risk from 'holds USDC'." },
  { dimension: "withdrawal_fee_transparency", state: "complete", mandatoryBlockerPresent: false, detail: "No mandatory blockers are defined for this dimension. Fees are fully readable on the verified binary: mgmt 0 bps / perf 500 bps, both already inside the SDK's net APY via computeNetAPR. 16H-L.1 CORRECTS the 16H-L finding of a hidden third fee: withdrawalPenaltyBps=0 and withdrawalPenaltyLamports=0, so no withdrawal penalty is configured and none is missing from the net APY. Residual facts for the reviewer, not blockers: all three are admin-settable via the 3-of-10 vault-admin multisig with NO time lock, so a displayed APY can change with immediate effect; and `calculate_withdrawal_penalty_params` still sources from a protocol-level GlobalConfig whose controller WealthSmith has not verified, so a future non-zero penalty could originate outside this vault's admin." },
  { dimension: "operational_dependency_risk", state: "complete", mandatoryBlockerPresent: false, detail: "Resolved at 16H-I: official SDK/RPC source path, proven net + fraction APY, chain block time as the authoritative timestamp, validated artifact and published same-origin cache with browserFetched:false." },
  { dimension: "maturity", state: "partial", mandatoryBlockerPresent: false, detail: "No mandatory blockers defined. The vault and program are live on mainnet, but the deployed bytecode is only ~2 days old at the cutoff (deployed 2026-07-14T14:54:02Z, chain time via getBlockTime), which resets battle-testing time for the exact deployed binary regardless of how long the product name has existed. 16H-L.1 makes this precise rather than approximate: the deployment timestamp is chain-sourced and the binary is hash-verified to commit 1d146d70…. The predecessor program kvauTFR8… is CLOSED (its programData account no longer exists; last activity 2026-03-25), so operating history under that program does not transfer to this binary. Unscored." },
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
    "We are evaluating the Kamino 'Steakhouse USDC' vault (HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E, shares mint 7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS, program KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd) for a read-only, non-custodial recommendation surface. We recommend only; we never move user funds. We have completed what we can from your public sources, SDK and on-chain state. Our on-chain verification has already resolved the upgrade- and admin-authority control model, so we are not asking you to restate it. The questions below are only those that on-chain state cannot answer.",
  sections: [
    // 16H-L.1: the upgrade-governance questions were REMOVED — on-chain derivation answered them, and
    // the first one carried a false premise ("is a System-Program-owned account" implying a raw key).
    // Asking a protocol to confirm what we have already proven wastes their time and ours. What remains
    // is strictly the part on-chain state CANNOT answer: who holds the member keys.
    { id: "A_signer_independence", title: "Multisig signer independence", questions: [
      "We have verified on-chain that the kvault upgrade authority is the Squads v4 vault PDA of multisig 6hhBGCtmg7tPWUSgp3LG6X2rsmYWAc4tNsA6G4CnfQbM (5-of-10, 24h time lock), and the vault admin is the vault PDA of 4WUP4FFwgWd6gsCd8hR2umCLQA2pFCEaMm21vbyDZubA (3-of-10, no time lock). Are the member keys of each multisig held by independent parties, and on what hardware or custody platform? A threshold only protects users if the keys are genuinely separately held.",
      "The vault admin multisig has no time lock, so fee, cap and minimum changes take effect immediately. Is there an off-chain announcement or notice policy for those changes?",
    ] },
    { id: "B_allocation_admin", title: "Allocation administration", questions: [
      "The allocation admin (CuEC7JoZtHx9v5MQWrNTsLSGMEixbCEvTX6K6kWZzz7q) is an on-curve address that signs its own transactions directly, with no multisig and no time lock — unlike the two authorities above. It decides which reserves hold user USDC. Is this key held under an off-chain threshold/MPC scheme, and is there a reason it is not behind a Squads multisig as the others are?",
      "Are reserve-allocation changes bounded by policy, timelocked, or announced? We observed the allocation change between two reads with no user action.",
    ] },
    // 16H-L.1: "which commit is deployed?" and "is a verifiable program hash available?" were STRUCK —
    // the solana-verify registry answered both (commit 1d146d70…, hash 5b1eac16…, verified 6m28s after
    // deploy by the upgrade authority itself). Asking Kamino to restate proven facts wastes everyone's
    // time. What survives is only what the registry cannot answer: audit COVERAGE of that commit.
    // 16H-L.2 REWROTE this section. "Which audit covers commit 1d146d70…?" was largely answered by
    // source inspection: the audited redeem_in_kind and reward bodies are byte-identical to the public
    // releases the official audit artifacts are named for, and all 7 documented remediations are
    // verified present in the deployed code. What survives is only what source CANNOT show — the
    // private-to-public correspondence, and whether the uncovered v2.2.2 deltas were reviewed
    // internally. These now IMPROVE CONFIDENCE; they no longer gate human scoring.
    { id: "C_audit_coverage", title: "Audit coverage — private-to-public correspondence", questions: [
      "We verified by direct source inspection that the deployed binary (public commit 1d146d7087a76edbbadc14d848ae14295c0745a4, tag release/v2.2.2) contains every documented remediation from your 2026 redeem-in-kind and vault-rewards audits, and that the audited function bodies are byte-identical to public releases 2.1.0 and 2.1.1 respectively. Can you confirm which private kvault-private PRs (#59, #78, #113) and commits (5f8c2…, 4b66b…, dabe9a26…) were squashed into which public releases? Public history is squashed and references no private PR, so only you can attest this.",
      "Release 2.2.2 changed runtime code that no public audit covers: klend_operations.rs (214 lines, the KLend CPI layer that moves user funds), three new instructions (update_reserve_allocation_v2, deposit_with_min_shares_out, buy_with_min_shares_out), the new CtokenCap state concept, handler_update_reserve_allocation.rs, and reserve_whitelist_operations.rs. Were these covered by a rolling internal or external review, and do non-public review artifacts exist for them? Relatedly, do your Certora formal-verification and Ackee fuzzing artifacts state which properties were proven against which commit, and do any hold for the deployed 2.2.2 binary?",
    ] },
    // 16H-L.1: the queue and penalty questions were STRUCK — the verified binary contains no queue/FIFO
    // construct at all, and withdrawalPenaltyBps/withdrawalPenaltyLamports read 0/0 on-chain.
    { id: "D_withdrawals", title: "Withdrawals", questions: [
      "`redeemInKind` exists in the deployed binary. Under what conditions can a user receive an asset other than USDC, and is that path ever taken automatically rather than at the user's election?",
      "`calculate_withdrawal_penalty_params` sources from a protocol-level GlobalConfig. Both vault-level penalty fields currently read 0/0 — can GlobalConfig introduce a non-zero withdrawal penalty independently of this vault's admin, and who controls it?",
    ] },
    { id: "E_deposit_state", title: "Deposit state and off-chain restrictions", questions: [
      "We have verified there is no deposit-pause field in the deployed binary, no depositor allowlist, and no status field of any kind in GET /kvaults/vaults/{pubkey}. Given that, is there a canonical signal an integrator should poll to detect a future deposit suspension or a vault deprecation — or is there genuinely none?",
      "Are there off-chain restrictions on this vault (geofencing, jurisdictional limits, terms-based eligibility) that would not be visible on-chain to a read-only integrator?",
    ] },
    // 16H-L.1: sharpened. The generic "any incidents?" question was answerable in part from official
    // sources ($0 bad debt since 2023-11, 5 stress events). What survives is precisely the gap that
    // track record leaves: the vault layer, the two uncovered markets, and everything after 2026-05-05.
    // 16H-L.2 incident addendum: reduced to the three facts that source inspection and on-chain
    // history genuinely cannot settle. Kamino is NOT asked to repeat its published $0-bad-debt record —
    // we have read it, quantified its scope (10.95% of this allocation), and recorded it.
    { id: "F_incidents", title: "Incident history — the unresolved remainder", questions: [
      "Has the exact Steakhouse vault (HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E) or the current KVault deployment (KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd, deployed 2026-07-14) experienced any non-public security, accounting, withdrawal, allocation, administrative or operational incident?",
      "Have any active Steakhouse markets — SOL/BTC (87.61% of this vault), JLP, Maple, Bitcoin — experienced a socialize_loss action, emergency action, or material withdrawal interruption not covered by public disclosures? We verified socialize_loss requires the lending_market_owner and found no invocation in that signer's full history from 2026-02-24, but earlier owners' periods are unsearched.",
      "Does Kamino maintain an authoritative incident register, or a scoped no-incident statement, for KVault and managed vaults — as distinct from the $0-bad-debt lending-market track record?",
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
  | "verified_disqualifying_condition"
  /* ---- added 16H-L.1: these replace diagnostics that the step RESOLVED. A resolved diagnostic that
     stays raised is noise; a real exposure that never gets raised is worse. ---- */
  | "allocation_admin_single_key_no_timelock"
  | "vault_admin_multisig_no_timelock"
  | "reserve_emergency_council_socialize_loss_exposure_unresolved"
  | "reserve_liquidity_below_vault_position"
  | "incident_review_excludes_vault_layer_and_dominant_market"
  /* ---- added 16H-L.2 ---- */
  | "audit_private_to_public_mapping_unattested"
  | "deployed_release_runtime_changes_publicly_unaudited";

/** The diagnostics currently RAISED. Internal only — never user copy. */
/**
 * 16H-L.1 rewrote this list. Diagnostics RESOLVED by this step were REMOVED, not left standing:
 * upgrade_authority_control_unknown, upgrade_authority_not_multisig_verified,
 * allocation_admin_control_unknown, admin_permissions_unknown, reserve_exposure_incomplete,
 * reserve_market_identity_unknown, withdrawal_model_incomplete, deposit_state_unknown. Keeping a
 * resolved diagnostic raised would misrepresent the evidence just as badly as dropping a live one.
 *
 * The replacements are not softer — `allocation_admin_control_unknown` ("we don't know") became
 * `allocation_admin_single_key_no_timelock` ("we know, and it's a single key").
 */
export const RAISED_DIAGNOSTICS: SteakhouseClosureDiagnostic[] = [
  // Authority — now KNOWN, and what is known is what gets raised.
  "allocation_admin_single_key_no_timelock",
  "vault_admin_multisig_no_timelock",
  // Reserve-layer exposure surfaced while answering the incident question.
  "reserve_emergency_council_socialize_loss_exposure_unresolved",
  "reserve_liquidity_below_vault_position",
  // 16H-L.2: `audit_deployment_linkage_unverified` REMOVED — the linkage was established by direct
  // inspection of the hash-verified deployed source. The two diagnostics replacing it are narrower and
  // true: the PRIVATE mapping is unattested, and part of the deployed release is publicly unaudited.
  "audit_private_to_public_mapping_unattested",
  "deployed_release_runtime_changes_publicly_unaudited",
  // Still genuinely open.
  "oracle_dependency_unknown",
  "incident_review_incomplete",
  "incident_review_excludes_vault_layer_and_dominant_market",
  "protocol_confirmation_required",
  "review_not_ready",
];

/**
 * Surfaced 16H-L.1 while answering the incident-history question, and material enough to name rather
 * than bury in a diagnostic string.
 *
 * Kamino's own curator documentation describes a per-lending-market `emergency_council` — an authority
 * DISTINCT from `lending_market_owner` — holding `socialize_loss` and similar emergency-only handlers,
 * plus market kill switches (`emergency_mode`, `borrow_disabled`,
 * `price_triggered_liquidation_disabled`). Kamino's own incident playbook says: "run socialize-loss if
 * a position becomes irrecoverable".
 *
 * WHY THIS MATTERS HERE: socialize_loss distributes bad debt to a market's DEPOSITORS. This vault is a
 * depositor in four markets. So there exist FOUR further authorities — none of them the vault's admin,
 * the allocation admin, or the upgrade authority — each able to impose a loss on this vault's users,
 * on a market whose owner WealthSmith has not identified.
 *
 * WHAT IS NOT CLAIMED: that any emergency_council is configured on these four markets, who controls
 * them, or that socialize_loss has ever been executed. None of that was verified. The exposure is
 * documented by Kamino as a designed capability; its configuration for THESE markets is UNRESOLVED.
 * This is recorded as an open exposure, NOT as a finding against the product — and explicitly not as
 * a disqualifier.
 */
export const RESERVE_EMERGENCY_AUTHORITY_EXPOSURE = {
  version: "1.0.0",
  raisedBy: "16H-L.1 incident-history review",
  documentedBy: "Kamino official curator documentation (kamino.com/docs/curators/markets/emergency-controls and related)",
  capability: "A market's emergency_council may execute socialize_loss, distributing bad debt to that market's depositors, and may set emergency_mode / borrow_disabled / price_triggered_liquidation_disabled.",
  whyItReachesThisVault: "The vault is a depositor in JLP Market, SOL/BTC Market, Bitcoin Market and Maple Market. A socialize_loss on any of them would land on this vault's position, and therefore on WealthSmith users — without any action by the vault's own authorities.",
  authoritiesNotIdentified: ["JLP Market", "SOL/BTC Market", "Bitcoin Market", "Maple Market"],
  configuredForTheseMarkets: "unresolved",
  everExecuted: "unresolved",
  isDisqualifier: false,
  note: "Kamino's $0-bad-debt track record is relevant context but does not resolve this: it is a statement about outcomes to date, not about who holds the switch. The exposure is structural.",
  evidenceCutoffAt: L1_INCIDENT_REVIEW_CUTOFF_AT,
} as const;

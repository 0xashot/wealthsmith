/**
 * klendDirectUsdcAuthorityEvidence — Step 16H-P.1a. Resolves the exact authority structures governing
 * the direct USDC lending product, and unblocks the 16H-P.1 package's one insufficient dimension.
 *
 * THERE IS NO SINGLE "KAMINO ADMIN". There are FOUR distinct authority layers on this market, and they
 * resolve to THREE DIFFERENT Squads multisigs with three different thresholds and timelocks:
 *
 *   layer                        vault PDA        multisig state    threshold  timelock
 *   ─────────────────────────────────────────────────────────────────────────────────────
 *   KLend program upgrade        GzFgdRJ…         6hhBGCt…          5-of-10    24h
 *   SOL/BTC market owner         24LjDBuk…        7idEEVR…          4-of-10    12h
 *   emergency council            4VtJ1yC…         9thcmUR…          2-of-7     none
 *   proposer authority           6pwkb7u…         UNRESOLVED — an off-curve PDA, but NOT a
 *                                                 Squads v4 vault PDA at indices 0-3
 *
 * Collapsing these would be wrong in both directions: the upgrade multisig cannot administer the market,
 * and the market owner cannot upgrade the program.
 *
 * A COINCIDENCE WORTH NAMING
 * --------------------------
 * KLend's upgrade authority is 5-of-10 + 24h — the SAME numbers 16H-L.1 verified for the KVAULT
 * program's upgrade authority. That is a coincidence of configuration, NOT evidence of identity, and it
 * is exactly the trap 16H-P.1 refused to walk into. Had we "inherited" KVault's authority facts we would
 * have arrived at the right numbers BY LUCK, which is worse than being wrong: it would have validated a
 * method that transfers evidence across programs. These numbers are verified independently, from KLend's
 * own ProgramData and its own multisig state.
 *
 * THE proposerAuthority IS NEW
 * ----------------------------
 * `LendingMarket.proposer_authority` = 6pwkb7uMsvqgmwPBKc3o4hnte6JnHpisSUrsdyvGcEUv appears in NO prior
 * evidence in this repository. It is off-curve (a PDA) but does not derive as a Squads v4 vault PDA at
 * indices 0-3. Its type, powers and controller are UNRESOLVED and recorded as such.
 *
 * STRICTLY READ-ONLY. No scores, no aggregate, no transaction.
 */

export const AUTHORITY_EVIDENCE_VERSION = "1.0.0" as const;
export const AUTHORITY_EVIDENCE_ID = "klend_direct_usdc_authority_evidence_v1" as const;

export const SQUADS_V4_PROGRAM = "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf" as const;
export const BPF_UPGRADEABLE_LOADER = "BPFLoaderUpgradeab1e11111111111111111111111" as const;
export const SYSTEM_PROGRAM = "11111111111111111111111111111111" as const;

export const AUTHORITY_OBSERVATION = {
  observedAtSlot: 433472706,
  observedAt: "2026-07-17T11:28:31.000Z",
  cluster: "mainnet-beta",
  method: "read-only RPC; Squads multisig states enumerated by anchor discriminator e07479ba44a14fec and vault PDAs re-derived to reverse-map each authority",
} as const;

/* ------------------------------------------------------------------ *
 * 1. Upgradeable-loader chain
 * ------------------------------------------------------------------ */

export const KLEND_LOADER_CHAIN = {
  program: "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
  programAccountOwner: BPF_UPGRADEABLE_LOADER,
  programAccountVariant: 2,
  programAccountVariantName: "Program",
  programDataPointer: "9uSbGW1y9H5Av6H5TKxQ1wnFApSq2t3oEpfF2YfjDQGA",
  programDataDerived: "9uSbGW1y9H5Av6H5TKxQ1wnFApSq2t3oEpfF2YfjDQGA",
  programDataPointerMatchesDerivation: true,
  programDataOwner: BPF_UPGRADEABLE_LOADER,
  programDataVariant: 3,
  programDataVariantName: "ProgramData",
  deployedCodeSlot: 422723185,
  upgradeAuthorityOptionPresent: true,
  upgradeAuthorityIsNull: false,
  isUpgradeable: true,
  exactUpgradeAuthority: "GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW",
  verificationNote:
    "The Program account's programdata pointer was read from account data AND independently re-derived from seeds [program] under the loader; both agree. The authority was read from ProgramData offset 13 after confirming the Option byte at offset 12 is 1.",
} as const;

/* ------------------------------------------------------------------ *
 * 2. Authority classification + Squads resolution
 * ------------------------------------------------------------------ */

export type AuthorityType =
  | "verified_squads_v4_vault_pda"
  | "off_curve_pda_not_squads_v4_vault"
  | "raw_keypair"
  | "unresolved";

export interface SquadsResolution {
  multisigState: string;
  vaultIndex: number;
  derivedVaultPda: string;
  derivationMatches: boolean;
  derivationSeeds: string;
  uniqueMatch: boolean;
  threshold: number;
  memberCount: number;
  timeLockSeconds: number;
  configAuthority: string;
  configAuthorityIsDefault: boolean;
  configAuthorityCanBypassThreshold: boolean;
  rentCollector: string | null;
  transactionIndex: number;
  membersAllPermissions: boolean;
  voterCount: number;
  executorCount: number;
  initiatorCount: number;
  anySingleMemberCanExecuteAlone: boolean;
}

export interface AuthorityLayer {
  layer: string;
  exactAddress: string;
  authorityType: AuthorityType;
  isOnCurve: boolean;
  accountOwner: string;
  accountDataLength: number;
  squads?: SquadsResolution;
  limitations: string[];
  invalidationTriggers: string[];
}

const SEEDS = '["multisig", <multisig_state>, "vault", <index u8>] under SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf';

/** KLend program upgrade authority. 5-of-10 + 24h — verified independently of KVault. */
export const UPGRADE_AUTHORITY_LAYER: AuthorityLayer = {
  layer: "klend_program_upgrade_authority",
  exactAddress: "GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW",
  authorityType: "verified_squads_v4_vault_pda",
  isOnCurve: false,
  accountOwner: SYSTEM_PROGRAM,
  accountDataLength: 0,
  squads: {
    multisigState: "6hhBGCtmg7tPWUSgp3LG6X2rsmYWAc4tNsA6G4CnfQbM",
    vaultIndex: 0,
    derivedVaultPda: "GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW",
    derivationMatches: true,
    derivationSeeds: SEEDS,
    uniqueMatch: true,
    threshold: 5,
    memberCount: 10,
    timeLockSeconds: 86400,
    configAuthority: SYSTEM_PROGRAM,
    configAuthorityIsDefault: true,
    configAuthorityCanBypassThreshold: false,
    rentCollector: null,
    transactionIndex: 92,
    membersAllPermissions: true,
    voterCount: 10,
    executorCount: 10,
    initiatorCount: 10,
    anySingleMemberCanExecuteAlone: false,
  },
  limitations: [
    "Member key → real-world identity is NOT established and was not inferred. Only public on-chain keys and permission masks are recorded.",
    "The period over which this authority has controlled KLend is UNRESOLVED (see AUTHORITY_HISTORY).",
  ],
  invalidationTriggers: ["set_upgrade_authority on KLend", "Squads config change on 6hhBGCt…", "member add/remove"],
};

/** SOL/BTC market owner. 4-of-10 + 12h — the reported claim, now VERIFIED. */
export const MARKET_OWNER_LAYER: AuthorityLayer = {
  layer: "sol_btc_lending_market_owner",
  exactAddress: "24LjDBukaUSHgPowcF2wY1XscnhChcBUDETN2UhBZMMT",
  authorityType: "verified_squads_v4_vault_pda",
  isOnCurve: false,
  accountOwner: SYSTEM_PROGRAM,
  accountDataLength: 0,
  squads: {
    multisigState: "7idEEVRidWrahZJhxXMqniDbV6ESj7ZjyLrigcMcEt6H",
    vaultIndex: 0,
    derivedVaultPda: "24LjDBukaUSHgPowcF2wY1XscnhChcBUDETN2UhBZMMT",
    derivationMatches: true,
    derivationSeeds: SEEDS,
    uniqueMatch: true,
    threshold: 4,
    memberCount: 10,
    timeLockSeconds: 43200,
    configAuthority: SYSTEM_PROGRAM,
    configAuthorityIsDefault: true,
    configAuthorityCanBypassThreshold: false,
    rentCollector: null,
    transactionIndex: 181,
    membersAllPermissions: true,
    voterCount: 10,
    executorCount: 10,
    initiatorCount: 10,
    anySingleMemberCanExecuteAlone: false,
  },
  limitations: [
    "Member identities not inferred.",
    "Market-owner PERIOD is UNRESOLVED, so official statements cannot be attributed to a known administrative regime.",
    "This is a DIFFERENT multisig from the upgrade authority (7idEEVR… vs 6hhBGCt…) with a different threshold and timelock, and its member set differs.",
  ],
  invalidationTriggers: ["update_lending_market_owner", "Squads config change on 7idEEVR…"],
};

/** Emergency council. 2-of-7 + NO timelock — the reported claim, now VERIFIED. */
export const EMERGENCY_COUNCIL_LAYER: AuthorityLayer = {
  layer: "sol_btc_emergency_council",
  exactAddress: "4VtJ1yCCyU2YGgPTZGHZRwzwaZ3hmzgqMtRQo8RqMa57",
  authorityType: "verified_squads_v4_vault_pda",
  isOnCurve: false,
  accountOwner: SYSTEM_PROGRAM,
  accountDataLength: 0,
  squads: {
    multisigState: "9thcmURbz3xgvv362Fy2uGVGoxMnD3ADRuwRp13nuXE5",
    vaultIndex: 0,
    derivedVaultPda: "4VtJ1yCCyU2YGgPTZGHZRwzwaZ3hmzgqMtRQo8RqMa57",
    derivationMatches: true,
    derivationSeeds: SEEDS,
    uniqueMatch: true,
    threshold: 2,
    memberCount: 7,
    timeLockSeconds: 0,
    configAuthority: SYSTEM_PROGRAM,
    configAuthorityIsDefault: true,
    configAuthorityCanBypassThreshold: false,
    rentCollector: null,
    transactionIndex: 6,
    membersAllPermissions: true,
    voterCount: 7,
    executorCount: 7,
    initiatorCount: 7,
    anySingleMemberCanExecuteAlone: false,
  },
  limitations: [
    "ZERO timelock: emergency actions execute immediately on reaching 2 approvals. That is the lowest bar of any layer here and is a real risk fact, mitigated ONLY by the restrictive-only power map.",
    "Member identities not inferred.",
  ],
  invalidationTriggers: ["emergency council reassignment on the market", "Squads config change on 9thcmUR…"],
};

/** proposerAuthority — a fourth layer, previously unrecorded and still unresolved. */
export const PROPOSER_AUTHORITY_LAYER: AuthorityLayer = {
  layer: "sol_btc_proposer_authority",
  exactAddress: "6pwkb7uMsvqgmwPBKc3o4hnte6JnHpisSUrsdyvGcEUv",
  authorityType: "off_curve_pda_not_squads_v4_vault",
  isOnCurve: false,
  accountOwner: SYSTEM_PROGRAM,
  accountDataLength: 0,
  limitations: [
    "NEW FINDING: LendingMarket.proposer_authority appears in NO prior evidence in this repository.",
    "It is off-curve (a PDA, not a keypair) but does NOT derive as a Squads v4 vault PDA at indices 0-3 across all 154,461 Squads v4 multisig states. Its controller and type are UNRESOLVED.",
    "Its exact powers under the deployed KLend program were NOT mapped in this task.",
  ],
  invalidationTriggers: ["proposer authority reassignment"],
};

export const AUTHORITY_LAYERS: AuthorityLayer[] = [
  UPGRADE_AUTHORITY_LAYER, MARKET_OWNER_LAYER, EMERGENCY_COUNCIL_LAYER, PROPOSER_AUTHORITY_LAYER,
];

export const LAYERS_ARE_DISTINCT = {
  thereIsNoSingleKaminoAdmin: true,
  distinctMultisigs: 3,
  upgradeCannotAdministerMarket: "The upgrade multisig 6hhBGCt… is not the market owner and holds no market-admin power.",
  marketOwnerCannotUpgradeProgram: "The market owner 7idEEVR… is not the program upgrade authority and cannot deploy code.",
  emergencyCouncilIsNeither: "The emergency council 9thcmUR… can neither upgrade the program nor exercise market-owner powers.",
  memberOverlapIsNotIdentity:
    "The upgrade and market-owner multisigs share 9 of 10 member keys but are DIFFERENT multisigs with different thresholds (5-of-10 / 24h vs 4-of-10 / 12h) and different member sets. Overlap is not identity.",
} as const;

/** The KVault coincidence, recorded so it is never mistaken for a transfer of evidence. */
export const KVAULT_COINCIDENCE = {
  kvaultUpgradeAuthorityConfig: "5-of-10 + 24h (verified at 16H-L.1, for the KVAULT program)",
  klendUpgradeAuthorityConfig: "5-of-10 + 24h (verified at 16H-P.1a, for the KLEND program)",
  numbersCoincide: true,
  isEvidenceOfIdentity: false,
  whyThisMatters:
    "Identical numbers are a coincidence of configuration, not proof the same multisig governs both. Had 16H-P.1 'inherited' KVault's authority facts it would have reached the right numbers BY LUCK — worse than being wrong, because it would have validated a method that transfers evidence across programs. KLend's values are verified independently from its own ProgramData and its own multisig state.",
  multisigsCompared: "KLend upgrade multisig is 6hhBGCtmg7tPWUSgp3LG6X2rsmYWAc4tNsA6G4CnfQbM. Whether KVault's upgrade multisig is the same state account was NOT verified here and must not be assumed.",
} as const;

/* ------------------------------------------------------------------ *
 * 3. Execution semantics
 * ------------------------------------------------------------------ */

export const SQUADS_EXECUTION_SEMANTICS = {
  approvalThresholdRequired: "the multisig's `threshold` distinct member approvals",
  proposalApprovalAndExecutionAreDistinct: true,
  timeLockStartsAt: "proposal approval — the timelock gates EXECUTION, not approval",
  executionRequiresExecutePermission: true,
  executionIsPermissionlessAfterApproval: false,
  executionNote: "Execution requires a member holding the Execute permission (mask 4). In all three multisigs every member holds Initiate+Vote+Execute, so any single member may EXECUTE an already-approved, timelock-elapsed proposal — but no single member can APPROVE one.",
  cancellationExists: true,
  cancellationNote: "Squads v4 supports proposal cancellation by members; cancellation is a distinct action from approval and execution.",
  configAuthorityBypass: {
    exists: false,
    detail: "All three multisigs have config_authority = Pubkey::default (System Program), i.e. they are AUTONOMOUS: configuration changes (threshold, time_lock, members) must themselves go through a proposal at the multisig's own threshold. A non-default config_authority would be an external key able to reconfigure unilaterally — a genuine threshold bypass. None exists here.",
    verifiedForAllThree: true,
  },
  thresholdCanBeChanged: "yes — but only via a proposal meeting the current threshold and timelock (autonomous config)",
  timeLockCanBeChanged: "yes — same constraint",
  membersCanBeAddedOrRemoved: "yes — same constraint",
  vaultPdaCanSignUpgrades: "yes — the vault PDA is the ProgramData upgrade authority, and Squads executes the Upgradeable Loader upgrade instruction as that PDA via CPI.",
  separateProgramUpgradePermission: "No separate Squads-level 'program upgrade' permission exists; the Initiate/Vote/Execute mask governs all vault actions uniformly.",
  doNotSummarizeAsNofMPlusTimelock:
    "For these three the 'N-of-M + timelock' summary IS accurate, because config_authority is default in every case. That was VERIFIED, not assumed — a non-default config_authority would have made the summary false.",
} as const;

/* ------------------------------------------------------------------ *
 * 4. Power map
 * ------------------------------------------------------------------ */

export interface PowerBinding {
  power: string;
  instruction: string;
  requiredSigner: string;
  timelockApplies: string;
  emergencyCouncilCanPerform: boolean;
  otherAuthorityCanPerform: string;
}

/**
 * Market-owner powers, bound to deployed KLend instructions. Supports BOTH upgrade_admin_authority and
 * manager_discretion — the same facts, read for different questions.
 */
export const MARKET_OWNER_POWERS: PowerBinding[] = [
  { power: "reserve configuration (all fields)", instruction: "update_reserve_config (lending_operations.rs L2606 config_items dispatch)", requiredSigner: "lending_market_owner", timelockApplies: "12h via the market-owner multisig", emergencyCouncilCanPerform: false, otherAuthorityCanPerform: "none" },
  { power: "deposit_limit / borrow_limit", instruction: "update_reserve_config", requiredSigner: "lending_market_owner", timelockApplies: "12h", emergencyCouncilCanPerform: false, otherAuthorityCanPerform: "none" },
  { power: "borrow_rate_curve", instruction: "update_reserve_config", requiredSigner: "lending_market_owner", timelockApplies: "12h", emergencyCouncilCanPerform: false, otherAuthorityCanPerform: "none" },
  { power: "protocol_take_rate_pct / host_fixed_interest_rate_bps", instruction: "update_reserve_config", requiredSigner: "lending_market_owner", timelockApplies: "12h", emergencyCouncilCanPerform: false, otherAuthorityCanPerform: "none" },
  { power: "reserve status (Active/Obsolete/Hidden)", instruction: "update_reserve_config", requiredSigner: "lending_market_owner", timelockApplies: "12h", emergencyCouncilCanPerform: false, otherAuthorityCanPerform: "none" },
  { power: "emergency_mode (blocks deposits AND redemptions)", instruction: "update_reserve_config / market config", requiredSigner: "lending_market_owner", timelockApplies: "12h", emergencyCouncilCanPerform: true, otherAuthorityCanPerform: "emergency council (restrictive direction only)" },
  { power: "block_ctoken_usage (disables deposits without touching the cap)", instruction: "update_reserve_config", requiredSigner: "lending_market_owner", timelockApplies: "12h", emergencyCouncilCanPerform: true, otherAuthorityCanPerform: "emergency council (restrictive direction only)" },
  { power: "oracle configuration", instruction: "update_reserve_config (token_info)", requiredSigner: "lending_market_owner", timelockApplies: "12h", emergencyCouncilCanPerform: false, otherAuthorityCanPerform: "none" },
  { power: "collateral + liquidation parameters", instruction: "update_reserve_config", requiredSigner: "lending_market_owner", timelockApplies: "12h", emergencyCouncilCanPerform: false, otherAuthorityCanPerform: "none" },
  { power: "deposit_withdrawal_cap (rolling limit)", instruction: "update_reserve_config", requiredSigner: "lending_market_owner", timelockApplies: "12h", emergencyCouncilCanPerform: true, otherAuthorityCanPerform: "emergency council (restrictive direction only)" },
  { power: "market permissioning", instruction: "update_lending_market", requiredSigner: "lending_market_owner", timelockApplies: "12h", emergencyCouncilCanPerform: false, otherAuthorityCanPerform: "none" },
  { power: "add reserves", instruction: "init_reserve", requiredSigner: "lending_market_owner", timelockApplies: "12h", emergencyCouncilCanPerform: false, otherAuthorityCanPerform: "none" },
  { power: "change market owner / emergency council", instruction: "update_lending_market_owner / update_lending_market", requiredSigner: "lending_market_owner", timelockApplies: "12h", emergencyCouncilCanPerform: false, otherAuthorityCanPerform: "none" },
  { power: "socialize_loss (writes down supplier principal)", instruction: "socialize_loss", requiredSigner: "lending_market_owner (has_one — VERIFIED)", timelockApplies: "12h", emergencyCouncilCanPerform: false, otherAuthorityCanPerform: "none" },
  { power: "direct asset transfer out of reserve vaults", instruction: "(none found)", requiredSigner: "n/a", timelockApplies: "n/a", emergencyCouncilCanPerform: false, otherAuthorityCanPerform: "No instruction was located allowing any authority to transfer user liquidity out of a reserve vault arbitrarily. Recorded as NOT FOUND rather than as proven absent." },
];

export const SOCIALIZE_LOSS_AUTHORITY = {
  requiredSigner: "lending_market_owner",
  constraint: "has_one on the instruction account struct — a hard account-level constraint, not a runtime check",
  emergencyCouncilCanInvoke: false,
  emergencyCouncilCannotInvokeNote: "VERIFIED at 16H-L.2 and unchanged: the emergency council is NOT the lending_market_owner, so it cannot satisfy the has_one constraint. This corrected Kamino's own prose docs.",
  effectiveThreshold: "4-of-10 with a 12h timelock (the market-owner multisig)",
  meaning: "Supplier principal can be written down by a 4-of-10 multisig after a 12-hour delay. This is a structural loss path, not a hypothetical.",
} as const;

export const EMERGENCY_COUNCIL_POWER_MAP = {
  authorityModel: "restrictive-only allowlist with a `_ => false` fallback (VERIFIED at 16H-L.2)",
  effectiveThreshold: "2-of-7, NO timelock — immediate execution on 2 approvals",
  can: [
    { action: "enable emergency mode", allowed: true, note: "restrictive — freezes both deposits AND redemptions" },
    { action: "tighten limits (lower caps)", allowed: true, note: "restrictive direction only" },
    { action: "set block_ctoken_usage", allowed: true, note: "restrictive — disables deposits" },
  ],
  cannot: [
    { action: "disable emergency mode", allowed: false, note: "loosening is not in the allowlist; only the market owner can un-freeze" },
    { action: "loosen limits (raise caps)", allowed: false, note: "not in the allowlist" },
    { action: "alter oracle configuration", allowed: false, note: "not in the allowlist" },
    { action: "alter borrow curves", allowed: false, note: "not in the allowlist" },
    { action: "move user funds", allowed: false, note: "no such instruction exists for any authority" },
    { action: "socialize losses", allowed: false, note: "socialize_loss has_one lending_market_owner" },
    { action: "upgrade KLend", allowed: false, note: "a different authority entirely (GzFgdRJ… / 6hhBGCt…)" },
    { action: "change market owner", allowed: false, note: "market-owner power" },
  ],
  cannotInheritMarketOwnerPowers: true,
  riskFraming:
    "Restrictive-only bounds the DIRECTION of harm, not its magnitude: 2-of-7 with zero timelock can freeze all exits immediately, and only a 4-of-10 + 12h market-owner action can reverse it. Restrictive is not harmless.",
} as const;

/* ------------------------------------------------------------------ *
 * 5. Authority history
 * ------------------------------------------------------------------ */

export const AUTHORITY_HISTORY = {
  reconstructionAttempted: true,
  reconstructionComplete: false,
  upgradeAuthorityPeriodStart: "UNRESOLVED",
  marketOwnerPeriodStart: "UNRESOLVED",
  emergencyCouncilPeriodStart: "UNRESOLVED",
  authorityChangedDuringIncidentPeriod: "UNRESOLVED",
  thresholdOrTimelockChangedDuringPeriod: "UNRESOLVED",
  whyUnresolved:
    "Full historical reconstruction requires transaction-history traversal beyond the read-only account reads performed here. The current authority evidence stands on its own; tenure was NOT invented.",
  currentEvidenceUnaffected: true,
  indirectSignal:
    "Squads transaction_index values (upgrade 92, market owner 181, emergency council 6) show each multisig has executed transactions, so none is freshly created — but an index is NOT a tenure proof and is recorded only as a weak signal.",
  supportsButDoesNotBlock: "This gap informs maturity and incident-scope interpretation. It does not block current-authority resolution.",
} as const;

export const UNRESOLVED_AUTHORITY_GAPS = [
  "proposer_authority 6pwkb7u… — type, controller and powers unresolved (off-curve PDA, not a Squads v4 vault PDA at indices 0-3)",
  "authority tenure / period start for all three multisigs",
  "whether any threshold or timelock changed during the incident-evidence period",
  "member key → real-world identity (deliberately not inferred)",
] as const;

/* ------------------------------------------------------------------ *
 * 6. Manifest
 * ------------------------------------------------------------------ */

export const AUTHORITY_EVIDENCE = {
  evidenceId: AUTHORITY_EVIDENCE_ID,
  version: AUTHORITY_EVIDENCE_VERSION,
  step: "16H-P.1a",
  candidateId: "kamino_usdc_lending",
  marketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
  klendProgram: KLEND_LOADER_CHAIN.program,
  programData: KLEND_LOADER_CHAIN.programDataPointer,
  preparerId: "claude_automated_evidence_preparer",
  preparationRole: "evidence_preparer" as const,
  preparerIsNotScorer: true,
  preparerIsNotHumanReviewer: true,
  evidenceTimestamp: AUTHORITY_OBSERVATION.observedAt,
  observedAtSlot: AUTHORITY_OBSERVATION.observedAtSlot,
  squadsProgram: SQUADS_V4_PROGRAM,
  layersResolved: 3,
  layersUnresolved: 1,
  containsScores: false,
  whatChanged: [
    "KLend loader chain reverified: Program → ProgramData pointer matches independent derivation; deployed code slot 422723185.",
    "Upgrade authority GzFgdRJ… resolved to Squads multisig 6hhBGCt… vault index 0: 5-of-10, 24h timelock, autonomous config.",
    "Market owner 24LjDBuk… resolved to Squads multisig 7idEEVR… vault index 0: 4-of-10, 12h — CONFIRMS the reported claim.",
    "Emergency council 4VtJ1yC… resolved to Squads multisig 9thcmUR… vault index 0: 2-of-7, NO timelock — CONFIRMS the reported claim.",
    "proposer_authority 6pwkb7u… discovered as a fourth, previously unrecorded layer; UNRESOLVED.",
    "config_authority verified default (autonomous) on all three — no threshold bypass exists.",
  ],
  invalidationTriggers: [
    "set_upgrade_authority on KLend",
    "update_lending_market_owner or emergency-council reassignment",
    "any Squads config change on 6hhBGCt…, 7idEEVR… or 9thcmUR…",
    "a non-default config_authority appearing on any of the three",
  ],
} as const;

export function computeAuthorityManifestHash(e: typeof AUTHORITY_EVIDENCE = AUTHORITY_EVIDENCE): string {
  const material = JSON.stringify({
    id: e.evidenceId, v: e.version, s: e.step, p: e.klendProgram, pd: e.programData,
    u: UPGRADE_AUTHORITY_LAYER.exactAddress, m: MARKET_OWNER_LAYER.exactAddress,
    ec: EMERGENCY_COUNCIL_LAYER.exactAddress, slot: e.observedAtSlot,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `authority_evidence_${h.toString(16).padStart(8, "0")}`;
}

export const AUTHORITY_MANIFEST_HASH = computeAuthorityManifestHash();

export const AUTHORITY_CONFERS = {
  confers: ["exact resolved authority structures for three layers", "an instruction-bound power map", "scoreability for upgrade_admin_authority"],
  doesNotConfer: [
    "a risk score", "an aggregate", "human review", "risk signoff", "product approval",
    "selector eligibility", "recommendation eligibility", "Top Pick", "a production card", "execution",
    "a judgement that the authority structure is safe",
  ],
  scoresAssigned: false,
  aggregateCalculated: false,
  humanReviewOccurred: false,
  signoffOccurred: false,
  productApproved: false,
  lifecycleChanged: false,
  steakhouseAssessmentChanged: false,
  transactionConstructedOrSimulated: false,
  resolvedIsNotSafe: "Resolving an authority structure describes it. It does not judge it. 4-of-10 + 12h over socialize_loss, and 2-of-7 + zero timelock over freezing exits, are facts for the scorer to weigh — not reassurances.",
} as const;

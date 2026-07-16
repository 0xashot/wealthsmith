/**
 * steakhouseIncidentEvidence — Step 16H-L.2 incident-history addendum.
 *
 * Assigns NO score, fills NO worksheet, completes NO review, approves NOTHING, constructs no
 * transaction and no simulation.
 *
 * THE HEADLINE: the structural exposure this addendum was asked to document turned out to be
 * materially different from its premise, and the difference is in the user's favour. The task stated
 * that each market's `emergency_council` "may invoke socialize_loss". Kamino's own prose curator
 * documentation says the same. THE VERIFIED DEPLOYED KLEND BINARY SAYS OTHERWISE — see
 * SOCIALIZE_LOSS_SEMANTICS. The council cannot socialize losses at all; only the lending-market owner
 * can, and on 87.61%+10.29%+1.44% of this vault's allocation that owner is a 4-of-10 Squads multisig
 * behind a 12-hour time lock.
 *
 * That correction was only possible because KLend, like KVault, publishes a verified build — so the
 * same 16H-L.2 move applies: read the deployed source, don't trust the prose.
 *
 * NO SINGLE `hasIncident` BOOLEAN EXISTS HERE, deliberately. Seven different kinds of thing are kept
 * apart: confirmed incidents, limited-scope official statements, search results, marketing claims,
 * unresolved third-party leads, structural loss mechanisms, and scope/cutoff.
 */
import type { RiskRubricV1DimensionId } from "./riskGovernance";

export const STEAKHOUSE_INCIDENT_EVIDENCE_VERSION = "1.0.0" as const;
export const INCIDENT_EVIDENCE_CUTOFF_AT = "2026-07-16T17:08:42.000Z";
export const INCIDENT_EVIDENCE_SLOT = "433313436";

/* ------------------------------------------------------------------ *
 * 1. Per-market emergency-council configuration
 * ------------------------------------------------------------------ */

export type MarketAuthorityCustody =
  | "verified_squads_vault_pda"
  | "verified_raw_keypair"
  | "verified_other_program_authority"
  | "unresolved_authority_model";

export interface MarketSquadsControl {
  multisigStateAccount: string;
  derivedFromSeeds: string;
  vaultIndex: number;
  threshold: number;
  memberCount: number;
  votingMemberCount: number;
  timeLockSeconds: number;
  configAuthorityIsDefault: boolean;
}

export interface MarketEmergencyAuthority {
  marketName: string;
  marketAddress: string;
  reserveAddress: string;
  allocationSharePct: number;
  lendingMarketOwner: string;
  lendingMarketOwnerCustody: MarketAuthorityCustody;
  lendingMarketOwnerSquads: MarketSquadsControl | null;
  emergencyCouncil: string;
  emergencyCouncilConfigured: boolean;
  emergencyCouncilCustody: MarketAuthorityCustody;
  emergencyCouncilSquads: MarketSquadsControl | null;
  otherAuthorities: { role: string; address: string; configured: boolean }[];
  marketFlags: { emergencyMode: number; borrowDisabled: number; priceTriggeredLiquidationDisabled: number; immutable: number };
  sourceSlot: string;
  sourceBlockTime: string;
}

const EC_SQUADS: MarketSquadsControl = {
  multisigStateAccount: "9thcmURbz3xgvv362Fy2uGVGoxMnD3ADRuwRp13nuXE5",
  derivedFromSeeds: '["multisig", 9thcmURbz3xgvv362Fy2uGVGoxMnD3ADRuwRp13nuXE5, "vault", 0u8]',
  vaultIndex: 0,
  threshold: 2,
  memberCount: 7,
  votingMemberCount: 7,
  timeLockSeconds: 0,
  configAuthorityIsDefault: true,
};

const OWNER_SQUADS: MarketSquadsControl = {
  multisigStateAccount: "7idEEVRidWrahZJhxXMqniDbV6ESj7ZjyLrigcMcEt6H",
  derivedFromSeeds: '["multisig", 7idEEVRidWrahZJhxXMqniDbV6ESj7ZjyLrigcMcEt6H, "vault", 0u8]',
  vaultIndex: 0,
  threshold: 4,
  memberCount: 10,
  votingMemberCount: 10,
  timeLockSeconds: 43200,
  configAuthorityIsDefault: true,
};

/**
 * Read on-chain at slot 433313436. These authorities are kept STRICTLY SEPARATE from the KVault
 * upgrade authority, vault admin and allocation admin — they are a different protocol layer with
 * different controllers, and merging them would hide exactly the dependency this section documents.
 *
 * TWO FACTS WORTH READING TWICE:
 *
 * 1. ALL FOUR markets share ONE emergency council (4VtJ1yCC…) — a single authority sitting over 100%
 *    of this vault's allocation. Concentration, recorded as such.
 * 2. Every one of these authorities is OFF-CURVE, System-Program-owned, with zero data — precisely
 *    the signature that 16H-L misread as an EOA. Applying that lesson, each was DERIVED rather than
 *    assumed: the council and the 3-market owner both reproduce exactly from Squads v4 vault-PDA
 *    seeds. The Bitcoin market's owner did not derive from recent history and is recorded as
 *    `unresolved_authority_model` — off-curve, so NOT a raw keypair, but which program derives it is
 *    unproven. Unresolved is not EOA.
 *
 * Corroboration: the 4-of-10 / 12h owner multisig matches Kamino's published reference ("12h on
 * SOL/BTC Market"), which is independent support for the derivation being right.
 */
export const MARKET_EMERGENCY_AUTHORITIES: MarketEmergencyAuthority[] = [
  {
    marketName: "SOL/BTC Market",
    marketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
    reserveAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
    allocationSharePct: 87.61,
    lendingMarketOwner: "24LjDBukaUSHgPowcF2wY1XscnhChcBUDETN2UhBZMMT",
    lendingMarketOwnerCustody: "verified_squads_vault_pda",
    lendingMarketOwnerSquads: OWNER_SQUADS,
    emergencyCouncil: "4VtJ1yCCyU2YGgPTZGHZRwzwaZ3hmzgqMtRQo8RqMa57",
    emergencyCouncilConfigured: true,
    emergencyCouncilCustody: "verified_squads_vault_pda",
    emergencyCouncilSquads: EC_SQUADS,
    otherAuthorities: [
      { role: "proposerAuthority", address: "6pwkb7uMsvqgmwPBKc3o4hnte6JnHpisSUrsdyvGcEUv", configured: true },
      { role: "permissioningAuthority", address: "11111111111111111111111111111111", configured: false },
    ],
    marketFlags: { emergencyMode: 0, borrowDisabled: 0, priceTriggeredLiquidationDisabled: 0, immutable: 0 },
    sourceSlot: INCIDENT_EVIDENCE_SLOT,
    sourceBlockTime: INCIDENT_EVIDENCE_CUTOFF_AT,
  },
  {
    marketName: "JLP Market",
    marketAddress: "DxXdAyU3kCjnyggvHmY5nAwg5cRbbmdyX3npfDMjjMek",
    reserveAddress: "Ga4rZytCpq1unD4DbEJ5bkHeUz9g3oh9AAFEi6vSauXp",
    allocationSharePct: 10.29,
    lendingMarketOwner: "24LjDBukaUSHgPowcF2wY1XscnhChcBUDETN2UhBZMMT",
    lendingMarketOwnerCustody: "verified_squads_vault_pda",
    lendingMarketOwnerSquads: OWNER_SQUADS,
    emergencyCouncil: "4VtJ1yCCyU2YGgPTZGHZRwzwaZ3hmzgqMtRQo8RqMa57",
    emergencyCouncilConfigured: true,
    emergencyCouncilCustody: "verified_squads_vault_pda",
    emergencyCouncilSquads: EC_SQUADS,
    otherAuthorities: [{ role: "proposerAuthority", address: "11111111111111111111111111111111", configured: false }],
    marketFlags: { emergencyMode: 0, borrowDisabled: 0, priceTriggeredLiquidationDisabled: 0, immutable: 0 },
    sourceSlot: INCIDENT_EVIDENCE_SLOT,
    sourceBlockTime: INCIDENT_EVIDENCE_CUTOFF_AT,
  },
  {
    marketName: "Maple Market",
    marketAddress: "6WEGfej9B9wjxRs6t4BYpb9iCXd8CpTpJ8fVSNzHCC5y",
    reserveAddress: "Atj6UREVWa7WxbF2EMKNyfmYUY1U1txughe2gjhcPDCo",
    allocationSharePct: 1.44,
    lendingMarketOwner: "24LjDBukaUSHgPowcF2wY1XscnhChcBUDETN2UhBZMMT",
    lendingMarketOwnerCustody: "verified_squads_vault_pda",
    lendingMarketOwnerSquads: OWNER_SQUADS,
    emergencyCouncil: "4VtJ1yCCyU2YGgPTZGHZRwzwaZ3hmzgqMtRQo8RqMa57",
    emergencyCouncilConfigured: true,
    emergencyCouncilCustody: "verified_squads_vault_pda",
    emergencyCouncilSquads: EC_SQUADS,
    otherAuthorities: [{ role: "proposerAuthority", address: "11111111111111111111111111111111", configured: false }],
    marketFlags: { emergencyMode: 0, borrowDisabled: 0, priceTriggeredLiquidationDisabled: 0, immutable: 0 },
    sourceSlot: INCIDENT_EVIDENCE_SLOT,
    sourceBlockTime: INCIDENT_EVIDENCE_CUTOFF_AT,
  },
  {
    marketName: "Bitcoin Market",
    marketAddress: "GMqmFygF5iSm5nkckYU6tieggFcR42SyjkkhK5rswFRs",
    reserveAddress: "9FRZvAsjDJ6WM8BJ2S45h9PoDCLAq8DNY9zZDX7MyGzT",
    allocationSharePct: 0.66,
    lendingMarketOwner: "A9rQoX1sictAQkyXxaZA8nz674xutHwoqpK2mwLyexCZ",
    lendingMarketOwnerCustody: "unresolved_authority_model",
    lendingMarketOwnerSquads: null,
    emergencyCouncil: "4VtJ1yCCyU2YGgPTZGHZRwzwaZ3hmzgqMtRQo8RqMa57",
    emergencyCouncilConfigured: true,
    emergencyCouncilCustody: "verified_squads_vault_pda",
    emergencyCouncilSquads: EC_SQUADS,
    otherAuthorities: [
      { role: "lendingMarketOwnerCached", address: "24LjDBukaUSHgPowcF2wY1XscnhChcBUDETN2UhBZMMT", configured: true },
      { role: "proposerAuthority", address: "11111111111111111111111111111111", configured: false },
    ],
    marketFlags: { emergencyMode: 0, borrowDisabled: 0, priceTriggeredLiquidationDisabled: 0, immutable: 0 },
    sourceSlot: INCIDENT_EVIDENCE_SLOT,
    sourceBlockTime: INCIDENT_EVIDENCE_CUTOFF_AT,
  },
];

/** Kept explicit so nobody merges the KLend layer into the KVault authority model. */
export const MARKET_AUTHORITIES_ARE_A_SEPARATE_LAYER = {
  separateFromKvaultAuthorities: true,
  kvaultAuthorities: ["program_upgrade_authority", "vault_admin_authority", "allocation_admin"],
  klendMarketAuthorities: ["lending_market_owner", "emergency_council", "proposer_authority", "global_admin"],
  note: "Different protocol, different program, different controllers. The KVault upgrade authority (5-of-10, 24h) and the KLend market owner (4-of-10, 12h) are distinct multisigs with distinct member sets. Merging them into one 'authority risk' verdict would hide which layer holds which power.",
  singleCouncilOverEntireAllocation: {
    council: "4VtJ1yCCyU2YGgPTZGHZRwzwaZ3hmzgqMtRQo8RqMa57",
    coversAllocationPct: 100,
    note: "All four markets share one emergency council. Its powers are narrow and restrictive-only (see EMERGENCY_COUNCIL_POWERS), but the concentration is real and is recorded rather than netted away.",
  },
} as const;

/* ------------------------------------------------------------------ *
 * 2. socialize_loss semantics — from the VERIFIED DEPLOYED KLend binary
 * ------------------------------------------------------------------ */

/**
 * KLend publishes a verified build, so the same move that made 16H-L.2 possible applies here:
 *   registry   verify.osec.io/status/KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD
 *   status     verified; on_chain_hash === executable_hash === 73f4aef8ce9ee13b…
 *   commit     37592174054e3aa669a7fe6db6272d4be82b2268
 * Everything below was read at THAT commit — i.e. the bytes actually running on mainnet, not the
 * repository's HEAD (which was checked first and then discarded in favour of the verified commit).
 */
export const KLEND_VERIFICATION = {
  programId: "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
  registry: "solana-verify / OtterSec",
  status: "verified",
  verifiedCommit: "37592174054e3aa669a7fe6db6272d4be82b2268",
  onChainHash: "73f4aef8ce9ee13bc60ae0d3c5bed1c1499bda5356a3370c993aeda70d659505",
  hashesMatch: true,
  repositoryUrl: "https://github.com/Kamino-Finance/klend/tree/37592174054e3aa669a7fe6db6272d4be82b2268",
  note: "This is what licenses reading KLend source as evidence about the running program. Without it, source would only be a hypothesis about the deployed binary.",
} as const;

/**
 * THE PREMISE CORRECTION, and it is the most consequential finding of this addendum.
 *
 * The task stated — and Kamino's own prose curator documentation states — that the per-market
 * `emergency_council` "may invoke socialize_loss". The verified deployed binary does not support that.
 *
 * The `SocializeLoss` accounts struct at the deployed commit is:
 *
 *     pub lending_market_owner: Signer<'info>,
 *
 *     #[account(has_one = lending_market_owner)]
 *     pub lending_market: AccountLoader<'info, LendingMarket>,
 *
 * `has_one = lending_market_owner` compiles to: `lending_market.lending_market_owner ==
 * lending_market_owner.key()`. The signer must BE the market's owner field. The string
 * "emergency_council" does not appear anywhere in handler_socialize_loss.rs. There is no branch, no
 * alternative authority, no override.
 *
 * WHY THE NAME ALONE WOULD NOT HAVE BEEN ENOUGH: an Anchor account named `lending_market_owner` proves
 * nothing by itself — the constraint could have accepted either authority, which is a common pattern
 * and is exactly what klend does elsewhere (see EMERGENCY_COUNCIL_POWERS, where the owner/council
 * branch genuinely exists). The `has_one` constraint is what settles it, so the constraint is what was
 * read.
 *
 * CONSEQUENCE: socialize_loss on 99.34% of this vault's allocation (SOL/BTC + JLP + Maple) requires a
 * 4-of-10 Squads multisig behind a 12-HOUR TIME LOCK. That is a materially stronger control than the
 * premise assumed, and it is the opposite of a fast unilateral switch.
 */
export const SOCIALIZE_LOSS_SEMANTICS = {
  boundToVerifiedCommit: KLEND_VERIFICATION.verifiedCommit,
  instructions: ["socialize_loss", "socialize_loss_v2"],

  premiseGiven: "Each market's emergency_council may invoke socialize_loss (per the task statement and Kamino's prose curator documentation).",
  premiseSupportedByDeployedSource: false,
  premiseCorrection:
    "The emergency_council CANNOT invoke socialize_loss. The deployed SocializeLoss accounts struct requires `lending_market_owner: Signer` and constrains the market with `has_one = lending_market_owner`; emergency_council is not referenced in the handler at all.",

  whoMayInvoke: "The lending_market_owner ONLY.",
  authorityValidation: "Anchor `has_one = lending_market_owner` on the LendingMarket account: lending_market.lending_market_owner must equal the signer. Enforced before handler logic.",
  triggeringPurpose: "Writing off irrecoverable debt on a specific obligation, per Kamino's incident playbook ('run socialize-loss if a position becomes irrecoverable').",
  scopeOfLoss: "reserve_specific_via_obligation",
  scopeDetail:
    "The instruction takes one `obligation` (mut) and one `reserve` (mut) plus a `liquidity_amount: u64`. Loss is applied to the named reserve via the named obligation — it is NOT a market-wide sweep in a single call. Remaining accounts carry the obligation's deposit reserves.",
  whoAbsorbsLoss:
    "Depositors of the affected RESERVE. Writing off borrowed liquidity reduces the reserve's total assets, which reduces the value of every cToken claim on it. Anyone holding that reserve's collateral tokens absorbs it pro rata.",
  kvaultDepositorsTreatedDifferently: false,
  kvaultDepositorsDetail:
    "No. The vault holds ordinary cTokens of these reserves — 16H-L.1 verified the ctoken_vault constraint chain. KLend has no notion of a vault depositor, so the vault's position is diluted exactly like any direct depositor's, and the loss flows through the vault's AUM to WealthSmith users pro rata. No preference, and no subordination either.",

  governanceThresholdOrDelay: {
    "SOL/BTC Market (87.61%)": "4-of-10 Squads v4 multisig (7idEEVRid…) behind a 12-hour time lock",
    "JLP Market (10.29%)": "same owner multisig: 4-of-10, 12-hour time lock",
    "Maple Market (1.44%)": "same owner multisig: 4-of-10, 12-hour time lock",
    "Bitcoin Market (0.66%)": "owner A9rQoX1s… — off-curve, so not a raw keypair, but its control model is UNRESOLVED. Threshold and delay unknown.",
  },
  allocationUnderTimelockedMultisigPct: 99.34,
  allocationUnderUnresolvedOwnerPct: 0.66,

  identifiableEventsOrPatterns:
    "Anchor discriminators: socialize_loss = f54b5b00ec611303, socialize_loss_v2 = ee5f62dcbb28cc9a (sha256('global:<name>')[0..8]). An invocation appears as a KLend instruction signed by the market owner, with the affected obligation and reserve as writable accounts. This is how SOCIALIZE_LOSS_HISTORY_SEARCH looked for it.",

  noExecutionCodeAdded: true,
} as const;

/**
 * What the council CAN do — narrower than the premise, and one-way.
 *
 * Every permitted mode is guarded by a VALUE check that only allows tightening. From the deployed
 * commit's `is_update_reserve_config_mode_allowed_for_emergency_council`:
 *
 *   UpdateBorrowLimit                        if value == 0   → disable borrowing
 *   UpdateDepositLimit                       if value == 0   → disable deposits
 *   UpdateBlockPriceUsage                    if value == 1   → block price usage
 *   UpdateReserveEmergencyMode               if value == 1   → enable emergency mode
 *   UpdateDisableUsageAsCollateralOutsideEmode if value == 1 → disable
 *   UpdateLoanToValuePct                     if value == 0   → LTV to zero
 *   _ => false                                               → everything else denied
 *
 * And at market level (handler_update_lending_market): UpdateEmergencyMode, UpdateBorrowingDisabled,
 * UpdatePriceTriggeredLiquidationDisabled — each only `if value == true`.
 *
 * So the council is a ONE-WAY SAFETY BRAKE. It can freeze and restrict; it cannot loosen a parameter,
 * cannot raise a limit, cannot re-enable anything, and cannot socialize a loss. Its 2-of-7 / no-time-lock
 * configuration is coherent with that: Kamino's docs describe deliberately pairing a FAST council with
 * a SLOW timelocked owner so incident response is quick while consequential changes stay deliberate.
 * A low threshold on a brake-only authority is a different proposition from a low threshold on a
 * loss-imposing one.
 *
 * THE HONEST RESIDUE: a brake still has user impact. UpdateDepositLimit→0 or reserve emergency mode
 * would impede the vault's ability to move or exit liquidity in that reserve, and 2-of-7 with no delay
 * can do it instantly across all four markets. That is a liquidity/availability exposure, not a loss
 * mechanism, and it is mapped as such.
 */
export const EMERGENCY_COUNCIL_POWERS = {
  boundToVerifiedCommit: KLEND_VERIFICATION.verifiedCommit,
  canSocializeLoss: false,
  isRestrictiveOnly: true,
  reserveLevelAllowlist: [
    "UpdateBorrowLimit (only to 0 — disable borrowing)",
    "UpdateDepositLimit (only to 0 — disable deposits)",
    "UpdateBlockPriceUsage (only to 1 — block)",
    "UpdateReserveEmergencyMode (only to 1 — enable)",
    "UpdateDisableUsageAsCollateralOutsideEmode (only to 1 — disable)",
    "UpdateLoanToValuePct (only to 0)",
  ],
  marketLevelAllowlist: [
    "UpdateEmergencyMode (only to true)",
    "UpdateBorrowingDisabled (only to true)",
    "UpdatePriceTriggeredLiquidationDisabled (only to true)",
  ],
  everythingElseDenied: "The match arm falls through to `_ => false`; the fallback authority is `lending_market.lending_market_owner == signer`.",
  councilControl: "Squads v4 vault PDA of 9thcmURbz… — 2-of-7, NO time lock, config_authority default.",
  designRationale: "Kamino's documentation describes pairing a fast emergency-council multisig with a slower timelocked market owner so incident response is quick while routine changes stay deliberate. The 2-of-7/no-lock configuration is consistent with a brake-only authority BY DESIGN.",
  residualUserImpact:
    "A brake is not harmless. DepositLimit→0 or reserve emergency mode would impede the vault's ability to deploy or withdraw liquidity in that reserve, and 2-of-7 with no time lock can act instantly across all four markets simultaneously. This is an availability/liquidity exposure, not a loss mechanism.",
  isDisqualifier: false,
} as const;

/* ------------------------------------------------------------------ *
 * 3. socialize_loss history search
 * ------------------------------------------------------------------ */

export type HistorySearchOutcome =
  | "verified_invocation_found"
  | "no_invocation_found_within_reviewed_history"
  | "history_search_incomplete"
  | "unable_to_identify_invocation_deterministically";

/**
 * Because only the market OWNER can invoke socialize_loss, the owner's transaction history is the
 * tightest possible haystack — far smaller than a reserve's. That is why it was searched instead.
 *
 * RESULT PER SCOPE:
 *   owner 24LjDBuk… (SOL/BTC + JLP + Maple, 99.34%): 166 signatures = its COMPLETE history for this
 *     address (fewer than the 1000 cap), spanning 2026-02-24 → 2026-07-16. All 166 fetched and
 *     inspected for the socialize_loss/v2 discriminators and log patterns. 162 involve KLend.
 *     ZERO socialize_loss invocations.
 *   owner A9rQoX1s… (Bitcoin, 0.66%): hit the 1000-signature cap; older history unsearched.
 *
 * OVERALL: `history_search_incomplete`, NOT "no invocation found" — and certainly not "never invoked".
 * Two bounds make the stronger claim unavailable, and both are real rather than pedantic:
 *   1. The 166 signatures are the full history OF THIS SIGNER, which begins 2026-02-24. The markets
 *      are older. A PREVIOUS owner could have socialized a loss before this address held the role,
 *      and that period was not searched.
 *   2. The Bitcoin market's owner history is truncated at the RPC cap.
 * "We searched the current owner's entire history and found nothing" is a genuine, bounded result. It
 * is not the same claim as "no loss was ever socialized on these markets", and it is not recorded as
 * one.
 */
export const SOCIALIZE_LOSS_HISTORY_SEARCH = {
  outcome: "history_search_incomplete" as HistorySearchOutcome,
  method: "Read-only getSignaturesForAddress + getTransaction over the lending_market_owner accounts (the only authority that can invoke socialize_loss), matching Anchor discriminators f54b5b00ec611303 / ee5f62dcbb28cc9a and log patterns. No execution, no simulation.",
  scopes: [
    {
      scope: "owner 24LjDBukaUSHgPowcF2wY1XscnhChcBUDETN2UhBZMMT — SOL/BTC + JLP + Maple (99.34% of allocation)",
      signaturesRetrieved: 166,
      hitRpcCap: false,
      completeForThisSigner: true,
      windowStart: "2026-02-24T14:58:49.000Z",
      windowEnd: "2026-07-16T16:43:13.000Z",
      transactionsInspected: 166,
      klendInvolvingTransactions: 162,
      socializeLossInvocationsFound: 0,
      scopeOutcome: "no_invocation_found_within_reviewed_history" as HistorySearchOutcome,
    },
    {
      scope: "owner A9rQoX1sictAQkyXxaZA8nz674xutHwoqpK2mwLyexCZ — Bitcoin Market (0.66%)",
      signaturesRetrieved: 1000,
      hitRpcCap: true,
      completeForThisSigner: false,
      windowStart: "2025-06-03T07:51:53.000Z",
      windowEnd: "2026-07-13T13:52:34.000Z",
      transactionsInspected: 0,
      klendInvolvingTransactions: 0,
      socializeLossInvocationsFound: 0,
      scopeOutcome: "history_search_incomplete" as HistorySearchOutcome,
    },
  ],
  limitations: [
    "The 166 signatures are the COMPLETE history of that signer address, but that address's history begins 2026-02-24. The markets predate it. A previous market owner could have invoked socialize_loss earlier; that period was NOT searched.",
    "The Bitcoin market owner's history hit the 1000-signature RPC cap; older history is unsearched.",
    "Only owner-side history was searched. An invocation is necessarily owner-signed, so this is the correct haystack — but it inherits the owner's history window.",
  ],
  absenceInterpretation:
    "Zero invocations were found in the reviewed windows. That is a SEARCH RESULT about what was looked at, never a claim about what happened. 'No invocation found' is NOT 'never invoked' and is NOT recorded as one.",
  evidenceCutoffAt: INCIDENT_EVIDENCE_CUTOFF_AT,
} as const;

/* ------------------------------------------------------------------ *
 * 4. The incident evidence model — seven kinds, never one boolean
 * ------------------------------------------------------------------ */

/**
 * Exposed so a fixture can assert it: there is deliberately NO `hasIncident` boolean anywhere in this
 * module. Collapsing seven different epistemic categories into one flag is precisely how "no
 * postmortem found" silently becomes "clean history".
 */
export const NO_SINGLE_HAS_INCIDENT_BOOLEAN = {
  exists: false,
  reason: "Confirmed incidents, limited-scope official statements, search results, marketing claims, unresolved third-party leads, structural loss mechanisms, and scope/cutoff are seven different kinds of thing. A boolean would have to pick one and discard six.",
} as const;

/** Official material covering the Feb 2026 event named these markets. Ours are mostly not among them. */
export const OFFICIAL_EVENT_MARKET_COVERAGE = {
  marketsNamedInOfficialStressEventMaterial: ["Main", "JLP", "Bitcoin", "Fartcoin", "JTO"],
  thisVaultsMarkets: [
    { market: "SOL/BTC Market", pct: 87.61, namedInOfficialEventMaterial: false },
    { market: "JLP Market", pct: 10.29, namedInOfficialEventMaterial: true },
    { market: "Maple Market", pct: 1.44, namedInOfficialEventMaterial: false },
    { market: "Bitcoin Market", pct: 0.66, namedInOfficialEventMaterial: true },
  ],
  /** JLP 10.29 + Bitcoin 0.66. Computed from the same slot as RESERVE_WITHDRAWAL_BEHAVIOR. */
  coveredAllocationPct: 10.95,
  uncoveredAllocationPct: 89.05,
  useOfThisPercentage:
    "SCOPE DESCRIPTION ONLY. It states how much of the current allocation the official event reports demonstrably speak to. It is NOT a risk weight, NOT a score input, and it emphatically does NOT imply the uncovered 89.05% experienced incidents — uncovered means unexamined, not adverse.",
  uncoveredMeansUnexamined: true,
  allocationIsDynamic:
    "These percentages are a slot-bound snapshot. The allocation admin can change them at any time (observed drift: SOL/BTC 74.2% → 69.37% → 87.61%), so the coverage percentage itself moves with the allocation and must be recomputed, not cached.",
} as const;

export interface OfficialLimitedScopeStatement {
  claim: string;
  source: string;
  sourceType: "official_primary";
  scope: string;
  statedCutoffDate: string | null;
  latestEventDocumented: string;
  coversExactVault: boolean;
  coversCurrentKvaultDeployment: boolean;
  coversAllActiveMarkets: boolean;
  establishesAbsenceOfNonBadDebtIncidents: boolean;
  namedEvents: { event: string; date: string; collateralSeized: string; badDebt: string }[];
}

export const OFFICIAL_LIMITED_SCOPE_STATEMENTS: OfficialLimitedScopeStatement[] = [
  {
    claim: "$0 bad debt across all protocol lending markets since November 2023, across 5 significant stress events; protocol continued operating normally with no degradation in service.",
    source: "https://kamino.com/docs/risk/index — 'Battle-Tested Track Record'. Feb 5-6 2026 event detailed at gov.kamino.finance/t/kamino-risk-event-analysis-feb-5-6-2026/868, authored by Allez Labs (a third-party risk firm publishing in an official venue).",
    sourceType: "official_primary",
    scope: "BAD DEBT ONLY; LENDING MARKETS ONLY; from 2023-11.",
    statedCutoffDate: null,
    latestEventDocumented: "2026-02-06",
    coversExactVault: false,
    coversCurrentKvaultDeployment: false,
    coversAllActiveMarkets: false,
    establishesAbsenceOfNonBadDebtIncidents: false,
    namedEvents: [
      { event: "Flash Analysis", date: "2025-02-16/18", collateralSeized: "$4.1M", badDebt: "$0" },
      { event: "Market Correction", date: "2025-02-24 – 2025-03-02", collateralSeized: "$22.1M", badDebt: "$0" },
      { event: "SOL/ETH Crash", date: "2025-04-06/07", collateralSeized: "$16M", badDebt: "$0" },
      { event: "October Correction", date: "2025-10-10", collateralSeized: "$20M", badDebt: "$0" },
      { event: "SOL -18% Crash", date: "2026-02-05/06", collateralSeized: "$19.36M", badDebt: "$0" },
    ],
  },
];

export const MARKETING_CLAIMS = [
  {
    claim: "3 years. 0 bad debt. 0 exploits. 0 Incidents.",
    source: "Kamino official X account, post 1955968425735397501",
    sourceType: "official_marketing" as const,
    hasDefinedScope: false,
    hasCutoff: false,
    hasMethodology: false,
    hasIncidentTaxonomy: false,
    usableToEstablishCleanHistory: false,
    note: "The ONLY located Kamino statement asserting '0 Incidents' rather than '$0 bad debt'. Retained as context because the questionnaire asked whether such a statement exists — it does. It defines no scope, no cutoff, no methodology and no incident taxonomy, so it cannot establish a clean incident history and is never cited as evidence.",
  },
];

export const UNRESOLVED_THIRD_PARTY_LEADS = [
  {
    lead: "A third-party report alleges approximately $1.26M of bad debt across Solend, Coin98 and 'Kamino' lending pools arising from USDH oracle manipulation.",
    sourceType: "third_party_unverified" as const,
    classification: "unresolved_third_party_lead" as const,
    isConfirmedIncident: false,
    whyNotRecordedAsFact:
      "No primary source located. A third-party source may LOCATE primary evidence but can never establish a fact. It also appears to predate Kamino Lend's stated November 2023 launch, so it may concern a different or earlier product — a hypothesis, not a finding.",
    retained: true,
    resolvedBy: "A primary Kamino disclosure, or confirmation of which product and date the claim refers to.",
  },
];

/** Structural mechanisms by which depositors could lose value — capability, not incident. */
export const STRUCTURAL_LOSS_MECHANISMS = [
  {
    mechanism: "socialize_loss on an active market's reserve",
    reachesVaultDepositors: true,
    reachDetail: "The vault holds ordinary cTokens; a write-off dilutes every cToken claim on that reserve pro rata, flowing through vault AUM to WealthSmith users.",
    controlledBy: "lending_market_owner — NOT the emergency council (verified against the deployed KLend binary, correcting the stated premise).",
    controlStrength: "99.34% of allocation sits behind a 4-of-10 Squads multisig with a 12-hour time lock. The remaining 0.66% (Bitcoin Market) sits behind an owner whose control model is unresolved.",
    isConfirmedIncident: false,
    isDisqualifier: false,
    everInvoked: "unresolved — see SOCIALIZE_LOSS_HISTORY_SEARCH (history_search_incomplete)",
  },
  {
    mechanism: "emergency_council restrictive actions (deposit/borrow limits to 0, reserve or market emergency mode, LTV to 0)",
    reachesVaultDepositors: true,
    reachDetail: "Cannot impose a loss, but can impede the vault's ability to deploy or exit liquidity in a reserve — which matters because 16H-L.1 established the vault holds ~0 unencumbered buffer and depends entirely on reserve liquidity for withdrawals.",
    controlledBy: "emergency_council 4VtJ1yCC… — one Squads 2-of-7 multisig with NO time lock, over ALL FOUR markets.",
    controlStrength: "Weak threshold and no delay — but the powers are restrictive-only by construction (`_ => false` fallback), which is a deliberate fast-brake design per Kamino's documentation.",
    isConfirmedIncident: false,
    isDisqualifier: false,
    everInvoked: "Not currently active: emergencyMode=0, borrowDisabled=0, priceTriggeredLiquidationDisabled=0 on all four markets at slot 433313436. Historical invocation not searched.",
  },
];

/** Confirmed incidents affecting this product. Empty — and that is a search result, not a finding. */
export const CONFIRMED_INCIDENTS: { incident: string; source: string; date: string }[] = [];

export const INCIDENT_EVIDENCE_SCOPE = {
  cutoffAt: INCIDENT_EVIDENCE_CUTOFF_AT,
  slot: INCIDENT_EVIDENCE_SLOT,
  sourcesReviewed: [
    "Kamino official documentation corpus (llms-full.txt, 2.25MB) searched for postmortem/incident/exploit/hack/bad debt/insolvency/emergency mode/pause/disclosure/breach/attack/vulnerability",
    "Kamino official risk documentation ('Battle-Tested Track Record', kamino.com/docs/risk)",
    "Kamino official governance forum (gov.kamino.finance), including the Feb 5-6 2026 Risk Event Analysis and searches for this vault's markets and the kvault program",
    "Kamino official audits repository (Kamino-Finance/audits)",
    "Verified deployed KLend source at commit 37592174… (socialize_loss + emergency_council semantics)",
    "On-chain lending-market state for all four active markets (slot 433313436)",
    "On-chain transaction history of both lending_market_owner authorities",
  ],
  coverageGaps: [
    "The exact Steakhouse vault — no incident source covering it was located anywhere.",
    "The current KVault deployment (2026-07-14) — no published review postdates it.",
    "SOL/BTC Market (87.61%) and Maple Market (1.44%) — absent from official stress-event material.",
    "Any period after 2026-05-05 (latest monthly risk report located).",
    "socialize_loss history before 2026-02-24 (previous market owners) and truncated Bitcoin-market owner history.",
    "Non-public incidents, bug-bounty disclosures, near-misses.",
  ],
  noCleanHistoryClaimMade: true,
} as const;

/* ------------------------------------------------------------------ *
 * 5. Incident evidence completeness
 * ------------------------------------------------------------------ */

export interface IncidentCompletenessInputs {
  allReviewedSourcesListed: boolean;
  scopeAndCutoffExplicit: boolean;
  vaultProgramMarketCoverageGapsExplicit: boolean;
  unresolvedReportsPreserved: boolean;
  structuralMechanismsDocumented: boolean;
  historicalSearchLimitationsExplicit: boolean;
  noCleanHistoryClaimMade: boolean;
  /** A verified disqualifier would be a confirmed unremediated exploit. */
  verifiedDisqualifyingIncident: boolean;
}

export type IncidentEvidenceCompleteness = "complete_for_human_scoring" | "blocked";

/**
 * A complete incident-history package does NOT require proof that no incident ever occurred — that is
 * unprovable for any protocol, and demanding it would make this dimension permanently unscoreable.
 *
 * It requires that the reviewer knows exactly what was looked at, what was found, what was not covered,
 * and what remains open. That is satisfied here, and the resulting picture is genuinely mixed:
 * zero confirmed incidents, a strong official bad-debt record that covers only 10.95% of this
 * allocation, an unresolved third-party lead, and a real structural loss mechanism — better controlled
 * than the premise claimed, but real.
 *
 * Mixed and bounded is scoreable. It is not favourable, and it is not an approval.
 */
export function evaluateIncidentEvidenceCompleteness(i: IncidentCompletenessInputs): { result: IncidentEvidenceCompleteness; reason: string } {
  if (i.verifiedDisqualifyingIncident) return { result: "blocked", reason: "A verified disqualifying incident exists." };
  const ok = i.allReviewedSourcesListed && i.scopeAndCutoffExplicit && i.vaultProgramMarketCoverageGapsExplicit && i.unresolvedReportsPreserved && i.structuralMechanismsDocumented && i.historicalSearchLimitationsExplicit && i.noCleanHistoryClaimMade;
  if (!ok) return { result: "blocked", reason: "One or more completeness criteria are unmet." };
  return { result: "complete_for_human_scoring", reason: "Every reviewed source is listed; scope and cutoff are explicit; vault/program/market coverage gaps are enumerated with the exact covered allocation (10.95%); the unresolved third-party lead is preserved; structural loss mechanisms are documented against the verified deployed KLend binary; search limitations are explicit; and no clean-history claim is made. Sufficient for a human to score incident_history — NOT favourable, NOT an approval." };
}

export const STEAKHOUSE_INCIDENT_COMPLETENESS_INPUTS: IncidentCompletenessInputs = {
  allReviewedSourcesListed: true,
  scopeAndCutoffExplicit: true,
  vaultProgramMarketCoverageGapsExplicit: true,
  unresolvedReportsPreserved: true,
  structuralMechanismsDocumented: true,
  historicalSearchLimitationsExplicit: true,
  noCleanHistoryClaimMade: true,
  verifiedDisqualifyingIncident: false,
};

export function getSteakhouseIncidentCompleteness() {
  return evaluateIncidentEvidenceCompleteness(STEAKHOUSE_INCIDENT_COMPLETENESS_INPUTS);
}

export const INCIDENT_COMPLETENESS_CONFERS = {
  favourableScore: false,
  anyScore: false,
  cleanHistory: false,
  riskApproval: false,
  productApproval: false,
  note: "Completeness means a human CAN score incident_history. It does not score it, does not imply a clean record, and approves nothing.",
} as const;

/* ------------------------------------------------------------------ *
 * 6. Rubric mapping
 * ------------------------------------------------------------------ */

export interface IncidentRubricMapping {
  evidence: string;
  dimensions: RiskRubricV1DimensionId[];
  rationale: string;
  isRubricDefinedBlocker: boolean;
}

/**
 * Routed to the dimensions that actually own each fact. Note that market-layer authorities go to
 * operational/composability dimensions and NOT to manager_discretion or upgrade_admin_authority —
 * those cover KVault's own authorities. The allocation admin stays exactly where 16H-L.1 put it.
 */
export const INCIDENT_RUBRIC_MAPPINGS: IncidentRubricMapping[] = [
  {
    evidence: "Incident records, official limited-scope $0-bad-debt statements, marketing claims, unresolved third-party leads, and the socialize_loss history search.",
    dimensions: ["incident_history"],
    rationale: "Disclosures and incident search results are what this dimension is for. Zero confirmed incidents; official record covers 10.95% of allocation; one unresolved lead retained.",
    isRubricDefinedBlocker: false,
  },
  {
    evidence: "emergency_council custody (one Squads 2-of-7, no time lock, over all four markets) and its restrictive-only power set; lending_market_owner custody (4-of-10, 12h) holding socialize_loss.",
    dimensions: ["operational_dependency_risk", "composability_dependency"],
    rationale: "These are external authorities in a DIFFERENT protocol that the vault depends on. Operational because their liveness and key custody bear on the vault's functioning; composability because the dependency arises from the vault composing with KLend markets. They are NOT manager discretion — Kamino's vault manager does not control them.",
    isRubricDefinedBlocker: false,
  },
  {
    evidence: "Possible depositor loss through socialize_loss on an underlying market, and possible liquidity impedance through council restrictive actions.",
    dimensions: ["strategy_complexity", "liquidity_withdrawal", "composability_dependency"],
    rationale: "strategy_complexity: 'holds USDC' understates a managed credit position whose value can be written down by a third-party authority. liquidity_withdrawal: council brakes could impede exit, which compounds 16H-L.1's finding that the vault keeps ~0 buffer and depends entirely on reserve liquidity. composability_dependency: the loss path exists only because of the KLend composition.",
    isRubricDefinedBlocker: false,
  },
  {
    evidence: "Allocation-admin custody (raw on-curve keypair, no multisig, no time lock).",
    dimensions: ["manager_discretion", "operational_dependency_risk"],
    rationale: "UNCHANGED from 16H-L.1 and deliberately kept separate. The allocation admin is a KVault authority; the market authorities are KLend's. Different layers, different mappings, no merging.",
    isRubricDefinedBlocker: false,
  },
];

/**
 * klendDirectUsdcRiskEvidencePackage — Step 16H-P.1. The canonical, versioned evidence package for the
 * exact Kamino direct USDC lending product, assembled as INPUT to a later automated 12-dimension
 * assessment.
 *
 * THIS PACKAGE CONTAINS NO SCORES. The preparer is not the scorer (risk_separation_of_duties_v2). It
 * carries no score, no suggested score, no anchor recommendation, no aggregate, no threshold distance,
 * and no language shaped to move a scorer toward passing.
 *
 * READINESS RESULT: ready_for_automated_assessment (as of 16H-P.1a).
 *
 * HISTORY, PRESERVED. At 16H-P.1 this package was NOT ready. `upgrade_admin_authority` (weight 15) was
 * insufficient: the KLEND PROGRAM's upgrade authority is a DIFFERENT program from KVault and had never
 * been verified anywhere in this repository — all prior authority work (16H-L.1) covered KVault. 16H-P.1
 * established only that the authority is an off-curve PDA, which proves "not a keypair" and nothing more.
 * WHICH multisig, at what threshold, under what timelock, were unknown — precisely the facts the
 * dimension scores. The package was marked not ready and the assessment was NOT created. The gate worked.
 *
 * 16H-P.1a resolved it against chain, and readiness now flips on EVIDENCE, not on impatience:
 *
 *   layer                   vault PDA    multisig     threshold  timelock
 *   ──────────────────────────────────────────────────────────────────────
 *   KLend program upgrade   GzFgdRJ…     6hhBGCt…     5-of-10    24h
 *   SOL/BTC market owner    24LjDBuk…    7idEEVR…     4-of-10    12h
 *   emergency council       4VtJ1yC…     9thcmUR…     2-of-7     none
 *
 * config_authority is default (autonomous) on all three, so no threshold bypass exists. A fourth layer,
 * proposer_authority 6pwkb7u…, remains UNRESOLVED and is carried as a limitation.
 *
 * See klendDirectUsdcAuthorityEvidence.ts (authority_evidence).
 */
import { computeRubricV1Hash, PROTOCOL_RISK_RUBRIC_V1_ID, PROTOCOL_RISK_RUBRIC_V1_SEMVER } from "./riskGovernance";

export const PACKAGE_ID = "klend_direct_usdc_risk_evidence_package_v1" as const;
export const PACKAGE_VERSION = "1.0.0" as const;

/* ------------------------------------------------------------------ *
 * 1. Immutable binding
 * ------------------------------------------------------------------ */

export const PACKAGE_BINDING = {
  candidateId: "kamino_usdc_lending",
  productType: "direct_lending",
  protocol: "Kamino Lend / KLend",
  marketName: "SOL/BTC Market",
  marketHistoricalAlias: "Main Market",
  marketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
  reserveAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  liquidityMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  cTokenMint: "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D",
  klendProgram: "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
  cluster: "mainnet-beta",
  assetDecimals: 6,
  evidenceCutoff: "2026-07-17T11:15:00.000Z",
  packageVersion: PACKAGE_VERSION,
  preparerId: "claude_automated_evidence_preparer",
  preparationRole: "evidence_preparer" as const,
  preparerIsNotScorer: true,
  preparerIsNotHumanReviewer: true,
  rubricId: PROTOCOL_RISK_RUBRIC_V1_ID,
  rubricVersion: PROTOCOL_RISK_RUBRIC_V1_SEMVER,
  rubricHash: computeRubricV1Hash(),
  confidencePolicyId: "risk_review_confidence_v2",
  separationOfDutiesId: "risk_separation_of_duties_v2",
  authorizedAssessor: "ws_automated_risk_assessor",
} as const;

export type PackageIdentityFailure =
  | "candidate_mismatch" | "market_mismatch" | "reserve_mismatch" | "liquidity_mint_mismatch"
  | "ctoken_mint_mismatch" | "program_mismatch" | "cluster_mismatch";

export function validatePackageBinding(i: {
  candidateId: string; marketAddress: string; reserveAddress: string;
  liquidityMint: string; cTokenMint: string; klendProgram: string; cluster: string;
}): { ok: boolean; failure?: PackageIdentityFailure } {
  const b = PACKAGE_BINDING;
  if (i.candidateId !== b.candidateId) return { ok: false, failure: "candidate_mismatch" };
  if (i.marketAddress !== b.marketAddress) return { ok: false, failure: "market_mismatch" };
  if (i.reserveAddress !== b.reserveAddress) return { ok: false, failure: "reserve_mismatch" };
  if (i.liquidityMint !== b.liquidityMint) return { ok: false, failure: "liquidity_mint_mismatch" };
  if (i.cTokenMint !== b.cTokenMint) return { ok: false, failure: "ctoken_mint_mismatch" };
  if (i.klendProgram !== b.klendProgram) return { ok: false, failure: "program_mismatch" };
  if (i.cluster !== b.cluster) return { ok: false, failure: "cluster_mismatch" };
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * 2. Evidence provenance layers
 * ------------------------------------------------------------------ */

export const INCLUDED_EVIDENCE_MODULES = [
  { id: "identity_9773ac14", module: "klendReserveIdentity.ts", layer: "immutable_methodology" },
  { id: "apy_evidence_d468fce5", module: "klendReserveApyDerivation.ts", layer: "immutable_methodology" },
  { id: "reward_evidence_cace4fe4", module: "klendReserveRewardResolution.ts", layer: "immutable_methodology" },
  { id: "parity_evidence_dd25a9a1", module: "klendReserveApyParityAmendment.ts", layer: "immutable_historical" },
  { id: "solana_slot_duration_methodology_v1", module: "solanaSlotDurationEstimator.ts", layer: "immutable_methodology" },
  { id: "measured_apy_evidence_ebc7627d", module: "klendReserveMeasuredApyCorrection.ts", layer: "immutable_methodology" },
  { id: "capacity_evidence_e54e310a", module: "klendReserveCapacity.ts", layer: "immutable_methodology" },
  { id: "position_evidence_fb2bb70b", module: "klendDirectLendingPosition.ts", layer: "immutable_methodology" },
  { id: "availability_evidence_078133b7", module: "klendReserveAvailability.ts", layer: "immutable_methodology" },
  { id: "constraints_evidence_7301883a", module: "klendReserveConstraints.ts", layer: "immutable_methodology" },
  { id: "incident_alias_evidence_3023570a", module: "incidentMarketAliasAmendment.ts", layer: "immutable_historical" },
  { id: "blocker_order_evidence_fae4d95f", module: "stableYieldBlockerOrderAmendment.ts", layer: "immutable_methodology" },
  { id: "authority_evidence", module: "klendDirectUsdcAuthorityEvidence.ts", layer: "immutable_methodology" },
] as const;

/**
 * Current-state values are NOT identity. Every one moves with the chain; recording them as immutable
 * product truth is the error 16H-N.3b and 16H-N.4 were built to prevent.
 */
export const CURRENT_STATE_NOT_IDENTITY = {
  currentStateFields: ["APY", "capacity remaining", "utilization", "freely available liquidity", "exchange rate", "minimum deposit result", "rolling withdrawal headroom"],
  rule: "Each is a dated observation requiring re-read. None is an immutable identity claim, and none may be cached as product truth.",
  apyIsEstimated: "rateKind estimated_variable_apy, precision estimated — annualized yield depends on FUTURE slot duration and can never be exact.",
  liquidityIsNotGuaranteed: "Current freely available liquidity is a snapshot. It is NOT a guarantee of future liquidity, and must never be described as one.",
} as const;

export const DIAGNOSTIC_ONLY_SOURCES = {
  kaminoApi: "DIAGNOSTIC ONLY. Exposes no timestamp or slot and was demonstrated to be cached (byte-identical across 20 minutes while on-chain state moved). Never a production or scoring authority.",
  kaminoUi: "DIAGNOSTIC ONLY, except the market rename statement, which is an official first-party assertion corroborated by on-chain name and the API isPrimary designation.",
} as const;

/* ------------------------------------------------------------------ *
 * 3. The 12-dimension evidence map
 * ------------------------------------------------------------------ */

export type Applicability = "directly_applicable" | "reserve_specific_evidence_required" | "ambiguous" | "not_applicable";
export type EvidenceReadiness = "complete" | "partial" | "weak" | "insufficient";

export interface DimensionEvidence {
  dimensionId: string;
  weight: number;
  applicability: Applicability;
  readiness: EvidenceReadiness;
  scoreable: boolean;
  evidenceRefs: string[];
  verifiedFacts: string[];
  limitations: string[];
  unresolvedQuestions: string[];
  blockerRelevance: string;
  confidenceCeiling: "high" | "medium" | "low";
  confidenceCeilingJustification: string;
  invalidationTriggers: string[];
  scorerInstructions: string;
  prohibitedInferences: string[];
}

export const DIMENSION_EVIDENCE: DimensionEvidence[] = [
  {
    dimensionId: "audit_security",
    weight: 15,
    applicability: "directly_applicable",
    readiness: "partial",
    scoreable: true,
    evidenceRefs: ["steakhouseSecurityEvidenceAmendment.ts", "steakhouseAuditCoverage.ts", "identity_9773ac14"],
    verifiedFacts: [
      "KLend has materially broader public security coverage than KVault: traditional audits (Sec3, Offside, OtterSec), formal verification and fuzzing inventories all exist.",
      "The KLend program is a verified build (solana-verify / OtterSec verify.osec.io).",
      "Audit reports reference explicit commits: Sec3 full hash 8273031ea75e3972cce5314cefe3e88f962927c5; Offside branch master + 4 hashes; OtterSec references 8a4b1fe.",
    ],
    limitations: [
      "AUDIT-TO-DEPLOYED-BINARY LINKAGE IS INCOMPLETE. `git cat-file` proved NONE of the referenced commits exist in the public repository — they are private-repo commits — so no report can be mapped to the currently deployed binary.",
      "Report EXISTENCE, report SCOPE, VERSION applicability and CURRENT BINARY coverage are four distinct things. Only the first two are established.",
      "KVault audits are NOT evidence for this product except where shared KLend code is explicitly covered.",
    ],
    unresolvedQuestions: ["Which audited commit, if any, corresponds to the deployed KLend binary?", "What deployed surface is uncovered by any report?"],
    blockerRelevance: "The rubric blocker 'no audit evidence' does NOT apply — reports exist and are sourced. The gap is version linkage, not existence.",
    confidenceCeiling: "medium",
    confidenceCeilingJustification: "Reports and their scope are verified from primary sources; only the binary linkage is missing. That caps confidence below high but well above low.",
    invalidationTriggers: ["KLend program upgrade", "a new audit or a public commit mapping is published"],
    scorerInstructions: "Score the evidence as it stands: reports exist with verified scope, but no report is mapped to the deployed binary. Do not treat report existence as binary coverage.",
    prohibitedInferences: ["that the deployed binary is fully covered", "that KVault audit coverage transfers", "that a verified build implies an audited build"],
  },
  {
    dimensionId: "maturity",
    weight: 8,
    applicability: "reserve_specific_evidence_required",
    readiness: "partial",
    scoreable: true,
    evidenceRefs: ["incident_alias_evidence_3023570a", "identity_9773ac14"],
    verifiedFacts: [
      "The exact market is Kamino's PRIMARY market (API isPrimary: true, 'Primary market on mainnet') and was previously named 'Main Market'.",
      "Official material claims continuous operation with $0 bad debt since November 2023 and across 5 named stress events (Feb 2025 → Feb 2026).",
      "The deployed KLend binary dates from 2026-05-28T12:47:42Z (slot 422723185), ~50 days old at the evidence cutoff. CORRECTED AT 16H-P.2a: this previously read 2026-07-14, which is the KVAULT binary date carried over in error — a different program.",
    ],
    limitations: [
      "Protocol age, KLend product age, exact market age, exact RESERVE age and current binary age are FIVE distinct quantities. Only market identity and binary date are established.",
      "The exact reserve's creation date and configuration history were NOT verified.",
    ],
    unresolvedQuestions: ["When was this exact reserve created?", "Has its configuration been stable, and for how long?", "What is the code-continuity record across binaries?"],
    blockerRelevance: "none",
    confidenceCeiling: "low",
    confidenceCeilingJustification: "Reserve-level age and configuration continuity — the reserve-specific facts this dimension turns on — are unverified.",
    invalidationTriggers: ["KLend program upgrade", "reserve configuration change"],
    scorerInstructions: "Do not reduce maturity to the age of the latest binary, and do not treat protocol age as proof that the exact current configuration is mature.",
    prohibitedInferences: ["that protocol age implies reserve maturity", "that primary-market status implies configuration stability"],
  },
  {
    dimensionId: "upgrade_admin_authority",
    weight: 15,
    applicability: "directly_applicable",
    readiness: "partial",
    scoreable: true,
    evidenceRefs: ["authority_evidence (klendDirectUsdcAuthorityEvidence.ts)", "KLEND_PROGRAM_UPGRADE_AUTHORITY (this module)"],
    verifiedFacts: [
      "RESOLVED AT 16H-P.1a. KLend loader chain reverified: Program → ProgramData 9uSbGW1y… (pointer matches independent seed derivation), deployed code slot 422723185, upgradeable, authority non-null.",
      "PROGRAM UPGRADE AUTHORITY: GzFgdRJ… = Squads v4 vault PDA of multisig 6hhBGCtmg7tPWUSgp3LG6X2rsmYWAc4tNsA6G4CnfQbM at vault index 0 (derivation re-verified, unique match). THRESHOLD 5-of-10, TIME_LOCK 86,400s (24h), 10 members each holding Initiate+Vote+Execute.",
      "MARKET OWNER: 24LjDBuk… = Squads v4 vault PDA of multisig 7idEEVRidWrahZJhxXMqniDbV6ESj7ZjyLrigcMcEt6H at index 0. THRESHOLD 4-of-10, TIME_LOCK 43,200s (12h). The previously REPORTED 4-of-10 / 12h claim is now VERIFIED.",
      "EMERGENCY COUNCIL: 4VtJ1yC… = Squads v4 vault PDA of multisig 9thcmURbz3xgvv362Fy2uGVGoxMnD3ADRuwRp13nuXE5 at index 0. THRESHOLD 2-of-7, TIME_LOCK 0s. The previously REPORTED 2-of-7 / no-timelock claim is now VERIFIED.",
      "NO THRESHOLD BYPASS EXISTS: config_authority = Pubkey::default on all three multisigs, i.e. autonomous — threshold, timelock and membership can only change via a proposal meeting the multisig's own threshold and timelock.",
      "THREE DISTINCT MULTISIGS. The upgrade multisig cannot administer the market; the market owner cannot upgrade the program; the emergency council can do neither. Upgrade and market-owner multisigs share 9 of 10 member keys but are different multisigs with different thresholds — overlap is not identity.",
      "socialize_loss requires lending_market_owner (has_one), i.e. supplier principal can be written down at 4-of-10 after a 12h delay. The emergency council cannot invoke it.",
      "No single member can APPROVE alone at any layer (thresholds 5/4/2). Every member can EXECUTE an already-approved, timelock-elapsed proposal.",
    ],
    limitations: [
      "AUTHORITY TENURE IS UNRESOLVED for all three layers. Squads transaction_index values (92 / 181 / 6) show none is freshly created, but an index is not a tenure proof.",
      "A FOURTH LAYER IS UNRESOLVED: LendingMarket.proposer_authority = 6pwkb7uMsvqgmwPBKc3o4hnte6JnHpisSUrsdyvGcEUv appears in no prior evidence. It is off-curve (a PDA) but does NOT derive as a Squads v4 vault PDA at indices 0-3 across all 154,461 Squads v4 multisig states. Its type, controller and powers are unknown.",
      "Member key → real-world identity was deliberately NOT inferred.",
      "The emergency council's 2-of-7 with ZERO timelock can freeze all exits immediately; only a 4-of-10 + 12h market-owner action can reverse it.",
    ],
    unresolvedQuestions: [
      "What is proposer_authority 6pwkb7u…, what controls it, and what can it do under deployed KLend?",
      "Since when has each authority held its role, and did any threshold/timelock change during the incident-evidence period?",
    ],
    blockerRelevance: "The rubric blocker 'admin/upgradeability unverified' NO LONGER APPLIES to the three principal layers. The unresolved proposer_authority is carried as a limitation, not a blocker, because it is not a known control path over supplier funds — it is an unknown one.",
    confidenceCeiling: "medium",
    confidenceCeilingJustification: "Thresholds, timelocks, membership and bypass-absence are all verified on-chain for the three layers that matter. Confidence is capped below high by unresolved tenure and by a fourth authority layer of unknown powers.",
    invalidationTriggers: ["set_upgrade_authority on KLend", "update_lending_market_owner", "emergency-council reassignment", "any Squads config change on 6hhBGCt…, 7idEEVR… or 9thcmUR…", "a non-default config_authority appearing"],
    scorerInstructions: "Score the resolved structure as it stands. Resolving an authority describes it; it does not judge it. Weigh: socialize_loss at 4-of-10 + 12h over supplier principal; an emergency council at 2-of-7 with zero timelock able to freeze exits; a 5-of-10 + 24h program upgrade authority; and one authority layer of unknown powers.",
    prohibitedInferences: [
      "that KVault's 5-of-10 + 24h applies to KLend — the numbers coincide but this was verified INDEPENDENTLY; inheriting it would have been right by luck",
      "that 'restrictive-only' means the emergency council is harmless — it bounds the direction of harm, not its magnitude",
      "that a multisig being found means the structure is safe",
      "that member overlap between multisigs makes them the same authority",
      "that off-curve alone establishes a Squads multisig",
    ],
  },
  {
    dimensionId: "manager_discretion",
    weight: 12,
    applicability: "directly_applicable",
    readiness: "partial",
    scoreable: true,
    evidenceRefs: ["capacity_evidence_e54e310a", "constraints_evidence_7301883a", "availability_evidence_078133b7", "authority_evidence (klendDirectUsdcAuthorityEvidence.ts)"],
    verifiedFacts: [
      "NO KVault allocation manager exists for this product, and no dynamic multi-reserve reallocation occurs. The depositor remains in ONE exact reserve.",
      "The market owner CAN alter material reserve parameters. Verified mutable fields include: deposit_limit and borrow_limit (config update mode, lending_operations.rs L2606), borrow_rate_curve, protocol_take_rate_pct, host_fixed_interest_rate_bps, block_ctoken_usage (disables deposits without touching the cap), emergency_mode, status, deposit_withdrawal_cap and oracle configuration.",
      "The emergency council's powers are restrictive-only and it CANNOT invoke socialize_loss.",
      "16H-P.1a: the market owner is Squads multisig 7idEEVR… at 4-of-10 / 12h timelock, autonomous config (no bypass). Every reserve-config mutation runs through it.",
    ],
    limitations: [
      "RESOLVED AT 16H-P.1a: every mutation above requires lending_market_owner = Squads multisig 7idEEVR… at 4-of-10 with a 12h timelock, verified on-chain. The constraint on discretion is now a fact, not an assumption.",
      "socialize_loss — which writes down supplier principal directly — sits behind that SAME 4-of-10 + 12h. It is a structural loss path under discretionary control, not a hypothetical.",
      "The emergency council (2-of-7, ZERO timelock) can independently exercise the restrictive subset — emergency_mode, block_ctoken_usage, tightening caps — with no delay, and only a 4-of-10 + 12h market-owner action can reverse it.",
      "proposer_authority 6pwkb7u… is unresolved; whether it holds any discretionary power is unknown.",
    ],
    unresolvedQuestions: ["What powers, if any, does proposer_authority hold?", "Since when has the current market owner held the role?"],
    blockerRelevance: "none — the threshold/timelock coupling to upgrade_admin_authority is now resolved.",
    confidenceCeiling: "medium",
    confidenceCeilingJustification: "The mutable surface is enumerated from deployed code AND the authority constraining it is verified on-chain. Capped below high by the unresolved proposer_authority.",
    invalidationTriggers: ["reserve config change", "authority change"],
    scorerInstructions: "manager_discretion IS applicable to direct lending (product-owner clarification). It evaluates discretionary control over material economic and risk parameters AFTER deposit. Do not mark it not applicable.",
    prohibitedInferences: [
      "that the absence of a KVault allocation manager alone implies low discretion — the market owner retains broad reserve-config power",
      "that one-reserve exposure means no discretionary risk",
    ],
  },
  {
    dimensionId: "strategy_complexity",
    weight: 10,
    applicability: "directly_applicable",
    readiness: "complete",
    scoreable: true,
    evidenceRefs: ["identity_9773ac14", "position_evidence_fb2bb70b", "availability_evidence_078133b7"],
    verifiedFacts: [
      "Direct single-reserve supply: the user supplies USDC to one reserve and receives cTokens. No allocation layer, no strategy rotation, no leverage on the supply side.",
      "Value accrues solely via the collateral exchange rate (1 cToken ≈ 1.1918 USDC at observation), driven by borrower interest.",
      "Borrower collateral exposure exists: suppliers are exposed to the market's borrowers and its liquidation mechanics.",
      "A socialized-loss path EXISTS (socialize_loss, lending_market_owner authority) — supplier principal is not structurally protected.",
      "Rate model: borrow_rate_curve at current utilization, scaled by slotAdjustmentFactor; take rate 10% of borrower interest.",
    ],
    limitations: ["Liquidation mechanics were reviewed at the market layer, not re-derived per collateral asset."],
    unresolvedQuestions: [],
    blockerRelevance: "none",
    confidenceCeiling: "high",
    confidenceCeilingJustification: "The mechanism is fully derived from deployed code across 16H-N.2 through 16H-N.7.",
    invalidationTriggers: ["KLend upgrade altering the supply or rate model"],
    scorerInstructions: "Score the actual mechanism. Simplicity relative to a vault is a fact; it is not the same as absence of risk.",
    prohibitedInferences: ["that single-reserve exposure means low risk", "that the absence of a vault layer removes borrower or liquidation exposure"],
  },
  {
    dimensionId: "composability_dependency",
    weight: 8,
    applicability: "directly_applicable",
    readiness: "complete",
    scoreable: true,
    evidenceRefs: ["identity_9773ac14", "availability_evidence_078133b7", "constraints_evidence_7301883a"],
    verifiedFacts: [
      "Direct KLend program dependency (KLend2g3…) — no KVault-to-KLend CPI layer, which is one fewer program than Steakhouse.",
      "Oracle dependency: Scope oracle chain for the reserve's price configuration.",
      "SPL Token dependency: both liquidity and collateral mints use the classic SPL Token program (TokenkegQ…); no Token-2022 extensions.",
      "Squads authority dependency: program upgrade authority (off-curve PDA) and market owner.",
      "No external pricing provider is required by the protocol; WealthSmith's USD recognition separately depends on an approved exact-mint price.",
    ],
    limitations: ["The Scope provider chain's own upstream dependencies were reviewed at configuration level, not traced to each ultimate source."],
    unresolvedQuestions: [],
    blockerRelevance: "none",
    confidenceCeiling: "medium",
    confidenceCeilingJustification: "The dependency set is enumerated from deployed code; upstream oracle-provider depth is not fully traced.",
    invalidationTriggers: ["oracle configuration change", "token program change", "KLend upgrade"],
    scorerInstructions: "Enumerate real dependencies. Fewer programs than a vault is a fact, not an absence of composability risk.",
    prohibitedInferences: ["that removing the KVault layer means no composability risk", "that direct lending is dependency-free"],
  },
  {
    dimensionId: "oracle_risk",
    weight: 8,
    applicability: "reserve_specific_evidence_required",
    readiness: "partial",
    scoreable: true,
    evidenceRefs: ["steakhouseIncidentEvidence.RESERVE_ORACLE_CONFIG", "kamino.com/docs/security"],
    verifiedFacts: [
      "The exact USDC reserve's oracle configuration is verified on-chain: maxAgePriceSeconds 180/300, maxAgeTwapSeconds 240/300, maxTwapDivergenceBps 300, price band 0.98–1.01.",
      "Provider chain: Scope, documented at kamino.com/docs/security.",
      "Staleness and deviation controls exist and are enforced by the program.",
    ],
    limitations: [
      "THE BORROWER-COLLATERAL-SIDE ORACLE IS NOT ASSESSED. A USDC supplier's real oracle exposure runs through the COLLATERAL assets backing the borrows in this market — if a collateral oracle fails, liquidation fails and the loss lands on suppliers. The USDC reserve's own price controls do not speak to that at all.",
      "Oracle-admin mutability: oracle configuration is a market-owner-mutable field, and that authority's threshold/timelock is unverified.",
    ],
    unresolvedQuestions: ["What are the oracle configurations of every collateral reserve in this market?", "What is the market-wide collateral composition and its oracle redundancy?"],
    blockerRelevance: "none for the USDC reserve; the collateral side remains an explicit gap.",
    confidenceCeiling: "low",
    confidenceCeilingJustification: "Exact USDC-side controls are verified, but the exposure that actually matters to a supplier — the collateral side — is unexamined.",
    invalidationTriggers: ["oracle configuration change on this or any collateral reserve", "Scope provider change"],
    scorerInstructions: "Do NOT let the exact USDC price controls substitute for borrower-collateral oracle review. Score the supplier's real oracle exposure, which includes the collateral side.",
    prohibitedInferences: ["that verified USDC oracle controls mean low oracle risk for a USDC supplier", "that a tight price band on a stablecoin covers collateral volatility"],
  },
  {
    dimensionId: "liquidity_withdrawal",
    weight: 12,
    applicability: "directly_applicable",
    readiness: "complete",
    scoreable: true,
    evidenceRefs: ["availability_evidence_078133b7", "constraints_evidence_7301883a", "position_evidence_fb2bb70b"],
    verifiedFacts: [
      "The exact withdrawal limit is freely_available_liquidity_amount() = total_available_amount − queued_liquidity_amount() (reserve.rs L219-224, L901-913). NOT total_supply (which includes borrowed funds not present to pay out).",
      "Partial redemption is a first-class path; the maximal redeemable amount is computed by an exact closed-form integer inverse and proven maximal by the mirrored predicate.",
      "Emergency mode blocks BOTH deposit and redemption — it does NOT preserve withdrawals.",
      "The regular redeem path applies NO reserve-status gate, NO block_ctoken_usage gate and NO permissioning gate.",
      "No cooldown, no lockup, no regular-path queue, no withdrawal fee or penalty.",
      "A rolling withdrawal cap exists (90,000,000 USDC / 86,400s), distinct from liquidity; at observation liquidity binds first.",
      "Stale reserve state fails closed (ReserveStale).",
    ],
    limitations: ["All liquidity figures are slot-bound snapshots.", "RedeemCollateralOptions::REGULAR field values were not located; the conservative freely-available branch is used."],
    unresolvedQuestions: [],
    blockerRelevance: "none",
    confidenceCeiling: "high",
    confidenceCeilingJustification: "Derived end-to-end from the deployed redemption path and verified live.",
    invalidationTriggers: ["utilization change", "queue becomes non-zero", "emergency mode", "KLend upgrade"],
    scorerInstructions: "Score structural exit mechanics AND the fact that exit depends on borrower repayment. Current liquidity is a snapshot.",
    prohibitedInferences: [
      "that current liquidity is guaranteed future liquidity",
      "that 'no cooldown' means always withdrawable — exits remain subject to emergency mode, fresh state, freely available liquidity and the rolling cap",
      "that users can always leave",
    ],
  },
  {
    dimensionId: "asset_stablecoin_risk",
    weight: 5,
    applicability: "directly_applicable",
    readiness: "complete",
    scoreable: true,
    evidenceRefs: ["identity_9773ac14", "position_evidence_fb2bb70b"],
    verifiedFacts: [
      "The liquidity mint is canonical Circle USDC (EPjFWdd5…Dt1v), verified — not a bridged or wrapped variant.",
      "Token program: classic SPL Token (TokenkegQ…); no Token-2022 extensions, no transfer hook, no transfer fee.",
      "USDC is a centralized, issuer-redeemable stablecoin: Circle retains freeze/blacklist capability at the mint level.",
      "USD recognition requires an approved fresh exact-mint price — USDC is NOT assumed to equal $1 (the API's own totalSupplyUsd/totalSupply implies ≈$0.99985).",
    ],
    limitations: ["Depeg history was not re-derived in this package."],
    unresolvedQuestions: [],
    blockerRelevance: "none",
    confidenceCeiling: "high",
    confidenceCeilingJustification: "Mint identity, token program and issuer model are all verified from primary sources.",
    invalidationTriggers: ["mint authority or freeze authority change"],
    scorerInstructions: "Score issuer/freeze and depeg exposure. Canonical identity is verified; it is not an absence of issuer risk.",
    prohibitedInferences: ["that canonical USDC means no stablecoin risk", "that USDC equals $1"],
  },
  {
    dimensionId: "withdrawal_fee_transparency",
    weight: 3,
    applicability: "directly_applicable",
    readiness: "complete",
    scoreable: true,
    evidenceRefs: ["constraints_evidence_7301883a"],
    verifiedFacts: [
      "No deposit fee: originationFeeSf is a BORROW origination fee and never touches a supplier's deposit.",
      "No withdrawal fee and no withdrawal penalty: redeem_reserve_collateral returns the floored liquidity_amount unmodified.",
      "No performance fee and no management fee — those are KVault concepts, absent from reserve config. Steakhouse's 5% performanceFeeBps does NOT transfer here.",
      "The protocol take rate (10%) is an INTEREST-REVENUE SHARE of borrower interest, already incorporated into the supply APY. It is never deducted from a deposit or withdrawal.",
      "Sub-unit dust: the deposit ceil-back rounds in the protocol's favour, so a depositor may pay up to one base unit more than their minted cTokens are worth.",
    ],
    limitations: ["Fee fields are market-owner-mutable; that authority's threshold/timelock is unverified."],
    unresolvedQuestions: [],
    blockerRelevance: "none",
    confidenceCeiling: "high",
    confidenceCeilingJustification: "Every fee item was classified from the deployed code path.",
    invalidationTriggers: ["fee config change", "take-rate change"],
    scorerInstructions: "Score fee transparency and economics. Do NOT label the protocol take rate a user withdrawal fee.",
    prohibitedInferences: ["that the take rate is a withdrawal fee", "that no fees means no economic extraction"],
  },
  {
    dimensionId: "operational_dependency_risk",
    weight: 2,
    applicability: "directly_applicable",
    readiness: "complete",
    scoreable: true,
    evidenceRefs: ["solana_slot_duration_methodology_v1", "measured_apy_evidence_ebc7627d", "availability_evidence_078133b7"],
    verifiedFacts: [
      "Protocol-side dependencies: Solana RPC availability, Solana block times (for the slot-duration estimator), Scope oracle providers, the market-owner multisig and the emergency council.",
      "WealthSmith-side: the official Kamino SDK, a Node-only RPC env var (never VITE_-prefixed, so no secret reaches the browser), and an approved exact-mint USDC price for USD recognition.",
      "All adapters fail closed: stale slot duration, stale reserve state, excessive source skew, missing block times and unresolved identity each block rather than degrade.",
      "The Kamino API is diagnostic-only and demonstrably cached; it is never a production authority.",
    ],
    limitations: ["The slot-duration estimator requires block-time availability; an RPC that cannot serve historical block times fails the measurement closed."],
    unresolvedQuestions: [],
    blockerRelevance: "none",
    confidenceCeiling: "high",
    confidenceCeilingJustification: "Every dependency is enumerated and its failure mode is implemented and tested.",
    invalidationTriggers: ["SDK upgrade", "oracle provider change", "RPC provider change"],
    scorerInstructions: "Score PROTOCOL operational dependency. Do not score WealthSmith's own engineering inconvenience as protocol risk unless the rubric supports it.",
    prohibitedInferences: ["that WealthSmith integration effort is protocol risk", "that fail-closed behaviour eliminates dependency risk"],
  },
  {
    dimensionId: "incident_history",
    weight: 2,
    applicability: "reserve_specific_evidence_required",
    readiness: "partial",
    scoreable: true,
    evidenceRefs: ["incident_alias_evidence_3023570a", "steakhouseIncidentEvidence.ts"],
    verifiedFacts: [
      "The exact market IS named in official stress-event material, as 'Main' — Main Market and SOL/BTC Market are the same account 7u3He… (on-chain name is a mutable field on a stable address; API marks that address isPrimary: true; the UI states the rename verbatim). Confidence: high, not absolute.",
      "Official material claims $0 bad debt since November 2023, across 5 named stress events (Feb 2025 → Feb 2026), with continued operation and no service degradation.",
      "This evidence speaks to the LENDING-MARKET layer — which is exactly this product's layer.",
      "socialize_loss requires lending_market_owner (has_one), NOT the emergency council.",
    ],
    limitations: [
      "Steakhouse's fatal gaps 1 (wrong subject — a vault) and 2 (kvault program uncovered) do NOT apply here: this IS a lending-market reserve on the covered program. That is a material difference and must not be flattened.",
      "Gap 4 DOES apply, RESTATED AT 16H-S.0 with a precision it lacked: the last documented event is 2026-02-05/06 and monthly Risk Insights run through June 2026 (published 2026-07-03; corrected from 'April 2026 latest', a search failure), while the deployed binary is from 2026-05-28 (CORRECTED AT 16H-P.2a from 2026-07-14, the KVault date). The June report POSTDATES the binary but is market-risk monitoring, not code review — so the gap that stands is that no CODE review postdates the binary, and the binary still postdates every documented event. No published review covers the code holding funds.",
      "Exact reserve existence and USDC exposure during each event window are UNVERIFIED.",
      "The market-owner period is unestablished, so statements cannot be attributed to a known administrative regime.",
      "No socialize_loss history search bound to this exact reserve was completed.",
    ],
    unresolvedQuestions: ["Did this exact reserve exist and hold USDC supply during each named event?", "Has socialize_loss ever been invoked on this reserve?"],
    blockerRelevance: "The rubric blocker 'no sourced incident review exists' does NOT apply at the market layer — a sourced review exists and covers this layer. Binary currency and event-window binding remain open.",
    confidenceCeiling: "low",
    confidenceCeilingJustification: "Event-window binding, binary currency and socialize-loss scope are all unresolved.",
    invalidationTriggers: ["a new official incident report", "a review postdating the deployed binary", "market rename or isPrimary reassignment"],
    scorerInstructions: "Score what the evidence supports at THIS layer. Do not inherit Steakhouse's KVault-specific gaps 1 and 2, and do not treat a search result as a clean record.",
    prohibitedInferences: [
      "that zero bad debt means zero incidents or zero exploits",
      "that 'no confirmed incidents found' proves no incident occurred — it is a SEARCH RESULT, not a clean record",
      "that market-layer coverage covers the deployed binary",
    ],
  },
];

/** The KLend program upgrade authority — first verified here. The blocking gap. */
export const KLEND_PROGRAM_UPGRADE_AUTHORITY = {
  program: "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
  programDataAccount: "9uSbGW1y9H5Av6H5TKxQ1wnFApSq2t3oEpfF2YfjDQGA",
  loader: "BPFLoaderUpgradeab1e11111111111111111111111",
  isUpgradeable: true,
  upgradeAuthority: "GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW",
  authorityAccountOwner: "11111111111111111111111111111111",
  authorityDataLength: 0,
  authorityIsOnCurve: false,
  authorityClassification: "off_curve_pda_not_keypair" as const,
  verifiedAtSlot: 433470825,
  verifiedAt: "2026-07-17T11:12:00.000Z",
  whyThisMatters:
    "This is a DIFFERENT program from KVault. All prior authority evidence (16H-L.1: 5-of-10 + 24h upgrade authority, 3-of-10 vault admin) describes KVAULT and does NOT transfer to KLend. This authority had never been verified anywhere in the repository before 16H-P.1.",
  whatRemainsUnverified: [
    "which Squads multisig this PDA belongs to",
    "that multisig's threshold, member count and time_lock",
    "whether the market owner 24LjDBuk… is itself a Squads PDA, and its threshold/timelock",
  ],
  resolutionMethod:
    "16H-L.1's method: Squads v4 vault PDA seeds ['multisig', <state acct>, 'vault', <index u8>] under SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf, then decode the multisig state (threshold u16, time_lock u32, members Vec<Member>). isOnCurve is the decisive keypair-vs-PDA test and already returns FALSE here.",
  isNotEvidenceOf: "Off-curve establishes 'not a raw keypair'. It does NOT establish which multisig, nor any threshold or timelock, and must not be read as 'safely governed'.",
} as const;

/* ------------------------------------------------------------------ *
 * 4. Package readiness
 * ------------------------------------------------------------------ */

export type PackageReadiness = "ready_for_automated_assessment" | "not_ready_for_automated_assessment";

export interface ReadinessResult {
  readiness: PackageReadiness;
  completeDimensions: string[];
  partialButScoreableDimensions: string[];
  insufficientDimensions: string[];
  blockingMissingArtifacts: string[];
  readinessMeaning: string;
  readinessIsNot: string[];
}

/** Deterministic: any non-scoreable dimension makes the package not ready. */
export function evaluatePackageReadiness(dims: DimensionEvidence[] = DIMENSION_EVIDENCE): ReadinessResult {
  const complete = dims.filter((d) => d.readiness === "complete" && d.scoreable).map((d) => d.dimensionId);
  const partial = dims.filter((d) => (d.readiness === "partial" || d.readiness === "weak") && d.scoreable).map((d) => d.dimensionId);
  const insufficient = dims.filter((d) => !d.scoreable).map((d) => d.dimensionId);
  return {
    readiness: insufficient.length === 0 ? "ready_for_automated_assessment" : "not_ready_for_automated_assessment",
    completeDimensions: complete,
    partialButScoreableDimensions: partial,
    insufficientDimensions: insufficient,
    blockingMissingArtifacts: insufficient.flatMap((id) => dims.find((d) => d.dimensionId === id)!.unresolvedQuestions),
    readinessMeaning: "Whether the evidence suffices to ATTEMPT scoring without guessing.",
    readinessIsNot: ["risk suitability", "threshold passage", "human review", "risk signoff", "product approval", "recommendation eligibility"],
  };
}

export const PACKAGE_READINESS = evaluatePackageReadiness();

export const READINESS_CONSEQUENCE = {
  automatedAssessmentCreated: false,
  automatedAssessmentCreatedNote: "Readiness means the evidence SUFFICES to attempt scoring. Creating the assessment is a separate, later step (16H-P.2) and was not performed here.",
  priorReadiness: "not_ready_for_automated_assessment",
  priorBlockingDimension: "upgrade_admin_authority",
  resolvedAt: "16H-P.1a",
  reason:
    "upgrade_admin_authority moved insufficient → partial-but-scoreable: the KLend upgrade authority, market owner and emergency council are each resolved to an exact Squads v4 multisig with a verified threshold, timelock and autonomous config. A scorer can now assign an integer from facts rather than guesses.",
  readinessFlippedOnEvidence: true,
  notFlippedBecauseAMultisigWasFound:
    "Finding a multisig is not the bar. The bar was threshold + timelock + bypass-absence + power map, each verified on-chain. Had any remained unknown the dimension would still be insufficient.",
  correctBehaviour: "The readiness gate held at 16H-P.1 and released only once the evidence existed. Marking the package ready earlier would have laundered a guess into a score, and a score into an aggregate.",
} as const;

/* ------------------------------------------------------------------ *
 * 5. Manifest
 * ------------------------------------------------------------------ */

export const PACKAGE_MANIFEST = {
  packageId: PACKAGE_ID,
  packageVersion: PACKAGE_VERSION,
  candidateId: PACKAGE_BINDING.candidateId,
  marketAddress: PACKAGE_BINDING.marketAddress,
  reserveAddress: PACKAGE_BINDING.reserveAddress,
  includedEvidenceIds: INCLUDED_EVIDENCE_MODULES.map((m) => m.id),
  evidenceCutoff: PACKAGE_BINDING.evidenceCutoff,
  preparerId: PACKAGE_BINDING.preparerId,
  preparationRole: PACKAGE_BINDING.preparationRole,
  rubricId: PACKAGE_BINDING.rubricId,
  rubricVersion: PACKAGE_BINDING.rubricVersion,
  rubricHash: PACKAGE_BINDING.rubricHash,
  confidencePolicyId: PACKAGE_BINDING.confidencePolicyId,
  separationOfDutiesId: PACKAGE_BINDING.separationOfDutiesId,
  readiness: PACKAGE_READINESS.readiness,
  unresolvedGaps: PACKAGE_READINESS.blockingMissingArtifacts,
  containsScores: false,
  containsAggregate: false,
  invalidationTriggers: [
    "KLend program upgrade",
    "upgrade authority or market owner changes",
    "reserve or oracle configuration change",
    "rubric hash changes",
    "a new official audit or incident report",
  ],
} as const;

export function computePackageManifestHash(m: typeof PACKAGE_MANIFEST = PACKAGE_MANIFEST): string {
  const material = JSON.stringify({
    id: m.packageId, v: m.packageVersion, c: m.candidateId, r: m.reserveAddress,
    e: m.includedEvidenceIds, cut: m.evidenceCutoff, rh: m.rubricHash, rd: m.readiness,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `risk_package_${h.toString(16).padStart(8, "0")}`;
}

export const PACKAGE_MANIFEST_HASH = computePackageManifestHash();

export const PACKAGE_CONFERS = {
  confers: ["assembled scoring-input evidence", "a deterministic readiness verdict"],
  doesNotConfer: [
    "a risk score", "an aggregate", "human review", "risk signoff", "product approval",
    "selector eligibility", "recommendation eligibility", "Top Pick", "a production card", "execution",
  ],
  scoresAssigned: false,
  aggregateCalculated: false,
  thresholdTargeting: false,
  thresholdTargetingNote: "No dimension carries a score, suggested score, anchor recommendation or distance-to-threshold. The minimum of 7 is not referenced as a target anywhere in this package.",
  humanReviewOccurred: false,
  signoffOccurred: false,
  productApproved: false,
  selectorChanged: false,
  recommendationChanged: false,
  lifecycleChanged: false,
  steakhouseAssessmentChanged: false,
  solStakingChanged: false,
  transactionConstructedOrSimulated: false,
} as const;

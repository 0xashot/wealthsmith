/**
 * steakhouseScoringPacket — Step 16H-M. The human risk-scoring packet for the exact Steakhouse USDC
 * product, assembled for the authorized human scorer.
 *
 * THIS FILE ASSIGNS NOTHING. It contains no score, no suggested score, no score range, no "likely" or
 * "reasonable" value, no pass-oriented guidance, and no wording aimed at the threshold of 7. Every
 * `score`, `rationale` and `confidence` field is `null` and typed so it cannot be anything else.
 *
 * PREPARING THIS PACKET TRANSITIONS NOTHING. The product stays at `evidence_complete`. The next valid
 * transition is `evidence_complete → partially_scored`, and it may only happen when the authorized
 * human scorer supplies at least one real dimension score with rationale, confidence and evidence
 * references. Reading a packet is not scoring.
 *
 * A NOTE ON HOW THE EVIDENCE IS WRITTEN HERE. Positive and negative evidence are listed SEPARATELY and
 * neither is summarised into a verdict. That is deliberate: the moment this file says "coverage is
 * good" or "authority is strong", it has scored the dimension. So it says what was verified and what
 * was not, and stops.
 */
import type { RiskRubricV1DimensionId } from "./riskGovernance";
import { getApprovedRiskRubricV1 } from "./riskGovernance";
import { VERIFIED_EVIDENCE_MANIFEST_HASH, VERIFIED_EVIDENCE_PACKAGE } from "./steakhouseEvidenceVerification";
import { ALLOWED_CONFIDENCE_VALUES, CONFIDENCE_POLICY_REFERENCE, type RiskReviewConfidence } from "./riskReviewConfidencePolicy";

export const STEAKHOUSE_SCORING_PACKET_VERSION = "1.0.0" as const;
export const PACKET_PREPARED_AT = "2026-07-16T17:40:00.000Z";

/* ------------------------------------------------------------------ *
 * Packet identity + binding
 * ------------------------------------------------------------------ */

export const PACKET_IDENTITY = {
  packetId: "steakhouse_usdc_scoring_packet_v1",
  packetVersion: STEAKHOUSE_SCORING_PACKET_VERSION,
  preparedAt: PACKET_PREPARED_AT,
  preparedBy: "evidence_preparer (automated assembly from verified artifacts — NOT a scorer, NOT a reviewer)",
  forReviewerRole: "risk_scorer",
  strategyId: "kamino_steakhouse_usdc",
  vaultAddress: "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E",
  sharesMint: "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS",
  programId: "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd",
  verifiedDeployedCommit: "1d146d7087a76edbbadc14d848ae14295c0745a4",
  rubricId: "protocol_risk_rubric_v1",
  rubricVersion: "1.0.0",
  /**
   * A SEPARATELY VERSIONED governance dependency — not part of the rubric. The rubric stays at 1.0.0;
   * this pins the vocabulary for the confidence field it already required.
   */
  confidencePolicyRef: CONFIDENCE_POLICY_REFERENCE,
  evidenceManifestHash: VERIFIED_EVIDENCE_MANIFEST_HASH,
  evidencePackageVersion: "16H-L.2",
  evidenceCutoffAt: "2026-07-16T17:08:42.000Z",
  productStateAtPreparation: "evidence_complete",
  scoreAssignmentState: "not_submitted",
  readiness: "conditionally_ready_for_human_scoring",
} as const;

export type PacketRejectionReason =
  | "wrong_vault" | "wrong_program" | "wrong_commit" | "wrong_rubric" | "stale_or_superseded_evidence";

/**
 * A packet bound to the wrong thing is worse than no packet — it would invite a human to score one
 * product using another's evidence. Construction is refused rather than warned about.
 */
export function validatePacketBinding(p: typeof PACKET_IDENTITY = PACKET_IDENTITY): { valid: boolean; reason?: PacketRejectionReason } {
  if (p.vaultAddress !== VERIFIED_EVIDENCE_PACKAGE.vaultAddress) return { valid: false, reason: "wrong_vault" };
  if (p.programId !== VERIFIED_EVIDENCE_PACKAGE.programId) return { valid: false, reason: "wrong_program" };
  if (p.verifiedDeployedCommit !== VERIFIED_EVIDENCE_PACKAGE.verifiedDeployedCommit) return { valid: false, reason: "wrong_commit" };
  if (p.rubricId !== VERIFIED_EVIDENCE_PACKAGE.rubricId || p.rubricVersion !== VERIFIED_EVIDENCE_PACKAGE.rubricVersion) return { valid: false, reason: "wrong_rubric" };
  if (p.evidenceManifestHash !== VERIFIED_EVIDENCE_MANIFEST_HASH || p.evidencePackageVersion !== VERIFIED_EVIDENCE_PACKAGE.packageVersion) return { valid: false, reason: "stale_or_superseded_evidence" };
  return { valid: true };
}

/* ------------------------------------------------------------------ *
 * Evidence references — stable IDs, not prose
 * ------------------------------------------------------------------ */

/** Stable internal IDs so a dimension binds to an ARTIFACT, not to a paragraph someone may reword. */
export const EVIDENCE_REFS = {
  VERIF_BUILD: "steakhouseDeploymentAndDepositEvidence.VERIFICATION_RECORD",
  REVIEWED_SRC_MATCH: "steakhouseDeploymentAndDepositEvidence.REVIEWED_SOURCE_MATCHES_DEPLOYED_BINARY",
  AUDIT_RELEASE: "steakhouseAuditCoverage.PUBLIC_RELEASE_IDENTITY",
  AUDIT_SQUASH: "steakhouseAuditCoverage.SQUASHED_HISTORY_LIMITATION",
  AUDIT_REMEDIATIONS: "steakhouseAuditCoverage.REMEDIATION_VERIFICATIONS",
  AUDIT_INVENTORY: "steakhouseAuditCoverage.AUDIT_INVENTORY",
  AUDIT_MATRIX: "steakhouseAuditCoverage.AUDIT_COVERAGE_MATRIX",
  AUDIT_UNCOVERED: "steakhouseAuditCoverage.PUBLICLY_UNCOVERED_SURFACE",
  AUDIT_CLASS: "steakhouseAuditCoverage.FINAL_AUDIT_CLASSIFICATION",
  AUDIT_DIFF: "steakhouseAuditCoverage.DEPLOYED_RELEASE_DIFF",
  AUDIT_THREE_Q: "steakhouseAuditCoverage.THREE_QUESTIONS",
  REWARDS_PRESENCE: "steakhouseAuditCoverage.REWARDS_FEATURE_PRESENCE",
  RESIDUAL_OBS: "steakhouseAuditCoverage.RESIDUAL_SOURCE_OBSERVATION",
  AUTHORITY: "steakhouseEvidenceClosure.AUTHORITY_EVIDENCE",
  AUTHORITY_PERMS: "steakhouseEvidenceClosure.AUTHORITY_PERMISSIONS",
  AUTHORITY_NOT_GLOBAL: "steakhouseDeploymentAndDepositEvidence.AUTHORITY_RISK_IS_NOT_GLOBALLY_COMPLETE",
  ALLOC_MAPPING: "steakhouseDeploymentAndDepositEvidence.ALLOCATION_ADMIN_RUBRIC_MAPPING",
  DEPLOY_HISTORY: "steakhouseEvidenceClosure.AUDIT_LINKAGE.deploymentHistory",
  RESERVES: "steakhouseDeploymentAndDepositEvidence.RESERVE_WITHDRAWAL_BEHAVIOR",
  RESERVE_EXPOSURE: "steakhouseEvidenceClosure.RESERVE_EXPOSURE",
  WITHDRAW_CONFIG: "steakhouseDeploymentAndDepositEvidence.WITHDRAWAL_CONFIG",
  WITHDRAW_MECH: "steakhouseDeploymentAndDepositEvidence.WITHDRAWAL_MECHANICS",
  PERMISSIONING: "steakhouseDeploymentAndDepositEvidence.PERMISSIONING",
  DEPOSIT_STATE: "steakhouseDeploymentAndDepositEvidence.DEPOSIT_STATE_POLICY",
  API_SEMANTICS: "steakhouseDeploymentAndDepositEvidence.API_STATUS_SEMANTICS",
  INCIDENT_REVIEW: "steakhouseEvidenceClosure.INCIDENT_REVIEW",
  INCIDENT_OFFICIAL: "steakhouseIncidentEvidence.OFFICIAL_LIMITED_SCOPE_STATEMENTS",
  INCIDENT_COVERAGE: "steakhouseIncidentEvidence.OFFICIAL_EVENT_MARKET_COVERAGE",
  INCIDENT_LEADS: "steakhouseIncidentEvidence.UNRESOLVED_THIRD_PARTY_LEADS",
  INCIDENT_MARKETING: "steakhouseIncidentEvidence.MARKETING_CLAIMS",
  INCIDENT_SCOPE: "steakhouseIncidentEvidence.INCIDENT_EVIDENCE_SCOPE",
  MARKET_AUTHORITIES: "steakhouseIncidentEvidence.MARKET_EMERGENCY_AUTHORITIES",
  SOCIALIZE_LOSS: "steakhouseIncidentEvidence.SOCIALIZE_LOSS_SEMANTICS",
  COUNCIL_POWERS: "steakhouseIncidentEvidence.EMERGENCY_COUNCIL_POWERS",
  SOCIALIZE_HISTORY: "steakhouseIncidentEvidence.SOCIALIZE_LOSS_HISTORY_SEARCH",
  KLEND_VERIF: "steakhouseIncidentEvidence.KLEND_VERIFICATION",
  CAPACITY: "kaminoVaultCapacitySemantics.resolveKvaultDepositCapacity",
  MARKET_DATA: "stableYieldMarketCache.cacheRecordToMarketDataInput",
  NET_APY_MATH: "yieldStrategyMarketData.computeNetAPR",
  READINESS: "steakhouseEvidenceClosure.DIMENSION_READINESS",
  HUMAN_VERIFICATION: "steakhouseEvidenceVerification.STEAKHOUSE_EVIDENCE_VERIFICATION",
} as const;

/* ------------------------------------------------------------------ *
 * Scoring blocks
 * ------------------------------------------------------------------ */

export interface ScoringBlock {
  dimensionId: RiskRubricV1DimensionId;
  internalLabel: string;
  weight: number;
  scoreDirection: "higher_is_more_evidence_supported";
  anchors: { band: string; range: [number, number]; meaning: string }[];
  /** What the evidence VERIFIES in this dimension's favour. Facts, never a verdict. */
  verifiedPositiveEvidence: string[];
  /** What the evidence VERIFIES against it, or leaves open. Facts, never a verdict. */
  verifiedNegativeEvidence: string[];
  acceptedLimitationsAndUncertainty: string[];
  mandatoryBlockers: string[];
  mandatoryBlockerStatus: "present" | "absent";
  mandatoryBlockerDetail: string;
  evidenceRefs: string[];
  evidenceState: "complete" | "partial" | "blocked" | "stale" | "not_applicable";
  /** The governance contract this dimension's confidence value must satisfy. */
  confidencePolicyRef: typeof CONFIDENCE_POLICY_REFERENCE;
  /** The complete allowed set. Reproduced per dimension so a scorer never has to go looking. */
  allowedConfidenceValues: readonly RiskReviewConfidence[];
  /** TO BE FILLED BY THE AUTHORIZED HUMAN SCORER. Typed `null` so nothing can prefill them. */
  score: null;
  rationale: null;
  confidence: null;
}

const ANCHORS = getApprovedRiskRubricV1().dimensions[0].anchors as ScoringBlock["anchors"];

/**
 * The 12 blocks, in the rubric's CANONICAL order.
 *
 * NOTE ON ORDER: the task text enumerated the dimensions in a different sequence from the approved
 * rubric (e.g. it listed upgrade_admin_authority 6th; the rubric has it 3rd). The instruction was to
 * use the rubric's canonical order and not reorder, so the RUBRIC's order is authoritative here. The
 * IDs and weights are identical either way; only the sequence differed.
 */
export const SCORING_BLOCKS: ScoringBlock[] = [
  {
    dimensionId: "audit_security",
    internalLabel: "Audit & security coverage",
    weight: 15,
    scoreDirection: "higher_is_more_evidence_supported",
    anchors: ANCHORS,
    verifiedPositiveEvidence: [
      "The deployed binary is hash-verified to public commit 1d146d70… (on_chain_hash === executable_hash === 5b1eac16…), verified 6m28s AFTER the 2026-07-14 deploy, with no upgrade since, and signed by the program's own 5-of-10 upgrade authority.",
      "All 7 documented remediations from the four 2026 feature audits are verified PRESENT in the deployed source by direct inspection — minimum-withdrawal validation, cToken-vault mint validation (closed constraint chain), two-stage penalty with Fraction precision, saturating pending-reward arithmetic, exhaustion-timestamp reset, refresh ordering across 9 call sites, duplicate-refresh removal.",
      "Structural corroboration: vault_operations::redeem_in_kind and both penalty helpers are BYTE-IDENTICAL between release/v2.1.0 (their audit target) and the deployed release/v2.2.2; refresh_rewards and topup_rewards are byte-identical between release/v2.1.1 and v2.2.2. The audited logic is the running logic.",
      "The source this project reviewed IS the deployed commit, so every source-derived conclusion in the 16H series is a claim about deployed bytecode.",
    ],
    verifiedNegativeEvidence: [
      "Audit coverage is PARTIAL, not full. Material runtime surface in the deployed release carries no public audit coverage.",
      "klend_operations.rs changed 214 lines in v2.2.2 — the CPI layer that actually moves user funds — and is publicly unaudited in this release.",
      "Three NEW instructions (update_reserve_allocation_v2, deposit_with_min_shares_out, buy_with_min_shares_out), the new CtokenCap state concept, the allocation-admin surface (46 lines) and the reserve whitelist (15 lines) are all publicly uncovered.",
      "The private kvault-private → public commit correspondence is UNATTESTED; public history is squashed (one commit per release) and references no private PR. Only Kamino can attest it.",
      "The 2024-2025 baselines (OtterSec, Sec3, Offside Labs) state no commit and predate the first public tag; they are not credited with covering later changed code.",
      "Certora formal verification and Ackee fuzzing artifacts exist but state no commit scope; recorded as existing, NOT as covering the deployed release.",
    ],
    acceptedLimitationsAndUncertainty: [
      "Classification is `deployed_feature_remediations_verified_with_partial_coverage`.",
      "Verified-present means the deployed code exhibits the property; it does NOT prove the code changed BECAUSE of the finding (squashed history blocks causal attribution).",
      "Evidence completeness for this dimension is explicitly NOT the same as favourable coverage.",
    ],
    mandatoryBlockers: ["no audit covers the deployed program", "an unresolved critical finding", "the audited version cannot be related to the deployed bytecode"],
    mandatoryBlockerStatus: "absent",
    mandatoryBlockerDetail: "'the audited version cannot be related to the deployed bytecode' was RESOLVED at 16H-L.2 by direct inspection of the hash-verified source. 'no audit covers the deployed program' — the 2026 feature audits' function bodies are byte-identical to the deployed ones. 'an unresolved critical finding' — none located; all documented findings are marked fixed and their remediations verified present. Resolved blockers must not be reintroduced.",
    evidenceRefs: [EVIDENCE_REFS.VERIF_BUILD, EVIDENCE_REFS.REVIEWED_SRC_MATCH, EVIDENCE_REFS.AUDIT_RELEASE, EVIDENCE_REFS.AUDIT_SQUASH, EVIDENCE_REFS.AUDIT_REMEDIATIONS, EVIDENCE_REFS.AUDIT_INVENTORY, EVIDENCE_REFS.AUDIT_MATRIX, EVIDENCE_REFS.AUDIT_UNCOVERED, EVIDENCE_REFS.AUDIT_CLASS, EVIDENCE_REFS.AUDIT_THREE_Q],
    evidenceState: "complete",
    confidencePolicyRef: CONFIDENCE_POLICY_REFERENCE,
    allowedConfidenceValues: ALLOWED_CONFIDENCE_VALUES,
    score: null, rationale: null, confidence: null,
  },
  {
    dimensionId: "maturity",
    internalLabel: "Maturity",
    weight: 8,
    scoreDirection: "higher_is_more_evidence_supported",
    anchors: ANCHORS,
    verifiedPositiveEvidence: [
      "The vault and program are live on mainnet with ~20.7M USDC AUM.",
      "The deployment timestamp is chain-sourced, not estimated: 2026-07-14T14:54:02Z via getBlockTime(432874668).",
      "The program is the canonical current deployment and owns the reviewed vault.",
    ],
    verifiedNegativeEvidence: [
      "The deployed bytecode was only ~2 days old at the evidence cutoff. Battle-testing time for THIS binary is measured from 2026-07-14, regardless of how long the product name has existed.",
      "The predecessor program kvauTFR8… is CLOSED (programData account no longer exists; last activity 2026-03-25), so operating history under that program does not transfer to this binary.",
      "Protocol-level history predates the current deployment and is a claim about the protocol, not about this binary.",
    ],
    acceptedLimitationsAndUncertainty: [
      "TVL and popularity are NOT evidence of safety and must not be converted into one. AUM is recorded as scale, not as a maturity signal.",
      "Kamino's '$0 bad debt since November 2023' is a protocol-level lending-market claim and does not speak to this binary's maturity.",
    ],
    mandatoryBlockers: [],
    mandatoryBlockerStatus: "absent",
    mandatoryBlockerDetail: "Rubric v1 defines no mandatory blocker for this dimension.",
    evidenceRefs: [EVIDENCE_REFS.VERIF_BUILD, EVIDENCE_REFS.DEPLOY_HISTORY, EVIDENCE_REFS.AUDIT_RELEASE],
    evidenceState: "partial",
    confidencePolicyRef: CONFIDENCE_POLICY_REFERENCE,
    allowedConfidenceValues: ALLOWED_CONFIDENCE_VALUES,
    score: null, rationale: null, confidence: null,
  },
  {
    dimensionId: "upgrade_admin_authority",
    internalLabel: "Upgrade & admin authority",
    weight: 15,
    scoreDirection: "higher_is_more_evidence_supported",
    anchors: ANCHORS,
    verifiedPositiveEvidence: [
      "Program upgrade authority GzFgdRJXmaw… is a Squads v4 vault PDA of multisig 6hhBGCtmg… (index 0), proven by seed derivation — NOT inferred. 5-of-10 threshold with a 24-HOUR time lock. config_authority is default, so members/threshold change only by member vote.",
      "The 24h time lock means an approved upgrade cannot execute for 24 hours — a window in which a user could withdraw.",
      "Vault admin 9ceRgz… is a Squads v4 vault PDA of multisig 4WUP4FFwg… (index 0), 3-of-10, config_authority default.",
      "Both are OFF-curve: no private key can exist for either.",
      "Decode self-validates: the observed transaction signers are decoded members of their respective multisigs.",
    ],
    verifiedNegativeEvidence: [
      "The vault admin has NO time lock — fee, cap, minimum and penalty changes take effect immediately, with no window for a user to react.",
      "The vault admin's threshold (3-of-10) is materially lower than the upgrade authority's (5-of-10).",
      "The 24h lock bounds WHEN an upgrade executes, not WHAT it contains; an upgrade can change every rule below it.",
    ],
    acceptedLimitationsAndUncertainty: [
      "Threshold control by N member ADDRESSES is proven. WHO holds those keys is NOT — each could be a hardware wallet, an MPC custodian, or one person with ten keys. Key-holder independence is unproven and only Kamino can settle it.",
      "Member addresses being on-curve proves they are keypair addresses, not that distinct humans hold them.",
      "This dimension covers BOTH upgrade and admin authority; the two have materially different strength here.",
    ],
    mandatoryBlockers: ["upgrade authority cannot be determined", "an active single-key upgrade authority over user funds with no timelock"],
    mandatoryBlockerStatus: "absent",
    mandatoryBlockerDetail: "Both ABSENT. 'cannot be determined' — determined by seed derivation. 'single-key … with no timelock' — absent on BOTH limbs: not single-key (5-of-10) and not untimelocked (86400s). NOTE: 16H-L wrongly reported this as a single-key EOA; that was corrected in 16H-L.1 and the blocker must not be reintroduced.",
    evidenceRefs: [EVIDENCE_REFS.AUTHORITY, EVIDENCE_REFS.AUTHORITY_PERMS, EVIDENCE_REFS.AUTHORITY_NOT_GLOBAL],
    evidenceState: "complete",
    confidencePolicyRef: CONFIDENCE_POLICY_REFERENCE,
    allowedConfidenceValues: ALLOWED_CONFIDENCE_VALUES,
    score: null, rationale: null, confidence: null,
  },
  {
    dimensionId: "manager_discretion",
    internalLabel: "Manager discretion",
    weight: 12,
    scoreDirection: "higher_is_more_evidence_supported",
    anchors: ANCHORS,
    verifiedPositiveEvidence: [
      "Manager permissions are fully enumerated from a hash-verified binary — this is the deployed permission surface, not a plausible one.",
      "The allocation admin CANNOT extract funds: no instruction in the verified binary permits it. Its power is redirection between reserves, not extraction.",
      "allowAllocationsInWhitelistedReservesOnly = 1 and allowInvestInWhitelistedReservesOnly = 1 on the verified binary confine allocations to a whitelist maintained at GLOBAL-CONFIG level via addUpdateWhitelistedReserve — i.e. not by the allocation admin itself.",
      "Per-reserve tokenAllocationCap values bound concentration in two reserves (Maple 25M, Bitcoin 10M).",
    ],
    verifiedNegativeEvidence: [
      "The allocation admin CuEC7JoZ… is a RAW ON-CURVE KEYPAIR that signs its own transactions directly — no multisig, no time lock. Unlike the upgrade authority (5-of-10 + 24h) and vault admin (3-of-10), a single key suffices.",
      "It directs ~20.7M USDC across four reserves and can add or remove reserves (21 of 25 allocation slots are free).",
      "Reallocation is OBSERVED, not theoretical: SOL/BTC weight drifted 74.2% → 69.37% → 87.61% across three independent reads with no user action.",
      "The allocation-admin surface (handler_update_reserve_allocation.rs, 46 lines) and the reserve whitelist (15 lines) both changed in v2.2.2 and are publicly UNAUDITED — the weakest authority operates the least-covered changed code.",
    ],
    acceptedLimitationsAndUncertainty: [
      "The whitelist mitigation's strength is itself unverified: WealthSmith has NOT enumerated the whitelist contents nor verified who controls global config.",
      "The single key may be held under an off-chain threshold/MPC scheme — indistinguishable on-chain — so this does NOT prove one person can act alone.",
      "Rubric v1 defines NO 'single-key manager' blocker, so per the 16H-L.1 instruction this is material evidence for the scorer, NOT a mechanical disqualifier.",
      "The strong upgrade-authority controls MUST NOT be read as covering this. Three authorities, three control models, three separate conclusions.",
    ],
    mandatoryBlockers: ["manager permissions cannot be determined"],
    mandatoryBlockerStatus: "absent",
    mandatoryBlockerDetail: "ABSENT — permissions ARE determined. Determined is not favourable: what the evidence determines is that a single unlocked key directs ~20.7M USDC.",
    evidenceRefs: [EVIDENCE_REFS.AUTHORITY, EVIDENCE_REFS.AUTHORITY_PERMS, EVIDENCE_REFS.ALLOC_MAPPING, EVIDENCE_REFS.AUTHORITY_NOT_GLOBAL, EVIDENCE_REFS.AUDIT_UNCOVERED],
    evidenceState: "complete",
    confidencePolicyRef: CONFIDENCE_POLICY_REFERENCE,
    allowedConfidenceValues: ALLOWED_CONFIDENCE_VALUES,
    score: null, rationale: null, confidence: null,
  },
  {
    dimensionId: "strategy_complexity",
    internalLabel: "Strategy complexity",
    weight: 10,
    scoreDirection: "higher_is_more_evidence_supported",
    anchors: ANCHORS,
    verifiedPositiveEvidence: [
      "Current exposure IS determined: 4 active reserves of 25 slots, with weights, markets and caps, all resolved from official sources.",
      "All four reserves' liquidity mint is canonical USDC — verified, not assumed.",
      "No leverage, recursive borrowing, or LP/impermanent-loss exposure was found in the vault's own allocation strategy.",
      "The previously-unresolved 4th reserve now resolves to Maple Market via Kamino's official market list.",
    ],
    verifiedNegativeEvidence: [
      "This is a MANAGED MULTI-RESERVE CREDIT POSITION, not a plain USDC deposit. USDC is lent into JLP / SOL-BTC / Bitcoin / Maple collateral markets.",
      "Borrower collateral and market risk differ per reserve; each market's collateral, liquidation parameters and bad-debt behaviour are unreviewed.",
      "Allocation weights change over time at a single key's discretion; user exposure can change with no user action.",
      "Reserve utilization is high across the board: 78.56% / 88.03% / 88.92% / 81.44%.",
    ],
    acceptedLimitationsAndUncertainty: [
      "Each market's collateral and liquidation behaviour is a named, bounded gap — not an unknown surface.",
      "'Holds USDC' would understate this position; the deposited asset identity and the exposure are different questions.",
    ],
    mandatoryBlockers: ["current exposure cannot be determined", "unmodelled leverage", "unmodelled debt exposure", "unmodelled LP / impermanent-loss exposure"],
    mandatoryBlockerStatus: "absent",
    mandatoryBlockerDetail: "'current exposure cannot be determined' — RESOLVED. The other three — no leverage, no unmodelled debt exposure at the vault layer, and no LP/IL exposure were found in the verified allocation strategy. NOTE for the scorer: the vault's exposure to BORROWER debt in the underlying markets is modelled and disclosed above, so it is not 'unmodelled' — but it is real and belongs in the score.",
    evidenceRefs: [EVIDENCE_REFS.RESERVES, EVIDENCE_REFS.RESERVE_EXPOSURE, EVIDENCE_REFS.ALLOC_MAPPING],
    evidenceState: "partial",
    confidencePolicyRef: CONFIDENCE_POLICY_REFERENCE,
    allowedConfidenceValues: ALLOWED_CONFIDENCE_VALUES,
    score: null, rationale: null, confidence: null,
  },
  {
    dimensionId: "composability_dependency",
    internalLabel: "Composability & dependencies",
    weight: 8,
    scoreDirection: "higher_is_more_evidence_supported",
    anchors: ANCHORS,
    verifiedPositiveEvidence: [
      "Dependencies are enumerated: the kvault program, KLend reserves in four markets, Scope oracles.",
      "KLend itself publishes a VERIFIED BUILD: commit 37592174…, on_chain_hash === executable_hash === 73f4aef8…, so KLend source is readable as evidence about the running program.",
      "socialize_loss semantics were verified against that deployed KLend binary rather than against prose.",
      "The emergency council's powers are a restrictive-only allowlist (`_ => false` fallback) — it cannot loosen a parameter or impose a loss.",
    ],
    verifiedNegativeEvidence: [
      "The vault composes with FOUR external KLend markets whose owners and councils are authorities WealthSmith does not control and Kamino's vault manager does not control.",
      "socialize_loss can write down the vault's position: the vault holds ordinary cTokens and dilutes pro rata, with NO preference over direct depositors.",
      "One emergency council (4VtJ1yCC…, Squads 2-of-7, NO time lock) spans 100% of the vault's allocation — a concentration.",
      "The Bitcoin Market's lending_market_owner control model is UNRESOLVED (off-curve, so not a raw keypair, but the deriving program is unproven).",
      "klend_operations.rs — the CPI layer moving user funds — changed 214 lines in v2.2.2 and is publicly unaudited.",
    ],
    acceptedLimitationsAndUncertainty: [
      "Each market's collateral, liquidation parameters and bad-debt behaviour are unreviewed.",
      "The Scope oracle aggregator is a dependency whose own review is out of scope.",
      "Whether an emergency council has ever acted on these markets was not searched.",
    ],
    mandatoryBlockers: ["an unaudited integrated component carrying material funds"],
    mandatoryBlockerStatus: "absent",
    mandatoryBlockerDetail: "Recorded as ABSENT on the current evidence: the integrated component (KLend) is audited in Kamino's official audits repository and is hash-verified to commit 37592174…. FOR THE SCORER, EXPLICITLY: this is the dimension where the unaudited 214-line kvault→KLend CPI layer is most arguable. It is kvault's OWN code rather than an integrated third-party component, which is why it is recorded under audit_security's uncovered surface rather than flipping this blocker. If the scorer judges that an unaudited CPI layer carrying material funds satisfies this blocker, that is a legitimate reading and is the scorer's call to make — the evidence is presented rather than resolved.",
    evidenceRefs: [EVIDENCE_REFS.MARKET_AUTHORITIES, EVIDENCE_REFS.SOCIALIZE_LOSS, EVIDENCE_REFS.COUNCIL_POWERS, EVIDENCE_REFS.KLEND_VERIF, EVIDENCE_REFS.RESERVES, EVIDENCE_REFS.AUDIT_UNCOVERED],
    evidenceState: "partial",
    confidencePolicyRef: CONFIDENCE_POLICY_REFERENCE,
    allowedConfidenceValues: ALLOWED_CONFIDENCE_VALUES,
    score: null, rationale: null, confidence: null,
  },
  {
    dimensionId: "oracle_risk",
    internalLabel: "Oracle & pricing",
    weight: 8,
    scoreDirection: "higher_is_more_evidence_supported",
    anchors: ANCHORS,
    verifiedPositiveEvidence: [
      "Each active reserve's USDC liquidity price is sourced from Scope feed 3t4JZcue… (price chain [13]) — read from the reserves' on-chain config, not assumed.",
      "The vault-side oracle model is therefore known and identical across all four reserves.",
    ],
    verifiedNegativeEvidence: [
      "Collateral-side oracles for each market are NOT enumerated. The vault's credit exposure is to JLP / SOL-BTC / Bitcoin / Maple collateral, whose pricing drives liquidations that determine whether the vault's loans are repaid.",
      "All four reserves share ONE Scope feed for the USDC side — no oracle diversity or redundancy at that layer was verified.",
      "Stale-price handling and deviation/confidence handling (both rubric mandatory evidence) were not verified for this product.",
    ],
    acceptedLimitationsAndUncertainty: [
      "Kamino documents oracle safeguards (e.g. LST stake-rate oracles) generally. That is NOT evidence about THIS product's oracle configuration and must not be read as such.",
      "The blocker is scoped to 'where the product depends on prices' — the vault-side model is established; the collateral-side is not.",
      "Oracle redundancy: unresolved. Oracle diversity: unresolved. Neither is claimed.",
    ],
    mandatoryBlockers: ["oracle model cannot be established where the product depends on prices"],
    mandatoryBlockerStatus: "absent",
    mandatoryBlockerDetail: "Recorded ABSENT because the vault-side oracle model IS established (Scope 3t4JZcue…, chain [13], on all four reserves). The collateral-side model is a named, bounded gap rather than an unestablished model. The scorer should weigh that gap in the score rather than expect it to have flipped a blocker.",
    evidenceRefs: [EVIDENCE_REFS.RESERVE_EXPOSURE, EVIDENCE_REFS.RESERVES, EVIDENCE_REFS.READINESS],
    evidenceState: "partial",
    confidencePolicyRef: CONFIDENCE_POLICY_REFERENCE,
    allowedConfidenceValues: ALLOWED_CONFIDENCE_VALUES,
    score: null, rationale: null, confidence: null,
  },
  {
    dimensionId: "liquidity_withdrawal",
    internalLabel: "Liquidity & withdrawal",
    weight: 12,
    scoreDirection: "higher_is_more_evidence_supported",
    anchors: ANCHORS,
    verifiedPositiveEvidence: [
      "The withdrawal model is fully determined against the hash-verified binary.",
      "withdrawalPenaltyBps = 0 and withdrawalPenaltyLamports = 0 — NO configured withdrawal penalty. (This corrects the earlier 16H-L claim of a live third exit cost.)",
      "No withdrawal queue, FIFO, cooldown or pending-withdrawal construct exists anywhere in the deployed binary — an authoritative negative, not an unknown.",
      "A partial-withdrawal capability exists (`withdrawFromAvailable`, against the unallocated balance).",
      "All four reserves are status Active, emergencyMode 0, blockCtokenUsage 0 at slot 433302860.",
      "In aggregate, reserves currently hold more free liquidity (~27.4M USDC) than the vault's total position (~20.7M).",
    ],
    verifiedNegativeEvidence: [
      "unallocatedWeight = 0 and unallocatedTokensCap = 0: the vault's policy is to hold NO unallocated buffer. There is no intentional withdrawal buffer by design.",
      "At slot 433302860 tokenAvailable (69,969.58 USDC) is LESS than pendingFees (70,038.77) — the unencumbered buffer is NEGATIVE (−69.18). Effectively ~100% of any withdrawal must come from reserve liquidity.",
      "TWO of four reserves (Maple 1.44%, Bitcoin 0.66%) currently hold LESS free liquidity than the vault's position in them — those positions cannot be exited in full right now.",
      "AGGREGATE coverage does NOT imply a full exit: withdrawal executes PER RESERVE, so netting the totals would hide exactly this constraint.",
      "There is no queue to fall back on — if a reserve lacks liquidity, the withdrawal is bounded in real time, not deferred.",
      "Immediate full withdrawal is NOT guaranteed. Withdrawals must not be described as instant.",
      "Zero penalty is a CURRENT STATE, not a guarantee: both penalty fields remain settable by the 3-of-10 vault-admin multisig with NO time lock.",
    ],
    acceptedLimitationsAndUncertainty: [
      "Reserve liquidity is a live observation at one slot, driven by third-party borrowers at 78–89% utilization. It can fall at any time with no action by the vault, the user, or WealthSmith, and must never be cached or treated as a floor.",
      "`redeemInKind` exists as an alternate exit path, but its semantics and preconditions were NOT verified and are not relied on.",
      "calculate_withdrawal_penalty_params sources from a protocol-level GlobalConfig whose controller is unverified — a future non-zero penalty could originate outside this vault's admin.",
      "The vault position values used for the coverage comparison are approximations (ctoken share × reserve total), not exact SDK positions.",
    ],
    mandatoryBlockers: ["withdrawal model cannot be determined"],
    mandatoryBlockerStatus: "absent",
    mandatoryBlockerDetail: "ABSENT — the model IS determined. Determined is not favourable: what it determines is a zero-buffer, reserve-dependent, non-instant withdrawal path with two reserves currently unable to cover the vault's position.",
    evidenceRefs: [EVIDENCE_REFS.WITHDRAW_CONFIG, EVIDENCE_REFS.WITHDRAW_MECH, EVIDENCE_REFS.RESERVES, EVIDENCE_REFS.COUNCIL_POWERS],
    evidenceState: "complete",
    confidencePolicyRef: CONFIDENCE_POLICY_REFERENCE,
    allowedConfidenceValues: ALLOWED_CONFIDENCE_VALUES,
    score: null, rationale: null, confidence: null,
  },
  {
    dimensionId: "asset_stablecoin_risk",
    internalLabel: "Asset / stablecoin exposure",
    weight: 5,
    scoreDirection: "higher_is_more_evidence_supported",
    anchors: ANCHORS,
    verifiedPositiveEvidence: [
      "The deposited asset is canonical Circle USDC (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v) — verified against the vault's tokenMint.",
      "NOT bridged and NOT wrapped.",
      "Every active reserve's liquidity mint is the same canonical USDC — verified per reserve, not assumed from the vault.",
    ],
    verifiedNegativeEvidence: [
      "Stablecoin issuer dependency applies: Circle can freeze USDC at the token-account level.",
      "Depeg and redemption dependencies remain applicable and are outside any protocol control.",
      "The vault's credit exposure is to JLP / SOL-BTC / Bitcoin / Maple collateral markets — a materially different risk profile from 'holds USDC'.",
    ],
    acceptedLimitationsAndUncertainty: [
      "Underlying lending exposure does NOT change the deposited asset identity — these are two separate facts and this dimension covers the asset, not the strategy (see strategy_complexity).",
      "Issuer freeze/depeg/redemption risk is inherent to USDC and is not specific to this product.",
    ],
    mandatoryBlockers: ["wrapped/bridged exposure that is not modelled"],
    mandatoryBlockerStatus: "absent",
    mandatoryBlockerDetail: "ABSENT — the asset is canonical Circle USDC, neither wrapped nor bridged, verified at the vault and at every active reserve.",
    evidenceRefs: [EVIDENCE_REFS.RESERVE_EXPOSURE, EVIDENCE_REFS.RESERVES, EVIDENCE_REFS.MARKET_DATA],
    evidenceState: "partial",
    confidencePolicyRef: CONFIDENCE_POLICY_REFERENCE,
    allowedConfidenceValues: ALLOWED_CONFIDENCE_VALUES,
    score: null, rationale: null, confidence: null,
  },
  {
    dimensionId: "withdrawal_fee_transparency",
    internalLabel: "Fee transparency",
    weight: 3,
    scoreDirection: "higher_is_more_evidence_supported",
    anchors: ANCHORS,
    verifiedPositiveEvidence: [
      "Fees are fully readable on the verified binary: management 0 bps, performance 500 bps.",
      "Both are already inside the SDK's net APY via computeNetAPR = grossAPR × (1 − perfFee) − mgmtFee — so the APY WealthSmith would surface is net of them.",
      "withdrawalPenaltyBps = 0 and withdrawalPenaltyLamports = 0 — no withdrawal penalty is configured, and none is missing from the net APY. This CORRECTS the 16H-L 'hidden third fee' finding, which was written before those fields were read.",
      "Minimums are readable: minDeposit 0.1 USDC, minWithdraw 0.001 USDC, minInvest 1 USDC.",
    ],
    verifiedNegativeEvidence: [
      "All three fee parameters are admin-settable via the 3-of-10 vault-admin multisig with NO time lock — a displayed APY can change with immediate effect and no user warning.",
      "calculate_withdrawal_penalty_params still sources from a protocol-level GlobalConfig whose controller WealthSmith has not verified, so a future non-zero penalty could originate outside this vault's admin.",
    ],
    acceptedLimitationsAndUncertainty: [
      "Zero penalty is a current state, not a guarantee.",
      "Rubric v1 defines no mandatory blocker for this dimension.",
    ],
    mandatoryBlockers: [],
    mandatoryBlockerStatus: "absent",
    mandatoryBlockerDetail: "Rubric v1 defines no mandatory blocker for this dimension.",
    evidenceRefs: [EVIDENCE_REFS.WITHDRAW_CONFIG, EVIDENCE_REFS.MARKET_DATA, EVIDENCE_REFS.NET_APY_MATH, EVIDENCE_REFS.AUTHORITY_PERMS],
    evidenceState: "complete",
    confidencePolicyRef: CONFIDENCE_POLICY_REFERENCE,
    allowedConfidenceValues: ALLOWED_CONFIDENCE_VALUES,
    score: null, rationale: null, confidence: null,
  },
  {
    dimensionId: "operational_dependency_risk",
    internalLabel: "Operational & data risk",
    weight: 2,
    scoreDirection: "higher_is_more_evidence_supported",
    anchors: ANCHORS,
    verifiedPositiveEvidence: [
      "An authoritative source timestamp exists: chain block time via getBlockTime(slot), not a wall clock.",
      "The data path is official SDK/RPC with proven net + fraction APY, a validated artifact and a published same-origin cache with browserFetched:false.",
      "Market authorities are enumerated: market owner (Squads 4-of-10, 12h time lock — corroborating Kamino's published '12h on SOL/BTC Market'), emergency council (Squads 2-of-7, no time lock).",
    ],
    verifiedNegativeEvidence: [
      "The vault depends on an off-chain crank calling `invest`, driven by the single allocation-admin key. lastInvestSlot is identical across all four reserves, consistent with one crank operating them together.",
      "unallocatedWeight = 0 means the vault depends on that crank to deploy deposits rather than leaving them idle.",
      "The allocation admin is an actively-used hot wallet (~11.9 SOL) — a different key-hygiene posture from a cold multisig signer. Compromise or loss is mitigated by no on-chain control.",
      "The emergency council (2-of-7, no time lock, one authority over all four markets) can instantly apply restrictive brakes (deposit/borrow limits to 0, reserve emergency mode) that would impede the vault's ability to deploy or exit liquidity.",
      "The Bitcoin Market owner's control model is unresolved.",
    ],
    acceptedLimitationsAndUncertainty: [
      "Council brake powers are restrictive-only by construction and are a deliberate fast-brake design per Kamino's documentation — but a brake still has user impact given the vault's ~0 buffer.",
      "Market authorities are a DIFFERENT protocol layer from the KVault authorities and are not controlled by Kamino's vault manager.",
    ],
    mandatoryBlockers: ["no authoritative source timestamp"],
    mandatoryBlockerStatus: "absent",
    mandatoryBlockerDetail: "ABSENT — resolved at 16H-I: chain block time is the authoritative source timestamp.",
    evidenceRefs: [EVIDENCE_REFS.MARKET_DATA, EVIDENCE_REFS.ALLOC_MAPPING, EVIDENCE_REFS.MARKET_AUTHORITIES, EVIDENCE_REFS.COUNCIL_POWERS, EVIDENCE_REFS.API_SEMANTICS],
    evidenceState: "complete",
    confidencePolicyRef: CONFIDENCE_POLICY_REFERENCE,
    allowedConfidenceValues: ALLOWED_CONFIDENCE_VALUES,
    score: null, rationale: null, confidence: null,
  },
  {
    dimensionId: "incident_history",
    internalLabel: "Incident history",
    weight: 2,
    scoreDirection: "higher_is_more_evidence_supported",
    anchors: ANCHORS,
    verifiedPositiveEvidence: [
      "No confirmed relevant incident was found within the reviewed scope.",
      "Official primary: Kamino's risk documentation states $0 bad debt across all protocol lending markets since November 2023, across 5 named stress events (Feb 2025 → Feb 2026), each reporting $0 bad debt and normal protocol operation.",
      "The most recent named event (2026-02-05/06) has a detailed analysis on Kamino's official governance forum, authored by Allez Labs.",
      "socialize_loss requires the lending_market_owner (verified against the deployed KLend binary) — 99.34% of allocation sits behind a 4-of-10 multisig with a 12-hour time lock.",
      "In the current market owner's COMPLETE signature history (166 txs, 2026-02-24 → 2026-07-16, 162 KLend-involving), ZERO socialize_loss invocations were found.",
    ],
    verifiedNegativeEvidence: [
      "'No confirmed incident' is a SEARCH RESULT, not proof that no incident occurred.",
      "The $0-bad-debt evidence is a BAD-DEBT claim scoped to LENDING MARKETS with no stated cutoff. It does not cover the exact vault, does not cover the current KVault deployment, and does not establish absence of security/withdrawal/allocation/oracle/administrative/operational incidents.",
      "Named stress-event material covers Main/JLP/Bitcoin/Fartcoin/JTO — so it demonstrably speaks to only 10.95% of current allocation (JLP 10.29 + Bitcoin 0.66). SOL/BTC (87.61%) and Maple (1.44%) are absent.",
      "NO authoritative clean-history statement exists for the exact vault or the current KVault deployment. No published review postdates the 2026-07-14 binary (latest monthly report: April 2026).",
      "The historical socialize_loss search is INCOMPLETE: the searched owner's history begins 2026-02-24 and the markets are older, so previous owners' periods are unsearched; the Bitcoin owner's history hit the RPC cap.",
      "An unresolved third-party lead (~$1.26M bad debt, Solend/Coin98/'Kamino' pools, USDH oracle manipulation) has no primary source and remains unconfirmed.",
      "KVault depositors remain exposed to underlying-market loss socialization, with no preference over direct depositors.",
    ],
    acceptedLimitationsAndUncertainty: [
      "A Kamino X post claims '0 Incidents' but has no scope, cutoff, methodology or incident taxonomy — context only, never evidence, and it cannot establish a clean history.",
      "Uncovered markets are UNEXAMINED, not adverse. The 10.95% figure describes evidence scope only; it is not a risk weight.",
      "Non-public incidents, bug-bounty disclosures and near-misses are outside the reviewed scope.",
      "Evidence is sufficiently bounded for scoring but remains genuinely uncertain — and uncertainty belongs in the score and confidence, not in an assumption of cleanliness.",
    ],
    mandatoryBlockers: ["a known unremediated exploit", "no sourced incident review exists"],
    mandatoryBlockerStatus: "absent",
    mandatoryBlockerDetail: "Both ABSENT. 'a known unremediated exploit' — none located within the reviewed scope. 'no sourced incident review exists' — a sourced, scoped, bounded review now exists for this exact product (16H-L.2 addendum). Cleared on COMPLETENESS, NOT on a clean record: zero confirmed incidents is a search result and no clean-history claim is made anywhere.",
    evidenceRefs: [EVIDENCE_REFS.INCIDENT_REVIEW, EVIDENCE_REFS.INCIDENT_OFFICIAL, EVIDENCE_REFS.INCIDENT_COVERAGE, EVIDENCE_REFS.INCIDENT_LEADS, EVIDENCE_REFS.INCIDENT_MARKETING, EVIDENCE_REFS.INCIDENT_SCOPE, EVIDENCE_REFS.SOCIALIZE_HISTORY, EVIDENCE_REFS.SOCIALIZE_LOSS],
    evidenceState: "complete",
    confidencePolicyRef: CONFIDENCE_POLICY_REFERENCE,
    allowedConfidenceValues: ALLOWED_CONFIDENCE_VALUES,
    score: null, rationale: null, confidence: null,
  },
];

/* ------------------------------------------------------------------ *
 * Reviewer instructions
 * ------------------------------------------------------------------ */

/**
 * INTERNAL ONLY. Per riskScoreExposurePolicy, none of this may reach a suggestion card, review drawer,
 * dashboard, portfolio page, Smith AI answer, Qdrant answer, analytics payload, public API or public
 * documentation — not the numbers, not the bands, not the threshold, not the weights.
 */
export const REVIEWER_INSTRUCTIONS = {
  audience: "the authorized human scorer (role: risk_scorer)",
  internalOnly: true,
  perDimensionRequirements: [
    "An INTEGER score from 0 to 10 (decimals are not permitted by rubric v1).",
    "A concise rationale.",
    "An approved confidence value.",
    "Confirmation that the listed evidence references were considered.",
  ],
  howToRead: [
    "DIRECTION: higher means stronger EVIDENCE-SUPPORTED SUITABILITY — not higher risk. The field name `riskScore` is a legacy internal name; read it as a suitability score.",
    "Scores are INTERNAL ONLY. They must never appear on any user-facing surface.",
    "The product does NOT need to score favourably merely because the evidence is complete. Evidence completeness means the dimension CAN be scored — it says nothing about how it should score.",
    "Represent uncertainty through the score, the rationale and the confidence. Do not resolve uncertainty by assuming the favourable reading.",
    "Do NOT target the threshold of 7. The threshold is a downstream gate, not a goal, and scoring toward it would invert the point of scoring.",
    "Any severe dimension, or any mandatory blocker, may cap the final result regardless of other dimensions.",
    "Positive and negative evidence are listed separately and deliberately un-summarised. No verdict is offered because offering one would be scoring.",
  ],
  whatThisPacketDoesNotContain: [
    "any suggested score", "any score range recommendation", "any 'likely' or 'reasonable' score",
    "any pass-oriented guidance", "any wording aimed at the threshold of 7", "any aggregate",
  ],
  confidenceEnumStatus:
    "RESOLVED. The open governance item 16H-M surfaced (rubric v1.0.0 mandates confidence but defined no enum) was closed by an explicit product-owner decision: Risk Review Confidence Policy v1 (risk_review_confidence_v1@1.0.0, approved). Allowed values are exactly high | medium | low. The rubric was deliberately NOT bumped to 1.0.1 — the policy is a separately versioned governance dependency, so the rubric's approval provenance and hash stay intact.",
  confidencePolicyRef: CONFIDENCE_POLICY_REFERENCE,
  allowedConfidenceValues: ALLOWED_CONFIDENCE_VALUES,
  confidenceGuidance: [
    "Confidence describes confidence in the EVIDENCE supporting the score you chose — not whether the product is safe, not whether the score is high or low, and not how likely a loss is.",
    "Being certain the evidence supports a LOW score is HIGH confidence. Score and confidence are orthogonal; conflating them double-counts the same judgement.",
    "Confidence has no numeric mapping, no weight, and never enters aggregation. It cannot raise or lower a score, cannot override a mandatory blocker, and cannot make incomplete evidence complete.",
    "Confidence never replaces the rationale or the evidence references — all three are required together.",
    "If the evidence is insufficient to CHOOSE a score, do not submit one. `low` is for a defensible score under bounded uncertainty; it is not a way to submit a guess.",
    "See CONFIDENCE_DEFINITIONS in riskReviewConfidencePolicy for the canonical high/medium/low criteria. This packet deliberately does NOT suggest which value belongs to any Steakhouse dimension.",
  ],
  nextTransition: "Submitting at least one valid dimension score with rationale, confidence and evidence references transitions the product evidence_complete → partially_scored. Reading this packet transitions nothing.",
} as const;

/* ------------------------------------------------------------------ *
 * Non-transition guarantees
 * ------------------------------------------------------------------ */

/** Exported and fixture-asserted: assembling or displaying this packet changes no state. */
export const PACKET_PREPARATION_CONFERS = {
  lifecycleTransitioned: false,
  productState: "evidence_complete",
  scoreAssignmentState: "not_submitted",
  anyDimensionScored: false,
  aggregateCalculated: false,
  worksheetWritten: false,
  riskSignoffCompleted: false,
  productApproved: false,
  productionApprovedProductCount: 0,
  productionStableYieldCard: "absent",
  demo: "unchanged",
  note: "Preparing or displaying a scoring packet is not scoring. The packet is an input to a human decision that has not yet been made.",
} as const;

/** The canonical blank-block accessor. Returns copies so a caller cannot mutate the packet. */
export function getBlankScoringBlocks(): ScoringBlock[] {
  return SCORING_BLOCKS.map((b) => ({ ...b, score: null, rationale: null, confidence: null }));
}

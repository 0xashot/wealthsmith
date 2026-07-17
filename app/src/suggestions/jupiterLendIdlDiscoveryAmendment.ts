/**
 * jupiterLendIdlDiscoveryAmendment — Step 16H-R.1a. Corrects a MATERIAL ERROR in the 16H-R.1 package.
 *
 * THE ERROR
 * ---------
 * 16H-R.1 asserted: "the deployed instruction set cannot be enumerated by ANY available means."
 * That is FALSE. Jupiter publishes seven Anchor IDLs at github.com/jup-ag/jupiter-lend under
 * `target/idl/`, and they carry the LIVE program addresses.
 *
 * HOW I MISSED IT
 * ---------------
 * `developers.jup.ag/docs/lend/earn` links the repo. I requested that page, received a 301 redirect
 * notice, and PIVOTED TO THE API INSTEAD OF FOLLOWING THE REDIRECT. The evidence was one hop away.
 * I then built a package around the absence of a thing I had not finished looking for, and wrote
 * "any available means" — a universal claim earned by one unfinished search.
 *
 * This is the third time in this workstream that "did you check X?" surfaced a real gap
 * (kamino.com/docs/security moved oracle_risk 4→6; the KVault→KLend binary date; now this). The
 * pattern is identical: stop at the first page that says "no addresses here", then generalize.
 *
 * WHAT IS NOW KNOWN — the graph is 6 programs, not 2, ALL under ONE authority
 * --------------------------------------------------------------------------
 *   lending            jup3YeL8…  2026-07-03   ~14.5d   17 ix
 *   liquidity          jupeiUmn…  2026-07-16   ~1.4d    26 ix   ← holds ~428.6M USDC
 *   oracle             jupnw4B6…  2026-07-16   ~1.4d    15 ix   ← recorded as "not located"
 *   vaults             jupr81Yt…  2026-07-16   ~1.2d    34 ix   ← recorded as "not located"
 *   flashloan          jupgfSgf…  2026-07-03   ~14.5d    7 ix   ← recorded as "not located"
 *   reward_rate_model  jup7Tths…  2025-08-26   ~340d     9 ix   ← recorded as "not located"
 *
 * ALL SIX share upgrade authority 4MsgBB5… (4-of-8, 12h). One multisig controls the entire stack —
 * a far larger concentration than the "2 programs" I recorded. And liquidity, oracle AND vaults were
 * ALL redeployed on 2026-07-16: a coordinated whole-stack upgrade ~1.3 days before this amendment.
 *
 * A HYPOTHESIS I GOT WRONG, TOO
 * -----------------------------
 * I flagged `update_exchange_price` as the plausible admin lever for writing down lender claims. The
 * IDL shows its signer list is EMPTY — it is PERMISSIONLESS, an accrual crank, not an admin power.
 * Recorded because a scorer reading my earlier note would have been misled.
 *
 * WHAT STILL BLOCKS READINESS — now two narrow reasons, not "nothing is readable"
 * ------------------------------------------------------------------------------
 *   1. LOSS WATERFALL. An IDL gives instruction NAMES and account layouts, not LOGIC. No explicit
 *      write-down instruction appears in any of the 108 — but absence from a name list is NOT absence
 *      of a mechanism. In Fluid's design the share price can fall as bad debt reduces total assets,
 *      with no admin instruction involved. That must be read from source, and no Rust source is
 *      published (the repo ships IDLs, a TS SDK and CPI reference snippets only).
 *   2. INCIDENT SEARCH. Still too narrow to place an anchor. That is MY gap, not Jupiter's.
 *
 * STILL TRUE, AND UNCHANGED BY THIS AMENDMENT: neither live program is a verified build
 * (is_verified: false), the Code4rena commit maps to no live program, and the repo's last push
 * (2026-07-03) PREDATES the 2026-07-16 liquidity/oracle/vaults deployments by 13 days — so even the
 * IDLs may be stale against the binaries now holding funds.
 */
import { JUP_DIMENSION_EVIDENCE, JUP_PACKAGE_MANIFEST_HASH, type JupDimensionEvidence, type JupReadinessResult } from "./jupiterLendUsdcRiskEvidencePackage";

export const IDL_AMENDMENT_VERSION = "1.0.0" as const;
export const IDL_AMENDMENT_ID = "jupiter_lend_idl_discovery_amendment_v1" as const;

/** The erroneous claim, verbatim. NEVER delete. */
export const SUPERSEDED_UNREADABLE_CLAIM = {
  recordedAtStep: "16H-R.1",
  claims: [
    "the deployed instruction set cannot be enumerated by any available means",
    "no on-chain Anchor IDL exists — therefore no IDL exists",
    "the program graph is a LOWER BOUND of 2",
    "oracle, rewards, flash-loan and liquidation programs were NOT located on-chain",
    "the provider is unknown (oracle)",
  ],
  whyWrong:
    "Jupiter publishes seven Anchor IDLs at github.com/jup-ag/jupiter-lend/target/idl/, carrying the LIVE program addresses. The absence of an ON-CHAIN IDL was true; the generalization to 'no IDL by any means' was not.",
  howMissed:
    "developers.jup.ag/docs/lend/earn links the repo. I requested it, got a 301 redirect notice, and pivoted to the API instead of following the redirect. The evidence was one hop away.",
  errorClass: "universal_claim_from_an_unfinished_search",
  patternNote:
    "Third instance in this workstream: kamino.com/docs/security (moved oracle_risk 4→6), the KVault→KLend binary date, and now this. Each time: stop at the first page that says 'no addresses here', then generalize to 'does not exist'.",
} as const;

/* ------------------------------------------------------------------ *
 * 1. Corrected program graph
 * ------------------------------------------------------------------ */

export interface JupProgramNodeV2 {
  name: string;
  programId: string;
  idlPublished: boolean;
  idlAddressMatchesLive: boolean;
  instructionCount: number;
  deployedSlot: number;
  deployedAt: string;
  ageDaysAtAmendment: number;
  upgradeAuthority: string;
  supplierPrincipalDependsOnIt: boolean;
  wasLocatedAt16HR1: boolean;
}

export const CORRECTED_PROGRAM_GRAPH: JupProgramNodeV2[] = [
  { name: "lending", programId: "jup3YeL8QhtSx1e253b2FDvsMNC87fDrgQZivbrndc9", idlPublished: true, idlAddressMatchesLive: true, instructionCount: 17, deployedSlot: 430476341, deployedAt: "2026-07-03", ageDaysAtAmendment: 14.5, upgradeAuthority: "4MsgBB5VPoTrUSp5XnfbViV386C1UnsTdifLBw33ZMSJ", supplierPrincipalDependsOnIt: true, wasLocatedAt16HR1: true },
  { name: "liquidity", programId: "jupeiUmn818Jg1ekPURTpr4mFo29p46vygyykFJ3wZC", idlPublished: true, idlAddressMatchesLive: true, instructionCount: 26, deployedSlot: 433199003, deployedAt: "2026-07-16", ageDaysAtAmendment: 1.4, upgradeAuthority: "4MsgBB5VPoTrUSp5XnfbViV386C1UnsTdifLBw33ZMSJ", supplierPrincipalDependsOnIt: true, wasLocatedAt16HR1: true },
  { name: "oracle", programId: "jupnw4B6Eqs7ft6rxpzYLJZYSnrpRgPcr589n5Kv4oc", idlPublished: true, idlAddressMatchesLive: true, instructionCount: 15, deployedSlot: 433200855, deployedAt: "2026-07-16", ageDaysAtAmendment: 1.4, upgradeAuthority: "4MsgBB5VPoTrUSp5XnfbViV386C1UnsTdifLBw33ZMSJ", supplierPrincipalDependsOnIt: true, wasLocatedAt16HR1: false },
  { name: "vaults", programId: "jupr81YtYssSyPt8jbnGuiWon5f6x9TcDEFxYe3Bdzi", idlPublished: true, idlAddressMatchesLive: true, instructionCount: 34, deployedSlot: 433245735, deployedAt: "2026-07-16", ageDaysAtAmendment: 1.2, upgradeAuthority: "4MsgBB5VPoTrUSp5XnfbViV386C1UnsTdifLBw33ZMSJ", supplierPrincipalDependsOnIt: true, wasLocatedAt16HR1: false },
  { name: "flashloan", programId: "jupgfSgfuAXv4B6R2Uxu85Z1qdzgju79s6MfZekN6XS", idlPublished: true, idlAddressMatchesLive: true, instructionCount: 7, deployedSlot: 430476301, deployedAt: "2026-07-03", ageDaysAtAmendment: 14.5, upgradeAuthority: "4MsgBB5VPoTrUSp5XnfbViV386C1UnsTdifLBw33ZMSJ", supplierPrincipalDependsOnIt: true, wasLocatedAt16HR1: false },
  { name: "reward_rate_model", programId: "jup7TthsMgcR9Y3L277b8Eo9uboVSmu1utkuXHNUKar", idlPublished: true, idlAddressMatchesLive: true, instructionCount: 9, deployedSlot: 362668463, deployedAt: "2025-08-26", ageDaysAtAmendment: 340.2, upgradeAuthority: "4MsgBB5VPoTrUSp5XnfbViV386C1UnsTdifLBw33ZMSJ", supplierPrincipalDependsOnIt: false, wasLocatedAt16HR1: false },
];

export const GRAPH_FINDINGS_V2 = {
  materialProgramCount: 6,
  priorRecordedCount: 2,
  totalInstructions: 108,
  allShareOneUpgradeAuthority: true,
  sharedAuthority: "4MsgBB5VPoTrUSp5XnfbViV386C1UnsTdifLBw33ZMSJ",
  concentrationFinding:
    "ONE 4-of-8 multisig with a 12h timelock can upgrade ALL SIX programs — the liquidity layer holding ~428.6M USDC, the oracle that prices collateral, the vaults that liquidate, the flash-loan module, the lending accounting and the reward model. 16H-R.1 recorded this concentration across 2 programs; it spans 6.",
  coordinatedRedeployFinding:
    "liquidity (slot 433199003), oracle (433200855) and vaults (433245735) were ALL deployed on 2026-07-16 within ~46,700 slots (~5.4 hours) of each other — a coordinated whole-stack upgrade ~1.3 days before this amendment.",
  idlSourceRepo: "github.com/jup-ag/jupiter-lend",
  idlPath: "target/idl/*.json",
  idlVersionsObserved: "0.1.4 (lending, liquidity, oracle, vaults, flashloan); 0.1.0 (lending_reward_rate_model)",
  idlRepoLastPush: "2026-07-03T14:42:22Z",
  idlMayBeStaleAgainstLiveBinaries:
    "CRITICAL: the repo's last push (2026-07-03) PREDATES the 2026-07-16 liquidity/oracle/vaults deployments by 13 days. The IDLs match the live ADDRESSES but may not match the live BINARIES. An IDL in a repo is not a build attestation.",
  rustSourceNotPublished:
    "The repo ships IDLs, a TypeScript SDK and CPI reference snippets (references/earn/deposit.rs, references/borrow/operate.rs) — NOT the program source. Instruction LOGIC remains unreadable.",
} as const;

/* ------------------------------------------------------------------ *
 * 2. Privileged power map — now derivable
 * ------------------------------------------------------------------ */

export interface PowerEntry { program: string; instruction: string; signer: string; note: string }

/** Authority-gated powers, extracted from the published IDLs' signer lists. */
export const PRIVILEGED_POWERS_V2: PowerEntry[] = [
  { program: "liquidity", instruction: "pause_token", signer: "authority", note: "freezes a token market" },
  { program: "liquidity", instruction: "unpause_token", signer: "authority", note: "reverses a token pause" },
  { program: "liquidity", instruction: "pause_user", signer: "authority", note: "PER-USER FREEZE — an authority can pause an individual user. Kamino has no equivalent." },
  { program: "liquidity", instruction: "unpause_user", signer: "authority", note: "reverses a per-user pause" },
  { program: "liquidity", instruction: "update_user_withdrawal_limit", signer: "authority", note: "PER-USER WITHDRAWAL LIMIT — the dynamic limiter is individually addressable by an authority." },
  { program: "liquidity", instruction: "update_user_supply_config", signer: "authority", note: "per-user supply configuration" },
  { program: "liquidity", instruction: "update_user_class", signer: "authority", note: "per-user classification, affecting limits" },
  { program: "liquidity", instruction: "change_status", signer: "authority", note: "protocol status" },
  { program: "liquidity", instruction: "update_guardians", signer: "authority", note: "guardian set — a further authority layer whose powers were not mapped" },
  { program: "liquidity", instruction: "update_rate_data_v1", signer: "authority", note: "rate curve" },
  { program: "liquidity", instruction: "update_token_config", signer: "authority", note: "token configuration" },
  { program: "liquidity", instruction: "collect_revenue", signer: "authority", note: "revenue extraction" },
  { program: "vaults", instruction: "update_collateral_factor", signer: "authority", note: "collateral factor" },
  { program: "vaults", instruction: "update_liquidation_threshold", signer: "authority", note: "liquidation threshold" },
  { program: "vaults", instruction: "update_liquidation_penalty", signer: "authority", note: "liquidation penalty" },
  { program: "vaults", instruction: "update_oracle", signer: "authority", note: "AN AUTHORITY CAN SWAP THE ORACLE for a vault." },
  { program: "vaults", instruction: "update_borrow_fee", signer: "authority", note: "borrow fee" },
  { program: "vaults", instruction: "update_core_settings", signer: "authority", note: "core vault settings" },
  { program: "vaults", instruction: "update_supply_rate_magnifier", signer: "authority", note: "supply rate magnifier — directly affects lender yield" },
  { program: "flashloan", instruction: "pause_protocol", signer: "authority", note: "pauses flash loans" },
  { program: "flashloan", instruction: "set_flashloan_fee", signer: "authority", note: "flash-loan fee" },
  { program: "lending", instruction: "set_rewards_rate_model", signer: "signer", note: "rewards rate model" },
  { program: "lending", instruction: "update_rebalancer", signer: "signer", note: "rebalancer identity" },
  { program: "oracle", instruction: "update_chainlink_data_streams_cache_feeds", signer: "signer", note: "oracle feed set" },
  { program: "oracle", instruction: "update_chainlink_data_streams_cache_keepers", signer: "signer", note: "oracle KEEPER set — keepers push prices" },
];

/** Permissionless instructions — no signer. Correcting my own earlier hypothesis. */
export const PERMISSIONLESS_INSTRUCTIONS = [
  { program: "liquidity", instruction: "update_exchange_price", note: "SIGNER LIST IS EMPTY — permissionless. 16H-R.1 speculated this was 'the plausible lever' for writing down lender claims. IT IS NOT AN ADMIN POWER; it is an accrual crank. Recorded because a scorer reading that speculation would have been misled." },
  { program: "lending", instruction: "update_rate", note: "permissionless rate crank" },
  { program: "vaults", instruction: "liquidate", note: "signer is a generic `signer` — a permissionless keeper role, not an authority" },
] as const;

export const NO_EXPLICIT_WRITE_DOWN_INSTRUCTION = {
  searchedAllSixIdls: true,
  totalInstructionsSearched: 108,
  explicitWriteDownFound: false,
  doNotConcludeAbsence:
    "Absence from an instruction NAME LIST is NOT absence of a mechanism. In Fluid's design the lender share price can fall as bad debt reduces total assets, with no admin instruction involved at all. An IDL cannot show that — it carries names and account layouts, not logic.",
  contrastWithKamino:
    "Kamino's socialize_loss is an explicit instruction whose has_one lending_market_owner constraint was READ FROM DEPLOYED RUST. The equivalent question for Jupiter cannot be answered from an IDL, and no Rust source is published.",
  stillBlocksReadiness: true,
} as const;

/* ------------------------------------------------------------------ *
 * 3. Oracle surface — now partially resolved
 * ------------------------------------------------------------------ */

export const ORACLE_SURFACE_V2 = {
  priorClaim: "the provider is unknown",
  corrected: true,
  oracleProgram: "jupnw4B6Eqs7ft6rxpzYLJZYSnrpRgPcr589n5Kv4oc",
  oracleProgramDeployedAt: "2026-07-16",
  providerEvidence: "IDL instruction names: refresh_price_feed_with_chainlink, init_chainlink_data_streams_cache, update_chainlink_data_streams_cache_feeds, update_chainlink_data_streams_cache_keepers, chainlink_data_streams_feed_access_controller",
  primaryProvider: "Chainlink Data Streams",
  keeperDependency: "PRESENT — prices are pushed via a cache refreshed by keepers, and an authority can change the keeper set (update_chainlink_data_streams_cache_keepers). A keeper-push model has a liveness dependency a pull-oracle does not.",
  additionalPricingPath: "init_dex_peg_oracle_config — a DEX-peg oracle configuration path exists alongside Chainlink.",
  oracleIsSwappablePerVault: "vaults.update_oracle is authority-gated — an authority can point a vault at a different oracle.",
  stillUnresolved: [
    "per-feed max age, deviation thresholds, confidence intervals and fallback behavior — these are LOGIC, not names, and are not in the IDL",
    "which feeds back which collateral",
    "behavior when a feed is stale or a keeper stops",
    "the DEX-peg path's scope and when it applies",
  ],
  usdcPricingStillUnresolved: true,
  materialityNote:
    "This is a genuine improvement over 16H-R.1's 'neither side resolved': the provider, the program, the keeper dependency and the swap power are now known. The parameters are not.",
} as const;

/* ------------------------------------------------------------------ *
 * 4. Dimension reclassification
 * ------------------------------------------------------------------ */

export interface Reclassification {
  dimensionId: string;
  weight: number;
  priorReadiness: string;
  priorScoreable: boolean;
  newReadiness: "complete" | "partial" | "weak" | "insufficient";
  newScoreable: boolean;
  reason: string;
}

export const RECLASSIFICATIONS: Reclassification[] = [
  {
    dimensionId: "audit_security", weight: 15,
    priorReadiness: "insufficient", priorScoreable: false,
    newReadiness: "weak", newScoreable: true,
    reason: "An anchor CAN now be placed. The facts are known and unfavorable: audits exist with known scope (Code4rena 15,195 nSLoC across 6 modules; Zenith; Offside), NO live program is a verified build, the audited commit maps to no live program, no Rust source is published, and the IDL repo predates the live binaries by 13 days. That is a complete enough picture to score in the `weak` band without inventing a fact. 16H-R.1's 'cannot select an anchor' rested on the false premise that nothing was readable.",
  },
  {
    dimensionId: "manager_discretion", weight: 12,
    priorReadiness: "insufficient", priorScoreable: false,
    newReadiness: "partial", newScoreable: true,
    reason: "The privileged-power map is now derivable from 108 IDL instructions with signer lists. The surface is large and includes per-user pause, per-user withdrawal limits, oracle swap, collateral factor, liquidation threshold/penalty and supply-rate magnifier — all authority-gated, all under one 4-of-8. A scorer can place an anchor. What remains unresolved is instruction LOGIC, which caps confidence, not scoreability.",
  },
  {
    dimensionId: "oracle_risk", weight: 8,
    priorReadiness: "insufficient", priorScoreable: false,
    newReadiness: "partial", newScoreable: true,
    reason: "Provider (Chainlink Data Streams), program, keeper dependency, DEX-peg path and the authority-gated oracle-swap power are all now known. Per-feed parameters and collateral mapping remain unresolved, which caps confidence at low but does not prevent an anchor.",
  },
  {
    dimensionId: "incident_history", weight: 2,
    priorReadiness: "insufficient", priorScoreable: false,
    newReadiness: "insufficient", newScoreable: false,
    reason: "UNCHANGED and still blocking. The search remains too narrow to place an anchor. This is MY evidence gap, not Jupiter's — and it is honest to keep it insufficient rather than let a reclassification wave carry it along.",
  },
];

export const RECLASSIFIED_DIMENSIONS: JupDimensionEvidence[] = JUP_DIMENSION_EVIDENCE.map((d) => {
  const r = RECLASSIFICATIONS.find((x) => x.dimensionId === d.dimensionId);
  return r ? { ...d, readiness: r.newReadiness, scoreable: r.newScoreable } : d;
});

/**
 * MANDATORY ARTIFACTS — independent of dimension scoreability.
 *
 * The task's section 13 makes the supplier loss waterfall mandatory for readiness. A dimension-only
 * scan does NOT enforce that: every dimension could be scoreable while the waterfall is still unread.
 * Readiness must therefore be gated on BOTH conditions, or the gate leaks.
 */
export const MANDATORY_ARTIFACTS = [
  { id: "loss_waterfall", resolved: false, why: "Section 13 makes it mandatory. No Rust source is published; an IDL carries names, not logic. No explicit write-down instruction appears in 108 instructions, but absence from a name list is not absence of a mechanism." },
] as const;

export function evaluateReadinessV2(dims: JupDimensionEvidence[] = RECLASSIFIED_DIMENSIONS, mandatory: readonly { id: string; resolved: boolean }[] = MANDATORY_ARTIFACTS): JupReadinessResult {
  const complete = dims.filter((d) => d.readiness === "complete" && d.scoreable).map((d) => d.dimensionId);
  const partial = dims.filter((d) => (d.readiness === "partial" || d.readiness === "weak") && d.scoreable).map((d) => d.dimensionId);
  const insufficient = dims.filter((d) => !d.scoreable).map((d) => d.dimensionId);
  const unresolvedMandatory = mandatory.filter((m) => !m.resolved).map((m) => m.id);
  const ready = insufficient.length === 0 && unresolvedMandatory.length === 0;
  return {
    readiness: ready ? "ready_for_automated_assessment" : "not_ready_for_automated_assessment",
    completeDimensions: complete,
    partialButScoreableDimensions: partial,
    insufficientDimensions: insufficient,
    blockingArtifacts: [
      ...unresolvedMandatory.map((m) => `MANDATORY ARTIFACT UNRESOLVED: ${m} — blocks readiness independently of dimension scoreability`),
      "LOSS WATERFALL unresolved — no Rust source published; an IDL carries names, not logic. Section 13 makes this mandatory.",
      "INCIDENT SEARCH too narrow to place an anchor (my gap, not Jupiter's)",
      "no verified build for any of the 6 live programs",
      "IDL repo last push 2026-07-03 predates the 2026-07-16 liquidity/oracle/vaults deployments by 13 days",
    ],
  };
}

export const READINESS_V2 = evaluateReadinessV2();

export const READINESS_V2_RATIONALE = {
  priorReadiness: "not_ready_for_automated_assessment",
  newReadiness: READINESS_V2.readiness,
  verdictUnchanged: true,
  butTheReasoningWasWrong:
    "The verdict survives, but 16H-R.1 reached it for a substantially false reason. It said four dimensions (37% of weight) were unscoreable because nothing could be read. Three of those four are now scoreable. The package is not ready on TWO narrow grounds — the loss waterfall needs source, and my incident search was too shallow — not because Jupiter's evidence does not exist.",
  whyThisCorrectionMattersEvenThoughTheVerdictHeld:
    "A reader of 16H-R.1 would conclude Jupiter is unassessable. It is not. It is assessable on 10 of 12 dimensions, and the honest blockers are one genuine source gap and one gap of my own making. Leaving the original reasoning in place would have understated Jupiter on a false basis — the mirror image of inflating it.",
  readinessIsGatedOnTwoConditions:
    "Readiness now requires BOTH every dimension scoreable AND every mandatory artifact resolved. A dimension-only scan would return `ready` once incident_history were fixed, while the loss waterfall remained unread — the gate would leak. This was a defect in the first version of this amendment's own logic, caught before it shipped.",
  didNotOvercorrect:
    "incident_history was NOT reclassified. A reclassification wave is exactly where an over-correction would hide, and that dimension's evidence did not improve.",
  scoresStillNotAssigned: true,
} as const;

/* ------------------------------------------------------------------ *
 * 5. Evidence + manifest
 * ------------------------------------------------------------------ */

export const IDL_AMENDMENT_EVIDENCE = {
  evidenceId: IDL_AMENDMENT_ID,
  version: IDL_AMENDMENT_VERSION,
  step: "16H-R.1a",
  candidateId: "jupiter_lend_usdc",
  amendsPackage: "jupiter_lend_usdc_risk_evidence_package_v1",
  amendsManifest: JUP_PACKAGE_MANIFEST_HASH,
  preparerId: "claude_automated_evidence_preparer",
  preparationRole: "evidence_preparer" as const,
  preparerIsNotScorer: true,
  evidenceTimestamp: "2026-07-17T12:55:00.000Z",
  observedAtSlot: 433487184,
  sourcesAdded: ["https://developers.jup.ag/docs/lend/earn", "https://github.com/jup-ag/jupiter-lend", "target/idl/*.json (7 IDLs)"],
  sourceCheckedAndEmpty: "https://support.jup.ag/ — contains NO Jupiter Lend security, audit, risk, admin or emergency-power content. Checked and recorded as empty rather than left unchecked.",
  whatChanged: [
    "Program graph corrected 2 → 6 live programs, all IDL-published at matching live addresses.",
    "All 6 share ONE upgrade authority (4MsgBB5…, 4-of-8, 12h) — a far larger concentration than recorded.",
    "liquidity, oracle and vaults were ALL redeployed 2026-07-16 within ~5.4 hours — a coordinated stack upgrade.",
    "Privileged-power map built from 108 instructions; per-user pause and per-user withdrawal limits found.",
    "update_exchange_price corrected: PERMISSIONLESS, not an admin write-down lever as 16H-R.1 speculated.",
    "Oracle provider identified: Chainlink Data Streams, keeper-dependent, plus a DEX-peg path.",
    "audit_security, manager_discretion and oracle_risk reclassified to scoreable; incident_history deliberately NOT.",
  ],
  whyItChanged: "16H-R.1 claimed the instruction set could not be enumerated by any available means. Seven official IDLs at live addresses disprove it.",
  historyRewritten: false,
  invalidationTriggers: [
    "any of the 6 programs is upgraded (3 were redeployed 1.3 days ago — this stack moves fast)",
    "the IDL repo is updated or diverges further from the live binaries",
    "a verified build or Rust source is published",
    "the shared upgrade authority or its Squads config changes",
  ],
} as const;

export function computeIdlAmendmentHash(e: typeof IDL_AMENDMENT_EVIDENCE = IDL_AMENDMENT_EVIDENCE): string {
  const material = JSON.stringify({
    id: e.evidenceId, v: e.version, s: e.step, c: e.candidateId,
    g: CORRECTED_PROGRAM_GRAPH.map((p) => p.programId), ix: GRAPH_FINDINGS_V2.totalInstructions,
    r: READINESS_V2.readiness, slot: e.observedAtSlot,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `jup_idl_amendment_${h.toString(16).padStart(8, "0")}`;
}

export const IDL_AMENDMENT_HASH = computeIdlAmendmentHash();

export const IDL_AMENDMENT_CONFERS = {
  confers: ["a corrected 6-program graph", "a derivable privileged-power map", "a partially resolved oracle surface", "three reclassified dimensions"],
  doesNotConfer: [
    "a risk score", "an aggregate", "readiness", "human review", "risk signoff", "product approval",
    "selector eligibility", "recommendation eligibility", "a production card", "execution",
    "proof that the IDL matches the deployed binary",
  ],
  scoresAssigned: false,
  aggregateCalculated: false,
  readinessStillNotReady: true,
  idlIsNotAVerifiedBuild: "An IDL published in a repo is not a build attestation and is not source. It gives the instruction surface; it does not prove what the binary does.",
  kaminoAssessmentChanged: false,
  addedToSelectorEligibility: false,
  transactionConstructedOrSimulated: false,
} as const;

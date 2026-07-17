/**
 * incidentMarketAliasAmendment — Step 16H-O.2. Corrects a MARKET IDENTITY error in the Steakhouse
 * incident-history evidence, and binds the corrected market evidence to the direct USDC reserve.
 *
 * THE ERROR
 * ---------
 * Official Kamino stress-event material names markets by DISPLAY LABEL and never prints an address.
 * 16H-L.2 read "Main" (named in the Feb 2026 case study) as a market distinct from this vault's
 * "SOL/BTC Market" allocation, and concluded the official record covered 10.95% of allocation.
 *
 * They are the same account: 7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF.
 *
 * The arithmetic was right; the IDENTITY was wrong. Corrected coverage is 98.56%.
 *
 * WHY THE ORIGINAL ERROR WAS REASONABLE
 * -------------------------------------
 * Nothing in the case study revealed that "Main" had been relabelled, and refusing to equate two
 * different labels without proof was the CORRECT default. The fix was to find the rename evidence —
 * not to have assumed it. This amendment records that, rather than treating the prior step as sloppy.
 *
 * WHAT DID NOT CHANGE, AND WHY THAT IS THE POINT
 * ----------------------------------------------
 * The score stays 4 / low and the aggregate stays 5.37. Coverage was never the binding constraint.
 * 16H-L.2 listed FOUR scope gaps, "each fatal on its own"; this corrects exactly ONE:
 *
 *   1. WRONG SUBJECT      — $0 bad debt is about LENDING MARKETS, not this VAULT      → STANDS
 *   2. PROGRAM UNCOVERED  — no kvault incident review exists anywhere located          → STANDS
 *   3. DOMINANT MARKET UNCOVERED                                                       → CORRECTED
 *   4. STALE FOR BINARY   — no published review postdates the 2026-07-14 deployment    → STANDS
 *
 * High coverage of EXPOSURE is not coverage of the PRODUCT. A coverage percentage rising is a
 * statement about how much was LOOKED AT, never about what was found.
 *
 * STRICTLY AN EVIDENCE AMENDMENT. No score is assigned here, no review is performed, nothing renders.
 */
import { MARKET_ALIAS_MAPPING, SUPERSEDED_COVERAGE_CALCULATION, OFFICIAL_EVENT_MARKET_COVERAGE } from "./steakhouseIncidentEvidence";

export const ALIAS_AMENDMENT_VERSION = "1.0.0" as const;
export const ALIAS_AMENDMENT_ID = "incident_market_alias_amendment_v1" as const;

export const MAIN_MARKET_ALIAS = MARKET_ALIAS_MAPPING[0];

/** Address-first identity rule. The label is evidence of nothing on its own. */
export const IDENTITY_RULE = {
  bindBy: "exact market address",
  neverBindBy: ["display label alone", "matching assets", "similar descriptions", "protocol membership"],
  renameIsPossibleBecause: "LendingMarket.name is a MUTABLE field on a STABLE account — a rename is a config update, never a new market.",
  whyLabelsMisled: "Official stress-event material names markets by label and prints no address, so a relabel is invisible in the source material.",
} as const;

export const COVERAGE_CORRECTION = {
  priorCoveredPct: SUPERSEDED_COVERAGE_CALCULATION.coveredAllocationPct,
  priorUncoveredPct: SUPERSEDED_COVERAGE_CALCULATION.uncoveredAllocationPct,
  correctedCoveredPct: OFFICIAL_EVENT_MARKET_COVERAGE.coveredAllocationPct,
  correctedUncoveredPct: OFFICIAL_EVENT_MARKET_COVERAGE.uncoveredAllocationPct,
  derivation: "SOL/BTC 87.61 (named as 'Main') + JLP 10.29 + Bitcoin 0.66 = 98.56; Maple 1.44 uncovered; total 100.00",
  allocationSnapshot: "the same slot-bound snapshot used by the current Steakhouse assessment (unchanged — no fresher snapshot was taken, so the correction is attributable to identity alone)",
  mapleRemainsUncovered: true,
  mapleRationale: "Maple Market is not a KLend stress-event market and is named in no official event material. Coverage can therefore never reach 100%, and the residual is a real gap rather than a rounding artifact.",
  coverageCannotReach100: true,
  priorResultPreserved: true,
  priorResultLocation: "steakhouseIncidentEvidence.SUPERSEDED_COVERAGE_CALCULATION",
} as const;

/** The conversions this correction must never license. Each has a specific tempting inference. */
export const FORBIDDEN_INFERENCES = {
  coverageIsNotSafety: "98.56% coverage says the official reports SPEAK TO that much exposure. It says nothing about whether that exposure is safe.",
  zeroBadDebtIsNotZeroIncidents: "$0 bad debt in named events is a narrow accounting claim. It is NOT zero incidents, NOT zero exploits, NOT 'the vault is incident-free', and NOT a statement that future losses cannot occur.",
  klendEvidenceIsNotKvaultEvidence: "The stress-event material covers KLend lending markets. This product is a VAULT on the separate kvault program (KvauGMsp…). KLend coverage does not transfer to kvault.",
  zeroConfirmedIncidentsIsASearchResult: "PRESERVED VERBATIM FROM PRIOR EVIDENCE: zero confirmed incidents is a SEARCH RESULT, not a clean record. Every negative is a statement about what was searched, never about what happened.",
  uncoveredIsNotAdverse: "The uncovered 1.44% means UNEXAMINED, not that anything went wrong there.",
  higherCoverageDoesNotRaiseScores: "A coverage percentage is a scope description. It is not a risk weight and not a score input.",
} as const;

export const SCOPE_GAP_STATUS = {
  corrected: [
    { gap: 3, name: "dominant market uncovered", correctedAt: "16H-O.2", reason: "'Main' and 'SOL/BTC Market' are the same account 7u3He…, so the dominant 87.61% IS named." },
  ],
  standing: [
    { gap: 1, name: "wrong subject", detail: "$0 bad debt is a claim about BAD DEBT in LENDING MARKETS. This product is a VAULT on a separate program. It is not a claim of no security, withdrawal, allocation, oracle, administrative or operational incident — which is what was asked." },
    { gap: 2, name: "the program is uncovered", detail: "No kvault postmortem exists in the docs; a governance-forum search for 'kvault' returns NO topics." },
    { gap: 4, name: "stale for this binary", detail: "Last documented event 2026-02-05/06; most recent monthly risk report April 2026. The deployed binary is from 2026-07-14. No published review postdates the code holding user funds." },
  ],
  rubricBlockerStillPresent: true,
  rubricBlocker: "no sourced incident review exists for this product",
  eachStandingGapIsFatalAlone: true,
} as const;

export const STEAKHOUSE_SCORE_OUTCOME = {
  dimensionId: "incident_history",
  priorScore: 4,
  resultingScore: 4,
  priorConfidence: "low",
  resultingConfidence: "low",
  anchorBandUnchanged: "weak",
  weightUnchanged: 2,
  scoreChanged: false,
  confidenceChanged: false,
  whyUnchanged:
    "The anchor did not move. Coverage was never the binding constraint — the rubric blocker turns on whether a sourced incident review exists FOR THIS PRODUCT, and gaps 1, 2 and 4 leave it standing. Raising the score because a scope percentage improved would be scoring the search, not the evidence.",
  confidenceRationale: "Retained low: product, program and binary scope all remain unresolved.",
  priorAggregate: 5.37,
  resultingAggregate: 5.37,
  aggregateRecalculated: false,
  meetsMinimum: false,
  minimumThreshold: 7,
  newAssessmentVersionCreated: false,
  assessmentVersionsPreserved: ["1.0.0", "1.1.0"],
  correctionMechanism: "evidence/rationale amendment only — no score changed, so no new immutable assessment version was minted",
  thresholdTargeting: false,
  thresholdTargetingNote: "No attempt was made to move 5.37 toward the floor of 7. The aggregate is an output, never a target.",
  otherDimensionsUnchanged: true,
  otherDimensions: [
    "audit_security", "maturity", "upgrade_admin_authority", "manager_discretion", "strategy_complexity",
    "composability_dependency", "oracle_risk", "liquidity_withdrawal", "asset_stablecoin_risk",
    "withdrawal_fee_transparency", "operational_dependency_risk",
  ],
} as const;

/* ------------------------------------------------------------------ *
 * Direct-reserve incident evidence (NOT scored here)
 * ------------------------------------------------------------------ */

/**
 * The corrected market evidence, bound to the exact direct USDC reserve. This is an INPUT to that
 * candidate's later automated assessment. No score is assigned in this task.
 *
 * The direct reserve's position differs materially from Steakhouse's: it lives IN the covered market
 * rather than allocating into it, so gaps 1 and 2 (wrong subject / kvault uncovered) do NOT apply —
 * the $0-bad-debt claim is about exactly this layer. Gap 4 and the socialize-loss scope still do.
 */
export const DIRECT_RESERVE_INCIDENT_EVIDENCE = {
  candidateId: "kamino_usdc_lending",
  marketName: "SOL/BTC Market",
  marketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
  reserveAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  klendProgram: "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",

  exactMarketIsNamedInOfficialMaterial: true,
  namedAs: "Main",
  aliasEvidence: "see MAIN_MARKET_ALIAS — same account, renamed label, high-not-absolute confidence",
  officialEventsCoveringThisMarket:
    "The Feb 2026 case study's market breakdown names Main (= this market). The 'Track Record' section claims $0 bad debt since November 2023 across all protocol markets, across 5 named stress events (Feb 2025 → Feb 2026).",

  whatZeroBadDebtEstablishes:
    "That in the named events, Kamino's official material reports no bad debt in the lending markets — including this one — and that the protocol continued operating without service degradation.",
  whatZeroBadDebtDoesNotEstablish: [
    "that no security, withdrawal, oracle, administrative or operational incident occurred",
    "that no exploit occurred",
    "that this exact reserve is incident-free",
    "that future losses cannot occur",
    "anything about the deployed binary currently holding funds",
  ],

  whyGapsOneAndTwoDoNotApplyHere:
    "Steakhouse's fatal gaps 1 and 2 were 'wrong subject' (a vault, not a lending market) and 'the kvault program is uncovered'. The direct reserve IS a lending-market reserve in the covered market on the covered program, so the official claim speaks to its layer directly. That is a MATERIAL difference from Steakhouse and must not be flattened when this candidate is assessed.",

  reserveExistedDuringEvents: "UNRESOLVED — no dated snapshot binding this reserve address to each event window was located. The market is named; the RESERVE's existence and configuration at each event date were not verified.",
  usdcSupplyExposedDuringEvents: "UNRESOLVED — not verified for any event window.",
  currentMarketOwnerPeriod: "market owner 24LjDBukaUSHgPowcF2wY1XscnhChcBUDETN2UhBZMMT observed at slot 433468686. The period over which this owner has held the role was NOT established, so official statements cannot be attributed to a known administrative regime.",
  socializeLossSearchScope:
    "Carried from prior evidence: socialize_loss requires lending_market_owner (has_one), NOT the emergency council. No socialize_loss history search bound to this exact reserve was completed.",

  remainingGaps: [
    "no incident-history coverage for the deployed binary (gap 4 applies here too)",
    "reserve existence/configuration during each named event unverified",
    "USDC supply exposure during each event unverified",
    "market-owner period unestablished",
    "socialize_loss history for this exact reserve unsearched",
  ],
  incidentHistoryReadiness: "partial" as const,
  readinessRationale:
    "The exact market IS covered by official named stress-event material — materially stronger than Steakhouse's position — but event-window binding, binary currency and socialize-loss scope remain open. Sufficient to feed an assessment; NOT sufficient to conclude a clean record.",
  scoreAssigned: false,
  scoreAssignedNote: "No direct-reserve incident_history score is assigned in this task. This evidence is an INPUT to its later automated assessment.",
} as const;

export const ALIAS_AMENDMENT_EVIDENCE = {
  evidenceId: ALIAS_AMENDMENT_ID,
  version: ALIAS_AMENDMENT_VERSION,
  step: "16H-O.2",
  preparerId: "claude_automated_evidence_preparer",
  preparerRole: "automated_evidence_preparer",
  preparerIsNotHumanReviewer: true,
  evidenceTimestamp: "2026-07-17T11:05:00.000Z",
  marketAddress: MAIN_MARKET_ALIAS.marketAddress,
  identityConclusion: MAIN_MARKET_ALIAS.identityConclusion,
  identityConfidence: MAIN_MARKET_ALIAS.confidence,
  sourceCutoff: "official material through the Feb 2026 case study and the April 2026 monthly risk report (published 2026-05-05)",
  whyMainWasTreatedAsDistinct:
    "Official stress-event material names markets by display label and prints no address. Nothing in it revealed that 'Main' had been relabelled to 'SOL/BTC Market', and refusing to equate two different labels without proof was the correct default.",
  whatChanged: [
    "Established Main ≡ SOL/BTC Market at 7u3He… from three independent official strands.",
    "Coverage corrected 10.95% → 98.56%; uncovered 89.05% → 1.44% (Maple only).",
    "Prior calculation preserved at SUPERSEDED_COVERAGE_CALCULATION — not overwritten.",
    "Closure gap 3 corrected; gaps 1, 2 and 4 preserved.",
    "incident_history limitingFact + rationale corrected; score 4, confidence low, aggregate 5.37 all retained.",
    "Corrected market evidence bound to the direct USDC reserve as an assessment input.",
  ],
  whyItChanged: "The recorded coverage figure rested on a market-identity error. The headline number was wrong; the conclusion it supported was right for reasons that survive the correction.",
  limitations: [MAIN_MARKET_ALIAS.limitation],
  invalidationTriggers: [
    "Kamino renames the market again or publishes an address-bound historical market registry",
    "the allocation snapshot changes (coverage is slot-bound and must be recomputed, not cached)",
    "an official kvault-specific incident review is published (would touch gap 2)",
    "a published review postdates the deployed binary (would touch gap 4)",
    "the isPrimary designation moves to a different address",
  ],
} as const;

export function computeAliasAmendmentManifestHash(e: typeof ALIAS_AMENDMENT_EVIDENCE = ALIAS_AMENDMENT_EVIDENCE): string {
  const material = JSON.stringify({
    id: e.evidenceId, v: e.version, s: e.step, m: e.marketAddress,
    c: e.identityConclusion, cf: e.identityConfidence, cut: e.sourceCutoff,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `incident_alias_evidence_${h.toString(16).padStart(8, "0")}`;
}

export const ALIAS_AMENDMENT_MANIFEST_HASH = computeAliasAmendmentManifestHash();

export const AMENDMENT_CONFERS = {
  confers: ["corrected market identity", "corrected coverage scope", "direct-reserve incident evidence as an assessment input"],
  doesNotConfer: [
    "a safety finding", "a score change", "a new assessment version", "human review", "risk signoff",
    "product approval", "recommendation eligibility", "Top Pick", "a production card", "execution",
    "a direct-reserve score",
  ],
  humanReviewRemains: "awaiting_reviewer",
  signoffOccurred: false,
  productApproved: false,
  recommendationBehaviourChanged: false,
  cardRendered: false,
  executionBehaviourChanged: false,
  directReserveScoreAssigned: false,
  otherDimensionsChanged: false,
  demoChanged: false,
  testingPresentationChanged: false,
  solStakingChanged: false,
} as const;

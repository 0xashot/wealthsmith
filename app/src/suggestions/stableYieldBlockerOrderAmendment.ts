/**
 * stableYieldBlockerOrderAmendment — Step 16H-N.5a. Records the correction to the Stable Yield
 * evidence-state vocabulary and its deterministic blocker ordering.
 *
 * WHAT WAS WRONG
 * --------------
 * `StableYieldEvidencePrimaryStatus` had no `blocked_deposit_availability` and no
 * `blocked_constraints`. `primaryBlocker` is meant to name the NEAREST unresolved prerequisite, but a
 * candidate whose nearest gap was deposit availability had no way to say so. 16H-N.4 and 16H-N.5 both
 * hit this, reported it rather than inventing an enum member, and fell back to `blocked_risk_review` —
 * genuinely unresolved, but two stages farther away than the real next piece of work.
 *
 * The effect was that the manifest under-described what was actually needed next: a reader would
 * conclude the product was waiting on a risk reviewer, when it is in fact waiting on an unanswered
 * question about whether a deposit is possible at all.
 *
 * WHAT THIS IS NOT
 * ----------------
 * A vocabulary correction. NOTHING was investigated, resolved, or made more eligible:
 *   • no deposit-availability evidence was gathered
 *   • no constraints evidence was gathered
 *   • risk review remains entirely unresolved
 *   • the candidate is no closer to approval than before this step
 *
 * A blocker does not become resolved because a word for it now exists. If anything this step makes the
 * manifest report a NEARER blocker than it did yesterday — the product is described as less ready, not
 * more.
 *
 * STRICTLY A STATE-MODEL CHANGE. No transaction, no execution, no presentation.
 */
import {
  STABLE_YIELD_BLOCKER_ORDER,
  NON_SEQUENTIAL_PRIMARY_STATUSES,
  STABLE_YIELD_EVIDENCE_MANIFEST_VERSION,
  SUPERSEDED_MANIFEST_VERSIONS,
  blockerRank,
  type StableYieldEvidencePrimaryStatus,
} from "./stableYieldProductionEvidence";

export const BLOCKER_ORDER_AMENDMENT_VERSION = "1.0.0" as const;
export const BLOCKER_ORDER_AMENDMENT_ID = "stable_yield_blocker_order_amendment_v1" as const;

/* ------------------------------------------------------------------ *
 * 1. Vocabulary change
 * ------------------------------------------------------------------ */

/** The exact vocabulary before this step — manifest schema 1.0.0. Recorded so the change is auditable. */
export const PRIOR_PRIMARY_STATUS_VOCABULARY = [
  "ready_for_approval_review",
  "blocked_identity",
  "blocked_source_schema",
  "blocked_apy_unit",
  "blocked_freshness",
  "blocked_capacity",
  "blocked_risk_review",
  "blocked_position_detection",
  "unsupported_for_mvp",
  "archived",
] as const;

export const ADDED_PRIMARY_STATUSES = ["blocked_deposit_availability", "blocked_constraints"] as const;

/** Names deliberately NOT added, each with the reason. Absence here is a decision, not an oversight. */
export const DELIBERATELY_NOT_ADDED = {
  blocked_approval:
    "The step's suggested order named it, but the repository has no such state and its terminal is `ready_for_approval_review`. Approval is a separate reviewed DECISION, not a blocker stage; adding it would imply this file can record approval, which it explicitly cannot.",
  ready: "Not a repository name. The existing terminal is `ready_for_approval_review`, which was reused verbatim.",
  blocked_availability: "Too generic — it would blur the deposit/withdrawal distinction the product model keeps separate.",
  blocked_withdrawal_availability:
    "Not added as a PRIMARY state. The candidate field is `depositAvailabilityState`; there is no matching withdrawal field, so a withdrawal primary state would have nothing to derive from. Withdrawal accessibility is tracked through exitEvidenceState and the buffer-recognition path. If the architecture later gains a withdrawal field, revisit — do not pre-build for it.",
  transitional_aliases: "None. Duplicate aliases make two names for one truth and guarantee they drift apart.",
} as const;

export const SCHEMA_VERSION_CHANGE = {
  priorVersion: "1.0.0",
  newVersion: STABLE_YIELD_EVIDENCE_MANIFEST_VERSION,
  changeKind: "additive_widening",
  supersededVersionsStillReadable: SUPERSEDED_MANIFEST_VERSIONS,
  compatibilityBehaviour:
    "Every status valid under 1.0.0 remains valid under 1.1.0 — nothing was removed or renamed. `StableYieldEvidenceManifestVersion` accepts both, so stored 1.0.0 values stay readable and need no migration. No schema-migration framework was invented for a two-member widening.",
  whyMinorNotMajor: "Additive only. A major bump would signal a breaking change that did not happen.",
} as const;

/* ------------------------------------------------------------------ *
 * 2. Ordering
 * ------------------------------------------------------------------ */

export const ORDERING_RATIONALE = {
  principle: "primaryBlocker names the NEAREST unresolved prerequisite. Earlier stages gate later ones.",
  order: STABLE_YIELD_BLOCKER_ORDER,
  insertionPoints: {
    blocked_deposit_availability: "after blocked_position_detection, before blocked_constraints — capacity and detection are both facts ABOUT the product; deposit availability is the first question about whether an action is possible at all.",
    blocked_constraints: "after blocked_deposit_availability, before blocked_risk_review — minimums/maximums only matter once depositing is possible.",
  },
  nonSequential: NON_SEQUENTIAL_PRIMARY_STATUSES,
  nonSequentialRationale:
    "`unsupported_for_mvp` and `archived` are dispositions, not stages. A candidate in either is not working through prerequisites, so ranking them against the sequence would be meaningless. They are excluded rather than assigned an arbitrary position.",
  noBlockedApproval: "There is no `blocked_approval`. See DELIBERATELY_NOT_ADDED.",
} as const;

/**
 * Check that a manifest's recorded `primaryBlocker` is the NEAREST unresolved stage among the stages
 * a caller reports as still blocked.
 *
 * This is a VALIDATOR, not a mutator. It never rewrites a manifest: a manifest is evidence, and
 * evidence is corrected deliberately with a recorded reason, never silently by a helper.
 */
export function validatePrimaryBlockerIsNearest(
  recorded: StableYieldEvidencePrimaryStatus,
  unresolvedStages: StableYieldEvidencePrimaryStatus[],
): { ok: boolean; nearest?: StableYieldEvidencePrimaryStatus; detail?: string } {
  if ((NON_SEQUENTIAL_PRIMARY_STATUSES as readonly string[]).includes(recorded)) {
    return { ok: true, detail: `${recorded} is a disposition, not a stage — ordering does not apply` };
  }
  const ranked = unresolvedStages
    .map((s) => ({ s, r: blockerRank(s) }))
    .filter((x): x is { s: StableYieldEvidencePrimaryStatus; r: number } => x.r !== undefined)
    .sort((a, b) => a.r - b.r);
  if (ranked.length === 0) return { ok: true, detail: "no unresolved sequential stages reported" };
  const nearest = ranked[0].s;
  if (recorded !== nearest) {
    return { ok: false, nearest, detail: `recorded primary ${recorded} is farther than the nearest unresolved stage ${nearest}` };
  }
  return { ok: true, nearest };
}

/* ------------------------------------------------------------------ *
 * 3. Affected candidate
 * ------------------------------------------------------------------ */

export const AFFECTED_CANDIDATE = {
  candidateId: "kamino_usdc_lending",
  marketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
  reserveAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  previousPrimaryBlocker: "blocked_risk_review",
  correctedPrimaryBlocker: "blocked_deposit_availability",
  correctionKind: "vocabulary_and_ordering_only",
  depositAvailabilityEvidenceAdded: false,
  constraintsEvidenceAdded: false,
  riskReviewStillUnresolved: true,
  candidateBecameMoreEligible: false,
  eligibilityDelta: "none — the manifest now names a NEARER blocker, which describes the product as less ready, not more",
  lifecycleChanged: false,
} as const;

/**
 * The 16H-N.5 transition is PRESERVED, not rewritten. Its statement — that blocked_risk_review was
 * selected because the nearer states did not exist — remains accurate FOR SCHEMA 1.0.0. Editing it to
 * match the new model would falsify the record of what was known then.
 */
export const PRESERVED_HISTORICAL_TRANSITION = {
  at: "16H-N.5",
  transition: "blocked_position_detection → blocked_risk_review",
  reasonAsRecordedThen: "the nearer states (deposit availability, constraints) did not exist in the schema-1.0.0 vocabulary; no enum member was invented",
  stillAccurateForSchema: "1.0.0",
  rewritten: false,
  supersededBy: "16H-N.5a — under schema 1.1.0 the same facts rank blocked_deposit_availability nearest",
} as const;

/**
 * OBSERVATION, deliberately not acted on. kamino_steakhouse_usdc ALSO carries
 * depositAvailabilityState = "blocked" while sitting at primaryBlocker = "blocked_risk_review", so it
 * is arguably affected by the same missing-state problem. It was NOT changed, for two reasons:
 *
 *   1. This step's scope pins Steakhouse as unchanged, and mass-updating candidates was excluded.
 *   2. Its manifest carries an unresolved internal inconsistency that must be settled FIRST:
 *      `capacityAdapterState` is "blocked" and `capacityFieldOrFormula` still reads "UNRESOLVED",
 *      yet a code comment and kaminoVaultCapacitySemantics.ts (16H-J.1) both state capacity was
 *      RESOLVED to verified_uncapped. Under the new ordering capacity ranks BEFORE deposit
 *      availability, so its primary depends on which of those is true. Guessing would either hide a
 *      real capacity gap or re-open a resolved one.
 *
 * Recorded for a dedicated Steakhouse reconciliation step.
 */
export const STEAKHOUSE_OBSERVATION_NOT_ACTED_ON = {
  candidateId: "kamino_steakhouse_usdc",
  changed: false,
  observation: "depositAvailabilityState = blocked while primaryBlocker = blocked_risk_review — potentially the same missing-state problem.",
  blockedOnFirst:
    "capacityAdapterState = 'blocked' and capacityFieldOrFormula = 'UNRESOLVED...' contradict the 16H-J.1 resolution recorded in kaminoVaultCapacitySemantics.ts and in this file's own comment. Capacity ranks before deposit availability, so the correct primary cannot be determined until that contradiction is settled.",
  recommendation: "a dedicated Steakhouse evidence reconciliation step",
} as const;

/* ------------------------------------------------------------------ *
 * 4. Boundaries
 * ------------------------------------------------------------------ */

export const AMENDMENT_CONFERS = {
  confers: [
    "a primary-blocker vocabulary that can name the nearest unresolved prerequisite",
    "a deterministic blocker ordering",
    "a validator that detects a primary blocker farther than the nearest unresolved stage",
  ],
  doesNotConfer: [
    "deposit availability", "withdrawal availability", "constraints evaluation",
    "a risk score", "human review", "risk signoff", "product approval",
    "selector eligibility", "recommendation eligibility", "Top Pick",
    "a production suggestion card", "any Safety Buffer change", "execution",
  ],
  depositAvailabilityRemains: "blocked",
  constraintsRemain: "blocked",
  riskReviewRemains: "blocked",
  lifecycleUnchanged: "identity_verified — a vocabulary correction is not a lifecycle transition",
  approvedProductCount: 0,
  safetyBufferValuesChanged: false,
  existingPositionRecognitionChanged: false,
  riskScoreAssigned: false,
  humanReviewOccurred: false,
  signoffOccurred: false,
  productApproved: false,
  transactionConstructedOrSimulated: false,
  enumExistenceDoesNotResolve:
    "No blocker was marked resolved because the enum now exists. A word for a gap is not evidence about the gap.",
} as const;

/* ------------------------------------------------------------------ *
 * 5. Evidence manifest
 * ------------------------------------------------------------------ */

export const PRESERVED_PRIOR_EVIDENCE_N5A = [
  "identity_9773ac14", "klend_reserve_apy_methodology_v1", "apy_evidence_d468fce5",
  "klend_reserve_reward_methodology_v1", "reward_evidence_cace4fe4",
  "klend_reserve_apy_parity_v1", "parity_evidence_dd25a9a1",
  "klend_reserve_measured_apy_methodology_v1", "measured_apy_evidence_ebc7627d",
  "solana_slot_duration_methodology_v1",
  "klend_reserve_capacity_methodology_v1", "capacity_evidence_e54e310a",
  "klend_direct_lending_position_methodology_v1", "position_evidence_fb2bb70b",
  "steakhouse_evidence_a86da1fd", "steakhouse_automated_assessment_aggregate_5.37",
] as const;

export const BLOCKER_ORDER_EVIDENCE = {
  evidenceId: BLOCKER_ORDER_AMENDMENT_ID,
  version: BLOCKER_ORDER_AMENDMENT_VERSION,
  step: "16H-N.5a",
  preparerId: "claude_automated_evidence_preparer",
  preparerRole: "automated_evidence_preparer",
  preparerIsNotHumanReviewer: true,
  evidenceTimestamp: "2026-07-17T07:20:00.000Z",
  priorVocabularySize: PRIOR_PRIMARY_STATUS_VOCABULARY.length,
  addedStates: ADDED_PRIMARY_STATUSES,
  orderLength: STABLE_YIELD_BLOCKER_ORDER.length,
  schemaPriorVersion: SCHEMA_VERSION_CHANGE.priorVersion,
  schemaNewVersion: SCHEMA_VERSION_CHANGE.newVersion,
  affectedCandidate: AFFECTED_CANDIDATE.candidateId,
  whatChanged: [
    "Added blocked_deposit_availability and blocked_constraints to StableYieldEvidencePrimaryStatus.",
    "Declared STABLE_YIELD_BLOCKER_ORDER, the deterministic prerequisite sequence.",
    "Excluded unsupported_for_mvp and archived as non-sequential dispositions.",
    "Bumped the manifest schema 1.0.0 → 1.1.0 additively; 1.0.0 stays readable.",
    "Corrected kamino_usdc_lending's primary from blocked_risk_review to blocked_deposit_availability.",
  ],
  whyItChanged:
    "primaryBlocker must name the nearest unresolved prerequisite. Without these states the manifest reported a farther blocker and under-described the actual next work.",
  invalidationTriggers: [
    "a new evidence stage is added that has no place in the order",
    "the candidate model gains a withdrawal-availability field (revisit the primary-state decision)",
    "a stage is removed or renamed (would break additive compatibility)",
  ],
} as const;

export function computeBlockerOrderEvidenceManifestHash(e: typeof BLOCKER_ORDER_EVIDENCE = BLOCKER_ORDER_EVIDENCE): string {
  const material = JSON.stringify({
    id: e.evidenceId, v: e.version, s: e.step,
    a: e.addedStates, o: e.orderLength,
    pv: e.schemaPriorVersion, nv: e.schemaNewVersion, c: e.affectedCandidate,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `blocker_order_evidence_${h.toString(16).padStart(8, "0")}`;
}

export const BLOCKER_ORDER_EVIDENCE_MANIFEST_HASH = computeBlockerOrderEvidenceManifestHash();

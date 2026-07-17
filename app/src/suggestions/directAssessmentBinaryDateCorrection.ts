/**
 * directAssessmentBinaryDateCorrection — Step 16H-P.2a. Corrects a FACTUAL ERROR in a live automated
 * assessment: the KLend deployed-binary date.
 *
 * THE ERROR
 * ---------
 * 16H-P.1 recorded "The deployed KLend binary dates from 2026-07-14." That is the KVAULT binary's
 * `lastDeployedAt` (steakhouseEvidenceClosure.ts:319 — `lastDeployedAt: "2026-07-14T14:54:02.000Z"`),
 * carried onto KLend. They are DIFFERENT PROGRAMS.
 *
 * KLend's ProgramData reports deployed slot 422723185, whose block time is 2026-05-28T12:47:42Z —
 * ~50 days before the assessment, not ~3.
 *
 * The error propagated: 16H-P.1 wrote it, and 16H-P.2 inherited it into three dimension rationales,
 * restating it as "~3 days old". Nine sites across two modules carried the wrong fact.
 *
 * WHY IT HAPPENED — THE SAME CLASS OF MISTAKE, TWICE
 * -------------------------------------------------
 * This is a KVault→KLend evidence transfer, which is precisely what 16H-P.1 refused to do for the
 * UPGRADE AUTHORITY and was right to refuse. The same session that correctly insisted "KVault's
 * 5-of-10 + 24h does not transfer to KLend — a different program" silently transferred KVault's
 * binary DATE to KLend. The discipline was applied to the fact under examination and not to the
 * surrounding context.
 *
 * HOW IT SURFACED
 * ---------------
 * Not by review of this module. It surfaced while scouting Jupiter Lend: comparing deploy slots
 * (Kamino 422723185 vs Jupiter 430476341) made "Kamino's binary is 3 days old" arithmetically
 * impossible, since Jupiter's HIGHER slot was plainly more recent. A cross-check found it; internal
 * consistency did not.
 *
 * WHAT DOES NOT CHANGE
 * --------------------
 * No score. No confidence. No aggregate. The manifest hash is unchanged BY CONSTRUCTION, because
 * computeDirectAssessmentManifestHash binds identity, scores and aggregate — not rationale prose. That
 * is the correct behaviour: a factual correction to a rationale is not a new assessment.
 *
 * The three affected dimensions survive on their real reasons:
 *   audit_security 6    — the linkage gap is that audit commits are PRIVATE, not that the binary is new.
 *                         50 days or 3, no report maps to it.
 *   maturity 4          — driven by unverified RESERVE age and configuration continuity. A 50-day binary
 *                         is still young; the score was never resting on "3 days".
 *   incident_history 5  — the binary still postdates every documented event (latest 2026-02-05/06) and
 *                         the April 2026 risk report (published 2026-05-05) predates it by 23 days.
 *
 * If any score HAD depended on this fact, this would be a reassessment, not an amendment. It did not.
 */
import { DIRECT_ASSESSMENT_MANIFEST_HASH, DIRECT_ASSESSMENT_OUTCOME, DIRECT_DIMENSION_ASSESSMENTS } from "./klendDirectUsdcAutomatedAssessment";

export const BINARY_DATE_CORRECTION_VERSION = "1.0.0" as const;
export const BINARY_DATE_CORRECTION_ID = "direct_assessment_binary_date_correction_v1" as const;

/** The erroneous claim, preserved verbatim. NEVER delete — the record of the mistake is the point. */
export const SUPERSEDED_BINARY_DATE_CLAIM = {
  recordedAtStep: "16H-P.1",
  propagatedToStep: "16H-P.2",
  claim: "The deployed KLend binary dates from 2026-07-14.",
  restatedAs: "the deployed binary is ~3 days old",
  affectedSites: 9,
  affectedModules: ["klendDirectUsdcRiskEvidencePackage.ts", "klendDirectUsdcAutomatedAssessment.ts"],
  affectedDimensions: ["audit_security", "maturity", "incident_history"],
  whyItWasWrong:
    "2026-07-14 is the KVAULT binary's lastDeployedAt (steakhouseEvidenceClosure.ts:319). It was carried onto KLend, a different program with a different ProgramData account and a different deploy slot.",
  errorClass: "kvault_to_klend_evidence_transfer",
  irony:
    "16H-P.1 explicitly refused this exact transfer for the upgrade authority — recording that KVault's 5-of-10 + 24h 'does not transfer to KLend, a different program' — and then transferred KVault's binary date to KLend in the same module. The rule was applied to the fact under examination but not to the surrounding context.",
} as const;

export const CORRECTED_BINARY_FACT = {
  program: "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
  programDataAccount: "9uSbGW1y9H5Av6H5TKxQ1wnFApSq2t3oEpfF2YfjDQGA",
  deployedSlot: 422723185,
  deployedAt: "2026-05-28T12:47:42.000Z",
  verificationMethod: "ProgramData offset 4 (u64 deployed slot) → getBlockTime(slot), read-only",
  verifiedAtSlot: 433481551,
  verifiedAt: "2026-07-17T12:29:42.000Z",
  ageDaysAtAssessment: 50.0,
  priorClaimedAgeDays: 3,
  kvaultBinaryDateForContrast: "2026-07-14T14:54:02.000Z — genuinely correct, for the KVAULT program",
} as const;

/** How it was caught. Recorded because the detection path is itself a finding. */
export const DETECTION = {
  foundBy: "cross-protocol comparison during Jupiter Lend scouting, not by review of the assessment",
  mechanism:
    "Comparing deploy slots made the claim arithmetically impossible: Kamino 422723185 vs Jupiter Lend 430476341. Jupiter's HIGHER slot is necessarily more recent, so Kamino's binary could not be 3 days old while Jupiter's — deployed 7.75M slots later — was 14.",
  internalConsistencyDidNotCatchIt:
    "Nothing inside the assessment contradicted the wrong date. It was internally consistent and externally false. Fixtures asserted the rationale's STRUCTURE, never its arithmetic against chain.",
  lesson:
    "A date copied from another program is invisible to any check that does not compare it to the chain. The slot was always present and correct in the same module; only the date derived from it was wrong.",
} as const;

export const SCORE_IMPACT = {
  scoresChanged: false,
  confidenceChanged: false,
  aggregateChanged: false,
  priorAggregate: 5.93,
  resultingAggregate: 5.93,
  meetsMinimum: false,
  assessmentVersionBumped: false,
  assessmentVersionRemains: "1.0.0",
  manifestHashChanged: false,
  manifestHashStableByConstruction:
    "computeDirectAssessmentManifestHash binds {id, version, candidate, reserve, package manifest, authority manifest, rubric hash, scores, aggregate, meetsMinimum} — NOT rationale prose. A factual correction to a rationale therefore leaves the hash untouched, which is correct: this is an amendment, not a new assessment.",
  correctionMechanism: "evidence/rationale amendment (same mechanism as 16H-O.2), not a reassessment",
  whyNoScoreMoved: [
    "audit_security 6 — the linkage gap is that all audit commits are PRIVATE-repo, not that the binary is new. At 50 days or 3, no report maps to it. The limiting fact is unchanged.",
    "maturity 4 — driven by unverified RESERVE age and configuration continuity, not binary age. A 50-day binary is still young; the score never rested on '3 days'.",
    "incident_history 5 — the binary still postdates every documented event (latest 2026-02-05/06), and the April 2026 risk report (published 2026-05-05) predates it by 23 days. The gap stands.",
  ],
  ifAScoreHadDepended:
    "This would then be a REASSESSMENT requiring a new immutable assessment version, not an amendment. It did not, and that was checked rather than assumed.",
  reviewerShouldStillKnow:
    "The human reviewer should know an assessment they are reviewing contained a wrong fact, even one that moved nothing. Confidence in the process is part of what they are assessing.",
} as const;

export const CORRECTION_EVIDENCE = {
  evidenceId: BINARY_DATE_CORRECTION_ID,
  version: BINARY_DATE_CORRECTION_VERSION,
  step: "16H-P.2a",
  candidateId: "kamino_usdc_lending",
  preparerId: "claude_automated_evidence_preparer",
  preparationRole: "evidence_preparer" as const,
  preparerIsNotHumanReviewer: true,
  evidenceTimestamp: "2026-07-17T12:35:00.000Z",
  correctedFrom: SUPERSEDED_BINARY_DATE_CLAIM.claim,
  correctedTo: CORRECTED_BINARY_FACT.deployedAt,
  sitesCorrected: 9,
  whatChanged: [
    "KLend deployed-binary date corrected 2026-07-14 → 2026-05-28T12:47:42Z across 9 sites in 2 modules.",
    "The erroneous claim is preserved verbatim at SUPERSEDED_BINARY_DATE_CLAIM.",
    "No score, confidence, aggregate or assessment version changed; the manifest hash is unchanged by construction.",
  ],
  whyItChanged: "The recorded date was the KVault binary's, carried onto KLend — a different program.",
  historyRewritten: false,
  invalidationTriggers: ["KLend program upgrade (a new deploy slot supersedes this fact)", "ProgramData change"],
} as const;

export function computeBinaryDateCorrectionHash(e: typeof CORRECTION_EVIDENCE = CORRECTION_EVIDENCE): string {
  const material = JSON.stringify({
    id: e.evidenceId, v: e.version, s: e.step,
    from: e.correctedFrom, to: e.correctedTo, n: e.sitesCorrected,
    slot: CORRECTED_BINARY_FACT.deployedSlot,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `binary_date_correction_${h.toString(16).padStart(8, "0")}`;
}

export const BINARY_DATE_CORRECTION_HASH = computeBinaryDateCorrectionHash();

/** Live proof the correction did not disturb the assessment. */
export const CORRECTION_INVARIANTS = {
  aggregateStillFiveNinetyThree: DIRECT_ASSESSMENT_OUTCOME.unroundedAggregate === 5.93,
  meetsMinimumStillFalse: DIRECT_ASSESSMENT_OUTCOME.meetsMinimum === false,
  twelveDimensionsIntact: DIRECT_DIMENSION_ASSESSMENTS.length === 12,
  manifestHashUnchanged: DIRECT_ASSESSMENT_MANIFEST_HASH === "direct_assessment_54a11ba3",
} as const;

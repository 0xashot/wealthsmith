/**
 * jupiterLendIncidentHistoryAmendment — resolves the ONE dimension that
 * jupiterLendUsdcProvisionalAssessment deliberately held as an explicit unknown
 * (incident_history), completing that assessment without mutating it.
 *
 * WHY A SEPARATE RECORD. The provisional assessment is immutable by policy: its eleven scored
 * dimensions, its 98/100 scored weight, and its published band [4.12, 4.32] are pinned by
 * fixtures and referenced by other records. An amendment states what NEW evidence establishes
 * and what the aggregate becomes; it never edits the original. Same pattern as the IDL-discovery
 * and team-disclosure amendments.
 *
 * WHY THE HOLD-OUT IS NOW RESOLVABLE. The July 2026 assessment could not anchor this dimension
 * for two reasons, both since eased:
 *   1. the incident search was too narrow to reach primary-attributable events; and
 *   2. the binaries actually holding funds were HOURS old, so there was no history to review.
 * At this cutoff the two deployed programs are ~27 and ~40 days old, and a broader search
 * reached attributable, sourced events in both directions.
 *
 * RESOLVED SCORE: 5 (`partial`). Evidence now covers the main risk — no exploit or user-fund
 * loss across ~1 year of operation; Jupiter publicly confirmed Lend was NOT involved in the
 * April 2026 Drift/JLP exploit (a sourced negative, not an unknown); the protocol passed the
 * Oct 10 crash (>$20B liquidated market-wide) with ZERO bad debt, albeit with limited exposure;
 * and a public Code4rena competition (2026-02-12 → 2026-03-13, $107k awards, public report)
 * surfaced no high-severity solo findings, atop the reported six audits across four firms.
 * Held at `partial`, not higher, by a named and bounded gap: an operator-ACKNOWLEDGED disclosure
 * failure — Jupiter's COO conceded the "zero contagion" claim about Lend vaults was "not 100%
 * correct" and the posts were removed, after a public dispute over calling rehypothecating
 * vaults "isolated" — plus the absence of any formal incident-history review.
 *
 * OUTCOME UNCHANGED. 4.22 sits inside the originally published band, exactly as the bound
 * predicted: the unknown never could have changed the verdict. Jupiter Lend remains NOT PASSED.
 *
 * SEPARATION OF DUTIES (risk_separation_of_duties_v2): authored under the
 * ws_automated_risk_assessor identity — scores only; the outcome it reports was already
 * recorded, and this amendment approves nothing.
 *
 * Evidence collected 2026-08-11 (Claude, evidence preparer, founder-authorized fetch): live
 * mainnet reads of both program accounts for deploy age, public reporting on the Drift exploit
 * and Jupiter's response, the Code4rena audit listing, the vault-disclosure episode, and
 * Jupiter's status-page outage record.
 */
import { JUP_PROVISIONAL_ASSESSMENT_ID } from "./jupiterLendUsdcProvisionalAssessment";

export const JUP_INCIDENT_AMENDMENT_VERSION = "1.0.0" as const;
export const JUP_INCIDENT_AMENDMENT_ID = "jupiter_lend_incident_history_amendment_v1" as const;
/** The record this amends. The original is referenced, never edited. */
export const JUP_INCIDENT_AMENDMENT_AMENDS = JUP_PROVISIONAL_ASSESSMENT_ID;
export const JUP_INCIDENT_AMENDMENT_MUTATES_ORIGINAL = false;
export const JUP_INCIDENT_AMENDMENT_APPROVES_ANYTHING = false;

export const JUP_INCIDENT_AMENDMENT_CUTOFF_AT = "2026-08-11T00:00:00.000Z";

/** Deploy ages that removed the "hours-old binary" blocker (live reads at the cutoff). */
export const JUP_BINARY_AGE_AT_AMENDMENT = {
  lendProgramDeploySlot: 433_199_003, // ~27 days before the cutoff
  secondProgramDeploySlot: 430_476_341, // ~40 days before the cutoff
  observedAtSlot: 439_015_290,
} as const;

/** The attributable events the broader search reached — favourable and adverse. */
export const JUP_INCIDENT_EVIDENCE = {
  favourable: [
    "No exploit or loss of user funds found for Jupiter Lend across ~1 year of operation.",
    "Jupiter publicly stated Lend was NOT involved with the Drift market and was unaffected by the April 2026 Drift exploit (~$295M, incl. ~$155M JLP) — a sourced non-involvement, not an absence of evidence.",
    "Passed the Oct 10 crash (>$20B liquidated market-wide) with zero bad debt, with limited positions exposed at the time.",
    "Public Code4rena competition 2026-02-12 → 2026-03-13, $107,000 awards, public report, no high-severity solo findings; reported six audits across four firms.",
  ],
  adverse: [
    "Operator-acknowledged disclosure failure: the 'zero contagion' claim about Lend vaults was conceded by Jupiter's COO as 'not 100% correct' and the posts were removed, following a public dispute over describing rehypothecating vaults as 'isolated'.",
    "Two short platform outages reported (2026-07-29 ~5 min; 2026-08-11 ~34 min) at the status-page level.",
    "No formal, comprehensive incident-history review exists for the product.",
  ],
} as const;

export const JUP_INCIDENT_HISTORY_RESOLUTION = {
  resolvedAt: "2026-08-11",
  dimensionId: "incident_history" as const,
  weight: 2,
  priorState: "explicit_unknown" as const,
  priorAggregateBand: [4.12, 4.32] as const,
  resolvedScore: 5,
  anchorBand: "partial" as const,
  confidence: "medium" as const,
  /** 412 previously-scored weighted points + 5 × weight 2 = 422, over total weight 100. */
  completedWeightedPoints: 422,
  totalWeight: 100,
  completedAggregate: 4.22,
  minimumThreshold: 7,
  meetsMinimum: false,
  outcomeChanged: false,
  scoresAdjustedAfterSeeingAggregate: false,
  limitingFact:
    "An operator-acknowledged disclosure failure (the retracted 'zero contagion' claim) and the absence of any " +
    "formal incident-history review; the reported outages are status-page level and may cover the app or API " +
    "rather than the Lend program itself.",
  rationale:
    "Attributable evidence now covers the main risk — no loss event in ~1 year, sourced non-involvement in the " +
    "Drift exploit, zero bad debt through a real market-wide stress event, and a public competitive audit — " +
    "leaving a named, bounded gap in disclosure practice. Above Marinade's 4 (an actual reward-impacting " +
    "incident disclosed without a postmortem); level with the clean-search 5s, discounted for the acknowledged " +
    "misstatement rather than credited for silence.",
} as const;

/** Recompute guard: the completed aggregate must land inside the original published band. */
export function completedAggregateIsInsidePriorBand(): boolean {
  const [lo, hi] = JUP_INCIDENT_HISTORY_RESOLUTION.priorAggregateBand;
  const agg = JUP_INCIDENT_HISTORY_RESOLUTION.completedAggregate;
  return agg >= lo && agg <= hi;
}

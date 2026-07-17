/**
 * sourceCompletionAmendment — Step 16H-S.0. Corrects source-exhaustion failures found in LIVE
 * evidence, across BOTH candidates, from three sources the product owner supplied.
 *
 * THE FOURTH ROUND OF THE SAME FAILURE
 * ------------------------------------
 * 1. kamino.com/docs/security — missed; moved oracle_risk 4→6.
 * 2. KVault→KLend binary date — transferred; corrected at 16H-P.2a.
 * 3. jup-ag/jupiter-lend IDLs — missed behind an unfollowed redirect; corrected at 16H-R.1a.
 * 4. THIS: gov.kamino.finance — a forum I had ALREADY CITED (the Feb 5-6 analysis) but whose index
 *    I never enumerated, plus docs.jup.ag/user-docs/more/security and ooosec.com/programs/jupiter.
 *
 * Round 4 is the worst of the four, because the missed source was one I had used. I read one thread
 * and never looked at the list it was sitting in.
 *
 * WHAT WAS WRONG IN LIVE EVIDENCE
 * -------------------------------
 * Both live assessments state "the most recent monthly risk report found is April 2026 (published
 * 2026-05-05)". FALSE AT SEARCH TIME: May 2026 Insights published 2026-06-20 and June 2026 Insights
 * published 2026-07-03 — both before every search that recorded "April latest".
 *
 * The consequence differs per candidate, and the distinction matters:
 *   • KLend binary 2026-05-28: the June report POSTDATES it, so the sentence "no published review
 *     postdates the code holding funds" was false AS WRITTEN. It survives only with a precision the
 *     original lacked: a monthly RISK-INSIGHTS report is market monitoring, not CODE review. No CODE
 *     review postdates the binary. That distinction is now stated everywhere the claim appears.
 *   • KVault binary 2026-07-14: postdates even the June report, so Steakhouse's gap stands unchanged
 *     — but its "April latest" fact was still wrong and is corrected.
 *
 * WHAT WAS MISSING
 * ----------------
 *   • A WHOLE EVENT ANALYSIS: "Kamino Lend, Risk Event Analysis: 10th of October 2025" — Main Market
 *     (= SOL/BTC) took $16M of $20M liquidations; $0 bad debt; NO SOCIALIZED LOSSES (official
 *     attestation); 8,000+ liquidations processed with zero failures by 114 liquidators; no
 *     withdrawal issues; median position loss 0.07%.
 *   • Jupiter Lend has SEVEN audit reports, not the two I recorded: Zenith (Jul 2025), Offside ×3
 *     (Jul/Aug/Oct 2025), MixBytes (Oct 2025), OtterSec ×2 (Nov 2025) — plus the Code4rena contest.
 *   • Jupiter runs a LIVE BUG BOUNTY (OOOsec): $500k critical cap, ~4 months old, 25 resolved
 *     reports, $45.2k paid, top single payout $15k.
 *
 * SCORES DO NOT MOVE. Both aggregates (5.93, 5.37) and every dimension score, confidence and anchor
 * are unchanged; the assessment manifest hash is unchanged by construction (it binds scores, not
 * prose). This is the P.2a mechanism: a factual amendment, not a reassessment.
 */

export const SOURCE_COMPLETION_VERSION = "1.0.0" as const;
export const SOURCE_COMPLETION_ID = "source_completion_amendment_v1" as const;

/** Superseded claims, verbatim. NEVER delete. */
export const SUPERSEDED_SOURCE_CLAIMS = {
  claims: [
    { text: "the most recent monthly risk report found is April 2026 (published 2026-05-05)", locations: ["steakhouseEvidenceClosure.ts gap 4", "steakhouseAutomatedAssessment.ts incident rationale", "incidentMarketAliasAmendment.ts SCOPE_GAP_STATUS", "klendDirectUsdcRiskEvidencePackage.ts incident limitations", "klendDirectUsdcAutomatedAssessment.ts incident limitingFact"], whyWrong: "May 2026 Insights published 2026-06-20 and June 2026 Insights published 2026-07-03 — both existed before every search that recorded this." },
    { text: "no published review postdates the code holding user funds (KLend)", locations: ["klendDirectUsdcAutomatedAssessment.ts", "klendDirectUsdcRiskEvidencePackage.ts"], whyWrong: "The June 2026 report (2026-07-03) postdates the KLend binary (2026-05-28). True only as 'no CODE review postdates the binary' — a precision the original lacked." },
    { text: "Zenith and Offside audits are reported (Jupiter)", locations: ["jupiterLendUsdcRiskEvidencePackage.ts audit_security favorableFacts"], whyWrong: "Seven reports exist across four firms (Zenith, Offside ×3, MixBytes, OtterSec ×2), per Jupiter's official security page." },
    { text: "bug bounty: unknown (Jupiter)", locations: ["16H-R.1 audit artifact map"], whyWrong: "A live OOOsec program exists: $500k critical cap, 25 resolved reports, $45.2k paid." },
  ],
  errorClass: "cited_source_index_never_enumerated",
  historicalRecordsLeftIntact:
    "directAssessmentBinaryDateCorrection.ts (16H-P.2a) also contains the 'April 2026' fact. It is an IMMUTABLE historical correction record describing what was believed at P.2a, and is deliberately NOT edited — this amendment supersedes it instead. Same treatment as every prior superseded record.",
} as const;

/** The newly found facts, dated and sourced. */
export const NEW_SOURCE_FACTS = {
  kaminoRiskReports: {
    source: "gov.kamino.finance forum index",
    reports: [
      { period: "May 2026", publishedAt: "2026-06-20" },
      { period: "June 2026", publishedAt: "2026-07-03" },
    ],
    latestPostdatesKlendBinary: true,
    latestPredatesKvaultBinary: true,
    natureOfReports: "monthly market-risk monitoring — NOT code review. The code-review gap stands for both binaries; the recency fact was wrong.",
  },
  october2025Event: {
    source: "gov.kamino.finance — 'Kamino Lend, Risk Event Analysis: 10th of October 2025' (published 2025-10-11)",
    trigger: "US-China trade-war escalation; SOL −19.5% ($220→$177); listed assets averaged ~30% drawdowns",
    marketsAffected: [
      { market: "Main Market (= SOL/BTC, per the 16H-O.2 alias)", liquidations: "$16M" },
      { market: "Fartcoin", liquidations: "$1.7M" },
      { market: "JLP", liquidations: "$1.3M" },
      { market: "Altcoin Market", liquidations: "$666k" },
    ],
    badDebt: "$0",
    socializedLosses: "NONE — official attestation, the first per-event statement bearing directly on the socialize_loss history gap",
    liquidationOutcome: "8,000+ liquidation events processed with zero failures by 114 active liquidators",
    withdrawalIssues: "none reported; lending-pool solvency intact",
    medianUserImpact: "0.07% of position size across ~1,700 liquidated wallets",
    relationshipToFiveEvents:
      "Falls inside the Track Record's Feb 2025 → Feb 2026 window with $0 bad debt, CONSISTENT with being one of the five named events — now with a detailed per-event analysis. Not asserted as identical; the five-event table's exact dates were not re-fetched.",
    attestationIsNotAScan:
      "An official 'no socialized losses' statement is primary evidence but is NOT the on-chain socialize_loss instruction scan. The search-scope gap narrows; it does not close.",
  },
  jupiterAudits: {
    source: "docs.jup.ag/user-docs/more/security",
    reports: [
      { auditor: "Zenith", date: "2025-07" },
      { auditor: "Offside Labs", date: "2025-07" },
      { auditor: "Offside Labs", date: "2025-08" },
      { auditor: "Offside Labs", date: "2025-10" },
      { auditor: "MixBytes", date: "2025-10" },
      { auditor: "OtterSec", date: "2025-11" },
      { auditor: "OtterSec", date: "2025-11" },
    ],
    plusContest: "Code4rena 2026-02 → 2026-03 ($107k)",
    officialDisclaimerPreserved: "'A security audit is a point-in-time review by a third party. It lowers risk but does not guarantee that a program is free of bugs or that funds cannot be lost.' — Jupiter's own framing, kept verbatim.",
    linkageUnchanged: "All seven predate the 2026-07 redeploys. The audit-to-current-binary gap STANDS. What changes is the artifact set's size, and the development-age evidence: a codebase under review by four firms Jul-Nov 2025 — corroborated by the reward_rate_model deploy of 2025-08-26 — is ~a year old, not brand new.",
  },
  jupiterBugBounty: {
    source: "ooosec.com/programs/jupiter",
    platform: "OOOsec",
    criticalCap: "$500,000",
    launched: "~2026-03 (4 months before observation)",
    resolvedReports: 25,
    totalPaid: "$45,200",
    topSinglePayout: "$15,000",
    signalReading:
      "A live, funded disclosure channel exists — one of the source classes the incident search lacked. The payout profile (no critical-sized payment) is a WEAK signal; scope granularity per report is not public, and web2/web3 tracks are mixed in the totals.",
  },
} as const;

/** Every live site corrected, with its marker. */
export const CORRECTED_SITES = [
  "klendDirectUsdcAutomatedAssessment.ts — incident_history limitingFact (April→June + code-review precision)",
  "klendDirectUsdcAutomatedAssessment.ts — incident_history favorableEvidence (+Oct 10 2025 event, marked)",
  "klendDirectUsdcRiskEvidencePackage.ts — incident gap-4 limitation (April→June + precision)",
  "incidentMarketAliasAmendment.ts — SCOPE_GAP_STATUS gap 4 detail (April→June; KVault gap stands)",
  "steakhouseAutomatedAssessment.ts — incident_history rationale (April→June; KVault gap stands)",
  "steakhouseEvidenceClosure.ts — gap 4 comment (annotated)",
  "jupiterLendUsdcRiskEvidencePackage.ts — audit_security favorableFacts (2→7 reports + bounty), maturity favorableFacts (+development-age), incident_history favorableFacts (+bounty)",
] as const;

export const SCORE_IMPACT_S0 = {
  scoresChanged: false,
  confidenceChanged: false,
  kaminoAggregate: 5.93,
  steakhouseAggregate: 5.37,
  meetsMinimumBoth: false,
  assessmentManifestHashUnchanged: "direct_assessment_54a11ba3",
  jupiterReadinessUnchanged: "not_ready_for_automated_assessment",
  whyNoScoreMoves: [
    "Kamino incident_history 5/low: the Oct 2025 analysis strengthens favorable evidence for the EXACT market, but event-window reserve binding, binary currency (as CODE review) and the on-chain socialize_loss scan all remain open — the anchor does not move.",
    "Steakhouse incident_history 4/low: the KVault binary (2026-07-14) postdates even the June report; gaps 1, 2 and 4 all stand.",
    "Jupiter audit_security stays weak/scoreable: seven reports instead of two changes the artifact count, not the binary linkage — no live program is a verified build and no source matches the live IDs.",
    "Jupiter incident_history stays insufficient: a bounty's existence is one new source, not a completed search.",
  ],
  reviewerMustBeTold: "Both human-review packets now sit atop rationales amended twice (P.2a, S.0). The reviewer should know the correction history, not just the corrected text.",
} as const;

/** The process failure, made into a rule the incident-search methodology must inherit. */
export const SOURCE_ENUMERATION_RULE = {
  rule: "When citing ANY source, enumerate its index/listing — not only the page that answered the immediate question. A cited-but-unenumerated source is treated as UNSEARCHED.",
  motivation: "gov.kamino.finance was cited at 16H-L.2 (one thread) while its index contained an unexamined event analysis and two newer risk reports. Reading one thread created the false confidence of having 'searched the forum'.",
  appliesTo: ["governance forums", "docs sites (crawl the nav/index, follow redirects)", "audit listings", "bounty platforms", "GitHub orgs (enumerate repos, not just the linked one)"],
  bindingOn: "the 16H-S.1 incident-search methodology and all future evidence steps",
} as const;

export const S0_EVIDENCE = {
  evidenceId: SOURCE_COMPLETION_ID,
  version: SOURCE_COMPLETION_VERSION,
  step: "16H-S.0",
  preparerId: "claude_automated_evidence_preparer",
  preparationRole: "evidence_preparer" as const,
  preparerIsNotScorer: true,
  evidenceTimestamp: "2026-07-17T13:20:00.000Z",
  sourcesAdded: ["gov.kamino.finance (index + Oct 10 2025 event analysis)", "docs.jup.ag/user-docs/more/security", "ooosec.com/programs/jupiter"],
  historyRewritten: false,
  invalidationTriggers: [
    "a newer Kamino monthly report or event analysis is published",
    "Jupiter audit reports are published with commits, or findings become public",
    "a critical-severity bounty payout occurs",
    "the on-chain socialize_loss scan (16H-S.1) completes",
  ],
} as const;

export function computeS0ManifestHash(e: typeof S0_EVIDENCE = S0_EVIDENCE): string {
  const material = JSON.stringify({
    id: e.evidenceId, v: e.version, s: e.step,
    k: NEW_SOURCE_FACTS.kaminoRiskReports.reports, o: NEW_SOURCE_FACTS.october2025Event.badDebt,
    j: NEW_SOURCE_FACTS.jupiterAudits.reports.length, b: NEW_SOURCE_FACTS.jupiterBugBounty.resolvedReports,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `source_completion_${h.toString(16).padStart(8, "0")}`;
}

export const S0_MANIFEST_HASH = computeS0ManifestHash();

export const S0_CONFERS = {
  confers: ["corrected report-recency facts in both live assessments", "the Oct 10 2025 event as primary incident evidence", "a corrected Jupiter audit artifact record", "the source-enumeration rule"],
  doesNotConfer: ["a score change", "an aggregate change", "readiness", "a completed incident search", "closure of the socialize_loss scan", "human review", "signoff", "approval", "recommendation eligibility", "execution"],
  scoresAssigned: false,
  aggregateCalculated: false,
  transactionConstructedOrSimulated: false,
} as const;

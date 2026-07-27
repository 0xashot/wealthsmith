/**
 * kaminoSecuritySourcesAmendment — Step 16H-S.2. Incorporates two canonical Kamino sources the product owner
 * supplied, both REVIEWED LIVE on 2026-07-27, into the Kamino / Steakhouse Safety-Buffer vetting evidence:
 *
 *   1. https://kamino.com/security     — the consolidated security hub (successor to the kamino.com/docs/security/*
 *                                        pages the earlier evidence cited; the /docs/security/* deep links are the
 *                                        older location of this same material).
 *   2. https://risk.kamino.finance/    — the live "Kamino Lend Analysis" Risk Dashboard, the "Risk Dashboard" that
 *                                        kamino.com/security names under its "Risk Monitoring" component.
 *
 * NATURE OF THIS AMENDMENT
 * ------------------------
 * A factual SOURCE addition + relocation record, in the P.2a / S.0 tradition: it adds newly-reviewed primary sources
 * and states what they contain. It does NOT re-score, does NOT confer approval or Safety-Buffer eligibility, and does
 * NOT rewrite the existing evidence records or their fixtures (the older /docs/security/* citations are left intact and
 * are superseded-by-relocation here, not deleted). The per-reserve USDC vetting (oracle config, LTV, caps, curator
 * identity) still rests on the existing klendDirectUsdc* / steakhouse* evidence packages — nothing here replaces it.
 *
 * HONESTY BOUNDARY
 * ----------------
 * Every fact below was read from the rendered live pages on 2026-07-27. The Risk Dashboard reports AGGREGATE and
 * per-market metrics (loans, deposits, borrows, TVL) — it is market monitoring, NOT a per-reserve parameter audit and
 * NOT a code review. The newer March 2026 audits enlarge the artifact set and improve recency, but this record does
 * NOT assert they cover the exact on-chain binary currently holding funds — the audit-to-current-binary linkage
 * caution from the existing records still stands.
 */

export const KAMINO_SECURITY_SOURCES_VERSION = "1.0.0" as const;
export const KAMINO_SECURITY_SOURCES_ID = "kamino_security_sources_amendment_v1" as const;

/** The two sources incorporated, with the exact URLs and what each IS. */
export const INCORPORATED_SOURCES = {
  reviewedAt: "2026-07-27",
  securityHub: {
    url: "https://kamino.com/security",
    is: "Kamino's consolidated security overview page (audits, formal verification, bug bounty, oracle security, redundancy/fallbacks, liquidation stress tests, market risk, fuzzing, verifiable build).",
    relationshipToPriorCitations:
      "Successor/consolidation of the kamino.com/docs/security/* deep links cited by steakhouseIncidentEvidence / steakhouseUsdcRiskEvidence / steakhouseScoringPacket / klendDirectUsdc* — same material, current canonical location. The older /docs/security/* references are NOT deleted; they are relocated-by-note here.",
  },
  riskDashboard: {
    url: "https://risk.kamino.finance/",
    is: "The live 'Kamino Lend Analysis' Risk Dashboard — aggregate and per-market loans/deposits/borrows/TVL with per-market 'data updated' timestamps. This is the 'Risk Dashboard' named under the security hub's 'Risk Monitoring' component.",
    contentClass:
      "AGGREGATE + per-market monitoring data. NOT a per-reserve parameter audit and NOT a code review — the same class distinction the S.0 record drew for the monthly risk reports.",
  },
} as const;

/** Facts read verbatim from https://kamino.com/security on 2026-07-27. */
export const SECURITY_HUB_FACTS = {
  headline: { externalAudits: 20, formalVerificationsCompleted: 4, yearsLiveWithoutIncident: 3 },
  auditSummary: { totalAudits: 20, auditors: 5, criticalVulnerabilities: 0 },
  bugBounty: { platform: "ImmuneFi", cap: "$1,500,000" },
  fuzzing: "Fuzzing by Ackee",
  formalVerifications: [
    { report: "Ottersec Formal Verification - Kamino Lend", date: "2025-10-06" },
    { report: "Certora Verification - Kamino Earn Vaults", date: "2025-06-27" },
    { report: "Certora Verification - Kamino Lend", date: "2025-05-13" },
    { report: "Certora Verification - Kamino Limit Orders", date: "2025-02-21" },
  ],
  // Audits NEWER than the prior inventory (which topped out around Feb/Jun 2025). These reference Kamino Lend
  // v1.16.0 / v1.17.0 — a real recency/maturity improvement for the audit_security dimension.
  newerLendAudits: [
    { report: "OtterSec Audit - Kamino Lend v1.16.0 & v1.17.0", date: "2026-03" },
    { report: "Certora Verification - Kamino Lend v1.16.0", date: "2026-03" },
  ],
  earnVaultAudits: [
    { report: "Sec3 Audit - Kamino Vaults", date: "2025-02-06" },
    { report: "Offside Labs Audit - Kamino Vaults", date: "2025-04-12" },
    { report: "OtterSec Audit - Kamino Vaults", date: "2024-12-09" },
    { report: "Certora Verification - Kamino Vaults", date: "2025-06-27" },
  ],
  renameBannerConfirmed: "The Main Market has been renamed to the SOL/BTC Market.",
  marketingClaimNotUsed:
    "The page's '3 Years Live in Production Without Incident' and '0 Critical Vulnerabilities' are unscoped protocol-wide claims of the same class as the prior '0 Incidents' / '0 Oracle Exploits' statements — NOT used as evidence for the USDC reserve's vetting.",
} as const;

/** Facts read from https://risk.kamino.finance/ on 2026-07-27 (aggregate + the primary market). */
export const RISK_DASHBOARD_FACTS = {
  title: "Kamino Lend Analysis",
  aggregate: {
    totalLoans: 134_786,
    totalDepositedUsd: 2_253_479_922,
    totalBorrowedUsd: 919_833_983,
    totalTvlUsd: 1_333_645_940,
  },
  depositedByCategoryUsd: {
    Stables: "1.1B",
    LST: "412.0M",
    RWA: "379.1M",
    SOL: "226.7M",
    BTC: "64.9M",
    Others: "49.8M",
    JLP: "41.5M",
  },
  // The dashboard STILL labels the primary market "Main Market" — the app-side rename to "SOL/BTC Market" has not
  // propagated to the risk dashboard's label. This corroborates the Main-Market = SOL/BTC alias (16H-O.2) from a
  // SECOND independent surface: the app renamed it, the risk dashboard has not.
  primaryMarket: {
    dashboardLabel: "Main Market",
    dataUpdated: "2026-07-27T11:00:35Z",
    loans: 100_101,
    depositedUsd: 864_163_795,
    borrowedUsd: 352_344_004,
    tvlUsd: 511_819_790,
  },
  otherMarketsObserved: [
    "Ethena", "Prime V2", "Onyc V2", "Maple V2", "Solstice V2", "JLP", "Jito", "Pst V2",
    "Superstate Opening Bell", "Xstocks V2", "Solblaze V2",
  ],
  freshness: "Per-market 'data updated' timestamps were all 2026-07-27 — the dashboard is live and refreshed same-day.",
} as const;

/** What incorporating these sources DOES and DOES NOT change. Scores/approval do not move. */
export const S2_SCORE_IMPACT = {
  scoresChanged: false,
  confidenceChanged: false,
  approvalConferred: false,
  safetyBufferEligibilityChanged: false,
  whyNoScoreMoves: [
    "kamino.com/security is the current location of material already reflected in the evidence — a relocation, not a new finding, except for the newer audits.",
    "The March 2026 v1.16.0/v1.17.0 audits improve the audit_security recency/artifact count but do NOT establish coverage of the exact current on-chain binary — the linkage caution stands, so the anchor does not move.",
    "risk.kamino.finance provides aggregate/market monitoring, not a per-reserve parameter audit or code review — it does not touch the USDC-reserve dimension anchors.",
  ],
  favorableButNotScoreMoving: [
    "A newer audit set (v1.16.0/v1.17.0, March 2026) exists — development-age / ongoing-review evidence.",
    "The Main-Market = SOL/BTC alias is now corroborated by a second surface (the risk dashboard still labels it 'Main Market').",
    "Same-day-refreshed live risk monitoring is publicly available for the market.",
  ],
} as const;

export const KAMINO_SECURITY_SOURCES_EVIDENCE = {
  evidenceId: KAMINO_SECURITY_SOURCES_ID,
  version: KAMINO_SECURITY_SOURCES_VERSION,
  step: "16H-S.2",
  preparerId: "claude_automated_evidence_preparer",
  preparationRole: "evidence_preparer" as const,
  preparerIsNotScorer: true,
  evidenceTimestamp: "2026-07-27T00:00:00.000Z",
  sourcesAdded: ["https://kamino.com/security", "https://risk.kamino.finance/"],
  historyRewritten: false,
  invalidationTriggers: [
    "the newer Kamino Lend audit/FV reports (v1.16.0/v1.17.0) are tied to — or diverge from — the exact on-chain binary holding funds",
    "the risk dashboard relabels the primary market from 'Main Market' to 'SOL/BTC Market'",
    "kamino.com/security removes or supersedes any of the cited audit/FV artifacts",
    "a critical vulnerability or incident is published, changing the '0 critical' / 'no incident' aggregate claims",
  ],
} as const;

export function computeS2ManifestHash(e: typeof KAMINO_SECURITY_SOURCES_EVIDENCE = KAMINO_SECURITY_SOURCES_EVIDENCE): string {
  const material = JSON.stringify({
    id: e.evidenceId, v: e.version, s: e.step,
    a: SECURITY_HUB_FACTS.auditSummary, fv: SECURITY_HUB_FACTS.formalVerifications.length,
    tvl: RISK_DASHBOARD_FACTS.aggregate.totalTvlUsd, added: e.sourcesAdded,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `kamino_security_sources_${h.toString(16).padStart(8, "0")}`;
}

export const S2_MANIFEST_HASH = computeS2ManifestHash();

export const S2_CONFERS = {
  confers: [
    "two newly-reviewed canonical Kamino sources (security hub + risk dashboard) in the evidence record",
    "a corrected canonical location for the security material (kamino.com/security)",
    "corroboration of the Main-Market = SOL/BTC alias from the risk dashboard",
    "a note that a newer (March 2026) audit set exists",
  ],
  doesNotConfer: [
    "a score change", "an aggregate change", "readiness", "approval", "Safety-Buffer eligibility",
    "coverage of the current on-chain binary", "a completed per-reserve parameter audit", "human review",
    "signoff", "recommendation eligibility", "execution",
  ],
  scoresAssigned: false,
  aggregateCalculated: false,
  transactionConstructedOrSimulated: false,
} as const;

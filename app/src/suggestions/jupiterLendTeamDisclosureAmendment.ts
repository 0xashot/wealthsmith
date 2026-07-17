/**
 * jupiterLendTeamDisclosureAmendment — Step 16H-R.1b. Records official Jupiter design answers to the
 * five open questions, and the on-chain collateral enumeration they made necessary.
 *
 * THE CAVEAT THAT GOVERNS EVERYTHING BELOW
 * ---------------------------------------
 * These are DESIGN answers from documentation and the team — source class 2 (primary/official,
 * SELF-REPORTED). They describe how the code is MEANT to work. They cannot be cross-checked against the
 * deployed binary, because no live program is a verified build and no Rust source is published. A
 * team's description of the design is not the deployed logic. Every fact here carries that limitation;
 * none of it converts to a verified-binary fact.
 *
 * WHAT WAS RESOLVED (at design level)
 * -----------------------------------
 *   • THE LOSS WATERFALL — the mandatory artifact that blocked readiness. Now known: borrower default
 *     → liquidation → 10% protocol reserves absorb first (NOT a guaranteed insurance fund) → any
 *     remainder reduces the jlUSDC redemption value PROPORTIONALLY. No lender seniority. Loss appears
 *     as a SHARE-PRICE DECLINE, not an admin instruction — which is exactly why the 16H-S.1 scan found
 *     no socialize_loss equivalent, and why the correct incident technique is share-price monotonicity.
 *   • ISOLATION — per BORROWED ASSET, not per risk. jlUSDC is isolated from jlSOL etc., but a USDC
 *     supplier bears the AGGREGATE default risk of every collateral type that borrows USDC.
 *   • REWARDS — the empty rewards array is correct: there is no separate reward token. All yield is
 *     borrower interest, 90/10 split (10% reserve factor). The 0.70% rewardsRate is an API
 *     decomposition artifact, not a distribution.
 *
 * WHAT THE ANSWERS DID NOT RESOLVE
 * --------------------------------
 *   • The exact accounting timing of a loss (team: "docs do not specify").
 *   • Whether the 10% reserve is ever sufficient (team: "not confirmed as an insurance fund").
 *   • The exact semantics of pause_user / update_user_withdrawal_limit (team: "not documented").
 *   • A complete authority matrix proving no authority can reduce a lender claim (team: "not provided").
 *   • Whether the 2026-07-16 stack redeploy was routine or incident response (team: "indeterminate
 *     from timing"; on-chain-resolvable with deployment-tx inspection, not done here).
 *
 * THE ON-CHAIN FINDING THE ISOLATION ANSWER FORCED
 * ------------------------------------------------
 * "Isolated by market" sounds narrow. On-chain, the USDC liquidity layer backs 19 borrow vaults —
 * so a jlUSDC supplier is exposed to 19 collateral types, INCLUDING tokenized equities and a recursive
 * Jupiter-Lend receipt token. That is broad, not narrow, and it is materially UNFAVORABLE evidence the
 * clean-sounding answer obscured.
 *
 * NO SCORES. NO ASSESSMENT. Package remains not_ready — now on ONE narrow blocker (incident_history),
 * not four.
 */
import { JUP_DIMENSION_EVIDENCE, JUP_PACKAGE_MANIFEST_HASH, type JupDimensionEvidence, type JupReadinessResult } from "./jupiterLendUsdcRiskEvidencePackage";

export const TEAM_DISCLOSURE_VERSION = "1.0.0" as const;
export const TEAM_DISCLOSURE_ID = "jupiter_lend_team_disclosure_amendment_v1" as const;

export const SOURCE_CLASSIFICATION = {
  sourceClass: 2,
  sourceClassName: "primary/official, self-reported",
  medium: "documentation + team answers",
  binaryVerified: false,
  binaryVerifiedNote: "Cannot be cross-checked against the deployed binary: no verified build, no published Rust source. Design description ≠ deployed logic.",
  authoritativeFor: "what it admits about the intended design",
  silentOn: "anything the docs omit, and any divergence between the design and the running binary",
  usableButBounded: true,
} as const;

/* ------------------------------------------------------------------ *
 * 1. The five answers
 * ------------------------------------------------------------------ */

export const TEAM_ANSWERS = [
  {
    q: "loss isolation",
    answer: "Bad debt is isolated to the affected Jupiter Lend market and cannot propagate to separate markets. Within that market, the shared liquidity pool means its Earn depositors (jlUSDC holders) are exposed to that pool's borrower-default risk.",
    resolves: "isolation topology — per BORROWED ASSET",
    resolutionLevel: "design",
    caveat: "Isolation is per liquidity asset (USDC vs SOL), NOT per collateral or per vault. See COLLATERAL_UNIVERSE_ONCHAIN: within the USDC pool, 19 collateral types share the risk.",
  },
  {
    q: "loss absorption / waterfall",
    answer: "Direct effect: bad debt reduces the jlUSDC redemption value if reserves do not cover it. Jupiter Lend retains 10% of borrower interest as protocol reserves (safety-margin, not a confirmed insurance fund). No lender seniority or loss-waterfall hierarchy; lenders in the affected pool bear default risk proportionally. Docs do not specify exact accounting timing.",
    resolves: "the supplier loss waterfall — the mandatory readiness artifact",
    resolutionLevel: "design",
    caveat: "Confirms loss manifests as SHARE-PRICE DECLINE, not an admin write-down instruction — validating the 16H-S.1 finding of no socialize_loss equivalent. Exact timing and reserve sufficiency undocumented.",
  },
  {
    q: "pause_user / update_user_withdrawal_limit powers",
    answer: "Withdrawal ceilings are documented liquidity-risk controls (limit instant outflow, expand over time). The exact semantics of pause_user and update_user_withdrawal_limit are NOT documented. Curators cannot custody or move user funds; market risk including bad debt is isolated by market. No complete authority matrix or loss waterfall proving no authority can reduce a lender claim.",
    resolves: "partial — a favorable 'curators cannot move funds' design statement",
    resolutionLevel: "design_partial",
    caveat: "Defensible: no DOCUMENTED authority can arbitrarily confiscate a claim — but the exact powers of the two per-user instructions remain undocumented, and no complete authority matrix was provided.",
  },
  {
    q: "2026-07-16 stack redeploy — routine or incident?",
    answer: "Indeterminate from timing alone. Jupiter's docs do not publish deployment cadence, redeployment history, or incident labels. Coordinated upgrades and dynamic risk-parameter changes are supported; a 5.4-hour cluster does not by itself indicate an emergency.",
    resolves: "nothing — correctly indeterminate",
    resolutionLevel: "unresolved",
    caveat: "On-chain-resolvable with deployment-transaction and upgrade-authority-action inspection plus any contemporaneous release note. Not performed here.",
  },
  {
    q: "rewardsRate 0.70% vs empty rewards array",
    answer: "Lender yield is borrower interest: lenders receive 90%, 10% goes to protocol reserves (reserve factor). Accrual is continuous and compounded into the jlUSDC redemption value — not a manually claimed or fixed-period reward. Docs do not define the rewardsRate API field.",
    resolves: "the rewards contradiction",
    resolutionLevel: "design",
    caveat: "The empty rewards array is CORRECT: there is no separate reward token. 0.70% is an API decomposition/metric artifact, not a distribution. Corroborates the 10% reserve factor from answer 2.",
  },
] as const;

/* ------------------------------------------------------------------ *
 * 2. Isolation reconciled + on-chain collateral universe
 * ------------------------------------------------------------------ */

export const ISOLATION_RECONCILED = {
  teamSaid: "isolated by market; only the affected pool's depositors are exposed",
  onChainArchitecture: "a single shared liquidity layer (jupeiUmn…) holds all ~428.6M USDC; borrow vaults draw from it",
  apparentTension: "'isolated' vs 'one shared pool' — resolved, not contradictory",
  reconciliation:
    "Isolation is per LIQUIDITY ASSET. jlUSDC (the USDC liquidity layer) is isolated from jlSOL, jlUSDT, etc. — a SOL-collateral loss in a SOL-borrow vault does not touch USDC lenders. But EVERY vault that borrows USDC draws on the same USDC liquidity layer, so a USDC supplier bears the aggregate default risk of ALL USDC-borrowing collateral. 'Isolated by market' isolates by borrowed asset, not by collateral or by risk.",
  practicalExposureIsBroadNotNarrow: true,
} as const;

/** The USDC-borrowing collateral set, enumerated from the official borrow API. */
export const COLLATERAL_UNIVERSE_ONCHAIN = {
  source: "official borrow/vaults API",
  totalBorrowVaults: 79,
  usdcBorrowingVaults: 19,
  meaning: "A jlUSDC supplier is exposed to borrower default across all 19, via the shared USDC liquidity layer.",
  collateralTypes: ["WSOL", "syrupUSDC", "JLP", "xBTC", "cbBTC", "JupSOL", "JitoSOL", "WBTC", "JUP", "LBTC", "INF", "PST", "mSOL", "dfdvSOL", "jlJUPUSD", "TSLAx", "SPYx", "QQQx", "NVDAx"],
  riskNotableCollateral: {
    tokenizedEquities: { assets: ["TSLAx", "SPYx", "QQQx", "NVDAx"], concern: "off-hours trading, settlement/oracle risk, gap risk — a USDC supplier is exposed to leveraged tokenized-stock positions" },
    reflexive: { assets: ["JLP"], concern: "Jupiter's own LP token backs USDC borrows on Jupiter's own lending market — correlated protocol risk" },
    recursive: { assets: ["jlJUPUSD"], ltv: "89%", concern: "a Jupiter-Lend receipt token used as collateral at 89% LTV — a leverage loop inside the same protocol" },
    longTail: { assets: ["JUP", "PST", "INF", "dfdvSOL"], concern: "governance and long-tail assets" },
  },
  materiality:
    "This is UNFAVORABLE evidence the 'isolated by market' answer obscured. The collateral-side oracle exposure that 16H-R.1 flagged as unexamined is now partly enumerated: 19 collateral oracles including four equity feeds and a recursive receipt token. Per-collateral parameters (factors, thresholds, penalties, caps) were NOT extracted.",
  stillUnresolved: ["per-collateral liquidation parameters and caps", "each collateral's oracle feed and staleness config", "concentration — how much USDC each vault has actually drawn"],
} as const;

/* ------------------------------------------------------------------ *
 * 3. Loss waterfall — design-resolved
 * ------------------------------------------------------------------ */

export const LOSS_WATERFALL_DESIGN_RESOLVED = {
  resolvedAtDesignLevel: true,
  binaryVerified: false,
  waterfall: [
    { step: 1, event: "borrower position becomes unhealthy" },
    { step: 2, event: "liquidation (keeper-driven, Chainlink Data Streams priced)" },
    { step: 3, event: "if collateral insufficient → bad debt recognized in the affected USDC pool" },
    { step: 4, event: "10% protocol reserves (reserve factor) absorb first — NOT a confirmed insurance fund, no guarantee of full absorption" },
    { step: 5, event: "any remainder reduces the jlUSDC redemption value PROPORTIONALLY across pool suppliers" },
  ],
  seniority: "none — proportional, no lender waterfall hierarchy",
  lossMechanism: "share-price decline (convertToAssets falls), NOT an admin instruction",
  confirmsSocializeLossFinding: "16H-S.1 found no socialize_loss-equivalent instruction. This answer explains why: loss is economic (share price), not an admin action. The two findings corroborate.",
  correctIncidentTechnique: "share-price (convertToAssets) monotonicity — any historical decline is a dated loss event. The only remaining incident-scan technique for this product.",
  residualGaps: ["exact accounting timing (team: docs do not specify)", "whether the 10% reserve is ever sufficient", "NONE of this is verified against the deployed binary"],
} as const;

/* ------------------------------------------------------------------ *
 * 4. Readiness re-evaluation
 * ------------------------------------------------------------------ */

/** loss_waterfall now design-resolved; incident_history still insufficient. */
export const MANDATORY_ARTIFACTS_V2 = [
  { id: "loss_waterfall", resolved: true, basis: "design-level, primary self-reported source; NOT binary-verified. The gate required the waterfall be KNOWN so a scorer does not guess — it is now a sourced design fact, not a guess. Binary-verification is a SEPARATE fact belonging to audit_security, not a reason to keep this unresolved (that would double-count one gap)." },
] as const;

/**
 * The dimension state as of 16H-R.1b: the R.1a reclassification (audit_security, manager_discretion,
 * oracle_risk → scoreable) carried forward, with incident_history still the sole insufficient
 * dimension. This is DATA the evaluator reads — the evaluator does NOT hardcode the verdict.
 */
export const DIMENSION_STATE_V3: JupDimensionEvidence[] = JUP_DIMENSION_EVIDENCE.map((d) => {
  if (d.dimensionId === "incident_history") return { ...d, readiness: "insufficient", scoreable: false };
  return { ...d, readiness: d.readiness === "insufficient" ? "partial" : d.readiness, scoreable: true };
});

/** Genuine evaluator: reads `scoreable` from each dim and `resolved` from each mandatory artifact. */
export function evaluateReadinessV3(dims: JupDimensionEvidence[] = DIMENSION_STATE_V3, mandatory: readonly { id: string; resolved: boolean }[] = MANDATORY_ARTIFACTS_V2): JupReadinessResult {
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
      ...unresolvedMandatory.map((m) => `MANDATORY ARTIFACT UNRESOLVED: ${m}`),
      ...(insufficient.length ? ["incident_history INSUFFICIENT — no incident search completed; the correct technique (share-price monotonicity) is deferred because the pool is ~1.4 days old, and its short history is youth, not a clean record"] : []),
    ],
  };
}

export const READINESS_V3 = evaluateReadinessV3();

export const READINESS_V3_RATIONALE = {
  priorReadiness: "not_ready_for_automated_assessment (16H-R.1a: 1 insufficient dim + loss_waterfall mandatory)",
  newReadiness: READINESS_V3.readiness,
  verdictUnchanged: true,
  whatMoved: "The mandatory loss_waterfall is now design-resolved (a real, sourced waterfall). The package is now blocked on ONE thing — incident_history — where before it was blocked on that PLUS the waterfall.",
  oneNarrowStepFromReady:
    "Running the share-price monotonicity scan over the pool's life would make incident_history scoreable (a bounded 'no loss event in the pool's ~N-day life') and flip the package to ready. Deferred because the pool is days old, so the scan yields youth, not evidence.",
  butReadyIsNotSuitable:
    "Even ready, the honest expectation is Jupiter scores below 7 — same category constraints as Kamino, plus days-old fund-holding binaries, one 4-of-8 over 6 programs, 19-collateral exposure including tokenized equities and a recursive receipt token, and NO verified build. Readiness would let it be scored; it would not make it eligible.",
  theCaveatThatDoesNotResolve:
    "The loss waterfall is design-resolved but binary-UNverified. A scorer must treat every design fact here as self-reported and uncheckable against the running code. That single gap keeps audit_security weak regardless of how complete the design picture becomes.",
} as const;

/* ------------------------------------------------------------------ *
 * 5. Evidence + manifest
 * ------------------------------------------------------------------ */

export const TEAM_DISCLOSURE_EVIDENCE = {
  evidenceId: TEAM_DISCLOSURE_ID,
  version: TEAM_DISCLOSURE_VERSION,
  step: "16H-R.1b",
  candidateId: "jupiter_lend_usdc",
  amendsManifest: JUP_PACKAGE_MANIFEST_HASH,
  preparerId: "claude_automated_evidence_preparer",
  preparationRole: "evidence_preparer" as const,
  preparerIsNotScorer: true,
  evidenceTimestamp: "2026-07-17T14:05:00.000Z",
  sourceClass: SOURCE_CLASSIFICATION.sourceClass,
  whatChanged: [
    "Recorded five official design answers (source class 2, self-reported, NOT binary-verified).",
    "Loss waterfall design-resolved: default → liquidation → 10% reserve → proportional jlUSDC share-price decline, no seniority.",
    "Isolation reconciled: per borrowed asset; a USDC supplier bears aggregate risk of 19 collateral types.",
    "Enumerated the USDC collateral universe on-chain: 19 types incl. TSLAx/SPYx/QQQx/NVDAx (equities), JLP (reflexive), jlJUPUSD @ 89% LTV (recursive).",
    "Rewards contradiction resolved: no separate rewards; 90/10 interest; 0.70% is an API artifact.",
    "loss_waterfall mandatory artifact → resolved (design level); incident_history now the sole blocker.",
  ],
  whyItChanged: "The product owner obtained official answers to the five open questions; the loss waterfall was the mandatory readiness blocker.",
  scoresAssigned: false,
  historyRewritten: false,
  invalidationTriggers: [
    "a verified build or Rust source is published (would convert design facts to binary facts)",
    "the collateral set or per-collateral parameters change",
    "a share-price decline is observed (a loss event)",
    "the incident share-price scan completes",
  ],
} as const;

export function computeTeamDisclosureHash(e: typeof TEAM_DISCLOSURE_EVIDENCE = TEAM_DISCLOSURE_EVIDENCE): string {
  const material = JSON.stringify({
    id: e.evidenceId, v: e.version, s: e.step, c: e.candidateId,
    n: COLLATERAL_UNIVERSE_ONCHAIN.usdcBorrowingVaults, r: READINESS_V3.readiness,
    lw: LOSS_WATERFALL_DESIGN_RESOLVED.resolvedAtDesignLevel,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `jup_team_disclosure_${h.toString(16).padStart(8, "0")}`;
}

export const TEAM_DISCLOSURE_HASH = computeTeamDisclosureHash();

export const TEAM_DISCLOSURE_CONFERS = {
  confers: ["a design-level loss waterfall", "an enumerated USDC collateral universe", "resolution of the rewards contradiction", "a package one narrow step from ready"],
  doesNotConfer: [
    "a binary-verified fact", "a risk score", "an aggregate", "readiness", "human review", "signoff",
    "product approval", "recommendation eligibility", "a production card", "execution", "a clean record",
  ],
  scoresAssigned: false,
  readinessStillNotReady: true,
  binaryStillUnverified: true,
  kaminoAssessmentChanged: false,
  transactionConstructedOrSimulated: false,
} as const;

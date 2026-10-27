/**
 * vettingState — canonical content for the Trust → Vetting page: the Security-
 * scores matrix with the REAL recorded outcome for every protocol and product
 * WealthSmith has vetted. Rows are sorted by protocol name.
 *
 * USER-FACING NUMBERS BY EXPLICIT PRODUCT DECISION — see
 * suggestions/riskScoreExposurePolicy.ts → VETTING_SECURITY_SCORE_EXCEPTION
 * (product owner, 2026-08-11). This page is the ONLY surface allowed to show
 * them, always under the label "Security score", never "risk score".
 *
 * Every number is copied verbatim from the recorded assessments:
 *   K-Lend        — klendDirectUsdcAutomatedAssessment (aggregate 5.93)
 *   Steakhouse    — steakhouseAutomatedAssessment (aggregate 5.37)
 *   Jupiter Lend  — jupiterLendUsdcProvisionalAssessment + the incident-history
 *                   amendment that completes it (4.22, not passed)
 *   INF           — infRubricV1AutomatedAssessment (6.02, not passed on review)
 *   mSOL          — msolRubricV1AutomatedAssessment (6.34, not passed on review)
 *   JupSOL        — jupsolRubricV1AutomatedAssessment (6.77, not passed on review)
 *   bSOL          — bsolRubricV1AutomatedAssessment (6.95, not passed on review)
 *   JitoSOL       — jitosolRubricV1AutomatedAssessment (7.16, passed on review;
 *                   original beta approval 7.75 remains on record)
 *   Meteora       — meteoraRubricV1AutomatedAssessment (5.83, not passed on review)
 *   Orca          — orcaRubricV1AutomatedAssessment (6.71, not passed on review)
 *   Raydium       — raydiumRubricV1AutomatedAssessment (6.03, not passed on review)
 *   Native staking — nativeStakingRubricV1AutomatedAssessment (8.19, passed on review)
 * Results mirror the recorded governance conclusions (approvals, signoffs,
 * reviews). Update this file whenever a governance record changes; it is
 * display copy, not a live read — the page imports no scoring module.
 *
 * The full irregular-case context (category-floor approval, unknown dimension,
 * reopen conditions) lives in each assessment module's decision record; the page
 * shows the score reasoning through the drawer's per-dimension details.
 */

export const VETTING_TITLE = "Vetting";
export const VETTING_DESCRIPTION =
  "Every protocol and product WealthSmith may recommend goes through an evidence-based security review. Here you can see our current assessment, the security score we recorded, and whether we consider the product suitable for WealthSmith recommendations.";

/** The recorded governance outcome. Kept in the data as the canonical record —
 *  deliberately NOT rendered anywhere on the page. */
export type VettingStatus = "passed" | "not_passed" | "in_review" | "not_vetted";

/* ---------- Security scores (per-dimension matrix) ---------- */

/** Accessible name for the table + section — no visible heading is rendered. */
export const VETTING_SCORES_TITLE = "Security scores";

/** The current 12-dimension rubric — column order, labels, weights (internal),
 *  and the plain-language explanation behind each header's info icon. */
export const SECURITY_SCORE_DIMENSIONS: readonly { id: string; label: string; weight: number; info?: string }[] = [
  {
    id: "audit_security", label: "Audits", weight: 15,
    info: "Whether the exact program running on-chain has credible, independent security audits — and whether the deployed code can be tied to what was audited.",
  },
  {
    id: "maturity", label: "Maturity", weight: 8,
    info: "How long the product has been live in production and trusted with funds.",
  },
  {
    id: "upgrade_admin_authority", label: "Admin authority", weight: 15,
    info: "Who can upgrade or reconfigure the program, and what limits — like multisigs and timelocks — constrain them.",
  },
  {
    id: "manager_discretion", label: "Manager discretion", weight: 12,
    info: "How much freedom a manager has to redirect or reallocate user funds without notice.",
  },
  {
    id: "strategy_complexity", label: "Complexity", weight: 10,
    info: "How many moving parts the strategy has. Simpler strategies have fewer ways to fail.",
  },
  {
    id: "composability_dependency", label: "Dependencies", weight: 8,
    info: "How many other programs and protocols the product relies on to work correctly.",
  },
  {
    id: "oracle_risk", label: "Oracles", weight: 8,
    info: "Where the product gets its prices, and how it protects against stale or manipulated data.",
  },
  {
    id: "liquidity_withdrawal", label: "Liquidity", weight: 12,
    info: "Whether funds can be withdrawn on demand, and what an exit depends on.",
  },
  {
    id: "asset_stablecoin_risk", label: "Asset exposure", weight: 5,
    info: "The risk of the underlying asset itself — for example, whether a stablecoin can hold its peg.",
  },
  {
    id: "withdrawal_fee_transparency", label: "Fees", weight: 3,
    info: "Whether every fee and withdrawal cost is clearly disclosed up front.",
  },
  {
    id: "operational_dependency_risk", label: "Operations", weight: 2,
    info: "How much the product depends on off-chain operators, data feeds, and infrastructure.",
  },
  {
    id: "incident_history", label: "Incidents", weight: 2,
    info: "Past exploits, outages, or losses — and whether that history could be verified from primary sources.",
  },
];

export interface SecurityScoreRow {
  protocol: string;
  icon: string;
  /** The exact product that was vetted — vetting is per product, not per brand. */
  product: string;
  /** Per-dimension numbers; "?" = could not be established; absent = not scored. */
  scores: Partial<Record<string, number | "?">>;
  /** The recorded aggregate ("7.75", "4.12–4.32") or "—" when nothing was assessed. */
  total: string;
  result: VettingStatus;
  /** The recorded assessment/approval date ("Jul 18, 2026"); "—" when nothing was assessed.
   *  Sources: governance approval timestamps, assessment cutoffs, evidence-confirmation
   *  dates — the same modules the scores come from. */
  vettedOn: string;
  /** Shown in a hover popover on the Result badge — the main recorded reason for the outcome. */
  resultReason?: string;
}

/** Sorted by protocol name (then product) — display order is alphabetical, never a ranking. */
export const VETTING_SCORE_ROWS: readonly SecurityScoreRow[] = [
  {
    // Rubric-v1 assessment + product-owner verdict (bsolRubricV1AutomatedAssessment,
    // 2026-08-11) — replaces the retired draft-rubric score (7.35).
    protocol: "BlazeStake", icon: "blazestake", product: "bSOL liquid staking",
    scores: {
      audit_security: 7, maturity: 7, upgrade_admin_authority: 6, manager_discretion: 8,
      strategy_complexity: 8, composability_dependency: 7, oracle_risk: 7, liquidity_withdrawal: 7,
      asset_stablecoin_risk: 8, withdrawal_fee_transparency: 4, operational_dependency_risk: 5, incident_history: 5,
    },
    total: "6.95", result: "not_passed", vettedOn: "Aug 11, 2026",
    resultReason:
      "BlazeStake scored 6.95. The main concerns were that we could not verify the claimed multi-signature control over program upgrades, and the published fee information did not match the deployed configuration. The official docs state a 0% epoch fee, while the live configuration charges 5% of staking rewards.",
  },
  {
    // Rubric-v1 assessment + product-owner signoff (jitosolRubricV1AutomatedAssessment,
    // 2026-08-11) — the current basis, replacing the aggregate-only beta display (7.75).
    protocol: "Jito", icon: "jito", product: "JitoSOL liquid staking",
    scores: {
      audit_security: 7, maturity: 8, upgrade_admin_authority: 6, manager_discretion: 8,
      strategy_complexity: 7, composability_dependency: 7, oracle_risk: 7, liquidity_withdrawal: 8,
      asset_stablecoin_risk: 8, withdrawal_fee_transparency: 7, operational_dependency_risk: 6, incident_history: 5,
    },
    total: "7.16", result: "passed", vettedOn: "Aug 11, 2026",
    resultReason:
      "Jito scored 7.16 in our 12-dimension review. We verified that its deployed program matches the official release, its published fees match the live configuration, its validator delegation process is documented on-chain, and it had the strongest exit liquidity among the liquid staking options we reviewed.",
  },
  {
    // Rubric-v1 assessment + product-owner verdict (jupsolRubricV1AutomatedAssessment,
    // 2026-08-11) — replaces the retired draft-rubric score (7.65).
    protocol: "Jupiter", icon: "jupiter", product: "JupSOL liquid staking",
    scores: {
      audit_security: 6, maturity: 7, upgrade_admin_authority: 6, manager_discretion: 7,
      strategy_complexity: 8, composability_dependency: 7, oracle_risk: 7, liquidity_withdrawal: 7,
      asset_stablecoin_risk: 8, withdrawal_fee_transparency: 7, operational_dependency_risk: 5, incident_history: 5,
    },
    total: "6.77", result: "not_passed", vettedOn: "Aug 11, 2026",
    resultReason:
      "JupSOL scored 6.77 in our review. Its published fees matched the deployed configuration, but two areas reduced the score: JupSOL uses Sanctum’s modified version of the SPL Stake Pool program, and we could not verify an independent audit or reproducible build for those changes. In addition, all JupSOL stake is currently delegated to a single validator.",
  },
  {
    protocol: "Jupiter", icon: "jupiter", product: "Jupiter Lend USDC",
    scores: {
      audit_security: 4, maturity: 3, upgrade_admin_authority: 4, manager_discretion: 4,
      strategy_complexity: 5, composability_dependency: 4, oracle_risk: 4, liquidity_withdrawal: 4,
      asset_stablecoin_risk: 8, withdrawal_fee_transparency: 4, operational_dependency_risk: 3, incident_history: 5,
    },
    total: "4.22", result: "not_passed", vettedOn: "Aug 11, 2026",
    resultReason:
      "The biggest limitation was verification: we could not confirm that the deployed program binaries match publicly available source code. Because that affects our ability to independently examine how the product works, many other areas of the assessment also carry lower confidence.",
  },
  {
    // Display-generalized to "Kamino Vaults": the blocking findings are PROGRAM-LEVEL
    // (the shared kvault layer), assessed via the largest vault (Steakhouse USDC —
    // steakhouseAutomatedAssessment). Footnote g records the basis.
    protocol: "Kamino", icon: "kamino", product: "Kamino Vaults",
    scores: {
      audit_security: 5, maturity: 4, upgrade_admin_authority: 7, manager_discretion: 4,
      strategy_complexity: 5, composability_dependency: 5, oracle_risk: 6, liquidity_withdrawal: 5,
      asset_stablecoin_risk: 8, withdrawal_fee_transparency: 7, operational_dependency_risk: 5, incident_history: 4,
    },
    total: "5.37", result: "not_passed", vettedOn: "Jul 16, 2026",
    resultReason:
      "The main concerns were an unaudited component that can move user funds, a single administrator key with no timelock controlling how the vault allocates assets, and a withdrawal design that does not maintain a dedicated liquidity buffer.",
  },
  {
    protocol: "Kamino", icon: "kamino", product: "SOL/BTC Market",
    scores: {
      audit_security: 6, maturity: 4, upgrade_admin_authority: 7, manager_discretion: 5,
      strategy_complexity: 6, composability_dependency: 6, oracle_risk: 5, liquidity_withdrawal: 6,
      asset_stablecoin_risk: 8, withdrawal_fee_transparency: 8, operational_dependency_risk: 6, incident_history: 5,
    },
    total: "5.93", result: "passed", vettedOn: "Jul 18, 2026",
    resultReason:
      "Unlike the other products, we assessed it specifically as a direct USDC lending destination rather than against the broader standard used for vaults and staking products. The review covered the exact USDC reserve, its lending mechanics, controls, liquidity, and risk evidence, followed by a separate human risk review. It is currently the USDC lending destination WealthSmith uses for excess USDC.",
  },
  {
    // Rubric-v1 assessment + product-owner verdict (msolRubricV1AutomatedAssessment,
    // 2026-08-11) — replaces the retired draft-rubric score (7.40).
    protocol: "Marinade", icon: "marinade", product: "mSOL liquid staking",
    scores: {
      audit_security: 6, maturity: 7, upgrade_admin_authority: 6, manager_discretion: 6,
      strategy_complexity: 6, composability_dependency: 7, oracle_risk: 7, liquidity_withdrawal: 6,
      asset_stablecoin_risk: 8, withdrawal_fee_transparency: 8, operational_dependency_risk: 5, incident_history: 4,
    },
    total: "6.34", result: "not_passed", vettedOn: "Aug 11, 2026",
    resultReason:
      "The main concerns were a confirmed delegation bug that resulted in about 37,000 SOL of missed staking rewards without a published postmortem, and weaker exit liquidity at larger sizes — our 50,000 mSOL test found no viable market route. Its documented 0% fee on staking rewards matched the on-chain configuration.",
  },
  {
    // Rubric-v1 assessment + product-owner verdict (meteoraRubricV1AutomatedAssessment,
    // 2026-08-11) — the first protocol vetted from a cold start (no prior evidence).
    protocol: "Meteora", icon: "meteora", product: "Liquidity pools",
    scores: {
      audit_security: 6, maturity: 7, upgrade_admin_authority: 5, manager_discretion: 6,
      strategy_complexity: 5, composability_dependency: 5, oracle_risk: 7, liquidity_withdrawal: 7,
      asset_stablecoin_risk: 5, withdrawal_fee_transparency: 7, operational_dependency_risk: 4, incident_history: 3,
    },
    total: "5.83", result: "not_passed", vettedOn: "Aug 11, 2026",
    resultReason:
      "The main concerns were the built-in risk of impermanent loss in liquidity pools, the use of external lending protocols for idle liquidity, and an upgrade authority whose control structure we could not verify. We also noted an active class-action lawsuit involving the operator related to the LIBRA and MELANIA events. We found no documented smart-contract exploit affecting Meteora itself.",
  },
  {
    // Rubric-v1 assessment + product-owner verdict (orcaRubricV1AutomatedAssessment,
    // 2026-08-11) — cold-start vetting; the only active verified build assessed.
    protocol: "Orca", icon: "orca", product: "Liquidity pools",
    scores: {
      audit_security: 7, maturity: 7, upgrade_admin_authority: 6, manager_discretion: 7,
      strategy_complexity: 6, composability_dependency: 7, oracle_risk: 7, liquidity_withdrawal: 8,
      asset_stablecoin_risk: 5, withdrawal_fee_transparency: 7, operational_dependency_risk: 6, incident_history: 5,
    },
    total: "6.71", result: "not_passed", vettedOn: "Aug 11, 2026",
    resultReason:
      "Its strongest area was code security: the deployed program has a verified build, has been reviewed through six audits, and we found no documented exploit in more than four years of operation. The main concerns were structural: concentrated liquidity positions are exposed to impermanent loss, which can become more significant when price moves outside the selected range, and we could not verify how Orca’s program upgrade authority is controlled.",
  },
  {
    // Rubric-v1 assessment + product-owner verdict (raydiumRubricV1AutomatedAssessment,
    // 2026-08-11) — cold-start vetting; the only confirmed-exploit record on the board.
    protocol: "Raydium", icon: "raydium", product: "Liquidity pools",
    scores: {
      audit_security: 6, maturity: 7, upgrade_admin_authority: 5, manager_discretion: 6,
      strategy_complexity: 5, composability_dependency: 6, oracle_risk: 7, liquidity_withdrawal: 8,
      asset_stablecoin_risk: 5, withdrawal_fee_transparency: 7, operational_dependency_risk: 4, incident_history: 3,
    },
    total: "6.03", result: "not_passed", vettedOn: "Aug 11, 2026",
    resultReason:
      "The main concerns were two confirmed fund-loss incidents — about $5.5M in December 2022, which was remediated and compensated, and about $1.34M in June 2026 involving retired legacy pools, with no official postmortem published. LP positions also carry impermanent loss by design, and we could not verify the control structure of the upgrade authority for the recently deployed program version.",
  },
  {
    // Rubric-v1 assessment + product-owner verdict (infRubricV1AutomatedAssessment,
    // 2026-08-11) — replaces the retired draft-rubric score (6.95). Closes the board.
    protocol: "Sanctum", icon: "sanctum", product: "INF multi-LST pool",
    scores: {
      audit_security: 6, maturity: 7, upgrade_admin_authority: 6, manager_discretion: 6,
      strategy_complexity: 5, composability_dependency: 5, oracle_risk: 7, liquidity_withdrawal: 6,
      asset_stablecoin_risk: 7, withdrawal_fee_transparency: 7, operational_dependency_risk: 5, incident_history: 5,
    },
    total: "6.02", result: "not_passed", vettedOn: "Aug 11, 2026",
    resultReason:
      "The main concerns were that we could not reproduce the deployed program from its published source, and that Infinity inherits the risks of the liquid staking tokens it holds, including several with weaker individual assessments. Its own audit coverage, on-chain pricing, and diversification across multiple staking tokens were clear strengths.",
  },
  {
    // Rubric-v1 assessment + product-owner signoff (nativeStakingRubricV1AutomatedAssessment,
    // 2026-08-11) — replaces the retired draft-rubric score (7.10); confirms the 14T approval.
    protocol: "Solana", icon: "sol", product: "Native validator staking",
    scores: {
      audit_security: 8, maturity: 9, upgrade_admin_authority: 9, manager_discretion: 8,
      strategy_complexity: 9, composability_dependency: 8, oracle_risk: 9, liquidity_withdrawal: 7,
      asset_stablecoin_risk: 8, withdrawal_fee_transparency: 8, operational_dependency_risk: 5, incident_history: 6,
    },
    total: "8.19", result: "passed", vettedOn: "Aug 11, 2026",
    resultReason:
      "Solana Native Validator Staking scored 8.19 in our review, the highest score on the board. Its structure removes several layers of protocol risk: staking uses Solana’s native stake program, with no upgrade authority, manager, wrapper token, external pricing mechanism, or additional protocol fees. We verified the validator’s 5% commission and 12.48M SOL delegated stake on-chain. The main trade-offs are that withdrawals require waiting roughly one epoch and all staking rewards depend on the performance of a single validator.",
  },
];

/* ---------- Detail drawer copy ---------- */

export const VETTING_DRAWER_SCORE_LABEL = "Security score";
export const VETTING_DRAWER_DATE_LABEL = "Vetting date";
export const VETTING_DRAWER_BREAKDOWN_TITLE = "Score by dimension";
export const VETTING_DRAWER_NO_BREAKDOWN =
  "No per-dimension record exists for this product yet.";
export const VETTING_DRAWER_WHY_LABEL = "Why this score";
export const VETTING_DRAWER_HELD_LABEL = "What holds it back";

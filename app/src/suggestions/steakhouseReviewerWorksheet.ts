/**
 * steakhouseReviewerWorksheet — Step 16H-K. The EMPTY human-review worksheet for the exact Steakhouse
 * USDC vault, plus the migration report for every existing risk score.
 *
 * Every score/rationale/confidence/reviewer field below is deliberately EMPTY. Claude prepared the
 * evidence and the structure; a human fills the judgement. No default is suggested, because a suggested
 * default is an anchor, and an anchor is a score by another name.
 */
import { getProposedRiskRubricV1, type RiskRubricV1DimensionId, type RiskReviewState } from "./riskGovernance";
import { listSteakhouseRiskEvidence, STEAKHOUSE_RISK_EVIDENCE_VERSION, STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT } from "./steakhouseUsdcRiskEvidence";
import { KVAULT_CAPACITY_SOURCE } from "./kaminoVaultCapacitySemantics";

export const STEAKHOUSE_REVIEWER_WORKSHEET_EXISTS = true;
export const RISK_SCORE_MIGRATION_REPORT_EXISTS = true;
export const STEAKHOUSE_WORKSHEET_VERSION = "1.0.0" as const;

/** The EXACT product this worksheet is bound to. A worksheet for one vault is useless for another. */
export const WORKSHEET_BINDING = {
  strategyId: "kamino_steakhouse_usdc",
  productAddress: "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E",
  sharesMint: "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS",
  depositMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  programId: "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd",
  productType: "managed_vault",
  evidencePackageVersion: STEAKHOUSE_RISK_EVIDENCE_VERSION,
  evidenceCutoffAt: STEAKHOUSE_RISK_EVIDENCE_CUTOFF_AT,
  capacitySemanticsSource: `${KVAULT_CAPACITY_SOURCE.repo} ${KVAULT_CAPACITY_SOURCE.release} @ ${KVAULT_CAPACITY_SOURCE.commit}`,
  marketCacheAdapterVersion: "kamino_vault_sdk_v1@1.0.0",
  rubricId: "protocol_risk_rubric_v1",
  rubricSemver: "1.0.0",
  rubricLifecycle: "proposed_for_approval",
} as const;

/** Vaults this worksheet must never be reused for. Reuse is a category error, not a shortcut. */
export const WORKSHEET_REJECTED_PRODUCTS: Record<string, string> = {
  BEEfo7xwgK2ZP13Pxo7qqTPzAteKJmXjVWtMWcXSvbn2: "Steakhouse High Yield USDC",
  JDmkiqvtyAqAsqrLGDgVH2GesbRAAMJCoQtqiyWx82bF: "Steakhouse USDC Testing",
  kamino_usdc_lending: "Kamino USDC Lending (a different product)",
};

export interface WorksheetDimensionRow {
  dimensionId: RiskRubricV1DimensionId;
  label: string;
  weight: number;
  direction: "higher = more evidence-supported";
  anchors: { band: string; range: [number, number]; meaning: string }[];
  /** Evidence ids from the 16H-J package that bear on this dimension. */
  evidenceRefs: string[];
  evidenceSummary: string;
  unresolvedGaps: string[];
  mandatoryBlockersPresent: string[];
  // ---- Reviewer fields. EMPTY. Only a human fills these. ----
  reviewerScore: null;
  reviewerRationale: null;
  reviewerConfidence: null;
  reviewerId: null;
  reviewDate: null;
}

const ev = () => listSteakhouseRiskEvidence();
const refs = (...ids: string[]) => ids;
const gapsFor = (...ids: string[]) => ev().filter((e) => ids.includes(e.evidenceId) && e.sourceType === "not_established").map((e) => e.summary);

/**
 * Build the worksheet. Deterministic: rows come from the proposed rubric, evidence refs from the 16H-J
 * package. Reviewer fields are hard-coded `null` — there is no code path that fills them.
 */
export function buildSteakhouseReviewerWorksheet(): {
  version: typeof STEAKHOUSE_WORKSHEET_VERSION;
  binding: typeof WORKSHEET_BINDING;
  rows: WorksheetDimensionRow[];
  overallScore: null;
  riskBand: null;
  reviewResult: RiskReviewState;
  signoff: null;
  productApproved: false;
  reviewerInstructions: string[];
} {
  const rubric = getProposedRiskRubricV1();

  const EVIDENCE_MAP: Record<RiskRubricV1DimensionId, { refs: string[]; summary: string }> = {
    audit_security: { refs: refs("sh-aud-01", "sh-aud-02", "sh-upg-02"), summary: "Three published Earn Vaults audits (Offside Labs 2025-04-12, Sec3 2025-02-06, OtterSec 2024-12-09) + formal verification, fuzzing, $1.5M bounty. BUT no audited commit is published and the program was upgraded ~2 days before the evidence cutoff, so the deployed bytecode cannot be related to any audited version." },
    maturity: { refs: refs("sh-upg-02", "sh-id-01"), summary: "Vault and program are live on mainnet; lastDeployedSlot 432874668 (~2 days before cutoff) means the current bytecode is very recent, which resets battle-testing regardless of the protocol's overall age." },
    upgrade_admin_authority: { refs: refs("sh-upg-01", "sh-upg-02", "sh-mgr-01", "sh-mgr-02"), summary: "Program is UPGRADEABLE with an ACTIVE upgrade authority (GzFgdRJXmaw…), not immutable. vaultAdminAuthority 9ceRgz… and allocationAdmin CuEC7J… are separate accounts. Multisig/timelock status of all three is UNRESOLVED." },
    manager_discretion: { refs: refs("sh-mgr-01", "sh-mgr-02", "sh-exp-01"), summary: "A managed vault: allocationAdmin can change the reserve allocation. The exact permission set (fees, caps, whitelist, pause, withdrawal, timelocks) is UNRESOLVED." },
    strategy_complexity: { refs: refs("sh-exp-01", "sh-exp-02"), summary: "NOT a plain USDC deposit: a managed allocation across FOUR Kamino lending reserves (~74.2% / ~23.0% / ~1.8% / ~1.0%), changeable by allocationAdmin. No leverage observed in the allocation strategy itself, but reserve-level mechanics are unresolved." },
    composability_dependency: { refs: refs("sh-exp-01", "sh-exp-02"), summary: "Depends on Kamino Lend reserves + Scope oracles. The four reserves' parent markets, collateral sets and audit status are UNRESOLVED." },
    oracle_risk: { refs: refs("sh-orc-01", "sh-exp-02"), summary: "Kamino documents the Scope aggregator (multi-provider, 3 audits) protocol-wide. Which oracles THIS vault's four reserves actually depend on is UNRESOLVED, so a vault-specific oracle model cannot be asserted." },
    liquidity_withdrawal: { refs: refs("sh-liq-01", "sh-liq-02"), summary: "minWithdrawAmount 0.001 USDC. The SDK models queuedForWithdrawalForReserves, so withdrawals may be QUEUED rather than instant — instant liquidity must not be assumed. Exact conditions, cooldown, fees, fee crystallisation on exit and emergency behaviour are UNRESOLVED." },
    asset_stablecoin_risk: { refs: refs("sh-stb-01", "sh-exp-02"), summary: "Principal is canonical Circle USDC (not bridged/wrapped), carrying USDC's inherent issuer-centralisation and freeze risk. Whether the four reserves introduce OTHER asset exposure is UNRESOLVED." },
    withdrawal_fee_transparency: { refs: refs("sh-fee-01"), summary: "On-chain readable: managementFeeBps=0, performanceFeeBps=500 (5%). The SDK's computeNetAPR already deducts both from the netAPY WealthSmith consumes. Who may change them is part of the unresolved permission gap. Reserve-level costs are not represented." },
    operational_dependency_risk: { refs: refs("sh-id-01"), summary: "RESOLVED at 16H-I: official SDK/RPC source path, actualAPY.netAPY (proven net + fraction), chain block time as the authoritative timestamp, validated refresh artifact and published same-origin cache with browserFetched:false." },
    incident_history: { refs: refs("sh-inc-01"), summary: "NO sourced incident review has been conducted for the vault, the program, the four reserves, the manager, or Scope. Per the rubric, absence of a discovered incident is MISSING EVIDENCE, not a clean record." },
  };

  const BLOCKERS: Partial<Record<RiskRubricV1DimensionId, string[]>> = {
    audit_security: ["the audited version cannot be related to the deployed bytecode (sh-aud-02)"],
    upgrade_admin_authority: ["multisig/timelock status of the active upgrade authority is undetermined (sh-upg-01)"],
    manager_discretion: ["manager permissions cannot be determined (sh-mgr-02)"],
    strategy_complexity: ["current reserve-level exposure cannot be determined (sh-exp-02)"],
    composability_dependency: ["integrated reserve dependencies are not enumerated or audited (sh-exp-02)"],
    oracle_risk: ["a vault-specific oracle model cannot be established while exposure is unresolved (sh-exp-02)"],
    liquidity_withdrawal: ["withdrawal model cannot be determined (sh-liq-02)"],
    incident_history: ["no sourced incident review exists (sh-inc-01)"],
  };

  const rows: WorksheetDimensionRow[] = rubric.dimensions.map((d) => ({
    dimensionId: d.id,
    label: d.label,
    weight: d.weight,
    direction: "higher = more evidence-supported",
    anchors: d.anchors,
    evidenceRefs: EVIDENCE_MAP[d.id].refs,
    evidenceSummary: EVIDENCE_MAP[d.id].summary,
    unresolvedGaps: gapsFor(...EVIDENCE_MAP[d.id].refs),
    mandatoryBlockersPresent: BLOCKERS[d.id] ?? [],
    reviewerScore: null,
    reviewerRationale: null,
    reviewerConfidence: null,
    reviewerId: null,
    reviewDate: null,
  }));

  return {
    version: STEAKHOUSE_WORKSHEET_VERSION,
    binding: WORKSHEET_BINDING,
    rows,
    overallScore: null,
    riskBand: null,
    reviewResult: "evidence_incomplete",
    signoff: null,
    productApproved: false,
    reviewerInstructions: [
      "This worksheet CANNOT be completed yet. Rubric v1.0.0 is `proposed_for_approval`; a score against an unapproved rubric is rejected by aggregateRiskScore().",
      "Order of operations: (1) approve or amend rubric v1, (2) add an active reviewer record with real authorizedAt + authorizationEvidence, (3) close the mandatory blockers below, (4) score each dimension with a rationale + evidence refs + confidence, (5) review, (6) sign off. Product approval remains a separate act after all of that.",
      `${rows.filter((r) => r.mandatoryBlockersPresent.length > 0).length} of ${rows.length} dimensions currently carry a mandatory blocker. A blocker is checked BEFORE aggregation, so no combination of strong scores can average it away.`,
      "Direction: 0-10, HIGHER = MORE EVIDENCE-SUPPORTED (safer). This matches the repository's existing MIN_PROTOCOL_RISK_SCORE=7 floor. Do not score as if higher = riskier.",
      "Capacity is verified_uncapped (16H-J.1, pinned to kvault release/v2.2.2). Deposit state is a SEPARATE unresolved blocker — capacity is not evidence deposits are enabled.",
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Migration report for every existing risk score
 * ------------------------------------------------------------------ */
export type MigrationClassification =
  | "compatible_with_v1"
  | "requires_rescoring"
  | "requires_provenance_migration"
  | "legacy_only"
  | "fixture_only"
  | "invalid"
  | "blocked_missing_evidence"
  | "blocked_missing_reviewer_provenance";

export interface RiskScoreMigrationEntry {
  subject: string;
  kind: "protocol" | "product";
  currentRubric: string;
  currentScoreState: string;
  dimensionsUsed: string;
  currentProvenance: string;
  classification: MigrationClassification;
  requiredAction: string;
  usableUnderCurrentApprovedBehavior: boolean;
  requiresNewV1Review: boolean;
  notes: string[];
}

/**
 * The inventory. Nothing here is migrated — this is a report. Reinterpreting an old score under new
 * dimension definitions would be inventing a score the reviewer never gave.
 */
const MIGRATION: RiskScoreMigrationEntry[] = [
  ...(["JupSOL (Jupiter)", "mSOL (Marinade)", "bSOL (Solblaze)", "INF (Sanctum)", "Jupiter Native Stake / native baseline"].map((s) => ({
    subject: s,
    kind: "protocol" as const,
    currentRubric: "protocol_risk_rubric v0.1.0-DRAFT",
    currentScoreState: "assigned_for_review (never a production score)",
    dimensionsUsed: "v0.1.0 draft set (audit_security, maturity, tvl_adoption, withdrawal_fee_transparency, operational_dependency_risk, incident_history)",
    currentProvenance: "module header records 'Ashot-authorized for scoring'; no structured reviewer record, no signoff, no scoped authorization",
    classification: "requires_rescoring" as const,
    requiredAction: "If v1 is approved: re-score under v1 with structured provenance. Do NOT map v0.1.0 scores onto v1 dimensions — v1 removed tvl_adoption from scoring and added six dimensions (upgrade/admin, manager discretion, strategy complexity, composability, oracle, liquidity/withdrawal) that were never assessed, so a mapping would be fabrication.",
    usableUnderCurrentApprovedBehavior: true,
    requiresNewV1Review: true,
    notes: [
      "UNCHANGED by this step. These scores are `assigned_for_review` under the draft rubric and are NOT wired into protocolEligibility — nothing in production consumes them today, so nothing breaks.",
      "Their status is honest already: the modules themselves say 'not a final production score'.",
    ],
  }))),
  {
    subject: "JitoSOL",
    kind: "protocol",
    currentRubric: "protocol_risk_rubric v0.1.0-DRAFT",
    currentScoreState: "blocked — no score (12Y default approval decision is not_submitted)",
    dimensionsUsed: "n/a — never scored",
    currentProvenance: "none; the one worked example is explicitly QA-only test input",
    classification: "blocked_missing_reviewer_provenance",
    requiredAction: "No migration needed — there is no score to migrate. Score under v1 once the rubric is approved and a reviewer is authorized.",
    usableUnderCurrentApprovedBehavior: true,
    requiresNewV1Review: true,
    notes: ["Demonstrates the gate working as designed: the most-developed candidate still has no score because the rubric is a draft."],
  },
  {
    subject: "kamino_steakhouse_usdc",
    kind: "product",
    currentRubric: "none",
    currentScoreState: "no score (riskScore undefined, not 0)",
    dimensionsUsed: "n/a",
    currentProvenance: "evidence prepared by an automated agent; no scorer, reviewer or signoff",
    classification: "blocked_missing_evidence",
    requiredAction: "Close the mandatory blockers, then score under v1 via the reviewer worksheet.",
    usableUnderCurrentApprovedBehavior: false,
    requiresNewV1Review: true,
    notes: ["8 of 12 v1 dimensions currently carry a mandatory blocker."],
  },
  {
    subject: "Stable Yield 16D risk reviews (production array)",
    kind: "product",
    currentRubric: "yield_strategy_risk_review_v1 contract",
    currentScoreState: "empty — zero production reviews exist",
    dimensionsUsed: "n/a",
    currentProvenance: "n/a",
    classification: "compatible_with_v1",
    requiredAction: "None. The contract has room for riskScore + reviewer provenance; it needs the reviewer fields added when v1 is approved.",
    usableUnderCurrentApprovedBehavior: true,
    requiresNewV1Review: false,
    notes: ["YieldStrategyRiskReview currently has NO reviewer/signoff fields — that schema gap must be closed before a real review can be recorded."],
  },
  {
    subject: "Stable Yield synthetic risk reviews (fixtures)",
    kind: "product",
    currentRubric: "yield_strategy_risk_review_v1 contract",
    currentScoreState: "synthetic scores in fixtures only",
    dimensionsUsed: "n/a — fixture inputs, not rubric scores",
    currentProvenance: "fixture-only; never in the production array",
    classification: "fixture_only",
    requiredAction: "None. Must remain fixture-only and must never be promoted.",
    usableUnderCurrentApprovedBehavior: true,
    requiresNewV1Review: false,
    notes: ["These exist to exercise the 'when approved' path. They are not evidence about any real product."],
  },
];

export function getRiskScoreMigrationReport(): RiskScoreMigrationEntry[] {
  return MIGRATION.map((m) => JSON.parse(JSON.stringify(m)) as RiskScoreMigrationEntry);
}

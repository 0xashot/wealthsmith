/**
 * klendDirectUsdcReviewBrief — Step 16H-T.1. A decision-ready human-review brief for the exact
 * Kamino direct USDC lending reserve. It projects the COMPLETED automated 12-dimension assessment
 * (klendDirectUsdcAutomatedAssessment: aggregate 5.93, floor 7, meetsMinimum FALSE) into a form a
 * human risk reviewer can actually act on, and turns "we are stuck at 5.93" into a decision someone
 * can sign.
 *
 * WHAT THIS IS. A PRESENTATION of an existing assessment. It introduces NO new score, changes NO
 * score, and recomputes NO aggregate. Every per-dimension number here is PROJECTED from
 * DIRECT_DIMENSION_ASSESSMENTS and validated to equal its source. The brief is bound to the
 * assessment manifest hash and fails validation if that binding breaks — if the assessment is ever
 * re-run, this brief must be regenerated.
 *
 * WHAT THIS IS NOT. Not a human review. Not a signoff. Not an approval. Not a recommendation of an
 * OUTCOME. It lays out the three honest outcomes — accept the residual risk / require mitigations /
 * hold — WITHOUT selecting one, because outcome selection belongs to the human risk reviewer, not
 * to the assessor and not to the preparer. Reviewer fields are null by construction and no reviewer
 * identity is fabricated anywhere.
 *
 * SEPARATION OF DUTIES (risk_separation_of_duties_v2). Authored under the evidence-PREPARER identity
 * (claude_automated_evidence_preparer). The preparer may assemble and present. It may NOT score,
 * review, sign off, or approve. The numeric score, its dimensions, weights, bands, threshold and
 * confidence remain INTERNAL ONLY — never on suggestion cards, review drawers, dashboards, portfolio
 * pages, Smith AI, Qdrant, analytics, public APIs or public docs.
 *
 * THE FLOOR IS NOT A GATE ON HUMAN JUDGEMENT. meetsMinimum = false gates AUTOMATED eligibility. It
 * has never prohibited a human from reviewing a below-floor product and deciding. That human review
 * is the designed step this brief exists to enable — it does not lower the floor, retarget any
 * score, or presume the outcome.
 */
import {
  DIRECT_ASSESSMENT_PROVENANCE,
  DIRECT_DIMENSION_ASSESSMENTS,
  DIRECT_ASSESSMENT_OUTCOME,
  DIRECT_ASSESSMENT_STATE,
  DIRECT_ASSESSMENT_MANIFEST_HASH,
  HUMAN_REVIEW_FOCUS_AREAS,
  ASSESSMENT_LIMITATIONS,
  type DirectDimensionAssessment,
} from "./klendDirectUsdcAutomatedAssessment";

export const REVIEW_BRIEF_VERSION = "1.0.0" as const;
export const REVIEW_BRIEF_ID = "klend_direct_usdc_review_brief_v1" as const;

/** The assessment this brief presents. A drift here MUST break the build (see validation). */
export const BOUND_ASSESSMENT_MANIFEST_HASH = "direct_assessment_54a11ba3" as const;

/* ------------------------------------------------------------------ *
 * 1. Provenance — the brief binds to the assessment, it does not restate it
 * ------------------------------------------------------------------ */

export const REVIEW_BRIEF_PROVENANCE = {
  briefId: REVIEW_BRIEF_ID,
  briefVersion: REVIEW_BRIEF_VERSION,
  candidateId: DIRECT_ASSESSMENT_PROVENANCE.candidateId,
  productType: DIRECT_ASSESSMENT_PROVENANCE.productType,
  marketName: DIRECT_ASSESSMENT_PROVENANCE.marketName,
  reserveAddress: DIRECT_ASSESSMENT_PROVENANCE.reserveAddress,

  presentsAssessmentId: DIRECT_ASSESSMENT_PROVENANCE.assessmentId,
  presentsAssessmentManifest: DIRECT_ASSESSMENT_MANIFEST_HASH,
  evidencePackageManifest: DIRECT_ASSESSMENT_PROVENANCE.evidencePackageManifest,
  authorityEvidenceManifest: DIRECT_ASSESSMENT_PROVENANCE.authorityEvidenceManifest,
  rubricId: DIRECT_ASSESSMENT_PROVENANCE.rubricId,
  rubricVersion: DIRECT_ASSESSMENT_PROVENANCE.rubricVersion,
  rubricHash: DIRECT_ASSESSMENT_PROVENANCE.rubricHash,
  separationOfDutiesId: DIRECT_ASSESSMENT_PROVENANCE.separationOfDutiesId,

  preparerId: DIRECT_ASSESSMENT_PROVENANCE.evidencePreparerId,
  preparerRole: "evidence_preparer" as const,
  preparerIsNotAssessor: true,
  preparerIsNotHumanReviewer: true,
  preparerMayNotScoreReviewOrApprove: true,
  introducesNoNewScore: true,
  recommendsNoOutcome: true,
} as const;

/* ------------------------------------------------------------------ *
 * 2. The headline — the one fact the reviewer opens on
 * ------------------------------------------------------------------ */

export const DECISION_HEADLINE = {
  aggregate: DIRECT_ASSESSMENT_OUTCOME.displayedAggregate,
  band: "partial" as const,
  threshold: DIRECT_ASSESSMENT_OUTCOME.minimumThreshold,
  meetsMinimum: DIRECT_ASSESSMENT_OUTCOME.meetsMinimum,
  distanceToFloor: Number((DIRECT_ASSESSMENT_OUTCOME.minimumThreshold - DIRECT_ASSESSMENT_OUTCOME.displayedAggregate).toFixed(2)),
  automatedAssessmentState: DIRECT_ASSESSMENT_STATE.automatedAssessmentState,
  humanReviewState: DIRECT_ASSESSMENT_STATE.humanReviewState,
  oneLine:
    "The automated 12-dimension assessment is complete and lands at 5.93 against a floor of 7 (band: partial). " +
    "It does not clear the automated bar, and it is the strongest and best-evidenced of the USDC-lending candidates " +
    "(Kamino direct 5.93, Steakhouse 5.37, Jupiter not yet scoreable). What remains is a human decision.",
  whatTheFloorMeansHere:
    "meetsMinimum = false gates AUTOMATED eligibility only. A human reviewer may still review this and decide. " +
    "This brief does not lower the floor, retarget any score, or presume the outcome.",
} as const;

/* ------------------------------------------------------------------ *
 * 3. Per-dimension summary — PROJECTED from the assessment, never re-typed
 *
 * Each row is derived from DIRECT_DIMENSION_ASSESSMENTS so it cannot drift from the scored source.
 * Validation asserts row-for-row equality.
 * ------------------------------------------------------------------ */

export interface ReviewBriefRow {
  dimensionId: string;
  weight: number;
  score: number;
  band: string;
  confidence: string;
  evidenceReadiness: "complete" | "partial";
  limitingFact: string;
}

export function projectRows(items: DirectDimensionAssessment[] = DIRECT_DIMENSION_ASSESSMENTS): ReviewBriefRow[] {
  return items.map((a) => ({
    dimensionId: String(a.dimensionId),
    weight: a.weight,
    score: a.score,
    band: a.anchorBand,
    confidence: a.confidence,
    evidenceReadiness: a.evidenceReadiness,
    limitingFact: a.limitingFact,
  }));
}

export const REVIEW_BRIEF_ROWS = projectRows();

/* ------------------------------------------------------------------ *
 * 4. The four capping risks — the specific things holding the score near/below the floor
 *
 * These are the assessment's "uncomfortable facts", stated so a reviewer signs with eyes open.
 * Every one is a property of fully-characterised structure, not a gap in evidence — lowering the
 * floor would not touch any of them.
 * ------------------------------------------------------------------ */

export interface CappingRisk {
  id: string;
  title: string;
  whatItIs: string;
  isStructuralNotEvidentiary: boolean;
  dimensionsCapped: string[];
  evidenceRefs: string[];
}

export const CAPPING_RISKS: CappingRisk[] = [
  {
    id: "socialize_loss_reaches_principal",
    title: "Supplier principal can be written down by discretionary action",
    whatItIs:
      "socialize_loss (has_one lending_market_owner) can write down SUPPLIER PRINCIPAL at 4-of-10 + 12h. " +
      "Principal is not structurally protected; a fully-verified, autonomous multisig holds a loss path that reaches the deposit itself.",
    isStructuralNotEvidentiary: true,
    dimensionsCapped: ["manager_discretion", "upgrade_admin_authority", "strategy_complexity"],
    evidenceRefs: ["authority_evidence_a99ace84", "risk_package_3711fd25"],
  },
  {
    id: "zero_timelock_exit_freeze",
    title: "A 2-of-7 council can freeze every exit immediately, with no timelock",
    whatItIs:
      "Emergency mode blocks redemption and can be enabled by a 2-of-7 multisig with ZERO timelock. " +
      "Reversal requires a 4-of-10 + 12h market-owner action. Users cannot always leave, and the freeze is faster to switch on than to switch off.",
    isStructuralNotEvidentiary: true,
    dimensionsCapped: ["liquidity_withdrawal", "upgrade_admin_authority"],
    evidenceRefs: ["authority_evidence_a99ace84", "availability_evidence_078133b7"],
  },
  {
    id: "no_audit_maps_to_deployed_binary",
    title: "No audit maps to the code holding funds, which is days old",
    whatItIs:
      "The deployed binary dates from 2026-05-28 (~50 days at assessment). Reports exist from three firms plus formal " +
      "verification and fuzzing, but every referenced audit commit is private and unmappable — 'reports exist' and 'the running " +
      "code is audited' are different claims, and only the first is established.",
    isStructuralNotEvidentiary: false,
    dimensionsCapped: ["audit_security", "maturity"],
    evidenceRefs: ["steakhouseSecurityEvidenceAmendment.ts", "steakhouseAuditCoverage.ts", "risk_package_3711fd25"],
  },
  {
    id: "borrower_collateral_oracle_unexamined",
    title: "The supplier's dominant oracle exposure is unexamined",
    whatItIs:
      "The exact USDC reserve's own oracle config is tight and verified — but a USDC supplier is primarily exposed to the " +
      "prices of the COLLATERAL backing the borrows, not to USDC's own price. That collateral-oracle surface is unassessed. " +
      "This is the single largest evidence gap in the assessment and could move oracle_risk two bands in either direction.",
    isStructuralNotEvidentiary: false,
    dimensionsCapped: ["oracle_risk"],
    evidenceRefs: ["risk_package_3711fd25", "kamino.com/docs/security"],
  },
];

/* ------------------------------------------------------------------ *
 * 5. Evidence strength — what is solid vs thin, derived from readiness/confidence
 *
 * Solid = complete evidence readiness. Thin = partial readiness (the reviewer should weight these
 * scores as provisional). Both lists are derived, not asserted, so they track the source.
 * ------------------------------------------------------------------ */

export function partitionEvidenceStrength(items: DirectDimensionAssessment[] = DIRECT_DIMENSION_ASSESSMENTS) {
  const solid = items
    .filter((a) => a.evidenceReadiness === "complete")
    .map((a) => ({ dimensionId: String(a.dimensionId), score: a.score, confidence: a.confidence }));
  const thin = items
    .filter((a) => a.evidenceReadiness === "partial")
    .map((a) => ({ dimensionId: String(a.dimensionId), score: a.score, confidence: a.confidence }));
  return { solid, thin };
}

export const EVIDENCE_STRENGTH = {
  ...partitionEvidenceStrength(),
  note:
    "Six of twelve dimensions rest on complete evidence; six rest on partial evidence and should be read as provisional. " +
    "The lowest-confidence dimensions (maturity, oracle_risk, incident_history) are where a reviewer's attention buys the most.",
} as const;

/** The dimensions a reviewer should look at first, projected from the assessment's own focus list. */
export const REVIEWER_FOCUS = HUMAN_REVIEW_FOCUS_AREAS;

/* ------------------------------------------------------------------ *
 * 6. The three decision options — presented, NOT chosen
 *
 * The preparer does not select an outcome. Each option is neutral; whoDecides is the human reviewer.
 * ------------------------------------------------------------------ */

export interface DecisionOption {
  id: string;
  label: string;
  meaning: string;
  consequenceIfChosen: string;
  whoDecides: "human_risk_reviewer";
}

export const DECISION_OPTIONS: DecisionOption[] = [
  {
    id: "accept_residual_risk",
    label: "Accept the residual risk",
    meaning:
      "A human judges that the 5.93 and the four capping risks are tolerable for a read-only USDC-yield suggestion, and takes " +
      "Kamino direct to signoff despite being below the automated floor.",
    consequenceIfChosen:
      "Moves to risk signoff, then product approval. The floor is NOT changed and no score is retargeted — this is an explicit " +
      "human override of the automated gate, recorded with reviewer identity, rationale and timestamp.",
    whoDecides: "human_risk_reviewer",
  },
  {
    id: "require_mitigations",
    label: "Require mitigations first",
    meaning:
      "A human names specific conditions that must change before reconsidering (see MITIGATION_CONDITIONS), and holds signoff " +
      "until they are met and the assessment is re-run.",
    consequenceIfChosen:
      "The assessment is re-run when a listed condition is satisfied. Re-running may move scores, but does NOT guarantee clearing " +
      "7 — the structural capping risks (principal write-down, zero-timelock freeze) persist regardless of new evidence.",
    whoDecides: "human_risk_reviewer",
  },
  {
    id: "hold",
    label: "Hold",
    meaning:
      "Offer no USDC-lending yield until a product clears the automated bar on its own, or Kamino's evidence gaps close enough " +
      "to move the aggregate above the floor without a human override.",
    consequenceIfChosen:
      "No suggestion, no selector eligibility, no production card. Existing-position recognition and visibility are unaffected " +
      "either way — this decision is about NEW yield suggestions only.",
    whoDecides: "human_risk_reviewer",
  },
];

/**
 * Conditions attached to the "require mitigations" option. Each names the concrete change and the
 * dimension it would let the assessment re-score. NONE is promised to clear the floor.
 */
export const MITIGATION_CONDITIONS = [
  {
    condition: "A public commit mapping the deployed binary (slot 422723185) to a completed audit is published",
    unblocks: "audit_security",
    couldMoveAggregate: true,
    note: "Closes the single named gap in audit_security; could move it toward `supported`.",
  },
  {
    condition: "The borrower-collateral oracle surface is assessed (per-collateral oracle configs, provider diversity, composition)",
    unblocks: "oracle_risk",
    couldMoveAggregate: true,
    note: "The largest evidence gap; could move oracle_risk two bands in EITHER direction — it is not assumed favourable.",
  },
  {
    condition: "A documented timelock or acknowledged control is placed on the emergency-council (2-of-7) freeze power",
    unblocks: "liquidity_withdrawal",
    couldMoveAggregate: false,
    note: "Would address a structural capping risk directly; requires a protocol-side change, not more evidence.",
  },
  {
    condition: "Authority tenure is resolved for all three multisigs and proposer_authority 6pwkb7u… powers are established",
    unblocks: "maturity",
    couldMoveAggregate: true,
    note: "If proposer_authority is later proven to hold material control, the assessment MUST be invalidated and reopened.",
  },
] as const;

/* ------------------------------------------------------------------ *
 * 7. State — reviewer fields null by construction
 * ------------------------------------------------------------------ */

export const BRIEF_STATE = {
  automatedAssessmentState: DIRECT_ASSESSMENT_STATE.automatedAssessmentState,
  humanReviewState: DIRECT_ASSESSMENT_STATE.humanReviewState,
  humanReviewCreated: false,
  reviewerIdentityFabricated: false,
  riskSignoffState: DIRECT_ASSESSMENT_STATE.riskSignoffState,
  productApprovalState: DIRECT_ASSESSMENT_STATE.productApprovalState,
  outcomeSelectedByPreparer: false,
  floorChanged: false,
  anyScoreRetargeted: false,
  reviewerId: null,
  reviewerDecision: null,
  reviewerRationale: null,
  reviewerSignoff: null,
  reviewedAt: null,
  approval: null,
  limitations: ASSESSMENT_LIMITATIONS,
  note: "This brief carries the automated output to a human and lays out the options. It never speaks for a reviewer.",
} as const;

/* ------------------------------------------------------------------ *
 * 8. Validation — the brief must not drift from, or add to, the assessment
 * ------------------------------------------------------------------ */

export interface ReviewBriefValidation { valid: boolean; errors: string[]; }

export function validateReviewBrief(
  items: DirectDimensionAssessment[] = DIRECT_DIMENSION_ASSESSMENTS,
  rows: ReviewBriefRow[] = REVIEW_BRIEF_ROWS,
): ReviewBriefValidation {
  const errors: string[] = [];

  // Binding: the brief presents exactly the assessment it claims to.
  if (DIRECT_ASSESSMENT_MANIFEST_HASH !== BOUND_ASSESSMENT_MANIFEST_HASH)
    errors.push(`assessment manifest drifted: bound ${BOUND_ASSESSMENT_MANIFEST_HASH}, actual ${DIRECT_ASSESSMENT_MANIFEST_HASH}`);
  if (REVIEW_BRIEF_PROVENANCE.presentsAssessmentManifest !== BOUND_ASSESSMENT_MANIFEST_HASH)
    errors.push("provenance does not bind to the assessment manifest");

  // No new/changed scores: every row equals its source, row-for-row, in order.
  if (rows.length !== items.length) errors.push(`row count ${rows.length} != assessment dimensions ${items.length}`);
  for (let i = 0; i < items.length; i++) {
    const a = items[i], r = rows[i];
    if (!r) { errors.push(`missing row for ${String(a.dimensionId)}`); continue; }
    if (r.dimensionId !== String(a.dimensionId)) errors.push(`row ${i}: dimension mismatch ${r.dimensionId} != ${String(a.dimensionId)}`);
    if (r.score !== a.score) errors.push(`row ${i}: score mismatch ${r.score} != ${a.score}`);
    if (r.weight !== a.weight) errors.push(`row ${i}: weight mismatch`);
    if (r.band !== a.anchorBand) errors.push(`row ${i}: band mismatch`);
  }
  if (rows.reduce((s, r) => s + r.weight, 0) !== 100) errors.push("projected weights do not sum to 100");

  // Headline agrees with the assessment output.
  if (DECISION_HEADLINE.aggregate !== DIRECT_ASSESSMENT_OUTCOME.displayedAggregate) errors.push("headline aggregate disagrees with assessment");
  if (DECISION_HEADLINE.meetsMinimum !== DIRECT_ASSESSMENT_OUTCOME.meetsMinimum) errors.push("headline meetsMinimum disagrees with assessment");

  // Capping risks each cite a real dimension.
  const dimIds = new Set(items.map((a) => String(a.dimensionId)));
  for (const c of CAPPING_RISKS)
    for (const d of c.dimensionsCapped)
      if (!dimIds.has(d)) errors.push(`capping risk ${c.id} cites unknown dimension ${d}`);
  if (CAPPING_RISKS.length !== 4) errors.push(`expected 4 capping risks, got ${CAPPING_RISKS.length}`);

  // Exactly three options; none pre-selected; all decided by the human reviewer.
  if (DECISION_OPTIONS.length !== 3) errors.push(`expected 3 decision options, got ${DECISION_OPTIONS.length}`);
  if (DECISION_OPTIONS.some((o) => o.whoDecides !== "human_risk_reviewer")) errors.push("a decision option is not reviewer-owned");
  if (BRIEF_STATE.outcomeSelectedByPreparer !== false) errors.push("preparer must not select an outcome");

  // Separation of duties: no fabricated reviewer, no signoff, no approval.
  if (BRIEF_STATE.reviewerId !== null || BRIEF_STATE.reviewerSignoff !== null || BRIEF_STATE.approval !== null)
    errors.push("reviewer/signoff/approval fields must be null");
  if (BRIEF_STATE.reviewerIdentityFabricated !== false) errors.push("reviewer identity must not be fabricated");
  if (BRIEF_STATE.floorChanged !== false || BRIEF_STATE.anyScoreRetargeted !== false)
    errors.push("brief must not change the floor or retarget scores");

  return { valid: errors.length === 0, errors };
}

export const REVIEW_BRIEF_VALIDATION = validateReviewBrief();

/* ------------------------------------------------------------------ *
 * 9. Manifest + hash (FNV-1a over binding material)
 * ------------------------------------------------------------------ */

export const REVIEW_BRIEF_MANIFEST = {
  briefId: REVIEW_BRIEF_ID,
  briefVersion: REVIEW_BRIEF_VERSION,
  presentsAssessmentManifest: DIRECT_ASSESSMENT_MANIFEST_HASH,
  aggregate: DECISION_HEADLINE.aggregate,
  threshold: DECISION_HEADLINE.threshold,
  meetsMinimum: DECISION_HEADLINE.meetsMinimum,
  cappingRiskIds: CAPPING_RISKS.map((c) => c.id),
  decisionOptionIds: DECISION_OPTIONS.map((o) => o.id),
  humanReviewState: BRIEF_STATE.humanReviewState,
  signoffState: BRIEF_STATE.riskSignoffState,
  approvalState: BRIEF_STATE.productApprovalState,
} as const;

export function computeReviewBriefHash(m: typeof REVIEW_BRIEF_MANIFEST = REVIEW_BRIEF_MANIFEST): string {
  const material = JSON.stringify({
    id: m.briefId, v: m.briefVersion, a: m.presentsAssessmentManifest,
    agg: m.aggregate, mm: m.meetsMinimum, c: m.cappingRiskIds, o: m.decisionOptionIds,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `review_brief_${h.toString(16).padStart(8, "0")}`;
}

export const REVIEW_BRIEF_HASH = computeReviewBriefHash();

/* ------------------------------------------------------------------ *
 * 10. What this confers
 * ------------------------------------------------------------------ */

export const REVIEW_BRIEF_CONFERS = {
  confers: [
    "a decision-ready presentation of the completed automated assessment",
    "the four capping risks stated for a reviewer",
    "an evidence solid/thin split",
    "three neutral decision options owned by the human reviewer",
  ],
  doesNotConfer: [
    "a new or changed score", "a recomputed aggregate", "human review", "risk signoff",
    "product approval", "an outcome recommendation", "selector eligibility", "recommendation eligibility",
    "Top Pick", "a production card", "execution", "a lowered floor",
  ],
  introducedNewScore: false,
  changedAnyScore: false,
  recomputedAggregate: false,
  selectedOutcome: false,
  changedFloor: false,
  humanReviewOccurred: false,
  signoffOccurred: false,
  productApproved: false,
  assessmentChanged: false,
  steakhouseAssessmentChanged: false,
  jupiterPackageChanged: false,
  solStakingChanged: false,
  selectorChanged: false,
  transactionConstructedOrSimulated: false,
  scoreIsInternalOnly:
    "The numeric score, its dimensions, weights, bands, threshold and confidence are INTERNAL ONLY. This brief is an " +
    "internal review artifact and must never appear on suggestion cards, review drawers, dashboards, portfolio pages, " +
    "Smith AI, Qdrant, analytics, public APIs or public docs.",
} as const;

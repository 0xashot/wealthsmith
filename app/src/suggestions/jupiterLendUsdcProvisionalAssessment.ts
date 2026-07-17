/**
 * jupiterLendUsdcProvisionalAssessment — Step 16H-T.2. A PROVISIONAL, BOUNDED risk assessment for
 * Jupiter Lend native USDC (jlUSDC), scoring the eleven dimensions the evidence can support and
 * holding the twelfth (incident_history) as an explicit unknown.
 *
 * WHY THIS IS A BOUND, NOT A SCORE. Jupiter's evidence package is not_ready for a full assessment:
 * incident_history cannot be anchored (the search is too narrow and the fund-holding binary is hours
 * old). Rather than fabricate that one dimension or refuse to say anything, this module scores the
 * eleven scoreable dimensions (per RECLASSIFIED_DIMENSIONS / DIMENSION_STATE_V3, incident_history is
 * the sole hold-out) and reports the aggregate as a RANGE spanning the full possible value of the
 * unknown. incident_history carries weight 2 of 100, so the range is at most 0.2 wide. If even the
 * UPPER bound (incident_history = 10, maximally generous) is below the floor of 7, the unknown cannot
 * change the pass/fail conclusion — and that is exactly what this bound establishes.
 *
 * RESULT: aggregate band [4.12, 4.32]. The upper bound is 4.32 — 2.68 below the floor. Jupiter
 * provisionally fails the floor REGARDLESS of its incident history.
 *
 * WHAT THIS DOES NOT DO. It does NOT flip Jupiter to "ready" — the incident_history gate stays open.
 * It is not a final aggregate, not a human review, not a signoff, not an approval. It is a
 * sensitivity check that answers one question: does the missing dimension even matter? It does not.
 *
 * CONFIDENCE IS LOW BY CONSTRUCTION. Ten of eleven scored dimensions carry a low confidence ceiling
 * because the deployed binaries are unverifiable (no verified build, no on-chain IDL for the fund
 * path, no matching public source). The individual point scores are therefore SOFT. The BOUND,
 * however, is robust: even under generous re-scoring the aggregate cannot plausibly approach 7 (see
 * ROBUSTNESS_NOTE). Soft points, firm conclusion.
 *
 * SEPARATION OF DUTIES (risk_separation_of_duties_v2). Authored under the ws_automated_risk_assessor
 * identity, which may score and aggregate but may NOT review, sign off, or approve. No reviewer is
 * fabricated. The numeric score is INTERNAL ONLY — never on cards, drawers, dashboards, Smith AI,
 * analytics, public APIs or public docs.
 */
import { PROTOCOL_RISK_RUBRIC_V1_ID, PROTOCOL_RISK_RUBRIC_V1_SEMVER, computeRubricV1Hash } from "./riskGovernance";
import type { RiskReviewConfidence } from "./riskReviewConfidencePolicy";
import type { AnchorBand } from "./steakhouseAutomatedAssessment";
import { anchorMatchesScore, AGGREGATE_COMPUTATION_VERSION } from "./steakhouseAutomatedAssessment";
import { JUP_PACKAGE_MANIFEST_HASH } from "./jupiterLendUsdcRiskEvidencePackage";
import { IDL_AMENDMENT_HASH, RECLASSIFIED_DIMENSIONS } from "./jupiterLendIdlDiscoveryAmendment";
import { TEAM_DISCLOSURE_HASH, READINESS_V3 } from "./jupiterLendTeamDisclosureAmendment";

export const JUP_PROVISIONAL_ASSESSMENT_VERSION = "1.0.0" as const;
export const JUP_PROVISIONAL_ASSESSMENT_ID = "jupiter_lend_usdc_provisional_assessment_v1" as const;

/* Bound manifests — a drift in any of the three source artifacts must break the build. */
export const BOUND_PACKAGE_MANIFEST = "jup_risk_package_4d19e296" as const;
export const BOUND_IDL_AMENDMENT_MANIFEST = "jup_idl_amendment_15730409" as const;
export const BOUND_TEAM_DISCLOSURE_MANIFEST = "jup_team_disclosure_94951f2a" as const;

/* ------------------------------------------------------------------ *
 * 1. Provenance
 * ------------------------------------------------------------------ */

export const JUP_PROVISIONAL_PROVENANCE = {
  assessmentId: JUP_PROVISIONAL_ASSESSMENT_ID,
  assessmentVersion: JUP_PROVISIONAL_ASSESSMENT_VERSION,
  candidateId: "jupiter_lend_usdc",
  productType: "direct_lending",
  productName: "Jupiter Lend — Earn (jlUSDC)",

  kind: "provisional_bounded" as const,
  isFinalAssessment: false,
  heldOutDimension: "incident_history",
  readinessFlipped: false,

  evidencePackageManifest: JUP_PACKAGE_MANIFEST_HASH,
  idlAmendmentManifest: IDL_AMENDMENT_HASH,
  teamDisclosureManifest: TEAM_DISCLOSURE_HASH,

  rubricId: PROTOCOL_RISK_RUBRIC_V1_ID,
  rubricVersion: PROTOCOL_RISK_RUBRIC_V1_SEMVER,
  rubricHash: computeRubricV1Hash(),
  separationOfDutiesId: "risk_separation_of_duties_v2",
  confidencePolicyId: "risk_review_confidence_v2",

  assessorId: "ws_automated_risk_assessor",
  assessorRole: "automated_risk_assessor" as const,
  assessorIsNotHumanReviewer: true,
  assessorMayNotSignOffOrApprove: true,

  assessmentCutoff: "2026-07-17T13:10:00.000Z",
  computationVersion: AGGREGATE_COMPUTATION_VERSION,
  aggregateIsAnOutputNotATarget: true,
} as const;

/* ------------------------------------------------------------------ *
 * 2. The eleven scored dimensions (incident_history held out below)
 *
 * Bands: 0-2 unsupported | 3-4 weak | 5-6 partial | 7-8 supported | 9-10 strong.
 * Every score is anchored to the gathered Jupiter evidence. Confidence is low wherever the deployed
 * binary is the source of the gap — which is nearly everywhere.
 * ------------------------------------------------------------------ */

export interface ProvisionalDimensionScore {
  dimensionId: string;
  weight: number;
  score: number;
  anchorBand: AnchorBand;
  confidence: RiskReviewConfidence;
  limitingFact: string;
  rationale: string;
  vsKamino: string;
}

export const JUP_PROVISIONAL_SCORES: ProvisionalDimensionScore[] = [
  {
    dimensionId: "audit_security", weight: 15, score: 4, anchorBand: "weak", confidence: "low",
    limitingFact: "NEITHER live program is a verified build (verify.osec.io is_verified: false for both); the audited Code4rena commit's declared IDs are not deployed; the live IDs appear in no public source; the repo predates both live deployments by ~5 months. The deployed binary is not merely unlinked to an audit — it is unreadable.",
    rationale: "Seven audit reports plus a live Code4rena contest and an OOOsec bounty is substantial activity and a real favorable — enough to place an anchor in the `weak` band (per RECLASSIFICATIONS). It does not reach `partial`, because unlike Kamino the RUNNING code cannot be verified against any reviewed source at all. Scored 4 (top of weak) for the breadth of audit activity; not 5, because binary-unverifiability is exactly what this dimension asks.",
    vsKamino: "Below Kamino's 6. Kamino IS a verified build (only its audit commits are private); Jupiter's binary itself is unverifiable — a more severe form of the same gap.",
  },
  {
    dimensionId: "maturity", weight: 8, score: 3, anchorBand: "weak", confidence: "low",
    limitingFact: "The liquidity program holding ~428.6M USDC of supplier funds deployed ~33 HOURS before the evidence cutoff; the lending program ~14 days. Fluid's Ethereum history is a different codebase on a different runtime and does not transfer. Pool age and authority tenure unresolved.",
    rationale: "Development age is ~a year (four firms reviewed Jul–Nov 2025; reward-model deploy 2025-08-26), which keeps this off the floor — but the fund-HOLDING binaries are days-to-hours old, and this dimension grades the deployed configuration's maturity. A 33-hour-old binary custodying 428M is the central fact. Scored 3 (weak); below Kamino's 4 and Steakhouse's 4, both of which had older binaries.",
    vsKamino: "Below Kamino's 4 — Kamino's binary was ~52 days; Jupiter's fund-holding binary is ~33 hours.",
  },
  {
    dimensionId: "upgrade_admin_authority", weight: 15, score: 4, anchorBand: "weak", confidence: "low",
    limitingFact: "ONE authority (4MsgBB5…, 4-of-8, 12h) can upgrade BOTH the share accounting AND the liquidity program holding ~428.6M USDC — and the graph is a lower bound, so oracle/vaults/flash-loan authorities may be the same key-set. 4-of-8 + 12h is a lower bar than Kamino's 5-of-10 + 24h, and autonomy (no config_authority bypass) was NOT re-verified from deployed state.",
    rationale: "The authority resolves to an off-curve PDA (not a raw keypair — better than Steakhouse's single key) with a real threshold and timelock, which keeps it off the floor. But a single 4-of-8 controlling the entire stack, at a lower bar than Kamino, with autonomy unverified and the graph incomplete, is a materially weaker structure than Kamino's three independently-verified autonomous multisigs. Scored 4 (weak).",
    vsKamino: "Well below Kamino's 7 — Kamino had three separate verified-autonomous multisigs with no bypass; Jupiter has one lower-bar key-set over everything, autonomy unconfirmed.",
  },
  {
    dimensionId: "manager_discretion", weight: 12, score: 4, anchorBand: "weak", confidence: "low",
    limitingFact: "The privileged-power surface derivable from 108 IDL instructions is large — per-user pause, per-user withdrawal limits, oracle swap, collateral factor, liquidation threshold/penalty, supply-rate magnifier — all authority-gated under one 4-of-8. Instruction LOGIC is unverified (no verified build), so the constraints on those powers are unknown.",
    rationale: "jlUSDC has no freeze authority (one narrow verified favorable) and no socialize_loss-equivalent instruction was found (loss is a share-price decline, design-resolved but binary-unverified). But per-user pause and per-user withdrawal limits are unusually invasive discretionary powers, all under one key-set with unverified constraints. Scored 4 (weak); slightly below Kamino's 5, because the power set is broader/more invasive and its limits are unread.",
    vsKamino: "Below Kamino's 5 — comparable breadth but with per-user pause/limit powers and no ability to verify the constraining logic.",
  },
  {
    dimensionId: "strategy_complexity", weight: 10, score: 5, anchorBand: "partial", confidence: "low",
    limitingFact: "The mechanism is API-described, not source-derived: share value is not 1:1 (1.051795) and its accrual/redemption formula is unverified; a dynamic withdrawal limiter adds a control layer; the borrowable collateral includes tokenized equities, reflexive JLP and a recursive jlJUPUSD loop at 89% LTV.",
    rationale: "The observable base structure is genuinely simple — a single USDC pool, a share token, no allocation manager or rotation — which supports a `partial` anchor. But the accrual mechanics are unread and the collateral universe is exotic and reflexive. Scored 5 (partial) on the simple observable structure, held there (not 6) by the unverified mechanics and the recursive/reflexive collateral. Confidence low.",
    vsKamino: "Below Kamino's 6 — simpler base than a vault, but two-program custody, an unverified share formula, and far more exotic collateral.",
  },
  {
    dimensionId: "composability_dependency", weight: 8, score: 4, anchorBand: "weak", confidence: "low",
    limitingFact: "Six live programs under one authority, a CPI boundary between share accounting and fund custody, a flash-loan module adjacent to supplier funds, and a Chainlink Data Streams keeper-push oracle with a liveness dependency plus a DEX-peg pricing path.",
    rationale: "Classic SPL token for jlUSDC (favorable, no Token-2022 surface), but the dependency graph is larger and more entangled than Kamino's single KLend layer: six programs, a flash-loan adjacency, and a keeper-liveness oracle dependency. Scored 4 (weak); below Kamino's 6.",
    vsKamino: "Below Kamino's 6 — more programs, a flash-loan surface, and a keeper-push oracle dependency Kamino does not carry.",
  },
  {
    dimensionId: "oracle_risk", weight: 8, score: 4, anchorBand: "weak", confidence: "low",
    limitingFact: "Provider is now known (Chainlink Data Streams, keeper-push) with a DEX-peg path alongside and an authority-gated per-vault oracle swap — but per-feed max-age/deviation/confidence params, the collateral→feed mapping, and even the USDC pool's own pricing are all unresolved.",
    rationale: "Knowing the provider, program, keeper dependency and swap power is a real improvement over 'unknown' and supports an anchor. But a keeper-push model carries a liveness dependency, the oracle is swappable by authority, and NEITHER the collateral side NOR the USDC side is resolved (unlike Kamino, where the USDC side was fully verified). Scored 4 (weak); below Kamino's 5.",
    vsKamino: "Below Kamino's 5 — Kamino had a fully-verified USDC-side oracle; Jupiter has neither side resolved, plus keeper-liveness and a swappable oracle.",
  },
  {
    dimensionId: "liquidity_withdrawal", weight: 12, score: 4, anchorBand: "weak", confidence: "low",
    limitingFact: "A dynamic withdrawal limiter caps ACTUAL withdrawable at ~64.38M against ~428.59M supplied — about 15% right now. Its deployed semantics (how it recomputes, what resets it, whether an authority can tighten it instantly) and any pause authority/timelock are unverified.",
    rationale: "A large supply base and no observed cooldown are weak favorables, but the binding fact is an algorithmic rate limiter that currently permits exit of only ~15% of supply, with unread rules and an unknown pause authority. That is a materially constrained and unverifiable exit path. Scored 4 (weak); below Kamino's verified 6 and comparable to Steakhouse's 5-with-negative-buffer.",
    vsKamino: "Below Kamino's 6 — Kamino's exit limit is a verified liquidity fact; Jupiter adds an unverified algorithmic limiter capping withdrawable at ~15%.",
  },
  {
    dimensionId: "asset_stablecoin_risk", weight: 5, score: 8, anchorBand: "supported", confidence: "high",
    limitingFact: "USDC is a centralized, issuer-redeemable stablecoin: Circle retains mint-level freeze/blacklist capability, and depeg risk is inherent and unmitigated at this layer.",
    rationale: "Canonical Circle USDC verified (not bridged/wrapped); jlUSDC is a classic SPL mint with NO freeze authority (verified); 6 decimals verified. Identity, token program and issuer model are all verified from primary sources — `supported`. Scored 8, identical to the other USDC products; not higher, because complete verification of a centralized-issuer asset is not defence-in-depth against that issuer. The one high-confidence dimension.",
    vsKamino: "Equal to Kamino's 8 — same asset, same issuer profile; jlUSDC lacking a freeze authority does not change the underlying USDC's Circle exposure.",
  },
  {
    dimensionId: "withdrawal_fee_transparency", weight: 3, score: 4, anchorBand: "weak", confidence: "low",
    limitingFact: "No withdrawal fee was OBSERVED in the API, but fees cannot be verified from deployed code, the share-value formula is unverified (hidden share-value deductions cannot be excluded), reserve factor/take rate/origination are unresolved, and a rewardsRate of 0.70% is reported against an EMPTY rewards array.",
    rationale: "Absence of an observed fee is not verified absence of a fee. Kamino's 8 rested on reading every fee field in the deployed path; here that path is unreadable and there is an unexplained reward/fee inconsistency. Scored 4 (weak) on the little verified fee evidence available.",
    vsKamino: "Well below Kamino's 8 — Kamino verified every fee from deployed code; Jupiter's fee surface is unverifiable and internally inconsistent.",
  },
  {
    dimensionId: "operational_dependency_risk", weight: 2, score: 3, anchorBand: "weak", confidence: "low",
    limitingFact: "EVERY material quantity — share rate, supply, rates, the withdrawal limiter — is API-reported with no independent on-chain derivation path, no SDK equivalent to Kamino's rate math, and no slot binding on the overall response. Unreadability converts what would be a protocol property into an unverifiable API dependency.",
    rationale: "A working public API is a weak favorable, but an integration here would depend on data WealthSmith cannot verify against program state — an unusually high operational dependency created directly by the binary's unreadability. Scored 3 (weak); below Kamino's 6 and Steakhouse's 5.",
    vsKamino: "Below Kamino's 6 — Kamino's adapters fail closed against verified on-chain state; Jupiter has no on-chain verification path at all.",
  },
];

/* ------------------------------------------------------------------ *
 * 3. The held-out dimension
 * ------------------------------------------------------------------ */

export const HELD_OUT_INCIDENT_HISTORY = {
  dimensionId: "incident_history",
  weight: 2,
  scored: false,
  reason:
    "UNSCORED and still blocking a FINAL assessment. The search covered only the Code4rena listing and Jupiter docs; the fund-holding binary is ~33 hours old; and zero identified incidents over a narrow search is a SEARCH RESULT, not a clean record. incident_history is treated as UNKNOWN across its full 0–10 range, never as zero and never as favorable.",
  matchesEvidenceSystemState:
    "Consistent with RECLASSIFIED_DIMENSIONS (incident_history unchanged: insufficient, not scoreable) and READINESS_V3 (still not_ready, incident_history the sole blocker).",
  rangeUsedForBound: { min: 0, max: 10 },
} as const;

/* ------------------------------------------------------------------ *
 * 4. The bounded aggregate — weighted mean, incident_history spanned 0..10
 * ------------------------------------------------------------------ */

export function scoredWeightedPoints(items: ProvisionalDimensionScore[] = JUP_PROVISIONAL_SCORES): number {
  return items.reduce((sum, d) => sum + d.weight * d.score, 0);
}

export function computeBoundedAggregate(items: ProvisionalDimensionScore[] = JUP_PROVISIONAL_SCORES) {
  const scoredPoints = scoredWeightedPoints(items);           // 412 over 98 weight
  const scoredWeight = items.reduce((s, d) => s + d.weight, 0); // 98
  const heldOutWeight = HELD_OUT_INCIDENT_HISTORY.weight;       // 2
  const totalWeight = scoredWeight + heldOutWeight;             // 100
  // incident_history contributes (weight * score)/totalWeight; score spans 0..10.
  const lowerBound = (scoredPoints + heldOutWeight * HELD_OUT_INCIDENT_HISTORY.rangeUsedForBound.min) / totalWeight;
  const upperBound = (scoredPoints + heldOutWeight * HELD_OUT_INCIDENT_HISTORY.rangeUsedForBound.max) / totalWeight;
  return {
    scoredPoints,
    scoredWeight,
    heldOutWeight,
    totalWeight,
    lowerBound: Number(lowerBound.toFixed(2)),
    upperBound: Number(upperBound.toFixed(2)),
    bandWidth: Number((upperBound - lowerBound).toFixed(2)),
  };
}

export const JUP_BOUNDED_AGGREGATE = computeBoundedAggregate();

export const JUP_PROVISIONAL_OUTCOME = {
  computationVersion: AGGREGATE_COMPUTATION_VERSION,
  scoredDimensions: JUP_PROVISIONAL_SCORES.length,     // 11
  heldOutDimensions: 1,
  ...JUP_BOUNDED_AGGREGATE,
  minimumThreshold: 7,
  meetsMinimumEvenAtUpperBound: JUP_BOUNDED_AGGREGATE.upperBound >= 7,
  distanceFromUpperBoundToFloor: Number((7 - JUP_BOUNDED_AGGREGATE.upperBound).toFixed(2)),
  interpretation:
    "Aggregate band [4.12, 4.32]. The UPPER bound — incident_history scored a maximally generous 10 — is 4.32, which is 2.68 below the floor of 7. The single unknown dimension (weight 2) cannot move the pass/fail conclusion. Jupiter provisionally FAILS the floor regardless of its incident history.",
  provisional: true,
  isFinalAggregate: false,
  readinessFlipped: false,
} as const;

/* ------------------------------------------------------------------ *
 * 5. Robustness — is the conclusion sensitive to the soft point scores?
 * ------------------------------------------------------------------ */

export const ROBUSTNESS_NOTE = {
  question: "Ten of eleven scores are low-confidence. Could better evidence push the aggregate to 7?",
  answer: "No, not plausibly.",
  reasoning:
    "To reach 7.0 the weighted points must total 700. The eleven scored dimensions contribute 412 and incident_history at most 20 — a ceiling of 432. Closing the gap to 700 would require raising scores by ~268 weighted points, i.e. moving most dimensions into the `supported`/`strong` bands. The evidence points the other way: unverifiable binaries, a 33-hour-old fund-holder, single-authority concentration, an exotic/recursive collateral set, and a 15%-of-supply withdrawal limiter. Even a deliberately generous re-scoring (most dimensions at `partial` 5–6) lands near 5.3 — still well below 7.",
  worstCaseGenerousScenarioAggregate: 5.34,
  conclusionIsRobustToPointJudgement: true,
  whatWouldChangeIt:
    "Only a verified build (making the binary reviewable) could lift the capped dimensions materially — and that would raise, not remove, the exotic-collateral and concentration facts. It is a protocol-side change, not a re-scoring.",
} as const;

/* ------------------------------------------------------------------ *
 * 6. State — provisional; the gate stays open; nothing downstream changes
 * ------------------------------------------------------------------ */

export const JUP_PROVISIONAL_STATE = {
  kind: "provisional_bounded",
  finalAssessmentState: "not_ready" as const,
  incidentHistoryGate: "open" as const,
  readinessFlipped: false,
  humanReviewState: "not_applicable_below_bound" as const,
  humanReviewCreated: false,
  reviewerIdentityFabricated: false,
  riskSignoffState: "absent" as const,
  productApprovalState: "absent" as const,
  recommendationEligible: false,
  selectorEligible: false,
  topPickCreated: false,
  productionCardRendered: false,
  incidentHistoryScoredAsZero: false,
  incidentHistoryTreatedAsFavorable: false,
  reviewerId: null,
  reviewerSignoff: null,
  approval: null,
  note: "A provisional bound. It quantifies that Jupiter falls short of the floor; it does not complete, review, or approve anything, and it does not open the incident_history gate.",
} as const;

/* ------------------------------------------------------------------ *
 * 7. Validation
 * ------------------------------------------------------------------ */

export interface JupProvisionalValidation { valid: boolean; errors: string[]; }

export function validateJupProvisional(items: ProvisionalDimensionScore[] = JUP_PROVISIONAL_SCORES): JupProvisionalValidation {
  const errors: string[] = [];

  // Bind to the three source artifacts; drift must break the build.
  if (JUP_PACKAGE_MANIFEST_HASH !== BOUND_PACKAGE_MANIFEST) errors.push(`package manifest drift: ${JUP_PACKAGE_MANIFEST_HASH}`);
  if (IDL_AMENDMENT_HASH !== BOUND_IDL_AMENDMENT_MANIFEST) errors.push(`idl amendment manifest drift: ${IDL_AMENDMENT_HASH}`);
  if (TEAM_DISCLOSURE_HASH !== BOUND_TEAM_DISCLOSURE_MANIFEST) errors.push(`team disclosure manifest drift: ${TEAM_DISCLOSURE_HASH}`);

  // Exactly eleven scored dimensions, incident_history NOT among them.
  if (items.length !== 11) errors.push(`expected 11 scored dimensions, got ${items.length}`);
  if (items.some((d) => d.dimensionId === "incident_history")) errors.push("incident_history must not be scored");
  if (HELD_OUT_INCIDENT_HISTORY.scored !== false) errors.push("held-out dimension must be unscored");

  // Weights: scored 98 + held-out 2 = 100.
  const scoredWeight = items.reduce((s, d) => s + d.weight, 0);
  if (scoredWeight !== 98) errors.push(`scored weight ${scoredWeight} != 98`);
  if (scoredWeight + HELD_OUT_INCIDENT_HISTORY.weight !== 100) errors.push("total weight != 100");

  // Each score valid and anchored.
  for (const d of items) {
    if (!Number.isInteger(d.score) || d.score < 0 || d.score > 10) errors.push(`${d.dimensionId}: score out of range`);
    if (!anchorMatchesScore(d.score, d.anchorBand)) errors.push(`${d.dimensionId}: score ${d.score} not in band ${d.anchorBand}`);
    if (d.limitingFact.length < 10) errors.push(`${d.dimensionId}: missing limiting fact`);
    if (d.rationale.length < 40) errors.push(`${d.dimensionId}: missing rationale`);
    if (/generally safe|reputable|well known|trusted team|strong protocol/i.test(d.rationale)) errors.push(`${d.dimensionId}: vague appeal`);
  }

  // The bound must actually be a bound below the floor.
  const agg = computeBoundedAggregate(items);
  if (agg.totalWeight !== 100) errors.push("bounded aggregate total weight != 100");
  if (!(agg.upperBound < 7)) errors.push(`upper bound ${agg.upperBound} is not below the floor`);
  if (agg.bandWidth > 0.2 + 1e-9) errors.push(`band width ${agg.bandWidth} exceeds the weight-2 maximum of 0.2`);
  if (JUP_PROVISIONAL_OUTCOME.meetsMinimumEvenAtUpperBound !== false) errors.push("upper bound must not meet the minimum");

  // Consistency with the evidence system's own state.
  if (READINESS_V3.readiness !== "not_ready_for_automated_assessment") errors.push("evidence system no longer reports not_ready");
  const incidentReclass = RECLASSIFIED_DIMENSIONS.find((d) => d.dimensionId === "incident_history");
  if (!incidentReclass || incidentReclass.scoreable !== false) errors.push("incident_history is no longer the hold-out in the evidence system");

  // Separation of duties.
  if (JUP_PROVISIONAL_STATE.reviewerId !== null || JUP_PROVISIONAL_STATE.reviewerSignoff !== null || JUP_PROVISIONAL_STATE.approval !== null)
    errors.push("reviewer/signoff/approval must be null");
  if (JUP_PROVISIONAL_STATE.readinessFlipped !== false) errors.push("provisional assessment must not flip readiness");
  if (JUP_PROVISIONAL_STATE.incidentHistoryScoredAsZero !== false || JUP_PROVISIONAL_STATE.incidentHistoryTreatedAsFavorable !== false)
    errors.push("held-out dimension must be neither zero nor favorable");

  return { valid: errors.length === 0, errors };
}

export const JUP_PROVISIONAL_VALIDATION = validateJupProvisional();

/* ------------------------------------------------------------------ *
 * 8. Manifest + hash
 * ------------------------------------------------------------------ */

export const JUP_PROVISIONAL_MANIFEST = {
  assessmentId: JUP_PROVISIONAL_ASSESSMENT_ID,
  assessmentVersion: JUP_PROVISIONAL_ASSESSMENT_VERSION,
  kind: JUP_PROVISIONAL_PROVENANCE.kind,
  packageManifest: JUP_PACKAGE_MANIFEST_HASH,
  idlAmendmentManifest: IDL_AMENDMENT_HASH,
  teamDisclosureManifest: TEAM_DISCLOSURE_HASH,
  rubricHash: JUP_PROVISIONAL_PROVENANCE.rubricHash,
  scores: JUP_PROVISIONAL_SCORES.map((d) => ({ id: d.dimensionId, score: d.score, confidence: d.confidence })),
  heldOut: HELD_OUT_INCIDENT_HISTORY.dimensionId,
  lowerBound: JUP_BOUNDED_AGGREGATE.lowerBound,
  upperBound: JUP_BOUNDED_AGGREGATE.upperBound,
  threshold: JUP_PROVISIONAL_OUTCOME.minimumThreshold,
  meetsMinimumEvenAtUpperBound: JUP_PROVISIONAL_OUTCOME.meetsMinimumEvenAtUpperBound,
  finalAssessmentState: JUP_PROVISIONAL_STATE.finalAssessmentState,
} as const;

export function computeJupProvisionalHash(m: typeof JUP_PROVISIONAL_MANIFEST = JUP_PROVISIONAL_MANIFEST): string {
  const material = JSON.stringify({
    id: m.assessmentId, v: m.assessmentVersion, k: m.kind,
    p: m.packageManifest, i: m.idlAmendmentManifest, t: m.teamDisclosureManifest,
    s: m.scores, ho: m.heldOut, lb: m.lowerBound, ub: m.upperBound, mm: m.meetsMinimumEvenAtUpperBound,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `jup_provisional_${h.toString(16).padStart(8, "0")}`;
}

export const JUP_PROVISIONAL_HASH = computeJupProvisionalHash();

/* ------------------------------------------------------------------ *
 * 9. What this confers
 * ------------------------------------------------------------------ */

export const JUP_PROVISIONAL_CONFERS = {
  confers: [
    "a provisional, bounded aggregate [4.12, 4.32]",
    "a robust finding that Jupiter falls below the floor regardless of incident history",
    "eleven evidence-anchored low-confidence dimension scores",
  ],
  doesNotConfer: [
    "a final assessment", "a completed incident_history score", "readiness", "human review",
    "risk signoff", "product approval", "selector eligibility", "recommendation eligibility",
    "Top Pick", "a production card", "execution", "a clean incident record",
  ],
  incidentHistoryScored: false,
  readinessFlipped: false,
  isFinalAggregate: false,
  humanReviewOccurred: false,
  signoffOccurred: false,
  productApproved: false,
  kaminoAssessmentChanged: false,
  steakhouseAssessmentChanged: false,
  solStakingChanged: false,
  selectorChanged: false,
  transactionConstructedOrSimulated: false,
  scoreIsInternalOnly:
    "The numeric scores, bounds, dimensions, weights, bands, threshold and confidence are INTERNAL ONLY. They must never appear on suggestion cards, review drawers, dashboards, portfolio pages, Smith AI, Qdrant, analytics, public APIs or public docs.",
} as const;

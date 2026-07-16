/**
 * riskGovernance — Step 16H-K. The governance foundation for human-reviewed risk scores: the PROPOSED
 * rubric v1.0.0, the six independent lifecycles, strict state-transition validation, and diagnostics.
 *
 * RUBRIC v1.0.0 IS APPROVED (16H-K.1) by the WealthSmith product owner's explicit decision — recorded,
 * not inferred. Claude cannot approve a rubric, assign a score, register a reviewer, sign anything off,
 * or approve a product; it transcribed a human decision and validated the transition.
 *
 * AN APPROVED RUBRIC APPROVES NOTHING ELSE. Scoring still requires an authorized human scorer per
 * dimension, with rationale + evidence + confidence. Steakhouse remains unscored and unapproved.
 *
 * THE NUMERIC RESULT IS AN INTERNAL RISK SUITABILITY SCORE. It is never user-facing — see
 * `riskScoreExposurePolicy.ts`. Higher = stronger evidence-supported suitability (NOT higher risk).
 *
 * SCORE DIRECTION — read this before touching anything numeric:
 *
 *   The repository's established direction is **0–10, HIGHER = MORE EVIDENCE-SUPPORTED (safer)**.
 *   `protocolRiskScoreAssignment.ts` states it, and `MIN_PROTOCOL_RISK_SCORE = 7` is a FLOOR in
 *   `protocolEligibility.ts` (`riskScore < MIN → risk_score_below_minimum`) — which is only coherent if
 *   higher is safer. v1 KEEPS this direction. Inverting it to "higher = more risk" would silently flip
 *   every existing gate from a floor into a ceiling, so the direction is pinned and fixture-locked.
 */
import type { ProtocolRiskRubricDimensionId } from "./protocolRiskRubric";

export const RISK_GOVERNANCE_EXISTS = true;
export const PROTOCOL_RISK_RUBRIC_V1_PROPOSAL_EXISTS = true;
export const RISK_REVIEW_STATE_TRANSITION_VALIDATION_EXISTS = true;

/* ------------------------------------------------------------------ *
 * A. Rubric lifecycle
 * ------------------------------------------------------------------ */
export type RubricLifecycle = "draft" | "proposed_for_approval" | "approved" | "superseded" | "retired";

/* B. Evidence lifecycle */
export type EvidenceLifecycle = "not_started" | "incomplete" | "complete" | "stale" | "invalid";

/* C. Score-assignment lifecycle */
export type ScoreAssignmentLifecycle = "not_submitted" | "partially_scored" | "scoring_complete" | "rejected" | "invalidated";

/* D. Human-review lifecycle */
export type HumanReviewLifecycle = "awaiting_reviewer" | "in_review" | "changes_requested" | "reviewed";

/* E. Risk-signoff lifecycle */
export type RiskSignoffLifecycle = "awaiting_signoff" | "approved" | "rejected" | "revoked";

/**
 * The six lifecycles are INDEPENDENT by construction: they are separate types with separate values, so
 * "evidence complete" is not representable as "scored", and "risk approved" is not representable as
 * "product approved" (F — product approval stays in the existing registry lifecycle, untouched).
 */
export interface RiskGovernanceState {
  rubric: RubricLifecycle;
  evidence: EvidenceLifecycle;
  scoring: ScoreAssignmentLifecycle;
  review: HumanReviewLifecycle;
  signoff: RiskSignoffLifecycle;
}

/* ------------------------------------------------------------------ *
 * Diagnostics — internal only. NEVER suggestion-card copy.
 * ------------------------------------------------------------------ */
export type RiskGovernanceDiagnosticCode =
  | "rubric_missing" | "rubric_draft" | "rubric_proposed_not_approved" | "rubric_superseded" | "rubric_version_mismatch"
  | "reviewer_missing" | "reviewer_unknown" | "reviewer_unauthorized" | "reviewer_revoked" | "reviewer_out_of_scope"
  | "evidence_incomplete" | "score_not_submitted" | "score_partial" | "score_invalid"
  | "mandatory_blocker_present" | "review_incomplete" | "signoff_missing" | "signoff_invalid"
  | "review_stale" | "future_timestamp" | "invalid_state_transition"
  | "product_identity_mismatch" | "provenance_conflict" | "legacy_score_requires_migration";

export interface RiskGovernanceDiagnostic {
  code: RiskGovernanceDiagnosticCode;
  detail: string;
  /** The single gate that matters: may a production risk score exist off the back of this state? */
  scoreAllowed: false;
}

/* ------------------------------------------------------------------ *
 * Proposed rubric v1.0.0
 * ------------------------------------------------------------------ */
export const PROTOCOL_RISK_RUBRIC_V1_ID = "protocol_risk_rubric_v1" as const;
export const PROTOCOL_RISK_RUBRIC_V1_SEMVER = "1.0.0" as const;
/**
 * Step 16H-K.1 — APPROVED by the WealthSmith product owner's explicit decision. Claude did not approve
 * this; it transcribed a human decision. The transition proposed_for_approval → approved was validated
 * through `recordRubricApproval` against the authorized reviewer registry.
 */
export const PROTOCOL_RISK_RUBRIC_V1_LIFECYCLE: RubricLifecycle = "approved";
export const PROTOCOL_RISK_RUBRIC_V1_APPROVED = true;

/** The recorded human approval. Every field traces to the product owner's decision. */
export const PROTOCOL_RISK_RUBRIC_V1_APPROVAL = {
  rubricId: "protocol_risk_rubric_v1",
  semver: "1.0.0",
  /** The authorized reviewer id (riskReviewerRegistry `PRODUCT_OWNER_REVIEWER_ID`). */
  approvedBy: "ws_product_owner",
  approvedAt: "2026-07-16T12:33:58.794Z",
  approvalRationale:
    "Approved for WealthSmith MVP risk governance with mandatory blocker enforcement, evidence-backed scoring, deterministic aggregation, separate risk signoff, and separate product approval.",
  approvalArtifactVersion: "1.0.0",
  /** Stable identity over the material rubric content. Recomputed + asserted by fixtures. */
  rubricHash: "" as string,
} as const;

/** v1 dimension ids. Extends the v0.1.0-draft set; see `RUBRIC_V1_CHANGES` for the rationale. */
export type RiskRubricV1DimensionId =
  | "audit_security"
  | "maturity"
  | "upgrade_admin_authority"
  | "manager_discretion"
  | "strategy_complexity"
  | "composability_dependency"
  | "oracle_risk"
  | "liquidity_withdrawal"
  | "asset_stablecoin_risk"
  | "withdrawal_fee_transparency"
  | "operational_dependency_risk"
  | "incident_history";

export type ScoreDirection = "higher_is_more_evidence_supported";
/** Pinned to the repository's existing direction. See the module header. */
export const RISK_SCORE_DIRECTION: ScoreDirection = "higher_is_more_evidence_supported";
export const RISK_SCORE_MIN = 0;
export const RISK_SCORE_MAX = 10;
/** Integers only. Decimals imply a precision no reviewer can defend from qualitative evidence. */
export const RISK_SCORE_ALLOWS_DECIMALS = false;

export interface RiskRubricV1Dimension {
  id: RiskRubricV1DimensionId;
  label: string;
  purpose: string;
  weight: number;
  /** Anchors for every allowed band. A reviewer picks an anchor, never a freeform number. */
  anchors: { band: string; range: [number, number]; meaning: string }[];
  mandatoryEvidence: string[];
  optionalEvidence: string[];
  /** Inputs that may NEVER move this dimension. */
  prohibitedEvidence: string[];
  /** What happens when mandatory evidence is absent. Never "assume the middle". */
  missingEvidenceBehavior: "blocks_scoring";
  /** Conditions that block risk approval outright, regardless of the weighted aggregate. */
  mandatoryBlockers: string[];
  applicability: string;
  notApplicablePolicy: string;
  requiresRationale: true;
  requiresConfidence: true;
  reReviewTriggers: string[];
}

const A = (band: string, range: [number, number], meaning: string) => ({ band, range, meaning });

/** Every dimension shares these anchor bands, so a reviewer reasons the same way across dimensions. */
const STD_ANCHORS = [
  A("unsupported", [0, 2], "No usable evidence, or evidence actively contradicts safety. Never a default."),
  A("weak", [3, 4], "Evidence exists but is materially incomplete or unverifiable."),
  A("partial", [5, 6], "Evidence covers the main risk but leaves a named, bounded gap."),
  A("supported", [7, 8], "Evidence is complete and verifiable for this dimension."),
  A("strongly_supported", [9, 10], "Complete, independently verifiable, with defence-in-depth."),
];

const RUBRIC_V1_DIMENSIONS: RiskRubricV1Dimension[] = [
  {
    id: "audit_security", label: "Audit & security coverage", weight: 15,
    purpose: "Whether the EXACT deployed program has credible, relatable audit coverage.",
    anchors: STD_ANCHORS,
    mandatoryEvidence: ["auditor identity", "report date", "audited scope", "linkage from the audited version to the CURRENTLY DEPLOYED program"],
    optionalEvidence: ["formal verification", "fuzzing", "bug bounty scope and size"],
    prohibitedEvidence: ["APY", "TVL", "protocol brand or popularity", "an audit of a sibling product"],
    missingEvidenceBehavior: "blocks_scoring",
    mandatoryBlockers: ["no audit covers the deployed program", "an unresolved critical finding", "the audited version cannot be related to the deployed bytecode"],
    applicability: "every on-chain product",
    notApplicablePolicy: "never n/a — an unaudited product scores low; it is not exempt",
    requiresRationale: true, requiresConfidence: true,
    reReviewTriggers: ["program upgrade", "new audit", "new critical finding"],
  },
  {
    id: "maturity", label: "Maturity", weight: 8,
    purpose: "Time-in-production and battle-testing of the exact product and its program.",
    anchors: STD_ANCHORS,
    mandatoryEvidence: ["deployment date or first-activity date", "time since last material upgrade"],
    optionalEvidence: ["reviewed adoption snapshot (see the tvl_adoption note in RUBRIC_V1_CHANGES)"],
    prohibitedEvidence: ["APY", "live TVL", "social sentiment"],
    missingEvidenceBehavior: "blocks_scoring",
    mandatoryBlockers: [],
    applicability: "every product",
    notApplicablePolicy: "never n/a",
    requiresRationale: true, requiresConfidence: true,
    reReviewTriggers: ["material upgrade resets battle-testing"],
  },
  {
    id: "upgrade_admin_authority", label: "Upgrade & admin authority", weight: 15,
    purpose: "Who can replace or reconfigure the code holding user funds, and under what controls.",
    anchors: STD_ANCHORS,
    mandatoryEvidence: ["upgradeable or immutable", "current upgrade authority", "whether the authority is a multisig / timelock / single key", "admin authority set"],
    optionalEvidence: ["governance process", "timelock duration"],
    prohibitedEvidence: ["team reputation in place of a permission analysis"],
    missingEvidenceBehavior: "blocks_scoring",
    mandatoryBlockers: ["upgrade authority cannot be determined", "an active single-key upgrade authority over user funds with no timelock"],
    applicability: "every on-chain product",
    notApplicablePolicy: "n/a only for a provably immutable program, which must be evidenced",
    requiresRationale: true, requiresConfidence: true,
    reReviewTriggers: ["authority change", "program upgrade"],
  },
  {
    id: "manager_discretion", label: "Manager discretion", weight: 12,
    purpose: "For managed products: how much a human/delegate can change without user consent.",
    anchors: STD_ANCHORS,
    mandatoryEvidence: ["manager authority identity", "enumerated permissions", "whether strategy/fees/caps/pause can change", "timelocks"],
    optionalEvidence: ["historical manager behaviour"],
    prohibitedEvidence: ["manager brand or reputation as a substitute for permissions"],
    missingEvidenceBehavior: "blocks_scoring",
    mandatoryBlockers: ["manager permissions cannot be determined"],
    applicability: "managed_vault and any product with a discretionary manager",
    notApplicablePolicy: "n/a for a product with no manager role, evidenced from the program",
    requiresRationale: true, requiresConfidence: true,
    reReviewTriggers: ["manager change", "permission change"],
  },
  {
    id: "strategy_complexity", label: "Strategy complexity", weight: 10,
    purpose: "How many moving parts stand between a deposit and its yield.",
    anchors: STD_ANCHORS,
    mandatoryEvidence: ["current strategy composition", "whether composition can change dynamically", "leverage / recursive borrowing presence"],
    optionalEvidence: ["historical composition"],
    prohibitedEvidence: ["APY as a proxy for complexity"],
    missingEvidenceBehavior: "blocks_scoring",
    mandatoryBlockers: ["current exposure cannot be determined", "unmodelled leverage", "unmodelled debt exposure", "unmodelled LP / impermanent-loss exposure"],
    applicability: "every product",
    notApplicablePolicy: "never n/a",
    requiresRationale: true, requiresConfidence: true,
    reReviewTriggers: ["strategy change", "new venue added"],
  },
  {
    id: "composability_dependency", label: "Composability & dependencies", weight: 8,
    purpose: "Risk inherited from every protocol the product depends on.",
    anchors: STD_ANCHORS,
    mandatoryEvidence: ["enumerated integrated protocols/venues", "audit status of each dependency", "concentration"],
    optionalEvidence: ["CPI surface"],
    prohibitedEvidence: ["assuming a dependency is safe because the parent is audited"],
    missingEvidenceBehavior: "blocks_scoring",
    mandatoryBlockers: ["an unaudited integrated component carrying material funds"],
    applicability: "every composed product",
    notApplicablePolicy: "n/a for a product with no external dependency",
    requiresRationale: true, requiresConfidence: true,
    reReviewTriggers: ["new dependency"],
  },
  {
    id: "oracle_risk", label: "Oracle & pricing", weight: 8,
    purpose: "Whether price inputs can block withdrawals or cause loss.",
    anchors: STD_ANCHORS,
    mandatoryEvidence: ["oracle providers actually used by this product", "stale-price handling", "deviation/confidence handling"],
    optionalEvidence: ["fallback logic"],
    prohibitedEvidence: ["assuming oracle coverage while exposure is unknown"],
    missingEvidenceBehavior: "blocks_scoring",
    mandatoryBlockers: ["oracle model cannot be established where the product depends on prices"],
    applicability: "products with price-dependent accounting or liquidation",
    notApplicablePolicy: "n/a only where no pricing dependency exists, evidenced",
    requiresRationale: true, requiresConfidence: true,
    reReviewTriggers: ["oracle provider change"],
  },
  {
    id: "liquidity_withdrawal", label: "Liquidity & withdrawal", weight: 12,
    purpose: "Whether a user can actually get their principal back, and on what terms.",
    anchors: STD_ANCHORS,
    mandatoryEvidence: ["withdrawal path", "instant vs queued conditions", "delay/cooldown", "withdrawal fees", "emergency behaviour"],
    optionalEvidence: ["observed exit behaviour"],
    prohibitedEvidence: ["UI currently permitting withdrawals as proof of instant liquidity", "deposit capacity as a liquidity proxy"],
    missingEvidenceBehavior: "blocks_scoring",
    mandatoryBlockers: ["withdrawal model cannot be determined"],
    applicability: "every product",
    notApplicablePolicy: "never n/a",
    requiresRationale: true, requiresConfidence: true,
    reReviewTriggers: ["withdrawal-model change", "fee change"],
  },
  {
    id: "asset_stablecoin_risk", label: "Asset / stablecoin exposure", weight: 5,
    purpose: "Risk of the principal asset and any asset the strategy introduces.",
    anchors: STD_ANCHORS,
    mandatoryEvidence: ["canonical mint verification", "issuer/freeze model", "any additional assets the strategy introduces"],
    optionalEvidence: ["depeg history"],
    prohibitedEvidence: ["scoring an asset favourably merely because it is widely used"],
    missingEvidenceBehavior: "blocks_scoring",
    mandatoryBlockers: ["wrapped/bridged exposure that is not modelled"],
    applicability: "every product",
    notApplicablePolicy: "never n/a",
    requiresRationale: true, requiresConfidence: true,
    reReviewTriggers: ["mint change", "new asset in strategy"],
  },
  {
    id: "withdrawal_fee_transparency", label: "Fee transparency", weight: 3,
    purpose: "Whether all user-borne costs are discoverable and change-detectable.",
    anchors: STD_ANCHORS,
    mandatoryEvidence: ["fee fields and units", "who can change them"],
    optionalEvidence: ["fee history"],
    prohibitedEvidence: ["assuming the quoted net rate represents all possible costs"],
    missingEvidenceBehavior: "blocks_scoring",
    mandatoryBlockers: [],
    applicability: "every product",
    notApplicablePolicy: "never n/a",
    requiresRationale: true, requiresConfidence: true,
    reReviewTriggers: ["fee change"],
  },
  {
    id: "operational_dependency_risk", label: "Operational & data risk", weight: 2,
    purpose: "Whether WealthSmith can source trustworthy data for this product on an ongoing basis.",
    anchors: STD_ANCHORS,
    mandatoryEvidence: ["official data source", "authoritative timestamp", "freshness enforceability"],
    optionalEvidence: ["source stability"],
    prohibitedEvidence: ["a third-party aggregator standing in for an official source"],
    missingEvidenceBehavior: "blocks_scoring",
    mandatoryBlockers: ["no authoritative source timestamp"],
    applicability: "every product WealthSmith surfaces",
    notApplicablePolicy: "never n/a",
    requiresRationale: true, requiresConfidence: true,
    reReviewTriggers: ["source path change"],
  },
  {
    id: "incident_history", label: "Incident history", weight: 2,
    purpose: "What has actually gone wrong, and what changed afterwards.",
    anchors: STD_ANCHORS,
    mandatoryEvidence: ["a SOURCED incident review of the product, program, dependencies and manager"],
    optionalEvidence: ["remediation detail"],
    prohibitedEvidence: ["absence of a discovered incident treated as a clean record"],
    missingEvidenceBehavior: "blocks_scoring",
    mandatoryBlockers: ["a known unremediated exploit", "no sourced incident review exists"],
    applicability: "every product",
    notApplicablePolicy: "never n/a",
    requiresRationale: true, requiresConfidence: true,
    reReviewTriggers: ["any new incident"],
  },
];

export interface RiskRubricV1 {
  rubricId: typeof PROTOCOL_RISK_RUBRIC_V1_ID;
  semver: typeof PROTOCOL_RISK_RUBRIC_V1_SEMVER;
  lifecycle: RubricLifecycle;
  approved: false;
  /** Unset. A human sets these on approval; Claude must not. */
  approvedBy?: undefined;
  approvedAt?: undefined;
  direction: ScoreDirection;
  scoreMin: number;
  scoreMax: number;
  allowsDecimals: false;
  dimensions: RiskRubricV1Dimension[];
  totalWeight: number;
  supersedes: string;
}

export function getProposedRiskRubricV1(): RiskRubricV1 {
  const dimensions = RUBRIC_V1_DIMENSIONS.map((d) => JSON.parse(JSON.stringify(d)) as RiskRubricV1Dimension);
  return {
    rubricId: PROTOCOL_RISK_RUBRIC_V1_ID,
    semver: PROTOCOL_RISK_RUBRIC_V1_SEMVER,
    lifecycle: PROTOCOL_RISK_RUBRIC_V1_LIFECYCLE,
    approved: false,
    approvedBy: undefined,
    approvedAt: undefined,
    direction: RISK_SCORE_DIRECTION,
    scoreMin: RISK_SCORE_MIN,
    scoreMax: RISK_SCORE_MAX,
    allowsDecimals: false,
    dimensions,
    totalWeight: dimensions.reduce((s, d) => s + d.weight, 0),
    supersedes: "protocol_risk_rubric v0.1.0-draft",
  };
}

/**
 * Stable rubric identity — fnv1a over the MATERIAL content (id, semver, direction, bounds, and each
 * dimension's id/weight/anchor ranges). Mirrors the repository's existing fnv1a plan-id convention.
 * Deliberately excludes prose and approval provenance: re-approving must not change the hash, but
 * changing a weight or an anchor must.
 */
export function computeRubricV1Hash(): string {
  const r = getProposedRiskRubricV1();
  const material = JSON.stringify({
    id: r.rubricId, semver: r.semver, direction: r.direction, min: r.scoreMin, max: r.scoreMax, decimals: r.allowsDecimals,
    dims: r.dimensions.map((d) => ({ id: d.id, w: d.weight, a: d.anchors.map((x) => x.range) })),
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) {
    h ^= material.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `rubric_${h.toString(16).padStart(8, "0")}`;
}

/** The APPROVED rubric, with its recorded human provenance. Use this, not the proposal, for scoring. */
export function getApprovedRiskRubricV1(): RiskRubricV1 & { approval: typeof PROTOCOL_RISK_RUBRIC_V1_APPROVAL & { rubricHash: string } } {
  const base = getProposedRiskRubricV1();
  return {
    ...base,
    lifecycle: PROTOCOL_RISK_RUBRIC_V1_LIFECYCLE,
    approved: false as false, // the literal `approved: false` field is legacy on the proposal shape;
    // the authoritative state is `lifecycle` + `approval` below. Kept to avoid a broad type change.
    approval: { ...PROTOCOL_RISK_RUBRIC_V1_APPROVAL, rubricHash: computeRubricV1Hash() },
  };
}

export type RubricApprovalFailure =
  | "reviewer_unauthorized" | "reviewer_unknown" | "reviewer_revoked" | "reviewer_not_active"
  | "reviewer_is_automated_agent" | "reviewer_out_of_scope"
  | "future_timestamp" | "rubric_version_mismatch" | "invalid_state_transition" | "provenance_conflict";

export type RubricApprovalResult =
  | { approved: true; rubricHash: string; approvedBy: string; approvedAt: string }
  | { approved: false; reason: RubricApprovalFailure; detail: string };

/**
 * Validate + record a rubric approval. This is the ONLY sanctioned path from `proposed_for_approval`
 * to `approved`, and it delegates reviewer authorization to the registry rather than trusting a caller.
 *
 * `authorize` is injected so fixtures can exercise unauthorized/revoked/agent reviewers without
 * touching the production registry.
 */
export function recordRubricApproval(args: {
  rubricId: string;
  semver: string;
  approvedBy?: string;
  approvedAt: string;
  now: string;
  fromLifecycle: RubricLifecycle;
  authorize: (reviewerId: string | undefined, role: "rubric_approver") => { authorized: boolean; reason?: string };
}): RubricApprovalResult {
  const no = (reason: RubricApprovalFailure, detail: string): RubricApprovalResult => ({ approved: false, reason, detail });

  if (args.rubricId !== PROTOCOL_RISK_RUBRIC_V1_ID || args.semver !== PROTOCOL_RISK_RUBRIC_V1_SEMVER) {
    return no("rubric_version_mismatch", `expected ${PROTOCOL_RISK_RUBRIC_V1_ID}@${PROTOCOL_RISK_RUBRIC_V1_SEMVER}`);
  }
  const t = validateRubricTransition(args.fromLifecycle, "approved");
  if (!t.valid) return no("invalid_state_transition", `${args.fromLifecycle}->approved`);

  const a = args.authorize(args.approvedBy, "rubric_approver");
  if (!a.authorized) {
    const r = a.reason ?? "reviewer_unauthorized";
    const known: RubricApprovalFailure[] = ["reviewer_unauthorized", "reviewer_unknown", "reviewer_revoked", "reviewer_not_active", "reviewer_is_automated_agent", "reviewer_out_of_scope"];
    return no((known as string[]).includes(r) ? (r as RubricApprovalFailure) : "reviewer_unauthorized", `reviewer '${args.approvedBy ?? "(none)"}' cannot approve a rubric: ${r}`);
  }
  if (!args.approvedBy) return no("provenance_conflict", "missing approvedBy");
  const at = Date.parse(args.approvedAt);
  const now = Date.parse(args.now);
  if (!Number.isFinite(at) || !Number.isFinite(now)) return no("provenance_conflict", "unparseable timestamp");
  if (at > now) return no("future_timestamp", "approvedAt is in the future");

  return { approved: true, rubricHash: computeRubricV1Hash(), approvedBy: args.approvedBy, approvedAt: args.approvedAt };
}

/** Every change from v0.1.0-draft, with the reason. Nothing was retained or dropped silently. */
export const RUBRIC_V1_CHANGES: { change: string; rationale: string }[] = [
  { change: "RETAINED audit_security (weight 25 → 15)", rationale: "Still the single most important dimension, but v0.1.0 over-weighted it relative to governance and exit risk, which the Steakhouse evidence showed matter just as much." },
  { change: "RETAINED maturity (20 → 8)", rationale: "Time-in-production is real but weak evidence; it was crowding out dimensions that describe actual control and exit." },
  { change: "REMOVED tvl_adoption from v1 scoring (was weight 15)", rationale: "TVL cannot make a product safer: a full product and an uncapped one report identical TVL, and a large pool is a larger target, not a safer one. Keeping it as a scored dimension creates a standing incentive to let a live number move a reviewed score. Its only defensible signal — 'has been trusted with funds for a while' — is already carried by `maturity`, where it survives as an OPTIONAL, reviewed, point-in-time snapshot that cannot be fetched at runtime and cannot override any blocker. The id is retained in the legacy v0.1.0 type for compatibility; v1 does not score it." },
  { change: "RETAINED withdrawal_fee_transparency (15 → 3)", rationale: "Narrowed to fee DISCOVERABILITY. The substantive exit question moved to the new `liquidity_withdrawal` dimension, which v0.1.0 lacked entirely." },
  { change: "RETAINED operational_dependency_risk (15 → 2)", rationale: "Re-scoped to WealthSmith's own data-sourcing risk. The protocol-dependency half moved to the new `composability_dependency` dimension." },
  { change: "RETAINED incident_history (10 → 2)", rationale: "Kept, with its 'absence is missing evidence' rule promoted to a mandatory blocker rather than a scoring nudge." },
  { change: "ADDED upgrade_admin_authority (15)", rationale: "The Steakhouse review found an ACTIVE upgrade authority over user funds with unknown multisig status. v0.1.0 had nowhere to record that." },
  { change: "ADDED manager_discretion (12)", rationale: "The first MVP candidate is a managed vault whose allocationAdmin can change strategy. v0.1.0 could not express manager risk at all." },
  { change: "ADDED strategy_complexity (10)", rationale: "'USDC vault' turned out to mean a four-reserve managed lending allocation. Complexity needed a home." },
  { change: "ADDED composability_dependency (8)", rationale: "Inherited risk from integrated venues was previously invisible." },
  { change: "ADDED oracle_risk (8)", rationale: "Price dependencies can block withdrawals; v0.1.0 had no oracle dimension." },
  { change: "ADDED liquidity_withdrawal (12)", rationale: "Whether a user can get their money back is arguably the most user-relevant risk, and v0.1.0 did not score it." },
  { change: "ADDED asset_stablecoin_risk (5)", rationale: "Principal-asset and strategy-introduced-asset exposure needed explicit treatment." },
  { change: "PINNED direction: higher = more evidence-supported", rationale: "Matches the existing repo direction and MIN_PROTOCOL_RISK_SCORE=7 as a FLOOR. Inverting it would turn every existing gate into a ceiling." },
  { change: "Integers only; anchored bands; rationale + confidence mandatory", rationale: "v0.1.0 allowed freeform unanchored scoring, which is not defensible or reproducible." },
];

/* ------------------------------------------------------------------ *
 * Aggregation + blockers
 * ------------------------------------------------------------------ */
export type RiskBand = "unsupported" | "weak" | "partial" | "supported" | "strongly_supported";

export interface AggregationInput {
  rubricLifecycle: RubricLifecycle;
  /** One entry per applicable dimension. */
  scores: { id: RiskRubricV1DimensionId; score: number; hasRationale: boolean; hasEvidence: boolean; notApplicable?: boolean }[];
  mandatoryBlockersPresent: string[];
  evidence: EvidenceLifecycle;
}

export type AggregationResult =
  | { ok: false; diagnostic: RiskGovernanceDiagnostic }
  | { ok: true; weightedScore: number; band: RiskBand; meetsMinimum: boolean };

const bandFor = (s: number): RiskBand => (s <= 2 ? "unsupported" : s <= 4 ? "weak" : s <= 6 ? "partial" : s <= 8 ? "supported" : "strongly_supported");

/**
 * Deterministic aggregation. The ORDER of these gates is the whole design: a mandatory blocker is
 * checked BEFORE any arithmetic, so a blocker can never be averaged away by strong scores elsewhere.
 */
export function aggregateRiskScore(input: AggregationInput): AggregationResult {
  const no = (code: RiskGovernanceDiagnosticCode, detail: string): AggregationResult => ({ ok: false, diagnostic: { code, detail, scoreAllowed: false } });

  // 1) The rubric must be APPROVED. Draft/proposed can never yield a production score.
  if (input.rubricLifecycle === "draft") return no("rubric_draft", "the rubric is a draft");
  if (input.rubricLifecycle === "proposed_for_approval") return no("rubric_proposed_not_approved", "rubric v1 is proposed but not approved — a human must approve it");
  if (input.rubricLifecycle === "superseded" || input.rubricLifecycle === "retired") return no("rubric_superseded", `rubric lifecycle is ${input.rubricLifecycle}`);
  if (input.rubricLifecycle !== "approved") return no("rubric_missing", "no approved rubric");

  // 2) Evidence must be complete.
  if (input.evidence !== "complete") return no("evidence_incomplete", `evidence is ${input.evidence}`);

  // 3) Mandatory blockers — BEFORE arithmetic, so they cannot vanish inside an average.
  if (input.mandatoryBlockersPresent.length > 0) return no("mandatory_blocker_present", input.mandatoryBlockersPresent.join(","));

  // 4) Every applicable dimension must be scored, anchored, rationalised and evidenced.
  const applicable = RUBRIC_V1_DIMENSIONS.filter((d) => !input.scores.find((s) => s.id === d.id)?.notApplicable);
  const seen = new Set<string>();
  for (const s of input.scores) {
    if (!RUBRIC_V1_DIMENSIONS.some((d) => d.id === s.id)) return no("score_invalid", `unknown_dimension:${s.id}`);
    if (seen.has(s.id)) return no("score_invalid", `duplicate_dimension:${s.id}`);
    seen.add(s.id);
    if (s.notApplicable) continue;
    if (!Number.isInteger(s.score)) return no("score_invalid", `unsupported_precision:${s.id}`);
    if (s.score < RISK_SCORE_MIN || s.score > RISK_SCORE_MAX) return no("score_invalid", `out_of_range:${s.id}`);
    if (!s.hasRationale) return no("score_invalid", `missing_rationale:${s.id}`);
    if (!s.hasEvidence) return no("score_invalid", `missing_evidence_reference:${s.id}`);
  }
  const missing = applicable.filter((d) => !input.scores.some((s) => s.id === d.id && !s.notApplicable));
  if (missing.length > 0) return no("score_partial", `missing_dimensions:${missing.map((d) => d.id).join(",")}`);

  // 5) Weighted mean over applicable dimensions, renormalised so n/a does not silently deflate.
  let num = 0;
  let den = 0;
  for (const d of applicable) {
    const s = input.scores.find((x) => x.id === d.id)!;
    num += s.score * d.weight;
    den += d.weight;
  }
  if (den === 0) return no("score_invalid", "no_applicable_dimensions");
  const weightedScore = Math.round((num / den) * 100) / 100;

  // 6) Severe-dimension override: any dimension in the `unsupported` band (0-2) caps the result there,
  //    regardless of the weighted mean. A product cannot be "supported overall" while one pillar is
  //    unsupported — that is exactly the averaging failure this rule exists to prevent.
  const severe = applicable.some((d) => (input.scores.find((x) => x.id === d.id)!.score) <= 2);
  const band: RiskBand = severe ? "unsupported" : bandFor(weightedScore);

  // MIN_PROTOCOL_RISK_SCORE = 7 is the repository's existing FLOOR (higher = safer).
  return { ok: true, weightedScore, band, meetsMinimum: !severe && weightedScore >= 7 };
}

/* ------------------------------------------------------------------ *
 * State-transition validation
 * ------------------------------------------------------------------ */
const RUBRIC_TRANSITIONS: Record<RubricLifecycle, RubricLifecycle[]> = {
  draft: ["proposed_for_approval"],
  proposed_for_approval: ["approved", "draft"],
  approved: ["superseded", "retired"],
  superseded: ["retired"],
  retired: [],
};

/** The canonical review path. Skipping a state is rejected — that is the point. */
export type RiskReviewState =
  | "not_started" | "evidence_incomplete" | "evidence_complete"
  | "partially_scored" | "scoring_complete"
  | "in_review" | "reviewed"
  | "awaiting_signoff" | "risk_approved" | "risk_rejected";

const REVIEW_TRANSITIONS: Record<RiskReviewState, RiskReviewState[]> = {
  not_started: ["evidence_incomplete"],
  evidence_incomplete: ["evidence_complete", "not_started"],
  evidence_complete: ["partially_scored", "evidence_incomplete"],
  partially_scored: ["scoring_complete", "evidence_incomplete"],
  scoring_complete: ["in_review", "partially_scored"],
  in_review: ["reviewed", "partially_scored"],
  reviewed: ["awaiting_signoff", "in_review"],
  awaiting_signoff: ["risk_approved", "risk_rejected"],
  risk_approved: ["risk_rejected"],
  risk_rejected: ["evidence_incomplete"],
};

export function validateRubricTransition(from: RubricLifecycle, to: RubricLifecycle): { valid: boolean; diagnostic?: RiskGovernanceDiagnostic } {
  if (RUBRIC_TRANSITIONS[from]?.includes(to)) return { valid: true };
  return { valid: false, diagnostic: { code: "invalid_state_transition", detail: `rubric:${from}->${to}`, scoreAllowed: false } };
}

export function validateReviewTransition(from: RiskReviewState, to: RiskReviewState): { valid: boolean; diagnostic?: RiskGovernanceDiagnostic } {
  if (REVIEW_TRANSITIONS[from]?.includes(to)) return { valid: true };
  return { valid: false, diagnostic: { code: "invalid_state_transition", detail: `review:${from}->${to}`, scoreAllowed: false } };
}

/**
 * Risk signoff NEVER implies product approval. This helper exists so the boundary is a named, tested
 * fact rather than a convention someone might quietly break later.
 */
export function riskSignoffImpliesProductApproval(): false {
  return false;
}

/** Legacy v0.1.0 dimension ids, for the migration report. Not scored by v1. */
export type LegacyRubricDimensionId = ProtocolRiskRubricDimensionId;

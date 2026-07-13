/**
 * solLiquidStakingFreshEvidenceIntake — Step 14D. An intake + validation layer for
 * recording FRESH source values and evidence for the staged SOL liquid-staking
 * candidates (mSOL / JupSOL / bSOL / INF) before risk scoring.
 *
 * INTAKE + VALIDATION ONLY. It never assigns a risk score, approves a candidate,
 * enables multi-protocol selection, updates a live recommendation, or replaces Jito
 * as the selected protocol. No transaction/signature path. It is not imported by
 * `stakingSuggestion` or any live/UI file — only by docs and fixtures.
 *
 * HONESTY: nothing is `accepted` unless the input explicitly provides value/evidence
 * text + sourceName + sourceUrl + confirmedAt + confirmedBy + reviewerRole AND the
 * confirmation is within the 24h freshness window. No value or evidence is invented;
 * without fresh input, candidates remain blocked.
 */
import { getSolLiquidStakingCandidateById } from "./solLiquidStakingCandidateRegistry";
import { isProtocolRiskRubricApproved } from "./protocolRiskRubric";
import { getCurrentProtocolRiskRubricApprovalDecision } from "./protocolRiskApprovalDecision";

export const SOL_LST_FRESH_EVIDENCE_INTAKE_EXISTS = true;
/** Correctly-spelled flag. Intake NEVER assigns a risk score. */
export const SOL_LST_FRESH_EVIDENCE_INTAKE_ASSIGNS_RISK_SCORES = false;
export const SOL_LST_FRESH_EVIDENCE_INTAKE_APPROVES_CANDIDATES = false;
export const SOL_LST_FRESH_EVIDENCE_INTAKE_ENABLES_MULTI_PROTOCOL_SELECTION = false;
export const SOL_LST_FRESH_EVIDENCE_INTAKE_UPDATES_LIVE_RECOMMENDATIONS = false;
export const SOL_LST_FRESH_EVIDENCE_INTAKE_ENABLES_TRANSACTIONS = false;
export const SOL_LST_FRESH_EVIDENCE_INTAKE_REQUIRES_WALLET_SIGNATURE = false;

/** Evidence is fresh only within this window. */
export const SOL_LST_FRESH_EVIDENCE_MAX_AGE_HOURS = 24;

/* ------------------------------------------------------------------ *
 * Types.
 * ------------------------------------------------------------------ */
export type SolLstFreshEvidenceProtocolId = "marinade" | "jupiter" | "blazestake" | "sanctum";

export type SolLstFreshEvidenceCategory =
  | "tvl"
  | "current_apy"
  | "apy_30d"
  | "withdrawal_mechanics"
  | "direct_unstake_time"
  | "direct_unstake_fee"
  | "annual_management_fee"
  | "audit_security"
  | "operational_risk"
  | "incident_review";

export type SolLstFreshEvidenceStatus =
  | "accepted"
  | "rejected"
  | "stale"
  | "incomplete"
  | "unsupported_protocol"
  | "invalid_category";

export type SolLstFreshEvidenceUnit = "usd" | "pct" | "hours" | "text" | "boolean";
export type SolLstFreshEvidenceReviewerRole = "founder" | "product" | "risk" | "engineering" | "compliance";

export interface SolLstFreshEvidenceInput {
  protocolId: SolLstFreshEvidenceProtocolId;
  category: SolLstFreshEvidenceCategory;
  value: number | string | boolean;
  unit: SolLstFreshEvidenceUnit;
  sourceName: string;
  sourceUrl: string;
  confirmedAt: string;
  confirmedBy: string;
  reviewerRole: SolLstFreshEvidenceReviewerRole;
  notes?: string[];
}

export interface SolLstFreshEvidenceRecord {
  protocolId: SolLstFreshEvidenceProtocolId;
  protocolName: string;
  lstSymbol: string;
  category: SolLstFreshEvidenceCategory;
  status: SolLstFreshEvidenceStatus;
  value?: number | string | boolean;
  unit?: SolLstFreshEvidenceUnit;
  sourceName?: string;
  sourceUrl?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  reviewerRole?: SolLstFreshEvidenceReviewerRole;
  notes: string[];
  blockers: string[];
}

export interface SolLstFreshEvidenceCandidateSummary {
  protocolId: SolLstFreshEvidenceProtocolId;
  protocolName: string;
  lstSymbol: string;
  records: SolLstFreshEvidenceRecord[];
  acceptedCount: number;
  staleCount: number;
  incompleteCount: number;
  marketDataComplete: boolean;
  mechanicsComplete: boolean;
  evidenceComplete: boolean;
  allEvidenceFresh: boolean;
  readyForRiskGate: boolean;
  blockers: string[];
}

/* ------------------------------------------------------------------ *
 * Category groupings.
 * ------------------------------------------------------------------ */
const SUPPORTED_PROTOCOLS: SolLstFreshEvidenceProtocolId[] = ["marinade", "jupiter", "blazestake", "sanctum"];
const MARKET_CATEGORIES: SolLstFreshEvidenceCategory[] = ["tvl", "current_apy", "apy_30d"];
const MECHANICS_CATEGORIES: SolLstFreshEvidenceCategory[] = ["withdrawal_mechanics", "direct_unstake_time", "direct_unstake_fee", "annual_management_fee"];
const EVIDENCE_CATEGORIES: SolLstFreshEvidenceCategory[] = ["audit_security", "operational_risk", "incident_review"];
// Numeric categories require a number value; the rest (withdrawal_mechanics,
// audit_security, operational_risk, incident_review) require text.
const NUMERIC_CATEGORIES: SolLstFreshEvidenceCategory[] = ["tvl", "current_apy", "apy_30d", "direct_unstake_time", "direct_unstake_fee", "annual_management_fee"];
const ALL_CATEGORIES: SolLstFreshEvidenceCategory[] = [...MARKET_CATEGORIES, ...MECHANICS_CATEGORIES, ...EVIDENCE_CATEGORIES];

/* ------------------------------------------------------------------ *
 * Validation.
 * ------------------------------------------------------------------ */
function evaluateInput(input: SolLstFreshEvidenceInput, checkedAt?: string): { status: SolLstFreshEvidenceStatus; blockers: string[] } {
  if (!SUPPORTED_PROTOCOLS.includes(input.protocolId)) return { status: "unsupported_protocol", blockers: ["unsupported_protocol"] };
  if (!ALL_CATEGORIES.includes(input.category)) return { status: "invalid_category", blockers: ["invalid_category"] };

  const blockers: string[] = [];
  const isNumeric = NUMERIC_CATEGORIES.includes(input.category);
  const valueMissing = input.value === undefined || input.value === null || (typeof input.value === "string" && input.value.trim() === "");
  if (valueMissing) {
    blockers.push("missing_value");
  } else if ((isNumeric && typeof input.value !== "number") || (!isNumeric && typeof input.value !== "string")) {
    blockers.push("invalid_value_type");
  }
  if (!input.sourceName || input.sourceName.trim() === "") blockers.push("missing_source_name");
  if (!input.sourceUrl || input.sourceUrl.trim() === "") blockers.push("missing_source_url");
  const confirmedTime = input.confirmedAt ? Date.parse(input.confirmedAt) : NaN;
  if (!input.confirmedAt || Number.isNaN(confirmedTime)) blockers.push("missing_confirmed_at");
  if (!input.confirmedBy || input.confirmedBy.trim() === "") blockers.push("missing_confirmed_by");
  if (!input.reviewerRole) blockers.push("missing_reviewer_role");

  // A wrong value TYPE is a hard reject; other missing fields are incomplete.
  if (blockers.includes("invalid_value_type")) return { status: "rejected", blockers };
  if (blockers.length > 0) return { status: "incomplete", blockers };

  // All fields present + valid → freshness.
  const evalTime = checkedAt ? Date.parse(checkedAt) : Date.now();
  const ageMs = evalTime - confirmedTime;
  if (Number.isNaN(evalTime) || ageMs < 0 || ageMs > SOL_LST_FRESH_EVIDENCE_MAX_AGE_HOURS * 60 * 60 * 1000) {
    return { status: "stale", blockers: ["stale_evidence"] };
  }
  return { status: "accepted", blockers: [] };
}

/** Validate one fresh-evidence input and return its status (never approves/scores). */
export function validateSolLstFreshEvidenceInput(input: SolLstFreshEvidenceInput, checkedAt?: string): SolLstFreshEvidenceStatus {
  return evaluateInput(input, checkedAt).status;
}

/** Convert one input into a validated record (adds registry name/symbol + blockers). */
export function createSolLstFreshEvidenceRecord(input: SolLstFreshEvidenceInput, checkedAt?: string): SolLstFreshEvidenceRecord {
  const { status, blockers } = evaluateInput(input, checkedAt);
  const candidate = getSolLiquidStakingCandidateById(input.protocolId);
  return {
    protocolId: input.protocolId,
    protocolName: candidate?.protocolName ?? String(input.protocolId),
    lstSymbol: candidate?.lstSymbol ?? "",
    category: input.category,
    status,
    ...(input.value !== undefined ? { value: input.value } : {}),
    ...(input.unit ? { unit: input.unit } : {}),
    ...(input.sourceName ? { sourceName: input.sourceName } : {}),
    ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
    ...(input.confirmedAt ? { confirmedAt: input.confirmedAt } : {}),
    ...(input.confirmedBy ? { confirmedBy: input.confirmedBy } : {}),
    ...(input.reviewerRole ? { reviewerRole: input.reviewerRole } : {}),
    notes: input.notes ?? [],
    blockers,
  };
}

/* ------------------------------------------------------------------ *
 * Candidate summaries from records.
 * ------------------------------------------------------------------ */
export function summarizeSolLstFreshEvidenceRecords(records: SolLstFreshEvidenceRecord[], checkedAt?: string): SolLstFreshEvidenceCandidateSummary[] {
  void checkedAt; // records already carry their validated status
  const ids = [...new Set(records.map((r) => r.protocolId))];

  return ids.map((protocolId) => {
    const rows = records.filter((r) => r.protocolId === protocolId);
    const first = rows[0];
    const acceptedCats = new Set(rows.filter((r) => r.status === "accepted").map((r) => r.category));
    const complete = (cats: SolLstFreshEvidenceCategory[]) => cats.every((c) => acceptedCats.has(c));

    const marketDataComplete = complete(MARKET_CATEGORIES);
    const mechanicsComplete = complete(MECHANICS_CATEGORIES);
    const evidenceComplete = complete(EVIDENCE_CATEGORIES);

    const staleCount = rows.filter((r) => r.status === "stale").length;
    const incompleteCount = rows.filter((r) => r.status === "incomplete" || r.status === "rejected" || r.status === "unsupported_protocol" || r.status === "invalid_category").length;
    const acceptedCount = rows.filter((r) => r.status === "accepted").length;

    const allRequiredAccepted = marketDataComplete && mechanicsComplete && evidenceComplete;
    const allEvidenceFresh = allRequiredAccepted && staleCount === 0 && incompleteCount === 0;
    const readyForRiskGate = marketDataComplete && mechanicsComplete && evidenceComplete && allEvidenceFresh;

    const blockers: string[] = [];
    if (!marketDataComplete) blockers.push("market_data_incomplete");
    if (!mechanicsComplete) blockers.push("mechanics_incomplete");
    if (!evidenceComplete) blockers.push("evidence_incomplete");
    if (staleCount > 0) blockers.push("stale_evidence");
    if (incompleteCount > 0) blockers.push("incomplete_records");

    return {
      protocolId,
      protocolName: first.protocolName,
      lstSymbol: first.lstSymbol,
      records: rows,
      acceptedCount,
      staleCount,
      incompleteCount,
      marketDataComplete,
      mechanicsComplete,
      evidenceComplete,
      allEvidenceFresh,
      readyForRiskGate,
      blockers,
    };
  });
}

/* ------------------------------------------------------------------ *
 * Fixture-only example inputs (a COMPLETE package for one candidate).
 * ------------------------------------------------------------------ */
const FIXTURE_NOTE = "Fixture-only value for intake validation; not production evidence.";

interface FixtureInputOptions {
  protocolId?: SolLstFreshEvidenceProtocolId;
  confirmedAt?: string;
}

/**
 * FIXTURE-ONLY. A complete set of TEST_ONLY inputs for one candidate (default
 * `marinade`) — used only to exercise the intake. It does not update the registry,
 * approve the candidate, assign a score, or affect the live selector. The values are
 * fake and flagged; do not use them in production summaries.
 */
export function getSolLstFreshEvidenceFixtureInputs(options: FixtureInputOptions = {}): SolLstFreshEvidenceInput[] {
  const protocolId = options.protocolId ?? "marinade";
  const confirmedAt = options.confirmedAt ?? "2026-07-13T00:00:00Z";
  const common = {
    protocolId,
    sourceName: "TEST_ONLY source",
    sourceUrl: "https://example.com/fixture",
    confirmedAt,
    confirmedBy: "TEST_ONLY reviewer",
    reviewerRole: "risk" as const,
    notes: [FIXTURE_NOTE],
  };
  return [
    { ...common, category: "tvl", value: 100000000, unit: "usd" },
    { ...common, category: "current_apy", value: 5.0, unit: "pct" },
    { ...common, category: "apy_30d", value: 5.1, unit: "pct" },
    { ...common, category: "withdrawal_mechanics", value: "Delayed unstake via stake-account deactivation (fixture text).", unit: "text" },
    { ...common, category: "direct_unstake_time", value: 48, unit: "hours" },
    { ...common, category: "direct_unstake_fee", value: 0.1, unit: "pct" },
    { ...common, category: "annual_management_fee", value: 6, unit: "pct" },
    { ...common, category: "audit_security", value: "Audited; fixture-only reference.", unit: "text" },
    { ...common, category: "operational_risk", value: "Operational review; fixture-only reference.", unit: "text" },
    { ...common, category: "incident_review", value: "No incidents on record; fixture-only reference.", unit: "text" },
  ];
}

/* ------------------------------------------------------------------ *
 * Optional non-live risk-gate preview.
 * ------------------------------------------------------------------ */
export interface SolLstFreshEvidenceRiskGatePreview {
  protocolId: SolLstFreshEvidenceProtocolId;
  wouldClearValueAndEvidenceBlockers: boolean;
  stillRequiresRubricApproval: boolean;
  stillRequiresRiskApprovalDecision: boolean;
  blockers: string[];
  scoreAssigned: false;
  candidateApproved: false;
  liveRecommendationsUpdated: false;
  transactionsEnabled: false;
}

/**
 * NON-LIVE preview of what fresh evidence WOULD do at the risk gate. It does not
 * mutate the 14B confirmations or the candidate registry, assign a score, or approve
 * a candidate. Even when value/evidence blockers would clear, rubric approval and the
 * risk approval decision are still required (both currently unapproved).
 */
export function previewSolLstRiskGateWithFreshEvidence(records: SolLstFreshEvidenceRecord[], checkedAt?: string): SolLstFreshEvidenceRiskGatePreview[] {
  const rubricApproved = (isProtocolRiskRubricApproved() as boolean) === true;
  const scoreDecisionAllowed = getCurrentProtocolRiskRubricApprovalDecision().scoreAssignmentAllowed === true;
  return summarizeSolLstFreshEvidenceRecords(records, checkedAt).map((s) => ({
    protocolId: s.protocolId,
    wouldClearValueAndEvidenceBlockers: s.readyForRiskGate,
    stillRequiresRubricApproval: !rubricApproved,
    stillRequiresRiskApprovalDecision: !scoreDecisionAllowed,
    blockers: s.readyForRiskGate ? [] : s.blockers,
    scoreAssigned: false,
    candidateApproved: false,
    liveRecommendationsUpdated: false,
    transactionsEnabled: false,
  }));
}

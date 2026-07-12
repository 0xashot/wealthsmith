/**
 * protocolSolLiquidStakingSourceValueConfirmation — records a reviewer's CONFIRMED
 * value read from an already-verified source (Step 12U).
 *
 * Step 12T verified that a source LINK exists; 12U records the exact value a
 * reviewer read from it (e.g. a TVL number as-of a date, an unstake timing, a fee).
 * INTAKE ONLY:
 *  - writes NO production metadata (`productionMetadataUpdated` always false),
 *  - mutates NO evidence drafts (`evidenceDraftMutated` always false),
 *  - assigns NO `riskScore` and approves no rubric (`scoreAssigned` always false),
 *  - selects no protocol and makes no recommendation.
 *
 * Nothing is invented here: a value is only ever what a reviewer supplies, from a
 * source that is `verified` in 12T. The example confirmations are QA-ONLY and use a
 * literal `QA_ONLY_NOT_LIVE` placeholder — never a real/live market value.
 * `PROTOCOL_SELECTION_IMPLEMENTED = false`; `productionReady = false`.
 */
import type { ProtocolRiskReviewerRole } from "./protocolRiskApprovalDecision";
import {
  getVerifiedSourceResults,
  type ProtocolSourceVerificationEvidenceType,
} from "./protocolSolLiquidStakingSourceVerification";

export const PROTOCOL_SOURCE_VALUE_CONFIRMATION_EXISTS = true;
export const PROTOCOL_SOURCE_VALUE_CONFIRMATION_APPROVES_RUBRIC = false;
export const PROTOCOL_SOURCE_VALUE_CONFIRMATION_ASSIGNS_SCORES = false;
export const PROTOCOL_SOURCE_VALUE_CONFIRMATION_AFFECTS_PRODUCTION = false;
export const PROTOCOL_SOURCE_VALUE_CONFIRMATION_ENABLES_SELECTION = false;
export const PROTOCOL_SOURCE_VALUE_CONFIRMATION_UPDATES_METADATA = false;

/** A literal placeholder for QA example values — never a real market value. */
export const QA_ONLY_VALUE_PLACEHOLDER = "QA_ONLY_NOT_LIVE";

export type ProtocolSourceValueCategory =
  | "tvl"
  | "apy"
  | "withdrawal_time"
  | "withdrawal_mechanics"
  | "fees"
  | "audit_scope"
  | "audit_date"
  | "audit_firm"
  | "operational_dependency"
  | "incident_history";

export type ProtocolSourceValueConfirmationStatus =
  | "confirmed"
  | "rejected"
  | "needs_review"
  | "stale"
  | "insufficient";

export type ProtocolSourceConfirmedValueType =
  | "number_usd"
  | "percent"
  | "hours"
  | "text"
  | "date"
  | "boolean"
  | "none";

export interface ProtocolSourceValueConfirmationInput {
  protocolId: string;
  lstSymbol: string;
  category: ProtocolSourceValueCategory;
  sourceName: string;
  sourceUrl?: string;
  sourceType: ProtocolSourceVerificationEvidenceType;
  confirmedValueType: ProtocolSourceConfirmedValueType;
  confirmedValue?: string;
  confirmedAsOf?: string;
  reviewer?: string;
  reviewerRole?: ProtocolRiskReviewerRole;
  notes: string[];
}

export interface ProtocolSourceValueConfirmationResult {
  protocolId: string;
  lstSymbol: string;
  category: ProtocolSourceValueCategory;
  sourceName: string;
  sourceUrl?: string;
  status: ProtocolSourceValueConfirmationStatus;
  confirmedValueType: ProtocolSourceConfirmedValueType;
  confirmedValue?: string;
  confirmedAsOf?: string;
  reviewer?: string;
  reviewerRole?: ProtocolRiskReviewerRole;
  reasons: string[];
  unresolvedQuestions: string[];
  productionMetadataUpdated: false;
  evidenceDraftMutated: false;
  scoreAssigned: false;
}

export interface ProtocolSourceValueConfirmationSummary {
  totalConfirmations: number;
  confirmed: number;
  rejected: number;
  needsReview: number;
  stale: number;
  insufficient: number;
  productionMetadataUpdatedCount: 0;
  evidenceDraftMutatedCount: 0;
  scoreAssignedCount: 0;
  protocolsCovered: string[];
  categoriesCovered: ProtocolSourceValueCategory[];
}

/** Categories whose values are time-sensitive and require an as-of timestamp. */
const TIME_SENSITIVE: ReadonlySet<ProtocolSourceValueCategory> = new Set(["tvl", "apy"]);

/** Is there a matching 12T VERIFIED source for this confirmation input? */
function hasVerifiedSource(input: ProtocolSourceValueConfirmationInput): boolean {
  const verified = getVerifiedSourceResults(input.protocolId);
  return verified.some(
    (r) => (input.sourceUrl != null && r.sourceUrl === input.sourceUrl) || r.sourceName === input.sourceName
  );
}

/**
 * Record a reviewer-confirmed value. Deterministic and pure. Never writes
 * production metadata, mutates a draft, or assigns a score.
 *
 * A value is `confirmed` ONLY when: its source is `verified` (12T), a
 * `confirmedValue` is present (unless type is `none`), an as-of timestamp exists
 * for time-sensitive values (TVL/APY), and both reviewer + reviewerRole are given.
 * Anything short of that is `needs_review` / `insufficient` (never confirmed).
 */
export function confirmSourceValue(
  input: ProtocolSourceValueConfirmationInput
): ProtocolSourceValueConfirmationResult {
  const base = {
    protocolId: input.protocolId,
    lstSymbol: input.lstSymbol,
    category: input.category,
    sourceName: input.sourceName,
    ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
    confirmedValueType: input.confirmedValueType,
    ...(input.confirmedValue != null ? { confirmedValue: input.confirmedValue } : {}),
    ...(input.confirmedAsOf ? { confirmedAsOf: input.confirmedAsOf } : {}),
    ...(input.reviewer ? { reviewer: input.reviewer } : {}),
    ...(input.reviewerRole ? { reviewerRole: input.reviewerRole } : {}),
    productionMetadataUpdated: false as const,
    evidenceDraftMutated: false as const,
    scoreAssigned: false as const,
  };
  const result = (
    status: ProtocolSourceValueConfirmationStatus,
    reasons: string[],
    unresolvedQuestions: string[] = []
  ): ProtocolSourceValueConfirmationResult => ({ ...base, status, reasons, unresolvedQuestions });

  // 1. Source must be verified in 12T.
  if (!hasVerifiedSource(input)) {
    return result("needs_review", ["Source is not among the 12T verified sources for this protocol."], [
      "Verify the source at the source level (12T) before confirming a value.",
    ]);
  }

  // 2. Reviewer identity required.
  if (!input.reviewer || !input.reviewerRole) {
    return result("needs_review", ["A confirmation requires both reviewer and reviewerRole."], [
      "Supply reviewer + reviewerRole.",
    ]);
  }

  // 3. A value is required unless the type is explicitly `none`.
  if (input.confirmedValueType !== "none" && (input.confirmedValue == null || input.confirmedValue.trim() === "")) {
    return result("insufficient", ["confirmedValue is missing for a non-'none' value type."], [
      "Copy the exact value from the source.",
    ]);
  }

  // 4. Time-sensitive values need an as-of timestamp.
  if (TIME_SENSITIVE.has(input.category) && (input.confirmedAsOf == null || input.confirmedAsOf.trim() === "")) {
    return result("insufficient", ["confirmedAsOf is required for time-sensitive values (TVL/APY)."], [
      "Record the as-of timestamp for this value.",
    ]);
  }

  return result("confirmed", ["Reviewer confirmed the value from a verified source. Non-production; not promoted to metadata."]);
}

/**
 * QA-ONLY example confirmations — NOT live values, NOT current market data. Every
 * value is the literal `QA_ONLY_NOT_LIVE` placeholder. These exist ONLY to prove
 * the confirmation logic (a valid case + insufficient + needs_review + unverified).
 */
export function getExampleSourceValueConfirmations(): ProtocolSourceValueConfirmationInput[] {
  const infTvlSource = getVerifiedSourceResults("sanctum", "tvl")[0];
  return [
    // Valid example: verified INF codebase source + QA value + as-of + reviewer.
    {
      protocolId: "sanctum",
      lstSymbol: "INF",
      category: "tvl",
      sourceName: infTvlSource?.sourceName ?? "DefiLlama INF pool (codebase-verified)",
      ...(infTvlSource?.sourceUrl ? { sourceUrl: infTvlSource.sourceUrl } : {}),
      sourceType: "codebase",
      confirmedValueType: "number_usd",
      confirmedValue: QA_ONLY_VALUE_PLACEHOLDER,
      confirmedAsOf: "2026-07-12T00:00:00Z",
      reviewer: "qa-example",
      reviewerRole: "risk",
      notes: ["QA-ONLY example. Not a live value, not current market data. Proves the confirmation path only."],
    },
    // Insufficient: TVL confirmation missing confirmedAsOf.
    {
      protocolId: "sanctum",
      lstSymbol: "INF",
      category: "tvl",
      sourceName: infTvlSource?.sourceName ?? "DefiLlama INF pool (codebase-verified)",
      sourceType: "codebase",
      confirmedValueType: "number_usd",
      confirmedValue: QA_ONLY_VALUE_PLACEHOLDER,
      reviewer: "qa-example",
      reviewerRole: "risk",
      notes: ["QA-ONLY example. Missing confirmedAsOf → insufficient."],
    },
    // Needs review: missing reviewer.
    {
      protocolId: "sanctum",
      lstSymbol: "INF",
      category: "withdrawal_time",
      sourceName: "Sanctum — Infinity docs",
      sourceUrl: "https://learn.sanctum.so/docs/technical-documentation/infinity",
      sourceType: "official_docs",
      confirmedValueType: "hours",
      confirmedValue: QA_ONLY_VALUE_PLACEHOLDER,
      notes: ["QA-ONLY example. Missing reviewer/reviewerRole → needs_review."],
    },
    // Rejected/needs_review: source not verified in 12T.
    {
      protocolId: "sanctum",
      lstSymbol: "INF",
      category: "fees",
      sourceName: "Unlisted third-party blog",
      sourceUrl: "https://example.invalid/not-a-verified-source",
      sourceType: "manual_review",
      confirmedValueType: "text",
      confirmedValue: QA_ONLY_VALUE_PLACEHOLDER,
      reviewer: "qa-example",
      reviewerRole: "risk",
      notes: ["QA-ONLY example. Source not verified in 12T → needs_review."],
    },
  ];
}

export function getSourceValueConfirmationResults(
  inputs: ProtocolSourceValueConfirmationInput[]
): ProtocolSourceValueConfirmationResult[] {
  return inputs.map(confirmSourceValue);
}

export function summarizeSourceValueConfirmations(
  results: ProtocolSourceValueConfirmationResult[]
): ProtocolSourceValueConfirmationSummary {
  const countStatus = (s: ProtocolSourceValueConfirmationStatus) => results.filter((r) => r.status === s).length;
  return {
    totalConfirmations: results.length,
    confirmed: countStatus("confirmed"),
    rejected: countStatus("rejected"),
    needsReview: countStatus("needs_review"),
    stale: countStatus("stale"),
    insufficient: countStatus("insufficient"),
    productionMetadataUpdatedCount: 0,
    evidenceDraftMutatedCount: 0,
    scoreAssignedCount: 0,
    protocolsCovered: [...new Set(results.map((r) => r.protocolId))],
    categoriesCovered: [...new Set(results.map((r) => r.category))],
  };
}

export function getConfirmedSourceValues(
  results: ProtocolSourceValueConfirmationResult[],
  protocolId?: string,
  category?: ProtocolSourceValueCategory
): ProtocolSourceValueConfirmationResult[] {
  return results.filter(
    (r) => r.status === "confirmed" && (protocolId == null || r.protocolId === protocolId) && (category == null || r.category === category)
  );
}

export function getNeedsReviewSourceValues(
  results: ProtocolSourceValueConfirmationResult[],
  protocolId?: string,
  category?: ProtocolSourceValueCategory
): ProtocolSourceValueConfirmationResult[] {
  return results.filter(
    (r) => r.status === "needs_review" && (protocolId == null || r.protocolId === protocolId) && (category == null || r.category === category)
  );
}

export function getInsufficientSourceValues(
  results: ProtocolSourceValueConfirmationResult[],
  protocolId?: string,
  category?: ProtocolSourceValueCategory
): ProtocolSourceValueConfirmationResult[] {
  return results.filter(
    (r) => r.status === "insufficient" && (protocolId == null || r.protocolId === protocolId) && (category == null || r.category === category)
  );
}

/**
 * suggestionReviewDetails — deterministic builder for the Step 10A structured
 * Suggestion Review Details. Category rules supply the DOMAIN content (metrics,
 * assets, positions, calculations, reason); this module derives the
 * cross-cutting parts that must stay consistent everywhere: the guardrail
 * summary (grouped into user-facing labels, never raw codes), the limitations,
 * and the safety notes.
 *
 * HONESTY: every string here is approved/templated — never AI-generated. The
 * guardrail summary reflects real statuses only (cost/liquidity/slippage stay
 * "Not evaluated yet"); nothing invents APY/TVL/risk/liquidity/slippage/route/
 * protocol data. This module produces DATA only — no UI, no card exposure.
 */
import type {
  GuardrailCode,
  ProtocolSelection,
  ReviewAsset,
  ReviewCalculation,
  ReviewGuardrailSummary,
  ReviewLimitation,
  ReviewMetric,
  ReviewMetricKind,
  ReviewPosition,
  ReviewSafetyNote,
  SuggestionActionKind,
  SuggestionCategory,
  SuggestionGuardrail,
  SuggestionReviewDetails,
} from "./engineTypes";
import { protocolGuardrailStatus } from "./protocolSelection";
import {
  SUGGESTION_BUFFER_TITLE,
  SUGGESTION_REBALANCE_TITLE,
  SUGGESTION_CAPITAL_EFFICIENCY_TITLE,
  SUGGESTION_TRIM_TITLE,
  SUGGESTION_STAKING_TITLE,
  SUGGESTION_STABLE_YIELD_TITLE,
  SUGGESTION_DCA_TITLE,
  SUGGESTION_POSITION_OPTIMIZATION_TITLE,
  SUGGESTION_ON_TRACK_TITLE,
} from "../state/approvedCopy";

/**
 * Guardrail code → user-facing label. Total over GuardrailCode so a new code
 * can't silently leak its raw name into the drawer. Never shown as a code.
 */
const GUARDRAIL_LABELS: Record<GuardrailCode, string> = {
  min_trade_size: "Minimum suggestion size",
  buffer_protection: "Safety Buffer protection",
  pricing_available: "Pricing availability",
  allocation_delta: "Allocation vs target",
  idle_asset_threshold: "Idle asset threshold",
  token_scope: "Token scope reviewed",
  contribution_available: "Planned contribution",
  allocation_gap: "Allocation gap",
  token_selection: "Token selection",
  sol_fee_reserve: "SOL fee reserve",
  position_value_threshold: "Position value threshold",
  apy_data_review: "Yield (APY) data",
  concentration_review: "Concentration review",
  exposure_grouping: "Exposure grouping",
  protocol_selection: "Protocol selection",
  cost_available: "Route cost",
  liquidity_available: "Liquidity depth",
  slippage_available: "Slippage",
};

/** Engine category → short drawer category label. */
const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  buffer: "Safety Buffer",
  rebalance: "Allocation",
  capital_efficiency: "Capital Efficiency",
  trim: "Portfolio Health",
  staking: "Staking",
  stable_yield: "Stablecoin Yield",
  dca: "Contribution Plan",
  position_optimization: "Portfolio Health",
  on_track: "On Track",
};

/** Engine category → the approved card title (kept identical to the card). */
const TITLE_BY_CATEGORY: Record<SuggestionCategory, string> = {
  buffer: SUGGESTION_BUFFER_TITLE,
  rebalance: SUGGESTION_REBALANCE_TITLE,
  capital_efficiency: SUGGESTION_CAPITAL_EFFICIENCY_TITLE,
  trim: SUGGESTION_TRIM_TITLE,
  staking: SUGGESTION_STAKING_TITLE,
  stable_yield: SUGGESTION_STABLE_YIELD_TITLE,
  dca: SUGGESTION_DCA_TITLE,
  position_optimization: SUGGESTION_POSITION_OPTIMIZATION_TITLE,
  on_track: SUGGESTION_ON_TRACK_TITLE,
};

/** Default one-line reason per category (rules may override with specifics). */
const DEFAULT_REASON: Record<SuggestionCategory, string> = {
  buffer: "Your Safety Buffer is below its risk-based target.",
  rebalance: "Your allocation has drifted from your target.",
  capital_efficiency: "Some assets may not be contributing to your plan.",
  trim: "Some non-core assets may deserve review.",
  staking: "You have liquid SOL that may be eligible for review.",
  stable_yield:
    "You have liquid stablecoins that may be eligible for conservative yield review.",
  dca: "Your crypto allocation is below target; future contributions may build exposure gradually.",
  position_optimization: "Some existing positions may need review.",
  on_track: "Your Safety Buffer is funded and your allocation is close to your target.",
};

/* ------------------------------------------------------------------ *
 * Limitations + safety notes (approved copy — non-advisory, non-promissory).
 * ------------------------------------------------------------------ */
const LIMITATION_TEXT = {
  cost_not_evaluated: "WealthSmith has not evaluated route cost yet.",
  liquidity_not_evaluated: "WealthSmith has not evaluated liquidity depth yet.",
  slippage_not_evaluated: "WealthSmith has not evaluated slippage yet.",
  protocol_not_selected: "WealthSmith has not selected a protocol yet.",
  // Deliberately avoids the word "automatic" (a forbidden promotional term)
  // while stating the same read-only guarantee.
  review_only: "This is a review suggestion only, not a transaction.",
} as const;

const ACTIONABLE_SAFETY_NOTES: readonly ReviewSafetyNote[] = [
  { kind: "review_only", text: "Review-only" },
  { kind: "no_transaction", text: "No transaction" },
  { kind: "no_signature", text: "No signature" },
  { kind: "no_auto_move", text: "WealthSmith will not move funds for you." },
];

const INFORMATIONAL_SAFETY_NOTES: readonly ReviewSafetyNote[] = [
  { kind: "informational", text: "Informational only" },
  { kind: "no_action", text: "No action required" },
];

/* ------------------------------------------------------------------ *
 * Thin constructors (keep rules terse and consistent).
 * ------------------------------------------------------------------ */
export function metric(
  label: string,
  value: string | number,
  kind: ReviewMetricKind,
  unit?: string
): ReviewMetric {
  return { label, value, kind, ...(unit ? { unit } : {}) };
}

export function usdMetric(label: string, value: number): ReviewMetric {
  return { label, value, kind: "amount_usd", unit: "USD" };
}

export function pctMetric(label: string, value: number): ReviewMetric {
  return { label, value, kind: "allocation_pct", unit: "%" };
}

/**
 * Group the final guardrails + protocol-selection model into user-facing
 * labels. passed/failed/warning → Checked; not_evaluated → Not evaluated yet;
 * not_applicable → Not applicable. Protocol selection is derived from the model
 * (rules no longer carry a protocol_selection guardrail). Raw codes never leak.
 */
/** Execution guardrails shown in the dedicated route section instead (Step 13I). */
const EXECUTION_GUARDRAIL_CODES: ReadonlySet<GuardrailCode> = new Set([
  "cost_available",
  "liquidity_available",
  "slippage_available",
]);

export function summarizeGuardrails(
  guardrails: SuggestionGuardrail[],
  protocolSelection: ProtocolSelection | undefined,
  excludeExecutionGuardrails = false
): ReviewGuardrailSummary {
  const checked: string[] = [];
  const notEvaluated: string[] = [];
  const notApplicable: string[] = [];

  const all: SuggestionGuardrail[] = [
    ...guardrails.filter(
      (g) => g.code !== "protocol_selection" && !(excludeExecutionGuardrails && EXECUTION_GUARDRAIL_CODES.has(g.code))
    ),
    { code: "protocol_selection", status: protocolGuardrailStatus(protocolSelection) },
  ];

  for (const g of all) {
    const label = GUARDRAIL_LABELS[g.code];
    const bucket =
      g.status === "not_evaluated"
        ? notEvaluated
        : g.status === "not_applicable"
          ? notApplicable
          : checked; // passed / failed / warning were all evaluated
    if (!bucket.includes(label)) bucket.push(label);
  }

  return { checked, notEvaluated, notApplicable };
}

/**
 * Standard limitations for an actionable/disabled suggestion: one line per
 * not-evaluated execution guardrail, a protocol-not-selected line when the
 * model is not_evaluated, and the review-only reminder. Informational
 * suggestions (On Track) get none — never over-warn.
 */
function standardLimitations(
  guardrails: SuggestionGuardrail[],
  protocolSelection: ProtocolSelection | undefined,
  excludeExecutionGuardrails = false
): ReviewLimitation[] {
  const out: ReviewLimitation[] = [];
  const notEvaluated = (code: GuardrailCode) =>
    guardrails.some((g) => g.code === code && g.status === "not_evaluated");

  // When a route evaluation is shown (Step 13I), the execution guardrails move to
  // the dedicated "Route and execution checks" section — no not-evaluated lines here.
  if (!excludeExecutionGuardrails) {
    if (notEvaluated("cost_available"))
      out.push({ kind: "cost_not_evaluated", text: LIMITATION_TEXT.cost_not_evaluated });
    if (notEvaluated("liquidity_available"))
      out.push({ kind: "liquidity_not_evaluated", text: LIMITATION_TEXT.liquidity_not_evaluated });
    if (notEvaluated("slippage_available"))
      out.push({ kind: "slippage_not_evaluated", text: LIMITATION_TEXT.slippage_not_evaluated });
  }
  if (protocolSelection?.status === "not_evaluated")
    out.push({ kind: "protocol_not_selected", text: LIMITATION_TEXT.protocol_not_selected });

  out.push({ kind: "review_only", text: LIMITATION_TEXT.review_only });
  return out;
}

/**
 * Assemble a complete SuggestionReviewDetails. Rules pass domain content + their
 * guardrails + protocolSelection + actionKind; the guardrail summary,
 * limitations, and safety notes are derived here so every category is
 * consistent and honest.
 */
export function buildReviewDetails(args: {
  category: SuggestionCategory;
  actionKind: SuggestionActionKind;
  guardrails: SuggestionGuardrail[];
  protocolSelection?: ProtocolSelection;
  reason?: string;
  metrics: ReviewMetric[];
  involvedAssets?: ReviewAsset[];
  involvedPositions?: ReviewPosition[];
  calculations?: ReviewCalculation[];
  /** Optional shared protocol display (Demo now; real-wallet read-only beta, 13G). */
  protocolSelectionDisplay?: SuggestionReviewDetails["protocolSelectionDisplay"];
  /** Optional safety-note override (read-only recommendation copy). */
  safetyNotesOverride?: SuggestionReviewDetails["safetyNotes"];
  /**
   * Optional read-only route/liquidity/slippage evaluation (Step 13I). When
   * present, the execution guardrails move out of the generic summary/limitations
   * into a dedicated "Route and execution checks" section.
   */
  routeEvaluationDisplay?: SuggestionReviewDetails["routeEvaluation"];
  /** Optional read-only external handoff link (Step 13J), e.g. "Open Jito staking page". */
  externalLink?: SuggestionReviewDetails["externalLink"];
}): SuggestionReviewDetails {
  const informational = args.actionKind === "informational";
  const excludeExec = args.routeEvaluationDisplay != null;
  return {
    summary: {
      title: TITLE_BY_CATEGORY[args.category],
      reason: args.reason ?? DEFAULT_REASON[args.category],
      categoryLabel: CATEGORY_LABELS[args.category],
    },
    metrics: args.metrics,
    involvedAssets: args.involvedAssets ?? [],
    involvedPositions: args.involvedPositions ?? [],
    calculations: args.calculations ?? [],
    guardrailSummary: summarizeGuardrails(args.guardrails, args.protocolSelection, excludeExec),
    limitations: informational
      ? []
      : standardLimitations(args.guardrails, args.protocolSelection, excludeExec),
    safetyNotes: args.safetyNotesOverride
      ? [...args.safetyNotesOverride]
      : informational
        ? [...INFORMATIONAL_SAFETY_NOTES]
        : [...ACTIONABLE_SAFETY_NOTES],
    ...(args.protocolSelectionDisplay ? { protocolSelectionDisplay: args.protocolSelectionDisplay } : {}),
    ...(args.routeEvaluationDisplay ? { routeEvaluation: args.routeEvaluationDisplay } : {}),
    ...(args.externalLink ? { externalLink: args.externalLink } : {}),
  };
}

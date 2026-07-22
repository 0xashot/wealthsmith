/**
 * onTrackSuggestion — the canonical production On Track card mapper (Step 21E; multi-card in Step 21H).
 *
 * `buildOnTrackCardsFromAssessment` is the ONE authoritative On Track builder. It renders the informational
 * On Track cards from the canonical `OnTrackAssessment` (onTrackAssessment.ts), which reuses the canonical
 * Safety Buffer + Rebalance + completeness results and the ACTUAL post-Stage-A candidate context. The cards make
 * only SCOPED, honest statements — the Safety Buffer is verified complete and the canonical crypto allocation is
 * inside the current ±10pp review range — plus review PROMPTS that invite the user to re-check inputs WealthSmith
 * cannot itself verify (goal, horizon, monthly expenses). They never imply overall plan/portfolio health,
 * goal/contribution PROGRESS, "no changes needed", or that any unevaluated dimension is healthy.
 *
 * The cards share the SAME strict eligibility gate as before (nothing renders unless the narrow scope is verified).
 * Each is informational: no CTA, no amount, no modal, never a Top Pick. Cards fail closed individually — a card is
 * omitted when its real input value is unknown, never rendered with a placeholder or an invented figure.
 */
import type { EngineSuggestion, SuggestionGuardrail } from "./engineTypes";
import { SUGGESTION_ENGINE_VERSION } from "./engineThresholds";
import { notApplicableProtocolSelection } from "./protocolSelection";
import type { OnTrackAssessment } from "./onTrackAssessment";
import { FINANCIAL_GOAL_OPTIONS } from "../state/goalState";
import {
  SUGGESTION_ON_TRACK_GOAL_TITLE, SUGGESTION_ON_TRACK_GOAL_DESCRIPTION,
  SUGGESTION_ON_TRACK_EXPENSE_TITLE, SUGGESTION_ON_TRACK_EXPENSE_DESCRIPTION,
  SUGGESTION_ON_TRACK_BUFFER_TITLE, SUGGESTION_ON_TRACK_BUFFER_DESCRIPTION, SUGGESTION_ON_TRACK_BUFFER_CHIP,
} from "../state/approvedCopy";

/** Stable suggestion IDs (IDs must not change across runs/copy updates). */
export const ON_TRACK_SUGGESTION_ID = "on_track";
export const ON_TRACK_GOAL_CARD_ID = "on_track_goal_check";
export const ON_TRACK_EXPENSE_CARD_ID = "on_track_expense_benchmark";
export const ON_TRACK_BUFFER_CARD_ID = "on_track_safety_buffer";

/** Real saved-plan inputs the On Track cards interpolate. Slugs (never labels); nulls when unknown. */
export interface OnTrackGoalContext {
  financialGoal: string | null;
  timeline: string | null;
  monthlyExpensesUsd: number | null;
}

/** Natural "X-year"/"X-month" horizon phrase per approved timeline slug. `not_sure_yet` is intentionally absent. */
const HORIZON_PHRASE: Record<string, string> = {
  "6_months": "6-month",
  "1_year": "1-year",
  "2_years": "2-year",
  "5_years": "5-year",
  "10_plus_years": "10+ year",
};

const labelFor = (options: ReadonlyArray<{ value: string; label: string }>, slug: string | null): string | null =>
  slug == null ? null : options.find((o) => o.value === slug)?.label ?? null;

/** Whole-dollar USD, e.g. "$3,000". No fake precision. */
const usd0 = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;

/** True only under the fully-verified narrow scope (same gate the single card used). Any block/unresolved ⇒ false. */
function isEligible(a: OnTrackAssessment): boolean {
  return (
    a.presentationState === "eligible_scoped_status" &&
    a.displayMode === "scoped_informational" &&
    a.fallbackEligibilityGate === "allowed" && a.overallReadiness === "allowed" &&
    a.claimConfidence === "verified_narrow_scope" && a.claimScope === "safety_buffer_and_allocation" &&
    a.visibleActionableCandidateCount === 0 &&
    !a.materialRebalanceNeed && !a.hasProvenHiddenMaterialSignal
  );
}

/** Informational — proposes no action, so market-execution guardrails never fake a "passed". */
function onTrackGuardrails(): SuggestionGuardrail[] {
  return [
    { code: "pricing_available", status: "passed" },
    { code: "buffer_protection", status: "passed" },
    { code: "coverage_confidence", status: "passed" },
    { code: "allocation_delta", status: "passed" },
    { code: "cost_available", status: "not_applicable" },
    { code: "liquidity_available", status: "not_applicable" },
    { code: "slippage_available", status: "not_applicable" },
  ];
}

function onTrackCard(
  id: string, cardType: string, title: string, description: string, a: OnTrackAssessment, generatedAt: number,
  statusChip?: string,
): EngineSuggestion {
  return {
    id,
    category: "on_track",
    // `portfolio_aligned` kept for analytics compatibility; the scoped code states only the proven claim.
    reason_codes: ["portfolio_aligned", "buffer_and_allocation_within_range"],
    title_key: "suggestion.on_track.title",
    description_key: "suggestion.on_track.description",
    titleOverride: title,
    descriptionOverride: description,
    cardTypeOverride: cardType,
    ...(statusChip ? { statusChip } : {}),
    action_kind: "informational",
    is_actionable: false,
    is_top_pick: false, // set only by selectTopPick; On Track is never eligible
    delta_percent: a.cryptoDeltaPct ?? undefined,
    post_buffer_months: a.bufferTargetMonths ?? undefined,
    protocolSelection: notApplicableProtocolSelection("selection_not_required"),
    // No reviewDetails — On Track has no Review control and opens no modal (no dead/unreachable calculations).
    scores: { impact: 0, urgency: 0, efficiency: null },
    guardrails: onTrackGuardrails(),
    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };
}

/**
 * Build the canonical `on_track` informational cards from an OnTrackAssessment + real saved-plan context, or `[]`
 * unless the narrow verified scope is eligible. NEVER re-checks financial formulas — it trusts the canonical gates.
 * Emits up to three cards (Goal Check, Expense Benchmark, Safety Buffer); each is omitted when its input is unknown.
 */
export function buildOnTrackCardsFromAssessment(
  a: OnTrackAssessment, goal: OnTrackGoalContext, generatedAt: number,
): EngineSuggestion[] {
  if (!isEligible(a)) return [];

  const cards: EngineSuggestion[] = [];

  // Card 1 — Goal Check (review prompt). Needs a concrete goal AND a concrete horizon; skip on "Not Sure Yet"/unknown.
  const goalLabel = goal.financialGoal === "not_sure_yet" ? null : labelFor(FINANCIAL_GOAL_OPTIONS, goal.financialGoal);
  const horizonPhrase = goal.timeline ? HORIZON_PHRASE[goal.timeline] ?? null : null;
  if (goalLabel && horizonPhrase) {
    cards.push(onTrackCard(
      ON_TRACK_GOAL_CARD_ID, "on_track_goal_check",
      SUGGESTION_ON_TRACK_GOAL_TITLE.replace("{goal}", goalLabel),
      SUGGESTION_ON_TRACK_GOAL_DESCRIPTION.replace("{horizon}", horizonPhrase),
      a, generatedAt,
    ));
  }

  // Card 2 — Expense Benchmark (review prompt). Needs a real monthly-expense figure.
  if (typeof goal.monthlyExpensesUsd === "number" && Number.isFinite(goal.monthlyExpensesUsd) && goal.monthlyExpensesUsd > 0) {
    cards.push(onTrackCard(
      ON_TRACK_EXPENSE_CARD_ID, "on_track_expense_benchmark",
      SUGGESTION_ON_TRACK_EXPENSE_TITLE,
      SUGGESTION_ON_TRACK_EXPENSE_DESCRIPTION.replace("{expenses}", usd0(goal.monthlyExpensesUsd)),
      a, generatedAt,
    ));
  }

  // Card 3 — Safety Buffer 100% Funded (verified-scope statement). Needs the verified target months.
  if (typeof a.bufferTargetMonths === "number" && Number.isFinite(a.bufferTargetMonths)) {
    cards.push(onTrackCard(
      ON_TRACK_BUFFER_CARD_ID, "on_track_safety_buffer",
      SUGGESTION_ON_TRACK_BUFFER_TITLE,
      SUGGESTION_ON_TRACK_BUFFER_DESCRIPTION.replace("{months}", String(a.bufferTargetMonths)),
      a, generatedAt, SUGGESTION_ON_TRACK_BUFFER_CHIP,
    ));
  }

  return cards;
}

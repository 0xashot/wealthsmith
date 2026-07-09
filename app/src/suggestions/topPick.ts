/**
 * topPick — deterministic Top Pick selection over the completed MVP candidate
 * set (rules/top-pick-rules.md; checklists/suggestion-top-pick-checklist.md).
 *
 * Top Pick is a product decision, never made by the UI or AI. This selector is
 * pure and deterministic: same input suggestions → same winner. It does not
 * mutate its input — it returns NEW suggestion objects with `is_top_pick`
 * recomputed (exactly one true when an eligible actionable suggestion exists,
 * all false otherwise).
 *
 * Eligibility (a Top Pick candidate must be a real actionable suggestion):
 *   - is_actionable === true
 *   - action_kind === "review_only"     (disabled suggestions excluded)
 *   - category !== "on_track"           (informational, never Top Pick)
 *
 * Ranking (safety-first): category priority (Buffer > Rebalance), then within a
 * category impact ↓, urgency ↓, efficiency ↓ (null treated as 0), then stable
 * id ↑ as the final deterministic tie-break.
 */
import type { EngineSuggestion, SuggestionCategory } from "./engineTypes";

/**
 * Full engine-side category priority (lower = higher priority). This is the
 * single source of ordering for both Top Pick selection and the intended engine
 * display order. Safety Buffer is the highest-priority override; On Track is
 * last and is never a Top Pick candidate.
 *
 * The categories past `rebalance` are CONTRACTED (Step 9A) — no rule emits them
 * yet. The UI must NOT import this map to sort; it renders engine order.
 */
export const CATEGORY_PRIORITY: Record<SuggestionCategory, number> = {
  buffer: 1,
  rebalance: 2,
  capital_efficiency: 3,
  staking: 4,
  stable_yield: 5,
  position_optimization: 6,
  on_track: 99,
};

function isEligible(s: EngineSuggestion): boolean {
  return (
    s.is_actionable === true &&
    s.action_kind === "review_only" &&
    s.category !== "on_track"
  );
}

/** Efficiency with null/undefined treated as 0 for ranking. */
function eff(s: EngineSuggestion): number {
  return typeof s.scores.efficiency === "number" ? s.scores.efficiency : 0;
}

/** Deterministic ordering: category, then impact, urgency, efficiency, id. */
function compareCandidates(a: EngineSuggestion, b: EngineSuggestion): number {
  const cat = CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category];
  if (cat !== 0) return cat;
  if (b.scores.impact !== a.scores.impact) return b.scores.impact - a.scores.impact;
  if (b.scores.urgency !== a.scores.urgency) return b.scores.urgency - a.scores.urgency;
  const e = eff(b) - eff(a);
  if (e !== 0) return e;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Return a new suggestion list with `is_top_pick` recomputed: exactly one
 * eligible winner set true, everything else false. Input objects are not
 * mutated. When no eligible actionable suggestion exists, all flags are false.
 */
export function selectTopPick(suggestions: EngineSuggestion[]): EngineSuggestion[] {
  // Reset every flag on fresh copies (no input mutation).
  const reset = suggestions.map((s) => ({ ...s, is_top_pick: false }));

  const eligible = reset.filter(isEligible);
  if (eligible.length === 0) return reset;

  const winner = [...eligible].sort(compareCandidates)[0];
  return reset.map((s) => (s.id === winner.id ? { ...s, is_top_pick: true } : s));
}

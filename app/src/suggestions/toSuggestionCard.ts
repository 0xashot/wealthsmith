/**
 * toSuggestionCard — deterministic mapper from engine output (EngineSuggestion)
 * to the existing UI card shape (SuggestionCardState). Step 7A: mapping only —
 * it does NOT wire the Dashboard, render anything, generate suggestions, rank,
 * select Top Pick, or sort.
 *
 * The engine is the source of truth. This mapper:
 *   - reads title/description from the APPROVED copy map (SUGGESTION_COPY) by
 *     key — never generates financial copy (missing key → safe fallback);
 *   - preserves the engine's `is_top_pick` exactly (never recalculated);
 *   - preserves INPUT ORDER (a plain map, no sort) — the engine owns display
 *     order (Safety Buffer → Rebalance → On Track for MVP);
 *   - never marks a CTA as executing a transaction or requesting a signature.
 *
 * It may import the UI card TYPE (allowed) but no UI components, and it never
 * imports demo fixtures — demo suggestions stay separate.
 */
import type { SuggestionCardState } from "../types/dashboard";
import type { EngineSuggestion, SuggestionCategory } from "./engineTypes";
import { SUGGESTION_COPY, SUGGESTIONS_PARTIAL_PRICING } from "../state/approvedCopy";
import type { SuggestionReasonCode } from "./engineTypes";

/** Whole-dollar USD (no cents), e.g. "$2,200". */
const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** Safe fallback when an approved copy key is missing (never invent copy). */
const COPY_FALLBACK = "Suggestion unavailable";
/** User-friendly disabled reason for a below-minimum suggestion. */
const BELOW_MIN_REASON = "Below minimum suggestion size.";

/** Approved copy by key; missing key → fallback + a dev-only warning. */
function copy(key: string): string {
  const value = SUGGESTION_COPY[key];
  if (value == null) {
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`[suggestions] Missing approved copy key "${key}"; using fallback.`);
    }
    return COPY_FALLBACK;
  }
  return value;
}

/**
 * Engine category → the card's `category` string (drives the generic icon).
 * The trailing four are CONTRACTED (Step 9A) so the mapper stays total if a
 * future rule emits them; no rule does yet.
 */
const CARD_CATEGORY: Record<SuggestionCategory, string> = {
  buffer: "safety_buffer",
  rebalance: "allocation",
  capital_efficiency: "capital_efficiency",
  staking: "staked_assets",
  stable_yield: "yield_opportunity",
  position_optimization: "portfolio_health",
  on_track: "portfolio_health",
};

/** Engine category → the card's `type` string (stable engine type IDs). */
const CARD_TYPE: Record<SuggestionCategory, string> = {
  buffer: "fund_safety_buffer",
  rebalance: "rebalance_to_plan",
  capital_efficiency: "review_idle_assets",
  staking: "stake_idle_sol",
  stable_yield: "deploy_idle_stablecoins",
  position_optimization: "review_yield_strategy",
  on_track: "on_track",
};

/**
 * Map one EngineSuggestion to a SuggestionCardState. Pure and total: every
 * branch produces a valid card. CTA is ALWAYS non-transactional
 * (executes_transaction/requires_wallet_signature/completion_on_click = false).
 */
export function toSuggestionCard(s: EngineSuggestion): SuggestionCardState {
  const disabled = s.action_kind === "disabled";
  const informational = s.action_kind === "informational";

  const actionability = disabled
    ? "disabled"
    : informational
      ? "informational"
      : "actionable";

  const status = disabled ? "disabled" : informational ? "ready" : "active";

  // Severity: buffer high / rebalance medium / on_track info; disabled → low.
  const severity = disabled
    ? "low"
    : s.category === "buffer"
      ? "high"
      : s.category === "rebalance"
        ? "medium"
        : "info";

  // Impact text = the sourced amount, labeled ("Buffer shortfall: $2,200").
  // No amount (On Track) → empty. Never invented.
  const impact_text = s.amount ? `${s.amount.label ?? "Amount"}: ${usd0(s.amount.valueUsd)}` : "";

  // CTA label: review-only and disabled use "Review" (the disabled card renders
  // it as a disabled button); informational (On Track) has no CTA. Never
  // executes or signs — the safety booleans are always false.
  const cta: SuggestionCardState["cta"] = {
    label: informational ? "" : "Review",
    action: null,
    executes_transaction: false,
    requires_wallet_signature: false,
    completion_on_click: false,
  };

  return {
    id: s.id,
    title: copy(s.title_key),
    type: CARD_TYPE[s.category],
    category: CARD_CATEGORY[s.category],
    // Only the Top Pick badge for MVP; other badges are not invented.
    badge: s.is_top_pick ? "Top Pick" : "",
    is_top_pick: s.is_top_pick, // preserved from engine, never recalculated
    status,
    actionability,
    severity,
    description: copy(s.description_key),
    impact_text,
    disabled_reason_text: disabled ? BELOW_MIN_REASON : undefined,
    cta,
  };
}

/**
 * Map a full engine list to cards, PRESERVING ORDER (a plain map — no sort, no
 * Top Pick reordering). The engine's array order is the display order.
 */
export function toSuggestionCards(suggestions: EngineSuggestion[]): SuggestionCardState[] {
  return suggestions.map(toSuggestionCard);
}

/**
 * Map engine warnings to an optional rail-level notice string. Step 7A defines
 * the mapping only; the rail (Step 7B) decides whether/where to show it.
 */
export function warningsToNotice(warnings: SuggestionReasonCode[]): string | undefined {
  return warnings.includes("partial_pricing") ? SUGGESTIONS_PARTIAL_PRICING : undefined;
}

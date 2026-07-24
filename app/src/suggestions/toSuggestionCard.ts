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
import { SUGGESTION_COPY, SUGGESTIONS_PARTIAL_PRICING, SUGGESTION_STAKING_SELECTED_TITLE, SUGGESTION_STAKING_SELECTED_DESCRIPTION } from "../state/approvedCopy";
import type { SuggestionReasonCode } from "./engineTypes";
import type { ContributionPlanSuggestion } from "./contributionIntegrationTypes";
import { buildContributionPlanCardPresentation } from "./contributionPlanPresentation";
import { buildStableYieldPlanPresentation } from "./yieldStrategyPlanPresentation";

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
 * Total over every emitted category.
 */
const CARD_CATEGORY: Record<SuggestionCategory, string> = {
  buffer: "safety_buffer",
  rebalance: "allocation",
  capital_efficiency: "capital_efficiency",
  trim: "portfolio_health",
  staking: "staked_assets",
  stable_yield: "yield_opportunity",
  dca: "contribution_plan",
  position_optimization: "portfolio_health",
  on_track: "portfolio_health",
};

/** Engine category → the card's `type` string (stable engine type IDs). */
const CARD_TYPE: Record<SuggestionCategory, string> = {
  buffer: "fund_safety_buffer",
  rebalance: "rebalance_to_plan",
  capital_efficiency: "review_idle_assets",
  trim: "trim_long_tail",
  staking: "stake_idle_sol",
  stable_yield: "deploy_idle_stablecoins",
  dca: "dca_buy",
  position_optimization: "review_yield_strategy",
  on_track: "on_track",
};

/**
 * Map one EngineSuggestion to a SuggestionCardState. Pure and total: every
 * branch produces a valid card. CTA is ALWAYS non-transactional
 * (executes_transaction/requires_wallet_signature/completion_on_click = false).
 */
/** True for a Step 15H plan-backed contribution suggestion (carries the structured payload). */
function isContributionPlanSuggestion(s: EngineSuggestion): s is ContributionPlanSuggestion {
  return "contributionPlan" in s && (s as ContributionPlanSuggestion).contributionPlan != null;
}

export function toSuggestionCard(s: EngineSuggestion): SuggestionCardState {
  const disabled = s.action_kind === "disabled";
  const informational = s.action_kind === "informational";

  // Step 15H — plan-backed contribution suggestions render deterministic engine copy from the
  // presentation layer (title/description/impact/tag/accessible CTA). React never rebuilds these.
  if (isContributionPlanSuggestion(s)) {
    const p = buildContributionPlanCardPresentation(s.contributionPlan);
    return {
      id: s.id,
      title: p.title,
      type: CARD_TYPE[s.category],
      category: CARD_CATEGORY[s.category],
      badge: s.is_top_pick ? "Top Pick" : "",
      is_top_pick: s.is_top_pick,
      status: "active",
      actionability: "actionable",
      severity: s.category === "buffer" ? "high" : "info",
      description: p.description,
      impact_text: p.impactText ?? "",
      tag: p.tag,
      accessibleCtaLabel: p.accessibilityLabel,
      cta: { label: p.ctaLabel, action: null, executes_transaction: false, requires_wallet_signature: false, completion_on_click: false },
    };
  }

  // Step 16H-C — plan-backed Stable Yield suggestions render the deterministic Step 16H-B card
  // presentation (title/description/tag/amount/APY/accessible CTA). React never rebuilds these; a
  // corrupted presentation fails closed and falls through to the generic (never-invented) mapping.
  if (s.category === "stable_yield" && s.stableYieldPlan) {
    const c = buildStableYieldPlanPresentation(s).card;
    if (c) {
      return {
        id: s.id,
        title: c.title,
        type: CARD_TYPE[s.category],
        category: CARD_CATEGORY[s.category],
        badge: s.is_top_pick ? "Top Pick" : "",
        is_top_pick: s.is_top_pick,
        status: "active",
        actionability: "actionable",
        severity: "info",
        description: c.description,
        impact_text: `Amount to review: ${c.amountDisplay}`,
        tag: c.tag,
        // Selected protocol drives the card icon (resolveCardIcon → protocol logo, e.g. Kamino).
        protocolName: c.protocolName,
        accessibleCtaLabel: c.accessibilityLabel,
        cta: { label: c.cta.label, action: null, executes_transaction: false, requires_wallet_signature: false, completion_on_click: false },
        apy: { status: c.apy.state, display: c.apy.display },
        ...(c.apyIncomeChip ? { apyIncomeChip: c.apyIncomeChip } : {}),
      };
    }
  }

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
  const impact_text = s.impactTextOverride ?? (s.amount ? `${s.amount.label ?? "Amount"}: ${usd0(s.amount.valueUsd)}` : "");

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

  // Selected protocol (JitoSOL READ-ONLY beta, Step 13G): surface the approved
  // "Suggested protocol to review" fields from the engine's selection + shared
  // display. Mode is "production" (never a DEMO/INTERNAL label) and no marketData
  // leaks onto the card — the card shows the label/name only; the modal shows the
  // sourced market data. Still non-transactional (the CTA booleans stay false).
  const sel = s.protocolSelection;
  const selDisplay = s.reviewDetails?.protocolSelectionDisplay;
  const selectedProtocolFields: Partial<SuggestionCardState> =
    sel?.status === "selected"
      ? {
          suggestedProtocolLabel: selDisplay?.label ?? "Suggested protocol to review",
          protocolName: sel.selectedProtocolName,
          lstSymbol: sel.selectedLstSymbol,
          ...(selDisplay?.sourceStatusLabel ? { protocolStatusLabel: selDisplay.sourceStatusLabel } : {}),
          ...(selDisplay
            ? {
                protocolSelectionDisplay: {
                  label: selDisplay.label,
                  protocolName: selDisplay.protocolName,
                  assetSymbol: selDisplay.assetSymbol,
                  mode: selDisplay.mode,
                },
              }
            : {}),
        }
      : {};

  // Staking names the selected protocol in its title/description (e.g. "Stake SOL on Jito"); the generic
  // copy remains the fallback when no protocol is selected. Nothing else is invented.
  const stakingProtocol = s.category === "staking" && sel?.status === "selected" ? sel.selectedProtocolName : undefined;
  // Engine-resolved overrides (On Track multi-card) win over the copy-key mapping when present. They carry
  // fully-resolved, deterministic copy from real inputs — never freeform text.
  const title = s.titleOverride ?? (stakingProtocol ? SUGGESTION_STAKING_SELECTED_TITLE.replace("{protocol}", stakingProtocol) : copy(s.title_key));
  const description = s.descriptionOverride ?? (stakingProtocol ? SUGGESTION_STAKING_SELECTED_DESCRIPTION.replace("{protocol}", stakingProtocol) : copy(s.description_key));

  return {
    id: s.id,
    title,
    type: s.cardTypeOverride ?? CARD_TYPE[s.category],
    category: CARD_CATEGORY[s.category],
    // Only the Top Pick badge for MVP; other badges are not invented.
    badge: s.is_top_pick ? "Top Pick" : "",
    is_top_pick: s.is_top_pick, // preserved from engine, never recalculated
    status,
    actionability,
    severity,
    description,
    impact_text,
    disabled_reason_text: disabled ? BELOW_MIN_REASON : undefined,
    cta,
    ...(s.statusChip ? { statusChip: s.statusChip } : {}),
    ...selectedProtocolFields,
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

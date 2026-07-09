/**
 * RealWalletSuggestionsRail — the shared right-rail renderer for real-wallet
 * Suggestion Engine output, used by BOTH the Dashboard and the Portfolio so the
 * two pages render identically. It renders the RailSuggestions payload lifted
 * from useRailSuggestions:
 *   - loading    → neutral "Preparing…" state
 *   - available  → SuggestionRail with the engine cards, IN ENGINE ORDER (no
 *                  re-sort, no Top Pick reselection) + optional partial-pricing
 *                  notice
 *   - otherwise  → polished unavailable state (never demo cards)
 *
 * "Review" is read-only: it scrolls to the related on-page section when one
 * exists (the Dashboard's Safety Buffer card); it never executes, signs, or
 * completes anything.
 */
import SuggestionRail from "./SuggestionRail";
import EmptyStateCard from "./EmptyStateCard";
import type { RailSuggestions } from "../suggestions/useRailSuggestions";
import type { RightRailState, SuggestionCardState } from "../types/dashboard";
import {
  REAL_WALLET_SUGGESTIONS_TITLE,
  SUGGESTIONS_RAIL_DESC,
  SUGGESTIONS_LOADING,
  SUGGESTIONS_UNAVAILABLE,
} from "../state/approvedCopy";

interface Props {
  rail: RailSuggestions | null;
  railLabel: string;
}

/** Read-only "Review": scroll to the related section if it's on this page. */
function onReviewSuggestion(card: SuggestionCardState) {
  if (card.category === "safety_buffer") {
    const el = document.getElementById("safety-buffer");
    el?.scrollIntoView({ block: "nearest" });
    el?.focus?.();
  }
}

export default function RealWalletSuggestionsRail({ rail, railLabel }: Props) {
  if (rail?.loading) {
    return (
      <aside className="suggestion-rail" aria-label={railLabel}>
        <EmptyStateCard title={REAL_WALLET_SUGGESTIONS_TITLE} description={SUGGESTIONS_LOADING} />
      </aside>
    );
  }

  if (rail && rail.available) {
    const railState: RightRailState = {
      title: REAL_WALLET_SUGGESTIONS_TITLE,
      description: SUGGESTIONS_RAIL_DESC,
      state: { status: "active" },
      summary: {
        suggestions_count: rail.cards.length,
        top_pick_id: rail.cards.find((c) => c.is_top_pick)?.id ?? "",
      },
      cards: rail.cards,
    };
    return (
      <SuggestionRail
        rail={railState}
        railLabel={railLabel}
        notice={rail.notice}
        onReview={onReviewSuggestion}
      />
    );
  }

  return (
    <aside className="suggestion-rail" aria-label={railLabel}>
      <EmptyStateCard
        title={REAL_WALLET_SUGGESTIONS_TITLE}
        description={SUGGESTIONS_UNAVAILABLE}
      />
    </aside>
  );
}

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
import { useState } from "react";
import SuggestionRail from "./SuggestionRail";
import EmptyStateCard from "./EmptyStateCard";
import SuggestionReviewModal from "./SuggestionReviewModal";
import { useSolStakingSelectorPresentation } from "../hooks/useSolStakingSelectorPresentation";
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

export default function RealWalletSuggestionsRail({ rail, railLabel }: Props) {
  // Which suggestion's Review modal is open (by stable engine id). Read-only —
  // opening the modal never transacts, signs, or hands off to a protocol.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Step 14Z — the CURRENT SOL staking comparison presentation, fetched once at this shared
  // level from the same-origin runtime artifact (no external provider calls). Demo and Real
  // Wallet consume the SAME presentation object. It never changes selectedProtocolId.
  const { presentation: stakingPresentation } = useSolStakingSelectorPresentation();

  // Read-only "Review": open the details modal when the engine produced details
  // for this suggestion (all Step 10A suggestions do).
  const onReviewSuggestion = (card: SuggestionCardState) => {
    // Step 15H / 16H-D — open for engine-detail, plan-backed contribution, OR Stable Yield suggestions.
    if (rail?.reviewDetailsById[card.id] || rail?.contributionReviewById[card.id] || rail?.stableYieldReviewById[card.id]) setSelectedId(card.id);
  };

  const selectedDetails = selectedId ? rail?.reviewDetailsById[selectedId] : undefined;
  const selectedContribReview = selectedId ? rail?.contributionReviewById[selectedId] : undefined;
  const selectedStableYieldReview = selectedId ? rail?.stableYieldReviewById[selectedId] : undefined;
  const selectedCard = selectedId ? rail?.cards.find((c) => c.id === selectedId) : undefined;
  // Inject the current comparison into the SOL staking suggestion's modal details (read-only).
  const isStakingSelected = selectedCard != null && (selectedCard.type === "stake_idle_sol" || selectedCard.type === "staking" || selectedCard.category === "staked_assets" || selectedCard.category === "staking");
  const detailsForModal = selectedDetails && isStakingSelected && stakingPresentation
    ? { ...selectedDetails, selectorPresentation: stakingPresentation }
    : selectedDetails;
  const reviewModal = selectedStableYieldReview ? (
    <SuggestionReviewModal
      stableYieldReview={selectedStableYieldReview}
      isTopPick={selectedCard?.is_top_pick === true}
      onClose={() => setSelectedId(null)}
    />
  ) : selectedContribReview ? (
    <SuggestionReviewModal
      contributionReview={selectedContribReview}
      isTopPick={selectedCard?.is_top_pick === true}
      onClose={() => setSelectedId(null)}
    />
  ) : detailsForModal ? (
    <SuggestionReviewModal
      details={detailsForModal}
      isTopPick={selectedCard?.is_top_pick === true}
      onClose={() => setSelectedId(null)}
    />
  ) : null;

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
      <>
        <SuggestionRail
          rail={railState}
          railLabel={railLabel}
          notice={rail.notice}
          onReview={onReviewSuggestion}
          stakingPresentation={stakingPresentation}
        />
        {reviewModal}
      </>
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

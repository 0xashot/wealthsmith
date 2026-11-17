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
import SmithInitialLoadingState from "./SmithInitialLoadingState";
import ButtonIcon from "./ButtonIcon";
import { useSolStakingSelectorPresentation } from "../hooks/useSolStakingSelectorPresentation";
import type { RailSuggestions } from "../suggestions/useRailSuggestions";
import type { RightRailState, SuggestionCardState } from "../types/dashboard";
import { railOnTrackUnavailableMessage } from "./portfolioCompletenessUi";
import { useDismissedSuggestions } from "../state/dismissedSuggestions";
import {
  REAL_WALLET_SUGGESTIONS_TITLE,
  SUGGESTIONS_RAIL_DESC,
  SUGGESTIONS_PREPARING,
  SUGGESTIONS_UNAVAILABLE,
} from "../state/approvedCopy";
import sparcleUrl from "../../../assets/icons/ui/sparcle.svg";

/** The loading animation plays once and reveals nothing itself — the parent
 *  swaps in the ready rail when `loading` flips — so onComplete is a no-op. */
const noop = () => {};

interface Props {
  rail: RailSuggestions | null;
  railLabel: string;
  /**
   * Page navigation, for the On Track cards whose CTA is a prompt rather than a review.
   * Optional because the /testing gallery mounts this rail with nowhere to navigate to.
   */
  onNavigate?: (id: string) => void;
}

/**
 * On Track card types whose "Review Goal" button opens the Goal page.
 *
 * Both are informational (`action_kind: "informational"`, `cta.action: null`) and the engine
 * produces no review details for them, so the modal branch in `onReviewSuggestion` can never
 * fire. Before this they rendered a button that did nothing at all. The expense benchmark
 * goes to the same page because monthly expenses are edited there.
 */
const GOAL_PAGE_CARD_TYPES = new Set(["on_track_goal_check", "on_track_expense_benchmark"]);

export default function RealWalletSuggestionsRail({ rail, railLabel, onNavigate}: Props) {
  // Which suggestion's Review modal is open (by stable engine id). Read-only —
  // opening the modal never transacts, signs, or hands off to a protocol.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Step 14Z — the CURRENT SOL staking comparison presentation, fetched once at this shared
  // level from the same-origin runtime artifact (no external provider calls). Demo and Real
  // Wallet consume the SAME presentation object. It never changes selectedProtocolId.
  const { presentation: stakingPresentation } = useSolStakingSelectorPresentation();
  const { dismiss } = useDismissedSuggestions();

  // Read-only "Review": open the details modal when the engine produced details
  // for this suggestion (all Step 10A suggestions do).
  const onReviewSuggestion = (card: SuggestionCardState) => {
    // On Track goal/expense cards carry a label-only "Review Goal" prompt and no review
    // details, so the modal branch below can never fire for them. Send them to the Goal page.
    if (GOAL_PAGE_CARD_TYPES.has(card.type)) {
      onNavigate?.("goal");
      return;
    }
    // Step 15H / 16H-D — open for engine-detail, plan-backed contribution, OR Stable Yield suggestions.
    if (rail?.reviewDetailsById[card.id] || rail?.contributionReviewById[card.id] || rail?.stableYieldReviewById[card.id]) setSelectedId(card.id);
  };

  const selectedDetails = selectedId ? rail?.reviewDetailsById[selectedId] : undefined;
  const selectedContribReview = selectedId ? rail?.contributionReviewById[selectedId] : undefined;
  const selectedStableYieldReview = selectedId ? rail?.stableYieldReviewById[selectedId] : undefined;
  const selectedCard = selectedId ? rail?.cards.find((c) => c.id === selectedId) : undefined;
  // Inject the current comparison into the SOL staking suggestion's modal details (read-only).
  const isStakingSelected = selectedCard != null && (selectedCard.type === "stake_idle_sol" || selectedCard.category === "staked_assets");
  const detailsForModal = selectedDetails && isStakingSelected && stakingPresentation
    ? { ...selectedDetails, selectorPresentation: stakingPresentation }
    : selectedDetails;
  // Acknowledge an OBSERVATION from its own modal. Only observation cards carry a
  // dismissal signature, so every other family renders no Dismiss control at all.
  const onDismissSelected = selectedCard?.dismissalSignature
    ? () => {
        dismiss(selectedCard.dismissalSignature as string);
        setSelectedId(null);
      }
    : undefined;

  const reviewModal = selectedStableYieldReview ? (
    <SuggestionReviewModal
      stableYieldReview={selectedStableYieldReview}
      onClose={() => setSelectedId(null)}
    />
  ) : selectedContribReview ? (
    <SuggestionReviewModal
      contributionReview={selectedContribReview}
      swapAction={selectedId ? rail?.swapActionById?.[selectedId] : undefined}
      swapQuoteIsDca={selectedCard?.type === "dca_buy"}
      swapQuoteFetcher={rail?.swapQuoteFetcher}
      onClose={() => setSelectedId(null)}
    />
  ) : detailsForModal ? (
    <SuggestionReviewModal
      details={detailsForModal}
      swapAction={selectedId ? rail?.swapActionById?.[selectedId] : undefined}
      swapQuoteIsDca={selectedCard?.type === "dca_buy"}
      swapQuoteFetcher={rail?.swapQuoteFetcher}
      onDismiss={onDismissSelected}
      onClose={() => setSelectedId(null)}
    />
  ) : null;

  if (rail?.loading) {
    // Same header as the ready/default state (icon + title + description); the
    // single card shows the animated Smith AI symbol + a "preparing" label,
    // mirroring the first-open "Smith AI getting ready" beat.
    return (
      <aside className="suggestion-rail" aria-label={railLabel}>
        <div className="suggestion-rail__header">
          <h2 className="suggestion-rail__title">
            <span className="suggestion-rail__title-icon">
              <ButtonIcon src={sparcleUrl} size={24} />
            </span>
            {REAL_WALLET_SUGGESTIONS_TITLE}
          </h2>
          <p className="suggestion-rail__description">{SUGGESTIONS_RAIL_DESC}</p>
        </div>
        <div className="suggestion-rail__cards">
          <div className="card suggestion-rail__preparing">
            <SmithInitialLoadingState onComplete={noop} label={SUGGESTIONS_PREPARING} />
          </div>
        </div>
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

  // Step 17H.4 — when nothing actionable renders AND the mounted completeness result blocks/leaves On Track
  // unresolved, explain that state rather than falling back to the generic unavailable copy. Uses the
  // already-mounted result (never recomputed). Shown ONLY when completeness is present and On Track is not
  // available for a COMPLETENESS reason — never merely because the rail is empty for another reason.
  const onTrackUnavailable = railOnTrackUnavailableMessage(rail?.portfolioCompleteness);
  return (
    <aside className="suggestion-rail" aria-label={railLabel}>
      <EmptyStateCard
        title={REAL_WALLET_SUGGESTIONS_TITLE}
        description={onTrackUnavailable ?? SUGGESTIONS_UNAVAILABLE}
      />
    </aside>
  );
}

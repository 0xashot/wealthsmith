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
import { useRef, useState } from "react";
import SuggestionRail from "./SuggestionRail";
import EmptyStateCard from "./EmptyStateCard";
import SuggestionReviewModal from "./SuggestionReviewModal";
import type { DemoExecutionOutcome } from "../suggestions/swapExecution/demoOutcomes";
import SmithInitialLoadingState from "./SmithInitialLoadingState";
import ButtonIcon from "./ButtonIcon";
import { useSolStakingSelectorPresentation } from "../hooks/useSolStakingSelectorPresentation";
import type { RailSuggestions } from "../suggestions/useRailSuggestions";
import type { SuggestionReviewDetails } from "../suggestions/engineTypes";
import type { SwapActionReadiness } from "../suggestions/swapQuote/swapQuoteContracts";
import type { SwapQuoteFetcher } from "../suggestions/swapQuote/swapQuoteClient";
import { prefetchSwapQuoteComparison } from "./swapQuote/useSwapQuoteComparison";
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
   * The swap quote in an open review gave up after refreshing its full allowance.
   *
   * The review closes itself and the page raises a toast. Optional: a host without a toast
   * simply keeps the expired card, which is what every other expiry shows anyway.
   */
  onSwapQuoteGaveUp?: () => void;
  /**
   * Opens the app's Connect Wallet dialog, for a swap review with no wallet to reconnect to.
   * The review closes itself first. Optional: without it that state keeps a greyed Swap.
   */
  onConnectWallet?: () => void;
  /** Demo Mode — forwarded to the review so the confirm step is reviewable without a wallet. */
  demo?: boolean;
  /** Demo Mode only — forwarded to the review. See SwapExecutionSection. */
  demoOutcome?: DemoExecutionOutcome | null;
}

/**
 * Everything an open review reads, captured at the moment Review was pressed.
 *
 * The rail re-derives whenever prices or balances refresh, and a swap's amount is computed from
 * a price — so reading the live rail meant the amount under an open review could change by a
 * lamport, which changes the request, which re-ran the route comparison and could name a
 * different route while someone was reading it. In the confirm step it restarted the plan.
 *
 * A review is a decision about one specific proposal. It is frozen when it opens; closing and
 * reopening is how to see a newer one. Nothing that protects the user depends on it being
 * live: the plan is quoted, verified and simulated against the chain when Swap is pressed.
 */
interface OpenedReview {
  id: string;
  card: SuggestionCardState;
  details?: SuggestionReviewDetails;
  contributionReview?: RailSuggestions["contributionReviewById"][string];
  stableYieldReview?: RailSuggestions["stableYieldReviewById"][string];
  swapAction?: SwapActionReadiness;
  swapQuoteFetcher?: SwapQuoteFetcher;
}

export default function RealWalletSuggestionsRail({ rail, railLabel, onSwapQuoteGaveUp, onConnectWallet, demo, demoOutcome }: Props) {
  // The open review, as a snapshot (see OpenedReview). Read-only — opening the modal never
  // transacts, signs, or hands off to a protocol.
  const [opened, setOpened] = useState<OpenedReview | null>(null);
  // The card whose Review button is busy fetching its route. One at a time.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const pendingRef = useRef<string | null>(null);
  const close = () => setOpened(null);

  // Step 14Z — the CURRENT SOL staking comparison presentation, fetched once at this shared
  // level from the same-origin runtime artifact (no external provider calls). Demo and Real
  // Wallet consume the SAME presentation object. It never changes selectedProtocolId.
  const { presentation: stakingPresentation } = useSolStakingSelectorPresentation();
  const { dismiss } = useDismissedSuggestions();

  // Read-only "Review": open the details modal when the engine produced details
  // for this suggestion (all Step 10A suggestions do).
  const onReviewSuggestion = (card: SuggestionCardState) => {
    if (!rail || pendingRef.current != null) return;
    // Step 15H / 16H-D — open for engine-detail, plan-backed contribution, OR Stable Yield suggestions.
    const details = rail.reviewDetailsById[card.id];
    const contributionReview = rail.contributionReviewById[card.id];
    const stableYieldReview = rail.stableYieldReviewById[card.id];
    if (!details && !contributionReview && !stableYieldReview) return;
    const snapshot: OpenedReview = {
      id: card.id,
      card,
      details,
      contributionReview,
      stableYieldReview,
      swapAction: rail.swapActionById?.[card.id],
      swapQuoteFetcher: rail.swapQuoteFetcher,
    };

    // THE REVIEW OPENS WITH ITS ROUTE ALREADY CHOSEN. A suggestion that carries a swap fetches
    // its route comparison first, with the card's Review button busy, and opens once that has
    // answered — so the first thing shown is the selected route and the Swap button, not a
    // loading state that turns into them. Anything without a swap opens at once, as before.
    const showsRoute = !stableYieldReview && snapshot.swapAction?.status === "ready" && !details?.hideSwapRoute;
    const legs = showsRoute && snapshot.swapAction?.status === "ready" ? snapshot.swapAction.legs : [];
    if (legs.length === 0) {
      setOpened(snapshot);
      return;
    }
    pendingRef.current = card.id;
    setPendingId(card.id);
    void prefetchSwapQuoteComparison(legs, { fetcher: snapshot.swapQuoteFetcher }).then(() => {
      if (pendingRef.current !== card.id) return;
      pendingRef.current = null;
      setPendingId(null);
      setOpened(snapshot);
    });
  };

  const selectedCard = opened?.card;
  // Inject the current comparison into the SOL staking suggestion's modal details (read-only).
  const isStakingSelected = selectedCard != null && (selectedCard.type === "stake_idle_sol" || selectedCard.category === "staked_assets");
  const detailsForModal = opened?.details && isStakingSelected && stakingPresentation
    ? { ...opened.details, selectorPresentation: stakingPresentation }
    : opened?.details;
  // Acknowledge an OBSERVATION from its own modal. Only observation cards carry a
  // dismissal signature, so every other family renders no Dismiss control at all.
  const onDismissSelected = selectedCard?.dismissalSignature
    ? () => {
        dismiss(selectedCard.dismissalSignature as string);
        close();
      }
    : undefined;

  const reviewModal = opened?.stableYieldReview ? (
    <SuggestionReviewModal
      stableYieldReview={opened.stableYieldReview}
      onClose={close}
    />
  ) : opened?.contributionReview ? (
    <SuggestionReviewModal
      contributionReview={opened.contributionReview}
      swapAction={opened.swapAction}
      swapQuoteIsDca={selectedCard?.type === "dca_buy"}
      swapQuoteFetcher={opened.swapQuoteFetcher}
      onClose={close}
      demo={demo}
      demoOutcome={demoOutcome}
      onSwapQuoteGaveUp={() => { close(); onSwapQuoteGaveUp?.(); }}
      onConnectWallet={onConnectWallet ? () => { close(); onConnectWallet(); } : undefined}
    />
  ) : detailsForModal ? (
    <SuggestionReviewModal
      details={detailsForModal}
      swapAction={opened?.swapAction}
      swapQuoteIsDca={selectedCard?.type === "dca_buy"}
      swapQuoteFetcher={opened?.swapQuoteFetcher}
      onDismiss={onDismissSelected}
      onClose={close}
      demo={demo}
      demoOutcome={demoOutcome}
      onSwapQuoteGaveUp={() => { close(); onSwapQuoteGaveUp?.(); }}
      onConnectWallet={onConnectWallet ? () => { close(); onConnectWallet(); } : undefined}
    />
  ) : null;

  if (rail?.loading) {
    // Same header as the ready/default state (icon + title + description); the
    // single card shows the animated Smith AI symbol + a "preparing" label,
    // mirroring the first-open "Smith AI getting ready" beat.
    return (
      <>
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
      {/* An open review outlives the rail reloading behind it — it is a snapshot, and taking
          it away mid-swap because balances refreshed would lose the reader their place. */}
      {reviewModal}
      </>
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
          busyCardId={pendingId}
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
    <>
      <aside className="suggestion-rail" aria-label={railLabel}>
        <EmptyStateCard
          title={REAL_WALLET_SUGGESTIONS_TITLE}
          description={onTrackUnavailable ?? SUGGESTIONS_UNAVAILABLE}
        />
      </aside>
      {reviewModal}
    </>
  );
}

/**
 * SuggestionRail — right-rail suggestions mode per patterns/dashboard-layout.md
 * and patterns/suggestion-flow.md.
 *
 * Renders cards in the exact order provided by the Suggestion Engine. No sorting,
 * ranking, or Top Pick selection happens here.
 *
 * TWO GROUPS, one order, ONE look. Cards the engine marks as OBSERVATIONS
 * (`actionability: "observation"`) sort below the suggestions that have a
 * concrete next step, but render identically — no rule, no heading. The
 * distinction is behavioral (never Top Pick, dismissible from the modal), not
 * visual. Relative order inside each group is still exactly the engine's.
 *
 * Acknowledged observations are filtered out here, in the view — the engine stays
 * pure and keeps producing them, so nothing about eligibility or scoring depends
 * on what a user has hidden.
 */
import SuggestionCard from "./SuggestionCard";
import ButtonIcon from "./ButtonIcon";
import type { RightRailState, SuggestionCardState } from "../types/dashboard";
import type { SolStakingSelectorPresentation } from "../suggestions/solStakingSelectorPresentationTypes";
import { useDismissedSuggestions, isSignatureDismissed } from "../state/dismissedSuggestions";
import sparcleUrl from "../../../assets/icons/ui/sparcle.svg";

interface Props {
  rail: RightRailState;
  railLabel: string;
  /** Optional soft notice above the cards (e.g. partial-pricing warning). */
  notice?: string;
  onExternalHandoff?: (card: SuggestionCardState) => void;
  onReview?: (card: SuggestionCardState) => void;
  /** Step 14Z — current SOL staking comparison presentation, forwarded to the SOL staking card. */
  stakingPresentation?: SolStakingSelectorPresentation;
}

export default function SuggestionRail({
  rail,
  railLabel,
  notice,
  onExternalHandoff,
  onReview,
  stakingPresentation,
}: Props) {
  const { dismissed } = useDismissedSuggestions();

  // Hide only observations the user acknowledged for THIS exact condition. A card
  // whose signature has changed since the dismissal reappears on its own.
  const visible = rail.cards.filter((c) => !isSignatureDismissed(c.dismissalSignature, dismissed));
  const actionable = visible.filter((c) => c.actionability !== "observation");
  const observations = visible.filter((c) => c.actionability === "observation");

  const renderCard = (card: SuggestionCardState) => (
    <SuggestionCard
      key={card.id}
      card={card}
      onExternalHandoff={onExternalHandoff}
      onReview={onReview}
      stakingPresentation={stakingPresentation}
    />
  );

  return (
    <aside className="suggestion-rail" aria-label={railLabel}>
      <div className="suggestion-rail__header">
        <h2 className="suggestion-rail__title">
          <span className="suggestion-rail__title-icon">
            <ButtonIcon src={sparcleUrl} size={24} />
          </span>
          {rail.title}
        </h2>
        <p className="suggestion-rail__description">{rail.description}</p>
      </div>
      {notice && (
        <p className="suggestion-rail__notice" role="status">
          {notice}
        </p>
      )}
      <div className="suggestion-rail__cards">{actionable.map(renderCard)}</div>
      {observations.length > 0 && (
        <div className="suggestion-rail__group">
          <div className="suggestion-rail__cards">{observations.map(renderCard)}</div>
        </div>
      )}
    </aside>
  );
}

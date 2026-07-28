/**
 * SuggestionRail — right-rail suggestions mode per patterns/dashboard-layout.md
 * and patterns/suggestion-flow.md.
 *
 * Renders cards in the exact order provided by the Suggestion Engine fixture.
 * No sorting, ranking, or Top Pick selection happens here.
 */
import SuggestionCard from "./SuggestionCard";
import ButtonIcon from "./ButtonIcon";
import type { RightRailState, SuggestionCardState } from "../types/dashboard";
import type { SolStakingSelectorPresentation } from "../suggestions/solStakingSelectorPresentationTypes";
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
      <div className="suggestion-rail__cards">
        {rail.cards.map((card) => (
          <SuggestionCard
            key={card.id}
            card={card}
            onExternalHandoff={onExternalHandoff}
            onReview={onReview}
            stakingPresentation={stakingPresentation}
          />
        ))}
      </div>
    </aside>
  );
}

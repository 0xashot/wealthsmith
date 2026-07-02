/**
 * SuggestionRail — right-rail suggestions mode per patterns/dashboard-layout.md
 * and patterns/suggestion-flow.md.
 *
 * Renders cards in the exact order provided by the Suggestion Engine fixture.
 * No sorting, ranking, or Top Pick selection happens here.
 */
import SuggestionCard from "./SuggestionCard";
import type { RightRailState, SuggestionCardState } from "../types/dashboard";

interface Props {
  rail: RightRailState;
  railLabel: string;
  onExternalHandoff?: (card: SuggestionCardState) => void;
}

export default function SuggestionRail({ rail, railLabel, onExternalHandoff }: Props) {
  return (
    <aside className="suggestion-rail" aria-label={railLabel}>
      <div className="suggestion-rail__header">
        <h2 className="suggestion-rail__title">{rail.title}</h2>
        <p className="suggestion-rail__description">{rail.description}</p>
      </div>
      <div className="suggestion-rail__cards">
        {rail.cards.map((card) => (
          <SuggestionCard key={card.id} card={card} onExternalHandoff={onExternalHandoff} />
        ))}
      </div>
    </aside>
  );
}

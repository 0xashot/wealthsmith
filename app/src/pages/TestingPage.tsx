/**
 * TestingPage — Step 13H. A HIDDEN, fixture-only QA surface at `/testing` that
 * shows every suggestion category in the SAME shared `SuggestionCard` +
 * `SuggestionReviewModal` real wallet mode uses. It answers: "how do all
 * WealthSmith suggestion categories look in the real card and Review Details
 * modal?"
 *
 * SAFETY: fixture-only, read-only. It never connects a wallet, reads real wallet
 * data, mutates live/Demo suggestions, or enables a transaction. The card/modal
 * are the SHARED components — this file only adds a page/layout wrapper and a
 * category filter. It is not linked in navigation and not imported by any live
 * page; reachable only by opening the URL directly (and only when the route is
 * enabled — see `isTestingPageEnabled()`).
 */
import { useMemo, useState } from "react";
import SuggestionCard from "../components/SuggestionCard";
import SuggestionReviewModal from "../components/SuggestionReviewModal";
import {
  getTestingPageFixtures,
  TESTING_GROUPS,
  TESTING_PREVIEW_NOT_LIVE,
  type TestingFixture,
  type TestingGroup,
} from "./testingPageFixtures";
import "./testingPage.css";

type Filter = "All" | TestingGroup;
const FILTERS: Filter[] = ["All", ...TESTING_GROUPS];

export default function TestingPage() {
  const fixtures = useMemo(() => getTestingPageFixtures(), []);
  const [filter, setFilter] = useState<Filter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = filter === "All" ? fixtures : fixtures.filter((f) => f.group === filter);

  const selected: TestingFixture | undefined = selectedId
    ? fixtures.find((f) => f.id === selectedId)
    : undefined;

  return (
    <main className="testing-page">
      <header className="testing-page__header">
        <p className="testing-page__eyebrow">{TESTING_PREVIEW_NOT_LIVE}</p>
        <h1 className="testing-page__title">Testing</h1>
        <p className="testing-page__subtext">
          Fixture-only suggestion states for UI review. Not real wallet data. No
          transaction is created, and no wallet is connected.
        </p>
      </header>

      <div className="testing-page__filters" role="tablist" aria-label="Suggestion groups">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            className={`testing-page__filter${filter === f ? " testing-page__filter--active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <section className="testing-page__grid" aria-label="Suggestion fixtures">
        {visible.map((f) => (
          <div key={f.id} className="testing-page__cell">
            <p className="testing-page__cell-label">{f.categoryLabel}</p>
            <SuggestionCard card={f.card} onReview={() => setSelectedId(f.id)} />
          </div>
        ))}
      </section>

      {selected && (
        <SuggestionReviewModal
          details={selected.details}
          isTopPick={selected.card.is_top_pick === true}
          onClose={() => setSelectedId(null)}
        />
      )}
    </main>
  );
}

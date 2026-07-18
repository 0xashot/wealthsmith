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
import { runAllContributionTestingScenarios } from "../suggestions/contributionTestingScenarios";
import { toSuggestionCard } from "../suggestions/toSuggestionCard";
import { STABLE_YIELD_TESTING_CARD_FIXTURES, STABLE_YIELD_TESTING_REVIEW_FIXTURES, STABLE_YIELD_TESTING_NON_RENDER_FIXTURES, STABLE_YIELD_TESTING_FIXTURES } from "../suggestions/stableYieldTestingFixtures";
import { DIRECT_LENDING_TESTING_ROWS } from "../suggestions/directUsdcLendingTestingFixtures";
import { buildStableYieldPlanPresentation } from "../suggestions/yieldStrategyPlanPresentation";
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

  // Step 15H — the 30 contribution/DCA scenarios, each running the REAL pipeline (no hand-built cards).
  const contributionScenarios = useMemo(() => runAllContributionTestingScenarios(), []);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const selectedScenario = selectedScenarioId ? contributionScenarios.find((s) => s.id === selectedScenarioId) : undefined;

  const [selectedStableYieldId, setSelectedStableYieldId] = useState<string | null>(null);
  const selectedStableYield = selectedStableYieldId ? STABLE_YIELD_TESTING_FIXTURES.find((f) => f.id === selectedStableYieldId) : undefined;
  const selectedStableYieldReview = selectedStableYield?.suggestion ? buildStableYieldPlanPresentation(selectedStableYield.suggestion).review : null;

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

      {/* Step 15H — contribution & DCA plan scenarios (T1–T30), real pipeline. */}
      <section className="testing-page__contrib" aria-label="Contribution plan scenarios">
        <h2 className="testing-page__section-title">Contribution &amp; DCA plans</h2>
        <p className="testing-page__subtext">
          Each scenario runs the real 15A–15H pipeline. Ready scenarios render the shared card and open
          the shared review modal; blocked scenarios show deterministic diagnostics only — never a
          recommendation card.
        </p>
        <div className="testing-page__contrib-grid">
          {contributionScenarios.map((s) => {
            const p = s.pipeline;
            const ready = p.status === "ready" && p.suggestion != null;
            const cp = p.suggestion?.contributionPlan;
            const amount = cp
              ? cp.amountKind === "exact"
                ? `$${(cp.exactAmountUsd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `$${(cp.minimumAmountUsd ?? 0).toFixed(2)}–$${(cp.maximumAmountUsd ?? 0).toFixed(2)}`
              : "—";
            return (
              <div key={s.id} className="testing-page__contrib-cell">
                <div className="testing-page__contrib-head">
                  <span className="testing-page__badge">TEST FIXTURE</span>
                  <span className="testing-page__contrib-id">{s.id}</span>
                </div>
                <p className="testing-page__contrib-name">{s.name}</p>
                <dl className="testing-page__contrib-diag">
                  <div><dt>Data mode</dt><dd>{p.dataMode}</dd></div>
                  <div><dt>Pipeline</dt><dd>{p.status}</dd></div>
                  <div><dt>Plan</dt><dd>{p.plan?.kind ?? p.planResult?.status ?? "—"}</dd></div>
                  <div><dt>Suggestion</dt><dd>{p.suggestion ? p.suggestion.category : "none"}</dd></div>
                  <div><dt>Purpose</dt><dd>{p.plan?.priorityPurpose ?? "—"}</dd></div>
                  <div><dt>Source</dt><dd>{p.plan?.fundingSourceId ?? "—"}</dd></div>
                  <div><dt>Alt sources</dt><dd>{p.plan?.alternativeFundingSourceIds.join(", ") || "—"}</dd></div>
                  <div><dt>Target</dt><dd>{cp?.targetSymbol ?? "—"}</dd></div>
                  <div><dt>Amount</dt><dd>{amount}</dd></div>
                  <div><dt>Plan ID</dt><dd className="testing-page__contrib-planid">{p.plan?.planId ?? "—"}</dd></div>
                  {p.blockers.length > 0 && <div><dt>Blockers</dt><dd>{p.blockers.join(", ")}</dd></div>}
                </dl>
                {ready && p.suggestion ? (
                  <SuggestionCard card={toSuggestionCard(p.suggestion)} onReview={() => setSelectedScenarioId(s.id)} />
                ) : (
                  <p className="testing-page__contrib-noplan">
                    {p.status === "no_action_required"
                      ? "On Track — no contribution-allocation action is required. No recommendation card."
                      : "Blocked — no recommendation card (see diagnostics above)."}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {selectedScenario?.review && (
        <SuggestionReviewModal
          contributionReview={selectedScenario.review}
          isTopPick={selectedScenario.pipeline.suggestion?.is_top_pick === true}
          onClose={() => setSelectedScenarioId(null)}
        />
      )}

      {/* Step 16H-C — Stable Yield card + review states (injected 16H-B presentation fixtures). */}
      <section className="testing-page__contrib" aria-label="Stable Yield suggestions">
        <h2 className="testing-page__section-title">Stable Yield</h2>
        <p className="testing-page__subtext">
          Injected deterministic Stable Yield presentation fixtures (16G plan → 16H-A suggestion → 16H-B
          card/review). Read-only: the "Review Strategy" CTA opens the shared review drawer only — never a
          transaction, signature, deposit, or external protocol page. No production product is approved,
          so real wallet mode shows no Stable Yield card.
        </p>
        <h3 className="testing-page__section-subtitle">Cards</h3>
        <div className="testing-page__grid">
          {STABLE_YIELD_TESTING_CARD_FIXTURES.map((f) => (
            <div key={f.id} className="testing-page__cell">
              <p className="testing-page__cell-label">{f.label}</p>
              {f.card ? (
                <SuggestionCard card={f.card} onReview={() => setSelectedStableYieldId(f.id)} />
              ) : (
                <p className="testing-page__contrib-noplan">Fails closed — no card rendered.</p>
              )}
            </div>
          ))}
        </div>
        <h3 className="testing-page__section-subtitle">Review drawers</h3>
        <div className="testing-page__grid">
          {STABLE_YIELD_TESTING_REVIEW_FIXTURES.map((f) => (
            <div key={f.id} className="testing-page__cell">
              <p className="testing-page__cell-label">{f.label}</p>
              {f.card ? (
                <SuggestionCard card={f.card} onReview={() => setSelectedStableYieldId(f.id)} />
              ) : (
                <p className="testing-page__contrib-noplan">Fails closed — no card rendered.</p>
              )}
            </div>
          ))}
        </div>
        <h3 className="testing-page__section-subtitle">Fail-closed (no card)</h3>
        <div className="testing-page__contrib-grid">
          {STABLE_YIELD_TESTING_NON_RENDER_FIXTURES.map((f) => (
            <div key={f.id} className="testing-page__contrib-cell">
              <div className="testing-page__contrib-head">
                <span className="testing-page__badge">TEST FIXTURE</span>
                <span className="testing-page__contrib-id">{f.id}</span>
              </div>
              <p className="testing-page__contrib-name">{f.label}</p>
              <p className="testing-page__contrib-noplan">
                {f.description} No card is rendered ({f.card === null ? "presentation suppressed" : "unexpected"}).
              </p>
            </div>
          ))}
        </div>
      </section>

      {selectedStableYieldReview && (
        <SuggestionReviewModal
          stableYieldReview={selectedStableYieldReview}
          isTopPick={selectedStableYield?.card?.is_top_pick === true}
          onClose={() => setSelectedStableYieldId(null)}
        />
      )}

      {/* Step 16H-S.2 — Direct USDC lending: all 24 governance/runtime states through the production card. */}
      <section className="testing-page__contrib" aria-label="Direct USDC lending suggestions">
        <h2 className="testing-page__section-title">Direct USDC lending (Kamino)</h2>
        <p className="testing-page__subtext">
          All 24 direct-lending states rendered through the SAME production SuggestionCard. Read-only:
          the CTA opens details only — never a transaction, signature, deposit, or external page. Cards
          never show a risk score or threshold; the state name, selector result, and risk disclosure are
          shown only in these internal testing diagnostics. APY is estimated and dynamic (fixture sample).
        </p>
        <h3 className="testing-page__section-subtitle">States that render a card</h3>
        <div className="testing-page__grid">
          {DIRECT_LENDING_TESTING_ROWS.filter((r) => r.card).map((r) => (
            <div key={r.id} className="testing-page__cell">
              <p className="testing-page__cell-label">{r.stateId}. {r.name} — <span className="testing-page__badge">{r.selectorState}</span></p>
              <SuggestionCard card={r.card!} onReview={() => undefined} />
              <p className="testing-page__contrib-noplan">Risk disclosure: {r.riskDisclosure}</p>
            </div>
          ))}
        </div>
        <h3 className="testing-page__section-subtitle">Suppressed / fail-closed states (no card)</h3>
        <div className="testing-page__contrib-grid">
          {DIRECT_LENDING_TESTING_ROWS.filter((r) => !r.card).map((r) => (
            <div key={r.id} className="testing-page__contrib-cell">
              <div className="testing-page__contrib-head">
                <span className="testing-page__badge">{r.selectorState}</span>
                <span className="testing-page__contrib-id">#{r.stateId}</span>
              </div>
              <p className="testing-page__contrib-name">{r.name}</p>
              <p className="testing-page__contrib-noplan">{r.suppressionReason}. {r.notes}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

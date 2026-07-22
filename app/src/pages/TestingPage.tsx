/**
 * TestingPage — a HIDDEN, fixture-only QA surface at `/testing`. Step 21G rebuilt it as a clean
 * suggestion-card GALLERY: one accessible tab per suggestion category (in product order), each showing
 * ONLY the states that actually render a card, through the SAME shared `SuggestionCard` +
 * `SuggestionReviewModal` real wallet mode uses.
 *
 * Every visible card is PRODUCTION-DERIVED — each category runs its canonical production assessment/rule +
 * card mapper (or, for Stable Yield / DCA, the production presentation pipeline) and renders the resulting
 * card. There are no hand-built card objects, no tables, no gate/readiness/raw-state inspectors, and no
 * "no-card" cells: this page shows finished cards and their Review modal, nothing else. Visually-identical
 * scenarios are de-duplicated so each tab shows only meaningfully-different cards.
 *
 * SAFETY: fixture-only, read-only. It never connects a wallet, reads real wallet data, mutates live/Demo
 * suggestions, or enables a transaction. It is not linked in navigation and not imported by any live page;
 * reachable only by opening the URL directly (and only when the route is enabled — see isTestingPageEnabled()).
 *
 * The hand-built card fixtures in `testingPageFixtures.ts` are intentionally NOT rendered here anymore; they
 * are retained ONLY as automated-suite fixtures (the Node fixtures runner still imports them). Nothing about
 * the automated fixture/regression coverage depends on what this page renders.
 */
import { useMemo, useRef, useState } from "react";
import SuggestionCard from "../components/SuggestionCard";
import SuggestionReviewModal from "../components/SuggestionReviewModal";
import type { SuggestionCardState } from "../types/dashboard";
import { TESTING_PREVIEW_NOT_LIVE } from "./testingPageFixtures";
import { runAllContributionTestingScenarios } from "../suggestions/contributionTestingScenarios";
import { toSuggestionCard } from "../suggestions/toSuggestionCard";
import { STABLE_YIELD_TESTING_CARD_FIXTURES, STABLE_YIELD_TESTING_FIXTURES } from "../suggestions/stableYieldTestingFixtures";
import { buildStableYieldPlanPresentation } from "../suggestions/yieldStrategyPlanPresentation";
import { getRebalanceTestingFixtures } from "./rebalanceTestingFixtures";
import { getTrimTestingFixtures } from "./trimTestingFixtures";
import { getPositionOptimizationTestingFixtures } from "./positionOptimizationTestingFixtures";
import { getSafetyBufferTestingFixtures } from "./safetyBufferTestingFixtures";
import { getOnTrackTestingFixtures } from "./onTrackTestingFixtures";
import { getCapitalEfficiencyTestingFixtures, getStakingTestingFixtures } from "./capitalEfficiencyStakingTestingFixtures";
import "./testingPage.css";

/** The nine suggestion categories, in the existing product order. */
const TABS = [
  { id: "safety_buffer", label: "Safety Buffer" },
  { id: "rebalance", label: "Rebalance" },
  { id: "capital_efficiency", label: "Capital Efficiency" },
  { id: "trim", label: "Trim" },
  { id: "staking", label: "Staking" },
  { id: "stable_yield", label: "Stable Yield" },
  { id: "dca", label: "DCA" },
  { id: "position_optimization", label: "Position Optimization" },
  { id: "on_track", label: "On Track" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** One card to render in the gallery: a production card + a short Testing-only state label above it. */
interface GalleryEntry {
  key: string;
  stateLabel: string;
  card: SuggestionCardState;
  /** Present only when the card supports Review (opens the shared production modal). */
  onReview?: () => void;
}

/**
 * A visual signature of a card's FACE (what the user sees in the gallery, outside the modal). Two entries
 * with the same signature are visually identical and only the first is kept — so each tab shows only
 * meaningfully-different cards (differing title / description / amount+label / status / severity / Top Pick /
 * actionability / CTA).
 */
function cardFaceSignature(c: SuggestionCardState): string {
  return [
    c.title,
    c.description,
    c.impact_text,
    c.status,
    c.actionability,
    c.severity,
    String(c.is_top_pick),
    c.cta?.label ?? "",
    c.cta?.action ?? "",
  ].join("§");
}

function dedupeByCardFace(entries: GalleryEntry[]): GalleryEntry[] {
  const seenFace = new Set<string>();
  return entries.filter((e) => {
    const sig = cardFaceSignature(e.card);
    if (seenFace.has(sig)) return false;
    seenFace.add(sig);
    return true;
  });
}

export default function TestingPage() {
  // ---- Production-derived gallery sources (each runs the canonical assessment/rule + card mapper). ----
  const safetyBufferFixtures = useMemo(() => getSafetyBufferTestingFixtures(), []);
  const rebalanceFixtures = useMemo(() => getRebalanceTestingFixtures(), []);
  const capitalEfficiencyFixtures = useMemo(() => getCapitalEfficiencyTestingFixtures(), []);
  const trimFixtures = useMemo(() => getTrimTestingFixtures(), []);
  const stakingFixtures = useMemo(() => getStakingTestingFixtures(), []);
  const positionOptimizationFixtures = useMemo(() => getPositionOptimizationTestingFixtures(), []);
  const onTrackFixtures = useMemo(() => getOnTrackTestingFixtures(), []);
  // Step 15H — the DCA scenarios run the REAL contribution pipeline (no hand-built cards).
  const contributionScenarios = useMemo(() => runAllContributionTestingScenarios(), []);

  const [active, setActive] = useState<TabId>("safety_buffer");

  // Per-category Review selection. Switching tabs closes any open modal (see selectTab).
  const [selectedSafetyBufferId, setSelectedSafetyBufferId] = useState<string | null>(null);
  const [selectedRebalanceId, setSelectedRebalanceId] = useState<string | null>(null);
  const [selectedCapitalEfficiencyId, setSelectedCapitalEfficiencyId] = useState<string | null>(null);
  const [selectedTrimId, setSelectedTrimId] = useState<string | null>(null);
  const [selectedStakingId, setSelectedStakingId] = useState<string | null>(null);
  const [selectedStableYieldId, setSelectedStableYieldId] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [selectedPositionOptimizationId, setSelectedPositionOptimizationId] = useState<string | null>(null);

  const selectedSafetyBuffer = selectedSafetyBufferId ? safetyBufferFixtures.find((f) => f.id === selectedSafetyBufferId && f.card && f.card.action_kind === "review_only") : undefined;
  const selectedRebalance = selectedRebalanceId ? rebalanceFixtures.find((f) => f.id === selectedRebalanceId && f.card) : undefined;
  const selectedCapitalEfficiency = selectedCapitalEfficiencyId ? capitalEfficiencyFixtures.find((f) => f.id === selectedCapitalEfficiencyId && f.card) : undefined;
  const selectedTrim = selectedTrimId ? trimFixtures.find((f) => f.id === selectedTrimId && f.card) : undefined;
  const selectedStaking = selectedStakingId ? stakingFixtures.find((f) => f.id === selectedStakingId && f.card) : undefined;
  const selectedPositionOptimization = selectedPositionOptimizationId ? positionOptimizationFixtures.find((f) => f.id === selectedPositionOptimizationId && f.card) : undefined;
  const selectedScenario = selectedScenarioId ? contributionScenarios.find((s) => s.id === selectedScenarioId) : undefined;
  const selectedStableYield = selectedStableYieldId ? STABLE_YIELD_TESTING_FIXTURES.find((f) => f.id === selectedStableYieldId) : undefined;
  const selectedStableYieldReview = selectedStableYield?.suggestion ? buildStableYieldPlanPresentation(selectedStableYield.suggestion).review : null;

  // ---- Build one gallery-entry list per tab (card-producing states only, de-duplicated). ----
  const safetyBufferEntries = useMemo<GalleryEntry[]>(() => {
    const base = safetyBufferFixtures
      .filter((f) => f.card)
      .map((f) => {
        const isDefinite = f.card!.action_kind === "review_only";
        return {
          key: f.id,
          stateLabel: f.label,
          card: toSuggestionCard(f.card!),
          onReview: isDefinite ? () => setSelectedSafetyBufferId(f.id) : undefined,
        };
      });
    const deduped = dedupeByCardFace(base);
    // ONE explicit Top Pick variant — the SAME production definite card with the engine's is_top_pick flag
    // set (exactly what selectTopPick does), so the gallery shows the Top Pick visual treatment once.
    const definite = safetyBufferFixtures.find((f) => f.card && f.card.action_kind === "review_only");
    const topPick: GalleryEntry[] = definite
      ? [{
          key: `${definite.id}__top_pick`,
          stateLabel: "Selected suggestion (Top Pick treatment)",
          card: toSuggestionCard({ ...definite.card!, is_top_pick: true }),
          onReview: () => setSelectedSafetyBufferId(definite.id),
        }]
      : [];
    return [...topPick, ...deduped];
  }, [safetyBufferFixtures]);

  const rebalanceEntries = useMemo<GalleryEntry[]>(
    () => dedupeByCardFace(rebalanceFixtures.filter((f) => f.card).map((f) => ({
      key: f.id,
      stateLabel: f.label,
      card: toSuggestionCard(f.card!),
      onReview: () => setSelectedRebalanceId(f.id),
    }))),
    [rebalanceFixtures]
  );

  const capitalEfficiencyEntries = useMemo<GalleryEntry[]>(
    () => dedupeByCardFace(capitalEfficiencyFixtures.filter((f) => f.card).map((f) => ({
      key: f.id,
      stateLabel: f.label,
      card: toSuggestionCard(f.card!),
      onReview: () => setSelectedCapitalEfficiencyId(f.id),
    }))),
    [capitalEfficiencyFixtures]
  );

  const trimEntries = useMemo<GalleryEntry[]>(
    () => dedupeByCardFace(trimFixtures.filter((f) => f.card).map((f) => ({
      key: f.id,
      stateLabel: f.label,
      card: toSuggestionCard(f.card!),
      onReview: () => setSelectedTrimId(f.id),
    }))),
    [trimFixtures]
  );

  const stakingEntries = useMemo<GalleryEntry[]>(
    () => dedupeByCardFace(stakingFixtures.filter((f) => f.card).map((f) => ({
      key: f.id,
      stateLabel: f.label,
      card: toSuggestionCard(f.card!),
      onReview: () => setSelectedStakingId(f.id),
    }))),
    [stakingFixtures]
  );

  const stableYieldEntries = useMemo<GalleryEntry[]>(
    () => dedupeByCardFace(STABLE_YIELD_TESTING_CARD_FIXTURES.filter((f) => f.card).map((f) => ({
      key: f.id,
      stateLabel: f.label,
      card: f.card!,
      onReview: () => setSelectedStableYieldId(f.id),
    }))),
    []
  );

  const dcaEntries = useMemo<GalleryEntry[]>(
    () => dedupeByCardFace(contributionScenarios.flatMap((s) => {
      const p = s.pipeline;
      if (p.status !== "ready" || !p.suggestion || p.suggestion.category !== "dca") return [];
      return [{
        key: s.id,
        stateLabel: s.name,
        card: toSuggestionCard(p.suggestion),
        onReview: () => setSelectedScenarioId(s.id),
      }];
    })),
    [contributionScenarios]
  );

  const positionOptimizationEntries = useMemo<GalleryEntry[]>(
    () => dedupeByCardFace(positionOptimizationFixtures.filter((f) => f.card).map((f) => ({
      key: f.id,
      stateLabel: f.label,
      card: toSuggestionCard(f.card!),
      onReview: () => setSelectedPositionOptimizationId(f.id),
    }))),
    [positionOptimizationFixtures]
  );

  // On Track is INFORMATIONAL: no Review control, no modal — the scoped claim is on the card itself. Each eligible
  // state now emits up to three cards (Goal Check / Expense Benchmark / Safety Buffer); flatten them into entries.
  const onTrackEntries = useMemo<GalleryEntry[]>(
    () => dedupeByCardFace(onTrackFixtures.flatMap((f) => f.cards.map((c) => ({
      key: `${f.id}__${c.id}`,
      stateLabel: f.label,
      card: toSuggestionCard(c),
    })))),
    [onTrackFixtures]
  );

  const entriesByTab: Record<TabId, GalleryEntry[]> = {
    safety_buffer: safetyBufferEntries,
    rebalance: rebalanceEntries,
    capital_efficiency: capitalEfficiencyEntries,
    trim: trimEntries,
    staking: stakingEntries,
    stable_yield: stableYieldEntries,
    dca: dcaEntries,
    position_optimization: positionOptimizationEntries,
    on_track: onTrackEntries,
  };

  // ---- Tab selection (also closes any open Review modal — the modal belongs to the previous tab). ----
  function selectTab(id: TabId) {
    setActive(id);
    setSelectedSafetyBufferId(null);
    setSelectedRebalanceId(null);
    setSelectedCapitalEfficiencyId(null);
    setSelectedTrimId(null);
    setSelectedStakingId(null);
    setSelectedStableYieldId(null);
    setSelectedScenarioId(null);
    setSelectedPositionOptimizationId(null);
  }

  // Roving-tabindex keyboard navigation across the tab list (arrow keys + Home/End).
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  function onTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    selectTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  const entries = entriesByTab[active];

  return (
    <main className="testing-page">
      <header className="testing-page__header">
        <p className="testing-page__eyebrow">{TESTING_PREVIEW_NOT_LIVE}</p>
        <h1 className="testing-page__title">Suggestion Card Gallery</h1>
        <p className="testing-page__subtext">
          Production-derived suggestion cards for UI review, one tab per category. Fixture-only — not real
          wallet data. No wallet is connected and no transaction is created.
        </p>
      </header>

      <div className="testing-page__filters" role="tablist" aria-label="Suggestion categories" aria-orientation="horizontal">
        {TABS.map((t, i) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => { tabRefs.current[i] = el; }}
              type="button"
              role="tab"
              id={`testing-tab-${t.id}`}
              aria-selected={isActive}
              aria-controls={`testing-panel-${t.id}`}
              tabIndex={isActive ? 0 : -1}
              className={`testing-page__filter${isActive ? " testing-page__filter--active" : ""}`}
              onClick={() => selectTab(t.id)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <section
        role="tabpanel"
        id={`testing-panel-${active}`}
        aria-labelledby={`testing-tab-${active}`}
        tabIndex={0}
        className="testing-page__grid testing-page__tabpanel"
      >
        {entries.map((e) => (
          <div key={e.key} className="testing-page__cell">
            <p className="testing-page__cell-label">{e.stateLabel}</p>
            {/* SuggestionCard derives its DOM element id from `card.id`; several states of one category share a
                stable suggestion id, so we override it with the unique gallery key to keep every DOM id unique. */}
            <SuggestionCard card={{ ...e.card, id: e.key }} onReview={e.onReview} />
          </div>
        ))}
      </section>

      {/* Shared PRODUCTION review modals — one per category, fed by production reviewDetails / presentation.
          Only the active tab's cards can open one, and switching tabs closes it (selectTab resets selection). */}
      {selectedSafetyBuffer?.card?.reviewDetails && (
        <SuggestionReviewModal
          details={selectedSafetyBuffer.card.reviewDetails}
          isTopPick={selectedSafetyBuffer.card.is_top_pick === true}
          onClose={() => setSelectedSafetyBufferId(null)}
        />
      )}

      {selectedRebalance?.card?.reviewDetails && (
        <SuggestionReviewModal
          details={selectedRebalance.card.reviewDetails}
          isTopPick={selectedRebalance.card.is_top_pick === true}
          onClose={() => setSelectedRebalanceId(null)}
        />
      )}

      {selectedCapitalEfficiency?.card?.reviewDetails && (
        <SuggestionReviewModal
          details={selectedCapitalEfficiency.card.reviewDetails}
          isTopPick={selectedCapitalEfficiency.card.is_top_pick === true}
          onClose={() => setSelectedCapitalEfficiencyId(null)}
        />
      )}

      {selectedTrim?.card?.reviewDetails && (
        <SuggestionReviewModal
          details={selectedTrim.card.reviewDetails}
          isTopPick={selectedTrim.card.is_top_pick === true}
          onClose={() => setSelectedTrimId(null)}
        />
      )}

      {selectedStaking?.card?.reviewDetails && (
        <SuggestionReviewModal
          details={selectedStaking.card.reviewDetails}
          isTopPick={selectedStaking.card.is_top_pick === true}
          onClose={() => setSelectedStakingId(null)}
        />
      )}

      {selectedStableYieldReview && (
        <SuggestionReviewModal
          stableYieldReview={selectedStableYieldReview}
          isTopPick={selectedStableYield?.card?.is_top_pick === true}
          onClose={() => setSelectedStableYieldId(null)}
        />
      )}

      {selectedScenario?.review && (
        <SuggestionReviewModal
          contributionReview={selectedScenario.review}
          isTopPick={selectedScenario.pipeline.suggestion?.is_top_pick === true}
          onClose={() => setSelectedScenarioId(null)}
        />
      )}

      {selectedPositionOptimization?.card?.reviewDetails && (
        <SuggestionReviewModal
          details={selectedPositionOptimization.card.reviewDetails}
          isTopPick={selectedPositionOptimization.card.is_top_pick === true}
          onClose={() => setSelectedPositionOptimizationId(null)}
        />
      )}
    </main>
  );
}

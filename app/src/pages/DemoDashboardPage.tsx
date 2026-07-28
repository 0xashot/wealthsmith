/**
 * DemoDashboardPage — full Demo Mode Dashboard per rules/demo-mode-rules.md
 * and patterns/dashboard-layout.md.
 *
 * Renders the SAME body as the connected Dashboard (the shared DashboardBody:
 * Financial Snapshot → Safety Buffer → Projected Growth → Current vs Recommended
 * Allocation) plus the SAME shared Smith AI Suggestions rail — the only
 * differences from connected are the sample data and the blue "demo mode" banner.
 * The body is fed sample holdings (demoWalletPositions) + the canonical Demo goal;
 * the rail runs the canonical Demo profile through the SAME shared engine
 * (buildDemoContributionRail → deriveRailSuggestions, demo_fixture).
 *
 * Non-custodial / MVP-safe: no wallet pill, no wallet adapter, no signature, no
 * transaction, no fund movement, no suggestion completion. The Jupiter handoff
 * opens the fixture URL in a new tab and only shows the approved toast. Demo state
 * does not persist into connected mode (App switches modes, unmounting this page).
 */
import { useMemo, useRef, useState } from "react";
import { demoDashboardState as d } from "../state/demoDashboardState";
import { demoSmithAiContent } from "../state/demoSmithAi";
import { demoWalletPositions, DEMO_NET_CONTRIBUTIONS_USD } from "../state/demoWalletPositions";
import GlobalNav from "../components/GlobalNav";
import DemoBanner from "../components/DemoBanner";
import PageHeader from "../components/PageHeader";
import DashboardBody from "../components/DashboardBody";
import RealWalletSuggestionsRail from "../components/RealWalletSuggestionsRail";
import { demoSwapQuoteFetcher } from "../suggestions/swapQuote/demoSwapQuote";
import AskSmithAiPanel from "../components/AskSmithAiPanel";
import type { SavedGoal } from "../types/goal";
import { buildDemoContributionRail, DEMO_PRICED_AS_OF } from "../suggestions/demoContributionScenario";

type RightRailMode = "suggestions" | "ask_smith_ai";

interface Props {
  /** Kept for the Props contract (App supplies it); the shared rail handles read-only review internally. */
  pushToast?: (message: string, helper?: string) => void;
  onExitDemo: () => void;
  onConnectWallet: () => void;
  /** In-app demo page switch (Dashboard ↔ Portfolio). */
  onNavigate?: (id: string) => void;
  activePage?: string;
  /** The (editable) Demo sample goal — edits on the Demo Goal page recompute the body + rail. */
  goal: SavedGoal;
}

export default function DemoDashboardPage({
  pushToast,
  onExitDemo,
  onConnectWallet,
  onNavigate,
  activePage,
  goal,
}: Props) {
  const [railMode, setRailMode] = useState<RightRailMode>("suggestions");
  const askButtonRef = useRef<HTMLButtonElement>(null);

  // The canonical Demo run through the SAME shared engine (demo_fixture): a
  // Safety-Buffer-incomplete profile → one plan-backed Safety Buffer card (Top
  // Pick). Rendered via the shared rail; its canonical target summary also feeds
  // the dashboard body's Recommended allocation (so body ⇔ rail agree). Recomputes
  // when the user edits the sample goal on the Demo Goal page.
  const demoContributionRail = useMemo(() => buildDemoContributionRail(goal, demoWalletPositions), [goal]);

  const openAskSmithAi = () => setRailMode("ask_smith_ai");
  const closeAskSmithAi = () => {
    setRailMode("suggestions");
    askButtonRef.current?.focus();
  };

  return (
    <div className="app-shell">
      {/* Banner + nav stick to the top together as one sticky header. */}
      <div className="demo-header">
        <DemoBanner banner={d.demo_banner} onExit={onExitDemo} onConnect={onConnectWallet} />
        <GlobalNav
          mode="demo"
          nav={d.global_nav}
          navLabel={d.accessibility.global_nav_label}
          askSmithAiLabel={d.accessibility.ask_smith_ai_label}
          askAvailable={d.smith_ai.available}
          askButtonRef={askButtonRef}
          activePage={activePage}
          onNavigate={onNavigate}
          askActive={railMode === "ask_smith_ai"}
          onOpenAskSmithAi={openAskSmithAi}
        />
      </div>

      <div className="dashboard">
        <main className="dashboard__main">
          <PageHeader header={{ ...d.page_header, description: undefined }} />
          {/* The SAME shared body as the connected Dashboard, fed sample data. */}
          <DashboardBody
            goal={goal}
            demo={{
              positions: demoWalletPositions,
              pricedAsOf: DEMO_PRICED_AS_OF,
              netContributionsUsd: DEMO_NET_CONTRIBUTIONS_USD,
              targetSummary: demoContributionRail.targetSummary,
            }}
          />
        </main>

        {railMode === "ask_smith_ai" ? (
          <AskSmithAiPanel
            content={demoSmithAiContent}
            onClose={closeAskSmithAi}
            pushToast={pushToast}
          />
        ) : (
          <RealWalletSuggestionsRail
            rail={{ ...demoContributionRail, swapQuoteFetcher: demoSwapQuoteFetcher }}
            railLabel={d.accessibility.right_rail_label}
          />
        )}
      </div>
    </div>
  );
}

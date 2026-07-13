/**
 * DemoDashboardPage — full Demo Mode Dashboard per rules/demo-mode-rules.md
 * and patterns/dashboard-layout.md (Mode 5).
 *
 * Renders the demo body by REUSING the same data-driven components as the
 * connected Dashboard, driven entirely by demoDashboardState (screen chrome
 * from dashboard-demo-state.json; alert + protocol decisions from the demo
 * suggestion output demo-suggestions.json). Sample data only.
 *
 * Non-custodial / MVP-safe: no wallet pill, no wallet adapter, no signature,
 * no transaction, no fund movement, no suggestion completion. The Jupiter
 * handoff opens the fixture URL in a new tab (rel="noopener noreferrer") and
 * only shows the approved toast. Demo state does not persist into connected
 * mode (App switches modes, unmounting this page).
 */
import { useRef, useState } from "react";
import { demoDashboardState as d } from "../state/demoDashboardState";
import { demoSmithAiContent } from "../state/demoSmithAi";
import { PROTOCOL_OPENED_TOAST } from "../state/approvedCopy";
import type { SuggestionCardState } from "../types/dashboard";
import GlobalNav from "../components/GlobalNav";
import DemoBanner from "../components/DemoBanner";
import PageHeader from "../components/PageHeader";
import AlertBanner from "../components/AlertBanner";
import FinancialSnapshot from "../components/FinancialSnapshot";
import SafetyBufferCard from "../components/SafetyBufferCard";
import ProjectedGrowthChart from "../components/ProjectedGrowthChart";
import AllocationChart from "../components/AllocationChart";
import SuggestionRail from "../components/SuggestionRail";
import RealWalletSuggestionsRail from "../components/RealWalletSuggestionsRail";
import AskSmithAiPanel from "../components/AskSmithAiPanel";
import { buildDemoExactSolStakingRail } from "../suggestions/demoExactSolStakingScenario";

type RightRailMode = "suggestions" | "ask_smith_ai";
type DemoScenario = "default" | "sol_staking";

interface Props {
  pushToast: (message: string, helper?: string) => void;
  onExitDemo: () => void;
  onConnectWallet: () => void;
  /** In-app demo page switch (Dashboard ↔ Portfolio). */
  onNavigate?: (id: string) => void;
  activePage?: string;
}

export default function DemoDashboardPage({
  pushToast,
  onExitDemo,
  onConnectWallet,
  onNavigate,
  activePage,
}: Props) {
  const [railMode, setRailMode] = useState<RightRailMode>("suggestions");
  // Demo-only scenario switch. Default Demo is unchanged; "SOL Staking Demo" renders
  // the exact-staking scenario through the SAME shared real-wallet rail/card/modal.
  const [demoScenario, setDemoScenario] = useState<DemoScenario>("default");
  const askButtonRef = useRef<HTMLButtonElement>(null);

  const openAskSmithAi = () => setRailMode("ask_smith_ai");
  const closeAskSmithAi = () => {
    setRailMode("suggestions");
    askButtonRef.current?.focus();
  };

  // Sample handoff: the card's anchor opens the fixture URL in a new tab.
  // This handler only shows the approved non-execution toast.
  const onExternalHandoff = () => {
    pushToast(PROTOCOL_OPENED_TOAST);
  };

  // "Review" on the sample buffer Top Pick → its on-dashboard detail area,
  // read-only. No execution/signature/completion/Top Pick change.
  const onReviewSuggestion = (card: SuggestionCardState) => {
    const targetId =
      card.category === "safety_buffer" ? "safety-buffer" : `suggestion-${card.id}`;
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ block: "nearest" });
      (el as HTMLElement).focus();
    }
  };

  return (
    <div className="app-shell">
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
        onOpenAskSmithAi={openAskSmithAi}
      />

      <div className="dashboard">
        <main className="dashboard__main">
          <PageHeader header={d.page_header} />
          <AlertBanner alert={d.dashboard_alert} />
          <FinancialSnapshot
            title={d.financial_snapshot.title}
            metrics={d.financial_snapshot.metrics}
          />
          <SafetyBufferCard buffer={d.safety_buffer} />
          <ProjectedGrowthChart growth={d.projected_growth} />
          <AllocationChart allocation={d.allocation} />
        </main>

        {railMode === "ask_smith_ai" ? (
          <AskSmithAiPanel content={demoSmithAiContent} onClose={closeAskSmithAi} />
        ) : (
          <div className="demo-scenario-rail">
            <div className="demo-scenario-switch" role="group" aria-label="Demo scenario">
              <button
                type="button"
                className={`demo-scenario-switch__btn${demoScenario === "default" ? " demo-scenario-switch__btn--active" : ""}`}
                aria-pressed={demoScenario === "default"}
                onClick={() => setDemoScenario("default")}
              >
                Default Demo
              </button>
              <button
                type="button"
                className={`demo-scenario-switch__btn${demoScenario === "sol_staking" ? " demo-scenario-switch__btn--active" : ""}`}
                aria-pressed={demoScenario === "sol_staking"}
                onClick={() => setDemoScenario("sol_staking")}
              >
                SOL Staking Demo
              </button>
            </div>
            {demoScenario === "sol_staking" ? (
              <RealWalletSuggestionsRail
                rail={buildDemoExactSolStakingRail()}
                railLabel={d.accessibility.right_rail_label}
              />
            ) : (
              <SuggestionRail
                rail={d.right_rail}
                railLabel={d.accessibility.right_rail_label}
                onExternalHandoff={onExternalHandoff}
                onReview={onReviewSuggestion}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

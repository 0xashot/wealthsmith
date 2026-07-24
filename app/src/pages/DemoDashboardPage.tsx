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
import { useMemo, useRef, useState } from "react";
import { demoDashboardState as d } from "../state/demoDashboardState";
import { demoSmithAiContent } from "../state/demoSmithAi";
import GlobalNav from "../components/GlobalNav";
import DemoBanner from "../components/DemoBanner";
import PageHeader from "../components/PageHeader";
import AlertBanner from "../components/AlertBanner";
import FinancialSnapshot from "../components/FinancialSnapshot";
import SafetyBufferCard from "../components/SafetyBufferCard";
import ProjectedGrowthChart from "../components/ProjectedGrowthChart";
import AllocationChart from "../components/AllocationChart";
import MarketConditionsSurface from "../components/MarketConditionsSurface";
import RealWalletSuggestionsRail from "../components/RealWalletSuggestionsRail";
import { demoSwapQuoteFetcher } from "../suggestions/swapQuote/demoSwapQuote";
import AskSmithAiPanel from "../components/AskSmithAiPanel";
import { buildDemoExactSolStakingRail } from "../suggestions/demoExactSolStakingScenario";
import { buildDemoContributionRail } from "../suggestions/demoContributionScenario";
import { buildDemoStableYieldRail } from "../suggestions/demoStableYieldScenario";

type RightRailMode = "suggestions" | "ask_smith_ai";
type DemoScenario = "default" | "sol_staking" | "stable_yield";

interface Props {
  /** Kept for the Props contract (App supplies it); the shared rail handles read-only review internally. */
  pushToast?: (message: string, helper?: string) => void;
  onExitDemo: () => void;
  onConnectWallet: () => void;
  /** In-app demo page switch (Dashboard ↔ Portfolio). */
  onNavigate?: (id: string) => void;
  activePage?: string;
}

export default function DemoDashboardPage({
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

  // Step 15H — the canonical Demo run through the SAME shared engine (demo_fixture). Buffer-incomplete
  // → exactly one plan-backed Safety Buffer card (Top Pick), no SOL DCA. Rendered via the shared rail.
  const demoContributionRail = useMemo(() => buildDemoContributionRail(), []);
  // Step 22F (slice 7B) — the Demo AllocationChart's RECOMMENDED target reads the SHARED canonical target from the rail
  // (63.5% crypto / 36.5% stable), agreeing with the Market Conditions surface. CURRENT allocation is unchanged
  // (curated Demo portfolio). No target is recalculated here; a non-full target shows no hand-authored fallback target.
  const demoTarget = demoContributionRail.targetSummary;
  const demoTargetFull = demoTarget != null && demoTarget.state === "full" && demoTarget.targetCryptoPct != null && demoTarget.targetStablePct != null;
  const demoAllocation = {
    ...d.allocation,
    recommended_allocation: demoTargetFull
      ? d.allocation.recommended_allocation.map((r) =>
          r.label === "Crypto" ? { ...r, value_percent: demoTarget!.targetCryptoPct as number }
            : r.label === "Stables" ? { ...r, value_percent: demoTarget!.targetStablePct as number }
              : r,
        )
      : [], // no hand-authored fallback target when the canonical target is not full
  };
  // Step 16H-D — a funded-buffer Demo profile that visibly surfaces ONE read-only Stable Yield card
  // through the SAME shared engine (demo_fixture) → shared rail/card/review modal. Demo-only inputs.
  const demoStableYieldRail = useMemo(() => buildDemoStableYieldRail(), []);

  const openAskSmithAi = () => setRailMode("ask_smith_ai");
  const closeAskSmithAi = () => {
    setRailMode("suggestions");
    askButtonRef.current?.focus();
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
          <AllocationChart allocation={demoAllocation} />
          {/* Step 22F (slice 7) — the SAME production Market Conditions surface, from the deterministic Demo market
              fixture (no real cache, no provider). Fear 39/100, CoinMarketCap attribution, 10% explanation. */}
          <MarketConditionsSurface summary={demoContributionRail.marketSummary} />
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
              <button
                type="button"
                className={`demo-scenario-switch__btn${demoScenario === "stable_yield" ? " demo-scenario-switch__btn--active" : ""}`}
                aria-pressed={demoScenario === "stable_yield"}
                onClick={() => setDemoScenario("stable_yield")}
              >
                Stable Yield Demo
              </button>
            </div>
            {demoScenario === "sol_staking" ? (
              <RealWalletSuggestionsRail
                rail={{ ...buildDemoExactSolStakingRail(), swapQuoteFetcher: demoSwapQuoteFetcher }}
                railLabel={d.accessibility.right_rail_label}
              />
            ) : demoScenario === "stable_yield" ? (
              <RealWalletSuggestionsRail
                rail={{ ...demoStableYieldRail, swapQuoteFetcher: demoSwapQuoteFetcher }}
                railLabel={d.accessibility.right_rail_label}
              />
            ) : (
              // Step 15H — the default Demo now runs the shared contribution engine (buffer-first),
              // rendered through the shared rail/card/modal. Buffer override → one buffer card.
              <RealWalletSuggestionsRail
                rail={{ ...demoContributionRail, swapQuoteFetcher: demoSwapQuoteFetcher }}
                railLabel={d.accessibility.right_rail_label}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

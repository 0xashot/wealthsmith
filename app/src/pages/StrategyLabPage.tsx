/**
 * StrategyLabPage — Trust → Strategy Lab. A proof-first simulator comparing
 * WealthSmith guided performance against an unguided portfolio across historical
 * market scenarios (canonical fixture data in state/strategyLabState.ts).
 *
 * Available in EVERY mode — connected, disconnected/mid-onboarding, and Demo —
 * because Trust content needs no wallet (same precedent as Support). The `mode`
 * prop drives the nav chrome only; the page body is identical everywhere.
 * Connected and Demo modes also offer Ask Smith AI with static, explain-only
 * Strategy Lab content (state/strategyLabSmithAi.ts) — same pattern as Support.
 *
 * Read-only and deterministic: the scenarios are fixed historical illustrations —
 * nothing is fetched, computed from live prices, or presented as the user's own
 * portfolio or as a performance guarantee.
 */
import { useRef, useState } from "react";
import { dashboardState as connected } from "../state/dashboardState";
import { strategyLabSmithAiContent } from "../state/strategyLabSmithAi";
import { ASK_SMITH_LABEL_STRATEGY_LAB } from "../state/approvedCopy";
import {
  STRATEGY_LAB_TITLE,
  STRATEGY_LAB_DESCRIPTION,
  STRATEGY_LAB_SELECTOR_LABEL,
  STRATEGY_LAB_SCENARIO_PENDING,
  STRATEGY_LAB_SCENARIOS,
  STRATEGY_LAB_Y_TICKS_USD,
} from "../state/strategyLabState";
import GlobalNav from "../components/GlobalNav";
import DemoHeader from "../components/DemoHeader";
import PageHeader from "../components/PageHeader";
import StrategyLabChart from "../components/StrategyLabChart";
import StrategyLabBreakdown from "../components/StrategyLabBreakdown";
import AskSmithAiPanel from "../components/AskSmithAiPanel";
import EmptyStateCard from "../components/EmptyStateCard";

interface Props {
  onNavigate: (id: string) => void;
  onDisconnect: () => void;
  /** For the Ask Smith AI panel's Clear History toast. */
  pushToast?: (message: string, helper?: string) => void;
  /** "connected" (wallet pill), "disconnected" (Connect Wallet / Try Demo), or
   *  "demo" (blue demo banner + demo nav). */
  mode?: "connected" | "disconnected" | "demo";
  /** While onboarding/disconnected, Portfolio & Goal stay gated in the nav. */
  onboardingActive?: boolean;
  onConnectWallet?: () => void;
  onTryDemo?: () => void;
  /** Demo Mode only: exit back to the disconnected app. */
  onExitDemo?: () => void;
}

export default function StrategyLabPage({
  onNavigate,
  onDisconnect,
  pushToast,
  mode = "connected",
  onboardingActive,
  onConnectWallet,
  onTryDemo,
  onExitDemo,
}: Props) {
  const isDemo = mode === "demo";
  const isConnected = mode === "connected";
  const [scenarioId, setScenarioId] = useState(STRATEGY_LAB_SCENARIOS[0].id);
  const scenario = STRATEGY_LAB_SCENARIOS.find((s) => s.id === scenarioId) ?? STRATEGY_LAB_SCENARIOS[0];

  const [smithOpen, setSmithOpen] = useState(false);
  const askButtonRef = useRef<HTMLButtonElement>(null);
  const openAskSmithAi = () => setSmithOpen(true);
  const closeAskSmithAi = () => {
    setSmithOpen(false);
    askButtonRef.current?.focus();
  };

  return (
    <div className="app-shell">
      {isDemo ? (
        <DemoHeader
          activePage="strategy_lab"
          askButtonRef={askButtonRef}
          askActive={smithOpen}
          onExitDemo={onExitDemo ?? (() => {})}
          onConnectWallet={onConnectWallet ?? (() => {})}
          onNavigate={onNavigate}
          onOpenAskSmithAi={openAskSmithAi}
        />
      ) : (
        <GlobalNav
          mode={mode}
          nav={connected.global_nav}
          wallet={isConnected ? connected.wallet : undefined}
          navLabel={connected.accessibility.global_nav_label}
          walletPillLabel={isConnected ? connected.accessibility.wallet_pill_label : undefined}
          askSmithAiLabel={ASK_SMITH_LABEL_STRATEGY_LAB}
          // GlobalNav only shows the trigger when connected — disconnected /
          // mid-onboarding keeps its Connect Wallet / Try Demo actions.
          askAvailable={true}
          askButtonRef={askButtonRef}
          activePage="strategy_lab"
          onboardingActive={onboardingActive}
          onNavigate={onNavigate}
          onDisconnect={onDisconnect}
          onConnectWallet={onConnectWallet}
          onTryDemo={onTryDemo}
          askActive={smithOpen}
          onOpenAskSmithAi={openAskSmithAi}
        />
      )}

      <div className={"dashboard" + (smithOpen ? "" : " dashboard--single")}>
        <main className="dashboard__main">
          <PageHeader header={{ title: STRATEGY_LAB_TITLE, description: STRATEGY_LAB_DESCRIPTION }} />

          {/* Scenario Selector — single-select choice-chip group (components/choice-chip.md). */}
          <section className="strategy-lab__selector" aria-label={STRATEGY_LAB_SELECTOR_LABEL}>
            <p className="strategy-lab__selector-label" id="strategy-lab-selector-label">
              {STRATEGY_LAB_SELECTOR_LABEL}
            </p>
            <div className="choice-chip-group" role="radiogroup" aria-labelledby="strategy-lab-selector-label">
              {STRATEGY_LAB_SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={s.id === scenario.id}
                  className={"choice-chip" + (s.id === scenario.id ? " choice-chip--selected" : "")}
                  onClick={() => setScenarioId(s.id)}
                >
                  {/* data-label renders a hidden bold ghost so the chip keeps the
                      selected-weight width in both states — no layout shift. */}
                  <span className="choice-chip__label" data-label={s.chipLabel}>
                    {s.chipLabel}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="dash-section" aria-label={scenario.chipLabel}>
            <h2 className="dash-section__title">{scenario.subheading ?? scenario.chipLabel}</h2>
            {scenario.series ? (
              <StrategyLabChart
                dates={scenario.dates}
                series={scenario.series}
                yTicksUsd={scenario.yTicksUsd ?? STRATEGY_LAB_Y_TICKS_USD}
                title={scenario.subheading ?? scenario.chipLabel}
              />
            ) : (
              <EmptyStateCard title={scenario.chipLabel} description={STRATEGY_LAB_SCENARIO_PENDING} />
            )}
          </section>

          {scenario.breakdown && <StrategyLabBreakdown dates={scenario.dates} snapshots={scenario.breakdown} />}
        </main>

        {smithOpen && (
          <AskSmithAiPanel content={strategyLabSmithAiContent} onClose={closeAskSmithAi} pushToast={pushToast} />
        )}
      </div>
    </div>
  );
}

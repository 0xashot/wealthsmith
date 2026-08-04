/**
 * DemoPortfolioPage — Demo Mode Portfolio (sample data only, never a real
 * wallet's holdings). Mirrors the connected Portfolio structure — the Balance
 * Overview + Crypto Assets Allocation donuts, then the Asset Deployment Overview
 * section (Liquid Assets / Staked Assets / Yield Strategies) — driven by the
 * approved rich demo holdings (demoWalletPositions: $26,900 across liquid tokens,
 * LSTs, and Kamino lends), so all three earning categories are populated. The
 * suggestions rail is the SAME shared demo rail the Demo Dashboard renders.
 *
 * Non-custodial / MVP-safe: no wallet pill, no wallet adapter, no signature, no
 * transaction, no fund movement. Demo suggestions/Top Pick are sample only.
 */
import { useMemo, useRef, useState } from "react";
import { demoDashboardState as d } from "../state/demoDashboardState";
import { demoSmithAiContent } from "../state/demoSmithAi";
import { demoWalletPositions } from "../state/demoWalletPositions";
import { portfolioState as p } from "../state/portfolioState";
import {
  getLiquidPositions,
  getStakedPositions,
  getProtocolPositions,
} from "../wallet/walletSummary";
import {
  PORT_DEPLOYMENT_TITLE,
  PORT_STAKED_TITLE,
  PORT_STAKED_CAPTION,
  PORT_YIELD_TITLE,
  PORT_YIELD_CAPTION,
  PROTOCOL_OPENED_TOAST,
} from "../state/approvedCopy";
import GlobalNav from "../components/GlobalNav";
import DemoBanner from "../components/DemoBanner";
import PageHeader from "../components/PageHeader";
import PortfolioAllocationDonuts from "../components/PortfolioAllocationDonuts";
import LiquidAssetsCard from "../components/LiquidAssetsCard";
import EarningAssetsCard from "../components/EarningAssetsCard";
import ExternalHoldingsSection from "../components/ExternalHoldingsSection";
import { useManualAssets } from "../wallet/manualAssetPositions";
import RealWalletSuggestionsRail from "../components/RealWalletSuggestionsRail";
import AskSmithAiPanel from "../components/AskSmithAiPanel";
import type { SavedGoal } from "../types/goal";
import { demoSwapQuoteFetcher } from "../suggestions/swapQuote/demoSwapQuote";
import { buildDemoContributionRail } from "../suggestions/demoContributionScenario";

interface Props {
  pushToast: (message: string, helper?: string) => void;
  onExitDemo: () => void;
  onConnectWallet: () => void;
  onNavigate: (id: string) => void;
  /** The (editable) Demo sample goal — edits on the Demo Goal page recompute the rail. */
  goal: SavedGoal;
}

export default function DemoPortfolioPage({
  pushToast,
  onExitDemo,
  onConnectWallet,
  onNavigate,
  goal,
}: Props) {
  const [railMode, setRailMode] = useState<"suggestions" | "ask_smith_ai">("suggestions");
  const askButtonRef = useRef<HTMLButtonElement>(null);

  const openAskSmithAi = () => setRailMode("ask_smith_ai");
  const closeAskSmithAi = () => {
    setRailMode("suggestions");
    askButtonRef.current?.focus();
  };
  const onExternalHandoff = () => pushToast(PROTOCOL_OPENED_TOAST);

  // The SAME shared demo rail the Demo Dashboard renders, so Smith AI Suggestions
  // are identical across Demo Dashboard and Portfolio (matching connected mode,
  // where both pages share one rail). Recomputes when the sample goal is edited.
  // Manually added External Holdings (BTC/ETH): DISPLAY arrays below, plus the
  // allocation MEASUREMENT fed to the demo rail (never positions, never a source).
  const manual = useManualAssets();
  const demoContributionRail = useMemo(() => buildDemoContributionRail(goal, demoWalletPositions, manual.positions), [goal, manual.positions]);

  // Demo positions are available synchronously, but a manually added BTC/ETH
  // amount is not priced until the external feed answers — so hold the merged
  // set back until it has, rather than letting the charts jump when it lands.
  const displayPositions =
    !manual.pricesLoading && manual.positions.length > 0
      ? [...demoWalletPositions, ...manual.positions]
      : demoWalletPositions;

  const liquid = getLiquidPositions(displayPositions);
  const staked = getStakedPositions(demoWalletPositions);
  const protocol = getProtocolPositions(demoWalletPositions);

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
          activePage="portfolio"
          onNavigate={onNavigate}
          askActive={railMode === "ask_smith_ai"}
          onOpenAskSmithAi={openAskSmithAi}
        />
      </div>

      <div className="dashboard">
        <main className="dashboard__main">
          <PageHeader header={p.page_header} />
          {/* Composition donuts (Balance Overview + Crypto Assets Allocation) from
              the sample demo holdings. */}
          <PortfolioAllocationDonuts positions={displayPositions} />

          {/* Asset Deployment Overview — same category tables as the connected
              Portfolio, from the sample holdings. */}
          <section className="dash-section" aria-label={PORT_DEPLOYMENT_TITLE}>
            <h2 className="dash-section__title">{PORT_DEPLOYMENT_TITLE}</h2>
            <LiquidAssetsCard positions={liquid} />
            <EarningAssetsCard
              title={PORT_STAKED_TITLE}
              caption={PORT_STAKED_CAPTION}
              valueHeader="Value"
              positions={staked}
              onManageOpen={onExternalHandoff}
            />
            <EarningAssetsCard
              title={PORT_YIELD_TITLE}
              caption={PORT_YIELD_CAPTION}
              valueHeader="Value"
              positions={protocol}
              onManageOpen={onExternalHandoff}
            />
          </section>

          {/* External Holdings — same section as the connected Portfolio. */}
          <ExternalHoldingsSection
            amounts={manual.amounts}
            prices={manual.prices}
            onSetAmount={manual.setAmount}
            onClearAmount={manual.clearAmount}
            pushToast={pushToast}
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

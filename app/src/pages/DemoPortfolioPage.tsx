/**
 * DemoPortfolioPage — Demo Mode Portfolio (sample data only, never a real
 * wallet's holdings). Mirrors the connected Portfolio structure — the Balance
 * Overview + Crypto Assets Allocation donuts, then the Asset Deployment Overview
 * section (Liquid Assets / Staked Assets / Yield Strategies) — driven by the
 * approved demo holdings (demoWalletPositions: SOL $5,500 / BONK $1,200 /
 * USDC $800; all liquid, so the earning categories show their empty states).
 *
 * Non-custodial / MVP-safe: no wallet pill, no wallet adapter, no signature, no
 * transaction, no fund movement. Demo suggestions/Top Pick are sample only.
 */
import { useRef, useState } from "react";
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
import type { SuggestionCardState } from "../types/dashboard";
import GlobalNav from "../components/GlobalNav";
import DemoBanner from "../components/DemoBanner";
import PageHeader from "../components/PageHeader";
import PortfolioAllocationDonuts from "../components/PortfolioAllocationDonuts";
import LiquidAssetsCard from "../components/LiquidAssetsCard";
import EarningAssetsCard from "../components/EarningAssetsCard";
import SuggestionRail from "../components/SuggestionRail";
import AskSmithAiPanel from "../components/AskSmithAiPanel";

interface Props {
  pushToast: (message: string, helper?: string) => void;
  onExitDemo: () => void;
  onConnectWallet: () => void;
  onNavigate: (id: string) => void;
}

export default function DemoPortfolioPage({
  pushToast,
  onExitDemo,
  onConnectWallet,
  onNavigate,
}: Props) {
  const [railMode, setRailMode] = useState<"suggestions" | "ask_smith_ai">("suggestions");
  const askButtonRef = useRef<HTMLButtonElement>(null);

  const openAskSmithAi = () => setRailMode("ask_smith_ai");
  const closeAskSmithAi = () => {
    setRailMode("suggestions");
    askButtonRef.current?.focus();
  };
  const onExternalHandoff = () => pushToast(PROTOCOL_OPENED_TOAST);
  const onReviewSuggestion = (card: SuggestionCardState) => {
    const el = document.getElementById(`suggestion-${card.id}`);
    el?.scrollIntoView({ block: "nearest" });
  };

  const liquid = getLiquidPositions(demoWalletPositions);
  const staked = getStakedPositions(demoWalletPositions);
  const protocol = getProtocolPositions(demoWalletPositions);

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
        activePage="portfolio"
        onNavigate={onNavigate}
        onOpenAskSmithAi={openAskSmithAi}
      />

      <div className="dashboard">
        <main className="dashboard__main">
          <PageHeader header={p.page_header} />
          {/* Composition donuts (Balance Overview + Crypto Assets Allocation) from
              the sample demo holdings. */}
          <PortfolioAllocationDonuts positions={demoWalletPositions} />

          {/* Asset Deployment Overview — same category tables as the connected
              Portfolio, from the sample holdings. */}
          <section className="dash-section" aria-label={PORT_DEPLOYMENT_TITLE}>
            <h2 className="dash-section__title">{PORT_DEPLOYMENT_TITLE}</h2>
            <LiquidAssetsCard positions={liquid} />
            <EarningAssetsCard
              title={PORT_STAKED_TITLE}
              caption={PORT_STAKED_CAPTION}
              valueHeader="USD Value"
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
        </main>

        {railMode === "ask_smith_ai" ? (
          <AskSmithAiPanel content={demoSmithAiContent} onClose={closeAskSmithAi} />
        ) : (
          <SuggestionRail
            rail={d.right_rail}
            railLabel={d.accessibility.right_rail_label}
            onExternalHandoff={onExternalHandoff}
            onReview={onReviewSuggestion}
          />
        )}
      </div>
    </div>
  );
}

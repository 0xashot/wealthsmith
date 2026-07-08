/**
 * DemoPortfolioPage — Demo Mode Portfolio (sample data only, never a real
 * wallet's holdings). Reuses the same product Portfolio components as the
 * connected page — the Balance Overview + Crypto Assets Allocation donuts and a
 * Liquid Assets table — driven by the approved demo holdings (demoWalletPositions:
 * SOL $5,500 / BONK $1,200 / USDC $800).
 *
 * Non-custodial / MVP-safe: no wallet pill, no wallet adapter, no signature, no
 * transaction, no fund movement. Demo suggestions/Top Pick are sample only.
 */
import { useRef, useState } from "react";
import { demoDashboardState as d } from "../state/demoDashboardState";
import { demoSmithAiContent } from "../state/demoSmithAi";
import { demoWalletPositions } from "../state/demoWalletPositions";
import { portfolioState as p } from "../state/portfolioState";
import { getLiquidPositions } from "../wallet/walletSummary";
import { PORT_LIQUID_TITLE, PROTOCOL_OPENED_TOAST } from "../state/approvedCopy";
import type { SuggestionCardState } from "../types/dashboard";
import GlobalNav from "../components/GlobalNav";
import DemoBanner from "../components/DemoBanner";
import PageHeader from "../components/PageHeader";
import PortfolioAllocationDonuts from "../components/PortfolioAllocationDonuts";
import PositionsSection from "../components/PositionsSection";
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
          <PositionsSection
            title={PORT_LIQUID_TITLE}
            positions={liquid}
            columns={["asset", "amount", "value"]}
            emptyText=""
          />
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

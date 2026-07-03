/**
 * PortfolioPage — connected-wallet Portfolio Overview per
 * patterns/portfolio-overview.md.
 *
 * STEP 1 SCOPE: page shell + Asset Deployment Overview + Ask Smith AI panel.
 * The Liquid / Staked / Yield tables, Manage protocol links, and the persistent
 * suggestions right-rail are added in later steps.
 *
 * Ask Smith AI (per request): visible on the connected Portfolio page and opens
 * the same AskSmithAiPanel shell with Portfolio-safe, fixture-backed content
 * (state/portfolioSmithAi.ts). Explain-only — no live generation, no invented
 * insights/APY/earnings/recommendations/Top Pick/protocol, no execution.
 *
 * Read-only, non-custodial: no wallet adapter, no signatures, no transactions,
 * no fund movement. Reuses the same connected wallet state as the Dashboard
 * (same Phantom • 6fQ9 wallet) for the Global Nav pill.
 */
import { useRef, useState } from "react";
import { dashboardState as connected } from "../state/dashboardState";
import { portfolioState as p } from "../state/portfolioState";
import { portfolioSmithAiContent } from "../state/portfolioSmithAi";
import { TOAST_ADDRESS_COPIED, TOAST_COPY_FAILED } from "../state/approvedCopy";
import GlobalNav from "../components/GlobalNav";
import PageHeader from "../components/PageHeader";
import DeploymentOverview from "../components/DeploymentOverview";
import LiquidAssetsSection from "../components/LiquidAssetsSection";
import AskSmithAiPanel from "../components/AskSmithAiPanel";

type RightZoneMode = "none" | "ask_smith_ai";

interface Props {
  pushToast: (message: string, helper?: string) => void;
  onNavigate: (id: string) => void;
  onDisconnect: () => void;
}

export default function PortfolioPage({ pushToast, onNavigate, onDisconnect }: Props) {
  const [rightZone, setRightZone] = useState<RightZoneMode>("none");
  const askButtonRef = useRef<HTMLButtonElement>(null);

  const onCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(connected.wallet.address);
      pushToast(TOAST_ADDRESS_COPIED);
    } catch {
      pushToast(TOAST_COPY_FAILED);
    }
  };

  // Same approved disconnect toast as the Dashboard, then hand off to App
  // (which returns to the disconnected Dashboard). No funds move, no signature.
  const disconnect = () => {
    pushToast(
      connected.transitions.disconnect_wallet.copy.toast,
      connected.transitions.disconnect_wallet.copy.helper
    );
    onDisconnect();
  };

  const openAskSmithAi = () => setRightZone("ask_smith_ai");
  const closeAskSmithAi = () => {
    setRightZone("none");
    askButtonRef.current?.focus();
  };

  const smithOpen = rightZone === "ask_smith_ai";

  return (
    <div className="app-shell">
      <GlobalNav
        mode="connected"
        nav={connected.global_nav}
        wallet={connected.wallet}
        navLabel={connected.accessibility.global_nav_label}
        walletPillLabel={connected.accessibility.wallet_pill_label}
        askSmithAiLabel={connected.global_nav.right_actions.ask_smith_ai.accessibility_label}
        askAvailable={true}
        askButtonRef={askButtonRef}
        activePage="portfolio"
        onNavigate={onNavigate}
        onCopyAddress={onCopyAddress}
        onDisconnect={disconnect}
        onOpenAskSmithAi={openAskSmithAi}
      />

      {/* two-column when the Smith AI panel is open; single-column otherwise
          (no persistent suggestions rail yet) */}
      <div className={"dashboard" + (smithOpen ? "" : " dashboard--single")}>
        <main className="dashboard__main">
          <PageHeader header={p.page_header} />
          <DeploymentOverview
            title={p.deployment.title}
            totalValueUsd={p.total_value_usd}
            segments={p.deployment.segments}
          />
          <LiquidAssetsSection section={p.liquid} />
          {/* Next step: Staked / Yield tables + Manage links. */}
        </main>

        {smithOpen && (
          <AskSmithAiPanel content={portfolioSmithAiContent} onClose={closeAskSmithAi} />
        )}
      </div>
    </div>
  );
}

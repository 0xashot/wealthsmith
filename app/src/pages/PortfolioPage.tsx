/**
 * PortfolioPage — REAL connected-wallet Portfolio Overview per
 * patterns/portfolio-overview.md.
 *
 * Because a real wallet is connected, the page shows the LIVE, read-only wallet
 * assets as its primary content. The fixture Asset Deployment Overview / Liquid /
 * Staked / Yield sections are NOT rendered here — they would present sample
 * balances, APY, and Manage handoffs as the connected wallet's real positions,
 * which the product rule forbids. Those fixtures remain in Demo Mode and the
 * portfolio example fixtures (dev/tests). See patterns/portfolio-overview.md
 * (Real Connected Wallet Mode) and rules/financial-logic-boundaries.md.
 *
 * Manage / review-only protocol handoffs are hidden here because there are no
 * detected live protocol positions to manage yet.
 *
 * Ask Smith AI is available with REAL-WALLET-SAFE explainer content
 * (realWalletSmithAi.ts) — it explains the read-only connection only and never
 * presents fixture portfolio positions as the user's real holdings.
 *
 * Read-only, non-custodial: no signatures, no transactions, no fund movement.
 */
import { useRef, useState } from "react";
import { portfolioState as p } from "../state/portfolioState";
import { realWalletSmithAiContent } from "../state/realWalletSmithAi";
import {
  ASK_SMITH_LABEL_PORTFOLIO,
  REAL_WALLET_SUGGESTIONS_TITLE,
  STRATEGY_STEPS_COMING,
} from "../state/approvedCopy";
import { dashboardState as connected } from "../state/dashboardState";
import GlobalNav from "../components/GlobalNav";
import PageHeader from "../components/PageHeader";
import RealWalletPortfolio from "../components/RealWalletPortfolio";
import EmptyStateCard from "../components/EmptyStateCard";
import AskSmithAiPanel from "../components/AskSmithAiPanel";

interface Props {
  pushToast: (message: string, helper?: string) => void;
  onNavigate: (id: string) => void;
  onDisconnect: () => void;
  onCopyAddress: (address: string) => void;
}

export default function PortfolioPage({
  onNavigate,
  onDisconnect,
  onCopyAddress,
}: Props) {
  const [smithOpen, setSmithOpen] = useState(false);
  const askButtonRef = useRef<HTMLButtonElement>(null);

  const openAskSmithAi = () => setSmithOpen(true);
  const closeAskSmithAi = () => {
    setSmithOpen(false);
    askButtonRef.current?.focus();
  };

  return (
    <div className="app-shell">
      <GlobalNav
        mode="connected"
        nav={connected.global_nav}
        wallet={connected.wallet}
        navLabel={connected.accessibility.global_nav_label}
        walletPillLabel={connected.accessibility.wallet_pill_label}
        askSmithAiLabel={ASK_SMITH_LABEL_PORTFOLIO}
        askAvailable={true}
        askButtonRef={askButtonRef}
        activePage="portfolio"
        onNavigate={onNavigate}
        onCopyAddress={onCopyAddress}
        onDisconnect={onDisconnect}
        onOpenAskSmithAi={openAskSmithAi}
      />

      {/* Two-column: portfolio main + right rail. The rail shows the Ask Smith AI
          panel when open, otherwise the Smith AI Suggestions card — the same
          placement as the Dashboard. */}
      <div className="dashboard">
        <main className="dashboard__main">
          <PageHeader header={p.page_header} />
          {/* Real-wallet Portfolio: the product Portfolio layout (Balance
              Overview, Crypto Assets Allocation, Deployment, Liquid, Staked, Yield)
              populated from live read-only positions, plus the detailed detected-
              assets table. No fixture values. */}
          <RealWalletPortfolio />
        </main>

        {smithOpen ? (
          <AskSmithAiPanel content={realWalletSmithAiContent} onClose={closeAskSmithAi} />
        ) : (
          <aside className="suggestion-rail" aria-label={connected.accessibility.right_rail_label}>
            {/* Strategy Steps / Suggestion Engine has no live inputs yet — safe
                coming-soon state, never fixture suggestions or Top Pick as the
                user's. Same right-rail structure as the Dashboard. */}
            <EmptyStateCard
              title={REAL_WALLET_SUGGESTIONS_TITLE}
              description={STRATEGY_STEPS_COMING}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

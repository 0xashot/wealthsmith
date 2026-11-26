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
import { useMemo, useRef, useState } from "react";
import { portfolioState as p } from "../state/portfolioState";
import { buildRealWalletSmithAiContent } from "../state/realWalletSmithAi";
import { SWAP_CONFIRM_EXPIRED_TOAST } from "../state/approvedCopy";
import { ASK_SMITH_LABEL_PORTFOLIO } from "../state/approvedCopy";
import { dashboardState as connected } from "../state/dashboardState";
import type { SavedGoal } from "../types/goal";
import GlobalNav from "../components/GlobalNav";
import PageHeader from "../components/PageHeader";
import RealWalletPortfolio from "../components/RealWalletPortfolio";
import RealWalletSuggestionsRail from "../components/RealWalletSuggestionsRail";
import type { RailSuggestions } from "../suggestions/useRailSuggestions";
import AskSmithAiPanel from "../components/AskSmithAiPanel";
import { requestWalletPortfolioRefresh } from "../wallet/useWalletPortfolio";

interface Props {
  pushToast: (message: string, helper?: string) => void;
  onNavigate: (id: string) => void;
  onDisconnect: () => void;
  /** Opens the Connect Wallet dialog — used by a swap review with no wallet to reconnect to. */
  onConnectWallet?: () => void;
  /** Saved plan — drives the same real-wallet Suggestion Engine rail as Dashboard. */
  savedGoal?: SavedGoal;
}

export default function PortfolioPage({
  pushToast,
  onNavigate,
  onDisconnect,
  onConnectWallet,
  savedGoal,
}: Props) {
  const [smithOpen, setSmithOpen] = useState(false);
  // Engine suggestions lifted from RealWalletPortfolio (which owns the single
  // Portfolio wallet read) — same shared rail the Dashboard uses.
  const [rail, setRail] = useState<RailSuggestions | null>(null);
  // Ask Smith AI explains the SAME engine output the rail renders, so the panel can
  // never describe a Top Pick that is not there, nor offer "why is there nothing yet"
  // questions once there is.
  const smithAiContent = useMemo(() => buildRealWalletSmithAiContent(rail?.cards), [rail]);
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
        onDisconnect={onDisconnect}
        onRefreshPortfolio={requestWalletPortfolioRefresh}
        askActive={smithOpen}
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
          <RealWalletPortfolio
            pushToast={pushToast}
            goal={savedGoal}
            onSuggestions={setRail}
          />
        </main>

        {smithOpen ? (
          <AskSmithAiPanel
            content={smithAiContent}
            onClose={closeAskSmithAi}
            pushToast={pushToast}
          />
        ) : (
          // Same shared real-wallet Suggestion Engine rail as the Dashboard.
          <RealWalletSuggestionsRail
            rail={rail}
            railLabel={connected.accessibility.right_rail_label}
            onSwapQuoteGaveUp={() =>
              pushToast(SWAP_CONFIRM_EXPIRED_TOAST)
            }
            onConnectWallet={onConnectWallet}
          />
        )}
      </div>
    </div>
  );
}

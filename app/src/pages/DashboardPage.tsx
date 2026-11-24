/**
 * DashboardPage — Dashboard for the REAL connected-wallet and disconnected modes
 * (patterns/dashboard-layout.md; App owns the mode and the shared ToastHost).
 *
 * Real connected wallet mode (`connected`) shows LIVE, read-only wallet facts and
 * safe "unavailable" states — NOT the connected-wallet fixture. Per the product
 * rule, fixture Portfolio Value ($15,500), Safety Buffer, Projected Growth,
 * Allocation, Top Pick, and suggestions must never be presented as the connected
 * wallet's real data (rules/financial-logic-boundaries.md). Those fixtures live
 * on only in Demo Mode and the example reference fixture (dev/tests). The Dashboard
 * body (DashboardBody, shared with the disconnected + onboarding views) renders the
 * four cards from live wallet reads; the full live asset table lives on Portfolio.
 *
 * Ask Smith AI is available in real-wallet mode with REAL-WALLET-SAFE content
 * (realWalletSmithAi.ts): it only explains the read-only connection and why some
 * values aren't shown yet — it never presents fixture Top Pick / suggestions as
 * the user's real data.
 *
 * - Disconnecting clears wallet-dependent data from view per
 *   rules/wallet-and-custody-rules.md (goal-settings values persist; no copy
 *   implies funds moved).
 */
import { useMemo, useRef, useState } from "react";
import { dashboardState as s } from "../state/dashboardState";
import { buildRealWalletSmithAiContent } from "../state/realWalletSmithAi";
import {
  CONNECT_WALLET_LABEL,
  SUGGESTIONS_EMPTY_DESCRIPTION,
  SUGGESTIONS_EMPTY_TITLE,
} from "../state/approvedCopy";
import type { SavedGoal } from "../types/goal";
import GlobalNav from "../components/GlobalNav";
import PageHeader from "../components/PageHeader";
import DashboardBody from "../components/DashboardBody";
import RealWalletSuggestionsRail from "../components/RealWalletSuggestionsRail";
import { SWAP_CONFIRM_EXPIRED_TOAST, SWAP_CONFIRM_EXPIRED_TOAST_HELPER } from "../state/approvedCopy";
import type { RailSuggestions } from "../suggestions/useRailSuggestions";
import { requestWalletPortfolioRefresh } from "../wallet/useWalletPortfolio";
import AskSmithAiPanel from "../components/AskSmithAiPanel";
import EmptyStateCard from "../components/EmptyStateCard";

type RightRailMode = "suggestions" | "ask_smith_ai";

interface Props {
  mode: "connected" | "disconnected";
  pushToast: (message: string, helper?: string) => void;
  onDisconnect: () => void;
  onConnectWallet: () => void;
  onTryDemo: () => void;
  /** connected only: in-app page switch + active page (undefined disables nav) */
  activePage?: string;
  onNavigate?: (id: string) => void;
  /** Saved plan (onboarding/Goal Settings) — Safety Buffer + Projected Growth. */
  goal?: SavedGoal;
}

export default function DashboardPage({
  mode,
  onDisconnect,
  onConnectWallet,
  onTryDemo,
  activePage,
  onNavigate,
  goal,
  pushToast,
}: Props) {
  const connected = mode === "connected";
  const [railMode, setRailMode] = useState<RightRailMode>("suggestions");
  // Real-wallet Suggestion Engine output, lifted from DashboardBody (which owns
  // the single wallet read). The rail RENDERS this; it never runs the engine.
  const [rail, setRail] = useState<RailSuggestions | null>(null);
  // Ask Smith AI explains the SAME engine output the rail renders, so the panel can
  // never describe a Top Pick that is not there, nor offer "why is there nothing yet"
  // questions once there is.
  const smithAiContent = useMemo(() => buildRealWalletSmithAiContent(rail?.cards), [rail]);
  const askButtonRef = useRef<HTMLButtonElement>(null);

  const openAskSmithAi = () => setRailMode("ask_smith_ai");
  const closeAskSmithAi = () => {
    setRailMode("suggestions");
    askButtonRef.current?.focus();
  };


  // The disconnect toast + return-to-Dashboard is owned by App (fires once for
  // menu and extension-side disconnects). No funds move, no signature; saved goal
  // settings persist.
  const disconnect = () => onDisconnect();

  // Opens the Connect Wallet modal (App owns it).
  const connectWallet = () => onConnectWallet();

  return (
    <div className="app-shell">
      <GlobalNav
        mode={mode}
        nav={s.global_nav}
        wallet={s.wallet}
        navLabel={s.accessibility.global_nav_label}
        walletPillLabel={s.accessibility.wallet_pill_label}
        askSmithAiLabel={s.global_nav.right_actions.ask_smith_ai.accessibility_label}
        // Available in real-wallet mode with real-wallet-safe explainer content.
        askAvailable={connected}
        askButtonRef={askButtonRef}
        activePage={activePage}
        onNavigate={onNavigate}
        onDisconnect={disconnect}
        onRefreshPortfolio={connected ? requestWalletPortfolioRefresh : undefined}
        onConnectWallet={connectWallet}
        onTryDemo={onTryDemo}
        askActive={railMode === "ask_smith_ai"}
        onOpenAskSmithAi={openAskSmithAi}
      />

      <div className="dashboard">
        <main className="dashboard__main">
          <PageHeader header={{ ...s.page_header, description: undefined }} />
          {/* One shared Dashboard body across connected + disconnected: the same
              four cards, populated from live data where available, else safe
              unavailable states. No wallet-connected / connect-wallet card here —
              the Connect Wallet CTA lives in the nav. */}
          <DashboardBody goal={goal} onSuggestions={connected ? setRail : undefined} />
        </main>

        {connected && railMode === "ask_smith_ai" ? (
          <AskSmithAiPanel
            content={smithAiContent}
            onClose={closeAskSmithAi}
            pushToast={pushToast}
          />
        ) : connected ? (
          // Deterministic engine output via the SAME shared rail the Portfolio
          // uses (loading / available / unavailable). Never demo fixtures.
          <RealWalletSuggestionsRail
            rail={rail}
            railLabel={s.accessibility.right_rail_label}
            onSwapQuoteGaveUp={() =>
              pushToast(SWAP_CONFIRM_EXPIRED_TOAST, SWAP_CONFIRM_EXPIRED_TOAST_HELPER)
            }
          />
        ) : (
          <aside className="suggestion-rail" aria-label={s.accessibility.right_rail_label}>
            <EmptyStateCard
              title={SUGGESTIONS_EMPTY_TITLE}
              description={SUGGESTIONS_EMPTY_DESCRIPTION}
              actionLabel={CONNECT_WALLET_LABEL}
              onAction={connectWallet}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

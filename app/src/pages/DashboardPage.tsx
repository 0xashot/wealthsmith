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
import { useRef, useState } from "react";
import { dashboardState as s } from "../state/dashboardState";
import { realWalletSmithAiContent } from "../state/realWalletSmithAi";
import {
  CONNECT_WALLET_LABEL,
  SUGGESTIONS_EMPTY_DESCRIPTION,
  SUGGESTIONS_EMPTY_TITLE,
  REAL_WALLET_SUGGESTIONS_TITLE,
  SUGGESTIONS_RAIL_DESC,
  SUGGESTIONS_LOADING,
  SUGGESTIONS_UNAVAILABLE,
} from "../state/approvedCopy";
import type { SavedGoal } from "../types/goal";
import type { RightRailState, SuggestionCardState } from "../types/dashboard";
import GlobalNav from "../components/GlobalNav";
import PageHeader from "../components/PageHeader";
import DashboardBody, { type RailSuggestions } from "../components/DashboardBody";
import SuggestionRail from "../components/SuggestionRail";
import AskSmithAiPanel from "../components/AskSmithAiPanel";
import EmptyStateCard from "../components/EmptyStateCard";

type RightRailMode = "suggestions" | "ask_smith_ai";

interface Props {
  mode: "connected" | "disconnected";
  pushToast: (message: string, helper?: string) => void;
  onDisconnect: () => void;
  onConnectWallet: () => void;
  onTryDemo: () => void;
  onCopyAddress: (address: string) => void;
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
  onCopyAddress,
  activePage,
  onNavigate,
  goal,
}: Props) {
  const connected = mode === "connected";
  const [railMode, setRailMode] = useState<RightRailMode>("suggestions");
  // Real-wallet Suggestion Engine output, lifted from DashboardBody (which owns
  // the single wallet read). The rail RENDERS this; it never runs the engine.
  const [rail, setRail] = useState<RailSuggestions | null>(null);
  const askButtonRef = useRef<HTMLButtonElement>(null);

  const openAskSmithAi = () => setRailMode("ask_smith_ai");
  const closeAskSmithAi = () => {
    setRailMode("suggestions");
    askButtonRef.current?.focus();
  };

  // "Review" on a real-wallet suggestion is read-only: scroll to the related
  // Dashboard section. No execution, no signature, no completion, no Top Pick
  // change (only Safety Buffer has an anchored section today).
  const onReviewSuggestion = (card: SuggestionCardState) => {
    if (card.category === "safety_buffer") {
      const el = document.getElementById("safety-buffer");
      el?.scrollIntoView({ block: "nearest" });
      el?.focus?.();
    }
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
        onCopyAddress={onCopyAddress}
        onDisconnect={disconnect}
        onConnectWallet={connectWallet}
        onTryDemo={onTryDemo}
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
          <AskSmithAiPanel content={realWalletSmithAiContent} onClose={closeAskSmithAi} />
        ) : connected && rail?.loading ? (
          // Wallet read in progress — neutral pending, not the unavailable copy.
          <aside className="suggestion-rail" aria-label={s.accessibility.right_rail_label}>
            <EmptyStateCard title={REAL_WALLET_SUGGESTIONS_TITLE} description={SUGGESTIONS_LOADING} />
          </aside>
        ) : connected && rail && rail.available ? (
          // Deterministic engine output, rendered in ENGINE ORDER (no re-sort,
          // no Top Pick reselection here). Never demo fixtures.
          <SuggestionRail
            rail={
              {
                title: REAL_WALLET_SUGGESTIONS_TITLE,
                description: SUGGESTIONS_RAIL_DESC,
                state: { status: "active" },
                summary: {
                  suggestions_count: rail.cards.length,
                  top_pick_id: rail.cards.find((c) => c.is_top_pick)?.id ?? "",
                },
                cards: rail.cards,
              } satisfies RightRailState
            }
            railLabel={s.accessibility.right_rail_label}
            notice={rail.notice}
            onReview={onReviewSuggestion}
          />
        ) : connected ? (
          // Connected but required inputs missing (no priced value / goal data).
          <aside className="suggestion-rail" aria-label={s.accessibility.right_rail_label}>
            <EmptyStateCard
              title={REAL_WALLET_SUGGESTIONS_TITLE}
              description={SUGGESTIONS_UNAVAILABLE}
            />
          </aside>
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

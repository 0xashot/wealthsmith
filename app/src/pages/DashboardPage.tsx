/**
 * DashboardPage — connected-wallet Dashboard per patterns/dashboard-layout.md.
 *
 * Handles the `connected` and `disconnected` app modes (App owns the mode and
 * the shared ToastHost). Behavior is unchanged from the QA'd connected slice;
 * the only structural change is that connected/disconnected and toasts are now
 * controlled by App instead of local state, and the disconnected state now
 * offers Try Demo Mode.
 *
 * - Disconnecting clears wallet-dependent data from view per
 *   rules/wallet-and-custody-rules.md (goal-settings values persist; no copy
 *   implies funds moved). Connect Wallet restores the synthetic fixture
 *   session — a slice-only stub; no wallet adapter exists.
 * - External protocol handoff: navigation happens on the card's own anchor;
 *   the handler only shows the approved toast. No transaction, signature,
 *   completion, or suggestion state change.
 */
import { useRef, useState } from "react";
import { dashboardState as s } from "../state/dashboardState";
import { connectedSmithAiContent } from "../state/connectedSmithAi";
import type { SuggestionCardState } from "../types/dashboard";
import {
  ALLOCATION_EMPTY,
  CONNECT_WALLET_LABEL,
  DISCONNECTED_DESCRIPTION,
  DISCONNECTED_HELPER,
  DISCONNECTED_TITLE,
  GROWTH_EMPTY,
  METRIC_NOT_AVAILABLE,
  METRIC_UNAVAILABLE,
  SUGGESTIONS_EMPTY_DESCRIPTION,
  SUGGESTIONS_EMPTY_TITLE,
  TOAST_ADDRESS_COPIED,
  TOAST_COPY_FAILED,
} from "../state/approvedCopy";
import GlobalNav from "../components/GlobalNav";
import PageHeader from "../components/PageHeader";
import AlertBanner from "../components/AlertBanner";
import FinancialSnapshot from "../components/FinancialSnapshot";
import SafetyBufferCard from "../components/SafetyBufferCard";
import ProjectedGrowthChart from "../components/ProjectedGrowthChart";
import AllocationChart from "../components/AllocationChart";
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
}

export default function DashboardPage({
  mode,
  pushToast,
  onDisconnect,
  onConnectWallet,
  onTryDemo,
}: Props) {
  const connected = mode === "connected";
  const [railMode, setRailMode] = useState<RightRailMode>("suggestions");
  const askButtonRef = useRef<HTMLButtonElement>(null);

  const onCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(s.wallet.address);
      pushToast(TOAST_ADDRESS_COPIED);
    } catch {
      pushToast(TOAST_COPY_FAILED);
    }
  };

  // Clears wallet-dependent view state. No funds move, no signature is
  // requested; saved goal settings persist (rules/wallet-and-custody-rules.md).
  const disconnect = () => {
    setRailMode("suggestions");
    pushToast(
      s.transitions.disconnect_wallet.copy.toast,
      s.transitions.disconnect_wallet.copy.helper
    );
    onDisconnect();
  };

  // Slice-only stub: restores the synthetic fixture session.
  const connectWallet = () => {
    pushToast(s.wallet.copy.connected_toast);
    onConnectWallet();
  };

  // Navigation is handled by the card's anchor (new tab, noopener noreferrer).
  // This handler only shows the approved non-execution toast.
  const onExternalHandoff = () => {
    pushToast(s.transitions.open_protocol_handoff.copy.toast);
  };

  // "Review" on the buffer Top Pick: move to its on-dashboard detail area,
  // read-only. No execution/signature/completion/Top Pick change.
  const onReviewSuggestion = (card: SuggestionCardState) => {
    const targetId =
      card.category === "safety_buffer" ? "safety-buffer" : `suggestion-${card.id}`;
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ block: "nearest" });
      (el as HTMLElement).focus();
    }
  };

  const openAskSmithAi = () => setRailMode("ask_smith_ai");
  const closeAskSmithAi = () => {
    setRailMode("suggestions");
    askButtonRef.current?.focus();
  };

  // Disconnected snapshot: wallet-derived metric becomes unavailable
  // (approved metric-card fallback); goal-settings metrics persist.
  const disconnectedMetrics = s.financial_snapshot.metrics.map((m) =>
    m.source === "connected_wallet_fixture"
      ? { ...m, value: METRIC_NOT_AVAILABLE, note: METRIC_UNAVAILABLE }
      : m
  );

  return (
    <div className="app-shell">
      <GlobalNav
        mode={mode}
        nav={s.global_nav}
        wallet={s.wallet}
        navLabel={s.accessibility.global_nav_label}
        walletPillLabel={s.accessibility.wallet_pill_label}
        askSmithAiLabel={s.global_nav.right_actions.ask_smith_ai.accessibility_label}
        askAvailable={s.smith_ai.available}
        askButtonRef={askButtonRef}
        onCopyAddress={onCopyAddress}
        onDisconnect={disconnect}
        onConnectWallet={connectWallet}
        onTryDemo={onTryDemo}
        onOpenAskSmithAi={openAskSmithAi}
      />

      <div className="dashboard">
        <main className="dashboard__main">
          <PageHeader header={s.page_header} />

          {connected ? (
            <>
              <AlertBanner alert={s.dashboard_alert} />
              <FinancialSnapshot
                title={s.financial_snapshot.title}
                metrics={s.financial_snapshot.metrics}
              />
              <SafetyBufferCard buffer={s.safety_buffer} />
              <ProjectedGrowthChart growth={s.projected_growth} />
              <AllocationChart allocation={s.allocation} />
            </>
          ) : (
            <>
              <EmptyStateCard
                title={DISCONNECTED_TITLE}
                description={DISCONNECTED_DESCRIPTION}
                helper={DISCONNECTED_HELPER}
                actionLabel={CONNECT_WALLET_LABEL}
                onAction={connectWallet}
              />
              <FinancialSnapshot
                title={s.financial_snapshot.title}
                metrics={disconnectedMetrics}
              />
              <EmptyStateCard title={s.safety_buffer.title} description={METRIC_UNAVAILABLE} />
              <EmptyStateCard title={s.projected_growth.title} description={GROWTH_EMPTY} />
              <EmptyStateCard title={s.allocation.title} description={ALLOCATION_EMPTY} />
            </>
          )}
        </main>

        {!connected ? (
          <aside className="suggestion-rail" aria-label={s.accessibility.right_rail_label}>
            <EmptyStateCard
              title={SUGGESTIONS_EMPTY_TITLE}
              description={SUGGESTIONS_EMPTY_DESCRIPTION}
              actionLabel={CONNECT_WALLET_LABEL}
              onAction={connectWallet}
            />
          </aside>
        ) : railMode === "ask_smith_ai" ? (
          <AskSmithAiPanel content={connectedSmithAiContent} onClose={closeAskSmithAi} />
        ) : (
          <SuggestionRail
            rail={s.right_rail}
            railLabel={s.accessibility.right_rail_label}
            onExternalHandoff={onExternalHandoff}
            onReview={onReviewSuggestion}
          />
        )}
      </div>
    </div>
  );
}

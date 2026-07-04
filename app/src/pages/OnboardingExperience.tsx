/**
 * OnboardingExperience — the onboarding surface per patterns/onboarding-with-smith-ai.md
 * and patterns/dashboard-layout.md (Mode 2 / Variant 1: Onboarding Active, No
 * Wallet Connected).
 *
 * STEP 1 SCOPE: the disconnected onboarding shell only.
 *   Left  = the starter/empty Dashboard preview (same empty states as the
 *           disconnected Dashboard — no fake values).
 *   Right = the onboarding panel (welcome + wallet/demo entry).
 * The goal-setup steps, review, finish, and the connected-but-incomplete
 * (Variant 4) flow are added in later steps.
 *
 * Non-custodial / MVP-safe: no wallet adapter, no signatures, no transactions,
 * no fund movement, no live data, no live AI, no invented values. Connect Wallet
 * opens the existing modal (App-owned); Try Demo Mode enters existing Demo Mode.
 * Per the Onboarding Visibility Rule this must NOT recalculate suggestions, Top
 * Pick, Safety Buffer, projections, allocation, or protocol decisions.
 */
import { dashboardState as s } from "../state/dashboardState";
import {
  ALLOCATION_EMPTY,
  CONNECT_WALLET_LABEL,
  DISCONNECTED_DESCRIPTION,
  DISCONNECTED_HELPER,
  DISCONNECTED_TITLE,
  GROWTH_EMPTY,
  METRIC_NOT_AVAILABLE,
  METRIC_UNAVAILABLE,
} from "../state/approvedCopy";
import GlobalNav from "../components/GlobalNav";
import PageHeader from "../components/PageHeader";
import EmptyStateCard from "../components/EmptyStateCard";
import FinancialSnapshot from "../components/FinancialSnapshot";
import OnboardingPanel from "../components/OnboardingPanel";

interface Props {
  onConnectWallet: () => void;
  onTryDemo: () => void;
}

export default function OnboardingExperience({ onConnectWallet, onTryDemo }: Props) {
  // Wallet-derived metrics are unavailable while disconnected (approved
  // metric-card fallback); no fake values are shown. Mirrors the disconnected
  // Dashboard exactly so the preview stays faithful.
  const disconnectedMetrics = s.financial_snapshot.metrics.map((m) =>
    m.source === "connected_wallet_fixture"
      ? { ...m, value: METRIC_NOT_AVAILABLE, note: METRIC_UNAVAILABLE }
      : m
  );

  return (
    <div className="app-shell">
      <GlobalNav
        mode="disconnected"
        nav={s.global_nav}
        navLabel={s.accessibility.global_nav_label}
        askSmithAiLabel={s.global_nav.right_actions.ask_smith_ai.accessibility_label}
        askAvailable={false}
        onConnectWallet={onConnectWallet}
        onTryDemo={onTryDemo}
      />

      <div className="dashboard">
        <main className="dashboard__main">
          <PageHeader header={s.page_header} />
          <EmptyStateCard
            title={DISCONNECTED_TITLE}
            description={DISCONNECTED_DESCRIPTION}
            helper={DISCONNECTED_HELPER}
            actionLabel={CONNECT_WALLET_LABEL}
            onAction={onConnectWallet}
          />
          <FinancialSnapshot
            title={s.financial_snapshot.title}
            metrics={disconnectedMetrics}
          />
          <EmptyStateCard title={s.safety_buffer.title} description={METRIC_UNAVAILABLE} />
          <EmptyStateCard title={s.projected_growth.title} description={GROWTH_EMPTY} />
          <EmptyStateCard title={s.allocation.title} description={ALLOCATION_EMPTY} />
        </main>

        <OnboardingPanel onConnectWallet={onConnectWallet} onTryDemo={onTryDemo} />
      </div>
    </div>
  );
}

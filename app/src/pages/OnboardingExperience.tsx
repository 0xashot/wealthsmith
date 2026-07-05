/**
 * OnboardingExperience — the onboarding surface per patterns/onboarding-with-smith-ai.md
 * and patterns/dashboard-layout.md.
 *
 *  - Variant 1 (disconnected): welcome/entry, nav shows Connect Wallet + Try
 *    Demo Mode, no wallet pill.
 *  - Variant 4 (connected + goal incomplete): wallet pill shown, Connect Wallet /
 *    Try Demo Mode hidden, goal-setup steps in the panel.
 *
 * In both variants Portfolio / Goal / Support are disabled in the Global Nav and
 * the global Ask Smith AI button is hidden — the onboarding companion is the only
 * Smith surface. The left column stays the starter/empty Dashboard preview (no
 * fake values, no normal connected Dashboard content while onboarding is active).
 *
 * Non-custodial / MVP-safe: no wallet adapter, no signatures, no transactions,
 * no fund movement, no live data, no live AI, no invented values. Per the
 * Onboarding Visibility Rule this must NOT recalculate suggestions, Top Pick,
 * Safety Buffer, projections, allocation, or protocol decisions.
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
import type { SavedGoal } from "../types/goal";

interface Props {
  mode: "disconnected" | "connected";
  onConnectWallet: () => void;
  onTryDemo: () => void;
  /** Connected phase: wallet menu actions. */
  onCopyAddress: () => void;
  onDisconnect: () => void;
  /** Finish Setup: commit answers + complete onboarding (connected phase). */
  onComplete: (savedGoal: SavedGoal) => void;
}

export default function OnboardingExperience({
  mode,
  onConnectWallet,
  onTryDemo,
  onCopyAddress,
  onDisconnect,
  onComplete,
}: Props) {
  const connected = mode === "connected";

  // Wallet-derived metrics are unavailable while onboarding (approved fallback);
  // no fake values are shown. Mirrors the disconnected Dashboard preview.
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
        wallet={connected ? s.wallet : undefined}
        navLabel={s.accessibility.global_nav_label}
        walletPillLabel={connected ? s.accessibility.wallet_pill_label : undefined}
        askSmithAiLabel={s.global_nav.right_actions.ask_smith_ai.accessibility_label}
        askAvailable={false}
        activePage="dashboard"
        onboardingActive
        onConnectWallet={onConnectWallet}
        onTryDemo={onTryDemo}
        onCopyAddress={onCopyAddress}
        onDisconnect={onDisconnect}
      />

      <div className="dashboard">
        <main className="dashboard__main">
          <PageHeader header={s.page_header} />
          <EmptyStateCard
            title={DISCONNECTED_TITLE}
            description={DISCONNECTED_DESCRIPTION}
            helper={DISCONNECTED_HELPER}
            actionLabel={connected ? undefined : CONNECT_WALLET_LABEL}
            onAction={connected ? undefined : onConnectWallet}
          />
          <FinancialSnapshot
            title={s.financial_snapshot.title}
            metrics={disconnectedMetrics}
          />
          <EmptyStateCard title={s.safety_buffer.title} description={METRIC_UNAVAILABLE} />
          <EmptyStateCard title={s.projected_growth.title} description={GROWTH_EMPTY} />
          <EmptyStateCard title={s.allocation.title} description={ALLOCATION_EMPTY} />
        </main>

        <OnboardingPanel
          mode={mode}
          onConnectWallet={onConnectWallet}
          onTryDemo={onTryDemo}
          onComplete={onComplete}
        />
      </div>
    </div>
  );
}

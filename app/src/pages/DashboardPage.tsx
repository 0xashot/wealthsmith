/**
 * DashboardPage — connected-wallet Dashboard per patterns/dashboard-layout.md.
 *
 * Layout Mode 1: Global Nav on top, left content (title, alert, Financial
 * Snapshot, Safety Buffer, Projected Growth, Allocation), right rail with
 * Smith AI Suggestions. One right-zone mode at a time (suggestions).
 *
 * All data comes from the connected-wallet fixture via dashboardState.
 */
import { dashboardState as s } from "../state/dashboardState";
import GlobalNav from "../components/GlobalNav";
import PageHeader from "../components/PageHeader";
import AlertBanner from "../components/AlertBanner";
import FinancialSnapshot from "../components/FinancialSnapshot";
import SafetyBufferCard from "../components/SafetyBufferCard";
import ProjectedGrowthChart from "../components/ProjectedGrowthChart";
import AllocationChart from "../components/AllocationChart";
import SuggestionRail from "../components/SuggestionRail";

export default function DashboardPage() {
  return (
    <div className="app-shell">
      <GlobalNav
        nav={s.global_nav}
        wallet={s.wallet}
        navLabel={s.accessibility.global_nav_label}
        walletPillLabel={s.accessibility.wallet_pill_label}
        askSmithAiLabel={s.global_nav.right_actions.ask_smith_ai.accessibility_label}
      />

      <div className="dashboard">
        <main className="dashboard__main">
          <PageHeader header={s.page_header} />
          <AlertBanner alert={s.dashboard_alert} />
          <FinancialSnapshot
            title={s.financial_snapshot.title}
            metrics={s.financial_snapshot.metrics}
          />
          <SafetyBufferCard buffer={s.safety_buffer} />
          <ProjectedGrowthChart growth={s.projected_growth} />
          <AllocationChart allocation={s.allocation} />
        </main>

        <SuggestionRail
          rail={s.right_rail}
          railLabel={s.accessibility.right_rail_label}
        />
      </div>
    </div>
  );
}

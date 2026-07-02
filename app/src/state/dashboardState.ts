/**
 * Loads the connected-wallet Dashboard reference fixture.
 *
 * Source of truth: examples/dashboard/dashboard-connected-wallet-state.json
 * (read-only import — the examples/ folder is never modified).
 *
 * In production this state would come from wallet data, product logic,
 * Suggestion Engine, Top Pick Logic, and Protocol Logic. The UI layer only
 * renders it; nothing here computes or invents values.
 */
import fixture from "../../../examples/dashboard/dashboard-connected-wallet-state.json";
import type { DashboardPageState } from "../types/dashboard";

const f = fixture as any;

export const dashboardState: DashboardPageState = {
  global_nav: f.global_nav,
  wallet: f.wallet,
  page_header: f.page_header,
  financial_snapshot: f.main_content.financial_snapshot,
  safety_buffer: f.main_content.safety_buffer,
  projected_growth: f.main_content.projected_growth,
  allocation: f.main_content.current_vs_recommended_allocation,
  dashboard_alert: f.dashboard_alert,
  right_rail: f.right_rail,
  smith_ai: f.smith_ai,
  transitions: f.state_transitions,
  accessibility: f.accessibility,
};

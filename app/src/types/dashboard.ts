/**
 * Types for the slices of the page-state fixture the Dashboard renders.
 * Mirrors templates/page-state-template.json and
 * examples/dashboard/dashboard-connected-wallet-state.json.
 *
 * The UI renders this state. It never computes, ranks, or invents any of it.
 */

export interface NavItem {
  id: string;
  label: string;
  href: string;
  active: boolean;
  disabled: boolean;
}

export interface GlobalNavState {
  variant: string;
  logo: { asset: string; width_px: number; height_px: number; alt: string };
  nav_items: NavItem[];
  right_actions: {
    try_demo_mode: { visible: boolean };
    connect_wallet: { visible: boolean };
    wallet_pill: { visible: boolean; label: string; action: string };
    ask_smith_ai: {
      visible: boolean;
      label: string;
      action: string;
      accessibility_label: string;
    };
  };
}

export interface WalletState {
  status: string;
  provider: string;
  provider_id: string;
  address: string;
  address_short: string;
  show_wallet_pill: boolean;
  wallet_pill: {
    label: string;
    accessibility_label: string;
  };
  copy: {
    connected_toast: string;
  };
}

export interface SnapshotMetric {
  id: string;
  label: string;
  value: string;
  source: string;
  /** Optional unavailable-state helper (approved metric-card copy). */
  note?: string;
}

export interface SafetyBufferState {
  title: string;
  status: string;
  severity: string;
  display: {
    primary_value: string;
    secondary_value: string;
    caption: string;
  };
  progress: {
    value_percent: number;
    accessibility_label: string;
  };
}

export interface ChartPoint {
  year: number;
  value_usd: number;
}

export interface ProjectedGrowthState {
  title: string;
  status: string;
  display: { show_estimated_label: boolean; caption: string };
  series: Array<{
    id: string;
    label: string;
    type: string;
    points: ChartPoint[];
  }>;
}

export interface AllocationSlice {
  label: string;
  value_percent: number;
}

export interface AllocationState {
  title: string;
  status: string;
  current_allocation: AllocationSlice[];
  recommended_allocation: AllocationSlice[];
  display: { caption: string };
}

export interface DashboardAlertState {
  visible: boolean;
  linked_suggestion_id: string;
  severity: string;
  title: string;
  description: string;
  action: { label: string; target: string };
}

export interface ProtocolDecision {
  destination_protocol_id: string;
  destination_label: string;
  destination_url: string;
  handoff_type: string;
  cta_label: string;
  eligibility_status: string;
}

export interface SuggestionCardState {
  id: string;
  title: string;
  type: string;
  category: string;
  badge: string;
  is_top_pick: boolean;
  status: string;
  actionability: string;
  severity: string;
  description: string;
  impact_text: string;
  disabled_reason_text?: string;
  cta: {
    label: string;
    action: string | null;
    protocol_id?: string;
    handoff_type?: string;
    executes_transaction: boolean;
    requires_wallet_signature: boolean;
    completion_on_click: boolean;
  };
  protocol_decision?: ProtocolDecision;
  apy?: { status: string; display: string };
}

export interface RightRailState {
  title: string;
  description: string;
  state: { status: string };
  summary: { suggestions_count: number; top_pick_id: string };
  cards: SuggestionCardState[];
}

export interface PageHeaderState {
  title: string;
  description: string;
}

export interface AccessibilityState {
  page_title: string;
  global_nav_label: string;
  wallet_pill_label: string;
  right_rail_label: string;
  safety_buffer_progress_label: string;
  ask_smith_ai_label: string;
}

export interface SmithAiState {
  available: boolean;
  entry_label: string;
  suggested_prompts: string[];
  approved_sample_response: string;
}

export interface StateTransitions {
  open_protocol_handoff: { copy: { toast: string } };
  disconnect_wallet: { copy: { toast: string; helper: string } };
}

export interface DashboardPageState {
  global_nav: GlobalNavState;
  wallet: WalletState;
  page_header: PageHeaderState;
  financial_snapshot: { title: string; metrics: SnapshotMetric[] };
  safety_buffer: SafetyBufferState;
  projected_growth: ProjectedGrowthState;
  allocation: AllocationState;
  dashboard_alert: DashboardAlertState;
  right_rail: RightRailState;
  smith_ai: SmithAiState;
  transitions: StateTransitions;
  accessibility: AccessibilityState;
}

/**
 * Loads the Demo Mode Dashboard reference state.
 *
 * Sources (read-only; the examples/ folder is never modified):
 * - Screen chrome (nav, banner, header, financial snapshot, charts, Smith AI,
 *   accessibility, transitions, and the flat suggestion-card shapes):
 *   examples/dashboard/dashboard-demo-state.json
 * - Demo suggestion output (the dashboard alert, and each card's
 *   protocol_decision / locked APY / disabled reason):
 *   examples/demo-mode/demo-suggestions.json — the canonical demo suggestion
 *   source. The page renders these; it does not invent them.
 *
 * Source relationship (per approval decision 1): the demo dashboard alert is
 * rendered from the demo suggestion output, tied to the demo Top Pick, not
 * created by the page. There is exactly one alert and it is demo/sample-aware.
 *
 * In production, all of this would come from demo product logic. The UI layer
 * only renders it; nothing here computes or invents values.
 */
import screen from "../../../examples/dashboard/dashboard-demo-state.json";
import demoSuggestions from "../../../examples/demo-mode/demo-suggestions.json";
import type {
  DemoDashboardPageState,
  SuggestionCardState,
} from "../types/dashboard";

const s = screen as any;
const engine = demoSuggestions as any;

/** Canonical demo suggestion output, keyed by id, for enrichment. */
const outputById = new Map<string, any>(
  engine.suggestions.map((sugg: any) => [sugg.id, sugg])
);

/**
 * Build each rail card from the screen fixture's flat card shape, enriched
 * with protocol_decision / APY / disabled reason from the demo suggestion
 * output. No values are invented — missing fields stay undefined.
 */
const cards: SuggestionCardState[] = s.right_rail.cards.map((card: any) => {
  const out = outputById.get(card.id);
  return {
    ...card,
    cta: { requires_wallet_signature: false, ...card.cta },
    disabled_reason_text:
      card.disabled_reason_text ?? out?.copy?.disabled_reason_text,
    apy: card.apy ?? out?.data?.apy,
    protocol_decision: out?.protocol_decision ?? undefined,
  };
});

/**
 * Dashboard alert from the demo suggestion output. Its Review action reuses
 * the linked Top Pick card's approved CTA label and links to that card by id
 * — derived from the demo output, not invented copy.
 */
const rawAlert = engine.dashboard_alert;
const linkedCard = cards.find((c) => c.id === rawAlert.linked_suggestion_id);
const dashboard_alert = {
  visible: rawAlert.visible,
  linked_suggestion_id: rawAlert.linked_suggestion_id,
  severity: rawAlert.severity,
  title: rawAlert.title,
  description: rawAlert.description,
  action: {
    label: linkedCard ? linkedCard.cta.label : rawAlert.title,
    target: rawAlert.linked_suggestion_id,
  },
};

export const demoDashboardState: DemoDashboardPageState = {
  mode: "demo",
  is_sample_data: true,
  demo_banner: {
    visible: s.demo_banner.visible,
    title: s.demo_banner.title,
    description: s.demo_banner.description,
    primary_action: { label: s.demo_banner.actions[0].label, action: "exit_demo" },
    secondary_action: {
      label: s.demo_banner.actions[1].label,
      action: "open_connect_wallet_modal",
    },
    dismissible: false,
    accessibility_label: s.demo_banner.accessibility.label,
  },
  global_nav: s.global_nav,
  wallet: { status: "disconnected", show_wallet_pill: false },
  page_header: s.page_header,
  financial_snapshot: s.main_content.financial_snapshot,
  safety_buffer: s.main_content.safety_buffer,
  projected_growth: s.main_content.projected_growth,
  allocation: s.main_content.current_vs_recommended_allocation,
  dashboard_alert,
  right_rail: { ...s.right_rail, cards },
  smith_ai: s.smith_ai,
  transitions: {
    exit_demo: s.state_transitions.exit_demo,
    connect_wallet: s.state_transitions.connect_wallet,
  },
  accessibility: s.accessibility,
};

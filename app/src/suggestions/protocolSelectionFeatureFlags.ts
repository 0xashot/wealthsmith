/**
 * protocolSelectionFeatureFlags — the feature-flag surface + production-readiness
 * checklist for FUTURE protocol selection.
 *
 * Step 12I is PLANNING ONLY. It flips nothing on: protocol selection stays
 * disabled, live suggestions stay `not_evaluated`, and no protocol is selected,
 * named, or shown in the UI. These flags exist so a later step can gate real
 * selection behind them — default OFF.
 *
 * NOTES:
 *  - The QA-only pipeline (protocolSelectionQa.ts) may produce a
 *    `selectedProtocolId` in TEST UTILITIES ONLY. Live suggestions must stay
 *    `not_evaluated` until the production checklist passes.
 *  - The UI must not show any protocol recommendation while
 *    `PROTOCOL_SELECTION_SHOW_IN_UI` is false.
 *  - Transactions/deposits/swaps/signatures remain out of scope entirely.
 */

// Single source of truth lives in protocolRegistry.ts — re-export it here (no
// duplicate value) so this module is the one place to read the flag surface.
export { PROTOCOL_SELECTION_IMPLEMENTED } from "./protocolRegistry";

/** QA-only pipeline may select from fixture/simulated data (test utilities only). */
export const PROTOCOL_SELECTION_QA_ONLY = true;
/** The UI must never show a selected/recommended protocol while this is false. */
export const PROTOCOL_SELECTION_SHOW_IN_UI = false;
/** Real (non-fixture) market/risk/route data must not drive selection while false. */
export const PROTOCOL_SELECTION_ALLOW_LIVE_DATA = false;
/** Transactions are out of scope; this stays false. */
export const PROTOCOL_SELECTION_ALLOW_TRANSACTIONS = false;

/* ------------------------------------------------------------------ *
 * Rollout stages + readiness checklist (planning types).
 * ------------------------------------------------------------------ */

export type ProtocolSelectionRolloutStage =
  | "disabled"
  | "qa_only"
  | "internal_dry_run"
  | "internal_ui_preview"
  | "limited_beta"
  | "production";

/** Ordered rollout ladder. Selection may only ever advance one stage at a time. */
export const PROTOCOL_SELECTION_ROLLOUT_STAGES: readonly ProtocolSelectionRolloutStage[] = [
  "disabled",
  "qa_only",
  "internal_dry_run",
  "internal_ui_preview",
  "limited_beta",
  "production",
];

/** The current stage. QA-only fixtures may select; nothing reaches production. */
export const PROTOCOL_SELECTION_CURRENT_STAGE: ProtocolSelectionRolloutStage = "qa_only";

export type ProtocolSelectionReadinessGate =
  | "market_data"
  | "risk_registry"
  | "eligibility"
  | "route_liquidity_cost"
  | "scoring"
  | "qa"
  | "product_copy_compliance"
  | "feature_flag"
  | "fallback_behavior";

export type ProtocolSelectionReadinessStatus = "passed" | "blocked" | "not_started" | "not_applicable";

export interface ProtocolSelectionReadinessCheck {
  gate: ProtocolSelectionReadinessGate;
  status: ProtocolSelectionReadinessStatus;
  notes: string;
}

/**
 * The current production-readiness checklist. Mechanism-complete gates are
 * `passed` (the logic exists and is enforced); gates that need real data or
 * external review are `blocked`/`not_started`. This never claims overall
 * production readiness — see `isProtocolSelectionProductionReady`.
 */
export function getProtocolSelectionReadinessChecklist(): ProtocolSelectionReadinessCheck[] {
  return [
    { gate: "market_data", status: "blocked", notes: "Real DefiLlama pool mappings are empty; Kamino candidate-market adapter is stubbed; Jupiter live quote disabled. No real APY/TVL/freshness yet." },
    { gate: "risk_registry", status: "blocked", notes: "riskScore methodology not approved; riskScore absent; auditStatus/withdrawalClass default unknown." },
    { gate: "eligibility", status: "passed", notes: "Deterministic eligibility gates implemented & enforced (12E); missing data → insufficient_data, failing gates → ineligible. Still requires real data to pass per candidate." },
    { gate: "route_liquidity_cost", status: "blocked", notes: "Route guardrail utility implemented (12F) but live quote disabled; liquidity/fee/price-impact data absent." },
    { gate: "scoring", status: "passed", notes: "Deterministic scoring/ranking implemented (12G): APY cap + risk-weighted + stable tie-breakers. Requires complete real inputs to score." },
    { gate: "qa", status: "blocked", notes: "Mock + mainnet-simulated QA passes (12H). Real-data dry-run, stale-data, and regression suites are still pending." },
    { gate: "product_copy_compliance", status: "not_started", notes: "User-facing copy, product decision, and legal/compliance review not started. Copy must avoid superlatives and absolute safety/return claims, and stay review-only / non-custodial." },
    { gate: "feature_flag", status: "passed", notes: "Flags + rollout stages defined; default OFF (this step). Rollout has not begun." },
    { gate: "fallback_behavior", status: "passed", notes: "Any missing/stale/failing data keeps protocolSelection.status = not_evaluated, no selectedProtocolId/Name, guardrail not_evaluated, no UI recommendation — enforced today." },
  ];
}

/** Production readiness is FALSE until every gate passes and a product decision is made. */
export function isProtocolSelectionProductionReady(): false {
  return false;
}

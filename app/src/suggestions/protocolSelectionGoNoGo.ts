/**
 * protocolSelectionGoNoGo — the FINAL machine-checkable go/no-go checklist for
 * protocol-selection production readiness.
 *
 * Answers one question: "Can WealthSmith safely expose selected protocols to
 * users right now?" The deterministic answer today is NO — `productionReady` is
 * the literal `false`. This module never enables anything: it only reports which
 * gates pass and which are blocked, with stable blocker IDs and evidence.
 *
 * CHECKLIST ONLY. It selects no protocol, exposes no `selectedProtocolId` /
 * `selectedProtocolName`, is never imported by any live/engine/UI file, changes no
 * live suggestion, and has no transaction/signature/swap path.
 * `PROTOCOL_SELECTION_IMPLEMENTED` stays false.
 */
import {
  PROTOCOL_SELECTION_IMPLEMENTED,
  PROTOCOL_SELECTION_SHOW_IN_UI,
  PROTOCOL_SELECTION_ALLOW_TRANSACTIONS,
} from "./protocolSelectionFeatureFlags";
import { SOL_LIQUID_STAKING_CANDIDATE_IDS } from "./protocolSolLiquidStakingData";
import { getSolLiquidStakingSourceStatus } from "./protocolSolLiquidStakingSources";
import { getProtocolRiskData } from "./protocolRiskRegistry";
import { buildSolLiquidStakingStage2DryRunReport } from "./protocolSolLiquidStakingStage2DryRun";
import { PROTOCOL_RISK_RUBRIC_EXISTS, PROTOCOL_RISK_RUBRIC_APPROVED } from "./protocolRiskRubric";

/** This module is a checklist only; it can never enable production or UI. */
export const PROTOCOL_SELECTION_GO_NO_GO_ONLY = true;
export const PROTOCOL_SELECTION_GO_NO_GO_SHOWS_UI = false;
export const PROTOCOL_SELECTION_GO_NO_GO_CAN_ENABLE_PRODUCTION = false;

export type ProtocolSelectionGoNoGoStatus = "pass" | "blocked" | "not_started" | "not_applicable";

export type ProtocolSelectionGoNoGoGate =
  | "feature_flags"
  | "market_data"
  | "tvl_mapping"
  | "risk_methodology"
  | "risk_scores"
  | "audit_status"
  | "withdrawal_data"
  | "fee_data"
  | "route_liquidity_cost"
  | "eligibility"
  | "scoring"
  | "stage_2_dry_run"
  | "qa_regression"
  | "product_copy_compliance"
  | "fallback_behavior"
  | "transaction_boundary"
  | "ui_readiness";

export interface ProtocolSelectionGoNoGoBlocker {
  id: string;
  gate: ProtocolSelectionGoNoGoGate;
  severity: "blocking" | "warning";
  title: string;
  detail: string;
  evidence?: string[];
}

export interface ProtocolSelectionGoNoGoCheck {
  gate: ProtocolSelectionGoNoGoGate;
  status: ProtocolSelectionGoNoGoStatus;
  blockers: ProtocolSelectionGoNoGoBlocker[];
  notes: string[];
}

export interface ProtocolSelectionGoNoGoResult {
  productionReady: false;
  canShowInUi: false;
  canSelectProtocol: false;
  canUseTransactions: false;
  checkedAt: string;
  checks: ProtocolSelectionGoNoGoCheck[];
  blockers: ProtocolSelectionGoNoGoBlocker[];
}

/** LST display symbol per candidate id (for stable, readable blocker IDs/titles). */
const LST_SYMBOL: Record<string, string> = {
  jupiter: "JupSOL",
  marinade: "mSOL",
  jito: "JitoSOL",
  blazestake: "bSOL",
  sanctum: "INF",
};

const blocker = (
  id: string,
  gate: ProtocolSelectionGoNoGoGate,
  title: string,
  detail: string,
  evidence?: string[],
  severity: "blocking" | "warning" = "blocking"
): ProtocolSelectionGoNoGoBlocker => ({ id, gate, severity, title, detail, ...(evidence ? { evidence } : {}) });

/**
 * Build the deterministic go/no-go result from current static state. Reads the
 * real source-status metadata, the risk registry, and a no-injection Stage-2
 * report — it never fetches, never selects, never mutates anything.
 */
export function getProtocolSelectionGoNoGo(checkedAt: string = new Date().toISOString()): ProtocolSelectionGoNoGoResult {
  const ids = [...SOL_LIQUID_STAKING_CANDIDATE_IDS];
  const checks: ProtocolSelectionGoNoGoCheck[] = [];
  const check = (
    gate: ProtocolSelectionGoNoGoGate,
    status: ProtocolSelectionGoNoGoStatus,
    blockers: ProtocolSelectionGoNoGoBlocker[],
    notes: string[]
  ) => checks.push({ gate, status, blockers, notes });

  /* --- feature_flags: production flags are OFF (correct today). --- */
  check("feature_flags", "blocked", [
    blocker("selection_implemented_false", "feature_flags", "PROTOCOL_SELECTION_IMPLEMENTED is false", "Production selection is not implemented; the master flag is off.", [`PROTOCOL_SELECTION_IMPLEMENTED=${PROTOCOL_SELECTION_IMPLEMENTED}`]),
    blocker("show_in_ui_disabled", "feature_flags", "PROTOCOL_SELECTION_SHOW_IN_UI is false", "No selected protocol may be surfaced in the UI while this is false.", [`PROTOCOL_SELECTION_SHOW_IN_UI=${PROTOCOL_SELECTION_SHOW_IN_UI}`]),
    blocker("transactions_disabled", "feature_flags", "PROTOCOL_SELECTION_ALLOW_TRANSACTIONS is false", "Transactions remain out of scope; this flag stays off.", [`PROTOCOL_SELECTION_ALLOW_TRANSACTIONS=${PROTOCOL_SELECTION_ALLOW_TRANSACTIONS}`], "warning"),
  ], ["Production flags are OFF by design; a go decision requires them to be intentionally flipped only after every other gate passes."]);

  /* --- market_data: APY sources exist, but live values are not populated. --- */
  check("market_data", "blocked", [
    blocker("market_values_not_populated", "market_data", "Required live market values not populated", "APY source coverage exists (code-backed) for all five, but no live APY/TVL VALUES are populated in a production feed.", ["APY sources verified in protocolSolLiquidStakingSources.ts; values are injected, not live."]),
  ], ["Verified source ≠ populated value. A production feed with freshness + attribution is required."]);

  /* --- tvl_mapping: only Sanctum/INF has a verified pool. --- */
  {
    const tvlBlockers: ProtocolSelectionGoNoGoBlocker[] = [];
    for (const id of ids) {
      if (id === "sanctum") continue;
      const sym = LST_SYMBOL[id];
      if (getSolLiquidStakingSourceStatus(id, "tvl") !== "verified") {
        tvlBlockers.push(blocker(`missing_tvl_${sym.toLowerCase()}`, "tvl_mapping", `TVL mapping missing for ${sym}`, `No verified DefiLlama pool UUID for ${sym} (${id}); TVL stays missing (none guessed).`, [`getSolLiquidStakingSourceStatus("${id}","tvl")=${getSolLiquidStakingSourceStatus(id, "tvl")}`]));
      }
    }
    check("tvl_mapping", "blocked", tvlBlockers, [
      "Only Sanctum / INF has a verified TVL mapping (DefiLlama pool 3075a746-…). The other four are missing.",
    ]);
  }

  /* --- risk_methodology: rubric drafted, not approved. --- */
  check("risk_methodology", "blocked", [
    blocker("risk_methodology_not_production_approved", "risk_methodology", "riskScore rubric not approved for production", "A riskScore rubric now exists in DRAFT (protocolRiskRubric.ts, PROTOCOL_RISK_RUBRIC_APPROVED=false) but has no approval sign-off or per-protocol evidence.", [`PROTOCOL_RISK_RUBRIC_EXISTS=${PROTOCOL_RISK_RUBRIC_EXISTS}`, `PROTOCOL_RISK_RUBRIC_APPROVED=${PROTOCOL_RISK_RUBRIC_APPROVED}`, "protocolRiskRubricApprovalPack.md"]),
  ], ["Rubric is drafted but must be approved with documented evidence before any riskScore can be assigned."]);

  /* --- risk_scores: absent for all five. --- */
  {
    const noScore = ids.every((id) => getProtocolRiskData(id).riskScore === undefined);
    check("risk_scores", "not_started", [
      blocker("risk_scores_not_assigned", "risk_scores", "riskScore values not assigned", "riskScore is absent for all five candidates; eligibility that depends on it returns insufficient_data.", [`allRiskScoresAbsent=${noScore}`]),
    ], ["riskScore stays absent until the methodology is approved and evidence is gathered."]);
  }

  /* --- audit_status: unknown for all five. --- */
  {
    const auditEvidence = ids.map((id) => `${id}:${getProtocolRiskData(id).auditStatus}`);
    check("audit_status", "blocked", [
      blocker("audit_status_unknown", "audit_status", "Audit status unknown for all five candidates", "auditStatus is unknown for every candidate; it must be sourced from published audits (firm + report link).", auditEvidence),
    ], ["Audit status is not directly sourced yet."]);
  }

  /* --- withdrawal_data: absent for all five. --- */
  check("withdrawal_data", "blocked", [
    blocker("withdrawal_data_missing", "withdrawal_data", "Withdrawal mechanics missing for all five candidates", "withdrawalTimeHours / withdrawalClass are absent; unstake mechanics are not sourced (trade-route liquidity is not the same as protocol unstaking).", ["all withdrawal source statuses missing"]),
  ], ["Never assumed instant; must be documented per protocol."]);

  /* --- fee_data: absent for all five. --- */
  check("fee_data", "blocked", [
    blocker("fee_data_missing", "fee_data", "Fee schedules missing for all five candidates", "Entry / exit / performance / management fees are absent; never assumed zero, never inferred from APY.", ["all fee source statuses missing"]),
  ], ["Fee schedules must be sourced before net-yield comparison."]);

  /* --- route_liquidity_cost: live quote disabled. --- */
  check("route_liquidity_cost", "not_started", [
    blocker("route_liquidity_cost_missing", "route_liquidity_cost", "No production route/liquidity/cost data", "Jupiter live quote is disabled; liquidity depth and price-impact/cost data are absent. (A liquid-staking stake needs no trade route, but a production path still requires this gate resolved or marked not-applicable per strategy.)", ["route guardrail utility exists (12F); live quote disabled"]),
  ], ["Route/liquidity/cost data is not populated from any production source."]);

  /* --- eligibility: mechanism complete & enforced. --- */
  check("eligibility", "pass", [], [
    "Deterministic eligibility gates exist (12E) and are enforced: missing data → insufficient_data, failing gates → ineligible. Real per-candidate data is still required to actually pass.",
  ]);

  /* --- scoring: mechanism complete. --- */
  check("scoring", "pass", [], [
    "Deterministic scoring/ranking exists (12G): APY cap, risk-weighted, stable tie-breakers. Only complete, eligible data scores.",
  ]);

  /* --- stage_2_dry_run: exists, but real complete-data run has not passed. --- */
  {
    const report = buildSolLiquidStakingStage2DryRunReport({ fetchedAt: checkedAt });
    check("stage_2_dry_run", "blocked", [
      blocker("stage_2_real_data_dry_run_not_complete", "stage_2_dry_run", "Real-data Stage-2 dry-run has not passed", "The Stage-2 report exists, but with current realistic data it returns insufficient_data (no candidate eligible). A complete real-data dry-run has not passed.", [`candidatesEligible=${report.summary.candidatesEligible}`, `anyFullyEligible=${report.anyFullyEligible}`]),
    ], ["Stage-2 report is a dry-run only; complete real data is required for a passing run."]);
  }

  /* --- qa_regression: fixtures pass. --- */
  check("qa_regression", "pass", [], [
    "The suggestion-engine fixture suite passes, including protocol-selection isolation, eligibility, scoring, QA-only selection, Stage-2 dry-run, and no-leak checks.",
  ]);

  /* --- product_copy_compliance: reviews not completed. --- */
  check("product_copy_compliance", "blocked", [
    blocker("copy_review_not_complete", "product_copy_compliance", "User-facing copy review not completed", "Product/copy review for any selected-protocol surface is not complete. Copy must avoid superlatives and absolute safety/return claims and stay review-only / non-custodial.", ["no approved copy exists"]),
    blocker("compliance_review_not_complete", "product_copy_compliance", "Legal/compliance review not completed (if required)", "Legal/compliance review for surfacing protocol selections is not complete.", ["no sign-off on record"]),
    blocker("ui_display_not_approved", "product_copy_compliance", "UI display not approved", "No protocol-selection UI has been designed or approved.", ["SHOW_IN_UI=false"], "warning"),
  ], ["Product, copy, and compliance sign-off must precede any user exposure."]);

  /* --- fallback_behavior: enforced today. --- */
  check("fallback_behavior", "pass", [], [
    "Missing/stale/failing data keeps protocolSelection.status = not_evaluated, no selected-protocol id/name, guardrail not_evaluated, and no UI callout — enforced and fixture-tested.",
  ]);

  /* --- transaction_boundary: no tx path exists. --- */
  check("transaction_boundary", "pass", [], [
    "No transaction, signature, or trade-execution path exists anywhere in the protocol-selection foundation; the read-only, non-custodial boundary is intact.",
  ]);

  /* --- ui_readiness: disabled. --- */
  check("ui_readiness", "blocked", [
    blocker("ui_readiness_blocked", "ui_readiness", "UI readiness blocked", "PROTOCOL_SELECTION_SHOW_IN_UI is false and no protocol-selection UI is approved.", [`PROTOCOL_SELECTION_SHOW_IN_UI=${PROTOCOL_SELECTION_SHOW_IN_UI}`]),
  ], ["No selected protocol may be surfaced in the UI."]);

  const blockers = checks.flatMap((c) => c.blockers);

  return {
    productionReady: false,
    canShowInUi: false,
    canSelectProtocol: false,
    canUseTransactions: false,
    checkedAt,
    checks,
    blockers,
  };
}

/** All go/no-go blockers (blocking + warning), flattened. */
export function getProtocolSelectionBlockingReasons(): ProtocolSelectionGoNoGoBlocker[] {
  return getProtocolSelectionGoNoGo().blockers;
}

/** The overall go decision. Literal false — protocol selection is NOT a go. */
export function isProtocolSelectionGo(): false {
  return false;
}

/**
 * Assert production selection is correctly blocked: `productionReady` is false and
 * at least one blocking-severity blocker exists. Returns `true` when production is
 * correctly NOT enabled.
 */
export function assertProtocolSelectionCannotRunInProduction(): true {
  const result = getProtocolSelectionGoNoGo();
  const hasBlocking = result.blockers.some((b) => b.severity === "blocking");
  if (result.productionReady !== false || !hasBlocking) {
    throw new Error("Protocol selection must remain blocked from production.");
  }
  return true;
}

/**
 * protocolRouteGuardrails — deterministic route / cost / liquidity guardrail
 * evaluation from read-only quote data.
 *
 * GUARDRAIL DATA ONLY (Step 12F). Answers "can we estimate route availability,
 * price impact, and execution-cost guardrails?" — NEVER "which protocol should
 * the user use?". No ranking, no scoring, no selection, no transaction. HONESTY:
 * missing data NEVER passes (→ insufficient_data); present data over a gate →
 * failed. NOT wired into any live suggestion — live cost/liquidity/slippage
 * guardrails stay `not_evaluated` (see the mapping notes below).
 *
 * ── Future guardrail mapping (NOT implemented here) ──
 *   cost_available      ← quote route + fee / network estimate
 *   liquidity_available ← liquidityUsd (or a reliable quote/liquidity proxy)
 *   slippage_available  ← priceImpactPct (or a slippage/price-impact source)
 *
 * ── Intended future action contexts (NOT implemented — quote required first) ──
 *   Rebalance:          overweight-bucket token → target bucket token/stable
 *   DCA:                stable contribution     → target crypto token
 *   Trim:               long-tail token         → stable / target bucket
 *   Capital Efficiency: idle token              → eligible deployment asset
 *   Stable Yield:       stable → protocol deposit asset (quote usually not
 *                       needed for same-stable; liquidity/withdrawal/risk still
 *                       required separately)
 */
import type { RouteQuoteResult } from "./routeCostTypes";
import { MAX_PRICE_IMPACT_PCT, MIN_LIQUIDITY_USD } from "./engineThresholds";

export type RouteGuardrailStatus = "passed" | "failed" | "not_evaluated" | "insufficient_data";

export type RouteGuardrailReason =
  | "quote_unavailable"
  | "price_impact_missing"
  | "price_impact_too_high"
  | "liquidity_missing"
  | "liquidity_below_minimum"
  | "network_fee_missing"
  | "invalid_route_request"
  | "unsupported_token_pair"
  | "amount_missing";

export interface RouteGuardrailResult {
  status: RouteGuardrailStatus;
  reasons: RouteGuardrailReason[];
  checkedAt: string;
  quote?: RouteQuoteResult;
}

/** Present-data failures (definitive). Any of these → `failed`. */
const HARD_FAIL: ReadonlySet<RouteGuardrailReason> = new Set([
  "price_impact_too_high",
  "liquidity_below_minimum",
]);

const REASON_ORDER: RouteGuardrailReason[] = [
  "invalid_route_request",
  "amount_missing",
  "unsupported_token_pair",
  "quote_unavailable",
  "price_impact_missing",
  "price_impact_too_high",
  "liquidity_missing",
  "liquidity_below_minimum",
  "network_fee_missing",
];

/**
 * Evaluate route guardrails from a read-only quote (and optional liquidity).
 * Deterministic and pure. Missing data → insufficient_data; a present value over
 * a gate → failed; all required present and passing → passed. Never selects.
 */
export function evaluateRouteGuardrails(args: {
  quote?: RouteQuoteResult;
  liquidityUsd?: number;
  requiresLiquidity?: boolean;
  maxPriceImpactPct?: number;
  minLiquidityUsd?: number;
  checkedAt?: string;
}): RouteGuardrailResult {
  const { quote } = args;
  const maxPI = args.maxPriceImpactPct ?? MAX_PRICE_IMPACT_PCT;
  const minLiq = args.minLiquidityUsd ?? MIN_LIQUIDITY_USD;
  const checkedAt = args.checkedAt ?? new Date().toISOString();

  const reasons = new Set<RouteGuardrailReason>();

  if (!quote || quote.quoteAvailable !== true) {
    // No route data → cannot evaluate (never a pass).
    reasons.add("quote_unavailable");
  } else {
    if (quote.priceImpactPct == null) reasons.add("price_impact_missing");
    else if (quote.priceImpactPct > maxPI) reasons.add("price_impact_too_high");
  }

  if (args.requiresLiquidity) {
    if (args.liquidityUsd == null) reasons.add("liquidity_missing");
    else if (args.liquidityUsd < minLiq) reasons.add("liquidity_below_minimum");
  }

  const ordered = REASON_ORDER.filter((r) => reasons.has(r));
  const status: RouteGuardrailStatus = ordered.some((r) => HARD_FAIL.has(r))
    ? "failed"
    : ordered.length > 0
      ? "insufficient_data"
      : "passed";

  return { status, reasons: ordered, checkedAt, ...(quote ? { quote } : {}) };
}

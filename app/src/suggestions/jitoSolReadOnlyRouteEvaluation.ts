/**
 * jitoSolReadOnlyRouteEvaluation — Step 13I. READ-ONLY route cost / liquidity depth
 * / slippage evaluation for the approved JitoSOL recommendation.
 *
 * READ-ONLY BOUNDARY — this is evaluation only. It is NOT a swap, NOT a staking
 * transaction, NOT a route-execution feature, NOT a deposit, NOT wallet signing.
 * It never builds/prefills/sends a transaction, never requests a signature, and
 * never marks execution as "ready". Idle-SOL → JitoSOL is a DIRECT PROTOCOL stake
 * (the Jito stake pool), not a DEX swap, so DEX liquidity depth and slippage are
 * `not_applicable` for that path. The swap-route path stays `insufficient_data`
 * unless a real read-only quote is available — no route/liquidity/slippage value
 * is ever invented.
 *
 * Type-only at the boundary (imports only types), so it stays isolated from live
 * transaction code and safe for the Node fixtures runner.
 */
import type { RouteEvaluationDisplay, RouteEvaluationDisplayGroup } from "./engineTypes";
import type { RouteQuoteResult } from "./routeCostTypes";

export const JITOSOL_READ_ONLY_ROUTE_EVALUATION_EXISTS = true;
export const JITOSOL_READ_ONLY_ROUTE_EVALUATION_ENABLED = true;
/** The model reads route data ONLY from read-only quotes — never execution. */
export const JITOSOL_READ_ONLY_ROUTE_EVALUATION_USES_READ_ONLY_QUOTES = true;
/** Hard-off: never a transaction / signature / prefilled route. */
export const JITOSOL_READ_ONLY_ROUTE_EVALUATION_ENABLES_TRANSACTIONS = false;
export const JITOSOL_READ_ONLY_ROUTE_EVALUATION_REQUIRES_WALLET_SIGNATURE = false;
export const JITOSOL_READ_ONLY_ROUTE_EVALUATION_PREFILLS_ROUTE = false;

export type JitoSolRouteEvaluationStatus =
  | "checked_for_review"
  | "not_applicable"
  | "insufficient_data"
  | "stale"
  | "unavailable";

export interface JitoSolRouteEvaluation {
  status: JitoSolRouteEvaluationStatus;
  routeType: "direct_protocol" | "swap_route" | "not_applicable";
  inputAsset: "SOL";
  outputAsset: "JitoSOL";
  inputAmountSol: number;
  routeCostLabel?: string;
  liquidityDepthLabel?: string;
  slippageLabel?: string;
  /** Read-only price-impact estimate as a PERCENT — only when a real quote has it. */
  priceImpactPct?: number;
  /** Read-only estimated output — only when a real quote provides it (never invented). */
  estimatedOutputJitoSol?: number;
  sourceStatusLabel: string;
  checkedAt: string;
  limitations: string[];
  transactionsEnabled: false;
  requiresWalletSignature: false;
}

const READ_ONLY_LIMITATIONS = [
  "This is a read-only estimate. No transaction is created.",
  "WealthSmith does not move funds for you.",
];

/**
 * Evaluate the DIRECT PROTOCOL path (idle SOL → JitoSOL via the Jito stake pool).
 * Route cost is `checked_for_review` (the direct route is reviewed, no transaction
 * created); DEX liquidity depth and slippage are `not_applicable` (there is no DEX
 * swap). Deterministic and read-only — no quote is needed and none is invented.
 */
export function evaluateJitoSolDirectProtocolRoute(args: {
  inputAmountSol: number;
  checkedAt: string;
}): JitoSolRouteEvaluation {
  return {
    status: "checked_for_review",
    routeType: "direct_protocol",
    inputAsset: "SOL",
    outputAsset: "JitoSOL",
    inputAmountSol: args.inputAmountSol,
    routeCostLabel: "Direct protocol route reviewed. No transaction is created by WealthSmith.",
    liquidityDepthLabel: "DEX liquidity depth is not required for the direct protocol path.",
    slippageLabel: "Slippage is not applicable to the direct protocol path.",
    sourceStatusLabel: "Read-only protocol route review",
    checkedAt: args.checkedAt,
    limitations: READ_ONLY_LIMITATIONS,
    transactionsEnabled: false,
    requiresWalletSignature: false,
  };
}

/**
 * Evaluate a SWAP-ROUTE path (SOL → JitoSOL via a DEX aggregator) from a read-only
 * quote. Without a fresh quote it stays `insufficient_data` — route cost, liquidity
 * depth, and slippage are NOT invented. When a real quote is present, only its real
 * values pass through (e.g. price impact → slippage). Never builds/sends anything.
 */
export function evaluateJitoSolSwapRoute(args: {
  inputAmountSol: number;
  checkedAt: string;
  quote?: RouteQuoteResult;
}): JitoSolRouteEvaluation {
  const quote = args.quote;
  const base = {
    routeType: "swap_route" as const,
    inputAsset: "SOL" as const,
    outputAsset: "JitoSOL" as const,
    inputAmountSol: args.inputAmountSol,
    checkedAt: args.checkedAt,
    transactionsEnabled: false as const,
    requiresWalletSignature: false as const,
  };

  if (!quote || quote.quoteAvailable !== true) {
    return {
      ...base,
      status: "insufficient_data",
      sourceStatusLabel: "Read-only route review (no quote available)",
      limitations: [
        "No read-only quote is available, so route cost, liquidity depth, and slippage are not evaluated.",
        "WealthSmith does not move funds for you.",
      ],
    };
  }

  // Real values only — nothing invented. Price impact (if present) → slippage.
  return {
    ...base,
    status: "checked_for_review",
    routeCostLabel: "Read-only quote reviewed. No transaction is created by WealthSmith.",
    ...(quote.priceImpactPct != null
      ? { slippageLabel: `Estimated price impact ${quote.priceImpactPct}% (read-only estimate).`, priceImpactPct: quote.priceImpactPct }
      : {}),
    sourceStatusLabel: "Read-only route review",
    limitations: READ_ONLY_LIMITATIONS,
  };
}

/**
 * Project a `JitoSolRouteEvaluation` into the modal-ready
 * `RouteEvaluationDisplay` (grouped chips + read-only explanation). Uses friendly
 * labels only — never raw guardrail codes or an execution-readiness claim.
 */
export function buildJitoSolRouteEvaluationDisplay(e: JitoSolRouteEvaluation): RouteEvaluationDisplay {
  const groups: RouteEvaluationDisplayGroup[] = [];

  if (e.routeType === "direct_protocol") {
    groups.push({ title: "Checked for review", tone: "checked", items: ["Route cost", "Direct protocol route"] });
    groups.push({ title: "Not applicable", tone: "na", items: ["Liquidity depth", "Slippage"] });
  } else {
    // swap_route
    if (e.status === "checked_for_review") {
      const checked = ["Route cost"];
      const insufficient: string[] = [];
      if (e.priceImpactPct != null) checked.push("Slippage");
      else insufficient.push("Slippage");
      insufficient.push("Liquidity depth");
      groups.push({ title: "Checked for review", tone: "checked", items: checked });
      groups.push({ title: "Insufficient data", tone: "insufficient", items: insufficient });
    } else {
      groups.push({ title: "Insufficient data", tone: "insufficient", items: ["Route cost", "Liquidity depth", "Slippage"] });
    }
  }

  return {
    title: "Route and execution checks",
    sourceStatusLabel: e.sourceStatusLabel,
    groups,
    explanation: "These checks are informational only. WealthSmith does not create transactions or move funds.",
  };
}

/** Direct-protocol display in one call (the path the JitoSOL recommendation uses). */
export function getJitoSolDirectProtocolRouteEvaluationDisplay(args: {
  inputAmountSol: number;
  checkedAt: string;
}): RouteEvaluationDisplay {
  return buildJitoSolRouteEvaluationDisplay(evaluateJitoSolDirectProtocolRoute(args));
}

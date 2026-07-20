/**
 * portfolioAssetAccounting — Step 19C. The smallest SHARED, pure portfolio asset/liability accounting used by
 * BOTH the Rebalance assessment and the Trim assessment, so neither depends on the other.
 *
 * It answers only the canonical accounting questions — gross asset value (fresh, authoritative, non-liability
 * economic asset values counted once), recognized liabilities (separate dimension), and net worth — plus the
 * decision-relevant validity flags. It knows NOTHING about risk tolerance, target allocations, Rebalance
 * directions, source eligibility, destinations, or any threshold. No fetching, no pricing, no AI, no RPC.
 *
 * LST market value is counted once (its `valueUsd`); LST backing is never a row and never double-counts.
 * Borrowed positions are liabilities (never negative assets). A negative non-liability asset value fails
 * closed. Unknown-magnitude positive holdings and unresolved liabilities are surfaced, never silently dropped.
 */
import type { WalletPosition } from "./walletPosition";
import type { PortfolioCompletenessResult, CompletenessState } from "./portfolioCompleteness";

export const PORTFOLIO_ASSET_ACCOUNTING_VERSION = "1.0.0" as const;

export interface PortfolioAssetAccounting {
  grossAssetValueUsd: number;
  recognizedLiabilitiesUsd: number;
  netWorthUsd: number;
  /** One entry per fresh, authoritative, non-liability asset value (counted once). */
  authoritativeAssetValues: { positionId: string; valueUsd: number }[];
  /** Positive holdings whose USD magnitude is unknown (decision-relevant for net worth). */
  unresolvedAssetPositions: string[];
  /** Borrowed positions whose liability magnitude is unresolved. */
  unresolvedLiabilityPositions: string[];
  /** Negative non-liability asset values (malformed — fail closed). */
  malformedNegativeAssetPositions: string[];
  duplicateState: "complete" | "invalid" | "unresolved";
  freshnessState: "complete" | "stale" | "unresolved";
  blockingReasons: string[];
  methodologyVersion: string;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const round2 = (n: number): number => Math.round(n * 100) / 100;
const hasBalance = (p: WalletPosition): boolean => (typeof p.uiAmount === "number" && p.uiAmount > 0) || (typeof p.amount === "string" && /^[1-9]/.test(p.amount));
const mapState = (s: CompletenessState | undefined): "complete" | "invalid" | "unresolved" => (s === "complete" ? "complete" : s === "invalid" ? "invalid" : "unresolved");

/**
 * Canonical asset/liability accounting over the FINAL merged portfolio. `completeness` (when supplied) is used
 * ONLY to surface the shared duplicate/freshness dimensions — never recomputed here.
 */
export function derivePortfolioAssetAccounting(
  positions: WalletPosition[],
  completeness?: PortfolioCompletenessResult,
): PortfolioAssetAccounting {
  let liabilities = 0;
  const authoritativeAssetValues: { positionId: string; valueUsd: number }[] = [];
  const unresolvedAssetPositions: string[] = [];
  const unresolvedLiabilityPositions: string[] = [];
  const malformedNegativeAssetPositions: string[] = [];

  for (const p of positions) {
    const v = num(p.valueUsd);
    if (p.side === "borrowed") { if (v === null) unresolvedLiabilityPositions.push(p.id); else liabilities += Math.abs(v); continue; }
    if (v === null) { if (hasBalance(p)) unresolvedAssetPositions.push(p.id); continue; } // unknown positive → surfaced
    if (v < 0) { malformedNegativeAssetPositions.push(p.id); continue; } // negative non-liability → fail closed
    authoritativeAssetValues.push({ positionId: p.id, valueUsd: v });
  }

  const grossAssetValueUsd = round2(authoritativeAssetValues.reduce((s, a) => s + a.valueUsd, 0));
  const recognizedLiabilitiesUsd = round2(liabilities);
  const netWorthUsd = round2(grossAssetValueUsd - recognizedLiabilitiesUsd);

  const blockingReasons: string[] = [];
  if (malformedNegativeAssetPositions.length > 0) blockingReasons.push("malformed_asset_value");

  const freshnessState: PortfolioAssetAccounting["freshnessState"] =
    completeness ? (completeness.freshnessState === "stale" ? "stale" : completeness.freshnessState === "complete" ? "complete" : "unresolved") : "complete";

  return {
    grossAssetValueUsd, recognizedLiabilitiesUsd, netWorthUsd,
    authoritativeAssetValues, unresolvedAssetPositions, unresolvedLiabilityPositions, malformedNegativeAssetPositions,
    duplicateState: completeness ? mapState(completeness.deduplicationState) : "complete",
    freshnessState, blockingReasons,
    methodologyVersion: `portfolio_asset_accounting_${PORTFOLIO_ASSET_ACCOUNTING_VERSION}`,
  };
}

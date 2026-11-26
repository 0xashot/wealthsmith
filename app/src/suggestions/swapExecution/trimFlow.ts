/**
 * trimFlow — the PURE rules of a multi-token Trim: which tokens can be ticked and why not, which
 * outcomes may be tried again, and how the received amounts are added. No React, no assets, so
 * the fixture suite can run them; `components/trim/TrimFlowSection` draws from these.
 */
import type { SwapActionContext, SwapQuoteComparisonAssessment } from "../swapQuote/swapQuoteContracts";
import type { ReviewAsset } from "../engineTypes";
import type { SwapSettled } from "../../components/swapExecution/SwapExecutionSection";
import { deriveExecutionOffer } from "./executionOffer";
import { TRIM_BLOCKED_REASON, TRIM_BLOCKED_REASON_DEFAULT } from "../../state/approvedCopy";

/** A chosen token's outcome. `not_started` is a token the run never reached (it was stopped). */
export type TrimResult = SwapSettled | { status: "not_started" };

/** One row of the selector: a token, and whether a sale can be offered for it right now. */
export interface TrimTokenRow {
  key: string;
  symbol: string;
  /** The token-icon registry key from the review's asset row; null → the fallback mark. */
  icon: string | null;
  /** A verified listing's remote icon, for a token with no registry icon; null otherwise. */
  iconUrl: string | null;
  valueUsd: number | null;
  /** The leg, when the engine built one. Absent for a token that cannot be moved at all. */
  leg: SwapActionContext | null;
  sellable: boolean;
  /** The expected USDC, as a preview. Null when no sale can be offered. */
  previewTokens: string | null;
  /** Why not, when not sellable. */
  blockedReason: string | null;
}

/**
 * Decide each token's row. Pure, so the selector's contents can be tested without mounting it.
 *
 * A leg is SELLABLE when the Boundary would offer it approved by itself — or when its only
 * objection is the comparison's age, which the token's own step re-runs before any terms are
 * shown (the same allowance a single swap's Swap button gets).
 */
export function deriveTrimRows(input: {
  legs: SwapActionContext[];
  assessments: Record<string, SwapQuoteComparisonAssessment | null>;
  assets: ReviewAsset[];
  nowMs: number;
}): TrimTokenRow[] {
  const { legs, assessments, assets, nowMs } = input;
  const assetFor = (leg: SwapActionContext) =>
    assets.find((a) => a.mint != null && a.mint === leg.inputAsset.mint) ?? assets.find((a) => a.symbol === leg.inputAsset.symbol);

  const rows: TrimTokenRow[] = legs.map((leg) => {
    const assessment = assessments[leg.legId] ?? null;
    const offer = deriveExecutionOffer({ action: leg, assessment, nowMs, perLegApproval: true });
    const agedOnly = !offer.offered && offer.blockReasons.length === 1 && offer.blockReasons[0] === "quote_expired";
    const sellable = offer.offered || agedOnly;
    let blockedReason: string | null = null;
    if (!sellable) {
      const codes = [
        ...(assessment?.blockingReasons ?? []),
        ...(assessment?.candidates.flatMap((c) => c.exclusionReasons) ?? []),
      ] as string[];
      const known = codes.find((c) => TRIM_BLOCKED_REASON[c] != null);
      blockedReason = known ? TRIM_BLOCKED_REASON[known] : TRIM_BLOCKED_REASON_DEFAULT;
    }
    return {
      key: leg.legId,
      symbol: leg.inputAsset.symbol,
      icon: assetFor(leg)?.icon ?? null,
      iconUrl: assetFor(leg)?.iconUrl ?? null,
      valueUsd: leg.inputAmountUsd,
      leg,
      sellable,
      previewTokens: sellable ? assessment?.expectedOutputTokens ?? null : null,
      blockedReason,
    };
  });

  // Tokens the Trim names but the engine built no sale for: frozen, paused, or not verifiable.
  // They stay in the list with the reason, so the total above still adds up.
  const legMints = new Set(legs.map((l) => l.inputAsset.mint));
  const legSymbols = new Set(legs.map((l) => l.inputAsset.symbol));
  for (const a of assets) {
    if ((a.mint != null && legMints.has(a.mint)) || legSymbols.has(a.symbol)) continue;
    if (a.actionability == null || a.actionability === "transferable") continue;
    rows.push({
      key: `asset:${a.mint ?? a.symbol}`,
      symbol: a.symbol,
      icon: a.icon ?? null,
      iconUrl: a.iconUrl ?? null,
      valueUsd: typeof a.valueUsd === "number" ? a.valueUsd : null,
      leg: null,
      sellable: false,
      previewTokens: null,
      blockedReason: TRIM_BLOCKED_REASON.not_transferable,
    });
  }
  // Largest first: it matters most, and it is the likeliest to pass the limits.
  return rows.sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));
}

/**
 * May this outcome be tried again? Only where trying again is the remedy for something that
 * went wrong on OUR side or the network's.
 *
 * Never what the USER cancelled — a swap they declined in their wallet, or tokens the run never
 * reached because they pressed Cancel. They said no; a Try Again button under their own
 * decision asks the same question twice. The Trim stays on the dashboard if they change their
 * mind.
 *
 * Never a swap that was sent and may still land (a retry could execute both), and never one
 * whose verification was refused (the same transaction would be refused again).
 */
export function isTrimRetryable(result: TrimResult | undefined): boolean {
  if (result == null) return false;
  if (result.status === "not_offered") return true;
  if (result.status !== "failed") return false;
  switch (result.failure) {
    case "declined":
    case "cancelled":
    case "confirm_timeout":
    case "verification_failed":
      return false;
    default:
      return true;
  }
}

/** Add decimal token strings exactly (as integers at `decimals`), never through a float. */
export function sumTokenStrings(values: string[], decimals: number): string {
  let total = 0n;
  for (const v of values) {
    const m = /^(\d+)(?:\.(\d+))?$/.exec(v.trim());
    if (!m) continue;
    const frac = (m[2] ?? "").slice(0, decimals).padEnd(decimals, "0");
    total += BigInt(m[1]) * 10n ** BigInt(decimals) + BigInt(frac || "0");
  }
  const scale = 10n ** BigInt(decimals);
  const frac = (total % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${total / scale}.${frac}` : `${total / scale}`;
}

/**
 * deriveAssetAllocation — builds the Crypto Assets Allocation donut segments from
 * live priced positions, implementing the APPROVED slice-selection rule in
 * components/donut-allocation-chart.md / rules/financial-logic-boundaries.md
 * (Composition (Donut) Allocation Boundary → Slice selection and `Other` grouping).
 *
 * Priced value only. Unpriced holdings are excluded (and flagged via anyUnpriced);
 * they are NEVER placed into `Other`. No price, percentage, or grouping is invented.
 */
import { positionDisplaySymbol, type WalletPosition } from "./walletPosition";
import { STABLE_SYMBOLS } from "./walletSummary";
import { isVerifiedStableToken } from "./verifiedTokenIdentity";
import type { DonutSegment } from "../components/DonutAllocationChart";

/** Non-stable asset palette (descending value). Skips series 3 (near-teal) and 4
 *  (reserved for stables) so slice colors stay distinct. */
const CRYPTO_PALETTE = [
  "--color-chart-series-1",
  "--color-chart-series-2",
  "--color-chart-series-5",
  "--color-chart-series-6",
  "--color-chart-series-7",
  "--color-chart-series-8",
  "--color-chart-series-9",
  "--color-chart-series-10",
  "--color-chart-series-11",
  "--color-chart-series-12",
];
const STABLE_COLOR = "--color-chart-series-4";
const OTHER_COLOR = "--color-border-strong";

export interface AssetAllocation {
  segments: DonutSegment[];
  /** Total of the displayed slices (center value). */
  totalUsd: number | null;
  /** True when a real holding has no sourced price (excluded from the donut). */
  anyUnpriced: boolean;
}

export function deriveAssetAllocation(positions: WalletPosition[]): AssetAllocation {
  // Aggregate priced positions by symbol.
  const bySymbol = new Map<string, { valueUsd: number; isStable: boolean; label: string }>();
  let anyUnpriced = false;
  for (const p of positions) {
    if (typeof p.valueUsd === "number" && p.valueUsd > 0) {
      const key = p.symbol && p.symbol.trim() !== "" ? p.symbol : "Unknown";
      // Color a stablecoin teal regardless of where it sits (wallet-held or supplied).
      const isStable = STABLE_SYMBOLS.has(p.symbol) || isVerifiedStableToken(p);
      // Grouped and coloured by the engine's own symbol; a verified listing changes only the label.
      const cur = bySymbol.get(key) ?? { valueUsd: 0, isStable, label: p.listing ? positionDisplaySymbol(p) : key };
      cur.valueUsd += p.valueUsd;
      bySymbol.set(key, cur);
    } else if (typeof p.uiAmount === "number" && p.valueUsd == null) {
      anyUnpriced = true;
    }
  }

  const assets = [...bySymbol.entries()]
    .map(([symbol, v]) => ({ symbol, label: v.label, valueUsd: v.valueUsd, isStable: v.isStable }))
    .sort((a, b) => b.valueUsd - a.valueUsd);
  const total = assets.reduce((s, a) => s + a.valueUsd, 0);
  if (assets.length === 0 || total <= 0) return { segments: [], totalUsd: null, anyUnpriced };

  // Individual slice for the top 5 by value AND any asset >= 5% of the total.
  const shown: typeof assets = [];
  const rest: typeof assets = [];
  assets.forEach((a, i) => {
    const pct = (a.valueUsd / total) * 100;
    if (i < 5 || pct >= 5) shown.push(a);
    else rest.push(a);
  });
  const otherUsd = rest.reduce((s, a) => s + a.valueUsd, 0);
  const otherPct = (otherUsd / total) * 100;
  // `rest` is only non-empty when there are more than 5 priced assets; show `Other`
  // when the grouped remainder is at least 2%, otherwise hide it (drop the tiny
  // remainder and base the visible percentages on the displayed assets).
  const showOther = rest.length > 0 && otherPct >= 2;

  const displayed: Array<{ symbol: string; label: string; valueUsd: number; isStable: boolean; other?: boolean }> =
    showOther ? [...shown, { symbol: "Other", label: "Other", valueUsd: otherUsd, isStable: false, other: true }] : shown;
  const displayedTotal = displayed.reduce((s, a) => s + a.valueUsd, 0);

  let paletteIdx = 0;
  const segments: DonutSegment[] = displayed.map((a) => {
    const colorToken = a.other
      ? OTHER_COLOR
      : a.isStable
        ? STABLE_COLOR
        : CRYPTO_PALETTE[paletteIdx++ % CRYPTO_PALETTE.length];
    return {
      id: a.symbol.toLowerCase(),
      label: a.label,
      valueUsd: a.valueUsd,
      percent: (a.valueUsd / displayedTotal) * 100,
      colorToken,
      callout: true,
    };
  });

  return { segments, totalUsd: displayedTotal, anyUnpriced };
}

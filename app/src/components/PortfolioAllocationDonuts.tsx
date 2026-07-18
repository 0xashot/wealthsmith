/**
 * PortfolioAllocationDonuts — the two Portfolio composition donuts (Balance
 * Overview: Crypto vs Stables, and Crypto Assets Allocation: per-asset), built
 * from a set of positions. Shared by the real-wallet Portfolio (live positions)
 * and Demo Mode (sample positions) so both stay in sync.
 *
 * Priced value only; nothing invented. See components/donut-allocation-chart.md
 * and rules/financial-logic-boundaries.md (Composition (Donut) Allocation Boundary).
 */
import type { WalletPosition } from "../wallet/walletPosition";
import { deriveValueBreakdown, deriveStableValue } from "../wallet/walletSummary";
import { deriveAssetAllocation } from "../wallet/assetAllocation";
import DonutAllocationChart, { type DonutSegment } from "./DonutAllocationChart";
import type { PortfolioCompletenessResult } from "../wallet/portfolioCompleteness";
import { portfolioTotalDisplay, COMPLETENESS_COPY } from "./portfolioCompletenessUi";
import {
  ALLOCATION_NEEDS_PRICING,
  ALLOCATION_LABEL_CRYPTO,
  ALLOCATION_LABEL_STABLES,
  VALUE_EXCLUDES_UNPRICED,
  PORT_BALANCE_TITLE,
  PORT_ALLOCATION_TITLE,
} from "../state/approvedCopy";

/** Whole-dollar USD (no cents) for the donut center values. */
const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

interface Props {
  positions: WalletPosition[];
  /** True while the underlying data is still loading (shows donut skeletons). */
  loading?: boolean;
  /** Step 17H.3 — mounted completeness result; gates the AUTHORITATIVE total ("—" when net worth unresolved). */
  completeness?: PortfolioCompletenessResult | null;
}

export default function PortfolioAllocationDonuts({ positions, loading, completeness }: Props) {
  const value = deriveValueBreakdown(positions);
  const total = value.totalUsd;
  // Step 17H.3 — the Balance Overview center value is the AUTHORITATIVE total: "—" (never a partial
  // subtotal or $0) unless the mounted completeness says net worth is complete. Absent completeness
  // (e.g. before the rail computes it) falls back to the existing formatted value.
  const formattedTotal = total != null ? usd0(total) : "";
  const totalDisplay = completeness ? portfolioTotalDisplay(completeness, formattedTotal) : { text: formattedTotal, authoritative: true as boolean, ariaLabel: undefined as string | undefined };

  // Balance Overview — Crypto vs Stables from sourced value only.
  const stableUsd = deriveStableValue(positions);
  const cryptoUsd = total != null ? Math.max(0, total - stableUsd) : 0;
  const cryptoPct = total && total > 0 ? (cryptoUsd / total) * 100 : 0;
  const stablePct = total && total > 0 ? (stableUsd / total) * 100 : 0;
  const balanceSegments: DonutSegment[] =
    total != null && total > 0
      ? [
          {
            id: "crypto",
            label: ALLOCATION_LABEL_CRYPTO,
            valueUsd: cryptoUsd,
            percent: cryptoPct,
            colorToken: "--color-chart-series-1",
            callout: true,
          },
          {
            id: "stables",
            label: ALLOCATION_LABEL_STABLES,
            valueUsd: stableUsd,
            percent: stablePct,
            colorToken: "--color-chart-series-4",
            callout: true,
          },
        ]
      : [];
  const balanceSummary =
    `${PORT_BALANCE_TITLE}. ${ALLOCATION_LABEL_CRYPTO} ${cryptoPct.toFixed(0)}%, ` +
    `${ALLOCATION_LABEL_STABLES} ${stablePct.toFixed(0)}%.`;

  // Crypto Assets Allocation — per-asset slices (top 5 + any >= 5%, rest Other).
  const assetAlloc = deriveAssetAllocation(positions);
  const assetSummary =
    `${PORT_ALLOCATION_TITLE}. ` +
    assetAlloc.segments.map((sg) => `${sg.label} ${Math.round(sg.percent)}%`).join(", ") +
    ".";

  return (
    <>
      <section className="dash-section" aria-label={PORT_BALANCE_TITLE}>
        <h2 className="dash-section__title">{PORT_BALANCE_TITLE}</h2>
        <DonutAllocationChart
          totalValueUsd={total}
          centerLabel={totalDisplay.text}
          segments={balanceSegments}
          emptyState={ALLOCATION_NEEDS_PRICING}
          warning={value.anyUnpriced ? VALUE_EXCLUDES_UNPRICED : undefined}
          ariaSummary={totalDisplay.authoritative ? balanceSummary : `${COMPLETENESS_COPY.unresolvedTotalAria}. ${balanceSummary}`}
          loading={loading && total == null}
        />
      </section>

      <section className="dash-section" aria-label={PORT_ALLOCATION_TITLE}>
        <h2 className="dash-section__title">{PORT_ALLOCATION_TITLE}</h2>
        <DonutAllocationChart
          totalValueUsd={assetAlloc.totalUsd}
          centerLabel={assetAlloc.totalUsd != null ? usd0(assetAlloc.totalUsd) : ""}
          segments={assetAlloc.segments}
          emptyState={ALLOCATION_NEEDS_PRICING}
          warning={assetAlloc.anyUnpriced ? VALUE_EXCLUDES_UNPRICED : undefined}
          ariaSummary={assetSummary}
          loading={loading && assetAlloc.totalUsd == null}
        />
      </section>
    </>
  );
}

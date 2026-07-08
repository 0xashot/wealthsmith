/**
 * RealWalletPortfolio — the Portfolio page body when a REAL wallet is connected.
 *
 * It reuses the SAME product Portfolio structure as Demo (Balance Overview →
 * Crypto Assets Allocation → Assets Deployment Overview → Liquid Assets → Staked
 * Assets → Yield Strategies), populated entirely from live read-only positions,
 * with the full detailed "Detected Wallet Assets" table beneath. Value-based
 * fields (Portfolio Value, allocation %) show honest unavailable states; grouped
 * sections show real positions or a polished "none detected" state in the same
 * card (patterns/portfolio-overview.md — Real Connected Wallet Mode).
 *
 * The hook is called ONCE here and its state is passed to the child sections, so
 * the page performs a single read cycle. READ-ONLY: no USD value, no invented APY,
 * no Manage/execute handoffs, nothing signed or moved.
 */
import { useWalletPortfolio } from "../wallet/useWalletPortfolio";
import {
  deriveRealWalletPortfolioSummary,
  deriveValueBreakdown,
  deriveStableValue,
  formatUsd,
  groupPositionsByCategory,
  getLiquidPositions,
  getStakedPositions,
  getProtocolPositions,
} from "../wallet/walletSummary";
import LiveMetricGrid from "./LiveMetricGrid";
import DonutAllocationChart, { type DonutSegment } from "./DonutAllocationChart";
import PositionsSection from "./PositionsSection";
import LiveWalletAssets from "./LiveWalletAssets";
import EmptyStateCard from "./EmptyStateCard";
import {
  REAL_WALLET_FACT_LST,
  REAL_WALLET_FACT_STAKE,
  REAL_WALLET_FACT_PROTOCOL_POSITIONS,
  REAL_WALLET_FACT_WALLET_HELD,
  REAL_WALLET_FACT_UNKNOWN,
  ALLOCATION_NEEDS_PRICING,
  ALLOCATION_BY_VALUE_CAPTION,
  ALLOCATION_LABEL_CRYPTO,
  ALLOCATION_LABEL_STABLES,
  VALUE_EXCLUDES_UNPRICED,
  DASH_ASSET_MIX_CAPTION,
  REAL_WALLET_NONE_DETECTED,
  DETECTED_FROM_WALLET,
  PORT_BALANCE_TITLE,
  PORT_ALLOCATION_TITLE,
  PORT_DEPLOYMENT_TITLE,
  PORT_LIQUID_TITLE,
  PORT_STAKED_TITLE,
  PORT_YIELD_TITLE,
  LIVE_WALLET_LOADING,
  LIVE_WALLET_ERROR_TITLE,
  LIVE_WALLET_ERROR_DESC,
} from "../state/approvedCopy";

/** Whole-dollar USD (no cents) for the Balance Overview center value. */
const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export default function RealWalletPortfolio() {
  const { status, positions, error, warning, refresh, loading: reading } = useWalletPortfolio();
  const loading = status === "loading" && positions.length === 0;

  const summary = deriveRealWalletPortfolioSummary(positions);
  const value = deriveValueBreakdown(positions);
  const g = groupPositionsByCategory(positions);
  const liquid = getLiquidPositions(positions);
  const staked = getStakedPositions(positions);
  const protocol = getProtocolPositions(positions);

  // Balance Overview donut — Crypto vs Stables from sourced value only.
  const total = value.totalUsd;
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

  return (
    <>
      {loading ? (
        <section className="card empty-card" aria-label={LIVE_WALLET_LOADING}>
          <p className="empty-card__description" role="status">
            {LIVE_WALLET_LOADING}
          </p>
        </section>
      ) : status === "error" ? (
        <EmptyStateCard title={LIVE_WALLET_ERROR_TITLE} description={error ?? LIVE_WALLET_ERROR_DESC} />
      ) : (
        <>
          {/* Balance Overview — Crypto vs Stables composition donut (priced value). */}
          <section className="dash-section" aria-label={PORT_BALANCE_TITLE}>
            <h2 className="dash-section__title">{PORT_BALANCE_TITLE}</h2>
            <DonutAllocationChart
              totalValueUsd={total}
              centerLabel={total != null ? usd0(total) : ""}
              segments={balanceSegments}
              emptyState={ALLOCATION_NEEDS_PRICING}
              warning={value.anyUnpriced ? VALUE_EXCLUDES_UNPRICED : undefined}
              ariaSummary={balanceSummary}
              loading={reading && total == null}
            />
          </section>

          {/* Crypto Assets Allocation — value-based % when priced; else counts. */}
          {value.byCategory.length > 0 ? (
            <LiveMetricGrid
              title={PORT_ALLOCATION_TITLE}
              caption={ALLOCATION_BY_VALUE_CAPTION}
              metrics={value.byCategory.map((c) => ({
                label: c.label,
                value: `${formatUsd(c.valueUsd)} · ${c.pct.toFixed(1)}%`,
              }))}
            />
          ) : summary.categories.length > 0 ? (
            <LiveMetricGrid
              title={PORT_ALLOCATION_TITLE}
              caption={DASH_ASSET_MIX_CAPTION}
              metrics={summary.categories.map((c) => ({ label: c.label, value: String(c.count) }))}
            />
          ) : (
            <EmptyStateCard title={PORT_ALLOCATION_TITLE} description={ALLOCATION_NEEDS_PRICING} />
          )}

          {/* Assets Deployment Overview — how detected assets are deployed (counts). */}
          <LiveMetricGrid
            title={PORT_DEPLOYMENT_TITLE}
            caption={DETECTED_FROM_WALLET}
            metrics={[
              { label: REAL_WALLET_FACT_WALLET_HELD, value: String(liquid.length) },
              { label: REAL_WALLET_FACT_LST, value: String(g.lst.length) },
              { label: REAL_WALLET_FACT_STAKE, value: String(g.stake.length) },
              { label: REAL_WALLET_FACT_PROTOCOL_POSITIONS, value: String(g.protocol.length) },
              { label: REAL_WALLET_FACT_UNKNOWN, value: String(g.unknown.length) },
            ]}
          />

          {/* Liquid Assets — native + wallet-held tokens (incl. stables). */}
          <PositionsSection
            title={PORT_LIQUID_TITLE}
            caption={DETECTED_FROM_WALLET}
            positions={liquid}
            columns={["asset", "amount", "value", "type", "source"]}
            emptyText={REAL_WALLET_NONE_DETECTED}
          />

          {/* Staked Assets — recognized LSTs + native stake; APY sourced or "—". */}
          <PositionsSection
            title={PORT_STAKED_TITLE}
            caption={DETECTED_FROM_WALLET}
            positions={staked}
            columns={["asset", "amount", "value", "apy", "source"]}
            emptyText={REAL_WALLET_NONE_DETECTED}
          />

          {/* Yield Strategies — live protocol positions; APY only if sourced, else
              "—". No Manage handoffs (no approved review-only wiring yet). */}
          <PositionsSection
            title={PORT_YIELD_TITLE}
            caption={DETECTED_FROM_WALLET}
            positions={protocol}
            columns={["asset", "amount", "value", "apy", "source", "status"]}
            emptyText={REAL_WALLET_NONE_DETECTED}
          />

          {/* Detailed, full detected-assets table (repositioned below the product
              summary sections). */}
          <LiveWalletAssets
            status={status}
            positions={positions}
            error={error}
            warning={warning}
            refresh={refresh}
          />
        </>
      )}
    </>
  );
}

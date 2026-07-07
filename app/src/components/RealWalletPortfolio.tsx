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
  formatUsd,
  groupPositionsByCategory,
  getLiquidPositions,
  getStakedPositions,
  getProtocolPositions,
} from "../wallet/walletSummary";
import RealWalletHeader from "./RealWalletHeader";
import LiveMetricGrid from "./LiveMetricGrid";
import PositionsSection from "./PositionsSection";
import LiveWalletAssets from "./LiveWalletAssets";
import EmptyStateCard from "./EmptyStateCard";
import {
  REAL_WALLET_VALUE_TITLE,
  REAL_WALLET_VALUE_DESC,
  REAL_WALLET_FACT_ASSETS,
  REAL_WALLET_FACT_NATIVE_SOL,
  REAL_WALLET_FACT_TOKENS,
  REAL_WALLET_FACT_LST,
  REAL_WALLET_FACT_STAKE,
  REAL_WALLET_FACT_PROTOCOL_POSITIONS,
  REAL_WALLET_FACT_WALLET_HELD,
  REAL_WALLET_FACT_UNKNOWN,
  PRICING_NOT_CONNECTED,
  ALLOCATION_NEEDS_PRICING,
  ALLOCATION_BY_VALUE_CAPTION,
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

function formatSol(sol: number | null): string {
  if (sol == null) return "—";
  return `${sol.toLocaleString(undefined, { maximumFractionDigits: 6 })} SOL`;
}

export default function RealWalletPortfolio() {
  const { status, positions, error, warning, refresh, pricedAsOf } = useWalletPortfolio();
  const loading = status === "loading" && positions.length === 0;

  const summary = deriveRealWalletPortfolioSummary(positions);
  const value = deriveValueBreakdown(positions);
  const g = groupPositionsByCategory(positions);
  const liquid = getLiquidPositions(positions);
  const staked = getStakedPositions(positions);
  const protocol = getProtocolPositions(positions);

  // Portfolio Value: sourced total when available, else honest unavailable.
  const portfolioValueMetric =
    value.totalUsd != null
      ? {
          label: REAL_WALLET_VALUE_TITLE,
          value: formatUsd(value.totalUsd),
          note: value.anyUnpriced ? VALUE_EXCLUDES_UNPRICED : undefined,
        }
      : {
          label: REAL_WALLET_VALUE_TITLE,
          value: PRICING_NOT_CONNECTED,
          note: REAL_WALLET_VALUE_DESC,
          unavailable: true,
        };

  return (
    <>
      <RealWalletHeader status={status} warning={warning} refresh={refresh} pricedAsOf={pricedAsOf} />

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
          {/* Balance Overview — live counts + native SOL; Portfolio Value unavailable. */}
          <LiveMetricGrid
            title={PORT_BALANCE_TITLE}
            caption={DETECTED_FROM_WALLET}
            metrics={[
              portfolioValueMetric,
              { label: REAL_WALLET_FACT_ASSETS, value: String(summary.assetsDetected) },
              { label: REAL_WALLET_FACT_NATIVE_SOL, value: formatSol(summary.nativeSol) },
              { label: REAL_WALLET_FACT_TOKENS, value: String(summary.tokenCount) },
              { label: REAL_WALLET_FACT_LST, value: String(summary.lstCount) },
              { label: REAL_WALLET_FACT_PROTOCOL_POSITIONS, value: String(summary.protocolCount) },
            ]}
          />

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

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
  getLiquidPositions,
  getStakedPositions,
  getProtocolPositions,
} from "../wallet/walletSummary";
import PortfolioAllocationDonuts from "./PortfolioAllocationDonuts";
import PositionsSection from "./PositionsSection";
import LiquidAssetsCard from "./LiquidAssetsCard";
import LiveWalletAssets from "./LiveWalletAssets";
import EmptyStateCard from "./EmptyStateCard";
import {
  REAL_WALLET_NONE_DETECTED,
  DETECTED_FROM_WALLET,
  PORT_DEPLOYMENT_TITLE,
  PORT_STAKED_TITLE,
  PORT_YIELD_TITLE,
  LIVE_WALLET_LOADING,
  LIVE_WALLET_ERROR_TITLE,
  LIVE_WALLET_ERROR_DESC,
} from "../state/approvedCopy";

export default function RealWalletPortfolio() {
  const { status, positions, error, warning, refresh, loading: reading } = useWalletPortfolio();
  const loading = status === "loading" && positions.length === 0;

  const liquid = getLiquidPositions(positions);
  const staked = getStakedPositions(positions);
  const protocol = getProtocolPositions(positions);

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
          {/* Balance Overview + Crypto Assets Allocation composition donuts. */}
          <PortfolioAllocationDonuts positions={positions} loading={reading} />

          {/* Asset Deployment Overview — the category tables (Liquid / Staked /
              Yield Strategies) under one section heading. Liquid uses the new
              table card (total + Asset/Amount/USD Value/24h Change); Staked and
              Yield keep the previous tables until their redesigns land. */}
          <section className="dash-section" aria-label={PORT_DEPLOYMENT_TITLE}>
            <h2 className="dash-section__title">{PORT_DEPLOYMENT_TITLE}</h2>
            <LiquidAssetsCard positions={liquid} />
          </section>

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

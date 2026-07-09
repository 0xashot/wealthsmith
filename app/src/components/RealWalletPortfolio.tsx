/**
 * RealWalletPortfolio — the Portfolio page body when a REAL wallet is connected.
 *
 * Structure: Balance Overview + Crypto Assets Allocation donuts, then the Asset
 * Deployment Overview section with its three category tables (Liquid Assets /
 * Staked Assets / Yield Strategies), populated entirely from live read-only
 * positions. Value-based fields show honest unavailable states; empty categories
 * show a polished "none detected" state in the same card (patterns/
 * portfolio-overview.md — Real Connected Wallet Mode).
 *
 * The hook is called ONCE here and its state is passed to the child sections, so
 * the page performs a single read cycle. READ-ONLY: no invented USD value or APY;
 * Manage links are review-only new-tab handoffs — nothing signed or moved.
 */
import { useWalletPortfolio } from "../wallet/useWalletPortfolio";
import {
  getLiquidPositions,
  getStakedPositions,
  getProtocolPositions,
} from "../wallet/walletSummary";
import PortfolioAllocationDonuts from "./PortfolioAllocationDonuts";
import LiquidAssetsCard from "./LiquidAssetsCard";
import EarningAssetsCard from "./EarningAssetsCard";
import EmptyStateCard from "./EmptyStateCard";
import {
  PORT_DEPLOYMENT_TITLE,
  PORT_STAKED_TITLE,
  PORT_STAKED_CAPTION,
  PORT_YIELD_TITLE,
  PORT_YIELD_CAPTION,
  PROTOCOL_OPENED_TOAST,
  LIVE_WALLET_LOADING,
  LIVE_WALLET_ERROR_TITLE,
  LIVE_WALLET_ERROR_DESC,
} from "../state/approvedCopy";

interface Props {
  /** Approved toast for the review-only Manage handoffs (navigation only). */
  pushToast?: (message: string, helper?: string) => void;
}

export default function RealWalletPortfolio({ pushToast }: Props) {
  const { status, positions, error, loading: reading } = useWalletPortfolio();
  const loading = status === "loading" && positions.length === 0;

  const liquid = getLiquidPositions(positions);
  const staked = getStakedPositions(positions);
  const protocol = getProtocolPositions(positions);

  const onManageOpen = () => pushToast?.(PROTOCOL_OPENED_TOAST);

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

          {/* Asset Deployment Overview — the three category tables under one
              section heading. */}
          <section className="dash-section" aria-label={PORT_DEPLOYMENT_TITLE}>
            <h2 className="dash-section__title">{PORT_DEPLOYMENT_TITLE}</h2>

            {/* Liquid Assets — native + wallet-held tokens (incl. stables). */}
            <LiquidAssetsCard positions={liquid} />

            {/* Staked Assets — recognized LSTs + native stake; APY sourced or "—".
                The asset sub-label is the PROTOCOL: an LST's protocol (Marinade/…),
                or, for native stake, the recognized validator ("Jupiter") else the
                generic "Native Stake". */}
            <EarningAssetsCard
              title={PORT_STAKED_TITLE}
              caption={PORT_STAKED_CAPTION}
              valueHeader="USD Value"
              positions={staked}
              onManageOpen={onManageOpen}
            />

            {/* Yield Strategies — live protocol positions (vaults/lending); the
                asset cell shows the underlying token symbol + protocol. */}
            <EarningAssetsCard
              title={PORT_YIELD_TITLE}
              caption={PORT_YIELD_CAPTION}
              valueHeader="Value"
              positions={protocol}
              onManageOpen={onManageOpen}
            />
          </section>
        </>
      )}
    </>
  );
}

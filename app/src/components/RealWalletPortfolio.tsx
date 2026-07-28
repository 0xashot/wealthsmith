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
import { useRailSuggestions, type RailSuggestions } from "../suggestions/useRailSuggestions";
import { useKlendDirectUsdcMarketSnapshot, freshSnapshotOrNull } from "../suggestions/useKlendDirectUsdcMarketSnapshot";
import type { SavedGoal } from "../types/goal";
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
  LIVE_WALLET_ERROR_TITLE,
  LIVE_WALLET_ERROR_DESC,
} from "../state/approvedCopy";

interface Props {
  /** Approved toast for the review-only Manage handoffs (navigation only). */
  pushToast?: (message: string, helper?: string) => void;
  /** Saved plan — drives the shared real-wallet Suggestion Engine rail. */
  goal?: SavedGoal;
  /** Receive engine suggestions for the Portfolio right rail (same as Dashboard). */
  onSuggestions?: (data: RailSuggestions) => void;
}

export default function RealWalletPortfolio({ pushToast, goal, onSuggestions }: Props) {
  const { status, positions, error, pricedAsOf, loading: reading } = useWalletPortfolio();
  // "Settled" = the read AND pricing pass have both completed. Until then every
  // deployment card skeletons, so no category flashes its "none detected" empty
  // state while positions/prices are still resolving.
  const settled = status === "ready" && !reading;
  // The rail shows the "preparing" loader on the SAME lifecycle as the body
  // skeletons (read + pricing), not just the initial read. This keeps it from
  // flashing a partial-pricing notice or an "unavailable" card while prices are
  // still resolving. A hard wallet error is not a loading state (the rail then
  // shows its unavailable state alongside the body error).
  const railLoading = status !== "error" && !settled;

  // SAME shared hook + engine the Dashboard uses — no Portfolio-specific
  // suggestion logic. It reuses THIS component's single wallet read.
  const klendMarket = useKlendDirectUsdcMarketSnapshot();
  const rail = useRailSuggestions({ positions, pricedAsOf, goal, loading: railLoading, onSuggestions, klendMarketSnapshot: freshSnapshotOrNull(klendMarket) });

  const liquid = getLiquidPositions(positions);
  const staked = getStakedPositions(positions);
  const protocol = getProtocolPositions(positions);

  const onManageOpen = () => pushToast?.(PROTOCOL_OPENED_TOAST);

  return (
    <>
      {status === "error" ? (
        <EmptyStateCard title={LIVE_WALLET_ERROR_TITLE} description={error ?? LIVE_WALLET_ERROR_DESC} />
      ) : (
        <>
          {/* Balance Overview + Crypto Assets Allocation composition donuts. */}
          <PortfolioAllocationDonuts positions={positions} loading={!settled} completeness={rail.portfolioCompleteness} />

          {/* Asset Deployment Overview — the three category tables under one section
              heading. Every card skeletons until the read + pricing settle, so no
              category flashes its "none detected" empty state mid-load. */}
          <section className="dash-section" aria-label={PORT_DEPLOYMENT_TITLE} aria-busy={settled ? undefined : true}>
            <h2 className="dash-section__title">{PORT_DEPLOYMENT_TITLE}</h2>

            {/* Liquid Assets — native + wallet-held tokens (incl. stables). */}
            <LiquidAssetsCard positions={liquid} loading={!settled} completeness={rail.portfolioCompleteness} />

            {/* Staked Assets — recognized LSTs + native stake; APY sourced or "—".
                The asset sub-label is the PROTOCOL: an LST's protocol (Marinade/…),
                or, for native stake, the recognized validator ("Jupiter") else the
                generic "Native Stake". */}
            <EarningAssetsCard
              title={PORT_STAKED_TITLE}
              caption={PORT_STAKED_CAPTION}
              valueHeader="USD Value"
              positions={staked}
              loading={!settled}
              onManageOpen={onManageOpen}
              completeness={rail.portfolioCompleteness}
            />

            {/* Yield Strategies — live protocol positions (vaults/lending); the
                asset cell shows the underlying token symbol + protocol. */}
            <EarningAssetsCard
              title={PORT_YIELD_TITLE}
              caption={PORT_YIELD_CAPTION}
              valueHeader="Value"
              positions={protocol}
              loading={!settled}
              onManageOpen={onManageOpen}
              completeness={rail.portfolioCompleteness}
            />
          </section>
        </>
      )}
    </>
  );
}

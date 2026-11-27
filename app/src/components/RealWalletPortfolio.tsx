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
import ExternalHoldingsSection from "./ExternalHoldingsSection";
import { useManualAssets } from "../wallet/manualAssetPositions";
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
  const { status, positions, leftOutTokens, error, pricedAsOf, loading: reading } = useWalletPortfolio();
  // Manually added External Holdings (BTC/ETH) — display + allocation measurement.
  const manual = useManualAssets();
  // "Settled" = the wallet read, its pricing pass, AND the external BTC/ETH price
  // feed have all completed. Until then every deployment card skeletons, so no
  // category flashes its "none detected" empty state while data is still
  // resolving. The external feed is part of this because it resolves FASTER than
  // the wallet: without it the page would briefly render a portfolio composed of
  // nothing but the manually added assets.
  const settled = status === "ready" && !reading && !manual.pricesLoading;
  // The rail shows the "preparing" loader on the SAME lifecycle as the body
  // skeletons (read + pricing), not just the initial read. This keeps it from
  // flashing a partial-pricing notice or an "unavailable" card while prices are
  // still resolving. A hard wallet error is not a loading state (the rail then
  // shows its unavailable state alongside the body error).
  const railLoading = status !== "error" && !settled;

  // SAME shared hook + engine the Dashboard uses — no Portfolio-specific
  // suggestion logic. It reuses THIS component's single wallet read.
  const klendMarket = useKlendDirectUsdcMarketSnapshot();
  const rail = useRailSuggestions({ positions, pricedAsOf, goal, loading: railLoading, onSuggestions, klendMarketSnapshot: freshSnapshotOrNull(klendMarket), externalMeasurementPositions: manual.positions });

  // These join the DISPLAY arrays below; the rail above receives them only as an
  // allocation MEASUREMENT input (never as positions, never as a sell source).
  //
  // Held back until `settled`: the donuts drop their skeleton as soon as they can
  // compute a total, so contributing manual assets early would render a portfolio
  // that is 100% BTC/ETH while the wallet is still being read. Withholding them
  // (rather than forcing the skeleton on) also preserves the no-flash behaviour on
  // a background refresh, where the wallet positions are retained.
  const displayPositions =
    settled && manual.positions.length > 0 ? [...positions, ...manual.positions] : positions;

  const liquid = getLiquidPositions(displayPositions);
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
          <PortfolioAllocationDonuts positions={displayPositions} loading={!settled} completeness={rail.portfolioCompleteness} />

          {/* Asset Deployment Overview — the three category tables under one section
              heading. Every card skeletons until the read + pricing settle, so no
              category flashes its "none detected" empty state mid-load. */}
          <section className="dash-section" aria-label={PORT_DEPLOYMENT_TITLE} aria-busy={settled ? undefined : true}>
            <h2 className="dash-section__title">{PORT_DEPLOYMENT_TITLE}</h2>

            {/* Liquid Assets — native + wallet-held tokens (incl. stables). */}
            {/* Tokens we could not verify are listed last, with no value, and are never in a total. */}
            <LiquidAssetsCard positions={liquid} leftOut={settled ? leftOutTokens : []} loading={!settled} completeness={rail.portfolioCompleteness} />

            {/* Staked Assets — recognized LSTs + native stake; APY sourced or "—".
                The asset sub-label is the PROTOCOL: an LST's protocol (Marinade/…),
                or, for native stake, the recognized validator ("Jupiter") else the
                generic "Native Stake". */}
            <EarningAssetsCard
              title={PORT_STAKED_TITLE}
              caption={PORT_STAKED_CAPTION}
              valueHeader="Value"
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

          {/* External Holdings — manually added BTC/ETH (empty state for now).
              Display-only: never part of totals, allocation, or suggestions. */}
          <ExternalHoldingsSection
            loading={!settled}
            amounts={manual.amounts}
            prices={manual.prices}
            onSetAmount={manual.setAmount}
            onClearAmount={manual.clearAmount}
            pushToast={pushToast}
          />
        </>
      )}
    </>
  );
}

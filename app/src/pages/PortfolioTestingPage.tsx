/**
 * PortfolioTestingPage — a HIDDEN, fixture-only design surface at `/portfolio-testing`.
 *
 * Renders every Portfolio section (Balance Overview + Crypto Assets Allocation donuts,
 * and the Asset Deployment Overview tables — Liquid / Staked / Yield) in its
 * non-populated states — EMPTY and LOADING — using the SAME production components the
 * real Portfolio uses, driven by empty props. So refining an empty/loading state here
 * refines it everywhere.
 *
 * SAFETY: read-only, no wallet, no live/Demo state, no transaction. Not linked in
 * navigation and reachable only by opening the URL directly (and only when the internal
 * route is enabled — see isTestingPageEnabled()).
 */
import PortfolioAllocationDonuts from "../components/PortfolioAllocationDonuts";
import LiquidAssetsCard from "../components/LiquidAssetsCard";
import EarningAssetsCard from "../components/EarningAssetsCard";
import {
  PORT_DEPLOYMENT_TITLE,
  PORT_STAKED_TITLE,
  PORT_STAKED_CAPTION,
  PORT_YIELD_TITLE,
  PORT_YIELD_CAPTION,
} from "../state/approvedCopy";
import type { WalletPosition } from "../wallet/walletPosition";
import "../styles/dashboard.css";
import "./testingPage.css";

/**
 * Tokens outside the approved registry, with and without a verified listing (wallet/tokenListings.ts).
 * Fixture rows only. The engine identity of every unnamed row is the same shortened address and
 * "Unknown token"; only what the screen calls it differs.
 */
const unnamedToken = (id: string, mint: string, uiAmount: number, valueUsd: number | null, listing?: WalletPosition["listing"]): WalletPosition => ({
  id, source: "wallet", type: "token", symbol: `${mint.slice(0, 4)}…${mint.slice(-4)}`, name: "Unknown token", mint,
  amount: String(Math.round(uiAmount * 1e6)), uiAmount, decimals: 6, detection: "direct_wallet_balance",
  priceUsd: valueUsd != null ? valueUsd / uiAmount : null, valueUsd, apy: null, ...(listing ? { listing } : {}),
});
const LISTED_TOKEN_POSITIONS: WalletPosition[] = [
  {
    id: "listed-usdc", source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    icon: "assets/icons/token/usdc.svg", amount: "1250000000", uiAmount: 1250, decimals: 6, detection: "direct_wallet_balance", priceUsd: 1, valueUsd: 1250, apy: null,
  },
  unnamedToken("listed-pyusd", "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo", 400, 400, {
    symbol: "PYUSD", name: "PayPal USD", source: "jupiter_verified",
    iconUrl: "https://static.datapi.jup.ag/token-icons/0817b3345e648b1663385bac48eb086877635ee27639c3d5da2a4d9dfd8603b1.webp",
  }),
  // Verified, but its icon is on a host we do not load from: real name, generic icon.
  unnamedToken("listed-no-icon", "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4", 30, 140, { symbol: "JLP", name: "Jupiter Perps", source: "jupiter_verified", iconUrl: null }),
  // Verified, icon allowed, but the image fails to load: falls back to the generic icon.
  unnamedToken("listed-broken-icon", "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn", 20000, 90, {
    symbol: "PUMP", name: "Pump", source: "jupiter_verified", iconUrl: "https://static.datapi.jup.ag/token-icons/this-image-does-not-exist.webp",
  }),
  // Not verified by Jupiter: keeps its address.
  unnamedToken("unlisted", "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin", 1200, 35),
];

/** The three Asset Deployment category tables, driven by the same components as the real page. */
function DeploymentSection({ loading }: { loading?: boolean }) {
  return (
    <section className="dash-section" aria-label={PORT_DEPLOYMENT_TITLE}>
      <h2 className="dash-section__title">{PORT_DEPLOYMENT_TITLE}</h2>
      <LiquidAssetsCard positions={[]} loading={loading} completeness={null} />
      <EarningAssetsCard
        title={PORT_STAKED_TITLE}
        caption={PORT_STAKED_CAPTION}
        valueHeader="Value"
        positions={[]}
        loading={loading}
        completeness={null}
      />
      <EarningAssetsCard
        title={PORT_YIELD_TITLE}
        caption={PORT_YIELD_CAPTION}
        valueHeader="Value"
        positions={[]}
        loading={loading}
        completeness={null}
      />
    </section>
  );
}

export default function PortfolioTestingPage() {
  return (
    <main className="testing-page">
      <header className="testing-page__header">
        <p className="testing-page__eyebrow">Internal · not a live view</p>
        <h1 className="testing-page__title">Portfolio — Empty &amp; Loading States</h1>
        <p className="testing-page__subtext">
          Every Portfolio section in its non-populated states, rendered with the real
          components for design refinement. Read-only; no wallet is connected.
        </p>
      </header>

      <section className="portfolio-testing__group">
        <h2 className="portfolio-testing__group-title">Empty state</h2>
        <div className="portfolio-testing__stage">
          <PortfolioAllocationDonuts positions={[]} completeness={null} />
          <DeploymentSection />
        </div>
      </section>

      <section className="portfolio-testing__group">
        <h2 className="portfolio-testing__group-title">Tokens outside the approved list</h2>
        <p className="testing-page__subtext">
          A token Jupiter has verified shows its listed ticker and icon; one it has not keeps its
          shortened address. The chart and the table are labelled the same way.
        </p>
        <div className="portfolio-testing__stage">
          <PortfolioAllocationDonuts positions={LISTED_TOKEN_POSITIONS} completeness={null} />
          <LiquidAssetsCard positions={LISTED_TOKEN_POSITIONS} completeness={null} />
        </div>
      </section>

      <section className="portfolio-testing__group">
        <h2 className="portfolio-testing__group-title">Loading skeleton</h2>
        <div className="portfolio-testing__stage">
          <PortfolioAllocationDonuts positions={[]} loading completeness={null} />
          <DeploymentSection loading />
        </div>
      </section>
    </main>
  );
}

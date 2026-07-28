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
import "../styles/dashboard.css";
import "./testingPage.css";

/** The three Asset Deployment category tables, driven by the same components as the real page. */
function DeploymentSection({ loading }: { loading?: boolean }) {
  return (
    <section className="dash-section" aria-label={PORT_DEPLOYMENT_TITLE}>
      <h2 className="dash-section__title">{PORT_DEPLOYMENT_TITLE}</h2>
      <LiquidAssetsCard positions={[]} loading={loading} completeness={null} />
      <EarningAssetsCard
        title={PORT_STAKED_TITLE}
        caption={PORT_STAKED_CAPTION}
        valueHeader="USD Value"
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
        <h2 className="portfolio-testing__group-title">Loading skeleton</h2>
        <div className="portfolio-testing__stage">
          <PortfolioAllocationDonuts positions={[]} loading completeness={null} />
          <DeploymentSection loading />
        </div>
      </section>
    </main>
  );
}

/**
 * Types for the Portfolio Overview page state.
 *
 * Composed from the approved Portfolio fixtures (examples/portfolio/*). The UI
 * renders this state; it never computes, classifies, or invents any of it.
 *
 * Step 1 covers the Asset Deployment Overview only. The Liquid / Staked /
 * Yield section tables are added in the next step.
 */

export interface DeploymentSegment {
  label: string;
  value_usd: number;
  percent: number;
}

export interface LiquidAssetRow {
  id: string;
  asset: { symbol: string; name: string; icon: string };
  category: { label: string; value: string };
  /** Preformatted currency string from the fixture (e.g. "$5,500"). */
  display_value: string;
  /** Preformatted % of the full $15,500 portfolio (e.g. "35.48%"). */
  display_portfolio_share: string;
  status: { label: string; value: string };
}

export interface LiquidSection {
  title: string;
  description: string;
  rows: LiquidAssetRow[];
  summary: { label: string; display_value: string };
  empty: { title: string; description: string };
}

export interface PortfolioPageState {
  /** Canonical connected-wallet total (aligned with the Dashboard: $15,500). */
  total_value_usd: number;
  page_header: { title: string; description?: string };
  deployment: {
    title: string;
    segments: DeploymentSegment[];
  };
  liquid: LiquidSection;
}

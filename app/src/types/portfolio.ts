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

export interface PortfolioPageState {
  /** Canonical connected-wallet total (aligned with the Dashboard: $15,500). */
  total_value_usd: number;
  page_header: { title: string; description?: string };
  deployment: {
    title: string;
    segments: DeploymentSegment[];
  };
}

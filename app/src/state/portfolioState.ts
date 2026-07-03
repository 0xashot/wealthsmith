/**
 * Loads the Portfolio Overview page state (read-only; examples/ never modified).
 *
 * The three Portfolio fixtures are separate scenarios; the yield-strategies
 * fixture is the COMPLETE connected-wallet portfolio ($15,500 with all three
 * deployment categories), so its `portfolio_summary` + `asset_deployment_overview`
 * are the canonical source for the total and the deployment segments:
 *   Liquid $7,500 + Staked $4,500 + Yield $3,500 = $15,500.
 *
 * This matches the aligned Dashboard total ($15,500). The Liquid / Staked /
 * Yield section tables (from all three fixtures) are added in the next step.
 *
 * Page title "Portfolio" is the approved nav/page label (patterns/
 * portfolio-overview.md, components/page-header.md). No page-level description
 * is defined in the fixtures, so none is rendered (nothing invented).
 */
import yieldFixture from "../../../examples/portfolio/portfolio-yield-strategies.json";
import type { PortfolioPageState } from "../types/portfolio";

const y = yieldFixture as any;

export const portfolioState: PortfolioPageState = {
  total_value_usd: y.portfolio_summary.total_value_usd,
  page_header: { title: "Portfolio" },
  deployment: {
    title: y.asset_deployment_overview.title,
    segments: y.asset_deployment_overview.segments,
  },
};

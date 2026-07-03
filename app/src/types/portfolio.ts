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

/** Est. APY / Est. Earnings cell: a preformatted string that is either the
 *  approved value ("6.40%", "$128/yr est.") or the approved "Unavailable"
 *  state. `available` drives muted styling only — the string is never
 *  computed or invented (unavailable APY/earnings stay "Unavailable"). */
export interface EstimatedCell {
  display: string;
  available: boolean;
}

export interface StakedAssetRow {
  id: string;
  asset: { symbol: string; name: string; icon: string };
  protocol: { id: string; label: string; icon: string };
  /** Position type label from the fixture (e.g. "Liquid Staking Token"). */
  type_label: string;
  /** Preformatted currency string from the fixture (e.g. "$2,000"). */
  display_value: string;
  estimated_apy: EstimatedCell;
  estimated_earnings: EstimatedCell;
  /** Manage handoff label from the fixture (e.g. "Manage on Jito"). */
  action_label: string;
  /** Fixture `action.destination_url` if valid; null keeps Manage disabled. */
  action_href: string | null;
}

export interface StakedSection {
  title: string;
  description: string;
  rows: StakedAssetRow[];
  summary: { label: string; display_value: string };
  empty: { title: string; description: string };
  /** Approved fixture disclaimer copy (APY + earnings tooltips), surfaced under
   *  the table via aria-describedby. */
  note: string;
}

export interface YieldStrategyAsset {
  symbol: string;
  name: string;
  icon: string;
}

export interface YieldStrategyRow {
  id: string;
  /** Strategy label from the fixture (e.g. "USDC Lending", "SOL/USDC Liquidity"). */
  strategy_label: string;
  protocol: { id: string; label: string; icon: string };
  /** One or more tokens in the strategy (LP pairs show both sides). */
  assets: YieldStrategyAsset[];
  /** Preformatted currency string from the fixture (e.g. "$1,500"). */
  display_value: string;
  estimated_apy: EstimatedCell;
  estimated_earnings: EstimatedCell;
  /** Visible risk-note text from the fixture (e.g. "Lending risk"). */
  risk_note_label: string;
  /** Manage handoff label from the fixture (e.g. "Manage on Kamino"). */
  action_label: string;
  /** Fixture `action.destination_url` if valid; null keeps Manage disabled. */
  action_href: string | null;
}

export interface YieldSection {
  title: string;
  description: string;
  rows: YieldStrategyRow[];
  summary: { label: string; display_value: string };
  empty: { title: string; description: string };
  /** Approved fixture disclaimer copy (APY + earnings + risk tooltips),
   *  surfaced under the table via aria-describedby. */
  note: string;
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
  staked: StakedSection;
  yield: YieldSection;
}

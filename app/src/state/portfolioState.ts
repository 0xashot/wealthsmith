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
import liquidFixture from "../../../examples/portfolio/portfolio-liquid-assets.json";
import stakedFixture from "../../../examples/portfolio/portfolio-staked-assets.json";
import type {
  LiquidAssetRow,
  StakedAssetRow,
  YieldStrategyRow,
  PortfolioPageState,
} from "../types/portfolio";

const y = yieldFixture as any;
const lq = liquidFixture as any;
const st = stakedFixture as any;

/**
 * Resolve a fixture Manage handoff destination URL. Only http(s) URLs from the
 * fixture are accepted; anything missing/invalid returns null so the row keeps
 * a disabled Manage (fixture-approved deferred state). Missing URLs are
 * reported — never invented (rules/protocol-selection-rules.md).
 */
function resolveActionHref(action: any, rowId: string): string | null {
  const url = action?.destination_url;
  if (typeof url === "string" && /^https?:\/\//.test(url)) return url;
  console.error(
    `[design-system] Manage action for row "${rowId}" has no valid destination_url; ` +
      "keeping Manage disabled (no URL invented)."
  );
  return null;
}

const liquidRows: LiquidAssetRow[] = lq.table.rows.map((r: any) => ({
  id: r.id,
  asset: { symbol: r.asset.symbol, name: r.asset.name, icon: r.asset.icon },
  category: r.category,
  display_value: r.display_value,
  display_portfolio_share: r.display_portfolio_share,
  status: r.status,
}));

// Staked rows are rendered from the fixture only. Est. APY / Est. Earnings use
// the fixture's preformatted `display` (available value or "Unavailable"); the
// `status` flag drives muted styling only — no APY/earnings are computed.
const stakedRows: StakedAssetRow[] = st.table.rows.map((r: any) => ({
  id: r.id,
  asset: { symbol: r.asset.symbol, name: r.asset.name, icon: r.asset.icon },
  protocol: { id: r.protocol.id, label: r.protocol.label, icon: r.protocol.icon },
  type_label: r.position_type.label,
  display_value: r.display_value,
  estimated_apy: {
    display: r.estimated_apy.display,
    available: r.estimated_apy.status === "available",
  },
  estimated_earnings: {
    display: r.estimated_earnings.display,
    available: r.estimated_earnings.status === "available",
  },
  action_label: r.action.label,
  action_href: resolveActionHref(r.action, r.id),
}));

// Yield-strategy rows are rendered from the yield fixture only. Assets is the
// fixture's token list (LP pairs list both sides); risk notes and Est. cells
// come straight from the fixture — nothing is computed or classified here.
const yieldRows: YieldStrategyRow[] = y.table.rows.map((r: any) => ({
  id: r.id,
  strategy_label: r.strategy.label,
  protocol: { id: r.protocol.id, label: r.protocol.label, icon: r.protocol.icon },
  assets: r.assets.map((a: any) => ({ symbol: a.symbol, name: a.name, icon: a.icon })),
  display_value: r.display_value,
  estimated_apy: {
    display: r.estimated_apy.display,
    available: r.estimated_apy.status === "available",
  },
  estimated_earnings: {
    display: r.estimated_earnings.display,
    available: r.estimated_earnings.status === "available",
  },
  risk_note_label: r.risk_note.label,
  action_label: r.action.label,
  action_href: resolveActionHref(r.action, r.id),
}));

// Approved estimate/risk disclaimers, surfaced under each table. Only the
// fixture's own `copy.*_tooltip` strings are used (verbatim); missing ones are
// simply omitted — no disclaimer copy is invented. Joined with a space for a
// single aria-describedby note (announced once on table entry).
const joinNotes = (...parts: (string | undefined)[]) =>
  parts.filter((p): p is string => typeof p === "string" && p.length > 0).join(" ");

const stakedNote = joinNotes(st.copy.apy_tooltip, st.copy.earnings_tooltip, st.copy.risk_tooltip);
const yieldNote = joinNotes(y.copy.apy_tooltip, y.copy.earnings_tooltip, y.copy.risk_tooltip);

export const portfolioState: PortfolioPageState = {
  total_value_usd: y.portfolio_summary.total_value_usd,
  page_header: { title: "Portfolio" },
  deployment: {
    title: y.asset_deployment_overview.title,
    segments: y.asset_deployment_overview.segments,
  },
  liquid: {
    title: lq.section.title,
    description: lq.section.description,
    rows: liquidRows,
    summary: {
      label: lq.table.summary_row.label,
      display_value: lq.table.summary_row.display_value,
    },
    empty: {
      title: lq.copy.empty_title,
      description: lq.copy.empty_description,
    },
  },
  staked: {
    title: st.section.title,
    description: st.section.description,
    rows: stakedRows,
    summary: {
      label: st.table.summary_row.label,
      display_value: st.table.summary_row.display_value,
    },
    empty: {
      title: st.copy.empty_title,
      description: st.copy.empty_description,
    },
    note: stakedNote,
  },
  yield: {
    title: y.section.title,
    description: y.section.description,
    rows: yieldRows,
    summary: {
      label: y.table.summary_row.label,
      display_value: y.table.summary_row.display_value,
    },
    empty: {
      title: y.copy.empty_title,
      description: y.copy.empty_description,
    },
    note: yieldNote,
  },
};

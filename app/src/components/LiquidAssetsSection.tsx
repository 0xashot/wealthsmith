/**
 * LiquidAssetsSection — Liquid Assets table per patterns/portfolio-overview.md.
 *
 * Renders the fixture's liquid rows (Asset identity, Category badge, Value,
 * Status) via the reusable PortfolioTable. Plain liquid wallet balances carry
 * no `actions`, so no Manage links are shown (fixture + pattern). No prices,
 * percentages, or copy are computed — only fixture values are rendered.
 *
 * Portfolio Share is each liquid asset's share of the full $15,500 portfolio
 * (fixture values, aligned in source-of-truth: SOL 35.48% / BONK 7.74% /
 * USDC 5.16%). The summary row shows the total value only, not a total-share %
 * (the fixture's summary share is the standalone-scenario value and is not
 * rendered).
 */
import type { LiquidSection } from "../types/portfolio";
import PortfolioTable, {
  type PortfolioColumn,
  type PortfolioRow,
} from "./PortfolioTable";
import AssetIdentity from "./AssetIdentity";
import Badge from "./Badge";

const COLUMNS: PortfolioColumn[] = [
  { id: "asset", label: "Asset" },
  { id: "category", label: "Category" },
  { id: "value", label: "Value", align: "right" },
  { id: "portfolio_share", label: "Portfolio Share", align: "right" },
  { id: "status", label: "Status" },
];

export default function LiquidAssetsSection({ section }: { section: LiquidSection }) {
  const rows: PortfolioRow[] = section.rows.map((r) => ({
    id: r.id,
    cells: [
      <AssetIdentity iconPath={r.asset.icon} name={r.asset.name} symbol={r.asset.symbol} />,
      <Badge label={r.category.label} tone="neutral" />,
      <span className="portfolio-table__value">{r.display_value}</span>,
      <span className="portfolio-table__value">{r.display_portfolio_share}</span>,
      <span className="portfolio-table__status">{r.status.label}</span>,
    ],
  }));

  const summaryCells = [
    section.summary.label,
    "",
    <span className="portfolio-table__value">{section.summary.display_value}</span>,
    "",
    "",
  ];

  return (
    <PortfolioTable
      title={section.title}
      description={section.description}
      columns={COLUMNS}
      rows={rows}
      summaryCells={summaryCells}
      emptyTitle={section.empty.title}
      emptyDescription={section.empty.description}
    />
  );
}

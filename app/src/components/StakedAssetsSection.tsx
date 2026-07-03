/**
 * StakedAssetsSection — Staked Assets table per patterns/portfolio-overview.md.
 *
 * Renders the fixture's staked rows via the reusable PortfolioTable, using the
 * columns the fixture defines: Asset, Protocol, Type, Value, Est. APY, Est.
 * Earnings, Action. No prices, APY, earnings, shares, or copy are computed —
 * only fixture values are rendered, and unavailable APY/earnings show the
 * approved "Unavailable" state (never invented).
 *
 * Action (Manage) is DEFERRED this step: the fixture provides Manage handoffs,
 * but the external protocol handoff is out of scope here, so the control is
 * rendered disabled/non-functional (no navigation, no window.open, no
 * transaction, no signature, no completion). It is wired up in a later step.
 *
 * The fixture's Staked table has no Portfolio Share column, so the fixture's
 * standalone-scenario share fields (portfolio_summary / portfolio_share_percent,
 * computed against a $12,000 subset) are intentionally not rendered — only the
 * $4,500 staked total (consistent with the composed $15,500 portfolio) shows.
 */
import type { StakedSection, EstimatedCell } from "../types/portfolio";
import PortfolioTable, {
  type PortfolioColumn,
  type PortfolioRow,
} from "./PortfolioTable";
import AssetIdentity from "./AssetIdentity";
import ProtocolIdentity from "./ProtocolIdentity";

const COLUMNS: PortfolioColumn[] = [
  { id: "asset", label: "Asset" },
  { id: "protocol", label: "Protocol" },
  { id: "type", label: "Type" },
  { id: "value", label: "Value", align: "right" },
  { id: "estimated_apy", label: "Est. APY", align: "right" },
  { id: "estimated_earnings", label: "Est. Earnings", align: "right" },
  { id: "action", label: "Action", align: "right" },
];

/** Render a fixture Est. cell string; mute it when it's the Unavailable state. */
function estimated(cell: EstimatedCell) {
  return cell.available ? (
    <span className="portfolio-table__value">{cell.display}</span>
  ) : (
    <span className="portfolio-table__unavailable">{cell.display}</span>
  );
}

export default function StakedAssetsSection({ section }: { section: StakedSection }) {
  const rows: PortfolioRow[] = section.rows.map((r) => ({
    id: r.id,
    cells: [
      <AssetIdentity iconPath={r.asset.icon} name={r.asset.name} symbol={r.asset.symbol} />,
      <ProtocolIdentity iconPath={r.protocol.icon} name={r.protocol.label} />,
      <span className="portfolio-table__type">{r.type_label}</span>,
      <span className="portfolio-table__value">{r.display_value}</span>,
      estimated(r.estimated_apy),
      estimated(r.estimated_earnings),
      // Deferred Manage handoff: disabled, non-functional. No href/onClick,
      // so nothing opens, executes, signs, or completes this step.
      <button type="button" className="portfolio-table__manage" disabled>
        {r.action_label}
      </button>,
    ],
  }));

  const summaryCells = [
    section.summary.label,
    "",
    "",
    <span className="portfolio-table__value">{section.summary.display_value}</span>,
    "",
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

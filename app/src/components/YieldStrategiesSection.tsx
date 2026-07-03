/**
 * YieldStrategiesSection — Yield Strategies table per patterns/portfolio-overview.md.
 *
 * Renders the fixture's yield-strategy rows via the reusable PortfolioTable,
 * using the columns the fixture defines: Strategy, Protocol, Assets, Value,
 * Est. APY, Est. Earnings, Risk Note, Action. No prices, APY, earnings, shares,
 * or risk labels are computed — only fixture values are rendered, and
 * unavailable APY/earnings show the approved "Unavailable" state (never
 * invented). Risk notes render as visible text, never color-only.
 *
 * Action (Manage) is a review-only external handoff (ManageHandoff): where the
 * fixture provides a valid destination URL it opens the protocol in a new tab
 * and toasts — it never executes a transaction, requests a signature, moves
 * funds, marks anything complete, or changes row state. URL-less rows stay
 * disabled.
 */
import type { YieldSection, YieldStrategyAsset, EstimatedCell } from "../types/portfolio";
import PortfolioTable, {
  type PortfolioColumn,
  type PortfolioRow,
} from "./PortfolioTable";
import ProtocolIdentity from "./ProtocolIdentity";
import ManageHandoff from "./ManageHandoff";
import { resolveTokenIcon } from "../state/iconRegistry";

const COLUMNS: PortfolioColumn[] = [
  { id: "strategy", label: "Strategy" },
  { id: "protocol", label: "Protocol" },
  { id: "assets", label: "Assets" },
  { id: "value", label: "Value", align: "right" },
  { id: "estimated_apy", label: "Est. APY", align: "right" },
  { id: "estimated_earnings", label: "Est. Earnings", align: "right" },
  { id: "risk_note", label: "Risk Note" },
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

/** Compact token list for the Assets column: each token is a decorative icon
 *  paired with its visible symbol (icon is never the only identifier). LP pairs
 *  list both sides. Nothing is computed — tokens come straight from the fixture. */
function StrategyAssets({ assets }: { assets: YieldStrategyAsset[] }) {
  return (
    <span className="portfolio-table__assets">
      {assets.map((a) => {
        const icon = resolveTokenIcon(a.icon);
        return (
          <span className="portfolio-table__asset" key={a.symbol}>
            <img
              className="portfolio-table__asset-icon"
              src={icon.url}
              alt=""
              width={18}
              height={18}
              aria-hidden="true"
            />
            <span className="portfolio-table__asset-symbol">{a.symbol}</span>
          </span>
        );
      })}
    </span>
  );
}

interface Props {
  section: YieldSection;
  /** Reports a Manage handoff click upward (toast only — no state change). */
  onManage: () => void;
}

export default function YieldStrategiesSection({ section, onManage }: Props) {
  const rows: PortfolioRow[] = section.rows.map((r) => ({
    id: r.id,
    cells: [
      <span className="portfolio-table__strategy">{r.strategy_label}</span>,
      <ProtocolIdentity iconPath={r.protocol.icon} name={r.protocol.label} />,
      <StrategyAssets assets={r.assets} />,
      <span className="portfolio-table__value">{r.display_value}</span>,
      estimated(r.estimated_apy),
      estimated(r.estimated_earnings),
      <span className="portfolio-table__risk">{r.risk_note_label}</span>,
      // Review-only external handoff: opens the protocol in a new tab + toasts.
      // Accessible name contains the visible label verbatim (WCAG 2.5.3 Label
      // in Name), then says what opens and where.
      <ManageHandoff
        label={r.action_label}
        href={r.action_href}
        accessibleName={`${r.action_label}. Opens ${r.protocol.label} in a new tab.`}
        onOpen={onManage}
      />,
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
    "",
  ];

  return (
    <PortfolioTable
      title={section.title}
      description={section.description}
      columns={COLUMNS}
      rows={rows}
      summaryCells={summaryCells}
      note={section.note}
      emptyTitle={section.empty.title}
      emptyDescription={section.empty.description}
    />
  );
}

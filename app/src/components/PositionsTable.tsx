/**
 * PositionsTable — presentational, READ-ONLY table of WalletPosition rows with a
 * configurable column set. It renders only live on-chain facts: on-chain amount,
 * SOURCED APY (or "—"), type, source, and supplied/borrowed status. It never
 * computes or invents a USD value, an APY, or a Manage/execute action.
 *
 * Shared by the grouped product sections (Liquid / Staked / Yield Strategies) and
 * the detailed "Detected Wallet Assets" table, so every table looks identical and
 * stays honest.
 */
import { shortMint, type WalletPosition } from "../wallet/walletPosition";
import { formatUsd } from "../wallet/walletSummary";
import AssetIdentity from "./AssetIdentity";
import Badge from "./Badge";
import fallbackTokenUrl from "../../../assets/icons/fallback/fallback-token.svg";

export type PositionColumn = "asset" | "amount" | "value" | "apy" | "type" | "source" | "status";

const TYPE_LABEL: Record<WalletPosition["type"], string> = {
  native: "Native",
  token: "Token",
  lst: "LST",
  stake: "Native Stake",
  protocol: "Protocol Position",
};

const SIDE_LABEL: Record<NonNullable<WalletPosition["side"]>, string> = {
  supplied: "Supplied",
  borrowed: "Borrowed",
};

const SOURCE_LABEL: Record<WalletPosition["source"], string> = {
  wallet: "Wallet",
  jupiter: "Jupiter",
  kamino: "Kamino",
  jito: "Jito",
  sanctum: "Sanctum",
  ondo: "Ondo",
  orca: "Orca",
  raydium: "Raydium",
  meteora: "Meteora",
  hubble: "Hubble",
};

const HEADER: Record<PositionColumn, string> = {
  asset: "Asset",
  amount: "Amount",
  value: "Value",
  apy: "APY",
  type: "Type",
  source: "Source",
  status: "Status",
};

const RIGHT_ALIGNED: ReadonlySet<PositionColumn> = new Set(["amount", "value", "apy"]);

/** On-chain uiAmount → trimmed, grouped string (never a computed USD value). */
function formatAmount(p: WalletPosition): string {
  if (p.uiAmount == null) return p.amount.length > 0 ? p.amount : "—";
  return p.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

/** Sourced USD value → "$X.XX", or "—" when no price was available. */
function formatValue(p: WalletPosition): string {
  return typeof p.valueUsd === "number" ? formatUsd(p.valueUsd) : "—";
}

/** Sourced APY (percent) → "X.XX%", or "—" when no APY is available. */
function formatApy(apy: number | null | undefined): string {
  return apy == null ? "—" : `${apy.toFixed(2)}%`;
}

function AssetCell({ p }: { p: WalletPosition }) {
  if (p.icon) {
    return <AssetIdentity iconPath={p.icon} name={p.name ?? p.symbol} symbol={p.symbol} />;
  }
  // Unknown token — safe fallback icon; symbol/name still identify it.
  return (
    <span className="asset-identity">
      <img
        className="asset-identity__icon"
        src={fallbackTokenUrl}
        alt=""
        width={24}
        height={24}
        aria-hidden="true"
      />
      <span className="asset-identity__text">
        <span className="asset-identity__name">{p.name ?? "Unknown token"}</span>
        <span className="asset-identity__symbol">{p.mint ? shortMint(p.mint) : p.symbol}</span>
      </span>
    </span>
  );
}

function Cell({ col, p }: { col: PositionColumn; p: WalletPosition }) {
  switch (col) {
    case "asset":
      return (
        <td className="portfolio-table__cell">
          <AssetCell p={p} />
        </td>
      );
    case "amount":
      return (
        <td className="portfolio-table__cell portfolio-table__cell--right">
          <span className="portfolio-table__value">{formatAmount(p)}</span>
        </td>
      );
    case "value":
      return (
        <td className="portfolio-table__cell portfolio-table__cell--right">
          <span className="portfolio-table__value">{formatValue(p)}</span>
        </td>
      );
    case "apy":
      return (
        <td className="portfolio-table__cell portfolio-table__cell--right">
          <span className="portfolio-table__value">{formatApy(p.apy)}</span>
        </td>
      );
    case "type":
      return (
        <td className="portfolio-table__cell">
          <Badge label={TYPE_LABEL[p.type]} tone="neutral" />
        </td>
      );
    case "source":
      return (
        <td className="portfolio-table__cell">
          <span className="portfolio-table__status">
            {SOURCE_LABEL[p.source] +
              (p.protocol && p.source === "wallet" ? ` · ${p.protocol}` : "")}
          </span>
        </td>
      );
    case "status":
      return (
        <td className="portfolio-table__cell">
          <span className="portfolio-table__status">
            {p.side ? SIDE_LABEL[p.side] : "Detected"}
          </span>
        </td>
      );
  }
}

interface Props {
  positions: WalletPosition[];
  columns: PositionColumn[];
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

export default function PositionsTable({
  positions,
  columns,
  ariaLabelledBy,
  ariaDescribedBy,
}: Props) {
  return (
    <table
      className="portfolio-table"
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
    >
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col}
              scope="col"
              className={
                "portfolio-table__cell portfolio-table__header" +
                (RIGHT_ALIGNED.has(col) ? " portfolio-table__cell--right" : "")
              }
            >
              {HEADER[col]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {positions.map((p) => (
          <tr key={p.id}>
            {columns.map((col) => (
              <Cell key={col} col={col} p={p} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

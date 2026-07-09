/**
 * LiquidAssetsCard — the "Liquid Assets" card of the Asset Deployment Overview
 * (patterns/portfolio-overview.md): heading, the summed sourced USD total of the
 * category, a caption, and a 4-column table (Asset / Amount / USD Value /
 * 24h Change) with client-side pagination when there are more than 5 rows.
 *
 * Honest values only: the total sums SOURCED position values (unpriced rows show
 * "—" and are flagged by the excludes-unpriced caption); the 24h change renders
 * only when the price feed supplied one (see tokenPrices.ts), with a trend icon
 * for its sign. Asset names link out to the token's Solscan address page in a new
 * tab (read-only block-explorer view, rel="noopener noreferrer").
 */
import { useId, useState } from "react";
import type { WalletPosition } from "../wallet/walletPosition";
import { usd0, formatAmount, explorerUrl } from "./deployTable";
import { resolveTokenIcon } from "../state/iconRegistry";
import fallbackTokenUrl from "../../../assets/icons/fallback/fallback-token.svg";
import {
  PORT_LIQUID_TITLE,
  PORT_LIQUID_CAPTION,
  VALUE_EXCLUDES_UNPRICED,
  REAL_WALLET_NONE_DETECTED,
} from "../state/approvedCopy";

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25];
const DEFAULT_ROWS_PER_PAGE = 5;

function TrendIcon({ dir }: { dir: "up" | "down" | "flat" }) {
  return (
    <svg
      className="trend__icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {dir === "up" && (
        <>
          <polyline points="1 11.5 5.5 7 8.5 10 15 3.5" />
          <polyline points="10.5 3.5 15 3.5 15 8" />
        </>
      )}
      {dir === "down" && (
        <>
          <polyline points="1 4.5 5.5 9 8.5 6 15 12.5" />
          <polyline points="10.5 12.5 15 12.5 15 8" />
        </>
      )}
      {dir === "flat" && (
        <>
          <line x1="1" y1="8" x2="14" y2="8" />
          <polyline points="10.5 4.5 14 8 10.5 11.5" />
        </>
      )}
    </svg>
  );
}

/** Sourced 24h change → signed percent + trend icon; "—" when not sourced. */
function ChangeCell({ pct }: { pct: number | null | undefined }) {
  if (typeof pct !== "number") return <span className="portfolio-table__value">—</span>;
  // One decimal like the reference; a change that rounds to 0.0% renders flat.
  const rounded = Math.round(pct * 10) / 10;
  const dir = rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
  const text = `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`;
  return (
    <span className={`trend trend--${dir}`}>
      <TrendIcon dir={dir} />
      {text}
    </span>
  );
}

interface Props {
  positions: WalletPosition[];
}

export default function LiquidAssetsCard({ positions }: Props) {
  const headingId = useId();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  // Priced rows first (largest value on top), unpriced after in detected order.
  const rows = [...positions].sort((a, b) => (b.valueUsd ?? -1) - (a.valueUsd ?? -1));

  const priced = rows.filter((p) => typeof p.valueUsd === "number");
  const totalUsd =
    priced.length > 0 ? priced.reduce((s, p) => s + (p.valueUsd as number), 0) : null;
  const anyUnpriced = priced.length < rows.length;

  const pageCount = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = rows.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage);
  const paginated = rows.length > DEFAULT_ROWS_PER_PAGE;

  return (
    <section className="card" aria-labelledby={headingId}>
      <h3 id={headingId} className="card__title">
        {PORT_LIQUID_TITLE}
      </h3>
      <p className="deploy-card__total">{totalUsd != null ? usd0(totalUsd) : "—"}</p>
      <p className="card__caption">
        {PORT_LIQUID_CAPTION}
        {anyUnpriced ? ` ${VALUE_EXCLUDES_UNPRICED}` : ""}
      </p>

      {rows.length === 0 ? (
        <p className="portfolio-table__empty-description" role="status">
          {REAL_WALLET_NONE_DETECTED}
        </p>
      ) : (
        <>
          <div className="portfolio-table__scroll">
            <table className="portfolio-table" aria-labelledby={headingId}>
              <thead>
                <tr>
                  <th scope="col" className="portfolio-table__cell portfolio-table__header">
                    Asset
                  </th>
                  <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">
                    Amount
                  </th>
                  <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">
                    USD Value
                  </th>
                  <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">
                    24h Change
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  // Approved icon when the token has one; safe fallback otherwise
                  // (the visible symbol still identifies the asset).
                  const iconUrl = p.icon ? resolveTokenIcon(p.icon).url : fallbackTokenUrl;
                  const url = explorerUrl(p);
                  return (
                    <tr key={p.id}>
                      <td className="portfolio-table__cell">
                        <span className="asset-identity">
                          <img
                            className="asset-identity__icon"
                            src={iconUrl}
                            alt=""
                            width={24}
                            height={24}
                            aria-hidden="true"
                          />
                          {url ? (
                            <a
                              className="deploy-table__asset-link"
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {p.symbol}
                            </a>
                          ) : (
                            <span className="asset-identity__name">{p.symbol}</span>
                          )}
                        </span>
                      </td>
                      <td className="portfolio-table__cell portfolio-table__cell--right">
                        <span className="portfolio-table__value">{formatAmount(p)}</span>
                      </td>
                      <td className="portfolio-table__cell portfolio-table__cell--right">
                        <span className="portfolio-table__value">
                          {typeof p.valueUsd === "number" ? usd0(p.valueUsd) : "—"}
                        </span>
                      </td>
                      <td className="portfolio-table__cell portfolio-table__cell--right">
                        <ChangeCell pct={p.change24hPct} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {paginated && (
            <nav className="table-pagination" aria-label={`${PORT_LIQUID_TITLE} pagination`}>
              <label className="table-pagination__size">
                Rows per page
                <select
                  className="table-pagination__select"
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setPage(0);
                  }}
                >
                  {ROWS_PER_PAGE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <div className="table-pagination__pages">
                <button
                  type="button"
                  className="table-pagination__button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  aria-label="Previous page"
                >
                  ‹
                </button>
                {Array.from({ length: pageCount }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`table-pagination__button${
                      i === currentPage ? " table-pagination__button--current" : ""
                    }`}
                    aria-current={i === currentPage ? "page" : undefined}
                    onClick={() => setPage(i)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  className="table-pagination__button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= pageCount - 1}
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

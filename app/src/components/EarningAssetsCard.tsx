/**
 * EarningAssetsCard — shared card for the earning categories of the Asset
 * Deployment Overview (Staked Assets / Yield Strategies): heading, the summed
 * sourced USD total of the category, a caption, and a 6-column table
 * (Asset / Amount / Value / APY / Est. Earnings / Manage).
 *
 * Honest values only: the total sums SOURCED position values; APY renders only
 * when sourced (LST stake-pool math, on-chain epoch rewards, protocol SDK); Est.
 * Earnings is pure arithmetic on those two sourced inputs (valueUsd × APY, per
 * year) and shows "—" when either is missing — never an invented figure. Asset
 * names link to the token's Solscan page when a mint is known; Manage is the
 * review-only external handoff (ManageHandoff): a plain new-tab link to the
 * position's sourced destination or the approved protocol app page — no URL, no
 * button (never invented).
 */
import { useId } from "react";
import type { WalletPosition } from "../wallet/walletPosition";
import type { PortfolioCompletenessResult } from "../wallet/portfolioCompleteness";
import { positionCompletenessNote } from "./portfolioCompletenessUi";
import { usd0, formatAmount, explorerUrl, manageUrlFor } from "./deployTable";
import ManageHandoff from "./ManageHandoff";
import { resolveTokenIcon } from "../state/iconRegistry";
import fallbackTokenUrl from "../../../assets/icons/fallback/fallback-token.svg";
import { VALUE_EXCLUDES_UNPRICED, REAL_WALLET_NONE_DETECTED } from "../state/approvedCopy";

/** Sourced APY (percent) → "5.24%", or "—". */
const formatApy = (apy: number | null | undefined) =>
  apy == null ? "—" : `${apy.toFixed(2)}%`;

/**
 * Yearly earnings estimate from SOURCED value × SOURCED APY only ("+$219/yr").
 * Either input missing → null (rendered "—").
 */
function estimateYearlyUsd(p: WalletPosition): number | null {
  if (typeof p.valueUsd !== "number" || typeof p.apy !== "number") return null;
  return (p.valueUsd * p.apy) / 100;
}

interface Props {
  title: string;
  caption: string;
  /** Value column header ("USD Value" for Staked, "Value" for Yield). */
  valueHeader: string;
  positions: WalletPosition[];
  /** Primary asset-cell label; defaults to the symbol. */
  primaryLabel?: (p: WalletPosition) => string;
  /** Secondary line under the asset label (e.g. the protocol name). */
  subLabel?: (p: WalletPosition) => string | undefined;
  /** Approved toast on the Manage handoff click (navigation only, no state change). */
  onManageOpen?: () => void;
  /** Step 17H.3 — the already-mounted completeness result (never recomputed here); drives per-row notes. */
  completeness?: PortfolioCompletenessResult | null;
}

export default function EarningAssetsCard({
  title,
  caption,
  valueHeader,
  positions,
  primaryLabel = (p) => p.symbol,
  subLabel = (p) => p.protocol,
  onManageOpen,
  completeness,
}: Props) {
  const headingId = useId();

  // Priced rows first (largest value on top), unpriced after in detected order.
  const rows = [...positions].sort((a, b) => (b.valueUsd ?? -1) - (a.valueUsd ?? -1));
  const priced = rows.filter((p) => typeof p.valueUsd === "number");
  const totalUsd =
    priced.length > 0 ? priced.reduce((s, p) => s + (p.valueUsd as number), 0) : null;
  const anyUnpriced = priced.length < rows.length;

  return (
    <section className="card" aria-labelledby={headingId}>
      <h3 id={headingId} className="card__title">
        {title}
      </h3>
      <p className="deploy-card__total">{totalUsd != null ? usd0(totalUsd) : "—"}</p>
      <p className="card__caption">
        {caption}
        {anyUnpriced ? ` ${VALUE_EXCLUDES_UNPRICED}` : ""}
      </p>

      {rows.length === 0 ? (
        <p className="portfolio-table__empty-description" role="status">
          {REAL_WALLET_NONE_DETECTED}
        </p>
      ) : (
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
                  {valueHeader}
                </th>
                <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">
                  APY
                </th>
                <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">
                  Est. Earnings
                </th>
                <th scope="col" className="portfolio-table__cell portfolio-table__header">
                  <span className="sr-only">Manage</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                // Approved icon when the token has one; safe fallback otherwise
                // (the visible label still identifies the asset).
                const iconUrl = p.icon ? resolveTokenIcon(p.icon).url : fallbackTokenUrl;
                const url = explorerUrl(p);
                const manageUrl = manageUrlFor(p);
                const estYr = estimateYearlyUsd(p);
                const primary = primaryLabel(p);
                const sub = subLabel(p);
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
                        <span className="asset-identity__text">
                          {url ? (
                            <a
                              className="deploy-table__asset-link"
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {primary}
                            </a>
                          ) : (
                            <span className="asset-identity__name">{primary}</span>
                          )}
                          {sub && <span className="asset-identity__symbol">{sub}</span>}
                          {(() => {
                            const note = positionCompletenessNote(completeness, p.id);
                            return note ? <span className="asset-identity__note" role="note">{note}</span> : null;
                          })()}
                        </span>
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
                      <span className="portfolio-table__value">{formatApy(p.apy)}</span>
                    </td>
                    <td className="portfolio-table__cell portfolio-table__cell--right">
                      {estYr != null ? (
                        <span className="deploy-table__earnings">+{usd0(estYr)}/yr</span>
                      ) : (
                        <span className="portfolio-table__value">—</span>
                      )}
                    </td>
                    <td className="portfolio-table__cell portfolio-table__cell--right">
                      {manageUrl && (
                        <ManageHandoff
                          label="Manage"
                          href={manageUrl}
                          accessibleName={`Manage ${primary}${sub ? ` (${sub})` : ""} in a new tab`}
                          onOpen={() => onManageOpen?.()}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

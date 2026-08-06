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
import { usd0, formatAmount, formatAmountWhole, explorerUrl, manageUrlFor } from "./deployTable";
import ManageHandoff from "./ManageHandoff";
import { useIsMobileViewport } from "./useIsMobileViewport";
import { resolveTokenIcon } from "../state/iconRegistry";
import fallbackTokenUrl from "../../../assets/icons/fallback/fallback-token.svg";
import SkeletonDeployCard from "./SkeletonDeployCard";
import AssetIdentity from "./AssetIdentity";
import { VALUE_EXCLUDES_UNPRICED } from "../state/approvedCopy";

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
  /** Value column header ("Value" for both Staked and Yield). */
  valueHeader: string;
  positions: WalletPosition[];
  /** True while prices are still loading — shows a content-shaped skeleton instead of premature "—". */
  loading?: boolean;
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
  loading,
  primaryLabel = (p) => p.symbol,
  subLabel = (p) => p.protocol,
  onManageOpen,
  completeness,
}: Props) {
  const headingId = useId();
  // On mobile (<1280px) this table is simplified: Value/APY/Manage columns are
  // hidden (mobile.css), amounts are shown whole, and the whole row is the tap
  // target that opens the protocol page. Desktop is unchanged.
  const isMobile = useIsMobileViewport();

  // While the portfolio is still loading, skeleton the whole card rather than
  // flashing "—" values or a premature "none detected" empty state.
  if (loading) {
    return (
      <SkeletonDeployCard
        title={title}
        caption={caption}
        headers={["Asset", "Amount", valueHeader, "APY", "Est. Earnings", ""]}
        rows={Math.max(positions.length, 1)}
      />
    );
  }

  // Priced rows first (largest value on top), unpriced after in detected order.
  const rows = [...positions].sort((a, b) => (b.valueUsd ?? -1) - (a.valueUsd ?? -1));
  const priced = rows.filter((p) => typeof p.valueUsd === "number");
  const totalUsd =
    priced.length > 0 ? priced.reduce((s, p) => s + (p.valueUsd as number), 0) : null;
  const anyUnpriced = priced.length < rows.length;

  return (
    <section className="card" aria-labelledby={headingId}>
      <h3 id={headingId} className="card__title deploy-card__title">
        {title}
      </h3>
      <p className="deploy-card__total">
        {rows.length === 0 ? "$0" : totalUsd != null ? usd0(totalUsd) : "—"}
      </p>
      <p className="card__caption">
        {caption}
        {anyUnpriced ? ` ${VALUE_EXCLUDES_UNPRICED}` : ""}
      </p>

      {/* Empty category: just the $0 total + caption above — no table, no "none detected". */}
      {rows.length === 0 ? null : (
        <div className="portfolio-table__scroll">
          <table
            className="portfolio-table portfolio-table--earning"
            aria-labelledby={headingId}
          >
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
                // Mobile: the row itself opens the protocol page (the Manage
                // column is hidden). Taps on an inner link/button (e.g. the
                // asset's explorer link) keep their own behavior.
                const tappable = isMobile && !!manageUrl;
                return (
                  <tr
                    key={p.id}
                    className={tappable ? "deploy-row--tappable" : undefined}
                    // Keyboard access: the Manage column is hidden on mobile, so the row itself
                    // must be reachable and activatable (Enter/Space) — not pointer-only.
                    tabIndex={tappable ? 0 : undefined}
                    role={tappable ? "link" : undefined}
                    aria-label={tappable ? `Manage ${primary}${sub ? ` (${sub})` : ""} in a new tab` : undefined}
                    onKeyDown={
                      tappable
                        ? (e) => {
                            if (e.key !== "Enter" && e.key !== " ") return;
                            if ((e.target as HTMLElement).closest("a,button")) return;
                            e.preventDefault();
                            window.open(manageUrl, "_blank", "noopener,noreferrer");
                            onManageOpen?.();
                          }
                        : undefined
                    }
                    onClick={
                      tappable
                        ? (e) => {
                            if ((e.target as HTMLElement).closest("a,button")) return;
                            window.open(manageUrl, "_blank", "noopener,noreferrer");
                            onManageOpen?.();
                          }
                        : undefined
                    }
                  >
                    <td className="portfolio-table__cell">
                      <AssetIdentity
                        iconUrl={iconUrl}
                        label={primary}
                        {...(url ? { href: url } : {})}
                        {...(sub ? { sub } : {})}
                        {...(() => {
                          const note = positionCompletenessNote(completeness, p.id);
                          return note ? { note } : {};
                        })()}
                      />
                    </td>
                    <td className="portfolio-table__cell portfolio-table__cell--right">
                      <span className="portfolio-table__value">
                        {isMobile ? formatAmountWhole(p) : formatAmount(p)}
                      </span>
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

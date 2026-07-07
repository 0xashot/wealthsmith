/**
 * DashboardBody — the ONE Dashboard main-column layout, shared across all modes
 * (wallet connected, wallet not connected, and the onboarding preview) so the
 * cards are identical everywhere. Only the DATA differs by availability.
 *
 * Four sections, always in this order (heading above the card, like the product
 * reference): Financial Snapshot (Total Portfolio Value + Net Contributions),
 * Safety Buffer, Projected Growth, Current vs Recommended Allocation.
 *
 * Live read-only wallet data + sourced prices populate what they can; anything
 * without a sourced input (no wallet, no pricing, no expenses, no target mix)
 * shows a polished unavailable state IN THE SAME CARD. No fixture values, no
 * invented USD/APY/allocation. READ-ONLY: nothing is signed, sent, or moved.
 */
import type { ReactNode } from "react";
import { useWalletPortfolio } from "../wallet/useWalletPortfolio";
import {
  deriveValueBreakdown,
  deriveStableValue,
  deriveSafetyBuffer,
  formatUsd,
} from "../wallet/walletSummary";
import { dashboardState as s } from "../state/dashboardState";
import LegendMarker from "./LegendMarker";
import {
  REAL_WALLET_VALUE_DESC,
  FS_TOTAL_VALUE_LABEL,
  FS_TOTAL_VALUE_CAPTION,
  FS_NET_CONTRIB_LABEL,
  FS_NET_CONTRIB_DESC,
  SAFETY_BUFFER_CAPTION,
  SAFETY_BUFFER_FUNDED,
  SAFETY_BUFFER_COVERED_LEGEND,
  SAFETY_BUFFER_NEEDS,
  PROJECTED_GROWTH_NEEDS,
  ALLOCATION_NEEDS_PRICING,
  ALLOCATION_CURRENT_CAPTION,
  ALLOCATION_LABEL_CRYPTO,
  ALLOCATION_LABEL_STABLES,
} from "../state/approvedCopy";

/** A dashboard section: heading (+ optional caption) above the card content. */
function DashSection({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <section className="dash-section" aria-label={title}>
      <h2 className="dash-section__title">{title}</h2>
      {caption && <p className="dash-section__caption">{caption}</p>}
      {children}
    </section>
  );
}

/** Muted, single-line "unavailable" card body. */
function UnavailableCard({ text }: { text: string }) {
  return (
    <div className="card empty-card">
      <p className="empty-card__description">{text}</p>
    </div>
  );
}

interface Props {
  /** User's monthly expenses (from onboarding/goal) — for the Safety Buffer. */
  monthlyExpenses?: number;
}

export default function DashboardBody({ monthlyExpenses }: Props) {
  const { status, positions, warning, pricedAsOf, loading } = useWalletPortfolio();
  const value = deriveValueBreakdown(positions);
  const priced = value.totalUsd != null;

  // Safety Buffer only once prices are loaded, so a 0 reserve is genuinely "no
  // stablecoins" rather than "not priced yet".
  const buffer = pricedAsOf != null ? deriveSafetyBuffer(positions, monthlyExpenses) : null;
  const bufferLow = buffer != null && buffer.coveragePct < 34;
  const bufferColor = buffer?.fullyFunded
    ? "--color-feedback-success-background-solid"
    : bufferLow
      ? "--color-feedback-danger-background-solid"
      : "--color-action-primary-background-default";

  // Current allocation (Crypto vs Stables) from sourced value only.
  const total = value.totalUsd ?? 0;
  const stableUsd = deriveStableValue(positions);
  const cryptoUsd = Math.max(0, total - stableUsd);
  const cryptoPct = total > 0 ? (cryptoUsd / total) * 100 : 0;
  const stablePct = total > 0 ? (stableUsd / total) * 100 : 0;
  const showAllocation = priced && total > 0;
  const allocationSummary =
    `${s.allocation.title}. Current mix by value: ` +
    `${ALLOCATION_LABEL_CRYPTO} ${formatUsd(cryptoUsd)} (${cryptoPct.toFixed(0)}%), ` +
    `${ALLOCATION_LABEL_STABLES} ${formatUsd(stableUsd)} (${stablePct.toFixed(0)}%). ` +
    `Recommended allocation unavailable.`;

  const totalCaption = priced
    ? FS_TOTAL_VALUE_CAPTION + (value.anyUnpriced ? " Excludes unpriced positions." : "")
    : REAL_WALLET_VALUE_DESC;

  return (
    <>
      {warning && status !== "idle" && (
        <p className="live-wallet__warning" role="status">
          {warning}
        </p>
      )}

      {/* Financial Snapshot — two hero cards. */}
      <DashSection title={s.financial_snapshot.title}>
        <div className="hero-cards">
          <div className="card">
            <span className="metric__label">{FS_TOTAL_VALUE_LABEL}</span>
            {loading ? (
              <>
                <span className="skeleton skeleton--value" />
                <span className="skeleton skeleton--line-short" />
              </>
            ) : (
              <>
                <span className={"hero-card__value" + (priced ? "" : " hero-card__value--muted")}>
                  {priced ? formatUsd(value.totalUsd as number) : "—"}
                </span>
                <span className="card__caption">{totalCaption}</span>
              </>
            )}
          </div>
          <div className="card">
            <span className="metric__label">{FS_NET_CONTRIB_LABEL}</span>
            <span className="hero-card__value hero-card__value--muted">—</span>
            <span className="card__caption">{FS_NET_CONTRIB_DESC}</span>
          </div>
        </div>
      </DashSection>

      {/* Safety Buffer — stablecoin reserve (incl. supplied USDC) vs expenses. */}
      <DashSection title={s.safety_buffer.title} caption={SAFETY_BUFFER_CAPTION}>
        {loading ? (
          <div className="card">
            <div className="buffer__values">
              <span className="skeleton skeleton--value" />
            </div>
            <div className="skeleton skeleton--bar" />
            <span className="skeleton skeleton--line" />
          </div>
        ) : buffer ? (
          <div id="safety-buffer" tabIndex={-1} className="card">
            <div className="buffer__values">
              <span className="metric__value metric__value--primary">
                {Math.round(buffer.coveragePct)}% covered
              </span>
              <span className="buffer__secondary">
                {buffer.monthsCovered.toFixed(1)}/{buffer.targetMonths} months
              </span>
            </div>
            <div
              className="progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(buffer.coveragePct)}
              aria-label={`Safety Buffer is ${Math.round(buffer.coveragePct)} percent covered.`}
            >
              <div
                className={
                  "progress__fill" +
                  (buffer.fullyFunded
                    ? " progress__fill--success"
                    : bufferLow
                      ? " progress__fill--danger"
                      : "")
                }
                style={{ width: `${buffer.coveragePct}%` }}
              />
            </div>
            <p className={"buffer__caption" + (bufferLow ? "" : " buffer__caption--ok")}>
              {buffer.fullyFunded
                ? `${SAFETY_BUFFER_FUNDED} ${formatUsd(buffer.stableUsd)} reserve.`
                : `${formatUsd(buffer.targetUsd - buffer.stableUsd)} remaining to reach your ${buffer.targetMonths}-month target (${formatUsd(buffer.stableUsd)} of ${formatUsd(buffer.targetUsd)}).`}
            </p>
            <div className="chart-legend">
              <span className="chart-legend__item">
                <LegendMarker variant="dot" colorToken={bufferColor} />
                {SAFETY_BUFFER_COVERED_LEGEND}
              </span>
            </div>
          </div>
        ) : (
          <UnavailableCard text={SAFETY_BUFFER_NEEDS} />
        )}
      </DashSection>

      {/* Projected Growth — unavailable until pricing + contribution logic exist. */}
      <DashSection title={s.projected_growth.title}>
        <UnavailableCard text={PROJECTED_GROWTH_NEEDS} />
      </DashSection>

      {/* Current vs Recommended Allocation — current is live; recommended unavailable. */}
      <DashSection title={s.allocation.title}>
        {loading ? (
          <div className="card">
            <div className="skeleton skeleton--bar" />
            <div className="skeleton skeleton--bar" />
          </div>
        ) : showAllocation ? (
          <div className="card">
            <div className="allocation__groups" role="img" aria-label={allocationSummary}>
              <div className="allocation__group">
                <div className="allocation__row">
                  <span className="allocation__row-label">{ALLOCATION_LABEL_CRYPTO}</span>
                  <div className="allocation__track">
                    <div
                      className="allocation__bar allocation__bar--current"
                      style={{ width: `${cryptoPct}%` }}
                    />
                  </div>
                  <span className="allocation__value">
                    {formatUsd(cryptoUsd)} · {cryptoPct.toFixed(0)}%
                  </span>
                </div>
                <div className="allocation__row">
                  <span className="allocation__row-label">{ALLOCATION_LABEL_STABLES}</span>
                  <div className="allocation__track">
                    <div
                      className="allocation__bar allocation__bar--recommended"
                      style={{ width: `${stablePct}%` }}
                    />
                  </div>
                  <span className="allocation__value">
                    {formatUsd(stableUsd)} · {stablePct.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
            <p className="card__caption">{ALLOCATION_CURRENT_CAPTION}</p>
            <div className="chart-legend">
              <span className="chart-legend__item">
                <LegendMarker variant="dot" colorToken="--color-chart-series-1" />
                {ALLOCATION_LABEL_CRYPTO}
              </span>
              <span className="chart-legend__item">
                <LegendMarker variant="dot" colorToken="--color-chart-series-3" />
                {ALLOCATION_LABEL_STABLES}
              </span>
            </div>
          </div>
        ) : (
          <UnavailableCard text={ALLOCATION_NEEDS_PRICING} />
        )}
      </DashSection>
    </>
  );
}

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
import { useNetContributions } from "../wallet/useNetContributions";
import {
  deriveValueBreakdown,
  deriveStableValue,
  deriveSafetyBuffer,
  formatUsd,
} from "../wallet/walletSummary";
import { deriveProjection } from "../wallet/projectedGrowth";
import { deriveRecommendedAllocation } from "../wallet/recommendedAllocation";
import { getSafetyBufferTargetMonths } from "../wallet/safetyBufferTarget";
import { useRailSuggestions, type RailSuggestions } from "../suggestions/useRailSuggestions";
import { dashboardState as s } from "../state/dashboardState";
import { RISK_OPTIONS, labelFor } from "../state/goalState";
import type { SavedGoal } from "../types/goal";
import type { ProjectedGrowthState } from "../types/dashboard";
import LegendMarker from "./LegendMarker";
import ProjectedGrowthChart from "./ProjectedGrowthChart";
import ProjectedGrowthInfo from "./ProjectedGrowthInfo";
import InfoPopover from "./InfoPopover";
import {
  REAL_WALLET_VALUE_DESC,
  FS_TOTAL_VALUE_LABEL,
  FS_TOTAL_VALUE_CAPTION,
  FS_NET_CONTRIB_LABEL,
  FS_NET_CONTRIB_DESC,
  FS_NET_CONTRIB_ESTIMATE,
  SAFETY_BUFFER_CAPTION,
  SAFETY_BUFFER_FUNDED,
  SAFETY_BUFFER_COVERED_LEGEND,
  SAFETY_BUFFER_NEEDS,
  PROJECTED_GROWTH_NO_PRICING,
  PROJECTED_GROWTH_NO_CONTRIB,
  PROJECTED_GROWTH_NO_HORIZON,
  PROJECTED_GROWTH_NO_RISK,
  PG_LABEL_PROJECTED,
  PG_INFO_ARIA,
  PG_INFO_UNAVAILABLE_INTRO,
  PG_INFO_UNAVAILABLE_CONNECT,
  PG_INFO_FOOTER,
  ALLOCATION_NEEDS_PRICING,
  ALLOCATION_NO_RISK,
  ALLOCATION_INFO_ARIA,
  ALLOCATION_INFO_TEXT,
  ALLOCATION_GROUP_CURRENT,
  ALLOCATION_GROUP_RECOMMENDED,
  ALLOCATION_LABEL_CRYPTO,
  ALLOCATION_LABEL_STABLES,
} from "../state/approvedCopy";

/** Whole-dollar USD (no cents) — used for the Current vs Recommended rows. */
const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** A dashboard section: heading (+ optional caption/title accessory) above the card. */
function DashSection({
  title,
  caption,
  action,
  children,
}: {
  title: string;
  caption?: string;
  /** Optional inline element rendered immediately to the right of the title. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="dash-section" aria-label={title}>
      {action ? (
        <div className="dash-section__head">
          <h2 className="dash-section__title">{title}</h2>
          {action}
        </div>
      ) : (
        <h2 className="dash-section__title">{title}</h2>
      )}
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

/** Re-exported for existing importers; defined in the shared hook module. */
export type { RailSuggestions };

interface Props {
  /** Saved plan (onboarding/Goal Settings) — Safety Buffer + Projected Growth. */
  goal?: SavedGoal;
  /** Real-wallet only: receive engine suggestions for the right rail. */
  onSuggestions?: (data: RailSuggestions) => void;
}

export default function DashboardBody({ goal, onSuggestions }: Props) {
  const { status, positions, warning, pricedAsOf, loading } = useWalletPortfolio();
  const contrib = useNetContributions();
  const value = deriveValueBreakdown(positions);
  const priced = value.totalUsd != null;
  const monthlyExpenses = goal?.expenses_monthly;

  // Safety Buffer only once prices are loaded, so a 0 reserve is genuinely "no
  // stablecoins" rather than "not priced yet". The target months are RISK-BASED
  // (approved mapping in safetyBufferTarget.ts) — a missing/unknown risk level
  // yields null and the card shows its unavailable state, never a silent 3.
  const bufferTargetMonths = getSafetyBufferTargetMonths(goal?.risk_tolerance);
  const buffer =
    pricedAsOf != null
      ? deriveSafetyBuffer(positions, monthlyExpenses, bufferTargetMonths)
      : null;
  const bufferLow = buffer != null && buffer.coveragePct < 34;

  // Current allocation (Crypto vs Stables) from sourced value only.
  const total = value.totalUsd ?? 0;
  const stableUsd = deriveStableValue(positions);
  const cryptoUsd = Math.max(0, total - stableUsd);
  const cryptoPct = total > 0 ? (cryptoUsd / total) * 100 : 0;
  const stablePct = total > 0 ? (stableUsd / total) * 100 : 0;
  const showAllocation = priced && total > 0;

  // Recommended (target) allocation — deterministic risk-based product logic
  // applied to the current priced total. Null when no saved risk level.
  const recommended = deriveRecommendedAllocation({
    riskTolerance: goal?.risk_tolerance,
    totalPricedUsd: showAllocation ? total : null,
  });
  const allocationSummary =
    `${s.allocation.title}. Current mix by value: ` +
    `${ALLOCATION_LABEL_CRYPTO} ${usd0(cryptoUsd)} (${cryptoPct.toFixed(0)}%), ` +
    `${ALLOCATION_LABEL_STABLES} ${usd0(stableUsd)} (${stablePct.toFixed(0)}%). ` +
    (recommended != null
      ? `Recommended target: ${ALLOCATION_LABEL_CRYPTO} ${usd0(recommended.cryptoUsd)} (${recommended.cryptoPct}%), ` +
        `${ALLOCATION_LABEL_STABLES} ${usd0(recommended.stableUsd)} (${recommended.stablePct}%).`
      : `Recommended allocation unavailable.`);

  // Deterministic Suggestion Engine (real wallet) — the SAME shared hook the
  // Portfolio uses, so both pages show identical suggestions. It re-derives its
  // inputs from the live positions + saved goal (recalculating no pricing,
  // buffer target, allocation target, or Top Pick) and lifts the rail payload.
  useRailSuggestions({ positions, pricedAsOf, goal, loading: loading === true, onSuggestions });

  // Deterministic Projected Growth — priced starting value + saved plan inputs.
  const projection = deriveProjection({
    startingValueUsd: value.totalUsd,
    anyUnpriced: value.anyUnpriced,
    monthlyContribution: goal?.monthly_saving_goal ?? null,
    timeline: goal?.timeline,
    riskTolerance: goal?.risk_tolerance,
  });
  const projectionUnavailableText =
    projection.status === "no_pricing"
      ? PROJECTED_GROWTH_NO_PRICING
      : projection.status === "no_contribution"
        ? PROJECTED_GROWTH_NO_CONTRIB
        : projection.status === "no_horizon"
          ? PROJECTED_GROWTH_NO_HORIZON
          : PROJECTED_GROWTH_NO_RISK;

  // Build the deterministic line-chart state (same chart component as Demo).
  // The prose caption is intentionally blank in real-wallet mode — its content
  // now lives in the "How Projected Growth is calculated" info popover on the
  // section title (projectionInfo below). Demo Mode keeps its own fixture caption.
  let projectionGrowth: ProjectedGrowthState | null = null;
  let projectionInfo: {
    modeledPct: number;
    riskLabel: string;
    totalContributions: number;
    estimatedGrowth: number;
    projectedValue: number;
  } | null = null;
  if (projection.status === "ok" && goal) {
    const p = projection.projection;
    projectionInfo = {
      modeledPct: Math.round(p.annualReturnRate * 100),
      riskLabel: labelFor(RISK_OPTIONS, goal.risk_tolerance),
      totalContributions: p.totalContributions,
      estimatedGrowth: p.estimatedGrowth,
      projectedValue: p.futureValue,
    };
    projectionGrowth = {
      title: "",
      status: "ready",
      display: { show_estimated_label: true, caption: "" },
      series: [
        {
          id: "projected_value",
          label: PG_LABEL_PROJECTED,
          type: "line",
          points: p.points.map((pt) => ({
            year: pt.months / 12,
            value_usd: pt.valueUsd,
            label: pt.label,
          })),
        },
      ],
    };
  }

  const totalCaption = priced
    ? FS_TOTAL_VALUE_CAPTION + (value.anyUnpriced ? " · excludes unpriced positions" : "")
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
            {contrib.loading ? (
              <>
                <span className="skeleton skeleton--value" />
                <span className="skeleton skeleton--line-short" />
              </>
            ) : contrib.summary ? (
              <>
                <span className="hero-card__value">{formatUsd(contrib.summary.netUsd)}</span>
                <span className="card__caption">{FS_NET_CONTRIB_ESTIMATE}</span>
              </>
            ) : (
              <>
                <span className="hero-card__value hero-card__value--muted">—</span>
                <span className="card__caption">{FS_NET_CONTRIB_DESC}</span>
              </>
            )}
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
                {buffer.monthsCovered.toFixed(1)}/{buffer.targetMonths}{" "}
                {buffer.targetMonths === 1 ? "month" : "months"}
              </span>
            </div>
            <div
              className="progress progress--chart"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(buffer.coveragePct)}
              aria-label={`Safety Buffer is ${Math.round(buffer.coveragePct)} percent covered.`}
            >
              <div className="progress__fill" style={{ width: `${buffer.coveragePct}%` }} />
            </div>
            <p className={"buffer__caption" + (bufferLow ? "" : " buffer__caption--ok")}>
              {buffer.fullyFunded
                ? `${SAFETY_BUFFER_FUNDED} ${formatUsd(buffer.stableUsd)} reserve.`
                : `${formatUsd(buffer.targetUsd - buffer.stableUsd)} remaining to reach your ${buffer.targetMonths}-month target (${formatUsd(buffer.stableUsd)} of ${formatUsd(buffer.targetUsd)}).`}
            </p>
            <div className="chart-legend">
              <span className="chart-legend__item">
                <LegendMarker variant="dot" colorToken="--color-chart-series-4" />
                {SAFETY_BUFFER_COVERED_LEGEND}
              </span>
            </div>
          </div>
        ) : (
          <UnavailableCard text={SAFETY_BUFFER_NEEDS} />
        )}
      </DashSection>

      {/* Projected Growth — deterministic modeled estimate from priced value + plan. */}
      <DashSection
        title={s.projected_growth.title}
        action={
          projectionInfo ? (
            <ProjectedGrowthInfo
              modeledPct={projectionInfo.modeledPct}
              riskLabel={projectionInfo.riskLabel}
              totalContributions={projectionInfo.totalContributions}
              estimatedGrowth={projectionInfo.estimatedGrowth}
              projectedValue={projectionInfo.projectedValue}
            />
          ) : loading ? undefined : (
            <InfoPopover label={PG_INFO_ARIA}>
              <p className="info-popover__text">{PG_INFO_UNAVAILABLE_INTRO}</p>
              <p className="info-popover__text">{PG_INFO_UNAVAILABLE_CONNECT}</p>
              <p className="info-popover__text info-popover__text--muted">
                {PG_INFO_FOOTER}
              </p>
            </InfoPopover>
          )
        }
      >
        {loading ? (
          <div className="card">
            <div className="snapshot__grid">
              <div className="metric">
                <span className="skeleton skeleton--line-short" />
                <span className="skeleton skeleton--value" />
              </div>
              <div className="metric">
                <span className="skeleton skeleton--line-short" />
                <span className="skeleton skeleton--value" />
              </div>
            </div>
          </div>
        ) : projectionGrowth ? (
          <ProjectedGrowthChart growth={projectionGrowth} />
        ) : (
          <UnavailableCard text={projectionUnavailableText} />
        )}
      </DashSection>

      {/* Current vs Recommended Allocation — current is live; recommended unavailable. */}
      <DashSection
        title={s.allocation.title}
        action={
          loading ? undefined : (
            <InfoPopover label={ALLOCATION_INFO_ARIA}>
              <p className="info-popover__text">{ALLOCATION_INFO_TEXT}</p>
            </InfoPopover>
          )
        }
      >
        {loading ? (
          <div className="card">
            <div className="skeleton skeleton--bar" />
            <div className="skeleton skeleton--bar" />
          </div>
        ) : showAllocation ? (
          <div className="card">
            <div className="allocation__groups" role="img" aria-label={allocationSummary}>
              {/* Current — live wallet allocation (values unchanged from before). */}
              <div className="allocation__group">
                <span className="allocation__group-label">{ALLOCATION_GROUP_CURRENT}</span>
                <div className="allocation__row">
                  <span className="allocation__row-label">{ALLOCATION_LABEL_CRYPTO}</span>
                  <div className="allocation__track">
                    <div
                      className="allocation__bar allocation__bar--current"
                      style={{ width: `${cryptoPct}%` }}
                    />
                  </div>
                  <span className="allocation__value">{usd0(cryptoUsd)}</span>
                </div>
                <div className="allocation__row">
                  <span className="allocation__row-label">{ALLOCATION_LABEL_STABLES}</span>
                  <div className="allocation__track">
                    <div
                      className="allocation__bar allocation__bar--recommended"
                      style={{ width: `${stablePct}%` }}
                    />
                  </div>
                  <span className="allocation__value">{usd0(stableUsd)}</span>
                </div>
              </div>

              {/* Recommended — risk-based target applied to the current priced total. */}
              {recommended && (
                <div className="allocation__group">
                  <span className="allocation__group-label">
                    {ALLOCATION_GROUP_RECOMMENDED}
                  </span>
                  <div className="allocation__row">
                    <span className="allocation__row-label">{ALLOCATION_LABEL_CRYPTO}</span>
                    <div className="allocation__track">
                      <div
                        className="allocation__bar allocation__bar--current"
                        style={{ width: `${recommended.cryptoPct}%` }}
                      />
                    </div>
                    <span className="allocation__value">{usd0(recommended.cryptoUsd)}</span>
                  </div>
                  <div className="allocation__row">
                    <span className="allocation__row-label">{ALLOCATION_LABEL_STABLES}</span>
                    <div className="allocation__track">
                      <div
                        className="allocation__bar allocation__bar--recommended"
                        style={{ width: `${recommended.stablePct}%` }}
                      />
                    </div>
                    <span className="allocation__value">{usd0(recommended.stableUsd)}</span>
                  </div>
                </div>
              )}
            </div>
            {!recommended && <p className="card__caption">{ALLOCATION_NO_RISK}</p>}
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

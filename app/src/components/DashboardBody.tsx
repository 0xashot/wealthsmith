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
import { useId, type ReactNode } from "react";
import { useWalletPortfolio } from "../wallet/useWalletPortfolio";
import { useNetContributions } from "../wallet/useNetContributions";
import {
  deriveValueBreakdown,
  deriveStableValue,
  deriveSafetyBuffer,
  derivePortfolioDayChangePct,
  formatUsd,
} from "../wallet/walletSummary";
import { deriveProjection } from "../wallet/projectedGrowth";
import { getSafetyBufferTargetMonths } from "../wallet/safetyBufferTarget";
import { useRailSuggestions, type RailSuggestions, type RailTargetSummary } from "../suggestions/useRailSuggestions";
import { useKlendDirectUsdcMarketSnapshot, freshSnapshotOrNull } from "../suggestions/useKlendDirectUsdcMarketSnapshot";
import { dashboardState as s } from "../state/dashboardState";
import { RISK_OPTIONS, labelFor } from "../state/goalState";
import type { SavedGoal } from "../types/goal";
import type { WalletPosition } from "../wallet/walletPosition";
import type { ProjectedGrowthState } from "../types/dashboard";
import LegendMarker from "./LegendMarker";
import ProjectedGrowthChart from "./ProjectedGrowthChart";
import ProjectedGrowthEmptyChart from "./ProjectedGrowthEmptyChart";
import ProjectedGrowthInfo from "./ProjectedGrowthInfo";
import InfoPopover from "./InfoPopover";
import { useManualAssets } from "../wallet/manualAssetPositions";
import TrendBadge from "./TrendBadge";
import {
  REAL_WALLET_VALUE_DESC,
  FS_TOTAL_VALUE_LABEL,
  FS_TOTAL_VALUE_CAPTION,
  FS_CHANGE_PERIOD,
  FS_NET_CONTRIB_LABEL,
  FS_NET_CONTRIB_INFO_ARIA,
  FS_NET_CONTRIB_MANUAL_NOTE,
  FS_NET_CONTRIB_ESTIMATE,
  SAFETY_BUFFER_CAPTION,
  PG_CAPTION,
  SAFETY_BUFFER_COVERED_LEGEND,
  SAFETY_BUFFER_NEEDS,
  PROJECTED_GROWTH_EMPTY_PROMPT,
  PG_LABEL_PROJECTED,
  PG_INFO_ARIA,
  PG_INFO_UNAVAILABLE_INTRO,
  PG_INFO_UNAVAILABLE_CONNECT,
  PG_INFO_FOOTER,
  ALLOCATION_EMPTY_PROMPT,
  ALLOCATION_INFO_ARIA,
  ALLOCATION_METHODOLOGY,
  ALLOCATION_GROUP_CURRENT,
  ALLOCATION_GROUP_RECOMMENDED,
  ALLOCATION_LABEL_CRYPTO,
  ALLOCATION_LABEL_STABLES,
  ALLOCATION_TARGET_CURRENT,
  ALLOCATION_MARKET_EXCLUDED,
} from "../state/approvedCopy";

/** Whole-dollar USD (no cents) — used for the Current vs Recommended rows. */
const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** Hover-breakdown content for one allocation bar (Current-vs-Recommended). */
interface AllocPopover {
  title: string;
  primaryLabel: string;
  primaryUsd: number;
  secondaryLabel: string;
  secondaryUsd: number;
  /** Signed percentage-point difference of this bar's series vs the other, e.g. "+34%". */
  diff: string;
  /** One-sentence a11y label for the focusable bar. */
  aria: string;
}

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

/** Re-exported for existing importers; defined in the shared hook module. */
export type { RailSuggestions };

interface Props {
  /** Saved plan (onboarding/Goal Settings) — Safety Buffer + Projected Growth. */
  goal?: SavedGoal;
  /** Real-wallet only: receive engine suggestions for the right rail. */
  onSuggestions?: (data: RailSuggestions) => void;
  /** Demo Mode: render the SAME body from sample data (no live wallet read). The
   *  live hooks still run (rules of hooks), but their output is overridden so Demo
   *  and connected are byte-identical layout, differing only in the data. */
  demo?: {
    positions: WalletPosition[];
    pricedAsOf: number;
    netContributionsUsd: number;
    targetSummary?: RailTargetSummary;
  };
}

export default function DashboardBody({ goal, onSuggestions, demo }: Props) {
  const bufferPopoverId = useId();
  const wallet = useWalletPortfolio();
  const liveContrib = useNetContributions();
  const klendMarket = useKlendDirectUsdcMarketSnapshot();
  // The rail hook always runs on the LIVE wallet read (never Demo data) so
  // connected behavior is unchanged; in Demo the lift is disabled and the target
  // summary is taken from the injected Demo rail below.
  const manual = useManualAssets();
  const { targetSummary: liveTargetSummary } = useRailSuggestions({
    positions: wallet.positions,
    pricedAsOf: wallet.pricedAsOf,
    goal,
    loading: wallet.loading === true,
    onSuggestions: demo ? undefined : onSuggestions,
    klendMarketSnapshot: freshSnapshotOrNull(klendMarket),
    // Allocation MEASUREMENT only — so the card below and the Rebalance
    // suggestion always agree about how much crypto the user holds.
    externalMeasurementPositions: manual.positions,
  });

  // Effective data source: Demo sample data, else the live read-only wallet read.
  const status = demo ? "ready" : wallet.status;
  const positions = demo ? demo.positions : wallet.positions;
  const warning = demo ? undefined : wallet.warning;
  const pricedAsOf = demo ? demo.pricedAsOf : wallet.pricedAsOf;
  // The external BTC/ETH price feed counts toward "still loading": it resolves
  // faster than the wallet read, so without it Total Portfolio Value would
  // briefly show the manually added assets alone before the wallet arrives.
  // The external BTC/ETH feed counts as "still loading" on the LIVE path, where it
  // resolves faster than the wallet read — without it the cards would briefly show
  // a portfolio made of the manually added assets alone. Demo data is synchronous
  // and stays instant; there the feed only gates the merge below.
  const loading = demo ? false : wallet.loading || manual.pricesLoading;
  const contribLoading = demo ? false : liveContrib.loading;
  const netContributionsUsd = demo ? demo.netContributionsUsd : (liveContrib.summary?.netUsd ?? null);
  const targetSummary = demo ? demo.targetSummary : liveTargetSummary;
  // Manually added External Holdings (BTC/ETH) count toward what the user OWNS,
  // so they join Total Portfolio Value, its 24h badge, and the allocation card.
  // They deliberately do NOT join `positions` — the Safety Buffer, projections,
  // and the contribution/DCA pipeline keep reading the real wallet alone.
  // Withheld until nothing is loading, so the card never shows a total made up of
  // the manual assets alone while the wallet read is still in flight, and never
  // adds them mid-render once their price lands.
  const totalValuePositions =
    !loading && !manual.pricesLoading && manual.positions.length > 0
      ? [...positions, ...manual.positions]
      : positions;

  const value = deriveValueBreakdown(totalValuePositions);
  const priced = value.totalUsd != null;
  // Value-weighted 24h change across priced holdings (sourced per-token; null when
  // nothing has a sourced change) — the trend badge beside Total Portfolio Value.
  const dayChangePct = derivePortfolioDayChangePct(totalValuePositions);
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

  // Current allocation (Crypto vs Stables) from sourced value only. Uses the SAME
  // set fed to the Rebalance measurement above (real wallet + manually added
  // external holdings), so the card and the suggestion can never contradict.
  const allocationValue = deriveValueBreakdown(totalValuePositions);
  const total = allocationValue.totalUsd ?? 0;
  const stableUsd = deriveStableValue(totalValuePositions);
  const cryptoUsd = Math.max(0, total - stableUsd);
  const cryptoPct = total > 0 ? (cryptoUsd / total) * 100 : 0;
  const stablePct = total > 0 ? (stableUsd / total) * 100 : 0;
  const showAllocation = priced && total > 0;

  // Recommended (target) allocation — Step 22F(slice 5): the mounted CANONICAL target, NOT a risk-only derivation.
  // Percentages appear only for a usable (full/degraded) target; every non-usable state shows a safe treatment
  // (loading/unresolved → loading; unavailable/blocked → unavailable) with NO legacy percentages and no risk-only flash.
  const targetState = targetSummary?.state ?? "unresolved";
  const targetCryptoPct = targetSummary?.targetCryptoPct ?? null;
  const targetStablePct = targetSummary?.targetStablePct ?? null;
  const targetUsable = (targetState === "full" || targetState === "degraded_market_excluded") && targetCryptoPct != null && targetStablePct != null;
  const targetCryptoUsd = targetUsable && showAllocation ? total * ((targetCryptoPct as number) / 100) : null;
  const targetStableUsd = targetUsable && showAllocation ? total * ((targetStablePct as number) / 100) : null;
  const targetMarketExcluded = targetState === "degraded_market_excluded";
  const targetLoadingTreatment = targetState === "loading" || targetState === "unresolved";
  const allocationSummary =
    `${s.allocation.title}. Current mix by value: ` +
    `${ALLOCATION_LABEL_CRYPTO} ${usd0(cryptoUsd)} (${cryptoPct.toFixed(0)}%), ` +
    `${ALLOCATION_LABEL_STABLES} ${usd0(stableUsd)} (${stablePct.toFixed(0)}%). ` +
    (targetUsable
      ? `Recommended target: ${ALLOCATION_LABEL_CRYPTO} ${usd0(targetCryptoUsd as number)} (${(targetCryptoPct as number).toFixed(0)}%), ` +
        `${ALLOCATION_LABEL_STABLES} ${usd0(targetStableUsd as number)} (${(targetStablePct as number).toFixed(0)}%).` +
        (targetMarketExcluded ? ` ${ALLOCATION_MARKET_EXCLUDED}` : ` ${ALLOCATION_TARGET_CURRENT}`)
      : targetLoadingTreatment
        ? `Recommended allocation is loading.`
        : `Recommended allocation unavailable.`);

  // Deterministic Projected Growth — priced starting value + saved plan inputs.
  const projection = deriveProjection({
    startingValueUsd: value.totalUsd,
    anyUnpriced: value.anyUnpriced,
    monthlyContribution: goal?.monthly_saving_goal ?? null,
    timeline: goal?.timeline,
    riskTolerance: goal?.risk_tolerance,
  });
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

  // Caption for the priced Total Portfolio Value ("Crypto + Stablecoins", noting any excluded unpriced positions).
  const totalCaption = FS_TOTAL_VALUE_CAPTION + (value.anyUnpriced ? " · excludes unpriced positions" : "");
  // Truly empty (no positions to price) → show a clean $0 starting state. If positions exist but can't be priced
  // (anyUnpriced), a $0 would be misleading, so that case keeps the muted "—" + needs-pricing caption.
  const emptyZero = !priced && !value.anyUnpriced;

  // One allocation row: a real coloured bar + value when `pct` is present, otherwise an empty track + $0
  // (used for the disabled/placeholder groups — disconnected wallet, or connected with no plan yet).
  // When `pop` is provided, hovering/focusing the bar reveals a Current-vs-Recommended breakdown.
  const allocationRow = (
    label: string,
    pct: number | null,
    usd: number,
    variant: "current" | "recommended",
    pop?: AllocPopover | null,
  ) => (
    <div className={"allocation__row" + (pop ? " allocation__row--hoverable" : "")}>
      <span className="allocation__row-label">{label}</span>
      <div
        className="allocation__track"
        tabIndex={pop ? 0 : undefined}
        aria-label={pop ? pop.aria : undefined}
      >
        {pct != null && <div className={`allocation__bar allocation__bar--${variant}`} style={{ width: `${pct}%` }} />}
      </div>
      <span className="allocation__value">{usd0(usd)}</span>
      {pop && (
        <div className="allocation__popover" aria-hidden="true">
          <div className="allocation__popover-title">{pop.title}</div>
          <div className="allocation__popover-row">
            <span className="allocation__popover-label">{pop.primaryLabel}</span>
            <span className="allocation__popover-value">{usd0(pop.primaryUsd)}</span>
          </div>
          <div className="allocation__popover-row">
            <span className="allocation__popover-label">{pop.secondaryLabel}</span>
            <span className="allocation__popover-value">{usd0(pop.secondaryUsd)}</span>
          </div>
          <div className="allocation__popover-row allocation__popover-row--diff">
            <span className="allocation__popover-label">Difference</span>
            <span className="allocation__popover-value">{pop.diff}</span>
          </div>
        </div>
      )}
    </div>
  );

  // Hover-breakdown popovers for the four allocation bars — only when BOTH the live
  // current mix and a usable recommended target exist (otherwise the bars are empty).
  const allocReady = showAllocation && targetUsable;
  const diffText = (a: number, b: number) => {
    const r = Math.round(a - b);
    return `${r > 0 ? "+" : r < 0 ? "-" : ""}${Math.abs(r)}%`;
  };
  const mkPop = (
    group: string,
    asset: string,
    primaryLabel: string,
    primaryUsd: number,
    secondaryLabel: string,
    secondaryUsd: number,
    diffA: number,
    diffB: number,
  ): AllocPopover => {
    const diff = diffText(diffA, diffB);
    return {
      title: `${group} ${asset}`,
      primaryLabel,
      primaryUsd,
      secondaryLabel,
      secondaryUsd,
      diff,
      aria: `${group} ${asset}. ${primaryLabel} ${usd0(primaryUsd)}. ${secondaryLabel} ${usd0(secondaryUsd)}. Difference ${diff}.`,
    };
  };
  const pops = allocReady
    ? {
        currentCrypto: mkPop(ALLOCATION_GROUP_CURRENT, ALLOCATION_LABEL_CRYPTO, ALLOCATION_GROUP_CURRENT, cryptoUsd, ALLOCATION_GROUP_RECOMMENDED, targetCryptoUsd as number, cryptoPct, targetCryptoPct as number),
        currentStables: mkPop(ALLOCATION_GROUP_CURRENT, ALLOCATION_LABEL_STABLES, ALLOCATION_GROUP_CURRENT, stableUsd, ALLOCATION_GROUP_RECOMMENDED, targetStableUsd as number, stablePct, targetStablePct as number),
        recCrypto: mkPop(ALLOCATION_GROUP_RECOMMENDED, ALLOCATION_LABEL_CRYPTO, ALLOCATION_GROUP_RECOMMENDED, targetCryptoUsd as number, ALLOCATION_GROUP_CURRENT, cryptoUsd, targetCryptoPct as number, cryptoPct),
        recStables: mkPop(ALLOCATION_GROUP_RECOMMENDED, ALLOCATION_LABEL_STABLES, ALLOCATION_GROUP_RECOMMENDED, targetStableUsd as number, ALLOCATION_GROUP_CURRENT, stableUsd, targetStablePct as number, stablePct),
      }
    : null;

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
            ) : priced ? (
              <>
                <span className="hero-card__value-row">
                  <span className="hero-card__value">{formatUsd(value.totalUsd as number)}</span>
                  {dayChangePct != null && (
                    <TrendBadge pct={dayChangePct} period={FS_CHANGE_PERIOD} />
                  )}
                </span>
                <span className="card__caption">{totalCaption}</span>
              </>
            ) : emptyZero ? (
              <>
                <span className="hero-card__value">$0</span>
                <span className="card__caption">{FS_TOTAL_VALUE_CAPTION}</span>
              </>
            ) : (
              <>
                <span className="hero-card__value hero-card__value--muted">—</span>
                <span className="card__caption">{REAL_WALLET_VALUE_DESC}</span>
              </>
            )}
          </div>
          <div className="card">
            <span className="metric__label metric__label--with-info">
              {FS_NET_CONTRIB_LABEL}
              <InfoPopover label={FS_NET_CONTRIB_INFO_ARIA} align="right">
                <p className="info-popover__text">{FS_NET_CONTRIB_MANUAL_NOTE}</p>
              </InfoPopover>
            </span>
            {contribLoading ? (
              <>
                <span className="skeleton skeleton--value" />
                <span className="skeleton skeleton--line-short" />
              </>
            ) : netContributionsUsd != null ? (
              <>
                <span className="hero-card__value">{formatUsd(netContributionsUsd)}</span>
                <span className="card__caption">{FS_NET_CONTRIB_ESTIMATE}</span>
              </>
            ) : (
              <>
                <span className="hero-card__value">$0</span>
                <span className="card__caption">{FS_NET_CONTRIB_ESTIMATE}</span>
              </>
            )}
          </div>
        </div>
      </DashSection>

      {/* Safety Buffer — stablecoin reserve (incl. supplied USDC) vs expenses. */}
      <DashSection title={s.safety_buffer.title} caption={SAFETY_BUFFER_CAPTION}>
        {loading ? (
          // Mirrors the funded card: coverage value, progress bar, caption, legend.
          <div className="card">
            <div className="buffer__values">
              <span className="skeleton skeleton--value" />
            </div>
            <div className="skeleton skeleton--bar" />
            <span className="skeleton skeleton--line" />
            <div className="chart-legend">
              <span className="skeleton skeleton--line-short" />
            </div>
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
            {/* Hover/focus the bar to reveal the USD breakdown (covered / remaining / target). */}
            <div className="buffer__bar-wrap">
              <div
                className="progress progress--chart progress--hatched"
                role="progressbar"
                tabIndex={0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(buffer.coveragePct)}
                aria-label={`Safety Buffer is ${Math.round(buffer.coveragePct)} percent covered.`}
                aria-describedby={bufferPopoverId}
              >
                {/* Omit the fill when nothing is funded, so the hatched track keeps its
                    fully rounded pill shape (no square left edge from a 0-width fill). */}
                {buffer.coveragePct > 0 && (
                  <div className="progress__fill" style={{ width: `${buffer.coveragePct}%` }} />
                )}
              </div>
              <div className="buffer__popover" role="tooltip" id={bufferPopoverId}>
                <div className="buffer__popover-row">
                  <span className="buffer__popover-label">Covered</span>
                  <span className="buffer__popover-value">{formatUsd(buffer.stableUsd)}</span>
                </div>
                <div className="buffer__popover-row">
                  <span className="buffer__popover-label">Remaining</span>
                  <span className="buffer__popover-value">
                    {formatUsd(Math.max(0, buffer.targetUsd - buffer.stableUsd))}
                  </span>
                </div>
                <div className="buffer__popover-row buffer__popover-row--total">
                  <span className="buffer__popover-label">Target</span>
                  <span className="buffer__popover-value">{formatUsd(buffer.targetUsd)}</span>
                </div>
              </div>
            </div>
            <div className="chart-legend">
              <span className="chart-legend__item">
                <LegendMarker variant="dot" colorToken="--color-chart-series-4" />
                {SAFETY_BUFFER_COVERED_LEGEND}
              </span>
            </div>
          </div>
        ) : (
          <div className="card safety-buffer-empty">
            {/* Disabled Safety Buffer bar — the same bar, shown in muted colors until monthly expenses +
                risk tolerance are known (no target computed yet). Decorative; the caption explains the state. */}
            <div className="progress progress--chart safety-buffer-empty__bar" aria-hidden="true" />
            <div className="chart-legend safety-buffer-empty__legend">
              <span className="chart-legend__item">
                <LegendMarker variant="dot" colorToken="--color-text-disabled" />
                {SAFETY_BUFFER_COVERED_LEGEND}
              </span>
            </div>
            <p className="empty-card__description safety-buffer-empty__desc">{SAFETY_BUFFER_NEEDS}</p>
          </div>
        )}
      </DashSection>

      {/* Projected Growth — deterministic modeled estimate from priced value + plan. */}
      <DashSection
        title={s.projected_growth.title}
        caption={PG_CAPTION}
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
          // Mirrors the projection card: the chart plot area + a legend.
          <div className="card">
            <div className="skeleton skeleton--chart" />
            <div className="chart-legend">
              <span className="skeleton skeleton--line-short" />
            </div>
          </div>
        ) : projectionGrowth ? (
          <ProjectedGrowthChart growth={projectionGrowth} />
        ) : (
          <ProjectedGrowthEmptyChart description={PROJECTED_GROWTH_EMPTY_PROMPT} />
        )}
      </DashSection>

      {/* Current vs Recommended Allocation — current is live; recommended unavailable. */}
      <DashSection
        title={s.allocation.title}
        action={
          // Open UP and anchored RIGHT: the icon sits at the section's right edge, so a downward,
          // left-anchored popover overflowed the viewport (horizontal scrollbar → the page "jumped").
          loading ? undefined : (
            <InfoPopover label={ALLOCATION_INFO_ARIA} direction="up" align="right">
              {/* One methodology sentence for every case (connected, disconnected, stale market data). */}
              <p className="info-popover__text">{ALLOCATION_METHODOLOGY}</p>
            </InfoPopover>
          )
        }
      >
        {loading ? (
          // Mirrors the real layout: two groups (Current + Recommended), each a label + two label/bar/value rows, + legend.
          <div className="card">
            <div className="allocation__groups">
              {[0, 1].map((g) => (
                <div className="allocation__group" key={g}>
                  <span className="skeleton skeleton--line-short" />
                  {[0, 1].map((r) => (
                    <div className="allocation__row" key={r}>
                      <span className="skeleton skeleton--line-short" />
                      <span className="skeleton skeleton--bar" />
                      <span className="skeleton skeleton--line-short" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <span className="skeleton skeleton--line-short" />
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="allocation__groups" role="img" aria-label={allocationSummary}>
              {/* Current — live wallet allocation when priced; otherwise (disconnected) empty tracks + $0, disabled. */}
              <div className={"allocation__group" + (showAllocation ? "" : " allocation__group--empty")}>
                <span className="allocation__group-label">{ALLOCATION_GROUP_CURRENT}</span>
                {allocationRow(ALLOCATION_LABEL_CRYPTO, showAllocation ? cryptoPct : null, showAllocation ? cryptoUsd : 0, "current", pops?.currentCrypto)}
                {allocationRow(ALLOCATION_LABEL_STABLES, showAllocation ? stablePct : null, showAllocation ? stableUsd : 0, "recommended", pops?.currentStables)}
              </div>

              {/* Recommended — the shared CANONICAL target when usable; otherwise (no plan yet) empty tracks + $0, disabled. */}
              <div className={"allocation__group" + (targetUsable ? "" : " allocation__group--empty")}>
                <span className="allocation__group-label">{ALLOCATION_GROUP_RECOMMENDED}</span>
                {allocationRow(ALLOCATION_LABEL_CRYPTO, targetUsable ? (targetCryptoPct as number) : null, targetUsable ? (targetCryptoUsd as number) : 0, "current", pops?.recCrypto)}
                {allocationRow(ALLOCATION_LABEL_STABLES, targetUsable ? (targetStablePct as number) : null, targetUsable ? (targetStableUsd as number) : 0, "recommended", pops?.recStables)}
              </div>
            </div>
            <div className="chart-legend">
              <span className="chart-legend__item">
                <LegendMarker variant="dot" colorToken={showAllocation ? "--color-chart-series-1" : "--color-text-disabled"} />
                {ALLOCATION_LABEL_CRYPTO}
              </span>
              <span className="chart-legend__item">
                <LegendMarker variant="dot" colorToken={showAllocation ? "--color-chart-series-3" : "--color-text-disabled"} />
                {ALLOCATION_LABEL_STABLES}
              </span>
            </div>
            {/* Prompt shown while there is no recommended target (disconnected, or connected with no plan yet). */}
            {!targetUsable && <p className="empty-card__description allocation__empty-desc">{ALLOCATION_EMPTY_PROMPT}</p>}
          </div>
        )}
      </DashSection>
    </>
  );
}

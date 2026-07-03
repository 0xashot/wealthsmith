/**
 * DeploymentOverview — Asset Deployment Overview card per
 * patterns/portfolio-overview.md.
 *
 * Shows the total portfolio value and how it is deployed across Liquid /
 * Staked / Yield, as a segmented bar + legend. All values come from the
 * composed Portfolio state (fixture-backed); nothing is calculated here.
 * Not color-only: values and percentages render as text, and the bar carries
 * a role="img" accessible summary (components/chart.md).
 */
import type { DeploymentSegment } from "../types/portfolio";
import LegendMarker from "./LegendMarker";

/** One chart series token per segment, in order (Liquid, Staked, Yield). */
const SEGMENT_COLOR_TOKENS = [
  "--color-chart-series-1",
  "--color-chart-series-2",
  "--color-chart-series-3",
];

const fmtUsd = (v: number) => `$${v.toLocaleString("en-US")}`;
const fmtPct = (v: number) =>
  Number.isInteger(v) ? `${v}%` : `${v.toFixed(1)}%`;

interface Props {
  title: string;
  totalValueUsd: number;
  segments: DeploymentSegment[];
}

export default function DeploymentOverview({ title, totalValueUsd, segments }: Props) {
  const summary =
    `${title}. Total ${fmtUsd(totalValueUsd)}. ` +
    segments
      .map((s) => `${s.label}: ${fmtUsd(s.value_usd)}, ${fmtPct(s.percent)}.`)
      .join(" ");

  return (
    <section className="card" aria-label={title}>
      <h2 className="card__title">{title}</h2>
      <div className="deployment__total">
        <span className="deployment__total-label">Total Portfolio Value</span>
        <span className="deployment__total-value">{fmtUsd(totalValueUsd)}</span>
      </div>

      <div className="deployment__bar" role="img" aria-label={summary}>
        {segments.map((s, i) => (
          <span
            key={s.label}
            className="deployment__bar-segment"
            style={{
              width: `${s.percent}%`,
              background: `var(${SEGMENT_COLOR_TOKENS[i]})`,
            }}
          />
        ))}
      </div>

      <div className="chart-legend deployment__legend">
        {segments.map((s, i) => (
          <span key={s.label} className="chart-legend__item deployment__legend-item">
            <LegendMarker variant="dot" colorToken={SEGMENT_COLOR_TOKENS[i]} />
            <span className="deployment__legend-label">{s.label}</span>
            <span className="deployment__legend-value">{fmtUsd(s.value_usd)}</span>
            <span className="deployment__legend-percent">{fmtPct(s.percent)}</span>
          </span>
        ))}
      </div>
    </section>
  );
}

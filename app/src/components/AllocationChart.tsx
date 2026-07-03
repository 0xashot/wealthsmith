/**
 * AllocationChart — current vs recommended allocation comparison per
 * patterns/dashboard-layout.md: both series clearly labeled, values visible
 * as text (never color-only), recommendation values come from product logic.
 */
import type { AllocationState } from "../types/dashboard";
import LegendMarker from "./LegendMarker";

const fmtPct = (v: number) =>
  Number.isInteger(v) ? `${v}%` : `${v.toFixed(1)}%`;

export default function AllocationChart({ allocation }: { allocation: AllocationState }) {
  const groups = allocation.current_allocation.map((cur) => ({
    label: cur.label,
    current: cur.value_percent,
    recommended:
      allocation.recommended_allocation.find((r) => r.label === cur.label)
        ?.value_percent ?? null,
  }));

  // Accessible text summary from fixture values only (same pattern as
  // ProjectedGrowthChart: role="img" + aria-label so the chart is read as
  // one described image, not color-only bars). components/chart.md
  // (Accessibility).
  const summary =
    `${allocation.title}. ` +
    groups
      .map(
        (g) =>
          `${g.label}: current ${fmtPct(g.current)}` +
          (g.recommended !== null
            ? `, recommended ${fmtPct(g.recommended)}`
            : ", recommended unavailable") +
          "."
      )
      .join(" ");

  return (
    <section className="card" aria-label={allocation.title}>
      {/* per components/chart.md Chart Container: description directly under
          the heading; legend at the bottom of the chart content */}
      <h2 className="card__title">{allocation.title}</h2>
      <p className="card__caption">{allocation.display.caption}</p>

      <div className="allocation__groups" role="img" aria-label={summary}>
        {groups.map((g) => (
          <div key={g.label} className="allocation__group">
            <span className="allocation__group-label">{g.label}</span>
            <div className="allocation__row">
              <span className="allocation__row-label">Current</span>
              <div className="allocation__track">
                <div
                  className="allocation__bar allocation__bar--current"
                  style={{ width: `${g.current}%` }}
                />
              </div>
              <span className="allocation__value">{fmtPct(g.current)}</span>
            </div>
            {g.recommended !== null && (
              <div className="allocation__row">
                <span className="allocation__row-label">Recommended</span>
                <div className="allocation__track">
                  <div
                    className="allocation__bar allocation__bar--recommended"
                    style={{ width: `${g.recommended}%` }}
                  />
                </div>
                <span className="allocation__value">{fmtPct(g.recommended)}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* approved dot markers per components/chart.md Legend Markers,
          paired with visible text labels */}
      <div className="chart-legend">
        <span className="chart-legend__item">
          <LegendMarker variant="dot" colorToken="--color-chart-series-1" />
          Current
        </span>
        <span className="chart-legend__item">
          <LegendMarker variant="dot" colorToken="--color-chart-series-3" />
          Recommended
        </span>
      </div>
    </section>
  );
}

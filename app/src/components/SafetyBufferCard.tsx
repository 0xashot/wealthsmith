/**
 * SafetyBufferCard — progress metric card per components/metric-card.md
 * (Progress Metric Card variant) and components/progress-bar.md.
 *
 * All values (coverage percent, display strings, severity) come from
 * Safety Buffer logic via page state. The component performs no calculation
 * and does not hide the underfunded state.
 */
import type { SafetyBufferState } from "../types/dashboard";
import LegendMarker from "./LegendMarker";

export default function SafetyBufferCard({ buffer }: { buffer: SafetyBufferState }) {
  const pct = buffer.progress.value_percent;

  return (
    // id + tabIndex: this card is the on-dashboard detail area for the
    // Safety Buffer suggestion; the Top Pick "Review" action focuses it.
    <section id="safety-buffer" tabIndex={-1} className="card" aria-label={buffer.title}>
      <h2 className="card__title">{buffer.title}</h2>
      <div className="buffer__values">
        <span className="metric__value metric__value--primary">
          {buffer.display.primary_value}
        </span>
        <span className="buffer__secondary">{buffer.display.secondary_value}</span>
      </div>
      <div
        className="progress progress--hatched"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label={buffer.progress.accessibility_label}
      >
        {/* Omit the fill entirely when nothing is funded, so the hatched track keeps
            its fully rounded pill shape (no square left edge from a 0-width fill). */}
        {pct > 0 && (
          <div
            className="progress__fill"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      <p className="buffer__caption">{buffer.display.caption}</p>
      {/* content order per patterns/dashboard-layout.md Safety Buffer:
          title, metric, progress bar, explanation text, then the centered
          Covered Buffer legend last. Approved dot marker; marker color
          matches the progress fill (the buffer fill colour, never danger). */}
      <div className="chart-legend">
        <span className="chart-legend__item">
          <LegendMarker
            variant="dot"
            colorToken="--color-chart-series-4"
          />
          Covered Buffer
        </span>
      </div>
    </section>
  );
}

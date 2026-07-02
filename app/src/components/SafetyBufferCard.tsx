/**
 * SafetyBufferCard — progress metric card per components/metric-card.md
 * (Progress Metric Card variant) and components/progress-bar.md.
 *
 * All values (coverage percent, display strings, severity) come from
 * Safety Buffer logic via page state. The component performs no calculation
 * and does not hide the underfunded state.
 */
import type { SafetyBufferState } from "../types/dashboard";

export default function SafetyBufferCard({ buffer }: { buffer: SafetyBufferState }) {
  const pct = buffer.progress.value_percent;

  return (
    <section className="card" aria-label={buffer.title}>
      <h2 className="card__title">{buffer.title}</h2>
      <div className="buffer__values">
        <span className="metric__value metric__value--primary">
          {buffer.display.primary_value}
        </span>
        <span className="buffer__secondary">{buffer.display.secondary_value}</span>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label={buffer.progress.accessibility_label}
      >
        <div
          className="progress__fill progress__fill--danger"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="buffer__caption">{buffer.display.caption}</p>
    </section>
  );
}

/**
 * FinancialSnapshot — card with metric values per components/card.md and
 * components/metric-card.md. Values render exactly as provided by page state
 * (already formatted in the fixture); nothing is computed here.
 */
import type { SnapshotMetric } from "../types/dashboard";

interface Props {
  title: string;
  metrics: SnapshotMetric[];
}

export default function FinancialSnapshot({ title, metrics }: Props) {
  return (
    <section className="card" aria-label={title}>
      <h2 className="card__title">{title}</h2>
      <div className="snapshot__grid">
        {metrics.map((m) => (
          <div key={m.id} className="metric">
            <span className="metric__label">{m.label}</span>
            <span className="metric__value">{m.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

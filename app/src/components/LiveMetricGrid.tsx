/**
 * LiveMetricGrid — a product metric card (same card + snapshot grid styling as
 * the fixture Financial Snapshot) populated from LIVE wallet facts. Each metric
 * is a label + a value; a metric with `note` renders in the approved
 * "unavailable" style (e.g. Portfolio Value → "Pricing not connected").
 *
 * Presentational only: it computes nothing. It exists so the real-wallet
 * Dashboard/Portfolio can reuse the exact product visual structure while showing
 * honest live counts/balances and polished unavailable states — never fixtures.
 */
interface LiveMetric {
  label: string;
  value: string;
  /** Optional helper line under the value. */
  note?: string;
  /** Render the value in the muted "unavailable" style (e.g. no pricing yet). */
  unavailable?: boolean;
}

interface Props {
  title: string;
  caption?: string;
  ariaLabel?: string;
  metrics: LiveMetric[];
}

export default function LiveMetricGrid({ title, caption, ariaLabel, metrics }: Props) {
  return (
    <section className="card" aria-label={ariaLabel ?? title}>
      <h2 className="card__title">{title}</h2>
      {caption && <p className="card__caption">{caption}</p>}
      <div className="snapshot__grid">
        {metrics.map((m) => (
          <div key={m.label} className="metric">
            <span className="metric__label">{m.label}</span>
            <span className={"metric__value" + (m.unavailable ? " metric__value--unavailable" : "")}>
              {m.value}
            </span>
            {m.note && <span className="metric__note">{m.note}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

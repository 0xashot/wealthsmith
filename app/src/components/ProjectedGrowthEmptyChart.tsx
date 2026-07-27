/**
 * ProjectedGrowthEmptyChart — the Projected Growth empty state (no plan / disconnected).
 *
 * Mirrors the connected-wallet ProjectedGrowthChart (same baseline axis, line, dots, x-axis labels and
 * legend, same responsive sizing) but in SUBDUED colors and with NO values: an illustrative rising line,
 * no data-point value labels. Purely decorative (aria-hidden); the description below explains that a real,
 * personalized projection appears once the goal and timeline are set. No projection math, no invented numbers.
 */
import { useLayoutEffect, useRef, useState } from "react";
import LegendMarker from "./LegendMarker";

const H = 200;
const FALLBACK_W = 560;
/* Same padding as ProjectedGrowthChart so the placeholder lines up with the real chart. */
const PAD = { top: 32, right: 32, bottom: 28, left: 32 };
const X_LABELS = ["Now", "2Y", "4Y", "6Y", "8Y", "10Y"];
/* Illustrative rising shape only (relative heights) — never presented as a real projection. */
const SERIES = [15, 30, 72, 105, 122, 145];
const MAX_Y = 160;

export default function ProjectedGrowthEmptyChart({ description }: { description: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(FALLBACK_W);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(w);
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const W = width;
  const x = (i: number) => PAD.left + (i / (X_LABELS.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => H - PAD.bottom - (v / MAX_Y) * (H - PAD.top - PAD.bottom);
  const path = SERIES.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");

  return (
    <section className="card" aria-label="Illustrative Projected Growth placeholder">
      <div ref={hostRef} className="chart-host">
        <svg className="chart" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
          <line
            className="chart__axis"
            x1={PAD.left}
            y1={H - PAD.bottom}
            x2={W - PAD.right}
            y2={H - PAD.bottom}
          />
          <path className="pg-empty__line" d={path} fill="none" />
          {SERIES.map((v, i) => (
            <g key={i}>
              <circle className="pg-empty__dot" cx={x(i)} cy={y(v)} r={4} />
              <text className="pg-empty__axis-label" x={x(i)} y={H - PAD.bottom + 18} textAnchor="middle">
                {X_LABELS[i]}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="chart-legend pg-empty__legend">
        <span className="chart-legend__item">
          <LegendMarker variant="line" colorToken="--color-text-disabled" />
          Growth
        </span>
      </div>

      <p className="empty-card__description pg-empty__desc">{description}</p>
    </section>
  );
}

/**
 * StrategyLabChart — multi-series line chart for the Strategy Lab scenarios,
 * modeled on ProjectedGrowthChart (components/chart.md): same axis/label
 * typography tokens, dot legend markers, accessible text summary — extended with
 * a fixed Y-axis (ticks + gridlines), three series stroked with their chart
 * series tokens, and PER-LINE hover tooltips: hovering a hoverable series (its
 * line or points) shows that series' story for the nearest date — legend row,
 * value + delta, and the approved note copy. The Safety Buffer line is not
 * hoverable (it carries no notes).
 *
 * The SVG coordinate width tracks the rendered width (1 SVG unit = 1 CSS px) so
 * label text renders at its token's actual pixel size (chart.md Label Typography).
 * Fixture data only — nothing here reads live prices or the user's portfolio.
 */
import { useLayoutEffect, useRef, useState } from "react";
import type { StrategyLabSeries } from "../state/strategyLabState";
import LegendMarker from "./LegendMarker";
import { TrendIcon } from "./TrendBadge";

const H = 260;
const FALLBACK_W = 560;
/* Left padding fits the Y tick labels ("60k"); the rest matches Projected Growth
   so edge X labels stay inside the plot and centered on their points. */
/* bottom fits the date row sitting 8px clear of the "0" tick label. */
const PAD = { top: 24, right: 32, bottom: 50, left: 48 };
/* Invisible fat stroke over each hoverable line — the hover target. */
const HOVER_STROKE = 16;

const fmtUsd = (v: number) => `$${v.toLocaleString("en-US")}`;
/** Y tick label: 0 → "0", 10000 → "10k" (the approved axis format for this chart). */
const fmtTick = (v: number) => (v === 0 ? "0" : `${v / 1000}k`);

interface Props {
  /** X-axis date labels; every series has one point per date. */
  dates: string[];
  series: StrategyLabSeries[];
  yTicksUsd: number[];
  /** Accessible chart title (the scenario sub-heading). */
  title: string;
}

export default function StrategyLabChart({ dates, series, yTicksUsd, title }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(FALLBACK_W);
  /** Hovered (series, date) — per-line tooltips, one series at a time. */
  const [hovered, setHovered] = useState<{ seriesId: string; index: number } | null>(null);

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

  if (dates.length === 0 || series.length === 0) return null;

  const W = width;
  const maxY = yTicksUsd[yTicksUsd.length - 1];
  const x = (index: number) => PAD.left + (index / (dates.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => H - PAD.bottom - (v / maxY) * (H - PAD.top - PAD.bottom);
  const linePath = (s: StrategyLabSeries) =>
    s.points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.valueUsd)}`).join(" ");

  /** Nearest date index for a mouse position over a series' hover stroke. */
  const nearestIndex = (clientX: number) => {
    const host = hostRef.current;
    if (!host) return 0;
    const relX = clientX - host.getBoundingClientRect().left;
    const t = (relX - PAD.left) / (W - PAD.left - PAD.right);
    return Math.min(dates.length - 1, Math.max(0, Math.round(t * (dates.length - 1))));
  };

  /** Hover a series at a date — but when another hoverable series ABOVE it in the
   * list (WealthSmith first) sits at visually the same level there, show THAT
   * series instead: where the lines coincide, the primary story wins. */
  const hoverAt = (target: StrategyLabSeries, index: number) => {
    for (const s of series) {
      if (s === target) break;
      if (s.hoverable && Math.abs(y(s.points[index].valueUsd) - y(target.points[index].valueUsd)) <= HOVER_STROKE / 2) {
        setHovered({ seriesId: s.id, index });
        return;
      }
    }
    setHovered({ seriesId: target.id, index });
  };

  const hoveredSeries = hovered ? series.find((s) => s.id === hovered.seriesId) : null;
  const hoveredPoint = hoveredSeries && hovered ? hoveredSeries.points[hovered.index] : null;

  const summary =
    `${title}. ` +
    series
      .map((s) => `${s.label}: ` + s.points.map((p, i) => `${dates[i]} ${fmtUsd(p.valueUsd)}`).join(", "))
      .join(". ") +
    ".";

  return (
    <section className="card" aria-label={title}>
      <div ref={hostRef} className="chart-host">
        <svg className="chart" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
          {/* Y-axis ticks: horizontal gridline + label per tick (baseline uses the axis style). */}
          {yTicksUsd.map((tick) => (
            <g key={tick}>
              <line
                className={tick === 0 ? "chart__axis" : "chart__gridline"}
                x1={PAD.left}
                y1={y(tick)}
                x2={W - PAD.right}
                y2={y(tick)}
              />
              <text className="chart__axis-label" x={PAD.left - 8} y={y(tick) + 4} textAnchor="end">
                {fmtTick(tick)}
              </text>
            </g>
          ))}

          {/* Series lines + points, each stroked with its own series token. SVG paints
              in document order, so the list is REVERSED: the first series (WealthSmith)
              renders last and sits on top where lines overlap. Legend keeps the
              original order. */}
          {[...series].reverse().map((s) => (
            <g key={s.id}>
              <path className="chart__line" d={linePath(s)} fill="none" style={{ stroke: `var(${s.colorToken})` }} />
              {s.points.map((p, i) => (
                <circle
                  key={i}
                  className="chart__dot"
                  cx={x(i)}
                  cy={y(p.valueUsd)}
                  r={hovered?.seriesId === s.id && hovered.index === i ? 5.5 : 3.5}
                  style={{ fill: `var(${s.colorToken})` }}
                />
              ))}
            </g>
          ))}

          {/* X-axis date labels, centered on their data points. */}
          {dates.map((d, i) => (
            <text key={d} className="chart__axis-label" x={x(i)} y={H - PAD.bottom + 38} textAnchor="middle">
              {d}
            </text>
          ))}

          {/* Hover targets: an invisible fat stroke along each HOVERABLE line. The
              tooltip follows the nearest date on that line; leaving clears it.
              Painted after the visible lines so they always win the pointer, and
              REVERSED like the lines so where series overlap the pointer favors
              the visually-top line (WealthSmith). */}
          {[...series]
            .reverse()
            .filter((s) => s.hoverable)
            .map((s) => (
              <path
                key={`hover-${s.id}`}
                className="chart__hover-stroke"
                d={linePath(s)}
                fill="none"
                strokeWidth={HOVER_STROKE}
                onMouseMove={(e) => hoverAt(s, nearestIndex(e.clientX))}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
        </svg>

        {hovered && hoveredSeries && hoveredPoint && (
          <div
            className="chart-tooltip chart-tooltip--story"
            role="status"
            style={{
              left: Math.min(Math.max(x(hovered.index), 150), W - 150),
              top: y(hoveredPoint.valueUsd),
            }}
          >
            <div className="chart-tooltip__series">
              <LegendMarker variant="dot" colorToken={hoveredSeries.colorToken} />
              <span>{hoveredSeries.label}</span>
            </div>
            <div className="chart-tooltip__value-row">
              <span className="chart-tooltip__value">{fmtUsd(hoveredPoint.valueUsd)}</span>
              {hoveredPoint.deltaLabel && (
                <span
                  className={
                    // Any minus-from-start delta reads in the error color, icon or not.
                    /^[−-]/.test(hoveredPoint.deltaLabel)
                      ? "chart-tooltip__delta-down"
                      : "chart-tooltip__delta-up"
                  }
                >
                  {hoveredPoint.trend && <TrendIcon dir={hoveredPoint.trend} />}
                  {hoveredPoint.deltaLabel}
                </span>
              )}
            </div>
            {hoveredPoint.note && (
              <p className="chart-tooltip__note">
                <strong>{hoveredPoint.note.title}:</strong> {hoveredPoint.note.body}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Dot legend markers — same treatment as the Projected Growth legend. */}
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.id} className="chart-legend__item">
            <LegendMarker variant="dot" colorToken={s.colorToken} />
            {s.label}
          </span>
        ))}
      </div>
    </section>
  );
}

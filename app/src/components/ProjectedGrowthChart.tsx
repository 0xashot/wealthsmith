/**
 * ProjectedGrowthChart — line chart per components/chart.md guidance in
 * patterns/dashboard-layout.md: modeled/estimated language, visible labels,
 * accessible text summary, no guarantee language.
 *
 * Renders the projection series provided by projection logic (fixture).
 * Scales are derived from the provided points for presentation only.
 *
 * The SVG coordinate width tracks the rendered width (1 SVG unit = 1 CSS px)
 * so label text renders at its token's actual pixel size — per
 * components/chart.md (Label Typography), viewBox scaling must not inflate
 * label text. Axis labels: typography.chart.label; value labels:
 * typography.chart.value.
 */
import { useId, useLayoutEffect, useRef, useState } from "react";
import type { ProjectedGrowthState } from "../types/dashboard";
import LegendMarker from "./LegendMarker";

const H = 200;
const FALLBACK_W = 560;
/* 32px side padding keeps edge labels inside the plot so all labels can
   center exactly on their data point — per components/chart.md Axis Label
   Positioning, offsets/anchoring must not break point alignment */
const PAD = { top: 32, right: 32, bottom: 28, left: 32 };

const fmtUsd = (v: number) => `$${v.toLocaleString("en-US")}`;

export default function ProjectedGrowthChart({ growth }: { growth: ProjectedGrowthState }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(FALLBACK_W);
  const [hovered, setHovered] = useState<number | null>(null);
  const areaPatternId = useId();

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

  const series = growth.series[0];
  if (!series || series.points.length === 0) return null;

  const W = width;
  const points = series.points;
  const maxY = Math.max(...points.map((p) => p.value_usd));

  /* milestone x-spacing — components/chart.md Axis Label Positioning:
     the MVP Dashboard Projected Growth chart distributes milestones evenly
     (x = milestoneIndex / (milestoneCount - 1)), and each milestone's data
     point, value label, and axis label share this same x-position */
  const x = (index: number) =>
    PAD.left + (index / (points.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) =>
    H - PAD.bottom - (v / maxY) * (H - PAD.top - PAD.bottom);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value_usd)}`)
    .join(" ");

  /* Area under the line: the line, then down to the baseline and back — filled with
     the light-blue dotted pattern. Drawn behind the line + points. */
  const areaPath =
    `${path} L${x(points.length - 1)},${H - PAD.bottom} L${x(0)},${H - PAD.bottom} Z`;

  const summary =
    `${growth.title}. ${series.label}: ` +
    points.map((p) => `year ${p.year} ${fmtUsd(p.value_usd)}`).join(", ") +
    ".";

  return (
    <section className="card" aria-label={growth.title || series.label}>
      {/* per components/chart.md Chart Container: description directly under the
          heading. Title is optional — omitted when a section heading already sits
          above the card (real-wallet dashboard). */}
      {growth.title && <h2 className="card__title">{growth.title}</h2>}
      {growth.display.caption && (
        <p className="card__caption">{growth.display.caption}</p>
      )}
      <div ref={hostRef} className="chart-host">
        <svg
          className="chart"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={summary}
        >
          {/* Light-blue dotted pattern that fills the area under the line. */}
          <defs>
            <pattern
              id={areaPatternId}
              width="5"
              height="5"
              patternUnits="userSpaceOnUse"
            >
              <circle className="chart__area-dot" cx="1" cy="1" r="1" />
            </pattern>
          </defs>
          {/* baseline + gridlines */}
          <line
            className="chart__axis"
            x1={PAD.left}
            y1={H - PAD.bottom}
            x2={W - PAD.right}
            y2={H - PAD.bottom}
          />
          <path className="chart__area" d={areaPath} fill={`url(#${areaPatternId})`} />
          <path className="chart__line" d={path} fill="none" />
          {/* Vertical guide from baseline to the hovered point. */}
          {hovered != null && (
            <line
              className="chart__guide"
              x1={x(hovered)}
              y1={y(points[hovered].value_usd)}
              x2={x(hovered)}
              y2={H - PAD.bottom}
            />
          )}
          {points.map((p, i) => (
            <g key={p.year}>
              <circle
                className={"chart__dot" + (hovered === i ? " chart__dot--active" : "")}
                cx={x(i)}
                cy={y(p.value_usd)}
                r={hovered === i ? 5.5 : 4}
              />
              <text
                className="chart__value-label"
                x={x(i)}
                y={y(p.value_usd) - 10}
                textAnchor="middle"
              >
                {fmtUsd(p.value_usd)}
              </text>
              <text
                className="chart__axis-label"
                x={x(i)}
                y={H - PAD.bottom + 18}
                textAnchor="middle"
              >
                {p.label ?? `Year ${p.year}`}
              </text>
            </g>
          ))}
          {/* Transparent per-point hover columns (each spans to its neighbours' midpoints). */}
          {points.map((p, i) => {
            const half = (W - PAD.left - PAD.right) / (points.length - 1) / 2;
            return (
              <rect
                key={`hit-${p.year}`}
                className="chart__hit"
                x={x(i) - half}
                y={0}
                width={half * 2}
                height={H}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>
        {hovered != null && (
          <div
            className="chart-tooltip"
            role="status"
            style={{
              left: Math.min(Math.max(x(hovered), 96), W - 96),
              top: y(points[hovered].value_usd),
            }}
          >
            <div className="chart-tooltip__year">
              {points[hovered].label ?? `Year ${points[hovered].year}`}
            </div>
            <div className="chart-tooltip__value">{fmtUsd(points[hovered].value_usd)}</div>
            {hovered > 0 && (
              <div className="chart-tooltip__delta">
                +{fmtUsd(points[hovered].value_usd - points[0].value_usd)} from today
              </div>
            )}
          </div>
        )}
      </div>
      {/* approved line marker for the line series per components/chart.md
          Legend Markers; label comes from the series data */}
      <div className="chart-legend">
        <span className="chart-legend__item">
          <LegendMarker variant="dot" colorToken="--color-chart-series-1" />
          {series.label}
        </span>
      </div>
    </section>
  );
}

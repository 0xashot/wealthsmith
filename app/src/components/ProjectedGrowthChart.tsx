/**
 * ProjectedGrowthChart — line chart per components/chart.md guidance in
 * patterns/dashboard-layout.md: modeled/estimated language, visible labels,
 * accessible text summary, no guarantee language.
 *
 * Renders the projection series provided by projection logic (fixture).
 * Scales are derived from the provided points for presentation only.
 */
import type { ProjectedGrowthState } from "../types/dashboard";

const W = 560;
const H = 200;
const PAD = { top: 32, right: 16, bottom: 28, left: 56 };

const fmtUsd = (v: number) => `$${v.toLocaleString("en-US")}`;

export default function ProjectedGrowthChart({ growth }: { growth: ProjectedGrowthState }) {
  const series = growth.series[0];
  if (!series || series.points.length === 0) return null;

  const points = series.points;
  const maxX = Math.max(...points.map((p) => p.year));
  const maxY = Math.max(...points.map((p) => p.value_usd));

  const x = (year: number) =>
    PAD.left + (year / maxX) * (W - PAD.left - PAD.right);
  const y = (v: number) =>
    H - PAD.bottom - (v / maxY) * (H - PAD.top - PAD.bottom);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.year)},${y(p.value_usd)}`)
    .join(" ");

  const summary =
    `${growth.title}. ${series.label}: ` +
    points.map((p) => `year ${p.year} ${fmtUsd(p.value_usd)}`).join(", ") +
    ".";

  return (
    <section className="card" aria-label={growth.title}>
      {/* per components/chart.md Chart Container: description directly under
          the heading */}
      <h2 className="card__title">{growth.title}</h2>
      <p className="card__caption">{growth.display.caption}</p>
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={summary}
      >
        {/* baseline + gridlines */}
        <line
          className="chart__axis"
          x1={PAD.left}
          y1={H - PAD.bottom}
          x2={W - PAD.right}
          y2={H - PAD.bottom}
        />
        <path className="chart__line" d={path} fill="none" />
        {points.map((p) => (
          <g key={p.year}>
            <circle className="chart__dot" cx={x(p.year)} cy={y(p.value_usd)} r={4} />
            <text
              className="chart__value-label"
              x={x(p.year)}
              y={y(p.value_usd) - 10}
              textAnchor={p.year === 0 ? "start" : p.year === maxX ? "end" : "middle"}
            >
              {fmtUsd(p.value_usd)}
            </text>
            <text
              className="chart__axis-label"
              x={x(p.year)}
              y={H - PAD.bottom + 18}
              textAnchor={p.year === 0 ? "start" : p.year === maxX ? "end" : "middle"}
            >
              {`Year ${p.year}`}
            </text>
          </g>
        ))}
      </svg>
    </section>
  );
}

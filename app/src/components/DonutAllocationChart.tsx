/**
 * DonutAllocationChart — composition (donut) allocation chart per
 * components/donut-allocation-chart.md. Shows the composition of a portfolio or
 * asset group by percentage and value: a rounded-segment ring, a center total,
 * dotted leader-line callouts, and a legend.
 *
 * Purely presentational and data-driven: segments, values, percentages, and
 * colors are provided by the caller. It calculates no value, price, percentage,
 * or category. When there is no priced total it shows the unavailable state in
 * the same card — never a fake chart; while data loads it shows a skeleton.
 *
 * The donut is a FIXED pixel size (so the center value can match the dashboard
 * metric typography exactly) and is horizontally centered in the card. The SVG is
 * sized 1:1 with the card width (the legend is an overlay), so leader lines can
 * reach the card edges and label text renders at its true pixel size.
 */
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import LegendMarker from "./LegendMarker";

export interface DonutSegment {
  id: string;
  label: string;
  valueUsd: number;
  /** Share of the priced whole, 0–100. */
  percent: number;
  /** CSS custom-property name, e.g. "--color-chart-series-1". */
  colorToken: string;
  /** Render a leader-line callout for this segment (desktop widths only). */
  callout?: boolean;
}

interface Props {
  totalValueUsd: number | null;
  /** Formatted center value, e.g. "$35,000". */
  centerLabel: string;
  segments: DonutSegment[];
  /** Message shown (in the same card) when there is no priced total. */
  emptyState: string;
  /** Optional caption, e.g. "Excludes positions without a sourced price." */
  warning?: string;
  /** Accessible summary, e.g. "Portfolio allocation: Crypto 87%, Stables 13%." */
  ariaSummary: string;
  /** Show a skeleton while the underlying data is still loading. */
  loading?: boolean;
}

const MIN_H = 220;
const R = 68;
const STROKE = 22;
/** Target visible gap between adjacent segments, on each side (px). */
const GAP_PX = 4;
const GAP_DEG = ((GAP_PX + STROKE) / (2 * Math.PI * R)) * 360;
/** Anchor just under the segment's outer edge so leaders emerge from the color. */
const ANCHOR_R = R + STROKE / 2 - 3;
const FALLBACK_W = 640;
/** Below this width, drop callouts and stack the legend under the chart. */
const CALLOUT_MIN_W = 460;
/** Right-side space reserved for the overlaid legend. */
const LEGEND_RESERVE = 134;
const LABEL_PAD = 6;
/** Min vertical spacing between stacked (distributed) callouts. */
const ROW_H = 40;

/** Point on a circle at `deg` clockwise from the top. */
function polar(cx: number, cy: number, deg: number, r: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** Clockwise arc path from `startDeg` to `endDeg` (degrees clockwise from top). */
function arc(cx: number, cy: number, startDeg: number, endDeg: number, r: number) {
  const s = polar(cx, cy, startDeg, r);
  const e = polar(cx, cy, endDeg, r);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

/** Callout side for a segment's mid-angle: right half is 0–180° clockwise from top. */
function isRight(mid: number) {
  return ((mid % 360) + 360) % 360 < 180;
}

export default function DonutAllocationChart({
  totalValueUsd,
  centerLabel,
  segments,
  emptyState,
  warning,
  ariaSummary,
  loading,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(FALLBACK_W);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const w = host.clientWidth;
      if (w > 0) setMeasured(w);
    };
    measure();
    const raf = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
    // Re-run once the chart (and its host ref) actually mounts after the skeleton.
  }, [loading]);

  if (loading) {
    return (
      <div className="card donut-card">
        {/* Mirror the donut layout: circle centered in the full-width plot, legend
            overlaid on the right — so nothing shifts when it resolves. */}
        <div className="donut">
          <div className="donut__plot donut__plot--skeleton">
            <div className="skeleton skeleton--donut" />
          </div>
          <ul className="donut__legend">
            {[0, 1].map((i) => (
              <li key={i} className="donut__legend-item">
                <span className="skeleton skeleton--dot" />
                <span className="skeleton skeleton--line-short" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (totalValueUsd == null || segments.length === 0) {
    return (
      <div className="card empty-card">
        <p className="empty-card__description">{emptyState}</p>
      </div>
    );
  }

  const W = Math.max(240, measured);
  const CX = W / 2; // donut centered in the full card width
  const showCallouts = W >= CALLOUT_MIN_W;

  // Cumulative arcs, clockwise from the top. The gap is shrunk for slices smaller
  // than the gap so a tiny slice stays a tiny arc (never inverts into a giant arc
  // when the gap would exceed the slice).
  let cursor = 0;
  const arcs = segments.map((seg) => {
    const sweep = (Math.max(0, seg.percent) / 100) * 360;
    const rawStart = cursor;
    const rawEnd = cursor + sweep;
    cursor = rawEnd;
    const gap = Math.min(GAP_DEG, sweep * 0.6);
    return {
      seg,
      sweep,
      start: rawStart + gap / 2,
      end: rawEnd - gap / 2,
      mid: rawStart + sweep / 2,
    };
  });

  const calloutSegs = showCallouts ? arcs.filter((a) => a.seg.callout && a.seg.percent >= 1) : [];
  // 2 segments (e.g. Crypto/Stables) use a top-fanned pair; more slices distribute
  // vertically down each side (Crypto Assets Allocation).
  const distributed = calloutSegs.length > 2;
  const rightCount = calloutSegs.filter((a) => isRight(a.mid)).length;
  const sideMax = Math.max(rightCount, calloutSegs.length - rightCount);
  const H = distributed ? Math.max(MIN_H, sideMax * ROW_H + 40) : MIN_H;
  const CY = H / 2;

  interface Callout {
    id: string;
    label: string;
    pct: number;
    right: boolean;
    labelX: number;
    y: number;
    points: string;
  }

  let callouts: Callout[];
  if (!distributed) {
    // Pair: anchor onto the colored arc (upper-left / upper-right) and run a long
    // dotted leader out to a label near the card edge.
    callouts = calloutSegs.map((a) => {
      const right = isRight(a.mid);
      const target = right ? 40 : 320;
      const anchorAngle = Math.min(a.end - 4, Math.max(a.start + 4, target));
      const anchor = polar(CX, CY, anchorAngle, ANCHOR_R);
      const labelX = right ? W - LEGEND_RESERVE : LABEL_PAD;
      const lineEndX = right ? labelX - 8 : labelX + 8;
      return {
        id: a.seg.id,
        label: a.seg.label,
        pct: Math.round(a.seg.percent),
        right,
        labelX,
        y: anchor.y,
        points: `${anchor.x.toFixed(1)},${anchor.y.toFixed(1)} ${lineEndX.toFixed(1)},${anchor.y.toFixed(1)}`,
      };
    });
  } else {
    // Distributed: anchor each slice at its mid-angle, then stack the labels down
    // each side without overlapping. Leaders bend from the arc to a short
    // horizontal run into the label.
    const buildSide = (right: boolean): Callout[] => {
      const rows = calloutSegs
        .filter((a) => isRight(a.mid) === right)
        .map((a) => {
          const anchorAngle = Math.min(a.end - 3, Math.max(a.start + 3, a.mid));
          const anchor = polar(CX, CY, anchorAngle, ANCHOR_R);
          return { seg: a.seg, anchor, y: anchor.y };
        })
        .sort((x, y) => x.anchor.y - y.anchor.y);
      // Push down to enforce spacing, then shift up if it overflows the bottom.
      let prev = -Infinity;
      for (const row of rows) {
        row.y = Math.max(row.anchor.y, prev + ROW_H);
        prev = row.y;
      }
      const overflow = (rows.length ? rows[rows.length - 1].y : 0) - (H - 14);
      if (overflow > 0) for (const row of rows) row.y -= overflow;
      const top = rows.length ? rows[0].y : 0;
      if (top < 16) for (const row of rows) row.y += 16 - top;

      const labelX = right ? W - LEGEND_RESERVE : LABEL_PAD;
      const lineEndX = right ? labelX - 8 : labelX + 8;
      const bendX = right ? lineEndX - 24 : lineEndX + 24;
      return rows.map((row) => ({
        id: row.seg.id,
        label: row.seg.label,
        pct: Math.round(row.seg.percent),
        right,
        labelX,
        y: row.y,
        points: `${row.anchor.x.toFixed(1)},${row.anchor.y.toFixed(1)} ${bendX.toFixed(1)},${row.y.toFixed(1)} ${lineEndX.toFixed(1)},${row.y.toFixed(1)}`,
      }));
    };
    callouts = [...buildSide(true), ...buildSide(false)];
  }

  return (
    <div className="card donut-card">
      <div className="donut">
        <div className="donut__plot" ref={hostRef}>
          <svg
            className="donut__svg"
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={ariaSummary}
          >
            {/* Leaders first — behind the track ring and segments. */}
            {callouts.map((c) => (
              <polyline key={`${c.id}-leader`} className="donut__leader" fill="none" points={c.points} />
            ))}

            {/* Track ring — light-grey background donut. */}
            <circle className="donut__track" cx={CX} cy={CY} r={R} strokeWidth={STROKE} fill="none" />

            {/* Segments — thick, rounded, with gaps. */}
            {arcs
              .filter((a) => a.sweep > 0.01)
              .map((a) => (
                <path
                  key={a.seg.id}
                  d={arc(CX, CY, a.start, a.end, R)}
                  fill="none"
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  style={{ stroke: `var(${a.seg.colorToken})` } as CSSProperties}
                />
              ))}

            {/* Callout labels — on top of the segments. */}
            {callouts.map((c) => (
              <g key={`${c.id}-label`}>
                <text
                  className="donut__callout-label"
                  x={c.labelX}
                  y={c.y - 2}
                  textAnchor={c.right ? "end" : "start"}
                >
                  {c.label}
                </text>
                <text
                  className="donut__callout-pct"
                  x={c.labelX}
                  y={c.y + 18}
                  textAnchor={c.right ? "end" : "start"}
                >
                  {c.pct}%
                </text>
              </g>
            ))}

            {/* Center total — metric typography, matching the dashboard metric value. */}
            <text
              className="donut__center"
              x={CX}
              y={CY}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {centerLabel}
            </text>
          </svg>
        </div>

        <ul className="donut__legend">
          {segments.map((seg) => (
            <li key={seg.id} className="donut__legend-item">
              <LegendMarker variant="dot" colorToken={seg.colorToken} />
              <span>{seg.label}</span>
            </li>
          ))}
        </ul>
      </div>
      {warning && <p className="card__caption">{warning}</p>}
    </div>
  );
}

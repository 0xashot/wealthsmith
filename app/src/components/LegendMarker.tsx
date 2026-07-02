/**
 * LegendMarker — chart legend marker per components/chart.md (Legend Markers)
 * and assets/icons/README.md (Chart Icons).
 *
 * Renders the approved marker assets:
 *   line -> assets/icons/chart/chart-line-marker.svg (line/trend series)
 *   dot  -> assets/icons/chart/chart-dot-marker.svg  (categorical /
 *           allocation / single-color progress legends)
 *
 * Marker color must come from chart series tokens ("Color should come from
 * chart data or chart series tokens"). The approved SVGs ship with a fixed
 * fill, so the asset is applied as a CSS mask and tinted with the series
 * color token — the asset files themselves are never modified.
 *
 * Markers are decorative and must be paired with a visible text label by
 * the caller (never icon-only).
 */
import dotMarkerUrl from "../../../assets/icons/chart/chart-dot-marker.svg";
import lineMarkerUrl from "../../../assets/icons/chart/chart-line-marker.svg";

interface LegendMarkerProps {
  variant: "line" | "dot";
  /** CSS custom property name of the series color, e.g. "--color-chart-series-1" */
  colorToken: string;
}

export default function LegendMarker({ variant, colorToken }: LegendMarkerProps) {
  const url = variant === "line" ? lineMarkerUrl : dotMarkerUrl;
  const mask = `url(${url}) center / contain no-repeat`;
  return (
    <span
      aria-hidden="true"
      className="legend-marker"
      style={{
        WebkitMask: mask,
        mask,
        background: `var(${colorToken})`,
      }}
    />
  );
}

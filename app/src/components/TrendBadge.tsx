/**
 * TrendBadge — a sourced percent change rendered with a trend arrow and
 * success/danger colour (up = green, down = red, flat = neutral). Presentation
 * only; the caller passes an already-sourced percent (never invented).
 *
 * `TrendIcon` is exported for the Portfolio table's per-row change cell so the
 * arrow markup lives in one place.
 */

/** Up/down/flat trend arrow (16px, currentColor) — shared across change displays. */
export function TrendIcon({ dir }: { dir: "up" | "down" | "flat" }) {
  return (
    <svg
      className="trend__icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {dir === "up" && (
        <>
          <polyline points="1 11.5 5.5 7 8.5 10 15 3.5" />
          <polyline points="10.5 3.5 15 3.5 15 8" />
        </>
      )}
      {dir === "down" && (
        <>
          <polyline points="1 4.5 5.5 9 8.5 6 15 12.5" />
          <polyline points="10.5 12.5 15 12.5 15 8" />
        </>
      )}
      {dir === "flat" && (
        <>
          <line x1="1" y1="8" x2="14" y2="8" />
          <polyline points="10.5 4.5 14 8 10.5 11.5" />
        </>
      )}
    </svg>
  );
}

interface Props {
  /** Sourced change in percent (e.g. 2.3 = +2.3%). */
  pct: number;
  /** Optional trailing period label rendered in muted text (e.g. "today"). */
  period?: string;
}

/** Signed percent + trend arrow; a change that rounds to 0.0% renders flat. */
export default function TrendBadge({ pct, period }: Props) {
  const rounded = Math.round(pct * 10) / 10;
  const dir = rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
  const text = `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`;
  return (
    <span className={`trend trend--${dir}`}>
      <TrendIcon dir={dir} />
      <span className="trend__value">{text}</span>
      {period && <span className="trend__period">{period}</span>}
    </span>
  );
}

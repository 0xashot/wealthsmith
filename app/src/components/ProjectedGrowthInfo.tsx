/**
 * ProjectedGrowthInfo — an info icon + hover/focus popover that explains how the
 * real-wallet Projected Growth number is derived. All figures are injected from
 * the deterministic projection result (projectedGrowth.ts) — nothing is hardcoded
 * and no fake value is ever shown (the icon only renders when a projection exists).
 *
 * The popover is informational only (role="tooltip"); it is NOT a navigation
 * action and moves no funds. Wording is a planning ESTIMATE, never a guarantee,
 * prediction, "expected return", or advice.
 */
import { useId, useState } from "react";
import infoIconUrl from "../../../assets/icons/ui/info.svg";
import {
  PG_INFO_ARIA,
  PG_INFO_INTRO,
  PG_INFO_RETURN_PREFIX,
  PG_INFO_RETURN_MIDDLE,
  PG_INFO_OVER,
  PG_INFO_CONTRIB_LABEL,
  PG_INFO_GROWTH_LABEL,
  PG_INFO_VALUE_LABEL,
  PG_INFO_FOOTER,
} from "../state/approvedCopy";

interface Props {
  /** Modeled annual return as a whole percent (e.g. 6), not a fraction. */
  modeledPct: number;
  /** Saved risk-level label (e.g. "Medium"). */
  riskLabel: string;
  /** From the projection result — planned contributions over the horizon (USD). */
  totalContributions: number;
  /** From the projection result — estimated growth (USD). */
  estimatedGrowth: number;
  /** From the projection result — projected value at the horizon (USD). */
  projectedValue: number;
}

/** Rounded, cents-free USD (e.g. $120,000). */
const usd0 = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;

export default function ProjectedGrowthInfo({
  modeledPct,
  riskLabel,
  totalContributions,
  estimatedGrowth,
  projectedValue,
}: Props) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();

  return (
    <div
      className="pg-info"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        className="pg-info__button"
        aria-label={PG_INFO_ARIA}
        aria-describedby={popoverId}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <img src={infoIconUrl} alt="" width={16} height={16} aria-hidden="true" />
      </button>
      {open && (
        <div role="tooltip" id={popoverId} className="pg-info__popover">
          <p className="pg-info__text">{PG_INFO_INTRO}</p>
          <p className="pg-info__text">
            {PG_INFO_RETURN_PREFIX} {modeledPct}% {PG_INFO_RETURN_MIDDLE} {riskLabel}.
          </p>
          <p className="pg-info__text">{PG_INFO_OVER}</p>
          <ul className="pg-info__list">
            <li>
              <span className="pg-info__key">{PG_INFO_CONTRIB_LABEL}:</span>{" "}
              <span className="pg-info__value">{usd0(totalContributions)}</span>
            </li>
            <li>
              <span className="pg-info__key">{PG_INFO_GROWTH_LABEL}:</span>{" "}
              <span className="pg-info__value">{usd0(estimatedGrowth)}</span>
            </li>
            <li>
              <span className="pg-info__key">{PG_INFO_VALUE_LABEL}:</span>{" "}
              <span className="pg-info__value">{usd0(projectedValue)}</span>
            </li>
          </ul>
          <p className="pg-info__text pg-info__text--muted">{PG_INFO_FOOTER}</p>
        </div>
      )}
    </div>
  );
}

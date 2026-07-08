/**
 * ProjectedGrowthInfo — the info icon + popover that explains how the real-wallet
 * Projected Growth number is derived. All figures are injected from the
 * deterministic projection result (projectedGrowth.ts) — nothing is hardcoded and
 * no fake value is ever shown (the icon only renders when a projection exists).
 *
 * Wording is a planning ESTIMATE, never a guarantee, prediction, "expected
 * return", or advice. Rendering/behavior is delegated to the shared InfoPopover.
 */
import InfoPopover from "./InfoPopover";
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
  return (
    <InfoPopover label={PG_INFO_ARIA}>
      <p className="info-popover__text">{PG_INFO_INTRO}</p>
      <p className="info-popover__text">
        {PG_INFO_RETURN_PREFIX} {modeledPct}% {PG_INFO_RETURN_MIDDLE} {riskLabel}.
      </p>
      <p className="info-popover__text">{PG_INFO_OVER}</p>
      <ul className="info-popover__list">
        <li>
          <span className="info-popover__key">{PG_INFO_CONTRIB_LABEL}:</span>{" "}
          <span className="info-popover__value">{usd0(totalContributions)}</span>
        </li>
        <li>
          <span className="info-popover__key">{PG_INFO_GROWTH_LABEL}:</span>{" "}
          <span className="info-popover__value">{usd0(estimatedGrowth)}</span>
        </li>
        <li>
          <span className="info-popover__key">{PG_INFO_VALUE_LABEL}:</span>{" "}
          <span className="info-popover__value">{usd0(projectedValue)}</span>
        </li>
      </ul>
      <p className="info-popover__text info-popover__text--muted">{PG_INFO_FOOTER}</p>
    </InfoPopover>
  );
}

/**
 * MarketConditionsSurface — Step 22F (slice 6). ONE informational dashboard surface for the shared canonical market
 * component. It is READ-ONLY and informational: it renders the safe `RailMarketSummary` (derived once from the shared
 * MarketConditionAssessment) and produces NO suggestion, no candidate, no market trigger. Score/band/observedAt/
 * attribution appear ONLY in the `full` state; excluded/stale/unavailable/blocked/loading states show safe copy with
 * no stale score/band and no fake Neutral. No provider fetch, no API key, no raw cache. Band/score are always TEXT
 * (never color-only). Attribution appears only beside current market data.
 */
import type { RailMarketSummary } from "../suggestions/useRailSuggestions";
import {
  MARKET_CONDITIONS_HEADING,
  MARKET_CONDITIONS_SCOPE,
  MARKET_CONDITIONS_SOURCE,
  MARKET_CONDITIONS_AS_OF_PREFIX,
  MARKET_CONDITIONS_EXPLANATION,
  MARKET_CONDITIONS_LOADING,
  MARKET_CONDITIONS_UNAVAILABLE_PRIMARY,
  MARKET_CONDITIONS_UNAVAILABLE_SIMPLE,
  MARKET_CONDITIONS_EXCLUDED,
  MARKET_CONDITIONS_STALE,
} from "../state/approvedCopy";

/** Localize the APPROVED observedAt (never retrievedAt/validUntil). Fails safe: no future time, no manufactured time. */
function formatObservedAt(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  if (ms > Date.now() + 60_000) return null; // never present a future observation time
  return new Date(ms).toLocaleString();
}

export default function MarketConditionsSurface({ summary }: { summary?: RailMarketSummary }) {
  if (!summary) return null;
  const { state } = summary;

  if (state === "loading") {
    return (
      <section className="card market-conditions" aria-label={MARKET_CONDITIONS_HEADING} aria-busy="true">
        <h3 className="card__title">{MARKET_CONDITIONS_HEADING}</h3>
        <p className="card__caption">{MARKET_CONDITIONS_LOADING}</p>
      </section>
    );
  }

  if (state === "full") {
    const asOf = formatObservedAt(summary.observedAt);
    const adj = summary.marketAdjustmentVsProfileOnlyPct;
    const showAdj = typeof adj === "number" && Math.abs(adj) >= 0.05;
    return (
      <section className="card market-conditions" aria-label={MARKET_CONDITIONS_HEADING}>
        <h3 className="card__title">{MARKET_CONDITIONS_HEADING}</h3>
        <p className="market-conditions__value">
          <span className="market-conditions__band">{summary.bandLabel}</span>
          <span aria-hidden="true"> · </span>
          <span className="market-conditions__score">{summary.score}/100</span>
        </p>
        <p className="card__caption">{MARKET_CONDITIONS_SCOPE}</p>
        <p className="card__caption">{MARKET_CONDITIONS_SOURCE}</p>
        {asOf && <p className="card__caption">{`${MARKET_CONDITIONS_AS_OF_PREFIX} ${asOf}`}</p>}
        {showAdj && (
          <p className="card__caption">
            {`Market conditions ${(adj as number) >= 0 ? "increased" : "reduced"} the stable target by ${Math.abs(adj as number).toFixed(1)} percentage points.`}
          </p>
        )}
        <p className="card__caption">{MARKET_CONDITIONS_EXPLANATION}</p>
      </section>
    );
  }

  // Excluded (degraded/stale) → the market component was excluded and the profile factors were renormalized.
  // Unavailable/blocked → a simple safe message (no renormalization claim; no current attribution; no score/band).
  const excludedStyle = state === "degraded" || state === "stale";
  return (
    <section className="card market-conditions market-conditions--unavailable" aria-label={MARKET_CONDITIONS_HEADING}>
      <h3 className="card__title">{MARKET_CONDITIONS_HEADING}</h3>
      <p className="market-conditions__status">{excludedStyle ? MARKET_CONDITIONS_UNAVAILABLE_PRIMARY : MARKET_CONDITIONS_UNAVAILABLE_SIMPLE}</p>
      {excludedStyle && <p className="card__caption">{MARKET_CONDITIONS_EXCLUDED}</p>}
      {state === "stale" && <p className="card__caption">{MARKET_CONDITIONS_STALE}</p>}
    </section>
  );
}

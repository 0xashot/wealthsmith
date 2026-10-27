/**
 * StrategyLabBreakdown — the Token Breakdown section of a Strategy Lab scenario:
 * a date slider (one stop per scenario date) over a four-column allocation table
 * (Asset / Unguided / WealthSmith / Decision Log) with a Total Value footer row.
 *
 * Fixture data only (state/strategyLabState.ts): every value and decision line is
 * approved display copy, index-aligned with the scenario dates. Dates whose
 * snapshot has not shipped yet show the pending state. Asset symbols link to
 * read-only explorer pages, exactly like the Portfolio tables.
 */
import { useId, useState } from "react";
import type { StrategyLabBreakdownSnapshot } from "../state/strategyLabState";
import {
  STRATEGY_LAB_BREAKDOWN_TITLE,
  STRATEGY_LAB_BREAKDOWN_DESCRIPTION,
  STRATEGY_LAB_SCENARIO_PENDING,
} from "../state/strategyLabState";
import AssetIdentity from "./AssetIdentity";
import usdcIconUrl from "../../../assets/icons/token/usdc.svg";
import btcIconUrl from "../../../assets/icons/token/btc.svg";
import solIconUrl from "../../../assets/icons/token/sol.svg";
import ustIconUrl from "../../../assets/icons/token/UST.svg";
import lunaIconUrl from "../../../assets/icons/token/LUNA.svg";
import fttIconUrl from "../../../assets/icons/token/Ftx.svg";
import trumpIconUrl from "../../../assets/icons/token/TRUMP.png";
import melaniaIconUrl from "../../../assets/icons/token/MELANIA.png";

const TOKEN_ICONS: Record<string, string> = {
  usdc: usdcIconUrl,
  btc: btcIconUrl,
  sol: solIconUrl,
  ust: ustIconUrl,
  luna: lunaIconUrl,
  ftt: fttIconUrl,
  trump: trumpIconUrl,
  melania: melaniaIconUrl,
};

interface Props {
  /** Slider stops — the scenario's date labels. */
  dates: string[];
  /** One snapshot (or pending null) per date. */
  snapshots: (StrategyLabBreakdownSnapshot | null)[];
}

export default function StrategyLabBreakdown({ dates, snapshots }: Props) {
  const headingId = useId();
  const sliderId = useId();
  const [dateIndex, setDateIndex] = useState(0);
  const snapshot = snapshots[dateIndex] ?? null;
  /** Fraction of the track travelled — fills the track up to the thumb in primary. */
  const progress = dateIndex / (dates.length - 1);

  return (
    <section className="dash-section" aria-labelledby={headingId}>
      <h2 id={headingId} className="dash-section__title">
        {STRATEGY_LAB_BREAKDOWN_TITLE}
      </h2>
      <p className="dash-section__caption">{STRATEGY_LAB_BREAKDOWN_DESCRIPTION}</p>

      <div className="card">
        {/* Date slider — one detent per scenario date; labels sit under their stops. */}
        <div className="breakdown-slider">
          <input
            id={sliderId}
            className="breakdown-slider__input"
            type="range"
            min={0}
            max={dates.length - 1}
            step={1}
            value={dateIndex}
            aria-label={STRATEGY_LAB_BREAKDOWN_TITLE}
            aria-valuetext={dates[dateIndex]}
            style={{ "--breakdown-progress": `${progress * 100}%` } as React.CSSProperties}
            onChange={(e) => setDateIndex(Number(e.currentTarget.value))}
          />
          {/* Each label centers exactly under its slider stop: the thumb travels the
              track width minus its own 28px, so stop i sits at 14px + i/(n-1) of that. */}
          <div className="breakdown-slider__labels" aria-hidden="true">
            {dates.map((d, i) => (
              <span
                key={d}
                className={
                  "breakdown-slider__label" +
                  (i === dateIndex ? " breakdown-slider__label--active" : "")
                }
                style={{ left: `calc(14px + (100% - 28px) * ${i / (dates.length - 1)})` }}
              >
                {d}
              </span>
            ))}
          </div>
        </div>

        {snapshot ? (
          <div className="portfolio-table__scroll">
            <table className="portfolio-table breakdown-table" aria-labelledby={headingId}>
              {/* Fixed column grid: widths come from here (table-layout: fixed), so
                  changing the date never shifts the columns with the content. */}
              <colgroup>
                <col style={{ width: "20%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "50%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className="portfolio-table__cell portfolio-table__header">Asset</th>
                  <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">Unguided</th>
                  <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">WealthSmith</th>
                  <th scope="col" className="portfolio-table__cell portfolio-table__header">Decision Log</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.rows.map((r) => (
                  <tr key={r.symbol}>
                    <td className="portfolio-table__cell">
                      <span className="breakdown-table__asset">
                        <AssetIdentity iconUrl={TOKEN_ICONS[r.icon] ?? null} label={r.symbol} href={r.explorer} />
                        <span className="breakdown-table__price">{r.priceLabel}</span>
                      </span>
                    </td>
                    <td className="portfolio-table__cell portfolio-table__cell--right">
                      <span className="portfolio-table__value">{r.unguided}</span>
                    </td>
                    <td className="portfolio-table__cell portfolio-table__cell--right">
                      <span className="portfolio-table__value">{r.wealthsmith}</span>
                    </td>
                    <td className="portfolio-table__cell breakdown-table__decision">{r.decision}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="breakdown-table__total">
                  <td className="portfolio-table__cell">Total Value</td>
                  <td className="portfolio-table__cell portfolio-table__cell--right">
                    <span className="portfolio-table__value">{snapshot.total.unguided}</span>
                  </td>
                  <td className="portfolio-table__cell portfolio-table__cell--right">
                    <span className="portfolio-table__value">{snapshot.total.wealthsmith}</span>
                  </td>
                  <td className="portfolio-table__cell breakdown-table__decision">{snapshot.total.decision}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="breakdown-table__pending">{STRATEGY_LAB_SCENARIO_PENDING}</p>
        )}
      </div>
    </section>
  );
}

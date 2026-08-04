/**
 * ExternalHoldingsSection — the Portfolio "External Holdings" section: a
 * "Manually Added Assets" card listing the non-Solana assets (BTC / ETH) a user
 * can add to their portfolio view.
 *
 * Each row is an offer to add until the user enters an amount
 * (AddManualAssetModal); reopening the row's Manage action edits that amount.
 * The AMOUNT is manually stated by the user (nothing is read from a chain); the
 * PRICE is sourced read-only from the public price feed, so Value = amount ×
 * sourced price and 24h Change is the feed's own figure. When the feed is
 * unavailable both fall back to "—" — never an invented number.
 *
 * Scope: manually added assets feed the Portfolio's DISPLAY surfaces (this table,
 * Balance Overview, Crypto Assets Allocation, Liquid Assets) via the page-level
 * `useManualAssets` hook. They are still kept OUT of the Suggestion Engine, the
 * Safety Buffer, the allocation target, and completeness — those keep reading the
 * real connected-wallet positions alone. The token symbol links to that chain's
 * public explorer (read-only), the same way Solana rows link to Solscan.
 */
import { useId, useState } from "react";
import ButtonIcon from "./ButtonIcon";
import { TrendIcon } from "./TrendBadge";
import AddManualAssetModal from "./AddManualAssetModal";
import { MANUAL_ASSET_CHAINS, isClearingAmount, type ManualAssetChain } from "../state/manualAssets";
import type { ExternalAssetPrices } from "../wallet/externalAssetPrices";
import type { ManualAssetAmounts } from "../wallet/manualAssetPositions";
import { usd0 } from "./deployTable";
import addUrl from "../../../assets/icons/ui/add.svg";
import btcIconUrl from "../../../assets/icons/token/btc.svg";
import ethIconUrl from "../../../assets/icons/token/eth.svg";
import {
  EXT_HOLDINGS_SECTION_TITLE,
  EXT_MANUAL_TITLE,
  EXT_MANUAL_CAPTION,
  EXT_ADD_LABEL,
  EXT_MANAGE_LABEL,
  extAddedToast,
} from "../state/approvedCopy";

/**
 * The addable non-Solana assets. The explorer comes from MANUAL_ASSET_CHAINS so
 * this table and the Liquid Assets row link can never point to different places.
 */
const ASSETS: { id: ManualAssetChain; icon: string; explorer: string }[] = [
  { id: "btc", icon: btcIconUrl, explorer: MANUAL_ASSET_CHAINS.btc.explorer },
  { id: "eth", icon: ethIconUrl, explorer: MANUAL_ASSET_CHAINS.eth.explorer },
];

/** Render a manually entered amount with its symbol, e.g. "0.0952245 BTC". */
function amountText(raw: string, chain: ManualAssetChain): string {
  const c = MANUAL_ASSET_CHAINS[chain];
  const n = Number(raw);
  // Show exactly what the user entered (never re-round a stated amount); fall
  // back to the raw string if it is not finite for any reason.
  const shown = Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: c.decimals }) : raw;
  return `${shown} ${c.symbol}`;
}

/** Sourced 24h change → signed percent + trend icon; "—" when not sourced. */
function ChangeCell({ pct }: { pct: number | null | undefined }) {
  if (typeof pct !== "number") return <span className="portfolio-table__unavailable">—</span>;
  const rounded = Math.round(pct * 10) / 10;
  const dir = rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
  return (
    <span className={`trend trend--${dir}`}>
      <TrendIcon dir={dir} />
      {`${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`}
    </span>
  );
}

interface Props {
  /** Stated amounts + sourced prices, owned by the page (see useManualAssets). */
  amounts: ManualAssetAmounts;
  prices: ExternalAssetPrices;
  /** Store a validated amount; returns true when the asset was newly added. */
  onSetAmount: (chain: ManualAssetChain, amount: string) => boolean;
  /** Remove a holding (managing → 0). */
  onClearAmount: (chain: ManualAssetChain) => void;
  /** Approved toast host (confirms an added amount). */
  pushToast?: (message: string, helper?: string) => void;
}

export default function ExternalHoldingsSection({ amounts, prices, onSetAmount, onClearAmount, pushToast }: Props) {
  const headingId = useId();
  const [modalChain, setModalChain] = useState<ManualAssetChain | null>(null);

  /** Sourced USD value of a stated amount, or null when the price is unavailable. */
  const valueOf = (chain: ManualAssetChain): number | null => {
    const raw = amounts[chain];
    const price = prices[chain]?.usd;
    if (raw == null || price == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n * price : null;
  };

  // Card total: sum of the values we can actually source. Nothing added → $0.
  const added = ASSETS.filter((a) => amounts[a.id] != null);
  const sourced = added.map((a) => valueOf(a.id)).filter((v): v is number => v != null);
  const total =
    added.length === 0 ? "$0" : sourced.length === added.length ? usd0(sourced.reduce((s, v) => s + v, 0)) : "—";

  const confirmAmount = (amount: string) => {
    if (!modalChain) return;
    if (isClearingAmount(amount)) {
      // Managing → 0 means the user no longer holds it: drop the row back to its
      // "Add" state rather than showing an empty 0 holding.
      onClearAmount(modalChain);
    } else if (onSetAmount(modalChain, amount)) {
      // Confirmation toast on a NEW asset only — updating an amount is not "added".
      pushToast?.(extAddedToast(MANUAL_ASSET_CHAINS[modalChain].symbol));
    }
    setModalChain(null);
  };

  return (
    <section className="dash-section" aria-label={EXT_HOLDINGS_SECTION_TITLE}>
      <h2 className="dash-section__title">{EXT_HOLDINGS_SECTION_TITLE}</h2>

      <section className="card" aria-labelledby={headingId}>
        <h3 id={headingId} className="card__title deploy-card__title">
          {EXT_MANUAL_TITLE}
        </h3>
        <p className="deploy-card__total">{total}</p>
        <p className="card__caption">{EXT_MANUAL_CAPTION}</p>

        <div className="portfolio-table__scroll">
          <table className="portfolio-table" aria-labelledby={headingId}>
            <thead>
              <tr>
                <th scope="col" className="portfolio-table__cell portfolio-table__header">
                  Token
                </th>
                <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">
                  Amount
                </th>
                <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">
                  Value
                </th>
                <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">
                  24h Change
                </th>
                <th scope="col" className="portfolio-table__cell portfolio-table__header">
                  <span className="sr-only">{EXT_ADD_LABEL}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ASSETS.map((a) => {
                const c = MANUAL_ASSET_CHAINS[a.id];
                const amount = amounts[a.id];
                const value = valueOf(a.id);
                return (
                  <tr key={a.id}>
                    <td className="portfolio-table__cell">
                      <span className="asset-identity">
                        <img
                          className="asset-identity__icon"
                          src={a.icon}
                          alt=""
                          width={24}
                          height={24}
                          aria-hidden="true"
                        />
                        <span className="asset-identity__text">
                          <a
                            className="deploy-table__asset-link"
                            href={a.explorer}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {c.symbol}
                          </a>
                        </span>
                      </span>
                    </td>
                    <td className="portfolio-table__cell portfolio-table__cell--right">
                      {amount ? (
                        <span className="portfolio-table__value">{amountText(amount, a.id)}</span>
                      ) : (
                        <span className="portfolio-table__unavailable">—</span>
                      )}
                    </td>
                    {/* Value = stated amount × SOURCED price; "—" without both. */}
                    <td className="portfolio-table__cell portfolio-table__cell--right">
                      {value != null ? (
                        <span className="portfolio-table__value">{usd0(value)}</span>
                      ) : (
                        <span className="portfolio-table__unavailable">—</span>
                      )}
                    </td>
                    <td className="portfolio-table__cell portfolio-table__cell--right">
                      {amount ? (
                        <ChangeCell pct={prices[a.id]?.change24hPct} />
                      ) : (
                        <span className="portfolio-table__unavailable">—</span>
                      )}
                    </td>
                    <td className="portfolio-table__cell portfolio-table__cell--right">
                      {/* Add offers the asset (icon-first); once added it becomes a
                          plain Manage control, matching the other Portfolio tables. */}
                      <button
                        type="button"
                        className="portfolio-table__manage"
                        aria-label={`${amount ? EXT_MANAGE_LABEL : EXT_ADD_LABEL} ${c.name}`}
                        onClick={() => setModalChain(a.id)}
                      >
                        {!amount && <ButtonIcon src={addUrl} />}
                        <span>{amount ? EXT_MANAGE_LABEL : EXT_ADD_LABEL}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {modalChain && (
        <AddManualAssetModal
          chain={modalChain}
          initialAmount={amounts[modalChain]}
          onConfirm={confirmAmount}
          onCancel={() => setModalChain(null)}
        />
      )}
    </section>
  );
}

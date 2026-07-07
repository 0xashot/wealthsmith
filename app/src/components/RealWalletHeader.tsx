/**
 * RealWalletHeader — the slim "wallet connected" status card shown at the top of
 * the real-wallet Dashboard and Portfolio. It carries the read-only affordances
 * (wallet label, Read-only badge, Refresh, the "no funds are moved" note, and any
 * partial-read warning) once for the page, so the product section cards below stay
 * clean and match the Demo layout rhythm.
 *
 * Presentational: the parent calls useWalletPortfolio once and passes the read
 * state down, so the whole page shares a single read cycle. READ-ONLY.
 */
import type { PortfolioStatus } from "../wallet/useWalletPortfolio";
import { useWalletDisplay } from "../wallet/useWalletDisplay";
import {
  REAL_WALLET_CONNECTED_TITLE,
  REAL_WALLET_NO_FUNDS_NOTE,
  LIVE_WALLET_REFRESH,
  PRICES_AS_OF_PREFIX,
  PRICES_SOURCE_NOTE,
} from "../state/approvedCopy";

interface Props {
  status: PortfolioStatus;
  warning?: string;
  refresh: () => void;
  /** When sourced prices were applied (ms epoch), for an "as of" label. */
  pricedAsOf?: number;
}

export default function RealWalletHeader({ status, warning, refresh, pricedAsOf }: Props) {
  const wallet = useWalletDisplay();
  const asOf =
    typeof pricedAsOf === "number"
      ? `${PRICES_AS_OF_PREFIX} ${new Date(pricedAsOf).toLocaleTimeString()} · ${PRICES_SOURCE_NOTE}`
      : null;
  return (
    <section className="card live-wallet" aria-label={REAL_WALLET_CONNECTED_TITLE}>
      <div className="live-wallet__header">
        <div>
          <h2 className="card__title">
            {REAL_WALLET_CONNECTED_TITLE}
            <span className="live-wallet__badge">Read-only</span>
            {wallet && <span className="live-wallet__badge">{wallet.label}</span>}
          </h2>
          <p className="card__caption">{REAL_WALLET_NO_FUNDS_NOTE}</p>
          {asOf && <p className="card__caption">{asOf}</p>}
        </div>
        <button
          type="button"
          className="live-wallet__refresh"
          onClick={refresh}
          disabled={status === "loading"}
        >
          {LIVE_WALLET_REFRESH}
        </button>
      </div>
      {warning && (
        <p className="live-wallet__warning" role="status">
          {warning}
        </p>
      )}
    </section>
  );
}

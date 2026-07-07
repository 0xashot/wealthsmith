/**
 * LiveWalletAssets — the detailed, READ-ONLY "Detected Wallet Assets" table at the
 * bottom of the real-wallet Portfolio page. It lists every detected position with
 * the full column set (Asset, Amount, APY, Type, Source, Status). The grouped
 * product sections above (Liquid / Staked / Yield) are the primary product view;
 * this is the complete detailed table.
 *
 * Presentational: it receives the portfolio read state as props (the parent calls
 * useWalletPortfolio once), so there is a single read cycle for the page. It shows
 * only on-chain balances — no USD value and no APY are invented, no funds move,
 * and nothing is signed. Loading / error / empty states are handled; a manual
 * Refresh re-reads (no polling).
 */
import { useId } from "react";
import type { PortfolioStatus } from "../wallet/useWalletPortfolio";
import type { WalletPosition } from "../wallet/walletPosition";
import PositionsTable from "./PositionsTable";
import {
  DETECTED_ASSETS_TITLE,
  LIVE_WALLET_DESC,
  LIVE_WALLET_LOADING,
  LIVE_WALLET_ERROR_TITLE,
  LIVE_WALLET_ERROR_ALL,
  LIVE_WALLET_EMPTY_TITLE,
  LIVE_WALLET_EMPTY_DESC,
  LIVE_WALLET_REFRESH,
  LIVE_WALLET_NOTE,
} from "../state/approvedCopy";

interface Props {
  status: PortfolioStatus;
  positions: WalletPosition[];
  error?: string;
  warning?: string;
  refresh: () => void;
}

export default function LiveWalletAssets({ status, positions, error, warning, refresh }: Props) {
  const headingId = useId();
  const noteId = useId();
  const loading = status === "loading";

  return (
    <section className="card live-wallet" aria-labelledby={headingId}>
      <div className="live-wallet__header">
        <div>
          <h2 id={headingId} className="card__title">
            {DETECTED_ASSETS_TITLE}
            <span className="live-wallet__badge">Read-only</span>
          </h2>
          <p className="card__caption">{LIVE_WALLET_DESC}</p>
        </div>
        <button
          type="button"
          className="live-wallet__refresh"
          onClick={refresh}
          disabled={loading}
        >
          {LIVE_WALLET_REFRESH}
        </button>
      </div>

      {loading && positions.length === 0 ? (
        <p className="portfolio-table__empty-description" role="status">
          {LIVE_WALLET_LOADING}
        </p>
      ) : status === "error" ? (
        // Total failure only (every read failed) — successful reads never reach here.
        <div className="portfolio-table__empty">
          <p className="portfolio-table__empty-title">{LIVE_WALLET_ERROR_TITLE}</p>
          <p className="portfolio-table__empty-description">{error ?? LIVE_WALLET_ERROR_ALL}</p>
        </div>
      ) : positions.length === 0 ? (
        <>
          {warning && (
            <p className="live-wallet__warning" role="status">
              {warning}
            </p>
          )}
          <div className="portfolio-table__empty">
            <p className="portfolio-table__empty-title">{LIVE_WALLET_EMPTY_TITLE}</p>
            <p className="portfolio-table__empty-description">{LIVE_WALLET_EMPTY_DESC}</p>
          </div>
        </>
      ) : (
        <div className="portfolio-table__scroll">
          {/* Partial-read warning: successful reads (e.g. SOL) still show above. */}
          {warning && (
            <p className="live-wallet__warning" role="status">
              {warning}
            </p>
          )}
          <PositionsTable
            positions={positions}
            columns={["asset", "amount", "value", "apy", "type", "source", "status"]}
            ariaLabelledBy={headingId}
            ariaDescribedBy={noteId}
          />
          <p id={noteId} className="portfolio-table__note">
            {LIVE_WALLET_NOTE}
          </p>
        </div>
      )}
    </section>
  );
}

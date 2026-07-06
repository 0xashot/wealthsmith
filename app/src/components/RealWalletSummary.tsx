/**
 * RealWalletSummary — the Dashboard main-content summary shown when a REAL wallet
 * is connected. It replaces the fixture Financial Snapshot / Safety Buffer /
 * Projected Growth / Allocation cards so no fixture value is ever presented as
 * the connected wallet's real data.
 *
 * It shows only safe, live facts read read-only from the wallet (via
 * useWalletPortfolio → deriveWalletSummary): assets detected, native SOL, SPL
 * token count, recognized LST count, and recognized protocols. It derives NO USD
 * portfolio value, allocation, projection, Safety Buffer, or suggestions — those
 * require pricing/product logic that does not exist yet (rules/financial-logic-
 * boundaries.md), so a separate "Portfolio Value" card shows an unavailable state.
 *
 * READ-ONLY: nothing is signed, sent, or moved.
 */
import { useWalletPortfolio } from "../wallet/useWalletPortfolio";
import { useWalletDisplay } from "../wallet/useWalletDisplay";
import { deriveWalletSummary } from "../wallet/walletSummary";
import {
  REAL_WALLET_CONNECTED_TITLE,
  REAL_WALLET_CONNECTED_DESC,
  REAL_WALLET_FACT_ASSETS,
  REAL_WALLET_FACT_NATIVE_SOL,
  REAL_WALLET_FACT_TOKENS,
  REAL_WALLET_FACT_LST,
  REAL_WALLET_FACT_PROTOCOLS,
  REAL_WALLET_FACT_NONE,
  REAL_WALLET_VALUE_TITLE,
  REAL_WALLET_VALUE_DESC,
  LIVE_WALLET_LOADING,
  LIVE_WALLET_ERROR_TITLE,
  LIVE_WALLET_ERROR_DESC,
  LIVE_WALLET_REFRESH,
} from "../state/approvedCopy";

function formatSol(sol: number | null): string {
  if (sol == null) return "—";
  return `${sol.toLocaleString(undefined, { maximumFractionDigits: 6 })} SOL`;
}

export default function RealWalletSummary() {
  const { status, positions, error, warning, refresh } = useWalletPortfolio();
  const wallet = useWalletDisplay();
  const summary = deriveWalletSummary(positions);
  const loading = status === "loading" && positions.length === 0;

  return (
    <>
      <section className="card live-wallet" aria-label={REAL_WALLET_CONNECTED_TITLE}>
        <div className="live-wallet__header">
          <div>
            <h2 className="card__title">
              {REAL_WALLET_CONNECTED_TITLE}
              {wallet && <span className="live-wallet__badge">{wallet.label}</span>}
            </h2>
            <p className="card__caption">{REAL_WALLET_CONNECTED_DESC}</p>
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

        {loading ? (
          <p className="portfolio-table__empty-description" role="status">
            {LIVE_WALLET_LOADING}
          </p>
        ) : status === "error" ? (
          <div className="portfolio-table__empty">
            <p className="portfolio-table__empty-title">{LIVE_WALLET_ERROR_TITLE}</p>
            <p className="portfolio-table__empty-description">
              {error ?? LIVE_WALLET_ERROR_DESC}
            </p>
          </div>
        ) : (
          <>
            {warning && (
              <p className="live-wallet__warning" role="status">
                {warning}
              </p>
            )}
            <div className="snapshot__grid">
            <div className="metric">
              <span className="metric__label">{REAL_WALLET_FACT_ASSETS}</span>
              <span className="metric__value">{summary.assetsDetected}</span>
            </div>
            <div className="metric">
              <span className="metric__label">{REAL_WALLET_FACT_NATIVE_SOL}</span>
              <span className="metric__value">{formatSol(summary.nativeSol)}</span>
            </div>
            <div className="metric">
              <span className="metric__label">{REAL_WALLET_FACT_TOKENS}</span>
              <span className="metric__value">{summary.tokenCount}</span>
            </div>
            <div className="metric">
              <span className="metric__label">{REAL_WALLET_FACT_LST}</span>
              <span className="metric__value">{summary.lstCount}</span>
            </div>
            <div className="metric">
              <span className="metric__label">{REAL_WALLET_FACT_PROTOCOLS}</span>
              <span className="metric__value">
                {summary.protocols.length > 0
                  ? summary.protocols.join(", ")
                  : REAL_WALLET_FACT_NONE}
              </span>
            </div>
            </div>
          </>
        )}
      </section>

      {/* No USD portfolio value is invented — pricing is not connected. */}
      <section className="card empty-card" aria-label={REAL_WALLET_VALUE_TITLE}>
        <h2 className="card__title">{REAL_WALLET_VALUE_TITLE}</h2>
        <p className="empty-card__description">{REAL_WALLET_VALUE_DESC}</p>
      </section>
    </>
  );
}

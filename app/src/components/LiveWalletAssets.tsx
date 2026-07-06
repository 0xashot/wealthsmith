/**
 * LiveWalletAssets — a clearly-marked, READ-ONLY "Live Wallet Assets" section for
 * the Portfolio page. Shows what the connected wallet actually holds (native SOL,
 * SPL tokens, recognized LSTs) read from RPC via useWalletPortfolio.
 *
 * This is separate from the approved fixture Portfolio sections (which are left
 * unchanged). It shows only on-chain balances — no USD value and no APY are
 * invented, no funds move, and nothing is signed. A recognized LST is labelled as
 * an LST; unknown mints show as a generic token. Loading / error / empty states
 * are handled; a manual Refresh re-reads (no polling).
 */
import { useId } from "react";
import { useWalletPortfolio } from "../wallet/useWalletPortfolio";
import { shortMint, type WalletPosition } from "../wallet/walletPosition";
import AssetIdentity from "./AssetIdentity";
import Badge from "./Badge";
import {
  LIVE_WALLET_TITLE,
  LIVE_WALLET_DESC,
  LIVE_WALLET_LOADING,
  LIVE_WALLET_ERROR_TITLE,
  LIVE_WALLET_ERROR_ALL,
  LIVE_WALLET_EMPTY_TITLE,
  LIVE_WALLET_EMPTY_DESC,
  LIVE_WALLET_REFRESH,
  LIVE_WALLET_NOTE,
} from "../state/approvedCopy";
import fallbackTokenUrl from "../../../assets/icons/fallback/fallback-token.svg";

const TYPE_LABEL: Record<WalletPosition["type"], string> = {
  native: "Native",
  token: "Token",
  lst: "LST",
  stake: "Native Stake",
  protocol: "Protocol Position",
};

const SIDE_LABEL: Record<NonNullable<WalletPosition["side"]>, string> = {
  supplied: "Supplied",
  borrowed: "Borrowed",
};

const SOURCE_LABEL: Record<WalletPosition["source"], string> = {
  wallet: "Wallet",
  jupiter: "Jupiter",
  kamino: "Kamino",
};

/** On-chain uiAmount → trimmed, grouped string (never a computed USD value). */
function formatAmount(p: WalletPosition): string {
  if (p.uiAmount == null) return p.amount.length > 0 ? p.amount : "—";
  return p.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

/** Sourced APY (percent) → "X.XX%", or "—" when no APY is available. */
function formatApy(apy: number | null | undefined): string {
  return apy == null ? "—" : `${apy.toFixed(2)}%`;
}

function AssetCell({ p }: { p: WalletPosition }) {
  if (p.icon) {
    return <AssetIdentity iconPath={p.icon} name={p.name ?? p.symbol} symbol={p.symbol} />;
  }
  // Unknown token — safe fallback icon, symbol/name still identify it.
  return (
    <span className="asset-identity">
      <img
        className="asset-identity__icon"
        src={fallbackTokenUrl}
        alt=""
        width={24}
        height={24}
        aria-hidden="true"
      />
      <span className="asset-identity__text">
        <span className="asset-identity__name">{p.name ?? "Unknown token"}</span>
        <span className="asset-identity__symbol">
          {p.mint ? shortMint(p.mint) : p.symbol}
        </span>
      </span>
    </span>
  );
}

export default function LiveWalletAssets() {
  const { status, positions, error, warning, refresh } = useWalletPortfolio();
  const headingId = useId();
  const noteId = useId();
  const loading = status === "loading";

  return (
    <section className="card live-wallet" aria-labelledby={headingId}>
      <div className="live-wallet__header">
        <div>
          <h2 id={headingId} className="card__title">
            {LIVE_WALLET_TITLE}
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
          <p className="portfolio-table__empty-description">
            {error ?? LIVE_WALLET_ERROR_ALL}
          </p>
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
          <table className="portfolio-table" aria-labelledby={headingId} aria-describedby={noteId}>
            <thead>
              <tr>
                <th scope="col" className="portfolio-table__cell portfolio-table__header">
                  Asset
                </th>
                <th
                  scope="col"
                  className="portfolio-table__cell portfolio-table__cell--right portfolio-table__header"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="portfolio-table__cell portfolio-table__cell--right portfolio-table__header"
                >
                  APY
                </th>
                <th scope="col" className="portfolio-table__cell portfolio-table__header">
                  Type
                </th>
                <th scope="col" className="portfolio-table__cell portfolio-table__header">
                  Source
                </th>
                <th scope="col" className="portfolio-table__cell portfolio-table__header">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.id}>
                  <td className="portfolio-table__cell">
                    <AssetCell p={p} />
                  </td>
                  <td className="portfolio-table__cell portfolio-table__cell--right">
                    <span className="portfolio-table__value">{formatAmount(p)}</span>
                  </td>
                  <td className="portfolio-table__cell portfolio-table__cell--right">
                    <span className="portfolio-table__value">{formatApy(p.apy)}</span>
                  </td>
                  <td className="portfolio-table__cell">
                    <Badge label={TYPE_LABEL[p.type]} tone="neutral" />
                  </td>
                  <td className="portfolio-table__cell">
                    <span className="portfolio-table__status">
                      {SOURCE_LABEL[p.source] +
                        (p.protocol && p.source === "wallet" ? ` · ${p.protocol}` : "")}
                    </span>
                  </td>
                  <td className="portfolio-table__cell">
                    <span className="portfolio-table__status">
                      {p.side ? SIDE_LABEL[p.side] : "Detected"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p id={noteId} className="portfolio-table__note">
            {LIVE_WALLET_NOTE}
          </p>
        </div>
      )}
    </section>
  );
}

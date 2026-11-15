/**
 * ConnectWalletModal — read-only REAL wallet-connection modal
 * (patterns/wallet-connection.md, rules/wallet-and-custody-rules.md, content/wallet-copy.md).
 *
 * Connects to real Phantom, Solflare, and Backpack wallets (and Phantom accounts
 * backed by Ledger) via the Solana wallet-adapter. READ-ONLY CONNECTION:
 *  - No message signing and NO signature request on connect (no signMessage /
 *    signTransaction / sendTransaction). Only the wallet's connect() and the
 *    returned publicKey are used.
 *  - Ledger-backed Phantom accounts connect through Phantom as normal accounts,
 *    with no on-device approval required, because WealthSmith requests no signature.
 *  - No balance/token fetch, no portfolio scan, no transaction, no fund movement.
 *  - Never asks for a seed phrase, private key, password, recovery phrase, or backup.
 *
 * The approved three wallets are always listed. Installed ones connect via the
 * adapter; a not-installed one shows the approved "Wallet not detected" state
 * (no invented install URL). Connection failures show approved, non-blaming copy;
 * a real failure never fake-connects. On success, App detects useWallet().connected
 * and closes the modal.
 */
import { useEffect, useId, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { capture } from "../analytics/analytics";
import { walletKind, type ConnectFailure } from "../analytics/events";
import ButtonIcon from "./ButtonIcon";
import { useScrollLock } from "./useScrollLock";
import closeUrl from "../../../assets/icons/ui/close.svg";
import phantomUrl from "../../../assets/icons/wallet/phantom.svg";
import solflareUrl from "../../../assets/icons/wallet/solflare.svg";
import backpackUrl from "../../../assets/icons/wallet/backpack.svg";
import {
  WALLET_CONNECT_MODAL_TITLE,
  WALLET_CONNECTING,
  WALLET_CONNECT_CLOSE_LABEL,
  WALLET_CONNECT_TERMS_LABEL,
  WALLET_CONNECT_TERMS_URL,
  WALLET_CONNECT_PRIVACY_LABEL,
  WALLET_CONNECT_PRIVACY_URL,
  WALLET_NOT_DETECTED_ROW,
  WALLET_NOT_DETECTED_TITLE,
  WALLET_NOT_DETECTED_DESC,
  WALLET_CONNECT_FAILED_TITLE,
  WALLET_CONNECT_FAILED_DESC,
  WALLET_REJECTED_TITLE,
  WALLET_REJECTED_DESC,
} from "../state/approvedCopy";

/** Approved MVP wallets + their official pages (content/wallet-copy.md — Approved
 *  Wallet Sites). A not-installed wallet opens its official page in a new tab. */
const WALLET_OPTIONS = [
  { key: "phantom", label: "Phantom", icon: phantomUrl, url: "https://phantom.app/" },
  { key: "solflare", label: "Solflare", icon: solflareUrl, url: "https://solflare.com/" },
  { key: "backpack", label: "Backpack", icon: backpackUrl, url: "https://backpack.app/" },
] as const;

interface ErrState {
  title: string;
  desc: string;
  /** The same failure, as an analytics label. Never shown to the user. */
  reason: ConnectFailure;
}

interface Props {
  /** Close the modal without connecting (Escape / close button / scrim). */
  onClose: () => void;
}

/** Map a wallet-adapter error to approved, non-blaming copy. Never a raw stack. */
function mapError(e: unknown): ErrState {
  const err = e as { name?: string; message?: string; error?: { code?: number } };
  const name = err?.name ?? "";
  const msg = (err?.message ?? "").toLowerCase();
  const code = err?.error?.code;
  if (name === "WalletNotReadyError") {
    return {
      title: WALLET_NOT_DETECTED_TITLE,
      desc: WALLET_NOT_DETECTED_DESC,
      reason: "wallet_not_ready",
    };
  }
  if (code === 4001 || /reject|declin|denied|cancel/.test(msg)) {
    return { title: WALLET_REJECTED_TITLE, desc: WALLET_REJECTED_DESC, reason: "user_rejected" };
  }
  if (/timeout|timed out/.test(msg)) {
    return { title: WALLET_CONNECT_FAILED_TITLE, desc: WALLET_CONNECT_FAILED_DESC, reason: "timeout" };
  }
  if (/network|fetch|offline/.test(msg)) {
    return { title: WALLET_CONNECT_FAILED_TITLE, desc: WALLET_CONNECT_FAILED_DESC, reason: "network" };
  }
  return { title: WALLET_CONNECT_FAILED_TITLE, desc: WALLET_CONNECT_FAILED_DESC, reason: "unknown" };
}

export default function ConnectWalletModal({ onClose }: Props) {
  const { wallets, select, connect, connecting, connected, wallet } = useWallet();
  useScrollLock();

  const [pendingName, setPendingName] = useState<string | null>(null);
  const [error, setError] = useState<ErrState | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    firstOptionRef.current?.focus();
  }, []);

  const busy = connecting || pendingName !== null;

  // Find the registered adapter for an approved wallet, by name. "Detected" means
  // the extension is actually installed (Installed) — a merely "Loadable" wallet
  // (e.g. Solflare's web fallback when the extension is absent) is shown as not
  // detected and opens the wallet's official page instead of connecting.
  const adapterFor = (key: string) =>
    wallets.find((w) => w.adapter.name.toLowerCase().includes(key));
  const isDetected = (key: string) =>
    adapterFor(key)?.readyState === WalletReadyState.Installed;

  // After a wallet is selected, connect it (no signature). Guarded so we only
  // connect the wallet we just picked.
  useEffect(() => {
    if (!pendingName) return;
    if (wallet?.adapter.name === pendingName && !connected && !connecting) {
      connect().catch((e) => {
        const mapped = mapError(e);
        setError(mapped);
        setPendingName(null);
        capture({
          name: "wallet_connect_failed",
          wallet: walletKind(wallet?.adapter.name),
          reason: mapped.reason,
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingName, wallet, connected, connecting]);

  const pick = (key: string, url: string) => {
    if (busy) return;
    const adapter = adapterFor(key);
    if (!adapter || !isDetected(key)) {
      // Not installed → open the wallet's official page in a new tab so the user
      // can install/open it. No error state, and never a fake connection.
      // Still a funnel exit, and a common one, so it is counted as a failure.
      capture({ name: "wallet_connect_failed", wallet: walletKind(key), reason: "wallet_not_ready" });
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    setError(null);
    setPendingName(adapter.adapter.name);
    capture({ name: "wallet_selected", wallet: walletKind(adapter.adapter.name) });
    select(adapter.adapter.name as WalletName);
  };

  // Focus trap + Escape (Escape only when idle).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (!busy) {
        e.preventDefault();
        onClose();
      }
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (!busy && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy || undefined}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 id={titleId} className="modal__title">
            {WALLET_CONNECT_MODAL_TITLE}
          </h2>
          <button
            type="button"
            className="modal__close"
            aria-label={WALLET_CONNECT_CLOSE_LABEL}
            onClick={onClose}
            disabled={busy}
          >
            <ButtonIcon src={closeUrl} size={18} />
          </button>
        </div>

        {error && (
          <div className="modal__wallet-error" role="alert">
            <p className="modal__wallet-error-title">{error.title}</p>
            <p className="modal__wallet-error-desc">{error.desc}</p>
          </div>
        )}

        <ul className="wallet-option-list">
          {WALLET_OPTIONS.map((w, i) => {
            const detected = isDetected(w.key);
            const pending = pendingName === adapterFor(w.key)?.adapter.name && busy;
            return (
              <li key={w.key}>
                <button
                  ref={i === 0 ? firstOptionRef : undefined}
                  type="button"
                  className="wallet-option"
                  aria-label={
                    detected ? `Connect ${w.label} wallet` : `Get ${w.label} (opens in a new tab)`
                  }
                  aria-disabled={busy || undefined}
                  onClick={() => pick(w.key, w.url)}
                >
                  <img
                    className="wallet-option__icon"
                    src={w.icon}
                    alt=""
                    width={28}
                    height={28}
                    aria-hidden="true"
                  />
                  <span className="wallet-option__label">{w.label}</span>
                  {pending ? (
                    <span className="wallet-option__status">{WALLET_CONNECTING}</span>
                  ) : !detected ? (
                    <span className="wallet-option__status wallet-option__status--muted">
                      {WALLET_NOT_DETECTED_ROW}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Legal note: connecting agrees to Terms + acknowledges Privacy (links open in a new tab). */}
        <p className="wallet-connect__legal">
          By connecting your wallet, you agree to our{" "}
          <a href={WALLET_CONNECT_TERMS_URL} target="_blank" rel="noopener noreferrer">
            {WALLET_CONNECT_TERMS_LABEL}
          </a>{" "}
          and acknowledge our{" "}
          <a href={WALLET_CONNECT_PRIVACY_URL} target="_blank" rel="noopener noreferrer">
            {WALLET_CONNECT_PRIVACY_LABEL}
          </a>
          .
        </p>

        {/* Polite live region so the transient connecting state is announced. */}
        <span className="sr-only" role="status">
          {busy ? WALLET_CONNECTING : ""}
        </span>
      </div>
    </div>
  );
}

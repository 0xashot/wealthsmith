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
 * The approved three wallets are always listed. A wallet that can start a connection
 * connects via the adapter; one that cannot shows the approved "Wallet not detected"
 * state (no invented install URL). Connection failures show approved, non-blaming copy;
 * a real failure never fake-connects. On success, App detects useWallet().connected
 * and closes the modal.
 *
 * MOBILE (see wallet/walletEnvironment.ts for the full reasoning):
 *  - iOS Safari — adapters report `Loadable`, not `Installed`, because there is no
 *    extension to detect; connect() then redirects to the wallet's universal link. The
 *    row is live. Before this, only `Installed` counted, so every iOS Safari visitor was
 *    told "Wallet not detected" and sent to the wallet's marketing page — the deep-link
 *    path was never once attempted in production.
 *  - In-app browsers (X, Instagram, …) — no wallet row can succeed, so the list is
 *    replaced by the In-App Browser state, which offers the only step that works.
 *  - Android — still unsupported here. WalletProvider auto-registers the Solana Mobile
 *    Wallet Adapter, but this modal renders a fixed list and never surfaces it.
 */
import { useEffect, useId, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
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
  WALLET_IN_APP_BROWSER_TITLE,
  WALLET_IN_APP_BROWSER_HINT,
  WALLET_IN_APP_COPY_LINK,
  WALLET_IN_APP_COPY_LINK_DONE,
  walletInAppBrowserDesc,
} from "../state/approvedCopy";
import {
  currentUserAgent,
  detectInAppBrowser,
  isIosSafariRedirectable,
} from "../wallet/walletEnvironment";

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
    return { title: WALLET_NOT_DETECTED_TITLE, desc: WALLET_NOT_DETECTED_DESC };
  }
  if (code === 4001 || /reject|declin|denied|cancel/.test(msg)) {
    return { title: WALLET_REJECTED_TITLE, desc: WALLET_REJECTED_DESC };
  }
  return { title: WALLET_CONNECT_FAILED_TITLE, desc: WALLET_CONNECT_FAILED_DESC };
}

export default function ConnectWalletModal({ onClose }: Props) {
  const { wallets, select, connect, connecting, connected, wallet } = useWallet();
  useScrollLock();

  const [pendingName, setPendingName] = useState<string | null>(null);
  const [error, setError] = useState<ErrState | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Running inside another app's embedded webview (X, Instagram, …)? Then no wallet row
  // can succeed: the adapter will not redirect (its iOS check requires "safari" in the UA,
  // which these webviews omit), and the host app may tear the webview down mid-handoff.
  // The modal shows the one step that does work instead of rows that would fail.
  const inAppBrowser = detectInAppBrowser(currentUserAgent());
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    firstOptionRef.current?.focus();
  }, []);

  const busy = connecting || pendingName !== null;

  // Find the registered adapter for an approved wallet, by name.
  const adapterFor = (key: string) =>
    wallets.find((w) => w.adapter.name.toLowerCase().includes(key));

  // "Detected" means the row can actually start a connection:
  //
  //  - Installed  → a browser extension injected a provider. Desktop, and wallet apps'
  //                 own in-app browsers.
  //  - Loadable + iOS Safari → there is no extension to detect, but the adapter will
  //                 redirect to the wallet's universal link from connect(). Allowed ONLY
  //                 on iOS Safari, matching the adapter's own isIosAndRedirectable()
  //                 check, so a row never invites a tap the adapter would refuse.
  //
  // Loadable stays excluded everywhere else on purpose: on desktop it is Solflare's web
  // wallet fallback, which must not masquerade as an installed extension. Scoping that
  // rule to desktop is the fix — the unscoped version also rejected every iOS Safari
  // visitor, so the deep-link path was never once attempted in production.
  const iosRedirectable = isIosSafariRedirectable(currentUserAgent());
  const isDetected = (key: string) => {
    const readyState = adapterFor(key)?.readyState;
    if (readyState === WalletReadyState.Installed) return true;
    return iosRedirectable && readyState === WalletReadyState.Loadable;
  };

  // After a wallet is selected, connect it (no signature). Guarded so we only
  // connect the wallet we just picked.
  useEffect(() => {
    if (!pendingName) return;
    if (wallet?.adapter.name === pendingName && !connected && !connecting) {
      connect().catch((e) => {
        setError(mapError(e));
        setPendingName(null);
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
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    setError(null);
    setPendingName(adapter.adapter.name);
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

        {inAppBrowser ? (
          <div className="wallet-in-app-browser">
            <p className="wallet-in-app-browser__title">{WALLET_IN_APP_BROWSER_TITLE}</p>
            <p className="wallet-in-app-browser__desc">{walletInAppBrowserDesc(inAppBrowser)}</p>
            <button
              ref={firstOptionRef}
              type="button"
              className="wallet-in-app-browser__action"
              onClick={() => {
                // Clipboard is the only hand-off available from inside an embedded
                // webview. navigator.clipboard is unavailable in some of them, so fall
                // back to the legacy path and never leave the button in a lying state.
                const url = window.location.href;
                const done = () => setLinkCopied(true);
                void (async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    done();
                  } catch {
                    try {
                      const el = document.createElement("textarea");
                      el.value = url;
                      el.setAttribute("readonly", "");
                      el.style.position = "fixed";
                      el.style.opacity = "0";
                      document.body.appendChild(el);
                      el.select();
                      const ok = document.execCommand("copy");
                      document.body.removeChild(el);
                      if (ok) done();
                    } catch {
                      /* Copy unavailable — the menu hint below still applies. */
                    }
                  }
                })();
              }}
            >
              {linkCopied ? WALLET_IN_APP_COPY_LINK_DONE : WALLET_IN_APP_COPY_LINK}
            </button>
            <p className="wallet-in-app-browser__hint">{WALLET_IN_APP_BROWSER_HINT}</p>
            <span className="sr-only" role="status">
              {linkCopied ? WALLET_IN_APP_COPY_LINK_DONE : ""}
            </span>
          </div>
        ) : (
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
        )}

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

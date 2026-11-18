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
import { capture } from "../analytics/analytics";
import { walletKind, type ConnectFailure } from "../analytics/events";
import ButtonIcon from "./ButtonIcon";
import { useScrollLock } from "./useScrollLock";
import closeUrl from "../../../assets/icons/ui/close.svg";
import phantomUrl from "../../../assets/icons/wallet/phantom.svg";
import solflareUrl from "../../../assets/icons/wallet/solflare.svg";
import backpackUrl from "../../../assets/icons/wallet/backpack.svg";
/* No wallet-agnostic mark exists in the approved set; coins is the nearest approved icon
   and the row names the action rather than any one wallet. */
import coinsUrl from "../../../assets/icons/ui/coins.svg";
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
  WALLET_MOBILE_ADAPTER_LABEL,
  WALLET_MOBILE_ADAPTER_HINT,
  walletInAppBrowserDesc,
} from "../state/approvedCopy";
import {
  MOBILE_WALLET_ADAPTER_NAME,
  currentUserAgent,
  detectInAppBrowser,
  isIosSafariRedirectable,
  resolveConnectContext,
} from "../wallet/walletEnvironment";

/** Approved MVP wallets + their official pages (content/wallet-copy.md — Approved
 *  Wallet Sites). A not-installed wallet opens its official page in a new tab. */
const WALLET_OPTIONS = [
  { key: "phantom", label: "Phantom", icon: phantomUrl, url: "https://phantom.app/" },
  { key: "solflare", label: "Solflare", icon: solflareUrl, url: "https://solflare.com/" },
  { key: "backpack", label: "Backpack", icon: backpackUrl, url: "https://backpack.app/" },
] as const;

/**
 * How long a pending connect() may hang before the modal gives up. Long enough to read a
 * wallet approval prompt and unlock a locked wallet; short enough that a hand-off which is
 * never returning does not look like a hang forever.
 */
const CONNECT_TIMEOUT_MS = 60_000;

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
  const [linkCopied, setLinkCopied] = useState(false);

  // Running inside another app's embedded webview (X, Instagram, …)? Then no wallet row
  // can succeed: the adapter will not redirect (its iOS check requires "safari" in the UA,
  // which these webviews omit), and the host app may tear the webview down mid-handoff.
  // The modal shows the one step that does work instead of rows that would fail.
  const inAppBrowser = detectInAppBrowser(currentUserAgent());

  // Android, real browser: WalletProvider auto-registers the Solana Mobile Wallet Adapter.
  // Its presence is the authoritative Android signal — the library has already excluded
  // WebViews and any environment with an injected provider. Tapping it hands off to the
  // OS wallet chooser, which IS the wallet picker on Android, so the three fixed rows are
  // replaced rather than supplemented; they could only ever read "Not detected" there.
  const mwaAdapter = wallets.find((w) => w.adapter.name === MOBILE_WALLET_ADAPTER_NAME);

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

  // How (and whether) a connection can happen here. Attached to every funnel event so a
  // failure is readable afterwards: "no extension on desktop", "iPhone", "inside X's
  // webview" and "Android" all produced an identical wallet_not_ready before this.
  const connectContext = resolveConnectContext({
    userAgent: currentUserAgent(),
    hasInstalledWallet: WALLET_OPTIONS.some(
      (w) => adapterFor(w.key)?.readyState === WalletReadyState.Installed,
    ),
    hasMobileWalletAdapter: mwaAdapter != null,
  });

  // Emitted HERE rather than by whatever opened the modal, because only this component
  // knows which adapters registered and therefore what was actually possible.
  //
  // The ref is not ceremony: moving this from a click handler into an effect means
  // StrictMode double-invokes it, and dev events land in the SAME PostHog project as
  // production ones. Production is unaffected (StrictMode checks are development-only),
  // but a silently doubled funnel entry in dev is exactly the kind of thing that gets
  // mistaken for real traffic later.
  const openReported = useRef(false);
  useEffect(() => {
    if (openReported.current) return;
    openReported.current = true;
    capture({ name: "wallet_modal_opened", context: connectContext });
    // Once per mount: the context cannot change while the modal is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          context: connectContext,
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingName, wallet, connected, connecting]);

  // A connect() that never settles used to strand the modal forever: `busy` stayed true,
  // and `busy` disables Escape, the close button AND the scrim, so the only way out was a
  // page reload. It also made `reason: "timeout"` unreachable, so the failure was invisible
  // in analytics as well as unrecoverable for the user.
  //
  // Generous on purpose — this must never cut short someone reading an approval prompt or
  // unlocking their wallet. It is a backstop for a hand-off that is never coming back, not
  // a latency budget; closing the modal is the fast path out.
  useEffect(() => {
    if (!pendingName) return;
    const id = setTimeout(() => {
      setError({
        title: WALLET_CONNECT_FAILED_TITLE,
        desc: WALLET_CONNECT_FAILED_DESC,
        reason: "timeout",
      });
      setPendingName(null);
      capture({
        name: "wallet_connect_failed",
        wallet: walletKind(pendingName),
        reason: "timeout",
        context: connectContext,
      });
    }, CONNECT_TIMEOUT_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingName]);

  const pick = (key: string, url: string) => {
    if (busy) return;
    const adapter = adapterFor(key);
    if (!adapter || !isDetected(key)) {
      // Not installed → open the wallet's official page in a new tab so the user
      // can install/open it. No error state, and never a fake connection.
      // Still a funnel exit, and a common one, so it is counted as a failure.
      capture({
        name: "wallet_connect_failed",
        wallet: walletKind(key),
        reason: "wallet_not_ready",
        context: connectContext,
      });
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    setError(null);
    setPendingName(adapter.adapter.name);
    capture({ name: "wallet_selected", wallet: walletKind(adapter.adapter.name), context: connectContext });
    select(adapter.adapter.name as WalletName);
  };

  /**
   * Leave the modal, including mid-connect.
   *
   * All three exits (Escape, the close button, the scrim) used to be disabled while
   * `busy`, so a connect() that never settled left no way out but a page reload. A
   * pending connection is not a reason to trap someone: the wallet hand-off lives in the
   * wallet app, and abandoning it here costs nothing. If it does land afterwards,
   * `connected` flips and the app proceeds as normal — a good outcome either way.
   */
  const cancelAndClose = () => {
    if (pendingName) {
      capture({
        name: "wallet_connect_failed",
        wallet: walletKind(pendingName),
        reason: "cancelled",
        context: connectContext,
      });
      setPendingName(null);
    }
    onClose();
  };

  // Focus trap + Escape (Escape closes even mid-connect — see cancelAndClose).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelAndClose();
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
        if (e.target === e.currentTarget) cancelAndClose();
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
            onClick={cancelAndClose}
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

        {mwaAdapter ? (
          <ul className="wallet-option-list">
            <li>
              <button
                ref={firstOptionRef}
                type="button"
                className="wallet-option"
                aria-label={WALLET_MOBILE_ADAPTER_LABEL}
                aria-disabled={busy || undefined}
                onClick={() => {
                  if (busy) return;
                  setError(null);
                  setPendingName(mwaAdapter.adapter.name);
                  capture({
                    name: "wallet_selected",
                    wallet: walletKind(mwaAdapter.adapter.name),
                    context: connectContext,
                  });
                  select(mwaAdapter.adapter.name as WalletName);
                }}
              >
                <img
                  className="wallet-option__icon"
                  src={coinsUrl}
                  alt=""
                  width={28}
                  height={28}
                  aria-hidden="true"
                />
                <span className="wallet-option__label">{WALLET_MOBILE_ADAPTER_LABEL}</span>
                {pendingName === mwaAdapter.adapter.name && busy ? (
                  <span className="wallet-option__status">{WALLET_CONNECTING}</span>
                ) : null}
              </button>
            </li>
            <li className="wallet-option-list__hint">{WALLET_MOBILE_ADAPTER_HINT}</li>
          </ul>
        ) : inAppBrowser ? (
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
                const done = () => {
                  setLinkCopied(true);
                  capture({ name: "wallet_in_app_link_copied" });
                };
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

/**
 * ConnectWalletModal — read-only wallet-connection modal per
 * patterns/wallet-connection.md, components/modal.md, and content/wallet-copy.md.
 *
 * PROTOTYPE / STUB ONLY. This modal demonstrates supported-wallet selection UX.
 * It does NOT integrate a real wallet adapter, detect installed wallets, request
 * a signature, sign a message, execute a transaction, fetch balances, or move
 * funds — and it never asks for a seed phrase, private key, password, recovery
 * phrase, or backup file (it only warns the user never to share them).
 *
 * All three approved MVP wallets (Phantom, Solflare, Backpack) are selectable.
 * Because there is exactly one approved connected-wallet fixture (Phantom •
 * 6fQ9) and provider-specific wallet data must never be invented, every
 * successful selection connects to that same fixture (documented prototype
 * limitation — see IMPLEMENTATION-NOTES.md). Selecting a wallet shows a short
 * safe "Connecting..." state, then calls `onConnected`.
 *
 * Accessibility: role="dialog" + aria-modal, labelled by the visible title and
 * described by the visible read-only reassurance copy; focus moves in on open,
 * is trapped while open, Escape closes when idle, and focus returns to the
 * triggering element on close.
 */
import { useEffect, useRef, useState } from "react";
import ButtonIcon from "./ButtonIcon";
import closeUrl from "../../../assets/icons/ui/close.svg";
import phantomUrl from "../../../assets/icons/wallet/phantom.svg";
import solflareUrl from "../../../assets/icons/wallet/solflare.svg";
import backpackUrl from "../../../assets/icons/wallet/backpack.svg";
import {
  WALLET_CONNECT_MODAL_TITLE,
  WALLET_CONNECT_INTRO,
  WALLET_CONNECT_HELPER,
  WALLET_CONNECT_SECURITY_NOTE,
  WALLET_CONNECTING,
  WALLET_CONNECT_CLOSE_LABEL,
} from "../state/approvedCopy";

/** Approved MVP wallets (patterns/wallet-connection.md, content/wallet-copy.md).
 *  Labels + icons are the approved set — nothing invented. */
const WALLET_OPTIONS = [
  { id: "phantom", label: "Phantom", icon: phantomUrl },
  { id: "solflare", label: "Solflare", icon: solflareUrl },
  { id: "backpack", label: "Backpack", icon: backpackUrl },
] as const;

/** Short, safe pending window before the stub connects (within the loading-delay
 *  guidance in patterns/wallet-connection.md). No provider call happens here. */
const CONNECT_DELAY_MS = 600;

interface Props {
  /** Close the modal without connecting (Escape / close button / scrim). */
  onClose: () => void;
  /** Stub connection succeeded → App switches to the connected fixture + toasts. */
  onConnected: () => void;
}

export default function ConnectWalletModal({ onClose, onConnected }: Props) {
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<number | null>(null);

  const titleId = "connect-wallet-title";
  const descId = "connect-wallet-desc";

  // Move focus into the modal on open. Focus RETURN to the trigger is handled by
  // App after the background `inert` is cleared (restoring focus here would fail
  // while the trigger's ancestor is still inert).
  useEffect(() => {
    firstOptionRef.current?.focus();
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const isConnecting = connectingId !== null;

  const select = (id: string) => {
    if (isConnecting) return; // guard against double-activation
    setConnectingId(id);
    timerRef.current = window.setTimeout(() => {
      onConnected();
    }, CONNECT_DELAY_MS);
  };

  // Focus trap + Escape (Escape only when idle, per pattern).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (!isConnecting) {
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
      // Scrim closes the modal only when idle (safe dismissal per modal.md).
      onClick={() => {
        if (!isConnecting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        aria-busy={isConnecting || undefined}
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
            disabled={isConnecting}
          >
            <ButtonIcon src={closeUrl} size={18} />
          </button>
        </div>

        <p className="modal__intro">{WALLET_CONNECT_INTRO}</p>
        <p id={descId} className="modal__description">
          {WALLET_CONNECT_HELPER}
        </p>

        <ul className="wallet-option-list">
          {WALLET_OPTIONS.map((w, i) => {
            const pending = connectingId === w.id;
            return (
              <li key={w.id}>
                <button
                  ref={i === 0 ? firstOptionRef : undefined}
                  type="button"
                  className="wallet-option"
                  aria-label={`Connect ${w.label} wallet`}
                  onClick={() => select(w.id)}
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
                  {pending && (
                    <span className="wallet-option__status">{WALLET_CONNECTING}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="modal__security">{WALLET_CONNECT_SECURITY_NOTE}</p>
      </div>
    </div>
  );
}

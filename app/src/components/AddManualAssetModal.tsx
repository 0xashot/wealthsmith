/**
 * AddManualAssetModal — "Add Bitcoin" / "Add Ethereum" for the Portfolio
 * External Holdings section. Collects ONE manually entered token amount for an
 * asset held outside the connected Solana wallet.
 *
 * Manual entry only: the user states the amount, so nothing is read from a chain
 * and nothing is verified — the value is displayed exactly as entered and is
 * never treated as a wallet position. Validation is local and fails closed
 * (blank / non-numeric / non-positive / too many decimals for the chain).
 *
 * Reuses the shared design-system dialog pattern: `.modal-scrim` + `.modal`
 * (ConnectWalletModal), the `.goal-field` input + helper + error stack, and the
 * `.goal-actions` Cancel/Confirm row (ConfirmDialog). Portaled to <body>,
 * focus-trapped, Escape/scrim to cancel. No new one-off styles.
 */
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ButtonIcon from "./ButtonIcon";
import { useScrollLock } from "./useScrollLock";
import closeUrl from "../../../assets/icons/ui/close.svg";
import {
  EXT_AMOUNT_PLACEHOLDER,
  EXT_CANCEL_LABEL,
  EXT_CONFIRM_LABEL,
  EXT_CLOSE_LABEL,
} from "../state/approvedCopy";
import {
  MANUAL_ASSET_CHAINS,
  manualAmountError,
  normalizeManualAmount,
  type ManualAssetChain,
} from "../state/manualAssets";

interface Props {
  chain: ManualAssetChain;
  /**
   * Existing amount when managing an already-added asset — the field opens
   * pre-filled so the user edits rather than re-types. Absent when adding.
   */
  initialAmount?: string;
  /** Confirm with the validated amount (as entered, normalized of separators). */
  onConfirm: (amount: string) => void;
  onCancel: () => void;
}

export default function AddManualAssetModal({ chain, initialAmount, onConfirm, onCancel }: Props) {
  useScrollLock();
  const c = MANUAL_ASSET_CHAINS[chain];
  // Managing an existing amount uses the "Manage" heading; adding keeps "Add".
  const managing = initialAmount != null;
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const [value, setValue] = useState(initialAmount ?? "");
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
    // Managing: select the existing amount so typing replaces it.
    if (initialAmount != null) inputRef.current?.select();
  }, [initialAmount]);

  const confirm = () => {
    // Managing an existing holding may be zeroed out to clear it.
    const err = manualAmountError(value, c.decimals, c.name, managing);
    if (err) {
      setError(err);
      inputRef.current?.focus();
      return;
    }
    onConfirm(normalizeManualAmount(value));
  };

  // Escape cancels; Tab cycles inside the dialog (same trap as ConfirmDialog).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), a[href]'
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

  return createPortal(
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
      >
        <div className="modal__header">
          <h2 id={titleId} className="modal__title">
            {managing ? c.manageTitle : c.title}
          </h2>
          <button
            type="button"
            className="modal__close"
            aria-label={EXT_CLOSE_LABEL}
            onClick={onCancel}
          >
            <ButtonIcon src={closeUrl} size={18} />
          </button>
        </div>

        <div className="goal-field">
          <label className="goal-field__label" htmlFor={fieldId}>
            {c.label}
          </label>
          <input
            ref={inputRef}
            id={fieldId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            className="goal-input"
            placeholder={EXT_AMOUNT_PLACEHOLDER}
            value={value}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              setValue(e.target.value);
              // Clear the error as soon as the user edits — re-validated on Confirm.
              if (error) setError(undefined);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirm();
              }
            }}
          />
          {error && (
            <p className="goal-field__error" id={errorId} role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="goal-actions">
          <button type="button" className="goal-btn goal-btn--secondary" onClick={onCancel}>
            {EXT_CANCEL_LABEL}
          </button>
          <button type="button" className="goal-btn goal-btn--primary" onClick={confirm}>
            {EXT_CONFIRM_LABEL}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

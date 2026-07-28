/**
 * ConfirmDialog — a small reusable confirmation dialog (heading + body + Cancel /
 * Confirm). Used for destructive confirmations like discarding unsaved Goal edits.
 *
 * Accessibility: role="alertdialog" + aria-modal, labelled by the title and
 * described by the body; Cancel is focused on open (safe default for a destructive
 * action), focus is trapped, and Escape / Cancel / scrim-click all cancel. Purely
 * presentational — it decides nothing and moves no funds.
 *
 * Rendered through a portal to document.body so the fixed scrim escapes any
 * ancestor stacking context (e.g. the sticky Ask Smith AI panel) and reliably
 * covers the whole viewport, including the sticky Global Nav.
 */
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "./useScrollLock";

interface Props {
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** Style the confirm button as a destructive (danger) action. */
  danger?: boolean;
}

export default function ConfirmDialog({
  title,
  body,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  danger,
}: Props) {
  useScrollLock();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const uid = useId();
  const titleId = `${uid}-title`;
  const bodyId = `${uid}-body`;

  // Focus the least-destructive action by default.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
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
        className="modal confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onKeyDown={onKeyDown}
      >
        <div className="modal__header">
          <h2 id={titleId} className="modal__title">
            {title}
          </h2>
        </div>
        <p id={bodyId} className="modal__description">
          {body}
        </p>
        <div className="goal-actions">
          <button
            ref={cancelRef}
            type="button"
            className="goal-btn goal-btn--secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={"goal-btn " + (danger ? "goal-btn--danger" : "goal-btn--primary")}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * ContactUsModal — local-stub Contact Us dialog per patterns/support-center.md.
 *
 * PROTOTYPE ONLY. Validates email + description locally and, on a valid submit,
 * calls `onSubmit` — which does NOT send an email, submit a ticket, make a
 * network request, or attach wallet data. It never asks for a seed phrase,
 * private key, password, recovery phrase, or backup file (only warns not to
 * include them). No wallet connection or signature is involved.
 *
 * Accessibility: role="dialog" + aria-modal, labelled by the title and described
 * by the prototype note; focus moves in on open, is trapped while open, Escape /
 * Cancel / close button close it; typed input is preserved on validation error.
 * (Background inert + focus-return to the trigger are handled by SupportPage.)
 */
import { useEffect, useId, useRef, useState } from "react";
import ButtonIcon from "./ButtonIcon";
import { useScrollLock } from "./useScrollLock";
import closeUrl from "../../../assets/icons/ui/close.svg";
import {
  CONTACT_TITLE,
  CONTACT_FIELD_EMAIL,
  CONTACT_FIELD_DESCRIPTION,
  CONTACT_CANCEL,
  CONTACT_SEND,
  CONTACT_SAFETY_NOTE,
  CONTACT_PROTOTYPE_NOTE,
  CONTACT_CLOSE_LABEL,
  CONTACT_ERR_EMAIL_REQUIRED,
  CONTACT_ERR_EMAIL_INVALID,
  CONTACT_ERR_DESC_REQUIRED,
} from "../state/approvedCopy";

interface Props {
  onClose: () => void;
  /** Valid local submit — parent shows the approved toast + closes. No send. */
  onSubmit: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactUsModal({ onClose, onSubmit }: Props) {
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  useScrollLock();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const uid = useId();
  const titleId = `${uid}-title`;
  const noteId = `${uid}-note`;
  const emailErrId = `${uid}-email-err`;
  const descErrId = `${uid}-desc-err`;

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const emailError = !email.trim()
    ? CONTACT_ERR_EMAIL_REQUIRED
    : !EMAIL_RE.test(email.trim())
      ? CONTACT_ERR_EMAIL_INVALID
      : undefined;
  const descError = !description.trim() ? CONTACT_ERR_DESC_REQUIRED : undefined;

  const submit = () => {
    setShowErrors(true);
    if (emailError) {
      firstFieldRef.current?.focus();
      return;
    }
    if (descError) {
      document.getElementById(`${uid}-desc`)?.focus();
      return;
    }
    onSubmit(); // stub: no network, no email, no ticket
  };

  // Focus trap + Escape.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input, textarea, [href], [tabindex]:not([tabindex="-1"])'
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

  const showEmailErr = showErrors && emailError;
  const showDescErr = showErrors && descError;

  return (
    <div className="modal-scrim">
      <div
        ref={dialogRef}
        className="modal contact-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={noteId}
        onKeyDown={onKeyDown}
      >
        <div className="modal__header">
          <h2 id={titleId} className="modal__title">
            {CONTACT_TITLE}
          </h2>
          <button
            type="button"
            className="modal__close"
            aria-label={CONTACT_CLOSE_LABEL}
            onClick={onClose}
          >
            <ButtonIcon src={closeUrl} size={18} />
          </button>
        </div>

        <p id={noteId} className="contact-modal__note">
          {CONTACT_PROTOTYPE_NOTE}
        </p>

        <div className="goal-field">
          <label className="goal-field__label" htmlFor={`${uid}-email`}>
            {CONTACT_FIELD_EMAIL}
          </label>
          <input
            ref={firstFieldRef}
            id={`${uid}-email`}
            type="email"
            autoComplete="off"
            className="goal-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={showEmailErr ? true : undefined}
            aria-describedby={showEmailErr ? emailErrId : undefined}
          />
          {showEmailErr && (
            <p className="goal-field__error" id={emailErrId} role="alert">
              {emailError}
            </p>
          )}
        </div>

        <div className="goal-field">
          <label className="goal-field__label" htmlFor={`${uid}-desc`}>
            {CONTACT_FIELD_DESCRIPTION}
          </label>
          <textarea
            id={`${uid}-desc`}
            className="goal-input contact-modal__textarea"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={showDescErr ? true : undefined}
            aria-describedby={showDescErr ? descErrId : undefined}
          />
          {showDescErr && (
            <p className="goal-field__error" id={descErrId} role="alert">
              {descError}
            </p>
          )}
        </div>

        <p className="contact-modal__safety">{CONTACT_SAFETY_NOTE}</p>

        <div className="goal-actions">
          <button type="button" className="goal-btn goal-btn--secondary" onClick={onClose}>
            {CONTACT_CANCEL}
          </button>
          <button type="button" className="goal-btn goal-btn--primary" onClick={submit}>
            {CONTACT_SEND}
          </button>
        </div>
      </div>
    </div>
  );
}

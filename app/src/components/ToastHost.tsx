/**
 * ToastHost — temporary feedback messages per components/toast.md.
 *
 * Renders the message/helper provided by page handlers (approved copy only).
 * Toasts never contain business logic, never imply execution, and never
 * replace persistent state. Announced politely (`role="status"`), dismissible,
 * auto-dismissed by the caller.
 */
import closeUrl from "../../../assets/icons/ui/close.svg";

export interface ToastData {
  id: number;
  message: string;
  helper?: string;
}

interface Props {
  toasts: ToastData[];
  onDismiss: (id: number) => void;
}

export default function ToastHost({ toasts, onDismiss }: Props) {
  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <div className="toast__body">
            <span className="toast__message">{t.message}</span>
            {t.helper && <span className="toast__helper">{t.helper}</span>}
          </div>
          <button
            type="button"
            className="toast__dismiss"
            aria-label="Dismiss"
            onClick={() => onDismiss(t.id)}
          >
            <img src={closeUrl} alt="" width={16} height={16} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

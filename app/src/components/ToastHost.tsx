/**
 * ToastHost — temporary feedback messages per components/toast.md.
 *
 * Renders the message/helper provided by page handlers (approved copy only).
 * Toasts never contain business logic, never imply execution, and never
 * replace persistent state. Announced politely (`role="status"`), dismissible,
 * auto-dismissed by the caller.
 */
import closeUrl from "../../../assets/icons/ui/close.svg";
import circleCheckUrl from "../../../assets/icons/ui/circle-check.svg";

export interface ToastData {
  id: number;
  message: string;
  helper?: string;
  /** "success" (default) shows the green circle-check icon; "info" omits it. */
  variant?: "success" | "info";
}

interface Props {
  toasts: ToastData[];
  onDismiss: (id: number) => void;
}

/** Tint an SVG via CSS mask (the asset's own fill is ignored; the shape is masked). */
const maskStyle = (url: string) => ({
  WebkitMask: `url(${url}) center / contain no-repeat`,
  mask: `url(${url}) center / contain no-repeat`,
});

export default function ToastHost({ toasts, onDismiss }: Props) {
  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.variant !== "info" && (
            <span className="toast__icon" style={maskStyle(circleCheckUrl)} aria-hidden="true" />
          )}
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
            <span className="toast__dismiss-icon" style={maskStyle(closeUrl)} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

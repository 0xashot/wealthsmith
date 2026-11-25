/**
 * ToastHost — temporary feedback messages per components/toast.md.
 *
 * Renders the message/helper provided by page handlers (approved copy only).
 * Toasts never contain business logic, never imply execution, and never
 * replace persistent state. Announced politely (`role="status"`), dismissible,
 * and auto-dismissed HERE.
 *
 * The timer used to be the caller's job, which worked until a caller forgot:
 * the swap walkthrough's toast sat on screen indefinitely, because its own
 * pushToast had no setTimeout. A toast that never leaves is not a toast, and
 * "every caller must remember" is not a guarantee. Owning it in one place
 * makes that class of bug impossible rather than merely fixed once.
 *
 * Callers may still dismiss early, and a caller that also sets its own timer
 * is harmless — both paths filter by id, so the first one to fire wins.
 */
import { useEffect, useRef } from "react";
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
  /** How long a toast stays. Matches the duration App has always used. */
  durationMs?: number;
}

export const TOAST_DURATION_MS = 6000;

/** Tint an SVG via CSS mask (the asset's own fill is ignored; the shape is masked). */
const maskStyle = (url: string) => ({
  WebkitMask: `url(${url}) center / contain no-repeat`,
  mask: `url(${url}) center / contain no-repeat`,
});

export default function ToastHost({ toasts, onDismiss, durationMs = TOAST_DURATION_MS }: Props) {
  /**
   * One timer per toast, started when it first appears and cleared when it goes.
   *
   * Keyed by id in a ref rather than derived from the array, so a re-render — or a
   * SECOND toast arriving — does not restart the first one's clock. The effect depends
   * on the ids present, not on the array identity, for the same reason.
   */
  const timers = useRef(new Map<number, number>());
  const ids = toasts.map((t) => t.id).join(",");
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    const present = new Set(toasts.map((t) => t.id));
    for (const t of toasts) {
      if (timers.current.has(t.id)) continue;
      timers.current.set(
        t.id,
        window.setTimeout(() => {
          timers.current.delete(t.id);
          dismiss.current(t.id);
        }, durationMs),
      );
    }
    // A toast dismissed early leaves its timer behind; clear it rather than letting it
    // fire against an id that no longer exists.
    for (const [id, timer] of timers.current) {
      if (present.has(id)) continue;
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, durationMs]);

  // Unmounting with toasts on screen must not leave timers running.
  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const timer of map.values()) window.clearTimeout(timer);
      map.clear();
    };
  }, []);

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

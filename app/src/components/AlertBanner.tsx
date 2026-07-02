/**
 * AlertBanner — per components/alert.md (persistent inline message).
 *
 * Renders the dashboard recommendation alert synced to the Top Pick.
 * The alert introduces no recommendation of its own: title, description,
 * severity, and target all come from structured page state
 * (dashboard_alert.source = "top_pick").
 *
 * The "Review" action scrolls to and focuses the linked suggestion card.
 * It does not execute anything, open protocols, or mark anything complete.
 */
import type { DashboardAlertState } from "../types/dashboard";

export default function AlertBanner({ alert }: { alert: DashboardAlertState }) {
  if (!alert.visible) return null;

  const reviewTargetId = `suggestion-${alert.linked_suggestion_id}`;

  const onReview = () => {
    const el = document.getElementById(reviewTargetId);
    if (el) {
      el.scrollIntoView({ block: "nearest" });
      el.focus();
    }
  };

  return (
    <section className="alert alert--critical" aria-label={alert.title}>
      <div className="alert__content">
        <h2 className="alert__title">{alert.title}</h2>
        <p className="alert__description">{alert.description}</p>
      </div>
      <button type="button" className="alert__action" onClick={onReview}>
        {alert.action.label}
      </button>
    </section>
  );
}

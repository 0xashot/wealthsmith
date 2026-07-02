/**
 * EmptyStateCard — safe non-ready section state per
 * patterns/empty-loading-error-states.md guidance referenced from
 * patterns/dashboard-layout.md: explain what is missing, one clear next
 * action, never fake values.
 */
interface Props {
  title: string;
  description: string;
  helper?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyStateCard({
  title,
  description,
  helper,
  actionLabel,
  onAction,
}: Props) {
  return (
    <section className="card empty-card" aria-label={title}>
      <h2 className="card__title">{title}</h2>
      <p className="empty-card__description">{description}</p>
      {helper && <p className="empty-card__helper">{helper}</p>}
      {actionLabel && onAction && (
        <button type="button" className="empty-card__action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </section>
  );
}

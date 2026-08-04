/**
 * DemoBanner — Demo Mode announcement per components/announcement.md and
 * rules/demo-mode-rules.md.
 *
 * Full-width, above Global Nav (outside the nav), persistent (not dismissible),
 * with an approved message and Exit Demo (primary) + Connect Wallet (secondary)
 * actions. All copy comes from the demo fixture. Announced politely
 * (`role="status"`, `aria-live="polite"`) so it does not steal focus.
 *
 * The component renders state; it does not decide demo mode, move funds, or
 * request signatures.
 */
import { DEMO_BANNER_CONNECT_SHORT, DEMO_BANNER_EXIT_SHORT } from "../state/approvedCopy";
import type { DemoBannerState } from "../types/dashboard";

interface Props {
  banner: DemoBannerState;
  onExit: () => void;
  onConnect: () => void;
}

export default function DemoBanner({ banner, onExit, onConnect }: Props) {
  if (!banner.visible) return null;
  return (
    <div
      className="demo-banner"
      role="status"
      aria-live="polite"
      aria-label={banner.accessibility_label}
    >
      <div className="demo-banner__content">
        <p className="demo-banner__text">
          <span className="demo-banner__title">{banner.title}</span>{" "}
          <span className="demo-banner__description">{banner.description}</span>
        </p>
        <div className="demo-banner__actions">
          <button
            type="button"
            className="demo-banner__action demo-banner__action--primary"
            onClick={onExit}
          >
            <span className="demo-banner__action-full">{banner.primary_action.label}</span>
            <span className="demo-banner__action-short">{DEMO_BANNER_EXIT_SHORT}</span>
          </button>
          <button
            type="button"
            className="demo-banner__action demo-banner__action--secondary"
            onClick={onConnect}
          >
            <span className="demo-banner__action-full">{banner.secondary_action.label}</span>
            <span className="demo-banner__action-short">{DEMO_BANNER_CONNECT_SHORT}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

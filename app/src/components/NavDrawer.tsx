/**
 * NavDrawer — the mobile Global Nav slide-in drawer (<1280px only; the desktop
 * nav renders its items inline and never mounts this). Holds the same nav items
 * as the desktop bar, with the same active/disabled/navigable states. Rendered
 * through a portal to document.body so it escapes the sticky nav's stacking
 * context and covers the viewport.
 *
 * Accessibility: role="dialog" + aria-modal, labelled by the nav; focus moves to
 * the close button on open and is trapped; Escape / close button / scrim click
 * all close. Read-only navigation — nothing is signed, sent, or moved.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "./useScrollLock";
import ButtonIcon from "./ButtonIcon";
import { NAV_MENU_CLOSE, NAV_MENU_TITLE, NAV_DISABLED_TOOLTIP } from "../state/approvedCopy";
import closeUrl from "../../../assets/icons/ui/close.svg";

export interface NavDrawerItem {
  id: string;
  label: string;
  href: string;
  active: boolean;
  disabled: boolean;
  navigable: boolean;
}

interface Props {
  navLabel: string;
  items: NavDrawerItem[];
  onNavigate?: (id: string) => void;
  onClose: () => void;
}

export default function NavDrawer({ navLabel, items, onNavigate, onClose }: Props) {
  useScrollLock();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Focus trap + Escape.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href]:not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])'
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
      className="nav-drawer-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={navLabel}
        onKeyDown={onKeyDown}
      >
        <div className="nav-drawer__header">
          <span className="nav-drawer__title">{NAV_MENU_TITLE}</span>
          <button
            ref={closeRef}
            type="button"
            className="nav-drawer__close"
            aria-label={NAV_MENU_CLOSE}
            onClick={onClose}
          >
            <ButtonIcon src={closeUrl} size={18} />
          </button>
        </div>

        <ul className="nav-drawer__items">
          {items.map((item) => (
            <li key={item.id}>
              <a
                className={
                  "nav-drawer__item" +
                  (item.active ? " nav-drawer__item--active" : "") +
                  (item.disabled ? " nav-drawer__item--disabled" : "")
                }
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                aria-disabled={item.disabled ? true : undefined}
                title={item.disabled ? NAV_DISABLED_TOOLTIP : undefined}
                tabIndex={item.disabled ? -1 : undefined}
                onClick={(e) => {
                  // SPA: never a real browser navigation. Only in-scope items switch pages.
                  e.preventDefault();
                  if (item.navigable) {
                    onNavigate?.(item.id);
                    onClose();
                  }
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

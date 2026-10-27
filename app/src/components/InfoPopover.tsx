/**
 * InfoPopover — a small info icon that reveals a card-styled popover on hover and
 * on keyboard focus (and click-toggle), closing on mouse-leave, blur, or Escape.
 *
 * Informational only (role="tooltip"); it is NOT a navigation action and moves no
 * funds. Callers pass the popover body as children, styled with the shared
 * `.info-popover__*` classes (see dashboard.css).
 *
 * `strategy="fixed"` positions the popover against the VIEWPORT instead of the
 * icon's container — for icons inside a scroll container (e.g. a horizontally
 * scrolling table), where an absolutely-positioned popover would extend into the
 * hidden scroll area and look cut off at the visible edge. The popover is placed
 * under the icon, centered, and clamped to the viewport; align/direction are
 * ignored in this mode.
 */
import { useId, useRef, useState, type ReactNode } from "react";
import infoIconUrl from "../../../assets/icons/ui/info.svg";

/** Matches the .info-popover__popover width rule (min(320px, …)). */
const POPOVER_WIDTH = 320;
const VIEWPORT_MARGIN = 8;

interface Props {
  /** Accessible label for the icon button. */
  label: string;
  /** Popover content. */
  children: ReactNode;
  /** Which edge the popover aligns to (default "left"); use "right" near a container's right edge to avoid clipping. */
  align?: "left" | "right";
  /** Vertical direction the popover opens (default "down"); use "up" near a container's bottom edge to avoid clipping. */
  direction?: "up" | "down";
  /** "absolute" (default): positioned in the icon's container. "fixed": positioned against the viewport (for scroll containers). */
  strategy?: "absolute" | "fixed";
}

export default function InfoPopover({ label, children, align = "left", direction = "down", strategy = "absolute" }: Props) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [fixedPos, setFixedPos] = useState<{ top: number; left: number } | null>(null);
  const popoverId = useId();

  const openPopover = () => {
    if (strategy === "fixed" && buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      const width = Math.min(POPOVER_WIDTH, window.innerWidth - 2 * VIEWPORT_MARGIN);
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, r.left + r.width / 2 - width / 2),
        window.innerWidth - width - VIEWPORT_MARGIN,
      );
      setFixedPos({ top: r.bottom + 4, left });
    }
    setOpen(true);
  };

  return (
    <div
      className="info-popover"
      onMouseEnter={openPopover}
      onMouseLeave={() => setOpen(false)}
      onFocus={openPopover}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="info-popover__button"
        aria-label={label}
        aria-describedby={popoverId}
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPopover())}
      >
        <img src={infoIconUrl} alt="" width={16} height={16} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="tooltip"
          id={popoverId}
          className={`info-popover__popover${align === "right" ? " info-popover__popover--right" : ""}${direction === "up" ? " info-popover__popover--up" : ""}`}
          style={strategy === "fixed" && fixedPos ? { position: "fixed", top: fixedPos.top, left: fixedPos.left, right: "auto", bottom: "auto" } : undefined}
        >
          {children}
        </div>
      )}
    </div>
  );
}

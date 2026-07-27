/**
 * InfoPopover — a small info icon that reveals a card-styled popover on hover and
 * on keyboard focus (and click-toggle), closing on mouse-leave, blur, or Escape.
 *
 * Informational only (role="tooltip"); it is NOT a navigation action and moves no
 * funds. Callers pass the popover body as children, styled with the shared
 * `.info-popover__*` classes (see dashboard.css).
 */
import { useId, useState, type ReactNode } from "react";
import infoIconUrl from "../../../assets/icons/ui/info.svg";

interface Props {
  /** Accessible label for the icon button. */
  label: string;
  /** Popover content. */
  children: ReactNode;
  /** Which edge the popover aligns to (default "left"); use "right" near a container's right edge to avoid clipping. */
  align?: "left" | "right";
  /** Vertical direction the popover opens (default "down"); use "up" near a container's bottom edge to avoid clipping. */
  direction?: "up" | "down";
}

export default function InfoPopover({ label, children, align = "left", direction = "down" }: Props) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();

  return (
    <div
      className="info-popover"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        className="info-popover__button"
        aria-label={label}
        aria-describedby={popoverId}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <img src={infoIconUrl} alt="" width={16} height={16} aria-hidden="true" />
      </button>
      {open && (
        <div role="tooltip" id={popoverId} className={`info-popover__popover${align === "right" ? " info-popover__popover--right" : ""}${direction === "up" ? " info-popover__popover--up" : ""}`}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * SelectMenu — WealthSmith single-select control per components/select-menu.md +
 * components/menu-popover.md + components/menu-item.md.
 *
 * A button trigger styled as a WealthSmith input/control (card surface, approved
 * border/radius/padding/typography, approved chevron) that opens an in-app menu
 * popover below it — NOT a native browser/OS dropdown. Options render as menu
 * items (`role="menuitemradio"`) with the selected one marked (`aria-checked` +
 * check icon). It only renders and reports selection state; no product logic,
 * no invented options.
 *
 * Accessibility: trigger is keyboard-focusable with `aria-haspopup="menu"` +
 * `aria-expanded`, labelled by the visible label and the current value. Enter/
 * Space (or ArrowUp/Down) opens; Arrow keys / Home / End move focus between
 * items; Enter/Space (native button) selects; Escape or outside-click closes and
 * returns focus to the trigger.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import ButtonIcon from "./ButtonIcon";
import chevronDownUrl from "../../../assets/icons/ui/chevron-down.svg";
import checkUrl from "../../../assets/icons/ui/check.svg";
import type { GoalOption } from "../types/goal";

interface Props {
  /** id of the visible field label (for the trigger's accessible name). */
  labelId: string;
  options: GoalOption[];
  value: string;
  onChange: (value: string) => void;
  ariaInvalid?: boolean;
  ariaDescribedby?: string;
  /** Read-only (view mode): shows the value in the control shape but does not
   *  open. Not the same as disabled. */
  readOnly?: boolean;
}

export default function SelectMenu({
  labelId,
  options,
  value,
  onChange,
  ariaInvalid,
  ariaDescribedby,
  readOnly,
}: Props) {
  const [open, setOpen] = useState(false);
  // Viewport-aware placement: default below; flip above when there is not enough
  // room below; constrain height with internal scroll if neither side fits fully.
  const [placement, setPlacement] = useState<"below" | "above">("below");
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const menuId = useId();
  const valueId = useId();
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selectedLabel = options[selectedIndex]?.label ?? "";

  // Choose placement (above/below) + max-height before paint, based on the space
  // available around the trigger. Runs before the browser paints so the menu
  // does not visibly jump.
  useLayoutEffect(() => {
    if (!open) {
      setPlacement("below");
      setMaxHeight(undefined);
      return;
    }
    const trigger = triggerRef.current;
    const pop = popoverRef.current;
    if (!trigger || !pop) return;
    const VIEWPORT_MARGIN = 8; // keep the menu a few px inside the viewport edge
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - VIEWPORT_MARGIN;
    const popHeight = pop.offsetHeight;
    if (popHeight <= spaceBelow) {
      setPlacement("below");
      setMaxHeight(undefined);
    } else if (spaceAbove > spaceBelow) {
      setPlacement("above");
      setMaxHeight(Math.max(0, Math.min(popHeight, spaceAbove)));
    } else {
      setPlacement("below");
      setMaxHeight(Math.max(0, spaceBelow));
    }
  }, [open]);

  // Focus the selected item when the menu opens.
  useEffect(() => {
    if (open) itemRefs.current[selectedIndex]?.focus();
  }, [open, selectedIndex]);

  // Close on outside pointer-down.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    // Return focus after the popover unmounts (its focused option is removed on
    // the same tick, which would otherwise drop focus to <body>).
    if (returnFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const select = (v: string) => {
    onChange(v);
    close(true);
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(current + 1) % items.length].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(current - 1 + items.length) % items.length].focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1].focus();
    }
  };

  // Read-only (view mode): same control shape, shows the value, does not open.
  // Rendered as a read-only textbox (not disabled) so the value stays clearly
  // exposed and label-associated.
  if (readOnly) {
    return (
      <div className="select-menu">
        <div
          className="select-menu__trigger select-menu__trigger--readonly"
          role="textbox"
          aria-readonly="true"
          aria-labelledby={labelId}
          tabIndex={-1}
        >
          <span className="select-menu__value">{selectedLabel}</span>
          <span className="select-menu__chevron" aria-hidden="true">
            <ButtonIcon src={chevronDownUrl} size={16} />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="select-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="select-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-labelledby={`${labelId} ${valueId}`}
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={ariaDescribedby}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="select-menu__value" id={valueId}>
          {selectedLabel}
        </span>
        <span className="select-menu__chevron" aria-hidden="true">
          <ButtonIcon src={chevronDownUrl} size={16} />
        </span>
      </button>

      {open && (
        <div
          ref={popoverRef}
          className={
            "select-menu__popover" +
            (placement === "above" ? " select-menu__popover--above" : "")
          }
          style={maxHeight != null ? { maxHeight, overflowY: "auto" } : undefined}
          role="menu"
          id={menuId}
          aria-labelledby={labelId}
          onKeyDown={onMenuKeyDown}
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <button
                key={o.value}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                tabIndex={-1}
                className={
                  "select-menu__option" +
                  (isSelected ? " select-menu__option--selected" : "")
                }
                onClick={() => select(o.value)}
              >
                <span className="select-menu__check" aria-hidden="true">
                  {isSelected && <ButtonIcon src={checkUrl} size={16} />}
                </span>
                <span className="select-menu__option-label">{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

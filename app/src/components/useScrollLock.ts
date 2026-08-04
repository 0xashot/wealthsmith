/**
 * useScrollLock — locks background page scroll while a modal is mounted and
 * restores it on unmount. Locks the root scrolling element (`<html>` in standards
 * mode) so `overflow: hidden` actually stops the scroll. The removed scrollbar
 * width is added back as padding so the page (and the sticky nav) doesn't shift.
 * Ref-counted at module scope so stacked modals don't unlock early.
 *
 * `enabled` (default true) lets a caller scope the lock — e.g. a panel that only
 * covers the viewport on mobile passes a live `isMobile` flag, so the lock engages
 * and releases as the viewport crosses the breakpoint.
 */
import { useEffect } from "react";

let lockCount = 0;
let savedOverflow = "";
let savedPaddingRight = "";

export function useScrollLock(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    if (lockCount === 0) {
      const scrollbarWidth = window.innerWidth - root.clientWidth;
      savedOverflow = root.style.overflow;
      savedPaddingRight = root.style.paddingRight;
      root.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        const currentPadding = parseFloat(getComputedStyle(root).paddingRight) || 0;
        root.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
      }
    }
    lockCount += 1;
    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        root.style.overflow = savedOverflow;
        root.style.paddingRight = savedPaddingRight;
      }
    };
  }, [enabled]);
}

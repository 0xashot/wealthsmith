/**
 * useIsMobileViewport — true below the desktop breakpoint (< 1280px), matching
 * `mobile.css`'s `@media (max-width: 1279px)`. Read synchronously on first render
 * and kept in sync via a media-query listener, so a resize across the breakpoint
 * updates consumers (e.g. mobile-only scroll lock) live.
 */
import { useEffect, useState } from "react";

const QUERY = "(max-width: 1279px)";

export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    setIsMobile(mq.matches);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return isMobile;
}

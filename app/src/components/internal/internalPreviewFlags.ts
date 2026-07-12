/**
 * internalPreviewFlags — dev-only gating for the internal SOL LST preview route.
 * Not for production user flows. The route is unreachable unless BOTH the build is
 * a local dev build AND an explicit env flag is set, so it can never appear in a
 * production bundle or a normal `npm run dev` session.
 */

export const INTERNAL_SOL_LST_PREVIEW_ROUTE_EXISTS = true;
export const INTERNAL_SOL_LST_PREVIEW_ROUTE_ENABLED_BY_DEFAULT = false;
export const INTERNAL_SOL_LST_PREVIEW_REQUIRES_DEV_MODE = true;
export const INTERNAL_SOL_LST_PREVIEW_ROUTE_PATH = "/internal/sol-lst-preview";
export const INTERNAL_SOL_LST_PREVIEW_UPDATES_LIVE_SUGGESTIONS = false;
export const INTERNAL_SOL_LST_PREVIEW_ENABLES_SELECTION = false;
export const INTERNAL_SOL_LST_PREVIEW_ENABLES_TRANSACTIONS = false;

/**
 * True only in a local dev build with `VITE_INTERNAL_SOL_LST_PREVIEW="true"`.
 * Defensive against environments without `import.meta.env` (e.g. the Node fixtures
 * runner), where it returns false.
 *
 *   VITE_INTERNAL_SOL_LST_PREVIEW=true npm run dev
 */
export function isInternalSolLstPreviewRouteEnabled(): boolean {
  try {
    // Access `import.meta.env` as a literal so Vite injects it (aliasing
    // `import.meta` first would leave `.env` undefined). In non-Vite runtimes
    // (e.g. the Node fixtures runner) `import.meta.env` is undefined → caught → false.
    const env = import.meta.env as unknown as { DEV?: boolean; VITE_INTERNAL_SOL_LST_PREVIEW?: string };
    return env.DEV === true && env.VITE_INTERNAL_SOL_LST_PREVIEW === "true";
  } catch {
    return false;
  }
}

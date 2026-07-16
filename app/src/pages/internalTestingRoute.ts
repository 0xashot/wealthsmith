/**
 * internalTestingRoute — Step 16H-K.2. The build-time gate for the internal `/testing` gallery.
 *
 * WHY THIS MODULE EXISTS AT ALL: the gate used to live in `testingPageFixtures.ts` alongside the
 * fixtures themselves. Because `App.tsx` must import the gate to decide whether to route, that static
 * import dragged the entire fixture module — including its numeric risk-score fixtures — into the main
 * production chunk, even though the route was never reachable. Splitting the gate into its own tiny,
 * dependency-free module lets `App.tsx` ask the question without importing the answers, so the fixtures
 * can be lazy-loaded into a separate chunk that a public build never requests.
 *
 * THE POLICY (product-owner decision, 16H-K.2): `/testing` is an internal development and QA tool. It
 * stays available for local dev, deterministic fixture review, internal QA, and explicitly-internal or
 * staging builds. It must not be a reachable route in the public production app.
 *
 * This is a BUILD-TIME gate, not a client-side secret. There is no query parameter and no URL password:
 * in a public build the condition is statically false, the route is never registered, and `/testing`
 * behaves exactly like any other unrecognized path.
 */

/** The internal route path. Never linked from product navigation. */
export const TESTING_PAGE_ROUTE = "/testing";

/**
 * The internal-build flag. Default is FALSE — a public production build must opt in explicitly, and
 * nothing but an explicit env var can turn it on.
 *
 *   npm run dev                                   → enabled (import.meta.env.DEV)
 *   VITE_ENABLE_TESTING_PAGE=true npm run build   → enabled (internal / staging build)
 *   npm run build                                 → DISABLED (public production)
 *
 * Deliberately NOT tied to Demo Mode: Demo is a user-facing product surface, and using it as an
 * internal-tooling gate would make a product state grant access to internal fixtures.
 */
export const INTERNAL_TESTING_FLAG = "VITE_ENABLE_TESTING_PAGE" as const;

/**
 * True in a local dev build, or when `VITE_ENABLE_TESTING_PAGE="true"` (an internal/staging build).
 * False by default in production.
 *
 * Defensive against runtimes without `import.meta.env` — the Node fixtures runner has no such object,
 * so the access throws and we fail closed to `false`.
 */
export function isTestingPageEnabled(): boolean {
  try {
    // Accessed as a literal so Vite statically replaces it at build time; in a public production build
    // both sides are compile-time false.
    const env = import.meta.env as unknown as { DEV?: boolean; VITE_ENABLE_TESTING_PAGE?: string };
    return env.DEV === true || env.VITE_ENABLE_TESTING_PAGE === "true";
  } catch {
    return false;
  }
}

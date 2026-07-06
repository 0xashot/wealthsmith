/**
 * SmithInitialLoadingState — the premium "Smith AI getting ready" moment shown the
 * FIRST time Onboarding or a Smith AI panel opens in a session, before the
 * scripted/approved content appears. Per components/smith-ai-initial-loading-state.md
 * and assets/animations/animation-registry.json (approvedUse: "smith-ai-loading").
 *
 * A centered 64×64 Smith AI symbol animation (`smith-ai-symbol-loop.json`, loaded
 * lazily) with a calm paired label. It is NOT a generic spinner and NOT a page
 * loader; it implies no live AI, no wallet scanning, and no real data loading.
 *
 *  - Motion: the animation plays through to the end **once**; its completion event
 *    reveals the content. A timer set beyond the asset length is only a
 *    non‑blocking safety net (it never cuts the play‑through short, and it
 *    guarantees the state can never block indefinitely).
 *  - Reduced motion: no animation. The static registry fallback symbol
 *    (wealthsmith-symbol.svg) is shown with the label for a brief beat, then reveal.
 *
 * Accessibility: polite live status with the visible label as its accessible text;
 * the symbol is decorative (aria-hidden); focus is never moved here.
 */
import { Suspense, lazy, useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";
import { SMITH_INITIAL_LOADING_LABEL } from "../state/approvedCopy";
import symbolUrl from "../../../assets/logo/wealthsmith-symbol.svg";

const SmithLoopLottie = lazy(() => import("./SmithLoopLottie"));

const REDUCED_MS = 700; // brief static beat for reduced motion (no animation to play)
// Safety net so the loading never blocks if the animation's complete event does
// not fire (e.g. a throttled/background tab). Set beyond the ~4.07s asset length
// so it never cuts the play‑through short in the normal (foreground) case.
const ANIMATION_MAX_MS = 6000;

interface Props {
  /** Exact square size in px (default 64). */
  size?: number;
  /** Called once after the animation plays through (or the safety net), to reveal content. */
  onComplete: () => void;
  /** Visible + accessible loading label (defaults to the approved copy). */
  label?: string;
}

export default function SmithInitialLoadingState({
  size = 64,
  onComplete,
  label,
}: Props) {
  const reduced = useReducedMotion();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const doneRef = useRef(false);

  // Reveal exactly once — from the animation's completion (motion) or the timer.
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCompleteRef.current();
  }, []);

  useEffect(() => {
    // Reduced motion: brief static beat. Motion: the animation's onComplete drives
    // the reveal; this timer is only a non‑blocking safety net beyond the asset length.
    const id = window.setTimeout(finish, reduced ? REDUCED_MS : ANIMATION_MAX_MS);
    return () => window.clearTimeout(id);
  }, [reduced, finish]);

  return (
    <div className="smith-initial-loading" role="status" aria-live="polite" aria-busy="true">
      <span
        className="smith-initial-loading__symbol"
        aria-hidden="true"
        style={{ width: size, height: size }}
      >
        {reduced ? (
          <img src={symbolUrl} alt="" width={size} height={size} />
        ) : (
          <Suspense fallback={null}>
            <SmithLoopLottie size={size} onComplete={finish} />
          </Suspense>
        )}
      </span>
      <p className="smith-initial-loading__label">{label ?? SMITH_INITIAL_LOADING_LABEL}</p>
    </div>
  );
}

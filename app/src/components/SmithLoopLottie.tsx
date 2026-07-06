/**
 * SmithLoopLottie — plays the approved `smith-ai-symbol-loop.json` animation via
 * lottie-react. Lazy-loaded (see SmithInitialLoadingState) so lottie-web is only
 * fetched when the animation actually plays — never for reduced-motion users and
 * not in the main bundle. Decorative (the caller marks it aria-hidden); the loop
 * is a short visual "Smith is preparing" beat, not live AI or data loading.
 *
 * Only this one approved animation asset is imported. No new asset, no wordmark,
 * no logo replacement (see assets/animations/animation-registry.json).
 */
import Lottie from "lottie-react";
import smithLoop from "../../../assets/animations/smith-ai-symbol-loop.json";

export default function SmithLoopLottie({
  size,
  onComplete,
}: {
  size: number;
  /** Fires when the animation has played through to the end once. */
  onComplete?: () => void;
}) {
  return (
    <Lottie
      animationData={smithLoop}
      loop={false}
      autoplay
      onComplete={onComplete}
      style={{ width: size, height: size }}
      rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
    />
  );
}

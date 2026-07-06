/**
 * SmithLottie — renders the approved animated Smith logo
 * (assets/animations/smith-ai-symbol-loop.json) at exactly 32×32px via
 * lottie-react. Lazy-loaded so lottie-web is only fetched when the logo actually
 * animates (never for reduced-motion users).
 *
 * While `playing` (a Smith AI question is being typed) it loops. When `playing`
 * becomes false (the question is fully written) it **stops on its last frame**
 * (`goToAndStop`) — it does not keep looping and is not swapped for a separate
 * static logo; the last frame is the resting avatar. No other animation asset is
 * imported; the source is square, rendered with preserveAspectRatio.
 */
import { useEffect, useRef } from "react";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import smithLoop from "../../../assets/animations/smith-ai-symbol-loop.json";

const SIZE = 32;

export default function SmithLottie({ playing = true }: { playing?: boolean }) {
  const ref = useRef<LottieRefCurrentProps>(null);
  useEffect(() => {
    const l = ref.current;
    if (!l) return;
    if (playing) {
      l.play();
    } else {
      // Freeze on the final frame (resting logo), do not loop.
      const lastFrame = Math.max(0, (l.getDuration(true) ?? 1) - 1);
      l.goToAndStop(lastFrame, true);
    }
  }, [playing]);
  return (
    <Lottie
      lottieRef={ref}
      animationData={smithLoop}
      loop
      autoplay={playing}
      style={{ width: SIZE, height: SIZE }}
      rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
    />
  );
}

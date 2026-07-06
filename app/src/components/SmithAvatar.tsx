/**
 * SmithAvatar — the Smith AI assistant avatar for the onboarding chat.
 *
 * Per patterns/onboarding-with-smith-ai.md and components/smith-ai-typing-indicator.md:
 * onboarding uses the approved `sparcle.svg` icon painted in `color.action.primary`
 * (blue) — no Smith logo and no looping animation. Decorative (aria-hidden). The
 * writing cue is the typewriter itself, not this icon.
 */
import ButtonIcon from "./ButtonIcon";
import sparcleUrl from "../../../assets/icons/ui/sparcle.svg";

export default function SmithAvatar() {
  return (
    <span className="smith-avatar" aria-hidden="true">
      <ButtonIcon src={sparcleUrl} size={22} />
    </span>
  );
}

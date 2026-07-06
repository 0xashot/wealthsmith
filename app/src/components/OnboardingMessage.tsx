/**
 * OnboardingMessage — a Smith AI assistant message row in the onboarding chat
 * (Gemini-style, no chat bubble). Per patterns/onboarding-with-smith-ai.md.
 *
 * A Smith avatar (the sparkle icon, primary blue) on the left and the approved
 * message text rendered directly on the panel surface on the right — no bubble,
 * border, background, or shadow. Presentation only — no state, no decisions.
 */
import type { ReactNode } from "react";
import SmithAvatar from "./SmithAvatar";

export default function OnboardingMessage({ children }: { children: ReactNode }) {
  return (
    <div className="onboarding-msg">
      <SmithAvatar />
      <div className="onboarding-msg__content">{children}</div>
    </div>
  );
}

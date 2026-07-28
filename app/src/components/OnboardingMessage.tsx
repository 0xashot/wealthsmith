/**
 * OnboardingMessage — a Smith AI assistant message row in the onboarding chat
 * (Gemini-style, no chat bubble). Per patterns/onboarding-with-smith-ai.md.
 *
 * A Smith avatar (the sparkle icon, primary blue) on the left and the approved
 * message text rendered directly on the panel surface on the right — no bubble,
 * border, background, or shadow. Presentation only — no state, no decisions.
 *
 * `grouped`: this message immediately follows another Smith message (no user reply
 * in between), so it hides the avatar and keeps a same-width spacer — the consecutive
 * messages read as one turn under a single avatar.
 */
import type { ReactNode } from "react";
import SmithAvatar from "./SmithAvatar";

export default function OnboardingMessage({ children, grouped = false }: { children: ReactNode; grouped?: boolean }) {
  return (
    <div className="onboarding-msg">
      {grouped ? <span className="onboarding-msg__avatar-spacer" aria-hidden="true" /> : <SmithAvatar />}
      <div className="onboarding-msg__content">{children}</div>
    </div>
  );
}

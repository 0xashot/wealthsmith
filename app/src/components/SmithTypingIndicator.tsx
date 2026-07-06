/**
 * SmithTypingIndicator — the accessible "Smith AI is writing." status for the
 * conversational onboarding writing state. Per
 * components/smith-ai-typing-indicator.md.
 *
 * Gemini-style: the visible writing cue is the 32×32 animated Smith logo (the
 * SmithAvatar in the message row); there is no chat bubble and no visible
 * "Smith is writing…" text. This component only exposes the status to assistive
 * tech (`role="status"` + `aria-live="polite"`, visually hidden) so screen
 * readers announce that Smith AI is writing. Deterministic/scripted — no live AI.
 */
import { ONBOARDING_TYPING_LABEL } from "../state/approvedCopy";

export default function SmithTypingIndicator() {
  return (
    <span className="sr-only" role="status" aria-live="polite">
      {ONBOARDING_TYPING_LABEL}
    </span>
  );
}

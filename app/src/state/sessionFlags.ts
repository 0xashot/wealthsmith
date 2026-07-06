/**
 * sessionFlags — in-memory, session-scoped "shown once" flags (reset on full page
 * reload / app restart). Used to show the premium Smith AI initial loading state
 * only on the FIRST open of Onboarding and of a Smith AI panel in a session, not
 * on every step, reopen, or remount. Not persisted; no storage, no network.
 */
export const sessionFlags = {
  /** Onboarding has shown its first-open Smith AI loading state this session. */
  onboardingIntroShown: false,
  /** A Smith AI panel has shown its first-open loading state this session. */
  smithAiIntroShown: false,
};

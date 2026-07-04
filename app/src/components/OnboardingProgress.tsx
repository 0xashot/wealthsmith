/**
 * OnboardingProgress — determinate onboarding progress bar per
 * components/progress-bar.md (Onboarding Progress Bar) and the onboarding
 * pattern's Accessibility section. Reuses the shared `.progress` / `.progress__fill`
 * styles. Pure renderer: it shows the current step position only; it never
 * computes completion or advances on its own.
 */
import { ONBOARDING_PROGRESS_LABEL } from "../state/approvedCopy";

interface Props {
  /** 1-based index of the current step. */
  current: number;
  /** Total number of onboarding steps. */
  total: number;
}

export default function OnboardingProgress({ current, total }: Props) {
  const clamped = Math.max(0, Math.min(current, total));
  const pct = total > 0 ? Math.round((clamped / total) * 100) : 0;
  return (
    <div
      className="progress onboarding-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={clamped}
      aria-valuetext={`Step ${clamped} of ${total}`}
      aria-label={ONBOARDING_PROGRESS_LABEL}
    >
      <div className="progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

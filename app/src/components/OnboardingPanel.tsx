/**
 * OnboardingPanel — the persistent Smith AI onboarding companion panel
 * (right zone) per patterns/onboarding-with-smith-ai.md and dashboard-layout.md.
 *
 *  - Disconnected (Variant 1): welcome + wallet/demo entry (Step 1).
 *  - Connected + goal incomplete (Variant 4): the goal-setup questions with
 *    Back / Continue, progress, and required-field validation (Step 2).
 *
 * Layout: this is the right-rail assistant panel and uses the same sizing/
 * anchoring as the Ask Smith AI panel (components/sidebar.md) — the `.onboarding-panel`
 * element is the flex-column card; the header/progress stay pinned at the top,
 * the actions stay at the bottom, and `.onboarding-panel__body` scrolls
 * internally when content exceeds the available height (see dashboard.css).
 *
 * Explain-only, non-custodial: the Smith companion message is static approved
 * copy (no live AI). Choice options come from Goal Settings (Decision A);
 * currency fields use WealthSmith input styling. Answers are held as a LOCAL
 * draft only — nothing is committed to saved plan state, and nothing here
 * recalculates the Dashboard, suggestions, Top Pick, Safety Buffer, projections,
 * allocation, or protocol decisions. No wallet signature, transaction, fund
 * movement, or secret request. Review / Finish / completion arrive in a later
 * step; the final step's Continue is intentionally disabled until then.
 */
import { useState } from "react";
import OnboardingProgress from "./OnboardingProgress";
import SelectMenu from "./SelectMenu";
import smithSymbolUrl from "../../../assets/logo/wealthsmith-symbol.svg";
import {
  ONBOARDING_PANEL_LABEL,
  ONBOARDING_WELCOME_TITLE,
  ONBOARDING_WELCOME_DESC,
  ONBOARDING_WELCOME_HELPER,
  ONBOARDING_WELCOME_COMPANION,
  ONBOARDING_WALLET_HELPER,
  ONBOARDING_DEMO_HELPER,
  ONBOARDING_SECURITY_NOTE,
  ONBOARDING_CONTINUE,
  ONBOARDING_BACK,
  ONBOARDING_SKIP,
  ONBOARDING_SAVING_OPTIONAL,
  CONNECT_WALLET_LABEL,
  TRY_DEMO_MODE,
} from "../state/approvedCopy";
import {
  GOAL_SETUP_STEPS,
  ONBOARDING_TOTAL_STEPS,
  initialOnboardingAnswers,
  stepError,
  stepOrdinal,
  type OnboardingAnswers,
} from "../state/onboardingState";

interface Props {
  /** Onboarding phase: disconnected = welcome/entry; connected = goal setup. */
  mode: "disconnected" | "connected";
  onConnectWallet: () => void;
  onTryDemo: () => void;
}

const LABEL_ID = "onb-field-label";
const INPUT_ID = "onb-field-input";
const HELPER_ID = "onb-field-helper";
const ERROR_ID = "onb-field-error";

export default function OnboardingPanel({ mode, onConnectWallet, onTryDemo }: Props) {
  // Goal-setup draft state (used in the connected phase). Declared unconditionally
  // so it survives the disconnected → connected transition.
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(initialOnboardingAnswers);
  const [showError, setShowError] = useState(false);

  const set = (key: keyof OnboardingAnswers, value: string) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));

  // ---- Disconnected: welcome + wallet/demo entry (Step 1) -------------------
  if (mode === "disconnected") {
    return (
      <aside className="onboarding-panel" aria-label={ONBOARDING_PANEL_LABEL}>
        <h2 className="onboarding-panel__title">{ONBOARDING_PANEL_LABEL}</h2>
        <OnboardingProgress current={1} total={ONBOARDING_TOTAL_STEPS} />
        <div className="onboarding-panel__body">
          <img
            className="onboarding-panel__symbol"
            src={smithSymbolUrl}
            alt=""
            width={40}
            height={40}
            aria-hidden="true"
          />
          <h3 className="onboarding-panel__welcome-title">{ONBOARDING_WELCOME_TITLE}</h3>
          <p className="onboarding-panel__desc">{ONBOARDING_WELCOME_DESC}</p>
          <p className="onboarding-panel__companion" role="status" aria-live="polite">
            {ONBOARDING_WELCOME_COMPANION}
          </p>
          <p className="onboarding-panel__helper">{ONBOARDING_WELCOME_HELPER}</p>
        </div>
        <div className="onboarding-panel__actions">
          <button type="button" className="goal-btn goal-btn--primary" onClick={onConnectWallet}>
            {CONNECT_WALLET_LABEL}
          </button>
          <button type="button" className="goal-btn goal-btn--secondary" onClick={onTryDemo}>
            {TRY_DEMO_MODE}
          </button>
        </div>
        <p className="onboarding-panel__note">{ONBOARDING_WALLET_HELPER}</p>
        <p className="onboarding-panel__note">{ONBOARDING_DEMO_HELPER}</p>
        <p className="onboarding-panel__security">{ONBOARDING_SECURITY_NOTE}</p>
      </aside>
    );
  }

  // ---- Connected + goal incomplete: goal-setup steps (Step 2) ---------------
  const step = GOAL_SETUP_STEPS[stepIndex];
  const value = answers[step.draftKey];
  const error = showError ? stepError(step, value) : undefined;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === GOAL_SETUP_STEPS.length - 1;

  const onContinue = () => {
    if (stepError(step, value)) {
      setShowError(true);
      return;
    }
    if (!isLast) {
      setStepIndex((i) => i + 1);
      setShowError(false);
    }
  };
  const onBack = () => {
    if (!isFirst) {
      setStepIndex((i) => i - 1);
      setShowError(false);
    }
  };
  const onSkip = () => {
    // Optional field: leave blank (approved skip). No advance from the last step
    // until Review/Finish exists.
    set(step.draftKey, "");
    setShowError(false);
  };

  return (
    <aside className="onboarding-panel" aria-label={ONBOARDING_PANEL_LABEL}>
      <h2 className="onboarding-panel__title">{ONBOARDING_PANEL_LABEL}</h2>
      <OnboardingProgress current={stepOrdinal(step.id)} total={ONBOARDING_TOTAL_STEPS} />

      <div className="onboarding-panel__body">
        <img
          className="onboarding-panel__symbol"
          src={smithSymbolUrl}
          alt=""
          width={40}
          height={40}
          aria-hidden="true"
        />
        <h3 className="onboarding-panel__welcome-title">{step.title}</h3>
        <p className="onboarding-panel__desc">{step.description}</p>
        <p className="onboarding-panel__companion" role="status" aria-live="polite">
          {step.companion}
        </p>

        <div className="goal-field onboarding-panel__field">
          {step.fieldType === "select" ? (
            <>
              <span className="goal-field__label" id={LABEL_ID}>
                {step.fieldLabel}
              </span>
              <SelectMenu
                labelId={LABEL_ID}
                options={step.options!}
                value={value}
                onChange={(v) => set(step.draftKey, v)}
              />
              <p className="goal-field__helper" id={HELPER_ID}>
                {step.helper}
              </p>
            </>
          ) : (
            <>
              <label className="goal-field__label" htmlFor={INPUT_ID}>
                {step.fieldLabel}
                {step.optional && (
                  <span className="goal-field__optional"> ({ONBOARDING_SAVING_OPTIONAL})</span>
                )}
              </label>
              <div className="goal-currency">
                <span className="goal-currency__prefix" aria-hidden="true">
                  $
                </span>
                <input
                  id={INPUT_ID}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className="goal-input goal-currency__input"
                  placeholder={step.placeholder}
                  value={value}
                  onChange={(e) => set(step.draftKey, e.target.value)}
                  aria-describedby={error ? `${HELPER_ID} ${ERROR_ID}` : HELPER_ID}
                  aria-invalid={error ? true : undefined}
                />
              </div>
              <p className="goal-field__helper" id={HELPER_ID}>
                {step.helper}
              </p>
              {error && (
                <p className="goal-field__error" id={ERROR_ID} role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="onboarding-panel__nav">
        <button
          type="button"
          className="goal-btn goal-btn--secondary"
          onClick={onBack}
          disabled={isFirst}
        >
          {ONBOARDING_BACK}
        </button>
        {step.optional && (
          <button type="button" className="goal-btn goal-btn--secondary" onClick={onSkip}>
            {ONBOARDING_SKIP}
          </button>
        )}
        <button
          type="button"
          className="goal-btn goal-btn--primary"
          onClick={onContinue}
          disabled={isLast}
        >
          {ONBOARDING_CONTINUE}
        </button>
      </div>
    </aside>
  );
}

/**
 * OnboardingPanel — the persistent Smith AI onboarding companion panel
 * (right zone) per patterns/onboarding-with-smith-ai.md and dashboard-layout.md.
 *
 *  - Disconnected (Variant 1): welcome + wallet/demo entry (Step 1).
 *  - Connected + goal incomplete (Variant 4): the goal-setup questions with
 *    Back / Continue, progress, and required-field validation (Step 2), ending
 *    in a Review step + Finish Setup (Step 3).
 *
 * Layout: right-rail assistant panel matching the Ask Smith AI panel sizing/
 * anchoring (components/sidebar.md) — header/progress pinned top, actions pinned
 * bottom, `.onboarding-panel__body` scrolls internally.
 *
 * Explain-only, non-custodial: the Smith companion message is static approved
 * copy (no live AI). Choice options come from Goal Settings (Decision A);
 * currency fields use WealthSmith input styling. On Finish, the collected answers
 * are committed to the SAME local savedGoal state Goal Settings uses (via
 * onComplete) and the app routes to the connected Dashboard — nothing here
 * recalculates the Dashboard, suggestions, Top Pick, Safety Buffer, projections,
 * allocation, or protocol decisions. No wallet signature, transaction, fund
 * movement, or secret request.
 */
import { useEffect, useRef, useState } from "react";
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
  ONBOARDING_GOAL_LABEL,
  ONBOARDING_HORIZON_LABEL,
  ONBOARDING_RISK_LABEL,
  ONBOARDING_INCOME_LABEL,
  ONBOARDING_EXPENSES_LABEL,
  ONBOARDING_CONTRIB_LABEL,
  ONBOARDING_SAVING_LABEL,
  ONBOARDING_REVIEW_TITLE,
  ONBOARDING_REVIEW_DESC,
  ONBOARDING_REVIEW_HELPER,
  ONBOARDING_REVIEW_COMPANION,
  ONBOARDING_FINISH,
  CONNECT_WALLET_LABEL,
  TRY_DEMO_MODE,
} from "../state/approvedCopy";
import {
  GOAL_SETUP_STEPS,
  ONBOARDING_TOTAL_STEPS,
  initialOnboardingAnswers,
  stepError,
  stepOrdinal,
  requiredFieldsValid,
  buildSavedGoal,
  type OnboardingAnswers,
} from "../state/onboardingState";
import {
  FINANCIAL_GOAL_OPTIONS,
  RISK_OPTIONS,
  TIMELINE_OPTIONS,
  CONTRIBUTION_OPTIONS,
  labelFor,
} from "../state/goalState";
import type { SavedGoal } from "../types/goal";

interface Props {
  /** Onboarding phase: disconnected = welcome/entry; connected = goal setup. */
  mode: "disconnected" | "connected";
  onConnectWallet: () => void;
  onTryDemo: () => void;
  /** Finish Setup: commit the collected answers + complete onboarding. */
  onComplete: (savedGoal: SavedGoal) => void;
}

const LABEL_ID = "onb-field-label";
const INPUT_ID = "onb-field-input";
const HELPER_ID = "onb-field-helper";
const ERROR_ID = "onb-field-error";

/** Display a currency answer as "$X,XXX", or an em dash when blank. */
function money(raw: string): string {
  const t = raw.trim().replace(/[$,\s]/g, "");
  if (t === "") return "—";
  const n = Number(t);
  return Number.isFinite(n) ? `$${n.toLocaleString()}` : "—";
}

export default function OnboardingPanel({
  mode,
  onConnectWallet,
  onTryDemo,
  onComplete,
}: Props) {
  // Goal-setup draft state (used in the connected phase). Declared unconditionally
  // so it survives the disconnected → connected transition.
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(initialOnboardingAnswers);
  const [showError, setShowError] = useState(false);

  // Move focus to the step heading on step changes (predictable focus), skipping
  // the initial mount so we don't steal focus on first render.
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [stepIndex]);

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

  // ---- Connected + goal incomplete: goal-setup + review (Step 2/3) ----------
  const isReview = stepIndex === GOAL_SETUP_STEPS.length;

  const onBack = () => {
    setStepIndex((i) => Math.max(0, i - 1));
    setShowError(false);
  };

  // ---- Review step ----------------------------------------------------------
  if (isReview) {
    const rows: { label: string; value: string }[] = [
      { label: ONBOARDING_GOAL_LABEL, value: labelFor(FINANCIAL_GOAL_OPTIONS, answers.financial_goal) },
      { label: ONBOARDING_RISK_LABEL, value: labelFor(RISK_OPTIONS, answers.risk_tolerance) },
      { label: ONBOARDING_HORIZON_LABEL, value: labelFor(TIMELINE_OPTIONS, answers.timeline) },
      { label: ONBOARDING_INCOME_LABEL, value: money(answers.income) },
      { label: ONBOARDING_EXPENSES_LABEL, value: money(answers.expenses) },
      { label: ONBOARDING_CONTRIB_LABEL, value: labelFor(CONTRIBUTION_OPTIONS, answers.contribution_frequency) },
      { label: ONBOARDING_SAVING_LABEL, value: money(answers.saving) },
    ];
    const canFinish = requiredFieldsValid(answers);
    return (
      <aside className="onboarding-panel" aria-label={ONBOARDING_PANEL_LABEL}>
        <h2 className="onboarding-panel__title">{ONBOARDING_PANEL_LABEL}</h2>
        <OnboardingProgress current={stepOrdinal("review")} total={ONBOARDING_TOTAL_STEPS} />
        <div className="onboarding-panel__body">
          <img
            className="onboarding-panel__symbol"
            src={smithSymbolUrl}
            alt=""
            width={40}
            height={40}
            aria-hidden="true"
          />
          <h3 className="onboarding-panel__welcome-title" ref={headingRef} tabIndex={-1}>
            {ONBOARDING_REVIEW_TITLE}
          </h3>
          <p className="onboarding-panel__desc">{ONBOARDING_REVIEW_DESC}</p>
          <p className="onboarding-panel__companion" role="status" aria-live="polite">
            {ONBOARDING_REVIEW_COMPANION}
          </p>
          <dl className="onboarding-review">
            {rows.map((r) => (
              <div className="onboarding-review__row" key={r.label}>
                <dt className="onboarding-review__label">{r.label}</dt>
                <dd className="onboarding-review__value">{r.value}</dd>
              </div>
            ))}
          </dl>
          <p className="onboarding-panel__helper">{ONBOARDING_REVIEW_HELPER}</p>
        </div>
        <div className="onboarding-panel__nav">
          <button type="button" className="goal-btn goal-btn--secondary" onClick={onBack}>
            {ONBOARDING_BACK}
          </button>
          <button
            type="button"
            className="goal-btn goal-btn--primary"
            onClick={() => onComplete(buildSavedGoal(answers))}
            disabled={!canFinish}
          >
            {ONBOARDING_FINISH}
          </button>
        </div>
      </aside>
    );
  }

  // ---- Field step -----------------------------------------------------------
  const step = GOAL_SETUP_STEPS[stepIndex];
  const value = answers[step.draftKey];
  const error = showError ? stepError(step, value) : undefined;
  const isFirst = stepIndex === 0;

  const onContinue = () => {
    if (stepError(step, value)) {
      setShowError(true);
      return;
    }
    // Advances through the field steps and, from the last field, into Review.
    setStepIndex((i) => i + 1);
    setShowError(false);
  };
  const onSkip = () => {
    // Optional field: leave blank (approved skip), then continue to Review.
    set(step.draftKey, "");
    setShowError(false);
    setStepIndex((i) => i + 1);
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
        <h3 className="onboarding-panel__welcome-title" ref={headingRef} tabIndex={-1}>
          {step.title}
        </h3>
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
        <button type="button" className="goal-btn goal-btn--primary" onClick={onContinue}>
          {ONBOARDING_CONTINUE}
        </button>
      </div>
    </aside>
  );
}

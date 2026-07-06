/**
 * OnboardingPanel — the Smith AI conversational onboarding (Gemini-style chat),
 * implementing the approved handoff transcript in
 * `docs/onboarding-conversation-handoff.md` via `state/onboardingScript.ts`.
 *
 *  - Disconnected: Smith introduces himself as your AI financial planner and
 *    invites you to connect your wallet (or try Demo Mode).
 *  - Connected + goal incomplete: a scripted chat. Smith acknowledges the
 *    connection, then asks one question at a time. Each Smith message is TYPED out
 *    (typewriter) with the sparkle avatar and no bubble; it echoes the user's real
 *    answers back (goal, horizon, risk, income, expenses, rhythm, saving) and one
 *    trivial derived figure (available = income − expenses). Users answer with
 *    Choice Chips or a currency input + Send; answers appear as user bubbles. Undo
 *    and Restart are in the header. It ends with a plan summary and a guided tour
 *    (Open Portfolio → Open Goal → Finish), driven by the parent via onTour.
 *
 * DETERMINISTIC / SCRIPTED — no live AI, no API call, no invented guidance, no
 * projection/allocation recomputation. Choice options are the canonical Goal
 * Settings values. Validation, savedGoal, and goalCompleted behavior are
 * unchanged; on Finish the answers are committed to the same local savedGoal (via
 * onComplete). Nothing here recalculates the Dashboard, suggestions, Top Pick,
 * Safety Buffer, projections, allocation, or protocol decisions. No wallet
 * signature, transaction, fund movement, or secret request.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import OnboardingProgress from "./OnboardingProgress";
import OnboardingMessage from "./OnboardingMessage";
import SmithTypingIndicator from "./SmithTypingIndicator";
import SmithInitialLoadingState from "./SmithInitialLoadingState";
import ButtonIcon from "./ButtonIcon";
import { sessionFlags } from "../state/sessionFlags";
import { useReducedMotion } from "./useReducedMotion";
import { useTypewriter } from "./useTypewriter";
import arrowUpUrl from "../../../assets/icons/ui/arrow-up.svg";
import undoUrl from "../../../assets/icons/ui/undo.svg";
import moreUrl from "../../../assets/icons/ui/more.svg";
import rotateCcwUrl from "../../../assets/icons/ui/rotate-ccw.svg";
import {
  ONBOARDING_PANEL_LABEL,
  ONBOARDING_SAVING_OPTIONAL,
  ONBOARDING_SEND,
  ONBOARDING_UNDO,
  ONBOARDING_MORE,
  ONBOARDING_RESTART,
  CONNECT_WALLET_LABEL,
} from "../state/approvedCopy";
import {
  SCRIPT_WELCOME,
  SCRIPT_CONNECTED,
  SCRIPT_OPEN_PORTFOLIO,
  SCRIPT_OPEN_GOAL,
  SCRIPT_FINISH_ONBOARDING,
  SCRIPT_FINISH_SETUP,
  SCRIPT_PORTFOLIO_TOUR,
  stepLeadMessage,
  summaryMessage,
  goalTourMessage,
  type MessageBlock,
} from "../state/onboardingScript";
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
import { labelFor } from "../state/goalState";
import type { SavedGoal } from "../types/goal";

interface Props {
  mode: "disconnected" | "connected";
  onConnectWallet: () => void;
  /** Undo at the first connected question disconnects (reverses Connect Wallet). */
  onDisconnect: () => void;
  onComplete: (savedGoal: SavedGoal) => void;
  /** Start the end-of-onboarding Portfolio/Goal tour with the collected answers. */
  onTour: (answers: OnboardingAnswers) => void;
  /** Tour stage (null outside the tour) + control to advance it. */
  tourStage: "portfolio" | "goal" | null;
  /** Previewed plan during the tour (reflects any Goal-form edits). */
  tourGoal: SavedGoal | null;
  onSetTourStage: (stage: "portfolio" | "goal" | null) => void;
}

const QUESTION_ID = "onb-question";
const HELPER_ID = "onb-field-helper";
const ERROR_ID = "onb-field-error";

type FieldStep = (typeof GOAL_SETUP_STEPS)[number];

/** Display a currency answer as "$X,XXX", or an em dash when blank. */
function money(raw: string): string {
  const t = raw.trim().replace(/[$,\s]/g, "");
  if (t === "") return "—";
  const n = Number(t);
  return Number.isFinite(n) ? `$${n.toLocaleString()}` : "—";
}

/** The user's answer for a completed step, shown in the user bubble. */
function answerDisplay(step: FieldStep, answers: OnboardingAnswers): string {
  const value = answers[step.draftKey];
  return step.fieldType === "select" ? labelFor(step.options!, value) : money(value);
}

/** Render a structured Smith message (paragraphs + bold-labelled bullet lists)
 *  directly on the panel surface — no bubble, no HTML injection. */
function renderBlocks(blocks: MessageBlock[]) {
  return blocks.map((block, i) =>
    block.type === "p" ? (
      <p key={i} className="chat-question">
        {block.text}
      </p>
    ) : (
      <ul key={i} className="onboarding-msg-bullets">
        {block.items.map((item, j) => (
          <li key={j} className="onboarding-msg-bullets__item">
            <strong className="onboarding-msg-bullets__label">{item.label}</strong> —{" "}
            {item.text}
          </li>
        ))}
      </ul>
    )
  );
}

export default function OnboardingPanel({
  mode,
  onConnectWallet,
  onDisconnect,
  onComplete,
  onTour,
  tourStage,
  tourGoal,
  onSetTourStage,
}: Props) {
  const reduced = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(initialOnboardingAnswers);
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState<string | undefined>(undefined);
  // Skip the typewriter for a step reached via Undo (show it in full).
  const [skipType, setSkipType] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // First-open Smith AI loading beat (once per session, not per step/remount).
  const [intro, setIntro] = useState(() => !sessionFlags.onboardingIntroShown);
  const finishIntro = () => {
    sessionFlags.onboardingIntroShown = true;
    setIntro(false);
  };
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // During the tour, commit the previewed plan (which reflects any Goal-form
  // edits); before the tour there is no tourGoal, so build from the answers.
  const finishGoal = () => tourGoal ?? buildSavedGoal(answers);

  const isSummary = stepIndex === GOAL_SETUP_STEPS.length;
  const currentStep: FieldStep | null = isSummary ? null : GOAL_SETUP_STEPS[stepIndex];
  const rawMessage =
    tourStage === "portfolio"
      ? SCRIPT_PORTFOLIO_TOUR
      : tourStage === "goal"
        ? goalTourMessage(answers)
        : isSummary
          ? summaryMessage(answers)
          : stepLeadMessage(stepIndex, answers);

  // Structured (tour) messages render immediately as formatted content; plain
  // string messages are typed out with the typewriter.
  const structured = Array.isArray(rawMessage);
  const textMessage = structured ? "" : (rawMessage as string);
  const typeEnabled = !reduced && !skipType && !structured;
  const { shown: typedMessage, done: titleDone } = useTypewriter(textMessage, typeEnabled);
  const writing = !structured && !titleDone;

  // Keep the transcript scrolled to the newest message as it types/advances.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [stepIndex, typedMessage]);

  // When a currency question finishes, focus the input so the user can type.
  useEffect(() => {
    if (mode === "connected" && titleDone && currentStep?.fieldType === "currency") {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [titleDone, stepIndex, mode, currentStep?.fieldType]);

  const advance = () => {
    setStepIndex((i) => i + 1);
    setSkipType(false);
    setInputValue("");
    setInputError(undefined);
  };
  const answerSelect = (value: string) => {
    if (!currentStep) return;
    setAnswers((a) => ({ ...a, [currentStep.draftKey]: value }));
    advance();
  };
  const sendAmount = () => {
    if (!currentStep) return;
    const err = stepError(currentStep, inputValue);
    if (err) {
      setInputError(err);
      return;
    }
    setAnswers((a) => ({ ...a, [currentStep.draftKey]: inputValue }));
    advance();
  };
  const undo = () => {
    // During the tour, Undo steps back through the tour: Goal → Portfolio →
    // back to the plan summary.
    if (tourStage === "goal") {
      onSetTourStage("portfolio");
      return;
    }
    if (tourStage === "portfolio") {
      setSkipType(true);
      onSetTourStage(null);
      return;
    }
    // At the first connected question, Undo reverses the wallet connection.
    if (stepIndex === 0) {
      onDisconnect();
      return;
    }
    const prev = stepIndex - 1;
    const prevStep = GOAL_SETUP_STEPS[prev];
    setAnswers((a) => ({
      ...a,
      [prevStep.draftKey]:
        prevStep.fieldType === "currency" ? "" : initialOnboardingAnswers[prevStep.draftKey],
    }));
    setStepIndex(prev);
    setSkipType(true);
    setInputValue("");
    setInputError(undefined);
  };

  const closeMenu = (refocus: boolean) => {
    setMenuOpen(false);
    if (refocus) moreRef.current?.focus();
  };
  // Restart Onboarding: clear all answers and return to the first question
  // (re-typed from the top). Does not disconnect the wallet or touch the
  // Dashboard/savedGoal — onboarding only commits on Finish.
  const restart = () => {
    setAnswers(initialOnboardingAnswers);
    setStepIndex(0);
    setSkipType(false);
    setInputValue("");
    setInputError(undefined);
    onSetTourStage(null);
    closeMenu(false);
  };

  // Close the More menu on outside pointerdown; focus the item when it opens.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !moreRef.current?.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  // ---- First-open loading beat (before any onboarding content) --------------
  if (intro) {
    return (
      <aside className="onboarding-panel" aria-label={ONBOARDING_PANEL_LABEL}>
        <div className="onboarding-panel__header">
          <h2 className="onboarding-panel__title">{ONBOARDING_PANEL_LABEL}</h2>
        </div>
        <SmithInitialLoadingState onComplete={finishIntro} />
      </aside>
    );
  }

  // ---- Disconnected: Smith intro + wallet/demo entry ------------------------
  if (mode === "disconnected") {
    return (
      <aside className="onboarding-panel" aria-label={ONBOARDING_PANEL_LABEL}>
        <div className="onboarding-panel__header">
          <h2 className="onboarding-panel__title">{ONBOARDING_PANEL_LABEL}</h2>
        </div>
        <OnboardingProgress current={1} total={ONBOARDING_TOTAL_STEPS} />
        <div className="onboarding-panel__body onboarding-chat">
          <OnboardingMessage>
            <p className="chat-question">{SCRIPT_WELCOME}</p>
          </OnboardingMessage>
        </div>
        <div className="onboarding-chat__input">
          <div className="onboarding-panel__actions">
            <button type="button" className="goal-btn goal-btn--primary" onClick={onConnectWallet}>
              {CONNECT_WALLET_LABEL}
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // ---- Connected chat: scripted goal-setup + plan summary -------------------
  const progressCurrent = isSummary ? stepOrdinal("review") : stepOrdinal(currentStep!.id);
  const sendDisabled =
    !titleDone ||
    (!!currentStep && !currentStep.optional && inputValue.trim() === "");
  const planValid = requiredFieldsValid(answers);

  return (
    <aside className="onboarding-panel" aria-label={ONBOARDING_PANEL_LABEL}>
      <div className="onboarding-panel__header">
        <h2 className="onboarding-panel__title">{ONBOARDING_PANEL_LABEL}</h2>
        <div
          className="onboarding-panel__header-actions"
          onKeyDown={(e) => {
            if (e.key === "Escape" && menuOpen) {
              e.preventDefault();
              closeMenu(true);
            }
          }}
        >
          <button
            type="button"
            className="onboarding-undo"
            aria-label={ONBOARDING_UNDO}
            data-tooltip={ONBOARDING_UNDO}
            onClick={undo}
          >
            <ButtonIcon src={undoUrl} size={18} />
          </button>
          <div className="onboarding-more">
            <button
              ref={moreRef}
              type="button"
              className="onboarding-undo onboarding-more__btn"
              aria-label={ONBOARDING_MORE}
              data-tooltip={ONBOARDING_MORE}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <ButtonIcon src={moreUrl} size={18} />
            </button>
            {menuOpen && (
              <div ref={menuRef} className="onboarding-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="onboarding-menu__item"
                  onClick={restart}
                >
                  <ButtonIcon src={rotateCcwUrl} size={18} />
                  <span>{ONBOARDING_RESTART}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <OnboardingProgress current={progressCurrent} total={ONBOARDING_TOTAL_STEPS} />

      <div className="onboarding-panel__body onboarding-chat" ref={bodyRef}>
        {/* Smith acknowledges the connection first — a safe "wallet connected"
            opener (no claim wallet data was fetched/analyzed). Static opener. */}
        <OnboardingMessage>
          <p className="chat-question">{SCRIPT_CONNECTED}</p>
        </OnboardingMessage>

        {/* Answered turns: Smith's scripted message + the user's reply bubble. */}
        {GOAL_SETUP_STEPS.slice(0, stepIndex).map((s, i) => (
          <div className="chat-turn" key={`turn-${i}`}>
            <OnboardingMessage>
              <p className="chat-question">{stepLeadMessage(i, answers)}</p>
            </OnboardingMessage>
            <div className="chat-user">
              <div className="chat-user__bubble">{answerDisplay(s, answers)}</div>
            </div>
          </div>
        ))}

        {/* Current Smith message — typed plain text, or structured (paragraphs +
            bullet lists) rendered directly on the surface for long tour messages. */}
        <div className="chat-turn">
          <OnboardingMessage>
            {structured ? (
              <div className="onboarding-rich" id={QUESTION_ID}>
                {renderBlocks(rawMessage as MessageBlock[])}
              </div>
            ) : (
              <p className="chat-question" id={QUESTION_ID}>
                {typedMessage}
                {writing && <span className="chat-caret" aria-hidden="true" />}
              </p>
            )}
            {writing && <SmithTypingIndicator />}
          </OnboardingMessage>
        </div>
      </div>

      {/* Bottom input area — tour actions, quick replies, amount input, or the
          plan-summary hand-off. */}
      <div className="onboarding-chat__input">
        {tourStage === "portfolio" ? (
          <div className="onboarding-tour-actions">
            <button
              type="button"
              className="goal-btn goal-btn--primary"
              onClick={() => onSetTourStage("goal")}
            >
              {SCRIPT_OPEN_GOAL}
            </button>
            <button
              type="button"
              className="goal-btn goal-btn--secondary"
              onClick={() => onComplete(finishGoal())}
            >
              {SCRIPT_FINISH_ONBOARDING}
            </button>
          </div>
        ) : tourStage === "goal" ? (
          <div className="onboarding-tour-actions">
            <button
              type="button"
              className="goal-btn goal-btn--primary"
              onClick={() => onComplete(finishGoal())}
            >
              {SCRIPT_FINISH_SETUP}
            </button>
          </div>
        ) : isSummary ? (
          <div className="onboarding-tour-actions">
            <button
              type="button"
              className="goal-btn goal-btn--primary"
              onClick={() => onTour(answers)}
              disabled={!planValid || !titleDone}
            >
              {SCRIPT_OPEN_PORTFOLIO}
            </button>
            <button
              type="button"
              className="goal-btn goal-btn--secondary"
              onClick={() => onComplete(buildSavedGoal(answers))}
              disabled={!planValid}
            >
              {SCRIPT_FINISH_ONBOARDING}
            </button>
          </div>
        ) : currentStep!.fieldType === "select" ? (
          <div className="choice-chip-group" role="group" aria-labelledby={QUESTION_ID}>
            {currentStep!.options!.map((o) => (
              <button
                key={o.value}
                type="button"
                className="choice-chip"
                onClick={() => answerSelect(o.value)}
                disabled={!titleDone}
              >
                {o.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="chat-input">
            <label className="sr-only" htmlFor="onb-amount">
              {currentStep!.fieldLabel}
              {currentStep!.optional ? ` (${ONBOARDING_SAVING_OPTIONAL})` : ""}
            </label>
            <div className="chat-input__row">
              <div className="goal-currency chat-input__field">
                <span className="goal-currency__prefix" aria-hidden="true">
                  $
                </span>
                <input
                  id="onb-amount"
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className="goal-input goal-currency__input"
                  placeholder={currentStep!.placeholder}
                  value={inputValue}
                  disabled={!titleDone}
                  aria-labelledby={QUESTION_ID}
                  aria-describedby={inputError ? `${HELPER_ID} ${ERROR_ID}` : HELPER_ID}
                  aria-invalid={inputError ? true : undefined}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    if (inputError) setInputError(undefined);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !sendDisabled) {
                      e.preventDefault();
                      sendAmount();
                    }
                  }}
                />
              </div>
              <button
                type="button"
                className="chat-input__send"
                aria-label={ONBOARDING_SEND}
                onClick={sendAmount}
                disabled={sendDisabled}
              >
                <ButtonIcon src={arrowUpUrl} size={18} />
              </button>
            </div>
            <p className="goal-field__helper" id={HELPER_ID}>
              {currentStep!.helper}
            </p>
            {inputError && (
              <p className="goal-field__error" id={ERROR_ID} role="alert">
                {inputError}
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

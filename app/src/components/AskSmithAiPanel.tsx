/**
 * AskSmithAiPanel — Ask Smith AI presented as a chat with Smith AI (Gemini-style),
 * matching the onboarding conversation (patterns/onboarding-with-smith-ai.md,
 * components/smith-ai-typing-indicator.md) — minus the progress bar and Undo.
 *
 * Smith's replies are TYPED out (typewriter) beside the sparkle avatar with no
 * chat bubble; the user's questions appear as right-aligned bubbles. The approved
 * suggested prompts are quick-reply Choice Chips (same compact chips as
 * onboarding); a free-text field + Send button lets the user ask anything else.
 *
 * Explain-only, mode-agnostic shell: all copy comes from the injected `content`
 * (built by the caller from approved fixtures — connected or demo). There is NO
 * live generation: suggested prompts map to approved responses, and any other
 * input returns the approved fallback. No recommendation creation, no Top Pick or
 * protocol selection, no execution of any kind.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { SmithAiContent } from "../types/dashboard";
import OnboardingMessage from "./OnboardingMessage";
import SmithTypingIndicator from "./SmithTypingIndicator";
import SmithInitialLoadingState from "./SmithInitialLoadingState";
import ConfirmDialog from "./ConfirmDialog";
import ButtonIcon from "./ButtonIcon";
import { useReducedMotion } from "./useReducedMotion";
import { useIsMobileViewport } from "./useIsMobileViewport";
import { useScrollLock } from "./useScrollLock";
import { useTypewriter } from "./useTypewriter";
import { sessionFlags } from "../state/sessionFlags";
import {
  SMITH_CLOSE_LABEL,
  SMITH_CLOSE_TOOLTIP,
  SMITH_MORE,
  SMITH_CLEAR_HISTORY,
  SMITH_SEND_FEEDBACK,
  SMITH_FEEDBACK_HELPFUL,
  SMITH_FEEDBACK_NOT_HELPFUL,
  SMITH_FEEDBACK_BACK,
  SMITH_FEEDBACK_SUBTITLE,
  SMITH_FEEDBACK_RATING_LABEL,
  SMITH_FEEDBACK_MESSAGE_LABEL,
  SMITH_FEEDBACK_MESSAGE_ERROR,
  SMITH_FEEDBACK_NOTE,
  SMITH_FEEDBACK_SENT_TOAST,
  SMITH_CLEAR_CONFIRM_TITLE,
  SMITH_CLEAR_CONFIRM_BODY,
  SMITH_CLEAR_CONFIRM_CANCEL,
  SMITH_HISTORY_CLEARED_TOAST,
  SMITH_SAFETY_NOTE,
  ONBOARDING_SEND,
} from "../state/approvedCopy";
import closeUrl from "../../../assets/icons/ui/close.svg";
import moreUrl from "../../../assets/icons/ui/more.svg";
import chevronLeftUrl from "../../../assets/icons/ui/chevron-left.svg";
import arrowUpUrl from "../../../assets/icons/ui/arrow-up.svg";
import brushCleaningUrl from "../../../assets/icons/ui/brush-cleaning.svg";
import messageCircleUrl from "../../../assets/icons/ui/message-circle.svg";
import thumbsUpUrl from "../../../assets/icons/ui/thumbs-up.svg";
import thumbsDownUrl from "../../../assets/icons/ui/thumbs-down.svg";
import { capture } from "../analytics/analytics";

interface Entry {
  prompt: string | null;
  response: string;
}

interface Props {
  content: SmithAiContent;
  onClose: () => void;
  /** Show the approved toast after a confirmed Clear History. */
  pushToast?: (message: string, helper?: string) => void;
}

export default function AskSmithAiPanel({ content, onClose, pushToast }: Props) {
  const reduced = useReducedMotion();
  // Mounting the panel IS opening it — every caller renders it conditionally.
  // Guarded with a ref because StrictMode double-invokes mount effects in dev, and
  // an inflated "did they open Smith AI" count is exactly the kind of quiet error
  // that survives into a decision.
  const openCaptured = useRef(false);
  useEffect(() => {
    if (openCaptured.current) return;
    openCaptured.current = true;
    capture({ name: "smith_ai_opened" });
  }, []);
  // On mobile (<1280px) the panel covers the viewport, so lock background scroll
  // while it's open. On desktop it's a side panel — the page scrolls as usual.
  useScrollLock(useIsMobileViewport());
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const messageId = useId();
  const messageErrorId = `${messageId}-error`;
  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  // Which panel view is showing: the chat, or the Send Feedback sub-page.
  const [view, setView] = useState<"chat" | "feedback">("chat");
  // Send Feedback sub-page draft (sentiment + message). Explain-only; never sent.
  const [feedbackRating, setFeedbackRating] = useState<"up" | "down" | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  // Show the "message required" error only after a submit attempt.
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  // A surface may open with no message at all (content.opener === ""): the panel
  // then starts on an empty transcript and the suggested prompts carry the
  // orientation. Seeding a blank entry instead would render an empty message row
  // with Smith's avatar and feedback controls attached to nothing.
  const [entries, setEntries] = useState<Entry[]>(
    content.opener ? [{ prompt: null, response: content.opener }] : []
  );
  // First-open Smith AI loading beat (once per session, not on every reopen).
  const [intro, setIntro] = useState(() => !sessionFlags.smithAiIntroShown);
  const finishIntro = () => {
    sessionFlags.smithAiIntroShown = true;
    setIntro(false);
  };

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Only the newest reply types; earlier turns are shown in full.
  const lastIndex = entries.length - 1;
  const { shown: typedResponse, done } = useTypewriter(entries[lastIndex]?.response ?? "", !reduced);
  const writing = !done;

  // Keep the transcript pinned to the newest message as it types/advances.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, typedResponse]);

  const answer = (prompt: string, kind: "chip" | "free_text") => {
    const matched = content.responses[prompt];
    const response = matched ?? content.fallback;
    setEntries((prev) => [...prev, { prompt, response }]);
    capture({ name: "smith_ai_message", kind });
    // A fallback means the product could not answer what was asked. The question
    // itself is the clearest statement of that gap, so it is the one event allowed
    // to carry typed text — and only for free text, since a chip always matches.
    if (!matched && kind === "free_text") {
      capture({ name: "smith_ai_fallback", question: prompt });
    }
  };

  const send = () => {
    const q = input.trim();
    if (!q || writing) return;
    answer(q, "free_text");
    setInput("");
  };

  const sendDisabled = writing || input.trim() === "";

  const closeMenu = (refocus: boolean) => {
    setMenuOpen(false);
    if (refocus) moreRef.current?.focus();
  };
  // Clear History: confirm first (destructive, not restorable), then reset the
  // conversation to Smith's opener (shown in full), drop any per-message ratings
  // and the draft, and show the approved toast. Explain-only, purely local.
  const askClearHistory = () => {
    closeMenu(false);
    setConfirmClear(true);
  };
  const cancelClear = () => {
    setConfirmClear(false);
    moreRef.current?.focus();
  };
  const confirmClearHistory = () => {
    setEntries(content.opener ? [{ prompt: null, response: content.opener }] : []);
    setInput("");
    setConfirmClear(false);
    pushToast?.(SMITH_HISTORY_CLEARED_TOAST);
    moreRef.current?.focus();
  };

  // Send Feedback sub-page: opened from the More menu (no pre-selected sentiment)
  // or from a message thumb (that sentiment pre-selected). Explain-only.
  const openFeedback = (rating: "up" | "down" | null) => {
    setFeedbackRating(rating);
    setFeedbackMessage("");
    setFeedbackSubmitted(false);
    setView("feedback");
  };
  const backToChat = () => {
    setView("chat");
    setFeedbackRating(null);
    setFeedbackMessage("");
    setFeedbackSubmitted(false);
    moreRef.current?.focus();
  };
  const messageError = feedbackMessage.trim() === "" ? SMITH_FEEDBACK_MESSAGE_ERROR : undefined;
  const showMessageError = feedbackSubmitted && !!messageError;
  const submitFeedback = () => {
    setFeedbackSubmitted(true);
    if (messageError) {
      messageRef.current?.focus();
      return;
    }
    // Stub: no network, no email, no ticket — matches the prototype's Contact Us.
    pushToast?.(SMITH_FEEDBACK_SENT_TOAST);
    backToChat();
  };
  const openFeedbackFromMenu = () => {
    closeMenu(false);
    openFeedback(null);
  };

  // Focus the back control when the Send Feedback sub-page opens.
  useEffect(() => {
    if (view === "feedback") backRef.current?.focus();
  }, [view]);

  // Close the More menu on outside pointerdown; focus the first item when it opens.
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

  return (
    <aside
      className="smith-panel"
      aria-label={content.panelLabel}
      onKeyDown={
        view === "feedback"
          ? (e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                backToChat();
              }
            }
          : undefined
      }
    >
      {view === "feedback" ? (
        <>
          <div className="smith-panel__header">
            <div className="smith-panel__header-lead">
              <button
                ref={backRef}
                type="button"
                className="onboarding-undo"
                aria-label={SMITH_FEEDBACK_BACK}
                data-tooltip={SMITH_FEEDBACK_BACK}
                onClick={backToChat}
              >
                <ButtonIcon src={chevronLeftUrl} size={18} />
              </button>
              <h2 className="smith-panel__title">{SMITH_SEND_FEEDBACK}</h2>
            </div>
            <button
              type="button"
              className="onboarding-undo"
              aria-label={SMITH_CLOSE_LABEL}
              data-tooltip={SMITH_CLOSE_TOOLTIP}
              onClick={onClose}
            >
              <ButtonIcon src={closeUrl} size={18} />
            </button>
          </div>

          <div className="smith-panel__feedback-page">
            <p className="smith-panel__feedback-subtitle">{SMITH_FEEDBACK_SUBTITLE}</p>
            <div
              className="smith-panel__feedback-rating"
              role="group"
              aria-label={SMITH_FEEDBACK_RATING_LABEL}
            >
              <button
                type="button"
                className="smith-panel__rating-btn"
                aria-label={SMITH_FEEDBACK_HELPFUL}
                aria-pressed={feedbackRating === "up"}
                onClick={() => setFeedbackRating((r) => (r === "up" ? null : "up"))}
              >
                <ButtonIcon src={thumbsUpUrl} size={16} />
              </button>
              <button
                type="button"
                className="smith-panel__rating-btn"
                aria-label={SMITH_FEEDBACK_NOT_HELPFUL}
                aria-pressed={feedbackRating === "down"}
                onClick={() => setFeedbackRating((r) => (r === "down" ? null : "down"))}
              >
                <ButtonIcon src={thumbsDownUrl} size={16} />
              </button>
            </div>
            <div className="smith-panel__feedback-field">
              <label className="smith-panel__feedback-label" htmlFor={messageId}>
                {SMITH_FEEDBACK_MESSAGE_LABEL}
              </label>
              <textarea
                ref={messageRef}
                id={messageId}
                className="smith-panel__feedback-textarea"
                rows={3}
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                aria-invalid={showMessageError ? true : undefined}
                aria-describedby={showMessageError ? messageErrorId : undefined}
              />
              {showMessageError && (
                <p className="goal-field__error" id={messageErrorId} role="alert">
                  {messageError}
                </p>
              )}
            </div>
            <button
              type="button"
              className="goal-btn goal-btn--primary smith-panel__feedback-submit"
              onClick={submitFeedback}
            >
              {SMITH_SEND_FEEDBACK}
            </button>
            <p className="smith-panel__feedback-note">{SMITH_FEEDBACK_NOTE}</p>
          </div>
        </>
      ) : (
        <>
      <div className="smith-panel__header">
        <h2 className="smith-panel__title">Ask Smith AI</h2>
        <div
          className="onboarding-panel__header-actions"
          onKeyDown={(e) => {
            if (e.key === "Escape" && menuOpen) {
              e.preventDefault();
              closeMenu(true);
            }
          }}
        >
          <div className="onboarding-more">
            <button
              ref={moreRef}
              type="button"
              className="onboarding-undo onboarding-more__btn"
              aria-label={SMITH_MORE}
              data-tooltip={SMITH_MORE}
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
                  onClick={askClearHistory}
                >
                  <ButtonIcon src={brushCleaningUrl} size={18} />
                  <span>{SMITH_CLEAR_HISTORY}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="onboarding-menu__item"
                  onClick={openFeedbackFromMenu}
                >
                  <ButtonIcon src={messageCircleUrl} size={18} />
                  <span>{SMITH_SEND_FEEDBACK}</span>
                </button>
              </div>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            className="onboarding-undo"
            aria-label={SMITH_CLOSE_LABEL}
            data-tooltip={SMITH_CLOSE_TOOLTIP}
            onClick={onClose}
          >
            <ButtonIcon src={closeUrl} size={18} />
          </button>
        </div>
      </div>

      {intro ? (
        <SmithInitialLoadingState onComplete={finishIntro} />
      ) : (
        <>
      <div className="smith-panel__entries" ref={bodyRef}>
        {entries.map((entry, i) => {
          const isLast = i === lastIndex;
          return (
            <div key={i} className="chat-turn">
              {entry.prompt && (
                <div className="chat-user">
                  <div className="chat-user__bubble">{entry.prompt}</div>
                </div>
              )}
              <OnboardingMessage>
                <p className="chat-question">
                  {isLast ? typedResponse : entry.response}
                  {isLast && writing && <span className="chat-caret" aria-hidden="true" />}
                </p>
                {isLast && writing && <SmithTypingIndicator />}
                {/* Like / dislike appear under a REPLY once it has finished;
                    selecting one opens the Send Feedback sub-page, pre-rated.
                    The opener (the only entry with no prompt) is a greeting, not
                    an answer to anything, so there is nothing to rate about it. */}
                {entry.prompt !== null && (!isLast || done) && (
                  <div className="smith-panel__feedback">
                    <button
                      type="button"
                      className="smith-panel__feedback-btn"
                      aria-label={SMITH_FEEDBACK_HELPFUL}
                      data-tooltip={SMITH_FEEDBACK_HELPFUL}
                      onClick={() => openFeedback("up")}
                    >
                      <img src={thumbsUpUrl} alt="" width={16} height={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="smith-panel__feedback-btn"
                      aria-label={SMITH_FEEDBACK_NOT_HELPFUL}
                      data-tooltip={SMITH_FEEDBACK_NOT_HELPFUL}
                      onClick={() => openFeedback("down")}
                    >
                      <img src={thumbsDownUrl} alt="" width={16} height={16} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </OnboardingMessage>
            </div>
          );
        })}
      </div>

      {/* Reply controls: quick-reply chips and a free-text ask. */}
      <div className="smith-panel__replies">
        <div className="choice-chip-group">
          {content.prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="choice-chip"
              onClick={() => answer(prompt, "chip")}
              disabled={writing}
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="chat-input">
          <label className="sr-only" htmlFor="smith-ask">
            {content.entryLabel}
          </label>
          <div className="chat-input__row">
            <input
              id="smith-ask"
              className="smith-panel__input chat-input__field"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !sendDisabled) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={content.entryLabel}
              aria-label={content.entryLabel}
            />
            <button
              type="button"
              className="chat-input__send"
              aria-label={ONBOARDING_SEND}
              onClick={send}
              disabled={sendDisabled}
            >
              <ButtonIcon src={arrowUpUrl} size={18} />
            </button>
          </div>
        </div>
      </div>

      <p className="smith-panel__safety-note">{SMITH_SAFETY_NOTE}</p>
        </>
      )}
        </>
      )}

      {confirmClear && (
        <ConfirmDialog
          title={SMITH_CLEAR_CONFIRM_TITLE}
          body={SMITH_CLEAR_CONFIRM_BODY}
          cancelLabel={SMITH_CLEAR_CONFIRM_CANCEL}
          confirmLabel={SMITH_CLEAR_HISTORY}
          onCancel={cancelClear}
          onConfirm={confirmClearHistory}
          danger
        />
      )}
    </aside>
  );
}

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
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { SmithAiContent } from "../types/dashboard";
import OnboardingMessage from "./OnboardingMessage";
import SmithTypingIndicator from "./SmithTypingIndicator";
import SmithInitialLoadingState from "./SmithInitialLoadingState";
import ButtonIcon from "./ButtonIcon";
import { useReducedMotion } from "./useReducedMotion";
import { useTypewriter } from "./useTypewriter";
import { sessionFlags } from "../state/sessionFlags";
import { SMITH_CLOSE_LABEL, SMITH_SAFETY_NOTE, ONBOARDING_SEND } from "../state/approvedCopy";
import closeUrl from "../../../assets/icons/ui/close.svg";
import arrowUpUrl from "../../../assets/icons/ui/arrow-up.svg";
import thumbsUpUrl from "../../../assets/icons/ui/thumbs-up.svg";
import thumbsDownUrl from "../../../assets/icons/ui/thumbs-down.svg";

interface Entry {
  prompt: string | null;
  response: string;
}

interface Props {
  content: SmithAiContent;
  onClose: () => void;
}

export default function AskSmithAiPanel({ content, onClose }: Props) {
  const reduced = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [entries, setEntries] = useState<Entry[]>([
    { prompt: null, response: content.opener },
  ]);
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
  const { shown: typedResponse, done } = useTypewriter(entries[lastIndex].response, !reduced);
  const writing = !done;

  // Keep the transcript pinned to the newest message as it types/advances.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, typedResponse]);

  const answer = (prompt: string) => {
    const response = content.responses[prompt] ?? content.fallback;
    setEntries((prev) => [...prev, { prompt, response }]);
  };

  const send = () => {
    const q = input.trim();
    if (!q || writing) return;
    answer(q);
    setInput("");
  };

  const sendDisabled = writing || input.trim() === "";

  return (
    <aside className="smith-panel" aria-label={content.panelLabel}>
      <div className="smith-panel__header">
        <h2 className="smith-panel__title">Ask Smith AI</h2>
        <button
          ref={closeRef}
          type="button"
          className="smith-panel__close"
          aria-label={SMITH_CLOSE_LABEL}
          onClick={onClose}
        >
          <img src={closeUrl} alt="" width={16} height={16} aria-hidden="true" />
        </button>
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
              </OnboardingMessage>
            </div>
          );
        })}
      </div>

      {/* Reply controls: feedback, quick-reply chips, and a free-text ask. */}
      <div className="smith-panel__replies">
        <div className="smith-panel__feedback">
          <button
            type="button"
            className="smith-panel__feedback-btn"
            aria-label="Helpful"
            aria-pressed={feedback === "up"}
            onClick={() => setFeedback(feedback === "up" ? null : "up")}
          >
            <img src={thumbsUpUrl} alt="" width={16} height={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="smith-panel__feedback-btn"
            aria-label="Not helpful"
            aria-pressed={feedback === "down"}
            onClick={() => setFeedback(feedback === "down" ? null : "down")}
          >
            <img src={thumbsDownUrl} alt="" width={16} height={16} aria-hidden="true" />
          </button>
        </div>

        <div className="choice-chip-group">
          {content.prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="choice-chip"
              onClick={() => answer(prompt)}
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
    </aside>
  );
}

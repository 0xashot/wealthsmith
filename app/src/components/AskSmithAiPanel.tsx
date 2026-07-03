/**
 * AskSmithAiPanel — Ask Smith AI right-panel shell per
 * patterns/dashboard-layout.md (Mode 3) and rules/smith-ai-rules.md.
 *
 * Explain-only, mode-agnostic shell: all copy comes from the injected
 * `content` (built by the caller from approved fixtures — connected or demo).
 * There is NO live generation: suggested prompts map to approved responses,
 * and any other input returns the approved fallback. No recommendation
 * creation, no Top Pick or protocol selection, no execution of any kind.
 */
import { useEffect, useRef, useState } from "react";
import type { SmithAiContent } from "../types/dashboard";
import { SMITH_CLOSE_LABEL, SMITH_SAFETY_NOTE } from "../state/approvedCopy";
import closeUrl from "../../../assets/icons/ui/close.svg";
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
  const closeRef = useRef<HTMLButtonElement>(null);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [entries, setEntries] = useState<Entry[]>([
    { prompt: null, response: content.opener },
  ]);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const answer = (prompt: string) => {
    const response = content.responses[prompt] ?? content.fallback;
    setEntries((prev) => [...prev, { prompt, response }]);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    answer(q);
    setInput("");
  };

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

      <div className="smith-panel__entries" aria-live="polite">
        {entries.map((entry, i) => (
          <div key={i} className="smith-panel__entry">
            {entry.prompt && <p className="smith-panel__prompt">{entry.prompt}</p>}
            <p className="smith-panel__response">{entry.response}</p>
          </div>
        ))}
      </div>

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

      <div className="smith-panel__quick-actions">
        {content.prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="smith-panel__quick-action"
            onClick={() => answer(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      <form className="smith-panel__form" onSubmit={onSubmit}>
        <input
          className="smith-panel__input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={content.entryLabel}
          aria-label={content.entryLabel}
        />
      </form>

      <p className="smith-panel__safety-note">{SMITH_SAFETY_NOTE}</p>
    </aside>
  );
}

/**
 * AskSmithAiPanel — Ask Smith AI right-panel shell per
 * patterns/dashboard-layout.md (Mode 3) and rules/smith-ai-rules.md.
 *
 * Explain-only shell: every response shown here is fixture-approved static
 * copy. There is no live generation, no recommendation creation, no Top Pick
 * or protocol selection, and no execution of any kind.
 *
 * Response sources:
 * - Initial response + suggested prompts:
 *   examples/dashboard/dashboard-connected-wallet-state.json (smith_ai)
 * - Locked-yield prompt:
 *   examples/suggestions/suggestions-buffer-underfunded.json
 *   (locked_usdc_yield.smith_ai_explanation.approved_short_response)
 * - Jupiter handoff prompt:
 *   examples/protocol-handoffs/protocol-jupiter-swap.json
 *   (smith_ai_behavior.approved_response)
 * - Free-form input: approved uncertainty fallback from
 *   content/smith-ai-copy.md — never a generated answer.
 */
import { useEffect, useRef, useState } from "react";
import type { SmithAiState } from "../types/dashboard";
import { SMITH_CLOSE_LABEL, SMITH_FALLBACK, SMITH_SAFETY_NOTE } from "../state/approvedCopy";
import suggestionsFixture from "../../../examples/suggestions/suggestions-buffer-underfunded.json";
import protocolFixture from "../../../examples/protocol-handoffs/protocol-jupiter-swap.json";
import closeUrl from "../../../assets/icons/ui/close.svg";
import thumbsUpUrl from "../../../assets/icons/ui/thumbs-up.svg";
import thumbsDownUrl from "../../../assets/icons/ui/thumbs-down.svg";

interface Entry {
  prompt: string | null;
  response: string;
}

interface Props {
  smithAi: SmithAiState;
  panelLabel: string;
  onClose: () => void;
}

const lockedSuggestion = (suggestionsFixture as any).suggestions.find(
  (sugg: any) => sugg.id === "locked_usdc_yield"
);

export default function AskSmithAiPanel({ smithAi, panelLabel, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [entries, setEntries] = useState<Entry[]>([
    { prompt: null, response: smithAi.approved_sample_response },
  ]);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  /**
   * Fixture-approved responses only, keyed by the fixture's suggested
   * prompts. Anything else gets the approved uncertainty fallback.
   */
  const promptResponses: Record<string, string> = {
    "Why is Safety Buffer the Top Pick?": smithAi.approved_sample_response,
    "Why is the yield suggestion locked?":
      lockedSuggestion?.smith_ai_explanation?.approved_short_response ?? SMITH_FALLBACK,
    "What happens if I click Review on Jupiter?":
      (protocolFixture as any).smith_ai_behavior?.approved_response ?? SMITH_FALLBACK,
  };

  const answer = (prompt: string) => {
    const response = promptResponses[prompt] ?? SMITH_FALLBACK;
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
    <aside className="smith-panel" aria-label={panelLabel}>
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
        {smithAi.suggested_prompts.map((prompt) => (
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
          placeholder={smithAi.entry_label}
          aria-label={smithAi.entry_label}
        />
      </form>

      <p className="smith-panel__safety-note">{SMITH_SAFETY_NOTE}</p>
    </aside>
  );
}

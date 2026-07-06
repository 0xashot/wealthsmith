/**
 * useTypewriter — reveals `text` one character at a time (deterministic, local,
 * cleanup-safe). Used to type out Smith AI onboarding questions. When `enabled`
 * is false (reduced motion, or a step reached via Undo), the full text is shown
 * immediately. No network, no live AI.
 */
import { useEffect, useState } from "react";

const TICK_MS = 16;
const CHARS_PER_TICK = 2; // whole message is typed, so keep it snappy

export function useTypewriter(text: string, enabled: boolean): { shown: string; done: boolean } {
  const [count, setCount] = useState(enabled ? 0 : text.length);

  useEffect(() => {
    if (!enabled) {
      setCount(text.length);
      return;
    }
    setCount(0);
    let i = 0;
    const id = window.setInterval(() => {
      i = Math.min(text.length, i + CHARS_PER_TICK);
      setCount(i);
      if (i >= text.length) window.clearInterval(id);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [text, enabled]);

  return { shown: text.slice(0, count), done: count >= text.length };
}

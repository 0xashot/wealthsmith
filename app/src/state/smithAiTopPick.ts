/**
 * The one explanation of WHY a suggestion is the Top Pick, shared by every
 * surface that offers it.
 *
 * It lives here rather than in demoSmithAi.ts / realWalletSmithAi.ts so the two
 * cannot drift apart: the answer encodes a rule from the engine
 * (suggestions/topPick.ts + engine.ts), and a rule should not be restated in
 * two places where only one gets updated.
 *
 * Smith AI EXPLAINS (rules/financial-logic-boundaries.md). Nothing here selects
 * a Top Pick, ranks, or scores — it reads the card the engine already marked and
 * states the documented reason. No threshold or score is ever quoted.
 */
import type { SuggestionCardState } from "../types/dashboard";

/**
 * The CARD's category, not the engine's. toSuggestionCard.ts maps the engine
 * category `buffer` to the card category "safety_buffer" (that map is total over
 * every emitted category, and `buffer` is its only buffer-ish source). Testing
 * for "buffer" here silently never matches, which makes the branch below dead
 * and every answer claim the buffer is funded — including when the Top Pick is
 * literally "Top Up Your Safety Buffer".
 */
const BUFFER_CARD_CATEGORY = "safety_buffer";

/**
 * suggestions/topPick.ts ranks eligible suggestions by category priority with
 * `buffer` first, and engine.ts applies the Buffer Override: while the buffer is
 * under target the buffer suggestion is returned ALONE. So a buffer Top Pick
 * means the reserve needs funding, and any other Top Pick means it does not.
 *
 * `subject` is how the buffer is named to the reader — "the sample buffer" in
 * Demo Mode, "your Safety Buffer" for a connected wallet.
 */
export function topPickRationale(card: SuggestionCardState, subject: string): string {
  return card.category === BUFFER_CARD_CATEGORY
    ? `Safety Buffer is the highest-priority category, and ${subject} is below its target, ` +
        "so funding it comes before any yield opportunity."
    : "WealthSmith ranks suggestions by category priority, and Safety Buffer comes first. " +
        `${subject.charAt(0).toUpperCase()}${subject.slice(1)} is already fully funded, ` +
        "so the highest-priority remaining opportunity is selected.";
}

/** End a quoted engine fragment as a sentence without doubling its punctuation. */
export function asSentence(text: string): string {
  const t = text.trim();
  if (!t) return "";
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

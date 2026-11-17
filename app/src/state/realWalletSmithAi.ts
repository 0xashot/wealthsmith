/**
 * Connected-wallet Ask Smith AI content — DERIVED from the rail the page renders.
 *
 * There is NO live generation. Suggested prompts map to approved responses and
 * any other input returns the approved fallback; what is derived is WHICH
 * questions are offered and the Top Pick sentence, both read from the engine
 * output already on the page.
 *
 * WHY THIS IS DERIVED: this file used to be a static block written for an early
 * connected state in which nothing was priced and no suggestions existed. It
 * opened with "why some values aren’t shown yet" and offered "Why is there no
 * portfolio value?" and "Why aren’t there suggestions yet?" — questions that
 * assume a broken screen. A funded wallet now gets a priced portfolio and a full
 * suggestion rail, so those chips asked about problems the user did not have.
 * They are now offered ONLY in the states where they are true.
 *
 * Boundary unchanged (rules/financial-logic-boundaries.md): Smith AI EXPLAINS.
 * Nothing here selects a Top Pick, ranks, scores, prices, or invents a value.
 */
import {
  SMITH_FALLBACK,
  SMITH_INTRO_OPENER,
  REAL_WALLET_NO_FUNDS_NOTE,
  REAL_WALLET_VALUE_DESC,
  REAL_WALLET_SUGGESTIONS_DESC,
} from "./approvedCopy";
import { topPickRationale, asSentence } from "./smithAiTopPick";
import type { SmithAiContent, SuggestionCardState } from "../types/dashboard";

/**
 * Smith opens with the shared introduction (approvedCopy.SMITH_INTRO_OPENER) —
 * the same words Demo Mode uses, so the product introduces itself once rather
 * than differently per surface. The read-only / no-funds assurance is NOT
 * repeated here: it is already on the wallet surface itself and in the answers
 * where it is the actual point (what Smith can read, what Review does).
 */
export const REAL_WALLET_SMITH_OPENER = SMITH_INTRO_OPENER;

const WALLET_READ_PROMPT = "What can you read from my wallet?";
const WALLET_READ_RESPONSE =
  "WealthSmith reads your public balances only — native SOL and your SPL token accounts, from " +
  "the address you connected. It cannot see your other wallets, your transaction history on " +
  "other chains, or anything that is not public on Solana. It never has your seed phrase or " +
  "private key, and it cannot sign. " +
  REAL_WALLET_NO_FUNDS_NOTE;

/**
 * rules/financial-logic-boundaries.md — "Safety Buffer target (APPROVED —
 * risk-based)": target months are mapped from the saved risk tolerance
 * (very_low/low 6, medium 3, high/very_high 1) and multiplied by monthly
 * expenses. The same section forbids assuming a default, so the unavailable
 * state is stated rather than filled in.
 */
const BUFFER_PROMPT = "How is my Safety Buffer target set?";
const BUFFER_RESPONSE =
  "Your Safety Buffer target is a number of months of your monthly expenses, and the number of " +
  "months comes from the risk tolerance saved in your goal settings — six months at lower risk, " +
  "three at medium, one at higher risk. Coverage is the stablecoin value WealthSmith can confirm " +
  "is available, measured against that target. If your expenses or risk tolerance are not saved, " +
  "the target is shown as unavailable rather than assumed.";

/** What Review does: open the read-only breakdown, never execute. */
const REVIEW_PROMPT = "What happens when I click Review?";
const REVIEW_RESPONSE =
  "Review opens a read-only breakdown of how the suggestion was calculated — the amount, the " +
  "current APY, and the estimated yearly rewards. Opening the protocol from there hands you off " +
  "in a new tab, where you act yourself. WealthSmith does not execute a swap, move funds, or " +
  "mark the suggestion complete. " +
  REAL_WALLET_NO_FUNDS_NOTE;

/** Only true while the engine has no cards to show. */
const NO_SUGGESTIONS_PROMPT = "Why aren’t there suggestions yet?";

/** Only true while pricing has not resolved. */
const NO_VALUE_PROMPT = "Why is there no portfolio value?";
const NO_VALUE_RESPONSE =
  REAL_WALLET_VALUE_DESC +
  " Balances are shown as on-chain amounts, not USD, until a pricing source is connected.";

function topPickResponse(card: SuggestionCardState): string {
  return [
    `“${card.title}” is the Top Pick.`,
    topPickRationale(card, "your Safety Buffer"),
    asSentence(card.description ?? ""),
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Build the connected-wallet panel content from the rail the page is rendering.
 * Pass `rail?.cards`; `null`/`undefined` means the rail has not resolved yet.
 *
 * Chips are capped at three (patterns/onboarding-with-smith-ai.md) and the
 * state-specific one leads, because it is the question the screen actually
 * raises. Every response stays in the map regardless, so a user who types one of
 * them gets the real answer instead of the fallback.
 */
export function buildRealWalletSmithAiContent(
  cards: readonly SuggestionCardState[] | null | undefined
): SmithAiContent {
  const resolved = cards != null;
  const list = cards ?? [];
  const topPick = list.find((c) => c.is_top_pick);

  const prompts: string[] = [];
  if (topPick) prompts.push(`What is the Top Pick?`);
  else if (resolved) prompts.push(NO_SUGGESTIONS_PROMPT);
  else prompts.push(WALLET_READ_PROMPT);

  prompts.push(BUFFER_PROMPT);
  prompts.push(prompts.includes(WALLET_READ_PROMPT) ? REVIEW_PROMPT : WALLET_READ_PROMPT);

  return {
    panelLabel: "Smith AI panel",
    entryLabel: "Ask Smith AI",
    opener: REAL_WALLET_SMITH_OPENER,
    prompts,
    responses: {
      ...(topPick ? { "What is the Top Pick?": topPickResponse(topPick) } : {}),
      [NO_SUGGESTIONS_PROMPT]: REAL_WALLET_SUGGESTIONS_DESC,
      [NO_VALUE_PROMPT]: NO_VALUE_RESPONSE,
      [BUFFER_PROMPT]: BUFFER_RESPONSE,
      [WALLET_READ_PROMPT]: WALLET_READ_RESPONSE,
      [REVIEW_PROMPT]: REVIEW_RESPONSE,
    },
    fallback: SMITH_FALLBACK,
  };
}

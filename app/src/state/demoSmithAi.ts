/**
 * Demo Mode Ask Smith AI content — DERIVED from the engine output the rail renders.
 *
 * There is NO live generation. The panel still only ever shows approved copy; what
 * changed is where the Top Pick sentence comes from. It is now composed from the
 * SAME `SuggestionCardState` the rail renders (title, category, description —
 * engine-owned, quoted verbatim) and wrapped in the approved Demo Mode framing.
 *
 * WHY THIS IS DERIVED AND NOT A FIXTURE: the demo rail runs the real engine over
 * the canonical demo profile (DemoDashboardPage → buildDemoContributionRail →
 * deriveRailSuggestions). The previous version of this file read a hand-written
 * snapshot (examples/demo-mode/demo-suggestions.json) describing an older demo
 * scenario — buffer below target, buffer as Top Pick, a locked yield card. The
 * demo portfolio has since changed (the sample buffer is fully funded and the
 * Top Pick is a yield suggestion), so Smith AI asserted three things the screen
 * contradicted. Deriving from the rail makes that class of drift impossible:
 * if the engine's answer changes, Smith's answer changes with it.
 *
 * Boundary unchanged (rules/financial-logic-boundaries.md): Smith AI EXPLAINS.
 * Nothing here selects a Top Pick, ranks, scores, or invents a value — it reads
 * what the engine already decided.
 *
 * Sources:
 * - Top Pick sentence: the engine card + the documented selection rule
 *   (suggestions/topPick.ts — category priority, Safety Buffer first).
 * - Demo-Mode answer: examples/demo-mode/demo-smith-ai-responses.md (Example 1),
 *   quoted verbatim.
 * - Fallback: adapted from content/smith-ai-copy.md uncertainty response into
 *   Demo Mode language using approved demo phrases.
 */
import type { SmithAiContent, SuggestionCardState } from "../types/dashboard";
import { SMITH_INTRO_OPENER } from "./approvedCopy";
import { topPickRationale, asSentence } from "./smithAiTopPick";
import { demoDashboardState } from "./demoDashboardState";

/** demo-smith-ai-responses.md — Example 1 ("What is Demo Mode?"), verbatim. */
const DEMO_MODE_PROMPT = "What does Demo Mode mean?";
const DEMO_MODE_RESPONSE =
  "Demo Mode lets you explore WealthSmith with sample data before connecting a wallet. " +
  "In this demo, the dashboard, portfolio, Safety Buffer, and suggestions are based on a sample portfolio, not your real wallet. " +
  "Connect your wallet to personalize WealthSmith with your real portfolio. Your funds stay in your wallet.";

/**
 * What Review actually does in Demo Mode: it opens the read-only details modal
 * (RealWalletSuggestionsRail → SuggestionReviewModal). The protocol link inside
 * that modal is a handoff — it never executes, signs, or completes anything.
 */
/**
 * Both chips must stand ALONE. Opening the panel replaces the suggestions rail,
 * so while these are on screen the cards are not — the user may not have read
 * them at all. "Why is this the Top Pick?" therefore points at something
 * invisible, and interpolating the card title instead ("Why is “Earn Yield on
 * Excess USDC” the Top Pick?") wraps to three lines and crowds the other chips.
 * Asking about the Top Pick as a CONCEPT needs neither: it is short, it is
 * answerable without looking at anything, and the answer names the card.
 */
const TOP_PICK_PROMPT = "What is the Top Pick?";
const LOCKED_PROMPT = "Why is a suggestion locked?";

const REVIEW_PROMPT = "What happens when I click Review?";
const REVIEW_RESPONSE =
  "In this demo, Review opens a read-only breakdown of how the suggestion was calculated — " +
  "the amount, the current APY, and the estimated yearly rewards. Opening the protocol from " +
  "there hands you off in a new tab; WealthSmith does not execute a swap, move funds, or mark " +
  "the suggestion complete. This is based on sample data, not your real wallet.";

/**
 * Demo-aware fallback for non-fixture input. Built only from approved
 * fragments: "In this demo" / "sample data" (demo-smith-ai-responses.md
 * required phrasing), the uncertainty clause (content/smith-ai-copy.md),
 * "connect your wallet to personalize WealthSmith" (demo-portfolio.json
 * wallet_transition_helper), and "check the Support page"
 * (content/smith-ai-copy.md fallback).
 */
export const DEMO_SMITH_FALLBACK =
  "In this demo, I can only explain the sample data shown on this dashboard. " +
  "I don’t have enough product information to answer that confidently — connect your wallet to " +
  "personalize WealthSmith, or check the Support page for help.";

/**
 * Demo Mode opens with the SAME introduction a connected wallet gets
 * (approvedCopy.SMITH_INTRO_OPENER), so the product introduces itself once
 * rather than differently per surface.
 *
 * The panel used to open with the verbatim answer to its own first suggested
 * prompt, so Smith began mid-conversation, answering a question nobody asked,
 * and clicking that chip repeated the identical paragraph. The introduction
 * states nothing about the portfolio, so no claim here can fall out of step
 * with the rail. It carries no Demo Mode wording either, because it describes
 * Smith rather than the data: the disclosure is on the demo banner above the
 * page and in every answer Smith gives.
 */
export const DEMO_SMITH_OPENER = SMITH_INTRO_OPENER;

function topPickResponse(card: SuggestionCardState): string {
  return [
    `In this demo, “${card.title}” is the Top Pick.`,
    topPickRationale(card, "the sample buffer"),
    asSentence(card.description ?? ""),
    "This is based on sample data, not your real wallet.",
  ]
    .filter(Boolean)
    .join(" ");
}

function lockedResponse(card: SuggestionCardState): string {
  return [
    `In this demo, “${card.title}” is shown but is not available to act on yet.`,
    asSentence(card.disabled_reason_text ?? ""),
    "This is based on sample data, not your real wallet.",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Build the Ask Smith AI content for Demo Mode from the rail the page is
 * rendering. Pass `rail.cards`; with no cards the panel still opens and can
 * explain Demo Mode itself.
 */
export function buildDemoSmithAiContent(
  cards: readonly SuggestionCardState[] | null | undefined
): SmithAiContent {
  const list = cards ?? [];
  const topPick = list.find((c) => c.is_top_pick);
  const locked = list.find((c) => c.disabled_reason_text != null && !c.is_top_pick);

  const prompts: string[] = [];
  const responses: Record<string, string> = {};
  const add = (prompt: string, response: string) => {
    prompts.push(prompt);
    responses[prompt] = response;
  };

  // Top Pick first — it is the single thing the rail is pointing at.
  if (topPick) add(TOP_PICK_PROMPT, topPickResponse(topPick));

  add(DEMO_MODE_PROMPT, DEMO_MODE_RESPONSE);

  // Only offer the locked question when something on screen is actually locked.
  if (locked) add(LOCKED_PROMPT, lockedResponse(locked));
  else add(REVIEW_PROMPT, REVIEW_RESPONSE);

  return {
    panelLabel: "Smith AI panel",
    entryLabel: demoDashboardState.smith_ai.entry_label,
    opener: DEMO_SMITH_OPENER,
    prompts,
    responses,
    fallback: DEMO_SMITH_FALLBACK,
  };
}

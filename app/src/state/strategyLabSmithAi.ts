/**
 * Strategy Lab Ask Smith AI content — static, explain-only, scenario-backed.
 *
 * Quick-prompt answers explain how the Strategy Lab scenarios are built and how
 * to read them, grounded in the approved scenario copy (state/strategyLabState.ts).
 * Free-form input returns only the approved fallback. No live generation, no
 * predictions, no invented performance claims, no financial advice, no account
 * changes, no fund movement, no signatures.
 */
import type { SmithAiContent } from "../types/dashboard";

/** Approved opener/fallback — explain-only, no guarantees. */
const STRATEGY_LAB_SAFE_MESSAGE =
  "I can explain how the Strategy Lab works — how the scenarios are built, " +
  "what the Safety Buffer does, and how to read the charts. The scenarios are " +
  "fixed historical illustrations, not live data or a performance guarantee.";

const Q_HOW_BUILT = "How are these scenarios built?";
const Q_BUFFER = "What is the Safety Buffer?";
const Q_GUARANTEE = "Are these results guaranteed?";

export const strategyLabSmithAiContent: SmithAiContent = {
  panelLabel: "Smith AI panel",
  entryLabel: "Ask Smith AI",
  opener: STRATEGY_LAB_SAFE_MESSAGE,
  prompts: [Q_HOW_BUILT, Q_BUFFER, Q_GUARANTEE],
  responses: {
    [Q_HOW_BUILT]:
      "Each scenario replays a real historical market event day by day. The " +
      "WealthSmith line follows the same rules the product uses — market-" +
      "condition targets, the ±10-point rebalance range, vetted assets only, " +
      "and the Safety Buffer — while the Unguided line shows a portfolio " +
      "making common unadvised moves over the same dates. The Token Breakdown " +
      "table shows both portfolios and the decision log for every date.",
    [Q_BUFFER]:
      "The Safety Buffer is a reserve of vetted stablecoins — typically three " +
      "months of expenses — that WealthSmith never deploys into crypto. In " +
      "every scenario it is what keeps the guided portfolio from buying into " +
      "a crash or chasing a rally with money set aside for safety.",
    [Q_GUARANTEE]:
      "No. The scenarios are fixed historical illustrations built to show how " +
      "the strategy behaves — they are not live data, a prediction, or a " +
      "performance guarantee. Past performance does not guarantee future " +
      "results.",
  },
  fallback: STRATEGY_LAB_SAFE_MESSAGE,
};

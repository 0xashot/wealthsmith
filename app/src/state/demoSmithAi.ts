/**
 * Demo Mode Ask Smith AI content — static, demo-aware, approved only.
 *
 * There is NO live generation. Suggested prompts map to verbatim approved
 * responses; any other input returns the demo-aware fallback. Sources:
 * - Card explanations: examples/demo-mode/demo-suggestions.json
 *   (each suggestion's smith_ai_explanation.approved_short_response).
 * - Demo-Mode / handoff answers: examples/demo-mode/demo-smith-ai-responses.md
 *   (Examples 1 and 9), quoted verbatim.
 * - Fallback: adapted from content/smith-ai-copy.md uncertainty response into
 *   Demo Mode language using approved demo phrases (per approval decision 2).
 */
import type { SmithAiContent } from "../types/dashboard";
import { demoDashboardState } from "./demoDashboardState";
import demoSuggestions from "../../../examples/demo-mode/demo-suggestions.json";

const suggestions = (demoSuggestions as any).suggestions as any[];
const explain = (id: string): string =>
  suggestions.find((s) => s.id === id)?.smith_ai_explanation?.approved_short_response ?? "";

const TOP_PICK_RESPONSE = explain("demo_top_up_safety_buffer");
const LOCKED_RESPONSE = explain("demo_locked_usdc_yield");

/** demo-smith-ai-responses.md — Example 1 ("What is Demo Mode?"), verbatim. */
const DEMO_MODE_RESPONSE =
  "Demo Mode lets you explore WealthSmith with sample data before connecting a wallet. " +
  "In this demo, the dashboard, portfolio, Safety Buffer, and suggestions are based on a sample portfolio, not your real wallet. " +
  "Connect your wallet to personalize WealthSmith with your real portfolio. Your funds stay in your wallet.";

/** demo-smith-ai-responses.md — Example 9 ("Review on Jupiter"), verbatim. */
const JUPITER_HANDOFF_RESPONSE =
  "In this demo, Review on Jupiter opens Jupiter in a new tab so you can see how an external protocol handoff works. " +
  "WealthSmith does not execute a swap, move funds, or mark the suggestion complete when you open the protocol. " +
  "This demo suggestion is based on sample data.";

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

/** The panel opens with the demo Top Pick explanation (mirrors connected). */
export const DEMO_SMITH_OPENER = TOP_PICK_RESPONSE;

/** Exact suggested-prompt → approved response map (demo-aware, verbatim). */
export const DEMO_SMITH_RESPONSES: Record<string, string> = {
  "Why is Safety Buffer the Top Pick?": TOP_PICK_RESPONSE,
  "What does Demo Mode mean?": DEMO_MODE_RESPONSE,
  "Why is the yield suggestion locked?": LOCKED_RESPONSE,
  // Not a suggested prompt, but approved if the user types it:
  "What happens if I click Review on Jupiter?": JUPITER_HANDOFF_RESPONSE,
};

/** Content object for the mode-agnostic Ask Smith AI panel (demo-aware). */
export const demoSmithAiContent: SmithAiContent = {
  panelLabel: "Smith AI panel",
  entryLabel: demoDashboardState.smith_ai.entry_label,
  opener: DEMO_SMITH_OPENER,
  prompts: demoDashboardState.smith_ai.suggested_prompts,
  responses: DEMO_SMITH_RESPONSES,
  fallback: DEMO_SMITH_FALLBACK,
};

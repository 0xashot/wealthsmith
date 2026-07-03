/**
 * Connected-wallet Ask Smith AI content (approved, static — no generation).
 *
 * Sources (same as before the panel was parameterized):
 * - opener + prompts + entry label: dashboard-connected-wallet-state.json (smith_ai)
 * - locked-yield answer: suggestions-buffer-underfunded.json
 * - Jupiter handoff answer: protocol-jupiter-swap.json
 * - free-form fallback: content/smith-ai-copy.md (SMITH_FALLBACK)
 */
import { dashboardState } from "./dashboardState";
import { SMITH_FALLBACK } from "./approvedCopy";
import type { SmithAiContent } from "../types/dashboard";
import suggestionsFixture from "../../../examples/suggestions/suggestions-buffer-underfunded.json";
import protocolFixture from "../../../examples/protocol-handoffs/protocol-jupiter-swap.json";

const sa = dashboardState.smith_ai;
const locked = (suggestionsFixture as any).suggestions.find(
  (s: any) => s.id === "locked_usdc_yield"
);

export const connectedSmithAiContent: SmithAiContent = {
  panelLabel: "Smith AI panel",
  entryLabel: sa.entry_label,
  opener: sa.approved_sample_response,
  prompts: sa.suggested_prompts,
  responses: {
    "Why is Safety Buffer the Top Pick?": sa.approved_sample_response,
    "Why is the yield suggestion locked?":
      locked?.smith_ai_explanation?.approved_short_response ?? SMITH_FALLBACK,
    "What happens if I click Review on Jupiter?":
      (protocolFixture as any).smith_ai_behavior?.approved_response ?? SMITH_FALLBACK,
  },
  fallback: SMITH_FALLBACK,
};

/**
 * Portfolio Ask Smith AI content — static, explain-only, approved/fixture-backed.
 *
 * No live generation, no invented portfolio insights / APY / earnings /
 * recommendations / Top Pick / protocol decisions. The three quick prompts and
 * their answers are the verbatim approved `smith_ai_context` from the Portfolio
 * fixtures (examples/portfolio/*): each fixture's `example_user_question` →
 * `approved_response`.
 *
 * Opener / free-form fallback: a generic, safe capability statement built only
 * from approved fragments — the visible fixture section labels (Liquid / Staked
 * / Yield), the smith-ai-rules explain-only boundary, and the custody phrase
 * "does not move funds from your wallet" (portfolio-liquid-assets.json
 * approved_response). It states no numbers, gives no advice, and takes no
 * action.
 */
import type { SmithAiContent } from "../types/dashboard";
import liquidFixture from "../../../examples/portfolio/portfolio-liquid-assets.json";
import stakedFixture from "../../../examples/portfolio/portfolio-staked-assets.json";
import yieldFixture from "../../../examples/portfolio/portfolio-yield-strategies.json";

const liquid = (liquidFixture as any).smith_ai_context;
const staked = (stakedFixture as any).smith_ai_context;
const yieldS = (yieldFixture as any).smith_ai_context;

const PORTFOLIO_SAFE_MESSAGE =
  "I can explain what you’re seeing on this Portfolio page — your total portfolio value and how it’s " +
  "deployed across Liquid Assets, Staked Assets, and Yield Strategies. I can’t give investment advice " +
  "or take any action; WealthSmith does not move funds from your wallet.";

export const portfolioSmithAiContent: SmithAiContent = {
  panelLabel: "Smith AI panel",
  entryLabel: "Ask Smith AI",
  opener: PORTFOLIO_SAFE_MESSAGE,
  prompts: [
    liquid.example_user_question,
    staked.example_user_question,
    yieldS.example_user_question,
  ],
  responses: {
    [liquid.example_user_question]: liquid.approved_response,
    [staked.example_user_question]: staked.approved_response,
    [yieldS.example_user_question]: yieldS.approved_response,
  },
  fallback: PORTFOLIO_SAFE_MESSAGE,
};

/**
 * demoContributionScenario — Step 15H finalization. Routes the CANONICAL Demo profile + portfolio
 * through the SAME deterministic contribution pipeline (`deriveContributionSuggestion`, dataMode
 * `demo_fixture`) and maps the ready plan to the shared `SuggestionCardState` + review sections. The
 * canonical Demo is Safety-Buffer-incomplete, so the pipeline produces the plan-backed buffer plan;
 * the Demo dashboard enriches/replaces its existing buffer card with this (one buffer card, still Top
 * Pick), never a SOL DCA. Fixture data stays inside `demo_fixture` mode; this module imports NO
 * /testing scenarios and is never used by Real Wallet.
 *
 * Canonical Demo inputs (pinned — not changed here): goal Build Long-Term Wealth · Medium risk ·
 * 5-year horizon · income $4,000 · expenses $1,000 · saving goal $1,000 · Monthly; portfolio
 * SOL $5,500 · BONK $1,200 · USDC $800 (3-month buffer target $3,000 vs $800 eligible → incomplete).
 */
import type { WalletPosition } from "../wallet/walletPosition";
import type { SavedGoal } from "../types/goal";
import { deriveRailSuggestions, type RailSuggestions } from "./useRailSuggestions";

/** Fixed deterministic snapshot time so the Demo plan id is stable across rerenders. */
export const DEMO_PRICED_AS_OF = Date.UTC(2026, 6, 15, 0, 0, 0);

export const DEMO_POSITIONS: WalletPosition[] = [
  { id: "demo-sol", source: "wallet", type: "native", symbol: "SOL", amount: "0", detection: "direct_wallet_balance", valueUsd: 5500, priceUsd: 150 },
  { id: "demo-bonk", source: "wallet", type: "token", symbol: "BONK", name: "Bonk", amount: "0", detection: "direct_wallet_balance", valueUsd: 1200 },
  { id: "demo-usdc", source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", amount: "0", detection: "direct_wallet_balance", valueUsd: 800 },
];

export const DEMO_GOAL: SavedGoal = { financial_goal: "build_long_term_wealth", risk_tolerance: "medium", timeline: "5_years", contribution_frequency: "monthly", income_monthly: 4000, expenses_monthly: 1000, monthly_saving_goal: 1000 };

/**
 * Build the default-Demo suggestion rail by running the canonical Demo through the SAME shared engine
 * (`deriveRailSuggestions`, dataMode `demo_fixture`). The canonical Demo is Safety-Buffer-incomplete,
 * so the buffer override yields exactly one plan-backed Safety Buffer card (Top Pick) — no SOL DCA,
 * no duplicate buffer, no stable contribution. Rendered through the shared `RealWalletSuggestionsRail`
 * → shared card + shared review modal.
 */
export function buildDemoContributionRail(): RailSuggestions {
  const data = deriveRailSuggestions({ positions: DEMO_POSITIONS, pricedAsOf: DEMO_PRICED_AS_OF, goal: DEMO_GOAL, dataMode: "demo_fixture" });
  return { ...data, loading: false };
}

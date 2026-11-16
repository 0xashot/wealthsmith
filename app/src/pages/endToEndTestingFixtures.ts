/**
 * End-to-End gallery scenarios — the ONLY place in the gallery that exercises the
 * real pipeline instead of a preset.
 *
 * Every other tab hands SuggestionReviewModal a `swapAction` built by hand
 * (swapQuoteTestingFixtures.GALLERY_MODAL_PRESETS). That proves the route section
 * RENDERS given a readiness; it cannot prove anything ever produces one. The
 * Step-23C route comparison shipped broken for exactly that reason:
 * `deriveRailSwapActions` compared cards against the ENGINE's category names,
 * which a card never carries, so it returned {} for every real rail while the
 * gallery and all 8225 fixture checks looked healthy.
 *
 * These scenarios run positions → deriveRailSuggestions → engine → toSuggestionCard
 * → deriveRailSwapActions and render the production rail component, so Review opens
 * with the readiness the app itself derived. If that derivation breaks again, this
 * tab goes empty.
 *
 * Offline and deterministic: sample positions, the canonical demo goal, a pinned
 * snapshot time, and the demo swap-quote fetcher. No wallet, no provider call.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import { buildDemoContributionRail, DEMO_GOAL } from "../suggestions/demoContributionScenario";
import { demoSwapQuoteFetcher } from "../suggestions/swapQuote/demoSwapQuote";
import type { RailSuggestions } from "../suggestions/useRailSuggestions";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function sol(uiAmount: number): WalletPosition {
  return {
    id: "e2e-sol", source: "wallet", type: "native", symbol: "SOL", name: "Solana",
    uiAmount, decimals: 9, amount: String(Math.round(uiAmount * 1e9)),
    priceUsd: 150, valueUsd: uiAmount * 150, detection: "direct_wallet_balance",
  } as unknown as WalletPosition;
}

function usdc(uiAmount: number): WalletPosition {
  return {
    id: "e2e-usdc", source: "wallet", type: "token", symbol: "USDC", name: "USD Coin",
    mint: USDC_MINT, uiAmount, decimals: 6, amount: String(Math.round(uiAmount * 1e6)),
    priceUsd: 1, valueUsd: uiAmount, detection: "direct_wallet_balance",
  } as unknown as WalletPosition;
}

export interface EndToEndScenario {
  key: string;
  label: string;
  /** What the pipeline should produce, so an empty rail reads as a failure, not an empty state. */
  expectation: string;
  rail: RailSuggestions;
}

/**
 * The buffer target is 3 months of the canonical demo goal's $1,000 expenses, so
 * every mix below keeps $3,000+ in stables — the Buffer Override would otherwise
 * suppress the whole rail and there would be nothing to review.
 */
export const END_TO_END_SCENARIOS: EndToEndScenario[] = [
  {
    key: "e2e-stables-heavy",
    label: "Stable-heavy wallet — crypto below target",
    expectation: "Rebalance card with a ready USDC → SOL route",
    rail: { ...buildDemoContributionRail(DEMO_GOAL, [sol(6.67), usdc(20000)]), swapQuoteFetcher: demoSwapQuoteFetcher },
  },
  {
    key: "e2e-crypto-heavy",
    label: "Crypto-heavy wallet — crypto above target",
    expectation: "Rebalance card with a ready SOL → USDC route (0.1 SOL reserve kept)",
    rail: { ...buildDemoContributionRail(DEMO_GOAL, [sol(600), usdc(3500)]), swapQuoteFetcher: demoSwapQuoteFetcher },
  },
];

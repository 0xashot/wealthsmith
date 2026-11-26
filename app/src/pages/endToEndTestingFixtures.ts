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
import type { SavedGoal } from "../types/goal";
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

export const PENGU_MINT = "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv";
export const FARTCOIN_MINT = "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump";
const FROZEN_MINT = "FRZNvQ7mXh3kJ2pLw8sT5yBn4cRd6eUa9gHiKoMzPq1x";
const LISTED_ICON = "https://static.datapi.jup.ag/token-icons/0817b3345e648b1663385bac48eb086877635ee27639c3d5da2a4d9dfd8603b1.webp";

/** A wallet token the registry cannot name, carrying a Jupiter-verified MEME listing. */
function listedMeme(id: string, mint: string, symbol: string, name: string, uiAmount: number, priceUsd: number, iconUrl: string | null): WalletPosition {
  return {
    id, source: "wallet", type: "token", symbol: `${mint.slice(0, 4)}…${mint.slice(-4)}`, name: "Unknown token", mint,
    uiAmount, decimals: 6, amount: String(Math.round(uiAmount * 1e6)),
    priceUsd, valueUsd: uiAmount * priceUsd, detection: "direct_wallet_balance",
    listing: { symbol, name, iconUrl, meme: true, source: "jupiter_verified" },
  } as unknown as WalletPosition;
}

/** A non-core long-tail token, the input the Trim rule looks for. */
function tail(id: string, symbol: string, mint: string, uiAmount: number, priceUsd: number): WalletPosition {
  return {
    id, source: "wallet", type: "token", symbol, name: symbol, mint,
    uiAmount, decimals: 5, amount: String(Math.round(uiAmount * 1e5)),
    priceUsd, valueUsd: uiAmount * priceUsd, detection: "direct_wallet_balance",
  } as unknown as WalletPosition;
}

export const BONK_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
export const WIF_MINT = "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm";
/** A thinly traded token for the walkthrough: its sale is refused on price impact. */
export const MOBY_MINT = "Cy1GS2FqefgaMbi45UunrUzin1rfEmTUYnomddzBpump";

/**
 * Trim rails for the swap walkthrough's live simulation: the same near-target wallet the Trim
 * scenario below uses, holding one, or three, long-tail tokens. Built by the real pipeline; the
 * walkthrough supplies its own pretend quotes.
 */
export function buildTrimWalkthroughRail(tokens: "three" | "one" | "listed" | "frozen"): RailSuggestions {
  const positions = tokens === "one"
    ? [sol(8000 / 150), usdc(5748), tail("e2e-bonk", "BONK", BONK_MINT, 2000 / 0.00003, 0.00003)]
    : tokens === "listed"
      // Two meme coins OUTSIDE the approved list that Jupiter has verified and tagged meme, beside
      // BONK from the list. The engine still sees an address and "Unknown token" for the first two;
      // their identity, name and icon come from the listing (wallet/verifiedMemeIdentity.ts).
      ? [
          sol(8000 / 150),
          usdc(5748),
          tail("e2e-bonk", "BONK", BONK_MINT, 900 / 0.00003, 0.00003),
          listedMeme("e2e-pengu", PENGU_MINT, "PENGU", "Pudgy Penguins", 800 / 0.012, 0.012, LISTED_ICON),
          // Verified, but its icon is on a host we do not load from: its name, and the generic icon.
          listedMeme("e2e-fart", FARTCOIN_MINT, "Fartcoin", "Fartcoin", 600 / 0.3, 0.3, null),
        ]
    : tokens === "frozen"
      // One token that can be sold and one Token-2022 token frozen in the wallet: it stays in the
      // list, greyed, with the reason — the total above still adds up.
      ? [
          sol(8000 / 150),
          usdc(5748),
          tail("e2e-bonk", "BONK", BONK_MINT, 1200 / 0.00003, 0.00003),
          tail("e2e-wif", "WIF", WIF_MINT, 800 / 3, 3),
          { ...tail("e2e-frzn", "FRZN", FROZEN_MINT, 300 / 2, 2), tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", transferabilityState: "frozen" } as unknown as WalletPosition,
        ]
    : [
        sol(8000 / 150),
        usdc(5748),
        tail("e2e-bonk", "BONK", BONK_MINT, 1200 / 0.00003, 0.00003),
        tail("e2e-wif", "WIF", WIF_MINT, 800 / 3, 3),
        tail("e2e-moby", "MOBY", MOBY_MINT, 300 / 0.002, 0.002),
      ];
  return buildDemoContributionRail(DEMO_GOAL, positions);
}

/**
 * Risk `high` puts the buffer target at ONE month of expenses and no monthly
 * contribution means the allocation split never applies, which is the only way to
 * reach the single (unsplit) DCA card — see the note on the DCA scenario below.
 */
const HIGH_RISK_NO_CONTRIBUTION: SavedGoal = {
  ...DEMO_GOAL,
  risk_tolerance: "high",
  monthly_saving_goal: 0,
};

/**
 * Each scenario keeps enough stable value to fund its Safety Buffer target — the
 * Buffer Override returns the buffer suggestion ALONE while the buffer is short,
 * which would leave nothing here to review. The Rebalance ones are deliberately far
 * off target; the Trim and DCA ones sit NEAR target, because Rebalance suppresses
 * the lower-priority families when it applies.
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
  {
    key: "e2e-trim",
    label: "Near target, holding non-core long-tail tokens",
    // The demo fetcher prices only USDC and WSOL (demoSwapQuote.demoPriceUsd), and a
    // non-core token is neither, so each leg lands on the unavailable view. That is the
    // fetcher having no offline price, not the derivation failing: what this scenario
    // proves is that a ready MULTI-LEG readiness was derived and the per-leg comparison
    // mounted. Expect "swap actions 1" above, and one section per token below.
    expectation: "Trim card with a ready 2-leg comparison (BONK, WIF); legs show the unavailable view — the demo fetcher prices only SOL/USDC",
    rail: {
      ...buildDemoContributionRail(DEMO_GOAL, [
        sol(8000 / 150),
        usdc(5748),
        tail("e2e-bonk", "BONK", BONK_MINT, 1200 / 0.00003, 0.00003),
        tail("e2e-wif", "WIF", WIF_MINT, 800 / 3, 3),
      ]),
      swapQuoteFetcher: demoSwapQuoteFetcher,
    },
  },
  {
    key: "e2e-dca",
    label: "Near target, excess SOL staged for gradual entry (no monthly contribution)",
    expectation: "DCA card with a ready route",
    rail: {
      ...buildDemoContributionRail(HIGH_RISK_NO_CONTRIBUTION, [sol(9200 / 150), usdc(5748)]),
      swapQuoteFetcher: demoSwapQuoteFetcher,
    },
  },
];

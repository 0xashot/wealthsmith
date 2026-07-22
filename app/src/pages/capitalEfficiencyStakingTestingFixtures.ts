/**
 * capitalEfficiencyStakingTestingFixtures — Step 21G. Production-derived Capital Efficiency and Staking
 * cards for the /testing gallery. Each fixture builds a canonical `SuggestionEngineInputs` snapshot via the
 * PRODUCTION adapter (`buildSuggestionEngineInputs`) over deterministic, RPC-independent fixture positions +
 * a funded Safety Buffer, then runs the PRODUCTION rule (`deriveCapitalEfficiencySuggestion` /
 * `deriveStakingSuggestion`). The gallery renders the resulting EngineSuggestion through the production
 * SuggestionCard + SuggestionReviewModal. No hand-built card, no testing-only financial logic — the card
 * and its Review details come entirely from the mounted production rule.
 *
 * Only card-producing scenarios are included, and only meaningfully-different variants (different amount +
 * involved assets). Every trigger precondition (funded buffer, pricing, priced total, threshold) is met by
 * construction; the fixtures never bypass the rule's own guards.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import type { SafetyBuffer } from "../wallet/walletSummary";
import { buildSuggestionEngineInputs } from "../suggestions/engineInputAdapter";
import { deriveCapitalEfficiencySuggestion } from "../suggestions/capitalEfficiencySuggestion";
import { deriveStakingSuggestion } from "../suggestions/stakingSuggestion";
import type { EngineSuggestion } from "../suggestions/engineTypes";

const GEN = 1_700_000_000_000;

/** A funded Safety Buffer literal (complete coverage) — the deployment precondition both rules require. */
function fundedBuffer(targetUsd = 3000): SafetyBuffer {
  return {
    stableUsd: targetUsd,
    targetUsd,
    targetMonths: 3,
    coveragePct: 100,
    monthsCovered: 3,
    fullyFunded: true,
    coverageState: "complete",
  };
}

/**
 * A priced, direct-wallet crypto token (non-SOL, non-stable) — an eligible idle asset. `mint` is the real
 * token mint (so the review links to Solscan); `icon` is the approved token-icon path when one exists
 * (a neutral fallback renders otherwise, exactly like the Portfolio Liquid Assets table).
 */
const idleToken = (
  id: string,
  symbol: string,
  name: string,
  uiAmount: number,
  priceUsd: number,
  mint: string,
  icon?: string
): WalletPosition => ({
  id,
  source: "wallet",
  type: "token",
  symbol,
  name,
  mint,
  ...(icon ? { icon } : {}),
  amount: String(Math.round(uiAmount * 1e6)),
  uiAmount,
  decimals: 6,
  detection: "direct_wallet_balance",
  priceUsd,
  valueUsd: uiAmount * priceUsd,
});

/** Priced, truly-liquid native wallet SOL — the only source the staking rule reviews. */
const liquidSol = (uiAmount: number, priceUsd = 150): WalletPosition => ({
  id: "sol",
  source: "wallet",
  type: "native",
  symbol: "SOL",
  name: "Solana",
  amount: String(Math.round(uiAmount * 1e9)),
  uiAmount,
  decimals: 9,
  detection: "direct_wallet_balance",
  priceUsd,
  valueUsd: uiAmount * priceUsd,
});

function inputs(positions: WalletPosition[], totalUsd: number) {
  return buildSuggestionEngineInputs({
    positions,
    pricedAsOf: GEN,
    value: { totalUsd, anyUnpriced: false },
    safetyBuffer: fundedBuffer(),
  });
}

export interface CategoryTestingFixture {
  id: string;
  label: string;
  card: EngineSuggestion | null;
}

/** Capital Efficiency — production "Review Idle Assets" cards over eligible idle wallet crypto. */
export function getCapitalEfficiencyTestingFixtures(): CategoryTestingFixture[] {
  return [
    {
      id: "capeff_multi",
      label: "1. Multiple idle wallet tokens aggregated into one review",
      card: deriveCapitalEfficiencySuggestion(
        inputs([
          idleToken("bonk", "BONK", "Bonk", 12_000_000, 0.00002, "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", "token/bonk.svg"),
          idleToken("wif", "WIF", "dogwifhat", 60, 3, "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", "token/wif.png"),
        ], 10_000),
        GEN
      ),
    },
    {
      id: "capeff_single",
      label: "2. A single larger idle position, higher portfolio share",
      card: deriveCapitalEfficiencySuggestion(
        inputs([idleToken("jup", "JUP", "Jupiter", 650, 1, "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", "token/jup.svg")], 9_000),
        GEN
      ),
    },
  ];
}

/** Staking — production "Put Idle SOL to Work" cards over truly-liquid wallet SOL (fee reserve kept). */
export function getStakingTestingFixtures(): CategoryTestingFixture[] {
  return [
    {
      id: "staking_modest",
      label: "1. Modest liquid SOL above the fee reserve",
      card: deriveStakingSuggestion(inputs([liquidSol(4)], 10_000), GEN),
    },
    {
      id: "staking_large",
      label: "2. Larger liquid SOL balance",
      card: deriveStakingSuggestion(inputs([liquidSol(12.5)], 12_000), GEN),
    },
  ];
}

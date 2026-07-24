/**
 * stakingTestingFixtures — Step 24A. Production-derived STAKING cards for the /testing gallery: SOL
 * staking (`deriveStakingSuggestion`) and the dedicated JUP staking (`deriveJupStakingSuggestion`),
 * shown as SEPARATE cards under one Staking tab — never aggregated. Each fixture builds a canonical
 * `SuggestionEngineInputs` snapshot via the PRODUCTION adapter over deterministic, RPC-independent
 * positions + a funded Safety Buffer, then runs the PRODUCTION rule. The gallery renders the resulting
 * EngineSuggestion through the production SuggestionCard + SuggestionReviewModal — no hand-built card.
 *
 * The generic Capital Efficiency "Review Idle Assets" fixtures were RETIRED here (Step 24A): the rule no
 * longer exists, so there is no production card to derive. Only card-producing scenarios are included.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import type { SafetyBuffer } from "../wallet/walletSummary";
import { buildSuggestionEngineInputs } from "../suggestions/engineInputAdapter";
import { deriveStakingSuggestion } from "../suggestions/stakingSuggestion";
import { deriveJupStakingSuggestion } from "../suggestions/jupStakingSuggestion";
import { JUP_MINT } from "../suggestions/productAssetOwnership";
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

/** Priced, truly-liquid native wallet SOL — the only source the SOL staking rule reviews. */
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

/** A priced direct-wallet JUP holding by the exact canonical mint — the only source JUP staking reviews. */
const walletJup = (uiAmount: number, priceUsd = 0.8): WalletPosition => ({
  id: "jup",
  source: "wallet",
  type: "token",
  symbol: "JUP",
  name: "Jupiter",
  mint: JUP_MINT,
  icon: "assets/icons/token/jup.svg",
  amount: String(Math.round(uiAmount * 1e6)),
  uiAmount,
  decimals: 6,
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

/**
 * Staking — production cards over truly-liquid wallet SOL (`deriveStakingSuggestion`, fee reserve kept)
 * AND direct-wallet JUP (`deriveJupStakingSuggestion`, Jupiter selected from governed product data).
 * SOL and JUP render as separate cards; the JUP cards disclose variable rewards (no fabricated APY).
 */
export function getStakingTestingFixtures(): CategoryTestingFixture[] {
  return [
    {
      id: "staking_sol_modest",
      label: "1. SOL Staking — modest liquid SOL above the fee reserve",
      card: deriveStakingSuggestion(inputs([liquidSol(4)], 10_000), GEN),
    },
    {
      id: "staking_sol_large",
      label: "2. SOL Staking — larger liquid SOL balance",
      card: deriveStakingSuggestion(inputs([liquidSol(12.5)], 12_000), GEN),
    },
    {
      id: "staking_jup_eligible",
      label: "3. JUP Staking — eligible direct-wallet JUP (Jupiter, variable rewards)",
      card: deriveJupStakingSuggestion(inputs([walletJup(650)], 9_000), GEN),
    },
    {
      id: "staking_jup_large",
      label: "4. JUP Staking — larger JUP balance (variable rewards, no fabricated APY)",
      card: deriveJupStakingSuggestion(inputs([walletJup(4200)], 12_000), GEN),
    },
    {
      id: "staking_sol_and_jup",
      label: "5. SOL + JUP held together — two separate staking cards (never aggregated)",
      // Both rules run over the same snapshot; the gallery shows the SOL card here and the JUP card in
      // case 3/4. This entry surfaces the JUP card from a mixed SOL+JUP wallet to prove no aggregation.
      card: deriveJupStakingSuggestion(inputs([liquidSol(6), walletJup(900)], 15_000), GEN),
    },
  ];
}

/**
 * portfolioCompletenessTestingFixtures — Step 17H.3. Deterministic, RPC-independent portfolio fixtures for
 * the /testing Portfolio Completeness gallery. Each fixture is rendered through PRODUCTION components and
 * the PRODUCTION completeness derivation (computePortfolioCompleteness) — no testing-only calculator.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import { deriveCompletenessGates, type PortfolioCompletenessResult, type CompletenessGateMap } from "../wallet/portfolioCompleteness";
import { SUPPORTED_LSTS } from "../wallet/lstUnderlyingNormalization";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const MSOL = SUPPORTED_LSTS.msol.mint;
const p = (o: Partial<WalletPosition>): WalletPosition => ({ id: "x", source: "wallet", type: "token", symbol: "X", amount: "1", detection: "direct_wallet_balance", valueUsd: 100, ...o });

const usdc = (v = 1000) => p({ id: "usdc", symbol: "USDC", name: "USD Coin", mint: USDC, valueUsd: v, priceUsd: 1, uiAmount: v, icon: "assets/icons/token/usdc.svg" });
const sol = () => p({ id: "sol", type: "native", symbol: "SOL", name: "Solana", valueUsd: 500, priceUsd: 250, uiAmount: 2, icon: "assets/icons/token/sol.svg" });
const unknownTok = () => p({ id: "unk", type: "token", symbol: "9xY…", name: "Unknown token", uiAmount: 5, valueUsd: null });
const jlusdc = () => p({ id: "jl", type: "protocol", symbol: "USDC", name: "Jupiter Lend USDC", protocol: "Jupiter Lend", candidateId: "jupiter_lend_usdc", existingPositionOnly: true, dedupeKey: "jupiter-lend:x", withdrawalState: "unresolved", recognizedValueUsd: null, valueUsd: null, uiAmount: 100, amount: "100000000", mint: USDC });
const msol = () => p({ id: "ms", type: "lst", symbol: "mSOL", name: "Marinade Staked SOL", protocol: "Marinade", mint: MSOL, valueUsd: 260, priceUsd: 260, uiAmount: 1, lstProductId: "msol", lstNormalizationState: "unsupported" });
const kaminoLiq = () => p({ id: "kd", type: "protocol", symbol: "USDC", name: "USDC on Kamino", protocol: "Kamino", candidateId: "kamino_usdc_lending", existingPositionOnly: true, dedupeKey: "klend:x", withdrawalState: "unresolved", recognizedValueUsd: 1000, valueUsd: 1000, liquidValueUsd: null, uiAmount: 1000, amount: "1000000000", mint: USDC });
const steakLiq = () => p({ id: "st", type: "protocol", symbol: "USDC", name: "Steakhouse USDC", protocol: "Kamino", candidateId: "kamino_steakhouse_usdc", existingPositionOnly: true, dedupeKey: "steakhouse:x", withdrawalState: "unresolved", recognizedValueUsd: 500, valueUsd: 500, liquidValueUsd: null, uiAmount: 500, amount: "500000000", mint: USDC });
const tok22 = () => p({ id: "t22", type: "token", symbol: "USDC", name: "USD Coin", mint: "USDCt22xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", valueUsd: 100, priceUsd: 1, uiAmount: 100, tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", withdrawalState: "unresolved", transferabilityState: "hook_unresolved" });
const debt = () => p({ id: "hb", type: "protocol", symbol: "USDH", name: "USDH loan", protocol: "Hubble", side: "borrowed", valueUsd: null, uiAmount: 300, amount: "300000000" });
const stake = () => p({ id: "stk", type: "stake", symbol: "SOL", name: "Native stake", protocol: "Native Stake", valueUsd: 1000, priceUsd: 250, uiAmount: 4, amount: "4000000000", liquidValueUsd: 100, liquidUnderlyingAmount: 0.4, stakeLifecycleState: "active", dedupeKey: "native-stake:A" });

export interface CompletenessTestingFixture {
  id: string;
  label: string;
  positions: WalletPosition[];
  requiredBufferUsd: number;
  completeness: PortfolioCompletenessResult;
  gates: CompletenessGateMap;
}

function fx(id: string, label: string, positions: WalletPosition[], requiredBufferUsd = 0): CompletenessTestingFixture {
  const { result, gates } = deriveCompletenessGates(positions, { requiredBufferUsd, evaluatedAt: "2026-07-18T00:00:00.000Z" });
  return { id, label, positions, requiredBufferUsd, completeness: result, gates };
}

/** The dedicated visual states (§6) — production derivation, production components. */
export function getPortfolioCompletenessTestingFixtures(): CompletenessTestingFixture[] {
  return [
    fx("complete", "1. Complete portfolio — total visible, no banner, On Track available", [sol(), usdc()]),
    fx("net_worth_unresolved", "2. Net worth unresolved — total “—”, net-worth banner, On Track unavailable", [sol(), unknownTok()]),
    fx("jupiter", "3. Jupiter Lend unresolved value — ownership visible, USD “—”", [usdc(), jlusdc()]),
    fx("unknown", "4. Unknown unpriced token — balance visible, USD “—”", [usdc(), unknownTok()]),
    fx("liability", "5. Unvalued liability — debt row, total “—”, On Track unavailable", [usdc(), debt()]),
    fx("liquidity", "6. Liquidity unresolved only — total visible, withdrawal warning", [usdc(), kaminoLiq()]),
    fx("kamino", "7. Kamino Direct recognized, liquidity unresolved", [usdc(), kaminoLiq()]),
    fx("steakhouse", "8. Steakhouse recognized, liquidity unresolved", [usdc(), steakLiq()]),
    fx("token2022", "9. Token-2022 transferability unresolved — value visible", [tok22(), sol()]),
    fx("sol_exposure", "10. SOL exposure unresolved only — mSOL value visible, backing “—”", [usdc(), msol()]),
    fx("native_stake", "11. Native stake partial withdrawal — value + available-to-withdraw", [usdc(), stake()]),
    fx("duplicate", "12. Genuine economic duplicate — invalid/dedup warning", [jlusdc(), { ...jlusdc(), id: "jl2" }]),
    fx("shared_mint", "13. Shared USDC mint (wallet + Kamino + Steakhouse) — NO duplicate warning", [usdc(), kaminoLiq(), steakLiq()]),
    fx("gate_inspector", "14. Future decision-gate inspector — testing information only (no cards)", [usdc(), msol(), debt()]),
  ];
}

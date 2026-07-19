/**
 * rebalanceTestingFixtures — Step 18D. Deterministic, RPC-independent portfolios for the /testing phase-one
 * Rebalance gallery. Each fixture is rendered through the PRODUCTION assessment + source selector + card
 * mapper (buildRebalanceCardFromAssessment) + one CANONICAL SafetyBufferCoverage — never a testing-only
 * calculator. No card is emitted for crypto_to_stables / within_threshold / unresolved (fail-closed).
 */
import type { WalletPosition } from "../wallet/walletPosition";
import { computeSafetyBufferCoverage } from "../wallet/safetyBufferCoverage";
import { deriveCompletenessGates } from "../wallet/portfolioCompleteness";
import { deriveRebalanceAssessment, selectRebalanceUsdcSource, isRebalanceMaterial, CANONICAL_USDC_MINT, type RebalanceAssessment, type RebalanceUsdcSource } from "../suggestions/rebalanceAssessment";
import { buildRebalanceCardFromAssessment } from "../suggestions/rebalanceSuggestion";
import type { EngineSuggestion } from "../suggestions/engineTypes";

const w = (o: Partial<WalletPosition>): WalletPosition => ({ id: "x", source: "wallet", type: "token", symbol: "X", amount: "1", detection: "direct_wallet_balance", valueUsd: 100, ...o });
const usdc = (v: number, id = "usdc") => w({ id, symbol: "USDC", name: "USD Coin", mint: CANONICAL_USDC_MINT, valueUsd: v, uiAmount: v, priceUsd: 1, icon: "assets/icons/token/usdc.svg" });
const sol = (v: number) => w({ id: "sol", type: "native", symbol: "SOL", name: "Solana", valueUsd: v, uiAmount: v / 250, priceUsd: 250, icon: "assets/icons/token/sol.svg" });
const kaminoStable = (v: number) => w({ id: "kd", type: "protocol", symbol: "USDC", name: "USDC on Kamino", protocol: "Kamino", candidateId: "kamino_usdc_lending", existingPositionOnly: true, dedupeKey: "klend:x", valueUsd: v, recognizedValueUsd: v, withdrawalState: "fully_withdrawable", liquidValueUsd: v, mint: CANONICAL_USDC_MINT });
const steak = (v: number) => w({ id: "st", type: "protocol", symbol: "USDC", name: "Steakhouse USDC", protocol: "Kamino", candidateId: "kamino_steakhouse_usdc", existingPositionOnly: true, dedupeKey: "steakhouse:x", valueUsd: v, recognizedValueUsd: v, withdrawalState: "fully_withdrawable", liquidValueUsd: v, mint: CANONICAL_USDC_MINT });
const jlusdc = () => w({ id: "jl", type: "protocol", symbol: "USDC", name: "Jupiter Lend USDC", protocol: "Jupiter Lend", candidateId: "jupiter_lend_usdc", existingPositionOnly: true, dedupeKey: "jupiter-lend:x", withdrawalState: "unresolved", recognizedValueUsd: null, valueUsd: null, uiAmount: 100, amount: "100000000", mint: CANONICAL_USDC_MINT });
const debt = (v: number | null) => w({ id: "hb", type: "protocol", symbol: "USDH", name: "USDH loan", protocol: "Hubble", side: "borrowed", valueUsd: v, uiAmount: 300, amount: "300000000" });
const lookalike = (v: number) => w({ id: "t22u", symbol: "USDC", name: "USD Coin", mint: "FakeUsdcMint111", valueUsd: v, tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" });

export interface RebalanceTestingFixture {
  id: string;
  label: string;
  positions: WalletPosition[];
  riskTolerance: string | undefined;
  requiredBufferUsd: number;
  assessment: RebalanceAssessment;
  source: RebalanceUsdcSource;
  card: EngineSuggestion | null;
  material: boolean;
  /** §9-state-20 — the canonical coverage shared by completeness + Rebalance (reuse inspector). */
  coverageIdentity: { requiredBufferUsd: number; verifiedLiquidStableValueUsd: number; sharedByCompletenessAndRebalance: boolean };
}

function fx(id: string, label: string, positions: WalletPosition[], riskTolerance: string | undefined, requiredBufferUsd: number, solFresh = true): RebalanceTestingFixture {
  const coverage = computeSafetyBufferCoverage(positions, requiredBufferUsd);
  const completeness = deriveCompletenessGates(positions, { requiredBufferUsd, bufferCoverage: coverage, evaluatedAt: "2026-07-18T00:00:00.000Z" });
  const assessment = deriveRebalanceAssessment({ positions, portfolioCompleteness: completeness.result, safetyBufferCoverage: coverage, riskTolerance, requiredBufferUsd, generatedAt: 1_700_000_000_000 });
  const source = selectRebalanceUsdcSource(positions, requiredBufferUsd, 1_700_000_000_000);
  const card = buildRebalanceCardFromAssessment(assessment, source, 250, solFresh, 1_700_000_000_000);
  return {
    id, label, positions, riskTolerance, requiredBufferUsd, assessment, source, card, material: isRebalanceMaterial(assessment),
    coverageIdentity: { requiredBufferUsd: coverage.requiredBufferUsd, verifiedLiquidStableValueUsd: coverage.verifiedLiquidStableValueUsd, sharedByCompletenessAndRebalance: true },
  };
}

export function getRebalanceTestingFixtures(): RebalanceTestingFixture[] {
  return [
    fx("full", "1. Full USDC → SOL correction (excess covers correction)", [sol(100), usdc(900)], "high", 100),
    fx("partial", "2. Partial USDC → SOL correction (excess < required, ≥ $50)", [sol(100), usdc(900)], "high", 500),
    fx("exact_50", "3. Exact $50 correction — card visible", [sol(100), usdc(550)], "high", 500),
    fx("below_50", "4. Below $50 excess — no card", [sol(100), usdc(540)], "high", 500),
    fx("all_reserved", "5. USDC fully reserved for Safety Buffer — no source, no card", [sol(100), usdc(300)], "high", 300),
    fx("multi_usdc", "6. Multiple direct USDC accounts — one aggregated source", [sol(100), usdc(500, "u1"), usdc(400, "u2")], "high", 100),
    fx("protocol_stable", "7. Protocol-held stable — counts in allocation, excluded from source", [sol(100), usdc(300), kaminoStable(600)], "high", 100),
    fx("kamino", "8. Kamino Direct stable — never a source", [sol(100), kaminoStable(900)], "high", 100),
    fx("steakhouse", "9. Steakhouse stable — never a source", [sol(100), steak(900)], "high", 100),
    fx("jupiter", "10. Jupiter unresolved value — calculation unresolved, no card", [sol(100), usdc(900), jlusdc()], "high", 100),
    fx("liability", "11. Unvalued liability — no card", [sol(100), usdc(900), debt(null)], "high", 100),
    fx("lookalike", "12. Canonical-USDC symbol lookalike — rejected as source", [sol(100), lookalike(900)], "high", 100),
    fx("crypto_to_stables", "13. crypto_to_stables material drift — no card, no legacy fallback", [sol(900), usdc(100)], "low", 0),
    fx("within_threshold", "15. Within threshold — no card, no conflict suppression", [sol(620), usdc(380)], "medium", 0),
    fx("stale_sol_price", "17b. Partial with stale SOL price — no approximate SOL units", [sol(100), usdc(900)], "high", 500, false),
  ];
}

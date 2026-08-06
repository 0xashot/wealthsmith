/**
 * rebalanceTestingFixtures — Step 18D. Deterministic, RPC-independent portfolios for the /testing phase-one
 * Rebalance gallery. Each fixture is rendered through the PRODUCTION assessment + source selector + card
 * mapper (buildRebalanceCardFromAssessment) + one CANONICAL SafetyBufferCoverage — never a testing-only
 * calculator. No card is emitted for crypto_to_stables / within_threshold / unresolved (fail-closed).
 */
import type { WalletPosition } from "../wallet/walletPosition";
import { computeSafetyBufferCoverage } from "../wallet/safetyBufferCoverage";
import { deriveCompletenessGates } from "../wallet/portfolioCompleteness";
import {
  deriveRebalanceAssessment, selectRebalanceUsdcSource, isRebalanceMaterial, isMaterialCryptoToStables,
  deriveNativeSolRebalanceSource, cryptoToStablesSourceGate,
  NATIVE_SOL_RESERVE_POLICY_MISSING, WRAPPED_SOL_MINT, REBALANCE_NATIVE_SOL_RESERVE_POLICY,
  CANONICAL_USDC_MINT,
  type RebalanceAssessment, type RebalanceUsdcSource, type Gate,
  type NativeSolRebalanceSourceAssessment, type NativeSolReservePolicy,
} from "../suggestions/rebalanceAssessment";
import { buildRebalanceCardFromAssessment } from "../suggestions/rebalanceSuggestion";
import { buildCanonicalTargetTestingScenario, testingGoal, type TestingMarketState } from "../suggestions/testing/canonicalTargetTestingScenario";
import type { CanonicalTargetAllocation } from "../suggestions/canonicalTargetAllocation";
import type { RebalanceTargetState } from "../suggestions/rebalanceAssessment";
import type { EngineSuggestion } from "../suggestions/engineTypes";

// Step 22F (slice 7B) — the visible /testing Rebalance gallery derives its target through the PRODUCTION five-factor
// chain (deterministic governed market → MarketConditionAssessment → TargetAllocationAssessment → canonical adapter).
// The default deterministic market is fresh Fear (score 39); a scenario may override it (Greed, stale/missing degraded).
const DEFAULT_TESTING_MARKET: TestingMarketState = { kind: "fresh", score: 39 };
const rbTestingTarget = (positions: WalletPosition[], riskTolerance: string | undefined, market: TestingMarketState = DEFAULT_TESTING_MARKET): CanonicalTargetAllocation | null => {
  const total = positions.reduce((s, p) => s + (typeof p.valueUsd === "number" && p.valueUsd > 0 ? p.valueUsd : 0), 0);
  const scenario = buildCanonicalTargetTestingScenario({ goal: testingGoal({ risk_tolerance: riskTolerance ?? "medium" }), totalPricedUsd: total > 0 ? total : null, market });
  return scenario.context.canonicalTargetAllocation;
};
const rbTargetState = (t: CanonicalTargetAllocation | null): RebalanceTargetState =>
  t == null ? "unavailable" : t.targetConfidence === "degraded_market_excluded" ? "degraded_market_excluded" : "full";

const w = (o: Partial<WalletPosition>): WalletPosition => ({ id: "x", source: "wallet", type: "token", symbol: "X", amount: "1", detection: "direct_wallet_balance", valueUsd: 100, ...o });
const usdc = (v: number, id = "usdc") => w({ id, symbol: "USDC", name: "USD Coin", mint: CANONICAL_USDC_MINT, valueUsd: v, uiAmount: v, priceUsd: 1, icon: "assets/icons/token/usdc.svg" });
const sol = (v: number) => w({ id: "sol", type: "native", symbol: "SOL", name: "Solana", valueUsd: v, uiAmount: v / 250, amount: String(Math.round((v / 250) * 1e9)), decimals: 9, priceUsd: 250, icon: "assets/icons/token/sol.svg" });
const kaminoStable = (v: number) => w({ id: "kd", type: "protocol", symbol: "USDC", name: "USDC on Kamino", protocol: "Kamino", candidateId: "kamino_usdc_lending", existingPositionOnly: true, dedupeKey: "klend:x", valueUsd: v, recognizedValueUsd: v, withdrawalState: "fully_withdrawable", liquidValueUsd: v, mint: CANONICAL_USDC_MINT });
const steak = (v: number) => w({ id: "st", type: "protocol", symbol: "USDC", name: "Steakhouse USDC", protocol: "Kamino", candidateId: "kamino_steakhouse_usdc", existingPositionOnly: true, dedupeKey: "steakhouse:x", valueUsd: v, recognizedValueUsd: v, withdrawalState: "fully_withdrawable", liquidValueUsd: v, mint: CANONICAL_USDC_MINT });
const jlusdc = () => w({ id: "jl", type: "protocol", symbol: "USDC", name: "Jupiter Lend USDC", protocol: "Jupiter Lend", candidateId: "jupiter_lend_usdc", existingPositionOnly: true, dedupeKey: "jupiter-lend:x", withdrawalState: "unresolved", recognizedValueUsd: null, valueUsd: null, uiAmount: 100, amount: "100000000", mint: CANONICAL_USDC_MINT });
const debt = (v: number | null) => w({ id: "hb", type: "protocol", symbol: "USDH", name: "USDH loan", protocol: "Hubble", side: "borrowed", valueUsd: v, uiAmount: 300, amount: "300000000" });
const lookalike = (v: number) => w({ id: "t22u", symbol: "USDC", name: "USD Coin", mint: "FakeUsdcMint111", valueUsd: v, tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" });
// A priced NON-stable, NON-SOL wallet token: counts as CRYPTO in allocation but is never a native-SOL source
// (lets a fixture drive a crypto_to_stables direction whose correction exceeds the native-SOL capacity → partial).
const otherCrypto = (v: number, id = "bonk") => w({ id, type: "token", symbol: "BONK", name: "Bonk", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", valueUsd: v, uiAmount: v, priceUsd: 1, decimals: 5 });
// Protocol-held SOL collateral (e.g. Kamino) — counts as crypto exposure but is NEVER a direct-wallet SOL source.
const solCollateral = (v: number) => w({ id: "kcol", type: "protocol", symbol: "SOL", name: "SOL on Kamino", protocol: "Kamino", candidateId: "kamino_sol_collateral", existingPositionOnly: true, dedupeKey: "klend:sol", valueUsd: v, recognizedValueUsd: v, withdrawalState: "fully_withdrawable", liquidValueUsd: v });

export interface RebalanceTestingFixture {
  id: string;
  label: string;
  positions: WalletPosition[];
  riskTolerance: string | undefined;
  requiredBufferUsd: number;
  assessment: RebalanceAssessment;
  source: RebalanceUsdcSource;
  /** 18F — the canonical native-SOL source (crypto→stables) derived over the same positions + approved reserve. */
  nativeSolSource: NativeSolRebalanceSourceAssessment;
  card: EngineSuggestion | null;
  material: boolean;
  /** §9-state-20 — the canonical coverage shared by completeness + Rebalance (reuse inspector). */
  coverageIdentity: { requiredBufferUsd: number; verifiedLiquidStableValueUsd: number; sharedByCompletenessAndRebalance: boolean };
}

function fx(id: string, label: string, positions: WalletPosition[], riskTolerance: string | undefined, requiredBufferUsd: number, solFresh = true, walletFresh = true, market: TestingMarketState = DEFAULT_TESTING_MARKET): RebalanceTestingFixture {
  const coverage = computeSafetyBufferCoverage(positions, requiredBufferUsd);
  const completeness = deriveCompletenessGates(positions, { requiredBufferUsd, bufferCoverage: coverage, evaluatedAt: "2026-07-18T00:00:00.000Z" });
  const rbTarget = rbTestingTarget(positions, riskTolerance, market);
  const assessment = deriveRebalanceAssessment({ positions, portfolioCompleteness: completeness.result, safetyBufferCoverage: coverage, targetAllocation: rbTarget, targetState: rbTargetState(rbTarget), requiredBufferUsd, generatedAt: 1_700_000_000_000 });
  const source = selectRebalanceUsdcSource(positions, requiredBufferUsd, 1_700_000_000_000);
  const solPrice = positions.find((p) => p.type === "native")?.priceUsd ?? 250;
  const nativeSolSource = deriveNativeSolRebalanceSource(positions, solPrice, solFresh, REBALANCE_NATIVE_SOL_RESERVE_POLICY, walletFresh, 1_700_000_000_000);
  const card = buildRebalanceCardFromAssessment(assessment, source, nativeSolSource, solPrice, solFresh, 1_700_000_000_000);
  return {
    id, label, positions, riskTolerance, requiredBufferUsd, assessment, source, nativeSolSource, card, material: isRebalanceMaterial(assessment),
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
    fx("protocol_stable", "7. Protocol-held stable — counts in allocation; wallet USDC preferred as the single source", [sol(100), usdc(300), kaminoStable(600)], "high", 100),
    fx("kamino", "8. Kamino Direct stable — two-step source (withdraw from Kamino, then swap)", [sol(100), kaminoStable(900)], "high", 100),
    fx("steakhouse", "9. Steakhouse stable — never a source", [sol(100), steak(900)], "high", 100),
    fx("jupiter", "10. Jupiter unresolved value — calculation unresolved, no card", [sol(100), usdc(900), jlusdc()], "high", 100),
    fx("liability", "11. Unvalued liability — no card", [sol(100), usdc(900), debt(null)], "high", 100),
    fx("lookalike", "12. Canonical-USDC symbol lookalike — rejected as source", [sol(100), lookalike(900)], "high", 100),
    fx("within_threshold", "13. Within threshold — no card, no conflict suppression", [sol(620), usdc(380)], "medium", 0),
    fx("stale_sol_price", "14. Partial USDC→SOL with stale SOL price — no approximate SOL units", [sol(100), usdc(900)], "high", 500, false),
    // ---- 18F: crypto_to_stables (direct-wallet native SOL → canonical USDC) ----
    fx("crypto_full", "15. Full SOL → USDC correction (available covers correction); 0.1 SOL reserve kept", [nativeSolPos(4), usdc(100)], "low", 0),
    fx("crypto_partial", "16. Partial SOL → USDC (native SOL < required correction, ≥ $50)", [nativeSolPos(2), otherCrypto(2000), usdc(100)], "low", 0),
    fx("crypto_exact_50", "17. Exact $50 native-SOL source — card visible", [nativeSolPos(0.3), otherCrypto(925), usdc(100)], "low", 0),
    fx("crypto_below_50", "18. Below $50 native-SOL source — no card", [nativeSolPos(0.25), otherCrypto(1000), usdc(100)], "low", 0),
    fx("sol_below_reserve", "19. Wallet SOL below 0.1 reserve — zero capacity, no card", [nativeSolPos(0.05), otherCrypto(1000), usdc(100)], "low", 0),
    fx("sol_exactly_reserve", "20. Wallet SOL exactly 0.1 — zero capacity, no card", [nativeSolPos(0.1), otherCrypto(1000), usdc(100)], "low", 0),
    fx("sol_above_reserve", "21. Wallet SOL above reserve — excess only", [nativeSolPos(1), usdc(100)], "low", 0),
    fx("crypto_stale_price", "22. Stale SOL price — units visible, USD source unresolved, no card", [nativeSolPos(4), usdc(100)], "low", 0, false),
    fx("crypto_stale_wallet", "23. Stale wallet balance — no card", [nativeSolPos(4), usdc(100)], "low", 0, true, false),
    fx("native_plus_active_stake", "24. Native SOL + active stake — stake excluded from source", [nativeSolPos(4), stakePos(3), usdc(100)], "low", 0),
    fx("native_plus_withdrawable_stake", "24b. Native SOL + immediately-withdrawable stake — stake still excluded", [nativeSolPos(4), withdrawableStakePos(3), usdc(100)], "low", 0),
    fx("duplicate_native", "28. Duplicate native SOL identity — fail closed, no card", [nativeSolPos(4, "n1"), nativeSolPos(4, "n2"), usdc(100)], "low", 0),
    fx("native_plus_lst", "25. Native SOL + LST — LST and backing excluded", [nativeSolPos(4), lstPos(3), usdc(100)], "low", 0),
    fx("native_plus_wsol", "26. Native SOL + wrapped SOL — wrapped SOL excluded", [nativeSolPos(4), wsolPos(3), usdc(100)], "low", 0),
    fx("native_plus_collateral", "27. Native SOL + protocol SOL collateral — collateral excluded", [nativeSolPos(4), solCollateral(3000), usdc(100)], "low", 0),
    // ---- Step 22F (slice 7B): production-derived MARKET-AWARE cases (full Greed → toward stables; degraded market-excluded) ----
    fx("greed_to_stables", "Greed target · Toward stables", [nativeSolPos(4), usdc(100)], "high", 0, true, true, { kind: "fresh", score: 80 }),
    fx("degraded_excluded", "Market data excluded · Toward crypto", [sol(100), usdc(900)], "medium", 100, true, true, { kind: "stale", score: 39 }),
  ];
}

/* ------------------------------------------------------------------ *
 * Step 18E — NON-MOUNTED direct-wallet native-SOL source foundation + crypto-overweight staking-conflict
 * policy. These states never render a Rebalance card (no crypto_to_stables card exists); they visualize the
 * fail-closed source assessment and the deterministic staking-suppression decision.
 * ------------------------------------------------------------------ */
const SOL_PRICE = 250;
const nativeSolPos = (uiSol: number, id = "nsol"): WalletPosition =>
  w({ id, type: "native", symbol: "SOL", name: "Solana", amount: String(Math.round(uiSol * 1e9)), uiAmount: uiSol, decimals: 9, priceUsd: SOL_PRICE, valueUsd: uiSol * SOL_PRICE, icon: "assets/icons/token/sol.svg" });
const stakePos = (uiSol: number): WalletPosition =>
  w({ id: "stk", type: "stake", symbol: "SOL", name: "Native stake", amount: String(Math.round(uiSol * 1e9)), uiAmount: uiSol, decimals: 9, detection: "native_stake", priceUsd: SOL_PRICE, valueUsd: uiSol * SOL_PRICE });
const withdrawableStakePos = (uiSol: number): WalletPosition =>
  w({ id: "stkw", type: "stake", symbol: "SOL", name: "Native stake (deactivating)", amount: String(Math.round(uiSol * 1e9)), uiAmount: uiSol, decimals: 9, detection: "native_stake", priceUsd: SOL_PRICE, valueUsd: uiSol * SOL_PRICE, liquidValueUsd: uiSol * SOL_PRICE, stakeLifecycleState: "deactivating" });
const lstPos = (uiSol: number): WalletPosition =>
  w({ id: "ms", type: "lst", source: "jito", symbol: "JitoSOL", name: "JitoSOL", mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", amount: String(Math.round(uiSol * 1e9)), uiAmount: uiSol, decimals: 9, detection: "recognized_lst_mint", priceUsd: SOL_PRICE + 20, valueUsd: uiSol * (SOL_PRICE + 20) });
const wsolPos = (uiSol: number): WalletPosition =>
  w({ id: "wsol", type: "token", symbol: "SOL", name: "Wrapped SOL", mint: WRAPPED_SOL_MINT, amount: String(Math.round(uiSol * 1e9)), uiAmount: uiSol, decimals: 9, priceUsd: SOL_PRICE, valueUsd: uiSol * SOL_PRICE });

/** An APPROVED reserve policy is supplied ONLY in the "what a future policy would unlock" preview state. */
const APPROVED_RESERVE: NativeSolReservePolicy = { state: "approved", requiredReserveLamports: 100_000_000, policyId: "preview_reserve_v1" };

export interface NativeSolSourceTestingFixture {
  id: string;
  label: string;
  assessment: NativeSolRebalanceSourceAssessment;
  futureGate: Gate;
}

function nsFx(id: string, label: string, positions: WalletPosition[], solPrice: number | null, solFresh: boolean, reserve: NativeSolReservePolicy, walletFresh: boolean): NativeSolSourceTestingFixture {
  const assessment = deriveNativeSolRebalanceSource(positions, solPrice, solFresh, reserve, walletFresh, 1_700_000_000_000);
  return { id, label, assessment, futureGate: cryptoToStablesSourceGate(assessment) };
}

export function getNativeSolSourceTestingFixtures(): NativeSolSourceTestingFixture[] {
  return [
    nsFx("reserve_missing", "1. Recognized native SOL, NO approved reserve → available = —, fail-closed", [nativeSolPos(10)], SOL_PRICE, true, NATIVE_SOL_RESERVE_POLICY_MISSING, true),
    nsFx("approved_preview", "2. Preview: an approved reserve would unlock verified availability", [nativeSolPos(10)], SOL_PRICE, true, APPROVED_RESERVE, true),
    nsFx("approved_below_min", "3. Approved reserve but < $50 available → future gate blocked", [nativeSolPos(0.2)], SOL_PRICE, true, APPROVED_RESERVE, true),
    nsFx("stake_excluded", "4. Native stake only → excluded (requires withdrawal), unavailable", [stakePos(10)], SOL_PRICE, true, APPROVED_RESERVE, true),
    nsFx("lst_excluded", "5. LST only → excluded (backing never source liquidity)", [lstPos(10)], SOL_PRICE, true, APPROVED_RESERVE, true),
    nsFx("wsol_excluded", "6. Wrapped SOL only → excluded (separate policy)", [wsolPos(10)], SOL_PRICE, true, APPROVED_RESERVE, true),
    nsFx("mixed", "7. Native + stake + LST + WSOL → only native recognized", [nativeSolPos(4), stakePos(3), lstPos(2), wsolPos(1)], SOL_PRICE, true, NATIVE_SOL_RESERVE_POLICY_MISSING, true),
    nsFx("stale_wallet", "8. Approved reserve but stale wallet balance → unresolved", [nativeSolPos(10)], SOL_PRICE, true, APPROVED_RESERVE, false),
    nsFx("stale_price", "9. Approved reserve but stale SOL price → price unresolved", [nativeSolPos(10)], SOL_PRICE, false, APPROVED_RESERVE, true),
    nsFx("no_native", "10. No direct-wallet native SOL → unavailable", [usdc(500)], SOL_PRICE, true, APPROVED_RESERVE, true),
  ];
}

export interface StakingConflictTestingFixture {
  id: string;
  label: string;
  direction: RebalanceAssessment["direction"];
  materialCryptoToStables: boolean;
  existingStakingEligible: boolean;
  newStakingAllowed: boolean;
}

/** Deterministic staking-suppression decision (newStakingAllowed = existingEligibility AND NOT materialCryptoToStables),
 *  keyed on a PRODUCTION-derived assessment direction — visualizes the crypto-overweight conflict policy. */
export function getStakingConflictTestingFixtures(): StakingConflictTestingFixture[] {
  const scenario = (id: string, label: string, positions: WalletPosition[], risk: string | undefined, buffer: number, existingStakingEligible: boolean): StakingConflictTestingFixture => {
    const coverage = computeSafetyBufferCoverage(positions, buffer);
    const completeness = deriveCompletenessGates(positions, { requiredBufferUsd: buffer, bufferCoverage: coverage, evaluatedAt: "2026-07-18T00:00:00.000Z" });
    const rbTgt = rbTestingTarget(positions, risk);
    const a = deriveRebalanceAssessment({ positions, portfolioCompleteness: completeness.result, safetyBufferCoverage: coverage, targetAllocation: rbTgt, targetState: rbTargetState(rbTgt), requiredBufferUsd: buffer, generatedAt: 1_700_000_000_000 });
    const materialCryptoToStables = isMaterialCryptoToStables(a);
    return { id, label, direction: a.direction, materialCryptoToStables, existingStakingEligible, newStakingAllowed: existingStakingEligible && !materialCryptoToStables };
  };
  return [
    scenario("conflict", "1. crypto_to_stables material need + idle SOL → staking SUPPRESSED", [sol(900), usdc(100)], "low", 0, true),
    scenario("stables_to_crypto", "2. stables_to_crypto + idle SOL → staking KEPT (directional)", [sol(100), usdc(900)], "high", 100, true),
    scenario("within", "3. Within threshold + idle SOL → staking KEPT", [sol(620), usdc(380)], "medium", 0, true),
    scenario("narrow", "4. crypto_to_stables but SOL not idle-eligible → still no staking (narrow only)", [sol(900), usdc(100)], "low", 0, false),
  ];
}

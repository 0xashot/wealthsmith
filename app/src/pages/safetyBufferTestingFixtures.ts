/**
 * safetyBufferTestingFixtures — Step 21C. Deterministic, RPC-independent Safety Buffer states for the /testing
 * gallery. Each fixture runs the PRODUCTION canonical coverage (`computeSafetyBufferCoverage`) and/or a canonical
 * coverage literal, the PRODUCTION assessment (`deriveSafetyBufferAssessment`), and the PRODUCTION card mapper
 * (`buildSafetyBufferCardFromAssessment`). The gallery renders the production SuggestionCard + SuggestionReviewModal.
 * No hand-built card, no testing-only financial logic.
 *
 * Honest by construction: a definite card amount is the CONFIRMED minimum shortfall (never the worst case, never a
 * plan amount); unresolved coverage shows NO definite amount; below-$50 is informational; target/coverage-unavailable
 * are informational. Coverage identity + verified-liquidity classification is unchanged (the real 17B methodology).
 */
import type { WalletPosition } from "../wallet/walletPosition";
import { computeSafetyBufferCoverage, type SafetyBufferCoverage } from "../wallet/safetyBufferCoverage";
import {
  deriveSafetyBufferAssessment,
  type SafetyBufferAssessment,
  type SafetyBufferContributionPlanInput,
} from "../suggestions/safetyBufferAssessment";
import { buildSafetyBufferCardFromAssessment } from "../suggestions/bufferSuggestion";
import type { EngineSuggestion } from "../suggestions/engineTypes";

const GEN = 1_700_000_000_000;
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

const w = (o: Partial<WalletPosition>): WalletPosition => ({ id: "x", source: "wallet", type: "token", symbol: "X", name: "X", amount: "1", detection: "direct_wallet_balance", valueUsd: 100, ...o });
const usdc = (v: number, id = "usdc") => w({ id, symbol: "USDC", name: "USD Coin", mint: USDC, amount: String(Math.round(v * 1e6)), uiAmount: v, decimals: 6, priceUsd: 1, valueUsd: v });
const usdt = (v: number, id = "usdt") => w({ id, symbol: "USDT", name: "Tether USD", mint: USDT, amount: String(Math.round(v * 1e6)), uiAmount: v, decimals: 6, priceUsd: 1, valueUsd: v });
const frozenT22 = (v: number) => w({ id: "t22", symbol: "USDC", name: "USDC (Token-2022)", mint: "Usdc2022Mint1111", amount: String(v), uiAmount: v, priceUsd: 1, valueUsd: v, withdrawalState: "currently_unavailable" });
const hookUnresolvedT22 = (v: number) => w({ id: "hook", symbol: "USDC", name: "USDC (hook)", mint: "UsdcHookMint1111", amount: String(v), uiAmount: v, priceUsd: 1, valueUsd: v, withdrawalState: "unresolved" });
const kaminoLiquid = (v: number) => w({ id: "kd", type: "protocol", symbol: "USDC", name: "USDC on Kamino", protocol: "Kamino", candidateId: "kamino_usdc_lending", existingPositionOnly: true, withdrawalState: "fully_withdrawable", recognizedValueUsd: v, liquidValueUsd: v, valueUsd: v, mint: USDC });
const steakhouseUnresolved = (v: number) => w({ id: "st", type: "protocol", symbol: "USDC", name: "Steakhouse USDC", protocol: "Kamino", candidateId: "kamino_steakhouse_usdc", existingPositionOnly: true, withdrawalState: "unresolved", recognizedValueUsd: v, valueUsd: v, mint: USDC });
const borrowed = (v: number) => w({ id: "hb", type: "protocol", symbol: "USDH", name: "USDH loan", side: "borrowed", valueUsd: v, uiAmount: 1, amount: "1" });

/** A canonical coverage literal for a precise interval state (no position reclassification). */
const cov = (o: { target: number; verified: number; unresolved?: number; unknownMag?: boolean; state: SafetyBufferCoverage["coverageState"] }): SafetyBufferCoverage => {
  const unresolved = o.unresolved ?? 0;
  return { requiredBufferUsd: o.target, recognizedStableValueUsd: o.verified + unresolved, verifiedLiquidStableValueUsd: o.verified, delayedStableValueUsd: 0, unavailableStableValueUsd: 0, unresolvedStableValueUsd: unresolved, hasUnknownUnresolvedMagnitude: o.unknownMag ?? false, shortfallUsd: Math.max(o.target - o.verified, 0), coverageRatio: o.target > 0 ? o.verified / o.target : 1, fullyFunded: o.state === "complete", coverageState: o.state, unresolvedReasons: [], sources: [] };
};

export interface SafetyBufferTestingFixture {
  id: string;
  label: string;
  assessment: SafetyBufferAssessment;
  card: EngineSuggestion | null;
}

function fx(id: string, label: string, coverage: SafetyBufferCoverage | null, expenses: number | null, months: number | null, plan?: SafetyBufferContributionPlanInput | null): SafetyBufferTestingFixture {
  const assessment = deriveSafetyBufferAssessment({ coverage, monthlyExpensesUsd: expenses, targetMonths: months, contributionPlan: plan ?? null, generatedAt: GEN });
  return { id, label, assessment, card: buildSafetyBufferCardFromAssessment(assessment, GEN) };
}
/** Coverage-class fixtures: run the REAL production coverage over positions, then the assessment + mapper. */
function fxReal(id: string, label: string, positions: WalletPosition[], expenses: number, months: number): SafetyBufferTestingFixture {
  const coverage = computeSafetyBufferCoverage(positions, expenses * months);
  const assessment = deriveSafetyBufferAssessment({ coverage, monthlyExpensesUsd: expenses, targetMonths: months, generatedAt: GEN });
  return { id, label, assessment, card: buildSafetyBufferCardFromAssessment(assessment, GEN) };
}

export function getSafetyBufferTestingFixtures(): SafetyBufferTestingFixture[] {
  return [
    // ---- Target availability ----
    fx("target_missing", "1. Missing target inputs (no risk/months) → informational setup state", cov({ target: 3000, verified: 100, state: "incomplete" }), 1000, null),
    fx("target_missing_expenses", "2. Missing monthly expenses → informational setup state", cov({ target: 3000, verified: 100, state: "incomplete" }), null, 3),
    fx("target_zero_expenses", "3. Zero expenses → informational setup state", null, 0, 3),
    fx("target_low", "4. Valid low-risk 6-month target ($6,000)", cov({ target: 6000, verified: 4000, state: "incomplete" }), 1000, 6),
    fx("target_medium", "5. Valid medium-risk 3-month target ($3,000)", cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3),
    fx("target_high", "6. Valid high-risk 1-month target ($1,000)", cov({ target: 1000, verified: 400, state: "incomplete" }), 1000, 1),

    // ---- Complete ----
    fx("complete_exact", "7. Verified coverage exactly at target → no card", cov({ target: 3000, verified: 3000, state: "complete" }), 1000, 3),
    fx("complete_above", "8. Verified coverage above target → no card", cov({ target: 3000, verified: 4200, state: "complete" }), 1000, 3),

    // ---- Definite incomplete ----
    fx("definite_no_unresolved", "9. No unresolved value → confirmed gap = worst-case ($1,000)", cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3),
    fx("definite_range", "10. Known unresolved still insufficient → confirmed $500 vs worst-case $1,000 (range)", cov({ target: 3000, verified: 2000, unresolved: 500, state: "incomplete" }), 1000, 3),
    fx("definite_exact_50", "11. Confirmed gap exactly $50 → review-only actionable", cov({ target: 3000, verified: 2950, state: "incomplete" }), 1000, 3),
    fx("definite_below_50", "12. Confirmed gap $49.99 → informational 'nearly funded'", cov({ target: 3000, verified: 2950.01, state: "incomplete" }), 1000, 3),
    fx("definite_large", "13. Large confirmed gap ($2,200)", cov({ target: 3000, verified: 800, state: "incomplete" }), 1000, 3),
    fx("definite_cents", "14. Cents preserved (verified $2,900.50, target $3,000.25 → $99.75)", cov({ target: 3000.25, verified: 2900.50, state: "incomplete" }), 1000.0833333, 3),

    // ---- Plan-backed ----
    fx("plan_full", "15. Plan-backed: next contribution fully covers the confirmed gap", cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3, { planIsReady: true, planIsRange: false, plannedContributionUsd: 1000 }),
    fx("plan_partial", "16. Plan-backed partial: primary amount stays the confirmed gap, remaining shown separately", cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3, { planIsReady: true, planIsRange: false, plannedContributionUsd: 400 }),
    fx("plan_range", "17. Plan-backed contribution range", cov({ target: 3000, verified: 2000, state: "incomplete" }), 1000, 3, { planIsReady: true, planIsRange: true, plannedContributionMinUsd: 200, plannedContributionMaxUsd: 600 }),

    // ---- Unresolved ----
    fx("unresolved_closes", "18. Known unresolved value could exactly close target → no definite amount", cov({ target: 3000, verified: 2000, unresolved: 1000, state: "unresolved" }), 1000, 3),
    fx("unresolved_exceeds", "19. Known unresolved value could exceed target → no definite amount", cov({ target: 3000, verified: 2000, unresolved: 1500, state: "unresolved" }), 1000, 3),
    fx("unresolved_unknown", "20. Unknown unresolved magnitude → exact gap could not be determined", cov({ target: 3000, verified: 2000, unknownMag: true, state: "unresolved" }), 1000, 3),
    fx("unresolved_plan", "21. Unresolved + plan metadata → plan never presented as required", cov({ target: 3000, verified: 2000, unresolved: 1000, state: "unresolved" }), 1000, 3, { planIsReady: true, planIsRange: false, plannedContributionUsd: 1000 }),

    // ---- Coverage classes (REAL production coverage) ----
    fxReal("class_usdc", "22. Direct-wallet canonical USDC counts in full", [usdc(2000)], 1000, 3),
    fxReal("class_usdt", "23. Direct-wallet canonical USDT counts in full", [usdt(2000)], 1000, 3),
    fxReal("class_frozen_t22", "24. Frozen Token-2022 stable → 0 verified (excluded), definite gap", [usdc(1000), frozenT22(2000)], 1000, 3),
    fxReal("class_hook_unresolved", "25. Transfer-hook unresolved stable → coverage unresolved (no definite gap)", [usdc(1000), hookUnresolvedT22(2500)], 1000, 3),
    fxReal("class_kamino_liquid", "26. Kamino verified-withdrawable principal counts", [usdc(1000), kaminoLiquid(2500)], 1000, 3),
    fxReal("class_steakhouse", "27. Steakhouse recognized value unresolved → coverage unresolved", [usdc(1000), steakhouseUnresolved(2500)], 1000, 3),
    fxReal("class_borrowed", "28. Borrowed stablecoin never counts (excluded)", [usdc(2000), borrowed(5000)], 1000, 3),
    fxReal("class_complete_usdc", "29. Enough direct USDC → complete, no card", [usdc(3200)], 1000, 3),
  ];
}

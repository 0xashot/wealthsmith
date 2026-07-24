/**
 * positionOptimizationTestingFixtures — Step 20C/20D. Deterministic, RPC-independent portfolios for the
 * /testing Position Optimization gallery. Each fixture runs the PRODUCTION canonical assessment
 * (`derivePositionOptimizationAssessment`) + production card mapper (`buildPositionOptimizationCardFromAssessment`);
 * the gallery renders the production SuggestionCard + SuggestionReviewModal. No testing-only card and no
 * testing-only financial logic.
 *
 * A card is emitted ONLY when the assessment is ready (accounting + scope + review-confidence + overall
 * readiness allowed), ≥ 1 trigger family is proven, and the total unique flagged value ≥ $100. It is review-only:
 * no position is selected, no protocol is proposed, nothing is exited/switched/withdrawn/unstaked/closed, and no
 * route/quote/transaction/signature is ever produced.
 *
 * APY governance: production LST/Ondo APY has NO approved freshness policy, so low-yield is unreachable in mounted
 * production — a below-1% sourced value stays informational (freshness-unverified). The low-yield / stale / fresh
 * states below are reachable ONLY through a FIXTURE-ONLY approved policy (`TEST_LST_POLICY`) that lives here in
 * testing infrastructure, requires an exact source + methodology match, and is NEVER imported into mounted
 * real-wallet production or the production policy registry.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import { TOKEN_2022_PROGRAM_ID } from "../wallet/walletPosition";
import {
  derivePositionOptimizationAssessment,
  type PositionOptimizationAssessment,
  type PoApyFreshnessPolicy,
} from "../suggestions/positionOptimizationAssessment";
import { buildPositionOptimizationCardFromAssessment } from "../suggestions/positionOptimizationSuggestion";
import type { EngineSuggestion } from "../suggestions/engineTypes";

const GEN = 1_700_000_000_000;
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const JITOSOL = "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn";
const MSOL = "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So";
const FRESH_OBS = new Date(GEN).toISOString();
const STALE_OBS = new Date(GEN - 48 * 60 * 60 * 1000).toISOString();

// FIXTURE-ONLY approved freshness policy. Never exported to production; the production registry stays unapproved.
const TEST_LST_POLICY: PoApyFreshnessPolicy = {
  sourceId: "lst_apy_feed", methodology: "lst_net_apy", policyState: "approved", freshnessSignal: "source_observed_at",
  maxObservationAgeMs: 6 * 60 * 60 * 1000, evidenceSource: "FIXTURE-ONLY test policy", approvedAt: "2026-01-01T00:00:00.000Z",
  methodologyVersion: "test", invalidationReason: null,
};

const w = (o: Partial<WalletPosition>): WalletPosition => ({ id: "x", source: "wallet", type: "token", symbol: "X", name: "X", amount: "1", detection: "direct_wallet_balance", valueUsd: 100, ...o });
const usdc = (v: number, id = "usdc") => w({ id, symbol: "USDC", name: "USD Coin", mint: USDC, amount: String(Math.round(v * 1e6)), uiAmount: v, decimals: 6, priceUsd: 1, valueUsd: v, icon: "assets/icons/token/usdc.svg" });
const lst = (v: number, mint = JITOSOL, apy: number | null = 7, id = "lst", obs: string | null = null) => w({ id, type: "lst", source: "jito", symbol: mint === MSOL ? "mSOL" : "JitoSOL", name: mint === MSOL ? "Marinade Staked SOL" : "Jito Staked SOL", mint, amount: "1", uiAmount: 1, detection: "recognized_lst_mint", valueUsd: v, apy, apyObservedAt: obs });
const msolUnsupported = (v: number, id = "msu") => w({ id, type: "lst", symbol: "mSOL", name: "Marinade Staked SOL", mint: MSOL, amount: "1", uiAmount: 1, detection: "recognized_lst_mint", valueUsd: v, lstNormalizationState: "unsupported", apy: null });
const stakeSummary = (lifecycle: string, account = "stakeAcc1") => ({ voteAccount: "V", totalLamports: "1", activeLamports: lifecycle === "active" ? "1" : "0", activatingLamports: lifecycle === "activating" ? "1" : "0", deactivatingLamports: lifecycle === "deactivating" ? "1" : "0", inactiveLamports: lifecycle === "inactive" ? "1" : "0", rentExemptReserveLamports: "0", immediatelyWithdrawableLamports: lifecycle === "withdrawable" ? "1" : "0", closeOnlyWithdrawableLamports: "0", requiredRemainingLamports: "0", lockedLamports: lifecycle === "locked" ? "1" : "0", unresolvedLamports: lifecycle === "unresolved" ? "1" : "0", lifecycleSummary: lifecycle, withdrawalCapacitySummary: "", anyUnresolved: lifecycle === "unresolved", accountCount: 1, stakeAccounts: [account] });
const stake = (v: number, lifecycle = "active", id = "stk", account = "stakeAcc1") => w({ id, type: "stake", symbol: "SOL", name: "Native stake", detection: "native_stake", amount: "1", uiAmount: v / 250, valueUsd: v, stakeLifecycleState: lifecycle, stake: stakeSummary(lifecycle, account) as WalletPosition["stake"], manageUrl: "https://solscan.io/account/Vote111111111111111111111111111111111111111" });
const kaminoUsdc = (v: number, id = "kd", dk = "klend:1") => w({ id, type: "protocol", symbol: "USDC", name: "USDC on Kamino", protocol: "Kamino", candidateId: "kamino_usdc_lending", dedupeKey: dk, valueUsd: v, recognizedValueUsd: v, withdrawalState: "fully_withdrawable", liquidValueUsd: v, mint: USDC, apy: null });
const steakUsdc = (v: number, id = "st", dk = "steakhouse:1") => w({ id, type: "protocol", symbol: "USDC", name: "Steakhouse USDC", protocol: "Kamino", candidateId: "kamino_steakhouse_usdc", dedupeKey: dk, valueUsd: v, recognizedValueUsd: v, withdrawalState: "fully_withdrawable", liquidValueUsd: v, mint: USDC, apy: null });
const usdtSupply = (v: number, id = "kt", dk = "klend:t") => w({ id, type: "protocol", symbol: "USDT", name: "USDT on Kamino", protocol: "Kamino", candidateId: "kamino_usdc_lending", dedupeKey: dk, valueUsd: v, recognizedValueUsd: v, withdrawalState: "fully_withdrawable", liquidValueUsd: v, mint: USDT, apy: null });
// A genuine Token-2022 "USDC" lookalike is a DISTINCT mint under the Token-2022 program — never the canonical
// classic-SPL USDC mint. Exact mint + token-program identity keeps it out of the real USDC exposure group.
const t22Usdc = (v: number, id = "t22") => w({ id, type: "protocol", symbol: "USDC", name: "USDC-2022 lookalike", protocol: "Kamino", candidateId: "kamino_usdc_lending", dedupeKey: "klend:t22", valueUsd: v, recognizedValueUsd: v, withdrawalState: "fully_withdrawable", liquidValueUsd: v, mint: "Usdc2022Lookalike1111", tokenProgram: TOKEN_2022_PROGRAM_ID, apy: null });
const fakeUsdcSupply = (v: number, id = "fk") => w({ id, type: "protocol", symbol: "USDC", name: "USDC (wrong mint)", protocol: "Kamino", candidateId: "kamino_usdc_lending", dedupeKey: "klend:fake", valueUsd: v, recognizedValueUsd: v, withdrawalState: "fully_withdrawable", liquidValueUsd: v, mint: "FakeUsdcMint1111", apy: null });
const lp = (v: number, id = "lp") => w({ id, type: "protocol", symbol: "SOL-USDC", name: "SOL-USDC LP", protocol: "Orca", legs: [{ mint: "SoLLeg", uiAmount: v / 500, side: "long" }, { mint: USDC, uiAmount: v / 2, side: "long" }], valueUsd: v, dedupeKey: "orca:lp1" });
const lpUnresolved = (v: number, id = "lpu") => w({ id, type: "protocol", symbol: "SOL-USDC", name: "SOL-USDC LP", protocol: "Orca", legs: [{ mint: "SoLLeg", uiAmount: null as unknown as number, side: "long" }, { mint: USDC, uiAmount: null as unknown as number, side: "long" }], valueUsd: v, dedupeKey: "orca:lpu" });
const debt = (v: number | null) => w({ id: "hb", type: "protocol", symbol: "USDH", name: "USDH loan", protocol: "Hubble", side: "borrowed", valueUsd: v, uiAmount: 1, amount: "1", dedupeKey: "hubble:loan" });
const unknownTok = (v: number) => w({ id: "unk", symbol: "9x", name: "Unknown token", mint: "UnkMint", type: "protocol", uiAmount: v, amount: String(v), valueUsd: v, recognizedValueUsd: null, withdrawalState: "unresolved" });
const staleProto = (v: number) => w({ id: "sp", type: "protocol", symbol: "USDC", name: "USDC on Kamino (stale)", protocol: "Kamino", candidateId: "kamino_usdc_lending", dedupeKey: "klend:stale", valueUsd: v, recognizedValueUsd: v, withdrawalState: "stale", mint: USDC });

export interface PositionOptimizationTestingFixture {
  id: string;
  label: string;
  positions: WalletPosition[];
  requiredBufferUsd: number;
  policies?: readonly PoApyFreshnessPolicy[];
  assessment: PositionOptimizationAssessment;
  card: EngineSuggestion | null;
}

function fx(id: string, label: string, positions: WalletPosition[], opts: { requiredBufferUsd?: number; policies?: readonly PoApyFreshnessPolicy[] } = {}): PositionOptimizationTestingFixture {
  const requiredBufferUsd = opts.requiredBufferUsd ?? 500;
  const assessment = derivePositionOptimizationAssessment({ positions, requiredBufferUsd, generatedAt: GEN, apyFreshnessPolicies: opts.policies });
  const card = buildPositionOptimizationCardFromAssessment(assessment, GEN);
  return { id, label, positions, requiredBufferUsd, policies: opts.policies, assessment, card };
}
const withPolicy = { policies: [TEST_LST_POLICY] as const };

export function getPositionOptimizationTestingFixtures(): PositionOptimizationTestingFixture[] {
  return [
    // ============ Triggers (each family proven independently) ============
    fx("concentration", "1. Concentration — single position ≥ 50% of gross assets", [usdc(1000), lst(1500, JITOSOL, 7)]),
    fx("missing_apy_100", "2. Missing expected APY at exactly $100 (missing-data review)", [usdc(5000), lst(100, JITOSOL, null)]),
    fx("shared_jito_msol", "3. Shared SOL underlying — JitoSOL + mSOL (NOT an economic duplicate)", [usdc(2000), lst(300, JITOSOL, 7, "j"), lst(300, MSOL, 7, "m")]),
    fx("freshness_unverified_conc", "4. Sub-1% sourced LST + concentration — informational, never low-yield", [usdc(1000), lst(1500, JITOSOL, 0.5)]),
    fx("all_triggers", "5. Missing APY + concentration + shared exposure — counted once", [usdc(500), lst(1500, JITOSOL, null, "j"), lst(300, MSOL, 7, "m")]),

    // ============ APY governance & display states ============
    fx("freshness_unverified_only", "6. Freshness-unverified numeric APY only, small share — NO card", [usdc(5000), lst(300, JITOSOL, 4)]),
    fx("source_not_integrated_only", "7. Source-not-integrated (native stake) only, small share — NO card", [usdc(5000), stake(300)]),
    fx("unsupported_only", "8. Unsupported methodology (LP) only, small share — NO card", [usdc(5000), lp(300)]),
    fx("prod_low_apy_no_trigger", "9. PRODUCTION LST at 0.5% (no approved policy) — freshness-unverified, NO low-yield", [usdc(5000), lst(300, JITOSOL, 0.5)]),
    fx("policy_fresh_low_yield", "10. Fixture-policy FRESH APY 0.5% ≥ $100 → low-yield review", [usdc(2000), lst(300, JITOSOL, 0.5, "lst", FRESH_OBS)], withPolicy),
    fx("policy_fresh_zero_yield", "11. Fixture-policy FRESH APY 0.0% → low-yield review", [usdc(2000), lst(300, JITOSOL, 0, "lst", FRESH_OBS)], withPolicy),
    fx("policy_fresh_exactly_1pct", "12. Fixture-policy FRESH APY exactly 1.0%, small share → NO low-yield card", [usdc(5000), lst(300, JITOSOL, 1, "lst", FRESH_OBS)], withPolicy),
    fx("policy_stale_conc", "13. Fixture-policy STALE APY + concentration — data-quality review, never low-yield", [usdc(1000), lst(1500, JITOSOL, 0.5, "lst", STALE_OBS)], withPolicy),
    fx("missing_apy_conc", "14. Missing expected APY + concentration — both reasons, counted once", [usdc(500), lst(1500, JITOSOL, null)]),

    // ============ Concentration boundaries ============
    fx("conc_exact_boundary", "15. Concentration exact — value $1,000 at exactly 50% of gross", [usdc(1000), lst(1000, JITOSOL, 7)]),
    fx("conc_below_value", "16. Just below $1,000 concentration value — NO card", [usdc(1000), lst(999, JITOSOL, 7)]),
    fx("conc_below_share", "17. Just below 50% share — NO card", [usdc(1600), lst(1500, JITOSOL, 7)]),
    fx("conc_active_stake", "18. Concentrated active native stake — 'Yield comparison not available'", [usdc(1000), stake(1500, "active")]),
    fx("conc_protocol_supply", "19. Concentrated protocol supply (unsupported APY) — reviewed by share", [usdc(1000), kaminoUsdc(1500)]),

    // ============ Shared underlying exposure ============
    fx("shared_stake_lst", "20. Active native stake + JitoSOL — shared SOL group, still separate positions", [usdc(2000), stake(300, "active"), lst(300, JITOSOL, 7)]),
    fx("shared_cross_protocol_usdc", "21. Cross-protocol exact USDC supply — Kamino + Steakhouse shared group", [usdc(2000), kaminoUsdc(300), steakUsdc(300)]),
    fx("usdc_usdt_separate", "22. USDC and USDT stay separate (different mints) — NO false group, NO card", [usdc(2000), kaminoUsdc(300), usdtSupply(300)]),
    fx("fake_usdc_no_group", "23. Fake-USDC (wrong mint) does not join the USDC group — NO card", [usdc(2000), kaminoUsdc(300), fakeUsdcSupply(300)]),
    fx("t22_usdc_separate", "24. Token-2022 USDC lookalike stays separate from classic USDC — NO card", [usdc(2000), kaminoUsdc(300), t22Usdc(300)]),
    fx("shared_member_50", "25. Shared exposure — exact $50 member boundary", [usdc(2000), lst(200, JITOSOL, 7, "j"), lst(50, MSOL, 7, "m")]),
    fx("shared_group_250", "26. Shared exposure — exact $250 group / 5% share boundary", [usdc(2750), lst(125, JITOSOL, 7, "j"), lst(125, MSOL, 7, "m")]),
    fx("shared_one_member", "27. Only one SOL LST — no second member, NO shared card", [usdc(2000), lst(300, JITOSOL, 7)]),
    fx("shared_lp_unresolved", "28. LP with unresolved legs — no fabricated exposure group", [usdc(2000), lpUnresolved(300), lst(300, JITOSOL, 7)]),
    fx("shared_freshness_unverified", "29. Shared exposure + freshness-unverified APY — shared review + freshness limitation", [usdc(2000), lst(300, JITOSOL, 0.5, "j"), lst(300, MSOL, 0.5, "m")]),

    // ============ Economic identity & accounting ============
    fx("two_stakes", "30. Two distinct stake accounts — two positions, not duplicates", [usdc(1000), stake(1500, "active", "s1", "acc1"), stake(400, "active", "s2", "acc2")]),
    fx("duplicate_stake", "31. Same stake account counted twice → fails closed, NO card", [usdc(1000), stake(1500, "active", "s1", "acc1"), stake(1500, "active", "s2", "acc1")]),
    fx("duplicate_obligation", "32. Duplicate protocol obligation (same product+dedupe key) → fails closed, NO card", [usdc(1000), kaminoUsdc(1500, "k1", "klend:dup"), kaminoUsdc(1500, "k2", "klend:dup")]),
    fx("debt_excluded", "33. Borrowed position excluded from review; asset concentration still fires", [usdc(1000), lst(1500, JITOSOL, 7), debt(600)]),
    fx("borrow_only", "34. Borrow-only portfolio — no yield-review candidate, NO card", [usdc(2000), debt(1500)]),
    fx("liability_unresolved", "35. Unresolved liability — readiness blocked, NO card", [usdc(1000), lst(1500, JITOSOL, 7), debt(null)]),
    fx("unknown_value", "36. Unknown positive value present, no independent trigger — NO card (nothing fabricated)", [usdc(2000), lst(300, JITOSOL, 7), unknownTok(400)]),
    fx("stale_value", "37. Stale position value present, no independent trigger — NO card", [usdc(2000), lst(300, JITOSOL, 7), staleProto(400)]),
    fx("msol_backing_unresolved", "38. mSOL backing unresolved but concentration still reviewed (unrelated unresolved value does not block)", [usdc(1000), lst(1500, JITOSOL, 7), msolUnsupported(260)]),

    // ============ Lifecycle ============
    fx("lifecycle_active", "39. Active native stake concentration — lifecycle 'Active'", [usdc(1000), stake(1500, "active")]),
    fx("lifecycle_activating", "40. Activating native stake concentration — no assumed full current yield", [usdc(1000), stake(1500, "activating")]),
    fx("lifecycle_deactivating", "41. Deactivating native stake — excluded from concentration (unwinding), NO card", [usdc(1000), stake(1500, "deactivating")]),
    fx("lifecycle_withdrawable", "42. Withdrawable native stake — not an active-yield candidate, NO card", [usdc(1000), stake(1500, "withdrawable")]),
    fx("lifecycle_inactive", "43. Inactive native stake — not an active yield position, NO card", [usdc(1000), stake(1500, "inactive")]),
    fx("lifecycle_unresolved", "44. Unresolved lifecycle — never defaults to active, NO card", [usdc(1000), stake(1500, "unresolved")]),

    // ============ No-card / fail-closed baselines ============
    fx("healthy", "45. Supported LST at 7%, small share — no trigger, NO card", [usdc(2000), lst(300, JITOSOL, 7)]),
    fx("below_floor", "46. Flagged value below $100 — NO card", [usdc(2000), lst(80, JITOSOL, null)]),
    fx("buffer_incomplete", "47. Safety Buffer incomplete — accounting blocked, NO card", [usdc(100), lst(1500, JITOSOL, 7)], { requiredBufferUsd: 2000 }),
  ];
}

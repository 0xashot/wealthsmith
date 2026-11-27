/**
 * trimTestingFixtures — Step 19C. Deterministic, RPC-independent portfolios for the /testing Trim gallery.
 * Each fixture runs the PRODUCTION canonical assessment (`deriveTrimAssessment`) + production card mapper
 * (`buildTrimCardFromAssessment`); the gallery renders the production SuggestionCard + SuggestionReviewModal.
 * No testing-only Trim card and no testing-only financial logic. No card is emitted unless the assessment is
 * ready and a trigger fires (fail-closed on stale / unresolved / incomplete-buffer / below-threshold states).
 */
import type { WalletPosition } from "../wallet/walletPosition";
import { TOKEN_2022_PROGRAM_ID } from "../wallet/walletPosition";
import { deriveTrimAssessment, type TrimAssessment } from "../suggestions/trimAssessment";
import { buildTrimCardFromAssessment } from "../suggestions/trimSuggestion";
import type { EngineSuggestion } from "../suggestions/engineTypes";
import { splitCountedPositions } from "../wallet/verifiedTokenIdentity";

const GEN = 1_700_000_000_000;
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";

const w = (o: Partial<WalletPosition>): WalletPosition => ({ id: "x", source: "wallet", type: "token", symbol: "X", name: "X", amount: "1", detection: "direct_wallet_balance", valueUsd: 100, ...o });
const usdc = (v: number, id = "usdc") => w({ id, symbol: "USDC", name: "USD Coin", mint: USDC, amount: String(Math.round(v * 1e6)), uiAmount: v, decimals: 6, priceUsd: 1, valueUsd: v, icon: "assets/icons/token/usdc.svg" });
const tok = (v: number, id: string, mint = `Mint-${id}`, raw?: string) => w({ id, symbol: `TK${id}`, name: `Token ${id}`, mint, amount: raw ?? String(Math.max(1, Math.round(v))), uiAmount: v, decimals: 0, priceUsd: 1, valueUsd: v });
const wsol = (v: number) => w({ id: "wsol", symbol: "SOL", name: "Wrapped SOL", mint: WSOL, amount: String(Math.round(v * 1e9)), uiAmount: v, decimals: 9, priceUsd: 1, valueUsd: v });
// A spoofed USDC — symbol claims "USDC" but the mint is non-canonical, so Trim classifies it by mint as
// non-core. Labeled "Fake USDC" so the gallery card reads clearly ("Swap $X of Fake USDC to USDC") instead
// of the confusing "USDC to USDC". Identity (the wrong mint) is what makes it a Trim candidate, not the label.
const fakeUsdc = (v: number) => w({ id: "fakeusdc", symbol: "Fake USDC", name: "Fake USDC", mint: "FakeUSDCMint1111", amount: String(v), uiAmount: v, decimals: 6, priceUsd: 1, valueUsd: v });
const t22 = (v: number, state: string, id = "t22") => w({ id, symbol: `TX${id}`, name: `T22 ${id}`, mint: `T22Mint-${id}`, tokenProgram: TOKEN_2022_PROGRAM_ID, transferabilityState: state, amount: String(Math.round(v)), uiAmount: v, decimals: 0, priceUsd: 1, valueUsd: v, liquidValueUsd: state === "transferable" ? v : 0 });
const staleTok = (v: number) => w({ id: "st", symbol: "TKst", name: "Stale token", mint: "StaleMint", amount: String(v), uiAmount: v, decimals: 0, priceUsd: 1, valueUsd: v, withdrawalState: "stale" });
// Tokens the registry cannot name (symbol = shortened address, name "Unknown token"), with and without a
// verified listing. `meme` is Jupiter's own tag — the one fact about a listing the engine may act on.
const PENGU = "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv";
const FARTCOIN = "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump";
const PYUSD = "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo";
const JUP_ICON = "https://static.datapi.jup.ag/token-icons/108a00de537962c1ee525997222af5639243507d92d4a7a116deb77226f7bf87.webp";
const FART_ICON = "https://static.datapi.jup.ag/token-icons/9143de2479fd1d3cb732b764234b75fd68a505993b7ff091d20eace5147452d2.webp";
const unlisted = (v: number, id: string, mint = `Unlisted1111111111111111111111111111${id}`) =>
  w({ id, symbol: `${mint.slice(0, 4)}…${mint.slice(-4)}`, name: "Unknown token", mint, amount: String(Math.round(v * 1e6)), uiAmount: v, decimals: 6, priceUsd: 1, valueUsd: v });
const PUMP = "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn";
const listed = (v: number, id: string, mint: string, symbol: string, name: string, meme: boolean, iconUrl: string | null = JUP_ICON, stable = false) =>
  ({ ...unlisted(v, id, mint), listing: { symbol, name, iconUrl, meme, stable, source: "jupiter_verified" as const } });
const unknownTok = () => w({ id: "unk", symbol: "9x", name: "Unknown token", mint: "UnkMint", uiAmount: 5, amount: "5", valueUsd: null });
const jlusdc = () => w({ id: "jl", type: "protocol", symbol: "USDC", name: "Jupiter Lend USDC", candidateId: "jupiter_lend_usdc", dedupeKey: "jupiter-lend:x", withdrawalState: "unresolved", recognizedValueUsd: null, valueUsd: null, uiAmount: 100, amount: "100000000", mint: USDC });
const debt = (v: number | null) => w({ id: "hb", type: "protocol", symbol: "USDH", name: "USDH loan", side: "borrowed", valueUsd: v, uiAmount: 1, amount: "1" });
const kaminoUnresolved = (v: number) => w({ id: "kd", type: "protocol", symbol: "USDC", name: "USDC on Kamino", protocol: "Kamino", candidateId: "kamino_usdc_lending", dedupeKey: "klend:x", valueUsd: v, recognizedValueUsd: v, withdrawalState: "unresolved", liquidValueUsd: v, mint: USDC });
const msolUnresolved = (v: number) => w({ id: "ms", type: "lst", symbol: "mSOL", name: "Marinade Staked SOL", mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", amount: "1", uiAmount: 1, detection: "recognized_lst_mint", valueUsd: v, lstNormalizationState: "unsupported" });

export interface TrimTestingFixture {
  id: string;
  label: string;
  positions: WalletPosition[];
  requiredBufferUsd: number;
  assessment: TrimAssessment;
  card: EngineSuggestion | null;
}

function fx(id: string, label: string, positions: WalletPosition[], requiredBufferUsd = 500): TrimTestingFixture {
  const assessment = deriveTrimAssessment({ positions, requiredBufferUsd, generatedAt: GEN });
  const card = buildTrimCardFromAssessment(assessment, GEN);
  return { id, label, positions, requiredBufferUsd, assessment, card };
}

export function getTrimTestingFixtures(): TrimTestingFixture[] {
  return [
    fx("aggregate", "1. Aggregate long-tail exposure (≥ $100, ≥ 5%)", [usdc(2600), tok(200, "a")]),
    fx("concentration", "2. Single-token concentration (≥ 10%)", [usdc(1800), tok(200, "a")]),
    fx("small", "3. Small-position review (3 holdings ≤ $50, ≥ $100)", [usdc(3000), tok(50, "s1"), tok(25, "s2"), tok(25, "s3")]),
    fx("all_three", "4. All three triggers fire", [usdc(500), tok(300, "big"), tok(40, "s1"), tok(40, "s2"), tok(40, "s3")]),
    fx("exact_100", "5. Exact $100 / 5% boundary — card visible", [usdc(1900), tok(100, "a")]),
    fx("exact_10pct", "6. Exact 10% concentration boundary — card visible", [usdc(1800), tok(200, "a")]),
    fx("below", "7. Below every threshold — no card", [usdc(2000), tok(40, "a")]),
    fx("usdc_excluded", "8. Canonical USDC excluded (only the non-core token reviewed)", [usdc(1000), tok(300, "a")]),
    fx("fake_usdc", "9. Fake-USDC symbol (wrong mint) included as non-core", [usdc(1000), fakeUsdc(300)]),
    fx("wsol_excluded", "10. Canonical wrapped SOL excluded; non-core token reviewed", [usdc(1000), wsol(300), tok(250, "a")]),
    fx("aggregated_accounts", "11. Two accounts of one mint → one involved asset", [usdc(1000), tok(60, "x1", "MintX", "60"), tok(50, "x2", "MintX", "50"), tok(200, "b")]),
    fx("t22_frozen", "12. Frozen Token-2022 — card + unavailable-transferability note", [usdc(1000), t22(300, "frozen")]),
    fx("t22_hook", "13. Hook-unresolved Token-2022 — card + unresolved-transferability note", [usdc(1000), t22(300, "hook_unresolved")]),
    fx("stale", "14. Stale candidate value — no card", [usdc(1000), staleTok(300)]),
    fx("unknown", "15. Unknown positive value — no card", [usdc(1000), tok(300, "a"), unknownTok()]),
    fx("jlusdc", "16. jlUSDC unresolved value — no card", [usdc(1000), tok(300, "a"), jlusdc()]),
    fx("liability", "17. Unresolved liability — no card", [usdc(1000), tok(300, "a"), debt(null)]),
    fx("kamino_unresolved", "18. Unrelated protocol liquidity unresolved — card still appears", [usdc(1000), tok(300, "a"), kaminoUnresolved(400)]),
    fx("msol_unresolved", "19. mSOL backing unresolved — card still appears", [usdc(1000), tok(300, "a"), msolUnresolved(260)]),
    fx("buffer_incomplete", "20. Safety Buffer incomplete — no card", [usdc(100), tok(300, "a")], 2000),
    // Tokens OUTSIDE the approved registry (wallet/verifiedMemeIdentity.ts): only one Jupiter has verified AND
    // tags a meme coin has an identity. It is then an ordinary non-core token, shown by its listed name and icon.
    fx("verified_meme", "21. Verified meme coin outside our list — card, with its listed name and icon", [usdc(1000), listed(300, "pengu", PENGU, "PENGU", "Pudgy Penguins", true)]),
    fx("verified_meme_multi", "22. Two verified meme coins + a registry one — one Trim listing all three", [usdc(3000), listed(260, "pengu", PENGU, "PENGU", "Pudgy Penguins", true), listed(180, "fart", FARTCOIN, "Fartcoin", "Fartcoin", true, FART_ICON), tok(200, "a")]),
    fx("verified_not_meme", "23. Verified but not a meme coin (PYUSD) — counted in the portfolio, never trimmed; only the other token is reviewed", [usdc(1000), tok(300, "a"), listed(300, "pyusd", PYUSD, "PYUSD", "PayPal USD", false, JUP_ICON, true)]),
    // As the APP sees it: tokens Jupiter has not verified are left out where positions enter the app
    // (splitCountedPositions), so the assessment never meets them. Scenario 15 above shows the engine's own
    // fail-closed answer when one does reach it.
    fx("unverified_beside_meme", "24. Verified meme coin beside an unverified token — the unverified one is left out; the card appears", splitCountedPositions([usdc(1000), listed(300, "pengu", PENGU, "PENGU", "Pudgy Penguins", true), unlisted(40, "spam")]).counted),
    fx("pump", "25. PUMP — tagged defi by Jupiter, trimmed with the meme coins by name", [usdc(1000), listed(300, "pump", PUMP, "PUMP", "Pump", false)]),
  ];
}

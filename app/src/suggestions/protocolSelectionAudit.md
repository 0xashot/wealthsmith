# Protocol Selection Data-Source Audit (Step 12B)

**Status: AUDIT ONLY — no runtime behavior changed.** Protocol selection remains
`not_evaluated`. This document determines whether WealthSmith has enough real,
deterministic data to safely implement protocol/platform selection later.

**Bottom line:** **Do NOT implement protocol selection yet — not even the narrow
SOL-liquid-staking case.** The app has real *per-held-position* data (APY, value,
protocol name, manage URL) but is missing the cross-protocol comparison data
(TVL, liquidity, withdrawal behavior, risk, fees, route/slippage) **and** has no
*candidate catalog* to select from — every data source detects what the wallet
**already holds**, not a universe of options. Recommended path: **Option D → C**.

---

## 1. What protocol-related data we already have (per detected position)

Fields on `WalletPosition` (`src/wallet/walletPosition.ts`) and how they're sourced:

| Field | Status | Source (evidence) |
| --- | --- | --- |
| Protocol name | **available** | `WalletPosition.protocol` + `SOURCE_LABELS`; curated `TOKEN_REGISTRY` maps known mints → protocol (walletPosition.ts) |
| Asset / token (symbol, mint) | **available** | `symbol` / `mint` from detection + registry |
| valueUsd | **available** (when priced) | `tokenPrices.ts` (DefiLlama `coins.llama.fi`, Jupiter `lite-api.jup.ag/price/v3`); LP legs valued via SDK quotes (`orcaWhirlpools.ts`, `raydiumClmm.ts`) |
| APY | **available for held positions** | On-chain SPL stake-pool exchange-rate growth for LSTs (`lstApy.ts`); mSOL via Marinade API; INF via DefiLlama yields; Kamino via SDK `getVaultActualAPY` **net of fees** (`kaminoVaults.ts`). Null when unsourced — never invented. |
| TVL | **missing** | No TVL field is read or stored on any position. DefiLlama `/pools` (which carries TVL) is not consumed; only `yields.llama.fi/chart` is used, for INF APY history. |
| Risk score | **missing** | No risk/audit/security metadata anywhere. |
| Lockup / withdrawal time | **missing** | Native-stake detection reads the *withdraw authority* offset for ownership only (`protocolPositions.ts`); unstake cooldown / vault withdrawal windows are not modeled. |
| Fees | **partially_available / unreliable** | Kamino APY is "net of fees" (fees folded in, not exposed as a field); no explicit deposit/withdraw fee field exists for any protocol. |
| Liquidity depth | **missing** | Not fetched for any protocol. |
| Slippage estimate | **missing** | No source. |
| Quote / route data | **missing** | **No swap/route adapter.** Only Jupiter *price* v3 is used; there is no Jupiter quote-api/swap-route call. (`decreaseLiquidityQuote` in Orca/Raydium is position *valuation*, not an execution route.) |
| Deposit / withdraw eligibility | **missing** | Not evaluated (would need route feasibility + protocol availability). |
| Manage URL | **available** | `WalletPosition.manageUrl` (review-only external destination set at detection, e.g. validator/protocol app page). |
| Source of the data | **available** | Each module documents its source; `WalletPosition.detection` records the detection method. |
| Freshness / timestamp | **partially_available** | `pricedAsOf` (Date.now() at price fetch, `useWalletPortfolio.ts`); `tokenPrices.ts` keeps per-coin timestamp + confidence. APY/detection results are not individually timestamped. |

---

## 2. Sources that exist in the codebase

- **RPC**: `VITE_SOLANA_RPC_URL` (Helius, `api.helius.xyz`) with a `solana-rpc.publicnode.com` fallback. Read-only (`getProgramAccounts`, `getTokenAccountsByOwner`, account reads) — **no signing anywhere**.
- **Prices**: DefiLlama `coins.llama.fi` (+ confidence/timestamp), Jupiter `lite-api.jup.ag/price/v3` (`tokenPrices.ts`).
- **APY**: on-chain SPL stake pools via `@solana/spl-stake-pool` (`lstApy.ts`), Marinade `api.marinade.finance/msol/apy/30d`, DefiLlama `yields.llama.fi/chart` (INF only), Kamino SDK (`kaminoVaults.ts`).
- **Position detection modules**: `kaminoVaults`, `sanctumLsts`, `jitoRestaking`, `hubble`, `meteoraDamm`, `meteoraDlmm`, `orcaWhirlpools`, `raydiumAmm`, `raydiumClmm`, `protocolPositions` (native stake), assembled by `useWalletPortfolio.ts` and summarized by `walletSummary.ts`.
- **Curated static registry**: `TOKEN_REGISTRY` in `walletPosition.ts` (approved mints → symbol/name/protocol for USDC/USDT/USDH/DAI + JupSOL/mSOL/bSOL/JitoSOL).
- **Selection contract**: `protocolSelection.ts` (`ProtocolSelection` model + guardrail reconciliation) — all `not_evaluated` / `not_applicable` today.

**Structural fact (the key constraint):** every module scopes reads to the
connected **owner** (`getProgramAccounts`/`getTokenAccountsByOwner` by owner
pubkey). The data layer answers *"what does this wallet hold, and what is it
worth/yielding?"* — it does **not** enumerate a *candidate universe* of protocols
to choose among. Selection needs the latter.

---

## 3. What we can safely select today — per opportunity type

| Type | Have | Missing | Verdict |
| --- | --- | --- | --- |
| **A. Staking / liquid staking** | Candidate protocol *names* (curated), APY (on-chain derivable for LSTs), manage URLs | Candidate **catalog**, TVL/liquidity, withdrawal/unstake behavior, risk metadata, explicit fees, deterministic scoring, route feasibility | **Not selectable.** Closest of the four, but still `partially_available`. |
| **B. Stable yield** | APY for *held* Kamino vaults, valueUsd, buffer-eligibility logic (`walletSummary`) | Candidate catalog, TVL, utilization, risk/protocol metadata, withdrawal behavior, deposit/withdraw fees | **Not selectable.** `missing`. |
| **C. Vault / LP** | LP position *valuation* (Orca/Raydium/Meteora), asset pair | Pool APY, impermanent-loss exposure, TVL, withdrawal behavior, fees, liquidity, route | **Not selectable.** `missing`. |
| **D. Position optimization (alternative protocol)** | Current position data + APY | Comparable-alternatives catalog, APY/risk/TVL/lockup comparison, cost/slippage/liquidity, protocol risk metadata | **Not selectable.** `missing` — and this card is review-only by design (never proposes a replacement). |

---

## 4. What is missing — by opportunity type (status labels)

- **A. Staking:** candidate catalog `missing` · TVL/liquidity `missing` · withdrawal behavior `missing` · risk metadata `missing` · fees `partially_available` (folded into APY) · APY `available` · supported asset `available` · user eligibility `missing` · route feasibility `missing`.
- **B. Stable yield:** candidate catalog `missing` · TVL `missing` · utilization `missing` · risk `missing` · withdrawal behavior `missing` · fees `missing` · APY `partially_available` (held vaults only) · supported stable asset `available` · buffer eligibility `available`.
- **C. Vault/LP:** APY `missing` · TVL `missing` · asset pair `available` · IL exposure `missing` · withdrawal `missing` · fees `missing` · liquidity `missing` · route `missing`.
- **D. Position optimization:** current position `available` · comparable alternatives `missing` · APY/risk/TVL/lockup comparison `missing` · cost/slippage/liquidity `missing` · protocol risk `missing`.

---

## 5. What must remain `not_evaluated`

All of these have **no reliable data source** and must stay as-is (the engine
already does this — see `positionOptimizationSuggestion.ts`, `stakingSuggestion.ts`,
`stableYieldSuggestion.ts`, `protocolSelection.ts`):

- `protocolSelection.status = not_evaluated` (staking, stable_yield)
- `protocol_selection` guardrail = `not_evaluated`
- `cost_available` = `not_evaluated`
- `liquidity_available` = `not_evaluated`
- `slippage_available` = `not_evaluated`
- `exposure_grouping` stays `not_evaluated` unless duplicate grouping fired (unrelated to selection).

---

## 6. Minimum requirements to move from `not_evaluated` → `selected`

A category may only emit `selectedProtocolSelection(...)` when **all** hold
(deterministic, data-backed, no invention):

**Staking / liquid staking:**
1. A curated candidate set of approved protocols is known.
2. APY available for each candidate (already derivable on-chain / DefiLlama).
3. Liquidity / TVL available per candidate.
4. Withdrawal / unstake behavior known (instant vs. cooldown epochs).
5. Fees known or explicitly zero/unknown (not silently assumed 0).
6. Risk metadata available (validator/LST/audit signal).
7. The chosen option wins a **deterministic** scoring function (no AI, no ties left to chance).
8. `selectedProtocolId` / `selectedProtocolName` are each backed by a real source + `evaluatedAt` + `dataSources`.

**Stable yield:** same as above + supported stable asset, utilization, and
**Safety-Buffer eligibility preserved** for the chosen venue.

**Vault / LP:** same + asset pair, IL exposure, and pool-specific liquidity.

Until every item is `available`, the honest state is `not_evaluated`.

---

## 7. Recommendation

**Option D, then Option C. Not A/B yet.**

- **Now (Step 12C candidate) — Option D:** add a **manually curated protocol
  registry** of approved candidate protocols per strategy (SOL staking, stable
  yield) carrying only **static, verifiable** fields (id, display name,
  strategyType, supported assets/mints, official manage URL, data-source note).
  Keep **every dynamic value** (APY, TVL, risk, fees, liquidity, slippage, route)
  `not_evaluated`. This creates the missing *candidate universe* deterministically
  without inventing anything, and `protocolSelection.status` stays `not_evaluated`.
- **Later — Option C:** add data adapters (e.g. DefiLlama `/pools` for TVL/APY per
  candidate, a modeled withdrawal/risk layer) **before** any `selected` output.
- **Reject Option B (implement SOL staking selection now):** even the narrowest
  case is missing TVL/liquidity, withdrawal behavior, risk metadata, and a
  scoring function — selecting today would require inventing data, which is
  prohibited.

---

## 8. Is real protocol selection safe now?

**No.** The engine's current `not_evaluated` posture is correct and should not
change. Selection cannot begin for any opportunity type — including SOL liquid
staking — until at least a curated candidate registry (Option D) plus TVL /
withdrawal / risk adapters (Option C) exist and pass deterministic scoring.

---

## 9. Per-protocol findings (evidence summary)

| Protocol | Detected | APY source | TVL | Risk | Withdrawal | Fees | Selectable input? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Jupiter (JupSOL) | ✅ | on-chain SPL stake pool | ❌ | ❌ | ❌ | folded in APY | name+APY only |
| Marinade (mSOL) | ✅ | Marinade API | ❌ | ❌ | ❌ | folded in APY | name+APY only |
| Jito (JitoSOL) | ✅ | on-chain SPL stake pool | ❌ | ❌ | ❌ | folded in APY | name+APY only |
| BlazeStake (bSOL) | ✅ | on-chain SPL stake pool | ❌ | ❌ | ❌ | folded in APY | name+APY only |
| Sanctum (INF) | ✅ | DefiLlama yields | ❌ | ❌ | ❌ | ❌ | name+APY only |
| Kamino (vaults) | ✅ | SDK `getVaultActualAPY` (net fees) | ❌ | ❌ | ❌ | net in APY | name+APY only |
| Native stake | ✅ | (per-validator) | ❌ | ❌ | cooldown not modeled | n/a | name only |
| Orca / Raydium / Meteora (LP) | ✅ (valuation) | ❌ (no pool APY) | ❌ | ❌ | ❌ | ❌ | value only |
| Hubble | ✅ | n/a | ❌ | ❌ | ❌ | ❌ | value only |

Every row is **detection of a held position**, not a selectable candidate.

---

## 10. Conclusion

**Do not implement protocol selection yet.** Keep the contract-only,
`not_evaluated` posture. The safe next step is a **curated static candidate
registry (Option D)** that keeps all dynamic values `not_evaluated`; real
`selected` output must wait for TVL / withdrawal / risk / route adapters
(Option C) and a deterministic scoring rule.

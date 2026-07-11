# Protocol Data-Source Matrix (Step 12C)

**Selection is NOT implemented.** This matrix documents, per data source, what it
*can* and *cannot* provide toward a future protocol-selection engine, and whether
it is sufficient on its own. Nothing here is wired into selection, scoring, or the
UI. See `protocolSelectionAudit.md` (Step 12B) for the readiness conclusion and
`protocolRegistry.ts` for the static candidate list + adapter interface contracts.

**Marker:** `PROTOCOL_SELECTION_IMPLEMENTED === false` in `protocolRegistry.ts`.

---

## Matrix

| Source | Can provide | Cannot provide | Freshness | Reliability concerns | Enough for selection? |
| --- | --- | --- | --- | --- | --- |
| **DefiLlama** (`coins.llama.fi`, `yields.llama.fi`) | Protocol TVL, yield-pool APY (per endpoint), APY history | User eligibility, route/quote cost, exact withdrawal behavior, protocol-specific risk judgement | Minutes–hours (cached feed) | Pool coverage varies; pool→our-candidate mapping must be curated; occasional gaps | **No** — needs candidate registry + risk layer |
| **Kamino** (SDK + `api.kamino.finance`) | Vault APY (net of fees), TVL, the user's own position data | Broader/external risk scoring, cross-protocol comparison | Per read (SDK) | SDK is heavy (dynamic import); single-protocol only | **No** — one protocol; no comparison/risk |
| **Jupiter** (`lite-api.jup.ag`) | Token price; (future) swap **quote / route / slippage / price impact** via quote-api | Protocol yield, vault APY, staking risk | Seconds (price) | Quote-api NOT yet integrated (only price v3 today) | **No** — price only today; quote/route unbuilt |
| **Sanctum** (LST list CDN) | LST metadata/list; (future) LST metrics if endpoints accessible | Full risk scoring, route/cost model | Static list + on-chain | Multi-LST; needs adapter to resolve specific LST metrics | **No** — metadata only today |
| **On-chain stake pools** (`@solana/spl-stake-pool`) + Marinade API | Real staking **APY** for LSTs (exchange-rate growth); mSOL APY | TVL, liquidity depth, unstake timing, risk, fees (folded), candidate comparison | Per read / 30d (Marinade) | Requires per-pool reads; no cross-pool ranking | **Partial** — best APY source; still missing TVL/withdrawal/risk |
| **Manual WealthSmith risk registry** (does NOT exist yet) | Curated audit status, risk score, withdrawal class, Safety-Buffer eligibility | Live APY/TVL (needs adapters) | Manual review cadence | Must be maintained; subjectivity in scoring | **No alone** — pairs with adapters |
| **RPC / on-chain reads** (Helius `VITE_SOLANA_RPC_URL`) | User holdings, stake/token accounts, protocol **position detection** | Protocol-wide candidate scoring, TVL, risk, route | Live | Read-only by design (no signing) | **No** — detects held positions, not candidates |

---

## Per-strategy sufficiency (today)

- **SOL staking / liquid staking:** APY `available` (on-chain), candidate names `available` (registry), manage URLs `available`. Missing: **TVL/liquidity, withdrawal/unstake behavior, risk metadata, explicit fees, deterministic scoring.** → **Not selectable.**
- **Stable yield:** APY `partially_available` (held Kamino vaults only). Missing: **candidate-universe metrics, TVL, utilization, risk, withdrawal, fees.** → **Not selectable.**
- **LP / vault:** valuation only. Missing: **pool APY, IL exposure, TVL, risk, route, fees, liquidity.** → **Not selectable.**

---

## What still blocks selection

1. **Market-data adapter** producing `ProtocolMarketData` (APY, TVL, liquidity, withdrawal, fees) per candidate — interface defined in `protocolRegistry.ts`, unimplemented.
2. **Risk registry** producing `ProtocolRiskData` (risk score, audit status, buffer eligibility) — interface defined, no data yet.
3. **Quote/route guardrail data** (cost / liquidity / slippage) — no adapter; these stay `not_evaluated`.
4. **Deterministic scoring rule** — none exists; must be added and QA'd (mock + mainnet simulation) before any `selected` output.

Until (1)–(4) exist and pass QA, protocol selection stays `not_evaluated`. The
candidate registry is metadata only and is **not** a recommendation.

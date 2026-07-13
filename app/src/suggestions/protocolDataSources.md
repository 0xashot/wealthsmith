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

---

## Step 12D — read-only adapters now in the codebase

**12D adds data collection/normalization only. It does NOT implement protocol
selection.** These are a service layer — the Suggestion Engine never imports or
calls them, and running one never changes a suggestion. `confidence` +
`missingFields` record exactly what is known; nothing is invented.

| File | Provides | Missing / status | Confidence |
| --- | --- | --- | --- |
| `protocolMarketData.ts` | Normalized `ProtocolMarketData` / `ProtocolRiskData` / `ProtocolQuoteData` / `ProtocolSelectionInput` types + `missingMarketData()` (no fake zeros) | — (contracts + constructors) | n/a |
| `protocolRiskRegistry.ts` | Curated static notes, `auditStatus`/`withdrawalClass` = "unknown" | **No `riskScore`** (deferred to 12E), `safetyBufferEligible` absent | `partial` |
| `protocolDataAdapters.ts` | `ProtocolDataAdapter` contract + `buildProtocolSelectionInput` (sync, network-free merge) | Selects/scores nothing | n/a |
| `protocolDataAdapters.defillama.ts` | Read-only pool APY/TVL **only via VERIFIED exact mappings** | Mapping table is **empty** (none verified) → returns `missing`; no fuzzy matching | `missing` today |
| `protocolDataAdapters.kamino.ts` | Stub returning `partial` + reason | Existing Kamino APY/TVL is per-HELD-vault only; a vault-catalog + candidate-market adapter is still needed | `partial` |
| `protocolDataAdapters.jupiter.ts` | `getReadOnlyQuoteEstimate` **contract-only** | `quoteAvailable: false`; no route/slippage/cost; **never builds/sends a tx or requests a signature** | `missing` today |

**Known mapping limitations:** DefiLlama pool UUIDs are volatile and must be
verified per candidate before use — an empty mapping table is the honest state,
not a blocker. Kamino market data is position-scoped, not candidate-scoped.

**Why still not enough for selection:** no verified market data yet (empty
DefiLlama mappings, Kamino stub), no risk score (12E), no eligibility/route
guardrail data, and no scoring model. `PROTOCOL_SELECTION_IMPLEMENTED` stays
`false`.

---

## Eligibility data required before selection (Step 12E)

`evaluateProtocolEligibility` (see protocolRiskMethodology.md) gates a candidate
to "eligible to evaluate". Each input below must be **present and pass** — a
missing value yields `insufficient_data`, never `eligible`:

| Input | Source (future) | Gate |
| --- | --- | --- |
| TVL | DefiLlama `/pools` (verified mapping) | `≥ MIN_PROTOCOL_TVL_USD` ($1M) |
| APY | on-chain / DefiLlama / SDK | must be present |
| riskScore | **curated (12E methodology)** — absent today | `≥ MIN_PROTOCOL_RISK_SCORE` (7) |
| auditStatus | published audits (curated) | not `unknown` |
| withdrawal behavior | protocol docs (hours or class) | known; `≤ 24h` buffer / `≤ 168h` general |
| Safety-Buffer eligibility | curated | required `true` in buffer context |
| liquidity | DefiLlama / on-chain (route context) | `≥ MIN_LIQUIDITY_USD` ($100k) |
| route / quote | Jupiter quote (12F) | required when `requiresRoute` |
| fees | protocol / SDK | known for net-yield comparison |
| source freshness (`updatedAt`) | each adapter | recorded per record |
| `lastReviewedAt` (curated risk) | manual review cadence | recorded per entry |

Eligibility is separate from selection: even a fully `eligible` set of
candidates is NOT chosen among until 12F/12G/12H land.

---

## Step 12F — read-only route / cost / liquidity guardrails

**Step 12F adds data collection + guardrail evaluation only. It does NOT
implement protocol selection or execution.** New utilities: a read-only Jupiter
quote adapter (`getReadOnlyJupiterQuote`) and a route-guardrail evaluator
(`evaluateRouteGuardrails`). Neither is wired into the Suggestion Engine.

**Quote-only boundary — Jupiter adapter:**

- **No** swap, **no** swap/execution endpoint, **no** wallet/publicKey, **no**
  signature, **no** `sendTransaction`/`signTransaction`/`signAllTransactions`/
  `signMessage`, **no** transaction payload. It only issues a read-only GET quote.
- Live network is **disabled** behind `JUPITER_LIVE_QUOTE_IMPLEMENTED = false`;
  the adapter hits the network only when a test injects `fetchImpl`. Failures and
  network-unavailable resolve to `error`/`missing` results and never throw.
- `JUPITER_QUOTE_BUILDS_TRANSACTIONS = false`.

**What data MAY become available (from a real quote):**

- `quoteAvailable` (route exists), `priceImpactPct` (normalized to percent),
  `outAmountAtomic`, route source; possibly `estimatedNetworkFeeUsd` **only if a
  source provides it** (a bare quote does not).

**What remains missing:**

- true protocol **liquidity** depth, **risk**, **withdrawal behavior**, action
  **eligibility**, **transaction simulation**, and execution success/failure —
  none of which a quote provides. These stay `missing`/`not_evaluated`.

**Future guardrail mapping (documented, NOT wired):**
`cost_available` ← quote route + fee/network estimate · `liquidity_available` ←
`liquidityUsd` or reliable proxy · `slippage_available` ← `priceImpactPct`. Live
suggestion guardrails remain `not_evaluated`.

**Why this still does not enable selection:** a route quote answers "can this
move be routed and at what price impact?", not "which protocol is right". Even a
`passed` route guardrail is one input; selection still needs 12G deterministic
scoring and 12H narrow-case QA, with `PROTOCOL_SELECTION_IMPLEMENTED = false`.

---

## Scoring data requirements (Step 12G)

`protocolScoring.ts` ranks ONLY fully eligible candidates and never selects. Each
input below must be present from a real source; anything missing keeps the
candidate `insufficient_data` (never scored, never defaulted to 0):

| Requirement | Needed for | Notes |
| --- | --- | --- |
| eligibility result = `eligible` | scoring at all | runs before scoring |
| APY | yieldScore | capped at `MAX_APY_FOR_SCORE` |
| TVL | tvlScore | saturates toward `TARGET_TVL_FOR_FULL_SCORE_USD` |
| riskScore | riskScore | **curated (12E)** — absent today |
| withdrawal behavior | withdrawalScore | hours; buffer vs general thresholds |
| fees (when applicable) | costScore | missing fees never assumed zero |
| liquidity (route context) | liquidityScore | ≥ `MIN_LIQUIDITY_USD` |
| quote / price impact (route context) | costScore | ≤ `MAX_PRICE_IMPACT_PCT` |
| freshness (`updatedAt`) | trust | per record |
| source attribution (`dataSources`/`sources`) | audit | per record |

**Until these fields are populated from real sources, candidates remain
`insufficient_data`** — scoring produces no ranking today, and selection stays
disabled.

---

## 12H QA-only selection status

- **QA can select** a deterministic winner for SOL liquid staking **from complete
  FIXTURE/mainnet-simulated data** (`protocolSelectionQa.ts`, see
  `protocolSelectionQa.md`).
- **Production cannot select**: real adapters do not yet provide complete
  market/risk/route data. Current live data remains `insufficient_data`.
- **No user-facing recommendation is enabled.** Live suggestions keep
  `protocolSelection.status = not_evaluated`, and
  `PROTOCOL_SELECTION_IMPLEMENTED = false`. The QA result is `qaOnly` and never
  reaches cards/modals.

---

## Production-readiness gaps (Step 12I)

Before real selection can advance past `qa_only` (see
`protocolSelectionProductionReadiness.md`), these gaps must close:

- Real **DefiLlama pool mappings are empty** (no verified candidate→pool links).
- The **Kamino candidate-market adapter is stubbed** (per-held-vault only).
- The **Jupiter live quote is disabled** (`JUPITER_LIVE_QUOTE_IMPLEMENTED = false`).
- **`riskScore` is absent** (no approved 12E methodology yet).
- **Withdrawal behavior** is `unknown` for all candidates.
- **Fee data** is unknown / not itemized.
- **Liquidity data** is mostly absent.
- A **real-data dry-run** (Stage 2) is not implemented.
- The **feature flag is not enabled** (all flags default OFF).

Until these are closed and every readiness gate passes, current live data remains
`insufficient_data` and no user-facing recommendation is enabled.

---

## 12J — SOL liquid-staking data mapping status

The first narrow case now has verified mappings (`protocolSolLiquidStakingData.ts`,
`protocolSolLiquidStakingData.md`):

- **Mapped (exact mints for all 5 candidates):** JupSOL/mSOL/JitoSOL/bSOL/INF —
  copied from existing source, no fuzzy matching.
- **APY: mapped** to existing real helpers (on-chain SPL stake pool for
  JupSOL/bSOL/JitoSOL, Marinade API for mSOL, DefiLlama for INF). Values are
  fetched by a caller and injected — never fabricated in the mapping module.
- **TVL: mapped for sanctum only** via a verified DefiLlama pool UUID (now in
  `DEFILLAMA_POOL_MAPPINGS`); the other four remain `missing` (no verified pool
  UUID in the codebase — none guessed).
- **Still missing:** TVL for 4/5 candidates, `riskScore` (all), withdrawal
  behavior (all), fees (all).
- **Why this still does not enable UI recommendations:** the internal dry-run
  returns `insufficient_data` (no injected values, no TVL/risk/withdrawal), and
  `PROTOCOL_SELECTION_IMPLEMENTED` / `SHOW_IN_UI` stay false. The mapping module is
  not imported by any live/engine/UI file.
- **Next real-data blockers:** verified DefiLlama TVL pools for the remaining 4,
  a `riskScore` methodology + curated scores, and sourced withdrawal/fee data.

---

## 12K — SOL liquid-staking dry-run + risk sourcing status

`protocolSolLiquidStakingDryRun.ts` (dev-only) reports real-data coverage per
candidate; `protocolSolLiquidStakingRiskSources.md` tracks risk sourcing.

| Candidate | APY | TVL | riskScore | withdrawal | fees |
| --- | --- | --- | --- | --- | --- |
| jupiter | mappable (on-chain) | missing | not_assigned | missing | missing |
| marinade | mappable (Marinade API) | missing | not_assigned | missing | missing |
| jito | mappable (on-chain) | missing | not_assigned | missing | missing |
| blazestake | mappable (on-chain) | missing | not_assigned | missing | missing |
| sanctum | mappable (DefiLlama) | mappable (verified pool) | not_assigned | missing | missing |

Data remains **insufficient for production selection**: `riskScore` is
`not_assigned` for all, withdrawal/fees are missing, and TVL is verified for only
1/5. The dry-run returns `insufficient_data`. `PROTOCOL_SELECTION_IMPLEMENTED` /
`SHOW_IN_UI` / `ALLOW_TRANSACTIONS` stay false; `PROTOCOL_SELECTION_ALLOW_LIVE_DATA`
remains false globally (dry-run live mode is a per-call opt-in only).

---

## 12L — verified source completion

`protocolSolLiquidStakingSources.ts` centralizes source-backed status; the full
matrix is in `protocolSolLiquidStakingSourceChecklist.md`.

- **Newly verified:** mint + APY *sources* for all five (code-backed); TVL source
  for Sanctum/INF (verified DefiLlama pool).
- **Still missing:** verified DefiLlama TVL pools for JupSOL/mSOL/JitoSOL/bSOL
  (none guessed); withdrawal, fees, audit for all; **`riskScore` not assigned** for
  all; live APY *values* (fetched + injected, not fabricated).
- **Why production selection remains disabled:** a verified *source* is not a
  *value*, and eligibility still needs `riskScore` + TVL + withdrawal; the dry-run
  stays `insufficient_data` and all flags stay false.

---

## 12M — Stage-2 real-data dry-run report

`protocolSolLiquidStakingStage2DryRun.ts` injects the real values we can source
today and runs the full pipeline, reporting per-candidate data coverage. Current
coverage:

- **APY source coverage:** verified (code-backed) for all five; values injected.
- **TVL:** verified for Sanctum / INF only (the other four stay missing — none
  guessed).
- **Withdrawal:** missing for all five.
- **Fees:** missing for all five.
- **Audit:** unknown for all five.
- **RiskScore:** absent (`not_assigned`) for all five.

Result: `candidatesEligible = 0`, `insufficient_data` — correct and expected.
Complete injected data for one candidate can make it `eligible` in the report, but
`canSelectForProduction` stays `false`. **Production remains disabled:**
`PROTOCOL_SELECTION_IMPLEMENTED` / `SHOW_IN_UI` / `ALLOW_TRANSACTIONS` false, and
the module is not imported by any live/engine/UI file.

---

## 12N — go/no-go checklist

`protocolSelectionGoNoGo.ts` (`getProtocolSelectionGoNoGo()`) adds the final
machine-checkable production-readiness checklist across 17 gates. **Current
`productionReady = false`.** Blocking data gaps (the authoritative source-status
picture): TVL verified for Sanctum/INF only (four missing, none guessed), riskScore
unassigned + methodology unapproved, audit status unknown, withdrawal + fee data
missing, and no complete real-data Stage-2 dry-run; product/copy/compliance and UI
review are also outstanding. Mechanism gates (eligibility, scoring, fallback,
transaction boundary, QA) pass. **No production enablement:** the checklist selects
nothing, exposes no selected-protocol id/name, is not imported by any
live/engine/UI file, and all selection flags stay false.

---

## 12O — data sourcing pack (proposals)

`protocolSolLiquidStakingSourceCandidates.ts` +
`protocolSolLiquidStakingDataSourcingPack.md` add a PROPOSAL registry naming the
exact sources needed to close the go/no-go blockers (25 candidates across
tvl/withdrawal/fees/audit/risk_score for the five candidates). **Source-candidate
workflow:** `proposed / needs_review → verified → production metadata → dry-run →
go/no-go`. A proposal never changes production data on its own:

- TVL for JupSOL/mSOL/JitoSOL/bSOL → `needs_review` (exact DefiLlama UUID to
  confirm); **not** added to `DEFILLAMA_POOL_MAPPINGS`; production TVL stays missing.
- Withdrawal / fees / audit → `proposed` (official docs to consult); no value,
  timing, or audit status assigned; never assumed instant/zero.
- RiskScore → evidence requirements drafted only; **no score assigned**.

Production remains disabled: `PROTOCOL_SELECTION_IMPLEMENTED` / `SHOW_IN_UI` /
`ALLOW_TRANSACTIONS` false and `getProtocolSelectionGoNoGo().productionReady =
false` (tvl_mapping/risk_scores/audit/withdrawal/fees gates unchanged).

---

## 12P — riskScore rubric (draft, not approved)

`protocolRiskRubric.ts` + `protocolRiskRubric.md` + `protocolRiskRubricApprovalPack.md`
add an auditable `riskScore` rubric: six weighted dimensions totaling 100 (audit &
security 25, maturity 20, TVL & adoption 15, withdrawal & fee transparency 15,
operational & dependency 15, incident history 10), each with required source-backed
evidence, plus a reviewer approval workflow. **The rubric is DRAFT and NOT
approved** (`PROTOCOL_RISK_RUBRIC_APPROVED = false`,
`canAssignProtocolRiskScores()` → false): **no `riskScore` is assigned**, drafts
keep `score` absent + `scoreAssigned:false`, `auditStatus` stays `unknown`, and no
production metadata changes. `getProtocolSelectionGoNoGo().productionReady` stays
`false` (the risk_methodology blocker now names the draft rubric; risk_scores stays
not_started). Rubric is not imported by any live/engine/UI file.

---

## 12Q — risk evidence drafts (gathering only)

`protocolSolLiquidStakingEvidenceDrafts.ts` + `protocolSolLiquidStakingEvidenceDrafts.md`
+ `protocolRiskEvidenceReview.md` add 30 reviewable evidence drafts (5 candidates ×
6 rubric dimensions). Coverage: **0 gathered, 1 partial** (Sanctum/INF `tvl_adoption`
from the verified DefiLlama pool), **29 needs_review**, `scoreAssignedCount = 0`.
Only codebase-verifiable sources are cited; nothing is invented (no guessed audit
dates, launch dates, TVL, fees, timing, incidents, or URLs). **No `riskScore` is
assigned**, the rubric stays unapproved, and **no production metadata changes**
(auditStatus `unknown`, no `withdrawalTimeHours`/fees, no TVL promotion).
`getProtocolSelectionGoNoGo().productionReady = false`; risk_scores/audit/
withdrawal/fees gates unchanged. Drafts are not imported by any live/engine/UI file.

---

## 12R — reviewer approval / score-assignment decision gate

`protocolRiskApprovalDecision.ts` + `protocolRiskApprovalDecision.md` +
`protocolRiskScoreAssignmentGate.md` add the explicit human decision gate before a
`riskScore` can ever be assigned. The current decision is **`not_submitted`**
(`rubricApproved = false`, `scoreAssignmentAllowed = false`); every candidate
score-assignment gate is **`blocked`** (rubric unapproved + all six evidence
dimensions not `gathered`; Sanctum's `partial` TVL does not qualify).
`anyCandidateReadyForScoring = false`, `anyScoreAssigned = false`,
`productionAffected = false`; `canAssignRiskScoreToProtocol()` → false for all five.
**No approval submitted, no scores assigned.** The go/no-go risk_methodology blocker
now names the unsubmitted decision, but `productionReady` stays `false` and all
risk gates are unchanged. The gate is not imported by any live/engine/UI file.

---

## 12S — evidence completion harness (one candidate)

`protocolSolLiquidStakingEvidenceCompletion.ts` +
`protocolSolLiquidStakingEvidenceCompletion.md` add a pure, read-only
evidence-completion workflow for one candidate (Sanctum/INF). It reviews each
rubric dimension's sources and reports the status each *would* have — a dimension
reaches `gathered` only when every required source is `verified` with no unresolved
questions. Current result: **0/6 gathered** (TVL stays `partial`, the rest
`needs_review`), `readyForReview = false`, `approvedForScoring = false`,
`scoreAssigned = false`. The score-assignment gate is unchanged (Sanctum `blocked`,
`canAssignScore = false`). **No production enablement:** it mutates no drafts and no
production metadata, `productionReady` stays `false`, and it is not imported by any
live/engine/UI file.

---

## 12T — source-verification intake

`protocolSolLiquidStakingSourceVerification.ts` +
`protocolSolLiquidStakingSourceVerification.md` add a reviewer source-verification
layer: reviewer-supplied DefiLlama pool IDs and official docs URLs are classified at
the SOURCE level (`verified`/`needs_review`/`rejected`). "Verified" means the source
LINK is legitimate — **not** that a production value is confirmed. Verified: the four
DefiLlama TVL pools (exact UUID + label + Solana), INF via the existing codebase
pool, and official withdrawal/fee/audit/operational links. Needs review: incident
history for all five (absence is not clean history) and unclear-scope sources.
**No production enablement:** nothing is written to `DEFILLAMA_POOL_MAPPINGS` or
production metadata, `auditStatus` stays `unknown`, no `withdrawalTimeHours`/fees/
`riskScore` are assigned, evidence drafts are unmutated
(`mapVerifiedSourcesToEvidenceDimensions` never marks a dimension `gathered`), and
`getProtocolSelectionGoNoGo().productionReady = false`. Not imported by any
live/engine/UI file.

---

## 12U — source-value confirmation intake

`protocolSolLiquidStakingSourceValueConfirmation.ts` +
`protocolSolLiquidStakingSourceValueConfirmation.md` add a reviewer value-
confirmation layer: a reviewer records the exact value read from a 12T-verified
source (`confirmed`/`needs_review`/`insufficient`/`rejected`/`stale`), with reviewer
+ role and an as-of timestamp for TVL/APY. Example confirmations are QA-ONLY
(`QA_ONLY_NOT_LIVE` placeholder), never live values. **No production enablement:**
`productionMetadataUpdated`/`evidenceDraftMutated`/`scoreAssigned` are always false;
`mapConfirmedValuesToEvidenceCompletion()` marks a dimension gatherable only when
ALL its required values are confirmed (partial is never enough), so no candidate is
`ready_for_review` and `approvedForScoring` stays false.
`getProtocolSelectionGoNoGo().productionReady = false`. Not imported by any
live/engine/UI file.

---

## 12V — real value-confirmation ledger

`protocolSolLiquidStakingRealValueConfirmations.ts` +
`protocolSolLiquidStakingRealValueConfirmations.md` add a non-production ledger of
reviewer-confirmed DefiLlama TVL/APY/APY-30d values for JupSOL/mSOL/JitoSOL/bSOL
(reviewer: Ashot Gyulzatyan, founder; as-of 2026-07-12). INF stays absent (no exact
value supplied; not invented). Time-sensitive values are fresh for 24h then
`stale`; `mapRealValuesToEvidenceCompletion()` treats fresh TVL+APY+APY-30d as
support for `tvl_adoption` only. **No production enablement:** no metadata written
(not `DEFILLAMA_POOL_MAPPINGS`/`ProtocolMarketData`), no evidence draft mutated, no
`riskScore` assigned; the other five dimensions stay incomplete so no candidate is
`ready_for_review`, and `approvedForScoring`/`productionReady` stay false. Not
imported by any live/engine/UI file.

---

## 12W — evidence gather-decision ledger

`protocolSolLiquidStakingEvidenceGatherDecisions.ts` +
`protocolSolLiquidStakingEvidenceGatherDecisions.md` add a non-production ledger of
explicit reviewer decisions that a rubric dimension is `gathered`, freshness-aware.
`tvl_adoption` is gathered for JupSOL/mSOL/JitoSOL/bSOL while their 12V values are
fresh (past 24h → `stale`); INF is `needs_review`; the other five dimensions have no
decision. A non-production gate wrapper
(`evaluateProtocolRiskCandidateScoreAssignmentGateWithGatherDecisions`) shows the
four with `tvl_adoption` gathered but status `blocked` (5 missing),
`scoreAssignmentAllowed = false`. **No production enablement:** no base draft
mutated, no metadata written, no `riskScore` assigned; no candidate is
`ready_for_review` or `approved_for_scoring`, and `productionReady` stays `false`.
Not imported by any live/engine/UI file.

---

## 12X — JitoSOL remaining evidence + ready_for_review milestone

`protocolSolLiquidStakingJitoEvidenceConfirmations.ts` +
`protocolSolLiquidStakingJitoEvidenceConfirmations.md` add source-backed reviewer
confirmations for JitoSOL's five remaining dimensions (audit/maturity/withdrawal-fee/
operational/incident) from official Jito sources, plus gather decisions in the 12W
ledger. **With fresh TVL/APY, JitoSOL reaches `ready_for_review` (6/6 gathered)** —
the first candidate to do so — while **`approved_for_scoring = false`** (rubric
unapproved), **no `riskScore` assigned**, and no other candidate advances. Stale
TVL/APY drops JitoSOL to 5/6; the incident review must be rechecked before
beta/production. **No production enablement:** no base draft mutated, no production
metadata written (`auditStatus`/`withdrawalTimeHours`/fees unchanged),
`productionReady` stays `false`. Not imported by any live/engine/UI file.

---

## 12Y — human rubric approval + riskScore assignment mechanism

`protocolRiskScoreAssignment.ts` + `protocolRiskScoreAssignment.md` +
`protocolRiskApprovalAndScoring.md` add the gated, auditable scoring mechanism:
`riskScore = sum(score * weight) / 100` (0–10), computed ONLY when the rubric is
approved, score assignment is allowed, the candidate is `ready_for_review`, the
rubric version matches, and every dimension has a valid reviewer score with
rationale + evidence sources. `createExplicitProtocolRiskApprovalDecision()` lets a
reviewer/QA flow record an approval without changing the default
(`getCurrentProtocolRiskRubricApprovalDecision()` stays `not_submitted`). **Blocked
by default:** JitoSOL has no production `riskScore`; a QA-only path proves the
calculation (7.75) with no production effect. Stale TVL/APY blocks assignment. **No
production enablement:** `productionMetadataUpdated`/`evidenceDraftMutated`/
`selectionEnabled` always false; `protocolRiskRegistry.ts` unchanged;
`productionReady` stays `false`. Not imported by any live/engine/UI file.

---

## 12Z — production metadata registry (staged JitoSOL)

`protocolSolLiquidStakingProductionMetadata.ts` +
`protocolSolLiquidStakingProductionMetadata.md` add the production-readable metadata
layer with one **staged, blocked** JitoSOL candidate built from confirmed 12V/12X
evidence (TVL/APY, withdrawal ~48h, fees 0.1%/4%, audit reviewed, operational,
incident caveat). **Blocked by default:** `riskScore` absent (the QA-only 7.75 is
never accepted as production), status `blocked` with `production_risk_score_absent`
/ `source_reverification_required_before_beta` / `protocol_selection_disabled` /
`go_no_go_not_passed`. **No production enablement:**
`productionReady`/`selectionEnabled`/`liveSuggestionsUpdated`/`transactionsEnabled`
always false; nothing written to `protocolRiskRegistry.ts` / `DEFILLAMA_POOL_MAPPINGS`
/ `ProtocolMarketData`; `getProtocolSelectionGoNoGo().productionReady = false`. Not
imported by any live/engine/UI file.

---

## 13A — exact SOL liquid-staking selector shell

`protocolSolLiquidStakingSelector.ts` + `protocolSolLiquidStakingSelector.md` add
the exact selector shell for "idle SOL → which liquid-staking protocol to review".
It is **hard-disabled** (`PROTOCOL_SOL_LST_SELECTOR_ENABLED = false`) and
internal-only: `selectSolLiquidStakingProtocol()` returns `disabled` with no
selected protocol; a dry-run evaluates JitoSOL as `blocked` (selector disabled,
metadata inactive/not-ready, approved riskScore missing, source re-verification
missing, go/no-go not passed); `previewSolLstSelectorReadiness().canSelect` is
false. Future selection is deterministic (approved riskScore → TVL → withdrawal →
APY-30d → id). **No production enablement:** it never uses the QA-only 7.75, shows
no UI, updates no live suggestions, enables no transactions, and mutates no
metadata/registry/mappings/drafts. `productionReady` stays `false`. Not imported by
any live/engine/UI file.

---

## 13B — internal UI preview shell

`protocolSolLiquidStakingSelectorPreview.ts` +
`protocolSolLiquidStakingSelectorPreview.md` add an internal-only copy model for the
future exact SOL staking recommendation UI. It is **hard-disabled**
(`PROTOCOL_SOL_LST_SELECTOR_PREVIEW_ENABLED = false`), never mounted in the live app,
and does not render in Dashboard/Portfolio/Review modal. `getDefaultSolLstSelectorPreview()`
→ status `disabled` (no protocol named, safety note "WealthSmith does not move funds
for you."); the internal example shows future copy tagged `INTERNAL_PREVIEW_NOT_LIVE`
with no selected protocol, no QA score, and no production-readiness claim. **No
production enablement:** no live suggestions updated, no transactions, no UI mounted;
`productionReady` stays `false`. Not imported by any live/engine/UI file.

---

## 13C — dev-only mounted preview route

`app/src/components/internal/` (`internalPreviewFlags.ts`, `InternalPreviewGate.tsx`,
`SolLstSelectorPreview.tsx`, `solLstSelectorPreview.css`) +
`protocolSolLiquidStakingSelectorPreviewRoute.md` add a **dev-only** route
(`/internal/sol-lst-preview`) so a reviewer can visually verify the future exact SOL
staking recommendation UI. `App.tsx` gains a dev-only guarded branch that renders the
preview ONLY when `import.meta.env.DEV && VITE_INTERNAL_SOL_LST_PREVIEW === "true"`
and the exact path matches — every normal/production flow renders `MainApp`
unchanged. The selected-state example shows JitoSOL only as `INTERNAL_PREVIEW_NOT_LIVE`
with disabled buttons. **No production enablement:** not in Dashboard/Portfolio/modal,
no live-suggestion update, no selection, no transactions; all selection/selector
flags false; `productionReady` stays `false`. Run:
`VITE_INTERNAL_SOL_LST_PREVIEW=true npm run dev`.

---

## 13D — dev-only fake-token recommendation fixture

`internalSolStakingRecommendationFixture.ts`/`.md` +
`SolStakingRecommendationFixture.tsx` + `solStakingRecommendationFixture.css` add a
dev-only fake-token UI fixture (rendered as a third panel on the existing
`/internal/sol-lst-preview` route). Fake wallet: **12.5 SOL total, 0.1 SOL reserve,
12.4 SOL eligible** (~$1,860 at a clearly-fake ~$150 price); Jito · JitoSOL shown only
as `INTERNAL_PREVIEW_NOT_LIVE`, all buttons disabled. **Not Demo Mode, not real wallet
data, not production.** No production enablement: `updatesLiveSuggestions`/
`transactionsEnabled` false; not imported by `stakingSuggestion`/`engine`/
`toSuggestionCard`/Dashboard/Portfolio/modal; live suggestions `not_evaluated`; all
selection/selector flags false; `productionReady` stays `false`.

---

## 13E — Demo Mode exact SOL staking scenario (shared UI)

`demoExactSolStakingScenario.ts`/`.md` add a Demo Mode exact SOL staking scenario that
renders through the SAME shared UI real wallet mode uses — `RealWalletSuggestionsRail`
→ `SuggestionCard` → `SuggestionReviewModal` — via `buildDemoExactSolStakingRail()`
(a shared `SuggestionCardState` + `SuggestionReviewDetails`). Optional protocol-display
fields were added to the shared card + review-details models (real wallet mode does not
populate them yet). Demo Mode gains a "Default Demo / SOL Staking Demo" switch;
Default Demo is unchanged. Fake wallet: **12.5 total / 0.1 reserve / 12.4 eligible SOL**
($150 fake price → $1,860); Jito · JitoSOL labeled **`DEMO_PREVIEW_NOT_LIVE`**
(never `INTERNAL_PREVIEW_NOT_LIVE`). **No production enablement:** review-only, no
transaction/signature; real-wallet suggestions unchanged (`not_evaluated`, no
selectedProtocolId/Name); scenario not imported by `stakingSuggestion`/`engine`/
`toSuggestionCard`; all selection/selector flags false; `productionReady` stays
`false`.

---

## 13F — verified JitoSOL market data in the Demo scenario

The Demo exact SOL staking scenario's shared Review Details modal now shows verified
JitoSOL market data (`protocolSelectionDisplay.marketData`, source status "Verified
source data · Demo preview"): TVL $767.95M, current APY 5.36%, 30-day APY 5.45%,
direct unstake ~48h, unstake fee 0.1%, 4% annual management fee on rewards. The demo
guardrail reads "Protocol selection (verified for demo)" (no longer "needs market
data"). This is a **shared** modal section (real wallet mode uses the same section
later) gated on `marketData` being present. **No production enablement:**
`productionStatus.realWalletSelectionEnabled`/`.transactionsEnabled` false; real-wallet
staking `not_evaluated` with no selectedProtocolId/Name; all selection/selector flags
false; `productionReady` stays `false`; no transaction/signature path.

**Step 13G — real wallet read-only beta:** the same verified JitoSOL market data now
also appears in **real wallet mode** behind the read-only beta flag (source status
**"Verified source data"**, mode `production`) — see
[jitoSolBetaActivation.md](jitoSolBetaActivation.md). `realWalletSelectionEnabled` is
true (read-only selection) while `transactionsEnabled` stays false. This is a
recommendation to review, not execution: no transaction, signature, or fund movement.

**Step 13I — read-only route/liquidity/slippage evaluation:** the execution guardrails
are now surfaced via a read-only "Route and execution checks" section rather than left as
generic "not evaluated yet" — see
[jitoSolReadOnlyRouteEvaluation.md](jitoSolReadOnlyRouteEvaluation.md). Because idle SOL →
JitoSOL is a **direct protocol stake** (not a DEX swap), route cost is *checked for
review* and DEX liquidity depth / slippage are *not applicable*. A swap-route path stays
*insufficient data* until a real read-only quote exists; no route/liquidity/slippage value
is invented. Still read-only: no transaction, signature, or fund movement.

**Step 14A — multi-protocol candidate registry:** the SOL liquid-staking candidates are now
catalogued in a read-only registry (`solLiquidStakingCandidateRegistry.ts`; see
[solLiquidStakingCandidateRegistry.md](solLiquidStakingCandidateRegistry.md)). Only JitoSOL
is approved (`active_read_only_beta`, verified data + risk 7.75); mSOL/JupSOL/bSOL/INF are
`staged_candidate` with `needs_review` market/mechanics and no risk score. The reviewer-
confirmed (non-production) DefiLlama values for JupSOL/mSOL/bSOL live in the confirmation
ledger but are **not** carried in as verified — they stay `needs_review` until 14B
re-verifies them; INF has no value and none is invented. Nothing here changes live/Demo/
testing behavior or enables transactions/signatures.

**Step 14B — staged-candidate source/value confirmation:** those prior DefiLlama values
are now recorded in `solLiquidStakingSourceValueConfirmation.ts` (see
[solLiquidStakingSourceValueConfirmation.md](solLiquidStakingSourceValueConfirmation.md))
under a **24h freshness rule** — `verified` only within 24h of `confirmedAt`
(2026-07-12T00:00:00Z), else `stale` (currently stale). INF market data is `missing`;
mechanics/evidence stay `needs_review`. No candidate is approved, scored, or selected, and
no live/Demo/testing behavior changes.

**Step 14C — risk scoring gate:** `solLiquidStakingRiskScoringGate.ts` (see
[solLiquidStakingRiskScoringGate.md](solLiquidStakingRiskScoringGate.md)) reports which
staged candidates are blocked from risk scoring and why — currently **all four are
blocked** (stale/missing market data, mechanics/evidence review required, source
re-verification required, rubric + approval decision not approved). It is a gate only: it
assigns no scores, approves nothing, selects nothing, updates no live recommendation, and
adds no transaction/signature. 14E will assign scores only for candidates the gate reports
as `ready_for_scoring`.

**Step 14D — fresh source/evidence intake:** `solLiquidStakingFreshEvidenceIntake.ts` (see
[solLiquidStakingFreshEvidenceIntake.md](solLiquidStakingFreshEvidenceIntake.md)) is the
intake/validation layer for recording fresh market/mechanics/evidence for
mSOL/JupSOL/bSOL/INF. A record is `accepted` only with value + sourceName + sourceUrl +
confirmedAt + confirmedBy + reviewerRole within 24h; otherwise stale/incomplete/rejected.
No value or evidence is invented; without fresh input candidates stay blocked. It assigns
no scores, approves nothing, selects nothing, and changes no live/Demo/testing behavior. A
non-live preview confirms a complete package still needs rubric + risk-approval decision.

**Step 14E — real fresh-evidence records:** `solLiquidStakingFreshEvidenceRecords.ts` (see
[solLiquidStakingFreshEvidenceRecords.md](solLiquidStakingFreshEvidenceRecords.md)) is
where real verified evidence is recorded via the 14D intake. **Currently Mode A
(empty/partial)** — no fresh verified values are available, so the arrays are empty and all
four staged candidates remain blocked (none `readyForRiskGate`); stale 14B values are not
reused as fresh and nothing is invented. Records are added by appending fully populated
inputs (value + unit + source + confirmedAt + confirmedBy + reviewerRole + notes) within
the 24h window. No scores, no approval, no live-recommendation change, no
transaction/signature.

**Step 14F — Marinade · mSOL:** attempted to fill mSOL's fresh evidence, but no value
could be verified with valid human-reviewer provenance this step; the stale 14B mSOL
figures must not be reused as fresh and nothing is invented. The mSOL array stays empty
(0/10 categories), so mSOL remains blocked, unscored, unapproved, and absent from real
wallet mode. The records doc lists the ten categories and their sources for manual
verification.

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

**Steps 14F + 14G + 14H — Marinade · mSOL:** founder-authorized public-source fetches
(2026-07-13) recorded **9 of 10** categories: market data (`tvl` $182,837,237, `current_apy`
4.73658%, `apy_30d` 5.84%, DefiLlama pool `b3f93865-…`), `withdrawal_mechanics` +
`audit_security` (Marinade docs); `direct_unstake_fee` (0.2% direct/delayed path, FAQ
verbatim; instant path LP/Jupiter-priced), `operational_risk` (SAM delegation, stake pool,
LP/Jupiter dependency, 13-party multisig), `incident_review` (documented SAM unstake-priority
logic bug, ~37,000 SOL / ~28% missed rewards over epochs 652–777 — a point-in-time finding,
not a clean-history claim); and `annual_management_fee` = 0 (Marinade docs verbatim "No
performance fees on staking rewards"; SAM revenue model; supersedes historical ~6%). And **14I** recorded
the last field, `direct_unstake_time`, as sourced **epoch-based text** ("claimable after
epoch n+1") after the intake was extended to accept `direct_unstake_time` as numeric hours OR
text — so no hours are invented for an epoch-based protocol. Nothing was invented and no
stale value reused. mSOL now has all 10 categories and is `readyForRiskGate: true` **while
fresh** (stale beyond the 24h window).

**Step 14J — mSOL risk score (assigned for review):** from the completed evidence, mSOL is
assigned a deterministic **7.40 / 10** (`assigned_for_review`, draft rubric) —
`solLiquidStakingMsolRiskScore.ts` (see
[solLiquidStakingMsolRiskScore.md](solLiquidStakingMsolRiskScore.md)). Dimension scores
(audit 9, maturity 8, TVL 7, withdrawal/fee 8, operational 6, incident 4) are weighted by the
existing rubric; the score is assigned only while evidence is fresh + `readyForRiskGate`. The
rationale includes the disclosed SAM unstake-priority bug (risk) and the audit/TVL evidence
(positive). **Score assignment only:** mSOL stays `staged_candidate`, `approvedForReadOnly
Recommendation: false`, registry `riskScore` still `undefined`; JitoSOL remains the only
selected live protocol; no live/Demo/testing change and no transaction/signature.

**Step 14K — mSOL read-only review approval:** with the 7.40 score (≥ 7 threshold), fresh
evidence, and the SAM incident acknowledged, mSOL is **approved for read-only review
exposure** — `solLiquidStakingMsolReadOnlyApproval.ts` (see
[solLiquidStakingMsolReadOnlyApproval.md](solLiquidStakingMsolReadOnlyApproval.md)). The
approval is limited: `approvedForReviewExposure: true` but `approvedForProtocolSelection:
false`, `selectedByProtocolLogic: false`, `currentWinner: false`, no live-recommendation /
transaction / signature change. It does **not** mutate the base registry (mSOL stays
staged/unapproved/unscored; `getApprovedSolLiquidStakingCandidates()` stays Jito-only); a
separate non-mutating `getReadOnlyReviewApprovedSolLiquidStakingCandidates()` lists JitoSOL +
mSOL. mSOL is not shown in the UI yet (14L), and JitoSOL remains the only selected live
protocol.

**Step 14L — mSOL surfaced as a read-only alternative to review:** approved mSOL now appears
as an "Other protocols to review" section in the shared review modal across real wallet, Demo
Mode, and `/testing` (a dedicated "mSOL Review Candidate" card), via
`buildMsolReadOnlyReviewCandidateDisplay`. Fresh → `approved_for_review_exposure` (TVL/APY/
mechanics/evidence + risk score 7.40); stale → `stale_evidence`. It is review-only —
`selectedByProtocolLogic`/`currentWinner`/`transactionsEnabled`/`walletSignatureRequired` all
false, no execution CTA, with "Not selected by protocol logic yet." + the deterministic-
selection + "will not move funds" copy. JitoSOL stays the selected protocol; mSOL never
becomes `selectedProtocolId`, never affects Top Pick/ordering, and the selector comparison
stays deferred.

**Step 14M — Jupiter · JupSOL run through the full read-only pipeline:** founder-authorized
public-source fetches recorded **all 10** categories for JupSOL. Market data from the DefiLlama
JupSOL pool `52bd72a7-9e81-4112-abb4-71673e8de9bf` (latest data point 2026-07-13T19:01Z): `tvl`
391,943,484 usd, `current_apy` 5.68777%, `apy_30d` 5.60% (30-day mean computed deterministically
from the last 30 daily `apy` values; range ~5.55–5.69%). Mechanics/audit/operational from
official Jupiter docs (`jupsol.md` + stake-sol FAQ): `withdrawal_mechanics` (instant DEX swap
or ~2-day delayed stake-account withdrawal); `direct_unstake_time` **text** (~2 days / one
epoch — epoch-based per the 14I dual format, no hours invented); `direct_unstake_fee` 0.1% (pool
unwrap); `annual_management_fee` 5% (Jupiter validator commission on inflation rewards, 0% MEV)
with the **separate** Sanctum epoch fee on base rewards disclosed in notes rather than merged
into one number; `audit_security` (Sanctum SPL Stake Pool Program, audited 9×, >$4B secured);
`operational_risk` (single Jupiter validator concentration + Sanctum infra + 11-member
multisig); `incident_review` (**point-in-time** — no independent JupSOL incident found; the
"without exploits" statement is Jupiter's own, **not** a clean-history claim). Nothing invented;
no stale 14B value reused. JupSOL is `readyForRiskGate: true` while fresh → **risk score 7.65/10**
(`assigned_for_review`; higher than mSOL's 7.40 mainly on TVL and no disclosed loss event, offset
by single-validator concentration) → **approved for read-only review** (score ≥ 7, risks
acknowledged) → **surfaced in the review modal** alongside mSOL (fresh →
`approved_for_review_exposure` + 7.65; stale → `stale_evidence`). Review-only throughout: no
selection, no winner, no Top Pick/ordering change, no execution path; the base registry stays
Jito-only for the selector and JitoSOL remains the only selected live protocol. The combined
non-mutating preview `getAllReadOnlyReviewApprovedSolLiquidStakingCandidates()` returns Jito +
mSOL (unchanged) + JupSOL when fresh.

**Step 14N — BlazeStake · bSOL run through the full read-only pipeline:** founder-authorized
public-source fetches recorded **all 10** categories for bSOL. Market data from the DefiLlama
bSOL pool `387d6732-59f0-4ae0-8a88-aba75a5cbe4a` (latest data point 2026-07-13T20:01Z): `tvl`
67,130,773 usd, `current_apy` 5.59573%, `apy_30d` 5.34% (30-day mean computed deterministically
from the last 30 daily `apy` values; range ~5.27–5.60%) — **fresh, not** the stale 14B values
(~$69.75M / 5.27%). Mechanics/audit/operational from the official BlazeStake docs
(`stake-docs.solblaze.org`): `withdrawal_mechanics` (instant reserve-pull unstake or delayed
native-stake-account unstake); `direct_unstake_time` **text** (delayed unstake → native Solana
stake account; ~2-3 day / epoch-boundary deactivation — mechanism from BlazeStake docs, timing
basis from Solana's standard stake-deactivation cooldown, **no fixed hours invented** per the
14I dual format); `direct_unstake_fee` 0.1% (instant and delayed both 0.1%); `annual_management_fee`
0% ("Epoch fee: 0%", "Deposit fee: 0%"); `audit_security` (7 audits by 5 firms — Quantstamp,
Neodyme ×4, Kudelski, Halborn, OtterSec); `operational_risk` (non-custodial, validator monitoring
+ human review, Solana-Foundation-overseen upgrade multisig, DeFi feature surface); `incident_review`
(**point-in-time** — no independent bSOL incident found; the docs disclose none — **not** a
clean-history claim). Nothing invented; no stale 14B value reused. bSOL is `readyForRiskGate: true`
while fresh → **risk score 7.35/10** (`assigned_for_review`; lowest of the reviewed set, dragged
by the smallest TVL, lifted by strong audits + transparent low fees) → **approved for read-only
review** (score ≥ 7, risks acknowledged) → **surfaced in the review modal** alongside mSOL and
JupSOL (fresh → `approved_for_review_exposure` + 7.35; stale → `stale_evidence`). Review-only
throughout: no selection, no winner, no Top Pick/ordering change, no execution path; the base
registry stays Jito-only for the selector and JitoSOL remains the only selected live protocol.
The combined preview `getAllReadOnlyReviewApprovedSolLiquidStakingCandidates()` now returns Jito
+ mSOL + JupSOL (all unchanged) + bSOL when fresh.

**Step 14O — Sanctum · INF (multi-LST pool) run through the pipeline, BLOCKED below threshold:**
founder-authorized public-source fetches recorded **all 10** categories for INF. Market data
from the DefiLlama INF pool `3075a746-bdd1-4aac-bcd5-b035abee2622` (latest data point
2026-07-14T02:01Z, read from raw JSON to avoid unreliable LLM extraction): `tvl` 152,555,981 usd,
`current_apy` 5.83868%, `apy_30d` 5.95% (30-day mean from the last 30 daily `apy` values; range
~5.75–6.23%). Composition/mechanics/fees/audits/operational from official Sanctum docs
(`learn.sanctum.so`): INF is a **shared-liquidity pool** for LST swaps that HOLDS many
underlying LSTs — all Sanctum LSTs plus non-Sanctum **jitoSOL and bSOL** plus SOL/wSOL — with
dynamic allocation (excess SOL staked to top-performing Sanctum LSTs, underperformers unstaked);
`withdrawal_mechanics` = RemoveLiquidity (burn INF → share of an underlying LST/SOL, instant);
`direct_unstake_time` **text** (no per-LST holder cooldown — instant pool redemption — so no
hours invented); `direct_unstake_fee` 0.2% (20bps liquidity withdrawal; 90/10 fee split);
`annual_management_fee` 0% (no pool-level fee on rewards; underlying LSTs carry their own fees);
`audit_security` (Infinity program audited 3× — OtterSec/Sec3/Neodyme — + base SPL stake pool
5×); `operational_risk` (multi-LST basket + dynamic allocation + S Controller/pricing/value-
calculator dependency + **explicit OVERLAP** with JitoSOL and bSOL — recorded as NOT independent
diversification); `incident_review` (**point-in-time** — no independent INF incident found; not
a clean-history claim). Nothing invented; no stale value reused. INF is `readyForRiskGate: true`
while fresh → **risk score 6.95/10** (`assigned_for_review`; below the single-LST cohort due to
pool-structure complexity, added program surface, variable swap-fee transparency, and
non-independent overlap) → **read-only review approval BLOCKED** (6.95 < 7.0 threshold; blocker
`risk_score_below_threshold`; `getInfReadOnlyApprovalDecision()` is `null`). **No product-facing
UI:** INF is NOT surfaced in Real Wallet / Demo / the approved review section and is NOT added to
`getAllReadOnlyReviewApprovedSolLiquidStakingCandidates()` (still Jito + mSOL + JupSOL + bSOL).
Its only UI presence is a clearly-labelled internal `/testing` BLOCKED evidence card. mSOL/JupSOL/
bSOL review behavior unchanged; JitoSOL remains the only selected live protocol; no execution
path anywhere.

**Step 14P — Native SOL / Jupiter Native Stake baseline added (separate model), BLOCKED
incomplete:** a native SOL staking BASELINE candidate is added — NOT an LST and NOT JupSOL. It
is a native Solana stake account of delegated SOL (`protocolId "jupiter_native_stake"`,
`assetSymbol "SOL"`, `candidateType "native_staking"`, `isLiquidStakingToken false`,
`splTokenMint null`), with its own evidence model (`solNativeStakingBaselineEvidence.ts`) —
detected via Solana stake accounts (no SPL mint), distinct from JupSOL (an SPL LST token).
Founder-authorized collection (2026-07-14T02:45Z, `confirmedBy Ashot` / `founder`) recorded
**7 of 10** categories from authoritative sources (Jupiter Stake FAQ
`https://docs.jup.ag/user-docs/earn/stake-sol/faq.md` + the Solana native-staking model):
`withdrawal_mechanics` (native stake account; deactivate → withdraw at epoch end;
non-custodial), `unstake_time` (epoch text, ~2 days / end of epoch, no rewards during
deactivation — no hours invented), `validator_commission` **5%** on inflation rewards / 0% MEV
(**authoritative doc resolves a public search snippet that claimed "0% commission"**),
`annual_management_fee` **0%** (you own the stake account; no pool/management fee),
`security_model` (non-custodial; native stake account, NOT an SPL LST token like JupSOL; base
Solana stake program), `operational_risk` (single-validator delegation, epoch lockup, lower
DeFi composability than LSTs, not an LST), `incident_review` (point-in-time; base staking
program, no slashing; not a clean-history claim). The **3 market categories**
(`delegated_stake_or_tvl`, `current_apy`, `apy_30d`) are **MISSING** — Jupiter does not publish
an exact native-staking APY / 30-day APY / delegated stake, and the validator stats page is
JS-rendered (unverifiable via fetch), so they were left missing rather than invented or reused
from JupSOL. `readyForRiskGate: false` → **no risk score** (the risk-score module defines the
native-adapted rubric mapping + rationale but assigns nothing) → **read-only approval BLOCKED**
(blocker `missing_risk_score`) → **no product-facing UI** (only a clearly-labelled internal
`/testing` BLOCKED card). JitoSOL stays the only selected protocol; mSOL/JupSOL/bSOL review
behavior and INF's blocked state are unchanged; no execution path anywhere.

**Step 14Q — Native validator market-data adapter (Option C hybrid), adapter+fixtures only:**
`nativeValidatorMarketData.ts` adds the plumbing to source native staking's three missing
market fields. **Sources:** Solana RPC `getVoteAccounts` = source of truth for delegated
(activated) stake + commission (vote account `CatzoSMUkTRidT5DwBxAC2pEtnwMBTpkCepHkFgZDiqb`);
validator analytics (Stakewiz primary → Solana Compass fallback → Validators.app optional, no
token required) for current + 30-day APY. Parsers: `parseJupiterNativeStakeVoteAccountFromGetVoteAccounts`
(lamports→SOL, commission %, flags `vote_account_not_found`/`validator_delinquent`),
`parseNativeValidatorApyFromAnalytics` (finds the validator by vote key, current APY + 30-day
mean from the last ≤30 history values; a network-wide-only payload is recognized but **not**
used to unblock; unknown schema → `source_schema_unrecognized`). `buildNativeValidatorMarketData`
yields `complete`/`partial`/`missing`/`stale` (24h window; `delegatedStakeUsd` only with a SOL
price) and `convertNativeValidatorMarketDataToEvidenceInputs` turns **complete** data into the
3 missing native evidence inputs (delegated_stake_or_tvl / current_apy / apy_30d) with full
source attribution. **Hard safeguards:** never reuses JupSOL APY/TVL, never uses network-wide
APY, never approves/scores native staking, never enables selector comparison, never mutates the
evidence array, no transaction/signature path; `isLiquidStakingToken: false` / `splTokenMint:
null` throughout. No live fetch is wired into runtime (documented `fetchNativeValidatorMarketData`
contract for a later backend/job). The native baseline stays blocked; JitoSOL selector,
mSOL/JupSOL/bSOL review, and INF's blocked state are unchanged.

**Step 14T — Jupiter Native Stake completed with Stakewiz + Marinade (public, no API key):**
the native baseline's three market records are now recorded from public validator data.
**Stakewiz** (`https://api.stakewiz.com/validator/CatzoSMUkTRidT5DwBxAC2pEtnwMBTpkCepHkFgZDiqb`)
= source of truth for `delegated_stake_or_tvl` (12,500,954.43 SOL), `current_apy` (5.23%),
commission (5%), identity (`JUPiTERr…`), delinquency (false), epoch (1001). **Marinade
validators API**
(`https://validators-api.marinade.finance/validators?query_vote_accounts=CatzoSMUkTRidT5DwBxAC2pEtnwMBTpkCepHkFgZDiqb`)
= source for `apy_30d`: per-epoch validator APY history (delegator-facing, net of commission)
computed as a **duration-weighted 30-day average = 5.40%** over completed epochs 986-1000
(coverage 30.13 days, latest complete epoch 1000 ended 2026-07-12), independently cross-checked
against Trillium (epoch 1000: 5.2523% vs 5.2462%). All validator-specific — **not** JupSOL,
**not** mSOL (Marinade's `/msol/apy` endpoint is explicitly rejected), **not** network-wide.
Evidence is 10/10 fresh → `readyForRiskGate` → deterministic risk score **7.10** (audit 8,
maturity 7, delegated-stake 8, fee-transparency 7, operational 5 for single-validator
concentration, incident 7) → read-only approval (>= 7) → surfaced as a **"Baseline to review"**
in Real Wallet / Demo / /testing. Native keeps `isLiquidStakingToken false` / `splTokenMint
null` / `assetSymbol "SOL"`; JitoSOL stays selected; mSOL/JupSOL/bSOL review and INF's blocked
state are unchanged; no selector comparison; no transaction/signature path.

## 14U — live market-data refresh + cache layer

A server-side **refresh + last-known-good cache** for the eligible SOL staking candidates,
distinct from approval evidence. Sources (all public, no key): **DefiLlama** `yields.llama.fi/pools`
matched by exact verified pool UUID for JitoSOL/JupSOL/mSOL/bSOL/INF (current APY = `apy`,
30-day = `apyMean30d`, TVL = `tvlUsd`); **Stakewiz** + **Marinade** validator history for Jupiter
Native Stake (the 14T pipeline). Freshness: 24h window, 6h refresh interval, 24h hard-stale;
Marinade latest-epoch window 96h. Failed refreshes preserve previous last-known-good values
(original `fetchedAt` kept; old data marked stale, ineligible). `npm run market:refresh-staking`
→ atomic write to git-ignored `tmp/sol-staking-market-data-cache.json`. No selector/ranking, no
approval/risk/evidence mutation, INF stays blocked, no execution path. See
[solStakingMarketDataRefresh.md](./solStakingMarketDataRefresh.md).

## 14V — normalized candidate comparison model

Normalizes the Step 14U live cache + reviewed static facts into one shared model for Step 14W,
with per-metric `comparisonScope` so consumers know which fields are genuinely comparable
(`all_candidates`: current/30-day APY, transparent APY delta, reviewed risk score) versus
type-specific or descriptive (LST TVL `lst_only`, native delegated stake `native_only`, fees
`candidate_type_specific`, exit/token model `descriptive_only`). Reviewed risk scores are read
from the existing score modules (not recalculated); fees stay separate (no synthetic total);
adoption units stay distinct (USD TVL vs SOL delegated stake, never interchangeable). No scoring,
ranking, winner, weights, UI, or execution. See
[solStakingCandidateNormalization.md](./solStakingCandidateNormalization.md).

## 14W — read-only selector comparison

Deterministic comparison over the Step 14V selector-ready candidates under
`balanced_safety_first_v1` (reviewed risk 0.50 used exactly + 30-day APY 0.30 + current APY 0.10 +
APY stability 0.10; total 1.00). Only cross-candidate comparable metrics are scored; adoption/fees/
exit/token model remain zero-weight descriptive context (no cross-type TVL-vs-stake or fee
comparison). Produces a transparent per-dimension breakdown, a deterministic ranking (canonical
order as final tie-break), and a "comparison leader" — with NO activation: `selectedProtocolId`
unchanged, no product winner, no UI/Top-Pick/ordering change, no execution, INF never scored. See
[solStakingSelectorComparison.md](./solStakingSelectorComparison.md).

## 14X — sensitivity analysis + activation gate

Deterministic policy/market/availability sensitivity scenarios over the Step 14W comparison, plus a
historical-snapshot analysis and a formal activation-review gate. Sensitivity aggregates leader
retention, margins, knife-edge, and policy/market sensitivity (leader-stable requires margin ≥0.25,
retention ≥0.70, knife-edge ≤0.25, ≥8 eligible scenarios). Activation additionally requires ≥12
real snapshots spanning ≥72h, operational readiness (scheduled 6h refresh, alerting, rollback,
regression QA, product-copy review), and two human approvals — evaluated in strict order.
`ready_for_human_activation_review` still activates nothing. Real cache: leader mSOL is
policy-robust, market-sensitive; blocked on historical coverage. See
[solStakingSelectorActivationReview.md](./solStakingSelectorActivationReview.md).

## 14Y — read-only comparison-leader presentation

The current Step 14W comparison leader is published as a sanitized same-origin runtime artifact
(`/generated/sol-staking-market-cache.json`; `schemaVersion` 1.0.0; only `{schemaVersion,
publishedAt, marketCache}` — no sourceResponses/headers/secrets) via
`npm run market:refresh-and-publish-staking`, and fetched by the browser same-origin only (never
DefiLlama/Stakewiz/Marinade). A display gate (fresh + complete + ≥2 eligible, no history/sensitivity/
human-approval requirement) drives a deterministic read-only "Top protocol to review right now"
presentation that preserves the exact 14W scores and adds a four-dimension "why it leads"
explanation. Dynamic (may change per refresh); not activation; selectedProtocolId unchanged; Step
14X still gates automatic switching. See
[solStakingSelectorPresentation.md](./solStakingSelectorPresentation.md).

## 14Z — Demo/Real Wallet integration

The current comparison leader + a deterministic leader-vs-runner-up explanation are rendered on the
Demo and Real Wallet staking cards and review modal, driven by one shared
`useSolStakingSelectorPresentation()` (same-origin artifact only). The explanation uses only the
four scored dimensions (reviewed risk 50% / 30-day APY 30% / current APY 10% / APY consistency 10%)
with exact contributions; non-scored TVL/stake/fees/exit/token appear as labeled "Other
considerations". Displayed protocol follows the comparison leader (not selectedProtocolId); JitoSOL
remains the internal default and Step 14X still gates activation. See
[solStakingSelectorProductIntegration.md](./solStakingSelectorProductIntegration.md).

## 15C — contribution-planning price contract

Contribution-planning pricing (Step 15C) uses a validated price CONTRACT, not a new fetcher. Approved
non-browser sources in order: (1) backend-normalized portfolio/token USD valuation, (2) the canonical
internal token-price service `wallet/tokenPrices.ts` (source id `token_price_service`; DefiLlama
`coins.llama.fi` + Jupiter `lite-api.jup.ag` sit BEHIND it and are never called from React for
contribution pricing), (3) a same-origin sanitized runtime payload. SOL contribution price must be
finite, >0, from an approved source, with valid provenance/timestamps, not future-dated beyond a
small skew, and ≤60 minutes old (`SOL_CONTRIBUTION_PRICE_MAX_AGE_MS`). Browser-fetched external-
provider prices are rejected. USDC funding uses the existing normalized USD valuation (not hardcoded
$1). See [contributionPlanningPolicies.md](./contributionPlanningPolicies.md).

## 15H — contribution price provenance in product integration

The Step 15H price adapter (`contributionPriceAdapter.ts`) builds the Step 15C contribution price
quote from the EXISTING canonical price infrastructure only — the internal token-price service
(`wallet/tokenPrices.ts`, source id `token_price_service`, behind which DefiLlama/Jupiter sit),
backend-normalized portfolio USD, or a same-origin runtime payload. It adds NO direct provider call
from React/components, invents no timestamp or provenance, and rejects fixture quotes in real_wallet
mode. Growth plans require a fresh (≤60 min), approved-source, same-origin/backend-normalized quote;
the Safety Buffer plan needs no SOL price.

## 16C — Stable Yield market-data source contract

Stable Yield market data (Step 16C) uses a validated per-product CONTRACT, not a new fetcher
(`yield_strategy_market_data_v1`). Market data is **injected** into `buildYieldStrategyMarketDataSet`
as documented inputs keyed by the 16B registry `strategyId` — nothing is fetched here, and never from
React (`browserFetched: false` is required; a browser-fetched provider value is rejected). A product
only carries market data when it is `approved` **and** has a documented exact address; every value
preserves its source's APY definition/window, exact TVL (USD), and explicit withdrawal state, with
provenance (`sourceId`/`sourceLabel`/`sourceUrl`) and freshness. Freshness: Excess-USDC lane ≤60 min
(the stricter canonical price bound), Safety-Buffer lane ≤15 min. **No stable-yield data source is
wired yet** — no 16B product is approved with a documented address, so the approved candidate set is
empty and every snapshot is a documentation-only `unavailable` state. When exact products are
documented + approved (a later step), their inputs will normalize through this same contract. See
[yieldStrategyMarketData.md](./yieldStrategyMarketData.md).

## 16D — Stable Yield risk-review source boundary

Stable Yield eligibility (Step 16D) reads a **static product RISK REVIEW** contract
(`yield_strategy_risk_review_v1`) that is deliberately separate from identity (16B) and live market data
(16C). A review records reviewed operational status, resulting exposure, custody model, audit status +
references, leverage, smart-contract risk tier / score, and the compatible onboarding risk ids — sourced
from documented due-diligence, never invented. A review's exact strategyId/protocolId/address must match
the registry, and a review **may not approve an undocumented product**, so there are **no production risk
reviews today** (the store is empty). Eligibility reuses the canonical documented thresholds
(`engineThresholds.ts` 12E gates: `MIN_PROTOCOL_TVL_USD`, `MIN_PROTOCOL_RISK_SCORE`,
`MAX_WITHDRAWAL_HOURS_FOR_SAFETY_BUFFER`/`_GENERAL_YIELD`, `MIN_LIQUIDITY_USD`) and the 16C freshness
bounds; it invents no new numbers. No canonical product-review freshness max-age is documented, so
expiry relies only on a review's explicit `validUntil`. See
[yieldStrategyEligibility.md](./yieldStrategyEligibility.md).

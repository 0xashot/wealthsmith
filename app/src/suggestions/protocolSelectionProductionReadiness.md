# Protocol Selection — Production Readiness (Step 12I)

**Planning only. This step enables nothing.** Protocol selection stays disabled,
live suggestions stay `not_evaluated`, and no protocol is selected, named, or
shown. `PROTOCOL_SELECTION_IMPLEMENTED = false`. Flags live in
`protocolSelectionFeatureFlags.ts` (all default OFF).

## A. Current status

- A QA-only selection pipeline exists (registry → adapters → eligibility → route
  guardrails → scoring → QA-only selection) and can pick a deterministic winner
  from **fixture/simulated** data for SOL liquid staking.
- **Production selection is disabled.** Live suggestions stay `not_evaluated`.
- No user-facing protocol recommendation exists anywhere in the app.

## B. What "production selection" would mean (future, gated)

- `protocolSelection.status` may become `selected`.
- `selectedProtocolId` / `selectedProtocolName` may appear in engine output.
- the `protocol_selection` guardrail may become `passed` **only when selection
  was actually evaluated from real, complete data**.
- the UI may show a selected protocol **only** after copy/product review and only
  while `PROTOCOL_SELECTION_SHOW_IN_UI` is true.

None of the above happens today.

## C. Required gates before enablement

**Gate 1 — Real market data:** APY + TVL from a real source, freshness
timestamp, data-source attribution, stale-data fallback, and per-protocol
mapping verified.

**Gate 2 — Risk registry:** documented `riskScore` methodology, protocol-specific
`riskScore`, `auditStatus` with source, `withdrawalClass`/`withdrawalTimeHours`
with source, `safetyBufferEligible` where relevant, `lastReviewedAt`, reviewer /
source notes.

**Gate 3 — Eligibility:** candidate must pass `evaluateProtocolEligibility`;
missing data → `insufficient_data`; failing gates → `ineligible`; no candidate
can be selected without an eligibility pass.

**Gate 4 — Route / liquidity / cost (when a route is needed):** `quoteAvailable`,
`priceImpactPct`, `liquidityUsd` (or approved proxy), network-fee/cost data where
applicable, and failure fallback to `not_evaluated`.

**Gate 5 — Scoring:** complete scoring inputs, deterministic winner from
`rankProtocolCandidates`, stable tie-breakers, APY cap active, risk-weighted
model active.

**Gate 6 — QA:** mock fixtures, mainnet-simulated fixtures, a real-data dry-run,
plus stale-data, missing-data, no-candidate, tie-breaker, and regression tests.

**Gate 7 — Product / copy / compliance:** approved user-facing language — no
"best", "safest", "guaranteed", "risk-free", "optimal"; no "we will move funds";
explicit review-only / non-custodial language; legal/compliance review if needed.

**Gate 8 — Feature flag rollout:** default off → internal only → test wallets →
limited beta → production.

**Gate 9 — Fallback behavior:** if ANY required data is missing, stale, or
failing → `protocolSelection.status = not_evaluated`, `selectedProtocolId` /
`selectedProtocolName` absent, `protocol_selection` guardrail `not_evaluated`, no
UI recommendation.

## D. Feature-flag rollout stages

- **Stage 0 — disabled:** current behavior; everything `not_evaluated`.
- **Stage 1 — qa_only:** QA utility selects from fixture/simulated data only.
- **Stage 2 — internal_dry_run:** real adapters may run in logs/dev tools only,
  no UI output.
- **Stage 3 — internal_ui_preview:** selected protocol may appear only in
  internal/dev mode.
- **Stage 4 — limited_beta:** selected protocol may appear for allowlisted
  users/wallets.
- **Stage 5 — production:** selected protocol may appear broadly, only after all
  gates pass.

Current stage: **qa_only** (Stage 1). Advancement is one stage at a time.

## E. First candidate production path

**Recommended first path: SOL liquid staking** — the candidate set exists, the QA
pipeline already exists, there is no Safety-Buffer accounting dependency, and it
is simpler than LP / vault / stable-yield selection. This still requires real
APY, TVL, risk, withdrawal, fee, and liquidity/route data before it can advance.

## F. Explicit non-goals

No transactions, no deposits, no swaps, no wallet signatures, no automatic
movement of funds, no custody, and no AI-generated protocol choices — in this
step or as a consequence of enabling selection later.

## G. Machine-checkable go/no-go (Step 12N)

These gates are now enforced as code in `protocolSelectionGoNoGo.ts`
(`getProtocolSelectionGoNoGo()`), the single machine-checkable checklist for
production readiness. **Current `productionReady = false`** — mechanism gates
(eligibility, scoring, fallback, transaction boundary, QA) pass, but data/review
gates (tvl_mapping, risk_methodology, risk_scores, audit_status, withdrawal_data,
fee_data, stage_2_dry_run, product_copy_compliance, ui_readiness) are blocked.
`isProtocolSelectionGo()` returns `false`. **The go/no-go must pass before any
selection flag (`PROTOCOL_SELECTION_IMPLEMENTED` / `SHOW_IN_UI` /
`ALLOW_TRANSACTIONS`) may change.** See `protocolSelectionGoNoGo.md`.

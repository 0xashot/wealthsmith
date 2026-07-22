# Stable Yield Presentation Contract (Step 16H-B)

Deterministic **card** + **review** view models (and copy mapping) for a Step 16H-A Stable Yield
suggestion. This defines **exactly what future UI components may render** — it builds no React
components, routes, Demo/Real-Wallet integration, `/testing` visual cards, or Smith AI.

Backed by:
- [`yieldStrategyPlanPresentationTypes.ts`](./yieldStrategyPlanPresentationTypes.ts) — versions + card / review / diagnostic contracts.
- [`yieldStrategyPlanPresentation.ts`](./yieldStrategyPlanPresentation.ts) — `buildStableYieldPlanPresentation(suggestion)` + copy templates + fail-closed validator.

## Flow & source-of-truth boundary

```
16G plan → 16H-A EngineSuggestion (+ stableYieldPlan metadata) → 16H-B card + review view models
```

The mapper consumes the 16H-A suggestion + its `stableYieldPlan` metadata and does **formatting only**.
It never re-evaluates the 16G decision, selects another product, changes lane/action-mode/amount,
calculates or infers an amount/APY/capacity/projection/buffer-safety, changes the plan id, decides Top
Pick, reorders suggestions, or generates execution information. Financial calculation is not allowed.

**Field ownership:** 16G owns identity/amount/projection/capacity; 16H-A copies them verbatim into
`stableYieldPlan` + adds the suggestion id + Top-Pick flag; 16H-B only formats them into `title` /
`description` / `*Display` strings, disclosures, and a CTA intent — preserving raw USD values alongside
formatted values.

## Title mapping (deterministic, by lane × action mode)

| Lane | Action mode | Title (names the selected protocol) |
|---|---|---|
| excess | start_new_position | **Put Excess USDC on {protocol}** |
| excess | add_to_existing_strategy | **Add to Your Stable Yield Strategy on {protocol}** |
| buffer | start_new_position | **Put Buffer Funds on {protocol}** |
| buffer | add_to_existing_strategy | **Add to Your {protocol} Position** |

No hype, no promises, no "best/guaranteed/safe yield/risk-free", no product not present in the output.

## Description / reason mapping (singular)

- **excess / start:** "*$X* of your direct wallet USDC is above your required Safety Buffer and is
  eligible to review for the *Product* strategy."
- **excess / add:** "You already hold *Product*. *$X* of eligible direct wallet USDC could be added —
  review before you decide."
- **buffer / start:** "*$X* of buffer-eligible USDC could earn yield in *Product* while your required
  Safety Buffer stays covered."
- **buffer / add:** "*$X* of buffer-eligible USDC could be added to your *Product* position while your
  required Safety Buffer stays covered."

Never claims funds are risk-free, withdrawals are instant, or APY is guaranteed; never says WealthSmith
deposits/moves funds; never combines multiple reasons; never exposes diagnostic codes as copy; never
LLM-generated.

## Card vs review

- **Card** (`stable_yield_plan_card`): title, single-reason description, tag (`Safety Buffer Yield` /
  `Excess USDC Yield`), `categoryLabel: "Stable Yield"`, lane, action mode, amount display + raw
  cents/USD, asset symbol, protocol + product display name, APY presentation, Top-Pick flag, CTA,
  accessibility label, read-only + external-management flags.
- **Review** (`stable_yield_plan_review`): everything on the card plus plain-language summary, funding
  source, exact product/protocol/address identity, APY (with source + checked-at for the review
  surface), current-position context, wallet-USDC before/after, required buffer + buffer before/after +
  coverage/floor-preserved flags, capacity presentation, effective min/max, policy versions,
  disclosures, and a deterministic key/value `rows` list.

## CTA

Read-only `{ label: "Review Strategy", intent: "open_stable_yield_review", executesTransaction: false,
requiresWalletSignature: false, opensExternalUrl: false, completionOnClick: false }`. The intent names a
**future internal review surface** — never a protocol execution URL, prepared transaction, or signing
intent. No Deposit/Invest/Confirm/Execute/Add-Funds/One-Click/Sign.

## Disclosures (deterministic)

Read-only recommendation (WealthSmith cannot move funds) · you manage the position externally · yield
rates can change · protocol + smart-contract risk. No "secure/guaranteed/risk-free" legal promises.

## APY presentation states

`live_protocol_api` / `approved_fallback` (from the supplied `provenanceKind` + source label) ·
`provided` (APY value present without a declared source class — never inferred) · `unavailable` (no APY →
canonical "APY unavailable"). Source is **never** inferred; stale/future/missing APY is never shown as
current; source + checked-at are preserved for the review surface only.

## Capacity presentation

Only the two modes a **ready** plan may carry: `explicit_remaining_capacity` (bounded remaining amount) ·
`verified_uncapped` (bounded by the plan's already-selected eligible amount — **never** "unlimited"). Any
other mode (`deposits_paused`/`product_full`/`unavailable`/`unknown`/`invalid`) on a supposedly ready
suggestion **fails closed** at the `capacity_contract` stage.

## Fail-closed validation

`buildStableYieldPlanPresentation` returns **no** view model + a structured diagnostic when: the input is
missing/incompatible; `stableYieldPlan` meta or source plan id is missing; lane/action-mode invalid;
amount non-positive or cents/USD disagree; funding not `direct_wallet_usdc`; product/protocol identity
missing; projection fields missing or the buffer/floor contract is violated; any execution/transaction/
signature flag appears; `readOnly`/`externalManagementRequired` false; or an unsupported capacity mode
appears. It never silently repairs corrupted data. (It intentionally does **not** reuse the 16H-A
`is_top_pick === false` check — the engine legitimately sets Top Pick before presentation.)

## Diagnostics

`StableYieldPresentationDiagnostic`: emitted/suppressed, source suggestion + plan id, failure stage
(`input_missing` / `validation` / `capacity_contract` / `none`), reason, missing/invalid field, lane,
action mode, APY state, capacity mode, CTA intent, and `containsExecutionIntent: false`. Internal only —
never UI copy.

## Production & flags

Production emits no 16H-A suggestion, so `buildStableYieldPlanPresentation(null)` yields no presentation.
Flags: `STABLE_YIELD_CARD_PRESENTATION_CONTRACT_EXISTS` / `_REVIEW_PRESENTATION_CONTRACT_EXISTS` /
`_DETERMINISTIC_COPY_MAPPING_EXISTS` / `_PRESENTATION_VALIDATION_EXISTS` / `_REVIEW_ONLY_CTA_INTENT_EXISTS`
= true; rendered card / review modal / `/testing` visual fixtures / Demo / Real-Wallet / Smith AI /
execution / transaction / signature = false.

## 16H-C — shared card + review rendering

The 16H-B view models render through the **canonical shared UI** — no parallel card system:

- **Card**: `toSuggestionCard` gains a `stableYieldPlan` branch (mirroring the 15H contribution branch)
  that calls `buildStableYieldPlanPresentation(s).card` and maps it to `SuggestionCardState`
  (title/description/tag → `Excess USDC Yield` | `Safety Buffer Yield`, `impact_text` = "Amount to
  review: $X", `apy: {status, display}`, `badge` Top Pick, `accessibleCtaLabel`, and a CTA with
  `action: null` + all execution booleans false). A corrupted presentation fails closed and falls
  through to the generic never-invented mapping. Rendered by the existing `<SuggestionCard>`, whose CTA
  ("Review Strategy") calls `onReview` (opens the drawer) — never an external protocol / transaction.
- **Review drawer**: `SuggestionReviewModal` gains a `stableYieldReview?: StableYieldReviewPresentation`
  prop and a branch that renders six sections through the SAME accessible modal shell (`role="dialog"`,
  `aria-modal`, focus trap, Escape-to-close, focus restore): **Recommendation** (summary + read-only
  eyebrow), **Strategy** (amount/asset/protocol/product/action/current-position/identifier), **Why this
  fits your plan**, **Before and after** (wallet + buffer, coverage/floor flags), **Yield and capacity**
  (APY + source + checked-at, bounded capacity, min/max), **Important information** (the four
  disclosures). React never computes finance — it only places already-formatted strings into rows.
- **`/testing`**: `stableYieldTestingFixtures.ts` injects deterministic presentation fixtures (16 card
  states, 11 review states, 4 fail-closed) built from synthetic 16G decisions — the production registry
  is never mutated. `TestingPage` renders a dedicated **Stable Yield** section.

Verified in-browser at desktop and 320px: distinct titles/tags per lane×action, APY states (live /
fallback / provided / unavailable), Top Pick badge, "Review Strategy" opens the drawer, Escape closes and
restores focus to the card CTA, all six review sections + disclosures render, capacity never says
"unlimited", no horizontal overflow, and fail-closed fixtures render no card.

Flags true: `STABLE_YIELD_RENDERED_CARD_EXISTS`, `_RENDERED_REVIEW_MODAL_EXISTS`,
`_TESTING_VISUAL_FIXTURES_EXIST`, `_SHARED_CARD_MAPPER_EXISTS`, `_REVIEW_UI_EXISTS`,
`_ACCESSIBILITY_BEHAVIOR_EXISTS`. False: Demo / Real-Wallet / Smith-AI / external-protocol-CTA /
execution / transaction / signature.

## 16H-D — Demo Mode + Real Wallet product integration

The Stable Yield suggestion is now wired into **both** product flows through ONE shared, deterministic,
React-free orchestration boundary that prepares the optional 16G decision passed as
`runSuggestionEngine`'s 4th param (`stableYieldPlanSuggestion`) — mirroring the 15H contribution 3rd-param
pattern. No 16E/16F/16G financial logic is duplicated; the boundary only orchestrates the existing
modules in canonical order and **fails closed** (no suggestion + a diagnostic) on anything but a ready
plan.

```
[demo|real] inputs → deriveStableYieldPlanSuggestion (16E leader → 16F position/capital → 16G plan
  decision → 16H-A suggestion) → runSuggestionEngine(..., stableYieldPlanSuggestion) → engine
  ordering/Top-Pick → 16H-B presentation → 16H-C shared card + review drawer
```

- [`stableYieldProductInput.ts`](./stableYieldProductInput.ts) — `deriveStableYieldPlanSuggestion({ dataMode,
  positions, pricedAsOf?, goal?, buffer?, checkedAt? })` → `{ suggestion, decision, reviewById, diagnostic }`.
  Branches ONLY on `dataMode` for the data **source**; the pipeline is identical.
  - `real_wallet` → `buildProductionStableYieldDecision`: the REAL 16E→16G layers over the production
    registry with **empty** market data / risk reviews / capacity. No approved product and no wired data
    source → deterministic `no_plan` → no suggestion → **no card**. That is the correct production state;
    the *integration* is wired, not the (absent) production data. NO demo/fixture fallback, NO default
    product, NO registry-order/APY fallback, NO TVL-as-capacity.
  - `demo_fixture` → the injected demo decision (gated on the demo Safety Buffer being fully funded;
    otherwise `null` with reason `demo_buffer_incomplete`, so the canonical buffer-incomplete Demo keeps
    suppressing yield).
- [`demoStableYieldScenario.ts`](./demoStableYieldScenario.ts) — DEMO-ONLY deterministic inputs (a
  synthetic approved `managed_vault` `demo_usdc_yield_vault`, capacity, comparison leader, capital
  snapshot, a funded-buffer SOL $9,000 / USDC $6,000 portfolio) that run through the REAL
  `buildYieldStrategyPlanDecision` on a **synthetic demo registry** — never `listYieldStrategies()` / the
  production registry. Produces one ready **excess-lane** plan (amount $500, `direct_wallet_usdc`).
  `buildDemoStableYieldRail()` runs the SAME `deriveRailSuggestions(dataMode:"demo_fixture")`.

**Rail + rendering.** `useRailSuggestions.deriveRailSuggestions` computes the Stable Yield suggestion and
passes it as the engine's 4th arg (never marked Top Pick in the UI; the engine owns ordering). The rail
lifts a `stableYieldReviewById` map keyed by the SAME suggestion id the card uses. `RealWalletSuggestionsRail`
opens the shared `SuggestionReviewModal` with `stableYieldReview` — no separate Demo/Real card or modal
components. Legacy "Put Stablecoins to Work" is suppressed whenever the plan-backed suggestion is present
(one plan → one Stable Yield card; buffer and excess maxima are never summed).

**Demo UI.** `DemoDashboardPage` gains a third scenario button, **"Stable Yield Demo"**, rendering
`buildDemoStableYieldRail()` through the shared rail/card/modal. Default Demo (buffer-incomplete) and SOL
Staking Demo are unchanged.

**Read-only boundary.** `review_only` / `readOnly` / `externalManagementRequired` true;
`executesTransaction` / `requiresWalletSignature` / `opensExternalUrl` / `completionOnClick` false; the
only CTA is "Review Strategy" (opens the shared drawer). No Smith AI, execution, transaction, signature,
deposit, withdrawal, migration, switching, protocol navigation, or deep links.

**Isolation.** Demo products/capacities/clocks can never enter production: the demo registry is a local
array, `listYieldStrategies()` never contains `demo_usdc_yield_vault`, and `getApprovedYieldStrategies()`
stays empty.

Verified in-browser (Demo, desktop + 320px): the "Stable Yield Demo" scenario surfaces one "Put Excess
USDC to Work" card (tag "Excess USDC Yield", $500.00, APY 5.15%); "Review Strategy" opens the shared
drawer with all six sections + four read-only disclosures and no execution CTA; Escape closes and
restores focus to the card CTA; no console errors; no horizontal overflow. Real Wallet (production
pipeline) renders no plan-backed Stable Yield card (`no_plan`), and unrelated suggestions still render.

Flags true: `STABLE_YIELD_DEMO_MODE_INTEGRATION_EXISTS`, `STABLE_YIELD_REAL_WALLET_INTEGRATION_EXISTS`,
`STABLE_YIELD_SHARED_PRODUCT_ORCHESTRATION_EXISTS`, `STABLE_YIELD_PRODUCT_ORCHESTRATION_EXISTS`. False:
`STABLE_YIELD_SMITH_AI_INTEGRATION_EXISTS`, `STABLE_YIELD_PROTOCOL_EXTERNAL_ACTION_CTA_EXISTS`,
`STABLE_YIELD_EXECUTES_TRANSACTION`, `STABLE_YIELD_REQUIRES_WALLET_SIGNATURE`.

## 16H-F — release gate, and the Smith AI / Qdrant deferral

Step 16H-F is the end-to-end acceptance audit. It added no product capability; it reconciled flags,
hardened two fail-closed gaps, and added the `runStableYieldReleaseGateFixtureChecks` acceptance block.

**Smith AI Stable Yield chat integration is explicitly NOT part of Step 16H — it is deferred.**

- No Stable Yield suggestion context is passed into the chat UI today.
- No LLM-generated Stable Yield card or review copy exists anywhere; **all** Stable Yield UI copy is
  deterministic and owned by 16H-B (`yieldStrategyPlanPresentation.ts` templates).
- Stable Yield explanatory/knowledge content is handled separately in the **Qdrant knowledge-base
  workstream**, not here. Step 16H changed no Qdrant file and no Smith AI prompt.
- A future Smith AI integration may consume engine-approved suggestion *facts* (reason codes + the 16H-B
  view model) but must never generate suggestions, select products, or compute amounts. That work is
  outside the current release scope.
- `STABLE_YIELD_SMITH_AI_INTEGRATION_EXISTS` stays **false** and is asserted false by the release gate.

### Fail-closed hardening added at 16H-F

`buildStableYieldPlanSuggestion` now validates its **incoming** decision before converting (previously it
validated only the suggestion it produced): a plan whose `planId` no longer matches its material inputs
(`unstable_plan_id`) fails closed as `invalid_source_plan:…`, and a decision whose mirrored summary
fields (`selectedAmountUsd/Cents`, `selectedStrategyId`, `selectedLane`, `planCount`) disagree with its
`selectedPlan` fails closed as `decision_plan_mismatch`. Conflicting duplicate values are **rejected**,
never silently resolved in favour of one side.

## Remaining work (non-blocking, outside 16H)

- Real-wallet Stable Yield data adapters (16C market data, 16D risk reviews, capacity) — until wired,
  production correctly shows no card.
- Production product approval + the canonical buffer-yield minimum policy.
- Smith AI explanation keyed off the reason codes — via the Qdrant workstream (see above).

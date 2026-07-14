# SOL Staking Selector Sensitivity + Activation Review (Step 14X)

A deterministic sensitivity-analysis and activation-GATE layer. It answers whether the Step 14W
comparison lead is robust or knife-edge under reasonable policy/market changes, whether there is
enough fresh operational/historical evidence to even CONSIDER activation, and exactly which
blockers must be resolved before `selectedProtocolId` could ever change — while remaining strictly
comparison-only and read-only.

Backed by:
- [`solStakingSelectorSensitivityTypes.ts`](./solStakingSelectorSensitivityTypes.ts)
- [`solStakingSelectorSensitivityPolicy.ts`](./solStakingSelectorSensitivityPolicy.ts) — thresholds, scenario catalog, policy-override builder.
- [`solStakingSelectorSensitivity.ts`](./solStakingSelectorSensitivity.ts) — market overrides, scenario runner, historical analysis, validators, diagnostics.
- [`solStakingSelectorActivationGate.ts`](./solStakingSelectorActivationGate.ts) — operational readiness + activation-review decision.

## Sensitivity vs activation

**Sensitivity** may show a robust leader, but **activation** additionally requires historical
coverage, repeated successful refreshes, operational readiness, explicit human approval, and
rollback readiness. A single fresh snapshot and one policy configuration are never enough.
Nothing here activates anything.

## Scenario catalog (deterministic, 18 scenarios)

Synthetic scenarios (everything except `baseline`) are labeled `syntheticScenario: true` and must
never be presented as observed market history.

- **Baseline** (1): unchanged Step 14W policy + market.
- **Policy-weight** (5): `risk_heavier` 0.60/0.25/0.05/0.10, `risk_strict` 0.70/0.20/0.05/0.05,
  `yield_balanced` 0.40/0.35/0.15/0.10, `durable_yield` 0.50/0.40/0.00/0.10, `low_current_signal`
  0.50/0.35/0.05/0.10.
- **Normalization-range** (2): `narrower` (APY 0.15 / stability 0.05), `wider` (0.50 / 0.20).
- **Market perturbation** (6): leader current mean-reversion; all-candidate mean-reversion; leader
  yield −0.25; runner-up yield +0.25; leader −0.15 & runner-up +0.15; all current APY −0.20. APY is
  floored at 0 and the transparent delta is recomputed.
- **Data availability** (4): leader stale; runner-up stale; highest-risk candidate stale; native
  stale. These deliberately change the cohort and are **excluded from the leader-retention rate**.

Dynamic targets (`$baseline_leader`, `$baseline_runner_up`, `$highest_risk`, `$all`) resolve from
the baseline at run time. Scenarios run through the EXISTING Step 14W comparison engine (no scoring
logic duplicated).

## Mutation safety

Overrides never touch the base policy (a new policy object is built and validated; weights must
total 1.00) or the normalized set (a deep clone is perturbed). Only current APY / 30-day APY /
readiness change; reviewed risk, approval, adoption, fees, exit, token model, and evidence are
untouched. Perturbed values are labeled `SYNTHETIC_SENSITIVITY_INPUT`.

## Aggregation

- **Leader retention rate** = retention-eligible completed scenarios keeping the baseline leader at
  rank 1 ÷ retention-eligible completed scenarios (data-availability excluded).
- **Leader margin** = leader total − runner-up total. **Knife-edge** = margin < 0.10.
- **Policy sensitive** = baseline leader changes in any policy-weight scenario OR policy-scenario
  retention < 0.70. **Market sensitive** = leader changes in ≥2 market scenarios OR market-scenario
  retention < 0.70. **Data-availability sensitive** = a scenario leaves <2 candidates, or more than
  one availability scenario cannot complete.
- **Leader stable** requires ALL of: baseline complete; baseline margin ≥ 0.25; retention rate ≥
  0.70; knife-edge rate ≤ 0.25; ≥8 retention-eligible completed scenarios; no invalid scenario.

A leader switch does not mean the implementation is wrong — it is evidence the result may be
policy- or market-sensitive.

## Historical snapshot requirements

`analyzeSolStakingSelectorHistory` uses only REAL supplied snapshots (never synthesized), rejects
duplicate IDs and malformed/out-of-order timestamps, sorts by `cacheGeneratedAt`, and runs each
through the Step 14W comparison. History passes only with **≥ 12 valid snapshots spanning ≥ 72
hours** (consistent with the 6-hour refresh schedule). No history → `historical_coverage_insufficient`.
Sensitivity scenarios are never counted as history.

## Operational readiness

Passes only when: scheduled refresh configured; refresh interval ≤ 6h; ≥ 3 consecutive successful
refreshes; latest cache fresh; repeated-source-failure alerting configured; rollback flag
available; rollback procedure documented; regression QA complete; product-copy review complete.
The two **human gates** are separate: policy sign-off and activation approval. Local QA must mark
any not-actually-complete item **false**.

## Activation-review statuses (evaluated in strict order)

1. `blocked_invalid_input` → 2. `blocked_insufficient_candidates` → 3. `blocked_historical_coverage`
→ 4. `blocked_leader_unstable` → 5. `blocked_policy_sensitive` → 6. `blocked_market_sensitive` →
7. `blocked_operational_readiness` → 8/9. `blocked_human_approval` (policy sign-off, then activation
approval) → 10. `ready_for_human_activation_review`.

**Even `ready_for_human_activation_review` activates nothing.** No status changes
`selectedProtocolId`, sets a product winner, updates UI/Top Pick/ordering, or enables
transactions/signatures. All decision activation flags are hard-`false`.

## Current real-cache outcome (illustrative)

With the single fresh Step 14U cache: baseline leader **mSOL** (margin 0.85), retained across all
policy and normalization scenarios; **market-sensitive** (3 market-perturbation scenarios flip to
JupSOL when leader yield falls / runner-up rises); leader-retention rate ≈ 0.79; no knife-edge
scenarios; policy-sensitive **false**, leader-stable **true**. History = 0 snapshots. Operational
readiness = not configured. Activation review → **`blocked_historical_coverage`** (first failing
gate), with operational-readiness and human-approval gates also unmet. JitoSOL remains selected;
mSOL is not activated.

## Rollback requirement + no product UI / no execution

Any future activation must ship behind a rollback flag (mirroring the JitoSOL read-only beta) with
a documented rollback procedure. No product module imports the sensitivity or activation-gate
result; there is no UI, Top Pick, ordering, transaction, or signature path.

## Future history collection (recommended, not built here)

Each successful Step 14U refresh should eventually persist a sanitized, immutable history record:
cache `generatedAt`; candidate live fields; source freshness/status; normalized selector inputs;
selector policy version; comparison result — with **no secrets** and **no unnecessary raw provider
payloads**. Do not build an unbounded or browser-side history store; use a bounded server-side
append-only log feeding `analyzeSolStakingSelectorHistory`.

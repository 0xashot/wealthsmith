# Protocol Selection QA (Step 12H)

**QA-ONLY. This is NOT production protocol selection and NOT a recommendation.**
It proves that, given complete mock/mainnet-simulated data, the pipeline can
deterministically identify one selected candidate for a single narrow case.
`PROTOCOL_SELECTION_IMPLEMENTED` remains `false`; live suggestions are unchanged.

## Scope

- **Narrow case:** SOL liquid staking (`strategyType: "liquid_staking"`,
  `assetSymbol: "SOL"`). Every other strategy/asset (stable yield, lending,
  vault, LP, arbitrary tokens) returns `status: "disabled"`.
- **Pipeline** (`runProtocolSelectionQa`): eligibility (`protocolEligibility`) →
  scoring + ranking (`protocolScoring`) → pick the top ranked candidate **only
  inside the QA result**. Deterministic.

## QA data is fixture / simulated — not live

`SOL_LIQUID_STAKING_QA_MARKET` / `SOL_LIQUID_STAKING_QA_RISK` are realistic-LOOKING
but **fixture-only** values (each labeled `qa_fixture` / "Fixture-only QA data.
Not live market data. Not a recommendation."). They are never used in production
and never fetched from a live source in this step.

## What the QA-selected protocol is — and isn't

- It is the deterministic top of a risk-weighted ranking among fully eligible
  candidates (missing data never scores; a below-threshold candidate is
  ineligible even with high APY; the highest-APY candidate does not automatically
  win).
- It is **not** shown to users, **not** written to `ProtocolSelection`, **not** a
  guardrail pass, and **not** a recommendation. `selectedProtocolId` exists only
  inside the QA result (`qaOnly: true`).

## Production stays disabled

Live staking/stable_yield suggestions keep `protocolSelection.status =
not_evaluated`, no `selectedProtocolId/Name`, and the `protocol_selection`
guardrail `not_evaluated`. The QA utility is not imported by any live/engine/UI
file, and there is no transaction/signature/swap/send path anywhere in it.

## Before production enablement (future, ≥ 12I)

All of the following must be true first:

1. real data adapters populated (market/risk/route) with verified mappings;
2. a validated, documented risk-scoring methodology (real `riskScore`);
3. live quote/liquidity data if the action requires a route;
4. successful QA with **real** data (not just fixtures);
5. an explicit product decision to expose a selected protocol;
6. a feature flag gating it;
7. UI copy review (no "best/safest/optimal/guaranteed/risk-free");
8. legal / compliance review if needed.

Until then, protocol selection stays `not_evaluated` and disabled.

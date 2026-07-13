# SOL Liquid-Staking Selector Shell (Step 13A)

**The exact SOL liquid-staking protocol selector — a SHELL that is hard-disabled by
default and internal-only.** It defines how WealthSmith will pick an exact
liquid-staking protocol to review once every production gate passes, but it selects
nothing today. Backed by `protocolSolLiquidStakingSelector.ts`.
`PROTOCOL_SELECTION_IMPLEMENTED = false`,
`getProtocolSelectionGoNoGo().productionReady = false`.

## Key properties

- **Hard-disabled by default:** `PROTOCOL_SOL_LST_SELECTOR_ENABLED = false`, so
  `selectSolLiquidStakingProtocol()` returns `status: "disabled"` with
  `selector_disabled` and **no** `selectedProtocolId`/`Name`/`LstSymbol`.
- **Internal-only:** `internalOnly` is always true; the selector is not imported by
  any live/engine/UI file.
- **Does not show UI:** `showsUi` is always false.
- **Does not update live suggestions:** `updatesLiveSuggestions` is always false.
- **Does not enable transactions:** `transactionsEnabled` is always false.

## Current candidate: JitoSOL (staged / blocked)

The only candidate is the staged JitoSOL production-metadata candidate (12Z), which
is `blocked`. A dry-run (`dryRunSolLstSelector`) evaluates it as **blocked** with:
`selector_disabled`, `protocol_selection_feature_disabled`, `go_no_go_not_passed`,
`production_metadata_inactive`, `production_metadata_not_ready`,
`approved_risk_score_missing`, `source_reverification_missing`.

## Why no protocol is selected today

Every selector gate fails: the selector flag is off, production metadata is
inactive/not-ready, there is no approved (non-QA) riskScore, source re-verification
is outstanding, and the production go/no-go has not passed. No candidate is ever
`eligible`, so no protocol is selected. The QA-only 7.75 score is never accepted as
a production riskScore.

## Future deterministic selection rules

Once candidates are eligible (not reachable today), selection is deterministic over
ELIGIBLE candidates only: highest approved riskScore → highest TVL → lowest
withdrawal-time hours → highest APY-30d → protocolId ascending.

## Required gates before user-facing use

1. source re-verification complete;
2. approved rubric decision (recorded human sign-off);
3. approved non-QA riskScore assigned;
4. active production metadata candidate;
5. production go/no-go pass;
6. product / copy / compliance approval;
7. UI readiness approval;
8. selector feature-flag enablement.

## Exact beta wording boundary

Any future user-facing surface uses review-only language such as **"Suggested
protocol to review"** — and never "best", "safest", "optimal", "guaranteed", or
"risk-free". A selected protocol is a review starting point, not an endorsement.

## Non-goals

The selector shell makes no user-facing recommendation, mutates no production
metadata / `protocolRiskRegistry.ts` / `DEFILLAMA_POOL_MAPPINGS` / evidence drafts,
and enables no transactions. **Production selection remains disabled.**

## JitoSOL read-only beta path (Step 13G)

The generic `selectSolLiquidStakingProtocol` stays hard-disabled. A separate,
approved function `selectJitoSolReadOnlyBeta(input, options?)` powers the real-wallet
**read-only** JitoSOL recommendation behind `JITOSOL_BETA_READ_ONLY_RECOMMENDATION_ENABLED`
(see [jitoSolBetaActivation.md](jitoSolBetaActivation.md)). It returns `selected`
(Jito / JitoSOL, with the approved riskScore + verified market data) only for SOL above
`MIN_SELECTOR_STAKE_SOL`; it rejects non-SOL and at/below-minimum amounts, and returns
`disabled` when the beta is off (`options.betaEnabled = false`). `transactionsEnabled`
stays `false` on every path — this is a recommendation to review, never execution.

# SOL Liquid-Staking Real Value-Confirmation Ledger (Step 12V)

**A non-production, auditable ledger of reviewer-confirmed source values.** Real
value confirmation is not production metadata, no score is assigned, and production
selection remains disabled.
Step 12V records the exact values a reviewer read from VERIFIED sources (starting
with DefiLlama TVL/APY), with who confirmed them and when. Backed by
`protocolSolLiquidStakingRealValueConfirmations.ts`.
`PROTOCOL_SELECTION_IMPLEMENTED = false`,
`getProtocolSelectionGoNoGo().productionReady = false`.

## Purpose

Answer: *"which exact values have been reviewer-confirmed from verified sources,
when were they confirmed, and are they fresh enough to support evidence
gathering?"*

## Source verification vs. value confirmation vs. production metadata

- **Source verification (12T):** the source link is legitimate. No value.
- **Value confirmation / this ledger (12U–12V):** a reviewer read a specific value
  from that verified source and recorded it, with an as-of timestamp. Non-production.
- **Production metadata:** live `ProtocolMarketData` / `DEFILLAMA_POOL_MAPPINGS` used
  by the engine. **This step writes NONE of it.**

## Current confirmed values (reviewer-confirmed, non-production)

Reviewer: **Ashot Gyulzatyan** (founder). As-of: **2026-07-12T00:00:00Z**. Source:
DefiLlama pool pages. Values are reviewer-supplied, not fetched at runtime.

| Candidate | Pool | TVL (USD) | APY (%) | APY 30d avg (%) |
| --- | --- | --- | --- | --- |
| Jupiter / JupSOL | `52bd72a7-…` | 409,170,000 | 5.67 | 5.60 |
| Marinade / mSOL | `b3f93865-…` | 184,840,000 | 4.75 | 5.87 |
| Jito / JitoSOL | `0e7d0722-…` | 767,950,000 | 5.36 | 5.45 |
| BlazeStake / bSOL | `387d6732-…` | 69,750,000 | 5.27 | 5.32 |
| Sanctum / INF | (source-verified) | — | — | — |

## Freshness window

- **Time-sensitive values** (TVL / APY / APY 30d): fresh only within
  `TIME_SENSITIVE_VALUE_MAX_AGE_HOURS = 24` of `confirmedAsOf`.
- **Static-doc values** (mechanics, fees, audit): fresh within
  `STATIC_DOC_VALUE_MAX_AGE_DAYS = 90`.

## Stale behavior

A confirmation past its freshness window validates as **`stale`**. A stale value
**cannot support evidence gathering** — `mapRealValuesToEvidenceCompletion()` will
not treat a stale TVL/APY as confirmed, so `tvl_adoption` is not gatherable from
stale values. Re-confirmation (a new read + as-of) is required.

## Why INF remains needs_review / absent

No exact current INF TVL/APY value was supplied, and none is invented. INF stays
**source-verified only** (its DefiLlama pool is codebase-verified) with **no
real-value confirmation** in this ledger. Supplying an exact reviewer-confirmed INF
value later would add it.

## Why TVL/APY confirmation supports only tvl_adoption

`mapRealValuesToEvidenceCompletion()` treats TVL + APY + APY-30d (all confirmed and
fresh) as support for the `tvl_adoption` dimension only. These values say nothing
about audits, maturity, withdrawal mechanics/fees, operational dependencies, or
incidents — those dimensions stay incomplete.

## Why other dimensions remain incomplete

`audit_security`, `maturity`, `withdrawal_fee_transparency`,
`operational_dependency_risk`, and `incident_history` have no confirmed values here,
so they are never gatherable from this ledger. `candidateReadyForReview` requires
all six dimensions gatherable — **false today** for every candidate.

## Why no score is assigned, and why production selection remains disabled

No `riskScore` is assigned; `scoreAssigned` is always false. The rubric and approval
decision stay unapproved, no production metadata is written, no evidence draft is
mutated, and `getProtocolSelectionGoNoGo()` stays `productionReady = false`. All
selection flags stay false and no protocol appears in the UI.

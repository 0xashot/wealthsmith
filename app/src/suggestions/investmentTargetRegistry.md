# Investment-Target Registry (Step 15A)

A deterministic, versioned, **asset-agnostic** registry that future contribution-planning and DCA
logic will consume. It describes **what an asset is allowed to do** — not whether a user should
invest in it.

Backed by:
- [`investmentTargetTypes.ts`](./investmentTargetTypes.ts) — the versioned model.
- [`investmentTargetRegistry.ts`](./investmentTargetRegistry.ts) — canonical entries, accessors, validators.
- [`investmentTargetEligibility.ts`](./investmentTargetEligibility.ts) — technical readiness only.

## Registry vs selection vs suitability vs allocation-gap

- **Registry (this step):** identity, category, lifecycle, holding sources, suggestion roles, data
  requirements, technical readiness, future suitability-policy references.
- **Technical eligibility (this step):** is the target enabled, is a supported holding source
  present, is required pricing fresh, are the target-allocation / suitability / minimum POLICY
  KEYS configured? It does NOT evaluate the user's actual suitability.
- **Later layers (NOT this step):** user suitability (risk/goal/horizon), allocation-gap
  calculation, contribution-priority engine, DCA plan generation, and read-only suggestions.

## Current MVP targets

Canonical order (display determinism only, **not** ranking or priority): `usdc`, `sol`, `btc`, `eth`.

| Target | Category | Lifecycle | MVP | Roles |
| --- | --- | --- | --- | --- |
| SOL | growth_crypto | enabled | ✅ | contribution_growth_target, rebalance_increase_target, rebalance_reduce_source |
| USDC | stable_asset | enabled | ✅ | contribution_funding_source, safety_buffer_asset, stable_allocation_destination, trim_destination, yield_source_asset |
| BTC (native) | growth_crypto | modeled_not_enabled | ❌ | (future) contribution_growth_target, rebalance… |
| ETH (native) | growth_crypto | modeled_not_enabled | ❌ | (future) contribution_growth_target, rebalance… |

### SOL — the enabled MVP growth target

`canBeContributionTarget: true`, requires pricing + a configured target-allocation policy + a
configured suitability policy + a configured minimum before it can become technically eligible.
It cannot fund its own contribution plan and is not a safety-buffer asset. Contribution amount,
allocation gap, and user suitability are decided later, not here.

### USDC — funding / buffer / stable allocation, NOT growth DCA

`canFundContributionPlan: true`, `canServeAsSafetyBuffer: true`,
`canReceiveStableAllocation: true`, but `canBeContributionTarget: false`. USDC funds contribution
plans, protects the safety buffer, and receives stable allocation; it is deliberately **not** a
normal growth DCA target and never appears in the enabled growth-contribution-target list.

### Native BTC / ETH — future support

`assetId` is a NATIVE-chain identifier (`bitcoin:native` / `ethereum:native`), **never** a Solana
mint and **never** wrapped BTC/ETH. They are `modeled_not_enabled`, support `manual_entry`, and
fail closed with explicit blockers (`target_disabled`, `price_source_not_configured`,
`target_allocation_not_configured`, `suitability_policy_not_configured`,
`manual_entry_not_supported`) until a future step activates them.

## Manual-entry limitations

Manual BTC/ETH holdings are MODELED only in 15A. When enabled later, they will count toward
portfolio allocation, and their underweight gaps may generate contribution suggestions. But:
WealthSmith must clearly label them as **manually entered**; **WealthSmith cannot verify ownership
from manual entry alone** (no ownership verification is implied); WealthSmith must not imply it can
transact against them; and they remain NATIVE chain assets. This step adds **no** Bitcoin/Ethereum
wallet connector, no xpub support, no balance fetching, no transactions, and no fake manual
holdings.

## Specific-product RWA model (generic RWA forbidden)

There is **no generic RWA entry**. Each future RWA must be a SPECIFIC reviewed product with its own
`targetId`, display name, issuer/protocol, underlying exposure, pricing method + freshness, risk
review, liquidity terms, lockup/redemption terms, minimum investment, jurisdiction eligibility,
supported holding source, target-allocation policy, suitability policy, and read-only capability
(`rwaRequirements`). The validator **rejects** generic identifiers (`rwa`, `generic_rwa`,
`rwa_placeholder`, `all_rwa`) and any RWA missing product approval / jurisdiction / liquidity /
lockup / issuer / pricing requirements. RWA support is proven only through the type system and a
clearly synthetic fixture (`synthetic_rwa_product` / "Synthetic RWA Product"), never in runtime/UI.

## Holding-source abstraction

`holdingSources` (`connected_wallet`, `manual_entry`, `protocol_position`, `future_external_import`)
keeps the model chain-agnostic — no field assumes a Solana wallet. Technical eligibility checks that
a supported source is present in context.

## Technical readiness (fail closed)

`evaluateInvestmentTargetTechnicalEligibility(target, context)` returns per-role eligibility
(contribution target / funding source / safety buffer / stable allocation) plus blockers. It fails
closed: disabled/blocked targets can never become eligible; unavailable or stale required pricing
blocks contribution-target eligibility; missing target-allocation / suitability / minimum policy
configuration blocks it. Funding-source eligibility is evaluated separately (a stable funding asset
needs only enabled state + a supported holding source), so USDC can be an eligible funding source
while remaining ineligible as a growth contribution target. The result never evaluates user
suitability, never computes an allocation gap or amount, and never generates a suggestion.

## No UI integration; no execution/signatures

No product-facing file imports the registry in 15A. It is consumed only by its own validators, its
eligibility layer, fixtures, and docs. Every target is `read_only_only` with
`transactionsEnabled: false` / `walletSignatureRequired: false`; there is no buy/swap/deposit/
invest/execute handler.

## Intended future flow

```
User strategy
+ portfolio holdings
+ investment-target registry (15A)
+ fresh prices
+ target-allocation policy
+ user suitability policy
→ technically AND strategically eligible targets
→ allocation-gap calculation
→ contribution-priority engine
→ deterministic DCA plan
→ read-only suggestion
```

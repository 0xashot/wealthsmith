# Stable Yield Positions & Eligible Capital (Step 16F)

The engine layer that turns **injected read-only** wallet position data into normalized existing Stable
Yield positions, matches them to **exact** registry products, resolves duplicate economic positions, and
calculates **lane-level source capacity** for the Safety Buffer Yield and Excess USDC Yield lanes. It
selects **no** product, **no** final amount, generates **no** plan or suggestion, updates **no** product
output, reruns **no** comparison, and enables **no** transaction/signature.

Backed by:
- [`yieldStrategyPositionTypes.ts`](./yieldStrategyPositionTypes.ts) — versions + position / input / set / observed-product / aggregation / leader / capital types.
- [`yieldStrategyPositionEngine.ts`](./yieldStrategyPositionEngine.ts) — normalize + exact match + dedup + set + aggregation + leader-position status + validators.
- [`yieldStrategyCapitalPolicy.ts`](./yieldStrategyCapitalPolicy.ts) — risk→buffer allocation policy + the canonical $250 excess minimum.
- [`yieldStrategyEligibleCapital.ts`](./yieldStrategyEligibleCapital.ts) — the eligible-capital snapshot + formulas + validators.
- [`yieldStrategyPositionDiagnostics.ts`](./yieldStrategyPositionDiagnostics.ts) — diagnostics + recommendation-free explanations.

## Injected read-only inputs & exact identity

Positions arrive as injected records (a protocol adapter may normalize before calling the engine);
nothing is fetched from React and `browserFetched` must be false. Matching uses **exact identity only**
— protocol + exact product/vault/market/pool/reserve address + principal asset + mechanic compatibility.
Never by display name, token symbol, protocol brand, APY/amount similarity, substring, "Steakhouse"
text, or receipt-token name.

## Protocol scope & non-yield exclusions

Only Kamino / Raydium / Meteora / Hubble. A detected protocol position is **not** automatically a Stable
Yield position: a Hubble borrow/CDP/debt (or borrowed USDH) is not a yield deposit; a volatile Raydium/
Meteora LP is not a Stable USDC strategy; a stable-liquidity position requires its stable underlying to
be **explicitly confirmed** (never symbol-inferred). Non-yield usage is marked and excluded.

## Representation vs economic position (dedup)

The same **economic** position can appear through several **technical** representations (protocol API,
decoded account, direct vault share, farm-staked vault share, receipt token, wallet-token fallback). A
deterministic `economicPositionId` (owner · protocol · exact product address · share/receipt/account
identity — never display names) groups them: one canonical value record is chosen by source priority
(protocol API/SDK → backend-normalized → decoded account → receipt fallback); the rest are marked
duplicate representations and **never summed twice**. Direct vault shares later farm-staked are the same
shares → counted once. Two genuinely distinct accounts in the same strategy stay distinct and aggregate
by strategy. Conflicting duplicates (raw units / address / asset) become **ambiguous** and an ownership
conflict becomes **invalid** — both excluded from totals. Approximately-equal USD alone never
establishes duplication (raw-unit exactness governs).

## Exact registry matching outcomes

`matched_approved` (exact identity + approved lifecycle) · `matched_nonapproved` (exact identity +
review/documentation_required/deprecated/disabled/future) · `unmatched` (exact observed identity, no
registry entry) · `ambiguous` (multiple/conflicting) · `invalid`. Runtime detection **never** promotes a
lifecycle or mutates the registry. An observed exact address missing from the registry surfaces as an
`ObservedYieldStrategyProduct` (`requiresDocumentation: true`, `autoApproved: false`,
`registryMutated: false`) — diagnostic only.

## Valuation & freshness

Value is explicit and provenance-bearing — never inferred from name/symbol/protocol/APY/TVL. Stale or
unavailable values stay **visible** but never enter fresh totals. Safety-Buffer counting uses the strict
15-minute freshness bound. No expected-earnings/future-value is computed.

## Safety Buffer qualification & aggregation

A position may count toward the Safety Buffer **only** when it is `matched_approved`, `buffer_eligible`,
currently passing the 16D buffer lane (from the injected eligibility set), freshly valued, and not a
duplicate/ambiguous/invalid. Excess-only, documentation_required, unmatched, ambiguous, invalid, and
stale positions never count. Aggregation sums only canonical economic positions.

## Existing comparison-leader position status

Consuming (never rerunning) the 16E comparison set, per lane: `no_comparison_leader` / `leader_not_held`
/ `leader_held` / `leader_held_multiple_positions` / `leader_position_unavailable` /
`leader_position_ambiguous`. Requires an exact `matched_approved` match on the leader strategy id; a
tied/sensitivity-withheld comparison has no leader → `no_comparison_leader`. Holding a leader never
favors it in comparison and generates no switch/add behavior.

## Direct liquid USDC & canonical Safety Buffer

Direct liquid USDC and the required Safety Buffer are **injected canonical Step-15/buffer values** —
this step writes no second USDC detector. Protocol receipt tokens and vault shares are existing
positions, not direct liquid USDC. An additive coverage view is exposed:
`currentEligibleBufferUsd = directWalletEligibleBufferUsd + existingEligibleBufferYieldUsd`.

## Risk-based buffer allocation (v1)

The documented vault/wallet split — **very_low/low 100/0 · medium 70/30 · high/very_high 50/50** — had
no executable policy, so it is encoded as `yield_strategy_capital_v1` (the source of truth). An unknown
risk id **fails closed** — never defaulted to Medium.

## Lane-level capital formulas

Safety Buffer Yield: `allowedBufferYieldUsd = requiredBuffer × vaultPct`;
`requiredWalletFloorUsd = requiredBuffer × walletPct`;
`remainingBufferYieldCapacityUsd = max(0, allowedBufferYieldUsd − existingEligibleBufferYieldUsd)`;
`rawBufferYieldCapitalUsd = min(directLiquidUsdc, movableRequiredBufferAboveWalletFloor, remainingBufferYieldCapacity)`.
Excess USDC Yield: `canonicalBufferSurplusUsd = max(0, currentEligibleBuffer − requiredBuffer)`;
`directWalletExcessSliceUsd = max(0, directWalletEligibleBuffer − reservedDirectWallet)`;
`rawExcessYieldCapitalUsd = min(directLiquidUsdc, canonicalBufferSurplus, directWalletExcessSlice)`.
Amounts are floored to exact cents (Step-15 helper) and **never rounded up**. Buffer-Yield capital is
zero while the buffer is incomplete / risk is unknown / policy is missing.

## Minimum amounts

Excess uses the canonical **$250** trigger (`DCA_EXCESS_USDC_TRIGGER_USD`): a raw excess below $250 is
preserved but eligible = 0 (`below_minimum`). No Safety-Buffer-Yield minimum is documented, so
`bufferYieldMinimumPolicyAvailable = false` and raw capacity is reported (final sizing is 16G).

## Shared-source overlap

Both lanes may draw from the same direct-wallet USDC, so their maxima are **not** blindly summed:
`maximumCombinedSourceCapitalUsd = min(directLiquidUsdc, rawBuffer + rawExcess)` and
`sharedSourceOverlapUsd = max(0, rawBuffer + rawExcess − maximumCombined)`. 16F allocates no overlap and
picks no lane — 16G applies plan priority.

## Production empty-approved & Steakhouse live QA

Production has zero approved products / zero documented addresses / zero comparison leaders. Detected
positions may still exist while approved matches, buffer-qualified positions, and held leaders are all
zero — a valid fail-closed state. A real Kamino Steakhouse position is normalized with its exact runtime
vault address preserved, duplicate representations removed, marked `unmatched`/`matched_nonapproved`, its
exact address surfaced in discovery diagnostics — **without** approving the product, counting toward the
buffer, calling it the leader, or mutating the registry.

## Hubble

Hubble stays in scope with no protocol-name penalty and is not hardcoded deprecated; but its borrow/CDP/
debt/collateral usage is never classified as Stable Yield, and its `documentation_required` entry cannot
match as approved. A future exact Hubble yield product uses this same generic model.

## Boundaries

No comparison rerun · no product selection · no final amount · no switch decision · no expected earnings
· no plan · no suggestion · no product-output update · no UI/`/testing` · no transaction/signature.

## Future flow

```
16A policy + 16B registry + 16C market data + 16D eligibility + 16E comparison + 16F positions & capital
→ 16G deterministic read-only yield plan
→ 16H product integration
```

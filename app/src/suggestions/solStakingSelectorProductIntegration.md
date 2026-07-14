# SOL Staking Comparison — Demo + Real Wallet Product Integration (Step 14Z)

Wires the dynamic Step 14W comparison leader into the Demo and Real Wallet staking cards and the
review modal, with a deterministic "Why this protocol currently leads" explanation. Read-only,
deterministic, execution-free, and separate from automatic protocol activation.

Backed by:
- [`solStakingLeaderExplanationTypes.ts`](./solStakingLeaderExplanationTypes.ts) / [`solStakingLeaderExplanation.ts`](./solStakingLeaderExplanation.ts) — the leader-vs-runner-up explanation.
- [`../components/SolStakingComparisonSummary.tsx`](../components/SolStakingComparisonSummary.tsx) — card compact summary.
- [`../components/SolStakingLeaderExplanation.tsx`](../components/SolStakingLeaderExplanation.tsx) — modal full explanation.
- [`../hooks/useSolStakingSelectorPresentation.ts`](../hooks/useSolStakingSelectorPresentation.ts) — runtime loader (Step 14Y).

## User-facing leader vs activated protocol

- **User-facing suggested protocol** = the latest fresh Step 14W comparison LEADER
  (`presentation.topProtocol`). It may change after each successful market refresh — that is
  expected and acceptable (mSOL → JupSOL → JitoSOL → Jupiter Native Stake as data updates).
- **Internal activated/default protocol** = JitoSOL (`selectedProtocolId`) until a separate,
  human-approved Step 14X activation. The internal default never overrides or contradicts the
  user-facing comparison leader; it is surfaced only in internal diagnostics with neutral copy
  ("Current engine default remains JitoSOL; no automatic switch has occurred"), not in standard
  user-facing UI.

The displayed protocol is derived from `presentation.topProtocol`, never from `selectedProtocolId`.

## Runtime hook integration

`useSolStakingSelectorPresentation()` is called ONCE at the shared `RealWalletSuggestionsRail`
level, which BOTH Demo (the `sol_staking` scenario) and Real Wallet render — so they consume the
SAME presentation object, the same leader, the same timestamp, and the same explanation. There are
no separate Demo/Real Wallet leader calculations, no hardcoded leader, and no ranking recomputation
in React. The only browser data source is the same-origin `/generated/sol-staking-market-cache.json`.

## Card-level summary

The staking suggestion card keeps its title/action ("Put Idle SOL to Work") and read-only Review
CTA unchanged. When the display status is `available`, `SolStakingComparisonSummary` adds a compact
"Top protocol to review right now" block: protocol name/asset, current APY, 30-day APY, reviewed
risk, updated time, a compact "why it currently leads" sentence, and "This may change as market
data refreshes". No Stake/Delegate/Execute/Approve/Confirm CTA.

## Full "Why this protocol currently leads" explanation

`buildSolStakingLeaderComparisonExplanation(presentation)` compares the leader vs runner-up on the
four SCORED dimensions using the exact existing raw values, normalized scores, weights, and
weighted contributions (never recalculating the ranking, never inventing a score):

- **Strongest advantages** — dimensions where the leader's weighted contribution exceeds the
  runner-up's, sorted by contribution advantage (canonical order tie-break).
- **Trade-offs** — dimensions where the leader contributes less, sorted by disadvantage, never
  hidden.
- **Approximately equal** — dimensions within a small explicit epsilon; not called advantages.
- **Compact summary** — derived from the largest advantage + most important trade-off; says "close
  and may change" when the score gap is within the close threshold.

The modal renders: the leader header, "Why this protocol currently leads", "Compared with the
runner-up" (leader/runner-up scores + exact difference), "Other considerations" (labeled
"Informational — not included in the current comparison score"), and the exact Step 14W ranking
(INF excluded, native shown as "Native stake account").

## Contribution-difference methodology

For each dimension: `leaderAdvantageContribution = leaderContribution − runnerUpContribution`.
`> epsilon` → advantage; `< −epsilon` → trade-off; `|·| ≤ epsilon` → approximately equal. Wording
is deterministic ("currently favors", "currently leads", "under the current comparison policy") —
never best/safest/guaranteed/risk-free/winner/recommended/"selected".

## Scored vs non-scored dimensions

Only reviewed risk (50%), 30-day APY (30%), current APY (10%), and APY consistency (10%) may be
described as ranking reasons. TVL, delegated stake, fees, validator commission, direct unstake fee,
token model, liquidity, and exit mechanics appear only under "Other considerations", labeled not
part of the comparison score.

## Stale / unavailable / invalid / insufficient / loading

- **Available** → card + modal show the current leader, explanation, and ranking.
- **Stale** → top designation and explanation hidden; "Protocol comparison is being refreshed";
  individual review remains.
- **Unavailable / invalid** → neutral "Current protocol comparison is unavailable"; fail closed;
  never a JitoSOL fallback leader.
- **Insufficient** → "More market data is needed"; no cross-candidate explanation.
- **Loading** → accessible neutral status; no leader declared.

## selectedProtocolId remains Jito; automatic switching stays blocked

No `selectedProtocolId` change, no product `currentWinner`/`selectedByProtocolLogic`, no automatic
switching, no Step 14X bypass, no Top Pick or engine-ordering change, and no
transaction/signature/execution path. The Step 14X activation gate is unchanged; showing a leader
never implies activation.

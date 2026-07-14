# Top Protocol to Review — Read-Only Dynamic Comparison Display (Step 14Y)

Surfaces the current Step 14W comparison leader to users as a READ-ONLY, DYNAMIC
"Top protocol to review right now". It answers: *what protocol currently leads WealthSmith's
comparison, why does it lead, how fresh is the result, and what happens when market conditions
change?*

Backed by:
- [`solStakingSelectorPresentationTypes.ts`](./solStakingSelectorPresentationTypes.ts)
- [`solStakingSelectorDisplayGate.ts`](./solStakingSelectorDisplayGate.ts)
- [`solStakingSelectorPresentation.ts`](./solStakingSelectorPresentation.ts) — presentation + "why it leads"
- [`solStakingSelectorRuntimeData.ts`](./solStakingSelectorRuntimeData.ts) — sanitized same-origin payload
- [`../hooks/useSolStakingSelectorPresentation.ts`](../hooks/useSolStakingSelectorPresentation.ts) — runtime loader
- [`../../scripts/publish-sol-staking-market-cache.mjs`](../../scripts/publish-sol-staking-market-cache.mjs)

## Current comparison vs automatic activation

- **Current user-facing comparison (this step):** may change from refresh to refresh; shown when
  the latest comparison is complete and fresh; informational, read-only; does NOT require
  activation-gate approval.
- **Automatic protocol activation (Step 14X, out of scope):** would change `selectedProtocolId`;
  remains blocked by historical coverage, sensitivity, operational readiness, and human approval.

A changing leader is expected and acceptable. Displaying the current leader never activates it,
moves funds, or changes `selectedProtocolId`.

## Display gate

`evaluateSolStakingSelectorDisplayGate` returns **available** only when: the market cache,
normalized set, and comparison all validate; the comparison is complete with >= 2 selector-ready
scored candidates; a leader / rank 1 exists; every scored candidate was selector-ready; the leader
remains approved + eligible; the comparison was generated from THIS exact cache timestamp; the
cache is <= 24h old; and every ranked candidate's required market fields are still fresh.

Statuses: **available** (show leader + ranking), **stale** (cache/fields > 24h → "Protocol
comparison is being refreshed"), **insufficient_candidates** (< 2 eligible → no top designation),
**unavailable** (cache/artifact missing), **invalid** (validation fails → fail closed). The gate
explicitly does NOT require historical coverage, sensitivity pass, operational readiness, or human
approval, and keeps every activation flag false.

## Same-origin runtime payload + publisher

The browser fetches ONLY `/generated/sol-staking-market-cache.json` — never DefiLlama, Stakewiz,
Marinade, Rated, or Blockdaemon. The sanitized payload (`SolStakingRuntimeMarketPayload`,
schema 1.0.0) carries only `{ schemaVersion, publishedAt, marketCache }` — no provider secrets, raw
provider responses, API keys, environment values, or transaction data;
`validateSolStakingRuntimeMarketPayload` fails closed and rejects forbidden keys.

`npm run market:publish-staking` reads the Step 14U cache (`tmp/sol-staking-market-data-cache.json`),
validates it, refuses stale input, strips `sourceResponses`/headers/env, and atomically writes the
sanitized artifact (temp → validate → rename). `npm run market:refresh-and-publish-staking` chains
refresh + publish. The generated artifact is git-ignored.

**Production:** serve the same validated payload schema from a WealthSmith backend/cache endpoint
updated by the 6-hour refresh job — never call public providers from each browser.

## Deterministic presentation

`buildSolStakingSelectorPresentation` evaluates the gate, then (when available) consumes the EXACT
Step 14W ranking — it never recalculates ranking, never introduces a hidden score, and preserves
each candidate's comparison score, score breakdown, current APY, 30-day APY, reviewed risk score,
and APY consistency exactly. Rank 1 → `topProtocol`, rank 2 → `runnerUp`, full order in
`rankedCandidates`. Copy is deterministic (never AI-generated):

- headline "Top protocol to review right now"
- "{Protocol} currently leads WealthSmith's comparison based on fresh market data and the reviewed
  protocol policy."
- "Updated {time}"
- "This may change as market data refreshes. Review only — WealthSmith will not move funds for you."

Never uses best / safest / guaranteed / risk-free / winner / recommended, and is never called the
suggestion-engine "Top Pick".

## Score breakdown + non-scored context

`buildSolStakingLeaderExplanation` returns ONLY the four scored dimensions with exact weights and
contributions (reviewed risk 50%, 30-day APY 30%, current APY 10%, APY consistency 10%) and a
summary noting the leader can lead without the highest reviewed risk because the policy combines
risk and yield. Adoption (TVL / delegated stake), fees, exit mechanics, and token model are carried
as `usedInScore: false` context — never presented as reasons for the score, never cross-type
compared.

## Stale / unavailable / insufficient behavior

- **Stale** → hide the top designation; "Protocol comparison is being refreshed"; the previous
  leader is never reused without a freshness label.
- **Unavailable / invalid** → neutral "Current protocol comparison is unavailable"; individual
  protocols remain reviewable.
- **< 2 eligible** → "More market data is needed"; no top protocol.

The loader fails closed and NEVER falls back to labeling JitoSOL the current top protocol.

## No history requirement for display; Step 14X still required for switching

Showing a valid current comparison requires no historical coverage, no sensitivity pass, and no
human approval. Those gate automatic `selectedProtocolId` changes only, and remain blocked by
Step 14X. Even with `blocked_historical_coverage` / `blocked_market_sensitive` /
`blocked_operational_readiness` / `blocked_human_approval`, the read-only display may still show the
current leader.

## No selection / Top Pick / execution change

INF is absent from the user-facing ranking (INF stays blocked/unscored). Jupiter Native Stake
appears when eligible, labeled "Native stake account". JitoSOL remains the underlying engine
selection; `leaderDiffersFromUnderlyingSelection` is informational only. No `selectedProtocolId`
change, no product winner, no multi-protocol automatic selection, no Top Pick change, no engine
ordering change, and no transaction/signature/execution path.

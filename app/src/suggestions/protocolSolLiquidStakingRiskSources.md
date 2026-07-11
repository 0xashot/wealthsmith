# SOL Liquid-Staking Risk Sources (Step 12K)

**Risk sourcing in progress. No `riskScore` is assigned.** This records the
current sourcing status for the five SOL liquid-staking candidates. No number,
audit claim, or withdrawal timing is invented, and no protocol is described with
superlatives or absolute-safety language. Selection stays disabled
(`PROTOCOL_SELECTION_IMPLEMENTED = false`).

Statuses: `sourced` · `partially_sourced` · `missing` · `not_assigned`.

| Candidate | riskScore | auditStatus | withdrawalClass | withdrawalTime | fees | source status |
| --- | --- | --- | --- | --- | --- | --- |
| jupiter (JupSOL) | not_assigned | missing (unknown) | missing (unknown) | missing | missing | pending |
| marinade (mSOL) | not_assigned | missing (unknown) | missing (unknown) | missing | missing | pending |
| jito (JitoSOL) | not_assigned | missing (unknown) | missing (unknown) | missing | missing | pending |
| blazestake (bSOL) | not_assigned | missing (unknown) | missing (unknown) | missing | missing | pending |
| sanctum (INF) | not_assigned | missing (unknown) | missing (unknown) | missing | missing | pending |

- **riskScore = `not_assigned`** for every candidate — it will remain absent
  until the risk methodology (`protocolRiskMethodology.md`) is approved and
  per-protocol evidence is gathered. Eligibility that depends on `riskScore`
  therefore returns `insufficient_data` (by design).
- **auditStatus = `unknown`** — not directly sourced from existing code/docs yet.
  Will be set only from a protocol's published audits (firm + report link).
- **withdrawalClass / withdrawalTime = `missing`** — LST unstake mechanics are not
  precisely documented in the codebase. NOTE: acquiring an LST via a swap route is
  **not** the same as protocol withdrawal/unstake behavior; the two must be
  sourced separately.
- **fees = `missing`** — not itemized in existing source; never assumed zero.
- `lastReviewedAt` (recorded in `protocolRiskRegistry.ts`) marks that this review
  happened; it does not imply any value was assigned.

## Remaining evidence needed

- A written, approved `riskScore` rubric (audit history/scope, time in prod, TVL
  history, admin-key/upgrade authority, oracle/dependency risk, incidents).
- Published audit references per protocol → `auditStatus` + `sources`.
- Documented unstake/withdrawal mechanics (instant-via-pool vs. epoch cooldown) →
  `withdrawalClass` / `withdrawalTimeHours`.
- Fee schedules (deposit/withdraw/performance/management) → `fees`.

Until these exist, the internal dry-run correctly returns `insufficient_data`.

# Steakhouse USDC — Step 16H-L.2: audit coverage closure

Internal. Assigns no score, completes no review, approves nothing. Read alongside
`steakhouseAuditCoverage.ts`.

Evidence cutoff **2026-07-16T16:40:00Z**.

## The move

16H-L.1 proved the deployed bytecode is hash-identical to public commit `1d146d70…`. So public source
inspection is not a *proxy* for the deployed program — **it is the deployed program**. That answers
"is the audited fix in the running code?" without Kamino attesting which private PR became which
public commit.

The private mapping stays unresolved. It is simply **not required** for code properties we can read.

## Release identity — from git ancestry, not filenames

| | |
|---|---|
| Deployed tag | **`release/v2.2.2`** @ `1d146d70…` (tag points exactly at the deployed commit) |
| Previous | `release/v2.2.1` @ `0426eb12`, 2026-06-19 |
| Method | `git describe --tags`, `git tag --contains` |
| Branch | `master` |

The commit subject says "release 2.2.2" — but a commit message is a claim, so the tag is what was
used. Audit filenames and report dates were **not** used to establish release identity.

**Squashed history:** 27 commits for the whole protocol; v2.2.1 → v2.2.2 is exactly **one** commit. No
public commit references private PR #59, #78 or #113. This blocks **causal** attribution ("this
changed *because of* that finding") but **not** end-state verification ("the deployed code does X").

Corroboration worth noting: `release/v1.1.0` = commit `0321f628…`, which is exactly the stale
verification record 16H-L.1 flagged. That record was for v1.1.0.

## Remediations — all 7 verified present in the deployed source

| # | Finding | Auditor | State |
|---|---|---|---|
| 1 | Missing minimum-withdrawal validation | Certora | **verified_present** |
| 2 | Missing cToken-vault mint validation | Certora | **verified_present** |
| 3 | Two-stage penalty / intermediate rounding | OtterSec + Certora | **verified_present** |
| 4 | Pending-reward overflow / DoS | OtterSec | **verified_present** |
| 5 | Stale `last_issuance_ts` after exhaustion | Certora | **verified_present** |
| 6 | Refresh ordering | OtterSec / Certora | **verified_present** |
| 7 | Duplicate reward refresh | Certora | **verified_present** |

Names were never used as evidence. Highlights of *how*:

- **Minimum withdrawal** — gates on the same canonical `vault_state.min_withdraw_amount` field standard
  `withdraw` uses (lines 324 vs 824), and checks the **post-cap** amount, so a withdrawal capped below
  the minimum is still rejected.
- **cToken mint** — a closed constraint *chain*: `ctoken_vault` is a PDA seeded by
  `(vault_state, reserve)` **and** `token::mint = ctoken_mint`; `ctoken_mint` is pinned by
  `address = reserve.collateral.mint_pubkey`. No single constraint would suffice.
- **Two-stage penalty** — proven by **algebra**: inclusive computes `amount × bps/FULL_BPS` (penalty
  inside), exclusive computes `amount × f/(1−f)` (gross-up from net). Different formulas for different
  questions; a renamed duplicate would share the formula. `Fraction` end-to-end, no intermediate
  rounding.
- **Exhaustion timestamp** — the fix is a **composition**: `refresh_rewards` deliberately early-returns
  leaving the timestamp stale; `topup_rewards` re-evaluates `has_active_rewards()` *after* the top-up
  and resets it. Reading either function alone gives the wrong answer.
- **Duplicate refresh** — counted: `handler_invest` calls it once, `vault_operations::invest` contains
  **zero** calls.

### Structural corroboration

- `vault_operations::redeem_in_kind` and **both** penalty helpers are **byte-identical** between
  `release/v2.1.0` (their audit target) and the deployed `release/v2.2.2`.
- `refresh_rewards` and `topup_rewards` are **byte-identical** between `release/v2.1.1` and v2.2.2.

**The audited logic is the running logic.**

## Features

- **Redeem-in-kind: present.**
- **Rewards: present** — so the 2026 rewards audits are applicable. But **dormant on this vault**
  (`reward_per_second = 0`, `rewards_available = 0`, `last_issuance_ts = 0`, cumulative distributed
  `0` — never issued). Dormant is **not** absent: the code is deployed and the vault admin can
  activate it.

## The three questions — never one boolean

| | Question | Answer |
|---|---|---|
| A | Did an audit examine the feature? | Only redeem-in-kind (2.1.0) and rewards (2.1.1) |
| B | Are the documented fixes in the deployed code? | **Yes — all 7 verified** |
| C | Is the whole deployed codebase audited? | **No** |

A yes to A and B says nothing about C.

## Publicly uncovered runtime surface (bounded)

- **`klend_operations.rs` — 214 lines. The CPI layer that actually moves user funds.** Most
  consequential item.
- Three **new** instructions: `update_reserve_allocation_v2`, `deposit_with_min_shares_out`,
  `buy_with_min_shares_out`.
- New `CtokenCap` state concept.
- `handler_update_reserve_allocation.rs` (46 lines) — the allocation-admin surface. Compounds 16H-L.1:
  **the weakest authority operates the least-covered changed surface.**
- `reserve_whitelist_operations.rs` (15 lines) — the very mitigation manager-discretion relies on.
- `vault_operations.rs` functions other than redeem-in-kind/rewards; `handler_invest`;
  `handler_deposit`; the redeem-in-kind handler's AUM refactor; `cpi_mem.rs`.

**Excluded, and why:** `state.rs → state/*.rs` is a **rename** (`git -M`) plus module split — moved
code is not changed code and must not inflate uncovered scope. `libs/`, `Cargo.lock`, tests and
examples are not on-chain runtime (the instructions they call *are* counted).

## Classification

**`deployed_feature_remediations_verified_with_partial_coverage`** — supersedes `unverified_linkage`.

Not `exact_full_deployment_audit_coverage`: C is a firm no. Not `material_uncovered_runtime_surface`:
that would imply the uncovered surface dominates, and it doesn't — it is bounded, the audited features
are byte-identical to their audited releases, and every documented fix is verified.

## Evidence completeness

**`complete_for_human_scoring`** — and distinctly *mixed*. Every documented fix verified; a 214-line
CPI layer uncovered. That is a scoreable input, not a favourable one.

Evidence complete ≠ favourable score ≠ risk approval ≠ product approval.

`auditScopeUnknown` is scoped to the **delta** audits, not the baselines. Baseline scopes *are*
unknown and recorded as a limitation — but treating that as a blocker would make this dimension
permanently unscoreable for any protocol whose old reports lack commit references, which is most.

## Readiness — `blocked_pending_protocol_confirmation`

`audit_security` → **complete, unblocked**. **`incident_history` is now the only blocker**, untouched
by this step, exactly as instructed. No clean record is inferred from the absence of audit findings.

## Residual observation — not a finding

`topup_rewards` resets `last_issuance_ts` only `if has_active_rewards()`, which also requires
`reward_per_second > 0`. A top-up while the rate is 0 leaves the timestamp unreset; a later
re-activation would measure `seconds_passed` from a stale timestamp.

**Bounded:** payout is capped by `pending_rewards.min(rewards_available)` — accelerated distribution,
not loss to the vault. Requires vault-admin action. **Not reachable from this vault's state**
(`last_issuance_ts == 0` hits the explicit zero-guard). Rewards are dormant here.

Recorded so the reviewer can ask. Explicitly **not** a claim that the code is wrong — WealthSmith does
not audit code, and this may well be intentional and understood.

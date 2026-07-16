# Steakhouse USDC — Step 16H-L.1 evidence closure

Internal. Assigns no score, completes no review, approves nothing. Read alongside
`steakhouseEvidenceClosure.ts` and `steakhouseDeploymentAndDepositEvidence.ts`.

Evidence cutoff **2026-07-16T15:56:03Z**, slot **433302860**. Every fact below is bound to vault
`HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E` and program `KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd`.

## The correction that started this step

16H-L classified three authorities as single-key EOAs because each is System-Program-owned with zero
data bytes. **That inference was invalid.** A Squads Vault authority PDA presents identically. Owner
program alone cannot distinguish a keypair from a PDA, and must never again be used to conclude raw
keypair, EOA custody, absence of multisig, absence of governance, or absence of threshold control.

The decisive test needs no network: **a keypair address is on the ed25519 curve; a PDA is off it by
construction.** Off-curve proves no private key can exist.

## Authority — three separate conclusions, never merged

`AUTHORITY_RISK_IS_NOT_GLOBALLY_COMPLETE.globallyComplete === false`. There is deliberately no
aggregate "authority risk" verdict anywhere in the codebase.

| Authority | Model | Threshold | Timelock | Strength |
|---|---|---|---|---|
| Program upgrade `GzFgdRJXmaw…` | Squads v4 vault PDA of `6hhBGCtmg…` idx 0 | 5 of 10 | 24h | strong |
| Vault admin `9ceRgz…` | Squads v4 vault PDA of `4WUP4FFwg…` idx 0 | 3 of 10 | none | moderate |
| Allocation admin `CuEC7J…` | raw on-curve keypair, signs directly | 1 | none | **weak** |

Verified three independent ways, not by inference:

1. **Curve membership** — upgrade/vault-admin off-curve, allocation admin on-curve.
2. **Derivation** — each off-curve authority reproduced exactly from `["multisig", <state>, "vault", 0u8]`
   under `SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf`. The multisig **state account** and its signing
   **vault PDA** are different identities; both are recorded.
3. **State deserialization** — members, threshold, time lock, `config_authority`. Self-validating: the
   observed signers are decoded members (`6vkzAQ…` = member 2 of `6hhBGCtmg…`; `vieuhps4…` = member 1
   of `4WUP4FFwg…`).

`config_authority` is default on both, so members/threshold change only by member vote — checked, not
assumed. A non-default value would have made the thresholds meaningless.

**Limit:** threshold control by N member *addresses* is proven. Who holds those keys is not. Member
addresses being on-curve proves they are keypair addresses, not that ten distinct humans hold them. No
MPC and no human ownership is inferred either way.

**The allocation admin is the live finding.** It is not a rubric-defined disqualifier (rubric v1
defines no "single-key manager" blocker), so per instruction it is material evidence, not a mechanical
fail. Mapped in `ALLOCATION_ADMIN_RUBRIC_MAPPING` to `manager_discretion` and
`operational_dependency_risk` — deliberately **not** to `upgrade_admin_authority`, whose blockers are
specific to the upgrade authority and are genuinely absent.

Mitigation the reviewer must weigh: `allowAllocationsInWhitelistedReservesOnly = 1` and
`allowInvestInWhitelistedReservesOnly = 1` confine allocations to a whitelist maintained at
*global-config* level via `addUpdateWhitelistedReserve` — i.e. not by this key. It can redirect among
whitelisted reserves, not extract. We have **not** enumerated the whitelist or verified who controls
global config, so the strength of that bound is itself unverified.

## Deployment and verification

`verified_current_binary_exact_commit`.

- Registry: solana-verify / OtterSec, `verify.osec.io/status/KvauGMsp…`
- Commit `1d146d7087a76edbbadc14d848ae14295c0745a4`, repo `Kamino-Finance/kvault`
- `on_chain_hash === executable_hash === 5b1eac1695f68e4e…` — a hash comparison, not a tag or a date
- Deployed **2026-07-14T14:54:02Z** (chain time, slot 432874668); verified **15:00:30Z**, 6m28s later;
  no upgrade since. The ordering is what makes the record describe the *current* binary.
- Record signed by `GzFgdRJXmaw…` — the program's own upgrade authority (the 5-of-10 Squads PDA).

A second record (signer `Cyjb5r4P…`, commit `0321f628…`, `is_verified: false`, hash mismatch) is
retained in `SUPERSEDED_VERIFICATION_RECORDS` precisely so nobody mistakes it for evidence.

**Consequence:** `CLOSURE_BINDING.reviewedSourceCommit` *is* the verified deployed commit. Every
source-derived conclusion in the 16H series (uncapped capacity, no pause flag, no withdrawal queue, fee
maths) is now a claim about the deployed bytecode rather than about plausibly-deployed source.

Program history: `kvauTFR8…` is **closed** — its programData account no longer exists, last activity
2026-03-25. `KvauGMsp…` is canonical and owns the reviewed vault.

## Audit linkage — still `unverified_linkage`

A verified build proves source↔binary correspondence. It says nothing about whether that source was
audited. Conflating the two is the easiest mistake available here, and it is not made.

All three Earn Vaults reports (OtterSec 2024-12-09, Sec3 2025-02-06, Offside Labs 2025-04-12) state no
commit/tag/release and predate the deployment by 15–19 months. Knowing the deployed commit exactly
makes the gap *sharper*, not smaller. Unresolved hypothesis (recorded, not treated as a finding): they
may have audited the now-closed `kvauTFR8…`. OtterSec appearing as both 2024 auditor and 2026 registry
is a coincidence of names, not linkage.

## Withdrawal

Read from on-chain state — the REST API omits these fields entirely.

- `withdrawalPenaltyBps = 0`, `withdrawalPenaltyLamports = 0` → **no configured penalty**. This
  **corrects** the 16H-L "third exit cost" claim, which was written before the fields were read.
  Both remain admin-settable via the 3-of-10 no-timelock multisig, so zero is a current state.
- `unallocatedWeight = 0`, `unallocatedTokensCap = 0` → policy is to hold **no** buffer.
- `tokenAvailable` 69,969.58 USDC vs `pendingFees` 70,038.77 USDC → unencumbered buffer is
  **−69.18 USDC**. Effectively **100%** of any withdrawal must come from reserves.
  `tokenAvailable` must never be described as instantly withdrawable liquidity.
- **No queue, FIFO, cooldown or pending-withdrawal construct exists** in the verified binary — an
  authoritative negative, not an unknown. If a reserve lacks liquidity there is nothing to queue into.
- `withdrawFromAvailable` exists (partial, buffer-only); the capability exists, the liquidity does not.
- `redeemInKind` exists as an alternate exit; its semantics are **not** verified and are not relied on.

### Reserves at slot 433302860

| Reserve | Market | Weight | Reserve liq. | Vault pos. (approx) | Covers? |
|---|---|---|---|---|---|
| `D6q6wuQ…` | SOL/BTC Market | 87.61% | 24.36M | 18.15M | yes |
| `Ga4rZyt…` | JLP Market | 10.29% | 2.69M | 2.13M | yes |
| `Atj6URE…` | **Maple Market** | 1.44% | 261k | 298k | **no** |
| `9FRZvAs…` | Bitcoin Market | 0.66% | 100k | 138k | **no** |

`Atj6URE…` was unresolved in 16H-L; it resolves to Maple Market via Kamino's official market list. All
four are status Active, `emergencyMode 0`, `blockCtokenUsage 0`. Utilization 78–89%.

Aggregate liquidity (27.4M) exceeds the vault position (20.7M), **but withdrawal is per-reserve**, so
that does not imply a full exit. Two reserves cannot currently be exited in full. Withdrawals are
**not** instant. Vault position values are approximations (ctoken share × reserve total), not exact SDK
positions, and are labelled as such. Reserve liquidity is a live observation driven by third-party
borrowers; it must never be cached or treated as a floor.

## API status semantics — an authoritative absence

`GET /kvaults/vaults/{pubkey}` returns `{address, state, programId}` and has **no status field of any
kind**. The question "what are its enum values" has no answer because the field does not exist. So the
API **cannot** gate eligibility.

The API is also strictly weaker than chain: it omits `withdrawalPenaltyBps`,
`withdrawalPenaltyLamports`, `unallocatedWeight`, `unallocatedTokensCap`, `depositCap` and both
whitelist flags. With no status field it cannot represent a deprecated, hidden, permissioned, frozen or
closed vault — so **HTTP 200 is not evidence of availability**. Refresh and error behaviour are
unresolved and left that way.

## Permissioning — `public`

All 43 VaultState fields enumerated: no depositor allowlist, no kperm binding, no permission-program
account. `deposit` takes 4 accounts, none of them a permission account.

This is a conclusion rather than an absence-of-evidence fallacy **only because the binary is
hash-verified**: the enumerated surface *is* the deployed surface, and a program that contains no such
field cannot enforce a user gate.

The two whitelist flags are **not** user permissioning — they constrain the allocation admin. Off-chain
restrictions (geofencing, terms) are not visible on-chain and are **not** ruled out.

## Read-only deposit state — `verified_read_only_available`

`DEPOSIT_STATE_POLICY` answers *"on read-only evidence alone, may WealthSmith recommend this?"* — never
*"would this user's deposit succeed?"*, which needs simulation the MVP does not and will not perform.

Fail-closed ladder, first match wins: user-specific permissioning → `permissioned_user_specific`;
unresolved permissioning / stale evidence / unverified identity / unknown minimum →
`unknown_without_transaction_simulation`; capacity not uncapped / unhealthy reserve / no headroom →
`verified_read_only_unavailable`; otherwise `verified_read_only_available`.

Rules: `verified_uncapped` ≠ available. No pause flag ≠ available. Readable accounts ≠ available. API
status contributes nothing (no semantics). Stale fails closed. Permissioned fails closed.
Simulation-dependent stays unknown.

**Steakhouse is `verified_read_only_available` and simultaneously unapproved and unsuggestible.** The
result carries `impliesApproval: false` and `sufficientToSuggest: false`. Deposit availability and risk
approval are orthogonal gates; only the former is met.

## Readiness — `blocked_pending_protocol_confirmation`

Resolved by 16H-L.1: `upgrade_admin_authority`, `manager_discretion`, `liquidity_withdrawal`,
`withdrawal_fee_transparency` → all `complete`, no blocker. **Complete means determined, not
favourable** — `manager_discretion` is complete *and* records a single raw key directing 20.7M USDC.

Surviving blockers, both needing Kamino:

- **`audit_security`** — audited version cannot be related to the deployed bytecode.
- **`incident_history`** — no sourced incident review exists.

Missing evidence never produces `unsuitable_to_continue_review`; that verdict is reserved for a
verified disqualifying condition, of which there are none.

## Questionnaire

Struck (now proven on-chain): which commit is deployed; whether a verifiable hash exists; upgrade
timelock policy; withdrawal penalty values; queue conditions; and the question whose premise was false
("the upgrade authority is a System-Program-owned account…").

Surviving, because on-chain state cannot answer them: independence/custody of the multisig member keys
and of the allocation-admin key; operational controls and notice policy around allocation and
no-timelock admin changes; audit coverage of commit `1d146d70…`; whether the 2024–25 reports targeted
the closed program; `redeemInKind` semantics; whether GlobalConfig can introduce a penalty
independently; off-chain restrictions; incident history.

## Invariants held

No score, no worksheet entry, no signoff, no approval. Zero approved products. Production renders no
Stable Yield card. Demo unchanged. Capacity remains `verified_uncapped`. No user-facing numeric score.
No transaction construction, no simulation, no execution path. Fixtures remain fully offline (verified
by running them with `fetch` disabled); live reads were read-only and confined to scratchpad probes.

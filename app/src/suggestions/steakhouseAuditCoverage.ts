/**
 * steakhouseAuditCoverage — Step 16H-L.2.
 *
 * Audit-coverage closure for the exact deployed KVault binary, established by DIRECT INSPECTION of
 * the verified deployed source rather than by trusting a private-to-public commit mapping that does
 * not publicly exist.
 *
 * Assigns NO score, fills NO worksheet, completes NO review, approves NOTHING, constructs no
 * transaction and no simulation.
 *
 * THE MOVE THAT MAKES THIS POSSIBLE. 16H-L.1 proved the deployed bytecode is hash-identical to public
 * commit 1d146d70… So public source inspection is not a proxy for the deployed program — it IS the
 * deployed program. That lets us answer "is the audited fix in the running code?" WITHOUT Kamino
 * attesting which private PR became which public commit. The private mapping stays unresolved and is
 * simply not required for code properties we can read directly.
 *
 * THREE QUESTIONS THAT MUST NEVER COLLAPSE INTO ONE BOOLEAN:
 *   A. Did an audit examine the feature?            → AUDIT_INVENTORY.scope
 *   B. Are the documented fixes in the deployed code? → REMEDIATION_VERIFICATIONS (direct inspection)
 *   C. Is the WHOLE deployed codebase audited?      → PUBLICLY_UNCOVERED_SURFACE (it is not)
 * A "yes" to A and B says nothing about C. The whole point of this module is to keep them apart.
 */
import type { RiskRubricV1DimensionId } from "./riskGovernance";

export const STEAKHOUSE_AUDIT_COVERAGE_VERSION = "1.0.0" as const;
export const L2_EVIDENCE_CUTOFF_AT = "2026-07-16T16:40:00.000Z";

export const L2_BINDING = {
  strategyId: "kamino_steakhouse_usdc",
  vaultAddress: "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E",
  sharesMint: "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS",
  programId: "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd",
  deployedCommit: "1d146d7087a76edbbadc14d848ae14295c0745a4",
} as const;

/* ------------------------------------------------------------------ *
 * 1. Public release identity — established by git ancestry, not by dates
 * ------------------------------------------------------------------ */

/**
 * Resolved from the official public repo by `git describe` / `git tag --contains`, NOT from audit
 * filenames and NOT from date proximity. The deployed commit's own subject line says "release 2.2.2",
 * but a commit message is a claim; the tag is the evidence, so the tag is what was used.
 */
export const PUBLIC_RELEASE_IDENTITY = {
  repository: "https://github.com/Kamino-Finance/kvault",
  deployedCommit: "1d146d7087a76edbbadc14d848ae14295c0745a4",
  /** `git tag --contains 1d146d70` → exactly one tag; `git describe --tags` → release/v2.2.2. */
  deployedTag: "release/v2.2.2",
  tagPointsExactlyAtDeployedCommit: true,
  branch: "master",
  commitAuthoredAt: "2026-07-08T15:45:00+03:00",
  deployedToMainnetAt: "2026-07-14T14:54:02.000Z",
  previousReleaseTag: "release/v2.2.1",
  previousReleaseCommit: "0426eb12",
  previousReleaseAuthoredAt: "2026-06-19T21:29:07+03:00",
  resolutionMethod: "git ancestry + tags (git describe --tags, git tag --contains). Audit filenames and report dates were NOT used to establish release identity.",
  allPublicTags: [
    "release/v1.0.0", "release/v1.1.0", "release/v2.0.0", "release/v2.0.1",
    "release/v2.1.0", "release/v2.1.1", "release/v2.2.0", "release/v2.2.1", "release/v2.2.2",
  ],
  tagsMapDirectlyToPublicCommits: true,
} as const;

/**
 * The squashed-history limitation, stated precisely rather than waved at.
 *
 * The public repo holds 27 commits for the entire protocol's life; v2.2.1 → v2.2.2 is exactly ONE
 * commit ("release 2.2.2 (#15)"). Development history is squashed per release.
 *
 * WHAT THIS COSTS US: we cannot see individual private PRs, cannot attribute a line to PR #59/#78/#113,
 * and cannot read a per-fix commit message. So the CAUSAL claim "this code changed because of that
 * audit finding" is not publicly provable.
 *
 * WHAT IT DOES NOT COST US: the END STATE. Whether the deployed code enforces a minimum withdrawal, or
 * validates a cToken mint, is readable directly and does not depend on knowing which PR introduced it.
 * That distinction is what this whole step rests on.
 */
export const SQUASHED_HISTORY_LIMITATION = {
  publicHistoryIsSquashed: true,
  totalPublicCommits: 27,
  commitsBetweenPreviousAndDeployedRelease: 1,
  privatePrsReferencedInPublicHistory: false,
  privateToPublicMappingExists: false,
  blocksCausalAttribution: true,
  blocksEndStateVerification: false,
  note: "No public commit references private PR #59, #78 or #113. Only Kamino can attest private-to-public correspondence. That attestation is required for CAUSAL claims about why code changed — not for verifying what the deployed code does.",
} as const;

/* ------------------------------------------------------------------ *
 * 2. Feature presence in the deployed binary
 * ------------------------------------------------------------------ */

export type FeaturePresence =
  | "rewards_feature_present"
  | "rewards_feature_absent"
  | "partial_rewards_feature"
  | "unresolved";

export const REDEEM_IN_KIND_PRESENCE = {
  present: true,
  instruction: "redeem_in_kind (programs/kvault/src/lib.rs)",
  handler: "programs/kvault/src/handlers/handler_redeem_in_kind.rs",
  operation: "vault_operations::redeem_in_kind (programs/kvault/src/operations/vault_operations.rs)",
  evidence: "The instruction is declared in lib.rs, the handler and the operation both exist in commit 1d146d70…, and the on-chain IDL exposes `redeemInKind`. Present in the deployed binary.",
} as const;

/**
 * PRESENT in the binary — so the 2026 vault-rewards audits ARE applicable and their remediations were
 * checked (they all verify).
 *
 * BUT DORMANT ON THIS VAULT, which is material context and is deliberately kept separate from
 * applicability. On-chain at slot 433310463 the Steakhouse vault reads:
 *   reward_per_second = 0, rewards_available = 0, last_issuance_ts = 0,
 *   cumulative_rewards_distributed_analytics = 0
 * `has_active_rewards()` is `reward_per_second > 0 && rewards_available > 0` → false, so every
 * `refresh_rewards` call early-returns Ok(0) with no effect. Cumulative-distributed being 0 means
 * rewards have NEVER been issued on this vault.
 *
 * Dormant is NOT absent: the code is in the deployed binary and the vault admin can activate it. So
 * the audits stay applicable and the reward surface stays in scope. It does reduce the CURRENT
 * practical exposure, which is a fact for the reviewer to weigh — not a reason to drop the surface.
 */
export const REWARDS_FEATURE_PRESENCE = {
  conclusion: "rewards_feature_present" as FeaturePresence,
  evidence: "Deployed commit 1d146d70… contains the `topup_rewards` and `withdraw_rewards` instructions, the `VaultRewardInfo` state (programs/kvault/src/state/vault_reward_info.rs), and `vault_operations::refresh_rewards`. Concept counts in the deployed source: reward_info 29, refresh_rewards 10, topup_rewards 6, reward_per_second 9, last_issuance_ts 8.",
  dormantOnThisVault: true,
  dormancyEvidence: "On-chain slot 433310463: reward_per_second=0, rewards_available=0, last_issuance_ts=0, cumulative_rewards_distributed_analytics=0. has_active_rewards() is false; refresh_rewards early-returns with no effect. Rewards have never been issued on this vault.",
  dormancyIsNotAbsence: "The feature is in the deployed binary and the vault-admin multisig (3-of-10, no time lock) can activate it at any time. The audits therefore remain APPLICABLE and the surface remains in scope. Dormancy reduces current practical exposure; it does not remove the code.",
} as const;

/* ------------------------------------------------------------------ *
 * 3. Remediation verification by direct source inspection
 * ------------------------------------------------------------------ */

export type RemediationEvidenceState =
  | "verified_present_in_deployed_source"
  | "partially_present"
  | "absent"
  | "not_applicable"
  | "unresolved";

export interface RemediationVerification {
  id: string;
  feature: "redeem_in_kind" | "vault_rewards";
  /** The published finding this remediation corresponds to. */
  auditFinding: string;
  auditor: string;
  auditDate: string;
  /** The PRIVATE reference, recorded but explicitly NOT relied upon. */
  privateReference: string;
  state: RemediationEvidenceState;
  file: string;
  functionOrInstruction: string;
  /** What the deployed code actually DOES. Behaviour and data flow — never variable names alone. */
  behaviourVerified: string;
  /** How this was proven without the private mapping. */
  verificationMethod: string;
  failureBehaviour: string | null;
}

/**
 * Every state below comes from reading commit 1d146d70… — the exact bytes that are deployed.
 *
 * A NOTE ON WHAT "verified_present_in_deployed_source" CLAIMS. It claims the deployed code exhibits
 * the property the finding called for. It does NOT claim the code changed BECAUSE of the finding —
 * that is the causal claim the squashed history blocks. The distinction is not pedantry: a property
 * could have been present all along, and the audit merely confirmed it. Either way the user-relevant
 * question — "is the protection in the running program?" — is answered.
 *
 * VARIABLE NAMES WERE NOT USED AS EVIDENCE anywhere here. The two-stage penalty finding in particular
 * is proven by the ALGEBRA of two different helpers, not by their names.
 */
export const REMEDIATION_VERIFICATIONS: RemediationVerification[] = [
  {
    id: "rik_min_withdraw",
    feature: "redeem_in_kind",
    auditFinding: "missing minimum-withdrawal validation in the redeem-in-kind path",
    auditor: "Certora",
    auditDate: "2026-02",
    privateReference: "kvault-private PR #59 / commit 5f8c2…, PR #113 / commit 4b66b… (NOT publicly mapped; not relied upon)",
    state: "verified_present_in_deployed_source",
    file: "programs/kvault/src/operations/vault_operations.rs",
    functionOrInstruction: "vault_operations::redeem_in_kind (line ~824 at the deployed commit)",
    behaviourVerified:
      "`if actual_liquidity_value_f.to_floor::<u64>() <= vault_state.min_withdraw_amount { return err!(KaminoVaultError::WithdrawAmountBelowMinimum); }`. Two properties make this the CANONICAL requirement rather than a lookalike: (1) it reads the same `vault_state.min_withdraw_amount` field that standard `withdraw` gates on at line ~324, with the same `<=` boundary and the same error; (2) it is evaluated against `actual_liquidity_value_f` — the amount AFTER the cToken cap — not the theoretical pre-cap amount, so a withdrawal capped down below the minimum is still rejected. Checking the pre-cap figure would have let a sub-minimum withdrawal through.",
    verificationMethod: "Direct read of the deployed commit, cross-referenced against the standard withdraw path's use of the same field (grep of all `min_withdraw_amount` sites: vault_state.rs:54 declaration, vault_operations.rs:324 standard withdraw, vault_operations.rs:824 redeem-in-kind, vault_config_operations.rs admin setter).",
    failureBehaviour: "KaminoVaultError::WithdrawAmountBelowMinimum — the instruction fails; no partial effect, since the check precedes burn_shares and withdraw_from_vault_allocation.",
  },
  {
    id: "rik_ctoken_mint_validation",
    feature: "redeem_in_kind",
    auditFinding: "missing cToken-vault mint validation",
    auditor: "Certora",
    auditDate: "2026-02",
    privateReference: "kvault-private PR #59 / commit 5f8c2…, PR #113 / commit 4b66b… (NOT publicly mapped; not relied upon)",
    state: "verified_present_in_deployed_source",
    file: "programs/kvault/src/handlers/handler_redeem_in_kind.rs",
    functionOrInstruction: "RedeemInKind accounts struct (Anchor constraints, compile-time declared / runtime enforced)",
    behaviourVerified:
      "A closed constraint CHAIN, which is what makes it sound — no single constraint would be enough. `ctoken_vault` is a PDA pinned by `seeds = [CTOKEN_VAULT_SEED, vault_state.key(), reserve.key()]` AND `token::mint = ctoken_mint`. `ctoken_mint` is itself pinned by `address = reserve.load()?.collateral.mint_pubkey`. Composing them: ctoken_vault.mint == ctoken_mint == reserve.collateral.mint_pubkey, and ctoken_vault is derivable only for this (vault, reserve) pair. So the cToken vault cannot be substituted with one for a different reserve or a different mint. `user_ctoken_ta` is independently bound to the same `ctoken_mint` and to `authority = user`.",
    verificationMethod: "Direct read of the Anchor accounts struct in the deployed commit, composing the seeds/token::mint/address constraints into a chain rather than reading any one in isolation.",
    failureBehaviour: "Anchor constraint violation before any handler logic runs (ConstraintSeeds / ConstraintTokenMint / ConstraintAddress). The transaction fails; no state change.",
  },
  {
    id: "rik_two_stage_penalty",
    feature: "redeem_in_kind",
    auditFinding: "informational: two-stage withdrawal-penalty calculation; and (Certora) unnecessary intermediate penalty rounding",
    auditor: "OtterSec (informational) + Certora (rounding)",
    auditDate: "2026-03-19 / 2026-02",
    privateReference: "kvault-private PR #59 (NOT publicly mapped; not relied upon)",
    state: "verified_present_in_deployed_source",
    file: "programs/kvault/src/operations/vault_operations.rs",
    functionOrInstruction: "vault_operations::redeem_in_kind + common::get_withdrawal_penalty_for_fraction_amount_{inclusive,exclusive}",
    behaviourVerified:
      "The two stages are separated by the cToken cap, and are proven distinct by ALGEBRA, not naming. STAGE 1 (theoretical): user's pro-rata share of AUM → `get_withdrawal_penalty_for_fraction_amount_inclusive`, which computes `amount * penalty_bps / FULL_BPS` — correct when the penalty is already INSIDE the amount — then subtracts it. CAP: `ctokens_to_send_to_user = exchange_rate.fraction_liquidity_to_collateral(theoretical).to_floor::<u64>().min(reserve_ctokens_owned)` — the vault cannot send more cTokens than it holds in that reserve. STAGE 2 (actual): recomputed FROM the capped cTokens via `fraction_collateral_to_liquidity_ceil`, then `get_withdrawal_penalty_for_fraction_amount_exclusive`, which computes `amount * f / (1 - f)` where `f = Fraction::from_bps(penalty_bps)` — the correct gross-up when the penalty is OUTSIDE a net amount. Two different formulas for two genuinely different questions; a renamed duplicate would share the formula. PRECISION: both helpers take and return `Fraction` (fixed-point) and neither rounds internally — `.max(Fraction::from(penalty_lamports))` composes the flat floor in Fraction space. `to_floor::<u64>()` appears only at the cToken cap (cTokens must be integral) and at the min-withdraw comparison; the penalty itself is never intermediately rounded before feeding `calculate_shares_to_burn`. The legacy u64 helper `get_withdrawal_penalty` does `.to_ceil::<u64>()` but is not on this path.",
    verificationMethod: "Read both helper bodies and compared their FORMULAS (bps/FULL_BPS vs f/(1-f)); traced the data flow through the cap to confirm stage 2 derives from the capped cToken amount rather than re-using stage 1's figure; traced Fraction types end-to-end to confirm no intermediate rounding. Variable names were deliberately not treated as evidence.",
    failureBehaviour: "KaminoVaultError::WithdrawAmountLessThanWithdrawalPenalty if the penalty would meet or exceed the withdrawal; WithdrawResultsInZeroShares if the capped amount rounds to nothing.",
  },
  {
    id: "rw_pending_reward_safety",
    feature: "vault_rewards",
    auditFinding: "pending-reward overflow / denial-of-service risk",
    auditor: "OtterSec",
    auditDate: "2026-03-19",
    privateReference: "kvault-private PR #78 (NOT publicly mapped; not relied upon)",
    state: "verified_present_in_deployed_source",
    file: "programs/kvault/src/operations/vault_operations.rs",
    functionOrInstruction: "vault_operations::refresh_rewards (line ~918 at the deployed commit)",
    behaviourVerified:
      "Saturating arithmetic on both operations that could overflow: `let seconds_passed = current_timestamp.saturating_sub(reward_info.last_issuance_ts);` and `let pending_rewards = reward_info.reward_per_second.saturating_mul(seconds_passed);`. Distribution is then capped by `pending_rewards.min(reward_info.rewards_available)`. This is precisely the DoS remediation: in a Solana program an arithmetic overflow panics and aborts the instruction, so an overflowing pending-reward computation would brick every path that refreshes rewards — which, per the ordering fix below, is deposit, withdraw and redeem-in-kind. Saturating instead of panicking means an absurd timestamp or rate degrades to a capped payout rather than a frozen vault.",
    verificationMethod: "Direct read of the deployed refresh_rewards body, tracing every arithmetic operation on the pending-reward path.",
    failureBehaviour: "None — that is the point. Saturation replaces panic, so the instruction proceeds.",
  },
  {
    id: "rw_exhaustion_timestamp",
    feature: "vault_rewards",
    auditFinding: "stale `last_issuance_ts` after reward exhaustion (accumulated rewards capturable after a later top-up)",
    auditor: "Certora",
    auditDate: "2026-03",
    privateReference: "kvault-private commit dabe9a26f8e2c1b77e596f292be62b0a3a1cfd94 (NOT publicly mapped; not relied upon)",
    state: "verified_present_in_deployed_source",
    file: "programs/kvault/src/operations/vault_operations.rs",
    functionOrInstruction: "vault_operations::topup_rewards, in composition with refresh_rewards",
    behaviourVerified:
      "The fix is in `topup_rewards`, NOT in `refresh_rewards` — and the composition is what closes the hole, so both halves must be read together. When rewards are exhausted (`rewards_available == 0`), `has_active_rewards()` is false, so `refresh_rewards` early-returns at its FIRST guard and deliberately leaves `last_issuance_ts` stale. On its own that is the vulnerability. `topup_rewards` closes it: it calls `refresh_rewards` (which early-returns), then `rewards_available += amount`, then `if vault.reward_info.has_active_rewards() { vault.reward_info.last_issuance_ts = current_ts; }` — re-evaluating the predicate AFTER the top-up, so the timestamp is reset exactly at the moment rewards become active again. The dormant interval is therefore never converted into `seconds_passed`, and the accumulated-reward capture is prevented. A separate `last_issuance_ts == 0` guard in refresh_rewards handles the never-initialised case by seeding the timestamp and returning 0.",
    verificationMethod: "Traced the exhaustion → top-up → refresh state machine across both functions in the deployed commit, checking the ORDER of the predicate re-evaluation relative to the `rewards_available` mutation. Reading either function alone would have given the wrong answer.",
    failureBehaviour: "None — a state-machine correction, not a rejection.",
  },
  {
    id: "rw_refresh_ordering",
    feature: "vault_rewards",
    auditFinding: "reward accounting must be refreshed before all relevant operations",
    auditor: "OtterSec / Certora",
    auditDate: "2026-03",
    privateReference: "kvault-private PR #78 (NOT publicly mapped; not relied upon)",
    state: "verified_present_in_deployed_source",
    file: "programs/kvault/src/operations/vault_operations.rs, programs/kvault/src/handlers/handler_invest.rs, programs/kvault/src/handlers/handler_update_vault_config.rs",
    functionOrInstruction: "all reward-relevant paths",
    behaviourVerified:
      "`refresh_rewards` is called at the START of every path whose accounting depends on reward state — enumerated exhaustively from the deployed commit rather than spot-checked: vault_operations::deposit (line ~60), ::withdraw (~198), ::withdraw_pending_fees (~370), ::give_up_pending_fee (~453), ::redeem_in_kind (~738), ::topup_rewards (~962), ::withdraw_rewards (~976), handler_invest (line 61), handler_update_vault_config (line 41). That covers all three paths the audit scope names (invest, topup rewards, redeem-in-kind) plus four more. Ordering matters because refresh_rewards moves rewards into `vault.token_available`, which feeds AUM — refreshing afterwards would price shares off stale AUM.",
    verificationMethod: "Exhaustive grep of all `refresh_rewards(` call sites in the deployed commit, then mapping each line number back to its enclosing function via source position.",
    failureBehaviour: null,
  },
  {
    id: "rw_duplicate_refresh",
    feature: "vault_rewards",
    auditFinding: "duplicate reward refresh",
    auditor: "Certora",
    auditDate: "2026-03",
    privateReference: "kvault-private commit dabe9a26f8e2c1b77e596f292be62b0a3a1cfd94 (NOT publicly mapped; not relied upon)",
    state: "verified_present_in_deployed_source",
    file: "programs/kvault/src/handlers/handler_invest.rs, programs/kvault/src/operations/vault_operations.rs",
    functionOrInstruction: "invest path",
    behaviourVerified:
      "Exactly ONE refresh per invest. `handler_invest.rs:61` calls `vault_operations::refresh_rewards(...)`, and `vault_operations::invest` itself contains ZERO `refresh_rewards` calls — verified by extracting the invest function body and counting occurrences (result: 0). The redundant second call is gone. A duplicate would have been more than untidy: refresh_rewards mutates state (moving rewards into token_available and advancing last_issuance_ts), so calling it twice in one instruction is a repeated state transition, not an idempotent read.",
    verificationMethod: "Counted refresh_rewards occurrences inside the extracted vault_operations::invest body (0) against the handler's single call site (1).",
    failureBehaviour: null,
  },
];

/**
 * A residual observation from source inspection. Recorded because dropping it would be dishonest;
 * bounded because overstating it would be worse.
 *
 * NOT an audit finding. NOT a WealthSmith security finding — this project does not audit code, and a
 * property that looks odd from the outside is very often intentional and understood by people with
 * more context. It is written down so the human reviewer can ask, and so it is not silently lost.
 *
 * THE OBSERVATION: `has_active_rewards()` requires `reward_per_second > 0 && rewards_available > 0`.
 * The exhaustion fix in `topup_rewards` resets `last_issuance_ts` only when that predicate holds AFTER
 * the top-up. So a top-up performed while `reward_per_second == 0` does not reset the timestamp. If a
 * vault had previously streamed rewards (leaving `last_issuance_ts` non-zero), then had its rate set
 * to 0, then received a top-up, a later re-activation of the rate would compute `seconds_passed` from
 * the stale timestamp.
 *
 * BOUNDS, which are what keep this proportionate:
 *   - Payout is capped by `pending_rewards.min(rewards_available)`, so nothing beyond funded rewards
 *     can ever be paid. It is an acceleration of distribution, not a loss to the vault.
 *   - It requires vault-admin action (only `update_vault_config` sets `reward_per_second`).
 *   - It is NOT reachable from this vault's current state: `last_issuance_ts == 0`, which hits the
 *     dedicated zero-guard in refresh_rewards and seeds the timestamp safely. Rewards have never been
 *     issued here (cumulative distributed = 0).
 *   - Rewards are dormant on this vault entirely.
 */
export const RESIDUAL_SOURCE_OBSERVATION = {
  id: "rewards_rate_zero_topup_timestamp",
  isAuditFinding: false,
  isWealthsmithSecurityFinding: false,
  raisedBy: "16H-L.2 direct source inspection",
  observation:
    "topup_rewards resets last_issuance_ts only `if has_active_rewards()` after the top-up, and that predicate also requires reward_per_second > 0. A top-up while the rate is 0 therefore leaves the timestamp unreset, so a later rate re-activation would measure seconds_passed from a stale timestamp.",
  reachableFromCurrentVaultState: false,
  whyNotReachable: "This vault has last_issuance_ts == 0, which is handled by the explicit zero-guard in refresh_rewards (it seeds the timestamp and returns 0). Rewards have never been issued here and are dormant.",
  boundedBy: [
    "pending_rewards.min(rewards_available) caps any payout at the funded amount — no loss to the vault, only accelerated distribution to whoever holds shares at that moment.",
    "Requires vault-admin action: reward_per_second is settable only via update_vault_config (3-of-10 multisig, no time lock).",
    "Rewards are dormant on this vault (reward_per_second = 0, rewards_available = 0, cumulative distributed = 0).",
  ],
  forReviewer:
    "Worth asking Kamino about, and worth re-checking if rewards are ever activated on this vault. It is explicitly NOT a claim that the code is wrong — WealthSmith does not audit, and this may be intentional or already understood.",
} as const;

/* ------------------------------------------------------------------ *
 * 4. Deployed release diff — changed-surface inventory
 * ------------------------------------------------------------------ */

export type ChangedSurfaceCategory =
  | "redeem_in_kind_delta_audit"
  | "vault_rewards_delta_audit"
  | "baseline_vault_audit"
  | "formal_verification_or_fuzzing"
  | "generated_IDL_or_non_runtime"
  | "documentation_or_tooling"
  | "publicly_uncovered_runtime_change"
  | "unable_to_map";

export interface ChangedSurface {
  path: string;
  module: string;
  behaviorChanged: string;
  category: ChangedSurfaceCategory;
  securityRelevance: "high" | "medium" | "low" | "none";
  auditMapping: string;
}

/**
 * `git diff -M -C release/v2.2.1 release/v2.2.2` — the release that is deployed.
 *
 * RENAME DETECTION MATTERS HERE. A naive diff reports state.rs as −680 lines and six new state/*.rs
 * files, which looks like a large rewrite. With `-M` git resolves it: state.rs → state/vault_state.rs
 * is a RENAME, and the rest is a module split. Counting that as changed runtime surface would inflate
 * the uncovered scope with code that did not change — exactly what the spec warns against.
 */
export const DEPLOYED_RELEASE_DIFF: ChangedSurface[] = [
  {
    path: "programs/kvault/src/lib.rs",
    module: "instruction surface",
    behaviorChanged: "THREE NEW INSTRUCTIONS added in v2.2.2: `update_reserve_allocation_v2`, `deposit_with_min_shares_out`, `buy_with_min_shares_out`. The latter two are slippage-protection variants; the first is a new allocation-config entrypoint.",
    category: "publicly_uncovered_runtime_change",
    securityRelevance: "high",
    auditMapping: "NONE. The 2026 feature audits target redeem-in-kind (release 2.1.0) and vault rewards (release 2.1.1). These instructions did not exist then. The 2024-2025 baselines predate them by over a year. No public audit covers them.",
  },
  {
    path: "programs/kvault/src/operations/vault_operations.rs",
    module: "core vault operations",
    behaviorChanged: "411 changed lines. redeem_in_kind and both penalty helpers are UNCHANGED (verified identical to release/v2.1.0). The delta is in other functions: deposit, withdraw, invest, allocation handling, and CtokenCap integration.",
    category: "publicly_uncovered_runtime_change",
    securityRelevance: "high",
    auditMapping: "PARTIAL. The redeem_in_kind and reward functions within this file are covered (and verified identical to their audited releases). The remaining changed functions are not covered by any public audit of this release.",
  },
  {
    path: "programs/kvault/src/operations/klend_operations.rs",
    module: "KLend CPI",
    behaviorChanged: "214 changed lines in the CPI layer that moves user funds between the vault and KLend reserves.",
    category: "publicly_uncovered_runtime_change",
    securityRelevance: "high",
    auditMapping: "NONE for this release. This is the layer that actually moves user liquidity, which is what makes it the most consequential uncovered item.",
  },
  {
    path: "programs/kvault/src/state/ctoken_cap.rs",
    module: "state — new concept",
    behaviorChanged: "NEW FILE in v2.2.2 (absent at v2.2.1): a CtokenCap state concept, referenced from vault_allocation, vault_state, reserve_whitelist_operations, vault_operations and handler_update_reserve_allocation.",
    category: "publicly_uncovered_runtime_change",
    securityRelevance: "medium",
    auditMapping: "NONE. A new state concept introduced in the deployed release, after every public audit.",
  },
  {
    path: "programs/kvault/src/handlers/handler_update_reserve_allocation.rs",
    module: "allocation admin",
    behaviorChanged: "46 changed lines, plus the new update_reserve_allocation_v2 entrypoint. This is the allocation-admin surface — the authority 16H-L.1 found to be a single unlocked key.",
    category: "publicly_uncovered_runtime_change",
    securityRelevance: "high",
    auditMapping: "NONE for this release. Compounding: the weakest authority operates the least-covered changed surface.",
  },
  {
    path: "programs/kvault/src/handlers/handler_invest.rs",
    module: "invest crank",
    behaviorChanged: "49 changed lines. Retains exactly one refresh_rewards call (the duplicate-refresh remediation).",
    category: "publicly_uncovered_runtime_change",
    securityRelevance: "medium",
    auditMapping: "PARTIAL. The reward-refresh ordering within it is verified; the rest of the invest changes are uncovered.",
  },
  {
    path: "programs/kvault/src/handlers/handler_deposit.rs",
    module: "deposit",
    behaviorChanged: "20 changed lines, supporting the new deposit_with_min_shares_out / buy_with_min_shares_out variants.",
    category: "publicly_uncovered_runtime_change",
    securityRelevance: "medium",
    auditMapping: "NONE for this release.",
  },
  {
    path: "programs/kvault/src/handlers/handler_redeem_in_kind.rs",
    module: "redeem-in-kind handler",
    behaviorChanged: "6 changed lines: AUM computation swapped from `underlying_inventory` to `HoldingsBuffer::compute_once`. The audited OPERATION body it calls is unchanged.",
    category: "redeem_in_kind_delta_audit",
    securityRelevance: "medium",
    auditMapping: "PARTIAL. The audited redeem_in_kind operation is byte-identical to release/v2.1.0. This handler-level AUM refactor postdates that audit and is NOT covered — a small but real gap in an otherwise well-covered feature.",
  },
  {
    path: "programs/kvault/src/operations/reserve_whitelist_operations.rs",
    module: "reserve whitelist",
    behaviorChanged: "15 changed lines. This is the mechanism that bounds allocation-admin discretion (16H-L.1's stated mitigation).",
    category: "publicly_uncovered_runtime_change",
    securityRelevance: "high",
    auditMapping: "NONE for this release. Directly relevant: the mitigation relied on when weighing manager discretion is itself uncovered changed code.",
  },
  {
    path: "programs/kvault/src/utils/cpi_mem.rs",
    module: "CPI memory",
    behaviorChanged: "18 changed lines in CPI memory lending.",
    category: "publicly_uncovered_runtime_change",
    securityRelevance: "low",
    auditMapping: "NONE for this release.",
  },
  {
    path: "programs/kvault/src/state.rs → programs/kvault/src/state/*.rs",
    module: "state module split",
    behaviorChanged: "NO BEHAVIOUR CHANGE. git -M resolves state.rs → state/vault_state.rs as a rename; the remaining new files are a module split (state.rs is now 12 lines of mod/pub use). Counted as non-runtime so it does NOT inflate uncovered scope.",
    category: "generated_IDL_or_non_runtime",
    securityRelevance: "none",
    auditMapping: "Not applicable — moved code, not changed code.",
  },
  {
    path: "libs/kvault-interface/**, Cargo.lock, Cargo.toml, tests/**, examples/**",
    module: "client interface / non-runtime",
    behaviorChanged: "Discriminators, error variants, deposit helpers/instructions for the new client-side entrypoints; dependency lock; test helpers.",
    category: "generated_IDL_or_non_runtime",
    securityRelevance: "low",
    auditMapping: "Not on-chain runtime. Excluded from uncovered RUNTIME scope, though the on-chain instructions they call are counted above.",
  },
];

/* ------------------------------------------------------------------ *
 * 5. Audit inventory
 * ------------------------------------------------------------------ */

export interface AuditRecordV3 {
  auditor: string;
  reportDate: string;
  reportArtifact: string;
  repository: "public_kvault" | "private_kvault_private" | "unknown";
  commitOrReleaseReference: string | null;
  /** How that reference was established. Filenames are weak evidence and are labelled as such. */
  referenceBasis: string;
  scope: string;
  managedAllocationCoverage: "covered" | "not_covered" | "unknown";
  authorityAdminCoverage: "covered" | "not_covered" | "unknown";
  standardWithdrawalCoverage: "covered" | "not_covered" | "unknown";
  reserveInteractionCoverage: "covered" | "not_covered" | "unknown";
  findings: string;
  remediationEvidence: string;
  relationshipToDeployedSource: string;
}

/**
 * Baselines and deltas, from Kamino's OFFICIAL public audits repository (Kamino-Finance/audits),
 * whose vault artifacts are: kamino_vault_osec.pdf, kamino_vault_sec3.pdf,
 * kamino_vault_offside_labs.pdf, kamino_vault_certora.pdf, kamino_vault_ackee-blockchain.pdf,
 * kamino_vault_ottersec_2.1.0.pdf, kamino_vault_certora_2.1.0.pdf,
 * kamino_vault_osec_vault_rewards.pdf, kamino_vault_certora_vault_rewards.pdf,
 * kamino_vault_certora_vault_rewards-2.1.1.pdf.
 *
 * ON THE VERSION-TAGGED FILENAMES. Several artifacts carry a release in the filename (2.1.0, 2.1.1).
 * That is published by Kamino in their official repo, so it is a primary artefact — but it is a
 * FILENAME, not a statement inside the report, and §1 of this step forbids using filenames to
 * establish release identity. It is therefore used ONLY as a corroborating signal for which release a
 * report targeted, never to establish the deployed release (which came from git ancestry). Where it
 * matters, the filename signal is independently corroborated by a direct source comparison — e.g. the
 * audited redeem_in_kind body is byte-identical to release/v2.1.0, which is consistent with a report
 * named for 2.1.0.
 */
export const AUDIT_INVENTORY: AuditRecordV3[] = [
  {
    auditor: "OtterSec",
    reportDate: "2024-12-09",
    reportArtifact: "kamino_vault_osec.pdf (Kamino-Finance/audits)",
    repository: "unknown",
    commitOrReleaseReference: "8a4b1fe (short hash appearing in the report; NOT present in the public repo)",
    referenceBasis: "CORRECTED 16H-M.3 by parsing the report itself. Kamino's inventory PAGE states no commit, but the REPORT does reference a short commit-like hash and the Kamino-Finance/klend- repository namespace. `git cat-file` confirms 8a4b1fe is NOT in the public Kamino-Finance/kvault repo — it is a private-repo commit.",
    scope: "Kamino Earn Vaults — baseline review. Findings include OS-KVL-ADV-00 (sequence misalignment in allocations array) and OS-KVL-ADV-01 (improper enforcement of allocation cap).",
    managedAllocationCoverage: "unknown",
    authorityAdminCoverage: "unknown",
    standardWithdrawalCoverage: "unknown",
    reserveInteractionCoverage: "unknown",
    findings: "Not publicly enumerated in a commit-linked form.",
    remediationEvidence: "None tied to a commit.",
    relationshipToDeployedSource: "Predates the deployed release by ~19 months and predates the first public tag (release/v1.0.0, 2025-05-25) entirely. It may have reviewed the now-closed kvauTFR8… program. Cannot be shown to cover 1d146d70…",
  },
  {
    auditor: "Sec3",
    reportDate: "2025-02-06",
    reportArtifact: "kamino_vault_sec3.pdf (Kamino-Finance/audits)",
    repository: "unknown",
    commitOrReleaseReference: "8273031ea75e3972cce5314cefe3e88f962927c5 (full hash stated IN the report; NOT present in the public repo)",
    referenceBasis: "CORRECTED 16H-M.3 by parsing the report. It states a FULL 40-character commit hash — the inventory page does not surface it. `git cat-file` confirms the commit is NOT in the public Kamino-Finance/kvault repo, so it is a private-repo commit and still cannot be mapped to release/v2.2.2.",
    scope: "KAMINO LENDING VAULT. Findings include I-01 (inaccuracy in management fee calculation, Acknowledged) and Q-01/Q-02 (token allocation and performance-fee questions, Acknowledged).",
    managedAllocationCoverage: "covered",
    authorityAdminCoverage: "unknown",
    standardWithdrawalCoverage: "unknown",
    reserveInteractionCoverage: "unknown",
    findings: "I-01 management-fee inaccuracy (Info, Acknowledged); Q-01 token allocation/usable token discrepancy; Q-02 performance fee. Several ACKNOWLEDGED rather than fixed.",
    remediationEvidence: "Acknowledged-not-fixed status is itself notable; no remediation is tied to a public commit.",
    relationshipToDeployedSource: "States an exact commit, but a PRIVATE one absent from the public repo. Cannot be shown to cover 1d146d70…",
  },
  {
    auditor: "Offside Labs",
    reportDate: "2025-04-12",
    reportArtifact: "kamino_vault_offside_labs.pdf (Kamino-Finance/audits)",
    repository: "unknown",
    commitOrReleaseReference: "branch master + 4 commit hashes: 0791b3398f7c…, 586ec4ebc991…, 2c9c01a6935d…, d23536ce7da7… (all stated IN the report; NONE present in the public repo)",
    referenceBasis: "CORRECTED 16H-M.3 by parsing the report. It is the MOST precise of the baselines: 'The audit is based on the following specific branches and commit hashes… Kamino Vault, Branch: master, CommitHash: 1…4'. But `git cat-file` confirms none of the four exists in the public Kamino-Finance/kvault repo — the audited `master` is the PRIVATE repo's master, not the public one.",
    scope: "The smart contracts of the kamino_vault program for the Kamino Vault project, at four named commits on the private master branch.",
    managedAllocationCoverage: "covered",
    authorityAdminCoverage: "unknown",
    standardWithdrawalCoverage: "covered",
    reserveInteractionCoverage: "unknown",
    findings: "Not enumerated in this amendment.",
    remediationEvidence: "Multiple commits suggest re-review across fixes, but none is publicly mappable.",
    relationshipToDeployedSource: "States branch AND four exact commits — rigorous practice — but all are private-repo commits. Cannot be shown to cover 1d146d70…",
  },
  {
    auditor: "Certora",
    reportDate: "2025-06 (approx)",
    reportArtifact: "kamino_vault_certora.pdf (Kamino-Finance/audits)",
    repository: "unknown",
    commitOrReleaseReference: null,
    referenceBasis: "No commit/release in the filename or the public inventory.",
    scope: "Formal verification of vault properties",
    managedAllocationCoverage: "unknown",
    authorityAdminCoverage: "unknown",
    standardWithdrawalCoverage: "unknown",
    reserveInteractionCoverage: "unknown",
    findings: "Formal properties; not publicly enumerated per-commit.",
    remediationEvidence: "None tied to a commit.",
    relationshipToDeployedSource: "Formal properties may survive refactors better than line-level review, but which properties were proven against which code is not public. Cannot be shown to cover 1d146d70… Note: formally verified properties, if any hold for the deployed code, would be the strongest available evidence — but that cannot be asserted without the report contents.",
  },
  {
    auditor: "Ackee Blockchain",
    reportDate: "unknown",
    reportArtifact: "kamino_vault_ackee-blockchain.pdf (Kamino-Finance/audits)",
    repository: "unknown",
    commitOrReleaseReference: null,
    referenceBasis: "No commit/release in the filename or the public inventory.",
    scope: "Fuzzing",
    managedAllocationCoverage: "unknown",
    authorityAdminCoverage: "unknown",
    standardWithdrawalCoverage: "unknown",
    reserveInteractionCoverage: "unknown",
    findings: "Not publicly enumerated per-commit.",
    remediationEvidence: "None tied to a commit.",
    relationshipToDeployedSource: "Unresolved. Fuzzing coverage of the deployed release is not established.",
  },
  {
    auditor: "OtterSec",
    reportDate: "2026-03-19",
    reportArtifact: "kamino_vault_ottersec_2.1.0.pdf (Kamino-Finance/audits)",
    repository: "private_kvault_private",
    commitOrReleaseReference: "release 2.1.0 (per official artifact filename); private PR #59",
    referenceBasis: "Filename in Kamino's official audits repo names release 2.1.0. CORROBORATED independently: release/v2.1.0 is tagged 2026-03-31, twelve days after the report date, and the deployed redeem_in_kind body is byte-identical to release/v2.1.0. The filename alone was NOT treated as sufficient.",
    scope: "Redeem-in-kind feature",
    managedAllocationCoverage: "not_covered",
    authorityAdminCoverage: "not_covered",
    standardWithdrawalCoverage: "not_covered",
    reserveInteractionCoverage: "unknown",
    findings: "Informational: two-stage withdrawal-penalty calculation.",
    remediationEvidence: "The deployed two-stage penalty model is VERIFIED PRESENT by direct inspection (see rik_two_stage_penalty), independently of any private mapping.",
    relationshipToDeployedSource: "STRONG. vault_operations::redeem_in_kind and both penalty helpers are byte-identical between release/v2.1.0 and the deployed release/v2.2.2. The audited logic is literally the running logic. Gap: handler_redeem_in_kind.rs changed after 2.1.0 (AUM computation refactor).",
  },
  {
    auditor: "Certora",
    reportDate: "2026-02",
    reportArtifact: "kamino_vault_certora_2.1.0.pdf (Kamino-Finance/audits)",
    repository: "private_kvault_private",
    commitOrReleaseReference: "release 2.1.0 (per official artifact filename); private PR #59 / commit 5f8c2…, PR #113 / commit 4b66b…",
    referenceBasis: "Filename names release 2.1.0; corroborated by the byte-identical redeem_in_kind body between 2.1.0 and the deployed 2.2.2. Private PR/commit references are NOT publicly mapped.",
    scope: "Redeem-in-kind feature",
    managedAllocationCoverage: "not_covered",
    authorityAdminCoverage: "not_covered",
    standardWithdrawalCoverage: "not_covered",
    reserveInteractionCoverage: "unknown",
    findings: "Missing minimum-withdrawal validation; missing cToken-vault mint validation; unnecessary intermediate penalty rounding. All marked fixed and fix-confirmed.",
    remediationEvidence: "ALL THREE VERIFIED PRESENT in the deployed source by direct inspection — see rik_min_withdraw, rik_ctoken_mint_validation, rik_two_stage_penalty. The 'fixed and fix-confirmed' claim is corroborated by the deployed code itself rather than taken on trust.",
    relationshipToDeployedSource: "STRONG, as above: the audited operation body is byte-identical to the deployed one.",
  },
  {
    auditor: "OtterSec",
    reportDate: "2026-03-19",
    reportArtifact: "kamino_vault_osec_vault_rewards.pdf (Kamino-Finance/audits)",
    repository: "private_kvault_private",
    commitOrReleaseReference: "private PR #78",
    referenceBasis: "Filename names the vault-rewards feature but no release. The companion Certora rewards artifact names 2.1.1; release/v2.1.1's commit subject is 'release 2.1.1: autocompounding rewards'.",
    scope: "Vault rewards feature",
    managedAllocationCoverage: "not_covered",
    authorityAdminCoverage: "not_covered",
    standardWithdrawalCoverage: "not_covered",
    reserveInteractionCoverage: "not_covered",
    findings: "Pending-reward overflow / DoS risk; stale reward-accounting baselines; unnecessary mutable payer. Recorded as resolved.",
    remediationEvidence: "Overflow/DoS protection and refresh ordering VERIFIED PRESENT by direct inspection (rw_pending_reward_safety, rw_refresh_ordering). 'Unnecessary mutable payer' is an account-declaration hygiene item not separately verified here — it is not a user-fund property, and it is recorded as such rather than silently counted as verified.",
    relationshipToDeployedSource: "STRONG for the reward functions: refresh_rewards and topup_rewards are byte-identical between release/v2.1.1 and the deployed release/v2.2.2.",
  },
  {
    auditor: "Certora",
    reportDate: "2026-03",
    reportArtifact: "kamino_vault_certora_vault_rewards-2.1.1.pdf / kamino_vault_certora_vault_rewards.pdf (Kamino-Finance/audits)",
    repository: "private_kvault_private",
    commitOrReleaseReference: "release 2.1.1 (per official artifact filename); private commit dabe9a26f8e2c1b77e596f292be62b0a3a1cfd94",
    referenceBasis: "Filename names release 2.1.1. CORROBORATED: refresh_rewards and topup_rewards are byte-identical between release/v2.1.1 and the deployed release/v2.2.2, so whatever was audited at 2.1.1 is what runs today.",
    scope: "Vault rewards feature",
    managedAllocationCoverage: "not_covered",
    authorityAdminCoverage: "not_covered",
    standardWithdrawalCoverage: "not_covered",
    reserveInteractionCoverage: "not_covered",
    findings: "Stale last_issuance_ts after reward exhaustion; duplicate reward refresh. Both marked fixed and fix-confirmed.",
    remediationEvidence: "BOTH VERIFIED PRESENT by direct inspection — see rw_exhaustion_timestamp, rw_duplicate_refresh.",
    relationshipToDeployedSource: "STRONG: byte-identical reward functions between the audited release and the deployed release.",
  },
];

/* ------------------------------------------------------------------ *
 * 6. Audit-coverage matrix
 * ------------------------------------------------------------------ */

export type CoverageEvidenceKind =
  | "verified_deployed_remediation"
  | "baseline_audit_evidence_with_unverified_commit_mapping"
  | "feature_delta_audit_evidence_with_direct_code_verification"
  | "formal_property_or_fuzzing_evidence"
  | "partial_coverage"
  | "publicly_uncovered"
  | "not_applicable";

export interface CoverageArea {
  area: string;
  /** Multiple evidence records per area — coverage is rarely one thing. */
  evidence: { kind: CoverageEvidenceKind; detail: string }[];
}

/**
 * Deployed functionality → available audit evidence.
 *
 * The rule this matrix exists to enforce: a baseline audit does NOT cover later changed code merely
 * because it covers the same file. Where a v2.2.2 change touched an area, the area gets an explicit
 * `publicly_uncovered` record ALONGSIDE any baseline record — never instead of one.
 */
export const AUDIT_COVERAGE_MATRIX: CoverageArea[] = [
  { area: "vault_initialization", evidence: [
    { kind: "baseline_audit_evidence_with_unverified_commit_mapping", detail: "Covered in principle by the 2024-2025 baselines; no commit mapping to 1d146d70…" },
    { kind: "publicly_uncovered", detail: "handler_init_vault.rs changed in v2.2.2 (1 line) after every public audit." },
  ] },
  { area: "deposits", evidence: [
    { kind: "baseline_audit_evidence_with_unverified_commit_mapping", detail: "Baselines cover deposit conceptually; no commit mapping." },
    { kind: "publicly_uncovered", detail: "NEW in v2.2.2: deposit_with_min_shares_out and buy_with_min_shares_out instructions, plus 20 changed lines in handler_deposit.rs. No public audit covers them." },
  ] },
  { area: "standard_withdrawals", evidence: [
    { kind: "baseline_audit_evidence_with_unverified_commit_mapping", detail: "Baselines cover withdraw conceptually; no commit mapping." },
    { kind: "publicly_uncovered", detail: "vault_operations::withdraw is within the 411 changed lines of v2.2.2 and is not covered by the 2026 feature audits (which scope redeem-in-kind and rewards only)." },
  ] },
  { area: "redeem_in_kind", evidence: [
    { kind: "feature_delta_audit_evidence_with_direct_code_verification", detail: "OtterSec (2026-03-19) + Certora (2026-02) audited the feature at release 2.1.0. The deployed vault_operations::redeem_in_kind body is BYTE-IDENTICAL to release/v2.1.0 — the audited logic is the running logic." },
    { kind: "verified_deployed_remediation", detail: "All three Certora findings verified present in the deployed source: minimum-withdrawal validation, cToken-vault mint validation, two-stage penalty with corrected precision." },
    { kind: "publicly_uncovered", detail: "handler_redeem_in_kind.rs changed after the 2.1.0 audit (AUM computation swapped to HoldingsBuffer::compute_once). Small, but a real uncovered delta in an otherwise well-covered feature." },
  ] },
  { area: "withdrawal_penalties", evidence: [
    { kind: "verified_deployed_remediation", detail: "Two-stage inclusive/exclusive model verified present by formula analysis; both helpers byte-identical to release/v2.1.0. Vault-level penalty params currently read 0/0 on-chain (16H-L.1)." },
    { kind: "feature_delta_audit_evidence_with_direct_code_verification", detail: "OtterSec informational finding on the two-stage calculation; the deployed model matches." },
  ] },
  { area: "managed_reserve_allocation", evidence: [
    { kind: "baseline_audit_evidence_with_unverified_commit_mapping", detail: "Baselines may cover allocation; no commit mapping and no enumerated scope." },
    { kind: "publicly_uncovered", detail: "MATERIAL: handler_update_reserve_allocation.rs changed (46 lines) AND a new update_reserve_allocation_v2 instruction was added in v2.2.2, plus a new CtokenCap state concept. No public audit covers any of it." },
  ] },
  { area: "allocation_admin_operations", evidence: [
    { kind: "publicly_uncovered", detail: "The allocation-admin surface changed in v2.2.2 and is uncovered. Compounds 16H-L.1: the weakest authority (a single unlocked key) operates the least-covered changed surface." },
  ] },
  { area: "vault_admin_operations", evidence: [
    { kind: "baseline_audit_evidence_with_unverified_commit_mapping", detail: "No enumerated authority coverage in any public report." },
    { kind: "publicly_uncovered", detail: "handler_update_vault_config.rs changed (6 lines) in v2.2.2." },
  ] },
  { area: "reserve_interactions", evidence: [
    { kind: "publicly_uncovered", detail: "MOST CONSEQUENTIAL UNCOVERED ITEM: klend_operations.rs changed 214 lines in v2.2.2. This is the CPI layer that actually moves user liquidity between the vault and KLend reserves. No public audit covers this release of it." },
  ] },
  { area: "fees", evidence: [
    { kind: "baseline_audit_evidence_with_unverified_commit_mapping", detail: "Fee logic (mgmt 0 bps / perf 500 bps) is long-standing; no commit-mapped coverage." },
    { kind: "publicly_uncovered", detail: "withdraw_pending_fees / give_up_pending_fee are within the changed vault_operations surface." },
  ] },
  { area: "rewards", evidence: [
    { kind: "feature_delta_audit_evidence_with_direct_code_verification", detail: "OtterSec + Certora audited rewards at release 2.1.1. refresh_rewards and topup_rewards are BYTE-IDENTICAL between release/v2.1.1 and the deployed release/v2.2.2." },
    { kind: "verified_deployed_remediation", detail: "All four checked remediations verified present: saturating pending-reward arithmetic, exhaustion-timestamp reset in topup_rewards, refresh ordering across all reward-relevant paths, duplicate-refresh removal in invest." },
    { kind: "partial_coverage", detail: "'Unnecessary mutable payer' (OtterSec) was not separately verified — an account-declaration hygiene item, not a user-fund property. Rewards are also DORMANT on this vault (reward_per_second = 0, never issued), which reduces current exposure but does not remove the code." },
  ] },
  { area: "emergency_or_recovery_paths", evidence: [
    { kind: "not_applicable", detail: "The deployed binary contains NO pause, halt or emergency instruction (verified in 16H-L.1 and re-confirmed against the instruction surface of 1d146d70…). There is no such path to audit at the vault layer. Note this is NOT reassurance: 16H-L.1 recorded that each underlying MARKET has an emergency_council able to run socialize_loss onto this vault's position — that exposure lives at the KLend layer and is out of scope for kvault audits." },
  ] },
  { area: "accounting_and_rounding", evidence: [
    { kind: "verified_deployed_remediation", detail: "Fraction-based fixed-point maths verified end-to-end on the redeem-in-kind penalty path; no unnecessary intermediate rounding (Certora finding)." },
    { kind: "formal_property_or_fuzzing_evidence", detail: "Certora formal verification (kamino_vault_certora.pdf) and Ackee fuzzing (kamino_vault_ackee-blockchain.pdf) exist in the official repo, but neither states which properties were proven against which commit. Recorded as existing, NOT as covering the deployed release." },
    { kind: "publicly_uncovered", detail: "AUM/holdings computation changed in v2.2.2 (HoldingsBuffer::compute_once) and is uncovered." },
  ] },
  { area: "ctoken_validation", evidence: [
    { kind: "verified_deployed_remediation", detail: "Full constraint chain verified in the deployed RedeemInKind accounts struct: ctoken_vault PDA seeded by (vault_state, reserve) + token::mint = ctoken_mint + ctoken_mint pinned by address = reserve.collateral.mint_pubkey." },
    { kind: "publicly_uncovered", detail: "The new CtokenCap concept (state/ctoken_cap.rs, new in v2.2.2) is a distinct cToken-related surface with no audit coverage." },
  ] },
];

/* ------------------------------------------------------------------ *
 * 7. The three separate questions + final classification
 * ------------------------------------------------------------------ */

export type AuditClassification =
  | "exact_full_deployment_audit_coverage"
  | "deployed_feature_remediations_verified_with_partial_coverage"
  | "baseline_and_delta_coverage_with_unmapped_private_commits"
  | "material_uncovered_runtime_surface"
  | "insufficient_audit_evidence";

/**
 * The three questions, answered separately and never merged.
 *
 * Note how different the answers are. A single boolean would have to pick one and discard the rest,
 * and whichever it picked would be misleading: "the fixes are in" hides the uncovered CPI layer;
 * "not fully audited" hides that every documented fix is verifiably present in the running program.
 */
export const THREE_QUESTIONS = {
  A_didAuditExamineTheFeature: {
    answer: "yes_for_redeem_in_kind_and_rewards_only",
    detail: "Four 2026 feature audits cover redeem-in-kind (release 2.1.0) and vault rewards (release 2.1.1). Baselines (2024-2025) have no stated scope or commit. No audit examines the v2.2.2 deltas.",
  },
  B_areDocumentedFixesInDeployedCode: {
    answer: "yes_all_seven_verified",
    detail: "All 7 checked remediations are verified_present_in_deployed_source by direct inspection of commit 1d146d70…, without needing the private mapping. Corroborated structurally: the audited redeem_in_kind and reward function bodies are byte-identical to their audited releases.",
  },
  C_isWholeDeployedCodebaseAudited: {
    answer: "no",
    detail: "Material runtime surface in the deployed release is publicly uncovered: klend_operations.rs (214 lines, the CPI layer moving user funds), three new instructions, the CtokenCap concept, the allocation-admin surface, and the reserve whitelist. Enumerated and bounded in PUBLICLY_UNCOVERED_SURFACE — but uncovered.",
  },
  neverCollapse: "A yes to A and B says nothing about C. These are three facts, not one boolean.",
} as const;

/** Bounded — every item is a named file or instruction, which is what lets readiness proceed. */
export const PUBLICLY_UNCOVERED_SURFACE = {
  bounded: true,
  boundedBy: "Enumeration of the rename-aware diff release/v2.2.1 → release/v2.2.2, restricted to on-chain runtime code.",
  items: [
    "programs/kvault/src/operations/klend_operations.rs — 214 changed lines in the CPI layer that moves user liquidity (highest consequence)",
    "programs/kvault/src/lib.rs — three NEW instructions: update_reserve_allocation_v2, deposit_with_min_shares_out, buy_with_min_shares_out",
    "programs/kvault/src/state/ctoken_cap.rs — NEW state concept",
    "programs/kvault/src/handlers/handler_update_reserve_allocation.rs — 46 changed lines (allocation-admin surface)",
    "programs/kvault/src/operations/reserve_whitelist_operations.rs — 15 changed lines (the mitigation relied on for manager discretion)",
    "programs/kvault/src/operations/vault_operations.rs — changed functions OTHER than redeem_in_kind and the reward functions (deposit, withdraw, invest, allocation)",
    "programs/kvault/src/handlers/handler_invest.rs — 49 changed lines beyond the verified refresh ordering",
    "programs/kvault/src/handlers/handler_deposit.rs — 20 changed lines",
    "programs/kvault/src/handlers/handler_redeem_in_kind.rs — AUM computation refactor postdating the 2.1.0 audit",
    "programs/kvault/src/utils/cpi_mem.rs — 18 changed lines",
  ],
  excludedFromScopeAndWhy: [
    "state.rs → state/*.rs module split — git -M resolves it as a rename; moved code is not changed code and must not inflate uncovered scope.",
    "libs/kvault-interface/**, Cargo.lock, tests, examples — not on-chain runtime. The on-chain instructions they call ARE counted above.",
  ],
} as const;

export const FINAL_AUDIT_CLASSIFICATION = {
  classification: "deployed_feature_remediations_verified_with_partial_coverage" as AuditClassification,
  supersedes: "unverified_linkage (16H-L / 16H-L.1)",
  whySupersedesUnverifiedLinkage:
    "`unverified_linkage` was correct while the only question was 'can we relate an audit to the deployed bytecode?'. It is now too coarse and understates the evidence. The deployed binary is hash-verified to an exact public commit; the audited redeem_in_kind and reward bodies are byte-identical to the releases their reports name; and all 7 documented remediations are verified present in the running code. The linkage that remains unverified is the PRIVATE-to-public commit mapping — which is not needed for the code properties we can read directly.",
  whyNotFullCoverage:
    "Because C is a firm no. Material runtime surface in v2.2.2 — most importantly the 214-line KLend CPI layer that moves user funds — carries no public audit coverage. Claiming full coverage on the strength of verified feature remediations would be exactly the collapse this module exists to prevent.",
  whyNotMaterialUncoveredRuntimeSurface:
    "That classification would imply the uncovered surface dominates the picture. It does not: the uncovered surface is bounded and enumerated, the two audited features are byte-identical to their audited releases, and every documented fix is verified in the deployed code. 'Partial coverage' states both halves honestly.",
  evidenceCutoffAt: L2_EVIDENCE_CUTOFF_AT,
} as const;

/* ------------------------------------------------------------------ *
 * 8. Evidence completeness for human scoring
 * ------------------------------------------------------------------ */

export interface EvidenceCompletenessInputs {
  auditScopesDocumented: boolean;
  findingsAndRemediationStatesDocumented: boolean;
  deployedInclusionOfFixesVerifiedWherePossible: boolean;
  uncoveredSurfaceExplicitlyIdentified: boolean;
  uncertaintyBounded: boolean;
  noUnsupportedFullCoverageClaim: boolean;
  /** Blockers — any true forces `blocked`. */
  materialRuntimeChangesUnidentifiable: boolean;
  auditedFixesUncheckable: boolean;
  auditScopeUnknown: boolean;
  evidenceContradictsItself: boolean;
  uncoveredSurfaceUnbounded: boolean;
}

export type EvidenceCompleteness = "complete_for_human_scoring" | "blocked";

/**
 * The distinction that carries this step: EVIDENCE COMPLETE ≠ FAVOURABLE SCORE ≠ RISK APPROVAL ≠
 * PRODUCT APPROVAL.
 *
 * A reviewer can score `audit_security` once they know what was audited, what was fixed, what is
 * verifiably in the running code, and what is not covered. They do not need the answer to be good.
 * Here the answer is distinctly mixed — every documented fix verified, a 214-line CPI layer uncovered
 * — and that is a scoreable input, not a reason to withhold the evidence.
 *
 * `auditScopeUnknown` is deliberately about the DELTA audits, not the baselines. The baselines'
 * scopes ARE unknown, and that is recorded as a limitation — but treating unknown baseline scope as a
 * blocker would make this dimension permanently unscoreable for any protocol whose old reports lack
 * commit references, which is most of them. The evidence that matters for the deployed binary is
 * present and bounded.
 */
export function evaluateAuditEvidenceCompleteness(i: EvidenceCompletenessInputs): { result: EvidenceCompleteness; reason: string } {
  if (i.materialRuntimeChangesUnidentifiable) return { result: "blocked", reason: "Material runtime changes could not be identified, so the uncovered surface cannot be bounded." };
  if (i.auditedFixesUncheckable) return { result: "blocked", reason: "The documented audited fixes could not be checked against the deployed code." };
  if (i.auditScopeUnknown) return { result: "blocked", reason: "The scope of the audits bearing on the deployed release is unknown." };
  if (i.evidenceContradictsItself) return { result: "blocked", reason: "The audit evidence contradicts itself." };
  if (i.uncoveredSurfaceUnbounded) return { result: "blocked", reason: "The uncovered code surface cannot be bounded." };
  const complete = i.auditScopesDocumented && i.findingsAndRemediationStatesDocumented && i.deployedInclusionOfFixesVerifiedWherePossible && i.uncoveredSurfaceExplicitlyIdentified && i.uncertaintyBounded && i.noUnsupportedFullCoverageClaim;
  if (!complete) return { result: "blocked", reason: "One or more completeness criteria are unmet." };
  return { result: "complete_for_human_scoring", reason: "Audit scopes, findings and remediation states are documented; deployed inclusion of every documented fix is directly verified against the hash-verified binary; the uncovered runtime surface is explicitly enumerated and bounded; and no unsupported claim of full coverage is made. The evidence is sufficient for a human to score audit_security — it is NOT a favourable result, NOT a risk approval, and NOT a product approval." };
}

export const STEAKHOUSE_AUDIT_EVIDENCE_INPUTS: EvidenceCompletenessInputs = {
  auditScopesDocumented: true,
  findingsAndRemediationStatesDocumented: true,
  deployedInclusionOfFixesVerifiedWherePossible: true,
  uncoveredSurfaceExplicitlyIdentified: true,
  uncertaintyBounded: true,
  noUnsupportedFullCoverageClaim: true,
  materialRuntimeChangesUnidentifiable: false,
  auditedFixesUncheckable: false,
  auditScopeUnknown: false,
  evidenceContradictsItself: false,
  uncoveredSurfaceUnbounded: false,
};

export function getSteakhouseAuditEvidenceCompleteness() {
  return evaluateAuditEvidenceCompleteness(STEAKHOUSE_AUDIT_EVIDENCE_INPUTS);
}

/** Explicit, exported, and fixture-asserted: completeness confers nothing. */
export const AUDIT_EVIDENCE_COMPLETENESS_CONFERS = {
  favourableScore: false,
  anyScore: false,
  riskApproval: false,
  productApproval: false,
  note: "Evidence completeness means a human CAN score the dimension. It does not score it, does not bias it, and does not approve anything.",
} as const;

/** Rubric dimensions this step bears on. Evidence only — no scores. */
export const L2_RUBRIC_DIMENSIONS: RiskRubricV1DimensionId[] = ["audit_security"];

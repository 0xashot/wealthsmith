/**
 * steakhouseCapacityReconciliation — Step 16H-O.1. Reconciles a contradiction INSIDE the Steakhouse
 * evidence manifest. No capacity investigation was redone: the existing evidence was already
 * conclusive, and one half of the manifest already believed it.
 *
 * THE CONTRADICTION
 * -----------------
 * The same manifest said two incompatible things:
 *
 *   SAID UNRESOLVED (stale, 16H-G/16H-I era):
 *     • capacityAdapterState: "blocked"
 *     • capacityFieldOrFormula: "UNRESOLVED: ... it stays `unknown`."
 *     • a blocker string: "16H-I did NOT resolve capacity ... This is now the PRIMARY blocker."
 *
 *   SAID RESOLVED (16H-J.1 onward):
 *     • a code comment: "16H-J.1 resolved capacity from the official kvault source, so
 *       `blocked_capacity` no longer applies."
 *     • primaryBlocker: "blocked_risk_review" — which only makes sense if capacity is resolved
 *     • a blocker string: "capacity is verified_uncapped (16H-J.1)"
 *
 * 16H-J.1 proved the semantics in kaminoVaultCapacitySemantics.ts but never wrote the conclusion back
 * into the two STRUCTURED fields. Prose and primaryBlocker moved on; the machine-readable fields did
 * not. Anything reading the fields would have seen a resolved product as blocked.
 *
 * WHY THE RESOLVED SIDE IS CANONICAL
 * ----------------------------------
 * Not because it is newer — because it rests on the program's own code while the stale side rests on
 * an absence of documentation that 16H-J.1 subsequently supplied. 16H-I's refusal to guess was CORRECT
 * when written; it was superseded by proof, not by opinion.
 *
 * WHAT THIS IS NOT
 * ----------------
 * Uncapped is NOT deposit availability, and NOT unlimited downstream capacity. See the two boundary
 * records below. No risk was reassessed: the aggregate remains 5.37 and meetsMinimum remains false.
 */
import { KVAULT_CAPACITY_SOURCE, KVAULT_MAINNET_PROGRAM_ID, resolveKvaultDepositCapacity } from "./kaminoVaultCapacitySemantics";

export const RECONCILIATION_VERSION = "1.0.0" as const;
export const RECONCILIATION_ID = "steakhouse_capacity_reconciliation_v1" as const;

export const RECONCILED_PRODUCT = {
  candidateId: "kamino_steakhouse_usdc",
  vault: "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E",
  shareMint: "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS",
  kvaultProgram: KVAULT_MAINNET_PROGRAM_ID,
} as const;

/** The exact fields that disagreed, recorded verbatim so the defect is auditable. */
export const CONTRADICTORY_FIELDS = {
  saidUnresolved: [
    { field: "capacityAdapterState", value: "blocked", era: "16H-G/16H-I" },
    { field: "capacityFieldOrFormula", value: "UNRESOLVED: ... Guessing either way would invent capacity, so it stays `unknown`.", era: "16H-G/16H-I" },
    { field: "blockers[]", value: "16H-I did NOT resolve capacity ... This is now the PRIMARY blocker.", era: "16H-I" },
  ],
  saidResolved: [
    { field: "code comment", value: "16H-J.1 resolved capacity from the official kvault source, so `blocked_capacity` no longer applies.", era: "16H-J.1" },
    { field: "primaryBlocker", value: "blocked_risk_review — only coherent if capacity is resolved", era: "16H-J.1" },
    { field: "blockers[]", value: "capacity is verified_uncapped (16H-J.1)", era: "16H-J.1" },
  ],
  rootCause: "16H-J.1 proved the semantics in a separate module and updated prose + primaryBlocker, but never wrote the conclusion into the two structured fields. Machine-readable state and prose drifted apart.",
} as const;

export const CANONICAL_SOURCE = {
  module: "src/suggestions/kaminoVaultCapacitySemantics.ts",
  evidenceStep: "16H-J.1",
  repo: KVAULT_CAPACITY_SOURCE.repo,
  release: KVAULT_CAPACITY_SOURCE.release,
  commit: KVAULT_CAPACITY_SOURCE.commit,
  file: KVAULT_CAPACITY_SOURCE.file,
  symbol: KVAULT_CAPACITY_SOURCE.symbol,
  sourceField: "VaultState.deposit_cap",
  semantics: "deposit_cap == 0 is EXPLICITLY mapped to u64::MAX — an uncapped BRANCH in the deposit path, not an absent field. `0` is the legacy encoding; init_vault now writes u64::MAX.",
  whyCanonical:
    "It rests on the program's own code. The stale side rested on an ABSENCE of documentation, which 16H-J.1 then supplied. 16H-I's refusal to guess was correct when written and was superseded by proof, not by opinion.",
  invalidationConditions: [
    "the kvault program is upgraded and get_max_depositable_in_vault changes",
    "the vault's owning program is no longer the reviewed kvault mainnet program",
    "deposit_cap becomes a non-zero, non-u64::MAX value (then a genuine cap exists and AUM is required)",
  ],
} as const;

/** Re-verified live rather than assumed still true. */
export const CURRENT_VAULT_VERIFICATION = {
  observedAt: "2026-07-17T10:41:00.000Z",
  sourceSlot: 433466880,
  vaultAccountOwnerProgram: KVAULT_MAINNET_PROGRAM_ID,
  ownerMatchesReviewedProgram: true,
  depositCapRaw: "0",
  conclusionStillValidForDeployedVault: true,
  conclusion: "verified_uncapped",
  note: "The reviewed conclusion binds to a program + field value. Both were re-read; neither changed. No re-investigation was needed.",
} as const;

/** Fields that look cap-shaped but do NOT gate deposits. Enumerated so they are not conflated later. */
export const NOT_A_DEPOSIT_GATE = {
  unallocatedTokensCap: {
    observedValue: "0",
    gatesDeposits: false,
    reason: "get_max_depositable_in_vault reads deposit_cap ONLY. unallocatedTokensCap is never consulted on the deposit path.",
  },
  allowAllocationsInWhitelistedReservesOnly: {
    observedValue: "1",
    gatesDeposits: false,
    reason: "Constrains where the vault may ALLOCATE, not whether it may accept a deposit.",
  },
} as const;

/**
 * The distinction the task insists on, and the one most likely to be lost later.
 *
 * "No KVault-level cap" is NOT "unlimited downstream availability". The vault allocates into KLend
 * reserves that carry their own finite caps — the SOL/BTC USDC reserve is capped at 1,000,000,000 USDC
 * (16H-N.4) — and the SDK bounds allocation by reserve cap separately (vault.js:2689-2696). A vault
 * with no deposit cap can accept deposits it cannot immediately allocate.
 */
export const CAPACITY_SCOPE_BOUNDARY = {
  whatIsUncapped: "the KVAULT-level deposit cap for this exact vault",
  whatIsNotEstablished: [
    "downstream KLend reserve capacity (finite and separately verified — e.g. 1,000,000,000 USDC on the SOL/BTC USDC reserve)",
    "deposit availability (the VaultState exposes NO pause/enabled field; a successful read is not proof deposits are enabled)",
    "withdrawal liquidity (a separate question with separate evidence)",
  ],
  noKvaultCapIsNotUnlimitedDownstream: true,
  uncappedImpliesDepositAvailability: false,
  kvaultProofDoesNotTransferToKlend:
    "kvault maps deposit_cap == 0 to u64::MAX (uncapped). KLend has NO such branch — 0 is a literal ZERO cap there (16H-N.4). Importing this rule into a KLend reserve would read a closed reserve as unlimited.",
} as const;

/** Re-run the canonical resolver against the live reading — the conclusion is derived, not asserted. */
export const RECONCILED_CAPACITY_RESOLUTION = resolveKvaultDepositCapacity({
  programId: KVAULT_MAINNET_PROGRAM_ID,
  productType: "managed_vault",
  depositCapRaw: CURRENT_VAULT_VERIFICATION.depositCapRaw,
});

export const RECONCILIATION_RESULT = {
  priorCapacityAdapterState: "blocked",
  resultingCapacityAdapterState: "adapter_implemented_source_verified",
  priorCapacityFieldOrFormula: "UNRESOLVED: ... Guessing either way would invent capacity, so it stays `unknown`.",
  resultingCapacityFieldOrFormulaSummary: "RESOLVED at 16H-J.1, reconciled at 16H-O.1 — deposit_cap = 0 → u64::MAX → verified_uncapped at the KVAULT level, re-verified live at slot 433466880.",
  priorPrimaryBlocker: "blocked_risk_review",
  resultingPrimaryBlocker: "blocked_deposit_availability",
  primaryBlockerRationale:
    "primaryBlocker names the NEAREST unresolved prerequisite, not the largest gap. Under the 16H-N.5a order (capacity → position_detection → deposit_availability → constraints → risk_review), depositAvailabilityState = 'blocked' ranks nearer than riskReviewState = 'blocked'. The old note called risk review 'the dominant remaining blocker' — true as the biggest gap, but not the nearest. Before 16H-N.5a there was no blocked_deposit_availability value, so risk review was the only expressible option; that constraint is gone.",
  historyRewritten: false,
  historyHandling: "The 16H-I statement is retained VERBATIM with a supersession note appended. It was accurate when written — 16H-I correctly refused to guess. Editing it would falsify the record of what was known then.",
  capacityInvestigationRedone: false,
  riskReassessed: false,
} as const;

export const RECONCILIATION_CONFERS = {
  confers: ["a consistent canonical capacity state", "a primary blocker that names the nearest unresolved stage"],
  doesNotConfer: [
    "deposit availability", "withdrawal liquidity", "downstream reserve capacity",
    "a risk score change", "human review", "risk signoff", "product approval",
    "recommendation eligibility", "Top Pick", "a production card", "execution",
  ],
  automatedAggregateUnchanged: 5.37,
  meetsMinimumUnchanged: false,
  humanReviewUnchanged: "awaiting_reviewer",
  depositAvailabilityRemains: "blocked",
  riskReviewRemains: "blocked",
  existingPositionRecognitionChanged: false,
  safetyBufferValuesChanged: false,
  directLendingCandidateChanged: false,
  solStakingChanged: false,
  riskScoreAssigned: false,
  humanReviewOccurred: false,
  signoffOccurred: false,
  productApproved: false,
  transactionConstructedOrSimulated: false,
} as const;

export const RECONCILIATION_EVIDENCE = {
  evidenceId: RECONCILIATION_ID,
  version: RECONCILIATION_VERSION,
  step: "16H-O.1",
  candidateId: RECONCILED_PRODUCT.candidateId,
  vault: RECONCILED_PRODUCT.vault,
  preparerId: "claude_automated_evidence_preparer",
  preparerRole: "automated_evidence_preparer",
  preparerIsNotHumanReviewer: true,
  evidenceTimestamp: "2026-07-17T10:41:00.000Z",
  canonicalSource: CANONICAL_SOURCE.module,
  canonicalCommit: KVAULT_CAPACITY_SOURCE.commit,
  whatChanged: [
    "capacityAdapterState blocked → adapter_implemented_source_verified.",
    "capacityFieldOrFormula stale UNRESOLVED wording replaced with the 16H-J.1 conclusion.",
    "primaryBlocker blocked_risk_review → blocked_deposit_availability (the nearest unresolved stage).",
    "The 16H-I statement retained verbatim with a supersession note.",
  ],
  whyItChanged:
    "The manifest contradicted itself: two structured fields said capacity was unresolved while the comment, primaryBlocker and a blocker string said 16H-J.1 resolved it. The kvault source is canonical and the fields were stale.",
  invalidationTriggers: CANONICAL_SOURCE.invalidationConditions,
} as const;

export function computeReconciliationManifestHash(e: typeof RECONCILIATION_EVIDENCE = RECONCILIATION_EVIDENCE): string {
  const material = JSON.stringify({
    id: e.evidenceId, v: e.version, s: e.step, c: e.candidateId, vt: e.vault,
    src: e.canonicalSource, commit: e.canonicalCommit,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `reconciliation_evidence_${h.toString(16).padStart(8, "0")}`;
}

export const RECONCILIATION_MANIFEST_HASH = computeReconciliationManifestHash();

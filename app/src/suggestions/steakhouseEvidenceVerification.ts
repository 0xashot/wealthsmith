/**
 * steakhouseEvidenceVerification — records the WealthSmith product owner's EXPLICIT human
 * verification of the completed Steakhouse USDC evidence package.
 *
 * This is a VERIFICATION-RECORDING step only. It assigns no dimension score, computes no aggregate,
 * fills no scoring field, completes no risk signoff, approves no product, enables no production
 * eligibility, renders no card, and changes no evidence finding.
 *
 * WHAT IS BEING RECORDED, precisely: a human read the evidence package and accepted it as accurate
 * enough for human risk scoring — including its unresolved uncertainties. That is a statement about
 * the EVIDENCE, not about the product. It deliberately says nothing about whether Steakhouse is a
 * good product, a safe product, or an approvable product.
 *
 * TWO LIFECYCLES, AND WHY BOTH ARE RECORDED
 *
 * The task asked for a transition "equivalent to awaiting_reviewer → reviewed". The repository has two
 * distinct state machines, and the distinction is load-bearing:
 *
 *   1. `HumanReviewLifecycle` = awaiting_reviewer | in_review | changes_requested | reviewed
 *      — the lifecycle of a REVIEW ACT. This is where "awaiting_reviewer → reviewed" belongs, and it
 *        is recorded verbatim below as the evidence package's human-verification lifecycle.
 *
 *   2. `RiskReviewState` = not_started | evidence_incomplete | evidence_complete | partially_scored |
 *      scoring_complete | in_review | reviewed | awaiting_signoff | risk_approved | risk_rejected
 *      — the PRODUCT's risk-review state machine. Steakhouse currently sits at `evidence_incomplete`.
 *
 * The literal `RiskReviewState.reviewed` was NOT used, and could not be: `validateReviewTransition`
 * rejects `evidence_incomplete → reviewed` outright, because in that machine `reviewed` is reachable
 * only via `scoring_complete → in_review`. Recording it would therefore assert that scoring had
 * already happened — precisely what this step forbids. The correct, valid, canonical evidence-review
 * transition is `evidence_incomplete → evidence_complete`, whose ONLY forward edge is to
 * `partially_scored` — i.e. it hands the package to a scorer and does nothing more.
 *
 * So: same human decision, recorded in both vocabularies, with neither overstating the other.
 */
import { validateReviewTransition, type HumanReviewLifecycle, type RiskReviewState } from "./riskGovernance";
import { authorizeReviewerAction } from "./riskReviewerRegistry";

export const STEAKHOUSE_EVIDENCE_VERIFICATION_VERSION = "1.0.0" as const;

/* ------------------------------------------------------------------ *
 * 1. Evidence package identity + manifest hash
 * ------------------------------------------------------------------ */

/**
 * The exact package the human verified. A verification that does not name WHAT was verified is worth
 * nothing — if any of this drifts, the verification no longer applies and the manifest hash changes.
 */
export const VERIFIED_EVIDENCE_PACKAGE = {
  packageVersion: "16H-L.2",
  strategyId: "kamino_steakhouse_usdc",
  vaultAddress: "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E",
  sharesMint: "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS",
  programId: "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd",
  verifiedDeployedCommit: "1d146d7087a76edbbadc14d848ae14295c0745a4",
  rubricId: "protocol_risk_rubric_v1",
  rubricVersion: "1.0.0",
  /** The latest cutoff across the constituent artifacts — the package is only as fresh as its oldest claim. */
  evidenceCutoffAt: "2026-07-16T17:08:42.000Z",
  readinessAtVerification: "conditionally_ready_for_human_scoring",
  constituentArtifacts: [
    "steakhouseUsdcRiskEvidence (16D risk evidence)",
    "steakhouseEvidenceClosure (16H-L / L.1: authority model, reserve exposure, withdrawal semantics, readiness)",
    "steakhouseDeploymentAndDepositEvidence (16H-L.1: verified build, withdrawal config, API semantics, permissioning, deposit state)",
    "steakhouseAuditCoverage (16H-L.2: release identity, remediation verification, coverage matrix)",
    "steakhouseIncidentEvidence (16H-L.2 addendum: market authorities, socialize_loss semantics, incident model)",
  ],
} as const;

/**
 * Stable manifest identity. Follows the repository's existing FNV-1a convention (see
 * `computeRubricV1Hash`) so hashes here are comparable in kind with the rubric's.
 *
 * The hash covers the package's IDENTITY — product binding, deployed commit, rubric, cutoff, readiness
 * — not its prose. That is deliberate: rewording a comment must not invalidate a human's verification,
 * but changing the vault, the deployed commit, the rubric version, the cutoff or the readiness state
 * absolutely must.
 */
export function computeEvidenceManifestHash(pkg: typeof VERIFIED_EVIDENCE_PACKAGE = VERIFIED_EVIDENCE_PACKAGE): string {
  const material = JSON.stringify({
    v: pkg.packageVersion,
    s: pkg.strategyId,
    vault: pkg.vaultAddress,
    shares: pkg.sharesMint,
    prog: pkg.programId,
    commit: pkg.verifiedDeployedCommit,
    rubric: `${pkg.rubricId}@${pkg.rubricVersion}`,
    cutoff: pkg.evidenceCutoffAt,
    readiness: pkg.readinessAtVerification,
    artifacts: pkg.constituentArtifacts,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) {
    h ^= material.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `evidence_${h.toString(16).padStart(8, "0")}`;
}

export const VERIFIED_EVIDENCE_MANIFEST_HASH = computeEvidenceManifestHash();

/* ------------------------------------------------------------------ *
 * 2. The verification record
 * ------------------------------------------------------------------ */

export interface EvidenceVerificationRecord {
  verifiedBy: string;
  verifierDisplayLabel: string;
  verificationRole: "risk_reviewer";
  verifiedAt: string;
  verificationRationale: string;
  evidencePackageVersion: string;
  evidenceCutoffAt: string;
  evidenceManifestHash: string;
  readinessAtVerification: string;
  /** The review-act lifecycle transition. */
  humanReviewFrom: HumanReviewLifecycle;
  humanReviewTo: HumanReviewLifecycle;
  /** The product's risk-review state transition. */
  riskReviewFrom: RiskReviewState;
  riskReviewTo: RiskReviewState;
  /** Everything this record explicitly does NOT do. */
  impliesFavourableScore: false;
  impliesAnyScore: false;
  impliesRiskSignoff: false;
  impliesProductApproval: false;
  acceptedLimitations: string[];
}

/**
 * TRANSCRIBED from the product owner's explicit decision. Claude did not infer this, did not decide
 * it, and is not a party to it. Claude prepared the evidence; a human read it and accepted it.
 *
 * `acceptedLimitations` is the most important field here. A verification that quietly dropped the
 * uncertainties would be worse than no verification at all — it would launder open questions into
 * apparent settledness. The human accepted the package WITH these, so they are recorded WITH it.
 */
export const STEAKHOUSE_EVIDENCE_VERIFICATION: EvidenceVerificationRecord = {
  verifiedBy: "ws_product_owner",
  verifierDisplayLabel: "Ashot Gyulzatyan",
  verificationRole: "risk_reviewer",
  verifiedAt: "2026-07-16T17:22:00.000Z",
  verificationRationale:
    "Product owner reviewed and accepted the bounded evidence package, including its unresolved uncertainties, partial audit coverage, authority model, reserve exposure, withdrawal behavior, incident-history limitations, and read-only deposit-state findings, as sufficient for human scoring.",
  evidencePackageVersion: VERIFIED_EVIDENCE_PACKAGE.packageVersion,
  evidenceCutoffAt: VERIFIED_EVIDENCE_PACKAGE.evidenceCutoffAt,
  evidenceManifestHash: VERIFIED_EVIDENCE_MANIFEST_HASH,
  readinessAtVerification: "conditionally_ready_for_human_scoring",
  humanReviewFrom: "awaiting_reviewer",
  humanReviewTo: "reviewed",
  riskReviewFrom: "evidence_incomplete",
  riskReviewTo: "evidence_complete",
  impliesFavourableScore: false,
  impliesAnyScore: false,
  impliesRiskSignoff: false,
  impliesProductApproval: false,
  acceptedLimitations: [
    "Audit coverage is PARTIAL: klend_operations.rs (214 changed lines — the CPI layer that moves user funds), three new instructions, the CtokenCap concept, the allocation-admin surface and the reserve whitelist carry no public audit coverage in the deployed release.",
    "The private kvault-private → public commit mapping is unattested; only Kamino can confirm it.",
    "The allocation admin is a raw on-curve keypair with no multisig and no time lock, directing ~20.7M USDC across reserves, with observed reallocation.",
    "The vault admin is a 3-of-10 Squads multisig with NO time lock; fee, cap and minimum changes take effect immediately.",
    "Incident history: zero confirmed incidents is a SEARCH RESULT, not a clean record. Official material covers 10.95% of current allocation; the vault layer and the current deployment are uncovered; socialize_loss history before 2026-02-24 is unsearched.",
    "One unresolved third-party lead (~$1.26M bad-debt allegation) has no primary source and remains open.",
    "Structural loss exposure: a market's lending_market_owner can socialize losses onto vault depositors (99.34% behind a 4-of-10 multisig with a 12h time lock; 0.66% behind an owner of unresolved control model).",
    "The Bitcoin Market lending_market_owner's control model is unresolved.",
    "Withdrawals are not instant: the vault holds ~0 unencumbered buffer, so ~100% of any withdrawal depends on reserve liquidity; two of four reserves currently cannot cover the vault's position in full.",
    "Five rubric dimensions remain `partial` (strategy_complexity, composability_dependency, oracle_risk, asset_stablecoin_risk, maturity) — which is why readiness is CONDITIONALLY ready, not ready.",
    "Evidence is slot-bound and ages: allocation weights, reserve liquidity and fees all change without notice.",
  ],
};

/* ------------------------------------------------------------------ *
 * 3. Validation
 * ------------------------------------------------------------------ */

export type VerificationRejectionReason =
  | "reviewer_unauthorized"
  | "product_identity_mismatch"
  | "rubric_version_mismatch"
  | "evidence_manifest_mismatch"
  | "timestamp_invalid"
  | "timestamp_in_future"
  | "evidence_stale"
  | "readiness_not_eligible"
  | "invalid_state_transition";

export interface VerificationValidationInputs {
  reviewerId?: string;
  role: "risk_reviewer" | "risk_scorer" | "risk_signoff_approver" | "product_approver" | "rubric_approver" | "evidence_preparer";
  productType?: string;
  strategyId: string;
  vaultAddress: string;
  programId: string;
  rubricId: string;
  rubricVersion: string;
  evidenceManifestHash: string;
  verifiedAt: string;
  /** Evaluation "now" — injected so this stays deterministic and offline. */
  now: string;
  readiness: string;
  riskReviewFrom: RiskReviewState;
  riskReviewTo: RiskReviewState;
}

export interface VerificationValidationResult {
  accepted: boolean;
  reason?: VerificationRejectionReason;
  detail?: string;
}

/** Evidence older than this is not a basis for verification. Consistent with the review-freshness posture. */
export const EVIDENCE_MAX_AGE_DAYS = 30;

/**
 * Pure, deterministic, offline. `now` is injected rather than read from the clock so the fixtures can
 * prove the staleness and future-timestamp branches without depending on when they run.
 *
 * Ordering is deliberate: authorization is checked FIRST. An unauthorized actor's verification must be
 * rejected before any of its content is considered, so that a well-formed record from the wrong person
 * can never be accepted on the strength of being well-formed.
 */
export function validateEvidenceVerification(i: VerificationValidationInputs): VerificationValidationResult {
  const auth = authorizeReviewerAction({ reviewerId: i.reviewerId, role: i.role, productType: i.productType });
  if (!auth.authorized) return { accepted: false, reason: "reviewer_unauthorized", detail: `${auth.reason}: ${auth.detail ?? ""}` };

  if (i.strategyId !== VERIFIED_EVIDENCE_PACKAGE.strategyId || i.vaultAddress !== VERIFIED_EVIDENCE_PACKAGE.vaultAddress || i.programId !== VERIFIED_EVIDENCE_PACKAGE.programId) {
    return { accepted: false, reason: "product_identity_mismatch", detail: `expected ${VERIFIED_EVIDENCE_PACKAGE.strategyId}/${VERIFIED_EVIDENCE_PACKAGE.vaultAddress}` };
  }
  if (i.rubricId !== VERIFIED_EVIDENCE_PACKAGE.rubricId || i.rubricVersion !== VERIFIED_EVIDENCE_PACKAGE.rubricVersion) {
    return { accepted: false, reason: "rubric_version_mismatch", detail: `expected ${VERIFIED_EVIDENCE_PACKAGE.rubricId}@${VERIFIED_EVIDENCE_PACKAGE.rubricVersion}` };
  }
  if (i.evidenceManifestHash !== VERIFIED_EVIDENCE_MANIFEST_HASH) {
    return { accepted: false, reason: "evidence_manifest_mismatch", detail: "the package changed since it was verified; the verification no longer applies" };
  }

  const at = Date.parse(i.verifiedAt);
  const now = Date.parse(i.now);
  if (Number.isNaN(at) || Number.isNaN(now)) return { accepted: false, reason: "timestamp_invalid", detail: "unparseable timestamp" };
  if (at > now) return { accepted: false, reason: "timestamp_in_future", detail: "a verification cannot be dated after the moment it is evaluated" };

  const cutoff = Date.parse(VERIFIED_EVIDENCE_PACKAGE.evidenceCutoffAt);
  const ageDays = (at - cutoff) / 86400000;
  if (ageDays > EVIDENCE_MAX_AGE_DAYS) return { accepted: false, reason: "evidence_stale", detail: `evidence is ${ageDays.toFixed(1)} days older than the verification (max ${EVIDENCE_MAX_AGE_DAYS})` };

  if (i.readiness !== "conditionally_ready_for_human_scoring") {
    return { accepted: false, reason: "readiness_not_eligible", detail: `readiness is ${i.readiness}` };
  }

  const t = validateReviewTransition(i.riskReviewFrom, i.riskReviewTo);
  if (!t.valid) return { accepted: false, reason: "invalid_state_transition", detail: t.diagnostic?.detail };

  return { accepted: true };
}

/** The exact inputs of the recorded decision, so the record can be re-validated at any time. */
export const STEAKHOUSE_VERIFICATION_INPUTS: VerificationValidationInputs = {
  reviewerId: "ws_product_owner",
  role: "risk_reviewer",
  productType: "stable_yield",
  strategyId: VERIFIED_EVIDENCE_PACKAGE.strategyId,
  vaultAddress: VERIFIED_EVIDENCE_PACKAGE.vaultAddress,
  programId: VERIFIED_EVIDENCE_PACKAGE.programId,
  rubricId: VERIFIED_EVIDENCE_PACKAGE.rubricId,
  rubricVersion: VERIFIED_EVIDENCE_PACKAGE.rubricVersion,
  evidenceManifestHash: VERIFIED_EVIDENCE_MANIFEST_HASH,
  verifiedAt: STEAKHOUSE_EVIDENCE_VERIFICATION.verifiedAt,
  now: STEAKHOUSE_EVIDENCE_VERIFICATION.verifiedAt,
  readiness: "conditionally_ready_for_human_scoring",
  riskReviewFrom: "evidence_incomplete",
  riskReviewTo: "evidence_complete",
};

export function getSteakhouseVerificationResult(): VerificationValidationResult {
  return validateEvidenceVerification(STEAKHOUSE_VERIFICATION_INPUTS);
}

/* ------------------------------------------------------------------ *
 * 4. What this verification does NOT do
 * ------------------------------------------------------------------ */

/**
 * Exported and fixture-asserted so the boundary is a tested fact rather than a convention.
 *
 * The single most likely future misreading of this module is "the evidence was verified, so the
 * product is fine". It is not. Verification says the EVIDENCE is accurate enough to score. Scoring has
 * not happened, signoff has not happened, and approval has not happened — in that order, each by a
 * separate recorded act.
 */
export const EVIDENCE_VERIFICATION_CONFERS = {
  evidenceVerifiedByHuman: true,
  scoringSubmitted: false,
  anyDimensionScored: false,
  aggregateScoreComputed: false,
  riskSignoffCompleted: false,
  productApproved: false,
  productionEligibilityEnabled: false,
  stableYieldCardRendered: false,
  depositStateChanged: false,
  capacityChanged: false,
  evidenceFindingsAltered: false,
  note: "Evidence verification means a human accepted the evidence as accurate enough to SCORE. It is not a score, not a signoff, and not an approval. Each of those is a separate act by a separate recorded decision, in that order.",
} as const;

/** The canonical post-verification state, stated once so nothing has to infer it. */
export const POST_VERIFICATION_STATE = {
  evidenceReview: "reviewed" as HumanReviewLifecycle,
  evidenceVerifiedByHuman: true,
  riskReviewState: "evidence_complete" as RiskReviewState,
  scoring: "not_submitted",
  worksheetScores: "all_empty",
  riskSignoff: "pre_signoff — signoff is not reachable until scoring_complete → in_review → reviewed → awaiting_signoff",
  productApproved: false,
  productionApprovedProductCount: 0,
  productionStableYieldCard: "absent",
  demo: "unchanged",
} as const;

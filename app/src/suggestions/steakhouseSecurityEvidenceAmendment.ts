/**
 * steakhouseSecurityEvidenceAmendment — Step 16H-M.3.
 *
 * Closes the formal-verification and fuzzing scope gap the assessor itself flagged after the 16H-M.2
 * reassessment ("/docs/security/formal-verification and /docs/security/fuzzing are still unread, and
 * both bear on audit_security, my heaviest-weighted score").
 *
 * OUTCOME: the new evidence NARROWS the picture but does NOT close the deployed gap. audit_security
 * stays 5. The reason is deterministic rather than editorial — see CPI_LAYER_COVERAGE. The KVault
 * formal verification's scope DID include the CPI file, but at private commit e99fd8f (work ended
 * 2025-06-27), and the deployed file has changed twice since (normalized hash cb9e8aef -> c3071afb ->
 * f476fec7; +132/-84 lines v1.0.0 -> v2.2.2). A proof about code that is no longer deployed is not
 * coverage of the code that is.
 *
 * IMMUTABILITY. evidence_a86da1fd, assessment v1.0.0 and v1.1.0 are untouched. This is an additive
 * amendment with its own manifest.
 *
 * Assigns no score by itself, performs no human review, no signoff, no approval.
 */
import type { AutomatedAssessmentDiagnostic } from "./automatedAssessmentGovernance";
import { VERIFIED_EVIDENCE_MANIFEST_HASH } from "./steakhouseEvidenceVerification";

export const SECURITY_EVIDENCE_AMENDMENT_VERSION = "1.1.0" as const;
export const AMENDMENT_CUTOFF_AT = "2026-07-16T19:10:00.000Z";

/* ------------------------------------------------------------------ *
 * 1. Source-link hygiene (NOT a security finding)
 * ------------------------------------------------------------------ */

/**
 * Recorded so a future reader does not mistake a 404 for missing evidence. Explicitly NOT a security
 * finding — a broken doc link says nothing about the code.
 */
export const SOURCE_LINK_HYGIENE = [
  {
    issue: "Every report link on /docs/security/* targets github.com/Kamino-Finance/audits/blob/main/…, but the repository's default branch is `master`. /blob/main/ returns HTTP 404; /blob/master/ returns 200.",
    resolvedBy: "Artifacts resolved from the repository tree on `master` rather than from the documentation links.",
    isSecurityFinding: false,
    severity: "documentation_hygiene",
  },
  {
    issue: "The /docs/security/fuzzing 'Verifiable Builds' table lists Kamino Vaults as kvauTFR8qm1dhniz6pYuBZkuene38GZMyALHMLo2EoP. That address DOES NOT EXIST on mainnet (getAccountInfo returns null).",
    resolvedBy: "Not used. The historical vault program that does exist is kvauTFR8qm1dhniz6pYuBZkuene3Hfrs1VQhVRgCNrr (executable, programData CLOSED), and the current canonical program is KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd (verified). The documented address is stale AND non-resolving; the current deployment's verification stands on its own hash-verified record.",
    isSecurityFinding: false,
    severity: "documentation_hygiene",
  },
  {
    issue: "The /docs/security/formal-verification table dates the Kamino Earn Vaults Certora report 27 June 2025. The report's own cover page reads 'April 2025', and its scope section states the work ran Jan 7-23 2025, Apr 2-25 2025, and Jun 25-27 2025.",
    resolvedBy: "The report's own dates are used. The docs date corresponds to the LAST iteration, which is defensible but imprecise.",
    isSecurityFinding: false,
    severity: "documentation_hygiene",
  },
] as const;

/* ------------------------------------------------------------------ *
 * 2. Formal-verification inventory
 * ------------------------------------------------------------------ */

export type DeployedApplicability =
  | "applies_to_deployed_release"
  | "predecessor_release_code_changed_since"
  | "predecessor_release_code_identical"
  | "different_component"
  | "unresolved";

export interface FormalVerificationRecord {
  evidenceId: string;
  component: "KVault" | "KLend" | "Scope" | "other";
  firm: string;
  reportDate: string;
  reportFilename: string;
  repositoryPath: string;
  reportSha256Prefix: string;
  testedRelease: string | null;
  commitHash: string | null;
  commitIsPublic: boolean;
  programId: string | null;
  functionsInScope: string;
  propertiesProved: string[];
  assumptions: string[];
  exclusions: string[];
  unresolvedFindings: string;
  remediationVerified: string;
  applicabilityToV222: DeployedApplicability;
  applicabilityDetail: string;
}

/**
 * A formal proof applies ONLY to the specified properties, the modeled code, the stated assumptions,
 * and the covered version. It is never a proof that "the protocol is correct" — and the documentation
 * page's framing ("If a property is formally verified, it is mathematically guaranteed to hold") is
 * true only inside those four bounds.
 *
 * THE MOST LOAD-BEARING FACT HERE: the KVault FV lists FIVE properties. None of them is about CPI
 * account validation, and none is about rewards — rewards did not exist when the verification ran.
 */
export const FORMAL_VERIFICATION_INVENTORY: FormalVerificationRecord[] = [
  {
    evidenceId: "fv_kvault_certora_2025",
    component: "KVault",
    firm: "Certora",
    reportDate: "2025-04 (cover) / iterations Jan 7-23 2025, Apr 2-25 2025, Jun 25-27 2025",
    reportFilename: "kamino_vault_certora.pdf",
    repositoryPath: "Kamino-Finance/audits@master:kamino_vault_certora.pdf",
    reportSha256Prefix: "18e2ab6e8f797590",
    testedRelease: null,
    commitHash: "e99fd8f",
    commitIsPublic: false,
    programId: null,
    functionsInScope: "kvault-private/programs/kamino-vault/src/* — ALL contracts in that folder, at private commit e99fd8f. The folder-level scope means klend_operations.rs WAS in scope AS IT EXISTED THEN.",
    propertiesProved: [
      "P-01 Vault Solvency",
      "P-02 Solvency for charge_fees",
      "P-03 give_up_pending_fees does not revert",
      "shares_to_burn consistency",
      "Integrity of disinvesting ctokens for withdrawals",
    ],
    assumptions: [
      "Properties were formulated and written by the Certora team — they are Certora's model of correctness, not an exhaustive specification of the vault.",
      "Report states correctness 'modulo identified issues' — the proof is conditional on the listed findings being addressed.",
      "The Prover verifies the MODELED code under configuration/munging described in the report's Assumptions and Simplifications section; munged code is not the deployed code byte-for-byte.",
    ],
    exclusions: [
      "NO property about CPI account validation.",
      "NO property about rewards — the rewards feature did not exist at commit e99fd8f (it shipped in release/v2.1.1, April 2026, ~10 months after the verification ended).",
      "NO property about allocation-admin authority or manager discretion.",
      "NO property about oracle handling.",
      "Bound to the private repository; the commit is not publicly mapped.",
    ],
    unresolvedFindings: "Medium-severity issues were identified (e.g. M-01 give_up_pending_fee() error path). The report is a combined 'Security Assessment & Formal Verification' — manual audit findings sit alongside the proofs.",
    remediationVerified: "Not establishable from the public artifact against the deployed commit: the report's remediation state is bound to private commit e99fd8f, which is not publicly mapped to release/v2.2.2.",
    applicabilityToV222: "predecessor_release_code_changed_since",
    applicabilityDetail:
      "Work ended 2025-06-27. release/v2.2.2 was authored 2026-07-08 — 13 months and SEVEN public releases later (v1.1.0, v2.0.0, v2.0.1, v2.1.0, v2.1.1, v2.2.0, v2.2.1, v2.2.2). The proofs' subject code is not the deployed code. The properties may well still hold for v2.2.2, but that is a hypothesis, not a proof: nothing public re-verifies them against 1d146d70…",
  },
  {
    evidenceId: "fv_klend_certora_2025",
    component: "KLend",
    firm: "Certora",
    reportDate: "2025-05-13",
    reportFilename: "kamino_lend_certora.pdf",
    repositoryPath: "Kamino-Finance/audits@master:kamino_lend_certora.pdf",
    reportSha256Prefix: "(not hashed — KLend is a dependency, not the assessed product)",
    testedRelease: null,
    commitHash: null,
    commitIsPublic: false,
    programId: null,
    functionsInScope: "Kamino Lend core lending mechanics (per the documentation's description).",
    propertiesProved: ["Reserve Solvency Invariant", "Share Value Monotonicity"],
    assumptions: [
      "Per the documentation, these are the two invariants verified for KLend. The report itself was not fully parsed for this amendment — KLend is a dependency, and its coverage cannot substitute for KVault coverage regardless of strength.",
    ],
    exclusions: [
      "Says NOTHING about whether KVault constructs its CPI calls correctly, validates passed accounts, or preserves its own accounting around those calls.",
    ],
    unresolvedFindings: "Documentation claims zero critical invariant violations.",
    remediationVerified: "Not established against the current KLend deployment (commit 37592174…) from public artifacts.",
    applicabilityToV222: "different_component",
    applicabilityDetail:
      "This is evidence about the CALLED program, not about the vault. It supports confidence that KLend's reserve accounting is sound; it provides ZERO evidence about the 214-line KVault CPI layer, which is KVault's code. The current KLend deployment IS hash-verified (commit 37592174…), but the FV is not commit-linked to it.",
  },
  {
    evidenceId: "fv_klend_osec_2025",
    component: "KLend",
    firm: "OtterSec",
    reportDate: "2025-10-06",
    reportFilename: "kamino_lend_osec_formal_verification.pdf",
    repositoryPath: "Kamino-Finance/audits@master:kamino_lend_osec_formal_verification.pdf",
    reportSha256Prefix: "(not hashed — dependency component)",
    testedRelease: null,
    commitHash: null,
    commitIsPublic: false,
    programId: null,
    functionsInScope: "Kamino Lend (per documentation).",
    propertiesProved: [],
    exclusions: ["Same component boundary as above: KLend verification is not KVault verification."],
    assumptions: ["Properties not enumerated in this amendment — the report was not parsed, as it cannot affect KVault CPI coverage."],
    unresolvedFindings: "unresolved — report not parsed.",
    remediationVerified: "unresolved",
    applicabilityToV222: "different_component",
    applicabilityDetail: "Dependency evidence only.",
  },
  {
    evidenceId: "fv_limo_certora_2025",
    component: "other",
    firm: "Certora",
    reportDate: "2025-02-21",
    reportFilename: "kamino_limo_audit_formal_verification_certora.pdf",
    repositoryPath: "Kamino-Finance/audits@master",
    reportSha256Prefix: "(not relevant)",
    testedRelease: null,
    commitHash: null,
    commitIsPublic: false,
    programId: null,
    functionsInScope: "Kamino Limit Orders.",
    propertiesProved: [],
    assumptions: [],
    exclusions: ["Unrelated component. Counted in the '4 formal verifications' claim but irrelevant to this product."],
    unresolvedFindings: "n/a",
    remediationVerified: "n/a",
    applicabilityToV222: "different_component",
    applicabilityDetail: "Not part of this product's dependency graph. Recorded only because it inflates the headline '4 formal verifications' count.",
  },
];

/* ------------------------------------------------------------------ *
 * 3. Fuzzing inventory
 * ------------------------------------------------------------------ */

export interface FuzzingRecord {
  evidenceId: string;
  component: "KVault" | "KLend" | "other";
  firm: string;
  reportDate: string;
  reportFilename: string | null;
  repositoryPath: string | null;
  codeVersionOrCommit: string | null;
  instructionsFuzzed: string;
  generatedOperationClasses: string[];
  invariantsTested: string[];
  campaignScope: string;
  sequenceCountStated: string;
  defectsDiscovered: string;
  remediations: string;
  regressionCorpusBehavior: string;
  applicabilityToV222: DeployedApplicability;
  applicabilityDetail: string;
}

/**
 * KLEND FUZZING IS NOT KVAULT FUZZING, and the distinction is not pedantic here: the documentation's
 * fuzzing page names exactly ONE report, and it is Kamino Lend. The headline results ("zero insolvency
 * risks", "zero economic bugs", "millions of instruction sequences") are all KLend results.
 *
 * NO KVAULT FUZZING REPORT EXISTS in the repository or the documentation. `kamino_vault_ackee-blockchain.pdf`
 * does exist — but its cover reads "Kamino Vaults / Ackee Blockchain Security / 14.10.2025" with an
 * "Audit Methodology" section, i.e. it is an AUDIT, and it is not listed on the fuzzing page at all.
 * Treating it as a fuzzing campaign because Ackee is "the fuzzing firm" would be exactly the inference
 * this section exists to prevent.
 */
export const FUZZING_INVENTORY: FuzzingRecord[] = [
  {
    evidenceId: "fuzz_klend_ackee_2025",
    component: "KLend",
    firm: "Ackee Blockchain (Trident framework)",
    reportDate: "2025-09-22",
    reportFilename: "kamino_lend_ackee_blockchain_fuzz_tests.pdf",
    repositoryPath: "Kamino-Finance/audits@master:kamino_lend_ackee_blockchain_fuzz_tests.pdf",
    codeVersionOrCommit: null,
    instructionsFuzzed: "Kamino Lend program instructions — deposits, withdrawals, borrows, repayments, liquidations (per the documentation's methodology section).",
    generatedOperationClasses: ["random instruction sequences in arbitrary order with arbitrary parameters"],
    invariantsTested: [
      "Reserve balances remain consistent with tracked deposits and borrows",
      "Collateral ratios are correctly computed after any operation",
      "Interest accrual does not produce negative values or overflow",
      "Liquidation eligibility is correctly determined regardless of prior operations",
    ],
    campaignScope: "'millions of instruction sequences over a months-long period' — protocol-authored, not independently verified.",
    sequenceCountStated: "'millions' — no exact figure stated, so none is recorded.",
    defectsDiscovered: "Documentation claims zero insolvency risks and zero economic bugs. Report not parsed for this amendment.",
    remediations: "not established from public artifacts",
    regressionCorpusBehavior: "Documentation describes a corpus re-run against new code versions. No evidence binds any re-run to release/v2.2.2 of KVault — and it would be KLend's corpus in any case.",
    applicabilityToV222: "different_component",
    applicabilityDetail:
      "This is KLEND fuzzing. It provides no evidence about KVault instructions, KVault accounting, or the KVault->KLend CPI layer. KLend is the callee; the CPI layer is the caller's code.",
  },
  {
    evidenceId: "fuzz_kvault_none",
    component: "KVault",
    firm: "(none)",
    reportDate: "(n/a)",
    reportFilename: null,
    repositoryPath: null,
    codeVersionOrCommit: null,
    instructionsFuzzed: "NONE — no KVault fuzzing report exists in the official repository or documentation.",
    generatedOperationClasses: [],
    invariantsTested: [],
    campaignScope: "n/a",
    sequenceCountStated: "n/a",
    defectsDiscovered: "n/a",
    remediations: "n/a",
    regressionCorpusBehavior: "n/a",
    applicabilityToV222: "unresolved",
    applicabilityDetail:
      "AUTHORITATIVE NEGATIVE for the public record: the fuzzing page names one report (KLend), and the repository contains no vault fuzzing artifact. The 'integrated into ongoing development / run continuously' claim is protocol-authored and binds to no commit. kamino_vault_ackee-blockchain.pdf (14.10.2025) is an AUDIT, not a fuzzing campaign, and is not listed on the fuzzing page.",
  },
];

/* ------------------------------------------------------------------ *
 * 4. THE CPI-LAYER QUESTION — the amendment's most important output
 * ------------------------------------------------------------------ */

export type CpiCoverageClassification =
  | "directly_included_in_formal_verification"
  | "directly_included_in_fuzzing"
  | "directly_included_in_traditional_audit"
  | "indirectly_exercised_but_not_specifically_reviewed"
  | "not_covered"
  | "impossible_to_determine_from_public_evidence";

/**
 * Resolved by DETERMINISTIC SOURCE COMPARISON, not by release names or dates.
 *
 * Normalized (whitespace-stripped) SHA-256 of programs/kvault/src/operations/klend_operations.rs:
 *   release/v1.0.0  (2025-05-25, FV era)  246 lines  cb9e8aef0c87
 *   release/v1.1.0  (2025-07-17)          246 lines  cb9e8aef0c87   <- identical to v1.0.0
 *   release/v2.1.0  (2026-03-31)          246 lines  c3071afb18cd   <- CHANGED
 *   release/v2.2.1  (2026-06-19)          246 lines  c3071afb18cd
 *   release/v2.2.2  (2026-07-08, DEPLOYED) 294 lines f476fec744ad   <- CHANGED AGAIN
 *
 * v1.0.0 -> v2.2.2: +132 / -84 lines.
 *
 * The Certora FV's folder-level scope DID include this file at private commit e99fd8f (~June 2025,
 * contemporaneous with the v1.0.0/v1.1.0 hash). The deployed file is two revisions removed from that.
 * So the honest classification is NOT "never reviewed" — it is "reviewed in a form that is no longer
 * deployed", which for the deployed release means NOT COVERED.
 */
export const CPI_LAYER_COVERAGE = {
  file: "programs/kvault/src/operations/klend_operations.rs",
  deployedRelease: "release/v2.2.2",
  deployedCommit: "1d146d7087a76edbbadc14d848ae14295c0745a4",
  deployedLineCount: 294,
  purpose: "The CPI layer that invokes KLend to move user liquidity between the vault and lending reserves — deposit/withdraw/invest against reserves.",
  externalProgramInvoked: "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD (hash-verified deployment, commit 37592174…)",

  classification: "not_covered" as CpiCoverageClassification,

  sourceIdentityAcrossReleases: [
    { release: "release/v1.0.0", date: "2025-05-25", lines: 246, normalizedSha: "cb9e8aef0c87", contemporaneousWithFv: true },
    { release: "release/v1.1.0", date: "2025-07-17", lines: 246, normalizedSha: "cb9e8aef0c87", contemporaneousWithFv: true },
    { release: "release/v2.1.0", date: "2026-03-31", lines: 246, normalizedSha: "c3071afb18cd", contemporaneousWithFv: false },
    { release: "release/v2.2.1", date: "2026-06-19", lines: 246, normalizedSha: "c3071afb18cd", contemporaneousWithFv: false },
    { release: "release/v2.2.2", date: "2026-07-08", lines: 294, normalizedSha: "f476fec744ad", contemporaneousWithFv: false },
  ],

  formalVerificationCoverage:
    "IN SCOPE AT A PREDECESSOR COMMIT, NOT AT THE DEPLOYED ONE. Certora's scope was `kvault-private/programs/kamino-vault/src/*` at private commit e99fd8f (work ended 2025-06-27), which would have included this file as it then existed. The deployed file has changed twice since (cb9e8aef -> c3071afb -> f476fec7). Critically, NONE of the five proved properties is about CPI account validation — the properties are Vault Solvency, Solvency for charge_fees, give_up_pending_fees non-reversion, shares_to_burn consistency, and integrity of disinvesting ctokens for withdrawals. Even had the code been unchanged, no proved property targets CPI correctness.",
  fuzzingCoverage: "NONE. No KVault fuzzing report exists. KLend fuzzing covers the callee, not this caller.",
  traditionalAuditCoverage:
    "NOT for this release. The 2026 feature audits scope redeem-in-kind (release 2.1.0) and vault rewards (release 2.1.1); neither covers the v2.2.2 CPI delta. The 2024-25 baselines and the Ackee vault audit (2025-10-14) all predate v2.2.2 and state no public commit.",
  rollingReviewClaim:
    "Kamino's audits page states 'rolling code reviews for ongoing changes'. NOT counted as coverage: no evidence binds any reviewed pull request or commit to release/v2.2.2 or to commit 1d146d70…. Per the 16H-M.3 rule, a rolling-review claim without commit/PR binding is not exact coverage.",

  remainingUncertainty:
    "Whether the v2.2.2 CPI changes were internally reviewed is unknown and only Kamino can answer. The properties proved in 2025 may still hold for the deployed code — that is plausible, and it is not evidence.",
  whatWouldCloseIt: [
    "A formal verification or audit naming public commit 1d146d7087a76edbbadc14d848ae14295c0745a4, or a private commit Kamino attests was squashed into release/v2.2.2.",
    "A CPI-account-validation property added to the verified property set and re-proved against the deployed code.",
    "A KVault fuzzing campaign bound to the deployed release.",
  ],
} as const;

/* ------------------------------------------------------------------ *
 * 5. Property analysis — what each proof does and does not establish
 * ------------------------------------------------------------------ */

export interface PropertyAnalysis {
  property: string;
  component: "KVault" | "KLend";
  establishes: string;
  doesNotEstablish: string;
  appliesToDeployedV222: boolean;
}

export const PROPERTY_ANALYSIS: PropertyAnalysis[] = [
  {
    property: "P-01 Vault Solvency (KVault, Certora)",
    component: "KVault",
    establishes: "Under the modeled operations at private commit e99fd8f, vault accounting cannot create share claims unsupported by vault assets.",
    doesNotEstablish: "That the DEPLOYED v2.2.2 code preserves this — the CPI and allocation code changed after the proof. It also says nothing about whether the underlying reserves' assets retain market value, nor about withdrawal liquidity.",
    appliesToDeployedV222: false,
  },
  {
    property: "shares_to_burn consistency (KVault, Certora)",
    component: "KVault",
    establishes: "Under modeled operations, the shares burned on withdrawal are consistent with the value removed — the core anti-dilution accounting of the withdraw path.",
    doesNotEstablish: "Immediate withdrawal liquidity, reserve availability, or that the deployed v2.2.2 withdraw path (whose surrounding code changed) preserves the property.",
    appliesToDeployedV222: false,
  },
  {
    property: "Integrity of disinvesting ctokens for withdrawals (KVault, Certora)",
    component: "KVault",
    establishes: "Under modeled operations, disinvesting cTokens to service a withdrawal behaves consistently. This is the property nearest the CPI boundary.",
    doesNotEstablish: "CPI account validation, correct handling of every KLend return state, or applicability to the deployed CPI layer — which is two revisions removed from the verified code.",
    appliesToDeployedV222: false,
  },
  {
    property: "P-02 Solvency for charge_fees / P-03 give_up_pending_fees does not revert (KVault, Certora)",
    component: "KVault",
    establishes: "Fee-path accounting preserves solvency under modeled operations, and the give-up path does not revert. Note M-01 recorded a medium-severity error-path issue in give_up_pending_fee().",
    doesNotEstablish: "That fee parameters cannot be changed adversely (they are admin-settable with no time lock), nor applicability to v2.2.2.",
    appliesToDeployedV222: false,
  },
  {
    property: "Reserve Solvency Invariant (KLend, Certora)",
    component: "KLend",
    establishes: "Issued cTokens never exceed underlying reserve assets under any modeled transaction sequence — the protocol cannot create claims on liquidity that does not exist.",
    doesNotEstablish: "That collateral retains market value; that bad debt cannot arise from price movement; that KVault constructs its CPI calls correctly; or that the vault's own accounting around those calls is right.",
    appliesToDeployedV222: false,
  },
  {
    property: "Share Value Monotonicity (KLend, Certora)",
    component: "KLend",
    establishes: "No modeled protocol operation decreases a depositor's share value — depositors cannot be diluted by a transaction sequence.",
    doesNotEstablish: "Immediate withdrawal liquidity; protection from socialize_loss (an admin action, not a modeled user operation); or anything about KVault's CPI layer.",
    appliesToDeployedV222: false,
  },
];

/** No property in ANY report covers these — stated explicitly because their absence is the finding. */
export const PROPERTIES_WITH_NO_COVERAGE = [
  "CPI-account validation invariants (KVault -> KLend)",
  "Rewards invariants (the feature postdates the KVault FV by ~10 months)",
  "Allocation invariants / manager-discretion bounds",
  "Oracle-handling invariants at the vault layer",
] as const;

/* ------------------------------------------------------------------ *
 * 6. Official documentation claims — classified
 * ------------------------------------------------------------------ */

export type ClaimClassification =
  | "report_verified"
  | "repository_verified"
  | "deployment_verified"
  | "protocol_authored_only"
  | "stale_for_current_deployment"
  | "not_independently_verifiable";

export const OFFICIAL_CLAIMS_CLASSIFIED: { claim: string; classification: ClaimClassification; detail: string }[] = [
  { claim: "4 formal verifications", classification: "repository_verified", detail: "Four artifacts exist (KVault Certora, KLend Certora, KLend OtterSec, Limit Orders Certora). TRUE as a count — but only ONE is KVault, and one (Limit Orders) is an unrelated component. The count is accurate and uninformative about this product." },
  { claim: "millions of fuzzed instruction sequences", classification: "protocol_authored_only", detail: "Stated on the fuzzing page for KLEND. No exact figure; the report was not parsed. Not a KVault claim." },
  { claim: "zero insolvency risks identified", classification: "protocol_authored_only", detail: "A KLend fuzzing result per the docs. Not independently verified here, and not about KVault." },
  { claim: "zero economic bugs identified", classification: "protocol_authored_only", detail: "As above — KLend fuzzing, protocol-authored." },
  { claim: "ongoing continuous fuzzing", classification: "protocol_authored_only", detail: "Binds to no commit and no component boundary. Cannot be credited as coverage of any release." },
  { claim: "rolling external code review", classification: "protocol_authored_only", detail: "No PR or commit binding to release/v2.2.2. Explicitly NOT counted as coverage — this is the claim most likely to be mistaken for closing the CPI gap." },
  { claim: "all major contracts have verifiable builds", classification: "stale_for_current_deployment", detail: "TRUE in substance and independently confirmed for the CURRENT programs (KVault KvauGMsp… and KLend both hash-verified). But the page's own table cites a vault program address that does not exist on mainnet, so the claim is right while its evidence is stale and non-resolving." },
  { claim: "0 Critical Vulnerabilities across 20 reports", classification: "not_independently_verifiable", detail: "Reports were not exhaustively parsed. The KVault Certora report does record MEDIUM severity findings, so 'zero critical' is not 'zero findings'." },
  { claim: "If a property is formally verified, it is mathematically guaranteed to hold", classification: "report_verified", detail: "True ONLY within the four bounds: the specified properties, the modeled code, the stated assumptions, and the covered version. The page does not state those bounds; this amendment does." },
];

/* ------------------------------------------------------------------ *
 * 7. Amendment manifest (additive — prior manifests untouched)
 * ------------------------------------------------------------------ */

export const PRIOR_EVIDENCE_MANIFEST = VERIFIED_EVIDENCE_MANIFEST_HASH;

export const SECURITY_EVIDENCE_AMENDMENT = {
  amendmentId: "steakhouse_security_evidence_amendment_001",
  amendmentVersion: SECURITY_EVIDENCE_AMENDMENT_VERSION,
  evidencePackageVersion: "16H-M.3",
  priorEvidenceManifest: PRIOR_EVIDENCE_MANIFEST,
  priorEvidencePackageVersion: "16H-L.2",
  priorManifestMutated: false,
  preparedBy: "ws_automated_risk_assessor (evidence_preparer capacity — automated agent, NOT a human)",
  preparedAt: AMENDMENT_CUTOFF_AT,
  evidenceCutoffAt: AMENDMENT_CUTOFF_AT,
  newlyDiscoveredEvidence: [
    "CORRECTION (amendment v1.1.0): the claim that the 2024-25 vault baselines 'state no commit' was FALSE. It was inherited from Kamino's inventory PAGE and never checked against the reports. Parsing all ten vault reports shows Sec3 states a full 40-char hash (8273031e…), Offside states branch `master` plus FOUR hashes (0791b339…, 586ec4eb…, 2c9c01a6…, d23536ce…), and OtterSec references a short hash (8a4b1fe). The auditors are more rigorous than the claim implied.",
    "That correction does NOT change the conclusion: `git cat-file` against the public Kamino-Finance/kvault repo confirms NONE of the eight report-stated commits (including Certora's e99fd8f and dabe9a26…) exists publicly. All are private-repo commits. The linkage gap is real — but it lives in the repository structure, not in audit quality.",
    "Sec3 records findings ACKNOWLEDGED rather than fixed (I-01 management-fee inaccuracy; Q-01/Q-02 allocation and performance-fee questions) — acknowledged-not-fixed is a distinct state from remediated.",
    "OtterSec baseline findings include OS-KVL-ADV-00 (sequence misalignment in allocations array) and OS-KVL-ADV-01 (improper enforcement of allocation cap) — both allocation-path issues, the area the allocation admin controls.",
    "KVault formal verification exists (Certora, kamino_vault_certora.pdf, private commit e99fd8f, work ended 2025-06-27) with five named properties — NOT previously inventoried.",
    "The KVault FV's scope was the whole programs/kamino-vault/src/* folder, so the CPI file was in scope AT THAT COMMIT.",
    "An Ackee vault AUDIT exists (kamino_vault_ackee-blockchain.pdf, 2025-10-14) — not listed on the fuzzing page, and not a fuzzing campaign.",
    "NO KVault fuzzing report exists anywhere in the official record — an authoritative negative.",
    "KLend has extensive versioned coverage (Certora 1.13.0-1.17.0, OtterSec 1.13.0-1.17.0, Offside 1.13.0-1.14.0, FV, fuzzing) — far broader than KVault's.",
    "Deterministic source comparison: the deployed CPI layer changed TWICE since the FV era (+132/-84 lines v1.0.0 -> v2.2.2).",
  ],
  whatChanged: "The audit_security evidence base is materially better understood: more reports exist than were inventoried, the FV's folder-level scope once included the CPI file, and the baselines DO state exact commits (contrary to an earlier false claim of this assessor's). The deployed-surface CONCLUSION is unchanged.",
  whyItChanged: "Deterministic source comparison shows the deployed CPI layer is two revisions removed from any verified version, and no proved property targets CPI validation. Every report-stated commit was checked against the public repo and none is present. The gap is narrowed in understanding, not closed in fact.",
  invalidationTriggers: [
    "Kamino attests a private-to-public commit mapping covering release/v2.2.2",
    "a new report names commit 1d146d70…",
    "a KVault fuzzing campaign is published",
    "the deployed program is upgraded",
  ],
} as const;

export function computeAmendmentManifestHash(a: typeof SECURITY_EVIDENCE_AMENDMENT = SECURITY_EVIDENCE_AMENDMENT): string {
  const material = JSON.stringify({
    id: a.amendmentId, v: a.amendmentVersion, pkg: a.evidencePackageVersion, prior: a.priorEvidenceManifest,
    cutoff: a.evidenceCutoffAt, fv: FORMAL_VERIFICATION_INVENTORY.map((f) => f.evidenceId + ":" + f.applicabilityToV222),
    fuzz: FUZZING_INVENTORY.map((f) => f.evidenceId + ":" + f.applicabilityToV222), cpi: CPI_LAYER_COVERAGE.classification,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `evidence_amend_${h.toString(16).padStart(8, "0")}`;
}

export const AMENDMENT_MANIFEST_HASH = computeAmendmentManifestHash();

/* ------------------------------------------------------------------ *
 * 8. audit_security conclusion — score UNCHANGED
 * ------------------------------------------------------------------ */

/**
 * The evidence improved the assessor's UNDERSTANDING without changing the anchor fit.
 *
 * Rubric anchor `partial` (5-6): "Evidence covers the main risk but leaves a named, bounded gap."
 * Rubric anchor `supported` (7-8): "Evidence is complete and verifiable for this dimension."
 *
 * Coverage is still not complete for the deployed release: the CPI layer that moves user funds carries
 * no coverage at its deployed version, no proved property targets CPI validation, no KVault fuzzing
 * exists, and the private-to-public mapping remains unattested. So `supported` is unavailable and 5
 * stands. Moving to 6 would also be unwarranted: nothing about the deployed uncovered surface improved
 * — only the assessor's map of it did.
 */
export const AUDIT_SECURITY_CONCLUSION = {
  priorScore: 5,
  priorConfidence: "high" as const,
  updatedScore: 5,
  updatedConfidence: "high" as const,
  scoreChanged: false,
  confidenceChanged: false,
  newAssessmentVersionRequired: false,
  reasonScoreDidNotMove:
    "The new evidence narrows the gap in UNDERSTANDING, not in FACT. Three findings each independently prevent `supported`: (1) deterministic source comparison shows the deployed CPI layer is two revisions removed from any formally verified version (+132/-84 since v1.0.0); (2) none of the KVault FV's five proved properties targets CPI account validation, so even unchanged code would not have been covered on that axis; (3) no KVault fuzzing exists at all, and KLend fuzzing covers the callee rather than this caller. The private-to-public mapping is still unattested and 'rolling code review' binds to no commit. Amendment v1.1.0 additionally verified that all eight report-stated commits are absent from the public repo — so even the reports' own precise commit references cannot bridge to release/v2.2.2. The anchor fit is unchanged: main risk covered, named bounded gap remains.",
  whatImproved:
    "The evidence base is better characterised — a KVault formal verification exists that was not previously inventoried, its folder-level scope once included the CPI file, and KLend (the dependency) has genuinely extensive versioned coverage. Confidence was already `high` and stays there; the assessor is now high-confidence for better reasons.",
  whatWouldMoveIt: CPI_LAYER_COVERAGE.whatWouldCloseIt,
} as const;

export const AMENDMENT_STATE = {
  priorAssessmentsImmutable: true,
  priorAssessmentVersions: ["1.0.0 (aggregate 5.21)", "1.1.0 (aggregate 5.37, oracle_risk 4->6)"],
  currentAssessmentVersion: "1.1.0",
  aggregateRecalculated: false,
  aggregateUnchanged: 5.37,
  meetsMinimum: false,
  humanReviewState: "awaiting_reviewer" as const,
  humanAcceptanceRecorded: false,
  riskSignoffCompleted: false,
  productApproved: false,
  productionApprovedProductCount: 0,
  productionStableYieldCard: "absent",
  demo: "unchanged",
  scoresInternalOnly: true,
} as const;

export const AMENDMENT_DIAGNOSTICS: AutomatedAssessmentDiagnostic[] = [
  "automated_assessment_requires_human_review",
  "human_review_pending",
];

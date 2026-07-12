/**
 * protocolSolLiquidStakingJitoEvidenceConfirmations — source-backed reviewer
 * evidence confirmations for the remaining JitoSOL rubric dimensions (Step 12X).
 *
 * This is the first candidate driven toward an internal evidence-readiness
 * milestone. It is NOT a protocol recommendation, NOT user-facing, and NOT
 * production selection. Recording evidence here:
 *  - writes NO production metadata (auditStatus / withdrawalTimeHours / fees stay
 *    unchanged),
 *  - mutates NO base evidence drafts,
 *  - assigns NO `riskScore` and approves no rubric,
 *  - marks no candidate `approved_for_scoring`.
 *
 * Values are reviewer-supplied from official Jito sources, not invented and not
 * fetched at runtime. Incident history is a completed MANUAL REVIEW that found no
 * sourced incident — explicitly NOT a clean-history claim, and to be rechecked
 * before beta/production. `PROTOCOL_SELECTION_IMPLEMENTED = false`;
 * `productionReady = false`.
 */
import type { ProtocolRiskRubricDimensionId } from "./protocolRiskRubric";
import type { ProtocolRiskReviewerRole } from "./protocolRiskApprovalDecision";

export const PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_EXIST = true;
export const PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_APPROVE_RUBRIC = false;
export const PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_ASSIGN_SCORES = false;
export const PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_AFFECT_PRODUCTION = false;
export const PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_ENABLE_SELECTION = false;
export const PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_UPDATE_METADATA = false;
export const PROTOCOL_JITOSOL_EVIDENCE_CONFIRMATIONS_MUTATE_EVIDENCE = false;
export const PROTOCOL_JITOSOL_EVIDENCE_TARGET_PROTOCOL_ID = "jito";
export const PROTOCOL_JITOSOL_EVIDENCE_TARGET_SYMBOL = "JitoSOL";

export type JitoEvidenceConfirmationCategory =
  | "audit_security"
  | "maturity"
  | "withdrawal_mechanics"
  | "withdrawal_time"
  | "fees"
  | "operational_dependency"
  | "incident_history";

export type JitoEvidenceConfirmationStatus = "confirmed" | "needs_review" | "insufficient" | "stale" | "rejected";

export type JitoEvidenceSourceKind =
  | "official_docs"
  | "official_faq"
  | "official_blog"
  | "security_page"
  | "audit_report"
  | "deployed_programs"
  | "manual_review";

export interface JitoEvidenceConfirmation {
  protocolId: "jito";
  lstSymbol: "JitoSOL";
  dimensionId: ProtocolRiskRubricDimensionId;
  category: JitoEvidenceConfirmationCategory;
  status: JitoEvidenceConfirmationStatus;
  sourceName: string;
  sourceUrl?: string;
  sourceKind: JitoEvidenceSourceKind;
  confirmedValue: string;
  confirmedValueType: "text" | "percent" | "hours" | "date" | "boolean" | "none";
  confirmedAsOf: string;
  reviewer: string;
  reviewerRole: ProtocolRiskReviewerRole;
  notes: string[];
  unresolvedQuestions: string[];
  productionMetadataUpdated: false;
  evidenceDraftMutated: false;
  scoreAssigned: false;
}

export interface JitoEvidenceConfirmationSummary {
  totalConfirmations: number;
  confirmed: number;
  needsReview: number;
  insufficient: number;
  stale: number;
  rejected: number;
  productionMetadataUpdatedCount: 0;
  evidenceDraftMutatedCount: 0;
  scoreAssignedCount: 0;
  dimensionsCovered: ProtocolRiskRubricDimensionId[];
}

const REVIEWER = "Ashot Gyulzatyan";
const REVIEWER_ROLE: ProtocolRiskReviewerRole = "founder";
const AS_OF = "2026-07-12T00:00:00Z";

type RawJito = Omit<
  JitoEvidenceConfirmation,
  "protocolId" | "lstSymbol" | "reviewer" | "reviewerRole" | "confirmedAsOf" | "status" | "productionMetadataUpdated" | "evidenceDraftMutated" | "scoreAssigned"
> & { status?: JitoEvidenceConfirmationStatus };

const RAW: RawJito[] = [
  // A. audit_security
  {
    dimensionId: "audit_security",
    category: "audit_security",
    sourceName: "JitoSOL Security Overview",
    sourceUrl: "https://www.jito.network/docs/jitosol/jitosol-liquid-staking/security/overview/",
    sourceKind: "security_page",
    confirmedValueType: "text",
    confirmedValue:
      "JitoSOL is built on the Solana Labs SPL Stake Pool program and is described by Jito as non-custodial. Jito states that three firms completed audits for the underlying stake-pool program.",
    notes: [
      "This supports audit/security evidence, not a riskScore.",
      "This does not imply the protocol is free of risk or a superior choice.",
      "Audit scope must be represented carefully as SPL Stake Pool program security, not a blanket audit of every Jito operational component.",
    ],
    unresolvedQuestions: [],
  },
  {
    dimensionId: "audit_security",
    category: "audit_security",
    sourceName: "JitoSOL Deployed Programs",
    sourceUrl: "https://www.jito.network/docs/jitosol/jitosol-liquid-staking/security/deployed-programs/",
    sourceKind: "deployed_programs",
    confirmedValueType: "text",
    confirmedValue:
      "Jito states that Jito Network uses the Solana Program Library deployed stake-pool program at mainnet address SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy. The deployed-programs page lists Quantstamp, Neodyme, and Kudelski audit reports for the stake-pool program.",
    notes: [
      "This confirms audit firms and program scope for the SPL Stake Pool program used by JitoSOL.",
      "Production metadata auditStatus remains unchanged in this step.",
    ],
    unresolvedQuestions: [],
  },
  // B. maturity
  {
    dimensionId: "maturity",
    category: "maturity",
    sourceName: "Jito Request for Stake Pool Validators",
    sourceUrl: "https://www.jito.network/blog/request-for-stake-pool-validators/",
    sourceKind: "official_blog",
    confirmedValueType: "text",
    confirmedValue:
      "Official Jito blog post dated 2022-12-14 states that JitoSOL launched in early November and had already become the fourth-largest staking pool on Solana with over 300k SOL.",
    notes: [
      "This supports maturity evidence and production-history evidence.",
      "This is not a recommendation.",
      "The exact launch day remains approximate because the source says early November.",
    ],
    unresolvedQuestions: [],
  },
  // C. withdrawal_fee_transparency
  {
    dimensionId: "withdrawal_fee_transparency",
    category: "withdrawal_mechanics",
    sourceName: "JitoSOL Unstaking Overview",
    sourceUrl: "https://www.jito.network/docs/jitosol/get-started/unstaking-jitosol-flow/unstaking-overview/",
    sourceKind: "official_docs",
    confirmedValueType: "text",
    confirmedValue:
      "Jito docs distinguish two exit methods: instant trading through Jupiter and direct protocol unstaking. Instant trading is a swap/route path, while direct unstaking is the protocol withdrawal path.",
    notes: [
      "Swap-route liquidity must not be confused with protocol withdrawal.",
      "This supports withdrawal mechanics only.",
    ],
    unresolvedQuestions: [],
  },
  {
    dimensionId: "withdrawal_fee_transparency",
    category: "withdrawal_time",
    sourceName: "JitoSOL Unstaking Overview",
    sourceUrl: "https://www.jito.network/docs/jitosol/get-started/unstaking-jitosol-flow/unstaking-overview/",
    sourceKind: "official_docs",
    confirmedValueType: "hours",
    confirmedValue: "48",
    notes: [
      "Represents up to 2 days for direct unstaking / Solana epoch completion.",
      "Do not write withdrawalTimeHours into production metadata in this step.",
    ],
    unresolvedQuestions: [],
  },
  {
    dimensionId: "withdrawal_fee_transparency",
    category: "fees",
    sourceName: "JitoSOL General FAQs",
    sourceUrl: "https://www.jito.network/docs/jitosol/faqs/general-faqs/",
    sourceKind: "official_faq",
    confirmedValueType: "percent",
    confirmedValue: "0.1",
    notes: [
      "Represents direct unstaking withdrawal fee.",
      "The FAQ also states this fee applies if users directly unstake via the website.",
      "Do not assign production fee metadata in this step.",
    ],
    unresolvedQuestions: [],
  },
  {
    dimensionId: "withdrawal_fee_transparency",
    category: "fees",
    sourceName: "JitoSOL General FAQs",
    sourceUrl: "https://www.jito.network/docs/jitosol/faqs/general-faqs/",
    sourceKind: "official_faq",
    confirmedValueType: "text",
    confirmedValue:
      "JitoSOL charges an annual management fee equal to 4% of total rewards, applied to staking rewards and MEV revenue after validator commissions.",
    notes: [
      "This is fee transparency evidence.",
      "Do not convert this into production fee scoring in this step.",
    ],
    unresolvedQuestions: [],
  },
  // D. operational_dependency_risk
  {
    dimensionId: "operational_dependency_risk",
    category: "operational_dependency",
    sourceName: "JitoSOL Security Overview",
    sourceUrl: "https://www.jito.network/docs/jitosol/jitosol-liquid-staking/security/overview/",
    sourceKind: "security_page",
    confirmedValueType: "text",
    confirmedValue:
      "Jito DAO has the manager role for the JitoSOL pool with limited responsibilities around validator selection and fees. Validator selection is run by StakeNet.",
    notes: ["This supports operational dependency evidence.", "It does not assign riskScore."],
    unresolvedQuestions: [],
  },
  {
    dimensionId: "operational_dependency_risk",
    category: "operational_dependency",
    sourceName: "JitoSOL Automated Management via Stakenet",
    sourceUrl: "https://www.jito.network/docs/jitosol/jitosol-liquid-staking/stake-pool-operations/automated-management/",
    sourceKind: "official_docs",
    confirmedValueType: "text",
    confirmedValue:
      "Jito docs describe StakeNet as a blend of on-chain programs and off-chain keepers that automatically manage JitoSOL stake distribution across validators. The docs describe on-chain decision-making, community-governed system parameters, and multiple independent keepers.",
    notes: ["This supports dependency and operations evidence.", "It does not mean operational risk is zero."],
    unresolvedQuestions: [],
  },
  {
    dimensionId: "operational_dependency_risk",
    category: "operational_dependency",
    sourceName: "JitoSOL Technical FAQs",
    sourceUrl: "https://www.jito.network/docs/jitosol/faqs/technical-faqs/",
    sourceKind: "official_faq",
    confirmedValueType: "text",
    confirmedValue:
      "Technical FAQ lists JitoSOL token address J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn and stake pool address Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb.",
    notes: ["This supports program/address dependency evidence."],
    unresolvedQuestions: [],
  },
  // E. incident_history
  {
    dimensionId: "incident_history",
    category: "incident_history",
    sourceName: "JitoSOL official incident-history manual review",
    sourceKind: "manual_review",
    confirmedValueType: "text",
    confirmedValue:
      "Manual review recorded no official JitoSOL incident, advisory, or postmortem source in the reviewed official Jito docs/security pages/blog sources as of 2026-07-12. This is not a clean-history claim and must be rechecked before production release.",
    notes: [
      "Absence of a found incident is not proof of no incidents.",
      "This records that the incident-history review process was completed for this beta-readiness draft.",
      "Recheck before production and before beta launch.",
    ],
    unresolvedQuestions: [],
  },
];

/** All JitoSOL evidence confirmations (source-backed reviewer confirmations). */
export const JITOSOL_EVIDENCE_CONFIRMATIONS: readonly JitoEvidenceConfirmation[] = RAW.map((r) => ({
  protocolId: "jito",
  lstSymbol: "JitoSOL",
  status: r.status ?? "confirmed",
  reviewer: REVIEWER,
  reviewerRole: REVIEWER_ROLE,
  confirmedAsOf: AS_OF,
  productionMetadataUpdated: false,
  evidenceDraftMutated: false,
  scoreAssigned: false,
  ...r,
}));

export function getJitoEvidenceConfirmations(): JitoEvidenceConfirmation[] {
  return [...JITOSOL_EVIDENCE_CONFIRMATIONS];
}

export function getJitoEvidenceConfirmationsByDimension(dimensionId: ProtocolRiskRubricDimensionId): JitoEvidenceConfirmation[] {
  return JITOSOL_EVIDENCE_CONFIRMATIONS.filter((c) => c.dimensionId === dimensionId);
}

export function getJitoEvidenceConfirmationsByCategory(category: JitoEvidenceConfirmationCategory): JitoEvidenceConfirmation[] {
  return JITOSOL_EVIDENCE_CONFIRMATIONS.filter((c) => c.category === category);
}

/**
 * Validate one confirmation. A confirmation is valid only when it is `confirmed`,
 * fully attributed (source/value/as-of/reviewer/role), and writes nothing
 * (production/draft/score all false). A manual incident review counts only when it
 * is `manual_review`, explicitly not a clean-history claim, notes a recheck before
 * production, and has no unresolved questions.
 */
export function validateJitoEvidenceConfirmation(confirmation: JitoEvidenceConfirmation): boolean {
  const baseValid =
    confirmation.status === "confirmed" &&
    confirmation.sourceName.trim().length > 0 &&
    confirmation.confirmedValue.trim().length > 0 &&
    confirmation.confirmedAsOf.trim().length > 0 &&
    confirmation.reviewer.trim().length > 0 &&
    confirmation.reviewerRole.trim().length > 0 &&
    confirmation.productionMetadataUpdated === false &&
    confirmation.evidenceDraftMutated === false &&
    confirmation.scoreAssigned === false;
  if (!baseValid) return false;

  if (confirmation.category === "incident_history") {
    const v = confirmation.confirmedValue.toLowerCase();
    const notesRecheck = confirmation.notes.some((n) => n.toLowerCase().includes("recheck before production"));
    return (
      confirmation.sourceKind === "manual_review" &&
      v.includes("not a clean-history claim") &&
      notesRecheck &&
      confirmation.unresolvedQuestions.length === 0
    );
  }
  return true;
}

export function summarizeJitoEvidenceConfirmations(): JitoEvidenceConfirmationSummary {
  const rows = JITOSOL_EVIDENCE_CONFIRMATIONS;
  const count = (s: JitoEvidenceConfirmationStatus) => rows.filter((c) => c.status === s).length;
  return {
    totalConfirmations: rows.length,
    confirmed: count("confirmed"),
    needsReview: count("needs_review"),
    insufficient: count("insufficient"),
    stale: count("stale"),
    rejected: count("rejected"),
    productionMetadataUpdatedCount: 0,
    evidenceDraftMutatedCount: 0,
    scoreAssignedCount: 0,
    dimensionsCovered: [...new Set(rows.map((c) => c.dimensionId))],
  };
}

/** Rubric dimensions fully supported by valid JitoSOL confirmations (all present ones valid). */
export function getJitoGatherableDimensionsFromConfirmations(): ProtocolRiskRubricDimensionId[] {
  const byDim = new Map<ProtocolRiskRubricDimensionId, JitoEvidenceConfirmation[]>();
  for (const c of JITOSOL_EVIDENCE_CONFIRMATIONS) {
    byDim.set(c.dimensionId, [...(byDim.get(c.dimensionId) ?? []), c]);
  }
  const out: ProtocolRiskRubricDimensionId[] = [];
  for (const [dim, confs] of byDim) {
    if (confs.length > 0 && confs.every(validateJitoEvidenceConfirmation)) out.push(dim);
  }
  return out;
}

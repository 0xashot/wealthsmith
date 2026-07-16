/**
 * riskReviewerRegistry — Step 16H-K. The authorized-reviewer contract, the role model, and the PROPOSED
 * separation-of-duties policy.
 *
 * THE PRODUCTION REGISTRY IS EMPTY, AND THAT IS THE CORRECT STATE. Authorization is a human act. An
 * agent adding itself — or adding a human it believes would consent — is the exact failure this file
 * exists to prevent. Fixtures use clearly-marked synthetic reviewers that the validator refuses to treat
 * as production.
 *
 * ON THE EXISTING CONVENTION: the SOL staking modules record in their headers that scoring was
 * "Ashot-authorized" (e.g. `solLiquidStakingJupsolRiskScore.ts`: "Ashot-authorized for scoring if
 * evidence is complete + fresh"). That is a real, traceable convention — but it is a code comment, it
 * authorizes SCORING only, it is scoped to those candidates, and it produced `assigned_for_review`
 * scores under the DRAFT rubric, explicitly "not a final production score". It is therefore recorded
 * below as a PROPOSED reviewer record awaiting explicit confirmation, not activated. Turning a comment
 * into an active authorization record is a decision only the product owner can make.
 */

export const RISK_REVIEWER_REGISTRY_EXISTS = true;
export const RISK_REVIEWER_AUTHORIZATION_VALIDATION_EXISTS = true;
export const RISK_REVIEWER_ROLE_VALIDATION_EXISTS = true;
export const RISK_SEPARATION_OF_DUTIES_POLICY_PROPOSED = true;
/** Step 16H-K.1 — approved by the product owner. */
export const RISK_SEPARATION_OF_DUTIES_POLICY_APPROVED = true;
/** Step 16H-K.1 — the product owner authorized the initial human reviewer. */
export const AUTHORIZED_PRODUCTION_REVIEWER_CONFIGURED = true;
export const RISK_REVIEWER_AUTHORIZATION_ACTIVE = true;
export const RUBRIC_APPROVER_CONFIGURED = true;

/** Each role authorizes exactly one kind of act. A role never implies another. */
export type RiskReviewerRole =
  | "evidence_preparer"
  | "risk_scorer"
  | "risk_reviewer"
  | "risk_signoff_approver"
  | "rubric_approver"
  | "product_approver";

/** Whether the actor is a person or software. Only `human` may score, review, sign off, or approve. */
export type ReviewerActorKind = "human" | "automated_agent";

export type ReviewerAuthorizationStatus = "proposed" | "active" | "inactive" | "revoked";

export interface RiskReviewerRecord {
  reviewerId: string;
  /** A stable label. Deliberately not an email, home address, or any unnecessary personal data. */
  displayLabel: string;
  actorKind: ReviewerActorKind;
  roles: RiskReviewerRole[];
  team?: string;
  /** Product types this reviewer may act on. Empty = unrestricted within their roles. */
  authorizedProductTypes: string[];
  /** Protocols this reviewer may act on. Empty = unrestricted within their roles. */
  authorizedProtocols: string[];
  status: ReviewerAuthorizationStatus;
  authorizedAt?: string;
  /** A reference to WHERE the authorization is recorded. Never a fabricated signature. */
  authorizationEvidence?: string;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
  revocationReason?: string;
  /** Marks fixture-only records so a synthetic reviewer can never be mistaken for a real one. */
  synthetic?: true;
  notes: string[];
}

/** The canonical product-owner reviewer id. Stable, internal, non-sensitive (no email/PII). */
export const PRODUCT_OWNER_REVIEWER_ID = "ws_product_owner";

/**
 * PRODUCTION reviewers.
 *
 * Step 16H-K.1 — the WealthSmith product owner recorded an EXPLICIT authorization decision. This record
 * exists because a human decided it, and it is transcribed here verbatim; Claude did not infer it, and
 * did not create it in 16H-K when only an informal code-comment convention existed.
 *
 * The display name reuses the repository's existing canonical project-owner identity
 * (`protocolSolLiquidStakingJitoEvidenceConfirmations.ts` → `REVIEWER = "Ashot Gyulzatyan"`).
 *
 * Adding another record — or ever adding an automated agent — requires a new explicit human decision.
 */
const REVIEWERS: RiskReviewerRecord[] = [
  {
    reviewerId: PRODUCT_OWNER_REVIEWER_ID,
    displayLabel: "Ashot Gyulzatyan",
    actorKind: "human",
    // All six roles, per the product owner's explicit decision. The separation-of-duties policy still
    // requires each ACT to be recorded separately with its own role, timestamp, transition and
    // rationale — holding the roles does not collapse the steps.
    roles: ["rubric_approver", "risk_scorer", "risk_reviewer", "risk_signoff_approver", "product_approver", "evidence_preparer"],
    team: "WealthSmith",
    authorizedProductTypes: [],
    authorizedProtocols: [],
    status: "active",
    authorizedAt: "2026-07-16T12:33:58.794Z",
    authorizationEvidence: "Explicit product-owner governance decision recorded in the Step 16H-K.1 task instruction (approve rubric v1.0.0, approve the MVP separation-of-duties policy, and authorize the initial human reviewer).",
    createdAt: "2026-07-16T12:33:58.794Z",
    updatedAt: "2026-07-16T12:33:58.794Z",
    revokedAt: undefined,
    revocationReason: undefined,
    notes: [
      "Authorization scope per the product-owner decision: Solana staking products, Stable Yield products, WealthSmith MVP. `authorizedProductTypes`/`authorizedProtocols` are left empty (= unrestricted within the authorized roles) because that scope spans both current product families; narrow them if the scope is ever reduced.",
      "Sole authorized reviewer. Concentrating six roles in one person is an accepted MVP trade-off, made explicitly rather than by default.",
      "This record is INTERNAL. It must never surface in a suggestion card, review drawer, dashboard, Smith AI answer, analytics payload, or public documentation.",
    ],
  },
];

/**
 * PROPOSED records — NOT authorizations. These are drafts for the product owner to accept, amend, or
 * reject. They are excluded from every lookup: `listAuthorizedReviewers()` never returns them, and the
 * validator rejects a `proposed` record for any action.
 */
export const PROPOSED_REVIEWER_RECORDS: RiskReviewerRecord[] = [
  {
    reviewerId: "proposed_product_owner",
    displayLabel: "WealthSmith product owner",
    actorKind: "human",
    // Proposed roles reflect the existing convention (scoring) plus the roles an MVP needs. The product
    // owner should confirm or narrow this — an MVP may legitimately hold several roles, but each ACT is
    // still recorded separately with its own timestamp and transition.
    roles: ["evidence_preparer", "risk_scorer", "risk_reviewer", "risk_signoff_approver", "rubric_approver", "product_approver"],
    authorizedProductTypes: [],
    authorizedProtocols: [],
    status: "proposed",
    authorizedAt: undefined,
    authorizationEvidence: undefined,
    createdAt: "2026-07-16",
    updatedAt: "2026-07-16",
    notes: [
      "PROPOSED, NOT ACTIVE. Requires the product owner's explicit confirmation to become `active`, with a real authorizedAt and an authorizationEvidence reference.",
      "Basis: the SOL staking modules record 'Ashot-authorized for scoring' in their headers (e.g. solLiquidStakingJupsolRiskScore.ts). That is a genuine existing convention, but it is a code comment authorizing SCORING for those candidates under the DRAFT rubric — not a structured, scoped authorization record, and not signoff or rubric-approval authority.",
      "Holding all six roles concentrates duties in one person. That is a defensible MVP trade-off, but it should be a conscious choice: consider at minimum splitting `rubric_approver` and `risk_signoff_approver` from `risk_scorer` if a second reviewer becomes available.",
    ],
  },
];

const clone = (r: RiskReviewerRecord) => JSON.parse(JSON.stringify(r)) as RiskReviewerRecord;

/** Only ACTIVE production reviewers. Never returns proposed or synthetic records. */
export function listAuthorizedReviewers(): RiskReviewerRecord[] {
  return REVIEWERS.filter((r) => r.status === "active" && !r.synthetic).map(clone);
}

export function getReviewer(reviewerId: string, registry: RiskReviewerRecord[] = REVIEWERS): RiskReviewerRecord | undefined {
  const r = registry.find((x) => x.reviewerId === reviewerId);
  return r ? clone(r) : undefined;
}

export type ReviewerAuthorizationFailure =
  | "reviewer_missing" | "reviewer_unknown" | "reviewer_unauthorized"
  | "reviewer_revoked" | "reviewer_out_of_scope" | "reviewer_is_automated_agent"
  | "reviewer_not_active" | "reviewer_missing_authorization_timestamp";

export type ReviewerAuthorizationResult =
  | { authorized: true; reviewer: RiskReviewerRecord }
  | { authorized: false; reason: ReviewerAuthorizationFailure; detail: string };

/**
 * Validate that a reviewer may perform ONE act on ONE product. Fails closed on every doubt.
 *
 * `registry` is injectable so fixtures can exercise synthetic reviewers without ever touching the
 * production array.
 */
export function authorizeReviewerAction(args: {
  reviewerId?: string;
  role: RiskReviewerRole;
  productType?: string;
  protocolId?: string;
  registry?: RiskReviewerRecord[];
}): ReviewerAuthorizationResult {
  const { reviewerId, role, productType, protocolId } = args;
  const registry = args.registry ?? REVIEWERS;

  if (!reviewerId) return { authorized: false, reason: "reviewer_missing", detail: "no reviewerId supplied" };
  const r = registry.find((x) => x.reviewerId === reviewerId);
  if (!r) return { authorized: false, reason: "reviewer_unknown", detail: `no record for '${reviewerId}'` };

  // An automated agent may never score, review, sign off, or approve. It may only prepare evidence —
  // and even that is recorded as agent-prepared, never as a human act.
  if (r.actorKind === "automated_agent" && role !== "evidence_preparer") {
    return { authorized: false, reason: "reviewer_is_automated_agent", detail: `an automated agent cannot hold '${role}' — only a human may score, review, sign off, or approve` };
  }

  if (r.status === "revoked") return { authorized: false, reason: "reviewer_revoked", detail: `revoked${r.revokedAt ? ` at ${r.revokedAt}` : ""}${r.revocationReason ? `: ${r.revocationReason}` : ""}` };
  if (r.status !== "active") return { authorized: false, reason: "reviewer_not_active", detail: `status is '${r.status}' — a proposed or inactive record authorizes nothing` };
  if (!r.authorizedAt) return { authorized: false, reason: "reviewer_missing_authorization_timestamp", detail: "an active reviewer must record when authorization was granted" };
  if (!r.roles.includes(role)) return { authorized: false, reason: "reviewer_unauthorized", detail: `'${reviewerId}' does not hold role '${role}'` };

  if (productType && r.authorizedProductTypes.length > 0 && !r.authorizedProductTypes.includes(productType)) {
    return { authorized: false, reason: "reviewer_out_of_scope", detail: `not authorized for product type '${productType}'` };
  }
  if (protocolId && r.authorizedProtocols.length > 0 && !r.authorizedProtocols.includes(protocolId)) {
    return { authorized: false, reason: "reviewer_out_of_scope", detail: `not authorized for protocol '${protocolId}'` };
  }
  return { authorized: true, reviewer: clone(r) };
}

/* ------------------------------------------------------------------ *
 * Proposed separation-of-duties policy — PROPOSED, not organization policy.
 * ------------------------------------------------------------------ */
export const SEPARATION_OF_DUTIES_POLICY = {
  policyId: "risk_separation_of_duties_v1",
  // Step 16H-K.1 — APPROVED by the product owner's explicit decision.
  status: "approved" as const,
  approvedBy: PRODUCT_OWNER_REVIEWER_ID,
  approvedAt: "2026-07-16T12:33:58.794Z",
  rules: [
    "Engineers, researchers and agents (including Claude) MAY prepare evidence.",
    "Only an authorized human `risk_scorer` may submit dimension scores.",
    "Only an authorized human `risk_reviewer` may mark scoring reviewed.",
    "Only an authorized human `risk_signoff_approver` may approve a risk record.",
    "Rubric approval requires an authorized human `rubric_approver`.",
    "Product approval is a separate explicit `product_approver` action and is never derived from risk signoff.",
    "In MVP one authorized human MAY hold multiple roles — but each act is recorded separately, with its own actor, timestamp and state transition. Concentrating roles is a trade-off to make consciously, not by default.",
    "Claude and other LLMs may prepare evidence and validate deterministic mechanics. They may NEVER be recorded as a human scorer, reviewer, approver, or signatory.",
  ],
  notes: [
    "APPROVED by the WealthSmith product owner (16H-K.1). This is now the governing policy for MVP risk review.",
    "One authorized human currently holds all six roles. Each act is still recorded separately with its own role, timestamp, state transition and rationale — the roles do not collapse the workflow.",
    "Automated agents remain permanently barred from every role except `evidence_preparer`; that is enforced by `authorizeReviewerAction`, not merely stated here.",
  ],
} as const;

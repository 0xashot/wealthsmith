/**
 * directUsdcLendingSuggestionCard — Step 16H-S.1. Read-only user-facing copy for the Kamino Direct
 * USDC-lending suggestion, plus the Smith AI explanation boundary and approved analytics event shapes.
 *
 * READ-ONLY. Actions are review-only ("View details", "Learn how it works"). No transaction is
 * constructed, no signature requested, no deposit CTA, no "Deposit now / Move funds / Start earning",
 * and nothing implies WealthSmith executes anything.
 *
 * NEVER EXPOSE. The numeric internal risk score (5.93), the thresholds (5.5, 7), any dimension score,
 * any confidence value, and governance implementation details never appear in user-facing copy. The
 * APY is the approved fresh MEASURED APY, prefixed "~", labelled variable, excludes exhausted rewards,
 * and is never called guaranteed. Copy never says safe / low risk / protected / guaranteed / cash
 * equivalent / Safety Buffer product / instant withdrawals / audited current binary / risk-free.
 */

export const DIRECT_USDC_LENDING_CARD_VERSION = "1.0.0" as const;

/* ------------------------------------------------------------------ *
 * Copy (static, reviewed)
 * ------------------------------------------------------------------ */

export const DIRECT_USDC_LENDING_CARD_COPY = {
  eyebrow: "Yield strategy",
  title: "Earn yield on excess USDC",
  description: "Supply excess USDC directly to Kamino’s SOL/BTC lending market.",
  keyFacts: [
    "Direct USDC lending",
    "No management or performance fee",
    "No lockup",
    "Withdrawals depend on available market liquidity",
  ],
  riskDisclosure:
    "Your principal can be reduced after lending losses, and withdrawals can be delayed or temporarily paused.",
  detailPoints: [
    "Borrower-default and liquidation risk",
    "Collateral-oracle risk",
    "Utilization-dependent liquidity",
    "Emergency withdrawal freezes",
    "Losses can be socialized across lenders",
    "Smart-contract and upgrade risk",
    "USDC issuer and depeg risk",
  ],
  apyLabel: "variable APY",
  apyPrefix: "~",
} as const;

/** Review-only actions. No execution, no wallet signature, no deposit CTA. */
export const DIRECT_USDC_LENDING_CARD_ACTIONS = [
  { id: "view_details", label: "View details", actionKind: "review_only", executesTransaction: false, requiresWalletSignature: false, completionOnClick: false },
  { id: "learn_how", label: "Learn how it works", actionKind: "review_only", executesTransaction: false, requiresWalletSignature: false, completionOnClick: false },
] as const;

/* ------------------------------------------------------------------ *
 * APY presentation
 * ------------------------------------------------------------------ */

/** Format the approved fresh measured APY. Input is the already-approved measured percentage number. */
export function formatDirectLendingApy(measuredApyPct: number): string {
  return `${DIRECT_USDC_LENDING_CARD_COPY.apyPrefix}${measuredApyPct.toFixed(2)}% ${DIRECT_USDC_LENDING_CARD_COPY.apyLabel}`;
}

/* ------------------------------------------------------------------ *
 * Card assembly (data only — the shared SuggestionCard renders it)
 * ------------------------------------------------------------------ */

export interface DirectLendingCardModel {
  eyebrow: string;
  title: string;
  description: string;
  apyText: string | null; // null when no approved fresh APY is available
  keyFacts: readonly string[];
  riskDisclosure: string;
  detailPoints: readonly string[];
  actions: typeof DIRECT_USDC_LENDING_CARD_ACTIONS;
  amountText: string | null; // null when no approved deterministic amount exists
}

export function buildDirectLendingCardModel(opts: { measuredApyPct: number | null; amountText: string | null }): DirectLendingCardModel {
  return {
    eyebrow: DIRECT_USDC_LENDING_CARD_COPY.eyebrow,
    title: DIRECT_USDC_LENDING_CARD_COPY.title,
    description: DIRECT_USDC_LENDING_CARD_COPY.description,
    apyText: opts.measuredApyPct == null ? null : formatDirectLendingApy(opts.measuredApyPct),
    keyFacts: DIRECT_USDC_LENDING_CARD_COPY.keyFacts,
    riskDisclosure: DIRECT_USDC_LENDING_CARD_COPY.riskDisclosure,
    detailPoints: DIRECT_USDC_LENDING_CARD_COPY.detailPoints,
    actions: DIRECT_USDC_LENDING_CARD_ACTIONS,
    amountText: opts.amountText,
  };
}

/* ------------------------------------------------------------------ *
 * Forbidden / required copy guards
 * ------------------------------------------------------------------ */

/** Tokens that must NEVER appear anywhere in user-facing copy. */
export const FORBIDDEN_CARD_TOKENS: readonly string[] = [
  "safe", "low risk", "protected", "guaranteed", "guaranteed yield", "guaranteed liquidity",
  "cash equivalent", "safety buffer product", "instant withdrawal", "audited current binary",
  "risk-free", "risk free",
  // internal numbers/thresholds must never leak:
  "5.93", "5.5", " 7 ", "meetsminimum", "dimension score", "confidence",
];

/** The card copy, flattened for scanning. */
export function flattenCardText(model: DirectLendingCardModel): string {
  return [
    model.eyebrow, model.title, model.description, model.apyText ?? "", model.riskDisclosure,
    ...model.keyFacts, ...model.detailPoints, ...model.actions.map((a) => a.label), model.amountText ?? "",
  ].join(" \n ");
}

export function validateCardCopy(model: DirectLendingCardModel = buildDirectLendingCardModel({ measuredApyPct: 6.42, amountText: null })): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const text = flattenCardText(model).toLowerCase();

  for (const t of FORBIDDEN_CARD_TOKENS) if (text.includes(t.toLowerCase())) errors.push(`forbidden token present: "${t.trim()}"`);

  // Required disclosures.
  if (!/principal can be reduced/i.test(model.riskDisclosure)) errors.push("risk disclosure must mention principal loss");
  if (!/(delayed|paused)/i.test(model.riskDisclosure)) errors.push("risk disclosure must mention delayed or paused withdrawals");

  // APY rules (only when present).
  if (model.apyText !== null) {
    if (!model.apyText.startsWith("~")) errors.push("APY must be prefixed with ~");
    if (!/variable/i.test(model.apyText)) errors.push("APY must be labelled variable");
    if (/guaranteed/i.test(model.apyText)) errors.push("APY must not be called guaranteed");
  }

  // Actions must all be review-only and non-executing.
  for (const a of model.actions) {
    if (a.actionKind !== "review_only") errors.push(`action ${a.id} is not review_only`);
    if (a.executesTransaction || a.requiresWalletSignature || a.completionOnClick) errors.push(`action ${a.id} executes/signs/completes`);
    if (/deposit now|move funds|start earning/i.test(a.label)) errors.push(`action ${a.id} uses a forbidden deposit CTA`);
  }

  return { valid: errors.length === 0, errors };
}

export const CARD_COPY_VALIDATION = validateCardCopy();

/* ------------------------------------------------------------------ *
 * Smith AI explanation boundary
 * ------------------------------------------------------------------ */

export const SMITH_AI_DIRECT_LENDING_EXPLANATION =
  "WealthSmith currently supports one reviewed direct-USDC lending option: Kamino’s SOL/BTC Market. " +
  "It is simpler and better evidenced than the alternatives we assessed, but it still carries lending, " +
  "oracle, liquidity and smart-contract risk." ;

/** Step 16H-S.6 — risk-profile compatibility, safe to surface. Never guarantees eligibility. */
export const SMITH_AI_DIRECT_LENDING_COMPATIBILITY =
  "This yield strategy is considered only for users with a Medium or High risk profile, after their Safety " +
  "Buffer is complete and other suitability checks pass.";

export const SMITH_AI_MAY_EXPLAIN: readonly string[] = [
  "why Kamino Direct was selected",
  "why it is direct lending rather than a managed vault",
  "why APY is variable",
  "why withdrawals depend on liquidity",
  "why principal is not guaranteed",
  "why Steakhouse and Jupiter are not suggested",
];

export const SMITH_AI_MUST_NOT_EXPOSE: readonly string[] = [
  "numeric internal scores", "thresholds", "reviewer identities",
  "internal approval mechanics", "unpublished evidence", "deterministic ranking internals",
];

export function validateSmithAiExplanation(text: string = SMITH_AI_DIRECT_LENDING_EXPLANATION): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const t = text.toLowerCase();
  for (const bad of ["safe", "risk-free", "risk free", "5.93", "5.5", "guaranteed"]) if (t.includes(bad)) errors.push(`Smith AI copy exposes/forbids: "${bad}"`);
  if (!/still carries.*risk/i.test(text)) errors.push("Smith AI copy must acknowledge residual risk");
  return { valid: errors.length === 0, errors };
}

export const SMITH_AI_VALIDATION = validateSmithAiExplanation();

/* ------------------------------------------------------------------ *
 * Analytics event shapes (approved fields only)
 * ------------------------------------------------------------------ */

export type DirectLendingAnalyticsEvent =
  | "suggestion_generated" | "suggestion_viewed" | "details_opened"
  | "suggestion_suppressed" | "governance_blocked";

export interface DirectLendingAnalyticsPayload {
  event: DirectLendingAnalyticsEvent;
  candidateId: string;
  suggestionType: "direct_usdc_lending";
  policyVersion: string;
  suppressionReason: string | null;
  freshnessState: "fresh" | "stale" | "unavailable" | "n/a";
}

/** Fields that must NEVER be sent. Used by the fixture to prove they are absent. */
export const ANALYTICS_FORBIDDEN_FIELDS: readonly string[] = [
  "internalScore", "score", "dimensionScores", "reviewerId", "reviewerIdentity", "walletBalance",
];

export function buildAnalyticsPayload(p: DirectLendingAnalyticsPayload): DirectLendingAnalyticsPayload {
  // Whitelist construction — only approved keys can be present.
  return {
    event: p.event,
    candidateId: p.candidateId,
    suggestionType: "direct_usdc_lending",
    policyVersion: p.policyVersion,
    suppressionReason: p.suppressionReason,
    freshnessState: p.freshnessState,
  };
}

/* ------------------------------------------------------------------ *
 * Manifest + hash
 * ------------------------------------------------------------------ */

export const DIRECT_LENDING_CARD_MANIFEST = {
  version: DIRECT_USDC_LENDING_CARD_VERSION,
  title: DIRECT_USDC_LENDING_CARD_COPY.title,
  description: DIRECT_USDC_LENDING_CARD_COPY.description,
  riskDisclosure: DIRECT_USDC_LENDING_CARD_COPY.riskDisclosure,
  actionIds: DIRECT_USDC_LENDING_CARD_ACTIONS.map((a) => a.id),
  smithAi: SMITH_AI_DIRECT_LENDING_EXPLANATION,
} as const;

export function computeCardManifestHash(m: typeof DIRECT_LENDING_CARD_MANIFEST = DIRECT_LENDING_CARD_MANIFEST): string {
  const material = JSON.stringify({ v: m.version, t: m.title, d: m.description, r: m.riskDisclosure, a: m.actionIds, s: m.smithAi });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `direct_card_${h.toString(16).padStart(8, "0")}`;
}

export const DIRECT_LENDING_CARD_MANIFEST_HASH = computeCardManifestHash();

/**
 * contributionPricePolicy — Step 15C. The canonical contribution-planning PRICE CONTRACT + freshness
 * policy. It defines the shape of a validated price quote and evaluates one for freshness /
 * provenance / approved source — it fetches NOTHING and adds no browser price call.
 *
 * PRICE SOURCE ORDER (approved, non-browser-provider): (1) the backend-normalized portfolio/token
 * USD valuation, (2) the canonical internal token-price service (`wallet/tokenPrices.ts`, behind
 * which DefiLlama/Jupiter sit — never called from React for contribution pricing), (3) a same-origin
 * sanitized runtime payload owned by WealthSmith. A browser-fetched external-provider price is
 * rejected. SOL contribution pricing must be <= 60 minutes old (formalized v1; there is no stricter
 * canonical constant to reuse). USDC funding uses the portfolio's existing normalized USD valuation
 * (not blindly hardcoded to $1 when a real normalized price exists).
 */
import {
  CONTRIBUTION_PLANNING_POLICY_SCHEMA_VERSION,
  CONTRIBUTION_PRICE_POLICY_ID,
  CONTRIBUTION_PRICE_POLICY_VERSION,
} from "./contributionPlanningPolicyTypes";

export const CONTRIBUTION_PRICE_POLICY_EXISTS = true;
/** SOL contribution-planning price freshness: 60 minutes (formalized Step 15A default → v1). */
export const SOL_CONTRIBUTION_PRICE_MAX_AGE_MS = 60 * 60 * 1000;
/** Small clock-skew tolerance for a fetchedAt slightly ahead of checkedAt. */
export const CONTRIBUTION_PRICE_FUTURE_SKEW_MS = 5000;

/** Approved contribution-price source IDs (non-browser-provider), in preference order. */
export const APPROVED_CONTRIBUTION_PRICE_SOURCE_IDS: readonly string[] = [
  "portfolio_normalized_usd",
  "token_price_service",
  "same_origin_runtime_payload",
];
/** The canonical internal token-price service id used for SOL contribution pricing. */
export const CANONICAL_CONTRIBUTION_PRICE_SOURCE_ID = "token_price_service";

export type ContributionPriceStatus = "fresh" | "stale" | "unavailable" | "invalid";

export interface ContributionPriceQuote {
  targetId: string;
  assetId: string;
  priceUsd: number;
  sourceId: string;
  sourceLabel?: string;
  fetchedAt: string;
  checkedAt: string;
  maximumAgeMs: number;
  status: ContributionPriceStatus;
  browserFetched: false;
  sameOriginOrBackendNormalized: true;
  blockers: string[];
  warnings: string[];
}

export interface ContributionPriceQuoteInput {
  targetId: string;
  assetId: string;
  priceUsd?: unknown;
  sourceId?: unknown;
  sourceLabel?: string;
  fetchedAt?: unknown;
  checkedAt: string;
  maximumAgeMs?: number;
  /** True is REJECTED — the browser must not call external price providers for contribution pricing. */
  browserFetched?: boolean;
}

/**
 * Evaluate a contribution price quote for a target. Returns a normalized `ContributionPriceQuote`
 * with a computed status + blockers. `undefined` input → unavailable/price_missing (fail closed).
 */
export function evaluateContributionPriceQuote(input: ContributionPriceQuoteInput | undefined, options: { maximumAgeMs?: number } = {}): ContributionPriceQuote {
  const maximumAgeMs = options.maximumAgeMs ?? input?.maximumAgeMs ?? SOL_CONTRIBUTION_PRICE_MAX_AGE_MS;
  const base: ContributionPriceQuote = {
    targetId: input?.targetId ?? "",
    assetId: input?.assetId ?? "",
    priceUsd: NaN,
    sourceId: typeof input?.sourceId === "string" ? input.sourceId : "",
    ...(input?.sourceLabel ? { sourceLabel: input.sourceLabel } : {}),
    fetchedAt: typeof input?.fetchedAt === "string" ? input.fetchedAt : "",
    checkedAt: input?.checkedAt ?? "",
    maximumAgeMs,
    status: "unavailable",
    browserFetched: false,
    sameOriginOrBackendNormalized: true,
    blockers: [],
    warnings: [],
  };

  if (!input) return { ...base, status: "unavailable", blockers: ["price_missing"] };

  // A browser-fetched external-provider price is never accepted for contribution pricing.
  if (input.browserFetched === true) return { ...base, status: "invalid", blockers: ["price_source_unapproved"] };

  const blockers: string[] = [];
  if (!input.targetId || !input.assetId) blockers.push("price_provenance_missing");
  if (typeof input.sourceId !== "string" || input.sourceId.length === 0) blockers.push("price_provenance_missing");
  else if (!APPROVED_CONTRIBUTION_PRICE_SOURCE_IDS.includes(input.sourceId)) blockers.push("price_source_unapproved");

  // Price value.
  if (input.priceUsd == null) return { ...base, status: "unavailable", blockers: [...blockers, "price_unavailable"] };
  if (typeof input.priceUsd !== "number" || !Number.isFinite(input.priceUsd) || input.priceUsd <= 0) return { ...base, status: "invalid", blockers: [...blockers, "price_invalid"] };
  const priceUsd = input.priceUsd;

  // Timestamps.
  const fetchedMs = typeof input.fetchedAt === "string" ? Date.parse(input.fetchedAt) : NaN;
  const checkedMs = Date.parse(input.checkedAt);
  if (Number.isNaN(fetchedMs) || Number.isNaN(checkedMs)) return { ...base, priceUsd, status: "invalid", blockers: [...blockers, "price_invalid"] };
  if (fetchedMs - checkedMs > CONTRIBUTION_PRICE_FUTURE_SKEW_MS) return { ...base, priceUsd, status: "invalid", blockers: [...blockers, "price_timestamp_in_future"] };

  const age = checkedMs - fetchedMs;
  if (age > maximumAgeMs) blockers.push("price_stale");

  // Any provenance / source / stale blocker means not fresh.
  const hasStale = blockers.includes("price_stale");
  const hasHardFault = blockers.some((b) => b === "price_source_unapproved" || b === "price_provenance_missing");
  const status: ContributionPriceStatus = hasHardFault ? "invalid" : hasStale ? "stale" : "fresh";
  return { ...base, priceUsd, status, blockers };
}

export interface ContributionPriceValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate a normalized quote is a well-formed, approved, fresh contribution price. Fails closed. */
export function validateContributionPriceQuote(quote: unknown): ContributionPriceValidationResult {
  const errors: string[] = [];
  if (!quote || typeof quote !== "object") return { valid: false, errors: ["quote_not_an_object"] };
  const q = quote as ContributionPriceQuote;
  if (q.browserFetched !== false) errors.push("browser_fetched");
  if (q.sameOriginOrBackendNormalized !== true) errors.push("not_same_origin_or_backend");
  if (!APPROVED_CONTRIBUTION_PRICE_SOURCE_IDS.includes(q.sourceId)) errors.push("unapproved_source");
  if (!(typeof q.priceUsd === "number" && Number.isFinite(q.priceUsd) && q.priceUsd > 0)) errors.push("invalid_price");
  if (q.status !== "fresh") errors.push("not_fresh");
  if (q.blockers.length > 0) errors.push("has_blockers");
  return { valid: errors.length === 0, errors };
}

export interface ContributionPriceDiagnostics {
  policyId: string;
  policyVersion: string;
  schemaVersion: string;
  targetId: string;
  priceUsd: number;
  sourceId: string;
  fetchedAt: string;
  checkedAt: string;
  maximumAgeMs: number;
  status: ContributionPriceStatus;
  browserFetched: false;
  blockers: string[];
  warnings: string[];
}

export function getContributionPriceDiagnostics(quote: ContributionPriceQuote): ContributionPriceDiagnostics {
  return {
    policyId: CONTRIBUTION_PRICE_POLICY_ID,
    policyVersion: CONTRIBUTION_PRICE_POLICY_VERSION,
    schemaVersion: CONTRIBUTION_PLANNING_POLICY_SCHEMA_VERSION,
    targetId: quote.targetId,
    priceUsd: quote.priceUsd,
    sourceId: quote.sourceId,
    fetchedAt: quote.fetchedAt,
    checkedAt: quote.checkedAt,
    maximumAgeMs: quote.maximumAgeMs,
    status: quote.status,
    browserFetched: false,
    blockers: quote.blockers,
    warnings: quote.warnings,
  };
}

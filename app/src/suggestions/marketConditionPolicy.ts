/**
 * marketConditionPolicy — Step 22C. NON-MOUNTED source-identity + source-specific freshness governance for the
 * Market Conditions (Fear & Greed) input. Mirrors the repo's price/APY governance pattern (exact approved source
 * ids, exact methodology, no "any F&G API" approval, no symbol-only matching, no fallback without approval).
 *
 * NO source is approved in production. The registry documents ONE candidate (the public crypto Fear & Greed index)
 * with `approvalState: "pending"` so production readiness stays DEGRADED — nothing is silently designated approved
 * and no provider credentials are invented. Fixtures inject their OWN approved source + freshness policy to exercise
 * the full path; those fixture-only policies never enter mounted production (the assessment takes the registries as
 * arguments, so production passes these pending registries and fixtures pass approved ones).
 */
import type {
  MarketSourcePolicyState,
  MarketFreshnessSignal,
  MarketConditionObservation,
} from "./marketConditionTypes";

export type MarketSourceApprovalState = "approved" | "pending" | "missing" | "deprecated";

export interface MarketConditionSource {
  sourceId: string;
  indexId: string;
  displayName: string;
  provider: string;
  /** Approved interpretation of what the index measures — a broad-market composite, NOT Solana/per-asset sentiment. */
  marketScope: string;
  methodology: string;
  methodologyVersion: string;
  scoreRange: readonly [number, number];
  publicationCadence: string;
  observationTimestampSemantics: string;
  /** Internal governance documentation reference only (never fetched at runtime). */
  sourceUrl: string;
  approvalState: MarketSourceApprovalState;
  approvalDate: string | null;
  approvedBy: string | null;
  invalidationReason: string | null;
}

/**
 * ALL KNOWN source records (approved or not). The candidate is DOCUMENTED, not approved — production stays degraded
 * until a product owner explicitly authorizes it (which requires an approved freshness policy tied to its real
 * publication cadence). This registry is what identity/methodology checks match against ("known but pending" is
 * distinct from "unknown"). Approval is NEVER inferred from the registry name — use `APPROVED_MARKET_CONDITION_SOURCES`
 * (the filtered view) or `isApprovedMarketConditionSource` (which checks `approvalState`).
 */
export const MARKET_CONDITION_SOURCES: readonly MarketConditionSource[] = [
  {
    // APPROVED (Step 22E, product owner, 2026-07-22). BROAD crypto-market sentiment proxy (large-cap/composite;
    // important BTC/ETH-weighted components). NOT Solana-specific, NOT equal-weighted all-token, NOT per-asset or
    // portfolio-specific, NOT a prediction/trade signal. Single approved MVP source; no automatic fallback exists.
    sourceId: "coinmarketcap_crypto_fear_greed",
    indexId: "cmc_crypto_fear_greed",
    displayName: "CMC Crypto Fear & Greed Index",
    provider: "CoinMarketCap",
    marketScope: "broad_crypto_large_cap_composite",
    methodology: "cmc_crypto_fear_greed_composite",
    methodologyVersion: "cmc_fng_methodology_2026_1",
    scoreRange: [0, 100],
    publicationCadence: "daily",
    observationTimestampSemantics: "source_update_time",
    sourceUrl: "https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest",
    approvalState: "approved",
    approvalDate: "2026-07-22",
    approvedBy: "product_owner",
    invalidationReason: null,
  },
];

/**
 * ONLY explicitly-approved source records — the trustworthy allowlist. Currently EMPTY (the candidate is pending),
 * so production readiness is degraded. A pending source can never leak in here because it is a filtered view of the
 * `approvalState` field, not a rename of the full registry.
 */
export const APPROVED_MARKET_CONDITION_SOURCES: readonly MarketConditionSource[] =
  MARKET_CONDITION_SOURCES.filter((s) => s.approvalState === "approved");

/** The canonical APPROVED source id (Step 22E — CoinMarketCap). */
export const CANONICAL_MARKET_CONDITION_SOURCE_ID = "coinmarketcap_crypto_fear_greed";

/** Source-specific freshness policy (never a global default; tied to the exact source + index + methodology). */
export interface MarketConditionFreshnessPolicy {
  sourceId: string;
  indexId: string;
  methodology: string;
  methodologyVersion: string;
  policyState: MarketSourcePolicyState;
  freshnessSignal: MarketFreshnessSignal;
  /** Maximum age of the SOURCE observation (observedAt), never of retrievedAt. Null when the signal is not age-based. */
  maximumObservationAgeMs: number | null;
  publicationCadence: string;
  gracePeriodMs: number | null;
  evidenceSource: string;
  approvedAt: string | null;
  invalidationReason: string | null;
}

/** Total observation-age budget for the approved CoinMarketCap policy: 36 hours (daily publication + grace), in ms. */
export const CMC_FEAR_GREED_MAX_OBSERVATION_AGE_MS = 36 * 60 * 60 * 1000;

/**
 * Production freshness registry (Step 22E). Exactly one APPROVED source-specific policy — CoinMarketCap. Freshness is
 * proven ONLY by `observedAt` (retrievedAt is provenance, never a freshness shortcut; a current refresh never refreshes
 * an old observation). Max observation age 36h captures the daily publication interval + operational grace as a single
 * bound (gracePeriodMs 0). Changing the provider methodology requires a NEW policy version. No global default window.
 */
export const MARKET_CONDITION_FRESHNESS_POLICIES: readonly MarketConditionFreshnessPolicy[] = [
  {
    sourceId: "coinmarketcap_crypto_fear_greed",
    indexId: "cmc_crypto_fear_greed",
    methodology: "cmc_crypto_fear_greed_composite",
    methodologyVersion: "cmc_fng_methodology_2026_1",
    policyState: "approved",
    freshnessSignal: "source_observed_at",
    maximumObservationAgeMs: CMC_FEAR_GREED_MAX_OBSERVATION_AGE_MS,
    publicationCadence: "daily",
    gracePeriodMs: 0,
    evidenceSource: "cmc_v3_fear_and_greed_latest_update_time",
    approvedAt: "2026-07-22",
    invalidationReason: null,
  },
];

/** Resolve a source registry entry by id (undefined when absent). */
export function resolveMarketConditionSource(
  sources: readonly MarketConditionSource[],
  sourceId: string,
): MarketConditionSource | undefined {
  return sources.find((s) => s.sourceId === sourceId);
}

/** Resolve the source-specific freshness policy by exact source + index (undefined when absent). */
export function resolveMarketConditionFreshnessPolicy(
  policies: readonly MarketConditionFreshnessPolicy[],
  sourceId: string,
  indexId: string,
): MarketConditionFreshnessPolicy | undefined {
  return policies.find((p) => p.sourceId === sourceId && p.indexId === indexId);
}

/** True only when a source entry exists and is explicitly approved. */
export function isApprovedMarketConditionSource(source: MarketConditionSource | undefined): boolean {
  return source != null && source.approvalState === "approved";
}

/**
 * Classify the governance state of an observation's source against a source registry. Distinguishes a clean
 * methodology/index mismatch (a governed source id exists but the methodology or index differs) from a fully
 * unapproved/unknown source. Never approves by name/symbol alone.
 */
export function evaluateMarketConditionSourceGovernance(
  observation: Pick<MarketConditionObservation, "sourceId" | "indexId" | "methodology" | "methodologyVersion">,
  sources: readonly MarketConditionSource[],
): { policyState: MarketSourcePolicyState; methodologyMismatch: boolean; source?: MarketConditionSource } {
  const source = resolveMarketConditionSource(sources, observation.sourceId);
  if (!source) return { policyState: "missing", methodologyMismatch: false };
  const identityMatches =
    source.indexId === observation.indexId &&
    source.methodology === observation.methodology &&
    source.methodologyVersion === observation.methodologyVersion;
  if (!identityMatches) return { policyState: "invalid", methodologyMismatch: true, source };
  if (source.approvalState !== "approved") return { policyState: "unsupported", methodologyMismatch: false, source };
  return { policyState: "approved", methodologyMismatch: false, source };
}

/** Structural validation of a source registry (score range within 0–100, non-empty identity fields). */
export function validateMarketConditionSourceRegistry(
  sources: readonly MarketConditionSource[],
): string[] {
  const errors: string[] = [];
  for (const s of sources) {
    if (!s.sourceId) errors.push("source_missing_id");
    if (!s.indexId) errors.push(`source_${s.sourceId}_missing_index`);
    if (!s.methodology || !s.methodologyVersion) errors.push(`source_${s.sourceId}_missing_methodology`);
    const [lo, hi] = s.scoreRange;
    if (!(Number.isFinite(lo) && Number.isFinite(hi) && lo >= 0 && hi <= 100 && lo < hi)) {
      errors.push(`source_${s.sourceId}_bad_score_range`);
    }
    if (s.approvalState === "approved" && (!s.approvalDate || !s.approvedBy)) {
      errors.push(`source_${s.sourceId}_approved_without_authorization`);
    }
  }
  return errors;
}

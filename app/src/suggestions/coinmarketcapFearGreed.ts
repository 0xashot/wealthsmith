/**
 * coinmarketcapFearGreed — Step 22E. PURE, deterministic parsing + observation/cache building for the approved
 * CoinMarketCap CMC Crypto Fear & Greed source. NO network, NO secrets, NO React, NO engine coupling — the offline
 * refresh script performs the actual fetch and calls these pure helpers. WealthSmith's canonical band is ALWAYS
 * recomputed from the numeric score; the provider's `value_classification` is retained only as evidence and never
 * changes the band. No score is invented; malformed/absent data fails closed.
 */
import {
  classifyMarketConditionScore,
  MARKET_BAND_DISPLAY_LABEL,
  type MarketConditionBand,
} from "./marketConditionTypes";
import {
  CANONICAL_MARKET_CONDITION_SOURCE_ID,
  MARKET_CONDITION_SOURCES,
  CMC_FEAR_GREED_MAX_OBSERVATION_AGE_MS,
  resolveMarketConditionSource,
  type MarketConditionSource,
} from "./marketConditionPolicy";
import { MARKET_CONDITION_CACHE_VERSION, validateMarketConditionCache, type MarketConditionCache } from "./marketConditionCache";

export const CMC_FNG_RAW_PAYLOAD_VERSION = "cmc_v3_fear_and_greed_latest_1";

/** The sanitized result of parsing a CoinMarketCap response — never carries the raw payload, headers, or key. */
export interface CmcFearGreedAdapterResult {
  sourceId: string;
  indexId: string;
  indexName: string;
  methodology: string;
  methodologyVersion: string;
  score: number;
  providerClassification: string | null;
  observedAtMs: number;
  observedAt: string;
  retrievedAtMs: number;
  retrievedAt: string;
  rawPayloadVersion: string;
  evidence: string[];
}

export interface CmcParseResult {
  ok: boolean;
  errors: string[];
  result?: CmcFearGreedAdapterResult;
}

/** Map a CoinMarketCap value_classification string to a canonical band, for evidence comparison ONLY. */
export function providerClassificationToBand(classification: string | null | undefined): MarketConditionBand | null {
  if (typeof classification !== "string") return null;
  const norm = classification.trim().toLowerCase();
  switch (norm) {
    case "extreme fear": return "extreme_fear";
    case "fear": return "fear";
    case "neutral": return "neutral";
    case "greed": return "greed";
    case "extreme greed": return "extreme_greed";
    default: return null;
  }
}

const approvedCmcSource = (): MarketConditionSource | undefined =>
  resolveMarketConditionSource(MARKET_CONDITION_SOURCES, CANONICAL_MARKET_CONDITION_SOURCE_ID);

/** Parse a CMC unix-seconds (string or number) timestamp to ms. Returns null when malformed/non-positive. */
function parseObservationTimestampMs(ts: unknown): number | null {
  if (typeof ts === "number" && Number.isFinite(ts) && ts > 0) return Math.round(ts * 1000);
  if (typeof ts === "string" && /^\d+$/.test(ts.trim())) {
    const n = Number(ts.trim());
    return Number.isFinite(n) && n > 0 ? n * 1000 : null;
  }
  // ISO fallback (some CMC responses use ISO strings).
  if (typeof ts === "string") { const p = Date.parse(ts); return Number.isNaN(p) ? null : p; }
  return null;
}

/**
 * Parse + validate a CoinMarketCap `v3/fear-and-greed/historical` JSON response and select the LATEST valid
 * observation by timestamp (never relying on array order). Validates provider status, non-empty data, numeric score
 * in [0,100], and a valid timestamp. Provider classification is captured but NOT trusted for banding.
 */
export function parseCoinMarketCapFearGreedResponse(json: unknown, opts: { retrievedAtMs: number }): CmcParseResult {
  const errors: string[] = [];
  const source = approvedCmcSource();
  if (!source) return { ok: false, errors: ["approved_cmc_source_missing"] };
  if (!json || typeof json !== "object") return { ok: false, errors: ["malformed_json"] };
  const body = json as { status?: unknown; data?: unknown };

  // Provider status.
  const status = body.status as { error_code?: unknown; error_message?: unknown } | undefined;
  if (!status || typeof status !== "object") errors.push("missing_status");
  else if (status.error_code != null && Number(status.error_code) !== 0) errors.push(`provider_status_error_${status.error_code}`);

  // Data. The `/latest` endpoint returns a single object ({ value, update_time, value_classification }); the
  // `/historical` endpoint returns an array of { timestamp, value, value_classification }. Accept both and select
  // the LATEST valid observation by timestamp. The observation time is `update_time` (ISO) when present, else the
  // unix-seconds `timestamp` — never array order.
  const rawData = body.data;
  const records: Array<Record<string, unknown>> = Array.isArray(rawData)
    ? (rawData as Array<Record<string, unknown>>)
    : (rawData && typeof rawData === "object" ? [rawData as Record<string, unknown>] : []);
  if (records.length === 0) { errors.push("empty_data"); return { ok: false, errors }; }

  let best: { ms: number; value: number; classification: string | null } | null = null;
  for (const item of records) {
    const ms = parseObservationTimestampMs(item.update_time ?? item.timestamp);
    const value = typeof item.value === "number" ? item.value : (typeof item.value === "string" && /^\d+(\.\d+)?$/.test(item.value) ? Number(item.value) : NaN);
    if (ms == null || !Number.isFinite(value)) continue;
    if (best == null || ms > best.ms) best = { ms, value, classification: typeof item.value_classification === "string" ? item.value_classification : null };
  }
  if (best == null) { errors.push("no_valid_observation"); return { ok: false, errors }; }

  // Score validation (no rounding, no clamping).
  if (!Number.isFinite(best.value)) errors.push("non_finite_score");
  else if (best.value < 0) errors.push("score_below_0");
  else if (best.value > 100) errors.push("score_above_100");
  if (best.ms > opts.retrievedAtMs) errors.push("observed_after_retrieved");
  if (errors.length > 0) return { ok: false, errors };

  const evidence = [`observation_timestamp=${new Date(best.ms).toISOString()}`, `records_considered=${records.length}`];
  if (best.classification) evidence.push(`provider_classification=${best.classification}`);

  return {
    ok: true,
    errors: [],
    result: {
      sourceId: source.sourceId,
      indexId: source.indexId,
      indexName: source.displayName,
      methodology: source.methodology,
      methodologyVersion: source.methodologyVersion,
      score: best.value,
      providerClassification: best.classification,
      observedAtMs: best.ms,
      observedAt: new Date(best.ms).toISOString(),
      retrievedAtMs: opts.retrievedAtMs,
      retrievedAt: new Date(opts.retrievedAtMs).toISOString(),
      rawPayloadVersion: CMC_FNG_RAW_PAYLOAD_VERSION,
      evidence,
    },
  };
}

export interface CmcCacheBuildResult {
  ok: boolean;
  errors: string[];
  cache?: MarketConditionCache;
  providerBandMismatch?: boolean;
}

/**
 * Build + validate the published cache artifact from a parsed adapter result. Recomputes the canonical band, derives
 * `validUntil = observedAt + maxObservationAgeMs`, records provider-classification agreement as evidence (a mismatch
 * is a warning, NOT a rejection), and runs the full cache validator. Never includes the raw payload or secrets.
 */
export function buildMarketConditionCacheFromAdapterResult(
  r: CmcFearGreedAdapterResult,
  opts: { generatedAtMs: number; maxObservationAgeMs?: number; knownSources?: readonly MarketConditionSource[] },
): CmcCacheBuildResult {
  const band = classifyMarketConditionScore(r.score);
  if (band == null) return { ok: false, errors: ["canonical_band_unclassifiable"] };
  const providerBand = providerClassificationToBand(r.providerClassification);
  const providerBandMismatch = providerBand != null && providerBand !== band;
  const maxAge = opts.maxObservationAgeMs ?? CMC_FEAR_GREED_MAX_OBSERVATION_AGE_MS;
  const evidence = [
    ...r.evidence,
    `canonical_band=${band} (${MARKET_BAND_DISPLAY_LABEL[band]})`,
    providerBand == null
      ? "provider_classification_unmapped"
      : providerBandMismatch
        ? `provider_classification_mismatch:${providerBand}`
        : "provider_classification_matches",
  ];
  const cache: MarketConditionCache = {
    cacheVersion: MARKET_CONDITION_CACHE_VERSION,
    generatedAt: new Date(opts.generatedAtMs).toISOString(),
    sourceId: r.sourceId,
    indexId: r.indexId,
    indexName: r.indexName,
    methodology: r.methodology,
    methodologyVersion: r.methodologyVersion,
    score: r.score,
    band,
    observedAt: r.observedAt,
    retrievedAt: r.retrievedAt,
    validUntil: new Date(r.observedAtMs + maxAge).toISOString(),
    retrievalState: "retrieved_current_refresh",
    evidence,
    rawPayloadVersion: r.rawPayloadVersion,
  };
  const validation = validateMarketConditionCache(cache, { knownSources: opts.knownSources ?? MARKET_CONDITION_SOURCES });
  if (!validation.valid) return { ok: false, errors: validation.errors, providerBandMismatch };
  return { ok: true, errors: [], cache, providerBandMismatch };
}

export type CachePublishAction = "publish" | "skip_idempotent" | "skip_older" | "skip_invalid";
export interface CachePublishDecision { action: CachePublishAction; reason: string }

/**
 * Decide whether a freshly-built candidate cache should replace the existing artifact. Preserves last-known-valid:
 * an OLDER observation never replaces a newer cache; an identical observation is an idempotent no-op; a newer (or
 * first) observation publishes. Purely a decision — the caller performs the atomic write.
 */
export function resolveCachePublishDecision(
  existing: Pick<MarketConditionCache, "observedAt" | "score" | "band"> | null,
  candidate: Pick<MarketConditionCache, "observedAt" | "score" | "band">,
): CachePublishDecision {
  if (!existing) return { action: "publish", reason: "no_existing_cache" };
  const prev = Date.parse(existing.observedAt);
  const next = Date.parse(candidate.observedAt);
  if (Number.isNaN(prev) || Number.isNaN(next)) return { action: "publish", reason: "existing_timestamp_unparseable" };
  if (next > prev) return { action: "publish", reason: "newer_observation" };
  if (next < prev) return { action: "skip_older", reason: "candidate_observation_older_than_cache" };
  // Same observedAt: idempotent only when content is equivalent (avoid unnecessary churn).
  if (existing.score === candidate.score && existing.band === candidate.band) return { action: "skip_idempotent", reason: "same_observation_equivalent_content" };
  return { action: "publish", reason: "same_observation_changed_content" };
}

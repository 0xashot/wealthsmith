/**
 * marketConditionCache — Step 22C. NON-MOUNTED published-cache schema + validator for the Market Conditions input.
 * Mirrors the repo's published market-cache pattern: the deterministic app consumes a VALIDATED, provenance-stamped
 * static artifact — it never fetches the Fear & Greed source. The cache excludes provider secrets and raw payloads
 * (only a `rawPayloadVersion` tag is allowed). Validation recomputes the band internally and rejects a provider band
 * that disagrees. A failed refresh must NOT overwrite a valid cache (that is enforced by the publish workflow; the
 * validator here rejects malformed inputs so a bad artifact never validates).
 */
import {
  classifyMarketConditionScore,
  type MarketConditionBand,
  type MarketConditionObservation,
  type MarketRetrievalState,
} from "./marketConditionTypes";
import {
  evaluateMarketConditionSourceGovernance,
  type MarketConditionSource,
} from "./marketConditionPolicy";

export const MARKET_CONDITION_CACHE_VERSION = "market_condition_cache_1.0.0";

/** The published, validated artifact. No raw payloads, no secrets. */
export interface MarketConditionCache {
  cacheVersion: string;
  generatedAt: string;
  sourceId: string;
  indexId: string;
  indexName: string;
  methodology: string;
  methodologyVersion: string;
  score: number;
  band: MarketConditionBand;
  observedAt: string;
  retrievedAt: string;
  validUntil?: string | null;
  retrievalState: MarketRetrievalState;
  evidence: string[];
  rawPayloadVersion?: string;
  /** Optional integrity metadata where the cache architecture supports it. */
  checksum?: string;
}

export interface MarketConditionCacheValidation {
  valid: boolean;
  errors: string[];
  observation?: MarketConditionObservation;
}

const isIso = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));
const BANDS: readonly MarketConditionBand[] = ["extreme_fear", "fear", "neutral", "greed", "extreme_greed"];

/**
 * Validate a candidate published cache against the schema + an approved-source registry. On success returns the
 * governed observation (no raw payload). Rejects: missing/unknown source, source/methodology/index mismatch,
 * non-finite/<0/>100 score, incorrect band (recomputed), malformed timestamps, observedAt after retrievedAt (without
 * supported semantics), expired validUntil, unknown cache version, and malformed evidence.
 */
export function validateMarketConditionCache(
  input: unknown,
  opts: { knownSources: readonly MarketConditionSource[]; now?: number },
): MarketConditionCacheValidation {
  const errors: string[] = [];
  if (!input || typeof input !== "object") return { valid: false, errors: ["cache_not_an_object"] };
  const c = input as Partial<MarketConditionCache>;

  if (c.cacheVersion !== MARKET_CONDITION_CACHE_VERSION) errors.push("unknown_cache_version");
  if (typeof c.sourceId !== "string" || c.sourceId.length === 0) errors.push("missing_source_id");
  if (typeof c.indexId !== "string" || c.indexId.length === 0) errors.push("missing_index_id");
  if (typeof c.methodology !== "string" || typeof c.methodologyVersion !== "string") errors.push("missing_methodology");

  // Score: finite, within 0–100.
  const score = c.score;
  if (typeof score !== "number" || !Number.isFinite(score)) errors.push("non_finite_score");
  else if (score < 0) errors.push("score_below_0");
  else if (score > 100) errors.push("score_above_100");

  // Band: recompute and compare (reject provider mismatch).
  const recomputed = typeof score === "number" ? classifyMarketConditionScore(score) : null;
  if (typeof c.band !== "string" || !BANDS.includes(c.band)) errors.push("malformed_band");
  else if (recomputed == null) errors.push("band_unclassifiable_score");
  else if (recomputed !== c.band) errors.push("band_mismatch");

  // Timestamps.
  if (!isIso(c.generatedAt)) errors.push("malformed_generated_at");
  if (!isIso(c.observedAt)) errors.push("malformed_observed_at");
  if (!isIso(c.retrievedAt)) errors.push("malformed_retrieved_at");
  if (c.validUntil != null && !isIso(c.validUntil)) errors.push("malformed_valid_until");
  if (isIso(c.observedAt) && isIso(c.retrievedAt) && Date.parse(c.observedAt) > Date.parse(c.retrievedAt)) {
    // Allowed only for sources whose semantics support observedAt after retrievedAt (none supported in MVP).
    errors.push("observed_after_retrieved");
  }
  if (c.validUntil != null && isIso(c.validUntil) && typeof opts.now === "number" && Date.parse(c.validUntil) < opts.now) {
    errors.push("valid_until_expired");
  }

  if (!Array.isArray(c.evidence) || c.evidence.some((e) => typeof e !== "string")) errors.push("malformed_evidence");

  // Source governance (must be a known source; approval is separate and checked in the assessment).
  if (typeof c.sourceId === "string" && typeof c.indexId === "string" && typeof c.methodology === "string" && typeof c.methodologyVersion === "string") {
    const gov = evaluateMarketConditionSourceGovernance(
      { sourceId: c.sourceId, indexId: c.indexId, methodology: c.methodology, methodologyVersion: c.methodologyVersion },
      opts.knownSources,
    );
    if (gov.policyState === "missing") errors.push("source_unknown");
    else if (gov.methodologyMismatch) errors.push("source_methodology_mismatch");
  }

  if (errors.length > 0) return { valid: false, errors };

  const observation: MarketConditionObservation = {
    sourceId: c.sourceId as string,
    indexId: c.indexId as string,
    indexName: (c.indexName as string) ?? (c.indexId as string),
    methodology: c.methodology as string,
    methodologyVersion: c.methodologyVersion as string,
    rawScore: score as number,
    normalizedScore: score as number,
    band: c.band as MarketConditionBand,
    observedAt: c.observedAt as string,
    retrievedAt: c.retrievedAt as string,
    validUntil: c.validUntil ?? null,
    retrievalState: c.retrievalState ?? "cached",
    sourceFreshnessState: "unresolved", // established by the freshness policy in the assessment, not the cache
    sourcePolicyState: "unresolved", // established by the source registry in the assessment
    evidence: [...(c.evidence as string[])],
    ...(c.rawPayloadVersion ? { rawPayloadVersion: c.rawPayloadVersion } : {}),
    cacheVersion: c.cacheVersion,
  };
  return { valid: true, errors: [], observation };
}

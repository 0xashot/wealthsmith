/**
 * solStakingSelectorRuntimeData — Step 14Y. The sanitized, same-origin runtime payload contract
 * the browser may fetch. The browser fetches ONLY this generated artifact — never DefiLlama,
 * Stakewiz, Marinade, Rated, or Blockdaemon. The payload carries only the validated normalized
 * market cache: no provider secrets, no raw provider responses, no API keys, no environment
 * values, no transaction data.
 */
import type { SolStakingMarketCache } from "./solStakingMarketDataTypes";
import { validateSolStakingMarketCache } from "./solStakingMarketDataCache";

export const SOL_STAKING_RUNTIME_DATA_SCHEMA_VERSION = "1.0.0";
/** The ONLY URL the browser is allowed to fetch for this data. Same-origin, sanitized. */
export const SOL_STAKING_RUNTIME_DATA_URL = "/generated/sol-staking-market-cache.json";

export interface SolStakingRuntimeMarketPayload {
  schemaVersion: "1.0.0";
  publishedAt: string;
  marketCache: SolStakingMarketCache;
}

export interface RuntimePayloadValidationResult {
  valid: boolean;
  payload?: SolStakingRuntimeMarketPayload;
  errors: string[];
}

/** Keys that must NEVER appear in a sanitized runtime payload. */
const FORBIDDEN_KEYS = ["sourceResponses", "headers", "apiKey", "api_key", "secret", "token", "env", "rawPayload", "authorization"];

/**
 * Validate a raw runtime payload. Requires the exact schema version, a valid market cache, and
 * confirms no forbidden secret/raw-provider keys leaked in. Fails closed.
 */
export function validateSolStakingRuntimeMarketPayload(raw: unknown, options: { expectedSchemaVersion?: string } = {}): RuntimePayloadValidationResult {
  const expected = options.expectedSchemaVersion ?? SOL_STAKING_RUNTIME_DATA_SCHEMA_VERSION;
  const errors: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { valid: false, errors: ["payload_not_an_object"] };
  const p = raw as Partial<SolStakingRuntimeMarketPayload>;
  if (p.schemaVersion !== expected) return { valid: false, errors: [`schema_version_mismatch:${String(p.schemaVersion)}`] };
  if (typeof p.publishedAt !== "string" || Number.isNaN(Date.parse(p.publishedAt))) errors.push("invalid_published_at");
  if (!p.marketCache) return { valid: false, errors: [...errors, "missing_market_cache"] };

  // Forbidden-key scan across the whole payload (defensive against a mis-published cache).
  const flat = JSON.stringify(raw);
  for (const k of FORBIDDEN_KEYS) if (flat.includes(`"${k}"`)) errors.push(`forbidden_key:${k}`);

  const cacheV = validateSolStakingMarketCache(p.marketCache);
  if (!cacheV.valid) return { valid: false, errors: [...errors, "market_cache_invalid", ...cacheV.errors] };
  if (errors.length > 0) return { valid: false, errors };

  return { valid: true, payload: { schemaVersion: expected, publishedAt: p.publishedAt as string, marketCache: cacheV.cache as SolStakingMarketCache }, errors: [] };
}

/** Build a sanitized runtime payload from a validated market cache (used by the publisher). */
export function buildSolStakingRuntimeMarketPayload(marketCache: SolStakingMarketCache, publishedAt: string): SolStakingRuntimeMarketPayload {
  return { schemaVersion: SOL_STAKING_RUNTIME_DATA_SCHEMA_VERSION, publishedAt, marketCache };
}

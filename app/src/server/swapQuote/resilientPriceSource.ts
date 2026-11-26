/**
 * resilientPriceSource — a PriceSource that survives a burst, and makes as few calls as it can.
 *
 * WHY THIS EXISTS. The public price API allows roughly FIVE calls in ten seconds without a key
 * (measured 2026-11-26: five answered, then HTTP 429, whether fired together or a second apart).
 * A comparison needs two prices — the token's and USDC's — and used to make one call for each.
 * A Trim naming several tokens asks for several comparisons at once, so some lookups were
 * refused; a comparison with no price cannot state a cost, and a perfectly sellable token came
 * back `total_cost_unresolved` and would have been shown as one that cannot be swapped. Four
 * comparisons at once lost two tokens to exactly this.
 *
 * Four things, all conservative:
 *   • BATCHING — lookups made within a few milliseconds of each other go out as ONE request for
 *     all their mints (the API prices many mints per call). A comparison costs one price call
 *     instead of two, and several comparisons opened together still cost one;
 *   • one in-flight lookup per mint — concurrent callers share it;
 *   • a SHORT cache of real answers, well inside the comparison's own freshness window. A price
 *     keeps the time it was actually observed, so freshness is still judged honestly and a
 *     cached price ages out exactly as an uncached one would;
 *   • a bounded retry, only for the mints that came back empty, inside the comparison's deadline.
 *
 * What it never does: invent a price, cache a failure, or extend how long a price counts as
 * fresh. A mint the source cannot price is still `null`.
 */
import type { MintUsdPrice, PriceSource } from "./priceSnapshot";

/** How long a real price is reused. Less than half the comparison's 20s freshness window. */
export const PRICE_CACHE_TTL_MS = 8_000;
/** Waits before each retry. Two retries, ~0.85s in total — inside the 3s comparison deadline. */
export const PRICE_RETRY_DELAYS_MS: readonly number[] = [250, 600];
/** Lookups arriving within this window share one request. Imperceptible; long enough to coalesce. */
export const PRICE_BATCH_WINDOW_MS = 15;
/** A batch's own deadline — it serves several callers, so it cannot hang on any one of them. */
export const PRICE_BATCH_TIMEOUT_MS = 2_500;

/** A source that can price several mints in one request. Optional; without it mints go one by one. */
export interface BatchPriceSource extends PriceSource {
  getUsdPrices?(mints: readonly string[], signal: AbortSignal): Promise<Record<string, MintUsdPrice | null>>;
}

export interface ResilientPriceSourceOptions {
  ttlMs?: number;
  retryDelaysMs?: readonly number[];
  batchWindowMs?: number;
  now?: () => number;
  /** Injectable for tests. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export function createResilientPriceSource(inner: BatchPriceSource, options: ResilientPriceSourceOptions = {}): PriceSource {
  const ttlMs = options.ttlMs ?? PRICE_CACHE_TTL_MS;
  const delays = options.retryDelaysMs ?? PRICE_RETRY_DELAYS_MS;
  const windowMs = options.batchWindowMs ?? PRICE_BATCH_WINDOW_MS;
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? defaultSleep;
  const cache = new Map<string, MintUsdPrice>();
  const inFlight = new Map<string, Promise<MintUsdPrice | null>>();
  let openBatch: { mints: string[]; result: Promise<Record<string, MintUsdPrice | null>> } | null = null;

  /** One request for many mints when the source supports it; otherwise one each. Never throws. */
  const fetchMany = async (mints: readonly string[], signal: AbortSignal): Promise<Record<string, MintUsdPrice | null>> => {
    try {
      if (inner.getUsdPrices) return await inner.getUsdPrices(mints, signal);
      const entries = await Promise.all(
        mints.map(async (m) => [m, await inner.getUsdPrice(m, signal).catch(() => null)] as const),
      );
      return Object.fromEntries(entries);
    } catch {
      return {};
    }
  };

  /** Fetch a batch, retrying ONLY the mints that came back empty. */
  const runBatch = async (mints: readonly string[]): Promise<Record<string, MintUsdPrice | null>> => {
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), PRICE_BATCH_TIMEOUT_MS);
    const out: Record<string, MintUsdPrice | null> = {};
    let pending = [...new Set(mints)];
    try {
      for (let attempt = 0; pending.length > 0; attempt += 1) {
        const got = await fetchMany(pending, controller.signal);
        for (const m of pending) if (got[m] != null) out[m] = got[m];
        pending = pending.filter((m) => out[m] == null);
        if (pending.length === 0 || attempt >= delays.length || controller.signal.aborted) break;
        await sleep(delays[attempt]);
        if (controller.signal.aborted) break;
      }
    } finally {
      clearTimeout(deadline);
    }
    for (const m of mints) {
      // Only a real answer is remembered. A failure is asked again next time.
      if (out[m] != null) cache.set(m, out[m] as MintUsdPrice);
      else out[m] = null;
    }
    return out;
  };

  return {
    sourceId: inner.sourceId,
    getUsdPrice(mint): Promise<MintUsdPrice | null> {
      const hit = cache.get(mint);
      if (hit && now() - hit.observedAtMs <= ttlMs) return Promise.resolve(hit);

      const pending = inFlight.get(mint);
      if (pending) return pending;

      if (openBatch == null) {
        const batch: { mints: string[]; result: Promise<Record<string, MintUsdPrice | null>> } = { mints: [], result: Promise.resolve({}) };
        batch.result = sleep(windowMs).then(() => {
          // Closed: later lookups start a new batch.
          if (openBatch === batch) openBatch = null;
          return runBatch(batch.mints);
        });
        openBatch = batch;
      }
      const batch = openBatch;
      batch.mints.push(mint);
      const request = batch.result
        .then((prices) => prices[mint] ?? null)
        .finally(() => { inFlight.delete(mint); });
      inFlight.set(mint, request);
      return request;
    },
  };
}

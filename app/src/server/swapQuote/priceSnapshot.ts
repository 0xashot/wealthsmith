/**
 * priceSnapshot — Step 23B (SERVER-ONLY). ONE shared USD price snapshot per comparison, used identically for
 * every candidate. Prices are keyed by exact MINT (never a display symbol). The source is injectable so it can
 * reuse an approved WealthSmith token-price source (server-side) or a narrow quote-price source; it never scrapes
 * websites and never derives a price from one provider to apply only to that provider.
 *
 * When the snapshot is unavailable, USD cost is `null` → under the Step-23A eligibility policy a candidate that
 * needs total-cost-threshold validation FAILS CLOSED (`total_cost_unresolved`). Raw-output ranking is allowed only
 * when every candidate shares the exact same output mint + decimals; no USD value is ever invented.
 */
export const SWAP_PRICE_SNAPSHOT_VERSION = "swap_price_snapshot_1.0.0" as const;

export interface MintUsdPrice {
  usd: number;
  observedAtMs: number;
  sourceId: string;
}

/** An approved server-side price source. Read-only; mint-aware. Returns null when it cannot price a mint. */
export interface PriceSource {
  readonly sourceId: string;
  getUsdPrice(mint: string, signal: AbortSignal): Promise<MintUsdPrice | null>;
}

export interface PriceSnapshot {
  pricesByMint: Record<string, MintUsdPrice>;
  snapshotVersion: string;
  observedAtMs: number;
  /** Mints that could not be priced (their USD-derived fields become null downstream). */
  unpricedMints: string[];
  fresh: boolean;
}

/**
 * Resolve one snapshot for the exact mints needed by a comparison. `freshnessWindowMs` bounds staleness. All
 * successfully-priced mints share this single snapshot; unpriced mints are recorded (never invented).
 */
export async function resolvePriceSnapshot(mints: readonly string[], source: PriceSource, signal: AbortSignal, comparedAtMs: number, freshnessWindowMs: number): Promise<PriceSnapshot> {
  const unique = [...new Set(mints)];
  const pricesByMint: Record<string, MintUsdPrice> = {};
  const unpricedMints: string[] = [];
  let allFresh = true;
  await Promise.all(
    unique.map(async (mint) => {
      let p: MintUsdPrice | null = null;
      try {
        p = await source.getUsdPrice(mint, signal);
      } catch {
        p = null;
      }
      if (p && Number.isFinite(p.usd) && p.usd > 0 && comparedAtMs - p.observedAtMs <= freshnessWindowMs) {
        pricesByMint[mint] = p;
      } else {
        unpricedMints.push(mint);
        allFresh = false;
      }
    }),
  );
  return { pricesByMint, snapshotVersion: SWAP_PRICE_SNAPSHOT_VERSION, observedAtMs: comparedAtMs, unpricedMints, fresh: allFresh };
}

/** The USD unit price for a mint from the snapshot, or null when unpriced. */
export function priceOf(snapshot: PriceSnapshot, mint: string): number | null {
  const p = snapshot.pricesByMint[mint];
  return p ? p.usd : null;
}

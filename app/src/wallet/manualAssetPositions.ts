/**
 * manualAssetPositions — owns the user's manually added External Holdings
 * (BTC / ETH amounts) and exposes them as `WalletPosition`s for the Portfolio's
 * DISPLAY surfaces (Balance Overview, Crypto Assets Allocation, Liquid Assets,
 * and the Manually Added Assets table).
 *
 * Boundary: these positions are merged into the Portfolio's display arrays ONLY.
 * They are never passed to `useRailSuggestions` / the Suggestion Engine, the
 * Safety Buffer, the allocation target, or completeness — the engine keeps
 * reading the real connected-wallet positions alone. They also carry
 * `detection: "manual_entry"`, which fails every engine check that requires a
 * verified wallet balance, so a leak cannot silently pass as real.
 *
 * Honest values: the AMOUNT is stated by the user; the PRICE is sourced from the
 * read-only public feed. `valueUsd` is set only when a price exists, so an
 * unpriced row shows "—" rather than a made-up figure.
 */
import { useMemo, useSyncExternalStore } from "react";
import type { WalletPosition } from "./walletPosition";
import { MANUAL_ASSET_CHAINS, type ManualAssetChain } from "../state/manualAssets";
import { useExternalAssetPrices, type ExternalAssetPrices } from "./externalAssetPrices";

/** Approved token-icon paths for the manually addable assets. */
const MANUAL_ICON: Record<ManualAssetChain, string> = {
  btc: "assets/icons/token/btc.svg",
  eth: "assets/icons/token/eth.svg",
};

export type ManualAssetAmounts = Partial<Record<ManualAssetChain, string>>;

/**
 * Convert stated amounts + sourced prices into display positions. Only chains
 * with an amount produce a position; `valueUsd`/`change24hPct` are set only when
 * the price feed supplied them.
 */
export function buildManualAssetPositions(
  amounts: ManualAssetAmounts,
  prices: ExternalAssetPrices
): WalletPosition[] {
  const out: WalletPosition[] = [];
  for (const chain of Object.keys(MANUAL_ASSET_CHAINS) as ManualAssetChain[]) {
    const raw = amounts[chain];
    if (raw == null) continue;
    const uiAmount = Number(raw);
    if (!Number.isFinite(uiAmount) || uiAmount <= 0) continue;
    const c = MANUAL_ASSET_CHAINS[chain];
    const price = prices[chain];
    out.push({
      id: `manual-${chain}`,
      source: "wallet",
      // "token" so the row lands in Liquid Assets alongside other spot holdings.
      type: "token",
      symbol: c.symbol,
      name: c.name,
      amount: raw,
      uiAmount,
      decimals: c.decimals,
      icon: MANUAL_ICON[chain],
      // Its OWN chain's explorer — these rows sit in Liquid Assets beside Solana
      // holdings, but a Solscan link would be meaningless for native BTC/ETH.
      explorerUrl: c.explorer,
      // Manually stated — never a verified on-chain read (see the union comment).
      detection: "manual_entry",
      ...(price ? { priceUsd: price.usd, valueUsd: uiAmount * price.usd } : {}),
      ...(price?.change24hPct != null ? { change24hPct: price.change24hPct } : {}),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Session store. The amounts must be visible on BOTH the Portfolio (where they
 * are entered) and the Dashboard (Total Portfolio Value), which are separate
 * pages — so they live in a tiny module-level store rather than one page's
 * state. Session-only, matching the rest of the prototype (nothing persists
 * across a reload yet).
 * ------------------------------------------------------------------ */
let storedAmounts: ManualAssetAmounts = {};
const listeners = new Set<() => void>();

/** Stable snapshot reference — only replaced when an amount actually changes. */
function getSnapshot(): ManualAssetAmounts {
  return storedAmounts;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** Store a validated amount; returns true when the asset was newly added. */
export function setManualAmount(chain: ManualAssetChain, amount: string): boolean {
  const isNew = storedAmounts[chain] == null;
  storedAmounts = { ...storedAmounts, [chain]: amount };
  listeners.forEach((l) => l());
  return isNew;
}

/** Remove a holding entirely (managing → 0 means "I no longer hold this"). */
export function clearManualAmount(chain: ManualAssetChain): void {
  if (storedAmounts[chain] == null) return;
  const next = { ...storedAmounts };
  delete next[chain];
  storedAmounts = next;
  listeners.forEach((l) => l());
}

/** Test/teardown helper — clears every stated amount. */
export function resetManualAmounts(): void {
  storedAmounts = {};
  listeners.forEach((l) => l());
}

export interface ManualAssetsState {
  amounts: ManualAssetAmounts;
  prices: ExternalAssetPrices;
  /**
   * True while the price feed's first attempt is still in flight. Callers fold
   * this into their own "settled" flag so a stated BTC/ETH amount does not pop
   * into the charts unpriced (and then jump) a moment later. It always resolves
   * — a feed that never succeeds settles to false with no prices.
   */
  pricesLoading: boolean;
  /** Store a validated amount; returns true when the asset was newly added. */
  setAmount: (chain: ManualAssetChain, amount: string) => boolean;
  /** Remove a holding (managing → 0). */
  clearAmount: (chain: ManualAssetChain) => void;
  /** Display-only positions for the Portfolio/Dashboard surfaces (never the engine). */
  positions: WalletPosition[];
}

/** Read the manual amounts + their sourced prices, as display positions. */
export function useManualAssets(): ManualAssetsState {
  const amounts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const { prices, loading: pricesLoading } = useExternalAssetPrices();
  const positions = useMemo(() => buildManualAssetPositions(amounts, prices), [amounts, prices]);
  return {
    amounts,
    prices,
    pricesLoading,
    setAmount: setManualAmount,
    clearAmount: clearManualAmount,
    positions,
  };
}

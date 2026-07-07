/**
 * raydiumAmm — READ-ONLY detection of Raydium classic AMM (v4) and CPMM LP
 * positions, which are represented by FUNGIBLE LP tokens held in the wallet (not
 * NFTs like CLMM).
 *
 * Valuation is a simple proportional share: `yourLP / totalLpSupply × poolReserve`
 * for each side. Raydium's public API resolves a pool by its LP mint and returns
 * the reserves (`mintAmountA/B`), total LP supply (`lpAmount`), token symbols, and
 * fee APR — so this needs no on-chain decode. Both AMM v4 and CPMM are served by
 * the same "standard" pool API, so both are covered.
 *
 * READ-ONLY: a single HTTP GET; no chain writes, no signing.
 */
import type { WalletPosition } from "./walletPosition";

const RAYDIUM_LPS_API = "https://api-v3.raydium.io/pools/info/lps?lps=";

/** A held, unrecognized fungible token — a candidate Raydium LP token. */
export interface HeldLpToken {
  mint: string;
  uiAmount: number;
}

interface RaydiumPool {
  lpMint?: { address?: string };
  mintA?: { symbol?: string };
  mintB?: { symbol?: string };
  mintAmountA?: number;
  mintAmountB?: number;
  lpAmount?: number;
  day?: { apr?: number };
  week?: { apr?: number };
}

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 4 });

/** Resolve which held tokens are Raydium LP tokens and value the wallet's share. */
export async function fetchRaydiumAmmPositions(
  candidates: HeldLpToken[]
): Promise<WalletPosition[]> {
  if (candidates.length === 0) return [];

  // Look up all candidate mints (chunked; the API filters to real LP mints).
  const byLpMint = new Map<string, RaydiumPool>();
  for (let i = 0; i < candidates.length; i += 30) {
    const mints = candidates.slice(i, i + 30).map((c) => c.mint);
    try {
      const res = await fetch(RAYDIUM_LPS_API + mints.join(","));
      if (!res.ok) continue;
      const j = (await res.json()) as { data?: unknown[] };
      for (const raw of j.data ?? []) {
        const p = raw as RaydiumPool;
        const lp = p?.lpMint?.address;
        if (lp) byLpMint.set(lp, p);
      }
    } catch {
      // best-effort per chunk
    }
  }
  if (byLpMint.size === 0) return [];

  const positions: WalletPosition[] = [];
  for (const c of candidates) {
    const p = byLpMint.get(c.mint);
    if (!p || !p.lpAmount || !(p.lpAmount > 0)) continue;
    const share = c.uiAmount / p.lpAmount;
    const symA = p.mintA?.symbol ?? "?";
    const symB = p.mintB?.symbol ?? "?";
    const amtA = share * (p.mintAmountA ?? 0);
    const amtB = share * (p.mintAmountB ?? 0);
    const apr = typeof p.week?.apr === "number" ? p.week.apr : p.day?.apr;
    positions.push({
      id: `raydium-amm-${c.mint}`,
      source: "raydium",
      type: "protocol",
      symbol: `${symA}/${symB}`,
      name: "Raydium AMM",
      mint: c.mint,
      protocol: "Raydium",
      amount: `${fmt(amtA)} ${symA} + ${fmt(amtB)} ${symB}`,
      detection: "protocol_api",
      valueUsd: null,
      apy: typeof apr === "number" ? apr : null,
    });
  }
  return positions;
}

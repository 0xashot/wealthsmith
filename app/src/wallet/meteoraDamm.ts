/**
 * meteoraDamm — READ-ONLY detection of Meteora Dynamic AMM (DAMM) LP positions.
 *
 * DAMM pools issue FUNGIBLE LP tokens (like Raydium's classic AMM), but Meteora's
 * public API has no lookup-by-LP-mint and there are 80k+ pools, so we can't resolve
 * a held LP token from the API. Instead we find the pool ON-CHAIN — the DAMM Pool
 * account stores its `lp_mint` (offset 8), so a filtered getProgramAccounts finds
 * it — then use Meteora's official `@meteora-ag/dynamic-amm-sdk` (web3.js v1) to
 * read the pool's effective reserves (it handles the underlying dynamic vaults) and
 * LP supply. The wallet's amount for each side is `yourLP / lpSupply × reserve`.
 *
 * Lazy-imported so the SDK stays off the main bundle. READ-ONLY: account reads
 * only; no signing.
 */
import { Connection, PublicKey } from "@solana/web3.js";
import { AmmImpl } from "@meteora-ag/dynamic-amm-sdk";
import { lookupMint, shortMint, type WalletPosition } from "./walletPosition";

const DAMM_PROGRAM = "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB";
const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 4 });
const symOf = (mint: string) => lookupMint(mint)?.symbol ?? shortMint(mint);

/** A held, unrecognized fungible token — a candidate DAMM LP token (raw balance). */
export interface HeldLpToken {
  mint: string;
  rawAmount: string;
}

export async function fetchMeteoraDammPositions(
  connection: Connection,
  candidates: HeldLpToken[]
): Promise<WalletPosition[]> {
  if (candidates.length === 0) return [];
  const program = new PublicKey(DAMM_PROGRAM);

  // Find each candidate's DAMM pool on-chain (Pool.lp_mint @ offset 8).
  const matched: Array<{ mint: string; rawAmount: string; pool: PublicKey }> = [];
  for (const c of candidates) {
    try {
      const found = await connection.getProgramAccounts(program, {
        dataSlice: { offset: 0, length: 0 },
        filters: [{ memcmp: { offset: 8, bytes: c.mint } }],
      });
      if (found.length > 0) matched.push({ mint: c.mint, rawAmount: c.rawAmount, pool: found[0].pubkey });
    } catch {
      // per-candidate best-effort
    }
  }
  if (matched.length === 0) return [];

  const positions: WalletPosition[] = [];
  for (const { mint, rawAmount, pool } of matched) {
    try {
      const amm = await AmmImpl.create(connection, pool);
      const lpSupply = Number(amm.poolState.lpSupply.toString());
      if (!(lpSupply > 0)) continue;
      const share = Number(rawAmount) / lpSupply; // both raw — LP decimals cancel
      const decA = amm.tokenAMint.decimals;
      const decB = amm.tokenBMint.decimals;
      const symA = symOf(amm.tokenAMint.address.toString());
      const symB = symOf(amm.tokenBMint.address.toString());
      const amtA = (share * Number(amm.poolInfo.tokenAAmount)) / 10 ** decA;
      const amtB = (share * Number(amm.poolInfo.tokenBAmount)) / 10 ** decB;
      positions.push({
        id: `meteora-damm-${mint}`,
        source: "meteora",
        type: "protocol",
        symbol: `${symA}/${symB}`,
        name: "Meteora DAMM",
        mint,
        protocol: "Meteora",
        amount: `${fmt(amtA)} ${symA} + ${fmt(amtB)} ${symB}`,
        detection: "protocol_api",
        valueUsd: null,
        apy: null,
      });
    } catch {
      // pool load best-effort
    }
  }
  return positions;
}

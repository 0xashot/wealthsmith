/**
 * lstEnrichment — Step 17G. READ-ONLY decode of a supported LST's SPL Stake Pool state via the installed
 * @solana/spl-stake-pool 1.1.8, feeding the PURE normalization (lstUnderlyingNormalization.ts).
 * Dynamically imported so the SDK is code-split off the main bundle and its failure is isolated. Each
 * unique pool is discovered + read ONCE per refresh (shared across a wallet's multiple accounts of that
 * LST). No second Solana connection; the caller passes its existing one. mSOL (no installed decoder) is
 * simply never fetched here → the pure module fail-closes it to `unsupported`.
 */
import type { Connection } from "@solana/web3.js";
import { SUPPORTED_LSTS, type LstPoolFacts } from "./lstUnderlyingNormalization";

/** Byte offset of `pool_mint` in the SPL StakePool account (source: lstApy.ts / SDK layout). */
const POOL_MINT_OFFSET = 162;

/** Discover + decode the SPL stake pool for each supported mint. Fully guarded → empty map on failure. */
export async function fetchLstPoolFacts(connection: Connection, mints: string[]): Promise<Map<string, LstPoolFacts>> {
  const out = new Map<string, LstPoolFacts>();
  const wanted = mints.filter((m) => {
    const id = Object.values(SUPPORTED_LSTS).find((x) => x.mint === m);
    return id && id.accountingKind === "spl_stake_pool" && id.backingSupported;
  });
  if (wanted.length === 0) return out;
  try {
    const [spl, web3] = await Promise.all([import("@solana/spl-stake-pool"), import("@solana/web3.js")]);
    const { PublicKey } = web3 as typeof import("@solana/web3.js");
    const s = spl as typeof import("@solana/spl-stake-pool");
    let currentSlot = 0;
    try { currentSlot = Number(await connection.getSlot()); } catch { /* slot best-effort */ }

    await Promise.all(wanted.map(async (mint) => {
      const id = Object.values(SUPPORTED_LSTS).find((x) => x.mint === mint)!;
      try {
        for (const program of id.stakePoolPrograms) {
          const accts = await connection.getProgramAccounts(new PublicKey(program), {
            filters: [{ memcmp: { offset: POOL_MINT_OFFSET, bytes: mint } }],
            dataSlice: { offset: 0, length: 0 },
          });
          if (accts.length === 0) continue;
          const poolPk = accts[0].pubkey;
          const pool = await s.getStakePoolAccount(connection, poolPk);
          const d: any = pool.account.data;
          const poolMint = d.poolMint?.toBase58?.() ?? "";
          const fee = d.stakeWithdrawalFee ?? d.solWithdrawalFee ?? null;
          out.set(mint, {
            poolAccount: poolPk.toBase58(),
            programOwner: program,
            poolMint,
            totalLamports: d.totalLamports != null ? d.totalLamports.toString() : "0",
            poolTokenSupply: d.poolTokenSupply != null ? d.poolTokenSupply.toString() : "0",
            withdrawalFeeNumerator: fee?.numerator != null ? fee.numerator.toString() : null,
            withdrawalFeeDenominator: fee?.denominator != null ? fee.denominator.toString() : null,
            sourceSlot: currentSlot,
            fresh: true,
          });
          break;
        }
      } catch { /* per-mint best-effort → mint absent from map → pure module fail-closes it */ }
    }));
  } catch { /* whole enrichment failed → empty map (strict no-op) */ }
  return out;
}

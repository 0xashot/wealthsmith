/**
 * lstApy — READ-ONLY APY for recognized liquid-staking tokens (JupSOL, bSOL,
 * JitoSOL, …) computed from the LST's on-chain stake-pool exchange-rate growth
 * over the last epoch. This is the real, on-chain staking yield — not an invented
 * estimate and not a flaky third-party quote.
 *
 * JupSOL ("Jupiter") and most SOL LSTs are SPL Stake Pools (Jupiter/Sanctum run
 * forks of the SPL stake-pool program with the same account layout). The pool
 * stores this-epoch and last-epoch totals, so APY is derivable from a single read:
 *   rate      = totalLamports / poolTokenSupply
 *   lastRate  = lastEpochTotalLamports / lastEpochPoolTokenSupply
 *   apy       = (1 + (rate/lastRate - 1)) ^ epochsPerYear - 1
 *
 * (Marinade's mSOL is a different program and is not covered here → no APY, shows
 * "—".) READ-ONLY: getProgramAccounts + getStakePoolAccount only; no signing.
 */
import { Connection, PublicKey } from "@solana/web3.js";
import { getStakePoolAccount } from "@solana/spl-stake-pool";

/** Stake-pool programs that share the SPL StakePool account layout. */
const STAKE_POOL_PROGRAMS = [
  "SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy", // SPL stake pool
  "SP12tWFxD9oJsVWNavTTBZvMbA6gkAmxtVgxdqvyvhY", // Sanctum single-validator SPL
  "SPMBzsVUuoHA4Jm6KunbsotaahvVikZs1JyTW6iJvbn", // Sanctum multi-validator SPL (JupSOL)
];
/** Byte offset of `pool_mint` in the SPL StakePool account. */
const POOL_MINT_OFFSET = 162;

/** APY (percent) per LST mint, best-effort. Unresolved mints are simply omitted. */
export async function fetchLstApys(
  connection: Connection,
  mints: string[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (mints.length === 0) return out;

  let epochsPerYear = 182;
  try {
    const epochInfo = await connection.getEpochInfo();
    const epochDays = (epochInfo.slotsInEpoch * 0.4) / 86400;
    if (epochDays > 0) epochsPerYear = 365.25 / epochDays;
  } catch {
    // keep the ~182 fallback
  }

  await Promise.all(
    mints.map(async (mint) => {
      try {
        for (const program of STAKE_POOL_PROGRAMS) {
          const accts = await connection.getProgramAccounts(new PublicKey(program), {
            filters: [{ memcmp: { offset: POOL_MINT_OFFSET, bytes: mint } }],
            dataSlice: { offset: 0, length: 0 },
          });
          if (accts.length === 0) continue;
          const pool = await getStakePoolAccount(connection, accts[0].pubkey);
          const d = pool.account.data;
          const rate = Number(d.totalLamports) / Number(d.poolTokenSupply);
          const lastRate =
            Number(d.lastEpochTotalLamports) / Number(d.lastEpochPoolTokenSupply);
          if (rate > 0 && lastRate > 0) {
            const apy = (Math.pow(1 + (rate / lastRate - 1), epochsPerYear) - 1) * 100;
            if (Number.isFinite(apy) && apy >= 0) out.set(mint, apy);
          }
          break;
        }
      } catch {
        // best-effort per mint
      }
    })
  );
  return out;
}

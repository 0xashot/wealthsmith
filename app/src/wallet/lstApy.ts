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
 * Two LSTs need a different source: Marinade's mSOL (its own program → Marinade
 * API), and Sanctum Infinity INF (a multi-LST pool with no single stake pool, and
 * Sanctum's APY endpoint returns 0 → DefiLlama's maintained yields feed).
 * READ-ONLY: getProgramAccounts + getStakePoolAccount + read-only HTTP GETs; no
 * signing.
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

/** Marinade mSOL — sourced from Marinade's own API, not a stake pool. */
const MSOL_MINT = "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So";
const MARINADE_APY_URL = "https://api.marinade.finance/msol/apy/30d";

/** mSOL APY (percent) from Marinade's public API. Undefined on any failure. */
async function fetchMarinadeMsolApy(): Promise<number | undefined> {
  try {
    const r = await fetch(MARINADE_APY_URL);
    if (!r.ok) return undefined;
    const j = (await r.json()) as { value?: number };
    const v = Number(j?.value);
    return Number.isFinite(v) && v >= 0 ? v * 100 : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Some yield tokens have no single stake pool to read and no working protocol APY
 * endpoint, so their APY comes from DefiLlama's maintained yields feed via the
 * lightweight per-pool endpoint:
 *   - Sanctum Infinity (INF): a multi-LST pool; Sanctum's APY endpoint returns 0.
 *   - Ondo USDY: a Treasury-backed RWA yield token.
 */
const INF_MINT = "5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm";
const USDY_MINT = "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6";
/** DefiLlama pool ids (project "sanctum-infinity" / "ondo-yield-assets", Solana). */
const DEFILLAMA_POOL: Record<string, string> = {
  [INF_MINT]: "3075a746-bdd1-4aac-bcd5-b035abee2622",
  [USDY_MINT]: "00b83068-9f87-4411-b5d7-5d2ff48c40c4",
};

/** APY (percent) from DefiLlama's per-pool chart (already a percent). */
async function fetchDefiLlamaApy(poolId: string): Promise<number | undefined> {
  try {
    const r = await fetch(`https://yields.llama.fi/chart/${poolId}`);
    if (!r.ok) return undefined;
    const j = (await r.json()) as { data?: Array<{ apy?: number }> };
    const pts = j?.data;
    const apy = Array.isArray(pts) && pts.length > 0 ? Number(pts[pts.length - 1]?.apy) : NaN;
    return Number.isFinite(apy) && apy >= 0 ? apy : undefined;
  } catch {
    return undefined;
  }
}

/** APY (percent) per stake-pool LST mint, via last-epoch exchange-rate growth. */
async function fetchStakePoolApys(
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

/**
 * APY (percent) per LST mint, best-effort. mSOL is sourced from Marinade's API;
 * all other recognized LSTs from their SPL stake pool. Unresolved mints omitted.
 */
export async function fetchLstApys(
  connection: Connection,
  mints: string[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (mints.length === 0) return out;

  // mSOL (Marinade API) and DefiLlama-sourced tokens (INF, USDY) have their own
  // sources; everything else uses the SPL/Sanctum stake-pool math.
  const defiLlamaMints = mints.filter((m) => m in DEFILLAMA_POOL);
  const poolMints = mints.filter((m) => m !== MSOL_MINT && !(m in DEFILLAMA_POOL));

  const [poolApys, msolApy, ...defiLlamaApys] = await Promise.all([
    fetchStakePoolApys(connection, poolMints),
    mints.includes(MSOL_MINT) ? fetchMarinadeMsolApy() : Promise.resolve(undefined),
    ...defiLlamaMints.map((m) => fetchDefiLlamaApy(DEFILLAMA_POOL[m])),
  ]);

  for (const [mint, apy] of poolApys) out.set(mint, apy);
  if (msolApy != null) out.set(MSOL_MINT, msolApy);
  defiLlamaMints.forEach((mint, i) => {
    const apy = defiLlamaApys[i];
    if (apy != null) out.set(mint, apy);
  });
  return out;
}

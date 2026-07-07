/**
 * raydiumClmm — READ-ONLY detection of Raydium concentrated-liquidity (CLMM) LP
 * positions.
 *
 * Like Orca, a Raydium CLMM position is a position NFT whose PersonalPositionState
 * account is a PDA `["position", positionNftMint]` under the Raydium CLMM program.
 * Raydium uses the same Uniswap-V3-style math as Orca, so the same core WASM
 * (`decreaseLiquidityQuote`) converts liquidity → the two token amounts; only the
 * account layouts and the metadata API differ. Symbols + fee APR come from
 * Raydium's public API; decimals + current sqrtPrice are read on-chain.
 *
 * Lazy-imported (WASM off the main bundle). READ-ONLY: getMultipleAccounts + a
 * read-only HTTP GET; no signing.
 */
import { Connection, PublicKey } from "@solana/web3.js";
import { decreaseLiquidityQuote } from "@orca-so/whirlpools-core";
import type { WalletPosition } from "./walletPosition";

const RAYDIUM_CLMM_PROGRAM = "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK";
const POSITION_ACCOUNT_SIZE = 281;
const RAYDIUM_POOL_API = "https://api-v3.raydium.io/pools/info/ids?ids=";

function readU128LE(data: Buffer, offset: number): bigint {
  return data.readBigUInt64LE(offset) + (data.readBigUInt64LE(offset + 8) << 64n);
}

async function getMultipleInChunks(
  connection: Connection,
  keys: PublicKey[]
): Promise<Array<import("@solana/web3.js").AccountInfo<Buffer> | null>> {
  const out: Array<import("@solana/web3.js").AccountInfo<Buffer> | null> = [];
  for (let i = 0; i < keys.length; i += 100) {
    out.push(...(await connection.getMultipleAccountsInfo(keys.slice(i, i + 100))));
  }
  return out;
}

interface PoolMeta {
  sqrtPrice: bigint;
  decA: number;
  decB: number;
  symA: string;
  symB: string;
  /** Pool fee APR (percent) from Raydium's API. */
  aprPct?: number;
}

/** On-chain pool state (sqrtPrice @253, decimals @233/234) + Raydium API metadata. */
async function fetchPoolMeta(
  connection: Connection,
  poolIds: string[]
): Promise<Map<string, PoolMeta>> {
  const map = new Map<string, PoolMeta>();
  if (poolIds.length === 0) return map;

  const onchain = new Map<string, { sqrtPrice: bigint; decA: number; decB: number }>();
  const infos = await getMultipleInChunks(connection, poolIds.map((p) => new PublicKey(p)));
  infos.forEach((acc, i) => {
    if (acc && acc.data.length >= 270) {
      onchain.set(poolIds[i], {
        sqrtPrice: readU128LE(acc.data, 253),
        decA: acc.data[233],
        decB: acc.data[234],
      });
    }
  });

  const api = new Map<string, { symA?: string; symB?: string; aprPct?: number }>();
  try {
    const res = await fetch(RAYDIUM_POOL_API + poolIds.join(","));
    if (res.ok) {
      const j = (await res.json()) as { data?: unknown[] };
      for (const raw of j.data ?? []) {
        const p = raw as {
          id?: string;
          mintA?: { symbol?: string };
          mintB?: { symbol?: string };
          day?: { apr?: number };
          week?: { apr?: number };
        };
        if (!p?.id) continue;
        const apr = typeof p.week?.apr === "number" ? p.week.apr : p.day?.apr;
        api.set(p.id, {
          symA: p.mintA?.symbol,
          symB: p.mintB?.symbol,
          aprPct: typeof apr === "number" ? apr : undefined,
        });
      }
    }
  } catch {
    // symbols/apr are best-effort
  }

  for (const id of poolIds) {
    const oc = onchain.get(id);
    if (!oc) continue;
    const a = api.get(id);
    map.set(id, {
      sqrtPrice: oc.sqrtPrice,
      decA: oc.decA,
      decB: oc.decB,
      symA: a?.symA ?? "?",
      symB: a?.symB ?? "?",
      aprPct: a?.aprPct,
    });
  }
  return map;
}

interface DecodedPosition {
  nftMint: string;
  poolId: string;
  liquidity: bigint;
  tickLower: number;
  tickUpper: number;
}

export async function fetchRaydiumPositions(
  connection: Connection,
  candidateNftMints: string[]
): Promise<WalletPosition[]> {
  if (candidateNftMints.length === 0) return [];
  const program = new PublicKey(RAYDIUM_CLMM_PROGRAM);

  const pdas: PublicKey[] = [];
  const mintOf = new Map<string, string>();
  for (const mint of candidateNftMints) {
    try {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("position"), new PublicKey(mint).toBuffer()],
        program
      );
      mintOf.set(pda.toBase58(), mint);
      pdas.push(pda);
    } catch {
      // invalid mint — skip
    }
  }
  if (pdas.length === 0) return [];

  const infos = await getMultipleInChunks(connection, pdas);
  const decoded: DecodedPosition[] = [];
  infos.forEach((acc, i) => {
    if (!acc || acc.owner.toBase58() !== RAYDIUM_CLMM_PROGRAM || acc.data.length !== POSITION_ACCOUNT_SIZE) {
      return;
    }
    const d = acc.data;
    const liquidity = readU128LE(d, 81);
    if (liquidity === 0n) return;
    decoded.push({
      nftMint: mintOf.get(pdas[i].toBase58())!,
      poolId: new PublicKey(d.subarray(41, 73)).toBase58(),
      liquidity,
      tickLower: d.readInt32LE(73),
      tickUpper: d.readInt32LE(77),
    });
  });
  if (decoded.length === 0) return [];

  const meta = await fetchPoolMeta(connection, [...new Set(decoded.map((p) => p.poolId))]);
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 4 });

  const positions: WalletPosition[] = [];
  for (const p of decoded) {
    const m = meta.get(p.poolId);
    if (!m) continue;
    let amtA: number;
    let amtB: number;
    try {
      const q = decreaseLiquidityQuote(p.liquidity, 0, m.sqrtPrice, p.tickLower, p.tickUpper);
      amtA = Number(q.tokenEstA) / 10 ** m.decA;
      amtB = Number(q.tokenEstB) / 10 ** m.decB;
    } catch {
      continue;
    }
    positions.push({
      id: `raydium-${p.poolId}-${p.nftMint}`,
      source: "raydium",
      type: "protocol",
      symbol: `${m.symA}/${m.symB}`,
      name: "Raydium CLMM",
      mint: p.nftMint,
      protocol: "Raydium",
      amount: `${fmt(amtA)} ${m.symA} + ${fmt(amtB)} ${m.symB}`,
      detection: "protocol_api",
      valueUsd: null,
      apy: m.aprPct ?? null,
    });
  }
  return positions;
}

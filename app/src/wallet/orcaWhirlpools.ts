/**
 * orcaWhirlpools — READ-ONLY detection of Orca Whirlpool (concentrated-liquidity)
 * LP positions.
 *
 * An Orca CLMM position is held as a position NFT in the wallet; the actual
 * Position account is a PDA `["position", positionMint]` under the Whirlpool
 * program. We derive that PDA for each held NFT, read the Position (liquidity +
 * tick range + whirlpool) and its Whirlpool (current sqrtPrice), then use Orca's
 * core WASM (`decreaseLiquidityQuote`) to convert liquidity → the two underlying
 * token amounts. Symbols/decimals + the pool's fee APR come from Orca's public
 * whirlpool list (cached).
 *
 * This uses ONLY `@orca-so/whirlpools-core` (framework-agnostic WASM math) — not
 * the high-level SDK, which requires an incompatible @solana/kit major. Lazy-
 * imported so the WASM stays off the main bundle. READ-ONLY: getMultipleAccounts
 * + a cached HTTP GET; no signing.
 */
import { Connection, PublicKey } from "@solana/web3.js";
import { decreaseLiquidityQuote } from "@orca-so/whirlpools-core";
import type { WalletPosition } from "./walletPosition";

const WHIRLPOOL_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";
const POSITION_ACCOUNT_SIZE = 216;
const POSITION_BUNDLE_SIZE = 136;
const ORCA_LIST_URL = "https://api.mainnet.orca.so/v1/whirlpool/list";

interface WhirlpoolMeta {
  aSymbol: string;
  aDecimals: number;
  bSymbol: string;
  bDecimals: number;
  /** Pool fee APR (percent), from Orca's 7-day window. */
  feeAprPct?: number;
}

/** Cache Orca's whirlpool list (rarely changes) for the session. */
let whirlpoolMetaCache: Map<string, WhirlpoolMeta> | null = null;

async function fetchWhirlpoolMeta(): Promise<Map<string, WhirlpoolMeta>> {
  if (whirlpoolMetaCache) return whirlpoolMetaCache;
  const map = new Map<string, WhirlpoolMeta>();
  try {
    const res = await fetch(ORCA_LIST_URL);
    if (!res.ok) return map;
    const j = (await res.json()) as { whirlpools?: unknown[] };
    for (const raw of j.whirlpools ?? []) {
      const w = raw as {
        address?: string;
        tokenA?: { symbol?: string; decimals?: number };
        tokenB?: { symbol?: string; decimals?: number };
        feeApr?: { week?: number };
      };
      if (!w.address || !w.tokenA || !w.tokenB) continue;
      map.set(w.address, {
        aSymbol: w.tokenA.symbol ?? "?",
        aDecimals: w.tokenA.decimals ?? 0,
        bSymbol: w.tokenB.symbol ?? "?",
        bDecimals: w.tokenB.decimals ?? 0,
        feeAprPct: typeof w.feeApr?.week === "number" ? w.feeApr.week * 100 : undefined,
      });
    }
    if (map.size > 0) whirlpoolMetaCache = map;
  } catch {
    // best-effort
  }
  return map;
}

/** Read a little-endian u128 from a Buffer at the given offset. */
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

interface DecodedPosition {
  /** Unique position account address (used for the row id). */
  address: string;
  /** The wallet NFT this came from — a position mint, or a bundle mint. */
  nftMint: string;
  whirlpool: string;
  liquidity: bigint;
  tickLower: number;
  tickUpper: number;
}

/** Decode a 216-byte Position account; null if empty (0 liquidity). */
function decodePosition(data: Buffer, address: string, nftMint: string): DecodedPosition | null {
  const liquidity = readU128LE(data, 72);
  if (liquidity === 0n) return null;
  return {
    address,
    nftMint,
    whirlpool: new PublicKey(data.subarray(8, 40)).toBase58(),
    liquidity,
    tickLower: data.readInt32LE(88),
    tickUpper: data.readInt32LE(92),
  };
}

/**
 * Detect Orca Whirlpool LP positions among the wallet's candidate NFT mints
 * (SPL tokens with 0 decimals / amount 1). Returns one WalletPosition per open
 * position, with `mint` set to the NFT mint so the caller can drop the matching
 * "unknown token" row.
 */
export async function fetchOrcaPositions(
  connection: Connection,
  candidateNftMints: string[]
): Promise<WalletPosition[]> {
  if (candidateNftMints.length === 0) return [];
  const program = new PublicKey(WHIRLPOOL_PROGRAM);

  // Each candidate NFT could be a plain position (PDA ["position", mint]) or a
  // position bundle (PDA ["position_bundle", mint]). Derive both and probe.
  const firstBatch: PublicKey[] = [];
  const mintOf = new Map<string, string>(); // pda base58 → source NFT mint
  const isBundlePda = new Set<string>();
  for (const mint of candidateNftMints) {
    try {
      const mp = new PublicKey(mint);
      const [pos] = PublicKey.findProgramAddressSync([Buffer.from("position"), mp.toBuffer()], program);
      const [bun] = PublicKey.findProgramAddressSync([Buffer.from("position_bundle"), mp.toBuffer()], program);
      mintOf.set(pos.toBase58(), mint);
      mintOf.set(bun.toBase58(), mint);
      isBundlePda.add(bun.toBase58());
      firstBatch.push(pos, bun);
    } catch {
      // invalid mint — skip
    }
  }
  if (firstBatch.length === 0) return [];

  const infos = await getMultipleInChunks(connection, firstBatch);
  const decoded: DecodedPosition[] = [];
  const bundledToFetch: Array<{ pda: PublicKey; nftMint: string }> = [];
  infos.forEach((acc, i) => {
    if (!acc || acc.owner.toBase58() !== WHIRLPOOL_PROGRAM) return;
    const addr = firstBatch[i].toBase58();
    const nftMint = mintOf.get(addr)!;
    if (acc.data.length === POSITION_ACCOUNT_SIZE) {
      const p = decodePosition(acc.data, addr, nftMint);
      if (p) decoded.push(p);
    } else if (acc.data.length === POSITION_BUNDLE_SIZE && isBundlePda.has(addr)) {
      // Expand the bundle: bitmap @40 (256 bits) → occupied bundled-position PDAs.
      const bitmap = acc.data.subarray(40, 72);
      const bundleMint = new PublicKey(nftMint);
      for (let idx = 0; idx < 256; idx++) {
        if ((bitmap[idx >> 3] >> (idx & 7)) & 1) {
          const [bpda] = PublicKey.findProgramAddressSync(
            [Buffer.from("bundled_position"), bundleMint.toBuffer(), Buffer.from(idx.toString())],
            program
          );
          bundledToFetch.push({ pda: bpda, nftMint });
        }
      }
    }
  });

  // Fetch the bundled positions (they're plain Position accounts).
  if (bundledToFetch.length > 0) {
    const bInfos = await getMultipleInChunks(connection, bundledToFetch.map((b) => b.pda));
    bInfos.forEach((acc, i) => {
      if (acc && acc.owner.toBase58() === WHIRLPOOL_PROGRAM && acc.data.length === POSITION_ACCOUNT_SIZE) {
        const p = decodePosition(acc.data, bundledToFetch[i].pda.toBase58(), bundledToFetch[i].nftMint);
        if (p) decoded.push(p);
      }
    });
  }
  if (decoded.length === 0) return [];

  // Read each involved whirlpool for its current sqrtPrice (offset 65, u128).
  const uniqueWhirlpools = [...new Set(decoded.map((p) => p.whirlpool))];
  const wpInfos = await getMultipleInChunks(
    connection,
    uniqueWhirlpools.map((w) => new PublicKey(w))
  );
  const sqrtByWhirlpool = new Map<string, bigint>();
  wpInfos.forEach((acc, i) => {
    if (acc && acc.data.length >= 81) sqrtByWhirlpool.set(uniqueWhirlpools[i], readU128LE(acc.data, 65));
  });

  const meta = await fetchWhirlpoolMeta();
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 4 });

  const positions: WalletPosition[] = [];
  for (const p of decoded) {
    const sqrtPrice = sqrtByWhirlpool.get(p.whirlpool);
    const m = meta.get(p.whirlpool);
    if (sqrtPrice == null || !m) continue;
    let amtA: number;
    let amtB: number;
    try {
      const q = decreaseLiquidityQuote(p.liquidity, 0, sqrtPrice, p.tickLower, p.tickUpper);
      amtA = Number(q.tokenEstA) / 10 ** m.aDecimals;
      amtB = Number(q.tokenEstB) / 10 ** m.bDecimals;
    } catch {
      continue;
    }
    positions.push({
      id: `orca-${p.address}`,
      source: "orca",
      type: "protocol",
      symbol: `${m.aSymbol}/${m.bSymbol}`,
      name: "Orca Whirlpool",
      mint: p.nftMint,
      protocol: "Orca",
      amount: `${fmt(amtA)} ${m.aSymbol} + ${fmt(amtB)} ${m.bSymbol}`,
      detection: "protocol_api",
      valueUsd: null,
      apy: m.feeAprPct ?? null,
    });
  }
  return positions;
}

/** Whether a parsed token account looks like a position NFT (0 decimals, held). */
export function isNftCandidate(decimals: number | undefined, amount: string | undefined): boolean {
  return decimals === 0 && typeof amount === "string" && amount !== "0";
}

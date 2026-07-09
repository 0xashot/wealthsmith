/**
 * protocolPositions — READ-ONLY detection of positions that aren't plain wallet
 * token balances:
 *
 *  1. Native SOL stake accounts (SOL delegated directly to a validator). Read via
 *     the Stake program with getParsedProgramAccounts, filtered by the wallet's
 *     withdraw authority. (JupSOL/mSOL/etc. liquid staking is already covered as
 *     an LST token elsewhere — this covers *native* delegated stake.)
 *
 *  2. Kamino lending positions (e.g. "USDC supplied on Kamino"). Read from
 *     Kamino's public REST API (obligations per lending market, CORS-enabled, no
 *     key), then each deposit/borrow reserve's underlying mint is resolved
 *     ON-CHAIN (the reserve account's liquidity mint at a fixed offset) and mapped
 *     to a symbol via the approved mint registry.
 *
 * STRICTLY READ-ONLY: only RPC reads (getParsedProgramAccounts,
 * getMultipleAccountsInfo) and read-only HTTP GETs. NEVER signMessage /
 * signTransaction / signAllTransactions / sendTransaction. Ledger-safe. No USD
 * value or APY is invented — valueUsd/apy stay null; amounts shown are on-chain
 * facts only (Kamino positions are shown as detected supplied/borrowed, without a
 * fabricated USD value or cToken→underlying conversion).
 */
import { Connection, PublicKey } from "@solana/web3.js";
import { lookupMint, shortMint, type WalletPosition } from "./walletPosition";

/** Native Stake program. Withdraw authority sits at byte offset 44 in the account. */
export const STAKE_PROGRAM_ID = "Stake11111111111111111111111111111111111111";
const STAKE_WITHDRAWER_OFFSET = 44;

/**
 * Known validators the app recognizes by vote account, so native stake delegated
 * to them shows the operator's real name (and a real Manage destination) instead
 * of the generic "Native Stake" fallback. Sourced from the validator's on-chain
 * node identity (verified: this vote account's identity is JUPiTER…1h4b, Jupiter's
 * validator). Only add entries that are verified; unknown validators stay generic.
 */
const KNOWN_VALIDATORS: Record<string, { name: string; manageUrl: string }> = {
  // Jupiter's validator (vote account "Catzo…Diqb", node identity "JUPiTER…1h4b").
  CatzoSMUkTRidT5DwBxAC2pEtnwMBTpkCepHkFgZDiqb: {
    name: "Jupiter",
    manageUrl: "https://jup.ag",
  },
};

/** Kamino K-Lend. Public REST API + on-chain reserve reads (no key, read-only). */
export const KAMINO_API_BASE = "https://api.kamino.finance";
/** The reserve account's liquidity mint pubkey sits at byte offset 128. */
const RESERVE_LIQUIDITY_MINT_OFFSET = 128;
const SYSTEM_PROGRAM = "11111111111111111111111111111111";

/* -------------------------------------------------------------------------- */
/* Native stake                                                               */
/* -------------------------------------------------------------------------- */

interface ParsedStakeAccount {
  pubkey: PublicKey;
  account: {
    data: {
      parsed?: {
        info?: {
          stake?: { delegation?: { voter?: string; stake?: string } };
        };
      };
    };
  };
}

interface StakeEntry {
  pubkey: string;
  stakeLamports: number;
  voter?: string;
}

/**
 * getInflationReward can hang for 60s+ and then 504 on public RPCs (observed on
 * Helius). It shares the stake read's outer time box, so without its own cap a
 * slow APY lookup rejects the WHOLE native_stake read and the staked-SOL
 * positions disappear. Keep this well under the outer PROTOCOL_TIMEOUT_MS.
 */
const STAKE_APY_TIMEOUT_MS = 6_000;

/**
 * Realized native-staking APY per stake account, from the last completed epoch's
 * on-chain inflation reward (annualized). This is the actual yield earned, sourced
 * from the chain — not an invented estimate. Best-effort: returns an empty map on
 * any failure or on its own timeout (positions still show without APY).
 */
async function computeStakeApy(
  connection: Connection,
  entries: StakeEntry[]
): Promise<Map<string, number>> {
  const apyByPubkey = new Map<string, number>();
  try {
    const epochInfo = await connection.getEpochInfo();
    const rewards = await Promise.race([
      connection.getInflationReward(
        entries.map((e) => new PublicKey(e.pubkey)),
        epochInfo.epoch - 1
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`stake APY read timed out after ${STAKE_APY_TIMEOUT_MS}ms`)),
          STAKE_APY_TIMEOUT_MS
        )
      ),
    ]);
    // Solana slot time ≈ 0.4s → epoch duration → epochs per year.
    const epochDays = (epochInfo.slotsInEpoch * 0.4) / 86400;
    const epochsPerYear = epochDays > 0 ? 365.25 / epochDays : 182;
    rewards.forEach((reward, i) => {
      const entry = entries[i];
      if (reward?.amount && entry.stakeLamports > 0) {
        apyByPubkey.set(entry.pubkey, (reward.amount / entry.stakeLamports) * epochsPerYear * 100);
      }
    });
  } catch {
    // APY is best-effort.
  }
  return apyByPubkey;
}

export async function fetchNativeStakePositions(
  connection: Connection,
  owner: PublicKey
): Promise<WalletPosition[]> {
  const accounts = await connection.getParsedProgramAccounts(
    new PublicKey(STAKE_PROGRAM_ID),
    {
      filters: [{ memcmp: { offset: STAKE_WITHDRAWER_OFFSET, bytes: owner.toBase58() } }],
    }
  );

  const entries: StakeEntry[] = [];
  for (const raw of accounts as unknown as ParsedStakeAccount[]) {
    const delegation = raw.account?.data?.parsed?.info?.stake?.delegation;
    if (!delegation) continue; // initialized-but-undelegated stake account
    const stakeLamports = Number(delegation.stake ?? "0");
    if (!Number.isFinite(stakeLamports) || stakeLamports <= 0) continue;
    entries.push({ pubkey: raw.pubkey.toBase58(), stakeLamports, voter: delegation.voter });
  }
  if (entries.length === 0) return [];

  const apyByPubkey = await computeStakeApy(connection, entries);

  // Merge stake accounts that share the same validator AND APY into one position
  // (a wallet often has several stake accounts to the same validator). Grouped by
  // voter + APY (rounded to 2dp so float noise doesn't split a group); amounts sum.
  interface Group {
    stakeLamports: number;
    voter?: string;
    apy: number | null;
    count: number;
    key: string;
  }
  const groups = new Map<string, Group>();
  for (const e of entries) {
    const apy = apyByPubkey.get(e.pubkey) ?? null;
    const key = `${e.voter ?? "unknown"}|${apy == null ? "none" : apy.toFixed(2)}`;
    const g = groups.get(key);
    if (g) {
      g.stakeLamports += e.stakeLamports;
      g.count += 1;
    } else {
      groups.set(key, { stakeLamports: e.stakeLamports, voter: e.voter, apy, count: 1, key });
    }
  }

  return [...groups.values()].map((g) => ({
    id: `stake-${g.key}`,
    source: "wallet",
    type: "stake",
    symbol: "SOL",
    name: g.count > 1 ? `Staked SOL (${g.count} accounts)` : "Staked SOL",
    icon: "assets/icons/token/sol.svg",
    amount: String(g.stakeLamports),
    uiAmount: g.stakeLamports / 1e9,
    decimals: 9,
    // Recognized validator → the operator's name ("Jupiter"); otherwise generic.
    protocol: (g.voter && KNOWN_VALIDATORS[g.voter]?.name) ?? "Native Stake",
    detection: "native_stake",
    valueUsd: null,
    apy: g.apy,
    // Review-only handoff: a recognized validator's app page, else the validator's
    // explorer page (the vote account is the sourced on-chain destination).
    manageUrl: g.voter
      ? (KNOWN_VALIDATORS[g.voter]?.manageUrl ?? `https://solscan.io/account/${g.voter}`)
      : undefined,
  }));
}

/* -------------------------------------------------------------------------- */
/* Kamino lending                                                             */
/* -------------------------------------------------------------------------- */

interface KaminoReserveEntry {
  reserve: string;
  side: "supplied" | "borrowed";
}
interface KaminoDeposit {
  depositReserve?: string;
  depositedAmount?: string;
}
interface KaminoBorrow {
  borrowReserve?: string;
  borrowedAmountSf?: string;
  borrowedAmount?: string;
}
interface KaminoObligation {
  state?: { deposits?: KaminoDeposit[]; borrows?: KaminoBorrow[] };
}

async function fetchKaminoMarkets(): Promise<string[]> {
  // `/v2/kamino-market` lists ALL lending markets (~33). The legacy
  // `/kamino-market` returns only the primary market, which would miss USDC (and
  // other) positions held in non-primary markets (JLP, Altcoin, curated, etc.).
  const r = await fetch(`${KAMINO_API_BASE}/v2/kamino-market`);
  if (!r.ok) return [];
  const j: unknown = await r.json();
  if (!Array.isArray(j)) return [];
  return j
    .map((m) => (m as { lendingMarket?: string }).lendingMarket)
    .filter((m): m is string => typeof m === "string" && m.length > 0);
}

async function fetchMarketReserveEntries(
  market: string,
  ownerB58: string
): Promise<KaminoReserveEntry[]> {
  const r = await fetch(`${KAMINO_API_BASE}/kamino-market/${market}/users/${ownerB58}/obligations`);
  if (!r.ok) return [];
  const obligations: unknown = await r.json();
  if (!Array.isArray(obligations)) return [];

  const entries: KaminoReserveEntry[] = [];
  for (const ob of obligations as KaminoObligation[]) {
    const state = ob?.state;
    for (const d of state?.deposits ?? []) {
      if (
        d?.depositReserve &&
        d.depositReserve !== SYSTEM_PROGRAM &&
        d.depositedAmount &&
        d.depositedAmount !== "0"
      ) {
        entries.push({ reserve: d.depositReserve, side: "supplied" });
      }
    }
    for (const b of state?.borrows ?? []) {
      const amt = b?.borrowedAmountSf ?? b?.borrowedAmount;
      if (b?.borrowReserve && b.borrowReserve !== SYSTEM_PROGRAM && amt && amt !== "0") {
        entries.push({ reserve: b.borrowReserve, side: "borrowed" });
      }
    }
  }
  return entries;
}

/** Read each reserve's underlying liquidity mint on-chain (offset 128). */
async function resolveReserveMints(
  connection: Connection,
  reserves: string[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (reserves.length === 0) return out;
  const infos = await connection.getMultipleAccountsInfo(reserves.map((r) => new PublicKey(r)));
  infos.forEach((acc, i) => {
    const data = acc?.data;
    if (data && data.length >= RESERVE_LIQUIDITY_MINT_OFFSET + 32) {
      const mintBytes = data.subarray(
        RESERVE_LIQUIDITY_MINT_OFFSET,
        RESERVE_LIQUIDITY_MINT_OFFSET + 32
      );
      out.set(reserves[i], new PublicKey(mintBytes).toBase58());
    }
  });
  return out;
}

export async function fetchKaminoPositions(
  connection: Connection,
  owner: PublicKey
): Promise<WalletPosition[]> {
  const ownerB58 = owner.toBase58();
  const markets = await fetchKaminoMarkets();
  if (markets.length === 0) return [];

  // Gather non-zero deposit/borrow reserves across all lending markets.
  const perMarket = await Promise.all(
    markets.map((m) => fetchMarketReserveEntries(m, ownerB58).catch(() => []))
  );
  const entries = perMarket.flat();
  if (entries.length === 0) return [];

  const uniqueReserves = [...new Set(entries.map((e) => e.reserve))];
  const mintByReserve = await resolveReserveMints(connection, uniqueReserves);

  const positions: WalletPosition[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const id = `kamino-${entry.side}-${entry.reserve}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const mint = mintByReserve.get(entry.reserve);
    const known = mint ? lookupMint(mint) : undefined;
    positions.push({
      id,
      source: "kamino",
      type: "protocol",
      symbol: known?.symbol ?? (mint ? shortMint(mint) : shortMint(entry.reserve)),
      name: known?.name,
      mint,
      icon: known?.icon,
      protocol: "Kamino",
      amount: "", // On-chain amount is in cToken units; not shown to avoid a wrong figure.
      side: entry.side,
      detection: "protocol_api",
      valueUsd: null,
      apy: null,
    });
  }
  return positions;
}

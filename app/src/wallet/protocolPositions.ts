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
import {
  STAKE_PROGRAM_ID as STAKE_PROG,
  assessNativeStakeAccount,
  groupNativeStakeByValidator,
  toNativeStakeWalletFields,
  nativeStakeDedupeKey,
  type NativeStakeFacts,
  type StakeActivationFacts,
  type NativeStakePositionResult,
} from "./nativeStakePositionAssessment";

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
/** `liquidity.mint_decimals` (u64). */
const RESERVE_MINT_DECIMALS_OFFSET = 272;
/**
 * `collateral.mint_total_supply` (u64) — the total cTokens issued by this reserve.
 *
 * A K-Lend obligation stores each deposit in COLLATERAL (cToken) units, not in
 * underlying tokens, so it must be converted before it can be shown or valued:
 *
 *   underlying = depositedAmount × (reserve total liquidity ÷ mint_total_supply)
 *
 * That ratio is the collateral exchange rate, and it is exactly where the
 * supplier's accrued interest lives (USDC's is ~1.19 today, i.e. a cToken is
 * worth 1.19 USDC). Skipping it would understate every lending position.
 *
 * Offset verified against mainnet: for the SOL and USDT reserves this u64 equals
 * `getTokenSupply(collateral.mint_pubkey)` exactly (the pubkey sits at 2560).
 */
const RESERVE_COLLATERAL_MINT_TOTAL_SUPPLY_OFFSET = 2592;
/** Borrowed amounts are u128 "scaled fractions" — value × 2^60. */
const SF_SCALE = 2 ** 60;
const SYSTEM_PROGRAM = "11111111111111111111111111111111";

/* -------------------------------------------------------------------------- */
/* Native stake                                                               */
/* -------------------------------------------------------------------------- */

interface ParsedStakeAccount {
  pubkey: PublicKey;
  account: {
    lamports?: number;
    owner?: PublicKey;
    data: {
      parsed?: {
        type?: string; // "delegated" | "initialized" | "uninitialized" | "rewardsPool"
        info?: {
          meta?: {
            rentExemptReserve?: string;
            authorized?: { staker?: string; withdrawer?: string };
            lockup?: { unixTimestamp?: number; epoch?: number; custodian?: string };
          };
          stake?: {
            delegation?: {
              voter?: string; stake?: string; activationEpoch?: string; deactivationEpoch?: string;
            };
          };
        };
      };
    };
  };
}

/** Bounded-concurrency map (§4/§10 — avoid one unbounded RPC per account). */
async function mapBounded<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); }
  });
  await Promise.all(workers);
  return out;
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
 * How many completed epochs back to look for a realized reward.
 *
 * The last epoch alone is not enough: an account that was delegated recently is
 * still warming up and was paid nothing at that boundary, a validator that was
 * delinquent for an epoch pays nothing, and some RPCs have already pruned the
 * blocks a given epoch's rewards live in. Any of those left the position with no
 * APY at all. Walking back a few epochs finds the most recent REAL reward instead
 * — still strictly on-chain realized yield, never an estimate.
 */
const STAKE_APY_LOOKBACK_EPOCHS = 3;

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
  let epochInfo;
  try {
    epochInfo = await connection.getEpochInfo();
  } catch {
    return apyByPubkey; // APY is best-effort.
  }
  // Solana slot time ≈ 0.4s → epoch duration → epochs per year.
  const epochDays = (epochInfo.slotsInEpoch * 0.4) / 86400;
  const epochsPerYear = epochDays > 0 ? 365.25 / epochDays : 182;

  // One shared deadline across the whole lookback, so adding epochs can never
  // widen the outer time box this read has to live inside.
  const deadline = Date.now() + STAKE_APY_TIMEOUT_MS;
  let pending = entries;

  for (let back = 1; back <= STAKE_APY_LOOKBACK_EPOCHS && pending.length > 0; back++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    try {
      const batch = pending;
      const rewards = await Promise.race([
        connection.getInflationReward(
          batch.map((e) => new PublicKey(e.pubkey)),
          epochInfo.epoch - back
        ),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`stake APY read timed out after ${STAKE_APY_TIMEOUT_MS}ms`)),
            remaining
          )
        ),
      ]);
      // Accounts still without a reward drop to the next (older) epoch; the first
      // reward found for an account wins, so we always report the most recent one.
      const stillPending: StakeEntry[] = [];
      rewards.forEach((reward, i) => {
        const entry = batch[i];
        if (reward?.amount && entry.stakeLamports > 0) {
          apyByPubkey.set(entry.pubkey, (reward.amount / entry.stakeLamports) * epochsPerYear * 100);
        } else {
          stillPending.push(entry);
        }
      });
      pending = stillPending;
    } catch {
      // This epoch is unreadable (pruned on this RPC) or the read timed out —
      // keep the accounts pending and let the next epoch try.
    }
  }
  return apyByPubkey;
}

export async function fetchNativeStakePositions(
  connection: Connection,
  owner: PublicKey
): Promise<WalletPosition[]> {
  // Step 17F — ownership rule (preserved): the AUTHORIZED WITHDRAWER is the economic owner
  // (memcmp at offset 44). A differing staker does not remove ownership.
  const accounts = await connection.getParsedProgramAccounts(
    new PublicKey(STAKE_PROGRAM_ID),
    {
      filters: [{ memcmp: { offset: STAKE_WITHDRAWER_OFFSET, bytes: owner.toBase58() } }],
    }
  );
  const parsed = accounts as unknown as ParsedStakeAccount[];
  if (parsed.length === 0) return [];

  // Current epoch + a source-backed cluster Unix time — fetched ONCE (never per account). Fail-closed to
  // null so lockup/lifecycle become unresolved rather than guessed.
  let currentEpoch: number | null = null;
  let currentUnixTime: number | null = null;
  let sourceSlot = 0;
  try {
    const epochInfo = await connection.getEpochInfo();
    currentEpoch = epochInfo.epoch;
    sourceSlot = Number(epochInfo.absoluteSlot);
    try { const t = await connection.getBlockTime(epochInfo.absoluteSlot); currentUnixTime = t ?? null; } catch { currentUnixTime = null; }
  } catch { /* epoch unresolved → lifecycle/lockup fail closed */ }

  const nowIso = new Date().toISOString();
  // getStakeActivation is the exact activation decomposition (active + inactive lamports + state). Called
  // with BOUNDED CONCURRENCY (never one unbounded request per account). Any failure → null (unresolved).
  const delegatedAddrs = parsed
    .filter((r) => r.account?.data?.parsed?.type === "delegated")
    .map((r) => r.pubkey);
  const activationByAddr = new Map<string, StakeActivationFacts | null>();
  if (currentEpoch !== null && delegatedAddrs.length > 0) {
    const results = await mapBounded(delegatedAddrs, 6, async (pk) => {
      try {
        const a: any = await (connection as any).getStakeActivation(pk);
        if (!a || typeof a.state !== "string") return null;
        return { state: a.state, activeLamports: Number(a.active ?? 0), inactiveLamports: Number(a.inactive ?? 0) } as StakeActivationFacts;
      } catch { return null; }
    });
    delegatedAddrs.forEach((pk, i) => activationByAddr.set(pk.toBase58(), results[i] ?? null));
  }

  // Realized APY per stake account (reuses the existing on-chain inflation-reward path).
  const apyEntries: StakeEntry[] = parsed
    .map((r) => ({ pubkey: r.pubkey.toBase58(), stakeLamports: Number(r.account?.data?.parsed?.info?.stake?.delegation?.stake ?? "0"), voter: r.account?.data?.parsed?.info?.stake?.delegation?.voter }))
    .filter((e) => e.stakeLamports > 0);
  const apyByPubkey = apyEntries.length > 0 ? await computeStakeApy(connection, apyEntries) : new Map<string, number>();

  // Decode + assess each account (pure, fail-closed). Ownership double-checked in the assessor.
  const records: NativeStakePositionResult[] = parsed.map((r) => {
    const info = r.account?.data?.parsed?.info;
    const meta = info?.meta;
    const del = info?.stake?.delegation;
    const addr = r.pubkey.toBase58();
    const facts: NativeStakeFacts = {
      stakeAccount: addr, wallet: owner.toBase58(),
      ownerProgram: r.account?.owner?.toBase58?.() ?? STAKE_PROG,
      accountType: (r.account?.data?.parsed?.type as NativeStakeFacts["accountType"]) ?? null,
      totalLamports: typeof r.account?.lamports === "number" ? r.account.lamports : null,
      rentExemptReserveLamports: meta?.rentExemptReserve != null ? Number(meta.rentExemptReserve) : null,
      authorizedStaker: meta?.authorized?.staker ?? null,
      authorizedWithdrawer: meta?.authorized?.withdrawer ?? null,
      lockup: meta?.lockup ? { unixTimestamp: meta.lockup.unixTimestamp ?? null, epoch: meta.lockup.epoch ?? null, custodian: meta.lockup.custodian ?? null } : null,
      delegation: del ? { voter: del.voter ?? null, stakeLamports: del.stake != null ? Number(del.stake) : null, activationEpoch: del.activationEpoch ?? null, deactivationEpoch: del.deactivationEpoch ?? null } : null,
      currentEpoch, currentUnixTime, activation: activationByAddr.get(addr) ?? null,
      validatorStatus: null, apy: apyByPubkey.get(addr) ?? null, apyFresh: apyByPubkey.has(addr),
      observedAt: nowIso, sourceSlot, fresh: true,
    };
    return assessNativeStakeAccount(facts);
  });

  // Group OWNED account records by validator; preserve the account breakdown + strictest state.
  const groups = groupNativeStakeByValidator(records);
  return groups.map((g) => {
    const fields = toNativeStakeWalletFields(g, null, false); // USD applied later (post-price)
    const name = g.accounts.length > 1
      ? `Staked SOL (${g.accounts.length} accounts)`
      : g.lifecycleSummary === "active" ? "Staked SOL" : "Native stake";
    return {
      id: `stake-${g.voteAccount ?? "none"}-${g.accounts[0]?.stakeAccount ?? "x"}`,
      source: "wallet",
      type: "stake",
      symbol: "SOL",
      name,
      icon: "assets/icons/token/sol.svg",
      decimals: 9,
      protocol: (g.voteAccount && KNOWN_VALIDATORS[g.voteAccount]?.name) ?? "Native Stake",
      detection: "native_stake",
      apy: g.apy,
      dedupeKey: g.accounts.length === 1 ? nativeStakeDedupeKey(g.accounts[0].stakeAccount) : `native-stake-group:${g.voteAccount ?? "none"}`,
      manageUrl: g.voteAccount
        ? (KNOWN_VALIDATORS[g.voteAccount]?.manageUrl ?? `https://solscan.io/account/${g.voteAccount}`)
        : undefined,
      ...fields,
    } as WalletPosition;
  });
}

/* -------------------------------------------------------------------------- */
/* Kamino lending                                                             */
/* -------------------------------------------------------------------------- */

interface KaminoReserveEntry {
  /** The lending market the obligation lives in — its metrics endpoint is per market. */
  market: string;
  reserve: string;
  side: "supplied" | "borrowed";
  /** Supplied: cToken units. Borrowed: underlying × 2^60 (scaled fraction). */
  rawAmount: string;
}

/** Per-reserve market data from Kamino's official reserve-metrics endpoint. */
interface KaminoReserveMetrics {
  /** Total liquidity supplied, in whole underlying tokens. */
  totalSupply: number;
  /** …and its USD value, which yields the token's sourced price. */
  totalSupplyUsd: number;
  /** Supply/borrow APY as fractions (0.0421 = 4.21%). */
  supplyApy: number;
  borrowApy: number;
}

/** Decoded reserve-account fields needed to value an obligation. */
interface KaminoReserveState {
  mint?: string;
  decimals?: number;
  /** Total cTokens issued — the denominator of the collateral exchange rate. */
  collateralMintTotalSupply?: number;
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

/**
 * PURE parser for a Kamino obligations API response — separated from the fetch so
 * the fixture suite can run the exact production parsing against a RECORDED
 * response body (the obligation-held deposit path shipped with no end-to-end
 * coverage, and four separate bugs hid in it). Unknown/malformed input yields no
 * entries, never a throw.
 */
export function parseKaminoObligationEntries(
  obligations: unknown,
  market: string
): KaminoReserveEntry[] {
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
        entries.push({
          market,
          reserve: d.depositReserve,
          side: "supplied",
          rawAmount: d.depositedAmount,
        });
      }
    }
    for (const b of state?.borrows ?? []) {
      const amt = b?.borrowedAmountSf ?? b?.borrowedAmount;
      if (b?.borrowReserve && b.borrowReserve !== SYSTEM_PROGRAM && amt && amt !== "0") {
        entries.push({ market, reserve: b.borrowReserve, side: "borrowed", rawAmount: amt });
      }
    }
  }
  return entries;
}

/** PURE: supplied collateral (raw cToken units) per reserve, from parsed entries. */
export function collateralRawFromEntries(entries: KaminoReserveEntry[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.side === "supplied") out[entry.reserve] = entry.rawAmount;
  }
  return out;
}

async function fetchMarketReserveEntries(
  market: string,
  ownerB58: string
): Promise<KaminoReserveEntry[]> {
  const r = await fetch(`${KAMINO_API_BASE}/kamino-market/${market}/users/${ownerB58}/obligations`);
  if (!r.ok) return [];
  return parseKaminoObligationEntries(await r.json(), market);
}

/**
 * Per-reserve market data for one lending market, from Kamino's official
 * `/reserves/metrics` endpoint. This is the same source the Kamino app shows, so
 * the APY we display matches theirs. Empty map on any failure (never invented).
 */
async function fetchMarketReserveMetrics(
  market: string
): Promise<Map<string, KaminoReserveMetrics>> {
  const out = new Map<string, KaminoReserveMetrics>();
  const r = await fetch(`${KAMINO_API_BASE}/kamino-market/${market}/reserves/metrics`);
  if (!r.ok) return out;
  const j: unknown = await r.json();
  if (!Array.isArray(j)) return out;
  for (const row of j as Record<string, unknown>[]) {
    const reserve = row?.reserve;
    if (typeof reserve !== "string") continue;
    out.set(reserve, {
      totalSupply: Number(row.totalSupply),
      totalSupplyUsd: Number(row.totalSupplyUsd),
      supplyApy: Number(row.supplyApy),
      borrowApy: Number(row.borrowApy),
    });
  }
  return out;
}

/**
 * Read each reserve on-chain for the fields an obligation cannot supply itself:
 * the underlying liquidity mint, its decimals, and the cToken supply that gives
 * the collateral exchange rate.
 */
async function readReserveStates(
  connection: Connection,
  reserves: string[]
): Promise<Map<string, KaminoReserveState>> {
  const out = new Map<string, KaminoReserveState>();
  if (reserves.length === 0) return out;
  const infos = await connection.getMultipleAccountsInfo(reserves.map((r) => new PublicKey(r)));
  infos.forEach((acc, i) => {
    const data = acc?.data;
    if (!data) return;
    const state: KaminoReserveState = {};
    if (data.length >= RESERVE_LIQUIDITY_MINT_OFFSET + 32) {
      state.mint = new PublicKey(
        data.subarray(RESERVE_LIQUIDITY_MINT_OFFSET, RESERVE_LIQUIDITY_MINT_OFFSET + 32)
      ).toBase58();
    }
    if (data.length >= RESERVE_MINT_DECIMALS_OFFSET + 8) {
      state.decimals = Number(data.readBigUInt64LE(RESERVE_MINT_DECIMALS_OFFSET));
    }
    if (data.length >= RESERVE_COLLATERAL_MINT_TOTAL_SUPPLY_OFFSET + 8) {
      state.collateralMintTotalSupply = Number(
        data.readBigUInt64LE(RESERVE_COLLATERAL_MINT_TOTAL_SUPPLY_OFFSET)
      );
    }
    out.set(reserves[i], state);
  });
  return out;
}

/**
 * Underlying token amount for one obligation entry, or undefined when any input
 * is missing or unusable — an unresolvable position shows "—" rather than a
 * number we cannot stand behind.
 */
function kaminoEntryUiAmount(
  entry: KaminoReserveEntry,
  state: KaminoReserveState | undefined,
  metrics: KaminoReserveMetrics | undefined
): number | undefined {
  const raw = Number(entry.rawAmount);
  if (!Number.isFinite(raw) || raw <= 0) return undefined;

  if (entry.side === "borrowed") {
    // Borrows are already in underlying units, scaled by 2^60.
    const decimals = state?.decimals;
    if (decimals === undefined || !Number.isFinite(decimals)) return undefined;
    const amount = raw / SF_SCALE / 10 ** decimals;
    return Number.isFinite(amount) && amount > 0 ? amount : undefined;
  }

  // Supplied: cTokens → underlying, via the collateral exchange rate. Dividing by
  // the cToken supply FIRST keeps the intermediate well inside float precision.
  const cSupply = state?.collateralMintTotalSupply;
  const totalSupply = metrics?.totalSupply;
  if (!cSupply || !Number.isFinite(cSupply) || !totalSupply || !Number.isFinite(totalSupply)) {
    return undefined;
  }
  const amount = (raw / cSupply) * totalSupply;
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

export interface KaminoPositionsResult {
  positions: WalletPosition[];
  /**
   * Raw COLLATERAL (cToken) units supplied per reserve, straight from the
   * obligation. A K-Lend deposit made through Kamino's own app leaves no cTokens
   * in the wallet — the obligation holds them — so this is the only place the
   * user's cToken balance is observable. The Step 17A existing-position adapter
   * needs exactly this to run its approved redemption + withdrawal math.
   */
  collateralRawByReserve: Record<string, string>;
  /**
   * Supply APY (percent) per reserve, from Kamino's official reserve-metrics
   * endpoint — the same number their app shows. The 17A adapter needs it because
   * the row it produces replaces the raw obligation row that carries it.
   */
  supplyApyPctByReserve: Record<string, number>;
}

export async function fetchKaminoPositions(
  connection: Connection,
  owner: PublicKey
): Promise<KaminoPositionsResult> {
  const ownerB58 = owner.toBase58();
  const empty: KaminoPositionsResult = { positions: [], collateralRawByReserve: {}, supplyApyPctByReserve: {} };
  const markets = await fetchKaminoMarkets();
  if (markets.length === 0) return empty;

  // Gather non-zero deposit/borrow reserves across all lending markets.
  const perMarket = await Promise.all(
    markets.map((m) => fetchMarketReserveEntries(m, ownerB58).catch(() => []))
  );
  const entries = perMarket.flat();
  if (entries.length === 0) return empty;

  const uniqueReserves = [...new Set(entries.map((e) => e.reserve))];
  // Reserve state (on-chain) and market metrics (Kamino API) are independent
  // reads; either failing only costs the fields it owns, never the position.
  const activeMarkets = [...new Set(entries.map((e) => e.market))];
  const [stateByReserve, metricsPerMarket] = await Promise.all([
    readReserveStates(connection, uniqueReserves),
    Promise.all(activeMarkets.map((m) => fetchMarketReserveMetrics(m).catch(() => new Map()))),
  ]);
  const metricsByReserve = new Map<string, KaminoReserveMetrics>();
  for (const m of metricsPerMarket) for (const [k, v] of m) metricsByReserve.set(k, v);

  const positions: WalletPosition[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const id = `kamino-${entry.side}-${entry.reserve}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const state = stateByReserve.get(entry.reserve);
    const metrics = metricsByReserve.get(entry.reserve);
    const mint = state?.mint;
    const known = mint ? lookupMint(mint) : undefined;

    const uiAmount = kaminoEntryUiAmount(entry, state, metrics);
    // Supplied earns the supply APY; a borrow costs the borrow APY.
    const apyFraction = entry.side === "borrowed" ? metrics?.borrowApy : metrics?.supplyApy;
    const apy =
      typeof apyFraction === "number" && Number.isFinite(apyFraction) ? apyFraction * 100 : null;

    positions.push({
      id,
      source: "kamino",
      type: "protocol",
      symbol: known?.symbol ?? (mint ? shortMint(mint) : shortMint(entry.reserve)),
      name: known?.name,
      mint,
      icon: known?.icon,
      protocol: "Kamino",
      amount: uiAmount != null ? String(uiAmount) : "",
      uiAmount,
      side: entry.side,
      detection: "protocol_api",
      // `legs` is what the portfolio's pricing pass values a protocol position
      // by (mint + amount → the same price feed every other holding uses), so a
      // lent balance now counts toward Total Portfolio Value like the vault does.
      legs:
        mint && uiAmount != null
          ? [{ mint, uiAmount, side: entry.side === "borrowed" ? "debt" : "long" }]
          : undefined,
      valueUsd: null,
      apy,
    });
  }

  // Supplied collateral per reserve, in raw cToken units, for the 17A adapter.
  const collateralRawByReserve = collateralRawFromEntries(entries);
  const supplyApyPctByReserve: Record<string, number> = {};
  for (const entry of entries) {
    if (entry.side !== "supplied") continue;
    const apyFraction = metricsByReserve.get(entry.reserve)?.supplyApy;
    if (typeof apyFraction === "number" && Number.isFinite(apyFraction)) {
      supplyApyPctByReserve[entry.reserve] = apyFraction * 100;
    }
  }
  return { positions, collateralRawByReserve, supplyApyPctByReserve };
}

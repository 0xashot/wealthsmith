/**
 * contributionHistory — READ-ONLY estimate of NET CONTRIBUTIONS (external capital
 * in minus out) over a window, derived from parsed wallet transfers.
 *
 * "Contributions" = value that CROSSES the wallet boundary from outside: deposits
 * (+) and withdrawals (−). Internal reallocation (staking, swaps, LP) does NOT
 * change net contributions, so it is excluded — we count only `TRANSFER`-type
 * transactions, and only the legs where the counterparty is a DIFFERENT owner.
 * Each counted transfer is valued at its HISTORICAL price (DefiLlama), never
 * invented; a transfer we can't price is dropped (marked partial), never guessed.
 *
 * Source: Helius Enhanced Transactions API (parsed, typed history). It needs a
 * Helius RPC — the api-key is read from the configured endpoint; on any other RPC
 * (or a read failure) this returns null and the UI shows "—".
 *
 * HONEST ESTIMATE: on-chain we can't distinguish new external capital from a
 * transfer between the user's own wallets or a CEX move, so the result is labeled
 * as an estimate. Best-effort: failures degrade to null/partial, never an error.
 */
export const SOL_MINT = "So11111111111111111111111111111111111111112";

export interface ContributionSummary {
  /** Net deposits − withdrawals, valued at each transfer's time (USD). */
  netUsd: number;
  windowDays: number;
  /** Number of external transfer legs that were valued. */
  transferCount: number;
  asOf: number;
  /** True if the page cap was hit or some transfers couldn't be valued. */
  partial: boolean;
}

interface TransferEvent {
  mint: string;
  /** Human (ui) amount. */
  amount: number;
  timestamp: number;
  sign: 1 | -1;
}

const MAX_PAGES = 12; // history depth cap (≈1200 txs)
const PRICE_SEARCH_WIDTH = "6h";

/** Extract the Helius api-key from a Helius RPC URL, or null for any other RPC. */
function heliusKey(rpcUrl: string): string | null {
  try {
    const u = new URL(rpcUrl);
    if (!/helius/i.test(u.hostname)) return null;
    return u.searchParams.get("api-key");
  } catch {
    return null;
  }
}

/** +1 when value enters the owner, −1 when it leaves, 0 for internal/self legs. */
function signFor(from: unknown, to: unknown, owner: string): 1 | -1 | 0 {
  if (to === owner && from !== owner) return 1;
  if (from === owner && to !== owner) return -1;
  return 0;
}

/** Value each transfer at its historical price (batched by mint via DefiLlama). */
async function valueEvents(
  events: TransferEvent[]
): Promise<{ netUsd: number; valued: number; unvalued: number }> {
  const coins: Record<string, number[]> = {};
  for (const e of events) {
    const key = `solana:${e.mint}`;
    (coins[key] ??= []).push(e.timestamp);
  }

  let priced: Record<string, { prices?: Array<{ timestamp: number; price: number }> }> = {};
  try {
    const url =
      "https://coins.llama.fi/batchHistorical?coins=" +
      encodeURIComponent(JSON.stringify(coins)) +
      "&searchWidth=" +
      PRICE_SEARCH_WIDTH;
    const r = await fetch(url);
    if (r.ok) {
      const j = (await r.json()) as { coins?: typeof priced };
      priced = j?.coins ?? {};
    }
  } catch {
    // best-effort — unpriced events are dropped below
  }

  const nearest = (
    prices: Array<{ timestamp: number; price: number }> | undefined,
    ts: number
  ): number | null => {
    if (!prices || prices.length === 0) return null;
    let best = prices[0];
    for (const p of prices) {
      if (Math.abs(p.timestamp - ts) < Math.abs(best.timestamp - ts)) best = p;
    }
    return typeof best.price === "number" ? best.price : null;
  };

  let netUsd = 0;
  let valued = 0;
  let unvalued = 0;
  for (const e of events) {
    const price = nearest(priced[`solana:${e.mint}`]?.prices, e.timestamp);
    if (price == null) {
      unvalued++;
      continue;
    }
    netUsd += e.sign * e.amount * price;
    valued++;
  }
  return { netUsd, valued, unvalued };
}

export async function fetchNetContributions(
  rpcUrl: string,
  owner: string,
  windowDays = 365
): Promise<ContributionSummary | null> {
  const key = heliusKey(rpcUrl);
  if (!key) return null; // needs a Helius RPC to read parsed history

  const cutoff = Math.floor(Date.now() / 1000) - windowDays * 86400;
  const events: TransferEvent[] = [];
  let before: string | undefined;
  let partial = false;
  let pages = 0;

  try {
    outer: while (pages < MAX_PAGES) {
      pages++;
      const url =
        `https://api.helius.xyz/v0/addresses/${owner}/transactions?api-key=${key}&limit=100` +
        (before ? `&before=${before}` : "");
      const r = await fetch(url);
      if (!r.ok) {
        partial = true;
        break;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txs: any[] = await r.json();
      if (!Array.isArray(txs) || txs.length === 0) break;

      for (const tx of txs) {
        if (typeof tx.timestamp === "number" && tx.timestamp < cutoff) break outer;
        if (tx.type !== "TRANSFER") continue; // only pure transfers cross the boundary
        for (const nt of tx.nativeTransfers ?? []) {
          const sign = signFor(nt.fromUserAccount, nt.toUserAccount, owner);
          const lamports = Number(nt.amount);
          if (sign && lamports > 0) {
            events.push({ mint: SOL_MINT, amount: lamports / 1e9, timestamp: tx.timestamp, sign });
          }
        }
        for (const tt of tx.tokenTransfers ?? []) {
          const sign = signFor(tt.fromUserAccount, tt.toUserAccount, owner);
          const amount = Number(tt.tokenAmount);
          if (sign && amount > 0 && typeof tt.mint === "string") {
            events.push({ mint: tt.mint, amount, timestamp: tx.timestamp, sign });
          }
        }
      }

      before = txs[txs.length - 1]?.signature;
      if (!before || txs.length < 100) break;
    }
    if (pages >= MAX_PAGES) partial = true;
  } catch {
    if (events.length === 0) return null;
    partial = true;
  }

  if (events.length === 0) {
    return { netUsd: 0, windowDays, transferCount: 0, asOf: Date.now(), partial };
  }

  const { netUsd, valued, unvalued } = await valueEvents(events);
  return {
    netUsd,
    windowDays,
    transferCount: valued,
    asOf: Date.now(),
    partial: partial || unvalued > 0,
  };
}

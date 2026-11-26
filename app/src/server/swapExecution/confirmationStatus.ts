/**
 * confirmationStatus — Phase 6 (SERVER-ONLY). Did the transaction land?
 *
 * The wallet submits and hands back a signature. Finding out what became of it needs a chain
 * read, and in production the browser has no RPC — the same constraint that put the simulation
 * on the server puts this here too.
 *
 * READ-ONLY, and narrower than anything else in this lane. It takes a signature and returns one
 * of three words. It cannot submit, cannot re-send, cannot cancel, and is not given the means
 * to: nothing in this module constructs a transaction.
 *
 * NOT KNOWING IS ITS OWN ANSWER. `pending` covers both "still working" and "we could not read
 * it", and the caller treats them the same — keep waiting, then stop waiting. Neither is
 * allowed to become `failed`, because a transaction we cannot see is not a transaction that
 * did not happen, and telling someone their swap failed when it is about to land is the worst
 * thing this flow could say.
 */
import { Connection } from "@solana/web3.js";
import type { EnvReader } from "../swapQuote/providerConfig";
import { EXECUTION_RPC_ENV_KEY } from "./planVerification";

/** Base58, 64 bytes — 86 to 88 characters. Shape only; the chain decides if it is real. */
const SIGNATURE_RE = /^[1-9A-HJ-NP-Za-km-z]{86,88}$/;

export type ConfirmationState =
  /** Landed and succeeded. The only state that may be shown as a completed swap. */
  | "confirmed"
  /** In flight, or unreadable. Keep waiting; never report as failure. */
  | "pending"
  /** Landed and the transaction itself errored. The chain said no — this is a real failure. */
  | "failed";

export interface ConfirmationResult {
  state: ConfirmationState;
  /**
   * What the taker ACTUALLY received, in base units, read from the landed transaction.
   *
   * Null whenever it could not be read — no RPC, a transaction the node has pruned, an output
   * that is not an SPL token balance. Null is not zero and not an error: it means the success
   * screen omits the figure rather than reprinting the quote's estimate as if it were fact.
   * The estimate was a prediction made before the swap; this is the only number that can
   * honestly follow the words "You received".
   */
  deliveredRaw: string | null;
  /**
   * The fee the chain actually took, in lamports, read from the landed transaction.
   *
   * Read for a REVERT as well as a success, and that is the case it exists for: a reverted
   * swap moved no tokens and still cost the user money, and the screen that reports it says
   * so with a figure. The disclosed constant the terms carry is a conservative estimate made
   * beforehand and cannot be used for a charge stated in the past tense.
   *
   * Null when it could not be read. The sentence then drops the figure rather than the fact.
   */
  feeLamports: string | null;
  /** That fee in USD, from the same source the terms were priced with. Null when unpriced. */
  feeUsd: number | null;
}

/** Lamports per SOL. Not a magic number anywhere else in this file. */
export const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Lamports → USD, or null when either half is missing.
 *
 * Pure. A fee is small enough that double precision is not a risk here — unlike a token
 * balance, which is why that one is BigInt all the way and this one is not.
 */
export function feeUsdFrom(feeLamports: string | null, solUsdPrice: number | null): number | null {
  if (feeLamports == null || !/^[0-9]+$/.test(feeLamports)) return null;
  if (typeof solUsdPrice !== "number" || !Number.isFinite(solUsdPrice) || solUsdPrice <= 0) return null;
  return (Number(feeLamports) / LAMPORTS_PER_SOL) * solUsdPrice;
}

/** The read this needs. Narrow on purpose, so the stub in a fixture is the whole surface. */
export interface SignatureStatusRpc {
  getStatus(signature: string): Promise<{ confirmed: boolean; err: unknown } | null>;
  /**
   * What the landed transaction itself records: the taker's balance change in one mint, and
   * the fee the chain took. ONE read, because they come from one `getTransaction` and asking
   * twice would double the RPC cost of every outcome.
   *
   * Optional so an RPC that cannot do it, or a fixture that does not care, simply yields no
   * figures. Returning nulls must always remain safe.
   */
  getLandedFacts?(args: {
    signature: string;
    delivery: { owner: string; mint: string } | null;
  }): Promise<{ deliveredRaw: string | null; feeLamports: string | null }>;
}

/**
 * The taker's delta in one mint across a transaction, from pre/post token balances.
 *
 * Pure, so the arithmetic is testable without a chain. BigInt throughout: these are base units
 * and a float would start losing them at nine significant digits, which USDC reaches at ten
 * thousand dollars.
 *
 * A NEGATIVE OR ZERO DELTA YIELDS NULL. The caller asks this only about the output mint of a
 * confirmed swap, so a non-positive answer means the records are not what we assumed — the
 * wrong account, a mint that also appears as an input, a route that settled elsewhere. In that
 * case we do not know what arrived, and saying so is the only honest option.
 */
export function deliveredFromBalances(
  pre: { owner?: string | null; mint?: string | null; uiTokenAmount?: { amount?: string | null } | null }[],
  post: { owner?: string | null; mint?: string | null; uiTokenAmount?: { amount?: string | null } | null }[],
  owner: string,
  mint: string,
): string | null {
  const amountOf = (
    rows: { owner?: string | null; mint?: string | null; uiTokenAmount?: { amount?: string | null } | null }[],
  ): bigint | null => {
    const row = rows.find((r) => r.owner === owner && r.mint === mint);
    const raw = row?.uiTokenAmount?.amount;
    if (typeof raw !== "string" || !/^[0-9]+$/.test(raw)) return null;
    return BigInt(raw);
  };
  const after = amountOf(post);
  // Absent BEFORE is a legitimate zero: the taker may not have held this mint until now, which
  // is the common case for a swap into a token. Absent AFTER is not readable at all.
  if (after == null) return null;
  const before = amountOf(pre) ?? 0n;
  const delta = after - before;
  return delta > 0n ? delta.toString() : null;
}

export function isSignatureShaped(signature: unknown): signature is string {
  return typeof signature === "string" && SIGNATURE_RE.test(signature);
}

/**
 * The highest transaction version this read will accept.
 *
 * NOT ZERO, and this is the whole point. `getTransaction` rejects any transaction newer than
 * the version the caller claims to understand, with `-32015`, and version 1 transactions are
 * now routine on mainnet — measured 2026-11-26 against live Jupiter swaps, where every v0
 * returned its fee and every v1 returned nothing at all. The failure is silent: the error is
 * caught, the figures come back null, and the success screen says it could not read the
 * amount for a transaction that is sitting right there.
 *
 * A high constant rather than 1, because the next version will arrive the same way and this
 * read has no opinion about transaction formats — it only wants `meta`.
 */
export const MAX_SUPPORTED_TRANSACTION_VERSION = 10;

/**
 * Read a landed transaction's `meta` over raw JSON-RPC.
 *
 * Deliberately NOT through web3.js. The library deserializes the message to build its return
 * type and understands only the versions it shipped with, so a future format would be
 * rejected in our own process even when the node served it happily. We need three fields out
 * of `meta` and no part of the message, so the parsing is the only thing that could break and
 * we simply do not do it.
 *
 * Never throws: every failure is `null`, which the caller reports as "could not read".
 */
export async function fetchTransactionMeta(
  rpcUrl: string,
  signature: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ fee?: unknown; preTokenBalances?: TokenBalanceRow[]; postTokenBalances?: TokenBalanceRow[] } | null> {
  try {
    const res = await fetchImpl(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [signature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: MAX_SUPPORTED_TRANSACTION_VERSION,
          encoding: "json",
        }],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { result?: { meta?: unknown } | null; error?: unknown };
    if (body?.error != null) return null;
    const meta = body?.result?.meta;
    return meta != null && typeof meta === "object" ? (meta as { fee?: unknown }) : null;
  } catch {
    return null;
  }
}

/** One token-balance row of a landed transaction's meta (pre or post). */
export interface TokenBalanceRow {
  owner?: string | null;
  mint?: string | null;
  uiTokenAmount?: { amount?: string | null } | null;
}

/** Build the RPC-backed reader, or null when no RPC is configured. */
export function resolveSignatureStatusRpc(env: EnvReader): SignatureStatusRpc | null {
  const url = env(EXECUTION_RPC_ENV_KEY);
  if (typeof url !== "string" || url.length === 0) return null;
  const connection = new Connection(url, "confirmed");
  return {
    async getStatus(signature) {
      const res = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
      const value = res.value?.[0];
      if (value == null) return null;
      // `confirmed` and `finalized` both mean it landed. `processed` does not: it can still be
      // dropped, and showing a completed swap that later vanishes is not recoverable.
      const status = value.confirmationStatus;
      return { confirmed: status === "confirmed" || status === "finalized", err: value.err };
    },
    async getLandedFacts({ signature, delivery }) {
      const meta = await fetchTransactionMeta(url, signature);
      if (meta == null) return { deliveredRaw: null, feeLamports: null };
      const feeLamports =
        typeof meta.fee === "number" && Number.isFinite(meta.fee) && meta.fee >= 0
          ? Math.trunc(meta.fee).toString()
          : null;
      // A reverted transaction has a fee and no delivery; asking for the delta anyway would
      // read a pair of balances that did not change and correctly return null.
      const deliveredRaw =
        delivery == null
          ? null
          : deliveredFromBalances(meta.preTokenBalances ?? [], meta.postTokenBalances ?? [], delivery.owner, delivery.mint);
      return { deliveredRaw, feeLamports };
    },
  };
}

/**
 * Decide the state from one read. Pure, so the rule is testable without a chain.
 *
 * A null read means the node has not seen it, which early on is entirely normal — it is
 * `pending`, not missing and not failed.
 */
export function stateFromStatus(status: { confirmed: boolean; err: unknown } | null): ConfirmationState {
  if (status == null) return "pending";
  // An error on a landed transaction is the chain reporting that it ran and reverted. That IS
  // a failure, and the only one this module is allowed to report.
  if (status.err != null) return "failed";
  return status.confirmed ? "confirmed" : "pending";
}

export function createConfirmationChecker(deps: {
  env: EnvReader;
  rpc?: SignatureStatusRpc;
  /** Prices the fee. Absent, or failing, simply yields no USD figure. */
  solUsdPrice?: () => Promise<number | null>;
}) {
  return async function checkConfirmation(
    signature: string,
    /**
     * Who received, and in which mint. Both or neither: the delivered figure is a balance
     * delta and there is no delta without an account and a mint to read it on.
     *
     * Public values. The owner is a public key and the mint is a token address, both already
     * on screen — asking for them adds no capability a signature did not already carry.
     */
    delivery?: { owner: string; mint: string } | null,
  ): Promise<ConfirmationResult | null> {
    if (!isSignatureShaped(signature)) return null;
    const empty = { deliveredRaw: null, feeLamports: null, feeUsd: null };
    const rpc = deps.rpc ?? resolveSignatureStatusRpc(deps.env);
    // No RPC means we cannot tell. `pending` rather than an error: the caller keeps waiting and
    // eventually stops, which is exactly right for "we do not know".
    if (rpc == null) return { state: "pending", ...empty };
    let state: ConfirmationState;
    try {
      state = stateFromStatus(await rpc.getStatus(signature));
    } catch {
      return { state: "pending", ...empty };
    }
    // A transaction still in flight has nothing to report about, and one we never saw land has
    // no record to read. Both outcomes that DID land do: a success delivered tokens and paid a
    // fee, a revert delivered nothing and paid one anyway — which is the figure that makes the
    // revert screen honest.
    //
    // A failed read never changes the state. The swap landed either way, and losing the
    // outcome because a figure was unreadable would be the tail wagging the dog.
    if (state === "pending" || rpc.getLandedFacts == null) return { state, ...empty };
    let facts: { deliveredRaw: string | null; feeLamports: string | null };
    try {
      facts = await rpc.getLandedFacts({
        signature,
        // Only a confirmed swap has a delivery to look for. Asking on a revert would read two
        // balances that did not change — harmless, and a pointless question.
        delivery: state === "confirmed" ? delivery ?? null : null,
      });
    } catch {
      return { state, ...empty };
    }
    let solUsd: number | null = null;
    if (facts.feeLamports != null && deps.solUsdPrice != null) {
      try {
        solUsd = await deps.solUsdPrice();
      } catch {
        solUsd = null;
      }
    }
    return {
      state,
      deliveredRaw: typeof facts.deliveredRaw === "string" ? facts.deliveredRaw : null,
      feeLamports: typeof facts.feeLamports === "string" ? facts.feeLamports : null,
      feeUsd: feeUsdFrom(facts.feeLamports, solUsd),
    };
  };
}

/**
 * tokenAccountLookup — (SERVER-ONLY). Finds which of the taker's token accounts holds a mint.
 *
 * Raydium's transaction endpoint needs the input token ACCOUNT, not just the mint. It is read
 * from the chain rather than derived, because the derived ("associated") address is only where a
 * balance usually is: a token can sit in another account, and a Token-2022 mint's associated
 * address is derived differently from a classic one. Asking the chain answers both, and the
 * balance it returns lets the builder refuse a sale of more than is held.
 *
 * Read-only: one `getTokenAccountsByOwner`. No key, nothing signed.
 */
import { Connection, PublicKey } from "@solana/web3.js";

export type InputTokenAccountFinder = (ownerPublicKey: string, mint: string) => Promise<{ address: string; amountRaw: bigint } | null>;

/** The account holding the MOST of `mint` for `owner`, or null when there is none. */
export function createInputTokenAccountFinder(rpcUrl: string): InputTokenAccountFinder {
  let connection: Connection | null = null;
  return async (ownerPublicKey, mint) => {
    connection ??= new Connection(rpcUrl, "confirmed");
    const res = await connection.getParsedTokenAccountsByOwner(new PublicKey(ownerPublicKey), { mint: new PublicKey(mint) }, "confirmed");
    let best: { address: string; amountRaw: bigint } | null = null;
    for (const item of res.value) {
      const raw = (item.account.data as { parsed?: { info?: { tokenAmount?: { amount?: unknown } } } })?.parsed?.info?.tokenAmount?.amount;
      if (typeof raw !== "string" || !/^[0-9]+$/.test(raw)) continue;
      const amountRaw = BigInt(raw);
      if (best == null || amountRaw > best.amountRaw) best = { address: item.pubkey.toBase58(), amountRaw };
    }
    return best;
  };
}

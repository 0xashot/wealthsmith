/**
 * connectionSimulationRpc — Phase 3b. The adapter from a real `Connection` to the narrow
 * `SimulationRpc` the value check depends on.
 *
 * This file is the one place the verification path touches a chain. It is deliberately small and
 * contains no rules: every decision lives in `executionVerification`, and everything here either
 * returns a number or returns null. A null is always "we could not read this", never "it is zero" —
 * the distinction matters because a zero balance would silently satisfy nothing, while a zero
 * DELIVERED would silently fail a minimum check for the wrong reason.
 *
 * Requires a dedicated RPC. The CORS-enabled public node does not serve
 * `getParsedTokenAccountsByOwner` (see SolanaWalletProvider), and simulation with account returns
 * is heavier still.
 */
import {
  AddressLookupTableAccount,
  Connection,
  PublicKey,
  type VersionedTransaction,
} from "@solana/web3.js";
import type { SimulationRpc } from "./executionSimulation";
import { associatedTokenAddress } from "./executionVerification";

/**
 * Byte offset of `amount` in an SPL token account: mint (32) + owner (32). A u64 little-endian.
 *
 * Read directly rather than through a parsed RPC call because simulation returns raw base64 account
 * data — there is no parsed form of a hypothetical post-state.
 */
const SPL_TOKEN_AMOUNT_OFFSET = 64;
const SPL_TOKEN_ACCOUNT_MIN_BYTES = SPL_TOKEN_AMOUNT_OFFSET + 8;

/** Decode an SPL token account's balance from raw account data. Null when it is not one. */
export function decodeTokenAccountAmount(data: Buffer): bigint | null {
  if (data.length < SPL_TOKEN_ACCOUNT_MIN_BYTES) return null;
  try {
    return data.readBigUInt64LE(SPL_TOKEN_AMOUNT_OFFSET);
  } catch {
    return null;
  }
}

/** Which account a swap's output lands in: the taker itself for native SOL, else their ATA. */
export function outputAccountAddress(params: {
  takerPublicKey: string;
  outputMint: string;
  native: boolean;
}): string | null {
  return params.native
    ? params.takerPublicKey
    : associatedTokenAddress(params.takerPublicKey, params.outputMint);
}

export function createConnectionSimulationRpc(connection: Connection): SimulationRpc {
  return {
    async getLookupTable(address) {
      const res = await connection.getAddressLookupTable(new PublicKey(address));
      if (res.value == null) return null;
      return { addresses: res.value.state.addresses.map((a) => a.toBase58()) };
    },

    async getOutputBalanceRaw({ takerPublicKey, outputMint, native }) {
      if (native) {
        return BigInt(await connection.getBalance(new PublicKey(takerPublicKey), "confirmed"));
      }
      const ata = outputAccountAddress({ takerPublicKey, outputMint, native });
      if (ata == null) return null;
      const info = await connection.getAccountInfo(new PublicKey(ata), "confirmed");
      // Account absent → the swap will create it. Zero is the correct BEFORE balance here, and the
      // caller distinguishes this from an unreadable account by catching rather than by the value.
      if (info == null) return 0n;
      return decodeTokenAccountAmount(info.data);
    },

    async simulateOutputBalanceRaw({ transaction, lookupTableAddresses, takerPublicKey, outputMint, native }) {
      const target = outputAccountAddress({ takerPublicKey, outputMint, native });
      if (target == null) return { err: "bad_output_account", afterRaw: null };

      // Lookup tables must be loaded for the simulator to resolve the transaction's accounts.
      // `simulateAndVerifyValue` has already refused anything that would not resolve, so a failure
      // here is a race rather than an unchecked path — and it still fails closed.
      const tables: AddressLookupTableAccount[] = [];
      for (const address of lookupTableAddresses) {
        const res = await connection.getAddressLookupTable(new PublicKey(address));
        if (res.value == null) return { err: "lookup_table_vanished", afterRaw: null };
        tables.push(res.value);
      }

      const sim = await connection.simulateTransaction(transaction, {
        // The transaction is unsigned by design; verifying signatures would reject it for the one
        // reason we already require.
        sigVerify: false,
        // The plan's blockhash may be minutes old by the time a user confirms. Simulating against a
        // current one measures the SWAP rather than re-measuring the expiry we already check.
        replaceRecentBlockhash: true,
        commitment: "confirmed",
        accounts: { encoding: "base64", addresses: [target] },
      });

      if (sim.value.err != null) return { err: sim.value.err, afterRaw: null };

      const account = sim.value.accounts?.[0];
      if (account == null) return { err: null, afterRaw: null };

      if (native) return { err: null, afterRaw: BigInt(account.lamports) };

      const raw = Array.isArray(account.data) ? account.data[0] : account.data;
      if (typeof raw !== "string") return { err: null, afterRaw: null };
      return { err: null, afterRaw: decodeTokenAccountAmount(Buffer.from(raw, "base64")) };
    },

    async getFeeLamports(transaction: VersionedTransaction) {
      const res = await connection.getFeeForMessage(transaction.message, "confirmed");
      return res.value == null ? null : BigInt(res.value);
    },
  };
}

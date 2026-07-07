/**
 * jitoRestaking — READ-ONLY detection support for Jito Restaking vault positions.
 *
 * When you restake into a Jito vault you deposit a supported token (usually
 * JitoSOL) and receive a VRT (Vault Receipt Token) — an SPL token held in your
 * wallet. This builds a map of every vault's VRT mint → its underlying token and
 * exchange rate, so a held VRT can be recognized and shown as a Jito Restaking
 * position ("X JitoSOL restaked on Jito") instead of an unknown token.
 *
 * Vaults are enumerated on-chain (getProgramAccounts on the Jito Vault program,
 * fixed 1111-byte Vault accounts) and decoded with the official
 * `@jito-foundation/vault-sdk` decoder. The module is imported DYNAMICALLY so the
 * SDK stays out of the main bundle.
 *
 * READ-ONLY: getProgramAccounts only; no signing/transactions. No APY is invented
 * (restaking-reward APY has no clean read source yet → shown as "—").
 */
import { Connection, PublicKey } from "@solana/web3.js";
import { getVaultDecoder } from "@jito-foundation/vault-sdk";

export const JITO_VAULT_PROGRAM = "Vau1t6sLNxnzB7ZDsef8TLbPLfyZMYXH8WTNqUdm9g8";
/** Every Jito Vault account is exactly this size (discriminator = 1). */
const VAULT_ACCOUNT_SIZE = 1111;

export interface VrtInfo {
  /** Underlying supported-token mint (e.g. JitoSOL). */
  supportedMint: string;
  /** Underlying tokens per 1 VRT (tokensDeposited / vrtSupply). */
  rate: number;
}

/** Map of VRT mint → underlying token + exchange rate, for all active vaults. */
export async function fetchJitoVrtMap(connection: Connection): Promise<Map<string, VrtInfo>> {
  const map = new Map<string, VrtInfo>();
  const accounts = await connection.getProgramAccounts(new PublicKey(JITO_VAULT_PROGRAM), {
    filters: [{ dataSize: VAULT_ACCOUNT_SIZE }],
  });
  const decode = getVaultDecoder();
  for (const { account } of accounts) {
    try {
      const vault = decode.decode(account.data as Uint8Array);
      const supply = Number(vault.vrtSupply);
      if (supply > 0) {
        map.set(vault.vrtMint.toString(), {
          supportedMint: vault.supportedMint.toString(),
          rate: Number(vault.tokensDeposited) / supply,
        });
      }
    } catch {
      // skip accounts that don't decode as a Vault
    }
  }
  return map;
}

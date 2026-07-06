/**
 * useWalletDisplay — derives the connected wallet's display info from the real
 * wallet-adapter state (useWallet) for the Global Nav pill. Read-only: it only
 * reads the connected wallet name and base58 publicKey; it never signs, fetches,
 * or moves anything.
 */
import { useWallet } from "@solana/wallet-adapter-react";

export interface WalletDisplay {
  /** Provider id for the pill icon: "phantom" | "solflare" | "backpack" | "wallet". */
  providerId: string;
  /** Adapter/wallet name, e.g. "Phantom". */
  name: string;
  /** Full base58 address. */
  address: string;
  /** Last-4 short address, e.g. "6fQ9". */
  addressShort: string;
  /** Pill label, e.g. "Phantom • 6fQ9". */
  label: string;
}

/** Map a wallet-adapter name to a WealthSmith provider id (for the pill icon). */
export function providerIdFromName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("phantom")) return "phantom";
  if (n.includes("solflare")) return "solflare";
  if (n.includes("backpack")) return "backpack";
  return "wallet";
}

/** Base58 → last 4 chars (matches the approved "{provider} • {short}" pill format). */
export function shortAddress(address: string): string {
  return address.length <= 4 ? address : address.slice(-4);
}

/** The connected wallet display, or null when no wallet is connected. */
export function useWalletDisplay(): WalletDisplay | null {
  const { connected, publicKey, wallet } = useWallet();
  if (!connected || !publicKey || !wallet) return null;
  const address = publicKey.toBase58();
  const name = wallet.adapter.name;
  const addressShort = shortAddress(address);
  return {
    providerId: providerIdFromName(name),
    name,
    address,
    addressShort,
    label: `${name} • ${addressShort}`,
  };
}

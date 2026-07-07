/**
 * hubble — READ-ONLY detection of Hubble Protocol USDH borrowing positions (CDPs).
 *
 * Hubble lets a user deposit collateral (SOL, mSOL, ETH, BTC, …) and mint USDH, an
 * interest-free crypto-collateralized stablecoin (a one-time borrow fee, no ongoing
 * borrow APR — so APY is null). A loan lives in a UserMetadata account owned by the
 * Hubble borrowing program; the raw on-chain debt field UNDERSTATES the true debt
 * because liquidation losses are redistributed pro-rata across borrowers via the
 * borrowing-market state. So we use Hubble's official SDK (`getUserLoans`), which
 * reads that state and returns the redistribution-adjusted debt plus per-token
 * collateral amounts.
 *
 * Lazy-imported so the SDK stays off the main bundle. READ-ONLY: account reads only;
 * no signing.
 */
import { Connection, PublicKey } from "@solana/web3.js";
import { Hubble } from "@hubbleprotocol/hubble-sdk";
import type { WalletPosition } from "./walletPosition";

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 4 });
const num = (v: unknown): number => Number((v as { toString(): string })?.toString?.() ?? v ?? 0);

// Named base-collateral fields on a Hubble loan → display symbol.
const BASE_COLLATERAL: Array<[string, string]> = [
  ["sol", "SOL"],
  ["msol", "mSOL"],
  ["eth", "ETH"],
  ["btc", "BTC"],
  ["ray", "RAY"],
  ["srm", "SRM"],
  ["ftt", "FTT"],
];

export async function fetchHubbleLoans(
  connection: Connection,
  owner: string
): Promise<WalletPosition[]> {
  const hubble = new Hubble("mainnet-beta", connection);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loans: any[] = await hubble.getUserLoans(new PublicKey(owner));
  const positions: WalletPosition[] = [];

  loans.forEach((loan, i) => {
    const debt = num(loan?.usdhDebt);
    if (!(debt > 0)) return; // only loans with outstanding USDH debt

    // Summarize deposited collateral (amounts only; valueUsd stays null).
    const c = loan?.collateral ?? {};
    const parts: string[] = [];
    for (const [key, sym] of BASE_COLLATERAL) {
      const amt = num(c[key]);
      if (amt > 0) parts.push(`${fmt(amt)} ${sym}`);
    }
    const extras = Array.isArray(c.extraCollaterals) ? c.extraCollaterals : [];
    const extraCount = extras.filter((e: unknown) => num((e as { amount?: unknown })?.amount) > 0).length;
    if (extraCount > 0) parts.push(`+${extraCount} more`);
    const collateral = parts.length > 0 ? parts.join(" + ") : "collateral";

    positions.push({
      id: `hubble-loan-${owner}-${i}`,
      source: "hubble",
      type: "protocol",
      symbol: "USDH",
      name: "Hubble Loan",
      protocol: "Hubble",
      side: "borrowed",
      amount: `${fmt(debt)} USDH debt · ${collateral}`,
      detection: "protocol_api",
      valueUsd: null,
      apy: null, // interest-free borrow (one-time fee) — no ongoing APR to source
    });
  });

  return positions;
}

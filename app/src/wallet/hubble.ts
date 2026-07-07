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
import type { PositionLeg, WalletPosition } from "./walletPosition";

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

const USDH_MINT = "USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX";
/** Collateral keys we can map to a mint for pricing. Others → position stays "—". */
const COLLATERAL_MINT: Record<string, string> = {
  sol: "So11111111111111111111111111111111111111112",
  msol: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
};
/** Sentinel mint that never resolves a price → forces the loan's value to "—". */
const UNPRICEABLE = "UNPRICEABLE";

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

    // Summarize deposited collateral + build priceable legs (collateral = long,
    // USDH debt = debt). A collateral type we can't map to a mint, or any
    // extra-collateral, adds an UNPRICEABLE leg so the loan's value stays "—"
    // rather than being understated.
    const c = loan?.collateral ?? {};
    const parts: string[] = [];
    const legs: PositionLeg[] = [];
    for (const [key, sym] of BASE_COLLATERAL) {
      const amt = num(c[key]);
      if (amt > 0) {
        parts.push(`${fmt(amt)} ${sym}`);
        legs.push({ mint: COLLATERAL_MINT[key] ?? UNPRICEABLE, uiAmount: amt, side: "long" });
      }
    }
    const extras = Array.isArray(c.extraCollaterals) ? c.extraCollaterals : [];
    const extraCount = extras.filter((e: unknown) => num((e as { amount?: unknown })?.amount) > 0).length;
    if (extraCount > 0) {
      parts.push(`+${extraCount} more`);
      legs.push({ mint: UNPRICEABLE, uiAmount: extraCount, side: "long" });
    }
    const collateral = parts.length > 0 ? parts.join(" + ") : "collateral";
    legs.push({ mint: USDH_MINT, uiAmount: debt, side: "debt" });

    positions.push({
      id: `hubble-loan-${owner}-${i}`,
      source: "hubble",
      type: "protocol",
      symbol: "USDH",
      name: "Hubble Loan",
      protocol: "Hubble",
      side: "borrowed",
      amount: `${fmt(debt)} USDH debt · ${collateral}`,
      legs,
      detection: "protocol_api",
      valueUsd: null,
      apy: null, // interest-free borrow (one-time fee) — no ongoing APR to source
    });
  });

  return positions;
}

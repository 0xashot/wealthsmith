/**
 * kaminoVaults — READ-ONLY detection of Kamino Earn Vault positions (e.g.
 * "USDC in the Steakhouse USDC vault"), including vault shares that are STAKED in
 * a Kamino farm (which are not held in the wallet as tokens, so they can't be seen
 * from token balances).
 *
 * This uses the official Kamino SDK (`@kamino-finance/klend-sdk`, which is built on
 * `@solana/kit`). Because that SDK + its dependencies are heavy, this module is
 * imported DYNAMICALLY (see useWalletPortfolio) so it is code-split out of the main
 * bundle and its failure can never affect the rest of the app.
 *
 * STRICTLY READ-ONLY: only SDK read calls (getUserSharesBalanceAllVaults / vault
 * state reads). No signing, no transactions, no fund movement. No USD/APY invented.
 */
// Namespace import: the Kamino SDK is CJS and is excluded from Vite's dev
// dep-optimizer (see vite.config.ts), so `import { X }` named imports don't
// resolve in dev. A namespace import works across both dev and the production build.
import * as klend from "@kamino-finance/klend-sdk";
import { createSolanaRpc, address } from "@solana/kit";
import { lookupMint, shortMint, type WalletPosition } from "./walletPosition";

/**
 * Slot duration (ms) is MEASURED, never assumed. The SDK scales slot-age math by
 * 500/recentSlotDurationMs, so a wrong constant silently skews every derived rate. A previously
 * hardcoded 450 ms was ~8.4% off measured mainnet reality (~415 ms); see
 * suggestions/klendReserveMeasuredApyCorrection.ts (Step 16H-N.3b).
 *
 * There is deliberately NO fallback constant: if the measurement fails we throw rather than
 * silently substituting 400/450/500 ms. This module is dynamically imported and its failure is
 * isolated from the rest of the app (see the file header).
 */
import { measureSlotDurationLive } from "../suggestions/solanaSlotDurationEstimator";

function decodeVaultName(bytes: Uint8Array | number[] | undefined): string | undefined {
  if (!bytes) return undefined;
  const arr = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  const name = new TextDecoder().decode(arr).replace(/\0+/g, "").trim();
  return name.length > 0 ? name : undefined;
}

/**
 * Read the user's Kamino vault positions (unstaked + farm-staked shares) and map
 * each to a normalized WalletPosition. `rpcUrl` is the app's configured RPC.
 */
export async function fetchKaminoVaultPositions(
  rpcUrl: string,
  ownerBase58: string
): Promise<WalletPosition[]> {
  const rpc = createSolanaRpc(rpcUrl);

  // Measure slot duration; fail closed rather than assume one.
  const measurement = await measureSlotDurationLive(
    {
      getSlot: async () => Number(await rpc.getSlot({ commitment: "confirmed" }).send()),
      getBlockTime: async (slot: number) => {
        const t = await rpc.getBlockTime(BigInt(slot) as never).send();
        return t === null || t === undefined ? null : Number(t);
      },
    },
    "configured_rpc",
  );
  if (!measurement.ok || measurement.measuredSlotDurationMs === undefined) {
    throw new Error(
      `kaminoVaults: slot-duration measurement failed (${measurement.failure}: ${measurement.failureDetail}). ` +
        `Refusing to substitute a constant slot duration.`
    );
  }
  const client = new klend.KaminoVaultClient(rpc, measurement.measuredSlotDurationMs);
  const sharesByVault = await client.getUserSharesBalanceAllVaults(address(ownerBase58));

  // Current slot for the shares → underlying-token conversion below.
  let currentSlot: bigint | undefined;
  try {
    currentSlot = await rpc.getSlot({ commitment: "confirmed" }).send();
  } catch {
    // If the slot read fails, positions still show (without a token amount).
  }

  const positions: WalletPosition[] = [];
  for (const [vaultAddress, shares] of sharesByVault) {
    if (!(Number(shares.totalShares) > 0)) continue;

    let mint: string | undefined;
    let vaultName: string | undefined;
    let uiAmount: number | undefined;
    let apy: number | undefined;
    try {
      const vault = new klend.KaminoVault(rpc, vaultAddress);
      const state = await vault.getState();
      mint = state.tokenMint.toString();
      vaultName = decodeVaultName(state.name as unknown as Uint8Array | number[]);
      if (currentSlot != null) {
        // Underlying token amount = shares × tokensPerShare (the on-chain,
        // Kamino-computed exchange rate). This is the actual USDC amount, not an
        // invented figure. APY comes from the SDK's vault yield calc (net of fees).
        // Both best-effort: if either fails, the position still shows.
        try {
          const reserves = await client.loadVaultReserves(state);
          const tokensPerShare = await client.getTokensPerShareSingleVault(
            state,
            currentSlot,
            reserves,
            currentSlot
          );
          uiAmount = Number(shares.totalShares.mul(tokensPerShare));
          const apys = await client.getVaultActualAPY(state, currentSlot, reserves);
          apy = Number(apys.netAPY) * 100;
        } catch {
          // amount/apy are best-effort
        }
      }
    } catch {
      // Vault metadata is best-effort; the position is still shown.
    }

    const known = mint ? lookupMint(mint) : undefined;
    positions.push({
      id: `kamino-vault-${vaultAddress.toString()}`,
      source: "kamino",
      type: "protocol",
      symbol: known?.symbol ?? (mint ? shortMint(mint) : "Vault"),
      // Show the vault name (e.g. "Steakhouse USDC") as the asset name.
      name: vaultName ?? known?.name,
      mint,
      icon: known?.icon,
      protocol: "Kamino",
      amount: uiAmount != null ? String(uiAmount) : "",
      uiAmount,
      // Single underlying token → one long leg, priced by the vault token mint.
      legs: mint && uiAmount != null ? [{ mint, uiAmount, side: "long" }] : undefined,
      side: "supplied",
      detection: "protocol_api",
      valueUsd: null,
      apy: apy ?? null,
    });
  }
  return positions;
}

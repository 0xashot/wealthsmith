/**
 * meteoraDlmm — READ-ONLY detection of Meteora DLMM (Dynamic Liquidity Market
 * Maker) LP positions.
 *
 * DLMM is a bin-based concentrated-liquidity AMM; a user's position is a program
 * account owned by their wallet (not an NFT). Valuing it requires bin math, so we
 * use Meteora's official SDK (`@meteora-ag/dlmm`, web3.js v1) — its
 * `getAllLbPairPositionsByUser` finds the user's positions and computes each pair's
 * `totalXAmount` / `totalYAmount`. We aggregate per pair into one row.
 *
 * Lazy-imported so the SDK stays off the main bundle. READ-ONLY: the SDK only reads
 * accounts (getProgramAccounts / getMultipleAccounts); no signing.
 */
import { Connection, PublicKey } from "@solana/web3.js";
import DLMM from "@meteora-ag/dlmm";
import { lookupMint, shortMint, type WalletPosition } from "./walletPosition";

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 4 });
const symOf = (mint: string) => lookupMint(mint)?.symbol ?? shortMint(mint);

export async function fetchMeteoraDlmmPositions(
  connection: Connection,
  ownerBase58: string
): Promise<WalletPosition[]> {
  const byPair = await DLMM.getAllLbPairPositionsByUser(connection, new PublicKey(ownerBase58));

  const positions: WalletPosition[] = [];
  for (const [lbPair, v] of byPair) {
    const mintX = v.tokenX.publicKey.toBase58();
    const mintY = v.tokenY.publicKey.toBase58();
    const decX = v.tokenX.mint.decimals;
    const decY = v.tokenY.mint.decimals;

    // Aggregate all of the user's positions in this pair into one row.
    let rawX = 0;
    let rawY = 0;
    for (const pos of v.lbPairPositionsData) {
      rawX += Number(pos.positionData.totalXAmount);
      rawY += Number(pos.positionData.totalYAmount);
    }
    const xUi = rawX / 10 ** decX;
    const yUi = rawY / 10 ** decY;
    if (!(xUi > 0) && !(yUi > 0)) continue; // empty position (withdrawn)

    const symX = symOf(mintX);
    const symY = symOf(mintY);
    positions.push({
      id: `meteora-dlmm-${lbPair}`,
      source: "meteora",
      type: "protocol",
      symbol: `${symX}/${symY}`,
      name: "Meteora DLMM",
      protocol: "Meteora",
      amount: `${fmt(xUi)} ${symX} + ${fmt(yUi)} ${symY}`,
      legs: [
        { mint: mintX, uiAmount: xUi, side: "long" },
        { mint: mintY, uiAmount: yUi, side: "long" },
      ],
      detection: "protocol_api",
      valueUsd: null,
      apy: null, // Meteora's DLMM APY API is unavailable → no sourced APY yet
    });
  }
  return positions;
}

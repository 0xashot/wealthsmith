/**
 * demoWalletPositions — the APPROVED Demo Mode portfolio holdings (sample data
 * only, never a real wallet's balances). Used to render the Demo Portfolio donuts
 * and asset list without connecting a wallet.
 *
 * Demo holdings:
 *   SOL   $5,500
 *   BONK  $1,200
 *   USDC  $800
 *   Total $7,500  →  Crypto $6,700 (89%) / Stables $800 (11%)
 *
 * Values (incl. the 24h changes) are illustrative demo figures
 * (rules/demo-mode-rules.md — sample data).
 */
import type { WalletPosition } from "../wallet/walletPosition";

export const demoWalletPositions: WalletPosition[] = [
  {
    id: "demo-sol",
    source: "wallet",
    type: "native",
    symbol: "SOL",
    name: "Solana",
    amount: "36.667",
    uiAmount: 36.667,
    decimals: 9,
    icon: "assets/icons/token/sol.svg",
    detection: "direct_wallet_balance",
    priceUsd: 150,
    valueUsd: 5500,
    change24hPct: 2.1,
  },
  {
    id: "demo-bonk",
    source: "wallet",
    type: "token",
    symbol: "BONK",
    name: "Bonk",
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    amount: "40000000",
    uiAmount: 40000000,
    decimals: 5,
    icon: "assets/icons/token/bonk.svg",
    detection: "direct_wallet_balance",
    priceUsd: 0.00003,
    valueUsd: 1200,
    change24hPct: 4.4,
  },
  {
    id: "demo-usdc",
    source: "wallet",
    type: "token",
    symbol: "USDC",
    name: "USD Coin",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    amount: "800",
    uiAmount: 800,
    decimals: 6,
    icon: "assets/icons/token/usdc.svg",
    detection: "direct_wallet_balance",
    priceUsd: 1,
    valueUsd: 800,
    change24hPct: 0,
  },
];

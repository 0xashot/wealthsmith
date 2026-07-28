/**
 * demoWalletPositions — the APPROVED Demo Mode portfolio holdings (sample data
 * only, never a real wallet's balances). A deliberately RICH, funded-buffer
 * sample so the Demo shows a full Portfolio (several Liquid / Staked / Yield
 * positions) and the engine surfaces several Smith AI Suggestions at once.
 *
 * Demo holdings ($26,900 total; stablecoin reserve $9,500 → Safety Buffer funded):
 *   Liquid  — SOL $8,000 · USDC $7,000 · USDT $500 · BONK $600 · WIF $300
 *   Staked  — mSOL $3,000 · jitoSOL $2,500 · bSOL $1,500
 *   Yield   — Kamino USDC Lend $2,000 · Kamino SOL Lend $1,500
 *
 * Fed to the SAME shared engine (dataMode `demo_fixture`) as the Demo Dashboard +
 * Portfolio, it yields several suggestions (Stable Yield, Contribution/DCA, and a
 * Capital-Efficiency SOL review) with a funded buffer. Every position carries its
 * approved token icon + mint so the Portfolio rows render icons and link to
 * Solscan. Values, 24h changes, and APYs are illustrative demo figures
 * (rules/demo-mode-rules.md — sample data).
 */
import type { WalletPosition } from "../wallet/walletPosition";

/** Illustrative demo "Net Contributions" (invested over the last 12 months),
 *  paired with the $26,900 sample portfolio so the Demo dashboard shows the same
 *  Financial Snapshot as the connected dashboard. Sample data only. */
export const DEMO_NET_CONTRIBUTIONS_USD = 24000;

// Canonical public Solana mints (verifiable on-chain) for the sample tokens.
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const BONK_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const WIF_MINT = "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm";
const MSOL_MINT = "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So";
const JITOSOL_MINT = "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn";
const BSOL_MINT = "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1";
const WSOL_MINT = "So11111111111111111111111111111111111111112";

export const demoWalletPositions: WalletPosition[] = [
  // ---- Liquid: native SOL + wallet-held tokens (incl. stablecoins) ----
  {
    id: "demo-sol", source: "wallet", type: "native", symbol: "SOL", name: "Solana",
    amount: "53333000000", uiAmount: 53.333, decimals: 9, icon: "assets/icons/token/sol.svg",
    detection: "direct_wallet_balance", priceUsd: 150, valueUsd: 8000, change24hPct: 2.1,
  },
  {
    id: "demo-usdc", source: "wallet", type: "token", symbol: "USDC", name: "USD Coin",
    mint: USDC_MINT, amount: "7000000000", uiAmount: 7000, decimals: 6, icon: "assets/icons/token/usdc.svg",
    detection: "direct_wallet_balance", priceUsd: 1, valueUsd: 7000, change24hPct: 0,
  },
  {
    id: "demo-usdt", source: "wallet", type: "token", symbol: "USDT", name: "Tether USD",
    mint: USDT_MINT, amount: "500000000", uiAmount: 500, decimals: 6, icon: "assets/icons/token/usdt.svg",
    detection: "direct_wallet_balance", priceUsd: 1, valueUsd: 500, change24hPct: 0,
  },
  {
    id: "demo-bonk", source: "wallet", type: "token", symbol: "BONK", name: "Bonk",
    mint: BONK_MINT, amount: "2000000000000", uiAmount: 20000000, decimals: 5, icon: "assets/icons/token/bonk.svg",
    detection: "direct_wallet_balance", priceUsd: 0.00003, valueUsd: 600, change24hPct: 4.4,
  },
  {
    id: "demo-wif", source: "wallet", type: "token", symbol: "WIF", name: "dogwifhat",
    mint: WIF_MINT, amount: "100000000", uiAmount: 100, decimals: 6, icon: "assets/icons/token/wif.png",
    detection: "direct_wallet_balance", priceUsd: 3, valueUsd: 300, change24hPct: -1.2,
  },

  // ---- Staked: recognized liquid-staking tokens ----
  {
    id: "demo-msol", source: "sanctum", type: "lst", symbol: "mSOL", name: "Marinade Staked SOL",
    mint: MSOL_MINT, protocol: "Marinade", amount: "19350000000", uiAmount: 19.35, decimals: 9,
    icon: "assets/icons/token/msol.svg",
    detection: "recognized_lst_mint", priceUsd: 155, valueUsd: 3000, apy: 7.1,
  },
  {
    id: "demo-jitosol", source: "jito", type: "lst", symbol: "jitoSOL", name: "Jito Staked SOL",
    mint: JITOSOL_MINT, protocol: "Jito", amount: "15820000000", uiAmount: 15.82, decimals: 9,
    icon: "assets/icons/token/jitosol.svg",
    detection: "recognized_lst_mint", priceUsd: 158, valueUsd: 2500, apy: 7.6,
  },
  {
    id: "demo-bsol", source: "sanctum", type: "lst", symbol: "bSOL", name: "BlazeStake Staked SOL",
    mint: BSOL_MINT, protocol: "BlazeStake", amount: "9550000000", uiAmount: 9.55, decimals: 9,
    icon: "assets/icons/token/bsol.svg",
    detection: "recognized_lst_mint", priceUsd: 157, valueUsd: 1500, apy: 6.9,
  },

  // ---- Yield strategies: live protocol positions (asset row = underlying token) ----
  {
    id: "demo-kamino-usdc", source: "kamino", type: "protocol", symbol: "USDC", name: "Kamino USDC Lend",
    mint: USDC_MINT, protocol: "Kamino", amount: "2000000000", uiAmount: 2000, decimals: 6,
    icon: "assets/icons/token/usdc.svg",
    detection: "protocol_api", valueUsd: 2000, apy: 8.2,
    legs: [{ mint: USDC_MINT, uiAmount: 2000, side: "long" }],
  },
  {
    id: "demo-kamino-sol", source: "kamino", type: "protocol", symbol: "SOL", name: "Kamino SOL Lend",
    mint: WSOL_MINT, protocol: "Kamino", amount: "10000000000", uiAmount: 10, decimals: 9,
    icon: "assets/icons/token/sol.svg",
    detection: "protocol_api", valueUsd: 1500, apy: 6.4,
    legs: [{ mint: WSOL_MINT, uiAmount: 10, side: "long" }],
  },
];

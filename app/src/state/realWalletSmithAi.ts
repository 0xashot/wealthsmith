/**
 * Real connected-wallet Ask Smith AI content (approved, static — no generation).
 *
 * Unlike connectedSmithAi.ts (which is grounded in the connected-wallet FIXTURE:
 * Safety Buffer Top Pick, fixture suggestions), this content is safe for a REAL
 * connected wallet: it only EXPLAINS the read-only connection and why some values
 * aren't shown yet. It invents no balances, USD value, APY, suggestions, Top Pick,
 * or protocol positions (rules/financial-logic-boundaries.md — Smith AI explains,
 * does not decide). Copy is composed from approved read-only / missing-data
 * strings.
 */
import {
  SMITH_FALLBACK,
  REAL_WALLET_NO_FUNDS_NOTE,
  REAL_WALLET_VALUE_DESC,
  REAL_WALLET_SUGGESTIONS_DESC,
} from "./approvedCopy";
import type { SmithAiContent } from "../types/dashboard";

export const realWalletSmithAiContent: SmithAiContent = {
  panelLabel: "Smith AI panel",
  entryLabel: "Ask Smith AI",
  opener:
    "Your wallet is connected in read-only mode. I can explain what WealthSmith is " +
    "reading and why some values aren’t shown yet. " +
    REAL_WALLET_NO_FUNDS_NOTE,
  prompts: [
    "What can you read from my wallet?",
    "Why is there no portfolio value?",
    "Why aren’t there suggestions yet?",
  ],
  responses: {
    "What can you read from my wallet?":
      "WealthSmith reads your public balances only — native SOL and SPL token " +
      "accounts from your connected address. " +
      REAL_WALLET_NO_FUNDS_NOTE,
    "Why is there no portfolio value?":
      REAL_WALLET_VALUE_DESC +
      " Balances are shown as on-chain amounts, not USD, until a pricing source is connected.",
    "Why aren’t there suggestions yet?": REAL_WALLET_SUGGESTIONS_DESC,
  },
  fallback: SMITH_FALLBACK,
};

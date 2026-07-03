/**
 * Support Ask Smith AI content — static, explain-only, FAQ-backed.
 *
 * Quick-prompt answers are verbatim canonical FAQ answers (content/support-faq-
 * content.md). Free-form input returns only the approved fallback. No live
 * generation, no invented policy/pricing/wallet/protocol claims, no financial
 * advice, no account changes, no fund movement, no signatures. Uncertain or
 * account-specific help is routed to Contact Us (via the fallback).
 */
import type { SmithAiContent } from "../types/dashboard";

/** Approved opener/fallback (Decision B). */
const SUPPORT_SAFE_MESSAGE =
  "I can explain WealthSmith support topics from the FAQ — like wallet " +
  "connection, Demo Mode, suggestions, and Top Pick. I can't change your " +
  "account or move funds. For account-specific help, use Contact Us.";

const Q_CUSTODIAL = "Is WealthSmith custodial?";
const Q_DEMO = "What is Demo Mode?";
const Q_WALLETS = "Which wallets are supported?";

export const supportSmithAiContent: SmithAiContent = {
  panelLabel: "Smith AI panel",
  entryLabel: "Ask Smith AI",
  opener: SUPPORT_SAFE_MESSAGE,
  prompts: [Q_CUSTODIAL, Q_DEMO, Q_WALLETS],
  responses: {
    // Verbatim canonical FAQ answers.
    [Q_CUSTODIAL]:
      "No. WealthSmith is non-custodial. Your funds stay in your wallet. " +
      "WealthSmith does not hold your crypto, seed phrase, private keys, or " +
      "wallet backup files.",
    [Q_DEMO]:
      "Demo Mode lets you explore WealthSmith with sample data before " +
      "connecting a wallet. It shows a sample portfolio, sample suggestions, " +
      "and sample Smith AI explanations. Demo Mode does not use your real " +
      "wallet data.",
    [Q_WALLETS]: "Supported MVP wallets: Phantom, Solflare, Backpack.",
  },
  fallback: SUPPORT_SAFE_MESSAGE,
};

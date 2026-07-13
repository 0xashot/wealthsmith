/**
 * internalSolStakingRecommendationFixture — dev-only FAKE-TOKEN data for previewing
 * how an exact SOL staking recommendation could look in a WealthSmith-style card.
 *
 * FAKE INTERNAL PREVIEW DATA ONLY. This is NOT Demo Mode, NOT real wallet data, NOT
 * production, and NOT beta-facing:
 *  - wallet amounts and SOL price are hardcoded fake values (not live),
 *  - it never enters engine output or live suggestions
 *    (`updatesLiveSuggestions` / `transactionsEnabled` always false),
 *  - it enables no selection and no transactions,
 *  - it is never imported by stakingSuggestion / engine / toSuggestionCard.
 *
 * Jito / JitoSOL appears only as an `INTERNAL_PREVIEW_NOT_LIVE` example. No QA
 * score, no production riskScore, no recommendation to users.
 * `PROTOCOL_SELECTION_IMPLEMENTED = false`; `productionReady = false`.
 */

export const INTERNAL_SOL_STAKING_RECOMMENDATION_FIXTURE_EXISTS = true;
export const INTERNAL_SOL_STAKING_RECOMMENDATION_FIXTURE_ENABLED_BY_DEFAULT = false;
export const INTERNAL_SOL_STAKING_RECOMMENDATION_FIXTURE_FAKE_DATA = true;
export const INTERNAL_SOL_STAKING_RECOMMENDATION_FIXTURE_UPDATES_LIVE_SUGGESTIONS = false;
export const INTERNAL_SOL_STAKING_RECOMMENDATION_FIXTURE_ENABLES_SELECTION = false;
export const INTERNAL_SOL_STAKING_RECOMMENDATION_FIXTURE_ENABLES_TRANSACTIONS = false;

export interface InternalSolStakingFixtureWallet {
  totalSol: number;
  reserveSol: number;
  eligibleSol: number;
  solPriceUsd: number;
  eligibleUsd: number;
}

export interface InternalSolStakingFixtureRecommendation {
  title: string;
  category: "staking";
  internalLabel: "INTERNAL_PREVIEW_NOT_LIVE";
  suggestedProtocolLabel: string;
  protocolName: string;
  lstSymbol: string;
  eligibleAmountSol: number;
  eligibleAmountUsd: number;
  whySelected: string[];
  evidenceNotes: string[];
  safetyNotes: string[];
  disabledActions: string[];
  updatesLiveSuggestions: false;
  transactionsEnabled: false;
}

export interface InternalSolStakingRecommendationFixture {
  wallet: InternalSolStakingFixtureWallet;
  recommendation: InternalSolStakingFixtureRecommendation;
}

/**
 * The fake-token fixture. All amounts and the SOL price are hardcoded, clearly-fake
 * internal values — never live prices, never real wallet data.
 */
export function getInternalSolStakingRecommendationFixture(): InternalSolStakingRecommendationFixture {
  return {
    wallet: {
      totalSol: 12.5,
      reserveSol: 0.1,
      eligibleSol: 12.4,
      solPriceUsd: 150, // clearly-fake internal preview price, not live
      eligibleUsd: 1860,
    },
    recommendation: {
      title: "Put Idle SOL to Work",
      category: "staking",
      internalLabel: "INTERNAL_PREVIEW_NOT_LIVE",
      suggestedProtocolLabel: "Suggested protocol to review",
      protocolName: "Jito",
      lstSymbol: "JitoSOL",
      eligibleAmountSol: 12.4,
      eligibleAmountUsd: 1860,
      whySelected: [
        "Fake internal wallet has 12.4 SOL available after reserve.",
        "JitoSOL is used only to preview the future exact-recommendation UI.",
        "Production selection is still disabled.",
      ],
      evidenceNotes: [
        "Risk scoring is not approved in production.",
        "Source re-verification is still required before beta.",
        "Go/no-go has not passed.",
      ],
      safetyNotes: [
        "WealthSmith does not move funds for you.",
        "You choose whether to continue externally.",
        "This fake-token preview is not shown to users.",
      ],
      disabledActions: ["Open official protocol page", "View evidence"],
      updatesLiveSuggestions: false,
      transactionsEnabled: false,
    },
  };
}

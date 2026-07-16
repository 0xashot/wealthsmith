/**
 * demoExactSolStakingScenario — a DEMO MODE exact SOL staking scenario that renders
 * through the SAME shared UI and behavior real wallet mode will use (Step 13E).
 *
 * Architecture rule: Demo Mode and real wallet mode share the mapper, SuggestionCard,
 * Review Details modal, action model, and guardrail rendering. The ONLY difference is
 * the data source — this scenario is FIXTURE data (fake wallet), not a live wallet.
 *
 * FAKE DEMO DATA ONLY. It:
 *  - never enables real protocol selection or the selector,
 *  - never updates real-wallet suggestions or production metadata,
 *  - never adds a transaction/signature (`transactionsEnabled` false, review-only),
 *  - is not imported into the real-wallet `stakingSuggestion` live flow.
 *
 * Jito / JitoSOL appears only as a `DEMO_PREVIEW_NOT_LIVE` preview (Demo Mode uses
 * `DEMO_PREVIEW_NOT_LIVE`, never `INTERNAL_PREVIEW_NOT_LIVE`).
 * `PROTOCOL_SELECTION_IMPLEMENTED = false`; `productionReady = false`.
 */
import type { SuggestionCardState } from "../types/dashboard";
import type { SuggestionReviewDetails } from "./engineTypes";
import type { RailSuggestions } from "./useRailSuggestions";
import { getJitoSolDirectProtocolRouteEvaluationDisplay } from "./jitoSolReadOnlyRouteEvaluation";
import { getJitoSolExternalStakingLink } from "./jitoSolBetaActivation";
import { buildMsolReadOnlyReviewCandidateDisplay } from "./solLiquidStakingMsolReadOnlyApproval";
import { buildJupsolReadOnlyReviewCandidateDisplay } from "./solLiquidStakingJupsolReadOnlyApproval";
import { buildBsolReadOnlyReviewCandidateDisplay } from "./solLiquidStakingBsolReadOnlyApproval";
import { buildNativeStakingReviewCandidateDisplay } from "./solNativeStakingBaselineReadOnlyApproval";

/**
 * Deterministic "now" for the demo so the mSOL, JupSOL, bSOL, and Jupiter Native Stake review
 * evidence all read as fresh. Set just after the native-staking market snapshot
 * (2026-07-14T02:45Z) and within 24h of mSOL's earliest record so all four are
 * approved-for-review in the demo.
 */
const DEMO_REVIEW_CHECKED_AT = "2026-07-14T02:50:00Z";

export const DEMO_EXACT_SOL_STAKING_SCENARIO_EXISTS = true;
export const DEMO_EXACT_SOL_STAKING_SCENARIO_DEMO_ONLY = true;
export const DEMO_EXACT_SOL_STAKING_SCENARIO_USES_FAKE_DATA = true;
export const DEMO_EXACT_SOL_STAKING_SCENARIO_ENABLES_REAL_SELECTION = false;
export const DEMO_EXACT_SOL_STAKING_SCENARIO_ENABLES_TRANSACTIONS = false;
export const DEMO_EXACT_SOL_STAKING_SCENARIO_UPDATES_LIVE_SUGGESTIONS = false;
export const DEMO_EXACT_SOL_STAKING_SCENARIO_USES_SHARED_UI = true;

export const DEMO_EXACT_SOL_STAKING_SCENARIO_ID = "demo_sol_staking_exact";

export interface DemoExactSolStakingWallet {
  totalSol: number;
  reserveSol: number;
  eligibleSol: number;
  solPriceUsd: number;
  eligibleUsd: number;
}

export interface DemoExactSolStakingSuggestion {
  category: "staking";
  title: string;
  description: string;
  amountLabel: string;
  suggestedProtocolLabel: string;
  protocolName: string;
  lstSymbol: string;
  demoOnly: true;
  demoLabel: "DEMO_PREVIEW_NOT_LIVE";
  actionKind: "review_only";
  actionsDisabled: true;
  transactionsEnabled: false;
  requiresWalletSignature: false;
  completionOnClick: false;
  safetyNotes: string[];
  limitations: string[];
}

export interface DemoExactSolStakingScenario {
  demoLabel: "DEMO_PREVIEW_NOT_LIVE";
  wallet: DemoExactSolStakingWallet;
  suggestion: DemoExactSolStakingSuggestion;
}

/** The demo exact SOL staking scenario (fake wallet + review-only suggestion). */
export function getDemoExactSolStakingScenario(): DemoExactSolStakingScenario {
  return {
    demoLabel: "DEMO_PREVIEW_NOT_LIVE",
    wallet: {
      totalSol: 12.5,
      reserveSol: 0.1,
      eligibleSol: 12.4,
      solPriceUsd: 150,
      eligibleUsd: 1860,
    },
    suggestion: {
      category: "staking",
      title: "Put Idle SOL to Work",
      description: "Review liquid staking for idle SOL using a demo-only protocol preview.",
      amountLabel: "12.4 SOL eligible to review",
      suggestedProtocolLabel: "Suggested protocol to review",
      protocolName: "Jito",
      lstSymbol: "JitoSOL",
      demoOnly: true,
      demoLabel: "DEMO_PREVIEW_NOT_LIVE",
      actionKind: "review_only",
      actionsDisabled: true,
      transactionsEnabled: false,
      requiresWalletSignature: false,
      completionOnClick: false,
      safetyNotes: [
        "Demo Mode uses fake data.",
        "WealthSmith does not move funds for you.",
        "You choose whether to continue externally.",
      ],
      limitations: [
        "Production protocol selection is still disabled.",
        "Real wallet mode will only show exact protocol suggestions after approval gates pass.",
      ],
    },
  };
}

/** The scenario as a shared `SuggestionCardState` (same shape real-wallet cards use). */
export function getDemoExactSolStakingCard(): SuggestionCardState {
  const { suggestion: s } = getDemoExactSolStakingScenario();
  return {
    id: DEMO_EXACT_SOL_STAKING_SCENARIO_ID,
    title: s.title,
    type: "staking",
    category: "staking",
    badge: "Top Pick",
    is_top_pick: true,
    status: "actionable",
    actionability: "actionable",
    severity: "info",
    description: s.description,
    impact_text: s.amountLabel,
    cta: {
      label: "Review Details",
      action: "review",
      executes_transaction: false,
      requires_wallet_signature: false,
      completion_on_click: false,
    },
    demoLabel: s.demoLabel,
    suggestedProtocolLabel: s.suggestedProtocolLabel,
    protocolName: s.protocolName,
    lstSymbol: s.lstSymbol,
    protocolStatusLabel: "Demo preview",
    protocolSelectionDisplay: {
      label: s.suggestedProtocolLabel,
      protocolName: s.protocolName,
      assetSymbol: "SOL",
      mode: "demo_preview",
    },
  };
}

/** The scenario as shared `SuggestionReviewDetails` (same shape the modal renders). */
export function getDemoExactSolStakingReviewDetails(): SuggestionReviewDetails {
  const { wallet, suggestion: s } = getDemoExactSolStakingScenario();
  return {
    demoLabel: s.demoLabel,
    protocolSelectionDisplay: {
      label: s.suggestedProtocolLabel,
      protocolName: s.protocolName,
      assetSymbol: s.lstSymbol,
      mode: "demo_preview",
      demoLabel: s.demoLabel,
      sourceStatusLabel: "Verified source data · Demo preview",
      marketData: {
        tvlUsd: 767950000,
        apyPct: 5.36,
        apy30dPct: 5.45,
        directUnstakeTimeHours: 48,
        directUnstakeFeePct: 0.1,
        annualManagementFeePct: 4,
        annualManagementFeeAppliesTo: "rewards",
      },
      productionStatus: {
        realWalletSelectionEnabled: false,
        transactionsEnabled: false,
      },
    },
    summary: {
      title: s.title,
      reason: "This is a demo-only exact staking preview.",
      categoryLabel: "Staking",
    },
    metrics: [
      { label: "Total liquid SOL", value: wallet.totalSol, unit: "SOL", kind: "token_amount" },
      { label: "Fee reserve", value: wallet.reserveSol, unit: "SOL", kind: "token_amount" },
      { label: "Eligible to review", value: wallet.eligibleSol, unit: "SOL", kind: "token_amount" },
    ],
    involvedAssets: [{ symbol: "SOL", name: "Solana", amount: wallet.totalSol, role: "liquid_sol" }],
    involvedPositions: [],
    calculations: [
      { label: "Eligible to review", formula: "total − reserve", currentValue: wallet.totalSol, threshold: wallet.reserveSol, difference: wallet.eligibleSol, unit: "SOL" },
    ],
    // Demo-only: JitoSOL market data is verified for this demo preview; real wallet
    // protocol selection is still disabled. (Not a passed production guardrail.)
    guardrailSummary: { checked: ["Protocol selection (verified for demo)"], notEvaluated: [], notApplicable: [] },
    // Read-only route/liquidity/slippage checks (Step 13I). Direct protocol stake:
    // route cost reviewed; DEX liquidity depth / slippage not applicable. No tx.
    routeEvaluation: getJitoSolDirectProtocolRouteEvaluationDisplay({
      inputAmountSol: wallet.eligibleSol,
      checkedAt: "2026-07-13T00:00:00Z",
    }),
    // Read-only external handoff (Step 13J) — same shape real wallet mode uses.
    externalLink: getJitoSolExternalStakingLink(),
    // Read-only "alternative protocol to review" (Step 14L): approved mSOL shown for
    // review only alongside the selected JitoSOL. Not selected/winner; no execution.
    otherProtocolsToReview: [
      buildMsolReadOnlyReviewCandidateDisplay({ checkedAt: DEMO_REVIEW_CHECKED_AT }),
      buildJupsolReadOnlyReviewCandidateDisplay({ checkedAt: DEMO_REVIEW_CHECKED_AT }),
      buildBsolReadOnlyReviewCandidateDisplay({ checkedAt: DEMO_REVIEW_CHECKED_AT }),
      buildNativeStakingReviewCandidateDisplay({ checkedAt: DEMO_REVIEW_CHECKED_AT }),
    ],
    limitations: [
      { kind: "protocol_not_selected", text: s.limitations[0] },
      { kind: "review_only", text: s.limitations[1] },
    ],
    safetyNotes: [
      { kind: "informational", text: "Demo Mode uses fake data." },
      { kind: "no_auto_move", text: "WealthSmith does not move funds for you." },
      { kind: "no_transaction", text: "No transaction is created from this demo." },
    ],
  };
}

/**
 * Build the demo scenario as a shared `RailSuggestions` payload so it renders through
 * the SAME `RealWalletSuggestionsRail` → `SuggestionCard` → `SuggestionReviewModal`.
 */
export function buildDemoExactSolStakingRail(): RailSuggestions {
  const card = getDemoExactSolStakingCard();
  return {
    loading: false,
    available: true,
    cards: [card],
    reviewDetailsById: { [card.id]: getDemoExactSolStakingReviewDetails() },
    contributionReviewById: {},
    stableYieldReviewById: {},
    notice: undefined,
  };
}

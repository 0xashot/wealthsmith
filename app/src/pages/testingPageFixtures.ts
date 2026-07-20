/**
 * testingPageFixtures — Step 13H. Deterministic, fixture-only suggestion data for
 * the hidden `/testing` page, which renders every suggestion category through the
 * SAME shared `SuggestionCard` + `SuggestionReviewModal` real wallet mode uses.
 *
 * FIXTURE-ONLY, READ-ONLY: nothing here reads a real wallet, connects a wallet,
 * mutates live/Demo suggestion behavior, or enables a transaction. Every fixture
 * is review-only (`executes_transaction` / `requires_wallet_signature` /
 * `completion_on_click` all false) and carries the `TESTING_PREVIEW_NOT_LIVE`
 * label (never the Demo `DEMO_PREVIEW_NOT_LIVE` or dev-route
 * `INTERNAL_PREVIEW_NOT_LIVE` labels — those are reserved for other flows).
 *
 * This module is TYPE-ONLY at the boundary (no engine/live imports), so the Node
 * fixtures runner can import it safely and it can never pull live behavior in.
 */
import type { SuggestionCardState } from "../types/dashboard";
import type {
  ReviewSafetyNote,
  SuggestionReviewDetails,
} from "../suggestions/engineTypes";
import { getJitoSolDirectProtocolRouteEvaluationDisplay } from "../suggestions/jitoSolReadOnlyRouteEvaluation";
import { buildMsolReadOnlyReviewCandidateDisplay } from "../suggestions/solLiquidStakingMsolReadOnlyApproval";
import { buildJupsolReadOnlyReviewCandidateDisplay } from "../suggestions/solLiquidStakingJupsolReadOnlyApproval";
import { buildBsolReadOnlyReviewCandidateDisplay } from "../suggestions/solLiquidStakingBsolReadOnlyApproval";
import { getInfBlockedReviewSummary } from "../suggestions/solLiquidStakingInfReadOnlyApproval";
import { buildNativeStakingReviewCandidateDisplay } from "../suggestions/solNativeStakingBaselineReadOnlyApproval";
import { buildSolStakingMarketCache } from "../suggestions/solStakingMarketDataRefresh";
import { buildNormalizedSolStakingCandidateSet } from "../suggestions/solStakingCandidateNormalization";
import { buildSolStakingSelectorComparison } from "../suggestions/solStakingSelectorComparison";
import { buildSolStakingSelectorPresentation } from "../suggestions/solStakingSelectorPresentation";

/**
 * Step 14Y — a deterministic, INTERNAL fixture presentation of the current comparison leader.
 * Built from a synthetic fresh market cache (no live fetch), so /testing can render the read-only
 * "Current comparison" panel. Not real wallet data; not activation; selectedProtocolId unchanged.
 */
function buildTestingSelectorPresentation() {
  const CHECKED = "2026-07-14T02:55:00Z";
  const FETCHED = "2026-07-14T02:50:00Z";
  const rec = (pool: string, apy: number, apy30d: number, tvlUsd: number) => ({ pool, chain: "Solana", symbol: "X", apy, apyMean30d: apy30d, tvlUsd });
  const dll = { status: "success", data: [
    rec("0e7d0722-9054-4907-8593-567b353c0900", 5.36, 5.45, 767950000),
    rec("52bd72a7-9e81-4112-abb4-71673e8de9bf", 5.67, 5.6, 409170000),
    rec("b3f93865-5ec8-4662-90a0-11808e0aa2bd", 9.0, 9.0, 184840000), // mSOL leads
    rec("387d6732-59f0-4ae0-8a88-aba75a5cbe4a", 5.27, 5.32, 69750000),
    rec("3075a746-bdd1-4aac-bcd5-b035abee2622", 5.84, 5.95, 152555981),
  ] };
  const VA = "CatzoSMUkTRidT5DwBxAC2pEtnwMBTpkCepHkFgZDiqb";
  const IDENT = "JUPiTERrZqgf1jUyR7dSkhMx4Kn2qJyekWsg3LT1h4b";
  const epochs: Record<string, unknown>[] = [];
  let end = Date.parse("2026-07-12T12:22:01Z");
  for (let k = 0; k < 16; k++) { const start = end - 2 * 86400_000; epochs.push({ epoch: 1000 - k, apy: 0.054 - k * 0.0004, activated_stake: 12_500_000_000_000_000, commission_effective: 5, epoch_start_at: new Date(start).toISOString(), epoch_end_at: new Date(end).toISOString() }); end = start; }
  const marinade = { validators: [{ vote_account: VA, identity: IDENT, epoch_stats: [{ epoch: 1001, apy: null, epoch_start_at: "2026-07-12T12:22:01Z", epoch_end_at: "2026-07-14T12:00:00Z" }, ...epochs] }] };
  const stakewiz = [{ vote_identity: VA, identity: IDENT, activated_stake: 12_500_954.43, commission: 500, apy_estimate: 5.23, delinquent: false, epoch: 1001 }];
  const cache = buildSolStakingMarketCache({ checkedAt: CHECKED, defiLlama: { payload: dll, fetchedAt: FETCHED }, stakewiz: { payload: stakewiz, fetchedAt: FETCHED }, marinade: { payload: marinade, fetchedAt: FETCHED } });
  const nset = buildNormalizedSolStakingCandidateSet(cache, { checkedAt: CHECKED });
  const cmp = buildSolStakingSelectorComparison(nset, { checkedAt: CHECKED });
  return buildSolStakingSelectorPresentation({ marketCache: cache, normalizedSet: nset, comparisonResult: cmp, checkedAt: CHECKED });
}
const TESTING_SELECTOR_PRESENTATION = buildTestingSelectorPresentation();

/* ------------------------------------------------------------------ *
 * Route + safety flags (mirrors the internalPreviewFlags pattern).
 * ------------------------------------------------------------------ */
export const TESTING_PAGE_EXISTS = true;
export const TESTING_PAGE_VISIBLE_IN_NAV = false;
export const TESTING_PAGE_USES_FIXTURE_DATA = true;
export const TESTING_PAGE_USES_REAL_WALLET_DATA = false;
export const TESTING_PAGE_ENABLES_TRANSACTIONS = false;
export const TESTING_PAGE_MUTATES_LIVE_SUGGESTIONS = false;
/** The page renders through the SHARED card/modal — not a testing-only copy. */
export const TESTING_PAGE_USES_SHARED_CARD = true;
export const TESTING_PAGE_USES_SHARED_MODAL = true;
/** Structural guarantees (also grep-verified): never linked in nav / imported by live pages. */
export const TESTING_PAGE_LINKED_IN_NAV = false;
export const TESTING_PAGE_IMPORTED_BY_DASHBOARD = false;
export const TESTING_PAGE_IMPORTED_BY_PORTFOLIO = false;
export const TESTING_PAGE_IMPORTED_BY_RAIL = false;

/** The testing-only label. NOT the Demo or dev-route label. */
export const TESTING_PREVIEW_NOT_LIVE = "TESTING_PREVIEW_NOT_LIVE";

/**
 * Step 16H-K.2 — the route gate moved to `internalTestingRoute.ts` so `App.tsx` can read it WITHOUT
 * statically importing this fixture module (which would pull the internal numeric risk-score fixtures
 * below into the main production chunk). Re-exported here so existing importers keep working.
 */
export { TESTING_PAGE_ROUTE, isTestingPageEnabled, INTERNAL_TESTING_FLAG } from "./internalTestingRoute";

/* ------------------------------------------------------------------ *
 * Fixture model.
 * ------------------------------------------------------------------ */
export type TestingGroup = "Safety" | "Allocation" | "Yield" | "Contributions" | "Review";

/** Filter groups shown on the page (plus an implicit "All"). */
export const TESTING_GROUPS: TestingGroup[] = ["Safety", "Allocation", "Yield", "Contributions", "Review"];

export interface TestingFixture {
  id: string;
  /** Category label for display (matches the engine's category labels). */
  categoryLabel: string;
  group: TestingGroup;
  /** Always TESTING_PREVIEW_NOT_LIVE — marks the fixture as not real wallet data. */
  label: string;
  card: SuggestionCardState;
  details: SuggestionReviewDetails;
}

/* ------------------------------------------------------------------ *
 * Small builders (keep the fixtures terse and consistent).
 * ------------------------------------------------------------------ */
const REVIEW_ONLY_NOTES: ReviewSafetyNote[] = [
  { kind: "no_auto_move", text: "WealthSmith does not move funds for you." },
  { kind: "no_transaction", text: "No transaction is created from this suggestion." },
  { kind: "no_signature", text: "No wallet signature is requested." },
  { kind: "review_only", text: "Fixture-only — not real wallet data." },
];

const INFORMATIONAL_NOTES: ReviewSafetyNote[] = [
  { kind: "informational", text: "Informational only" },
  { kind: "no_action", text: "No action required" },
];

const REVIEW_ONLY_LIMITATION = { kind: "review_only" as const, text: "This is a review suggestion only, not a transaction." };

/** A non-transactional review CTA (the only interactive shape a fixture uses). */
const reviewCta = (label: string): SuggestionCardState["cta"] => ({
  label,
  action: "review",
  executes_transaction: false,
  requires_wallet_signature: false,
  completion_on_click: false,
});

/** The no-CTA shape for informational (On Track) fixtures. */
const infoCta: SuggestionCardState["cta"] = {
  label: "",
  action: null,
  executes_transaction: false,
  requires_wallet_signature: false,
  completion_on_click: false,
};

interface CardArgs {
  id: string;
  title: string;
  type: string;
  category: string;
  description: string;
  impact_text: string;
  severity: string;
  informational?: boolean;
  extra?: Partial<SuggestionCardState>;
}

function buildCard(a: CardArgs): SuggestionCardState {
  return {
    id: a.id,
    title: a.title,
    type: a.type,
    category: a.category,
    badge: "",
    is_top_pick: false,
    status: a.informational ? "ready" : "active",
    actionability: a.informational ? "informational" : "actionable",
    severity: a.severity,
    description: a.description,
    impact_text: a.impact_text,
    cta: a.informational ? infoCta : reviewCta("Review Details"),
    // Testing badge — shared card renders this in the `demoLabel` badge slot; it
    // is the TESTING label, never the Demo/internal one.
    demoLabel: TESTING_PREVIEW_NOT_LIVE,
    ...a.extra,
  };
}

/* ------------------------------------------------------------------ *
 * The fixtures — one clean, clickable example per category.
 * ------------------------------------------------------------------ */
const safetyBuffer: TestingFixture = {
  id: "testing_safety_buffer",
  categoryLabel: "Safety Buffer",
  group: "Safety",
  label: TESTING_PREVIEW_NOT_LIVE,
  card: buildCard({
    id: "testing_safety_buffer",
    title: "Build Your Safety Buffer",
    type: "fund_safety_buffer",
    category: "safety_buffer",
    description: "Your Safety Buffer is below its risk-based target.",
    impact_text: "Buffer shortfall: $2,200",
    severity: "high",
  }),
  details: {
    summary: { title: "Build Your Safety Buffer", reason: "Your Safety Buffer is below its risk-based target.", categoryLabel: "Safety Buffer" },
    metrics: [
      { label: "Safety Buffer target", value: 3000, kind: "amount_usd", unit: "USD" },
      { label: "Current stable buffer", value: 800, kind: "amount_usd", unit: "USD" },
      { label: "Shortfall", value: 2200, kind: "amount_usd", unit: "USD" },
    ],
    involvedAssets: [{ symbol: "USDC", valueUsd: 800, role: "buffer_asset" }],
    involvedPositions: [],
    calculations: [{ label: "Shortfall", formula: "target − current", currentValue: 800, targetValue: 3000, difference: 2200, unit: "USD" }],
    guardrailSummary: { checked: ["Safety Buffer protection", "Pricing availability", "Minimum suggestion size"], notEvaluated: [], notApplicable: ["Protocol selection"] },
    limitations: [REVIEW_ONLY_LIMITATION],
    safetyNotes: REVIEW_ONLY_NOTES,
    demoLabel: TESTING_PREVIEW_NOT_LIVE,
  },
};

const rebalance: TestingFixture = {
  id: "testing_rebalance",
  categoryLabel: "Allocation",
  group: "Allocation",
  label: TESTING_PREVIEW_NOT_LIVE,
  card: buildCard({
    id: "testing_rebalance",
    title: "Review Portfolio Balance",
    type: "rebalance_to_plan",
    category: "allocation",
    description: "Your allocation has drifted from your target.",
    impact_text: "Amount to review: $1,750",
    severity: "medium",
  }),
  details: {
    summary: { title: "Review Portfolio Balance", reason: "Your allocation has drifted from your target.", categoryLabel: "Allocation" },
    metrics: [
      { label: "Current crypto", value: 85, kind: "allocation_pct", unit: "%" },
      { label: "Target crypto", value: 60, kind: "allocation_pct", unit: "%" },
      { label: "Current stablecoins", value: 15, kind: "allocation_pct", unit: "%" },
      { label: "Target stablecoins", value: 40, kind: "allocation_pct", unit: "%" },
      { label: "Amount to review", value: 1750, kind: "amount_usd", unit: "USD" },
    ],
    involvedAssets: [],
    involvedPositions: [],
    calculations: [{ label: "Crypto vs target", formula: "current − target", currentValue: 85, targetValue: 60, difference: 25, unit: "%" }],
    guardrailSummary: { checked: ["Allocation vs target", "Pricing availability"], notEvaluated: [], notApplicable: ["Protocol selection"] },
    limitations: [REVIEW_ONLY_LIMITATION],
    safetyNotes: REVIEW_ONLY_NOTES,
    demoLabel: TESTING_PREVIEW_NOT_LIVE,
  },
};

const capitalEfficiency: TestingFixture = {
  id: "testing_capital_efficiency",
  categoryLabel: "Capital Efficiency",
  group: "Review",
  label: TESTING_PREVIEW_NOT_LIVE,
  card: buildCard({
    id: "testing_capital_efficiency",
    title: "Review Idle Assets",
    type: "review_idle_assets",
    category: "capital_efficiency",
    description: "Some assets may not be contributing to your plan.",
    impact_text: "Idle assets: $420",
    severity: "info",
  }),
  details: {
    summary: { title: "Review Idle Assets", reason: "Some non-core assets are sitting idle and may deserve a review.", categoryLabel: "Capital Efficiency" },
    metrics: [{ label: "Idle assets value", value: 420, kind: "amount_usd", unit: "USD" }],
    involvedAssets: [
      { symbol: "BONK", valueUsd: 240, role: "idle_asset" },
      { symbol: "WIF", valueUsd: 180, role: "idle_asset" },
    ],
    involvedPositions: [],
    calculations: [],
    guardrailSummary: { checked: ["Idle asset threshold", "Pricing availability"], notEvaluated: [], notApplicable: ["Protocol selection"] },
    limitations: [REVIEW_ONLY_LIMITATION],
    safetyNotes: REVIEW_ONLY_NOTES,
    demoLabel: TESTING_PREVIEW_NOT_LIVE,
  },
};

// Step 19C — the hand-built `testing_trim` card was REPLACED by the production-derived Trim gallery
// (trimTestingFixtures.ts → deriveTrimAssessment + buildTrimCardFromAssessment, rendered on TestingPage via
// the production SuggestionCard + SuggestionReviewModal). No testing-only Trim card remains.

const staking: TestingFixture = {
  id: "testing_staking",
  categoryLabel: "Staking",
  group: "Yield",
  label: TESTING_PREVIEW_NOT_LIVE,
  card: buildCard({
    id: "testing_staking",
    title: "Put Idle SOL to Work",
    type: "stake_idle_sol",
    category: "staked_assets",
    description: "You have liquid SOL that may be eligible for review.",
    impact_text: "Eligible SOL to review: 12.4 SOL",
    severity: "info",
    extra: {
      suggestedProtocolLabel: "Suggested protocol to review",
      protocolName: "Jito",
      lstSymbol: "JitoSOL",
      protocolStatusLabel: "Verified source data",
      protocolSelectionDisplay: { label: "Suggested protocol to review", protocolName: "Jito", assetSymbol: "JitoSOL", mode: "production" },
    },
  }),
  details: {
    summary: { title: "Put Idle SOL to Work", reason: "You have liquid SOL that may be eligible for review.", categoryLabel: "Staking" },
    metrics: [
      { label: "Eligible SOL to review", value: 12.4, kind: "token_amount", unit: "SOL" },
      { label: "SOL reserve kept", value: 0.1, kind: "token_amount", unit: "SOL" },
      { label: "Eligible value to review", value: 1860, kind: "amount_usd", unit: "USD" },
    ],
    involvedAssets: [{ symbol: "SOL", amount: 12.4, valueUsd: 1860, role: "liquid_sol" }],
    involvedPositions: [],
    calculations: [],
    guardrailSummary: {
      checked: ["Safety Buffer protection", "SOL fee reserve", "Minimum suggestion size", "Protocol selection"],
      notEvaluated: [],
      notApplicable: [],
    },
    // Read-only route/liquidity/slippage checks (Step 13I) — same shape real wallet
    // mode uses: direct protocol route reviewed, DEX liquidity/slippage not applicable.
    routeEvaluation: getJitoSolDirectProtocolRouteEvaluationDisplay({
      inputAmountSol: 12.4,
      checkedAt: "2026-07-13T00:00:00Z",
    }),
    // Read-only external handoff (Step 13J) — same shape real wallet mode uses.
    // Inlined here to keep this fixtures module free of live/beta imports.
    externalLink: { label: "Open Jito staking page", url: "https://www.jito.network/staking/", opensInNewTab: true },
    limitations: [REVIEW_ONLY_LIMITATION],
    safetyNotes: REVIEW_ONLY_NOTES,
    demoLabel: TESTING_PREVIEW_NOT_LIVE,
    protocolSelectionDisplay: {
      label: "Suggested protocol to review",
      protocolName: "Jito",
      assetSymbol: "JitoSOL",
      mode: "production",
      sourceStatusLabel: "Verified source data",
      marketData: {
        tvlUsd: 767950000,
        apyPct: 5.36,
        apy30dPct: 5.45,
        directUnstakeTimeHours: 48,
        directUnstakeFeePct: 0.1,
        annualManagementFeePct: 4,
        annualManagementFeeAppliesTo: "rewards",
      },
      productionStatus: { realWalletSelectionEnabled: true, transactionsEnabled: false },
    },
  },
};

const stableYield: TestingFixture = {
  id: "testing_stable_yield",
  categoryLabel: "Stablecoin Yield",
  group: "Yield",
  label: TESTING_PREVIEW_NOT_LIVE,
  card: buildCard({
    id: "testing_stable_yield",
    title: "Put Stablecoins to Work",
    type: "deploy_idle_stablecoins",
    category: "yield_opportunity",
    description: "You have liquid stablecoins that may be eligible for conservative yield review.",
    impact_text: "Stablecoins to review: $1,200",
    severity: "info",
  }),
  details: {
    summary: { title: "Put Stablecoins to Work", reason: "You have liquid stablecoins that may be eligible for conservative yield review.", categoryLabel: "Stablecoin Yield" },
    metrics: [{ label: "Stablecoins to review", value: 1200, kind: "amount_usd", unit: "USD" }],
    involvedAssets: [{ symbol: "USDC", valueUsd: 1200, role: "stablecoin" }],
    involvedPositions: [],
    calculations: [],
    guardrailSummary: {
      checked: ["Safety Buffer protection", "Pricing availability"],
      notEvaluated: ["Protocol selection", "Route cost", "Liquidity depth", "Slippage"],
      notApplicable: [],
    },
    limitations: [
      { kind: "cost_not_evaluated", text: "WealthSmith has not evaluated route cost yet." },
      { kind: "liquidity_not_evaluated", text: "WealthSmith has not evaluated liquidity depth yet." },
      { kind: "slippage_not_evaluated", text: "WealthSmith has not evaluated slippage yet." },
      { kind: "protocol_not_selected", text: "WealthSmith has not selected a protocol yet." },
      REVIEW_ONLY_LIMITATION,
    ],
    safetyNotes: REVIEW_ONLY_NOTES,
    demoLabel: TESTING_PREVIEW_NOT_LIVE,
  },
};

const dca: TestingFixture = {
  id: "testing_dca",
  categoryLabel: "Contribution Plan",
  group: "Contributions",
  label: TESTING_PREVIEW_NOT_LIVE,
  card: buildCard({
    id: "testing_dca",
    title: "Review a DCA Plan",
    type: "dca_buy",
    category: "contribution_plan",
    description: "Your crypto allocation is below target; future contributions may build exposure gradually.",
    impact_text: "Monthly contribution: $500",
    severity: "info",
  }),
  details: {
    summary: { title: "Review a DCA Plan", reason: "Your crypto allocation is below target; future contributions may build exposure gradually.", categoryLabel: "Contribution Plan" },
    metrics: [{ label: "Monthly contribution", value: 500, kind: "amount_usd", unit: "USD" }],
    involvedAssets: [{ symbol: "USDC", valueUsd: 500, role: "dca_source" }],
    involvedPositions: [],
    calculations: [{ label: "Allocation gap", formula: "target − current", currentValue: 57, targetValue: 60, difference: 3, unit: "%" }],
    guardrailSummary: { checked: ["Planned contribution", "Allocation gap"], notEvaluated: [], notApplicable: ["Protocol selection"] },
    limitations: [REVIEW_ONLY_LIMITATION],
    safetyNotes: REVIEW_ONLY_NOTES,
    demoLabel: TESTING_PREVIEW_NOT_LIVE,
  },
};

const positionOptimization: TestingFixture = {
  id: "testing_position_optimization",
  categoryLabel: "Portfolio Health",
  group: "Review",
  label: TESTING_PREVIEW_NOT_LIVE,
  card: buildCard({
    id: "testing_position_optimization",
    title: "Review Existing Yield Positions",
    type: "review_yield_strategy",
    category: "portfolio_health",
    description: "Some existing positions may need review.",
    impact_text: "Positions to review: $15,200",
    severity: "info",
  }),
  details: {
    summary: { title: "Review Existing Yield Positions", reason: "A large share of your yield sits in one position — worth a review.", categoryLabel: "Portfolio Health" },
    metrics: [
      { label: "Positions to review", value: 15200, kind: "amount_usd", unit: "USD" },
      { label: "Concentration", value: 86, kind: "percent", unit: "%" },
      { label: "Reported APY", value: 3.9, kind: "percent", unit: "%" },
    ],
    involvedAssets: [],
    involvedPositions: [{ protocol: "Kamino", name: "Steakhouse USDC", valueUsd: 15200, apy: 3.9, role: "concentrated_position", reason: "High share of your yield exposure" }],
    calculations: [],
    guardrailSummary: { checked: ["Position value threshold", "Concentration review"], notEvaluated: [], notApplicable: ["Protocol selection"] },
    limitations: [REVIEW_ONLY_LIMITATION],
    safetyNotes: REVIEW_ONLY_NOTES,
    demoLabel: TESTING_PREVIEW_NOT_LIVE,
  },
};

const onTrack: TestingFixture = {
  id: "testing_on_track",
  categoryLabel: "On Track",
  group: "Review",
  label: TESTING_PREVIEW_NOT_LIVE,
  card: buildCard({
    id: "testing_on_track",
    title: "You're On Track",
    type: "on_track",
    category: "portfolio_health",
    description: "Your Safety Buffer is funded and your allocation is close to your target.",
    impact_text: "",
    severity: "info",
    informational: true,
  }),
  details: {
    summary: { title: "You're On Track", reason: "Your Safety Buffer is funded and your allocation is close to your target. No action is needed right now.", categoryLabel: "On Track" },
    metrics: [],
    involvedAssets: [],
    involvedPositions: [],
    calculations: [],
    guardrailSummary: { checked: [], notEvaluated: [], notApplicable: [] },
    limitations: [],
    safetyNotes: INFORMATIONAL_NOTES,
    demoLabel: TESTING_PREVIEW_NOT_LIVE,
  },
};

// Step 14L — mSOL as a read-only ALTERNATIVE protocol to review (a separate card;
// the "Staking" fixture above stays JitoSOL-only). Uses a fresh checkedAt so the
// review evidence reads as approved-for-review. Review-only; not selected/winner.
const msolReviewCandidate: TestingFixture = {
  id: "testing_msol_review",
  categoryLabel: "Review Candidate",
  group: "Yield",
  label: TESTING_PREVIEW_NOT_LIVE,
  card: buildCard({
    id: "testing_msol_review",
    title: "mSOL Review Candidate",
    type: "stake_idle_sol",
    category: "staked_assets",
    description: "Marinade · mSOL — approved for read-only review only (alternative protocol, not selected).",
    impact_text: "Risk score: 7.40 / 10",
    severity: "info",
    extra: {
      suggestedProtocolLabel: "Alternative protocol to review",
      protocolName: "Marinade",
      lstSymbol: "mSOL",
    },
  }),
  details: {
    summary: { title: "mSOL Review Candidate", reason: "Marinade · mSOL is approved for read-only review only — it is not the selected protocol. Final protocol selection will happen later through deterministic WealthSmith protocol logic.", categoryLabel: "Staking" },
    metrics: [],
    involvedAssets: [],
    involvedPositions: [],
    calculations: [],
    guardrailSummary: { checked: [], notEvaluated: [], notApplicable: [] },
    limitations: [REVIEW_ONLY_LIMITATION],
    safetyNotes: [
      { kind: "review_only", text: "Review only — WealthSmith will not move funds for you." },
      ...REVIEW_ONLY_NOTES,
    ],
    demoLabel: TESTING_PREVIEW_NOT_LIVE,
    selectorPresentation: TESTING_SELECTOR_PRESENTATION,
    otherProtocolsToReview: [
      buildMsolReadOnlyReviewCandidateDisplay({ checkedAt: "2026-07-14T02:50:00Z" }),
      buildJupsolReadOnlyReviewCandidateDisplay({ checkedAt: "2026-07-14T02:50:00Z" }),
      buildBsolReadOnlyReviewCandidateDisplay({ checkedAt: "2026-07-14T02:50:00Z" }),
      buildNativeStakingReviewCandidateDisplay({ checkedAt: "2026-07-14T02:50:00Z" }),
    ],
  },
};

// Step 14O — Sanctum · INF is a MULTI-LST pool. Its evidence is complete + fresh and a
// risk score is assigned (6.95 / 10), but that is BELOW the 7.0 read-only-review
// threshold, so INF is NOT approved and is NOT surfaced as an alternative protocol to
// review anywhere product-facing. This is an INTERNAL, clearly-labelled BLOCKED evidence
// view only (driven by getInfBlockedReviewSummary); it has no otherProtocolsToReview.
const infBlocked = getInfBlockedReviewSummary({ checkedAt: "2026-07-14T02:30:00Z" });
const infBlockedCandidate: TestingFixture = {
  id: "testing_inf_blocked",
  categoryLabel: "Blocked Candidate",
  group: "Yield",
  label: TESTING_PREVIEW_NOT_LIVE,
  card: buildCard({
    id: "testing_inf_blocked",
    title: "INF Review Candidate — Blocked",
    type: "stake_idle_sol",
    category: "staked_assets",
    description: "Sanctum · INF (Multi-LST pool) — evidence complete, but risk score is below the read-only review threshold; not cleared for review. Internal evidence view only.",
    impact_text: `Risk score: ${infBlocked.riskScore?.toFixed(2)} / 10 (below ${infBlocked.riskScoreThreshold}.0 threshold — blocked)`,
    severity: "info",
    extra: {
      suggestedProtocolLabel: "Blocked — not cleared for read-only review",
      protocolName: "Sanctum",
      lstSymbol: "INF",
    },
  }),
  details: {
    summary: {
      title: "INF Review Candidate — Blocked (below threshold)",
      reason: `Sanctum · INF is a ${infBlocked.poolComposition.poolType}. ${infBlocked.poolComposition.overlapNote} Evidence is complete and fresh, but its risk score ${infBlocked.riskScore?.toFixed(2)} / 10 is below the ${infBlocked.riskScoreThreshold}.0 read-only review threshold, so INF is not cleared for read-only review and is not shown as an alternative protocol to review. Internal evidence view only. Final protocol selection will happen later through deterministic WealthSmith protocol logic.`,
      categoryLabel: "Blocked Candidate",
    },
    metrics: [],
    involvedAssets: [],
    involvedPositions: [],
    calculations: [],
    guardrailSummary: { checked: [], notEvaluated: ["Read-only review approval (risk score below threshold)"], notApplicable: ["Protocol selection"] },
    limitations: [
      { kind: "review_only", text: `Blocked: risk score ${infBlocked.riskScore?.toFixed(2)} / 10 is below the ${infBlocked.riskScoreThreshold}.0 read-only review threshold — not cleared for read-only review.` },
      { kind: "review_only", text: `Multi-LST pool — underlying exposure: ${infBlocked.poolComposition.underlyingExposure}` },
      { kind: "review_only", text: `Overlap: ${infBlocked.poolComposition.overlapNote}` },
      { kind: "review_only", text: `Evidence (complete): TVL $${((infBlocked.marketData?.tvlUsd ?? 0) / 1_000_000).toFixed(2)}M · APY ${infBlocked.marketData?.apyPct}% · 30-day ${infBlocked.marketData?.apy30dPct}%.` },
      REVIEW_ONLY_LIMITATION,
    ],
    safetyNotes: [
      { kind: "review_only", text: "Review only — WealthSmith will not move funds for you." },
      ...REVIEW_ONLY_NOTES,
    ],
    demoLabel: TESTING_PREVIEW_NOT_LIVE,
  },
};


const ALL_FIXTURES: TestingFixture[] = [
  safetyBuffer,
  rebalance,
  capitalEfficiency,
  staking,
  stableYield,
  dca,
  positionOptimization,
  onTrack,
  msolReviewCandidate,
  infBlockedCandidate,
];

/** Every testing fixture, in display order (Safety → … → On Track). */
export function getTestingPageFixtures(): TestingFixture[] {
  return ALL_FIXTURES;
}

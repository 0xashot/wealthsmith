/**
 * stakingSuggestion — the deterministic "Put Idle SOL to Work" rule (category
 * `staking`; rules/suggestion-engine-rules.md). Pure over
 * SuggestionEngineInputs: no fetching, no pricing, no AI, no protocol choice.
 *
 * SAFETY BUFFER COMES FIRST: staking is a deployment suggestion, so it only
 * exists once the Safety Buffer is fully funded (the engine's Buffer Override
 * also enforces this). It reviews only TRULY LIQUID wallet SOL — never LSTs,
 * native stake, or protocol SOL — and always keeps a small fee reserve, so it
 * never proposes staking the whole balance.
 *
 * "Actionable" is review-only. No APY, no protocol, no amount is invented; the
 * eligible value is priced SOL × the sourced SOL price.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import type { SuggestionEngineInputs } from "./engineInputs";
import type { EngineSuggestion, SuggestionGuardrail } from "./engineTypes";
import {
  SUGGESTION_ENGINE_VERSION,
  SOL_FEE_RESERVE,
  MIN_STAKING_SUGGESTION_USD,
  GUARDRAIL_STATUS_NOT_EVALUATED,
} from "./engineThresholds";
import { notEvaluatedProtocolSelection, selectedProtocolSelection } from "./protocolSelection";
import { getProtocolCandidatesForSelection } from "./protocolRegistry";
import { buildReviewDetails, usdMetric, metric } from "./suggestionReviewDetails";
import { selectJitoSolReadOnlyBeta } from "./protocolSolLiquidStakingSelector";
import {
  isJitoSolBetaReadOnlyEnabled,
  getJitoSolBetaProtocolSelectionDisplay,
  getJitoSolBetaRouteEvaluationDisplay,
  getJitoSolExternalStakingLink,
  JITOSOL_BETA_LST_SYMBOL,
} from "./jitoSolBetaActivation";
import { buildMsolReadOnlyReviewCandidateDisplay } from "./solLiquidStakingMsolReadOnlyApproval";
import { buildJupsolReadOnlyReviewCandidateDisplay } from "./solLiquidStakingJupsolReadOnlyApproval";
import { buildBsolReadOnlyReviewCandidateDisplay } from "./solLiquidStakingBsolReadOnlyApproval";
import { buildNativeStakingReviewCandidateDisplay } from "./solNativeStakingBaselineReadOnlyApproval";
import type { ProtocolSelection, ReviewSafetyNote, SuggestionReviewDetails } from "./engineTypes";

/** Stable suggestion ID. */
export const STAKING_SUGGESTION_ID = "staking_idle_sol";

/** Exact liquid-SOL symbols. "Contains SOL" is NOT enough (excludes LSTs). */
const LIQUID_SOL_SYMBOLS = new Set(["SOL", "WSOL"]);

/**
 * A position is TRULY LIQUID wallet SOL only when its symbol is exactly SOL or
 * WSOL, it is a native/token wallet holding (not an LST, native stake, or
 * protocol position), and it carries a sourced price + value + amount.
 */
function isLiquidSol(p: WalletPosition): boolean {
  return (
    LIQUID_SOL_SYMBOLS.has(p.symbol) &&
    (p.type === "native" || p.type === "token") &&
    p.source === "wallet" &&
    typeof p.priceUsd === "number" &&
    typeof p.valueUsd === "number" &&
    typeof p.uiAmount === "number"
  );
}

/**
 * Trigger: fully funded Safety Buffer ∧ pricing ∧ a priced total ∧ liquid SOL
 * whose amount above the fee reserve is worth at least the minimum. Anything
 * missing → null (no invented amount; LST/stake/protocol SOL never counts).
 */
export function deriveStakingSuggestion(
  inputs: SuggestionEngineInputs,
  generatedAt: number
): EngineSuggestion | null {
  const sb = inputs.safetyBuffer;
  if (!sb || !sb.fullyFunded) return null;
  if (!inputs.dataQuality.hasPricing) return null;

  const totalPricedUsd = inputs.value.totalUsd;
  if (totalPricedUsd == null || totalPricedUsd <= 0) return null;

  const liquid = inputs.positions.filter(isLiquidSol);
  if (liquid.length === 0) return null;

  const totalLiquidSol = liquid.reduce((s, p) => s + (p.uiAmount as number), 0);
  const eligibleSol = Math.max(totalLiquidSol - SOL_FEE_RESERVE, 0);
  if (eligibleSol <= 0) return null;

  // Sourced SOL price (all liquid SOL is priced by the same SOL mint).
  const solPrice = liquid[0].priceUsd as number;
  const eligibleValueUsd = eligibleSol * solPrice;
  if (eligibleValueUsd < MIN_STAKING_SUGGESTION_USD) return null;

  const guardrails: SuggestionGuardrail[] = [
    { code: "pricing_available", status: "passed" },
    { code: "buffer_protection", status: "passed" },
    { code: "sol_fee_reserve", status: "passed" },
    { code: "min_trade_size", status: "passed" },
    // protocol_selection guardrail is derived centrally from protocolSelection.
    { code: "liquidity_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "slippage_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
    { code: "cost_available", status: GUARDRAIL_STATUS_NOT_EVALUATED },
  ];

  // Static candidate protocols (Step 12C) — metadata only, NOT a recommendation;
  // status stays not_evaluated and no protocol is named.
  const candidateProtocolIds = getProtocolCandidatesForSelection("liquid_staking", "SOL").map((c) => c.id);

  // Selection defaults to not_evaluated (no data source). The JitoSOL READ-ONLY
  // beta (Step 13G) may surface an APPROVED protocol to review when its flag is
  // on and the input is idle SOL above the minimum. This is a review-only
  // recommendation: it never creates a transaction, requests a signature, or
  // moves funds. Beta OFF → the not_evaluated rollback path below is unchanged.
  let protocolSelection: ProtocolSelection = notEvaluatedProtocolSelection(
    ["missing_apy_data", "missing_tvl_data", "missing_risk_data", "missing_lockup_data"],
    candidateProtocolIds
  );
  let protocolSelectionDisplay: SuggestionReviewDetails["protocolSelectionDisplay"] | undefined;
  let safetyNotesOverride: ReviewSafetyNote[] | undefined;
  let routeEvaluationDisplay: SuggestionReviewDetails["routeEvaluation"] | undefined;
  let externalLink: SuggestionReviewDetails["externalLink"] | undefined;
  let otherProtocolsToReview: SuggestionReviewDetails["otherProtocolsToReview"] | undefined;

  if (isJitoSolBetaReadOnlyEnabled()) {
    const betaSelection = selectJitoSolReadOnlyBeta({
      assetSymbol: "SOL",
      eligibleAmountSol: eligibleSol,
      eligibleAmountUsd: eligibleValueUsd,
      asOf: new Date(generatedAt).toISOString(),
    });
    if (betaSelection.status === "selected") {
      protocolSelection = selectedProtocolSelection({
        protocolId: betaSelection.selectedProtocolId as string,
        protocolName: betaSelection.selectedProtocolName as string,
        lstSymbol: betaSelection.selectedLstSymbol ?? JITOSOL_BETA_LST_SYMBOL,
        strategyType: "liquid_staking",
        evaluatedAt: new Date(generatedAt).toISOString(),
        dataSources: ["Verified source data"],
      });
      protocolSelectionDisplay = getJitoSolBetaProtocolSelectionDisplay();
      // Read-only route/liquidity/slippage evaluation (Step 13I). Direct protocol
      // stake → route cost reviewed; DEX liquidity/slippage not applicable. No tx.
      routeEvaluationDisplay = getJitoSolBetaRouteEvaluationDisplay({
        inputAmountSol: Math.round(eligibleSol * 10000) / 10000,
        checkedAt: new Date(generatedAt).toISOString(),
      });
      // Read-only external handoff (Step 13J): a user-click link to Jito's staking
      // page in a new tab. Never auto-opened, never a transaction/signature.
      externalLink = { ...getJitoSolExternalStakingLink(), ctaLabel: "Stake SOL" };
      // Read-only "alternatives to review" (Steps 14L/14M/14N): approved mSOL, JupSOL, and
      // bSOL are shown for review only alongside the selected JitoSOL. None is
      // selected/winner and none has an execution path. Freshness is relative to
      // generation time; each display self-labels stale ("Evidence needs refresh") if its
      // evidence has lapsed.
      otherProtocolsToReview = [
        buildMsolReadOnlyReviewCandidateDisplay({ checkedAt: new Date(generatedAt).toISOString() }),
        buildJupsolReadOnlyReviewCandidateDisplay({ checkedAt: new Date(generatedAt).toISOString() }),
        buildBsolReadOnlyReviewCandidateDisplay({ checkedAt: new Date(generatedAt).toISOString() }),
        // Step 14T — Jupiter Native Stake as a "Baseline to review" (not an LST; native
        // stake account). Review-only; never selected/winner; no execution path.
        buildNativeStakingReviewCandidateDisplay({ checkedAt: new Date(generatedAt).toISOString() }),
      ];
      // Read-only recommendation copy — never implies a transaction/signature.
      safetyNotesOverride = [
        { kind: "no_auto_move", text: "WealthSmith does not move funds for you." },
        { kind: "informational", text: "You choose whether to continue externally." },
        { kind: "no_transaction", text: "No transaction is created from this suggestion." },
        { kind: "no_signature", text: "No wallet signature is requested." },
      ];
    }
  }

  const reviewDetails = buildReviewDetails({
    category: "staking",
    actionKind: "review_only",
    guardrails,
    protocolSelection,
    // Name the selected protocol in the modal title, matching the card ("Stake SOL on Jito").
    ...(protocolSelection.status === "selected" && protocolSelection.selectedProtocolName ? { title: `Stake SOL on ${protocolSelection.selectedProtocolName}` } : {}),
    ...(protocolSelectionDisplay ? { protocolSelectionDisplay } : {}),
    ...(safetyNotesOverride ? { safetyNotesOverride } : {}),
    ...(routeEvaluationDisplay ? { routeEvaluationDisplay } : {}),
    ...(externalLink ? { externalLink } : {}),
    ...(otherProtocolsToReview ? { otherProtocolsToReview } : {}),
    metrics: [
      metric("Liquid SOL", Math.round(totalLiquidSol * 10000) / 10000, "token_amount", "SOL"),
      metric("SOL operating reserve", SOL_FEE_RESERVE, "token_amount", "SOL"),
      metric("SOL eligible for staking", Math.round(eligibleSol * 10000) / 10000, "token_amount", "SOL"),
      usdMetric("Eligible SOL value", eligibleValueUsd),
    ],
    involvedAssets: [
      { symbol: "SOL", valueUsd: eligibleValueUsd, amount: eligibleSol, role: "liquid_sol", mint: "So11111111111111111111111111111111111111112", icon: "assets/icons/token/sol.svg" },
    ],
    calculations: [
      {
        label: "Eligible SOL",
        formula: "liquid SOL − fee reserve",
        currentValue: totalLiquidSol,
        threshold: SOL_FEE_RESERVE,
        difference: eligibleSol,
        unit: "SOL",
      },
    ],
  });

  return {
    id: STAKING_SUGGESTION_ID,
    category: "staking",
    reason_codes: ["idle_sol", "sol_not_staked", "liquid_sol_available"],

    title_key: "suggestion.staking.title",
    description_key: "suggestion.staking.description",

    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false, // set only by selectTopPick

    amount: {
      valueUsd: eligibleValueUsd,
      label: "Eligible SOL value",
    },
    // Card action line: the token amount to stake (e.g. "Stake 12.4 SOL"), matching the JUP staking card.
    // The `amount`/USD value still drive the Review modal's Key metrics.
    impactTextOverride: `Stake ${Number(eligibleSol.toFixed(4)).toLocaleString("en-US", { maximumFractionDigits: 4 })} SOL`,
    // Token side of the review (no protocol chosen — that's a later step).
    from: { symbol: "SOL", bucket: "crypto" },

    // A staking protocol WILL be chosen once real data exists (APY/TVL/risk/
    // withdrawal); no data source yet, so selection stays not_evaluated.
    protocolSelection,
    reviewDetails,

    scores: {
      // Useful but lower priority than buffer/rebalance (category rank handles
      // ordering); modest fixed urgency, decent efficiency.
      impact: Math.min(eligibleValueUsd / totalPricedUsd, 1),
      urgency: 0.35,
      efficiency: 0.6,
    },
    guardrails,

    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };
}

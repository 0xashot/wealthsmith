/**
 * jupStakingSuggestion — Step 24A. The deterministic, PRODUCTION "Stake JUP on Jupiter" rule (Staking category,
 * a SEPARATE card from SOL staking — never aggregated with SOL). Pure over SuggestionEngineInputs: no
 * fetching, no pricing, no AI. It recognizes JUP by EXACT canonical mint + token program (via the
 * governed ownership registry), runs the deterministic selector over the governed Jupiter product, and
 * emits ONE card only when the selector returns `recommended`.
 *
 * READ-ONLY: no transaction is constructed/simulated/signed/submitted; there is NO external execution
 * CTA. No APY is invented (Jupiter JUP rewards are variable → the card/modal disclose "variable" and
 * show no number). The protocol is chosen HERE (deterministically), never by the frontend or Smith AI.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import type { SuggestionEngineInputs } from "./engineInputs";
import type { EngineSuggestion, SuggestionGuardrail } from "./engineTypes";
import { SUGGESTION_ENGINE_VERSION, MIN_STAKING_SUGGESTION_USD } from "./engineThresholds";
import { selectedProtocolSelection } from "./protocolSelection";
import { buildReviewDetails, usdMetric, metric } from "./suggestionReviewDetails";
import { resolveAssetOwnerForPosition, JUP_MINT, TOKEN_PROGRAM_ID } from "./productAssetOwnership";
import { assessJupStaking, type JupStakingCandidateContext } from "./jupStakingSelection";
import { getApprovedJupStakingProduct } from "./jupStakingProductRegistry";
import {
  SUGGESTION_JUP_STAKING_TITLE,
  SUGGESTION_JUP_STAKING_DESCRIPTION,
  SUGGESTION_JUP_STAKING_ACTION,
  SUGGESTION_JUP_STAKING_REWARDS_VARIABLE,
  SUGGESTION_JUP_STAKING_WHY_JUPITER,
} from "../state/approvedCopy";

/** Stable suggestion ID. */
export const JUP_STAKING_SUGGESTION_ID = "staking_jup";

/** Compact JUP amount: whole amounts drop the ".00" ("650"); fractional keep up to 2dp ("461.54"). */
function fmtJup(n: number): string {
  return Number.isInteger(n)
    ? n.toLocaleString("en-US")
    : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * A direct-wallet JUP token holding by EXACT canonical mint + jup_staking ownership. LST/stake/protocol
 * JUP variants (JupSOL is a DIFFERENT mint/identity) never match; unknown/spoofed mints never match.
 */
function isDirectWalletJup(p: WalletPosition): boolean {
  return (
    p.mint === JUP_MINT &&
    resolveAssetOwnerForPosition(p) === "jup_staking" &&
    p.source === "wallet" &&
    p.type === "token"
  );
}

/**
 * Trigger: funded Safety Buffer ∧ pricing ∧ a priced total ∧ a direct-wallet JUP holding that the
 * governed selector recommends. Anything missing (or any non-`recommended` selector status) → null.
 */
export function deriveJupStakingSuggestion(
  inputs: SuggestionEngineInputs,
  generatedAt: number
): EngineSuggestion | null {
  const sb = inputs.safetyBuffer;
  if (!sb || !sb.fullyFunded) return null;
  if (!inputs.dataQuality.hasPricing) return null;

  const totalPricedUsd = inputs.value.totalUsd;
  if (totalPricedUsd == null || totalPricedUsd <= 0) return null;

  const jup = inputs.positions.find(isDirectWalletJup);
  if (!jup) return null;

  const program = jup.tokenProgram ?? TOKEN_PROGRAM_ID;
  const uiAmount = typeof jup.uiAmount === "number" ? jup.uiAmount : null;
  const priceUsd = typeof jup.priceUsd === "number" ? jup.priceUsd : null;
  const valueUsd = typeof jup.valueUsd === "number" ? jup.valueUsd : uiAmount != null && priceUsd != null ? uiAmount * priceUsd : null;

  // Deterministic per-candidate context. Locked/vesting/borrowed/protocol-held/already-staked JUP is
  // never a direct-wallet `token` row, so those exclusions are structurally false here; the selector
  // still models them for the fixture matrix. Conflict is structurally false (ownership keeps JUP out of
  // Rebalance/Trim); an unrelated SOL/USDC/BONK/WIF suggestion must NOT suppress JUP staking.
  const ctx: JupStakingCandidateContext = {
    exactMintMatch: jup.mint === JUP_MINT,
    tokenProgramApproved: program === TOKEN_PROGRAM_ID && resolveAssetOwnerForPosition(jup) === "jup_staking",
    directWallet: jup.source === "wallet" && jup.type === "token",
    transferableAmount: uiAmount != null && uiAmount > 0 ? uiAmount : null,
    locked: false,
    vesting: false,
    borrowed: false,
    protocolHeld: false,
    alreadyStaked: false,
    priceFresh: priceUsd != null,
    valueUsd,
    minimumUsd: MIN_STAKING_SUGGESTION_USD,
    bufferSatisfied: sb.fullyFunded === true,
    higherPriorityConflict: false,
    portfolioComplete: inputs.dataQuality.hasWalletData && inputs.dataQuality.hasPricing && inputs.value.anyUnpriced !== true,
  };

  const selection = assessJupStaking(ctx, generatedAt);
  if (selection.status !== "recommended") return null;

  const product = getApprovedJupStakingProduct();
  if (!product) return null; // selector already guaranteed this; belt-and-suspenders fail-closed.

  const amount = uiAmount as number;
  const value = valueUsd as number;
  const iso = new Date(generatedAt).toISOString();

  // Guardrails: exact-identity + custody + governed-product checks are CHECKED; swap-route checks are
  // NOT APPLICABLE (JUP staking is not a swap-route recommendation) — never "not evaluated".
  const guardrails: SuggestionGuardrail[] = [
    { code: "asset_identity", status: "passed" },
    { code: "direct_wallet_availability", status: "passed" },
    { code: "transferable_balance", status: "passed" },
    { code: "min_trade_size", status: "passed" },
    { code: "buffer_protection", status: "passed" },
    { code: "protocol_approval", status: "passed" },
    { code: "product_availability", status: "passed" },
    { code: "reward_terms", status: "passed" },
    { code: "unstaking_terms", status: "passed" },
    { code: "asset_conflict", status: "passed" },
    // Swap-route checks do not apply to a staking action.
    { code: "cost_available", status: "not_applicable" },
    { code: "liquidity_available", status: "not_applicable" },
    { code: "slippage_available", status: "not_applicable" },
  ];

  // Deterministic protocol selection from the governed product (the frontend/Smith AI never infer it).
  const protocolSelection = selectedProtocolSelection({
    protocolId: selection.selectedProtocolId as string,
    protocolName: "Jupiter",
    strategyType: "staking",
    evaluatedAt: iso,
    dataSources: ["Governed JUP staking product registry"],
  });

  const rewardsValue =
    selection.estimatedApyPct != null ? `${selection.estimatedApyPct}% (approved)` : SUGGESTION_JUP_STAKING_REWARDS_VARIABLE;

  const reviewDetails = buildReviewDetails({
    category: "staking",
    actionKind: "review_only",
    title: SUGGESTION_JUP_STAKING_TITLE,
    reason: SUGGESTION_JUP_STAKING_DESCRIPTION,
    guardrails,
    protocolSelection,
    metrics: [
      metric("Amount", amount, "token_amount", "JUP"),
      usdMetric("USD value", value),
      metric("Selected protocol", "Jupiter", "count"),
      metric("Product", "JUP Staking", "count"),
      metric("Rewards", rewardsValue, "count"),
      metric("Unstaking", product.unstakingTerms.description ?? "See Jupiter for current terms", "count"),
      metric("Why Jupiter", SUGGESTION_JUP_STAKING_WHY_JUPITER, "count"),
    ],
    involvedAssets: [
      {
        symbol: "JUP",
        name: "Jupiter",
        valueUsd: value,
        amount,
        role: "idle_asset",
        icon: "assets/icons/token/jup.svg",
        mint: JUP_MINT,
      },
    ],
    calculations: [
      {
        label: "Eligible JUP",
        formula: "direct-wallet transferable JUP (locked / vesting / protocol-held / already-staked excluded)",
        currentValue: amount,
        threshold: MIN_STAKING_SUGGESTION_USD,
        unit: "JUP",
      },
    ],
    // READ-ONLY external handoff (like SOL→Jito): a user-click link to Jupiter's own staking page in a new
    // tab. WealthSmith prepares/simulates/signs/submits NOTHING — the sticky modal footer's primary button
    // ("Stake JUP") only opens the provider page; the aria label states no transaction is prepared.
    externalLink: {
      label: "Jupiter",
      url: "https://jup.ag/stake",
      ctaLabel: "Stake JUP",
      secondaryLabel: "Cancel",
      opensInNewTab: true,
    },
  });

  return {
    id: JUP_STAKING_SUGGESTION_ID,
    category: "staking",
    reason_codes: ["idle_assets"],

    title_key: "suggestion.jup_staking.title",
    description_key: "suggestion.jup_staking.description",

    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false, // set only by selectTopPick

    amount: { valueUsd: value, label: "JUP eligible to stake" },
    from: { symbol: "JUP", mint: JUP_MINT },

    // Deterministic, fully-resolved card copy (Staking category names SOL by default; these override it).
    titleOverride: SUGGESTION_JUP_STAKING_TITLE,
    descriptionOverride: SUGGESTION_JUP_STAKING_DESCRIPTION,
    impactTextOverride: SUGGESTION_JUP_STAKING_ACTION.replace("{amount}", fmtJup(amount)),

    protocolSelection,
    reviewDetails,

    scores: {
      impact: Math.min(value / totalPricedUsd, 1),
      urgency: 0.35,
      efficiency: 0.6,
    },
    guardrails,

    engine_version: SUGGESTION_ENGINE_VERSION,
    timestamp: generatedAt,
  };
}

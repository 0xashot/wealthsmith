/**
 * stableYieldTestingFixtures — Step 16H-C. Deterministic, INJECTED Stable Yield presentation fixtures
 * for the /testing page (and the fixture-check runner). Each fixture builds a synthetic Step 16G plan
 * decision → Step 16H-A suggestion → Step 16H-B card/review presentation → the shared SuggestionCardState.
 * It NEVER mutates the production registry, fetches data, calculates finance, or enables execution. The
 * `non_render` fixtures deliberately violate the presentation contract to prove the UI fails closed.
 */
import type { SuggestionCardState } from "../types/dashboard";
import type { EngineSuggestion } from "./engineTypes";
import type { YieldStrategyRegistryEntry } from "./yieldStrategyRegistryTypes";
import type { YieldStrategyEligibilitySet } from "./yieldStrategyEligibilityTypes";
import type { YieldStrategyComparisonSet } from "./yieldStrategyComparisonTypes";
import type { YieldStrategyEligibleCapitalSnapshot } from "./yieldStrategyPositionTypes";
import type { YieldStrategyProductCapacitySnapshot } from "./yieldStrategyProductCapacity";
import type { StableYieldSuggestionApyProvenance } from "./yieldStrategyPlanSuggestionTypes";
import type { StableYieldReviewPresentation } from "./yieldStrategyPlanPresentationTypes";
import { buildYieldStrategyPlanDecision } from "./yieldStrategyPlan";
import { buildStableYieldPlanSuggestion } from "./yieldStrategyPlanSuggestion";
import { buildStableYieldPlanPresentation } from "./yieldStrategyPlanPresentation";
import { toSuggestionCard } from "./toSuggestionCard";

export const STABLE_YIELD_TESTING_FIXTURES_EXIST = true;
export const STABLE_YIELD_TESTING_FIXTURES_USE_INJECTED_DATA = true;
export const STABLE_YIELD_TESTING_FIXTURES_MUTATE_REGISTRY = false;

const T = "2026-07-16T00:00:00.000Z";
const OWNER = "OwnerTest1111111111111111111111111111111111";

type Entry = YieldStrategyRegistryEntry;
type Cap = YieldStrategyProductCapacitySnapshot;
const approvedEntry = (o: Partial<Entry> = {}): Entry => ({ schemaVersion: "1.0.0", registryVersion: "1.0.0", strategyId: "syn", displayName: "USDC Vault", protocolId: "kamino", protocolDisplayName: "Kamino", strategyType: "lending", principalAsset: "USDC", supportedLane: "safety_buffer_yield", riskLane: "buffer_eligible", lifecycle: "approved", officialUrl: "https://app.kamino.finance", documentationUrl: "https://docs.kamino.finance", address: "ADDR", marketDataEvaluated: false, eligibilityEvaluated: false, comparisonEvaluated: false, suggestionGenerated: false, transactionsEnabled: false, walletSignatureRequired: false, notes: [], ...o } as Entry) as Entry;
const withOverride = (base: Entry, o: Partial<Entry>): Entry => ({ ...base, ...o });
const leaderPos = (status: string) => ({ lane: "buffer", held: status.startsWith("leader_held"), matchedPositionIds: [], positionCount: 0, status, warnings: [], blockers: [] });
const mkCapacity = (o: Partial<Cap> = {}): Cap => ({ schemaVersion: "1.0.0", policyId: "yield_strategy_product_capacity_v1", policyVersion: "1.0.0", strategyId: "syn_ex", protocolId: "kamino", productAddress: "ADDR_EX", principalAssetId: "USDC", capacityMode: "explicit_remaining_capacity", acceptingDeposits: true, remainingDepositCapacityUsd: 100000, sourceId: "cap_src", provenanceKind: "documented_source", browserFetched: false, fetchedAt: T, checkedAt: T, maximumAgeMs: 3600000, ageMs: 0, status: "complete", warnings: [], blockers: [], productSelected: false, amountSelected: false, planGenerated: false, suggestionGenerated: false, transactionsEnabled: false, walletSignatureRequired: false, ...o } as Cap);
interface CapOpts { bufferCap?: number; excessCap?: number; directBuffer?: number; surplus?: number; current?: number; maxCombined?: number; liquid?: number; leaderPos?: string; }
const mkCapital = (o: CapOpts = {}): YieldStrategyEligibleCapitalSnapshot => ({ schemaVersion: "1.0.0", policyId: "yield_strategy_capital_v1", policyVersion: "1.0.0", ownerAddress: OWNER, checkedAt: T, status: "ready", requiredBufferUsd: 1000, directWalletEligibleBufferUsd: o.directBuffer ?? 1500, existingEligibleBufferYieldUsd: 0, currentEligibleBufferUsd: o.current ?? 1500, bufferShortfallUsd: 0, canonicalBufferSurplusUsd: o.surplus ?? 500, bufferComplete: true, vaultAllocationPct: 0.7, walletAllocationPct: 0.3, allowedBufferYieldUsd: 700, requiredWalletFloorUsd: 300, remainingBufferYieldCapacityUsd: 700, directLiquidUsdcUsd: o.liquid ?? 5000, rawBufferYieldCapitalUsd: o.bufferCap ?? 0, bufferYieldEligibleCapitalUsd: o.bufferCap ?? 0, bufferYieldMinimumPolicyAvailable: false, rawExcessYieldCapitalUsd: o.excessCap ?? 0, excessYieldEligibleCapitalUsd: o.excessCap ?? 0, excessYieldMinimumUsd: 250, excessYieldMeetsMinimum: (o.excessCap ?? 0) >= 250, maximumCombinedSourceCapitalUsd: o.maxCombined ?? ((o.bufferCap ?? 0) + (o.excessCap ?? 0)), sharedSourceOverlapPossible: false, sharedSourceOverlapUsd: 0, bufferLeaderPositionStatus: leaderPos("no_comparison_leader"), excessLeaderPositionStatus: leaderPos(o.leaderPos ?? "no_comparison_leader"), comparisonPerformed: false, productSelected: false, amountSelected: false, planGenerated: false, suggestionGenerated: false, updatesProductOutput: false, transactionsEnabled: false, walletSignatureRequired: false, blockers: [], warnings: [], notes: [] } as unknown as YieldStrategyEligibleCapitalSnapshot);
const laneComp = (lane: string, o: { status?: string; leader?: string; score?: number; reason?: string }) => ({ schemaVersion: "1.0.0", policyId: "yield_strategy_comparison_v1", policyVersion: "1.0.0", lane, status: o.status ?? "empty_eligible_set", checkedAt: T, candidateScorecards: [], orderedStrategyIds: [], ...(o.leader ? { comparisonLeaderStrategyId: o.leader } : {}), ...(o.score !== undefined ? { comparisonLeaderScore: o.score } : {}), leaderSelectionReason: o.reason ?? "none_empty_set", tieAnalysis: {}, sensitivityAnalysis: {}, walletPositionsEvaluated: false, userCapitalEvaluated: false, amountCalculated: false, planGenerated: false, suggestionGenerated: false, updatesProductOutput: false, transactionsEnabled: false, walletSignatureRequired: false, warnings: [], blockers: [], notes: [] });
const comparison = (buffer: { status?: string; leader?: string; score?: number; reason?: string }, excess: { status?: string; leader?: string; score?: number; reason?: string }) => ({ schemaVersion: "1.0.0", policyId: "yield_strategy_comparison_v1", policyVersion: "1.0.0", checkedAt: T, bufferComparison: laneComp("buffer", buffer), excessComparison: laneComp("excess", excess), ...(buffer.leader ? { bufferComparisonLeaderStrategyId: buffer.leader } : {}), ...(excess.leader ? { excessComparisonLeaderStrategyId: excess.leader } : {}), emptyApprovedSet: false, emptyBufferEligibleSet: false, emptyExcessEligibleSet: false, comparisonPerformed: true, rankingPerformed: true, walletPositionsEvaluated: false, userCapitalEvaluated: false, amountCalculated: false, planGenerated: false, suggestionGenerated: false, updatesProductOutput: false, transactionsEnabled: false, walletSignatureRequired: false, warnings: [], blockers: [], notes: [] } as unknown as YieldStrategyComparisonSet);
const elig = (buffer: string[], excess: string[]) => ({ bufferEligibleStrategyIds: buffer, excessEligibleStrategyIds: excess } as unknown as YieldStrategyEligibilitySet);

interface ExcessOpts { entry?: Partial<Entry>; cap?: CapOpts; capacity?: Partial<Cap>; leaderPos?: string; }
const excessDecision = (o: ExcessOpts = {}) => buildYieldStrategyPlanDecision({
  ownerAddress: OWNER, checkedAt: T,
  registry: [withOverride(approvedEntry({ strategyId: "syn_ex", displayName: "USDC Yield Vault", supportedLane: "excess_usdc_yield", riskLane: "excess_only", strategyType: "managed_vault", address: "ADDR_EX" }), o.entry ?? {})],
  eligibilitySet: elig([], ["syn_ex"]),
  comparisonSet: comparison({ status: "empty_eligible_set" }, { status: "complete", leader: "syn_ex", score: 82, reason: "highest_stable_score" }),
  capitalSnapshot: mkCapital({ excessCap: 500, directBuffer: 1500, surplus: 500, current: 1500, maxCombined: 500, leaderPos: o.leaderPos ?? "leader_not_held", ...o.cap }),
  productCapacitySet: [mkCapacity({ strategyId: "syn_ex", productAddress: "ADDR_EX", ...o.capacity })],
});
const bufferDecision = (leader = "leader_not_held") => buildYieldStrategyPlanDecision({
  ownerAddress: OWNER, checkedAt: T,
  registry: [withOverride(approvedEntry({ strategyId: "syn_buf", displayName: "USDC Lending Market", supportedLane: "safety_buffer_yield", riskLane: "buffer_eligible", strategyType: "lending", address: "ADDR_BUF" }), {})],
  eligibilitySet: elig(["syn_buf"], []),
  comparisonSet: comparison({ status: "complete", leader: "syn_buf", score: 88, reason: "highest_stable_score" }, { status: "empty_eligible_set" }),
  capitalSnapshot: (() => { const c = mkCapital({ bufferCap: 700, directBuffer: 1000, surplus: 0, current: 1000, maxCombined: 700 }); (c as unknown as { bufferLeaderPositionStatus: unknown }).bufferLeaderPositionStatus = leaderPos(leader); return c; })(),
  productCapacitySet: [mkCapacity({ strategyId: "syn_buf", productAddress: "ADDR_BUF" })],
  bufferMinimumOverrideUsd: 50,
});

const APY_LIVE: StableYieldSuggestionApyProvenance = { netApyPct: 5.24, apyDefinition: "net", apyWindow: "current", sourceId: "kamino_api", sourceLabel: "Kamino API", provenanceKind: "live_protocol_api", checkedAt: "2026-07-16 00:00 UTC" };
const APY_FALLBACK: StableYieldSuggestionApyProvenance = { netApyPct: 4.80, apyDefinition: "net", apyWindow: "current", sourceId: "provider", sourceLabel: "Approved provider", provenanceKind: "approved_fallback" };
const APY_PROVIDED: StableYieldSuggestionApyProvenance = { netApyPct: 3.10, apyDefinition: "net", apyWindow: "current", sourceId: "src" };

function suggestionFor(decision: ReturnType<typeof excessDecision>, apy?: StableYieldSuggestionApyProvenance, topPick = false): EngineSuggestion | null {
  const s = buildStableYieldPlanSuggestion(decision, { generatedAt: 1_000_000, ...(apy ? { apyProvenance: apy } : {}) }).suggestion;
  if (!s) return null;
  return topPick ? { ...s, is_top_pick: true } : s;
}

export type StableYieldTestingGroup = "card" | "review" | "non_render";
export interface StableYieldTestingFixture {
  id: string;
  group: StableYieldTestingGroup;
  label: string;
  description: string;
  suggestion: EngineSuggestion | null;
  card: SuggestionCardState | null;
  review: StableYieldReviewPresentation | null;
}

function fx(id: string, group: StableYieldTestingGroup, label: string, description: string, suggestion: EngineSuggestion | null): StableYieldTestingFixture {
  const pres = suggestion ? buildStableYieldPlanPresentation(suggestion) : { card: null, review: null };
  const card = suggestion && pres.card ? toSuggestionCard(suggestion) : null;
  // A card only renders as a Stable Yield card when the presentation succeeded.
  return { id, group, label, description, suggestion, card: pres.card ? card : null, review: pres.review };
}

// A valid suggestion whose meta is then tampered to violate the contract (for fail-closed fixtures).
function tamperedSuggestion(patch: Record<string, unknown>): EngineSuggestion {
  const base = suggestionFor(excessDecision(), APY_LIVE)!;
  return { ...base, stableYieldPlan: { ...base.stableYieldPlan!, ...patch } } as EngineSuggestion;
}

export const STABLE_YIELD_TESTING_FIXTURES: StableYieldTestingFixture[] = [
  // ---- Card states ----
  fx("sy_card_excess_start", "card", "Excess · start new position", "Excess lane, no existing position; live APY.", suggestionFor(excessDecision(), APY_LIVE)),
  fx("sy_card_excess_add", "card", "Excess · add to existing", "Excess lane, existing leader position detected.", suggestionFor(excessDecision({ leaderPos: "leader_held" }), APY_LIVE)),
  fx("sy_card_buffer_start", "card", "Buffer · start new position", "Buffer lane (minimum injected); approved-fallback APY.", suggestionFor(bufferDecision(), APY_FALLBACK)),
  fx("sy_card_buffer_add", "card", "Buffer · add to existing", "Buffer lane, existing position; APY unavailable.", suggestionFor(bufferDecision("leader_held"))),
  fx("sy_card_top_pick", "card", "Top Pick treatment", "The card marked as the Top Pick.", suggestionFor(excessDecision(), APY_LIVE, true)),
  fx("sy_card_non_top_pick", "card", "Non-Top-Pick", "A normal (non-Top-Pick) card.", suggestionFor(excessDecision(), APY_LIVE)),
  fx("sy_card_apy_live", "card", "APY · live protocol/API", "APY sourced from a live protocol API.", suggestionFor(excessDecision(), APY_LIVE)),
  fx("sy_card_apy_fallback", "card", "APY · approved fallback", "APY from an approved fallback source.", suggestionFor(excessDecision(), APY_FALLBACK)),
  fx("sy_card_apy_provided", "card", "APY · provided (no source)", "APY value present without a declared source class.", suggestionFor(excessDecision(), APY_PROVIDED)),
  fx("sy_card_apy_unavailable", "card", "APY · unavailable", "No APY supplied → canonical unavailable state.", suggestionFor(excessDecision())),
  fx("sy_card_cap_explicit", "card", "Capacity · explicit remaining", "Explicit remaining deposit capacity.", suggestionFor(excessDecision({ capacity: { remainingDepositCapacityUsd: 100000 } }), APY_LIVE)),
  fx("sy_card_cap_uncapped", "card", "Capacity · verified uncapped", "Verified uncapped (bounded by the eligible amount).", suggestionFor(excessDecision({ capacity: { capacityMode: "verified_uncapped", remainingDepositCapacityUsd: undefined } }), APY_LIVE)),
  fx("sy_card_large_amount", "card", "Large amount", "A large selected amount.", suggestionFor(excessDecision({ cap: { excessCap: 300000, surplus: 300000, directBuffer: 301000, current: 301000, maxCombined: 300000, liquid: 500000 }, capacity: { remainingDepositCapacityUsd: 250000 } }), APY_LIVE)),
  fx("sy_card_amount_cents", "card", "Amount with cents", "A selected amount with cents.", suggestionFor(excessDecision({ cap: { excessCap: 5000, surplus: 5000, directBuffer: 6000, current: 6000, maxCombined: 5000, liquid: 50000 }, capacity: { remainingDepositCapacityUsd: 1234.56 } }), APY_LIVE)),
  fx("sy_card_long_product", "card", "Long product name", "A very long product/strategy display name.", suggestionFor(excessDecision({ entry: { displayName: "Very Long Managed USDC Stable Yield Vault Product Name For Overflow Testing" } }), APY_LIVE)),
  fx("sy_card_long_protocol", "card", "Long protocol name", "A very long protocol display name.", suggestionFor(excessDecision({ entry: { protocolDisplayName: "A Very Long Protocol Display Name For Overflow Testing" } }), APY_LIVE)),

  // ---- Review states ----
  fx("sy_review_excess", "review", "Excess review", "Excess-lane review drawer.", suggestionFor(excessDecision(), APY_LIVE)),
  fx("sy_review_buffer", "review", "Buffer review", "Buffer-lane review drawer.", suggestionFor(bufferDecision(), APY_FALLBACK)),
  fx("sy_review_existing", "review", "Existing-position review", "Add-to-existing review context.", suggestionFor(excessDecision({ leaderPos: "leader_held" }), APY_LIVE)),
  fx("sy_review_new", "review", "New-position review", "Start-new-position review context.", suggestionFor(excessDecision(), APY_LIVE)),
  fx("sy_review_full_apy", "review", "Full APY provenance", "APY with source label + checked-at.", suggestionFor(excessDecision(), APY_LIVE)),
  fx("sy_review_apy_unavailable", "review", "Review · APY unavailable", "Review with no APY.", suggestionFor(excessDecision())),
  fx("sy_review_cap_explicit", "review", "Review · explicit capacity", "Explicit remaining capacity in review.", suggestionFor(excessDecision({ capacity: { remainingDepositCapacityUsd: 100000 } }), APY_LIVE)),
  fx("sy_review_cap_uncapped", "review", "Review · verified uncapped", "Verified-uncapped capacity in review.", suggestionFor(excessDecision({ capacity: { capacityMode: "verified_uncapped", remainingDepositCapacityUsd: undefined } }), APY_LIVE)),
  fx("sy_review_min_max", "review", "Minimum & maximum present", "Effective minimum + maximum shown.", suggestionFor(excessDecision(), APY_LIVE)),
  fx("sy_review_identifier", "review", "Technical identifier present", "Exact product address shown in review.", suggestionFor(excessDecision(), APY_LIVE)),
  fx("sy_review_top_pick", "review", "Top Pick review", "Review drawer with a Top Pick badge.", suggestionFor(excessDecision(), APY_LIVE, true)),

  // ---- Fail-closed (non-render) states ----
  fx("sy_nonrender_invalid_lane", "non_render", "Invalid presentation → no card", "A corrupted lane fails closed (no card).", tamperedSuggestion({ lane: "bogus" })),
  fx("sy_nonrender_missing", "non_render", "Missing presentation → no card", "A suggestion with no stableYieldPlan meta.", (() => { const s = suggestionFor(excessDecision(), APY_LIVE)!; return { ...s, stableYieldPlan: undefined } as EngineSuggestion; })()),
  fx("sy_nonrender_capacity", "non_render", "Unsupported capacity → no card", "A paused/full capacity state on a 'ready' suggestion.", tamperedSuggestion({ capacityMode: "product_full" })),
  fx("sy_nonrender_execution", "non_render", "Execution contamination → no card", "An execution flag on the meta fails closed.", tamperedSuggestion({ transactionsEnabled: true })),
];

export const STABLE_YIELD_TESTING_CARD_FIXTURES = STABLE_YIELD_TESTING_FIXTURES.filter((f) => f.group === "card");
export const STABLE_YIELD_TESTING_REVIEW_FIXTURES = STABLE_YIELD_TESTING_FIXTURES.filter((f) => f.group === "review");
export const STABLE_YIELD_TESTING_NON_RENDER_FIXTURES = STABLE_YIELD_TESTING_FIXTURES.filter((f) => f.group === "non_render");

/**
 * yieldStrategyPositionEngine — Step 16F. Deterministic normalization + EXACT registry matching +
 * economic-position deduplication + strategy aggregation + leader-position status for existing Stable
 * Yield positions. It consumes INJECTED read-only records only (never fetches from React), matches ONLY
 * on exact identity (protocol + exact product address + principal asset + mechanic — never name/symbol),
 * never promotes a non-approved product, never mutates the registry, and never double-counts one
 * economic position reported through several technical representations.
 */
import {
  CANONICAL_USDC_MINT,
  YIELD_POSITION_SUPPORTED_PROTOCOLS,
  YIELD_STRATEGY_POSITION_POLICY_ID,
  YIELD_STRATEGY_POSITION_POLICY_VERSION,
  YIELD_STRATEGY_POSITION_SCHEMA_VERSION,
  type ObservedYieldStrategyProduct,
  type YieldStrategyExistingPositionSummary,
  type YieldStrategyLeaderPositionResult,
  type YieldStrategyPosition,
  type YieldStrategyPositionInput,
  type YieldStrategyPositionMechanic,
  type YieldStrategyPositionSet,
  type YieldStrategyPositionValidationResult,
} from "./yieldStrategyPositionTypes";
import { YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS } from "./yieldStrategyMarketDataPolicy";
import { listYieldStrategies } from "./yieldStrategyRegistry";
import type { YieldStrategyRegistryEntry } from "./yieldStrategyRegistryTypes";
import type { YieldStrategyEligibilitySet } from "./yieldStrategyEligibilityTypes";
import type { YieldStrategyComparisonSet } from "./yieldStrategyComparisonTypes";

export const YIELD_STRATEGY_POSITION_NORMALIZATION_EXISTS = true;
export const YIELD_STRATEGY_POSITION_MATCHING_EXISTS = true;
export const YIELD_STRATEGY_POSITION_DEDUPLICATION_EXISTS = true;
export const YIELD_STRATEGY_POSITION_DETECTION_EXISTS = true;

const DEFAULT_MAX_AGE_MS = 60 * 60 * 1000;
const isFiniteNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isIso = (s: unknown): boolean => typeof s === "string" && s.length > 0 && !Number.isNaN(Date.parse(s));

/** Non-yield usage that must NEVER be classified as a Stable Yield position. */
const NON_YIELD_KINDS = new Set(["borrow", "cdp_collateral", "debt", "volatile_lp"]);

function inferMechanic(input: YieldStrategyPositionInput): YieldStrategyPositionMechanic {
  if (input.mechanic && input.mechanic !== "unknown") return input.mechanic;
  switch (input.representation) {
    case "decoded_protocol_account":
    case "protocol_api_position": return "lending_deposit";
    case "direct_vault_share":
    case "farm_staked_vault_share": return "managed_vault_deposit";
    case "liquidity_position": return "stable_liquidity_position";
    default: return "unknown";
  }
}

function economicId(input: YieldStrategyPositionInput, product: string | undefined): string {
  // Key on owner + protocol + share/receipt/account identity — NOT the product address, so that two
  // records claiming the same economic position but DISAGREEING on product address group together and
  // are flagged as a conflict (ambiguous) rather than silently splitting into two positions.
  const identityToken = input.shareMint ?? input.receiptMint ?? input.protocolAccountAddress ?? input.protocolPositionId ?? product ?? "-";
  return `${input.ownerAddress}|${input.protocolId}|${identityToken}`;
}

/** Normalize one injected record into a canonical position (identity + valuation only; no dedup/match). */
export function normalizeYieldStrategyPosition(input: YieldStrategyPositionInput): YieldStrategyPosition {
  const warnings: string[] = [];
  const blockers: string[] = [];
  const notes: string[] = [];
  const checkedAt = input.checkedAt;
  const product = input.productAddress ?? input.vaultAddress ?? input.marketAddress ?? input.reserveAddress ?? input.poolAddress;
  const maximumAgeMs = isFiniteNum(input.maximumAgeMs) ? (input.maximumAgeMs as number) : DEFAULT_MAX_AGE_MS;
  const ageMs = input.fetchedAt && isIso(input.fetchedAt) && isIso(checkedAt) ? Math.max(0, Date.parse(checkedAt) - Date.parse(input.fetchedAt)) : undefined;

  const inScope = YIELD_POSITION_SUPPORTED_PROTOCOLS.includes(input.protocolId);
  if (!inScope) blockers.push("unsupported_protocol");
  if (input.browserFetched === true) blockers.push("browser_fetched");
  if (!input.ownerAddress) blockers.push("owner_missing");

  const positionKind = input.metadata?.positionKind ?? (input.representation === "liquidity_position" ? "stable_liquidity" : "yield_deposit");
  if (NON_YIELD_KINDS.has(positionKind)) { blockers.push("not_a_yield_position"); notes.push(`Protocol usage '${positionKind}' is not a Stable Yield deposit.`); }
  // A stable-liquidity position must have its stable underlying explicitly confirmed (never symbol-inferred).
  if (positionKind === "stable_liquidity" && input.metadata?.stableUnderlyingConfirmed !== true) { warnings.push("stable_underlying_unconfirmed"); }

  let mechanic = inferMechanic(input);
  if (NON_YIELD_KINDS.has(positionKind)) mechanic = "unknown";

  const principalAssetId = input.principalAssetId ?? (input.principalAssetMint === CANONICAL_USDC_MINT || input.underlyingMint === CANONICAL_USDC_MINT ? "USDC" : "unknown");

  // Valuation.
  let valuationStatus: YieldStrategyPosition["valuationStatus"];
  if (input.currentValueUsd === undefined) valuationStatus = "unavailable";
  else if (!isFiniteNum(input.currentValueUsd) || (input.currentValueUsd as number) < 0) { valuationStatus = "invalid"; blockers.push("invalid_value"); }
  else if (ageMs !== undefined && ageMs > maximumAgeMs) valuationStatus = "stale";
  else valuationStatus = "complete";
  if (input.browserFetched === true) valuationStatus = "invalid";

  // Status.
  let status: YieldStrategyPosition["status"];
  if (blockers.length > 0) status = "invalid";
  else if (input.currentValueUsd === undefined && input.rawAmount === undefined && input.shareAmountRaw === undefined) status = "unavailable";
  else if ((isFiniteNum(input.shareAmountRaw) && input.shareAmountRaw === 0) || (isFiniteNum(input.rawAmount) && input.rawAmount === 0)) status = "zero_balance";
  else status = "active";

  return {
    schemaVersion: "1.0.0",
    policyId: YIELD_STRATEGY_POSITION_POLICY_ID,
    policyVersion: "1.0.0",
    positionId: input.protocolPositionId ?? `${input.protocolId}:${product ?? input.protocolAccountAddress ?? input.sourceId}:${input.representation}`,
    economicPositionId: economicId(input, product),
    ownerAddress: input.ownerAddress,
    protocolId: input.protocolId,
    protocolDisplayName: input.protocolId.charAt(0).toUpperCase() + input.protocolId.slice(1),
    mechanic,
    representation: input.representation,
    positionKind,
    status,
    ...(product ? { productAddress: product } : {}),
    ...(input.marketAddress ? { marketAddress: input.marketAddress } : {}),
    ...(input.vaultAddress ? { vaultAddress: input.vaultAddress } : {}),
    ...(input.poolAddress ? { poolAddress: input.poolAddress } : {}),
    ...(input.reserveAddress ? { reserveAddress: input.reserveAddress } : {}),
    ...(input.protocolAccountAddress ? { protocolAccountAddress: input.protocolAccountAddress } : {}),
    ...(input.receiptMint ? { receiptMint: input.receiptMint } : {}),
    ...(input.shareMint ? { shareMint: input.shareMint } : {}),
    ...(input.underlyingMint ? { underlyingMint: input.underlyingMint } : {}),
    principalAssetId,
    ...(input.principalAssetMint ? { principalAssetMint: input.principalAssetMint } : {}),
    ...(isFiniteNum(input.rawAmount) ? { rawAmount: input.rawAmount } : {}),
    ...(isFiniteNum(input.decimals) ? { decimals: input.decimals } : {}),
    ...(isFiniteNum(input.shareAmountRaw) ? { shareAmountRaw: input.shareAmountRaw } : {}),
    ...(isFiniteNum(input.underlyingAmountRaw) ? { underlyingAmountRaw: input.underlyingAmountRaw } : {}),
    ...(isFiniteNum(input.currentValueUsd) && (input.currentValueUsd as number) >= 0 ? { currentValueUsd: input.currentValueUsd } : {}),
    ...(isFiniteNum(input.principalValueUsd) ? { principalValueUsd: input.principalValueUsd } : {}),
    valuationStatus,
    sourceId: input.sourceId,
    ...(input.sourceLabel ? { sourceLabel: input.sourceLabel } : {}),
    ...(input.sourceType ? { sourceType: input.sourceType } : {}),
    provenance: { kind: input.provenanceKind ?? "documented_source", sourceId: input.sourceId, ...(input.sourceLabel ? { sourceLabel: input.sourceLabel } : {}), browserFetched: false, present: !!input.sourceId },
    ...(input.fetchedAt ? { fetchedAt: input.fetchedAt } : {}),
    checkedAt,
    maximumAgeMs,
    ...(ageMs !== undefined ? { ageMs } : {}),
    matchStatus: blockers.length > 0 ? "invalid" : "unmatched",
    countsTowardSafetyBuffer: false,
    countsTowardExcessPositionValue: false,
    comparisonLeaderForBuffer: false,
    comparisonLeaderForExcess: false,
    isDuplicateRepresentation: false,
    warnings,
    blockers,
    notes,
    comparisonPerformed: false,
    capitalEvaluated: false,
    amountSelected: false,
    planGenerated: false,
    suggestionGenerated: false,
    updatesProductOutput: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

/** Strategy-type ↔ position-mechanic compatibility (exact identity still required). */
function mechanicMatchesType(mechanic: YieldStrategyPositionMechanic, strategyType: string): boolean {
  if (mechanic === "unknown") return true; // mechanic unknown falls back to address identity
  const map: Record<string, string> = { lending_deposit: "lending", managed_vault_deposit: "managed_vault", staking_like_vault_deposit: "staking_like_vault", stable_liquidity_position: "stable_liquidity_strategy" };
  return map[mechanic] === strategyType;
}

/** Match one normalized position to an EXACT registry product. Never uses name/symbol/brand. */
export function matchYieldStrategyPosition(position: YieldStrategyPosition, registry: YieldStrategyRegistryEntry[] = listYieldStrategies()): YieldStrategyPosition {
  if (position.blockers.length > 0) return { ...position, matchStatus: "invalid" };
  if (position.positionKind === "borrow" || position.positionKind === "cdp_collateral" || position.positionKind === "debt" || position.positionKind === "volatile_lp") return { ...position, matchStatus: "invalid" };
  const product = position.productAddress;
  if (!product) return { ...position, matchStatus: "unmatched", notes: [...position.notes, "no exact product address to match"] };

  const candidates = registry.filter((e) =>
    e.protocolId === position.protocolId &&
    typeof e.address === "string" && e.address.length > 0 && e.address === product &&
    e.principalAsset === position.principalAssetId &&
    mechanicMatchesType(position.mechanic, e.strategyType) &&
    (position.matchStatus === "invalid" ? false : true),
  );
  const hinted = position["matchedStrategyId" as never] as string | undefined; // not set yet
  void hinted;

  if (candidates.length === 0) return { ...position, matchStatus: "unmatched" };
  if (candidates.length > 1) return { ...position, matchStatus: "ambiguous", blockers: [...position.blockers, "ambiguous_registry_match"] };
  const e = candidates[0];
  return {
    ...position,
    matchStatus: e.lifecycle === "approved" ? "matched_approved" : "matched_nonapproved",
    matchedStrategyId: e.strategyId,
    matchedRegistryLifecycle: e.lifecycle,
    matchedRiskLane: e.riskLane,
  };
}

const SOURCE_RANK: Record<string, number> = { protocol_api_position: 1, decoded_protocol_account: 3, direct_vault_share: 3, farm_staked_vault_share: 3, liquidity_position: 3, receipt_token: 4, wallet_token_fallback: 5, unknown: 6 };
function sourceRank(p: YieldStrategyPosition): number {
  if (p.provenance.kind === "backend_normalized") return 2;
  return SOURCE_RANK[p.representation] ?? 6;
}

export interface BuildYieldStrategyPositionSetInput {
  ownerAddress: string;
  checkedAt: string;
  positions: YieldStrategyPositionInput[];
  registry?: YieldStrategyRegistryEntry[];
  eligibilitySet?: YieldStrategyEligibilitySet;
  comparisonSet?: YieldStrategyComparisonSet;
}

function bufferEligibleNow(strategyId: string | undefined, elig?: YieldStrategyEligibilitySet): boolean {
  return !!strategyId && !!elig && elig.bufferEligibleStrategyIds.includes(strategyId);
}
function excessEligibleNow(strategyId: string | undefined, elig?: YieldStrategyEligibilitySet): boolean {
  return !!strategyId && !!elig && elig.excessEligibleStrategyIds.includes(strategyId);
}

/** Build the full normalized + matched + deduplicated position set with strategy aggregation. */
export function buildYieldStrategyPositionSet(input: BuildYieldStrategyPositionSetInput): YieldStrategyPositionSet {
  const registry = input.registry ?? listYieldStrategies();
  const normalized = input.positions.map((p) => matchYieldStrategyPosition(normalizeYieldStrategyPosition({ ...p, checkedAt: input.checkedAt }), registry));

  // ---- Deduplication by economic position id ----
  const groups = new Map<string, YieldStrategyPosition[]>();
  for (const p of normalized) { const g = groups.get(p.economicPositionId) ?? []; g.push(p); groups.set(p.economicPositionId, g); }

  const canonicalEconomicPositions: YieldStrategyPosition[] = [];
  const duplicateRepresentations: YieldStrategyPosition[] = [];
  const conflictingPositions: YieldStrategyPosition[] = [];
  const processedNormalized: YieldStrategyPosition[] = [];

  for (const [, group] of groups) {
    if (group.length === 1) { canonicalEconomicPositions.push(group[0]); processedNormalized.push(group[0]); continue; }
    // Conflict detection (exact raw units / product / owner / asset).
    const ownerConflict = new Set(group.map((p) => p.ownerAddress)).size > 1;
    const productConflict = new Set(group.map((p) => p.productAddress ?? "")).size > 1;
    const rawConflict = new Set(group.filter((p) => isFiniteNum(p.shareAmountRaw)).map((p) => p.shareAmountRaw)).size > 1 || new Set(group.filter((p) => isFiniteNum(p.rawAmount)).map((p) => p.rawAmount)).size > 1;
    const assetConflict = new Set(group.map((p) => p.principalAssetId)).size > 1;
    if (ownerConflict) {
      for (const p of group) { const m = { ...p, matchStatus: "invalid" as const, blockers: [...p.blockers, "ownership_conflict"] }; conflictingPositions.push(m); processedNormalized.push(m); }
      continue;
    }
    if (productConflict || rawConflict || assetConflict) {
      for (const p of group) { const m = { ...p, matchStatus: "ambiguous" as const, blockers: [...p.blockers, "duplicate_position_conflict"] }; conflictingPositions.push(m); processedNormalized.push(m); }
      continue;
    }
    // No conflict → choose canonical by source priority; the rest are duplicate representations.
    const sorted = [...group].sort((a, b) => sourceRank(a) - sourceRank(b));
    const canonical = sorted[0];
    canonicalEconomicPositions.push(canonical); processedNormalized.push(canonical);
    for (const dup of sorted.slice(1)) { const m = { ...dup, isDuplicateRepresentation: true, duplicateOfEconomicPositionId: canonical.economicPositionId }; duplicateRepresentations.push(m); processedNormalized.push(m); }
  }

  // ---- Buffer / excess / leader flags on canonical positions ----
  const bufferLeaderId = input.comparisonSet?.bufferComparisonLeaderStrategyId;
  const excessLeaderId = input.comparisonSet?.excessComparisonLeaderStrategyId;
  const withFlags = canonicalEconomicPositions.map((p) => {
    const fresh = p.valuationStatus === "complete";
    const bufferFresh = fresh && (p.ageMs === undefined || p.ageMs <= YIELD_STRATEGY_BUFFER_LANE_MAX_AGE_MS);
    const countsBuffer = p.matchStatus === "matched_approved" && p.matchedRiskLane === "buffer_eligible" && bufferFresh && bufferEligibleNow(p.matchedStrategyId, input.eligibilitySet);
    const countsExcess = p.matchStatus === "matched_approved" && fresh && excessEligibleNow(p.matchedStrategyId, input.eligibilitySet);
    return {
      ...p,
      countsTowardSafetyBuffer: countsBuffer,
      countsTowardExcessPositionValue: countsExcess,
      comparisonLeaderForBuffer: p.matchStatus === "matched_approved" && !!bufferLeaderId && p.matchedStrategyId === bufferLeaderId,
      comparisonLeaderForExcess: p.matchStatus === "matched_approved" && !!excessLeaderId && p.matchedStrategyId === excessLeaderId,
    };
  });
  // Reflect flags back into the canonical + processed lists.
  const flagsById = new Map(withFlags.map((p) => [p.positionId + p.economicPositionId, p] as const));
  const canonicalFinal = withFlags;
  const normalizedFinal = processedNormalized.map((p) => flagsById.get(p.positionId + p.economicPositionId) ?? p);

  // ---- Observed undocumented products ----
  const observedUndocumentedProducts: ObservedYieldStrategyProduct[] = [];
  const seenObserved = new Set<string>();
  for (const p of canonicalFinal) {
    if (!p.productAddress) continue;
    if (p.matchStatus === "unmatched" || p.matchStatus === "matched_nonapproved") {
      const key = `${p.protocolId}|${p.productAddress}`;
      if (seenObserved.has(key)) continue;
      seenObserved.add(key);
      observedUndocumentedProducts.push({
        protocolId: p.protocolId, observedProductAddress: p.productAddress, principalAssetId: p.principalAssetId, mechanic: p.mechanic, sourceId: p.sourceId,
        ...(p.fetchedAt ? { firstObservedAt: p.fetchedAt } : {}), checkedAt: input.checkedAt,
        matchingRegistryStrategyIds: registry.filter((e) => e.protocolId === p.protocolId).map((e) => e.strategyId),
        requiresDocumentation: true, autoApproved: false, registryMutated: false,
      });
    }
  }

  // ---- Classification lists + tallies ----
  const idsByStatus = (status: string) => canonicalFinal.filter((p) => p.matchStatus === status).map((p) => p.positionId);
  const tally = (key: (p: YieldStrategyPosition) => string) => { const o: Record<string, number> = {}; for (const p of canonicalFinal) o[key(p)] = (o[key(p)] ?? 0) + 1; return o; };
  const sumVal = (ps: YieldStrategyPosition[]) => { let s = 0; let any = false; for (const p of ps) if (isFiniteNum(p.currentValueUsd)) { s += p.currentValueUsd as number; any = true; } return any ? s : undefined; };

  // ---- Strategy aggregation (canonical only; duplicates never double-counted) ----
  const summaryMap = new Map<string, YieldStrategyExistingPositionSummary>();
  for (const p of canonicalFinal.filter((c) => c.matchStatus !== "ambiguous" && c.matchStatus !== "invalid")) {
    const k = `${p.protocolId}|${p.productAddress ?? "-"}|${p.matchedStrategyId ?? "-"}`;
    let s = summaryMap.get(k);
    if (!s) { s = { ...(p.matchedStrategyId ? { strategyId: p.matchedStrategyId } : {}), protocolId: p.protocolId, ...(p.productAddress ? { exactProductAddress: p.productAddress } : {}), matchStatus: p.matchStatus, ...(p.matchedRegistryLifecycle ? { registryLifecycle: p.matchedRegistryLifecycle } : {}), positionIds: [], economicPositionIds: [], bufferEligibleValueUsd: 0, excessPositionValueUsd: 0, currentlyBufferEligible: false, currentlyExcessEligible: false, isBufferComparisonLeader: false, isExcessComparisonLeader: false, warnings: [], blockers: [] }; summaryMap.set(k, s); }
    s.positionIds.push(p.positionId);
    s.economicPositionIds.push(p.economicPositionId);
    const v = isFiniteNum(p.currentValueUsd) ? (p.currentValueUsd as number) : 0;
    if (p.valuationStatus === "complete") s.freshValueUsd = (s.freshValueUsd ?? 0) + v;
    else if (p.valuationStatus === "stale") s.staleValueUsd = (s.staleValueUsd ?? 0) + v;
    else s.unavailableValueUsd = (s.unavailableValueUsd ?? 0);
    s.currentValueUsd = (s.currentValueUsd ?? 0) + v;
    if (p.countsTowardSafetyBuffer) { s.bufferEligibleValueUsd += v; s.currentlyBufferEligible = true; }
    if (p.countsTowardExcessPositionValue) { s.excessPositionValueUsd += v; s.currentlyExcessEligible = true; }
    if (p.comparisonLeaderForBuffer) s.isBufferComparisonLeader = true;
    if (p.comparisonLeaderForExcess) s.isExcessComparisonLeader = true;
  }

  const anyInvalid = canonicalFinal.some((p) => p.matchStatus === "invalid");
  const anyStale = canonicalFinal.some((p) => p.valuationStatus === "stale" || p.valuationStatus === "unavailable");
  const status: YieldStrategyPositionSet["status"] = input.positions.length === 0 ? "empty" : canonicalFinal.every((p) => p.matchStatus === "invalid") ? "invalid" : anyStale ? "partial" : anyInvalid ? "partial" : "complete";

  return {
    schemaVersion: YIELD_STRATEGY_POSITION_SCHEMA_VERSION,
    policyId: YIELD_STRATEGY_POSITION_POLICY_ID,
    policyVersion: YIELD_STRATEGY_POSITION_POLICY_VERSION,
    ownerAddress: input.ownerAddress,
    checkedAt: input.checkedAt,
    status,
    normalizedPositions: normalizedFinal,
    canonicalEconomicPositions: canonicalFinal,
    duplicateRepresentations,
    conflictingPositions,
    matchedApprovedPositionIds: idsByStatus("matched_approved"),
    matchedNonapprovedPositionIds: idsByStatus("matched_nonapproved"),
    unmatchedPositionIds: idsByStatus("unmatched"),
    ambiguousPositionIds: canonicalFinal.filter((p) => p.matchStatus === "ambiguous").map((p) => p.positionId).concat(conflictingPositions.filter((p) => p.matchStatus === "ambiguous").map((p) => p.positionId)),
    invalidPositionIds: canonicalFinal.filter((p) => p.matchStatus === "invalid").map((p) => p.positionId).concat(conflictingPositions.filter((p) => p.matchStatus === "invalid").map((p) => p.positionId)),
    observedUndocumentedProducts,
    positionsByProtocol: tally((p) => p.protocolId),
    positionsByStrategy: tally((p) => p.matchedStrategyId ?? "unmatched"),
    positionsByMechanic: tally((p) => p.mechanic),
    existingPositionSummaries: [...summaryMap.values()],
    totalRecognizedValueUsd: sumVal(canonicalFinal),
    totalMatchedApprovedValueUsd: sumVal(canonicalFinal.filter((p) => p.matchStatus === "matched_approved")),
    totalMatchedNonapprovedValueUsd: sumVal(canonicalFinal.filter((p) => p.matchStatus === "matched_nonapproved")),
    totalUnmatchedValueUsd: sumVal(canonicalFinal.filter((p) => p.matchStatus === "unmatched")),
    comparisonPerformed: false,
    capitalEvaluated: false,
    amountSelected: false,
    planGenerated: false,
    suggestionGenerated: false,
    updatesProductOutput: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
    warnings: [],
    blockers: [],
    notes: ["Positions normalized + matched by exact identity only; duplicates resolved; no registry mutation, no promotion, no plan/suggestion."],
  };
}

/* ------------------------------------------------------------------ *
 * Leader-position status (consumes 16E; never reruns comparison).
 * ------------------------------------------------------------------ */
export function getYieldStrategyLeaderPositionStatus(lane: "buffer" | "excess", comparisonSet: YieldStrategyComparisonSet | undefined, positionSet: YieldStrategyPositionSet): YieldStrategyLeaderPositionResult {
  const leaderId = lane === "buffer" ? comparisonSet?.bufferComparisonLeaderStrategyId : comparisonSet?.excessComparisonLeaderStrategyId;
  const base: YieldStrategyLeaderPositionResult = { lane, ...(leaderId ? { comparisonLeaderStrategyId: leaderId } : {}), held: false, matchedPositionIds: [], positionCount: 0, status: "no_comparison_leader", warnings: [], blockers: [] };
  if (!leaderId) return base;
  // An ambiguous/conflicting position tied to the leader strategy withholds a clear held status.
  const ambiguousOnLeader = [...positionSet.canonicalEconomicPositions, ...positionSet.conflictingPositions].some((p) => (p.matchStatus === "ambiguous" || p.matchStatus === "invalid") && p.matchedStrategyId === leaderId);
  if (ambiguousOnLeader) return { ...base, status: "leader_position_ambiguous", blockers: ["leader_position_ambiguous"] };
  // Only exact matched_approved positions on the leader strategy count.
  const held = positionSet.canonicalEconomicPositions.filter((p) => p.matchStatus === "matched_approved" && p.matchedStrategyId === leaderId);
  if (held.length === 0) return { ...base, status: "leader_not_held" };
  const fresh = held.filter((p) => p.valuationStatus === "complete");
  const freshValueUsd = fresh.reduce((s, p) => s + (isFiniteNum(p.currentValueUsd) ? (p.currentValueUsd as number) : 0), 0);
  const currentValueUsd = held.reduce((s, p) => s + (isFiniteNum(p.currentValueUsd) ? (p.currentValueUsd as number) : 0), 0);
  if (fresh.length === 0) return { ...base, held: true, matchedPositionIds: held.map((p) => p.positionId), positionCount: held.length, status: "leader_position_unavailable", ...(currentValueUsd ? { currentValueUsd } : {}) };
  return { ...base, held: true, matchedPositionIds: held.map((p) => p.positionId), positionCount: held.length, currentValueUsd, freshValueUsd, status: held.length > 1 ? "leader_held_multiple_positions" : "leader_held" };
}

/* ------------------------------------------------------------------ *
 * Validators (fail closed).
 * ------------------------------------------------------------------ */
export function validateYieldStrategyPosition(position: unknown): YieldStrategyPositionValidationResult {
  const errors: string[] = [];
  if (!position || typeof position !== "object") return { valid: false, errors: ["position_not_an_object"] };
  const p = position as YieldStrategyPosition;
  if (p.schemaVersion !== YIELD_STRATEGY_POSITION_SCHEMA_VERSION) errors.push("wrong_schema_version");
  if (!p.ownerAddress) errors.push("missing_owner");
  if (!YIELD_POSITION_SUPPORTED_PROTOCOLS.includes(p.protocolId)) errors.push("unsupported_protocol");
  if (p.provenance?.browserFetched !== false) errors.push("browser_fetched");
  const flagsOff = p.comparisonPerformed === false && p.capitalEvaluated === false && p.amountSelected === false && p.planGenerated === false && p.suggestionGenerated === false && p.updatesProductOutput === false && p.transactionsEnabled === false && p.walletSignatureRequired === false;
  if (!flagsOff) errors.push("capability_flag_enabled");
  // matched_approved requires an exact approved product identity.
  if (p.matchStatus === "matched_approved") {
    if (!p.matchedStrategyId || !p.productAddress) errors.push("matched_approved_without_identity");
    if (p.matchedRegistryLifecycle !== "approved") errors.push("matched_approved_without_approved_lifecycle");
  }
  // A non-yield / non-approved position must never count toward the buffer.
  if (p.countsTowardSafetyBuffer === true) {
    if (p.matchStatus !== "matched_approved") errors.push("buffer_count_without_approval");
    if (p.matchedRiskLane !== "buffer_eligible") errors.push("buffer_count_without_buffer_lane");
    if (p.valuationStatus !== "complete") errors.push("buffer_count_stale_or_unavailable");
    if (p.isDuplicateRepresentation === true) errors.push("buffer_count_duplicate");
  }
  if (isFiniteNum(p.currentValueUsd) && (p.currentValueUsd as number) < 0) errors.push("negative_value");
  return { valid: errors.length === 0, errors };
}

export function validateYieldStrategyPositionSet(set: unknown): YieldStrategyPositionValidationResult {
  const errors: string[] = [];
  if (!set || typeof set !== "object") return { valid: false, errors: ["set_not_an_object"] };
  const s = set as YieldStrategyPositionSet;
  if (s.schemaVersion !== YIELD_STRATEGY_POSITION_SCHEMA_VERSION) errors.push("wrong_schema_version");
  const flagsOff = s.comparisonPerformed === false && s.capitalEvaluated === false && s.amountSelected === false && s.planGenerated === false && s.suggestionGenerated === false && s.updatesProductOutput === false && s.transactionsEnabled === false && s.walletSignatureRequired === false;
  if (!flagsOff) errors.push("capability_flag_enabled");
  // No duplicate representation is a canonical economic position.
  for (const p of s.canonicalEconomicPositions) if (p.isDuplicateRepresentation === true) errors.push(`duplicate_in_canonical_${p.positionId}`);
  // observed products never auto-approve / mutate.
  for (const o of s.observedUndocumentedProducts) if (o.autoApproved !== false || o.registryMutated !== false || o.requiresDocumentation !== true) errors.push("observed_product_unsafe");
  for (const p of s.canonicalEconomicPositions) { const v = validateYieldStrategyPosition(p); if (!v.valid) errors.push(`position_${p.positionId}:${v.errors.join("/")}`); }
  return { valid: errors.length === 0, errors };
}

/**
 * portfolioCompleteness — Step 17H. The single canonical, deterministic answer to "which portfolio
 * dimensions can WealthSmith stand behind?" — evaluated INDEPENDENTLY per decision, never as one global
 * boolean. A position may be complete for net worth yet unresolved for liquidity or SOL exposure.
 *
 * FAIL-CLOSED. null is never zero; unsupported is never absent; stale never enters an authoritative total.
 * A visible position does NOT authorize any decision — each decision gate returns allowed / blocked /
 * unresolved with machine-readable reasons, and existing suggestion engines may consume these gates to
 * fail closed. This module INVENTS nothing (no prices, liabilities, rates, rewards, or liquidity) and
 * changes no risk score, disposition, candidate set, or eligibility. Read-only; no transaction behavior.
 *
 * It reuses the mounted Safety Buffer coverage model (safetyBufferCoverage.ts) rather than recomputing it.
 */
import type { WalletPosition } from "./walletPosition";
import { computeSafetyBufferCoverage, type SafetyBufferCoverage } from "./safetyBufferCoverage";
import { SUPPORTED_LSTS, isSupportedLstMint } from "./lstUnderlyingNormalization";
import { isStablecoin } from "./walletSummary";
import { verifiedMemeIdentity } from "./verifiedMemeIdentity";

export const PORTFOLIO_COMPLETENESS_VERSION = "1.0.0" as const;
const MSOL_MINT = SUPPORTED_LSTS.msol.mint;

export type CompletenessState =
  | "complete" | "incomplete" | "unresolved" | "stale" | "unsupported" | "not_applicable" | "invalid";

export type DecisionKind =
  | "net_worth" | "allocation" | "stable_buffer" | "liquidity" | "sol_exposure" | "on_track"
  | "rebalance" | "trim" | "position_optimization" | "staking_suggestion" | "dca" | "direct_lending";

export type PositionClass =
  | "native_sol" | "classic_spl" | "stablecoin" | "token_2022" | "native_stake"
  | "lst_supported" | "lst_msol" | "kamino_direct" | "steakhouse" | "jupiter_lend"
  | "lp" | "hubble_debt" | "protocol_stable" | "protocol_other" | "unknown_token" | "layered_receipt";

export interface PositionCompletenessAssessment {
  positionId: string;
  dedupeKey: string | null;
  positionClass: PositionClass;
  protocol: string | null;
  product: string | null;
  ownershipState: CompletenessState;
  identityState: CompletenessState;
  valueState: CompletenessState;
  liquidityState: CompletenessState;
  transferabilityState: CompletenessState;
  liabilityState: CompletenessState;
  allocationState: CompletenessState;
  exposureState: CompletenessState;
  freshnessState: CompletenessState;
  dedupeState: CompletenessState;
  actionabilityState: CompletenessState;
  recognizedValueUsd: number | null;
  liquidValueUsd: number | null;
  /** null = a positive holding whose USD magnitude is UNKNOWN (decision-relevant for net worth). */
  unresolvedValueMagnitude: number | null;
  unresolvedReasons: string[];
  blockingDecisionKinds: DecisionKind[];
  nonBlockingDecisionKinds: DecisionKind[];
  observedAt: string | null;
  sourceSlot: number | null;
}

export interface PortfolioCompletenessResult {
  supportedScopeState: CompletenessState;
  walletWideState: CompletenessState;
  netWorthState: CompletenessState;
  liabilitiesState: CompletenessState;
  allocationState: CompletenessState;
  stableBufferState: CompletenessState;
  liquidityState: CompletenessState;
  solExposureState: CompletenessState;
  transferabilityState: CompletenessState;
  freshnessState: CompletenessState;
  deduplicationState: CompletenessState;
  onTrackState: CompletenessState;
  rebalanceState: CompletenessState;
  stakingSuggestionState: CompletenessState;
  dcaSuggestionState: CompletenessState;
  directLendingSuggestionState: CompletenessState;
  recognizedPortfolioValueUsd: number | null;
  unresolvedKnownValueUsd: number;
  hasUnknownMagnitudeValue: boolean;
  recognizedLiabilitiesUsd: number;
  unresolvedLiabilityMagnitude: boolean;
  blockingIssues: string[];
  warnings: string[];
  positionAssessments: PositionCompletenessAssessment[];
  evaluatedAt: string;
  methodologyVersion: string;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const hasBalance = (p: WalletPosition): boolean => (typeof p.uiAmount === "number" && p.uiAmount > 0) || (typeof p.amount === "string" && /^[1-9]/.test(p.amount));

/** Classify a position into its completeness class from canonical WalletPosition signals (never symbol-only). */
export function classifyPositionClass(p: WalletPosition): PositionClass {
  if (p.side === "borrowed") return "hubble_debt";
  if (p.type === "native") return "native_sol";
  if (p.type === "stake") return "native_stake";
  if (p.type === "lst") return p.mint === MSOL_MINT ? "lst_msol" : isSupportedLstMint(p.mint ?? "") ? "lst_supported" : "layered_receipt";
  if (p.candidateId === "kamino_usdc_lending") return "kamino_direct";
  if (p.candidateId === "kamino_steakhouse_usdc") return "steakhouse";
  if (p.candidateId === "jupiter_lend_usdc") return "jupiter_lend";
  if (p.type === "protocol") {
    if (p.legs && p.legs.length > 1) return "lp";
    if (isStablecoin(p) || /USDC|USDT|USDH|DAI/i.test(p.symbol) || /USDC|Steakhouse/i.test(p.name ?? "")) return "protocol_stable";
    return "protocol_other";
  }
  if (p.type === "token") {
    // A token the registry cannot name is unknown — unless Jupiter has verified that exact mint and tags
    // it a meme coin (verifiedMemeIdentity.ts). That one is an ordinary token: its sourced value counts.
    if (p.name === "Unknown token" && verifiedMemeIdentity(p) == null) return "unknown_token";
    if (typeof p.tokenProgram === "string" && p.tokenProgram === "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb") return "token_2022";
    if (typeof p.transferabilityState === "string") return "token_2022";
    return isStablecoin(p) ? "stablecoin" : "classic_spl";
  }
  return "protocol_other";
}

/**
 * Per-position completeness across every decision dimension. Recognized value, liquidity, transferability,
 * liability, and SOL exposure are kept SEPARATE — a position can be complete for one and unresolved for
 * another. `unresolvedValueMagnitude === null` marks a positive holding whose USD is unknown.
 */
export function assessPositionCompleteness(p: WalletPosition): PositionCompletenessAssessment {
  const cls = classifyPositionClass(p);
  const value = num(p.valueUsd);
  const recognized = num(p.recognizedValueUsd) ?? (cls === "jupiter_lend" ? null : value);
  const liquid = num(p.liquidValueUsd);
  const positive = hasBalance(p);
  const reasons: string[] = [];
  const blocking = new Set<DecisionKind>();
  const nonBlocking = new Set<DecisionKind>();

  // --- value state ---
  let valueState: CompletenessState;
  let unresolvedMagnitude: number | null = 0;
  if (!positive) { valueState = "not_applicable"; }
  else if (cls === "jupiter_lend") { valueState = "unresolved"; unresolvedMagnitude = null; reasons.push("recognized USD value could not be verified"); }
  else if (cls === "unknown_token") { valueState = "unresolved"; unresolvedMagnitude = null; reasons.push("current value could not be verified"); }
  else if (value === null) { valueState = "unresolved"; unresolvedMagnitude = null; reasons.push(cls === "hubble_debt" ? "debt value could not be verified" : "current value could not be verified"); }
  else { valueState = "complete"; unresolvedMagnitude = 0; }
  if (valueState === "unresolved") { blocking.add("net_worth"); blocking.add("allocation"); blocking.add("on_track"); }

  // --- liability state ---
  let liabilityState: CompletenessState = "not_applicable";
  if (cls === "hubble_debt") {
    liabilityState = value === null ? "unresolved" : "complete";
    if (liabilityState === "unresolved") { blocking.add("net_worth"); blocking.add("on_track"); blocking.add("rebalance"); blocking.add("trim"); blocking.add("dca"); blocking.add("direct_lending"); reasons.push("liability value unresolved"); }
  }

  // --- liquidity / transferability / actionability ---
  const ws = p.withdrawalState;
  let liquidityState: CompletenessState;
  let transferabilityState: CompletenessState = "not_applicable";
  if (cls === "token_2022") {
    transferabilityState = ws === "fully_withdrawable" ? "complete" : ws === "currently_unavailable" || ws === "emergency_paused" ? "not_applicable" : ws === "partially_withdrawable" ? "complete" : "unresolved";
    if (transferabilityState === "unresolved") { nonBlocking.add("net_worth"); blocking.add("liquidity"); reasons.push("transferability could not be verified"); }
  }
  if (cls === "kamino_direct" || cls === "steakhouse" || cls === "jupiter_lend") {
    liquidityState = ws === "fully_withdrawable" || ws === "partially_withdrawable" ? (liquid === null ? "unresolved" : "complete") : ws === "emergency_paused" || ws === "currently_unavailable" ? "not_applicable" : "unresolved";
    if (liquidityState === "unresolved") { blocking.add("liquidity"); nonBlocking.add("net_worth"); reasons.push("withdrawal availability could not be verified"); }
  } else if (cls === "native_stake") {
    const anyUnresolved = p.stake?.anyUnresolved === true || p.stakeLifecycleState?.includes("unresolved");
    liquidityState = anyUnresolved ? "unresolved" : liquid === null ? "not_applicable" : "complete";
    if (liquidityState === "unresolved") { blocking.add("liquidity"); blocking.add("staking_suggestion"); nonBlocking.add("net_worth"); reasons.push("stake lifecycle could not be verified"); }
  } else if (cls === "native_sol" || cls === "stablecoin" || cls === "classic_spl") {
    liquidityState = valueState === "complete" ? "complete" : "unresolved";
  } else if (cls === "token_2022") {
    liquidityState = transferabilityState === "complete" ? "complete" : "unresolved";
  } else {
    liquidityState = "not_applicable"; // LST/LP/unknown/debt not treated as actionable liquidity here
  }
  const actionabilityState: CompletenessState =
    liquidityState === "complete" && valueState === "complete" && transferabilityState !== "unresolved" ? "complete" :
    liquidityState === "not_applicable" ? "not_applicable" : "unresolved";

  // --- SOL exposure ---
  let exposureState: CompletenessState = "not_applicable";
  if (cls === "native_sol" || cls === "native_stake") exposureState = positive ? "complete" : "not_applicable";
  else if (cls === "lst_supported") exposureState = p.lstNormalizationState === "complete" ? "complete" : "unresolved";
  else if (cls === "lst_msol") { exposureState = "unsupported"; nonBlocking.add("net_worth"); blocking.add("sol_exposure"); reasons.push("underlying SOL could not be refreshed"); }
  else if (cls === "layered_receipt") { exposureState = "unresolved"; blocking.add("sol_exposure"); }
  if (exposureState === "unresolved") blocking.add("sol_exposure");

  // --- allocation / freshness / identity / ownership / dedupe ---
  const allocationState: CompletenessState = valueState === "complete" ? "complete" : valueState === "not_applicable" ? "not_applicable" : "unresolved";
  const stale = ws === "stale" || p.lstNormalizationState === "stale";
  const freshnessState: CompletenessState = stale ? "stale" : "complete";
  if (stale) { blocking.add("net_worth"); blocking.add("liquidity"); reasons.push("data is stale"); }
  const identityState: CompletenessState = cls === "unknown_token" || cls === "layered_receipt" ? "unsupported" : "complete";
  const ownershipState: CompletenessState = "complete"; // detection proves ownership; amount known
  const dedupeState: CompletenessState = "complete"; // portfolio-level dedupe check runs separately

  return {
    positionId: p.id, dedupeKey: p.dedupeKey ?? null, positionClass: cls, protocol: p.protocol ?? null,
    product: p.candidateId ?? p.lstProductId ?? null,
    ownershipState, identityState, valueState, liquidityState, transferabilityState, liabilityState,
    allocationState, exposureState, freshnessState, dedupeState, actionabilityState,
    recognizedValueUsd: recognized, liquidValueUsd: liquid, unresolvedValueMagnitude: unresolvedMagnitude,
    unresolvedReasons: reasons, blockingDecisionKinds: [...blocking], nonBlockingDecisionKinds: [...nonBlocking],
    observedAt: null, sourceSlot: typeof p.decimals === "number" ? null : null,
  };
}

const worst = (states: CompletenessState[], order: CompletenessState[]): CompletenessState => {
  let idx = -1, res: CompletenessState = "complete";
  for (const s of states) { const i = order.indexOf(s); if (i > idx) { idx = i; res = s; } }
  return res;
};
// Severity order (later = worse) for net-worth-style rollups.
const NW_ORDER: CompletenessState[] = ["not_applicable", "complete", "stale", "incomplete", "unresolved", "unsupported", "invalid"];

/**
 * Canonical portfolio-level completeness. `bufferCoverage` is the ALREADY-computed Safety Buffer coverage
 * (never recomputed here); pass `requiredBufferUsd` to compute it internally when not supplied.
 */
export function computePortfolioCompleteness(
  positions: WalletPosition[],
  opts: { bufferCoverage?: SafetyBufferCoverage; requiredBufferUsd?: number; evaluatedAt?: string } = {},
): PortfolioCompletenessResult {
  const assessments = positions.map(assessPositionCompleteness);
  const buffer = opts.bufferCoverage ?? computeSafetyBufferCoverage(positions, opts.requiredBufferUsd ?? 0);

  const relevant = assessments.filter((a) => a.valueState !== "not_applicable");
  const hasUnknownMagnitudeValue = relevant.some((a) => a.unresolvedValueMagnitude === null && a.positionClass !== "hubble_debt");
  const liabilities = assessments.filter((a) => a.positionClass === "hubble_debt");
  const unresolvedLiabilityMagnitude = liabilities.some((a) => a.liabilityState === "unresolved");
  const recognizedLiabilitiesUsd = liabilities.reduce((s, a) => s + (a.recognizedValueUsd ?? 0), 0);

  const priced = positions.filter((p) => typeof p.valueUsd === "number");
  const recognizedPortfolioValueUsd = priced.length > 0 ? priced.reduce((s, p) => s + (p.valueUsd as number), 0) : null;
  const unresolvedKnownValueUsd = 0; // known-magnitude-but-unresolved is not applicable in this model (unknown → null)

  // Dimension rollups (independent).
  const anyValueUnresolved = relevant.some((a) => a.valueState === "unresolved");
  const anyStale = assessments.some((a) => a.freshnessState === "stale");
  const netWorthState: CompletenessState = anyValueUnresolved || hasUnknownMagnitudeValue || unresolvedLiabilityMagnitude ? "unresolved" : anyStale ? "stale" : "complete";
  const liabilitiesState: CompletenessState = unresolvedLiabilityMagnitude ? "unresolved" : "complete";
  const allocationState: CompletenessState = worst(assessments.map((a) => a.allocationState), NW_ORDER) === "unresolved" || netWorthState !== "complete" ? "unresolved" : "complete";
  const stableBufferState: CompletenessState = buffer.coverageState === "complete" ? "complete" : buffer.coverageState === "incomplete" ? "incomplete" : "unresolved";
  const liquidityState: CompletenessState = assessments.some((a) => a.liquidityState === "unresolved") ? "unresolved" : "complete";
  const transferabilityState: CompletenessState = assessments.some((a) => a.transferabilityState === "unresolved") ? "unresolved" : "complete";
  const solBearing = assessments.filter((a) => ["native_sol", "native_stake", "lst_supported", "lst_msol", "layered_receipt"].includes(a.positionClass));
  const solExposureState: CompletenessState = solBearing.some((a) => a.exposureState === "unsupported") ? "unsupported" : solBearing.some((a) => a.exposureState === "unresolved") ? "unresolved" : "complete";
  const freshnessState: CompletenessState = anyStale ? "stale" : "complete";

  // Deduplication check (economic-position uniqueness across the merged portfolio).
  const dedupe = detectDuplicateViolations(positions);
  const deduplicationState: CompletenessState = dedupe.length > 0 ? "invalid" : "complete";

  // Scope.
  const anyUnsupportedMaterial = assessments.some((a) => (a.identityState === "unsupported" || a.positionClass === "layered_receipt" || a.positionClass === "unknown_token") && a.valueState === "unresolved");
  const supportedAssessments = assessments.filter((a) => a.identityState !== "unsupported");
  const supportedScopeState: CompletenessState = supportedAssessments.every((a) => a.valueState !== "unresolved") && !unresolvedLiabilityMagnitude && deduplicationState === "complete" ? (anyStale ? "stale" : "complete") : "unresolved";
  const walletWideState: CompletenessState = anyUnsupportedMaterial || hasUnknownMagnitudeValue || dedupe.length > 0 || anyValueUnresolved || unresolvedLiabilityMagnitude ? "unresolved" : supportedScopeState;

  // Decision-specific states (mirror the gates below).
  const onTrackState: CompletenessState = netWorthState === "complete" && liabilitiesState === "complete" && stableBufferState !== "unresolved" && !hasUnknownMagnitudeValue ? "complete" : "unresolved";
  const rebalanceState: CompletenessState = netWorthState === "complete" && allocationState === "complete" && liabilitiesState === "complete" && liquidityState === "complete" ? "complete" : "unresolved";
  // Step 20D — Position Optimization eligibility comes EXCLUSIVELY from the canonical
  // PositionOptimizationAssessment's own gates (accounting / positionScope / trigger-families / reviewConfidence /
  // overallReadiness). The obsolete global mirror state + gate (a SOL-exposure + allocation requirement) were removed.
  const stakingSuggestionState: CompletenessState = stableBufferState === "complete" && !assessments.some((a) => (a.positionClass === "native_stake" || a.positionClass.startsWith("lst")) && (a.liquidityState === "unresolved" || a.exposureState === "unresolved")) ? "complete" : "unresolved";
  // DCA/direct-lending gate ONLY on the dimensions they require (buffer + liabilities + capital-source
  // transferability) — NOT full net worth, so an unrelated unpriced token never over-suppresses them.
  const dcaSuggestionState: CompletenessState = stableBufferState === "complete" && liabilitiesState === "complete" ? "complete" : "unresolved";
  const directLendingSuggestionState: CompletenessState = stableBufferState === "complete" && liabilitiesState === "complete" && transferabilityState === "complete" ? "complete" : "unresolved";

  const blockingIssues: string[] = [];
  const warnings: string[] = [];
  if (netWorthState === "unresolved") blockingIssues.push("Some portfolio values could not be verified.");
  if (unresolvedLiabilityMagnitude) blockingIssues.push("A detected liability could not be valued.");
  if (dedupe.length > 0) blockingIssues.push(`Possible duplicate economic position: ${dedupe.join("; ")}`);
  if (liquidityState === "unresolved" && netWorthState === "complete") warnings.push("Some positions are included in your portfolio but are not treated as available funds.");
  if (solExposureState !== "complete") warnings.push("Some staking exposure could not be fully calculated.");

  return {
    supportedScopeState, walletWideState, netWorthState, liabilitiesState, allocationState, stableBufferState,
    liquidityState, solExposureState, transferabilityState, freshnessState, deduplicationState,
    onTrackState, rebalanceState, stakingSuggestionState,
    dcaSuggestionState, directLendingSuggestionState,
    recognizedPortfolioValueUsd, unresolvedKnownValueUsd, hasUnknownMagnitudeValue,
    recognizedLiabilitiesUsd, unresolvedLiabilityMagnitude, blockingIssues, warnings,
    positionAssessments: assessments, evaluatedAt: opts.evaluatedAt ?? new Date().toISOString(),
    methodologyVersion: `portfolio_completeness_${PORTFOLIO_COMPLETENESS_VERSION}`,
  };
}

/**
 * Step 17H.1 — the RECEIPT mint of each existing-position adapter. A GENERIC row holding one of these
 * (i.e. the adapter failed to dedupe its own generic row) double-counts the canonical adapter row.
 * NOTE: this is the adapter's RECEIPT mint (cToken/share/jlUSDC), never the shared UNDERLYING (USDC).
 */
const CANONICAL_RECEIPT_MINTS: Record<string, string> = {
  kamino_usdc_lending: "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D", // Kamino Direct cToken
  kamino_steakhouse_usdc: "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS", // Steakhouse share
  jupiter_lend_usdc: "9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D", // jlUSDC receipt
};

/**
 * Detect duplicate ECONOMIC positions across the merged portfolio — NOT merely repeated asset mints. A mint
 * identifies an asset, not a position: wallet USDC + Kamino Direct USDC + Steakhouse USDC + a USDC-denominated
 * debt legitimately share the USDC mint and are DISTINCT economic positions. Backing/exposure fields are
 * never rows. Deterministic; never drops a row. Evidence used: identical canonical dedupeKey, the same row
 * `id` twice, or a generic receipt-token row coexisting with its canonical adapter (same receipt mint).
 */
export function detectDuplicateViolations(positions: WalletPosition[]): string[] {
  const violations: string[] = [];
  // 1. Identical canonical dedupeKey → the SAME economic position twice.
  const byKey = new Map<string, number>();
  for (const p of positions) { if (typeof p.dedupeKey === "string") byKey.set(p.dedupeKey, (byKey.get(p.dedupeKey) ?? 0) + 1); }
  for (const [k, n] of byKey) if (n > 1) violations.push(`dedupeKey ${k} appears ${n}×`);
  // 2. Same row id twice (defensive — the merge normally guarantees id uniqueness).
  const byId = new Map<string, number>();
  for (const p of positions) byId.set(p.id, (byId.get(p.id) ?? 0) + 1);
  for (const [id, n] of byId) if (n > 1) violations.push(`position id ${id} appears ${n}×`);
  // 3. Generic receipt row + its canonical adapter row (same RECEIPT mint, adapter present).
  const canonicalReceipts = new Set(positions.filter((p) => typeof p.candidateId === "string" && CANONICAL_RECEIPT_MINTS[p.candidateId]).map((p) => CANONICAL_RECEIPT_MINTS[p.candidateId as string]));
  for (const p of positions) {
    if (typeof p.candidateId !== "string" && typeof p.mint === "string" && canonicalReceipts.has(p.mint))
      violations.push(`generic receipt row for mint ${p.mint} duplicates a canonical adapter position`);
  }
  return violations;
}

/* ------------------------------------------------------------------ *
 * §11 — decision gates (allowed / blocked / unresolved + machine-readable reasons). NEVER a bare boolean.
 * ------------------------------------------------------------------ */
export type GateStatus = "allowed" | "blocked" | "unresolved";
export interface DecisionGate { status: GateStatus; reasons: string[] }

const gate = (ok: boolean, unresolved: boolean, reasons: string[]): DecisionGate =>
  ok ? { status: "allowed", reasons: [] } : { status: unresolved ? "unresolved" : "blocked", reasons };

export function canDetermineNetWorth(r: PortfolioCompletenessResult): DecisionGate {
  const reasons: string[] = [];
  if (r.netWorthState !== "complete") reasons.push("authoritative value unresolved");
  if (r.liabilitiesState !== "complete") reasons.push("liabilities unresolved");
  if (r.deduplicationState !== "complete") reasons.push("possible duplicate economic position");
  return gate(reasons.length === 0, true, reasons);
}
export function canDetermineAllocation(r: PortfolioCompletenessResult): DecisionGate {
  const reasons: string[] = [];
  if (r.allocationState !== "complete") reasons.push("allocation market values unresolved");
  if (r.netWorthState !== "complete") reasons.push("net worth unresolved");
  if (r.deduplicationState !== "complete") reasons.push("possible duplicate economic position");
  return gate(reasons.length === 0, true, reasons);
}
// Step 21F — `canShowOnTrack` was DELETED. The mounted On Track card is governed exclusively by the canonical
// `OnTrackAssessment` (Stage B), never by a completeness gate. The underlying completeness condition survives only
// as the dashboard-visibility field `onTrackState` (a completeness precondition, NOT the mounted card eligibility).
export function canGenerateRebalance(r: PortfolioCompletenessResult): DecisionGate {
  const reasons: string[] = [];
  if (r.netWorthState !== "complete") reasons.push("net worth unresolved");
  if (r.allocationState !== "complete") reasons.push("allocation unresolved");
  if (r.liabilitiesState !== "complete") reasons.push("liabilities unresolved");
  if (r.liquidityState !== "complete") reasons.push("funding-source liquidity unresolved");
  return gate(reasons.length === 0, true, reasons);
}
export function canGenerateStakingSuggestion(r: PortfolioCompletenessResult): DecisionGate {
  const reasons: string[] = [];
  if (r.stableBufferState !== "complete") reasons.push("Safety Buffer not complete");
  if (r.stakingSuggestionState !== "complete") reasons.push("unresolved position could represent existing staking exposure");
  return gate(reasons.length === 0, true, reasons);
}
export function canGenerateDcaSuggestion(r: PortfolioCompletenessResult): DecisionGate {
  const reasons: string[] = [];
  if (r.stableBufferState !== "complete") reasons.push("Safety Buffer not complete");
  if (r.liabilitiesState !== "complete") reasons.push("liabilities unresolved");
  return gate(reasons.length === 0, true, reasons);
}
export function canGenerateDirectLendingSuggestion(r: PortfolioCompletenessResult): DecisionGate {
  const reasons: string[] = [];
  if (r.stableBufferState !== "complete") reasons.push("Safety Buffer not complete");
  if (r.liabilitiesState !== "complete") reasons.push("liabilities unresolved");
  if (r.transferabilityState !== "complete") reasons.push("capital-source transferability unresolved");
  return gate(reasons.length === 0, true, reasons);
}

/* ------------------------------------------------------------------ *
 * §2/§14 — the canonical mounted gate map for production consumers. Each entry is a GateStatus; a consumer
 * NARROWS (AND) its existing eligibility with `gates.x === "allowed"` — it never enables on this alone.
 * ------------------------------------------------------------------ */
// Step 21F — the `onTrack` gate was removed: the mounted On Track fallback is governed by the canonical
// OnTrackAssessment (Stage B), not a completeness gate. Only the categories the engine still AND-narrows remain.
export type CompletenessDecision = "staking" | "dca" | "directLending" | "rebalance";
export type CompletenessGateMap = Partial<Record<CompletenessDecision, GateStatus>>;

export function deriveCompletenessGates(
  positions: WalletPosition[],
  opts: { bufferCoverage?: SafetyBufferCoverage; requiredBufferUsd?: number; evaluatedAt?: string } = {},
): { result: PortfolioCompletenessResult; gates: CompletenessGateMap } {
  const result = computePortfolioCompleteness(positions, opts);
  const gates: CompletenessGateMap = {
    staking: canGenerateStakingSuggestion(result).status,
    dca: canGenerateDcaSuggestion(result).status,
    directLending: canGenerateDirectLendingSuggestion(result).status,
    rebalance: canGenerateRebalance(result).status,
  };
  return { result, gates };
}

/** True when a decision's completeness gate permits it. Absent map/entry ⇒ permitted (pure narrowing). */
export function completenessAllows(gates: CompletenessGateMap | undefined, decision: CompletenessDecision): boolean {
  if (!gates) return true;
  return (gates[decision] ?? "allowed") === "allowed";
}

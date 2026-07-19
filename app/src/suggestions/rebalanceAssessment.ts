/**
 * rebalanceAssessment — Step 18B. The canonical, deterministic, liability-aware foundation for the
 * REPLACEMENT Rebalance calculation (Strategy B from the 18A audit). It is NOT mounted into the production
 * card yet — `deriveRebalanceSuggestion` / `rebalance_to_plan` / ordering / Top Pick are untouched. This
 * module only builds a pure `RebalanceAssessment` that separates:
 *   1. authoritative market-value allocation (gross assets, NOT net worth);
 *   2. liabilities (their own dimension — never "negative crypto");
 *   3. directional drift (unchanged ±10pt trigger, $50 minimum);
 *   4. a source inventory of technically-available / unavailable / unresolved capital by position class;
 *   5. an exact, registry-bound destination;
 *   6-8. three SEPARATE gates: calculation, source-actionability, destination-eligibility.
 *
 * READ-ONLY. No transaction/route/swap/signature. Recognized market value is NEVER assumed actionable;
 * source eligibility comes only from the canonical 17-series liquidity/transferability/lifecycle fields.
 * mSOL underlying-SOL normalization is NOT required for the market-value allocation. Reuses the mounted
 * PortfolioCompletenessResult + SafetyBufferCoverage (never recomputes them when supplied).
 */
import type { WalletPosition } from "../wallet/walletPosition";
import { deriveRecommendedAllocation } from "../wallet/recommendedAllocation";
import { REBALANCE_DELTA_THRESHOLD_PCT, MIN_SUGGESTION_AMOUNT_USD } from "./engineThresholds";
import { isStablecoin } from "../wallet/walletSummary";
import {
  computePortfolioCompleteness, classifyPositionClass,
  type PortfolioCompletenessResult, type PositionClass,
} from "../wallet/portfolioCompleteness";
import { computeSafetyBufferCoverage, type SafetyBufferCoverage } from "../wallet/safetyBufferCoverage";

export const REBALANCE_ASSESSMENT_VERSION = "1.0.0" as const;
export const CANONICAL_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" as const;
export const CANONICAL_SOL_ASSET = "SOL_NATIVE" as const;

export type GateStatus = "allowed" | "blocked" | "unresolved";
export interface Gate { status: GateStatus; reasons: string[] }

export type RebalanceDirection = "crypto_to_stables" | "stables_to_crypto" | "within_threshold" | "unresolved";
export type SourceEligibilityState =
  | "eligible" | "technically_available_route_unverified" | "unavailable" | "locked"
  | "existing_position_only" | "unsupported" | "stale" | "unresolved" | "below_minimum";
export type AmountClassification =
  | "full_correction_available" | "partial_correction_available" | "below_minimum"
  | "no_verified_source" | "unresolved" | "within_threshold";

export interface RebalanceSourceCandidate {
  positionId: string;
  dedupeKey: string | null;
  positionClass: PositionClass;
  protocol: string | null;
  product: string | null;
  mint: string | null;
  symbol: string;
  bucket: "crypto" | "stable";
  recognizedValueUsd: number | null;
  verifiedTransferableValueUsd: number | null;
  verifiedWithdrawableValueUsd: number | null;
  technicallyAvailableValueUsd: number;
  eligibilityState: SourceEligibilityState;
  exclusionReasons: string[];
  transferabilityState: string | null;
  liquidityState: string | null;
  lifecycleState: string | null;
  existingPositionOnly: boolean;
  requiresPriorWithdrawal: boolean;
  routeEligibilityState: "unverified" | "not_required";
}

export interface RebalanceDestination {
  assetId: string;
  mint: string | null;
  native: boolean;
  bucket: "crypto" | "stable";
  destinationRole: "wallet_stable" | "core_asset";
  recommendationEligible: boolean;
  supportedRiskProfiles: readonly string[] | "all";
  enabled: boolean;
  invalidationReason: string | null;
}

/** §11 — registry-driven destinations (extensible for future approved BTC/ETH/RWA core assets). */
export const REBALANCE_DESTINATIONS: Record<"crypto_to_stables" | "stables_to_crypto", RebalanceDestination> = {
  crypto_to_stables: {
    assetId: "usdc", mint: CANONICAL_USDC_MINT, native: false, bucket: "stable",
    destinationRole: "wallet_stable", recommendationEligible: true, supportedRiskProfiles: "all", enabled: true, invalidationReason: null,
  },
  stables_to_crypto: {
    assetId: "sol", mint: null, native: true, bucket: "crypto",
    destinationRole: "core_asset", recommendationEligible: true, supportedRiskProfiles: "all", enabled: true, invalidationReason: null,
  },
};

export interface RebalanceInput {
  positions: WalletPosition[];
  portfolioCompleteness?: PortfolioCompletenessResult;
  safetyBufferCoverage?: SafetyBufferCoverage;
  riskTolerance: string | undefined;
  requiredBufferUsd?: number;
  generatedAt?: number;
}

export interface RebalanceAssessment {
  grossAssetValueUsd: number;
  recognizedLiabilitiesUsd: number;
  netWorthUsd: number;
  cryptoAssetValueUsd: number;
  stableAssetValueUsd: number;
  otherClassifiedAssetValueUsd: number;
  allocatableAssetValueUsd: number;
  currentCryptoPct: number | null;
  currentStablePct: number | null;
  targetCryptoPct: number | null;
  targetStablePct: number | null;
  cryptoDeltaPct: number | null;
  direction: RebalanceDirection;
  requiredCorrectionUsd: number;
  sourceCandidates: RebalanceSourceCandidate[];
  eligibleSourceCapacityUsd: number;
  unresolvedSourceCapacityUsd: number;
  excludedSourceValueUsd: number;
  verifiedSourceCapacityUsd: number;
  maximumCurrentlySupportableUsd: number;
  amountClassification: AmountClassification;
  proposedDestination: RebalanceDestination | null;
  calculationGate: Gate;
  sourceActionabilityGate: Gate;
  destinationEligibilityGate: Gate;
  overallReadiness: Gate;
  blockingReasons: string[];
  warnings: string[];
  observedAt: string;
  methodologyVersion: string;
  targetSource: string;
  thresholdSource: string;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const hasBalance = (p: WalletPosition): boolean => (typeof p.uiAmount === "number" && p.uiAmount > 0) || (typeof p.amount === "string" && /^[1-9]/.test(p.amount));
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** A fresh-valued STABLE asset (registry stablecoin OR a recognized stable protocol position). Never symbol-only. */
function isStableAsset(p: WalletPosition): boolean {
  if (p.side === "borrowed") return false;
  if (isStablecoin(p)) return true;
  if (p.type === "protocol" && typeof p.valueUsd === "number") {
    if (p.candidateId === "kamino_usdc_lending" || p.candidateId === "kamino_steakhouse_usdc") return true;
    if (p.legs && p.legs.length > 0 && p.legs.every((l) => l.side !== "debt") && p.legs.every((l) => /USDC|USDT|USDH|DAI/i.test(l.mint) || false)) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * Source inventory — one candidate per overweight-bucket position (§6/§7).
 * ------------------------------------------------------------------ */
function buildSourceCandidate(p: WalletPosition, bucket: "crypto" | "stable"): RebalanceSourceCandidate {
  const cls = classifyPositionClass(p);
  const recognized = num(p.valueUsd);
  const base: RebalanceSourceCandidate = {
    positionId: p.id, dedupeKey: p.dedupeKey ?? null, positionClass: cls, protocol: p.protocol ?? null,
    product: p.candidateId ?? p.lstProductId ?? null, mint: p.mint ?? null, symbol: p.symbol, bucket,
    recognizedValueUsd: recognized, verifiedTransferableValueUsd: null, verifiedWithdrawableValueUsd: null,
    technicallyAvailableValueUsd: 0, eligibilityState: "unresolved", exclusionReasons: [],
    transferabilityState: p.transferabilityState ?? null, liquidityState: p.withdrawalState ?? null,
    lifecycleState: p.stakeLifecycleState ?? p.lstNormalizationState ?? null,
    existingPositionOnly: p.existingPositionOnly === true, requiresPriorWithdrawal: false, routeEligibilityState: "unverified",
  };
  const exclude = (state: SourceEligibilityState, reason: string): RebalanceSourceCandidate => ({ ...base, eligibilityState: state, exclusionReasons: [reason] });

  // Excluded classes (never a Rebalance source in MVP).
  if (cls === "kamino_direct") return exclude("existing_position_only", "Kamino Direct is existing-position-only / protocol-held");
  if (cls === "steakhouse") return exclude("existing_position_only", "Steakhouse is existing-position-only / excluded from suggestions");
  if (cls === "jupiter_lend") return exclude("unresolved", "Jupiter Lend value unresolved; never source-eligible");
  if (cls === "lp") return exclude("unavailable", "LP is visibility-only; unwind required");
  if (cls === "hubble_debt") return exclude("unsupported", "debt is a liability, not an asset source");
  if (cls === "unknown_token" || cls === "layered_receipt") return exclude("unsupported", "unknown / layered receipt is never source-eligible");
  if (recognized === null) return exclude("unresolved", "no fresh recognized value");

  // Stable bucket sources (stables_to_crypto): only DIRECT-WALLET stable is verified transferable; the
  // buffer is netted once at the assessment level. Protocol stables are existing-position-only.
  if (bucket === "stable") {
    if (cls === "protocol_stable" || cls === "protocol_other") return exclude("existing_position_only", "protocol-held stable is not a Rebalance source");
    if (cls === "token_2022") {
      const liq = num(p.liquidValueUsd);
      if (p.withdrawalState === "fully_withdrawable" || p.withdrawalState === "partially_withdrawable") return { ...base, verifiedTransferableValueUsd: liq, technicallyAvailableValueUsd: liq ?? 0, eligibilityState: liq !== null ? "eligible" : "unresolved", exclusionReasons: liq !== null ? [] : ["transferable amount unresolved"] };
      return exclude("unavailable", "Token-2022 not transferable");
    }
    // Classic direct-wallet stablecoin.
    return { ...base, verifiedTransferableValueUsd: recognized, technicallyAvailableValueUsd: recognized, eligibilityState: "eligible", exclusionReasons: [] };
  }

  // Crypto bucket sources (crypto_to_stables). All need a swap ROUTE that is unverified in MVP.
  if (cls === "native_sol") return { ...base, verifiedTransferableValueUsd: recognized, technicallyAvailableValueUsd: recognized, eligibilityState: "technically_available_route_unverified", exclusionReasons: ["swap route to stables + native fee-reserve policy not yet defined"] };
  if (cls === "classic_spl" || cls === "stablecoin") return { ...base, verifiedTransferableValueUsd: recognized, technicallyAvailableValueUsd: recognized, eligibilityState: "technically_available_route_unverified", exclusionReasons: ["swap route to stables not yet verified"] };
  if (cls === "token_2022") {
    const liq = num(p.liquidValueUsd);
    if (p.withdrawalState === "fully_withdrawable" || p.withdrawalState === "partially_withdrawable") return { ...base, verifiedTransferableValueUsd: liq, technicallyAvailableValueUsd: liq ?? 0, eligibilityState: liq !== null ? "technically_available_route_unverified" : "unresolved", exclusionReasons: liq !== null ? ["swap route to stables not yet verified"] : ["transferability unresolved"] };
    if (p.withdrawalState === "unresolved" || p.withdrawalState === "stale") return exclude("unresolved", "Token-2022 transferability unresolved");
    return exclude("unavailable", "Token-2022 frozen / non-transferable / paused");
  }
  if (cls === "native_stake") {
    const withdrawable = num(p.liquidValueUsd) ?? 0;
    if (p.stake?.anyUnresolved || (p.stakeLifecycleState ?? "").includes("unresolved")) return exclude("unresolved", "stake lifecycle unresolved");
    if (withdrawable <= 0) return exclude("unavailable", "no immediately-withdrawable stake (active/activating/deactivating/locked)");
    return { ...base, verifiedWithdrawableValueUsd: withdrawable, technicallyAvailableValueUsd: withdrawable, requiresPriorWithdrawal: true, eligibilityState: "technically_available_route_unverified", exclusionReasons: ["requires a prior stake withdrawal + swap route (multi-step; not yet approved as a source)"] };
  }
  if (cls === "lst_supported" || cls === "lst_msol") return { ...base, verifiedTransferableValueUsd: recognized, technicallyAvailableValueUsd: recognized, eligibilityState: "technically_available_route_unverified", exclusionReasons: ["LST market route not yet verified; redemption backing is not source liquidity"] };
  return exclude("unsupported", "unsupported source class");
}

/* ------------------------------------------------------------------ *
 * The canonical assessment.
 * ------------------------------------------------------------------ */
export function deriveRebalanceAssessment(input: RebalanceInput): RebalanceAssessment {
  const requiredBufferUsd = input.requiredBufferUsd ?? input.safetyBufferCoverage?.requiredBufferUsd ?? 0;
  const completeness = input.portfolioCompleteness ?? computePortfolioCompleteness(input.positions, { requiredBufferUsd });
  const buffer = input.safetyBufferCoverage ?? computeSafetyBufferCoverage(input.positions, requiredBufferUsd);
  const blockingReasons: string[] = [];
  const warnings: string[] = [];

  // --- Allocation + liabilities (gross assets, NOT net worth). ---
  let crypto = 0, stable = 0, liabilities = 0;
  let unresolvedAsset = false, liabilityUnresolved = false, malformedNegativeAsset = false;
  for (const p of input.positions) {
    const v = num(p.valueUsd);
    if (p.side === "borrowed") { if (v === null) liabilityUnresolved = true; else liabilities += Math.abs(v); continue; }
    if (v === null) { if (hasBalance(p)) unresolvedAsset = true; continue; } // unknown/jlUSDC positive → blocks allocation
    if (v < 0) { malformedNegativeAsset = true; continue; } // negative non-liability asset → fail closed
    if (isStableAsset(p)) stable += v; else crypto += v;
  }
  const grossAssetValueUsd = round2(crypto + stable);
  const recognizedLiabilitiesUsd = round2(liabilities);
  const netWorthUsd = round2(grossAssetValueUsd - recognizedLiabilitiesUsd);
  const allocatableAssetValueUsd = round2(crypto + stable);
  const otherClassifiedAssetValueUsd = 0; // MVP two-bucket: every fresh-valued asset is crypto or stable.
  const currentCryptoPct = allocatableAssetValueUsd > 0 ? round2((crypto / allocatableAssetValueUsd) * 100) : null;
  const currentStablePct = allocatableAssetValueUsd > 0 ? round2((stable / allocatableAssetValueUsd) * 100) : null;

  // --- Target (unchanged risk-based allocation). ---
  const recommended = deriveRecommendedAllocation({ riskTolerance: input.riskTolerance, totalPricedUsd: allocatableAssetValueUsd });
  const targetCryptoPct = recommended?.cryptoPct ?? null;
  const targetStablePct = recommended?.stablePct ?? null;

  // --- Drift (unchanged ±10pt / $50). ---
  const cryptoDeltaPct = currentCryptoPct !== null && targetCryptoPct !== null ? round2(currentCryptoPct - targetCryptoPct) : null;
  let direction: RebalanceDirection = "unresolved";
  if (cryptoDeltaPct !== null) direction = cryptoDeltaPct >= REBALANCE_DELTA_THRESHOLD_PCT ? "crypto_to_stables" : cryptoDeltaPct <= -REBALANCE_DELTA_THRESHOLD_PCT ? "stables_to_crypto" : "within_threshold";
  // A correction is only required when the drift actually breaches the ±threshold direction.
  const requiredCorrectionUsd = (direction === "crypto_to_stables" || direction === "stables_to_crypto") && cryptoDeltaPct !== null
    ? round2((allocatableAssetValueUsd * Math.abs(cryptoDeltaPct)) / 100) : 0;

  // --- Calculation gate (§9) — market-value allocation only; NO portfolio-wide liquidity / SOL exposure. ---
  const calcReasons: string[] = [];
  let calcStatus: GateStatus = "allowed";
  if (input.riskTolerance === undefined) { calcReasons.push("missing_risk_tolerance"); calcStatus = "unresolved"; }
  else if (recommended === null) { calcReasons.push("unsupported_risk_tolerance"); calcStatus = "blocked"; }
  if (allocatableAssetValueUsd <= 0) { calcReasons.push("no_allocatable_assets"); calcStatus = "blocked"; }
  if (malformedNegativeAsset) { calcReasons.push("malformed_asset_value"); calcStatus = "blocked"; }
  if (buffer.coverageState === "incomplete") { calcReasons.push("safety_buffer_incomplete"); calcStatus = "blocked"; }
  if (unresolvedAsset || completeness.hasUnknownMagnitudeValue) { calcReasons.push("unknown_asset_value"); if (calcStatus === "allowed") calcStatus = "unresolved"; }
  if (liabilityUnresolved || completeness.liabilitiesState !== "complete") { calcReasons.push("liabilities_unresolved"); if (calcStatus === "allowed") calcStatus = "unresolved"; }
  if (completeness.deduplicationState !== "complete") { calcReasons.push("duplicate_economic_position"); if (calcStatus === "allowed") calcStatus = "unresolved"; }
  if (completeness.freshnessState === "stale") { calcReasons.push("stale_value_in_allocation"); if (calcStatus === "allowed") calcStatus = "unresolved"; }
  if (buffer.coverageState === "unresolved") { calcReasons.push("safety_buffer_unresolved"); if (calcStatus === "allowed") calcStatus = "unresolved"; }
  const calculationGate: Gate = { status: calcStatus, reasons: calcReasons };

  // --- Source inventory for the OVERWEIGHT bucket (§6/§7). ---
  const overweightBucket: "crypto" | "stable" | null = direction === "crypto_to_stables" ? "crypto" : direction === "stables_to_crypto" ? "stable" : null;
  const sourceCandidates: RebalanceSourceCandidate[] = overweightBucket === null ? []
    : input.positions.filter((p) => p.side !== "borrowed" && (overweightBucket === "stable" ? isStableAsset(p) : (typeof p.valueUsd === "number" && p.valueUsd >= 0 && !isStableAsset(p))))
        .map((p) => buildSourceCandidate(p, overweightBucket));

  const sumBy = (pred: (c: RebalanceSourceCandidate) => boolean) => round2(sourceCandidates.filter(pred).reduce((s, c) => s + c.technicallyAvailableValueUsd, 0));
  const eligibleTransferable = sumBy((c) => c.eligibilityState === "eligible");
  // stables_to_crypto: verified capacity is direct-wallet stable ABOVE the required buffer (never protocol / never the buffer).
  const eligibleSourceCapacityUsd = direction === "stables_to_crypto" ? round2(Math.max(0, eligibleTransferable - requiredBufferUsd)) : round2(eligibleTransferable);
  const unresolvedSourceCapacityUsd = sumBy((c) => c.eligibilityState === "technically_available_route_unverified" || c.eligibilityState === "unresolved");
  const excludedSourceValueUsd = sumBy((c) => ["unavailable", "locked", "existing_position_only", "unsupported", "stale", "below_minimum"].includes(c.eligibilityState));
  const verifiedSourceCapacityUsd = eligibleSourceCapacityUsd;
  const maximumCurrentlySupportableUsd = round2(Math.min(requiredCorrectionUsd, verifiedSourceCapacityUsd));

  // --- Source-actionability gate (§10) — direction-specific; NOT portfolio-wide liquidity. ---
  const srcReasons: string[] = [];
  let srcStatus: GateStatus;
  if (direction === "within_threshold") { srcStatus = "blocked"; srcReasons.push("within_threshold"); }
  else if (direction === "unresolved") { srcStatus = "unresolved"; srcReasons.push("allocation_unresolved"); }
  else if (verifiedSourceCapacityUsd >= MIN_SUGGESTION_AMOUNT_USD) { srcStatus = "allowed"; }
  else if (verifiedSourceCapacityUsd + unresolvedSourceCapacityUsd >= MIN_SUGGESTION_AMOUNT_USD) { srcStatus = "unresolved"; srcReasons.push("unresolved_source_capacity_could_meet_minimum"); }
  else { srcStatus = "blocked"; srcReasons.push(verifiedSourceCapacityUsd <= 0 && unresolvedSourceCapacityUsd <= 0 ? "no_verified_source" : "below_minimum"); }
  const sourceActionabilityGate: Gate = { status: srcStatus, reasons: srcReasons };

  // --- Destination-eligibility gate (§11) — registry-bound; cannot enable source/calc. ---
  const dest = direction === "crypto_to_stables" || direction === "stables_to_crypto" ? REBALANCE_DESTINATIONS[direction] : null;
  const destReasons: string[] = [];
  let destStatus: GateStatus = "allowed";
  if (dest === null) { destStatus = direction === "within_threshold" ? "blocked" : "unresolved"; destReasons.push(direction === "within_threshold" ? "no_correction_needed" : "direction_unresolved"); }
  else if (!dest.enabled || !dest.recommendationEligible) { destStatus = "blocked"; destReasons.push(dest.invalidationReason ?? "destination_not_enabled"); }
  const destinationEligibilityGate: Gate = { status: destStatus, reasons: destReasons };

  // --- Overall readiness (§12) — calc AND source AND destination, deterministic precedence. ---
  let overallStatus: GateStatus;
  const overallReasons: string[] = [];
  if (calculationGate.status !== "allowed") { overallStatus = calculationGate.status; overallReasons.push(...calcReasons); }
  else if (sourceActionabilityGate.status === "blocked") { overallStatus = "blocked"; overallReasons.push(...srcReasons); }
  else if (destinationEligibilityGate.status === "blocked") { overallStatus = "blocked"; overallReasons.push(...destReasons); }
  else if (sourceActionabilityGate.status === "unresolved" || destinationEligibilityGate.status === "unresolved") { overallStatus = "unresolved"; overallReasons.push(...srcReasons, ...destReasons); }
  else overallStatus = "allowed";
  const overallReadiness: Gate = { status: overallStatus, reasons: overallReasons };
  blockingReasons.push(...overallReasons);

  // --- Amount classification (§13) — deterministic assessment output for 18C. ---
  let amountClassification: AmountClassification;
  if (direction === "within_threshold") amountClassification = "within_threshold";
  else if (verifiedSourceCapacityUsd <= 0 && unresolvedSourceCapacityUsd <= 0) amountClassification = "no_verified_source";
  else if (verifiedSourceCapacityUsd < MIN_SUGGESTION_AMOUNT_USD && verifiedSourceCapacityUsd + unresolvedSourceCapacityUsd >= MIN_SUGGESTION_AMOUNT_USD) amountClassification = "unresolved";
  else if (maximumCurrentlySupportableUsd < MIN_SUGGESTION_AMOUNT_USD) amountClassification = "below_minimum";
  else if (verifiedSourceCapacityUsd >= requiredCorrectionUsd) amountClassification = "full_correction_available";
  else amountClassification = "partial_correction_available";

  if (direction === "crypto_to_stables" && verifiedSourceCapacityUsd < requiredCorrectionUsd) warnings.push("crypto→stables source capacity requires verified market routing (18C)");

  return {
    grossAssetValueUsd, recognizedLiabilitiesUsd, netWorthUsd, cryptoAssetValueUsd: round2(crypto), stableAssetValueUsd: round2(stable),
    otherClassifiedAssetValueUsd, allocatableAssetValueUsd, currentCryptoPct, currentStablePct, targetCryptoPct, targetStablePct,
    cryptoDeltaPct, direction, requiredCorrectionUsd, sourceCandidates, eligibleSourceCapacityUsd, unresolvedSourceCapacityUsd,
    excludedSourceValueUsd, verifiedSourceCapacityUsd, maximumCurrentlySupportableUsd, amountClassification,
    proposedDestination: dest, calculationGate, sourceActionabilityGate, destinationEligibilityGate, overallReadiness,
    blockingReasons, warnings, observedAt: new Date(input.generatedAt ?? Date.now()).toISOString(),
    methodologyVersion: `rebalance_assessment_${REBALANCE_ASSESSMENT_VERSION}`,
    targetSource: "RISK_TARGET_ALLOCATION (recommendedAllocation.ts) — unchanged",
    thresholdSource: `REBALANCE_DELTA_THRESHOLD_PCT=${REBALANCE_DELTA_THRESHOLD_PCT}, MIN_SUGGESTION_AMOUNT_USD=${MIN_SUGGESTION_AMOUNT_USD} (engineThresholds.ts) — unchanged`,
  };
}

/* ------------------------------------------------------------------ *
 * Step 18C — phase-one EXACT source selector: verified excess DIRECT-WALLET canonical USDC only.
 * ------------------------------------------------------------------ */
export const CLASSIC_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" as const;
export type UsdcSourceSelectionState = "selected" | "no_excess" | "below_minimum" | "stale" | "unresolved" | "duplicate_invalid" | "unsupported";

export interface RebalanceUsdcSource {
  assetId: "USDC";
  mint: string;
  tokenProgram: string;
  displaySymbol: string;
  sourceType: "direct_wallet_usdc";
  selectedSourcePositionIds: string[];
  verifiedTransferableValueUsd: number;
  reservedForSafetyBufferUsd: number;
  verifiedExcessValueUsd: number;
  selectionState: UsdcSourceSelectionState;
  exclusionReasons: string[];
  observedAt: string;
}

/**
 * Aggregate every DIRECT-WALLET canonical-USDC token account (exact mint + classic SPL Token Program,
 * no protocol receipt / candidate / borrow / lock / stale / unresolved-transferability) into ONE logical
 * source, then reserve the Safety Buffer: `verifiedExcess = max(0, Σ transferable − requiredBufferUsd)`.
 * Never counts protocol-held / Kamino / Steakhouse / jlUSDC / Token-2022-other-mint / recognized-only value.
 */
export function selectRebalanceUsdcSource(positions: WalletPosition[], requiredBufferUsd: number, generatedAt?: number): RebalanceUsdcSource {
  const ids: string[] = [];
  const exclusionReasons = new Set<string>();
  let transferable = 0;
  const seen = new Set<string>();
  for (const p of positions) {
    if (p.mint !== CANONICAL_USDC_MINT) continue; // exact mint only (never symbol)
    if (p.side === "borrowed") { exclusionReasons.add("borrowed USDC excluded"); continue; }
    if (typeof p.candidateId === "string" || p.existingPositionOnly === true) { exclusionReasons.add("protocol-receipt / existing-position USDC excluded"); continue; }
    if (p.type !== "token") { exclusionReasons.add("non-wallet-token USDC row excluded"); continue; }
    if ((p.tokenProgram ?? CLASSIC_TOKEN_PROGRAM) !== CLASSIC_TOKEN_PROGRAM) { exclusionReasons.add("non-classic-SPL USDC excluded"); continue; }
    if (typeof p.withdrawalState === "string" && p.withdrawalState !== "fully_withdrawable") { exclusionReasons.add("USDC transferability not fully resolved"); continue; }
    if (typeof p.transferabilityState === "string" && p.transferabilityState !== "fully_transferable") { exclusionReasons.add("USDC transferability not fully resolved"); continue; }
    const v = num(p.valueUsd);
    if (v === null) { exclusionReasons.add("stale/unpriced USDC excluded"); continue; }
    if (seen.has(p.id)) { exclusionReasons.add("duplicate USDC row"); continue; }
    seen.add(p.id); ids.push(p.id); transferable += v;
  }
  const reservedForSafetyBufferUsd = round2(Math.min(transferable, Math.max(0, requiredBufferUsd)));
  const verifiedExcessValueUsd = round2(Math.max(0, transferable - Math.max(0, requiredBufferUsd)));
  let selectionState: UsdcSourceSelectionState;
  if (ids.length === 0) selectionState = "unsupported";
  else if (verifiedExcessValueUsd <= 0) selectionState = "no_excess";
  else if (verifiedExcessValueUsd < MIN_SUGGESTION_AMOUNT_USD) selectionState = "below_minimum";
  else selectionState = "selected";
  return {
    assetId: "USDC", mint: CANONICAL_USDC_MINT, tokenProgram: CLASSIC_TOKEN_PROGRAM, displaySymbol: "USDC",
    sourceType: "direct_wallet_usdc", selectedSourcePositionIds: ids, verifiedTransferableValueUsd: round2(transferable),
    reservedForSafetyBufferUsd, verifiedExcessValueUsd, selectionState, exclusionReasons: [...exclusionReasons],
    observedAt: new Date(generatedAt ?? Date.now()).toISOString(),
  };
}

/**
 * §15 — "material Rebalance need" is SEPARATE from card availability: a real drift breach with a valid
 * calculation. Used to preserve conflict suppression even when no card can safely be emitted (e.g.
 * crypto_to_stables, or stables_to_crypto with insufficient verified USDC).
 */
export function isRebalanceMaterial(a: RebalanceAssessment): boolean {
  return a.calculationGate.status === "allowed" && (a.direction === "crypto_to_stables" || a.direction === "stables_to_crypto");
}

/** True only for a PROVEN material crypto_to_stables need (used to suppress a contradictory new staking suggestion). */
export function isMaterialCryptoToStables(a: RebalanceAssessment): boolean {
  return a.calculationGate.status === "allowed" && a.direction === "crypto_to_stables";
}

/* ------------------------------------------------------------------ *
 * Step 18E — canonical DIRECT-WALLET native-SOL source assessment (NON-MOUNTED foundation for a future
 * crypto_to_stables source). Fail-closed: NO approved native-SOL fee-reserve policy exists in the
 * repository, so `technicallyAvailable` stays null and eligibility is `reserve_policy_missing` — missing
 * policy is NEVER treated as "all SOL available", and the reserve is NEVER defaulted to zero.
 * ------------------------------------------------------------------ */
export const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112" as const;

export type NativeSolReservePolicyState = "approved" | "missing" | "stale" | "unsupported" | "unresolved";
export type NativeSolSourceEligibilityState =
  | "eligible" | "reserve_policy_missing" | "stale" | "price_unresolved" | "duplicate_invalid" | "unsupported" | "unavailable" | "unresolved";

export type NativeSolReserveKind = "fixed_sol" | "fixed_usd_to_sol" | "transaction_budget" | "hybrid";

/** A native-SOL fee-reserve policy (supplied ONLY when product-approved; never invented here). */
export interface NativeSolReservePolicy {
  state: NativeSolReservePolicyState;
  requiredReserveLamports: number | null; // exact integer lamports, only when state === "approved"
  policyId: string | null;
  kind?: NativeSolReserveKind;
  methodologyVersion?: string;
}
/** The current repository state: NO approved Rebalance native-SOL reserve policy (fail-closed default). */
export const NATIVE_SOL_RESERVE_POLICY_MISSING: NativeSolReservePolicy = { state: "missing", requiredReserveLamports: null, policyId: null };

/* ------------------------------------------------------------------ *
 * Step 18F — the APPROVED Rebalance-owned native-SOL operating reserve.
 *
 * PRODUCT DECISION: a FIXED 0.1 SOL (100,000,000 lamports) operating reserve is withheld from Rebalance
 * source capacity for the crypto_to_stables (direct-wallet native SOL → canonical USDC) direction.
 *
 *   • It is a PRODUCT OPERATING RESERVE that protects normal wallet operability — NOT a transaction-fee
 *     estimate, gas prediction, or rent calculation. No transaction is ever constructed here.
 *   • It is INTENTIONALLY EXCLUDED from Rebalance source capacity (available = recognized − this reserve).
 *   • It is REBALANCE-OWNED and MAY CHANGE INDEPENDENTLY of staking policy. It deliberately does NOT
 *     import, alias, or reuse the staking `SOL_FEE_RESERVE` (engineThresholds.ts), even though that value
 *     currently also happens to be 0.1 SOL — the two policies are unrelated and may diverge.
 *   • It is a FIXED lamport amount: not price-dependent (a stale/missing SOL price never changes it), never
 *     negative, no env-var fallback, no hidden default, and not UI-configurable.
 * ------------------------------------------------------------------ */
export const REBALANCE_NATIVE_SOL_RESERVE_LAMPORTS = 100_000_000n; // 0.1 SOL, exact BigInt (source of truth)
export const REBALANCE_NATIVE_SOL_RESERVE_POLICY: NativeSolReservePolicy = {
  state: "approved",
  kind: "fixed_sol",
  // 100_000_000 is well within Number.MAX_SAFE_INTEGER; the BigInt const above is the exact source of truth
  // and the derivation converts back to BigInt for the raw lamport subtraction (no float raw-unit authority).
  requiredReserveLamports: Number(REBALANCE_NATIVE_SOL_RESERVE_LAMPORTS),
  policyId: "rebalance_native_sol_reserve",
  methodologyVersion: "rebalance_native_sol_reserve_1.0.0",
};

export interface NativeSolRebalanceSourceAssessment {
  assetId: "SOL";
  identity: "native_sol";
  sourceType: "direct_wallet_native_sol";
  positionIds: string[];
  recognizedLamports: number | null;
  recognizedSol: number | null;
  recognizedValueUsd: number | null;
  transferableLamports: number | null;
  transferableSol: number | null;
  transferableValueUsd: number | null;
  requiredNativeReserveLamports: number | null;
  requiredNativeReserveSol: number | null;
  requiredNativeReserveUsd: number | null;
  technicallyAvailableLamports: number | null;
  technicallyAvailableSol: number | null;
  technicallyAvailableValueUsd: number | null;
  priceUsd: number | null;
  priceState: "fresh" | "stale" | "unresolved";
  freshnessState: "fresh" | "stale" | "unresolved";
  reservePolicyState: NativeSolReservePolicyState;
  sourceEligibilityState: NativeSolSourceEligibilityState;
  unresolvedPotentialValueUsd: number;
  exclusionReasons: string[];
  observedAt: string;
  methodologyVersion: string;
}

const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Direct-wallet native SOL ONLY (WalletPosition `type: "native"`). Excludes wrapped SOL, native stake,
 * immediately-withdrawable stake, LSTs/backing, LP legs, protocol collateral, borrowed SOL. `walletFresh`
 * gates transferability. Missing/absent reserve policy → technicallyAvailable null, eligibility fail-closed.
 */
export function deriveNativeSolRebalanceSource(
  positions: WalletPosition[],
  solPriceUsd: number | null,
  solPriceFresh: boolean,
  reservePolicy: NativeSolReservePolicy = NATIVE_SOL_RESERVE_POLICY_MISSING,
  walletFresh = true,
  generatedAt?: number,
): NativeSolRebalanceSourceAssessment {
  const exclusionReasons = new Set<string>();
  const ids: string[] = [];
  const dedupeKeys = new Set<string>();
  let duplicateNative = false;
  let lamports = 0n;
  for (const p of positions) {
    if (p.type !== "native") {
      if (p.type === "stake") exclusionReasons.add("native stake excluded (requires withdrawal)");
      else if (p.type === "lst") exclusionReasons.add("LST / LST backing excluded");
      else if (p.mint === WRAPPED_SOL_MINT) exclusionReasons.add("wrapped SOL excluded (separate policy)");
      continue;
    }
    // native SOL row: amount is lamports. A wallet has exactly ONE native (system-account) balance, so a
    // second native row is a duplicate economic identity → fail closed (never double-count SOL).
    if (typeof p.amount === "string" && /^[0-9]+$/.test(p.amount)) {
      if (ids.length > 0) duplicateNative = true;
      if (p.dedupeKey) { if (dedupeKeys.has(p.dedupeKey)) duplicateNative = true; dedupeKeys.add(p.dedupeKey); }
      ids.push(p.id); lamports += BigInt(p.amount);
    }
  }
  const recognizedLamports = ids.length > 0 ? Number(lamports) : null;
  const recognizedSol = recognizedLamports !== null ? recognizedLamports / LAMPORTS_PER_SOL : null;
  const priceOk = solPriceFresh && typeof solPriceUsd === "number" && solPriceUsd > 0;
  const priceState: NativeSolRebalanceSourceAssessment["priceState"] = priceOk ? "fresh" : typeof solPriceUsd === "number" ? "stale" : "unresolved";
  const freshnessState: NativeSolRebalanceSourceAssessment["freshnessState"] = ids.length === 0 ? "unresolved" : walletFresh ? "fresh" : "stale";
  const recognizedValueUsd = priceOk && recognizedSol !== null ? recognizedSol * (solPriceUsd as number) : null;
  // Transferable only when wallet ownership + freshness are complete.
  const transferableLamports = ids.length > 0 && walletFresh ? recognizedLamports : null;
  const transferableSol = transferableLamports !== null ? transferableLamports / LAMPORTS_PER_SOL : null;
  const transferableValueUsd = priceOk && transferableSol !== null ? transferableSol * (solPriceUsd as number) : null;
  const reserveLamports = reservePolicy.state === "approved" ? reservePolicy.requiredReserveLamports : null;
  const requiredNativeReserveSol = reserveLamports !== null ? reserveLamports / LAMPORTS_PER_SOL : null;
  const requiredNativeReserveUsd = priceOk && requiredNativeReserveSol !== null ? requiredNativeReserveSol * (solPriceUsd as number) : null;

  // Technically available: ONLY when the reserve policy is approved AND inputs are fresh. Never default reserve to 0.
  // The raw lamport subtraction is EXACT BigInt (no float raw-unit authority); it is clamped at 0 (never negative)
  // and can never exceed the recognized balance. USD conversion happens only at the presentation boundary below.
  let technicallyAvailableLamports: number | null = null;
  let sourceEligibilityState: NativeSolSourceEligibilityState;
  if (ids.length === 0) { sourceEligibilityState = "unavailable"; exclusionReasons.add("no direct-wallet native SOL"); }
  else if (duplicateNative) { sourceEligibilityState = "duplicate_invalid"; exclusionReasons.add("duplicate native SOL economic identity — fail closed"); }
  else if (reservePolicy.state !== "approved" || reserveLamports === null) { sourceEligibilityState = "reserve_policy_missing"; exclusionReasons.add("no approved native-SOL fee-reserve policy — source sizing blocked"); }
  else if (!walletFresh) { sourceEligibilityState = "stale"; exclusionReasons.add("wallet balance stale"); }
  else if (!priceOk) { sourceEligibilityState = "price_unresolved"; exclusionReasons.add("SOL price stale/unresolved"); }
  else {
    const reserveBig = BigInt(reserveLamports);
    const availableBig = lamports > reserveBig ? lamports - reserveBig : 0n; // exact; clamped ≥ 0; ≤ recognized
    technicallyAvailableLamports = Number(availableBig);
    sourceEligibilityState = "eligible";
  }

  const technicallyAvailableSol = technicallyAvailableLamports !== null ? technicallyAvailableLamports / LAMPORTS_PER_SOL : null;
  const technicallyAvailableValueUsd = priceOk && technicallyAvailableSol !== null ? technicallyAvailableSol * (solPriceUsd as number) : null;
  const unresolvedPotentialValueUsd = sourceEligibilityState !== "eligible" && sourceEligibilityState !== "unavailable" ? round2(recognizedValueUsd ?? 0) : 0;

  return {
    assetId: "SOL", identity: "native_sol", sourceType: "direct_wallet_native_sol", positionIds: ids,
    recognizedLamports, recognizedSol, recognizedValueUsd,
    transferableLamports, transferableSol, transferableValueUsd,
    requiredNativeReserveLamports: reserveLamports, requiredNativeReserveSol, requiredNativeReserveUsd,
    technicallyAvailableLamports, technicallyAvailableSol, technicallyAvailableValueUsd,
    priceUsd: priceOk ? solPriceUsd : null, priceState, freshnessState, reservePolicyState: reservePolicy.state,
    sourceEligibilityState, unresolvedPotentialValueUsd, exclusionReasons: [...exclusionReasons],
    observedAt: new Date(generatedAt ?? Date.now()).toISOString(),
    methodologyVersion: `native_sol_rebalance_source_${REBALANCE_ASSESSMENT_VERSION}`,
  };
}

/**
 * §11 — the FUTURE crypto_to_stables direct-SOL source gate (NON-MOUNTED; never emits a card in this task).
 * allowed only when reserve policy approved AND ≥ $50 technically available; blocked when conclusively < $50;
 * unresolved when reserve missing / price stale / balance stale / duplicate.
 */
export function cryptoToStablesSourceGate(src: NativeSolRebalanceSourceAssessment): Gate {
  const reasons: string[] = [];
  if (src.sourceEligibilityState === "reserve_policy_missing") return { status: "unresolved", reasons: ["native_sol_reserve_policy_missing"] };
  if (src.sourceEligibilityState === "stale" || src.sourceEligibilityState === "price_unresolved" || src.sourceEligibilityState === "unresolved" || src.sourceEligibilityState === "duplicate_invalid") return { status: "unresolved", reasons: [src.sourceEligibilityState] };
  if (src.sourceEligibilityState === "unavailable" || src.sourceEligibilityState === "unsupported") return { status: "blocked", reasons: [src.sourceEligibilityState] };
  const usd = src.technicallyAvailableValueUsd ?? 0;
  if (usd >= MIN_SUGGESTION_AMOUNT_USD) return { status: "allowed", reasons: [] };
  reasons.push("below_minimum_native_sol_source");
  return { status: "blocked", reasons };
}

/**
 * §8 — product-policy OPTIONS for the missing native-SOL fee reserve (informational; no amount selected).
 * A `fixed_sol` floor of 0.1 SOL already exists for the STAKING product (`SOL_FEE_RESERVE`), but it is NOT
 * an approved REBALANCE native-SOL reserve and is not reused here.
 */
export const NATIVE_SOL_RESERVE_POLICY_OPTIONS = [
  { id: "fixed_sol", summary: "One configured SOL floor; deterministic, price-independent; must be product-approved.", failureBehavior: "n/a (always available once approved)" },
  { id: "fixed_usd_to_sol", summary: "Configured USD reserve ÷ fresh SOL price; stable user-value protection; unusable when price stale.", failureBehavior: "unresolved when SOL price stale" },
  { id: "transaction_budget", summary: "Expected ops × approved max fee/rent budget; precise but needs a source-backed fee methodology.", failureBehavior: "inappropriate before transaction construction exists" },
  { id: "hybrid", summary: "max(fixed SOL floor, USD reserve → SOL, tx budget); conservative; needs explicit policy ownership.", failureBehavior: "unresolved if any required input is stale" },
] as const;

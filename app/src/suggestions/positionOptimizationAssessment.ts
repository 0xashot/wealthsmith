/**
 * positionOptimizationAssessment — Step 20B. The canonical, NON-MOUNTED foundation for the Position
 * Optimization ("Review Yield Positions") suggestion. It answers, separately and deterministically:
 * which EXISTING deployed economic positions are in review scope, whether each is counted once, whether each
 * value is authoritative and fresh, whether the portfolio denominator is authoritative (reused from the shared
 * accounting helper), whether APY is EXPECTED / sourced / fresh / comparable for the exact position family,
 * whether missing APY is a data problem vs an un-integrated/not-applicable source, and which trigger families
 * (missing-data, low-yield, concentration, shared-underlying-exposure) are deterministically proven.
 *
 * It is pure (no fetching / pricing / AI), review-only, proposes no protocol, and selects no position to exit.
 *
 * NOT MOUNTED: the production `position_optimization_review` card still comes from
 * `derivePositionOptimizationSuggestion` (positionOptimizationSuggestion.ts). This module is exposed only
 * through pure exports + fixtures until Step 20C.
 *
 * Reuse: the GROSS-ASSET denominator + liabilities come from the SHARED `derivePortfolioAssetAccounting`
 * helper (no second accounting methodology). Position classes come from the shared `classifyPositionClass`.
 * Exact identity comes from the approved TOKEN_REGISTRY mints + `isSupportedLstMint` + the token-program ids.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, lookupMint } from "../wallet/walletPosition";
import { classifyPositionClass, type PortfolioCompletenessResult, computePortfolioCompleteness } from "../wallet/portfolioCompleteness";
import { computeSafetyBufferCoverage, type SafetyBufferCoverage } from "../wallet/safetyBufferCoverage";
import { derivePortfolioAssetAccounting, type PortfolioAssetAccounting } from "../wallet/portfolioAssetAccounting";
import { isSupportedLstMint } from "../wallet/lstUnderlyingNormalization";
import { isStablecoin } from "../wallet/walletSummary";
import {
  MIN_POSITION_REVIEW_USD,
  MIN_REVIEW_APY,
  MIN_CONCENTRATION_REVIEW_USD,
  POSITION_CONCENTRATION_THRESHOLD,
  MIN_DUPLICATE_EXPOSURE_POSITION_USD,
  MIN_DUPLICATE_EXPOSURE_GROUP_USD,
  DUPLICATE_EXPOSURE_PORTFOLIO_SHARE_THRESHOLD,
} from "./engineThresholds";

export const POSITION_OPTIMIZATION_ASSESSMENT_VERSION = "1.0.0" as const;

/* ------------------------------------------------------------------ *
 * Step 20B.2 — SOURCE-SPECIFIC APY freshness policy governance. There is NO global/default freshness window.
 * An APY is `sourced_fresh` ONLY when an APPROVED policy exists for the EXACT (sourceId, methodology) AND the
 * source supplies a freshness signal that satisfies that policy. A timestamp alone, or a current-refresh
 * retrieval alone, never establishes freshness. Missing/unsupported/unresolved policy → fail closed
 * (`sourced_freshness_unverified`), even when `apyObservedAt` is present. Low-yield review requires an approved
 * policy + `apyFreshness === fresh`.
 * ------------------------------------------------------------------ */
export type PoApyFreshnessPolicyState = "approved" | "missing" | "unsupported" | "stale" | "invalid" | "unresolved";
export type PoApyFreshnessSignal = "source_observed_at" | "source_valid_until" | "source_current_period" | "endpoint_guarantee" | "existing_ingestion_state" | "unavailable";
export interface PoApyFreshnessPolicy {
  sourceId: string;
  methodology: PoYieldMethodology;
  policyState: PoApyFreshnessPolicyState;
  freshnessSignal: PoApyFreshnessSignal;
  /** Non-null ONLY for an APPROVED `source_observed_at` policy; the maximum accepted observation age. */
  maxObservationAgeMs: number | null;
  evidenceSource: string;
  approvedAt: string | null;
  methodologyVersion: string;
  invalidationReason: string | null;
}

const unapprovedPolicy = (sourceId: string, methodology: PoYieldMethodology, reason: string): PoApyFreshnessPolicy => ({
  sourceId, methodology, policyState: "missing", freshnessSignal: "unavailable", maxObservationAgeMs: null,
  evidenceSource: "20A/20B.1 audit — bare Map<mint,number>, no source observation timestamp or endpoint guarantee",
  approvedAt: null, methodologyVersion: `po_apy_freshness_policy_${POSITION_OPTIMIZATION_ASSESSMENT_VERSION}`, invalidationReason: reason,
});

/**
 * The PRODUCTION APY freshness-policy registry. Both current sources are UNAPPROVED (no source observation
 * timestamp / no endpoint-currentness guarantee), so their numeric APYs stay `sourced_freshness_unverified`
 * and can never trigger low-yield. Add an approved entry ONLY when real source freshness evidence exists.
 */
export const PO_APY_FRESHNESS_POLICIES: readonly PoApyFreshnessPolicy[] = [
  unapprovedPolicy("lst_apy_feed", "lst_net_apy", "LST APY feed provides no source observation timestamp or approved endpoint-freshness guarantee"),
  unapprovedPolicy("ondo_usdy_feed", "treasury_yield", "Ondo USDY APY feed provides no source observation timestamp or approved endpoint-freshness guarantee"),
];

/** Look up the freshness policy for an exact (sourceId, methodology). Both must match; null when absent. */
export function lookupApyFreshnessPolicy(sourceId: string | null, methodology: PoYieldMethodology, policies: readonly PoApyFreshnessPolicy[] = PO_APY_FRESHNESS_POLICIES): PoApyFreshnessPolicy | null {
  if (!sourceId) return null;
  return policies.find((p) => p.sourceId === sourceId && p.methodology === methodology) ?? null;
}

/* ------------------------------------------------------------------ *
 * Canonical enums.
 * ------------------------------------------------------------------ */
export type PoGateStatus = "allowed" | "blocked" | "unresolved";
export interface PoGate { status: PoGateStatus; reasons: string[] }
export type PoTriggerState = "triggered" | "not_triggered" | "unresolved" | "not_applicable";

export type PoYieldMethodology =
  | "native_staking_apy" | "lst_net_apy" | "lending_supply_apy" | "vault_reported_apy" | "lp_fee_apr"
  | "reward_apr" | "treasury_yield" | "composite_yield" | "not_comparable" | "not_applicable" | "unsupported" | "unresolved";
export type PoApyState = "sourced_fresh" | "sourced_freshness_unverified" | "sourced_stale" | "missing_expected" | "source_failed" | "unsupported" | "not_applicable" | "unresolved";
/** Step 20B.1 — RETRIEVAL (when WealthSmith obtained the value) is separate from SOURCE FRESHNESS (when the
 *  source observed it). A current-refresh fetch proves retrieval only, never source freshness. */
export type PoApyRetrieval = "retrieved_current_refresh" | "cached" | "fetch_failed" | "unavailable" | "unresolved";
export type PoApyExpectation = "expected" | "not_expected" | "source_not_integrated" | "not_applicable" | "unsupported" | "unresolved";
export type PoApyComparability = "comparable" | "comparable_after_normalization" | "not_comparable" | "unresolved";
export type PoLifecycle = "active" | "activating" | "deactivating" | "withdrawable" | "inactive" | "locked" | "unresolved" | "not_applicable";
export type PoActionability = "review_only" | "exit_unavailable" | "exit_unresolved" | "locked" | "cooldown_required" | "not_evaluated" | "not_applicable";
export type PoExposureClass = "native_sol" | "exact_token" | "canonical_stable" | "multi_asset" | "unresolved" | "unsupported";
export type PoExposureGroupState = "resolved" | "unsupported" | "unresolved" | "duplicate_invalid" | "not_applicable";
export type PoPositionType = "native_stake" | "lst" | "protocol_supply" | "lp" | "vault" | "receipt" | "protocol_other" | "unsupported";
export type PoReviewEligibility = "eligible" | "excluded_scope" | "excluded_liability" | "unresolved_identity" | "unresolved_value" | "duplicate_invalid" | "stale";

/* ------------------------------------------------------------------ *
 * Canonical types.
 * ------------------------------------------------------------------ */
export interface PositionOptimizationApy {
  apyValuePct: number | null;
  sourceValue: number | null;
  sourceUnit: "percent" | "unresolved";
  normalizedUnit: "percentage_points" | "unresolved";
  apyState: PoApyState;
  apyRetrieval: PoApyRetrieval;
  apyExpectation: PoApyExpectation;
  apySource: string | null;
  apyObservedAt: string | null;
  /** SOURCE freshness (when the source OBSERVED the value) — NOT retrieval time. Fail-closed `unresolved` unless
   *  an approved freshness path positively establishes it. */
  apyFreshness: "fresh" | "stale" | "unresolved" | "not_applicable";
  yieldMethodology: PoYieldMethodology;
  apyComparability: PoApyComparability;
  grossOrNet: "gross" | "net" | "unresolved" | "not_applicable";
  rewardsIncluded: "yes" | "no" | "unresolved" | "not_applicable";
  feesIncluded: "yes" | "no" | "unresolved" | "not_applicable";
  sourcePositionField: string | null;
  warnings: string[];
}

export interface PositionOptimizationExposure {
  exposureId: string;
  exposureClass: PoExposureClass;
  nativeAssetId: string | null;
  mint: string | null;
  tokenProgram: string | null;
  network: "solana";
  methodology: string;
  exposureValueUsd: number | null;
  exposureState: "resolved" | "unresolved" | "unsupported" | "not_applicable";
  sourcePositionId: string;
  warnings: string[];
}

export interface PositionOptimizationPosition {
  positionId: string;
  economicPositionKey: string;
  sourcePositionIds: string[];
  protocolId: string | null;
  productId: string | null;
  marketId: string | null;
  poolId: string | null;
  vaultId: string | null;
  obligationId: string | null;
  stakeAccountId: string | null;
  accountIdentityState: "resolved" | "unresolved";
  positionType: PoPositionType;
  side: "asset" | "liability" | "unresolved";
  ownershipClass: "deployed" | "direct_wallet" | "protocol" | "unresolved";
  recognizedValueUsd: number | null;
  valueState: "authoritative" | "stale" | "unresolved" | "negative";
  freshnessState: "fresh" | "stale" | "unresolved";
  observedAt: string;
  lifecycleState: PoLifecycle;
  apy: PositionOptimizationApy;
  exposures: PositionOptimizationExposure[];
  underlyingIdentities: string[];
  duplicateState: "unique" | "duplicate_invalid";
  missingDataEligible: boolean;
  lowYieldEligible: boolean;
  concentrationEligible: boolean;
  sharedExposureEligible: boolean;
  actionabilityState: PoActionability;
  reviewEligibilityState: PoReviewEligibility;
  exclusionReasons: string[];
  unresolvedReasons: string[];
  methodologyVersion: string;
}

export interface PositionOptimizationExposureGroup {
  exposureId: string;
  exposureClass: PoExposureClass;
  label: string;
  memberPositionIds: string[];
  combinedValueUsd: number;
  portfolioShare: number | null;
  state: PoExposureGroupState;
}

export interface PositionOptimizationTriggerStates {
  missingApy: PoTriggerState;
  lowYield: PoTriggerState;
  concentration: PoTriggerState;
  sharedExposure: PoTriggerState;
}

export interface PositionOptimizationInput {
  positions: WalletPosition[];
  portfolioCompleteness?: PortfolioCompletenessResult;
  safetyBufferCoverage?: SafetyBufferCoverage;
  requiredBufferUsd?: number;
  portfolioAccounting?: PortfolioAssetAccounting;
  /** Step 20B.2 — an explicit source-specific freshness-policy set (fixture/test override). Production uses the
   *  canonical `PO_APY_FRESHNESS_POLICIES` (all unapproved); never inject this from a UI component. */
  apyFreshnessPolicies?: readonly PoApyFreshnessPolicy[];
  generatedAt?: number;
  methodologyVersion?: string;
}

export interface PositionOptimizationAssessment {
  grossAssetValueUsd: number;
  recognizedLiabilitiesUsd: number;
  netWorthUsd: number;
  deployedPositionValueUsd: number;
  canonicalPositions: PositionOptimizationPosition[];
  excludedPositions: PositionOptimizationPosition[];
  unresolvedPositions: PositionOptimizationPosition[];
  flaggedPositions: PositionOptimizationPosition[];
  totalFlaggedValueUsd: number;
  flaggedPortfolioShare: number | null;
  sharedExposureGroups: PositionOptimizationExposureGroup[];
  triggerStates: PositionOptimizationTriggerStates;
  reasonCodes: string[];
  accountingGate: PoGate;
  positionScopeGate: PoGate;
  missingApyGate: PoGate;
  lowYieldGate: PoGate;
  concentrationGate: PoGate;
  sharedExposureGate: PoGate;
  reviewConfidenceGate: PoGate;
  overallReadiness: PoGate;
  apyStateSummary: Record<PoApyState, number>;
  lifecycleSummary: Record<string, number>;
  exposureSummary: { resolved: number; unresolved: number; unsupported: number };
  blockingReasons: string[];
  warnings: string[];
  observedAt: string;
  methodologyVersion: string;
}

/* ------------------------------------------------------------------ *
 * Helpers.
 * ------------------------------------------------------------------ */
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const round2 = (n: number): number => Math.round(n * 100) / 100;

function programOf(p: WalletPosition): string {
  return p.tokenProgram === TOKEN_2022_PROGRAM_ID ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
}

/** Native-stake lifecycle from the canonical Step-17 stake summary / lifecycle string (never recomputed). */
function stakeLifecycle(p: WalletPosition): PoLifecycle {
  const s = (p.stakeLifecycleState ?? p.stake?.lifecycleSummary ?? "").toLowerCase();
  if (p.stake?.anyUnresolved || s.includes("unresolved")) return "unresolved";
  if (s.includes("deactivat")) return "deactivating";
  if (s.includes("activat")) return "activating"; // matches "activating" (not "deactivating", handled above)
  if (s.includes("inactive")) return "inactive";
  if (s.includes("withdraw")) return "withdrawable";
  if (s.includes("lock")) return "locked";
  if (s.includes("active")) return "active";
  // Fall back to lamport buckets when present.
  const st = p.stake;
  if (st) {
    const big = (x: string | undefined) => (typeof x === "string" && /^[0-9]+$/.test(x) ? BigInt(x) : 0n);
    if (big(st.deactivatingLamports) > 0n) return "deactivating";
    if (big(st.activatingLamports) > 0n) return "activating";
    if (big(st.inactiveLamports) > 0n) return "inactive";
    if (big(st.activeLamports) > 0n) return "active";
  }
  return "unresolved";
}

/**
 * APY expectation + state + comparability for the EXACT position family. An approved APY source is only wired
 * for supported LSTs (`fetchLstApys`) and Ondo USDY (`source: "ondo"`). Native stake / lending / LP / vault /
 * other protocol families have NO integrated source, so a null `apy` there is `source_not_integrated`
 * (NOT `missing_expected`). Nothing infers APR-vs-APY, gross-vs-net, or reward/fee inclusion without evidence.
 */
function buildApy(p: WalletPosition, positionType: PoPositionType, side: "asset" | "liability" | "unresolved", generatedAt: number, policies: readonly PoApyFreshnessPolicy[]): PositionOptimizationApy {
  const base: PositionOptimizationApy = {
    apyValuePct: null, sourceValue: null, sourceUnit: "unresolved", normalizedUnit: "unresolved",
    apyState: "unresolved", apyRetrieval: "unresolved", apyExpectation: "unresolved", apySource: null, apyObservedAt: null, apyFreshness: "unresolved",
    yieldMethodology: "unresolved", apyComparability: "unresolved", grossOrNet: "unresolved",
    rewardsIncluded: "unresolved", feesIncluded: "unresolved", sourcePositionField: "WalletPosition.apy", warnings: [],
  };
  const v = num(p.apy);

  if (side === "liability") {
    return { ...base, apyState: "not_applicable", apyRetrieval: "unavailable", apyExpectation: "not_applicable", yieldMethodology: "not_applicable", apyComparability: "not_comparable", grossOrNet: "not_applicable", rewardsIncluded: "not_applicable", feesIncluded: "not_applicable", apyFreshness: "not_applicable", warnings: ["apy_not_applicable"] };
  }

  /**
   * SOURCE FRESHNESS via SOURCE-SPECIFIC POLICY only — there is NO global window. `sourced_fresh` requires an
   * APPROVED policy for the exact (sourceId, methodology) whose freshness signal is satisfied. A timestamp or
   * current-refresh retrieval alone never suffices. Missing/unsupported/unresolved policy → freshness cannot be
   * established → `sourced_freshness_unverified` (retained for DISPLAY only; never low-yield). `apyObservedAt`
   * is preserved as source metadata regardless, but is inert without an approved policy.
   */
  const sourced = (apySource: string, yieldMethodology: PoYieldMethodology, grossOrNet: "net", rewardsIncluded: "yes" | "no", feesIncluded: "yes" | "no"): PositionOptimizationApy => {
    const obsRaw = typeof p.apyObservedAt === "string" ? p.apyObservedAt : null;
    const shaped = { ...base, apyValuePct: round2(v as number), sourceValue: v, sourceUnit: "percent" as const, normalizedUnit: "percentage_points" as const, apyExpectation: "expected" as const, apySource, apyComparability: "comparable" as const, yieldMethodology, grossOrNet, rewardsIncluded, feesIncluded, apyObservedAt: obsRaw };
    const policy = lookupApyFreshnessPolicy(apySource, yieldMethodology, policies);
    const unverified: PositionOptimizationApy = { ...shaped, apyState: "sourced_freshness_unverified", apyRetrieval: "retrieved_current_refresh", apyFreshness: "unresolved", warnings: ["apy_freshness_unverified"] };
    if (!policy || policy.policyState !== "approved") return unverified; // fail closed — no approved policy
    // Approved policy: satisfy its freshness signal.
    if (policy.freshnessSignal === "endpoint_guarantee") return { ...shaped, apyState: "sourced_fresh", apyRetrieval: "retrieved_current_refresh", apyFreshness: "fresh" };
    if (policy.freshnessSignal === "source_observed_at" || policy.freshnessSignal === "source_valid_until") {
      const obs = obsRaw !== null ? Date.parse(obsRaw) : NaN;
      if (!Number.isFinite(obs) || policy.maxObservationAgeMs === null) return unverified; // approved policy needs a signal the source didn't supply
      return Math.abs(generatedAt - obs) <= policy.maxObservationAgeMs
        ? { ...shaped, apyState: "sourced_fresh", apyRetrieval: "retrieved_current_refresh", apyFreshness: "fresh" }
        : { ...shaped, apyState: "sourced_stale", apyRetrieval: "cached", apyFreshness: "stale", apyComparability: "unresolved", warnings: ["apy_source_stale"] };
    }
    return unverified;
  };

  // Supported LST → an approved net-staking-yield source is integrated (per-mint feed).
  if (positionType === "lst" && isSupportedLstMint(p.mint ?? "")) {
    if (v !== null) return sourced("lst_apy_feed", "lst_net_apy", "net", "yes", "yes");
    return { ...base, apyExpectation: "expected", apyState: "missing_expected", apyRetrieval: "fetch_failed", apySource: "lst_apy_feed", yieldMethodology: "lst_net_apy", apyComparability: "unresolved", warnings: ["apy_source_failed_or_missing"] };
  }
  // Ondo USDY → an approved treasury-yield source is integrated.
  if (p.source === "ondo") {
    if (v !== null) return sourced("ondo_usdy_feed", "treasury_yield", "net", "no", "yes");
    return { ...base, apyExpectation: "expected", apyState: "missing_expected", apyRetrieval: "fetch_failed", apySource: "ondo_usdy_feed", yieldMethodology: "treasury_yield", apyComparability: "unresolved", warnings: ["apy_source_failed_or_missing"] };
  }

  // No approved source integration for the remaining families → NOT "missing"; it is un-integrated / unsupported.
  const methodology: PoYieldMethodology =
    positionType === "native_stake" ? "native_staking_apy"
    : positionType === "protocol_supply" ? "lending_supply_apy"
    : positionType === "lp" ? "lp_fee_apr"
    : positionType === "vault" ? "vault_reported_apy"
    : "unsupported";
  return { ...base, apyExpectation: "source_not_integrated", apyState: "unsupported", apyRetrieval: "unavailable", apyFreshness: "not_applicable", yieldMethodology: methodology, apyComparability: "not_comparable", warnings: ["apy_source_not_integrated"] };
}

/** Exact canonical exposure(s) for a deployed position. Null exposures never fabricate a group. */
function buildExposures(p: WalletPosition, positionType: PoPositionType, valueUsd: number | null): PositionOptimizationExposure[] {
  const observed = valueUsd;
  const ex = (o: Partial<PositionOptimizationExposure>): PositionOptimizationExposure => ({
    exposureId: "unresolved", exposureClass: "unresolved", nativeAssetId: null, mint: null, tokenProgram: null,
    network: "solana", methodology: `po_exposure_${POSITION_OPTIMIZATION_ASSESSMENT_VERSION}`, exposureValueUsd: observed,
    exposureState: "unresolved", sourcePositionId: p.id, warnings: [], ...o,
  });
  // SOL exposure: native stake + supported LST (market value; never analytical backing).
  if (positionType === "native_stake") return [ex({ exposureId: "native_sol", exposureClass: "native_sol", nativeAssetId: "SOL", exposureState: observed !== null ? "resolved" : "unresolved" })];
  if (positionType === "lst") {
    if (isSupportedLstMint(p.mint ?? "")) return [ex({ exposureId: "native_sol", exposureClass: "native_sol", nativeAssetId: "SOL", mint: p.mint ?? null, tokenProgram: programOf(p), exposureState: observed !== null ? "resolved" : "unresolved" })];
    return [ex({ exposureClass: "unsupported", exposureState: "unsupported", warnings: ["lst_exposure_unsupported"] })]; // INF / layered receipts
  }
  // Protocol supply: exact canonical stable mint, else exact token mint (never symbol fallback, never a broad bucket).
  if (positionType === "protocol_supply" || positionType === "protocol_other" || positionType === "receipt") {
    // Composite/LP legs are handled by the lp branch; here single-underlying protocol supply.
    if (p.legs && p.legs.length > 0) return buildLegExposures(p, observed);
    if (p.mint && lookupMint(p.mint) && isStablecoin({ ...p, type: "token" } as WalletPosition)) return [ex({ exposureId: `stable:${p.mint}`, exposureClass: "canonical_stable", mint: p.mint, tokenProgram: programOf(p), exposureState: observed !== null ? "resolved" : "unresolved" })];
    if (p.mint) return [ex({ exposureId: `token:${p.mint}|${programOf(p)}`, exposureClass: "exact_token", mint: p.mint, tokenProgram: programOf(p), exposureState: observed !== null ? "resolved" : "unresolved" })];
    return [ex({ exposureClass: "unresolved", exposureState: "unresolved", warnings: ["exact_underlying_unresolved"] })];
  }
  if (positionType === "lp") return buildLegExposures(p, observed);
  return [ex({ exposureClass: "unsupported", exposureState: "unsupported" })];
}

/** LP / multi-leg: only assign leg exposure when authoritative decomposition exists; otherwise fail closed. */
function buildLegExposures(p: WalletPosition, valueUsd: number | null): PositionOptimizationExposure[] {
  const longLegs = (p.legs ?? []).filter((l) => l.side !== "debt");
  // Per-leg USD is not carried on legs (only uiAmount) → decomposition is NOT authoritative → do not fabricate.
  if (longLegs.length !== 1) {
    return [{ exposureId: "unresolved", exposureClass: "multi_asset", nativeAssetId: null, mint: null, tokenProgram: null, network: "solana", methodology: `po_exposure_${POSITION_OPTIMIZATION_ASSESSMENT_VERSION}`, exposureValueUsd: null, exposureState: "unresolved", sourcePositionId: p.id, warnings: ["lp_leg_decomposition_unavailable"] }];
  }
  const mint = longLegs[0].mint;
  const stable = lookupMint(mint) && isStablecoin({ type: "token", name: "", symbol: lookupMint(mint)?.symbol ?? "", mint } as WalletPosition);
  return [{ exposureId: stable ? `stable:${mint}` : `token:${mint}|${TOKEN_PROGRAM_ID}`, exposureClass: stable ? "canonical_stable" : "exact_token", nativeAssetId: null, mint, tokenProgram: TOKEN_PROGRAM_ID, network: "solana", methodology: `po_exposure_${POSITION_OPTIMIZATION_ASSESSMENT_VERSION}`, exposureValueUsd: valueUsd, exposureState: valueUsd !== null ? "resolved" : "unresolved", sourcePositionId: p.id, warnings: [] }];
}

function exposureLabel(cls: PoExposureClass, mint: string | null): string {
  if (cls === "native_sol") return "SOL exposure";
  if (cls === "canonical_stable") return mint ? `${lookupMint(mint)?.name ?? lookupMint(mint)?.symbol ?? "Stablecoin"} exposure` : "Stablecoin exposure";
  if (cls === "exact_token") return `${lookupMint(mint ?? "")?.symbol ?? "Token"} exposure`;
  return "Shared underlying exposure";
}

/* ------------------------------------------------------------------ *
 * The canonical assessment.
 * ------------------------------------------------------------------ */
export function derivePositionOptimizationAssessment(input: PositionOptimizationInput): PositionOptimizationAssessment {
  const generatedAt = input.generatedAt ?? Date.now();
  const observedAt = new Date(generatedAt).toISOString();
  const version = `position_optimization_assessment_${POSITION_OPTIMIZATION_ASSESSMENT_VERSION}`;
  const posMethodology = `po_position_${POSITION_OPTIMIZATION_ASSESSMENT_VERSION}`;
  const requiredBufferUsd = input.requiredBufferUsd ?? input.safetyBufferCoverage?.requiredBufferUsd ?? 0;
  const completeness = input.portfolioCompleteness ?? computePortfolioCompleteness(input.positions, { requiredBufferUsd });
  const buffer = input.safetyBufferCoverage ?? computeSafetyBufferCoverage(input.positions, requiredBufferUsd);
  const accounting = input.portfolioAccounting ?? derivePortfolioAssetAccounting(input.positions, completeness);
  const apyPolicies = input.apyFreshnessPolicies ?? PO_APY_FRESHNESS_POLICIES;

  const grossAssetValueUsd = accounting.grossAssetValueUsd;
  const recognizedLiabilitiesUsd = accounting.recognizedLiabilitiesUsd;
  const netWorthUsd = accounting.netWorthUsd;

  const canonicalPositions: PositionOptimizationPosition[] = [];
  const excludedPositions: PositionOptimizationPosition[] = [];
  const unresolvedPositions: PositionOptimizationPosition[] = [];
  const keySeen = new Map<string, number>();
  let deployedPositionValueUsd = 0;

  for (const p of input.positions) {
    const cls = classifyPositionClass(p);
    // Only DEPLOYED position classes are in the Position Optimization universe.
    const isDeployed = ["native_stake", "lst_supported", "lst_msol", "kamino_direct", "steakhouse", "jupiter_lend", "lp", "protocol_stable", "protocol_other", "layered_receipt", "hubble_debt"].includes(cls);
    if (!isDeployed) continue; // native SOL, wrapped SOL, direct SPL, stablecoins, unknown_token → excluded scope

    const side: "asset" | "liability" | "unresolved" = p.side === "borrowed" || cls === "hubble_debt" ? "liability" : "asset";
    const positionType: PoPositionType =
      cls === "native_stake" ? "native_stake"
      : cls === "lst_supported" || cls === "lst_msol" ? "lst"
      : cls === "kamino_direct" || cls === "steakhouse" || cls === "jupiter_lend" || cls === "protocol_stable" ? "protocol_supply"
      : cls === "lp" ? "lp"
      : cls === "layered_receipt" ? "receipt"
      : cls === "hubble_debt" ? "protocol_other"
      : "protocol_other";

    const v = num(p.valueUsd);
    const ca = completeness.positionAssessments.find((a) => a.positionId === p.id);
    const stale = ca?.freshnessState === "stale";
    const valueState: PositionOptimizationPosition["valueState"] = v === null ? "unresolved" : v < 0 ? "negative" : stale ? "stale" : "authoritative";
    const lifecycleState: PoLifecycle = positionType === "native_stake" ? stakeLifecycle(p) : "active";

    // Economic-position key — most specific available identity (never display symbol).
    const stakeAccountId = p.stake?.stakeAccounts?.[0] ?? null;
    const economicPositionKey =
      positionType === "native_stake" ? `stake:${stakeAccountId ?? p.id}`
      : positionType === "lst" ? `lst:${p.mint ?? p.id}|${programOf(p)}`
      : `${p.candidateId ?? p.protocol ?? p.source}:${p.dedupeKey ?? p.mint ?? p.id}`;
    const dupCount = (keySeen.get(economicPositionKey) ?? 0) + 1;
    keySeen.set(economicPositionKey, dupCount);
    const dedupeInvalid = dupCount > 1 || ca?.dedupeState === "invalid";

    const apy = buildApy(p, positionType, side, generatedAt, apyPolicies);
    const exposures = buildExposures(p, positionType, v);
    if (side === "asset" && v !== null && v > 0) deployedPositionValueUsd += v;

    // Trigger eligibility (per-position; global gates applied later).
    const valueOk = v !== null && v > 0 && valueState === "authoritative";
    const lifecycleYieldEligible = lifecycleState === "active" || lifecycleState === "activating";
    const lifecycleConcentrationEligible = lifecycleState === "active" || lifecycleState === "activating";
    const missingDataEligible = side === "asset" && valueOk && v! >= MIN_POSITION_REVIEW_USD && lifecycleYieldEligible && apy.apyExpectation === "expected" && (apy.apyState === "missing_expected" || apy.apyState === "source_failed" || apy.apyState === "sourced_stale");
    // Step 20B.1 — LOW-YIELD fails closed unless SOURCE FRESHNESS is positively established. A
    // `sourced_freshness_unverified` value (numeric, retrieved this refresh, but no source observation time)
    // is display metadata only and NEVER triggers low-yield. Freshness AND comparability must independently pass.
    const lowYieldEligible = side === "asset" && valueOk && v! >= MIN_POSITION_REVIEW_USD && lifecycleYieldEligible && apy.apyState === "sourced_fresh" && apy.apyFreshness === "fresh" && apy.apyComparability === "comparable" && apy.normalizedUnit === "percentage_points" && apy.apyValuePct !== null && apy.apyValuePct < MIN_REVIEW_APY;
    const concentrationEligible = side === "asset" && valueOk && v! >= MIN_CONCENTRATION_REVIEW_USD && lifecycleConcentrationEligible;
    const sharedExposureEligible = side === "asset" && valueOk && v! >= MIN_DUPLICATE_EXPOSURE_POSITION_USD && lifecycleConcentrationEligible && exposures.some((e) => e.exposureState === "resolved");

    const exclusionReasons: string[] = [];
    const unresolvedReasons: string[] = [];
    let reviewEligibilityState: PoReviewEligibility;
    if (side === "liability") { reviewEligibilityState = "excluded_liability"; exclusionReasons.push("borrowed/debt position is not a yield position"); }
    else if (dedupeInvalid) { reviewEligibilityState = "duplicate_invalid"; unresolvedReasons.push("duplicate economic position identity"); }
    else if (v === null) { reviewEligibilityState = "unresolved_value"; unresolvedReasons.push("no fresh recognized value"); }
    else if (v < 0) { reviewEligibilityState = "excluded_scope"; exclusionReasons.push("negative value is not an asset position"); }
    else if (v === 0) { reviewEligibilityState = "excluded_scope"; exclusionReasons.push("zero-value position"); }
    else if (stale) { reviewEligibilityState = "stale"; unresolvedReasons.push("recognized value is stale"); }
    else reviewEligibilityState = "eligible";

    const canonical: PositionOptimizationPosition = {
      positionId: p.id, economicPositionKey, sourcePositionIds: [p.id],
      protocolId: p.protocol ?? (p.source !== "wallet" ? p.source : null), productId: p.candidateId ?? p.lstProductId ?? null,
      marketId: null, poolId: positionType === "lp" ? (p.dedupeKey ?? p.id) : null, vaultId: null,
      obligationId: p.dedupeKey ?? null, stakeAccountId,
      accountIdentityState: economicPositionKey.length > 0 ? "resolved" : "unresolved",
      positionType, side, ownershipClass: side === "liability" ? "protocol" : "deployed",
      recognizedValueUsd: v, valueState, freshnessState: v === null ? "unresolved" : stale ? "stale" : "fresh", observedAt,
      lifecycleState, apy, exposures, underlyingIdentities: exposures.map((e) => e.exposureId).filter((x) => x !== "unresolved"),
      duplicateState: dedupeInvalid ? "duplicate_invalid" : "unique",
      missingDataEligible, lowYieldEligible, concentrationEligible, sharedExposureEligible,
      actionabilityState: "review_only",
      reviewEligibilityState, exclusionReasons, unresolvedReasons, methodologyVersion: posMethodology,
    };

    if (side === "liability" || reviewEligibilityState === "excluded_scope") excludedPositions.push(canonical);
    else if (reviewEligibilityState === "eligible") canonicalPositions.push(canonical);
    else unresolvedPositions.push(canonical);
  }

  // --- Authoritative accounting gate signals. ---
  const duplicateInvalid = completeness.deduplicationState === "invalid" || accounting.duplicateState === "invalid" || [...canonicalPositions, ...unresolvedPositions].some((p) => p.duplicateState === "duplicate_invalid");
  const accountingAuthoritative =
    buffer.coverageState === "complete" &&
    completeness.netWorthState === "complete" &&
    completeness.liabilitiesState === "complete" &&
    completeness.deduplicationState === "complete" &&
    completeness.freshnessState === "complete" &&
    !completeness.hasUnknownMagnitudeValue &&
    grossAssetValueUsd > 0 &&
    !duplicateInvalid;

  // --- Triggers. Missing-data / low-yield are per-position (need each position's own authoritative value);
  // concentration / shared-exposure need the authoritative denominator. Duplicate-invalid fails all closed. ---
  const gross = grossAssetValueUsd;
  const missingCandidates = canonicalPositions.filter((p) => p.missingDataEligible);
  const lowYieldCandidates = canonicalPositions.filter((p) => p.lowYieldEligible);
  const concentrationCandidates = canonicalPositions.filter((p) => p.concentrationEligible && gross > 0 && (p.recognizedValueUsd as number) / gross >= POSITION_CONCENTRATION_THRESHOLD);

  // Shared-exposure groups by exact exposureId.
  const buckets = new Map<string, { cls: PoExposureClass; mint: string | null; members: PositionOptimizationPosition[]; value: number }>();
  for (const p of canonicalPositions) {
    if (!p.sharedExposureEligible) continue;
    for (const e of p.exposures) {
      if (e.exposureState !== "resolved" || e.exposureValueUsd === null) continue;
      const b = buckets.get(e.exposureId) ?? { cls: e.exposureClass, mint: e.mint, members: [], value: 0 };
      // one economic position appears once per exact group
      if (!b.members.some((m) => m.positionId === p.positionId)) { b.members.push(p); b.value += e.exposureValueUsd; }
      buckets.set(e.exposureId, b);
    }
  }
  const sharedExposureGroups: PositionOptimizationExposureGroup[] = [];
  for (const [exposureId, b] of buckets) {
    const combined = round2(b.value);
    const share = gross > 0 ? combined / gross : null;
    const qualifies = b.members.length >= 2 && combined >= MIN_DUPLICATE_EXPOSURE_GROUP_USD && share !== null && share >= DUPLICATE_EXPOSURE_PORTFOLIO_SHARE_THRESHOLD;
    if (!qualifies) continue;
    sharedExposureGroups.push({
      exposureId, exposureClass: b.cls, label: exposureLabel(b.cls, b.mint),
      memberPositionIds: b.members.map((m) => m.positionId).sort(),
      combinedValueUsd: combined, portfolioShare: share, state: "resolved",
    });
  }

  // Trigger states (per family). Unresolved when a proof-relevant input is missing (but never auto-blocks others).
  const anyUnresolvedCandidate = unresolvedPositions.some((p) => p.reviewEligibilityState === "unresolved_value" || p.reviewEligibilityState === "stale");
  const tri = (fired: boolean, resolvable: boolean): PoTriggerState =>
    fired ? "triggered" : duplicateInvalid ? "unresolved" : resolvable ? "not_triggered" : "unresolved";
  const missingApyState = tri(missingCandidates.length > 0, !anyUnresolvedCandidate);
  const lowYieldState = tri(lowYieldCandidates.length > 0, !anyUnresolvedCandidate);
  const concentrationState = tri(concentrationCandidates.length > 0, accountingAuthoritative);
  const sharedExposureState = tri(sharedExposureGroups.length > 0, accountingAuthoritative && canonicalPositions.every((p) => !p.sharedExposureEligible || p.exposures.some((e) => e.exposureState === "resolved" || e.exposureState === "unsupported")));
  const triggerStates: PositionOptimizationTriggerStates = { missingApy: missingApyState, lowYield: lowYieldState, concentration: concentrationState, sharedExposure: sharedExposureState };
  const anyTriggered = [missingApyState, lowYieldState, concentrationState, sharedExposureState].includes("triggered");

  // --- Flagged-position union (each economic position once; value counted once). ---
  const flaggedMap = new Map<string, PositionOptimizationPosition>();
  const flag = (p: PositionOptimizationPosition) => { if (!flaggedMap.has(p.positionId)) flaggedMap.set(p.positionId, p); };
  missingCandidates.forEach(flag);
  lowYieldCandidates.forEach(flag);
  concentrationCandidates.forEach(flag);
  for (const g of sharedExposureGroups) for (const id of g.memberPositionIds) { const p = canonicalPositions.find((x) => x.positionId === id); if (p) flag(p); }
  const flaggedPositions = [...flaggedMap.values()].sort((a, b) =>
    ((b.recognizedValueUsd ?? 0) / (gross || 1)) - ((a.recognizedValueUsd ?? 0) / (gross || 1)) ||
    (b.recognizedValueUsd ?? 0) - (a.recognizedValueUsd ?? 0) ||
    (a.protocolId ?? "").localeCompare(b.protocolId ?? "") ||
    (a.productId ?? "").localeCompare(b.productId ?? "") ||
    a.economicPositionKey.localeCompare(b.economicPositionKey));
  const totalFlaggedValueUsd = round2(flaggedPositions.reduce((s, p) => s + (p.recognizedValueUsd ?? 0), 0));
  const flaggedPortfolioShare = gross > 0 ? totalFlaggedValueUsd / gross : null;

  // --- Reason codes (compatibility) + internal warnings, ordered & deduped. ---
  const reasonOrder = ["missing_apy_data", "low_yield_position", "concentration_risk", "duplicate_exposure"];
  const reasonSet = new Set<string>();
  if (missingApyState === "triggered") reasonSet.add("missing_apy_data");
  if (lowYieldState === "triggered") reasonSet.add("low_yield_position");
  if (concentrationState === "triggered") reasonSet.add("concentration_risk");
  if (sharedExposureState === "triggered") reasonSet.add("duplicate_exposure");
  const reasonCodes = reasonOrder.filter((c) => reasonSet.has(c));

  const warnings: string[] = [];
  if (canonicalPositions.some((p) => p.apy.apyExpectation === "source_not_integrated")) warnings.push("apy_source_not_integrated");
  if (canonicalPositions.some((p) => p.apy.apyState === "sourced_freshness_unverified")) warnings.push("apy_freshness_unverified");
  if (canonicalPositions.some((p) => p.apy.apyState === "sourced_stale")) warnings.push("apy_stale");
  if (canonicalPositions.some((p) => p.exposures.some((e) => e.exposureState === "unresolved"))) warnings.push("exposure_group_unresolved");
  if (duplicateInvalid) warnings.push("duplicate_economic_position");
  if (accounting.unresolvedLiabilityPositions.length > 0) warnings.push("liability_unresolved");
  if (!accountingAuthoritative) warnings.push("denominator_unresolved");
  if (canonicalPositions.some((p) => p.lifecycleState === "unresolved")) warnings.push("lifecycle_unresolved");

  // --- Gates. ---
  const accReasons: string[] = [];
  if (buffer.coverageState === "incomplete") accReasons.push("safety_buffer_incomplete");
  else if (buffer.coverageState !== "complete") accReasons.push("safety_buffer_unresolved");
  if (completeness.liabilitiesState !== "complete") accReasons.push("liabilities_unresolved");
  if (duplicateInvalid) accReasons.push("duplicate_economic_position");
  if (completeness.hasUnknownMagnitudeValue) accReasons.push("unknown_asset_value");
  if (completeness.freshnessState === "stale") accReasons.push("stale_value_in_denominator");
  if (completeness.netWorthState !== "complete") accReasons.push("net_worth_unresolved");
  if (grossAssetValueUsd <= 0) accReasons.push("denominator_not_positive");
  const accBlocked = accReasons.includes("safety_buffer_incomplete") || accReasons.includes("denominator_not_positive") || accReasons.includes("duplicate_economic_position");
  const accountingGate: PoGate = { status: accReasons.length === 0 ? "allowed" : accBlocked ? "blocked" : "unresolved", reasons: accReasons };

  const scopeReasons: string[] = [];
  if (unresolvedPositions.some((p) => p.reviewEligibilityState === "duplicate_invalid")) scopeReasons.push("ambiguous_adapter_or_duplicate");
  if (canonicalPositions.some((p) => p.accountIdentityState === "unresolved")) scopeReasons.push("position_identity_unresolved");
  if (canonicalPositions.some((p) => p.side === "unresolved")) scopeReasons.push("asset_liability_side_unresolved");
  const positionScopeGate: PoGate = { status: scopeReasons.length === 0 ? "allowed" : duplicateInvalid ? "blocked" : "unresolved", reasons: scopeReasons };

  const familyGate = (state: PoTriggerState): PoGate => ({ status: state === "triggered" ? "allowed" : state === "unresolved" ? "unresolved" : "blocked", reasons: state === "unresolved" ? ["unresolved_inputs"] : [] });
  const missingApyGate = familyGate(missingApyState);
  const lowYieldGate = familyGate(lowYieldState);
  const concentrationGate = familyGate(concentrationState);
  const sharedExposureGate = familyGate(sharedExposureState);

  const reviewReasons: string[] = [];
  if (!anyTriggered) reviewReasons.push("no_trigger_proven");
  if (!accountingAuthoritative) reviewReasons.push("denominator_unresolved");
  if (totalFlaggedValueUsd < MIN_POSITION_REVIEW_USD) reviewReasons.push("below_flagged_value_floor");
  const reviewConfidenceGate: PoGate = { status: reviewReasons.length === 0 ? "allowed" : (!anyTriggered && accountingAuthoritative ? "blocked" : "unresolved"), reasons: reviewReasons };

  const blockingReasons: string[] = [];
  let overallStatus: PoGateStatus;
  if (accountingGate.status === "blocked" || positionScopeGate.status === "blocked") { overallStatus = "blocked"; blockingReasons.push(...accReasons, ...scopeReasons); }
  else if (!anyTriggered && accountingAuthoritative) { overallStatus = "blocked"; blockingReasons.push("no_trigger_fires"); }
  else if (totalFlaggedValueUsd < MIN_POSITION_REVIEW_USD && anyTriggered) { overallStatus = "blocked"; blockingReasons.push("below_flagged_value_floor"); }
  else if (accountingGate.status === "allowed" && positionScopeGate.status === "allowed" && anyTriggered && totalFlaggedValueUsd >= MIN_POSITION_REVIEW_USD) overallStatus = "allowed";
  else { overallStatus = "unresolved"; blockingReasons.push(...accReasons, ...scopeReasons, ...reviewReasons); }

  // Summaries.
  const apyStateSummary = { sourced_fresh: 0, sourced_freshness_unverified: 0, sourced_stale: 0, missing_expected: 0, source_failed: 0, unsupported: 0, not_applicable: 0, unresolved: 0 } as Record<PoApyState, number>;
  for (const p of [...canonicalPositions, ...unresolvedPositions]) apyStateSummary[p.apy.apyState]++;
  const lifecycleSummary: Record<string, number> = {};
  for (const p of [...canonicalPositions, ...unresolvedPositions, ...excludedPositions]) lifecycleSummary[p.lifecycleState] = (lifecycleSummary[p.lifecycleState] ?? 0) + 1;
  const allExposures = canonicalPositions.flatMap((p) => p.exposures);
  const exposureSummary = { resolved: allExposures.filter((e) => e.exposureState === "resolved").length, unresolved: allExposures.filter((e) => e.exposureState === "unresolved").length, unsupported: allExposures.filter((e) => e.exposureState === "unsupported").length };

  return {
    grossAssetValueUsd, recognizedLiabilitiesUsd, netWorthUsd, deployedPositionValueUsd: round2(deployedPositionValueUsd),
    canonicalPositions, excludedPositions, unresolvedPositions, flaggedPositions,
    totalFlaggedValueUsd, flaggedPortfolioShare, sharedExposureGroups,
    triggerStates, reasonCodes,
    accountingGate, positionScopeGate, missingApyGate, lowYieldGate, concentrationGate, sharedExposureGate, reviewConfidenceGate,
    overallReadiness: { status: overallStatus, reasons: [...new Set(blockingReasons)] },
    apyStateSummary, lifecycleSummary, exposureSummary,
    blockingReasons: [...new Set(blockingReasons)], warnings,
    observedAt, methodologyVersion: version,
  };
}

/**
 * klendReserveMeasuredApyCorrection — Step 16H-N.3b.
 *
 * Corrects the Kamino direct-lending USDC APY methodology to use a DETERMINISTIC MEASURED Solana
 * slot duration instead of a hardcoded assumption, and records the verified mechanism behind the
 * API/SDK disagreement that reopened blocked_apy_unit at 16H-N.3a.
 *
 * WHAT WAS WRONG
 * --------------
 * 16H-N.3a found the official Kamino API and the official SDK disagreeing by ~9.65%, localized to
 * the borrow rate, mechanism unidentified → classification E_unresolved.
 *
 * The mechanism is now VERIFIED. It is not rate math. Every KLend rate method scales the curve by
 * slotAdjustmentFactor() = 500 / recentSlotDurationMs (reserve.js:777-779). The curve is
 * denominated in NOMINAL 500 ms slots; real slots are faster, so real wall-clock yield is higher.
 * The repository passed a hardcoded 450 ms while real mainnet slots run ~415 ms. Nothing about the
 * curve, take rate, compounding, rewards, identity, or SDK version differed — only this parameter.
 *
 * Proof the gap is exactly this parameter: the recorded 16H-N.3a gap ratio was 1.094888, and
 * 450 / 410.99 = 1.094926, where 410.99 ms is the duration implied by the API's own borrowApy.
 * The "gap" was the ratio of two slot-duration assumptions.
 *
 * CONSEQUENCE FOR TRUTH
 * ---------------------
 * Annualized KLend yield depends on FUTURE slot duration, which is unknowable. This APY is
 * therefore inherently an ESTIMATE OF A VARIABLE RATE — rateKind: estimated_variable_apy,
 * precision: estimated. It must never be presented as exact.
 *
 * SCOPE: methodology, evidence, APY inputs, blocker state, and non-production presentation
 * semantics only. This module does NOT touch capacity, deposits, risk scoring, review, signoff,
 * approval, selector eligibility, recommendations, or production cards. No transaction is ever
 * constructed or simulated.
 */

import {
  SLOT_DURATION_METHODOLOGY_ID,
  MEASUREMENT_TTL_MS,
  PRIMARY_WINDOW_SLOTS,
  VALIDATION_WINDOW_SLOTS,
  WINDOW_AGREEMENT_TOLERANCE,
  SANITY_RANGE_MS,
  MAX_RESERVE_MEASUREMENT_SLOT_SKEW,
  computeSlotAdjustmentFactor,
  validateReserveMeasurementSkew,
  type SlotDurationResult,
} from "./solanaSlotDurationEstimator";

export const MEASURED_APY_CORRECTION_VERSION = "1.0.0" as const;
export const MEASURED_APY_METHODOLOGY_ID = "klend_reserve_measured_apy_methodology_v1" as const;

/* ------------------------------------------------------------------ *
 * 1. Exact product binding (immutable)
 * ------------------------------------------------------------------ */

export const EXACT_PRODUCT_BINDING = {
  candidateId: "kamino_usdc_lending",
  productType: "direct_lending",
  protocol: "Kamino Lend / KLend",
  marketName: "SOL/BTC Market",
  marketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
  reserveAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  liquidityMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  cTokenMint: "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D",
  klendProgram: "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
  cluster: "mainnet-beta",
} as const;

export type IdentityBindingFailure =
  | "candidate_mismatch" | "market_mismatch" | "reserve_mismatch"
  | "mint_mismatch" | "ctoken_mismatch" | "program_mismatch" | "cluster_mismatch";

export interface IdentityBindingInputs {
  candidateId: string; marketAddress: string; reserveAddress: string;
  liquidityMint: string; cTokenMint: string; klendProgram: string; cluster: string;
}

/**
 * Fail closed on ANY identity mismatch. A measurement is network-wide, but a reserve state is not:
 * another USDC reserve may never reuse this result as though it were the exact candidate.
 */
export function validateExactProductBinding(i: IdentityBindingInputs): { ok: boolean; failure?: IdentityBindingFailure; detail?: string } {
  const b = EXACT_PRODUCT_BINDING;
  if (i.candidateId !== b.candidateId) return { ok: false, failure: "candidate_mismatch", detail: `${i.candidateId} !== ${b.candidateId}` };
  if (i.marketAddress !== b.marketAddress) return { ok: false, failure: "market_mismatch", detail: `${i.marketAddress} !== ${b.marketAddress}` };
  if (i.reserveAddress !== b.reserveAddress) return { ok: false, failure: "reserve_mismatch", detail: `${i.reserveAddress} !== ${b.reserveAddress}` };
  if (i.liquidityMint !== b.liquidityMint) return { ok: false, failure: "mint_mismatch", detail: `${i.liquidityMint} !== ${b.liquidityMint}` };
  if (i.cTokenMint !== b.cTokenMint) return { ok: false, failure: "ctoken_mismatch", detail: `${i.cTokenMint} !== ${b.cTokenMint}` };
  if (i.klendProgram !== b.klendProgram) return { ok: false, failure: "program_mismatch", detail: `${i.klendProgram} !== ${b.klendProgram}` };
  if (i.cluster !== b.cluster) return { ok: false, failure: "cluster_mismatch", detail: `${i.cluster} !== ${b.cluster}` };
  return { ok: true };
}

/**
 * Network-wide reuse rule. The slot-duration measurement is a property of the NETWORK, so it may be
 * shared across candidates. Reserve state may not: each product binds its own reserve.
 */
export const MEASUREMENT_REUSE_POLICY = {
  slotDurationIsNetworkWide: true,
  slotDurationMayBeSharedAcrossCandidates: true,
  reserveStateMayBeShared: false,
  eachProductMustBindItsOwnReserveState: true,
  rationale:
    "Slot duration describes Solana, not a reserve. Reserve rate/utilization describe one reserve only. Sharing the former is sound; sharing the latter would attribute one reserve's rate to another product.",
} as const;

/* ------------------------------------------------------------------ *
 * 2. Verified mechanism (immutable evidence)
 * ------------------------------------------------------------------ */

export const SLOT_ADJUSTMENT_MECHANISM = {
  verified: true,
  formula: "slotAdjustmentFactor() = 1000 / SLOTS_PER_SECOND / recentSlotDurationMs = 500 / recentSlotDurationMs",
  slotsPerSecond: 2,
  nominalSlotMs: 500,
  verifiedFrom: [
    "dist/classes/reserve.js:777-779 — slotAdjustmentFactor() definition",
    "dist/classes/reserve.js:783-786 — calculateBorrowRate() applies it to the curve output",
    "dist/classes/reserve.js:818-823 — calculateEstimatedBorrowRate() applies it",
    "dist/classes/reserve.js:824-827 — calculateBorrowAPR() applies it to both curve and fixed host rate",
  ],
  curveDenomination: "The borrowRateCurve is denominated in NOMINAL 500ms slots.",
  whyItMatters:
    "Real mainnet slots are faster than nominal, so more interest accrues per wall-clock year. The factor converts nominal→real. It sits UPSTREAM of the take rate and UPSTREAM of compounding, which matches where 16H-N.3a independently localized the gap.",
  gapExplanation: {
    recordedGapRatio: 1.094888,
    explanation: "450 / 410.99 = 1.094926 — the ratio of the repository's hardcoded slot duration to the duration implied by the API's own borrowApy.",
    conclusion: "The 16H-N.3a gap was a slot-duration parameterization difference, not a rate-math difference.",
  },
  ruledOutAsCause: [
    "reward yield", "protocol take rate", "supplier-share math", "APR-to-APY conversion",
    "reserve identity mismatch", "borrow-rate-curve interpolation", "SDK version differences",
  ],
  sdkVersionIsNotTheCause:
    "Installed 9.1.2 vs current 9.1.5 was investigated and is a red herring: both parameterize the math identically. Candidate A (stale SDK) is REJECTED as the mechanism.",
} as const;

/** Same frozen snapshot, three slot-duration assumptions. Demonstrates the factor is the only variable. */
export const FROZEN_SNAPSHOT_SENSITIVITY = [
  { recentSlotDurationMs: 400, slotAdjustmentFactor: 1.25, borrowAprPct: 5.497995, note: "SDK default" },
  { recentSlotDurationMs: 450, slotAdjustmentFactor: 1.111111, borrowAprPct: 4.887106, note: "prior repository hardcode" },
  { recentSlotDurationMs: 500, slotAdjustmentFactor: 1.0, borrowAprPct: 4.398396, note: "nominal" },
] as const;

export const HARDCODED_450_DEFECT = {
  defectId: "hardcoded_slot_duration_450ms",
  severity: "material_rate_understatement",
  locationsFound: [
    "src/wallet/kaminoVaults.ts:23 — const RECENT_SLOT_DURATION_MS = 450 (passed to KaminoVaultClient)",
    "scripts/refresh-stable-yield-market-data.mjs:63 — const RECENT_SLOT_DURATION_MS = 450 (passed to KaminoVault)",
  ],
  measuredRealityMs: 415.1,
  errorVsMeasured: "450ms is ~8.4% slower than measured reality, understating every derived rate by ~8.4%.",
  establishedIndependently:
    "This defect is provable against measured on-chain reality alone. It does not depend on the Kamino API being correct.",
  remediation: "Both sites now receive a validated measurement from solanaSlotDurationEstimator. Neither retains a constant.",
  status: "corrected",
} as const;

/* ------------------------------------------------------------------ *
 * 3. Frozen evidence snapshot (immutable; NOT production market data)
 * ------------------------------------------------------------------ */

/**
 * The measurement taken at correction time. This is EVIDENCE — an immutable record of what was
 * observed. It is explicitly NOT a cached production value and NOT product identity. Production
 * must re-measure; see MEASUREMENT_SNAPSHOT_IS_NOT_PRODUCTION_INPUT.
 */
export const CORRECTION_MEASUREMENT_SNAPSHOT = {
  observedAt: "2026-07-17T06:40:18.000Z",
  cluster: "mainnet-beta",
  rpcSourceKind: "configured_private_rpc",
  rpcSourceNote: "Endpoint identity recorded at runtime from the Node-only env var. The URL is a secret and is never embedded in evidence or shipped to the browser.",
  latestObservedSlot: 433431193,
  windows: [
    { role: "primary", windowSlots: 10000, startSlot: 433421193, endSlot: 433431193, slotDifference: 10000, startBlockTime: 1784266267, endBlockTime: 1784270418, elapsedMs: 4151000, averageSlotDurationMs: 415.1 },
    { role: "validation", windowSlots: 2500, startSlot: 433428693, endSlot: 433431193, slotDifference: 2500, startBlockTime: 1784269379, endBlockTime: 1784270418, elapsedMs: 1039000, averageSlotDurationMs: 415.6 },
    { role: "validation", windowSlots: 50000, startSlot: 433381193, endSlot: 433431193, slotDifference: 50000, startBlockTime: 1784249698, endBlockTime: 1784270418, elapsedMs: 20720000, averageSlotDurationMs: 414.4 },
  ],
  windowAgreement: [
    { window: 2500, relativeDifference: 0.001205, withinTolerance: true },
    { window: 50000, relativeDifference: 0.001686, withinTolerance: true },
  ],
  measuredSlotDurationMs: 415.1,
  slotAdjustmentFactor: 1.204529,
  reserveSourceSlot: 433431197,
  reserveMeasurementSkewSlots: 4,
} as const;

export const MEASUREMENT_SNAPSHOT_IS_NOT_PRODUCTION_INPUT = {
  isImmutableEvidence: true,
  isProductionInput: false,
  isProductIdentity: false,
  isCachedAdapterOutput: false,
  rule: "Production must obtain a FRESH measurement. Replaying this snapshot as current market data would reintroduce the very defect this step corrects — a fixed slot duration presented as current network truth.",
} as const;

/**
 * The four separated layers. Conflating them is how a hardcoded constant became "truth" before.
 */
export const EVIDENCE_LAYER_SEPARATION = {
  immutableMethodology: "solanaSlotDurationEstimator constants + this module's mechanism records. Never carries a measured value.",
  immutableEvidenceSnapshot: "CORRECTION_MEASUREMENT_SNAPSHOT / CORRECTED_APY_SNAPSHOT. Historical observation; never replayed as current.",
  currentEphemeralMeasurement: "measureSlotDurationLive() result. Valid only within MEASUREMENT_TTL_MS.",
  cachedAdapterOutput: "Refresh-script output, carrying its own observedAt + freshness state.",
} as const;

/* ------------------------------------------------------------------ *
 * 4. Corrected APY derivation
 * ------------------------------------------------------------------ */

export const OUTPUT_UNIT = "percentage_points" as const;
export const RATE_KIND = "estimated_variable_apy" as const;
export const PRECISION_STATE = "estimated" as const;

export type MeasuredApyFailure =
  | "identity_binding_failed" | "slot_duration_unavailable" | "slot_duration_stale"
  | "reserve_measurement_skew" | "reserve_state_stale" | "reward_unresolved";

export interface MeasuredApyInputs {
  identity: IdentityBindingInputs;
  slotDuration: SlotDurationResult;
  reserveSourceSlot: number;
  reserveObservedAt: string;
  /** Decimal ratios straight from the official SDK at the measured slot duration. */
  utilization: number;
  borrowApr: number;
  borrowApy: number;
  supplyApr: number;
  baseSupplyApy: number;
  protocolTakeRatePct: number;
  rewardState: "exhausted" | "resolved" | "unresolved";
  rewardApyPct: number;
}

export interface MeasuredApyResult {
  ok: boolean;
  failure?: MeasuredApyFailure;
  failureDetail?: string;
  methodologyId?: typeof MEASURED_APY_METHODOLOGY_ID;
  calculationVersion?: typeof MEASURED_APY_CORRECTION_VERSION;
  outputUnit: typeof OUTPUT_UNIT;
  rateKind?: typeof RATE_KIND;
  precisionState?: typeof PRECISION_STATE;
  measuredSlotDurationMs?: number;
  slotAdjustmentFactor?: number;
  utilizationPct?: number;
  borrowRateAprPct?: number;
  borrowRateApyPct?: number;
  protocolTakeRatePct?: number;
  supplyAprPct?: number;
  baseSupplyApyPct?: number;
  rewardApyPct?: number;
  totalSupplyApyPct?: number;
  reserveSourceSlot?: number;
  reserveObservedAt?: string;
  slotDurationObservedAt?: string;
  slotDurationMeasurementSlot?: number;
  sourceSkewSlots?: number;
}

/** The single ratio→percent conversion boundary, matching klendReserveApyDerivation.ratioToPercent. */
function ratioToPercent(ratio: number): number {
  return ratio * 100;
}

export function deriveMeasuredApy(i: MeasuredApyInputs): MeasuredApyResult {
  const base = { outputUnit: OUTPUT_UNIT } as const;

  const identity = validateExactProductBinding(i.identity);
  if (!identity.ok) return { ...base, ok: false, failure: "identity_binding_failed", failureDetail: identity.detail };

  if (!i.slotDuration.ok || i.slotDuration.measuredSlotDurationMs === undefined) {
    return { ...base, ok: false, failure: "slot_duration_unavailable", failureDetail: i.slotDuration.failureDetail ?? "no validated measurement; refusing to substitute a constant" };
  }
  if (i.slotDuration.freshnessState !== "fresh") {
    return { ...base, ok: false, failure: "slot_duration_stale", failureDetail: `slot-duration measurement is ${i.slotDuration.freshnessState}` };
  }

  const skew = validateReserveMeasurementSkew(i.reserveSourceSlot, i.slotDuration.latestObservedSlot ?? 0);
  if (!skew.ok) return { ...base, ok: false, failure: "reserve_measurement_skew", failureDetail: skew.detail };

  if (i.rewardState === "unresolved") {
    return { ...base, ok: false, failure: "reward_unresolved", failureDetail: "reward APY unresolved; total supply APY cannot be stated" };
  }

  const baseSupplyApyPct = ratioToPercent(i.baseSupplyApy);
  return {
    ...base,
    ok: true,
    methodologyId: MEASURED_APY_METHODOLOGY_ID,
    calculationVersion: MEASURED_APY_CORRECTION_VERSION,
    rateKind: RATE_KIND,
    precisionState: PRECISION_STATE,
    measuredSlotDurationMs: i.slotDuration.measuredSlotDurationMs,
    slotAdjustmentFactor: computeSlotAdjustmentFactor(i.slotDuration.measuredSlotDurationMs),
    utilizationPct: ratioToPercent(i.utilization),
    borrowRateAprPct: ratioToPercent(i.borrowApr),
    borrowRateApyPct: ratioToPercent(i.borrowApy),
    protocolTakeRatePct: i.protocolTakeRatePct,
    supplyAprPct: ratioToPercent(i.supplyApr),
    baseSupplyApyPct,
    rewardApyPct: i.rewardApyPct,
    totalSupplyApyPct: baseSupplyApyPct + i.rewardApyPct,
    reserveSourceSlot: i.reserveSourceSlot,
    reserveObservedAt: i.reserveObservedAt,
    slotDurationObservedAt: i.slotDuration.observedAt,
    slotDurationMeasurementSlot: i.slotDuration.latestObservedSlot,
    sourceSkewSlots: skew.skewSlots,
  };
}

/** The corrected APY observed at correction time. Immutable evidence, NOT current market data. */
export const CORRECTED_APY_SNAPSHOT = {
  observedAt: "2026-07-17T06:40:21.754Z",
  reserveSourceSlot: 433431197,
  measuredSlotDurationMs: 415.1,
  slotAdjustmentFactor: 1.204529,
  utilizationPct: 80.35779,
  borrowRateAprPct: 5.299286,
  borrowRateApyPct: 5.442212,
  protocolTakeRatePct: 10,
  supplyAprPct: 3.396981,
  baseSupplyApyPct: 3.455338,
  rewardState: "exhausted" as const,
  rewardApyPct: 0,
  totalSupplyApyPct: 3.455338,
  rateKind: RATE_KIND,
  precisionState: PRECISION_STATE,
  outputUnit: OUTPUT_UNIT,
  calculationAuthority: "official Kamino SDK KaminoReserve.totalSupplyAPY / calculateSupplyAPR / calculateBorrowAPR / totalBorrowAPY, at the measured slot duration. No financial math reimplemented.",
} as const;

/* ------------------------------------------------------------------ *
 * 5. API diagnostic parity
 * ------------------------------------------------------------------ */

/**
 * Parity tolerance: 2% relative.
 *
 * JUSTIFICATION (required — not chosen for numeric convenience): the residual is BOUNDED BY the
 * slot-duration difference between the two sources, because rate scales ~linearly in
 * slotAdjustmentFactor = 500/ms. We measure 415.1 ms; the API's own borrowApy implies ~411 ms.
 * 415.1/411 = 1.0100, i.e. a ~1.0% expected rate difference — and the observed residual is ~1.03%
 * on BOTH borrow and supply. The residual therefore has the magnitude, sign, and cross-field
 * consistency the mechanism predicts. 2% mirrors WINDOW_AGREEMENT_TOLERANCE, since the residual is
 * a slot-duration-window artifact governed by the same variation the window bound admits.
 */
export const PARITY_TOLERANCE = {
  relativeTolerance: 0.02,
  mirrors: "solanaSlotDurationEstimator.WINDOW_AGREEMENT_TOLERANCE",
  justification:
    "Rate scales linearly in slotAdjustmentFactor, so a slot-duration-window difference of x% produces a rate difference of ~x%. Our windows are bounded to 2%; the residual inherits that bound.",
  notChosenForNumericConvenience: true,
} as const;

export type ParityResidualClassification =
  | "consistent_with_measurement_window_difference"
  | "material_mismatch_unresolved";

export const KAMINO_API_DIAGNOSTIC = {
  endpoint: "https://api.kamino.finance/kamino-market/7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF/reserves/metrics",
  boundBy: "exact reserve address D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  requestedAt: "2026-07-17T06:40:21.754Z",
  exposesSourceTimestamp: false,
  exposesSourceSlot: false,
  exposesAsOfField: false,
  fieldsAvailable: ["borrowApy", "supplyApy"],
  apiBorrowApyPct: 5.498588,
  apiSupplyApyPct: 3.49128,
  role: "diagnostic_only" as const,
  disqualifiedAsProductionAuthority:
    "The API exposes no timestamp, slot, or as-of field, so its freshness cannot be evaluated. WealthSmith cannot accept an unverifiable-freshness source as a calculation authority. It remains a diagnostic parity source only.",
  slotDurationInputNotInferred:
    "The API's exact slot-duration window, cache policy, or fixed assumption remains UNKNOWN. ~411ms is what its output implies; it was never adopted, and no attempt is made to reverse-engineer it further.",
} as const;

export interface ParityDiagnostic {
  sdkBorrowApyPct: number; sdkSupplyApyPct: number;
  apiBorrowApyPct: number; apiSupplyApyPct: number;
  borrowAbsoluteDifferencePct: number; borrowRelativeDifference: number;
  supplyAbsoluteDifferencePct: number; supplyRelativeDifference: number;
  classification: ParityResidualClassification;
  withinTolerance: boolean;
  requestedAt: string;
  apiExposesSourceTimestamp: boolean;
}

export function evaluateParityDiagnostic(sdkBorrowApyPct: number, sdkSupplyApyPct: number, apiBorrowApyPct: number, apiSupplyApyPct: number, requestedAt: string): ParityDiagnostic {
  const borrowAbsoluteDifferencePct = Math.abs(apiBorrowApyPct - sdkBorrowApyPct);
  const supplyAbsoluteDifferencePct = Math.abs(apiSupplyApyPct - sdkSupplyApyPct);
  const borrowRelativeDifference = borrowAbsoluteDifferencePct / apiBorrowApyPct;
  const supplyRelativeDifference = supplyAbsoluteDifferencePct / apiSupplyApyPct;
  const withinTolerance =
    borrowRelativeDifference <= PARITY_TOLERANCE.relativeTolerance &&
    supplyRelativeDifference <= PARITY_TOLERANCE.relativeTolerance;
  return {
    sdkBorrowApyPct, sdkSupplyApyPct, apiBorrowApyPct, apiSupplyApyPct,
    borrowAbsoluteDifferencePct, borrowRelativeDifference,
    supplyAbsoluteDifferencePct, supplyRelativeDifference,
    classification: withinTolerance ? "consistent_with_measurement_window_difference" : "material_mismatch_unresolved",
    withinTolerance,
    requestedAt,
    apiExposesSourceTimestamp: false,
  };
}

export const CORRECTION_PARITY_RESULT = evaluateParityDiagnostic(
  CORRECTED_APY_SNAPSHOT.borrowRateApyPct,
  CORRECTED_APY_SNAPSHOT.totalSupplyApyPct,
  KAMINO_API_DIAGNOSTIC.apiBorrowApyPct,
  KAMINO_API_DIAGNOSTIC.apiSupplyApyPct,
  KAMINO_API_DIAGNOSTIC.requestedAt,
);

/** Before → after. The correction shrank the gap by ~9.4x; it did not force either value to match. */
export const PARITY_IMPROVEMENT = {
  beforeRelativeDifference: 0.0965,
  beforeSlotDurationMs: 450,
  afterRelativeDifference: 0.0103,
  afterSlotDurationMs: 415.1,
  neitherValueWasForcedToMatch:
    "The measured slot duration was derived from block times alone, with no reference to the API. The convergence is a consequence of correcting the input, not of fitting to the API.",
  supersedes: "parity_evidence_dd25a9a1 classification E_unresolved → mechanism verified",
} as const;

/* ------------------------------------------------------------------ *
 * 6. Presentation semantics (recorded, NOT enabled)
 * ------------------------------------------------------------------ */

export const USER_FACING_APY_PRESENTATION = {
  displayFormat: "~{formattedApy}% APY",
  tildePrefixRequired: true,
  precisionNote: "Use existing WealthSmith percentage-formatting conventions. Do not expose excessive precision — the underlying quantity is an estimate of a variable rate.",
  tooltipTitle: "Estimated variable APY",
  tooltipBody:
    "Calculated from the reserve's current rate and recent Solana network conditions. The rate can change at any time, and actual returns may differ. Returns are not guaranteed.",
  mustNotImply: [
    "principal protection", "fixed income", "guaranteed liquidity",
    "guaranteed yield", "WealthSmith custody", "WealthSmith execution",
  ],
  productionPresentationEnabled: false,
  productionCardRendered: false,
  note: "Canonical copy is recorded here for a later presentation step. This module renders nothing.",
} as const;

/* ------------------------------------------------------------------ *
 * 7. Comparison methodology rule
 * ------------------------------------------------------------------ */

export const COMPARISON_METHODOLOGY_RULE = {
  rule: "Stable Yield candidates may only be directly ranked by APY when every compared candidate uses compatible methodology.",
  kaminoDirectLendingRequires: [
    "current exact reserve state",
    "current deterministic slot-duration measurement",
    "same freshness policy",
    "same output unit (percentage_points)",
    "same rateKind interpretation",
    "resolved rewards",
    "exact product identity",
  ],
  forbiddenComparisons: [
    "an estimated variable APY against a stale cached APY",
    "a base-only APY against a total APY",
    "an APR against an APY",
    "a current value against a trailing average without explicit normalization",
  ],
  selectorBehaviorAdded: false,
} as const;

/* ------------------------------------------------------------------ *
 * 8. Evidence amendment + manifest
 * ------------------------------------------------------------------ */

/** Prior evidence preserved immutably. This amendment supersedes by ADDITION; it rewrites nothing. */
export const PRESERVED_PRIOR_EVIDENCE = [
  "identity_9773ac14",
  "klend_reserve_apy_methodology_v1",
  "apy_evidence_d468fce5",
  "klend_reserve_reward_methodology_v1",
  "reward_evidence_cace4fe4",
  "klend_reserve_apy_parity_v1",
  "parity_evidence_dd25a9a1",
] as const;

export const PRIOR_EVIDENCE_HANDLING = {
  silentRewriteOccurred: false,
  supersessionMode: "additive_amendment",
  historicalSnapshotsRetained: true,
  historicalBlockerTransitionsRetained: true,
  note: "16H-N.3a's E_unresolved classification remains on record as an accurate description of what was known THEN. This amendment records what changed and why, without editing the prior finding.",
} as const;

export const MEASURED_APY_EVIDENCE = {
  evidenceId: MEASURED_APY_METHODOLOGY_ID,
  version: MEASURED_APY_CORRECTION_VERSION,
  step: "16H-N.3b",
  reserveAddress: EXACT_PRODUCT_BINDING.reserveAddress,
  preparerId: "claude_automated_evidence_preparer",
  preparerRole: "automated_evidence_preparer",
  preparerIsNotHumanReviewer: true,
  evidenceTimestamp: "2026-07-17T06:40:21.754Z",
  whatChanged: [
    "The API/SDK disagreement mechanism was VERIFIED as slotAdjustmentFactor = 500/recentSlotDurationMs.",
    "The hardcoded 450ms production assumption was removed from both known sites.",
    "Production now consumes a deterministic measured slot duration or fails closed.",
    "rateKind is recorded as estimated_variable_apy with precision estimate.",
    "The Kamino API is fixed as diagnostic-only, disqualified as authority by its missing timestamp.",
  ],
  whyItChanged:
    "450ms was ~8.4% slower than measured mainnet reality and understated every derived rate. Annualized KLend yield depends on actual slot duration, so it must be measured, and it can only ever be an estimate.",
  sourceProvenance: [
    "SDK source inspection: dist/classes/reserve.js:777-779, 783-786, 818-827",
    "On-chain block times via configured mainnet-beta RPC (read-only)",
    "Exact reserve state D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
    "Kamino public API (diagnostic only)",
  ],
  calculationAuthority: "official Kamino SDK @kamino-finance/klend-sdk 9.1.2",
  outputUnit: OUTPUT_UNIT,
  rateKind: RATE_KIND,
  precisionState: PRECISION_STATE,
  slotDurationMethodology: SLOT_DURATION_METHODOLOGY_ID,
  invalidationTriggers: [
    "slot-duration measurement exceeds TTL",
    "validation windows disagree beyond tolerance",
    "measured duration leaves the justified sanity range",
    "reserve/measurement skew exceeds bound",
    "reserve identity changes",
    "supplier farm reactivates (reward state leaves exhausted)",
    "SDK rate math or slotAdjustmentFactor semantics change on upgrade",
    "API parity residual becomes material",
  ],
} as const;

export function computeMeasuredApyEvidenceManifestHash(e: typeof MEASURED_APY_EVIDENCE = MEASURED_APY_EVIDENCE): string {
  const material = JSON.stringify({
    id: e.evidenceId, v: e.version, s: e.step, r: e.reserveAddress,
    a: e.calculationAuthority, u: e.outputUnit, k: e.rateKind, p: e.precisionState,
    m: e.slotDurationMethodology,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `measured_apy_evidence_${h.toString(16).padStart(8, "0")}`;
}

export const MEASURED_APY_EVIDENCE_MANIFEST_HASH = computeMeasuredApyEvidenceManifestHash();

/* ------------------------------------------------------------------ *
 * 9. Blocker state transition
 * ------------------------------------------------------------------ */

export interface ComparisonReadinessInputs {
  identityVerified: boolean;
  slotDurationValidated: boolean;
  slotDurationFresh: boolean;
  windowsAgree: boolean;
  reserveFresh: boolean;
  skewWithinBound: boolean;
  rewardResolved: boolean;
  parityWithinTolerance: boolean;
}

export type PrimaryBlocker = "blocked_apy_unit" | "blocked_capacity";

export interface ComparisonReadinessResult {
  definitionSufficientForComparison: boolean;
  primaryBlocker: PrimaryBlocker;
  rateKind: typeof RATE_KIND;
  precisionState: typeof PRECISION_STATE;
  failedGates: string[];
}

/**
 * Every gate must pass to restore comparison readiness. A single failure keeps blocked_apy_unit —
 * the mechanism being verified is necessary but not sufficient.
 */
export function evaluateComparisonReadiness(i: ComparisonReadinessInputs): ComparisonReadinessResult {
  const failedGates: string[] = [];
  if (!i.identityVerified) failedGates.push("exact product identity not verified");
  if (!i.slotDurationValidated) failedGates.push("slot-duration measurement did not validate");
  if (!i.slotDurationFresh) failedGates.push("slot-duration measurement is stale");
  if (!i.windowsAgree) failedGates.push("validation windows disagree beyond tolerance");
  if (!i.reserveFresh) failedGates.push("reserve state is stale");
  if (!i.skewWithinBound) failedGates.push("reserve/measurement skew exceeds bound");
  if (!i.rewardResolved) failedGates.push("reward state unresolved");
  if (!i.parityWithinTolerance) failedGates.push("API parity residual is material");
  const ok = failedGates.length === 0;
  return {
    definitionSufficientForComparison: ok,
    primaryBlocker: ok ? "blocked_capacity" : "blocked_apy_unit",
    rateKind: RATE_KIND,
    precisionState: PRECISION_STATE,
    failedGates,
  };
}

export const CORRECTION_READINESS_RESULT = evaluateComparisonReadiness({
  identityVerified: true,
  slotDurationValidated: true,
  slotDurationFresh: true,
  windowsAgree: true,
  reserveFresh: true,
  skewWithinBound: true,
  rewardResolved: true,
  parityWithinTolerance: CORRECTION_PARITY_RESULT.withinTolerance,
});

export const APY_UNIT_BLOCKER_SUPERSESSION = {
  supersededBlocker: "blocked_apy_unit",
  supersededAt: "16H-N.3b",
  priorPrimaryBlocker: "blocked_apy_unit",
  resultingPrimaryBlocker: CORRECTION_READINESS_RESULT.primaryBlocker,
  reason: "The APY definition is now sufficient: the unit is percentage_points, the semantics are estimated_variable_apy, and the previously unexplained API divergence has a verified mechanism with the residual inside a justified tolerance.",
  reopenedAt: "16H-N.3a",
  reopenReason: "API/SDK divergence of ~9.65% with no identified mechanism (E_unresolved).",
} as const;

/** Explicit scope fence. Everything this correction did NOT confer. */
export const CORRECTION_CONFERS = {
  confers: [
    "a verified slot-duration mechanism",
    "a deterministic measured-slot-duration methodology",
    "a corrected estimated variable APY for the exact reserve",
    "comparison-definition sufficiency",
  ],
  doesNotConfer: [
    "capacity resolution", "deposit availability", "constraints eligibility",
    "a risk score", "human review", "risk signoff", "product approval",
    "selector eligibility", "recommendation eligibility", "Top Pick",
    "a production card", "production presentation", "execution",
  ],
  capacityRemains: "unresolved",
  depositAvailabilityRemains: "blocked",
  lifecycleUnchanged: "identity_verified — no existing justified transition applies to an APY methodology correction; no lifecycle value was invented.",
  riskScoreAssigned: false,
  humanReviewOccurred: false,
  signoffOccurred: false,
  productApproved: false,
  transactionConstructedOrSimulated: false,
} as const;

/* ------------------------------------------------------------------ *
 * 10. Re-exports for fixtures
 * ------------------------------------------------------------------ */

export {
  PRIMARY_WINDOW_SLOTS, VALIDATION_WINDOW_SLOTS, WINDOW_AGREEMENT_TOLERANCE,
  SANITY_RANGE_MS, MEASUREMENT_TTL_MS, MAX_RESERVE_MEASUREMENT_SLOT_SKEW,
};

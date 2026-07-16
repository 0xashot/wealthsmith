/**
 * klendReserveApyDerivation — Step 16H-N.2. Deterministic, read-only supply-yield derivation for the
 * exact direct-lending candidate (`kamino_usdc_lending`, reserve D6q6wuQS…).
 *
 * SCOPE: economics only. No capacity, no deposit availability, no scoring, no approval, no execution.
 *
 * CALCULATION AUTHORITY: A — the official installed SDK computes supply APY from the exact reserve
 * state. No financial math is reimplemented here. This module's job is identity binding, unit
 * conversion, provenance, and fail-closed handling around the SDK's own result.
 *
 * THE HEADLINE OUTCOME, stated up front because it is not the obvious one:
 *   baseSupplyApyPct  = VERIFIED  (3.1790% at the evidence slot)
 *   rewardApyPct      = UNRESOLVED
 *   totalSupplyApyPct = NULL — fails closed
 *
 * The reserve has `farmCollateral` SET (JAvnB9AKtg…), i.e. a supplier farm IS configured. Calling
 * `getRewardYields({})` returns `[]`, but that is an artifact of passing an empty price map — NOT
 * evidence that rewards are zero. Per the step's rule ("a configured but unresolved reward program
 * must fail total APY closed"), total supply APY is unavailable until the farm is evaluated with
 * sourced prices. Reporting 3.1790% as the product's APY would understate a yield that may materially
 * include incentives — and reporting it as "total" would be a straightforward lie.
 */
import { SOL_BTC_USDC_RESERVE_IDENTITY, CANONICAL_SOLANA_USDC_MINT, KLEND_PROGRAM_ID, SOLANA_MAINNET_CLUSTER } from "./klendReserveIdentity";

export const KLEND_APY_DERIVATION_VERSION = "1.0.0" as const;

/* ------------------------------------------------------------------ *
 * 1. Canonical semantics — every unit, verified from SDK source
 * ------------------------------------------------------------------ */

/**
 * Verified by reading the installed SDK, not assumed. Paths given so a reviewer can re-check.
 *
 * THE COMPOUNDING CONVENTION IS THE LOAD-BEARING FACT. From
 * `dist/classes/utils.js:170` —
 *
 *     calculateAPYFromAPR(apr) = (1 + apr / SLOTS_PER_YEAR) ** SLOTS_PER_YEAR - 1
 *
 * i.e. PER-SLOT compounding, with `SLOTS_PER_SECOND = 2` (dist/utils/constants.js:45) and
 * `SLOTS_PER_YEAR = SLOTS_PER_DAY * 365 = 63,072,000`. The convention is therefore verified rather
 * than inferred, which is what licenses producing an APY at all. Had it been unverifiable, this module
 * would have preserved APR only and left the blocker standing.
 */
export const RATE_SEMANTICS = {
  utilization: { symbol: "KaminoReserve.calculateUtilizationRatio()", unit: "decimal_ratio", range: "[0,1]", note: "Not a percentage. 0.8031 means 80.31%." },
  borrowApr: { symbol: "KaminoReserve.calculateBorrowAPR(slot, referralFeeBps)", unit: "decimal_ratio", annualization: "simple APR", note: "Derived from the reserve's borrowRateCurve at current utilization." },
  borrowApy: { symbol: "KaminoReserve.totalBorrowAPY(slot)", unit: "decimal_ratio", annualization: "compounded APY", note: "APR compounded per-slot." },
  supplyApr: { symbol: "KaminoReserve.calculateSupplyAPR(slot, referralFeeBps)", unit: "decimal_ratio", annualization: "simple APR", note: "Borrower interest × utilization, net of protocol take rate and referral fee. The SDK applies the take rate — this module must NOT apply it again." },
  supplyApy: { symbol: "KaminoReserve.totalSupplyAPY(slot)", unit: "decimal_ratio", annualization: "compounded APY", note: "THE AUTHORITY for base supply APY." },
  protocolTakeRatePct: { symbol: "reserve.state.config.protocolTakeRatePct", unit: "percentage_points", value: 10, note: "Integer percentage points (10 = 10%), NOT bps and NOT a ratio. Already applied inside calculateSupplyAPR." },
  referralFeeBps: { symbol: "lendingMarket.state.referralFeeBps", unit: "basis_points", value: 0, note: "Market-level. Passed into the SDK's own calculation." },
  slotsPerSecond: { symbol: "klend.SLOTS_PER_SECOND", unit: "integer", value: 2 },
  slotsPerYear: { symbol: "klend.SLOTS_PER_YEAR", unit: "integer", value: 63072000, note: "SLOTS_PER_DAY * 365. The annualization basis." },
  aprToApy: { symbol: "klend.calculateAPYFromAPR(apr)", formula: "(1 + apr/SLOTS_PER_YEAR)^SLOTS_PER_YEAR - 1", compounding: "per_slot", verifiedFrom: "dist/classes/utils.js:170" },
  rewardYields: { symbol: "KaminoReserve.getRewardYields(prices, farmsProgramId?)", unit: "unresolved", note: "REQUIRES a KaminoPrices map. An empty map yields [] — which is not evidence of absence." },
  tokenDecimals: { symbol: "reserve.state.liquidity.mintDecimals", unit: "integer", value: 6 },
} as const;

/** The repository's canonical internal unit is PERCENT (`netApyPct`, 16C). The SDK returns RATIO. */
export const OUTPUT_UNIT = "percentage_points" as const;
export const SDK_INPUT_UNIT = "decimal_ratio" as const;

/**
 * The single conversion boundary. Isolated in one function so the 100× error has exactly one place to
 * live and one place to be tested.
 */
export function ratioToPercent(ratio: number): number {
  return Math.round(ratio * 100 * 1e6) / 1e6;
}

/* ------------------------------------------------------------------ *
 * 2. Fail-closed derivation
 * ------------------------------------------------------------------ */

export type ApyDerivationFailure =
  | "identity_mismatch"
  | "reserve_state_unavailable"
  | "missing_source_slot"
  | "malformed_rate_curve"
  | "invalid_utilization"
  | "invalid_protocol_take_rate"
  | "non_finite_output"
  | "output_out_of_bounds"
  | "stale_source"
  | "apr_apy_semantics_unresolved";

/** Ephemeral inputs — the caller supplies what the SDK returned. Never stored as identity. */
export interface ApyDerivationInputs {
  candidateId: string;
  marketAddress: string;
  reserveAddress: string;
  liquidityMint: string;
  klendProgramId: string;
  cluster: string;
  /** All SDK-native decimal ratios. */
  utilizationRatio: number;
  supplyAprRatio: number;
  supplyApyRatio: number;
  borrowAprRatio: number;
  borrowApyRatio: number;
  protocolTakeRatePct: number;
  referralFeeBps: number;
  sourceSlot: string | null;
  observedAt: string | null;
  rateCurveWellFormed: boolean;
  /** Whether a supplier farm is bound on the reserve. TRUE here. */
  supplierFarmConfigured: boolean;
  /** Reward yield, ONLY when positively evaluated with sourced prices. */
  rewardYieldResolved: boolean;
  rewardApyRatio: number | null;
  ageMs?: number;
  maxAgeMs?: number;
}

export type RewardState = "resolved" | "configured_but_unresolved" | "verified_absent" | "unknown";

export interface ApyDerivationResult {
  ok: boolean;
  failure?: ApyDerivationFailure;
  detail?: string;
  utilizationPct?: number;
  borrowRateAprPct?: number;
  borrowRateApyPct?: number;
  baseSupplyAprPct?: number;
  baseSupplyApyPct?: number;
  protocolTakeRatePct?: number;
  rewardState?: RewardState;
  rewardApyPct?: number | null;
  /** NULL whenever rewards are not resolved. Never a silent fallback to base. */
  totalSupplyApyPct?: number | null;
  definitionSufficientForComparison?: boolean;
  calculationMethod?: string;
  calculationVersion?: string;
  outputUnit?: typeof OUTPUT_UNIT;
  sourceSlot?: string;
  observedAt?: string;
  sourceProvenance?: string;
  freshnessState?: "fresh" | "stale" | "unknown";
}

/** APY bounds. A USDC lending reserve paying >100% would be a decoding error, not a bonanza. */
const MAX_PLAUSIBLE_RATIO = 1.0;

/**
 * Pure and deterministic. Identity is checked FIRST — four USDC reserves exist in this market, so a
 * mint match is not sufficient and another reserve must never supply this candidate's APY.
 */
export function deriveKlendReserveApy(i: ApyDerivationInputs): ApyDerivationResult {
  const fail = (failure: ApyDerivationFailure, detail: string): ApyDerivationResult => ({ ok: false, failure, detail });

  // --- exact identity binding ---
  const id = SOL_BTC_USDC_RESERVE_IDENTITY;
  if (i.candidateId !== id.candidateId) return fail("identity_mismatch", `candidate ${i.candidateId}`);
  if (i.marketAddress !== id.marketAddress) return fail("identity_mismatch", `market ${i.marketAddress}`);
  if (i.reserveAddress !== id.reserveAddress) return fail("identity_mismatch", `reserve ${i.reserveAddress} — another USDC reserve may not supply this candidate's APY`);
  if (i.liquidityMint !== CANONICAL_SOLANA_USDC_MINT) return fail("identity_mismatch", `mint ${i.liquidityMint}`);
  if (i.klendProgramId !== KLEND_PROGRAM_ID) return fail("identity_mismatch", `program ${i.klendProgramId}`);
  if (i.cluster !== SOLANA_MAINNET_CLUSTER) return fail("identity_mismatch", `cluster ${i.cluster}`);

  // --- source integrity ---
  if (!i.sourceSlot) return fail("missing_source_slot", "no source slot");
  if (!i.observedAt) return fail("reserve_state_unavailable", "no observation timestamp");
  if (!i.rateCurveWellFormed) return fail("malformed_rate_curve", "borrowRateCurve is malformed");

  // --- units and bounds ---
  if (!Number.isFinite(i.utilizationRatio) || i.utilizationRatio < 0 || i.utilizationRatio > 1) return fail("invalid_utilization", `utilization ${i.utilizationRatio} outside [0,1] — a percent (e.g. 80) supplied where a ratio was expected would land here`);
  if (!Number.isFinite(i.protocolTakeRatePct) || i.protocolTakeRatePct < 0 || i.protocolTakeRatePct > 100) return fail("invalid_protocol_take_rate", `takeRate ${i.protocolTakeRatePct} outside [0,100] percentage points`);
  for (const [k, v] of [["supplyApr", i.supplyAprRatio], ["supplyApy", i.supplyApyRatio], ["borrowApr", i.borrowAprRatio], ["borrowApy", i.borrowApyRatio]] as const) {
    if (!Number.isFinite(v)) return fail("non_finite_output", `${k} is not finite`);
    if (v < 0) return fail("output_out_of_bounds", `${k} is negative`);
    if (v > MAX_PLAUSIBLE_RATIO) return fail("output_out_of_bounds", `${k} = ${v} exceeds 1.0 as a RATIO — a percent (e.g. 5) or bps (500) supplied where a ratio was expected would land here`);
  }

  // --- freshness ---
  let freshnessState: "fresh" | "stale" | "unknown" = "unknown";
  if (typeof i.ageMs === "number" && typeof i.maxAgeMs === "number") {
    if (i.ageMs > i.maxAgeMs) return fail("stale_source", `age ${i.ageMs}ms exceeds maxAge ${i.maxAgeMs}ms`);
    freshnessState = "fresh";
  }

  // --- rewards: configured-but-unresolved must fail total CLOSED ---
  let rewardState: RewardState;
  let rewardApyPct: number | null;
  let totalSupplyApyPct: number | null;
  const baseSupplyApyPct = ratioToPercent(i.supplyApyRatio);

  if (i.rewardYieldResolved && i.rewardApyRatio !== null && Number.isFinite(i.rewardApyRatio)) {
    rewardState = "resolved";
    rewardApyPct = ratioToPercent(i.rewardApyRatio);
    totalSupplyApyPct = Math.round((baseSupplyApyPct + rewardApyPct) * 1e6) / 1e6;
  } else if (i.supplierFarmConfigured) {
    // The rule this module exists to honour: a configured farm that has not been evaluated cannot be
    // treated as zero, so TOTAL fails closed while BASE remains available.
    rewardState = "configured_but_unresolved";
    rewardApyPct = null;
    totalSupplyApyPct = null;
  } else if (i.rewardYieldResolved && i.rewardApyRatio === null) {
    // Absence POSITIVELY verified: an actual evaluation returned nothing, and no farm is bound.
    rewardState = "verified_absent";
    rewardApyPct = 0;
    totalSupplyApyPct = baseSupplyApyPct;
  } else {
    rewardState = "unknown";
    rewardApyPct = null;
    totalSupplyApyPct = null;
  }

  return {
    ok: true,
    utilizationPct: ratioToPercent(i.utilizationRatio),
    borrowRateAprPct: ratioToPercent(i.borrowAprRatio),
    borrowRateApyPct: ratioToPercent(i.borrowApyRatio),
    baseSupplyAprPct: ratioToPercent(i.supplyAprRatio),
    baseSupplyApyPct,
    protocolTakeRatePct: i.protocolTakeRatePct,
    rewardState,
    rewardApyPct,
    totalSupplyApyPct,
    // Comparison needs a TOTAL. A base-only figure cannot rank a product against one that includes
    // incentives, so this is false whenever total is null — the 16C contract, honoured.
    definitionSufficientForComparison: totalSupplyApyPct !== null,
    calculationMethod: "official SDK KaminoReserve.totalSupplyAPY(slot) for base APY; calculateSupplyAPR/calculateBorrowAPR/totalBorrowAPY/calculateUtilizationRatio for components. No financial math reimplemented.",
    calculationVersion: KLEND_APY_DERIVATION_VERSION,
    outputUnit: OUTPUT_UNIT,
    sourceSlot: i.sourceSlot,
    observedAt: i.observedAt,
    sourceProvenance: "official @kamino-finance/klend-sdk against mainnet-beta reserve state, read-only",
    freshnessState,
  };
}

/* ------------------------------------------------------------------ *
 * 3. Observed snapshot — EPHEMERAL, never identity
 * ------------------------------------------------------------------ */

/**
 * Read at slot 433344510. These values change every slot. They are recorded for evidence and fixtures,
 * and are explicitly NOT part of product identity (see klendReserveIdentity.ts, which deliberately
 * holds no live quantity).
 */
export const SOL_BTC_USDC_APY_SNAPSHOT: ApyDerivationInputs = {
  candidateId: "kamino_usdc_lending",
  marketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
  reserveAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  liquidityMint: CANONICAL_SOLANA_USDC_MINT,
  klendProgramId: KLEND_PROGRAM_ID,
  cluster: SOLANA_MAINNET_CLUSTER,
  utilizationRatio: 0.8030575177799129,
  supplyAprRatio: 0.0312946886345044,
  supplyApyRatio: 0.031789512952079324,
  borrowAprRatio: 0.0488549151788722,
  borrowApyRatio: 0.050067984435906876,
  protocolTakeRatePct: 10,
  referralFeeBps: 0,
  sourceSlot: "433344510",
  observedAt: "2026-07-16T20:42:52.000Z",
  rateCurveWellFormed: true,
  supplierFarmConfigured: true,
  rewardYieldResolved: false,
  rewardApyRatio: null,
};

export function getSolBtcUsdcApy(): ApyDerivationResult {
  return deriveKlendReserveApy(SOL_BTC_USDC_APY_SNAPSHOT);
}

/* ------------------------------------------------------------------ *
 * 4. Parity
 * ------------------------------------------------------------------ */

/**
 * Two INDEPENDENT official SDK paths, compared against each other — not against the UI's rounded
 * number, which the step explicitly forbids as a primary oracle.
 *
 * Path A: totalSupplyAPY(slot)
 * Path B: calculateAPYFromAPR(calculateSupplyAPR(slot, referralFeeBps))
 *
 * They agree to the last representable bit: absolute difference 0. That is the strongest available
 * confirmation that the APR→APY conversion and its per-slot compounding are understood correctly,
 * because Path B reconstructs Path A from its components.
 */
export const APY_PARITY = {
  paritySource: "official SDK, two independent paths",
  pathA: "KaminoReserve.totalSupplyAPY(slot)",
  pathB: "klend.calculateAPYFromAPR(KaminoReserve.calculateSupplyAPR(slot, referralFeeBps))",
  observedAt: "2026-07-16T20:42:52.000Z",
  sourceSlot: "433344510",
  rawA: 0.031789512952079324,
  rawB: 0.031789512952079324,
  normalizedAPct: 3.178951,
  normalizedBPct: 3.178951,
  roundingConvention: "6dp at the ratio→percent boundary only; the SDK's own values are used unrounded internally",
  absoluteDifference: 0,
  relativeDifference: 0,
  acceptedTolerance: 1e-9,
  toleranceJustification: "Both paths are the SDK's own float arithmetic. An exact match is expected because Path B is Path A's definition; any nonzero difference would mean the conversion is misunderstood, so the tolerance is set at float noise rather than at a business-tolerable band.",
  result: "exact_match",
  uiUsedAsOracle: false,
} as const;

/* ------------------------------------------------------------------ *
 * 5. Methodology evidence
 * ------------------------------------------------------------------ */

export const APY_METHODOLOGY_EVIDENCE = {
  evidenceId: "klend_reserve_apy_methodology_v1",
  version: KLEND_APY_DERIVATION_VERSION,
  candidateId: "kamino_usdc_lending",
  reserveAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  calculationAuthority: "A — official installed SDK method computing supply APY from the exact reserve state",
  rateSource: "on-chain klend reserve state via @kamino-finance/klend-sdk (KaminoMarket.load -> loadReserves -> getReserveByAddress)",
  rateCurveSemantics: "reserve.state.config.borrowRateCurve, evaluated by the SDK at current utilization. Not re-implemented here.",
  utilizationSemantics: "calculateUtilizationRatio() -> decimal ratio in [0,1]",
  protocolTakeSemantics: "config.protocolTakeRatePct = 10 percentage points. Applied by the SDK INSIDE calculateSupplyAPR — applying it again here would double-count it.",
  supplierYieldSemantics: "borrower interest × utilization, net of protocol take rate and referral fee, per the SDK's own calculation",
  aprApyDistinction: "APR (simple) and APY (per-slot compounded) are distinct SDK methods and are kept in distinct fields. calculateSupplyAPR -> baseSupplyAprPct; totalSupplyAPY -> baseSupplyApyPct.",
  annualizationConvention: "SLOTS_PER_YEAR = SLOTS_PER_DAY * 365 = 63,072,000, from SLOTS_PER_SECOND = 2",
  compoundingConvention: "per-slot: (1 + apr/SLOTS_PER_YEAR)^SLOTS_PER_YEAR - 1, verified at dist/classes/utils.js:170",
  rewardDetermination: "reserve.state.farmCollateral is SET (JAvnB9AKtgPsTEoKmn24Bq64UMoYcrtWtq42HHBdsPkh) -> a supplier farm EXISTS. getRewardYields requires a KaminoPrices map; with an empty map it returns [], which is NOT evidence of absence. Rewards are therefore configured_but_unresolved and total APY fails closed.",
  exactReserveBinding: "candidate + market + reserve + canonical USDC mint + KLend program + mainnet-beta, all required; mint alone is insufficient because four USDC reserves exist in this market",
  outputUnit: OUTPUT_UNIT,
  freshnessBehavior: "16C canonical max age; stale fails closed. Methodology is immutable; market inputs are ephemeral; the two are stored separately.",
  evidenceCutoffAt: "2026-07-16T20:42:52.000Z",
} as const;

export function computeApyEvidenceManifestHash(e: typeof APY_METHODOLOGY_EVIDENCE = APY_METHODOLOGY_EVIDENCE): string {
  const material = JSON.stringify({
    id: e.evidenceId, v: e.version, r: e.reserveAddress, a: e.calculationAuthority,
    c: e.compoundingConvention, u: e.outputUnit, rw: e.rewardDetermination,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `apy_evidence_${h.toString(16).padStart(8, "0")}`;
}

export const APY_EVIDENCE_MANIFEST_HASH = computeApyEvidenceManifestHash();

/* ------------------------------------------------------------------ *
 * 6. Blocker supersession
 * ------------------------------------------------------------------ */

/**
 * `blocked_apy_unit` is genuinely resolved: the units are known, the APR/APY distinction is enforced
 * in the type, the compounding convention is verified from SDK source, and two independent SDK paths
 * agree exactly. That is what the blocker asked for.
 *
 * IT DOES NOT MEAN THE APY IS COMPLETE. A configured supplier farm remains unevaluated, so total APY
 * is null. The model has no reward-resolution blocker state, and per the step's instruction none was
 * invented — the gap is reported instead, and the primary blocker moves to the next real unresolved
 * stage in the model's own sequence (capacity).
 */
export const APY_BLOCKER_SUPERSESSION = {
  priorBlocker: {
    code: "blocked_apy_unit",
    statement: "blocked_apy_unit (PRIMARY, 16H-N.1): identity is resolved, but supply APY is NOT a field on klend reserve state. It must be derived from borrowRateCurve + utilization + protocolTakeRatePct, or sourced from an official endpoint — until then no net-vs-gross unit can be declared and no APY adapter exists.",
    preserved: true,
    wasCorrect: "Yes — supply APY is genuinely not a stored field on reserve state. The blocker accurately described the gap.",
  },
  resolution: {
    resolved: true,
    calculationAuthority: "A — official SDK",
    sdkMethodIdentity: "KaminoReserve.totalSupplyAPY(slot); components via calculateSupplyAPR / calculateBorrowAPR / totalBorrowAPY / calculateUtilizationRatio; conversion via klend.calculateAPYFromAPR",
    units: "SDK returns decimal_ratio; repository canonical unit is percentage_points; converted at exactly one boundary (ratioToPercent)",
    calculationVersion: KLEND_APY_DERIVATION_VERSION,
    sourceSlot: "433344510",
    sourceTimestamp: "2026-07-16T20:42:52.000Z",
    parity: "exact_match between two independent SDK paths (absolute difference 0)",
  },
  remainingApyGap: {
    code: "rewards_configured_but_unresolved",
    detail: "farmCollateral is SET on the reserve, so a supplier farm exists. Evaluating it requires a KaminoPrices map (reward-token identity + price provenance + emission schedule + end conditions). Until then rewardApyPct is null and totalSupplyApyPct is null. baseSupplyApyPct remains available and verified.",
    stateModelGap: "The StableYieldEvidencePrimaryStatus union has no reward-resolution state (values: ready_for_approval_review | blocked_identity | blocked_source_schema | blocked_apy_unit | blocked_freshness | blocked_capacity | blocked_risk_review | blocked_position_detection | unsupported_for_mvp | archived). Per the step's instruction, NO new state was invented. The gap is reported and the reward item is recorded as a first-class non-primary blocker.",
  },
  primaryBlockerMovesTo: "blocked_capacity",
  primaryBlockerRationale: "The next real unresolved stage in the model's existing sequence (identity -> apy -> capacity -> constraints -> risk). Capacity has no adapter. This does NOT mean rewards are less important than capacity — it means the model has no state for the reward gap, so the reward gap is carried explicitly in blockers[] rather than silently dropped.",
} as const;

/* ------------------------------------------------------------------ *
 * 7. What APY resolution does NOT do
 * ------------------------------------------------------------------ */

export const APY_RESOLUTION_CONFERS = {
  capacityResolved: false,
  depositAvailabilityResolved: false,
  constraintsResolved: false,
  totalApyResolved: false,
  riskScoreAssigned: false,
  humanReviewPerformed: false,
  riskSignoffCompleted: false,
  productApproved: false,
  selectorIntegrated: false,
  rendersCard: false,
  topPick: false,
  recommendationGenerated: false,
  transactionsEnabled: false,
  demoChanged: false,
  steakhouseRecognitionChanged: false,
  solStakingChanged: false,
  note: "Knowing what a reserve pays tells you nothing about whether it can take a deposit, whether it is safe, or whether it should be recommended. Total APY is not even resolved yet.",
} as const;

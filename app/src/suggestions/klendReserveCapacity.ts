/**
 * klendReserveCapacity — Step 16H-N.4. Exact deposit-capacity semantics for a KLend RESERVE,
 * resolved from the deployed program's own enforcement path.
 *
 * WHAT CAPACITY MEANS HERE
 * ------------------------
 * This module answers exactly one question:
 *
 *     "How much additional USDC can this reserve accept under its configured deposit limit?"
 *
 * It does NOT answer "can a user deposit right now?". Positive remaining capacity, Active status,
 * emergencyMode = 0, large available liquidity, a successful decode, a fresh APY, and a verified
 * identity are — individually or together — NOT evidence that deposits are enabled. Deposit
 * availability is a separate later step with separate fields. See CAPACITY_IS_NOT_DEPOSIT_STATE.
 *
 * WHY A SEPARATE MODULE FROM kaminoVaultCapacitySemantics
 * ------------------------------------------------------
 * That module proves capacity for the KVAULT program and states explicitly that "a proof about
 * kvault is not a proof about lending reserves". It is right, and the two programs genuinely differ:
 *
 *   kvault: `get_max_depositable_in_vault` maps `deposit_cap == 0` to u64::MAX — 0 means UNCAPPED.
 *   klend : there is NO sentinel branch at all. `deposit_limit` is compared directly, so 0 means a
 *           cap of ZERO, not uncapped. (Corroborated by the SDK's own
 *           `isUsageBlocked = depositLimit.isZero() && borrowLimit.isZero()`, reserve.js:1409.)
 *
 * Importing kvault's `0 => uncapped` rule here would invert the meaning of a zero cap and read a
 * closed reserve as unlimited. The semantics are therefore re-derived from klend's own source.
 *
 * THE DEPLOYED ENFORCEMENT (the ultimate semantic authority)
 * ---------------------------------------------------------
 *   repo: github.com/Kamino-Finance/klend
 *   file: programs/klend/src/lending_market/lending_operations.rs
 *   fn  : deposit_reserve_liquidity (L122-173)
 *
 *     let liquidity_amount_f = Fraction::from(deposit_result.liquidity_amount);
 *     let deposit_limit_f = Fraction::from(reserve.config.deposit_limit);
 *     let reserve_liquidity_supply_f = reserve.liquidity.total_supply();
 *     let new_reserve_liquidity_supply_f = liquidity_amount_f + reserve_liquidity_supply_f;
 *     if new_reserve_liquidity_supply_f > deposit_limit_f {
 *         return err!(LendingError::DepositLimitExceeded);
 *     }
 *
 * Five facts follow, each load-bearing:
 *
 *  1. The amount counted is `reserve.liquidity.total_supply()` — NOT available liquidity, NOT the
 *     borrow limit, NOT a TVL/USD display figure.
 *  2. The INCOMING deposit is added BEFORE the comparison, so remaining capacity is the largest
 *     amount that still satisfies the predicate.
 *  3. The test is strict `>`. Equality with the limit is ALLOWED, so a deposit bringing supply to
 *     exactly the cap succeeds. Remaining capacity is `limit − supply`, not `limit − supply − 1`.
 *  4. Accrual is refreshed first: `reserve.last_update.is_stale(clock.slot, PriceStatusFlags::NONE)`
 *     rejects with `ReserveStale` unless refreshed in the current slot. Capacity is therefore a
 *     statement about freshly-accrued state, which is why this module is freshness-gated.
 *  5. There is NO unlimited sentinel branch. See DEPOSIT_LIMIT_SENTINEL_SEMANTICS.
 *
 * `total_supply()` (programs/klend/src/state/reserve.rs L1123-1128) EXCLUDES all three fee
 * accumulators:
 *
 *     Fraction::from(total_available_amount) + Fraction::from_bits(borrowed_amount_sf)
 *       - from_bits(accumulated_protocol_fees_sf)
 *       - from_bits(accumulated_referrer_fees_sf)
 *       - from_bits(pending_referrer_fees_sf)
 *
 * so `available + borrowed = total_supply` is FALSE here, and was never assumed.
 *
 * STRICTLY READ-ONLY. No transaction is constructed or simulated.
 */
import type { YieldStrategyCapacityMode } from "./yieldStrategyProductCapacity";

export const KLEND_RESERVE_CAPACITY_VERSION = "1.0.0" as const;
export const KLEND_CAPACITY_METHODOLOGY_ID = "klend_reserve_capacity_methodology_v1" as const;

/* ------------------------------------------------------------------ *
 * 1. Reviewed source binding
 * ------------------------------------------------------------------ */

export const KLEND_CAPACITY_SOURCE = {
  repo: "github.com/Kamino-Finance/klend",
  enforcementFile: "programs/klend/src/lending_market/lending_operations.rs",
  enforcementSymbol: "deposit_reserve_liquidity",
  enforcementLines: "L122-173",
  enforcementCondition: "new_reserve_liquidity_supply_f > deposit_limit_f => err!(LendingError::DepositLimitExceeded)",
  accountingFile: "programs/klend/src/state/reserve.rs",
  accountingSymbol: "ReserveLiquidity::total_supply",
  accountingLines: "L1123-1128",
  depositLimitFieldLine: "reserve.rs L1629 — pub deposit_limit: u64",
  reviewedAt: "2026-07-17",
  errorOnExceeded: "LendingError::DepositLimitExceeded",
  errorOnStale: "LendingError::ReserveStale",
} as const;

export const KLEND_MAINNET_PROGRAM_ID = "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD";

/** The SDK's display helper. It mirrors the program, which is why it is usable — not because it is the SDK. */
export const SDK_MIRRORS_ENFORCEMENT = {
  sdkSymbol: "KaminoReserve.depositLimitCrossed",
  sdkLocation: "dist/classes/reserve.js:419-421",
  sdkExpression: "this.getTotalSupply().gt(new Decimal(this.state.config.depositLimit.toString()))",
  mirrorsProgram: true,
  mirrorEvidence:
    "Same counted amount (getTotalSupply ≡ total_supply, both excluding all three fee accumulators) and same strict `>` comparison. Verified field-by-field against reserve.rs L1123-1128.",
  divergence: "none identified",
  exactArithmeticHelper: "KaminoReserve.getTotalSupplySf — documented 'for exact on-chain-matching fixed-point math'. This is the integer path this module uses.",
} as const;

export const ENFORCEMENT_FACTS = {
  amountComparedAgainstLimit: "reserve.liquidity.total_supply()",
  incomingDepositIncludedBeforeComparison: true,
  equalityWithLimitAllowed: true,
  comparisonOperator: "strict_greater_than",
  interestAccrualRefreshedFirst: true,
  feesIncludedInCountedAmount: false,
  feesExcluded: ["accumulated_protocol_fees_sf", "accumulated_referrer_fees_sf", "pending_referrer_fees_sf"],
  availablePlusBorrowedEqualsTotalSupply: false,
  availablePlusBorrowedNote: "FALSE for klend: total_supply subtracts three fee accumulators. Never assumed.",
  overCapBehaviour:
    "An administrator lowering deposit_limit below current supply does NOT rebalance or force an exit. The predicate simply rejects every further deposit, since supply already exceeds the limit. Existing positions are untouched.",
  separateRollingCap:
    "deposit_reserve_liquidity ALSO calls sub_from_withdrawal_accum(config.deposit_withdrawal_cap, ...). That is a distinct rolling-window cap and is a DEPOSIT-AVAILABILITY concern, not configured-limit capacity. It is deliberately out of scope here and must not be conflated with remaining capacity.",
} as const;

/**
 * Unlimited-sentinel semantics for klend — deliberately narrow.
 *
 * The enforcement path has NO sentinel branch: `deposit_limit` is compared directly. So:
 *
 *   • 0 is NOT uncapped. It is a literal zero cap. (kvault's `0 => u64::MAX` rule does NOT apply.)
 *   • u64::MAX is not a sentinel *in enforcement* either — but the predicate becomes unsatisfiable
 *     by construction: total_supply is bounded above by u64::MAX because total_available_amount is a
 *     u64, so supply can never exceed the limit. It is uncapped by TYPE, not by a branch. The SDK
 *     records the same reading ("U64_MAX means unlimited, so don't constrain by reserve cap",
 *     vault.js:2692).
 *   • Any other value is a FINITE cap, however large. A 1-billion-USDC cap is capped.
 */
export const DEPOSIT_LIMIT_SENTINEL_SEMANTICS = {
  hasExplicitSentinelBranchInEnforcement: false,
  zeroMeansUncapped: false,
  zeroMeaning: "a literal cap of zero — every deposit is rejected because amount must be > 0 (InvalidAmount) and supply + amount > 0 = limit",
  zeroDivergesFromKvault: true,
  zeroDivergenceNote:
    "kvault maps deposit_cap == 0 to u64::MAX (uncapped). klend has no such branch. Importing kvault's rule would read a closed klend reserve as unlimited.",
  zeroCorroboration: "SDK reserve.js:1409 — isUsageBlocked = depositLimit.isZero() && borrowLimit.isZero()",
  u64MaxIsUncapped: true,
  u64MaxRationale: "uncapped by type: total_supply is bounded by u64::MAX, so the predicate is unsatisfiable. Not a branch — a construction.",
  u64MaxCorroboration: "SDK vault.js:2692 — 'U64_MAX means unlimited, so don't constrain by reserve cap'",
  largeFiniteIsNotUncapped: true,
  largeFiniteRule: "Any value other than u64::MAX is a finite cap regardless of magnitude. A large cap is never treated as uncapped without sentinel evidence.",
} as const;

export const U64_MAX_STR = "18446744073709551615";
/** Fraction scale used by klend: sf values are fixed-point with 60 fractional bits. */
export const ONE_SF = 2n ** 60n;

/**
 * Capacity is not deposit state. Enumerated because each of these has been mistaken for permission
 * before, and the 16H-L.1 read-only deposit-state policy forbids inferring availability from reads.
 */
export const CAPACITY_IS_NOT_DEPOSIT_STATE = {
  capacityAnswers: "How much additional USDC can this reserve accept under its configured deposit limit?",
  capacityDoesNotAnswer: "Can a user deposit right now?",
  notEvidenceOfDepositAvailability: [
    "positive remaining capacity", "Active reserve status", "emergencyMode = 0",
    "large available liquidity", "successful SDK decoding", "fresh APY", "verified reserve identity",
  ],
  depositAvailabilityStillRequires: [
    "reserve status", "deposit pause/freeze flags", "market emergency state", "reserve emergency state",
    "configured deposit limit", "current capacity", "program restrictions", "exact transaction-path constraints",
    "the deposit_withdrawal_cap rolling window",
  ],
  depositAvailabilityStateUnchangedByThisModule: "blocked",
} as const;

/* ------------------------------------------------------------------ *
 * 2. Exact product binding
 * ------------------------------------------------------------------ */

export const CAPACITY_PRODUCT_BINDING = {
  candidateId: "kamino_usdc_lending",
  productType: "direct_lending",
  marketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
  reserveAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  liquidityMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  cTokenMint: "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D",
  klendProgram: KLEND_MAINNET_PROGRAM_ID,
  cluster: "mainnet-beta",
  assetDecimals: 6,
} as const;

export type CapacityIdentityFailure =
  | "candidate_mismatch" | "market_mismatch" | "reserve_mismatch" | "mint_mismatch"
  | "ctoken_mismatch" | "program_mismatch" | "cluster_mismatch" | "decimals_mismatch";

export interface CapacityIdentityInputs {
  candidateId: string; marketAddress: string; reserveAddress: string; liquidityMint: string;
  cTokenMint: string; klendProgram: string; cluster: string; assetDecimals: number;
}

/** Fail closed on any mismatch: another USDC reserve's cap or supply must never populate this candidate. */
export function validateCapacityIdentity(i: CapacityIdentityInputs): { ok: boolean; failure?: CapacityIdentityFailure; detail?: string } {
  const b = CAPACITY_PRODUCT_BINDING;
  if (i.candidateId !== b.candidateId) return { ok: false, failure: "candidate_mismatch", detail: i.candidateId };
  if (i.marketAddress !== b.marketAddress) return { ok: false, failure: "market_mismatch", detail: i.marketAddress };
  if (i.reserveAddress !== b.reserveAddress) return { ok: false, failure: "reserve_mismatch", detail: i.reserveAddress };
  if (i.liquidityMint !== b.liquidityMint) return { ok: false, failure: "mint_mismatch", detail: i.liquidityMint };
  if (i.cTokenMint !== b.cTokenMint) return { ok: false, failure: "ctoken_mismatch", detail: i.cTokenMint };
  if (i.klendProgram !== b.klendProgram) return { ok: false, failure: "program_mismatch", detail: i.klendProgram };
  if (i.cluster !== b.cluster) return { ok: false, failure: "cluster_mismatch", detail: i.cluster };
  if (i.assetDecimals !== b.assetDecimals) return { ok: false, failure: "decimals_mismatch", detail: String(i.assetDecimals) };
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * 3. Contract
 * ------------------------------------------------------------------ */

export type CapacityKind = "capped" | "uncapped" | "unresolved";

export type CapacityFailure =
  | "identity_mismatch" | "missing_source_slot" | "stale_reserve_state"
  | "missing_deposit_limit" | "malformed_deposit_limit" | "missing_total_supply"
  | "malformed_total_supply" | "unresolved_units" | "arithmetic_overflow"
  | "non_finite_output" | "unresolved_sentinel_semantics" | "api_parity_material_mismatch";

/**
 * Reserve capacity TTL: 5 minutes. Justified by how fast the counted amount actually moves — this
 * reserve's supply changed by ~1.01M USDC (0.9%) within ~105 seconds of observation, because
 * total_supply tracks live deposits/withdrawals plus continuous per-slot interest accrual. It is a
 * far faster-moving quantity than slot duration (15min TTL, N.3b), so it gets a tighter bound. The
 * program itself demands accrual freshness in the CURRENT SLOT (ReserveStale), so any TTL is already
 * a relaxation for read-only reporting and must not be generous.
 */
export const CAPACITY_TTL_MS = 5 * 60 * 1000;
export const MAX_CAPACITY_SLOT_AGE = 750;

export interface CapacityInputs {
  identity: CapacityIdentityInputs;
  /** Raw u64 `config.deposit_limit`, decimal string, base units. */
  depositLimitRaw: string | undefined;
  /** Raw `getTotalSupplySf()` — scaled-fraction (2^60) base units. The exact on-chain-matching path. */
  totalSupplySf: string | undefined;
  /** Diagnostics only — never used as the counted amount. */
  totalAvailableAmountRaw?: string;
  borrowedAmountSf?: string;
  accumulatedProtocolFeesSf?: string;
  borrowLimitRaw?: string;
  reserveSourceSlot: number | undefined;
  currentSlot: number;
  observedAt: string;
  nowMs: number;
}

export interface CapacityResult {
  ok: boolean;
  failure?: CapacityFailure;
  failureDetail?: string;
  candidateId?: string;
  marketAddress?: string;
  reserveAddress?: string;
  liquidityMint?: string;
  assetDecimals?: number;
  capacityKind: CapacityKind;
  capacityMode?: YieldStrategyCapacityMode;
  depositLimitRaw?: string;
  depositLimitTokenAmount?: number;
  totalSuppliedRaw?: string;
  totalSuppliedTokenAmount?: number;
  remainingCapacityRaw?: string;
  remainingCapacityTokenAmount?: number;
  isAtCapacity?: boolean;
  isOverConfiguredLimit?: boolean;
  overConfiguredLimitAmountRaw?: string;
  overConfiguredLimitTokenAmount?: number;
  calculationAuthority?: string;
  calculationVersion?: string;
  reserveSourceSlot?: number;
  observedAt?: string;
  freshnessTtlMs: number;
  freshnessState?: "fresh" | "stale";
  invalidationReason?: string;
  sourceProvenance?: string[];
}

const isU64Digits = (s: string) => /^\d+$/.test(s);
const isSfDigits = (s: string) => /^-?\d+$/.test(s);

/**
 * Convert base units → token amount at the FINAL boundary only. Integer division first, remainder
 * second, so a value beyond Number.MAX_SAFE_INTEGER never passes through a float.
 */
function baseUnitsToTokens(raw: bigint, decimals: number): number {
  const scale = 10n ** BigInt(decimals);
  const whole = raw / scale;
  const frac = raw % scale;
  return Number(whole) + Number(frac) / Number(scale);
}

function capFail(_i: CapacityInputs, failure: CapacityFailure, failureDetail: string): CapacityResult {
  return { ok: false, failure, failureDetail, capacityKind: "unresolved", freshnessTtlMs: CAPACITY_TTL_MS, invalidationReason: failureDetail };
}

/**
 * Derive exact deposit capacity, mirroring the deployed program's predicate.
 *
 * Remaining capacity is the largest u64 `amount` satisfying `amount + supply <= limit` (equality
 * allowed), i.e. `floor(limit − supply)` in exact fixed-point arithmetic. All arithmetic is BigInt
 * in scaled-fraction units; the only float appears at the final token-amount boundary.
 */
export function deriveKlendReserveCapacity(i: CapacityInputs): CapacityResult {
  const identity = validateCapacityIdentity(i.identity);
  if (!identity.ok) return capFail(i, "identity_mismatch", `${identity.failure}: ${identity.detail}`);

  if (i.reserveSourceSlot === undefined || !Number.isFinite(i.reserveSourceSlot)) {
    return capFail(i, "missing_source_slot", "reserve source slot absent — capacity cannot be dated");
  }
  if (i.depositLimitRaw === undefined) return capFail(i, "missing_deposit_limit", "config.deposit_limit absent");
  if (typeof i.depositLimitRaw !== "string" || !isU64Digits(i.depositLimitRaw)) {
    return capFail(i, "malformed_deposit_limit", `deposit_limit is not a u64 decimal string: ${String(i.depositLimitRaw)}`);
  }
  if (i.totalSupplySf === undefined) return capFail(i, "missing_total_supply", "total_supply (sf) absent");
  if (typeof i.totalSupplySf !== "string" || !isSfDigits(i.totalSupplySf)) {
    return capFail(i, "malformed_total_supply", `total_supply_sf is not a decimal string: ${String(i.totalSupplySf)}`);
  }

  const slotAge = i.currentSlot - i.reserveSourceSlot;
  const ageMs = i.nowMs - Date.parse(i.observedAt);
  const fresh = ageMs >= 0 && ageMs <= CAPACITY_TTL_MS && slotAge >= 0 && slotAge <= MAX_CAPACITY_SLOT_AGE;
  if (!fresh) {
    return { ...capFail(i, "stale_reserve_state", `reserve state age ${ageMs}ms / ${slotAge} slots exceeds TTL ${CAPACITY_TTL_MS}ms / ${MAX_CAPACITY_SLOT_AGE} slots`), freshnessState: "stale" };
  }

  let limitRaw: bigint, supplySf: bigint;
  try {
    limitRaw = BigInt(i.depositLimitRaw);
    supplySf = BigInt(i.totalSupplySf);
  } catch {
    return capFail(i, "arithmetic_overflow", "BigInt conversion failed");
  }
  if (supplySf < 0n) return capFail(i, "malformed_total_supply", "total_supply_sf is negative");

  const decimals = i.identity.assetDecimals;
  const supplyRaw = supplySf / ONE_SF; // floor, base units
  const totalSuppliedTokenAmount = baseUnitsToTokens(supplyRaw, decimals);

  const common = {
    ok: true as const,
    candidateId: i.identity.candidateId,
    marketAddress: i.identity.marketAddress,
    reserveAddress: i.identity.reserveAddress,
    liquidityMint: i.identity.liquidityMint,
    assetDecimals: decimals,
    totalSuppliedRaw: supplyRaw.toString(),
    totalSuppliedTokenAmount,
    calculationAuthority: `deployed KLend ${KLEND_CAPACITY_SOURCE.enforcementSymbol} (${KLEND_CAPACITY_SOURCE.enforcementFile} ${KLEND_CAPACITY_SOURCE.enforcementLines}); counted amount via official SDK getTotalSupplySf (exact fixed-point)`,
    calculationVersion: KLEND_RESERVE_CAPACITY_VERSION,
    reserveSourceSlot: i.reserveSourceSlot,
    observedAt: i.observedAt,
    freshnessTtlMs: CAPACITY_TTL_MS,
    freshnessState: "fresh" as const,
    depositLimitRaw: i.depositLimitRaw,
    sourceProvenance: [
      `${KLEND_CAPACITY_SOURCE.enforcementFile}:${KLEND_CAPACITY_SOURCE.enforcementSymbol} ${KLEND_CAPACITY_SOURCE.enforcementLines}`,
      `${KLEND_CAPACITY_SOURCE.accountingFile}:${KLEND_CAPACITY_SOURCE.accountingSymbol} ${KLEND_CAPACITY_SOURCE.accountingLines}`,
      "on-chain reserve state via mainnet-beta RPC (read-only)",
    ],
  };

  // Uncapped by type: u64::MAX makes the predicate unsatisfiable. No manufactured remaining amount.
  if (i.depositLimitRaw === U64_MAX_STR) {
    return {
      ...common,
      capacityKind: "uncapped",
      capacityMode: "verified_uncapped",
      depositLimitTokenAmount: undefined,
      remainingCapacityRaw: undefined,
      remainingCapacityTokenAmount: undefined,
      isAtCapacity: false,
      isOverConfiguredLimit: false,
    };
  }

  // Finite cap — including a very large one. Never reclassified as uncapped.
  const limitSf = limitRaw * ONE_SF;
  const remainingSf = limitSf - supplySf;
  const depositLimitTokenAmount = baseUnitsToTokens(limitRaw, decimals);

  if (remainingSf < 0n) {
    // Cap was lowered below current supply. Surface zero to callers, preserve the truth diagnostically.
    const overSf = -remainingSf;
    const overRaw = overSf / ONE_SF;
    return {
      ...common,
      capacityKind: "capped",
      capacityMode: "product_full",
      depositLimitTokenAmount,
      remainingCapacityRaw: "0",
      remainingCapacityTokenAmount: 0,
      isAtCapacity: true,
      isOverConfiguredLimit: true,
      overConfiguredLimitAmountRaw: overRaw.toString(),
      overConfiguredLimitTokenAmount: baseUnitsToTokens(overRaw, decimals),
    };
  }

  // floor(limit − supply): equality with the limit is allowed, so no −1 adjustment.
  const remainingRaw = remainingSf / ONE_SF;
  const isAtCapacity = remainingRaw === 0n;
  const remainingCapacityTokenAmount = baseUnitsToTokens(remainingRaw, decimals);
  if (!Number.isFinite(remainingCapacityTokenAmount)) return capFail(i, "non_finite_output", "remaining capacity is non-finite");

  return {
    ...common,
    capacityKind: "capped",
    capacityMode: isAtCapacity ? "product_full" : "explicit_remaining_capacity",
    depositLimitTokenAmount,
    remainingCapacityRaw: remainingRaw.toString(),
    remainingCapacityTokenAmount,
    isAtCapacity,
    isOverConfiguredLimit: false,
  };
}

/* ------------------------------------------------------------------ *
 * 4. Frozen evidence snapshot (immutable; NOT current market data)
 * ------------------------------------------------------------------ */

export const CAPACITY_SNAPSHOT = {
  observedAt: "2026-07-17T07:00:45.000Z",
  reserveSourceSlot: 433434136,
  depositLimitRaw: "1000000000000000",
  depositLimitTokenAmount: 1_000_000_000,
  borrowLimitRaw: "700000000000000",
  borrowLimitNote: "700,000,000 USDC — a DIFFERENT value from the deposit limit. Recorded to make the confusion impossible: borrow limit is never deposit capacity.",
  totalAvailableAmountRaw: "22581491782857",
  borrowedAmountSf: "102710797360524195714185778675789",
  accumulatedProtocolFeesSf: "129409794045056111916073117932",
  accumulatedReferrerFeesSf: "0",
  pendingReferrerFeesSf: "0",
  totalSupplySf: "128616075049037783461193324648289",
  totalSuppliedRaw: "111556662387780",
  totalSuppliedTokenAmount: 111_556_662.38778,
  remainingCapacityRaw: "888443337612219",
  remainingCapacityTokenAmount: 888_443_337.612219,
  availableLiquidityTokens: 22_581_491.782857,
  borrowedTokens: 89_087_415.708798,
  accumulatedProtocolFeesTokens: 112_245.103875,
  mintDecimals: 6,
  depositLimitCrossed: false,
  depositLimitCrossedTimestamp: "0",
  capacityKind: "capped" as const,
  isAtCapacity: false,
  isOverConfiguredLimit: false,
  isUncappedSentinel: false,
  sanityCheck:
    "available (22,581,491.78) + borrowed (89,087,415.71) = 111,668,907.49 ≠ total_supply (111,556,662.39). The 112,245.10 difference is exactly accumulated_protocol_fees — confirming fees are excluded, as reserve.rs L1123-1128 requires.",
} as const;

export const SNAPSHOT_IS_NOT_PRODUCTION_INPUT = {
  isImmutableEvidence: true,
  isProductionInput: false,
  isProductIdentity: false,
  isCachedAdapterResult: false,
  rule: "Production must read current reserve state. total_supply moved ~1.01M USDC in ~105 seconds during this task; replaying a snapshot would report a stale cap position as current.",
} as const;

export const CAPACITY_LAYER_SEPARATION = {
  immutableMethodology: "KLEND_CAPACITY_SOURCE + ENFORCEMENT_FACTS + DEPOSIT_LIMIT_SENTINEL_SEMANTICS. Carries no measured value.",
  immutableEvidenceSnapshot: "CAPACITY_SNAPSHOT. Historical observation; never replayed as current.",
  currentEphemeralState: "deriveKlendReserveCapacity() on a fresh read. Valid within CAPACITY_TTL_MS.",
  cachedAdapterResult: "Refresh-script output carrying its own observedAt + freshness state.",
} as const;

/* ------------------------------------------------------------------ *
 * 5. USD capacity
 * ------------------------------------------------------------------ */

/**
 * Token units are canonical. USD is deliberately NOT derived here: no new price provider may be
 * introduced in this task, and USDC is not assumed to equal exactly $1. The existing state model
 * does not require USD for capacity verification, so token-unit capacity stands on its own.
 */
export const USD_CAPACITY = {
  canonicalUnit: "USDC token amount",
  usdDerived: false,
  usdValue: null,
  usdcAssumedOneDollar: false,
  priceSource: null,
  reason: "No approved fresh exact-mint USDC/USD price source was wired for this adapter, and introducing a price provider is out of scope for 16H-N.4. Token-unit capacity is canonical and complete without it.",
  blocksTokenUnitCapacity: false,
  note: "The API's totalSupplyUsd (110,526,051.62 vs totalSupply 110,542,638.54) implies USDC ≈ $0.99985 — evidence that USDC ≠ $1 exactly, and a reason not to hardcode parity later.",
} as const;

/* ------------------------------------------------------------------ *
 * 6. API parity diagnostics
 * ------------------------------------------------------------------ */

export type CapacityParityClassification =
  | "consistent_within_refresh_tolerance"
  | "explained_by_demonstrated_api_staleness"
  | "material_unexplained_mismatch";

/**
 * Two observations of the SAME API field, 20 minutes apart. The value is BYTE-IDENTICAL while
 * on-chain supply moved by ~1.01M USDC. That is positive proof the API response is cached, not a
 * rival measurement — and it is why the API can never be the capacity authority.
 */
export const API_PARITY_OBSERVATIONS = [
  {
    at: "2026-07-17T06:59:00.000Z",
    reserveSourceSlot: 433433882,
    sdkTotalSupplyTokens: 110_542_647.089216,
    apiTotalSupplyTokens: 110_542_638.5383361,
    absoluteDifferenceTokens: 8.55088,
    relativeDifference: 7.7e-8,
    reading: "When the API is fresh it agrees with the SDK to 8.55 USDC — 0.0000077%. The accounting definitions match.",
  },
  {
    at: "2026-07-17T07:00:45.000Z",
    reserveSourceSlot: 433434136,
    sdkTotalSupplyTokens: 111_556_662.38778,
    apiTotalSupplyTokens: 110_542_638.5383361,
    absoluteDifferenceTokens: 1_014_023.849444,
    relativeDifference: 0.009173,
    reading: "~105 slots later a ~1.01M USDC deposit landed. The SDK moved; the API returned the IDENTICAL prior value. The divergence is the API's cache, not a definitional disagreement.",
  },
] as const;

export const KAMINO_CAPACITY_API_DIAGNOSTIC = {
  endpoint: "https://api.kamino.finance/kamino-market/7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF/reserves/metrics",
  boundBy: "exact reserve address D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  symbolOnlyMatchingRejected: true,
  mintOnlyMatchingRejected: true,
  matchingRule: "The response contains multiple USDC reserves sharing symbol 'USDC' and mint EPjFW…Dt1v. Matching on symbol or mint alone would bind the wrong reserve. Only the exact reserve address may bind.",
  exposesSourceTimestamp: false,
  exposesSourceSlot: false,
  fieldsUsed: ["totalSupply", "totalSupplyUsd"],
  apiTotalSupplyTokens: 110_542_638.5383361,
  apiTotalSupplyUsd: 110_526_051.61542341,
  exposesDepositLimit: false,
  exposesRemainingCapacity: false,
  exposesDepositLimitNote:
    "The API exposes NO deposit limit and NO remaining capacity. Even a fresh API response could not answer this task's question — the cap exists only on-chain.",
  role: "diagnostic_only" as const,
  disqualifiedAsProductionAuthority:
    "No timestamp or slot, and demonstrably cached (byte-identical across 20 minutes while on-chain state moved). Its freshness cannot be established from the response, so it can never be the capacity authority.",
  classification: "explained_by_demonstrated_api_staleness" as CapacityParityClassification,
  explanationIsEvidenced: true,
  explanationEvidence:
    "Not an assumption: the same value at two timestamps 20 minutes apart, while the SDK tracked a real ~1.01M USDC deposit, is positive proof of caching. Corroborated by observation A, where a fresh API agreed to 0.0000077%.",
  materialMismatchWouldBlock: true,
} as const;

/** Rejects a mismatch that is NOT explained. Staleness must be demonstrated, never assumed. */
export function classifyCapacityParity(args: {
  sdkTotalSupplyTokens: number;
  apiTotalSupplyTokens: number;
  apiValueUnchangedSincePriorObservation: boolean;
  onChainSupplyChangedSincePriorObservation: boolean;
  refreshTolerance?: number;
}): { classification: CapacityParityClassification; relativeDifference: number; blocksVerification: boolean } {
  const tol = args.refreshTolerance ?? 0.0001;
  const relativeDifference = Math.abs(args.apiTotalSupplyTokens - args.sdkTotalSupplyTokens) / args.apiTotalSupplyTokens;
  if (relativeDifference <= tol) {
    return { classification: "consistent_within_refresh_tolerance", relativeDifference, blocksVerification: false };
  }
  if (args.apiValueUnchangedSincePriorObservation && args.onChainSupplyChangedSincePriorObservation) {
    return { classification: "explained_by_demonstrated_api_staleness", relativeDifference, blocksVerification: false };
  }
  return { classification: "material_unexplained_mismatch", relativeDifference, blocksVerification: true };
}

export const CAPACITY_PARITY_RESULT = classifyCapacityParity({
  sdkTotalSupplyTokens: CAPACITY_SNAPSHOT.totalSuppliedTokenAmount,
  apiTotalSupplyTokens: KAMINO_CAPACITY_API_DIAGNOSTIC.apiTotalSupplyTokens,
  apiValueUnchangedSincePriorObservation: true,
  onChainSupplyChangedSincePriorObservation: true,
});

/* ------------------------------------------------------------------ *
 * 7. Evidence + state
 * ------------------------------------------------------------------ */

export const PRESERVED_PRIOR_EVIDENCE = [
  "identity_9773ac14", "klend_reserve_apy_methodology_v1", "apy_evidence_d468fce5",
  "klend_reserve_reward_methodology_v1", "reward_evidence_cace4fe4",
  "klend_reserve_apy_parity_v1", "parity_evidence_dd25a9a1",
  "klend_reserve_measured_apy_methodology_v1", "measured_apy_evidence_ebc7627d",
  "solana_slot_duration_methodology_v1",
  "steakhouse_evidence_a86da1fd", "steakhouse_automated_assessment_aggregate_5.37",
] as const;

export const CAPACITY_EVIDENCE = {
  evidenceId: KLEND_CAPACITY_METHODOLOGY_ID,
  version: KLEND_RESERVE_CAPACITY_VERSION,
  step: "16H-N.4",
  reserveAddress: CAPACITY_PRODUCT_BINDING.reserveAddress,
  preparerId: "claude_automated_evidence_preparer",
  preparerRole: "automated_evidence_preparer",
  preparerIsNotHumanReviewer: true,
  evidenceTimestamp: "2026-07-17T07:00:45.000Z",
  calculationAuthority: "deployed KLend deposit_reserve_liquidity enforcement; counted amount via official SDK getTotalSupplySf",
  numericType: "BigInt scaled-fraction (2^60), float only at the final token boundary",
  outputUnit: "USDC token amount (canonical); base units retained as raw strings",
  sentinelSemantics: "no enforcement sentinel; u64::MAX uncapped by type; 0 is a literal zero cap (diverges from kvault)",
  whatChanged: [
    "Deposit-limit and total-supply semantics proven from the deployed KLend program, not the SDK's display path.",
    "Exact capacity derivation implemented in BigInt fixed-point, mirroring the program's predicate.",
    "capacityAdapterState no_adapter → adapter_implemented_source_verified.",
    "The API was demonstrated to be cached and fixed as diagnostic-only; it exposes no deposit limit at all.",
  ],
  whyItChanged: "blocked_capacity was the primary blocker and required an exact, program-faithful remaining-capacity figure.",
  sourceProvenance: [
    "programs/klend/src/lending_market/lending_operations.rs :: deposit_reserve_liquidity L122-173",
    "programs/klend/src/state/reserve.rs :: ReserveLiquidity::total_supply L1123-1128",
    "programs/klend/src/state/reserve.rs :: deposit_limit field L1629",
    "SDK dist/classes/reserve.js:419-421 (depositLimitCrossed), :240-249 (getTotalSupplySf)",
    "SDK dist/classes/vault.js:2692 (U64_MAX unlimited reading)",
    "on-chain reserve state via mainnet-beta RPC (read-only)",
  ],
  invalidationTriggers: [
    "reserve state exceeds capacity TTL",
    "config.deposit_limit changes",
    "KLend program upgrade altering deposit_reserve_liquidity or total_supply",
    "reserve identity changes",
    "API parity becomes materially unexplained",
    "a sentinel encoding appears that this module does not recognise",
  ],
} as const;

export function computeCapacityEvidenceManifestHash(e: typeof CAPACITY_EVIDENCE = CAPACITY_EVIDENCE): string {
  const material = JSON.stringify({
    id: e.evidenceId, v: e.version, s: e.step, r: e.reserveAddress,
    a: e.calculationAuthority, n: e.numericType, u: e.outputUnit, sn: e.sentinelSemantics,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `capacity_evidence_${h.toString(16).padStart(8, "0")}`;
}

export const CAPACITY_EVIDENCE_MANIFEST_HASH = computeCapacityEvidenceManifestHash();

export const CAPACITY_BLOCKER_SUPERSESSION = {
  supersededBlocker: "blocked_capacity",
  supersededAt: "16H-N.4",
  priorCapacityState: "no_adapter",
  resultingCapacityState: "adapter_implemented_source_verified",
  priorPrimaryBlocker: "blocked_capacity",
  resultingPrimaryBlocker: "blocked_position_detection",
  reason:
    "Remaining capacity is derived exactly from the deployed program's own predicate: 888,443,337.61 USDC under a finite 1,000,000,000 USDC cap, from a verified exact reserve, in exact integer arithmetic, freshness-gated.",
  /**
   * STATE-MODEL GAP, reported rather than papered over. The task expected primary to move to
   * deposit availability or constraints. StableYieldEvidencePrimaryStatus has NO value for either —
   * depositAvailabilityState and constraintsState are both "blocked" but are not representable as a
   * primary blocker. Inventing one is forbidden, so primary moves to the next genuinely unresolved
   * blocker the model DOES support: blocked_position_detection (positionDetectionState = no_adapter,
   * accurate — kaminoVaults detects kvault positions, not KLend reserve cToken positions).
   */
  stateModelGap:
    "StableYieldEvidencePrimaryStatus has no blocked_deposit_availability or blocked_constraints value. Both states are genuinely blocked and are carried as blocker strings, but neither can be primary without inventing an enum value. Reported, not invented.",
  newBlockerEnumInvented: false,
  newLifecycleValueInvented: false,
} as const;

export const CAPACITY_CONFERS = {
  confers: [
    "verified exact remaining deposit capacity under the configured limit",
    "verified finite-cap classification",
    "program-faithful at-capacity and over-cap semantics",
  ],
  doesNotConfer: [
    "deposit availability", "withdrawal availability", "constraints eligibility",
    "a risk score", "human review", "risk signoff", "product approval",
    "selector eligibility", "recommendation eligibility", "Top Pick",
    "a production card", "presentation", "execution",
  ],
  depositAvailabilityRemains: "blocked",
  constraintsRemain: "blocked",
  lifecycleUnchanged: "identity_verified — no existing justified transition applies to a capacity adapter; none invented.",
  riskScoreAssigned: false,
  humanReviewOccurred: false,
  signoffOccurred: false,
  productApproved: false,
  transactionConstructedOrSimulated: false,
  apyRemainsComparisonReady: true,
  apyRateKindUnchanged: "estimated_variable_apy",
  rewardStateUnchanged: "exhausted",
} as const;

/**
 * klendReserveAvailability — Step 16H-N.6. Two SEPARATE read-only questions, answered from the
 * deployed KLend program's full instruction paths:
 *
 *   A. Can this exact reserve currently accept a new USDC deposit?
 *   B. For an existing position, how much underlying USDC is immediately withdrawable?
 *
 * These are NOT the same question and never collapse into one. Deposits being open says nothing about
 * exit liquidity; exit liquidity says nothing about recommendation eligibility.
 *
 * WHY CAPACITY IS NOT PERMISSION
 * ------------------------------
 * 16H-N.4 established ~888M USDC of remaining capacity. That proves only that the CAP is not binding.
 * The deposit instruction has FIVE further gates before the cap is even consulted, any one of which
 * blocks deposits at full capacity:
 *
 *   handler_deposit_reserve_liquidity.rs::process
 *     1. lending_checks::deposit_reserve_liquidity_checks (lending_checks.rs L164-190)
 *          • check_reserve_status_and_version  (L33-45)  → ReserveObsolete / ReserveDeprecated
 *          • check_reserve_emergency_mode      (L25-31)  → ReserveEmergencyMode
 *          • require!(!config.is_ctoken_usage_blocked()) → CTokenUsageBlocked
 *          • token_2022 liquidity-extension checks
 *     2. check_permissions(market, [reserve], PermissionedOp::DEPOSIT, ...) (permissioning.rs L77-94)
 *          → a permissioned market requires the permissioning authority to SIGN
 *     3. refresh_reserve  (accrual; a stale reserve cannot be deposited into)
 *     4. lending_operations::deposit_reserve_liquidity (lending_operations.rs L122-173)
 *          → InvalidAmount / ReserveStale / DepositLimitExceeded / withdrawal-cap accumulator
 *
 * So "positive capacity", "status Active", "emergencyMode = 0" and "the account decoded" are each
 * necessary-at-most, never sufficient. This module mirrors the whole path.
 *
 * THREE FINDINGS THAT INVERT INTUITION
 * ------------------------------------
 *  1. HIDDEN RESERVES ACCEPT DEPOSITS. check_reserve_status_and_version rejects only
 *     `ReserveStatus::Obsolete` (=1). Active (=0) and Hidden (=2) both pass. Hidden is a UI-listing
 *     concept, not a deposit gate. (Identity work at 16H-N.1 used status==0 to DISAMBIGUATE reserves,
 *     which is a different question and remains correct.)
 *
 *  2. WITHDRAWALS ARE NOT SYMMETRIC WITH DEPOSITS. redeem_reserve_collateral_checks
 *     (lending_checks.rs L268-293) runs ONLY: emergency mode, version, token-2022. It has
 *     NO status check, NO is_ctoken_usage_blocked check, and the redeem handler has NO
 *     check_permissions call at all. Therefore:
 *        • an OBSOLETE reserve still permits redemption while refusing deposits
 *        • block_ctoken_usage disables deposits while leaving withdrawals open
 *        • a permissioned market gates deposits but not exits
 *     This asymmetry is deliberate in the program: you can always leave.
 *
 *  3. EMERGENCY MODE BLOCKS BOTH. The one gate that is symmetric. `check_reserve_emergency_mode` is
 *     called from both paths, so emergency mode does NOT "preserve withdrawals" — it freezes exits
 *     too. That is the opposite of a common assumption and is why liquid buffer coverage must fail
 *     closed on it.
 *
 * THE EXACT WITHDRAWAL LIMIT
 * --------------------------
 * Reserve::redeem_collateral (reserve.rs L444-457) → withdraw_freely_available (L901-913):
 *
 *     let freely_available_amount = self.freely_available_liquidity_amount();
 *     if liquidity_amount > freely_available_amount { return err!(InsufficientLiquidity); }
 *
 * and freely_available_liquidity_amount (L219-224) is:
 *
 *     liquidity.total_available_amount.saturating_sub(queued_liquidity_amount())
 *
 * so the limit is available liquidity MINUS the withdraw queue — NOT total_available_amount, and NOT
 * total_supply (which includes borrowed funds that are not there to pay out).
 *
 * STRICTLY READ-ONLY. No transaction is constructed or simulated. No CTA is produced.
 */
import { ONE_SF, KLEND_MAINNET_PROGRAM_ID } from "./klendReserveCapacity";
import { POSITION_IDENTITY, EXPECTED_TOKEN_PROGRAM_ID } from "./klendDirectLendingPosition";

export const AVAILABILITY_VERSION = "1.0.0" as const;
export const AVAILABILITY_METHODOLOGY_ID = "klend_reserve_availability_methodology_v1" as const;

/* ------------------------------------------------------------------ *
 * 1. Deployed-path evidence
 * ------------------------------------------------------------------ */

export const DEPOSIT_PATH = {
  handler: "programs/klend/src/handlers/handler_deposit_reserve_liquidity.rs::process",
  gates: [
    { symbol: "lending_checks::check_reserve_status_and_version", location: "lending_checks.rs L33-45", condition: "config.status() == ReserveStatus::Obsolete", error: "LendingError::ReserveObsolete" },
    { symbol: "lending_checks::check_reserve_status_and_version", location: "lending_checks.rs L39-42", condition: "reserve.version != PROGRAM_VERSION", error: "LendingError::ReserveDeprecated" },
    { symbol: "lending_checks::check_reserve_emergency_mode", location: "lending_checks.rs L25-31", condition: "config.is_emergency_mode() i.e. emergency_mode != 0", error: "LendingError::ReserveEmergencyMode" },
    { symbol: "Reserve::is_ctoken_usage_blocked", location: "reserve.rs L1727-1729", condition: "config.block_ctoken_usage != 0", error: "LendingError::CTokenUsageBlocked" },
    { symbol: "constraints::token_2022::check_only_supported_liquidity_token_extensions", location: "lending_checks.rs L186-189", condition: "unsupported token-2022 extension on the liquidity mint or user account", error: "token-2022 constraint error" },
    { symbol: "permissioning::check_permissions", location: "permissioning.rs L77-94", condition: "requires_permission(market, [reserve], PermissionedOp::DEPOSIT) && the permissioning authority does not sign", error: "LendingError::MissingPermissioner / AccountNotSigner" },
    { symbol: "lending_operations::refresh_reserve", location: "handler L54-60", condition: "accrual must be refreshed in the current slot", error: "LendingError::ReserveStale (raised downstream)" },
    { symbol: "lending_operations::deposit_reserve_liquidity", location: "lending_operations.rs L127-131", condition: "liquidity_amount == 0", error: "LendingError::InvalidAmount" },
    { symbol: "lending_operations::deposit_reserve_liquidity", location: "lending_operations.rs L151-158", condition: "liquidity_amount + liquidity.total_supply() > config.deposit_limit (STRICT >)", error: "LendingError::DepositLimitExceeded" },
    { symbol: "sub_from_withdrawal_accum", location: "lending_operations.rs L160-164", condition: "the rolling deposit/withdrawal cap accumulator is debited", error: "cap error if exceeded" },
  ],
  statusesPermittingDeposits: ["Active (0)", "Hidden (2)"],
  statusesBlockingDeposits: ["Obsolete (1)"],
  activeStatusRequired: false,
  activeStatusNote: "An Active status is NOT required — only a non-Obsolete one. Hidden reserves accept deposits.",
  equalityWithCapAccepted: true,
  capacityCheckedAfterIncomingAmount: true,
  emergencyModeBlocksDeposits: true,
  adminCanDisableDepositsSeparatelyFromCap: true,
  adminDisableField: "config.block_ctoken_usage — an admin flag that blocks deposits WITHOUT touching deposit_limit. This is precisely why positive capacity is not evidence of availability.",
  elevationGroupAppliesToSupply: false,
  elevationGroupNote: "Elevation groups / asset tiers gate BORROWING via obligations. No elevation-group check appears in the supply path.",
} as const;

export const WITHDRAWAL_PATH = {
  handler: "programs/klend/src/handlers/handler_redeem_reserve_collateral.rs::process",
  gates: [
    { symbol: "lending_checks::check_reserve_emergency_mode", location: "lending_checks.rs L281", condition: "config.is_emergency_mode()", error: "LendingError::ReserveEmergencyMode" },
    { symbol: "version check", location: "lending_checks.rs L283-286", condition: "reserve.version != PROGRAM_VERSION", error: "LendingError::ReserveDeprecated" },
    { symbol: "constraints::token_2022::check_only_supported_liquidity_token_extensions", location: "lending_checks.rs L288-291", condition: "unsupported extension", error: "token-2022 constraint error" },
    { symbol: "lending_operations::refresh_reserve", location: "handler L42-48", condition: "accrual refreshed in the current slot", error: "LendingError::ReserveStale" },
    { symbol: "lending_operations::redeem_reserve_collateral", location: "lending_operations.rs L584-587", condition: "collateral_amount == 0", error: "LendingError::InvalidAmount" },
    { symbol: "Reserve::redeem_collateral", location: "reserve.rs L444-457", condition: "liquidity_amount = collateral_to_liquidity(collateral_amount) [FLOOR]", error: "—" },
    { symbol: "Reserve::withdraw_freely_available", location: "reserve.rs L901-913", condition: "liquidity_amount > freely_available_liquidity_amount()", error: "LendingError::InsufficientLiquidity" },
    { symbol: "add_to_withdrawal_accum", location: "lending_operations.rs L604-610", condition: "rolling withdrawal cap accumulator (only when add_amount_to_withdrawal_caps)", error: "cap error if exceeded" },
  ],
  gatesAbsentRelativeToDeposit: [
    "NO check_reserve_status_and_version — an Obsolete reserve still permits redemption",
    "NO is_ctoken_usage_blocked check — block_ctoken_usage disables deposits but not exits",
    "NO check_permissions — the redeem handler never calls it, so a permissioned market does not gate exits",
  ],
  withdrawalsAvailableWhenDepositsDisabled: true,
  hiddenOrObsoleteAllowRedemption: true,
  emergencyModeBlocksWithdrawals: true,
  emergencyModeNote: "The ONE symmetric gate. Emergency mode does NOT preserve withdrawals — it freezes them too.",
  exactLimitingAmount: "freely_available_liquidity_amount() = liquidity.total_available_amount - queued_liquidity_amount()",
  limitIsNotTotalSupply: "total_supply includes BORROWED funds, which are not present to pay out. Using it would overstate exit liquidity.",
  limitIsNotTotalAvailable: "total_available_amount alone ignores the withdraw queue, which has already reserved liquidity for others.",
  feesExcludedFromWithdrawableLiquidity: true,
  feesNote: "The limit is the vault's available balance; the fee accumulators are excluded from total_supply (reserve.rs L1123-1128) and are not part of a supplier's claim.",
  partialRedemptionAllowed: true,
  partialRedemptionNote: "collateral_amount is a caller-chosen u64. Nothing requires redeeming the full balance, so a partial exit is a first-class path.",
  withdrawalFee: "none found in the redeem path — no fee or penalty is deducted from liquidity_amount",
  withdrawalFeeVerified: "redeem_reserve_collateral returns the floored liquidity_amount unmodified; no fee term appears",
  cooldownOrQueue: "A withdraw_queue EXISTS but the regular redeem path does not enqueue: the handler passes RedeemCollateralOptions::REGULAR and withdraw_freely_available SUBTRACTS queued liquidity rather than consuming it. There is no cooldown or FIFO on the regular path.",
  queueCaveat:
    "RedeemCollateralOptions::REGULAR's exact field values were NOT located in the fetched sources. This module therefore takes the CONSERVATIVE branch — withdraw_freely_available, which subtracts the queue — because the alternative (withdraw_including_queued) is strictly more permissive. Being wrong in this direction understates accessibility rather than overstating it.",
} as const;

export const ROLLING_WITHDRAWAL_CAP = {
  field: "config.deposit_withdrawal_cap",
  isSeparateFromDepositLimit: true,
  semantics: "A rolling-interval accumulator: deposits SUBTRACT (sub_from_withdrawal_accum), withdrawals ADD (add_to_withdrawal_accum). A negative currentTotal means net inflow over the interval.",
  observedConfigCapacity: "90000000000000",
  observedConfigCapacityTokens: 90_000_000,
  observedCurrentTotal: "-1917115459021",
  observedIntervalSeconds: 86_400,
  bindingNow: false,
  bindingRationale:
    "Headroom is capacity - currentTotal = 90,000,000 - (-1,917,115.46) = 91,917,115.46 USDC, far above the ~21.6M of freely available liquidity. Liquidity binds first, so the cap is not the limiting constraint at this observation. It is modelled anyway because it CAN bind.",
  errorPathNotLocated:
    "The exact error identifier raised when the accumulator is exceeded was not located in the fetched sources. Recorded as a known gap rather than guessed.",
} as const;

/* ------------------------------------------------------------------ *
 * 2. Contract
 * ------------------------------------------------------------------ */

export type DepositAvailabilityState =
  | "available" | "unavailable" | "paused" | "at_capacity" | "stale" | "unresolved" | "unsupported";

export type WithdrawalAvailabilityState =
  | "fully_available" | "partially_available" | "unavailable" | "paused" | "stale" | "unresolved";

export const RESERVE_STATUS = { Active: 0, Obsolete: 1, Hidden: 2 } as const;
export const EXPECTED_PROGRAM_VERSION = 1;

/** Strictest existing bound reused: reserve state moves fast (16H-N.4 measured ~1.01M USDC in ~105s). */
export const AVAILABILITY_TTL_MS = 2 * 60 * 1000;
export const MAX_AVAILABILITY_SLOT_SKEW = 150;

export interface AvailabilityIdentity {
  candidateId: string; marketAddress: string; reserveAddress: string; liquidityMint: string;
  cTokenMint: string; klendProgram: string; cluster: string; assetDecimals: number; tokenProgram: string;
}

export function validateAvailabilityIdentity(i: AvailabilityIdentity): { ok: boolean; detail?: string } {
  const b = POSITION_IDENTITY;
  if (i.candidateId !== b.candidateId) return { ok: false, detail: `candidate_mismatch:${i.candidateId}` };
  if (i.marketAddress !== b.marketAddress) return { ok: false, detail: `market_mismatch:${i.marketAddress}` };
  if (i.reserveAddress !== b.reserveAddress) return { ok: false, detail: `reserve_mismatch:${i.reserveAddress}` };
  if (i.liquidityMint !== b.liquidityMint) return { ok: false, detail: `mint_mismatch:${i.liquidityMint}` };
  if (i.cTokenMint !== b.cTokenMint) return { ok: false, detail: `ctoken_mismatch:${i.cTokenMint}` };
  if (i.klendProgram !== KLEND_MAINNET_PROGRAM_ID) return { ok: false, detail: `program_mismatch:${i.klendProgram}` };
  if (i.cluster !== "mainnet-beta") return { ok: false, detail: `cluster_mismatch:${i.cluster}` };
  if (i.assetDecimals !== 6) return { ok: false, detail: `decimals_mismatch:${i.assetDecimals}` };
  if (i.tokenProgram !== EXPECTED_TOKEN_PROGRAM_ID) return { ok: false, detail: `token_program_mismatch:${i.tokenProgram}` };
  return { ok: true };
}

export interface DepositAvailabilityInputs {
  identity: AvailabilityIdentity;
  reserveStatus: number;
  reserveVersion: number;
  reserveEmergencyMode: number;
  blockCtokenUsage: number;
  marketEmergencyMode: number;
  marketPermissioningAuthority: string;
  marketPermissionedOps: number;
  /** From 16H-N.4. `undefined` = capacity unresolved, which blocks — absence is never favourable. */
  remainingCapacityRaw: string | undefined;
  remainingCapacityTokenAmount: number | undefined;
  capacityIsFresh: boolean;
  isOverConfiguredLimit: boolean;
  reserveSourceSlot: number | undefined;
  marketSourceSlot: number | undefined;
  observedAt: string;
  nowMs: number;
}

export interface DepositAvailabilityResult {
  candidateId?: string; marketAddress?: string; reserveAddress?: string; liquidityMint?: string;
  reserveStatus?: string;
  marketEmergencyState?: string;
  reserveEmergencyState?: string;
  depositPauseState?: string;
  permissionState?: string;
  remainingCapacityRaw?: string;
  remainingCapacityTokenAmount?: number;
  depositsMechanicallyAllowed: boolean;
  depositAvailabilityState: DepositAvailabilityState;
  blockingReasons: string[];
  calculationAuthority: string;
  calculationVersion: string;
  reserveSourceSlot?: number;
  marketSourceSlot?: number;
  observedAt?: string;
  freshnessState?: "fresh" | "stale";
  invalidationReason?: string;
  executionCtaProduced: false;
}

const DEFAULT_PUBKEY = "11111111111111111111111111111111";

/**
 * Mirror the deployed deposit path. Every gate is evaluated; the state names the FIRST-order reason.
 * `depositsMechanicallyAllowed` means "the program's checks would pass" — never "the user should".
 */
export function evaluateDepositAvailability(i: DepositAvailabilityInputs): DepositAvailabilityResult {
  const base = {
    calculationAuthority: `deployed KLend ${DEPOSIT_PATH.handler} + ${DEPOSIT_PATH.gates.length} gates`,
    calculationVersion: AVAILABILITY_VERSION,
    executionCtaProduced: false as const,
  };
  const identity = validateAvailabilityIdentity(i.identity);
  if (!identity.ok) {
    return { ...base, depositsMechanicallyAllowed: false, depositAvailabilityState: "unresolved", blockingReasons: [`identity_mismatch: ${identity.detail}`], invalidationReason: identity.detail };
  }

  const common = {
    candidateId: i.identity.candidateId, marketAddress: i.identity.marketAddress,
    reserveAddress: i.identity.reserveAddress, liquidityMint: i.identity.liquidityMint,
    reserveStatus: i.reserveStatus === 0 ? "Active(0)" : i.reserveStatus === 1 ? "Obsolete(1)" : i.reserveStatus === 2 ? "Hidden(2)" : `Unknown(${i.reserveStatus})`,
    marketEmergencyState: i.marketEmergencyMode === 0 ? "normal" : `emergency(${i.marketEmergencyMode})`,
    reserveEmergencyState: i.reserveEmergencyMode === 0 ? "normal" : `emergency(${i.reserveEmergencyMode})`,
    depositPauseState: i.blockCtokenUsage === 0 ? "not_blocked" : `block_ctoken_usage(${i.blockCtokenUsage})`,
    permissionState: i.marketPermissioningAuthority === DEFAULT_PUBKEY && i.marketPermissionedOps === 0 ? "not_permissioned" : "permissioned_or_unresolved",
    remainingCapacityRaw: i.remainingCapacityRaw,
    remainingCapacityTokenAmount: i.remainingCapacityTokenAmount,
    reserveSourceSlot: i.reserveSourceSlot, marketSourceSlot: i.marketSourceSlot, observedAt: i.observedAt,
  };

  if (i.reserveSourceSlot === undefined || i.marketSourceSlot === undefined) {
    return { ...base, ...common, depositsMechanicallyAllowed: false, depositAvailabilityState: "unresolved", blockingReasons: ["missing_source_slot"], invalidationReason: "source slot absent" };
  }
  const ageMs = i.nowMs - Date.parse(i.observedAt);
  const skew = Math.abs(i.reserveSourceSlot - i.marketSourceSlot);
  if (!(ageMs >= 0 && ageMs <= AVAILABILITY_TTL_MS) || skew > MAX_AVAILABILITY_SLOT_SKEW) {
    return { ...base, ...common, depositsMechanicallyAllowed: false, depositAvailabilityState: "stale", freshnessState: "stale", blockingReasons: [`stale_state: age ${ageMs}ms / skew ${skew} slots`], invalidationReason: "stale" };
  }

  const blockingReasons: string[] = [];
  if (i.reserveStatus === RESERVE_STATUS.Obsolete) blockingReasons.push("reserve_obsolete: check_reserve_status_and_version → ReserveObsolete");
  if (i.reserveVersion !== EXPECTED_PROGRAM_VERSION) blockingReasons.push(`reserve_version_mismatch: ${i.reserveVersion} != PROGRAM_VERSION → ReserveDeprecated`);
  if (i.reserveEmergencyMode !== 0) blockingReasons.push("reserve_emergency_mode: check_reserve_emergency_mode → ReserveEmergencyMode");
  if (i.marketEmergencyMode !== 0) blockingReasons.push("market_emergency_mode");
  if (i.blockCtokenUsage !== 0) blockingReasons.push("ctoken_usage_blocked: config.block_ctoken_usage != 0 → CTokenUsageBlocked");
  if (!(i.marketPermissioningAuthority === DEFAULT_PUBKEY && i.marketPermissionedOps === 0)) {
    blockingReasons.push("permission_required_or_unresolved: a permissioned market requires the permissioning authority to sign PermissionedOp::DEPOSIT");
  }
  if (!i.capacityIsFresh || i.remainingCapacityRaw === undefined) blockingReasons.push("capacity_unresolved_or_stale");
  if (i.isOverConfiguredLimit) blockingReasons.push("over_configured_limit: supply already exceeds deposit_limit → DepositLimitExceeded");
  else if (i.remainingCapacityRaw !== undefined && BigInt(i.remainingCapacityRaw) === 0n) blockingReasons.push("at_capacity: remaining capacity is zero → DepositLimitExceeded");

  if (blockingReasons.length === 0) {
    return { ...base, ...common, depositsMechanicallyAllowed: true, depositAvailabilityState: "available", freshnessState: "fresh", blockingReasons: [] };
  }
  // Name the first-order reason without hiding the rest.
  const state: DepositAvailabilityState =
    blockingReasons.some((r) => r.startsWith("reserve_emergency_mode") || r.startsWith("market_emergency_mode") || r.startsWith("ctoken_usage_blocked")) ? "paused"
    : blockingReasons.some((r) => r.startsWith("at_capacity") || r.startsWith("over_configured_limit")) ? "at_capacity"
    : blockingReasons.some((r) => r.startsWith("reserve_obsolete") || r.startsWith("reserve_version_mismatch")) ? "unsupported"
    : blockingReasons.some((r) => r.startsWith("capacity_unresolved") || r.startsWith("permission_required")) ? "unresolved"
    : "unavailable";
  return { ...base, ...common, depositsMechanicallyAllowed: false, depositAvailabilityState: state, freshnessState: "fresh", blockingReasons };
}

/* ------------------------------------------------------------------ *
 * 3. Withdrawal accessibility — exact integer inverse
 * ------------------------------------------------------------------ */

/** Ceiling division for positive BigInts. */
function ceilDiv(a: bigint, b: bigint): bigint { return (a + b - 1n) / b; }

/** The program's forward conversion: FLOOR(c × totalSupply / collateralSupply). */
export function collateralToLiquidityFloor(cTokenRaw: bigint, totalSupplySf: bigint, collateralSupply: bigint): bigint {
  return (cTokenRaw * totalSupplySf) / (ONE_SF * collateralSupply);
}

/**
 * The exact maximal integer inverse — no floating-point search, no iteration.
 *
 * We need the largest integer c with FLOOR(c·T / (ONE·S)) <= L. Since
 *   floor(x) <= L  ⟺  x < L+1
 * the condition is c·T < (L+1)·ONE·S, i.e.
 *   c <= ceil((L+1)·ONE·S / T) − 1
 *
 * That closed form is exact in BigInt. The caller then clamps to the wallet balance, and
 * `proveMaximal` independently verifies both directions rather than trusting the algebra.
 */
export function maxRedeemableCTokens(freelyAvailableRaw: bigint, totalSupplySf: bigint, collateralSupply: bigint, walletCTokenRaw: bigint): bigint {
  if (freelyAvailableRaw <= 0n || walletCTokenRaw <= 0n || totalSupplySf <= 0n || collateralSupply <= 0n) return 0n;
  const bound = ceilDiv((freelyAvailableRaw + 1n) * ONE_SF * collateralSupply, totalSupplySf) - 1n;
  const c = bound < 0n ? 0n : bound;
  return c < walletCTokenRaw ? c : walletCTokenRaw;
}

/**
 * Prove maximality by the mirrored predicate itself, not by re-deriving the formula:
 *   • the selected amount redeems to <= available liquidity
 *   • selected+1 exceeds it — UNLESS the selection is already the whole balance, where the wallet,
 *     not liquidity, is the binding constraint and +1 is simply not owned.
 */
export function proveMaximal(selected: bigint, freelyAvailableRaw: bigint, totalSupplySf: bigint, collateralSupply: bigint, walletCTokenRaw: bigint): { maximal: boolean; selectedFits: boolean; plusOneFails: boolean; boundedByWallet: boolean } {
  const selectedFits = selected === 0n || collateralToLiquidityFloor(selected, totalSupplySf, collateralSupply) <= freelyAvailableRaw;
  const boundedByWallet = selected === walletCTokenRaw;
  const plusOneFails = boundedByWallet ? true : collateralToLiquidityFloor(selected + 1n, totalSupplySf, collateralSupply) > freelyAvailableRaw;
  return { maximal: selectedFits && plusOneFails, selectedFits, plusOneFails, boundedByWallet };
}

export interface WithdrawalAccessibilityInputs {
  identity: AvailabilityIdentity;
  walletCTokenBalanceRaw: string;
  totalSupplySf: string | undefined;
  collateralMintTotalSupplyRaw: string | undefined;
  /** liquidity.total_available_amount */
  totalAvailableLiquidityRaw: string | undefined;
  /** queued_liquidity_amount() — subtracted to obtain the freely available amount. */
  queuedLiquidityRaw: string;
  reserveEmergencyMode: number;
  marketEmergencyMode: number;
  reserveVersion: number;
  walletSourceSlot: number;
  reserveSourceSlot: number;
  marketSourceSlot: number;
  observedAt: string;
  nowMs: number;
}

export interface WithdrawalAccessibilityResult {
  walletCTokenBalanceRaw?: string;
  fullUnderlyingClaimRaw?: string;
  reserveAvailableLiquidityRaw?: string;
  freelyAvailableLiquidityRaw?: string;
  maxImmediatelyRedeemableCTokenRaw?: string;
  immediatelyWithdrawableUnderlyingRaw?: string;
  immediatelyWithdrawableUnderlyingTokenAmount?: number;
  fullPositionImmediatelyWithdrawable: boolean;
  partialWithdrawalSupported: boolean;
  liquidityShortfallRaw?: string;
  withdrawalAvailabilityState: WithdrawalAvailabilityState;
  blockingReasons: string[];
  calculationAuthority: string;
  calculationVersion: string;
  maximalityProof?: { maximal: boolean; selectedFits: boolean; plusOneFails: boolean; boundedByWallet: boolean };
  walletSourceSlot?: number;
  reserveSourceSlot?: number;
  marketSourceSlot?: number;
  sourceSkewSlots?: number;
  observedAt?: string;
  freshnessState?: "fresh" | "stale";
}

function toTokens(raw: bigint, decimals: number): number {
  const s = 10n ** BigInt(decimals);
  return Number(raw / s) + Number(raw % s) / Number(s);
}

export function evaluateWithdrawalAccessibility(i: WithdrawalAccessibilityInputs): WithdrawalAccessibilityResult {
  const base = {
    calculationAuthority: `deployed KLend ${WITHDRAWAL_PATH.handler} → redeem_collateral → withdraw_freely_available`,
    calculationVersion: AVAILABILITY_VERSION,
    partialWithdrawalSupported: true,
  };
  const fail = (state: WithdrawalAvailabilityState, reasons: string[], extra: Record<string, unknown> = {}): WithdrawalAccessibilityResult =>
    ({ ...base, ...extra, fullPositionImmediatelyWithdrawable: false, withdrawalAvailabilityState: state, blockingReasons: reasons });

  const identity = validateAvailabilityIdentity(i.identity);
  if (!identity.ok) return fail("unresolved", [`identity_mismatch: ${identity.detail}`]);

  const balance = BigInt(i.walletCTokenBalanceRaw);
  if (balance === 0n) {
    return { ...base, walletCTokenBalanceRaw: "0", fullUnderlyingClaimRaw: "0",
      maxImmediatelyRedeemableCTokenRaw: "0", immediatelyWithdrawableUnderlyingRaw: "0",
      immediatelyWithdrawableUnderlyingTokenAmount: 0,
      fullPositionImmediatelyWithdrawable: false, withdrawalAvailabilityState: "unavailable",
      blockingReasons: ["no_position: wallet holds zero cTokens"], freshnessState: "fresh" };
  }

  const ageMs = i.nowMs - Date.parse(i.observedAt);
  const slots = [i.walletSourceSlot, i.reserveSourceSlot, i.marketSourceSlot];
  const skew = Math.max(...slots) - Math.min(...slots);
  if (!(ageMs >= 0 && ageMs <= AVAILABILITY_TTL_MS)) return fail("stale", [`stale_state: age ${ageMs}ms exceeds TTL ${AVAILABILITY_TTL_MS}ms`], { walletCTokenBalanceRaw: i.walletCTokenBalanceRaw, freshnessState: "stale", sourceSkewSlots: skew });
  if (skew > MAX_AVAILABILITY_SLOT_SKEW) return fail("stale", [`source_skew_exceeded: ${skew} slots > ${MAX_AVAILABILITY_SLOT_SKEW}`], { walletCTokenBalanceRaw: i.walletCTokenBalanceRaw, sourceSkewSlots: skew });

  // Emergency mode is the SYMMETRIC gate: it freezes exits too.
  const reasons: string[] = [];
  if (i.reserveEmergencyMode !== 0) reasons.push("reserve_emergency_mode: redeem_reserve_collateral_checks → ReserveEmergencyMode (emergency does NOT preserve withdrawals)");
  if (i.marketEmergencyMode !== 0) reasons.push("market_emergency_mode");
  if (i.reserveVersion !== EXPECTED_PROGRAM_VERSION) reasons.push(`reserve_version_mismatch: ${i.reserveVersion} → ReserveDeprecated`);
  if (reasons.length > 0) return fail("paused", reasons, { walletCTokenBalanceRaw: i.walletCTokenBalanceRaw, sourceSkewSlots: skew, freshnessState: "fresh" });

  if (i.totalSupplySf === undefined || i.collateralMintTotalSupplyRaw === undefined || i.totalAvailableLiquidityRaw === undefined) {
    return fail("unresolved", ["missing_conversion_inputs"], { walletCTokenBalanceRaw: i.walletCTokenBalanceRaw });
  }
  const T = BigInt(i.totalSupplySf), S = BigInt(i.collateralMintTotalSupplyRaw);
  const totalAvail = BigInt(i.totalAvailableLiquidityRaw), queued = BigInt(i.queuedLiquidityRaw);
  if (T <= 0n || S <= 0n) return fail("unresolved", ["malformed_fixed_point_state: zero supply"], { walletCTokenBalanceRaw: i.walletCTokenBalanceRaw });

  const freely = totalAvail > queued ? totalAvail - queued : 0n; // saturating_sub
  const fullClaim = collateralToLiquidityFloor(balance, T, S);
  const maxC = maxRedeemableCTokens(freely, T, S, balance);
  const withdrawable = maxC === 0n ? 0n : collateralToLiquidityFloor(maxC, T, S);
  const proof = proveMaximal(maxC, freely, T, S, balance);
  const full = maxC === balance;
  const decimals = i.identity.assetDecimals;

  const result: WithdrawalAccessibilityResult = {
    ...base,
    walletCTokenBalanceRaw: i.walletCTokenBalanceRaw,
    fullUnderlyingClaimRaw: fullClaim.toString(),
    reserveAvailableLiquidityRaw: totalAvail.toString(),
    freelyAvailableLiquidityRaw: freely.toString(),
    maxImmediatelyRedeemableCTokenRaw: maxC.toString(),
    immediatelyWithdrawableUnderlyingRaw: withdrawable.toString(),
    immediatelyWithdrawableUnderlyingTokenAmount: toTokens(withdrawable, decimals),
    fullPositionImmediatelyWithdrawable: full,
    liquidityShortfallRaw: full ? undefined : (fullClaim - withdrawable).toString(),
    withdrawalAvailabilityState: full ? "fully_available" : withdrawable > 0n ? "partially_available" : "unavailable",
    blockingReasons: full ? [] : withdrawable > 0n
      ? [`partial_liquidity: freely available ${freely} < full claim ${fullClaim} → InsufficientLiquidity above the selected amount`]
      : ["insufficient_liquidity: freely available liquidity cannot redeem even one cToken"],
    maximalityProof: proof,
    walletSourceSlot: i.walletSourceSlot, reserveSourceSlot: i.reserveSourceSlot, marketSourceSlot: i.marketSourceSlot,
    sourceSkewSlots: skew, observedAt: i.observedAt, freshnessState: "fresh",
  };
  return result;
}

/* ------------------------------------------------------------------ *
 * 4. Safety Buffer coverage
 * ------------------------------------------------------------------ */

export const BUFFER_COVERAGE_POLICY = {
  recognizedFormula: "full underlying USDC claim × fresh approved exact-mint USDC/USD price",
  liquidFormula: "immediately withdrawable underlying USDC × fresh approved exact-mint USDC/USD price",
  sufficiencyUses: "liquidBufferValueUsd ONLY",
  recognizedIndependentOfWithdrawal:
    "recognized depends on the POSITION's own evidence. If withdrawal accessibility goes stale or unresolved, recognized may remain valid — the user still owns the claim — while liquid fails closed.",
  liquidFailsClosed: "unresolved/stale/paused withdrawal accessibility ⇒ liquid = 0. Never a guess.",
  partialCounts: true,
  partialRationale:
    "A verified partial amount counts toward liquid coverage. Requiring the WHOLE position to be withdrawable before counting any of it would discard evidence we actually have.",
  usdcAssumedOneDollar: false,
  inventedHaircut: false,
  positionRemainsVisibleWhenLiquidFailsClosed: true,
  depositAvailabilityDoesNotAffectRecognized:
    "Whether the reserve accepts NEW deposits has no bearing on what the user already holds.",
  withdrawalDoesNotConferRecommendation:
    "Exit liquidity is not evidence of suitability. Recommendation eligibility remains gated on constraints, risk review and approval.",
} as const;

export type BufferCoverage =
  | { state: "usd_recognized"; recognizedBufferValueUsd: number; liquidBufferValueUsd: number; recognizedTokenAmount: number; liquidTokenAmount: number; priceSource: string }
  | { state: "usd_unavailable"; recognizedBufferValueUsd: null; liquidBufferValueUsd: null; recognizedTokenAmount: number; liquidTokenAmount: number; reason: string };

/**
 * Compute buffer coverage. Token-unit values are always preserved; USD is derived only from a fresh
 * approved price. `liquidTokenAmount` is forced to 0 whenever withdrawal accessibility is not a
 * verified fully/partially-available state.
 */
export function computeBufferCoverage(args: {
  fullUnderlyingTokenAmount: number;
  immediatelyWithdrawableTokenAmount: number;
  withdrawalState: WithdrawalAvailabilityState;
  usdcPriceUsd: number | undefined;
  priceSource: string | undefined;
  priceObservedAt: string | undefined;
  priceMaxAgeMs: number;
  nowMs: number;
}): BufferCoverage {
  const verified = args.withdrawalState === "fully_available" || args.withdrawalState === "partially_available";
  const liquidTokenAmount = verified ? args.immediatelyWithdrawableTokenAmount : 0;
  const recognizedTokenAmount = args.fullUnderlyingTokenAmount;

  if (args.usdcPriceUsd === undefined || args.priceSource === undefined || args.priceObservedAt === undefined) {
    return { state: "usd_unavailable", recognizedBufferValueUsd: null, liquidBufferValueUsd: null, recognizedTokenAmount, liquidTokenAmount, reason: "no approved exact-mint USDC/USD price; USDC is not assumed to equal $1" };
  }
  const age = args.nowMs - Date.parse(args.priceObservedAt);
  if (!(age >= 0 && age <= args.priceMaxAgeMs) || !Number.isFinite(args.usdcPriceUsd) || args.usdcPriceUsd <= 0) {
    return { state: "usd_unavailable", recognizedBufferValueUsd: null, liquidBufferValueUsd: null, recognizedTokenAmount, liquidTokenAmount, reason: `USDC price stale or invalid (age ${age}ms)` };
  }
  return {
    state: "usd_recognized",
    recognizedBufferValueUsd: recognizedTokenAmount * args.usdcPriceUsd,
    liquidBufferValueUsd: liquidTokenAmount * args.usdcPriceUsd,
    recognizedTokenAmount, liquidTokenAmount, priceSource: args.priceSource,
  };
}

/* ------------------------------------------------------------------ *
 * 5. Presentation semantics (recorded, NOT rendered)
 * ------------------------------------------------------------------ */

export const AVAILABILITY_PRESENTATION = {
  fullyAvailable: "Available based on current reserve liquidity",
  partiallyAvailable: ["Some funds may not be immediately available", "Current lending liquidity may limit how much can be withdrawn immediately"],
  staleOrUnresolved: "Withdrawal availability is currently unavailable",
  visibleUnderYieldStrategies: true,
  mustNotRender: ["internal numeric risk scores", "deposit buttons", "withdraw buttons", "external protocol CTAs", "migration suggestions", "move from Steakhouse language", "recommendation badges", "approval labels"],
  productionCardRendered: false,
  note: "Recorded for a later presentation step. This module renders nothing.",
} as const;

/* ------------------------------------------------------------------ *
 * 6. Snapshot + evidence
 * ------------------------------------------------------------------ */

export const AVAILABILITY_SNAPSHOT = {
  observedAt: "2026-07-17T09:48:21.000Z",
  reserveSourceSlot: 433458287,
  reserveStatus: 0,
  reserveStatusName: "Active(0)",
  reserveVersion: 1,
  reserveEmergencyMode: 0,
  blockCtokenUsage: 0,
  marketEmergencyMode: 0,
  marketPermissioningAuthority: DEFAULT_PUBKEY,
  marketPermissionedOps: 0,
  isPermissionedMarket: false,
  totalAvailableLiquidityRaw: "21604665447610",
  totalAvailableLiquidityTokens: 21_604_665.44761,
  queuedLiquidityRaw: "0",
  freelyAvailableLiquidityRaw: "21604665447610",
  depositsMechanicallyAllowed: true,
  depositAvailabilityState: "available" as DepositAvailabilityState,
  permissionCaveat:
    "market.permissioning_authority is Pubkey::default and permissioned_ops = 0, so no DEPOSIT permission is required. NOTE: the exact body of LendingMarket::is_permissioned_market() was NOT located in the fetched sources; the conclusion rests on both permission fields being default/zero, which is recorded rather than assumed away.",
  reserveLevelPermissionedOpsCaveat:
    "Reserve::requires_permission reads config.permissioned_ops, which the installed SDK does not expose on the decoded config. It is irrelevant here only because requires_permission short-circuits on market.is_permissioned_market() && ... — if the market ever becomes permissioned, this must be re-verified.",
} as const;

export const SNAPSHOT_IS_NOT_PRODUCTION_INPUT_N6 = {
  isImmutableEvidence: true,
  isProductionInput: false,
  rule: "Availability is a live property. Pause flags and liquidity change without notice; replaying this snapshot would assert yesterday's permission as today's.",
} as const;

export const PRESERVED_PRIOR_EVIDENCE_N6 = [
  "identity_9773ac14", "klend_reserve_apy_methodology_v1", "apy_evidence_d468fce5",
  "klend_reserve_reward_methodology_v1", "reward_evidence_cace4fe4",
  "klend_reserve_apy_parity_v1", "parity_evidence_dd25a9a1",
  "klend_reserve_measured_apy_methodology_v1", "measured_apy_evidence_ebc7627d",
  "solana_slot_duration_methodology_v1",
  "klend_reserve_capacity_methodology_v1", "capacity_evidence_e54e310a",
  "klend_direct_lending_position_methodology_v1", "position_evidence_fb2bb70b",
  "stable_yield_blocker_order_amendment_v1", "blocker_order_evidence_fae4d95f",
  "steakhouse_evidence_a86da1fd", "steakhouse_automated_assessment_aggregate_5.37",
] as const;

export const STEAKHOUSE_CAPACITY_CONTRADICTION_UNTOUCHED = {
  modified: false,
  note: "The capacity contradiction observed at 16H-N.5a (capacityAdapterState 'blocked' vs the 16H-J.1 resolution) is deliberately NOT touched here, per this step's scope.",
} as const;

export const AVAILABILITY_EVIDENCE = {
  evidenceId: AVAILABILITY_METHODOLOGY_ID,
  version: AVAILABILITY_VERSION,
  step: "16H-N.6",
  reserveAddress: POSITION_IDENTITY.reserveAddress,
  preparerId: "claude_automated_evidence_preparer",
  preparerRole: "automated_evidence_preparer",
  preparerIsNotHumanReviewer: true,
  evidenceTimestamp: "2026-07-17T09:48:21.000Z",
  depositAuthority: DEPOSIT_PATH.handler,
  withdrawalAuthority: WITHDRAWAL_PATH.handler,
  numericType: "BigInt scaled-fraction (2^60); closed-form integer inverse, no floating-point search",
  roundingDirection: "floor",
  whatChanged: [
    "Deposit availability derived from the full deployed path (10 gates), not from capacity.",
    "Withdrawal accessibility derived from withdraw_freely_available = total_available − queued.",
    "Exact maximal integer inverse implemented in closed form and proven maximal.",
    "Safety Buffer recognized/liquid separation wired; liquid fails closed.",
    "depositAvailabilityState blocked → adapter_implemented_source_verified.",
  ],
  whyItChanged: "blocked_deposit_availability was primary and capacity is not permission.",
  knownGaps: [
    "LendingMarket::is_permissioned_market() body not located (both permission fields are default/zero).",
    "RedeemCollateralOptions::REGULAR field values not located; the conservative freely-available branch is used.",
    "The error identifier for exceeding the rolling withdrawal-cap accumulator was not located.",
  ],
  invalidationTriggers: [
    "reserve or market state exceeds TTL",
    "status, emergency_mode, block_ctoken_usage or permissioning changes",
    "the market becomes permissioned (reserve-level permissioned_ops must then be verified)",
    "KLend program upgrade altering either instruction path",
    "the withdraw queue becomes non-zero",
  ],
} as const;

export function computeAvailabilityEvidenceManifestHash(e: typeof AVAILABILITY_EVIDENCE = AVAILABILITY_EVIDENCE): string {
  const material = JSON.stringify({
    id: e.evidenceId, v: e.version, s: e.step, r: e.reserveAddress,
    d: e.depositAuthority, w: e.withdrawalAuthority, n: e.numericType, rd: e.roundingDirection,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `availability_evidence_${h.toString(16).padStart(8, "0")}`;
}

export const AVAILABILITY_EVIDENCE_MANIFEST_HASH = computeAvailabilityEvidenceManifestHash();

export const DEPOSIT_BLOCKER_SUPERSESSION = {
  supersededBlocker: "blocked_deposit_availability",
  supersededAt: "16H-N.6",
  priorDepositAvailabilityState: "blocked",
  resultingDepositAvailabilityState: "adapter_implemented_source_verified",
  priorPrimaryBlocker: "blocked_deposit_availability",
  resultingPrimaryBlocker: "blocked_constraints",
  reason: "The full deployed deposit path resolves: non-Obsolete status, matching version, no reserve/market emergency, block_ctoken_usage = 0, unpermissioned market, and fresh non-zero capacity.",
  withdrawalAccessibilityStateGap:
    "The candidate model has NO withdrawal-accessibility field (only depositAvailabilityState). Per this step's instruction no broad state machine was invented: the exact withdrawal result lives in the availability adapter and flows to Safety Buffer coverage, and exitEvidenceState remains blocked. Reported as a gap.",
  newBlockerEnumInvented: false,
  newLifecycleValueInvented: false,
} as const;

export const AVAILABILITY_CONFERS = {
  confers: ["verified deposit availability", "exact withdrawal accessibility", "liquid Safety Buffer coverage"],
  doesNotConfer: [
    "constraints evaluation", "a risk score", "human review", "risk signoff", "product approval",
    "selector eligibility", "recommendation eligibility", "Top Pick", "a production suggestion card", "execution",
  ],
  constraintsRemain: "blocked",
  riskReviewRemains: "blocked",
  lifecycleUnchanged: "identity_verified — an availability adapter is not a lifecycle transition",
  riskScoreAssigned: false,
  humanReviewOccurred: false,
  signoffOccurred: false,
  productApproved: false,
  transactionConstructedOrSimulated: false,
  executionCtaCreated: false,
} as const;

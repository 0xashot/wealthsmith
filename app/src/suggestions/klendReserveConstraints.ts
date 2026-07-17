/**
 * klendReserveConstraints — Step 16H-N.7. Exact product constraints and amount semantics for the
 * KLend USDC reserve, derived from deployed code — never from UX convenience.
 *
 * THE HEADLINE FINDING: "amount > 0" IS NOT THE MINIMUM
 * ----------------------------------------------------
 * deposit_reserve_liquidity rejects only a zero REQUESTED amount (InvalidAmount). But the amount that
 * matters is the one that survives conversion:
 *
 *   Reserve::compute_depositable_amount_and_minted_collateral (reserve.rs L405-429):
 *     let collateral_amount        = collateral_exchange_rate().liquidity_to_collateral(liquidity_amount);
 *     let liquidity_amount_to_deposit = collateral_exchange_rate().collateral_to_liquidity_ceil(collateral_amount);
 *     require_gte!(liquidity_amount, liquidity_amount_to_deposit, LendingError::MathOverflow);
 *     Ok(DepositLiquidityResult { liquidity_amount: liquidity_amount_to_deposit, collateral_amount })
 *
 * `liquidity_to_collateral` FLOORS (reserve.rs L1520-1522, `try_to_floor`). The cToken is worth MORE
 * than one USDC base unit (1 cToken ≈ 1.1918 USDC), so:
 *
 *     depositing 1 USDC base unit mints ZERO cTokens.
 *
 * And `deposit_liquidity` (reserve.rs L432-441) does NOT reject zero collateral — it calls
 * `liquidity.deposit(0)` and `collateral.mint(0)`. Both are no-ops. So a positive deposit below the
 * boundary SUCCEEDS as a complete no-op: nothing transferred, nothing minted, fees paid for nothing.
 * Verified live: l2c(1) = 0, l2c(2) = 1, l2c(3) = 2.
 *
 * THE EXACT MINIMUM, AS A FORMULA
 * -------------------------------
 * The smallest X with floor(X·S/T) >= 1 is X >= T/S, i.e.
 *
 *     protocolMinimumDepositRaw = ceil(T / S)     // T = liquidity.total_supply(), S = collateral.mint_total_supply
 *
 * At the recorded observation that is 2 base units (0.000002 USDC). It is NOT a constant: it rises with
 * the exchange rate, which rises with every accrual slot. It is stored as a FORMULA plus a dated
 * observation, never as permanent product truth.
 *
 * THE CEIL-BACK IS NOT A REFUND
 * -----------------------------
 * `collateral_to_liquidity_ceil` rounds in the PROTOCOL's favour: depositing 5 base units mints 4
 * cTokens and takes all 5 (ceil(4 × 1.1918) = 5), so the depositor pays up to one base unit more than
 * the minted cTokens are worth. That sub-unit dust accrues to existing suppliers. `require_gte!` only
 * guarantees the protocol never takes MORE than requested — it is a safety assert, not a rebate.
 *
 * STRICTLY READ-ONLY. No transaction is constructed or simulated.
 */
import { ONE_SF } from "./klendReserveCapacity";
import { POSITION_IDENTITY, EXPECTED_TOKEN_PROGRAM_ID } from "./klendDirectLendingPosition";

export const CONSTRAINTS_VERSION = "1.0.0" as const;
export const CONSTRAINTS_METHODOLOGY_ID = "klend_reserve_constraints_methodology_v1" as const;

/* ------------------------------------------------------------------ *
 * 1. Immutable / methodology-level constraints
 * ------------------------------------------------------------------ */

export const DEPOSIT_AMOUNT_SEMANTICS = {
  zeroCheckSymbol: "lending_operations::deposit_reserve_liquidity",
  zeroCheckLocation: "lending_operations.rs L127-131",
  zeroCheckPredicate: "liquidity_amount == 0 → err!(LendingError::InvalidAmount)",
  zeroCheckIsOnRequestedAmount: true,
  zeroCheckIsNotSufficient:
    "It gates the REQUESTED amount only. A positive request can still convert to zero collateral, so `amount > 0` does not establish a valid minimum deposit.",
  conversionSymbol: "Reserve::compute_depositable_amount_and_minted_collateral",
  conversionLocation: "reserve.rs L405-429",
  liquidityToCollateral: "CollateralExchangeRate::liquidity_to_collateral (reserve.rs L1520-1522) — FLOOR via try_to_floor",
  liquidityToCollateralFormula: "floor(collateral_supply × liquidity_amount / liquidity)  [liquidity = total_supply(), a Fraction]",
  ceilBackSymbol: "CollateralExchangeRate::collateral_to_liquidity_ceil (reserve.rs L1411-1428) — CEIL",
  ceilBackPurpose: "Recomputes what the minted collateral is worth, rounded UP, and takes that. It rounds in the PROTOCOL's favour.",
  guard: "require_gte!(liquidity_amount, liquidity_amount_to_deposit, LendingError::MathOverflow)",
  guardMeaning: "A safety assert that the protocol never takes MORE than requested. NOT a refund mechanism.",
  amountTakenIsCeilBack: true,
  dustDisposition: "donated_to_existing_suppliers",
  dustExplanation:
    "The ceil means a depositor pays up to one base unit more than their minted cTokens are worth; the excess accrues to the reserve. Not trapped — it becomes part of total_supply and raises the exchange rate for everyone.",
  zeroCollateralRejected: false,
  zeroCollateralBehaviour:
    "NOT rejected. deposit_liquidity (reserve.rs L432-441) calls liquidity.deposit(0) + collateral.mint(0), both no-ops. A sub-minimum deposit SUCCEEDS transferring nothing and minting nothing.",
  positiveDepositCanMintZeroCTokens: true,
  amountType: "u64 base units",
  granularityRaw: "1",
  granularityNote: "The instruction takes a u64 in base units, so granularity is 1 base unit. Granularity is NOT the minimum.",
} as const;

export const REDEEM_AMOUNT_SEMANTICS = {
  zeroCheckSymbol: "lending_operations::redeem_reserve_collateral",
  zeroCheckLocation: "lending_operations.rs L584-587",
  zeroCheckPredicate: "collateral_amount == 0 → err!(LendingError::InvalidAmount)",
  conversionSymbol: "CollateralExchangeRate::collateral_to_liquidity (reserve.rs L1404-1407) — FLOOR via to_floor",
  conversionFormula: "floor(collateral_amount × liquidity / collateral_supply)",
  burnSymbol: "Reserve::redeem_collateral → withdraw_freely_available (reserve.rs L901-913)",
  liquidityLimit: "liquidity_amount > freely_available_liquidity_amount() → err!(LendingError::InsufficientLiquidity)",
  minimumPositiveCTokenRaw: "1",
  minimumCTokenProducingNonZeroUnderlyingFormula: "ceil(S / T)  — the smallest cToken amount whose floored redemption is >= 1 base unit",
  positiveRedemptionCanProduceZeroUnderlying: true,
  zeroUnderlyingRejected: false,
  zeroUnderlyingClassification: "present_but_not_currently_reachable",
  zeroUnderlyingExplanation:
    "floor(c × T/S) is zero only when T/S < 1, i.e. a cToken worth LESS than one USDC base unit — which requires the reserve to have lost value (e.g. socialized loss). The program does NOT check the resulting liquidity_amount, so such a redemption would burn cTokens for zero USDC. At T/S ≈ 1.1918 this is unreachable, but it is a REAL dust-loss path and is classified rather than dismissed.",
  granularityRaw: "1",
  partialRedemptionAllowed: true,
} as const;

/** Every fee/penalty/timing item, classified — never generalized from KVault. */
export const FEE_AND_TIMING_CONSTRAINTS = {
  depositFee: { state: "absent_by_deployed_code", detail: "No fee is deducted in the supply path. config.fees.originationFeeSf is a BORROW origination fee and does not touch a supplier's deposit." },
  withdrawalFee: { state: "absent_by_deployed_code", detail: "redeem_reserve_collateral returns the floored liquidity_amount unmodified; no fee term appears in the redeem path." },
  withdrawalPenalty: { state: "absent_by_deployed_code", detail: "No penalty term exists in the regular redemption path." },
  performanceFee: { state: "not_applicable_to_direct_reserve", detail: "A vault-manager concept. A KLend reserve has no performance fee. (Steakhouse's 5% performanceFeeBps is a KVault field and does NOT transfer here.)" },
  managementFee: { state: "not_applicable_to_direct_reserve", detail: "Same — a KVault concept, absent from reserve config." },
  protocolTakeRate: {
    state: "present_but_not_a_user_fee",
    valuePct: 10,
    detail: "config.protocol_take_rate_pct = 10 takes a share of BORROWER interest before it reaches suppliers. It is already incorporated into the supply APY the user sees and is NEVER deducted from a deposit or a withdrawal. Labelling it a withdrawal fee would be wrong.",
  },
  cooldown: { state: "absent_by_deployed_code", detail: "No cooldown exists on the regular redemption path." },
  lockup: { state: "absent_by_deployed_code", detail: "No lockup field or time-gate appears in the supply/redeem paths. (config.debt_term_seconds = 0 and debt_maturity_timestamp = 0 are BORROW-side terms.)" },
  fifoQueue: { state: "present_but_not_on_regular_path", detail: "reserve.withdraw_queue exists and enqueue_to_withdraw is a separate instruction. The regular redeem path does not enqueue; instead withdraw_freely_available SUBTRACTS queued liquidity from what is available." },
  withdrawalQueue: { state: "present_but_currently_empty", detail: "withdraw_queue.queued_collateral_amount = 0 at the observation, so freely_available == total_available right now. A non-zero queue would reduce exit liquidity." },
  rollingWithdrawalCap: {
    state: "present_and_exact",
    detail: "config.deposit_withdrawal_cap: a rolling accumulator, DISTINCT from reserve liquidity. Deposits subtract, withdrawals add. configCapacity = 90,000,000 USDC over an 86,400s interval; currentTotal = -1,917,115.46 (net inflow), so headroom is 91,917,115.46 USDC — far above the ~22.9M of freely available liquidity, so liquidity binds first.",
    isDistinctFromLiquidity: true,
  },
  cTokenTransferRestrictions: { state: "absent_by_config", detail: "The cToken mint is a plain SPL Token mint (owner TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA) with no transfer hook or Token-2022 extension. Verified live." },
} as const;

export const ACCOUNT_REQUIREMENTS = {
  protocolConstraints: {
    walletMustSign: true,
    sourceLiquidityAccountOwnedByWallet: true,
    sourceMintMustBeCanonicalUsdc: POSITION_IDENTITY.liquidityMint,
    destinationCollateralMint: POSITION_IDENTITY.cTokenMint,
    liquidityTokenProgram: EXPECTED_TOKEN_PROGRAM_ID,
    collateralTokenProgram: EXPECTED_TOKEN_PROGRAM_ID,
    sourceCannotBeReserveVault: "lending_checks.rs L169-176 — the reserve's own supply vaults are rejected as source/destination (InvalidAccountInput)",
    associatedTokenAccountRequired: false,
    associatedTokenAccountNote:
      "The program takes arbitrary token accounts; nothing derives or requires an ATA. Non-associated accounts are fully supported — 16H-N.5's detection already aggregates across both, since getParsedTokenAccountsByOwner enumerates by owner.",
    token2022Handling: "constraints::token_2022::check_only_supported_liquidity_token_extensions gates the liquidity mint. Canonical USDC is a classic SPL mint, so this is satisfied trivially.",
    transferFeeTokenHandling: "not_applicable — canonical USDC has no transfer fee extension",
    frozenAccountBehaviour: "A frozen token account cannot transfer; the SPL Token program rejects it. Not a KLend check.",
    delegateBehaviour: "KLend transfers from the source account by owner authority. A delegated balance is not the wallet's to supply; 16H-N.5's detection already excludes it.",
  },
  walletImplementationRequirements: {
    detail: "A destination cToken account must exist or be created before a deposit. That is a client concern, not a protocol constraint, and is out of scope while WealthSmith is read-only.",
  },
  wealthsmithMvpLimitations: {
    readOnly: true,
    detail: "WealthSmith constructs no transaction, requests no signature and offers no CTA. Mechanical protocol support is NOT permission to act — these are separate, and the read-only stance holds regardless of what the protocol allows.",
  },
} as const;

export const PERMISSIONING_CONSTRAINT = {
  state: "not_permissioned",
  marketPermissioningAuthority: "11111111111111111111111111111111",
  marketPermissionedOps: 0,
  depositRequiresPermission: false,
  redeemRequiresPermission: false,
  detail: "requires_permission = market.is_permissioned_market() && (...). Both permission fields are default/zero. The redeem handler never calls check_permissions at all.",
  isCurrentState: true,
  caveat: "This is CURRENT STATE, not an immutable property. A market can become permissioned; the reserve-level config.permissioned_ops is not exposed by the installed SDK and would need verifying if it did.",
} as const;

export const PER_WALLET_LIMIT = { state: "absent_by_deployed_code", detail: "No per-wallet supply limit exists in the reserve config or the deposit path. Limits are reserve-wide." } as const;
export const PRODUCT_ELIGIBILITY_RESTRICTION = { state: "absent_by_deployed_code", detail: "No allowlist, tier or eligibility gate applies to supplying, beyond market permissioning (currently off)." } as const;

/* ------------------------------------------------------------------ *
 * 2. Exact derivations
 * ------------------------------------------------------------------ */

function ceilDiv(a: bigint, b: bigint): bigint { return (a + b - 1n) / b; }

/** floor(S·X / T) — the program's mint calculation. T is sf-scaled. */
export function liquidityToCollateralFloor(liquidityRaw: bigint, totalSupplySf: bigint, collateralSupply: bigint): bigint {
  return (collateralSupply * liquidityRaw * ONE_SF) / totalSupplySf;
}

/**
 * The exact minimum deposit: the smallest X with floor(X·S/T) >= 1, i.e. ceil(T/S).
 * A FORMULA over current state — never a hardcoded amount, because the rate rises every accrual slot.
 */
export function deriveProtocolMinimumDepositRaw(totalSupplySf: bigint, collateralSupply: bigint): bigint {
  if (totalSupplySf <= 0n || collateralSupply <= 0n) return 0n;
  return ceilDiv(totalSupplySf, ONE_SF * collateralSupply);
}

/** The smallest cToken amount redeeming to >= 1 USDC base unit: ceil(S/T). */
export function deriveMinimumRedeemCTokenRaw(totalSupplySf: bigint, collateralSupply: bigint): bigint {
  if (totalSupplySf <= 0n || collateralSupply <= 0n) return 0n;
  const c = ceilDiv(ONE_SF * collateralSupply, totalSupplySf);
  return c < 1n ? 1n : c;
}

export type ConstraintsFailure =
  | "identity_mismatch" | "stale_state" | "missing_source_slot" | "source_skew_exceeded"
  | "exchange_rate_unresolvable" | "amount_semantics_unresolved";

export const CONSTRAINTS_TTL_MS = 2 * 60 * 1000;
export const MAX_CONSTRAINTS_SLOT_SKEW = 150;

export interface ConstraintsIdentity {
  candidateId: string; marketAddress: string; reserveAddress: string; liquidityMint: string;
  cTokenMint: string; klendProgram: string; cluster: string; assetDecimals: number;
  liquidityTokenProgram: string; collateralTokenProgram: string;
}

export function validateConstraintsIdentity(i: ConstraintsIdentity): { ok: boolean; detail?: string } {
  const b = POSITION_IDENTITY;
  if (i.candidateId !== b.candidateId) return { ok: false, detail: `candidate_mismatch:${i.candidateId}` };
  if (i.marketAddress !== b.marketAddress) return { ok: false, detail: `market_mismatch:${i.marketAddress}` };
  if (i.reserveAddress !== b.reserveAddress) return { ok: false, detail: `reserve_mismatch:${i.reserveAddress}` };
  if (i.liquidityMint !== b.liquidityMint) return { ok: false, detail: `mint_mismatch:${i.liquidityMint}` };
  if (i.cTokenMint !== b.cTokenMint) return { ok: false, detail: `ctoken_mismatch:${i.cTokenMint}` };
  if (i.klendProgram !== b.klendProgram) return { ok: false, detail: `program_mismatch:${i.klendProgram}` };
  if (i.cluster !== "mainnet-beta") return { ok: false, detail: `cluster_mismatch:${i.cluster}` };
  if (i.assetDecimals !== 6) return { ok: false, detail: `decimals_mismatch:${i.assetDecimals}` };
  if (i.liquidityTokenProgram !== EXPECTED_TOKEN_PROGRAM_ID) return { ok: false, detail: `liquidity_token_program_mismatch:${i.liquidityTokenProgram}` };
  if (i.collateralTokenProgram !== EXPECTED_TOKEN_PROGRAM_ID) return { ok: false, detail: `collateral_token_program_mismatch:${i.collateralTokenProgram}` };
  return { ok: true };
}

export interface ConstraintsInputs {
  identity: ConstraintsIdentity;
  totalSupplySf: string | undefined;
  collateralMintTotalSupplyRaw: string | undefined;
  /** From 16H-N.4. The CURRENT bound on additional deposits. */
  remainingCapacityRaw: string | undefined;
  reserveSourceSlot: number | undefined;
  marketSourceSlot: number | undefined;
  capacitySourceSlot: number | undefined;
  observedAt: string;
  nowMs: number;
}

export type MaximumDepositLimitingFactor = "current_remaining_reserve_capacity" | "instruction_u64_maximum" | "unresolved";

export interface ConstraintsResult {
  ok: boolean;
  failure?: ConstraintsFailure;
  failureDetail?: string;
  candidateId?: string; marketAddress?: string; reserveAddress?: string;
  liquidityMint?: string; cTokenMint?: string;
  protocolMinimumDepositRaw?: string;
  protocolMinimumDepositTokenAmount?: number;
  protocolMinimumDepositIsRateDependent: boolean;
  depositGranularityRaw: string;
  depositGranularityTokenAmount: number;
  maximumAdditionalDepositRaw?: string;
  maximumAdditionalDepositTokenAmount?: number;
  maximumDepositLimitingFactor: MaximumDepositLimitingFactor;
  maximumIsCurrentStateDependent: boolean;
  protocolMinimumRedeemCTokenRaw: string;
  protocolMinimumRedeemCTokenAmount: number;
  minimumRedeemUnderlyingRaw?: string;
  withdrawalGranularityRaw: string;
  depositFeeState: string;
  withdrawalFeeState: string;
  withdrawalPenaltyState: string;
  cooldownState: string;
  lockupState: string;
  queueState: string;
  rollingWithdrawalLimitState: string;
  permissioningState: string;
  accountRequirements: typeof ACCOUNT_REQUIREMENTS;
  calculationAuthority: string;
  calculationVersion: string;
  reserveSourceSlot?: number;
  marketSourceSlot?: number;
  capacitySourceSlot?: number;
  sourceSkewSlots?: number;
  observedAt?: string;
  freshnessState?: "fresh" | "stale";
  unresolvedConstraints: string[];
  definitionSufficientForConstraints: boolean;
}

function toTokens(raw: bigint, decimals: number): number {
  const s = 10n ** BigInt(decimals);
  return Number(raw / s) + Number(raw % s) / Number(s);
}

export function deriveKlendReserveConstraints(i: ConstraintsInputs): ConstraintsResult {
  const shell = {
    protocolMinimumDepositIsRateDependent: true,
    depositGranularityRaw: "1", depositGranularityTokenAmount: 1e-6,
    protocolMinimumRedeemCTokenRaw: "1", protocolMinimumRedeemCTokenAmount: 1e-6,
    withdrawalGranularityRaw: "1",
    maximumDepositLimitingFactor: "unresolved" as MaximumDepositLimitingFactor,
    maximumIsCurrentStateDependent: true,
    depositFeeState: FEE_AND_TIMING_CONSTRAINTS.depositFee.state,
    withdrawalFeeState: FEE_AND_TIMING_CONSTRAINTS.withdrawalFee.state,
    withdrawalPenaltyState: FEE_AND_TIMING_CONSTRAINTS.withdrawalPenalty.state,
    cooldownState: FEE_AND_TIMING_CONSTRAINTS.cooldown.state,
    lockupState: FEE_AND_TIMING_CONSTRAINTS.lockup.state,
    queueState: FEE_AND_TIMING_CONSTRAINTS.withdrawalQueue.state,
    rollingWithdrawalLimitState: FEE_AND_TIMING_CONSTRAINTS.rollingWithdrawalCap.state,
    permissioningState: PERMISSIONING_CONSTRAINT.state,
    accountRequirements: ACCOUNT_REQUIREMENTS,
    calculationAuthority: "deployed KLend compute_depositable_amount_and_minted_collateral + redeem_collateral",
    calculationVersion: CONSTRAINTS_VERSION,
  };
  const fail = (failure: ConstraintsFailure, failureDetail: string): ConstraintsResult =>
    ({ ...shell, ok: false, failure, failureDetail, unresolvedConstraints: [failureDetail], definitionSufficientForConstraints: false });

  const id = validateConstraintsIdentity(i.identity);
  if (!id.ok) return fail("identity_mismatch", id.detail!);
  if (i.reserveSourceSlot === undefined || i.marketSourceSlot === undefined || i.capacitySourceSlot === undefined) {
    return fail("missing_source_slot", "a source slot is absent; current-state constraints cannot be dated");
  }
  const ageMs = i.nowMs - Date.parse(i.observedAt);
  const slots = [i.reserveSourceSlot, i.marketSourceSlot, i.capacitySourceSlot];
  const skew = Math.max(...slots) - Math.min(...slots);
  if (!(ageMs >= 0 && ageMs <= CONSTRAINTS_TTL_MS)) return { ...fail("stale_state", `age ${ageMs}ms exceeds TTL ${CONSTRAINTS_TTL_MS}ms`), freshnessState: "stale", sourceSkewSlots: skew };
  if (skew > MAX_CONSTRAINTS_SLOT_SKEW) return { ...fail("source_skew_exceeded", `skew ${skew} slots > ${MAX_CONSTRAINTS_SLOT_SKEW}`), sourceSkewSlots: skew };
  if (i.totalSupplySf === undefined || i.collateralMintTotalSupplyRaw === undefined) return fail("exchange_rate_unresolvable", "conversion inputs absent");

  const T = BigInt(i.totalSupplySf), S = BigInt(i.collateralMintTotalSupplyRaw);
  if (T <= 0n || S <= 0n) return fail("exchange_rate_unresolvable", "zero supply; the exchange rate is undefined");

  const decimals = i.identity.assetDecimals;
  const minDep = deriveProtocolMinimumDepositRaw(T, S);
  const minRedeemC = deriveMinimumRedeemCTokenRaw(T, S);
  const minRedeemUnderlying = (minRedeemC * T) / (ONE_SF * S);

  const unresolved: string[] = [];
  if (i.remainingCapacityRaw === undefined) unresolved.push("maximum_additional_deposit: remaining capacity unresolved");

  const maxRaw = i.remainingCapacityRaw !== undefined ? BigInt(i.remainingCapacityRaw) : undefined;
  return {
    ...shell,
    ok: unresolved.length === 0,
    candidateId: i.identity.candidateId, marketAddress: i.identity.marketAddress,
    reserveAddress: i.identity.reserveAddress, liquidityMint: i.identity.liquidityMint,
    cTokenMint: i.identity.cTokenMint,
    protocolMinimumDepositRaw: minDep.toString(),
    protocolMinimumDepositTokenAmount: toTokens(minDep, decimals),
    maximumAdditionalDepositRaw: maxRaw?.toString(),
    maximumAdditionalDepositTokenAmount: maxRaw !== undefined ? toTokens(maxRaw, decimals) : undefined,
    maximumDepositLimitingFactor: maxRaw !== undefined ? "current_remaining_reserve_capacity" : "unresolved",
    protocolMinimumRedeemCTokenRaw: minRedeemC.toString(),
    protocolMinimumRedeemCTokenAmount: toTokens(minRedeemC, decimals),
    minimumRedeemUnderlyingRaw: minRedeemUnderlying.toString(),
    reserveSourceSlot: i.reserveSourceSlot, marketSourceSlot: i.marketSourceSlot,
    capacitySourceSlot: i.capacitySourceSlot, sourceSkewSlots: skew,
    observedAt: i.observedAt, freshnessState: "fresh",
    unresolvedConstraints: unresolved,
    definitionSufficientForConstraints: unresolved.length === 0,
  };
}

/* ------------------------------------------------------------------ *
 * 3. Current-state vs immutable separation
 * ------------------------------------------------------------------ */

export const CONSTRAINT_LAYER_SEPARATION = {
  immutable: [
    "asset decimals (6)", "u64 base-unit amount type", "floor on liquidity_to_collateral",
    "ceil on collateral_to_liquidity_ceil", "floor on collateral_to_liquidity",
    "token programs", "source/destination account ownership rules",
    "the minimum-deposit FORMULA ceil(T/S)", "absence of deposit fee, withdrawal fee, cooldown and lockup in deployed logic",
  ],
  currentState: [
    "remaining capacity", "rolling withdrawal headroom", "market permissioning configuration",
    "reserve flags (status, emergency_mode, block_ctoken_usage)", "the exchange rate T/S",
    "the RESULT of the minimum formula (2 base units at this observation)",
  ],
  rule: "The minimum-deposit FORMULA is immutable; its RESULT is current state. Storing 2 base units as permanent product truth would be wrong — the rate rises with every accrual slot.",
} as const;

export const CONSTRAINTS_SNAPSHOT = {
  observedAt: "2026-07-17T10:35:48.000Z",
  reserveSourceSlot: 433465111,
  exchangeRateUsdcPerCToken: 1.19180531,
  protocolMinimumDepositRaw: "2",
  protocolMinimumDepositTokenAmount: 0.000002,
  boundaryVerified: { belowMinimum: "l2c(1) = 0 cTokens", exactMinimum: "l2c(2) = 1 cToken", minimumPlusOne: "l2c(3) = 2 cTokens" },
  protocolMinimumRedeemCTokenRaw: "1",
  minimumRedeemUnderlyingRaw: "1",
  ceilBackExample: "X=5 → mints 4 cTokens → takes ceil(4 × 1.1918) = 5 base units (no refund; sub-unit dust accrues to suppliers)",
  isPermanentTruth: false,
  note: "A dated observation of a rate-dependent formula, not a product constant.",
} as const;

/* ------------------------------------------------------------------ *
 * 4. Presentation semantics (recorded, NOT rendered)
 * ------------------------------------------------------------------ */

export const CONSTRAINT_PRESENTATION = {
  verifiedStatements: [
    "No lockup",
    "No withdrawal fee",
    "No deposit fee",
    "Variable APY",
    "Withdrawals depend on current reserve liquidity",
    "Deposits are subject to current reserve capacity",
  ],
  minimumDepositStatement: "Minimum deposit: 0.000002 USDC (varies with the reserve's exchange rate)",
  forbiddenClaims: ["instant withdrawals", "guaranteed access", "no risk", "principal protected", "fixed return", "always withdrawable"],
  mustNotSayUsersCanAlwaysLeave:
    "Exits are NOT unconditional: they remain subject to emergency mode, fresh reserve state, freely available liquidity and the rolling withdrawal limit.",
  mustNotRenderInternalRiskScores: true,
  productionCardRendered: false,
} as const;

/* ------------------------------------------------------------------ *
 * 5. Evidence + state
 * ------------------------------------------------------------------ */

export const PRESERVED_PRIOR_EVIDENCE_N7 = [
  "identity_9773ac14", "apy_evidence_d468fce5", "reward_evidence_cace4fe4",
  "parity_evidence_dd25a9a1", "measured_apy_evidence_ebc7627d",
  "capacity_evidence_e54e310a", "position_evidence_fb2bb70b",
  "blocker_order_evidence_fae4d95f", "availability_evidence_078133b7",
  "steakhouse_evidence_a86da1fd", "steakhouse_automated_assessment_aggregate_5.37",
] as const;

export const CONSTRAINTS_EVIDENCE = {
  evidenceId: CONSTRAINTS_METHODOLOGY_ID,
  version: CONSTRAINTS_VERSION,
  step: "16H-N.7",
  reserveAddress: POSITION_IDENTITY.reserveAddress,
  preparerId: "claude_automated_evidence_preparer",
  preparerRole: "automated_evidence_preparer",
  preparerIsNotHumanReviewer: true,
  evidenceTimestamp: "2026-07-17T10:35:48.000Z",
  depositAuthority: DEPOSIT_AMOUNT_SEMANTICS.conversionSymbol,
  redeemAuthority: REDEEM_AMOUNT_SEMANTICS.conversionSymbol,
  minimumFormula: "ceil(T / S)",
  numericType: "BigInt scaled-fraction (2^60)",
  whatChanged: [
    "Minimum deposit derived exactly as ceil(T/S) = 2 base units, NOT 1 and NOT a friendly amount.",
    "Proved a positive deposit can mint zero cTokens and is not rejected.",
    "Maximum additional deposit bound to current remaining capacity, not the 1B configured cap.",
    "Every fee/cooldown/lockup/queue item classified from deployed code.",
    "constraintsState blocked → adapter_implemented_source_verified.",
  ],
  whyItChanged: "blocked_constraints was primary; 'amount > 0' does not establish a minimum.",
  invalidationTriggers: [
    "reserve state exceeds TTL",
    "the exchange rate moves enough to change ceil(T/S)",
    "KLend upgrade altering conversion or rounding",
    "the market becomes permissioned",
    "the withdraw queue becomes non-zero",
  ],
} as const;

export function computeConstraintsEvidenceManifestHash(e: typeof CONSTRAINTS_EVIDENCE = CONSTRAINTS_EVIDENCE): string {
  const material = JSON.stringify({ id: e.evidenceId, v: e.version, s: e.step, r: e.reserveAddress, d: e.depositAuthority, rd: e.redeemAuthority, f: e.minimumFormula, n: e.numericType });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `constraints_evidence_${h.toString(16).padStart(8, "0")}`;
}

export const CONSTRAINTS_EVIDENCE_MANIFEST_HASH = computeConstraintsEvidenceManifestHash();

export const CONSTRAINTS_BLOCKER_SUPERSESSION = {
  supersededBlocker: "blocked_constraints",
  supersededAt: "16H-N.7",
  priorConstraintsState: "blocked",
  resultingConstraintsState: "adapter_implemented_source_verified",
  priorPrimaryBlocker: "blocked_constraints",
  resultingPrimaryBlocker: "blocked_risk_review",
  reason: "Every mandatory constraint is resolved from deployed code: exact minimum formula, granularity, rounding, maximum semantics, redemption minimum, and a full classification of fees, cooldown, lockup, queue, rolling limit and permissioning.",
  productMinimumUsdNotPopulated:
    "The candidate model's productMinimumUsd is a USD field. The protocol minimum is 0.000002 USDC and converting it to USD requires an approved fresh exact-mint price, which is not wired. The TOKEN-unit minimum is canonical and complete; productMinimumUsd stays undefined rather than assuming USDC = $1.",
  newBlockerEnumInvented: false,
  newLifecycleValueInvented: false,
} as const;

export const CONSTRAINTS_CONFERS = {
  confers: ["exact protocol amount semantics", "current-state maximum bound", "a full fee/timing classification"],
  doesNotConfer: [
    "a risk score", "human review", "risk signoff", "product approval",
    "selector eligibility", "recommendation eligibility", "Top Pick",
    "a production suggestion card", "execution", "ready_for_approval_review",
  ],
  riskReviewRemains: "blocked",
  lifecycleUnchanged: "identity_verified — a constraints adapter is not a lifecycle transition",
  riskScoreAssigned: false,
  humanReviewOccurred: false,
  signoffOccurred: false,
  productApproved: false,
  transactionConstructedOrSimulated: false,
} as const;

/**
 * klendDirectLendingPosition — Step 16H-N.5. Detects an EXISTING direct-lending position in the exact
 * KLend USDC reserve and values it in canonical USDC using the program's own redemption accounting.
 *
 * WHAT THIS ESTABLISHES
 * ---------------------
 *   • whether the wallet holds the exact cToken for this reserve
 *   • the aggregate cToken balance across every wallet-owned account
 *   • the current redeemable underlying USDC claim
 *   • position freshness + confidence
 *   • recognized Safety Buffer capital, when valuation evidence is complete
 *
 * WHAT IT DOES NOT ESTABLISH
 * --------------------------
 *   • whether the user can withdraw right now  (liquidBufferValueUsd stays unresolved — 16H-N.6)
 *   • whether deposits are available            (still blocked)
 *   • recommendation eligibility or approval    (recognition ≠ recommendation)
 *
 * 1 cTOKEN IS NOT 1 USDC
 * ----------------------
 * At the recorded snapshot 1 cToken redeemed for ~1.191791 USDC. The cToken appreciates against USDC as
 * interest accrues; that IS the yield. Treating the balance as USDC would understate the claim by ~19%.
 * There is also no market price for the cToken, and none is used.
 *
 * THE DEPLOYED REDEMPTION PATH (the authority)
 * -------------------------------------------
 *   redeem_reserve_collateral  (lending_operations.rs L574-613) → reserve.redeem_collateral
 *   Reserve::redeem_collateral (reserve.rs L444-457):
 *
 *       let collateral_exchange_rate = self.collateral_exchange_rate();
 *       let liquidity_amount = collateral_exchange_rate.collateral_to_liquidity(collateral_amount);
 *
 *   Reserve::collateral_exchange_rate (reserve.rs L549-552):
 *
 *       let total_liquidity = self.liquidity.total_supply();
 *       self.collateral.exchange_rate(total_liquidity)
 *
 *   CollateralExchangeRate::collateral_to_liquidity (reserve.rs L1404-1407):
 *
 *       self.fraction_collateral_to_liquidity(collateral_amount.into()).to_floor()
 *
 *   checked_fraction_collateral_to_liquidity (reserve.rs L1435-1443):
 *
 *       (BigFraction::from(collateral_amount) * BigFraction::from(self.liquidity)) / self.collateral_supply
 *
 * So the exact claim is:
 *
 *       underlying = FLOOR( cTokenBalance × total_supply / collateral.mint_total_supply )
 *
 * Two details are load-bearing and easy to get wrong:
 *
 *   1. FLOOR. The program truncates (`to_floor`). The SDK's `cTokensToLiquidity` is a Decimal divide
 *      with NO floor, so it reports e.g. 1191791.7274 where the program pays 1191791. Using the SDK
 *      figure would OVERSTATE the user's claim by a fraction of a base unit. We floor, matching the
 *      program, and are never generous with someone else's money.
 *
 *   2. The denominator is `reserve.collateral.mint_total_supply` — the RESERVE'S CACHED FIELD — not the
 *      SPL mint's live `supply`. They genuinely diverge: at the snapshot the SPL mint read
 *      92,452,916,483,318 while the reserve field read 92,452,929,243,853 (~12.76 cTokens apart). The
 *      program reads its own field, so we must too. See CTOKEN_SUPPLY_AUTHORITY.
 *
 * The numerator `total_supply()` is the same fee-excluding quantity capacity counts (reserve.rs
 * L1123-1128), so this module and klendReserveCapacity agree on what "the reserve holds" means.
 *
 * STRICTLY READ-ONLY. No transaction is constructed or simulated.
 */
import { ONE_SF, KLEND_MAINNET_PROGRAM_ID } from "./klendReserveCapacity";

export const KLEND_POSITION_VERSION = "1.0.0" as const;
export const KLEND_POSITION_METHODOLOGY_ID = "klend_direct_lending_position_methodology_v1" as const;

/* ------------------------------------------------------------------ *
 * 1. Exact identity
 * ------------------------------------------------------------------ */

/** The classic SPL Token program. The cToken mint is owned by it — NOT Token-2022. Verified on-chain. */
export const EXPECTED_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export const POSITION_IDENTITY = {
  candidateId: "kamino_usdc_lending",
  productType: "direct_lending",
  marketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
  reserveAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  liquidityMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  cTokenMint: "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D",
  klendProgram: KLEND_MAINNET_PROGRAM_ID,
  cluster: "mainnet-beta",
  /** Verified live: the cToken mint's own `decimals` field is 6 — equal to USDC's, but the two are NOT 1:1. */
  cTokenDecimals: 6,
  liquidityDecimals: 6,
  tokenProgram: EXPECTED_TOKEN_PROGRAM_ID,
} as const;

/** Identification rules. A position is bound by ADDRESS, never by anything human-readable. */
export const IDENTIFICATION_RULES = {
  boundBy: "exact cToken mint address + exact reserve + exact market + exact KLend program + cluster",
  neverIdentifyBy: ["symbol", "display name", "protocol name", "USDC mint alone", "market name alone"],
  rationale:
    "The liquidity mint (canonical USDC) is shared by FOUR reserves in this market alone, and symbols/names are attacker- and typo-controlled. Only the cToken mint is unique to this reserve.",
} as const;

export type PositionIdentityFailure =
  | "candidate_mismatch" | "market_mismatch" | "reserve_mismatch" | "liquidity_mint_mismatch"
  | "ctoken_mint_mismatch" | "program_mismatch" | "cluster_mismatch" | "ctoken_decimals_mismatch"
  | "token_program_mismatch";

export interface PositionIdentityInputs {
  candidateId: string; marketAddress: string; reserveAddress: string; liquidityMint: string;
  cTokenMint: string; klendProgram: string; cluster: string; cTokenDecimals: number; tokenProgram: string;
}

export function validatePositionIdentity(i: PositionIdentityInputs): { ok: boolean; failure?: PositionIdentityFailure; detail?: string } {
  const b = POSITION_IDENTITY;
  if (i.candidateId !== b.candidateId) return { ok: false, failure: "candidate_mismatch", detail: i.candidateId };
  if (i.marketAddress !== b.marketAddress) return { ok: false, failure: "market_mismatch", detail: i.marketAddress };
  if (i.reserveAddress !== b.reserveAddress) return { ok: false, failure: "reserve_mismatch", detail: i.reserveAddress };
  if (i.liquidityMint !== b.liquidityMint) return { ok: false, failure: "liquidity_mint_mismatch", detail: i.liquidityMint };
  if (i.cTokenMint !== b.cTokenMint) return { ok: false, failure: "ctoken_mint_mismatch", detail: i.cTokenMint };
  if (i.klendProgram !== b.klendProgram) return { ok: false, failure: "program_mismatch", detail: i.klendProgram };
  if (i.cluster !== b.cluster) return { ok: false, failure: "cluster_mismatch", detail: i.cluster };
  if (i.cTokenDecimals !== b.cTokenDecimals) return { ok: false, failure: "ctoken_decimals_mismatch", detail: String(i.cTokenDecimals) };
  if (i.tokenProgram !== b.tokenProgram) return { ok: false, failure: "token_program_mismatch", detail: i.tokenProgram };
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * 2. Wallet-account discovery
 * ------------------------------------------------------------------ */

/**
 * Reuses the EXISTING wallet ingestion — useWalletPortfolio.ts:504-525 already calls
 * `getParsedTokenAccountsByOwner` for both TOKEN_PROGRAM_ID and TOKEN_2022_PROGRAM_ID and flattens the
 * result into `ParsedTokenAccount[]`. That RPC returns every token account the wallet owns, associated
 * or not, so no additional scanner is created here. This module only FILTERS and AGGREGATES.
 */
export const WALLET_DISCOVERY_SOURCE = {
  reusedFrom: "src/wallet/useWalletPortfolio.ts:504-525 — getParsedTokenAccountsByOwner(owner, { programId })",
  newScannerCreated: false,
  coversAssociatedAccounts: true,
  coversNonAssociatedAccounts: true,
  rationale:
    "getParsedTokenAccountsByOwner enumerates by OWNER, not by derived ATA address, so associated and non-associated accounts arrive in the same list. Deriving the ATA and reading only that would miss real balances.",
  multipleAccountsPerMint: "supported — balances are summed. A wallet may hold the same mint in several accounts.",
} as const;

/** One wallet token account, in the shape the existing ingestion already produces. */
export interface WalletTokenAccountInput {
  /** The token account address. */
  address: string;
  mint: string;
  /** Owning token program for the account. */
  tokenProgram: string;
  /** Raw integer balance as a decimal string. Never a float. */
  amountRaw: string;
  decimals: number;
  /** The wallet this account belongs to. */
  owner: string;
  /** True if the account is closed / uninitialized. */
  isClosed?: boolean;
  /** Delegated amount, if any — excluded per existing wallet rules. */
  delegateAmountRaw?: string;
  /** Frozen accounts are surfaced but their balance is not spendable-by-owner. */
  isFrozen?: boolean;
}

export interface DiscoveredAccount {
  address: string;
  amountRaw: string;
}

export interface DiscoveryResult {
  accounts: DiscoveredAccount[];
  aggregateRaw: string;
  rejected: { address: string; reason: string }[];
}

const isDigits = (s: string) => /^\d+$/.test(s);

/**
 * Find and aggregate every wallet-owned account holding the EXACT cToken mint.
 *
 * Exclusions are deliberate, not incidental: closed accounts, zero balances, foreign owners, the wrong
 * token program, malformed amounts, and delegated balances all drop out with a recorded reason.
 */
export function discoverCTokenAccounts(accounts: WalletTokenAccountInput[], walletAddress: string): DiscoveryResult {
  const found: DiscoveredAccount[] = [];
  const rejected: { address: string; reason: string }[] = [];
  let aggregate = 0n;

  for (const a of accounts) {
    if (a.mint !== POSITION_IDENTITY.cTokenMint) continue; // not our product; not a rejection
    if (a.owner !== walletAddress) { rejected.push({ address: a.address, reason: "not_owned_by_wallet" }); continue; }
    if (a.tokenProgram !== EXPECTED_TOKEN_PROGRAM_ID) { rejected.push({ address: a.address, reason: `wrong_token_program:${a.tokenProgram}` }); continue; }
    if (a.isClosed === true) { rejected.push({ address: a.address, reason: "closed_account" }); continue; }
    if (a.decimals !== POSITION_IDENTITY.cTokenDecimals) { rejected.push({ address: a.address, reason: `ctoken_decimals_mismatch:${a.decimals}` }); continue; }
    if (typeof a.amountRaw !== "string" || !isDigits(a.amountRaw)) { rejected.push({ address: a.address, reason: "malformed_amount" }); continue; }

    let amount: bigint;
    try { amount = BigInt(a.amountRaw); } catch { rejected.push({ address: a.address, reason: "malformed_amount" }); continue; }
    if (amount === 0n) { rejected.push({ address: a.address, reason: "zero_balance" }); continue; }

    // Existing wallet rules: a delegated balance is not the wallet's to count.
    if (a.delegateAmountRaw !== undefined && isDigits(a.delegateAmountRaw)) {
      const delegated = BigInt(a.delegateAmountRaw);
      if (delegated >= amount) { rejected.push({ address: a.address, reason: "fully_delegated" }); continue; }
      amount -= delegated;
    }

    found.push({ address: a.address, amountRaw: amount.toString() });
    aggregate += amount;
  }

  return { accounts: found, aggregateRaw: aggregate.toString(), rejected };
}

/* ------------------------------------------------------------------ *
 * 3. Valuation
 * ------------------------------------------------------------------ */

export const CTOKEN_SUPPLY_AUTHORITY = {
  authoritativeField: "reserve.collateral.mint_total_supply",
  notAuthoritative: "the SPL cToken mint's own `supply` field",
  theyDiverge: true,
  divergenceObserved:
    "At the snapshot the SPL mint reported 92,452,916,483,318 while reserve.collateral.mintTotalSupply reported 92,452,929,243,853 — ~12.76 cTokens apart.",
  rationale:
    "Reserve::collateral_exchange_rate reads self.collateral.mint_total_supply (reserve.rs L1365-1373). The program divides by ITS OWN cached field, so using the SPL mint's live supply would compute a rate the program would never honour.",
} as const;

export const VALUATION_SEMANTICS = {
  formula: "underlying = FLOOR( cTokenBalance × liquidity.total_supply() / collateral.mint_total_supply )",
  programAuthority: "reserve.rs L444-457 redeem_collateral → L1404-1407 collateral_to_liquidity → L1435-1443 checked_fraction_collateral_to_liquidity",
  liquidityNumerator: "ReserveLiquidity::total_supply() — available + borrowed − protocolFees − referrerFees − pendingReferrerFees (reserve.rs L1123-1128)",
  collateralDenominator: "ReserveCollateral::mint_total_supply",
  accruedInterestTreatment:
    "INCLUDED. redeem_reserve_collateral rejects a stale reserve (ReserveStale) and the refresh accrues interest first, so the rate reflects interest to the current slot. The estimated (accrued) total supply is therefore the correct numerator, not the last-refreshed stale one.",
  feeTreatment: "protocol, referrer and pending referrer fees are EXCLUDED from the numerator — they are not the suppliers' claim.",
  roundingDirection: "floor (to_floor) — truncates toward zero",
  roundingRationale: "The program pays the floored amount. Reporting the unfloored value would overstate the user's claim.",
  sdkDivergence:
    "KaminoReserve.cTokensToLiquidity (reserve.js:325-338) is a Decimal divide with NO floor: it returns 1191791.7274 where the program pays 1191791. The SDK's rate is also INVERTED (mintTotalSupply/totalSupply, i.e. collateral-per-liquidity) and is divided by rather than multiplied. This module mirrors the PROGRAM.",
  marketPriceUsed: false,
  marketPriceRationale: "The cToken has no market price and none is used. Its value is defined by reserve accounting alone.",
  oneToOneAssumed: false,
  observedRate: "1 cToken ≈ 1.191791 USDC at the snapshot — cToken ≠ USDC.",
  dustBehaviour:
    "A balance small enough that floor(balance × rate) = 0 values at 0 underlying. That mirrors the program, which would pay 0. The position still EXISTS (positionExists is driven by a non-zero cToken balance, not by a non-zero valuation), so dust is never silently discarded.",
  initialCollateralRateSentinel:
    "If mint_total_supply == 0 or total_liquidity == 0 the program falls back to INITIAL_COLLATERAL_RATE (reserve.rs L1365-1373). A wallet cannot hold cTokens of a zero-supply mint, so that combination is contradictory state and FAILS CLOSED rather than being valued at a bootstrap rate.",
} as const;

export type PositionFailure =
  | "identity_mismatch" | "stale_wallet_data" | "stale_reserve_state" | "stale_ctoken_mint_state"
  | "source_skew_exceeded" | "missing_conversion_inputs" | "malformed_conversion_inputs"
  | "contradictory_zero_supply" | "non_finite_output";

/** Max slots between the wallet read, the reserve read and the cToken mint read. */
export const MAX_POSITION_SOURCE_SKEW = 150;
/** Position TTL: 2 min. The claim moves with every accrual slot, and the underlying rate is live. */
export const POSITION_TTL_MS = 2 * 60 * 1000;

export type PositionFreshness = "fresh" | "stale";
export type PositionConfidence = "verified_exact" | "unverified";

export interface PositionInputs {
  identity: PositionIdentityInputs;
  walletAddress: string;
  accounts: WalletTokenAccountInput[];
  /** Raw sf (2^60) estimated total supply, accrued to the reserve source slot. */
  estimatedTotalSupplySf: string | undefined;
  /** Raw `reserve.collateral.mint_total_supply`. */
  collateralMintTotalSupplyRaw: string | undefined;
  walletSourceSlot: number;
  reserveSourceSlot: number;
  cTokenMintSourceSlot: number;
  observedAt: string;
  nowMs: number;
}

export interface KlendPositionResult {
  ok: boolean;
  failure?: PositionFailure;
  failureDetail?: string;
  candidateId?: string;
  walletAddress?: string;
  marketAddress?: string;
  reserveAddress?: string;
  liquidityMint?: string;
  cTokenMint?: string;
  sourceTokenAccounts?: DiscoveredAccount[];
  rejectedAccounts?: { address: string; reason: string }[];
  cTokenBalanceRaw?: string;
  cTokenBalanceNormalized?: number;
  /** Underlying USDC per 1 cToken, for display/diagnostics only. Valuation uses integer math. */
  collateralExchangeRate?: number;
  underlyingUsdcRaw?: string;
  underlyingUsdcTokenAmount?: number;
  positionExists: boolean;
  valuationAuthority?: string;
  valuationVersion?: string;
  walletSourceSlot?: number;
  reserveSourceSlot?: number;
  cTokenMintSourceSlot?: number;
  sourceSkewSlots?: number;
  observedAt?: string;
  freshnessTtlMs: number;
  freshnessState?: PositionFreshness;
  positionConfidence?: PositionConfidence;
  invalidationReason?: string;
}

function baseUnitsToTokens(raw: bigint, decimals: number): number {
  const scale = 10n ** BigInt(decimals);
  return Number(raw / scale) + Number(raw % scale) / Number(scale);
}

function posFail(failure: PositionFailure, failureDetail: string): KlendPositionResult {
  return { ok: false, failure, failureDetail, positionExists: false, freshnessTtlMs: POSITION_TTL_MS, invalidationReason: failureDetail };
}

/**
 * Detect and value an existing direct-lending position. Fails closed on identity, freshness, skew, or
 * missing conversion inputs — a position is never reported on assumptions.
 */
export function deriveKlendDirectLendingPosition(i: PositionInputs): KlendPositionResult {
  const identity = validatePositionIdentity(i.identity);
  if (!identity.ok) return posFail("identity_mismatch", `${identity.failure}: ${identity.detail}`);

  const discovery = discoverCTokenAccounts(i.accounts, i.walletAddress);
  const balanceRaw = BigInt(discovery.aggregateRaw);

  // No cTokens: a definite, verified "no position". Not a failure.
  if (balanceRaw === 0n) {
    return {
      ok: true, positionExists: false,
      candidateId: i.identity.candidateId, walletAddress: i.walletAddress,
      marketAddress: i.identity.marketAddress, reserveAddress: i.identity.reserveAddress,
      liquidityMint: i.identity.liquidityMint, cTokenMint: i.identity.cTokenMint,
      sourceTokenAccounts: [], rejectedAccounts: discovery.rejected,
      cTokenBalanceRaw: "0", cTokenBalanceNormalized: 0,
      underlyingUsdcRaw: "0", underlyingUsdcTokenAmount: 0,
      walletSourceSlot: i.walletSourceSlot, observedAt: i.observedAt,
      freshnessTtlMs: POSITION_TTL_MS, freshnessState: "fresh", positionConfidence: "verified_exact",
      valuationVersion: KLEND_POSITION_VERSION,
    };
  }

  // A position exists. Now every valuation input must be present, fresh and consistent.
  const ageMs = i.nowMs - Date.parse(i.observedAt);
  if (!(ageMs >= 0 && ageMs <= POSITION_TTL_MS)) {
    return { ...posFail("stale_wallet_data", `position data age ${ageMs}ms exceeds TTL ${POSITION_TTL_MS}ms`), freshnessState: "stale", positionExists: true, cTokenBalanceRaw: discovery.aggregateRaw };
  }

  const slots = [i.walletSourceSlot, i.reserveSourceSlot, i.cTokenMintSourceSlot];
  const skew = Math.max(...slots) - Math.min(...slots);
  if (skew > MAX_POSITION_SOURCE_SKEW) {
    return { ...posFail("source_skew_exceeded", `wallet/reserve/cToken slots span ${skew} slots, exceeding ${MAX_POSITION_SOURCE_SKEW}`), positionExists: true, cTokenBalanceRaw: discovery.aggregateRaw, sourceSkewSlots: skew };
  }

  if (i.estimatedTotalSupplySf === undefined || i.collateralMintTotalSupplyRaw === undefined) {
    return { ...posFail("missing_conversion_inputs", "estimatedTotalSupplySf or collateralMintTotalSupplyRaw absent — the claim cannot be valued"), positionExists: true, cTokenBalanceRaw: discovery.aggregateRaw };
  }
  if (!isDigits(i.collateralMintTotalSupplyRaw) || !/^-?\d+$/.test(i.estimatedTotalSupplySf)) {
    return { ...posFail("malformed_conversion_inputs", "conversion inputs are not decimal strings"), positionExists: true, cTokenBalanceRaw: discovery.aggregateRaw };
  }

  const totalSupplySf = BigInt(i.estimatedTotalSupplySf);
  const collateralSupply = BigInt(i.collateralMintTotalSupplyRaw);
  if (collateralSupply === 0n || totalSupplySf <= 0n) {
    return { ...posFail("contradictory_zero_supply", "the wallet holds cTokens but collateral supply or total liquidity is zero — contradictory state; refusing to value at INITIAL_COLLATERAL_RATE"), positionExists: true, cTokenBalanceRaw: discovery.aggregateRaw };
  }

  // Program-faithful: FLOOR(balance × totalSupply / collateralSupply), in exact BigInt.
  // totalSupplySf carries a 2^60 scale, so divide it back out in the same floor division.
  const underlyingRaw = (balanceRaw * totalSupplySf) / (ONE_SF * collateralSupply);
  const underlyingTokens = baseUnitsToTokens(underlyingRaw, POSITION_IDENTITY.liquidityDecimals);
  if (!Number.isFinite(underlyingTokens)) return { ...posFail("non_finite_output", "underlying valuation is non-finite"), positionExists: true };

  return {
    ok: true,
    positionExists: true,
    candidateId: i.identity.candidateId,
    walletAddress: i.walletAddress,
    marketAddress: i.identity.marketAddress,
    reserveAddress: i.identity.reserveAddress,
    liquidityMint: i.identity.liquidityMint,
    cTokenMint: i.identity.cTokenMint,
    sourceTokenAccounts: discovery.accounts,
    rejectedAccounts: discovery.rejected,
    cTokenBalanceRaw: discovery.aggregateRaw,
    cTokenBalanceNormalized: baseUnitsToTokens(balanceRaw, POSITION_IDENTITY.cTokenDecimals),
    collateralExchangeRate: Number(totalSupplySf) / Number(ONE_SF * collateralSupply),
    underlyingUsdcRaw: underlyingRaw.toString(),
    underlyingUsdcTokenAmount: underlyingTokens,
    valuationAuthority: VALUATION_SEMANTICS.programAuthority,
    valuationVersion: KLEND_POSITION_VERSION,
    walletSourceSlot: i.walletSourceSlot,
    reserveSourceSlot: i.reserveSourceSlot,
    cTokenMintSourceSlot: i.cTokenMintSourceSlot,
    sourceSkewSlots: skew,
    observedAt: i.observedAt,
    freshnessTtlMs: POSITION_TTL_MS,
    freshnessState: "fresh",
    positionConfidence: "verified_exact",
  };
}

/* ------------------------------------------------------------------ *
 * 4. Safety Buffer recognition boundary
 * ------------------------------------------------------------------ */

/**
 * Recognition ≠ recommendation, and recognition ≠ liquidity. This module can populate
 * `recognizedBufferValueUsd` (what the user HAS) but must leave `liquidBufferValueUsd` unresolved:
 * whether the reserve can actually be exited right now is 16H-N.6's question, and buffer SUFFICIENCY
 * must never count unverified liquidity. The existing separation in stableYieldBufferRecognition.ts is
 * reused rather than re-implemented.
 */
export const BUFFER_RECOGNITION_BOUNDARY = {
  reuses: "src/suggestions/stableYieldBufferRecognition.ts — recognizedBufferValueUsd / liquidBufferValueUsd separation",
  recognizedMeaning: "the confirmed underlying canonical-USDC claim the wallet already holds",
  liquidMeaning: "the portion verified as immediately withdrawable — drives SUFFICIENCY",
  liquidBufferValueUsdThisStep: "unresolved",
  liquidBufferValueUsdRationale:
    "Withdrawal accessibility for this reserve is NOT verified. free liquidity, Active status and a positive claim are not proof of exit. Until 16H-N.6 verifies it, liquid stays unresolved and this position counts toward NO sufficiency check.",
  countsTowardSufficiency: false,
  impliesRecommendation: false,
  impliesApproval: false,
  inventedHaircut: false,
  inventedHaircutNote: "No percentage haircut is applied. The choice is verified-or-unresolved, never a guess in between.",
  visibleUnderYieldStrategies: true,
} as const;

export type UsdRecognition =
  | { state: "recognized"; recognizedBufferValueUsd: number; priceSource: string; priceObservedAt: string }
  | { state: "unavailable_no_fresh_price"; recognizedBufferValueUsd: null; tokenAmountPreserved: number; reason: string };

/**
 * Convert the underlying token claim to USD via the EXISTING approved exact-mint price path only.
 * USDC is NOT assumed to be $1 — the API's own totalSupplyUsd/totalSupply implies ~$0.99985. Without a
 * fresh approved price the token amount stands and USD recognition is simply unavailable.
 */
export function recognizeUnderlyingUsd(args: {
  underlyingUsdcTokenAmount: number;
  usdcPriceUsd: number | undefined;
  priceSource: string | undefined;
  priceObservedAt: string | undefined;
  priceMaxAgeMs: number;
  nowMs: number;
}): UsdRecognition {
  const { underlyingUsdcTokenAmount, usdcPriceUsd, priceSource, priceObservedAt, priceMaxAgeMs, nowMs } = args;
  if (usdcPriceUsd === undefined || priceSource === undefined || priceObservedAt === undefined) {
    return { state: "unavailable_no_fresh_price", recognizedBufferValueUsd: null, tokenAmountPreserved: underlyingUsdcTokenAmount, reason: "no approved exact-mint USDC/USD price supplied; USDC is not assumed to equal $1" };
  }
  const age = nowMs - Date.parse(priceObservedAt);
  if (!(age >= 0 && age <= priceMaxAgeMs)) {
    return { state: "unavailable_no_fresh_price", recognizedBufferValueUsd: null, tokenAmountPreserved: underlyingUsdcTokenAmount, reason: `USDC price age ${age}ms exceeds max ${priceMaxAgeMs}ms` };
  }
  if (!Number.isFinite(usdcPriceUsd) || usdcPriceUsd <= 0) {
    return { state: "unavailable_no_fresh_price", recognizedBufferValueUsd: null, tokenAmountPreserved: underlyingUsdcTokenAmount, reason: "USDC price is non-finite or non-positive" };
  }
  return { state: "recognized", recognizedBufferValueUsd: underlyingUsdcTokenAmount * usdcPriceUsd, priceSource, priceObservedAt };
}

/* ------------------------------------------------------------------ *
 * 5. Presentation semantics (recorded, NOT rendered)
 * ------------------------------------------------------------------ */

export const EXISTING_POSITION_SEMANTICS = {
  protocol: "Kamino",
  strategy: "Direct USDC lending",
  market: "SOL/BTC Market",
  value: "current underlying USDC claim",
  apy: "estimated and variable",
  productionCardRendered: false,
  recommendationCreated: false,
  topPickCreated: false,
  mustNotTellUserTo: ["deposit", "withdraw", "migrate from Steakhouse"],
  mustNotRender: ["internal numeric risk scores", "an approved label"],
  transactionActionEnabled: false,
  note: "Recorded for a later portfolio-presentation step. This module renders nothing.",
} as const;

/* ------------------------------------------------------------------ *
 * 6. Frozen evidence snapshot (immutable; NOT production input)
 * ------------------------------------------------------------------ */

export const POSITION_SNAPSHOT = {
  observedAt: "2026-07-17T07:05:00.000Z",
  cTokenMintOwnerProgram: EXPECTED_TOKEN_PROGRAM_ID,
  cTokenDecimals: 6,
  splMintReportedSupply: "92452916483318",
  reserveCollateralMintTotalSupply: "92452929243853",
  supplyFieldsDiverge: true,
  estimatedTotalSupply: "110184636249066.8072",
  sdkCollateralExchangeRate: 0.83907278175214756112,
  sdkRateIsInverted: true,
  underlyingPerCTokenFloorRaw: "1191791",
  underlyingPerCTokenSdkUnfloored: "1191791.7274253671194",
  floorNeverOverstates: true,
  oneCTokenInUsdc: 1.191791,
  cTokenEqualsUsdc: false,
} as const;

export const POSITION_SNAPSHOT_IS_NOT_PRODUCTION_INPUT = {
  isImmutableEvidence: true,
  isProductionInput: false,
  isProductIdentity: false,
  rule: "The exchange rate rises every accrual slot. Replaying this snapshot would report a stale claim as current.",
} as const;

/* ------------------------------------------------------------------ *
 * 7. Evidence + state
 * ------------------------------------------------------------------ */

export const PRESERVED_PRIOR_EVIDENCE_N5 = [
  "identity_9773ac14", "klend_reserve_apy_methodology_v1", "apy_evidence_d468fce5",
  "klend_reserve_reward_methodology_v1", "reward_evidence_cace4fe4",
  "klend_reserve_apy_parity_v1", "parity_evidence_dd25a9a1",
  "klend_reserve_measured_apy_methodology_v1", "measured_apy_evidence_ebc7627d",
  "solana_slot_duration_methodology_v1",
  "klend_reserve_capacity_methodology_v1", "capacity_evidence_e54e310a",
  "steakhouse_evidence_a86da1fd", "steakhouse_automated_assessment_aggregate_5.37",
] as const;

export const POSITION_EVIDENCE = {
  evidenceId: KLEND_POSITION_METHODOLOGY_ID,
  version: KLEND_POSITION_VERSION,
  step: "16H-N.5",
  reserveAddress: POSITION_IDENTITY.reserveAddress,
  cTokenMint: POSITION_IDENTITY.cTokenMint,
  preparerId: "claude_automated_evidence_preparer",
  preparerRole: "automated_evidence_preparer",
  preparerIsNotHumanReviewer: true,
  evidenceTimestamp: "2026-07-17T07:05:00.000Z",
  valuationAuthority: "deployed KLend redeem_collateral → collateral_to_liquidity (floor)",
  numericType: "BigInt scaled-fraction (2^60); float only at the display boundary",
  outputUnit: "canonical USDC token amount (raw base units retained)",
  roundingDirection: "floor",
  whatChanged: [
    "Exact cToken identity, token-program binding and decimals verified on-chain.",
    "Wallet discovery reuses existing ingestion; multiple accounts per mint are aggregated.",
    "Underlying valuation implemented from the deployed redemption path, with the program's floor.",
    "positionDetectionState no_adapter → adapter_implemented_source_verified.",
    "Recognition boundary fixed: recognized may populate; liquid stays unresolved until 16H-N.6.",
  ],
  whyItChanged: "blocked_position_detection was primary: an existing position in this reserve was invisible to the portfolio.",
  sourceProvenance: [
    "programs/klend/src/lending_market/lending_operations.rs :: redeem_reserve_collateral L574-613",
    "programs/klend/src/state/reserve.rs :: Reserve::redeem_collateral L444-457",
    "programs/klend/src/state/reserve.rs :: Reserve::collateral_exchange_rate L549-552",
    "programs/klend/src/state/reserve.rs :: ReserveCollateral::exchange_rate L1365-1373",
    "programs/klend/src/state/reserve.rs :: CollateralExchangeRate::collateral_to_liquidity L1404-1407",
    "programs/klend/src/state/reserve.rs :: checked_fraction_collateral_to_liquidity L1435-1443",
    "on-chain cToken mint + reserve state via mainnet-beta RPC (read-only)",
  ],
  invalidationTriggers: [
    "position data exceeds TTL",
    "wallet/reserve/cToken source skew exceeds bound",
    "KLend program upgrade altering redeem_collateral or the exchange rate",
    "cToken mint or reserve identity changes",
    "the cToken mint's token program or decimals change",
  ],
} as const;

export function computePositionEvidenceManifestHash(e: typeof POSITION_EVIDENCE = POSITION_EVIDENCE): string {
  const material = JSON.stringify({
    id: e.evidenceId, v: e.version, s: e.step, r: e.reserveAddress, c: e.cTokenMint,
    a: e.valuationAuthority, n: e.numericType, u: e.outputUnit, rd: e.roundingDirection,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `position_evidence_${h.toString(16).padStart(8, "0")}`;
}

export const POSITION_EVIDENCE_MANIFEST_HASH = computePositionEvidenceManifestHash();

export const POSITION_BLOCKER_SUPERSESSION = {
  supersededBlocker: "blocked_position_detection",
  supersededAt: "16H-N.5",
  priorPositionDetectionState: "no_adapter",
  resultingPositionDetectionState: "adapter_implemented_source_verified",
  priorPrimaryBlocker: "blocked_position_detection",
  resultingPrimaryBlocker: "blocked_risk_review",
  reason:
    "The exact cToken is detected across all wallet-owned accounts and valued by the program's own redemption math, with the program's floor.",
  /**
   * STATE-MODEL GAP, carried forward from 16H-N.4 and now BINDING. The genuinely next-most-blocking
   * facts are deposit availability and constraints, but StableYieldEvidencePrimaryStatus has no value
   * for either. Rather than invent one, primary moves to blocked_risk_review — which IS supported and
   * IS genuinely unresolved (riskReviewState blocked, no score, no reviewer, no signoff). This is the
   * same primary Steakhouse already sits at, and it is accurate; it is simply not the most proximate
   * blocker. The gap is reported for a future state-model step.
   */
  stateModelGap:
    "StableYieldEvidencePrimaryStatus still has no blocked_deposit_availability or blocked_constraints value. Both remain genuinely blocked and are carried as blocker strings. primary moves to blocked_risk_review — supported and genuinely unresolved — rather than inventing an enum. Reported for a future state-model step.",
  newBlockerEnumInvented: false,
  newLifecycleValueInvented: false,
} as const;

export const POSITION_CONFERS = {
  confers: [
    "exact existing-position detection",
    "program-faithful underlying USDC valuation",
    "portfolio visibility under Yield Strategies",
    "recognized (not liquid) Safety Buffer capital when a fresh approved price exists",
  ],
  doesNotConfer: [
    "withdrawal availability", "deposit availability", "constraints eligibility",
    "a risk score", "human review", "risk signoff", "product approval",
    "selector eligibility", "recommendation eligibility", "Top Pick",
    "a production suggestion card", "buffer sufficiency", "execution",
  ],
  depositAvailabilityRemains: "blocked",
  constraintsRemain: "blocked",
  liquidBufferValueUsdRemains: "unresolved",
  lifecycleUnchanged: "identity_verified — no existing justified transition applies to a position adapter; none invented.",
  riskScoreAssigned: false,
  humanReviewOccurred: false,
  signoffOccurred: false,
  productApproved: false,
  transactionConstructedOrSimulated: false,
} as const;

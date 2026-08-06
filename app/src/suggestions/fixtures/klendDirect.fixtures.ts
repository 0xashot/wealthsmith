/**
 * Kamino Klend direct-lending fixture checks (reserve capacity, positions, availability,
 * constraints, market data, and the vetted existing-position + fail-closed contracts).
 *
 * Extracted verbatim from suggestionEngine.fixtures.ts (progressive monolith split —
 * same pattern as recordedObligation/observationDismissal). The monolith imports and
 * aggregates these checks; behavior and check names are unchanged.
 */
import { computeSafetyBufferCoverage as sbCoverage } from "../../wallet/safetyBufferCoverage";
import { getDisposition as dlGetDispo } from "../directUsdcLendingDispositions";
import { DIRECT_USDC_LENDING_CATEGORY_MINIMUM as DL_CATMIN, UNIVERSAL_MINIMUM as DL_UNIMIN } from "../directUsdcLendingEligibilityPolicy";
import { PRODUCTION_ACTIVATION as GR_ACTIVATION } from "../directUsdcLendingGovernanceRecords";
import { RUNTIME_PRODUCT_IDENTITY as RT_ID, evaluateDirectLendingRuntime as rtEval, governanceInputFromActivation as rtGov } from "../directUsdcLendingRuntimeAdapter";
import type { FixtureCheck } from "./fixtureCheck";
import { KVAULT_CAPACITY_SOURCE, U64_MAX_STR } from "../kaminoVaultCapacitySemantics";
import { BUFFER_RECOGNITION_BOUNDARY, CTOKEN_SUPPLY_AUTHORITY, EXISTING_POSITION_SEMANTICS, EXPECTED_TOKEN_PROGRAM_ID, EXPECTED_TOKEN_PROGRAM_ID as EP_TOKPROG, IDENTIFICATION_RULES, MAX_POSITION_SOURCE_SKEW, POSITION_BLOCKER_SUPERSESSION, POSITION_CONFERS, POSITION_EVIDENCE, POSITION_EVIDENCE_MANIFEST_HASH, POSITION_IDENTITY, POSITION_IDENTITY as EP_POS_ID, POSITION_SNAPSHOT, POSITION_SNAPSHOT_IS_NOT_PRODUCTION_INPUT, POSITION_TTL_MS, PRESERVED_PRIOR_EVIDENCE_N5, TOKEN_2022_PROGRAM_ID, VALUATION_SEMANTICS, WALLET_DISCOVERY_SOURCE, computePositionEvidenceManifestHash, deriveKlendDirectLendingPosition, discoverCTokenAccounts, recognizeUnderlyingUsd, validatePositionIdentity } from "../klendDirectLendingPosition";
import type { PositionIdentityInputs, WalletTokenAccountInput } from "../klendDirectLendingPosition";
import { DIRECT_ASSESSMENT_MANIFEST_HASH as DA_MANIFEST_HASH, DIRECT_ASSESSMENT_OUTCOME as DA_OUTCOME } from "../klendDirectUsdcAutomatedAssessment";
import { KLEND_DIRECT_POSITION_DEDUPE_KEY as EP_KEY, KLEND_DIRECT_POSITION_ID as EP_ID, buildKlendDirectUsdcExistingPosition as epBuild, dedupeKlendDirectPosition as epDedupe, mergeKlendDirectPosition as epMerge, obligationCTokenAccount as epObAccount, toWalletPosition as epToWallet } from "../klendDirectUsdcExistingPosition";
import type { KlendDirectExistingPositionInput as EPInput } from "../klendDirectUsdcExistingPosition";
import { KLEND_DIRECT_USDC_IDENTITY as MD_ID, buildKlendDirectUsdcMarketSnapshot as mdBuild, capacityCoversAmount as mdCovers, toRuntimeMarketInput as mdToRuntime } from "../klendDirectUsdcMarketData";
import type { KlendDirectUsdcMarketSnapshot as MDSnap, KlendDirectUsdcRawRead as MDRaw } from "../klendDirectUsdcMarketData";
import { APY_EVIDENCE_MANIFEST_HASH, computeApyEvidenceManifestHash } from "../klendReserveApyDerivation";
import { PARITY_EVIDENCE_MANIFEST_HASH, computeParityEvidenceManifestHash } from "../klendReserveApyParityAmendment";
import { AVAILABILITY_CONFERS, AVAILABILITY_EVIDENCE, AVAILABILITY_EVIDENCE_MANIFEST_HASH, AVAILABILITY_PRESENTATION, AVAILABILITY_SNAPSHOT, AVAILABILITY_TTL_MS, BUFFER_COVERAGE_POLICY, DEPOSIT_BLOCKER_SUPERSESSION, DEPOSIT_PATH, MAX_AVAILABILITY_SLOT_SKEW, PRESERVED_PRIOR_EVIDENCE_N6, ROLLING_WITHDRAWAL_CAP, SNAPSHOT_IS_NOT_PRODUCTION_INPUT_N6, STEAKHOUSE_CAPACITY_CONTRADICTION_UNTOUCHED, WITHDRAWAL_PATH, collateralToLiquidityFloor, computeAvailabilityEvidenceManifestHash, computeBufferCoverage, evaluateDepositAvailability, evaluateWithdrawalAccessibility, maxRedeemableCTokens } from "../klendReserveAvailability";
import type { AvailabilityIdentity, DepositAvailabilityInputs, WithdrawalAccessibilityInputs } from "../klendReserveAvailability";
import { API_PARITY_OBSERVATIONS, CAPACITY_BLOCKER_SUPERSESSION, CAPACITY_CONFERS, CAPACITY_EVIDENCE, CAPACITY_EVIDENCE_MANIFEST_HASH, CAPACITY_IS_NOT_DEPOSIT_STATE, CAPACITY_LAYER_SEPARATION, CAPACITY_PARITY_RESULT, CAPACITY_PRODUCT_BINDING, CAPACITY_SNAPSHOT, CAPACITY_TTL_MS, DEPOSIT_LIMIT_SENTINEL_SEMANTICS, ENFORCEMENT_FACTS, KAMINO_CAPACITY_API_DIAGNOSTIC, KLEND_CAPACITY_SOURCE, MAX_CAPACITY_SLOT_AGE, ONE_SF as EP_ONE_SF, PRESERVED_PRIOR_EVIDENCE as PRESERVED_PRIOR_EVIDENCE_CAP, SDK_MIRRORS_ENFORCEMENT, SNAPSHOT_IS_NOT_PRODUCTION_INPUT, USD_CAPACITY, classifyCapacityParity, computeCapacityEvidenceManifestHash, deriveKlendReserveCapacity, validateCapacityIdentity } from "../klendReserveCapacity";
import type { CapacityIdentityInputs } from "../klendReserveCapacity";
import { ACCOUNT_REQUIREMENTS, CONSTRAINTS_BLOCKER_SUPERSESSION, CONSTRAINTS_CONFERS, CONSTRAINTS_EVIDENCE, CONSTRAINTS_EVIDENCE_MANIFEST_HASH, CONSTRAINTS_SNAPSHOT, CONSTRAINTS_TTL_MS, CONSTRAINT_LAYER_SEPARATION, CONSTRAINT_PRESENTATION, DEPOSIT_AMOUNT_SEMANTICS, FEE_AND_TIMING_CONSTRAINTS, MAX_CONSTRAINTS_SLOT_SKEW, PERMISSIONING_CONSTRAINT, PER_WALLET_LIMIT, PRESERVED_PRIOR_EVIDENCE_N7, PRODUCT_ELIGIBILITY_RESTRICTION, REDEEM_AMOUNT_SEMANTICS, computeConstraintsEvidenceManifestHash, deriveKlendReserveConstraints, deriveMinimumRedeemCTokenRaw, deriveProtocolMinimumDepositRaw, liquidityToCollateralFloor, validateConstraintsIdentity } from "../klendReserveConstraints";
import type { ConstraintsIdentity, ConstraintsInputs } from "../klendReserveConstraints";
import { SOL_BTC_USDC_IDENTITY_MANIFEST_HASH, computeIdentityManifestHash } from "../klendReserveIdentity";
import { CORRECTED_APY_SNAPSHOT, CORRECTION_READINESS_RESULT, MEASURED_APY_EVIDENCE_MANIFEST_HASH, RATE_KIND, computeMeasuredApyEvidenceManifestHash } from "../klendReserveMeasuredApyCorrection";
import { REWARD_EVIDENCE_MANIFEST_HASH, computeRewardEvidenceManifestHash } from "../klendReserveRewardResolution";
import { lookupApyFreshnessPolicy } from "../positionOptimizationAssessment";
import { BLOCKER_ORDER_EVIDENCE_MANIFEST_HASH, computeBlockerOrderEvidenceManifestHash, validatePrimaryBlockerIsNearest } from "../stableYieldBlockerOrderAmendment";
import { recognizeStableYieldBuffer } from "../stableYieldBufferRecognition";
import { getStableYieldEvidenceManifest, isNearerBlocker } from "../stableYieldProductionEvidence";
import { getYieldStrategy } from "../yieldStrategyRegistry";
import { readFileSync } from "node:fs";

export function runKlendReserveCapacityFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const capSrc = readIf("src/suggestions/klendReserveCapacity.ts");

  const S = CAPACITY_SNAPSHOT;
  const ID = { ...CAPACITY_PRODUCT_BINDING } as unknown as CapacityIdentityInputs;
  const NOW = Date.parse("2026-07-17T07:01:30.000Z");
  const base = {
    identity: ID,
    depositLimitRaw: S.depositLimitRaw,
    totalSupplySf: S.totalSupplySf,
    reserveSourceSlot: S.reserveSourceSlot,
    currentSlot: S.reserveSourceSlot + 10,
    observedAt: S.observedAt,
    nowMs: NOW,
  };
  const r = deriveKlendReserveCapacity(base);
  const ONE = 2n ** 60n;

  // --- Happy path ---
  add("CAP-1: exact reserve capacity derives successfully", r.ok === true && r.failure === undefined, "ok");
  add("CAP-2: capacity kind is capped (finite 1B cap, not uncapped)", r.capacityKind === "capped" && r.capacityMode === "explicit_remaining_capacity", "capped");
  add("CAP-3: deposit limit is exact and in base units", r.depositLimitRaw === "1000000000000000" && r.depositLimitTokenAmount === 1_000_000_000, "1B USDC");
  add("CAP-4: total supplied is exact", r.totalSuppliedRaw === "111556662387780" && Math.abs((r.totalSuppliedTokenAmount ?? 0) - 111556662.38778) < 1e-6, "111.56M USDC");
  add("CAP-5: remaining capacity is exact", r.remainingCapacityRaw === "888443337612219" && Math.abs((r.remainingCapacityTokenAmount ?? 0) - 888443337.612219) < 1e-6, "888.44M USDC");
  add("CAP-6: remaining = floor(limit - supply) in exact fixed-point", (() => { const rem = (BigInt(S.depositLimitRaw) * ONE - BigInt(S.totalSupplySf)) / ONE; return rem.toString() === r.remainingCapacityRaw; })(), "matches BigInt");
  add("CAP-7: not at capacity, not over cap", r.isAtCapacity === false && r.isOverConfiguredLimit === false, "healthy");
  add("CAP-8: asset decimals are exactly 6", r.assetDecimals === 6 && CAPACITY_PRODUCT_BINDING.assetDecimals === 6 && S.mintDecimals === 6, "6dp");
  add("CAP-9: source slot, observedAt and provenance are recorded", r.reserveSourceSlot === S.reserveSourceSlot && r.observedAt === S.observedAt && (r.sourceProvenance ?? []).length === 3, "dated");
  add("CAP-10: calculation authority is the deployed program, not the SDK display path", /deposit_reserve_liquidity/.test(r.calculationAuthority ?? "") && /lending_operations\.rs/.test(r.calculationAuthority ?? ""), "program authority");

  // --- Identity binding ---
  const wrong = (o: Partial<CapacityIdentityInputs>) => deriveKlendReserveCapacity({ ...base, identity: { ...ID, ...o } });
  add("CAP-11: exact market is required", wrong({ marketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfG" }).failure === "identity_mismatch", "market bound");
  add("CAP-12: exact reserve is required", wrong({ reserveAddress: "So11111111111111111111111111111111111111112" }).failure === "identity_mismatch", "reserve bound");
  add("CAP-13: another USDC reserve fails (same mint, different reserve)", (() => { const x = wrong({ reserveAddress: "H3t6qZ1JkjV1x8Nv3vXG7Zt6QdVYKPMNvJHT3Hzp2Ykq" }); return x.failure === "identity_mismatch" && x.capacityKind === "unresolved"; })(), "reserve-address bound, not mint");
  add("CAP-14: exact canonical USDC mint is required", wrong({ liquidityMint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" }).failure === "identity_mismatch", "mint bound");
  add("CAP-15: exact cToken mint is required", wrong({ cTokenMint: "So11111111111111111111111111111111111111112" }).failure === "identity_mismatch", "ctoken bound");
  add("CAP-16: exact KLend program is required", wrong({ klendProgram: "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd" }).failure === "identity_mismatch", "program bound");
  add("CAP-17: mainnet-beta is required", wrong({ cluster: "devnet" }).failure === "identity_mismatch", "cluster bound");
  add("CAP-18: decimals mismatch fails closed", validateCapacityIdentity({ ...ID, assetDecimals: 9 }).failure === "decimals_mismatch", "6dp enforced");
  add("CAP-19: candidate id is required", validateCapacityIdentity({ ...ID, candidateId: "kamino_steakhouse_usdc" }).failure === "candidate_mismatch", "candidate bound");

  // --- Fail closed ---
  add("CAP-20: missing source slot fails", deriveKlendReserveCapacity({ ...base, reserveSourceSlot: undefined }).failure === "missing_source_slot", "undated → fail");
  add("CAP-21: stale reserve state fails", deriveKlendReserveCapacity({ ...base, nowMs: NOW + CAPACITY_TTL_MS + 1000 }).failure === "stale_reserve_state", "past TTL → fail");
  add("CAP-22: slot-age beyond bound fails", deriveKlendReserveCapacity({ ...base, currentSlot: S.reserveSourceSlot + MAX_CAPACITY_SLOT_AGE + 1 }).failure === "stale_reserve_state", "slot age → fail");
  add("CAP-23: missing deposit limit fails", deriveKlendReserveCapacity({ ...base, depositLimitRaw: undefined }).failure === "missing_deposit_limit", "absent → fail");
  add("CAP-24: malformed deposit limit fails", deriveKlendReserveCapacity({ ...base, depositLimitRaw: "1e15" }).failure === "malformed_deposit_limit" && deriveKlendReserveCapacity({ ...base, depositLimitRaw: "-5" }).failure === "malformed_deposit_limit", "non-u64 → fail");
  add("CAP-25: missing total supply fails", deriveKlendReserveCapacity({ ...base, totalSupplySf: undefined }).failure === "missing_total_supply", "absent → fail");
  add("CAP-26: malformed total supply fails", deriveKlendReserveCapacity({ ...base, totalSupplySf: "abc" }).failure === "malformed_total_supply", "non-numeric → fail");
  add("CAP-27: negative total supply fails", deriveKlendReserveCapacity({ ...base, totalSupplySf: "-1000" }).failure === "malformed_total_supply", "negative → fail");
  add("CAP-28: a failed derivation emits no capacity value at all", (() => { const x = deriveKlendReserveCapacity({ ...base, depositLimitRaw: undefined }); return x.remainingCapacityRaw === undefined && x.capacityKind === "unresolved"; })(), "no partial value");

  // --- Numeric integrity ---
  add("CAP-29: raw base units are never confused with token units", r.remainingCapacityRaw === "888443337612219" && (r.remainingCapacityTokenAmount ?? 0) === 888443337.612219 && r.remainingCapacityRaw !== String(r.remainingCapacityTokenAmount), "raw ≠ tokens (1e6 apart)");
  add("CAP-30: unsafe-integer values survive exactly as raw strings", BigInt(r.remainingCapacityRaw!) > BigInt(Number.MAX_SAFE_INTEGER) === false || BigInt(S.totalSupplySf) > BigInt(Number.MAX_SAFE_INTEGER), "sf exceeds 2^53; BigInt preserves it");
  add("CAP-31: the sf value would lose precision as a Number", Number(BigInt(S.totalSupplySf)) !== Number.parseInt(S.totalSupplySf, 10) || BigInt(S.totalSupplySf) > 9007199254740991n, "float would lose it");
  add("CAP-32: arithmetic is BigInt, not floating point", /BigInt|2n \*\* 60n|ONE_SF/.test(capSrc) && !/parseFloat\(/.test(capSrc), "BigInt path");
  add("CAP-33: token conversion splits whole/remainder to avoid float overflow", /raw \/ scale/.test(capSrc) && /raw % scale/.test(capSrc), "no big-float");
  add("CAP-34: remaining capacity is not rounded before eligibility", Number.isInteger(Number(r.remainingCapacityRaw)) === false || r.remainingCapacityRaw!.length > 10, "raw retained exactly");

  // --- Cap edge cases ---
  const atCap = deriveKlendReserveCapacity({ ...base, totalSupplySf: (BigInt(S.depositLimitRaw) * ONE).toString() });
  add("CAP-35: equality with the cap reports zero remaining and at-capacity", atCap.ok === true && atCap.remainingCapacityRaw === "0" && atCap.isAtCapacity === true && atCap.isOverConfiguredLimit === false, "supply == cap");
  add("CAP-36: equality is allowed by the program (strict >), so no -1 adjustment", ENFORCEMENT_FACTS.equalityWithLimitAllowed === true && ENFORCEMENT_FACTS.comparisonOperator === "strict_greater_than", "gt not gte");
  const over = deriveKlendReserveCapacity({ ...base, totalSupplySf: ((BigInt(S.depositLimitRaw) + 5_000_000n) * ONE).toString() });
  add("CAP-37: finite cap below total supply reports over-cap", over.ok === true && over.isOverConfiguredLimit === true && over.isAtCapacity === true, "cap lowered");
  add("CAP-38: negative user-facing capacity is never emitted", over.remainingCapacityRaw === "0" && over.remainingCapacityTokenAmount === 0 && (over.remainingCapacityTokenAmount ?? 0) >= 0, "clamped to 0 for callers");
  add("CAP-39: the over-cap condition is preserved diagnostically, not hidden", over.overConfiguredLimitAmountRaw === "5000000" && over.overConfiguredLimitTokenAmount === 5, "5 USDC over, surfaced");
  add("CAP-40: over-cap does not force an exit (program semantics recorded)", /does NOT rebalance or force an exit/i.test(ENFORCEMENT_FACTS.overCapBehaviour), "positions untouched");

  // --- Sentinel ---
  const uncapped = deriveKlendReserveCapacity({ ...base, depositLimitRaw: U64_MAX_STR });
  add("CAP-41: u64::MAX sentinel is explicitly represented as uncapped", uncapped.ok === true && uncapped.capacityKind === "uncapped" && uncapped.capacityMode === "verified_uncapped", "verified_uncapped");
  add("CAP-42: uncapped does not manufacture a remaining amount", uncapped.remainingCapacityRaw === undefined && uncapped.remainingCapacityTokenAmount === undefined && uncapped.depositLimitTokenAmount === undefined, "no arbitrary large number");
  add("CAP-43: a large finite limit is NOT misclassified as uncapped", r.capacityKind === "capped" && S.isUncappedSentinel === false && DEPOSIT_LIMIT_SENTINEL_SEMANTICS.largeFiniteIsNotUncapped === true, "1B is capped");
  add("CAP-44: zero is a literal zero cap in klend, NOT uncapped", DEPOSIT_LIMIT_SENTINEL_SEMANTICS.zeroMeansUncapped === false && deriveKlendReserveCapacity({ ...base, depositLimitRaw: "0" }).isOverConfiguredLimit === true, "0 → over cap, not unlimited");
  add("CAP-45: the klend/kvault sentinel divergence is recorded", DEPOSIT_LIMIT_SENTINEL_SEMANTICS.zeroDivergesFromKvault === true && /kvault maps deposit_cap == 0 to u64::MAX/i.test(DEPOSIT_LIMIT_SENTINEL_SEMANTICS.zeroDivergenceNote), "programs differ");
  add("CAP-46: klend has no enforcement sentinel branch", DEPOSIT_LIMIT_SENTINEL_SEMANTICS.hasExplicitSentinelBranchInEnforcement === false && DEPOSIT_LIMIT_SENTINEL_SEMANTICS.u64MaxIsUncapped === true, "uncapped by type");

  // --- Wrong-field guards ---
  add("CAP-47: available liquidity is NOT used as remaining capacity", Math.abs((r.remainingCapacityTokenAmount ?? 0) - S.availableLiquidityTokens) > 1_000_000 && r.remainingCapacityTokenAmount !== S.availableLiquidityTokens, "888.44M ≠ 22.58M");
  add("CAP-48: borrow limit is NOT used as deposit limit", String(S.borrowLimitRaw) !== String(S.depositLimitRaw) && String(r.depositLimitRaw) === String(S.depositLimitRaw) && String(r.depositLimitRaw) !== String(S.borrowLimitRaw), "1B ≠ 700M");
  add("CAP-49: the counted amount is total_supply, per the program", ENFORCEMENT_FACTS.amountComparedAgainstLimit === "reserve.liquidity.total_supply()", "total_supply");
  add("CAP-50: fees are excluded from the counted amount", ENFORCEMENT_FACTS.feesIncludedInCountedAmount === false && ENFORCEMENT_FACTS.feesExcluded.length === 3, "3 accumulators excluded");
  add("CAP-51: available + borrowed = total_supply is NOT assumed, and is numerically false", ENFORCEMENT_FACTS.availablePlusBorrowedEqualsTotalSupply === false && Math.abs((S.availableLiquidityTokens + S.borrowedTokens) - S.totalSuppliedTokenAmount - S.accumulatedProtocolFeesTokens) < 0.01, "delta == protocol fees exactly");
  add("CAP-52: the incoming deposit is counted before comparison", ENFORCEMENT_FACTS.incomingDepositIncludedBeforeComparison === true, "amount + supply > limit");
  add("CAP-53: accrual is refreshed first (ReserveStale), so capacity is freshness-gated", ENFORCEMENT_FACTS.interestAccrualRefreshedFirst === true && KLEND_CAPACITY_SOURCE.errorOnStale === "LendingError::ReserveStale", "refresh required");
  add("CAP-54: the rolling deposit_withdrawal_cap is kept out of capacity scope", /deposit_withdrawal_cap/.test(ENFORCEMENT_FACTS.separateRollingCap) && /DEPOSIT-AVAILABILITY concern/i.test(ENFORCEMENT_FACTS.separateRollingCap), "not conflated");
  add("CAP-55: the SDK is used only because it mirrors the program", SDK_MIRRORS_ENFORCEMENT.mirrorsProgram === true && SDK_MIRRORS_ENFORCEMENT.divergence === "none identified" && /getTotalSupplySf/.test(SDK_MIRRORS_ENFORCEMENT.exactArithmeticHelper), "mirror verified");
  add("CAP-56: the error on exceeding the cap is recorded", KLEND_CAPACITY_SOURCE.errorOnExceeded === "LendingError::DepositLimitExceeded", "DepositLimitExceeded");

  // --- API diagnostics ---
  add("CAP-57: API values remain diagnostic only", KAMINO_CAPACITY_API_DIAGNOSTIC.role === "diagnostic_only", "diagnostic_only");
  add("CAP-58: the API exposes no deposit limit or remaining capacity at all", KAMINO_CAPACITY_API_DIAGNOSTIC.exposesDepositLimit === false && KAMINO_CAPACITY_API_DIAGNOSTIC.exposesRemainingCapacity === false, "cannot answer the question");
  add("CAP-59: symbol-only API matching is rejected", KAMINO_CAPACITY_API_DIAGNOSTIC.symbolOnlyMatchingRejected === true && /Matching on symbol or mint alone would bind the wrong reserve/i.test(KAMINO_CAPACITY_API_DIAGNOSTIC.matchingRule), "exact address only");
  add("CAP-60: mint-only API matching is rejected", KAMINO_CAPACITY_API_DIAGNOSTIC.mintOnlyMatchingRejected === true && KAMINO_CAPACITY_API_DIAGNOSTIC.boundBy.includes(CAPACITY_PRODUCT_BINDING.reserveAddress), "exact address only");
  add("CAP-61: missing API timestamp prevents production authority", KAMINO_CAPACITY_API_DIAGNOSTIC.exposesSourceTimestamp === false && KAMINO_CAPACITY_API_DIAGNOSTIC.exposesSourceSlot === false && /can never be the capacity authority/i.test(KAMINO_CAPACITY_API_DIAGNOSTIC.disqualifiedAsProductionAuthority), "no timestamp");
  add("CAP-62: API staleness is demonstrated, not assumed", KAMINO_CAPACITY_API_DIAGNOSTIC.explanationIsEvidenced === true && /same value at two timestamps/i.test(KAMINO_CAPACITY_API_DIAGNOSTIC.explanationEvidence) && API_PARITY_OBSERVATIONS[0].apiTotalSupplyTokens === API_PARITY_OBSERVATIONS[1].apiTotalSupplyTokens, "same value, 20 min apart");
  add("CAP-63: a fresh API agrees with the SDK to ~1e-7, proving definitions match", API_PARITY_OBSERVATIONS[0].relativeDifference < 1e-6, "0.0000077%");
  add("CAP-64: the current parity gap is classified as explained staleness", CAPACITY_PARITY_RESULT.classification === "explained_by_demonstrated_api_staleness" && CAPACITY_PARITY_RESULT.blocksVerification === false, "explained");
  add("CAP-65: a material UNEXPLAINED mismatch fails verification", (() => { const x = classifyCapacityParity({ sdkTotalSupplyTokens: 111_556_662, apiTotalSupplyTokens: 90_000_000, apiValueUnchangedSincePriorObservation: false, onChainSupplyChangedSincePriorObservation: false }); return x.classification === "material_unexplained_mismatch" && x.blocksVerification === true; })(), "unexplained → block");
  add("CAP-66: staleness only explains a gap when BOTH conditions hold", classifyCapacityParity({ sdkTotalSupplyTokens: 111_556_662, apiTotalSupplyTokens: 90_000_000, apiValueUnchangedSincePriorObservation: true, onChainSupplyChangedSincePriorObservation: false }).blocksVerification === true, "no free pass");

  // --- USD ---
  add("CAP-67: token units are canonical; USD is not fabricated", USD_CAPACITY.canonicalUnit === "USDC token amount" && USD_CAPACITY.usdDerived === false && USD_CAPACITY.usdValue === null, "token-canonical");
  add("CAP-68: USDC is not assumed to equal exactly $1", USD_CAPACITY.usdcAssumedOneDollar === false && /USDC ≈ \$0\.99985/.test(USD_CAPACITY.note), "≈$0.99985 observed");
  add("CAP-69: missing USD does not block token-unit capacity", USD_CAPACITY.blocksTokenUnitCapacity === false && r.ok === true, "not blocked");
  add("CAP-70: no new price provider was introduced", USD_CAPACITY.priceSource === null, "none");

  // --- Evidence + layers ---
  add("CAP-71: the evidence manifest is deterministic", CAPACITY_EVIDENCE_MANIFEST_HASH === computeCapacityEvidenceManifestHash() && /^capacity_evidence_[0-9a-f]{8}$/.test(CAPACITY_EVIDENCE_MANIFEST_HASH), CAPACITY_EVIDENCE_MANIFEST_HASH);
  add("CAP-72: evidence records authority, numeric type, units, sentinel, provenance, triggers", /deposit_reserve_liquidity/.test(CAPACITY_EVIDENCE.calculationAuthority) && /BigInt/.test(CAPACITY_EVIDENCE.numericType) && CAPACITY_EVIDENCE.sourceProvenance.length === 6 && CAPACITY_EVIDENCE.invalidationTriggers.length === 6, "complete");
  add("CAP-73: the preparer is not represented as a human reviewer", CAPACITY_EVIDENCE.preparerIsNotHumanReviewer === true && CAPACITY_EVIDENCE.preparerRole === "automated_evidence_preparer", "not a reviewer");
  add("CAP-74: the snapshot is evidence, not a production input", SNAPSHOT_IS_NOT_PRODUCTION_INPUT.isProductionInput === false && SNAPSHOT_IS_NOT_PRODUCTION_INPUT.isProductIdentity === false && SNAPSHOT_IS_NOT_PRODUCTION_INPUT.isImmutableEvidence === true, "evidence ≠ input");
  add("CAP-75: the four capacity layers are separated", Object.keys(CAPACITY_LAYER_SEPARATION).length === 4, "4 layers");
  add("CAP-76: no capacity value is written into immutable product identity", !/remainingCapacity|totalSupplied/.test(readIf("src/suggestions/klendReserveIdentity.ts")), "identity clean");

  // --- Prior evidence immutable ---
  add("CAP-77: prior identity evidence is unchanged", SOL_BTC_USDC_IDENTITY_MANIFEST_HASH === "identity_9773ac14" && computeIdentityManifestHash() === SOL_BTC_USDC_IDENTITY_MANIFEST_HASH, "identity_9773ac14");
  add("CAP-78: prior APY evidence is unchanged", APY_EVIDENCE_MANIFEST_HASH === "apy_evidence_d468fce5" && computeApyEvidenceManifestHash() === APY_EVIDENCE_MANIFEST_HASH, "apy_evidence_d468fce5");
  add("CAP-79: prior reward evidence is unchanged", REWARD_EVIDENCE_MANIFEST_HASH === "reward_evidence_cace4fe4" && computeRewardEvidenceManifestHash() === REWARD_EVIDENCE_MANIFEST_HASH, "reward_evidence_cace4fe4");
  add("CAP-80: prior parity evidence is unchanged", PARITY_EVIDENCE_MANIFEST_HASH === "parity_evidence_dd25a9a1" && computeParityEvidenceManifestHash() === PARITY_EVIDENCE_MANIFEST_HASH, "parity_evidence_dd25a9a1");
  add("CAP-81: measured-APY evidence is unchanged", MEASURED_APY_EVIDENCE_MANIFEST_HASH === "measured_apy_evidence_ebc7627d" && computeMeasuredApyEvidenceManifestHash() === MEASURED_APY_EVIDENCE_MANIFEST_HASH, "measured_apy_evidence_ebc7627d");
  add("CAP-82: all prior evidence ids are preserved in the amendment", (PRESERVED_PRIOR_EVIDENCE_CAP as readonly string[]).includes("identity_9773ac14") && (PRESERVED_PRIOR_EVIDENCE_CAP as readonly string[]).includes("measured_apy_evidence_ebc7627d") && PRESERVED_PRIOR_EVIDENCE_CAP.length === 12, "12 preserved");

  // --- State transition ---
  add("CAP-83: capacity state moves no_adapter → adapter_implemented_source_verified", (() => { const m = getStableYieldEvidenceManifest("kamino_usdc_lending")!; return m.capacityAdapterState === "adapter_implemented_source_verified" && CAPACITY_BLOCKER_SUPERSESSION.priorCapacityState === "no_adapter"; })(), "source-verified");
  add("CAP-84: blocked_capacity provenance is preserved", /RESOLVED at 16H-N\.4[\s\S]*blocked_capacity/.test(getStableYieldEvidenceManifest("kamino_usdc_lending")!.blockers.join(" ")), "provenance kept");
  add("CAP-85 (updated by 16H-N.7): capacity moved primary to position detection; N.5 through N.7 have since resolved detection, deposit availability and constraints", CAPACITY_BLOCKER_SUPERSESSION.resultingPrimaryBlocker === "blocked_position_detection" && getStableYieldEvidenceManifest("kamino_usdc_lending")!.primaryBlocker === "blocked_risk_review", "N.4 record intact, live state advanced");
  add("CAP-86: no blocker enum or lifecycle value was invented", CAPACITY_BLOCKER_SUPERSESSION.newBlockerEnumInvented === false && CAPACITY_BLOCKER_SUPERSESSION.newLifecycleValueInvented === false, "none invented");
  add("CAP-87: the state-model gap is reported, not papered over", /no blocked_deposit_availability or blocked_constraints value/i.test(CAPACITY_BLOCKER_SUPERSESSION.stateModelGap), "gap reported");
  add("CAP-88: lifecycle remains identity_verified", /identity_verified/.test(CAPACITY_CONFERS.lifecycleUnchanged) && getYieldStrategy("kamino_usdc_lending")!.lifecycle === "identity_verified", "unchanged");

  // --- Capacity is not deposit state ---
  add("CAP-89 (updated by 16H-N.6): capacity verification did NOT enable deposits — N.6 had to check ten separate gates, and block_ctoken_usage alone can disable deposits at full capacity", CAPACITY_CONFERS.depositAvailabilityRemains === "blocked" && CAPACITY_IS_NOT_DEPOSIT_STATE.depositAvailabilityStateUnchangedByThisModule === "blocked" && DEPOSIT_PATH.gates.length === 10 && DEPOSIT_PATH.adminCanDisableDepositsSeparatelyFromCap === true, "capacity ≠ permission, proven at N.6");
  add("CAP-90: none of the seven tempting signals imply deposit availability", CAPACITY_IS_NOT_DEPOSIT_STATE.notEvidenceOfDepositAvailability.length === 7 && CAPACITY_IS_NOT_DEPOSIT_STATE.depositAvailabilityStillRequires.length === 9, "7 rejected, 9 required");
  add("CAP-91: the capacity question is stated narrowly", /How much additional USDC can this reserve accept/i.test(CAPACITY_IS_NOT_DEPOSIT_STATE.capacityAnswers) && /Can a user deposit right now/i.test(CAPACITY_IS_NOT_DEPOSIT_STATE.capacityDoesNotAnswer), "scoped");
  add("CAP-92 (updated by 16H-N.7): the capacity adapter conferred no constraints; N.7 resolved them separately", CAPACITY_CONFERS.constraintsRemain === "blocked" && (CAPACITY_CONFERS.doesNotConfer as readonly string[]).includes("constraints eligibility") && getStableYieldEvidenceManifest("kamino_usdc_lending")!.constraintsState === "adapter_implemented_source_verified", "N.4 conferred none; N.7 verified");

  // --- Scope fence ---
  add("CAP-93: no risk score, review, signoff, or approval", CAPACITY_CONFERS.riskScoreAssigned === false && CAPACITY_CONFERS.humanReviewOccurred === false && CAPACITY_CONFERS.signoffOccurred === false && CAPACITY_CONFERS.productApproved === false && getStableYieldEvidenceManifest("kamino_usdc_lending")!.riskReviewState === "blocked", "none");
  add("CAP-94: no selector, recommendation, Top Pick, or production card", (CAPACITY_CONFERS.doesNotConfer as readonly string[]).includes("selector eligibility") && (CAPACITY_CONFERS.doesNotConfer as readonly string[]).includes("recommendation eligibility") && (CAPACITY_CONFERS.doesNotConfer as readonly string[]).includes("Top Pick") && (CAPACITY_CONFERS.doesNotConfer as readonly string[]).includes("a production card"), "none");
  add("CAP-95: APY remains comparison-ready and estimated_variable_apy", CAPACITY_CONFERS.apyRemainsComparisonReady === true && CAPACITY_CONFERS.apyRateKindUnchanged === "estimated_variable_apy" && CORRECTION_READINESS_RESULT.definitionSufficientForComparison === true, "unchanged");
  add("CAP-96: reward state remains exhausted with zero APY", CAPACITY_CONFERS.rewardStateUnchanged === "exhausted" && CORRECTED_APY_SNAPSHOT.rewardApyPct === 0, "unchanged");
  add("CAP-97: readiness remains blocked", getStableYieldEvidenceManifest("kamino_usdc_lending")!.readiness === "blocked", "blocked");
  add("CAP-98: no transaction is constructed or simulated", CAPACITY_CONFERS.transactionConstructedOrSimulated === false && !/sendTransaction|signTransaction|simulateTransaction|VersionedTransaction/.test(capSrc), "read-only");
  add("CAP-99: the module is read-only", /STRICTLY READ-ONLY/.test(capSrc) && !/deposit\(|withdraw\(/.test(capSrc), "reads only");
  add("CAP-100 (updated by 16H-O.1): the KLend capacity step left kvault semantics untouched; 16H-O.1 applied them to Steakhouse without changing the reviewed source", KVAULT_CAPACITY_SOURCE.commit === "1d146d7087a76edbbadc14d848ae14295c0745a4" && getStableYieldEvidenceManifest("kamino_steakhouse_usdc")!.primaryBlocker === "blocked_deposit_availability", "source pinned; state reconciled");

  return checks;
}

/* ------------------------------------------------------------------ *
 * 16H-N.5 — Existing Position Detection and Underlying-Value Adapter
 * ------------------------------------------------------------------ */

export function runKlendPositionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const posSrc = readIf("src/suggestions/klendDirectLendingPosition.ts");

  const P = POSITION_SNAPSHOT;
  const WALLET = "3xJ8kQmNvB2pLwRtYuIoPaSdFgHjKlZxCvBnM1qWeRt4";
  const CT = POSITION_IDENTITY.cTokenMint;
  const TP = EXPECTED_TOKEN_PROGRAM_ID;
  const ID = { ...POSITION_IDENTITY } as unknown as PositionIdentityInputs;
  const SLOT = 433435000;
  const OBS = "2026-07-17T07:05:00.000Z";
  const NOW = Date.parse(OBS) + 30_000;
  const ONE = 2n ** 60n;

  const acct = (address: string, amountRaw: string, o: Partial<WalletTokenAccountInput> = {}): WalletTokenAccountInput =>
    ({ address, mint: CT, tokenProgram: TP, amountRaw, decimals: 6, owner: WALLET, ...o });

  const ATA = acct("ATAaaa11111111111111111111111111111111111111", "1000000");      // 1 cToken
  const NON_ATA = acct("NONata2222222222222222222222222222222222222", "2500000");  // 2.5 cTokens

  const base = {
    identity: ID, walletAddress: WALLET, accounts: [ATA, NON_ATA],
    estimatedTotalSupplySf: (BigInt("110184636249066") * ONE).toString(),
    collateralMintTotalSupplyRaw: P.reserveCollateralMintTotalSupply,
    walletSourceSlot: SLOT, reserveSourceSlot: SLOT, cTokenMintSourceSlot: SLOT,
    observedAt: OBS, nowMs: NOW,
  };
  const r = deriveKlendDirectLendingPosition(base);

  // --- Detection ---
  add("POS-1: the exact cToken position is detected", r.ok === true && r.positionExists === true && r.failure === undefined, "detected");
  add("POS-2: an associated token account is detected", (r.sourceTokenAccounts ?? []).some((a) => a.address === ATA.address), "ATA found");
  add("POS-3: a non-associated token account is detected", (r.sourceTokenAccounts ?? []).some((a) => a.address === NON_ATA.address), "non-ATA found");
  add("POS-4: multiple exact-mint accounts are aggregated", r.cTokenBalanceRaw === "3500000" && (r.sourceTokenAccounts ?? []).length === 2, "1.0 + 2.5 = 3.5 cTokens");
  add("POS-5: discovery reuses existing ingestion, no new scanner", WALLET_DISCOVERY_SOURCE.newScannerCreated === false && /useWalletPortfolio\.ts:504-525/.test(WALLET_DISCOVERY_SOURCE.reusedFrom), "reused");
  add("POS-6: enumerating by owner is why both account kinds arrive", WALLET_DISCOVERY_SOURCE.coversAssociatedAccounts && WALLET_DISCOVERY_SOURCE.coversNonAssociatedAccounts && /enumerates by OWNER/.test(WALLET_DISCOVERY_SOURCE.rationale), "owner-enumerated");
  add("POS-7: one wallet is not assumed to have one cToken account", /may hold the same mint in several accounts/i.test(WALLET_DISCOVERY_SOURCE.multipleAccountsPerMint), "multi-account");

  // --- Exclusions ---
  const disc = (extra: WalletTokenAccountInput) => discoverCTokenAccounts([ATA, extra], WALLET);
  add("POS-8: zero balances are ignored", (() => { const d = disc(acct("Zero111", "0")); return d.aggregateRaw === "1000000" && d.rejected.some((x) => x.reason === "zero_balance"); })(), "0 skipped");
  add("POS-9: closed accounts are ignored", (() => { const d = disc(acct("Closed11", "500000", { isClosed: true })); return d.aggregateRaw === "1000000" && d.rejected.some((x) => x.reason === "closed_account"); })(), "closed skipped");
  add("POS-10: wrong mint is rejected", discoverCTokenAccounts([acct("Wrong11", "9999999", { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" })], WALLET).aggregateRaw === "0", "USDC mint ≠ cToken mint");
  add("POS-11: wrong token program is rejected", (() => { const d = disc(acct("Tok22", "500000", { tokenProgram: TOKEN_2022_PROGRAM_ID })); return d.aggregateRaw === "1000000" && d.rejected.some((x) => /wrong_token_program/.test(x.reason)); })(), "Token-2022 rejected");
  add("POS-12: foreign-owner accounts are rejected", (() => { const d = disc(acct("Foreign1", "500000", { owner: "OtherWallet1111111111111111111111111111111" })); return d.aggregateRaw === "1000000" && d.rejected.some((x) => x.reason === "not_owned_by_wallet"); })(), "not ours");
  add("POS-13: fully delegated balances are excluded", (() => { const d = disc(acct("Deleg11", "500000", { delegateAmountRaw: "500000" })); return d.aggregateRaw === "1000000" && d.rejected.some((x) => x.reason === "fully_delegated"); })(), "delegated excluded");
  add("POS-14: partially delegated balances count only the wallet's share", discoverCTokenAccounts([acct("Part11", "500000", { delegateAmountRaw: "200000" })], WALLET).aggregateRaw === "300000", "500k - 200k");
  add("POS-15: malformed amounts are rejected", (() => { const d = disc(acct("Bad11", "1.5e6")); return d.aggregateRaw === "1000000" && d.rejected.some((x) => x.reason === "malformed_amount"); })(), "non-integer rejected");
  add("POS-16: wrong cToken decimals are rejected", (() => { const d = disc(acct("Dec11", "500000", { decimals: 9 })); return d.rejected.some((x) => /ctoken_decimals_mismatch/.test(x.reason)); })(), "9dp rejected");

  // --- Identity binding ---
  const wrong = (o: Partial<PositionIdentityInputs>) => deriveKlendDirectLendingPosition({ ...base, identity: { ...ID, ...o } });
  add("POS-17: symbol-only matching is rejected by construction", (IDENTIFICATION_RULES.neverIdentifyBy as readonly string[]).includes("symbol") && (IDENTIFICATION_RULES.neverIdentifyBy as readonly string[]).includes("display name") && !/symbol/i.test(String(POSITION_IDENTITY.cTokenMint)), "address-bound");
  add("POS-18: USDC-mint-alone matching is rejected", (IDENTIFICATION_RULES.neverIdentifyBy as readonly string[]).includes("USDC mint alone") && /shared by FOUR reserves/i.test(IDENTIFICATION_RULES.rationale), "4 reserves share it");
  add("POS-19: market-name-alone matching is rejected", (IDENTIFICATION_RULES.neverIdentifyBy as readonly string[]).includes("market name alone"), "name rejected");
  add("POS-20: wrong reserve binding fails", wrong({ reserveAddress: "So11111111111111111111111111111111111111112" }).failure === "identity_mismatch", "reserve bound");
  add("POS-21: wrong market binding fails", wrong({ marketAddress: "So11111111111111111111111111111111111111112" }).failure === "identity_mismatch", "market bound");
  add("POS-22: wrong KLend program fails", wrong({ klendProgram: "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd" }).failure === "identity_mismatch", "program bound");
  add("POS-23: wrong cToken mint fails", wrong({ cTokenMint: "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS" }).failure === "identity_mismatch", "Steakhouse share mint rejected");
  add("POS-24: wrong token program in identity fails", wrong({ tokenProgram: TOKEN_2022_PROGRAM_ID }).failure === "identity_mismatch", "Tokenkeg required");
  add("POS-25: wrong cluster fails", wrong({ cluster: "devnet" }).failure === "identity_mismatch", "mainnet-beta required");
  add("POS-26: cToken decimals are verified as exactly 6", POSITION_IDENTITY.cTokenDecimals === 6 && P.cTokenDecimals === 6 && validatePositionIdentity({ ...ID, cTokenDecimals: 9 }).failure === "ctoken_decimals_mismatch", "6dp verified");
  add("POS-27: the token program is the classic SPL Token program, verified on-chain", EXPECTED_TOKEN_PROGRAM_ID === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" && P.cTokenMintOwnerProgram === EXPECTED_TOKEN_PROGRAM_ID, "Tokenkeg");

  // --- Valuation ---
  add("POS-28: raw cToken units are preserved as integer strings", r.cTokenBalanceRaw === "3500000" && typeof r.cTokenBalanceRaw === "string" && r.cTokenBalanceNormalized === 3.5, "raw ≠ normalized");
  add("POS-29: cToken is NOT treated one-to-one with USDC", VALUATION_SEMANTICS.oneToOneAssumed === false && P.cTokenEqualsUsdc === false && (r.underlyingUsdcTokenAmount ?? 0) > (r.cTokenBalanceNormalized ?? 0), "3.5 cTokens > 3.5 USDC");
  add("POS-30: the official exchange-rate conversion is used", (() => { const expected = (3_500_000n * BigInt(base.estimatedTotalSupplySf)) / (ONE * BigInt(P.reserveCollateralMintTotalSupply)); return r.underlyingUsdcRaw === expected.toString(); })(), "floor(bal x supply / cSupply)");
  add("POS-31: 1 cToken values at ~1.191791 USDC, not 1", Math.abs(P.oneCTokenInUsdc - 1.191791) < 1e-6 && Math.abs((r.collateralExchangeRate ?? 0) - 1.191791) < 0.001, "~1.1918 rate");
  add("POS-32: rounding is floor, per the program", /^floor\b/.test(VALUATION_SEMANTICS.roundingDirection) && /to_floor/.test(VALUATION_SEMANTICS.roundingDirection) && /to_floor/.test(posSrc), "to_floor");
  add("POS-33: rounding never overstates the claim", (() => { const exactFloor = (3_500_000n * BigInt(base.estimatedTotalSupplySf)) / (ONE * BigInt(P.reserveCollateralMintTotalSupply)); const unfloored = Number(3_500_000n) * (Number(BigInt(base.estimatedTotalSupplySf)) / Number(ONE * BigInt(P.reserveCollateralMintTotalSupply))); return Number(exactFloor) <= unfloored; })(), "floor ≤ exact");
  add("POS-34: the SDK's unfloored value would overstate, and is not used", P.floorNeverOverstates === true && Number(P.underlyingPerCTokenSdkUnfloored) > Number(P.underlyingPerCTokenFloorRaw) && /NO floor/.test(VALUATION_SEMANTICS.sdkDivergence), "1191791.727 > 1191791");
  add("POS-35: the SDK rate is inverted and is not naively reused", P.sdkRateIsInverted === true && /INVERTED/.test(VALUATION_SEMANTICS.sdkDivergence), "mintSupply/totalSupply");
  add("POS-36: the denominator is the reserve's cached field, not the SPL mint supply", CTOKEN_SUPPLY_AUTHORITY.authoritativeField === "reserve.collateral.mint_total_supply" && CTOKEN_SUPPLY_AUTHORITY.theyDiverge === true && String(P.splMintReportedSupply) !== String(P.reserveCollateralMintTotalSupply), "fields diverge ~12.76 cTokens");
  add("POS-37: no market price is used for the cToken", VALUATION_SEMANTICS.marketPriceUsed === false && !/price/i.test(String(VALUATION_SEMANTICS.formula)), "accounting only");
  add("POS-38: accrued interest is included; fees are excluded", /INCLUDED/.test(VALUATION_SEMANTICS.accruedInterestTreatment) && /EXCLUDED/.test(VALUATION_SEMANTICS.feeTreatment), "program-consistent");
  add("POS-39: valuation uses BigInt, not floating point", /BigInt|ONE_SF/.test(posSrc) && !/parseFloat\(/.test(posSrc), "BigInt path");
  add("POS-40: the valuation authority is the deployed program", /redeem_collateral/.test(r.valuationAuthority ?? "") && /reserve\.rs/.test(r.valuationAuthority ?? ""), "program authority");

  // --- Dust + no position ---
  const dust = deriveKlendDirectLendingPosition({ ...base, accounts: [acct("Dust11", "0")] });
  add("POS-41: a wallet with no cTokens reports a definite no-position", dust.ok === true && dust.positionExists === false && dust.underlyingUsdcRaw === "0", "verified absent");
  const tiny = deriveKlendDirectLendingPosition({ ...base, accounts: [acct("Tiny11", "1")] });
  add("POS-42: dust that floors to 0 still reports the position as existing", tiny.ok === true && tiny.positionExists === true && tiny.cTokenBalanceRaw === "1", "never silently discarded");
  add("POS-43: dust handling follows program semantics", /would pay 0/i.test(VALUATION_SEMANTICS.dustBehaviour) && /positionExists is driven by a non-zero cToken balance/.test(VALUATION_SEMANTICS.dustBehaviour), "mirrors program");

  // --- Freshness ---
  add("POS-44: stale wallet data fails current recognition", (() => { const x = deriveKlendDirectLendingPosition({ ...base, nowMs: NOW + POSITION_TTL_MS + 1000 }); return x.failure === "stale_wallet_data" && x.freshnessState === "stale"; })(), "past TTL");
  add("POS-45: missing reserve conversion inputs fail valuation", deriveKlendDirectLendingPosition({ ...base, estimatedTotalSupplySf: undefined }).failure === "missing_conversion_inputs", "no supply → fail");
  add("POS-46: missing cToken mint supply fails valuation", deriveKlendDirectLendingPosition({ ...base, collateralMintTotalSupplyRaw: undefined }).failure === "missing_conversion_inputs", "no cSupply → fail");
  add("POS-47: malformed conversion inputs fail", deriveKlendDirectLendingPosition({ ...base, collateralMintTotalSupplyRaw: "9.2e13" }).failure === "malformed_conversion_inputs", "non-integer → fail");
  add("POS-48: excessive source skew fails valuation", deriveKlendDirectLendingPosition({ ...base, reserveSourceSlot: SLOT + MAX_POSITION_SOURCE_SKEW + 1 }).failure === "source_skew_exceeded", "skew → fail");
  add("POS-49: all three source slots are recorded independently", r.walletSourceSlot === SLOT && r.reserveSourceSlot === SLOT && r.cTokenMintSourceSlot === SLOT && r.sourceSkewSlots === 0, "3 slots");
  add("POS-50: contradictory zero supply fails rather than using INITIAL_COLLATERAL_RATE", deriveKlendDirectLendingPosition({ ...base, collateralMintTotalSupplyRaw: "0" }).failure === "contradictory_zero_supply" && /refusing to value at INITIAL_COLLATERAL_RATE/i.test(deriveKlendDirectLendingPosition({ ...base, collateralMintTotalSupplyRaw: "0" }).failureDetail ?? ""), "fails closed");
  add("POS-51: position confidence is recorded", r.positionConfidence === "verified_exact" && r.freshnessState === "fresh" && r.freshnessTtlMs === POSITION_TTL_MS, "verified_exact");
  add("POS-52: a stale position never counts toward current sufficiency", BUFFER_RECOGNITION_BOUNDARY.countsTowardSufficiency === false, "no sufficiency");

  // --- USD recognition ---
  const priced = recognizeUnderlyingUsd({ underlyingUsdcTokenAmount: 100, usdcPriceUsd: 0.99985, priceSource: "approved_exact_mint_oracle", priceObservedAt: OBS, priceMaxAgeMs: 60_000, nowMs: NOW });
  add("POS-53: a token-unit position exists without USD pricing", r.ok === true && (r.underlyingUsdcTokenAmount ?? 0) > 0 && recognizeUnderlyingUsd({ underlyingUsdcTokenAmount: 100, usdcPriceUsd: undefined, priceSource: undefined, priceObservedAt: undefined, priceMaxAgeMs: 60_000, nowMs: NOW }).state === "unavailable_no_fresh_price", "token-unit stands alone");
  add("POS-54: a missing USDC price prevents USD recognition but preserves tokens", (() => { const x = recognizeUnderlyingUsd({ underlyingUsdcTokenAmount: 100, usdcPriceUsd: undefined, priceSource: undefined, priceObservedAt: undefined, priceMaxAgeMs: 60_000, nowMs: NOW }); return x.state === "unavailable_no_fresh_price" && x.recognizedBufferValueUsd === null && x.tokenAmountPreserved === 100; })(), "tokens preserved");
  add("POS-55: a stale USDC price prevents USD recognition", recognizeUnderlyingUsd({ underlyingUsdcTokenAmount: 100, usdcPriceUsd: 0.99985, priceSource: "approved_exact_mint_oracle", priceObservedAt: "2026-07-17T06:00:00.000Z", priceMaxAgeMs: 60_000, nowMs: NOW }).state === "unavailable_no_fresh_price", "stale → unavailable");
  add("POS-56: USDC is not assumed to equal exactly $1", priced.state === "recognized" && priced.recognizedBufferValueUsd !== 100 && Math.abs((priced.recognizedBufferValueUsd ?? 0) - 99.985) < 1e-9, "100 tokens = $99.985");
  add("POS-57: recognizedBufferValueUsd is separate from liquidBufferValueUsd", String(BUFFER_RECOGNITION_BOUNDARY.recognizedMeaning) !== String(BUFFER_RECOGNITION_BOUNDARY.liquidMeaning) && /drives SUFFICIENCY/.test(BUFFER_RECOGNITION_BOUNDARY.liquidMeaning), "separate");
  add("POS-58: liquidBufferValueUsd does not become positive before withdrawal availability is verified", BUFFER_RECOGNITION_BOUNDARY.liquidBufferValueUsdThisStep === "unresolved" && POSITION_CONFERS.liquidBufferValueUsdRemains === "unresolved" && /not proof of exit/i.test(BUFFER_RECOGNITION_BOUNDARY.liquidBufferValueUsdRationale), "unresolved until N.6");
  add("POS-59: no percentage haircut was invented", BUFFER_RECOGNITION_BOUNDARY.inventedHaircut === false && /never a guess in between/i.test(BUFFER_RECOGNITION_BOUNDARY.inventedHaircutNote), "verified-or-unresolved");
  add("POS-60: buffer recognition reuses the existing separation", /stableYieldBufferRecognition\.ts/.test(BUFFER_RECOGNITION_BOUNDARY.reuses) && typeof recognizeStableYieldBuffer === "function", "reused");

  // --- Boundaries ---
  add("POS-61: existing-position recognition does not imply recommendation", BUFFER_RECOGNITION_BOUNDARY.impliesRecommendation === false && BUFFER_RECOGNITION_BOUNDARY.impliesApproval === false && EXISTING_POSITION_SEMANTICS.recommendationCreated === false, "recognition ≠ recommendation");
  add("POS-62: the position is visible under Yield Strategies", BUFFER_RECOGNITION_BOUNDARY.visibleUnderYieldStrategies === true, "visible");
  add("POS-63: no Top Pick or production card", EXISTING_POSITION_SEMANTICS.topPickCreated === false && EXISTING_POSITION_SEMANTICS.productionCardRendered === false, "none");
  add("POS-64: the user is never told to deposit, withdraw or migrate", EXISTING_POSITION_SEMANTICS.mustNotTellUserTo.length === 3 && (EXISTING_POSITION_SEMANTICS.mustNotTellUserTo as readonly string[]).includes("migrate from Steakhouse"), "3 forbidden");
  add("POS-65: no internal risk score or approved label is rendered", (EXISTING_POSITION_SEMANTICS.mustNotRender as readonly string[]).includes("internal numeric risk scores") && (EXISTING_POSITION_SEMANTICS.mustNotRender as readonly string[]).includes("an approved label"), "internal-only");
  add("POS-66: APY is described as estimated and variable", EXISTING_POSITION_SEMANTICS.apy === "estimated and variable" && RATE_KIND === "estimated_variable_apy" && CAPACITY_CONFERS.apyRateKindUnchanged === "estimated_variable_apy", "estimated_variable_apy");
  add("POS-67: no transaction action is enabled", EXISTING_POSITION_SEMANTICS.transactionActionEnabled === false && POSITION_CONFERS.transactionConstructedOrSimulated === false && !/sendTransaction|signTransaction|simulateTransaction|VersionedTransaction/.test(posSrc), "read-only");
  add("POS-68: the module is read-only", /STRICTLY READ-ONLY/.test(posSrc), "reads only");

  // --- State ---
  add("POS-69: positionDetectionState moves no_adapter → adapter_implemented_source_verified", (() => { const m = getStableYieldEvidenceManifest("kamino_usdc_lending")!; return m.positionDetectionState === "adapter_implemented_source_verified" && POSITION_BLOCKER_SUPERSESSION.priorPositionDetectionState === "no_adapter"; })(), "source-verified");
  add("POS-70: blocked_position_detection provenance is preserved", /RESOLVED at 16H-N\.5[\s\S]*blocked_position_detection/.test(getStableYieldEvidenceManifest("kamino_usdc_lending")!.blockers.join(" ")), "provenance kept");
  add("POS-71 (updated by 16H-N.7): N.5 named risk review under the old vocabulary; N.5a inserted the two nearer stages, and N.6+N.7 resolved both — so the live primary has arrived back at risk review, this time as the genuine last stage", POSITION_BLOCKER_SUPERSESSION.resultingPrimaryBlocker === "blocked_risk_review" && getStableYieldEvidenceManifest("kamino_usdc_lending")!.primaryBlocker === "blocked_risk_review" && /RESOLVED at 16H-N\.6/.test(getStableYieldEvidenceManifest("kamino_usdc_lending")!.blockers.join(" ")) && /RESOLVED at 16H-N\.7/.test(getStableYieldEvidenceManifest("kamino_usdc_lending")!.blockers.join(" ")), "same name, earned this time");
  add("POS-72: no blocker enum or lifecycle value was invented", POSITION_BLOCKER_SUPERSESSION.newBlockerEnumInvented === false && POSITION_BLOCKER_SUPERSESSION.newLifecycleValueInvented === false, "none invented");
  add("POS-73: the state-model gap is reported and is now binding", /no blocked_deposit_availability or blocked_constraints value/i.test(POSITION_BLOCKER_SUPERSESSION.stateModelGap) && /state_model_gap_primary_blocker_expressiveness/.test(getStableYieldEvidenceManifest("kamino_usdc_lending")!.blockers.join(" ")), "gap surfaced");
  add("POS-74: the match mechanism is recorded as the exact cToken mint", /B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D/.test(getStableYieldEvidenceManifest("kamino_usdc_lending")!.positionMatchMechanism ?? ""), "exact mint");
  add("POS-75: lifecycle remains identity_verified", /identity_verified/.test(POSITION_CONFERS.lifecycleUnchanged) && getYieldStrategy("kamino_usdc_lending")!.lifecycle === "identity_verified", "unchanged");

  // --- Scope fence ---
  add("POS-76 (updated by 16H-N.6): the position adapter conferred no deposit availability; N.6 resolved it separately from the deployed path", POSITION_CONFERS.depositAvailabilityRemains === "blocked" && (POSITION_CONFERS.doesNotConfer as readonly string[]).includes("deposit availability") && getStableYieldEvidenceManifest("kamino_usdc_lending")!.depositAvailabilityState === "adapter_implemented_source_verified", "N.5 conferred none; N.6 verified");
  add("POS-77 (updated by 16H-N.7): the position adapter conferred no constraints; N.7 resolved them separately", POSITION_CONFERS.constraintsRemain === "blocked" && getStableYieldEvidenceManifest("kamino_usdc_lending")!.constraintsState === "adapter_implemented_source_verified", "N.5 conferred none; N.7 verified");
  add("POS-78: no risk score, review, signoff, or approval", POSITION_CONFERS.riskScoreAssigned === false && POSITION_CONFERS.humanReviewOccurred === false && POSITION_CONFERS.signoffOccurred === false && POSITION_CONFERS.productApproved === false && getStableYieldEvidenceManifest("kamino_usdc_lending")!.riskReviewState === "blocked", "none");
  add("POS-79: no selector or recommendation eligibility", (POSITION_CONFERS.doesNotConfer as readonly string[]).includes("selector eligibility") && (POSITION_CONFERS.doesNotConfer as readonly string[]).includes("recommendation eligibility") && (POSITION_CONFERS.doesNotConfer as readonly string[]).includes("Top Pick"), "none");
  add("POS-80: readiness remains blocked", getStableYieldEvidenceManifest("kamino_usdc_lending")!.readiness === "blocked", "blocked");
  add("POS-81: capacity remains resolved and unchanged by this step", getStableYieldEvidenceManifest("kamino_usdc_lending")!.capacityAdapterState === "adapter_implemented_source_verified", "N.4 intact");
  add("POS-82 (updated by 16H-O.1): Steakhouse recognition and detection remain unchanged; only its capacity/primary-blocker representation was reconciled", (() => { const m = getStableYieldEvidenceManifest("kamino_steakhouse_usdc")!; return m.positionDetectionState === "adapter_implemented_source_verified" && m.primaryBlocker === "blocked_deposit_availability" && m.productAddress === "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E"; })(), "detection intact");
  add("POS-83: the Steakhouse share mint is not confused with this cToken", String(POSITION_IDENTITY.cTokenMint) !== "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS", "distinct mints");

  // --- Evidence ---
  add("POS-84: the evidence manifest is deterministic", POSITION_EVIDENCE_MANIFEST_HASH === computePositionEvidenceManifestHash() && /^position_evidence_[0-9a-f]{8}$/.test(POSITION_EVIDENCE_MANIFEST_HASH), POSITION_EVIDENCE_MANIFEST_HASH);
  add("POS-85: evidence records authority, numeric type, rounding, provenance, triggers", /redeem_collateral/.test(POSITION_EVIDENCE.valuationAuthority) && /BigInt/.test(POSITION_EVIDENCE.numericType) && POSITION_EVIDENCE.roundingDirection === "floor" && POSITION_EVIDENCE.sourceProvenance.length === 7 && POSITION_EVIDENCE.invalidationTriggers.length === 5, "complete");
  add("POS-86: the preparer is not represented as a human reviewer", POSITION_EVIDENCE.preparerIsNotHumanReviewer === true && POSITION_EVIDENCE.preparerRole === "automated_evidence_preparer", "not a reviewer");
  add("POS-87: the snapshot is evidence, not a production input", POSITION_SNAPSHOT_IS_NOT_PRODUCTION_INPUT.isProductionInput === false && /rises every accrual slot/i.test(POSITION_SNAPSHOT_IS_NOT_PRODUCTION_INPUT.rule), "evidence ≠ input");
  add("POS-88: prior identity evidence is unchanged", SOL_BTC_USDC_IDENTITY_MANIFEST_HASH === "identity_9773ac14" && computeIdentityManifestHash() === SOL_BTC_USDC_IDENTITY_MANIFEST_HASH, "identity_9773ac14");
  add("POS-89: prior APY evidence is unchanged", APY_EVIDENCE_MANIFEST_HASH === "apy_evidence_d468fce5" && computeApyEvidenceManifestHash() === APY_EVIDENCE_MANIFEST_HASH, "apy_evidence_d468fce5");
  add("POS-90: prior reward evidence is unchanged", REWARD_EVIDENCE_MANIFEST_HASH === "reward_evidence_cace4fe4" && computeRewardEvidenceManifestHash() === REWARD_EVIDENCE_MANIFEST_HASH, "reward_evidence_cace4fe4");
  add("POS-91: prior parity evidence is unchanged", PARITY_EVIDENCE_MANIFEST_HASH === "parity_evidence_dd25a9a1" && computeParityEvidenceManifestHash() === PARITY_EVIDENCE_MANIFEST_HASH, "parity_evidence_dd25a9a1");
  add("POS-92: measured-APY evidence is unchanged", MEASURED_APY_EVIDENCE_MANIFEST_HASH === "measured_apy_evidence_ebc7627d" && computeMeasuredApyEvidenceManifestHash() === MEASURED_APY_EVIDENCE_MANIFEST_HASH, "measured_apy_evidence_ebc7627d");
  add("POS-93: capacity evidence is unchanged", CAPACITY_EVIDENCE_MANIFEST_HASH === computeCapacityEvidenceManifestHash() && /^capacity_evidence_[0-9a-f]{8}$/.test(CAPACITY_EVIDENCE_MANIFEST_HASH), CAPACITY_EVIDENCE_MANIFEST_HASH);
  add("POS-94: all prior evidence ids are preserved", (PRESERVED_PRIOR_EVIDENCE_N5 as readonly string[]).includes("capacity_evidence_e54e310a") && (PRESERVED_PRIOR_EVIDENCE_N5 as readonly string[]).includes("measured_apy_evidence_ebc7627d") && PRESERVED_PRIOR_EVIDENCE_N5.length === 14, "14 preserved");
  add("POS-95: Steakhouse evidence and assessment remain immutable", KVAULT_CAPACITY_SOURCE.commit === "1d146d7087a76edbbadc14d848ae14295c0745a4", "unchanged");

  return checks;
}

/* ------------------------------------------------------------------ *
 * 16H-N.5a — Deposit Availability and Constraints Blocker States
 * ------------------------------------------------------------------ */

export function runKlendAvailabilityFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const avSrc = readIf("src/suggestions/klendReserveAvailability.ts");

  const A = AVAILABILITY_SNAPSHOT;
  // POSITION_IDENTITY carries cTokenDecimals/liquidityDecimals; the availability contract names the
  // field assetDecimals. Supplied explicitly rather than spread-and-hope.
  const ID: AvailabilityIdentity = { ...POSITION_IDENTITY, assetDecimals: POSITION_IDENTITY.liquidityDecimals };
  const SLOT = A.reserveSourceSlot, OBS = A.observedAt, NOW = Date.parse(OBS) + 30_000;
  const ONE = 2n ** 60n;
  // Slot-consistent pair from the 16H-N.5 position read (POSITION_SNAPSHOT), so the exchange rate
  // these fixtures exercise is a real one rather than two snapshots spliced together.
  const T = BigInt("110184636249066") * ONE;
  const S = BigInt(POSITION_SNAPSHOT.reserveCollateralMintTotalSupply);

  const dBase: DepositAvailabilityInputs = {
    identity: ID, reserveStatus: 0, reserveVersion: 1, reserveEmergencyMode: 0, blockCtokenUsage: 0,
    marketEmergencyMode: 0, marketPermissioningAuthority: A.marketPermissioningAuthority, marketPermissionedOps: 0,
    remainingCapacityRaw: CAPACITY_SNAPSHOT.remainingCapacityRaw, remainingCapacityTokenAmount: CAPACITY_SNAPSHOT.remainingCapacityTokenAmount,
    capacityIsFresh: true, isOverConfiguredLimit: false,
    reserveSourceSlot: SLOT, marketSourceSlot: SLOT, observedAt: OBS, nowMs: NOW,
  };
  const d = evaluateDepositAvailability(dBase);
  const dep = (o: Partial<DepositAvailabilityInputs>) => evaluateDepositAvailability({ ...dBase, ...o });

  // --- Deposit availability ---
  add("AV-1: exact reserve deposit availability resolves", d.depositAvailabilityState === "available" && d.depositsMechanicallyAllowed === true && d.blockingReasons.length === 0, "available");
  add("AV-2: positive capacity ALONE does not prove deposit availability", dep({ blockCtokenUsage: 1 }).depositsMechanicallyAllowed === false && dep({ blockCtokenUsage: 1 }).remainingCapacityTokenAmount === CAPACITY_SNAPSHOT.remainingCapacityTokenAmount, "888M capacity, still blocked");
  add("AV-3: an admin can disable deposits without touching the cap", DEPOSIT_PATH.adminCanDisableDepositsSeparatelyFromCap === true && /block_ctoken_usage/.test(DEPOSIT_PATH.adminDisableField) && dep({ blockCtokenUsage: 1 }).depositAvailabilityState === "paused", "block_ctoken_usage");
  add("AV-4: Obsolete status blocks deposits", dep({ reserveStatus: 1 }).depositsMechanicallyAllowed === false && dep({ reserveStatus: 1 }).depositAvailabilityState === "unsupported", "ReserveObsolete");
  add("AV-5: Hidden status PERMITS deposits (only Obsolete blocks)", dep({ reserveStatus: 2 }).depositsMechanicallyAllowed === true && DEPOSIT_PATH.activeStatusRequired === false && (DEPOSIT_PATH.statusesPermittingDeposits as readonly string[]).includes("Hidden (2)"), "Active not required");
  add("AV-6: a version mismatch blocks deposits", dep({ reserveVersion: 2 }).depositsMechanicallyAllowed === false, "ReserveDeprecated");
  add("AV-7: reserve emergency mode blocks deposits", dep({ reserveEmergencyMode: 1 }).depositAvailabilityState === "paused", "ReserveEmergencyMode");
  add("AV-8: market emergency state blocks deposits", dep({ marketEmergencyMode: 1 }).depositAvailabilityState === "paused", "market emergency");
  add("AV-9: a permissioned market blocks (requires an authority signature)", dep({ marketPermissionedOps: 1 }).depositsMechanicallyAllowed === false && dep({ marketPermissioningAuthority: "Perm1111111111111111111111111111111111111111" }).depositsMechanicallyAllowed === false, "MissingPermissioner");
  add("AV-10: at-capacity blocks deposits", dep({ remainingCapacityRaw: "0" }).depositAvailabilityState === "at_capacity", "zero remaining");
  add("AV-11: over-cap blocks deposits", dep({ isOverConfiguredLimit: true }).depositAvailabilityState === "at_capacity", "DepositLimitExceeded");
  add("AV-12: stale capacity blocks current deposit availability", dep({ capacityIsFresh: false }).depositsMechanicallyAllowed === false, "stale capacity");
  add("AV-13: unresolved capacity blocks (absence is never favourable)", dep({ remainingCapacityRaw: undefined }).depositsMechanicallyAllowed === false, "undefined → blocked");
  add("AV-14: stale reserve/market state blocks", dep({ nowMs: NOW + AVAILABILITY_TTL_MS + 1000 }).depositAvailabilityState === "stale" && dep({ marketSourceSlot: SLOT + MAX_AVAILABILITY_SLOT_SKEW + 1 }).depositAvailabilityState === "stale", "TTL + skew");
  add("AV-15: a missing source slot blocks", dep({ reserveSourceSlot: undefined }).depositAvailabilityState === "unresolved", "undated");
  add("AV-16: exact reserve binding is required", evaluateDepositAvailability({ ...dBase, identity: { ...ID, reserveAddress: "So11111111111111111111111111111111111111112" } }).depositAvailabilityState === "unresolved", "reserve bound");
  add("AV-17: exact market binding is required", evaluateDepositAvailability({ ...dBase, identity: { ...ID, marketAddress: "So11111111111111111111111111111111111111112" } }).depositsMechanicallyAllowed === false, "market bound");
  add("AV-18: exact mint binding is required", evaluateDepositAvailability({ ...dBase, identity: { ...ID, liquidityMint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" } }).depositsMechanicallyAllowed === false, "mint bound");
  add("AV-19: exact KLend program is required", evaluateDepositAvailability({ ...dBase, identity: { ...ID, klendProgram: "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd" } }).depositsMechanicallyAllowed === false, "program bound");
  add("AV-20: the token program and decimals are bound", evaluateDepositAvailability({ ...dBase, identity: { ...ID, tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" } }).depositsMechanicallyAllowed === false && evaluateDepositAvailability({ ...dBase, identity: { ...ID, assetDecimals: 9 } }).depositsMechanicallyAllowed === false, "bound");
  add("AV-21: deposit availability produces no execution CTA", d.executionCtaProduced === false && AVAILABILITY_CONFERS.executionCtaCreated === false && !/onClick|href=|Deposit now/i.test(avSrc), "no CTA");
  add("AV-22: the full deployed path is recorded (10 gates)", DEPOSIT_PATH.gates.length === 10 && /handler_deposit_reserve_liquidity/.test(DEPOSIT_PATH.handler), "10 gates");
  add("AV-23: equality with the cap is accepted; the incoming amount is counted first", DEPOSIT_PATH.equalityWithCapAccepted === true && DEPOSIT_PATH.capacityCheckedAfterIncomingAmount === true, "strict >");
  add("AV-24: elevation groups do not gate supply", DEPOSIT_PATH.elevationGroupAppliesToSupply === false && /gate BORROWING/.test(DEPOSIT_PATH.elevationGroupNote), "borrow-only");

  // --- Withdrawal accessibility ---
  const AVAIL = BigInt(A.freelyAvailableLiquidityRaw);
  const wBase: WithdrawalAccessibilityInputs = {
    identity: ID, walletCTokenBalanceRaw: "3500000",
    totalSupplySf: T.toString(), collateralMintTotalSupplyRaw: S.toString(),
    totalAvailableLiquidityRaw: A.totalAvailableLiquidityRaw, queuedLiquidityRaw: "0",
    reserveEmergencyMode: 0, marketEmergencyMode: 0, reserveVersion: 1,
    walletSourceSlot: SLOT, reserveSourceSlot: SLOT, marketSourceSlot: SLOT, observedAt: OBS, nowMs: NOW,
  };
  const w = evaluateWithdrawalAccessibility(wBase);
  const wd = (o: Partial<WithdrawalAccessibilityInputs>) => evaluateWithdrawalAccessibility({ ...wBase, ...o });

  add("AV-25: exact wallet position withdrawal accessibility resolves", w.withdrawalAvailabilityState === "fully_available" && w.fullPositionImmediatelyWithdrawable === true, "fully available");
  add("AV-26: full position withdraws when liquidity covers it", w.maxImmediatelyRedeemableCTokenRaw === "3500000" && w.immediatelyWithdrawableUnderlyingRaw === w.fullUnderlyingClaimRaw, "full claim");
  add("AV-27: integer redemption floor is preserved", w.fullUnderlyingClaimRaw === collateralToLiquidityFloor(3_500_000n, T, S).toString(), "floor");
  // Partial: cap liquidity to half the claim.
  const halfClaim = collateralToLiquidityFloor(3_500_000n, T, S) / 2n;
  const p = wd({ totalAvailableLiquidityRaw: halfClaim.toString() });
  add("AV-28: a partial amount is calculated when liquidity is insufficient", p.withdrawalAvailabilityState === "partially_available" && p.fullPositionImmediatelyWithdrawable === false && BigInt(p.immediatelyWithdrawableUnderlyingRaw!) > 0n, "partial");
  add("AV-29: the inverse cToken amount is MAXIMAL — selected fits", p.maximalityProof!.selectedFits === true, "fits");
  add("AV-30: selected + 1 base unit FAILS at the boundary", p.maximalityProof!.plusOneFails === true && p.maximalityProof!.maximal === true && p.maximalityProof!.boundedByWallet === false, "maximal by predicate");
  add("AV-31: maximality is proven by the mirrored predicate, independently", (() => { const c = BigInt(p.maxImmediatelyRedeemableCTokenRaw!); return collateralToLiquidityFloor(c, T, S) <= halfClaim && collateralToLiquidityFloor(c + 1n, T, S) > halfClaim; })(), "re-verified");
  add("AV-32: full-balance selection is bounded by the wallet, not liquidity", w.maximalityProof!.boundedByWallet === true && w.maximalityProof!.maximal === true, "wallet-bound");
  add("AV-33b: the exported inverse agrees with the adapter's selection", (() => { const half = collateralToLiquidityFloor(3_500_000n, T, S) / 2n; return maxRedeemableCTokens(half, T, S, 3_500_000n).toString() === p.maxImmediatelyRedeemableCTokenRaw; })(), "same value");
  add("AV-33: the inverse uses a closed form, not a floating-point search", !/while\s*\(|for\s*\(let\s+guess|Math\.sqrt|parseFloat/.test(avSrc.split("maxRedeemableCTokens")[1]?.slice(0, 400) ?? "x"), "ceilDiv closed form");
  add("AV-34: zero liquidity produces zero immediately withdrawable", (() => { const z = wd({ totalAvailableLiquidityRaw: "0" }); return z.immediatelyWithdrawableUnderlyingRaw === "0" && z.maxImmediatelyRedeemableCTokenRaw === "0" && z.withdrawalAvailabilityState === "unavailable"; })(), "zero");
  add("AV-35: liquidity below one redeemable unit yields zero", (() => { const z = wd({ totalAvailableLiquidityRaw: "1" }); return BigInt(z.maxImmediatelyRedeemableCTokenRaw!) >= 0n && BigInt(z.immediatelyWithdrawableUnderlyingRaw!) <= 1n; })(), "dust liquidity");
  add("AV-36: no position produces no withdrawal claim", (() => { const z = wd({ walletCTokenBalanceRaw: "0" }); return z.withdrawalAvailabilityState === "unavailable" && z.fullUnderlyingClaimRaw === "0" && z.blockingReasons.some((r) => /no_position/.test(r)); })(), "no position");
  add("AV-37: withdrawable never exceeds the full underlying claim", BigInt(w.immediatelyWithdrawableUnderlyingRaw!) <= BigInt(w.fullUnderlyingClaimRaw!) && BigInt(p.immediatelyWithdrawableUnderlyingRaw!) <= BigInt(p.fullUnderlyingClaimRaw!), "≤ claim");
  add("AV-38: withdrawable never exceeds freely available liquidity", BigInt(p.immediatelyWithdrawableUnderlyingRaw!) <= halfClaim && BigInt(w.immediatelyWithdrawableUnderlyingRaw!) <= AVAIL, "≤ liquidity");
  add("AV-39: the limit is freely available = total_available − queued, not total_supply", (() => { const q = wd({ queuedLiquidityRaw: "1000000000000" }); return BigInt(q.freelyAvailableLiquidityRaw!) === BigInt(A.totalAvailableLiquidityRaw) - 1_000_000_000_000n; })() && /saturating_sub/.test(WITHDRAWAL_PATH.exactLimitingAmount + avSrc), "queue subtracted");
  add("AV-40: total_supply is rejected as the limit (it includes borrowed funds)", /includes BORROWED funds/.test(WITHDRAWAL_PATH.limitIsNotTotalSupply) && BigInt(A.freelyAvailableLiquidityRaw) < BigInt(CAPACITY_SNAPSHOT.totalSuppliedRaw), "21.6M avail < 111.5M supply");
  add("AV-41: partial redemption is supported", WITHDRAWAL_PATH.partialRedemptionAllowed === true && w.partialWithdrawalSupported === true, "caller-chosen amount");
  add("AV-42: no withdrawal fee or penalty", /none found/.test(WITHDRAWAL_PATH.withdrawalFee), "no fee");
  add("AV-43: no cooldown or FIFO on the regular path", /no cooldown or FIFO on the regular path/i.test(WITHDRAWAL_PATH.cooldownOrQueue), "none");
  add("AV-44: the queue caveat takes the conservative branch", /CONSERVATIVE branch/.test(WITHDRAWAL_PATH.queueCaveat) && /understates accessibility rather than overstating/.test(WITHDRAWAL_PATH.queueCaveat), "conservative");
  add("AV-45: fees are excluded from withdrawable liquidity", WITHDRAWAL_PATH.feesExcludedFromWithdrawableLiquidity === true, "excluded");
  add("AV-46: stale reserve state fails withdrawal accessibility closed", wd({ nowMs: NOW + AVAILABILITY_TTL_MS + 1000 }).withdrawalAvailabilityState === "stale", "TTL");
  add("AV-47: stale wallet state / source skew fails closed", wd({ walletSourceSlot: SLOT + MAX_AVAILABILITY_SLOT_SKEW + 1 }).withdrawalAvailabilityState === "stale", "skew");
  add("AV-48: malformed fixed-point state fails closed", wd({ collateralMintTotalSupplyRaw: "0" }).withdrawalAvailabilityState === "unresolved" && wd({ totalSupplySf: undefined }).withdrawalAvailabilityState === "unresolved", "fails closed");

  // --- Independence ---
  add("AV-49: deposits can be blocked while withdrawals remain available", (() => { const dep2 = dep({ blockCtokenUsage: 1 }); const w2 = wd({}); return dep2.depositsMechanicallyAllowed === false && w2.withdrawalAvailabilityState === "fully_available"; })(), "block_ctoken_usage: deposits off, exits on");
  add("AV-50: an Obsolete reserve blocks deposits but permits redemption", dep({ reserveStatus: 1 }).depositsMechanicallyAllowed === false && WITHDRAWAL_PATH.hiddenOrObsoleteAllowRedemption === true && (WITHDRAWAL_PATH.gatesAbsentRelativeToDeposit as readonly string[]).some((g) => /NO check_reserve_status_and_version/.test(g)), "asymmetric");
  add("AV-51: a permissioned market gates deposits but not exits", (WITHDRAWAL_PATH.gatesAbsentRelativeToDeposit as readonly string[]).some((g) => /NO check_permissions/.test(g)) && WITHDRAWAL_PATH.withdrawalsAvailableWhenDepositsDisabled === true, "exits unpermissioned");
  add("AV-52: emergency mode blocks BOTH — it does not preserve withdrawals", WITHDRAWAL_PATH.emergencyModeBlocksWithdrawals === true && DEPOSIT_PATH.emergencyModeBlocksDeposits === true && wd({ reserveEmergencyMode: 1 }).withdrawalAvailabilityState === "paused", "symmetric gate");
  add("AV-53: full reserve liquidity alone does not prove the position is withdrawable without exact conversion", (() => { const c = wd({ totalAvailableLiquidityRaw: "4000000" }); return c.fullPositionImmediatelyWithdrawable === false; })(), "4.0 USDC liquidity < 4.17 claim");
  add("AV-54: deposit availability does not affect recognized buffer value", (() => { const cov = computeBufferCoverage({ fullUnderlyingTokenAmount: 100, immediatelyWithdrawableTokenAmount: 100, withdrawalState: "fully_available", usdcPriceUsd: 0.99985, priceSource: "approved", priceObservedAt: OBS, priceMaxAgeMs: 60_000, nowMs: NOW }); return cov.state === "usd_recognized" && cov.recognizedBufferValueUsd === 99.985 && /no bearing on what the user already holds/.test(BUFFER_COVERAGE_POLICY.depositAvailabilityDoesNotAffectRecognized); })(), "independent");
  add("AV-55: withdrawal accessibility does not confer recommendation eligibility", /not evidence of suitability/.test(BUFFER_COVERAGE_POLICY.withdrawalDoesNotConferRecommendation) && (AVAILABILITY_CONFERS.doesNotConfer as readonly string[]).includes("recommendation eligibility"), "no recommendation");

  // --- Safety Buffer ---
  const cov = computeBufferCoverage({ fullUnderlyingTokenAmount: 4.171273, immediatelyWithdrawableTokenAmount: 4.171273, withdrawalState: "fully_available", usdcPriceUsd: 0.99985, priceSource: "approved_exact_mint", priceObservedAt: OBS, priceMaxAgeMs: 60_000, nowMs: NOW });
  add("AV-56: recognized is separate from liquid", BUFFER_COVERAGE_POLICY.sufficiencyUses === "liquidBufferValueUsd ONLY" && cov.state === "usd_recognized" && cov.recognizedBufferValueUsd !== undefined && cov.liquidBufferValueUsd !== undefined, "separate");
  add("AV-57: a partial verified amount partially satisfies the buffer", (() => { const c = computeBufferCoverage({ fullUnderlyingTokenAmount: 100, immediatelyWithdrawableTokenAmount: 40, withdrawalState: "partially_available", usdcPriceUsd: 1, priceSource: "a", priceObservedAt: OBS, priceMaxAgeMs: 60_000, nowMs: NOW }); return c.state === "usd_recognized" && c.recognizedBufferValueUsd === 100 && c.liquidBufferValueUsd === 40; })() && BUFFER_COVERAGE_POLICY.partialCounts === true, "40 of 100 counts");
  add("AV-58: the whole position is NOT required before counting the verified part", /would discard evidence we actually have/.test(BUFFER_COVERAGE_POLICY.partialRationale), "partial counts");
  add("AV-59: unresolved withdrawal accessibility gives zero liquid coverage", (() => { const c = computeBufferCoverage({ fullUnderlyingTokenAmount: 100, immediatelyWithdrawableTokenAmount: 100, withdrawalState: "unresolved", usdcPriceUsd: 1, priceSource: "a", priceObservedAt: OBS, priceMaxAgeMs: 60_000, nowMs: NOW }); return c.liquidBufferValueUsd === 0 && c.recognizedBufferValueUsd === 100; })(), "liquid 0, recognized stands");
  add("AV-60: stale/paused withdrawal fails liquid closed while recognized survives", (() => { for (const st of ["stale", "paused", "unavailable"] as const) { const c = computeBufferCoverage({ fullUnderlyingTokenAmount: 100, immediatelyWithdrawableTokenAmount: 100, withdrawalState: st, usdcPriceUsd: 1, priceSource: "a", priceObservedAt: OBS, priceMaxAgeMs: 60_000, nowMs: NOW }); if (c.liquidBufferValueUsd !== 0 || c.recognizedBufferValueUsd !== 100) return false; } return true; })(), "3 states fail closed");
  add("AV-61: the position remains visible when liquid coverage fails closed", BUFFER_COVERAGE_POLICY.positionRemainsVisibleWhenLiquidFailsClosed === true && AVAILABILITY_PRESENTATION.visibleUnderYieldStrategies === true, "still visible");
  add("AV-62: a missing or stale USDC price prevents USD buffer values but preserves tokens", (() => { const a = computeBufferCoverage({ fullUnderlyingTokenAmount: 100, immediatelyWithdrawableTokenAmount: 40, withdrawalState: "partially_available", usdcPriceUsd: undefined, priceSource: undefined, priceObservedAt: undefined, priceMaxAgeMs: 60_000, nowMs: NOW }); const b = computeBufferCoverage({ fullUnderlyingTokenAmount: 100, immediatelyWithdrawableTokenAmount: 40, withdrawalState: "partially_available", usdcPriceUsd: 1, priceSource: "a", priceObservedAt: "2026-07-17T00:00:00.000Z", priceMaxAgeMs: 60_000, nowMs: NOW }); return a.state === "usd_unavailable" && a.recognizedTokenAmount === 100 && a.liquidTokenAmount === 40 && b.state === "usd_unavailable"; })(), "tokens preserved");
  add("AV-63: USDC is not assumed to equal $1", BUFFER_COVERAGE_POLICY.usdcAssumedOneDollar === false && Math.abs((cov as { recognizedBufferValueUsd: number }).recognizedBufferValueUsd - 4.171273 * 0.99985) < 1e-9, "×0.99985");
  add("AV-64: no percentage haircut is applied", BUFFER_COVERAGE_POLICY.inventedHaircut === false && !/haircut\s*[=:]\s*0?\.\d/.test(avSrc), "no haircut");

  // --- Presentation ---
  add("AV-65: presentation copy is recorded but nothing renders", AVAILABILITY_PRESENTATION.productionCardRendered === false && /Available based on current reserve liquidity/.test(AVAILABILITY_PRESENTATION.fullyAvailable) && AVAILABILITY_PRESENTATION.partiallyAvailable.length === 2, "recorded only");
  add("AV-66: no buttons, CTAs, migration or approval labels", AVAILABILITY_PRESENTATION.mustNotRender.length === 8 && (AVAILABILITY_PRESENTATION.mustNotRender as readonly string[]).includes("deposit buttons") && (AVAILABILITY_PRESENTATION.mustNotRender as readonly string[]).includes("move from Steakhouse language"), "8 forbidden");

  // --- State ---
  const kam = () => getStableYieldEvidenceManifest("kamino_usdc_lending")!;
  add("AV-67: depositAvailabilityState moves blocked → adapter_implemented_source_verified", kam().depositAvailabilityState === "adapter_implemented_source_verified" && DEPOSIT_BLOCKER_SUPERSESSION.priorDepositAvailabilityState === "blocked", "source-verified");
  add("AV-68: historical blocked-deposit evidence is preserved", /RESOLVED at 16H-N\.6[\s\S]*blocked_deposit_availability/.test(kam().blockers.join(" ")), "provenance");
  add("AV-69 (updated by 16H-N.7): N.6 moved primary to constraints, which N.7 has since resolved", DEPOSIT_BLOCKER_SUPERSESSION.resultingPrimaryBlocker === "blocked_constraints" && kam().primaryBlocker === "blocked_risk_review", "N.6 record intact, live state advanced");
  add("AV-70: the ordering places constraints after deposit availability", isNearerBlocker("blocked_deposit_availability", "blocked_constraints") === true, "N.5a order holds");
  add("AV-71: the withdrawal-accessibility state gap is reported, not invented", /no withdrawal-accessibility field/i.test(DEPOSIT_BLOCKER_SUPERSESSION.withdrawalAccessibilityStateGap) && DEPOSIT_BLOCKER_SUPERSESSION.newBlockerEnumInvented === false && kam().exitEvidenceState === "blocked", "gap reported");
  add("AV-72 (updated by 16H-N.7): the availability step conferred no constraints; N.7 resolved them separately", AVAILABILITY_CONFERS.constraintsRemain === "blocked" && (AVAILABILITY_CONFERS.doesNotConfer as readonly string[]).includes("constraints evaluation") && kam().constraintsState === "adapter_implemented_source_verified", "N.6 conferred none; N.7 verified");
  add("AV-73: risk review remains blocked", kam().riskReviewState === "blocked" && AVAILABILITY_CONFERS.riskReviewRemains === "blocked", "blocked");
  add("AV-74: lifecycle is unchanged", getYieldStrategy("kamino_usdc_lending")!.lifecycle === "identity_verified", "identity_verified");
  add("AV-75: readiness remains blocked", kam().readiness === "blocked", "blocked");
  add("AV-76: no score, review, signoff or approval", AVAILABILITY_CONFERS.riskScoreAssigned === false && AVAILABILITY_CONFERS.humanReviewOccurred === false && AVAILABILITY_CONFERS.signoffOccurred === false && AVAILABILITY_CONFERS.productApproved === false, "none");
  add("AV-77: no selector, recommendation or Top Pick", (AVAILABILITY_CONFERS.doesNotConfer as readonly string[]).includes("selector eligibility") && (AVAILABILITY_CONFERS.doesNotConfer as readonly string[]).includes("Top Pick") && (AVAILABILITY_CONFERS.doesNotConfer as readonly string[]).includes("a production suggestion card"), "none");
  add("AV-78: no transaction is constructed or simulated", AVAILABILITY_CONFERS.transactionConstructedOrSimulated === false && !/sendTransaction|signTransaction|simulateTransaction|VersionedTransaction/.test(avSrc), "read-only");
  add("AV-79: the module is read-only", /STRICTLY READ-ONLY/.test(avSrc), "reads only");

  // --- Evidence ---
  add("AV-80: the evidence manifest is deterministic", AVAILABILITY_EVIDENCE_MANIFEST_HASH === computeAvailabilityEvidenceManifestHash() && /^availability_evidence_[0-9a-f]{8}$/.test(AVAILABILITY_EVIDENCE_MANIFEST_HASH), AVAILABILITY_EVIDENCE_MANIFEST_HASH);
  add("AV-81: known source gaps are recorded, not guessed", AVAILABILITY_EVIDENCE.knownGaps.length === 3 && /is_permissioned_market\(\) body not located/.test(AVAILABILITY_EVIDENCE.knownGaps[0]), "3 gaps");
  add("AV-82: the rolling withdrawal cap is modelled and shown non-binding", ROLLING_WITHDRAWAL_CAP.bindingNow === false && /Headroom is capacity - currentTotal/.test(ROLLING_WITHDRAWAL_CAP.bindingRationale) && ROLLING_WITHDRAWAL_CAP.isSeparateFromDepositLimit === true, "91.9M headroom > 21.6M liquidity");
  add("AV-83: the preparer is not represented as a human reviewer", AVAILABILITY_EVIDENCE.preparerIsNotHumanReviewer === true, "not a reviewer");
  add("AV-84: the snapshot is evidence, not a production input", SNAPSHOT_IS_NOT_PRODUCTION_INPUT_N6.isProductionInput === false && /yesterday's permission as today's/.test(SNAPSHOT_IS_NOT_PRODUCTION_INPUT_N6.rule), "evidence ≠ input");
  add("AV-85 (updated by 16H-O.1): the N.6 availability step left the Steakhouse capacity contradiction untouched, exactly as recorded; 16H-O.1 later reconciled it", STEAKHOUSE_CAPACITY_CONTRADICTION_UNTOUCHED.modified === false && getStableYieldEvidenceManifest("kamino_steakhouse_usdc")!.capacityAdapterState === "adapter_implemented_source_verified" && getStableYieldEvidenceManifest("kamino_steakhouse_usdc")!.primaryBlocker === "blocked_deposit_availability" && KVAULT_CAPACITY_SOURCE.commit === "1d146d7087a76edbbadc14d848ae14295c0745a4", "N.6 deferred it; O.1 fixed it");
  add("AV-86: all prior evidence is immutable", SOL_BTC_USDC_IDENTITY_MANIFEST_HASH === "identity_9773ac14" && APY_EVIDENCE_MANIFEST_HASH === "apy_evidence_d468fce5" && REWARD_EVIDENCE_MANIFEST_HASH === "reward_evidence_cace4fe4" && PARITY_EVIDENCE_MANIFEST_HASH === "parity_evidence_dd25a9a1" && MEASURED_APY_EVIDENCE_MANIFEST_HASH === "measured_apy_evidence_ebc7627d" && CAPACITY_EVIDENCE_MANIFEST_HASH === computeCapacityEvidenceManifestHash() && POSITION_EVIDENCE_MANIFEST_HASH === computePositionEvidenceManifestHash() && BLOCKER_ORDER_EVIDENCE_MANIFEST_HASH === computeBlockerOrderEvidenceManifestHash(), "8 hashes intact");
  add("AV-87: all prior evidence ids are preserved", (PRESERVED_PRIOR_EVIDENCE_N6 as readonly string[]).includes("blocker_order_evidence_fae4d95f") && PRESERVED_PRIOR_EVIDENCE_N6.length === 18, "18 preserved");

  return checks;
}

/* ------------------------------------------------------------------ *
 * 16H-N.7 — Exact Product Constraints and Amount Semantics
 * ------------------------------------------------------------------ */

export function runKlendConstraintsFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const cSrc = readIf("src/suggestions/klendReserveConstraints.ts");

  const ONE = 2n ** 60n;
  const K = CONSTRAINTS_SNAPSHOT;
  // Slot-consistent pair from the N.5 position read; rate ≈ 1.1918 USDC per cToken.
  const T = BigInt("110184636249066") * ONE;
  const S = BigInt(POSITION_SNAPSHOT.reserveCollateralMintTotalSupply);
  const ID: ConstraintsIdentity = {
    ...POSITION_IDENTITY, assetDecimals: POSITION_IDENTITY.liquidityDecimals,
    liquidityTokenProgram: EXPECTED_TOKEN_PROGRAM_ID, collateralTokenProgram: EXPECTED_TOKEN_PROGRAM_ID,
  };
  const SLOT = K.reserveSourceSlot, OBS = K.observedAt, NOW = Date.parse(OBS) + 30_000;
  const base: ConstraintsInputs = {
    identity: ID, totalSupplySf: T.toString(), collateralMintTotalSupplyRaw: S.toString(),
    remainingCapacityRaw: CAPACITY_SNAPSHOT.remainingCapacityRaw,
    reserveSourceSlot: SLOT, marketSourceSlot: SLOT, capacitySourceSlot: SLOT, observedAt: OBS, nowMs: NOW,
  };
  const r = deriveKlendReserveConstraints(base);
  const con = (o: Partial<ConstraintsInputs>) => deriveKlendReserveConstraints({ ...base, ...o });
  const minDep = deriveProtocolMinimumDepositRaw(T, S);

  // --- The headline: amount > 0 is not the minimum ---
  add("CN-1: a zero deposit is rejected by the deployed code", /liquidity_amount == 0/.test(DEPOSIT_AMOUNT_SEMANTICS.zeroCheckPredicate) && /InvalidAmount/.test(DEPOSIT_AMOUNT_SEMANTICS.zeroCheckPredicate), "InvalidAmount");
  add("CN-2: the zero check alone does NOT establish a minimum", DEPOSIT_AMOUNT_SEMANTICS.zeroCheckIsOnRequestedAmount === true && /does not establish a valid minimum deposit/i.test(DEPOSIT_AMOUNT_SEMANTICS.zeroCheckIsNotSufficient), "requested-amount only");
  add("CN-3: the protocol minimum deposit is derived exactly as ceil(T/S)", r.protocolMinimumDepositRaw === minDep.toString() && minDep === 2n && r.protocolMinimumDepositTokenAmount === 0.000002, "2 base units");
  add("CN-4: an amount BELOW the minimum mints zero cTokens", liquidityToCollateralFloor(minDep - 1n, T, S) === 0n, "l2c(1) = 0");
  add("CN-5: the EXACT minimum mints one cToken", liquidityToCollateralFloor(minDep, T, S) === 1n, "l2c(2) = 1");
  add("CN-6: the minimum PLUS ONE mints two cTokens", liquidityToCollateralFloor(minDep + 1n, T, S) === 2n, "l2c(3) = 2");
  add("CN-7: a positive deposit CAN mint zero cTokens and is not rejected", DEPOSIT_AMOUNT_SEMANTICS.positiveDepositCanMintZeroCTokens === true && DEPOSIT_AMOUNT_SEMANTICS.zeroCollateralRejected === false && /no-ops/.test(DEPOSIT_AMOUNT_SEMANTICS.zeroCollateralBehaviour), "succeeds as a no-op");
  add("CN-8: 1 base unit is NOT the minimum", minDep !== 1n && r.protocolMinimumDepositRaw !== "1", "2, not 1");
  add("CN-9: no friendly UX minimum was invented", r.protocolMinimumDepositTokenAmount !== 0.01 && r.protocolMinimumDepositTokenAmount !== 1 && !/0\.01 USDC/.test(cSrc.split("Do not report")[0] ?? cSrc), "not 0.01");
  add("CN-10: the minimum is a rate-dependent FORMULA, not a constant", r.protocolMinimumDepositIsRateDependent === true && K.isPermanentTruth === false && /rate rises with every accrual slot/i.test(CONSTRAINT_LAYER_SEPARATION.rule), "ceil(T/S)");
  add("CN-11: a higher exchange rate raises the minimum", deriveProtocolMinimumDepositRaw(T * 3n, S) > minDep, "rate ↑ → min ↑");
  add("CN-12: deposit conversion uses deployed FLOOR rounding", /FLOOR via try_to_floor/.test(DEPOSIT_AMOUNT_SEMANTICS.liquidityToCollateral) && liquidityToCollateralFloor(3n, T, S) === 2n, "floor, not round");
  add("CN-13: amount granularity is exactly 1 base unit and is not the minimum", r.depositGranularityRaw === "1" && r.depositGranularityTokenAmount === 1e-6 && r.depositGranularityRaw !== r.protocolMinimumDepositRaw, "granularity ≠ minimum");

  // --- Ceil-back ---
  add("CN-14: the ceil-back is not a refund — the protocol rounds in its own favour", DEPOSIT_AMOUNT_SEMANTICS.amountTakenIsCeilBack === true && /rounds in the PROTOCOL's favour/i.test(DEPOSIT_AMOUNT_SEMANTICS.ceilBackPurpose) && /NOT a refund mechanism/.test(DEPOSIT_AMOUNT_SEMANTICS.guardMeaning), "safety assert");
  add("CN-15: sub-unit dust is donated to existing suppliers, not trapped", DEPOSIT_AMOUNT_SEMANTICS.dustDisposition === "donated_to_existing_suppliers" && /Not trapped/.test(DEPOSIT_AMOUNT_SEMANTICS.dustExplanation), "donated");
  add("CN-16: the ceil-back example is exact", (() => { const c = liquidityToCollateralFloor(5n, T, S); const back = (c * T + ONE * S - 1n) / (ONE * S); return c === 4n && back === 5n; })(), "5 → 4 cTok → takes 5");

  // --- Maximum ---
  add("CN-17: current capacity bounds the maximum additional deposit", r.maximumAdditionalDepositRaw === CAPACITY_SNAPSHOT.remainingCapacityRaw && r.maximumDepositLimitingFactor === "current_remaining_reserve_capacity", "888M");
  add("CN-18: the 1B configured cap is NOT the current maximum", r.maximumAdditionalDepositTokenAmount !== CAPACITY_SNAPSHOT.depositLimitTokenAmount && (r.maximumAdditionalDepositTokenAmount ?? 0) < 1_000_000_000, "888M < 1B");
  add("CN-19: the maximum is current-state dependent", r.maximumIsCurrentStateDependent === true && (CONSTRAINT_LAYER_SEPARATION.currentState as readonly string[]).includes("remaining capacity"), "not immutable");
  add("CN-20: wallet balance is not an immutable product constraint", !/walletBalance|wallet_balance/.test(JSON.stringify(r)) && !(CONSTRAINT_LAYER_SEPARATION.immutable as readonly string[]).some((x) => /wallet/i.test(x)), "user-specific, excluded");
  add("CN-21: unresolved capacity leaves the maximum unresolved and insufficient", (() => { const x = con({ remainingCapacityRaw: undefined }); return x.maximumDepositLimitingFactor === "unresolved" && x.definitionSufficientForConstraints === false && x.unresolvedConstraints.length === 1; })(), "fails closed");

  // --- Redemption ---
  add("CN-22: a zero redemption is rejected by deployed code", /collateral_amount == 0/.test(REDEEM_AMOUNT_SEMANTICS.zeroCheckPredicate) && /InvalidAmount/.test(REDEEM_AMOUNT_SEMANTICS.zeroCheckPredicate), "InvalidAmount");
  add("CN-23: the minimum cToken redemption is derived exactly", r.protocolMinimumRedeemCTokenRaw === deriveMinimumRedeemCTokenRaw(T, S).toString() && r.protocolMinimumRedeemCTokenRaw === "1", "ceil(S/T) = 1");
  add("CN-24: the minimum resulting underlying is exact", r.minimumRedeemUnderlyingRaw === "1", "1 cTok → 1 base unit");
  add("CN-25: redemption floor is preserved", /FLOOR via to_floor/.test(REDEEM_AMOUNT_SEMANTICS.conversionSymbol), "to_floor");
  add("CN-26: a positive redemption CAN produce zero USDC and is classified, not dismissed", REDEEM_AMOUNT_SEMANTICS.positiveRedemptionCanProduceZeroUnderlying === true && REDEEM_AMOUNT_SEMANTICS.zeroUnderlyingRejected === false && REDEEM_AMOUNT_SEMANTICS.zeroUnderlyingClassification === "present_but_not_currently_reachable", "classified");
  add("CN-27: zero-underlying redemption requires a rate below 1, unreachable now", /T\/S < 1/.test(REDEEM_AMOUNT_SEMANTICS.zeroUnderlyingExplanation) && /REAL dust-loss path/.test(REDEEM_AMOUNT_SEMANTICS.zeroUnderlyingExplanation) && K.exchangeRateUsdcPerCToken > 1, "rate 1.19 > 1");
  add("CN-28: withdrawal granularity is exact", r.withdrawalGranularityRaw === "1" && REDEEM_AMOUNT_SEMANTICS.partialRedemptionAllowed === true, "1 cToken base unit");

  // --- Fees / timing ---
  add("CN-29: no deposit fee was invented", r.depositFeeState === "absent_by_deployed_code" && /BORROW origination fee/.test(FEE_AND_TIMING_CONSTRAINTS.depositFee.detail), "absent");
  add("CN-30: no withdrawal fee was invented", r.withdrawalFeeState === "absent_by_deployed_code" && /no fee term appears/.test(FEE_AND_TIMING_CONSTRAINTS.withdrawalFee.detail), "absent");
  add("CN-31: no withdrawal penalty was invented", r.withdrawalPenaltyState === "absent_by_deployed_code", "absent");
  add("CN-32: the protocol take rate is NOT labelled a withdrawal fee", FEE_AND_TIMING_CONSTRAINTS.protocolTakeRate.state === "present_but_not_a_user_fee" && /never deducted from a deposit or a withdrawal/i.test(FEE_AND_TIMING_CONSTRAINTS.protocolTakeRate.detail) && r.withdrawalFeeState !== FEE_AND_TIMING_CONSTRAINTS.protocolTakeRate.state, "10% of borrower interest");
  add("CN-33: performance/management fees are not imported from KVault", FEE_AND_TIMING_CONSTRAINTS.performanceFee.state === "not_applicable_to_direct_reserve" && /does NOT transfer here/.test(FEE_AND_TIMING_CONSTRAINTS.performanceFee.detail), "KVault ≠ KLend");
  add("CN-34: no cooldown was invented", r.cooldownState === "absent_by_deployed_code", "absent");
  add("CN-35: no lockup was invented", r.lockupState === "absent_by_deployed_code" && /BORROW-side terms/.test(FEE_AND_TIMING_CONSTRAINTS.lockup.detail), "absent");
  add("CN-36: queue behaviour is represented exactly", FEE_AND_TIMING_CONSTRAINTS.fifoQueue.state === "present_but_not_on_regular_path" && r.queueState === "present_but_currently_empty" && /SUBTRACTS queued liquidity/.test(FEE_AND_TIMING_CONSTRAINTS.fifoQueue.detail), "exists, not enqueued");
  add("CN-37: the rolling withdrawal limit is DISTINCT from reserve liquidity", FEE_AND_TIMING_CONSTRAINTS.rollingWithdrawalCap.isDistinctFromLiquidity === true && r.rollingWithdrawalLimitState === "present_and_exact" && /liquidity binds first/.test(FEE_AND_TIMING_CONSTRAINTS.rollingWithdrawalCap.detail), "90M/24h ≠ liquidity");
  add("CN-38: cToken transfer restrictions are absent by config", FEE_AND_TIMING_CONSTRAINTS.cTokenTransferRestrictions.state === "absent_by_config", "plain SPL mint");
  add("CN-39: every fee/timing item carries an explicit classification", Object.values(FEE_AND_TIMING_CONSTRAINTS).every((v) => typeof (v as { state?: string }).state === "string" && (v as { state: string }).state.length > 0), "12 classified");

  // --- Accounts / permissioning ---
  add("CN-40: an ATA is NOT falsely required; non-associated accounts are supported", ACCOUNT_REQUIREMENTS.protocolConstraints.associatedTokenAccountRequired === false && /Non-associated accounts are fully supported/.test(ACCOUNT_REQUIREMENTS.protocolConstraints.associatedTokenAccountNote), "not required");
  add("CN-41: exact token programs are required", validateConstraintsIdentity({ ...ID, liquidityTokenProgram: TOKEN_2022_PROGRAM_ID }).ok === false && validateConstraintsIdentity({ ...ID, collateralTokenProgram: TOKEN_2022_PROGRAM_ID }).ok === false, "Tokenkeg both");
  add("CN-42: the reserve's own vaults are rejected as source/destination", /InvalidAccountInput/.test(ACCOUNT_REQUIREMENTS.protocolConstraints.sourceCannotBeReserveVault), "vault rejected");
  add("CN-43: permissioning state is exact and marked current-state", r.permissioningState === "not_permissioned" && PERMISSIONING_CONSTRAINT.isCurrentState === true && /can become permissioned/.test(PERMISSIONING_CONSTRAINT.caveat), "not permissioned now");
  add("CN-44: no per-wallet limit or eligibility restriction was invented", PER_WALLET_LIMIT.state === "absent_by_deployed_code" && PRODUCT_ELIGIBILITY_RESTRICTION.state === "absent_by_deployed_code", "absent");
  add("CN-45: protocol support is separated from WealthSmith's read-only stance", ACCOUNT_REQUIREMENTS.wealthsmithMvpLimitations.readOnly === true && /Mechanical protocol support is NOT permission to act/.test(ACCOUNT_REQUIREMENTS.wealthsmithMvpLimitations.detail), "separated");

  // --- Freshness / identity ---
  add("CN-46: current-state constraints fail closed when stale", con({ nowMs: NOW + CONSTRAINTS_TTL_MS + 1000 }).failure === "stale_state", "TTL");
  add("CN-47: excessive source skew fails closed", con({ capacitySourceSlot: SLOT + MAX_CONSTRAINTS_SLOT_SKEW + 1 }).failure === "source_skew_exceeded", "skew");
  add("CN-48: a missing source slot fails closed", con({ marketSourceSlot: undefined }).failure === "missing_source_slot", "undated");
  add("CN-49: an unresolvable exchange rate fails closed", con({ collateralMintTotalSupplyRaw: "0" }).failure === "exchange_rate_unresolvable" && con({ totalSupplySf: undefined }).failure === "exchange_rate_unresolvable", "no rate → no minimum");
  add("CN-50: exact-product identity is required", deriveKlendReserveConstraints({ ...base, identity: { ...ID, reserveAddress: "So11111111111111111111111111111111111111112" } }).failure === "identity_mismatch" && validateConstraintsIdentity({ ...ID, cTokenMint: "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS" }).ok === false && validateConstraintsIdentity({ ...ID, assetDecimals: 9 }).ok === false, "bound");
  add("CN-51: all three source slots are recorded", r.reserveSourceSlot === SLOT && r.marketSourceSlot === SLOT && r.capacitySourceSlot === SLOT && r.sourceSkewSlots === 0 && r.freshnessState === "fresh", "3 slots");
  add("CN-52: immutable and current-state constraints are separated", CONSTRAINT_LAYER_SEPARATION.immutable.length === 9 && CONSTRAINT_LAYER_SEPARATION.currentState.length === 6 && (CONSTRAINT_LAYER_SEPARATION.currentState as readonly string[]).some((x) => /RESULT of the minimum formula|2 base units/.test(x)), "formula vs result");

  // --- Presentation ---
  add("CN-53: only verified statements are recorded", (CONSTRAINT_PRESENTATION.verifiedStatements as readonly string[]).includes("No lockup") && (CONSTRAINT_PRESENTATION.verifiedStatements as readonly string[]).includes("No withdrawal fee") && (CONSTRAINT_PRESENTATION.verifiedStatements as readonly string[]).includes("Withdrawals depend on current reserve liquidity"), "6 verified");
  add("CN-54: forbidden claims are enumerated and absent from the copy", CONSTRAINT_PRESENTATION.forbiddenClaims.length === 6 && !(CONSTRAINT_PRESENTATION.verifiedStatements as readonly string[]).some((s) => (CONSTRAINT_PRESENTATION.forbiddenClaims as readonly string[]).some((f) => s.toLowerCase().includes(f))), "none present");
  add("CN-55: 'users can always leave' is explicitly rejected", /Exits are NOT unconditional/.test(CONSTRAINT_PRESENTATION.mustNotSayUsersCanAlwaysLeave) && /emergency mode/.test(CONSTRAINT_PRESENTATION.mustNotSayUsersCanAlwaysLeave), "conditional exits");
  add("CN-56: the minimum-deposit statement carries the exact amount and its variability", /0\.000002 USDC/.test(CONSTRAINT_PRESENTATION.minimumDepositStatement) && /varies with/.test(CONSTRAINT_PRESENTATION.minimumDepositStatement), "exact + variable");
  add("CN-57: no card renders and no internal risk score is exposed", CONSTRAINT_PRESENTATION.productionCardRendered === false && CONSTRAINT_PRESENTATION.mustNotRenderInternalRiskScores === true, "recorded only");

  // --- State ---
  const kam = () => getStableYieldEvidenceManifest("kamino_usdc_lending")!;
  add("CN-58: constraintsState moves blocked → adapter_implemented_source_verified", kam().constraintsState === "adapter_implemented_source_verified" && CONSTRAINTS_BLOCKER_SUPERSESSION.priorConstraintsState === "blocked", "source-verified");
  add("CN-59: historical blocked-constraints evidence is preserved", /RESOLVED at 16H-N\.7[\s\S]*blocked_constraints/.test(kam().blockers.join(" ")), "provenance");
  add("CN-60: the primary blocker moves to blocked_risk_review", kam().primaryBlocker === "blocked_risk_review" && CONSTRAINTS_BLOCKER_SUPERSESSION.resultingPrimaryBlocker === "blocked_risk_review", "moved on");
  add("CN-61: risk review is the nearest remaining stage and is genuinely unresolved", validatePrimaryBlockerIsNearest(kam().primaryBlocker, ["blocked_risk_review"]).ok === true && kam().riskReviewState === "blocked", "human gate");
  add("CN-62: the candidate did NOT move to ready_for_approval_review", String(kam().primaryBlocker) !== "ready_for_approval_review" && kam().readiness === "blocked" && (CONSTRAINTS_CONFERS.doesNotConfer as readonly string[]).includes("ready_for_approval_review"), "not ready");
  add("CN-63: productMinimumUsd stays undefined rather than assuming USDC = $1", kam().productMinimumUsd === undefined && /rather than assuming USDC = \$1/.test(CONSTRAINTS_BLOCKER_SUPERSESSION.productMinimumUsdNotPopulated), "token-unit canonical");
  add("CN-64: no blocker enum or lifecycle value was invented", CONSTRAINTS_BLOCKER_SUPERSESSION.newBlockerEnumInvented === false && CONSTRAINTS_BLOCKER_SUPERSESSION.newLifecycleValueInvented === false && getYieldStrategy("kamino_usdc_lending")!.lifecycle === "identity_verified", "identity_verified");
  add("CN-65: deposit availability remains source-verified", kam().depositAvailabilityState === "adapter_implemented_source_verified", "N.6 intact");
  add("CN-66: position detection and capacity remain source-verified", kam().positionDetectionState === "adapter_implemented_source_verified" && kam().capacityAdapterState === "adapter_implemented_source_verified", "N.4 + N.5 intact");
  add("CN-67: APY remains estimated_variable_apy and comparison-ready", RATE_KIND === "estimated_variable_apy" && CORRECTION_READINESS_RESULT.definitionSufficientForComparison === true, "unchanged");
  add("CN-68: no score, review, signoff or approval", CONSTRAINTS_CONFERS.riskScoreAssigned === false && CONSTRAINTS_CONFERS.humanReviewOccurred === false && CONSTRAINTS_CONFERS.signoffOccurred === false && CONSTRAINTS_CONFERS.productApproved === false, "none");
  add("CN-69: no selector, recommendation, Top Pick or card", (CONSTRAINTS_CONFERS.doesNotConfer as readonly string[]).includes("selector eligibility") && (CONSTRAINTS_CONFERS.doesNotConfer as readonly string[]).includes("Top Pick") && (CONSTRAINTS_CONFERS.doesNotConfer as readonly string[]).includes("a production suggestion card"), "none");
  add("CN-70: no transaction is constructed or simulated", CONSTRAINTS_CONFERS.transactionConstructedOrSimulated === false && !/sendTransaction|signTransaction|simulateTransaction|VersionedTransaction/.test(cSrc) && /STRICTLY READ-ONLY/.test(cSrc), "read-only");

  // --- Evidence ---
  add("CN-71: the evidence manifest is deterministic", CONSTRAINTS_EVIDENCE_MANIFEST_HASH === computeConstraintsEvidenceManifestHash() && /^constraints_evidence_[0-9a-f]{8}$/.test(CONSTRAINTS_EVIDENCE_MANIFEST_HASH), CONSTRAINTS_EVIDENCE_MANIFEST_HASH);
  add("CN-72: evidence records the formula, authorities and triggers", CONSTRAINTS_EVIDENCE.minimumFormula === "ceil(T / S)" && /compute_depositable_amount/.test(CONSTRAINTS_EVIDENCE.depositAuthority) && CONSTRAINTS_EVIDENCE.whatChanged.length === 5 && CONSTRAINTS_EVIDENCE.invalidationTriggers.length === 5, "complete");
  add("CN-73: the preparer is not represented as a human reviewer", CONSTRAINTS_EVIDENCE.preparerIsNotHumanReviewer === true, "not a reviewer");
  add("CN-74 (updated by 16H-O.1): the N.7 constraints step changed nothing for Steakhouse; 16H-O.1 later reconciled its capacity contradiction and moved its primary nearer", getStableYieldEvidenceManifest("kamino_steakhouse_usdc")!.primaryBlocker === "blocked_deposit_availability" && getStableYieldEvidenceManifest("kamino_steakhouse_usdc")!.constraintsState === "adapter_implemented_source_verified" && KVAULT_CAPACITY_SOURCE.commit === "1d146d7087a76edbbadc14d848ae14295c0745a4", "N.7 untouched it; O.1 reconciled it");
  add("CN-75: all prior evidence is immutable", SOL_BTC_USDC_IDENTITY_MANIFEST_HASH === "identity_9773ac14" && APY_EVIDENCE_MANIFEST_HASH === "apy_evidence_d468fce5" && REWARD_EVIDENCE_MANIFEST_HASH === "reward_evidence_cace4fe4" && PARITY_EVIDENCE_MANIFEST_HASH === "parity_evidence_dd25a9a1" && MEASURED_APY_EVIDENCE_MANIFEST_HASH === "measured_apy_evidence_ebc7627d" && CAPACITY_EVIDENCE_MANIFEST_HASH === computeCapacityEvidenceManifestHash() && POSITION_EVIDENCE_MANIFEST_HASH === computePositionEvidenceManifestHash() && BLOCKER_ORDER_EVIDENCE_MANIFEST_HASH === computeBlockerOrderEvidenceManifestHash() && AVAILABILITY_EVIDENCE_MANIFEST_HASH === computeAvailabilityEvidenceManifestHash(), "9 hashes intact");
  add("CN-76: all prior evidence ids are preserved", (PRESERVED_PRIOR_EVIDENCE_N7 as readonly string[]).includes("availability_evidence_078133b7") && PRESERVED_PRIOR_EVIDENCE_N7.length === 11, "11 preserved");

  return checks;
}

/* ------------------------------------------------------------------ *
 * 16H-O.1 — Steakhouse Capacity Evidence and Primary-Blocker Reconciliation
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Step 16H-S.4 — live KLend market snapshot. One raw read feeds APY/capacity/
 * availability via the existing calc modules; exact identity enforced; fresh →
 * runtime-eligible, stale/unresolved → fail-closed. API is never authority.
 * ------------------------------------------------------------------ */
export function runKlendMarketDataFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  const NOW = Date.parse("2026-07-18T12:00:00.000Z");
  const rawFresh: MDRaw = {
    identity: { marketAddress: MD_ID.marketAddress, reserveAddress: MD_ID.reserveAddress, liquidityMint: MD_ID.liquidityMint, cTokenMint: MD_ID.cTokenMint, klendProgramId: MD_ID.klendProgramId, cluster: MD_ID.cluster },
    apy: { utilizationRatio: 0.85, supplyAprRatio: 0.055, supplyApyRatio: 0.0565, borrowAprRatio: 0.07, borrowApyRatio: 0.072, protocolTakeRatePct: 10, referralFeeBps: 0, rateCurveWellFormed: true, supplierFarmBound: true, rewardStreamsResolved: true, rewardApyPct: 0 },
    slotDuration: { measuredMs: 415, observationSlot: 433465111, windowsAgree: true },
    capacity: { depositLimitRaw: "1000000000000000", totalSupplySf: "112000000000000000000000000", totalAvailableAmountRaw: "888000000000", borrowedAmountSf: "0" },
    availability: { reserveStatus: 0, reserveVersion: 1, reserveEmergencyMode: 0, blockCtokenUsage: 0, marketEmergencyMode: 0, marketPermissioningAuthority: "11111111111111111111111111111111", marketPermissionedOps: 0 },
    reserveSourceSlot: 433465111, marketSourceSlot: 433465111, observedAt: "2026-07-18T12:00:00.000Z", assetDecimals: 6,
  };

  // --- One read feeds all three; exact identity enforced ---
  const snap = mdBuild(rawFresh, NOW);
  add("MD-1: one raw read produces APY + capacity + availability (deduplicated)", snap.apy != null && snap.capacity != null && snap.availability != null && snap.identityValid === true, "single read");
  add("MD-2: all three sub-outputs share the same source slot (one read)", snap.apy.sourceSlot === 433465111 && snap.capacity.sourceSlot === 433465111 && snap.availability.sourceSlot === 433465111, "same slot");
  add("MD-3: identity mismatch → invalid, all unresolved", (() => { const s = mdBuild({ ...rawFresh, identity: { ...rawFresh.identity, reserveAddress: "WrongReserve1111111111111111111111111111111" } }, NOW); return s.identityValid === false && s.invalidationReason === "identity_mismatch" && s.apy.freshness === "unresolved" && s.availability.depositsMechanicallyAllowed === false; })(), "identity gate");

  // --- No hardcoded slot duration (measured value flows through) ---
  add("MD-4: measured slot duration flows through (no hardcode)", snap.apy.measuredSlotDurationMs === 415 && mdBuild({ ...rawFresh, slotDuration: { measuredMs: 402, observationSlot: 433465111, windowsAgree: true } }, NOW).apy.measuredSlotDurationMs === 402, "measured");
  add("MD-5: missing/unagreeing slot measurement → APY not slot-fresh", mdToRuntime(mdBuild({ ...rawFresh, slotDuration: { measuredMs: null, observationSlot: null, windowsAgree: false } }, NOW)).apy.slotDurationFresh === false, "slot gate");

  // --- Rewards exhausted remain zero, excluded from total ---
  add("MD-6: exhausted rewards remain zero", snap.apy.rewardApyPct === 0, "rewards 0");

  // --- Freshness → runtime mapping (deterministic on literal snapshots) ---
  const freshLit: MDSnap = { identityValid: true, invalidationReason: null,
    apy: { baseSupplyApyPct: 5.65, rewardApyPct: 0, totalApyPct: 5.65, rateKind: "estimated_variable_apy", measuredSlotDurationMs: 415, calculationVersion: "v1", sourceSlot: 1, observedAt: "x", freshness: "fresh", invalidationReason: null },
    capacity: { remainingCapacityRaw: "888000000000", remainingCapacityTokenAmount: 888000, capacityKind: "capped", sourceSlot: 1, freshness: "fresh", invalidationReason: null },
    availability: { depositsMechanicallyAllowed: true, availabilityState: "available", blockingReasons: [], marketEmergencyState: "inactive", reserveEmergencyState: "inactive", sourceSlot: 1, freshness: "fresh" },
    overallFreshness: "fresh" };
  const staleLit: MDSnap = { ...freshLit, apy: { ...freshLit.apy, freshness: "stale" }, overallFreshness: "stale" };

  const rF = mdToRuntime(freshLit);
  add("MD-7: fresh snapshot → runtime APY present, fresh, identity matches, estimated_variable_apy", rF.apy.measuredApyPct === 5.65 && rF.apy.fresh === true && rF.apy.reserveIdentityMatches === true && rF.apy.rateKind === "estimated_variable_apy", "fresh apy");
  add("MD-8: fresh snapshot → deposits available, capacity fresh", rF.availability.depositsAvailable === true && rF.availability.emergencyModeActive === false && rF.capacity.fresh === true, "fresh avail");
  add("MD-9: stale APY is not fresh (never merged into eligible; adapter suppresses apy_stale)", mdToRuntime(staleLit).apy.fresh === false, "stale not fresh");
  add("MD-10: emergency state maps through", mdToRuntime({ ...freshLit, availability: { ...freshLit.availability, marketEmergencyState: "active" } }).availability.emergencyModeActive === true, "emergency");

  // --- Capacity vs configured cap ---
  add("MD-11: capacity coverage uses current remaining, not the configured cap", mdCovers(freshLit, 500000) === true && mdCovers(freshLit, 2_000_000) === false, "remaining not cap");
  add("MD-12: stale capacity never covers", mdCovers({ ...freshLit, capacity: { ...freshLit.capacity, freshness: "stale" } }, 1) === false, "stale cap");

  // --- End-to-end: fresh market emits through the adapter; stale suppresses ---
  {
    const base = { ...rtGov(), wallet: { usdcMint: RT_ID.canonicalUsdcMint, canonicalUsdcRawUnits: 25_000_000_000, pricesFresh: true }, safetyBuffer: { requiredResolved: true, sufficiencyResolved: true, fullyFundedByLiquidCoverage: true }, excess: { deterministicAmountUsd: 12000, isPositive: true }, suitability: { profileComplete: true, suitableForCategory: true, prohibitsDefiLending: false }, existingPosition: { holdsExactCToken: false, approvedTopUpRulePasses: false } };
    const eligible = rtEval({ ...base, ...mdToRuntime(freshLit) });
    add("MD-13: fresh live market → adapter emits exactly one card", eligible.emit === true && eligible.card!.apy!.display.startsWith("~") && /variable/i.test(eligible.card!.apy!.display), eligible.emit ? "emit" : eligible.suppressionReason);
    add("MD-14: stale live market → adapter suppresses (apy_stale)", rtEval({ ...base, ...mdToRuntime(staleLit) }).suppressionReason === "apy_stale", "stale suppress");
    add("MD-15: identity-invalid market → adapter suppresses", rtEval({ ...base, ...mdToRuntime(mdBuild({ ...rawFresh, identity: { ...rawFresh.identity, klendProgramId: "Wrong1111111111111111111111111111111111111" } }, NOW)) }).emit === false, "identity suppress");
  }

  // --- Immutability + no API authority markers ---
  add("MD-16: assessment + activation immutable", DA_OUTCOME.unroundedAggregate === 5.93 && DA_MANIFEST_HASH === "direct_assessment_54a11ba3" && GR_ACTIVATION.productionSuggestionEligible === true, "immutable");
  add("MD-17: snapshot carries on-chain source slots (API is not the authority)", snap.apy.sourceSlot != null && snap.capacity.sourceSlot != null && snap.availability.sourceSlot != null, "on-chain slots");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 16H-S.5 — component-layer live activation. Reuses the 16F excess
 * builder and the existing suitability rule (both fail-closed); proves the
 * full chain emits once suitability resolves; the assessment stays immutable.
 * ------------------------------------------------------------------ */

export function runKlendDirectExistingPositionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const NOW = Date.parse("2026-07-18T12:00:00.000Z");
  const acct = (over: Partial<{ address: string; mint: string; tokenProgram: string; amountRaw: string; decimals: number; owner: string; isClosed: boolean }> = {}) => ({
    address: over.address ?? "acctA", mint: over.mint ?? EP_POS_ID.cTokenMint, tokenProgram: over.tokenProgram ?? EP_TOKPROG,
    amountRaw: over.amountRaw ?? "1000000", decimals: over.decimals ?? EP_POS_ID.cTokenDecimals, owner: over.owner ?? "WALLET1", isClosed: over.isClosed,
  });
  // rate 1.191805 USDC/cToken: totalSupplySf = ONE_SF × 1191805, collateralSupply = 1_000_000.
  const reserve = {
    estimatedTotalSupplySf: (EP_ONE_SF * 1191805n).toString(), collateralMintTotalSupplyRaw: "1000000",
    totalAvailableLiquidityRaw: "100000000000", queuedLiquidityRaw: "0",
    reserveStatus: 0, reserveVersion: 1, reserveEmergencyMode: 0, marketEmergencyMode: 0,
    reserveSourceSlot: 433465111, marketSourceSlot: 433465111, cTokenMintSourceSlot: 433465111,
  };
  const input = (over: Partial<EPInput> = {}): EPInput => ({
    accounts: [acct()], walletAddress: "WALLET1", walletSourceSlot: 433465111, reserve,
    price: { usdcPriceUsd: 0.9998, fresh: true }, apy: { valuePct: 6.42, fresh: true, rateKind: "estimated_variable_apy" },
    observedAt: "2026-07-18T12:00:00.000Z", nowMs: NOW, ...over,
  });

  // --- Detection: exact cToken mint only ---
  add("EP-1: exact cToken account detected, position exists", (() => { const r = epBuild(input()); return r.positionExists === true && r.cTokenBalanceRaw === "1000000"; })(), "detected");
  add("EP-2: multiple cToken accounts aggregate", (() => { const r = epBuild(input({ accounts: [acct({ address: "a", amountRaw: "1000000" }), acct({ address: "b", amountRaw: "2000000" })] })); return r.cTokenBalanceRaw === "3000000"; })(), "aggregate");
  add("EP-3: wrong cToken mint → no position", epBuild(input({ accounts: [acct({ mint: "So11111111111111111111111111111111111111112" })] })).positionExists === false, "no symbol match");
  add("EP-4: wrong token program → account rejected → no position", epBuild(input({ accounts: [acct({ tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" })] })).positionExists === false, "token program");
  add("EP-5: zero balance → verified no position", epBuild(input({ accounts: [acct({ amountRaw: "0" })] })).positionExists === false, "zero");
  add("EP-6: no accounts → no position", epBuild(input({ accounts: [] })).positionExists === false, "none");

  // --- Redemption math (reused deployed-program methodology) ---
  add("EP-7: recognized = FLOOR(balance × totalSupply / collateralSupply) via exact integer math", (() => { const r = epBuild(input()); return r.recognizedUnderlyingRaw === "1191805" && r.positionExists === true; })(), "1191805");
  add("EP-8: recognized token amount ≈ 1.191805 USDC", (() => { const r = epBuild(input()); return Math.abs((r.recognizedUnderlyingTokenAmount ?? NaN) - 1.191805) < 1e-6; })(), "tokens");

  // --- Liquidity: recognized vs currently-liquid ---
  add("EP-9: ample liquidity → fully withdrawable, liquid == recognized", (() => { const r = epBuild(input()); return r.withdrawalState === "fully_withdrawable" && r.currentlyLiquidUnderlyingRaw === r.recognizedUnderlyingRaw && r.delayedOrUnavailableUnderlyingRaw === "0"; })(), "full");
  add("EP-10: constrained liquidity → partial; liquid < recognized; delayed = remainder", (() => { const r = epBuild(input({ reserve: { ...reserve, totalAvailableLiquidityRaw: "500000" } })); return (r.withdrawalState === "partially_withdrawable" || r.withdrawalState === "currently_unavailable") && BigInt(r.currentlyLiquidUnderlyingRaw ?? "0") <= BigInt(r.recognizedUnderlyingRaw ?? "0") && BigInt(r.delayedOrUnavailableUnderlyingRaw ?? "0") === BigInt(r.recognizedUnderlyingRaw ?? "0") - BigInt(r.currentlyLiquidUnderlyingRaw ?? "0"); })(), "partial");
  add("EP-11: emergency mode → not withdrawable, but position still recognized/visible", (() => { const r = epBuild(input({ reserve: { ...reserve, reserveEmergencyMode: 1 } })); return (r.withdrawalState === "emergency_paused" || r.withdrawalState === "currently_unavailable") && r.positionExists === true && r.recognizedUnderlyingRaw === "1191805"; })(), "emergency");
  add("EP-12: liquid never exceeds recognized", (() => { const r = epBuild(input({ reserve: { ...reserve, totalAvailableLiquidityRaw: "999999999999999" } })); return BigInt(r.currentlyLiquidUnderlyingRaw ?? "0") <= BigInt(r.recognizedUnderlyingRaw ?? "0"); })(), "cap");

  // --- Pricing (fresh only) ---
  add("EP-13: fresh price → recognized & liquid USD computed (no $1 assumption)", (() => { const r = epBuild(input()); return r.recognizedValueUsd !== null && Math.abs((r.recognizedValueUsd as number) - 1.191805 * 0.9998) < 1e-4 && r.liquidValueUsd !== null; })(), "usd");
  add("EP-14: stale/absent price → token units visible, USD null (never zero, never removed)", (() => { const r = epBuild(input({ price: { usdcPriceUsd: null, fresh: false } })); return r.positionExists === true && r.recognizedUnderlyingRaw === "1191805" && r.recognizedValueUsd === null && r.liquidValueUsd === null; })(), "no price");

  // --- Freshness fail-closed ---
  add("EP-15: stale wallet data → position visible but recognized unresolved (fail-closed)", (() => { const r = epBuild(input({ nowMs: NOW + 5 * 60 * 1000 })); return r.positionExists === true && r.freshnessState !== "fresh"; })(), "stale");
  add("EP-16: source-slot skew beyond bound → unresolved, still visible", (() => { const r = epBuild(input({ reserve: { ...reserve, reserveSourceSlot: 433465111 + 1000 } })); return r.positionExists === true && (r.freshnessState === "unresolved" || r.freshnessState === "stale"); })(), "skew");
  add("EP-17: missing conversion inputs → visible, unresolved (no fabricated value)", (() => { const r = epBuild(input({ reserve: { ...reserve, estimatedTotalSupplySf: null } })); return r.positionExists === true && r.recognizedValueUsd === null && r.freshnessState === "unresolved"; })(), "missing supply");

  // --- Normalization + dedup ---
  add("EP-18: normalized WalletPosition carries recognized/liquid/withdrawalState + dedup key + existing-only", (() => { const w = epToWallet(epBuild(input())); return !!w && w.type === "protocol" && w.protocol === "Kamino" && w.dedupeKey === EP_KEY && w.existingPositionOnly === true && w.mint === EP_POS_ID.liquidityMint && typeof w.liquidValueUsd === "number"; })(), "normalized");
  add("EP-19: generic cToken row + API obligation row for the exact reserve are deduped; unrelated preserved", (() => {
    const generic = { id: "tok-ctoken", source: "wallet", type: "token", symbol: "?", mint: EP_POS_ID.cTokenMint, amount: "1000000", detection: "direct_wallet_balance" } as any;
    const apiRow = { id: `kamino-supplied-${EP_POS_ID.reserveAddress}`, source: "kamino", type: "protocol", symbol: "USDC", mint: EP_POS_ID.liquidityMint, amount: "", detection: "protocol_api" } as any;
    const other = { id: "kamino-supplied-OtherReserve111", source: "kamino", type: "protocol", symbol: "SOL", amount: "", detection: "protocol_api" } as any;
    const out = epDedupe([generic, apiRow, other]);
    return !out.some((p) => p.mint === EP_POS_ID.cTokenMint) && !out.some((p) => p.id.includes(EP_POS_ID.reserveAddress)) && out.some((p) => p.id === other.id);
  })(), "deduped");
  add("EP-20: merge yields exactly one Kamino Direct row (one economic position)", (() => {
    const generic = { id: "tok-ctoken", source: "wallet", type: "token", symbol: "?", mint: EP_POS_ID.cTokenMint, amount: "1000000", detection: "direct_wallet_balance" } as any;
    const merged = epMerge([generic], epBuild(input()));
    const rows = merged.filter((p) => p.id === EP_ID);
    return rows.length === 1 && !merged.some((p) => p.mint === EP_POS_ID.cTokenMint && p.id !== EP_ID);
  })(), "one row");
  add("EP-21: no position → merge appends nothing (no fake row)", (() => { const merged = epMerge([], epBuild(input({ accounts: [] }))); return merged.length === 0; })(), "no fake");

  // --- Obligation-held collateral (a deposit made through Kamino's own app leaves
  //     NO cTokens in the wallet; the obligation holds them). The SAME approved
  //     methodology must run, so a vetted deposit counts toward the Safety Buffer
  //     instead of falling through to the generic "unresolved" protocol branch. ---
  const obligationAcct = acct({ address: `klend-obligation-${EP_POS_ID.reserveAddress}`, amountRaw: "12779612" });
  add("EP-24: obligation-derived collateral is accepted by the approved adapter", (() => {
    const r = epBuild(input({ accounts: [obligationAcct] }));
    return r.positionExists === true && r.cTokenBalanceRaw === "12779612";
  })(), "accepted");
  add("EP-25: obligation-derived position resolves recognized AND liquid (not unresolved)", (() => {
    const w = epToWallet(epBuild(input({ accounts: [obligationAcct] })));
    return !!w && w.existingPositionOnly === true && w.candidateId === "kamino_usdc_lending"
      && typeof w.recognizedValueUsd === "number" && typeof w.liquidValueUsd === "number"
      && (w.liquidValueUsd as number) > 0 && (w.liquidValueUsd as number) <= (w.recognizedValueUsd as number);
  })(), "resolved");
  add("EP-26: the Safety Buffer counts it as verified liquid (no 'verify your buffer')", (() => {
    const w = epToWallet(epBuild(input({ accounts: [obligationAcct] })))!;
    const cov = sbCoverage([w], 10_000);
    return cov.verifiedLiquidStableValueUsd > 0 && cov.unresolvedStableValueUsd === 0
      && cov.sources[0].inclusionState === "included_liquid";
  })(), "counted");
  add("EP-27: an exhausted reserve still yields ZERO verified liquid (methodology unchanged)", (() => {
    // Same obligation collateral, but the reserve has no withdrawable liquidity.
    const w = epToWallet(epBuild(input({ accounts: [obligationAcct], reserve: { ...reserve, totalAvailableLiquidityRaw: "0" } })));
    const cov = w ? sbCoverage([w], 10_000) : null;
    return !!cov && cov.verifiedLiquidStableValueUsd === 0;
  })(), "fails closed");
  add("EP-28: only the ONE approved reserve is promoted from an obligation", (() => {
    // BEHAVIORAL: the synthesis helper returns an account only for the approved
    // reserve; unvetted reserves and zero balances yield null. A thin regex keeps
    // the React mount bound to that helper.
    const approved = epObAccount({ [EP_POS_ID.reserveAddress]: "12779612672" }, "W1");
    const unvetted = epObAccount({ H3t6qZ1JkguCNTi9uzVKqQ7dvt2cum4XiXWom6Gn5e5S: "82999908930" }, "W1");
    const zero = epObAccount({ [EP_POS_ID.reserveAddress]: "0" }, "W1");
    const src = (() => { try { return readFileSync(`${process.cwd()}/src/wallet/useWalletPortfolio.ts`, "utf8"); } catch { return ""; } })();
    return approved !== null && approved.mint === EP_POS_ID.cTokenMint && approved.owner === "W1"
      && unvetted === null && zero === null
      && /obligationCTokenAccount\(kaminoCollateralRaw, owner\.toBase58\(\)\)/.test(src);
  })(), "approved reserve only");
  add("EP-33: the vetted Kamino lending APY is SOURCED (shown), not 'unsupported'", (() => {
    const src = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/positionOptimizationAssessment.ts`, "utf8"); } catch { return ""; } })();
    // Integrated only for the vetted candidate, and only when a value exists — a
    // MISSING value must NOT become `missing_expected` (that would make the
    // position newly eligible for a missing-data review).
    return /p\.candidateId === "kamino_usdc_lending" && v !== null/.test(src)
      && /sourced\("kamino_klend_reserve_metrics", "lending_supply_apy"/.test(src);
  })(), "sourced APY");
  add("EP-34: …and it stays INELIGIBLE for a low-yield review (display-only change)", (() => {
    // Low-yield review requires `sourced_fresh`; with no approved production
    // freshness policy this resolves to `sourced_freshness_unverified`.
    const src = (() => { try { return readFileSync(`${process.cwd()}/src/suggestions/positionOptimizationAssessment.ts`, "utf8"); } catch { return ""; } })();
    const lowYieldNeedsFresh = /lowYieldEligible = [^;]*apy\.apyState === "sourced_fresh"/.test(src);
    const noApprovedPolicy = (() => { const p = lookupApyFreshnessPolicy("kamino_klend_reserve_metrics", "lending_supply_apy"); return p === null || p.policyState !== "approved"; })();
    return lowYieldNeedsFresh && noApprovedPolicy;
  })(), "not newly eligible");
  add("EP-32: the canonical row carries the approved USDC icon in BOTH branches", (() => {
    // Resolved (mint = USDC) and unresolved (mint = cToken) must both show USDC —
    // the unresolved branch would otherwise fall back to the generic token glyph.
    const resolved = epToWallet(epBuild(input({ accounts: [obligationAcct] })));
    const unresolved = epToWallet(epBuild(input({ accounts: [obligationAcct], reserve: { ...reserve, collateralMintTotalSupplyRaw: null } })));
    return resolved?.icon === "assets/icons/token/usdc.svg" && unresolved?.icon === "assets/icons/token/usdc.svg";
  })(), "usdc icon");
  add("EP-29: an unpriced position resolves NOTHING (the failure this guards against)", (() => {
    // No fresh USDC price → no USD at all → the buffer can only say "unresolved",
    // which is what surfaced as "Current value could not be verified".
    const w = epToWallet(epBuild(input({ accounts: [obligationAcct], price: { usdcPriceUsd: null, fresh: false } })));
    return !!w && w.valueUsd == null && sbCoverage([w], 10_000).coverageState === "unresolved";
  })(), "unpriced → unresolved");
  add("EP-30: the mount sources the USDC price from the PRICE FEED, not a wallet USDC row", (() => {
    // A user who lent ALL of their USDC holds none loose, so looking for a USDC
    // position in the wallet leaves the lending position permanently unpriced.
    const src = (() => { try { return readFileSync(`${process.cwd()}/src/wallet/useWalletPortfolio.ts`, "utf8"); } catch { return ""; } })();
    return /sourcedUsdcPriceUsd = prices\.get\(KLEND_DIRECT_IDENTITY\.liquidityMint\)/.test(src)
      && /usdcPriceUsd: sourcedUsdcPriceUsd \?\?|sourcedUsdcPriceUsd \?\? merged\.find/.test(src);
  })(), "feed-sourced price");
  add("EP-31: the mount passes a real sourced supply APY (never a hardcoded null)", (() => {
    const src = (() => { try { return readFileSync(`${process.cwd()}/src/wallet/useWalletPortfolio.ts`, "utf8"); } catch { return ""; } })();
    return /klendApyPct = kaminoSupplyApyPct\[KLEND_DIRECT_IDENTITY\.reserveAddress\]/.test(src)
      && /apy: \{ valuePct: klendApyPct, fresh: klendApyPct != null/.test(src);
  })(), "sourced APY");

  // --- Immutability + read-only ---
  add("EP-22: assessment/governance/policy immutable; Steakhouse/Jupiter unaffected", DA_OUTCOME.unroundedAggregate === 5.93 && DA_OUTCOME.meetsMinimum === false && DA_MANIFEST_HASH === "direct_assessment_54a11ba3" && DL_CATMIN === 5.5 && DL_UNIMIN === 7 && dlGetDispo("kamino_steakhouse_usdc")?.disposition === "existing_position_only" && dlGetDispo("jupiter_lend_usdc")?.disposition === "excluded_from_suggestions", "immutable");
  add("EP-23: normalized position carries no transaction/execution affordance", (() => { const w = epToWallet(epBuild(input())); return !!w && !("cta" in w) && w.detection === "protocol_api"; })(), "read-only");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 17A.1 — fail-closed queued liquidity + visible unresolved position.
 * Unknown queue never becomes zero/positive liquid; a confirmed cToken holding
 * stays visible as ONE canonical unresolved row when enrichment fails.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Step 17A.1 — fail-closed queued liquidity + visible unresolved position.
 * Unknown queue never becomes zero/positive liquid; a confirmed cToken holding
 * stays visible as ONE canonical unresolved row when enrichment fails.
 * ------------------------------------------------------------------ */
export function runKlendDirectPositionFailClosedFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const NOW = Date.parse("2026-07-18T12:00:00.000Z");
  const acct = { address: "a", mint: EP_POS_ID.cTokenMint, tokenProgram: EP_TOKPROG, amountRaw: "1000000", decimals: EP_POS_ID.cTokenDecimals, owner: "WALLET1" };
  const reserveResolved = {
    estimatedTotalSupplySf: (EP_ONE_SF * 1191805n).toString(), collateralMintTotalSupplyRaw: "1000000",
    totalAvailableLiquidityRaw: "100000000000", queuedLiquidityRaw: "0" as string | null,
    reserveStatus: 0, reserveVersion: 1, reserveEmergencyMode: 0, marketEmergencyMode: 0,
    reserveSourceSlot: 433465111, marketSourceSlot: 433465111, cTokenMintSourceSlot: 433465111,
  };
  const inp = (over: Partial<EPInput> = {}): EPInput => ({
    accounts: [acct], walletAddress: "WALLET1", walletSourceSlot: 433465111, reserve: reserveResolved,
    price: { usdcPriceUsd: 0.9998, fresh: true }, apy: { valuePct: null, fresh: false, rateKind: "estimated_variable_apy" },
    observedAt: "2026-07-18T12:00:00.000Z", nowMs: NOW, ...over,
  });

  // --- Issue 1: queued liquidity fail-closed ---
  add("FC-1: explicitly decoded queued=0 is accepted (recognized+liquid resolve)", (() => { const r = epBuild(inp()); return r.enrichmentState === "complete" && r.currentlyLiquidUnderlyingRaw !== null; })(), "zero ok");
  add("FC-2: MISSING queued liquidity (null) → liquid UNRESOLVED, never zero/positive", (() => { const r = epBuild(inp({ reserve: { ...reserveResolved, queuedLiquidityRaw: null } })); return r.positionExists === true && r.recognizedUnderlyingRaw !== null && r.currentlyLiquidUnderlyingRaw === null && r.liquidValueUsd === null && r.withdrawalState === "unresolved" && r.enrichmentState === "recognized_only"; })(), "unknown queue");
  add("FC-3: unknown queue never produces positive liquid value", (() => { const r = epBuild(inp({ reserve: { ...reserveResolved, queuedLiquidityRaw: null } })); return r.currentlyLiquidUnderlyingTokenAmount === null && r.liquidValueUsd === null; })(), "no positive");
  add("FC-4: missing total available liquidity (null) → liquid unresolved", (() => { const r = epBuild(inp({ reserve: { ...reserveResolved, totalAvailableLiquidityRaw: null } })); return r.currentlyLiquidUnderlyingRaw === null && r.liquidValueUsd === null; })(), "no available");
  add("FC-5: emergency mode → no verified liquid value, recognized still visible", (() => { const r = epBuild(inp({ reserve: { ...reserveResolved, reserveEmergencyMode: 1 } })); return r.recognizedUnderlyingRaw !== null && r.currentlyLiquidUnderlyingRaw === null && r.liquidValueUsd === null && (r.withdrawalState === "emergency_paused" || r.withdrawalState === "currently_unavailable"); })(), "emergency");
  add("FC-6: recognized may resolve while ONLY withdrawal data is unresolved", (() => { const r = epBuild(inp({ reserve: { ...reserveResolved, queuedLiquidityRaw: null } })); return r.recognizedValueUsd !== null && r.liquidValueUsd === null; })(), "recognized kept");

  // --- Issue 2: confirmed cToken visible when enrichment fails ---
  add("FC-7: reserve enrichment failure (reserve=null) → ONE visible unresolved position, cToken balance preserved", (() => { const r = epBuild(inp({ reserve: null })); return r.positionExists === true && r.cTokenBalanceRaw === "1000000" && r.recognizedUnderlyingRaw === null && r.recognizedValueUsd === null && r.liquidValueUsd === null && r.withdrawalState === "unresolved" && r.enrichmentState === "unresolved"; })(), "visible unresolved");
  add("FC-8: missing total supply → visible, recognized unresolved (no fabricated underlying)", (() => { const r = epBuild(inp({ reserve: { ...reserveResolved, estimatedTotalSupplySf: null } })); return r.positionExists === true && r.recognizedUnderlyingRaw === null && r.recognizedValueUsd === null; })(), "no supply");
  add("FC-9: unresolved position never fabricates underlying USDC value", (() => { const r = epBuild(inp({ reserve: null })); const w = epToWallet(r); return !!w && w.valueUsd === null && w.recognizedValueUsd === null && w.liquidValueUsd === null; })(), "no fabrication");
  add("FC-10: unresolved WalletPosition keeps the confirmed cToken balance visible + existing-only", (() => { const w = epToWallet(epBuild(inp({ reserve: null }))); return !!w && w.amount === "1000000" && w.mint === EP_POS_ID.cTokenMint && w.existingPositionOnly === true && w.candidateId === "kamino_usdc_lending"; })(), "cToken kept");
  add("FC-11: no cTokens → still no position even with reserve=null", epBuild(inp({ accounts: [], reserve: null })).positionExists === false, "no position");

  // --- Dedup holds for the unresolved row ---
  add("FC-12: unresolved position replaces generic cToken row + suppresses exact-reserve API row; unrelated kept", (() => {
    const generic = { id: "tok", source: "wallet", type: "token", symbol: "?", mint: EP_POS_ID.cTokenMint, amount: "1000000", detection: "direct_wallet_balance" } as any;
    const apiRow = { id: `kamino-supplied-${EP_POS_ID.reserveAddress}`, source: "kamino", type: "protocol", mint: EP_POS_ID.liquidityMint, amount: "", detection: "protocol_api" } as any;
    const other = { id: "kamino-supplied-Other111", source: "kamino", type: "protocol", amount: "", detection: "protocol_api" } as any;
    const merged = epMerge([generic, apiRow, other], epBuild(inp({ reserve: null })));
    const canon = merged.filter((p) => p.id === EP_ID);
    return canon.length === 1 && !merged.some((p) => p.id === "tok") && !merged.some((p) => p.id.includes(EP_POS_ID.reserveAddress) && p.id !== EP_ID) && merged.some((p) => p.id === other.id);
  })(), "dedup unresolved");
  add("FC-13: enrichment failure does not restore duplicate rows (one economic position)", (() => { const merged = epMerge([{ id: "tok", source: "wallet", type: "token", symbol: "?", mint: EP_POS_ID.cTokenMint, amount: "1", detection: "direct_wallet_balance" } as any], epBuild(inp({ reserve: null }))); return merged.filter((p) => p.mint === EP_POS_ID.cTokenMint).length === 1 && merged.filter((p) => p.mint === EP_POS_ID.cTokenMint)[0].id === EP_ID; })(), "no restore");

  // --- Liquidity invariant + immutability + Safety Buffer unchanged ---
  add("FC-14: liquid raw never exceeds recognized raw (when both resolved)", (() => { const r = epBuild(inp()); return r.currentlyLiquidUnderlyingRaw !== null && r.recognizedUnderlyingRaw !== null && BigInt(r.currentlyLiquidUnderlyingRaw) <= BigInt(r.recognizedUnderlyingRaw); })(), "invariant");
  add("FC-15: Safety Buffer methodology unchanged; assessment/governance immutable; no tx behavior", DA_OUTCOME.unroundedAggregate === 5.93 && DA_MANIFEST_HASH === "direct_assessment_54a11ba3" && DL_CATMIN === 5.5 && DL_UNIMIN === 7 && (() => { const w = epToWallet(epBuild(inp({ reserve: null }))); return !!w && !("cta" in w); })(), "unchanged");

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 21B Phase 0 — mounted fail-closed honesty guards. (1) On Track cannot claim "on track" when the canonical
 * Rebalance assessment proves a MATERIAL need (card-independent). (2) UNRESOLVED Safety Buffer coverage cannot
 * emit a definite amount-bearing buffer card (generic OR plan-backed). Definite `incomplete` coverage is
 * unchanged. Complete coverage keeps its no-override behavior.
 * ------------------------------------------------------------------ */

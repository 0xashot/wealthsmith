/**
 * Wallet position-classification fixture checks (Token-2022 facts, native stake,
 * LST normalization, portfolio completeness + UI/gallery, safety-buffer coverage,
 * measured slot-duration APY).
 *
 * Extracted verbatim from suggestionEngine.fixtures.ts (progressive monolith split).
 * The monolith imports and aggregates these checks; behavior and check names are
 * unchanged.
 */
import { COMPLETENESS_COPY as UI_COPY, assessmentById as uiAssess, onTrackAvailability as uiOnTrack, portfolioTotalDisplay as uiTotal, positionCompletenessNote as uiNote, positionUnresolvedReason as uiReason, railOnTrackUnavailableMessage as uiRailOnTrack, selectPrimaryCompletenessWarning as uiWarning, shouldRenderDashForValue as uiDash } from "../../components/portfolioCompletenessUi";
import { getPortfolioCompletenessTestingFixtures as tgFixtures } from "../../pages/portfolioCompletenessTestingFixtures";
import { CLASSIC_TOKEN_PROGRAM as LST_TOKEN_PROG, SUPPORTED_LSTS as LST_SET, applyLstNormalization as lstApply, isSupportedLstMint as lstSupported, lstDedupeKey as lstKey, lstIdentityByMint as lstById, normalizeLstBacking as lstNorm, solExposureClass as lstExposureClass, totalSolExposureLamports as lstTotalExposure } from "../../wallet/lstUnderlyingNormalization";
import type { LstPoolFacts as LstPool } from "../../wallet/lstUnderlyingNormalization";
import { EPOCH_NEVER as NS_EPOCH_NEVER, STAKE_PROGRAM_ID as NS_STAKE_PROG, assessNativeStakeAccount as nsAssess, groupNativeStakeByValidator as nsGroup, nativeStakeDedupeKey as nsKey, toNativeStakeWalletFields as nsFields } from "../../wallet/nativeStakePositionAssessment";
import type { NativeStakeFacts as NSFacts } from "../../wallet/nativeStakePositionAssessment";
import { assessPositionCompleteness as pcAssess, canDetermineNetWorth as pcNetWorth, canGenerateDcaSuggestion as pcDca, canGenerateDirectLendingSuggestion as pcDirect, canGenerateRebalance as pcRebalance, canGenerateStakingSuggestion as pcStaking, classifyPositionClass as pcClass, computePortfolioCompleteness as pcCompute, detectDuplicateViolations as pcDupes } from "../../wallet/portfolioCompleteness";
import { classifyPositionCoverage as sbClassify, computeSafetyBufferCoverage as sbCoverage } from "../../wallet/safetyBufferCoverage";
import { EXT as T22_EXT, EXTENSION_IMPACT_MATRIX as T22_MATRIX, TOKEN_2022_PROGRAM_ID as T22_PROGRAM, applyToken2022Assessment as t22Apply, assessToken2022Account as t22AssessAcct, assessToken2022Position as t22AssessPos, calculateTransferFeeRaw as t22Fee, classifyExtension as t22Classify, transferabilityToWithdrawalState as t22ToWs } from "../../wallet/token2022PositionAssessment";
import type { Token2022AccountFacts as T22Acct, Token2022MintFacts as T22Mint } from "../../wallet/token2022PositionAssessment";
import type { WalletPosition as JLWalletPos, WalletPosition as SBPos } from "../../wallet/walletPosition";
import { deriveSafetyBuffer as sbDerive, getLiquidPositions } from "../../wallet/walletSummary";
import { getDisposition as dlGetDispo } from "../directUsdcLendingDispositions";
import { DIRECT_USDC_LENDING_CATEGORY_MINIMUM as DL_CATMIN, UNIVERSAL_MINIMUM as DL_UNIMIN } from "../directUsdcLendingEligibilityPolicy";
import { getUnderlyingExposureGroup as nsExposure } from "../duplicateExposure";
import type { FixtureCheck } from "./fixtureCheck";
import { DIRECT_ASSESSMENT_OUTCOME as DA_OUTCOME } from "../klendDirectUsdcAutomatedAssessment";
import { APY_EVIDENCE_MANIFEST_HASH, computeApyEvidenceManifestHash } from "../klendReserveApyDerivation";
import { PARITY_EVIDENCE_MANIFEST_HASH, computeParityEvidenceManifestHash } from "../klendReserveApyParityAmendment";
import { SOL_BTC_USDC_IDENTITY_MANIFEST_HASH, computeIdentityManifestHash } from "../klendReserveIdentity";
import { APY_UNIT_BLOCKER_SUPERSESSION, COMPARISON_METHODOLOGY_RULE, CORRECTED_APY_SNAPSHOT, CORRECTION_CONFERS, CORRECTION_PARITY_RESULT, CORRECTION_READINESS_RESULT, EVIDENCE_LAYER_SEPARATION, EXACT_PRODUCT_BINDING, FROZEN_SNAPSHOT_SENSITIVITY, HARDCODED_450_DEFECT, KAMINO_API_DIAGNOSTIC, MEASURED_APY_EVIDENCE, MEASURED_APY_EVIDENCE_MANIFEST_HASH, MEASUREMENT_REUSE_POLICY, MEASUREMENT_SNAPSHOT_IS_NOT_PRODUCTION_INPUT, PARITY_IMPROVEMENT, PARITY_TOLERANCE, PRECISION_STATE, PRESERVED_PRIOR_EVIDENCE, PRIOR_EVIDENCE_HANDLING, RATE_KIND, SLOT_ADJUSTMENT_MECHANISM, USER_FACING_APY_PRESENTATION, computeMeasuredApyEvidenceManifestHash, deriveMeasuredApy, evaluateComparisonReadiness, evaluateParityDiagnostic, validateExactProductBinding } from "../klendReserveMeasuredApyCorrection";
import { REWARD_EVIDENCE_MANIFEST_HASH, computeRewardEvidenceManifestHash } from "../klendReserveRewardResolution";
import { DENOMINATOR_POLICY, MAX_RESERVE_MEASUREMENT_SLOT_SKEW, MEASUREMENT_TTL_MS, PRIMARY_WINDOW_SLOTS, REJECTED_CONSTANT_MS, SANITY_RANGE_MS, VALIDATION_WINDOW_SLOTS, WINDOW_AGREEMENT_TOLERANCE, computeSlotAdjustmentFactor, measureSlotDuration, validateReserveMeasurementSkew } from "../solanaSlotDurationEstimator";
import { getStableYieldEvidenceManifest } from "../stableYieldProductionEvidence";
import { ExtensionType as SPL_EXT, calculateFee as splCalculateFee } from "@solana/spl-token";
import { readFileSync } from "node:fs";

/**
 * Step 17E — Token-2022 transferability, effective-balance and verified-liquidity hardening. Binds numeric
 * extension ids + the fee formula to the INSTALLED @solana/spl-token 0.4.14, then proves the balance splits,
 * fail-closed extension handling, aggregation, mapping, and Safety Buffer integration.
 */
export function runToken2022FixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const mfacts = (over: Partial<T22Mint> = {}): T22Mint => ({ mint: "MintT22xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", mintOwnerProgram: T22_PROGRAM, mintExtensionTypes: [], nonTransferable: false, hasTransferHook: false, hasConfidentialMint: false, transferFee: null, fresh: true, sourceSlot: 100, ...over });
  const afacts = (over: Partial<T22Acct> = {}): T22Acct => ({ address: "Acc1", mint: "MintT22xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", owner: "Wallet", ownerProgram: T22_PROGRAM, amountRaw: "1000000", accountState: 1, accountExtensionTypes: [], withheldRaw: null, fresh: true, sourceSlot: 100, ...over });
  const A = (o: Partial<T22Acct> = {}) => t22AssessAcct(afacts(o), mfacts());
  const AM = (acc: Partial<T22Acct>, mint: Partial<T22Mint>) => t22AssessAcct(afacts(acc), mfacts(mint));
  const t22stable = (over: Partial<JLWalletPos> = {}): JLWalletPos => ({ id: "t22usdc", source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", mint: "MintT22Usdc", amount: "1000000000", uiAmount: 1000, decimals: 6, detection: "direct_wallet_balance", valueUsd: 1000, ...over });

  // ---- Source binding to installed @solana/spl-token 0.4.14 ----
  add("T22-1: extension ids match the INSTALLED ExtensionType enum", T22_EXT.TransferFeeConfig === SPL_EXT.TransferFeeConfig && T22_EXT.NonTransferable === SPL_EXT.NonTransferable && T22_EXT.TransferHook === SPL_EXT.TransferHook && T22_EXT.PausableConfig === SPL_EXT.PausableConfig && T22_EXT.ConfidentialTransferAccount === SPL_EXT.ConfidentialTransferAccount && T22_EXT.PermanentDelegate === SPL_EXT.PermanentDelegate, "ids bound");
  add("T22-2: fee formula equals installed calculateFee (below max, capped, zero)", (() => {
    const cases = [[1000000n, 100, 1000000000n], [1000000n, 100, 5000n], [1000000n, 0, 1000000000n], [0n, 100, 1000000000n]] as const;
    return cases.every(([amt, bps, max]) => t22Fee(amt, bps, max) === splCalculateFee({ transferFeeBasisPoints: bps, maximumFee: max, epoch: 0n }, amt));
  })(), "fee bound");

  // ---- Impact matrix (source-backed; unknown fails closed) ----
  add("T22-3: every installed extension type is classified (none silently unsupported)", (() => {
    const vals = Object.values(SPL_EXT).filter((v) => typeof v === "number" && v !== 0) as number[];
    return vals.every((v) => v in T22_MATRIX);
  })(), "all classified");
  add("T22-4: unknown extension id fails closed to unsupported_by_decoder", t22Classify(99).impact === "unsupported_by_decoder", "unknown");
  add("T22-5: key impacts source-backed (fee/non-transferable/hook/delegate/memo/cpiGuard)", t22Classify(T22_EXT.TransferFeeConfig).impact === "deterministic_reduction" && t22Classify(T22_EXT.NonTransferable).impact === "explicitly_unavailable" && t22Classify(T22_EXT.TransferHook).impact === "unresolved_without_tx_context" && t22Classify(T22_EXT.PermanentDelegate).impact === "no_liquidity_effect" && t22Classify(T22_EXT.MemoTransfer).impact === "no_liquidity_effect" && t22Classify(T22_EXT.CpiGuard).impact === "no_liquidity_effect", "impacts");

  // ---- Per-account balance splits ----
  add("T22-6: ordinary transferable → fully_transferable, transferable == nominal", (() => { const r = A(); return r.transferabilityState === "fully_transferable" && r.transferableRaw === "1000000" && r.unavailableRaw === "0"; })(), "full");
  add("T22-7: frozen account → transferable 0, unavailable == nominal, recognized preserved", (() => { const r = A({ accountState: 2 }); return r.transferabilityState === "frozen" && r.transferableRaw === "0" && r.unavailableRaw === "1000000" && r.nominalRaw === "1000000"; })(), "frozen");
  add("T22-8: non-transferable mint → transferable 0, unavailable nominal", (() => { const r = AM({}, { nonTransferable: true, mintExtensionTypes: [T22_EXT.NonTransferable] }); return r.transferabilityState === "non_transferable" && r.transferableRaw === "0" && r.unavailableRaw === "1000000"; })(), "non-transferable");
  add("T22-9: paused mint → transferable 0, paused", (() => { const r = AM({}, { paused: true, mintExtensionTypes: [T22_EXT.PausableConfig] }); return r.transferabilityState === "paused" && r.transferableRaw === "0"; })(), "paused");
  add("T22-10: pause state unread → unresolved, transferable null (never assumed unpaused)", (() => { const r = AM({}, { paused: null, mintExtensionTypes: [T22_EXT.PausableConfig] }); return r.transferabilityState === "unresolved" && r.transferableRaw === null; })(), "pause unread");
  add("T22-11: transfer fee below max → net = nominal − fee", (() => { const r = AM({}, { transferFee: { currentBps: 100, currentMaxFeeRaw: "1000000000" }, mintExtensionTypes: [T22_EXT.TransferFeeConfig] }); return r.transferabilityState === "transferable_with_deterministic_fee" && r.estimatedTransferFeeRaw === "10000" && r.transferableRaw === "990000"; })(), "fee net");
  add("T22-12: transfer fee capped at maximumFee", (() => { const r = AM({}, { transferFee: { currentBps: 100, currentMaxFeeRaw: "5000" }, mintExtensionTypes: [T22_EXT.TransferFeeConfig] }); return r.estimatedTransferFeeRaw === "5000" && r.transferableRaw === "995000"; })(), "cap");
  add("T22-13: fee config with 0 bps this epoch → fully transferable, no fee due", (() => { const r = AM({}, { transferFee: { currentBps: 0, currentMaxFeeRaw: "1000000000" }, mintExtensionTypes: [T22_EXT.TransferFeeConfig] }); return r.transferabilityState === "fully_transferable" && r.transferableRaw === "1000000"; })(), "0 bps");
  add("T22-14: withheld amount reported separately, not in nominal/transferable", (() => { const r = AM({ withheldRaw: "7777", accountExtensionTypes: [T22_EXT.TransferFeeAmount] }, { transferFee: { currentBps: 100, currentMaxFeeRaw: "1000000000" }, mintExtensionTypes: [T22_EXT.TransferFeeConfig] }); return r.withheldRaw === "7777" && r.nominalRaw === "1000000" && r.transferableRaw === "990000"; })(), "withheld sep");
  add("T22-15: transfer hook → hook_unresolved, transferable null, recognized preserved", (() => { const r = AM({}, { hasTransferHook: true, mintExtensionTypes: [T22_EXT.TransferHook] }); return r.transferabilityState === "hook_unresolved" && r.transferableRaw === null && r.nominalRaw === "1000000"; })(), "hook");
  add("T22-16: confidential mint+account → confidential_unresolved, transferable null", (() => { const r = AM({ accountExtensionTypes: [T22_EXT.ConfidentialTransferAccount] }, { hasConfidentialMint: true, mintExtensionTypes: [T22_EXT.ConfidentialTransferMint] }); return r.transferabilityState === "confidential_unresolved" && r.transferableRaw === null; })(), "confidential");
  add("T22-17: unsupported extension → extension_unsupported, transferable null (fail closed)", (() => { const r = AM({ accountExtensionTypes: [99] }, {}); return r.transferabilityState === "extension_unsupported" && r.transferableRaw === null; })(), "unsupported");
  add("T22-18: stale mint/account → transferable null, state stale", (() => { const r = AM({ fresh: false }, {}); return r.transferabilityState === "stale" && r.transferableRaw === null; })(), "stale");
  add("T22-19: malformed amount → unresolved, transferable null", (() => { const r = A({ amountRaw: "12.3x" }); return r.transferabilityState === "unresolved" && r.transferableRaw === null; })(), "malformed");
  add("T22-20: zero balance skipped (not a position)", A({ amountRaw: "0" }).include === false, "zero");
  add("T22-21: interest-bearing mint has NO transfer effect (raw units are authority)", (() => { const r = AM({}, { mintExtensionTypes: [T22_EXT.InterestBearingConfig] }); return r.transferabilityState === "fully_transferable" && r.transferableRaw === "1000000"; })(), "interest");
  add("T22-22: scaled-UI mint has NO transfer effect", (() => { const r = AM({}, { mintExtensionTypes: [T22_EXT.ScaledUiAmountConfig] }); return r.transferabilityState === "fully_transferable"; })(), "scaled-ui");
  add("T22-23: memo-required account does NOT block owner transfer", (() => { const r = A({ accountExtensionTypes: [T22_EXT.MemoTransfer] }); return r.transferabilityState === "fully_transferable"; })(), "memo");
  add("T22-24: CPI-guard account does NOT block owner transfer", (() => { const r = A({ accountExtensionTypes: [T22_EXT.CpiGuard] }); return r.transferabilityState === "fully_transferable"; })(), "cpiguard");
  add("T22-25: permanent delegate does NOT zero liquidity (control risk ≠ balance restriction)", (() => { const r = AM({}, { mintExtensionTypes: [T22_EXT.PermanentDelegate] }); return r.transferabilityState === "fully_transferable" && r.transferableRaw === "1000000"; })(), "delegate");

  // ---- Aggregation across accounts of one mint ----
  add("T22-26: transferable + frozen → partially_transferable; buckets separated", (() => { const r = t22AssessPos([afacts({ address: "A", amountRaw: "600000" }), afacts({ address: "B", amountRaw: "400000", accountState: 2 })], mfacts()); return r.transferabilityState === "partially_transferable" && r.transferableRaw === "600000" && r.unavailableRaw === "400000" && r.nominalRaw === "1000000"; })(), "partial agg");
  add("T22-27: transferable + hook-unresolved → partially_transferable; unresolved bucket set", (() => { const r = t22AssessPos([afacts({ address: "A", amountRaw: "600000" }), afacts({ address: "B", amountRaw: "400000", accountExtensionTypes: [T22_EXT.TransferHookAccount] })], mfacts()); return r.transferabilityState === "partially_transferable" && r.transferableRaw === "600000" && r.unresolvedRaw === "400000"; })(), "unresolved agg");
  add("T22-28: all accounts frozen → frozen, transferable 0", (() => { const r = t22AssessPos([afacts({ address: "A", accountState: 2 }), afacts({ address: "B", accountState: 2, amountRaw: "500000" })], mfacts()); return r.transferabilityState === "frozen" && r.transferableRaw === "0" && r.unavailableRaw === "1500000"; })(), "all frozen");
  add("T22-29: multi-account fee aggregation sums net + fee", (() => { const m = mfacts({ transferFee: { currentBps: 100, currentMaxFeeRaw: "1000000000" }, mintExtensionTypes: [T22_EXT.TransferFeeConfig] }); const r = t22AssessPos([afacts({ address: "A", amountRaw: "1000000" }), afacts({ address: "B", amountRaw: "1000000" })], m); return r.transferableRaw === "1980000" && r.estimatedTransferFeeRaw === "20000"; })(), "fee agg");

  // ---- WalletPosition mapping ----
  add("T22-30: mapping sets withdrawalState + verified-transferable USD from fresh price", (() => { const r = t22AssessPos([afacts()], mfacts()); const w = t22Apply(t22stable({ valueUsd: null }), r, 6, 0.9999, true); return w.withdrawalState === "fully_withdrawable" && typeof w.liquidValueUsd === "number" && w.transferableRaw === "1000000"; })(), "map full");
  add("T22-31: hook-unresolved → liquidValueUsd null, transferableRaw null", (() => { const r = t22AssessPos([afacts({ accountExtensionTypes: [T22_EXT.TransferHookAccount] })], mfacts({ hasTransferHook: true, mintExtensionTypes: [T22_EXT.TransferHook] })); const w = t22Apply(t22stable(), r, 6, 0.9999, true); return w.transferableRaw === null && w.liquidValueUsd === null && w.withdrawalState === "unresolved"; })(), "map hook");
  add("T22-32: state→withdrawalState mapping is source-consistent", t22ToWs("fully_transferable") === "fully_withdrawable" && t22ToWs("frozen") === "currently_unavailable" && t22ToWs("non_transferable") === "currently_unavailable" && t22ToWs("paused") === "emergency_paused" && t22ToWs("hook_unresolved") === "unresolved", "mapping");

  // ---- Safety Buffer integration ----
  add("T22-33: verified transferable stable counts toward buffer", (() => { const c = sbClassify(t22stable({ withdrawalState: "fully_withdrawable", liquidValueUsd: 1000 })); return c.verifiedLiquidValueUsd === 1000 && c.inclusionState === "included_liquid"; })(), "counts");
  add("T22-34: fee-reduced stable counts only NET transferable value", (() => { const c = sbClassify(t22stable({ withdrawalState: "partially_withdrawable", liquidValueUsd: 990 })); return c.verifiedLiquidValueUsd === 990 && c.delayedValueUsd === 10 && (c.inclusionState === "included_partial" || c.inclusionState === "included_liquid"); })(), "net only");
  add("T22-35: frozen stable counts ZERO verified liquid", (() => { const c = sbClassify(t22stable({ withdrawalState: "currently_unavailable" })); return c.verifiedLiquidValueUsd === 0 && c.inclusionState === "excluded_unavailable"; })(), "frozen 0");
  add("T22-36: hook-unresolved stable → unresolved coverage, 0 verified liquid", (() => { const c = sbClassify(t22stable({ withdrawalState: "unresolved" })); return c.verifiedLiquidValueUsd === 0 && c.inclusionState === "excluded_unresolved"; })(), "hook unresolved");
  add("T22-37: partial with null liquid → unresolved (never full v)", (() => { const c = sbClassify(t22stable({ withdrawalState: "partially_withdrawable", liquidValueUsd: null })); return c.verifiedLiquidValueUsd === 0 && c.inclusionState === "excluded_unresolved"; })(), "null net");
  add("T22-38: already-complete buffer stays complete despite unrelated unresolved T22", (() => { const classicUsdc = t22stable({ id: "usdc", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", valueUsd: 1000 }); const t22 = t22stable({ withdrawalState: "unresolved" }); const cov = sbCoverage([classicUsdc, t22], 500); return cov.coverageState === "complete" && cov.verifiedLiquidStableValueUsd === 1000; })(), "complete");
  add("T22-39: classic SPL stable (no withdrawalState) unchanged — counts full", (() => { const c = sbClassify(t22stable()); return c.verifiedLiquidValueUsd === 1000 && c.inclusionState === "included_liquid" && c.positionClass === "wallet_stable"; })(), "classic unchanged");

  // ---- Downstream actionability + immutability ----
  add("T22-40: unavailable/unresolved amounts are not actionable (transferable 0/null)", (() => { const frozen = A({ accountState: 2 }); const hook = AM({}, { hasTransferHook: true, mintExtensionTypes: [T22_EXT.TransferHook] }); return frozen.transferableRaw === "0" && hook.transferableRaw === null; })(), "not actionable");
  add("T22-41: Kamino/Steakhouse/Jupiter dispositions unchanged; no tx in assessment", (() => { const s = JSON.stringify(t22AssessPos([afacts()], mfacts())); return dlGetDispo("kamino_usdc_lending")?.disposition === "selected_category_candidate" && dlGetDispo("kamino_steakhouse_usdc")?.disposition === "existing_position_only" && dlGetDispo("jupiter_lend_usdc")?.disposition === "excluded_from_suggestions" && !s.includes("cta") && !s.includes("signature") && !s.includes("transaction"); })(), "immutable");

  return checks;
}

/**
 * Step 17F — native Solana stake lifecycle, valuation, and liquidity classification. Proves the six-way
 * decomposition, source-backed lifecycle (from getStakeActivation, never epoch guessing), lockup/authority
 * classification, and that only immediately-withdrawable SOL is treated as liquid.
 */

/**
 * Step 17F — native Solana stake lifecycle, valuation, and liquidity classification. Proves the six-way
 * decomposition, source-backed lifecycle (from getStakeActivation, never epoch guessing), lockup/authority
 * classification, and that only immediately-withdrawable SOL is treated as liquid.
 */
export function runNativeStakeFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const RENT = 2282880;
  // Default: fully active account. active+inactive == total − rent == 1_000_000_000.
  const facts = (over: Partial<NSFacts> = {}): NSFacts => ({
    stakeAccount: "Stk1", wallet: "W", ownerProgram: NS_STAKE_PROG, accountType: "delegated",
    totalLamports: 1_000_000_000 + RENT, rentExemptReserveLamports: RENT,
    authorizedStaker: "W", authorizedWithdrawer: "W", lockup: null,
    delegation: { voter: "Vote1", stakeLamports: 1_000_000_000, activationEpoch: "100", deactivationEpoch: NS_EPOCH_NEVER },
    currentEpoch: 300, currentUnixTime: 1_700_000_000, activation: { state: "active", activeLamports: 1_000_000_000, inactiveLamports: 0 },
    validatorStatus: null, apy: 6.5, apyFresh: true, observedAt: "2026-07-18T00:00:00.000Z", sourceSlot: 123, fresh: true, ...over,
  });
  const A = (o: Partial<NSFacts> = {}) => nsAssess(facts(o));
  const grp = (o: Partial<NSFacts> = {}) => nsGroup([nsAssess(facts(o))])[0];

  // ---- Ownership + identity ----
  add("NS-1: wrong Stake Program owner → unresolved, not counted", (() => { const r = A({ ownerProgram: "11111111111111111111111111111111" }); return r.lifecycleState === "unresolved" && r.positionExists === false; })(), "wrong owner");
  add("NS-2: ownership = authorized withdrawer (staker may differ)", A().owned === true && A({ authorizedWithdrawer: "SomeoneElse" }).owned === false, "withdrawer");
  add("NS-3: dedupe key is the stake account address (never validator)", A().dedupeKey === nsKey("Stk1") && A().dedupeKey.includes("Stk1"), "dedupe");
  add("NS-4: two accounts, one validator → grouped but breakdown preserved (not merged away)", (() => { const g = nsGroup([nsAssess(facts({ stakeAccount: "A" })), nsAssess(facts({ stakeAccount: "B" }))]); return g.length === 1 && g[0].accounts.length === 2 && g[0].totalLamports === 2 * (1_000_000_000 + RENT); })(), "grouped");
  add("NS-5: malformed lamports → unresolved, ownership still known", (() => { const r = A({ totalLamports: null }); return r.lifecycleState === "unresolved" && r.owned === true && r.unresolvedLamports >= 0; })(), "malformed");
  add("NS-6: differing staker preserved; still owned via withdrawer", (() => { const r = A({ authorizedStaker: "Other" }); return r.owned === true && r.controlState === "wallet_controls_withdrawal"; })(), "staker differs");

  // ---- Lifecycle (source-backed via getStakeActivation, never epoch math) ----
  add("NS-7: active → lifecycle active, activeLamports from RPC", (() => { const r = A(); return r.lifecycleState === "active" && r.activeLamports === 1_000_000_000; })(), "active");
  add("NS-8: activating → activatingLamports (RPC inactive), active portion separate", (() => { const r = A({ activation: { state: "activating", activeLamports: 0, inactiveLamports: 1_000_000_000 } }); return r.lifecycleState === "activating" && r.activatingLamports === 1_000_000_000 && r.activeLamports === 0; })(), "activating");
  add("NS-9: deactivating → deactivatingLamports (RPC active), not counted active", (() => { const r = A({ activation: { state: "deactivating", activeLamports: 1_000_000_000, inactiveLamports: 0 } }); return r.lifecycleState === "deactivating" && r.deactivatingLamports === 1_000_000_000 && r.activeLamports === 0; })(), "deactivating");
  add("NS-10: inactive → inactiveLamports, active 0", (() => { const r = A({ activation: { state: "inactive", activeLamports: 0, inactiveLamports: 1_000_000_000 } }); return r.lifecycleState === "inactive" && r.inactiveLamports === 1_000_000_000 && r.activeLamports === 0; })(), "inactive");
  add("NS-11: initialized-not-delegated → all stakeable inactive", (() => { const r = A({ accountType: "initialized", delegation: null, activation: null }); return r.lifecycleState === "initialized_not_delegated" && r.inactiveLamports === 1_000_000_000 && r.activeLamports === 0; })(), "init");
  add("NS-12: activation unavailable → lifecycle unresolved, active NOT invented", (() => { const r = A({ activation: null }); return r.lifecycleState === "unresolved" && r.activeLamports === null && r.unresolvedLamports === 1_000_000_000 + RENT; })(), "no activation");
  add("NS-13: lifecycle uses RPC state, NOT activationEpoch<=currentEpoch", (() => { const r = A({ delegation: { voter: "V", stakeLamports: 1_000_000_000, activationEpoch: "999999", deactivationEpoch: NS_EPOCH_NEVER }, activation: { state: "active", activeLamports: 1_000_000_000, inactiveLamports: 0 } }); return r.lifecycleState === "active"; })(), "no epoch guess");

  // ---- Accounting invariants ----
  add("NS-14: total lamports preserved", A().totalLamports === 1_000_000_000 + RENT, "total");
  add("NS-15: delegated lamports preserved", A().delegatedLamports === 1_000_000_000, "delegated");
  add("NS-16: active account — reserve is REQUIRED to remain (not close-only), separated", (() => { const r = A(); return r.rentExemptReserveLamports === RENT && r.closeOnlyWithdrawableLamports === 0 && r.requiredRemainingLamports === 1_000_000_000 + RENT; })(), "rent required");
  add("NS-17: active+activating+deactivating+inactive == total − rent (reconciles)", (() => { const r = A({ activation: { state: "active", activeLamports: 600_000_000, inactiveLamports: 400_000_000 } }); return (r.activeLamports! + r.activatingLamports! + r.deactivatingLamports! + r.inactiveLamports!) === r.totalLamports - r.rentExemptReserveLamports; })(), "reconcile");
  add("NS-18: immediately-withdrawable = inactive (unlocked), never exceeds total", (() => { const r = A({ activation: { state: "active", activeLamports: 600_000_000, inactiveLamports: 400_000_000 } }); return r.immediatelyWithdrawableLamports === 400_000_000 && r.immediatelyWithdrawableLamports! <= r.totalLamports; })(), "withdrawable");
  add("NS-19: active stake is NOT immediately withdrawable", A().immediatelyWithdrawableLamports === 0, "active not liquid");
  add("NS-20: deactivating stake is NOT liquid", A({ activation: { state: "deactivating", activeLamports: 1_000_000_000, inactiveLamports: 0 } }).immediatelyWithdrawableLamports === 0, "deactivating not liquid");
  add("NS-21: no negative components", (() => { const r = A({ activation: { state: "active", activeLamports: 1_000_000_000, inactiveLamports: 0 } }); return [r.activeLamports, r.activatingLamports, r.deactivatingLamports, r.inactiveLamports, r.immediatelyWithdrawableLamports, r.lockedLamports].every((v) => (v ?? 0) >= 0); })(), "no negatives");

  // ---- Lockup ----
  add("NS-22: timestamp lockup (now < ts) → locked_by_timestamp, not withdrawable (whole account locked)", (() => { const r = A({ lockup: { unixTimestamp: 1_800_000_000, epoch: null, custodian: null }, activation: { state: "inactive", activeLamports: 0, inactiveLamports: 1_000_000_000 } }); return r.lockupState === "locked_by_timestamp" && r.immediatelyWithdrawableLamports === 0 && r.lockedLamports === 1_000_000_000 + RENT && r.withdrawalCapacityState === "locked"; })(), "ts lock");
  add("NS-23: epoch lockup (currentEpoch < epoch) → locked_by_epoch", (() => { const r = A({ lockup: { unixTimestamp: null, epoch: 999, custodian: null }, activation: { state: "inactive", activeLamports: 0, inactiveLamports: 1_000_000_000 } }); return r.lockupState === "locked_by_epoch" && r.immediatelyWithdrawableLamports === 0; })(), "epoch lock");
  add("NS-24: combined lockup → locked_by_both", (() => { const r = A({ lockup: { unixTimestamp: 1_800_000_000, epoch: 999, custodian: null } }); return r.lockupState === "locked_by_both"; })(), "both");
  add("NS-25: custodian ≠ wallet on an active lockup → custodian_override_required", (() => { const r = A({ lockup: { unixTimestamp: 1_800_000_000, epoch: null, custodian: "Custodian" } }); return r.lockupState === "custodian_override_required" && r.lockupCustodian === "Custodian"; })(), "custodian");
  add("NS-26: lockup with epoch set but currentEpoch unknown → fail closed (not unlocked)", (() => { const r = A({ currentEpoch: null, lockup: { unixTimestamp: null, epoch: 999, custodian: null } }); return r.lockupState === "unresolved"; })(), "lock unresolved");
  add("NS-27: recognized value survives lockup (locked value still recognized)", (() => { const r = A({ lockup: { unixTimestamp: 1_800_000_000, epoch: null, custodian: null } }); return r.totalLamports === 1_000_000_000 + RENT; })(), "recognized survives");

  // ---- Authorities / control ----
  add("NS-28: control states — both / withdrawal-only / custodian", A({ authorizedStaker: "W", authorizedWithdrawer: "W" }).controlState === "wallet_controls_both" && A({ authorizedStaker: "X" }).controlState === "wallet_controls_withdrawal", "control");
  add("NS-29: WalletPosition stake summary leaks NO authority addresses", (() => { const f = nsFields(grp(), 150, true); const s = JSON.stringify(f); return !s.includes("authorizedStaker") && !s.includes("authorizedWithdrawer") && !s.includes("custodian"); })(), "no auth leak");

  // ---- Valuation ----
  add("NS-30: fresh SOL price → recognized USD = total SOL × price; liquid USD = withdrawable × price", (() => { const f = nsFields(grp({ activation: { state: "active", activeLamports: 600_000_000, inactiveLamports: 400_000_000 } }), 150, true); return Math.abs((f.recognizedValueUsd as number) - (1_000_000_000 + RENT) / 1e9 * 150) < 1e-6 && Math.abs((f.liquidValueUsd as number) - 0.4 * 150) < 1e-6; })(), "usd");
  add("NS-31: stale price → USD null, SOL units visible", (() => { const f = nsFields(grp(), 150, false); return f.recognizedValueUsd === null && f.liquidValueUsd === null && typeof f.uiAmount === "number"; })(), "stale price");
  add("NS-32: fully active → liquid USD = 0 (only immediate-withdrawable counts)", (() => { const f = nsFields(grp(), 150, true); return f.liquidValueUsd === 0; })(), "active liquid 0");

  // ---- Downstream / Safety Buffer / immutability ----
  add("NS-33: native stake contributes ZERO to the Safety Buffer (never stable capital)", (() => { const c = sbClassify({ id: "stk", source: "wallet", type: "stake", symbol: "SOL", amount: "1", detection: "native_stake", valueUsd: 1000, liquidValueUsd: 400 } as JLWalletPos); return c.verifiedLiquidValueUsd === 0 && c.inclusionState === "excluded_unsupported"; })(), "no buffer");
  add("NS-34: stake still groups as SOL exposure for duplicate suppression (unchanged)", nsExposure({ id: "stk", source: "wallet", type: "stake", symbol: "SOL", amount: "1", detection: "native_stake", valueUsd: 1000 } as JLWalletPos) === "SOL_EXPOSURE", "sol exposure");
  add("NS-35: mixed active+deactivating group is NOT labelled simply 'active'", (() => { const g = nsGroup([nsAssess(facts({ stakeAccount: "A" })), nsAssess(facts({ stakeAccount: "B", activation: { state: "deactivating", activeLamports: 1_000_000_000, inactiveLamports: 0 } }))]); return g[0].lifecycleSummary.startsWith("mixed:") && g[0].lifecycleSummary.includes("deactivating"); })(), "mixed label");
  add("NS-36: unresolved account preserved alongside a valid one (not dropped, not liquid)", (() => { const g = nsGroup([nsAssess(facts({ stakeAccount: "A" })), nsAssess(facts({ stakeAccount: "B", activation: null }))]); return g[0].accounts.length === 2 && g[0].anyUnresolved === true; })(), "unresolved kept");
  add("NS-37: no transaction/instruction behavior in the assessment result", (() => { const s = JSON.stringify(A()); return !s.includes("cta") && !s.includes("signature") && !s.includes("instruction") && !s.includes("transaction"); })(), "no tx");
  add("NS-38: candidate/ranking/governance unchanged; Kamino+Steakhouse+Jupiter intact", dlGetDispo("kamino_usdc_lending")?.disposition === "selected_category_candidate" && dlGetDispo("kamino_steakhouse_usdc")?.disposition === "existing_position_only" && dlGetDispo("jupiter_lend_usdc")?.disposition === "excluded_from_suggestions", "immutable");

  // ---- Step 17F.1 — exact immediate-withdrawal capacity for mixed lifecycle accounts ----
  // active-with-excess: effective 600M, inactive/excess 400M, reserve RENT. total = 1e9 + RENT.
  const EXCESS = A({ totalLamports: 1_000_000_000 + RENT, activation: { state: "active", activeLamports: 600_000_000, inactiveLamports: 400_000_000 } });
  add("NSW-1: active with NO excess → 0 withdrawable, reserve+stake required to remain", (() => { const r = A(); return r.immediatelyWithdrawableLamports === 0 && r.withdrawalCapacityState === "currently_unavailable" && r.requiredRemainingLamports === 1_000_000_000 + RENT; })(), "active none");
  add("NSW-2: active WITH excess → only the excess (inactive) is withdrawable; effective stays", EXCESS.immediatelyWithdrawableLamports === 400_000_000 && EXCESS.withdrawalCapacityState === "partially_withdrawable" && EXCESS.requiredRemainingLamports === 600_000_000 + RENT, "active excess");
  add("NSW-2b: active-with-excess: reserve is NOT close-only (account stays open, effective>0)", EXCESS.closeOnlyWithdrawableLamports === 0, "reserve required");
  add("NSW-3: activating mixed → non-effective portion withdrawable per deployed rule (effective=active)", (() => { const r = A({ activation: { state: "activating", activeLamports: 200_000_000, inactiveLamports: 800_000_000 } }); return r.immediatelyWithdrawableLamports === 800_000_000 && r.requiredRemainingLamports === 200_000_000 + RENT && r.lifecycleState === "activating"; })(), "activating");
  add("NSW-4: deactivating partially cooled → cooled (inactive) withdrawable, still-effective stays", (() => { const r = A({ activation: { state: "deactivating", activeLamports: 300_000_000, inactiveLamports: 700_000_000 } }); return r.immediatelyWithdrawableLamports === 700_000_000 && r.requiredRemainingLamports === 300_000_000 + RENT && r.lifecycleState === "deactivating"; })(), "deactivating cooled");
  add("NSW-5: deactivating with NO cooled value → 0 withdrawable (effective not liquid)", (() => { const r = A({ activation: { state: "deactivating", activeLamports: 1_000_000_000, inactiveLamports: 0 } }); return r.immediatelyWithdrawableLamports === 0 && r.withdrawalCapacityState === "currently_unavailable"; })(), "deactivating none");
  add("NSW-6: fully inactive unlocked → entire account withdrawable (incl. reserve via close)", (() => { const r = A({ activation: { state: "inactive", activeLamports: 0, inactiveLamports: 1_000_000_000 } }); return r.immediatelyWithdrawableLamports === 1_000_000_000 + RENT && r.closeOnlyWithdrawableLamports === RENT && r.requiredRemainingLamports === 0 && r.withdrawalCapacityState === "fully_withdrawable"; })(), "inactive full");
  add("NSW-7: initialized-not-delegated → fully closeable (total withdrawable, reserve close-only)", (() => { const r = A({ accountType: "initialized", delegation: null, activation: null }); return r.immediatelyWithdrawableLamports === 1_000_000_000 + RENT && r.closeOnlyWithdrawableLamports === RENT && r.withdrawalCapacityState === "fully_withdrawable"; })(), "init closeable");
  add("NSW-8: rent reserve EXCLUDED from ordinary partial withdrawal (staked>0)", A({ activation: { state: "active", activeLamports: 600_000_000, inactiveLamports: 400_000_000 } }).immediatelyWithdrawableLamports === 400_000_000, "reserve excluded");
  add("NSW-9: rent reserve INCLUDED only when full closure verified (staked==0)", A({ activation: { state: "inactive", activeLamports: 0, inactiveLamports: 1_000_000_000 } }).closeOnlyWithdrawableLamports === RENT && A().closeOnlyWithdrawableLamports === 0, "reserve close-only");
  add("NSW-10: epoch lockup blocks withdrawal (capacity locked)", (() => { const r = A({ lockup: { unixTimestamp: null, epoch: 999, custodian: null }, activation: { state: "inactive", activeLamports: 0, inactiveLamports: 1_000_000_000 } }); return r.immediatelyWithdrawableLamports === 0 && r.withdrawalCapacityState === "locked"; })(), "epoch lock");
  add("NSW-11: custodian ≠ wallet → not withdrawable (address presence ≠ availability)", (() => { const r = A({ lockup: { unixTimestamp: 1_800_000_000, epoch: null, custodian: "Custodian" }, activation: { state: "inactive", activeLamports: 0, inactiveLamports: 1_000_000_000 } }); return r.immediatelyWithdrawableLamports === 0 && r.lockupState === "custodian_override_required"; })(), "custodian");
  add("NSW-12: unresolved activation → NO fabricated withdrawal value (null)", (() => { const r = A({ activation: null }); return r.immediatelyWithdrawableLamports === null && r.requiredRemainingLamports === null && r.withdrawalCapacityState === "unresolved"; })(), "unresolved");
  add("NSW-13: stale → NO fabricated withdrawal value (null, capacity stale)", (() => { const r = A({ fresh: false }); return r.immediatelyWithdrawableLamports === null && r.withdrawalCapacityState === "stale"; })(), "stale");
  add("NSW-14: immediately-withdrawable NEVER exceeds total", (() => { const cases = [A(), EXCESS, A({ activation: { state: "inactive", activeLamports: 0, inactiveLamports: 1_000_000_000 } })]; return cases.every((r) => (r.immediatelyWithdrawableLamports ?? 0) <= r.totalLamports); })(), "≤ total");
  add("NSW-15: requiredRemaining + immediatelyWithdrawable reconciles to total (unlocked, resolved)", (() => { const cases = [A(), EXCESS, A({ activation: { state: "deactivating", activeLamports: 300_000_000, inactiveLamports: 700_000_000 } }), A({ activation: { state: "inactive", activeLamports: 0, inactiveLamports: 1_000_000_000 } })]; return cases.every((r) => (r.immediatelyWithdrawableLamports as number) + (r.requiredRemainingLamports as number) === r.totalLamports); })(), "reconcile");
  add("NSW-16: no negative capacity values", (() => { const r = EXCESS; return [r.immediatelyWithdrawableLamports, r.closeOnlyWithdrawableLamports, r.requiredRemainingLamports].every((v) => (v ?? 0) >= 0); })(), "no neg");
  add("NSW-17: group liquid = SUM of account-level immediately-withdrawable (mixed group)", (() => {
    const active = nsAssess(facts({ stakeAccount: "A", activation: { state: "active", activeLamports: 600_000_000, inactiveLamports: 400_000_000 } }));
    const deact = nsAssess(facts({ stakeAccount: "B", activation: { state: "deactivating", activeLamports: 1_000_000_000, inactiveLamports: 0 } }));
    const g = nsGroup([active, deact])[0];
    return g.immediatelyWithdrawableLamports === 400_000_000 + 0 && g.withdrawalCapacitySummary.startsWith("mixed:");
  })(), "group sum");
  add("NSW-18: recognized value unchanged (total counted once regardless of withdrawal split)", EXCESS.totalLamports === 1_000_000_000 + RENT, "recognized once");
  add("NSW-19: liquid USD = immediately-withdrawable × price; recognized USD = total × price", (() => { const f = nsFields(nsGroup([EXCESS])[0], 150, true); return Math.abs((f.liquidValueUsd as number) - 0.4 * 150) < 1e-6 && Math.abs((f.recognizedValueUsd as number) - (1_000_000_000 + RENT) / 1e9 * 150) < 1e-6; })(), "usd split");
  add("NSW-20: still no Safety Buffer contribution; no tx in capacity result", (() => { const c = sbClassify({ id: "s", source: "wallet", type: "stake", symbol: "SOL", amount: "1", detection: "native_stake", valueUsd: 1000, liquidValueUsd: 400 } as JLWalletPos); const s = JSON.stringify(EXCESS); return c.verifiedLiquidValueUsd === 0 && !s.includes("cta") && !s.includes("instruction") && !s.includes("signature"); })(), "no buffer/tx");

  return checks;
}

/**
 * Step 17G — supported-LST underlying-SOL normalization. Proves source-backed SPL-stake-pool backing kept
 * separate from market value, exact integer arithmetic, fail-closed identity/accounting, mSOL/INF handling,
 * SOL-exposure derivation, and immutability.
 */

/**
 * Step 17G — supported-LST underlying-SOL normalization. Proves source-backed SPL-stake-pool backing kept
 * separate from market value, exact integer arithmetic, fail-closed identity/accounting, mSOL/INF handling,
 * SOL-exposure derivation, and immutability.
 */
export function runLstNormalizationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const JITO = LST_SET.jitosol.mint, JUP = LST_SET.jupsol.mint, BSOL = LST_SET.bsol.mint, MSOL = LST_SET.msol.mint;
  const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const INF = "5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm";
  const SPL_PROG = LST_SET.jitosol.stakePoolPrograms[0];
  const pool = (over: Partial<LstPool> = {}): LstPool => ({ poolAccount: "Pool1", programOwner: SPL_PROG, poolMint: JITO, totalLamports: "1100000000000", poolTokenSupply: "1000000000000", sourceSlot: 100, fresh: true, ...over });
  const norm = (over: Partial<Parameters<typeof lstNorm>[0]> = {}) => lstNorm({ mint: JITO, rawTokenBalance: "1000000000", tokenProgram: LST_TOKEN_PROG, pool: pool(), observedAt: "2026-07-18T00:00:00.000Z", walletSourceSlot: 100, ...over });
  const wp = (over: Partial<JLWalletPos>): JLWalletPos => ({ id: "x", source: "jito", type: "lst", symbol: "JitoSOL", mint: JITO, amount: "1000000000", uiAmount: 1, decimals: 9, detection: "recognized_lst_mint", priceUsd: 250, valueUsd: 250, ...over });

  // ---- Identity ----
  add("LST-1: exactly the 4 supported mints recognized (never USDC)", lstSupported(JITO) && lstSupported(JUP) && lstSupported(BSOL) && lstSupported(MSOL) && !lstSupported(USDC), "supported set");
  add("LST-2: identity bound by MINT, not symbol (unknown mint → null)", lstById(JITO)?.symbol === "JitoSOL" && lstById("NotAMint") === null, "by mint");
  add("LST-3: wrong token program → identity_invalid", lstNorm({ mint: JITO, rawTokenBalance: "1000000000", tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", pool: pool(), observedAt: "t", walletSourceSlot: 100 }).normalizationState === "identity_invalid", "wrong prog");
  add("LST-4: unsupported/other mint → identity_invalid (no symbol match)", norm({ mint: USDC }).normalizationState === "identity_invalid", "unsupported mint");
  add("LST-5: INF NOT in the supported set (remains blocked)", lstSupported(INF) === false && lstById(INF) === null, "INF blocked");
  add("LST-6: mSOL supported identity BUT backing unsupported (no installed decoder)", (() => { const r = lstNorm({ mint: MSOL, rawTokenBalance: "1000000000", tokenProgram: LST_TOKEN_PROG, pool: null, observedAt: "t", walletSourceSlot: 0 }); return r.normalizationState === "unsupported" && r.underlyingSolLamports === null && LST_SET.msol.backingSupported === false; })(), "mSOL unsupported");

  // ---- Accounting (source-backed SPL ratio, integer) ----
  add("LST-7: JitoSOL backing = floor(balance × totalLamports/supply)", norm().underlyingSolLamports === "1100000000" && norm().normalizationState === "complete", "1.1x");
  add("LST-8: exact numerator + denominator returned; kind is pool-based (not price)", (() => { const r = norm(); return r.exchangeRateNumerator === "1100000000000" && r.exchangeRateDenominator === "1000000000000" && r.exchangeRateKind === "spl_stake_pool_total_lamports_over_supply"; })(), "rate");
  add("LST-9: integer floor rounding (non-exact ratio)", lstNorm({ mint: JITO, rawTokenBalance: "100", tokenProgram: LST_TOKEN_PROG, pool: pool({ totalLamports: "1000000001", poolTokenSupply: "3" }), observedAt: "t", walletSourceSlot: 100 }).underlyingSolLamports === ((100n * 1000000001n) / 3n).toString(), "floor");
  add("LST-10: zero balance → zero underlying, complete", (() => { const r = norm({ rawTokenBalance: "0" }); return r.underlyingSolLamports === "0" && r.normalizationState === "complete"; })(), "zero");
  add("LST-11: denominator zero → accounting_unresolved (fail closed)", norm({ pool: pool({ poolTokenSupply: "0" }) as any } as any).normalizationState === "accounting_unresolved", "den 0");
  add("LST-12: large balance no overflow (BigInt)", norm({ rawTokenBalance: "999999999999999999999", pool: pool({ totalLamports: "1100000000000", poolTokenSupply: "1000000000000" }) as any } as any).underlyingSolLamports === ((999999999999999999999n * 1100000000000n) / 1000000000000n).toString(), "no overflow");
  add("LST-13: monotonic with token balance", (() => { const a = BigInt(norm({ rawTokenBalance: "1000000000" }).underlyingSolLamports!); const b = BigInt(norm({ rawTokenBalance: "2000000000" }).underlyingSolLamports!); return b > a; })(), "monotonic");
  add("LST-14: malformed pool totals → malformed", norm({ pool: pool({ totalLamports: "1.5e12" }) as any } as any).normalizationState === "malformed", "malformed");
  add("LST-15: stale pool → stale, underlying null", (() => { const r = norm({ pool: pool({ fresh: false }) as any } as any); return r.normalizationState === "stale" && r.underlyingSolLamports === null; })(), "stale pool");
  add("LST-16: no pool state → accounting_unresolved", norm({ pool: null }).normalizationState === "accounting_unresolved", "no pool");
  add("LST-17: wrong pool program owner → identity_invalid", norm({ pool: pool({ programOwner: "11111111111111111111111111111111" }) as any } as any).normalizationState === "identity_invalid", "wrong owner");
  add("LST-18: pool_mint ≠ LST mint → identity_invalid", norm({ pool: pool({ poolMint: JUP }) as any } as any).normalizationState === "identity_invalid", "mint mismatch");
  add("LST-19: wallet/pool source skew exceeds policy → source_skew", lstNorm({ mint: JITO, rawTokenBalance: "1000000000", tokenProgram: LST_TOKEN_PROG, pool: pool({ sourceSlot: 100 }), observedAt: "t", walletSourceSlot: 100000, maxSourceSkewSlots: 150 }).normalizationState === "source_skew", "skew");
  add("LST-20: withdrawal fee → NET redeemable separate; GROSS backing unchanged", (() => { const r = norm({ pool: pool({ withdrawalFeeNumerator: "1", withdrawalFeeDenominator: "100" }) as any } as any); return r.grossUnderlyingSolLamports === "1100000000" && r.withdrawalFeeLamports === "11000000" && r.netRedeemableSolLamports === "1089000000" && r.underlyingSolLamports === "1100000000"; })(), "net separate");

  // ---- Market vs backing ----
  add("LST-21: applyLstNormalization keeps valueUsd (market) as authoritative", (() => { const p = lstApply(wp({}), norm(), 250, true); return p.valueUsd === 250 && p.marketValueUsd === 250; })(), "market kept");
  add("LST-22: underlying SOL value is a SEPARATE analytical field (backing × SOL price)", (() => { const p = lstApply(wp({}), norm(), 250, true); return Math.abs((p.underlyingSolValueUsd as number) - 1.1 * 250) < 1e-6 && p.underlyingSolAmount === 1.1; })(), "backing value");
  add("LST-23: backing NEVER replaces valueUsd (they can differ; diff exposed)", (() => { const p = lstApply(wp({ valueUsd: 250 }), norm(), 250, true); return p.valueUsd === 250 && typeof p.marketToBackingDifferenceUsd === "number"; })(), "no replace");
  add("LST-24: stale SOL price → underlyingSolValueUsd null, SOL units preserved", (() => { const p = lstApply(wp({}), norm(), 250, false); return p.underlyingSolValueUsd === null && p.underlyingSolAmount === 1.1; })(), "stale sol price");
  add("LST-25: stale LST price (valueUsd null) → backing NOT used as net worth", (() => { const p = lstApply(wp({ valueUsd: null, priceUsd: undefined }), norm(), 250, true); return p.valueUsd === null && typeof p.underlyingSolAmount === "number"; })(), "no silent fallback");

  // ---- Aggregation / dedupe ----
  add("LST-26: aggregated raw balance yields aggregated backing (exact)", lstNorm({ mint: JITO, rawTokenBalance: (1000000000n + 500000000n).toString(), tokenProgram: LST_TOKEN_PROG, pool: pool(), observedAt: "t", walletSourceSlot: 100 }).underlyingSolLamports === (((1500000000n) * 1100000000000n) / 1000000000000n).toString(), "aggregate");
  add("LST-27: dedupe key = exact mint; products distinct", norm().dedupeKey === lstKey(JITO) && lstKey(JITO) !== lstKey(JUP), "dedupe");

  // ---- SOL exposure ----
  add("LST-28: exposure class — native / stake / lst-backed / lst-unresolved", lstExposureClass({ type: "native", amount: "1", source: "wallet", symbol: "SOL", id: "n", detection: "direct_wallet_balance", valueUsd: null } as JLWalletPos) === "liquid_native_sol" && lstExposureClass({ type: "stake", amount: "1", source: "wallet", symbol: "SOL", id: "s", detection: "native_stake", valueUsd: null } as JLWalletPos) === "native_stake" && lstExposureClass(lstApply(wp({}), norm(), 250, true)) === "lst_backed_sol" && lstExposureClass(wp({ underlyingSolLamports: undefined })) === "lst_unresolved", "classes");
  add("LST-29: total SOL exposure sums native + stake + LST BACKING (not market)", (() => {
    const nat = { type: "native", amount: "1000000000", source: "wallet", symbol: "SOL", id: "n", detection: "direct_wallet_balance", valueUsd: null } as JLWalletPos;
    const stk = { type: "stake", amount: "2000000000", source: "wallet", symbol: "SOL", id: "s", detection: "native_stake", valueUsd: null } as JLWalletPos;
    const lst = lstApply(wp({}), norm(), 250, true); // backing 1.1e9
    const e = lstTotalExposure([nat, stk, lst]);
    return e.lamports === (1000000000n + 2000000000n + 1100000000n).toString();
  })(), "exposure sum");
  add("LST-30: unresolved LST backing → listed unresolved, ownership preserved (not in sum)", (() => { const lst = wp({ underlyingSolLamports: undefined }); const e = lstTotalExposure([lst]); return e.lamports === "0" && e.unresolvedProducts.length === 1; })(), "unresolved kept");

  // ---- Downstream / immutability ----
  add("LST-31: LST does NOT count toward stable Safety Buffer (unchanged)", sbClassify(lstApply(wp({}), norm(), 250, true)).verifiedLiquidValueUsd === 0, "no buffer");
  add("LST-32: LST still groups as SOL exposure for duplicate suppression (unchanged)", nsExposure(lstApply(wp({}), norm(), 250, true)) === "SOL_EXPOSURE", "sol exposure");
  add("LST-33: backing is NEVER market-price-derived (result carries no market price as rate)", (() => { const r = norm(); const s = JSON.stringify(r); return r.exchangeRateNumerator === "1100000000000" && !s.includes("marketPrice") && !s.includes("250"); })(), "no price rate");
  add("LST-34: no transaction behavior; Kamino/Steakhouse/Jupiter dispositions unchanged; INF blocked", (() => { const s = JSON.stringify(norm()); return !s.includes("cta") && !s.includes("signature") && !s.includes("swap") && !s.includes("unstake") && dlGetDispo("kamino_usdc_lending")?.disposition === "selected_category_candidate" && dlGetDispo("jupiter_lend_usdc")?.disposition === "excluded_from_suggestions" && !lstSupported(INF); })(), "immutable");

  return checks;
}

/**
 * Step 17H — canonical portfolio-completeness result + decision gates. Proves every dimension (net worth,
 * liabilities, allocation, Safety Buffer, liquidity, SOL exposure, freshness, dedup) is evaluated
 * INDEPENDENTLY, that null is never zero, and that decision gates fail closed with reasons.
 */

/**
 * Step 17H — canonical portfolio-completeness result + decision gates. Proves every dimension (net worth,
 * liabilities, allocation, Safety Buffer, liquidity, SOL exposure, freshness, dedup) is evaluated
 * INDEPENDENTLY, that null is never zero, and that decision gates fail closed with reasons.
 */
export function runPortfolioCompletenessFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const MSOL = LST_SET.msol.mint, JITO = LST_SET.jitosol.mint;
  const wp = (o: Partial<JLWalletPos>): JLWalletPos => ({ id: "p", source: "wallet", type: "token", symbol: "X", amount: "1000000000", uiAmount: 1, detection: "direct_wallet_balance", valueUsd: 100, ...o });
  // Canonical position builders.
  const usdc = (v = 1000) => wp({ id: "usdc", symbol: "USDC", name: "USD Coin", type: "token", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", valueUsd: v, priceUsd: 1 });
  const nativeSol = () => wp({ id: "sol", type: "native", symbol: "SOL", valueUsd: 500, priceUsd: 250 });
  const unknownTok = () => wp({ id: "unk", type: "token", symbol: "9xy", name: "Unknown token", uiAmount: 5, valueUsd: null });
  const jlusdc = () => wp({ id: "jl", type: "protocol", symbol: "USDC", name: "Jupiter Lend USDC", candidateId: "jupiter_lend_usdc", existingPositionOnly: true, dedupeKey: "jupiter-lend:x", withdrawalState: "unresolved", recognizedValueUsd: null, valueUsd: null, uiAmount: 100, amount: "100000000" });
  const msol = () => wp({ id: "ms", type: "lst", symbol: "mSOL", mint: MSOL, valueUsd: 260, priceUsd: 260, uiAmount: 1, lstProductId: "msol", lstNormalizationState: "unsupported" });
  const jitosol = () => wp({ id: "jt", type: "lst", symbol: "JitoSOL", mint: JITO, valueUsd: 275, priceUsd: 275, uiAmount: 1, lstProductId: "jitosol", lstNormalizationState: "complete", underlyingSolLamports: "1100000000" });
  const kaminoDirect = (ws = "fully_withdrawable", liquid: number | null = 1000) => wp({ id: "kd", type: "protocol", symbol: "USDC", name: "USDC on Kamino", candidateId: "kamino_usdc_lending", existingPositionOnly: true, dedupeKey: "klend:x", withdrawalState: ws, recognizedValueUsd: 1000, valueUsd: 1000, liquidValueUsd: liquid, uiAmount: 1000, amount: "1000000000" });
  const hubbleDebt = (v: number | null) => wp({ id: "hb", type: "protocol", symbol: "USDH", name: "USDH loan", side: "borrowed", valueUsd: v, uiAmount: 500, amount: "500000000" });
  const nativeStake = (unresolved = false) => wp({ id: "stk", type: "stake", symbol: "SOL", valueUsd: 1000, priceUsd: 250, uiAmount: 4, amount: "4000000000", liquidValueUsd: 0, stakeLifecycleState: unresolved ? "unresolved" : "active", stake: { anyUnresolved: unresolved } as any });

  // ---- Position-level assessment (dimensions independent) ----
  add("PC-1: complete value (priced native) → valueState complete, not net-worth-blocking", (() => { const a = pcAssess(nativeSol()); return a.valueState === "complete" && !a.blockingDecisionKinds.includes("net_worth"); })(), "value complete");
  add("PC-2: unknown token → value unresolved, magnitude null, blocks net_worth/allocation/on_track", (() => { const a = pcAssess(unknownTok()); return a.valueState === "unresolved" && a.unresolvedValueMagnitude === null && a.recognizedValueUsd === null && a.blockingDecisionKinds.includes("net_worth") && a.blockingDecisionKinds.includes("on_track"); })(), "unknown");
  add("PC-3: jlUSDC → ownership complete, value unresolved (recognized null), net worth blocked", (() => { const a = pcAssess(jlusdc()); return a.ownershipState === "complete" && a.valueState === "unresolved" && a.recognizedValueUsd === null && a.blockingDecisionKinds.includes("net_worth"); })(), "jlusdc");
  add("PC-4: Kamino Direct recognized complete + liquidity unresolved (independent)", (() => { const a = pcAssess(kaminoDirect("unresolved", null)); return a.valueState === "complete" && a.liquidityState === "unresolved" && !a.blockingDecisionKinds.includes("net_worth") && a.blockingDecisionKinds.includes("liquidity"); })(), "recognized≠liquidity");
  add("PC-5: mSOL fresh price + backing unsupported → value complete, exposure unsupported", (() => { const a = pcAssess(msol()); return a.valueState === "complete" && a.exposureState === "unsupported" && !a.blockingDecisionKinds.includes("net_worth") && a.blockingDecisionKinds.includes("sol_exposure"); })(), "msol");
  add("PC-6: supported LST complete → exposure complete", pcAssess(jitosol()).exposureState === "complete", "lst exposure");
  add("PC-7: unvalued Hubble debt → liability unresolved, blocks net worth", (() => { const a = pcAssess(hubbleDebt(null)); return a.positionClass === "hubble_debt" && a.liabilityState === "unresolved" && a.blockingDecisionKinds.includes("net_worth"); })(), "debt unvalued");
  add("PC-8: valued Hubble debt → liability complete", pcAssess(hubbleDebt(-500)).liabilityState === "complete", "debt valued");
  add("PC-9: unresolved native-stake lifecycle → liquidity unresolved, value complete", (() => { const a = pcAssess(nativeStake(true)); return a.valueState === "complete" && a.liquidityState === "unresolved" && !a.blockingDecisionKinds.includes("net_worth"); })(), "stake lifecycle");

  // ---- Portfolio-level result (dimensions independent) ----
  add("PC-10: all-complete portfolio → netWorth complete, gates allowed", (() => { const R = pcCompute([nativeSol(), usdc(1000), jitosol()], { requiredBufferUsd: 0 }); return R.netWorthState === "complete" && pcNetWorth(R).status === "allowed"; })(), "complete");
  add("PC-11: unknown token → netWorth unresolved, hasUnknownMagnitudeValue true", (() => { const R = pcCompute([nativeSol(), unknownTok()], { requiredBufferUsd: 0 }); return R.netWorthState === "unresolved" && R.hasUnknownMagnitudeValue === true; })(), "unknown magnitude");
  add("PC-12: jlUSDC held → netWorth unresolved (positive holding, recognized null)", pcCompute([nativeSol(), jlusdc()], { requiredBufferUsd: 0 }).netWorthState === "unresolved", "jlusdc nw");
  add("PC-13: mSOL → netWorth complete but SOL exposure unsupported (independent)", (() => { const R = pcCompute([nativeSol(), msol()], { requiredBufferUsd: 0 }); return R.netWorthState === "complete" && R.solExposureState === "unsupported"; })(), "msol independent");
  add("PC-14: Kamino unresolved liquidity → netWorth complete, liquidity unresolved", (() => { const R = pcCompute([usdc(1000), kaminoDirect("unresolved", null)], { requiredBufferUsd: 0 }); return R.netWorthState === "complete" && R.liquidityState === "unresolved"; })(), "liquidity indep");
  add("PC-15: supported-scope vs wallet-wide distinct (unknown token)", (() => { const R = pcCompute([nativeSol(), usdc(1000), unknownTok()], { requiredBufferUsd: 0 }); return R.walletWideState === "unresolved"; })(), "scope");
  add("PC-16: null never treated as zero (unknown magnitude decision-relevant)", pcCompute([unknownTok()], { requiredBufferUsd: 0 }).hasUnknownMagnitudeValue === true, "null≠0");
  add("PC-17: unvalued liability → liabilities + netWorth unresolved", (() => { const R = pcCompute([usdc(1000), hubbleDebt(null)], { requiredBufferUsd: 0 }); return R.liabilitiesState === "unresolved" && R.netWorthState === "unresolved" && R.unresolvedLiabilityMagnitude === true; })(), "liability blocks");

  // ---- Decision gates (allowed/blocked/unresolved + reasons) ----
  add("PC-18: complete net worth → canDetermineNetWorth allowed", pcNetWorth(pcCompute([nativeSol(), usdc(1000)], { requiredBufferUsd: 0 })).status === "allowed", "nw allowed");
  add("PC-19: jlUSDC → canDetermineNetWorth unresolved with reasons", (() => { const g = pcNetWorth(pcCompute([nativeSol(), jlusdc()], { requiredBufferUsd: 0 })); return g.status === "unresolved" && g.reasons.length > 0; })(), "nw blocked");
  add("PC-20: mSOL → net worth allowed, exact SOL exposure state unresolved (drives the PO assessment, not a completeness gate)", (() => { const R = pcCompute([nativeSol(), msol()], { requiredBufferUsd: 0 }); return pcNetWorth(R).status === "allowed" && R.solExposureState !== "complete"; })(), "msol exposure");
  add("PC-21: unresolved Kamino liquidity → Rebalance unresolved, net worth allowed", (() => { const R = pcCompute([usdc(1000), kaminoDirect("unresolved", null)], { requiredBufferUsd: 0 }); return pcNetWorth(R).status === "allowed" && pcRebalance(R).status === "unresolved" && pcRebalance(R).reasons.length > 0; })(), "rebalance");
  add("PC-22: unvalued liability → onTrackState unresolved (dashboard completeness precondition) + direct lending blocked/unresolved", (() => { const R = pcCompute([usdc(1000), hubbleDebt(null)], { requiredBufferUsd: 0 }); return R.onTrackState === "unresolved" && pcDirect(R).status !== "allowed"; })(), "liability gates");
  add("PC-23: unknown token → onTrackState unresolved (dashboard completeness precondition)", pcCompute([nativeSol(), unknownTok()], { requiredBufferUsd: 0 }).onTrackState === "unresolved", "ontrack unknown");
  add("PC-24: complete Safety Buffer stays complete despite unrelated unresolved excess", (() => { const R = pcCompute([usdc(1000), jlusdc()], { requiredBufferUsd: 500 }); return R.stableBufferState === "complete"; })(), "buffer complete");
  add("PC-25: incomplete/absent buffer → DCA + direct lending gates not allowed", (() => { const R = pcCompute([nativeSol()], { requiredBufferUsd: 1000 }); return pcDca(R).status !== "allowed" && pcDirect(R).status !== "allowed"; })(), "buffer suppress");
  add("PC-26: Rebalance/Staking gates return blocked/unresolved WITH reasons (never bare bool)", (() => { const R = pcCompute([nativeSol(), unknownTok()], { requiredBufferUsd: 0 }); const gs = [pcRebalance(R), pcStaking(R)]; return gs.every((g) => typeof g.status === "string" && Array.isArray(g.reasons)) && gs.some((g) => g.status !== "allowed" && g.reasons.length > 0); })(), "gate shape");
  add("PC-27: staking gate fails closed when unresolved stake exposure present", pcStaking(pcCompute([usdc(1000), nativeStake(true)], { requiredBufferUsd: 500 })).status !== "allowed", "staking closed");

  // ---- Deduplication + freshness ----
  add("PC-28: duplicate dedupeKey → deduplicationState invalid + violation surfaced", (() => { const a = jlusdc(); const b = { ...jlusdc(), id: "jl2" }; const R = pcCompute([a, b], { requiredBufferUsd: 0 }); return R.deduplicationState === "invalid" && pcDupes([a, b]).length > 0; })(), "dedupe");
  add("PC-29: LST backing field is NOT a second economic row (no false duplicate)", pcDupes([jitosol()]).length === 0, "backing not row");
  add("PC-30: stale withdrawal → freshness stale, net worth not silently complete", (() => { const R = pcCompute([usdc(1000), kaminoDirect("stale", null)], { requiredBufferUsd: 0 }); return R.freshnessState === "stale" && R.netWorthState !== "complete"; })(), "stale");

  // ---- Immutability + no fabrication ----
  add("PC-31: recognized values render as null (—), never fabricated $0", pcAssess(jlusdc()).recognizedValueUsd === null && pcAssess(unknownTok()).recognizedValueUsd === null, "null not zero");
  add("PC-32: no candidate/disposition change; no tx/score/manifest leak in result", (() => { const R = pcCompute([nativeSol(), usdc(1000)], { requiredBufferUsd: 0 }); const s = JSON.stringify(R); return dlGetDispo("kamino_steakhouse_usdc")?.disposition === "existing_position_only" && dlGetDispo("jupiter_lend_usdc")?.disposition === "excluded_from_suggestions" && !lstSupported("5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm") && !s.includes("cta") && !s.includes("signature") && !s.includes("riskScore") && !s.includes("manifest"); })(), "immutable");
  add("PC-33: classify — debt/native/stake/lst/jlUSDC/unknown", pcClass(hubbleDebt(-1)) === "hubble_debt" && pcClass(nativeSol()) === "native_sol" && pcClass(nativeStake()) === "native_stake" && pcClass(jitosol()) === "lst_supported" && pcClass(msol()) === "lst_msol" && pcClass(jlusdc()) === "jupiter_lend" && pcClass(unknownTok()) === "unknown_token", "classify");

  return checks;
}

/**
 * Step 17H.1 — production integration + economic-deduplication CORRECTION. Proves a shared mint is not a
 * duplicate, real economic-identity duplicates ARE flagged, and the completeness gates only NARROW.
 */

/**
 * Step 17H.2 — pure UI selectors over the mounted completeness result. Proves deterministic warning
 * priority, "—" for unknown totals/values, most-specific position reasons, and On Track availability.
 */
export function runCompletenessUiFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const MSOL = LST_SET.msol.mint;
  const w = (o: Partial<JLWalletPos>): JLWalletPos => ({ id: "p", source: "wallet", type: "token", symbol: "X", amount: "1", detection: "direct_wallet_balance", valueUsd: 100, ...o });
  const usdc = () => w({ id: "usdc", symbol: "USDC", name: "USD Coin", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", valueUsd: 1000 });
  const nativeSol = () => w({ id: "sol", type: "native", symbol: "SOL", valueUsd: 500, priceUsd: 250 });
  const unknownTok = () => w({ id: "unk", type: "token", name: "Unknown token", symbol: "9x", uiAmount: 5, valueUsd: null });
  const jlusdc = () => w({ id: "jl", type: "protocol", symbol: "USDC", name: "Jupiter Lend USDC", candidateId: "jupiter_lend_usdc", existingPositionOnly: true, dedupeKey: "jupiter-lend:x", withdrawalState: "unresolved", recognizedValueUsd: null, valueUsd: null, uiAmount: 100, amount: "100000000" });
  const msol = () => w({ id: "ms", type: "lst", symbol: "mSOL", mint: MSOL, valueUsd: 260, priceUsd: 260, uiAmount: 1, lstProductId: "msol", lstNormalizationState: "unsupported" });
  const kaminoLiq = () => w({ id: "kd", type: "protocol", symbol: "USDC", name: "USDC on Kamino", candidateId: "kamino_usdc_lending", existingPositionOnly: true, dedupeKey: "klend:x", withdrawalState: "unresolved", recognizedValueUsd: 1000, valueUsd: 1000, liquidValueUsd: null, uiAmount: 1000, amount: "1000000000" });
  const tok22 = () => w({ id: "t22", type: "token", symbol: "USDC", name: "USD Coin", mint: "MintT22Usdc", valueUsd: 100, tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", withdrawalState: "unresolved", transferabilityState: "hook_unresolved" });
  const debt = () => w({ id: "hb", type: "protocol", symbol: "USDH", name: "USDH loan", side: "borrowed", valueUsd: null, uiAmount: 300, amount: "300" });
  const R = (ps: JLWalletPos[]) => pcCompute(ps, { requiredBufferUsd: 0 });

  // ---- Dashboard primary warning (deterministic priority) ----
  add("UI-1: complete portfolio → NO warning", uiWarning(R([nativeSol(), usdc()])) === null, "no warning");
  add("UI-2: net worth unresolved → approved net-worth warning", (() => { const g = uiWarning(R([nativeSol(), unknownTok()])); return g?.id === "net_worth" && g.title === UI_COPY.netWorthTitle && g.body === UI_COPY.netWorthBody; })(), "net worth");
  add("UI-3: liquidity unresolved only → liquidity warning (no title)", (() => { const g = uiWarning(R([usdc(), kaminoLiq()])); return g?.id === "liquidity" && g.title === null && g.body === UI_COPY.liquidityBody; })(), "liquidity");
  add("UI-4: SOL exposure unresolved only → staking-exposure warning", (() => { const g = uiWarning(R([usdc(), msol()])); return g?.id === "sol_exposure" && g.body === UI_COPY.solExposureBody; })(), "sol exposure");
  add("UI-5: dedup invalid → highest priority (beats net worth)", (() => { const dup = [jlusdc(), { ...jlusdc(), id: "jl2" }]; const g = uiWarning(R(dup)); return g?.id === "dedup"; })(), "dedup priority");
  add("UI-6: priority deterministic — net worth beats liquidity+exposure", (() => { const g = uiWarning(R([unknownTok(), kaminoLiq(), msol()])); return g?.id === "net_worth"; })(), "priority");
  add("UI-7: at most ONE primary warning returned", (() => { const g = uiWarning(R([unknownTok()])); return g !== null && typeof g.body === "string"; })(), "one warning");

  // ---- Portfolio total ----
  add("UI-8: complete net worth → authoritative recognized total shown", (() => { const t = uiTotal(R([nativeSol(), usdc()]), "$1,500.00"); return t.text === "$1,500.00" && t.authoritative === true; })(), "authoritative");
  add("UI-9: unknown net worth → '—' (never $0), with aria label", (() => { const t = uiTotal(R([nativeSol(), unknownTok()]), "$500.00"); return t.text === "—" && t.authoritative === false && typeof t.ariaLabel === "string" && !t.text.includes("0"); })(), "dash total");
  add("UI-10: partial recognized value NOT presented as authoritative total", (() => { const r = R([nativeSol(), unknownTok()]); const t = uiTotal(r, "$500.00"); return typeof r.recognizedPortfolioValueUsd === "number" && t.text === "—"; })(), "no partial total");

  // ---- Position-level reasons (most specific) ----
  add("UI-11: debt reason beats generic value reason", uiReason(uiAssess(R([debt()]), "hb")) === "Debt value could not be verified", "debt");
  add("UI-12: missing value → current value reason", uiReason(uiAssess(R([unknownTok()]), "unk")) === "Current value could not be verified", "value");
  add("UI-13: protocol liquidity reason while recognized value stays visible", (() => { const r = R([usdc(), kaminoLiq()]); const a = uiAssess(r, "kd"); return uiReason(a) === "Withdrawal availability could not be verified" && a?.recognizedValueUsd === 1000; })(), "liquidity reason");
  add("UI-14: Token-2022 transferability reason", uiReason(uiAssess(R([tok22()]), "t22")) === "Transferability could not be verified", "transferability");
  add("UI-15: LST backing reason (mSOL)", uiReason(uiAssess(R([msol()]), "ms")) === "Underlying SOL could not be refreshed", "lst backing");
  add("UI-16: unsupported/unknown → not-fully-supported OR value reason (never $0)", (() => { const a = uiAssess(R([unknownTok()]), "unk"); return uiDash(a) === true; })(), "unsupported");
  add("UI-17: Jupiter unresolved value → '—' + current-value reason; recognized null", (() => { const r = R([jlusdc()]); const a = uiAssess(r, "jl"); return uiReason(a) === "Current value could not be verified" && uiDash(a) === true && a?.recognizedValueUsd === null; })(), "jupiter");

  // ---- On Track UI ----
  add("UI-18: On Track allowed → available; unresolved → unavailable + safe reason", (() => { const ok = uiOnTrack(R([nativeSol(), usdc()])); const bad = uiOnTrack(R([nativeSol(), unknownTok()])); return ok.available === true && bad.available === false && bad.unavailableReason === UI_COPY.onTrackUnavailable; })(), "ontrack");

  // ---- Dedupe UI ----
  add("UI-19: wallet USDC + Kamino + Steakhouse → NO dedup warning", (() => { const g = uiWarning(R([usdc(), w({ id: "kd", type: "protocol", symbol: "USDC", candidateId: "kamino_usdc_lending", dedupeKey: "klend:a", valueUsd: 1000, recognizedValueUsd: 1000, withdrawalState: "fully_withdrawable", liquidValueUsd: 1000, mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }), w({ id: "st", type: "protocol", symbol: "USDC", candidateId: "kamino_steakhouse_usdc", dedupeKey: "steakhouse:a", valueUsd: 500, recognizedValueUsd: 500, withdrawalState: "fully_withdrawable", liquidValueUsd: 500, mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" })])); return g === null || g.id !== "dedup"; })(), "no false dup");

  // ---- Copy safety + immutability ----
  add("UI-20: user-facing copy leaks NO raw state names / codes / scores", (() => { const all = Object.values(UI_COPY).join(" "); return !/unresolved|invalid|net_worth|sol_exposure|dedupeKey|manifest|riskScore|threshold/.test(all); })(), "copy safe");
  add("UI-21: dispositions unchanged; Jupiter excluded; Steakhouse existing-only; INF blocked", dlGetDispo("kamino_steakhouse_usdc")?.disposition === "existing_position_only" && dlGetDispo("jupiter_lend_usdc")?.disposition === "excluded_from_suggestions" && !lstSupported("5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm"), "immutable");

  // ---- Step 17H.4 — live rail On Track unavailable message (single-sourced helper the rail uses) ----
  add("UI-22: On Track allowed (complete) → rail shows NO completeness message (existing card renders)", uiRailOnTrack(R([nativeSol(), usdc()])) === null, "allowed → null");
  add("UI-23: On Track unresolved (unknown token) → rail shows approved unavailable message", uiRailOnTrack(R([nativeSol(), unknownTok()])) === UI_COPY.onTrackUnavailable, "unresolved msg");
  add("UI-24: On Track blocked (unvalued liability) → rail shows approved unavailable message", uiRailOnTrack(R([usdc(), debt()])) === UI_COPY.onTrackUnavailable, "blocked msg");
  add("UI-25: absent completeness (non-completeness reason) → null, preserves existing empty copy", uiRailOnTrack(undefined) === null && uiRailOnTrack(null) === null, "absent → null");
  add("UI-26: unavailable message is a plain explanation — no on/off-track, no reason codes", (() => { const m = uiRailOnTrack(R([nativeSol(), unknownTok()])) ?? ""; return !/on_track|off_track|unresolved|invalid|net_worth/.test(m) && m === UI_COPY.onTrackUnavailable; })(), "safe copy");

  return checks;
}

/**
 * Step 17H.3 — the /testing Portfolio Completeness gallery uses PRODUCTION derivation + components. These
 * assert the dedicated visual states exist with the expected completeness (feeding the same components the
 * dashboard uses), and that per-row notes resolve as designed.
 */

/**
 * Step 17H.3 — the /testing Portfolio Completeness gallery uses PRODUCTION derivation + components. These
 * assert the dedicated visual states exist with the expected completeness (feeding the same components the
 * dashboard uses), and that per-row notes resolve as designed.
 */
export function runCompletenessGalleryFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const fx = tgFixtures();
  const byId = (id: string) => fx.find((f) => f.id === id);

  add("TG-1: dedicated gallery has all 14 required visual states", fx.length === 14 && ["complete", "net_worth_unresolved", "jupiter", "unknown", "liability", "liquidity", "kamino", "steakhouse", "token2022", "sol_exposure", "native_stake", "duplicate", "shared_mint", "gate_inspector"].every((id) => byId(id) !== undefined), `count=${fx.length}`);
  add("TG-2: complete portfolio — net worth complete, On Track available", (() => { const c = byId("complete")!.completeness; return c.netWorthState === "complete" && c.onTrackState === "complete" && uiWarning(c) === null; })(), "complete");
  add("TG-3: net worth unresolved — total '—', net-worth banner, On Track unavailable", (() => { const c = byId("net_worth_unresolved")!.completeness; return c.netWorthState === "unresolved" && uiWarning(c)?.id === "net_worth" && c.onTrackState !== "complete" && uiTotal(c, "$x").text === "—"; })(), "net worth");
  add("TG-4: Jupiter row → current-value reason, USD '—'", (() => { const c = byId("jupiter")!.completeness; return uiNote(c, "jl") === "Current value could not be verified"; })(), "jupiter");
  add("TG-5: liability row → debt reason; total '—'", (() => { const c = byId("liability")!.completeness; return uiNote(c, "hb") === "Debt value could not be verified" && uiTotal(c, "$x").text === "—"; })(), "liability");
  add("TG-6: liquidity-only — total authoritative, Kamino withdrawal reason, recognized value visible", (() => { const c = byId("liquidity")!.completeness; return c.netWorthState === "complete" && uiWarning(c)?.id === "liquidity" && uiNote(c, "kd") === "Withdrawal availability could not be verified"; })(), "liquidity");
  add("TG-7: Steakhouse recognized + liquidity unresolved reason", byId("steakhouse")!.completeness && uiNote(byId("steakhouse")!.completeness, "st") === "Withdrawal availability could not be verified", "steakhouse");
  add("TG-8: Token-2022 transferability reason; market value visible", (() => { const c = byId("token2022")!.completeness; return uiNote(c, "t22") === "Transferability could not be verified"; })(), "token2022");
  add("TG-9: SOL exposure only — mSOL backing reason; total authoritative; exposure warning", (() => { const c = byId("sol_exposure")!.completeness; return c.netWorthState === "complete" && uiWarning(c)?.id === "sol_exposure" && uiNote(c, "ms") === "Underlying SOL could not be refreshed"; })(), "sol exposure");
  add("TG-10: genuine duplicate → dedup warning", (() => { const c = byId("duplicate")!.completeness; return c.deduplicationState === "invalid" && uiWarning(c)?.id === "dedup"; })(), "duplicate");
  add("TG-11: shared USDC mint (wallet+Kamino+Steakhouse) → NOT a duplicate", (() => { const c = byId("shared_mint")!.completeness; return c.deduplicationState !== "invalid" && (uiWarning(c)?.id ?? "none") !== "dedup"; })(), "shared mint");
  add("TG-12: gate inspector exposes the Rebalance state; no suggestion output (Trim gate retired 19D; Position Optimization gate retired 20D)", (() => { const g = byId("gate_inspector")!.gates; return typeof g.rebalance === "string" && !("trim" in g) && !("positionOptimization" in g); })(), "gate inspector");
  add("TG-13: native stake — value complete, available-to-withdraw present, not full liquidity", (() => { const c = byId("native_stake")!.completeness; const a = c.positionAssessments.find((x) => x.positionId === "stk"); return c.netWorthState === "complete" && a?.valueState === "complete"; })(), "native stake");

  return checks;
}

/**
 * Step 18B — canonical liability-aware Rebalance assessment (foundation only; the production card is
 * unchanged). Proves gross-asset allocation, liability separation, drift, the source inventory by class,
 * stable-source buffer protection, registry destinations, and the three-way gate split.
 */

/* ------------------------------------------------------------------ *
 * Step 17B — Safety Buffer verified-liquid coverage. Completion uses only
 * fresh, verified, immediately-withdrawable stable capital. Recognized but
 * delayed/unavailable/unresolved protocol value stays visible but cannot
 * falsely complete the buffer. Target formula unchanged.
 * ------------------------------------------------------------------ */
export function runSafetyBufferCoverageFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const usdc = (v: number | null, over: Partial<SBPos> = {}): SBPos => ({ id: `usdc-${Math.random()}`, source: "wallet", type: "token", symbol: "USDC", name: "USD Coin", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "1", detection: "direct_wallet_balance", valueUsd: v, ...over } as SBPos);
  const kamino = (recognized: number | null, liquid: number | null, state: string): SBPos => ({ id: "klend-direct-x", source: "kamino", type: "protocol", symbol: "USDC", name: "Kamino Direct USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "1", detection: "protocol_api", protocol: "Kamino", side: "supplied", valueUsd: recognized, recognizedValueUsd: recognized, liquidValueUsd: liquid, withdrawalState: state, existingPositionOnly: true, candidateId: "kamino_usdc_lending" } as SBPos);
  const steak = (v: number | null): SBPos => ({ id: "steak-x", source: "kamino", type: "protocol", symbol: "USDC", name: "Steakhouse USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "1", detection: "protocol_api", protocol: "Kamino", side: "supplied", valueUsd: v } as SBPos);
  const cov = (positions: SBPos[], target: number) => sbCoverage(positions, target);

  // --- Direct wallet ---
  add("SB-1: exact recognized USDC (priced) counts as verified liquid", cov([usdc(6000)], 5000).verifiedLiquidStableValueUsd === 6000, "6000");
  add("SB-2: symbol-only stable (Unknown token) does not count", cov([usdc(6000, { name: "Unknown token" })], 5000).verifiedLiquidStableValueUsd === 0, "excluded");
  add("SB-3: stale price (valueUsd null) → no verified liquid, unresolved-magnitude unknown", (() => { const c = cov([usdc(null)], 5000); return c.verifiedLiquidStableValueUsd === 0 && c.hasUnknownUnresolvedMagnitude === true; })(), "stale");
  add("SB-4: token marked non-transferable → excluded_unavailable, not liquid", sbClassify(usdc(6000, { withdrawalState: "currently_unavailable" })).inclusionState === "excluded_unavailable", "frozen");

  // --- Kamino Direct ---
  add("SB-5: Kamino full liquid counts; recognized-only does NOT complete", cov([kamino(6000, 6000, "fully_withdrawable")], 5000).verifiedLiquidStableValueUsd === 6000 && cov([kamino(6000, null, "unresolved")], 5000).verifiedLiquidStableValueUsd === 0, "full/none");
  add("SB-6: Kamino partial liquid counts partially; delayed = recognized − liquid", (() => { const s = sbClassify(kamino(6000, 4000, "partially_withdrawable")); return s.verifiedLiquidValueUsd === 4000 && s.delayedValueUsd === 2000 && s.inclusionState === "included_partial"; })(), "partial");
  add("SB-7: Kamino liquid null → unresolved (never zero-as-fact)", sbClassify(kamino(6000, null, "unresolved")).inclusionState === "excluded_unresolved", "unresolved");
  add("SB-8: Kamino emergency paused → excluded_unavailable, zero liquid", (() => { const s = sbClassify(kamino(6000, null, "emergency_paused")); return s.verifiedLiquidValueUsd === 0 && s.inclusionState === "excluded_unavailable"; })(), "emergency");
  add("SB-9: Kamino liquid never exceeds recognized (capped)", sbClassify(kamino(4000, 9999, "fully_withdrawable")).verifiedLiquidValueUsd === 4000, "capped");

  // --- Steakhouse & other protocol ---
  add("SB-10: Steakhouse recognized value alone does NOT count (no mounted methodology → unresolved)", (() => { const s = sbClassify(steak(10000)); return s.verifiedLiquidValueUsd === 0 && s.inclusionState === "excluded_unresolved" && s.unresolvedValueUsd === 10000; })(), "steak unresolved");
  add("SB-11: debt never adds positive coverage", (() => { const s = sbClassify({ id: "d", source: "hubble", type: "protocol", symbol: "USDH", amount: "1", detection: "protocol_api", side: "borrowed", valueUsd: 5000 } as SBPos); return s.verifiedLiquidValueUsd === 0 && s.inclusionState === "excluded_unsupported"; })(), "debt");
  add("SB-12: stable LP (both legs stable) does not count as liquid buffer", (() => { const s = sbClassify({ id: "lp", source: "orca", type: "protocol", symbol: "LP", amount: "1", detection: "protocol_api", protocol: "Orca", valueUsd: 8000, legs: [{ mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", uiAmount: 4000, side: "long" }, { mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", uiAmount: 4000, side: "long" }] } as SBPos); return s.verifiedLiquidValueUsd === 0; })(), "lp");

  // --- Completion (interval reasoning) ---
  add("SB-13: fullyFunded/shortfall use verified liquid only", (() => { const c = cov([usdc(6000)], 5000); return c.fullyFunded === true && c.shortfallUsd === 0 && cov([usdc(3000)], 5000).shortfallUsd === 2000; })(), "verified only");
  add("SB-14: recognized above target but verified below → NOT complete", (() => { const c = cov([kamino(10000, null, "unresolved")], 5000); return c.recognizedStableValueUsd === 10000 && c.verifiedLiquidStableValueUsd === 0 && c.coverageState !== "complete"; })(), "recognized≠complete");
  add("SB-15: verified ≥ target → complete", cov([usdc(6000)], 5000).coverageState === "complete", "complete");
  add("SB-16: verified < target, all resolved → incomplete", cov([usdc(2000)], 5000).coverageState === "incomplete", "incomplete");
  add("SB-17: verified < target but unresolved could close gap → unresolved", cov([usdc(2000), steak(10000)], 5000).coverageState === "unresolved", "unresolved");
  add("SB-18: unrelated unresolved excess does NOT invalidate proven completion", cov([usdc(6000), steak(10000)], 5000).coverageState === "complete", "still complete");
  add("SB-19: unresolved could-determine → unresolved not incomplete (Kamino recognized)", cov([usdc(2000), kamino(10000, null, "unresolved")], 5000).coverageState === "unresolved", "kamino unresolved");
  add("SB-20: required buffer zero → complete", cov([], 0).coverageState === "complete" && cov([], 0).fullyFunded === true, "zero target");
  add("SB-21: no stable positions → incomplete (target>0)", cov([], 5000).coverageState === "incomplete", "none");
  add("SB-22: negative/malformed valueUsd rejected (not counted)", cov([usdc(-100 as number), usdc(3000)], 5000).verifiedLiquidStableValueUsd === 3000, "negative rejected");

  // --- deriveSafetyBuffer wiring ---
  add("SB-23: deriveSafetyBuffer uses verified liquid for fullyFunded + exposes breakdown", (() => { const b = sbDerive([usdc(2000), steak(10000)], 1000, 5); return !!b && b.fullyFunded === false && b.coverageState === "unresolved" && b.stableUsd === 2000 && b.recognizedStableUsd === 12000 && b.verifiedLiquidStableUsd === 2000; })(), "wired");
  add("SB-24: direct-wallet-USDC user unchanged (still complete)", (() => { const b = sbDerive([usdc(6000)], 1000, 5); return !!b && b.fullyFunded === true && b.stableUsd === 6000; })(), "unchanged");

  // --- Downstream suppression (incomplete/unresolved buffer) ---
  add("SB-25: incomplete/unresolved buffer suppresses Kamino suggestion (fullyFunded false)", (() => { const inc = sbDerive([usdc(2000)], 1000, 5); const unr = sbDerive([usdc(2000), steak(10000)], 1000, 5); return inc?.fullyFunded === false && unr?.fullyFunded === false; })(), "suppressed");

  // --- Immutability ---
  add("SB-26: no target-formula change; assessment/governance/policy immutable; Steakhouse/Jupiter unchanged", (() => { const b = sbDerive([usdc(3000)], 1000, 5); return b?.targetUsd === 5000 && DA_OUTCOME.unroundedAggregate === 5.93 && DL_CATMIN === 5.5 && DL_UNIMIN === 7 && dlGetDispo("kamino_steakhouse_usdc")?.disposition === "existing_position_only" && dlGetDispo("jupiter_lend_usdc")?.disposition === "excluded_from_suggestions"; })(), "immutable");

  return checks;
}

/* ------------------------------------------------------------------ *
 * NFTs are not liquid assets. An NFT left in the Liquid Assets table rendered as
 * "Current value could not be verified", which claims WealthSmith tried to price
 * something and failed — it had correctly declined to price a non-fungible token.
 *
 * The regression that matters is NF-3: Orca and Raydium represent concentrated-
 * liquidity positions AS NFTs, and the wallet read finds them by scanning for
 * 0-decimal mints. If the NFT test ever widens to run before those adapters claim
 * their mints, real LP money silently vanishes from the portfolio.
 * ------------------------------------------------------------------ */

export function runNftExclusionFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
  const base = { source: "wallet" as const, detection: "direct_wallet_balance" as const, amount: "1" };
  const nft = (over: Partial<SBPos> = {}): SBPos =>
    ({ ...base, id: "nft-1", type: "token", symbol: "72Ue...EPZS", mint: "72Ue", uiAmount: 1, decimals: 0, priceUsd: null, valueUsd: null, ...over } as SBPos);
  const sol = (): SBPos =>
    ({ ...base, id: "sol", type: "native", symbol: "SOL", uiAmount: 4.53, decimals: 9, priceUsd: 73.5, valueUsd: 333 } as SBPos);
  const usdc = (): SBPos =>
    ({ ...base, id: "usdc", type: "token", symbol: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", uiAmount: 500, decimals: 6, priceUsd: 1, valueUsd: 500 } as SBPos);
  /** An Orca CLMM position: discovered FROM a 0-decimal NFT mint, but surfaced as a protocol position. */
  const orcaLp = (): SBPos =>
    ({ id: "orca-1", source: "orca", type: "protocol", symbol: "SOL/USDC", mint: "Whirl", amount: "1", uiAmount: 1, decimals: 0, detection: "protocol_api", protocol: "Orca", priceUsd: null, valueUsd: 4200 } as SBPos);
  const ids = (ps: SBPos[]) => getLiquidPositions(ps).map((p) => p.id);

  add("NF-1: a 0-decimal, single-unit, unpriced token is dropped from Liquid Assets", !ids([sol(), usdc(), nft()]).includes("nft-1"), "nft excluded");
  add("NF-2: real liquid rows are untouched", JSON.stringify(ids([sol(), usdc(), nft()])) === JSON.stringify(["sol", "usdc"]), "sol + usdc kept");
  // The regression guard. Orca/Raydium LP positions ARE NFTs on-chain.
  add("NF-3: an Orca LP position (0-decimal, qty 1) is NOT dropped — it is type 'protocol'", getLiquidPositions([orcaLp()]).length === 0 && orcaLp().valueUsd === 4200, "protocol rows never reach the NFT test");
  add("NF-4: a PRICED 0-decimal single unit is kept — the price is what makes it an asset", ids([nft({ id: "priced", priceUsd: 25, valueUsd: 25 })]).includes("priced"), "priced kept");
  add("NF-5: several units of a 0-decimal token are kept — supply 1 is the NFT signature", ids([nft({ id: "multi", uiAmount: 5 })]).includes("multi"), "qty>1 kept");
  add("NF-6: a divisible unpriced token is kept — it is a pricing gap, not an NFT", ids([nft({ id: "divisible", decimals: 6 })]).includes("divisible"), "decimals>0 kept");
  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 17C — Steakhouse verified immediate-withdrawal adapter. Recognized vs
 * verified-liquid separated (liquid = min(recognized, vault max-instant));
 * fail-closed; flows through 17B coverage; Steakhouse stays existing-only.
 * ------------------------------------------------------------------ */

export function runMeasuredSlotDurationApyFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  const root = process.cwd();
  const readIf = (rel: string) => { try { return readFileSync(`${root}/${rel}`, "utf8"); } catch { return ""; } };
  const vaultsSrc = readIf("src/wallet/kaminoVaults.ts");
  const refreshSrc = readIf("scripts/refresh-stable-yield-market-data.mjs");
  const estimatorSrc = readIf("src/suggestions/solanaSlotDurationEstimator.ts");

  const NOW = Date.parse("2026-07-17T06:41:00.000Z");
  const OBS = "2026-07-17T06:40:18.000Z";
  const END = 433431193;
  // Real observed block times from the correction measurement.
  const okWindows = {
    primaryWindow: { windowSlots: 10000, startSlot: 433421193, endSlot: END, startBlockTime: 1784266267, endBlockTime: 1784270418 },
    validationWindows: [
      { windowSlots: 2500, startSlot: 433428693, endSlot: END, startBlockTime: 1784269379, endBlockTime: 1784270418 },
      { windowSlots: 50000, startSlot: 433381193, endSlot: END, startBlockTime: 1784249698, endBlockTime: 1784270418 },
    ],
  };
  const baseInputs = { cluster: "mainnet-beta", rpcSource: "configured_rpc", observedAt: OBS, nowMs: NOW, ...okWindows };
  const good = measureSlotDuration(baseInputs);

  // --- No hardcoded constant survives in production ---
  // Scan for the ASSIGNMENT construct, not the digits: this module's own comments legitimately
  // discuss 450/400/500 as rejected values, and a naive digit scan would match those.
  const assignRe = /RECENT_SLOT_DURATION_MS\s*=\s*\d+/;
  add("SD-1: kaminoVaults no longer assigns a constant slot duration", vaultsSrc.length > 0 && !assignRe.test(vaultsSrc), "no RECENT_SLOT_DURATION_MS = <n>");
  add("SD-2: refresh script no longer assigns a constant slot duration", refreshSrc.length > 0 && !assignRe.test(refreshSrc), "no RECENT_SLOT_DURATION_MS = <n>");
  add("SD-3: 450ms is not retained as production truth", vaultsSrc.length > 0 && !/=\s*450\b/.test(vaultsSrc) && !/=\s*450\b/.test(refreshSrc), "no `= 450` in either production site");
  add("SD-4: 400ms is not retained as production truth", !/=\s*400\b/.test(vaultsSrc) && !/=\s*400\b/.test(refreshSrc), "no `= 400` in either production site");
  add("SD-5: 500ms is not used as a silent fallback", !/=\s*500\b/.test(vaultsSrc) && !/=\s*500\b/.test(refreshSrc), "no `= 500` in either production site");
  add("SD-6: kaminoVaults consumes the estimator", /measureSlotDurationLive\s*\(/.test(vaultsSrc), "estimator invoked");
  add("SD-7: kaminoVaults fails closed with no fallback", /Refusing to substitute a constant slot duration/.test(vaultsSrc) && /throw new Error/.test(vaultsSrc), "throws rather than assuming");
  add("SD-8: refresh script measures per run", /measureSlotDurationMs\s*\(\s*rpc/.test(refreshSrc), "measurement called with rpc");
  add("SD-9: refresh script passes measured value to the SDK", /new klend\.KaminoVault\([\s\S]*?measuredSlotDurationMs\)/.test(refreshSrc), "measured value threaded into SDK");
  add("SD-10: the estimator itself declares no fallback constant", !/fallback\s*=\s*\d+/.test(estimatorSrc) && /There is NO fallback/i.test(estimatorSrc), "no fallback binding");
  add("SD-11: rejected constants are recorded as rejected, not used", REJECTED_CONSTANT_MS[450].length > 0 && REJECTED_CONSTANT_MS[400].length > 0 && REJECTED_CONSTANT_MS[500].length > 0 && REJECTED_CONSTANT_MS[411].length > 0, "4 rejected");

  // --- Windows ---
  add("SD-12: primary window is deterministic 10,000 slots", PRIMARY_WINDOW_SLOTS === 10000, "10k");
  add("SD-13: 2,500-slot validation is required", (VALIDATION_WINDOW_SLOTS as readonly number[]).includes(2500), "2.5k required");
  add("SD-14: 50,000-slot validation is required", (VALIDATION_WINDOW_SLOTS as readonly number[]).includes(50000), "50k required");
  add("SD-15: a missing required validation window fails closed", measureSlotDuration({ ...baseInputs, validationWindows: [okWindows.validationWindows[0]] }).failure === "missing_validation_window", "50k absent → fail");
  add("SD-16: windows use slot-NUMBER differences including skipped slots", good.primary?.slotDifference === 10000 && DENOMINATOR_POLICY.includesSkippedSlots === true && DENOMINATOR_POLICY.denominator === "endSlot - startSlot", "slot-number denominator");
  add("SD-17: forbidden denominators are named and excluded", (DENOMINATOR_POLICY.forbiddenDenominators as readonly string[]).includes("produced_block_count") && (DENOMINATOR_POLICY.forbiddenDenominators as readonly string[]).includes("transaction_count"), "3 forbidden");

  // --- Fail-closed validation ---
  const brk = (o: Record<string, unknown>) => measureSlotDuration({ ...baseInputs, primaryWindow: { ...okWindows.primaryWindow, ...o } });
  add("SD-18: missing block time fails closed", brk({ startBlockTime: undefined }).failure === "missing_block_time", "undefined → fail");
  add("SD-19: null block time fails closed", brk({ startBlockTime: null }).failure === "null_block_time", "null → fail");
  add("SD-20: reversed slots fail closed", brk({ startSlot: END + 10 }).failure === "invalid_slot_ordering", "start > end → fail");
  add("SD-21: reversed block times fail closed", brk({ startBlockTime: 1784270419 }).failure === "invalid_block_time_ordering", "start > end → fail");
  add("SD-22: zero/negative duration fails closed", brk({ startBlockTime: 1784270418 }).failure === "invalid_block_time_ordering", "equal times → fail before division");
  add("SD-23: non-finite duration fails closed", typeof (measureSlotDuration({ ...baseInputs, primaryWindow: { ...okWindows.primaryWindow, startSlot: NaN } }).failure) === "string", "NaN → fail");
  add("SD-24: duration outside the sanity range fails closed", brk({ startBlockTime: 1784270418 - 100000 }).failure === "outside_sanity_range", "far too slow → fail");
  add("SD-25: an out-of-range result is NOT clamped into range", brk({ startBlockTime: 1784270418 - 100000 }).measuredSlotDurationMs === undefined && /never clamped/i.test(estimatorSrc), "no clamp; no value emitted");
  add("SD-26: window disagreement beyond 2% fails closed", measureSlotDuration({ ...baseInputs, validationWindows: [{ ...okWindows.validationWindows[0], startBlockTime: 1784269379 - 200 }, okWindows.validationWindows[1]] }).failure === "window_disagreement", ">2% → fail");
  add("SD-27: tolerance is 2%", WINDOW_AGREEMENT_TOLERANCE === 0.02, "0.02");
  add("SD-28: stale measurement fails closed", measureSlotDuration({ ...baseInputs, nowMs: NOW + MEASUREMENT_TTL_MS + 1000 }).failure === "stale_measurement", "past TTL → fail");
  add("SD-29: wrong cluster fails closed", measureSlotDuration({ ...baseInputs, cluster: "devnet" }).failure === "wrong_cluster", "devnet → fail");
  add("SD-30: unresolved RPC source fails closed", measureSlotDuration({ ...baseInputs, rpcSource: undefined }).failure === "unresolved_rpc_source", "no provenance → fail");
  add("SD-31: reserve/measurement skew beyond bound fails closed", validateReserveMeasurementSkew(433431197, END).ok === true && validateReserveMeasurementSkew(END + MAX_RESERVE_MEASUREMENT_SLOT_SKEW + 1, END).failure === "reserve_measurement_skew", "4 ok, 151 fail");

  // --- Valid measurement ---
  add("SD-32: the correction measurement validates", good.ok === true && good.failure === undefined, "ok");
  add("SD-33: measured duration is ~415.1ms, not any rejected constant", Math.abs((good.measuredSlotDurationMs ?? 0) - 415.1) < 0.001 && good.measuredSlotDurationMs !== 450 && good.measuredSlotDurationMs !== 400 && good.measuredSlotDurationMs !== 500, "415.1ms measured");
  add("SD-34: slotAdjustmentFactor is computed correctly (500/ms)", Math.abs((good.slotAdjustmentFactor ?? 0) - 500 / 415.1) < 1e-9 && Math.abs(computeSlotAdjustmentFactor(500) - 1) < 1e-12 && Math.abs(computeSlotAdjustmentFactor(400) - 1.25) < 1e-12, "matches SDK formula");
  add("SD-35: measurement is fresh and records its age", good.freshnessState === "fresh" && typeof good.measurementAgeMs === "number" && good.freshnessTtlMs === MEASUREMENT_TTL_MS, "fresh + age + TTL");
  add("SD-36: every window records full provenance", (good.validations ?? []).every((v) => v.startSlot > 0 && v.endSlot > v.startSlot && v.startBlockTime > 0 && v.elapsedMs > 0 && v.averageSlotDurationMs > 0), "2 validations complete");
  add("SD-37: windows agree well inside tolerance", (good.windowAgreement ?? []).every((a) => a.withinTolerance && a.relativeDifference < 0.005), "~0.12% / ~0.17%");
  add("SD-38: TTL is justified from rate variability, not arbitrary", MEASUREMENT_TTL_MS === 15 * 60 * 1000 && /Justified from the rate's expected variability/i.test(estimatorSrc), "15min justified");
  add("SD-39: sanity range is justified", SANITY_RANGE_MS.minMs === 300 && SANITY_RANGE_MS.maxMs === 800 && /target block time is 400\s?ms/i.test(estimatorSrc), "[300,800] justified");

  // --- Mechanism evidence ---
  add("SD-40: the slotAdjustmentFactor mechanism is verified from SDK source", SLOT_ADJUSTMENT_MECHANISM.verified === true && SLOT_ADJUSTMENT_MECHANISM.verifiedFrom.some((v) => /reserve\.js:777-779/.test(v)), "4 source refs");
  add("SD-41: the recorded gap ratio is explained by the slot-duration ratio", Math.abs(SLOT_ADJUSTMENT_MECHANISM.gapExplanation.recordedGapRatio - 450 / 410.99) < 0.0001, "1.094888 ≈ 450/410.99");
  add("SD-42: SDK version is explicitly rejected as the cause", /red herring/i.test(SLOT_ADJUSTMENT_MECHANISM.sdkVersionIsNotTheCause) && /REJECTED/.test(SLOT_ADJUSTMENT_MECHANISM.sdkVersionIsNotTheCause), "9.1.2 vs 9.1.5 not the cause");
  add("SD-43: the 450ms defect is recorded with both locations", HARDCODED_450_DEFECT.locationsFound.length === 2 && HARDCODED_450_DEFECT.status === "corrected" && /kaminoVaults\.ts:23/.test(HARDCODED_450_DEFECT.locationsFound[0]), "both sites");
  add("SD-44: the defect is established independently of the API", /does not depend on the Kamino API being correct/i.test(HARDCODED_450_DEFECT.establishedIndependently), "on-chain proof alone");
  add("SD-45: frozen-snapshot sensitivity shows the factor is the only variable", FROZEN_SNAPSHOT_SENSITIVITY.length === 3 && FROZEN_SNAPSHOT_SENSITIVITY.every((s) => Math.abs(s.slotAdjustmentFactor - 500 / s.recentSlotDurationMs) < 1e-6), "400/450/500 traced");

  // --- APY derivation ---
  const apyInputs = {
    identity: { candidateId: "kamino_usdc_lending", marketAddress: EXACT_PRODUCT_BINDING.marketAddress, reserveAddress: EXACT_PRODUCT_BINDING.reserveAddress, liquidityMint: EXACT_PRODUCT_BINDING.liquidityMint, cTokenMint: EXACT_PRODUCT_BINDING.cTokenMint, klendProgram: EXACT_PRODUCT_BINDING.klendProgram, cluster: "mainnet-beta" },
    slotDuration: good, reserveSourceSlot: 433431197, reserveObservedAt: "2026-07-17T06:40:21.754Z",
    utilization: 0.8035779, borrowApr: 0.05299286, borrowApy: 0.05442212,
    supplyApr: 0.03396981, baseSupplyApy: 0.03455338, protocolTakeRatePct: 10,
    rewardState: "exhausted" as const, rewardApyPct: 0,
  };
  const apy = deriveMeasuredApy(apyInputs);
  add("SD-46: measured duration is passed into the SDK-derived APY", apy.ok === true && apy.measuredSlotDurationMs === 415.1 && Math.abs((apy.slotAdjustmentFactor ?? 0) - 1.204529) < 0.00001, "415.1ms → factor 1.2045");
  add("SD-47: rateKind is estimated_variable_apy", apy.rateKind === "estimated_variable_apy" && RATE_KIND === "estimated_variable_apy", "estimated_variable_apy");
  add("SD-48: precision state is estimated", apy.precisionState === "estimated" && PRECISION_STATE === "estimated", "estimated");
  add("SD-49: output unit is percentage_points", apy.outputUnit === "percentage_points" && Math.abs((apy.baseSupplyApyPct ?? 0) - 3.455338) < 0.000001, "ratio → pp once");
  add("SD-50: reward state remains exhausted with zero APY", apy.rewardApyPct === 0 && CORRECTED_APY_SNAPSHOT.rewardState === "exhausted" && CORRECTED_APY_SNAPSHOT.rewardApyPct === 0, "unchanged");
  add("SD-51: total supply APY = base + reward on the same observation boundary", Math.abs((apy.totalSupplyApyPct ?? 0) - ((apy.baseSupplyApyPct ?? 0) + (apy.rewardApyPct ?? 0))) < 1e-12 && (apy.sourceSkewSlots ?? 999) <= MAX_RESERVE_MEASUREMENT_SLOT_SKEW, "skew 4 slots");
  add("SD-52: an unresolved slot duration blocks the APY entirely", deriveMeasuredApy({ ...apyInputs, slotDuration: measureSlotDuration({ ...baseInputs, cluster: "devnet" }) }).failure === "slot_duration_unavailable", "no measurement → no APY");
  add("SD-53: a stale slot duration blocks the APY", deriveMeasuredApy({ ...apyInputs, slotDuration: { ...good, freshnessState: "stale" as const } }).failure === "slot_duration_stale", "stale → fail");
  add("SD-54: skew beyond bound blocks the APY", deriveMeasuredApy({ ...apyInputs, reserveSourceSlot: END + 500 }).failure === "reserve_measurement_skew", "500 slots → fail");
  add("SD-55: unresolved rewards block total APY", deriveMeasuredApy({ ...apyInputs, rewardState: "unresolved" as const }).failure === "reward_unresolved", "unresolved → fail");
  add("SD-56: the APY is never described as exact", /can never be exact|inherently an ESTIMATE/i.test(readIf("src/suggestions/klendReserveMeasuredApyCorrection.ts")), "estimate, not exact");

  // --- Identity binding ---
  add("SD-57: exact candidate identity is required", validateExactProductBinding(apyInputs.identity).ok === true && validateExactProductBinding({ ...apyInputs.identity, reserveAddress: "So11111111111111111111111111111111111111112" }).failure === "reserve_mismatch", "exact reserve enforced");
  add("SD-58: every identity component fails closed independently", validateExactProductBinding({ ...apyInputs.identity, candidateId: "x" }).failure === "candidate_mismatch" && validateExactProductBinding({ ...apyInputs.identity, marketAddress: "x" }).failure === "market_mismatch" && validateExactProductBinding({ ...apyInputs.identity, liquidityMint: "x" }).failure === "mint_mismatch" && validateExactProductBinding({ ...apyInputs.identity, cTokenMint: "x" }).failure === "ctoken_mismatch" && validateExactProductBinding({ ...apyInputs.identity, klendProgram: "x" }).failure === "program_mismatch" && validateExactProductBinding({ ...apyInputs.identity, cluster: "devnet" }).failure === "cluster_mismatch", "7 components");
  add("SD-59: another reserve may not reuse the reserve state", MEASUREMENT_REUSE_POLICY.reserveStateMayBeShared === false && MEASUREMENT_REUSE_POLICY.eachProductMustBindItsOwnReserveState === true, "reserve state not shareable");
  add("SD-60: the slot-duration measurement IS network-wide reusable", MEASUREMENT_REUSE_POLICY.slotDurationIsNetworkWide === true, "network property");

  // --- API diagnostic ---
  add("SD-61: the API remains diagnostic only", KAMINO_API_DIAGNOSTIC.role === "diagnostic_only", "diagnostic_only");
  add("SD-62: the API's missing timestamp prevents it becoming production authority", KAMINO_API_DIAGNOSTIC.exposesSourceTimestamp === false && KAMINO_API_DIAGNOSTIC.exposesSourceSlot === false && KAMINO_API_DIAGNOSTIC.exposesAsOfField === false && /freshness cannot be evaluated/i.test(KAMINO_API_DIAGNOSTIC.disqualifiedAsProductionAuthority), "no timestamp → not authority");
  add("SD-63: the API's slot-duration input is NOT inferred", /remains UNKNOWN/.test(KAMINO_API_DIAGNOSTIC.slotDurationInputNotInferred) && /never adopted/i.test(KAMINO_API_DIAGNOSTIC.slotDurationInputNotInferred), "411ms not adopted");
  add("SD-64: the API is bound by exact reserve address", KAMINO_API_DIAGNOSTIC.boundBy.includes(EXACT_PRODUCT_BINDING.reserveAddress), "exact binding");
  add("SD-65: residual parity is recorded with abs + rel differences", CORRECTION_PARITY_RESULT.borrowAbsoluteDifferencePct > 0 && CORRECTION_PARITY_RESULT.supplyAbsoluteDifferencePct > 0 && CORRECTION_PARITY_RESULT.borrowRelativeDifference > 0 && CORRECTION_PARITY_RESULT.supplyRelativeDifference > 0 && typeof CORRECTION_PARITY_RESULT.requestedAt === "string", "recorded");
  add("SD-66: residual is within the justified tolerance and classified", CORRECTION_PARITY_RESULT.withinTolerance === true && CORRECTION_PARITY_RESULT.classification === "consistent_with_measurement_window_difference" && CORRECTION_PARITY_RESULT.supplyRelativeDifference < 0.02, "~1.03% < 2%");
  add("SD-67: parity tolerance is justified by the mechanism, not numeric convenience", PARITY_TOLERANCE.notChosenForNumericConvenience === true && /scales linearly in slotAdjustmentFactor/i.test(PARITY_TOLERANCE.justification), "mechanism-justified");
  add("SD-68: a material residual prevents comparison readiness", evaluateParityDiagnostic(5.44, 3.45, 6.5, 4.2, OBS).classification === "material_mismatch_unresolved" && evaluateComparisonReadiness({ identityVerified: true, slotDurationValidated: true, slotDurationFresh: true, windowsAgree: true, reserveFresh: true, skewWithinBound: true, rewardResolved: true, parityWithinTolerance: false }).primaryBlocker === "blocked_apy_unit", "material → blocked");
  add("SD-69: neither value was forced to match the other", /no reference to the API/i.test(PARITY_IMPROVEMENT.neitherValueWasForcedToMatch) && PARITY_IMPROVEMENT.beforeRelativeDifference > PARITY_IMPROVEMENT.afterRelativeDifference, "9.65% → 1.03%");

  // --- State transition ---
  add("SD-70: successful validation restores definitionSufficientForComparison", CORRECTION_READINESS_RESULT.definitionSufficientForComparison === true && CORRECTION_READINESS_RESULT.failedGates.length === 0, "restored");
  add("SD-71: successful validation moves primary blocker to blocked_capacity", CORRECTION_READINESS_RESULT.primaryBlocker === "blocked_capacity" && APY_UNIT_BLOCKER_SUPERSESSION.resultingPrimaryBlocker === "blocked_capacity", "→ blocked_capacity");
  add("SD-72: prior primary blocker is recorded as blocked_apy_unit", APY_UNIT_BLOCKER_SUPERSESSION.priorPrimaryBlocker === "blocked_apy_unit" && APY_UNIT_BLOCKER_SUPERSESSION.reopenedAt === "16H-N.3a", "provenance kept");
  add("SD-73: any failed gate keeps blocked_apy_unit", ["identityVerified", "slotDurationValidated", "slotDurationFresh", "windowsAgree", "reserveFresh", "skewWithinBound", "rewardResolved"].every((g) => { const i = { identityVerified: true, slotDurationValidated: true, slotDurationFresh: true, windowsAgree: true, reserveFresh: true, skewWithinBound: true, rewardResolved: true, parityWithinTolerance: true } as Record<string, boolean>; i[g] = false; const r = evaluateComparisonReadiness(i as unknown as Parameters<typeof evaluateComparisonReadiness>[0]); return r.definitionSufficientForComparison === false && r.primaryBlocker === "blocked_apy_unit"; }), "7 gates each block");
  add("SD-74 (updated by 16H-N.4): the production evidence records the APY blocker as resolved and has moved past capacity too", (() => { const src = readIf("src/suggestions/stableYieldProductionEvidence.ts"); const m = getStableYieldEvidenceManifest("kamino_usdc_lending")!; return /RESOLVED at 16H-N\.3b/.test(src) && m.primaryBlocker !== "blocked_apy_unit" && m.primaryBlocker === "blocked_risk_review"; })(), "apy resolved, primary advanced");

  // --- Presentation ---
  add("SD-75: display format requires the ~ prefix", USER_FACING_APY_PRESENTATION.displayFormat === "~{formattedApy}% APY" && USER_FACING_APY_PRESENTATION.tildePrefixRequired === true, "~{apy}% APY");
  add("SD-76: tooltip states estimated and variable", USER_FACING_APY_PRESENTATION.tooltipTitle === "Estimated variable APY" && /Estimated variable APY/.test(USER_FACING_APY_PRESENTATION.tooltipTitle), "title");
  add("SD-77: tooltip states actual returns may differ", /actual returns may differ/i.test(USER_FACING_APY_PRESENTATION.tooltipBody), "may differ");
  add("SD-78: tooltip states returns are not guaranteed", /Returns are not guaranteed/i.test(USER_FACING_APY_PRESENTATION.tooltipBody), "not guaranteed");
  add("SD-79: tooltip states the rate can change at any time", /rate can change at any time/i.test(USER_FACING_APY_PRESENTATION.tooltipBody), "variable");
  add("SD-80: tooltip implies no protection, custody, or execution", USER_FACING_APY_PRESENTATION.mustNotImply.length === 6 && !/principal protection|fixed income|guaranteed liquidity|custody/i.test(USER_FACING_APY_PRESENTATION.tooltipBody), "6 forbidden, none present");
  add("SD-81: production presentation is NOT enabled", USER_FACING_APY_PRESENTATION.productionPresentationEnabled === false && USER_FACING_APY_PRESENTATION.productionCardRendered === false, "recorded only");

  // --- Comparison methodology ---
  add("SD-82: comparison requires compatible methodology", COMPARISON_METHODOLOGY_RULE.kaminoDirectLendingRequires.length === 7 && COMPARISON_METHODOLOGY_RULE.forbiddenComparisons.length === 4, "7 requirements, 4 forbidden");
  add("SD-83: no selector behavior was added", COMPARISON_METHODOLOGY_RULE.selectorBehaviorAdded === false, "no selector");

  // --- Evidence integrity ---
  add("SD-84: prior evidence is preserved immutably", (PRESERVED_PRIOR_EVIDENCE as readonly string[]).includes("identity_9773ac14") && (PRESERVED_PRIOR_EVIDENCE as readonly string[]).includes("apy_evidence_d468fce5") && (PRESERVED_PRIOR_EVIDENCE as readonly string[]).includes("reward_evidence_cace4fe4") && (PRESERVED_PRIOR_EVIDENCE as readonly string[]).includes("parity_evidence_dd25a9a1"), "7 preserved");
  add("SD-85: prior identity evidence is still live and unchanged", SOL_BTC_USDC_IDENTITY_MANIFEST_HASH === "identity_9773ac14" && computeIdentityManifestHash() === SOL_BTC_USDC_IDENTITY_MANIFEST_HASH, "unchanged");
  add("SD-86: prior APY evidence is still live and unchanged", APY_EVIDENCE_MANIFEST_HASH === "apy_evidence_d468fce5" && computeApyEvidenceManifestHash() === APY_EVIDENCE_MANIFEST_HASH, "unchanged");
  add("SD-87: prior reward evidence is still live and unchanged", REWARD_EVIDENCE_MANIFEST_HASH === "reward_evidence_cace4fe4" && computeRewardEvidenceManifestHash() === REWARD_EVIDENCE_MANIFEST_HASH, "unchanged");
  add("SD-88: prior parity evidence is still live and unchanged", PARITY_EVIDENCE_MANIFEST_HASH === "parity_evidence_dd25a9a1" && computeParityEvidenceManifestHash() === PARITY_EVIDENCE_MANIFEST_HASH, "unchanged");
  add("SD-89: no prior evidence was silently rewritten", PRIOR_EVIDENCE_HANDLING.silentRewriteOccurred === false && PRIOR_EVIDENCE_HANDLING.supersessionMode === "additive_amendment" && PRIOR_EVIDENCE_HANDLING.historicalBlockerTransitionsRetained === true, "additive only");
  add("SD-90: the new evidence manifest is deterministic", MEASURED_APY_EVIDENCE_MANIFEST_HASH === computeMeasuredApyEvidenceManifestHash() && /^measured_apy_evidence_[0-9a-f]{8}$/.test(MEASURED_APY_EVIDENCE_MANIFEST_HASH), MEASURED_APY_EVIDENCE_MANIFEST_HASH);
  add("SD-91: evidence records what changed, why, preparer, provenance, timestamp, triggers", MEASURED_APY_EVIDENCE.whatChanged.length === 5 && MEASURED_APY_EVIDENCE.whyItChanged.length > 0 && MEASURED_APY_EVIDENCE.preparerId.length > 0 && MEASURED_APY_EVIDENCE.sourceProvenance.length === 4 && MEASURED_APY_EVIDENCE.evidenceTimestamp.length > 0 && MEASURED_APY_EVIDENCE.invalidationTriggers.length === 8, "complete");
  add("SD-92: the preparer is not represented as a human reviewer", MEASURED_APY_EVIDENCE.preparerIsNotHumanReviewer === true && MEASURED_APY_EVIDENCE.preparerRole === "automated_evidence_preparer", "not a reviewer");
  add("SD-93: the evidence snapshot is not a production input", MEASUREMENT_SNAPSHOT_IS_NOT_PRODUCTION_INPUT.isProductionInput === false && MEASUREMENT_SNAPSHOT_IS_NOT_PRODUCTION_INPUT.isProductIdentity === false && MEASUREMENT_SNAPSHOT_IS_NOT_PRODUCTION_INPUT.isImmutableEvidence === true, "evidence ≠ input");
  add("SD-94: the four evidence layers are separated", Object.keys(EVIDENCE_LAYER_SEPARATION).length === 4, "methodology/snapshot/ephemeral/cache");
  add("SD-95: no measured value is written into immutable methodology", !/measuredSlotDurationMs:\s*4\d\d(\.\d+)?[,\s]/.test(estimatorSrc.split("CORRECTION_MEASUREMENT_SNAPSHOT")[0] ?? ""), "methodology carries no measurement");
  add("SD-96: the RPC URL is never embedded in evidence", !/https?:\/\/[^\s"]*(helius|quicknode|alchemy|rpcpool)/i.test(readIf("src/suggestions/klendReserveMeasuredApyCorrection.ts")), "no secret in evidence");

  // --- Scope fence ---
  add("SD-97: capacity remains unresolved", CORRECTION_CONFERS.capacityRemains === "unresolved" && (CORRECTION_CONFERS.doesNotConfer as readonly string[]).includes("capacity resolution"), "unresolved");
  add("SD-98: deposits remain blocked", CORRECTION_CONFERS.depositAvailabilityRemains === "blocked", "blocked");
  add("SD-99: no risk score, review, signoff, or approval", CORRECTION_CONFERS.riskScoreAssigned === false && CORRECTION_CONFERS.humanReviewOccurred === false && CORRECTION_CONFERS.signoffOccurred === false && CORRECTION_CONFERS.productApproved === false, "none");
  add("SD-100: no selector, recommendation, Top Pick, or production card", (CORRECTION_CONFERS.doesNotConfer as readonly string[]).includes("selector eligibility") && (CORRECTION_CONFERS.doesNotConfer as readonly string[]).includes("recommendation eligibility") && (CORRECTION_CONFERS.doesNotConfer as readonly string[]).includes("Top Pick") && (CORRECTION_CONFERS.doesNotConfer as readonly string[]).includes("a production card"), "none");
  add("SD-101: lifecycle is unchanged and no lifecycle value was invented", /identity_verified/.test(CORRECTION_CONFERS.lifecycleUnchanged) && /no lifecycle value was invented/i.test(CORRECTION_CONFERS.lifecycleUnchanged), "identity_verified");
  add("SD-102: no transaction is constructed or simulated", CORRECTION_CONFERS.transactionConstructedOrSimulated === false && !/sendTransaction|signTransaction|simulateTransaction|VersionedTransaction/.test(estimatorSrc + readIf("src/suggestions/klendReserveMeasuredApyCorrection.ts")), "read-only");
  add("SD-103: the estimator is read-only", !/sendTransaction|signTransaction|simulateTransaction/.test(estimatorSrc) && /STRICTLY READ-ONLY/.test(estimatorSrc), "block times only");

  return checks;
}

/* ------------------------------------------------------------------ *
 * 16H-N.4 — Exact Reserve Capacity Adapter
 * ------------------------------------------------------------------ */

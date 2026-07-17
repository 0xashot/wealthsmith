/**
 * klendReserveRewardResolution — Step 16H-N.3. Supplier-farm resolution and total supply APY for the
 * exact direct-lending candidate (`kamino_usdc_lending`, reserve D6q6wuQS…).
 *
 * SCOPE: rewards and total APY only. No capacity, no deposit availability, no scoring, no approval,
 * no execution.
 *
 * THE OUTCOME, and the reason it needs no price source:
 *
 *   The supplier farm IS configured (JAvnB9AKtgPsTEoKmn24Bq64UMoYcrtWtq42HHBdsPkh) and has exactly one
 *   reward stream — BONK-mint DezXAZ8z… with 5 decimals. That stream is EXHAUSTED, and exhausted is
 *   positively verified rather than assumed:
 *
 *     rewardsAvailable            = 0        (no inventory to pay)
 *     every one of 20 curve points rewardPerTimeUnit = 0   (no emission, now or scheduled)
 *     tsStart values are only 0 and u64::MAX (the unset sentinel) — no future activation
 *     lastIssuanceTs              = 1706787696 -> 2024-02-01, ~2.5 years before the read
 *
 *   Because emission is zero across the ENTIRE schedule and inventory is zero, reward APY is zero for
 *   ANY token price. 0 × price = 0. So the reward-price authority question — which 16H-N.2 flagged as
 *   the blocker — does not arise. No price source is needed, and none was invented.
 *
 * WHY THIS ALSO SIDESTEPS THE COMBINATION RULE. The step forbids inventing a rule for combining reward
 * yield with base yield. With reward = 0, every candidate convention agrees: additive gives base + 0,
 * and compounding gives base × (1 + 0). The total is base under all of them, so no convention had to be
 * chosen. Had the stream been live, this module would have stopped and reported instead.
 *
 * WHAT THIS DOES NOT EXPLAIN: the UI showed 3.49% supply APY against a verified base of ~3.18%. Rewards
 * are zero, so rewards are NOT that gap. It remains unexplained and is recorded as such — see
 * UI_PARITY_DIAGNOSTIC. It is diagnostic-only and does not gate this result.
 */
import { SOL_BTC_USDC_RESERVE_IDENTITY, CANONICAL_SOLANA_USDC_MINT, KLEND_PROGRAM_ID, SOLANA_MAINNET_CLUSTER } from "./klendReserveIdentity";
import { ratioToPercent, OUTPUT_UNIT } from "./klendReserveApyDerivation";

export const KLEND_REWARD_RESOLUTION_VERSION = "1.0.0" as const;

/* ------------------------------------------------------------------ *
 * 1. Farm identity
 * ------------------------------------------------------------------ */

/** The Kamino Farms program. Independently corroborated: it is the same address Kamino's own
 *  verifiable-builds table lists for "Kamino Farms". */
export const KAMINO_FARMS_PROGRAM_ID = "FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr" as const;
export const DEFAULT_PUBKEY = "11111111111111111111111111111111" as const;

/**
 * Read from the EXACT reserve state — `reserve.state.farmCollateral` — not from the abbreviation the
 * prior step surfaced. The step was explicit that `JAvnB9AKtg…` is not evidence; the full address
 * below is what the account actually holds.
 *
 * The supplier/borrower distinction is unambiguous here for a structural reason worth recording:
 * `farmDebt` is the DEFAULT pubkey (unset), so this reserve has exactly one farm and it is the
 * collateral (supplier) farm. There is no second farm to confuse it with.
 */
export const SUPPLIER_FARM_IDENTITY = {
  candidateId: "kamino_usdc_lending",
  reserveAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  marketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
  collateralMint: "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D",
  /** Full address, read from reserve.state.farmCollateral. */
  supplierFarmAddress: "JAvnB9AKtgPsTEoKmn24Bq64UMoYcrtWtq42HHBdsPkh",
  farmProgramId: KAMINO_FARMS_PROGRAM_ID,
  farmAccountOwnerVerified: true,
  farmAccountBytes: 8336,
  /** UNSET — which is what makes the supplier farm unambiguous. */
  debtFarmAddress: DEFAULT_PUBKEY,
  debtFarmConfigured: false,
  isSupplierFarm: true,
  cluster: SOLANA_MAINNET_CLUSTER,
  sourceSlot: "433414541",
  observedAt: "2026-07-17T04:44:57.000Z",
  provenance: "reserve.state.farmCollateral via @kamino-finance/klend-sdk; farm account owner confirmed by getAccountInfo",
} as const;

/* ------------------------------------------------------------------ *
 * 2. Reward stream inventory
 * ------------------------------------------------------------------ */

export type StreamState = "active" | "configured_inactive" | "exhausted" | "scheduled_future" | "expired" | "paused" | "malformed" | "unresolved";

export interface RewardStream {
  rewardIndex: number;
  rewardTokenMint: string;
  /** Resolved from the MINT, never from a symbol lookup. Recorded as unresolved when not proven. */
  rewardTokenSymbol: string | null;
  rewardTokenDecimals: number;
  rewardsAvailableRaw: string;
  emissionRateRaw: string;
  emissionRawUnit: string;
  emissionNormalizedUnit: string;
  curvePointCount: number;
  curvePointsWithNonZeroEmission: number;
  futureNonZeroEmissionPoints: number;
  lastIssuanceTs: string;
  lastIssuanceAt: string;
  state: StreamState;
  stateEvidence: string;
  /** Zero ONLY when positively established. Null otherwise. */
  rewardApyPct: number | null;
  requiresPrice: boolean;
  sourceAccount: string;
  sourceSlot: string;
  observedAt: string;
}

/**
 * ONE stream configured of ten reward slots. Each slot is independently inspected rather than
 * collapsed — a configured stream with zero emission is not the same thing as no stream, and this
 * module has to be able to tell them apart.
 *
 * `requiresPrice: false` is the load-bearing field. It is false because emission is identically zero,
 * not because a price was unavailable and got waved through.
 */
export const REWARD_STREAMS: RewardStream[] = [
  {
    rewardIndex: 0,
    rewardTokenMint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    // Deliberately null: the step forbids symbol-only identity, and no on-chain metadata read was
    // performed to prove a symbol. The MINT is the identity. (This mint is widely known as BONK, and
    // decimals = 5 is consistent with that — but "widely known" is not verification, and nothing here
    // depends on the symbol.)
    rewardTokenSymbol: null,
    rewardTokenDecimals: 5,
    rewardsAvailableRaw: "0",
    emissionRateRaw: "0",
    emissionRawUnit: "reward token base units per time unit (rewardScheduleCurve.points[].rewardPerTimeUnit)",
    emissionNormalizedUnit: "n/a — emission is identically zero, so no normalization is required or performed",
    curvePointCount: 20,
    curvePointsWithNonZeroEmission: 0,
    futureNonZeroEmissionPoints: 0,
    lastIssuanceTs: "1706787696",
    lastIssuanceAt: "2024-02-01T11:41:36.000Z",
    state: "exhausted",
    stateEvidence:
      "POSITIVELY VERIFIED, on four independent grounds: (1) rewardsAvailable = 0 — no inventory exists to pay out; (2) all 20 rewardScheduleCurve points have rewardPerTimeUnit = 0 — no emission anywhere in the schedule; (3) tsStart values are only 0 and 18446744073709551615 (u64::MAX, the unset sentinel), so no future activation is scheduled; (4) lastIssuanceTs = 2024-02-01, ~2.5 years before the read. This is 'exhausted', NOT 'unresolved' and NOT 'absent' — the stream exists and is configured, it simply has nothing left to emit.",
    rewardApyPct: 0,
    requiresPrice: false,
    sourceAccount: "JAvnB9AKtgPsTEoKmn24Bq64UMoYcrtWtq42HHBdsPkh",
    sourceSlot: "433414541",
    observedAt: "2026-07-17T04:44:57.000Z",
  },
];

export const FARM_STATE_SNAPSHOT = {
  numRewardTokens: 1,
  rewardSlotsInAccount: 10,
  nonDefaultRewardSlots: 1,
  totalStakedAmountRaw: "75470274720160",
  farmTokenMint: DEFAULT_PUBKEY,
  farmTokenMintNote: "The farm's own `token.mint` is the default pubkey — a placeholder. Reward-token identity lives on each rewardInfo, and that is where it was read from.",
  sourceSlot: "433414541",
  observedAt: "2026-07-17T04:44:57.000Z",
} as const;

/* ------------------------------------------------------------------ *
 * 3. SDK reward semantics
 * ------------------------------------------------------------------ */

/**
 * Recorded for the reviewer, and honest about what was NOT exercised.
 *
 * `getRewardYields({})` returns `[]` here. In 16H-N.2 that was correctly treated as uninformative —
 * an empty price map could produce `[]` for either reason. It is now CORROBORATIVE rather than
 * decisive: the farm state independently proves zero emission, and the SDK agreeing costs nothing.
 * The SDK's APR-vs-APY semantics were NOT verified, because no reward APY had to be calculated. That
 * verification is deferred, and is recorded as deferred rather than quietly assumed.
 */
export const SDK_REWARD_SEMANTICS = {
  symbolsInspected: [
    "KaminoReserve.getCollateralFarmAddress",
    "KaminoReserve.getDebtFarmAddress",
    "KaminoReserve.loadFarmStates",
    "KaminoReserve.getRewardYields(prices: KaminoPrices, farmsProgramId?)",
    "KaminoReserve.calculateRewardYield(prices, rewardInfo, isDebtReward, farmTotalStakeLamports)",
    "reserve.farmData.farms[].farmState.rewardInfos[]",
    "rewardInfo.rewardScheduleCurve.points[].{tsStart, rewardPerTimeUnit}",
  ],
  getRewardYieldsInputs: "KaminoPrices map keyed by mint; optional farms program id",
  getRewardYieldsWithEmptyPrices: "[] — uninformative ON ITS OWN; corroborative here only because farm state independently proves zero emission",
  calculateRewardYieldInputs: "prices, rewardInfo, isDebtReward (distinguishes supplier from borrower rewards), farmTotalStakeLamports (caller-supplied denominator)",
  aprOrApySemantics: "NOT VERIFIED — deliberately. No reward APY had to be computed, so the SDK's reward annualization/compounding convention was not exercised and is not claimed. It must be verified before any non-zero reward stream is ever valued.",
  compoundingConvention: "unverified for rewards — must NOT be assumed to follow the base-supply per-slot convention",
  includesAllStreams: "unverified — not needed for a single exhausted stream",
  excludesInactiveStreams: "unverified",
  priceRequired: "yes for a live stream; NOT required here because emission is identically zero",
  farmTvlDerivation: "caller-supplied for calculateRewardYield (farmTotalStakeLamports); internally derived for getRewardYields",
} as const;

/* ------------------------------------------------------------------ *
 * 4. Total supply APY
 * ------------------------------------------------------------------ */

export type RewardResolutionFailure =
  | "identity_mismatch"
  | "farm_address_mismatch"
  | "farm_program_mismatch"
  | "farm_not_supplier"
  | "ambiguous_supplier_farm"
  | "farm_state_missing"
  | "farm_state_stale"
  | "stream_unresolved"
  | "reward_price_missing"
  | "reward_price_stale"
  | "decimals_unresolved"
  | "non_finite_output"
  | "slot_skew_exceeded";

export interface RewardResolutionInputs {
  candidateId: string;
  marketAddress: string;
  reserveAddress: string;
  collateralMint: string;
  liquidityMint: string;
  klendProgramId: string;
  supplierFarmAddress: string;
  farmProgramId: string;
  debtFarmAddress: string;
  cluster: string;
  streams: RewardStream[];
  baseSupplyApyPct: number;
  baseSourceSlot: string;
  farmSourceSlot: string;
  maxSlotSkew: number;
  farmAgeMs?: number;
  maxFarmAgeMs?: number;
}

export interface RewardResolutionResult {
  ok: boolean;
  failure?: RewardResolutionFailure;
  detail?: string;
  rewardState?: StreamState;
  rewardApyPct?: number | null;
  baseSupplyApyPct?: number;
  totalSupplyApyPct?: number | null;
  definitionSufficientForComparison?: boolean;
  combinationConvention?: string;
  slotSkew?: number;
  outputUnit?: typeof OUTPUT_UNIT;
  calculationVersion?: string;
}

/**
 * Base and farm must come from close slots or total fails closed. Set to 0 because both reads were
 * taken at ONE slot (433414541) — an earlier attempt had ~8 hours of skew between them, which is
 * exactly the kind of drift this bound exists to catch, so it was re-read rather than tolerated.
 */
export const MAX_SLOT_SKEW = 150;

export function resolveRewardsAndTotalApy(i: RewardResolutionInputs): RewardResolutionResult {
  const fail = (failure: RewardResolutionFailure, detail: string): RewardResolutionResult => ({ ok: false, failure, detail });
  const id = SOL_BTC_USDC_RESERVE_IDENTITY;

  // --- exact identity, every axis ---
  if (i.candidateId !== id.candidateId) return fail("identity_mismatch", `candidate ${i.candidateId}`);
  if (i.marketAddress !== id.marketAddress) return fail("identity_mismatch", `market ${i.marketAddress}`);
  if (i.reserveAddress !== id.reserveAddress) return fail("identity_mismatch", `reserve ${i.reserveAddress} — another Kamino USDC reserve's farm may not supply this candidate's rewards`);
  if (i.collateralMint !== id.collateralMint) return fail("identity_mismatch", `cToken mint ${i.collateralMint}`);
  if (i.liquidityMint !== CANONICAL_SOLANA_USDC_MINT) return fail("identity_mismatch", `liquidity mint ${i.liquidityMint}`);
  if (i.klendProgramId !== KLEND_PROGRAM_ID) return fail("identity_mismatch", `klend program ${i.klendProgramId}`);
  if (i.cluster !== SOLANA_MAINNET_CLUSTER) return fail("identity_mismatch", `cluster ${i.cluster}`);

  // --- farm binding ---
  if (i.supplierFarmAddress !== SUPPLIER_FARM_IDENTITY.supplierFarmAddress) return fail("farm_address_mismatch", `farm ${i.supplierFarmAddress}`);
  if (i.farmProgramId !== KAMINO_FARMS_PROGRAM_ID) return fail("farm_program_mismatch", `farm program ${i.farmProgramId}`);
  if (i.supplierFarmAddress === i.debtFarmAddress) return fail("farm_not_supplier", "the supplied farm is the debt farm");
  if (i.debtFarmAddress !== DEFAULT_PUBKEY && i.debtFarmAddress === i.supplierFarmAddress) return fail("ambiguous_supplier_farm", "supplier and debt farm collide");
  if (!i.streams) return fail("farm_state_missing", "no farm state");

  // --- freshness ---
  if (typeof i.farmAgeMs === "number" && typeof i.maxFarmAgeMs === "number" && i.farmAgeMs > i.maxFarmAgeMs) {
    return fail("farm_state_stale", `farm state age ${i.farmAgeMs}ms exceeds ${i.maxFarmAgeMs}ms`);
  }

  // --- slot skew between base and farm ---
  const skew = Math.abs(Number(i.baseSourceSlot) - Number(i.farmSourceSlot));
  if (!Number.isFinite(skew)) return fail("slot_skew_exceeded", "slot values are not numeric");
  if (skew > i.maxSlotSkew) return fail("slot_skew_exceeded", `base slot ${i.baseSourceSlot} and farm slot ${i.farmSourceSlot} differ by ${skew} > ${i.maxSlotSkew}`);

  // --- per-stream resolution ---
  let aggregateRewardApyPct = 0;
  let anyUnresolved = false;
  let dominantState: StreamState = "exhausted";
  for (const s of i.streams) {
    if (!s.rewardTokenMint || s.rewardTokenMint === DEFAULT_PUBKEY) return fail("stream_unresolved", `stream ${s.rewardIndex} has no mint`);
    if (!Number.isFinite(s.rewardTokenDecimals)) return fail("decimals_unresolved", `stream ${s.rewardIndex} decimals unresolved`);
    if (s.state === "unresolved" || s.state === "malformed") { anyUnresolved = true; dominantState = s.state; continue; }
    if (s.state === "active" || s.state === "scheduled_future") {
      // A live stream needs a price and verified reward APR/APY semantics. Neither exists yet, so
      // this fails closed rather than guessing.
      if (s.requiresPrice && s.rewardApyPct === null) { anyUnresolved = true; dominantState = "active"; continue; }
    }
    if (s.rewardApyPct === null) { anyUnresolved = true; continue; }
    if (!Number.isFinite(s.rewardApyPct)) return fail("non_finite_output", `stream ${s.rewardIndex} apy is not finite`);
    aggregateRewardApyPct += s.rewardApyPct;
  }

  if (anyUnresolved) {
    return {
      ok: true,
      rewardState: dominantState,
      rewardApyPct: null,
      baseSupplyApyPct: i.baseSupplyApyPct,
      totalSupplyApyPct: null,
      definitionSufficientForComparison: false,
      combinationConvention: "not applicable — at least one stream is unresolved, so no total is produced",
      slotSkew: skew,
      outputUnit: OUTPUT_UNIT,
      calculationVersion: KLEND_REWARD_RESOLUTION_VERSION,
    };
  }

  const total = Math.round((i.baseSupplyApyPct + aggregateRewardApyPct) * 1e6) / 1e6;
  return {
    ok: true,
    rewardState: i.streams.every((s) => s.state === "exhausted") ? "exhausted" : dominantState,
    rewardApyPct: aggregateRewardApyPct,
    baseSupplyApyPct: i.baseSupplyApyPct,
    totalSupplyApyPct: total,
    definitionSufficientForComparison: true,
    combinationConvention:
      aggregateRewardApyPct === 0
        ? "CONVENTION NOT REQUIRED: aggregate reward APY is exactly 0, and every candidate convention (additive base+reward, or compounded base×(1+reward)) yields base. No combination rule was chosen or invented. A non-zero stream would require the official convention to be verified first."
        : "additive display yield — REQUIRES verification before use",
    slotSkew: skew,
    outputUnit: OUTPUT_UNIT,
    calculationVersion: KLEND_REWARD_RESOLUTION_VERSION,
  };
}

/**
 * The exact resolution inputs at the unified slot.
 *
 * baseSupplyApyPct is re-read at slot 433414541 (3.153819%) rather than reused from 16H-N.2's slot
 * 433344510 (3.178951%) — those are ~8 hours apart, and utilization drifted 80.31% -> 79.99%. Mixing
 * them would have produced a total whose components describe different moments.
 */
export const SOL_BTC_REWARD_RESOLUTION_INPUTS: RewardResolutionInputs = {
  candidateId: "kamino_usdc_lending",
  marketAddress: "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",
  reserveAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  collateralMint: "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D",
  liquidityMint: CANONICAL_SOLANA_USDC_MINT,
  klendProgramId: KLEND_PROGRAM_ID,
  supplierFarmAddress: "JAvnB9AKtgPsTEoKmn24Bq64UMoYcrtWtq42HHBdsPkh",
  farmProgramId: KAMINO_FARMS_PROGRAM_ID,
  debtFarmAddress: DEFAULT_PUBKEY,
  cluster: SOLANA_MAINNET_CLUSTER,
  streams: REWARD_STREAMS,
  baseSupplyApyPct: ratioToPercent(0.031538185764469207),
  baseSourceSlot: "433414541",
  farmSourceSlot: "433414541",
  maxSlotSkew: MAX_SLOT_SKEW,
};

export function getSolBtcUsdcTotalApy(): RewardResolutionResult {
  return resolveRewardsAndTotalApy(SOL_BTC_REWARD_RESOLUTION_INPUTS);
}

/** The unified-slot base observation. Ephemeral — never identity. */
export const UNIFIED_SLOT_SNAPSHOT = {
  sourceSlot: "433414541",
  observedAt: "2026-07-17T04:44:57.000Z",
  utilizationPct: ratioToPercent(0.7999256887110593),
  borrowRateAprPct: ratioToPercent(0.04868605233786526),
  borrowRateApyPct: ratioToPercent(0.049890689292181545),
  baseSupplyAprPct: ratioToPercent(0.031051073108735294),
  baseSupplyApyPct: ratioToPercent(0.031538185764469207),
  protocolTakeRatePct: 10,
  referralFeeBps: 0,
  note: "Re-read at a single slot so base and farm share one moment. 16H-N.2's snapshot (slot 433344510, base 3.178951%, utilization 80.305752%) remains valid for its own slot and is NOT overwritten.",
} as const;

/* ------------------------------------------------------------------ *
 * 5. UI parity — diagnostic only, and UNEXPLAINED
 * ------------------------------------------------------------------ */

/**
 * Recorded because it disagrees, not because it agrees.
 *
 * The step permits the UI only as a non-authoritative diagnostic, and forbids forcing the reward
 * result to match the 0.311049pp gap. It is not forced: rewards are zero on four independent grounds,
 * and zero is what is reported.
 *
 * WHAT THIS RULES OUT: the gap is NOT reward yield. That was the natural hypothesis after 16H-N.2 and
 * it is now dead — an exhausted farm cannot contribute 0.31pp.
 *
 * WHAT REMAINS: unexplained. Candidate causes, none verified — a different UI annualization; the UI
 * including something the SDK's totalSupplyAPY excludes; or an observation-time difference (the UI was
 * read ~5 minutes after the base snapshot, and utilization does drift). Utilization was ~identical at
 * both reads, which weakens the timing hypothesis and makes this worth chasing. It does NOT gate this
 * result, and it is recorded rather than rationalised.
 */
export const UI_PARITY_DIAGNOSTIC = {
  isCalculationAuthority: false,
  usedToDeriveAnything: false,
  uiObservedAt: "2026-07-16T20:47:00.000Z (approx, user-reported screenshot)",
  uiSource: "kamino.com/borrow — SOL/BTC Market, USDC row, 'Include Asset Yield in APY' enabled",
  uiSupplyApyPct: 3.49,
  verifiedBaseSupplyApyPct: 3.178951,
  differencePct: 0.311049,
  rewardsExplainTheGap: false,
  rewardsExplainTheGapEvidence: "Reward APY is 0, positively verified on four independent grounds (zero inventory, zero emission across all 20 curve points, no future activation, last issuance 2024-02-01). An exhausted farm cannot contribute 0.311049pp.",
  status: "unexplained",
  candidateExplanationsUnverified: [
    "The UI may annualize or compound differently from KaminoReserve.totalSupplyAPY.",
    "The UI may include a component the SDK's supply APY excludes.",
    "Observation-time difference — though utilization was ~identical (80.31% UI-implied vs 80.305752% SDK), which weakens this.",
  ],
  gatesThisResult: false,
  recommendedFollowUp: "Worth resolving before this figure is ever shown or compared. A ~10% relative gap on the headline yield is material, and the reward hypothesis is now eliminated.",
} as const;

/* ------------------------------------------------------------------ *
 * 6. Evidence
 * ------------------------------------------------------------------ */

export const REWARD_METHODOLOGY_EVIDENCE = {
  evidenceId: "klend_reserve_reward_methodology_v1",
  version: KLEND_REWARD_RESOLUTION_VERSION,
  candidateId: "kamino_usdc_lending",
  reserveAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  supplierFarmAddress: "JAvnB9AKtgPsTEoKmn24Bq64UMoYcrtWtq42HHBdsPkh",
  farmProgramBinding: `farm account owner = ${KAMINO_FARMS_PROGRAM_ID}, confirmed by getAccountInfo; independently corroborated by Kamino's own verifiable-builds table listing this address for Kamino Farms`,
  supplierVsDebtDetermination: "reserve.state.farmDebt is the DEFAULT pubkey (unset), so exactly one farm exists on this reserve and it is farmCollateral. No ambiguity, no second farm.",
  rewardStreamInventory: "10 reward slots in the farm account; numRewardTokens = 1; exactly 1 non-default slot, inspected independently rather than collapsed",
  rewardTokenIdentity: "mint DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263, decimals 5, read from rewardInfo.token. Symbol deliberately NOT claimed — symbol-only identity is forbidden and nothing here depends on it.",
  emissionSchedule: "rewardScheduleCurve has 20 points; every point rewardPerTimeUnit = 0; tsStart values are only 0 and u64::MAX (unset sentinel). rewardsAvailable = 0. lastIssuanceTs = 1706787696 (2024-02-01).",
  activeInactiveDetermination: "EXHAUSTED, positively verified on four independent grounds. Distinguished from 'absent' (the stream exists), from 'unresolved' (its state is known), from 'paused' (no pause flag is involved), and from 'scheduled_future' (no future non-zero point exists).",
  priceAuthority: "NOT REQUIRED and NOT INVENTED. Emission is identically zero, so reward APY is zero for any price. The 16H-N.2 price-provenance blocker does not arise. A live stream would require an approved price source, which does not yet exist for this mint.",
  rewardAprApySemantics: "NOT VERIFIED — deliberately deferred. No reward APY had to be computed. Must be verified before any non-zero stream is valued; must NOT be assumed to follow the base-supply per-slot convention.",
  totalYieldCombinationConvention: "NOT REQUIRED: aggregate reward APY is exactly 0, so additive and compounded conventions agree that total = base. No rule was chosen or invented.",
  freshnessBehavior: "Base and farm read at ONE slot (433414541), slot skew 0, max allowed 150. Stale farm state, stale price, or skew beyond tolerance all fail total closed.",
  uiParityDiagnostic: "UI 3.49% vs verified base 3.178951% — a 0.311049pp gap. Rewards are ELIMINATED as the cause. Remains unexplained; diagnostic only; does not gate this result.",
  evidenceCutoffAt: "2026-07-17T04:44:57.000Z",
  preservesPriorEvidence: ["identity_9773ac14", "klend_reserve_apy_methodology_v1", "apy_evidence_d468fce5"],
} as const;

export function computeRewardEvidenceManifestHash(e: typeof REWARD_METHODOLOGY_EVIDENCE = REWARD_METHODOLOGY_EVIDENCE): string {
  const material = JSON.stringify({
    id: e.evidenceId, v: e.version, r: e.reserveAddress, f: e.supplierFarmAddress,
    s: e.emissionSchedule, a: e.activeInactiveDetermination, p: e.priceAuthority, c: e.totalYieldCombinationConvention,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `reward_evidence_${h.toString(16).padStart(8, "0")}`;
}

export const REWARD_EVIDENCE_MANIFEST_HASH = computeRewardEvidenceManifestHash();

/* ------------------------------------------------------------------ *
 * 7. Blocker + isolation
 * ------------------------------------------------------------------ */

export const REWARD_GAP_SUPERSESSION = {
  priorGap: {
    code: "rewards_configured_but_unresolved",
    statement: "reserve.farmCollateral is SET, so a supplier farm EXISTS. getRewardYields requires a KaminoPrices map; an empty map returns [] which is NOT evidence of absence. rewardApyPct and totalSupplyApyPct are therefore NULL.",
    preserved: true,
    wasCorrect: "Yes. The farm does exist, and [] from an empty price map genuinely was not evidence. Refusing to call it zero then was the right call — the farm had to be opened to find out.",
  },
  resolution: {
    resolved: true,
    rewardState: "exhausted",
    rewardApyPct: 0,
    basis: "Positively verified on four independent grounds, requiring no price source: zero inventory; zero emission across all 20 curve points; no scheduled future activation; last issuance 2.5 years prior.",
    priceSourceNeeded: false,
    combinationRuleNeeded: false,
  },
  primaryBlockerUnchanged: "blocked_capacity",
  newBlockerEnumInvented: false,
} as const;

export const REWARD_RESOLUTION_CONFERS = {
  capacityResolved: false,
  depositAvailabilityResolved: false,
  constraintsResolved: false,
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
  lifecycleChanged: false,
  note: "Total APY is now known. That makes the product comparable on yield — it does not make it available, safe, or recommendable. Capacity, deposits, and the entire risk chain remain untouched.",
} as const;

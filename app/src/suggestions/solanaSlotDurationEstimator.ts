/**
 * solanaSlotDurationEstimator — deterministic, fail-closed measurement of recent Solana
 * mainnet slot duration.
 *
 * WHY THIS EXISTS
 * ---------------
 * Kamino's borrow-rate curve is denominated in NOMINAL slots (SLOTS_PER_SECOND = 2, i.e. a
 * 500 ms slot). Every KLend rate method converts nominal → wall-clock by:
 *
 *     slotAdjustmentFactor() { return 1000 / SLOTS_PER_SECOND / recentSlotDurationMs; }
 *                            = 500 / recentSlotDurationMs
 *
 * (verified at node_modules/@kamino-finance/klend-sdk/dist/classes/reserve.js:777-779, applied
 * at :783-786 calculateBorrowRate, :818-823 calculateEstimatedBorrowRate, :824-827
 * calculateBorrowAPR.)
 *
 * So the annualized yield DEPENDS ON ACTUAL SOLANA SLOT DURATION. It is therefore inherently an
 * ESTIMATE of a variable rate — not an exact quantity. Real mainnet slots run faster than the
 * 500 ms nominal, which is why a nominal-slot assumption understates the true rate.
 *
 * THE DEFECT THIS CORRECTS
 * ------------------------
 * The repository previously hardcoded 450 ms (wallet/kaminoVaults.ts:23 and
 * scripts/refresh-stable-yield-market-data.mjs:63). Measured mainnet slot duration is ~415 ms.
 * 450 ms is ~8.4% slower than reality and understated every derived rate by ~8.4%. That was a
 * defect against measured reality, independent of any third-party source.
 *
 * POLICY
 * ------
 * No slot duration is permanent network truth. 450, 400, 500 and the Kamino-API-implied ~411 ms
 * are all REJECTED as production constants. Production reads a fresh deterministic measurement or
 * FAILS CLOSED. This module never clamps, normalizes, or falls back to a constant.
 *
 * STRICTLY READ-ONLY: consumes block times and slot numbers. No signing, no transactions.
 */

/* ------------------------------------------------------------------ *
 * 1. Methodology (immutable)
 * ------------------------------------------------------------------ */

export const SLOT_DURATION_METHODOLOGY_ID = "solana_slot_duration_methodology_v1" as const;
export const SLOT_DURATION_METHODOLOGY_VERSION = "1.0.0" as const;

/** Nominal protocol constants. These describe the CURVE'S denomination, never a measurement. */
export const NOMINAL_SLOTS_PER_SECOND = 2 as const;
export const NOMINAL_SLOT_MS = 500 as const;

/**
 * Primary measurement window. 10,000 slots ≈ 69 minutes of wall clock — long enough that a
 * single leader's skipped slots cannot dominate the average, short enough to remain "recent".
 */
export const PRIMARY_WINDOW_SLOTS = 10_000 as const;

/**
 * Validation windows. 2,500 (≈17 min, catches short-term drift) and 50,000 (≈5.8 h, catches a
 * short window that is unrepresentative of sustained conditions). Agreement across all three
 * orders of magnitude is what makes the primary measurement trustworthy.
 */
export const VALIDATION_WINDOW_SLOTS = [2_500, 50_000] as const;

/**
 * Windows must agree within 2% relative to the primary. Justification: observed agreement across
 * the three windows is ~0.17%, an order of magnitude inside this bound, so 2% admits normal
 * network variation while still rejecting a genuinely unrepresentative window.
 */
export const WINDOW_AGREEMENT_TOLERANCE = 0.02 as const;

/**
 * Justified sanity range. Solana's target block time is 400 ms. Sustained congestion/degradation
 * raises the realized average; it does not fall meaningfully below the protocol target. A result
 * outside [300, 800] indicates a measurement fault (bad block time, clock skew, wrong cluster),
 * not a real network condition. Out-of-range FAILS CLOSED — it is never clamped into range.
 */
export const SANITY_RANGE_MS = { minMs: 300, maxMs: 800 } as const;

/**
 * Measurement TTL: 15 minutes. Justified from the rate's expected variability — slot duration is
 * the SLOWEST-MOVING input (three windows spanning 5.8 hours agreed within 0.17%), so 15 minutes
 * is conservative. It reuses the repository's strictest existing canonical bound
 * (yieldStrategyMarketDataPolicy.ts:29, the Safety-Buffer lane) rather than inventing a new one.
 */
export const MEASUREMENT_TTL_MS = 15 * 60 * 1000;

/**
 * Max slots between the reserve state read and the slot-duration observation. Reuses the
 * MAX_SLOT_SKEW = 150 already established for reward resolution (klendReserveRewardResolution.ts),
 * so all KLend observation-boundary rules agree.
 */
export const MAX_RESERVE_MEASUREMENT_SLOT_SKEW = 150 as const;

export const REQUIRED_CLUSTER = "mainnet-beta" as const;

/**
 * Denominator policy. averageSlotDurationMs = elapsedWallClockMs / (endSlot - startSlot).
 * The denominator is the SLOT-NUMBER DIFFERENCE, including skipped slots. Rationale: KLend accrues
 * interest against slot NUMBERS, so the accrual-relevant rate is wall-clock time per slot number.
 * Removing skipped slots, or substituting produced-block or transaction counts, would answer a
 * different question and is explicitly forbidden.
 */
export const DENOMINATOR_POLICY = {
  denominator: "endSlot - startSlot" as const,
  includesSkippedSlots: true,
  rationale:
    "KLend accrues against slot numbers, so wall-clock ms per slot NUMBER is the accrual-relevant rate.",
  forbiddenDenominators: ["produced_block_count", "transaction_count", "non_skipped_slot_count"] as const,
} as const;

/** Slot durations explicitly rejected as permanent production truth. */
export const REJECTED_CONSTANT_MS = {
  450: "Prior repository hardcode. ~8.4% slower than measured reality; understated every derived rate.",
  400: "SDK DEFAULT_RECENT_SLOT_DURATION_MS. A library default, not a measurement of this network now.",
  500: "Nominal curve denomination (SLOTS_PER_SECOND = 2). Describes the curve's units, not real time.",
  411: "Implied by the Kamino API's borrowApy. Inferred from a timestamp-less third party; never adopted.",
} as const;

/* ------------------------------------------------------------------ *
 * 2. Contract
 * ------------------------------------------------------------------ */

export type SlotDurationFailure =
  | "missing_block_time"
  | "null_block_time"
  | "invalid_slot_ordering"
  | "invalid_block_time_ordering"
  | "non_finite_duration"
  | "non_positive_duration"
  | "outside_sanity_range"
  | "window_disagreement"
  | "missing_validation_window"
  | "stale_measurement"
  | "reserve_measurement_skew"
  | "wrong_cluster"
  | "unresolved_rpc_source";

/** One measured window. Every field is recorded so the measurement is auditable. */
export interface SlotWindowObservation {
  windowSlots: number;
  startSlot: number;
  endSlot: number;
  startBlockTime: number | null | undefined;
  endBlockTime: number | null | undefined;
}

export interface SlotDurationInputs {
  cluster: string;
  /** RPC endpoint identity. Must be resolved — an unknown source cannot be evidence. */
  rpcSource: string | undefined;
  observedAt: string;
  nowMs: number;
  primaryWindow: SlotWindowObservation;
  validationWindows: SlotWindowObservation[];
}

export interface ResolvedWindow {
  windowSlots: number;
  startSlot: number;
  endSlot: number;
  slotDifference: number;
  startBlockTime: number;
  endBlockTime: number;
  elapsedMs: number;
  averageSlotDurationMs: number;
}

export type FreshnessState = "fresh" | "stale";

export interface SlotDurationResult {
  ok: boolean;
  failure?: SlotDurationFailure;
  failureDetail?: string;
  methodologyId: typeof SLOT_DURATION_METHODOLOGY_ID;
  methodologyVersion: typeof SLOT_DURATION_METHODOLOGY_VERSION;
  cluster: string;
  rpcSource?: string;
  observedAt: string;
  /** Only present when ok. Never a constant, never clamped. */
  measuredSlotDurationMs?: number;
  slotAdjustmentFactor?: number;
  latestObservedSlot?: number;
  primary?: ResolvedWindow;
  validations?: ResolvedWindow[];
  windowAgreement?: { window: number; relativeDifference: number; withinTolerance: boolean }[];
  measurementAgeMs?: number;
  freshnessTtlMs: number;
  freshnessState?: FreshnessState;
  invalidationReason?: string;
}

/* ------------------------------------------------------------------ *
 * 3. Derivation
 * ------------------------------------------------------------------ */

/**
 * The single place the nominal→wall-clock conversion is expressed. Mirrors the SDK's
 * slotAdjustmentFactor() exactly: 1000 / SLOTS_PER_SECOND / recentSlotDurationMs.
 */
export function computeSlotAdjustmentFactor(measuredSlotDurationMs: number): number {
  return 1000 / NOMINAL_SLOTS_PER_SECOND / measuredSlotDurationMs;
}

function resolveWindow(w: SlotWindowObservation): { ok: true; value: ResolvedWindow } | { ok: false; failure: SlotDurationFailure; detail: string } {
  if (w.startBlockTime === undefined || w.endBlockTime === undefined) {
    return { ok: false, failure: "missing_block_time", detail: `window ${w.windowSlots}: block time absent` };
  }
  if (w.startBlockTime === null || w.endBlockTime === null) {
    return { ok: false, failure: "null_block_time", detail: `window ${w.windowSlots}: block time null (slot not confirmed or pruned)` };
  }
  if (!(w.endSlot > w.startSlot)) {
    return { ok: false, failure: "invalid_slot_ordering", detail: `window ${w.windowSlots}: endSlot ${w.endSlot} !> startSlot ${w.startSlot}` };
  }
  if (!(w.endBlockTime > w.startBlockTime)) {
    return { ok: false, failure: "invalid_block_time_ordering", detail: `window ${w.windowSlots}: endBlockTime ${w.endBlockTime} !> startBlockTime ${w.startBlockTime}` };
  }
  const slotDifference = w.endSlot - w.startSlot;
  const elapsedMs = (w.endBlockTime - w.startBlockTime) * 1000;
  const averageSlotDurationMs = elapsedMs / slotDifference;
  if (!Number.isFinite(averageSlotDurationMs)) {
    return { ok: false, failure: "non_finite_duration", detail: `window ${w.windowSlots}: non-finite duration` };
  }
  if (!(averageSlotDurationMs > 0)) {
    return { ok: false, failure: "non_positive_duration", detail: `window ${w.windowSlots}: duration ${averageSlotDurationMs} <= 0` };
  }
  return { ok: true, value: { windowSlots: w.windowSlots, startSlot: w.startSlot, endSlot: w.endSlot, slotDifference, startBlockTime: w.startBlockTime, endBlockTime: w.endBlockTime, elapsedMs, averageSlotDurationMs } };
}

function fail(i: SlotDurationInputs, failure: SlotDurationFailure, failureDetail: string): SlotDurationResult {
  return {
    ok: false, failure, failureDetail,
    methodologyId: SLOT_DURATION_METHODOLOGY_ID, methodologyVersion: SLOT_DURATION_METHODOLOGY_VERSION,
    cluster: i.cluster, rpcSource: i.rpcSource, observedAt: i.observedAt,
    freshnessTtlMs: MEASUREMENT_TTL_MS, invalidationReason: failureDetail,
  };
}

/**
 * Measure recent slot duration deterministically, or fail closed.
 *
 * There is NO fallback: a failed measurement yields no measuredSlotDurationMs at all, so a caller
 * cannot silently proceed on 400/450/500 ms.
 */
export function measureSlotDuration(i: SlotDurationInputs): SlotDurationResult {
  if (i.cluster !== REQUIRED_CLUSTER) return fail(i, "wrong_cluster", `cluster ${i.cluster} !== ${REQUIRED_CLUSTER}`);
  if (!i.rpcSource || i.rpcSource.trim() === "") return fail(i, "unresolved_rpc_source", "RPC source unresolved; measurement has no provenance");

  const primary = resolveWindow(i.primaryWindow);
  if (!primary.ok) return fail(i, primary.failure, primary.detail);

  for (const required of VALIDATION_WINDOW_SLOTS) {
    if (!i.validationWindows.some((w) => w.windowSlots === required)) {
      return fail(i, "missing_validation_window", `required validation window ${required} slots absent`);
    }
  }

  const validations: ResolvedWindow[] = [];
  for (const w of i.validationWindows) {
    const r = resolveWindow(w);
    if (!r.ok) return fail(i, r.failure, r.detail);
    validations.push(r.value);
  }

  const measured = primary.value.averageSlotDurationMs;

  if (measured < SANITY_RANGE_MS.minMs || measured > SANITY_RANGE_MS.maxMs) {
    return fail(i, "outside_sanity_range", `measured ${measured.toFixed(4)}ms outside justified range [${SANITY_RANGE_MS.minMs}, ${SANITY_RANGE_MS.maxMs}] — not clamped`);
  }

  const windowAgreement = validations.map((v) => {
    const relativeDifference = Math.abs(v.averageSlotDurationMs - measured) / measured;
    return { window: v.windowSlots, relativeDifference, withinTolerance: relativeDifference <= WINDOW_AGREEMENT_TOLERANCE };
  });
  const disagreeing = windowAgreement.find((a) => !a.withinTolerance);
  if (disagreeing) {
    return fail(i, "window_disagreement", `window ${disagreeing.window} differs ${(disagreeing.relativeDifference * 100).toFixed(4)}% from primary, exceeding ${WINDOW_AGREEMENT_TOLERANCE * 100}%`);
  }

  const observedAtMs = Date.parse(i.observedAt);
  const measurementAgeMs = i.nowMs - observedAtMs;
  const freshnessState: FreshnessState = measurementAgeMs <= MEASUREMENT_TTL_MS && measurementAgeMs >= 0 ? "fresh" : "stale";
  if (freshnessState === "stale") {
    return { ...fail(i, "stale_measurement", `measurement age ${measurementAgeMs}ms exceeds TTL ${MEASUREMENT_TTL_MS}ms`), measurementAgeMs, freshnessState };
  }

  return {
    ok: true,
    methodologyId: SLOT_DURATION_METHODOLOGY_ID, methodologyVersion: SLOT_DURATION_METHODOLOGY_VERSION,
    cluster: i.cluster, rpcSource: i.rpcSource, observedAt: i.observedAt,
    measuredSlotDurationMs: measured,
    slotAdjustmentFactor: computeSlotAdjustmentFactor(measured),
    latestObservedSlot: primary.value.endSlot,
    primary: primary.value, validations, windowAgreement,
    measurementAgeMs, freshnessTtlMs: MEASUREMENT_TTL_MS, freshnessState,
  };
}

/**
 * Guard the observation boundary between a reserve state read and a slot-duration measurement.
 * Both must describe the same moment for their combination to mean anything.
 */
export function validateReserveMeasurementSkew(reserveSlot: number, measurementSlot: number): { ok: boolean; failure?: SlotDurationFailure; skewSlots: number; detail?: string } {
  const skewSlots = Math.abs(reserveSlot - measurementSlot);
  if (skewSlots > MAX_RESERVE_MEASUREMENT_SLOT_SKEW) {
    return { ok: false, failure: "reserve_measurement_skew", skewSlots, detail: `reserve slot ${reserveSlot} and measurement slot ${measurementSlot} differ by ${skewSlots} slots, exceeding ${MAX_RESERVE_MEASUREMENT_SLOT_SKEW}` };
  }
  return { ok: true, skewSlots };
}

/* ------------------------------------------------------------------ *
 * 4. Live measurement helper (read-only)
 * ------------------------------------------------------------------ */

/** Minimal structural RPC contract, so this module depends on no particular client class. */
export interface SlotDurationRpc {
  getSlot(): Promise<number>;
  getBlockTime(slot: number): Promise<number | null>;
}

/**
 * Read the three windows from an RPC and measure. Read-only.
 *
 * A block time may be null for a skipped slot; we walk FORWARD from the intended start to the
 * next slot that has one, and record the slot actually used, so the denominator stays honest.
 */
export async function measureSlotDurationLive(rpc: SlotDurationRpc, rpcSource: string, cluster: string = REQUIRED_CLUSTER, nowMs: number = Date.now()): Promise<SlotDurationResult> {
  const endSlot = await rpc.getSlot();
  const endBlockTime = await rpc.getBlockTime(endSlot);

  const readWindow = async (windowSlots: number): Promise<SlotWindowObservation> => {
    let startSlot = endSlot - windowSlots;
    let startBlockTime: number | null = null;
    for (let attempt = 0; attempt < 20 && startBlockTime === null; attempt++) {
      try {
        startBlockTime = await rpc.getBlockTime(startSlot);
      } catch {
        startBlockTime = null;
      }
      if (startBlockTime === null) startSlot++;
    }
    return { windowSlots, startSlot, endSlot, startBlockTime, endBlockTime };
  };

  const primaryWindow = await readWindow(PRIMARY_WINDOW_SLOTS);
  const validationWindows: SlotWindowObservation[] = [];
  for (const w of VALIDATION_WINDOW_SLOTS) validationWindows.push(await readWindow(w));

  return measureSlotDuration({
    cluster, rpcSource, observedAt: new Date(nowMs).toISOString(), nowMs,
    primaryWindow, validationWindows,
  });
}

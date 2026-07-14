/**
 * nativeValidatorMarinadeData — Step 14T. Validator-specific historical APY for the Jupiter
 * native validator from Marinade's PUBLIC validators API (no API key), plus the combine
 * builder that fuses it with the fresh Stakewiz snapshot into a complete native-staking
 * market package.
 *
 *   Stakewiz  → current delegated stake, current APY, commission, status  (current data)
 *   Marinade  → per-epoch validator APY history → trailing-30-day APY      (history)
 *
 * VERIFIED ENDPOINT (2026-07-14, no auth):
 *   GET https://validators-api.marinade.finance/validators?limit=1
 *        &query_vote_accounts=<vote>&epochs=<n>
 *   → { validators: [ { vote_account, identity, info_name, avg_apy, epochs_count,
 *        epoch_stats: [ { epoch, apy, apr, activated_stake, commission_effective,
 *        epoch_start_at, epoch_end_at } ... ] } ] }
 *   `epoch_stats[].apy` is the per-epoch DELEGATOR-facing APY (net of commission), a decimal
 *   ratio; the in-progress current epoch has `apy: null` and is ignored.
 *
 * SAFEGUARDS: validator-specific only. It requires an exact vote-account match, uses
 * `delegatorApy` per-epoch history, and rejects mSOL endpoints, network aggregates, and any
 * other validator. It NEVER uses `api.marinade.finance/msol/apy`, never reuses JupSOL APY/TVL,
 * never uses a network-wide APY, and never approves/selects/updates-live/enables execution.
 */
import {
  parseStakewizValidatorSummary,
  JUPITER_NATIVE_STAKE_VOTE_ACCOUNT,
  NATIVE_VALIDATOR_MARKET_DATA_MAX_AGE_HOURS,
  type NativeValidatorMarketData,
  type NativeValidatorMarketDataMissingField,
} from "./nativeValidatorMarketData";

export const NATIVE_VALIDATOR_MARINADE_DATA_EXISTS = true;
export const NATIVE_VALIDATOR_MARINADE_REQUIRES_API_KEY = false;
export const NATIVE_VALIDATOR_MARINADE_USES_MSOL_APY = false;
export const NATIVE_VALIDATOR_MARINADE_USES_JUPSOL_APY = false;
export const NATIVE_VALIDATOR_MARINADE_USES_NETWORK_APY = false;
export const NATIVE_VALIDATOR_MARINADE_ENABLES_SELECTOR = false;
export const NATIVE_VALIDATOR_MARINADE_ENABLES_TRANSACTIONS = false;
export const NATIVE_VALIDATOR_MARINADE_REQUIRES_SIGNATURE = false;

/** The exact Jupiter validator identity (cross-checks the vote account). */
export const JUPITER_NATIVE_STAKE_IDENTITY = "JUPiTERrZqgf1jUyR7dSkhMx4Kn2qJyekWsg3LT1h4b";

/** The Marinade validators API is the /msol/apy endpoint's OPPOSITE — this is per-validator. */
export const MARINADE_MSOL_APY_ENDPOINT_FORBIDDEN = "api.marinade.finance/msol/apy";

export function marinadeJupiterValidatorHistoryUrl(voteAccount: string = JUPITER_NATIVE_STAKE_VOTE_ACCOUNT, epochs = 18): string {
  return `https://validators-api.marinade.finance/validators?limit=1&query_vote_accounts=${voteAccount}&epochs=${epochs}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

const LAMPORTS_PER_SOL = 1_000_000_000;
const MARINADE_APY_METRIC = "Marinade per-epoch validator APY (delegator-facing, net of validator commission)";
const MARINADE_30D_METHODOLOGY = "Duration-weighted 30-day average of Marinade completed per-epoch validator APY observations (delegator-facing, net of validator commission)";

export interface MarinadeValidatorObservation {
  epoch: number;
  apyPct: number;
  epochStartAt: string;
  epochEndAt: string;
  activatedStakeSol?: number;
  commissionPct?: number;
  metricDefinition: string;
}

export interface MarinadeValidatorHistoryResult {
  provider: "marinade";
  voteAccount?: string;
  identityAccount?: string;
  observations: MarinadeValidatorObservation[];
  latestApyPct?: number;
  latestActivatedStakeSol?: number;
  latestCommissionPct?: number;
  trailing30DayApyPct?: number;
  coverageStart?: string;
  coverageEnd?: string;
  coverageDays?: number;
  latestObservationAgeHours?: number;
  methodology?: string;
  status: "complete" | "partial" | "invalid" | "stale";
  blockers: string[];
  notes: string[];
}

/** Detects the mSOL /msol/apy series shape (array of {value|apy} with no vote account). */
function looksLikeMsolApySeries(payload: unknown): boolean {
  if (!Array.isArray(payload) || payload.length === 0) return false;
  return payload.every((r) => r && typeof r === "object" && !("vote_account" in r) && !("identity" in r) && ("apy" in r || "value" in r));
}

/**
 * Parse the Marinade validators payload into a validator-specific 30-day APY. Requires an
 * exact Jupiter vote-account match; rejects mSOL series, network aggregates, and other
 * validators; sorts + de-dupes observations by epoch; ignores the in-progress epoch; and
 * computes a deterministic duration-weighted trailing-30-day mean of completed per-epoch
 * delegator APY. Fails closed with specific blockers.
 */
export function parseJupiterValidatorHistoryFromMarinade(
  payload: unknown,
  options: { expectedVoteAccount?: string; checkedAt: string; windowDays?: number } = { checkedAt: new Date().toISOString() },
): MarinadeValidatorHistoryResult {
  const expectedVoteAccount = options.expectedVoteAccount ?? JUPITER_NATIVE_STAKE_VOTE_ACCOUNT;
  const windowDays = options.windowDays ?? 30;
  const blockers: string[] = [];
  const notes: string[] = [];

  if (looksLikeMsolApySeries(payload)) {
    return { provider: "marinade", observations: [], status: "invalid", blockers: ["marinade_msol_data_rejected"], notes: ["Payload looks like the mSOL /msol/apy series (no vote account) — rejected; this is not Jupiter Native Stake validator data."] };
  }
  if (!payload || typeof payload !== "object") {
    return { provider: "marinade", observations: [], status: "invalid", blockers: ["marinade_payload_invalid"], notes: ["Marinade payload is not an object."] };
  }
  const validators = (payload as { validators?: unknown }).validators;
  if (!Array.isArray(validators)) {
    return { provider: "marinade", observations: [], status: "invalid", blockers: ["marinade_schema_unrecognized"], notes: ["Marinade payload has no validators[] array (possible network aggregate) — rejected."] };
  }
  const v = validators.find((e) => e && typeof e === "object" && (e as Record<string, unknown>).vote_account === expectedVoteAccount) as Record<string, unknown> | undefined;
  if (!v) {
    // If validators exist but none match, it's a mismatch (or an aggregate with no vote account).
    const anyVote = validators.some((e) => e && typeof e === "object" && typeof (e as Record<string, unknown>).vote_account === "string");
    if (!anyVote) return { provider: "marinade", observations: [], status: "invalid", blockers: ["marinade_network_data_rejected"], notes: ["No per-validator vote_account present (network aggregate) — rejected."] };
    return { provider: "marinade", observations: [], status: "invalid", blockers: ["marinade_vote_account_mismatch"], notes: [`Jupiter vote account ${expectedVoteAccount} not found among returned validators.`] };
  }
  const voteAccount = v.vote_account as string;
  const identityAccount = typeof v.identity === "string" ? v.identity : undefined;

  const epochStats = v.epoch_stats;
  if (!Array.isArray(epochStats) || epochStats.length === 0) {
    return { provider: "marinade", voteAccount, identityAccount, observations: [], status: "invalid", blockers: ["marinade_history_missing"], notes: ["No epoch_stats history for the Jupiter validator."] };
  }

  // Build observations from COMPLETED epochs (apy != null); require timestamps + finite apy.
  const byEpoch = new Map<number, MarinadeValidatorObservation>();
  let missingTimestamps = false;
  for (const r0 of epochStats) {
    if (!r0 || typeof r0 !== "object") continue;
    const r = r0 as Record<string, unknown>;
    const apy = num(r.apy);
    if (apy == null) continue; // in-progress / missing epoch — ignored
    if (apy < 0) { blockers.push("marinade_apy_invalid"); continue; }
    const epoch = num(r.epoch);
    const start = typeof r.epoch_start_at === "string" ? r.epoch_start_at : undefined;
    const end = typeof r.epoch_end_at === "string" ? r.epoch_end_at : undefined;
    if (epoch == null) continue;
    if (!start || !end) { missingTimestamps = true; continue; }
    const stakeLamports = num(r.activated_stake);
    byEpoch.set(epoch, {
      epoch,
      apyPct: round4(apy * 100),
      epochStartAt: start,
      epochEndAt: end,
      ...(stakeLamports != null ? { activatedStakeSol: round2(stakeLamports / LAMPORTS_PER_SOL) } : {}),
      ...(num(r.commission_effective) != null ? { commissionPct: num(r.commission_effective) } : {}),
      metricDefinition: MARINADE_APY_METRIC,
    });
  }
  if (missingTimestamps && byEpoch.size === 0) {
    return { provider: "marinade", voteAccount, identityAccount, observations: [], status: "invalid", blockers: ["marinade_timestamps_missing"], notes: ["Completed epochs lack start/end timestamps required for the 30-day calculation."] };
  }
  // Deterministic chronological sort (de-duped by epoch via the Map).
  const observations = [...byEpoch.values()].sort((a, b) => a.epoch - b.epoch);
  if (observations.length === 0) {
    return { provider: "marinade", voteAccount, identityAccount, observations: [], status: "invalid", blockers: ["marinade_history_insufficient"], notes: ["No completed epoch observations with valid apy + timestamps."] };
  }

  const ms = (s: string) => Date.parse(s);
  const newest = observations[observations.length - 1];
  const newestEnd = ms(newest.epochEndAt);
  const windowStart = newestEnd - windowDays * 86400_000;
  const inWindow = observations.filter((o) => ms(o.epochEndAt) > windowStart);
  const coverageStart = inWindow[0]?.epochStartAt;
  const coverageEnd = newest.epochEndAt;
  const coverageDays = coverageStart ? round2((newestEnd - ms(coverageStart)) / 86400_000) : 0;

  // Duration-weighted mean over completed epochs in the trailing-30-day window.
  let numr = 0;
  let den = 0;
  for (const o of inWindow) {
    const dur = ms(o.epochEndAt) - ms(o.epochStartAt);
    if (dur <= 0) continue;
    numr += o.apyPct * dur;
    den += dur;
  }
  const trailing30DayApyPct = den > 0 ? round2(numr / den) : undefined;

  const checkedMs = Date.parse(options.checkedAt);
  const latestObservationAgeHours = round2((checkedMs - newestEnd) / 3_600_000);

  // Quality gates.
  if (inWindow.length < 5) blockers.push("marinade_history_insufficient");
  if (coverageDays < 28) blockers.push("marinade_coverage_insufficient");
  if (trailing30DayApyPct == null) blockers.push("marinade_apy_invalid");
  // Latest COMPLETED epoch must not be too old (epoch cadence ~2 days; allow 96h for the
  // in-progress epoch not yet closing). Documented threshold.
  const MAX_LATEST_AGE_HOURS = 96;
  const isStale = latestObservationAgeHours > MAX_LATEST_AGE_HOURS || latestObservationAgeHours < 0;
  if (isStale) blockers.push("marinade_data_stale");

  const status: MarinadeValidatorHistoryResult["status"] = isStale ? "stale" : blockers.length === 0 ? "complete" : "partial";

  notes.push(`${MARINADE_30D_METHODOLOGY}: ${trailing30DayApyPct}% over ${coverageDays} days (${inWindow.length} completed epochs ${inWindow[0]?.epoch}-${newest.epoch}) for vote account ${voteAccount}. Latest completed epoch ended ${coverageEnd} (${latestObservationAgeHours}h before checkedAt). Not mSOL APY. Not network-wide.`);

  return {
    provider: "marinade",
    voteAccount,
    identityAccount,
    observations,
    latestApyPct: newest.apyPct,
    ...(newest.activatedStakeSol != null ? { latestActivatedStakeSol: newest.activatedStakeSol } : {}),
    ...(newest.commissionPct != null ? { latestCommissionPct: newest.commissionPct } : {}),
    ...(trailing30DayApyPct != null ? { trailing30DayApyPct } : {}),
    ...(coverageStart ? { coverageStart } : {}),
    coverageEnd,
    coverageDays,
    latestObservationAgeHours,
    methodology: MARINADE_30D_METHODOLOGY,
    status,
    blockers: [...new Set(blockers)],
    notes,
  };
}

/* ------------------------------------------------------------------ *
 * Combine builder — Stakewiz current data + Marinade 30-day history.
 * ------------------------------------------------------------------ */
export interface BuildJupiterNativeStakeMarketPackageInput {
  stakewizPayload?: unknown;
  stakewizFetchedAt?: string;
  marinadePayload?: unknown;
  marinadeFetchedAt?: string;
  solPriceUsd?: number;
  checkedAt?: string;
  /** Percent difference above which a Marinade-vs-Stakewiz stake/commission discrepancy blocks. */
  discrepancyPctThreshold?: number;
}

/**
 * Build the complete native-validator market package: Stakewiz supplies delegated stake +
 * current APY + commission + status; Marinade supplies the trailing-30-day APY. `complete`
 * only when the exact Jupiter vote account is verified on BOTH sources, Stakewiz is fresh and
 * not delinquent, all current fields exist, and Marinade's 30-day history passes coverage +
 * freshness. Cross-checks Marinade's latest stake/commission against Stakewiz and records the
 * difference; a material discrepancy blocks. Never uses mSOL/JupSOL/network-wide data.
 */
export function buildJupiterNativeStakeMarketPackage(input: BuildJupiterNativeStakeMarketPackageInput): NativeValidatorMarketData {
  const voteAccount = JUPITER_NATIVE_STAKE_VOTE_ACCOUNT;
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const notes: string[] = [];
  const blockers: string[] = [];

  const sw = input.stakewizPayload !== undefined ? parseStakewizValidatorSummary(input.stakewizPayload, { voteAccount }) : undefined;
  if (sw) { blockers.push(...sw.blockers); notes.push(...sw.notes); }
  else { blockers.push("missing_activated_stake", "missing_commission", "missing_current_apy"); notes.push("No Stakewiz payload supplied."); }

  const mar = input.marinadePayload !== undefined ? parseJupiterValidatorHistoryFromMarinade(input.marinadePayload, { expectedVoteAccount: voteAccount, checkedAt, windowDays: 30 }) : undefined;
  if (mar) { blockers.push(...mar.blockers); notes.push(...mar.notes); }
  else { blockers.push("missing_apy_30d", "marinade_history_missing"); notes.push("No Marinade payload supplied."); }

  const activatedStakeSol = sw?.activatedStakeSol;
  const commissionPct = sw?.commissionPct;
  const currentApyPct = sw?.currentApyPct;
  const apy30dPct = mar?.status === "complete" ? mar?.trailing30DayApyPct : undefined;
  if (mar && mar.status !== "complete") blockers.push("missing_apy_30d");

  const delegatedStakeUsd = activatedStakeSol != null && typeof input.solPriceUsd === "number" ? round2(activatedStakeSol * input.solPriceUsd) : undefined;

  // Cross-check Marinade latest stake/commission vs Stakewiz.
  const threshold = input.discrepancyPctThreshold ?? 5;
  if (mar?.latestActivatedStakeSol != null && activatedStakeSol != null && activatedStakeSol > 0) {
    const pctDiff = round2((Math.abs(mar.latestActivatedStakeSol - activatedStakeSol) / activatedStakeSol) * 100);
    notes.push(`Stake cross-check: Stakewiz ${activatedStakeSol} SOL vs Marinade ${mar.latestActivatedStakeSol} SOL (diff ${pctDiff}%). Stakewiz kept as primary; not overwritten.`);
    if (pctDiff > threshold) { blockers.push("stake_cross_check_discrepancy"); notes.push("Material stake discrepancy flagged for review."); }
  }
  if (mar?.latestCommissionPct != null && commissionPct != null && Math.abs(mar.latestCommissionPct - commissionPct) > 1) {
    blockers.push("commission_cross_check_discrepancy");
    notes.push(`Commission cross-check mismatch: Stakewiz ${commissionPct}% vs Marinade ${mar.latestCommissionPct}%.`);
  }

  const missingFields: NativeValidatorMarketDataMissingField[] = [];
  if (activatedStakeSol == null) missingFields.push("activatedStakeSol");
  if (commissionPct == null) missingFields.push("commissionPct");
  if (currentApyPct == null) missingFields.push("currentApyPct");
  if (apy30dPct == null) missingFields.push("apy30dPct");

  // Freshness — Stakewiz must be fresh; stale Stakewiz must not combine with fresh Marinade.
  const evalTime = Date.parse(checkedAt);
  const maxAgeMs = NATIVE_VALIDATOR_MARKET_DATA_MAX_AGE_HOURS * 60 * 60 * 1000;
  const isFresh = (ts?: string) => {
    if (!ts) return false;
    const t = Date.parse(ts);
    const age = evalTime - t;
    return !Number.isNaN(t) && !Number.isNaN(evalTime) && age >= 0 && age <= maxAgeMs;
  };
  const swFresh = input.stakewizPayload !== undefined ? isFresh(input.stakewizFetchedAt) : false;
  const marStale = mar?.status === "stale";
  if (input.stakewizPayload !== undefined && !swFresh) { blockers.push("stale_market_data"); notes.push("Stakewiz snapshot is stale (>24h) — not combined with Marinade."); }
  if (marStale) { blockers.push("stale_market_data"); notes.push("Marinade history is stale."); }

  const anyStale = (input.stakewizPayload !== undefined && !swFresh) || marStale;
  const presentCount = [activatedStakeSol, commissionPct, currentApyPct, apy30dPct].filter((x) => x != null).length;
  let status: NativeValidatorMarketData["status"];
  if (anyStale && presentCount > 0) status = "stale";
  else if (presentCount === 0) status = "missing";
  else if (missingFields.length === 0) status = "complete";
  else status = "partial";

  const fetchedAt = [input.stakewizFetchedAt, input.marinadeFetchedAt].filter((s): s is string => !!s).sort()[0] ?? checkedAt;
  const dedupe = (arr: string[]) => [...new Set(arr)];

  return {
    protocolId: "jupiter_native_stake",
    protocolName: "Jupiter Native Stake",
    assetSymbol: "SOL",
    candidateType: "native_staking",
    voteAccount,

    ...(activatedStakeSol != null ? { activatedStakeSol } : {}),
    ...(delegatedStakeUsd != null ? { delegatedStakeUsd } : {}),
    ...(commissionPct != null ? { commissionPct } : {}),
    ...(currentApyPct != null ? { currentApyPct } : {}),
    ...(apy30dPct != null ? { apy30dPct } : {}),

    stakeSource: "stakewiz",
    ...(currentApyPct != null ? { currentApySource: "stakewiz" as const } : {}),
    ...(apy30dPct != null ? { apy30dSource: "marinade" as const } : {}),

    fetchedAt,
    asOf: checkedAt,

    status,
    missingFields,

    notes: dedupe(notes),
    blockers: dedupe(blockers),

    isLiquidStakingToken: false,
    splTokenMint: null,
    updatesLiveRecommendations: false,
    enablesSelectorComparison: false,
    transactionsEnabled: false,
    walletSignatureRequired: false,
  };
}

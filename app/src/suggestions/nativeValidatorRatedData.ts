/**
 * nativeValidatorRatedData — Step 14S. Combines validator-specific market data from two
 * sources into a COMPLETE native-staking market package:
 *   • Stakewiz  → activated (delegated) stake, commission, current APY  (14R real source)
 *   • Rated     → validator-specific 30-day DELEGATOR APY (window=30d)   (the missing field)
 *
 * The Rated summary is fetched SERVER-SIDE only (see scripts/fetch-rated-jupiter-native-stake.mjs);
 * the API key is read from `process.env.RATED_API_KEY` and never touches the browser bundle,
 * is never hardcoded, and is never logged. This module only PARSES/COMBINES payloads that a
 * server-side caller supplies — it performs no network I/O and imports no secret.
 *
 * SAFEGUARDS: validator-specific only. It uses Rated's `delegatorApy` (net of commission),
 * never `validatorApy`; requires an exact vote-account match + the 30-day window; never
 * reuses JupSOL APY/TVL; never uses a network-wide APY; and never approves, selects, updates
 * live recommendations, or enables any transaction/signature path. Native staking is a native
 * stake account (`isLiquidStakingToken: false`, `splTokenMint: null`), not JupSOL.
 */
import {
  parseNativeValidatorApyFromRatedSummary,
  JUPITER_NATIVE_STAKE_VOTE_ACCOUNT,
  NATIVE_VALIDATOR_MARKET_DATA_MAX_AGE_HOURS,
  type NativeValidatorMarketData,
  type NativeValidatorMarketDataMissingField,
  type RatedWindow,
} from "./nativeValidatorMarketData";

/** The env var (server-side only) that holds the Rated API key. NOT the VITE_ prefix. */
export const RATED_API_KEY_ENV_VAR = "RATED_API_KEY";
export const RATED_SOLANA_VALIDATOR_SUMMARY_WINDOW: RatedWindow = "30d";

/** The Rated single-validator summary endpoint for the Jupiter native validator. */
export function ratedJupiterNativeStakeSummaryUrl(voteAccount: string = JUPITER_NATIVE_STAKE_VOTE_ACCOUNT): string {
  return `https://api.rated.network/v1/solana/validators/${voteAccount}/summary?window=${RATED_SOLANA_VALIDATOR_SUMMARY_WINDOW}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/* ------------------------------------------------------------------ *
 * Stakewiz validator parser — activated stake + commission + current APY.
 * ------------------------------------------------------------------ */
export interface StakewizValidatorParseResult {
  matched: boolean;
  activatedStakeSol?: number;
  commissionPct?: number;
  currentApyPct?: number;
  blockers: string[];
  notes: string[];
}

function stakewizList(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload;
  const p = payload as { validators?: unknown; data?: unknown } | null;
  if (p && Array.isArray(p.validators)) return p.validators;
  if (p && Array.isArray(p.data)) return p.data;
  if (p && typeof p === "object" && ("vote_identity" in p || "voteAccount" in p)) return [p];
  return null;
}

/**
 * Parse a Stakewiz validator payload for activated stake (SOL), commission, and current APY.
 * Stakewiz `commission` is expressed in basis-point-like hundredths (e.g. 500 → 5.00%), so a
 * value above 100 is divided by 100. Current APY comes from `apy_estimate`.
 */
export function parseStakewizValidatorSummary(
  payload: unknown,
  options: { voteAccount?: string } = {},
): StakewizValidatorParseResult {
  const voteAccount = options.voteAccount ?? JUPITER_NATIVE_STAKE_VOTE_ACCOUNT;
  const list = stakewizList(payload);
  if (!list) return { matched: false, blockers: ["stakewiz_schema_unrecognized"], notes: ["Stakewiz payload schema not recognized."] };
  const v = list.find((e) => e && typeof e === "object" && ((e as Record<string, unknown>).vote_identity === voteAccount || (e as Record<string, unknown>).voteAccount === voteAccount)) as Record<string, unknown> | undefined;
  if (!v) return { matched: false, blockers: ["stakewiz_vote_account_not_found"], notes: [`Jupiter vote account ${voteAccount} not found in Stakewiz payload.`] };

  const blockers: string[] = [];
  const activatedStakeSol = num(v.activated_stake);
  if (activatedStakeSol == null) blockers.push("missing_activated_stake");
  const rawCommission = num(v.commission);
  const commissionPct = rawCommission == null ? undefined : round2(rawCommission > 100 ? rawCommission / 100 : rawCommission);
  if (commissionPct == null) blockers.push("missing_commission");
  const currentApyPct = num(v.apy_estimate) ?? num(v.apy);
  if (currentApyPct == null) blockers.push("missing_current_apy");

  return {
    matched: true,
    ...(activatedStakeSol != null ? { activatedStakeSol: round2(activatedStakeSol) } : {}),
    ...(commissionPct != null ? { commissionPct } : {}),
    ...(currentApyPct != null ? { currentApyPct } : {}),
    blockers,
    notes: [`Stakewiz validator-specific: activated stake ${activatedStakeSol} SOL, commission ${commissionPct}%, current APY ${currentApyPct}%.`],
  };
}

/* ------------------------------------------------------------------ *
 * Combine builder — Stakewiz stake/current-APY + Rated 30-day delegator APY.
 * ------------------------------------------------------------------ */
export interface BuildJupiterNativeStakeMarketPackageInput {
  stakewizPayload?: unknown;
  stakewizFetchedAt?: string;
  ratedPayload?: unknown;
  ratedFetchedAt?: string;
  solPriceUsd?: number;
  checkedAt?: string;
  /** Percent difference above which a stake cross-check discrepancy is flagged for review. */
  stakeDiscrepancyPctThreshold?: number;
}

/**
 * Build the complete native-validator market package by combining the fresh Stakewiz snapshot
 * (stake, commission, current APY) with Rated's fresh 30-day delegator APY. Status is
 * `complete` only when both sources are valid AND fresh (24h). If Stakewiz is stale, fresh
 * Rated data is NOT combined with it (status `stale`). Cross-checks Rated `totalStake` against
 * Stakewiz `activated_stake`, recording both and flagging a meaningful discrepancy — never
 * silently overwriting one with the other.
 */
export function buildJupiterNativeStakeMarketPackage(input: BuildJupiterNativeStakeMarketPackageInput): NativeValidatorMarketData {
  const voteAccount = JUPITER_NATIVE_STAKE_VOTE_ACCOUNT;
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const notes: string[] = [];
  const blockers: string[] = [];

  const sw = input.stakewizPayload !== undefined ? parseStakewizValidatorSummary(input.stakewizPayload, { voteAccount }) : undefined;
  if (sw) { blockers.push(...sw.blockers); notes.push(...sw.notes); }
  else { blockers.push("missing_activated_stake", "missing_commission", "missing_current_apy"); notes.push("No Stakewiz payload supplied."); }

  const rated = input.ratedPayload !== undefined
    ? parseNativeValidatorApyFromRatedSummary(input.ratedPayload, { expectedVoteAccount: voteAccount, expectedWindow: "30d" })
    : undefined;
  if (rated) { blockers.push(...rated.blockers); notes.push(...rated.notes); }
  else { blockers.push("missing_apy_30d", "rated_delegator_apy_missing"); notes.push("No Rated 30-day summary supplied."); }

  const activatedStakeSol = sw?.activatedStakeSol;
  const commissionPct = rated?.voteCommissionPct ?? sw?.commissionPct; // Rated commission preferred; Stakewiz corroborates.
  const currentApyPct = sw?.currentApyPct;
  const apy30dPct = rated?.status === "complete" ? rated?.delegatorApyPct : undefined;
  if (rated && rated.status !== "complete") blockers.push("missing_apy_30d");

  const delegatedStakeUsd = activatedStakeSol != null && typeof input.solPriceUsd === "number" ? round2(activatedStakeSol * input.solPriceUsd) : undefined;

  // Cross-check Rated totalStake vs Stakewiz activated_stake.
  if (rated?.totalStakeSol != null && activatedStakeSol != null) {
    const diff = Math.abs(rated.totalStakeSol - activatedStakeSol);
    const pctDiff = activatedStakeSol > 0 ? round2((diff / activatedStakeSol) * 100) : 0;
    notes.push(`Stake cross-check: Stakewiz ${activatedStakeSol} SOL vs Rated ${rated.totalStakeSol} SOL (diff ${pctDiff}%). Recorded both; not overwritten.`);
    if (pctDiff > (input.stakeDiscrepancyPctThreshold ?? 10)) { blockers.push("stake_cross_check_discrepancy"); notes.push("Meaningful stake discrepancy flagged for review."); }
  }

  const missingFields: NativeValidatorMarketDataMissingField[] = [];
  if (activatedStakeSol == null) missingFields.push("activatedStakeSol");
  if (commissionPct == null) missingFields.push("commissionPct");
  if (currentApyPct == null) missingFields.push("currentApyPct");
  if (apy30dPct == null) missingFields.push("apy30dPct");

  // Freshness — BOTH sources must be fresh; stale Stakewiz must not combine with fresh Rated.
  const evalTime = Date.parse(checkedAt);
  const maxAgeMs = NATIVE_VALIDATOR_MARKET_DATA_MAX_AGE_HOURS * 60 * 60 * 1000;
  const isFresh = (ts?: string) => {
    if (!ts) return false;
    const t = Date.parse(ts);
    const age = evalTime - t;
    return !Number.isNaN(t) && !Number.isNaN(evalTime) && age >= 0 && age <= maxAgeMs;
  };
  const swFresh = input.stakewizPayload !== undefined ? isFresh(input.stakewizFetchedAt) : false;
  const ratedFresh = input.ratedPayload !== undefined ? isFresh(input.ratedFetchedAt) : false;
  const anyStale = (input.stakewizPayload !== undefined && !swFresh) || (input.ratedPayload !== undefined && !ratedFresh);
  if (input.stakewizPayload !== undefined && !swFresh) { blockers.push("stale_market_data"); notes.push("Stakewiz snapshot is stale (>24h) — not combined with Rated."); }
  if (input.ratedPayload !== undefined && !ratedFresh) { blockers.push("stale_market_data"); notes.push("Rated 30-day summary is stale (>24h)."); }

  const presentCount = [activatedStakeSol, commissionPct, currentApyPct, apy30dPct].filter((v) => v != null).length;
  let status: NativeValidatorMarketData["status"];
  if (anyStale && presentCount > 0) status = "stale";
  else if (presentCount === 0) status = "missing";
  else if (missingFields.length === 0) status = "complete";
  else status = "partial";

  // Use the older of the two fetch timestamps as the package fetchedAt (most conservative).
  const fetchedAt = [input.stakewizFetchedAt, input.ratedFetchedAt].filter((s): s is string => !!s).sort()[0] ?? checkedAt;
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
    ...(apy30dPct != null ? { apy30dSource: "rated" as const } : {}),

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

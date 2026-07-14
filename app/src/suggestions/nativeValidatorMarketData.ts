/**
 * nativeValidatorMarketData — Step 14Q. A market-data ADAPTER (parsers + builder +
 * evidence-conversion bridge) for the Native SOL / Jupiter Native Stake baseline. It is the
 * plumbing that can, later, supply the three market fields (delegated stake, current APY,
 * 30-day APY) that leave the native-staking baseline blocked in 14P.
 *
 * OPTION C — HYBRID SOURCE MODEL:
 *   • Solana RPC `getVoteAccounts` is the SOURCE OF TRUTH for the validator's activated
 *     (delegated) stake and commission.
 *   • A validator ANALYTICS provider (Stakewiz → Solana Compass → Validators.app) supplies
 *     current APY and 30-day APY history (validator-specific).
 *
 * SAFEGUARDS (baked in): this NEVER reuses JupSOL's APY or TVL, never uses a network-wide
 * APY to unblock this candidate, never approves native staking, never enables the selector
 * comparison, never updates live recommendations, and never touches transactions/signatures.
 * It is a NATIVE STAKE ACCOUNT (delegated SOL) — `isLiquidStakingToken: false`,
 * `splTokenMint: null` — and must never be confused with JupSOL (an SPL LST token).
 *
 * ADAPTER ONLY: no live network fetch is wired into the app/UI here (the project has no
 * approved production fetch pattern for this). The parsers/builder are deterministic and
 * fixture-driven; a later backend/job can call the real endpoints and feed the raw payloads
 * in. In 14Q the native evidence array is NOT filled, so the baseline stays blocked.
 */
import type {
  NativeSolStakeEvidenceInput,
  NativeSolStakeReviewerRole,
} from "./solNativeStakingBaselineEvidence";

export const NATIVE_VALIDATOR_MARKET_DATA_EXISTS = true;
export const NATIVE_VALIDATOR_MARKET_DATA_USES_RPC_FOR_STAKE = true;
export const NATIVE_VALIDATOR_MARKET_DATA_USES_ANALYTICS_FOR_APY = true;
export const NATIVE_VALIDATOR_MARKET_DATA_USES_JUPSOL_APY = false;
export const NATIVE_VALIDATOR_MARKET_DATA_USES_JUPSOL_TVL = false;
export const NATIVE_VALIDATOR_MARKET_DATA_ENABLES_NATIVE_APPROVAL = false;
export const NATIVE_VALIDATOR_MARKET_DATA_ENABLES_SELECTOR_COMPARISON = false;
export const NATIVE_VALIDATOR_MARKET_DATA_UPDATES_LIVE_RECOMMENDATIONS = false;
export const NATIVE_VALIDATOR_MARKET_DATA_ENABLES_TRANSACTIONS = false;
export const NATIVE_VALIDATOR_MARKET_DATA_REQUIRES_WALLET_SIGNATURE = false;

export const JUPITER_NATIVE_STAKE_PROTOCOL_ID = "jupiter_native_stake" as const;
export const JUPITER_NATIVE_STAKE_VOTE_ACCOUNT = "CatzoSMUkTRidT5DwBxAC2pEtnwMBTpkCepHkFgZDiqb";
export const NATIVE_VALIDATOR_MARKET_DATA_MAX_AGE_HOURS = 24;

const LAMPORTS_PER_SOL = 1_000_000_000;
const round2 = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ *
 * Types.
 * ------------------------------------------------------------------ */
export type NativeValidatorMarketDataSource =
  | "solana_rpc_get_vote_accounts"
  | "stakewiz"
  | "solana_compass"
  | "validators_app"
  | "unavailable";

export type NativeValidatorApyProvider = "stakewiz" | "solana_compass" | "validators_app";

export type NativeValidatorMarketDataStatus = "complete" | "partial" | "missing" | "stale" | "source_error" | "unsupported";

export type NativeValidatorMarketDataMissingField = "activatedStakeSol" | "commissionPct" | "currentApyPct" | "apy30dPct";

export interface NativeValidatorMarketData {
  protocolId: "jupiter_native_stake";
  protocolName: "Jupiter Native Stake";
  assetSymbol: "SOL";
  candidateType: "native_staking";
  voteAccount: string;

  activatedStakeSol?: number;
  activatedStakeLamports?: number;
  delegatedStakeUsd?: number;

  commissionPct?: number;

  currentApyPct?: number;
  apy30dPct?: number;

  currentEpoch?: number;
  asOfSlot?: number;

  stakeSource: "solana_rpc_get_vote_accounts";
  apySource?: NativeValidatorApyProvider;

  fetchedAt: string;
  asOf?: string;

  status: NativeValidatorMarketDataStatus;
  missingFields: NativeValidatorMarketDataMissingField[];

  notes: string[];
  blockers: string[];

  isLiquidStakingToken: false;
  splTokenMint: null;

  updatesLiveRecommendations: false;
  enablesSelectorComparison: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

/* ------------------------------------------------------------------ *
 * (3) RPC parser — Solana `getVoteAccounts` (source of truth for stake + commission).
 * ------------------------------------------------------------------ */
export interface RpcVoteAccountParseResult {
  found: boolean;
  delinquent: boolean;
  activatedStakeSol?: number;
  activatedStakeLamports?: number;
  commissionPct?: number;
  currentEpoch?: number;
  asOfSlot?: number;
  blockers: string[];
  notes: string[];
}

interface VoteAccountEntry {
  votePubkey?: string;
  activatedStake?: number;
  commission?: number;
}

/**
 * Parse a raw `getVoteAccounts` response for the Jupiter validator. Looks in
 * `result.current` and `result.delinquent`, converts activated stake lamports → SOL, reads
 * the integer commission as a percent, and flags a not-found or delinquent validator. It
 * NEVER computes APY, approves native staking, or updates UI.
 */
export function parseJupiterNativeStakeVoteAccountFromGetVoteAccounts(
  response: unknown,
  options: { currentEpoch?: number; asOfSlot?: number; voteAccount?: string } = {},
): RpcVoteAccountParseResult {
  const voteAccount = options.voteAccount ?? JUPITER_NATIVE_STAKE_VOTE_ACCOUNT;
  const blockers: string[] = [];
  const notes: string[] = [];

  const result = (response as { result?: { current?: unknown; delinquent?: unknown } })?.result;
  const current = Array.isArray(result?.current) ? (result?.current as VoteAccountEntry[]) : [];
  const delinquent = Array.isArray(result?.delinquent) ? (result?.delinquent as VoteAccountEntry[]) : [];
  if (!result || (!Array.isArray(result?.current) && !Array.isArray(result?.delinquent))) {
    return { found: false, delinquent: false, blockers: ["vote_account_not_found", "source_schema_unrecognized"], notes: ["getVoteAccounts response missing result.current/result.delinquent arrays."] };
  }

  const inCurrent = current.find((v) => v.votePubkey === voteAccount);
  const inDelinquent = delinquent.find((v) => v.votePubkey === voteAccount);
  const entry = inCurrent ?? inDelinquent;
  const isDelinquent = !inCurrent && !!inDelinquent;

  if (!entry) {
    return { found: false, delinquent: false, blockers: ["vote_account_not_found"], notes: [`Vote account ${voteAccount} not found in getVoteAccounts current/delinquent sets.`] };
  }
  if (isDelinquent) {
    blockers.push("validator_delinquent");
    notes.push("Jupiter validator is currently in the delinquent set.");
  }

  const lamports = typeof entry.activatedStake === "number" ? entry.activatedStake : undefined;
  const activatedStakeSol = lamports != null ? round2(lamports / LAMPORTS_PER_SOL) : undefined;
  if (lamports == null) { blockers.push("missing_activated_stake"); notes.push("activatedStake missing/non-numeric on the vote account entry."); }
  const commissionPct = typeof entry.commission === "number" ? entry.commission : undefined;
  if (commissionPct == null) { blockers.push("missing_commission"); notes.push("commission missing/non-numeric on the vote account entry."); }

  return {
    found: true,
    delinquent: isDelinquent,
    ...(activatedStakeSol != null ? { activatedStakeSol } : {}),
    ...(lamports != null ? { activatedStakeLamports: lamports } : {}),
    ...(commissionPct != null ? { commissionPct } : {}),
    ...(options.currentEpoch != null ? { currentEpoch: options.currentEpoch } : {}),
    ...(options.asOfSlot != null ? { asOfSlot: options.asOfSlot } : {}),
    blockers,
    notes,
  };
}

/* ------------------------------------------------------------------ *
 * (4) Analytics APY parser — provider-agnostic, defensive, fixture-driven.
 * ------------------------------------------------------------------ */
export interface AnalyticsApyParseResult {
  matchedValidator: boolean;
  schemaRecognized: boolean;
  networkWideOnly: boolean;
  currentApyPct?: number;
  apy30dPct?: number;
  apyHistoryCount?: number;
  blockers: string[];
  notes: string[];
}

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** Pull a validator array out of the various provider envelope shapes. */
function analyticsValidatorList(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload;
  const p = payload as { validators?: unknown; data?: unknown } | null;
  if (p && Array.isArray(p.validators)) return p.validators;
  if (p && Array.isArray(p.data)) return p.data;
  // A single validator object (not an envelope) is treated as a 1-element list.
  if (p && typeof p === "object" && ("vote_identity" in p || "voteAccount" in p || "vote_account" in p || "account" in p)) return [p];
  return null;
}

function validatorVoteKey(v: Record<string, unknown>): string | undefined {
  return (v.vote_identity as string) ?? (v.voteAccount as string) ?? (v.vote_account as string) ?? (v.account as string) ?? (v.votePubkey as string);
}

/** Extract a validator-specific APY history array of numbers, if the shape provides one. */
function extractApyHistory(v: Record<string, unknown>): number[] {
  const raw = (v.apy_history ?? v.apyHistory ?? v.history) as unknown;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((h) => {
      if (typeof h === "number") return h;
      if (h && typeof h === "object") return num((h as { apy?: unknown }).apy);
      return undefined;
    })
    .filter((n): n is number => typeof n === "number");
}

/**
 * Parse a validator analytics payload for the Jupiter validator's current + 30-day APY. It
 * only uses VALIDATOR-SPECIFIC data: it finds the entry by vote account, reads current APY,
 * and computes the 30-day mean deterministically from the last up-to-30 history values. A
 * network-wide-only payload is NOT used to unblock this candidate, and an unrecognized
 * schema fails safely (`source_schema_unrecognized`). It never invents APY.
 */
export function parseNativeValidatorApyFromAnalytics(
  provider: NativeValidatorApyProvider,
  payload: unknown,
  options: { voteAccount?: string } = {},
): AnalyticsApyParseResult {
  const voteAccount = options.voteAccount ?? JUPITER_NATIVE_STAKE_VOTE_ACCOUNT;
  const blockers: string[] = [];
  const notes: string[] = [];

  const list = analyticsValidatorList(payload);
  if (!list) {
    // Recognize a network-wide-only envelope, but refuse to use it for this candidate.
    const nw = num((payload as { network_apy?: unknown; networkApy?: unknown })?.network_apy) ?? num((payload as { networkApy?: unknown })?.networkApy);
    if (nw != null) {
      notes.push(`Provider '${provider}' returned only a network-wide APY (${nw}%); network-wide APY is NOT used to unblock the Jupiter validator.`);
      return { matchedValidator: false, schemaRecognized: true, networkWideOnly: true, blockers: ["missing_current_apy", "missing_apy_30d"], notes };
    }
    return { matchedValidator: false, schemaRecognized: false, networkWideOnly: false, blockers: ["source_schema_unrecognized", "missing_current_apy", "missing_apy_30d"], notes: [`Provider '${provider}' payload schema not recognized.`] };
  }

  const match = list.find((v) => v && typeof v === "object" && validatorVoteKey(v as Record<string, unknown>) === voteAccount) as Record<string, unknown> | undefined;
  if (!match) {
    notes.push(`Jupiter vote account ${voteAccount} not found in '${provider}' analytics payload.`);
    return { matchedValidator: false, schemaRecognized: true, networkWideOnly: false, blockers: ["missing_current_apy", "missing_apy_30d"], notes };
  }

  const currentApyPct = num(match.apy_estimate) ?? num(match.apy) ?? num(match.current_apy) ?? num(match.apyEstimate);
  if (currentApyPct == null) { blockers.push("missing_current_apy"); notes.push("Current APY field not present on the matched validator entry."); }

  const history = extractApyHistory(match);
  let apy30dPct: number | undefined;
  if (history.length > 0) {
    const last30 = history.slice(-30);
    apy30dPct = round2(last30.reduce((s, n) => s + n, 0) / last30.length);
    notes.push(`30-day APY computed deterministically from the last ${last30.length} '${provider}' history value(s).`);
  } else {
    blockers.push("missing_apy_30d");
    notes.push("No validator-specific APY history present; 30-day APY left missing.");
  }

  return {
    matchedValidator: true,
    schemaRecognized: true,
    networkWideOnly: false,
    ...(currentApyPct != null ? { currentApyPct } : {}),
    ...(apy30dPct != null ? { apy30dPct } : {}),
    apyHistoryCount: history.length,
    blockers,
    notes,
  };
}

/* ------------------------------------------------------------------ *
 * (5) Builder — combine RPC stake/commission + analytics APY into one record.
 * ------------------------------------------------------------------ */
export interface BuildNativeValidatorMarketDataInput {
  rpcVoteAccountsResponse?: unknown;
  analyticsProvider?: NativeValidatorApyProvider;
  analyticsPayload?: unknown;
  solPriceUsd?: number;
  fetchedAt: string;
  checkedAt?: string;
  currentEpoch?: number;
  asOfSlot?: number;
  voteAccount?: string;
}

export function buildNativeValidatorMarketData(input: BuildNativeValidatorMarketDataInput): NativeValidatorMarketData {
  const voteAccount = input.voteAccount ?? JUPITER_NATIVE_STAKE_VOTE_ACCOUNT;
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const notes: string[] = [];
  const blockers: string[] = [];

  const rpc = input.rpcVoteAccountsResponse !== undefined
    ? parseJupiterNativeStakeVoteAccountFromGetVoteAccounts(input.rpcVoteAccountsResponse, { currentEpoch: input.currentEpoch, asOfSlot: input.asOfSlot, voteAccount })
    : undefined;
  if (rpc) { blockers.push(...rpc.blockers); notes.push(...rpc.notes); }
  else { blockers.push("missing_activated_stake", "missing_commission"); notes.push("No getVoteAccounts response supplied."); }

  let apy: AnalyticsApyParseResult | undefined;
  if (input.analyticsProvider && input.analyticsPayload !== undefined) {
    apy = parseNativeValidatorApyFromAnalytics(input.analyticsProvider, input.analyticsPayload, { voteAccount });
    blockers.push(...apy.blockers); notes.push(...apy.notes);
  } else {
    blockers.push("analytics_source_unavailable", "missing_current_apy", "missing_apy_30d");
    notes.push("No analytics provider/payload supplied.");
  }

  const activatedStakeSol = rpc?.activatedStakeSol;
  const commissionPct = rpc?.commissionPct;
  const currentApyPct = apy?.currentApyPct;
  const apy30dPct = apy?.apy30dPct;

  const delegatedStakeUsd = activatedStakeSol != null && typeof input.solPriceUsd === "number"
    ? round2(activatedStakeSol * input.solPriceUsd)
    : undefined;
  if (activatedStakeSol != null && input.solPriceUsd == null) notes.push("delegatedStakeUsd not computed: no SOL price supplied (activated stake is in SOL).");

  const missingFields: NativeValidatorMarketDataMissingField[] = [];
  if (activatedStakeSol == null) missingFields.push("activatedStakeSol");
  if (commissionPct == null) missingFields.push("commissionPct");
  if (currentApyPct == null) missingFields.push("currentApyPct");
  if (apy30dPct == null) missingFields.push("apy30dPct");

  // Freshness.
  const fetchedTime = Date.parse(input.fetchedAt);
  const evalTime = Date.parse(checkedAt);
  const ageMs = evalTime - fetchedTime;
  const isStale = Number.isNaN(fetchedTime) || Number.isNaN(evalTime) || ageMs < 0 || ageMs > NATIVE_VALIDATOR_MARKET_DATA_MAX_AGE_HOURS * 60 * 60 * 1000;
  if (isStale) { blockers.push("stale_market_data"); notes.push("Market data is stale (fetchedAt older than the 24h window)."); }

  const presentCount = [activatedStakeSol, commissionPct, currentApyPct, apy30dPct].filter((v) => v != null).length;
  let status: NativeValidatorMarketDataStatus;
  if (isStale && presentCount > 0) status = "stale";
  else if (presentCount === 0) status = "missing";
  else if (missingFields.length === 0) status = "complete";
  else status = "partial";

  const dedupe = (arr: string[]) => [...new Set(arr)];

  return {
    protocolId: "jupiter_native_stake",
    protocolName: "Jupiter Native Stake",
    assetSymbol: "SOL",
    candidateType: "native_staking",
    voteAccount,

    ...(activatedStakeSol != null ? { activatedStakeSol } : {}),
    ...(rpc?.activatedStakeLamports != null ? { activatedStakeLamports: rpc.activatedStakeLamports } : {}),
    ...(delegatedStakeUsd != null ? { delegatedStakeUsd } : {}),
    ...(commissionPct != null ? { commissionPct } : {}),
    ...(currentApyPct != null ? { currentApyPct } : {}),
    ...(apy30dPct != null ? { apy30dPct } : {}),
    ...(rpc?.currentEpoch != null ? { currentEpoch: rpc.currentEpoch } : {}),
    ...(rpc?.asOfSlot != null ? { asOfSlot: rpc.asOfSlot } : {}),

    stakeSource: "solana_rpc_get_vote_accounts",
    ...(apy?.matchedValidator && input.analyticsProvider ? { apySource: input.analyticsProvider } : {}),

    fetchedAt: input.fetchedAt,
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

/* ------------------------------------------------------------------ *
 * (6) Optional fetcher shell — documented contract only, NOT wired into runtime.
 * ------------------------------------------------------------------ */
export interface FetchNativeValidatorMarketDataDeps {
  rpcGetVoteAccounts: () => Promise<unknown>;
  fetchAnalytics: (provider: NativeValidatorApyProvider) => Promise<unknown>;
  getSolPriceUsd?: () => Promise<number | undefined>;
  now?: () => string;
}

/**
 * A documented adapter contract for a LATER backend/job. It is NOT called from the app/UI
 * (the project has no approved production fetch pattern for this) and adds no secrets and no
 * Validators.app token requirement. A caller injects the network functions; this only wires
 * the parsers/builder around them. Kept out of runtime by default.
 */
export async function fetchNativeValidatorMarketData(
  deps: FetchNativeValidatorMarketDataDeps,
  options: { analyticsProvider?: NativeValidatorApyProvider } = {},
): Promise<NativeValidatorMarketData> {
  const provider = options.analyticsProvider ?? "stakewiz";
  const now = deps.now ? deps.now() : new Date().toISOString();
  let rpcVoteAccountsResponse: unknown;
  let analyticsPayload: unknown;
  try { rpcVoteAccountsResponse = await deps.rpcGetVoteAccounts(); } catch { rpcVoteAccountsResponse = undefined; }
  try { analyticsPayload = await deps.fetchAnalytics(provider); } catch { analyticsPayload = undefined; }
  const solPriceUsd = deps.getSolPriceUsd ? await deps.getSolPriceUsd().catch(() => undefined) : undefined;
  return buildNativeValidatorMarketData({ rpcVoteAccountsResponse, analyticsProvider: provider, analyticsPayload, solPriceUsd, fetchedAt: now });
}

/* ------------------------------------------------------------------ *
 * (7) Bridge — convert COMPLETE market data into the 3 missing native evidence inputs.
 * ------------------------------------------------------------------ */
export interface ConvertMarketDataToEvidenceOptions {
  confirmedBy?: string;
  reviewerRole?: NativeSolStakeReviewerRole;
  stakeSourceName?: string;
  stakeSourceUrl?: string;
  apySourceName?: string;
  apySourceUrl?: string;
}

export interface MarketDataToEvidenceResult {
  inputs: NativeSolStakeEvidenceInput[];
  converted: boolean;
  blockers: string[];
  notes: string[];
}

const APY_PROVIDER_LABEL: Record<NativeValidatorApyProvider, { name: string; url: string }> = {
  stakewiz: { name: "Stakewiz — Jupiter validator analytics", url: `https://stakewiz.com/validator/${JUPITER_NATIVE_STAKE_VOTE_ACCOUNT}` },
  solana_compass: { name: "Solana Compass — Jupiter validator", url: `https://solanacompass.com/validators/${JUPITER_NATIVE_STAKE_VOTE_ACCOUNT}` },
  validators_app: { name: "Validators.app — Jupiter validator", url: `https://www.validators.app/validators/${JUPITER_NATIVE_STAKE_VOTE_ACCOUNT}` },
};

/**
 * Convert COMPLETE, fresh native-validator market data into the three missing native
 * evidence inputs (`delegated_stake_or_tvl`, `current_apy`, `apy_30d`). It ONLY converts
 * when `status === "complete"`; for partial/stale/missing data it returns no inputs and
 * explains the blockers. It NEVER mutates the native evidence array (a later step must
 * explicitly append the returned inputs) and NEVER approves native staking. Each input
 * carries value + unit + sourceName + sourceUrl + confirmedAt + confirmedBy + reviewerRole
 * + notes, per the intake contract.
 */
export function convertNativeValidatorMarketDataToEvidenceInputs(
  marketData: NativeValidatorMarketData,
  options: ConvertMarketDataToEvidenceOptions = {},
): MarketDataToEvidenceResult {
  if (marketData.status !== "complete") {
    return {
      inputs: [],
      converted: false,
      blockers: marketData.blockers.length > 0 ? marketData.blockers : [`market_data_${marketData.status}`],
      notes: [`Market data status is '${marketData.status}' — no evidence inputs created (only 'complete' data is converted).`],
    };
  }

  const confirmedBy = options.confirmedBy ?? "Ashot";
  const reviewerRole = options.reviewerRole ?? "founder";
  const confirmedAt = marketData.fetchedAt;
  const stakeName = options.stakeSourceName ?? "Solana RPC — getVoteAccounts (Jupiter validator)";
  const stakeUrl = options.stakeSourceUrl ?? `solana:getVoteAccounts?voteAccount=${marketData.voteAccount}`;
  const apyLabel = marketData.apySource ? APY_PROVIDER_LABEL[marketData.apySource] : { name: "Validator analytics provider", url: "" };
  const apyName = options.apySourceName ?? apyLabel.name;
  const apyUrl = options.apySourceUrl ?? apyLabel.url;

  const common = {
    protocolId: "jupiter_native_stake" as const,
    protocolName: "Jupiter Native Stake" as const,
    assetSymbol: "SOL" as const,
    candidateType: "native_staking" as const,
    confirmedAt,
    confirmedBy,
    reviewerRole,
  };

  // delegated_stake_or_tvl: prefer USD (if a SOL price was supplied), else SOL.
  const usePreferUsd = marketData.delegatedStakeUsd != null;
  const stakeInput: NativeSolStakeEvidenceInput = {
    ...common,
    category: "delegated_stake_or_tvl",
    value: usePreferUsd ? (marketData.delegatedStakeUsd as number) : (marketData.activatedStakeSol as number),
    unit: usePreferUsd ? "usd" : "sol",
    sourceName: stakeName,
    sourceUrl: stakeUrl,
    notes: [`Validator activated (delegated) stake from Solana RPC getVoteAccounts (source of truth): ${marketData.activatedStakeSol} SOL${usePreferUsd ? ` (~$${marketData.delegatedStakeUsd} at the supplied SOL price)` : ""}. Not JupSOL TVL.`],
  };
  const currentApyInput: NativeSolStakeEvidenceInput = {
    ...common,
    category: "current_apy",
    value: marketData.currentApyPct as number,
    unit: "pct",
    sourceName: apyName,
    sourceUrl: apyUrl,
    notes: [`Validator-specific current APY from ${marketData.apySource ?? "analytics"} for vote account ${marketData.voteAccount}. Not JupSOL APY; not a network-wide figure.`],
  };
  const apy30dInput: NativeSolStakeEvidenceInput = {
    ...common,
    category: "apy_30d",
    value: marketData.apy30dPct as number,
    unit: "pct",
    sourceName: apyName,
    sourceUrl: apyUrl,
    notes: [`Validator-specific 30-day mean APY computed deterministically from ${marketData.apySource ?? "analytics"} history for vote account ${marketData.voteAccount}. Not JupSOL APY; not network-wide.`],
  };

  return {
    inputs: [stakeInput, currentApyInput, apy30dInput],
    converted: true,
    blockers: [],
    notes: ["Converted complete native-validator market data into 3 evidence inputs (delegated_stake_or_tvl, current_apy, apy_30d). NOT appended to the native evidence array automatically — a later step must do that explicitly."],
  };
}

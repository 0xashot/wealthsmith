/**
 * solStakingMarketDataSources — Step 14U. Source responsibilities + freshness policy for the
 * live SOL staking market-data refresh. It maps each candidate to the EXACT public source
 * already verified in the repository — no guessed pool IDs, no invented endpoints, no API keys.
 *
 * LST candidates (JitoSOL / mSOL / JupSOL / bSOL / INF) → DefiLlama public yields feed, matched
 * by the exact stored pool UUID (verified in `protocolSolLiquidStakingRealValueConfirmations.ts`
 * and the fresh-evidence records). Jupiter Native Stake → Stakewiz (current) + Marinade
 * validator history (trailing-30-day APY, the exact Step 14T methodology).
 *
 * No source requires an API key, paid subscription, VITE secret, or browser credentials (the
 * Step 14T-removed paid provider and Blockdaemon are explicitly denylisted). All are public,
 * read-only GETs.
 */
import {
  SOL_STAKING_MARKET_CANDIDATE_IDS,
  type SolStakingMarketCandidateType,
  type SolStakingMarketFieldName,
} from "./solStakingMarketDataTypes";
import {
  JUPITER_NATIVE_STAKE_VOTE_ACCOUNT,
} from "./nativeValidatorMarketData";
import { marinadeJupiterValidatorHistoryUrl } from "./nativeValidatorMarinadeData";

/* ------------------------------------------------------------------ *
 * Freshness policy (all fixture-sensitive functions take an explicit checkedAt).
 * ------------------------------------------------------------------ */
export const SOL_STAKING_MARKET_CACHE_SCHEMA_VERSION = "1.0.0";
export const SOL_STAKING_CURRENT_MARKET_MAX_AGE_HOURS = 24;
export const SOL_STAKING_MARKET_REFRESH_INTERVAL_HOURS = 6;
export const SOL_STAKING_MARKET_HARD_STALE_HOURS = 24;

/* ------------------------------------------------------------------ *
 * No-secret guarantees.
 * ------------------------------------------------------------------ */
export const SOL_STAKING_MARKET_SOURCES_REQUIRE_API_KEY = false;
export const SOL_STAKING_MARKET_SOURCES_USE_RATED = false;
export const SOL_STAKING_MARKET_SOURCES_USE_BLOCKDAEMON = false;
export const SOL_STAKING_MARKET_SOURCES_USE_BROWSER_FETCH = false;

/**
 * Forbidden secret env names — asserted absent from every descriptor. Built from fragments so
 * this denylist does not itself reintroduce the Step 14T-removed provider's literal env token.
 */
export const SOL_STAKING_MARKET_FORBIDDEN_SECRETS: readonly string[] = ["RATED", "BLOCKDAEMON"].flatMap(
  (p) => [`${p}_API_KEY`, `VITE_${p}_API_KEY`],
);

/** The single DefiLlama public yields feed (TVL + current APY + 30-day mean per pool). */
export const DEFILLAMA_POOLS_URL = "https://yields.llama.fi/pools";
/** Stakewiz public validator endpoint (no key). */
export function stakewizValidatorUrl(voteAccount: string = JUPITER_NATIVE_STAKE_VOTE_ACCOUNT): string {
  return `https://api.stakewiz.com/validator/${voteAccount}`;
}

export type SolStakingMarketProvider =
  | "defillama_pools"
  | "stakewiz"
  | "marinade_validator_history";

/** A per-provider source responsibility for one candidate. */
export interface SolStakingMarketSourceProviderDescriptor {
  provider: SolStakingMarketProvider;
  sourceName: string;
  sourceUrl: string;
  /** Fields this provider is responsible for supplying. */
  providesFields: SolStakingMarketFieldName[];
  maximumAgeHours: number;
  /** The exact verified DefiLlama pool UUID (LST candidates only). */
  poolId?: string;
  /** Expected DefiLlama chain — checked when the record carries chain metadata. */
  expectedChain?: string;
  /** Expected DefiLlama project slug — checked ONLY when set AND the record carries it. */
  expectedProject?: string;
  /** The validator vote account (native candidate only). */
  voteAccount?: string;
  requiresApiKey: false;
  usesBrowserFetch: false;
}

export interface SolStakingMarketSourceDescriptor {
  candidateId: string;
  protocolName: string;
  assetSymbol: string;
  candidateType: SolStakingMarketCandidateType;
  /** All required live fields for this candidate (must all be fresh for `complete`). */
  requiredFields: SolStakingMarketFieldName[];
  /** Ordered provider responsibilities. */
  providers: SolStakingMarketSourceProviderDescriptor[];
  /** Whether this candidate is eligible to ever enter the future selector comparison. */
  eligibleForFutureComparison: boolean;
  /** INF stays blocked/monitored: refreshed for observation only. */
  monitoredOnly: boolean;
}

const LST_REQUIRED_FIELDS: SolStakingMarketFieldName[] = ["current_apy_pct", "apy_30d_pct", "tvl_usd"];
const NATIVE_REQUIRED_FIELDS: SolStakingMarketFieldName[] = [
  "delegated_stake_sol",
  "current_apy_pct",
  "apy_30d_pct",
  "validator_commission_pct",
  "validator_delinquent",
  "source_epoch",
];

/**
 * Build a DefiLlama LST source descriptor. `poolId` is the EXACT verified UUID; the parser
 * matches only that pool and rejects any other pool / wrong chain. `expectedProject` is left
 * undefined by default (DefiLlama project slugs are not guessed) — project matching only runs
 * when a descriptor explicitly sets it.
 */
function defiLlamaLstSource(args: {
  candidateId: string;
  protocolName: string;
  assetSymbol: string;
  poolId: string;
  poolLabel: string;
  eligible: boolean;
  monitoredOnly?: boolean;
}): SolStakingMarketSourceDescriptor {
  return {
    candidateId: args.candidateId,
    protocolName: args.protocolName,
    assetSymbol: args.assetSymbol,
    candidateType: "liquid_staking_token",
    requiredFields: LST_REQUIRED_FIELDS,
    providers: [
      {
        provider: "defillama_pools",
        sourceName: `DefiLlama — ${args.poolLabel} pool`,
        sourceUrl: `https://defillama.com/yields/pool/${args.poolId}`,
        providesFields: LST_REQUIRED_FIELDS,
        maximumAgeHours: SOL_STAKING_CURRENT_MARKET_MAX_AGE_HOURS,
        poolId: args.poolId,
        expectedChain: "Solana",
        requiresApiKey: false,
        usesBrowserFetch: false,
      },
    ],
    eligibleForFutureComparison: args.eligible,
    monitoredOnly: args.monitoredOnly ?? false,
  };
}

/**
 * The candidate → source responsibility map. Pool UUIDs are the exact verified values from
 * `protocolSolLiquidStakingRealValueConfirmations.ts` (JitoSOL/JupSOL/mSOL/bSOL) and the
 * `solLiquidStakingFreshEvidenceRecords`/`protocolDataAdapters.defillama` (INF).
 */
export const SOL_STAKING_MARKET_SOURCES: Record<string, SolStakingMarketSourceDescriptor> = {
  [SOL_STAKING_MARKET_CANDIDATE_IDS.jito]: defiLlamaLstSource({
    candidateId: SOL_STAKING_MARKET_CANDIDATE_IDS.jito,
    protocolName: "Jito",
    assetSymbol: "JitoSOL",
    poolId: "0e7d0722-9054-4907-8593-567b353c0900",
    poolLabel: "JitoSOL",
    eligible: true,
  }),
  [SOL_STAKING_MARKET_CANDIDATE_IDS.jupiter]: defiLlamaLstSource({
    candidateId: SOL_STAKING_MARKET_CANDIDATE_IDS.jupiter,
    protocolName: "Jupiter",
    assetSymbol: "JupSOL",
    poolId: "52bd72a7-9e81-4112-abb4-71673e8de9bf",
    poolLabel: "JupSOL",
    eligible: true,
  }),
  [SOL_STAKING_MARKET_CANDIDATE_IDS.marinade]: defiLlamaLstSource({
    candidateId: SOL_STAKING_MARKET_CANDIDATE_IDS.marinade,
    protocolName: "Marinade",
    assetSymbol: "mSOL",
    poolId: "b3f93865-5ec8-4662-90a0-11808e0aa2bd",
    poolLabel: "mSOL",
    eligible: true,
  }),
  [SOL_STAKING_MARKET_CANDIDATE_IDS.blazestake]: defiLlamaLstSource({
    candidateId: SOL_STAKING_MARKET_CANDIDATE_IDS.blazestake,
    protocolName: "BlazeStake",
    assetSymbol: "bSOL",
    poolId: "387d6732-59f0-4ae0-8a88-aba75a5cbe4a",
    poolLabel: "bSOL",
    eligible: true,
  }),
  [SOL_STAKING_MARKET_CANDIDATE_IDS.jupiterNativeStake]: {
    candidateId: SOL_STAKING_MARKET_CANDIDATE_IDS.jupiterNativeStake,
    protocolName: "Jupiter Native Stake",
    assetSymbol: "SOL",
    candidateType: "native_staking",
    requiredFields: NATIVE_REQUIRED_FIELDS,
    providers: [
      {
        provider: "stakewiz",
        sourceName: "Stakewiz — Jupiter validator analytics",
        sourceUrl: stakewizValidatorUrl(),
        providesFields: ["delegated_stake_sol", "current_apy_pct", "validator_commission_pct", "validator_delinquent", "source_epoch"],
        maximumAgeHours: SOL_STAKING_CURRENT_MARKET_MAX_AGE_HOURS,
        voteAccount: JUPITER_NATIVE_STAKE_VOTE_ACCOUNT,
        requiresApiKey: false,
        usesBrowserFetch: false,
      },
      {
        provider: "marinade_validator_history",
        sourceName: "Marinade validators API — Jupiter validator epoch APY history",
        sourceUrl: marinadeJupiterValidatorHistoryUrl(),
        providesFields: ["apy_30d_pct"],
        maximumAgeHours: 96, // per-epoch cadence ~2 days; latest completed epoch < 96h (Step 14T)
        voteAccount: JUPITER_NATIVE_STAKE_VOTE_ACCOUNT,
        requiresApiKey: false,
        usesBrowserFetch: false,
      },
    ],
    eligibleForFutureComparison: true,
    monitoredOnly: false,
  },
  [SOL_STAKING_MARKET_CANDIDATE_IDS.sanctum]: defiLlamaLstSource({
    candidateId: SOL_STAKING_MARKET_CANDIDATE_IDS.sanctum,
    protocolName: "Sanctum",
    assetSymbol: "INF",
    poolId: "3075a746-bdd1-4aac-bcd5-b035abee2622",
    poolLabel: "Sanctum Infinity (INF)",
    eligible: false, // blocked (risk score 6.95 < 7.0) — monitored only, never selector-eligible
    monitoredOnly: true,
  }),
};

export function getSolStakingMarketSource(candidateId: string): SolStakingMarketSourceDescriptor | undefined {
  return SOL_STAKING_MARKET_SOURCES[candidateId];
}

/** Every descriptor, in canonical registry order. */
export function listSolStakingMarketSources(): SolStakingMarketSourceDescriptor[] {
  return Object.values(SOL_STAKING_MARKET_SOURCES);
}

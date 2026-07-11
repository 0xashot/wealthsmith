/**
 * protocolSolLiquidStakingData — verified real-data MAPPING for the first narrow
 * case: SOL liquid staking.
 *
 * Step 12J maps WHERE each candidate's data comes from (exact mints + existing
 * source helpers) and provides an INTERNAL DRY-RUN builder. It does NOT fetch
 * live data here (network-free, no invented values), does NOT select a protocol,
 * and does NOT change live suggestions or the UI. Mapping-implemented ≠
 * selection-enabled. `PROTOCOL_SELECTION_IMPLEMENTED` stays false.
 *
 * Real values are supplied by dependency injection (a future dry-run behind
 * PROTOCOL_SELECTION_ALLOW_LIVE_DATA may call the existing async helpers —
 * `fetchLstApys` in wallet/lstApy.ts, DefiLlama pools — and pass them in). With
 * no injected data, every value stays ABSENT and marked missing (correct today).
 */
import type { ProtocolStrategyType } from "./engineTypes";
import type { ProtocolMarketData, ProtocolSelectionInput } from "./protocolMarketData";
import { ALL_MARKET_REQUIREMENTS } from "./protocolMarketData";
import { getProtocolRiskData } from "./protocolRiskRegistry";
import { evaluateProtocolSelectionEligibility } from "./protocolEligibility";
import type { ProtocolEligibilityResult } from "./protocolEligibility";
import { runProtocolSelectionQa } from "./protocolSelectionQa";
import type { ProtocolSelectionQaResult } from "./protocolSelectionQa";

/** Mapping is implemented (sources identified) — this is NOT selection enablement. */
export const SOL_LIQUID_STAKING_DATA_MAPPING_IMPLEMENTED = true;
/** Selection stays disabled regardless of mapping status. */
export const SOL_LIQUID_STAKING_SELECTION_ENABLED = false;

export const SOL_LIQUID_STAKING_CANDIDATE_IDS = ["jupiter", "marinade", "jito", "blazestake", "sanctum"] as const;
export const SOL_LIQUID_STAKING_ASSET_SYMBOLS = ["JupSOL", "mSOL", "JitoSOL", "bSOL", "INF"] as const;

type ApySource = "existing_onchain_stake_pool" | "existing_protocol_adapter" | "defillama" | "missing";
type TvlSource = "defillama" | "existing_protocol_adapter" | "missing";
type CuratedOrMissing = "curated_registry" | "missing";

export interface SolLiquidStakingCandidateMapping {
  protocolId: string;
  lstSymbol: string;
  /** EXACT verified mint (from wallet/walletPosition.ts TOKEN_REGISTRY or lstApy.ts). */
  lstMint?: string;
  assetSymbol: "SOL";
  strategyType: "liquid_staking";
  apySource?: ApySource;
  tvlSource?: TvlSource;
  withdrawalSource?: CuratedOrMissing;
  feeSource?: CuratedOrMissing;
  riskSource?: CuratedOrMissing;
  notes: string[];
}

/**
 * Exact, verified mappings. Mints are copied from existing app source files, not
 * inferred from display names. APY sources reference existing real helpers.
 */
export const SOL_LIQUID_STAKING_MAPPINGS: readonly SolLiquidStakingCandidateMapping[] = [
  {
    protocolId: "jupiter",
    lstSymbol: "JupSOL",
    lstMint: "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v", // TOKEN_REGISTRY
    assetSymbol: "SOL",
    strategyType: "liquid_staking",
    apySource: "existing_onchain_stake_pool", // lstApy.ts (SPL stake-pool math)
    tvlSource: "missing",
    withdrawalSource: "missing",
    feeSource: "missing",
    riskSource: "missing",
    notes: ["APY from on-chain SPL stake-pool exchange rate (fetchLstApys). TVL/withdrawal/fees/risk not yet sourced."],
  },
  {
    protocolId: "marinade",
    lstSymbol: "mSOL",
    lstMint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", // TOKEN_REGISTRY / lstApy.ts
    assetSymbol: "SOL",
    strategyType: "liquid_staking",
    apySource: "existing_protocol_adapter", // Marinade API (fetchMarinadeMsolApy)
    tvlSource: "missing",
    withdrawalSource: "missing",
    feeSource: "missing",
    riskSource: "missing",
    notes: ["APY from Marinade API. TVL/withdrawal/fees/risk not yet sourced."],
  },
  {
    protocolId: "jito",
    lstSymbol: "JitoSOL",
    lstMint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", // TOKEN_REGISTRY
    assetSymbol: "SOL",
    strategyType: "liquid_staking",
    apySource: "existing_onchain_stake_pool",
    tvlSource: "missing",
    withdrawalSource: "missing",
    feeSource: "missing",
    riskSource: "missing",
    notes: ["APY from on-chain SPL stake-pool exchange rate. TVL/withdrawal/fees/risk not yet sourced."],
  },
  {
    protocolId: "blazestake",
    lstSymbol: "bSOL",
    lstMint: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1", // TOKEN_REGISTRY
    assetSymbol: "SOL",
    strategyType: "liquid_staking",
    apySource: "existing_onchain_stake_pool",
    tvlSource: "missing",
    withdrawalSource: "missing",
    feeSource: "missing",
    riskSource: "missing",
    notes: ["APY from on-chain SPL stake-pool exchange rate. TVL/withdrawal/fees/risk not yet sourced."],
  },
  {
    protocolId: "sanctum",
    lstSymbol: "INF",
    lstMint: "5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm", // lstApy.ts INF_MINT
    assetSymbol: "SOL",
    strategyType: "liquid_staking",
    apySource: "defillama", // lstApy.ts DEFILLAMA_POOL[INF_MINT]
    tvlSource: "defillama", // verified pool 3075a746-... (see DEFILLAMA_POOL_MAPPINGS)
    withdrawalSource: "missing",
    feeSource: "missing",
    riskSource: "missing",
    notes: ["APY + TVL available via verified DefiLlama pool 3075a746-bdd1-4aac-bcd5-b035abee2622. Withdrawal/fees/risk not yet sourced."],
  },
];

export function getSolLiquidStakingMapping(protocolId: string): SolLiquidStakingCandidateMapping | undefined {
  return SOL_LIQUID_STAKING_MAPPINGS.find((m) => m.protocolId === protocolId);
}

/**
 * Build ProtocolMarketData for the SOL LST candidates. REAL values only via
 * injected maps (`apyByProtocolId` / `tvlByProtocolId`, sourced by a caller from
 * the existing helpers). With no injection, apy/tvl stay ABSENT and are marked
 * missing — never defaulted to 0, never fixture values. Withdrawal/fees/liquidity/
 * route have no source yet, so they stay missing for now.
 */
export function buildSolLiquidStakingMarketDataFromExistingSources(options?: {
  apyByProtocolId?: Record<string, number>;
  tvlByProtocolId?: Record<string, number>;
  updatedAt?: string;
}): Record<string, ProtocolMarketData> {
  const updatedAt = options?.updatedAt ?? new Date().toISOString();
  const out: Record<string, ProtocolMarketData> = {};
  for (const mapping of SOL_LIQUID_STAKING_MAPPINGS) {
    const apy = options?.apyByProtocolId?.[mapping.protocolId];
    const tvlUsd = options?.tvlByProtocolId?.[mapping.protocolId];
    const dataSources: string[] = [];
    if (apy != null && mapping.apySource) dataSources.push(mapping.apySource);
    if (tvlUsd != null && mapping.tvlSource) dataSources.push(mapping.tvlSource);
    const missingFields = ALL_MARKET_REQUIREMENTS.filter(
      (f) => !(f === "apy" && apy != null) && !(f === "tvl" && tvlUsd != null)
    );
    out[mapping.protocolId] = {
      protocolId: mapping.protocolId,
      strategyType: "liquid_staking",
      assetSymbol: "SOL",
      ...(mapping.lstMint ? { assetMint: mapping.lstMint } : {}),
      ...(apy != null ? { apy } : {}),
      ...(tvlUsd != null ? { tvlUsd } : {}),
      dataSources,
      updatedAt,
      confidence: apy != null && tvlUsd != null ? "available" : apy != null || tvlUsd != null ? "partial" : "missing",
      missingFields,
    };
  }
  return out;
}

/** Build the internal dry-run ProtocolSelectionInput (never selects, never mutates state). */
export function buildSolLiquidStakingInternalDryRunInput(options?: {
  apyByProtocolId?: Record<string, number>;
  tvlByProtocolId?: Record<string, number>;
  updatedAt?: string;
}): ProtocolSelectionInput {
  const marketDataByProtocolId = buildSolLiquidStakingMarketDataFromExistingSources(options);
  const riskDataByProtocolId = Object.fromEntries(
    SOL_LIQUID_STAKING_CANDIDATE_IDS.map((id) => [id, getProtocolRiskData(id)])
  );
  return {
    candidateProtocolIds: [...SOL_LIQUID_STAKING_CANDIDATE_IDS],
    assetSymbol: "SOL",
    strategyType: "liquid_staking" as ProtocolStrategyType,
    marketDataByProtocolId,
    riskDataByProtocolId,
  };
}

export interface SolLiquidStakingDryRunResult {
  candidateProtocolIds: string[];
  dataAvailability: Array<{
    protocolId: string;
    apy: boolean;
    tvl: boolean;
    withdrawal: boolean;
    fees: boolean;
    riskScore: boolean;
    eligibilityStatus?: ProtocolEligibilityResult["status"];
  }>;
  eligibilityResults: ProtocolEligibilityResult[];
  anyFullyEligible: boolean;
  qaResult: ProtocolSelectionQaResult;
  qaOnly: true;
}

/**
 * INTERNAL DRY-RUN ONLY. Builds the input, evaluates eligibility, and runs the
 * QA-only pipeline. Honestly reports per-candidate data availability. Never
 * mutates live ProtocolSelection, never writes to cards/modal, never changes
 * live suggestions. Today it returns insufficient_data (no TVL/risk/withdrawal).
 */
export function runSolLiquidStakingInternalDryRun(options?: {
  apyByProtocolId?: Record<string, number>;
  tvlByProtocolId?: Record<string, number>;
  updatedAt?: string;
  checkedAt?: string;
}): SolLiquidStakingDryRunResult {
  const input = buildSolLiquidStakingInternalDryRunInput(options);
  const context = { countsTowardSafetyBuffer: false, requiresRoute: false };
  const eligibilityResults = evaluateProtocolSelectionEligibility(input, context);
  const qaResult = runProtocolSelectionQa({ input, context, checkedAt: options?.checkedAt });

  const dataAvailability = input.candidateProtocolIds.map((id) => {
    const m = input.marketDataByProtocolId[id];
    const r = input.riskDataByProtocolId[id];
    return {
      protocolId: id,
      apy: m?.apy != null,
      tvl: m?.tvlUsd != null,
      withdrawal: m?.withdrawalTimeHours != null || (r?.withdrawalClass != null && r.withdrawalClass !== "unknown"),
      fees: m?.fees != null,
      riskScore: r?.riskScore != null,
      eligibilityStatus: eligibilityResults.find((e) => e.protocolId === id)?.status,
    };
  });

  return {
    candidateProtocolIds: input.candidateProtocolIds,
    dataAvailability,
    eligibilityResults,
    anyFullyEligible: eligibilityResults.some((e) => e.status === "eligible"),
    qaResult,
    qaOnly: true,
  };
}

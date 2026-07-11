/**
 * protocolSolLiquidStakingDryRun — INTERNAL/DEV dry-run for SOL liquid staking.
 *
 * Assembles mapped market/risk data into an honest per-candidate report and runs
 * eligibility + the QA-only pipeline. It is DRY-RUN ONLY: it never selects a
 * protocol for production, never mutates live `ProtocolSelection`, never writes
 * to cards/modal, and is not imported by the engine/UI. `qaOnly` is always true
 * and `selectionEnabled` always false. No transactions/signatures/swaps.
 *
 * Network-free by construction (dependency injection): this module never fetches.
 * `live_opt_in` mode is a strong opt-in gate — a dev caller sources real values
 * from existing read-only helpers (e.g. wallet/lstApy.ts `fetchLstApys`, DefiLlama
 * pools) and injects them; without `allowLiveData` it returns `live_data_disabled`.
 * Nothing is invented: absent values stay absent and are marked missing.
 */
import type { ProtocolMarketData, ProtocolRiskData } from "./protocolMarketData";
import { getProtocolCandidateById } from "./protocolRegistry";
import { getProtocolRiskData } from "./protocolRiskRegistry";
import { evaluateProtocolEligibility } from "./protocolEligibility";
import type { ProtocolEligibilityStatus } from "./protocolEligibility";
import { runProtocolSelectionQa } from "./protocolSelectionQa";
import type { ProtocolSelectionQaResult } from "./protocolSelectionQa";
import {
  SOL_LIQUID_STAKING_CANDIDATE_IDS,
  buildSolLiquidStakingMarketDataFromExistingSources,
  getSolLiquidStakingMapping,
} from "./protocolSolLiquidStakingData";
import { SOL_LIQUID_STAKING_QA_MARKET, SOL_LIQUID_STAKING_QA_RISK } from "./protocolSelectionQa";
import { getSolLiquidStakingSourceRecords } from "./protocolSolLiquidStakingSources";
import type { SolLiquidStakingSourceCategory, SolLiquidStakingSourceStatus } from "./protocolSolLiquidStakingSources";

/** This module is dry-run only; it can never enable production selection or UI. */
export const SOL_LIQUID_STAKING_DRY_RUN_ONLY = true;
export const SOL_LIQUID_STAKING_DRY_RUN_SHOWS_UI = false;
export const SOL_LIQUID_STAKING_DRY_RUN_CAN_SELECT_PRODUCTION = false;

export type SolLiquidStakingDryRunMode = "fixture" | "injected" | "live_opt_in";
export type SolLiquidStakingDryRunStatus = "ready_for_qa" | "insufficient_data" | "live_data_disabled" | "source_error";
export type SolLiquidStakingCandidateDataStatus = "available" | "partial" | "missing" | "error";

export interface SolLiquidStakingDryRunCandidateReport {
  protocolId: string;
  lstSymbol: string;
  apyStatus: SolLiquidStakingCandidateDataStatus;
  tvlStatus: SolLiquidStakingCandidateDataStatus;
  withdrawalStatus: SolLiquidStakingCandidateDataStatus;
  feeStatus: SolLiquidStakingCandidateDataStatus;
  riskStatus: SolLiquidStakingCandidateDataStatus;
  eligibilityStatus: ProtocolEligibilityStatus;
  missingFields: string[];
  sources: string[];
  /** Source-verification status per category (Step 12L). Internal report only. */
  sourceStatusByCategory?: Partial<Record<SolLiquidStakingSourceCategory, SolLiquidStakingSourceStatus>>;
}

export interface SolLiquidStakingDryRunResult {
  mode: SolLiquidStakingDryRunMode;
  status: SolLiquidStakingDryRunStatus;
  qaOnly: true;
  selectionEnabled: false;
  anyFullyEligible: boolean;
  /** Intentionally never present — the dry-run must not surface a production selection. */
  selectedProtocolId?: never;
  candidateReports: SolLiquidStakingDryRunCandidateReport[];
  qaResult?: ProtocolSelectionQaResult;
  checkedAt: string;
}

export interface SolLiquidStakingDryRunOptions {
  mode: SolLiquidStakingDryRunMode;
  /** Strong opt-in required for live_opt_in mode. Global flag stays false. */
  allowLiveData?: boolean;
  /** Injected real/real-like data (injected + live_opt_in modes). Network-free. */
  marketDataByProtocolId?: Record<string, ProtocolMarketData>;
  riskDataByProtocolId?: Record<string, ProtocolRiskData>;
  checkedAt?: string;
}

const dataStatus = (present: boolean, hasError = false): SolLiquidStakingCandidateDataStatus =>
  hasError ? "error" : present ? "available" : "missing";

function reportMissingFields(m: ProtocolMarketData, r: ProtocolRiskData): string[] {
  const out: string[] = [];
  if (m.apy == null) out.push("missing_apy");
  if (m.tvlUsd == null) out.push("missing_tvl");
  const withdrawalKnown = m.withdrawalTimeHours != null || (r.withdrawalClass != null && r.withdrawalClass !== "unknown");
  if (!withdrawalKnown) out.push("missing_withdrawal_data");
  if (m.fees == null) out.push("missing_fee_data");
  if (r.riskScore == null) out.push("missing_risk_score");
  return out;
}

/**
 * Internal dry-run. Deterministic, synchronous, network-free. Returns a clear
 * report; never throws (any failure resolves to `source_error`).
 */
export function runSolLiquidStakingDryRun(options: SolLiquidStakingDryRunOptions): SolLiquidStakingDryRunResult {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const shell = (mode: SolLiquidStakingDryRunMode, status: SolLiquidStakingDryRunStatus, reports: SolLiquidStakingDryRunCandidateReport[], anyFullyEligible: boolean, qaResult?: ProtocolSelectionQaResult): SolLiquidStakingDryRunResult => ({
    mode,
    status,
    qaOnly: true,
    selectionEnabled: false,
    anyFullyEligible,
    candidateReports: reports,
    ...(qaResult ? { qaResult } : {}),
    checkedAt,
  });

  try {
    // Resolve the market/risk maps per mode (never fetches here).
    let market: Record<string, ProtocolMarketData>;
    let risk: Record<string, ProtocolRiskData>;
    let liveDisabled = false;

    if (options.mode === "fixture") {
      market = SOL_LIQUID_STAKING_QA_MARKET;
      risk = SOL_LIQUID_STAKING_QA_RISK;
    } else if (options.mode === "live_opt_in" && options.allowLiveData !== true) {
      // Strong opt-in gate: without allowLiveData, do not use any live data.
      liveDisabled = true;
      market = buildSolLiquidStakingMarketDataFromExistingSources();
      risk = Object.fromEntries(SOL_LIQUID_STAKING_CANDIDATE_IDS.map((id) => [id, getProtocolRiskData(id)]));
    } else {
      // injected OR live_opt_in with allowLiveData: use injected data (a dev caller
      // sources live values via existing read-only helpers and passes them in).
      market = options.marketDataByProtocolId ?? buildSolLiquidStakingMarketDataFromExistingSources();
      risk = options.riskDataByProtocolId ?? Object.fromEntries(SOL_LIQUID_STAKING_CANDIDATE_IDS.map((id) => [id, getProtocolRiskData(id)]));
    }

    let anyError = false;
    let anyFullyEligible = false;
    const reports: SolLiquidStakingDryRunCandidateReport[] = SOL_LIQUID_STAKING_CANDIDATE_IDS.map((id) => {
      const mapping = getSolLiquidStakingMapping(id);
      const m = market[id];
      const r = risk[id];
      const mErr = m == null || m.confidence === "unreliable";
      const rErr = r == null || r.confidence === "unreliable";
      if (mErr || rErr) anyError = true;

      const withdrawalKnown = m?.withdrawalTimeHours != null || (r?.withdrawalClass != null && r.withdrawalClass !== "unknown");
      const eligibility = evaluateProtocolEligibility({
        candidate: getProtocolCandidateById(id),
        marketData: m,
        riskData: r,
        assetSymbol: "SOL",
        strategyType: "liquid_staking",
        context: { countsTowardSafetyBuffer: false, requiresRoute: false },
        checkedAt,
      });
      if (eligibility.status === "eligible") anyFullyEligible = true;

      const sources = [...new Set([...(m?.dataSources ?? []), ...(r?.sources ?? []), ...(mapping ? [mapping.apySource ?? "", mapping.tvlSource ?? ""].filter(Boolean) : [])])];
      const sourceStatusByCategory = Object.fromEntries(
        getSolLiquidStakingSourceRecords(id).map((rec) => [rec.category, rec.status])
      ) as SolLiquidStakingDryRunCandidateReport["sourceStatusByCategory"];

      return {
        protocolId: id,
        lstSymbol: mapping?.lstSymbol ?? id,
        apyStatus: dataStatus(m?.apy != null, mErr),
        tvlStatus: dataStatus(m?.tvlUsd != null, mErr),
        withdrawalStatus: dataStatus(withdrawalKnown),
        feeStatus: dataStatus(m?.fees != null),
        riskStatus: dataStatus(r?.riskScore != null, rErr),
        eligibilityStatus: eligibility.status,
        missingFields: m && r ? reportMissingFields(m, r) : ["missing_market_data"],
        sources,
        sourceStatusByCategory,
      };
    });

    if (liveDisabled) return shell(options.mode, "live_data_disabled", reports, anyFullyEligible);
    if (anyError) return shell(options.mode, "source_error", reports, anyFullyEligible);

    if (anyFullyEligible) {
      // Data is complete enough to run the QA-only pipeline. The nested qaResult
      // is qaOnly; the dry-run result never surfaces a production selection.
      const qaResult = runProtocolSelectionQa({
        input: { candidateProtocolIds: [...SOL_LIQUID_STAKING_CANDIDATE_IDS], assetSymbol: "SOL", strategyType: "liquid_staking", marketDataByProtocolId: market, riskDataByProtocolId: risk },
        context: { countsTowardSafetyBuffer: false, requiresRoute: false },
        checkedAt,
      });
      return shell(options.mode, "ready_for_qa", reports, anyFullyEligible, qaResult);
    }
    return shell(options.mode, "insufficient_data", reports, anyFullyEligible);
  } catch {
    // Never throw into any caller.
    return shell(options.mode, "source_error", [], false);
  }
}

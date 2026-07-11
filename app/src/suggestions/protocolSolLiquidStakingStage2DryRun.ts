/**
 * protocolSolLiquidStakingStage2DryRun — INTERNAL Stage-2 real-data dry-run REPORT
 * for the SOL liquid-staking narrow case.
 *
 * Answers one question for engineers: "when we inject the real data we currently
 * have, what does the full pipeline report?" It builds a structured per-candidate
 * report from the CURRENT mapping coverage (real values via dependency injection),
 * runs eligibility, and ranks only when eligibility allows.
 *
 * NOT production selection. This module:
 *  - never selects a protocol for production (no top-level selectedProtocolId/Name),
 *  - never mutates live `ProtocolSelection`, cards, modal, or Top Pick,
 *  - is never imported by any live suggestion-derivation file,
 *  - is network-free (dependency injection only; the live-opt-in helper is gated),
 *  - never invents APY/TVL/withdrawal/fees/riskScore — absent data stays absent,
 *  - has no transaction/signature/swap path.
 *
 * `PROTOCOL_SELECTION_IMPLEMENTED` stays false; the Stage-2 flags below are all
 * dry-run-safe. Data coverage alone never creates eligibility — the actual VALUES
 * must exist. With today's coverage the report correctly stays insufficient_data.
 */
import type { ProtocolMarketData, ProtocolRiskData, ProtocolSelectionInput } from "./protocolMarketData";
import { getProtocolCandidateById } from "./protocolRegistry";
import { getProtocolRiskData } from "./protocolRiskRegistry";
import {
  evaluateProtocolEligibility,
  evaluateProtocolSelectionEligibility,
} from "./protocolEligibility";
import type {
  ProtocolEligibilityStatus,
  ProtocolEligibilityReason,
  ProtocolEligibilityContext,
} from "./protocolEligibility";
import { rankProtocolCandidates } from "./protocolScoring";
import type { ProtocolScoreStatus } from "./protocolScoring";
import {
  SOL_LIQUID_STAKING_CANDIDATE_IDS,
  buildSolLiquidStakingMarketDataFromExistingSources,
  getSolLiquidStakingMapping,
} from "./protocolSolLiquidStakingData";
import { getSolLiquidStakingSourceRecords } from "./protocolSolLiquidStakingSources";
import type { SolLiquidStakingSourceCategory } from "./protocolSolLiquidStakingSources";

/** Stage-2 is dry-run only — it can never enable production selection or UI. */
export const SOL_LIQUID_STAKING_STAGE_2_DRY_RUN_ONLY = true;
export const SOL_LIQUID_STAKING_STAGE_2_SHOWS_UI = false;
export const SOL_LIQUID_STAKING_STAGE_2_CAN_SELECT_PRODUCTION = false;
export const SOL_LIQUID_STAKING_STAGE_2_USES_TRANSACTIONS = false;

export type SolLiquidStakingStage2DataCoverageStatus = "available" | "partial" | "missing" | "blocked";

export interface SolLiquidStakingStage2CandidateReport {
  protocolId: string;
  lstSymbol: string;
  mint?: string;

  apy: {
    status: SolLiquidStakingStage2DataCoverageStatus;
    value?: number;
    sources: string[];
  };

  tvl: {
    status: SolLiquidStakingStage2DataCoverageStatus;
    valueUsd?: number;
    sources: string[];
  };

  withdrawal: {
    status: SolLiquidStakingStage2DataCoverageStatus;
    withdrawalTimeHours?: number;
    sources: string[];
  };

  fees: {
    status: SolLiquidStakingStage2DataCoverageStatus;
    sources: string[];
  };

  risk: {
    status: SolLiquidStakingStage2DataCoverageStatus;
    riskScore?: number;
    auditStatus?: string;
    sources: string[];
  };

  eligibilityStatus: ProtocolEligibilityStatus;
  eligibilityReasons: ProtocolEligibilityReason[];
  scoringStatus?: ProtocolScoreStatus;
  missingFields: string[];
}

export interface SolLiquidStakingStage2DryRunReport {
  qaOnly: true;
  stage: "stage_2_real_data_dry_run";
  productionSelectionEnabled: false;
  showInUi: false;
  anyFullyEligible: boolean;
  anyScored: boolean;
  canSelectForProduction: false;
  candidateReports: SolLiquidStakingStage2CandidateReport[];
  summary: {
    candidatesTotal: number;
    candidatesWithApy: number;
    candidatesWithTvl: number;
    candidatesWithWithdrawal: number;
    candidatesWithFees: number;
    candidatesWithRiskScore: number;
    candidatesEligible: number;
    candidatesScored: number;
  };
  blockers: string[];
  checkedAt: string;
}

export interface SolLiquidStakingStage2DryRunOptions {
  /** Real APY values sourced + injected by a dev caller (never fabricated here). */
  apyByProtocolId?: Record<string, number>;
  /** Real TVL values (USD) sourced + injected by a dev caller. */
  tvlByProtocolId?: Record<string, number>;
  /** Timestamp the injected values were fetched at (defaults to now). */
  fetchedAt?: string;
  /** Optional extra source labels per protocolId (merged into every block). */
  sourceLabels?: Record<string, string[]>;
  /** Injected risk data (else the curated registry — riskScore stays absent today). */
  riskDataByProtocolId?: Record<string, ProtocolRiskData>;
  /** Fully pre-built market data override (bypasses apy/tvl injection). */
  marketDataByProtocolId?: Record<string, ProtocolMarketData>;
}

const DRY_RUN_CONTEXT: ProtocolEligibilityContext = { countsTowardSafetyBuffer: false, requiresRoute: false };

const coverage = (hasValue: boolean, blocked: boolean): SolLiquidStakingStage2DataCoverageStatus =>
  blocked ? "blocked" : hasValue ? "available" : "missing";

/** Source names recorded for a category (from verified source metadata). */
function categorySources(protocolId: string, category: SolLiquidStakingSourceCategory): string[] {
  const rec = getSolLiquidStakingSourceRecords(protocolId).find((r) => r.category === category);
  return rec?.sourceName ? [rec.sourceName] : [];
}

/**
 * Core report assembler. Deterministic, synchronous, network-free. When `blocked`
 * is set, every coverage cell is `blocked`, eligibility/scoring are skipped, and
 * the report carries the given blocker(s) instead of a coverage evaluation.
 */
function assembleReport(
  market: Record<string, ProtocolMarketData>,
  risk: Record<string, ProtocolRiskData>,
  opts: { checkedAt: string; blocked?: boolean; blockers?: string[]; sourceLabels?: Record<string, string[]> }
): SolLiquidStakingStage2DryRunReport {
  const { checkedAt, blocked = false } = opts;
  const ids = [...SOL_LIQUID_STAKING_CANDIDATE_IDS];

  const input: ProtocolSelectionInput = {
    candidateProtocolIds: ids,
    assetSymbol: "SOL",
    strategyType: "liquid_staking",
    marketDataByProtocolId: market,
    riskDataByProtocolId: risk,
  };

  // Eligibility is skipped entirely on the blocked path (no live data was used).
  const eligibilityResults = blocked ? [] : evaluateProtocolSelectionEligibility(input, DRY_RUN_CONTEXT);
  const anyEligible = eligibilityResults.some((e) => e.status === "eligible");
  // Rank ONLY when eligibility allows (per spec). Ranking is never a selection.
  const ranking = anyEligible
    ? rankProtocolCandidates({ input, eligibilityResults, context: DRY_RUN_CONTEXT, checkedAt })
    : undefined;

  const candidateReports: SolLiquidStakingStage2CandidateReport[] = ids.map((id) => {
    const mapping = getSolLiquidStakingMapping(id);
    const m = market[id];
    const r = risk[id];
    const extra = opts.sourceLabels?.[id] ?? [];

    const apyPresent = m?.apy != null;
    const tvlPresent = m?.tvlUsd != null;
    const withdrawalKnown =
      m?.withdrawalTimeHours != null || (r?.withdrawalClass != null && r.withdrawalClass !== "unknown");
    const feesPresent = m?.fees != null;
    const riskPresent = r?.riskScore != null;

    const eligibility =
      blocked || m == null
        ? undefined
        : evaluateProtocolEligibility({
            candidate: getProtocolCandidateById(id),
            marketData: m,
            riskData: r,
            assetSymbol: "SOL",
            strategyType: "liquid_staking",
            context: DRY_RUN_CONTEXT,
            checkedAt,
          });
    const eligibilityStatus: ProtocolEligibilityStatus = eligibility?.status ?? "insufficient_data";
    const scoringStatus = ranking?.scores.find((s) => s.protocolId === id)?.status;

    const missingFields: string[] = [];
    if (!apyPresent) missingFields.push("apy");
    if (!tvlPresent) missingFields.push("tvl");
    if (!withdrawalKnown) missingFields.push("withdrawal");
    if (!feesPresent) missingFields.push("fees");
    if (!riskPresent) missingFields.push("riskScore");

    return {
      protocolId: id,
      lstSymbol: mapping?.lstSymbol ?? id,
      ...(mapping?.lstMint ? { mint: mapping.lstMint } : {}),
      apy: {
        status: coverage(apyPresent, blocked),
        ...(apyPresent ? { value: m!.apy } : {}),
        sources: [...categorySources(id, "apy"), ...extra],
      },
      tvl: {
        status: coverage(tvlPresent, blocked),
        ...(tvlPresent ? { valueUsd: m!.tvlUsd } : {}),
        sources: [...categorySources(id, "tvl"), ...extra],
      },
      withdrawal: {
        status: coverage(withdrawalKnown, blocked),
        ...(m?.withdrawalTimeHours != null ? { withdrawalTimeHours: m.withdrawalTimeHours } : {}),
        sources: [...categorySources(id, "withdrawal"), ...extra],
      },
      fees: {
        status: coverage(feesPresent, blocked),
        sources: [...categorySources(id, "fees"), ...extra],
      },
      risk: {
        status: coverage(riskPresent, blocked),
        ...(riskPresent ? { riskScore: r!.riskScore } : {}),
        ...(r?.auditStatus != null ? { auditStatus: r.auditStatus } : {}),
        sources: [...(r?.sources ?? []), ...extra],
      },
      eligibilityStatus,
      eligibilityReasons: eligibility?.reasons ?? [],
      ...(scoringStatus ? { scoringStatus } : {}),
      missingFields,
    };
  });

  const count = (pred: (rep: SolLiquidStakingStage2CandidateReport) => boolean) => candidateReports.filter(pred).length;
  const candidatesTotal = candidateReports.length;
  const candidatesWithApy = count((rep) => rep.apy.status === "available");
  const candidatesWithTvl = count((rep) => rep.tvl.status === "available");
  const candidatesWithWithdrawal = count((rep) => rep.withdrawal.status === "available");
  const candidatesWithFees = count((rep) => rep.fees.status === "available");
  const candidatesWithRiskScore = count((rep) => rep.risk.status === "available");
  const candidatesEligible = count((rep) => rep.eligibilityStatus === "eligible");
  const candidatesScored = count((rep) => rep.scoringStatus === "scored");

  const blockers: string[] = [];
  if (blocked) {
    blockers.push(...(opts.blockers ?? []));
  } else {
    if (candidatesWithApy < candidatesTotal) blockers.push("missing_apy_values");
    if (candidatesWithTvl < candidatesTotal) blockers.push("missing_tvl_values");
    if (candidatesWithWithdrawal < candidatesTotal) blockers.push("missing_withdrawal_data");
    if (candidatesWithFees < candidatesTotal) blockers.push("missing_fee_data");
    if (candidatesWithRiskScore < candidatesTotal) blockers.push("missing_risk_score");
  }

  return {
    qaOnly: true,
    stage: "stage_2_real_data_dry_run",
    productionSelectionEnabled: false,
    showInUi: false,
    anyFullyEligible: candidatesEligible > 0,
    anyScored: candidatesScored > 0,
    canSelectForProduction: false,
    candidateReports,
    summary: {
      candidatesTotal,
      candidatesWithApy,
      candidatesWithTvl,
      candidatesWithWithdrawal,
      candidatesWithFees,
      candidatesWithRiskScore,
      candidatesEligible,
      candidatesScored,
    },
    blockers,
    checkedAt,
  };
}

/**
 * Build the Stage-2 dry-run report from injected real data. Only values the caller
 * supplies are used; everything else stays ABSENT (never defaulted to 0, never
 * assumed instant/zero/audited). Runs eligibility and ranks only when eligibility
 * allows. Never selects for production, never mutates live suggestions or UI.
 */
export function buildSolLiquidStakingStage2DryRunReport(
  options: SolLiquidStakingStage2DryRunOptions = {}
): SolLiquidStakingStage2DryRunReport {
  const checkedAt = options.fetchedAt ?? new Date().toISOString();
  const market =
    options.marketDataByProtocolId ??
    buildSolLiquidStakingMarketDataFromExistingSources({
      apyByProtocolId: options.apyByProtocolId,
      tvlByProtocolId: options.tvlByProtocolId,
      updatedAt: checkedAt,
    });
  const risk =
    options.riskDataByProtocolId ??
    Object.fromEntries(SOL_LIQUID_STAKING_CANDIDATE_IDS.map((id) => [id, getProtocolRiskData(id)]));
  return assembleReport(market, risk, { checkedAt, sourceLabels: options.sourceLabels });
}

/** A synchronous provider that returns already-fetched live values to inject. */
export interface SolLiquidStakingStage2LiveProviderResult {
  apyByProtocolId?: Record<string, number>;
  tvlByProtocolId?: Record<string, number>;
  riskDataByProtocolId?: Record<string, ProtocolRiskData>;
}

export interface SolLiquidStakingStage2LiveOptions {
  /** Strong opt-in required. Without it, the report is blocked (live_data_disabled). */
  allowLiveData?: boolean;
  fetchedAt?: string;
  sourceLabels?: Record<string, string[]>;
  /**
   * Dependency-injection point. A dev caller wires the existing READ-ONLY helpers
   * (wallet/lstApy.ts `fetchLstApys`, a DefiLlama pool read) OUTSIDE this module,
   * awaits them, and passes the results synchronously here. This module never
   * fetches, never touches a wallet/publicKey, and never signs.
   */
  liveDataProvider?: () => SolLiquidStakingStage2LiveProviderResult;
}

/**
 * Live-opt-in Stage-2 harness (INTERNAL, dev-only). Contract/stub: it does not run
 * automatically and performs no network call itself — a dev caller injects
 * already-fetched read-only values through `liveDataProvider`.
 *
 * Gates:
 *  - `allowLiveData !== true` → a blocked report (`live_data_disabled`), no data used.
 *  - any provider error is CAUGHT → a blocked report (`source_error`); it never
 *    throws into the engine.
 *
 * Never selects for production, never mutates live suggestions/UI, no transactions.
 */
export function buildSolLiquidStakingStage2DryRunFromLiveSources(
  options: SolLiquidStakingStage2LiveOptions = {}
): SolLiquidStakingStage2DryRunReport {
  const checkedAt = options.fetchedAt ?? new Date().toISOString();
  const emptyMarket = buildSolLiquidStakingMarketDataFromExistingSources({ updatedAt: checkedAt });
  const registryRisk = Object.fromEntries(
    SOL_LIQUID_STAKING_CANDIDATE_IDS.map((id) => [id, getProtocolRiskData(id)])
  );

  if (options.allowLiveData !== true) {
    return assembleReport(emptyMarket, registryRisk, { checkedAt, blocked: true, blockers: ["live_data_disabled"] });
  }

  try {
    const live = options.liveDataProvider ? options.liveDataProvider() : {};
    return buildSolLiquidStakingStage2DryRunReport({
      apyByProtocolId: live.apyByProtocolId,
      tvlByProtocolId: live.tvlByProtocolId,
      riskDataByProtocolId: live.riskDataByProtocolId,
      fetchedAt: checkedAt,
      sourceLabels: options.sourceLabels,
    });
  } catch {
    // Never throw into any caller — surface as a blocked report instead.
    return assembleReport(emptyMarket, registryRisk, { checkedAt, blocked: true, blockers: ["source_error"] });
  }
}

/**
 * solStakingSelectorPresentationTypes — Step 14Y. The READ-ONLY, user-facing presentation model
 * for "Top protocol to review right now" — a DYNAMIC comparison result that may change after each
 * validated market refresh.
 *
 * This is a display of the Step 14W comparison leader; it is NOT activation. It never changes
 * `selectedProtocolId`, never replaces JitoSOL in the engine, never sets a product winner, never
 * enables automatic switching, and never bypasses the Step 14X activation gate. Showing a current
 * leader requires only a fresh, complete comparison — NOT historical coverage, sensitivity pass,
 * operational readiness, or human approval (those gate automatic activation only).
 *
 * User-facing copy is deterministic and never uses best / safest / guaranteed / risk-free /
 * winner / recommended, and is never called the suggestion-engine "Top Pick".
 */
import type { SolStakingSelectorComparisonResult } from "./solStakingSelectorTypes";
import type { SolStakingLeaderExplanation as SolStakingLeaderComparisonExplanation } from "./solStakingLeaderExplanationTypes";

export const SOL_STAKING_SELECTOR_PRESENTATION_SCHEMA_VERSION = "1.0.0";

export type SolStakingSelectorDisplayStatus =
  | "available"
  | "stale"
  | "insufficient_candidates"
  | "unavailable"
  | "invalid";

export interface SolStakingSelectorDisplayGateDecision {
  status: SolStakingSelectorDisplayStatus;

  canShowCurrentLeader: boolean;
  canShowRanking: boolean;

  comparisonGeneratedAt?: string;
  marketCacheGeneratedAt?: string;
  oldestRequiredFieldFetchedAt?: string;
  expiresAt?: string;

  eligibleCandidateCount: number;

  blockers: string[];
  warnings: string[];

  activationRequiredForDisplay: false;
  historicalCoverageRequiredForDisplay: false;
  sensitivityPassRequiredForDisplay: false;
  humanApprovalRequiredForDisplay: false;

  selectedProtocolIdChanged: false;
  winnerActivated: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

export interface SolStakingProtocolComparisonBreakdown {
  reviewedRisk: { rawScore: number; normalizedScore: number; weight: number; contribution: number };
  apy30d: { rawPct: number; normalizedScore: number; weight: number; contribution: number };
  currentApy: { rawPct: number; normalizedScore: number; weight: number; contribution: number };
  apyConsistency: { absoluteDeltaPctPoints: number; normalizedScore: number; weight: number; contribution: number };
}

export interface SolStakingProtocolPresentationCandidate {
  candidateId: string;
  protocolName: string;
  assetSymbol: string;

  candidateType: "liquid_staking_token" | "native_staking";

  rank: number;
  comparisonScore: number;
  reviewedRiskScore: number;
  currentApyPct: number;
  apy30dPct: number;
  absoluteApyDeltaPctPoints: number;

  currentlyLeadsComparison: boolean;
  currentRunnerUp: boolean;

  breakdown: SolStakingProtocolComparisonBreakdown;

  adoptionDisplay: {
    label: string;
    value: number;
    unit: "usd" | "sol";
    comparisonScope: "lst_only" | "native_only";
    usedInScore: false;
  };

  feeContext: Array<{ label: string; value?: number; unit?: "pct"; usedInScore: false }>;

  exitContext: { label: string; description: string; usedInScore: false };

  tokenModelLabel: "Liquid staking token" | "Native stake account";

  sourceFreshness: { marketCacheGeneratedAt: string; comparisonGeneratedAt: string; status: "fresh" };

  selectedByProtocolLogic: false;
  currentWinner: false;
  activated: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;
}

export interface SolStakingSelectorPresentation {
  schemaVersion: string;
  generatedAt: string;
  checkedAt: string;

  status: SolStakingSelectorDisplayStatus;
  displayGate: SolStakingSelectorDisplayGateDecision;

  headline: string;
  supportingText: string;
  freshnessText: string;
  disclosureText: string;

  topProtocol?: SolStakingProtocolPresentationCandidate;
  runnerUp?: SolStakingProtocolPresentationCandidate;
  rankedCandidates: SolStakingProtocolPresentationCandidate[];

  /** Step 14Z — the deterministic "Why this protocol currently leads" leader-vs-runner-up analysis. */
  leaderExplanation?: SolStakingLeaderComparisonExplanation;

  currentUnderlyingSelectedProtocolId: string;

  leaderDiffersFromUnderlyingSelection: boolean;

  topProtocolIsDynamic: true;
  topProtocolMayChange: true;

  activationPerformed: false;
  selectedProtocolIdChanged: false;
  topPickChanged: false;
  engineOrderingChanged: false;
  updatesLiveRecommendations: false;
  transactionsEnabled: false;
  walletSignatureRequired: false;

  blockers: string[];
  warnings: string[];
}

/** A structured, deterministic "why it leads" explanation item (never free-form/AI). */
export interface SolStakingLeaderExplanationItem {
  dimension: "reviewed_risk" | "apy_30d" | "current_apy" | "apy_consistency";
  label: string;
  rawValue: string;
  weightPct: number;
  contribution: number;
  explanation: string;
}

export interface SolStakingLeaderExplanation {
  protocolName: string;
  items: SolStakingLeaderExplanationItem[];
  summary: string;
  usesOnlyScoredDimensions: true;
}

/** Re-export for consumers building presentations from a comparison result. */
export type { SolStakingSelectorComparisonResult };

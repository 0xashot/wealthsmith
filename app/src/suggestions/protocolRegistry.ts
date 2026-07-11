/**
 * protocolRegistry — a STATIC, curated list of candidate protocols for future
 * protocol/platform selection, plus the adapter-interface contracts that a real
 * selection engine would consume.
 *
 * FOUNDATION ONLY (Step 12C). This is NOT protocol selection:
 *  - a candidate list is NOT a recommendation and NOT a selected protocol;
 *  - entries carry ONLY static, verifiable facts (id, name, supported assets,
 *    official manage URL) — never APY/TVL/risk/fees/lockup/liquidity/score;
 *  - `dataAdaptersNeeded` records WHAT is still missing before selection is safe
 *    (see protocolSelectionAudit.md / protocolDataSources.md);
 *  - nothing here ranks, scores, sorts by yield/risk, or sets `selected`.
 *
 * Selection stays `not_evaluated` until market-data + risk adapters exist and a
 * deterministic scoring rule is added. `PROTOCOL_SELECTION_IMPLEMENTED` is the
 * explicit "not yet" marker.
 */
import type { ProtocolStrategyType } from "./engineTypes";

/** Explicit marker: real protocol selection is NOT implemented (Step 12C). */
export const PROTOCOL_SELECTION_IMPLEMENTED = false;

/** A live data input a protocol needs before it can be selected (never a value). */
export type ProtocolDataRequirement =
  | "apy"
  | "tvl"
  | "risk_score"
  | "withdrawal_behavior"
  | "fees"
  | "liquidity"
  | "slippage"
  | "quote_route"
  | "eligibility"
  | "audit_status";

/** A curated candidate protocol. STATIC facts only — no dynamic values. */
export interface ProtocolRegistryEntry {
  id: string;
  name: string;
  chain: "solana";
  strategyTypes: ProtocolStrategyType[];
  /** Uppercase asset symbols this protocol supports for the strategy. */
  supportedAssets: string[];
  /** Canonical public mints, where known (verifiable on-chain). */
  supportedMints?: string[];
  /** Official app/manage URL already used elsewhere in the app; omitted if unknown. */
  manageUrl?: string;
  /** Always "candidate_only" — this is not a selection. */
  status: "candidate_only";
  notes: string;
  /** Live data still required before this protocol could ever be selected. */
  dataAdaptersNeeded: ProtocolDataRequirement[];
}

/** Canonical public mints (from wallet/walletPosition.ts TOKEN_REGISTRY). */
const MINTS = {
  JupSOL: "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v",
  mSOL: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  JitoSOL: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
  bSOL: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
} as const;

const NOTE = "Candidate metadata only. Protocol selection has not been evaluated.";
const STAKING_NEEDS: ProtocolDataRequirement[] = [
  "apy",
  "tvl",
  "liquidity",
  "withdrawal_behavior",
  "fees",
  "risk_score",
  "audit_status",
  "eligibility",
];
const STABLE_YIELD_NEEDS: ProtocolDataRequirement[] = [
  "apy",
  "tvl",
  "liquidity",
  "withdrawal_behavior",
  "fees",
  "risk_score",
  "audit_status",
  "eligibility",
];
const LP_NEEDS: ProtocolDataRequirement[] = [
  "apy",
  "tvl",
  "liquidity",
  "slippage",
  "quote_route",
  "withdrawal_behavior",
  "fees",
  "risk_score",
  "audit_status",
  "eligibility",
];

/**
 * The registry. ORDER IS MEANINGFUL ONLY as stable insertion order — it is NOT a
 * ranking. Manage URLs are the same ones the app already links to at detection.
 */
export const PROTOCOL_REGISTRY: readonly ProtocolRegistryEntry[] = [
  // ----- SOL liquid staking / staking candidates -----
  {
    id: "jupiter",
    name: "Jupiter",
    chain: "solana",
    strategyTypes: ["liquid_staking", "staking"],
    supportedAssets: ["SOL"],
    supportedMints: [MINTS.JupSOL],
    manageUrl: "https://jup.ag",
    status: "candidate_only",
    notes: NOTE,
    dataAdaptersNeeded: STAKING_NEEDS,
  },
  {
    id: "marinade",
    name: "Marinade",
    chain: "solana",
    strategyTypes: ["liquid_staking", "staking"],
    supportedAssets: ["SOL"],
    supportedMints: [MINTS.mSOL],
    manageUrl: "https://app.marinade.finance",
    status: "candidate_only",
    notes: NOTE,
    dataAdaptersNeeded: STAKING_NEEDS,
  },
  {
    id: "jito",
    name: "Jito",
    chain: "solana",
    strategyTypes: ["liquid_staking", "staking"],
    supportedAssets: ["SOL"],
    supportedMints: [MINTS.JitoSOL],
    manageUrl: "https://www.jito.network/staking/",
    status: "candidate_only",
    notes: NOTE,
    dataAdaptersNeeded: STAKING_NEEDS,
  },
  {
    id: "blazestake",
    name: "BlazeStake",
    chain: "solana",
    strategyTypes: ["liquid_staking", "staking"],
    supportedAssets: ["SOL"],
    supportedMints: [MINTS.bSOL],
    manageUrl: "https://stake.solblaze.org",
    status: "candidate_only",
    notes: NOTE,
    dataAdaptersNeeded: STAKING_NEEDS,
  },
  {
    id: "sanctum",
    name: "Sanctum",
    chain: "solana",
    strategyTypes: ["liquid_staking", "staking"],
    supportedAssets: ["SOL"],
    manageUrl: "https://app.sanctum.so",
    status: "candidate_only",
    notes: `${NOTE} Multi-LST ecosystem; specific LST mints resolved by adapters later.`,
    dataAdaptersNeeded: STAKING_NEEDS,
  },
  // ----- Stable yield candidate -----
  {
    id: "kamino",
    name: "Kamino",
    chain: "solana",
    strategyTypes: ["lending", "vault"],
    supportedAssets: ["USDC", "USDT"],
    supportedMints: [MINTS.USDC, MINTS.USDT],
    manageUrl: "https://app.kamino.finance",
    status: "candidate_only",
    notes: NOTE,
    dataAdaptersNeeded: STABLE_YIELD_NEEDS,
  },
  // ----- Future LP / vault / DEX candidates (candidate-only, no manage URL wired) -----
  {
    id: "orca",
    name: "Orca",
    chain: "solana",
    strategyTypes: ["lp"],
    supportedAssets: [],
    status: "candidate_only",
    notes: `${NOTE} LP/vault — future scope.`,
    dataAdaptersNeeded: LP_NEEDS,
  },
  {
    id: "raydium",
    name: "Raydium",
    chain: "solana",
    strategyTypes: ["lp"],
    supportedAssets: [],
    status: "candidate_only",
    notes: `${NOTE} LP/vault — future scope.`,
    dataAdaptersNeeded: LP_NEEDS,
  },
  {
    id: "meteora",
    name: "Meteora",
    chain: "solana",
    strategyTypes: ["lp"],
    supportedAssets: [],
    status: "candidate_only",
    notes: `${NOTE} LP/vault — future scope.`,
    dataAdaptersNeeded: LP_NEEDS,
  },
];
// NOTE: Hubble is DETECTED (USDH CDP positions) but is intentionally NOT a
// selection candidate — it is a collateralized-stablecoin protocol, not a
// deploy-into yield venue for staking/stable yield.

/* ------------------------------------------------------------------ *
 * Query helpers — candidate entries only, static registry order, NEVER
 * scored/sorted/filtered by (nonexistent) dynamic data, NEVER a selection.
 * ------------------------------------------------------------------ */

export function getProtocolCandidateById(id: string): ProtocolRegistryEntry | undefined {
  return PROTOCOL_REGISTRY.find((p) => p.id === id);
}

export function getProtocolCandidatesForStrategy(
  strategyType: ProtocolStrategyType
): ProtocolRegistryEntry[] {
  return PROTOCOL_REGISTRY.filter((p) => p.strategyTypes.includes(strategyType));
}

export function getProtocolCandidatesForAsset(
  assetSymbol: string,
  strategyType?: ProtocolStrategyType
): ProtocolRegistryEntry[] {
  const sym = assetSymbol.toUpperCase();
  return PROTOCOL_REGISTRY.filter(
    (p) =>
      p.supportedAssets.includes(sym) &&
      (strategyType == null || p.strategyTypes.includes(strategyType))
  );
}

export function getProtocolCandidatesForSelection(
  strategyType: ProtocolStrategyType,
  assetSymbol: string
): ProtocolRegistryEntry[] {
  const sym = assetSymbol.toUpperCase();
  return PROTOCOL_REGISTRY.filter(
    (p) => p.strategyTypes.includes(strategyType) && p.supportedAssets.includes(sym)
  );
}

/* ------------------------------------------------------------------ *
 * Adapter interface CONTRACTS (Step 12C) — declarations only. These describe
 * the shape a FUTURE market-data / risk layer would produce. They are NOT
 * implemented, NOT wired into any suggestion, and NOT used to select or score
 * anything today. No value here is ever invented.
 * ------------------------------------------------------------------ */

export interface ProtocolMarketData {
  protocolId: string;
  strategyType: ProtocolStrategyType;
  assetSymbol: string;
  apy?: number;
  tvlUsd?: number;
  liquidityUsd?: number;
  withdrawalTimeHours?: number;
  fees?: {
    depositBps?: number;
    withdrawBps?: number;
    performanceBps?: number;
  };
  dataSources: string[];
  updatedAt: string;
}

export interface ProtocolRiskData {
  protocolId: string;
  riskScore?: number;
  auditStatus?: "audited" | "partially_audited" | "unknown";
  safetyBufferEligible?: boolean;
  notes?: string;
  lastReviewedAt?: string;
}

export interface ProtocolSelectionInput {
  candidateProtocolIds: string[];
  assetSymbol: string;
  strategyType: ProtocolStrategyType;
  marketDataByProtocolId: Record<string, ProtocolMarketData>;
  riskDataByProtocolId: Record<string, ProtocolRiskData>;
}

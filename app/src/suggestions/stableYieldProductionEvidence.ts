/**
 * stableYieldProductionEvidence — Step 16H-G. The versioned, machine-readable EVIDENCE MANIFEST for
 * every current production Stable Yield candidate, plus the approval-readiness matrix that Step 16H-H
 * will review.
 *
 * This file records what is PROVEN and what is MISSING. It approves nothing: `StableYieldApprovalReadiness`
 * has no `approved` member, and every manifest below is `blocked`.
 *
 * THE UNIVERSAL BLOCKER: every entry in `yieldStrategyRegistry.ts` carries `address: undefined` and
 * `lifecycle: "documentation_required"`. Adapters bind data to products by EXACT address only, so with
 * no documented address there is nothing to bind to and no source query to make. Every candidate
 * therefore fails closed at `identity_validation` with `missing_product_address`.
 *
 * This is not an adapter defect. Resolving it requires a human to document each product's exact
 * on-chain address from its official source — the first task of Step 16H-H.
 */
import { listYieldStrategies } from "./yieldStrategyRegistry";
import type { StableYieldApprovalReadiness, StableYieldIdentityReason } from "./stableYieldProductionAdapterTypes";

export const STABLE_YIELD_PRODUCTION_EVIDENCE_EXISTS = true;
export const STABLE_YIELD_APPROVAL_READINESS_MATRIX_EXISTS = true;
export const STABLE_YIELD_EVIDENCE_MANIFEST_VERSION = "1.0.0" as const;

/** Per-facet adapter/evidence state. `implemented` never implies `verified` and never implies approved. */
export type StableYieldEvidenceState =
  | "adapter_implemented_source_unverified"
  | "adapter_implemented_source_verified"
  | "evidence_complete"
  | "no_adapter"
  | "not_applicable"
  | "blocked";

export interface StableYieldCandidateEvidence {
  manifestVersion: typeof STABLE_YIELD_EVIDENCE_MANIFEST_VERSION;

  // ---- Identity ----
  strategyId: string;
  protocolId: string;
  chain: "solana_mainnet";
  asset: "USDC";
  /** The exact product address. `undefined` = the blocker. Never fabricated. */
  productAddress?: string;
  /** Receipt/share token or position identifier used for 16F detection. */
  positionIdentifier?: string;

  // ---- Market / APY ----
  apySource?: string;
  apySourceRef?: string;
  /** The EXACT field selected from the source, and why it maps to the 16C contract. */
  apySelectedField?: string;
  apyUnitInterpretation?: "fraction" | "percent" | "unverified";
  apySourceTimestampField?: string;
  apyFreshnessPolicy?: string;
  apyAdapterState: StableYieldEvidenceState;

  // ---- Capacity ----
  capacitySource?: string;
  capacityFieldOrFormula?: string;
  capacityAdapterState: StableYieldEvidenceState;

  // ---- Constraints ----
  productMinimumUsd?: number;
  productMaximumUsd?: number;
  constraintsState: StableYieldEvidenceState;
  depositAvailabilityState: StableYieldEvidenceState;

  // ---- Exit / fees ----
  withdrawalModel?: string;
  exitEvidenceState: StableYieldEvidenceState;

  // ---- Risk ----
  riskReviewState: StableYieldEvidenceState;
  riskReviewDate?: string;
  missingRiskItems: string[];

  // ---- Position detection ----
  positionDetectionState: StableYieldEvidenceState;
  positionMatchMechanism?: string;

  // ---- Verdict ----
  readiness: StableYieldApprovalReadiness;
  primaryBlocker: StableYieldIdentityReason | "risk_review_missing" | "source_schema_unverified" | "product_not_a_yield_venue" | "no_official_product_documented";
  blockers: string[];
  notes: string[];
}

/**
 * Shared blocker set. Every candidate carries `missing_product_address`; the rest are candidate-specific
 * and derived from the registry's own documented notes — nothing here is invented.
 */
const NO_ADDRESS = "missing_product_address: the registry documents no exact on-chain product address; adapters match by exact address only, so no source query can be bound to this product";
const NO_RISK = "risk_review_missing: no complete reviewed 16D risk record exists for this product";

const MANIFESTS: StableYieldCandidateEvidence[] = [
  {
    manifestVersion: STABLE_YIELD_EVIDENCE_MANIFEST_VERSION,
    strategyId: "kamino_steakhouse_usdc",
    protocolId: "kamino",
    chain: "solana_mainnet",
    asset: "USDC",
    productAddress: undefined,
    positionIdentifier: undefined,
    apySource: "Kamino official SDK (@kamino-finance/klend-sdk) vault state",
    apySourceRef: "klend-sdk:KaminoVault.getState",
    apySelectedField: "vault yield calc net APY (single field; never averaged, never max-of, never APR-derived)",
    apyUnitInterpretation: "unverified",
    apySourceTimestampField: "vault state read slot time (authoritative; local fetch time is NOT)",
    apyFreshnessPolicy: "16C canonical max age (1h); source time authoritative; stale/future fails closed",
    apyAdapterState: "adapter_implemented_source_unverified",
    capacitySource: "Kamino vault state (explicit cap + deposited fields, when exposed)",
    capacityFieldOrFormula: "remaining = depositCapUsd - depositedUsd, same product, same unit; absent cap => unknown (never verified_uncapped)",
    capacityAdapterState: "adapter_implemented_source_unverified",
    productMinimumUsd: undefined,
    productMaximumUsd: undefined,
    constraintsState: "blocked",
    depositAvailabilityState: "blocked",
    withdrawalModel: undefined,
    exitEvidenceState: "blocked",
    riskReviewState: "blocked",
    riskReviewDate: undefined,
    missingRiskItems: ["protocol_review_status", "product_review_status", "vault_identity", "audit_evidence", "admin_upgradeability", "oracle_exposure", "withdrawal_restrictions", "review_date", "reviewer_metadata"],
    positionDetectionState: "adapter_implemented_source_unverified",
    positionMatchMechanism: "Kamino vault share balance keyed by EXACT vault address (wallet/kaminoVaults.ts reads this read-only via the official SDK); requires the documented address to match against",
    readiness: "blocked",
    primaryBlocker: "missing_product_address",
    blockers: [
      NO_ADDRESS,
      "source_schema_unverified: the klend-sdk net-APY field's unit (fraction vs percent) is documented by assumption only and is not verified against a live response",
      NO_RISK,
      "no product minimum/maximum evidence",
      "no withdrawal/exit evidence",
    ],
    notes: [
      "The registry documents the NAME 'Steakhouse USDC' (from wallet/kaminoVaults.ts) but a name is not an identity: names are non-unique and mutable on-chain, so matching by name is explicitly rejected.",
      "wallet/kaminoVaults.ts resolves vault addresses only via getUserSharesBalanceAllVaults(owner) — that is OWNER-scoped position detection, not product discovery. It cannot supply a canonical product address for an unheld product.",
      "Per Step 16A/16B this product stays excess-lane only; nothing here changes that or grants approval.",
    ],
  },
  {
    manifestVersion: STABLE_YIELD_EVIDENCE_MANIFEST_VERSION,
    strategyId: "kamino_usdc_lending",
    protocolId: "kamino",
    chain: "solana_mainnet",
    asset: "USDC",
    productAddress: undefined,
    apySource: "Kamino official SDK (klend-sdk) reserve/market state",
    apySourceRef: "klend-sdk:reserve state",
    apySelectedField: "unresolved — no exact reserve/market address documented, so no field can be selected",
    apyUnitInterpretation: "unverified",
    apySourceTimestampField: "reserve state read slot time",
    apyFreshnessPolicy: "16C canonical max age (1h); source time authoritative",
    apyAdapterState: "no_adapter",
    capacitySource: undefined,
    capacityFieldOrFormula: undefined,
    capacityAdapterState: "no_adapter",
    constraintsState: "blocked",
    depositAvailabilityState: "blocked",
    exitEvidenceState: "blocked",
    riskReviewState: "blocked",
    missingRiskItems: ["protocol_review_status", "product_review_status", "market_identity", "audit_evidence", "admin_upgradeability", "oracle_exposure", "review_date", "reviewer_metadata"],
    positionDetectionState: "no_adapter",
    positionMatchMechanism: undefined,
    readiness: "blocked",
    primaryBlocker: "missing_product_address",
    blockers: [NO_ADDRESS, "no exact Kamino USDC reserve/market address documented", NO_RISK],
    notes: [
      "This is the ONLY current candidate whose strategy type (lending) is intrinsically buffer-lane eligible per Step 16A — which makes its risk review the highest-value 16H-H work, but it is equally blocked on identity.",
      "A buffer-lane plan would additionally require the canonical buffer-yield minimum, which is explicitly NOT defined in this step.",
    ],
  },
  {
    manifestVersion: STABLE_YIELD_EVIDENCE_MANIFEST_VERSION,
    strategyId: "raydium_stable_usdc_strategy",
    protocolId: "raydium",
    chain: "solana_mainnet",
    asset: "USDC",
    productAddress: undefined,
    apySelectedField: undefined,
    apyUnitInterpretation: "unverified",
    apyAdapterState: "no_adapter",
    capacityAdapterState: "no_adapter",
    constraintsState: "blocked",
    depositAvailabilityState: "blocked",
    exitEvidenceState: "blocked",
    riskReviewState: "blocked",
    missingRiskItems: ["protocol_review_status", "product_review_status", "product_identity", "audit_evidence", "review_date", "reviewer_metadata"],
    positionDetectionState: "no_adapter",
    readiness: "blocked",
    primaryBlocker: "no_official_product_documented",
    blockers: [
      "no_official_product_documented: the registry records Raydium as an in-scope protocol but documents no exact stable-USDC product, official URL, or address — the entry is an explicit placeholder",
      NO_ADDRESS,
      NO_RISK,
    ],
    notes: ["A protocol being in scope is not a product. No adapter is written for a product that does not yet exist in the registry as a concrete, identified thing."],
  },
  {
    manifestVersion: STABLE_YIELD_EVIDENCE_MANIFEST_VERSION,
    strategyId: "meteora_stable_usdc_strategy",
    protocolId: "meteora",
    chain: "solana_mainnet",
    asset: "USDC",
    productAddress: undefined,
    apySelectedField: undefined,
    apyUnitInterpretation: "unverified",
    apyAdapterState: "no_adapter",
    capacityAdapterState: "no_adapter",
    constraintsState: "blocked",
    depositAvailabilityState: "blocked",
    exitEvidenceState: "blocked",
    riskReviewState: "blocked",
    missingRiskItems: ["protocol_review_status", "product_review_status", "product_identity", "audit_evidence", "review_date", "reviewer_metadata"],
    positionDetectionState: "no_adapter",
    readiness: "blocked",
    primaryBlocker: "no_official_product_documented",
    blockers: [
      "no_official_product_documented: the registry records Meteora as in-scope but documents no exact stable-USDC product, official URL, or address — explicit placeholder",
      NO_ADDRESS,
      NO_RISK,
    ],
    notes: ["Same as Raydium: in-scope protocol, no identified product."],
  },
  {
    manifestVersion: STABLE_YIELD_EVIDENCE_MANIFEST_VERSION,
    strategyId: "hubble_usdc_strategy",
    protocolId: "hubble",
    chain: "solana_mainnet",
    asset: "USDC",
    productAddress: undefined,
    apySelectedField: undefined,
    apyUnitInterpretation: "unverified",
    apyAdapterState: "no_adapter",
    capacityAdapterState: "no_adapter",
    constraintsState: "blocked",
    depositAvailabilityState: "blocked",
    exitEvidenceState: "blocked",
    riskReviewState: "blocked",
    missingRiskItems: ["product_review_status", "product_identity", "review_date", "reviewer_metadata"],
    positionDetectionState: "no_adapter",
    readiness: "unsupported",
    primaryBlocker: "product_not_a_yield_venue",
    blockers: [
      "product_not_a_yield_venue: the registry documents Hubble as a USDH CDP, not a deploy-into USDC yield venue — there is no USDC deposit product to adapt",
      NO_ADDRESS,
    ],
    notes: [
      "Marked `unsupported` rather than `blocked`: the other candidates are blocked on MISSING evidence, whereas this one appears to be a category mismatch. That is a documentation-backed observation, not a risk judgement.",
      "Hubble receives NO name-based penalty and no risk score is assigned or altered here. If a later review identifies a genuine Hubble USDC yield product, this manifest should be revisited on evidence.",
    ],
  },
];

/** All candidate manifests, in canonical registry order. Cloned — callers cannot mutate the source. */
export function listStableYieldEvidenceManifests(): StableYieldCandidateEvidence[] {
  return MANIFESTS.map((m) => JSON.parse(JSON.stringify(m)) as StableYieldCandidateEvidence);
}

export function getStableYieldEvidenceManifest(strategyId: string): StableYieldCandidateEvidence | undefined {
  const m = MANIFESTS.find((x) => x.strategyId === strategyId);
  return m ? (JSON.parse(JSON.stringify(m)) as StableYieldCandidateEvidence) : undefined;
}

/** Candidates a human may take into an explicit Step 16H-H approval review. Currently none. */
export function listCandidatesReadyForReview(): StableYieldCandidateEvidence[] {
  return listStableYieldEvidenceManifests().filter((m) => m.readiness === "ready_for_review");
}

/**
 * The readiness matrix row — a compact per-candidate view for the 16H-H reviewer. It deliberately
 * separates "adapter implemented" from "source verified" from "evidence complete" from "approved",
 * so an implemented adapter can never be mistaken for an approved product.
 */
export interface StableYieldReadinessRow {
  strategyId: string;
  identityAdapter: boolean;
  apyAdapter: boolean;
  freshnessValidation: boolean;
  capacityAdapter: boolean;
  depositStateAdapter: boolean;
  productMinMax: boolean;
  riskReviewEvidence: boolean;
  positionDetection: boolean;
  orchestrationCompatible: boolean;
  readyForExplicitReview: boolean;
  approved: false;
  blockerCount: number;
  primaryBlocker: string;
}

/**
 * Build the readiness matrix from the manifests + the live registry. `approved` is hard-coded `false`:
 * this layer cannot approve a product, and the type makes that unrepresentable.
 */
export function buildStableYieldReadinessMatrix(): StableYieldReadinessRow[] {
  const registry = listYieldStrategies();
  return listStableYieldEvidenceManifests().map((m) => {
    const entry = registry.find((e) => e.strategyId === m.strategyId);
    const identityAdapter = entry?.address != null;
    const impl = (s: StableYieldEvidenceState) => s === "adapter_implemented_source_unverified" || s === "adapter_implemented_source_verified" || s === "evidence_complete";
    return {
      strategyId: m.strategyId,
      identityAdapter,
      apyAdapter: impl(m.apyAdapterState),
      // Freshness validation is contract-level and applies to every adapter that runs.
      freshnessValidation: impl(m.apyAdapterState),
      capacityAdapter: impl(m.capacityAdapterState),
      depositStateAdapter: impl(m.depositAvailabilityState),
      productMinMax: m.productMinimumUsd !== undefined || m.productMaximumUsd !== undefined,
      riskReviewEvidence: m.riskReviewState === "evidence_complete",
      positionDetection: impl(m.positionDetectionState),
      orchestrationCompatible: true,
      readyForExplicitReview: m.readiness === "ready_for_review",
      approved: false,
      blockerCount: m.blockers.length,
      primaryBlocker: m.primaryBlocker,
    };
  });
}

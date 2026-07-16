/**
 * stableYieldProductionEvidence — Step 16H-G. The versioned, machine-readable EVIDENCE MANIFEST for
 * every current production Stable Yield candidate, plus the approval-readiness matrix that Step 16H-H
 * will review.
 *
 * This file records what is PROVEN and what is MISSING. It approves nothing: `StableYieldApprovalReadiness`
 * has no `approved` member, and no candidate here is approved.
 *
 * STEP 16H-H UPDATE — the 16H-G universal blocker ("no candidate has an exact address") is partly
 * resolved. `kamino_steakhouse_usdc` now has an exact address verified from two independent official
 * sources, and the Kamino APY unit is proven. The candidate set was also cleaned up: three
 * protocol-level placeholders are now explicitly `unsupported_for_mvp` rather than sitting
 * indistinguishable from real products.
 *
 * Identity verification is NOT approval. Every candidate remains ineligible, production still returns
 * `no_plan`, and no Stable Yield card renders.
 */
import { listYieldStrategies } from "./yieldStrategyRegistry";
import type { StableYieldApprovalReadiness } from "./stableYieldProductionAdapterTypes";

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
  primaryBlocker: StableYieldEvidencePrimaryStatus;
  blockers: string[];
  notes: string[];
}

/**
 * Step 16H-H — the deterministic primary status of a candidate's evidence. Exactly one applies, even
 * when several blockers exist. There is deliberately no `approved` member: this file records evidence,
 * and approval is a separate explicit reviewed decision.
 */
export type StableYieldEvidencePrimaryStatus =
  | "ready_for_approval_review"
  | "blocked_identity"
  | "blocked_source_schema"
  | "blocked_apy_unit"
  | "blocked_freshness"
  | "blocked_capacity"
  | "blocked_risk_review"
  | "blocked_position_detection"
  | "unsupported_for_mvp"
  | "archived";

/** Shared blocker text. Candidate-specific blockers are derived from official evidence, never invented. */
const NO_RISK = "risk_review_missing: no complete reviewed 16D risk record exists for this product";

const MANIFESTS: StableYieldCandidateEvidence[] = [
  {
    manifestVersion: STABLE_YIELD_EVIDENCE_MANIFEST_VERSION,
    strategyId: "kamino_steakhouse_usdc",
    protocolId: "kamino",
    chain: "solana_mainnet",
    asset: "USDC",
    // 16H-H: VERIFIED 2026-07-16 from two independent official sources (see notes).
    productAddress: "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E",
    positionIdentifier: "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS",
    apySource: "Kamino official SDK (@kamino-finance/klend-sdk v9.1.2) over Solana RPC",
    apySourceRef: "klend-sdk:KaminoVault.getAPYs(slot).actualAPY.netAPY",
    apySelectedField: "actualAPY.netAPY — RESOLVED at 16H-I. Proven NET by the SDK's own computeNetAPR = grossAPR*(1-performanceFee)-managementFee, and proven APY (not APR) by calculateAPYFromAPR = (1+apr/SLOTS_PER_YEAR)^SLOTS_PER_YEAR-1. One field; never averaged, max-of, or APR-derived. The REST /metrics path was REJECTED (no timestamp, net-vs-gross undeclared).",
    apyUnitInterpretation: "fraction",
    apySourceTimestampField: "RESOLVED at 16H-I — chain block time via rpc.getBlockTime(slot), where `slot` is the same slot passed into getAPYs(slot). Authoritative; local fetchedAt is retrieval metadata only.",
    apyFreshnessPolicy: "16C canonical max age (1h) against the CHAIN block time. Stale/future/missing-blockTime all fail closed; a recent fetch never makes stale chain data fresh.",
    apyAdapterState: "adapter_implemented_source_verified",
    capacitySource: "on-chain VaultState.depositCap — read live 2026-07-16; value is 0",
    capacityFieldOrFormula: "UNRESOLVED: depositCap exists on-chain but the official SDK NEVER reads it, and no official source documents whether 0 means 'no cap' or 'closed', nor which field is the matching used-counterpart. Guessing either way would invent capacity, so it stays `unknown`.",
    capacityAdapterState: "blocked",
    // Verified live on-chain 2026-07-16: state.minDepositAmount = 100000 raw at 6dp => exactly 0.1 USDC,
    // converted by integer math, never a float round-trip. Distinct from WealthSmith's $250 excess trigger.
    productMinimumUsd: 0.1,
    productMaximumUsd: undefined,
    constraintsState: "adapter_implemented_source_verified",
    depositAvailabilityState: "blocked",
    // Fees read live: managementFeeBps=0, performanceFeeBps=500 (5%). The SDK's computeNetAPR already
    // deducts BOTH from netAPY, so no adapter deducts them again.
    withdrawalModel: undefined,
    exitEvidenceState: "blocked",
    riskReviewState: "blocked",
    riskReviewDate: undefined,
    missingRiskItems: ["protocol_review_status", "product_review_status", "audit_evidence", "admin_upgradeability", "oracle_exposure", "withdrawal_restrictions", "review_date", "reviewer_metadata"],
    positionDetectionState: "adapter_implemented_source_verified",
    positionMatchMechanism: "EXACT vault address HDsay... and/or the exact vault share (receipt) mint 7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS, both confirmed live on-chain. wallet/kaminoVaults.ts already reads vault-share balances keyed by exact vault address, read-only, via the official SDK.",
    readiness: "blocked",
    // 16H-J.1 resolved capacity from the official kvault source, so `blocked_capacity` no longer
    // applies. The dominant remaining blocker is the risk review: rubric v1 is only PROPOSED, no
    // reviewer is authorized, and five evidence gaps stand.
    primaryBlocker: "blocked_risk_review",
    blockers: [
      "blocked_risk_review (PRIMARY): rubric v1.0.0 is proposed_for_approval (not approved), no authorized reviewer exists, and 8 of 12 v1 dimensions carry a mandatory blocker. No score can be assigned.",
      "blocked_deposit_state: the on-chain VaultState exposes NO pause/enabled field. A successful read is not proof deposits are enabled. NOTE: capacity is verified_uncapped (16H-J.1) — that is a SEPARATE question and is not evidence deposits are enabled.",
      NO_RISK,
      "curation: three 'Steakhouse' USDC vaults exist - WealthSmith must choose which is the intended product (see notes).",
      "no withdrawal/exit or fee evidence collected",
    ],
    notes: [
      "IDENTITY VERIFIED 2026-07-16 from two independent official sources: (1) Kamino's official product registry `GET https://api.kamino.finance/kvaults/vaults` returns a vault at HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E whose on-chain state.name decodes to exactly 'Steakhouse USDC' and whose state.tokenMint is the canonical USDC mint; (2) Kamino's official documentation uses that same address as its canonical KaminoVault SDK example. The ADDRESS is the identity; the name is only corroboration.",
      "CURATION DECISION FOR THE REVIEWER: the official registry holds 159 vaults, 89 with the USDC mint, of which THREE carry 'Steakhouse' in the name - 'Steakhouse USDC' (HDsay..., bound here), 'Steakhouse High Yield USDC' (BEEfo7xwgK2ZP13Pxo7qqTPzAteKJmXjVWtMWcXSvbn2) and 'Steakhouse USDC Testing' (JDmkiqvtyAqAsqrLGDgVH2GesbRAAMJCoQtqiyWx82bF). This entry binds the exact-name match, but choosing between 'Steakhouse USDC' and 'Steakhouse High Yield USDC' is a product decision with materially different risk profiles. It is not derivable from data and must be made by a human.",
      "APY UNIT RESOLVED (this was the 16H-G blocker): Kamino returns a decimal FRACTION, and it is APY not APR. Proven by the official docs' own display code `(vault.apy7d * 100).toFixed(2)` - the *100 is the proof - and corroborated by live values (apy7d 0.0401 ~ 4.01%, a plausible USDC rate; read as percent it would be an implausible 0.04%).",
      "SCHEMA FINDING: the live API returns rates as high-precision decimal STRINGS (e.g. '0.040110766058785959014'), not numbers. The parser gained an explicit documented-decimal-string reader for THIS source only; strings remain rejected everywhere else.",
      "wallet/kaminoVaults.ts resolves vault addresses only via getUserSharesBalanceAllVaults(owner) - OWNER-scoped position detection, not product discovery. The address above came from the official product registry instead.",
      "Per Step 16A/16B this product stays excess-lane only. Identity verification grants NO eligibility and NO approval.",
      "16H-I LIVE VERIFICATION 2026-07-16 (Helius mainnet RPC, redacted): on-chain state.name decoded to 'Steakhouse USDC' (a THIRD independent identity confirmation), tokenMint=USDC, sharesMint matched, decimals=6, slot 433263778, chain block time 2026-07-16T11:27:33Z, getAPYs(slot).actualAPY.netAPY = 0.038774279858246 (fraction) => 3.877428%, minDepositAmount 100000 raw => 0.1 USDC, managementFeeBps=0, performanceFeeBps=500, depositCap=0.",
      "16H-I RESOLVED the freshness + net/gross blockers: chain block time is now the authoritative source time, and actualAPY.netAPY is a proven net, fraction-unit APY (SDK source: computeNetAPR deducts perf+mgmt fees; calculateAPYFromAPR compounds APR->APY).",
      "16H-I did NOT resolve capacity: depositCap reads 0 on-chain, and 0 is unsafe to interpret without official semantics. This is now the PRIMARY blocker.",
    ],
  },
  {
    manifestVersion: STABLE_YIELD_EVIDENCE_MANIFEST_VERSION,
    strategyId: "kamino_usdc_lending",
    protocolId: "kamino",
    chain: "solana_mainnet",
    asset: "USDC",
    // 16H-N.1: identity RESOLVED to the exact reserve (see klendReserveIdentity.ts). Economics remain
    // unresolved — identity tells you which reserve, not what it pays.
    productAddress: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
    apySource: "Kamino official SDK (klend-sdk) reserve/market state",
    apySourceRef: "klend-sdk:reserve state",
    apySelectedField: "STILL UNRESOLVED (16H-N.1): the exact reserve is now bound, but supply APY is not a field on reserve state. It must be derived from borrowRateCurve + utilization + protocolTakeRatePct, or sourced from an official endpoint. Identity resolution deliberately did not attempt this.",
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
    // 16H-N.1: `blocked_identity` is RESOLVED — the exact reserve is bound. The evidence model
    // separates identity blockers from market-data blockers, so the primary blocker MOVES rather than
    // staying stale. Leaving `blocked_identity` would assert something now false.
    primaryBlocker: "blocked_apy_unit",
    blockers: [
      "blocked_apy_unit (PRIMARY, 16H-N.1): identity is resolved, but supply APY is NOT a field on klend reserve state. It must be derived from borrowRateCurve + utilization + protocolTakeRatePct, or sourced from an official endpoint — until then no net-vs-gross unit can be declared and no APY adapter exists.",
      "capacity_adapter_missing: depositLimit and supplied are readable from reserve state, but no capacity adapter derives remaining capacity for this product.",
      "deposit_availability_blocked: reserve status/emergencyMode are readable, but no availability adapter evaluates them and the 16H-L.1 read-only deposit-state policy has not been applied to this reserve.",
      NO_RISK,
      "RESOLVED at 16H-N.1 (retained for provenance, no longer blocking) — blocked_identity: the product is the USDC RESERVE. The 16H-H finding that no REST endpoint enumerates a market's reserves remains TRUE, but it wrongly implied no official source existed. The official installed klend-sdk enumerates reserves directly. Resolved to reserve D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59 in market 7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF at slot 433342218. A market address was NEVER substituted into the product-identity field — the bound address is the RESERVE.",
    ],
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
    readiness: "unsupported",
    primaryBlocker: "unsupported_for_mvp",
    blockers: [
      "unsupported_for_mvp (PRIMARY): Raydium's USDC venues are trading pools. A USDC trading pair is not a USDC deposit product: modelling one as Stable Yield would carry impermanent-loss and depeg exposure that the 16D risk contract and the 16H-B presentation do not model, so it could not be described honestly as 'put excess USDC to work'.",
      "no exact product, official URL, or address is documented - the entry describes a PROTOCOL and a strategy category, not a product",
    ],
    notes: [
      "A protocol being in scope is not a product. No adapter is written for a product that does not exist in the registry as a concrete, identified thing.",
      "PRODUCT-MODEL decision, not a risk judgement about Raydium and not a name-based penalty. Retained (not deleted) for traceability; revisit on evidence if a concrete Raydium USDC deposit product is identified.",
    ],
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
    readiness: "unsupported",
    primaryBlocker: "unsupported_for_mvp",
    blockers: [
      "unsupported_for_mvp (PRIMARY): Meteora's USDC venues are dynamic liquidity pools. A dynamic LP position is not a simple USDC yield account - its impermanent-loss, rebalancing and depeg exposure are not modelled by the 16D risk contract or the 16H-B presentation.",
      "no exact product, official URL, or address is documented - a PROTOCOL and strategy category, not a product",
    ],
    notes: [
      "Same as Raydium: in-scope protocol, no identified product.",
      "PRODUCT-MODEL decision, not a risk judgement about Meteora and not a name-based penalty. Retained for traceability.",
    ],
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
    primaryBlocker: "unsupported_for_mvp",
    blockers: [
      "unsupported_for_mvp (PRIMARY): the registry documents Hubble as a USDH CDP. A CDP requires the user to open a debt position and mint USDH; the Stable Yield contract models a direct USDC deposit that earns yield WITHOUT borrowing. The user action does not match, so no exact product satisfies the contract.",
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

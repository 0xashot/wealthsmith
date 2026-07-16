/**
 * yieldStrategyRegistry — Step 16B. The deterministic, versioned catalog of EXACT Yield Strategy
 * products (USDC MVP) + read-only accessors + validators. It knows WHAT products exist, not which is
 * better. Every product's on-chain address is `undefined` and its lifecycle `documentation_required`,
 * because the repository documents no exact stable-yield vault/market addresses (Kamino vault
 * addresses resolve via the SDK at runtime; Raydium/Meteora have no manage URL wired; Hubble is a
 * USDH CDP, not a deploy-into yield venue). No address is fabricated. Reuses the 16A taxonomy/lanes.
 */
import {
  YIELD_STRATEGY_REGISTRY_SCHEMA_VERSION,
  YIELD_STRATEGY_REGISTRY_VERSION,
  type YieldStrategyLifecycle,
  type YieldStrategyRegistryEntry,
  type YieldStrategyRegistryValidationResult,
} from "./yieldStrategyRegistryTypes";
import {
  STABLE_YIELD_SUPPORTED_PROTOCOLS,
  STABLE_YIELD_FORBIDDEN_PROTOCOLS,
  getStableYieldStrategyDefinition,
} from "./stableYieldPolicy";
import type { StableYieldSupportedProtocol } from "./stableYieldPolicyTypes";

export const YIELD_STRATEGY_REGISTRY_EXISTS = true;

const KAMINO_URL = "https://app.kamino.finance"; // documented in protocolRegistry.ts (manageUrl)

const OFF = { marketDataEvaluated: false as const, eligibilityEvaluated: false as const, comparisonEvaluated: false as const, suggestionGenerated: false as const, transactionsEnabled: false as const, walletSignatureRequired: false as const };

/**
 * Registry entries. Order is display determinism, NOT ranking. Every entry is
 * `documentation_required` with `address: undefined` — the repo documents no exact addresses.
 */
const REGISTRY: YieldStrategyRegistryEntry[] = [
  {
    schemaVersion: "1.0.0",
    registryVersion: "1.0.0",
    strategyId: "kamino_steakhouse_usdc",
    displayName: "Kamino Steakhouse USDC",
    protocolId: "kamino",
    protocolDisplayName: "Kamino",
    strategyType: "managed_vault",
    principalAsset: "USDC",
    supportedLane: "excess_usdc_yield",
    riskLane: "excess_only",
    // Step 16H-H — exact identity PROVEN from official sources; still NOT approved and still ineligible.
    lifecycle: "identity_verified",
    officialUrl: KAMINO_URL,
    documentationUrl: "https://kamino.com/docs/build/api-reference/earn/vault-data/vaults-list",
    // The exact on-chain vault address, verified 2026-07-16 against TWO independent official sources:
    //  1. Kamino's official product registry `GET https://api.kamino.finance/kvaults/vaults` returns a
    //     vault at this address whose on-chain `state.name` decodes to exactly "Steakhouse USDC" and
    //     whose `state.tokenMint` is the canonical USDC mint.
    //  2. Kamino's official docs use this same address as the canonical `KaminoVault` SDK example.
    // It is NOT derived from the name: the name is corroborating evidence, the address is the identity.
    address: "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E",
    ...OFF,
    notes: [
      "16H-H: identity verified from the official Kamino API (/kvaults/vaults) + the official docs SDK example. Vault share (receipt) mint for 16F position detection: 7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS. On-chain state.minDepositAmount = 100000 raw (USDC 6dp => 0.1 USDC).",
      "CURATION DECISION OPEN (16H-I): the official registry contains THREE USDC vaults with 'Steakhouse' in the name — 'Steakhouse USDC' (this one), 'Steakhouse High Yield USDC' (BEEfo7xwgK2ZP13Pxo7qqTPzAteKJmXjVWtMWcXSvbn2) and 'Steakhouse USDC Testing' (JDmkiqvtyAqAsqrLGDgVH2GesbRAAMJCoQtqiyWx82bF). This entry binds the exact-name match, but WHICH vault WealthSmith intends is a human product decision with different risk profiles — it is not derivable here.",
      "Still blocked for approval: the /metrics endpoint exposes no source timestamp (freshness cannot be established), no capacity fields, and does not declare net-vs-gross on its `apy` field. No risk review exists.",
    ],
  },
  {
    schemaVersion: "1.0.0",
    registryVersion: "1.0.0",
    strategyId: "kamino_usdc_lending",
    displayName: "Kamino USDC Lending",
    protocolId: "kamino",
    protocolDisplayName: "Kamino",
    strategyType: "lending",
    principalAsset: "USDC",
    supportedLane: "safety_buffer_yield",
    riskLane: "buffer_eligible",
    // 16H-N.1: documentation_required -> identity_verified. Same transition kamino_steakhouse_usdc
    // made at 16H-H once its identity was resolved. IDENTITY ONLY — every ...OFF flag stays off, and
    // APY / capacity / constraints / deposit availability remain blocked. Knowing what a product is
    // says nothing about whether it is available, safe, or recommendable.
    lifecycle: "identity_verified",
    officialUrl: KAMINO_URL,
    /** The exact RESERVE — the product is the reserve, not the market. See klendReserveIdentity.ts. */
    address: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
    ...OFF,
    notes: [
      "Kamino supports a USDC lending market (protocolRegistry.ts supportedAssets includes USDC). Lending is intrinsically buffer-eligible per Step 16A.",
      "16H-H (PRESERVED — the original blocker, not rewritten): the official markets endpoint (GET /v2/kamino-market, checked 2026-07-16) returns 34 lending MARKETS with their addresses, but Kamino documents NO endpoint that lists a market's reserves or their addresses. The product here is the USDC RESERVE, not the market. Writing a market address into `address` would place the wrong identifier in the product-identity field purely to satisfy the adapter, so this stays undefined. Blocker: resolve the exact USDC reserve address from an official source.",
      "16H-N.1 SUPERSEDES that blocker. It was RIGHT that no REST endpoint enumerates reserves — that is still true. It was WRONG to generalise 'no REST endpoint' to 'no official source': the official @kamino-finance/klend-sdk, already installed here, enumerates reserves directly (KaminoMarket.load -> loadReserves -> getReserves -> getReservesByMint). Resolved at slot 433342218 (2026-07-16T20:27:09Z) to the SOL/BTC Market (7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF) USDC reserve D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59, cToken mint B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D, under hash-verified KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD.",
      "16H-N.1 DISAMBIGUATION: getReservesByMint(USDC) returns FOUR reserves in this market — mint is NOT an identifier. Three are status 2 (Hidden) with zero deposit limit; exactly one is status 0 (Active). The resolver requires exactly one Active match and fails closed otherwise. See klendReserveIdentity.SOL_BTC_MARKET_OTHER_USDC_RESERVES.",
      "16H-N.1 STILL BLOCKED: supply APY is NOT on reserve state (must be derived from borrowRateCurve + utilization + protocolTakeRate, or sourced officially) — apyAdapterState stays no_adapter. Capacity, constraints and deposit availability remain blocked. No risk assessment, no human review, no signoff, no approval, no selector integration, no card.",
      "16H-N.1 SHARED RISK (non-blocking): this is the SAME reserve carrying 87.61% of kamino_steakhouse_usdc's allocation. Direct lending removes KVault layers but creates NO diversification versus Steakhouse — same market, reserve, owner, council and oracle. Recorded for future selector logic; no selector behaviour added.",
    ],
  },
  {
    schemaVersion: "1.0.0",
    registryVersion: "1.0.0",
    strategyId: "raydium_stable_usdc_strategy",
    displayName: "Raydium Stable USDC Strategy",
    protocolId: "raydium",
    protocolDisplayName: "Raydium",
    strategyType: "stable_liquidity_strategy",
    principalAsset: "USDC",
    supportedLane: "excess_usdc_yield",
    riskLane: "excess_only",
    lifecycle: "unsupported_for_mvp",
    officialUrl: undefined,
    address: undefined,
    ...OFF,
    notes: [
      "Raydium is a documented candidate (protocolRegistry.ts) but no exact stable-USDC product, manage URL, or address is documented — this entry describes a PROTOCOL and a strategy category, not a product.",
      "16H-H decision: unsupported_for_mvp. Raydium's USDC venues are trading pools; a USDC trading pair is not a USDC deposit product. Modelling one as Stable Yield would require impermanent-loss and depeg exposure that the 16D risk contract and the Stable Yield presentation do not model, so it cannot be represented honestly to a user as 'put excess USDC to work'. Retained (not deleted) for traceability.",
      "This is a product-model decision, NOT a risk judgement about Raydium and NOT a name-based penalty. If a concrete, reviewable Raydium USDC deposit product is identified later, this may be revisited on evidence.",
    ],
  },
  {
    schemaVersion: "1.0.0",
    registryVersion: "1.0.0",
    strategyId: "meteora_stable_usdc_strategy",
    displayName: "Meteora Stable USDC Strategy",
    protocolId: "meteora",
    protocolDisplayName: "Meteora",
    strategyType: "stable_liquidity_strategy",
    principalAsset: "USDC",
    supportedLane: "excess_usdc_yield",
    riskLane: "excess_only",
    lifecycle: "unsupported_for_mvp",
    officialUrl: undefined,
    address: undefined,
    ...OFF,
    notes: [
      "Meteora is a documented candidate (protocolRegistry.ts) but no exact stable-USDC product, manage URL, or address is documented — a PROTOCOL and strategy category, not a product.",
      "16H-H decision: unsupported_for_mvp. Meteora's USDC venues are dynamic liquidity pools; a dynamic LP position is not a simple USDC yield account. Its impermanent-loss, rebalancing and depeg exposure are not modelled by the 16D risk contract or the Stable Yield presentation. Retained for traceability.",
      "Product-model decision only — not a risk judgement about Meteora and not a name-based penalty.",
    ],
  },
  {
    schemaVersion: "1.0.0",
    registryVersion: "1.0.0",
    strategyId: "hubble_usdc_strategy",
    displayName: "Hubble Stable USDC Strategy",
    protocolId: "hubble",
    protocolDisplayName: "Hubble",
    strategyType: "lending",
    principalAsset: "USDC",
    supportedLane: "excess_usdc_yield",
    riskLane: "excess_only",
    lifecycle: "unsupported_for_mvp",
    officialUrl: undefined,
    address: undefined,
    ...OFF,
    notes: [
      "Hubble is within the documented protocol scope but the repo documents it as a USDH CDP, not a deploy-into USDC yield venue. No exact product or address is documented.",
      "16H-H decision: unsupported_for_mvp on PRODUCT-MODEL incompatibility. A CDP requires the user to open a debt position and mint USDH; the Stable Yield contract models a direct USDC deposit that earns yield without borrowing. The user action does not match, so no exact product satisfies the contract.",
      "Explicitly: this is not a statement that Hubble is bad or unsafe, no risk score is assigned or altered, and no name-based penalty is applied (16E scoring is untouched). If Hubble offers a direct USDC deposit product later, this may be revisited on evidence.",
    ],
  },
];

const clone = (e: YieldStrategyRegistryEntry): YieldStrategyRegistryEntry => JSON.parse(JSON.stringify({ ...e, address: e.address }));

/* ------------------------------------------------------------------ *
 * Read-only accessors (registry order; never scored/sorted/filtered by data).
 * ------------------------------------------------------------------ */
export function listYieldStrategies(): YieldStrategyRegistryEntry[] {
  return REGISTRY.map(clone);
}
export function getYieldStrategy(strategyId: string): YieldStrategyRegistryEntry | undefined {
  const e = REGISTRY.find((x) => x.strategyId === strategyId);
  return e ? clone(e) : undefined;
}
export function getYieldStrategiesByProtocol(protocolId: string): YieldStrategyRegistryEntry[] {
  return listYieldStrategies().filter((e) => e.protocolId === protocolId);
}
export function getYieldStrategiesByLifecycle(lifecycle: YieldStrategyLifecycle): YieldStrategyRegistryEntry[] {
  return listYieldStrategies().filter((e) => e.lifecycle === lifecycle);
}
/** Approved products only — the set that may proceed to Step 16C (currently empty; none documented). */
export function getApprovedYieldStrategies(): YieldStrategyRegistryEntry[] {
  return getYieldStrategiesByLifecycle("approved");
}

/* ------------------------------------------------------------------ *
 * Validation (fails closed).
 * ------------------------------------------------------------------ */
const LIFECYCLES: YieldStrategyLifecycle[] = ["approved", "review", "identity_verified", "documentation_required", "unsupported_for_mvp", "archived", "deprecated", "disabled", "future"];

/**
 * Step 16H-H — lifecycle states that must never reach an adapter, comparison, or planning. `approved`
 * is the ONLY state that may; these are listed explicitly so a reader sees the exclusion, not an
 * implicit `!== "approved"` scattered across call sites.
 */
const INELIGIBLE_LIFECYCLES: YieldStrategyLifecycle[] = ["unsupported_for_mvp", "archived", "deprecated", "disabled"];

/** True when a candidate is excluded from the ACTIVE production set (adapters/comparison/planning). */
export function isYieldStrategyExcluded(entry: YieldStrategyRegistryEntry): boolean {
  return INELIGIBLE_LIFECYCLES.includes(entry.lifecycle);
}

/** The ACTIVE production candidate set — placeholders/unsupported/archived removed. Never approved-only. */
export function listActiveYieldStrategyCandidates(): YieldStrategyRegistryEntry[] {
  return listYieldStrategies().filter((e) => !isYieldStrategyExcluded(e));
}
const STRATEGY_TYPES = ["lending", "managed_vault", "staking_like_vault", "stable_liquidity_strategy", "future_other"];
const RISK_LANES = ["buffer_eligible", "excess_only", "unsupported"];
const LANES = ["safety_buffer_yield", "excess_usdc_yield"];

/** Validate one registry entry. Fails closed. */
export function validateYieldStrategyEntry(entry: unknown): YieldStrategyRegistryValidationResult {
  const errors: string[] = [];
  if (!entry || typeof entry !== "object") return { valid: false, errors: ["entry_not_an_object"] };
  const e = entry as YieldStrategyRegistryEntry;
  if (e.schemaVersion !== YIELD_STRATEGY_REGISTRY_SCHEMA_VERSION) errors.push("missing_or_wrong_schema_version");
  if (e.registryVersion !== YIELD_STRATEGY_REGISTRY_VERSION) errors.push("missing_or_wrong_registry_version");
  if (!e.strategyId || typeof e.strategyId !== "string") errors.push("missing_strategy_id");
  if (!(STABLE_YIELD_SUPPORTED_PROTOCOLS as readonly string[]).includes(e.protocolId)) errors.push("unsupported_protocol_id");
  if ((STABLE_YIELD_FORBIDDEN_PROTOCOLS as readonly string[]).includes(e.protocolId as string)) errors.push("forbidden_protocol_id");
  if (!STRATEGY_TYPES.includes(e.strategyType)) errors.push("unsupported_strategy_type");
  if (!RISK_LANES.includes(e.riskLane)) errors.push("unsupported_risk_lane");
  if (!LANES.includes(e.supportedLane)) errors.push("unsupported_lane");
  if (!LIFECYCLES.includes(e.lifecycle)) errors.push("unknown_lifecycle");
  if (e.principalAsset !== "USDC") errors.push("unsupported_principal_asset");

  // Capability flags must all be off.
  const flags = e.marketDataEvaluated === false && e.eligibilityEvaluated === false && e.comparisonEvaluated === false && e.suggestionGenerated === false && e.transactionsEnabled === false && e.walletSignatureRequired === false;
  if (!flags) errors.push("capability_flag_enabled");

  // A product may only be assigned the buffer lane when its strategy TYPE is intrinsically buffer-eligible.
  if (e.supportedLane === "safety_buffer_yield") {
    const def = getStableYieldStrategyDefinition(e.strategyType);
    if (!def || !def.eligibleLanes.includes("safety_buffer_yield")) errors.push("buffer_lane_on_unsupported_strategy_type");
  }

  // Approved products must be fully documented (documentation URL, official URL, supported asset).
  if (e.lifecycle === "approved") {
    if (!e.documentationUrl) errors.push("approved_without_documentation");
    if (!e.officialUrl) errors.push("approved_without_official_url");
    if (e.principalAsset !== "USDC") errors.push("approved_without_supported_asset");
  }
  return { valid: errors.length === 0, errors };
}

/** Validate the whole registry (or an arbitrary list). Fails closed; rejects duplicates. */
export function validateYieldStrategyRegistry(entries: YieldStrategyRegistryEntry[] = REGISTRY): YieldStrategyRegistryValidationResult {
  const errors: string[] = [];
  if (!Array.isArray(entries)) return { valid: false, errors: ["registry_not_an_array"] };
  const ids = entries.map((e) => e.strategyId);
  if (new Set(ids).size !== ids.length) errors.push("duplicate_strategy_ids");
  const addrs = entries.map((e) => e.address).filter((a): a is string => typeof a === "string");
  if (new Set(addrs).size !== addrs.length) errors.push("duplicate_addresses");
  const docIds = entries.map((e) => e.documentationId).filter((d): d is string => typeof d === "string");
  if (new Set(docIds).size !== docIds.length) errors.push("duplicate_documentation_ids");
  for (const e of entries) {
    const v = validateYieldStrategyEntry(e);
    if (!v.valid) errors.push(`entry_${e?.strategyId ?? "unknown"}:${v.errors.join("/")}`);
  }
  return { valid: errors.length === 0, errors };
}

export { STABLE_YIELD_SUPPORTED_PROTOCOLS };
export type { StableYieldSupportedProtocol };

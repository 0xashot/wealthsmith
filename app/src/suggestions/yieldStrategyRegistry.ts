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
    lifecycle: "documentation_required",
    officialUrl: KAMINO_URL,
    address: undefined,
    ...OFF,
    notes: ["Product name documented in wallet/kaminoVaults.ts ('Steakhouse USDC'). The exact on-chain vault address is resolved via the Kamino SDK at runtime, not documented as a static value — so it stays undefined and the product is documentation_required until an exact address is documented."],
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
    lifecycle: "documentation_required",
    officialUrl: KAMINO_URL,
    address: undefined,
    ...OFF,
    notes: ["Kamino supports a USDC lending market (protocolRegistry.ts supportedAssets includes USDC), but no exact reserve/market address is documented — undefined; documentation_required. Lending is intrinsically buffer-eligible per Step 16A."],
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
    lifecycle: "documentation_required",
    officialUrl: undefined,
    address: undefined,
    ...OFF,
    notes: ["Raydium is a documented candidate (protocolRegistry.ts) but no exact stable-USDC product, manage URL, or address is documented — placeholder; documentation_required."],
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
    lifecycle: "documentation_required",
    officialUrl: undefined,
    address: undefined,
    ...OFF,
    notes: ["Meteora is a documented candidate (protocolRegistry.ts) but no exact stable-USDC product, manage URL, or address is documented — placeholder; documentation_required."],
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
    lifecycle: "documentation_required",
    officialUrl: undefined,
    address: undefined,
    ...OFF,
    notes: ["Hubble is within the documented protocol scope but the repo notes it is a USDH CDP, not currently a deploy-into USDC yield venue. No exact product or address is documented — placeholder; documentation_required."],
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
const LIFECYCLES: YieldStrategyLifecycle[] = ["approved", "review", "documentation_required", "deprecated", "disabled", "future"];
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

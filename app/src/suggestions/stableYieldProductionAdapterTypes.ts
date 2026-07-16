/**
 * stableYieldProductionAdapterTypes — Step 16H-G. The canonical contract for PRODUCTION Stable Yield
 * data adapters: the layer that turns an official source response into a trustworthy input for the
 * existing 16C/16D/16G contracts. It approves nothing, ranks nothing, and plans nothing.
 *
 * The pipeline is deliberately split into five separable stages (never one function):
 *
 *   A. retrieval  — network/source access. NEVER in this module and NEVER in the browser: the 16C
 *                   contract pins `browserFetched: false`, so retrieval lives in the developer-only
 *                   Node probe (`scripts/probe-stable-yield-sources.mjs`) or a future backend.
 *   B. parse      — a STRICT, source-specific parser (`stableYieldSourceParsers.ts`). No `any`.
 *   C. normalize  — canonical record building (`stableYieldProductionAdapters.ts`).
 *   D. validate   — exact identity + unit + freshness validation (fails closed).
 *   E. planning   — the EXISTING 16C→16G pipeline. Unchanged by this step.
 *
 * Fail-closed is the default: every stage returns a typed result + a structured diagnostic, and any
 * doubt yields `planningSafe: false`. Missing data never becomes valid data.
 */
import type { StableYieldSupportedProtocol } from "./stableYieldPolicyTypes";

export const STABLE_YIELD_PRODUCTION_ADAPTER_SCHEMA_VERSION = "1.0.0" as const;
export const STABLE_YIELD_PRODUCTION_ADAPTER_POLICY_ID = "stable_yield_production_adapter_v1" as const;

/** The chain every current candidate lives on. No candidate is cross-chain in the USDC MVP. */
export type StableYieldChain = "solana_mainnet";

/**
 * The canonical Solana USDC mint, documented in `wallet/walletPosition.ts`. This anchors ASSET
 * identity. It does NOT anchor PRODUCT identity — a product still needs its own exact address.
 */
export const CANONICAL_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" as const;

/* ------------------------------------------------------------------ *
 * Stages + diagnostics
 * ------------------------------------------------------------------ */

/** Where an adapter stopped. Ordered from earliest to latest. */
export type StableYieldAdapterStage =
  | "configuration"
  | "fetch"
  | "source_parse"
  | "identity_validation"
  | "unit_normalization"
  | "freshness_validation"
  | "risk_evidence"
  | "capacity_validation"
  | "position_mapping"
  | "canonical_output";

export type StableYieldAdapterFetchStatus = "ok" | "http_error" | "network_error" | "timeout" | "not_attempted" | "credential_missing" | "unsupported";
export type StableYieldAdapterParseStatus = "ok" | "schema_mismatch" | "missing_field" | "invalid_field" | "not_attempted";
export type StableYieldAdapterIdentityStatus = "verified" | "unverified" | "mismatch" | "duplicate" | "not_attempted";
export type StableYieldAdapterFreshnessStatus = "fresh" | "stale" | "future_dated" | "missing_timestamp" | "negative_age" | "not_attempted";
export type StableYieldAdapterOutputStatus = "complete" | "partial" | "unavailable" | "invalid";

/** Why an adapter could not bind data to an exact product. Identity failures are never recoverable. */
export type StableYieldIdentityReason =
  | "product_not_found"
  | "product_identity_mismatch"
  | "duplicate_product_match"
  | "unsupported_product_identity"
  | "missing_product_address"
  | "wrong_chain"
  | "wrong_asset";

/** Coarse source-error class — retryability is derived from this, never guessed per call site. */
export type StableYieldSourceErrorCategory =
  | "none"
  | "transport"
  | "rate_limited"
  | "server_error"
  | "client_error"
  | "schema"
  | "identity"
  | "freshness"
  | "configuration";

/**
 * A structured production-adapter diagnostic. Internal only — never user copy.
 *
 * MUST NOT contain: secrets/API tokens, full wallet addresses, user balances, raw response bodies,
 * or stack traces. `missingField`/`invalidField` name a FIELD PATH, never a value.
 */
export interface StableYieldAdapterDiagnostic {
  schemaVersion: typeof STABLE_YIELD_PRODUCTION_ADAPTER_SCHEMA_VERSION;
  policyId: typeof STABLE_YIELD_PRODUCTION_ADAPTER_POLICY_ID;

  adapterId: string;
  adapterVersion: string;
  strategyId: string;
  sourceName: string;

  stage: StableYieldAdapterStage;
  fetchStatus: StableYieldAdapterFetchStatus;
  parseStatus: StableYieldAdapterParseStatus;
  identityStatus: StableYieldAdapterIdentityStatus;
  freshnessStatus: StableYieldAdapterFreshnessStatus;
  outputStatus: StableYieldAdapterOutputStatus;

  /** The single gate that matters: may this output reach the 16C/16G contracts? */
  planningSafe: boolean;

  reason: string;
  identityReason?: StableYieldIdentityReason;
  missingField?: string;
  invalidField?: string;
  sourceErrorCategory: StableYieldSourceErrorCategory;
  retryable: boolean;
  credentialsRequired: boolean;

  checkedAt: string;
  sourceTimestamp?: string;

  /** The canonical availability this adapter resolves to for the downstream contract. */
  canonicalAvailability: "available" | "unavailable" | "blocked";
}

/* ------------------------------------------------------------------ *
 * Identity
 * ------------------------------------------------------------------ */

/**
 * An EXACT canonical product identity. Every field is required — an adapter may only bind source data
 * to a product when all of them are proven. There is deliberately no optional/partial identity: a
 * partially-known product is an unverified product.
 */
export interface StableYieldCanonicalIdentity {
  strategyId: string;
  protocolId: StableYieldSupportedProtocol;
  asset: "USDC";
  assetMint: typeof CANONICAL_USDC_MINT;
  chain: StableYieldChain;
  /** The exact on-chain product address (vault/market/reserve). Never a protocol name or ticker. */
  productAddress: string;
  sourceAdapterId: string;
}

export type StableYieldIdentityResolution =
  | { verified: true; identity: StableYieldCanonicalIdentity }
  | { verified: false; reason: StableYieldIdentityReason; detail: string };

/* ------------------------------------------------------------------ *
 * Adapter result
 * ------------------------------------------------------------------ */

export type StableYieldAdapterSourceType = "official_protocol_api" | "official_protocol_sdk" | "official_documented_endpoint" | "approved_external_provider" | "none";

/** The uniform envelope every production adapter returns. `output` is present only when planning-safe. */
export interface StableYieldProductionAdapterResult<T> {
  adapterId: string;
  adapterVersion: string;
  strategyId: string;
  sourceType: StableYieldAdapterSourceType;
  sourceName: string;
  /** A documented source identifier — never a URL containing a credential. */
  sourceRef?: string;

  identity?: StableYieldCanonicalIdentity;
  sourceTimestamp?: string;
  fetchedAt?: string;
  checkedAt: string;

  /** Present ONLY when `diagnostic.planningSafe` is true. Absent output is never defaulted. */
  output?: T;
  diagnostic: StableYieldAdapterDiagnostic;
}

/** Approval-readiness of a candidate. `approved` is intentionally NOT a member — 16H-H owns that. */
export type StableYieldApprovalReadiness = "ready_for_review" | "blocked" | "incomplete" | "unsupported";

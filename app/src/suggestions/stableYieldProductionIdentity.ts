/**
 * stableYieldProductionIdentity — Step 16H-G, stage D (identity). The ONLY place a production source
 * record may be bound to a canonical Stable Yield product.
 *
 * Matching is EXACT and address-based. Explicitly rejected, always:
 *   - protocol-name-only matching ("it's a Kamino vault")
 *   - ticker/symbol-only matching ("it's a USDC vault")
 *   - product-name matching ("the vault decodes its name as 'Steakhouse USDC'")
 *   - substring / fuzzy matching
 *   - registry-position matching ("the first USDC vault")
 *   - falling back to another vault from the same protocol, or another product with the same symbol
 *
 * A product NAME is not an identity: names are not unique, are mutable on-chain, and would let a
 * source silently rebind a product. Only the exact address (plus chain + asset) proves identity.
 *
 * CURRENT STATE: every production registry entry carries `address: undefined` (see
 * `yieldStrategyRegistry.ts` — the repository documents no exact stable-yield vault/market address and
 * fabricates none). Therefore EVERY candidate resolves to `missing_product_address` and fails closed.
 * That is the correct result and the primary Step 16H-H blocker — it is not a bug to work around.
 */
import type { YieldStrategyRegistryEntry } from "./yieldStrategyRegistryTypes";
import {
  CANONICAL_USDC_MINT,
  type StableYieldCanonicalIdentity,
  type StableYieldChain,
  type StableYieldIdentityResolution,
} from "./stableYieldProductionAdapterTypes";

export const STABLE_YIELD_PRODUCTION_IDENTITY_EXISTS = true;

const SUPPORTED_CHAIN: StableYieldChain = "solana_mainnet";

/** Base58 (Solana) address shape. Deliberately strict: no 0x, no truncation, no placeholder. */
const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** A source record offering candidate identity evidence. Every field must be proven — none inferred. */
export interface StableYieldSourceIdentityClaim {
  /** The exact on-chain address the SOURCE says this record describes. */
  productAddress?: string;
  /** The asset mint the SOURCE says the product's principal is. */
  assetMint?: string;
  chain?: string;
  /** Present only so a mismatch can be DETECTED — never used to match. */
  productName?: string;
  protocolId?: string;
}

/**
 * Resolve the canonical identity of a registry entry against a source's identity claim.
 *
 * Fails closed with the most specific reason. Order matters: a missing registry address is reported
 * before any source comparison, because without it there is nothing to compare against.
 */
export function resolveStableYieldProductIdentity(args: {
  entry: YieldStrategyRegistryEntry;
  claim: StableYieldSourceIdentityClaim;
  sourceAdapterId: string;
}): StableYieldIdentityResolution {
  const { entry, claim, sourceAdapterId } = args;

  // 1) The registry must document an exact address. This is the current universal blocker.
  if (entry.address == null || entry.address.trim() === "") {
    return {
      verified: false,
      reason: "missing_product_address",
      detail: `registry entry '${entry.strategyId}' documents no exact product address (lifecycle=${entry.lifecycle})`,
    };
  }
  if (!BASE58_ADDRESS.test(entry.address)) {
    return { verified: false, reason: "unsupported_product_identity", detail: `registry address for '${entry.strategyId}' is not a valid base58 address` };
  }

  // 2) The asset must be the supported principal, bound to the canonical mint.
  if (entry.principalAsset !== "USDC") {
    return { verified: false, reason: "wrong_asset", detail: `registry entry '${entry.strategyId}' principal is '${entry.principalAsset}', not USDC` };
  }

  // 3) The source must actually claim an address. No address → nothing to verify.
  if (claim.productAddress == null || claim.productAddress.trim() === "") {
    return { verified: false, reason: "product_not_found", detail: `source record for '${entry.strategyId}' carries no product address` };
  }

  // 4) EXACT address match. This is the only accepted proof of identity.
  if (claim.productAddress !== entry.address) {
    return { verified: false, reason: "product_identity_mismatch", detail: `source address does not equal the documented address for '${entry.strategyId}'` };
  }

  // 5) Chain must be the supported chain when the source states one; an absent chain is not a pass.
  if (claim.chain != null && claim.chain !== SUPPORTED_CHAIN) {
    return { verified: false, reason: "wrong_chain", detail: `source reports chain '${claim.chain}', expected '${SUPPORTED_CHAIN}'` };
  }

  // 6) The source's asset mint must be the canonical USDC mint when stated.
  if (claim.assetMint != null && claim.assetMint !== CANONICAL_USDC_MINT) {
    return { verified: false, reason: "wrong_asset", detail: `source reports a principal mint that is not the canonical USDC mint` };
  }

  // 7) The source's protocol must agree when stated (a cross-check, never a matcher).
  if (claim.protocolId != null && claim.protocolId !== entry.protocolId) {
    return { verified: false, reason: "product_identity_mismatch", detail: `source protocol '${claim.protocolId}' != registry protocol '${entry.protocolId}'` };
  }

  const identity: StableYieldCanonicalIdentity = {
    strategyId: entry.strategyId,
    protocolId: entry.protocolId,
    asset: "USDC",
    assetMint: CANONICAL_USDC_MINT,
    chain: SUPPORTED_CHAIN,
    productAddress: entry.address,
    sourceAdapterId,
  };
  return { verified: true, identity };
}

/**
 * Select the single source record matching a registry entry, by EXACT address only.
 * Zero matches → `product_not_found`. More than one → `duplicate_product_match` (never "pick one").
 */
export function selectSourceRecordByExactAddress<T extends StableYieldSourceIdentityClaim>(args: {
  entry: YieldStrategyRegistryEntry;
  records: T[];
}): { ok: true; record: T } | { ok: false; reason: "missing_product_address" | "product_not_found" | "duplicate_product_match"; detail: string } {
  const { entry, records } = args;
  if (entry.address == null || entry.address.trim() === "") {
    return { ok: false, reason: "missing_product_address", detail: `no documented address for '${entry.strategyId}' — cannot select a source record` };
  }
  const matches = records.filter((r) => r.productAddress === entry.address);
  if (matches.length === 0) return { ok: false, reason: "product_not_found", detail: `no source record carries the documented address for '${entry.strategyId}'` };
  if (matches.length > 1) return { ok: false, reason: "duplicate_product_match", detail: `${matches.length} source records claim the same address for '${entry.strategyId}'` };
  return { ok: true, record: matches[0] };
}

/**
 * refresh-stable-yield-market-data — Step 16H-I. SERVER-SIDE / local Node refresh job for the ONE
 * selected production Stable Yield product: the Kamino "Steakhouse USDC" vault.
 *
 * Mirrors the established `refresh-sol-staking-market-data.mjs` precedent: Node-only, no browser, no
 * secrets in output, bounded timeouts, validates every field, and writes an atomic versioned artifact
 * to tmp/. It NEVER mutates the registry, approves a product, ranks, plans, or moves funds.
 *
 * DIFFERENCES from the SOL-staking job (documented per the step's requirement):
 *   - Source is the official Kamino SDK over an RPC (on-chain), not public REST endpoints. The REST
 *     `/kvaults/.../metrics` path was REJECTED at 16H-H: it carries no source timestamp and declares
 *     net-vs-gross on none of its 12 APY fields.
 *   - Authoritative time is CHAIN time (`getBlockTime(slot)`), not an API-supplied timestamp.
 *   - It refreshes exactly ONE product, bound to one hard-coded canonical address.
 *
 * Run:  STABLE_YIELD_RPC_URL="<url>" npm run refresh:stable-yield-market-data
 *
 * The RPC URL is read ONLY from a Node-only env var. It is deliberately NOT read from
 * `VITE_SOLANA_RPC_URL`: `VITE_`-prefixed vars are inlined into the browser bundle, so a key-bearing
 * URL must never live there.
 */
import { createSolanaRpc, address } from "@solana/kit";
import * as klend from "@kamino-finance/klend-sdk";
import { writeFileSync, renameSync, mkdirSync } from "node:fs";
import path from "node:path";

const APP_DIR = process.cwd();
const TMP_DIR = path.join(APP_DIR, "tmp");
const FINAL_PATH = path.join(TMP_DIR, "stable-yield-market-refresh.json");
const TMP_PATH = `${FINAL_PATH}.tmp`;

export const REFRESH_ARTIFACT_SCHEMA_VERSION = "1.0.0";
const ADAPTER_ID = "kamino_vault_sdk_v1";
const ADAPTER_VERSION = "1.0.0";

/* ---- The EXACT canonical product. Hard-coded on purpose: this job refreshes ONE product. ---- */
const VAULT_ADDRESS = "HDsayqAsDWy3QvANGqh2yNraqcD8Fnjgh73Mhb3WRS5E";
const SHARES_MINT = "7D8C5pDFxug58L9zkwK7bCiDg4kD4AygzbcZUmf5usHS";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const STRATEGY_ID = "kamino_steakhouse_usdc";
/** Explicitly NOT the selected product. Present so a mis-set address fails loudly, never silently. */
const REJECTED_VAULTS = {
  BEEfo7xwgK2ZP13Pxo7qqTPzAteKJmXjVWtMWcXSvbn2: "Steakhouse High Yield USDC",
  JDmkiqvtyAqAsqrLGDgVH2GesbRAAMJCoQtqiyWx82bF: "Steakhouse USDC Testing",
};

const RECENT_SLOT_DURATION_MS = 450; // mirrors wallet/kaminoVaults.ts
const RPC_TIMEOUT_MS = 20_000;

/** Redact any address/URL so nothing sensitive reaches stdout or the artifact. */
const redact = (s) => (typeof s === "string" && s.length > 10 ? `${s.slice(0, 4)}…${s.slice(-4)}` : String(s));
const redactUrl = (u) => { try { const x = new URL(u); return `${x.protocol}//${x.hostname}`; } catch { return "(unparseable)"; } };

const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout:${what}`)), ms))]);

function fail(stage, reason, extra = {}) {
  console.error(`refresh FAILED [${stage}]: ${reason}`);
  if (Object.keys(extra).length) console.error(JSON.stringify(extra, null, 1));
  process.exit(1);
}

async function main() {
  // ---- Stage: configuration ----
  const rpcUrl = process.env.STABLE_YIELD_RPC_URL || process.env.SOLANA_RPC_URL;
  if (!rpcUrl) {
    fail("configuration", "configuration_missing: set STABLE_YIELD_RPC_URL (Node-only; never VITE_-prefixed, which would inline a key into the browser bundle). No public-proxy fallback is used by design.");
  }
  if (rpcUrl.startsWith("http://localhost") || rpcUrl.includes("127.0.0.1")) {
    fail("configuration", "production data must not depend on localhost");
  }
  console.log(`Stable Yield refresh — product ${STRATEGY_ID} @ ${redact(VAULT_ADDRESS)} via ${redactUrl(rpcUrl)}`);

  const rpc = createSolanaRpc(rpcUrl);
  const fetchedAt = new Date().toISOString();

  // ---- Stage: fetch — the slot is read FIRST, so the APY read and the block time refer to it ----
  let slot;
  try {
    slot = await withTimeout(rpc.getSlot().send(), RPC_TIMEOUT_MS, "getSlot");
  } catch (e) {
    fail("fetch", `rpc_unavailable: ${String(e.message).slice(0, 80)}`);
  }
  if (slot == null) fail("fetch", "missing_slot");

  // ---- Stage: fetch — the exact vault, by exact address. No enumeration, no name lookup. ----
  const vault = new klend.KaminoVault(rpc, address(VAULT_ADDRESS), undefined, undefined, RECENT_SLOT_DURATION_MS);
  let state;
  try {
    state = await withTimeout(vault.getState(), RPC_TIMEOUT_MS, "getState");
  } catch (e) {
    fail("fetch", `vault_state_unavailable: ${String(e.message).slice(0, 90)}`);
  }
  if (!state) fail("fetch", "vault_state_missing");

  // ---- Stage: identity_validation — every claim proven, or nothing is written ----
  if (REJECTED_VAULTS[VAULT_ADDRESS]) fail("identity_validation", `refusing a non-selected vault: ${REJECTED_VAULTS[VAULT_ADDRESS]}`);
  const onChainTokenMint = String(state.tokenMint);
  const onChainSharesMint = String(state.sharesMint);
  if (onChainTokenMint !== USDC_MINT) fail("identity_validation", "wrong_asset: vault tokenMint is not the canonical USDC mint");
  if (onChainSharesMint !== SHARES_MINT) fail("identity_validation", "product_identity_mismatch: vault sharesMint does not equal the verified share mint");
  const decimals = Number(state.tokenMintDecimals.toString());
  if (!Number.isInteger(decimals) || decimals !== 6) fail("unit_normalization", `unexpected_mint_decimals:${decimals} (USDC must be 6)`);

  const vaultName = typeof klend.decodeVaultName === "function" ? klend.decodeVaultName(state.name) : undefined;
  const programId = String(vault.programId);

  // ---- Stage: freshness_validation — CHAIN time is authoritative, never our local clock ----
  let blockTimeSec;
  try {
    blockTimeSec = await withTimeout(rpc.getBlockTime(slot).send(), RPC_TIMEOUT_MS, "getBlockTime");
  } catch (e) {
    fail("freshness_validation", `block_time_unavailable: ${String(e.message).slice(0, 80)} (a stale-but-recent fetch must never look fresh, so we fail closed)`);
  }
  if (blockTimeSec == null) fail("freshness_validation", "missing_block_time: getBlockTime returned null — the slot may be older than the node's history. Fail closed rather than substitute local time.");
  const sourceTimestamp = new Date(Number(blockTimeSec) * 1000).toISOString();

  // ---- Stage: source APY — the ONE documented net field, at the slot we read ----
  let apys;
  try {
    apys = await withTimeout(vault.getAPYs(slot), RPC_TIMEOUT_MS, "getAPYs");
  } catch (e) {
    fail("source_parse", `apy_unavailable: ${String(e.message).slice(0, 90)}`);
  }
  if (!apys || !apys.actualAPY) fail("source_parse", "missing_actualAPY");
  const netApyDecimal = apys.actualAPY.netAPY;
  if (netApyDecimal == null) fail("source_parse", "missing_netAPY");

  // Decimal -> string preserves precision; the deterministic parser owns the fraction→percent step.
  const netApyRaw = netApyDecimal.toString();

  // ---- Stage: constraints — integer token math, never a float round-trip ----
  const minDepositRaw = state.minDepositAmount.toString();
  const managementFeeBps = Number(state.managementFeeBps.toString());
  const performanceFeeBps = Number(state.performanceFeeBps.toString());
  if (!Number.isFinite(managementFeeBps) || managementFeeBps < 0) fail("unit_normalization", "invalid_managementFeeBps");
  if (!Number.isFinite(performanceFeeBps) || performanceFeeBps < 0) fail("unit_normalization", "invalid_performanceFeeBps");

  // ---- Stage: capacity_validation — see the doc: `depositCap` exists on-chain but the SDK never
  // reads it and no official source documents its semantics (what 0 or U64_MAX mean, or which field is
  // the matching "used" counterpart). Recording the raw value as EVIDENCE is fine; interpreting it is
  // not. Capacity therefore stays `unknown` — absence of proven semantics is never "uncapped".
  const depositCapRaw = state.depositCap != null ? state.depositCap.toString() : undefined;

  // ---- Stage: deposit state — the on-chain VaultState exposes NO pause/enabled/halt field. A
  // successful read is not proof deposits are enabled, so this stays `unknown`.
  const artifact = {
    schemaVersion: REFRESH_ARTIFACT_SCHEMA_VERSION,
    adapterId: ADAPTER_ID,
    adapterVersion: ADAPTER_VERSION,
    generatedAt: fetchedAt,
    strategyId: STRATEGY_ID,
    productAddress: VAULT_ADDRESS,
    sharesMint: SHARES_MINT,
    depositMint: USDC_MINT,
    programId,
    productName: vaultName ?? null,
    chain: "solana_mainnet",
    sourceType: "official_protocol_sdk",
    sourceMethod: "klend-sdk:KaminoVault.getAPYs(slot).actualAPY.netAPY",
    sourceSlot: String(slot),
    sourceTimestamp,
    fetchedAt,
    netApyRaw,
    netApyUnit: "fraction",
    apyProvenanceKind: "backend_normalized",
    browserFetched: false,
    minDepositRaw,
    mintDecimals: decimals,
    managementFeeBps,
    performanceFeeBps,
    depositCapRaw: depositCapRaw ?? null,
    capacityState: "unknown",
    capacityReason: "depositCap exists on-chain but its semantics are undocumented and the SDK never reads it; no proven used-counterpart. Absence of proven semantics is never verified_uncapped.",
    depositState: "unknown",
    depositStateReason: "VaultState exposes no pause/enabled field; a successful read is not proof deposits are enabled.",
    // Planning-safe stays FALSE: the product is unapproved, capacity and deposit state are unknown,
    // and the 16D risk review is incomplete. This artifact is evidence, not an eligibility grant.
    planningSafe: false,
    blockers: ["product_unapproved", "capacity_unknown", "deposit_state_unknown", "risk_review_incomplete"],
  };

  mkdirSync(TMP_DIR, { recursive: true });
  writeFileSync(TMP_PATH, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  renameSync(TMP_PATH, FINAL_PATH); // atomic

  console.log(`  vault name      : ${vaultName ?? "(undecodable)"}`);
  console.log(`  identity        : tokenMint=USDC ✓  sharesMint ✓  decimals=${decimals} ✓`);
  console.log(`  source slot     : ${slot}`);
  console.log(`  source time     : ${sourceTimestamp}  (chain block time — authoritative)`);
  console.log(`  net APY (raw)   : ${netApyRaw}  [fraction]`);
  console.log(`  min deposit     : ${minDepositRaw} raw @ ${decimals}dp`);
  console.log(`  fees            : mgmt=${managementFeeBps}bps perf=${performanceFeeBps}bps`);
  console.log(`  depositCap raw  : ${depositCapRaw ?? "(absent)"} -> capacity=unknown (semantics undocumented)`);
  console.log(`  deposit state   : unknown (no pause field on-chain)`);
  console.log(`  planningSafe    : false — approval + capacity + deposit state + risk review outstanding`);
  console.log(`\nwrote ${path.relative(APP_DIR, FINAL_PATH)}`);
  process.exit(0);
}

main().catch((e) => fail("unknown", String(e?.message ?? e).slice(0, 120)));

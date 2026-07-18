/**
 * jupiterLendShareAccounting — Step 17D.1. The verified-input share→underlying conversion for Jupiter
 * Lend USDC (jlUSDC), plus the SOURCE-TO-ACCOUNT APPLICABILITY determination that gates whether a
 * recognized underlying claim may be mounted at all.
 *
 * CORE FINDING (fail-closed): the exact deployed share-accounting layout of the pool account
 * 5nmGjA4s… is NOT verifiable from any installed or vendored source. There is no on-chain IDL, no
 * Anchor IDL vendored into this repo, no installed Jupiter SDK account decoder, and no published Rust
 * source for the accrual/total-assets logic. The seven Anchor IDLs Jupiter publishes live only in an
 * external GitHub repo whose last push (2026-07-03) PREDATES the 2026-07-16 redeploy of the liquidity
 * program that governs the exchange price by 13 days — so even that IDL is not a build attestation for
 * the binary that actually computes a supplier's claim. The prior research recorded raw observations
 * (account size 431, discriminator 2a0821dca328d205) but explicitly noted these are NOT permission to
 * invent a decoder. Therefore this module does NOT hardcode any field offset or accounting semantics.
 *
 * WHAT THIS MODULE DOES: (1) exposes the exact rational, integer-only CONVERSION FUNCTION that a future
 * verified layout would feed — with all invariants (floor rounding, zero/denominator/overflow behavior);
 * (2) exposes a pool-account IDENTITY decoder that fail-closes on wrong owner/discriminator/length and,
 * when identity passes, returns UNRESOLVED because no source-backed field layout exists; (3) records the
 * versioned applicability determination = `unresolved` with the exact blockers. Production consequently
 * keeps recognizedUnderlyingRaw null (the Step 17D behavior) — the position stays visible, never faked.
 */
import type { JupiterLendExchangeRate } from "./jupiterLendExistingPosition";
import { JUPITER_LEND_IDENTITY } from "./jupiterLendExistingPosition";

export const JUPITER_LEND_SHARE_ACCOUNTING_VERSION = "1.0.0" as const;

/* ------------------------------------------------------------------ *
 * 1. Pool-account IDENTITY gates (source: risk-evidence package observations — identity only, NOT a
 *    field-layout authority). Used to fail-closed a wrong/foreign account before any decode is attempted.
 * ------------------------------------------------------------------ */
export const JUPITER_LEND_POOL_IDENTITY = {
  poolAccount: JUPITER_LEND_IDENTITY.poolAccount,               // 5nmGjA4s…
  expectedOwnerProgram: JUPITER_LEND_IDENTITY.lendingProgram,   // jup3YeL8… (owns the pool)
  expectedDiscriminatorHex: "2a0821dca328d205",                 // observed; identity gate only
  expectedDataLenBytes: 431,                                    // observed; identity gate only
  cluster: JUPITER_LEND_IDENTITY.cluster,
} as const;

/* ------------------------------------------------------------------ *
 * 2. Exact conversion function — integer/BigInt only, all invariants explicit.
 *    recognized = floor(receiptBalanceRaw × numerator / denominator).
 *    Callers supply numerator/denominator ONLY from a verified layout; this function never invents them.
 * ------------------------------------------------------------------ */
export type ConversionFailure =
  | "malformed_inputs" | "denominator_non_positive" | "negative_numerator" | "negative_shares";

export interface ConversionResult {
  ok: boolean;
  recognizedUnderlyingRaw: string | null;
  failure?: ConversionFailure;
}

const bigOrNull = (s: string): bigint | null => { if (!/^-?[0-9]+$/.test(s)) return null; try { return BigInt(s); } catch { return null; } };

/**
 * Pure deterministic conversion. Documented semantics:
 *   • numerator   = pool total supplier assets (underlying USDC base units) per the deployed model.
 *   • denominator = the authoritative share count (jlUSDC supply / pool total-shares) per deployed model.
 *   • decimal scaling — receipt (6) and underlying (6) share the same scale, so num/den is a pure ratio;
 *     any differing scale MUST be folded into num/den by the verified decoder, never assumed here.
 *   • interest / fees / reserves — must already be reflected in numerator by the verified decoder; this
 *     function does not add or subtract them (it cannot know them without a verified layout).
 *   • rounding — floor (BigInt division truncates toward zero; inputs are non-negative so this is floor).
 *   • overflow — BigInt is arbitrary-precision → no overflow.
 *   • zero shares → "0"; denominator ≤ 0 → fail closed; negative inputs → fail closed.
 */
export function computeRecognizedFromAccounting(receiptBalanceRaw: string, numerator: string, denominator: string): ConversionResult {
  const shares = bigOrNull(receiptBalanceRaw);
  const num = bigOrNull(numerator);
  const den = bigOrNull(denominator);
  if (shares === null || num === null || den === null) return { ok: false, recognizedUnderlyingRaw: null, failure: "malformed_inputs" };
  if (shares < 0n) return { ok: false, recognizedUnderlyingRaw: null, failure: "negative_shares" };
  if (num < 0n) return { ok: false, recognizedUnderlyingRaw: null, failure: "negative_numerator" };
  if (den <= 0n) return { ok: false, recognizedUnderlyingRaw: null, failure: "denominator_non_positive" };
  if (shares === 0n) return { ok: true, recognizedUnderlyingRaw: "0" };
  return { ok: true, recognizedUnderlyingRaw: ((shares * num) / den).toString() }; // floor
}

/* ------------------------------------------------------------------ *
 * 3. Pool-account decoder — identity gates + fail-closed on missing verified layout.
 * ------------------------------------------------------------------ */
export type PoolDecodeStatus = "rejected_identity" | "unresolved_no_verified_layout" | "verified";
export type PoolDecodeFailure = "wrong_pool" | "wrong_owner" | "wrong_discriminator" | "unsupported_length" | "malformed";

export interface PoolAccountObservation {
  poolAddress: string;
  ownerProgram: string;
  discriminatorHex: string;
  dataLenBytes: number;
  /** Present ONLY if a verified layout ever decodes them; absent today. */
  numerator?: string | null;
  denominator?: string | null;
  sourceSlot: number;
}

export interface PoolDecodeResult {
  status: PoolDecodeStatus;
  failure?: PoolDecodeFailure;
  exchangeRate: JupiterLendExchangeRate | null;
  reason: string;
}

/**
 * Validate the exact pool account by IDENTITY, then attempt to produce a verified exchange rate.
 *
 * Identity mismatch (wrong pool/owner/discriminator/length) → `rejected_identity` (fail-closed). Identity
 * pass → we still return `unresolved_no_verified_layout` because NO source-backed field layout exists to
 * map numerator/denominator offsets. A verified rate is produced ONLY if a caller (a future verified
 * decoder) already supplied numerator+denominator from a source-backed layout — which nothing does today.
 */
export function decodePoolShareAccounting(obs: PoolAccountObservation): PoolDecodeResult {
  const id = JUPITER_LEND_POOL_IDENTITY;
  if (typeof obs.poolAddress !== "string" || typeof obs.ownerProgram !== "string" || typeof obs.discriminatorHex !== "string" || typeof obs.dataLenBytes !== "number")
    return { status: "rejected_identity", failure: "malformed", exchangeRate: null, reason: "malformed pool observation" };
  if (obs.poolAddress !== id.poolAccount) return { status: "rejected_identity", failure: "wrong_pool", exchangeRate: null, reason: "pool address mismatch" };
  if (obs.ownerProgram !== id.expectedOwnerProgram) return { status: "rejected_identity", failure: "wrong_owner", exchangeRate: null, reason: "pool owner is not the Jupiter lending program" };
  if (obs.discriminatorHex.toLowerCase() !== id.expectedDiscriminatorHex) return { status: "rejected_identity", failure: "wrong_discriminator", exchangeRate: null, reason: "account discriminator mismatch" };
  if (obs.dataLenBytes !== id.expectedDataLenBytes) return { status: "rejected_identity", failure: "unsupported_length", exchangeRate: null, reason: `unsupported account length ${obs.dataLenBytes}` };
  // Identity confirmed — but there is NO source-backed field layout to read numerator/denominator from.
  if (typeof obs.numerator === "string" && typeof obs.denominator === "string") {
    // Reserved for a FUTURE verified decoder that supplies source-backed accounting values.
    return {
      status: "verified", exchangeRate: {
        underlyingPerShareNum: obs.numerator, underlyingPerShareDen: obs.denominator,
        calculationVersion: `jup_lend_share_accounting_${JUPITER_LEND_SHARE_ACCOUNTING_VERSION}`,
        sourceAccounts: [id.poolAccount], sourceSlot: obs.sourceSlot,
      }, reason: "verified layout supplied numerator/denominator",
    };
  }
  return {
    status: "unresolved_no_verified_layout", exchangeRate: null,
    reason: "pool identity confirmed, but no source-backed field layout is available to decode the supplier share accounting (no vendored IDL, no Rust source; governing liquidity binary postdates the only published IDL). Recognized claim remains unresolved.",
  };
}

/* ------------------------------------------------------------------ *
 * 4. Source-to-account applicability determination (§2) — versioned, with blockers + manifest.
 * ------------------------------------------------------------------ */
export type ShareAccountingApplicability =
  | "verified_for_position_accounting"
  | "provisionally_verified_for_position_accounting"
  | "unresolved";

/** Each narrow §2 criterion, classified independently against installed/vendored evidence only. */
export const SOURCE_TO_ACCOUNT_CRITERIA = [
  { id: "live_pool_owner_matches_program", resolved: true, note: "Evidence: pool 5nmGjA4s… is owned by the lending program jup3YeL8… (risk-evidence package). Identity-level only." },
  { id: "live_discriminator_matches_account_type", resolved: false, note: "An 8-byte discriminator (2a0821dca328d205) was OBSERVED, but no source-backed account-type definition binds that discriminator to a named struct. Observation ≠ verified type." },
  { id: "supplier_share_fields_have_source_backed_layout", resolved: false, note: "BLOCKER. No vendored IDL, no installed decoder, no Rust source. Field offsets for total-assets / total-shares are unknown from installed source. Inventing them is prohibited." },
  { id: "mint_burn_semantics_map_jlusdc_to_claim", resolved: false, note: "BLOCKER. Mint/burn LOGIC is not in any IDL (names/layouts only) and no Rust source is published. The share→underlying mapping cannot be read." },
  { id: "internally_consistent_with_live_mint_supply", resolved: false, note: "Cannot be checked without a decoded numerator/denominator to reconcile against jlUSDC mint supply." },
  { id: "no_unaccounted_field_can_alter_conversion", resolved: false, note: "Cannot be established without the full source-backed layout; unaccounted accrual/fee/reserve fields could materially change the claim." },
] as const;

export const SHARE_ACCOUNTING_BLOCKERS = [
  "No Anchor IDL is vendored into this repository and no Jupiter Lend account decoder is installed (checked node_modules: only @jup-ag/api, which carries no lend pool layout).",
  "No Rust program source is published — total-assets / interest-accrual / fee logic that determines a supplier's claim is unreadable (jupiterLendIdlDiscoveryAmendment.ts: 'the repo ships IDLs, a TS SDK and CPI snippets — NOT the program source').",
  "The exchange-price accounting lives in the liquidity program (jupeiUmn…), REDEPLOYED 2026-07-16 — 13 days AFTER the only published IDL's last push (2026-07-03). The IDL is not a build attestation for the binary that computes the claim.",
  "No live program is a verified build (verify.osec.io is_verified: false); the Code4rena commit maps to no live program.",
  "Raw pool observations (size 431, discriminator 2a0821dca328d205) are identity signals only — explicitly not permission to invent a decoder.",
] as const;

export const SOURCE_TO_ACCOUNT_APPLICABILITY = {
  artifactId: "jupiter_lend_usdc_share_accounting_applicability",
  version: JUPITER_LEND_SHARE_ACCOUNTING_VERSION,
  candidateId: JUPITER_LEND_IDENTITY.candidateId,
  status: "unresolved" as ShareAccountingApplicability,
  criteria: SOURCE_TO_ACCOUNT_CRITERIA,
  blockers: SHARE_ACCOUNTING_BLOCKERS,
  deployedBinaryClaimedAudited: false, // NEVER claim the deployed binary is audited/verified
  claimsFullSourceToBinaryVerification: false,
  consequence: "Production keeps recognizedUnderlyingRaw / recognizedValueUsd null (Step 17D behavior). Ownership stays visible; no conversion is invented.",
  evidenceSources: [
    "jupiterLendUsdcRiskEvidencePackage.ts",
    "jupiterLendIdlDiscoveryAmendment.ts",
    "jupiterLendExistingPosition.ts (JUPITER_LEND_IDENTITY)",
  ],
  observedAt: "2026-07-18T00:00:00.000Z",
  preparerId: "claude_share_accounting_verifier",
} as const;

/** True only when position accounting may be mounted (verified or provisionally verified). */
export function mayMountRecognizedAccounting(a: ShareAccountingApplicability = SOURCE_TO_ACCOUNT_APPLICABILITY.status): boolean {
  return a === "verified_for_position_accounting" || a === "provisionally_verified_for_position_accounting";
}

export function computeShareAccountingManifestHash(a: typeof SOURCE_TO_ACCOUNT_APPLICABILITY = SOURCE_TO_ACCOUNT_APPLICABILITY): string {
  const material = JSON.stringify({
    id: a.artifactId, v: a.version, c: a.candidateId, s: a.status,
    cr: a.criteria.map((x) => ({ i: x.id, r: x.resolved })),
    pool: JUPITER_LEND_POOL_IDENTITY.poolAccount, owner: JUPITER_LEND_POOL_IDENTITY.expectedOwnerProgram,
    disc: JUPITER_LEND_POOL_IDENTITY.expectedDiscriminatorHex, len: JUPITER_LEND_POOL_IDENTITY.expectedDataLenBytes,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `jup_lend_share_accounting_${h.toString(16).padStart(8, "0")}`;
}
export const SHARE_ACCOUNTING_MANIFEST_HASH = computeShareAccountingManifestHash();

/**
 * §7 production resolver — the single point that decides whether a verified exchange rate flows into the
 * existing-position adapter. While applicability is `unresolved` it returns null WITHOUT any RPC (no
 * pointless pool fetch), so production stays at the Step 17D unresolved position. Future verified layouts
 * flip `SOURCE_TO_ACCOUNT_APPLICABILITY.status` and supply a decoded observation here.
 */
export function resolveJupiterLendExchangeRate(obs?: PoolAccountObservation): JupiterLendExchangeRate | null {
  if (!mayMountRecognizedAccounting()) return null; // unresolved → fail closed, no fetch/decode
  if (!obs) return null;
  return decodePoolShareAccounting(obs).exchangeRate;
}

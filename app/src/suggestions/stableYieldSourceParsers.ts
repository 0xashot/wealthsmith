/**
 * stableYieldSourceParsers — Step 16H-G, stage B (parse). STRICT, source-specific parsers that turn a
 * raw official-source payload into a typed record, or fail with a structured reason.
 *
 * Pure and offline: no network, no clock, no defaults. A parser NEVER repairs data — it rejects it.
 *
 * Explicitly rejected coercions (each has burned a real integration somewhere):
 *   - `"5.2%"` / `"5.2"` → a number (unless a parser documents that source's string format)
 *   - `""` or `null` → 0
 *   - a missing timestamp → "now"
 *   - a failed request → 0 APY
 *   - a missing cap → uncapped
 *   - a missing pause flag → deposits enabled
 *
 * UNIT SAFETY: APY unit is the classic 100× bug. A parser must be told, per source, whether the field
 * is a fraction (0.0515) or a percent (5.15) — it never guesses from magnitude, because 0.0515 is a
 * plausible 0.05% and 5.15 is a plausible 515%. Ambiguity fails closed.
 */

export const STABLE_YIELD_SOURCE_PARSERS_EXIST = true;

export type StableYieldParseFailure = { ok: false; reason: string; field?: string };
export type StableYieldParseResult<T> = { ok: true; value: T } | StableYieldParseFailure;

/** How a source expresses a rate. Declared per source from its documentation — never inferred. */
export type StableYieldRateUnit = "fraction" | "percent";

/**
 * Step 16H-H — the Kamino API's DOCUMENTED numeric encoding. Verified 2026-07-16 against the live
 * official endpoint `GET https://api.kamino.finance/kvaults/vaults/{pubkey}/metrics`, which returns
 * rates as high-precision decimal STRINGS (e.g. `apy7d: "0.040110766058785959014"`), not numbers.
 *
 * This is the narrow, source-specific exception the general rule allows: `readFiniteNumber` still
 * rejects strings everywhere else, because elsewhere a string means the schema changed. Here the string
 * IS the schema, so it gets an explicit parser rather than a silent coercion.
 *
 * The format is strict: an optional sign, digits, an optional single decimal point, digits. No
 * exponents, no thousands separators, no `%` suffix, no whitespace padding, no empty string.
 */
const STRICT_DECIMAL_STRING = /^-?\d+(\.\d+)?$/;

/**
 * Parse a documented high-precision decimal string into a finite number. Precision beyond IEEE-754 is
 * truncated by `Number()`, which is acceptable and intended: the value is a rate we then round to 6dp
 * anyway. What is NOT acceptable is accepting a malformed string, so the shape is validated first.
 */
export function readDocumentedDecimalString(source: unknown, field: string): StableYieldParseResult<number> {
  if (typeof source !== "object" || source === null || Array.isArray(source)) return { ok: false, reason: "source_not_an_object", field };
  const v = (source as Record<string, unknown>)[field];
  if (v === undefined) return { ok: false, reason: "missing_field", field };
  if (v === null) return { ok: false, reason: "null_is_not_zero", field };
  if (typeof v !== "string") return { ok: false, reason: "expected_documented_decimal_string", field };
  if (!STRICT_DECIMAL_STRING.test(v)) return { ok: false, reason: "malformed_decimal_string", field };
  const n = Number(v);
  if (!Number.isFinite(n)) return { ok: false, reason: "not_a_finite_number", field };
  return { ok: true, value: n };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Read a finite number. Rejects strings outright: a numeric field that arrives as a string means the
 * schema changed, and silently parsing it hides that. Rejects NaN/Infinity/booleans/null.
 */
export function readFiniteNumber(source: unknown, field: string): StableYieldParseResult<number> {
  if (!isRecord(source)) return { ok: false, reason: "source_not_an_object", field };
  const v = source[field];
  if (v === undefined) return { ok: false, reason: "missing_field", field };
  if (v === null) return { ok: false, reason: "null_is_not_zero", field };
  if (typeof v === "string") return { ok: false, reason: "numeric_field_arrived_as_string", field };
  if (typeof v !== "number" || !Number.isFinite(v)) return { ok: false, reason: "not_a_finite_number", field };
  return { ok: true, value: v };
}

/**
 * Convert a source rate to the canonical PERCENT unit the 16C contract stores (5.15 === 5.15%).
 * The unit is supplied by the caller from the source's documentation. A negative rate is rejected
 * (the current Stable Yield contract models no negative-yield product); an implausible rate is
 * rejected rather than clamped.
 */
export function normalizeRateToPercent(raw: number, unit: StableYieldRateUnit, field: string): StableYieldParseResult<number> {
  if (!Number.isFinite(raw)) return { ok: false, reason: "not_a_finite_number", field };
  if (raw < 0) return { ok: false, reason: "negative_rate_unsupported", field };
  // `0.0515 * 100` is 5.1499999999999995 in binary floating point. Left raw, that artifact would flow
  // into the 16C contract and out to the UI as a value that never equals the source's rate. Round to
  // 6dp: far finer than any APY is meaningfully quoted (1e-6 %), and enough to erase the artifact.
  const pct = unit === "fraction" ? Math.round(raw * 100 * 1e6) / 1e6 : Math.round(raw * 1e6) / 1e6;
  // A stable-USDC product yielding >100% APY is a unit error or an incentive artifact, not a rate we
  // may silently pass to planning. Fail closed and let a human review it.
  if (pct > 100) return { ok: false, reason: "implausible_rate_for_stable_yield", field };
  return { ok: true, value: pct };
}

/** Read a strict ISO-8601 timestamp. A missing/invalid timestamp is never "now". */
export function readIsoTimestamp(source: unknown, field: string): StableYieldParseResult<string> {
  if (!isRecord(source)) return { ok: false, reason: "source_not_an_object", field };
  const v = source[field];
  if (v === undefined || v === null) return { ok: false, reason: "missing_timestamp", field };
  if (typeof v !== "string" || v.trim() === "") return { ok: false, reason: "timestamp_not_a_string", field };
  const ms = Date.parse(v);
  if (!Number.isFinite(ms)) return { ok: false, reason: "unparseable_timestamp", field };
  return { ok: true, value: new Date(ms).toISOString() };
}

/** Read a required non-empty string (addresses, ids). Never trims a value into existence. */
export function readNonEmptyString(source: unknown, field: string): StableYieldParseResult<string> {
  if (!isRecord(source)) return { ok: false, reason: "source_not_an_object", field };
  const v = source[field];
  if (v === undefined || v === null) return { ok: false, reason: "missing_field", field };
  if (typeof v !== "string") return { ok: false, reason: "not_a_string", field };
  if (v.trim() === "") return { ok: false, reason: "empty_string_is_not_a_value", field };
  return { ok: true, value: v };
}

/** Read a strict boolean. A missing flag is NOT false — the caller must decide, explicitly. */
export function readStrictBoolean(source: unknown, field: string): StableYieldParseResult<boolean> {
  if (!isRecord(source)) return { ok: false, reason: "source_not_an_object", field };
  const v = source[field];
  if (v === undefined || v === null) return { ok: false, reason: "missing_field", field };
  if (typeof v !== "boolean") return { ok: false, reason: "not_a_boolean", field };
  return { ok: true, value: v };
}

/* ------------------------------------------------------------------ *
 * Kamino vault-state record (official Kamino SDK — `@kamino-finance/klend-sdk`)
 * ------------------------------------------------------------------ */

/**
 * The subset of an official Kamino vault-state read this adapter depends on, already reduced to plain
 * JSON by the Node probe (the SDK returns BN/PublicKey objects that must not cross into deterministic
 * code). `wallet/kaminoVaults.ts` already reads vault state read-only via the same official SDK.
 *
 * NOTE ON SCOPE: this shape is the CONTRACT the probe must satisfy. It is exercised by offline
 * fixtures. It is NOT verified against a live Kamino response in this step — no candidate has a
 * documented address to query, so there is nothing to verify against. See the evidence manifests.
 */
export interface KaminoVaultSourceRecord {
  /** Exact vault address (base58). The ONLY identity anchor. */
  productAddress: string;
  /** Principal token mint of the vault. */
  assetMint: string;
  chain: string;
  protocolId: string;
  /** Decoded on-chain vault name. Diagnostic only — NEVER used to match identity. */
  productName?: string;
  /**
   * Net APY. Step 16H-H VERIFIED the unit against official sources: Kamino returns a decimal FRACTION
   * (0.0515 === 5.15%), proven by the official docs' own display code `(vault.apy7d * 100).toFixed(2)`
   * and corroborated by live values (`apy7d: "0.0401…"` ≈ 4.01%). It is APY, not APR — Kamino documents
   * that vault earnings compound continuously.
   *
   * ACCEPTS a number OR the documented high-precision decimal string the live API actually returns.
   */
  netApy: number | string;
  /** When the SOURCE produced this value (chain/API time) — not when we fetched it. */
  sourceTimestamp: string;
  /** Explicit deposit cap, when the vault state exposes one. */
  depositCapUsd?: number;
  /** Current deposited amount, when the vault state exposes one. */
  depositedUsd?: number;
  /** Explicit deposit-enabled state. Absence is never "enabled". */
  depositsEnabled?: boolean;
}

export interface ParsedKaminoVaultRecord {
  productAddress: string;
  assetMint: string;
  chain: string;
  protocolId: string;
  productName?: string;
  netApyPct: number;
  sourceTimestamp: string;
  depositCapUsd?: number;
  depositedUsd?: number;
  depositsEnabled?: boolean;
}

/**
 * Strictly parse one Kamino vault-state record.
 *
 * `rateUnit` MUST come from the source's documentation. The current probe declares `"fraction"`
 * because the klend-sdk vault yield calc returns a decimal fraction — but that mapping is UNVERIFIED
 * against a live response in this step and is recorded as a blocker in the evidence manifest, so no
 * candidate may reach planning on the strength of this assumption.
 */
export function parseKaminoVaultRecord(raw: unknown, rateUnit: StableYieldRateUnit): StableYieldParseResult<ParsedKaminoVaultRecord> {
  if (!isRecord(raw)) return { ok: false, reason: "source_not_an_object" };

  const productAddress = readNonEmptyString(raw, "productAddress");
  if (!productAddress.ok) return productAddress;
  const assetMint = readNonEmptyString(raw, "assetMint");
  if (!assetMint.ok) return assetMint;
  const chain = readNonEmptyString(raw, "chain");
  if (!chain.ok) return chain;
  const protocolId = readNonEmptyString(raw, "protocolId");
  if (!protocolId.ok) return protocolId;

  // The live Kamino API returns rates as documented decimal strings; the SDK returns numbers. Accept
  // both, each through its own strict reader — never a blanket coercion.
  const netApyRaw = typeof raw.netApy === "string" ? readDocumentedDecimalString(raw, "netApy") : readFiniteNumber(raw, "netApy");
  if (!netApyRaw.ok) return netApyRaw;
  const netApyPct = normalizeRateToPercent(netApyRaw.value, rateUnit, "netApy");
  if (!netApyPct.ok) return netApyPct;

  const sourceTimestamp = readIsoTimestamp(raw, "sourceTimestamp");
  if (!sourceTimestamp.ok) return sourceTimestamp;

  // Optional fields: absent is ALLOWED and stays absent. Present-but-malformed is REJECTED.
  let depositCapUsd: number | undefined;
  if (raw.depositCapUsd !== undefined) {
    const cap = readFiniteNumber(raw, "depositCapUsd");
    if (!cap.ok) return cap;
    if (cap.value < 0) return { ok: false, reason: "negative_cap", field: "depositCapUsd" };
    depositCapUsd = cap.value;
  }
  let depositedUsd: number | undefined;
  if (raw.depositedUsd !== undefined) {
    const dep = readFiniteNumber(raw, "depositedUsd");
    if (!dep.ok) return dep;
    if (dep.value < 0) return { ok: false, reason: "negative_deposited", field: "depositedUsd" };
    depositedUsd = dep.value;
  }
  let depositsEnabled: boolean | undefined;
  if (raw.depositsEnabled !== undefined) {
    const en = readStrictBoolean(raw, "depositsEnabled");
    if (!en.ok) return en;
    depositsEnabled = en.value;
  }

  let productName: string | undefined;
  if (raw.productName !== undefined) {
    const n = readNonEmptyString(raw, "productName");
    if (!n.ok) return n;
    productName = n.value;
  }

  return {
    ok: true,
    value: { productAddress: productAddress.value, assetMint: assetMint.value, chain: chain.value, protocolId: protocolId.value, productName, netApyPct: netApyPct.value, sourceTimestamp: sourceTimestamp.value, depositCapUsd, depositedUsd, depositsEnabled },
  };
}

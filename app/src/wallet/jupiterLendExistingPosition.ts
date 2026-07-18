/**
 * jupiterLendExistingPosition — Step 17D. READ-ONLY existing-position support for a wallet already
 * holding the EXACT Jupiter Lend USDC receipt token (jlUSDC). Jupiter Lend is `excluded_from_suggestions`
 * (research-only for recommendation purposes); this module only makes an EXISTING holding visible and
 * correctly valued — it never makes Jupiter suggestion-, selector-, Top-Pick-, or optimization-eligible,
 * and introduces no deposit/withdraw/transaction/signature behavior.
 *
 * THREE SEPARATE FACTS, never conflated (§5):
 *   A. Confirmed OWNERSHIP — the exact aggregated jlUSDC raw balance across the wallet's receipt-token
 *      accounts. This is the only thing needed for the position to EXIST and stay visible.
 *   B. Recognized UNDERLYING CLAIM — canonical USDC represented by those shares. jlUSDC is a SHARE token,
 *      NOT 1:1 with USDC. This requires an EXACT deployed share→underlying conversion. No such methodology
 *      is verified from installed source (no IDL, no installed Jupiter SDK, source-to-binary unverified),
 *      so it defaults to UNRESOLVED (null) — never fabricated, never 1:1, never an API display value.
 *   C. Verified immediate LIQUIDITY — amount currently withdrawable. The funds live in the liquidity layer
 *      behind a dynamic withdrawal limiter; no exact deterministic current-withdrawal methodology is
 *      verified, so this defaults to UNRESOLVED (null). A prior research observation is NOT a live value.
 *
 * FAIL-CLOSED: a failure in B never erases A; a failure in C never erases a valid recognized claim. When B
 * or C is unresolved the position remains ONE canonical unresolved row with the exact receipt balance
 * visible, USD null, and an explicit unresolved reason — it must not disappear, and must not read zero.
 * Identity is bound by EXACT mint + program chain, never by symbol/name/logo/APY.
 */
import type { WalletPosition } from "./walletPosition";

export const JUPITER_LEND_POSITION_VERSION = "1.0.0" as const;
export const JUPITER_LEND_CANDIDATE_ID = "jupiter_lend_usdc" as const;

/** Classic SPL Token program (jlUSDC is a classic SPL mint — VERIFIED, no Token-2022 surface). */
export const JUPITER_LEND_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" as const;

/**
 * §2/§3 — versioned immutable identity artifact. Bound to the EXACT mainnet accounts proven in the
 * Jupiter Lend risk-evidence package (jlUSDC mint → mintAuthority = pool 5nmGjA4s… → owned by lending
 * program jup3YeL8… → pool references liquidity program jupeiUmn… at data offset 40). This is NOT a
 * recommendation approval, risk review, risk signoff, product approval, or automated assessment.
 */
export const JUPITER_LEND_IDENTITY = {
  candidateId: JUPITER_LEND_CANDIDATE_ID,
  productName: "Jupiter Lend USDC",
  protocol: "Jupiter Lend",
  /** jlUSDC receipt/share mint — the ONLY unique identifier of this position. */
  receiptTokenMint: "9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D",
  receiptTokenSymbol: "jlUSDC",
  receiptTokenDecimals: 6,
  receiptTokenProgram: JUPITER_LEND_TOKEN_PROGRAM,
  receiptTokenFreezeAuthority: null, // VERIFIED absent
  /** Underlying canonical Circle USDC (NOT bridged/wrapped) — the claim asset. */
  underlyingUsdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  underlyingUsdcDecimals: 6,
  /** Pool account = jlUSDC mint authority (431B, discriminator 2a0821dca328d205), owned by lending program. */
  poolAccount: "5nmGjA4s7ATzpBQXC5RNceRpaJ7pYw2wKsNBWyuSAZV6",
  /** Lending/earn program — mints/burns jlUSDC, holds share accounting. */
  lendingProgram: "jup3YeL8QhtSx1e253b2FDvsMNC87fDrgQZivbrndc9",
  /** Liquidity layer — HOLDS supplier funds, enforces the dynamic withdrawal limiter. */
  liquidityProgram: "jupeiUmn818Jg1ekPURTpr4mFo29p46vygyykFJ3wZC",
  cluster: "mainnet-beta",
  receiptModel: "share token (jlUSDC), NOT 1:1 with USDC",
  evidenceSources: [
    "jupiterLendUsdcRiskEvidencePackage.ts — JUP_PRODUCT_BINDING (exact account chain)",
    "jupiterLendUsdcProvisionalAssessment.ts — provisional bounded sensitivity (research-only)",
  ],
  identityNotEstablishedBy: ["the USDC mint alone", "the jlUSDC symbol alone", "an app URL", "a display name", "an APY value", "a token logo", "a third-party token list"],
  observedAt: "2026-07-18T00:00:00.000Z",
  preparerId: "claude_existing_position_detector",
  preparationRole: "existing_position_detection" as const,
  isNotRiskApproval: true,
  invalidationTriggers: [
    "the jlUSDC receipt mint changes or is redeployed",
    "the pool account or its lending/liquidity program pointer changes",
    "either program is upgraded such that the share-accounting layout changes",
    "the underlying asset mint changes",
    "a verified share→underlying conversion methodology is published (enables recognized claim)",
    "a verified current-withdrawal methodology is published (enables verified liquidity)",
  ],
} as const;

/** Canonical economic-position dedupe key — bound to program + mints + pool, NEVER a display label. */
export const JUPITER_LEND_POSITION_DEDUPE_KEY =
  `jupiter-lend:${JUPITER_LEND_IDENTITY.lendingProgram}:${JUPITER_LEND_IDENTITY.receiptTokenMint}:${JUPITER_LEND_IDENTITY.underlyingUsdcMint}:${JUPITER_LEND_IDENTITY.poolAccount}` as const;
export const JUPITER_LEND_POSITION_ID = `jupiter-lend-usdc-${JUPITER_LEND_IDENTITY.receiptTokenMint}` as const;

/* ------------------------------------------------------------------ *
 * Identity artifact manifest (deterministic)
 * ------------------------------------------------------------------ */
export const JUPITER_LEND_IDENTITY_MANIFEST = {
  artifactId: "jupiter_lend_usdc_existing_position_identity",
  version: JUPITER_LEND_POSITION_VERSION,
  candidateId: JUPITER_LEND_IDENTITY.candidateId,
  receiptTokenMint: JUPITER_LEND_IDENTITY.receiptTokenMint,
  underlyingUsdcMint: JUPITER_LEND_IDENTITY.underlyingUsdcMint,
  poolAccount: JUPITER_LEND_IDENTITY.poolAccount,
  lendingProgram: JUPITER_LEND_IDENTITY.lendingProgram,
  liquidityProgram: JUPITER_LEND_IDENTITY.liquidityProgram,
  tokenProgram: JUPITER_LEND_IDENTITY.receiptTokenProgram,
  cluster: JUPITER_LEND_IDENTITY.cluster,
  isNotRiskApproval: true,
} as const;

export function computeJupiterLendIdentityManifestHash(m: typeof JUPITER_LEND_IDENTITY_MANIFEST = JUPITER_LEND_IDENTITY_MANIFEST): string {
  const material = JSON.stringify({
    a: m.artifactId, v: m.version, c: m.candidateId, r: m.receiptTokenMint, u: m.underlyingUsdcMint,
    p: m.poolAccount, lp: m.lendingProgram, ll: m.liquidityProgram, tp: m.tokenProgram, cl: m.cluster,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `jup_lend_identity_${h.toString(16).padStart(8, "0")}`;
}
export const JUPITER_LEND_IDENTITY_MANIFEST_HASH = computeJupiterLendIdentityManifestHash();

/* ------------------------------------------------------------------ *
 * §13 (17D.1) — existingPositionSupport immutable binding.
 *
 * The dispositions manifest (directUsdcLendingDispositions.ts) binds, per candidate, ONLY
 * { id, disposition, selector } — i.e. the recommendation disposition and selector eligibility — plus the
 * policy id, assessment manifest, category/universal floor and governance gates. `existingPositionSupport`
 * is INTENTIONALLY OUTSIDE that manifest's scope: it is a read-only detection capability, not a
 * recommendation power. Step 17D flipping it false→true therefore did NOT change the dispositions manifest
 * hash (correctly reported). To avoid leaving a material support flag unaudited, 17D.1 binds it HERE, to an
 * immutable artifact anchored on the Jupiter existing-position identity manifest. Branch B of §13.
 * ------------------------------------------------------------------ */
export const JUPITER_LEND_EXISTING_POSITION_SUPPORT_BINDING = {
  artifactId: "jupiter_lend_usdc_existing_position_support_binding",
  version: JUPITER_LEND_POSITION_VERSION,
  candidateId: JUPITER_LEND_CANDIDATE_ID,
  existingPositionSupport: true,
  supportKind: "read_only_detection_only" as const,
  boundToIdentityManifest: JUPITER_LEND_IDENTITY_MANIFEST_HASH,
  // What this binding grants — and, emphatically, what it does NOT.
  grants: ["read-only detection of an existing jlUSDC holding", "canonical existing-position classification + dedupe"],
  doesNotGrant: [
    "recommendation eligibility", "selector eligibility", "Top Pick eligibility",
    "Safety Buffer funding eligibility", "Rebalance/Trim funding eligibility", "Position Optimization eligibility",
    "a completed risk assessment", "any change to the excluded_from_suggestions disposition",
  ],
  // The recommendation-relevant fields remain bound by the dispositions manifest, not by this artifact.
  dispositionManifestBindsRecommendationFields: true,
  dispositionManifestBindingMaterial: "per-candidate { id, disposition, selector } + policyId + assessment manifest + floors + governance gates",
  recommendationDispositionUnchanged: "excluded_from_suggestions",
  priorDispositionHistoryPreserved: true,
} as const;

export function computeExistingPositionSupportBindingHash(b: typeof JUPITER_LEND_EXISTING_POSITION_SUPPORT_BINDING = JUPITER_LEND_EXISTING_POSITION_SUPPORT_BINDING): string {
  const material = JSON.stringify({
    a: b.artifactId, v: b.version, c: b.candidateId, e: b.existingPositionSupport, k: b.supportKind,
    i: b.boundToIdentityManifest, d: b.recommendationDispositionUnchanged,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `jup_lend_support_binding_${h.toString(16).padStart(8, "0")}`;
}
export const JUPITER_LEND_EXISTING_POSITION_SUPPORT_BINDING_HASH = computeExistingPositionSupportBindingHash();

/* ------------------------------------------------------------------ *
 * Identity validators — exact match only, never symbol
 * ------------------------------------------------------------------ */
export type JupiterLendIdentityFailure =
  | "candidate_mismatch" | "receipt_mint_mismatch" | "underlying_mint_mismatch"
  | "token_program_mismatch" | "cluster_mismatch";

export function validateJupiterLendIdentity(i: {
  candidateId: string; receiptTokenMint: string; underlyingUsdcMint: string; tokenProgram: string; cluster: string;
}): { ok: boolean; failure?: JupiterLendIdentityFailure } {
  const b = JUPITER_LEND_IDENTITY;
  if (i.candidateId !== b.candidateId) return { ok: false, failure: "candidate_mismatch" };
  if (i.receiptTokenMint !== b.receiptTokenMint) return { ok: false, failure: "receipt_mint_mismatch" };
  if (i.underlyingUsdcMint !== b.underlyingUsdcMint) return { ok: false, failure: "underlying_mint_mismatch" };
  if (i.tokenProgram !== b.receiptTokenProgram) return { ok: false, failure: "token_program_mismatch" };
  if (i.cluster !== b.cluster) return { ok: false, failure: "cluster_mismatch" };
  return { ok: true };
}

/** True ONLY for the exact jlUSDC receipt mint (never symbol/name). */
export function isJupiterLendReceiptMint(mint: string): boolean {
  return mint === JUPITER_LEND_IDENTITY.receiptTokenMint;
}

/* ------------------------------------------------------------------ *
 * §4 — token-account detection + aggregation
 * ------------------------------------------------------------------ */
export interface JupiterLendTokenAccountInput {
  address: string;
  mint: string;
  tokenProgram: string;
  amountRaw: string;
  decimals: number;
  owner: string;
  /** True if the account is closed / uninitialized. */
  isClosed?: boolean;
}

export type JlUsdcRejectReason =
  | "wrong_mint" | "wrong_token_program" | "foreign_owner" | "closed_account"
  | "zero_balance" | "malformed_amount";

export interface JlUsdcDiscoveryResult {
  accounts: JupiterLendTokenAccountInput[];
  aggregateRaw: string;
  rejected: Array<{ address: string; reason: JlUsdcRejectReason }>;
}

const isDigits = (s: string): boolean => /^[0-9]+$/.test(s);

/**
 * Filter+aggregate every wallet-owned account holding the EXACT jlUSDC mint under the EXACT classic SPL
 * Token program. Exclusions are deliberate and recorded: wrong mint, wrong token program, foreign owner,
 * closed account, zero balance, malformed amount. Integer raw-unit aggregation; same account never counted
 * twice (dedup by address). Never matches by symbol/name; canonical USDC and other Jupiter receipts (a
 * different mint) are excluded by the exact-mint test.
 */
export function discoverJlUsdcAccounts(accounts: JupiterLendTokenAccountInput[], walletAddress: string): JlUsdcDiscoveryResult {
  const found: JupiterLendTokenAccountInput[] = [];
  const rejected: Array<{ address: string; reason: JlUsdcRejectReason }> = [];
  const seen = new Set<string>();
  let aggregate = 0n;
  for (const a of accounts) {
    if (seen.has(a.address)) continue; // never count the same account twice
    seen.add(a.address);
    if (a.mint !== JUPITER_LEND_IDENTITY.receiptTokenMint) { rejected.push({ address: a.address, reason: "wrong_mint" }); continue; }
    if (a.tokenProgram !== JUPITER_LEND_TOKEN_PROGRAM) { rejected.push({ address: a.address, reason: "wrong_token_program" }); continue; }
    if (a.owner !== walletAddress) { rejected.push({ address: a.address, reason: "foreign_owner" }); continue; }
    if (a.isClosed === true) { rejected.push({ address: a.address, reason: "closed_account" }); continue; }
    if (typeof a.amountRaw !== "string" || !isDigits(a.amountRaw)) { rejected.push({ address: a.address, reason: "malformed_amount" }); continue; }
    let amount: bigint;
    try { amount = BigInt(a.amountRaw); } catch { rejected.push({ address: a.address, reason: "malformed_amount" }); continue; }
    if (amount === 0n) { rejected.push({ address: a.address, reason: "zero_balance" }); continue; }
    found.push(a);
    aggregate += amount;
  }
  return { accounts: found, aggregateRaw: aggregate.toString(), rejected };
}

/* ------------------------------------------------------------------ *
 * §6/§7 — exact underlying-claim conversion (integer arithmetic only)
 * ------------------------------------------------------------------ */
/**
 * A VERIFIED share→underlying exchange rate as an exact rational: `underlying base units` per
 * `receipt base unit` = num/den. Supplied ONLY by a proven deterministic on-chain methodology (pool
 * total-assets / total-shares with accrued interest, exact decimal scaling, floor rounding). It is NOT a
 * hardcoded rate, an API display rate, a token market price, or a permanent 1:1. When no such methodology
 * is verified, production passes `null` and the recognized claim stays UNRESOLVED.
 */
export interface JupiterLendExchangeRate {
  underlyingPerShareNum: string; // exact integer numerator
  underlyingPerShareDen: string; // exact integer denominator (> 0)
  calculationVersion: string;
  sourceAccounts: string[];
  sourceSlot: number;
}

/**
 * A VERIFIED current-withdrawal liquidity result. Supplied ONLY by a proven deterministic methodology that
 * accounts for the liquidity-layer limiter, pauses, and per-user/global limits. When none is verified,
 * production passes `null` → liquidity UNRESOLVED (no positive verified-liquid value).
 */
export interface JupiterLendLiquidity {
  currentlyLiquidUnderlyingRaw: string | null; // exact base units, or null = unresolved
  limited: boolean;
  paused: boolean;
  sourceSlot: number;
  fresh: boolean;
}

export type JupiterLendWithdrawalState =
  | "fully_withdrawable" | "partially_withdrawable" | "currently_unavailable" | "paused" | "unresolved";

export interface JupiterLendPositionInput {
  /** Aggregated exact jlUSDC raw balance (from discoverJlUsdcAccounts). "0" ⇒ no position. */
  receiptBalanceRaw: string;
  /** VERIFIED conversion, or null = recognized claim UNRESOLVED (default in production). */
  exchangeRate: JupiterLendExchangeRate | null;
  /** VERIFIED current-withdrawal liquidity, or null = liquidity UNRESOLVED (default in production). */
  liquidity: JupiterLendLiquidity | null;
  /** Fresh exact-mint USDC price; used only when fresh (no permanent $1). */
  price: { usdcPriceUsd: number | null; fresh: boolean };
  observedAt: string;
  sourceSlot: number;
  walletFresh: boolean;
  sourceAccounts?: string[];
  unresolvedReasons?: string[];
}

export interface JupiterLendPositionResult {
  positionExists: boolean;
  candidateId: string;
  dedupeKey: string;
  productName: string;
  protocol: string;
  receiptTokenMint: string;
  underlyingUsdcMint: string;
  enrichmentState: "complete" | "recognized_only" | "unresolved";
  receiptBalanceRaw: string;
  receiptBalanceAmount: number | null;
  recognizedUnderlyingRaw: string | null;
  recognizedUnderlyingAmount: number | null;
  currentlyLiquidUnderlyingRaw: string | null;
  currentlyLiquidUnderlyingAmount: number | null;
  exchangeRate: JupiterLendExchangeRate | null;
  recognizedValueUsd: number | null;
  liquidValueUsd: number | null;
  withdrawalState: JupiterLendWithdrawalState;
  freshness: "fresh" | "stale" | "unresolved";
  observedAt: string;
  sourceSlot: number;
  sourceAccounts: string[];
  unresolvedReasons: string[];
}

const toTokens = (raw: bigint, dec: number): number => { const s = 10n ** BigInt(dec); return Number(raw / s) + Number(raw % s) / Number(s); };
const big = (s: string | null): bigint | null => { if (s === null) return null; try { return BigInt(s); } catch { return null; } };

export function buildJupiterLendExistingPosition(input: JupiterLendPositionInput): JupiterLendPositionResult {
  const recDec = JUPITER_LEND_IDENTITY.receiptTokenDecimals;
  const undDec = JUPITER_LEND_IDENTITY.underlyingUsdcDecimals;
  const reasons = new Set<string>(input.unresolvedReasons ?? []);
  const base = {
    candidateId: JUPITER_LEND_CANDIDATE_ID,
    dedupeKey: JUPITER_LEND_POSITION_DEDUPE_KEY,
    productName: JUPITER_LEND_IDENTITY.productName,
    protocol: JUPITER_LEND_IDENTITY.protocol,
    receiptTokenMint: JUPITER_LEND_IDENTITY.receiptTokenMint,
    underlyingUsdcMint: JUPITER_LEND_IDENTITY.underlyingUsdcMint,
    observedAt: input.observedAt,
    sourceSlot: input.sourceSlot,
    sourceAccounts: input.sourceAccounts ?? [],
  };

  const shares = big(input.receiptBalanceRaw);
  // A. Ownership. Non-zero receipt balance ⇒ the position EXISTS and stays visible.
  if (shares === null || shares <= 0n) {
    return {
      ...base, positionExists: false, enrichmentState: "unresolved",
      receiptBalanceRaw: "0", receiptBalanceAmount: 0,
      recognizedUnderlyingRaw: null, recognizedUnderlyingAmount: null,
      currentlyLiquidUnderlyingRaw: null, currentlyLiquidUnderlyingAmount: null,
      exchangeRate: null, recognizedValueUsd: null, liquidValueUsd: null,
      withdrawalState: "unresolved", freshness: "unresolved", unresolvedReasons: [],
    };
  }
  const receiptBalanceAmount = toTokens(shares, recDec);
  const priceOk = input.price.fresh && typeof input.price.usdcPriceUsd === "number" && input.price.usdcPriceUsd > 0;

  // B. Recognized underlying claim — ONLY with a verified exact-integer exchange rate. Else UNRESOLVED.
  let recognizedBig: bigint | null = null;
  const rate = input.exchangeRate;
  if (rate === null) {
    reasons.add("underlying claim unresolved — no verified jlUSDC→USDC conversion methodology");
  } else {
    const num = big(rate.underlyingPerShareNum);
    const den = big(rate.underlyingPerShareDen);
    if (num === null || den === null || den <= 0n || num < 0n) {
      reasons.add("underlying claim unresolved — malformed exchange rate");
    } else {
      recognizedBig = (shares * num) / den; // floor (truncates toward zero), integer arithmetic
    }
  }
  const recognizedResolved = recognizedBig !== null;
  const recognizedUnderlyingAmount = recognizedBig !== null ? toTokens(recognizedBig, undDec) : null;
  const recognizedValueUsd = priceOk && recognizedUnderlyingAmount !== null ? recognizedUnderlyingAmount * (input.price.usdcPriceUsd as number) : null;

  // C. Verified immediate liquidity — ONLY with a verified, fresh methodology. Never exceeds recognized.
  let liquidBig: bigint | null = null;
  let withdrawalState: JupiterLendWithdrawalState;
  const liq = input.liquidity;
  if (liq === null || !liq.fresh) {
    withdrawalState = "unresolved";
    reasons.add(liq === null ? "withdrawal availability unresolved — no verified current-withdrawal methodology" : "withdrawal liquidity stale");
  } else if (liq.paused) {
    withdrawalState = "paused"; reasons.add("protocol withdrawal paused");
  } else {
    const l = big(liq.currentlyLiquidUnderlyingRaw);
    if (l === null) { withdrawalState = "unresolved"; reasons.add("withdrawal liquidity unresolved"); }
    else if (!recognizedResolved) { withdrawalState = "unresolved"; reasons.add("liquidity cannot be classified while recognized claim is unresolved"); }
    else {
      liquidBig = l > recognizedBig! ? recognizedBig! : l; // never exceeds recognized
      if (liquidBig <= 0n) withdrawalState = "currently_unavailable";
      else if (liquidBig >= recognizedBig!) withdrawalState = "fully_withdrawable";
      else withdrawalState = "partially_withdrawable";
    }
  }
  const liquidTokens = liquidBig !== null ? toTokens(liquidBig, undDec) : null;
  const liquidValueUsd = priceOk && liquidTokens !== null ? liquidTokens * (input.price.usdcPriceUsd as number) : null;

  const enrichmentState: JupiterLendPositionResult["enrichmentState"] =
    !recognizedResolved ? "unresolved" : liquidBig !== null ? "complete" : "recognized_only";
  const freshness: JupiterLendPositionResult["freshness"] =
    !input.walletFresh ? "stale" : "fresh";

  return {
    ...base,
    positionExists: true,
    enrichmentState,
    receiptBalanceRaw: input.receiptBalanceRaw,
    receiptBalanceAmount,
    recognizedUnderlyingRaw: recognizedBig !== null ? recognizedBig.toString() : null,
    recognizedUnderlyingAmount,
    currentlyLiquidUnderlyingRaw: liquidBig !== null ? liquidBig.toString() : null,
    currentlyLiquidUnderlyingAmount: liquidTokens,
    exchangeRate: rate,
    recognizedValueUsd,
    liquidValueUsd,
    withdrawalState,
    freshness,
    observedAt: input.observedAt,
    sourceSlot: input.sourceSlot,
    sourceAccounts: input.sourceAccounts ?? [],
    unresolvedReasons: [...reasons],
  };
}

/* ------------------------------------------------------------------ *
 * §10 — normalize into the canonical WalletPosition
 * ------------------------------------------------------------------ */
/**
 * Map to the canonical WalletPosition. `valueUsd` (portfolio total) is the RECOGNIZED value and is null
 * until a verified claim exists — an unresolved position contributes nothing to authoritative totals but
 * stays visible. `existingPositionOnly: true` is the canonical signal that keeps this out of every
 * suggestion / selector / Top-Pick / funding / optimization surface (Jupiter's disposition enforces the
 * rest). Never a $1 assumption; never symbol-valued.
 */
export function toJupiterLendWalletPosition(r: JupiterLendPositionResult, opts: { name?: string; icon?: string } = {}): WalletPosition | null {
  if (!r.positionExists) return null;
  return {
    id: JUPITER_LEND_POSITION_ID,
    source: "jupiter",
    type: "protocol",
    symbol: "USDC",
    name: opts.name ?? "Jupiter Lend USDC",
    icon: opts.icon,
    // The row is identified by the UNDERLYING USDC mint for pricing, but deduped by the receipt economic key.
    mint: r.underlyingUsdcMint,
    amount: r.recognizedUnderlyingRaw ?? r.receiptBalanceRaw,
    uiAmount: r.recognizedUnderlyingAmount ?? undefined,
    decimals: JUPITER_LEND_IDENTITY.underlyingUsdcDecimals,
    protocol: JUPITER_LEND_IDENTITY.protocol,
    detection: "protocol_api",
    side: "supplied",
    apy: null, // no sourced APY in this task (research-only); never invented
    valueUsd: r.recognizedValueUsd, // recognized value only; null until verified
    recognizedValueUsd: r.recognizedValueUsd,
    liquidValueUsd: r.liquidValueUsd,
    liquidUnderlyingAmount: r.currentlyLiquidUnderlyingAmount ?? undefined,
    withdrawalState: r.withdrawalState,
    existingPositionOnly: true,
    dedupeKey: r.dedupeKey,
    candidateId: r.candidateId,
  };
}

/* ------------------------------------------------------------------ *
 * §11 — deduplication
 * ------------------------------------------------------------------ */
/**
 * Remove any row that double-counts this economic position — the generic "Unknown token" jlUSDC row (its
 * mint equals the receipt mint) and any duplicate receipt-token account row. NEVER removes canonical wallet
 * USDC (a different mint), JupSOL, JUP, or unrelated receipt positions (bound by the exact receipt mint,
 * not by symbol/name).
 */
export function dedupeJupiterLendPosition(positions: WalletPosition[]): WalletPosition[] {
  return positions.filter((p) => {
    if (p.id === JUPITER_LEND_POSITION_ID) return true; // never remove the canonical row
    if (p.mint === JUPITER_LEND_IDENTITY.receiptTokenMint) return false; // generic jlUSDC receipt row
    return true;
  });
}

export function mergeJupiterLendPosition(positions: WalletPosition[], r: JupiterLendPositionResult, opts: { name?: string; icon?: string } = {}): WalletPosition[] {
  const deduped = dedupeJupiterLendPosition(positions);
  const rich = toJupiterLendWalletPosition(r, opts);
  return rich ? [...deduped.filter((p) => p.id !== JUPITER_LEND_POSITION_ID), rich] : deduped;
}

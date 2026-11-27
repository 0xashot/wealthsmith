/**
 * trimAssessment — Step 19B. The canonical, NON-MOUNTED foundation for the Trim ("Review Long-Tail Assets")
 * suggestion. It answers, separately and deterministically: which exact direct-wallet token holdings are in
 * scope, which are canonical CORE assets (excluded by exact mint + token program, never by symbol), which are
 * non-core review candidates, what authoritative GROSS-ASSET denominator to use, whether liabilities are
 * complete without distorting asset percentages, which of the three existing trigger rules fire, and whether
 * the review is safe to generate. It is pure (no fetching/pricing/AI), review-only, and selects no token.
 *
 * NOT MOUNTED: the production `trim_long_tail_assets` card still comes from `deriveTrimSuggestion`
 * (trimSuggestion.ts). This module is exposed only through pure exports + fixtures until Step 19C.
 *
 * Reuse: the GROSS-ASSET denominator comes from the SHARED `derivePortfolioAssetAccounting` helper
 * (grossAssetValueUsd / recognizedLiabilitiesUsd / netWorthUsd), also consumed by Rebalance — no Trim↔Rebalance
 * dependency. Exact identity comes from the approved TOKEN_REGISTRY mints + the classic/Token-2022 program ids.
 * Position classes come from the shared `classifyPositionClass`.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "../wallet/walletPosition";
import { classifyPositionClass, type PortfolioCompletenessResult, computePortfolioCompleteness } from "../wallet/portfolioCompleteness";
import { resolveAssetOwner } from "./productAssetOwnership";
import { computeSafetyBufferCoverage, type SafetyBufferCoverage } from "../wallet/safetyBufferCoverage";
import { derivePortfolioAssetAccounting } from "../wallet/portfolioAssetAccounting";
import { isCountedVerifiedToken, verifiedMemeIdentity } from "../wallet/verifiedTokenIdentity";
import {
  MIN_TRIM_SUGGESTION_USD,
  TRIM_PORTFOLIO_SHARE_THRESHOLD,
  TRIM_SINGLE_TOKEN_CONCENTRATION_THRESHOLD,
  TRIM_SMALL_POSITION_COUNT_THRESHOLD,
  TRIM_SMALL_POSITION_MAX_USD,
} from "./engineThresholds";

export const TRIM_ASSESSMENT_VERSION = "1.0.0" as const;
export const TRIM_CLASSIC_TOKEN_PROGRAM = TOKEN_PROGRAM_ID;
export const TRIM_TOKEN_2022_PROGRAM = TOKEN_2022_PROGRAM_ID;

/* ------------------------------------------------------------------ *
 * §5 — the exact CORE-ASSET registry. A holding is CORE (excluded from Trim) ONLY when its exact mint AND
 * token program match an ENABLED entry — never by display symbol. Canonical stablecoins carry no approved
 * DAI mint, so a "DAI"-symbol token is NOT core (fail closed). A Token-2022 lookalike carries a different
 * mint (a mint belongs to exactly one program), so it can never inherit a classic entry's core status.
 * ------------------------------------------------------------------ */
export type TrimCoreAssetClass = "wrapped_sol" | "canonical_stablecoin";
export interface TrimCoreAsset {
  assetId: string;
  mint: string | null;
  native: boolean;
  tokenProgram: string;
  assetClass: TrimCoreAssetClass;
  exclusionRole: "excluded_core";
  enabled: boolean;
  evidenceSource: string;
  invalidationReason: string | null;
  methodologyVersion: string;
}
const coreAsset = (assetId: string, mint: string, assetClass: TrimCoreAssetClass): TrimCoreAsset => ({
  assetId, mint, native: false, tokenProgram: TOKEN_PROGRAM_ID, assetClass, exclusionRole: "excluded_core",
  enabled: true, evidenceSource: "TOKEN_REGISTRY (walletPosition.ts) — approved canonical mint", invalidationReason: null,
  methodologyVersion: `trim_core_asset_${TRIM_ASSESSMENT_VERSION}`,
});
/** Approved, exact-identity core assets. Classic SPL Token Program only (all registry mints are classic). */
export const TRIM_CORE_ASSETS: readonly TrimCoreAsset[] = [
  coreAsset("wrapped_sol", "So11111111111111111111111111111111111111112", "wrapped_sol"),
  coreAsset("usdc", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "canonical_stablecoin"),
  coreAsset("usdt", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", "canonical_stablecoin"),
  coreAsset("usdh", "USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX", "canonical_stablecoin"),
];

/** Exact-identity core lookup: mint + classic token program + enabled. Null when not a core asset. */
export function trimCoreAssetFor(mint: string | undefined, tokenProgram: string | undefined): TrimCoreAsset | null {
  if (!mint) return null;
  const program = tokenProgram ?? TOKEN_PROGRAM_ID; // classic rows omit tokenProgram; treat as classic
  return TRIM_CORE_ASSETS.find((a) => a.enabled && a.mint === mint && a.tokenProgram === program) ?? null;
}

/* ------------------------------------------------------------------ *
 * Canonical types.
 * ------------------------------------------------------------------ */
export type TrimGateStatus = "allowed" | "blocked" | "unresolved";
export interface TrimGate { status: TrimGateStatus; reasons: string[] }
export type TrimTriggerState = "triggered" | "not_triggered" | "unresolved";

export type TrimReviewEligibilityState =
  | "eligible" | "excluded_core" | "excluded_scope" | "unresolved_identity" | "unresolved_value" | "duplicate_invalid" | "stale";
export type TrimActionabilityState = "transferable" | "unavailable" | "unresolved" | "not_evaluated" | "not_applicable";

export interface TrimTokenHolding {
  holdingId: string;
  assetId: string | null;
  mint: string | null;
  tokenProgram: string;
  symbol: string;
  name: string;
  /** Present only when the identity came from a verified meme listing rather than the registry. */
  identitySource?: "verified_meme_listing";
  /** That listing's remote icon (allow-listed https host), or null. Absent for registry tokens. */
  iconUrl?: string | null;
  decimals: number | null;
  rawBalance: string; // exact integer lamports/base units (BigInt-summed → string)
  uiAmount: number | null;
  recognizedValueUsd: number | null;
  transferableValueUsd: number | null;
  priceUsd: number | null;
  priceState: "fresh" | "stale" | "unresolved";
  freshnessState: "fresh" | "stale" | "unresolved";
  identityState: "resolved" | "unresolved";
  coreAssetState: "core" | "non_core";
  stableAssetState: "canonical_stable" | "not_stable";
  transferabilityState: "transferable" | "unavailable" | "unresolved" | "not_applicable";
  duplicateState: "unique" | "duplicate_invalid";
  reviewEligibilityState: TrimReviewEligibilityState;
  actionabilityState: TrimActionabilityState;
  exclusionReasons: string[];
  unresolvedReasons: string[];
  sourcePositionIds: string[];
  observedAt: string;
  methodologyVersion: string;
}

export interface TrimTriggerStates {
  aggregateLongTail: TrimTriggerState;
  singleTokenConcentration: TrimTriggerState;
  smallPositionCleanup: TrimTriggerState;
}

export interface TrimTransferabilitySummary {
  transferableCandidateValueUsd: number;
  unavailableTransferabilityCandidateValueUsd: number;
  unresolvedTransferabilityCandidateValueUsd: number;
  candidateCountByActionability: Record<TrimActionabilityState, number>;
}

export interface TrimInput {
  positions: WalletPosition[];
  portfolioCompleteness?: PortfolioCompletenessResult;
  safetyBufferCoverage?: SafetyBufferCoverage;
  requiredBufferUsd?: number;
  generatedAt?: number;
  methodologyVersion?: string;
}

export interface TrimAssessment {
  grossAssetValueUsd: number;
  recognizedLiabilitiesUsd: number;
  netWorthUsd: number;
  denominatorValueUsd: number;
  candidateHoldings: TrimTokenHolding[];
  excludedHoldings: TrimTokenHolding[];
  unresolvedHoldings: TrimTokenHolding[];
  totalCandidateValueUsd: number;
  candidatePortfolioShare: number | null;
  concentratedCandidateIds: string[];
  smallCandidateIds: string[];
  smallCandidateCombinedValueUsd: number;
  triggerStates: TrimTriggerStates;
  reasonCodes: string[];
  calculationGate: TrimGate;
  tokenScopeGate: TrimGate;
  reviewConfidenceGate: TrimGate;
  transferabilitySummary: TrimTransferabilitySummary;
  overallReadiness: TrimGate;
  blockingReasons: string[];
  warnings: string[];
  observedAt: string;
  methodologyVersion: string;
}

/* ------------------------------------------------------------------ *
 * Helpers.
 * ------------------------------------------------------------------ */
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const round2 = (n: number): number => Math.round(n * 100) / 100;
const isPositiveRaw = (amount: string | undefined): boolean => typeof amount === "string" && /^[0-9]+$/.test(amount) && /^0*[1-9]/.test(amount);
const rawOf = (amount: string | undefined): bigint => (typeof amount === "string" && /^[0-9]+$/.test(amount) ? BigInt(amount) : 0n);

/** Normalize a wallet row's token program: classic rows omit it → classic default; keep Token-2022 explicit. */
function programOf(p: WalletPosition): string {
  return p.tokenProgram === TOKEN_2022_PROGRAM_ID ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
}

/** Derive per-position freshness/transferability from the completeness assessment when available. */
function completenessFor(completeness: PortfolioCompletenessResult | undefined, positionId: string) {
  return completeness?.positionAssessments.find((a) => a.positionId === positionId);
}

/* ------------------------------------------------------------------ *
 * The canonical assessment.
 * ------------------------------------------------------------------ */
export function deriveTrimAssessment(input: TrimInput): TrimAssessment {
  const generatedAt = input.generatedAt ?? Date.now();
  const observedAt = new Date(generatedAt).toISOString();
  const requiredBufferUsd = input.requiredBufferUsd ?? input.safetyBufferCoverage?.requiredBufferUsd ?? 0;
  const completeness = input.portfolioCompleteness ?? computePortfolioCompleteness(input.positions, { requiredBufferUsd });
  const buffer = input.safetyBufferCoverage ?? computeSafetyBufferCoverage(input.positions, requiredBufferUsd);
  const holdingMethodology = `trim_token_holding_${TRIM_ASSESSMENT_VERSION}`;

  // §8/§9 — authoritative GROSS-ASSET denominator + liabilities from the SHARED canonical accounting helper
  // (gross = fresh non-liability asset value counted once; liabilities separate; netWorth = gross − liabilities).
  // No dependency on Rebalance (risk tolerance / targets / directions / sources are irrelevant to Trim).
  const accounting = derivePortfolioAssetAccounting(input.positions, completeness);
  const grossAssetValueUsd = accounting.grossAssetValueUsd;
  const recognizedLiabilitiesUsd = accounting.recognizedLiabilitiesUsd;
  const netWorthUsd = accounting.netWorthUsd;
  const denominatorValueUsd = grossAssetValueUsd;

  // §3/§4/§6 — build canonical holdings for direct-wallet token rows ONLY, aggregated by (mint, program).
  const walletTokenRows = input.positions.filter((p) => p.source === "wallet" && p.type === "token" && isPositiveRaw(p.amount));
  const groups = new Map<string, WalletPosition[]>();
  for (const p of walletTokenRows) {
    const key = p.mint ? `${p.mint}|${programOf(p)}` : `id:${p.id}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(p);
  }

  const candidateHoldings: TrimTokenHolding[] = [];
  const excludedHoldings: TrimTokenHolding[] = [];
  const unresolvedHoldings: TrimTokenHolding[] = [];

  for (const [key, rows] of groups) {
    const first = rows[0];
    const mint = first.mint ?? null;
    const program = programOf(first);
    // Exact integer aggregation across all wallet accounts of this (mint, program).
    const rawBalance = rows.reduce((s, p) => s + rawOf(p.amount), 0n).toString();
    const uiAmount = rows.reduce((s, p) => s + (num(p.uiAmount) ?? 0), 0);
    const anyUnpriced = rows.some((p) => num(p.valueUsd) === null);
    const recognizedValueUsd = anyUnpriced ? null : round2(rows.reduce((s, p) => s + (num(p.valueUsd) as number), 0));
    const priceUsd = num(first.priceUsd);
    const sourcePositionIds = rows.map((p) => p.id);

    const cls = classifyPositionClass(first);
    const core = trimCoreAssetFor(mint ?? undefined, first.tokenProgram);
    // Per-position completeness (first row is representative for identity/freshness/dedupe of the mint).
    const ca = completenessFor(completeness, first.id);
    const stale = ca?.freshnessState === "stale";
    // A token the registry cannot name is unresolved — UNLESS Jupiter has verified that exact mint and
    // tags it a meme coin, or it is PUMP (wallet/verifiedTokenIdentity.ts). Its own name is still
    // "Unknown token". A verified token that is NOT a meme coin is counted in the portfolio but is not a
    // Trim candidate: its identity stays unresolved HERE.
    const listed = verifiedMemeIdentity(first);
    // Counted in the portfolio, but not a meme coin: a verified stablecoin, DeFi token, stock… Its identity IS
    // resolved — we know what it is — and what it is, is outside Trim's scope. It must not read as an
    // unresolved identity, which would make the whole Trim "unresolved" and hide it.
    const countedOutOfScope = listed == null && isCountedVerifiedToken(first);
    const identityUnresolved = !mint || (listed == null && !countedOutOfScope && (ca?.identityState === "unresolved" || cls === "unknown_token" || first.name === "Unknown token"));
    const dedupeInvalid = ca?.dedupeState === "invalid";

    // Transferability → actionability (review eligibility is separate; §7). Classic SPL is transferable;
    // frozen/paused/non-transferable Token-2022 is unavailable but STILL review-eligible when value is fresh;
    // hook/confidential unresolved is unresolved but still review-eligible.
    const t = first.transferabilityState;
    let transferabilityState: TrimTokenHolding["transferabilityState"];
    let actionabilityState: TrimActionabilityState;
    if (program !== TOKEN_2022_PROGRAM_ID) { transferabilityState = "transferable"; actionabilityState = "transferable"; }
    else if (t === "frozen" || t === "non_transferable" || t === "paused") { transferabilityState = "unavailable"; actionabilityState = "unavailable"; }
    else if (t === "hook_unresolved" || t === "unresolved") { transferabilityState = "unresolved"; actionabilityState = "unresolved"; }
    else { transferabilityState = "transferable"; actionabilityState = "transferable"; }
    // Transferable value: only when actionably transferable; else separate metadata (never zeroes recognized).
    const transferableValueUsd = actionabilityState === "transferable" ? recognizedValueUsd
      : num(first.liquidValueUsd);

    const exclusionReasons: string[] = [];
    const unresolvedReasons: string[] = [];
    let reviewEligibilityState: TrimReviewEligibilityState;
    // Step 24A — an asset with a dedicated non-Trim product owner (e.g. JUP → jup_staking) is out of Trim's
    // non-core SCOPE by exact identity, so a newly-recognized JUP holding never leaks into Trim. Meme/long-tail
    // assets (trim_only) and unknown/unsupported assets are unaffected — Trim's existing behavior is preserved.
    const productOwner = resolveAssetOwner(mint ?? undefined, first.tokenProgram);
    if (core) { reviewEligibilityState = "excluded_core"; exclusionReasons.push(`canonical core asset (${core.assetId}) by exact mint + program`); }
    else if (productOwner === "jup_staking") { reviewEligibilityState = "excluded_scope"; exclusionReasons.push(`owned by the ${productOwner} product (out of Trim scope) by exact mint + program`); }
    else if (countedOutOfScope) { reviewEligibilityState = "excluded_scope"; exclusionReasons.push("verified token that is not a meme coin (out of Trim scope)"); }
    else if (dedupeInvalid) { reviewEligibilityState = "duplicate_invalid"; unresolvedReasons.push("duplicate economic identity"); }
    else if (identityUnresolved) { reviewEligibilityState = "unresolved_identity"; unresolvedReasons.push("token identity unresolved (unknown mint/registry)"); }
    else if (recognizedValueUsd === null) { reviewEligibilityState = "unresolved_value"; unresolvedReasons.push("no fresh recognized market value"); }
    else if (stale) { reviewEligibilityState = "stale"; unresolvedReasons.push("recognized value is stale"); }
    else reviewEligibilityState = "eligible";

    const holding: TrimTokenHolding = {
      holdingId: key,
      assetId: core?.assetId ?? mint,
      mint,
      tokenProgram: program,
      // What Trim CALLS the holding: the verified listing's ticker and name when that is its identity.
      symbol: listed?.symbol ?? first.symbol,
      name: listed?.name ?? first.name ?? first.symbol,
      ...(listed ? { identitySource: "verified_meme_listing" as const, iconUrl: listed.iconUrl } : {}),
      decimals: num(first.decimals),
      rawBalance,
      uiAmount,
      recognizedValueUsd,
      transferableValueUsd,
      priceUsd,
      priceState: priceUsd !== null && !stale ? "fresh" : priceUsd !== null ? "stale" : "unresolved",
      freshnessState: recognizedValueUsd === null ? "unresolved" : stale ? "stale" : "fresh",
      identityState: identityUnresolved ? "unresolved" : "resolved",
      coreAssetState: core ? "core" : "non_core",
      stableAssetState: core?.assetClass === "canonical_stablecoin" ? "canonical_stable" : "not_stable",
      transferabilityState,
      duplicateState: dedupeInvalid ? "duplicate_invalid" : "unique",
      reviewEligibilityState,
      actionabilityState,
      exclusionReasons,
      unresolvedReasons,
      sourcePositionIds,
      observedAt,
      methodologyVersion: holdingMethodology,
    };

    if (reviewEligibilityState === "excluded_core" || reviewEligibilityState === "excluded_scope") excludedHoldings.push(holding);
    else if (reviewEligibilityState === "eligible") candidateHoldings.push(holding);
    else unresolvedHoldings.push(holding);
  }

  // §16 — deterministic candidate ordering (share desc, value desc, mint, holdingId). Never symbol.
  const shareOf = (h: TrimTokenHolding) => (denominatorValueUsd > 0 && h.recognizedValueUsd !== null ? h.recognizedValueUsd / denominatorValueUsd : 0);
  candidateHoldings.sort((a, b) =>
    shareOf(b) - shareOf(a) ||
    (b.recognizedValueUsd ?? 0) - (a.recognizedValueUsd ?? 0) ||
    (a.mint ?? "").localeCompare(b.mint ?? "") ||
    a.holdingId.localeCompare(b.holdingId));

  // §10 — the three trigger rules (thresholds unchanged; no rounding before comparison; equality triggers).
  const totalCandidateValueUsd = round2(candidateHoldings.reduce((s, h) => s + (h.recognizedValueUsd ?? 0), 0));
  const candidatePortfolioShare = denominatorValueUsd > 0 ? totalCandidateValueUsd / denominatorValueUsd : null;
  const concentrated = candidateHoldings.filter((h) => denominatorValueUsd > 0 && (h.recognizedValueUsd as number) / denominatorValueUsd >= TRIM_SINGLE_TOKEN_CONCENTRATION_THRESHOLD);
  const smallCandidates = candidateHoldings.filter((h) => (h.recognizedValueUsd as number) <= TRIM_SMALL_POSITION_MAX_USD);
  const smallCandidateCombinedValueUsd = round2(smallCandidates.reduce((s, h) => s + (h.recognizedValueUsd as number), 0));

  // Denominator authority gates whether a trigger is deterministically PROVEN vs merely UNRESOLVED.
  const denominatorAuthoritative =
    completeness.netWorthState === "complete" &&
    completeness.liabilitiesState === "complete" &&
    completeness.deduplicationState === "complete" &&
    completeness.freshnessState === "complete" &&
    !completeness.hasUnknownMagnitudeValue &&
    denominatorValueUsd > 0;
  const unresolvedCandidatesExist = unresolvedHoldings.some((h) => h.reviewEligibilityState === "unresolved_value" || h.reviewEligibilityState === "unresolved_identity" || h.reviewEligibilityState === "stale");

  const triState = (fired: boolean): TrimTriggerState => (fired ? "triggered" : denominatorAuthoritative && !unresolvedCandidatesExist ? "not_triggered" : "unresolved");
  const aggregateFired = totalCandidateValueUsd >= MIN_TRIM_SUGGESTION_USD && candidatePortfolioShare !== null && candidatePortfolioShare >= TRIM_PORTFOLIO_SHARE_THRESHOLD;
  const concentrationFired = concentrated.length > 0;
  const smallFired = smallCandidates.length >= TRIM_SMALL_POSITION_COUNT_THRESHOLD && smallCandidateCombinedValueUsd >= MIN_TRIM_SUGGESTION_USD;
  const triggerStates: TrimTriggerStates = {
    aggregateLongTail: triState(aggregateFired),
    singleTokenConcentration: triState(concentrationFired),
    smallPositionCleanup: triState(smallFired),
  };
  const anyTriggered = aggregateFired || concentrationFired || smallFired;

  // §11 — reason codes (existing set preserved) + internal transferability/denominator warnings. Ordered, deduped.
  const reasonSet = new Set<string>();
  if (aggregateFired) { reasonSet.add("long_tail_exposure"); reasonSet.add("non_core_token_exposure"); }
  if (concentrationFired) { reasonSet.add("token_concentration_review"); reasonSet.add("non_core_token_exposure"); }
  if (smallFired) { reasonSet.add("small_position_cleanup"); reasonSet.add("non_core_token_exposure"); }
  const unavailableCandidates = candidateHoldings.filter((h) => h.actionabilityState === "unavailable");
  const unresolvedTransferCandidates = candidateHoldings.filter((h) => h.actionabilityState === "unresolved");
  if (anyTriggered) reasonSet.add("liquidity_not_evaluated");
  if (unavailableCandidates.length > 0) reasonSet.add("transferability_unavailable");
  if (unresolvedTransferCandidates.length > 0) reasonSet.add("transferability_unresolved");
  if (unresolvedHoldings.some((h) => h.reviewEligibilityState === "unresolved_identity")) reasonSet.add("token_identity_unresolved");
  if (!denominatorAuthoritative) reasonSet.add("denominator_unresolved");
  if (unresolvedHoldings.some((h) => h.reviewEligibilityState === "duplicate_invalid")) reasonSet.add("duplicate_invalid");
  const reasonOrder = [
    "long_tail_exposure", "token_concentration_review", "small_position_cleanup", "non_core_token_exposure",
    "liquidity_not_evaluated", "transferability_unavailable", "transferability_unresolved",
    "token_identity_unresolved", "denominator_unresolved", "duplicate_invalid",
  ];
  const reasonCodes = reasonOrder.filter((c) => reasonSet.has(c));

  // §15 — transferability summary (review metadata only; never caps recognized candidate value).
  const sumVal = (hs: TrimTokenHolding[]) => round2(hs.reduce((s, h) => s + (h.recognizedValueUsd ?? 0), 0));
  const transferabilitySummary: TrimTransferabilitySummary = {
    transferableCandidateValueUsd: sumVal(candidateHoldings.filter((h) => h.actionabilityState === "transferable")),
    unavailableTransferabilityCandidateValueUsd: sumVal(unavailableCandidates),
    unresolvedTransferabilityCandidateValueUsd: sumVal(unresolvedTransferCandidates),
    candidateCountByActionability: {
      transferable: candidateHoldings.filter((h) => h.actionabilityState === "transferable").length,
      unavailable: unavailableCandidates.length,
      unresolved: unresolvedTransferCandidates.length,
      not_evaluated: candidateHoldings.filter((h) => h.actionabilityState === "not_evaluated").length,
      not_applicable: candidateHoldings.filter((h) => h.actionabilityState === "not_applicable").length,
    },
  };

  // §12 — Trim-specific gates (NOT canGenerateRebalance). Machine-readable reasons.
  const calcReasons: string[] = [];
  if (buffer.coverageState === "incomplete") calcReasons.push("safety_buffer_incomplete");
  else if (buffer.coverageState !== "complete") calcReasons.push("safety_buffer_unresolved");
  if (completeness.liabilitiesState !== "complete") calcReasons.push("liabilities_unresolved");
  if (completeness.deduplicationState !== "complete") calcReasons.push("duplicate_economic_position");
  if (completeness.hasUnknownMagnitudeValue) calcReasons.push("unknown_asset_value");
  if (completeness.freshnessState === "stale") calcReasons.push("stale_value_in_denominator");
  if (completeness.netWorthState !== "complete") calcReasons.push("net_worth_unresolved");
  if (denominatorValueUsd <= 0) calcReasons.push("denominator_not_positive");
  const calcBlocked = calcReasons.includes("safety_buffer_incomplete") || calcReasons.includes("denominator_not_positive");
  const calculationGate: TrimGate = { status: calcReasons.length === 0 ? "allowed" : calcBlocked ? "blocked" : "unresolved", reasons: calcReasons };

  const scopeReasons: string[] = [];
  if (candidateHoldings.some((h) => !h.mint)) scopeReasons.push("candidate_missing_exact_mint");
  if (unresolvedHoldings.some((h) => h.reviewEligibilityState === "unresolved_identity")) scopeReasons.push("token_identity_unresolved");
  if (unresolvedHoldings.some((h) => h.reviewEligibilityState === "duplicate_invalid")) scopeReasons.push("ambiguous_receipt_duplication");
  const tokenScopeGate: TrimGate = { status: scopeReasons.length === 0 ? "allowed" : "unresolved", reasons: scopeReasons };

  // §12C — review confidence: at least one trigger deterministically PROVEN + authoritative candidate values +
  // authoritative denominator. Transferability may be unavailable/unresolved while this stays allowed.
  const reviewReasons: string[] = [];
  if (!anyTriggered) reviewReasons.push("no_trigger_proven");
  if (!denominatorAuthoritative) reviewReasons.push("denominator_unresolved");
  if (unresolvedCandidatesExist) reviewReasons.push("candidate_value_or_identity_unresolved");
  const reviewConfidenceGate: TrimGate = { status: reviewReasons.length === 0 ? "allowed" : (!anyTriggered && denominatorAuthoritative && !unresolvedCandidatesExist ? "blocked" : "unresolved"), reasons: reviewReasons };

  // §12D — overall readiness.
  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  let overallStatus: TrimGateStatus;
  if (calculationGate.status === "blocked" || (!anyTriggered && denominatorAuthoritative)) { overallStatus = "blocked"; blockingReasons.push(...(calculationGate.status === "blocked" ? calcReasons : ["no_trigger_fires"])); }
  else if (calculationGate.status === "unresolved" || tokenScopeGate.status === "unresolved" || reviewConfidenceGate.status === "unresolved") { overallStatus = "unresolved"; blockingReasons.push(...calcReasons, ...scopeReasons, ...reviewReasons); }
  else if (calculationGate.status === "allowed" && tokenScopeGate.status === "allowed" && reviewConfidenceGate.status === "allowed") overallStatus = "allowed";
  else { overallStatus = "unresolved"; blockingReasons.push("indeterminate"); }

  if (unavailableCandidates.length > 0) warnings.push(`${unavailableCandidates.length} candidate(s) have unavailable transferability (review value only)`);
  if (unresolvedTransferCandidates.length > 0) warnings.push(`${unresolvedTransferCandidates.length} candidate(s) have unresolved transferability`);

  return {
    grossAssetValueUsd, recognizedLiabilitiesUsd, netWorthUsd, denominatorValueUsd,
    candidateHoldings, excludedHoldings, unresolvedHoldings,
    totalCandidateValueUsd, candidatePortfolioShare,
    concentratedCandidateIds: concentrated.map((h) => h.holdingId),
    smallCandidateIds: smallCandidates.map((h) => h.holdingId),
    smallCandidateCombinedValueUsd,
    triggerStates, reasonCodes, calculationGate, tokenScopeGate, reviewConfidenceGate,
    transferabilitySummary, overallReadiness: { status: overallStatus, reasons: [...new Set(blockingReasons)] },
    blockingReasons: [...new Set(blockingReasons)], warnings,
    observedAt, methodologyVersion: `trim_assessment_${TRIM_ASSESSMENT_VERSION}`,
  };
}

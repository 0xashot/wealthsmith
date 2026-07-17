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
    apySelectedField: "16H-N.2 RESOLVED for BASE supply APY: KaminoReserve.totalSupplyAPY(slot) — official SDK, calculation authority A. Units verified (SDK decimal_ratio -> repository percentage_points). Parity: exact match against calculateAPYFromAPR(calculateSupplyAPR(slot, referralFeeBps)), absolute difference 0. TOTAL supply APY remains NULL — farmCollateral is SET so a supplier farm exists, and it is unevaluated. See klendReserveApyDerivation.ts.",
    // 16H-N.2: VERIFIED as `percent`. The SDK returns decimal_ratio; the repository's canonical unit
    // is percentage_points; conversion happens at exactly one boundary (ratioToPercent). APR and APY
    // are distinct SDK methods held in distinct fields. Compounding is per-slot:
    // (1 + apr/SLOTS_PER_YEAR)^SLOTS_PER_YEAR - 1, SLOTS_PER_YEAR = 63,072,000, verified from
    // dist/classes/utils.js:170. Full detail: klendReserveApyDerivation.RATE_SEMANTICS.
    apyUnitInterpretation: "percent",    apySourceTimestampField: "reserve state read slot time",
    apyFreshnessPolicy: "16C canonical max age (1h); source time authoritative",
    // 16H-N.2: the adapter exists and its source is verified against the official SDK with exact
    // parity. This state is for the BASE rate the adapter produces; TOTAL APY is still null because a
    // configured supplier farm is unevaluated — carried as a first-class blocker below.
    apyAdapterState: "adapter_implemented_source_verified",
    // 16H-N.4: the capacity adapter exists and its source is verified against the DEPLOYED KLend
    // program (not merely the SDK's display path). deposit_reserve_liquidity compares
    // liquidity_amount + liquidity.total_supply() against config.deposit_limit with a strict `>`,
    // so equality is allowed and remaining = floor(limit - supply) in exact fixed-point.
    capacitySource: "on-chain Reserve.config.depositLimit + ReserveLiquidity::total_supply (via SDK getTotalSupplySf, exact 2^60 fixed-point)",
    capacityFieldOrFormula: "remaining = floor(config.deposit_limit - liquidity.total_supply()); total_supply = available + borrowed - protocolFees - referrerFees - pendingReferrerFees (fees EXCLUDED)",
    capacityAdapterState: "adapter_implemented_source_verified",
    constraintsState: "blocked",
    depositAvailabilityState: "blocked",
    exitEvidenceState: "blocked",
    riskReviewState: "blocked",
    missingRiskItems: ["protocol_review_status", "product_review_status", "market_identity", "audit_evidence", "admin_upgradeability", "oracle_exposure", "review_date", "reviewer_metadata"],
    // 16H-N.5: detection is bound to the EXACT cToken mint (never symbol/name/USDC-mint), across all
    // wallet-owned accounts, and valued by the deployed program's own redemption math.
    positionDetectionState: "adapter_implemented_source_verified",
    positionMatchMechanism: "EXACT cToken mint B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D (SPL Token program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA, 6dp — both verified live on-chain), matched across every wallet-owned token account returned by the EXISTING ingestion (useWalletPortfolio.ts:504-525 getParsedTokenAccountsByOwner, which enumerates by owner so associated AND non-associated accounts arrive together). Multiple accounts of the same mint are summed; closed, zero-balance, foreign-owner, wrong-token-program, malformed and delegated balances are excluded with a recorded reason. No new wallet scanner was created. See klendDirectLendingPosition.ts.",
    readiness: "blocked",
    // 16H-N.1: `blocked_identity` is RESOLVED — the exact reserve is bound. The evidence model
    // separates identity blockers from market-data blockers, so the primary blocker MOVES rather than
    // staying stale. Leaving `blocked_identity` would assert something now false.
    // 16H-N.2: blocked_apy_unit RESOLVED (units + APR/APY semantics + compounding verified, parity
    // exact). Primary moves to the next real unresolved stage in the model's own sequence. The reward
    // gap has NO state in StableYieldEvidencePrimaryStatus and none was invented — it is carried
    // explicitly below rather than silently dropped.
    // 16H-N.3a REGRESSION: the APY methodology is UNRESOLVED again. The official API and the official
    // SDK disagree by ~9.65% relative about this reserve's supply APY, stably, and the API agrees with
    // the UI. 16H-N.2's "exact parity" was SDK-vs-SDK — circular — and gave false confidence. Primary
    // returns to blocked_apy_unit: a product whose headline yield is disputed ~10% between two official
    // sources is blocked on the yield before capacity.
    // 16H-N.3b: blocked_apy_unit RESOLVED AGAIN, this time with the mechanism VERIFIED rather than
    // assumed. The ~9.65% gap was never rate math: every KLend rate method scales the curve by
    // slotAdjustmentFactor = 500/recentSlotDurationMs (reserve.js:777-779), and the repo passed a
    // hardcoded 450ms against a real ~415ms network. The recorded gap ratio 1.094888 is just
    // 450/410.99 — the ratio of two slot-duration assumptions. Production now MEASURES slot duration
    // deterministically (10k primary + 2.5k/50k validation windows) or fails closed, and the residual
    // API parity gap falls to ~1.03%, inside a justified 2% tolerance. Primary moves back to capacity.
    // 16H-N.4: blocked_capacity RESOLVED. Primary moves to blocked_position_detection — the next
    // genuinely unresolved blocker the state model actually supports. NOTE the reported state-model
    // gap: depositAvailabilityState and constraintsState are both blocked but have NO enum value in
    // StableYieldEvidencePrimaryStatus, so neither can be primary without inventing one.
    // 16H-N.5: blocked_position_detection RESOLVED. Primary moves to blocked_risk_review — supported by
    // the state model and genuinely unresolved. The STATE-MODEL GAP persists and is now binding: the
    // most proximate blockers (deposit availability, constraints) have no enum value, so they cannot be
    // primary without inventing one. Reported rather than invented.
    primaryBlocker: "blocked_risk_review",
    blockers: [
      "blocked_risk_review (PRIMARY at 16H-N.5): riskReviewState = blocked. No complete reviewed 16D risk record exists, no numeric score is assigned, no reviewer is authorized and no signoff exists. NOTE: this is accurate and supported by the state model, but it is NOT the most proximate blocker — deposit availability and constraints are, and neither is representable as a primary status. See the state-model gap below.",
      "RESOLVED at 16H-N.5 (retained for provenance, no longer blocking) — blocked_position_detection: the exact cToken position is now detected and valued. Identity: cToken mint B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D, owned by the classic SPL Token program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA (NOT Token-2022), decimals 6 — all verified live. Bound by ADDRESS only; symbol, display name, protocol name, USDC-mint-alone and market-name-alone are all rejected, because canonical USDC is shared by four reserves in this market. Discovery REUSES existing ingestion (useWalletPortfolio.ts:504-525) which enumerates by owner, so associated and non-associated accounts both arrive; multiple accounts per mint are summed. VALUATION uses the deployed redemption path, not the SDK display path: redeem_reserve_collateral (lending_operations.rs L574-613) -> Reserve::redeem_collateral (reserve.rs L444-457) -> collateral_to_liquidity (L1404-1407) -> checked_fraction_collateral_to_liquidity (L1435-1443), i.e. underlying = FLOOR(cTokenBalance x liquidity.total_supply() / collateral.mint_total_supply). Two details are load-bearing: (1) the program FLOORS (to_floor) while the SDK cTokensToLiquidity is an unfloored Decimal divide — at the snapshot the program pays 1191791 base units where the SDK reports 1191791.7274, so using the SDK figure would OVERSTATE the user's claim; the SDK's rate is also INVERTED (mintTotalSupply/totalSupply) and divided by rather than multiplied. (2) The denominator is the RESERVE'S CACHED collateral.mint_total_supply (92452929243853), NOT the SPL mint's live supply (92452916483318) — they diverge by ~12.76 cTokens and the program reads its own field. cToken is NOT 1:1 with USDC: 1 cToken = 1.191791 USDC at the snapshot, and no market price is used (none exists). Accrued interest is INCLUDED (the program rejects a stale reserve, so the refresh accrues first); protocol/referrer/pending fees are EXCLUDED from the numerator, consistent with capacity's counted amount. Dust that floors to 0 underlying still reports positionExists = true, so it is never silently discarded. All arithmetic BigInt; float only at the display boundary. positionDetectionState no_adapter -> adapter_implemented_source_verified. See klendDirectLendingPosition.ts (position_evidence).",
      "state_model_gap_primary_blocker_expressiveness (16H-N.5, reported not invented): StableYieldEvidencePrimaryStatus has no blocked_deposit_availability and no blocked_constraints value. Both depositAvailabilityState and constraintsState are genuinely blocked and are the most proximate remaining work, but neither can be set as primaryBlocker without inventing an enum member. Primary therefore sits at blocked_risk_review, which is supported and genuinely unresolved. Recommend adding the missing enum values in a dedicated state-model step rather than as a side effect of an adapter task.",
      "buffer_liquidity_unverified (16H-N.5, not blocking recognition): recognizedBufferValueUsd MAY populate from the existing approved exact-mint USDC/USD price path (USDC is NOT assumed to be $1 — the API's own totalSupplyUsd/totalSupply implies ~$0.99985). liquidBufferValueUsd remains UNRESOLVED and this position counts toward NO buffer sufficiency check until withdrawal accessibility is verified at 16H-N.6. Free liquidity, Active status and a positive claim are not proof of exit. No percentage haircut was invented.",
      "deposit_availability_blocked (16H-N.4, genuinely blocked, NOT representable as primary): capacity is NOT deposit state. Positive remaining capacity, Active status, emergencyMode = 0, large available liquidity, a successful decode, a fresh APY and a verified identity are individually and jointly NOT evidence deposits are enabled. Still unevaluated: reserve status, deposit pause/freeze flags, market + reserve emergency state, program restrictions, transaction-path constraints, and the SEPARATE deposit_withdrawal_cap rolling-window accumulator that deposit_reserve_liquidity also debits. STATE-MODEL GAP: StableYieldEvidencePrimaryStatus has no blocked_deposit_availability value, so this cannot be primary without inventing an enum value.",
      "RESOLVED at 16H-N.4 (retained for provenance, no longer blocking) — blocked_capacity: remaining deposit capacity derived EXACTLY from the deployed program's own predicate, not the SDK's display path. Authority: programs/klend/src/lending_market/lending_operations.rs :: deposit_reserve_liquidity L122-173 — `new_reserve_liquidity_supply_f = liquidity_amount_f + reserve.liquidity.total_supply(); if new_reserve_liquidity_supply_f > deposit_limit_f { err!(DepositLimitExceeded) }`. Five load-bearing facts: (1) the counted amount is liquidity.total_supply(), never available liquidity and never the borrow limit; (2) the incoming deposit is added BEFORE comparison; (3) the test is strict `>`, so equality with the cap is ALLOWED and remaining = limit - supply with no -1; (4) accrual must be refreshed in the current slot (ReserveStale), so capacity is freshness-gated; (5) there is NO unlimited sentinel branch. total_supply (reserve.rs L1123-1128) EXCLUDES accumulated_protocol_fees_sf + accumulated_referrer_fees_sf + pending_referrer_fees_sf, so available + borrowed = total_supply is FALSE and was never assumed — verified numerically: 22,581,491.78 + 89,087,415.71 = 111,668,907.49 vs total_supply 111,556,662.39, the 112,245.10 delta being exactly accumulated protocol fees. SENTINEL: klend DIVERGES from kvault — kvault maps deposit_cap == 0 to u64::MAX (uncapped), klend has no such branch, so 0 is a literal ZERO cap (corroborated by SDK reserve.js:1409 isUsageBlocked = depositLimit.isZero() && borrowLimit.isZero()); u64::MAX is uncapped by TYPE (predicate unsatisfiable), and any other value is a finite cap however large. At slot 433434136 (2026-07-17T07:00:45Z): depositLimit = 1000000000000000 raw = 1,000,000,000 USDC (FINITE, not u64::MAX, not misclassified as uncapped); borrowLimit = 700000000000000 = 700,000,000 USDC (a DIFFERENT value, never used as deposit capacity); total_supply = 111,556,662.387780 USDC; remaining = 888,443,337.612219 USDC; isAtCapacity = false; isOverConfiguredLimit = false; depositLimitCrossed() = false. All arithmetic in BigInt scaled-fraction (2^60) via the SDK's getTotalSupplySf ('for exact on-chain-matching fixed-point math'), float only at the final token boundary. capacityAdapterState no_adapter -> adapter_implemented_source_verified. See klendReserveCapacity.ts (capacity_evidence).",
      "api_capacity_authority_rejected (16H-N.4, not blocking): the API exposes NO deposit limit and NO remaining capacity, so it could not answer this question even if fresh. It is also DEMONSTRABLY CACHED: totalSupply returned the byte-identical 110542638.5383361 at 06:59 and 07:00 while on-chain supply moved ~1.01M USDC. When fresh it agreed with the SDK to 8.55 USDC (0.0000077%), proving the accounting definitions match and the divergence is cache lag, not disagreement. Diagnostic only.",
      "api_freshness_unestablishable (16H-N.3a, CONFIRMED at 16H-N.3b, not blocking): the reserves/metrics endpoint returns NO timestamp, slot, or as-of field. Response freshness cannot be established from the response, so the API is permanently disqualified as a production calculation authority and is retained as a DIAGNOSTIC PARITY SOURCE ONLY. This is not a blocker because the SDK — not the API — is the authority.",
      "RESOLVED at 16H-N.3b (retained for provenance, no longer blocking) — blocked_apy_unit, REOPENED at 16H-N.3a: mechanism VERIFIED as a slot-duration parameterization difference, not a rate-math difference. slotAdjustmentFactor = 1000/SLOTS_PER_SECOND/recentSlotDurationMs = 500/recentSlotDurationMs (verified: dist/classes/reserve.js:777-779, applied at :783-786, :818-827). The borrowRateCurve is denominated in nominal 500ms slots; real mainnet slots are faster, so real wall-clock yield is higher. The repo hardcoded 450ms (kaminoVaults.ts:23, refresh-stable-yield-market-data.mjs:63) against a measured ~415.1ms — a ~8.4% understatement provable against on-chain block times alone, independent of the API. Proof the gap IS this parameter: recorded gap ratio 1.094888 vs 450/410.99 = 1.094926, where 410.99ms is implied by the API's own borrowApy. SDK version (9.1.2 vs 9.1.5) was investigated and REJECTED as the cause — both parameterize identically. Correction: deterministic measurement (primary 10,000 slots; validation 2,500 + 50,000; agreement 0.12%/0.17% within 2%; sanity range [300,800]ms; TTL 15min; skew bound 150 slots), no fallback constant anywhere. At measured 415.1ms (factor 1.204529), slot 433431197: utilization 80.357790%, borrowAPR 5.299286%, borrowAPY 5.442212%, supplyAPR 3.396981%, baseSupplyAPY 3.455338%, rewardAPY 0 (farm exhausted), totalSupplyAPY 3.455338%. API parity residual falls from ~9.65% to ~1.03% on BOTH borrow and supply — the magnitude, sign, and cross-field consistency the mechanism predicts (415.1/411 = 1.0100). Classified consistent_with_measurement_window_difference within a justified 2% tolerance. rateKind = estimated_variable_apy, precision = estimated: annualized yield depends on FUTURE slot duration and can never be exact. definitionSufficientForComparison = TRUE. See solanaSlotDurationEstimator.ts + klendReserveMeasuredApyCorrection.ts (measured_apy_evidence).",
      "RESOLVED at 16H-N.3 (retained for provenance, no longer blocking) — rewards_configured_but_unresolved: the 16H-N.2 refusal to call the farm zero was correct; the farm had to be opened. Supplier farm JAvnB9AKtgPsTEoKmn24Bq64UMoYcrtWtq42HHBdsPkh (owner FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr) has ONE reward stream (mint DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263, decimals 5) which is EXHAUSTED — positively verified on four independent grounds: rewardsAvailable = 0; all 20 rewardScheduleCurve points have rewardPerTimeUnit = 0; no future activation (tsStart only 0 / u64::MAX sentinel); lastIssuanceTs = 2024-02-01, ~2.5 years prior. No price source was needed or invented: zero emission x any price = zero. No combination rule was needed or invented: with reward = 0, additive and compounded conventions agree that total = base. rewardApyPct = 0 (positively established), totalSupplyApyPct = baseSupplyApyPct = 3.153819% at unified slot 433414541 (slot skew 0). definitionSufficientForComparison = true. See klendReserveRewardResolution.ts.",
      "SUPERSEDED at 16H-N.3a (retained for provenance) — 'UI PARITY UNEXPLAINED, diagnostic only, NOT blocking': that framing treated the UI as the suspect party and the SDK as sound. 16H-N.3a inverted it. The official API AGREES with the UI (3.458022% vs 3.49%; borrow 5.475096% vs 5.49%) and the SDK is the outlier against both. It is therefore NOT diagnostic-only and it DOES block: two official Kamino sources materially disagree without explanation.",
      "RESOLVED at 16H-N.2 (retained for provenance, no longer blocking) — blocked_apy_unit: supply APY is genuinely not a stored field on reserve state, so the blocker was accurate. It is resolved by calculation authority A: KaminoReserve.totalSupplyAPY(slot), units decimal_ratio -> percentage_points, per-slot compounding verified from SDK source, parity exact (absolute difference 0) against calculateAPYFromAPR(calculateSupplyAPR(...)). Calculation version 1.0.0, slot 433344510, 2026-07-16T20:42:52Z.",
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

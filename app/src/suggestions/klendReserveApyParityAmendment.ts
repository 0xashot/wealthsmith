/**
 * klendReserveApyParityAmendment — Step 16H-N.3a. Exact-reserve API/SDK/UI parity investigation.
 *
 * THE RESULT REVERSES 16H-N.2's CONFIDENCE, and the reason is worth stating plainly.
 *
 * 16H-N.2 reported "parity: exact match, absolute difference 0" and treated the APY as settled. That
 * check compared `totalSupplyAPY(slot)` against `calculateAPYFromAPR(calculateSupplyAPR(...))` — two
 * paths through the SAME SDK, where the second is the first's definition. It could only ever have
 * agreed. It proved the APR→APY conversion was understood; it could not detect a systematic error in
 * the inputs, because both paths share them. It was circular, and it produced false confidence.
 *
 * The FIRST genuinely independent check — the official Kamino API for the exact reserve — disagrees
 * with the SDK by ~9.65% relative, stably, across repeated observations. The API also agrees with the
 * UI. So the SDK is the outlier against two official Kamino surfaces.
 *
 * WHERE THE GAP LIVES, narrowed but not closed:
 *   utilization      SDK 80.2577%  vs API 80.3386%   — same (drift-explicable)
 *   supplier share   SDK 0.635221  vs API 0.634682   — same
 *   borrow rate      SDK 4.887276% vs API 5.351019% (implied APR) — RATIO 1.094888
 *
 * Utilization matches. The supplier-share maths matches. The BORROW RATE itself differs by ~9.5%,
 * upstream of the protocol take rate and of compounding — i.e. upstream of everything 16H-N.2
 * verified. The mechanism is NOT identified, and no formula was adopted to close the gap numerically.
 *
 * CONSEQUENCE: the APY methodology is UNRESOLVED. Two official Kamino sources materially disagree
 * about what a USDC depositor earns, and this project cannot say which is right. Per 16H-N.3a's own
 * rule — "do block if official API and SDK materially disagree without explanation" —
 * definitionSufficientForComparison returns to FALSE and the primary blocker returns to
 * blocked_apy_unit. A ~10% error on the headline yield is not a rounding footnote.
 *
 * Read-only. No adapter was silently edited. No score, no approval, no capacity.
 */
import { SOL_BTC_USDC_RESERVE_IDENTITY, CANONICAL_SOLANA_USDC_MINT } from "./klendReserveIdentity";

export const APY_PARITY_AMENDMENT_VERSION = "1.0.0" as const;
export const PARITY_EVIDENCE_CUTOFF_AT = "2026-07-17T04:57:00.000Z";

/* ------------------------------------------------------------------ *
 * 1. The official API contract
 * ------------------------------------------------------------------ */

/**
 * Fields are recorded as observed, not as labelled. Two properties matter and both are recorded
 * because they constrain how this source may ever be used:
 *
 *  - It DOES carry an exact `reserve` address, so exact-address binding is possible. Necessary,
 *    because `liquidityTokenMint` matches FOUR reserves in this market — mint-only selection would be
 *    ambiguous, and `liquidityToken: "USDC"` (a symbol) even more so.
 *  - It carries NO timestamp, slot, or as-of field. Response freshness cannot be established from the
 *    response. That alone would disqualify it as a production APY source under 16C freshness rules,
 *    independent of the disagreement below.
 */
export const KAMINO_RESERVE_METRICS_API = {
  endpoint: "https://api.kamino.finance/kamino-market/7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF/reserves/metrics",
  httpStatus: 200,
  entryCount: 58,
  fields: ["reserve", "liquidityToken", "liquidityTokenMint", "maxLtv", "borrowApy", "supplyApy", "totalSupply", "totalBorrow", "totalBorrowUsd", "totalSupplyUsd"],
  hasExactReserveAddress: true,
  hasTimestampField: false,
  hasSlotField: false,
  hasAsOfField: false,
  apyFieldNames: ["supplyApy", "borrowApy"],
  apyUnit: "decimal_ratio",
  apyUnitEvidence: "supplyApy = 0.034580223396257326 for a ~3.46% rate — a ratio, matching the SDK's unit convention. Both were converted to percent identically, so the disagreement is NOT a unit error.",
  usdcMintMatchesInResponse: 4,
  mintOnlySelectionAmbiguous: true,
  symbolOnlySelectionAmbiguous: true,
  freshnessEstablishableFromResponse: false,
  freshnessNote: "No timestamp/slot/as-of field exists. The value was byte-identical across three observations ~4s apart, which is consistent with a cached or periodically-recomputed service — but cadence cannot be established from the response, so staleness is unbounded.",
} as const;

/* ------------------------------------------------------------------ *
 * 2. Same-moment observations
 * ------------------------------------------------------------------ */

export interface ParityObservation {
  index: number;
  slot: string;
  skewMs: number;
  sdkSupplyApyPct: number;
  sdkBorrowApyPct: number;
  sdkUtilizationPct: number;
  apiSupplyApyRaw: number;
  apiSupplyApyPct: number;
  apiBorrowApyPct: number;
  absoluteDifferencePct: number;
  relativeDifferencePct: number;
}

/**
 * Three observations, seconds apart. The SDK value moves slightly with slot; the API value is
 * BYTE-IDENTICAL across all three. The difference is therefore stable and systematic — this is not
 * refresh lag, and it is not a moment-in-time artifact.
 */
export const PARITY_OBSERVATIONS: ParityObservation[] = [
  { index: 1, slot: "433416160", skewMs: 649, sdkSupplyApyPct: 3.153680, sdkBorrowApyPct: 4.988970, sdkUtilizationPct: 79.9908, apiSupplyApyRaw: 0.034580223396257326, apiSupplyApyPct: 3.458022, apiBorrowApyPct: 5.475096, absoluteDifferencePct: 0.304342, relativeDifferencePct: 9.650 },
  { index: 2, slot: "433416171", skewMs: 1142, sdkSupplyApyPct: 3.153680, sdkBorrowApyPct: 4.988970, sdkUtilizationPct: 79.9908, apiSupplyApyRaw: 0.034580223396257326, apiSupplyApyPct: 3.458022, apiBorrowApyPct: 5.475096, absoluteDifferencePct: 0.304342, relativeDifferencePct: 9.650 },
  { index: 3, slot: "433416183", skewMs: 740, sdkSupplyApyPct: 3.153674, sdkBorrowApyPct: 4.988966, sdkUtilizationPct: 79.9908, apiSupplyApyRaw: 0.034580223396257326, apiSupplyApyPct: 3.458022, apiBorrowApyPct: 5.475096, absoluteDifferencePct: 0.304348, relativeDifferencePct: 9.651 },
];

/** Where the gap is, and — as importantly — where it is NOT. */
export const GAP_LOCALIZATION = {
  utilization: { sdkPct: 80.2577, apiPct: 80.3386, agrees: true, note: "0.08pp apart, explicable by observation drift. NOT the cause." },
  supplierShare: { sdkRatio: 0.635221, apiRatio: 0.634682, agrees: true, note: "supply/borrow ratio matches, so utilization x take-rate x supplier-share logic is NOT the cause." },
  borrowRate: { sdkAprPct: 4.887276, apiImpliedAprPct: 5.351019, ratio: 1.094888, agrees: false, note: "THE GAP. The API's borrow rate is ~9.5% higher at the same utilization." },
  supplyRatio: 1.096521,
  borrowRatio: 1.097451,
  conclusion:
    "The gap originates in the BORROW RATE evaluation — upstream of the protocol take rate and upstream of APR->APY compounding, i.e. upstream of everything 16H-N.2 verified. It is not a unit error (both are decimal ratios), not compounding (the supplier share matches), not rewards (the farm is exhausted), not timing (the API value is byte-identical across observations while the SDK's moves), and not rounding (0.30pp is far beyond display precision).",
  mechanismIdentified: false,
  mechanismCandidatesUnverified: [
    "The API may evaluate the borrowRateCurve differently, or use a different curve source.",
    "The API may include a fee component the SDK's borrow rate excludes (the reserve config carries hostFixedInterestRateBps and a fees struct that were not investigated).",
    "The API may annualize on a different basis than SLOTS_PER_YEAR = 63,072,000.",
    "The SDK's calculateBorrowAPR may require an argument this project supplies incorrectly (referralFeeBps = 0 was read from market state, but its interaction was not independently verified).",
  ],
  noFormulaAdopted: "No diagnostic formula was adopted to close the gap. A ratio of ~1.0949 is suggestive, but numeric similarity cannot select a methodology — an official, semantically documented authority is required, and none explains this.",
} as const;

/* ------------------------------------------------------------------ *
 * 3. UI relationship
 * ------------------------------------------------------------------ */

/**
 * The decisive reframing: the UI is not the odd one out. The API and UI agree with each other, and the
 * SDK disagrees with both. 16H-N.2 and 16H-N.3 both implicitly treated the UI as the suspect party;
 * that was wrong, and it was wrong because the only "parity" check in place was circular.
 */
export const UI_API_RELATIONSHIP = {
  uiSupplyApyPct: 3.49,
  uiBorrowApyPct: 5.49,
  uiObservedAt: "2026-07-16T20:47:00.000Z (approx, user-reported)",
  apiSupplyApyPct: 3.458022,
  apiBorrowApyPct: 5.475096,
  sdkSupplyApyPct: 3.153680,
  sdkBorrowApyPct: 4.988970,
  uiAgreesWithApi: true,
  uiAgreesWithApiEvidence: "UI supply 3.49% vs API 3.458022% (0.03pp apart) and UI borrow 5.49% vs API 5.475096% (0.015pp apart) — both within plausible display rounding and an ~8h observation gap. The SDK differs from BOTH by ~0.30pp / ~0.49pp.",
  sdkIsTheOutlier: true,
  uiIsAuthority: false,
  apiIsAuthority: false,
  note: "Neither the UI nor the API is adopted as calculation authority. The finding is that the SDK does not agree with the surfaces Kamino actually shows its users, which makes the methodology unresolved rather than making any one source correct.",
} as const;

/* ------------------------------------------------------------------ *
 * 4. Unresolved items
 * ------------------------------------------------------------------ */

/** Recorded as not-done rather than glossed. Each is a real hole in this investigation. */
export const NOT_INVESTIGATED = [
  "Historical exact-reserve metrics around the 2026-07-16T20:47Z screenshot — no history endpoint was located or queried, so the screenshot could not be compared against the API AT THAT MOMENT.",
  "Frontend data provenance — the public app bundle was not inspected to determine whether the UI reads supplyApy from this API, from the SDK, or from another service. The UI/API agreement is inferred from value proximity, NOT from an identified field.",
  "The 'Include Asset Yield in APY' toggle semantics — not resolved from documentation or public frontend source. Its applicability to canonical USDC is UNKNOWN. Kamino docs state Supply APY excludes staking/kToken fee rewards, which suggests it should not affect USDC, but that was not verified and the label was deliberately not trusted.",
  "The reserve's hostFixedInterestRateBps and fees struct — present in config, never investigated as a possible component of the API's higher borrow rate.",
  "Whether the API's supplyApy is documented anywhere with stated semantics — no official documentation of this endpoint's field meanings was located.",
] as const;

/* ------------------------------------------------------------------ *
 * 5. Classification
 * ------------------------------------------------------------------ */

export type ParityClassification =
  | "A_sdk_api_agree_ui_stale"
  | "B_api_ui_agree_sdk_missing_component"
  | "C_sdk_ui_agree_api_trailing"
  | "D_all_three_different_documented_metrics"
  | "E_unresolved";

/**
 * B-shaped in its agreement pattern, but the component is UNIDENTIFIED — so the honest classification
 * is E. B asserts the SDK "is missing an officially defined component"; that would claim knowledge of
 * what the component IS, and this investigation does not have it. Naming the pattern is not the same
 * as explaining it.
 */
export const PARITY_CLASSIFICATION = {
  classification: "E_unresolved" as ParityClassification,
  agreementPattern: "B-shaped: API and UI agree; the SDK is the outlier.",
  whyNotB: "B asserts the SDK is missing an OFFICIALLY DEFINED component. The disagreement is established, but the component is not identified and no official documentation explains it. Claiming B would assert a cause this investigation did not find.",
  whyNotA: "The SDK and API do NOT agree — they differ by ~9.65% relative, stably across observations. The UI is not stale; it matches the API.",
  whyNotC: "C requires the SDK and UI to agree with the API trailing. The opposite holds: the SDK differs from the UI by ~0.34pp on supply and ~0.50pp on borrow, while the API sits within rounding distance of the UI on both. And the API cannot be 'trailing' in the sense C means — a trailing average would drift as conditions moved, whereas this value was byte-identical across observations while the SDK's moved with slot. If anything the SDK is the live series and the API the static one, which is the reverse of C.",
  whyNotD: "No documentation was located defining these as different metrics. That remains possible and is exactly what would resolve this — but it is not established.",
  evidenceEstablishingIt: [
    "Three same-moment observations with sub-1.2s skew, all showing ~9.65% relative disagreement.",
    "The API value byte-identical across observations while the SDK's moved with slot — so the difference is systematic, not timing.",
    "Both sources are decimal ratios converted identically — not a unit error.",
    "Utilization and supplier share agree; only the borrow rate differs — the gap is localized but unexplained.",
    "The exhausted farm eliminates rewards as a cause.",
  ],
  materialAndUnexplained: true,
} as const;

/* ------------------------------------------------------------------ *
 * 6. Consequence
 * ------------------------------------------------------------------ */

/**
 * The uncomfortable part, applied rather than hedged.
 *
 * 16H-N.3a: "do block if official API and SDK materially disagree without explanation" and "Do not
 * change the primary blocker from blocked_capacity unless the APY methodology itself becomes
 * unresolved." It has. Two official Kamino sources disagree by ~10% about what a depositor earns, and
 * this project cannot say which is right — so it cannot state a supply APY it would stand behind.
 *
 * The SDK is NOT edited and NOT abandoned. No methodology correction is made, because a correction
 * requires knowing what to correct. The adapter stays exactly as built; what changes is the claim
 * about whether its output is usable.
 */
export const PARITY_CONSEQUENCE = {
  apyMethodologyResolved: false,
  definitionSufficientForComparison: false,
  definitionSufficientPriorValue: true,
  calculationAuthorityRetained: "KaminoReserve.totalSupplyAPY — retained as the implementation, NOT vindicated as correct. It is simply not edited on the basis of an unexplained gap.",
  adapterSilentlyEdited: false,
  methodologyCorrectionMade: false,
  methodologyCorrectionWithheldBecause: "A correction requires identifying the omitted component. It was not identified. Adjusting the adapter to match the API numerically would be adopting a formula because it fits — which 16H-N.3a explicitly forbids.",
  primaryBlockerMovesTo: "blocked_apy_unit",
  primaryBlockerRationale: "The APY methodology itself is unresolved, which is the one condition under which 16H-N.3a permits moving the primary blocker off blocked_capacity. Capacity remains unresolved too, but a product whose headline yield is disputed by ~10% between two official sources is blocked on the yield first.",
  internalComparabilityVsUiParity:
    "These are distinguished, and the distinction does not save it. A rounded UI differing from an official API would be diagnostic noise and would NOT block. But the official API and the official SDK disagree by 0.30pp / ~9.65% — far beyond rounding — and neither is documented well enough to adjudicate. That is a methodology failure, not a display artifact.",
  regression16HN2: "16H-N.2's 'exact parity, absolute difference 0' is now understood as circular: it compared totalSupplyAPY against its own definition. It remains TRUE and is not withdrawn — the APR->APY conversion is correctly understood — but it was never evidence that the inputs were right, and it should not have been read as settling the APY.",
} as const;

/* ------------------------------------------------------------------ *
 * 7. Evidence
 * ------------------------------------------------------------------ */

export const PARITY_EVIDENCE = {
  evidenceId: "klend_reserve_apy_parity_v1",
  version: APY_PARITY_AMENDMENT_VERSION,
  candidateId: SOL_BTC_USDC_RESERVE_IDENTITY.candidateId,
  reserveAddress: SOL_BTC_USDC_RESERVE_IDENTITY.reserveAddress,
  marketAddress: SOL_BTC_USDC_RESERVE_IDENTITY.marketAddress,
  liquidityMint: CANONICAL_SOLANA_USDC_MINT,
  apiEndpoint: KAMINO_RESERVE_METRICS_API.endpoint,
  apiReserveBinding: "exact `reserve` address field — required, because liquidityTokenMint matches 4 reserves and liquidityToken is a bare symbol",
  observations: 3,
  maxSkewMs: 1142,
  classification: "E_unresolved",
  evidenceCutoffAt: PARITY_EVIDENCE_CUTOFF_AT,
  preservesPriorEvidence: ["identity_9773ac14", "klend_reserve_apy_methodology_v1", "apy_evidence_d468fce5", "klend_reserve_reward_methodology_v1", "reward_evidence_cace4fe4"],
  priorEvidenceRewritten: false,
} as const;

export function computeParityEvidenceManifestHash(e: typeof PARITY_EVIDENCE = PARITY_EVIDENCE): string {
  const material = JSON.stringify({
    id: e.evidenceId, v: e.version, r: e.reserveAddress, ep: e.apiEndpoint,
    c: e.classification, o: e.observations, cutoff: e.evidenceCutoffAt,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) { h ^= material.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `parity_evidence_${h.toString(16).padStart(8, "0")}`;
}

export const PARITY_EVIDENCE_MANIFEST_HASH = computeParityEvidenceManifestHash();

export const PARITY_AMENDMENT_CONFERS = {
  capacityResolved: false,
  depositAvailabilityResolved: false,
  riskScoreAssigned: false,
  humanReviewPerformed: false,
  productApproved: false,
  selectorIntegrated: false,
  rendersCard: false,
  demoChanged: false,
  steakhouseRecognitionChanged: false,
  solStakingChanged: false,
  adapterEdited: false,
  note: "An investigation. It changes what is claimed, not what is built.",
} as const;

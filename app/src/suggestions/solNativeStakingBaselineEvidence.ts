/**
 * solNativeStakingBaselineEvidence — Step 14P. A SEPARATE evidence model for the Native
 * SOL / Jupiter Native Stake BASELINE candidate. This is deliberately NOT the LST evidence
 * model: native staking is a native Solana stake account (delegated SOL), NOT an SPL
 * liquid-staking token. It must never be confused with JupSOL (the LST).
 *
 *   Native SOL staking (this module)   |  JupSOL (LST — solLiquidStaking* modules)
 *   ----------------------------------- | -----------------------------------------
 *   native Solana stake account         |  SPL token mint
 *   delegated SOL, you own the account   |  reward-bearing liquid token
 *   no LST liquidity token               |  liquid, DeFi-composable
 *   epoch-based unstake (deactivation)   |  instant swap OR delayed unstake
 *   detected via stake accounts          |  detected via SPL token mint
 *
 * EVIDENCE RECORDING ONLY. It never assigns a risk score, approves the candidate, enables
 * the (still-disabled) selector comparison, updates a live recommendation, or replaces
 * Jito as the selected protocol. No transaction/signature/stake/delegate/withdraw path.
 *
 * OUTCOME IN 14P: INCOMPLETE. Jupiter's docs authoritatively give the mechanics, the 5%
 * inflation validator commission, and the non-custodial model, but do NOT publish an exact
 * native-staking APY, 30-day APY, or delegated-stake figure — and the validator stats page
 * is JS-rendered (not reliably verifiable). Per the spec, those three market categories are
 * left MISSING (not invented, not reused from JupSOL), so the baseline stays blocked at the
 * evidence gate: `readyForRiskGate` is false → no score, no approval, no product UI.
 */

export const SOL_NATIVE_STAKING_BASELINE_EVIDENCE_EXISTS = true;
/** This candidate is NOT a liquid-staking token — it is a native stake account. */
export const SOL_NATIVE_STAKING_BASELINE_IS_LST = false;
export const SOL_NATIVE_STAKING_BASELINE_ENABLES_SELECTOR_COMPARISON = false;
export const SOL_NATIVE_STAKING_BASELINE_UPDATES_LIVE_RECOMMENDATIONS = false;
export const SOL_NATIVE_STAKING_BASELINE_ENABLES_TRANSACTIONS = false;
export const SOL_NATIVE_STAKING_BASELINE_REQUIRES_WALLET_SIGNATURE = false;

/** Identity of the baseline candidate (NOT an LST, NOT JupSOL). */
export const NATIVE_STAKING_BASELINE_IDENTITY = {
  protocolId: "jupiter_native_stake" as const,
  protocolName: "Jupiter Native Stake" as const,
  assetSymbol: "SOL" as const,
  candidateType: "native_staking" as const,
  isLiquidStakingToken: false as const,
  splTokenMint: null as null, // native stake accounts have no SPL mint (unlike JupSOL)
};

/** Evidence is fresh only within this window. */
export const NATIVE_STAKING_EVIDENCE_MAX_AGE_HOURS = 24;

export type NativeSolStakeEvidenceCategory =
  | "delegated_stake_or_tvl"
  | "current_apy"
  | "apy_30d"
  | "withdrawal_mechanics"
  | "unstake_time"
  | "validator_commission"
  | "annual_management_fee"
  | "security_model"
  | "operational_risk"
  | "incident_review";

export type NativeSolStakeEvidenceStatus = "accepted" | "rejected" | "stale" | "incomplete" | "invalid_category";
export type NativeSolStakeEvidenceUnit = "usd" | "sol" | "pct" | "hours" | "text" | "boolean";
export type NativeSolStakeReviewerRole = "founder" | "product" | "risk" | "engineering" | "compliance";

export interface NativeSolStakeEvidenceInput {
  protocolId: "jupiter_native_stake";
  protocolName: "Jupiter Native Stake";
  assetSymbol: "SOL";
  candidateType: "native_staking";
  category: NativeSolStakeEvidenceCategory;
  value: number | string | boolean;
  unit: NativeSolStakeEvidenceUnit;
  sourceName: string;
  sourceUrl: string;
  confirmedAt: string;
  confirmedBy: string;
  reviewerRole: NativeSolStakeReviewerRole;
  notes: string[];
}

export interface NativeSolStakeEvidenceRecord {
  protocolId: "jupiter_native_stake";
  category: NativeSolStakeEvidenceCategory;
  status: NativeSolStakeEvidenceStatus;
  value?: number | string | boolean;
  unit?: NativeSolStakeEvidenceUnit;
  sourceName?: string;
  sourceUrl?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  reviewerRole?: NativeSolStakeReviewerRole;
  notes: string[];
  blockers: string[];
}

export interface NativeSolStakeEvidenceSummary {
  protocolId: "jupiter_native_stake";
  protocolName: "Jupiter Native Stake";
  assetSymbol: "SOL";
  candidateType: "native_staking";
  isLiquidStakingToken: false;
  records: NativeSolStakeEvidenceRecord[];
  acceptedCount: number;
  staleCount: number;
  incompleteCount: number;
  missingCategories: NativeSolStakeEvidenceCategory[];
  marketDataComplete: boolean;
  mechanicsComplete: boolean;
  evidenceComplete: boolean;
  allEvidenceFresh: boolean;
  readyForRiskGate: boolean;
  blockers: string[];
}

/* ------------------------------------------------------------------ *
 * Category groupings.
 * ------------------------------------------------------------------ */
const MARKET_CATEGORIES: NativeSolStakeEvidenceCategory[] = ["delegated_stake_or_tvl", "current_apy", "apy_30d"];
const MECHANICS_CATEGORIES: NativeSolStakeEvidenceCategory[] = ["withdrawal_mechanics", "unstake_time", "validator_commission", "annual_management_fee"];
const EVIDENCE_CATEGORIES: NativeSolStakeEvidenceCategory[] = ["security_model", "operational_risk", "incident_review"];
const ALL_CATEGORIES: NativeSolStakeEvidenceCategory[] = [...MARKET_CATEGORIES, ...MECHANICS_CATEGORIES, ...EVIDENCE_CATEGORIES];
// Numeric categories require a number value; text categories require non-empty text.
// `unstake_time` is DUAL-format (number+hours OR sourced epoch text) so no fixed hours
// are invented for an epoch-based unstake.
const NUMERIC_CATEGORIES: NativeSolStakeEvidenceCategory[] = ["delegated_stake_or_tvl", "current_apy", "apy_30d", "validator_commission", "annual_management_fee"];

/* ------------------------------------------------------------------ *
 * Validation (mirrors the LST intake: complete + fresh, text-timing allowed).
 * ------------------------------------------------------------------ */
function evaluateInput(input: NativeSolStakeEvidenceInput, checkedAt?: string): { status: NativeSolStakeEvidenceStatus; blockers: string[] } {
  if (!ALL_CATEGORIES.includes(input.category)) return { status: "invalid_category", blockers: ["invalid_category"] };

  const blockers: string[] = [];
  const isNumeric = NUMERIC_CATEGORIES.includes(input.category);
  const isUnstakeTime = input.category === "unstake_time";
  const valueMissing = input.value === undefined || input.value === null || (typeof input.value === "string" && input.value.trim() === "");
  if (valueMissing) {
    blockers.push("missing_value");
  } else if (isUnstakeTime) {
    // Dual-format: numeric hours (number + "hours") OR sourced epoch text (string + "text").
    const okHours = typeof input.value === "number" && input.unit === "hours";
    const okText = typeof input.value === "string" && input.unit === "text";
    if (!okHours && !okText) blockers.push("invalid_value_type");
  } else if ((isNumeric && typeof input.value !== "number") || (!isNumeric && typeof input.value !== "string")) {
    blockers.push("invalid_value_type");
  }
  if (!input.sourceName || input.sourceName.trim() === "") blockers.push("missing_source_name");
  if (!input.sourceUrl || input.sourceUrl.trim() === "") blockers.push("missing_source_url");
  const confirmedTime = input.confirmedAt ? Date.parse(input.confirmedAt) : NaN;
  if (!input.confirmedAt || Number.isNaN(confirmedTime)) blockers.push("missing_confirmed_at");
  if (!input.confirmedBy || input.confirmedBy.trim() === "") blockers.push("missing_confirmed_by");
  if (!input.reviewerRole) blockers.push("missing_reviewer_role");

  if (blockers.includes("invalid_value_type")) return { status: "rejected", blockers };
  if (blockers.length > 0) return { status: "incomplete", blockers };

  const evalTime = checkedAt ? Date.parse(checkedAt) : Date.now();
  const ageMs = evalTime - confirmedTime;
  if (Number.isNaN(evalTime) || ageMs < 0 || ageMs > NATIVE_STAKING_EVIDENCE_MAX_AGE_HOURS * 60 * 60 * 1000) {
    return { status: "stale", blockers: ["stale_evidence"] };
  }
  return { status: "accepted", blockers: [] };
}

/** Validate one native-staking evidence input (never approves/scores). */
export function validateNativeSolStakeEvidenceInput(input: NativeSolStakeEvidenceInput, checkedAt?: string): NativeSolStakeEvidenceStatus {
  return evaluateInput(input, checkedAt).status;
}

/** Convert one input into a validated record (adds blockers). */
export function createNativeSolStakeEvidenceRecord(input: NativeSolStakeEvidenceInput, checkedAt?: string): NativeSolStakeEvidenceRecord {
  const { status, blockers } = evaluateInput(input, checkedAt);
  return {
    protocolId: input.protocolId,
    category: input.category,
    status,
    ...(input.value !== undefined ? { value: input.value } : {}),
    ...(input.unit ? { unit: input.unit } : {}),
    ...(input.sourceName ? { sourceName: input.sourceName } : {}),
    ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
    ...(input.confirmedAt ? { confirmedAt: input.confirmedAt } : {}),
    ...(input.confirmedBy ? { confirmedBy: input.confirmedBy } : {}),
    ...(input.reviewerRole ? { reviewerRole: input.reviewerRole } : {}),
    notes: input.notes ?? [],
    blockers,
  };
}

const CONFIRMED_AT = "2026-07-14T02:45:00Z";
const COMMON = {
  protocolId: "jupiter_native_stake" as const,
  protocolName: "Jupiter Native Stake" as const,
  assetSymbol: "SOL" as const,
  candidateType: "native_staking" as const,
  confirmedAt: CONFIRMED_AT,
  confirmedBy: "Ashot",
  reviewerRole: "founder" as const,
};

/* ------------------------------------------------------------------ *
 * Fresh evidence inputs.
 *
 * 7 of 10 categories are recorded from authoritative public sources. The 3 MARKET
 * categories (delegated_stake_or_tvl, current_apy, apy_30d) are intentionally OMITTED:
 * Jupiter's docs do not publish an exact native-staking APY / 30-day APY / delegated
 * stake, and the validator stats page is JS-rendered (not reliably verifiable). They are
 * left MISSING rather than invented or reused from JupSOL — so the baseline stays blocked.
 * ------------------------------------------------------------------ */
export const NATIVE_SOL_STAKE_EVIDENCE_INPUTS: NativeSolStakeEvidenceInput[] = [
  {
    ...COMMON,
    category: "withdrawal_mechanics",
    value: "Native staking with the Jupiter validator: you stake SOL directly on-chain from your own wallet into a native Solana stake account that YOU own (non-custodial). To exit, you deactivate the stake account; it becomes withdrawable at the end of the current epoch. There is no LST token — this is delegated SOL, not a liquid staking token, so there is no instant-swap liquidity path like an LST.",
    unit: "text",
    sourceName: "Jupiter Documentation — Stake SOL FAQ (native staking)",
    sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/faq.md",
    notes: ["Native stake-account withdrawal mechanism per Jupiter FAQ (deactivate → withdraw at epoch end). NOT the JupSOL LST swap/unstake path."],
  },
  {
    ...COMMON,
    category: "unstake_time",
    value: "Epoch-based: when you deactivate your native stake, it becomes available for withdrawal at the end of the current epoch (up to ~2 days). During deactivation your SOL does not earn rewards. Recorded as sourced epoch text (no fixed hours invented).",
    unit: "text",
    sourceName: "Jupiter Documentation — Stake SOL FAQ (native staking)",
    sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/faq.md",
    notes: ["Epoch-based deactivation timing (~2 days / end of epoch) per Jupiter FAQ, consistent with Solana native stake-account deactivation. Text format; no fixed-hour conversion claimed."],
  },
  {
    ...COMMON,
    category: "validator_commission",
    value: 5,
    unit: "pct",
    sourceName: "Jupiter Documentation — Stake SOL FAQ (native staking)",
    sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/faq.md",
    notes: ["Jupiter validator charges 5% commission on inflation rewards and 0% on MEV for native staking (authoritative Jupiter FAQ). NOTE: a public search snippet claimed '0% commission'; the authoritative docs (5% inflation / 0% MEV) resolve that conflict and are recorded here."],
  },
  {
    ...COMMON,
    category: "annual_management_fee",
    value: 0,
    unit: "pct",
    sourceName: "Jupiter Documentation — Stake SOL FAQ (native staking)",
    sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/faq.md",
    notes: ["Native staking has no LST/pool management or performance fee — you own the stake account directly. The validator's take is the 5% inflation commission (recorded under validator_commission), not a separate management fee."],
  },
  {
    ...COMMON,
    category: "security_model",
    value: "Non-custodial native staking: all actions are executed on-chain directly from your wallet and Jupiter does not take custody of your SOL. You hold a native Solana stake account (NOT an SPL liquid-staking token like JupSOL). Security rests on the Solana stake program (the base protocol) rather than on an LST smart-contract wrapper, so there is no LST token-contract exploit surface.",
    unit: "text",
    sourceName: "Jupiter Documentation — Stake SOL FAQ (native staking)",
    sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/faq.md",
    notes: ["Non-custodial + native-stake-account model per Jupiter FAQ; explicitly distinct from the JupSOL LST token. Descriptive; not a safety claim."],
  },
  {
    ...COMMON,
    category: "operational_risk",
    value: "Operational tradeoffs of native staking vs LSTs: (a) validator/delegation exposure — stake is delegated to a single validator (the Jupiter validator), so validator performance, downtime, or a future commission change affects rewards; (b) epoch-based lockup — exiting requires deactivation and waiting until epoch end (no instant liquidity), and no rewards accrue during deactivation; (c) lower DeFi composability than LSTs — a native stake account is not a liquid token (though Jupiter Lend now allows native stake as collateral); (d) it is NOT an LST, so it has no LST liquidity token and cannot be swapped instantly.",
    unit: "text",
    sourceName: "Jupiter Documentation — Stake SOL (native staking) / Solana stake accounts",
    sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/faq.md",
    notes: ["Sourced summary of native-staking operational tradeoffs (single-validator delegation, epoch lockup, lower composability, not an LST). Descriptive only — not an endorsement or safety claim."],
  },
  {
    ...COMMON,
    category: "incident_review",
    value: "Point-in-time review (2026-07-14): native SOL staking uses the base Solana staking program rather than an LST smart contract, so it does not carry LST token-contract exploit risk; Solana also currently has no stake slashing. No independent Jupiter-validator native-staking incident or postmortem was found during this review window. This is a point-in-time finding, NOT a verified clean-history claim, and it does not remove validator-performance or protocol-level risk.",
    unit: "text",
    sourceName: "Jupiter Documentation / Solana staking model",
    sourceUrl: "https://docs.jup.ag/user-docs/earn/stake-sol/faq.md",
    notes: ["Point-in-time finding, NOT a clean-history claim. No independent incident obtained; native staking relies on the base Solana staking program."],
  },
];

export interface NativeStakingEvidenceOptions {
  checkedAt?: string;
}

/** The recorded inputs run through validation (adds status + blockers). */
export function getNativeSolStakeEvidenceRecords(options: NativeStakingEvidenceOptions = {}): NativeSolStakeEvidenceRecord[] {
  return NATIVE_SOL_STAKE_EVIDENCE_INPUTS.map((input) => createNativeSolStakeEvidenceRecord(input, options.checkedAt));
}

/**
 * Summarize native-staking evidence. `readyForRiskGate` is true only when ALL 10
 * categories are accepted and fresh. In 14P the three market categories are missing, so
 * `marketDataComplete` is false and the baseline stays blocked (not ready).
 */
export function summarizeNativeSolStakeEvidence(options: NativeStakingEvidenceOptions = {}): NativeSolStakeEvidenceSummary {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const records = getNativeSolStakeEvidenceRecords({ checkedAt });
  const acceptedCats = new Set(records.filter((r) => r.status === "accepted").map((r) => r.category));
  const present = new Set(records.map((r) => r.category));
  const complete = (cats: NativeSolStakeEvidenceCategory[]) => cats.every((c) => acceptedCats.has(c));

  const marketDataComplete = complete(MARKET_CATEGORIES);
  const mechanicsComplete = complete(MECHANICS_CATEGORIES);
  const evidenceComplete = complete(EVIDENCE_CATEGORIES);

  const staleCount = records.filter((r) => r.status === "stale").length;
  const incompleteCount = records.filter((r) => r.status === "incomplete" || r.status === "rejected" || r.status === "invalid_category").length;
  const acceptedCount = records.filter((r) => r.status === "accepted").length;
  const missingCategories = ALL_CATEGORIES.filter((c) => !present.has(c));

  const allRequiredAccepted = marketDataComplete && mechanicsComplete && evidenceComplete;
  const allEvidenceFresh = allRequiredAccepted && staleCount === 0 && incompleteCount === 0;
  const readyForRiskGate = allRequiredAccepted && allEvidenceFresh;

  const blockers: string[] = [];
  if (!marketDataComplete) blockers.push("market_data_incomplete");
  if (!mechanicsComplete) blockers.push("mechanics_incomplete");
  if (!evidenceComplete) blockers.push("evidence_incomplete");
  if (staleCount > 0) blockers.push("stale_evidence");
  if (incompleteCount > 0) blockers.push("incomplete_records");
  if (missingCategories.length > 0) blockers.push("missing_categories");

  return {
    protocolId: "jupiter_native_stake",
    protocolName: "Jupiter Native Stake",
    assetSymbol: "SOL",
    candidateType: "native_staking",
    isLiquidStakingToken: false,
    records,
    acceptedCount,
    staleCount,
    incompleteCount,
    missingCategories,
    marketDataComplete,
    mechanicsComplete,
    evidenceComplete,
    allEvidenceFresh,
    readyForRiskGate,
    blockers,
  };
}

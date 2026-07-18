/**
 * token2022PositionAssessment — Step 17E. PURE, read-only classification of Token-2022 (Token Extensions)
 * wallet positions into an economically honest five-way balance split, so a nominal account balance is
 * NEVER assumed to be fully transferable or Safety-Buffer-liquid merely because it is positive.
 *
 * FIVE DISTINCT QUANTITIES (never conflated):
 *   nominalRaw      — the raw owned account balance (Account.amount).
 *   recognizedRaw   — economic ownership we can value (== nominal for observable public balances).
 *   transferableRaw — the amount the owner can move NOW, source-backed (net of a deterministic fee).
 *   unavailableRaw  — frozen / non-transferable / paused (definitely cannot move now).
 *   withheldRaw     — authority-controlled withheld transfer fees (TransferFeeAmount) — NOT the user's.
 *   unresolvedRaw   — transferability cannot be safely established read-only (hook / confidential /
 *                     unsupported extension / unread pause / stale). null ≠ 0: unresolved is never zero.
 *
 * FAIL-CLOSED. An extension is blocking/unresolved only from source-backed semantics (installed
 * @solana/spl-token 0.4.14), never from its name; an unknown extension fails closed to unresolved rather
 * than being assumed harmless; a hook/confidential/unread-pause makes transferable NULL, never a favorable
 * guess. Restricted/unresolved balances stay VISIBLE and are never valued at zero or removed. Classic SPL
 * (TOKEN_PROGRAM_ID) positions are out of scope here and unchanged.
 *
 * The DECODING (unpackMint / unpackAccount / getExtensionTypes / getTransferFeeConfig / getTransferFeeAmount
 * / getPausableConfig / getTransferHook) happens once per refresh in the mount (useWalletPortfolio); this
 * module consumes the decoded FACTS. The numeric extension ids + the fee formula are bound to the installed
 * library in fixtures (see runToken2022*FixtureChecks), so they are source-backed, not remembered.
 */
import type { WalletPosition } from "./walletPosition";

export const TOKEN_2022_ASSESSMENT_VERSION = "1.0.0" as const;
export const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" as const;
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" as const;

/** Installed @solana/spl-token 0.4.14 ExtensionType numeric ids (bound to the enum in fixtures). */
export const EXT = {
  Uninitialized: 0, TransferFeeConfig: 1, TransferFeeAmount: 2, MintCloseAuthority: 3,
  ConfidentialTransferMint: 4, ConfidentialTransferAccount: 5, DefaultAccountState: 6, ImmutableOwner: 7,
  MemoTransfer: 8, NonTransferable: 9, InterestBearingConfig: 10, CpiGuard: 11, PermanentDelegate: 12,
  NonTransferableAccount: 13, TransferHook: 14, TransferHookAccount: 15, MetadataPointer: 18,
  TokenMetadata: 19, GroupPointer: 20, TokenGroup: 21, GroupMemberPointer: 22, TokenGroupMember: 23,
  ScaledUiAmountConfig: 25, PausableConfig: 26, PausableAccount: 27,
} as const;

/** Installed AccountState (state/account.ts): Uninitialized=0, Initialized=1, Frozen=2. */
export const ACCOUNT_STATE = { Uninitialized: 0, Initialized: 1, Frozen: 2 } as const;

export type ExtensionImpact =
  | "no_liquidity_effect"
  | "deterministic_reduction"
  | "explicitly_unavailable"
  | "conditional_resolvable"
  | "unresolved_without_tx_context"
  | "unsupported_by_decoder";

/**
 * §2 — source-backed extension → impact matrix (installed spl-token 0.4.14). Each entry records the
 * effect on the OWNER's current transferability, with the source-backed reason. Extensions absent from
 * this matrix fail closed to `unsupported_by_decoder`.
 */
export const EXTENSION_IMPACT_MATRIX: Record<number, { name: string; scope: "mint" | "account"; impact: ExtensionImpact; note: string }> = {
  [EXT.TransferFeeConfig]: { name: "TransferFeeConfig", scope: "mint", impact: "deterministic_reduction", note: "Outgoing transfers pay a fee; net transferable = amount − calculateEpochFee (ceil, capped at maximumFee). Deterministic from current-epoch config." },
  [EXT.TransferFeeAmount]: { name: "TransferFeeAmount", scope: "account", impact: "deterministic_reduction", note: "Account-level withheldAmount is authority-claimable fee held in this account — NOT owner-transferable; reported in withheldRaw, excluded from nominal/transferable." },
  [EXT.MintCloseAuthority]: { name: "MintCloseAuthority", scope: "mint", impact: "no_liquidity_effect", note: "Can close the mint account; does not reduce an existing holder's current transferable balance." },
  [EXT.ConfidentialTransferMint]: { name: "ConfidentialTransferMint", scope: "mint", impact: "no_liquidity_effect", note: "Mint enabling confidential transfers does not by itself lock the public balance; account-level ConfidentialTransferAccount is where a balance becomes unobservable." },
  [EXT.ConfidentialTransferAccount]: { name: "ConfidentialTransferAccount", scope: "account", impact: "unresolved_without_tx_context", note: "The account can hold a confidential (ciphertext) balance not observable read-only; spendable amount cannot be proven → transferable null. Do not fabricate a public balance." },
  [EXT.DefaultAccountState]: { name: "DefaultAccountState", scope: "mint", impact: "conditional_resolvable", note: "Sets the state NEW accounts open in; the ACTUAL decoded account.state is authoritative for an existing account, so no independent effect here." },
  [EXT.ImmutableOwner]: { name: "ImmutableOwner", scope: "account", impact: "no_liquidity_effect", note: "Owner cannot change; transfers unaffected." },
  [EXT.MemoTransfer]: { name: "MemoTransfer", scope: "account", impact: "no_liquidity_effect", note: "Requires an INCOMING memo on this account; does not prevent the owner authorizing an OUTGOING wallet transfer (§11)." },
  [EXT.NonTransferable]: { name: "NonTransferable", scope: "mint", impact: "explicitly_unavailable", note: "Mint-level non-transferable: the token cannot be transferred at all → transferable 0, whole balance unavailable." },
  [EXT.InterestBearingConfig]: { name: "InterestBearingConfig", scope: "mint", impact: "no_liquidity_effect", note: "Affects displayed UI amount / valuation scaling only, not raw transferability. Raw units are transfer authority (§14)." },
  [EXT.CpiGuard]: { name: "CpiGuard", scope: "account", impact: "no_liquidity_effect", note: "Restricts certain CPI actions; does not prevent a direct owner-authorized wallet transfer (§11)." },
  [EXT.PermanentDelegate]: { name: "PermanentDelegate", scope: "mint", impact: "no_liquidity_effect", note: "A permanent delegate is a CONTROL risk (can move tokens) but does not reduce the owner's own current transferable balance (§12). Recorded as authority metadata, not a balance restriction." },
  [EXT.NonTransferableAccount]: { name: "NonTransferableAccount", scope: "account", impact: "explicitly_unavailable", note: "Account marker for a non-transferable mint → transferable 0." },
  [EXT.TransferHook]: { name: "TransferHook", scope: "mint", impact: "unresolved_without_tx_context", note: "A hook program may permit/reject/condition transfers on hook logic + extra accounts; not evaluable read-only → transferable null (hook_unresolved). Existence ≠ blocked, but also ≠ liquid (§10)." },
  [EXT.TransferHookAccount]: { name: "TransferHookAccount", scope: "account", impact: "unresolved_without_tx_context", note: "Account marker paired with a mint transfer hook; transferability follows the mint hook resolution." },
  [EXT.MetadataPointer]: { name: "MetadataPointer", scope: "mint", impact: "no_liquidity_effect", note: "Metadata location only." },
  [EXT.TokenMetadata]: { name: "TokenMetadata", scope: "mint", impact: "no_liquidity_effect", note: "On-mint metadata; no transfer effect." },
  [EXT.GroupPointer]: { name: "GroupPointer", scope: "mint", impact: "no_liquidity_effect", note: "Group metadata pointer." },
  [EXT.TokenGroup]: { name: "TokenGroup", scope: "mint", impact: "no_liquidity_effect", note: "Group metadata." },
  [EXT.GroupMemberPointer]: { name: "GroupMemberPointer", scope: "mint", impact: "no_liquidity_effect", note: "Group-member metadata pointer." },
  [EXT.TokenGroupMember]: { name: "TokenGroupMember", scope: "mint", impact: "no_liquidity_effect", note: "Group-member metadata." },
  [EXT.ScaledUiAmountConfig]: { name: "ScaledUiAmountConfig", scope: "mint", impact: "no_liquidity_effect", note: "Scales the DISPLAYED amount; raw units remain the transfer authority (§14). Do not use UI-scaled amount as transfer authority." },
  [EXT.PausableConfig]: { name: "PausableConfig", scope: "mint", impact: "conditional_resolvable", note: "If paused==true, transfers are blocked → unavailable; if paused==false, no effect; if the flag cannot be read → unresolved." },
  [EXT.PausableAccount]: { name: "PausableAccount", scope: "account", impact: "conditional_resolvable", note: "Account marker for a pausable mint; actual pause is the mint-level PausableConfig.paused flag." },
};

export function classifyExtension(id: number): { impact: ExtensionImpact; name: string } {
  const m = EXTENSION_IMPACT_MATRIX[id];
  return m ? { impact: m.impact, name: m.name } : { impact: "unsupported_by_decoder", name: `unknown_${id}` };
}

/* ------------------------------------------------------------------ *
 * Transfer-fee math — mirrors installed calculateFee (bound for equivalence in fixtures).
 *   fee = min( ceil(amount × bps / 10000), maximumFee ); bps==0 or amount==0 ⇒ 0.
 * ------------------------------------------------------------------ */
const ONE_IN_BASIS_POINTS = 10000n;
export function calculateTransferFeeRaw(amountRaw: bigint, bps: number, maximumFeeRaw: bigint): bigint {
  if (bps === 0 || amountRaw === 0n) return 0n;
  const numerator = amountRaw * BigInt(bps);
  const rawFee = (numerator + ONE_IN_BASIS_POINTS - 1n) / ONE_IN_BASIS_POINTS; // ceil
  return rawFee > maximumFeeRaw ? maximumFeeRaw : rawFee;
}

/* ------------------------------------------------------------------ *
 * Decoded-fact inputs (produced by the mount from installed primitives)
 * ------------------------------------------------------------------ */
export interface Token2022MintFacts {
  mint: string;
  mintOwnerProgram: string;              // must equal TOKEN_2022_PROGRAM_ID
  mintExtensionTypes: number[];
  nonTransferable: boolean;
  /** PausableConfig.paused; null = pausable present but flag unread. undefined = not pausable. */
  paused?: boolean | null;
  hasTransferHook: boolean;
  hasConfidentialMint: boolean;
  /** Current-epoch transfer fee, resolved by the mount via getEpochFee, or null = no fee config. */
  transferFee: { currentBps: number; currentMaxFeeRaw: string } | null;
  /** True when a fee config exists but the current-epoch fee could not be resolved. */
  transferFeeUnresolved?: boolean;
  fresh: boolean;
  sourceSlot: number;
}

export interface Token2022AccountFacts {
  address: string;
  mint: string;
  owner: string;
  ownerProgram: string;                  // must equal TOKEN_2022_PROGRAM_ID
  amountRaw: string;                     // Account.amount
  accountState: number | null;           // AccountState (0/1/2) or null=unresolved
  isClosed?: boolean;
  accountExtensionTypes: number[];
  withheldRaw?: string | null;           // TransferFeeAmount.withheldAmount
  fresh: boolean;
  sourceSlot: number;
}

export type TransferabilityState =
  | "fully_transferable" | "transferable_with_deterministic_fee" | "partially_transferable"
  | "frozen" | "non_transferable" | "paused" | "hook_unresolved" | "confidential_unresolved"
  | "extension_unsupported" | "stale" | "unresolved";

export type FeeState = "none" | "deterministic" | "unresolved";

export interface Token2022AccountAssessment {
  address: string;
  include: boolean;                      // false = skip (closed/zero/foreign/wrong-program)
  nominalRaw: string;
  transferableRaw: string | null;        // null = unresolved (never 0-as-fact)
  unavailableRaw: string;
  withheldRaw: string;
  unresolvedRaw: string;
  transferabilityState: TransferabilityState;
  feeState: FeeState;
  estimatedTransferFeeRaw: string | null;
  restrictionReasons: string[];
}

const big = (s: string | null | undefined): bigint | null => { if (s === null || s === undefined) return null; if (!/^[0-9]+$/.test(s)) return null; try { return BigInt(s); } catch { return null; } };

/** Detect any account/mint extension id not in the impact matrix (fail-closed trigger). */
function unsupportedExtensions(ids: number[]): number[] {
  return ids.filter((id) => id !== EXT.Uninitialized && !(id in EXTENSION_IMPACT_MATRIX));
}

/**
 * Assess ONE Token-2022 account against its mint facts. Precedence (fail-closed): wrong program/owner or
 * closed/zero → skip; malformed/stale → unresolved; unsupported extension → unresolved; mint
 * non-transferable → unavailable; account frozen → unavailable; mint paused==true → unavailable;
 * pause unread / hook / confidential → unresolved (null); transfer fee → deterministic net; else full.
 */
export function assessToken2022Account(acc: Token2022AccountFacts, mint: Token2022MintFacts): Token2022AccountAssessment {
  const reasons: string[] = [];
  const withheld = big(acc.withheldRaw) ?? 0n;
  const skip = (): Token2022AccountAssessment => ({ address: acc.address, include: false, nominalRaw: "0", transferableRaw: "0", unavailableRaw: "0", withheldRaw: "0", unresolvedRaw: "0", transferabilityState: "unresolved", feeState: "none", estimatedTransferFeeRaw: null, restrictionReasons: [] });

  if (acc.ownerProgram !== TOKEN_2022_PROGRAM_ID) return skip();
  if (acc.isClosed === true) return skip();
  if (acc.accountState === ACCOUNT_STATE.Uninitialized) return skip();
  const nominal = big(acc.amountRaw);
  const mk = (state: TransferabilityState, transferable: bigint | null, unavailable: bigint, unresolved: bigint, feeState: FeeState, fee: bigint | null): Token2022AccountAssessment => ({
    address: acc.address, include: true, nominalRaw: (nominal ?? 0n).toString(),
    transferableRaw: transferable === null ? null : transferable.toString(),
    unavailableRaw: unavailable.toString(), withheldRaw: withheld.toString(), unresolvedRaw: unresolved.toString(),
    transferabilityState: state, feeState, estimatedTransferFeeRaw: fee === null ? null : fee.toString(), restrictionReasons: reasons,
  });

  if (nominal === null) { reasons.push("malformed account amount"); return mk("unresolved", null, 0n, 0n, "none", null); }
  if (nominal === 0n && withheld === 0n) return skip();

  // Freshness first — stale state cannot be trusted.
  if (!acc.fresh || !mint.fresh) { reasons.push("account/mint state stale"); return mk("stale", null, 0n, nominal, "none", null); }
  if (acc.accountState === null) { reasons.push("account state unresolved"); return mk("unresolved", null, 0n, nominal, "none", null); }

  // Unsupported extension (either scope) → fail closed.
  const unsupported = [...unsupportedExtensions(acc.accountExtensionTypes), ...unsupportedExtensions(mint.mintExtensionTypes)];
  if (unsupported.length > 0) { reasons.push(`unsupported extension(s): ${unsupported.join(",")}`); return mk("extension_unsupported", null, 0n, nominal, "none", null); }

  // Definite-unavailable (0), most restrictive first.
  if (mint.nonTransferable || acc.accountExtensionTypes.includes(EXT.NonTransferableAccount)) { reasons.push("non-transferable mint"); return mk("non_transferable", 0n, nominal, 0n, "none", null); }
  if (acc.accountState === ACCOUNT_STATE.Frozen) { reasons.push("account frozen"); return mk("frozen", 0n, nominal, 0n, "none", null); }
  if (mint.paused === true) { reasons.push("mint transfers paused"); return mk("paused", 0n, nominal, 0n, "none", null); }

  // Unresolved (null) — cannot be proven read-only.
  if (mint.paused === null) { reasons.push("pause state unresolved"); return mk("unresolved", null, 0n, nominal, "none", null); }
  if (mint.hasTransferHook || acc.accountExtensionTypes.includes(EXT.TransferHookAccount)) { reasons.push("transfer hook not evaluable read-only"); return mk("hook_unresolved", null, 0n, nominal, "none", null); }
  if (mint.hasConfidentialMint && acc.accountExtensionTypes.includes(EXT.ConfidentialTransferAccount)) { reasons.push("confidential balance not observable"); return mk("confidential_unresolved", null, 0n, nominal, "none", null); }

  // Deterministic transfer fee.
  if (mint.transferFee !== null) {
    if (mint.transferFeeUnresolved) { reasons.push("transfer fee config unresolved for current epoch"); return mk("unresolved", null, 0n, nominal, "unresolved", null); }
    const maxFee = big(mint.transferFee.currentMaxFeeRaw) ?? 0n;
    const fee = calculateTransferFeeRaw(nominal, mint.transferFee.currentBps, maxFee);
    if (fee === 0n) return mk("fully_transferable", nominal, 0n, 0n, mint.transferFee.currentBps === 0 ? "none" : "deterministic", 0n);
    const net = nominal - fee; // fee ≤ nominal by construction (bps≤10000, or capped) ⇒ net ≥ 0
    reasons.push("transfer fee applies");
    return mk("transferable_with_deterministic_fee", net < 0n ? 0n : net, 0n, 0n, "deterministic", fee);
  }

  // Fully transferable.
  return mk("fully_transferable", nominal, 0n, 0n, "none", 0n);
}

/* ------------------------------------------------------------------ *
 * §15 — aggregate all accounts of ONE mint into a canonical position
 * ------------------------------------------------------------------ */
export interface Token2022PositionResult {
  mint: string;
  tokenProgram: string;
  positionExists: boolean;
  nominalRaw: string;
  recognizedRaw: string;
  transferableRaw: string | null;
  unavailableRaw: string;
  withheldRaw: string;
  unresolvedRaw: string;
  transferabilityState: TransferabilityState;
  feeState: FeeState;
  estimatedTransferFeeRaw: string | null;
  mintExtensionTypes: number[];
  accountExtensionTypes: number[];
  restrictionReasons: string[];
  freshness: "fresh" | "stale" | "unresolved";
  sourceSlot: number;
  perAccount: Token2022AccountAssessment[];
}

export function assessToken2022Position(accounts: Token2022AccountFacts[], mint: Token2022MintFacts): Token2022PositionResult {
  const per = accounts.filter((a) => a.mint === mint.mint).map((a) => assessToken2022Account(a, mint));
  const live = per.filter((a) => a.include);
  let nominal = 0n, transferable = 0n, unavailable = 0n, withheld = 0n, unresolved = 0n, fee = 0n;
  let anyTransferableUnresolved = false, anyFee = false, anyResolvedTransferable = false;
  const reasons = new Set<string>();
  const accExt = new Set<number>();
  for (const a of live) {
    nominal += big(a.nominalRaw) ?? 0n;
    withheld += big(a.withheldRaw) ?? 0n;
    if (a.transferableRaw === null) { anyTransferableUnresolved = true; unresolved += big(a.unresolvedRaw) ?? 0n; }
    else { const t = big(a.transferableRaw) ?? 0n; transferable += t; if (t > 0n) anyResolvedTransferable = true; unavailable += big(a.unavailableRaw) ?? 0n; }
    if (a.estimatedTransferFeeRaw) { const f = big(a.estimatedTransferFeeRaw); if (f) fee += f; }
    if (a.feeState === "deterministic") anyFee = true;
    a.restrictionReasons.forEach((r) => reasons.add(r));
  }
  for (const a of accounts) if (a.mint === mint.mint) a.accountExtensionTypes.forEach((e) => accExt.add(e));

  // Aggregate transferability state from the buckets.
  const hasUnavailable = unavailable > 0n || live.some((a) => a.unavailableRaw !== "0");
  let state: TransferabilityState;
  if (live.length === 0) state = "unresolved";
  else if (anyTransferableUnresolved && anyResolvedTransferable) state = "partially_transferable";
  else if (anyResolvedTransferable && hasUnavailable) state = "partially_transferable";
  else if (anyResolvedTransferable) state = anyFee ? "transferable_with_deterministic_fee" : "fully_transferable";
  else if (anyTransferableUnresolved && !hasUnavailable) {
    // pick the single dominant unresolved reason if uniform, else generic unresolved
    const states = new Set(live.filter((a) => a.transferableRaw === null).map((a) => a.transferabilityState));
    state = states.size === 1 ? [...states][0] : "unresolved";
  } else {
    // all unavailable
    const states = new Set(live.map((a) => a.transferabilityState));
    state = states.size === 1 ? [...states][0] : "unresolved";
  }

  const freshness: Token2022PositionResult["freshness"] = !mint.fresh || accounts.some((a) => a.mint === mint.mint && !a.fresh) ? "stale" : "fresh";
  return {
    mint: mint.mint, tokenProgram: TOKEN_2022_PROGRAM_ID, positionExists: live.length > 0,
    nominalRaw: nominal.toString(), recognizedRaw: nominal.toString(),
    transferableRaw: anyTransferableUnresolved && !anyResolvedTransferable ? null : transferable.toString(),
    unavailableRaw: unavailable.toString(), withheldRaw: withheld.toString(), unresolvedRaw: unresolved.toString(),
    transferabilityState: state, feeState: anyFee ? "deterministic" : "none",
    estimatedTransferFeeRaw: anyFee ? fee.toString() : null,
    mintExtensionTypes: mint.mintExtensionTypes, accountExtensionTypes: [...accExt],
    restrictionReasons: [...reasons], freshness, sourceSlot: mint.sourceSlot, perAccount: per,
  };
}

/* ------------------------------------------------------------------ *
 * §16/§18 — map onto the canonical WalletPosition (transferability drives withdrawalState + liquid USD)
 * ------------------------------------------------------------------ */
/** Map a transferability state to the canonical `withdrawalState` the Safety Buffer classifier reads. */
export function transferabilityToWithdrawalState(s: TransferabilityState): string {
  switch (s) {
    case "fully_transferable": return "fully_withdrawable";
    case "transferable_with_deterministic_fee": return "partially_withdrawable";
    case "partially_transferable": return "partially_withdrawable";
    case "frozen": return "currently_unavailable";
    case "non_transferable": return "currently_unavailable";
    case "paused": return "emergency_paused";
    default: return "unresolved"; // hook/confidential/unsupported/stale/unresolved
  }
}

const toTokens = (raw: bigint, dec: number): number => { const s = 10n ** BigInt(dec); return Number(raw / s) + Number(raw % s) / Number(s); };

/**
 * Enrich a base classic-shaped Token-2022 WalletPosition with the assessment. `priceUsd` (fresh exact-mint
 * price) applies recognized + verified-transferable USD; a stale/absent price leaves USD null. Never uses
 * a UI-scaled amount as transfer authority; recognized value stays visible independent of transferability.
 */
export function applyToken2022Assessment(base: WalletPosition, r: Token2022PositionResult, decimals: number, priceUsd: number | null, priceFresh: boolean): WalletPosition {
  const recognized = big(r.recognizedRaw);
  const transferable = big(r.transferableRaw);
  const priceOk = priceFresh && typeof priceUsd === "number" && priceUsd > 0;
  const recognizedAmt = recognized !== null ? toTokens(recognized, decimals) : null;
  const transferableAmt = transferable !== null ? toTokens(transferable, decimals) : null;
  return {
    ...base,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    nominalRaw: r.nominalRaw,
    recognizedRaw: r.recognizedRaw,
    transferableRaw: r.transferableRaw,
    unavailableRaw: r.unavailableRaw,
    withheldRaw: r.withheldRaw,
    unresolvedRaw: r.unresolvedRaw,
    transferabilityState: r.transferabilityState,
    restrictionReasons: r.restrictionReasons,
    withdrawalState: transferabilityToWithdrawalState(r.transferabilityState),
    recognizedValueUsd: priceOk && recognizedAmt !== null ? recognizedAmt * (priceUsd as number) : null,
    liquidValueUsd: priceOk && transferableAmt !== null ? transferableAmt * (priceUsd as number) : null,
    liquidUnderlyingAmount: transferableAmt ?? undefined,
    valueUsd: priceOk && recognizedAmt !== null ? recognizedAmt * (priceUsd as number) : base.valueUsd ?? null,
  };
}

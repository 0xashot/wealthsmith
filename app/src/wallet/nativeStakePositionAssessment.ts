/**
 * nativeStakePositionAssessment — Step 17F. PURE, read-only lifecycle + balance decomposition for a
 * native Solana stake account, so the portfolio never treats the whole account balance as active
 * delegated stake, nor deactivating/inactive/locked lamports as immediately withdrawable.
 *
 * SIX DISTINCT ECONOMIC QUANTITIES (never conflated):
 *   recognized total   — the full valid account lamports (counted ONCE in portfolio value).
 *   active delegated   — currently effective, yield-bearing stake.
 *   in transition      — activating (warming up) + deactivating (cooling down) — NOT liquid, NOT idle.
 *   inactive           — cooled-down / undelegated stake, potentially withdrawable.
 *   locked/unavailable — under an active lockup; recognized but not usable.
 *   unresolved         — lifecycle/decomposition that cannot be established → null, never 0-as-fact.
 *
 * SOURCE-BACKED. Lifecycle amounts come from the exact RPC `getStakeActivation` (active + inactive
 * lamports + state) — NOT from `activationEpoch <= currentEpoch`, which is wrong across multi-epoch
 * warmup/cooldown. The reconciliation invariant is `active + inactive == totalLamports − rentExemptReserve`
 * (the stake program computes activation over lamports above the rent reserve). When activation is absent
 * the account stays fully visible with lifecycle `unresolved` — active stake is NEVER invented. Ownership
 * is the authorized WITHDRAWER (economic owner); a differing staker does not remove ownership. Rent-exempt
 * reserve is recognized (it belongs to the account) but is close-only, never double-counted, never liquid
 * while the account is open. READ-ONLY: no transaction/instruction/signature is produced anywhere.
 */
import type { WalletPosition } from "./walletPosition";

export const NATIVE_STAKE_ASSESSMENT_VERSION = "1.0.0" as const;
export const STAKE_PROGRAM_ID = "Stake11111111111111111111111111111111111111" as const;
export const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111" as const;
/** Sentinel for "no deactivation" (u64::MAX) as the parsed RPC renders it. */
export const EPOCH_NEVER = "18446744073709551615" as const;

export type StakeLifecycleState =
  | "active" | "activating" | "deactivating" | "inactive" | "initialized_not_delegated" | "unresolved";
export type StakeLockupState =
  | "unlocked" | "locked_by_epoch" | "locked_by_timestamp" | "locked_by_both" | "custodian_override_required" | "stale" | "unresolved";
export type StakeControlState =
  | "wallet_controls_both" | "wallet_controls_withdrawal" | "wallet_controls_staking_only"
  | "wallet_is_custodian" | "control_shared_or_different" | "unresolved";
/** Step 17F.1 — exact current withdrawal capacity (per the deployed Stake Program withdraw rule). */
export type WithdrawalCapacityState =
  | "partially_withdrawable" | "fully_withdrawable" | "close_only" | "currently_unavailable"
  | "locked" | "stale" | "unresolved";

/** Exact getStakeActivation result (installed web3.js 1.98.4): state + active/inactive lamports. */
export interface StakeActivationFacts {
  state: "active" | "inactive" | "activating" | "deactivating";
  activeLamports: number;
  inactiveLamports: number;
}

export interface NativeStakeFacts {
  stakeAccount: string;
  wallet: string;
  ownerProgram: string;                 // must equal STAKE_PROGRAM_ID
  accountType: "delegated" | "initialized" | "uninitialized" | "rewardsPool" | null;
  totalLamports: number | null;
  rentExemptReserveLamports: number | null;
  authorizedStaker: string | null;
  authorizedWithdrawer: string | null;
  lockup: { unixTimestamp: number | null; epoch: number | null; custodian: string | null } | null;
  delegation: { voter: string | null; stakeLamports: number | null; activationEpoch: string | null; deactivationEpoch: string | null } | null;
  currentEpoch: number | null;
  currentUnixTime: number | null;       // seconds
  activation: StakeActivationFacts | null;
  validatorStatus?: { delinquent: boolean | null } | null;
  apy: number | null;
  apyFresh: boolean;
  observedAt: string;
  sourceSlot: number;
  fresh: boolean;
}

export interface NativeStakePositionResult {
  stakeAccount: string;
  wallet: string;
  voteAccount: string | null;
  owned: boolean;
  positionExists: boolean;
  totalLamports: number;
  delegatedLamports: number;
  activeLamports: number | null;
  activatingLamports: number | null;
  deactivatingLamports: number | null;
  inactiveLamports: number | null;
  rentExemptReserveLamports: number;
  immediatelyWithdrawableLamports: number | null;
  closeOnlyWithdrawableLamports: number;
  requiredRemainingLamports: number | null;
  lockedLamports: number;
  unavailableLamports: number;
  unresolvedLamports: number;
  lifecycleState: StakeLifecycleState;
  lockupState: StakeLockupState;
  controlState: StakeControlState;
  withdrawalCapacityState: WithdrawalCapacityState;
  withdrawalRestrictionReasons: string[];
  activationEpoch: string | null;
  deactivationEpoch: string | null;
  currentEpoch: number | null;
  authorizedStaker: string | null;
  authorizedWithdrawer: string | null;
  lockupCustodian: string | null;
  validatorStatus: "current" | "delinquent" | "unknown";
  apy: number | null;
  observedAt: string;
  sourceSlot: number;
  freshness: "fresh" | "stale" | "unresolved";
  unresolvedReasons: string[];
  decoderVersion: string;
  dedupeKey: string;
}

/** Canonical economic-position dedupe key — bound to the STAKE ACCOUNT ADDRESS (never validator alone). */
export function nativeStakeDedupeKey(stakeAccount: string): string {
  return `native-stake:${stakeAccount}`;
}

function classifyLockup(lockup: NativeStakeFacts["lockup"], currentEpoch: number | null, nowSec: number | null, wallet: string): { state: StakeLockupState; custodian: string | null; locked: boolean } {
  if (!lockup) return { state: "unlocked", custodian: null, locked: false };
  const custodian = lockup.custodian && lockup.custodian !== SYSTEM_PROGRAM_ID ? lockup.custodian : null;
  const ts = lockup.unixTimestamp; const ep = lockup.epoch;
  if ((ts === null && ep === null)) return { state: "unlocked", custodian, locked: false };
  if ((ts !== null && ts > 0 && nowSec === null) || (ep !== null && ep > 0 && currentEpoch === null))
    return { state: "unresolved", custodian, locked: true }; // can't prove unlock → fail closed (treated locked)
  const lockedByTs = ts !== null && nowSec !== null && nowSec < ts;
  const lockedByEpoch = ep !== null && currentEpoch !== null && currentEpoch < ep;
  if (!lockedByTs && !lockedByEpoch) return { state: "unlocked", custodian, locked: false };
  if (custodian && custodian !== wallet) return { state: "custodian_override_required", custodian, locked: true };
  const state: StakeLockupState = lockedByTs && lockedByEpoch ? "locked_by_both" : lockedByTs ? "locked_by_timestamp" : "locked_by_epoch";
  return { state, custodian, locked: true };
}

function classifyControl(staker: string | null, withdrawer: string | null, custodian: string | null, wallet: string): StakeControlState {
  if (withdrawer === null && staker === null) return "unresolved";
  const wIsW = withdrawer === wallet; const wIsS = staker === wallet;
  if (custodian === wallet) return "wallet_is_custodian";
  if (wIsW && wIsS) return "wallet_controls_both";
  if (wIsW && !wIsS) return "wallet_controls_withdrawal";
  if (!wIsW && wIsS) return "wallet_controls_staking_only";
  return "control_shared_or_different";
}

/**
 * §2 — the EXACT deployed Stake Program withdraw rule. The withdraw instruction requires the account to
 * retain `effective_stake + rent_exempt_reserve`; the reserve may additionally leave only on a full close
 * (which requires `effective_stake == 0`). `getStakeActivation.active` is the same effective stake the
 * program's check computes (`Stake::stake(epoch, stake_history)`), so this is source-backed, not a guess:
 *   • keep-open withdrawable  = total − effective − reserve  (== getStakeActivation.inactive)
 *   • full-close adds the reserve only when effective == 0
 * A single `Withdraw` needs none of deactivate/split/merge/delegate/authority-change, so both the partial
 * and the full-close amounts are "immediately withdrawable" per this task's definition. Fail-closed:
 * unresolved effective stake / stale / lockup → no positive amount.
 */
function computeWithdrawalCapacity(input: {
  total: number; effectiveStaked: number; reserve: number; locked: boolean; lockState: StakeLockupState; resolved: boolean; stale: boolean;
}): { immediatelyWithdrawable: number | null; closeOnly: number; requiredRemaining: number | null; state: WithdrawalCapacityState; reasons: string[] } {
  if (input.stale) return { immediatelyWithdrawable: null, closeOnly: 0, requiredRemaining: null, state: "stale", reasons: ["stake/epoch state stale"] };
  if (input.locked) return { immediatelyWithdrawable: 0, closeOnly: 0, requiredRemaining: input.total, state: input.lockState === "unresolved" ? "unresolved" : "locked", reasons: ["lockup in force — withdrawal blocked"] };
  if (!input.resolved) return { immediatelyWithdrawable: null, closeOnly: 0, requiredRemaining: null, state: "unresolved", reasons: ["effective stake unresolved (getStakeActivation unavailable)"] };
  const inactive = Math.max(input.total - input.reserve - input.effectiveStaked, 0);
  if (input.effectiveStaked > 0) {
    // Partial only: effective stake + reserve must remain in the open account.
    return { immediatelyWithdrawable: inactive, closeOnly: 0, requiredRemaining: input.effectiveStaked + input.reserve, state: inactive > 0 ? "partially_withdrawable" : "currently_unavailable", reasons: inactive > 0 ? [] : ["all lamports are currently effective stake or rent reserve"] };
  }
  // effective == 0 → the account can be fully closed: everything (incl. reserve) is withdrawable now.
  return { immediatelyWithdrawable: input.total, closeOnly: input.reserve, requiredRemaining: 0, state: inactive > 0 ? "fully_withdrawable" : "close_only", reasons: [] };
}

export function assessNativeStakeAccount(f: NativeStakeFacts): NativeStakePositionResult {
  const reasons = new Set<string>();
  const dedupeKey = nativeStakeDedupeKey(f.stakeAccount);
  const custodianRaw = f.lockup?.custodian && f.lockup.custodian !== SYSTEM_PROGRAM_ID ? f.lockup.custodian : null;
  const controlState = classifyControl(f.authorizedStaker, f.authorizedWithdrawer, custodianRaw, f.wallet);
  const base = {
    stakeAccount: f.stakeAccount, wallet: f.wallet, voteAccount: f.delegation?.voter ?? null,
    activationEpoch: f.delegation?.activationEpoch ?? null, deactivationEpoch: f.delegation?.deactivationEpoch ?? null,
    currentEpoch: f.currentEpoch, authorizedStaker: f.authorizedStaker, authorizedWithdrawer: f.authorizedWithdrawer,
    lockupCustodian: custodianRaw, apy: f.apyFresh ? f.apy : null, observedAt: f.observedAt, sourceSlot: f.sourceSlot,
    validatorStatus: (f.validatorStatus?.delinquent === true ? "delinquent" : f.validatorStatus?.delinquent === false ? "current" : "unknown") as "current" | "delinquent" | "unknown",
    decoderVersion: `native_stake_${NATIVE_STAKE_ASSESSMENT_VERSION}`, dedupeKey, controlState,
  };
  const empty = (lifecycle: StakeLifecycleState, freshness: NativeStakePositionResult["freshness"]): NativeStakePositionResult => ({
    ...base, owned: f.authorizedWithdrawer === f.wallet, positionExists: false,
    totalLamports: f.totalLamports ?? 0, delegatedLamports: 0, activeLamports: null, activatingLamports: null,
    deactivatingLamports: null, inactiveLamports: null, rentExemptReserveLamports: f.rentExemptReserveLamports ?? 0,
    immediatelyWithdrawableLamports: null, closeOnlyWithdrawableLamports: 0, requiredRemainingLamports: null,
    lockedLamports: 0, unavailableLamports: 0,
    unresolvedLamports: f.totalLamports ?? 0, lifecycleState: lifecycle, lockupState: "unresolved", freshness,
    withdrawalCapacityState: "unresolved", withdrawalRestrictionReasons: ["position unresolved"], unresolvedReasons: [...reasons],
  });

  if (f.ownerProgram !== STAKE_PROGRAM_ID) { reasons.add("wrong program owner"); return empty("unresolved", "unresolved"); }
  // Ownership policy: the authorized WITHDRAWER is the economic owner.
  const owned = f.authorizedWithdrawer !== null && f.authorizedWithdrawer === f.wallet;
  const total = f.totalLamports;
  if (total === null || !Number.isFinite(total) || total < 0) { reasons.add("malformed account lamports"); return { ...empty("unresolved", "unresolved"), owned }; }

  const lock = classifyLockup(f.lockup, f.currentEpoch, f.currentUnixTime, f.wallet);
  const rent = f.rentExemptReserveLamports ?? 0;
  const mk = (over: Partial<NativeStakePositionResult>): NativeStakePositionResult => ({
    ...base, owned, positionExists: true, totalLamports: total, delegatedLamports: 0,
    activeLamports: null, activatingLamports: null, deactivatingLamports: null, inactiveLamports: null,
    rentExemptReserveLamports: rent, immediatelyWithdrawableLamports: null, closeOnlyWithdrawableLamports: 0,
    requiredRemainingLamports: null, lockedLamports: 0, unavailableLamports: 0, unresolvedLamports: 0, lifecycleState: "unresolved",
    lockupState: lock.state, freshness: !f.fresh ? "stale" : "fresh",
    withdrawalCapacityState: "unresolved", withdrawalRestrictionReasons: [], unresolvedReasons: [...reasons], ...over,
  });

  if (!f.fresh) { reasons.add("stake account state stale"); const c = computeWithdrawalCapacity({ total, effectiveStaked: 0, reserve: rent, locked: lock.locked, lockState: lock.state, resolved: false, stale: true }); return mk({ lifecycleState: "unresolved", unresolvedLamports: total, immediatelyWithdrawableLamports: null, requiredRemainingLamports: null, withdrawalCapacityState: c.state, withdrawalRestrictionReasons: c.reasons, freshness: "stale" }); }
  if (f.accountType === "uninitialized" || f.accountType === "rewardsPool") { reasons.add(`unsupported account type: ${f.accountType}`); return mk({ lifecycleState: "unresolved", unresolvedLamports: total, withdrawalCapacityState: "unresolved", withdrawalRestrictionReasons: ["unsupported account type"] }); }

  // Initialized-but-not-delegated: no effective stake → the account is fully closeable when unlocked.
  if (f.accountType === "initialized" || f.delegation === null) {
    const stakeable = Math.max(total - rent, 0);
    const cap = computeWithdrawalCapacity({ total, effectiveStaked: 0, reserve: rent, locked: lock.locked, lockState: lock.state, resolved: true, stale: false });
    return mk({
      lifecycleState: "initialized_not_delegated", delegatedLamports: 0,
      activeLamports: 0, activatingLamports: 0, deactivatingLamports: 0, inactiveLamports: stakeable,
      immediatelyWithdrawableLamports: cap.immediatelyWithdrawable, closeOnlyWithdrawableLamports: cap.closeOnly,
      requiredRemainingLamports: cap.requiredRemaining, withdrawalCapacityState: cap.state, withdrawalRestrictionReasons: cap.reasons,
      lockedLamports: lock.locked ? total : 0, unavailableLamports: lock.locked ? total : 0,
    });
  }

  const delegated = f.delegation.stakeLamports ?? 0;
  // Lifecycle decomposition requires the exact getStakeActivation result — never invented.
  if (f.activation === null) {
    reasons.add("stake activation state unresolved (getStakeActivation unavailable)");
    const cap = computeWithdrawalCapacity({ total, effectiveStaked: 0, reserve: rent, locked: lock.locked, lockState: lock.state, resolved: false, stale: false });
    return mk({ lifecycleState: "unresolved", delegatedLamports: delegated, immediatelyWithdrawableLamports: null, requiredRemainingLamports: null, withdrawalCapacityState: cap.state, withdrawalRestrictionReasons: cap.reasons, unresolvedLamports: total });
  }
  const { state, activeLamports: active, inactiveLamports: inactive } = f.activation;
  // Map the exact 2-number RPC result (active + inactive = total − rentReserve) to the six-way display
  // split. NOTE: `active` is the EFFECTIVE stake (`Stake::stake(epoch)`) in every state — including
  // deactivating (still-effective while cooling) — so it is the exact `effectiveStaked` the withdraw
  // check enforces, regardless of the headline lifecycle label.
  let lifecycleState: StakeLifecycleState = "unresolved";
  let activeL = 0, activatingL = 0, deactivatingL = 0, inactiveL = 0;
  if (state === "active") { lifecycleState = "active"; activeL = active; inactiveL = inactive; }
  else if (state === "activating") { lifecycleState = "activating"; activeL = active; activatingL = inactive; }
  else if (state === "deactivating") { lifecycleState = "deactivating"; deactivatingL = active; inactiveL = inactive; }
  else { lifecycleState = "inactive"; inactiveL = inactive; }

  // Exact withdrawal capacity from the deployed rule: effective stake = getStakeActivation.active.
  const cap = computeWithdrawalCapacity({ total, effectiveStaked: active, reserve: rent, locked: lock.locked, lockState: lock.state, resolved: true, stale: false });
  return mk({
    lifecycleState, delegatedLamports: delegated,
    activeLamports: activeL, activatingLamports: activatingL, deactivatingLamports: deactivatingL, inactiveLamports: inactiveL,
    immediatelyWithdrawableLamports: cap.immediatelyWithdrawable, closeOnlyWithdrawableLamports: cap.closeOnly,
    requiredRemainingLamports: cap.requiredRemaining, withdrawalCapacityState: cap.state, withdrawalRestrictionReasons: cap.reasons,
    lockedLamports: lock.locked ? total : 0, unavailableLamports: lock.locked ? total : 0, unresolvedLamports: 0,
  });
}

/* ------------------------------------------------------------------ *
 * §12 — aggregate account-level records into ONE grouped position (per validator), preserving the
 * account breakdown and using the STRICTEST applicable state for actionability.
 * ------------------------------------------------------------------ */
export interface NativeStakeGroup {
  voteAccount: string | null;
  accounts: NativeStakePositionResult[];
  totalLamports: number;
  activeLamports: number;
  activatingLamports: number;
  deactivatingLamports: number;
  inactiveLamports: number;
  rentExemptReserveLamports: number;
  immediatelyWithdrawableLamports: number;
  closeOnlyWithdrawableLamports: number;
  requiredRemainingLamports: number;
  lockedLamports: number;
  unresolvedLamports: number;
  lifecycleSummary: string;
  withdrawalCapacitySummary: string;
  anyUnresolved: boolean;
  apy: number | null;
}

const LIFE_ORDER: StakeLifecycleState[] = ["unresolved", "activating", "deactivating", "active", "inactive", "initialized_not_delegated"];

/** Group owned account records by validator; a mixed group is labelled by its constituent states. */
export function groupNativeStakeByValidator(records: NativeStakePositionResult[]): NativeStakeGroup[] {
  const owned = records.filter((r) => r.owned && r.positionExists);
  const byVoter = new Map<string, NativeStakePositionResult[]>();
  for (const r of owned) { const k = r.voteAccount ?? "__none__"; const a = byVoter.get(k) ?? []; a.push(r); byVoter.set(k, a); }
  const groups: NativeStakeGroup[] = [];
  for (const [voter, accts] of byVoter) {
    const sum = (f: (r: NativeStakePositionResult) => number | null) => accts.reduce((s, r) => s + (f(r) ?? 0), 0);
    const anyUnresolved = accts.some((r) => r.lifecycleState === "unresolved" || r.activeLamports === null || r.withdrawalCapacityState === "unresolved" || r.withdrawalCapacityState === "stale");
    const states = [...new Set(accts.map((r) => r.lifecycleState))].sort((a, b) => LIFE_ORDER.indexOf(a) - LIFE_ORDER.indexOf(b));
    const lifecycleSummary = states.length === 1 ? states[0] : `mixed:${states.join("+")}`;
    const capStates = [...new Set(accts.map((r) => r.withdrawalCapacityState))];
    const withdrawalCapacitySummary = capStates.length === 1 ? capStates[0] : `mixed:${capStates.join("+")}`;
    // Realized APY exists per stake ACCOUNT, and only for accounts that actually
    // earned an inflation reward in a completed epoch. An account that is still
    // warming up, deactivating, or undelegated never has one — so requiring EVERY
    // account in the group to have an APY let a single such account blank out the
    // APY for the mature stake sitting right beside it. Average over the accounts
    // that did resolve, weighted by the stake each one actually holds (an unweighted
    // mean would let a dust account swing the rate), and report null only when NO
    // account in the group has a realized reward to show.
    const weighted = accts
      .map((r) => ({ apy: r.apy, weight: r.activeLamports ?? r.totalLamports ?? 0 }))
      .filter((x): x is { apy: number; weight: number } => typeof x.apy === "number" && x.weight > 0);
    const weightTotal = weighted.reduce((s, x) => s + x.weight, 0);
    groups.push({
      voteAccount: voter === "__none__" ? null : voter, accounts: accts,
      totalLamports: sum((r) => r.totalLamports), activeLamports: sum((r) => r.activeLamports),
      activatingLamports: sum((r) => r.activatingLamports), deactivatingLamports: sum((r) => r.deactivatingLamports),
      inactiveLamports: sum((r) => r.inactiveLamports), rentExemptReserveLamports: sum((r) => r.rentExemptReserveLamports),
      // §8 — group liquid value = SUM of account-level immediately-withdrawable (never one label for all).
      immediatelyWithdrawableLamports: sum((r) => r.immediatelyWithdrawableLamports),
      closeOnlyWithdrawableLamports: sum((r) => r.closeOnlyWithdrawableLamports), requiredRemainingLamports: sum((r) => r.requiredRemainingLamports),
      lockedLamports: sum((r) => r.lockedLamports),
      unresolvedLamports: sum((r) => r.unresolvedLamports), lifecycleSummary, withdrawalCapacitySummary, anyUnresolved,
      apy: weightTotal > 0 ? weighted.reduce((s, x) => s + x.apy * x.weight, 0) / weightTotal : null,
    });
  }
  return groups;
}

/* ------------------------------------------------------------------ *
 * §13 — canonical WalletPosition summary the mount attaches (critical values on the model, not UI-only)
 * ------------------------------------------------------------------ */
const LAMPORTS_PER_SOL = 1e9;
const toSol = (l: number): number => l / LAMPORTS_PER_SOL;

/** Build the `stake` summary + recognized/liquid USD for a grouped position. Stale price → USD null. */
export function toNativeStakeWalletFields(g: NativeStakeGroup, solPriceUsd: number | null, priceFresh: boolean): Partial<WalletPosition> {
  const priceOk = priceFresh && typeof solPriceUsd === "number" && solPriceUsd > 0;
  const recognizedSol = toSol(g.totalLamports);
  const withdrawableSol = toSol(g.immediatelyWithdrawableLamports);
  return {
    uiAmount: recognizedSol,
    amount: String(g.totalLamports),
    valueUsd: priceOk ? recognizedSol * (solPriceUsd as number) : null,
    recognizedValueUsd: priceOk ? recognizedSol * (solPriceUsd as number) : null,
    liquidValueUsd: priceOk ? withdrawableSol * (solPriceUsd as number) : null,
    liquidUnderlyingAmount: withdrawableSol,
    stakeLifecycleState: g.lifecycleSummary,
    stake: {
      voteAccount: g.voteAccount,
      totalLamports: String(g.totalLamports),
      activeLamports: String(g.activeLamports),
      activatingLamports: String(g.activatingLamports),
      deactivatingLamports: String(g.deactivatingLamports),
      inactiveLamports: String(g.inactiveLamports),
      rentExemptReserveLamports: String(g.rentExemptReserveLamports),
      immediatelyWithdrawableLamports: String(g.immediatelyWithdrawableLamports),
      closeOnlyWithdrawableLamports: String(g.closeOnlyWithdrawableLamports),
      requiredRemainingLamports: String(g.requiredRemainingLamports),
      lockedLamports: String(g.lockedLamports),
      unresolvedLamports: String(g.unresolvedLamports),
      lifecycleSummary: g.lifecycleSummary,
      withdrawalCapacitySummary: g.withdrawalCapacitySummary,
      anyUnresolved: g.anyUnresolved,
      accountCount: g.accounts.length,
      stakeAccounts: g.accounts.map((r) => r.stakeAccount),
    },
  };
}

/**
 * kaminoVaultCapacitySemantics — Step 16H-J.1. The REVIEWED deposit-capacity semantics for the Kamino
 * vault (kvault) program, resolved from the official program source.
 *
 * WHY THIS EXISTS: 16H-G/16H-I could not interpret `VaultState.deposit_cap` and correctly fell back to
 * `unknown` — absence of documented semantics is never "uncapped". Those semantics are now PROVEN from
 * the program's own code, so the fail-closed fallback no longer applies to THIS program.
 *
 * THE OFFICIAL SOURCE (reviewed, pinned — not a moving branch):
 *
 *   repo   : github.com/Kamino-Finance/kvault  ("Kamino's lending vault program")
 *   release: release/v2.2.2
 *   commit : 1d146d7087a76edbbadc14d848ae14295c0745a4  (2026-07-08)
 *   file   : programs/kvault/src/operations/vault_operations.rs
 *   fn     : common::get_max_depositable_in_vault (L1003-1012)
 *
 *     pub fn get_max_depositable_in_vault(vault: &VaultState, holdings_aum: Fraction) -> u64 {
 *         let deposit_cap = if vault.deposit_cap == 0 { u64::MAX } else { vault.deposit_cap };
 *         let holdings_aum_rounded_up = holdings_aum.try_to_ceil::<u64>().unwrap_or(u64::MAX);
 *         deposit_cap.saturating_sub(holdings_aum_rounded_up)
 *     }
 *
 * Three facts follow, and each is load-bearing:
 *
 *  1. `deposit_cap == 0` is EXPLICITLY mapped to `u64::MAX` — i.e. UNCAPPED. This is not an inference
 *     from a missing field; it is a branch in the deposit path itself.
 *  2. `init_vault` sets `vault.deposit_cap = u64::MAX` (vault_operations.rs L44), so freshly created
 *     vaults are uncapped by default. The `== 0` branch therefore exists for BACKWARD COMPATIBILITY:
 *     vaults created before the field existed are zero-initialised and must not read as "closed".
 *  3. Remaining capacity is `cap − AUM`, where AUM is computed dynamically at deposit time
 *     (`vault.compute_aum(&holdings.invested.total)`). There is NO stored "used" field to pair with the
 *     cap — and for an uncapped vault none is needed, because `u64::MAX − AUM` is unbounded in practice.
 *
 * This corrects the Step 16H-J note that speculated `0` might mean "closed" because `tokenAllocationCap`
 * uses a `U64_MAX` sentinel. That speculation was about a DIFFERENT field and is now superseded: both
 * `0` and `u64::MAX` mean uncapped for `deposit_cap`, with `0` as the legacy encoding.
 *
 * SCOPE IS DELIBERATELY NARROW. These semantics are proven for ONE program at ONE mainnet address. Any
 * other program, product type, or unrecognised encoding still FAILS CLOSED to `unknown`. A proof about
 * kvault is not a proof about lending reserves, LP pools, or any future product.
 *
 * CAPACITY IS NOT DEPOSIT STATE. `verified_uncapped` says only that no cap constrains a deposit. It says
 * nothing about whether deposits are enabled — a pause, a whitelist, or any other gate is a separate
 * question with a separate field, and this module never speaks to it.
 */
import type { YieldStrategyCapacityMode } from "./yieldStrategyProductCapacity";

export const KAMINO_VAULT_CAPACITY_SEMANTICS_EXIST = true;

/** The reviewed source revision these semantics are bound to. Re-review if the program is upgraded. */
export const KVAULT_CAPACITY_SOURCE = {
  repo: "github.com/Kamino-Finance/kvault",
  release: "release/v2.2.2",
  commit: "1d146d7087a76edbbadc14d848ae14295c0745a4",
  commitDate: "2026-07-08",
  file: "programs/kvault/src/operations/vault_operations.rs",
  symbol: "common::get_max_depositable_in_vault",
  reviewedAt: "2026-07-16",
  /** The IDL the installed klend-sdk ships. Noted because it trails the reviewed source by a patch. */
  sdkIdlVersion: "2.2.1",
} as const;

/** The EXACT mainnet program these semantics apply to. Any other program id fails closed. */
export const KVAULT_MAINNET_PROGRAM_ID = "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd";

/** `u64::MAX` — the value `init_vault` writes, and what `0` is mapped to at deposit time. */
export const U64_MAX_STR = "18446744073709551615";

export type KvaultCapacityResolution =
  | { mode: "verified_uncapped"; reason: string; remainingUsd?: undefined }
  | { mode: "explicit_remaining_capacity"; reason: string; remainingUsd: number }
  | { mode: "product_full"; reason: string; remainingUsd?: undefined }
  | { mode: "unknown" | "invalid"; reason: string; remainingUsd?: undefined };

const isU64Digits = (s: string) => /^\d+$/.test(s);

/**
 * Resolve deposit capacity for a Kamino vault from its raw on-chain `deposit_cap`.
 *
 * `programId` and `productType` are required and checked: the proof covers the kvault program only, so
 * anything else returns `unknown` rather than borrowing a conclusion it has no basis for.
 *
 * `aumRaw` (dynamically computed AUM, same token units as the cap) is needed ONLY for a genuinely capped
 * vault. An uncapped vault needs no used-counterpart, exactly as the program itself needs none.
 */
export function resolveKvaultDepositCapacity(args: {
  programId: string;
  productType: string;
  /** Raw base-unit `deposit_cap` from VaultState, as a decimal string. */
  depositCapRaw: string;
  /** Raw base-unit dynamically-computed AUM, as a decimal string. Optional; only capped vaults need it. */
  aumRaw?: string;
  /** Token decimals, for converting a capped remainder into USD. */
  mintDecimals?: number;
}): KvaultCapacityResolution {
  const { programId, productType, depositCapRaw, aumRaw, mintDecimals } = args;

  // ---- Scope gates. A proof about kvault is not a proof about anything else. ----
  if (programId !== KVAULT_MAINNET_PROGRAM_ID) {
    return { mode: "unknown", reason: `capacity_semantics_unproven_for_program:${programId.slice(0, 6)}… — the reviewed proof covers the kvault mainnet program only` };
  }
  if (productType !== "managed_vault") {
    return { mode: "unknown", reason: `capacity_semantics_unproven_for_product_type:${productType} — kvault deposit_cap semantics do not transfer to other product models` };
  }
  if (typeof depositCapRaw !== "string" || !isU64Digits(depositCapRaw)) {
    return { mode: "invalid", reason: "deposit_cap_not_a_u64_decimal_string" };
  }

  // ---- The proven branch: 0 => u64::MAX => uncapped (legacy encoding, backward compatibility). ----
  if (depositCapRaw === "0") {
    return {
      mode: "verified_uncapped",
      reason: `deposit_cap=0 is mapped to u64::MAX by ${KVAULT_CAPACITY_SOURCE.symbol} (${KVAULT_CAPACITY_SOURCE.release}) — an explicit uncapped branch, not an absent field`,
    };
  }
  // init_vault writes u64::MAX for new vaults; same meaning, current encoding.
  if (depositCapRaw === U64_MAX_STR) {
    return { mode: "verified_uncapped", reason: `deposit_cap=u64::MAX is the init_vault uncapped default (${KVAULT_CAPACITY_SOURCE.release})` };
  }

  // ---- A genuinely capped vault. Now — and only now — a used-counterpart is required. ----
  if (aumRaw === undefined) {
    return { mode: "unknown", reason: "capped_vault_requires_dynamically_computed_aum — cap is set but no AUM was supplied to compute cap − AUM" };
  }
  if (!isU64Digits(aumRaw)) return { mode: "invalid", reason: "aum_not_a_u64_decimal_string" };
  if (!Number.isInteger(mintDecimals) || mintDecimals === undefined || mintDecimals < 0 || mintDecimals > 18) {
    return { mode: "invalid", reason: "invalid_mint_decimals_for_capped_vault" };
  }

  // Integer math via BigInt: a cap can exceed Number.MAX_SAFE_INTEGER.
  const cap = BigInt(depositCapRaw);
  const aum = BigInt(aumRaw);
  if (aum >= cap) {
    // Mirrors the program: saturating_sub → 0 → "vault deposit cap reached".
    return { mode: "product_full", reason: "aum >= deposit_cap — the program's saturating_sub yields 0 depositable" };
  }
  const remainingRaw = cap - aum;
  const divisor = BigInt(10) ** BigInt(mintDecimals);
  const whole = remainingRaw / divisor;
  const frac = remainingRaw % divisor;
  const remainingUsd = Number(`${whole}.${frac.toString().padStart(mintDecimals, "0")}`);
  if (!Number.isFinite(remainingUsd)) return { mode: "invalid", reason: "non_finite_remaining_capacity" };
  return { mode: "explicit_remaining_capacity", reason: "cap − dynamically-computed AUM, same product, same units", remainingUsd };
}

/** Narrow the resolution to the canonical 16G capacity mode. */
export function kvaultCapacityMode(r: KvaultCapacityResolution): YieldStrategyCapacityMode {
  return r.mode;
}

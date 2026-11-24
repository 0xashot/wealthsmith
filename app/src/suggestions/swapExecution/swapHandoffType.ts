/**
 * swapHandoffType — Phase 4. Protocol Logic's `handoff_type` assignment for a swap route.
 *
 * `rules/protocol-selection-rules.md` → Handoff Type states the table in prose:
 *
 *     Currently assigned `in_app_confirm`:   jupiter — token swaps only
 *     Everything else is `external_new_tab`.
 *
 * This file is that table's only implementation. Until now `handoff_type` existed as a field on
 * `ProtocolDecision` and as a parameter to `deriveExecutionEligibility`, but NOTHING in the app
 * ever produced the value `in_app_confirm` — so the Execution Boundary could never open, however
 * good the quote. The gate was built before the key.
 *
 * TWO LAYERS, and keeping them apart is the whole design:
 *
 *   This file answers "is this rail PERMITTED to offer a confirm step?" — a question about the
 *     protocol, settled by the provider and the kind of suggestion. It knows nothing about this
 *     particular quote, its liquidity, or when it expires.
 *
 *   `executionEligibility` answers "does THIS quote satisfy the Boundary?" — and asks the
 *     permission question first, so a misconfigured rail cannot be rescued by a good quote.
 *
 * A route may therefore be permitted and still blocked (expired, unverified liquidity, multi-leg),
 * which is correct. The reverse — eligible but not permitted — is refused by the Boundary's first
 * check. Deliberately, this function does NOT look at leg count: assigning `in_app_confirm` to a
 * multi-leg action and having the Boundary block it as `multi_leg` is the layering working, not a
 * bug. Duplicating the check here would give two places the chance to disagree.
 *
 * THE UI NEVER UPGRADES. `rules/suggestion-engine-rules.md` requires that no UI condition turn an
 * `external_new_tab` into an `in_app_confirm`. That is enforced mechanically rather than trusted:
 * fixture SWH-9 asserts that no component file anywhere contains the literal `in_app_confirm`, so
 * a confirm step can only ever be reached through this function.
 */
import type { SuggestionSwapCategory, SwapProviderId } from "../swapQuote/swapQuoteContracts";

export const SWAP_HANDOFF_TYPE_VERSION = "swap_handoff_type_1.0.0" as const;

/**
 * The two handoff types. `external_new_tab` is the default in every sense: it is what an unknown
 * value means, what a missing value means, and what every provider outside the allowlist gets.
 */
export type SwapHandoffType = "external_new_tab" | "in_app_confirm";

export const DEFAULT_SWAP_HANDOFF_TYPE: SwapHandoffType = "external_new_tab";

/**
 * Providers Protocol Logic permits a confirm step for.
 *
 * Jupiter only. This is a DIFFERENT list from `EXECUTABLE_PROVIDER_IDS` in `executionEligibility`,
 * even though both currently read `["jupiter"]`, and they are not merged on purpose: one is a
 * product decision about which protocols we offer to execute, the other an engineering fact about
 * which transactions we can build and verify. They will diverge — a provider we can technically
 * build for but have not approved, or vice versa — and collapsing them now would hide that.
 */
export const IN_APP_CONFIRM_PROVIDER_IDS: readonly SwapProviderId[] = ["jupiter"] as const;

/**
 * Suggestion categories that are token swaps.
 *
 * "Token swaps only" in the rule is a real restriction, not a description. A future rail that
 * routes through Jupiter for something that is not a swap — a lend, a stake, an LP deposit — does
 * not inherit this permission by virtue of the provider, and must be added here explicitly after
 * its own review.
 */
export const IN_APP_CONFIRM_CATEGORIES: readonly SuggestionSwapCategory[] = [
  "rebalance",
  "trim",
  "dca",
] as const;

export interface SwapHandoffTypeInput {
  /** The route's selected provider. Null/absent when no route was selected. */
  providerId: SwapProviderId | string | null | undefined;
  /** The suggestion's swap category. A non-swap category is never `in_app_confirm`. */
  suggestionCategory: SuggestionSwapCategory | string | null | undefined;
}

/**
 * Assign `handoff_type` for a swap route. Deny by default: anything unrecognised, absent, or
 * outside both allowlists is `external_new_tab`.
 *
 * Returns the type rather than a boolean so the value can be carried on a `ProtocolDecision`,
 * logged, and asserted against — a boolean would lose the distinction between "this is a handoff"
 * and "we could not tell", and both must behave identically without being the same thing.
 */
export function resolveSwapHandoffType(input: SwapHandoffTypeInput): SwapHandoffType {
  const { providerId, suggestionCategory } = input;
  if (typeof providerId !== "string" || typeof suggestionCategory !== "string") {
    return DEFAULT_SWAP_HANDOFF_TYPE;
  }
  const providerPermitted = (IN_APP_CONFIRM_PROVIDER_IDS as readonly string[]).includes(providerId);
  const categoryPermitted = (IN_APP_CONFIRM_CATEGORIES as readonly string[]).includes(suggestionCategory);
  return providerPermitted && categoryPermitted ? "in_app_confirm" : DEFAULT_SWAP_HANDOFF_TYPE;
}

/**
 * Whether a resolved type permits a confirm step.
 *
 * A named predicate so call sites read as the question they are asking, and so the comparison
 * against the literal lives in exactly one place.
 */
export function permitsInAppConfirm(handoffType: SwapHandoffType | string | null | undefined): boolean {
  return handoffType === "in_app_confirm";
}

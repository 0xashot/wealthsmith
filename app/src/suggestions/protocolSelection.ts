/**
 * protocolSelection — constructors + guardrail reconciliation for the Step 9J
 * protocol/platform-selection contract. Mirrors the `guardrails.ts` pattern:
 * one consistent shape per rule, one central place to guarantee coverage.
 *
 * HONESTY RULE: this prototype has NO reliable protocol data source (no APY,
 * TVL, risk, liquidity, lockup, fee, or route feed), so selection is only ever
 * `not_evaluated` (relevant, awaiting data) or `not_applicable` (irrelevant).
 * `unavailable` and `selected` are RESERVED — a rule may emit them ONLY once
 * real, deterministic, data-backed selection exists. Nothing here invents a
 * protocol, APY, TVL, risk score, audit status, or lockup timing.
 */
import type {
  GuardrailStatus,
  ProtocolSelection,
  ProtocolSelectionReason,
  ProtocolStrategyType,
  SuggestionGuardrail,
} from "./engineTypes";

/** Selection is relevant but no data source exists yet (e.g. staking / stable yield). */
export function notEvaluatedProtocolSelection(
  reasons: ProtocolSelectionReason[]
): ProtocolSelection {
  return { status: "not_evaluated", reasons };
}

/** Selection does not apply to this suggestion (e.g. review-only cards). */
export function notApplicableProtocolSelection(
  reason: ProtocolSelectionReason = "selection_not_required"
): ProtocolSelection {
  return { status: "not_applicable", reasons: [reason] };
}

/**
 * Selection was attempted but no eligible protocol / required data was found.
 * RESERVED — not emitted until real selection logic exists.
 */
export function unavailableProtocolSelection(
  reasons: ProtocolSelectionReason[]
): ProtocolSelection {
  return { status: "unavailable", reasons };
}

/**
 * A protocol was deterministically chosen from real data. RESERVED — only call
 * once a reliable, data-backed selection rule exists. Requires an id, name,
 * strategy, evaluation time, and the data sources consulted; it never invents
 * them. This is the ONLY path that may set selectedProtocolId/Name.
 *
 * NOT SAFE TO USE YET — see the Step 12B audit (`protocolSelectionAudit.md`):
 * the app has per-held-position data but no candidate catalog, TVL, withdrawal,
 * risk, fee, liquidity, or route data. Keep selection `not_evaluated`.
 */
export function selectedProtocolSelection(args: {
  protocolId: string;
  protocolName: string;
  strategyType: ProtocolStrategyType;
  reasons?: ProtocolSelectionReason[];
  evaluatedAt: string;
  dataSources: string[];
}): ProtocolSelection {
  return {
    status: "selected",
    selectedProtocolId: args.protocolId,
    selectedProtocolName: args.protocolName,
    selectedStrategyType: args.strategyType,
    reasons: args.reasons ?? ["deterministic_selection_available"],
    evaluatedAt: args.evaluatedAt,
    dataSources: args.dataSources,
  };
}

/**
 * The `protocol_selection` GUARDRAIL status that mirrors a selection model.
 * Absent selection → `not_applicable` (protocol choice is irrelevant to that
 * suggestion). HONESTY: never `passed` unless a protocol was actually
 * `selected`; `unavailable` surfaces as a non-blocking `warning`.
 */
export function protocolGuardrailStatus(
  selection: ProtocolSelection | undefined
): GuardrailStatus {
  switch (selection?.status) {
    case "not_evaluated":
      return "not_evaluated";
    case "unavailable":
      return "warning";
    case "selected":
      return "passed";
    case "not_applicable":
    case undefined:
    default:
      return "not_applicable";
  }
}

/**
 * Guarantee exactly one `protocol_selection` guardrail whose status mirrors the
 * suggestion's selection model. Updates an existing entry in place (preserving
 * its position) or appends one. Central consistency point — category rules set
 * the `protocolSelection` model and let this derive the guardrail, so the two
 * can never drift apart.
 */
export function reconcileProtocolGuardrail(
  guardrails: SuggestionGuardrail[],
  selection: ProtocolSelection | undefined
): SuggestionGuardrail[] {
  const status = protocolGuardrailStatus(selection);
  let found = false;
  const out = guardrails.map((g) => {
    if (g.code === "protocol_selection") {
      found = true;
      return { ...g, status };
    }
    return g;
  });
  if (!found) out.push({ code: "protocol_selection", status });
  return out;
}

/**
 * directUsdcLendingTestingFixtures — Step 16H-S.2. Deterministic, fixture-only rendering data for the
 * hidden `/testing` page. Maps the 24 direct-lending states (DIRECT_LENDING_TESTING_STATES) onto the
 * PRODUCTION SuggestionCard shape (SuggestionCardState) so the live Testing page renders them through
 * the real card component — no parallel mock card.
 *
 * FIXTURE-ONLY, READ-ONLY. Every card is review-only: executes_transaction / requires_wallet_signature
 * / completion_on_click are all false, is_top_pick is always false, and there is no deposit CTA. No
 * numeric risk score or threshold appears in any card. The APY is dynamic/estimated (formatted through
 * the approved formatter with `~` and "variable"), never the previously-observed constant.
 */
import type { SuggestionCardState } from "../types/dashboard";
import { DIRECT_LENDING_TESTING_STATES, type TestingState } from "./directUsdcLendingProductDecision";
import {
  DIRECT_USDC_LENDING_CARD_COPY,
  formatDirectLendingApy,
} from "./directUsdcLendingSuggestionCard";

/** A clearly fixture-only sample APY (NOT the production value; production uses the fresh measured source). */
export const DIRECT_LENDING_TESTING_SAMPLE_APY_PCT = 5.87 as const;

export interface DirectLendingTestingRow {
  id: string;
  stateId: number;
  name: string;
  showsCard: boolean;
  selectorState: string;
  /** Reason a suppressed state shows no card (for the testing diagnostics, never in a card). */
  suppressionReason: string | null;
  /** The approved risk disclosure, shown in the testing diagnostics beneath the card. */
  riskDisclosure: string;
  notes: string;
  card: SuggestionCardState | null;
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Build a production-shaped card for a state that renders one. */
function buildCard(state: TestingState, opts: { showApy: boolean; showAmount: boolean }): SuggestionCardState {
  return {
    id: `direct-lending-${state.id}-${slug(state.name)}`,
    title: DIRECT_USDC_LENDING_CARD_COPY.title,
    type: "stable_yield",
    category: "stable_yield",
    badge: DIRECT_USDC_LENDING_CARD_COPY.eyebrow, // "Yield strategy"
    is_top_pick: false, // never auto Top Pick
    status: "review_only",
    actionability: "actionable",
    severity: "info",
    description: DIRECT_USDC_LENDING_CARD_COPY.description,
    impact_text: opts.showAmount ? "Estimated for your eligible excess USDC" : "Amount shown once eligible excess USDC is determined",
    cta: {
      label: "View details",
      action: null,
      executes_transaction: false,
      requires_wallet_signature: false,
      completion_on_click: false,
    },
    ...(opts.showApy ? { apy: { status: "estimated", display: formatDirectLendingApy(DIRECT_LENDING_TESTING_SAMPLE_APY_PCT) } } : {}),
  };
}

/** Which states render a card, and with what variations. */
function cardOptionsFor(state: TestingState): { showApy: boolean; showAmount: boolean } | null {
  if (!state.showsCard) return null;
  // State 23 = USDC price unavailable → no USD amount; APY still estimated.
  if (state.name === "USDC price unavailable") return { showApy: true, showAmount: false };
  // State 17 = eligible but no deterministic amount → card without amount.
  if (/no deterministic amount/i.test(state.name)) return { showApy: true, showAmount: false };
  return { showApy: true, showAmount: true };
}

const SUPPRESSION_REASON: Record<string, string> = {
  blocked_governance: "Governance incomplete (fixture scenario)",
  blocked_freshness: "APY stale / not comparison-ready",
  blocked_availability: "Deposits unavailable or emergency mode active",
  blocked_capacity: "Capacity stale or insufficient",
  blocked_invalidation: "Assessment materially invalidated",
  no_approved_candidate: "No approved direct-lending candidate",
};

export const DIRECT_LENDING_TESTING_ROWS: DirectLendingTestingRow[] = DIRECT_LENDING_TESTING_STATES.map((state) => {
  const opts = cardOptionsFor(state);
  const suppressed = !state.showsCard;
  return {
    id: `direct-lending-row-${state.id}`,
    stateId: state.id,
    name: state.name,
    showsCard: state.showsCard,
    selectorState: state.selectorState,
    suppressionReason: suppressed ? (SUPPRESSION_REASON[state.selectorState] ?? "Suppressed by a user-side gate") : null,
    riskDisclosure: DIRECT_USDC_LENDING_CARD_COPY.riskDisclosure,
    notes: state.notes,
    card: opts ? buildCard(state, opts) : null,
  };
});

/** The subset that renders a real SuggestionCard. */
export const DIRECT_LENDING_TESTING_CARD_ROWS = DIRECT_LENDING_TESTING_ROWS.filter((r) => r.card !== null);
/** The suppressed subset (no card) — shown as testing diagnostics only. */
export const DIRECT_LENDING_TESTING_SUPPRESSED_ROWS = DIRECT_LENDING_TESTING_ROWS.filter((r) => r.card === null);

/** Validation: every state is represented; cards never leak scores/thresholds or executing CTAs. */
export function validateTestingFixtures(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (DIRECT_LENDING_TESTING_ROWS.length !== 24) errors.push(`expected 24 rows, got ${DIRECT_LENDING_TESTING_ROWS.length}`);
  const FORBIDDEN = ["5.93", "5.5", "meetsminimum", "dimension", "confidence"];
  for (const r of DIRECT_LENDING_TESTING_ROWS) {
    if (!r.card) continue;
    const cardText = JSON.stringify(r.card).toLowerCase();
    for (const f of FORBIDDEN) if (cardText.includes(f)) errors.push(`row ${r.stateId}: card exposes "${f}"`);
    if (r.card.is_top_pick !== false) errors.push(`row ${r.stateId}: card must not be Top Pick`);
    if (r.card.cta.executes_transaction || r.card.cta.requires_wallet_signature || r.card.cta.completion_on_click)
      errors.push(`row ${r.stateId}: card CTA executes/signs/completes`);
    if (/deposit now|move funds|start earning/i.test(r.card.cta.label)) errors.push(`row ${r.stateId}: forbidden CTA label`);
    if (r.card.apy && (!r.card.apy.display.startsWith("~") || !/variable/i.test(r.card.apy.display))) errors.push(`row ${r.stateId}: APY not ~/variable`);
  }
  return { valid: errors.length === 0, errors };
}

export const DIRECT_LENDING_TESTING_FIXTURES_VALIDATION = validateTestingFixtures();

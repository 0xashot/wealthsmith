/**
 * suggestionEngine.fixtures — documented fixture scenarios for the Suggestion
 * Engine MVP (no test framework exists in this app, so these are executable
 * fixtures instead of a test suite).
 *
 * Run all checks from app/:
 *   npx esbuild src/suggestions/suggestionEngine.fixtures.ts --bundle --format=esm --platform=node --outfile=/tmp/fixtures.mjs && node -e "import('/tmp/fixtures.mjs').then(m => m.printFixtureResults())"
 *
 * Each scenario builds SuggestionEngineInputs through the REAL adapter
 * (buildSuggestionEngineInputs) with a fixture-derived Safety Buffer shaped
 * exactly like deriveSafetyBuffer's output (the risk-based derivation itself
 * is product logic verified separately in walletSummary/safetyBufferTarget).
 * Values are sample scenario data — never rendered in the app, never demo
 * suggestion cards.
 */
import type { WalletPosition } from "../wallet/walletPosition";
import type { SafetyBuffer } from "../wallet/walletSummary";
import type { SavedGoal } from "../types/goal";
import { buildSuggestionEngineInputs } from "./engineInputAdapter";
import { runSuggestionEngine } from "./engine";

/** Fixed timestamp so every fixture run is fully reproducible. */
export const FIXTURE_GENERATED_AT = 1_750_000_000_000;

/** Minimal priced USDC wallet position (sample data for engine inputs only). */
const positionsFixture: WalletPosition[] = [
  {
    id: "fixture-usdc",
    source: "wallet",
    type: "token",
    symbol: "USDC",
    name: "USD Coin",
    amount: "800",
    uiAmount: 800,
    decimals: 6,
    detection: "direct_wallet_balance",
    priceUsd: 1,
    valueUsd: 800,
  },
];

const goalFixture: SavedGoal = {
  financial_goal: "build_long_term_wealth",
  risk_tolerance: "medium",
  timeline: "10_plus_years",
  contribution_frequency: "monthly",
  income_monthly: 4000,
  expenses_monthly: 1000,
  monthly_saving_goal: 2000,
};

/** A derived Safety Buffer result (shape of deriveSafetyBuffer's output). */
function bufferFixture(
  stableUsd: number,
  monthlyExpenses: number,
  targetMonths: number
): SafetyBuffer {
  const targetUsd = monthlyExpenses * targetMonths;
  return {
    stableUsd,
    targetUsd,
    targetMonths,
    coveragePct: targetUsd > 0 ? Math.min(100, (stableUsd / targetUsd) * 100) : 0,
    monthsCovered: monthlyExpenses > 0 ? stableUsd / monthlyExpenses : 0,
    fullyFunded: stableUsd >= targetUsd,
  };
}

interface FixtureArgs {
  safetyBuffer: SafetyBuffer | null;
  anyUnpriced?: boolean;
  goal?: SavedGoal;
}

function inputsFor({ safetyBuffer, anyUnpriced = false, goal = goalFixture }: FixtureArgs) {
  return buildSuggestionEngineInputs({
    positions: positionsFixture,
    pricedAsOf: FIXTURE_GENERATED_AT,
    savedGoal: goal,
    value: { totalUsd: 15000, anyUnpriced },
    safetyBuffer,
  });
}

export interface FixtureCheck {
  name: string;
  pass: boolean;
  detail: string;
}

/** Runs scenarios A–F and returns structured pass/fail results. */
export function runSuggestionEngineFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  // A. Buffer not funded → one actionable buffer suggestion, amount = shortfall.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(800, 1000, 3) }), // shortfall 2200
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions[0];
    const minTrade = s?.guardrails.find((g) => g.code === "min_trade_size");
    add(
      "A: underfunded buffer → actionable suggestion",
      r.suggestions.length === 1 &&
        s?.category === "buffer" &&
        s?.amount?.valueUsd === 2200 &&
        s?.is_actionable === true &&
        s?.action_kind === "review_only" &&
        s?.is_top_pick === false &&
        minTrade?.status === "passed" &&
        r.unavailable_reason === undefined,
      `suggestions=${r.suggestions.length} amount=${s?.amount?.valueUsd} actionable=${s?.is_actionable} top_pick=${s?.is_top_pick} min_trade=${minTrade?.status}`
    );
  }

  // B. Buffer fully funded → no suggestion, and NOT "missing data".
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(5000, 1000, 3) }),
      FIXTURE_GENERATED_AT
    );
    add(
      "B: fully funded → no suggestion",
      r.suggestions.length === 0 && r.unavailable_reason === undefined,
      `suggestions=${r.suggestions.length} unavailable=${r.unavailable_reason}`
    );
  }

  // C. Below minimum shortfall ($25 < $50) → disabled suggestion, min_trade failed.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(2975, 1000, 3) }), // shortfall 25
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions[0];
    const minTrade = s?.guardrails.find((g) => g.code === "min_trade_size");
    add(
      "C: shortfall below $50 → disabled suggestion",
      r.suggestions.length === 1 &&
        s?.action_kind === "disabled" &&
        s?.is_actionable === false &&
        s?.reason_codes.includes("below_min_size") &&
        minTrade?.status === "failed",
      `action=${s?.action_kind} reasons=${s?.reason_codes.join(",")} min_trade=${minTrade?.status}`
    );
  }

  // D. Missing Safety Buffer → no suggestion + unavailable_reason missing_data.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: null }),
      FIXTURE_GENERATED_AT
    );
    add(
      "D: missing safety buffer → missing_data",
      r.suggestions.length === 0 && r.unavailable_reason === "missing_data",
      `suggestions=${r.suggestions.length} unavailable=${r.unavailable_reason}`
    );
  }

  // E. Partial pricing → warning present, suggestion still generated.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(800, 1000, 3), anyUnpriced: true }),
      FIXTURE_GENERATED_AT
    );
    add(
      "E: partial pricing → warning + suggestion",
      r.warnings.includes("partial_pricing") && r.suggestions.length === 1,
      `warnings=${r.warnings.join(",")} suggestions=${r.suggestions.length}`
    );
  }

  // F. Risk-based target consumed as-is: 6-month and 1-month targets pass
  //    through to post_buffer_months unchanged.
  {
    const r6 = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(800, 1000, 6),
        goal: { ...goalFixture, risk_tolerance: "very_low" },
      }),
      FIXTURE_GENERATED_AT
    );
    const r1 = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(400, 1000, 1),
        goal: { ...goalFixture, risk_tolerance: "very_high" },
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "F: risk-based target months pass through unchanged",
      r6.suggestions[0]?.post_buffer_months === 6 &&
        r1.suggestions[0]?.post_buffer_months === 1,
      `6mo→${r6.suggestions[0]?.post_buffer_months} 1mo→${r1.suggestions[0]?.post_buffer_months}`
    );
  }

  return checks;
}

/** CLI entry: prints each check and exits non-zero on failure. */
export function printFixtureResults(): void {
  const checks = runSuggestionEngineFixtureChecks();
  for (const c of checks) {
    // eslint-disable-next-line no-console
    console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}  (${c.detail})`);
  }
  const failed = checks.filter((c) => !c.pass).length;
  // eslint-disable-next-line no-console
  console.log(`${checks.length - failed}/${checks.length} fixture checks passed`);
  if (failed > 0 && typeof process !== "undefined") process.exitCode = 1;
}

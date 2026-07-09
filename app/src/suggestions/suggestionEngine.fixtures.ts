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
import type { EngineSuggestion } from "./engineTypes";
import { buildSuggestionEngineInputs } from "./engineInputAdapter";
import { runSuggestionEngine } from "./engine";
import { selectTopPick } from "./topPick";
import { toSuggestionCard, toSuggestionCards } from "./toSuggestionCard";

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

/**
 * Bucket-level allocation snapshot (shape of AllocationInputs), built from a
 * current crypto % and the delta vs target. Positive delta = crypto overweight.
 */
function allocationFixture(totalUsd: number, currentCryptoPct: number, cryptoDeltaPct: number) {
  const recommendedCryptoPct = currentCryptoPct - cryptoDeltaPct;
  const currentStablesPct = 100 - currentCryptoPct;
  return {
    currentCryptoPct,
    currentStablesPct,
    currentCryptoUsd: (totalUsd * currentCryptoPct) / 100,
    currentStablesUsd: (totalUsd * currentStablesPct) / 100,
    recommendedCryptoPct,
    recommendedStablesPct: 100 - recommendedCryptoPct,
    cryptoDeltaPct,
    stablesDeltaPct: -cryptoDeltaPct,
  };
}

/** A liquid wallet SOL/WSOL position (or an unpriced one when priced=false). */
function solPosition(
  uiAmount: number,
  opts: { symbol?: string; type?: "native" | "token"; source?: string; price?: number; priced?: boolean } = {}
): WalletPosition {
  const { symbol = "SOL", type = "native", source = "wallet", price = 75, priced = true } = opts;
  return {
    id: `sol-${symbol}-${uiAmount}`,
    source: source as WalletPosition["source"],
    type,
    symbol,
    name: "Solana",
    amount: String(Math.round(uiAmount * 1e9)),
    uiAmount,
    decimals: 9,
    detection: "direct_wallet_balance",
    priceUsd: priced ? price : null,
    valueUsd: priced ? uiAmount * price : null,
  };
}

/** A priced non-SOL, non-stable wallet token (has wallet data, but neither
 *  staking nor stable_yield can fire from it) — for On Track / no-suggestion. */
function cryptoPosition(valueUsd = 100): WalletPosition {
  return {
    id: "bonk",
    source: "wallet",
    type: "token",
    symbol: "BONK",
    name: "Bonk",
    amount: "1000000",
    uiAmount: 1_000_000,
    decimals: 5,
    detection: "direct_wallet_balance",
    priceUsd: valueUsd / 1_000_000,
    valueUsd,
  };
}

/** An LST position (JupSOL/mSOL/…) — must NOT count as liquid SOL. */
function lstPosition(symbol: string, uiAmount: number, price = 80): WalletPosition {
  return {
    id: `lst-${symbol}`,
    source: "sanctum",
    type: "lst",
    symbol,
    name: symbol,
    amount: String(Math.round(uiAmount * 1e9)),
    uiAmount,
    decimals: 9,
    detection: "recognized_lst_mint",
    priceUsd: price,
    valueUsd: uiAmount * price,
  };
}

/** A stablecoin position — liquid wallet by default; override type/source for
 *  protocol positions, or an unrecognized symbol for the unknown-stable case. */
function stablePosition(
  symbol: string,
  uiAmount: number,
  opts: { type?: WalletPosition["type"]; source?: string; priced?: boolean; name?: string } = {}
): WalletPosition {
  const { type = "token", source = "wallet", priced = true, name } = opts;
  return {
    id: `stable-${symbol}-${uiAmount}-${type}`,
    source: source as WalletPosition["source"],
    type,
    symbol,
    name: name ?? (symbol === "USDC" ? "USD Coin" : symbol),
    amount: String(Math.round(uiAmount * 1e6)),
    uiAmount,
    decimals: 6,
    detection: "direct_wallet_balance",
    priceUsd: priced ? 1 : null,
    valueUsd: priced ? uiAmount : null,
  };
}

/** A deployed (protocol/LST/stake) yield position for position-optimization
 *  review — apy null = missing APY; low apy = low yield; big value = concentration. */
function yieldPosition(
  valueUsd: number,
  apy: number | null,
  opts: { type?: WalletPosition["type"]; source?: string; symbol?: string; priced?: boolean } = {}
): WalletPosition {
  const { type = "protocol", source = "kamino", symbol = "USDC", priced = true } = opts;
  return {
    id: `yield-${symbol}-${valueUsd}-${type}`,
    source: source as WalletPosition["source"],
    type,
    symbol,
    name: symbol,
    amount: "1",
    uiAmount: 1,
    decimals: 6,
    detection: "protocol_api",
    priceUsd: priced ? valueUsd : null,
    valueUsd: priced ? valueUsd : null,
    apy,
  };
}

interface FixtureArgs {
  safetyBuffer: SafetyBuffer | null;
  anyUnpriced?: boolean;
  goal?: SavedGoal;
  totalUsd?: number;
  allocation?: ReturnType<typeof allocationFixture> | null;
  positions?: WalletPosition[];
}

function inputsFor({
  safetyBuffer,
  anyUnpriced = false,
  goal = goalFixture,
  totalUsd = 15000,
  allocation = null,
  positions = positionsFixture,
}: FixtureArgs) {
  return buildSuggestionEngineInputs({
    positions,
    pricedAsOf: FIXTURE_GENERATED_AT,
    savedGoal: goal,
    value: { totalUsd, anyUnpriced },
    safetyBuffer,
    allocation,
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
        s?.is_top_pick === true && // sole actionable suggestion → Top Pick (Step 6)
        minTrade?.status === "passed" &&
        r.unavailable_reason === undefined,
      `suggestions=${r.suggestions.length} amount=${s?.amount?.valueUsd} actionable=${s?.is_actionable} top_pick=${s?.is_top_pick} min_trade=${minTrade?.status}`
    );
  }

  // B. Buffer fully funded, no positions/allocation → no suggestion, not "missing
  //    data". (Empty positions so no stable_yield/staking fires from defaults.)
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(5000, 1000, 3), positions: [cryptoPosition()] }),
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

  // G. Buffer NOT funded + allocation overweight → only the buffer suggestion
  //    (Buffer Override suppresses rebalance even though a delta exists).
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(800, 1000, 3), // underfunded
        allocation: allocationFixture(15000, 90, 15), // overweight 15%
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "G: buffer not funded + overweight → buffer only, no rebalance",
      r.suggestions.length === 1 &&
        r.suggestions[0]?.category === "buffer" &&
        !r.suggestions.some((s) => s.category === "rebalance"),
      `categories=${r.suggestions.map((s) => s.category).join(",")}`
    );
  }

  // H. Buffer funded + crypto overweight 15% → one rebalance crypto→stables,
  //    amount = total × 15%.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3), // funded
        allocation: allocationFixture(15000, 75, 15),
      }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions.find((x) => x.category === "rebalance");
    add(
      "H: funded + overweight 15% → rebalance crypto→stables, amount 2250",
      r.suggestions.length === 1 &&
        s?.reason_codes.includes("crypto_overweight") === true &&
        s?.from?.bucket === "crypto" &&
        s?.to?.bucket === "stables" &&
        s?.amount?.valueUsd === 2250 &&
        s?.is_actionable === true &&
        s?.is_top_pick === true, // sole actionable suggestion → Top Pick (Step 6)
      `amount=${s?.amount?.valueUsd} from=${s?.from?.bucket} to=${s?.to?.bucket} actionable=${s?.is_actionable} top_pick=${s?.is_top_pick}`
    );
  }

  // I. Buffer funded + crypto underweight 15% + excess stables → rebalance
  //    stables→crypto, amount capped by stable excess above the buffer.
  {
    // stableUsd 5000, targetUsd 3000 → excess 2000; deviation 15% × 15000 = 2250
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        allocation: allocationFixture(15000, 45, -15),
      }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions.find((x) => x.category === "rebalance");
    add(
      "I: funded + underweight 15% → rebalance stables→crypto, capped at excess 2000",
      s?.reason_codes.includes("crypto_underweight") === true &&
        s?.from?.bucket === "stables" &&
        s?.to?.bucket === "crypto" &&
        s?.amount?.valueUsd === 2000 &&
        s?.is_actionable === true &&
        s?.is_top_pick === true, // sole actionable suggestion → Top Pick (Step 6)
      `amount=${s?.amount?.valueUsd} from=${s?.from?.bucket} to=${s?.to?.bucket} top_pick=${s?.is_top_pick}`
    );
  }

  // I2. Underweight but NO excess stables above the buffer → no rebalance.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(3000, 1000, 3), // exactly funded, zero excess
        allocation: allocationFixture(15000, 45, -15),
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "I2: underweight + no excess stables → no rebalance",
      !r.suggestions.some((s) => s.category === "rebalance"),
      `suggestions=${r.suggestions.map((s) => s.category).join(",") || "none"}`
    );
  }

  // J. Buffer funded + crypto delta below 10% → no rebalance.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        allocation: allocationFixture(15000, 65, 5),
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "J: funded + delta 5% (below 10%) → no rebalance",
      !r.suggestions.some((s) => s.category === "rebalance"),
      `suggestions=${r.suggestions.map((s) => s.category).join(",") || "none"}`
    );
  }

  // K. Missing allocation (buffer funded) → no rebalance, no missing_data
  //    (the Safety Buffer input is present, so nothing is "missing").
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(5000, 1000, 3), allocation: null }),
      FIXTURE_GENERATED_AT
    );
    add(
      "K: missing allocation → no rebalance, unavailable_reason undefined",
      !r.suggestions.some((s) => s.category === "rebalance") &&
        r.unavailable_reason === undefined,
      `suggestions=${r.suggestions.length} unavailable=${r.unavailable_reason}`
    );
  }

  // L. Rebalance amount below $50 → disabled rebalance, min_trade failed.
  {
    // total 400 × 10% = $40 < $50
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        totalUsd: 400,
        allocation: allocationFixture(400, 70, 10),
      }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions.find((x) => x.category === "rebalance");
    const minTrade = s?.guardrails.find((g) => g.code === "min_trade_size");
    add(
      "L: rebalance amount below $50 → disabled, min_trade failed",
      s?.action_kind === "disabled" &&
        s?.is_actionable === false &&
        s?.reason_codes.includes("below_min_size") === true &&
        minTrade?.status === "failed",
      `action=${s?.action_kind} reasons=${s?.reason_codes.join(",")} min_trade=${minTrade?.status}`
    );
  }

  // M. Partial pricing + funded + overweight → warning present, rebalance appears.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        allocation: allocationFixture(15000, 75, 15),
        anyUnpriced: true,
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "M: partial pricing → warning + rebalance appears",
      r.warnings.includes("partial_pricing") &&
        r.suggestions.some((s) => s.category === "rebalance"),
      `warnings=${r.warnings.join(",")} categories=${r.suggestions.map((s) => s.category).join(",")}`
    );
  }

  // N. Buffer funded + allocation within threshold (delta 5%) + no deployable
  //    assets → On Track. (Empty positions so no staking/stable_yield fires.)
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3), // funded
        allocation: allocationFixture(15000, 62, 5),
        positions: [cryptoPosition()],
      }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions[0];
    add(
      "N: funded + delta 5% → On Track (informational)",
      r.suggestions.length === 1 &&
        s?.category === "on_track" &&
        s?.reason_codes.includes("portfolio_aligned") === true &&
        s?.is_actionable === false &&
        s?.is_top_pick === false &&
        s?.amount === undefined,
      `category=${s?.category} actionable=${s?.is_actionable} top_pick=${s?.is_top_pick}`
    );
  }

  // O. Buffer NOT funded + allocation within threshold → buffer only, no On Track.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(800, 1000, 3), // underfunded
        allocation: allocationFixture(15000, 62, 5),
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "O: buffer not funded + aligned → buffer only, no On Track",
      r.suggestions.length === 1 &&
        r.suggestions[0]?.category === "buffer" &&
        !r.suggestions.some((s) => s.category === "on_track"),
      `categories=${r.suggestions.map((s) => s.category).join(",")}`
    );
  }

  // P. Buffer funded + rebalance threshold met (delta 15%) → Rebalance only.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        allocation: allocationFixture(15000, 75, 15),
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "P: funded + delta 15% → rebalance only, no On Track",
      r.suggestions.length === 1 &&
        r.suggestions[0]?.category === "rebalance" &&
        !r.suggestions.some((s) => s.category === "on_track"),
      `categories=${r.suggestions.map((s) => s.category).join(",")}`
    );
  }

  // Q. Missing allocation (buffer funded) → no On Track, no missing_data
  //    (the Safety Buffer input is present, so nothing required is missing).
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(5000, 1000, 3), allocation: null }),
      FIXTURE_GENERATED_AT
    );
    add(
      "Q: missing allocation → no On Track, unavailable_reason undefined",
      !r.suggestions.some((s) => s.category === "on_track") &&
        r.unavailable_reason === undefined,
      `suggestions=${r.suggestions.length} unavailable=${r.unavailable_reason}`
    );
  }

  // R. Partial pricing + otherwise aligned + no deployable assets → warning +
  //    On Track. (Empty positions so no staking/stable_yield fires.)
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        allocation: allocationFixture(15000, 62, 5),
        anyUnpriced: true,
        positions: [cryptoPosition()],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "R: partial pricing + aligned → warning + On Track",
      r.warnings.includes("partial_pricing") &&
        r.suggestions.some((s) => s.category === "on_track"),
      `warnings=${r.warnings.join(",")} categories=${r.suggestions.map((s) => s.category).join(",")}`
    );
  }

  // S. Missing Safety Buffer → no On Track + unavailable_reason missing_data.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: null, allocation: allocationFixture(15000, 62, 5) }),
      FIXTURE_GENERATED_AT
    );
    add(
      "S: missing safety buffer → no On Track, missing_data",
      !r.suggestions.some((s) => s.category === "on_track") &&
        r.unavailable_reason === "missing_data",
      `suggestions=${r.suggestions.length} unavailable=${r.unavailable_reason}`
    );
  }

  // T. Underfunded buffer, actionable amount → Buffer is Top Pick.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(800, 1000, 3) }), // shortfall 2200
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions[0];
    add(
      "T: underfunded buffer actionable → buffer is Top Pick",
      s?.category === "buffer" && s?.is_top_pick === true && topPickCount(r.suggestions) === 1,
      `category=${s?.category} top_pick=${s?.is_top_pick} count=${topPickCount(r.suggestions)}`
    );
  }

  // U. Underfunded buffer below minimum (disabled) → no Top Pick.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(2975, 1000, 3) }), // shortfall 25
      FIXTURE_GENERATED_AT
    );
    add(
      "U: disabled buffer → no Top Pick",
      r.suggestions[0]?.action_kind === "disabled" &&
        topPickCount(r.suggestions) === 0,
      `action=${r.suggestions[0]?.action_kind} count=${topPickCount(r.suggestions)}`
    );
  }

  // V. Funded + rebalance actionable → Rebalance is Top Pick.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        allocation: allocationFixture(15000, 75, 15),
      }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions.find((x) => x.category === "rebalance");
    add(
      "V: funded + rebalance actionable → rebalance is Top Pick",
      s?.is_top_pick === true && topPickCount(r.suggestions) === 1,
      `top_pick=${s?.is_top_pick} count=${topPickCount(r.suggestions)}`
    );
  }

  // W. Funded + On Track only (no deployable assets) → no Top Pick.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(5000, 1000, 3),
        allocation: allocationFixture(15000, 62, 5),
        positions: [cryptoPosition()],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "W: On Track only → no Top Pick",
      r.suggestions[0]?.category === "on_track" &&
        topPickCount(r.suggestions) === 0,
      `category=${r.suggestions[0]?.category} count=${topPickCount(r.suggestions)}`
    );
  }

  // X. Multiple eligible candidates → Buffer beats Rebalance regardless of order.
  {
    const buffer = makeCandidate("top_up_buffer", "buffer", 0.3, 0.3);
    const rebalance = makeCandidate("rebalance_to_plan", "rebalance", 0.9, 0.9);
    const ranked = selectTopPick([rebalance, buffer]); // rebalance listed first
    const winner = ranked.find((s) => s.is_top_pick);
    add(
      "X: buffer beats rebalance even with higher rebalance scores",
      winner?.category === "buffer" && topPickCount(ranked) === 1,
      `winner=${winner?.category} count=${topPickCount(ranked)}`
    );
  }

  // Y. Same-category tie-breaks: impact → urgency → efficiency → id.
  {
    // impact wins
    const impactWin = selectTopPick([
      makeCandidate("rebalance_b", "rebalance", 0.5, 0.9, 0.9),
      makeCandidate("rebalance_a", "rebalance", 0.6, 0.1, 0.1),
    ]);
    const impactWinner = impactWin.find((s) => s.is_top_pick)?.id;

    // impact tied → urgency wins
    const urgencyWin = selectTopPick([
      makeCandidate("rebalance_a", "rebalance", 0.6, 0.2),
      makeCandidate("rebalance_b", "rebalance", 0.6, 0.8),
    ]);
    const urgencyWinner = urgencyWin.find((s) => s.is_top_pick)?.id;

    // impact + urgency tied → efficiency wins (null treated as 0)
    const effWin = selectTopPick([
      makeCandidate("rebalance_a", "rebalance", 0.6, 0.6, null),
      makeCandidate("rebalance_b", "rebalance", 0.6, 0.6, 0.4),
    ]);
    const effWinner = effWin.find((s) => s.is_top_pick)?.id;

    // all tied → lowest id wins
    const idWin = selectTopPick([
      makeCandidate("rebalance_z", "rebalance", 0.6, 0.6, 0.5),
      makeCandidate("rebalance_a", "rebalance", 0.6, 0.6, 0.5),
    ]);
    const idWinner = idWin.find((s) => s.is_top_pick)?.id;

    add(
      "Y: same-category tie-breaks impact→urgency→efficiency→id",
      impactWinner === "rebalance_a" &&
        urgencyWinner === "rebalance_b" &&
        effWinner === "rebalance_b" &&
        idWinner === "rebalance_a",
      `impact=${impactWinner} urgency=${urgencyWinner} eff=${effWinner} id=${idWinner}`
    );
  }

  // Z. No actionable suggestions → all is_top_pick false, and inputs are not
  //    mutated (a pre-set input flag stays as it was; only the output changes).
  {
    const disabled = makeCandidate("top_up_buffer", "buffer", 0.9, 0.9);
    disabled.action_kind = "disabled";
    disabled.is_actionable = false;
    disabled.is_top_pick = true; // stray flag the selector must NOT trust
    const onTrack = makeCandidate("on_track", "on_track", 0, 0);
    onTrack.action_kind = "informational";
    onTrack.is_actionable = false;
    const ranked = selectTopPick([disabled, onTrack]);
    add(
      "Z: no actionable suggestions → all output false, input unmutated",
      topPickCount(ranked) === 0 && disabled.is_top_pick === true,
      `outputCount=${topPickCount(ranked)} inputStillTrue=${disabled.is_top_pick === true}`
    );
  }

  return checks;
}

/** Count of suggestions flagged Top Pick (must be 0 or 1). */
function topPickCount(suggestions: EngineSuggestion[]): number {
  return suggestions.filter((s) => s.is_top_pick).length;
}

/** Minimal actionable candidate for direct selectTopPick tests. */
function makeCandidate(
  id: string,
  category: EngineSuggestion["category"],
  impact: number,
  urgency: number,
  efficiency: number | null = null
): EngineSuggestion {
  return {
    id,
    category,
    reason_codes: [],
    title_key: "x",
    description_key: "x",
    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false,
    scores: { impact, urgency, efficiency },
    guardrails: [],
    engine_version: "fixture",
    timestamp: FIXTURE_GENERATED_AT,
  };
}

/* ------------------------------------------------------------------ *
 * Step 7A — mapper checks (EngineSuggestion → SuggestionCardState).
 * Cases A–J use the Ma prefix to stay distinct from the engine A–Z.
 * ------------------------------------------------------------------ */
export function runMapperFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const engineCard = (args: FixtureArgs) => {
    const r = runSuggestionEngine(inputsFor(args), FIXTURE_GENERATED_AT);
    return { card: r.suggestions[0] ? toSuggestionCard(r.suggestions[0]) : undefined, r };
  };

  // Ma. Buffer actionable → title/description/amount, review-only, Top Pick true.
  {
    const { card } = engineCard({ safetyBuffer: bufferFixture(800, 1000, 3) }); // shortfall 2200
    add(
      "Ma: buffer actionable → mapped card (title, amount, review-only, top pick)",
      card?.title === "Top Up Your Safety Buffer" &&
        card?.description === "Increase your stablecoin reserve. Your Safety Buffer is below target." &&
        card?.impact_text.includes("$2,200") === true &&
        card?.actionability === "actionable" &&
        card?.cta.label === "Review" &&
        card?.cta.executes_transaction === false &&
        card?.is_top_pick === true,
      `title="${card?.title}" impact="${card?.impact_text}" actionability=${card?.actionability} top_pick=${card?.is_top_pick}`
    );
  }

  // Mb. Buffer below minimum → disabled card, no Top Pick, reason text.
  {
    const { card } = engineCard({ safetyBuffer: bufferFixture(2975, 1000, 3) }); // shortfall 25
    add(
      "Mb: buffer below min → disabled card, no Top Pick, reason text",
      card?.actionability === "disabled" &&
        card?.status === "disabled" &&
        card?.is_top_pick === false &&
        card?.disabled_reason_text === "Below minimum suggestion size.",
      `actionability=${card?.actionability} status=${card?.status} reason="${card?.disabled_reason_text}"`
    );
  }

  // Mc. Rebalance overweight → bucket-level card, no token names invented.
  {
    const { card } = engineCard({
      safetyBuffer: bufferFixture(5000, 1000, 3),
      allocation: allocationFixture(15000, 75, 15),
    });
    const noTokens = !/\b(SOL|USDC|BONK|sell|buy)\b/i.test(
      `${card?.title} ${card?.description}`
    );
    add(
      "Mc: rebalance overweight → bucket-level card, no token names",
      card?.title === "Rebalance Your Allocation" &&
        card?.description ===
          "Your crypto allocation is above your target. Review whether you want to move part of it toward stablecoins." &&
        noTokens,
      `title="${card?.title}" noTokens=${noTokens}`
    );
  }

  // Md. Rebalance underweight → bucket-level card, no token names invented.
  {
    const { card } = engineCard({
      safetyBuffer: bufferFixture(5000, 1000, 3),
      allocation: allocationFixture(15000, 45, -15),
    });
    const noTokens = !/\b(SOL|USDC|BONK|sell|buy)\b/i.test(
      `${card?.title} ${card?.description}`
    );
    add(
      "Md: rebalance underweight → bucket-level card, no token names",
      card?.title === "Rebalance Your Allocation" &&
        card?.description ===
          "Your crypto allocation is below your target. Review whether you want to move excess stablecoins toward crypto exposure." &&
        noTokens,
      `title="${card?.title}" noTokens=${noTokens}`
    );
  }

  // Me. On Track → informational card, no CTA, no Top Pick.
  {
    const { card } = engineCard({
      safetyBuffer: bufferFixture(5000, 1000, 3),
      allocation: allocationFixture(15000, 62, 5),
      positions: [cryptoPosition()],
    });
    add(
      "Me: On Track → informational card, no CTA, no Top Pick",
      card?.title === "Your Plan Is On Track" &&
        card?.actionability === "informational" &&
        card?.cta.label === "" &&
        card?.is_top_pick === false,
      `title="${card?.title}" actionability=${card?.actionability} cta="${card?.cta.label}"`
    );
  }

  // Mf. Missing copy key → safe fallback (never invented copy).
  {
    const bogus = makeCandidate("bogus", "buffer", 0.5, 0.5); // title_key/description_key = "x"
    const card = toSuggestionCard(bogus);
    add(
      "Mf: missing copy key → safe fallback",
      card.title === "Suggestion unavailable" && card.description === "Suggestion unavailable",
      `title="${card.title}"`
    );
  }

  // Mg. Engine order preserved: [buffer, rebalance, on_track] → same id order.
  {
    const list: EngineSuggestion[] = [
      makeCandidate("top_up_buffer", "buffer", 0.9, 0.9),
      makeCandidate("rebalance_to_plan", "rebalance", 0.5, 0.5),
      makeCandidate("on_track", "on_track", 0, 0),
    ];
    const ids = toSuggestionCards(list).map((c) => c.id);
    add(
      "Mg: engine order preserved (buffer, rebalance, on_track)",
      ids.join(",") === "top_up_buffer,rebalance_to_plan,on_track",
      `order=${ids.join(",")}`
    );
  }

  // Mh. Top Pick flag preserved exactly, even when it appears SECOND.
  {
    const buffer = makeCandidate("top_up_buffer", "buffer", 0.9, 0.9);
    const rebalance = makeCandidate("rebalance_to_plan", "rebalance", 0.5, 0.5);
    rebalance.is_top_pick = true; // Top Pick at index 1
    const cards = toSuggestionCards([buffer, rebalance]);
    add(
      "Mh: Top Pick preserved in place (not moved to first)",
      cards[0].id === "top_up_buffer" &&
        cards[0].is_top_pick === false &&
        cards[1].id === "rebalance_to_plan" &&
        cards[1].is_top_pick === true &&
        cards[1].badge === "Top Pick",
      `order=${cards.map((c) => c.id).join(",")} tp1=${cards[1].is_top_pick}`
    );
  }

  // Mi. Mapper does not sort: an intentionally non-canonical order is preserved.
  {
    const list: EngineSuggestion[] = [
      makeCandidate("on_track", "on_track", 0, 0),
      makeCandidate("rebalance_to_plan", "rebalance", 0.5, 0.5),
      makeCandidate("top_up_buffer", "buffer", 0.9, 0.9),
    ];
    const ids = toSuggestionCards(list).map((c) => c.id);
    add(
      "Mi: mapper does not re-sort to canonical order",
      ids.join(",") === "on_track,rebalance_to_plan,top_up_buffer",
      `order=${ids.join(",")}`
    );
  }

  // Mj. Mapper is pure — it does not mutate input and does not touch demo
  //     fixtures (the mapper module imports no demo data; see grep in
  //     validation). Here: input objects and array are unchanged after mapping.
  {
    const input: EngineSuggestion[] = [
      makeCandidate("top_up_buffer", "buffer", 0.9, 0.9),
      makeCandidate("rebalance_to_plan", "rebalance", 0.5, 0.5),
    ];
    const beforeIds = input.map((s) => s.id).join(",");
    const beforeTp = input.map((s) => s.is_top_pick).join(",");
    const cards = toSuggestionCards(input);
    const afterIds = input.map((s) => s.id).join(",");
    const afterTp = input.map((s) => s.is_top_pick).join(",");
    add(
      "Mj: mapper pure — input array/objects unchanged (demo unaffected)",
      beforeIds === afterIds && beforeTp === afterTp && cards.length === input.length,
      `inputUnchanged=${beforeIds === afterIds && beforeTp === afterTp}`
    );
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 9A — contract checks for the CONTRACTED future categories
 * (capital_efficiency / staking / stable_yield / position_optimization).
 * Types + ordering + mapper fallback only; NO trigger logic.
 * ------------------------------------------------------------------ */
const CONTRACT_CATEGORIES = [
  "capital_efficiency",
  "staking",
  "stable_yield",
  "position_optimization",
] as const;

/** A minimal actionable suggestion for a contracted category, real copy keys. */
function catCandidate(
  category: EngineSuggestion["category"],
  overrides: Partial<EngineSuggestion> = {}
): EngineSuggestion {
  return {
    id: category,
    category,
    reason_codes: [],
    title_key: `suggestion.${category}.title`,
    description_key: `suggestion.${category}.description`,
    action_kind: "review_only",
    is_actionable: true,
    is_top_pick: false,
    scores: { impact: 0.5, urgency: 0.5, efficiency: null },
    guardrails: [],
    engine_version: "fixture",
    timestamp: FIXTURE_GENERATED_AT,
    ...overrides,
  };
}

export function runContractFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  // A. New categories typecheck + map to a valid, resolved-copy card.
  {
    const cards = CONTRACT_CATEGORIES.map((c) => toSuggestionCard(catCandidate(c)));
    const allResolved = cards.every((c) => c.title && c.title !== "Suggestion unavailable");
    add(
      "9A-A: new categories map with resolved (non-fallback) copy",
      cards.length === 4 && allResolved,
      `titles=${cards.map((c) => c.title).join(" | ")}`
    );
  }

  // B. Top Pick can select staking once buffer/rebalance are absent.
  {
    const ranked = selectTopPick([catCandidate("staking")]);
    const winner = ranked.find((s) => s.is_top_pick);
    add(
      "9A-B: staking becomes Top Pick when it is the only candidate",
      winner?.category === "staking",
      `winner=${winner?.category}`
    );
  }

  // C. Buffer beats every new category.
  {
    const ranked = selectTopPick([
      catCandidate("capital_efficiency"),
      catCandidate("staking"),
      catCandidate("stable_yield"),
      catCandidate("position_optimization"),
      makeCandidate("top_up_buffer", "buffer", 0.2, 0.2),
    ]);
    add(
      "9A-C: buffer beats all new categories",
      ranked.find((s) => s.is_top_pick)?.category === "buffer",
      `winner=${ranked.find((s) => s.is_top_pick)?.category}`
    );
  }

  // D. Rebalance beats staking / stable_yield / capital_efficiency.
  {
    const ranked = selectTopPick([
      catCandidate("staking"),
      catCandidate("stable_yield"),
      catCandidate("capital_efficiency"),
      makeCandidate("rebalance_to_plan", "rebalance", 0.2, 0.2),
    ]);
    add(
      "9A-D: rebalance beats new lower-priority categories",
      ranked.find((s) => s.is_top_pick)?.category === "rebalance",
      `winner=${ranked.find((s) => s.is_top_pick)?.category}`
    );
  }

  // E. On Track is still never Top Pick (even alongside new categories).
  {
    const onTrack = catCandidate("on_track", { action_kind: "informational", is_actionable: false });
    const ranked = selectTopPick([onTrack]);
    add(
      "9A-E: on_track never Top Pick",
      ranked.every((s) => !s.is_top_pick),
      `topPickCount=${ranked.filter((s) => s.is_top_pick).length}`
    );
  }

  // F. Mapper safely maps every new category (valid card, category/type set).
  {
    const ok = CONTRACT_CATEGORIES.every((c) => {
      const card = toSuggestionCard(catCandidate(c));
      return card.id === c && card.type !== "" && card.category !== "";
    });
    add("9A-F: mapper maps every new category to a valid card", ok, `categories=${CONTRACT_CATEGORIES.join(",")}`);
  }

  // G. New-category cards are non-transactional.
  {
    const ok = CONTRACT_CATEGORIES.every((c) => {
      const { cta } = toSuggestionCard(catCandidate(c));
      return (
        cta.executes_transaction === false &&
        cta.requires_wallet_signature === false &&
        cta.completion_on_click === false &&
        cta.action === null
      );
    });
    add("9A-G: new-category cards are non-transactional", ok, "all safety booleans false, action null");
  }

  // H. UI order preserved when new categories are passed in engine order.
  {
    const list: EngineSuggestion[] = [
      makeCandidate("top_up_buffer", "buffer", 0.5, 0.5),
      makeCandidate("rebalance_to_plan", "rebalance", 0.5, 0.5),
      catCandidate("capital_efficiency"),
      catCandidate("staking"),
      catCandidate("stable_yield"),
      catCandidate("position_optimization"),
      catCandidate("on_track", { action_kind: "informational", is_actionable: false }),
    ];
    const ids = toSuggestionCards(list).map((c) => c.id);
    const expected =
      "top_up_buffer,rebalance_to_plan,capital_efficiency,staking,stable_yield,position_optimization,on_track";
    add("9A-H: mapper preserves full-category engine order", ids.join(",") === expected, `order=${ids.join(",")}`);
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 9B — idle SOL staking trigger.
 * ------------------------------------------------------------------ */
export function runStakingFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });
  const cats = (r: ReturnType<typeof runSuggestionEngine>) =>
    r.suggestions.map((s) => s.category).join(",") || "none";
  const has = (r: ReturnType<typeof runSuggestionEngine>, c: string) =>
    r.suggestions.some((s) => s.category === c);

  const fundedBuffer = () => bufferFixture(5000, 1000, 3); // funded, zero excess
  const aligned = () => allocationFixture(15000, 62, 5); // delta 5% → no rebalance
  const offTarget = () => allocationFixture(15000, 75, 15); // delta 15% → rebalance

  // 9B-A. Underfunded buffer + idle SOL → Buffer only, no staking.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: bufferFixture(800, 1000, 3), positions: [solPosition(10)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9B-A: underfunded buffer + idle SOL → buffer only, no staking",
      cats(r) === "buffer" && !has(r, "staking"),
      `categories=${cats(r)}`
    );
  }

  // 9B-B. Funded + aligned (no rebalance) + eligible SOL → Staking Top Pick, no On Track.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: fundedBuffer(), allocation: aligned(), positions: [solPosition(10)] }),
      FIXTURE_GENERATED_AT
    );
    const staking = r.suggestions.find((s) => s.category === "staking");
    add(
      "9B-B: funded + no rebalance + eligible SOL → staking Top Pick, no On Track",
      cats(r) === "staking" &&
        staking?.is_top_pick === true &&
        !has(r, "on_track") &&
        staking?.amount?.valueUsd === 9.9 * 75,
      `categories=${cats(r)} topPick=${staking?.is_top_pick} amount=${staking?.amount?.valueUsd}`
    );
  }

  // 9B-C. Funded + rebalance + eligible SOL → Rebalance first (Top Pick), Staking second.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: fundedBuffer(), allocation: offTarget(), positions: [solPosition(10)] }),
      FIXTURE_GENERATED_AT
    );
    const reb = r.suggestions.find((s) => s.category === "rebalance");
    const stk = r.suggestions.find((s) => s.category === "staking");
    add(
      "9B-C: funded + rebalance + SOL → rebalance first/Top Pick, staking second",
      cats(r) === "rebalance,staking" &&
        reb?.is_top_pick === true &&
        stk?.is_top_pick === false,
      `categories=${cats(r)} rebTop=${reb?.is_top_pick} stkTop=${stk?.is_top_pick}`
    );
  }

  // 9B-D. Funded + only the reserve (0.1 SOL) → no staking; aligned → On Track.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: fundedBuffer(), allocation: aligned(), positions: [solPosition(0.1)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9B-D: funded + only 0.1 SOL → no staking, On Track",
      !has(r, "staking") && cats(r) === "on_track",
      `categories=${cats(r)}`
    );
  }

  // 9B-E. Funded + eligible SOL worth < $50 → no staking; aligned → On Track.
  {
    // 0.5 SOL @ $75 → eligible 0.4 SOL = $30 < $50
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: fundedBuffer(), allocation: aligned(), positions: [solPosition(0.5)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9B-E: funded + eligible value < $50 → no staking, On Track",
      !has(r, "staking") && cats(r) === "on_track",
      `categories=${cats(r)}`
    );
  }

  // 9B-F. Only LSTs (JupSOL/mSOL), no liquid SOL → no staking.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: fundedBuffer(),
        allocation: aligned(),
        positions: [lstPosition("JupSOL", 100), lstPosition("mSOL", 50)],
      }),
      FIXTURE_GENERATED_AT
    );
    add("9B-F: only LSTs, no liquid SOL → no staking", !has(r, "staking"), `categories=${cats(r)}`);
  }

  // 9B-G. SOL present but unpriced → no staking, no invented amount.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: fundedBuffer(),
        allocation: aligned(),
        positions: [solPosition(10, { priced: false })],
      }),
      FIXTURE_GENERATED_AT
    );
    add("9B-G: SOL unpriced → no staking", !has(r, "staking"), `categories=${cats(r)}`);
  }

  // 9B-H. Liquid priced WSOL (token) → counts as liquid SOL → staking emitted.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: fundedBuffer(),
        allocation: aligned(),
        positions: [solPosition(10, { symbol: "WSOL", type: "token" })],
      }),
      FIXTURE_GENERATED_AT
    );
    add("9B-H: liquid priced WSOL → staking emitted", has(r, "staking"), `categories=${cats(r)}`);
  }

  // 9B-I. Partial pricing + priced SOL → staking still emits + partial_pricing warning.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: fundedBuffer(),
        allocation: aligned(),
        positions: [solPosition(10)],
        anyUnpriced: true,
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9B-I: partial pricing + priced SOL → staking + warning",
      has(r, "staking") && r.warnings.includes("partial_pricing"),
      `categories=${cats(r)} warnings=${r.warnings.join(",")}`
    );
  }

  // 9B-J. Mapper renders the staking card safely.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: fundedBuffer(), allocation: aligned(), positions: [solPosition(10)] }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions.find((x) => x.category === "staking");
    const card = s ? toSuggestionCard(s) : undefined;
    add(
      "9B-J: staking card maps safely (copy, amount, review-only, non-transactional)",
      card?.title === "Put Idle SOL to Work" &&
        card?.description === "You have liquid SOL that may be eligible for staking or liquid staking." &&
        card?.impact_text.includes("Eligible SOL to review") === true &&
        card?.cta.label === "Review" &&
        card?.cta.executes_transaction === false &&
        card?.cta.requires_wallet_signature === false &&
        card?.cta.action === null,
      `title="${card?.title}" impact="${card?.impact_text}" cta="${card?.cta.label}"`
    );
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 9C (corrected) — stablecoin yield trigger. Eligible amount is the FULL
 * liquid wallet stable value (approved yield stays Safety-Buffer-eligible, so
 * it is NOT reduced by the buffer or allocation target). Funded buffer + no
 * Rebalance + liquid wallet stables ≥ $100.
 * ------------------------------------------------------------------ */
export function runStableYieldFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });
  const cats = (r: ReturnType<typeof runSuggestionEngine>) =>
    r.suggestions.map((s) => s.category).join(",") || "none";
  const has = (r: ReturnType<typeof runSuggestionEngine>, c: string) =>
    r.suggestions.some((s) => s.category === c);

  const funded = () => bufferFixture(5000, 1000, 3); // funded (target $3,000)
  const aligned = () => allocationFixture(15000, 62, 2); // no rebalance
  const offTarget = () => allocationFixture(15000, 75, 15); // rebalance applies

  // 9C-A. Underfunded buffer + liquid USDC → Buffer only.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(800, 1000, 3),
        allocation: aligned(),
        positions: [stablePosition("USDC", 10000)],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9C-A: underfunded buffer + liquid USDC → buffer only",
      cats(r) === "buffer" && !has(r, "stable_yield"),
      `categories=${cats(r)}`
    );
  }

  // 9C-B. Funded + no rebalance + liquid USDC ≥ $100 → stable_yield Top Pick,
  //       amount = FULL liquid wallet stable value (no buffer subtraction).
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [stablePosition("USDC", 10000)],
      }),
      FIXTURE_GENERATED_AT
    );
    const sy = r.suggestions.find((s) => s.category === "stable_yield");
    add(
      "9C-B: funded + no rebalance + liquid USDC → stable_yield Top Pick, full amount",
      cats(r) === "stable_yield" &&
        sy?.is_top_pick === true &&
        sy?.amount?.valueUsd === 10000 &&
        !has(r, "on_track"),
      `categories=${cats(r)} topPick=${sy?.is_top_pick} amount=${sy?.amount?.valueUsd}`
    );
  }

  // 9C-C. Funded + Rebalance applies + liquid USDC → Rebalance only, no stable_yield.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: offTarget(),
        positions: [stablePosition("USDC", 10000)],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9C-C: funded + rebalance + liquid USDC → rebalance only, no stable_yield",
      has(r, "rebalance") && !has(r, "stable_yield"),
      `categories=${cats(r)}`
    );
  }

  // 9C-D. Funded + Staking + Stable Yield + no Rebalance → Staking first (Top Pick), stable_yield second.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [solPosition(10), stablePosition("USDC", 10000)],
      }),
      FIXTURE_GENERATED_AT
    );
    const stk = r.suggestions.find((s) => s.category === "staking");
    const sy = r.suggestions.find((s) => s.category === "stable_yield");
    add(
      "9C-D: staking + stable_yield → staking first/Top Pick, stable_yield second",
      cats(r) === "staking,stable_yield" &&
        stk?.is_top_pick === true &&
        sy?.is_top_pick === false,
      `categories=${cats(r)} stkTop=${stk?.is_top_pick} syTop=${sy?.is_top_pick}`
    );
  }

  // 9C-E. Funded + liquid stable value < $100 → no stable_yield → On Track.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [stablePosition("USDC", 50)],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9C-E: funded + liquid stable < $100 → no stable_yield, On Track",
      !has(r, "stable_yield") && cats(r) === "on_track",
      `categories=${cats(r)}`
    );
  }

  // 9C-F. Stables held in a PROTOCOL position (not liquid wallet) → no new stable_yield.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [stablePosition("USDC", 10000, { type: "protocol", source: "kamino" })],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9C-F: stables only in protocol positions → no stable_yield",
      !has(r, "stable_yield"),
      `categories=${cats(r)}`
    );
  }

  // 9C-G. Unknown stable-like wallet token (not in approved set) → no stable_yield.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [stablePosition("USDX", 10000)], // USDX not in STABLE_SYMBOLS
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9C-G: unknown stable-like token → no stable_yield",
      !has(r, "stable_yield"),
      `categories=${cats(r)}`
    );
  }

  // 9C-H. Stable price/value missing → no stable_yield, no invented amount.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [stablePosition("USDC", 10000, { priced: false })],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9C-H: unpriced stable → no stable_yield",
      !has(r, "stable_yield"),
      `categories=${cats(r)}`
    );
  }

  // 9C-I. Partial pricing + priced wallet USDC → stable_yield still emits + warning.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [stablePosition("USDC", 10000)],
        anyUnpriced: true,
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9C-I: partial pricing + priced USDC → stable_yield + warning",
      has(r, "stable_yield") && r.warnings.includes("partial_pricing"),
      `categories=${cats(r)} warnings=${r.warnings.join(",")}`
    );
  }

  // 9C-J. Mapper renders the stable_yield card safely.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [stablePosition("USDC", 10000)],
      }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions.find((x) => x.category === "stable_yield");
    const card = s ? toSuggestionCard(s) : undefined;
    add(
      "9C-J: stable_yield card maps safely (copy, amount, review-only, non-transactional)",
      card?.title === "Put Stablecoins to Work" &&
        card?.description ===
          "You have liquid stablecoins that may be eligible for conservative yield options while still supporting your Safety Buffer." &&
        card?.impact_text.includes("Eligible stablecoins to review") === true &&
        card?.cta.label === "Review" &&
        card?.cta.executes_transaction === false &&
        card?.cta.requires_wallet_signature === false &&
        card?.cta.action === null,
      `title="${card?.title}" impact="${card?.impact_text}" cta="${card?.cta.label}"`
    );
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 9D — existing position-optimization review trigger.
 * ------------------------------------------------------------------ */
export function runPositionOptimizationFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });
  const cats = (r: ReturnType<typeof runSuggestionEngine>) =>
    r.suggestions.map((s) => s.category).join(",") || "none";
  const has = (r: ReturnType<typeof runSuggestionEngine>, c: string) =>
    r.suggestions.some((s) => s.category === c);
  const posOpt = (r: ReturnType<typeof runSuggestionEngine>) =>
    r.suggestions.find((s) => s.category === "position_optimization");

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2); // no rebalance
  const offTarget = () => allocationFixture(15000, 75, 15); // rebalance applies

  // 9D-A. Underfunded buffer + flagged yield position → Buffer only.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(800, 1000, 3),
        allocation: aligned(),
        positions: [yieldPosition(5000, null)],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9D-A: underfunded buffer + flagged position → buffer only",
      cats(r) === "buffer" && !has(r, "position_optimization"),
      `categories=${cats(r)}`
    );
  }

  // 9D-B. Funded + no higher candidate + deployed position missing APY ≥ $100 → Top Pick.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [yieldPosition(5000, null)],
      }),
      FIXTURE_GENERATED_AT
    );
    const s = posOpt(r);
    add(
      "9D-B: funded + missing-APY position → position_optimization Top Pick",
      cats(r) === "position_optimization" &&
        s?.is_top_pick === true &&
        s?.reason_codes.includes("missing_apy_data") === true &&
        s?.amount?.valueUsd === 5000,
      `categories=${cats(r)} topPick=${s?.is_top_pick} reasons=${s?.reason_codes.join(",")}`
    );
  }

  // 9D-C. Funded + deployed position APY < 1% and ≥ $100 → low_yield_position.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [yieldPosition(5000, 0.5)],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9D-C: funded + low APY position → low_yield_position",
      posOpt(r)?.reason_codes.includes("low_yield_position") === true,
      `reasons=${posOpt(r)?.reason_codes.join(",")}`
    );
  }

  // 9D-D. Funded + healthy position (APY ≥ 1%, not concentrated) → no position_optimization → On Track.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [yieldPosition(2000, 5)],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9D-D: funded + healthy position → no position_optimization, On Track",
      !has(r, "position_optimization") && cats(r) === "on_track",
      `categories=${cats(r)}`
    );
  }

  // 9D-E. Funded + concentrated position (≥ 50% of portfolio, ≥ $1,000) → concentration_risk.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [yieldPosition(8000, 5)], // 8000 / 15000 = 53%, healthy APY
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9D-E: funded + concentrated position → concentration_risk",
      posOpt(r)?.reason_codes.includes("concentration_risk") === true &&
        posOpt(r)?.reason_codes.includes("low_yield_position") === false,
      `reasons=${posOpt(r)?.reason_codes.join(",")}`
    );
  }

  // 9D-F. Flagged deployed position below $100 → no position_optimization.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [yieldPosition(50, null)],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9D-F: deployed position < $100 → no position_optimization, On Track",
      !has(r, "position_optimization") && cats(r) === "on_track",
      `categories=${cats(r)}`
    );
  }

  // 9D-G. Liquid wallet token with missing APY → not a deployed position → none.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [cryptoPosition(5000)], // type token, wallet — not deployed
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9D-G: liquid wallet token → no position_optimization",
      !has(r, "position_optimization"),
      `categories=${cats(r)}`
    );
  }

  // 9D-H. Unpriced deployed position → no position_optimization, no invented amount.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [yieldPosition(5000, null, { priced: false })],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9D-H: unpriced deployed position → no position_optimization",
      !has(r, "position_optimization"),
      `categories=${cats(r)}`
    );
  }

  // 9D-I. Rebalance + flagged position → Rebalance first (Top Pick), position_optimization second.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: offTarget(),
        positions: [yieldPosition(5000, null)],
      }),
      FIXTURE_GENERATED_AT
    );
    const reb = r.suggestions.find((s) => s.category === "rebalance");
    add(
      "9D-I: rebalance + flagged position → rebalance first/Top Pick, position_opt second",
      cats(r) === "rebalance,position_optimization" &&
        reb?.is_top_pick === true &&
        posOpt(r)?.is_top_pick === false,
      `categories=${cats(r)} rebTop=${reb?.is_top_pick}`
    );
  }

  // 9D-J. Staking + Stable Yield + Position Optimization, no Rebalance → engine order, Staking Top Pick.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [solPosition(10), stablePosition("USDC", 10000), yieldPosition(5000, null)],
      }),
      FIXTURE_GENERATED_AT
    );
    const stk = r.suggestions.find((s) => s.category === "staking");
    add(
      "9D-J: staking + stable_yield + position_opt → engine order, staking Top Pick",
      cats(r) === "staking,stable_yield,position_optimization" && stk?.is_top_pick === true,
      `categories=${cats(r)} stkTop=${stk?.is_top_pick}`
    );
  }

  // 9D-K. Mapper renders the position_optimization card safely.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [yieldPosition(5000, null)],
      }),
      FIXTURE_GENERATED_AT
    );
    const s = posOpt(r);
    const card = s ? toSuggestionCard(s) : undefined;
    add(
      "9D-K: position_optimization card maps safely (copy, amount, review-only, non-transactional)",
      card?.title === "Review Existing Yield Positions" &&
        card?.description ===
          "Some existing positions may need review based on yield, concentration, or missing data." &&
        card?.impact_text.includes("Positions to review") === true &&
        card?.cta.label === "Review" &&
        card?.cta.executes_transaction === false &&
        card?.cta.requires_wallet_signature === false &&
        card?.cta.action === null,
      `title="${card?.title}" impact="${card?.impact_text}" cta="${card?.cta.label}"`
    );
  }

  return checks;
}

/* ------------------------------------------------------------------ *
 * Step 9E — capital efficiency / idle assets trigger.
 * cryptoPosition() builds a priced liquid wallet BONK token = eligible idle
 * asset. Total priced value is 15,000, so the 2% share threshold is $300.
 * ------------------------------------------------------------------ */
export function runCapitalEfficiencyFixtureChecks(): FixtureCheck[] {
  const checks: FixtureCheck[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });
  const cats = (r: ReturnType<typeof runSuggestionEngine>) =>
    r.suggestions.map((s) => s.category).join(",") || "none";
  const has = (r: ReturnType<typeof runSuggestionEngine>, c: string) =>
    r.suggestions.some((s) => s.category === c);

  const funded = () => bufferFixture(5000, 1000, 3);
  const aligned = () => allocationFixture(15000, 62, 2); // no rebalance
  const offTarget = () => allocationFixture(15000, 75, 15); // rebalance applies

  // 9E-A. Underfunded buffer + eligible idle token → Buffer only.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: bufferFixture(800, 1000, 3),
        allocation: aligned(),
        positions: [cryptoPosition(5000)],
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-A: underfunded buffer + idle token → buffer only",
      cats(r) === "buffer" && !has(r, "capital_efficiency"),
      `categories=${cats(r)}`
    );
  }

  // 9E-B. Funded + no higher candidate + idle token ≥ $100 and ≥ 2% → Top Pick.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [cryptoPosition(5000)] }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions.find((x) => x.category === "capital_efficiency");
    add(
      "9E-B: funded + idle token → capital_efficiency Top Pick, full amount",
      cats(r) === "capital_efficiency" &&
        s?.is_top_pick === true &&
        s?.amount?.valueUsd === 5000,
      `categories=${cats(r)} topPick=${s?.is_top_pick} amount=${s?.amount?.valueUsd}`
    );
  }

  // 9E-C. Funded + Rebalance applies + idle token → Rebalance first (Top Pick), capital_efficiency second.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: offTarget(), positions: [cryptoPosition(5000)] }),
      FIXTURE_GENERATED_AT
    );
    const reb = r.suggestions.find((s) => s.category === "rebalance");
    add(
      "9E-C: rebalance + idle token → rebalance first/Top Pick, capital_efficiency second",
      cats(r) === "rebalance,capital_efficiency" && reb?.is_top_pick === true,
      `categories=${cats(r)} rebTop=${reb?.is_top_pick}`
    );
  }

  // 9E-D. Funded + Capital Efficiency + Staking + Stable Yield, no Rebalance → engine order, capEff Top Pick.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [cryptoPosition(5000), solPosition(10), stablePosition("USDC", 10000)],
      }),
      FIXTURE_GENERATED_AT
    );
    const ce = r.suggestions.find((s) => s.category === "capital_efficiency");
    add(
      "9E-D: capEff + staking + stable_yield → engine order, capital_efficiency Top Pick",
      cats(r) === "capital_efficiency,staking,stable_yield" && ce?.is_top_pick === true,
      `categories=${cats(r)} ceTop=${ce?.is_top_pick}`
    );
  }

  // 9E-E. Idle token value < $100 → no capital_efficiency → On Track.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [cryptoPosition(50)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-E: idle token < $100 → no capital_efficiency, On Track",
      !has(r, "capital_efficiency") && cats(r) === "on_track",
      `categories=${cats(r)}`
    );
  }

  // 9E-F. Idle token ≥ $100 but < 2% of portfolio ($200 / 15,000 = 1.3%) → no capital_efficiency.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [cryptoPosition(200)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-F: idle token below 2% share → no capital_efficiency, On Track",
      !has(r, "capital_efficiency") && cats(r) === "on_track",
      `categories=${cats(r)}`
    );
  }

  // 9E-G. Only liquid SOL → no capital_efficiency (staking may apply).
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [solPosition(10)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-G: only liquid SOL → no capital_efficiency",
      !has(r, "capital_efficiency"),
      `categories=${cats(r)}`
    );
  }

  // 9E-H. Only liquid wallet stablecoins → no capital_efficiency (stable_yield may apply).
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [stablePosition("USDC", 10000)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-H: only stablecoins → no capital_efficiency",
      !has(r, "capital_efficiency"),
      `categories=${cats(r)}`
    );
  }

  // 9E-I. Only deployed positions → no capital_efficiency (position_optimization may apply).
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [yieldPosition(5000, null)] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-I: only deployed positions → no capital_efficiency",
      !has(r, "capital_efficiency"),
      `categories=${cats(r)}`
    );
  }

  // 9E-J. Unpriced idle token → no capital_efficiency, no invented amount.
  {
    const unpriced: WalletPosition = {
      id: "unpriced-bonk",
      source: "wallet",
      type: "token",
      symbol: "BONK",
      name: "Bonk",
      amount: "1000000",
      uiAmount: 1_000_000,
      decimals: 5,
      detection: "direct_wallet_balance",
      priceUsd: null,
      valueUsd: null,
    };
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [unpriced] }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-J: unpriced idle token → no capital_efficiency",
      !has(r, "capital_efficiency"),
      `categories=${cats(r)}`
    );
  }

  // 9E-K. Partial pricing + priced idle token → capital_efficiency + warning.
  {
    const r = runSuggestionEngine(
      inputsFor({
        safetyBuffer: funded(),
        allocation: aligned(),
        positions: [cryptoPosition(5000)],
        anyUnpriced: true,
      }),
      FIXTURE_GENERATED_AT
    );
    add(
      "9E-K: partial pricing + priced idle token → capital_efficiency + warning",
      has(r, "capital_efficiency") && r.warnings.includes("partial_pricing"),
      `categories=${cats(r)} warnings=${r.warnings.join(",")}`
    );
  }

  // 9E-L. Mapper renders the capital_efficiency card safely.
  {
    const r = runSuggestionEngine(
      inputsFor({ safetyBuffer: funded(), allocation: aligned(), positions: [cryptoPosition(5000)] }),
      FIXTURE_GENERATED_AT
    );
    const s = r.suggestions.find((x) => x.category === "capital_efficiency");
    const card = s ? toSuggestionCard(s) : undefined;
    add(
      "9E-L: capital_efficiency card maps safely (copy, amount, review-only, non-transactional)",
      card?.title === "Review Idle Assets" &&
        card?.description === "Some assets may not be contributing to your current plan." &&
        card?.impact_text.includes("Idle assets to review") === true &&
        card?.cta.label === "Review" &&
        card?.cta.executes_transaction === false &&
        card?.cta.requires_wallet_signature === false &&
        card?.cta.action === null,
      `title="${card?.title}" impact="${card?.impact_text}" cta="${card?.cta.label}"`
    );
  }

  return checks;
}

/** CLI entry: prints each check and exits non-zero on failure. */
export function printFixtureResults(): void {
  const checks = [
    ...runSuggestionEngineFixtureChecks(),
    ...runMapperFixtureChecks(),
    ...runContractFixtureChecks(),
    ...runStakingFixtureChecks(),
    ...runStableYieldFixtureChecks(),
    ...runPositionOptimizationFixtureChecks(),
    ...runCapitalEfficiencyFixtureChecks(),
  ];
  for (const c of checks) {
    // eslint-disable-next-line no-console
    console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}  (${c.detail})`);
  }
  const failed = checks.filter((c) => !c.pass).length;
  // eslint-disable-next-line no-console
  console.log(`${checks.length - failed}/${checks.length} fixture checks passed`);
  if (failed > 0 && typeof process !== "undefined") process.exitCode = 1;
}

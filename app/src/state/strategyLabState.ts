/**
 * strategyLabState — canonical copy + scenario data for the Strategy Lab page
 * (Trust → Strategy Lab). A proof-first simulator comparing AI-guided performance
 * against an unguided portfolio across historical market scenarios.
 *
 * DETERMINISTIC FIXTURE DATA: every number and note here is a fixed,
 * product-approved illustration of a historical scenario — nothing is computed,
 * fetched, or presented as the user's own portfolio or as a performance guarantee.
 */

export const STRATEGY_LAB_TITLE = "Strategy Lab";
export const STRATEGY_LAB_DESCRIPTION =
  "A proof-first simulator comparing WealthSmith guided performance against an unguided portfolio to demonstrate how planning and Safety Buffers preserve wealth during market volatility.";
export const STRATEGY_LAB_SELECTOR_LABEL = "Scenario Selector";
/** Placeholder body for scenarios whose data set has not shipped yet. */
export const STRATEGY_LAB_SCENARIO_PENDING = "This scenario is being prepared.";

/** One data point on a Strategy Lab series, with its optional hover story. */
export interface StrategyLabPoint {
  valueUsd: number;
  /** Approved delta-from-start display string (verbatim), e.g. "+65.75% from start". */
  deltaLabel?: string;
  /** Trend icon + tone beside the delta: "up" (success) or "down" (danger). */
  trend?: "up" | "down";
  /** Hover note: emphasized title + body copy. */
  note?: { title: string; body: string };
}

export interface StrategyLabSeries {
  id: string;
  label: string;
  /** Chart series color token (components/chart.md — series tokens only). */
  colorToken: string;
  /** One point per scenario date. */
  points: StrategyLabPoint[];
  /** Series with hover notes show a per-line tooltip; the Safety Buffer line does not. */
  hoverable: boolean;
}

export interface StrategyLabScenario {
  id: string;
  /** Scenario Selector chip label. */
  chipLabel: string;
  /** Sub-heading above the chart ("<name>, <period>"); null until data ships. */
  subheading: string | null;
  /** X-axis date labels; empty until data ships. */
  dates: string[];
  /** Chart series (WealthSmith / Unguided / Safety Buffer); null until data ships. */
  series: StrategyLabSeries[] | null;
  /** Token Breakdown per date (index-aligned with `dates`; null slots pending). */
  breakdown?: (StrategyLabBreakdownSnapshot | null)[];
  /** Scenario-specific Y-axis ticks; defaults to STRATEGY_LAB_Y_TICKS_USD. */
  yTicksUsd?: number[];
}

/* ---------- Token Breakdown (the per-date allocation table under the chart) ---------- */

export const STRATEGY_LAB_BREAKDOWN_TITLE = "Token Breakdown";
export const STRATEGY_LAB_BREAKDOWN_DESCRIPTION =
  "Use the slider to see how WealthSmith’s allocation evolved compared to the unguided portfolio during this scenario.";

/** One asset row at one scenario date. Display strings are approved verbatim. */
export interface StrategyLabBreakdownRow {
  symbol: string;
  /** Token icon asset id under assets/icons/token/. */
  icon: "usdc" | "btc" | "sol" | "ust" | "luna" | "ftt" | "trump" | "melania";
  /** Read-only explorer page for the token (Solscan / the asset's own chain). */
  explorer: string;
  /** Approved price display at this date, e.g. "$1.00". */
  priceLabel: string;
  unguided: string;
  wealthsmith: string;
  decision: string;
}

/** The table at one slider stop; index-aligned with the scenario's `dates`. */
export interface StrategyLabBreakdownSnapshot {
  rows: StrategyLabBreakdownRow[];
  total: { unguided: string; wealthsmith: string; decision: string };
}

const USDC_EXPLORER = "https://solscan.io/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL_EXPLORER = "https://solscan.io/token/So11111111111111111111111111111111111111112";
const BTC_EXPLORER = "https://mempool.space";
/** Terra Classic chain explorer — read-only pages for the historical UST/LUNA assets. */
export const TERRA_EXPLORER = "https://finder.terra.money/classic";
/** FTT (FTX Token) — read-only Etherscan token page for the historical ERC-20. */
const FTT_EXPLORER = "https://etherscan.io/token/0x50d1c9771902476076ecfc8b2a83ad6b9355a4c9";
/** TRUMP / MELANIA — read-only Solscan token pages (Solana memecoins, Jan 2025). */
const TRUMP_EXPLORER = "https://solscan.io/token/6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN";
const MELANIA_EXPLORER = "https://solscan.io/token/FUAfBo2jgks6gB4Z4LfZkqSZgzNucisEHqnNebaRxM1P";

/** Fixed Y-axis ticks (USD) shared by every scenario chart: 0 → 60k. */
export const STRATEGY_LAB_Y_TICKS_USD = [0, 10_000, 20_000, 30_000, 40_000];

export const STRATEGY_LAB_SCENARIOS: StrategyLabScenario[] = [
  {
    id: "solana_summer",
    chipLabel: "Solana Summer",
    subheading: "Solana Summer, July - November 2021",
    dates: ["Jul 20", "Aug 15", "Sep 7", "Sep 14", "Nov 6"],
    /*
     * ENGINE-DERIVED SCENARIO. Every WealthSmith number below was produced by
     * running the REAL pipeline headless (medium-risk five-factor target with the
     * historical CMC Fear & Greed score per date → deriveRebalanceAssessment →
     * source selection → card amount), with the guided user executing each
     * recommendation at that date's price:
     *   Jul 20  F&G 10 (Extreme Fear)  → target 65%   → partial $3,000 USDC→SOL (buffer cap)
     *   Aug 15  F&G 73 (Greed)         → target 60.5% → +15.4pp → $2,547 SOL→USDC
     *   Sep 7   F&G 79 (Extreme Greed) → target 59%   → +17.0pp → $4,644 SOL→USDC
     *   Sep 14  F&G 27 (Fear)         → target 63.5% → −7.4pp within threshold; outage = fail closed
     *   Nov 6   F&G 76 (Extreme Greed) → target 59%   → +6.4pp within threshold — On Track
     * The market component is CONTRARIAN: fear raises the crypto target, greed
     * lowers it. BTC is a manually added holding — allocation MEASUREMENT only.
     */
    series: [
      {
        id: "wealthsmith",
        label: "WealthSmith",
        colorToken: "--color-chart-series-1",
        hoverable: true,
        points: [
          {
            valueUsd: 10_000,
            note: {
              title: "Safety Buffer first, then add SOL",
              body: "Your $4,000 Safety Buffer—three months of expenses—is fully funded. With the market in Extreme Fear, your target shifts to 65% crypto. WealthSmith recommends using up to $3,000 of excess stables to increase SOL exposure, while keeping the Safety Buffer untouched.",
            },
          },
          {
            valueUsd: 16_575,
            deltaLabel: "+65.75% from start",
            trend: "up",
            note: {
              title: "Rebalance Triggered",
              body: "Crypto has risen to 75.9% of the portfolio, above the 60.5% target. With the market in Greed, the target has shifted lower. The 15.4 percentage-point gap crosses the rebalance threshold, so WealthSmith recommends moving $2,547 of SOL into stables. The rebalance is completed, realizing part of the gains and bringing the portfolio back toward target.",
            },
          },
          {
            valueUsd: 27_295,
            deltaLabel: "+172.95% from start",
            trend: "up",
            note: {
              title: "Second Rebalance",
              body: "SOL rises to $190 while Extreme Greed lowers the crypto target to 59%. Crypto exposure moves 17.0 percentage points above target, triggering another rebalance. WealthSmith moves $4,644 of SOL into stables, bringing total realized gains to $7,191 while keeping the Safety Buffer untouched.",
            },
          },
          {
            valueUsd: 25_511,
            deltaLabel: "+155.11% from start",
            trend: "up",
            note: {
              title: "No Action During the Outage",
              body: "During Solana’s 17-hour network outage, WealthSmith makes no recommendation while reliable network data is unavailable. The Safety Buffer and previously realized gains remain in stables, and the portfolio is still within its rebalance range after the earlier adjustments.",
            },
          },
          {
            valueUsd: 32_373,
            deltaLabel: "+223.73% from start",
            trend: "up",
            note: {
              title: "On Track",
              body: "SOL reaches $250. Because earlier rallies were rebalanced, crypto now represents 65.4% of the portfolio against a 59% target—still within the rebalance range. $11,191 remains in stables, including the Safety Buffer and previously realized gains. No action is needed.",
            },
          },
        ],
      },
      {
        id: "unguided",
        label: "Unguided",
        colorToken: "--color-chart-series-8",
        hoverable: true,
        points: [
          {
            valueUsd: 10_000,
            note: {
              title: "Market Paralysis",
              body: "Following the May crash, the user remains 100% in BTC. They wait for a “safe” signal while ignoring the structural bottom forming for SOL at $24.",
            },
          },
          {
            valueUsd: 15_666,
            deltaLabel: "+56.66% from start",
            note: {
              title: "Late FOMO",
              body: "Driven by viral NFT hype, the user sells half their BTC to buy SOL at $63.00—nearly 3x the Guided price, significantly raising their cost basis.",
            },
          },
          {
            valueUsd: 31_385,
            deltaLabel: "+213.85% from start",
            note: {
              title: "No Safety Buffer",
              body: "The unguided portfolio is fully invested in growth assets. When BTC drops, there are no stable reserves available to absorb the drawdown or deploy into the market at lower prices.",
            },
          },
          {
            valueUsd: 27_776,
            deltaLabel: "+177.76% from start",
            note: {
              title: "No Action Available",
              body: "During the Solana network outage, the unguided portfolio cannot rebalance or move assets on-chain. With no stable reserve set aside beforehand, there is less flexibility until network access is restored.",
            },
          },
          {
            valueUsd: 20_600,
            deltaLabel: "+106.00% from start",
            note: {
              title: "Gains Not Realized",
              body: "Without a rebalancing rule, the unguided portfolio stays fully exposed through the decline. Earlier gains are not moved into stables, so more of the portfolio remains exposed as prices fall.",
            },
          },
        ],
      },
      {
        id: "safety_buffer",
        label: "Safety Buffer",
        colorToken: "--color-chart-series-3",
        hoverable: false,
        points: [
          { valueUsd: 4_000 },
          { valueUsd: 4_000 },
          { valueUsd: 4_000 },
          { valueUsd: 4_000 },
          { valueUsd: 4_000 },
        ],
      },
    ],
    breakdown: [
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$0.00", wealthsmith: "$4,000",
            decision: "Safety Buffer funded — $4,000, equal to 3 months of expenses, is reserved before any new investment.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$29,800",
            unguided: "$10,000", wealthsmith: "$3,000",
            decision: "BTC is manually tracked — it counts toward the portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$24.00",
            unguided: "$0.00", wealthsmith: "$3,000",
            decision: "Target allocation calls for $3,500 more in SOL. The Safety Buffer limits the available amount to $3,000, so WealthSmith recommends adding 125 SOL at $24.",
          },
        ],
        total: { unguided: "$10,000", wealthsmith: "$10,000", decision: "Market condition: Extreme Fear (10) raises the target crypto allocation to 65% under the strategy rules." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$0.00", wealthsmith: "$6,547",
            decision: "Safety Buffer remains fully funded at $4,000. Realized gains now sit in stables above the required buffer.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$46,685",
            unguided: "$7,833", wealthsmith: "$4,700",
            decision: "BTC counts toward the portfolio’s crypto allocation, but WealthSmith does not use manually tracked BTC for on-chain rebalancing.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$63.00",
            unguided: "$7,833", wealthsmith: "$5,328",
            decision: "Crypto rises to 75.9% of the portfolio against a 60.5% target, a 15.4 percentage-point gap. WealthSmith recommends moving $2,547 of SOL into USDC, and the user accepts.",
          },
        ],
        total: { unguided: "$15,666", wealthsmith: "$16,575", decision: "Market condition: Greed (73) lowers the target crypto allocation to 60.5%, triggering the rebalance." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$0.00", wealthsmith: "$11,191",
            decision: "Stables increase to $11,191, including the $4,000 Safety Buffer and $7,191 in realized gains.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$46,486",
            unguided: "$7,768", wealthsmith: "$4,680",
            decision: "BTC declines slightly. It still counts toward the portfolio’s crypto allocation, but WealthSmith does not use manually tracked BTC for on-chain rebalancing.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$190.00",
            unguided: "$23,617", wealthsmith: "$11,424",
            decision: "Crypto rises to 76.0% of the portfolio against a 59% target, a 17.0 percentage-point gap. WealthSmith recommends moving $4,644 of SOL into USDC, and the user accepts.",
          },
        ],
        total: { unguided: "$31,385", wealthsmith: "$27,295", decision: "Market condition: Extreme Greed (79) lowers the target crypto allocation to 59%, triggering a second rebalance." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$0.00", wealthsmith: "$11,191",
            decision: "The $4,000 Safety Buffer and previously realized gains were already held in stables before the outage and remain unchanged.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$46,685",
            unguided: "$7,884", wealthsmith: "$4,700",
            decision: "BTC is unaffected by the Solana outage. It still counts toward the portfolio’s crypto allocation, but no action is available through WealthSmith.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$160.00",
            unguided: "$19,892", wealthsmith: "$9,620",
            decision: "Solana’s 17-hour network outage interrupts on-chain activity. With reliable network data unavailable, WealthSmith makes no new recommendation.",
          },
        ],
        total: { unguided: "$27,776", wealthsmith: "$25,511", decision: "Crypto sits 7.4 percentage points below the 63.5% target, still within the rebalance range. No adjustment is needed." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$0.00", wealthsmith: "$11,191",
            decision: "Stables remain at $11,191, including the $4,000 Safety Buffer and $7,191 in realized gains from two earlier rebalances.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$61,090",
            unguided: "$20,600", wealthsmith: "$6,150",
            decision: "BTC rallies. It still counts toward the portfolio’s crypto allocation, but WealthSmith does not use manually tracked BTC for on-chain rebalancing.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$250.00",
            unguided: "$0.00", wealthsmith: "$15,032",
            decision: "SOL reaches $250. Crypto is 65.4% vs. a 59% target—within the ±10% rebalance range, so no action is needed.",
          },
        ],
        total: { unguided: "$20,600", wealthsmith: "$32,373", decision: "On Track — Extreme Greed (76) keeps the target crypto allocation at 59%. The portfolio remains within its target range without trying to time the market." },
      },
    ],
  },
  {
    id: "luna_collapse",
    chipLabel: "Luna Collapse",
    subheading: "Luna Collapse, May 2022",
    dates: ["May 1", "May 3", "May 5", "May 7", "May 9", "May 11", "May 13", "May 15"],
    yTicksUsd: [0, 2_000, 4_000, 6_000, 8_000, 10_000, 12_000],
    /*
     * ENGINE-DERIVED SCENARIO (same method as Solana Summer): medium-risk
     * five-factor target with the historical CMC Fear & Greed score per date →
     * deriveRebalanceAssessment → source selection → card. Guided start: $7,000
     * USDC + $3,000 manually tracked BTC; $4,000 buffer (3 months of expenses).
     *   May 1   F&G 28 → target 63.5% → partial $3,000 USDC→SOL (buffer cap) = 34.48 SOL @ $87
     *   May 3-7 within ±10pp — no action as prices drift lower
     *   May 9-15 drift −12.5…−15.8pp (contrarian signal says ADD) but the ONLY
     *   stables left are the Safety Buffer → source gate BLOCKED → no card.
     *   Buffer protection refuses to buy the crash with reserve money.
     * UST is an unvetted algorithmic stable — never buffer-eligible, never held.
     * Unguided: $6,000 UST (Anchor 19.5% yield) + $4,000 LUNA, held throughout.
     * Finale: guided $8,120 (−18.8%) vs unguided $540 (−94.6%).
     */
    series: [
      {
        id: "wealthsmith",
        label: "WealthSmith",
        colorToken: "--color-chart-series-1",
        hoverable: true,
        points: [
          {
            valueUsd: 10_000,
            note: {
              title: "Safety Buffer first",
              body: "The $4,000 Safety Buffer—three months of expenses—is held in USDC. UST is excluded despite Anchor’s 19.5% yield because it isn’t a vetted stable asset. With the market in Fear, the target is 63.5% crypto, but only the $3,000 above the buffer can be deployed, adding 34.5 SOL at $87.",
            },
          },
          {
            valueUsd: 9_834,
            deltaLabel: "−1.66% from start",
            trend: "down",
            note: {
              title: "Within Range",
              body: "Crypto is 4.2 percentage points below target, still within the ±10-point rebalance range. No action is needed.",
            },
          },
          {
            valueUsd: 9_568,
            deltaLabel: "−4.32% from start",
            trend: "down",
            note: {
              title: "Holding Steady",
              body: "Extreme Fear raises the crypto target to 65%. Crypto remains 6.8 percentage points below target, still within the ±10-point rebalance range, so no action is needed.",
            },
          },
          {
            valueUsd: 9_337,
            deltaLabel: "−6.63% from start",
            trend: "down",
            note: {
              title: "UST Slips Below Peg",
              body: "UST falls to $0.995. WealthSmith holds no UST because it is not an approved stable asset for the Safety Buffer or portfolio. Crypto remains 7.8 percentage points below target, still within the rebalance range, so no action is needed.",
            },
          },
          {
            valueUsd: 8_414,
            deltaLabel: "−15.86% from start",
            trend: "down",
            note: {
              title: "Safety Buffer Protected",
              body: "Crypto falls 12.5 percentage points below target, which would normally trigger an increase in crypto exposure. But the remaining stables are reserved for the Safety Buffer, so no additional capital can be deployed. No action is recommended.",
            },
          },
          {
            valueUsd: 7_880,
            deltaLabel: "−21.20% from start",
            trend: "down",
            note: {
              title: "Safety Buffer Preserved",
              body: "UST falls to $0.45 as LUNA collapses. Crypto remains below target, but the only stables left are the $4,000 Safety Buffer. No additional capital is deployed, and the three-month reserve remains untouched.",
            },
          },
          {
            valueUsd: 7_938,
            deltaLabel: "−20.62% from start",
            trend: "down",
            note: {
              title: "Safety Buffer Protected",
              body: "Extreme Fear (8) keeps the crypto target elevated, but there are no stables available above the $4,000 Safety Buffer. With no eligible capital to deploy, no action is recommended.",
            },
          },
          {
            valueUsd: 8_120,
            deltaLabel: "−18.80% from start",
            trend: "down",
            note: {
              title: "Drawdown Contained",
              body: "The portfolio closes at $8,120, an 18.8% decline from the start. The $4,000 Safety Buffer remains fully intact, and the portfolio had no exposure to UST or LUNA throughout the scenario.",
            },
          },
        ],
      },
      {
        id: "unguided",
        label: "Unguided",
        colorToken: "--color-chart-series-8",
        hoverable: true,
        points: [
          {
            valueUsd: 10_000,
            note: {
              title: "Chasing the Yield",
              body: "$6,000 goes into UST for Anchor’s 19.5% “stable” yield and $4,000 into LUNA. The safety net and the risk asset are the same ecosystem.",
            },
          },
          {
            valueUsd: 9_859,
            deltaLabel: "−1.41% from start",
            note: {
              title: "Comfortable",
              body: "LUNA drifts lower but the UST balance looks rock-solid at $1.00. The yield keeps compounding; nothing seems wrong.",
            },
          },
          {
            valueUsd: 9_624,
            deltaLabel: "−3.76% from start",
            note: {
              title: "Ignoring the Drift",
              body: "The broader market weakens. With no target allocation and no buffer rule, there is no signal to take any of the UST or LUNA off the table.",
            },
          },
          {
            valueUsd: 9_029,
            deltaLabel: "−9.71% from start",
            note: {
              title: "The First Crack",
              body: "UST closes at $0.995. A half-cent wobble on a “stablecoin” — easy to dismiss, impossible to act on without a plan.",
            },
          },
          {
            valueUsd: 7_146,
            deltaLabel: "−28.54% from start",
            note: {
              title: "UST Loses Its Peg",
              body: "UST falls to $0.94 while LUNA declines sharply. Because the unguided portfolio is concentrated in UST and LUNA, both the stable reserve and growth allocation are affected at the same time.",
            },
          },
          {
            valueUsd: 2_750,
            deltaLabel: "−72.50% from start",
            note: {
              title: "UST and LUNA Collapse",
              body: "UST falls to $0.45 while LUNA drops from $32 to $1.07. Because the unguided portfolio has no stable reserve outside the Terra ecosystem, there is little protection as both assets decline together.",
            },
          },
          {
            valueUsd: 780,
            deltaLabel: "−92.20% from start",
            note: {
              title: "Stable Reserve Fails",
              body: "LUNA falls to near zero and UST drops to $0.13. With no reserve outside the Terra ecosystem, the unguided portfolio falls to $780—down 92.2% from the start.",
            },
          },
          {
            valueUsd: 540,
            deltaLabel: "−94.60% from start",
            note: {
              title: "Losses Compound",
              body: "$540 remains from the original $10,000. The portfolio had no vetted stable reserve, no target allocation, and no rebalancing rule to reduce exposure as the Terra ecosystem collapsed.",
            },
          },
        ],
      },
      {
        id: "safety_buffer",
        label: "Safety Buffer",
        colorToken: "--color-chart-series-3",
        hoverable: false,
        points: [
          { valueUsd: 4_000 }, { valueUsd: 4_000 }, { valueUsd: 4_000 }, { valueUsd: 4_000 },
          { valueUsd: 4_000 }, { valueUsd: 4_000 }, { valueUsd: 4_000 }, { valueUsd: 4_000 },
        ],
      },
    ],
    breakdown: [
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$0.00", wealthsmith: "$4,000",
            decision: "Safety Buffer funded — $4,000 is held in vetted USDC. UST does not qualify because unvetted algorithmic stables are not eligible for the Safety Buffer.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$38,500",
            unguided: "$0.00", wealthsmith: "$3,000",
            decision: "BTC is manually tracked — it counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$87.00",
            unguided: "$0.00", wealthsmith: "$3,000",
            decision: "The target calls for $3,350 more in crypto. Because only $3,000 is available above the Safety Buffer, WealthSmith recommends adding 34.5 SOL at $87.",
          },
          {
            symbol: "UST", icon: "ust", explorer: TERRA_EXPLORER, priceLabel: "$1.00",
            unguided: "$6,000", wealthsmith: "$0.00",
            decision: "UST is not an approved stable asset, so it is excluded from the Safety Buffer and from WealthSmith recommendations.",
          },
          {
            symbol: "LUNA", icon: "luna", explorer: TERRA_EXPLORER, priceLabel: "$85.00",
            unguided: "$4,000", wealthsmith: "$0.00",
            decision: "LUNA is not an approved destination asset, so WealthSmith does not recommend adding it.",
          },
        ],
        total: { unguided: "$10,000", wealthsmith: "$10,000", decision: "Market condition: Fear (28) sets the target crypto allocation at 63.5%." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$0.00", wealthsmith: "$4,000",
            decision: "Safety Buffer remains fully funded at $4,000 in vetted USDC.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$37,700",
            unguided: "$0.00", wealthsmith: "$2,938",
            decision: "BTC moves slightly lower. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$84.00",
            unguided: "$0.00", wealthsmith: "$2,897",
            decision: "Crypto is 4.2 percentage points below the 63.5% target, still within the ±10-point rebalance range. No action is needed.",
          },
          {
            symbol: "UST", icon: "ust", explorer: TERRA_EXPLORER, priceLabel: "$1.00",
            unguided: "$6,000", wealthsmith: "$0.00",
            decision: "UST is not held and is not eligible for the Safety Buffer.",
          },
          {
            symbol: "LUNA", icon: "luna", explorer: TERRA_EXPLORER, priceLabel: "$82.00",
            unguided: "$3,859", wealthsmith: "$0.00",
            decision: "LUNA is not held and is not an approved destination asset.",
          },
        ],
        total: { unguided: "$9,859", wealthsmith: "$9,835", decision: "Market condition: Fear (27) keeps the target crypto allocation at 63.5%. The portfolio remains within range." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$0.00", wealthsmith: "$4,000",
            decision: "Safety Buffer remains fully funded at $4,000 in vetted USDC.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$36,500",
            unguided: "$0.00", wealthsmith: "$2,844",
            decision: "BTC continues lower. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$79.00",
            unguided: "$0.00", wealthsmith: "$2,724",
            decision: "Crypto is 6.8 percentage points below target, still within the ±10-point rebalance range. No action is needed.",
          },
          {
            symbol: "UST", icon: "ust", explorer: TERRA_EXPLORER, priceLabel: "$1.00",
            unguided: "$6,000", wealthsmith: "$0.00",
            decision: "UST is not held and is not eligible for the Safety Buffer.",
          },
          {
            symbol: "LUNA", icon: "luna", explorer: TERRA_EXPLORER, priceLabel: "$77.00",
            unguided: "$3,624", wealthsmith: "$0.00",
            decision: "LUNA is not held and is not an approved destination asset.",
          },
        ],
        total: { unguided: "$9,624", wealthsmith: "$9,568", decision: "Market condition: Extreme Fear (22) raises the target crypto allocation to 65%." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$0.00", wealthsmith: "$4,000",
            decision: "Safety Buffer remains fully funded at $4,000 and is unaffected by UST slipping below its peg.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$35,300",
            unguided: "$0.00", wealthsmith: "$2,751",
            decision: "BTC moves lower again. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$75.00",
            unguided: "$0.00", wealthsmith: "$2,586",
            decision: "Crypto is 7.8 percentage points below target, still within the ±10-point rebalance range. No action is needed.",
          },
          {
            symbol: "UST", icon: "ust", explorer: TERRA_EXPLORER, priceLabel: "$0.995",
            unguided: "$5,970", wealthsmith: "$0.00",
            decision: "UST falls to $0.995. WealthSmith holds none because it is not an approved stable asset.",
          },
          {
            symbol: "LUNA", icon: "luna", explorer: TERRA_EXPLORER, priceLabel: "$65.00",
            unguided: "$3,059", wealthsmith: "$0.00",
            decision: "LUNA is not held and is not an approved destination asset.",
          },
        ],
        total: { unguided: "$9,029", wealthsmith: "$9,337", decision: "Market condition: Extreme Fear (18) keeps the target crypto allocation at 65%." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$0.00", wealthsmith: "$4,000",
            decision: "Only the $4,000 Safety Buffer remains in stables, so no stable capital is available for deployment.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$30,100",
            unguided: "$0.00", wealthsmith: "$2,345",
            decision: "BTC falls with the market. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$60.00",
            unguided: "$0.00", wealthsmith: "$2,069",
            decision: "Crypto is 12.5 percentage points below target, which would normally trigger an increase in crypto exposure. But with no eligible capital above the Safety Buffer, no recommendation is made.",
          },
          {
            symbol: "UST", icon: "ust", explorer: TERRA_EXPLORER, priceLabel: "$0.94",
            unguided: "$5,640", wealthsmith: "$0.00",
            decision: "UST falls to $0.94. WealthSmith holds none because it is not eligible for the Safety Buffer.",
          },
          {
            symbol: "LUNA", icon: "luna", explorer: TERRA_EXPLORER, priceLabel: "$32.00",
            unguided: "$1,506", wealthsmith: "$0.00",
            decision: "LUNA falls sharply. WealthSmith holds none because it is not an approved destination asset.",
          },
        ],
        total: { unguided: "$7,146", wealthsmith: "$8,414", decision: "Market condition: Extreme Fear (11) keeps the target crypto allocation at 65%, but Safety Buffer protection prevents any additional deployment." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$0.00", wealthsmith: "$4,000",
            decision: "Safety Buffer remains fully funded at $4,000, with no stable capital available above it.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$29,000",
            unguided: "$0.00", wealthsmith: "$2,260",
            decision: "BTC remains near its recent lows. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$47.00",
            unguided: "$0.00", wealthsmith: "$1,621",
            decision: "Crypto is 15.8 percentage points below target, which would normally trigger an increase in crypto exposure. But with no eligible capital above the Safety Buffer, no action is recommended.",
          },
          {
            symbol: "UST", icon: "ust", explorer: TERRA_EXPLORER, priceLabel: "$0.45",
            unguided: "$2,700", wealthsmith: "$0.00",
            decision: "UST falls to $0.45. WealthSmith holds none because it is not eligible for the Safety Buffer.",
          },
          {
            symbol: "LUNA", icon: "luna", explorer: TERRA_EXPLORER, priceLabel: "$1.07",
            unguided: "$50", wealthsmith: "$0.00",
            decision: "LUNA falls to $1.07. WealthSmith holds none because it is not an approved destination asset.",
          },
        ],
        total: { unguided: "$2,750", wealthsmith: "$7,881", decision: "Market condition: Extreme Fear (10) keeps the target crypto allocation at 65%, but Safety Buffer protection prevents any additional deployment." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$0.00", wealthsmith: "$4,000",
            decision: "Safety Buffer remains fully funded at $4,000 in vetted USDC.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$29,300",
            unguided: "$0.00", wealthsmith: "$2,283",
            decision: "BTC stabilizes. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$48.00",
            unguided: "$0.00", wealthsmith: "$1,655",
            decision: "Crypto is 15.4 percentage points below target, which would normally trigger an increase in crypto exposure. But with no eligible capital above the Safety Buffer, no action is recommended.",
          },
          {
            symbol: "UST", icon: "ust", explorer: TERRA_EXPLORER, priceLabel: "$0.13",
            unguided: "$780", wealthsmith: "$0.00",
            decision: "UST falls to $0.13. WealthSmith holds none because it is not eligible for the Safety Buffer.",
          },
          {
            symbol: "LUNA", icon: "luna", explorer: TERRA_EXPLORER, priceLabel: "$0.0005",
            unguided: "$0.02", wealthsmith: "$0.00",
            decision: "LUNA is near zero. WealthSmith holds none because it is not an approved destination asset.",
          },
        ],
        total: { unguided: "$780", wealthsmith: "$7,938", decision: "Market condition: Extreme Fear (8) keeps the target crypto allocation at 65%, but Safety Buffer protection prevents any additional deployment." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$0.00", wealthsmith: "$4,000",
            decision: "Safety Buffer closes fully funded at $4,000, equal to three months of expenses.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$30,300",
            unguided: "$0.00", wealthsmith: "$2,361",
            decision: "BTC recovers slightly. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$51.00",
            unguided: "$0.00", wealthsmith: "$1,759",
            decision: "The portfolio closes at $8,120, down 18.8% from the start. Crypto remains below target, but no eligible capital is available above the Safety Buffer, so no additional action is recommended.",
          },
          {
            symbol: "UST", icon: "ust", explorer: TERRA_EXPLORER, priceLabel: "$0.09",
            unguided: "$540", wealthsmith: "$0.00",
            decision: "UST falls to $0.09. WealthSmith held none at any point because it was not eligible for the Safety Buffer.",
          },
          {
            symbol: "LUNA", icon: "luna", explorer: TERRA_EXPLORER, priceLabel: "$0.0002",
            unguided: "$0.01", wealthsmith: "$0.00",
            decision: "LUNA falls to $0.0002. WealthSmith held none because it was not an approved destination asset.",
          },
        ],
        total: { unguided: "$540", wealthsmith: "$8,120", decision: "Market condition: Extreme Fear (9) keeps the target crypto allocation at 65%. The Safety Buffer remains fully protected through the end of the scenario." },
      },
    ],
  },
  {
    id: "ftx_crisis",
    chipLabel: "FTX Crisis",
    subheading: "FTX Crisis, November 2022",
    dates: ["Nov 1", "Nov 3", "Nov 5", "Nov 7", "Nov 9", "Nov 11", "Nov 13", "Nov 15"],
    yTicksUsd: [0, 2_000, 4_000, 6_000, 8_000, 10_000, 12_000],
    /*
     * ENGINE-DERIVED SCENARIO (same method as the others): medium-risk five-factor
     * target with the historical CMC Fear & Greed score per date →
     * deriveRebalanceAssessment → source selection → card. Guided start: $7,000
     * USDC + $3,000 manually tracked BTC in SELF-CUSTODY; $4,000 buffer.
     *   Nov 1   F&G 30 → target 63.5% → partial $3,000 USDC→SOL (buffer cap) = 92.31 SOL @ $32.50
     *   Nov 3-7 within ±10pp as prices chop — no action
     *   Nov 9-15 crash drags drift to −15…−18pp (add signal) but only the Safety
     *   Buffer remains in stables → source gate BLOCKED → no card.
     * FTT is not an approved destination asset — never held. Nothing is ever
     * custodied on an exchange: WealthSmith is read-only over the user's own wallet.
     * Unguided: $3,000 USDC + $2,000 BTC + $2,500 SOL + $2,500 FTT, ALL held on
     * FTX. Withdrawals halt Nov 8 (balances frozen at market value), bankruptcy
     * Nov 11 — balances marked at an ESTIMATED 15¢/$ claim value (adjustable).
     * Finale: guided $7,805 (−21.9%) vs unguided $884 (−91.2%).
     */
    series: [
      {
        id: "wealthsmith",
        label: "WealthSmith",
        colorToken: "--color-chart-series-1",
        hoverable: true,
        points: [
          {
            valueUsd: 10_000,
            note: {
              title: "Self-Custody First",
              body: "The $4,000 Safety Buffer—three months of expenses—is held in USDC in the user’s own wallet. With the market in Fear, the target is 63.5% crypto, but only the $3,000 above the buffer can be deployed, adding 92.3 SOL at $32.50. FTT is not an approved destination asset, so WealthSmith does not recommend it.",
            },
          },
          {
            valueUsd: 9_823,
            deltaLabel: "−1.77% from start",
            trend: "down",
            note: {
              title: "Within Range",
              body: "Crypto is 4.2 percentage points below the 63.5% target, still within the ±10-point rebalance range. No action is needed.",
            },
          },
          {
            valueUsd: 10_363,
            deltaLabel: "+3.63% from start",
            trend: "up",
            note: {
              title: "Within Range",
              body: "The portfolio rises above its starting value. Crypto is 2.1 percentage points below target, still within the ±10-point rebalance range. No action is needed.",
            },
          },
          {
            valueUsd: 9_595,
            deltaLabel: "−4.05% from start",
            trend: "down",
            note: {
              title: "No FTT Exposure",
              body: "Concerns around FTX increase as FTT declines. The portfolio holds no FTT and remains in self-custody. Crypto is 5.2 percentage points below target, still within the ±10-point rebalance range. No action is needed.",
            },
          },
          {
            valueUsd: 7_584,
            deltaLabel: "−24.16% from start",
            trend: "down",
            note: {
              title: "Self-Custody Preserved",
              body: "FTX halts withdrawals as markets fall sharply. The portfolio has no funds held on FTX, so nothing is frozen. Crypto is 17.7 percentage points below target, but only the $4,000 Safety Buffer remains in stables. With no eligible capital above the buffer, no action is recommended.",
            },
          },
          {
            valueUsd: 7_977,
            deltaLabel: "−20.23% from start",
            trend: "down",
            note: {
              title: "Safety Buffer Preserved",
              body: "FTX files for bankruptcy, but the portfolio has no funds held on the exchange. Crypto remains below target, yet only the $4,000 Safety Buffer remains in stables. With no eligible capital above the buffer, no additional action is recommended.",
            },
          },
          {
            valueUsd: 7_680,
            deltaLabel: "−23.20% from start",
            trend: "down",
            note: {
              title: "Safety Buffer Protected",
              body: "Extreme Fear keeps the crypto target elevated, but there are no stables available above the $4,000 Safety Buffer. With no eligible capital to deploy, no action is recommended.",
            },
          },
          {
            valueUsd: 7_805,
            deltaLabel: "−21.95% from start",
            trend: "down",
            note: {
              title: "Drawdown Contained",
              body: "The portfolio closes at $7,805, down 21.9% from the start. The $4,000 Safety Buffer remains fully intact, no funds were held on FTX, and the portfolio had no exposure to FTT.",
            },
          },
        ],
      },
      {
        id: "unguided",
        label: "Unguided",
        colorToken: "--color-chart-series-8",
        hoverable: true,
        points: [
          {
            valueUsd: 10_000,
            note: {
              title: "Convenience Custody",
              body: "Everything lives on FTX: $3,000 of “savings” in USDC, $2,000 of BTC, $2,500 of SOL, and $2,500 of FTT for fee discounts. The exchange is the wallet, the broker, and the counterparty — all at once.",
            },
          },
          {
            valueUsd: 9_782,
            deltaLabel: "−2.18% from start",
            note: {
              title: "Business as Usual",
              body: "Prices chop sideways. The exchange balance looks normal, and there is no reason — and no rule — to move anything.",
            },
          },
          {
            valueUsd: 10_148,
            deltaLabel: "+1.48% from start",
            note: {
              title: "Comfortable",
              body: "A small bounce puts the account back in the green. Custody risk is invisible when the login still works.",
            },
          },
          {
            valueUsd: 9_233,
            deltaLabel: "−7.67% from start",
            note: {
              title: "The Balance-Sheet Story",
              body: "Reports reveal FTT dominates the balance sheet behind the exchange. FTT slides and withdrawals quietly accelerate — but these funds stay put.",
            },
          },
          {
            valueUsd: 6_031,
            deltaLabel: "−39.69% from start",
            note: {
              title: "Withdrawals Halted",
              body: "FTX halts customer withdrawals. The account still shows $6,031 across BTC, SOL, FTT, and USDC, but the assets cannot be moved or rebalanced while withdrawals are unavailable.",
            },
          },
          {
            valueUsd: 920,
            deltaLabel: "−90.80% from start",
            note: {
              title: "Bankruptcy Filed",
              body: "FTX files for Chapter 11. The frozen account balance becomes a bankruptcy claim, leaving the user unable to access or rebalance the assets. The portfolio is valued at $920—down 90.8% from the start.",
            },
          },
          {
            valueUsd: 868,
            deltaLabel: "−91.32% from start",
            note: {
              title: "Bankruptcy Claim",
              body: "FTT is near worthless, and the remaining FTX balance is now represented by a bankruptcy claim rather than accessible assets. The portfolio is valued at $868—down 91.3% from the start.",
            },
          },
          {
            valueUsd: 884,
            deltaLabel: "−91.16% from start",
            note: {
              title: "Counterparty Loss",
              body: "An estimated $884 in claim value remains from the original $10,000. Most of the loss now reflects exposure to FTX as a failed custodian rather than normal market movement.",
            },
          },
        ],
      },
      {
        id: "safety_buffer",
        label: "Safety Buffer",
        colorToken: "--color-chart-series-3",
        hoverable: false,
        points: [
          { valueUsd: 4_000 }, { valueUsd: 4_000 }, { valueUsd: 4_000 }, { valueUsd: 4_000 },
          { valueUsd: 4_000 }, { valueUsd: 4_000 }, { valueUsd: 4_000 }, { valueUsd: 4_000 },
        ],
      },
    ],
    breakdown: [
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$3,000", wealthsmith: "$4,000",
            decision: "Safety Buffer funded — $4,000 is held in vetted USDC in the user’s own wallet rather than on FTX.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$20,400",
            unguided: "$2,000", wealthsmith: "$3,000",
            decision: "BTC is manually tracked — it counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$32.50",
            unguided: "$2,500", wealthsmith: "$3,000",
            decision: "The target calls for $3,350 more in crypto. Because only $3,000 is available above the Safety Buffer, WealthSmith recommends adding 92.3 SOL at $32.50.",
          },
          {
            symbol: "FTT", icon: "ftt", explorer: FTT_EXPLORER, priceLabel: "$26.50",
            unguided: "$2,500", wealthsmith: "$0.00",
            decision: "FTT is not an approved destination asset, so WealthSmith does not recommend adding it.",
          },
        ],
        total: { unguided: "$10,000", wealthsmith: "$10,000", decision: "Market condition: Fear (30) sets the target crypto allocation at 63.5%." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$3,000", wealthsmith: "$4,000",
            decision: "Safety Buffer remains fully funded at $4,000 in vetted USDC, held in the user’s own wallet rather than on FTX.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$20,200",
            unguided: "$1,980", wealthsmith: "$2,971",
            decision: "BTC moves slightly lower. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$30.90",
            unguided: "$2,377", wealthsmith: "$2,852",
            decision: "Crypto is 4.2 percentage points below the 63.5% target, still within the ±10-point rebalance range. No action is needed.",
          },
          {
            symbol: "FTT", icon: "ftt", explorer: FTT_EXPLORER, priceLabel: "$25.70",
            unguided: "$2,425", wealthsmith: "$0.00",
            decision: "FTT is not held and is not an approved destination asset.",
          },
        ],
        total: { unguided: "$9,782", wealthsmith: "$9,823", decision: "Market condition: Fear (30) keeps the target crypto allocation at 63.5%." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$3,000", wealthsmith: "$4,000",
            decision: "Safety Buffer remains fully funded at $4,000 in vetted USDC.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$21,300",
            unguided: "$2,088", wealthsmith: "$3,132",
            decision: "BTC moves higher with the market. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$35.00",
            unguided: "$2,692", wealthsmith: "$3,231",
            decision: "Crypto is 2.1 percentage points below the 63.5% target, still within the ±10-point rebalance range. No action is needed.",
          },
          {
            symbol: "FTT", icon: "ftt", explorer: FTT_EXPLORER, priceLabel: "$25.10",
            unguided: "$2,368", wealthsmith: "$0.00",
            decision: "FTT is not held and is not an approved destination asset.",
          },
        ],
        total: { unguided: "$10,148", wealthsmith: "$10,363", decision: "Market condition: Fear (33) keeps the target crypto allocation at 63.5%." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$3,000", wealthsmith: "$4,000",
            decision: "Safety Buffer remains fully funded at $4,000 in vetted USDC, held in the user’s own wallet rather than on FTX.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$20,600",
            unguided: "$2,020", wealthsmith: "$3,029",
            decision: "BTC moves slightly lower. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$27.80",
            unguided: "$2,138", wealthsmith: "$2,566",
            decision: "Crypto is 5.2 percentage points below the 63.5% target, still within the ±10-point rebalance range. No action is needed.",
          },
          {
            symbol: "FTT", icon: "ftt", explorer: FTT_EXPLORER, priceLabel: "$22.00",
            unguided: "$2,075", wealthsmith: "$0.00",
            decision: "FTT declines as concerns around FTX increase. WealthSmith holds none because it is not an approved destination asset.",
          },
        ],
        total: { unguided: "$9,233", wealthsmith: "$9,595", decision: "Market condition: Fear (30) keeps the target crypto allocation at 63.5%." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$3,000", wealthsmith: "$4,000",
            decision: "Only the $4,000 Safety Buffer remains in stables, held in the user’s own wallet and fully accessible.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$15,900",
            unguided: "$1,559", wealthsmith: "$2,338",
            decision: "BTC falls with the market. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$13.50",
            unguided: "$1,038", wealthsmith: "$1,246",
            decision: "Crypto is 17.7 percentage points below target, which would normally trigger an increase in crypto exposure. But with no eligible capital above the Safety Buffer, no recommendation is made.",
          },
          {
            symbol: "FTT", icon: "ftt", explorer: FTT_EXPLORER, priceLabel: "$4.60",
            unguided: "$434", wealthsmith: "$0.00",
            decision: "FTT falls to $4.60 as FTX halts withdrawals. WealthSmith holds none because it is not an approved destination asset.",
          },
        ],
        total: { unguided: "$6,031", wealthsmith: "$7,584", decision: "Market condition: Extreme Fear (23) raises the target crypto allocation to 65%, but Safety Buffer protection prevents any additional deployment." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$450", wealthsmith: "$4,000",
            decision: "Safety Buffer remains fully funded at $4,000, held in the user’s own wallet and unaffected by FTX’s bankruptcy.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$17,000",
            unguided: "$250", wealthsmith: "$2,500",
            decision: "BTC stabilizes. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$16.00",
            unguided: "$185", wealthsmith: "$1,477",
            decision: "Crypto is 15.1 percentage points below target, but only the Safety Buffer remains in stables. With no eligible capital available above the buffer, no action is recommended.",
          },
          {
            symbol: "FTT", icon: "ftt", explorer: FTT_EXPLORER, priceLabel: "$2.50",
            unguided: "$35", wealthsmith: "$0.00",
            decision: "FTX files for bankruptcy. WealthSmith holds no FTT and has no funds held on FTX.",
          },
        ],
        total: { unguided: "$920", wealthsmith: "$7,977", decision: "Market condition: Extreme Fear (21) keeps the target crypto allocation at 65%, but Safety Buffer protection continues to prevent additional deployment." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$450", wealthsmith: "$4,000",
            decision: "Safety Buffer remains fully funded at $4,000 in vetted USDC, held in the user’s own wallet.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$16,300",
            unguided: "$240", wealthsmith: "$2,397",
            decision: "BTC moves slightly lower. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$13.90",
            unguided: "$160", wealthsmith: "$1,283",
            decision: "Crypto is 17.1 percentage points below target. With no eligible capital available above the Safety Buffer, no action is recommended.",
          },
          {
            symbol: "FTT", icon: "ftt", explorer: FTT_EXPLORER, priceLabel: "$1.30",
            unguided: "$18", wealthsmith: "$0.00",
            decision: "FTT is near worthless. WealthSmith holds none because it is not an approved destination asset.",
          },
        ],
        total: { unguided: "$868", wealthsmith: "$7,680", decision: "Market condition: Extreme Fear (22) keeps the target crypto allocation at 65%, but Safety Buffer protection prevents any additional deployment." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$450", wealthsmith: "$4,000",
            decision: "Safety Buffer closes fully funded at $4,000, equal to three months of expenses.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$16,900",
            unguided: "$249", wealthsmith: "$2,485",
            decision: "BTC recovers slightly. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$14.30",
            unguided: "$165", wealthsmith: "$1,320",
            decision: "The portfolio closes at $7,805, down 21.9% from the start. Crypto remains below target, but no eligible capital is available above the Safety Buffer, so no additional action is recommended.",
          },
          {
            symbol: "FTT", icon: "ftt", explorer: FTT_EXPLORER, priceLabel: "$1.40",
            unguided: "$20", wealthsmith: "$0.00",
            decision: "FTT closes at $1.40. WealthSmith held none at any point and had no funds held on FTX.",
          },
        ],
        total: { unguided: "$884", wealthsmith: "$7,805", decision: "Market condition: Extreme Fear (23) keeps the target crypto allocation at 65%. The Safety Buffer remains fully funded and the portfolio remains in self-custody through the end of the scenario." },
      },
    ],
  },
  {
    id: "inauguration_trap",
    chipLabel: "Inauguration Trap",
    subheading: "Inauguration Trap, January 2025",
    dates: ["Jan 14", "Jan 15", "Jan 16", "Jan 17", "Jan 18", "Jan 19", "Jan 20", "Jan 21"],
    yTicksUsd: [0, 2_000, 4_000, 6_000, 8_000, 10_000, 12_000, 14_000],
    /*
     * ENGINE-DERIVED SCENARIO (same method as the others): medium-risk five-factor
     * target with the historical CMC Fear & Greed score per date →
     * deriveRebalanceAssessment → source selection → card. Guided start: $7,000
     * USDC + $3,000 manually tracked BTC; $4,000 buffer.
     *   Jan 14  F&G 69 (Greed) → target 60.5% → partial $3,000 USDC→SOL (buffer cap) = 16.30 SOL @ $184
     *   Jan 15-21 within ±10pp all week: Extreme Greed (peaking 84 on Jan 19)
     *   LOWERS the target to 59%, keeping SOL's rally inside the band. No trades.
     * TRUMP and MELANIA are not approved destination assets — never held.
     * Unguided: IDENTICAL portfolio through Jan 17 ($4,000 USDC + $3,000 SOL +
     * $3,000 BTC). Jan 18: all $4,000 USDC → 80 TRUMP @ $50 (the hype top, not
     * the $7 launch). Jan 19: sells 90% of SOL at $282 → half into more TRUMP
     * @ $73 (28.3u, total 108.3u) and half into 207 MELANIA @ $10.
     * Peaks +35.8% on inauguration eve; both memecoins crash after.
     * Finale: guided $11,423 (+14.2%) vs unguided $8,655 (−13.5%).
     */
    series: [
      {
        id: "wealthsmith",
        label: "WealthSmith",
        colorToken: "--color-chart-series-1",
        hoverable: true,
        points: [
          {
            valueUsd: 10_000,
            note: {
              title: "Safety Buffer First",
              body: "The $4,000 Safety Buffer—three months of expenses—is held in USDC. With the market in Greed, the target is 60.5% crypto, but only the $3,000 above the buffer can be deployed, adding 16.3 SOL at $184. The upcoming event does not change the strategy.",
            },
          },
          {
            valueUsd: 10_142,
            deltaLabel: "+1.42% from start",
            trend: "up",
            note: {
              title: "On Target",
              body: "The portfolio sits almost exactly on its 60.5% crypto target. No action is needed.",
            },
          },
          {
            valueUsd: 10_448,
            deltaLabel: "+4.48% from start",
            trend: "up",
            note: {
              title: "Within Range",
              body: "Crypto is 1.2 percentage points above the 60.5% target, well within the ±10-point rebalance range. No action is needed.",
            },
          },
          {
            valueUsd: 10_706,
            deltaLabel: "+7.06% from start",
            trend: "up",
            note: {
              title: "TRUMP Not Approved",
              body: "TRUMP launches at $7, but it is not an approved destination asset, so WealthSmith does not recommend it. Greed lowers the crypto target to 59%, and the portfolio remains within the ±10-point rebalance range. No action is needed.",
            },
          },
          {
            valueUsd: 11_159,
            deltaLabel: "+11.59% from start",
            trend: "up",
            note: {
              title: "Within Range",
              body: "TRUMP trades near $50 and SOL rises to $240. Crypto is 5.2 percentage points above the 59% target, still within the ±10-point rebalance range. No action is needed.",
            },
          },
          {
            valueUsd: 11_738,
            deltaLabel: "+17.38% from start",
            trend: "up",
            note: {
              title: "Within Range",
              body: "SOL reaches $282 as Extreme Greed (84) keeps the crypto target at 59%. Crypto is 6.9 percentage points above target, still within the ±10-point rebalance range. No action is needed. MELANIA is not an approved destination asset, so WealthSmith does not recommend it.",
            },
          },
          {
            valueUsd: 11_166,
            deltaLabel: "+11.66% from start",
            trend: "up",
            note: {
              title: "Within Range",
              body: "SOL pulls back to $245 after the inauguration. The portfolio gives back some gains but remains within the ±10-point rebalance range. WealthSmith holds no TRUMP or MELANIA because neither is an approved destination asset. No action is needed.",
            },
          },
          {
            valueUsd: 11_423,
            deltaLabel: "+14.23% from start",
            trend: "up",
            note: {
              title: "Gains Preserved",
              body: "The portfolio closes at $11,423, up 14.2% from the start. The $4,000 Safety Buffer remains intact, and the portfolio had no exposure to TRUMP or MELANIA throughout the scenario.",
            },
          },
        ],
      },
      {
        id: "unguided",
        label: "Unguided",
        colorToken: "--color-chart-series-8",
        hoverable: true,
        points: [
          {
            valueUsd: 10_000,
            note: {
              title: "Same Starting Point",
              body: "The unguided portfolio starts identically: $4,000 in USDC, $3,000 in SOL, $3,000 in BTC. For the first few days, there is no difference at all.",
            },
          },
          {
            valueUsd: 10_142,
            deltaLabel: "+1.42% from start",
            note: {
              title: "Tracking the Market",
              body: "Both portfolios move together — the difference is not the market, it is what happens when the hype arrives.",
            },
          },
          {
            valueUsd: 10_448,
            deltaLabel: "+4.48% from start",
            note: {
              title: "Inauguration Buzz",
              body: "Social feeds fill with inauguration trade ideas. The portfolio still matches the guided one — for now.",
            },
          },
          {
            valueUsd: 10_706,
            deltaLabel: "+7.06% from start",
            note: {
              title: "Watching TRUMP Moon",
              body: "TRUMP launches at $7 and multiplies within hours. The user watches the chart all night, deciding whether to get in.",
            },
          },
          {
            valueUsd: 11_159,
            deltaLabel: "+11.59% from start",
            note: {
              title: "FOMO at the Top",
              body: "The user converts their entire $4,000 cash reserve into 80 TRUMP at $50 — seven times the launch price. There are no stables left in the portfolio.",
            },
          },
          {
            valueUsd: 13_578,
            deltaLabel: "+35.78% from start",
            note: {
              title: "Exposure Increases",
              body: "TRUMP reaches $73 and the portfolio rises to $13,578, up 35.8% from the start. The user then sells 90% of their SOL at $282 to buy more TRUMP near the peak and adds 207 MELANIA at $10 on launch night.",
            },
          },
          {
            valueUsd: 9_042,
            deltaLabel: "−9.58% from start",
            note: {
              title: "Gains Reverse",
              body: "After the inauguration, TRUMP falls to $40 and MELANIA to $5.50. With most of the portfolio concentrated in the two memecoins, the earlier gains are quickly reversed and the portfolio falls to $9,042—down 9.6% from the start.",
            },
          },
          {
            valueUsd: 8_655,
            deltaLabel: "−13.45% from start",
            note: {
              title: "Losses Continue",
              body: "The portfolio closes at $8,655, down 13.5% from the start. With most of the portfolio concentrated in TRUMP and MELANIA, the earlier gains reverse as both tokens fall after launch.",
            },
          },
        ],
      },
      {
        id: "safety_buffer",
        label: "Safety Buffer",
        colorToken: "--color-chart-series-3",
        hoverable: false,
        points: [
          { valueUsd: 4_000 }, { valueUsd: 4_000 }, { valueUsd: 4_000 }, { valueUsd: 4_000 },
          { valueUsd: 4_000 }, { valueUsd: 4_000 }, { valueUsd: 4_000 }, { valueUsd: 4_000 },
        ],
      },
    ],
    breakdown: [
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$4,000", wealthsmith: "$4,000",
            decision: "Safety Buffer is fully funded at $4,000 in vetted USDC, equal to three months of expenses.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$96,500",
            unguided: "$3,000", wealthsmith: "$3,000",
            decision: "BTC is manually tracked — it counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$184.00",
            unguided: "$3,000", wealthsmith: "$3,000",
            decision: "The target calls for $3,050 more in crypto. Because only $3,000 is available above the Safety Buffer, WealthSmith recommends adding 16.3 SOL at $184.",
          },
        ],
        total: { unguided: "$10,000", wealthsmith: "$10,000", decision: "Market condition: Greed (69) sets the target crypto allocation at 60.5%." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$4,000", wealthsmith: "$4,000",
            decision: "Safety Buffer remains fully funded at $4,000 in vetted USDC.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$100,000",
            unguided: "$3,109", wealthsmith: "$3,109",
            decision: "BTC crosses $100,000. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$186.00",
            unguided: "$3,033", wealthsmith: "$3,033",
            decision: "Crypto is almost exactly at the 60.5% target, well within the ±10-point rebalance range. No action is needed.",
          },
        ],
        total: { unguided: "$10,142", wealthsmith: "$10,142", decision: "Market condition: Greed (70) keeps the target crypto allocation at 60.5%." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$4,000", wealthsmith: "$4,000",
            decision: "Safety Buffer remains fully funded at $4,000 in vetted USDC.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$99,900",
            unguided: "$3,106", wealthsmith: "$3,106",
            decision: "BTC remains near $100,000. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$205.00",
            unguided: "$3,342", wealthsmith: "$3,342",
            decision: "SOL rises to $205. Crypto is 1.2 percentage points above the 60.5% target, still within the ±10-point rebalance range. No action is needed.",
          },
        ],
        total: { unguided: "$10,448", wealthsmith: "$10,448", decision: "Market condition: Greed (74) keeps the target crypto allocation at 60.5%." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$4,000", wealthsmith: "$4,000",
            decision: "Safety Buffer remains fully funded at $4,000 in vetted USDC.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$104,000",
            unguided: "$3,233", wealthsmith: "$3,233",
            decision: "BTC rises to $104,000. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$213.00",
            unguided: "$3,473", wealthsmith: "$3,473",
            decision: "Crypto is 3.6 percentage points above the 59% target, still within the ±10-point rebalance range. No action is needed.",
          },
          {
            symbol: "TRUMP", icon: "trump", explorer: TRUMP_EXPLORER, priceLabel: "$7.00",
            unguided: "$0.00", wealthsmith: "$0.00",
            decision: "TRUMP launches at $7. It is not an approved destination asset, so WealthSmith does not recommend adding it.",
          },
        ],
        total: { unguided: "$10,706", wealthsmith: "$10,706", decision: "Market condition: Extreme Greed (76) lowers the target crypto allocation to 59%." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$0.00", wealthsmith: "$4,000",
            decision: "Safety Buffer remains fully funded at $4,000 in vetted USDC.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$104,400",
            unguided: "$3,246", wealthsmith: "$3,246",
            decision: "BTC stabilizes. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$240.00",
            unguided: "$3,913", wealthsmith: "$3,913",
            decision: "SOL rises to $240. Crypto is 5.2 percentage points above the 59% target, still within the ±10-point rebalance range. No action is needed.",
          },
          {
            symbol: "TRUMP", icon: "trump", explorer: TRUMP_EXPLORER, priceLabel: "$50.00",
            unguided: "$4,000", wealthsmith: "$0.00",
            decision: "TRUMP trades near $50. It remains an unapproved destination asset, so WealthSmith does not recommend adding it.",
          },
        ],
        total: { unguided: "$11,159", wealthsmith: "$11,159", decision: "Market condition: Extreme Greed (79) keeps the target crypto allocation at 59%." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$0.00", wealthsmith: "$4,000",
            decision: "Safety Buffer remains fully funded at $4,000 in vetted USDC.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$101,000",
            unguided: "$3,140", wealthsmith: "$3,140",
            decision: "BTC moves slightly lower. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$282.00",
            unguided: "$460", wealthsmith: "$4,598",
            decision: "SOL reaches $282. Crypto is 6.9 percentage points above the 59% target, still within the ±10-point rebalance range. No action is needed.",
          },
          {
            symbol: "TRUMP", icon: "trump", explorer: TRUMP_EXPLORER, priceLabel: "$73.00",
            unguided: "$7,909", wealthsmith: "$0.00",
            decision: "TRUMP trades near $73. It remains an unapproved destination asset, so WealthSmith does not recommend adding it.",
          },
          {
            symbol: "MELANIA", icon: "melania", explorer: MELANIA_EXPLORER, priceLabel: "$10.00",
            unguided: "$2,069", wealthsmith: "$0.00",
            decision: "MELANIA launches at $10. It is not an approved destination asset, so WealthSmith does not recommend adding it.",
          },
        ],
        total: { unguided: "$13,578", wealthsmith: "$11,738", decision: "Market condition: Extreme Greed (84) keeps the target crypto allocation at 59%." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$0.00", wealthsmith: "$4,000",
            decision: "Safety Buffer remains fully funded at $4,000 in vetted USDC.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$102,000",
            unguided: "$3,171", wealthsmith: "$3,171",
            decision: "BTC remains stable. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$245.00",
            unguided: "$399", wealthsmith: "$3,995",
            decision: "SOL falls to $245. Crypto remains within the ±10-point rebalance range, so no action is needed.",
          },
          {
            symbol: "TRUMP", icon: "trump", explorer: TRUMP_EXPLORER, priceLabel: "$40.00",
            unguided: "$4,334", wealthsmith: "$0.00",
            decision: "TRUMP falls to $40. WealthSmith holds none because it is not an approved destination asset.",
          },
          {
            symbol: "MELANIA", icon: "melania", explorer: MELANIA_EXPLORER, priceLabel: "$5.50",
            unguided: "$1,138", wealthsmith: "$0.00",
            decision: "MELANIA falls to $5.50. WealthSmith holds none because it is not an approved destination asset.",
          },
        ],
        total: { unguided: "$9,042", wealthsmith: "$11,166", decision: "Market condition: Extreme Greed (76) keeps the target crypto allocation at 59%." },
      },
      {
        rows: [
          {
            symbol: "USDC", icon: "usdc", explorer: USDC_EXPLORER, priceLabel: "$1.00",
            unguided: "$0.00", wealthsmith: "$4,000",
            decision: "Safety Buffer closes fully funded at $4,000, equal to three months of expenses.",
          },
          {
            symbol: "BTC", icon: "btc", explorer: BTC_EXPLORER, priceLabel: "$106,100",
            unguided: "$3,298", wealthsmith: "$3,298",
            decision: "BTC closes at $106,100. It is manually tracked and counts toward portfolio allocation, but WealthSmith does not use it for on-chain actions.",
          },
          {
            symbol: "SOL", icon: "sol", explorer: SOL_EXPLORER, priceLabel: "$253.00",
            unguided: "$412", wealthsmith: "$4,125",
            decision: "The portfolio closes at $11,423, up 14.2% from the start. Crypto remains within the ±10-point rebalance range, so no additional action is needed.",
          },
          {
            symbol: "TRUMP", icon: "trump", explorer: TRUMP_EXPLORER, priceLabel: "$38.00",
            unguided: "$4,117", wealthsmith: "$0.00",
            decision: "TRUMP closes at $38. WealthSmith held none at any point because it is not an approved destination asset.",
          },
          {
            symbol: "MELANIA", icon: "melania", explorer: MELANIA_EXPLORER, priceLabel: "$4.00",
            unguided: "$828", wealthsmith: "$0.00",
            decision: "MELANIA closes at $4. WealthSmith held none at any point because it is not an approved destination asset.",
          },
        ],
        total: { unguided: "$8,655", wealthsmith: "$11,423", decision: "Market condition: Greed (72) raises the target crypto allocation to 60.5%. The portfolio remains within range through the end of the scenario." },
      },
    ],
  },
];

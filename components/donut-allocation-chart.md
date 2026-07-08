# Donut Allocation Chart

The Donut Allocation Chart shows the composition of a portfolio or asset group by percentage and value.

It is the approved chart pattern for **composition views** — parts of a whole that sum to 100%. It is a specialization of the donut variant in `components/chart.md`, with a fixed anatomy (center value, callouts, legend) for WealthSmith portfolio composition.

It renders structured, product-provided data. It does not calculate portfolio value, prices, percentages, categories, or recommendations.

---

## Purpose

Use the Donut Allocation Chart to help users understand **what a portfolio (or asset group) is made of**, by percentage and by value.

A Donut Allocation Chart should help users:

- See how a portfolio splits across broad categories (Crypto vs Stables)
- See how a crypto/asset group splits across individual assets (SOL, JUP, USDC, …)
- Read the total value of the group at a glance (center label)
- Read the exact share of each key segment (callouts + legend)

---

## Use Cases

Use the Donut Allocation Chart for:

```text
Balance Overview          — Crypto vs Stables (2-part donut)
Crypto Assets Allocation  — top assets + Other (multi-part donut)
Portfolio category mix
Asset class composition
```

### 1. Balance Overview

- 2-part donut: **Crypto / Stables**
- Center value shows **total portfolio value**
- Side callouts show category label + percent
- Legend on the right (desktop) / below (mobile)

### 2. Crypto Assets Allocation

- Multi-part donut: e.g. **SOL / JUP / USDC / BONK / Other**
- Center value shows **total crypto/asset-group value**
- Side callouts show the key category labels + percents
- Legend on the right (desktop) / below (mobile)

---

## Do Not Use For

The Donut Allocation Chart is a composition view. Do **not** use it for:

```text
Current vs Recommended comparison   -> horizontal bar comparison chart
Before / after comparison           -> horizontal bar comparison chart
Trend over time                     -> line chart (components/chart.md)
Projected growth                    -> line chart (components/chart.md)
Safety Buffer progress              -> components/progress-bar.md
Strategy ranking / suggestions      -> components/suggestion-card.md
```

**Current vs Recommended Allocation stays a horizontal comparison chart** (`components/chart.md` → Horizontal Bar Chart). The donut is composition only; it never expresses a target, recommendation, or before/after state.

---

## Visual Anatomy

```text
Donut Allocation Chart
  1. Section title              (outside the card, e.g. "Balance Overview")
  2. Chart card                 (surface card, border, radius, padding)
       3. Donut chart           (ring with rounded segments + gaps)
            4. Center value      (total value, large bold)
       5. Callouts              (label + percent, subtle leader lines)
       6. Legend                (color dot + label; right on desktop, below on mobile)
  7. Empty / unavailable state  (in the same card when no priced value)
```

### 1. Section title

Sits **outside** the card, above it (consistent with the real-wallet dashboard section heads and `components/chart.md` → Chart Container).

```text
Balance Overview
Crypto Assets Allocation
```

### 2. Chart card

- Surface card (`components/card.md`): `--color-surface-card`, `--color-border-subtle` border, `--radius-surface-md`, card padding, `--shadow-card-default`.
- Chart centered horizontally within the card body.
- Generous internal spacing; responsive layout.

### 3. Donut chart

- Circular ring made of thick, **rounded** segments.
- Visible gaps between segments.
- No 3D effects. No gradients unless already approved. No tiny unreadable labels inside segments.
- Segment order matches the data order (value descending, `Other` last).

### 4. Center value

- The **total** portfolio value or total asset-group value.
- Large bold number, metric typography (`typography.metric.primary`).
- Formatted as currency when a value exists (e.g. `$35,000`).
- If pricing is missing, show the unavailable state (see below) — never a fake `$0`.

### 5. Callouts

- Label + percentage for key slices, with **subtle/dotted leader lines**.
- Callouts must not overlap. When there are many categories, use callouts only for the key slices and lean on the legend for the rest.
- Small categories may be grouped into `Other` when product data provides that grouping.

### 6. Legend

- Placed on the **right** on desktop; **below** the chart on mobile.
- Color dot + visible text label, in the **same order** as the chart data.
- Uses the approved dot-marker (`assets/icons/chart/chart-dot-marker.svg`) and chart series tokens (see `components/chart.md` → Legend Markers).
- Legend labels are always visible text — never icon-only, never color-only.

### 7. Empty / unavailable state

When no priced value exists:

- Keep the card visible.
- Do **not** render a fake/placeholder chart.
- Show:

```text
Allocation needs pricing data before it can be shown.
```

---

## Data Contract

The chart is fully data-driven. Segments, values, percentages, and colors come from product logic.

```ts
type DonutAllocationSegment = {
  id: string;            // stable id (e.g. "crypto", "sol")
  label: string;         // visible label (e.g. "Crypto", "SOL")
  valueUsd: number;      // priced USD value of the segment
  percent: number;       // share of the (priced) whole, 0–100
  colorToken: string;    // chart series / neutral token (see Colors)
  callout?: boolean;     // render a leader-line callout for this segment
};

type DonutAllocationChartProps = {
  title?: string;                    // section title (e.g. "Balance Overview")
  totalValueUsd: number | null;      // center value; null -> unavailable state
  segments: DonutAllocationSegment[];
  centerLabel?: string;              // optional override for the center label
  showLegend?: boolean;              // default true
  showCallouts?: boolean;            // default true on desktop
  emptyState?: string;               // unavailable message
  warning?: string;                  // e.g. "Excludes positions without a sourced price."
};
```

`percent` and `valueUsd` are **inputs**, not computed by the component. The component renders arcs from `percent` and shows `valueUsd`/`totalValueUsd` as provided.

---

## Data Rules

See `rules/financial-logic-boundaries.md` → Composition (Donut) Allocation.

- Use **priced wallet value only**.
- Do **not** include unpriced assets in percentages.
- Percentages should sum to **100%** after excluding unpriced assets.
- Do not invent prices.
- Do not invent categories.
- Unknown **priced** assets may be included as `Unknown`, or grouped into `Other`.
- Unknown **unpriced** assets are excluded from the chart and should trigger a `warning` (e.g. "Excludes positions without a sourced price.").

### Crypto Assets Allocation rules

Use individual asset segments. Recommended:

- Show the **top 5 or 6 assets** by priced USD value.
- Group the rest into `Other`.
- Include `Other` only when it is needed (there are remaining assets).
- Order segments by value **descending**, except `Other`, which is always **last**.
- Token symbol must be visible in the legend/callout (icons alone are not identity — see `patterns/portfolio-overview.md`).

---

## Colors

Use existing chart color series tokens from the design system (`components/chart.md` → Colors). Do not hardcode random colors and do not assign colors randomly on every render.

Approved mapping for this component:

```text
Crypto / primary asset : color.chart.series.1
Stables                : color.chart.series.4   (teal)
Additional assets      : next chart series tokens by descending value
Other                  : neutral subdued/gray token (e.g. color.subdued.neutral.background.dark)
```

Rules:

- Keep Crypto and Stables colors consistent across a view.
- Stablecoins always take the teal Stables token (`color.chart.series.4`), regardless of their position in the ordering.
- Additional non-stable assets take the next series tokens by descending value. Prefer visually distinct series; `series.3` (`#009D9A`) and `series.4` (`#007D79`) are both teal, so avoid pairing them in the same donut.
- `Other` always uses the neutral gray token, never a chart series color.
- Do not use warning/danger colors here — this chart never communicates warning/error through segment color.
- See `components/chart.md` → Colors for the general recurring mapping and the full `color.chart.series.1–12` palette.

---

## Responsive Behavior

### Desktop

- Callouts to the left/right of the chart.
- Legend on the right.
- Chart centered in the card with comfortable whitespace.

### Tablet / Mobile

- Reduce callouts or hide leader lines if they collide.
- Legend moves **below** the chart.
- Chart stays readable; center value stays visible.
- Labels must not overflow the card (constrain width; wrap/scroll the legend if needed).

Mobile-first, consistent with `components/chart.md` → Responsive Behavior.

---

## Accessibility

- The chart must have a **text equivalent** — an accessible summary on the chart container.

```text
Portfolio allocation: Crypto 87%, Stables 13%.
Crypto assets allocation: SOL 34%, JUP 20%, USDC 18%, BONK 12%, Other 16%.
```

- Legend labels must be visible text; segment order and legend order must match.
- Do not rely on color alone to convey category.
- Keyboard users must be able to understand the chart through the text summary (and legend), without hover.
- If implemented as SVG: mark decorative segment paths appropriately (e.g. `aria-hidden`) and put the accessible label/summary on the chart container (`role="img"` + `aria-label`, or a visually-hidden summary).
- Contrast must meet WCAG AA.

---

## Interaction

For MVP:

- The chart can be **static**.
- No hover tooltip required.
- No click interaction required.

Future (optional, only if it becomes part of the app pattern):

- Segment hover may show label, value, percent.
- Keyboard focus may reveal segment details.

Do not implement hover/focus interactions unless they are already part of the app pattern.

---

## Examples

Fixture examples only — synthetic reference data, not any user's real holdings. See
`examples/portfolio/portfolio-donut-allocation-example.json`.

### Example 1 — Balance Overview

```text
Title:  Balance Overview
Center: $35,000
Segments:
  Crypto   $30,450   87%   color.chart.series.1
  Stables  $4,550    13%   color.chart.series.4
Summary: "Portfolio allocation: Crypto 87%, Stables 13%."
```

### Example 2 — Crypto Assets Allocation

```text
Title:  Crypto Assets Allocation
Center: $35,000
Segments:
  SOL    $11,900   34%   color.chart.series.1
  JUP    $7,000    20%   color.chart.series.2
  USDC   $6,300    18%   color.chart.series.4   (stablecoin -> teal)
  BONK   $4,200    12%   color.chart.series.5
  Other  $5,600    16%   color.subdued.neutral.background.dark
Summary: "Crypto assets allocation: SOL 34%, JUP 20%, USDC 18%, BONK 12%, Other 16%."
```

Percentages sum to 100% after excluding any unpriced assets.

---

## Implementation Notes

- Prefer **SVG** for precise arcs, rounded caps, gaps, and leader lines.
- Use CSS variables / design tokens for colors, spacing, border, typography, and shadows.
- Do not use `<canvas>` unless necessary.
- Do not use remote charting libraries unless approved.
- Keep the component **deterministic and data-driven**: same props → same output. No calculation of value, price, percent, category, or recommendation inside the component.
- SVG label text must render at the token's actual pixel size (do not let viewBox scaling inflate/shrink labels — see `components/chart.md` → Label Typography).

---

## Relationship to Product Logic

The Donut Allocation Chart is a **renderer**. It must not decide:

```text
Portfolio value
Token price
Allocation percentage
Category membership (Crypto / Stables / Other)
Which assets are "top" assets
Recommended allocation
```

Those come from portfolio valuation/grouping logic, pricing, and parent state.

---

## Source of Truth

The Donut Allocation Chart is the **approved chart pattern for composition views** (parts of a whole, sum to 100%): Balance Overview, Crypto Assets Allocation, portfolio category mix, asset-class composition.

It does **not** replace comparison charts. Current vs Recommended Allocation, before/after, and other comparisons remain **horizontal bar comparison charts** (`components/chart.md`).

---

## Do

- Use for composition (parts of a whole).
- Use priced value only; exclude unpriced assets from percentages.
- Show a center total, visible legend labels, and an accessible summary.
- Use approved chart series tokens; keep Crypto/Stables colors consistent.
- Group small assets into `Other` when product data provides it.
- Keep all calculation outside the component.

## Do Not

- Do not use for comparison, before/after, trend, projection, buffer progress, or ranking.
- Do not invent prices, percentages, categories, or `Other` groupings.
- Do not include unpriced assets in percentages.
- Do not render a fake chart when pricing is missing — show the unavailable state.
- Do not rely on color alone; do not use warning/danger colors for segments.
- Do not hardcode raw colors or use random per-render colors.

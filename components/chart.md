# Chart

Charts visualize structured financial data in WealthSmith.

They help users understand portfolio allocation, projected growth, current vs recommended allocation, asset mix, category distribution, and other numeric patterns.

Charts should be readable, explainable, accessible, and careful with financial meaning.

---

## Purpose

Use charts to help users understand data visually.

A chart should help users:

- See portfolio allocation
- Compare current and recommended asset mix
- Understand projected growth over time
- View crypto vs stable asset balance
- See asset category distribution
- Understand trends
- Compare values across categories
- Support a recommendation with visible data
- Explore portfolio structure without hiding exact numbers

Charts should make data easier to understand, not make uncertain financial outputs feel guaranteed.

---

## Important Rule

Charts display structured data.

Charts do not calculate WealthSmith business logic.

A chart can display:

- Series data
- Labels
- Percentages
- Currency values
- Token/category allocation
- Current vs recommended values
- Projected values
- Axis labels
- Legends
- Tooltips
- Empty/loading/error states

A chart must not decide:

- Portfolio value
- Token price
- Allocation percentage
- Recommended allocation
- Safety buffer target
- Projected growth model
- Risk level
- Rebalance recommendation
- Suggestion priority
- Top Pick status
- Protocol ranking
- Token selection
- Whether a user should invest

Those values must come from backend data, deterministic rules, Suggestion Engine, portfolio logic, or parent state.

The chart should render the chart data provided to it.

Do not invent values, labels, percentages, forecasts, or recommendations.

---

## Chart vs Progress Bar

Charts and progress bars are related but different.

### Chart

Use charts for visualizing multiple values, categories, trends, or comparisons.

Examples:

```text
Projected Growth
Current vs Recommended Allocation
Portfolio Allocation
Crypto Assets Allocation
```

### Progress Bar

Use progress bars for progress toward a known target.

Examples:

```text
Safety Buffer Coverage
Onboarding Progress
Wallet Sync Progress
```

Use `components/progress-bar.md` for safety buffer coverage bars like:

```text
82% 2.8/3 months
100% 3/3 months
```

Do not rebuild progress-bar behavior inside the chart component unless product implementation intentionally treats progress visuals as a chart wrapper.

---

## When to Use

Use charts when visual comparison improves understanding.

Examples:

- Projected growth over time
- Current vs recommended allocation
- Crypto vs stable asset mix
- Token allocation donut chart
- Portfolio category allocation
- Stablecoin reserve coverage when shown as part of a visual dashboard
- Asset breakdown by value
- Allocation by token
- Allocation by risk category
- Historical value, if supported later
- Yield by protocol, if supported later

Charts can appear in:

- Dashboard
- Portfolio overview
- Suggestion details
- Recommendation review
- Onboarding summary
- Demo mode preview
- Asset allocation pages
- Wallet details
- Protocol/yield pages
- Smith AI explanation context

---

## When Not to Use

Do not use charts for:

- One simple value
- Short status labels
- Field validation
- Action feedback
- Critical warnings
- Pure decoration
- Values that are unknown or unreliable
- Data with no meaningful comparison
- Financial projections without clear modeling context
- Anything that would imply certainty when the value is estimated

Use:

- `components/metric-card.md` for single values
- `components/progress-bar.md` for target progress
- `components/table.md` for precise row comparison
- `components/alert.md` for persistent messages
- `components/badge.md` for status labels
- `components/toast.md` for temporary feedback

Do not use charts to make speculative outputs look certain.

---

## Data Source

Charts should render structured data.

Expected data may include:

```text
id
title
description
type
series
categories
labels
values
currency
unit
timeRange
xAxis
yAxis
legend
tooltip
centerLabel
annotations
isEstimated
isProjected
source
updatedAt
status
emptyMessage
errorMessage
```

Series data may include:

```text
id
label
value
formattedValue
percentage
colorToken
category
data
icon
tokenSymbol
tokenName
```

The exact schema can evolve.

The component should not invent data, labels, values, percentages, colors, projections, sources, or timestamps.

---

## Anatomy

A chart can include:

1. Chart container
2. Optional title
3. Optional description
4. Chart canvas or SVG area
5. Data series
6. Axis labels
7. Grid lines
8. Data labels
9. Legend
10. Tooltip
11. Optional center label
12. Optional annotations
13. Optional source text
14. Optional updated timestamp
15. Optional empty/loading/error state

Required:

- Chart data visualization
- Accessible chart label
- Text alternative or accessible data summary
- Clear labels or legend when multiple series exist

Optional:

- Title
- Description
- Axis
- Grid
- Legend
- Tooltip
- Data labels
- Center value
- Source
- Updated timestamp
- Loading state
- Empty state
- Error state

A chart should remain understandable without relying on color alone.

---

## Chart Container

Charts often appear inside a card-like container.

Rules:

- Use `components/card.md` container behavior when the chart is presented as a card.
- Chart container should use semantic tokens.
- Title and description should sit outside the plotting area.
- The description sits directly under the chart heading.
- The legend sits at the bottom of the chart/card content, below the chart body.
- The legend must not appear between the heading and the chart body.
- Chart area should have enough padding for labels.
- Do not crop labels or legends.
- Do not force charts into cramped containers.

Example structure:

```text
Chart card
  Title
  Description (directly under the title)
  Chart area
  Legend (bottom of chart content, horizontally centered)
  Optional source/update text
```

---

## Variants

### Line Chart

Use for trends over time.

Example:

```text
Projected Growth
```

Use when:

- X-axis is time
- Y-axis is value
- Users need to see direction over time
- Data points are ordered

Rules:

- Use clear time labels.
- Use clear value labels.
- Show projected state when data is modeled.
- Do not imply projection is guaranteed.
- Do not calculate projection inside the chart.
- Use data points when they improve readability.
- Avoid too many series.

Good description:

```text
Modeled using your strategy settings over your selected timeline.
```

Avoid:

```text
Guaranteed future growth.
```

---

### Area Chart

Use when emphasizing cumulative trend or projected range.

Example:

```text
Projected Growth with filled area
```

Rules:

- Area fill should be subtle.
- Area fill must not make the projection feel guaranteed.
- If the data is projected, label it clearly.
- Use a legend or label when needed.
- Do not overemphasize speculative data.

---

### Bar Chart

Use to compare values across categories.

Examples:

```text
Current vs Recommended Allocation
Crypto vs Stables
Asset category comparison
```

Rules:

- Use consistent scale.
- Label bars clearly.
- Show exact values when important.
- Align values for easy comparison.
- Do not calculate recommended values inside the chart.
- Do not imply recommendation unless data explicitly provides it.

---

### Horizontal Bar Chart

Use when category labels are important or long.

Example:

```text
Current vs Recommended Allocation
```

Rules:

- Category labels should be readable.
- Values should appear near bars when useful.
- Group labels such as Current and Recommended should be clear.
- Use legends when multiple series appear.
- Do not rely on color alone to distinguish series.

Good labels:

```text
Current
Recommended
Crypto
Stables
```

---

### Donut Chart

Use to show composition or allocation.

For WealthSmith portfolio composition (Balance Overview, Crypto Assets Allocation),
use the dedicated `components/donut-allocation-chart.md` — the approved composition
pattern with a fixed anatomy (center value, callouts, legend). The rules below are
the general donut guidance.

Examples:

```text
Portfolio Allocation
Crypto Assets Allocation
```

Use when:

- Data represents parts of a whole
- Categories sum to 100%
- Users need to understand composition

Rules:

- Use labels or legend.
- Show percentages.
- Use center label only when it adds clear value.
- Center value may show total portfolio value when provided.
- Do not calculate total value inside the chart.
- Avoid too many segments.
- Group small segments into `Other` when product data provides it.
- Do not rely on color alone.

Good center label:

```text
$35,000
```

Good segment labels:

```text
Crypto 87%
Stables 13%
SOL 34%
ETH 20%
BTC 18%
```

---

### Allocation Donut Chart

Use for portfolio category allocation.

Example:

```text
Crypto / Stables
```

Rules:

- Segment values must sum to the displayed total or be clearly labeled if approximate.
- Show center total only when data is current or clearly estimated.
- Use legend when labels are not directly attached.
- Keep category labels short.
- Do not imply ideal allocation unless this is a recommended allocation chart.

---

### Token Allocation Donut Chart

Use for crypto asset allocation.

Example:

```text
SOL 34%
ETH 20%
BTC 18%
USDC 12%
ARB 7.2%
BONK 4.8%
Other 4%
```

Rules:

- Token symbol must be visible.
- Token icon may be used elsewhere, but chart legend must include readable text.
- Use `Other` only when product data provides grouped values.
- Do not create token categories inside the chart.
- Do not recommend tokens through chart ordering or emphasis unless product logic provides that meaning.

---

### Comparison Chart

Use to compare current vs target, current vs recommended, or before vs after.

Example:

```text
Current vs Recommended Allocation
```

Rules:

- Clearly label both comparison states.
- Do not calculate recommended allocation inside the chart.
- Avoid making recommended state feel like guaranteed improvement.
- Explain source or modeling context nearby when needed.

---

### Projection Chart

Use for modeled future values.

Example:

```text
Projected Growth
```

Rules:

- Must be labeled as projected or modeled.
- Must include context like timeline, assumptions, or source when available.
- Must not imply guaranteed future value.
- Should use calm visual styling.
- Avoid overly precise projections if model confidence is limited.
- Projection model belongs outside the chart.

Allowed language:

```text
Projected
Modeled
Estimate
May change
```

Avoid:

```text
Guaranteed
Expected profit
Future value locked
```

---

## Legends

Use legends when charts contain multiple series or categories.

Rules:

- Legend labels must match data labels.
- Legend colors must match chart series.
- Legend should be close to the chart.
- The legend row belongs at the bottom of the chart/card content, below the chart body, unless a specific component spec says otherwise.
- The legend row is horizontally centered.
- Legend marker and text label are vertically aligned within each legend item.
- The legend must not appear between the chart heading and the chart body.
- Donut charts may place the legend beside the chart where space allows, but never between the heading and the chart body.
- Legend should not rely on color alone if labels are missing.
- Keep labels short.
- Use semantic chart tokens.
- Do not invent legend categories.

### Legend Markers

Use the approved chart marker assets from the icon registry:

```text
assets/icons/chart/chart-line-marker.svg -> line/trend series legends (e.g. Growth)
assets/icons/chart/chart-dot-marker.svg  -> categorical, allocation, and single-color progress legends (e.g. Crypto, Stables, Covered Buffer)
```

Rules:

- Line charts use the approved line-marker legend icon for the line series (e.g. Growth).
- Single-color progress/bar legends use the approved dot-marker icon.
- Multi-series allocation legends use approved dot-marker icons, one per series.
- Legend markers must be paired with visible text labels, never icon-only.
- Marker color comes from chart series tokens or chart data (see `assets/icons/README.md`, Chart Icons).
- Do not create ad-hoc inline legend icons or shapes.
- Do not use plain text-only legends when an approved chart marker exists.
- Do not invent marker asset paths. If a required marker is missing from the registry, report it as an implementation issue instead of inventing a substitute.

Examples:

```text
Crypto
Stables
Growth
SOL
ETH
BTC
USDC
ARB
BONK
Other
```

---

## Labels

Charts should use labels when they improve readability.

Label types:

- Axis labels
- Category labels
- Data labels
- Percentage labels
- Currency labels
- Center labels
- Legend labels
- Tooltip labels

Rules:

- Labels must be readable.
- Labels must not overlap.
- Use compact formatting where needed.
- Avoid excessive labels that make the chart noisy.
- Do not hide essential values only in tooltips.
- Use labels for important allocation segments.

### Label Typography

Use existing semantic typography tokens only:

```text
typography.chart.value -> chart value labels (numeric data labels, e.g. dollar values above chart points): metric/number styling (Space Grotesk)
typography.chart.label -> chart axis labels, category labels, legend labels: small chart-axis label styling (Manrope)
```

Rules:

- Chart value labels use metric/number styling through `typography.chart.value`.
- Chart axis labels use small chart-axis / small-label styling through `typography.chart.label`.
- X-axis labels, including time labels such as `Year 0`, `Year 1`, `Year 3`, `Year 5` or `Now / 2Y / 4Y`, must not use metric-size typography. They use `typography.chart.label`.
- Axis, category, and legend labels must not use metric typography tokens (`typography.metric.primary`, `typography.metric.secondary`, `typography.metric.compact`).
- Metric typography is reserved for metric values, such as metric-card values and donut center labels.
- Axis labels must not visually compete with the chart's value labels.
- Labels must render at the token's actual pixel size. SVG implementations must not let viewBox scaling inflate or shrink label text relative to surrounding UI text.
- Do not invent new typography token names for charts. If a chart needs a style no existing semantic token covers, describe the intended style in the spec and raise it with product/design instead of adding tokens.

---

## Tooltips

Charts may include tooltips for exact values.

Rules:

- Use tooltip behavior aligned with `components/tooltip.md`.
- Tooltip content must come from structured data.
- Tooltip should not generate financial interpretation.
- Tooltip should not hide critical data.
- On mobile, tooltip behavior must be tap-friendly.
- Tooltips should include units.

Good tooltip:

```text
6Y
Projected value: $110,000
```

Good allocation tooltip:

```text
SOL
34% of crypto assets
```

Avoid:

```text
Best-performing asset
```

unless product logic provides that analysis and approved copy.

---

## Axes

Charts with axes must use clear axis labels and scale.

Rules:

- Axis labels should be readable.
- Axis labels use `typography.chart.label`, never metric typography (see Label Typography).
- Use compact number formatting.
- Use grid lines lightly.
- Y-axis should start at zero for bar charts unless product behavior explicitly allows otherwise.
- Line chart axis may use meaningful scale but should not mislead.
- Avoid visual exaggeration.
- Use consistent units.

Examples:

```text
0
40k
80k
120k
160k
200k
```

### Axis Label Positioning

There are two x-axis positioning modes. A chart uses exactly one.

#### Milestone spacing

Used by the MVP Dashboard Projected Growth chart.

```text
x = milestoneIndex / (milestoneCount - 1)
```

Rules:

- The MVP Dashboard Projected Growth chart uses milestone spacing, not continuous-time spacing.
- Visible milestone labels have equal visual gaps across the available x-axis.
- Year 0, Year 1, Year 3, Year 5 are evenly distributed: 0%, 33.3%, 66.7%, 100%.
- The data point, value label, and x-axis label for each milestone share the same visual x-position.
- Do not use the continuous-time formula below for this chart.

#### Continuous-time spacing

Used for continuous-time charts where the axis represents proportional elapsed time.

```text
x = (year - minYear) / (maxYear - minYear)
```

Rules:

- Only appropriate for continuous-time charts, not milestone charts.
- Do not mix continuous-time and milestone spacing in one chart.

#### Shared rules

- Use one shared coordinate calculation for the data point x-position, the value label x-position, and the x-axis label x-position.
- Small label offsets are allowed only to prevent edge clipping; they must not break alignment with the data point.
- Axis label text remains small and muted: small chart-axis typography (`typography.chart.label`), never metric typography.

---

## Grid Lines

Grid lines can support readability.

Rules:

- Use subtle color.
- Do not overuse grid lines.
- Grid lines should not dominate the chart.
- Use semantic border/subtle tokens.
- Keep charts calm and uncluttered.

---

## Data Points

Use data points on line charts when exact timeline checkpoints matter.

Rules:

- Points should be visible but not oversized.
- Points should support tooltip or labels where useful.
- Do not add points that imply data precision if the model is broad.
- Use data points consistently.

---

## Center Labels

Donut charts may include a center label.

Examples:

```text
$35,000
```

Rules:

- Center label should represent the whole chart.
- Use only one primary center value.
- Do not show center value if total is unknown or misleading.
- Use `typography.metric.primary` or relevant metric token.
- If value is estimated, label estimated state nearby.

---

## Colors

Charts must use approved chart color tokens.

Use semantic chart tokens from:

```text
color.chart.series.1
color.chart.series.2
color.chart.series.3
color.chart.series.4
color.chart.series.5
color.chart.series.6
color.chart.series.7
color.chart.series.8
color.chart.series.9
color.chart.series.10
color.chart.series.11
color.chart.series.12
```

Rules:

- Use consistent colors for recurring categories.
- Do not randomly assign colors on every render.
- Keep Crypto and Stables colors consistent across charts.
- Keep token colors consistent within a view.
- Do not use warning/danger colors unless communicating warning/error state.
- Do not rely on color alone.
- Ensure sufficient contrast.
- Avoid too many similar colors.

Recommended recurring mapping:

```text
Crypto: color.chart.series.1
Stables: color.chart.series.3
Growth: color.chart.series.1
Other: neutral subdued chart color
```

Token-level mapping should come from chart data or a product-approved mapping.

---

## Number Formatting

Charts must format values consistently.

### Currency

Examples:

```text
$35,000
$2,000
$6,600
```

Rules:

- Use compact formatting on axes.
- Use precise values in labels/tooltips when needed.
- Do not show fake `$0` for unavailable values.
- Show unavailable state when values are missing.

### Percentages

Examples:

```text
87%
13%
34%
4.8%
```

Rules:

- Use whole percentages unless precision matters.
- Small allocations may use one decimal.
- Avoid fake precision.
- If values are rounded, ensure total display does not confuse users.

### Time

Examples:

```text
Now
2Y
4Y
6Y
8Y
10Y
```

Rules:

- Keep timeline labels short.
- Use consistent time intervals.
- Do not invent projection years.

---

## Estimated and Projected Data

Charts must clearly label estimated, modeled, or projected values.

Allowed labels:

```text
Estimated
Projected
Modeled
May change
```

Rules:

- Use visible label or description when data is not actual/current.
- Do not hide estimate status only in tooltip.
- Do not imply guaranteed future results.
- Do not show modeled growth as actual portfolio history.

Good:

```text
Projected Growth
Modeled using your strategy settings over your selected timeline.
```

Avoid:

```text
Your future portfolio value.
```

---

## Empty State

Use an empty state when chart data is not available.

Examples:

```text
No allocation data available.
Connect a wallet to view allocation.
No projected growth data available.
```

Rules:

- Do not render an empty chart shell without explanation.
- Use `components/empty-state.md` once available.
- Empty state should explain why data is missing when known.
- Do not show fake chart data.

---

## Loading State

Use loading state while chart data is loading.

Rules:

- Use skeleton or lightweight loading visual.
- Do not show fake values.
- Keep layout stable where possible.
- Avoid flashing between empty and loaded states.

Use `components/skeleton.md` once available.

---

## Error State

Use error state when chart data fails to load.

Examples:

```text
Could not load allocation data.
Could not load projected growth.
Could not load chart data.
```

Rules:

- Provide recovery action when useful.
- Do not silently fail.
- Do not show stale chart as current unless clearly labeled.

---

## Stale State

Use stale state when chart data may be outdated.

Example:

```text
Updated 2 hours ago
```

Rules:

- Stale state must come from data.
- Do not silently show stale values as current.
- Use helper text or metadata where relevant.

---

## Responsive Behavior

Charts should be mobile-first.

### Mobile

- Use simplified labels.
- Avoid overcrowded legends.
- Stack legend below the chart.
- Use horizontal scrolling only when necessary and intentional.
- Keep chart readable at small widths.
- Avoid tiny tap targets for tooltip points.
- Consider table/list fallback for complex charts.
- Keep exact values available in text when needed.

### Tablet

- Use balanced layout.
- Legends may sit beside or below chart depending on space.
- Keep labels readable.

### Desktop

- Use full chart layouts.
- Legends may sit beside donut charts.
- Axis charts may use larger plot area.
- Keep chart cards aligned with page grid.

### Wide

- Do not stretch charts excessively.
- Keep chart width readable.
- Use max-width constraints.
- Consider multi-column chart layouts only when charts remain readable.

---

## Accessibility

Charts must support accessibility by default.

Requirements:

- Provide accessible chart title.
- Provide text summary of key data.
- Provide data table fallback where needed.
- Do not rely on color alone.
- Legends must have readable labels.
- Tooltips must be keyboard/touch accessible where interactive.
- Contrast must meet WCAG AA.
- Screen readers should understand what the chart shows.
- Animated charts must respect reduced motion.
- Important values must be available as text, not only visual marks.

Recommended accessible summary:

```text
Projected Growth chart. Values increase from now through 10 years based on modeled strategy settings.
```

For allocation chart:

```text
Portfolio allocation chart. Crypto is 87 percent and Stables are 13 percent.
```

Provide hidden or visible data table when chart contains important values.

---

## Keyboard Behavior

Interactive charts must support keyboard access.

Examples:

```text
Tab: focus chart or chart controls
Arrow keys: move between data points where supported
Enter: open tooltip or select focused point where supported
Escape: close tooltip
```

Rules:

- Non-interactive charts still need accessible text summary.
- Do not require hover to access exact values.
- Tooltip data should be available on focus or in an accessible table.
- Focus should be visible when chart elements are interactive.

---

## Motion

Chart motion should be subtle and optional.

Allowed motion:

- Fade in chart after loading
- Subtle line draw animation
- Subtle value update animation
- Tooltip fade

Rules:

- Respect reduced motion.
- Avoid dramatic chart animations.
- Avoid gamified progress or growth animation.
- Do not animate projections in a way that implies certainty.

Use:

```text
motion.data.chartUpdate
motion.data.valueChange
motion.reducedMotion.default
```

---

## Content Rules

Chart labels and descriptions should follow WealthSmith voice:

- Clear
- Calm
- Specific
- Beginner-friendly
- Non-hype
- Explainable

Good chart titles:

```text
Safety Buffer
Projected Growth
Current vs Recommended Allocation
Portfolio Allocation
Crypto Assets Allocation
```

Good descriptions:

```text
Stablecoin reserve covering 1–6 months of expenses before any investment actions.
```

```text
Modeled using your strategy settings over your selected timeline.
```

```text
Compare your current asset mix with what WealthSmith recommends for your profile.
```

Use “modeled” or “projected” when data is not historical.

Avoid:

```text
Guaranteed Growth
Profit Forecast
Risk-Free Allocation
Best Returns
```

---

## Financial and Wallet Language Rules

Chart copy must be precise.

Allowed:

```text
Projected
Modeled
Estimated
May change
Current
Recommended
Allocation
Coverage
Portfolio value
```

Avoid:

```text
Guaranteed
Risk-free
Profit locked
Best return
Auto-invest
Certain outcome
```

Do not imply WealthSmith can move funds, sign transactions, or execute financial actions unless the product actually supports that action and the flow clearly explains it.

Do not imply projections are guaranteed future returns.

---

## Smith AI Rules

Charts may be explained by Smith AI.

Allowed actions near charts:

```text
Ask Smith AI
Explain this chart
Explain allocation
Explain projected growth
```

Rules:

- Chart does not generate Smith AI reasoning.
- Parent state should pass structured chart context.
- During onboarding, Smith AI remains open.
- Smith AI explanation must not replace visible chart labels and disclaimers.
- Do not hide important chart interpretation only inside Smith AI.

---

## Demo Mode Rules

Charts may show demo data in Demo Mode.

Rules:

- Demo mode must be visibly indicated elsewhere, usually with `components/announcement.md`.
- Chart should not imply demo values belong to the user.
- Demo chart data should be clearly separated from real connected-wallet data.
- Do not mix demo and real data in the same chart unless explicitly labeled.

---

## Validation and State Rules

Chart state belongs outside the component.

The chart may display:

- Data series
- Labels
- Values
- Percentages
- Legends
- Tooltips
- Loading state
- Empty state
- Error state
- Stale state
- Estimated/projected label

The chart must not decide:

- What values mean financially
- Whether allocation is good or bad
- Whether a user is overexposed
- Whether recommended allocation is correct
- Whether a rebalance should happen
- Whether projected growth is achievable
- Whether a financial action should proceed

---

## Do

- Use charts to visualize structured financial data.
- Use semantic tokens and approved chart colors.
- Keep labels clear and readable.
- Provide legends for multiple series.
- Label projected and estimated data.
- Use accessible chart summaries.
- Provide exact values in labels, tooltips, or data fallback.
- Use `progress-bar.md` for safety buffer progress bars.
- Keep calculations outside the chart component.
- Avoid misleading projections.

---

## Do Not

- Do not calculate financial values inside the chart.
- Do not invent projected values, allocations, percentages, or labels.
- Do not show fake data while loading.
- Do not rely on color alone.
- Do not make projections look guaranteed.
- Do not use charts as decoration.
- Do not use too many segments or series.
- Do not hide essential values only in tooltips.
- Do not use hype-based financial copy.
- Do not imply guaranteed returns.
- Do not imply custody, execution, or investment action unless the product actually supports it.
- Do not hardcode raw visual values.

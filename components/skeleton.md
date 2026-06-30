# Skeleton

Skeletons are placeholder shapes that represent content while it is loading.

In WealthSmith, skeletons may appear while portfolio cards, metric cards, charts, asset tables, wallet rows, suggestion cards, protocol data, and Smith AI context are loading.

Skeletons should preserve layout, reduce perceived waiting time, and avoid showing fake financial values.

---

## Purpose

Use skeletons when content is loading and the final layout is already known.

A skeleton should help users understand:

- Content is loading
- The page layout is stable
- Data has not failed yet
- The user should wait for real values
- The app is preparing portfolio, wallet, chart, suggestion, or protocol content

Skeletons should make loading feel structured, not uncertain.

---

## Skeleton vs Loading Indicator

Skeletons and loading indicators are different.

### Skeleton

Use when the final content layout is known.

Examples:

```text
Portfolio card loading
Metric card loading
Chart loading
Asset table rows loading
Suggestion card loading
Wallet row loading
```

### Loading Indicator

Use when an action or process is running.

Examples:

```text
Connecting wallet…
Saving settings…
Refreshing portfolio…
Smith AI is thinking…
```

Use `components/loading-indicator.md` for action-level, process-level, and inline loading.

Use this component for content placeholders.

---

## Important Rule

Skeletons represent loading content structure.

Skeletons do not contain WealthSmith business logic.

A skeleton can display:

- Placeholder blocks
- Placeholder lines
- Placeholder circles
- Placeholder chart area
- Placeholder rows
- Placeholder cards
- Placeholder avatar/icon shapes
- Loading state
- Reduced motion state

A skeleton must not decide:

- Whether data exists
- Whether loading has completed
- Whether a wallet is valid
- Whether portfolio data is correct
- Whether a suggestion should appear
- Whether a chart should have data
- Whether a user should invest
- Whether a protocol is recommended
- Whether Smith AI should answer

Those states must come from backend state, parent component state, wallet state, product logic, or Smith AI orchestration.

The skeleton should render the loading layout provided to it.

---

## When to Use

Use skeletons when the user is waiting for content and the content structure is predictable.

Examples:

- Loading dashboard cards
- Loading metric cards
- Loading portfolio summary
- Loading asset rows
- Loading wallet list
- Loading suggestion cards
- Loading chart data
- Loading table rows
- Loading protocol positions
- Loading staked assets
- Loading yield positions
- Loading Smith AI context panel
- Loading onboarding summary
- Loading settings sections

Skeletons can appear in:

- Dashboard
- Portfolio overview
- Suggestion pages
- Wallet pages
- Asset detail pages
- Charts
- Tables
- Cards
- Sidebars
- Modals
- Smith AI panel
- Onboarding flows

---

## When Not to Use

Do not use skeletons for:

- Action-level loading
- Button loading
- Wallet approval waiting
- Smith AI thinking/generating text
- Short actions that complete instantly
- Empty states
- Error states
- Unknown layouts
- Full-screen blocking actions
- Measurable progress toward a target
- Content that already loaded as empty

Use:

- `components/loading-indicator.md` for active processes
- `components/progress-bar.md` for measurable progress
- `components/empty-state.md` for loaded empty content
- `components/alert.md` for persistent errors or warnings
- `components/toast.md` for temporary feedback

Do not show skeletons after a request fails.

---

## Data Source

Skeletons should render from loading state and layout type.

Expected data may include:

```text
id
variant
layout
rows
columns
shape
size
isLoading
animated
ariaLabel
```

The exact schema can evolve.

The component should not invent final content, labels, metrics, chart values, table rows, or suggestion data.

---

## Anatomy

A skeleton can include:

1. Container
2. Placeholder block
3. Placeholder line
4. Placeholder circle
5. Placeholder pill
6. Placeholder chart area
7. Placeholder row
8. Placeholder card
9. Optional shimmer or pulse animation
10. Optional screen-reader loading label

Required:

- Placeholder shape or layout
- Accessible loading context where needed

Optional:

- Animation
- Container
- Multiple rows
- Repeated card shapes
- Chart placeholder
- Table placeholder
- Reduced motion fallback

Skeletons should visually approximate layout without becoming fake content.

---

## Variants

### Text Skeleton

Use for titles, descriptions, helper text, or paragraph placeholders.

Examples:

```text
Title line
Description line
Short metadata line
```

Rules:

- Use line widths that resemble final text.
- Avoid making every line the same width.
- Do not show fake words.
- Keep line count close to expected content.

---

### Metric Skeleton

Use for metric cards and numeric values.

Examples:

```text
Portfolio value loading
Allocation percentage loading
APY loading
Buffer coverage loading
```

Rules:

- Use placeholder shapes instead of fake numbers.
- Do not show `$0`, `0%`, or fake APY.
- Preserve metric card layout.
- Keep label/value hierarchy visible.

Recommended structure:

```text
Small label line
Large value block
Optional helper line
```

---

### Card Skeleton

Use for card-based content.

Examples:

```text
Portfolio card loading
Suggestion card loading
Metric card loading
Protocol card loading
```

Rules:

- Use card shape from `components/card.md`.
- Preserve approximate card height.
- Keep layout stable.
- Do not show fake title, metrics, badges, or actions.

---

### Suggestion Card Skeleton

Use while suggestion card data is loading.

Rules:

- Do not show fake suggestion titles.
- Do not show fake Top Pick badge.
- Do not show fake priority or category.
- Do not show fake action labels.
- Preserve expected suggestion card layout.

Recommended structure:

```text
Badge placeholder
Title line
Summary lines
Metric placeholders
Action placeholder
```

---

### Portfolio Card Skeleton

Use while portfolio summary, wallet, or asset card data is loading.

Rules:

- Do not show fake wallet balances.
- Do not show fake token values.
- Do not show fake allocation percentages.
- Do not show fake wallet addresses.
- Preserve final portfolio card structure.

Recommended structure:

```text
Header line
Primary metric block
Secondary metric lines
Optional chart/list placeholder
```

---

### Table Skeleton

Use while table rows are loading.

Examples:

```text
Asset table rows loading
Wallet table rows loading
Protocol position table loading
Yield position table loading
```

Rules:

- Show table header if headers are known.
- Use skeleton rows for body content.
- Do not show fake rows, balances, prices, APY, statuses, or actions.
- Keep row count reasonable.
- Preserve column alignment.

Recommended structure:

```text
Header row
3–6 skeleton rows
```

Do not show too many skeleton rows.

---

### List Item Skeleton

Use while list rows are loading.

Examples:

```text
Wallet rows
Asset rows
Suggestion rows
Protocol rows
```

Rules:

- Use circle placeholder for icon/token/wallet image when expected.
- Use line placeholders for title and subtitle.
- Use small block placeholder for trailing value or action.
- Do not show fake token symbols or wallet names.

---

### Chart Skeleton

Use while chart data is loading.

Examples:

```text
Projected Growth chart loading
Allocation donut loading
Current vs Recommended Allocation loading
```

Rules:

- Preserve chart card layout.
- Use chart-shaped placeholder when possible.
- Do not show fake chart data.
- Do not show fake axes, labels, percentages, or projection values.
- Move to chart empty state if data loads successfully but is missing.
- Move to error state if data fails to load.

Recommended placeholders:

```text
Line/area chart: chart area block with subtle line placeholder
Donut chart: circular placeholder with legend line placeholders
Bar chart: horizontal or vertical bar placeholders without values
```

---

### Avatar / Icon Skeleton

Use when an icon, token icon, wallet icon, or protocol icon is loading.

Rules:

- Use circle placeholder for token or avatar-style icons.
- Use square/rounded placeholder for protocol or app icons where appropriate.
- Do not show broken image icons.
- Do not show fake token icons.
- Use fallback icon after loading if icon is unavailable.

---

### Smith AI Context Skeleton

Use while Smith AI panel context is loading.

Examples:

```text
Loading context…
Loading related suggestion…
Loading portfolio context…
```

Rules:

- Skeleton may represent context cards or message references.
- Use `components/loading-indicator.md` for Smith AI thinking/generating answers.
- During onboarding, Smith AI remains open.
- Do not show fake Smith AI messages.
- Do not show fake recommendations.

---

### Page Skeleton

Use when a page layout is loading and structure is known.

Examples:

```text
Dashboard loading
Portfolio page loading
Wallet page loading
Suggestion page loading
```

Rules:

- Prefer page skeleton over full-page spinner when layout is known.
- Preserve header, card grid, table, and chart areas.
- Do not block the whole app unnecessarily.
- Use full-page loading indicator only when layout is unknown or app shell cannot render.

---

## Animation

Skeletons may use subtle shimmer or pulse animation.

Rules:

- Animation must be calm and subtle.
- Respect reduced motion.
- Do not animate aggressively.
- Do not use bright flashing.
- Use static placeholders when reduced motion is enabled.
- Avoid long-running animation that distracts from loaded content.

Allowed animation:

```text
Subtle shimmer
Soft pulse
Fade in/out on load
```

Avoid:

```text
Fast flashing
Large sweeping animation
Bouncy motion
Gamified loading
```

---

## Reduced Motion

Skeletons must respect reduced motion settings.

Reduced motion behavior:

```text
Show static placeholder blocks.
```

Rules:

- Disable shimmer or pulse.
- Keep visual loading state clear.
- Do not remove skeleton entirely unless another loading text is available.

---

## Token Usage

Skeletons must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, motion, or z-index.

### Correct

```text
background: color.subdued.neutral.background.default
highlight: color.surface.card
container background: color.surface.card
border: color.border.subtle
radius: radius.surface.sm
card radius: radius.surface.lg
gap: spacing.stack.gap.md
padding: spacing.card.padding.md
motion: motion.loading.skeleton
reduced motion: motion.reducedMotion.default
```

If `motion.loading.skeleton` is not yet defined, use the approved motion token closest to skeleton behavior and define component-level motion later.

### Incorrect

```text
background: #EEEEEE
highlight: #FFFFFF
border-radius: 8px
padding: 24px
animation: shimmer 1.2s infinite
```

---

## Color Usage

Skeleton colors should be neutral and low-emphasis.

Rules:

- Use subdued surface colors.
- Keep contrast low enough to feel placeholder-like.
- Keep contrast high enough that the loading structure is visible.
- Do not use semantic success/warning/danger colors.
- Do not use brand color heavily.
- Do not make skeletons look like real data.

---

## Responsive Behavior

Skeletons should be mobile-first.

### Mobile

- Match mobile layout.
- Stack card and row placeholders vertically.
- Avoid overly large placeholder blocks.
- Preserve vertical rhythm.
- Keep skeletons close to affected content.
- Avoid full-screen skeleton walls when a smaller section is loading.

### Tablet

- Match tablet columns and card widths.
- Use responsive row/card counts.

### Desktop

- Match desktop grid and table layout.
- Use enough skeleton rows/cards to preserve layout.
- Avoid excessive skeleton placeholders.

### Wide

- Do not stretch skeleton content unnecessarily.
- Match max-width behavior of final content.
- Keep placeholder layout aligned to grid.

---

## Accessibility

Skeletons must support accessibility by default.

Requirements:

- Skeletons must not be announced as real content.
- Use accessible loading text where helpful.
- Parent region may use `aria-busy="true"`.
- Do not expose meaningless placeholder shapes to screen readers.
- Do not rely on animation alone.
- Respect reduced motion.
- Do not steal focus.
- Do not trap keyboard users.
- Keep current focus stable when content loads.

Recommended behavior:

```text
aria-hidden="true" on decorative skeleton shapes
aria-busy="true" on loading region
role="status" for optional loading text
```

Example:

```text
<section aria-busy="true" aria-label="Loading portfolio data">
  skeleton shapes hidden from assistive tech
</section>
```

---

## Focus Behavior

Skeletons should not receive focus.

Rules:

- Placeholder shapes are not interactive.
- Do not show fake buttons as focusable.
- If real controls are not ready, disable or hide them according to parent state.
- When content loads, focus should remain logical.
- Do not move focus automatically unless the loading was triggered by a specific user action and parent logic requires focus recovery.

---

## Loading Duration

Skeletons are best for short to moderate content loading.

Rules:

- If loading takes longer than expected, parent state may add explanatory text.
- If loading times out, transition to error state.
- If data loads successfully empty, transition to empty state.
- Do not leave skeletons visible indefinitely.
- Do not use skeletons to hide persistent failures.

---

## Content Rules

Skeletons usually do not contain visible copy except optional loading labels.

Allowed loading labels:

```text
Loading portfolio…
Loading assets…
Loading suggestions…
Loading chart data…
Loading wallet data…
```

Rules:

- Use loading text only when helpful.
- Keep text specific.
- Do not show fake data.
- Do not use hype-based loading copy.

Avoid:

```text
Finding profit…
Unlocking gains…
Optimizing wealth…
```

---

## Financial and Wallet Language Rules

Skeletons must not imply financial outcomes.

Allowed:

```text
Loading portfolio…
Loading public wallet data…
Loading suggestions…
Loading chart data…
Fetching protocol data…
```

Avoid:

```text
Finding best return…
Preparing profit…
Securing your funds…
Guaranteeing growth…
```

Do not imply WealthSmith can move funds, sign transactions, or execute financial actions unless the product actually supports that action and the flow clearly explains it.

---

## Smith AI Rules

Use skeletons for Smith AI context loading only.

Allowed:

```text
Loading context…
Loading related portfolio data…
Loading suggestion context…
```

Use `components/loading-indicator.md` for Smith AI answer generation:

```text
Smith AI is thinking…
Generating explanation…
```

Rules:

- Skeleton does not generate Smith AI content.
- Do not show fake assistant messages.
- During onboarding, Smith AI remains open.
- Do not hide required onboarding instructions behind skeletons.

---

## Demo Mode Rules

Skeletons may appear while demo data loads.

Rules:

- Demo Mode must be indicated elsewhere with `components/announcement.md`.
- Skeleton should not imply demo data is real user data.
- If demo data fails to load, show error state.
- If demo data loads empty, show empty state with demo-specific copy.

---

## Validation and State Rules

Skeleton state belongs outside the component.

The skeleton may display:

- Loading layout
- Placeholder shapes
- Row count
- Card count
- Chart placeholder
- Table placeholder
- Reduced motion state

The skeleton must not decide:

- Whether data is loading
- Whether data loaded empty
- Whether data failed
- Whether a recommendation should appear
- Whether a wallet is valid
- Whether a chart should show values
- Whether a financial action should proceed

---

## Do

- Use skeletons when final content layout is known.
- Use semantic tokens.
- Preserve layout while data loads.
- Use skeletons for cards, rows, tables, charts, and metric blocks.
- Hide decorative skeleton shapes from screen readers.
- Use `aria-busy` on loading regions where appropriate.
- Respect reduced motion.
- Transition to real content, empty state, or error state.
- Keep product logic outside the component.

---

## Do Not

- Do not use skeletons for button or action loading.
- Do not use skeletons for unknown layouts.
- Do not show fake financial values.
- Do not show fake Top Pick badges, APY, balances, or projections.
- Do not leave skeletons visible indefinitely.
- Do not use aggressive animation.
- Do not expose placeholder shapes as real content to screen readers.
- Do not imply guaranteed returns.
- Do not use hype-based loading copy.
- Do not imply custody, execution, or investment action unless the product actually supports it.
- Do not hardcode raw visual values.

# Table

Tables display structured, comparable data in WealthSmith.

They are useful for asset lists, wallet holdings, protocol positions, yield positions, allocation breakdowns, and other row-based financial information.

Tables should be readable, scannable, responsive, and careful with financial data.

---

## Purpose

Use tables to help users compare multiple items across consistent columns.

A table should help users understand:

- What each row represents
- Which values can be compared
- Which values are current, estimated, unavailable, or stale
- Whether a row has status, risk, or action context
- What actions are available for a row

Tables should make portfolio and protocol data easier to scan, not harder.

---

## Important Rule

Tables display structured data.

Tables do not calculate portfolio values, APY, rankings, risk, recommendations, or protocol selection.

A table can display:

- Asset symbol
- Token icon
- Token balance
- Fiat value
- Allocation
- Wallet name
- Protocol name
- Estimated APY
- Estimated earnings
- Status
- Last updated time
- Actions

A table must not decide:

- Portfolio value
- Token price
- Allocation percentage
- Risk status
- APY
- Estimated earnings
- Suggestion priority
- Top Pick status
- Protocol ranking
- Which token or protocol is recommended

Those values must come from backend data, product logic, protocol integrations, or deterministic rules.

The component should render structured data provided to it.

Do not invent missing values.

---

## When to Use

Use a table when the user needs to compare multiple rows of similar data.

Examples:

- Asset holdings
- Wallet holdings
- Staked assets
- Yield positions
- Protocol positions
- RWA holdings
- Connected wallets
- Watch-only addresses
- Allocation breakdown
- Suggestion history
- Transaction-like activity lists, if supported later

Tables can appear in:

- Portfolio overview
- Asset detail pages
- Wallet detail pages
- Staked assets section
- Yield strategies section
- Protocol comparison views
- Settings
- Admin or internal tools

---

## When Not to Use

Do not use a table for:

- One single metric
- One suggestion
- Long educational content
- Chat messages
- Dense mobile-only content that cannot be made readable
- Data with no meaningful comparison across rows
- Primary onboarding steps

Use `components/metric-card.md` for single metrics.

Use `components/suggestion-card.md` for recommendations.

Use `components/portfolio-card.md` for grouped portfolio summaries.

---

## Data Source

Tables should render structured row and column data.

Expected data may include:

```text
columns
rows
rowId
label
assetSymbol
assetName
tokenIcon
walletName
walletAddress
network
protocol
balance
fiatValue
allocationPercent
apy
estimatedEarnings
status
isEstimated
isUnavailable
isLoading
updatedAt
actions
sortState
```

The exact schema can evolve.

The component should not invent missing rows, columns, icons, values, statuses, estimates, or actions.

---

## Anatomy

A table can include:

1. Table container
2. Optional title
3. Optional description
4. Header row
5. Column headers
6. Body rows
7. Cells
8. Optional token icons or asset icons
9. Optional badges
10. Optional inline actions
11. Optional row actions menu
12. Optional sorting controls
13. Optional filters or search above the table
14. Optional pagination or load more control
15. Optional empty state
16. Optional loading state
17. Optional error state

Required:

- Table container
- Column headers or accessible labels
- Rows or an empty/loading/error state

Optional:

- Title
- Description
- Token icons
- Badges
- Actions
- Sorting
- Filtering
- Pagination
- Timestamp

---

## Token Icons

Tables may contain token icons, asset icons, wallet icons, protocol icons, and network icons.

Examples:

- SOL icon
- USDC icon
- BONK icon
- JitoSOL icon
- Wallet icon
- Protocol icon
- Network icon

Rules:

- Icons are optional supporting visuals.
- Icons must not replace readable text.
- Always show a token symbol or asset name next to the icon.
- Use fallback icon behavior when an icon is missing.
- Do not use broken image icons.
- Do not infer token identity from icon alone.
- Do not use unofficial or misleading icons.
- Keep icon size consistent across rows.
- Preserve icon aspect ratio.
- Do not stretch or distort token icons.

Good row label:

```text
[icon] SOL
Solana
```

Bad row label:

```text
[icon only]
```

Fallback examples:

```text
Generic token icon
Token initials
Network-neutral placeholder
```

Token icon usage should be defined in `assets/` when asset rules are added.

---

## Variants

### Asset Table

Use for token holdings or asset lists.

Common columns:

```text
Asset
Balance
Value
Allocation
Change
Status
Actions
```

Rules:

- Asset column may include token icon, symbol, and name.
- Numeric columns should align consistently.
- Missing prices should be clearly labeled.
- Do not show fake `$0` values for missing prices.
- Do not calculate allocation in the table component.

---

### Wallet Table

Use for connected wallets, watch-only addresses, or tracked accounts.

Common columns:

```text
Wallet
Address
Network
Value
Status
Updated
Actions
```

Rules:

- Shorten long addresses for display.
- Preserve full address internally.
- Provide copy action where useful.
- Make watch-only status clear.
- Do not imply custody or signing unless wallet state supports it.

---

### Protocol Position Table

Use for protocol, staking, lending, yield, or vault positions.

Common columns:

```text
Protocol
Position
Assets
Value
Est. APY
Est. earnings
Status
Actions
```

Rules:

- Clearly label estimated APY and estimated earnings.
- Do not imply APY is guaranteed.
- Show source or freshness where relevant.
- Do not select or rank protocols inside the table.

---

### Allocation Table

Use for portfolio allocation breakdowns.

Common columns:

```text
Category
Value
Allocation
Target
Difference
Status
```

Rules:

- Use allocation values from structured data.
- Do not calculate portfolio targets inside the component.
- Show percentages clearly.
- Do not rely on color alone to show status.

---

### Compact Table

Use in dense dashboard modules or side panels.

Rules:

- Keep columns minimal.
- Prioritize the most important columns.
- Avoid horizontal overflow where possible.
- Consider stacked rows on mobile.

---

### Comparison Table

Use when users compare a small number of options.

Examples:

- Protocol details
- Wallet methods
- Asset groups

Rules:

- Keep comparison criteria consistent.
- Do not rank options unless ranking is provided by product logic.
- Do not imply recommendation unless structured data says so.

---

## Column Types

Tables may use these column types.

### Text Column

Use for names, labels, categories, and statuses.

Examples:

```text
Asset
Wallet
Protocol
Status
```

### Numeric Column

Use for values, balances, percentages, APY, and counts.

Examples:

```text
$5,500
12.45 SOL
27%
6.2%
```

Rules:

- Align numeric values consistently.
- Use metric typography where appropriate.
- Include units where needed.
- Do not mix incompatible units in the same column without labels.

### Icon + Text Column

Use for assets, wallets, protocols, and networks.

Examples:

```text
[icon] SOL
[icon] Phantom
[icon] Kamino
```

Rules:

- Include text next to the icon.
- Do not rely on icon alone.
- Provide fallback for missing icon.

### Badge Column

Use for status or classification.

Examples:

```text
Connected
Watch-only
Estimated
Missing price
Staked
Yield
```

Rules:

- Use `components/badge.md`.
- Do not calculate badge status in the table.

### Action Column

Use for row-specific actions.

Examples:

```text
View details
Copy address
Remove
Refresh
```

Rules:

- Use `components/button.md`.
- Icon-only actions need accessible labels.
- Avoid too many actions in each row.
- Use overflow menu when actions exceed available space.

---

## Sorting

Tables may support sorting when product behavior requires it.

Sortable columns may include:

- Value
- Allocation
- Balance
- APY
- Updated time
- Status
- Asset name

Rules:

- Sorting must be explicit and visible.
- Sort state should be communicated accessibly.
- Do not sort in a way that changes product meaning without user awareness.
- Do not create recommendation ranking through table sorting unless product logic provides it.
- Sorting should not imply “best” unless the column label and context are explicit.

Example sort labels:

```text
Sorted by value, descending
Sorted by asset name, ascending
```

---

## Filtering and Search

Tables may work with filters or search inputs.

Examples:

- Filter by wallet
- Filter by asset type
- Filter by protocol
- Filter by status
- Search assets

Rules:

- Use `components/input.md` for search.
- Use `components/badge.md` for active filter chips.
- Filtering logic belongs outside the table component.
- Empty filtered results should explain the state.

Good empty state:

```text
No assets match your filters.
```

---

## Pagination and Loading More

Use pagination or load more when table content is large.

Rules:

- Preserve context when loading more rows.
- Do not reset user sorting or filters unexpectedly.
- Loading more should show progress.
- Pagination controls must be accessible.

Examples:

```text
Load more
Showing 20 of 84 assets
```

---

## States

Tables must support these states where relevant.

### Default

Rows are available and displayed normally.

### Loading

Use while table data is loading.

Loading state may use:

- Skeleton rows
- Loading text
- Preserved column layout

Do not show fake balances, fake prices, or fake APYs.

### Empty

Use when there are no rows.

Examples:

```text
No assets found.
No wallets connected.
No yield positions found.
```

Empty state should explain what the user can do next when useful.

### Filtered Empty

Use when rows exist but filters hide them.

Example:

```text
No assets match your filters.
```

### Error

Use when table data fails to load.

Example:

```text
Could not load portfolio data. Try again.
```

Error state should include recovery action when possible.

### Stale

Use when table data may be outdated.

Example:

```text
Updated 2 hours ago
```

Do not silently show stale data as current when freshness matters.

### Partial Data

Use when some rows or columns are unavailable.

Examples:

```text
Price unavailable
APY unavailable
Protocol data unavailable
```

Do not hide unavailable values without explanation.

### Selected Row

Use when rows are selectable.

Selected rows should be communicated with more than color.

### Disabled Row

Use when a row is visible but not actionable.

Disabled rows should explain why if the reason matters.

---

## Number Formatting

Tables must format financial values consistently.

### Fiat Values

Examples:

```text
$5,500
$1,200.50
$12.4K
```

Rules:

- Use currency formatting.
- Do not show fake `$0` for missing data.
- Use compact values only where precision is not critical.

### Token Balances

Examples:

```text
12.45 SOL
800 USDC
1,250,000 BONK
```

Rules:

- Preserve meaningful precision.
- Avoid excessive decimals.
- Do not round tiny balances to zero unless shown as `<0.01`.

### Percentages

Examples:

```text
27%
6.2%
-4.8%
```

Rules:

- Use consistent precision.
- Include context where needed.
- Do not show unnecessary decimals.

### Estimated Values

Examples:

```text
Est. APY: 6.2%
Est. earnings: $42/year
```

Rules:

- Clearly label estimates.
- Do not imply guarantees.
- Do not hide uncertainty only in a tooltip.

---

## Token Usage

Tables must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, or motion.

### Correct

```text
background: color.surface.card
border: color.border.subtle
header text: typography.label.md
cell text: typography.body.sm
numeric text: typography.metric.compact
cell padding x: spacing.table.cell.paddingX.default
cell padding y: spacing.table.cell.paddingY.default
radius: radius.surface.md
```

### Incorrect

```text
background: #FFFFFF
border: 1px solid #C5C5C5
font-size: 14px
padding: 12px 16px
border-radius: 12px
```

---

## Responsive Behavior

Tables must be mobile-first.

### Mobile

Tables should not force unreadable desktop layouts onto small screens.

Allowed mobile behaviors:

- Convert rows into stacked cards
- Hide lower-priority columns
- Use horizontal scroll only when comparison is still usable
- Use compact row summaries
- Move row actions into an overflow menu

Rules:

- Keep asset name, token icon, and primary value visible.
- Do not hide critical status.
- Avoid tiny text.
- Avoid horizontal scroll for forms or primary flows when a stacked layout would work better.
- Keep row actions tappable.

Recommended mobile stacked asset row:

```text
[Token icon] SOL
12.45 SOL
$5,500
Allocation: 73%
Status: Available
[Actions]
```

### Tablet

- Tables may show fewer columns than desktop.
- Lower-priority columns may collapse.
- Keep row height comfortable.
- Keep icons and labels readable.

### Desktop

- Tables may show full column sets.
- Use consistent alignment.
- Keep numeric columns easy to compare.
- Keep action column stable.

### Wide

- Do not stretch tables unnecessarily.
- Keep column widths readable.
- Use max content width where appropriate.
- Avoid overly long rows.

---

## Accessibility

Tables must support accessibility by default.

Requirements:

- Use proper table semantics when displaying tabular data.
- Use column headers.
- Associate cells with headers.
- Communicate sort state accessibly.
- Ensure keyboard access for row actions.
- Provide accessible labels for icon-only actions.
- Do not rely on color alone.
- Ensure token icons have appropriate alt handling.
- Keep contrast WCAG AA compliant.
- Support screen reader navigation.
- Communicate loading, empty, error, stale, and partial states.

Token icon accessibility:

- Decorative icons may use empty alt text if the asset name is visible.
- If the icon communicates unique meaning, provide accessible text.
- Never rely on icon alone to identify a token.

Example:

```text
SOL icon + visible text "SOL"
```

Icon alt may be empty because text identifies the asset.

---

## Content Rules

Table copy should follow WealthSmith voice:

- Clear
- Calm
- Trustworthy
- Beginner-friendly
- Specific
- Non-hype

Good column labels:

```text
Asset
Balance
Value
Allocation
Wallet
Protocol
Est. APY
Est. earnings
Status
Updated
Actions
```

Avoid vague labels:

```text
Data
Stuff
Info
Performance
Thing
```

Good empty states:

```text
No assets found.
No wallets connected.
No yield positions found.
No assets match your filters.
```

Good unavailable states:

```text
Price unavailable
APY unavailable
Protocol data unavailable
```

Avoid hype:

```text
Best yield
Huge gains
Guaranteed return
Risk-free
```

---

## Row Actions

Rows may include actions.

Examples:

```text
View details
Copy address
Refresh
Remove wallet
Learn more
```

Rules:

- Use `components/button.md`.
- Use icon-only buttons only for familiar utility actions.
- Icon-only actions need accessible labels.
- Destructive actions should be clear and may require confirmation.
- Do not show execution actions unless the product supports execution.

Accessible label examples:

```text
aria-label="Copy SOL address"
aria-label="View SOL details"
aria-label="Remove wallet"
```

---

## Status Display

Tables may show status through badges, labels, icons, and text.

Examples:

```text
Connected
Watch-only
Estimated
Missing price
Unsupported
Syncing
Completed
Action needed
```

Rules:

- Use `components/badge.md`.
- Do not rely on color alone.
- Do not calculate status inside the table.
- Use text for important statuses.
- Keep status labels short.

---

## Do

- Use tables for comparable structured data.
- Use semantic tokens.
- Use token icons with visible token names.
- Provide icon fallbacks.
- Align numeric columns consistently.
- Label estimated values clearly.
- Show unavailable states instead of fake values.
- Use accessible table semantics.
- Support mobile stacked row behavior.
- Keep calculations outside the table.
- Keep copy calm and specific.

---

## Do Not

- Do not calculate portfolio value, allocation, APY, earnings, ranking, or risk inside the table.
- Do not invent missing rows, icons, values, or statuses.
- Do not rely on token icons alone.
- Do not show broken icons.
- Do not show `$0` for missing prices.
- Do not imply guaranteed returns.
- Do not use hype-based financial labels.
- Do not make desktop tables unreadable on mobile.
- Do not hardcode raw visual values.
- Do not imply custody, execution, or investment action unless the product actually supports it.

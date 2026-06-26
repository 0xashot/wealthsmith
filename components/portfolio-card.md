# Portfolio Card

Portfolio cards display grouped portfolio information in WealthSmith.

They help users understand wallet holdings, asset groups, allocation, exposure, balances, staked positions, yield positions, and portfolio health context.

This component extends the base card contract in `components/card.md` and may use metric rules from `components/metric-card.md`.

---

## Purpose

Use portfolio cards to present portfolio-related information in a clear, scannable, and trustworthy way.

A portfolio card should help users understand:

- What portfolio item or group is being shown
- Current value or balance
- Asset composition or allocation
- Status, risk, or missing data where relevant
- Whether the data is complete, estimated, stale, or unavailable
- What action, if any, the user can take next

Portfolio cards should make crypto portfolio data feel organized, readable, and less overwhelming.

---

## Important Rule

Portfolio cards display portfolio data.

Portfolio cards do not calculate product logic.

The card must not determine:

- Total portfolio value
- Token prices
- Allocation percentages
- Safety buffer coverage
- Risk score
- Concentration risk
- Staked asset detection
- Yield strategy detection
- Estimated APY
- Estimated earnings
- Suggestion priority
- Top Pick status
- Protocol selection

Those values must come from backend data, indexing services, wallet data providers, protocol integrations, or deterministic product logic.

The component should render structured data provided to it.

Do not invent missing balances, prices, allocations, APYs, or risk labels.

---

## When to Use

Use a portfolio card when showing a grouped portfolio object or portfolio-related summary.

Examples:

- Total portfolio summary
- Wallet summary
- Asset group
- Token holding
- Staked asset group
- Yield position
- Stable asset group
- Volatile asset group
- RWA asset group
- Portfolio allocation section
- Protocol position summary
- Safety buffer portfolio context

Portfolio cards can appear in:

- Dashboard
- Portfolio overview
- Wallet detail page
- Asset detail page
- Staked assets section
- Yield strategies section
- Suggestion context
- Smith AI context panel
- Demo mode portfolio

---

## When Not to Use

Do not use a portfolio card for:

- Generic suggestions
- Long educational content
- Full transaction history
- Full protocol comparison tables
- Chat messages
- Settings forms
- Standalone buttons
- Marketing claims

Use `components/suggestion-card.md` for recommendations.

Use `components/metric-card.md` for a single standalone number.

Use table or list components for many comparable rows.

---

## Data Source

Portfolio cards should be rendered from structured portfolio data.

Expected data may include:

```text
id
type
title
subtitle
walletAddress
walletName
assetSymbol
assetName
assetLogo
network
protocol
balance
formattedBalance
fiatValue
formattedFiatValue
allocationPercent
changeValue
changePercent
changeTimeframe
status
riskLabel
isEstimated
isStaked
isYieldPosition
isLoading
isUnavailable
updatedAt
source
actions
```

The exact schema can evolve.

The component should not invent missing fields.

When required data is unavailable, use an approved unavailable state instead of guessing.

---

## Anatomy

A portfolio card can include:

1. Container
2. Header
3. Asset or wallet icon
4. Title
5. Subtitle
6. Network or protocol label
7. Primary value
8. Token balance
9. Allocation percentage
10. Change indicator
11. Status badge
12. Risk or attention note
13. Optional chart or allocation visual
14. Optional position metadata
15. Optional actions
16. Optional timestamp or source

Required:

- Container
- Title or asset/wallet identifier
- Primary value, balance, or unavailable state

Optional:

- Icon
- Subtitle
- Network label
- Protocol label
- Balance
- Allocation
- Change indicator
- Status
- Risk note
- Chart
- Metadata
- Actions
- Timestamp

Keep the card focused on one portfolio object or portfolio group.

---

## Layout

Recommended structure:

```text
[Icon] Title / Subtitle        Primary value

Supporting balance / allocation / status

Optional detail row or note

Optional action
```

For compact cards:

```text
[Icon] Title
Value
Supporting label
```

For richer cards:

```text
Header with title and status

Primary value

Balance, allocation, change, or protocol details

Risk or missing data note

Action area
```

Do not combine unrelated wallet, asset, and suggestion content into one card.

---

## Variants

### Portfolio Summary Card

Use for high-level portfolio overview.

Examples:

- Total portfolio value
- Portfolio allocation summary
- Demo portfolio summary

Token guidance:

- Background: `color.surface.card`
- Border: `color.border.subtle`
- Radius: `radius.surface.lg`
- Shadow: `shadow.card.default`
- Padding: `spacing.card.padding.lg`
- Primary value typography: `typography.metric.primary`
- Supporting text: `typography.body.sm`

---

### Wallet Card

Use for a connected wallet or tracked address.

Examples:

- Phantom wallet
- Ledger wallet
- Watch-only address
- Demo wallet

May include:

- Wallet name
- Shortened address
- Network
- Total value
- Asset count
- Connection or sync status
- Actions

Actions may include:

```text
View wallet
Copy address
Rename
Remove wallet
```

The component must not decide wallet connection logic.

---

### Asset Card

Use for a single token or asset holding.

Examples:

- SOL
- USDC
- BONK
- JitoSOL
- RWA token

May include:

- Token icon
- Token symbol
- Token name
- Balance
- Fiat value
- Allocation percentage
- Change indicator
- Network
- Status

The component must not calculate price, value, or allocation.

---

### Asset Group Card

Use for grouped assets.

Examples:

- Stable assets
- Volatile assets
- Staked assets
- RWA assets
- Idle assets
- Yield positions

May include:

- Group title
- Total value
- Asset count
- Allocation percentage
- Short explanation
- Status or warning

The grouping logic must come from product logic.

---

### Staked Asset Card

Use when displaying staked or delegated assets.

Examples:

- Staked SOL
- Liquid staking token
- Protocol staking position

May include:

- Asset
- Protocol
- Staked balance
- Fiat value
- Estimated APY
- Estimated earnings
- Lockup or unstake status if available

Rules:

- Clearly label estimated values.
- Do not imply yield is guaranteed.
- Do not invent APY or earnings.
- Show source or updated time where relevant.

---

### Yield Position Card

Use when displaying yield strategy positions.

Examples:

- Lending position
- Liquidity position
- Vault position
- Strategy position

May include:

- Protocol
- Asset pair or token
- Supplied value
- Estimated APY
- Estimated earnings
- Risk or requirement note
- Source

Rules:

- Use estimated labels where needed.
- Avoid guarantee language.
- Do not decide which protocol is recommended.
- Do not calculate yield in the component.

---

### Watch-Only Portfolio Card

Use for addresses added without wallet signing or connection.

Examples:

- Public address
- Watch-only wallet
- External wallet

May include:

- Address label
- Shortened address
- Network
- Total tracked value
- Read-only status

Rules:

- Make read-only status clear.
- Do not show actions that require wallet signing unless the wallet is actually connected.
- Do not imply WealthSmith controls the wallet.

---

## Sizes

### Compact

Use for dense portfolio sections, side panels, and mobile summaries.

Recommended usage:

- Asset rows
- Wallet list
- Compact holdings
- Smith AI side context

Token guidance:

- Padding: `spacing.card.padding.sm`
- Gap: `spacing.card.gap.sm`
- Radius: `radius.surface.sm`
- Title typography: `typography.heading.sm`
- Value typography: `typography.metric.compact`

---

### Default

Use for standard dashboard and portfolio cards.

Recommended usage:

- Wallet cards
- Asset cards
- Asset group cards
- Protocol position cards

Token guidance:

- Padding: `spacing.card.padding.md`
- Gap: `spacing.card.gap.md`
- Radius: `radius.surface.md`
- Title typography: `typography.heading.md`
- Value typography: `typography.metric.secondary`

---

### Featured

Use for high-emphasis portfolio sections.

Recommended usage:

- Total portfolio summary
- Main allocation overview
- Safety buffer portfolio context
- Featured staked assets summary

Token guidance:

- Padding: `spacing.card.padding.lg`
- Gap: `spacing.card.gap.lg`
- Radius: `radius.surface.lg`
- Title typography: `typography.heading.lg`
- Value typography: `typography.metric.primary`

---

## States

Portfolio cards may support these states.

### Default

Portfolio data is available and displayed normally.

### Loading

Use while wallet, asset, price, protocol, or portfolio data is loading.

Loading states may use:

- Skeleton placeholders
- Loading labels
- Preserved layout size
- Disabled actions

Do not show fake balances or fake prices.

### Syncing

Use when portfolio data is updating.

Example:

```text
Syncing portfolio
```

Syncing should not erase previously loaded data unless required.

### Unavailable

Use when data cannot be shown.

Examples:

- Wallet not connected
- Price unavailable
- Protocol data unavailable
- Network unavailable
- Address unsupported
- Position cannot be decoded

Use clear helper text.

Example:

```text
Price unavailable
```

### Error

Use when portfolio data fails to load.

Example:

```text
Could not load wallet data. Try again.
```

Error states should include a recovery action when possible.

### Stale

Use when data may be outdated.

Example:

```text
Updated 2 hours ago
```

Do not present stale data as current when freshness matters.

### Empty

Use when there are no assets or positions to show.

Example:

```text
No assets found for this wallet.
```

Avoid implying the wallet is empty if the data source failed.

### Selected

Use when the user selects a wallet, asset group, or portfolio item.

Selected state should use more than color.

### Warning

Use when product logic marks the portfolio item as needing attention.

Examples:

- High concentration
- Missing price
- Unsupported position
- Safety buffer gap
- Estimated data only

The component must not create warning logic by itself.

---

## Token Usage

Portfolio cards must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, or motion.

### Correct

```text
background: color.surface.card
border: color.border.subtle
padding: spacing.card.padding.md
gap: spacing.card.gap.md
title: typography.heading.md
value: typography.metric.secondary
body: typography.body.sm
radius: radius.surface.md
shadow: shadow.card.default
```

### Incorrect

```text
background: #F9FAFB
padding: 24px
font-size: 20px
font-family: Space Grotesk
border-radius: 12px
box-shadow: 0px 2px 4px rgba(0,0,0,0.06)
```

---

## Number Formatting

Portfolio cards must format financial values consistently.

### Fiat Values

Examples:

```text
$5,500
$1,200.50
$12.4K
```

Rules:

- Use currency formatting for fiat values.
- Use compact formatting only when precision is not critical.
- Do not show fake `$0` for missing values.

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
- Pair token amount with fiat value when helpful.

### Allocation

Examples:

```text
42% of portfolio
```

Rules:

- Use allocation only when provided.
- Do not calculate allocation in the component.
- Avoid unnecessary decimals.

### APY and Earnings

Examples:

```text
Est. APY: 6.2%
Est. earnings: $42/year
```

Rules:

- Clearly label estimates.
- Do not imply returns are guaranteed.
- Show source or freshness where relevant.
- Do not invent APY.

---

## Status and Badges

Portfolio cards may show badges for:

- Connected
- Watch-only
- Syncing
- Estimated
- Staked
- Yield
- RWA
- Missing price
- Unsupported
- Action needed

Badge examples:

```text
Connected
Watch-only
Estimated
Staked
Yield
Missing price
```

Avoid hype or misleading badges:

```text
Best yield
Guaranteed
Risk-free
Huge gains
```

Badges must use text, not color alone.

---

## Actions

Portfolio cards may include actions.

Examples:

```text
View details
Copy address
Add wallet
Connect wallet
Refresh
Remove wallet
Review
Learn more
```

Action rules:

- Use `components/button.md`.
- Use icon-only buttons only for familiar utility actions.
- Destructive actions such as removing a wallet should be clear and may require confirmation.
- Do not show execution actions unless the product supports execution.
- Do not imply custody or control over funds.

Avoid:

```text
Invest now
Buy now
Earn guaranteed yield
Maximize profits
```

---

## Responsive Behavior

Portfolio cards should be mobile-first.

### Mobile

- Cards should stack vertically.
- Values should remain readable.
- Avoid dense multi-column data.
- Actions may stack or collapse into a menu.
- Long wallet addresses should be shortened.
- Avoid horizontal overflow.
- Asset details may become stacked rows.

### Tablet

- Cards may use one or two columns.
- Related cards may appear side by side.
- Keep consistent spacing and readable values.

### Desktop

- Cards may use dashboard grids.
- Portfolio summary cards may span multiple columns.
- Asset and wallet cards may appear in lists or grids.
- Supporting metrics can appear inline when readable.

### Wide

- Keep card content within readable widths.
- Avoid stretching cards unnecessarily.
- Use grid alignment for portfolio sections.

---

## Accessibility

Portfolio cards must support accessibility by default.

Requirements:

- Use clear labels for values.
- Use logical heading structure.
- Ensure numeric values are readable by screen readers.
- Provide accessible labels for icon-only actions.
- Do not rely on color alone for status.
- Ensure contrast meets WCAG AA.
- Support keyboard navigation for interactive cards.
- Use correct link semantics for navigation.
- Use button semantics for actions.
- Communicate loading, stale, error, unavailable, and empty states clearly.
- Respect reduced motion settings.

Examples:

Visual:

```text
$5.5K
```

Accessible label where useful:

```text
Portfolio value: 5,500 dollars
```

Visual:

```text
12.45 SOL
```

Accessible label where useful:

```text
Balance: 12.45 SOL
```

---

## Content Rules

Portfolio card copy should follow WealthSmith voice:

- Clear
- Calm
- Trustworthy
- Beginner-friendly
- Specific
- Non-hype
- Explainable

Good titles:

```text
Portfolio summary
Connected wallets
Stable assets
Staked assets
Yield positions
SOL holdings
Watch-only address
```

Avoid vague titles:

```text
Data
Stuff
Info
Things
Performance
```

Good helper text:

```text
Includes assets from connected wallets.
Estimated using available protocol data.
This address is watch-only.
Price data is currently unavailable.
```

Avoid hype:

```text
Guaranteed yield
Best performer
Huge upside
Risk-free return
```

---

## Demo Mode

Portfolio cards may be used in Demo Mode.

Demo Mode cards should make it clear when data is simulated.

Allowed labels:

```text
Demo portfolio
Sample data
Example wallet
```

Rules:

- Do not imply demo data is the user's real portfolio.
- Do not mix demo data with real connected wallet data unless clearly separated.
- Keep demo values consistent with approved demo fixtures.

---

## Do

- Use portfolio cards for grouped portfolio data.
- Build on top of `components/card.md`.
- Use metric guidance from `components/metric-card.md`.
- Use semantic tokens.
- Keep data display clear and scannable.
- Show estimated values as estimated.
- Show unavailable states instead of fake values.
- Use badges with text.
- Make watch-only status clear.
- Keep portfolio calculations outside the component.
- Avoid guarantee language.

---

## Do Not

- Do not calculate portfolio values inside the component.
- Do not invent balances, prices, APYs, allocations, or earnings.
- Do not show `$0` for missing data.
- Do not imply WealthSmith has custody of funds.
- Do not imply wallet signing when an address is watch-only.
- Do not use hype-based financial language.
- Do not rely on color alone for status.
- Do not hardcode raw visual values.
- Do not overload one card with unrelated data.
- Do not use this component for generic suggestions.

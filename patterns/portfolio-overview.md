# Portfolio Overview

This pattern defines the WealthSmith Portfolio page.

The Portfolio page shows the user’s connected holdings, allocation, liquid assets, staked assets, and yield strategies in one place.

It should help users understand:

- What they own
- Where assets are held
- Which assets are liquid
- Which assets are staked
- Which assets are deployed in yield strategies
- How the portfolio is allocated
- Which suggestions relate to portfolio positioning

---

## Purpose

The Portfolio page should make wallet and protocol data understandable without making the product feel like a trading terminal.

It should answer:

- What is my total portfolio value?
- What share is crypto vs stables?
- Which crypto assets make up my portfolio?
- Which assets are sitting liquid in my wallet?
- Which assets are staked?
- Which assets are deployed in yield strategies?
- What APY and estimated earnings are attached to those positions?
- Where can I manage each position?

The Portfolio page is a read-only portfolio intelligence surface for MVP.

It does not execute transactions.

---

## Core Product Rule

Portfolio UI renders structured data.

It does not invent balances, APY, earnings, positions, token identities, protocol identities, or wallet ownership.

```text
Wallet / protocol data sources = portfolio facts
Portfolio logic = grouping, categorization, valuation, and derived totals
UI = renderer
Smith AI = explanation layer
```

The Portfolio page must not become the source of financial calculations.

---

## When to Use

Use this pattern for:

- Portfolio page
- Portfolio tab during onboarding
- Portfolio review from Smith AI
- Portfolio allocation analysis
- Portfolio deployment analysis
- Read-only staked asset/yield strategy visibility

Do not use this pattern for:

- Swap execution
- Buy/sell execution
- Staking execution
- Liquidity deposit execution
- Wallet signature flows
- Generic dashboard summary cards
- Suggestion ranking logic

---

## Primary Layout

Desktop layout:

```text
Top navigation:
  WealthSmith logo
  Dashboard / Portfolio / Goal / Support
  Wallet pill
  Ask Smith AI button

Left content:
  Page title: Portfolio
  Balance Overview
  Crypto Assets Allocation
  Asset Deployment Overview
    Liquid Assets
    Staked Assets
    Yield Strategies

Right content:
  Smith AI Suggestions rail
```

Rules:

- Portfolio content appears on the left.
- Smith AI Suggestions stay visible on the right when available.
- The Portfolio nav item is active.
- The right rail uses the same suggestion behavior as the Dashboard.
- The page can scroll vertically.
- The right rail can scroll independently or with the page depending on layout implementation.
- Portfolio should remain readable even if suggestions are long.

---

## Page Sections

Recommended section order:

```text
1. Balance Overview
2. Crypto Assets Allocation
3. Asset Deployment Overview
   3.1 Liquid Assets
   3.2 Staked Assets
   3.3 Yield Strategies
```

This order moves from high-level allocation to detailed positions.

---

## Balance Overview

Balance Overview shows the high-level split between broad asset categories.

Example:

```text
Balance Overview

Total: $35,000

Stables: 13%
Crypto: 87%
```

Visual:

```text
Donut chart
Center value
Legend
Callout labels
```

Rules:

- Total portfolio value comes from portfolio valuation logic.
- Category percentages come from portfolio grouping logic.
- Do not calculate category percentages in chart component code.
- Always show visible category labels.
- Chart colors must map to chart series tokens.
- Do not rely on color alone.
- Center value should match total portfolio value.
- Stables should include approved stablecoin classifications only.
- Crypto should include volatile/non-stable crypto assets.
- If an asset category is unknown, classify as `Other` only if product logic provides that classification.

Allowed category labels:

```text
Crypto
Stables
Other
```

Do not invent categories in UI code.

---

## Crypto Assets Allocation

Crypto Assets Allocation shows the breakdown of the crypto portfolio by token or grouped asset.

Example:

```text
Crypto Assets Allocation

SOL: 34%
ETH: 20%
BTC: 18%
USDC: 12%
ARB: 7.2%
BONK: 4.8%
Other: 4%
```

Visual:

```text
Donut chart
Center total value
Legend
Callout labels
```

Rules:

- Allocation percentages come from product logic.
- Token symbols must be visible.
- Token icons may appear in legends or rows, but cannot be the only identity.
- Missing token icons use `assets/icons/fallback/fallback-token.svg`.
- If an asset is unsupported but present in wallet data, show symbol/name with fallback token icon rather than hiding it.
- If token metadata is unknown, show safe unknown/unsupported state.
- Do not infer token identity from icon alone.
- Do not show broken token icons.
- Do not group assets as `Other` unless product logic provides the grouping.

---

## Asset Deployment Overview

Asset Deployment Overview explains where assets are currently positioned.

It is divided into:

```text
Liquid Assets
Staked Assets
Yield Strategies
```

Each subsection has:

```text
Title
Total value
Short explanation
Table
```

Rules:

- Deployment classification comes from portfolio/protocol detection logic.
- UI must not infer whether an asset is liquid, staked, or deployed in yield.
- Each table should use consistent columns and table behavior.
- Empty sections should show clear empty states.
- Section totals must equal the sum of included positions if data is complete.
- If data is partial, clearly show partial state.

---

## Liquid Assets

Liquid Assets are assets sitting in connected wallets and not detected as actively deployed in staking or yield strategies.

Example:

```text
Liquid Assets
$22,800
Assets sitting in connected wallet, not earning passive income.
```

Table columns:

```text
Token
Amount
USD Value
24h Change
```

Example rows:

```text
SOL     154.2 SOL     $8,500     +2.1%
wETH    2.4 wETH      $5,000     -1.3%
USDC    3,000 USDC    $3,000      0.0%
wBTC    0.09 wBTC     $4,500     +0.6%
JUP     4,100 JUP     $1,800     +4.4%
```

Rules:

- Amount comes from wallet balance data.
- USD value comes from pricing/valuation logic.
- 24h change comes from market data or product logic.
- Do not show 24h change if unavailable.
- Token link behavior must be safe and approved.
- Token symbol/name must be visible.
- Token icon must not be the only identifier.
- Rows may paginate.
- Default rows per page can be 5 for dense tables.
- Pagination state should not affect portfolio totals.

---

## Staked Assets

Staked Assets are detected staking positions.

Example:

```text
Staked Assets
$18,500
Earning yield via trusted staking protocols.
```

Table columns:

```text
Asset
Amount
Value
APY
Est. Earnings
Action
```

Example rows:

```text
wETH   Lido       1.8 wETH     $5,220    4.2%    +$219/yr    Manage
SOL    Marinade   120 SOL      $8,160    6.1%    +$498/yr    Manage
SOL    Jito       40 SOL       $2,720    5.9%    +$161/yr    Manage
wATOM  Stride     300 wATOM    $2,400    9.4%    +$226/yr    Manage
```

Rules:

- Staked position detection comes from protocol/wallet data.
- Protocol name must be visible.
- Asset symbol must be visible.
- Protocol icon may appear if approved.
- Missing protocol icon is an implementation issue for supported MVP protocols.
- If a non-MVP/future protocol appears before its icon is approved, show text safely and do not invent an icon.
- APY must come from an approved source.
- Estimated earnings must come from product logic.
- Do not show APY if stale or unavailable.
- Use estimated language where appropriate.
- Do not imply yield is guaranteed.
- Do not label protocols as “trusted” unless approved by content rules and product policy.
- `Manage` opens the relevant protocol page in a new tab for MVP.
- `Manage` does not execute a transaction.

Preferred explanatory copy:

```text
Earning yield via staking protocols.
```

Avoid overclaiming:

```text
Guaranteed passive income
Risk-free staking
Trusted and safe yield
```

---

## Yield Strategies

Yield Strategies are positions deployed in vaults, LPs, lending, or other yield-generating strategies.

Example:

```text
Yield Strategies
$4,200
Assets deployed in yield-generating strategies and vaults.
```

Table columns:

```text
Asset
Deposited Amount
Value
APY
Est. Earnings
Action
```

Example rows:

```text
SOL/USDC     420 SOL / 6,000 USDC      $10,200    15.8%    +$1,612    Manage
BONK/SOL     3.5B BONK / 100 SOL       $7,500     23.2%    +$1,740    Manage
```

Rules:

- Strategy detection comes from protocol logic.
- Deposited amount must reflect the detected position.
- LP pairs should show both sides of the pair.
- Value comes from portfolio valuation logic.
- APY comes from approved yield source.
- Estimated earnings come from product logic.
- Do not imply APY is guaranteed.
- Do not call a strategy “safe” unless product logic and content rules support that label.
- `Manage` opens the relevant protocol page in a new tab for MVP.
- `Manage` does not execute a transaction.

---

## Manage Link Behavior

For MVP, `Manage` links open the relevant external protocol page in a new tab.

Rules:

- Open in new tab.
- Use `rel="noopener noreferrer"` behavior.
- Use approved protocol metadata for URLs.
- Do not hardcode URLs inside table components.
- Do not execute transactions.
- Do not request wallet signatures.
- Do not prefill transactions unless product explicitly supports it.
- Do not imply WealthSmith manages the position directly.
- Accessible label should mention the external destination.

Accessible label examples:

```text
Manage SOL staking on Marinade in a new tab
Manage SOL/USDC position on Raydium in a new tab
```

If protocol URL is missing:

- Disable Manage link.
- Show safe fallback text.
- Treat missing URL as implementation issue.

---

## Right Rail: Smith AI Suggestions

The Portfolio page can show the same right-side Smith AI Suggestions rail used on Dashboard.

Example:

```text
Smith AI Suggestions
Personalized based on your plan
```

Suggestion examples:

```text
Stake SOL on Marinade
Provide Liquidity on Raydium
Auto-Compound BONK on Orca
Supply USDC on Kamino
Swap BONK to USDC on Jupiter
Deposit USDC into Ondo USY
```

Rules:

- Suggestions come from Suggestion Engine.
- Top Pick comes from Top Pick Logic.
- Protocol choice comes from Protocol Decision Logic.
- Portfolio page does not generate its own suggestion logic.
- Suggestion cards open protocol pages in new tabs for MVP.
- No transactions execute from suggestion cards.
- No wallet signature is requested from suggestion card clicks.
- Suggestion rail should stay visually separate from portfolio tables.
- Portfolio data may influence suggestions, but only via product logic.

See:

```text
patterns/suggestion-flow.md
components/suggestion-card.md
```

---

## Ask Smith AI Behavior

The `Ask Smith AI` button opens the Smith AI panel.

On Portfolio page, Smith AI may explain:

```text
Why is my portfolio mostly crypto?
What are liquid assets?
What is the difference between staked assets and yield strategies?
Why is this APY different across protocols?
Why is this position shown as liquid?
Why is this strategy suggested?
```

Rules:

- Smith AI answers using structured portfolio and suggestion data.
- Smith AI must not invent balances or positions.
- Smith AI must not claim a protocol position exists unless detected.
- Smith AI must not execute actions.
- Smith AI must not ask for signatures unless a separate supported flow requires it.

---

## Data Sources

Portfolio data may come from:

```text
Connected wallet balances
Token account balances
Protocol position detection
Staking account detection
LP/vault position detection
Price data
APY/yield data
Protocol metadata
Token metadata
```

Rules:

- Product logic owns normalization and classification.
- UI renders normalized data.
- Do not directly mix raw wallet data and rendered tables without normalization.
- Do not show duplicate positions unless the data model intentionally separates them.
- Do not double-count assets across liquid, staked, and yield sections.
- If a position cannot be classified confidently, show partial/unknown state rather than forcing it into a category.

---

## Position Classification

Recommended categories:

```text
liquid
staked
yield_strategy
unknown
unsupported
```

Rules:

- A position should belong to one primary category.
- A token used inside an LP or vault should not also appear as liquid unless wallet data shows separate liquid balance.
- Staked SOL positions should appear under Staked Assets, not Liquid Assets.
- LP/vault positions should appear under Yield Strategies.
- Wallet-only balances appear under Liquid Assets.
- Unknown positions should be shown only if product scope supports unknown/unsupported display.

---

## Data Contract

Example normalized portfolio object:

```json
{
  "portfolio": {
    "total_value_usd": 35000,
    "categories": [
      {
        "id": "crypto",
        "label": "Crypto",
        "value_usd": 30450,
        "percentage": 0.87
      },
      {
        "id": "stables",
        "label": "Stables",
        "value_usd": 4550,
        "percentage": 0.13
      }
    ],
    "asset_allocation": [
      {
        "symbol": "SOL",
        "label": "SOL",
        "value_usd": 11900,
        "percentage": 0.34,
        "icon": "assets/icons/token/sol.svg"
      },
      {
        "symbol": "USDC",
        "label": "USDC",
        "value_usd": 4200,
        "percentage": 0.12,
        "icon": "assets/icons/token/usdc.svg"
      }
    ]
  }
}
```

Example liquid asset row:

```json
{
  "id": "liquid-sol",
  "category": "liquid",
  "token": {
    "symbol": "SOL",
    "name": "Solana",
    "icon": "assets/icons/token/sol.svg"
  },
  "amount_display": "154.2 SOL",
  "value_usd": 8500,
  "change_24h": 0.021
}
```

Example staked asset row:

```json
{
  "id": "staked-sol-marinade",
  "category": "staked",
  "asset": {
    "symbol": "SOL",
    "icon": "assets/icons/token/sol.svg"
  },
  "protocol": {
    "id": "marinade",
    "name": "Marinade",
    "icon": "assets/icons/protocol/marinade.svg",
    "url_ref": "protocols.marinade.url"
  },
  "amount_display": "120 SOL",
  "value_usd": 8160,
  "apy": 0.061,
  "estimated_earnings_yearly_usd": 498,
  "action": {
    "type": "open_protocol_new_tab",
    "label": "Manage"
  }
}
```

Example yield strategy row:

```json
{
  "id": "yield-sol-usdc-raydium",
  "category": "yield_strategy",
  "strategy_type": "liquidity_position",
  "asset_pair": "SOL/USDC",
  "deposited_amount_display": "420 SOL / 6,000 USDC",
  "protocol": {
    "id": "raydium",
    "name": "Raydium",
    "icon": "assets/icons/protocol/raydium.svg",
    "url_ref": "protocols.raydium.url"
  },
  "value_usd": 10200,
  "apy": 0.158,
  "estimated_earnings_yearly_usd": 1612,
  "action": {
    "type": "open_protocol_new_tab",
    "label": "Manage"
  }
}
```

---

## Table Behavior

Tables should support:

```text
Column headers
Token/protocol identity
Numeric alignment
Pagination when needed
Rows per page control
Keyboard navigation
External-link labels
Empty states
Loading states
Partial data states
```

Rules:

- Numeric values should be aligned consistently.
- Token/protocol identity should include visible text.
- Icons must not be the only label.
- Pagination should not affect totals.
- Rows per page defaults should be product-approved.
- External links should show or announce new-tab behavior.
- Loading should not appear for fast table updates.
- Use skeletons for table loading only when data fetch takes noticeable time.

---

## Chart Behavior

Charts used in Portfolio page:

```text
Balance Overview donut
Crypto Assets Allocation donut
```

Rules:

- Use visible legends.
- Use visible labels/callouts when possible.
- Center value should be accessible as text.
- Chart should have accessible summary.
- Do not rely on color alone.
- Chart colors come from chart series tokens.
- Chart data comes from normalized portfolio data.
- Do not calculate allocation inside chart component.

Accessible summary example:

```text
Portfolio total value is $35,000. Crypto is 87% and stables are 13%.
```

---

## Token Icon Rules

Token icons come from:

```text
assets/icons/token/
```

Fallback:

```text
assets/icons/fallback/fallback-token.svg
```

Rules:

- Always show token symbol or token name.
- Use fallback token icon if token icon is missing.
- Do not show broken images.
- Do not infer token identity from icon.
- Do not use token icon alone as a link label.

---

## Protocol Icon Rules

Protocol icons come from:

```text
assets/icons/protocol/
```

Rules:

- Show protocol name with protocol icon.
- Protocol icon alone is not enough.
- Missing protocol icon for an approved MVP protocol is an implementation issue.
- Do not invent protocol icons.
- Do not use token fallback icon for protocols.
- If a future/non-MVP protocol appears before assets are approved, show text safely and route asset approval separately.

---

## Wallet Context

The Portfolio page should show connected wallet context in the top navigation.

Example:

```text
Phantom • 6fQ9
```

Rules:

- Wallet pill shows provider and shortened address.
- Wallet icon comes from approved wallet icon assets.
- Wallet pill does not imply custody.
- Wallet pill does not imply signing.
- Wallet pill does not imply WealthSmith can move funds.
- If wallet is disconnected, portfolio should show disconnected/empty/last-known state according to product rules.

---

## Empty States

### No Wallet Connected

```text
Connect a wallet or try Demo Mode to view your portfolio.
```

Rules:

- Do not show personalized portfolio data.
- Do not show protocol positions.
- Do not show fake suggestions as real.
- Keep onboarding/start panel available.

### No Liquid Assets

```text
No liquid assets detected.
Assets may be staked or deployed in strategies.
```

### No Staked Assets

```text
No staked assets detected.
Staked positions will appear here when WealthSmith detects them.
```

### No Yield Strategies

```text
No yield strategies detected.
Vault, LP, and strategy positions will appear here when available.
```

Rules:

- Empty states should be calm and specific.
- Do not pressure the user into yield.
- Do not imply missing positions means the user has done something wrong.

---

## Loading States

Loading should be delayed to avoid flicker.

Recommended timing:

```text
0–400ms:
  No loading UI.

400–800ms:
  Subtle pending only if needed.

800ms+:
  Show explicit loading state.

1.5s+:
  Show full explanatory loading only if helpful.
```

Rules:

- Use skeletons for chart/table/card data loading when needed.
- Do not use Smith AI animation for generic portfolio loading.
- Do not show loading for fast tab switch.
- Do not show loading for local pagination if data is already present.
- Use partial data state if some sections load before others.

---

## Partial Data State

Portfolio data may load in stages.

Examples:

```text
Wallet balances loaded, protocol positions still loading.
Liquid assets loaded, staked assets unavailable.
Prices loaded, APY unavailable.
```

Rules:

- Show available sections.
- Mark unavailable sections clearly.
- Do not block the entire page if only one section is delayed.
- Do not show stale APY as current.
- Do not double-count partially loaded positions.
- Keep Smith AI suggestions conservative until portfolio data is complete enough.

---

## Error States

Common errors:

```text
Wallet balances unavailable
Price data unavailable
Protocol positions unavailable
APY unavailable
Portfolio valuation failed
```

Rules:

- Explain what is unavailable.
- Keep the rest of the page usable.
- Allow retry if product supports it.
- Do not imply funds are lost.
- Do not show unverified values as real.
- Do not hide all portfolio content because one protocol failed.

Example:

```text
Some protocol positions could not be loaded.
Your wallet balances are still visible.
```

---

## Demo Mode Behavior

Demo Mode can show a complete sample Portfolio page.

Rules:

- Demo Mode banner must remain visible.
- Demo portfolio values are sample values.
- Demo positions are not the user’s real positions.
- Demo suggestions are sample suggestions.
- Do not mix demo and real positions.
- Exiting Demo clears demo portfolio data unless real wallet data is available.

---

## Financial Copy Rules

Use:

```text
Portfolio value
Asset allocation
Detected position
Estimated earnings
APY
Modeled
May vary
```

Avoid:

```text
Guaranteed yield
Risk-free
Safe profit
We manage your assets
We moved your funds
You are earning for sure
```

Do not overstate safety.

Preferred copy:

```text
Assets deployed in yield-generating strategies and vaults.
```

Avoid:

```text
Assets safely earning guaranteed passive income.
```

---

## Accessibility

Rules:

- Page title should be semantic heading.
- Section titles should be semantic headings.
- Charts should have accessible text summaries.
- Tables should use semantic table markup.
- Column headers should be clear.
- External links should announce new-tab behavior.
- Token/protocol icons should be decorative when visible text exists.
- Do not rely on color alone for positive/negative changes.
- 24h change should include sign and direction text.
- Pagination should be keyboard accessible.
- Rows per page control should have a label.
- Manage links should have descriptive accessible labels.

Example table accessibility:

```text
Token column: SOL, amount 154.2 SOL, USD value $8,500, 24-hour change up 2.1%.
```

---

## Responsive Behavior

### Desktop

- Two-zone layout.
- Portfolio content left.
- Smith AI Suggestions right.
- Tables can use full card width.
- Charts should remain large and readable.

### Tablet

- Suggestions rail may become drawer or stacked below key portfolio content.
- Tables may need horizontal scroll only if unavoidable.
- Prefer responsive columns or compressed rows for tables.

### Mobile

- Single-column layout.
- Charts stack.
- Tables may become card lists.
- Suggestion rail becomes bottom sheet, drawer, or stacked section.
- Manage links remain visible.
- Avoid hiding key value fields.
- Avoid hover-only behavior.

---

## Claude Code Rules

Claude Code should:

- Render portfolio from normalized data.
- Use approved token icons and fallback token icon.
- Use approved protocol icons.
- Keep token/protocol names visible.
- Use semantic chart tokens.
- Use table component rules.
- Show liquid, staked, and yield sections separately.
- Open Manage links in a new tab for MVP.
- Use approved protocol metadata for external URLs.
- Keep right-side Smith AI Suggestions rail when available.
- Use empty/partial/error states.
- Avoid loading flicker.
- Respect Demo Mode.
- Preserve accessibility.

Claude Code must not:

- Invent balances.
- Invent token identities.
- Invent protocol positions.
- Invent APY.
- Invent estimated earnings.
- Invent protocol URLs.
- Double-count assets.
- Use token icon alone as identity.
- Use protocol icon alone as identity.
- Show broken images.
- Execute transactions from Manage.
- Request wallet signatures from Manage.
- Mix demo and real data.
- Hide unavailable data without explanation.
- Use hype or guarantee language.

---

## Do

- Show Balance Overview first.
- Show Crypto Assets Allocation second.
- Show Asset Deployment Overview after allocation.
- Separate liquid, staked, and yield positions.
- Show totals for each deployment section.
- Show visible labels on charts.
- Show token and protocol text labels.
- Use fallback token icon when needed.
- Use Manage links as external protocol handoff for MVP.
- Keep Smith AI Suggestions visible on desktop.
- Keep portfolio read-only for MVP.

---

## Do Not

- Do not treat portfolio page as an execution surface.
- Do not imply WealthSmith holds funds.
- Do not imply WealthSmith manages funds directly.
- Do not imply APY is guaranteed.
- Do not show unsupported positions as supported.
- Do not hide positions because an icon is missing.
- Do not use protocol fallback icons.
- Do not show loading for fast updates.
- Do not let suggestion cards alter portfolio data directly.

---

## Done Criteria

This pattern is implemented correctly when:

- Portfolio page shows Balance Overview.
- Portfolio page shows Crypto Assets Allocation.
- Portfolio page shows Asset Deployment Overview.
- Liquid Assets table renders wallet balances.
- Staked Assets table renders detected staking positions.
- Yield Strategies table renders detected yield/vault/LP positions.
- Section totals come from product logic.
- Charts use visible labels and accessible summaries.
- Tables use visible token/protocol labels.
- Missing token icons use fallback token icon.
- Missing protocol icons are treated as implementation issues.
- Manage links open protocol pages in new tabs.
- No transactions execute from Portfolio page.
- No signatures are requested from Portfolio page table links.
- Smith AI Suggestions rail remains available on desktop.
- Demo Mode is clearly labeled when active.
- Empty, partial, and error states are supported.
- Portfolio does not invent data.

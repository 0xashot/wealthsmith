# Empty State

Empty states explain why content is missing and help users understand what they can do next.

In WealthSmith, empty states may appear when there are no connected wallets, no watch-only addresses, no assets, no suggestions, no yield positions, no search results, no filtered results, no chart data, or no activity yet.

Empty states should be calm, useful, specific, and action-oriented without creating pressure.

---

## Purpose

Use empty states when a section, card, table, chart, list, or page has no content to show.

An empty state should help users understand:

- Why nothing is shown
- Whether the state is expected
- Whether an action is available
- Whether the state is temporary
- Whether the user needs to connect a wallet
- Whether demo mode or watch-only mode is available
- Whether filters or search caused the empty result
- Whether data is unavailable or still loading

Empty states should reduce confusion and guide the user to the next safe step.

---

## Important Rule

Empty states explain missing content.

Empty states do not contain WealthSmith business logic.

An empty state can display:

- Title
- Description
- Icon or illustration
- Primary action
- Secondary action
- Helper text
- Link
- Empty reason
- Demo mode option
- Retry option
- Filter reset option

An empty state must not decide:

- Whether a wallet is valid
- Whether portfolio data exists
- Whether a suggestion should exist
- Which suggestion is Top Pick
- Whether a user should invest
- Whether a protocol is recommended
- Whether a token is suitable
- Whether safety buffer coverage is enough
- Whether onboarding is complete
- Whether empty content should trigger a recommendation

Those decisions must come from backend data, product logic, Suggestion Engine, deterministic rules, or parent state.

The component should render the empty state data provided to it.

---

## When to Use

Use an empty state when a content area has no items or no data.

Examples:

- No wallet connected
- No watch-only addresses added
- No assets found
- No suggestions yet
- No yield positions found
- No staked assets found
- No protocols detected
- No activity yet
- No search results
- No filtered results
- No chart data available
- No table rows available
- No notifications yet
- No saved settings changes
- No portfolio data in real mode
- No demo data available, if demo data fails to load

Empty states can appear in:

- Dashboard
- Portfolio overview
- Wallet pages
- Asset tables
- Suggestion pages
- Yield pages
- Staked assets section
- Protocol section
- Search results
- Filtered tables
- Charts
- Modals
- Side panels
- Smith AI context panels
- Onboarding sections

---

## When Not to Use

Do not use an empty state for:

- Loading content
- Temporary action feedback
- Field validation
- Short helper text
- Global app mode announcements
- Critical errors
- Blocking confirmations
- Normal zero values that are meaningful data
- Hidden content behind collapsed accordions
- Content that has failed to load because of an error

Use:

- `components/skeleton.md` for loading states once available
- `components/toast.md` for temporary feedback
- `components/input.md` for field validation
- `components/announcement.md` for global top banners
- `components/alert.md` for inline warnings or errors
- `components/modal.md` for blocking confirmations

Do not show an empty state while data is still loading unless the product state confirms the result is truly empty.

---

## Empty vs Loading vs Error

Empty, loading, and error states must not be mixed.

### Empty

Use when data loaded successfully and there is no content.

Example:

```text
No assets found.
```

### Loading

Use when data is still being fetched.

Example:

```text
Loading assets…
```

Use `components/skeleton.md` once available.

### Error

Use when data failed to load.

Example:

```text
Could not load assets. Try again.
```

Use `components/alert.md` or an error state inside the parent component.

Rules:

- Do not show empty state before loading completes.
- Do not show empty state for failed requests.
- Do not show fake empty results if data is unavailable.
- Parent state must decide which state applies.

---

## Data Source

Empty states should render structured data.

Expected data may include:

```text
id
type
title
description
icon
illustration
primaryActionLabel
primaryActionType
secondaryActionLabel
secondaryActionType
helperText
status
reason
dismissible
ariaLabel
```

The exact schema can evolve.

The component should not invent titles, descriptions, actions, reasons, or state.

---

## Anatomy

An empty state can include:

1. Container
2. Optional icon or illustration
3. Title
4. Description
5. Optional primary action
6. Optional secondary action
7. Optional helper text
8. Optional link
9. Optional status badge
10. Optional retry action

Required:

- Title
- Description or clear context
- Accessible label or readable content

Optional:

- Icon
- Illustration
- Primary action
- Secondary action
- Helper text
- Link
- Retry action
- Badge

Empty states should remain useful without relying on icons alone.

---

## Variants

### Page Empty State

Use when the whole page has no content.

Examples:

```text
No portfolio data yet.
No wallets connected.
No suggestions yet.
```

Rules:

- Use a clear title.
- Explain what needs to happen next.
- Provide one primary action when available.
- Keep secondary action optional.
- Do not overcrowd the page.

---

### Section Empty State

Use inside a page section, card, table, chart, or panel.

Examples:

```text
No yield positions found.
No staked assets found.
No assets match your filters.
```

Rules:

- Keep copy shorter than page-level empty states.
- Keep the empty state visually connected to the section.
- Provide reset or retry action only when useful.

---

### Table Empty State

Use when a table has no rows.

Examples:

```text
No assets found.
No wallets connected.
No yield positions found.
No assets match your filters.
```

Rules:

- Keep table headers visible only if they help explain the structure.
- Do not show fake rows.
- Provide clear action where useful.
- For filtered empty state, offer reset filters.

Good:

```text
No assets match your filters.
```

Action:

```text
Clear filters
```

---

### Chart Empty State

Use when a chart has no data.

Examples:

```text
No allocation data available.
Connect a wallet to view allocation.
No projected growth data available.
```

Rules:

- Do not render an empty chart shell without explanation.
- Do not show fake chart data.
- If the chart needs wallet data, say so clearly.
- If data is unavailable because of an error, use an error state instead.

---

### Search Empty State

Use when search returns no results.

Examples:

```text
No results found.
No tokens match your search.
No wallets match your search.
```

Rules:

- Reflect the search context.
- Do not blame the user.
- Provide a way to clear or change the search when useful.

Good:

```text
No tokens match your search.
```

Action:

```text
Clear search
```

---

### Filtered Empty State

Use when content exists but filters hide all results.

Examples:

```text
No assets match your filters.
No suggestions match this category.
No wallets match the selected filters.
```

Rules:

- Explain that filters caused the empty state.
- Provide a clear filter reset action.
- Do not imply the user has no data if filters are hiding it.

Good:

```text
No assets match your filters.
```

Avoid:

```text
No assets found.
```

when filters are active.

---

### Wallet Empty State

Use when no wallet is connected or no address has been added.

Examples:

```text
No wallet connected.
Connect a wallet or add a watch-only address to view portfolio data.
```

Actions:

```text
Connect wallet
Add watch-only address
Try Demo Mode
```

Rules:

- Do not imply custody.
- Do not imply WealthSmith can move funds.
- Explain watch-only clearly when offered.
- Keep wallet language precise.

Good description:

```text
Connect a wallet or add a public address in read-only mode.
```

Avoid:

```text
Give WealthSmith access to your funds.
```

---

### Watch-Only Empty State

Use when there are no watch-only addresses.

Example:

```text
No watch-only addresses added.
Add a public wallet address to track it in read-only mode.
```

Rules:

- Make read-only behavior clear.
- Do not imply ownership.
- Do not imply signing.
- Do not imply custody.

---

### Asset Empty State

Use when no assets are detected or available.

Examples:

```text
No assets found.
No supported assets found in this wallet.
No assets match your filters.
```

Rules:

- State whether the result is no assets, no supported assets, or filtered empty.
- Do not show fake balances.
- Do not imply assets are missing from the wallet unless product data confirms that.

---

### Suggestion Empty State

Use when there are no suggestions to display.

Examples:

```text
No suggestions yet.
WealthSmith will show suggestions when there is enough portfolio and goal data.
```

Rules:

- Do not invent suggestions.
- Do not imply the user is “done” unless product logic provides that state.
- Explain what data may be needed.
- Use calm language.

Actions may include:

```text
Complete setup
Connect wallet
Ask Smith AI
```

Do not pressure the user into investing.

---

### Yield Empty State

Use when no yield or staked positions are found.

Examples:

```text
No yield positions found.
No staked assets found.
```

Rules:

- Do not imply the user should start yield farming.
- Do not recommend protocols inside the empty state.
- If useful, offer education or Smith AI explanation.

Good action:

```text
Learn about yield positions
```

Avoid:

```text
Start earning now
```

---

### Demo Mode Empty State

Use when the user can try WealthSmith with sample data.

Example:

```text
Explore WealthSmith with Demo Mode.
Use sample portfolio data to preview how suggestions work.
```

Rules:

- Make demo/sample data clear.
- Do not imply demo data is real user data.
- Do not mix real and demo portfolio states without clear separation.
- Demo mode should also use `components/announcement.md` while active.

Good action:

```text
Try Demo Mode
```

---

### Onboarding Empty State

Use carefully inside onboarding.

Examples:

```text
No wallet connected yet.
You can continue with Demo Mode or add a wallet later.
```

Rules:

- During onboarding, Smith AI remains open.
- Empty states can support Smith AI guidance.
- Do not hide required onboarding instructions.
- Do not decide onboarding completion inside the component.

---

## Actions

Empty states often include one primary action and one optional secondary action.

Examples:

```text
Connect wallet
Add watch-only address
Try Demo Mode
Clear filters
Clear search
Try again
Complete setup
Ask Smith AI
View details
```

Rules:

- Use `components/button.md`.
- Prefer one primary action.
- Use secondary action only when useful.
- Action must directly relate to the empty state.
- Do not use financial execution actions in empty states.
- Do not pressure users.

Good:

```text
Connect wallet
Add watch-only address
Clear filters
Try Demo Mode
```

Avoid:

```text
Invest now
Buy now
Start earning
Maximize yield
```

---

## Icons and Illustrations

Empty states may include icons or illustrations.

Rules:

- Visuals are optional.
- Visuals must support the message.
- Visuals must not replace text.
- Use calm, simple visuals.
- Avoid overly playful visuals for financial or error states.
- Use approved assets from `assets/` when available.
- Missing icons should not break layout.

Examples:

- Wallet icon for no wallet
- Search icon for no results
- Chart icon for no chart data
- Sparkle or assistant icon for Smith AI help
- Token/asset icon for no assets

---

## Sizes

### Compact

Use inside cards, tables, charts, side panels, and modals.

Rules:

- Short title.
- Short description.
- One action maximum when possible.

### Standard

Default empty state.

Use inside main dashboard sections or page-level modules.

### Full Page

Use when the whole page has no content.

Rules:

- Provide a clear next action.
- Keep content centered or aligned with page layout.
- Do not overfill the page.
- Do not use more than two actions.

---

## States

Empty states may support these states.

### Default Empty

No data exists for the section.

### Filtered Empty

Filters hide available data.

### Search Empty

Search query returned no results.

### Permission Empty

User has not connected or granted required read access.

### Unsupported Empty

No supported data was found.

### Demo Available

No real data is available, but demo mode can be used.

### Retry Available

Data could not be confirmed and retry is useful.

Use error state instead if data failed to load.

---

## Token Usage

Empty states must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, motion, or z-index.

### Correct

```text
background: color.surface.card
text: color.text.primary
secondary text: color.text.secondary
icon color: color.text.secondary
title: typography.heading.md
description: typography.body.md
helper text: typography.body.sm
padding: spacing.section.padding.mobile / desktop
gap: spacing.stack.gap.md
radius: radius.surface.lg
border: color.border.subtle
motion: motion.surface.fadeIn
```

### Incorrect

```text
background: #FFFFFF
color: #121212
font-size: 16px
padding: 32px
border-radius: 24px
border: 1px solid #C5C5C5
```

---

## Responsive Behavior

Empty states should be mobile-first.

### Mobile

- Keep content concise.
- Stack actions vertically.
- Keep buttons full-width when useful.
- Avoid large illustrations that push content too far down.
- Keep text readable.
- Do not cover Smith AI onboarding content.

### Tablet

- Use centered or section-aligned layout.
- Keep actions close to text.

### Desktop

- Use section-aligned or centered layout depending on context.
- Keep empty state visually connected to the empty content area.
- Avoid overly wide text.

### Wide

- Constrain content width.
- Do not stretch empty state text across the page.
- Keep visual hierarchy clear.

---

## Accessibility

Empty states must support accessibility by default.

Requirements:

- Title and description must be readable by assistive technologies.
- Icons must not be the only meaning.
- Decorative icons should use empty alt text.
- Action buttons must be keyboard accessible.
- Focus state must be visible.
- Do not rely on color alone.
- Contrast must meet WCAG AA.
- Empty state should be announced when it replaces loaded content where appropriate.
- Avoid automatically moving focus unless the empty state is the result of a user action and focus management is needed.

Recommended structure:

```text
heading
description
actions
```

For dynamic updates:

```text
role="status"
aria-live="polite"
```

Use live regions sparingly.

---

## Content Rules

Empty state copy should follow WealthSmith voice:

- Clear
- Calm
- Specific
- Beginner-friendly
- Helpful
- Non-hype
- Action-oriented when useful

Good titles:

```text
No wallet connected
No assets found
No suggestions yet
No yield positions found
No results found
No chart data available
```

Good descriptions:

```text
Connect a wallet or add a public address in read-only mode.
```

```text
WealthSmith will show suggestions when there is enough portfolio and goal data.
```

```text
No assets match your filters. Try clearing filters to see more results.
```

Avoid vague titles:

```text
Nothing here
Empty
No data
Oops
```

Avoid hype:

```text
Start earning now
Unlock profit opportunities
Get rich with yield
```

---

## Financial and Wallet Language Rules

Empty state copy must be precise.

Allowed:

```text
Connect wallet
Add watch-only address
Read-only
Public wallet data
Demo Mode
Sample data
Estimated
Supported assets
```

Avoid:

```text
Guaranteed
Risk-free
Profit
Best return
Auto-invest
Custody access
Funds secured
```

Do not imply WealthSmith can move funds, sign transactions, or execute financial actions unless the product actually supports that action and the flow clearly explains it.

Do not imply demo data is real user data.

Do not present empty state guidance as individualized financial advice.

---

## Smith AI Rules

Empty states may include Smith AI actions.

Allowed:

```text
Ask Smith AI
Explain with Smith AI
```

Rules:

- Empty state may open Smith AI.
- Empty state does not generate Smith AI reasoning.
- Parent state should pass structured context.
- During onboarding, Smith AI remains open.
- Do not rely on Smith AI as the only explanation for why content is empty.

Good:

```text
Ask Smith AI why this is empty
```

Avoid:

```text
Ask AI what to buy
```

---

## Demo Mode Rules

Empty states may offer Demo Mode when real data is missing.

Rules:

- Demo Mode must be clearly labeled.
- Demo Mode uses sample data.
- Demo values must not be presented as user assets.
- When Demo Mode is active, use `components/announcement.md`.
- Empty state should not mix demo and real data.

Good action:

```text
Try Demo Mode
```

Good description:

```text
Use sample portfolio data to preview how WealthSmith works.
```

---

## Validation and State Rules

Empty state selection belongs outside the component.

The empty state may display:

- Title
- Description
- Icon
- Action
- Secondary action
- Empty reason
- Helper text

The empty state must not decide:

- Whether content is truly empty
- Whether loading has completed
- Whether an error occurred
- Whether a user should connect a wallet
- Whether a suggestion should exist
- Whether a protocol is recommended
- Whether a user should invest
- Whether demo mode should start

---

## Do

- Use empty states when data loaded successfully but no content exists.
- Use semantic tokens.
- Explain why the area is empty.
- Provide one clear next action when useful.
- Use filtered/search-specific copy when relevant.
- Keep wallet and demo language precise.
- Use Smith AI as optional support where appropriate.
- Keep loading, error, and empty states separate.
- Keep product logic outside the component.

---

## Do Not

- Do not show empty state while data is still loading.
- Do not show empty state when a request failed.
- Do not invent missing values, suggestions, or actions.
- Do not use vague copy like “Nothing here” when better context exists.
- Do not pressure users into investing.
- Do not use hype-based financial copy.
- Do not imply guaranteed returns.
- Do not imply custody, execution, or investment action unless the product actually supports it.
- Do not imply demo data is real user data.
- Do not hardcode raw visual values.

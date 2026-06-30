# Empty, Loading, and Error States

This pattern defines how WealthSmith handles non-happy-path states across the product.

It covers:

- Empty states
- Loading states
- Partial data states
- Error states
- Disconnected states
- Stale data states
- Demo Mode states
- Unsupported asset/protocol states
- Missing icon states
- Retry and recovery behavior

These states are part of the product experience, not edge cases.

They must feel calm, clear, recoverable, and trustworthy.

---

## Purpose

Users should always understand:

- What is happening
- What data is missing
- Whether they need to do anything
- Whether the issue affects their wallet or funds
- What they can do next
- Whether the state is temporary, empty, partial, stale, or failed

WealthSmith should never make users feel that their funds moved, disappeared, or are at risk unless there is verified evidence from product logic and data sources.

---

## Core Principle

A non-happy-path state must never invent certainty.

Use the most accurate state available.

```text
No data yet -> empty state
Data is being fetched -> loading state
Some data is available -> partial state
Old data is shown -> stale state
Data fetch failed -> error state
Wallet disconnected -> disconnected state
Demo data is active -> demo state
Unsupported item appears -> unsupported state
```

Do not use one generic fallback for everything.

---

## Product Layer Rule

Non-happy-path states must preserve the WealthSmith logic separation:

```text
Data source / backend = facts and status
Suggestion Engine = deterministic recommendations
Smith AI = explanation
UI = renderer
```

The UI must not invent:

- Portfolio values
- Safety Buffer coverage
- Suggestions
- APY
- Estimated earnings
- Token identity
- Protocol identity
- Wallet ownership
- Recovery logic

The UI should render the state it receives.

---

## State Categories

WealthSmith should support these state categories:

```text
empty
loading
partial
error
stale
disconnected
demo
unsupported
blocked
locked
success
saving
refreshing
```

Each state should have:

```text
state id
user-facing message
available action
visual treatment
accessibility behavior
data behavior
recovery behavior
```

---

## Global Loading Rule

Do not show loading UI for instant or near-instant updates.

Fast updates should feel instant.

Recommended timing:

```text
0–400ms:
  No loading UI.
  Update directly.

400–800ms:
  Avoid full loading UI.
  Use subtle pending state only if needed.

800ms+:
  Show explicit loading state.

1.5s+:
  Show explanatory loading state with copy.
```

Minimum visible duration when full loading is shown:

```text
500–700ms
```

Reason:

```text
Avoid flicker.
Avoid fake-feeling loading.
Avoid making the product feel slower than it is.
```

---

## Loading Types

Use the smallest loading state that matches the wait.

### No Loading

Use when:

```text
Selecting goal
Selecting risk level
Selecting time horizon
Selecting contribution rhythm
Opening a menu
Switching to already-loaded tab
Dismissing an alert
Local pagination with already-loaded data
Fast suggestion generation
Fast projection update
```

Rules:

- Update directly.
- Do not flash a spinner.
- Do not show Smith AI animation.

---

### Subtle Pending State

Use when the action takes slightly longer but does not justify a full loading screen.

Examples:

```text
Saving one field
Validating currency input
Refreshing a small metric
Fetching a small row-level value
```

Allowed treatments:

```text
Disable selected button briefly
Show inline saving text
Show button pending state
Show subtle skeleton only in affected area
```

Rules:

- Keep the page usable.
- Keep layout stable.
- Do not block unrelated areas.
- Do not show Smith AI animation.

---

### Skeleton Loading

Use for:

```text
Metric cards
Tables
Charts
Portfolio sections
Suggestion card placeholders
```

Rules:

- Use skeletons only when the content shape is known.
- Skeleton should preserve layout size.
- Skeleton should not look like real data.
- Skeleton should not show fake values.
- Skeleton should not be used for Smith AI explanation text unless text is actually loading.
- Respect reduced motion.

---

### Full Explanatory Loading

Use only when the user is waiting for a meaningful product operation.

Examples:

```text
Building suggestions
Generating Smith AI Strategy Insights
Preparing recommendation explanations
```

Approved Smith AI loading copy:

```text
Building Your Suggestions...
We are checking your plan and wallet balance to find the best next actions.
No action will be taken automatically.
```

Rules:

- Use only for Smith AI or suggestion-building waits.
- Use `assets/animations/smith-ai-symbol-loop.json` only for approved Smith AI loading states.
- Do not use Smith AI animation for wallet connection.
- Do not use Smith AI animation for generic portfolio refresh.
- Do not use Smith AI animation for chart/table/card loading.
- If results are ready quickly, skip the loading state.
- If loading appears, keep it visible long enough to avoid flicker.
- Respect reduced motion.

---

## Reduced Motion

All loading and animated states must respect reduced motion.

Rules:

- Do not autoplay Smith AI animation when reduced motion is enabled.
- Use static `assets/logo/wealthsmith-symbol.svg` as fallback.
- Keep the same loading copy visible.
- Avoid motion-based-only state changes.
- Do not use pulsing skeletons if reduced motion is enabled; use static skeletons.

---

## Empty States

Empty states appear when there is no data yet, not when something failed.

Empty state should explain:

```text
What is missing
Why it is missing
What the user can do next
```

Rules:

- Be calm and specific.
- Provide one primary next action when possible.
- Do not show fake data.
- Do not imply a failure.
- Do not blame the user.
- Do not use scary copy.

---

## Dashboard Empty States

### Pre-Wallet Dashboard

Use when no wallet is connected and Demo Mode is inactive.

Example:

```text
Total Portfolio Value
$0
Crypto + Stablecoins
```

```text
Net Contributions
$0
Invested over the last 12 months
```

Safety Buffer empty state:

```text
Build your safety net first
Add your monthly expenses and risk tolerance to see your safety buffer target.
```

Rules:

- $0 is acceptable only when the state truly represents no connected data or empty starter state.
- Do not show personalized suggestions.
- Do not show protocol recommendations.
- Keep Connect Wallet and Try Demo Mode available.
- Smith AI onboarding should explain read-only wallet connection.

---

### Safety Buffer Empty

Use when required safety buffer inputs are missing.

Example:

```text
Build your safety net first
Add your monthly expenses and risk tolerance to see your safety buffer target.
```

Rules:

- Required inputs may include expenses, risk level, income, and stablecoin holdings depending on product logic.
- Do not calculate a partial buffer if product logic says inputs are insufficient.
- Do not imply the user is unsafe.
- Do not pressure the user into depositing funds.

---

### Projected Growth Empty

Use when projection inputs are incomplete.

Example:

```text
Projected growth will appear after you set your goal, time horizon, and contribution rhythm.
```

Rules:

- Explain what is needed.
- Do not show fake projection curves.
- Do not imply guaranteed future value.

---

## Portfolio Empty States

### No Wallet Connected

```text
Connect a wallet or try Demo Mode to view your portfolio.
```

Rules:

- Do not show real portfolio values.
- Do not show protocol positions.
- Do not show wallet-specific suggestions.
- Keep Connect Wallet and Try Demo Mode available.

---

### No Liquid Assets

```text
No liquid assets detected.
Assets may be staked or deployed in strategies.
```

Rules:

- Do not imply something is wrong.
- Do not hide staked or yield positions if they exist.
- Do not show fake rows.

---

### No Staked Assets

```text
No staked assets detected.
Staked positions will appear here when WealthSmith detects them.
```

Rules:

- Do not pressure the user to stake.
- Do not imply staking is required.
- Do not show staking suggestions unless Suggestion Engine returns them.

---

### No Yield Strategies

```text
No yield strategies detected.
Vault, LP, and strategy positions will appear here when available.
```

Rules:

- Do not pressure the user into yield.
- Do not imply yield is risk-free.
- Do not show fake strategy rows.

---

## Suggestion Empty States

Use when no suggestions are available.

Example:

```text
No suggestions yet
Complete your plan or connect a wallet to generate personalized suggestions.
```

Rules:

- Do not show Top Pick.
- Do not show protocol cards without data.
- Do not generate placeholder recommendations.
- Provide one clear next action.
- If missing plan data, point to Goal setup.
- If missing wallet data, point to Connect Wallet or Demo Mode.

---

## Smith AI Empty States

Use when Smith AI has no current context.

Example:

```text
Ask Smith AI about your portfolio, safety buffer, or suggestions.
```

Rules:

- Do not invent a response before the user asks.
- Do not show fake chat history.
- Use current structured data when available.
- If no wallet/plan data exists, explain what Smith AI can answer with limited context.

---

## Partial Data States

Partial state appears when some data is available but not all.

Examples:

```text
Wallet balances loaded, protocol positions still loading.
Portfolio values loaded, APY unavailable.
Liquid assets loaded, staked assets unavailable.
Suggestions generated from plan data, wallet data missing.
```

Rules:

- Show available data.
- Clearly label missing pieces.
- Do not block the whole page if only one section is unavailable.
- Do not double-count assets.
- Do not show stale or unavailable values as current.
- Keep recommendations conservative if portfolio data is incomplete.
- Use partial-state copy instead of generic error.

Example:

```text
Some portfolio data is still loading.
Your wallet balances are visible, but protocol positions may take longer.
```

Example:

```text
APY is unavailable right now.
Position value is still shown.
```

---

## Stale Data States

Stale state appears when the app is showing older data.

Use when:

```text
Wallet disconnected but last snapshot remains visible
Price data is older than product freshness threshold
APY source has not refreshed
Portfolio refresh failed but previous values are still displayed
```

Rules:

- Clearly label stale data.
- Do not present stale data as current.
- Show timestamp if available.
- Allow refresh if product supports it.
- Avoid showing stale APY without a warning.
- Do not use stale data for new Top Pick unless product logic permits it.

Example:

```text
Showing last updated portfolio data from 10:42 AM.
Reconnect your wallet to refresh.
```

Example:

```text
APY data may be out of date.
Refresh before making a decision.
```

---

## Disconnected States

Disconnected state appears after a wallet disconnects or connection is lost.

Example toast:

```text
Wallet disconnected
```

Page state example:

```text
Connect your wallet to refresh portfolio data.
```

Rules:

- Do not imply funds moved.
- Do not imply wallet itself changed.
- Remove connected wallet pill.
- Stop presenting disconnected data as current.
- If last-known data remains visible, label it clearly.
- Remove or disable wallet-specific suggestions unless product logic supports stale suggestions.
- Keep Demo Mode available if appropriate.

---

## Demo Mode States

Demo Mode uses sample data.

Banner:

```text
You’re in demo mode.
Exit Demo
```

Rules:

- Demo Mode must be visibly persistent.
- Demo data must not mix with real wallet data.
- Demo suggestions must not imply real wallet analysis.
- Exiting Demo should clear demo data unless real wallet data is available.
- Empty/error states in Demo Mode should still be labeled as demo if they refer to sample data.
- Do not hide Demo Mode banner while demo data is visible.

---

## Unsupported Asset States

Unsupported asset state appears when wallet data includes an asset WealthSmith cannot fully identify or support.

Rules:

- Do not hide unsupported assets if product scope allows showing them.
- Show token symbol/name if available.
- Use fallback token icon if token icon is missing.
- Do not show broken images.
- Do not invent APY, category, or strategy.
- Do not use unsupported assets in suggestions unless product logic supports them.
- Label unsupported status clearly when needed.

Example:

```text
Unsupported token
We can show this balance, but it is not currently used in suggestions.
```

---

## Unsupported Protocol States

Unsupported protocol state appears when a detected position belongs to a protocol not supported by MVP.

Rules:

- Show text safely if product scope allows.
- Do not invent protocol icons.
- Do not use token fallback icon for protocols.
- Do not show Manage link unless there is an approved protocol URL.
- Do not use unsupported protocol positions in suggestions unless product logic supports them.
- Missing protocol icon for an approved MVP protocol is an implementation issue.

Example:

```text
Protocol details unavailable
We detected this position, but full protocol support is not available yet.
```

---

## Missing Icon States

### Missing Token Icon

Use:

```text
assets/icons/fallback/fallback-token.svg
```

Rules:

- Always show token symbol/name.
- Do not show broken image.
- Fallback icon does not identify the token.
- Do not guess token icon from a similar token.

### Missing Wallet Icon

Rules:

- No wallet fallback for MVP.
- Show wallet name text if possible.
- Treat missing approved wallet icon as implementation issue.
- Do not use token fallback icon.

### Missing Protocol Icon

Rules:

- No protocol fallback for MVP.
- Show protocol name text if possible.
- Treat missing approved protocol icon as implementation issue.
- Do not use token fallback icon.

### Missing UI Icon

Rules:

- Do not show broken icon.
- Use text label.
- Treat missing UI icon as implementation issue.

---

## Error States

Error states appear when an operation failed.

Error copy should explain:

```text
What failed
Whether the rest of the product is still usable
What the user can do next
```

Rules:

- Be calm.
- Be specific.
- Do not blame the user.
- Do not imply funds are at risk unless verified.
- Preserve already-loaded data when safe.
- Allow retry when possible.
- Do not replace the entire page if only one section failed.

---

## Wallet Error States

Common errors:

```text
User rejected connection
Wallet provider not installed
Wallet provider unavailable
Connection timed out
Unsupported wallet
Ledger/message-signing issue
Balance fetch failed
```

Examples:

```text
Wallet connection was cancelled.
You can try again or continue in Demo Mode.
```

```text
We couldn’t load balances from this wallet yet.
Try again, switch wallets, or continue in Demo Mode.
```

```text
This wallet is not supported in the MVP.
Use Phantom, Solflare, or Backpack.
```

Rules:

- Do not use Smith AI suggestion animation for wallet errors.
- Do not imply the wallet or funds are broken.
- Keep Connect Wallet available.
- Keep Demo Mode available when appropriate.

---

## Portfolio Error States

Common errors:

```text
Wallet balances unavailable
Price data unavailable
Protocol positions unavailable
APY unavailable
Portfolio valuation failed
```

Example:

```text
Some protocol positions could not be loaded.
Your wallet balances are still visible.
```

Rules:

- Show available sections.
- Mark unavailable sections.
- Do not hide the whole Portfolio page because one protocol failed.
- Do not show APY if unavailable.
- Do not show estimated earnings if required APY/value is missing.
- Do not double-count positions during recovery.

---

## Suggestion Error States

Common errors:

```text
Suggestion generation failed
Required data unavailable
Protocol metadata missing
Top Pick unavailable
APY stale or missing
```

Example:

```text
I couldn’t build suggestions right now.
Your dashboard is still available. Try again in a moment.
```

Rules:

- Keep Dashboard visible.
- Allow retry.
- Do not show fake suggestions.
- Do not show stale suggestions as fresh.
- If previous suggestions are shown, label them as previously generated if product supports that.
- Do not show Top Pick if Top Pick Logic fails.

---

## Smith AI Error States

Smith AI may fail to generate an explanation.

Example:

```text
I couldn’t answer that right now.
You can try again, or review the dashboard values directly.
```

Rules:

- Do not erase dashboard or suggestion data.
- Do not invent a response.
- Do not imply product logic failed if only Smith AI failed.
- Keep prompt input usable if safe.
- Keep important structured data visible.

---

## Chart Error States

When chart data fails:

```text
Chart unavailable
We couldn’t load this chart, but your portfolio values are still visible.
```

Rules:

- Do not show misleading chart.
- Keep text values visible.
- Use empty chart container or alert inside chart card.
- Do not show fake series.
- Do not show broken SVG/canvas.

---

## Table Error States

When table data fails:

```text
Table data unavailable
Try refreshing, or check again later.
```

Rules:

- Preserve section header.
- Show what failed.
- Do not show fake rows.
- Do not remove totals if totals are still valid.
- Do not show row-level Manage actions if position data is unavailable.

---

## Blocked and Locked States

Blocked/locked states appear when an action is not currently available.

Examples:

```text
Unlock after Buffer is Full
Complete onboarding to view suggestions
Connect wallet to view portfolio
```

Rules:

- Explain why the item is locked.
- Explain how to unlock it.
- Do not make locked items look active.
- Do not let locked items execute actions.
- Locked yield suggestions should not imply the user can take the action now.

---

## Success States

Success states should be brief and grounded.

Examples:

```text
Wallet connected
Wallet disconnected
Goal updated
Onboarding complete
```

Rules:

- Use toast or inline confirmation.
- Do not over-celebrate financial actions.
- Do not imply returns or outcomes.
- Do not use celebration animation for MVP unless approved.
- Do not confuse success of saving data with success of investment outcome.

---

## Saving States

Use saving states when user edits plan/settings.

Examples:

```text
Saving...
Saved
```

Rules:

- Use subtle pending.
- Do not block entire page.
- Disable conflicting controls if needed.
- Show validation errors near field.
- Do not use Smith AI animation.

---

## Refreshing States

Use refreshing states for user-triggered updates.

Examples:

```text
Refreshing portfolio...
Updating suggestions...
```

Rules:

- Use subtle indicators.
- Keep existing data visible while refreshing if safe.
- Avoid full-page loading.
- Do not clear current data before replacement.
- Mark stale if refresh fails.

---

## Copy System

Good empty copy:

```text
Connect a wallet or try Demo Mode to view your portfolio.
```

Good partial copy:

```text
Some protocol positions could not be loaded. Your wallet balances are still visible.
```

Good error copy:

```text
I couldn’t build suggestions right now. Your dashboard is still available.
```

Good stale copy:

```text
Showing last updated data. Reconnect your wallet to refresh.
```

Avoid:

```text
Something went wrong.
Invalid.
Failed.
Your wallet is broken.
No data.
Error 500.
Funds unavailable.
```

Use technical details only when useful and safe.

---

## Component Mapping

Use these components for non-happy-path states:

```text
components/empty-state.md
components/loading-indicator.md
components/skeleton.md
components/alert.md
components/toast.md
components/progress-bar.md
components/modal.md
components/menu-popover.md
components/table.md
components/chart.md
components/suggestion-card.md
```

Rules:

- Empty state component for missing content.
- Skeleton for known content shape loading.
- Loading indicator for active operations.
- Alert for recoverable warnings/errors.
- Toast for brief success or status confirmation.
- Modal for blocking confirmation or wallet connect.
- Table/chart should own section-level empty/error states but not product logic.

---

## Asset Mapping

Approved loading animation:

```text
assets/animations/smith-ai-symbol-loop.json
```

Use only for:

```text
Building suggestions
Generating Smith AI Strategy Insights
Preparing recommendation explanations
```

Static fallback:

```text
assets/logo/wealthsmith-symbol.svg
```

Token fallback:

```text
assets/icons/fallback/fallback-token.svg
```

Rules:

- Do not use Smith AI animation as generic spinner.
- Do not use token fallback for wallet/protocol/UI icons.
- Do not show broken images.
- Use asset registries.

---

## Accessibility

Rules:

- Loading states must be announced when they take meaningful time.
- Do not announce rapid state changes unnecessarily.
- Error messages should be associated with affected controls or sections.
- Toasts should use polite announcements.
- Critical errors may use assertive announcements only if they require immediate attention.
- Skeletons should not be read as content.
- Empty states should have readable text.
- Progress indicators must expose current value when meaningful.
- Disabled actions should explain why when needed.
- Do not rely on color alone.
- Respect reduced motion.
- Preserve focus after errors.
- Focus should move to modal/dialog content when blocking state opens.
- Retried sections should not unexpectedly move focus unless user initiated it.

Examples:

```text
role="status"
aria-live="polite"
```

```text
role="alert"
```

```text
aria-busy="true"
```

---

## State Data Contract

Example section state:

```json
{
  "section": "portfolio_staked_assets",
  "status": "partial",
  "message": "Some protocol positions could not be loaded.",
  "last_updated_at": "timestamp",
  "retry_available": true,
  "data": []
}
```

Example loading state:

```json
{
  "operation": "generating_suggestions",
  "status": "loading",
  "show_loading_after_ms": 800,
  "minimum_visible_ms": 600,
  "started_at": "timestamp"
}
```

Example stale state:

```json
{
  "section": "portfolio",
  "status": "stale",
  "last_updated_at": "timestamp",
  "message": "Showing last updated portfolio data.",
  "retry_available": true
}
```

Example unsupported token state:

```json
{
  "token": {
    "symbol": "UNKNOWN",
    "name": "Unknown Token",
    "icon": "assets/icons/fallback/fallback-token.svg",
    "support_status": "unsupported"
  }
}
```

---

## Claude Code Rules

Claude Code should:

- Use specific state types.
- Delay loading UI to avoid flicker.
- Skip loading for fast updates.
- Use skeletons for known layouts.
- Use Smith AI animation only for suggestion-building waits.
- Use static fallback for reduced motion.
- Show partial data when possible.
- Preserve usable content during errors.
- Use calm, recoverable copy.
- Use token fallback only for token icons.
- Keep demo and real data separate.
- Label stale data.
- Provide retry when supported.
- Preserve accessibility behavior.

Claude Code must not:

- Show fake data.
- Show broken images.
- Invent financial values.
- Invent APY.
- Invent suggestions.
- Invent protocol positions.
- Mix demo and real data.
- Use generic “Something went wrong” when a better state is known.
- Use Smith AI animation for wallet connection or generic loading.
- Show loading for instant updates.
- Hide the whole page when one section fails.
- Blame the user.
- Imply funds are lost or moved without verified evidence.
- Use token fallback icon for wallets or protocols.
- Present stale data as current.

---

## Do

- Be specific about the state.
- Keep users oriented.
- Keep usable data visible.
- Make recovery clear.
- Delay loading to avoid flicker.
- Respect reduced motion.
- Use calm financial language.
- Label demo and stale states.
- Explain locked/blocked prerequisites.
- Use accessible status messages.

---

## Do Not

- Do not show fake placeholders as real data.
- Do not use one generic fallback for every failure.
- Do not show Smith AI loading for every wait.
- Do not hide important financial context.
- Do not show fake APY or estimates.
- Do not imply guaranteed outcomes.
- Do not imply custody or automatic execution.
- Do not scare users with vague errors.
- Do not ignore partial success.
- Do not let missing icons break rows/cards.

---

## Done Criteria

This pattern is implemented correctly when:

- Empty states explain what is missing.
- Loading states follow delay rules.
- Smith AI animation is used only for approved waits.
- Fast updates do not show loading.
- Partial data appears instead of full failure when possible.
- Stale data is labeled.
- Demo data is clearly labeled.
- Disconnected wallet states are clear.
- Unsupported assets/protocols are handled safely.
- Missing token icons use fallback token icon.
- Missing wallet/protocol icons do not break UI.
- Errors are calm and recoverable.
- Retry is available when supported.
- Dashboard and Portfolio remain usable during section failures.
- No state invents financial data.
- Accessibility behavior is implemented.

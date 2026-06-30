# Suggestion Flow

This pattern defines how WealthSmith generates, loads, ranks, displays, explains, and opens suggestions.

Suggestions are the main WealthSmith value moment after onboarding.

They turn the user’s wallet, portfolio, goal, risk profile, safety buffer, and contribution plan into clear next actions.

---

## Purpose

The suggestion flow should help users understand:

- What WealthSmith thinks they should consider next
- Why the action is relevant
- Which action is most important
- Which protocol/platform is involved
- Whether the suggestion is urgent, locked, informational, or yield-related
- That no action happens automatically

Suggestions must be deterministic, explainable, and non-custodial.

---

## Core Product Rule

WealthSmith has three distinct layers:

```text
Suggestion Engine = deterministic Brain
Protocol Logic = where the action should happen
Top Pick Logic = selects exactly one highest-priority suggestion
Smith AI = explanatory Voice
UI = Renderer
```

The UI does not invent suggestions.

Smith AI does not invent suggestions.

Suggestion cards render structured outputs from the Suggestion Engine, Protocol Logic, and Top Pick Logic.

---

## When to Use

Use this pattern when:

- Onboarding is complete.
- Demo Mode generates sample suggestions.
- Wallet data and plan data are available.
- The user opens the Dashboard after setup.
- The user clicks `Ask Smith AI`.
- Suggestion results refresh after meaningful plan or portfolio changes.

Do not use this pattern for:

- Wallet connection loading
- Generic portfolio refresh
- Static educational content
- Transaction execution
- Swap/buy/sell confirmation
- Support chat

---

## Primary Layout

On desktop and wide screens, suggestions appear in a right-side rail.

```text
Left side:
  Dashboard content
  Alert / recommendation banner
  Financial Snapshot
  Safety Buffer
  Projected Growth

Right side:
  Smith AI Suggestions
  Suggestion cards
```

Example header:

```text
Smith AI Suggestions
Personalized based on your plan
```

Alternative header for insight-focused state:

```text
Smith AI Strategy Insights
Aligned with your Medium-risk profile
```

Rules:

- Right rail remains visually connected to Smith AI.
- Suggestions should be scannable.
- Dashboard should remain usable.
- Suggestion rail should not block the Dashboard.
- Cards should be stacked vertically.
- Exactly one card may be marked Top Pick.
- Demo Mode banner appears above the app content when active.

---

## Mobile and Tablet Behavior

On mobile/tablet:

- Suggestions may appear as a bottom sheet, drawer, stacked section, or full-width rail.
- Top Pick should appear first.
- The alert/recommendation banner should remain visible near the top of Dashboard.
- Avoid horizontal scrolling.
- Card tap targets must be comfortable.
- The user should not need hover interactions to understand the cards.
- Opening a protocol page should still open a new browser tab/window when supported.

---

## Components Used

Primary components:

```text
components/suggestion-card.md
components/card.md
components/badge.md
components/button.md
components/alert.md
components/announcement.md
components/loading-indicator.md
components/toast.md
components/chart.md
components/progress-bar.md
components/icon.md
```

Dashboard components:

```text
components/metric-card.md
components/portfolio-card.md
components/chart.md
components/page-header.md
```

Assets:

```text
assets/icons/protocol/
assets/icons/token/
assets/icons/fallback/fallback-token.svg
assets/icons/ui/sparkle.svg
assets/icons/ui/shield.svg
assets/icons/ui/shield-check.svg
assets/icons/ui/trending-up.svg
assets/animations/smith-ai-symbol-loop.json
```

---

## Suggestion Types

MVP suggestions may include:

```text
fund_safety_buffer
stake_sol
provide_liquidity
auto_compound
supply_usdc
swap_to_stables
deposit_rwa_yield
rebalance
goal_check
expense_benchmark
safety_buffer_status
strategy_posture
locked_opportunity
```

Suggestion type controls:

- Copy template
- Card layout
- Badge
- Icon
- Protocol target
- Click behavior
- Priority ranking
- Whether it can be Top Pick
- Whether it opens a protocol page

---

## Suggestion Rail Variants

### Actionable Suggestions

Used when WealthSmith has specific next actions.

Example:

```text
Smith AI Suggestions
Personalized based on your plan
```

Cards may include:

```text
Stake SOL on Marinade
Provide Liquidity on Raydium
Auto-Compound BONK on Orca
Supply USDC on Kamino
Swap BONK to USDC on Jupiter
Deposit USDC into Ondo USY
```

### Strategy Insights

Used when the suggestions are explanatory or diagnostic rather than direct protocol actions.

Example:

```text
Smith AI Strategy Insights
Aligned with your Medium-risk profile
```

Cards may include:

```text
Goal Check: Retire Early?
Expense Benchmark
Safety Buffer: 100% Funded
Strategy: Defensive
```

Rules:

- Strategy Insights can be non-protocol cards.
- Actionable Suggestions can open protocol pages.
- Do not force every insight to have protocol click-through.
- Do not label an informational insight as a yield opportunity unless product logic says so.

---

## Top Pick Rules

Exactly one suggestion may be marked:

```text
Top Pick
```

Rules:

- Top Pick is selected by Top Pick Logic.
- UI must not choose Top Pick.
- Smith AI must not choose Top Pick.
- Top Pick should appear first in the suggestion rail.
- Top Pick card receives stronger visual emphasis.
- Top Pick badge appears only on one card.
- Locked suggestions cannot be Top Pick unless the product explicitly supports locked Top Pick states.
- Informational insights should not be Top Pick unless Top Pick Logic explicitly returns them as such.

Top Pick is required when actionable suggestions are shown.

If no actionable suggestions exist, the UI may show Strategy Insights without Top Pick.

---

## Safety Buffer Priority

Safety Buffer has priority over yield-seeking suggestions.

When the user’s Safety Buffer is underfunded, the primary suggestion should focus on funding the buffer before additional volatile deployment.

Example Dashboard alert:

```text
Action Required: Fund Your Safety Buffer
Your portfolio is 34% overexposed to volatile assets while your Safety Buffer is underfunded by $7,000.
Swap BONK to USDC now to secure 3 months of protection.
```

Example Top Pick card:

```text
Fund Your Safety Buffer
You are $7,000 short of your 3-month safety goal.
Trimming overweight BONK is the fastest way to secure your plan.
Critical
```

Rules:

- Safety Buffer override comes from product logic.
- If buffer is underfunded, risky/yield suggestions may be deprioritized or locked.
- Yield opportunities may show locked state, such as `Unlock after Buffer is Full`.
- Critical badge should be used only when product logic classifies the suggestion as critical.
- Do not recommend additional volatile deployment before buffer priority is satisfied.

---

## Locked Suggestions

Some suggestions may be visible but unavailable.

Example:

```text
Yield Opportunities
Once your buffer reaches 100%, these 18% APY vault on Orca become available to optimize your surplus.

Unlock after Buffer is Full
```

Rules:

- Locked suggestions must clearly explain why they are locked.
- Locked suggestions should not look like active recommendations.
- Locked suggestions should not open protocol pages unless the click opens an explanation page.
- Locked suggestions should not be Top Pick unless product logic explicitly supports that case.
- Locked suggestions should not imply the user can take the action now.

---

## Dashboard Alert Sync

When there is a primary recommendation, the Dashboard may show a matching alert/banner.

Example:

```text
Rebalance Recommendation
You are 15% overexposed to volatile assets.
Swap SOL to USDC to realign with your Medium risk profile.
```

Example:

```text
Action Required: Fund Your Safety Buffer
Your portfolio is 34% overexposed to volatile assets while your Safety Buffer is underfunded by $7,000.
Swap BONK to USDC now to secure 3 months of protection.
```

Rules:

- Dashboard alert should sync with Top Pick or highest-priority issue.
- Alert copy must come from structured suggestion output or approved templates.
- Alert can be dismissed if product allows.
- Dismissing alert does not remove the underlying suggestion.
- Alert should not duplicate every suggestion, only the most important one.
- Alert should not claim execution.
- Alert should not create a new suggestion separate from the Suggestion Engine.

---

## Demo Mode Behavior

Demo Mode can show suggestions using sample data.

Demo Mode banner:

```text
You’re in demo mode.
Exit Demo
```

Rules:

- Demo Mode must be clearly visible.
- Suggestions are based on sample portfolio and sample plan data.
- Demo Mode suggestions must not imply real wallet analysis.
- Demo Mode can include Top Pick, locked suggestions, and critical states.
- Exiting Demo should clear or replace demo suggestions with real user data when available.
- Do not mix demo and real suggestions in the same rail.

---

## Loading Behavior

Loading should appear only when suggestion generation takes noticeable time.

Do not show loading UI for instant or near-instant updates.

Recommended timing:

```text
0–400ms:
  No loading state.
  Show results directly.

400–800ms:
  Avoid full loading UI.
  Use subtle pending state only if needed.

800ms+:
  Show explicit loading state.

1.5s+:
  Show full Smith AI loading card with copy.
```

Minimum visible time when full loading is shown:

```text
500–700ms
```

Smith AI loading card:

```text
Building Your Suggestions...
We are checking your plan and wallet balance to find the best next actions.
No action will be taken automatically.
```

Rules:

- Delay before showing loading.
- Do not flash loading states.
- If suggestions are ready quickly, skip loading.
- Use Smith AI animation only for meaningful suggestion-building waits.
- Do not use Smith AI animation for generic loading.
- Respect reduced motion.
- Static fallback is `assets/logo/wealthsmith-symbol.svg`.
- Dashboard should remain visible while suggestions load.

---

## Suggestion Card Structure

Actionable suggestion cards should include:

```text
Protocol or category icon
Title
Short explanation
Badge or value pill
Top Pick badge if applicable
Optional APY / estimated annual value
Optional severity / locked state
Click target
```

Example:

```text
Stake SOL on Marinade
Secure passive income on your idle SOL without locking it up.
↗ +$170/year (6.7% APY)
Top Pick
```

Example:

```text
Supply USDC on Kamino
Earn safe, low-risk yield on your safety buffer while keeping funds accessible.
↗ +$102/year (4.2% APY)
```

Rules:

- Title should be action-oriented.
- Explanation should be short.
- Yield/value pill must come from product logic.
- APY must come from protocol/yield data source.
- Estimated yearly value must come from product logic.
- If APY is unavailable, do not invent it.
- If estimated earnings are unavailable, hide the estimate or show approved unavailable state.
- Do not use overly promotional language.

---

## Strategy Insight Card Structure

Strategy insight cards may include:

```text
Icon
Title
Explanation
Status badge if relevant
```

Examples:

```text
Goal Check: Retire Early?
Your portfolio is currently optimized for your 5-year horizon. If your timeline has changed, we should recalibrate your risk level.
```

```text
Expense Benchmark
Your plan assumes $3,000/mo in expenses. Is this still accurate, or has your cost of living shifted?
```

```text
Safety Buffer: 100% Funded
You have 3 months of expenses secured in USDC. This protects your growth assets from market volatility.
Protected
```

```text
Strategy: Defensive
Market conditions are currently in "Greed." We are holding 40% in stables to preserve gains and wait for better entry points.
```

Rules:

- Strategy insights may ask the user to review assumptions.
- Strategy insights should not imply action was taken.
- Strategy insights should not invent market regime unless product logic supplies it.
- Strategy insights may link to Goal or Portfolio if relevant.
- Strategy insights do not need protocol click-through.

---

## MVP Click Behavior

For MVP, actionable protocol suggestion cards open the relevant protocol page in a new tab.

Examples:

```text
Stake SOL on Marinade -> open Marinade protocol page
Provide Liquidity on Raydium -> open Raydium protocol page
Auto-Compound BONK on Orca -> open Orca protocol page
Supply USDC on Kamino -> open Kamino protocol page
Swap BONK to USDC on Jupiter -> open Jupiter protocol page
Deposit USDC into Ondo USY -> open Ondo protocol page
```

Rules:

- Open protocol page in a new tab.
- Use `target="_blank"` behavior.
- Use `rel="noopener noreferrer"` behavior.
- Show or expose that the action opens a new tab.
- Do not execute a transaction from the suggestion card.
- Do not prefill a transaction unless product explicitly supports it.
- Do not request wallet signature from the suggestion card click.
- Do not imply WealthSmith performs the action automatically.
- Card click is a handoff, not execution.
- The protocol URL must come from approved protocol metadata, not hardcoded inside the component.

Accessible label example:

```text
Open Marinade protocol page in a new tab
```

---

## Protocol URL Source

Protocol click targets must come from protocol/platform metadata.

Example structure:

```json
{
  "protocol": {
    "id": "marinade",
    "name": "Marinade",
    "icon": "assets/icons/protocol/marinade.svg",
    "url": "approved_protocol_url",
    "supported_actions": ["stake_sol"]
  }
}
```

Rules:

- Do not invent protocol URLs in UI code.
- Do not use user-provided URLs.
- Do not build URLs from display names.
- Validate URLs before release.
- If protocol URL is missing, disable click-through and show safe fallback.
- Missing URL is an implementation issue.

---

## Supported MVP Protocols in Suggestions

Suggestion cards may reference approved protocols/platforms:

```text
Jupiter
Kamino
Marinade
Orca
Raydium
Jito
Ondo
Hubble
Meteora
Sanctum
```

Rules:

- Protocol icon must come from `assets/icons/protocol/`.
- Protocol name must be visible.
- Protocol icon alone is not enough.
- Protocol presence does not mean WealthSmith endorses the protocol.
- Protocol choice must come from Protocol Decision Logic.

---

## Value and APY Display

Suggestion cards may show:

```text
+$170/year
6.7% APY
Risk Reduction
Critical
Protected
Unlock after Buffer is Full
```

Rules:

- APY must be current enough for product requirements.
- APY must come from approved protocol/yield source.
- Estimated yearly value must be computed by product logic.
- Do not show APY if stale or unavailable.
- Use estimated language where needed.
- Do not imply guaranteed yield.
- Do not imply principal is protected unless product logic and source support it.
- Labels like `safe` should be used carefully and only in product-approved copy.

Preferred copy:

```text
Estimated
Modeled
APY
Potential yearly yield
```

Avoid:

```text
Guaranteed
Risk-free
Safe profit
Earn for sure
```

---

## Badges

Common badges:

```text
Top Pick
Critical
Protected
Risk Reduction
Unlock after Buffer is Full
APY
+$ / year
```

Rules:

- Badge state comes from structured suggestion data.
- Top Pick is unique.
- Critical should be rare and tied to safety or risk issue.
- Protected should reflect Safety Buffer or defensive status, not general safety.
- APY/value badges should not imply guaranteed return.
- Locked badge should clearly state the unlock condition.

---

## Ranking Behavior

Suggestions should be sorted by deterministic priority.

Suggested priority order:

```text
1. Critical safety issues
2. Safety Buffer funding
3. Risk reduction / rebalance
4. Goal-alignment checks
5. Stablecoin yield / low-volatility yield
6. Core staking
7. Liquidity provision
8. Auto-compound / higher-risk yield
9. Locked future opportunities
10. Informational insights
```

Rules:

- Exact ranking must come from Suggestion Engine and Top Pick Logic.
- UI should render the provided order.
- Do not sort by APY alone.
- Do not sort by protocol brand.
- Do not sort by card visual prominence.
- Do not move locked opportunities above active safety requirements.

---

## Dismiss Behavior

Dashboard alert may be dismissible.

Suggestion cards may or may not be dismissible depending on product scope.

Rules:

- Dismissing an alert does not dismiss the underlying suggestion.
- Dismissing a suggestion should be stored if supported.
- Dismissed suggestions should not immediately reappear unless underlying data changes meaningfully.
- Do not dismiss Top Pick permanently without a clear product rule.
- Do not hide critical safety suggestions without an alternate way to recover them.

---

## Ask Smith AI Behavior

The `Ask Smith AI` button opens Smith AI assistance.

Rules:

- Ask Smith AI can explain existing suggestions.
- Ask Smith AI can answer questions about why a suggestion appears.
- Ask Smith AI should reference structured suggestion data.
- Ask Smith AI must not create new deterministic suggestions outside Suggestion Engine.
- Ask Smith AI must not change Top Pick unless product logic updates.
- Ask Smith AI must not execute actions.

Example allowed prompts:

```text
Why is this Top Pick?
Why is my buffer underfunded?
What does APY mean here?
Why is this locked?
```

---

## Empty State

If no suggestions are available:

```text
No suggestions yet
Complete your plan or connect a wallet to generate personalized suggestions.
```

Rules:

- Explain what is missing.
- Provide one clear next action.
- Do not show fake suggestions.
- Do not show Top Pick.
- Do not show protocol cards without data.

---

## Partial Data State

If only some data is available:

```text
Some suggestions are ready
Connect a wallet or finish your goal setup to unlock the full recommendation set.
```

Rules:

- Show only suggestions supported by available data.
- Clearly label missing prerequisites.
- Do not overstate personalization.
- Do not mix unverified values with confirmed values.

---

## Error State

If suggestions fail to load:

```text
I couldn’t build suggestions right now.
Your dashboard is still available. Try again in a moment.
```

Rules:

- Do not blame the user.
- Keep dashboard usable.
- Allow retry.
- Preserve existing suggestions if safe and clearly marked as previously generated.
- Do not show stale suggestions as fresh.

---

## Accessibility

Rules:

- Suggestion rail needs a semantic heading.
- Suggestion cards should be keyboard focusable if clickable.
- Clickable cards must have clear accessible labels.
- New-tab behavior should be announced.
- Badges should be text, not color-only.
- APY/value pills should be readable by assistive technology.
- Top Pick must be exposed as text.
- Loading region should use `role="status"` or `aria-live="polite"`.
- Do not rely on hover only.
- Do not rely on icon only.
- Respect reduced motion.

Example clickable card label:

```text
Open Marinade protocol page in a new tab. Top Pick suggestion: Stake SOL on Marinade.
```

---

## Data Contract

Suggested structured object:

```json
{
  "id": "stake-sol-marinade",
  "type": "stake_sol",
  "title": "Stake SOL on Marinade",
  "description": "Secure passive income on your idle SOL without locking it up.",
  "protocol": {
    "id": "marinade",
    "name": "Marinade",
    "icon": "assets/icons/protocol/marinade.svg",
    "url_ref": "protocols.marinade.url"
  },
  "asset": {
    "symbol": "SOL",
    "icon": "assets/icons/token/sol.svg"
  },
  "status": "active",
  "priority": 1,
  "is_top_pick": true,
  "badges": ["top_pick"],
  "metrics": {
    "estimated_yearly_value": 170,
    "apy": 0.067
  },
  "click_behavior": {
    "type": "open_new_tab",
    "target": "protocol_page"
  }
}
```

Locked example:

```json
{
  "id": "orca-yield-locked",
  "type": "locked_opportunity",
  "title": "Yield Opportunities",
  "description": "Once your buffer reaches 100%, these APY vaults become available to optimize your surplus.",
  "status": "locked",
  "badges": ["unlock_after_buffer_full"],
  "unlock_condition": "safety_buffer_100_percent"
}
```

Insight example:

```json
{
  "id": "safety-buffer-funded",
  "type": "safety_buffer_status",
  "title": "Safety Buffer: 100% Funded",
  "description": "You have 3 months of expenses secured in USDC. This protects your growth assets from market volatility.",
  "status": "informational",
  "badges": ["protected"],
  "click_behavior": {
    "type": "none"
  }
}
```

---

## Claude Code Rules

Claude Code should:

- Render suggestion data from structured objects.
- Preserve server/product-provided order.
- Display exactly one Top Pick when actionable suggestions exist.
- Use the protocol icon from approved assets.
- Use visible protocol names.
- Use approved badges.
- Open actionable protocol suggestions in a new tab for MVP.
- Use `rel="noopener noreferrer"` for new tabs.
- Announce new-tab behavior accessibly.
- Use loading delay rules.
- Skip loading if results are ready quickly.
- Keep Dashboard usable while suggestions load.
- Respect Demo Mode.
- Respect Safety Buffer priority.
- Respect locked states.
- Preserve reduced-motion behavior.

Claude Code must not:

- Invent suggestions.
- Invent Top Pick.
- Invent APY.
- Invent estimated yearly value.
- Invent protocol URLs.
- Execute transactions from card clicks.
- Ask for wallet signature from card clicks.
- Open unapproved URLs.
- Sort suggestions by APY alone.
- Hide critical safety suggestions without product rule.
- Use Smith AI animation for generic loading.
- Mix demo and real suggestions.
- Use protocol icon alone as identity.
- Use hype or guarantee language.

---

## Do

- Show suggestions in a clear right-side rail on desktop.
- Show Top Pick first.
- Show exactly one Top Pick.
- Sync dashboard alert with primary recommendation.
- Show Safety Buffer priority when relevant.
- Lock yield opportunities until prerequisites are met.
- Make actionable protocol cards clickable.
- Open protocol pages in a new tab for MVP.
- Keep copy calm and specific.
- Use estimated language for yield.
- Show no loading when results are ready quickly.

---

## Do Not

- Do not make suggestion cards execute actions.
- Do not imply funds will move automatically.
- Do not imply guaranteed returns.
- Do not make every card Top Pick.
- Do not make locked opportunities look active.
- Do not show fake loading for fast results.
- Do not use generic spinners for suggestion-building.
- Do not use stale APY without marking it.
- Do not hide the Dashboard while suggestions load.
- Do not create suggestions from UI state alone.

---

## Done Criteria

This pattern is implemented correctly when:

- Suggestions appear after onboarding or meaningful refresh.
- Suggestion results come from structured product logic.
- Top Pick appears exactly once.
- Safety Buffer override affects ranking and locking.
- Dashboard alert matches the highest-priority recommendation.
- Demo Mode suggestions are clearly labeled as demo.
- Actionable protocol cards open protocol pages in new tabs.
- No transactions execute from card clicks.
- No wallet signature is requested from card clicks.
- Loading appears only for meaningful waits.
- Fast suggestion results skip loading.
- Reduced motion is respected.
- Cards are accessible and keyboard usable.
- Copy avoids guarantees, hype, and custody implications.

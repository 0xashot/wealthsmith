# Suggestion Engine Rules

This rule file defines how WealthSmith suggestions are created, structured, ranked, refreshed, rendered, and explained.

The Suggestion Engine is the deterministic source of truth for WealthSmith recommendations.

UI components and Smith AI must not generate suggestions.

---

## Purpose

WealthSmith suggestions should be:

- Deterministic
- Explainable
- Structured
- Prioritized
- Safe
- User-context-aware
- Easy to render
- Easy for Smith AI to explain
- Auditable by product and engineering

Suggestions help users understand what they may do next without implying automatic execution.

---

## Core Hard Rules

Hard Rule:

```text
Suggestions must come from the Suggestion Engine.
```

Hard Rule:

```text
The UI must not generate suggestions.
Smith AI must not generate suggestions.
Claude Code must not generate suggestions outside approved deterministic product logic.
```

Suggestion cards render structured Suggestion Engine output.

Smith AI explains structured Suggestion Engine output.

---

## Layer Responsibilities

```text
Suggestion Engine:
  Decides what recommendation exists.

Top Pick Logic:
  Decides which actionable suggestion is Top Pick.

Protocol Logic:
  Decides where the user should go for a protocol-backed action.

Smith AI:
  Explains why a suggestion exists.

UI:
  Renders suggestion data.
```

Hard Rule:

```text
Do not merge these responsibilities into a single UI component or freeform AI response.
```

---

## What Is a Suggestion?

A suggestion is a structured recommendation or insight produced by deterministic product logic.

A suggestion may be:

```text
Actionable
Informational
Locked
Critical
Safety-related
Risk-related
Yield-related
Rebalance-related
Goal-related
Portfolio-health-related
```

A suggestion is not:

```text
Freeform Smith AI text
A generic FAQ answer
A hardcoded card
A visual badge
A protocol logo
A user prompt
A chart annotation
```

---

## Suggestion Types

MVP suggestion types may include:

```text
fund_safety_buffer
reduce_volatile_exposure
rebalance_to_plan
deploy_idle_stablecoins
stake_idle_sol
review_yield_strategy
unlock_after_buffer
protect_goal_progress
review_contribution_plan
strategy_insight
```

Rules:

- Suggestion types must use stable IDs.
- Display copy may change, but type IDs should remain stable.
- New suggestion types require product approval.
- UI must not invent new suggestion types.
- Smith AI must not invent new suggestion types.

---

## Suggestion Categories

Recommended categories:

```text
safety_buffer
risk_alignment
allocation
yield_opportunity
staked_assets
goal_progress
contribution_plan
portfolio_health
education
```

Rules:

- Category helps organize suggestion display and explanation.
- Category does not replace priority.
- Category does not decide Top Pick by itself.
- Category must be provided by Suggestion Engine.

---

## Actionability

Suggestions must declare actionability.

Allowed values:

```text
actionable
informational
locked
blocked
```

### Actionable

Means the user can take a next step.

Rules:

- Must have clear action type.
- May have protocol destination if protocol-backed.
- May be eligible for Top Pick.
- MVP action opens protocol page in a new tab.
- MVP action does not execute a transaction.
- MVP action does not request a wallet signature.

### Informational

Means the suggestion explains a condition or insight.

Rules:

- Should not be shown as executable.
- Should not receive protocol handoff unless explicitly actionable.
- Usually not eligible for Top Pick.

### Locked

Means the suggestion may become available later when requirements are met.

Rules:

- Must clearly explain why locked.
- Must clearly explain unlock condition.
- Should not be Top Pick.
- Should not show primary execution CTA.
- Must not imply the action is currently recommended.

### Blocked

Means the suggestion cannot be shown/actioned due to missing data or unsupported condition.

Rules:

- Should not be Top Pick.
- Should not imply action is available.
- Should show recovery path when possible.

---

## Priority

The Suggestion Engine must provide priority.

Priority may be represented as:

```text
priority_score
priority_rank
severity
sort_order
```

Recommended structured fields:

```json
{
  "priority_score": 100,
  "priority_rank": 1,
  "severity": "critical",
  "sort_order": 1
}
```

Rules:

- UI may render suggestions in provided order.
- UI must not create ranking from visual labels.
- UI must not sort actionable suggestions differently unless product logic explicitly allows it.
- Smith AI must not reorder suggestions.
- Top Pick must be determined by Top Pick Logic, not UI sorting.

---

## Severity

Allowed severity values:

```text
critical
high
medium
low
info
```

Rules:

- Severity comes from Suggestion Engine.
- Severity can influence visual treatment.
- Severity alone does not automatically decide Top Pick.
- Critical suggestions should be visually clear but not alarming.
- Copy should remain calm.

Good:

```text
Action Required: Fund Your Safety Buffer
```

Avoid:

```text
Emergency
Danger
Your funds are unsafe
```

---

## Safety Buffer Priority

Safety Buffer is a special priority domain.

Hard Rule:

```text
If the Safety Buffer is underfunded and product logic marks it as required, Safety Buffer suggestions must take priority over additional volatile or yield deployment suggestions.
```

Rules:

- Underfunded buffer may lock yield suggestions.
- Underfunded buffer may suppress or deprioritize riskier suggestions.
- Safety Buffer suggestion may become Top Pick through Top Pick Logic.
- Locked yield suggestions should explain that buffer funding comes first.
- UI must not override Safety Buffer priority.

Example locked copy:

```text
Unlock after your Safety Buffer is fully funded.
```

---

## Locked Suggestions

Locked suggestions help users understand future opportunities without encouraging premature action.

Locked suggestion fields:

```json
{
  "status": "locked",
  "locked_reason": "safety_buffer_underfunded",
  "unlock_condition": "Fund your Safety Buffer to 100%."
}
```

Rules:

- Locked suggestions must be visually distinct from actionable suggestions.
- Locked suggestions must explain why they are locked.
- Locked suggestions must explain what unlocks them.
- Locked suggestions are not Top Pick.
- Locked suggestions should not show primary execution CTA.
- Locked suggestions may show educational details if helpful.
- Locked suggestions must not imply the action is currently recommended.

---

## Suggestion Status

Allowed statuses:

```text
active
locked
dismissed
completed
expired
stale
blocked
error
```

Rules:

- Status comes from product logic.
- UI renders status.
- UI must not change status except through approved user action and state update.
- Smith AI must not change status.
- Completed suggestions should not remain actionable.
- Expired/stale suggestions should not be shown as current recommendations.
- Error suggestions should not display invented fallback recommendations.

---

## Top Pick Relationship

Top Pick is handled by Top Pick Logic, but suggestions must support it.

Suggestion field:

```json
{
  "is_top_pick": true
}
```

Hard Rule:

```text
UI must render Top Pick only from `is_top_pick`.
```

Rules:

- Exactly one actionable suggestion may be Top Pick when actionable suggestions exist.
- Locked suggestions cannot be Top Pick.
- Informational suggestions generally should not be Top Pick.
- If no actionable suggestions exist, there may be no Top Pick.
- Dashboard alert may sync to Top Pick when product data provides it.
- UI must not assign Top Pick to the first card by default.

See:

```text
rules/top-pick-rules.md
```

---

## Protocol Relationship

Actionable suggestions may include protocol destination metadata.

Example:

```json
{
  "destination_protocol_id": "jupiter",
  "destination_url": "approved_metadata_url",
  "handoff_type": "external_new_tab"
}
```

Rules:

- Protocol Logic provides destination protocol.
- UI does not choose protocol.
- UI does not guess protocol URLs.
- MVP opens approved protocol URL in a new tab.
- MVP does not execute transactions.
- MVP does not request signatures from suggestion card clicks.

See:

```text
rules/protocol-selection-rules.md
rules/wallet-and-custody-rules.md
```

---

## Suggestion Data Contract

Recommended base suggestion schema:

```json
{
  "suggestion_id": "fund_safety_buffer_usdc",
  "type": "fund_safety_buffer",
  "category": "safety_buffer",
  "status": "active",
  "actionability": "actionable",
  "severity": "critical",
  "priority_score": 100,
  "priority_rank": 1,
  "sort_order": 1,
  "is_top_pick": true,
  "title": "Fund your Safety Buffer",
  "summary": "Your Safety Buffer is below your target.",
  "reason_codes": ["safety_buffer_underfunded"],
  "explanation": "Your current stablecoin reserve covers less than your target months of expenses.",
  "action": {
    "type": "swap_to_stablecoin",
    "source_token": "BONK",
    "destination_token": "USDC",
    "amount": {
      "value": 7000,
      "currency": "USD",
      "display": "$7,000"
    }
  },
  "protocol": {
    "destination_protocol_id": "jupiter",
    "destination_label": "Jupiter",
    "handoff_type": "external_new_tab",
    "url_source": "approved_protocol_metadata"
  },
  "copy_key": "suggestion.fund_safety_buffer.critical"
}
```

Rules:

- IDs should be stable.
- Copy can use templates, but values must come from structured fields.
- Reason codes should be machine-readable.
- UI should not parse freeform explanation to derive logic.
- Missing required fields should create safe fallback state, not invented copy.

---

## Required Fields

Minimum required fields for renderable suggestion:

```text
suggestion_id
type
category
status
actionability
severity
priority_rank or sort_order
title
summary or explanation
reason_codes
is_top_pick
```

Required for actionable protocol-backed suggestion:

```text
action.type
protocol.destination_protocol_id
protocol.handoff_type
protocol.url_source or approved URL metadata reference
```

Required for locked suggestion:

```text
locked_reason
unlock_condition
```

Required for APY/yield suggestion:

```text
apy_value or apy_display
apy_source
apy_timestamp or freshness status
risk/disclaimer copy key
```

Rules:

- If required fields are missing, show safe error/partial state.
- Do not invent missing fields.
- Do not show a protocol-backed CTA without approved destination metadata.
- Do not show APY without source.

---

## Reason Codes

Reason codes make suggestions explainable.

Examples:

```text
safety_buffer_underfunded
volatile_exposure_above_target
stablecoin_reserve_available
idle_sol_available
goal_timeline_short
risk_profile_medium
apy_data_available
protocol_position_detected
yield_opportunity_locked
```

Rules:

- Reason codes come from Suggestion Engine.
- Smith AI may use reason codes to explain suggestions.
- UI may display mapped copy from reason codes.
- UI must not create new reason codes.
- Freeform explanation should not be the only source of reasoning.

---

## Copy Source

Suggestion copy should come from structured templates and approved content systems.

Allowed:

```text
Template copy with structured variables
Canonical suggestion copy
Suggestion card copy system
Smith AI explanation using structured context
```

Not allowed:

```text
Frontend-generated financial advice
Freeform AI-generated card titles as source of truth
Hardcoded one-off recommendation copy
Copy that changes the recommendation meaning
```

Rules:

- Suggestion Engine returns reason/action data.
- Copy system maps data to human-readable language.
- UI renders the final approved copy or template output.
- Smith AI may explain, but not replace card copy.

---

## Suggestion Card Rendering

Suggestion cards may render:

```text
Top Pick badge
Severity badge
Category label
Title
Summary
Reason
Suggested action
Estimated impact
Locked reason
Unlock condition
Protocol destination
CTA label
```

Rules:

- Card layout comes from `components/suggestion-card.md`.
- Card content comes from structured suggestion data.
- Card click behavior follows protocol handoff rules.
- Card must not execute transactions in MVP.
- Card must not request wallet signature in MVP.
- Card must not invent missing values.
- Card must not hide critical warnings.

---

## Suggestion Ordering

Suggestion ordering comes from product logic.

Recommended order rules:

```text
1. Top Pick first when present.
2. Critical actionable suggestions before lower priority suggestions.
3. Locked suggestions after actionable suggestions unless product logic says otherwise.
4. Informational insights after actionable suggestions unless in Strategy Insights mode.
```

Hard Rule:

```text
UI must not create its own financial ranking.
```

Allowed UI behavior:

```text
Render suggestions by provided `sort_order`.
Group locked suggestions under a locked section if product data supports it.
```

Not allowed:

```text
Sort by title alphabetically.
Sort by APY highest first unless product logic says so.
Promote yield above Safety Buffer because yield is visually appealing.
```

---

## Suggestion Refresh

Suggestions may refresh when relevant state changes.

Refresh triggers may include:

```text
Wallet connected
Wallet disconnected
Wallet balances updated
Protocol positions updated
Price data updated
Goal settings saved
Risk tolerance changed
Income/expenses changed
Monthly Saving Goal changed
Contribution frequency changed
Timeline changed
Demo Mode entered
Demo Mode exited
User dismisses/completes a suggestion
```

Rules:

- Refresh should use deterministic product logic.
- UI should not patch suggestions locally after meaningful state changes.
- Stale suggestions should be marked stale or refreshed.
- Do not show old real-wallet suggestions after disconnect.
- Do not carry demo suggestions into real-wallet mode.
- Loading should follow global loading rules.

---

## Suggestion Loading

Use loading only when generation takes meaningful time.

Rules:

```text
0–400ms:
  No loading.

400–800ms:
  Subtle pending if needed.

800ms+:
  Explicit loading state.

1.5s+:
  Full explanatory loading if useful.
```

Allowed Smith AI animation use:

```text
Building suggestions
Generating strategy insights
Preparing suggestion context
Loading Smith AI explanation
```

Not allowed Smith AI animation use:

```text
Wallet connection
Contact form submission
Generic table loading
Generic chart loading
Global nav loading
```

---

## Empty Suggestion State

Use when no suggestions are available.

Examples:

```text
No suggestions yet
Complete your plan or connect a wallet to generate personalized suggestions.
```

```text
No action needed right now
Your plan is currently aligned with WealthSmith’s rules.
```

Rules:

- Empty state must explain why suggestions are missing.
- Empty state should provide one clear next action if applicable.
- Do not invent low-quality suggestions just to fill the rail.
- Do not show Top Pick when no actionable suggestions exist.
- Do not hide the rail without explanation if the user expects suggestions.

---

## Error Suggestion State

Use when suggestions cannot be generated or loaded.

Example:

```text
We couldn’t load suggestions right now.
Your dashboard is still available. Try again in a moment.
```

Rules:

- Keep Dashboard usable.
- Do not show stale suggestions as current unless marked stale.
- Do not invent fallback recommendations.
- Provide retry if product supports it.
- Keep copy calm.
- Do not imply funds are affected.

---

## Stale Suggestion State

A suggestion is stale when it may no longer reflect current wallet/goal/protocol state.

Possible stale triggers:

```text
Wallet data changed
Price data changed
Goal settings changed
Protocol data expired
APY data expired
User completed related action externally
```

Rules:

- Stale suggestions should be refreshed or marked stale.
- Stale suggestions should not be Top Pick.
- Stale protocol handoffs should be disabled if destination/action may be inaccurate.
- UI must not silently keep stale suggestions as active recommendations.

---

## Dismissed Suggestions

If product supports dismissing suggestions:

Rules:

- Dismissal should be explicit.
- Dismissal should not delete underlying financial condition.
- Critical Safety Buffer suggestions may reappear if condition remains critical.
- Dismissed state should be stored by suggestion ID and context.
- Dismissal should not affect deterministic logic unless product defines it.
- Smith AI should not dismiss suggestions without user confirmation.

---

## Completed Suggestions

A suggestion is completed when the underlying condition is resolved.

Rules:

- Completion should be based on updated product/wallet/protocol state.
- UI should not mark completion just because a protocol page was opened.
- Opening a protocol page is not completion.
- User clicking a card is not completion.
- Completed suggestions should not remain actionable.
- Completion can trigger suggestion refresh.

Hard Rule:

```text
External protocol handoff does not prove the user completed the action.
```

---

## Demo Mode Suggestions

Demo Mode can show sample suggestions.

Rules:

- Demo suggestions must be clearly based on sample data.
- Demo suggestions must not persist into real wallet mode.
- Demo suggestions may include Top Pick if sample logic provides it.
- Demo suggestions may show locked opportunities.
- Ask Smith AI must refer to demo state as sample/demo.
- Demo suggestions must not imply they are based on the user’s real wallet.

Hard Rule:

```text
Demo suggestions and real-wallet suggestions must stay separate.
```

---

## Smith AI Suggestion Explanation

Smith AI may explain:

```text
Why a suggestion appears
What data triggered it
What the action means
What happens when clicking the card
Why an opportunity is locked
Why Safety Buffer is prioritized
How Top Pick was selected if Top Pick data/reasons are provided
```

Smith AI must not:

```text
Create new suggestions
Override suggestions
Change Top Pick
Choose protocol
Invent APY
Invent estimated earnings
Invent missing amounts
Claim action was completed
Execute a transaction
```

---

## Dashboard Alert Sync

Dashboard alert may reflect the highest-priority active suggestion or Top Pick.

Rules:

- Alert content should come from structured suggestion/Top Pick data.
- Alert must not introduce a separate recommendation.
- Dismissing alert must not remove the underlying suggestion unless product supports that.
- If Top Pick changes, alert should update with product logic.
- If no actionable suggestion exists, alert should not show fake urgency.

---

## Safety and Tone

Use:

```text
Suggested next action
Review
Open protocol
Estimated
Based on your current plan
No action will be taken automatically
```

Avoid:

```text
Guaranteed
Risk-free
Emergency
You must
Perfect strategy
AI found the best investment
Execute now
```

Rules:

- Do not pressure users.
- Do not imply guaranteed returns.
- Do not imply WealthSmith controls funds.
- Do not imply automatic execution.
- Do not hide risk.

---

## Unsupported or Unknown Assets

If an asset is unsupported or unknown:

Rules:

- Do not create unsupported recommendations.
- Do not hide the asset silently if it affects portfolio view.
- Do not classify unknown assets as liquid, staked, or yield strategy without approved logic.
- Suggestions may mention unsupported assets only if product logic supports it.
- Use fallback token icon for missing token icons.
- Missing protocol icon is an implementation issue for MVP.

---

## Validation Checklist

Before rendering suggestions, check:

```text
Does every suggestion have a stable ID?
Does every suggestion have type/category/status/actionability?
Does every actionable suggestion have action metadata?
Does every protocol-backed suggestion have approved protocol metadata?
Does every locked suggestion have locked reason and unlock condition?
Is Top Pick provided by product logic?
Is there at most one Top Pick?
Are stale/expired suggestions handled?
Are APY/earnings sourced?
Are demo and real suggestions separate?
Is card copy based on approved templates or structured data?
Does clicking the card avoid execution/signature in MVP?
```

---

## Claude Code Rules

Claude Code should:

- Render suggestions from structured Suggestion Engine output.
- Preserve suggestion IDs.
- Render cards by provided order/sort order.
- Render Top Pick only from `is_top_pick`.
- Render locked state from suggestion status/actionability.
- Render protocol destination from Protocol Logic metadata.
- Use approved copy templates where provided.
- Use safe empty/loading/error states.
- Keep demo suggestions separate from real suggestions.
- Mark stale suggestions when product state says stale.
- Open approved protocol pages in new tabs for MVP.
- Keep Smith AI explanation grounded in suggestion data.

Claude Code must not:

- Generate suggestions in UI components.
- Invent suggestion types.
- Invent suggestion reasons.
- Invent Top Pick.
- Invent protocol destinations.
- Invent APY.
- Invent estimated earnings.
- Sort suggestions using financial assumptions.
- Promote yield over Safety Buffer.
- Treat card click as completion.
- Execute transactions from suggestions.
- Request wallet signatures from suggestion clicks.
- Turn Smith AI freeform text into suggestion data.
- Carry demo suggestions into real wallet mode.

---

## Do

- Use deterministic Suggestion Engine output.
- Keep suggestion data structured.
- Keep suggestion IDs stable.
- Show exactly one Top Pick when applicable.
- Explain locked suggestions.
- Prioritize Safety Buffer when underfunded.
- Keep suggestion click as protocol handoff for MVP.
- Use calm copy.
- Show empty/error states instead of fake suggestions.
- Let Smith AI explain, not decide.

---

## Do Not

- Do not create suggestions in the frontend.
- Do not create suggestions in Smith AI.
- Do not infer suggestions from screenshots.
- Do not hardcode recommendations.
- Do not show multiple Top Picks.
- Do not show locked suggestions as actionable.
- Do not invent APY or earnings.
- Do not guess protocol URLs.
- Do not imply click executes a transaction.
- Do not imply returns are guaranteed.
- Do not mix demo and real suggestions.

---

## Done Criteria

This rule is followed when:

- Suggestions come only from Suggestion Engine output.
- Suggestion data is structured and stable.
- Suggestion cards render data without inventing logic.
- Top Pick is rendered only from product-provided flag.
- Locked suggestions clearly explain lock reason and unlock condition.
- Safety Buffer priority is respected.
- Protocol destinations come from Protocol Logic.
- Suggestion clicks open approved protocol pages in new tabs for MVP.
- Suggestion clicks do not execute transactions.
- Suggestion clicks do not request wallet signatures.
- APY/earnings values are sourced.
- Demo suggestions are separate from real wallet suggestions.
- Smith AI explains suggestions without creating or changing them.

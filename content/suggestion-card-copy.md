# Suggestion Card Copy

This file defines approved WealthSmith copy rules and templates for suggestion cards.

Suggestion card copy must be deterministic, explainable, and generated from structured Suggestion Engine output.

The frontend must map structured data to approved copy templates.

It must not invent recommendation copy.

---

## Purpose

Suggestion cards help users understand:

```text
What WealthSmith is suggesting
Why the suggestion appears
Whether it is the Top Pick
Whether it is actionable
Whether it is locked or disabled
What impact is estimated
Where the user can review the action
What is not happening automatically
```

Suggestion card copy must be:

```text
Deterministic
Explainable
Consistent
Safety-first
Non-hype
Non-custodial
Mapped from structured data
```

---

## Core Hard Rules

Hard Rule:

```text
Suggestion card copy must come from structured Suggestion Engine output and approved templates.
```

Hard Rule:

```text
The frontend must only map structured data to copy.
It must not infer financial logic.
```

Hard Rule:

```text
Smith AI may explain a suggestion.
It must not change the suggestion copy, numbers, logic, Top Pick, or protocol destination.
```

Hard Rule:

```text
Suggestion card copy must never imply automatic execution, custody, guaranteed returns, or risk-free yield.
```

---

## Source of Truth

Input comes from:

```text
Suggestion Engine
Top Pick Logic
Protocol Logic
Approved copy templates
Approved token/protocol metadata
```

UI output renders:

```text
title
description
tag
impact_text
badge
cta
disabled_reason
is_top_pick
is_actionable
```

The card does not decide these values.

---

## Data Flow

```text
Wallet + Goal/Profile data
        ↓
Suggestion Engine
        ↓
Structured suggestion JSON
        ↓
UI Mapping Layer
        ↓
Suggestion Card copy/templates
        ↓
Optional Smith AI explanation
```

Rules:

- Engine produces logic.
- UI maps logic to structured copy.
- Smith AI explains why when asked.
- AI must not change numbers or logic.
- UI must render suggestions in the order provided by product logic.

---

## Required Input Shape

Suggested input shape:

```ts
type SuggestionType =
  | "buffer"
  | "rebalance"
  | "swap"
  | "stake"
  | "vault"
  | "lp"
  | "dca"
  | "trim";

type SuggestionReason =
  | "buffer_low"
  | "buffer_excess"
  | "crypto_overweight"
  | "crypto_underweight"
  | "token_overweight"
  | "idle_stables"
  | "unstaked_assets"
  | "low_yield"
  | "high_concentration"
  | "illiquid_token"
  | "cost_too_high"
  | "on_track";

type DisabledReason =
  | "cost_too_high"
  | "liquidity_low"
  | "below_min_size"
  | "buffer_required";

interface Suggestion {
  id: string;

  type: SuggestionType;
  reason: SuggestionReason;

  sell_token?: string;
  buy_token?: string;
  token?: string;
  protocol?: string;

  amount_usd?: number;
  delta_percent?: number;
  estimated_apy?: number;
  impact_text?: string;

  impact_score: number;
  urgency_score: number;

  is_actionable: boolean;
  is_top_pick: boolean;

  disabled_reason?: DisabledReason;

  post_buffer_months?: number;

  engine_version: string;
  timestamp: number;
}
```

Rules:

- `type` determines title/action template.
- `reason` determines mandatory reason copy.
- `is_top_pick` determines Top Pick badge.
- `is_actionable` determines CTA availability.
- `disabled_reason` determines disabled copy.
- `impact_text` must come from engine/product logic.
- Frontend must not calculate missing values.

---

## Required UI Output Shape

Suggestion card UI output:

```ts
interface SuggestionCardCopy {
  id: string;

  title: string;
  description: string;

  tag?: string;
  impact_text?: string;

  badge?: string;
  cta?: string;

  is_top_pick: boolean;
  is_actionable: boolean;
  disabled_reason?: DisabledReason;
  disabled_reason_text?: string;
}
```

Rules:

- Output is derived from input + approved templates.
- Output must not introduce new financial meaning.
- Output must not add a reason not present in structured data.
- Output must not modify values.

---

## Title Generation

Titles use strict templates by suggestion type.

Rules:

```text
Always start with an action verb.
Use 6–8 words maximum when possible.
No dynamic storytelling.
No hype.
No guarantees.
No AI authorship.
```

Approved title templates:

```ts
const TITLE_TEMPLATES = {
  buffer: "Top Up Your Safety Buffer",
  rebalance: "Rebalance {sell_token} to {buy_token}",
  swap: "Swap {sell_token} to {buy_token}",
  stake: "Stake {token} on {protocol}",
  vault: "Deposit {token} into {protocol}",
  lp: "Provide Liquidity on {protocol}",
  dca: "Gradually Buy {token}",
  trim: "Reduce Exposure to {token}"
};
```

Protocol omission rule:

```text
If protocol is undefined, omit “on {protocol}”.
```

Examples:

```text
Stake SOL on Jito
Stake SOL
Deposit USDC into Kamino
Deposit USDC
```

Rules:

- Do not invent missing token/protocol values.
- If required title variables are missing, use safe fallback state.
- Do not show unresolved variables.
- Do not use AI-generated custom titles.

---

## Title Fallback Rules

If required variables are missing:

```text
Missing sell_token or buy_token for rebalance/swap:
  Use safe partial title only if product permits, otherwise show card error state.

Missing token for stake/vault/dca/trim:
  Show safe partial title only if product permits, otherwise show card error state.

Missing protocol for stake/vault/lp:
  Omit protocol phrase.
```

Safe partial examples:

```text
Review Rebalance Suggestion
Review Staking Suggestion
Review Yield Suggestion
```

Rules:

- Fallback must not create a new recommendation.
- Fallback should trigger QA/implementation review.
- Fallback must not hide missing required data if it affects actionability.

---

## Description Generation

Each description has three parts:

```text
[Action Explanation] + [Why] + [Context]
```

Where:

```text
Action Explanation = determined by suggestion type
Why = determined by engine reason
Context = optional, only if structured data supports it
```

Hard Rule:

```text
The “Why” sentence is mandatory for explainability.
```

---

## Action Text Templates

Approved action text:

```ts
const ACTION_TEXT = {
  buffer: "Increase your stablecoin reserve.",
  rebalance: "Adjust your portfolio to match your target allocation.",
  swap: "Convert {sell_token} into {buy_token}.",
  stake: "Earn passive yield on your {token}.",
  vault: "Put idle {token} to work in a yield strategy.",
  lp: "Earn trading fees by providing liquidity.",
  dca: "Gradually increase your exposure over time.",
  trim: "Reduce exposure to a high-risk or overweight asset."
};
```

Rules:

- Action text describes the action category.
- Action text must not imply execution.
- Action text must not imply guaranteed outcome.
- Action text must not imply risk-free yield.
- Variables must come from structured data.

Safer yield note:

```text
For yield-related cards, pair yield language with estimated/changeable context when APY is shown.
```

---

## Reason Text Templates

Reason text is mandatory.

Approved reason text:

```ts
const REASON_TEXT = {
  buffer_low: "Your Safety Buffer is below target.",
  buffer_excess: "You have excess stablecoins above your buffer.",
  crypto_overweight: "You are overexposed to crypto assets.",
  crypto_underweight: "You have excess stablecoins not deployed.",
  token_overweight: "One asset is overweight in your portfolio.",
  idle_stables: "You have idle funds not earning yield.",
  unstaked_assets: "Some of your assets are not earning yield.",
  low_yield: "Your current strategy is below the expected yield range.",
  high_concentration: "Your portfolio is too concentrated.",
  illiquid_token: "Some assets have low liquidity or high risk.",
  cost_too_high: "Transaction cost is too high to proceed.",
  on_track: "Your portfolio is aligned with your plan."
};
```

Rules:

- Use exactly one primary reason.
- Do not stack multiple reasons in one card.
- Reason must come from Suggestion Engine.
- Frontend must not choose or rewrite the dominant reason.
- Smith AI may explain the reason, but must not change it.

---

## One Primary Reason Rule

Hard Rule:

```text
One suggestion = one primary reason.
```

Bad:

```text
You are overweight, idle, risky, and below buffer.
```

Good:

```text
Your Safety Buffer is below target.
```

Rules:

- Suggestion Engine chooses the dominant reason.
- UI renders that reason.
- Do not add extra reasons to make the card feel more persuasive.
- Extra context can appear only if product data supports it and does not change the primary reason.

---

## Optional Context Templates

Optional context may be added only when structured data supports it.

Approved context text:

```ts
const CONTEXT_TEXT = {
  yield: "Estimated APY can change.",
  yield_with_value: "Estimated APY: {estimated_apy}%.",
  risk_reduce: "This helps reduce portfolio volatility.",
  liquidity: "Funds remain accessible when needed.",
  buffer_priority: "WealthSmith prioritizes your Safety Buffer before yield opportunities.",
  external_review: "You’ll review this on the protocol before taking action."
};
```

Rules:

- Context is optional.
- Context must not introduce a second reason.
- APY context may be used only when APY is sourced.
- Do not use “earn up to” unless product/content explicitly approves that phrasing for the specific source.
- Prefer “Estimated APY” over “Earn up to.”
- Do not imply guaranteed or fixed yield.
- Do not imply in-app execution.

---

## Final Description Builder

Default builder:

```ts
description =
  ACTION_TEXT[type] +
  " " +
  REASON_TEXT[reason] +
  " " +
  OPTIONAL_CONTEXT;
```

Buffer-low special case:

```ts
if (reason === "buffer_low") {
  description =
    "Increase your stablecoin reserve. Your Safety Buffer is below target.";
}
```

Rules:

- Use one action sentence.
- Use one reason sentence.
- Add optional context only if it improves clarity.
- Keep description short.
- Avoid long paragraphs in suggestion cards.
- Do not use freeform generated copy in the card.

---

## Example: Rebalance

Input:

```json
{
  "type": "rebalance",
  "sell_token": "SOL",
  "buy_token": "USDC",
  "reason": "crypto_overweight",
  "is_top_pick": true,
  "is_actionable": true
}
```

Output:

```text
Title:
Rebalance SOL to USDC

Description:
Adjust your portfolio to match your target allocation. You are overexposed to crypto assets. This helps reduce portfolio volatility.

Badge:
Top Pick

Tag:
Risk Reduction
```

Rules:

- Title comes from `type`.
- Reason comes from `reason`.
- Risk context comes from approved optional context.
- Top Pick comes from `is_top_pick`.

---

## Example: Buffer

Input:

```json
{
  "type": "buffer",
  "reason": "buffer_low",
  "is_top_pick": true,
  "is_actionable": true
}
```

Output:

```text
Title:
Top Up Your Safety Buffer

Description:
Increase your stablecoin reserve. Your Safety Buffer is below target.

Badge:
Top Pick

Tag:
Safety Buffer
```

Optional context:

```text
WealthSmith prioritizes your Safety Buffer before yield opportunities.
```

Rules:

- Buffer-low copy must be direct and calm.
- Do not use alarmist language.
- Do not imply stablecoins are risk-free.
- Do not imply WealthSmith holds the buffer.

---

## Example: Locked Yield

Input:

```json
{
  "type": "vault",
  "token": "USDC",
  "protocol": "Kamino",
  "reason": "idle_stables",
  "is_actionable": false,
  "is_top_pick": false,
  "disabled_reason": "buffer_required"
}
```

Output:

```text
Title:
Deposit USDC into Kamino

Description:
Put idle USDC to work in a yield strategy. You have idle funds not earning yield.

Badge:
Locked

Disabled reason:
Unlock after your Safety Buffer is fully funded.
```

Rules:

- Locked card must not use primary action CTA.
- Locked card must not be Top Pick.
- Locked card must explain why it is locked.
- Do not encourage action before unlock condition is met.

---

## Example: Stake

Input:

```json
{
  "type": "stake",
  "token": "SOL",
  "protocol": "Jito",
  "reason": "unstaked_assets",
  "is_actionable": true,
  "is_top_pick": false
}
```

Output:

```text
Title:
Stake SOL on Jito

Description:
Earn passive yield on your SOL. Some of your assets are not earning yield.

CTA:
Review on Jito
```

Rules:

- Do not imply yield is guaranteed.
- If APY is shown, use sourced APY only.
- Do not show staking suggestion when Safety Buffer logic locks it.

---

## Impact Text

Impact text must come from engine/product logic.

Examples:

```text
+$170/year
+$170/year (6.7% APY)
Moves your Safety Buffer closer to 100%.
Reduces volatile exposure by 18%.
```

Hard Rule:

```text
Use engine values only.
No frontend calculations.
```

Rules:

- Do not calculate annual yield in the card.
- Do not calculate APY in the card.
- Do not calculate volatility reduction in the card.
- Do not invent impact text when absent.
- If impact value is estimated, copy should say estimated where appropriate.
- If APY is unavailable, do not show APY.

---

## Tags

Tags help classify the suggestion.

Approved tags:

```text
Safety Buffer
Risk Reduction
Capital Efficiency
Yield Opportunity
Portfolio Alignment
Locked
Unavailable
Strategy Insight
```

Rules:

- Tags must come from structured suggestion category/type or approved mapping.
- `Top Pick` is a badge, not a category tag.
- Do not invent marketing tags.
- Do not use tags like `Best`, `Guaranteed`, `Risk-Free`, or `Perfect`.

Suggested type-to-tag mapping:

```ts
const TYPE_TAGS = {
  buffer: "Safety Buffer",
  rebalance: "Risk Reduction",
  swap: "Portfolio Alignment",
  stake: "Capital Efficiency",
  vault: "Yield Opportunity",
  lp: "Yield Opportunity",
  dca: "Portfolio Alignment",
  trim: "Risk Reduction"
};
```

---

## Badges

Approved badges:

```text
Top Pick
Critical
Locked
Unavailable
Estimated
Stale
Demo
```

Rules:

- `Top Pick` appears only when `is_top_pick = true`.
- Exactly one actionable suggestion may show `Top Pick`.
- Locked suggestions cannot show `Top Pick`.
- Demo suggestions may show `Demo` context if needed.
- Badge color alone must not be the only meaning.

---

## CTA Copy

MVP suggestion card CTAs are handoffs, not execution.

Approved CTA patterns:

```text
Open protocol
Review on {protocol}
Manage on {protocol}
Open {protocol}
```

Examples:

```text
Review on Jupiter
Manage on Kamino
Open protocol
```

Rules:

- Use `Review on {protocol}` for suggested new action.
- Use `Manage on {protocol}` for existing position management.
- Use `Open protocol` when protocol label is unavailable but destination is approved.
- Do not use execution language.
- Do not show CTA if action is locked/disabled.
- Do not guess protocol label.

Avoid:

```text
Execute now
Swap now
Stake now
Deposit now
Confirm trade
Start earning
```

---

## Protocol Handoff Helper Copy

Optional helper copy:

```text
You’ll review this on the protocol before taking action.
```

```text
No action will be taken automatically.
```

```text
Opens in a new tab.
```

Rules:

- Use when the card action could be misunderstood as in-app execution.
- Do not over-repeat on every card if the pattern is already clear.
- Include accessible new-tab context where practical.

---

## Non-Actionable Handling

If:

```ts
is_actionable === false
```

Then UI must:

```text
Disable CTA
Show disabled reason
Prevent action/handoff
Keep card visually distinct
```

Approved disabled reason text:

```ts
const DISABLED_REASON_TEXT = {
  cost_too_high: "Transaction cost is too high to proceed.",
  liquidity_low: "Liquidity is too low for this action.",
  below_min_size: "This position is below the minimum size for this action.",
  buffer_required: "Unlock after your Safety Buffer is fully funded."
};
```

Rules:

- Disabled copy must be specific.
- Do not hide disabled reason.
- Do not imply the card is actionable.
- Do not show Top Pick for disabled cards.
- Do not open protocol destination for disabled cards.

---

## Locked Suggestion Copy

Locked suggestions should explain future opportunity without encouraging premature action.

Approved locked phrases:

```text
Unlock after your Safety Buffer is fully funded.
```

```text
Locked until your Safety Buffer reaches target.
```

```text
Available after your Safety Buffer is complete.
```

Rules:

- Avoid blaming the user.
- Avoid “You can’t”.
- Avoid “Not allowed”.
- Do not show primary CTA.
- Do not make locked card visually identical to actionable card.

---

## Safety Buffer Copy

Approved titles:

```text
Top Up Your Safety Buffer
Fund Your Safety Buffer
```

Preferred MVP title:

```text
Top Up Your Safety Buffer
```

Approved descriptions:

```text
Increase your stablecoin reserve. Your Safety Buffer is below target.
```

```text
WealthSmith prioritizes your Safety Buffer before yield opportunities.
```

Avoid:

```text
Your portfolio is unsafe.
Your funds are at risk.
Move funds immediately.
```

Rules:

- Safety Buffer copy should be firm but calm.
- Do not imply stablecoins are risk-free.
- Do not imply WealthSmith holds the buffer.
- Do not shame the user.

---

## Rebalance Copy

Approved titles:

```text
Rebalance {sell_token} to {buy_token}
```

Approved action text:

```text
Adjust your portfolio to match your target allocation.
```

Approved reason examples:

```text
You are overexposed to crypto assets.
One asset is overweight in your portfolio.
Your portfolio is too concentrated.
```

Approved optional context:

```text
This helps reduce portfolio volatility.
```

Rules:

- Do not imply guaranteed risk reduction.
- Do not imply execution.
- Do not use “best trade.”
- Use `Review on {protocol}` for protocol CTA.

---

## Swap Copy

Approved titles:

```text
Swap {sell_token} to {buy_token}
```

Approved action text:

```text
Convert {sell_token} into {buy_token}.
```

Rules:

- Use only when Suggestion Engine returns swap type.
- Do not use swap copy for every rebalance unless type is `swap`.
- CTA still uses review/open language.
- Do not imply swap is executed inside WealthSmith.

---

## Stake Copy

Approved titles:

```text
Stake {token} on {protocol}
Stake {token}
```

Approved action text:

```text
Earn passive yield on your {token}.
```

Safer context when APY appears:

```text
Estimated APY can change.
```

Rules:

- Do not say “guaranteed yield.”
- Do not say “risk-free.”
- Do not show staking card as actionable if Safety Buffer rules lock it.
- Do not invent protocol destination.

---

## Vault Copy

Approved titles:

```text
Deposit {token} into {protocol}
Deposit {token}
```

Approved action text:

```text
Put idle {token} to work in a yield strategy.
```

Rules:

- Use only for product-approved vault/yield strategy suggestions.
- Do not imply guaranteed returns.
- Do not show APY without sourced data.
- Do not use vault copy while Safety Buffer locks yield opportunities.

---

## LP Copy

Approved titles:

```text
Provide Liquidity on {protocol}
```

Approved action text:

```text
Earn trading fees by providing liquidity.
```

Rules:

- Do not use LP copy for beginner users without risk context if product rules require caution.
- Do not imply guaranteed trading fees.
- Do not hide risk.
- Do not invent LP opportunity from token holdings alone.

---

## DCA Copy

Approved titles:

```text
Gradually Buy {token}
```

Approved action text:

```text
Gradually increase your exposure over time.
```

Rules:

- Do not imply urgency.
- Do not imply guaranteed better entry.
- Do not suggest DCA if Safety Buffer/product rules block it.
- Use only when Suggestion Engine returns DCA type.

---

## Trim Copy

Approved titles:

```text
Reduce Exposure to {token}
```

Approved action text:

```text
Reduce exposure to a high-risk or overweight asset.
```

Rules:

- Keep tone neutral.
- Avoid calling user’s holding “bad.”
- Do not shame speculative holdings.
- Do not imply immediate forced selling.

---

## On-Track Copy

When no action is required:

Approved copy:

```text
Your portfolio is aligned with your plan.
```

Possible card/insight title:

```text
Your Plan Is On Track
```

Rules:

- On-track is informational, not actionable.
- Do not show Top Pick if no actionable suggestions exist.
- Do not create fake action suggestions just to fill the rail.

---

## Demo Suggestion Copy

Demo Mode suggestions must be demo-aware.

Allowed:

```text
In this demo, WealthSmith is showing how Safety Buffer suggestions work.
```

```text
Sample suggestion
```

```text
Demo
```

Rules:

- Demo suggestion cards can use normal templates, but Demo Mode banner must be visible.
- Smith AI explanations must say “in this demo” when needed.
- Do not phrase demo suggestions as real wallet advice.
- Demo suggestions must not persist into real wallet mode.

---

## Smith AI Explanation Copy

Smith AI explanation is triggered when user asks why.

Input:

```text
Full Suggestion object
```

Output:

```ts
interface Explanation {
  explanation: string;
}
```

Rules:

- Must use suggestion object as source.
- Must not change numbers.
- Must not change logic.
- Must not choose a different Top Pick.
- Must not invent APY.
- Must not invent protocol destination.
- Must not claim action was completed.

Preferred explanation structure:

```text
1. Why this suggestion appears
2. What the action means
3. What data/condition triggered it
4. What happens next
5. Safety reminder if needed
```

Example:

```text
This suggestion appears because your crypto exposure is above your target. Moving part of that exposure into USDC can bring your portfolio closer to your plan while keeping your Safety Buffer intact. No action will be taken automatically.
```

---

## Forbidden Suggestion Copy

Never use:

```text
Guaranteed returns
Guaranteed APY
Risk-free yield
Best investment
Perfect strategy
AI found the best trade
You must act now
Execute now
Trade now
Confirm trade
We will rebalance for you
We moved your funds
Funds are safe with us
```

Use safer alternatives:

```text
Suggested next action
Estimated APY
Review on protocol
Open protocol
Based on your current plan
No action will be taken automatically
Your funds stay in your wallet
```

---

## Copy Maps

### Title Templates

```json
{
  "buffer": "Top Up Your Safety Buffer",
  "rebalance": "Rebalance {sell_token} to {buy_token}",
  "swap": "Swap {sell_token} to {buy_token}",
  "stake": "Stake {token} on {protocol}",
  "vault": "Deposit {token} into {protocol}",
  "lp": "Provide Liquidity on {protocol}",
  "dca": "Gradually Buy {token}",
  "trim": "Reduce Exposure to {token}"
}
```

### Action Text

```json
{
  "buffer": "Increase your stablecoin reserve.",
  "rebalance": "Adjust your portfolio to match your target allocation.",
  "swap": "Convert {sell_token} into {buy_token}.",
  "stake": "Earn passive yield on your {token}.",
  "vault": "Put idle {token} to work in a yield strategy.",
  "lp": "Earn trading fees by providing liquidity.",
  "dca": "Gradually increase your exposure over time.",
  "trim": "Reduce exposure to a high-risk or overweight asset."
}
```

### Reason Text

```json
{
  "buffer_low": "Your Safety Buffer is below target.",
  "buffer_excess": "You have excess stablecoins above your buffer.",
  "crypto_overweight": "You are overexposed to crypto assets.",
  "crypto_underweight": "You have excess stablecoins not deployed.",
  "token_overweight": "One asset is overweight in your portfolio.",
  "idle_stables": "You have idle funds not earning yield.",
  "unstaked_assets": "Some of your assets are not earning yield.",
  "low_yield": "Your current strategy is below the expected yield range.",
  "high_concentration": "Your portfolio is too concentrated.",
  "illiquid_token": "Some assets have low liquidity or high risk.",
  "cost_too_high": "Transaction cost is too high to proceed.",
  "on_track": "Your portfolio is aligned with your plan."
}
```

### Disabled Reason Text

```json
{
  "cost_too_high": "Transaction cost is too high to proceed.",
  "liquidity_low": "Liquidity is too low for this action.",
  "below_min_size": "This position is below the minimum size for this action.",
  "buffer_required": "Unlock after your Safety Buffer is fully funded."
}
```

---

## QA Checklist

Before shipping suggestion card copy, verify:

```text
Does the title come from approved template?
Does the description include action text?
Does the description include exactly one primary reason?
Does the reason come from Suggestion Engine?
Does context come only from structured data?
Does impact text come from engine/product logic?
Does Top Pick render only from is_top_pick?
Is there at most one Top Pick?
Is locked copy clear?
Is disabled reason visible?
Does CTA use review/open language?
Does card click avoid execution/signature in MVP?
Does copy avoid guarantees?
Does copy avoid custody claims?
Does copy avoid hype?
Does demo copy stay demo-aware?
Does Smith AI explanation preserve numbers and logic?
```

---

## Related Files

Rules:

```text
rules/financial-logic-boundaries.md
rules/suggestion-engine-rules.md
rules/top-pick-rules.md
rules/protocol-selection-rules.md
rules/wallet-and-custody-rules.md
rules/smith-ai-rules.md
rules/demo-mode-rules.md
```

Components:

```text
components/suggestion-card.md
components/badge.md
components/button.md
components/icon.md
```

Patterns:

```text
patterns/suggestion-flow.md
patterns/dashboard-layout.md
patterns/empty-loading-error-states.md
```

Content:

```text
content/voice-and-tone.md
content/ui-copy-rules.md
content/smith-ai-copy.md
content/wallet-copy.md
content/demo-mode-copy.md
```

---

## Claude Code Rules

Claude Code should:

- Generate suggestion card copy only through approved templates.
- Use `type` for title/action text mapping.
- Use `reason` for mandatory reason copy.
- Use exactly one primary reason.
- Use `is_top_pick` for Top Pick badge.
- Use `is_actionable` for CTA availability.
- Use `disabled_reason` for locked/disabled copy.
- Use product-provided `impact_text`.
- Use approved CTA language.
- Omit missing optional protocol phrase safely.
- Keep demo suggestions demo-aware.
- Keep Smith AI explanation separate from card copy.

Claude Code must not:

- Invent suggestion titles.
- Invent reasons.
- Stack multiple reasons.
- Change numbers.
- Calculate impact text.
- Calculate APY.
- Add Top Pick locally.
- Add CTA for disabled suggestions.
- Use execution language.
- Use hype language.
- Use Smith AI freeform text as card copy.
- Guess protocol names or URLs.
- Show unresolved variables.
- Mix demo and real suggestion copy.

---

## Do

- Keep copy deterministic.
- Use strict templates.
- Start titles with action verbs.
- Keep titles short.
- Include mandatory reason.
- Keep one primary reason.
- Use engine values only.
- Use review/open CTAs.
- Explain locked states.
- Let Smith AI explain, not rewrite.

---

## Do Not

- Do not invent custom card copy.
- Do not let frontend infer logic.
- Do not let Smith AI change copy logic.
- Do not make promises.
- Do not imply execution.
- Do not imply custody.
- Do not imply guaranteed yield.
- Do not use multiple Top Picks.
- Do not show locked cards as actionable.
- Do not show fake impact numbers.

---

## Done Criteria

Suggestion card copy is implemented correctly when:

- Every card title comes from approved title templates.
- Every description is built from action text + one reason + optional context.
- Every reason comes from Suggestion Engine output.
- Every Top Pick badge comes from `is_top_pick`.
- Every disabled card shows approved disabled reason copy.
- Every impact value comes from engine/product logic.
- Every protocol CTA uses review/open language.
- No suggestion card implies execution or custody.
- No suggestion card implies guaranteed returns or risk-free yield.
- Demo suggestion copy stays separate from real wallet copy.
- Smith AI explanations preserve original numbers and logic.

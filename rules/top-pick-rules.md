# Top Pick Rules

This rule file defines how WealthSmith selects, returns, renders, and explains the single most important recommendation for a user state.

Top Pick is not a visual decoration.

Top Pick is a deterministic product decision.

---

## Purpose

Top Pick answers:

```text
What is the best next action for this user right now?
```

It should feel like:

```text
This is the smartest next move for your plan.
```

Top Pick must be:

- Deterministic
- Safety-first
- Actionable
- Explainable
- Derived from Suggestion Engine output
- Returned as structured data
- Easy for Smith AI to explain
- Rendered clearly in the UI

---

## Core Hard Rules

Hard Rule:

```text
Top Pick must be selected by Top Pick Logic.
```

Hard Rule:

```text
The UI must not choose Top Pick.
Smith AI must not choose Top Pick.
Claude Code must not choose Top Pick outside approved deterministic product logic.
```

Hard Rule:

```text
When actionable suggestions exist, exactly one suggestion may be marked Top Pick.
```

Hard Rule:

```text
If no valid actionable suggestions exist, there is no Top Pick.
```

---

## Layer Responsibilities

```text
Suggestion Engine:
  Produces valid suggestion candidates.

Top Pick Logic:
  Selects exactly one highest-priority valid actionable suggestion.

Protocol Logic:
  Provides destination protocol for the selected suggestion if protocol-backed.

Smith AI:
  Explains why the selected suggestion is Top Pick.

UI:
  Renders the Top Pick state from structured data.
```

Do not merge these responsibilities.

---

## Source of Truth

Top Pick must come from structured product output.

Required field:

```json
{
  "is_top_pick": true
}
```

Rules:

- UI renders the badge only when `is_top_pick = true`.
- UI must not set `is_top_pick`.
- UI must not infer Top Pick from first card position.
- UI must not infer Top Pick from severity alone.
- UI must not infer Top Pick from APY, visual emphasis, or user clicks.
- Smith AI must not override the selected Top Pick.

---

## Top Pick Candidate Eligibility

A suggestion can be considered for Top Pick only if it is valid and actionable.

Candidate must:

```text
Be returned by the Suggestion Engine
Be actionable
Pass all global guardrails
Have required action metadata
Have required reason data
Have valid priority/score fields
Not be locked
Not be blocked
Not be stale
Not be expired
Not be completed
Not be dismissed unless product explicitly allows resurfacing
```

Required guardrails:

```text
Minimum trade size >= $50
Estimated cost within threshold
Liquidity valid
Slippage within threshold
Asset/action supported
Action does not use locked assets
Action does not break Safety Buffer
```

Not eligible:

```text
non_actionable
locked
blocked
completed
expired
stale
estimated_cost_high
liquidity_invalid
trade_size_below_minimum
unsupported_asset
unsupported_protocol
```

Hard Rule:

```text
A locked suggestion cannot be Top Pick.
```

Hard Rule:

```text
A non-actionable suggestion cannot be Top Pick.
```

---

## Priority Hierarchy

Top Pick is selected by category priority first.

Priority order, highest to lowest:

```text
1. Buffer Actions
2. Rebalance
3. Capital Efficiency
4. Optimization
```

### 1. Buffer Actions

Examples:

```text
Top Up Buffer
Future buffer correction actions
```

Purpose:

```text
Protect the user’s baseline safety reserve before additional volatile or yield actions.
```

### 2. Rebalance

Examples:

```text
Reduce volatile exposure
Sell overweight asset
Buy underweight asset when appropriate
```

Trigger reference:

```text
Allocation delta >= +/-10%
```

### 3. Capital Efficiency

Examples:

```text
Stake core assets
Deploy to vaults
Use idle stablecoins when buffer is satisfied
```

### 4. Optimization

Examples:

```text
DCA Buy
Trim long-tail assets
Improve allocation gradually
```

Rules:

- Category priority is applied before within-category ranking.
- UI must not change category priority.
- Smith AI must not change category priority.
- Yield suggestions must not outrank buffer actions.
- Visual appeal, APY, or card position must not override this hierarchy.

---

## Buffer Override

Buffer Override is the highest-priority Top Pick rule.

Hard Rule:

```text
If the Safety Buffer is not satisfied, only buffer-related suggestions are allowed.
```

Hard Rule:

```text
If the Safety Buffer is not satisfied, Top Pick must be a buffer-related action.
```

Default buffer Top Pick:

```text
Top Up Buffer
```

Rules:

- No staking suggestions before buffer is satisfied.
- No vault suggestions before buffer is satisfied.
- No DCA suggestions before buffer is satisfied unless product explicitly allows safe partial funding logic.
- No optimization suggestions before buffer is satisfied.
- Rebalance can only appear if it directly supports buffer funding.
- Locked yield opportunities may be shown after the buffer suggestion, but they cannot be Top Pick.
- UI must not override Buffer Override.
- Smith AI must explain Buffer Override when relevant.

Example:

```text
Buffer shortfall: $800
Top Pick: Top Up Buffer
```

---

## Ranking Within Same Category

If multiple valid suggestions exist in the same category, rank them by:

```text
1. Impact Score
2. Urgency Score
3. Efficiency Score
```

### 1. Impact Score

Primary ranking factor.

Measures:

```text
USD value affected
Percent improvement toward target
Buffer months increase
Allocation deviation corrected
Yield improvement on idle capital
Risk exposure reduced
```

Higher impact wins.

### 2. Urgency Score

Secondary ranking factor.

Measures:

```text
Distance from target
Buffer shortfall size
Allocation delta
Idle capital size
Negative cash flow pressure
Risk severity
```

Higher urgency wins.

### 3. Efficiency Score

Tertiary ranking factor.

Prefer:

```text
Lower cost
Higher liquidity
Lower slippage
Cleaner route
Lower operational friction
```

Higher efficiency wins.

Hard Rule:

```text
When suggestions are in the same category, Impact Score wins before Urgency Score and Efficiency Score.
```

---

## Final Selection Algorithm

Reference algorithm:

```text
valid_suggestions = filter(actionable_suggestions)

IF no valid_suggestions:
  top_pick = null
  RETURN

IF buffer_not_met:
  buffer_suggestions = filter(valid_suggestions, category == "buffer")
  top_pick = highest_ranked(buffer_suggestions)
  RETURN top_pick

GROUP valid_suggestions by category

SORT categories by priority:
  1. Buffer Actions
  2. Rebalance
  3. Capital Efficiency
  4. Optimization

FOR category in priority_order:
  IF category has valid suggestions:
    SORT suggestions in category by:
      1. impact_score DESC
      2. urgency_score DESC
      3. efficiency_score DESC
    top_pick = first suggestion
    RETURN top_pick
```

Rules:

- No randomness.
- Same input must return same Top Pick.
- Do not use AI to resolve ranking.
- Do not use visual order to resolve ranking.
- If all candidates fail guardrails, return no Top Pick.

---

## Impact Score

`impact_score` measures how much a suggestion improves the user’s financial position.

Range:

```text
0.0 to 1.0
```

General formula:

```text
impact_score = clamp(raw_impact / normalization_factor, 0, 1)
```

Then apply category weight:

```text
impact_score = impact_score * category_weight
```

Rules:

- Impact Score must be deterministic.
- Impact Score must come from product logic.
- UI must not calculate Impact Score.
- Smith AI must not invent Impact Score.
- Impact Score should be included in Top Pick output for explainability/debugging.

---

## Category Weights

MVP category weights:

```text
Buffer: 1.0
Rebalance: 0.9
Trim: 0.8
Stake / Vault: 0.7
DCA: 0.6
```

Rules:

- Weights reflect WealthSmith’s safety-first philosophy.
- UI must not change category weights.
- Smith AI must not change category weights.
- Future changes require product approval.
- Weights are part of deterministic Top Pick Logic.

---

## Impact Score by Suggestion Type

### Buffer / Top Up Buffer

Goal:

```text
Maximize safety improvement.
```

Formula:

```text
raw_impact = buffer_gap_usd / required_buffer_usd
impact_score = min(raw_impact, 1) * 1.0
```

Where:

```text
buffer_gap_usd = required_buffer_usd - current_stables
```

Interpretation:

```text
User has 0 buffer -> score approaches 1
User is slightly below buffer -> smaller score
```

---

### Rebalance

Goal:

```text
Reduce allocation deviation.
```

Formula:

```text
raw_impact = abs(delta_before) - abs(delta_after)
impact_score = raw_impact / abs(delta_before)
impact_score = min(impact_score, 1) * 0.9
```

Simplified:

```text
Impact Score = percent of imbalance corrected, weighted by Rebalance category weight.
```

Example:

```text
Delta before: +20%
Delta after: +8%

impact = (20 - 8) / 20 = 0.6
weighted impact_score = 0.6 * 0.9 = 0.54
```

---

### Deploy to Vault / Stake

Goal:

```text
Increase yield on idle capital.
```

Formula:

```text
raw_impact = capital_deployed_usd * net_apy
impact_score = raw_impact / max_expected_yield
impact_score = min(impact_score, 1) * 0.7
```

MVP normalization:

```text
max_expected_yield = portfolio_value * 0.10
```

Rules:

- APY must come from approved yield/protocol data.
- Net APY must account for product-defined cost/risk adjustments if applicable.
- This suggestion cannot override underfunded Safety Buffer.

---

### DCA Buy

Goal:

```text
Improve allocation gradually.
```

Formula:

```text
underweight_ratio = abs(delta) / 100
impact_score = (capital_deployed_usd / portfolio_value) * underweight_ratio
impact_score = min(impact_score, 1) * 0.6
```

Rules:

- DCA should not consume required buffer.
- DCA is lower priority than buffer, rebalance, and capital efficiency.
- DCA must use approved core/diversifier token logic.

---

### Trim Long-Tail

Goal:

```text
Reduce risky exposure.
```

Formula:

```text
raw_impact = trimmed_value_usd / portfolio_value
impact_score = raw_impact * volatility_score
impact_score = min(impact_score, 1) * 0.8
```

Rules:

- Volatility score must come from approved token/risk metadata or product logic.
- Trim suggestions must pass liquidity and cost guardrails.
- Dust tokens below minimum size should be ignored.

---

## Urgency Score

`urgency_score` is the secondary sorting factor.

It may consider:

```text
Buffer shortfall size
Distance from allocation target
Magnitude of overexposure
Idle capital size
Negative cash flow
Goal timeline pressure
Risk severity
```

Rules:

- Urgency Score comes from product logic.
- UI must not calculate urgency.
- Smith AI must not invent urgency.
- Urgency Score breaks ties after Impact Score.

---

## Efficiency Score

`efficiency_score` is the tertiary sorting factor.

It may consider:

```text
Estimated cost
Liquidity
Slippage
Route quality
Execution complexity
Protocol availability
```

Rules:

- Efficiency Score comes from product logic.
- UI must not calculate efficiency.
- Smith AI must not invent efficiency.
- Efficiency Score breaks ties after Impact Score and Urgency Score.

---

## Guardrails

Before a suggestion can be Top Pick, it must pass guardrails.

MVP guardrails:

```text
Minimum trade size >= $50
Estimated cost within threshold
Liquidity valid
Slippage <= threshold
Action supported
Token supported
Protocol supported
Asset not locked
Route/action not stale
```

Known MVP thresholds:

```text
Minimum trade size: $50
Rebalance delta trigger: +/-10%
Idle capital trigger: >= $250
Underweight core asset trigger: >= 5%
Slippage rejection example: > 0.5%
```

Rules:

- Guardrail failure removes or downgrades Top Pick eligibility.
- High estimated cost should mark a suggestion non-actionable if product logic says so.
- Low liquidity should block a suggestion.
- Locked assets must be excluded.
- Dust tokens below minimum should be ignored.
- Top Pick must never bypass guardrails.

---

## Output Contract

Top Pick must be returned as structured data.

Minimum output:

```json
{
  "suggestion_id": "rebalance_sol_to_usdc",
  "type": "rebalance",
  "is_top_pick": true,
  "priority_level": 2,
  "priority_category": "rebalance",
  "impact_score": 0.82,
  "urgency_score": 0.76,
  "efficiency_score": 0.64,
  "reason_codes": ["allocation_delta_above_target"],
  "guardrail_status": "passed"
}
```

Recommended output inside suggestion list:

```json
{
  "suggestions": [
    {
      "suggestion_id": "top_up_buffer_usdc",
      "type": "fund_safety_buffer",
      "category": "buffer",
      "actionability": "actionable",
      "status": "active",
      "is_top_pick": true,
      "priority_rank": 1,
      "impact_score": 1,
      "urgency_score": 0.9,
      "efficiency_score": 0.8
    }
  ]
}
```

No Top Pick output:

```json
{
  "top_pick": null,
  "reason": "no_valid_actionable_suggestions"
}
```

Rules:

- Exactly one item should have `is_top_pick = true`.
- If `top_pick = null`, no suggestion item should have `is_top_pick = true`.
- UI must handle no Top Pick safely.
- Output must be deterministic and explainable.

---

## UX Rules

Top Pick must be visually highlighted.

Rules:

- Show `Top Pick` badge on exactly one card.
- Top Pick should appear first when actionable suggestions are listed.
- Dashboard alert may sync with Top Pick.
- Top Pick should be explainable by Smith AI.
- Top Pick visual treatment must not imply guaranteed outcome.
- Top Pick card click follows MVP protocol handoff rules.
- Top Pick card click does not execute a transaction.
- Top Pick card click does not request a wallet signature.

UI may render:

```text
Top Pick
Suggested next action
Why this is recommended
Estimated impact
Open protocol
```

UI must not render:

```text
Guaranteed best action
Execute now
AI chose this for you
We will rebalance for you
```

---

## Dashboard Alert Sync

Dashboard alert may mirror the Top Pick.

Rules:

- Alert content should come from Top Pick/suggestion data.
- Alert should not introduce a different recommendation.
- Dismissing the alert should not remove the underlying Top Pick unless product explicitly supports dismissal.
- If Top Pick changes, alert should update.
- If no Top Pick exists, do not show fake urgency.
- If buffer is not met, alert should align with buffer Top Pick.

---

## Smith AI Explanation Rules

Smith AI may explain:

```text
Why this suggestion is Top Pick
Which category priority applied
Whether Buffer Override applied
Which scores made it rank first
Which guardrails were passed
What happens when user opens the protocol
```

Smith AI must not:

```text
Select a different Top Pick
Override Top Pick
Create a new Top Pick
Invent scores
Invent guardrail results
Invent APY
Invent protocol destination
Claim the action was executed
```

Good Smith AI explanation:

```text
This is Top Pick because your Safety Buffer is below target. WealthSmith prioritizes buffer funding before yield or optimization actions.
```

Unsafe Smith AI explanation:

```text
I think this other yield is better, so make that your Top Pick instead.
```

---

## Demo Mode Rules

Demo Mode can have a Top Pick.

Rules:

- Demo Top Pick must be generated from demo Suggestion Engine data.
- Demo Top Pick must not persist into real wallet mode.
- Smith AI must refer to demo Top Pick as demo/sample.
- Demo Top Pick must not be mixed with real wallet suggestions.
- Exiting Demo Mode clears demo Top Pick.

Hard Rule:

```text
Demo Top Pick and real wallet Top Pick must stay separate.
```

---

## Stale, Completed, and Dismissed States

Top Pick must not be stale, completed, or invalid.

Rules:

- Stale suggestions cannot remain Top Pick.
- Completed suggestions cannot remain Top Pick.
- Locked suggestions cannot be Top Pick.
- Blocked suggestions cannot be Top Pick.
- Expired suggestions cannot be Top Pick.
- Dismissed critical buffer suggestions may reappear if the condition remains critical and product logic supports resurfacing.
- Opening a protocol page does not mark Top Pick completed.
- Completion requires updated product/wallet/protocol state.

---

## Edge Cases

### Buffer Nearly Met

Scenario:

```text
Small shortfall, e.g. $50
```

Expected:

```text
Still triggers buffer top-up if buffer is not satisfied and trade/action passes guardrails.
```

### Conflicting Conditions

Scenario:

```text
Buffer not met + overweight crypto + idle capital
```

Expected:

```text
Only buffer-related suggestion allowed.
Top Pick = Top Up Buffer.
```

### No Valid Suggestions

Scenario:

```text
All suggestions fail guardrails.
```

Expected:

```text
No Top Pick.
```

### Dust Tokens

Scenario:

```text
Multiple tokens below $50 trade size.
```

Expected:

```text
Ignored or excluded from Top Pick candidates.
```

### Locked Assets

Scenario:

```text
Suggested source token is locked.
```

Expected:

```text
Excluded from Top Pick candidates.
```

### Negative Cash Flow

Scenario:

```text
Monthly expenses exceed income.
```

Expected:

```text
Investment/yield suggestions reduced or locked.
Safety/buffer recommendations receive priority.
```

---

## Example Scenarios

### Case 1: Buffer Not Met

Input:

```text
Required buffer: $3,000
Current stable reserve: $1,000
Portfolio: 90% SOL
```

Expected:

```text
Only suggestion: Top Up Buffer
Top Pick: Top Up Buffer
No staking, vault, DCA, or optimization suggestions
```

### Case 2: Buffer OK + Overweight Crypto

Input:

```text
Buffer satisfied
Crypto allocation: 80%
Target allocation: 60%
```

Expected:

```text
Suggestion: Rebalance
Top Pick: Rebalance
```

### Case 3: Balanced Portfolio + Idle Capital

Input:

```text
Buffer satisfied
Extra USDC: $2,000
Portfolio otherwise aligned
```

Expected:

```text
Suggestion: Deploy to Vault
Top Pick: Deploy to Vault
```

### Case 4: Multiple Rebalance Options

Input:

```text
SOL overweight: 20%
BONK overweight: 15%
```

Expected:

```text
Top Pick: SOL rebalance if it has higher impact
```

If impact is equal, use:

```text
Urgency Score
Efficiency Score
```

---

## Non-Goals for MVP

Top Pick Logic does not:

```text
Use ML or prediction
Use freeform AI decision-making
Personalize ranking beyond approved deterministic rules
Change thresholds dynamically
Execute transactions
Guarantee results
Override guardrails
Optimize for highest APY alone
```

---

## QA Requirements

Top Pick tests must validate:

```text
Buffer not met -> Top Up Buffer
Buffer OK + overweight -> Rebalance
Balanced + idle capital -> Deploy to Vault
Multiple same category -> Highest impact selected
No valid suggestions -> No Top Pick
Same input -> Same Top Pick
AI does not change numbers
Only one Top Pick
Top Pick always logical
```

Must-pass safety checks:

```text
Buffer override always works
No unsafe suggestions
All guardrails enforced
Output is deterministic
Output is structured
Output is explainable
```

---

## Related Files

Rules:

```text
rules/financial-logic-boundaries.md
rules/suggestion-engine-rules.md
rules/protocol-selection-rules.md
rules/wallet-and-custody-rules.md
rules/demo-mode-rules.md
rules/smith-ai-rules.md
```

Components:

```text
components/suggestion-card.md
components/badge.md
components/alert.md
```

Patterns:

```text
patterns/suggestion-flow.md
patterns/dashboard-layout.md
patterns/empty-loading-error-states.md
```

Content:

```text
content/suggestion-card-copy-system.md
```

---

## Claude Code Rules

Claude Code should:

- Render Top Pick from structured `is_top_pick` data.
- Preserve exactly one Top Pick.
- Use Suggestion Engine output as candidate source.
- Apply Top Pick Logic only if implementing the approved deterministic engine.
- Enforce Buffer Override.
- Enforce guardrails before Top Pick selection.
- Use category priority order.
- Use impact, urgency, and efficiency scores in the approved order.
- Return `top_pick = null` when no valid actionable suggestions exist.
- Keep Top Pick separate between Demo Mode and real wallet mode.
- Keep Top Pick card click as external protocol handoff for MVP.
- Use safe empty states when no Top Pick exists.

Claude Code must not:

- Add Top Pick to the first card automatically.
- Add Top Pick based on visual card order.
- Add Top Pick based on highest APY.
- Add Top Pick based on Smith AI text.
- Add multiple Top Pick badges.
- Make locked suggestions Top Pick.
- Make non-actionable suggestions Top Pick.
- Override Buffer Override.
- Ignore guardrails.
- Change thresholds dynamically.
- Use random or AI ranking.
- Execute transactions from Top Pick card.
- Request wallet signatures from Top Pick card click.
- Mix demo and real wallet Top Picks.

---

## Do

- Keep Top Pick deterministic.
- Keep Top Pick safety-first.
- Select from valid actionable suggestions only.
- Enforce Buffer Override.
- Use category priority.
- Rank same-category suggestions by impact, then urgency, then efficiency.
- Return structured Top Pick data.
- Highlight Top Pick visually.
- Let Smith AI explain the selected Top Pick.
- Show no Top Pick when there are no valid actions.

---

## Do Not

- Do not let UI choose Top Pick.
- Do not let Smith AI choose Top Pick.
- Do not show multiple Top Picks.
- Do not make locked cards Top Pick.
- Do not make stale cards Top Pick.
- Do not choose highest APY as Top Pick by default.
- Do not bypass Safety Buffer.
- Do not bypass guardrails.
- Do not imply Top Pick is guaranteed.
- Do not imply clicking Top Pick executes a transaction.
- Do not mix demo and real Top Picks.

---

## Done Criteria

This rule is followed when:

- Top Pick is selected by deterministic Top Pick Logic.
- Top Pick is derived from Suggestion Engine output.
- Exactly one actionable suggestion is marked Top Pick when valid actions exist.
- No Top Pick appears when no valid actionable suggestions exist.
- Buffer Override always selects buffer action when buffer is not satisfied.
- Guardrails are enforced before Top Pick selection.
- Priority hierarchy is applied before same-category ranking.
- Same-category ranking uses Impact Score, then Urgency Score, then Efficiency Score.
- UI renders `is_top_pick` but does not set it.
- Smith AI explains Top Pick but does not change it.
- Dashboard alert syncs to Top Pick without inventing new recommendation.
- Demo Top Pick and real wallet Top Pick remain separate.
- Top Pick card click opens approved protocol page in a new tab for MVP.
- Top Pick card click does not execute transactions or request signatures.

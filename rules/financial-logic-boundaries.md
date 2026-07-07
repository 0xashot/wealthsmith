# Financial Logic Boundaries

This rule file defines where financial logic is allowed to live in WealthSmith and what the UI, Smith AI, and Claude Code must never invent.

This is one of the most important WealthSmith rules.

It protects the product from inaccurate recommendations, hallucinated calculations, unsafe copy, and inconsistent user experiences.

---

## Purpose

WealthSmith must keep financial decision-making deterministic, explainable, and auditable.

The product has separate layers:

```text
Suggestion Engine = deterministic Brain
Protocol Logic = protocol/platform decision layer
Top Pick Logic = one highest-priority suggestion selector
Smith AI = explanatory Voice
UI = Renderer
```

Financial logic belongs in approved deterministic product logic.

It must not be scattered across UI components, AI-generated text, hardcoded card copy, or one-off frontend calculations.

---

## Core Hard Rule

Hard Rule:

```text
The UI must not invent financial logic.
Smith AI must not invent financial logic.
Claude Code must not invent financial logic.
```

Only approved deterministic product logic may create or change financial recommendations.

---

## What Counts as Financial Logic

Financial logic includes any logic that decides, calculates, ranks, or explains user-specific financial outcomes.

Examples:

```text
What the user should do next
Which suggestion appears
Which suggestion is Top Pick
Which protocol is recommended
Which token should be swapped
How much should be moved
Whether Safety Buffer is funded
Whether an asset is too volatile
Whether the user is overexposed
Whether an opportunity is locked
What APY to show
What estimated earnings to show
What projected growth to show
What allocation is recommended
Which assets are liquid, staked, or deployed
```

If the output influences user financial behavior, it is financial logic.

---

## Allowed Sources of Financial Truth

Financially meaningful values must come from approved sources.

Allowed sources:

```text
Wallet / on-chain data
Protocol account data
Price data
Approved token metadata
Approved protocol metadata
User saved goal settings
User onboarding answers
Suggestion Engine output
Top Pick Logic output
Protocol Logic output
Portfolio classification logic
Yield/APY data source
Projection logic
Safety Buffer logic
Canonical support/product content
```

Not allowed sources:

```text
Frontend guesswork
Hardcoded UI assumptions
Screenshot interpretation
Freeform Smith AI text
Unreviewed copy
Placeholder data shown as real
Component-local calculations
Claude Code inferred business logic
```

---

## Layer Responsibilities

### Suggestion Engine

Allowed to decide:

```text
Suggestion eligibility
Suggestion type
Suggestion priority
Suggestion ranking
Suggestion severity
Suggestion reason codes
Suggestion lock state
Suggested action type
Suggested amount or range if product logic supports it
```

Not responsible for:

```text
Natural-language persuasion
Visual card styling
Wallet connection
Transaction execution
```

---

### Top Pick Logic

Allowed to decide:

```text
Which eligible actionable suggestion is Top Pick
Whether Safety Buffer override applies
Tie-breaking between suggestions
Whether no Top Pick should appear because no actionable suggestions exist
```

Hard Rule:

```text
The UI must not choose Top Pick.
Smith AI must not choose Top Pick.
Suggestion cards must not choose Top Pick.
```

---

### Protocol Logic

Allowed to decide:

```text
Destination protocol
Protocol eligibility
Protocol exclusion
Protocol priority
Protocol URL / handoff destination
Protocol-specific action metadata
```

Hard Rule:

```text
Suggestion Engine decides what to do.
Protocol Logic decides where to go.
```

---

### Smith AI

Allowed to:

```text
Explain existing product logic
Explain why a suggestion appears
Explain Safety Buffer concepts
Explain portfolio sections
Explain goal settings
Explain support topics from canonical content
Guide onboarding conversation
Ask clarifying questions when required
Summarize structured product outputs
```

Not allowed to:

```text
Create suggestions
Rank suggestions
Choose Top Pick
Choose protocol
Invent APY
Invent estimated earnings
Invent portfolio values
Invent token eligibility
Invent user risk level
Invent saved goal settings
Invent support policy
Execute transactions
```

Hard Rule:

```text
Smith AI explains WealthSmith logic.
It does not create the financial logic.
```

---

### UI Components

Allowed to:

```text
Render structured values
Format numbers
Format percentages
Format dates
Show states from props
Show badges from structured flags
Show loading, empty, error, and disabled states
Open approved external protocol URLs when provided
```

Not allowed to:

```text
Calculate recommendations
Calculate Top Pick
Calculate Safety Buffer
Calculate Projected Growth
Calculate APY
Calculate estimated earnings
Choose protocol
Classify assets without approved logic
Create financial warning copy from scratch
Create investment instructions from UI state
```

Hard Rule:

```text
Components are renderers.
They do not own financial decisions.
```

---

### Claude Code

Allowed to:

```text
Implement approved deterministic logic when explicitly specified
Render components from structured data
Wire props and state
Format display values
Implement validation rules from product docs
Use approved assets and tokens
Implement loading/empty/error states
```

Not allowed to:

```text
Infer missing financial rules
Invent ranking formulas
Invent Safety Buffer formulas
Invent APY logic
Invent protocol selection logic
Invent token suitability rules
Invent projection assumptions
Hardcode example values as real values
Turn AI-generated text into business logic
```

Hard Rule:

```text
When financial logic is missing, Claude Code must ask for or reference approved product logic instead of inventing it.
```

---

## Values the UI May Format But Not Create

The UI may format these values when provided by product data:

```text
Portfolio value
Token balance
Token price
Monthly change
Net contributions
Safety Buffer coverage percent
Covered buffer months
Target buffer months
Projected Growth values
Current allocation
Recommended allocation
APY
Estimated earnings
Suggested action amount
Protocol name
Protocol URL
Suggestion priority label
Top Pick flag
```

Allowed UI formatting examples:

```text
35000 -> $35,000
0.82 -> 82%
2.8 -> 2.8 months
0.023 -> +2.3%
```

Not allowed:

```text
Calculate $35,000 from guessed token balances
Calculate 82% Safety Buffer coverage locally
Create APY from protocol name
Create projected growth from generic assumptions
Set Top Pick because card appears first
```

---

## Safety Buffer Boundary

Safety Buffer logic determines whether the user has enough stablecoin reserve.

The UI may render:

```text
Coverage percent
Covered months
Target months
Required buffer amount
Current stablecoin reserve
Remaining buffer gap
Buffer status
Suggested action
```

Only if product logic provides those values.

Hard Rule:

```text
The UI must not calculate Safety Buffer coverage.
Smith AI must not calculate Safety Buffer coverage from scratch.
```

Allowed:

```text
Render: 82% covered, 2.8/3 months
Render: Underfunded by $7,000
Render: Fund Safety Buffer as Top Pick if product logic says so
```

Not allowed:

```text
Income - expenses = buffer coverage
Assume 3 months for every user
Assume all USDC is available buffer without classification
Assume staked or locked stablecoins count as buffer
Assume stablecoins are risk-free
```

---

## Projected Growth Boundary

Projected Growth is modeled output.

The UI may render:

```text
Projection chart
Projected value
Timeline
Contribution assumptions
Scenario labels
Chart series
```

Only if projection logic provides those values.

Hard Rule:

```text
The UI must not create Projected Growth curves.
Smith AI must not create user-specific projections from scratch.
```

Allowed language:

```text
Modeled using your strategy settings
Estimated
Projection
Scenario
```

Not allowed language:

```text
Guaranteed growth
You will reach
Certain return
Profit forecast
Risk-free growth
```

---

## Current vs Recommended Allocation Boundary

Current allocation comes from portfolio data.

Recommended allocation comes from deterministic product logic.

The UI may render:

```text
Current allocation chart
Recommended allocation chart
Difference between current and recommended allocation
Overweight/underweight labels
```

Only if product logic provides the data.

Hard Rule:

```text
The UI must not create recommended allocation.
Smith AI must not invent recommended allocation.
```

Allowed:

```text
Render product-provided current vs recommended allocation.
Explain that current SOL exposure is above the recommended target if product logic provides that fact.
```

Not allowed:

```text
Assume Medium risk means 60% SOL and 40% USDC.
Infer recommended allocation from a screenshot.
Create allocation targets inside chart component.
```

---

## Suggestion Boundary

Suggestions must come from Suggestion Engine output.

Suggestion cards may render:

```text
Title
Reason
Priority
Severity
Badge
Action type
Suggested amount
Token source
Token destination
Protocol destination
Locked state
Top Pick flag
Estimated impact
```

Only if provided by structured suggestion data.

Hard Rule:

```text
Suggestion cards must not generate suggestions.
```

Allowed:

```text
Render a suggestion returned by the Suggestion Engine.
Open the protocol URL returned by Protocol Logic.
Show Top Pick badge when `is_top_pick = true`.
```

Not allowed:

```text
Create a suggestion because Safety Buffer looks low in the UI.
Sort suggestions locally by card label.
Add Top Pick badge to the first card by default.
Turn Smith AI text into a suggestion card.
```

---

## Top Pick Boundary

Top Pick must be determined by Top Pick Logic.

Hard Rule:

```text
When actionable suggestions exist, exactly one suggestion may be marked Top Pick.
```

The UI may:

```text
Render Top Pick badge
Place Top Pick first if structured ordering says so
Sync dashboard alert to Top Pick if product data provides it
```

The UI must not:

```text
Choose Top Pick locally
Add Top Pick to multiple cards
Hide Top Pick while showing actionable suggestions
Promote a locked suggestion to Top Pick
Use visual position alone as Top Pick
```

Smith AI must not:

```text
Declare a different Top Pick
Override Top Pick
Invent a better recommendation
```

---

## Protocol Selection Boundary

Protocol selection must come from Protocol Logic.

The UI may render:

```text
Protocol name
Protocol icon
Protocol URL
Open protocol CTA
Manage link
Estimated APY if provided
```

Hard Rule:

```text
The UI must not choose protocols.
Smith AI must not choose protocols unless Protocol Logic provides the choice.
```

Allowed:

```text
Open Jupiter when destination_protocol_id = jupiter and URL is approved metadata.
```

Not allowed:

```text
Always route swaps to Jupiter because it is common.
Always route staking to Jito because it is familiar.
Guess protocol URL from protocol name.
Hardcode unsupported protocol destinations inside card components.
```

---

## APY and Estimated Earnings Boundary

APY and earnings are financially sensitive values.

The UI may render:

```text
APY
Estimated monthly earnings
Estimated annual earnings
Yield range
Source timestamp
Protocol/source label
```

Only if provided by approved data source or product logic.

Hard Rule:

```text
The UI must not invent APY or estimated earnings.
Smith AI must not invent APY or estimated earnings.
```

Allowed language:

```text
Estimated APY
Current quoted APY
Based on available protocol data
Subject to change
```

Not allowed language:

```text
Guaranteed APY
Guaranteed earnings
Fixed return unless the product explicitly supports fixed returns
Risk-free yield
```

---

## Portfolio Classification Boundary

WealthSmith may classify positions as:

```text
Liquid Assets
Staked Assets
Yield Strategies
Stablecoin reserve
Volatile assets
Unsupported assets
Unknown assets
```

Classification must come from approved portfolio logic.

Hard Rule:

```text
The UI must not classify assets on its own.
```

Allowed:

```text
Render a position under Staked Assets when portfolio logic classifies it as staked.
Render a token icon fallback when token icon is missing.
Show unsupported asset state when product logic marks it unsupported.
```

Not allowed:

```text
Treat every token account as liquid.
Treat every stablecoin as safety buffer.
Treat every LP token as yield strategy without protocol detection.
Treat every SOL derivative as liquid SOL.
Hide unknown assets.
```

---

## Goal Settings Boundary

Goal settings are user inputs.

The Goal page may collect and save:

```text
Financial Goal
Risk Tolerance
Income
Expenses
Monthly Saving Goal
Contribution Frequency
Timeline
```

Goal settings do not themselves equal recommendations.

Hard Rule:

```text
Changing Goal settings should update recommendations only through product logic after save.
```

Allowed:

```text
Save user’s selected risk tolerance.
Trigger product recalculation after save.
Render refreshed Dashboard and Suggestions after product logic returns.
```

Not allowed:

```text
Immediately change recommendation cards from form fields alone.
Assume Medium risk means a specific token allocation.
Assume monthly saving goal should all be invested.
Generate a new Top Pick in the Goal form.
```

---

## Demo Mode Boundary

Demo Mode uses sample data.

Hard Rule:

```text
Demo data must never be mixed with real wallet data.
```

Allowed:

```text
Render demo portfolio values.
Render demo suggestions.
Explain demo data as sample data.
Exit Demo before showing real wallet data.
```

Not allowed:

```text
Use demo Safety Buffer with connected wallet positions.
Use real wallet address with demo suggestions.
Carry demo suggestions into real wallet mode.
Let Smith AI talk about demo data as if it is the user’s wallet.
```

Hard Rule:

```text
Fixture/example values must never be presented as a real connected wallet's data.
```

When a real wallet is connected:

```text
Do not show fixture Portfolio Value as the connected wallet value.
Do not show fixture Safety Buffer, Projected Growth, or Allocation as real.
Do not show fixture suggestions or Top Pick as personalized to the wallet.
Do not derive USD value, allocation, projection, Safety Buffer, or suggestions
  from wallet balances without approved pricing/product logic.
Show safe unavailable/coming-soon states instead of fixture values.
```

USD value from an APPROVED price feed is permitted (a sourced price is not an
invented one). The approved feeds are DefiLlama (`coins.llama.fi`, primary — with a
confidence score) and Jupiter (`lite-api.jup.ag/price/v3`, fallback), read
best-effort in `app/src/wallet/tokenPrices.ts`. Rules for sourced USD:

```text
USD value = sourced price × on-chain amount, ONLY when a price is returned.
Drop low-confidence prices (DefiLlama confidence below the floor) → show "—".
A position with no sourced price stays "—" (never $0, never estimated).
Label sourced values with the source + an "as of" time (prices are a snapshot).
Portfolio Value / value-based allocation are the SUM/% of priced positions only;
  exclude unpriced positions and say so.
Still never invent: APY, projections, Safety Buffer, suggestions, Top Pick.
Scope: native SOL, tokens, stables, LSTs, native stake are priced (scope A).
  Composite protocol/LP positions (Kamino, Orca, Raydium, Meteora, Hubble) are
  priced by summing sourced prices of their underlying legs, debt legs subtracting
  (scope B). If ANY leg lacks a price, the whole position shows "—" (never partial).
  A position with no known amount (e.g. Kamino cToken lending) stays "—".
```

Allowed for a real connected wallet (safe facts + sourced USD):

```text
Assets detected count
Native SOL amount (on-chain balance)
SPL token count
Recognized LST/staked token count
Recognized protocol names
Sourced USD price + value per position (approved feed; else "—")
Portfolio Value = sum of priced positions (labeled "as of", excludes unpriced)
Value-based allocation % over priced positions
Net Contributions = sourced ESTIMATE of net deposits − withdrawals (12 mo)
```

Net Contributions estimate rules (`contributionHistory.ts`):

```text
Source: Helius parsed tx history (needs a Helius RPC) + DefiLlama historical prices.
Count ONLY external TRANSFER legs: deposits (+), withdrawals (−); value each at its
  transfer-time price. Drop transfers with no sourced price (mark partial).
EXCLUDE internal moves — staking, swaps, LP — they don't change net contributions.
Label it an ESTIMATE (can't distinguish transfers between the user's own wallets).
Show "—" when there's no wallet, the RPC isn't Helius, or history can't be read.
Never fabricate a contributions figure.
```

See `patterns/wallet-connection.md` (Data Mode Separation) and
`app/src/state/portfolioDataSource.ts`.

---

## Support Content Boundary

Support content is canonical.

Smith AI may explain support content, but must not invent policy.

Hard Rule:

```text
FAQ/support content wins over Smith AI output.
```

Smith AI must not invent:

```text
Pricing
Free-tier details
Supported wallets
Supported chains
Supported protocols
Security guarantees
Roadmap promises
Legal claims
Custody claims
```

Allowed:

```text
Explain what the FAQ says.
Route user to Contact Us if unsure.
Say it does not know if canonical support content does not contain the answer.
```

---

## Copy Boundary

Financial copy must reflect structured product data.

Allowed:

```text
Based on your current plan
Suggested next action
Estimated yield
Modeled projection
Your funds stay in your wallet
No action will be taken automatically
Open protocol
Review before taking action
```

Not allowed:

```text
Guaranteed returns
Risk-free
Best investment
Perfect strategy
AI found the optimal move
We will invest for you
Funds are safe with us
Execute now
```

Hard Rule:

```text
Copy must not imply custody, automatic execution, guaranteed outcomes, or risk-free yield.
```

---

## What To Do When Data Is Missing

If required financial data is missing, show a safe state.

Use:

```text
Empty state
Partial state
Loading state
Error state
Unsupported state
Unknown state
```

Do not invent fallback values.

Examples:

```text
No suggestions yet
Complete your plan or connect a wallet to generate personalized suggestions.
```

```text
Projection unavailable
We need your timeline and contribution plan to model projected growth.
```

```text
APY unavailable
Current APY could not be loaded.
```

Rules:

- Missing values should be explicit.
- Show what is needed to complete the state.
- Do not use zeros unless zero is the real value.
- Do not silently hide important missing data.
- Do not fill missing data with demo values unless Demo Mode is active.

---

## Number Formatting Rules

UI may format numbers for display.

Allowed formatting:

```text
Currency formatting
Percentage formatting
Token quantity formatting
Date/time formatting
Compact number formatting
Positive/negative sign formatting
```

Rules:

- Formatting does not change financial meaning.
- Store raw numeric values separately from display strings.
- Do not round in a way that hides risk or materially changes meaning.
- Do not show more precision than useful.
- Do not create values from formatted text.

Example:

```json
{
  "value_raw": 35000,
  "value_display": "$35,000"
}
```

---

## Safe UI Transformations

The UI may perform non-financial transformations.

Allowed:

```text
Sort rows by a provided column when user clicks a table header
Filter visible rows locally
Paginate table rows
Collapse/expand accordions
Open/close panels
Format numbers
Show/hide content based on explicit state
```

Careful:

```text
Sorting suggestion cards
Filtering recommendations
Hiding critical alerts
Reordering Top Pick
```

Rules:

- Sorting/filtering financial rows is display behavior.
- Sorting/ranking suggestions is financial logic unless product logic explicitly provides sorting rules.
- Top Pick must not be changed by UI sorting.

---

## External Protocol Handoff Boundary

MVP action behavior:

```text
Suggestion card click opens an approved protocol page in a new tab.
Manage link opens an approved protocol page in a new tab.
```

Hard Rule:

```text
MVP handoff does not execute transactions.
MVP handoff does not request signatures.
```

Allowed:

```text
Open approved URL from protocol metadata.
Tell user they will review the action on the protocol.
```

Not allowed:

```text
Build transaction from suggestion card click.
Auto-submit swap/stake/deposit action.
Request wallet signature directly from suggestion card.
Guess external URL.
```

---

## Examples

### Good: Rendering a Suggestion

Structured data:

```json
{
  "suggestion_id": "fund_safety_buffer_usdc",
  "title": "Fund your Safety Buffer",
  "priority": 100,
  "is_top_pick": true,
  "severity": "critical",
  "reason": "Your Safety Buffer is below the target for your current expenses.",
  "action_type": "swap_to_stablecoin",
  "destination_protocol_id": "jupiter"
}
```

Allowed UI behavior:

```text
Render suggestion card.
Show Top Pick badge.
Show critical styling.
Open approved Jupiter URL when clicked.
```

Not allowed:

```text
Change destination to another protocol.
Change the reason text to a new financial claim.
Create a different Top Pick.
Calculate missing amount locally.
```

---

### Bad: UI Invents Top Pick

Bad behavior:

```text
The frontend sorts suggestion cards by severity and adds Top Pick to the first card.
```

Why it is wrong:

```text
Top Pick must come from Top Pick Logic.
Severity alone may not decide Top Pick.
Safety Buffer override and eligibility rules may apply.
```

Correct behavior:

```text
Render `is_top_pick` from structured suggestion data.
```

---

### Bad: Smith AI Invents APY

Bad behavior:

```text
Smith AI says: “You can earn around 8% APY on USDC with this strategy.”
```

Why it is wrong:

```text
APY must come from approved protocol/yield data.
```

Correct behavior:

```text
Smith AI says: “I don’t have a current APY for this opportunity. Check the protocol before taking action.”
```

or, if provided:

```text
Smith AI explains the APY value returned by product data and notes it can change.
```

---

### Good: Missing Data State

Good behavior:

```text
Projected Growth unavailable
Add your timeline and contribution plan to model projected growth.
```

Why it is right:

```text
The UI does not invent a projection.
It tells the user what is missing.
```

---

## Enforcement Checklist

Before shipping any financial screen, check:

```text
Are all financial values coming from approved data/product logic?
Are suggestions coming from the Suggestion Engine?
Is Top Pick coming from Top Pick Logic?
Is protocol choice coming from Protocol Logic?
Are APY and earnings sourced?
Is Safety Buffer sourced?
Is Projected Growth sourced?
Is recommended allocation sourced?
Is wallet data real or demo, never mixed?
Is missing data shown safely?
Does copy avoid guarantees and custody claims?
Does Smith AI explain rather than decide?
Does UI render rather than decide?
```

---

## Claude Code Rules

Claude Code should:

- Treat this file as a hard constraint.
- Render financial data from structured props/state.
- Ask for missing product logic instead of inventing it.
- Keep recommendation generation outside components.
- Use Suggestion Engine output for suggestions.
- Use Top Pick Logic output for Top Pick.
- Use Protocol Logic output for destination protocols.
- Use approved metadata for protocol URLs.
- Use safe empty/loading/error states when data is missing.
- Keep Smith AI explanatory.
- Keep demo and real data separate.

Claude Code must not:

- Invent recommendations.
- Invent Top Pick.
- Invent protocol choices.
- Invent APY.
- Invent estimated earnings.
- Invent portfolio values.
- Invent Safety Buffer coverage.
- Invent projected growth.
- Invent recommended allocation.
- Infer financial rules from screenshots.
- Hardcode sample values as real values.
- Use Smith AI text as financial truth.
- Mix demo data with real wallet data.
- Execute transactions from suggestion clicks.
- Request signatures from display components.

---

## Do

- Keep financial logic deterministic.
- Keep UI as renderer.
- Keep Smith AI as explainer.
- Keep rules centralized.
- Use structured data contracts.
- Use product-provided flags and values.
- Show safe missing-data states.
- Use calm, precise financial copy.
- Preserve user control.
- Make action handoffs clear.

---

## Do Not

- Do not calculate recommendations in UI components.
- Do not choose Top Pick in UI.
- Do not choose protocols in UI.
- Do not invent APY.
- Do not invent earnings.
- Do not invent portfolio classifications.
- Do not invent projections.
- Do not invent allocations.
- Do not treat demo data as real data.
- Do not imply WealthSmith holds funds.
- Do not imply actions execute automatically.
- Do not imply guaranteed outcomes.
- Do not ask for seed phrases or private keys.

---

## Done Criteria

This rule is followed when:

- Financial screens render structured product data.
- Components do not contain recommendation logic.
- Suggestion cards render Suggestion Engine output.
- Top Pick is determined outside the UI.
- Protocol destinations are determined outside the UI.
- APY and estimated earnings are sourced.
- Safety Buffer and Projected Growth are sourced.
- Goal page saves inputs but does not generate recommendations locally.
- Demo data and real wallet data are separate.
- Smith AI explains but does not decide.
- Missing data uses empty/loading/error states.
- Copy avoids guarantees, custody claims, and automatic execution claims.

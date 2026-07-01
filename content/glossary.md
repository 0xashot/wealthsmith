# Glossary

This file defines approved WealthSmith terminology and user-facing definitions.

Use these definitions across:

```text
UI copy
Support FAQ
Smith AI
Tooltips
Onboarding
Suggestion cards
Empty/error states
Developer implementation notes
```

Glossary terms should be simple, consistent, and safe.

They should help crypto-curious users understand WealthSmith without hiding financial, wallet, or protocol risks.

---

## Purpose

The glossary helps WealthSmith maintain consistent language.

It answers:

```text
What does this term mean?
How should we explain it to users?
Where should this term appear?
What should we avoid saying?
```

Glossary definitions must not:

```text
Guarantee returns
Claim risk-free yield
Imply custody
Imply automatic execution
Invent protocol support
Invent wallet support
Invent financial logic
Ask for wallet secrets
```

---

## Core Language Rules

Use:

```text
Estimated
Suggested
Projected
Review
Open protocol
Your funds stay in your wallet
No action will be taken automatically
Based on your current plan
```

Avoid:

```text
Guaranteed
Risk-free
Perfect
Best investment
Execute now
Trade now
We moved your funds
Funds are safe with us
Send your seed phrase
Send your private key
```

---

## WealthSmith

### Approved definition

```text
WealthSmith helps users understand their crypto portfolio, goal progress, and suggested next actions.
```

### Expanded definition

```text
WealthSmith combines wallet data, goal inputs, and deterministic product logic to show portfolio insights, Safety Buffer status, Projected Growth, and suggested next actions.
```

### Use when

```text
Explaining product purpose
Support FAQ
Onboarding intro
Demo Mode intro
```

### Avoid

```text
WealthSmith trades for you.
WealthSmith manages your funds.
WealthSmith guarantees portfolio growth.
```

---

## Smith AI

### Approved definition

```text
Smith AI is WealthSmith’s explanation and guidance assistant.
```

### Expanded definition

```text
Smith AI helps explain WealthSmith’s dashboard, suggestions, Top Pick, Safety Buffer, protocol handoffs, Demo Mode, wallet connection, and support topics.
```

### Important boundary

```text
Smith AI explains product logic. It does not create product logic.
```

### Use when

```text
Ask Smith AI panel
Support FAQ
Onboarding companion
Suggestion explanations
```

### Avoid

```text
Smith AI chooses investments.
Smith AI executes trades.
Smith AI guarantees returns.
Smith AI moves funds.
```

---

## Dashboard

### Approved definition

```text
Dashboard is the main overview of the user’s plan, portfolio status, and suggested next actions.
```

### Expanded definition

```text
Dashboard may show Financial Snapshot, Safety Buffer, Projected Growth, Current vs Recommended Allocation, Smith AI Suggestions, and Strategy Insights.
```

### Use when

```text
Navigation
Onboarding finish
Support
Empty states
```

### Avoid

```text
Dashboard is a trading terminal.
Dashboard executes your strategy.
```

---

## Portfolio

### Approved definition

```text
Portfolio shows supported wallet balances and protocol positions.
```

### Expanded definition

```text
Portfolio may include Balance Overview, Crypto Assets Allocation, Liquid Assets, Staked Assets, Yield Strategies, and Asset Deployment Overview.
```

### Use when

```text
Navigation
Portfolio page
Wallet connection
Support FAQ
```

### Avoid

```text
Portfolio shows every asset everywhere.
Portfolio guarantees complete protocol coverage.
```

---

## Goal

### Approved definition

```text
Goal contains the user’s saved plan inputs.
```

### Expanded definition

```text
Goal settings may include financial goal, risk tolerance, time horizon, income, expenses, contribution frequency, and monthly saving goal.
```

### Use when

```text
Navigation
Goal settings page
Onboarding
Projected Growth explanations
```

### Avoid

```text
Goal guarantees the user will reach the target.
Goal automatically invests user funds.
```

---

## Support

### Approved definition

```text
Support contains canonical help content and Contact Us.
```

### Expanded definition

```text
Support helps users understand WealthSmith, wallets, Demo Mode, suggestions, Smith AI, protocol handoffs, and safety basics.
```

### Use when

```text
Navigation
FAQ
Smith AI uncertainty responses
```

### Avoid

```text
Support can recover wallets.
Support can access private keys.
```

---

## Safety Buffer

### Approved definition

```text
Safety Buffer is the stablecoin reserve WealthSmith uses to prioritize protection before additional risk or yield opportunities.
```

### Expanded definition

```text
Safety Buffer compares available stablecoin reserves with the user’s target months of expenses. When it is below target, WealthSmith may prioritize buffer-funding suggestions before yield or optimization suggestions.
```

### Use when

```text
Dashboard
Suggestion cards
Smith AI explanations
Onboarding
Support FAQ
```

### Avoid

```text
Safety Buffer guarantees safety.
Safety Buffer is risk-free.
WealthSmith holds your Safety Buffer.
```

---

## Safety Buffer Target

### Approved definition

```text
Safety Buffer Target is the stablecoin reserve target based on the user’s plan inputs.
```

### Expanded definition

```text
The target is derived from saved plan data such as monthly expenses and product-defined buffer rules.
```

### Use when

```text
Safety Buffer chart
Goal settings
Smith AI explanations
```

### Avoid

```text
The UI calculates this from guesses.
The target is guaranteed protection.
```

---

## Safety Buffer Coverage

### Approved definition

```text
Safety Buffer Coverage shows how much of the target Safety Buffer is currently covered.
```

### Expanded definition

```text
Coverage may be shown as a percentage, amount, or months covered when product logic provides the value.
```

### Use when

```text
Safety Buffer card
Progress bar
Smith AI explanation
```

### Avoid

```text
Smith AI calculated this.
Frontend inferred this.
This guarantees safety.
```

---

## Top Pick

### Approved definition

```text
Top Pick is the one actionable suggestion WealthSmith marks as the highest-priority next step.
```

### Expanded definition

```text
Top Pick is selected by deterministic Top Pick Logic using eligible suggestions, priority category, guardrails, and product rules.
```

### Use when

```text
Suggestion cards
Dashboard alert
Smith AI explanations
Support FAQ
```

### Avoid

```text
Smith AI chose this.
This is guaranteed to be best.
This action will execute automatically.
```

---

## Suggestion

### Approved definition

```text
A suggestion is a product-generated next action or insight based on the user’s current plan and portfolio state.
```

### Expanded definition

```text
Suggestions come from WealthSmith’s deterministic Suggestion Engine. Smith AI can explain them, but it does not create them.
```

### Use when

```text
Dashboard
Suggestion rail
Support
Smith AI
```

### Avoid

```text
AI invented this suggestion.
Suggestions guarantee outcomes.
Suggestion clicks complete actions.
```

---

## Suggestion Engine

### Approved definition

```text
Suggestion Engine is WealthSmith’s deterministic logic for generating suggestions.
```

### Expanded definition

```text
It uses structured inputs such as wallet data, goal settings, portfolio composition, Safety Buffer status, token data, and protocol data.
```

### Use when

```text
Technical docs
Support explanations
Smith AI boundary explanations
```

### Avoid

```text
Suggestion Engine is a chatbot.
Suggestion Engine guesses recommendations.
```

---

## Top Pick Logic

### Approved definition

```text
Top Pick Logic selects the highest-priority actionable suggestion from eligible suggestions.
```

### Expanded definition

```text
It applies guardrails and ranking rules so WealthSmith shows one clear next action when a valid actionable suggestion exists.
```

### Use when

```text
Support FAQ
Smith AI explanations
Rules docs
```

### Avoid

```text
Top Pick is manually chosen by UI.
Smith AI can override Top Pick.
```

---

## Protocol Logic

### Approved definition

```text
Protocol Logic selects the approved external protocol destination for a suggestion.
```

### Expanded definition

```text
The Suggestion Engine decides what action may be useful. Protocol Logic decides where the user can review that action.
```

### Use when

```text
Protocol handoff explanations
Support FAQ
Technical docs
```

### Avoid

```text
UI chooses the protocol.
Smith AI chooses the protocol.
Protocol choice is based only on highest APY.
```

---

## Protocol Handoff

### Approved definition

```text
A protocol handoff opens an approved external protocol page so the user can review an action outside WealthSmith.
```

### Expanded definition

```text
In MVP, protocol handoff opens a new tab. It does not execute a transaction, move funds, or mark a suggestion complete.
```

### Use when

```text
Suggestion CTAs
Tooltips
Smith AI explanations
Support FAQ
```

### Avoid

```text
WealthSmith completed the action.
Trade submitted.
Funds moved.
```

---

## Open Protocol

### Approved definition

```text
Open protocol means opening an external protocol page for review.
```

### Use when

```text
Generic suggestion CTA
Fallback CTA when protocol label is unavailable but destination is approved
```

### Avoid

```text
Execute action.
Submit transaction.
```

---

## Review on {Protocol}

### Approved definition

```text
Review on {Protocol} means opening the selected external protocol so the user can review the suggested action there.
```

### Use when

```text
Suggestion cards with a known protocol destination
```

### Avoid

```text
Swap now.
Stake now.
Deposit now.
```

---

## Manage on {Protocol}

### Approved definition

```text
Manage on {Protocol} opens the external protocol where an existing detected position can be reviewed.
```

### Use when

```text
Portfolio positions
Staked Assets table
Yield Strategies table
Existing protocol position management
```

### Avoid

```text
WealthSmith manages this position.
WealthSmith has completed the action.
```

---

## Non-Custodial

### Approved definition

```text
Non-custodial means WealthSmith does not hold the user’s funds or private keys.
```

### Expanded definition

```text
The user’s funds stay in their wallet. WealthSmith can read supported wallet and protocol data, but it does not move funds.
```

### Use when

```text
Wallet connection
Support FAQ
Smith AI
Security copy
```

### Avoid

```text
Your funds are safe with WealthSmith.
WealthSmith protects your funds.
```

---

## Read-Only Wallet Connection

### Approved definition

```text
Read-only wallet connection lets WealthSmith read supported balances and positions without permission to move funds.
```

### Expanded definition

```text
Read-only access helps WealthSmith show the user’s portfolio and suggestions. It does not authorize trades, staking, deposits, withdrawals, or rebalancing.
```

### Use when

```text
Connect Wallet modal
Wallet FAQ
Smith AI wallet explanation
```

### Avoid

```text
Give WealthSmith access to your funds.
Authorize asset management.
```

---

## Wallet

### Approved definition

```text
A wallet is the user’s crypto account used to hold and access assets.
```

### Expanded definition

```text
WealthSmith can connect to supported wallets to read public balances and positions, but the user’s funds stay in the wallet.
```

### Use when

```text
Wallet connection
Support
Onboarding
```

### Avoid

```text
Wallet connection gives WealthSmith control.
```

---

## Wallet Pill

### Approved definition

```text
Wallet Pill is the compact connected-wallet indicator in the Global Nav.
```

### Format

```text
{Wallet Provider} • {short address}
```

Example:

```text
Phantom • 6fQ9
```

### Use when

```text
Global Nav
Connected wallet state
```

### Avoid

```text
Showing full address by default in Global Nav.
Showing wallet pill in Demo Mode.
```

---

## Seed Phrase

### Approved definition

```text
A seed phrase is a secret recovery phrase that controls access to a wallet.
```

### Safety copy

```text
Never share your seed phrase.
```

### Use when

```text
Wallet safety
Support
Contact Us warning
Smith AI safety response
```

### Avoid

```text
Paste your seed phrase.
Upload your recovery phrase.
```

---

## Private Key

### Approved definition

```text
A private key is a secret credential that can control wallet funds.
```

### Safety copy

```text
Never share your private key.
```

### Use when

```text
Wallet safety
Support
Contact Us warning
Smith AI
```

### Avoid

```text
Send your private key.
Export your private key for support.
```

---

## Message Signing

### Approved definition

```text
Message signing can confirm wallet ownership.
```

### Expanded definition

```text
A message signature is not a transaction and should not move funds.
```

### Use when

```text
Wallet connection explanation if message signing is required
Ledger/hardware wallet support explanation
```

### Avoid

```text
Message signing executes a trade.
This signature is always safe.
```

---

## Transaction Signing

### Approved definition

```text
Transaction signing can approve an on-chain action.
```

### Expanded definition

```text
WealthSmith MVP suggestion cards do not execute transactions or request transaction signatures.
```

### Use when

```text
Wallet FAQ
Protocol handoff explanation
Smith AI safety explanation
```

### Avoid

```text
All signatures are harmless.
Suggestion clicks request transaction signatures.
```

---

## Demo Mode

### Approved definition

```text
Demo Mode lets users explore WealthSmith with sample data before connecting a wallet.
```

### Expanded definition

```text
Demo Mode uses a sample portfolio, sample suggestions, and sample Smith AI explanations. It does not use real wallet data.
```

### Use when

```text
Global Nav pre-wallet state
Demo banner
Onboarding
Support
Smith AI
```

### Avoid

```text
Demo Mode is personalized.
Demo Mode reads your wallet.
Demo suggestions are real recommendations.
```

---

## Sample Portfolio

### Approved definition

```text
Sample Portfolio is the demo portfolio used in Demo Mode.
```

### Expanded definition

```text
It is sample data designed to show how WealthSmith works. It is not the user’s real wallet.
```

### Use when

```text
Demo Mode
Portfolio page in demo
Smith AI demo explanations
```

### Avoid

```text
Your real portfolio.
Your wallet holdings.
```

---

## Sample Suggestions

### Approved definition

```text
Sample Suggestions are demo suggestions based on sample data.
```

### Expanded definition

```text
They show how WealthSmith suggestions work. They are not recommendations for the user’s real wallet.
```

### Use when

```text
Demo Mode suggestion rail
Smith AI demo explanations
```

### Avoid

```text
Personalized recommendation.
You should take this action.
```

---

## Financial Goal

### Approved definition

```text
Financial Goal is the user’s selected planning objective.
```

### Examples

```text
Build Long-Term Wealth
Preserve Capital
Generate Yield
Grow Aggressively
```

### Use when

```text
Onboarding
Goal settings
Dashboard explanations
```

### Avoid

```text
Financial Goal guarantees an outcome.
```

---

## Risk Tolerance

### Approved definition

```text
Risk Tolerance describes how much volatility the user is comfortable with for the plan.
```

### Examples

```text
Low
Medium
High
```

### Use when

```text
Onboarding
Goal settings
Current vs Recommended Allocation
Suggestions
```

### Avoid

```text
Low risk means no risk.
High risk guarantees higher returns.
```

---

## Time Horizon

### Approved definition

```text
Time Horizon is how long the user expects the plan to run.
```

### Use when

```text
Onboarding
Goal settings
Projected Growth
Suggestion logic
```

### Avoid

```text
Longer timeline guarantees success.
Short timeline means no investing.
```

---

## Monthly Income

### Approved definition

```text
Monthly Income is the user’s approximate average income per month.
```

### Use when

```text
Onboarding
Goal settings
Plan context
```

### Avoid

```text
All income should be invested.
Income value is judged by WealthSmith.
```

---

## Monthly Expenses

### Approved definition

```text
Monthly Expenses are the user’s approximate average expenses per month.
```

### Use when

```text
Onboarding
Goal settings
Safety Buffer
```

### Avoid

```text
Expenses are good or bad.
WealthSmith judges spending.
```

---

## Monthly Saving Goal

### Approved definition

```text
Monthly Saving Goal is the amount the user hopes to set aside each month.
```

### Expanded definition

```text
It is optional and helps WealthSmith model contribution plans. It does not create automatic deposits or investments.
```

### Use when

```text
Onboarding
Goal settings
Projected Growth
```

### Avoid

```text
WealthSmith will invest this amount automatically.
All savings should be deployed.
```

---

## Contribution Frequency

### Approved definition

```text
Contribution Frequency is how often the user expects to add funds to the plan.
```

### Examples

```text
Weekly
Monthly
Quarterly
Irregular
Not sure yet
```

### Use when

```text
Onboarding
Goal settings
Projected Growth
```

### Avoid

```text
Contribution frequency creates automatic deposits.
```

---

## Projected Growth

### Approved definition

```text
Projected Growth is a modeled view of how the plan may change over time.
```

### Expanded definition

```text
Projected Growth uses saved plan settings and product assumptions. It is not a guarantee.
```

### Use when

```text
Dashboard chart
Goal explanations
Smith AI
```

### Avoid

```text
Guaranteed growth.
You will reach this number.
```

---

## Current vs Recommended Allocation

### Approved definition

```text
Current vs Recommended Allocation compares the user’s current portfolio mix with WealthSmith’s target allocation for the saved plan.
```

### Expanded definition

```text
Current allocation comes from portfolio data. Recommended allocation comes from product logic based on the user’s plan.
```

### Use when

```text
Dashboard
Allocation chart
Suggestion explanations
```

### Avoid

```text
UI guessed the recommendation.
This allocation guarantees better results.
```

---

## Current Allocation

### Approved definition

```text
Current Allocation is the portfolio mix based on loaded wallet and position data.
```

### Use when

```text
Allocation chart
Portfolio explanations
```

### Avoid

```text
Current allocation includes unsupported assets unless product data confirms it.
```

---

## Recommended Allocation

### Approved definition

```text
Recommended Allocation is the target portfolio mix generated by WealthSmith product logic for the user’s saved plan.
```

### Use when

```text
Dashboard
Suggestions
Risk alignment explanations
```

### Avoid

```text
Recommended Allocation is guaranteed optimal.
Frontend creates recommended allocation.
```

---

## Financial Snapshot

### Approved definition

```text
Financial Snapshot summarizes key portfolio and plan metrics.
```

### Use when

```text
Dashboard
Metric cards
Smith AI explanations
```

### Avoid

```text
Snapshot guarantees performance.
```

---

## Liquid Assets

### Approved definition

```text
Liquid Assets are supported tokens held directly in the wallet and not currently shown as staked assets or yield strategy positions.
```

### Use when

```text
Portfolio page
Asset Deployment Overview
Support
```

### Avoid

```text
Liquid means risk-free.
Liquid means all assets can always be sold instantly.
```

---

## Staked Assets

### Approved definition

```text
Staked Assets are supported assets detected in staking-related positions.
```

### Expanded definition

```text
They may include liquid staking tokens or supported protocol-detected staking positions.
```

### Use when

```text
Portfolio page
Staked Assets table
Support
Suggestion explanations
```

### Avoid

```text
All staked assets are guaranteed yield.
WealthSmith stakes these assets.
```

---

## Yield Strategies

### Approved definition

```text
Yield Strategies are supported protocol positions where assets are deployed in strategies such as lending, vaults, or liquidity positions.
```

### Expanded definition

```text
Yield data, APY, and estimated earnings must come from approved data sources and may change.
```

### Use when

```text
Portfolio page
Yield Strategies table
Suggestions
Support
```

### Avoid

```text
Yield strategies are risk-free.
APY is guaranteed.
WealthSmith deposits funds into these strategies.
```

---

## APY

### Approved definition

```text
APY is an annualized percentage yield estimate.
```

### Expanded definition

```text
APY can change and should not be treated as guaranteed.
```

### Use when

```text
Yield strategies
Suggestion cards
Tooltips
Support
Smith AI
```

### Avoid

```text
Guaranteed APY.
Fixed APY unless source confirms fixed.
Risk-free APY.
```

---

## Estimated Earnings

### Approved definition

```text
Estimated Earnings are modeled potential earnings based on available yield data.
```

### Expanded definition

```text
Estimated Earnings can change as APY, prices, and positions change.
```

### Use when

```text
Portfolio yield tables
Suggestion impact text
Smith AI explanations
```

### Avoid

```text
Guaranteed earnings.
WealthSmith promises this return.
```

---

## Estimated

### Approved definition

```text
Estimated means the value is based on available data and may change.
```

### Use when

```text
APY
Earnings
Projected Growth
Suggestion impact
```

### Avoid

```text
Treating estimates as guaranteed.
```

---

## Stale Data

### Approved definition

```text
Stale Data is data that exists but may be outdated.
```

### Use when

```text
Dashboard
Portfolio
Suggestions
APY
Smith AI
```

### Avoid

```text
Showing stale data as current.
Using stale Top Pick as active.
```

---

## Partial Data

### Approved definition

```text
Partial Data means some data loaded, but some sections or integrations are unavailable.
```

### Use when

```text
Portfolio loading
Protocol failures
Dashboard partial state
```

### Avoid

```text
Hiding everything when some data is usable.
Filling missing values with fake data.
```

---

## Unsupported Asset

### Approved definition

```text
Unsupported Asset is an asset WealthSmith cannot fully classify or support yet.
```

### Use when

```text
Portfolio
Token fallback states
Support
```

### Avoid

```text
Unsupported asset has zero value unless product data confirms it.
```

---

## Unsupported Protocol

### Approved definition

```text
Unsupported Protocol is a protocol WealthSmith does not support in MVP.
```

### Use when

```text
Portfolio protocol detection
Protocol handoff error
Support
```

### Avoid

```text
Claiming future support without approved roadmap copy.
```

---

## Locked Suggestion

### Approved definition

```text
Locked Suggestion is a suggestion that is visible but not currently actionable because a higher-priority condition must be resolved first.
```

### Example

```text
Unlock after your Safety Buffer is fully funded.
```

### Use when

```text
Suggestion rail
Yield opportunities blocked by Safety Buffer
Smith AI explanations
```

### Avoid

```text
You are not allowed.
WealthSmith is blocking you.
```

---

## Disabled Suggestion

### Approved definition

```text
Disabled Suggestion is a suggestion that cannot be acted on right now because it fails an eligibility or guardrail condition.
```

### Examples

```text
Transaction cost is too high.
Liquidity is too low.
Position is below minimum size.
```

### Use when

```text
Suggestion card
Smith AI explanation
```

### Avoid

```text
Inventing workaround.
Opening unsupported protocol anyway.
```

---

## Actionable Suggestion

### Approved definition

```text
Actionable Suggestion is a suggestion that has passed product eligibility checks and can show a valid next step.
```

### Use when

```text
Suggestion Engine
Top Pick Logic
Suggestion cards
```

### Avoid

```text
Treating locked or disabled cards as actionable.
```

---

## Strategy Insight

### Approved definition

```text
Strategy Insight is an informational explanation about the user’s plan or portfolio.
```

### Expanded definition

```text
Strategy Insights can help users understand context, but they are not the same as actionable suggestions.
```

### Use when

```text
Dashboard
Smith AI Strategy Insights
Support
```

### Avoid

```text
Treating every insight as a trade recommendation.
```

---

## Rebalance

### Approved definition

```text
Rebalance means adjusting portfolio exposure to move closer to the target allocation.
```

### Expanded definition

```text
In MVP, WealthSmith may suggest a rebalance and open a protocol for review, but it does not execute the rebalance automatically.
```

### Use when

```text
Suggestions
Allocation explanations
Support
```

### Avoid

```text
WealthSmith rebalanced your portfolio.
Rebalance guarantees lower risk.
```

---

## Swap

### Approved definition

```text
Swap means exchanging one token for another.
```

### Expanded definition

```text
In MVP, WealthSmith may open an external protocol for review, but it does not execute swaps inside WealthSmith.
```

### Use when

```text
Suggestion cards
Protocol handoffs
Support
```

### Avoid

```text
Swap now.
Trade executed.
```

---

## Stake

### Approved definition

```text
Stake means putting an asset into a staking-related mechanism to seek yield or network-related rewards.
```

### Expanded definition

```text
Staking can carry risks and yield can change. WealthSmith MVP does not stake assets for the user.
```

### Use when

```text
Staked Assets
Suggestions
Support
```

### Avoid

```text
Guaranteed passive income.
Risk-free staking.
WealthSmith staked your SOL.
```

---

## Vault

### Approved definition

```text
Vault is a protocol strategy where assets may be deposited according to that protocol’s rules.
```

### Expanded definition

```text
Vault opportunities can involve risk, changing APY, and protocol-specific conditions.
```

### Use when

```text
Yield Strategies
Suggestions
Protocol handoffs
```

### Avoid

```text
Guaranteed vault return.
WealthSmith deposits for you.
```

---

## Liquidity Position

### Approved definition

```text
Liquidity Position is a protocol position where assets are supplied to support trading or liquidity.
```

### Expanded definition

```text
Liquidity positions may earn fees or yield, but they can involve risks such as price movement or impermanent loss.
```

### Use when

```text
Yield Strategies
Portfolio
Support
```

### Avoid

```text
Liquidity fees are guaranteed.
LP is risk-free.
```

---

## DCA

### Approved definition

```text
DCA means gradually buying over time instead of all at once.
```

### Expanded definition

```text
DCA can spread entry timing, but it does not guarantee better results.
```

### Use when

```text
Suggestions
Support
Smith AI explanation
```

### Avoid

```text
DCA guarantees better price.
DCA removes risk.
```

---

## Trim

### Approved definition

```text
Trim means reducing exposure to an asset.
```

### Expanded definition

```text
WealthSmith may suggest trimming when an asset is overweight, highly concentrated, or outside the user’s plan.
```

### Use when

```text
Suggestions
Risk explanations
```

### Avoid

```text
Calling the asset bad.
Shaming the user.
Saying trim is mandatory.
```

---

## Stablecoin

### Approved definition

```text
A stablecoin is a crypto asset designed to track a stable value, often a fiat currency like USD.
```

### Expanded definition

```text
Stablecoins can still carry risk and should not be described as risk-free.
```

### Use when

```text
Safety Buffer
Portfolio
Suggestions
Support
```

### Avoid

```text
Stablecoins are risk-free.
Stablecoins guarantee safety.
```

---

## Volatile Asset

### Approved definition

```text
A volatile asset is an asset that can change significantly in value.
```

### Use when

```text
Risk explanations
Allocation
Suggestion reasons
```

### Avoid

```text
Volatile assets are bad.
Volatility always means danger.
```

---

## Protocol

### Approved definition

```text
A protocol is an external crypto platform or system where users may review or manage actions.
```

### Use when

```text
Protocol handoffs
Portfolio positions
Support
```

### Avoid

```text
WealthSmith controls the protocol.
All protocols are safe.
```

---

## Supported MVP Protocols

### Approved list

```text
Hubble
Jito
Jupiter
Kamino
Marinade
Meteora
Ondo
Orca
Raydium
Sanctum
```

### Use when

```text
Support FAQ
Protocol metadata
Protocol icons
Implementation docs
```

### Avoid

```text
Adding unsupported protocols in UI copy.
Claiming BlazeStake support unless approved later.
```

---

## Supported MVP Wallets

### Approved list

```text
Phantom
Solflare
Backpack
```

### Use when

```text
Connect Wallet modal
Support FAQ
Wallet error copy
```

### Avoid

```text
Claiming unsupported wallets are available.
```

---

## New Tab

### Approved definition

```text
New tab means the external protocol opens outside the current WealthSmith page.
```

### Use when

```text
Protocol handoffs
Accessibility labels
Tooltips
```

### Avoid

```text
New tab completes the action.
```

---

## Contact Us

### Approved definition

```text
Contact Us is the support form users can use to send a help request.
```

### Safety reminder

```text
Do not include seed phrases, private keys, passwords, or wallet backup files.
```

### Use when

```text
Support
Smith AI uncertainty
Contact modal
```

### Avoid

```text
Send secrets for troubleshooting.
Support can recover wallets.
```

---

## Canonical Support Content

### Approved definition

```text
Canonical Support Content is the approved source of truth for product help answers.
```

### Use when

```text
Smith AI support answers
Support FAQ
Implementation docs
```

### Avoid

```text
Smith AI inventing policy when FAQ content is missing.
```

---

## Content ID

### Approved definition

```text
Content ID is a stable key used to reference approved copy in implementation.
```

### Example

```text
wallet.connect.cta
demo.banner.title
suggestion.buffer.title
```

### Use when

```text
Engineering implementation
Localization readiness
Reusable copy
```

### Avoid

```text
Hardcoding repeated state-dependent copy in components.
```

---

## Glossary Tooltip Guidance

Use glossary definitions for tooltips only when short enough.

Good tooltip:

```text
Estimated APY can change.
```

Good tooltip:

```text
Top Pick is the highest-priority actionable suggestion right now.
```

Avoid tooltip:

```text
Long paragraphs explaining complete product logic.
```

Rules:

- Tooltips should clarify, not replace support content.
- Do not hide critical warnings only in tooltips.
- Keep glossary-based tooltips concise.

---

## Glossary Copy Map

Recommended content IDs:

```json
{
  "glossary.wealthsmith": "WealthSmith helps users understand their crypto portfolio, goal progress, and suggested next actions.",
  "glossary.smith_ai": "Smith AI is WealthSmith’s explanation and guidance assistant.",
  "glossary.safety_buffer": "Safety Buffer is the stablecoin reserve WealthSmith uses to prioritize protection before additional risk or yield opportunities.",
  "glossary.top_pick": "Top Pick is the one actionable suggestion WealthSmith marks as the highest-priority next step.",
  "glossary.suggestion": "A suggestion is a product-generated next action or insight based on the user’s current plan and portfolio state.",
  "glossary.protocol_handoff": "A protocol handoff opens an approved external protocol page so the user can review an action outside WealthSmith.",
  "glossary.non_custodial": "Non-custodial means WealthSmith does not hold the user’s funds or private keys.",
  "glossary.demo_mode": "Demo Mode lets users explore WealthSmith with sample data before connecting a wallet.",
  "glossary.projected_growth": "Projected Growth is a modeled view of how the plan may change over time.",
  "glossary.liquid_assets": "Liquid Assets are supported tokens held directly in the wallet and not currently shown as staked assets or yield strategy positions.",
  "glossary.staked_assets": "Staked Assets are supported assets detected in staking-related positions.",
  "glossary.yield_strategies": "Yield Strategies are supported protocol positions where assets are deployed in strategies such as lending, vaults, or liquidity positions.",
  "glossary.apy": "APY is an annualized percentage yield estimate.",
  "glossary.estimated_earnings": "Estimated Earnings are modeled potential earnings based on available yield data."
}
```

Rules:

- Content IDs should remain stable.
- Keep definitions aligned with support and UI copy.
- Update glossary when product terminology changes.

---

## Forbidden Glossary Language

Do not define terms using:

```text
Guaranteed returns
Risk-free yield
Perfect strategy
Best investment
AI decides
AI trades for you
WealthSmith manages your money
WealthSmith protects your funds
Funds are safe with us
Automatic rebalance
Trade executed
Send your seed phrase
Send your private key
```

Use safer alternatives:

```text
Estimated
Suggested
Projected
Review
External protocol
No action will be taken automatically
Your funds stay in your wallet
```

---

## QA Checklist

Before shipping glossary definitions, verify:

```text
Is each definition beginner-friendly?
Is each definition consistent with rules?
Does each definition avoid guarantees?
Does each definition avoid custody claims?
Does each definition avoid execution claims?
Does wallet/security copy avoid asking for secrets?
Does Demo Mode clearly say sample data?
Does Smith AI clearly explain rather than decide?
Does APY/yield copy say values can change?
Does protocol handoff copy say external review?
Do definitions match Support FAQ and UI copy?
```

---

## Related Files

Content:

```text
content/voice-and-tone.md
content/ui-copy-rules.md
content/suggestion-card-copy.md
content/smith-ai-copy.md
content/support-faq-content.md
content/empty-error-loading-copy.md
content/wallet-copy.md
content/demo-mode-copy.md
content/onboarding-copy.md
```

Rules:

```text
rules/financial-logic-boundaries.md
rules/suggestion-engine-rules.md
rules/top-pick-rules.md
rules/protocol-selection-rules.md
rules/wallet-and-custody-rules.md
rules/smith-ai-rules.md
rules/demo-mode-rules.md
rules/loading-state-rules.md
```

Patterns:

```text
patterns/dashboard-layout.md
patterns/suggestion-flow.md
patterns/portfolio-overview.md
patterns/wallet-connection.md
patterns/support-center.md
patterns/goal-settings.md
```

---

## Claude Code Rules

Claude Code should:

- Use glossary terms consistently.
- Use glossary definitions for tooltips and support explanations when appropriate.
- Keep definitions beginner-friendly.
- Keep Smith AI explanations aligned with glossary.
- Keep wallet and protocol terms safe.
- Use approved protocol and wallet names only.
- Preserve Demo Mode vs real wallet distinction.
- Update glossary references when content IDs change.

Claude Code must not:

- Invent alternate meanings for product terms.
- Rename core concepts casually.
- Define APY/yield as guaranteed.
- Define Safety Buffer as risk-free.
- Define protocol handoff as execution.
- Define Smith AI as the recommendation engine.
- Define WealthSmith as custodial.
- Ask for seed phrases/private keys.
- Add unsupported protocols or wallets.

---

## Do

- Use approved terms.
- Keep definitions short.
- Explain jargon.
- Mention estimates where needed.
- Mention user control where needed.
- Mention sample data in Demo Mode.
- Mention external review for protocol handoffs.
- Mention non-custodial wallet behavior.

---

## Do Not

- Do not hype.
- Do not overpromise.
- Do not guarantee.
- Do not imply custody.
- Do not imply automatic execution.
- Do not hide risk.
- Do not use unsupported terms.
- Do not mix demo and real data.
- Do not ask for secrets.

---

## Done Criteria

The glossary is MVP-ready when:

- Core WealthSmith product concepts are defined.
- Wallet and custody terms are defined safely.
- Suggestion, Top Pick, and protocol logic terms are defined.
- Portfolio sections are defined.
- APY, yield, and estimated earnings are defined without guarantees.
- Demo Mode and sample data terms are defined.
- Supported MVP wallets and protocols are listed.
- Definitions align with UI copy, Support FAQ, Smith AI copy, and product rules.
- Claude Code can reuse terms without inventing alternate meanings.

# Support FAQ Content

This file defines canonical FAQ and support answers for WealthSmith.

Support FAQ content is the source of truth for support-facing product explanations.

Smith AI may explain or summarize these answers, but it must not invent support policy.

---

## Purpose

The Support page should help users understand:

```text
What WealthSmith is
How wallet connection works
What Demo Mode is
How suggestions are generated
What Top Pick means
What Safety Buffer means
What Smith AI can and cannot do
What protocol handoffs mean
What data WealthSmith reads
What WealthSmith does not do
How to get help
```

Support content must be:

```text
Clear
Canonical
Non-hype
Non-custodial
Beginner-friendly
Consistent with product rules
Safe for wallet users
```

---

## Core Hard Rules

Hard Rule:

```text
FAQ content is canonical.
Smith AI must not invent support policy.
```

Hard Rule:

```text
Support content must never ask for seed phrases, private keys, passwords, or wallet backup files.
```

Hard Rule:

```text
Support content must not imply WealthSmith holds funds, executes trades, guarantees returns, or provides risk-free yield.
```

Hard Rule:

```text
When product support is unknown or not approved, do not claim it is supported.
```

---

## Support Page Sections

Recommended MVP FAQ sections:

```text
Getting Started
Wallet
Demo Mode
Safety Buffer
Suggestions
Top Pick
Smith AI
Portfolio
Protocols
Security
Contact Us
```

---

# Getting Started

## What is WealthSmith?

WealthSmith helps users understand their crypto portfolio, goal progress, and suggested next actions.

It combines portfolio data, goal inputs, and deterministic product logic to show insights such as Safety Buffer, Projected Growth, Current vs Recommended Allocation, and Smith AI Suggestions.

WealthSmith is designed to explain what it shows and why.

It does not automatically move funds or execute trades for users.

---

## Who is WealthSmith for?

WealthSmith is for crypto users who want a clearer view of their portfolio and a more structured way to think about goals, risk, stablecoin reserves, and yield opportunities.

It is especially useful for users who want guidance without giving up control of their wallet.

---

## Does WealthSmith make trades for me?

No.

In the MVP, WealthSmith shows suggestions and external protocol handoffs.

When a suggestion has a protocol destination, WealthSmith opens the relevant protocol page in a new tab so you can review the action externally.

WealthSmith does not execute trades, stake tokens, deposit funds, withdraw funds, or move assets for you.

---

## Does WealthSmith hold my funds?

No.

WealthSmith is non-custodial.

Your funds stay in your wallet.

WealthSmith does not hold your crypto, private keys, seed phrase, or wallet backup files.

---

## Can I use WealthSmith without connecting a wallet?

Yes.

You can use Demo Mode to explore WealthSmith with sample data before connecting a wallet.

Demo Mode does not use your real wallet data.

To personalize WealthSmith with your actual portfolio, you need to connect a supported wallet.

---

# Wallet

## Why connect a wallet?

Connecting a wallet lets WealthSmith read supported balances and positions so it can personalize your Dashboard, Portfolio, and Suggestions.

Your funds stay in your wallet.

Wallet connection does not mean WealthSmith can move your funds.

---

## Which wallets are supported in MVP?

Supported MVP wallets:

```text
Phantom
Solflare
Backpack
```

Rules:

- Do not claim unsupported wallets are available.
- Do not imply wallet support beyond approved product scope.
- If wallet support changes, update this FAQ and wallet metadata together.

---

## Does connecting a wallet move funds?

No.

Connecting a wallet lets WealthSmith read supported wallet and portfolio data.

It does not move funds.

It does not authorize WealthSmith to trade, stake, deposit, withdraw, or rebalance for you.

---

## Does WealthSmith ask for my seed phrase or private key?

No.

WealthSmith will never ask for your seed phrase, private key, password, or wallet backup file.

Never share these with anyone.

If a support request asks for them, it is not a valid WealthSmith request.

---

## What wallet information does WealthSmith use?

WealthSmith may use supported wallet and protocol data such as:

```text
Public wallet address
Token balances
Supported token accounts
Supported staked positions
Supported yield strategy positions
Supported protocol positions
Portfolio composition
```

WealthSmith uses this information to render your portfolio and generate product suggestions through deterministic logic.

---

## What does read-only wallet connection mean?

Read-only means WealthSmith uses public wallet and supported protocol data to show your portfolio and suggestions.

It does not give WealthSmith permission to move funds.

It does not mean WealthSmith can trade, stake, deposit, withdraw, or rebalance for you.

---

## What is message signing?

A message signature can be used to confirm wallet ownership.

A message signature is not a transaction and should not move funds.

If the product asks for a message signature, the UI should explain why.

WealthSmith should avoid blocking basic read-only portfolio viewing when possible.

---

## Is message signing the same as transaction signing?

No.

Message signing can confirm wallet ownership.

Transaction signing can approve an on-chain action.

WealthSmith MVP suggestion cards do not execute transactions or request transaction signatures.

---

## What should I do if my hardware wallet has trouble connecting?

Some hardware wallets handle message signing differently.

Make sure your wallet and device are connected correctly, and follow the wallet provider’s instructions.

Never share your seed phrase or private key.

If the issue continues, contact support and describe the wallet provider, device type, and error message.

Do not include seed phrases, private keys, passwords, or wallet backup files.

---

## Can I track someone else’s wallet?

WealthSmith may support viewing public wallet data when a public address is provided, depending on product flow.

Public wallet data can be read from the blockchain, but suggestions and goal personalization require the right product context.

Do not treat another wallet as your own connected wallet unless the product clearly marks it that way.

---

## What happens when I disconnect my wallet?

Disconnecting removes the active wallet connection from the current WealthSmith experience.

It does not move funds.

It does not affect your wallet balances.

It does not undo any actions you may have taken externally on protocols.

---

# Demo Mode

## What is Demo Mode?

Demo Mode lets you explore WealthSmith with sample data before connecting a wallet.

It shows a sample portfolio, sample suggestions, and sample Smith AI explanations.

Demo Mode does not use your real wallet data.

---

## Is Demo Mode personalized?

No.

Demo Mode uses sample data.

It is designed to show how WealthSmith works, not to give real wallet recommendations.

---

## Does Demo Mode connect my wallet?

No.

Demo Mode does not connect a wallet.

It does not read your wallet.

It does not request a wallet signature.

---

## Are Demo Mode suggestions real recommendations?

No.

Demo Mode suggestions are sample suggestions based on sample data.

They should not be treated as recommendations for your real wallet.

---

## What happens when I exit Demo Mode?

Exiting Demo Mode clears the sample portfolio, sample suggestions, demo Top Pick, and demo Smith AI context.

You can then connect a wallet or start Demo Mode again.

Exiting Demo Mode does not delete real wallet data or move funds.

---

## What happens if I connect a wallet from Demo Mode?

When you connect a wallet from Demo Mode, WealthSmith should clear demo data, load real wallet data, and generate real wallet suggestions through product logic.

Demo suggestions must not carry into real wallet mode.

---

# Safety Buffer

## What is Safety Buffer?

Safety Buffer is the stablecoin reserve WealthSmith uses to help prioritize protection before additional risk or yield opportunities.

It compares available stablecoin reserves with the user’s target months of expenses.

---

## Why does WealthSmith prioritize Safety Buffer?

WealthSmith prioritizes Safety Buffer because it represents the baseline reserve for the user’s plan.

When the Safety Buffer is below target, WealthSmith may prioritize stablecoin reserve actions and lock additional yield or risk-taking suggestions until the buffer is funded.

---

## Does Safety Buffer mean my funds are guaranteed safe?

No.

Safety Buffer is a planning concept.

It does not guarantee safety, returns, stability, or protection from market risk.

Stablecoins can also carry risk.

---

## What happens if my Safety Buffer is underfunded?

If your Safety Buffer is underfunded, WealthSmith may show a buffer-funding suggestion as the highest-priority action.

Yield opportunities or additional volatile deployments may be locked until the Safety Buffer reaches target.

---

## What happens after my Safety Buffer is funded?

After your Safety Buffer is funded, WealthSmith may consider other suggestions such as portfolio alignment, staking, or yield opportunities if they fit your goal, risk profile, and portfolio state.

Funding the Safety Buffer does not guarantee that yield suggestions will appear.

---

# Suggestions

## How are suggestions generated?

Suggestions are generated by WealthSmith’s deterministic Suggestion Engine.

The Suggestion Engine uses structured inputs such as goal settings, wallet data, portfolio composition, Safety Buffer status, token data, and protocol-related data.

Smith AI explains suggestions, but it does not create them.

---

## Does Smith AI generate suggestions?

No.

Smith AI explains suggestions.

It does not generate recommendations, choose Top Pick, select protocols, calculate APY, or decide what action is best.

---

## Why do I see a suggestion?

Each suggestion appears because product logic detected a specific condition.

Examples include:

```text
Safety Buffer below target
Portfolio above target volatile exposure
One asset overweight
Idle stablecoins
Unstaked assets
Existing yield strategy to review
```

The suggestion card should explain the primary reason.

---

## Why is a suggestion locked?

A suggestion may be locked when another product rule has higher priority.

For example, yield opportunities may be locked until your Safety Buffer is fully funded.

Locked suggestions are not active recommendations.

---

## Does clicking a suggestion complete the action?

No.

In MVP, clicking a protocol-backed suggestion opens an external protocol page for review.

Opening a protocol does not mean the action was completed.

A suggestion should be marked completed only when product logic detects that the underlying condition changed.

---

## Does WealthSmith guarantee suggestion outcomes?

No.

Suggestions are planning guidance based on available product data.

They do not guarantee returns, APY, price movement, execution quality, or future portfolio performance.

---

## What should I do before acting on a suggestion?

Review the suggestion, understand why it appears, check any external protocol details, and make your own decision before taking action.

No action is taken automatically by WealthSmith.

---

# Top Pick

## What is Top Pick?

Top Pick is the one actionable suggestion WealthSmith marks as the highest-priority next step for the current state.

It is selected by deterministic Top Pick Logic.

---

## How is Top Pick selected?

Top Pick is selected using product logic based on suggestion eligibility, priority category, impact, urgency, efficiency, and guardrails.

Safety Buffer can override other priorities when it is underfunded.

Smith AI does not select Top Pick.

---

## Can there be more than one Top Pick?

No.

There should be exactly one Top Pick when valid actionable suggestions exist.

If no valid actionable suggestions exist, there should be no Top Pick.

---

## Why is Safety Buffer often Top Pick?

If the Safety Buffer is below target, WealthSmith prioritizes stablecoin reserve actions before yield or optimization opportunities.

This makes buffer-funding the likely Top Pick when the buffer is underfunded.

---

## Can I choose a different Top Pick?

You can choose what to review or ignore, but the Top Pick badge is assigned by WealthSmith’s deterministic logic.

Smith AI and UI components should not change Top Pick manually.

---

# Smith AI

## What is Smith AI?

Smith AI is WealthSmith’s explanation and guidance assistant.

It helps users understand dashboard data, suggestions, Top Pick, Safety Buffer, Demo Mode, wallet connection, and support topics.

---

## What can Smith AI do?

Smith AI can:

```text
Explain product concepts
Explain suggestions
Explain why a suggestion is Top Pick
Explain locked states
Explain wallet connection
Explain Demo Mode
Help with onboarding
Help users understand Goal settings
Summarize canonical FAQ answers
Route users to Contact Us
```

---

## What can Smith AI not do?

Smith AI cannot:

```text
Create recommendations
Choose Top Pick
Choose protocols
Invent APY
Invent estimated earnings
Invent wallet balances
Execute transactions
Move funds
Request wallet signatures from chat
Hold funds
Recover wallets
Guarantee returns
```

---

## Can Smith AI make mistakes?

Smith AI can make mistakes.

Users should check important information, especially external protocol details, APY, and anything involving financial decisions.

---

## Should I share my seed phrase with Smith AI?

No.

Never share your seed phrase, private key, password, or wallet backup file with Smith AI, support, or anyone else.

WealthSmith will not ask for them.

---

# Portfolio

## What does Portfolio show?

Portfolio shows supported wallet and protocol positions.

It may include:

```text
Balance Overview
Crypto Assets Allocation
Liquid Assets
Staked Assets
Yield Strategies
Asset Deployment Overview
```

Exact sections depend on loaded wallet and protocol data.

---

## What are Liquid Assets?

Liquid Assets are supported tokens that appear as directly held wallet balances and are not currently shown as staked assets or yield strategy positions.

---

## What are Staked Assets?

Staked Assets are supported assets detected in staking-related positions.

Examples may include liquid staking tokens or protocol-detected staking positions, depending on supported integrations.

---

## What are Yield Strategies?

Yield Strategies are supported protocol positions where assets are deployed in strategies such as lending, vaults, or liquidity positions.

APY and estimated earnings must come from approved data sources.

They should be treated as estimates and may change.

---

## Why is some portfolio data missing?

Portfolio data may be incomplete if:

```text
Wallet data is still loading
A protocol integration is unavailable
A token is unsupported
APY data is unavailable
Protocol data is stale
The wallet has no supported position in that category
```

WealthSmith should show a clear partial, empty, stale, or error state instead of fake data.

---

# Protocols

## Which protocols are supported in MVP?

Approved MVP protocol set:

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

Rules:

- Do not claim unsupported protocols are supported.
- Do not claim protocol support beyond approved metadata.
- If product support changes, update protocol metadata and this FAQ together.

---

## What is a protocol handoff?

A protocol handoff opens an approved external protocol page in a new tab so the user can review an action externally.

It is not transaction execution.

It does not move funds.

It does not mark the suggestion complete.

---

## Does WealthSmith choose the protocol?

Protocol destination is selected by deterministic Protocol Logic, not by Smith AI or UI components.

Smith AI can explain why a protocol is shown if the reason is provided.

---

## Does opening a protocol mean WealthSmith completed the action?

No.

Opening a protocol page only lets you review the action externally.

WealthSmith should mark a suggestion completed only if product logic later detects that the underlying portfolio condition changed.

---

## Does WealthSmith guarantee protocol APY?

No.

APY can change.

Protocol data, yield, and estimated earnings must be reviewed before taking action.

WealthSmith does not guarantee protocol returns.

---

## Can WealthSmith buy stocks, RWAs, or other assets for me?

Not in MVP.

WealthSmith MVP focuses on portfolio visibility, suggestions, and external protocol handoffs.

Do not assume WealthSmith can buy stocks, RWAs, or other assets unless the product explicitly supports it.

---

# Security

## Is WealthSmith custodial?

No.

WealthSmith is non-custodial.

Your funds stay in your wallet.

WealthSmith does not hold your crypto, seed phrase, private keys, or wallet backup files.

---

## Can WealthSmith move my funds?

No.

In MVP, WealthSmith does not move funds, execute trades, stake tokens, deposit funds, withdraw funds, or rebalance on your behalf.

---

## What should I never share?

Never share:

```text
Seed phrase
Private key
Wallet password
Wallet backup file
Recovery phrase
```

WealthSmith will never ask for these.

---

## What if someone claiming to be WealthSmith asks for my seed phrase?

Do not share it.

It is not a valid WealthSmith request.

Contact support through the official product support flow and report the issue.

---

## Are suggestions financial advice?

WealthSmith suggestions are product-generated guidance based on available data and configured rules.

They are not guarantees.

Users should review suggestions, external protocol details, and risks before taking action.

---

# Contact Us

## How do I contact support?

Use the Contact Us form in the Support page.

Provide your email and a description of the issue.

Do not include seed phrases, private keys, passwords, or wallet backup files.

---

## What should I include in a support message?

Helpful details include:

```text
What you were trying to do
What wallet you use
What page you were on
What error message appeared
Whether you were in Demo Mode or real wallet mode
Browser/device details if relevant
```

Do not include secrets.

---

## What should I not include in a support message?

Do not include:

```text
Seed phrase
Private key
Password
Wallet backup file
Recovery phrase
```

WealthSmith does not need these to help you.

---

## Can support recover my wallet?

No.

WealthSmith cannot recover wallets, seed phrases, private keys, or lost funds.

Only use official wallet recovery methods from your wallet provider.

---

# Search Keywords

Use these keywords to help Support search find answers:

```text
wealthsmith
wallet
connect wallet
phantom
solflare
backpack
ledger
hardware wallet
message signing
transaction signing
seed phrase
private key
demo mode
try demo
exit demo
safety buffer
top pick
suggestions
smith ai
portfolio
liquid assets
staked assets
yield strategies
apy
protocol
jupiter
kamino
jito
marinade
sanctum
orca
raydium
meteora
hubble
ondo
contact support
```

---

# Content IDs

Recommended FAQ content IDs:

```text
faq.getting_started.what_is_wealthsmith
faq.getting_started.does_wealthsmith_trade
faq.wallet.why_connect
faq.wallet.supported_wallets
faq.wallet.read_only
faq.wallet.seed_phrase
faq.wallet.message_signing
faq.demo.what_is_demo
faq.demo.personalized
faq.demo.exit
faq.safety_buffer.what_is
faq.safety_buffer.why_priority
faq.suggestions.how_generated
faq.suggestions.locked
faq.top_pick.what_is
faq.top_pick.how_selected
faq.smith_ai.what_is
faq.smith_ai.can_do
faq.smith_ai.cannot_do
faq.portfolio.what_shows
faq.protocols.supported
faq.protocols.handoff
faq.security.non_custodial
faq.security.never_share
faq.contact.how_to
```

Rules:

- Use stable IDs for FAQ implementation.
- IDs should map to one canonical answer.
- Do not duplicate conflicting answers across content files.

---

# QA Checklist

Before shipping FAQ content, verify:

```text
Does every answer match product rules?
Does wallet copy clearly say funds stay in wallet?
Does FAQ never ask for seed phrase/private key?
Does FAQ avoid guaranteed returns?
Does FAQ avoid risk-free yield?
Does FAQ avoid automatic execution claims?
Does Demo Mode clearly say sample data?
Does Smith AI section say Smith AI explains but does not decide?
Does Top Pick section say deterministic logic selects Top Pick?
Does protocol section say handoff is external and non-executing?
Does Contact Us warn users not to include secrets?
Does supported wallet list match product metadata?
Does supported protocol list match product metadata?
```

---

# Related Files

Content:

```text
content/voice-and-tone.md
content/ui-copy-rules.md
content/smith-ai-copy.md
content/wallet-copy.md
content/demo-mode-copy.md
content/glossary.md
```

Rules:

```text
rules/wallet-and-custody-rules.md
rules/smith-ai-rules.md
rules/demo-mode-rules.md
rules/suggestion-engine-rules.md
rules/top-pick-rules.md
rules/protocol-selection-rules.md
rules/financial-logic-boundaries.md
```

Patterns:

```text
patterns/support-center.md
patterns/wallet-connection.md
patterns/suggestion-flow.md
patterns/portfolio-overview.md
patterns/dashboard-layout.md
```

---

# Claude Code Rules

Claude Code should:

- Use this file as canonical FAQ content.
- Keep FAQ answers stable and consistent.
- Use Support search over these topics.
- Let Smith AI summarize FAQ answers without inventing policy.
- Keep wallet and security warnings intact.
- Keep supported wallet/protocol lists aligned with metadata.
- Preserve non-custodial language.
- Preserve demo vs real wallet distinction.
- Preserve external protocol handoff distinction.
- Route unresolved support questions to Contact Us.

Claude Code must not:

- Invent new FAQ policy.
- Invent wallet support.
- Invent protocol support.
- Invent pricing.
- Invent legal/security guarantees.
- Ask for seed phrases or private keys.
- Claim WealthSmith can recover wallets.
- Claim WealthSmith executes trades in MVP.
- Claim APY or yield is guaranteed.
- Treat Demo Mode as real wallet data.
- Let Smith AI override canonical FAQ answers.

---

# Do

- Keep answers clear.
- Keep answers canonical.
- Keep wallet safety prominent.
- Explain non-custodial behavior.
- Explain Demo Mode clearly.
- Explain suggestions and Top Pick deterministically.
- Explain protocol handoffs as external review.
- Route unresolved issues to Contact Us.
- Warn users not to include secrets.

---

# Do Not

- Do not make guarantees.
- Do not imply custody.
- Do not imply automatic execution.
- Do not imply risk-free yield.
- Do not invent support policy.
- Do not invent supported wallets.
- Do not invent supported protocols.
- Do not ask for secrets.
- Do not claim wallet recovery support.
- Do not mix demo and real data.

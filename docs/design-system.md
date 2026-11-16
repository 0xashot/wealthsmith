# WealthSmith Design System

> This is the full design-system and product-rules specification.
> For a project overview, start at the [README](../README.md).

This repository is the implementation source for WealthSmith’s product UI system.

It is designed for:

```text
engineers
Claude Code
design QA
product QA
future contributors
```

The goal is to make WealthSmith easier to build without guessing.

This repo defines:

```text
design tokens
assets
component contracts
page patterns
product behavior rules
approved copy
examples
implementation templates
```

It is not only a visual design system.

It is also a product-state and AI-behavior contract.

---

## What WealthSmith Is

WealthSmith is a non-custodial Solana-native portfolio guidance product.

It helps users:

```text
connect a wallet
understand their portfolio
set a goal
review Safety Buffer status
see structured suggestions
understand one Top Pick
review protocol handoffs
ask Smith AI for explanations
```

WealthSmith does not:

```text
hold user funds
control wallets
move funds automatically
execute trades in MVP
stake, unstake, deposit, withdraw, or rebalance for the user in MVP
ask for seed phrases
ask for private keys
guarantee returns
```

---

## Core Product Architecture

WealthSmith separates product logic from explanation and UI rendering.

```text
Suggestion Engine = deterministic product logic
Top Pick Logic = deterministic ranking and single Top Pick selection
Protocol Logic = deterministic protocol destination selection
Smith AI = explanation layer
UI = renderer
```

Hard rule:

```text
AI explains.
AI does not decide.
UI renders.
UI does not invent.
```

---

## Source-of-Truth Hierarchy

When files conflict, use this order:

```text
1. rules/
2. content/
3. components/
4. patterns/
5. tokens/
6. assets/
7. examples/
8. templates/
```

This means:

```text
rules define behavior
content defines copy
components define UI contracts
patterns define page and flow behavior
tokens define visual primitives and semantics
assets define approved visual files
examples show completed states
templates define reusable object shapes
```

Templates come last.

They guide structure, not behavior.

---

## Non-Negotiable Rules

These rules apply across the entire repo.

### Do not invent financial logic

Do not invent:

```text
balances
prices
APY
estimated earnings
projections
allocation targets
Safety Buffer values
suggestions
Top Pick
reason codes
protocol destinations
protocol URLs
routes
slippage
trade size
wallet permissions
transaction status
```

When data is missing, render the correct state:

```text
loading
empty
error
partial
stale
unavailable
locked
blocked
```

---

### Do not blur custody boundaries

WealthSmith is non-custodial.

Required language when relevant:

```text
Your funds stay in your wallet.
No action will be taken automatically.
```

Never ask for:

```text
seed phrase
private key
wallet password
wallet backup file
```

Never imply WealthSmith can:

```text
hold funds
secure funds
move funds
trade
swap
stake
unstake
deposit
withdraw
rebalance
```

---

### Do not let UI choose product logic

UI must not choose:

```text
suggestions
Top Pick
protocol destinations
wallet support
portfolio classifications
yield opportunities
risk priority
```

UI renders structured state from product logic.

---

### Do not let Smith AI choose product logic

Smith AI can:

```text
explain
clarify
summarize
guide
teach
```

Smith AI cannot:

```text
choose Top Pick
change Top Pick
choose protocol
change protocol
create suggestions
invent values
execute actions
request signatures
move funds
```

---

### MVP protocol handoffs are review-only

In MVP, protocol handoffs:

```text
open an approved external protocol page
open in a new tab
do not execute transactions
do not request wallet signatures
do not move funds
do not mark suggestions complete on click
```

Use copy like:

```text
Review on Jupiter
Manage on Kamino
```

Do not use copy like:

```text
Swap now
Execute now
Complete deposit
```

---

## MVP Wallets

Supported MVP wallets:

```text
Phantom
Solflare
Backpack
```

Do not add wallet support unless the product team updates the rules.

---

## MVP Protocols

Supported MVP protocols:

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

Not supported in MVP:

```text
BlazeStake
```

Do not add unsupported protocols in UI, examples, protocol logic, icons, or copy.

---

## Repo Structure

```text
wealthsmith/
  README.md          product overview (start here)
  LICENSE
  NOTICE

  app/               React + TypeScript + Vite application

  assets/
  components/
  content/
  docs/              this document, plus engineering handoffs
  examples/
  patterns/
  rules/
  templates/
  tokens/
```

Optional future folders:

```text
checklists/
schemas/
tests/
```

---

## Folder Guide

### `tokens/`

Design tokens.

Contains:

```text
tokens/primitives/
tokens/semantic/
tokens/README.md
```

Use tokens for:

```text
color
spacing
typography
breakpoints
radius
shadow
motion
z-index
```

Rules:

```text
Use semantic tokens in components.
Do not hardcode raw visual values.
Do not create one-off colors, spacing, radii, shadows, or z-index values.
```

---

### `assets/`

Approved assets.

Contains:

```text
assets/README.md

assets/logo/
  README.md
  logo-registry.json
  wealthsmith-full-lockup.svg
  wealthsmith-symbol.svg

assets/icons/
  README.md
  icon-registry.json
  chart/
  fallback/
  protocol/
  token/
  ui/
  wallet/

assets/animations/
  README.md
  animation-registry.json
  smith-ai-symbol-loop.json
```

Rules:

```text
Do not recolor or modify logo files.
Use approved icon paths.
Use fallback token icon only for missing token icons.
Do not use protocol fallback icons in MVP.
Use Smith AI animation only for approved Smith AI or suggestion-building waits.
```

---

### `components/`

Reusable UI component contracts.

Examples:

```text
components/global-nav.md
components/suggestion-card.md
components/portfolio-card.md
components/metric-card.md
components/table.md
components/chart.md
components/modal.md
components/toast.md
components/button.md
components/input.md
components/tabs.md
components/tooltip.md
components/skeleton.md
```

Components define:

```text
purpose
variants
props
states
copy boundaries
accessibility
do/don’t rules
```

Rules:

```text
Components render state.
Components do not fetch data.
Components do not calculate financial logic.
Components do not choose Top Pick.
Components do not choose protocols.
Components do not invent copy.
```

---

### `patterns/`

Page and flow behavior.

Contains:

```text
patterns/README.md
patterns/onboarding-with-smith-ai.md
patterns/suggestion-flow.md
patterns/dashboard-layout.md
patterns/portfolio-overview.md
patterns/wallet-connection.md
patterns/empty-loading-error-states.md
patterns/goal-settings.md
patterns/support-center.md
```

Patterns define:

```text
how screens behave
how components work together
responsive behavior
state transitions
right rail behavior
wallet connection flow
onboarding behavior
empty/loading/error behavior
```

Use patterns before implementing full pages.

---

### `rules/`

Product behavior rules.

Contains:

```text
rules/README.md
rules/financial-logic-boundaries.md
rules/wallet-and-custody-rules.md
rules/suggestion-engine-rules.md
rules/top-pick-rules.md
rules/protocol-selection-rules.md
rules/smith-ai-rules.md
rules/demo-mode-rules.md
rules/loading-state-rules.md
```

Rules are the highest source of truth.

Use them to determine:

```text
what UI may render
what UI must not do
what Smith AI may explain
what Smith AI must not invent
how suggestions work
how Top Pick works
how protocol handoffs work
how wallet safety works
```

---

### `content/`

Approved copy and language rules.

Contains:

```text
content/README.md
content/voice-and-tone.md
content/ui-copy-rules.md
content/suggestion-card-copy.md
content/smith-ai-copy.md
content/support-faq-content.md
content/empty-error-loading-copy.md
content/wallet-copy.md
content/demo-mode-copy.md
content/onboarding-copy.md
content/glossary.md
```

Use content files for:

```text
user-facing copy
Smith AI phrasing
wallet safety copy
suggestion card copy
Demo Mode copy
loading/error/empty copy
FAQ answers
glossary definitions
```

Rules:

```text
Do not invent copy if approved copy exists.
Do not use hype.
Do not pressure users.
Do not shame holdings.
Do not guarantee outcomes.
Use calm, clear, beginner-friendly fintech language.
```

---

### `examples/`

Completed fixtures.

Contains sample states for:

```text
demo-mode/
dashboard/
portfolio/
suggestions/
top-pick/
protocol-handoffs/
smith-ai/
wallet/
```

Examples are used for:

```text
storybook states
Claude Code references
QA fixtures
implementation tests
visual screenshot pairing
```

Rules:

```text
Examples use realistic synthetic values.
Examples are not production data.
Examples should match templates.
Examples should obey rules and content.
Screenshots may pair with examples but do not replace JSON/Markdown fixtures.
```

---

### `templates/`

Reusable implementation templates.

Contains:

```text
templates/README.md
templates/suggestion-object-template.json
templates/top-pick-output-template.json
templates/protocol-decision-template.json
templates/smith-ai-context-template.json
templates/page-state-template.json
templates/wallet-state-template.json
templates/demo-mode-state-template.json
templates/empty-error-loading-state-template.json
templates/qa-test-case-template.md
```

Templates are used for:

```text
new JSON state shapes
new examples
new test cases
new product-state contracts
new Claude Code tasks
```

Rules:

```text
Templates define structure.
Templates are not production logic.
Templates use placeholders.
Do not treat placeholders as real values.
```

---

## Layout System Summary

WealthSmith is mobile-first.

Breakpoints:

```text
mobile: 320–767
tablet: 768–1279
desktop: 1280–1727
wide: 1728+
```

Grid:

```text
8px base grid
mobile: 4 columns
tablet: 8 columns
desktop: 12 columns
wide: 12 columns
```

Page padding:

```text
mobile: 16px
tablet: 24px
desktop: 32px
```

Use semantic spacing tokens rather than raw values in implementation.

---

## Typography Summary

Fonts:

```text
Manrope = headings, body, labels
Space Grotesk = metrics, numbers, charts
```

Rules:

```text
Minimum body text size is 14px.
Use WCAG AA contrast.
Do not create one-off typography styles.
Use semantic typography tokens.
```

---

## Color Summary

Brand blue scale is defined in tokens.

Rules:

```text
Use semantic color tokens.
Do not hardcode raw hex values in components.
Do not use color as the only source of meaning.
Do not create unapproved semantic colors.
```

---

## Global Nav Summary

Global Nav has four major product states:

```text
onboarding active, no wallet
onboarding active, wallet connected
demo mode
wallet connected
```

Important rules:

```text
Demo Mode shows no wallet pill.
Wallet connected state shows wallet pill.
Try Demo Mode is hidden when wallet is connected.
Ask Smith AI is hidden during active onboarding unless Smith AI is the onboarding companion.
Demo banner is outside Global Nav.
```

Global Nav sizing:

```text
outer offset: 24px top/left/right
height: 64px
radius: 16px
internal horizontal padding: 12px
full lockup logo: 221×32
```

---

## Suggestion System Summary

Suggestions must come from the Suggestion Engine.

Every suggestion should include:

```text
id
type
category
status
actionability
severity
reason codes
copy
data
action
protocol decision if needed
Top Pick flags
UI hints
Smith AI explanation constraints
```

Suggestion statuses include:

```text
active
locked
disabled
stale
completed
dismissed
expired
```

Actionability includes:

```text
actionable
locked
disabled
informational
unavailable
```

Rules:

```text
UI does not create suggestions.
UI does not invent reason codes.
UI does not invent APY or earnings.
UI does not execute transactions from suggestions.
```

---

## Top Pick Summary

Top Pick must come from deterministic Top Pick Logic.

Rules:

```text
Exactly one Top Pick when valid actionable suggestions exist.
Locked suggestions cannot be Top Pick.
Stale suggestions cannot be active Top Pick.
Disabled suggestions cannot be Top Pick.
Completed, dismissed, or expired suggestions cannot be active Top Pick.
Informational-only suggestions cannot be Top Pick.
Smith AI cannot choose or change Top Pick.
UI cannot choose or change Top Pick.
```

Priority order:

```text
1. Safety Buffer actions
2. Rebalance actions
3. Capital efficiency actions
4. Optimization actions
```

Safety Buffer override:

```text
If Safety Buffer is below target, buffer funding takes priority over yield, staking, vault, DCA, and optimization suggestions unless product rules explicitly allow otherwise.
```

---

## Protocol Logic Summary

Protocol Logic decides where a user should review an action.

UI and Smith AI do not choose protocol destinations.

Protocol Decision must include:

```text
destination_protocol_id
destination_label
destination_url
handoff_type
cta_label
eligibility_status
reason_codes
guardrail results
stale/error states
```

MVP handoff type:

```text
external_new_tab
```

Rules:

```text
Do not guess protocol URLs.
Do not use stale protocol decisions.
Do not execute transactions.
Do not request wallet signatures for MVP handoff clicks.
Do not mark suggestions complete on click.
```

---

## Smith AI Summary

Smith AI is the explanation layer.

It should feel like:

```text
a calm, trustworthy teammate
a guide
an explainer
not a financial advisor
not an executor
not a decision-maker
```

Smith AI can explain:

```text
Dashboard state
Portfolio state
Safety Buffer
suggestions
Top Pick
locked cards
protocol handoffs
wallet safety
Demo Mode
onboarding questions
support FAQ
```

Smith AI must not:

```text
create suggestions
choose Top Pick
choose protocols
invent values
execute actions
request signatures
ask for wallet secrets
guarantee outcomes
```

---

## Demo Mode Summary

Demo Mode lets users explore WealthSmith with sample data.

Rules:

```text
demo_mode = true
is_sample_data = true
wallet status is disconnected/demo
wallet pill is hidden
demo banner is visible
sample data is clearly labeled
demo suggestions are sample suggestions
demo Top Pick is sample-only
demo state clears when real wallet connects
```

Demo Mode must not:

```text
present sample data as real wallet data
request wallet signatures
persist demo Top Pick into real wallet mode
```

---

## Loading / Empty / Error Summary

Use approved non-ready states instead of fake data.

State types:

```text
loading
empty
error
partial
stale
unavailable
locked
blocked
```

Rules:

```text
Do not show fake balances.
Do not show fake APY.
Do not show fake earnings.
Do not show fake suggestions.
Do not show fake Top Pick.
Do not show fake protocol URLs.
Errors must not imply funds are affected.
Unavailable values should display as “Unavailable”.
```

Smith AI animation is only for:

```text
Smith AI response wait
approved suggestion-building wait
```

Do not use Smith AI animation for:

```text
wallet connection
portfolio table loading
generic page loading
button loading
chart loading
```

---

## How to Build with This Repo

Before implementing any screen or component:

```text
1. Read the relevant rules.
2. Read the relevant content.
3. Read the relevant component specs.
4. Read the relevant pattern.
5. Check related examples.
6. Use the relevant template.
7. Implement using semantic tokens and approved assets.
8. Validate with QA template/checklist.
```

Example:

To build the connected-wallet Dashboard:

```text
1. Read rules/wallet-and-custody-rules.md
2. Read rules/suggestion-engine-rules.md
3. Read rules/top-pick-rules.md
4. Read rules/protocol-selection-rules.md
5. Read patterns/dashboard-layout.md
6. Read patterns/suggestion-flow.md
7. Read components/global-nav.md
8. Read components/suggestion-card.md
9. Use examples/dashboard/dashboard-connected-wallet-state.json
10. Use templates/page-state-template.json
```

---

## Claude Code Instructions

When using Claude Code with this repo, include this instruction:

```text
Use this repo as the source of truth for WealthSmith UI implementation.

Follow the hierarchy:
rules > content > components > patterns > tokens > assets > examples > templates.

Do not invent financial logic, balances, APY, estimated earnings, suggestions, Top Pick, protocol destinations, wallet permissions, or user-facing copy.

If required data is missing, render the correct loading, empty, error, partial, stale, unavailable, locked, or blocked state.

Use semantic tokens and approved assets only.

Smith AI explains product state but does not choose, change, or execute anything.

MVP protocol handoffs open external protocols for review only and do not execute transactions, request wallet signatures, move funds, or mark suggestions complete.
```

---

## Engineering Do / Don’t

### Do

```text
Use semantic tokens.
Use approved assets.
Use component specs.
Use pattern docs.
Use content IDs.
Use JSON examples as fixtures.
Use templates for new object shapes.
Preserve non-custodial boundaries.
Render unavailable states instead of guessed values.
Keep UI logic separate from financial logic.
```

### Don’t

```text
Do not hardcode raw styling.
Do not invent copy.
Do not invent balances.
Do not invent APY.
Do not invent suggestions.
Do not invent Top Pick.
Do not invent protocol URLs.
Do not let Smith AI make decisions.
Do not execute transactions from MVP suggestion CTAs.
Do not ask for seed phrases or private keys.
```

---

## QA Guidance

Use:

```text
templates/qa-test-case-template.md
```

Core QA checks:

```text
Does UI match the fixture?
Does copy match content?
Does behavior match rules?
Does Top Pick come from Top Pick Logic?
Does Protocol destination come from Protocol Logic?
Does Smith AI stay grounded?
Are wallet/custody boundaries preserved?
Are loading/error/empty states safe?
Are accessibility labels present?
```

---

## Completion Status

Current MVP repo status:

```text
tokens/       complete
assets/       complete
components/   complete
patterns/     complete
rules/        complete
content/      complete
examples/     MVP first pass complete
templates/    complete
README.md     complete
```

Recommended optional next folders:

```text
checklists/
schemas/
tests/
```

---

## Optional Next Steps

### `checklists/`

Useful for:

```text
implementation readiness
design QA
engineering QA
Claude Code review
release readiness
```

Suggested files:

```text
checklists/README.md
checklists/mvp-implementation-checklist.md
checklists/qa-review-checklist.md
checklists/wallet-safety-checklist.md
checklists/suggestion-top-pick-checklist.md
checklists/protocol-handoff-checklist.md
```

### `schemas/`

Useful if engineering wants strict validation.

Suggested files:

```text
schemas/suggestion-object.schema.json
schemas/top-pick-output.schema.json
schemas/protocol-decision.schema.json
schemas/page-state.schema.json
schemas/wallet-state.schema.json
schemas/demo-mode-state.schema.json
schemas/smith-ai-context.schema.json
```

### `tests/`

Useful if the repo will be wired into automated UI or contract tests.

Suggested files:

```text
tests/fixtures/
tests/contracts/
tests/accessibility/
tests/regression/
```

---

## Final Principle

WealthSmith should feel clear, safe, and trustworthy.

The product should help users understand what is happening without pretending to control their money.

Build with this rule:

```text
Clear state.
Grounded data.
No hidden actions.
No invented logic.
No custody confusion.
```

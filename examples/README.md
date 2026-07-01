# Examples

This folder contains reference examples for WealthSmith product states, data payloads, UI behavior, and copy usage.

Examples help engineers and Claude Code understand how the design system, product rules, content, components, and patterns work together.

Examples are fixtures.

They are not production logic.

---

## Purpose

The `examples/` folder answers:

```text
What should a real WealthSmith state look like?
What data should the UI receive?
What should be rendered?
What copy should appear?
Which rules apply?
What should not happen?
```

Examples should make WealthSmith easier to build without interpretation.

They should show complete states for:

```text
Demo Mode
Onboarding
Dashboard
Portfolio
Suggestions
Top Pick
Protocol handoffs
Smith AI
Wallet connection
Empty/loading/error states
```

---

## Core Rule

Hard Rule:

```text
Examples are reference fixtures.
Rules remain the source of truth.
```

Examples should demonstrate expected behavior, but they must not replace:

```text
rules/
content/
patterns/
components/
templates/
```

If an example conflicts with a rule, the rule wins.

If an example conflicts with content, content wins.

If an example conflicts with a component spec, the component spec wins.

---

## What Belongs in Examples

Use examples for:

```text
Representative app states
Sample JSON payloads
Expected card rendering states
Expected Smith AI responses
Protocol handoff examples
Top Pick test cases
Wallet connection states
Demo Mode states
Empty/loading/error states
```

Use screenshots for:

```text
Visual layout references
Density references
Spacing relationships
How multiple components appear together
Right rail behavior
Dashboard composition
Portfolio table composition
```

Do not use examples for:

```text
Business logic source of truth
Design tokens
Component API source of truth
Canonical copy source of truth
Final protocol routing logic
Production data
Real user wallet data
Secrets
```

---

## JSON First, Screenshots Second

Examples should prioritize machine-readable state.

Rule:

```text
JSON/Markdown examples = source of implementation reference
Screenshots = visual reference
```

Screenshots are useful, but they do not fully communicate:

```text
state names
business logic
source of values
accessibility labels
data contracts
locked states
Top Pick reason
protocol handoff type
copy IDs
completion rules
```

For important screens, pair screenshots with JSON.

Good:

```text
examples/dashboard/dashboard-demo-state.json
examples/dashboard/dashboard-demo-state.png
```

Bad:

```text
examples/dashboard/dashboard-demo-state.png
```

without state data.

---

## Recommended Folder Structure

```text
examples/
  README.md

  demo-mode/
    demo-portfolio.json
    demo-dashboard-state.json
    demo-suggestions.json
    demo-smith-ai-responses.md

  onboarding/
    onboarding-start-state.json
    onboarding-complete-state.json
    onboarding-demo-state.json
    onboarding-copy-flow.md

  dashboard/
    dashboard-connected-wallet-state.json
    dashboard-no-wallet-state.json
    dashboard-demo-state.json
    dashboard-loading-state.json
    dashboard-error-state.json

  portfolio/
    portfolio-liquid-assets.json
    portfolio-staked-assets.json
    portfolio-yield-strategies.json
    portfolio-partial-data-state.json
    portfolio-empty-state.json

  suggestions/
    suggestions-buffer-underfunded.json
    suggestions-buffer-funded.json
    suggestions-locked-yield.json
    suggestions-no-top-pick.json
    suggestions-stale-state.json

  top-pick/
    top-pick-buffer-case.json
    top-pick-rebalance-case.json
    top-pick-yield-case.json
    top-pick-no-valid-case.json

  protocol-handoffs/
    protocol-jupiter-swap.json
    protocol-kamino-yield.json
    protocol-jito-staking.json
    protocol-unavailable-state.json

  smith-ai/
    smith-ai-safety-buffer-examples.md
    smith-ai-top-pick-examples.md
    smith-ai-wallet-examples.md
    smith-ai-demo-mode-examples.md
    smith-ai-unsupported-question-examples.md

  wallet/
    wallet-disconnected-state.json
    wallet-connected-phantom-state.json
    wallet-ledger-message-signing-error.json
    wallet-unsupported-state.json

  copy/
    suggestion-card-copy-examples.json
    empty-error-loading-copy-examples.json
    onboarding-copy-examples.md
```

Screenshots can be added next to matching JSON files:

```text
dashboard-demo-state.json
dashboard-demo-state.png
```

---

## Naming Rules

Use descriptive file names.

Good:

```text
dashboard-connected-wallet-state.json
suggestions-buffer-underfunded.json
top-pick-buffer-case.json
protocol-jupiter-swap.json
wallet-ledger-message-signing-error.json
```

Avoid:

```text
state1.json
test.json
new.json
example-final.json
screenshot.png
```

Rules:

- Use lowercase.
- Use hyphen-separated names.
- Include state/category in the name.
- Include mode when relevant: `demo`, `connected-wallet`, `no-wallet`, `loading`, `error`.
- Keep screenshot file name identical to the matching state file except extension.

---

## Example File Types

### JSON

Use JSON for structured product state.

Examples:

```text
dashboard state
portfolio state
suggestion list
Top Pick output
protocol decision
wallet state
loading/error state
```

### Markdown

Use Markdown for conversational or copy examples.

Examples:

```text
Smith AI example responses
onboarding copy flow
QA notes
expected rendering notes
```

### PNG

Use PNG for screenshots.

Examples:

```text
dashboard visual reference
portfolio visual reference
suggestion rail visual reference
onboarding step visual reference
```

Rules:

- Screenshots should never be the only source.
- Screenshots should be paired with JSON/Markdown when possible.
- Do not store sensitive real-user data in screenshots.

---

## Example Metadata

Each JSON example should include metadata where useful.

Recommended structure:

```json
{
  "example_metadata": {
    "name": "Dashboard demo state",
    "mode": "demo",
    "purpose": "Shows Dashboard in Demo Mode with sample portfolio and sample suggestions.",
    "rules": [
      "rules/demo-mode-rules.md",
      "rules/suggestion-engine-rules.md",
      "rules/top-pick-rules.md"
    ],
    "content": [
      "content/demo-mode-copy.md",
      "content/suggestion-card-copy.md"
    ],
    "patterns": [
      "patterns/dashboard-layout.md",
      "patterns/suggestion-flow.md"
    ]
  }
}
```

Rules:

- Metadata helps Claude Code know which rules apply.
- Metadata should not be rendered to users.
- Metadata should describe the example’s purpose.

---

## Demo Mode Examples

Demo Mode examples should show:

```text
sample portfolio
sample goal settings
sample suggestions
sample Top Pick
demo banner
no wallet pill
Ask Smith AI available
demo-aware Smith AI copy
Exit Demo behavior
```

Required files:

```text
examples/demo-mode/demo-portfolio.json
examples/demo-mode/demo-dashboard-state.json
examples/demo-mode/demo-suggestions.json
examples/demo-mode/demo-smith-ai-responses.md
```

Official MVP demo data:

```text
Goal: Build Long-Term Wealth
Risk level: Medium
Time horizon: 5 years
Monthly income: $4,000
Monthly expenses: $1,000
Contribution frequency: Monthly
Monthly saving goal: $1,000

Portfolio:
SOL: $5,500
BONK: $1,200
USDC: $800
```

Rules:

- Demo examples must be clearly marked as demo/sample.
- Demo examples must not include wallet pill.
- Demo examples must not include real wallet address.
- Demo suggestions must not persist into real wallet examples.

---

## Onboarding Examples

Onboarding examples should show:

```text
start state
wallet/demo decision
step-by-step copy
saved answers
review state
complete state
demo onboarding state
validation states
undo/restart behavior
```

Required files:

```text
examples/onboarding/onboarding-start-state.json
examples/onboarding/onboarding-complete-state.json
examples/onboarding/onboarding-demo-state.json
examples/onboarding/onboarding-copy-flow.md
```

Rules:

- Ask one major question at a time.
- Keep Smith AI companion open during active onboarding.
- Hide Ask Smith AI global action during active onboarding if required by pattern.
- Do not imply onboarding executes transactions.
- Do not store demo answers as real settings unless explicitly confirmed.

---

## Dashboard Examples

Dashboard examples should show:

```text
no-wallet state
demo state
connected-wallet state
loading state
error state
right rail state
Smith AI panel state
suggestion rail state
strategy insights state
```

Required files:

```text
examples/dashboard/dashboard-connected-wallet-state.json
examples/dashboard/dashboard-no-wallet-state.json
examples/dashboard/dashboard-demo-state.json
examples/dashboard/dashboard-loading-state.json
examples/dashboard/dashboard-error-state.json
```

Rules:

- Dashboard state should include Global Nav state.
- Dashboard state should include right rail mode.
- Dashboard state should distinguish real wallet and demo mode.
- Dashboard loading should use section-level loading when possible.
- Dashboard examples should not invent values not provided by product logic.

---

## Portfolio Examples

Portfolio examples should show:

```text
balance overview
crypto allocation
liquid assets
staked assets
yield strategies
asset deployment overview
partial data
empty state
APY unavailable state
protocol manage links
```

Required files:

```text
examples/portfolio/portfolio-liquid-assets.json
examples/portfolio/portfolio-staked-assets.json
examples/portfolio/portfolio-yield-strategies.json
examples/portfolio/portfolio-partial-data-state.json
examples/portfolio/portfolio-empty-state.json
```

Rules:

- Use supported token icons where applicable.
- Use fallback token icon only for unsupported/missing token icon.
- Use approved protocol icons only.
- Manage links are external handoffs.
- Portfolio examples must not imply WealthSmith manages funds.
- APY and estimated earnings must be sourced or unavailable.

---

## Suggestion Examples

Suggestion examples should show:

```text
Safety Buffer underfunded
Safety Buffer funded
locked yield opportunity
no Top Pick
stale suggestions
disabled suggestions
copy template mapping
protocol CTA behavior
```

Required files:

```text
examples/suggestions/suggestions-buffer-underfunded.json
examples/suggestions/suggestions-buffer-funded.json
examples/suggestions/suggestions-locked-yield.json
examples/suggestions/suggestions-no-top-pick.json
examples/suggestions/suggestions-stale-state.json
```

Rules:

- Suggestion copy must map from `content/suggestion-card-copy.md`.
- Suggestions must include reason codes.
- Exactly one valid actionable suggestion may be Top Pick.
- Locked suggestions must not be Top Pick.
- Stale suggestions must not be actionable as current Top Pick.
- Suggestion examples must not imply execution.

---

## Top Pick Examples

Top Pick examples should show deterministic ranking behavior.

Required files:

```text
examples/top-pick/top-pick-buffer-case.json
examples/top-pick/top-pick-rebalance-case.json
examples/top-pick/top-pick-yield-case.json
examples/top-pick/top-pick-no-valid-case.json
```

Rules:

- Buffer underfunded case should show Safety Buffer override.
- Rebalance case should show risk/allocation priority when buffer is satisfied.
- Yield case should show yield only when buffer and guardrails allow it.
- No-valid case should show no Top Pick.
- Top Pick examples must match `rules/top-pick-rules.md`.

---

## Protocol Handoff Examples

Protocol handoff examples should show:

```text
selected protocol
protocol icon
destination label
handoff type
external new tab
CTA copy
no execution
no wallet signature
not completed on click
unavailable protocol state
```

Required files:

```text
examples/protocol-handoffs/protocol-jupiter-swap.json
examples/protocol-handoffs/protocol-kamino-yield.json
examples/protocol-handoffs/protocol-jito-staking.json
examples/protocol-handoffs/protocol-unavailable-state.json
```

Rules:

- Protocol destination must come from Protocol Logic output.
- URL must come from approved protocol metadata.
- UI must not guess protocol URL.
- Handoff type for MVP is `external_new_tab`.
- CTA should use review/open/manage language.
- Opening protocol must not mark suggestion complete.

---

## Smith AI Examples

Smith AI examples should show safe explanations.

Required files:

```text
examples/smith-ai/smith-ai-safety-buffer-examples.md
examples/smith-ai/smith-ai-top-pick-examples.md
examples/smith-ai/smith-ai-wallet-examples.md
examples/smith-ai/smith-ai-demo-mode-examples.md
examples/smith-ai/smith-ai-unsupported-question-examples.md
```

Rules:

- Smith AI explains product logic.
- Smith AI does not create recommendations.
- Smith AI does not choose Top Pick.
- Smith AI does not choose protocol.
- Smith AI does not invent APY.
- Smith AI does not imply custody or execution.
- Smith AI never asks for seed phrase/private key.
- Demo examples must say “in this demo” when explaining demo data.

---

## Wallet Examples

Wallet examples should show:

```text
disconnected state
connected Phantom state
unsupported wallet state
Ledger/message-signing error
read-only copy
wallet pill
wallet menu
wallet error handling
```

Required files:

```text
examples/wallet/wallet-disconnected-state.json
examples/wallet/wallet-connected-phantom-state.json
examples/wallet/wallet-ledger-message-signing-error.json
examples/wallet/wallet-unsupported-state.json
```

Rules:

- Wallet examples must use supported MVP wallets only unless showing unsupported state.
- Connected wallet pill format is `{Provider} • {short_address}`.
- Wallet copy must say funds stay in wallet.
- Wallet errors must not imply funds moved.
- Message signing must not be confused with transaction signing.
- No example should request seed phrase/private key.

---

## Copy Examples

Copy examples should show how approved content maps into UI.

Required files:

```text
examples/copy/suggestion-card-copy-examples.json
examples/copy/empty-error-loading-copy-examples.json
examples/copy/onboarding-copy-examples.md
```

Rules:

- Copy examples must reference content files.
- Copy examples should include content IDs where useful.
- Do not create copy outside approved content files.
- Copy examples should show good and forbidden patterns only when helpful.

---

## Screenshots

Screenshots are optional but useful.

Use screenshots for:

```text
Dashboard full-page layout
Portfolio overview
Suggestion rail
Onboarding step
Demo Mode banner
Wallet connection modal
Empty/loading/error states
```

Rules:

- Pair screenshots with matching JSON or Markdown.
- Do not include real user wallet data.
- Do not include secrets.
- Do not use screenshots as the only implementation source.
- Keep screenshot file names aligned with state files.

Good:

```text
dashboard-connected-wallet-state.json
dashboard-connected-wallet-state.png
```

Bad:

```text
dashboard-final.png
```

without JSON state.

---

## Example Quality Checklist

Before adding an example, check:

```text
Does the example have a clear purpose?
Does it reference the relevant rules/content/patterns?
Is the data realistic?
Is the state explicit?
Is demo vs real wallet mode clear?
Does it avoid fake production data?
Does it avoid secrets?
Does it avoid unsupported protocols/wallets?
Does it avoid custody claims?
Does it avoid execution claims?
Does it avoid guaranteed returns?
Does it avoid Smith AI making product decisions?
Can Claude Code implement from it without guessing?
```

---

## Example Data Safety

Never include:

```text
Real private keys
Seed phrases
Wallet backup files
Passwords
Real user financial data
Sensitive support messages
Unapproved protocol URLs
Unverified wallet addresses as real user data
```

Allowed:

```text
Synthetic wallet addresses
Short fake addresses
Demo portfolio data
Sample token balances
Sample protocol states
Sample Smith AI messages
Sample screenshots with synthetic data
```

Rules:

- Examples should be synthetic.
- If a wallet address is needed, mark it as fake/sample.
- Avoid realistic private identifiers unless clearly synthetic.
- Do not include secrets even as fake examples unless clearly impossible/non-valid.

---

## Source-of-Truth Hierarchy

When building from examples, follow this hierarchy:

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

Examples are lower than rules/content/components/patterns.

They show how things come together.

They do not override source docs.

---

## Claude Code Rules

Claude Code should:

- Use examples as fixtures and reference states.
- Use rules as source of behavior.
- Use content as source of copy.
- Use components as source of component behavior.
- Use patterns as source of flow composition.
- Use tokens/assets for visual implementation.
- Pair screenshots with JSON when available.
- Keep demo and real wallet states separate.
- Preserve non-custodial and non-execution boundaries.
- Use example states to build tests and stories.

Claude Code must not:

- Treat examples as production logic.
- Invent missing business logic from examples.
- Use screenshots as the only source of truth.
- Copy real user data into examples.
- Mix demo and real wallet examples.
- Add unsupported wallet/protocol support.
- Let Smith AI make product decisions in examples.
- Mark protocol handoff as completed on click.
- Create recommendations outside Suggestion Engine examples.
- Store secrets in examples.

---

## MVP Build Order

Recommended order:

```text
1. examples/README.md
2. examples/demo-mode/demo-portfolio.json
3. examples/demo-mode/demo-dashboard-state.json
4. examples/dashboard/dashboard-demo-state.json
5. examples/dashboard/dashboard-connected-wallet-state.json
6. examples/suggestions/suggestions-buffer-underfunded.json
7. examples/top-pick/top-pick-buffer-case.json
8. examples/protocol-handoffs/protocol-jupiter-swap.json
9. examples/portfolio/portfolio-liquid-assets.json
10. examples/portfolio/portfolio-staked-assets.json
11. examples/portfolio/portfolio-yield-strategies.json
12. examples/smith-ai/smith-ai-top-pick-examples.md
13. examples/wallet/wallet-connected-phantom-state.json
```

After that, add edge cases:

```text
loading states
error states
partial data
stale data
unsupported wallet
protocol unavailable
no Top Pick
```

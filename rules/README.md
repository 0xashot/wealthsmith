# Rules

Rules define WealthSmith’s hard product, logic, safety, and implementation boundaries.

They are stricter than components and patterns.

Components explain how UI elements render.

Patterns explain how product experiences work.

Rules explain what must always be true.

---

## Purpose

The `rules/` folder protects WealthSmith from the most dangerous implementation mistakes:

- UI inventing financial logic
- Smith AI inventing recommendations
- Claude Code calculating Top Pick incorrectly
- Protocol choices being hardcoded in cards
- Wallet connection implying custody
- Demo data mixing with real wallet data
- Loading states feeling fake or noisy
- Support answers inventing policy
- Copy implying guaranteed returns or automatic execution

Rules should be used by:

```text
Product
Design
Engineering
Claude Code
Smith AI
QA
Content
```

---

## Core Principle

WealthSmith has separate layers.

```text
Suggestion Engine = deterministic Brain
Protocol Logic = protocol/platform decision layer
Top Pick Logic = one highest-priority suggestion selector
Smith AI = explanatory Voice
UI = Renderer
```

Rules protect this separation.

The UI renders structured outputs.

Smith AI explains structured outputs.

The deterministic engine decides financial recommendations.

---

## Required Rule Files

MVP rule folder:

```text
rules/
  README.md
  financial-logic-boundaries.md
  suggestion-engine-rules.md
  top-pick-rules.md
  protocol-selection-rules.md
  wallet-and-custody-rules.md
  loading-state-rules.md
  demo-mode-rules.md
  smith-ai-rules.md
```

Recommended future rule files:

```text
rules/support-content-rules.md
rules/accessibility-rules.md
rules/asset-usage-rules.md
rules/copy-and-tone-rules.md
rules/data-state-rules.md
rules/protocol-handoff-rules.md
```

---

## Rule File Responsibilities

### `financial-logic-boundaries.md`

Defines what UI, Smith AI, and Claude Code are not allowed to calculate or invent.

Covers:

```text
Portfolio values
Safety Buffer coverage
Projected Growth
Current vs Recommended Allocation
Suggestion eligibility
Suggestion ranking
Top Pick
APY
Estimated earnings
Token suitability
Protocol selection
Risk suitability
```

This is the most important rules file.

It should be read before implementing any financial screen.

---

### `suggestion-engine-rules.md`

Defines how suggestions are treated as structured deterministic outputs.

Covers:

```text
Suggestion source of truth
Suggestion IDs
Suggestion types
Eligibility
Priority
Locked suggestions
Dismissed suggestions
Actionable vs informational suggestions
Suggestion card rendering
Suggestion refresh
```

Important rule:

```text
Suggestion cards render Suggestion Engine output.
They do not generate recommendations.
```

---

### `top-pick-rules.md`

Defines how WealthSmith handles the single highest-priority recommendation.

Covers:

```text
Exactly one Top Pick
Safety Buffer override
Critical recommendation priority
Tie-breaking
Locked suggestions
Top Pick badge rules
Dashboard alert sync
Demo Mode Top Pick
```

Important rule:

```text
There must be exactly one Top Pick when actionable suggestions exist.
```

---

### `protocol-selection-rules.md`

Defines how WealthSmith chooses the destination protocol/platform for an actionable suggestion.

Covers:

```text
Protocol Logic responsibilities
Suggestion Engine vs Protocol Logic
Supported MVP protocols
Protocol eligibility
Protocol exclusion
Safety-first ordering
Yield strategy handoff
New-tab behavior
Protocol URL source of truth
```

Important rule:

```text
Suggestion Engine decides what to do.
Protocol Logic decides where the user should go.
```

---

### `wallet-and-custody-rules.md`

Defines wallet, connection, read-only, security, and custody rules.

Covers:

```text
Supported MVP wallets
Wallet connection copy
Read-only connection
No custody
No seed phrase requests
No private key requests
Ledger considerations
Wallet pill behavior
Disconnect behavior
Signature boundaries
```

Important rule:

```text
Connecting a wallet must never imply WealthSmith can move funds.
```

---

### `loading-state-rules.md`

Defines global loading delay and animation usage.

Covers:

```text
0–400ms no loading
400–800ms subtle pending
800ms+ explicit loading
1.5s+ explanatory loading
Skeleton usage
Smith AI animation usage
Reduced motion
Avoiding loading flicker
```

Important rule:

```text
Do not show loading for fast updates.
```

---

### `demo-mode-rules.md`

Defines how Demo Mode behaves and how it stays separate from real wallet data.

Covers:

```text
Demo Mode entry
Demo banner
Sample data
Demo suggestions
Ask Smith AI in Demo Mode
Exit Demo
Real wallet transition
Data separation
Copy rules
```

Important rule:

```text
Demo data must never be mixed with real wallet data.
```

---

### `smith-ai-rules.md`

Defines what Smith AI can and cannot do.

Covers:

```text
Explanation role
Prompt boundaries
Structured context
Support answers
Suggestion explanations
Goal editing guidance
Wallet safety
No deterministic financial logic
No invented policy
No transaction execution
```

Important rule:

```text
Smith AI explains WealthSmith logic.
It does not create the financial logic.
```

---

## Rule Severity

Use these severity levels:

```text
Hard Rule
  Must always be followed.
  Breaking it creates product, safety, legal, financial, or trust risk.

Implementation Rule
  Must be followed for MVP consistency.
  Breaking it creates inconsistent UX or engineering risk.

Guidance
  Recommended behavior.
  Can change with explicit product/design decision.
```

Rule files should label critical constraints as:

```text
Hard Rule
```

Example:

```text
Hard Rule:
Never ask for seed phrases or private keys.
```

---

## Global Hard Rules

These apply across the entire product.

### Financial Logic

```text
The UI must not invent financial recommendations.
Smith AI must not invent financial recommendations.
Claude Code must not calculate financial recommendations unless implementing approved deterministic product logic.
```

### Wallet Safety

```text
Never ask for seed phrases.
Never ask for private keys.
Never ask users to upload wallet backup files.
Never imply WealthSmith holds funds.
Never imply wallet connection moves funds.
```

### Execution

```text
MVP suggestion cards open protocol pages in new tabs.
They do not execute transactions.
They do not request wallet signatures.
```

### Demo Mode

```text
Demo data must never be mixed with real wallet data.
```

### Top Pick

```text
When actionable suggestions exist, exactly one suggestion may be labeled Top Pick.
```

### Smith AI

```text
Smith AI is an explanation layer, not the deterministic recommendation engine.
```

### Support

```text
FAQ content is canonical.
Smith AI must not invent product policy, pricing, wallet support, protocol support, or security claims.
```

### Loading

```text
Do not show loading UI for fast updates.
```

---

## Relationship to Components

Components must follow rules.

Example:

```text
components/suggestion-card.md
  must follow:
    rules/suggestion-engine-rules.md
    rules/top-pick-rules.md
    rules/protocol-selection-rules.md
    rules/financial-logic-boundaries.md
```

Example:

```text
components/global-nav.md
  must follow:
    rules/wallet-and-custody-rules.md
    rules/demo-mode-rules.md
```

Example:

```text
components/loading-indicator.md
  must follow:
    rules/loading-state-rules.md
```

Components should not restate every rule.

They should reference the relevant rule file.

---

## Relationship to Patterns

Patterns must follow rules.

Example:

```text
patterns/dashboard-layout.md
  must follow:
    rules/financial-logic-boundaries.md
    rules/suggestion-engine-rules.md
    rules/top-pick-rules.md
    rules/loading-state-rules.md
    rules/demo-mode-rules.md
    rules/wallet-and-custody-rules.md
```

Example:

```text
patterns/wallet-connection.md
  must follow:
    rules/wallet-and-custody-rules.md
```

Example:

```text
patterns/support-center.md
  must follow:
    rules/smith-ai-rules.md
    rules/wallet-and-custody-rules.md
```

Patterns may explain how rules appear in a flow, but the rule files are the source of truth.

---

## Relationship to Smith AI

Smith AI must use rule files as behavioral constraints.

Smith AI may:

```text
Explain deterministic suggestions
Explain Safety Buffer logic
Explain portfolio sections
Explain support topics using canonical support content
Guide users through onboarding
Help users understand goal settings
Route users to Contact Us
```

Smith AI must not:

```text
Invent recommendations
Invent Top Pick
Invent APY
Invent protocol choice
Invent supported assets
Invent supported wallets
Invent pricing
Invent security guarantees
Execute transactions
Ask for seed phrases
Ask for private keys
Claim WealthSmith holds funds
```

---

## Relationship to Claude Code

Claude Code must treat this folder as constraint documentation.

Claude Code should:

```text
Read rules before implementing related UI
Use structured data contracts
Keep financial logic in approved product logic
Render UI from props/state
Use approved components
Use approved patterns
Use approved assets
Use semantic tokens
Preserve accessibility
```

Claude Code must not:

```text
Move financial logic into random UI components
Hardcode recommendations
Hardcode Top Pick
Hardcode protocol URLs outside approved metadata
Invent loading behavior
Invent wallet support
Invent copy that implies custody or guaranteed returns
Mix demo and real data
```

---

## Relationship to Content

Rules constrain copy.

Do not use copy that says or implies:

```text
Guaranteed returns
Risk-free
Profit guaranteed
We manage your funds
We execute for you
Your funds are safe with us
AI chose the perfect strategy
Send your seed phrase
Send your private key
```

Prefer copy like:

```text
Suggested next action
Estimated yield
Based on your current plan
No action will be taken automatically
Your funds stay in your wallet
You stay in control
Open protocol
Review before taking action
```

---

## Relationship to Data

Rules assume product data is structured.

Good:

```json
{
  "suggestion_id": "fund_safety_buffer_usdc",
  "priority": 100,
  "is_top_pick": true,
  "action_type": "swap_to_stablecoin",
  "destination_protocol_id": "jupiter"
}
```

Bad:

```text
AI-generated sentence decides what the user should do.
```

Rules:

- UI renders structured data.
- Smith AI explains structured data.
- Deterministic logic creates structured data.
- Copy templates can transform structured data into user-facing text.
- Freeform AI text must not become the source of financial truth.

---

## Review Checklist

Before shipping a WealthSmith screen, check:

```text
Does the UI render structured product data?
Does it avoid inventing financial values?
Does it avoid inventing suggestions?
Does it show exactly one Top Pick when applicable?
Does it keep wallet connection read-only?
Does it avoid implying custody?
Does it avoid implying automatic execution?
Does it keep demo and real data separate?
Does it use approved assets?
Does it use semantic tokens?
Does it avoid loading flicker?
Does it respect reduced motion?
Does Smith AI explain instead of decide?
Does support content stay canonical?
Does it avoid asking for seed phrases/private keys?
```

---

## MVP Build Order

Recommended order for rule files:

```text
1. financial-logic-boundaries.md
2. wallet-and-custody-rules.md
3. suggestion-engine-rules.md
4. top-pick-rules.md
5. protocol-selection-rules.md
6. smith-ai-rules.md
7. demo-mode-rules.md
8. loading-state-rules.md
```

Reason:

```text
Financial boundaries protect the product first.
Wallet/custody protects user trust.
Suggestion/Top Pick/Protocol rules protect recommendation integrity.
Smith AI rules protect explanation boundaries.
Demo/loading rules protect UX consistency.
```

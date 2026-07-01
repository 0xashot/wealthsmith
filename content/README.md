# Content

Content defines WealthSmith’s approved user-facing language.

It documents what the product should say, when it should say it, and what it must never say.

Content is separate from:

```text
tokens/      visual foundations
assets/      approved visual files
components/  reusable UI elements
patterns/    full product flows
rules/       product logic and safety boundaries
```

Content protects the product’s trust, clarity, and financial safety.

---

## Purpose

The `content/` folder helps Product, Design, Engineering, Smith AI, and Claude Code use consistent WealthSmith language.

It should answer:

```text
What copy is approved?
What words should we use?
What words should we avoid?
How do we explain financial concepts?
How do we explain wallet connection?
How do we explain suggestions?
How do we explain Demo Mode?
How do we handle empty, loading, and error states?
What FAQ answers are canonical?
```

Content files should be treated as implementation guidance for any user-facing copy.

---

## Core Content Principle

WealthSmith copy should be:

```text
calm
clear
trustworthy
beginner-friendly
non-hype
non-custodial
explainable
specific
actionable without being pushy
```

WealthSmith copy must not imply:

```text
Guaranteed returns
Risk-free yield
Custody
Automatic execution
Protocol endorsement beyond product logic
Financial certainty
Wallet recovery
Trading authority
```

---

## Content Folder Structure

Recommended MVP content folder:

```text
content/
  README.md
  voice-and-tone.md
  ui-copy-rules.md
  suggestion-card-copy.md
  onboarding-copy.md
  smith-ai-copy.md
  support-faq-content.md
  empty-error-loading-copy.md
  wallet-copy.md
  demo-mode-copy.md
  glossary.md
```

This set covers the primary MVP copy surfaces.

---

## Content File Responsibilities

### `voice-and-tone.md`

Defines WealthSmith’s product voice.

Covers:

```text
Brand tone
Writing principles
Sentence style
Financial safety language
Beginner-friendly explanations
Trust-building language
Forbidden tone
Examples of good/bad copy
```

Primary rule:

```text
WealthSmith should sound like a calm product teammate, not a trading influencer.
```

---

### `ui-copy-rules.md`

Defines global UI copy standards.

Covers:

```text
Button labels
CTA labels
Section titles
Helper text
Validation messages
Tooltips
Badges
Modal titles
Toast messages
Menu labels
New-tab labels
Capitalization
Punctuation
Number phrasing
```

Primary rule:

```text
UI copy should be short, clear, and tied to real product state.
```

---

### `suggestion-card-copy.md`

Defines approved copy patterns for suggestion cards.

Covers:

```text
Suggestion titles
Suggestion summaries
Reason copy
Top Pick copy
Locked suggestion copy
Safety Buffer suggestions
Rebalance suggestions
Yield suggestions
Protocol handoff CTAs
Estimated impact language
Forbidden recommendation copy
```

Primary rule:

```text
Suggestion card copy must be generated from structured Suggestion Engine output and approved templates.
```

This file is especially important because it prevents the frontend and Smith AI from inventing recommendation language.

---

### `onboarding-copy.md`

Defines approved onboarding questions, helper copy, and Smith AI onboarding messages.

Covers:

```text
Wallet connection prompt
Demo Mode prompt
Financial goal question
Time horizon question
Risk tolerance question
Monthly income question
Monthly expenses question
Contribution rhythm question
Monthly saving goal question
Review step
Undo / Restart copy
Post-onboarding transition copy
```

Primary rule:

```text
Onboarding copy should collect structured plan inputs one step at a time without feeling like a financial exam.
```

---

### `smith-ai-copy.md`

Defines approved Smith AI response patterns.

Covers:

```text
Explaining Safety Buffer
Explaining Top Pick
Explaining suggestions
Explaining locked opportunities
Explaining protocol handoffs
Explaining wallet connection
Explaining Demo Mode
Explaining Goal settings
Missing data responses
Uncertainty responses
Contact support routing
Forbidden Smith AI phrases
```

Primary rule:

```text
Smith AI explains WealthSmith logic. It does not create the logic.
```

---

### `support-faq-content.md`

Defines canonical FAQ and support answers.

Covers:

```text
What is WealthSmith?
Which wallets are supported?
Is WealthSmith custodial?
What permissions are requested?
What is Demo Mode?
How are suggestions generated?
Does WealthSmith execute transactions?
What is Safety Buffer?
What is Top Pick?
What protocols are supported?
How do users contact support?
```

Primary rule:

```text
FAQ content is canonical. Smith AI must not invent support policy.
```

---

### `empty-error-loading-copy.md`

Defines approved copy for non-happy-path states.

Covers:

```text
Empty states
Loading messages
Partial data states
Error messages
Stale data messages
Wallet disconnected states
Suggestion unavailable states
APY unavailable states
Portfolio unavailable states
Contact submission errors
Retry copy
```

Primary rule:

```text
Empty, loading, and error copy should explain what happened and what the user can do next without blame or alarm.
```

---

### `wallet-copy.md`

Defines approved wallet and custody copy.

Covers:

```text
Connect Wallet
Wallet connected
Wallet disconnected
Read-only connection
Non-custodial explanation
Seed phrase/private key warnings
Message signing explanation
Ledger-safe copy
Wallet error messages
Wallet menu copy
```

Primary rule:

```text
Wallet copy must make it clear that funds stay in the user’s wallet.
```

---

### `demo-mode-copy.md`

Defines approved Demo Mode copy.

Covers:

```text
Try Demo Mode
Demo banner
Sample portfolio labels
Sample suggestion labels
Exit Demo
Demo-to-wallet transition
Smith AI demo explanations
Demo mode warnings
```

Primary rule:

```text
Demo copy must clearly distinguish sample data from real wallet data.
```

---

### `glossary.md`

Defines approved explanations of WealthSmith terms.

Covers:

```text
Safety Buffer
Top Pick
Projected Growth
Current vs Recommended Allocation
Liquid Assets
Staked Assets
Yield Strategies
Protocol handoff
Non-custodial
Demo Mode
APY
Estimated earnings
Rebalance
Risk tolerance
Time horizon
```

Primary rule:

```text
Definitions should be simple enough for crypto-curious users without hiding important risk context.
```

---

## Relationship to Rules

Content must follow product rules.

Important rule files:

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

Examples:

```text
content/suggestion-card-copy.md
  must follow:
    rules/suggestion-engine-rules.md
    rules/top-pick-rules.md
    rules/protocol-selection-rules.md
    rules/financial-logic-boundaries.md
```

```text
content/wallet-copy.md
  must follow:
    rules/wallet-and-custody-rules.md
```

```text
content/smith-ai-copy.md
  must follow:
    rules/smith-ai-rules.md
```

```text
content/demo-mode-copy.md
  must follow:
    rules/demo-mode-rules.md
```

Content must never contradict rules.

If content and rules conflict, rules win.

---

## Relationship to Components

Components render content.

Components do not invent content.

Examples:

```text
components/suggestion-card.md
  renders copy from content/suggestion-card-copy.md

components/global-nav.md
  renders labels from content/ui-copy-rules.md and content/wallet-copy.md

components/modal.md
  renders modal title/body/actions from approved content

components/toast.md
  renders approved toast messages

components/empty-state.md
  renders approved empty/error/loading copy
```

Rules:

- Components should not hardcode financial recommendation copy.
- Components may contain stable UI labels only when approved by content docs.
- Components should receive copy from structured props or templates where the content is state-dependent.

---

## Relationship to Patterns

Patterns define when copy appears.

Content defines what copy says.

Examples:

```text
patterns/onboarding-with-smith-ai.md
  uses:
    content/onboarding-copy.md
    content/smith-ai-copy.md
```

```text
patterns/suggestion-flow.md
  uses:
    content/suggestion-card-copy.md
    content/smith-ai-copy.md
```

```text
patterns/support-center.md
  uses:
    content/support-faq-content.md
    content/wallet-copy.md
```

```text
patterns/empty-loading-error-states.md
  uses:
    content/empty-error-loading-copy.md
```

Rules:

- Patterns should reference approved content instead of inventing local copy.
- If a pattern needs repeated copy, add it to a content file.
- If copy changes product meaning, update content and rules together.

---

## Relationship to Smith AI

Smith AI should use content files as approved response patterns.

Smith AI may:

```text
Use approved explanation templates
Use glossary definitions
Summarize canonical FAQ answers
Explain suggestion card copy
Explain wallet copy
Explain Demo Mode copy
Route users to Contact Us when unsure
```

Smith AI must not:

```text
Invent support policy
Invent product pricing
Invent supported wallets
Invent protocol support
Invent APY
Invent guarantees
Use hype language
Ask for seed phrases or private keys
```

If Smith AI lacks approved content, it should say it does not know or route to support.

---

## Relationship to Structured Data

Many content templates use structured variables.

Example:

```text
Your Safety Buffer covers {covered_months} of {target_months} months.
```

Allowed variables must come from product logic:

```text
covered_months
target_months
buffer_gap_usd
token_symbol
protocol_label
estimated_apy
suggestion_reason
destination_protocol
wallet_provider
short_address
```

Rules:

- Content templates may insert structured values.
- Content templates must not calculate structured values.
- Missing variables should trigger safe fallback copy.
- Do not show placeholder variables to users.
- Do not invent values to fill a template.

---

## Copy Severity Levels

Use these copy categories:

```text
Stable UI Copy
  Labels that rarely change.
  Example: Dashboard, Portfolio, Connect Wallet.

State Copy
  Copy shown based on app state.
  Example: Wallet connected, Demo Mode active.

Financial Copy
  Copy that affects user financial understanding.
  Example: Fund your Safety Buffer.

Support Copy
  Canonical FAQ and help answers.
  Example: Is WealthSmith custodial?

Smith AI Copy
  Conversational explanation patterns.
  Example: This is Top Pick because...
```

Financial Copy and Support Copy require the strictest review.

---

## Global Approved Terms

Use these terms consistently:

```text
WealthSmith
Smith AI
Dashboard
Portfolio
Goal
Support
Safety Buffer
Top Pick
Projected Growth
Current vs Recommended Allocation
Liquid Assets
Staked Assets
Yield Strategies
Demo Mode
Connect Wallet
Ask Smith AI
Try Demo Mode
Exit Demo
Open protocol
Review externally
```

Rules:

- Do not rename product concepts casually.
- Do not alternate between many terms for the same concept.
- Keep labels consistent across UI, FAQ, Smith AI, and docs.

---

## Global Forbidden Terms and Claims

Do not use:

```text
Guaranteed returns
Risk-free
Guaranteed APY
Perfect strategy
Best investment
AI found the best trade
We will invest for you
We will rebalance for you
We moved your funds
Funds are safe with us
Secure your funds with WealthSmith
Send your seed phrase
Send your private key
Execute now
Trade now
```

Use safer alternatives:

```text
Estimated
Suggested
Review
Open protocol
No action will be taken automatically
Your funds stay in your wallet
You stay in control
Based on your current plan
```

---

## Capitalization Rules

Use title case for main navigation and primary section labels when consistent with UI design:

```text
Dashboard
Portfolio
Goal
Support
Ask Smith AI
Connect Wallet
Try Demo Mode
Safety Buffer
Top Pick
Projected Growth
```

Use sentence case for longer helper copy, descriptions, error messages, and Smith AI responses:

```text
Connect your wallet so WealthSmith can read balances and positions.
```

Rules:

- Do not use all caps for warnings.
- Do not overuse exclamation marks.
- Keep financial warnings calm.

---

## CTA Rules

CTAs should describe what happens next.

Use:

```text
Connect Wallet
Try Demo Mode
Ask Smith AI
Open protocol
Review on Jupiter
Manage on Kamino
Save Changes
Discard Changes
Send Message
Exit Demo
```

Avoid:

```text
Execute now
Confirm trade
Start earning
Lock in yield
Maximize profits
Let AI decide
```

Rules:

- CTA must not imply execution unless the product actually executes.
- MVP protocol CTA should imply external review, not in-app transaction.
- Wallet CTA should imply connection, not custody.
- Contact CTA should imply sending a message, not guaranteed resolution.

---

## Financial Copy Rules

Financial copy should always be:

```text
specific
grounded
non-guaranteed
non-custodial
actionable without pressure
```

Use:

```text
Suggested next action
Estimated APY
Based on your current plan
This may change
Review before taking action
No action will be taken automatically
```

Avoid:

```text
Guaranteed profit
Risk-free yield
Best possible trade
You must act now
AI is investing for you
```

Rules:

- If values are estimated, say estimated.
- If APY can change, do not present it as fixed.
- If external protocol is involved, tell user they review externally.
- If action is not automatic, say so when relevant.

---

## Wallet Copy Rules

Wallet copy must reinforce:

```text
Non-custodial
Read-only for MVP
Funds stay in wallet
No seed phrase/private key
No automatic execution
```

Approved baseline copy:

```text
WealthSmith reads balances and positions only.
Your funds stay in your wallet.
```

Warning copy:

```text
Never share your seed phrase or private key.
```

Rules:

- Never ask for wallet secrets.
- Do not imply WealthSmith holds or protects funds.
- Do not imply wallet connection authorizes transactions.
- Do not imply disconnecting wallet moves funds.

---

## Demo Copy Rules

Demo copy must reinforce:

```text
Sample data
Preview experience
Not real wallet data
Can exit Demo Mode
Can connect wallet for real personalization
```

Approved baseline copy:

```text
You’re in demo mode.
```

```text
Sample portfolio
```

```text
Connect your wallet to personalize WealthSmith with your real portfolio.
```

Rules:

- Do not call demo data “your wallet.”
- Do not call demo suggestions real recommendations.
- Smith AI must use demo-aware phrasing.

---

## Error Copy Rules

Error copy should:

```text
Explain what happened
Preserve trust
Avoid blame
Offer a next step
Avoid financial panic
```

Use:

```text
We couldn’t load suggestions right now.
Your dashboard is still available. Try again in a moment.
```

Avoid:

```text
Failed.
Error.
Your wallet is unsafe.
Something went terribly wrong.
```

Rules:

- Keep user input on form errors.
- Do not imply funds are affected.
- Do not use scary language.
- Do not hide errors behind loading.

---

## Loading Copy Rules

Use loading copy only when loading is visible.

Approved examples:

```text
Loading...
Saving...
Sending...
Refreshing...
Building your suggestions...
Preparing strategy insights...
Loading wallet positions...
```

Avoid:

```text
Executing...
Trading...
Moving funds...
Optimizing profits...
Securing assets...
```

Rules:

- Loading copy must describe the real process.
- Do not imply execution or custody.
- Smith AI animation copy must be used only for approved Smith AI/suggestion waits.

---

## Empty State Copy Rules

Empty copy should explain what is missing and what to do next.

Use:

```text
No suggestions yet
Complete your plan or connect a wallet to generate personalized suggestions.
```

```text
No wallet connected
Connect your wallet or try Demo Mode to explore WealthSmith.
```

Rules:

- Do not show fake data.
- Do not make the user feel at fault.
- Provide one clear next action.
- Do not confuse empty with error.

---

## Content Data Format

Content can be stored as Markdown for human-readable guidance and JSON for implementation-ready copy maps.

Markdown files:

```text
voice-and-tone.md
ui-copy-rules.md
support-faq-content.md
glossary.md
```

Possible JSON files later:

```text
suggestion-card-copy.json
ui-labels.json
error-copy.json
faq-content.json
glossary.json
```

Rules:

- Markdown explains intent.
- JSON can power implementation.
- Keep IDs stable.
- Do not duplicate conflicting copy across files.
- If the same copy appears in multiple surfaces, define it once and reference it.

---

## Suggested Copy ID Pattern

Use stable content IDs for implementation.

Examples:

```text
nav.dashboard
nav.portfolio
nav.goal
nav.support
wallet.connect.title
wallet.connect.helper
demo.banner.title
suggestion.fund_safety_buffer.title
suggestion.locked.buffer_required
error.suggestions.load_failed
loading.suggestions.building
faq.wallet.non_custodial
glossary.safety_buffer
```

Rules:

- IDs should be descriptive and stable.
- Do not put final copy in code without ID if it is reused or state-dependent.
- Content IDs help Claude Code avoid inventing copy.

---

## Review Checklist

Before shipping copy, check:

```text
Is it calm and clear?
Is it beginner-friendly?
Is it grounded in product data?
Does it avoid guarantees?
Does it avoid custody claims?
Does it avoid automatic execution claims?
Does it avoid unsupported protocol/wallet claims?
Does it avoid asking for secrets?
Does it distinguish Demo Mode from real data?
Does it explain the next step?
Does it match WealthSmith terminology?
Does it follow the relevant rules file?
```

---

## Claude Code Rules

Claude Code should:

- Use content files for user-facing copy.
- Use stable content IDs where implementation benefits.
- Use approved UI labels.
- Use suggestion copy templates.
- Use canonical FAQ content.
- Use wallet safety copy.
- Use demo-aware copy in Demo Mode.
- Use safe empty/error/loading copy.
- Keep Smith AI responses grounded in approved copy patterns.
- Ask for product-approved copy when missing.

Claude Code must not:

- Invent financial recommendation copy.
- Invent support policy.
- Invent wallet support.
- Invent protocol support.
- Invent APY/yield claims.
- Invent security guarantees.
- Use hype copy.
- Ask for seed phrases or private keys.
- Use demo copy for real wallet data.
- Use real-wallet copy for demo data.
- Use CTA copy that implies execution when action is only a handoff.
- Put one-off financial copy directly into components.

---

## MVP Build Order

Recommended order:

```text
1. content/README.md
2. content/voice-and-tone.md
3. content/ui-copy-rules.md
4. content/suggestion-card-copy.md
5. content/smith-ai-copy.md
6. content/support-faq-content.md
7. content/empty-error-loading-copy.md
8. content/wallet-copy.md
9. content/demo-mode-copy.md
10. content/onboarding-copy.md
11. content/glossary.md
```

Reason:

```text
Voice and global UI rules define the foundation.
Suggestion and Smith AI copy protect recommendation safety.
FAQ/wallet/demo copy protect trust.
Onboarding and glossary support the full experience.
```

---

## Done Criteria

The `content/` folder is MVP-ready when:

- Voice and tone rules exist.
- Global UI copy rules exist.
- Suggestion card copy templates exist.
- Smith AI response patterns exist.
- Support FAQ content exists.
- Wallet copy exists.
- Demo Mode copy exists.
- Empty/error/loading copy exists.
- Onboarding copy exists.
- Glossary exists.
- Copy avoids guarantees, custody claims, and automatic execution claims.
- Copy never asks for seed phrases or private keys.
- Copy uses consistent WealthSmith terminology.
- Claude Code can implement UI copy without inventing financial language.

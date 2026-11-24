# UI Copy Rules

This file defines WealthSmith’s global UI copy rules.

It covers short, reusable product language used across components and screens.

UI copy includes:

```text
Navigation labels
Button labels
CTA labels
Section titles
Field labels
Helper text
Validation messages
Badges
Toasts
Modal titles
Tooltip copy
Menu labels
Empty states
Loading copy
Error copy
External-link copy
```

UI copy should be short, clear, grounded in product state, and consistent with WealthSmith’s voice.

---

## Purpose

UI copy helps users understand:

```text
Where they are
What something means
What action is available
What will happen next
What state the product is in
What is missing
What went wrong
What is not happening automatically
```

UI copy must not create financial logic.

UI copy must not invent product behavior.

UI copy must not imply custody, execution, or guaranteed returns.

---

## Core Rule

Hard Rule:

```text
UI copy must describe real product state and real available actions.
```

Hard Rule:

```text
UI copy must not imply WealthSmith holds funds, guarantees returns, or controls the user’s wallet.
```

Hard Rule:

```text
UI copy must not imply WealthSmith executes a transaction on the user’s behalf.
```

MSP added one narrow exception, and only to the second of those rules: a swap the
user approves transaction-by-transaction in their own wallet (`handoff_type:
in_app_confirm` — see `rules/wallet-and-custody-rules.md` → Execution Boundary).

Copy for that step may describe a transaction being prepared, checked and
submitted, because that is what happens. It still may not describe WealthSmith as
deciding to act, acting without approval, or holding anything at any point. The
first and third rules above are unchanged and have no exception.

Everything outside that one step remains a handoff, and the rules apply in full.
See Swap Confirmation Copy.

Hard Rule:

```text
UI copy must never ask for seed phrases or private keys.
```

---

## Writing Style

Use:

```text
Short labels
Plain language
Specific actions
Consistent terminology
Sentence case for helper/error text
Title case for short nav/section labels
```

Avoid:

```text
Hype
Pressure
Fear
Vague errors
Unclear CTAs
AI magic language
Protocol promotion
Financial certainty
```

Good:

```text
Connect Wallet
Your funds stay in your wallet.
```

Bad:

```text
Authorize WealthSmith to manage assets.
```

---

## Capitalization

Use title case for:

```text
Navigation labels
Primary page titles
Short section headings
Primary action labels
Product concepts
```

Examples:

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
Current vs Recommended Allocation
```

Use sentence case for:

```text
Helper text
Descriptions
Validation messages
Error messages
Loading explanations
Smith AI responses
Longer card copy
```

Examples:

```text
Connect your wallet so WealthSmith can read balances and positions.
```

```text
Your funds stay in your wallet.
```

Rules:

- Do not use all caps.
- Do not overuse exclamation marks.
- Keep punctuation minimal in short labels.

---

## Punctuation

Rules:

- Short labels do not need periods.
- Full sentences should use periods.
- Loading copy may use ellipses.
- Avoid exclamation marks in financial copy.
- Avoid scary punctuation in errors.

Use:

```text
Loading...
Building your suggestions...
Saving...
```

Avoid:

```text
Huge opportunity!!!
Critical!!!
```

---

## Primary Navigation Labels

Approved labels:

```text
Dashboard
Portfolio
Goal
Support
```

Rules:

- Do not rename navigation labels without product decision.
- Do not abbreviate labels.
- Do not use icons without visible labels on desktop.
- Active state is visual/programmatic, not copy-based.

Related component:

```text
components/global-nav.md
```

---

## Global Nav Action Labels

Approved labels:

```text
Try Demo Mode
Connect Wallet
Ask Smith AI
```

Wallet pill format:

```text
{Wallet Provider} • {short address}
```

Example:

```text
Phantom • 6fQ9
```

Rules:

- Do not use `Start Earning`.
- Do not use `Authorize Wallet`.
- Do not use `AI Advisor`.
- Do not show full wallet address in Global Nav by default.
- Do not show wallet icon without wallet name.

---

## Page Titles

Approved MVP page titles:

```text
Dashboard
Portfolio
Goal
Support
```

Rules:

- Page title should match primary nav label.
- Do not change title based on panel state.
- Do not use marketing-style page titles inside the app.
- Keep page titles short and stable.

---

## Section Titles

Approved common section titles:

```text
Financial Snapshot
Safety Buffer
Projected Growth
Current vs Recommended Allocation
Balance Overview
Crypto Assets Allocation
Asset Deployment Overview
Liquid Assets
Staked Assets
Yield Strategies
Goal & Risk Tolerance
Finances
Contribution and Timeline
Getting Started
Wallet
Demo Mode
Suggestions
Contact Us
```

Rules:

- Section titles should be nouns or noun phrases.
- Do not make section titles into full instructions.
- Do not use hype words in section titles.
- Keep capitalization consistent.

---

## Button and CTA Rules

CTAs must describe what happens next.

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
Cancel
Exit Demo
Continue
Back
Restart Onboarding
Undo
```

Avoid:

```text
Execute now
Trade now
Confirm trade
Maximize profits
Start earning
Lock in yield
Let AI decide
Authorize funds
Move funds
```

Hard Rule:

```text
If an action only opens an external protocol, CTA copy must not imply in-app execution.
```

Good:

```text
Review on Jupiter
```

Bad:

```text
Swap now
```

unless WealthSmith actually executes a swap flow, which is not MVP behavior.

---

## CTA Intent by Surface

### Wallet

Use:

```text
Connect Wallet
Disconnect Wallet
```

Do not use:

```text
Authorize Funds
Give Access
Secure Wallet
```

### Suggestions

Use:

```text
Open protocol
Review on Jupiter
Review on Kamino
Manage on Jito
```

Do not use:

```text
Execute
Trade
Confirm
Complete
```

### Goal Settings

Use:

```text
Save Changes
Discard Changes
Edit Mode
```

Do not use:

```text
Apply Strategy
Invest Now
```

### Contact Us

Use:

```text
Send Message
Cancel
```

Do not use:

```text
Submit Ticket Now!
Guarantee Response
```

---

## Helper Text Rules

Helper text should explain why a field or action matters.

Good helper copy:

```text
Estimate your average monthly income.
```

```text
We’ll use this to model your contribution plan.
```

```text
Connect your wallet so WealthSmith can read balances and positions.
```

Rules:

- Keep helper text to one sentence when possible.
- Explain purpose, not product internals.
- Do not over-explain simple fields.
- Do not use helper text to hide critical safety information.
- Do not imply automatic execution.

Avoid:

```text
This will let WealthSmith invest for you.
```

---

## Form Field Labels

Approved Goal field labels:

```text
Financial Goal
Risk Tolerance
Income
Expenses
Monthly Saving Goal
Contribution Frequency
Timeline
```

Approved Contact Us labels:

```text
Your Email
Description
```

Approved prompt labels/placeholders:

```text
Ask Smith AI
Ask a question...
```

Rules:

- Field labels must be visible.
- Placeholder text must not replace a label.
- Currency prefix must not replace the label.
- Optional fields should be clearly marked.

Approved optional format:

```text
Monthly Saving Goal
Optional
```

---

## Validation Message Rules

Validation messages should be calm, specific, and recoverable.

Use:

```text
Enter your email so we can reply.
Enter a valid email address.
Describe what you need help with.
Enter a monthly income amount.
Enter monthly expenses so we can calculate your Safety Buffer.
Monthly saving goal is optional, but it must be a positive amount if entered.
```

Avoid:

```text
Invalid.
Wrong.
Bad value.
Error.
Required!
```

Rules:

- Place validation near the affected field.
- Preserve user input.
- Do not blame the user.
- Do not shame income, expenses, or savings values.
- Do not imply funds are affected.

---

## Toast Copy Rules

Toasts confirm short-lived state changes.

Approved examples:

```text
Wallet connected
Wallet disconnected
Goal settings saved
Message sent
Copied
```

Rules:

- Toasts should be short.
- Toasts should not replace persistent state.
- Toasts should not imply transactions executed unless product actually executed them.
- Toasts should not say funds moved.
- Toasts should be announced politely.

Avoid:

```text
Funds moved
Trade complete
Strategy executed
```

---

## Badge Copy Rules

Badges must reflect structured state.

Approved badges:

```text
Top Pick
Critical
High Priority
Locked
Demo
Estimated
Unavailable
Stale
```

Suggestion-related badges may include:

```text
Top Pick
Unlock after Buffer is Full
```

Rules:

- Badge meaning must come from structured product state.
- `Top Pick` may appear on exactly one actionable suggestion.
- Locked badges should not look like active CTAs.
- Badges should not rely on color alone.
- Do not invent badges in UI components.

Avoid:

```text
Best
Guaranteed
Safe
Risk-Free
Perfect
```

---

## Modal Copy Rules

Modal titles should be clear and specific.

Approved modal titles:

```text
Connect Wallet
Contact Us
```

Connect Wallet modal baseline copy:

```text
Choose a wallet to continue.
WealthSmith reads balances and positions only.
Your funds stay in your wallet.
```

Contact Us modal baseline copy:

```text
Contact Us
Do not include seed phrases, private keys, or passwords.
```

Rules:

- Modal titles should describe the task.
- Modal body should set expectations.
- Action buttons should be direct.
- Do not hide security warnings in small print.
- Do not use modals for hype.

---

## Menu Copy Rules

Approved menu items:

```text
Disconnect Wallet
Restart Onboarding
```

Rules:

- Menu items should be verbs or verb phrases.
- Destructive/risky actions should be clear.
- Do not use vague items like `Settings` unless there is a settings destination.
- Do not use icon-only menu items without accessible labels.

---

## Tooltip Copy Rules

Tooltips should clarify, not carry critical information.

Good:

```text
Estimated APY can change.
```

```text
This opens the protocol in a new tab.
```

Rules:

- Keep tooltips short.
- Do not hide critical financial warnings in tooltips.
- Do not rely on hover-only behavior.
- Tooltip copy should be accessible.

Avoid:

```text
Long educational paragraphs.
```

---

## Empty State Copy Rules

Empty states should explain what is missing and give one next action.

Approved examples:

```text
No suggestions yet
Complete your plan or connect a wallet to generate personalized suggestions.
```

```text
No wallet connected
Connect your wallet or try Demo Mode to explore WealthSmith.
```

```text
No help articles found
Try another keyword, ask Smith AI, or contact us.
```

Rules:

- Do not show fake data.
- Do not blame the user.
- Do not create urgency.
- Provide one clear next step when possible.

---

## Loading Copy Rules

Use loading copy only when loading is actually visible.

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

Rules:

- Loading copy must describe the real process.
- Do not imply transactions are executing.
- Do not imply funds are moving.
- Do not imply AI is making unsupervised decisions.

Avoid:

```text
Executing your strategy...
Moving assets...
Trading...
Securing funds...
Optimizing profits...
```

---

## Error Copy Rules

Errors should explain what happened and what the user can do next.

Approved examples:

```text
We couldn’t load suggestions right now.
Your dashboard is still available. Try again in a moment.
```

```text
We couldn’t send your message right now.
Your message is still here. Try again in a moment.
```

```text
We couldn’t load all wallet positions.
Some portfolio sections may be incomplete.
```

```text
We couldn’t save your goal settings right now.
Your changes are still here. Try again in a moment.
```

Rules:

- Keep copy calm.
- Do not blame the user.
- Do not imply funds are affected.
- Do not use scary language.
- Preserve user input where relevant.
- Offer retry or next step when possible.

Avoid:

```text
Failed.
Error.
Critical failure.
Wallet unsafe.
Something went terribly wrong.
```

---

## Stale and Partial Data Copy

Use when some data may be outdated or incomplete.

Approved examples:

```text
This data may be outdated. Refresh to update your portfolio.
```

```text
Some portfolio sections may be incomplete.
```

```text
Current APY could not be loaded.
```

Rules:

- Be explicit about what is stale or unavailable.
- Do not show stale data as current.
- Do not invent fallback values.
- Do not hide partial states if they matter.

---

## External Link Copy

Protocol actions open external protocols in new tabs. This is the default and the
fallback: every action is a handoff unless Protocol Logic has marked it
`in_app_confirm`, and a swap whose terms we cannot show or check falls back here.

The one exception is covered by Swap Confirmation Copy. A confirm step is not a
handoff and must never be described as one.

Use:

```text
Open protocol
Review on Jupiter
Review on Kamino
Manage on Jito
```

Optional helper:

```text
Opens in a new tab.
```

Rules:

- Tell users when they are leaving WealthSmith if context needs it.
- Do not imply WealthSmith executes the action.
- Do not mark action as completed after opening a link.
- Do not show success copy that implies transaction execution.

Good toast if needed:

```text
Opened Jupiter in a new tab.
```

Avoid:

```text
Trade submitted.
Rebalance complete.
Funds moved.
```

---

## Swap Confirmation Copy

Applies ONLY to a swap Protocol Logic has marked `in_app_confirm` and that
satisfies the Execution Boundary. Everything else uses External Link Copy.

What is true at this step, and what the copy must therefore reflect:

```text
WealthSmith prepares an unsigned transaction.
WealthSmith checks that it performs the terms shown.
The user approves it in their own wallet, once, for that transaction only.
WealthSmith never holds funds and never approves anything.
```

### Terms

Five terms are required before approval, per the Execution Boundary: what is
sold, what is received, the minimum received after slippage, price impact, and
fees. None may be omitted, and none may be estimated when it can be exact.

Labels:

```text
You swap        0.01 SOL
You receive     ~0.721313 USDC
Min received    0.717707 USDC
Price impact    0.008%
Network fee     ~$0.01
Route           Jupiter
```

Hard Rule:

```text
The minimum received is the only figure the user is guaranteed. It must be shown
with equal or greater prominence than the estimated amount, never below the fold,
and never described as an estimate.

Prominence comes from its label and from the absence of a tilde, not from a
larger type size. Every amount in the sheet is set at the same size: a column of
figures reads as a column, and one amount a step larger looks like a styling
slip rather than emphasis. The minimum is the one with no “~”.
```

Mark an estimate on the **figure**, with a leading `~`, and nowhere else. No
label says “(estimated)”: the tilde is the only marker, so the mark travels with
the number and scanning the values alone shows which are approximate. The one
figure with no tilde is the guaranteed one.

Because the tilde is the only marker, rendering an estimated value without it
silently removes the distinction while every copy constant still reads
correctly. Estimated figures must go through the shared formatters rather than
being interpolated directly.

Never put a tilde on the minimum. It is exact and enforced on-chain, and marking
it approximate would undo the only promise this sheet makes.

A number we cannot obtain renders as “—”; it is never replaced with a different
number, and never written as “~—” — marking the precision of a figure we do not
have is worse than saying nothing.

The minimum carries an info icon with the explanation, rather than a line of body
copy — it is a definition, and definitions belong in a tooltip (see Tooltip Copy
Rules):

```text
The least you will receive. This is enforced by the network: if the swap would
deliver less, it fails and your funds stay in your wallet.
```

That sentence may only be used where it is literally true — where the minimum is
enforced on-chain by the transaction itself. It must not be used to describe a
tolerance, a target, or a provider’s promise.

### States

```text
Checking:   ⟳ Checking transaction
Ready:      Approve
Approved:   ⟳ Waiting for wallet
Sent:       ⟳ Confirming
Expired:    These terms expired. Nothing was sent.
```

**The review's footer button says `Swap`.** It opens the confirm step rather
than swapping anything, which is the convention every wallet uses — Phantom's
equivalent says "Swap Now" and also only opens a confirmation. The next screen
shows the terms and asks for Approve, so a reader who expected an immediate
swap is corrected before any transaction exists. It stays inside the rule that
matters: it names what the USER is doing, never WealthSmith.

**Every waiting state lives in the primary button, and there is no status
line.** There used to be one under the terms for everything before Approve.
Two places meant the reader had to know which to watch, and during a quote
renewal a sentence appeared under the figures while the button below it said
nothing at all.

The button slot is therefore occupied in every phase before completion —
Approve when there is something to approve, a spinner and a word when there is
not. That is also what keeps the footer still: nothing appears, disappears or
shifts underneath someone who is about to press it.

**No explorer link while the swap is in flight.** During those two states the
sheet is already polling the chain on the reader's behalf and will say what
happened; a link beside a spinner invites them to go and do that job themselves,
in another tab, at the moment they have nothing to decide. It appears the
instant we stop — on success it is their record, and on a timeout or a revert it
is their only recourse. Deferred, never denied.

A spinner alone would be shorter, but it cannot tell someone whose wallet is
merely open from someone whose transaction is already on the chain, and only the
second means closing the tab will not stop it. That distinction is worth two
words. `submitting` and `confirming` share a label on purpose: the difference
between sent and confirmed is ours, not the user's.

**When the quote gives up, the review closes.** After it has quietly re-quoted
its full allowance with the modal in front of someone and still has no
decision, a dead-end card offering yet another attempt is an obstacle rather
than a remedy. The review closes itself and a toast says what happened:

```text
These terms expired
Nothing was sent. Open the suggestion again for current terms.
```

It still accounts for the money — the first thing anyone wants to know when a
window closes by itself is whether something happened — and it does not say
“Refresh”, because there is no longer a button to press.

This applies ONLY to that one ending. Every other expiry (a backgrounded tab,
no way to re-quote) leaves the expired card in place with its Refresh button,
so a reader who was not watching comes back to an explanation rather than to a
vanished modal and a toast that dismissed itself while they were away.

**No countdown.** The quote renews itself while the sheet is open, so a clock
would be reporting our bookkeeping rather than anything the reader must act on.
It is also pressure: a timer on a financial confirmation pushes people to
approve before they have finished reading, which is the opposite of what a
confirmation step is for. Wallets that re-quote continuously show no clock
either. The plan still expires — after a few renewals the sheet falls through to
the expired state above — the reader is simply not made to watch it.

The check is a statement about this transaction, not reassurance in general. Do
not write “Verified”, “Safe”, “Secure”, or anything implying an endorsement of
the trade itself. We checked that the transaction matches the terms. We did not
check that the swap is a good idea.

**Demo Mode is the one place this sheet shows an action that cannot be taken.**
Everywhere else an unavailable action is absent rather than greyed out, because
a dead button reads as “almost” and explains nothing. Demo Mode earns the
exception: it exists to show people the product before they commit a wallet, so
hiding the final step would hide the thing they came to see. The button stays,
visibly unavailable, and gives the reason on hover and on keyboard focus:

```text
Demo Mode uses a sample portfolio. Connect your wallet to make a real swap.
```

A fact about the mode, never a refusal of the person, and it names the way out.
Use `aria-disabled`, not `disabled` — a truly disabled button leaves the tab
order and fires no pointer events, which would make the explanation unreachable
by keyboard and absent on hover, defeating the point of showing it.

**The passed state says nothing at all.** It is the resting state — terms on
screen, Approve available — and that is already the message. The word
“Success” sat directly above an unpressed Approve button and read as though the
swap had gone through, while the screen that really does complete says “Swap
complete”. A verdict that appears only before anything happens, and never when
it does, is worse than silence.

The line still keeps its place when it empties, so the button underneath does
not move at the moment someone is reaching for it. Whenever **we** are doing
something — preparing, checking, waiting on the wallet, confirming — it must
say so; silence is only for states where the user is the one to act.

### Actions

```text
Primary:    Approve
Secondary:  Cancel
```

“Approve” is permitted here, while “Confirm trade” and “Execute now” remain
forbidden, because the user approves in their own wallet and the label describes
their action rather than ours.

Cancelling is always available before submission and always free. Copy must never
suggest a cost, a penalty, or a lost opportunity for declining.

### Outcomes

```text
Approved:        Swap complete
Declined:        Not approved. You declined in your wallet. Nothing was sent.
Not sent:        The swap wasn’t sent. Your funds stayed in your wallet.
Still pending:   Still confirming. We stopped waiting, but the swap may still
                 complete. Check your wallet.
```

Hard Rule:

```text
Success copy may be shown only after the transaction is confirmed on-chain, and
must state the amount actually received — never the estimate shown beforehand.
If the received amount cannot be read, show the success state without a figure.
```

Hard Rule:

```text
A transaction that was submitted and not yet confirmed must never be described as
failed. It is on-chain and may still succeed; saying otherwise is a false claim
about the user’s money.
```

A transaction link (e.g. Solscan) may be offered on a completed or still-pending
swap. Label it plainly and never as a required step.

### Refusals

When a check fails, the copy says what WE refused and why, without blaming the
user or the provider, and offers the handoff:

```text
We couldn’t verify these terms.
The transaction we were given doesn’t match the terms we’d show you, so we’re not
asking you to approve it. You can swap on Jupiter directly.
```

This is the one place the copy should feel slightly alarming. A refusal the user
skims past is a refusal that did nothing.

---

## Wallet Copy Rules

Approved baseline:

```text
Connect your wallet so WealthSmith can read balances and positions.
Your funds stay in your wallet.
```

Security warning:

```text
Never share your seed phrase or private key.
```

Message signing explanation if needed:

```text
Sign this message to confirm wallet ownership.
This is not a transaction and will not move funds.
```

Rules:

- Do not say WealthSmith protects funds.
- Do not say WealthSmith manages funds.
- Do not ask for secrets.
- Do not imply connecting wallet approves transactions.
- Do not imply disconnecting wallet moves funds.

---

## Demo Mode Copy Rules

Approved baseline:

```text
You’re in demo mode.
```

```text
Sample portfolio
```

```text
Sample suggestions
```

```text
Exit Demo
```

```text
Connect your wallet to personalize WealthSmith with your real portfolio.
```

Rules:

- Always label demo data.
- Do not call demo data the user’s real wallet.
- Smith AI should say “in this demo” when explaining demo values.
- Demo suggestions must not sound like real wallet advice.

---

## Suggestion Copy Rules

Suggestion card copy must come from structured suggestion data and approved templates.

Use:

```text
Fund your Safety Buffer
Reduce volatile exposure
Review idle USDC
Unlock after your Safety Buffer is fully funded
```

Rules:

- Suggestion titles should be action-oriented but not pushy.
- Suggestion reasons should explain why.
- Suggestion CTAs should use review/open language.
- Do not invent missing values.
- Do not use guaranteed/hype language.
- Do not imply automatic execution.

Avoid:

```text
Best trade now
Guaranteed yield
Execute this move
AI found the winner
```

---

## Smith AI UI Copy Rules

Approved labels:

```text
Ask Smith AI
Smith AI Suggestions
Smith AI Strategy Insights
Smith AI can make mistakes. Check important info.
```

Rules:

- Do not label Smith AI as financial advisor.
- Do not say Smith AI decides recommendations.
- Do not say Smith AI executes actions.
- Keep safety note visible where appropriate.
- Feedback labels should be accessible.

---

## Support Copy Rules

Approved labels:

```text
Support
Search help articles or keywords
Getting Started
Wallet
Contact Us
Your Email
Description
Send Message
Cancel
```

Rules:

- FAQ answers are canonical support content.
- Do not invent product policy in UI.
- Contact form must not ask for seed phrases/private keys.
- Contact Us should be available when FAQ search has no results.

---

## Content Variables

Use structured variables only when product data provides them.

Examples:

```text
{wallet_provider}
{short_address}
{token_symbol}
{protocol_label}
{covered_months}
{target_months}
{buffer_gap_usd}
{estimated_apy}
{timeline}
```

Rules:

- Do not show unresolved variables.
- Do not invent values.
- Provide fallback copy when variable is missing.
- Format values consistently.

Good:

```text
Phantom • 6fQ9
```

Bad:

```text
{wallet_provider} • {short_address}
```

shown to user.

---

## Good / Bad Examples

### CTA

Good:

```text
Review on Jupiter
```

Bad:

```text
Execute swap
```

### Wallet

Good:

```text
Your funds stay in your wallet.
```

Bad:

```text
We protect your funds.
```

### Error

Good:

```text
We couldn’t load suggestions right now.
```

Bad:

```text
Failed.
```

### Demo

Good:

```text
In this demo portfolio...
```

Bad:

```text
Your real portfolio...
```

### Suggestion

Good:

```text
This appears because your Safety Buffer is below target.
```

Bad:

```text
AI found the perfect move.
```

---

## Forbidden UI Copy

Never use:

```text
Guaranteed returns
Guaranteed APY
Risk-free yield
Perfect strategy
Best investment
AI found the best trade
We will invest for you
We will rebalance for you
We moved your funds
Funds are safe with us
Secure your assets with WealthSmith
Send your seed phrase
Send your private key
Execute now
Confirm trade
```

“Execute now” and “Confirm trade” stay forbidden even at an approved confirm
step: both describe WealthSmith acting. The permitted label there is “Approve”,
which describes what the user does in their own wallet. See Swap Confirmation
Copy.

“Rebalance complete”, “Trade submitted” and “Funds moved” also stay forbidden.
“Swap complete” is permitted ONLY after on-chain confirmation of a transaction
the user approved, and only with the amount actually received.

Use safer alternatives:

```text
Estimated
Suggested
Review
Open protocol
No action will be taken automatically
Your funds stay in your wallet
Based on your current plan
```

---

## Copy ID Guidance

For implementation, reusable copy should use stable IDs.

Examples:

```text
nav.dashboard
nav.portfolio
nav.goal
nav.support
global_nav.try_demo
global_nav.connect_wallet
global_nav.ask_smith_ai
wallet.connected_toast
wallet.disconnected_toast
demo.banner.title
goal.save_success
support.contact_success
error.suggestions_load_failed
loading.suggestions_building
```

Rules:

- Use stable IDs for repeated or state-dependent copy.
- Do not duplicate conflicting copy across components.
- Do not hardcode financial recommendation copy into reusable UI components.
- Let content templates own recommendation language.

---

## Accessibility Copy Rules

Rules:

- Icon-only actions must have accessible labels.
- Disabled actions should have explanation when needed.
- New-tab protocol links should communicate new-tab behavior where practical.
- Error messages should be associated with fields.
- Loading state should have readable status text.
- Toasts should be announced politely.
- Do not rely on visual symbols only.

Accessible label examples:

```text
Open Ask Smith AI
Connected wallet: Phantom, address ending 6fQ9. Open wallet menu.
Close Contact Us modal
Search support articles
```

---

## Related Files

Content:

```text
content/voice-and-tone.md
content/suggestion-card-copy.md
content/wallet-copy.md
content/demo-mode-copy.md
content/empty-error-loading-copy.md
content/smith-ai-copy.md
content/support-faq-content.md
content/onboarding-copy.md
content/glossary.md
```

Rules:

```text
rules/financial-logic-boundaries.md
rules/wallet-and-custody-rules.md
rules/suggestion-engine-rules.md
rules/top-pick-rules.md
rules/protocol-selection-rules.md
rules/smith-ai-rules.md
rules/demo-mode-rules.md
rules/loading-state-rules.md
```

Components:

```text
components/global-nav.md
components/button.md
components/input.md
components/modal.md
components/toast.md
components/alert.md
components/empty-state.md
components/suggestion-card.md
```

---

## Claude Code Rules

Claude Code should:

- Use approved labels and CTA copy.
- Keep UI copy short and specific.
- Use structured variables only from product data.
- Use safe fallback copy when variables are missing.
- Use review/open language for protocol handoffs.
- Use non-custodial wallet copy.
- Use demo-aware copy in Demo Mode.
- Use calm validation/error copy.
- Use accessible labels for icon-only controls.
- Keep financial recommendation copy in content templates.

Claude Code must not:

- Invent financial recommendation copy.
- Invent support policy.
- Use CTAs that imply execution for external handoffs.
- Use wallet copy that implies custody.
- Use copy that implies guaranteed returns.
- Use copy that asks for seed phrases or private keys.
- Use demo copy for real wallet data.
- Use real-wallet copy for demo data.
- Show unresolved variables.
- Hide critical meaning inside tooltips.
- Put state-dependent financial copy directly into components without content guidance.

---

## Do

- Use clear labels.
- Use consistent product terms.
- Use short CTAs.
- Explain next steps.
- Keep errors recoverable.
- Keep wallet copy non-custodial.
- Keep demo copy clearly labeled.
- Keep external handoff copy honest.
- Use accessible labels.
- Keep financial copy grounded in data.

---

## Do Not

- Do not hype.
- Do not pressure.
- Do not use vague errors.
- Do not imply execution.
- Do not imply custody.
- Do not imply guaranteed outcomes.
- Do not ask for wallet secrets.
- Do not invent support policy.
- Do not invent recommendation copy.
- Do not use icons without labels where identity matters.
- Do not show unresolved placeholders.

---

## Done Criteria

UI copy is implemented correctly when:

- Navigation labels are consistent.
- CTAs describe the actual next action.
- Wallet copy says funds stay in the user’s wallet.
- Protocol CTAs use review/open language.
- Demo Mode copy clearly labels sample data.
- Validation messages are specific and non-blaming.
- Toasts are short and accurate.
- Error messages are calm and recoverable.
- Loading copy does not imply execution.
- Badges reflect structured state.
- Suggestion copy does not invent financial logic.
- Accessibility labels are present.
- No UI copy implies guaranteed returns, custody, automatic execution, or risk-free yield.
- No UI copy asks for seed phrases or private keys.

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

### Getting to the confirm step: Review, then Swap

Decided 2026-11-26, after the first real swap attempt in production. The path
is two presses, and each one waits IN PLACE:

```text
[ Review ]   on the suggestion card   → spins on the card until the route is chosen
[ Swap ]     in the review            → spins in the review until the terms are loaded
[ Approve ]  in the confirm step      → the user's own wallet
```

Hard Rules:

```text
The review opens with its route ALREADY selected. No loading state inside the
review, and no footer that changes while one resolves.

The selected route does not change while the review is open. It is a snapshot
of one proposal: a price refresh behind it changes nothing in front of the
reader, and a comparison that has aged stays on screen.

Pressing Swap changes nothing on screen except the button, until the confirm
step has terms to show. The review keeps its heading and its body the whole
time.

The review's footer is Cancel and Swap. There is NO link out to a swap
provider — no "Swap on Jupiter", "Swap on Raydium" or similar — in any state,
including the confirm step's failure screens.
```

The footer never renders nothing. Its states:

```text
A swap can be offered            [Cancel]  [Swap]
A wait is in flight              [Cancel]  [ ◌ ]                 spinner, same size as the button pressed
Wallet link could not be opened  [Cancel]  [Reconnect Wallet]
No wallet known to reconnect to  [Cancel]  [Swap] (greyed)       reason in a tooltip on the button
No swap can be offered           [Close]   [Check Again]         a banner under the title says why
Checking again                   [Close]   [ ◌ ]                 spinner, same size as Check Again
```

**Signed in, wallet link closed.** A session survives a page refresh; the
wallet's live connection does not (auto-connect is off by design). The header
still names the wallet, so the review must not tell that person to reconnect.

```text
Swap stays a working button. Pressing it reopens the wallet link first —
spinning in place — and then continues to the terms. It is the wallet's own
connect request: no signature, no transaction.

Only if that fails (declined in the wallet, a different account from the one
signed in, or no answer within 30 seconds) does Reconnect Wallet take Swap's
place. Pressing it tries again; it does not continue into the swap by itself.
When a wallet that can sign is connected, the footer is Cancel and Swap again.

Never show a greyed Swap beside a header that says the wallet is connected.
```

**No wallet known to reconnect to** (a last resort that a signed-in session
should not reach). The greyed Swap carries its reason as a tooltip, on hover and
on focus — nothing is written beside it:

```text
Reconnect your wallet to swap
```

Use `aria-disabled`, not `disabled`, so the button stays focusable: the tooltip
is the only place the reason is given, and a truly disabled button would put it
out of reach of a keyboard and of a tap.

**No swap can be offered.** Said first: an Info banner directly under the
review's title, above the recommendation. The recommendation still stands; what
is blocked is executing it, and the reader should learn that before reading
the amounts to send and receive.

```text
(i)  No swap currently meets our limits
     None of the available quotes met WealthSmith’s execution limits. No
     transaction was submitted. Check again for updated quotes.

                                                  [Close]  [Check Again]
```

Hard Rules:

```text
A rejected quote is never shown as executable. In this state there is no Swap
button (not even greyed), no selected route, no provider, and no quote figures.

The notice is not repeated lower in the review, and there is no "Refresh
comparison" control in the body. Re-running the comparison is the footer's
primary action, Check Again.

Check Again waits in place like Swap does: the button spins at its own size,
and the banner and the rest of the review do not change until the answer is in.
If a route is found, the banner goes, the route appears and the footer becomes
Cancel and Swap — in one change. Check Again never opens the confirm step by
itself: asking whether a route exists is not pressing Swap.
```

When the comparison itself could not be completed (a failed request), the same
banner and footer are used with this copy:

```text
(i)  Route comparison is unavailable right now
     Your financial suggestion is unchanged. You can try the comparison again
     later.
```

An aged comparison is not a reason to take Swap away: the terms someone
approves are the plan's own, fetched when Swap is pressed. If the comparison
has actually expired, Swap re-runs it first, quietly, still spinning in place.

Between routes whose outcomes are within 0.05% of each other, the route that
can be approved in WealthSmith is the one selected. A route that is better by
more than that still wins on its price, whoever provides it.

These rules cover the REVIEW. The confirm step's own failure screens are
governed below; none of them links out to a provider either — see "Refusals".

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

Never put a tilde on the minimum's TOKEN figure. It is exact and enforced
on-chain, and marking it approximate would undo the only promise this sheet
makes. Its dollar value is a different matter: converting tokens to dollars
needs a price, so that line is marked like any other estimate. Exact in tokens,
approximate in dollars — which is precisely what the guarantee is.

Token amounts carry thousands separators — `30,453.030446 USDC`, not
`30453.030446 USDC`. Group the integer part of the STRING and copy the fraction
through untouched: the minimum is the figure the chain enforces, and sending it
through `Number` or `toLocaleString` to make it prettier is how a guarantee
quietly becomes `30,453.03`.

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
Checking:   ⟳                       (spinner only; label announced, not shown)
Ready:      Approve
Approved:   ⟳ Waiting for wallet
Sent:       ⟳ Confirming
Expired:    Your swap quote expired. No transaction was submitted.
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

**Fetching terms is silent; everything after Approve is not.** While a quote is
being fetched or renewed nothing is at stake — no transaction exists, nothing
is in flight, the reader has approved nothing — so the button shows a spinner
and no words. After Approve the label stays, because those states are not
interchangeable: "Waiting for wallet" means nothing was sent, while
"Confirming" means the transaction is already on the chain and closing the tab
will not stop it. A bare spinner cannot say which, and that difference belongs
to the user.

A hidden label is still in the DOM: it is the live region a screen reader
reads, so the silence is visual only.

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
Swap Quote Expired
```

One line, no helper. A toast is a notification, not a screen: it names which
thing just happened and gets out of the way. The explanation — nothing
submitted, open the suggestion again — belongs on the card, which is one click
away and states it in full.

It carries the card's name for the ending, because it is the same ending on a
different surface and a reader who meets both should not have to work out
whether they are two events. Shorter by one word: the card addresses someone
mid-decision and names the swap as theirs, while a toast slides past the corner
of a screen they may already have left, where "Your" is a syllable in the way.

**Toasts dismiss themselves after six seconds**, in `ToastHost` rather than in
each caller. The timer was the caller's job until a caller forgot and left one
on screen indefinitely; "every caller must remember" is not a guarantee. It still accounts for the money — the first thing
anyone wants to know when a window closes by itself is whether something
happened — and it does not offer a new quote as a button, because there is no
longer one to press.

This applies ONLY to that one ending. Every other expiry (a backgrounded tab,
no way to re-quote) leaves the expired card in place with its Refresh button,
so a reader who was not watching comes back to an explanation rather than to a
vanished modal and a toast that dismissed itself while they were away.

**The expired card names the quote, not our bookkeeping.**

```text
Your Swap Quote Expired
No transaction was submitted. Get a new quote to review the latest price and fees.
[ Get New Quote ]
```

"Terms" is our word. What expired, from the reader's side, is the quote they
were looking at — so the heading says so, the description leads with the money,
and the button names the thing the press produces rather than the mechanic that
produces it. "Refresh" told them what the app does; "Get New Quote" tells them
what they get, and matches the heading's noun so the button is visibly the
answer to the sentence above it. The second half of the description says why a
new quote is worth reading rather than clicking through: the price and fees may
have moved while they were deciding.

**Two kinds of mark, and most endings get neither.** A failure state may carry
one 72px disc above its description. Which one — and whether it appears at all
— is decided by `failureMarkFor`, not by the component:

| Ending | Mark | Why |
| --- | --- | --- |
| `plan_unavailable`, `verification_failed`, `submit_failed` | amber alert | Something went wrong and the reader did not choose it. |
| `expired` | primary-coloured clock | Nothing went wrong. A quote aged out and a new one fixes it, so the mark matches the action offered, not the vocabulary of failure. |
| `confirm_timeout` | primary-coloured clock |  Nothing broke: our deadline ran out, not the transaction. Same mark as an expiry, because both are about time rather than failure. |
| `declined` | danger-coloured cross | The reader's own No, confirmed the way every wallet confirms a rejected request. The red does not claim a problem — the copy says "Swap Canceled" — it makes the refusal unmistakable at a glance. |
| `cancelled` | none | Never rests on screen — cancelling leaves the step rather than resting in it. |

An amber alert over an expiry would tell the reader something broke, which is
untrue; no mark at all leaves an unexplained change of screen mid-decision with
nothing to anchor it. Three kinds, three colours, none standing in for another:
collapse any two and the mark stops telling the reader which kind of ending
they are looking at.

**A finished swap answers a different question, so it is a different screen.**

```text
            ( ✓ )

        You received
    ⬤ 30,606.06 USDC
  Swapped: 204.1833 SOL

[ View on Solscan ]  [ Done ]
```

Before the swap the reader is deciding and needs every term, which is why that
screen is a table. Afterwards they want one number and a way out. Leaving the
terms table up after confirmation meant a completed swap was still displaying a
tilde’d expectation and a “Min received” floor — promises, shown as though they
were the outcome.

**The figure is what the chain delivered, never the quote.** It is read from the
landed transaction’s own token balances, server-side. It is never replaced by
the estimate: that number was a prediction made before the swap, and it is not
evidence of what the swap did.

**The outcome never waits for the figure.** This rule used to read "the figure
travels with the confirmation, so no screen can say a swap completed while the
amount is still loading" — and production disagreed. The chain reports a
transaction as landed through `getSignatureStatuses` seconds before
`getTransaction` can return it: observed 2026-11-25, where a freshly landed
swap read as fee-null for over five seconds and then returned the exact figure.
Our poll asks at precisely that instant and then stops, so the old rule would
have shown "we couldn’t load the exact amount" for swaps whose amount was
available a second later.

So the outcome is reported the moment it is known, and the figures get a few
more attempts of their own. A late figure may fill a gap and nothing else: it
cannot change the phase, the failure or the signature, and it fills a field
only while that field is still null, so a later null can never erase a number
already on screen. If they never arrive, the fallback copy below stands.

When that read produces nothing — no RPC, a pruned transaction, an output that
is not an SPL balance — the amount is omitted and the sentence takes its place:

```text
            ( ✓ )

Your swap succeeded. We couldn’t load the exact USDC amount received.
View the transaction on Solscan for details.
        Swapped: 204.1833 SOL

[ View on Solscan ]  [ Done ]
```

It leads with the OUTCOME, so a reader meeting a screen without its number is
not left wondering whether the missing figure means a missing swap. It names the
token we could not count rather than saying “the exact amount”, and points at
the one place that does have it — which is also the button below. The swapped
line stays: it comes from the terms, which we have either way.

**Rounded for reading, not for brevity.** Two decimals from a thousand up, four
below it, and never to zero — a balance that would round away keeps enough
decimals to show four significant digits. Rounding is a reading aid; it may not
change what the number says.

**Done, not Close.** Nothing is being closed unfinished. Solscan sits beside it
as the secondary action rather than as a link in the body, because after the
fact it is one of the two things a reader might actually want to do.

**Try Again is offered on exactly one ending.** The wallet or the network
refused to broadcast: nothing reached the chain, nothing was charged, and the
terms themselves were fine, so a second attempt is the remedy rather than a
workaround.

```text
Your Swap Wasn’t Sent
No transaction was submitted. Your funds haven’t moved. Please try again.
[ Cancel ]  [ Try Again ]
```

It re-quotes rather than resending — terms that failed to send are older than
the ones the reader would be agreeing to now.

**The same key with a signature is a different event**, and it keeps the retry
with a warning attached rather than losing it:

```text
Your Swap Failed
Your tokens weren’t swapped. A network fee of 0.000019 SOL (<$0.01) was charged.
You can review a new quote and try again. Another attempt may incur a network fee.
[ Cancel ]  [ Try Again ]
```

That transaction reached the chain, ran, failed and took a fee, so a retry can
cost money again. Removing the button would not protect anyone — somebody whose
swap reverted still wants the swap, and would go and retry it somewhere with no
warning at all. The answer is disclosure: the second paragraph says what another
attempt may cost, and the person decides. It is a separate paragraph because a
cost warning may not be buried at the end of a line about tokens.

**A fee under a cent is "<$0.01", never "$0.00".** Real Solana fees are a
fraction of a cent — swaps measured on 2026-11-26 paid $0.0013 to $0.0035 — and
a two-decimal format prints every one of them as zero dollars, on the one screen
whose sentence says a fee WAS charged. From a cent up it reads "≈$0.02". The mark
travels with the figure, so the sentence adds none.

**A swap into SOL is read from lamports.** The route pays wrapped SOL into a
temporary account that is created and closed inside the transaction, so no token
balance survives to be read. The delivered figure is the taker's lamport delta
plus the fee — the same rule the pre-signing verification applies to the promised
minimum, so "delivered" has one definition on both sides of the signature.

**The fee is the one the chain took.** Read from the landed transaction, priced
from the same public source the terms used, and never the conservative constant
the quote disclosed beforehand — “was charged” is a statement about something
that already happened, and that constant described a different moment. When the
read produces nothing the sentence keeps the fact and drops the figure: “A
network fee was charged.” A reader who checks Solscan sees the real one either
way.

Before this, the description asked the reader to try again while the footer
offered only Cancel and another venue — the same class of untruth as copy
naming a Refresh button that is not on screen.

**When we do not know the outcome, the screen offers nothing that could start a
second swap.**

```text
            ( 🕐 )

Awaiting Confirmation
Confirmation is taking longer than expected. Your swap may still complete.
Check its status before starting another swap.

View on Solscan                                            [ Close ]
```

WE stopped watching; the transaction did not stop. "Taking longer than
expected" names whose deadline ran out — ours — and leaves the swap's own
status open. It may never say failed, lost or gone.

The real risk here is not confusion, it is a SECOND swap. Someone who reads
"we don't know" and starts again can end up executing both, so there is no
hand-off on this screen. A revert can be retried with a cost warning because we
know the first attempt is dead; here we know nothing yet, and could not even
tell them what another attempt might cost. The last sentence says to check
first, and the only outward link is the explorer, which is how they check.

**A decline is the reader's decision, so the screen stops asking.**

```text
Swap Canceled
The approval request was declined in your wallet. No transaction was
submitted, and your funds haven’t moved.
[ Close ]
```

"Not approved" was a verdict in the passive voice: it named the state of the
request rather than what the person did. The description says where the
decision was made, because the wallet and this screen are two surfaces, and
accounts for the money twice — nothing submitted, nothing moved — which are
separate reassurances, since a transaction can be submitted and still fail.

No provider hand-off here — or on any other ending. A link to the provider's
own page under a refusal asks the same question again in a venue where none of
this screen's checks apply.

The one remaining button says **Close**, not Cancel. "Cancel" is correct beside
a primary action, where it means "not that one". Standing alone, with nothing
left to decide, it would be asking the reader to cancel their own cancellation. Both marks share their geometry so the layout does not
shift between outcomes, settle once rather than looping — a pulsing mark on a
money screen nags rather than informs — and are `aria-hidden`, because the
sentence beside them already says what happened.

**No countdown.** The quote renews itself while the sheet is open, so a clock
would be reporting our bookkeeping rather than anything the reader must act on.
It is also pressure: a timer on a financial confirmation pushes people to
approve before they have finished reading, which is the opposite of what a
confirmation step is for. Wallets that re-quote continuously show no clock
either. The plan still expires — after a few renewals the sheet falls through to
the expired state above — the reader is simply not made to watch it.

**A reverted swap is not an unsent one.** Both arrive as `submit_failed`, and
they are different events for the user:

```text
Wallet could not send it:  The swap wasn’t sent
                           Your funds stayed in your wallet. …

Chain ran it and it failed: The swap didn’t go through
                           It reached the network and failed, so your tokens
                           weren’t swapped. The network fee was still charged. …
```

A revert reached the network, cost a fee, and produced a signature the sheet
links to — so the old shared copy put "wasn't sent" directly above a link to the
transaction that was sent. Say the fee was taken: it is small, the user will see
it on the explorer anyway, and finding it unmentioned is what turns a failed
swap into a reason to distrust us. Which copy applies is decided by whether a
signature exists, never by `failureDetail`, which is never rendered.

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

**A failed step is titled by its failure, in the modal's own header.** The
subpage heading is the step's one title, so a step that failed must not be
announced as "Review Swap" above a body explaining why there are no terms to
review. The body then carries only the explanation — repeating the title under
it reads as a heading for the paragraph.

```text
Couldn't Prepare Your Swap
We couldn't load a swap quote right now. No transaction was submitted, and
your funds haven't moved.

                                              [Cancel]  [Try Again]
```

No failure offers the provider's own page (decided 2026-11-26: a swap
WealthSmith suggests is approved here or not at all). Each ending gets the
remedy that actually fixes it, or Close:

```text
Couldn't Prepare Your Swap       [Cancel]  [Try Again]       nothing was built or sent; asking again is free
Your Swap Wasn't Sent            [Cancel]  [Try Again]
Your Swap Failed (reverted)      [Cancel]  [Try Again]       with the network-fee warning
Your Swap Quote Expired          [Cancel]  [Get New Quote]
We Couldn't Verify This Swap     [Close]                     a retry would be refused again
Swap Canceled                    [Close]
Awaiting Confirmation            [Close]                     the first swap may still land
```

No button appears without the means to deliver it.

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
Approved:        Swap Completed
Declined:        Swap Canceled. The approval request was declined in your wallet.
Not sent:        Your Swap Wasn’t Sent. No transaction was submitted. Your
                 funds haven’t moved. Please try again.
Reverted:        Your Swap Failed. Your tokens weren’t swapped. A network fee
                 of [amount] SOL (≈$[value]) was charged.
Still pending:   Awaiting Confirmation. Confirmation is taking longer than
                 expected. Your swap may still complete.
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
user or the provider. It does not send the reader to the provider's own page:

```text
We Couldn’t Verify This Swap
The transaction details didn’t match the swap quote, so we stopped before
requesting your approval. No transaction was submitted.

                                                              [Close]
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
“Swap Completed” is permitted ONLY after on-chain confirmation of a transaction
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

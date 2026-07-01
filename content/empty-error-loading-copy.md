# Empty, Error, and Loading Copy

This file defines approved WealthSmith copy for non-happy-path states.

It covers:

```text
Empty states
Loading states
Refreshing states
Partial data states
Stale data states
Unavailable states
Error states
Retry states
Wallet disconnected states
Demo Mode states
Smith AI context states
Contact Us states
```

These states are critical for user trust.

When data is missing, delayed, stale, or unavailable, WealthSmith must explain the state calmly and clearly.

---

## Purpose

Empty, error, and loading copy should help users understand:

```text
What is happening
What is missing
What is unavailable
Whether anything is wrong
Whether their funds are affected
What they can do next
Whether data is sample/demo, stale, or real
```

This copy must not:

```text
Show fake data
Invent financial values
Imply funds moved
Imply transaction execution
Imply custody
Create fear
Blame the user
Hide product limitations
```

---

## Core Hard Rules

Hard Rule:

```text
Never use fake financial data in empty, loading, or error states.
```

Hard Rule:

```text
Never imply funds moved, trades executed, or transactions were submitted unless product logic confirms it.
```

Hard Rule:

```text
Never use Smith AI animation as a generic loading state.
```

Hard Rule:

```text
Error copy must not imply funds are affected unless product data confirms that state.
```

Hard Rule:

```text
When data is missing, say what is missing. Do not invent it.
```

---

## State Definitions

Use the correct state.

```text
Loading
  Data or content is actively being fetched, calculated, or generated.

Refreshing
  Existing valid data is visible while updated data is being fetched.

Empty
  Product knows there is no data for this section.

Partial
  Some data loaded, but some data is unavailable or failed.

Stale
  Data exists but may be outdated.

Unavailable
  Feature, destination, protocol, or data source cannot be used right now.

Error
  Something failed and the user needs a clear next step.

Disconnected
  Wallet-dependent data cannot load because no wallet is connected.

Demo
  Sample data is active.
```

Rules:

- Do not show empty copy while loading.
- Do not show loading copy when product already knows data is empty.
- Do not show error copy when the state is simply empty.
- Do not hide partial data behind full-page error.
- Do not present stale data as current.

---

## Copy Style

Use:

```text
Calm
Specific
Recoverable
Short
Non-blaming
Actionable
```

Avoid:

```text
Failed
Invalid
Critical
Danger
Unsafe
Broken
Oops
Something went terribly wrong
```

Rules:

- Explain what happened.
- Offer one next action when useful.
- Preserve user input when possible.
- Avoid alarmist language.
- Do not use humor in financial/error states.
- Avoid exclamation marks.

---

## Loading Copy

Use only when loading is visible.

Approved short loading labels:

```text
Loading...
Saving...
Sending...
Refreshing...
Checking...
Connecting...
```

Approved section loading labels:

```text
Loading wallet positions...
Loading portfolio data...
Building your suggestions...
Preparing strategy insights...
Loading support content...
Loading Goal settings...
```

Rules:

- Loading copy must describe the real process.
- Do not imply execution.
- Do not imply funds are moving.
- Do not imply custody.
- Do not imply AI is trading or investing.
- Do not use loading copy for instant local interactions.

Avoid:

```text
Executing...
Trading...
Moving funds...
Optimizing profits...
Securing your assets...
AI is investing...
```

---

## Loading Timing Copy

Follow product loading timing rules.

```text
0–400ms:
  No visible copy.

400–800ms:
  Subtle pending copy if needed.

800ms+:
  Explicit loading copy.

1.5s+:
  Explanatory loading copy.
```

Subtle pending examples:

```text
Saving...
Refreshing...
Checking...
```

Explicit examples:

```text
Loading wallet positions...
Building your suggestions...
```

Explanatory examples:

```text
Building your suggestions...
WealthSmith is reviewing your portfolio and plan.
```

```text
Preparing strategy insights...
This may take a moment while WealthSmith checks your plan context.
```

Rules:

- Do not show long explanations for fast updates.
- Do not keep users in indefinite loading.
- Loading must resolve to content, empty, partial, stale, or error.

---

## Smith AI Animation Copy

Use Smith AI animation only for approved Smith AI/suggestion waits.

Allowed copy:

```text
Building your suggestions...
Preparing strategy insights...
Loading Smith AI explanation...
Preparing suggestion context...
```

Optional long-wait helper:

```text
This may take a moment while WealthSmith checks your plan context.
```

Not allowed:

```text
Connecting wallet...
Sending message...
Saving goal settings...
Loading portfolio table...
Opening protocol...
```

Rules:

- Use static WealthSmith symbol when reduced motion is enabled.
- Do not use Smith AI animation for generic loading.
- Do not imply Smith AI is creating financial logic.

---

## Refreshing Copy

Use refreshing copy when existing valid data stays visible.

Approved copy:

```text
Refreshing...
```

```text
Updating portfolio data...
```

```text
Refreshing suggestions...
```

```text
Checking for updates...
```

Rules:

- Keep current valid data visible when safe.
- Do not replace usable data with skeletons unnecessarily.
- Mark data stale if freshness matters.
- Do not show old suggestions as current after major state changes.

---

## Empty State Copy

Empty states should explain what is missing and what to do next.

Structure:

```text
Title
Description
Primary action
```

Rules:

- Title should be short.
- Description should explain why the state is empty.
- Primary action should be specific.
- Do not blame the user.
- Do not show fake examples unless clearly demo/sample.

---

# Global Empty States

## No Wallet Connected

Title:

```text
No wallet connected
```

Description:

```text
Connect your wallet or try Demo Mode to explore WealthSmith.
```

Primary actions:

```text
Connect Wallet
Try Demo Mode
```

Rules:

- Do not imply wallet connection moves funds.
- Pair with wallet safety copy when needed.

---

## No Suggestions Yet

Title:

```text
No suggestions yet
```

Description:

```text
Complete your plan or connect a wallet to generate personalized suggestions.
```

Primary actions:

```text
Connect Wallet
Complete Plan
```

Rules:

- Do not invent filler suggestions.
- Do not show Top Pick.
- Do not imply there should always be a suggestion.

---

## No Portfolio Data

Title:

```text
No portfolio data yet
```

Description:

```text
Connect a wallet so WealthSmith can read supported balances and positions.
```

Primary action:

```text
Connect Wallet
```

Rules:

- Use only when wallet is disconnected or no portfolio source exists.
- If wallet is connected but data failed, use an error or partial state instead.

---

## No Goal Settings

Title:

```text
No goal settings yet
```

Description:

```text
Add your goal, risk level, timeline, and contribution details so WealthSmith can personalize your plan.
```

Primary action:

```text
Set Goal
```

Rules:

- Do not generate personalized suggestions without required goal inputs.
- Do not use demo values unless Demo Mode is active.

---

## No Search Results

Title:

```text
No results found
```

Description:

```text
Try another keyword, ask Smith AI, or contact us.
```

Primary actions:

```text
Ask Smith AI
Contact Us
```

Rules:

- Use for Support FAQ search.
- Do not treat search miss as FAQ unavailable.
- Keep Contact Us available.

---

# Dashboard States

## Dashboard Loading

Title:

```text
Loading your dashboard...
```

Description:

```text
WealthSmith is preparing your portfolio and plan overview.
```

Rules:

- Prefer section-level loading over full-page loading.
- Do not show if content is ready within threshold.
- Do not use fake metrics.

---

## Dashboard Partial

Title:

```text
Some dashboard data is unavailable
```

Description:

```text
Your dashboard is still available, but a few sections may be incomplete.
```

Primary action:

```text
Refresh
```

Rules:

- Keep available sections visible.
- Use section-level messages for unavailable parts.
- Do not hide all dashboard content.

---

## Dashboard Error

Title:

```text
We couldn’t load your dashboard
```

Description:

```text
Try again in a moment.
```

Primary action:

```text
Retry
```

Rules:

- Use only when dashboard cannot render safely.
- Do not imply funds are affected.

---

# Safety Buffer States

## Safety Buffer Loading

Title:

```text
Loading Safety Buffer...
```

Description:

```text
WealthSmith is checking your stablecoin reserve against your plan.
```

Rules:

- Do not show fake coverage.
- Do not calculate in UI.
- Do not use Smith AI animation unless part of suggestion-building flow.

---

## Safety Buffer Missing Goal Data

Title:

```text
Safety Buffer unavailable
```

Description:

```text
Add monthly expenses and target timeline so WealthSmith can calculate your Safety Buffer.
```

Primary action:

```text
Update Goal
```

Rules:

- Use if required goal fields are missing.
- Do not infer expenses or target months.

---

## Safety Buffer Missing Wallet Data

Title:

```text
Safety Buffer unavailable
```

Description:

```text
Connect a wallet so WealthSmith can check your stablecoin reserve.
```

Primary action:

```text
Connect Wallet
```

Rules:

- Use if real-wallet mode needs wallet data.
- In Demo Mode, use demo data if available.

---

## Safety Buffer Error

Title:

```text
We couldn’t load Safety Buffer
```

Description:

```text
This section needs current plan and portfolio data. Try again in a moment.
```

Primary action:

```text
Retry
```

Rules:

- Do not show stale buffer as current.
- Do not create buffer suggestions from missing data.

---

# Projected Growth States

## Projected Growth Loading

Title:

```text
Loading Projected Growth...
```

Description:

```text
WealthSmith is modeling growth from your saved plan settings.
```

Rules:

- Do not use “guaranteed.”
- Do not imply future outcome is certain.
- Do not show fake chart values.

---

## Projected Growth Missing Inputs

Title:

```text
Projected Growth unavailable
```

Description:

```text
Add your timeline and contribution details to view a modeled projection.
```

Primary action:

```text
Update Goal
```

Rules:

- Do not generate projections from incomplete plan data.
- Do not use demo projection unless Demo Mode is active.

---

## Projected Growth Error

Title:

```text
We couldn’t load Projected Growth
```

Description:

```text
Try again after your plan data refreshes.
```

Primary action:

```text
Retry
```

Rules:

- Do not imply model failure affects funds.
- Keep other dashboard sections visible.

---

# Allocation States

## Allocation Loading

Title:

```text
Loading allocation...
```

Description:

```text
WealthSmith is comparing your current portfolio with your plan.
```

Rules:

- Do not show fake chart segments.
- Do not show recommended allocation without product logic.

---

## Allocation Missing Data

Title:

```text
Allocation unavailable
```

Description:

```text
Connect a wallet and complete your plan to compare current and recommended allocation.
```

Primary action:

```text
Connect Wallet
```

Rules:

- If wallet is connected but plan missing, use `Update Goal`.
- Do not invent recommended allocation.

---

## Allocation Error

Title:

```text
We couldn’t load allocation
```

Description:

```text
Current and recommended allocation could not be compared right now.
```

Primary action:

```text
Retry
```

---

# Portfolio States

## Portfolio Loading

Title:

```text
Loading portfolio...
```

Description:

```text
WealthSmith is reading supported balances and positions.
```

Rules:

- Do not show fake assets.
- Do not show wallet pill until wallet is connected.
- If wallet is connected but protocol data is loading, show wallet connected and section-level loading.

---

## Portfolio Empty

Title:

```text
No supported assets found
```

Description:

```text
WealthSmith did not find supported assets in this wallet.
```

Rules:

- Use only after wallet data is loaded.
- Do not imply the wallet has no assets at all unless product data confirms that.
- Say supported assets if unsupported assets may exist.

---

## Portfolio Partial

Title:

```text
Some portfolio data is unavailable
```

Description:

```text
WealthSmith loaded part of your portfolio, but some positions could not be checked.
```

Primary action:

```text
Refresh
```

Rules:

- Keep loaded positions visible.
- Mark unavailable sections clearly.
- Do not hide partial protocol failures.

---

## Portfolio Error

Title:

```text
We couldn’t load portfolio data
```

Description:

```text
Try again in a moment. Your funds stay in your wallet.
```

Primary action:

```text
Retry
```

Rules:

- Include non-custodial reassurance when useful.
- Do not imply funds are lost or affected.

---

## Liquid Assets Empty

Title:

```text
No liquid assets found
```

Description:

```text
WealthSmith did not find supported liquid assets in this wallet.
```

Rules:

- Use “supported” to avoid overstating coverage.
- Do not show fake token rows.

---

## Staked Assets Empty

Title:

```text
No staked assets found
```

Description:

```text
WealthSmith did not detect supported staked positions in this wallet.
```

Rules:

- Do not imply the user has no staking anywhere if unsupported protocols exist.
- Do not invent staking suggestions.

---

## Yield Strategies Empty

Title:

```text
No yield strategies found
```

Description:

```text
WealthSmith did not detect supported yield strategy positions in this wallet.
```

Rules:

- Do not imply user has no yield positions outside supported protocols.
- Do not show APY rows without data.

---

# APY and Yield States

## APY Loading

Title:

```text
Loading APY...
```

Description:

```text
WealthSmith is checking current yield data.
```

Rules:

- Do not show fake APY.
- Do not use stale APY as current.
- Do not imply APY is guaranteed.

---

## APY Unavailable

Title:

```text
APY unavailable
```

Description:

```text
Current APY could not be loaded.
```

Rules:

- Do not hide yield position if position data is available.
- Show APY as unavailable rather than fake.
- Smith AI should not invent APY.

---

## Estimated Earnings Unavailable

Title:

```text
Estimated earnings unavailable
```

Description:

```text
Estimated earnings could not be calculated without current yield data.
```

Rules:

- Do not calculate earnings in UI.
- Do not show yearly earnings without sourced data.

---

# Suggestion States

## Suggestions Loading

Title:

```text
Building your suggestions...
```

Description:

```text
WealthSmith is reviewing your portfolio and plan.
```

Rules:

- Use Smith AI animation only for this approved suggestion-building wait.
- Do not show fake suggestion cards.
- Do not show old suggestions as current if stale.

---

## Suggestions Empty

Title:

```text
No suggestions yet
```

Description:

```text
Complete your plan or connect a wallet to generate personalized suggestions.
```

Primary actions:

```text
Complete Plan
Connect Wallet
```

Rules:

- Do not create filler suggestions.
- Do not show Top Pick if no actionable suggestions exist.

---

## Suggestions On Track

Title:

```text
Your plan is on track
```

Description:

```text
WealthSmith does not have a higher-priority action right now.
```

Rules:

- Use when product logic says portfolio/plan is aligned.
- Do not show fake CTA.
- Do not call it Top Pick unless product logic marks an actionable suggestion.

---

## Suggestions Error

Title:

```text
We couldn’t load suggestions
```

Description:

```text
Your dashboard is still available. Try again in a moment.
```

Primary action:

```text
Retry
```

Rules:

- Do not infer suggestions locally.
- Do not ask Smith AI to generate fallback suggestions.
- Do not show stale Top Pick as current.

---

## Suggestions Stale

Title:

```text
Suggestions may be outdated
```

Description:

```text
Your plan or wallet data changed. Refresh suggestions before acting.
```

Primary action:

```text
Refresh
```

Rules:

- Do not show stale suggestions as current Top Pick.
- Do not encourage protocol handoff from stale suggestion.

---

## Locked Suggestion

Title:

```text
Locked
```

Description:

```text
Unlock after your Safety Buffer is fully funded.
```

Rules:

- Use only when product logic provides locked status.
- Do not show active CTA.
- Do not imply user is blocked from the whole product.

---

# Top Pick States

## No Top Pick

Title:

```text
No Top Pick right now
```

Description:

```text
WealthSmith does not have a valid actionable suggestion for your current state.
```

Rules:

- Use when no actionable suggestion exists.
- Do not invent a Top Pick.
- Do not use when suggestions are still loading.

---

## Top Pick Stale

Title:

```text
Top Pick needs refresh
```

Description:

```text
Your plan or wallet data changed. Refresh suggestions to see the current Top Pick.
```

Primary action:

```text
Refresh
```

Rules:

- Do not keep stale Top Pick badge active.
- Do not allow stale Top Pick handoff.

---

# Smith AI States

## Smith AI Loading

Title:

```text
Loading Smith AI...
```

Description:

```text
Preparing context for your question.
```

Rules:

- Use only after loading threshold.
- Preserve user prompt.
- Do not block the full dashboard.

---

## Smith AI Explanation Loading

Title:

```text
Loading Smith AI explanation...
```

Description:

```text
Smith AI is preparing an explanation from WealthSmith context.
```

Rules:

- Smith AI may use approved animation here.
- Do not imply Smith AI is creating financial logic.

---

## Smith AI Missing Context

Title:

```text
I don’t have enough context yet
```

Description:

```text
Connect a wallet, complete your plan, or try Demo Mode so I can explain this more clearly.
```

Rules:

- Use first person because this appears inside Smith AI.
- Do not invent context.
- Offer one next step where possible.

---

## Smith AI Error

Title:

```text
I couldn’t load the required context right now
```

Description:

```text
Try again in a moment.
```

Rules:

- Do not hallucinate answer.
- Keep prompt input available.
- Do not imply funds are affected.

---

## Smith AI Unsupported Question

Title:

```text
I can’t answer that confidently
```

Description:

```text
Check the Support page or contact us for help.
```

Rules:

- Use when canonical support content is missing.
- Do not invent policy.

---

# Wallet States

## Wallet Connecting

Title:

```text
Connecting...
```

Description:

```text
Approve the connection in your wallet.
```

Rules:

- Do not use Smith AI animation.
- Do not imply funds move.
- Do not show wallet connected until confirmed.

---

## Wallet Connected

Toast:

```text
Wallet connected
```

Optional helper:

```text
WealthSmith is loading supported balances and positions.
```

Rules:

- Wallet connected does not mean portfolio fully loaded.
- Portfolio loading may continue separately.

---

## Wallet Disconnected

Toast:

```text
Wallet disconnected
```

Optional helper:

```text
Your funds stay in your wallet.
```

Rules:

- Do not imply funds moved.
- Clear or hide wallet-dependent real data safely.

---

## Wallet Connection Failed

Title:

```text
Wallet connection failed
```

Description:

```text
We couldn’t connect to your wallet. Try again or choose another supported wallet.
```

Primary action:

```text
Try Again
```

Rules:

- Do not blame the user.
- Do not ask for seed phrase/private key.
- Do not imply funds are affected.

---

## Wallet Signature Failed

Title:

```text
Signature not completed
```

Description:

```text
The message signature was not completed. No funds moved.
```

Primary action:

```text
Try Again
```

Rules:

- Use only for message signing.
- Do not confuse with transaction signing.
- Do not tell users to expose secrets.

---

## Unsupported Wallet

Title:

```text
Wallet not supported
```

Description:

```text
Use Phantom, Solflare, or Backpack to connect to WealthSmith.
```

Rules:

- Keep wallet list aligned with product metadata.
- Do not claim unsupported wallets are coming unless roadmap content supports it.

---

# Protocol Handoff States

## Protocol Opening

Toast:

```text
Opened {protocol} in a new tab.
```

Rules:

- Use only if new tab opened successfully.
- Do not say action completed.
- Do not say transaction submitted.

---

## Protocol URL Missing

Title:

```text
Protocol unavailable
```

Description:

```text
We can’t route this action from WealthSmith right now.
```

Rules:

- Do not guess a URL.
- Do not invent an alternative protocol.
- Disable CTA.

---

## Protocol Handoff Failed

Title:

```text
We couldn’t open the protocol
```

Description:

```text
Try again in a moment.
```

Primary action:

```text
Retry
```

Rules:

- Do not mark suggestion complete.
- Keep card state unchanged.

---

# Goal Settings States

## Goal Settings Loading

Title:

```text
Loading Goal settings...
```

Description:

```text
WealthSmith is loading your saved plan inputs.
```

Rules:

- Do not show fake goal values.
- Do not use demo values unless Demo Mode is active.

---

## Goal Settings Empty

Title:

```text
No goal settings yet
```

Description:

```text
Add your goal, risk level, timeline, and contribution details to personalize WealthSmith.
```

Primary action:

```text
Set Goal
```

---

## Goal Settings Saving

Button label:

```text
Saving...
```

Rules:

- Keep form fields visible.
- Preserve draft input.
- Do not use Smith AI animation.

---

## Goal Settings Saved

Toast:

```text
Goal settings saved
```

Rules:

- Do not imply funds moved.
- Suggestions may refresh separately.

---

## Goal Settings Save Error

Title:

```text
We couldn’t save your goal settings
```

Description:

```text
Your changes are still here. Try again in a moment.
```

Primary action:

```text
Try Again
```

Rules:

- Keep draft values.
- Do not reset the form.
- Do not blame user.

---

# Contact Us States

## Contact Sending

Button label:

```text
Sending...
```

Rules:

- Disable duplicate submission.
- Keep modal open.
- Keep user input.
- Do not use Smith AI animation.

---

## Contact Success

Toast:

```text
Message sent
```

Rules:

- Close modal only after success if product flow supports it.
- Do not promise resolution time unless support policy provides it.

---

## Contact Error

Title:

```text
We couldn’t send your message
```

Description:

```text
Your message is still here. Try again in a moment.
```

Primary action:

```text
Try Again
```

Rules:

- Preserve user input.
- Do not ask user to send secrets.
- Keep safety warning visible.

---

## Contact Missing Email

Validation:

```text
Enter your email so we can reply.
```

## Contact Invalid Email

Validation:

```text
Enter a valid email address.
```

## Contact Missing Description

Validation:

```text
Describe what you need help with.
```

Security helper:

```text
Do not include seed phrases, private keys, or passwords.
```

---

# Support States

## Support Loading

Title:

```text
Loading support content...
```

Description:

```text
WealthSmith is loading help articles.
```

Rules:

- Do not use Smith AI animation.
- Keep Contact Us available if possible.

---

## Support Content Error

Title:

```text
We couldn’t load support content
```

Description:

```text
Try again in a moment or contact us.
```

Primary actions:

```text
Retry
Contact Us
```

Rules:

- Do not let Smith AI invent FAQ answers.
- Contact Us remains valid.

---

# Demo Mode States

## Demo Loading

Title:

```text
Loading Demo Mode...
```

Description:

```text
WealthSmith is preparing a sample portfolio.
```

Rules:

- Demo should usually load quickly.
- Do not show wallet loading.
- Do not imply real wallet data is loading.

---

## Demo Unavailable

Title:

```text
Demo Mode unavailable
```

Description:

```text
We couldn’t load the demo experience right now.
```

Primary actions:

```text
Try Again
Connect Wallet
```

Rules:

- Do not fall back to real wallet data.
- Do not show partial demo as real data.

---

## Demo Exit

Toast:

```text
Exited Demo Mode
```

Rules:

- Clear demo data.
- Do not imply real wallet was disconnected unless it was connected.

---

# Stale Data Copy

## Generic Stale

Title:

```text
Data may be outdated
```

Description:

```text
Refresh to update this section.
```

Primary action:

```text
Refresh
```

## Wallet Data Stale

Title:

```text
Wallet data may be outdated
```

Description:

```text
Refresh your portfolio before relying on these values.
```

Primary action:

```text
Refresh
```

## APY Stale

Title:

```text
APY may be outdated
```

Description:

```text
Review the current value on the protocol before taking action.
```

Rules:

- Do not present stale values as current.
- Do not show stale Top Pick as current.
- Stale APY must not be used to claim current yield.

---

# Partial Data Copy

## Generic Partial

Title:

```text
Some data is unavailable
```

Description:

```text
WealthSmith loaded part of this section, but some data could not be checked.
```

Primary action:

```text
Refresh
```

## Protocol Partial

Title:

```text
Some protocol data is unavailable
```

Description:

```text
Positions from one or more supported protocols could not be checked.
```

Primary action:

```text
Refresh
```

## Price Partial

Title:

```text
Some prices are unavailable
```

Description:

```text
Portfolio totals may be incomplete until prices refresh.
```

Primary action:

```text
Refresh
```

Rules:

- Keep available data visible.
- Mark affected fields clearly.
- Do not fill missing values with zero unless product logic confirms zero.

---

# Unavailable Copy

## Feature Unavailable

Title:

```text
Feature unavailable
```

Description:

```text
This feature is not available in WealthSmith right now.
```

## Action Unavailable

Title:

```text
Action unavailable
```

Description:

```text
WealthSmith can’t show this action right now.
```

## Unsupported Asset

Title:

```text
Unsupported asset
```

Description:

```text
WealthSmith cannot fully classify this asset yet.
```

## Unsupported Protocol

Title:

```text
Unsupported protocol
```

Description:

```text
WealthSmith does not support this protocol in MVP.
```

Rules:

- Be clear but not harsh.
- Do not imply future support unless roadmap/product content approves it.
- Do not hide unsupported states if they affect totals or suggestions.

---

# Retry Copy

Approved labels:

```text
Retry
Try Again
Refresh
```

Usage:

```text
Retry
  Use for failed loading/action.

Try Again
  Use for user action failure, form submission, wallet connection.

Refresh
  Use when data may be stale or partial.
```

Rules:

- Do not show retry if retry is not possible.
- Do not show multiple competing retry actions.
- Keep retry near failed section.

---

# Copy Map

Recommended content IDs:

```json
{
  "empty.wallet.title": "No wallet connected",
  "empty.wallet.description": "Connect your wallet or try Demo Mode to explore WealthSmith.",

  "empty.suggestions.title": "No suggestions yet",
  "empty.suggestions.description": "Complete your plan or connect a wallet to generate personalized suggestions.",

  "loading.suggestions.title": "Building your suggestions...",
  "loading.suggestions.description": "WealthSmith is reviewing your portfolio and plan.",

  "error.suggestions.title": "We couldn’t load suggestions",
  "error.suggestions.description": "Your dashboard is still available. Try again in a moment.",

  "stale.suggestions.title": "Suggestions may be outdated",
  "stale.suggestions.description": "Your plan or wallet data changed. Refresh suggestions before acting.",

  "error.portfolio.title": "We couldn’t load portfolio data",
  "error.portfolio.description": "Try again in a moment. Your funds stay in your wallet.",

  "error.contact.title": "We couldn’t send your message",
  "error.contact.description": "Your message is still here. Try again in a moment.",

  "wallet.connected.toast": "Wallet connected",
  "wallet.disconnected.toast": "Wallet disconnected",

  "demo.unavailable.title": "Demo Mode unavailable",
  "demo.unavailable.description": "We couldn’t load the demo experience right now."
}
```

Rules:

- Content IDs should be stable.
- Do not duplicate conflicting messages across components.
- Add new IDs when new reusable states appear.

---

# Forbidden Copy

Never use:

```text
Failed.
Critical failure.
Something went terribly wrong.
Your wallet is unsafe.
Funds moved.
Trade complete.
Transaction submitted.
Rebalance complete.
Executing strategy...
Moving assets...
Guaranteed APY.
Risk-free.
AI is investing.
Send your seed phrase.
Send your private key.
```

Use safer alternatives:

```text
We couldn’t load...
Try again in a moment.
Your funds stay in your wallet.
No action will be taken automatically.
Current APY could not be loaded.
```

---

# QA Checklist

Before shipping empty/error/loading copy, verify:

```text
Does the state match the real product state?
Does copy avoid fake data?
Does copy avoid execution claims?
Does copy avoid custody claims?
Does copy avoid guarantees?
Does copy avoid seed phrase/private key requests?
Does copy say what happened?
Does copy offer a next step when useful?
Does copy preserve user input on form errors?
Does copy distinguish demo from real data?
Does copy avoid using Smith AI animation generically?
Does stale copy avoid presenting data as current?
Does partial copy keep available data visible?
```

---

# Related Files

Rules:

```text
rules/loading-state-rules.md
rules/wallet-and-custody-rules.md
rules/demo-mode-rules.md
rules/smith-ai-rules.md
rules/financial-logic-boundaries.md
```

Content:

```text
content/voice-and-tone.md
content/ui-copy-rules.md
content/smith-ai-copy.md
content/wallet-copy.md
content/demo-mode-copy.md
content/suggestion-card-copy.md
```

Components:

```text
components/empty-state.md
components/loading-indicator.md
components/skeleton.md
components/alert.md
components/toast.md
components/modal.md
components/button.md
```

Patterns:

```text
patterns/empty-loading-error-states.md
patterns/dashboard-layout.md
patterns/portfolio-overview.md
patterns/suggestion-flow.md
patterns/wallet-connection.md
patterns/support-center.md
```

---

# Claude Code Rules

Claude Code should:

- Use approved empty/error/loading copy.
- Match copy to explicit product state.
- Keep loading delayed to avoid flicker.
- Use section-level copy where possible.
- Keep available data visible during partial states.
- Preserve user input on errors.
- Use retry/refresh labels consistently.
- Use Smith AI animation only for approved Smith AI/suggestion waits.
- Use demo-specific copy in Demo Mode.
- Use non-custodial reassurance for wallet data errors when useful.

Claude Code must not:

- Show fake data.
- Use generic scary errors.
- Use endless loading.
- Hide errors behind loading.
- Invent APY, balances, projections, or suggestions.
- Use Smith AI animation for generic loading.
- Use wallet connection copy for Demo Mode.
- Imply funds moved.
- Imply transactions executed.
- Ask for seed phrases or private keys.
- Treat stale data as current.
- Treat empty state as error or error as empty.

---

# Do

- Be calm.
- Be specific.
- Explain what is missing.
- Offer one next step.
- Preserve trust.
- Preserve user input.
- Keep available data visible.
- Mark stale data clearly.
- Use safe wallet language.
- Keep demo states clearly demo.

---

# Do Not

- Do not blame the user.
- Do not create panic.
- Do not show fake financial data.
- Do not imply execution.
- Do not imply custody.
- Do not imply guaranteed outcomes.
- Do not use Smith AI animation everywhere.
- Do not hide missing data.
- Do not invent support policy.
- Do not ask for secrets.

---

# Done Criteria

This content file is implemented correctly when:

- Empty, loading, refreshing, partial, stale, unavailable, disconnected, demo, and error states have approved copy.
- Dashboard, Portfolio, Suggestions, Smith AI, Wallet, Goal, Support, Contact Us, Demo Mode, APY, and protocol states are covered.
- Copy is calm, specific, and recoverable.
- Loading copy never implies execution.
- Error copy never implies funds are affected unless confirmed.
- Empty states explain what is missing and what to do next.
- Partial states keep available data visible.
- Stale states are clearly labeled.
- Demo states never imply real wallet data.
- Wallet states never ask for secrets.
- Claude Code can implement non-happy-path UI without inventing copy.

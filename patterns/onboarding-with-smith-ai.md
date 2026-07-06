# Onboarding with Smith AI

> **Implemented conversational flow:** the connected onboarding now plays the
> scripted Smith AI "financial planner" conversation from
> [`docs/onboarding-conversation-handoff.md`](../docs/onboarding-conversation-handoff.md)
> (items 1–22), composed in `app/src/state/onboardingScript.ts`. Smith introduces
> himself, acknowledges the wallet connection, asks one question at a time and
> echoes the user's real answers back, computes available cash (income − expenses),
> then ends with a guided tour: the Onboarding sidebar stays open in place while
> the main column swaps to the Portfolio view then the real Goal Settings content
> (Open Portfolio → Open Goal → Finish Setup), and the matching nav tab
> highlights. It stays deterministic and
> scripted: no live wallet read, no live AI, and it does not recalculate the
> Dashboard/Goal/Portfolio fixtures, move funds, sign, or collect secrets.
> Multi-year projection figures are fixed illustrative script. The **first time**
> onboarding opens in a session it shows a centered 64×64 Smith AI loading beat
> ("Smith AI getting ready") before the content — see
> [`components/smith-ai-initial-loading-state.md`](../components/smith-ai-initial-loading-state.md).

This pattern defines the WealthSmith onboarding experience where Smith AI guides the user through wallet connection, goal setup, risk profile, cash-flow inputs, contribution rhythm, and review.

During onboarding, Smith AI stays visible and active while the Dashboard and Portfolio update in response to the user’s answers.

Fast updates should feel instant.

Loading UI should appear only when the user would otherwise feel the app is stuck.

---

## Purpose

Onboarding should help the user quickly understand WealthSmith, connect or preview data, and create a usable financial plan.

The experience should feel:

- Guided
- Calm
- Personal
- Non-custodial
- Transparent
- Easy to undo or restart
- Directly connected to the visible dashboard

Smith AI is the onboarding guide.

The Dashboard and Portfolio are the live preview of the user’s plan.

---

## Core Experience

The onboarding layout has two main areas:

```text
Left side:
  Dashboard / Portfolio / Goal content

Right side:
  Smith AI onboarding panel
```

As the user answers onboarding questions, the left side updates progressively.

Examples:

```text
Wallet connected -> dashboard wallet status updates
Goal selected -> projected growth context updates
Risk selected -> allocation and projections adjust
Income entered -> savings potential can be estimated
Expenses entered -> safety buffer can be calculated
Contribution rhythm entered -> projections and plan cadence update
Portfolio opened -> allocation and deployment views appear
```

The user should immediately see how their answers affect the product.

---

## Key Product Rule

Smith AI guides onboarding, but it does not own deterministic financial logic.

```text
Suggestion Engine = deterministic Brain
Smith AI = explanatory Voice
UI = Renderer
```

Smith AI can ask questions, confirm answers, summarize, and explain.

Smith AI must not invent:

- Portfolio value
- Safety Buffer coverage
- Projected Growth
- Risk suitability
- Suggested allocation
- Top Pick
- Protocol selection
- APY
- Estimated earnings
- Contribution assumptions

These values must come from structured product logic.

---

## Onboarding Visibility Rule

Onboarding is not optional and is not hidden behind a temporary entry point.

Completion is defined by saved plan state:

```text
goal_completed = true only when all required Goal fields are saved:
  Financial Goal
  Risk Tolerance
  Time Horizon
  Monthly Income
  Monthly Expenses
  Contribution Frequency
Monthly Saving Goal is optional and does not affect goal_completed.
```

Visibility is derived, not set manually:

```text
onboarding_active = mode !== "demo" && (wallet.status === "disconnected" || goal_completed === false)
```

Rules:

- Onboarding is always visible in disconnected mode.
- Onboarding remains visible after wallet connection if goal setup is incomplete.
- Connecting a wallet alone does not complete onboarding.
- Completing the required Goal fields sets goal_completed = true.
- Onboarding is hidden only when the wallet is connected AND goal_completed is true.
- Demo Mode overrides onboarding while active: entering Demo Mode shows Demo Mode instead of onboarding.
- Exiting Demo Mode returns to the correct disconnected/onboarding state.
- Onboarding must not recalculate Dashboard suggestions, Top Pick, Safety Buffer, projected growth, allocation, or protocol decisions. Those come from product logic only.

Goal field option definitions are canonical from `patterns/goal-settings.md` (Approved Field Options). Onboarding goal fields must use the same field IDs and option labels as Goal Settings so onboarding feeds Goal Settings without mismatched IDs or labels.

---

## When to Use

Use this pattern when:

- A new user enters WealthSmith for the first time.
- A returning user has not completed onboarding.
- A user chooses Demo Mode.
- A user connects a wallet but still needs goal/risk/cash-flow setup.
- A user restarts onboarding.
- A user updates core plan assumptions through a guided flow.

Do not use this pattern for:

- Generic dashboard help
- Support chat
- Standalone portfolio refresh
- Suggestion generation after onboarding is complete
- Transaction execution
- Swap/buy/sell flows

---

## User Goals

The user should be able to:

- Understand what WealthSmith does.
- Connect a wallet or try Demo Mode.
- See that WealthSmith is non-custodial.
- Choose a financial goal.
- Set a time horizon.
- Select risk comfort.
- Provide monthly income.
- Provide monthly essential expenses.
- Set contribution rhythm.
- Set contribution amount.
- Review the plan summary.
- Continue to Portfolio or Goal.
- Finish onboarding.

---

## Product Logic Source

Onboarding collects structured inputs.

These inputs should be stored as profile/plan state.

Example structured state:

```json
{
  "wallet": {
    "status": "connected",
    "provider": "phantom",
    "address_short": "6fQ9",
    "mode": "real"
  },
  "plan": {
    "goal": "build_long_term_wealth",
    "time_horizon": "10_years",
    "risk_level": "medium",
    "monthly_income": 3000,
    "monthly_expenses": 2200,
    "contribution_rhythm": "monthly",
    "monthly_contribution": 400
  },
  "onboarding": {
    "status": "in_progress",
    "current_step": "contribution_amount",
    "completed_steps": [
      "wallet",
      "goal",
      "time_horizon",
      "risk_level",
      "monthly_income",
      "monthly_expenses",
      "contribution_rhythm"
    ]
  }
}
```

The UI renders this state.

The backend/product logic computes derived values such as:

```text
Total Portfolio Value
Net Contributions
Safety Buffer coverage
Projected Growth
Savings potential
Plan completeness
Suggestion readiness
```

---

## Components Used

Primary components:

```text
components/logo.md
components/button.md
components/card.md
components/progress-bar.md
components/select-card.md
components/chip.md
components/choice-chip.md
components/smith-ai-typing-indicator.md
components/input.md
components/toast.md
components/menu-popover.md
components/menu-item.md
components/loading-indicator.md
components/metric-card.md
components/portfolio-card.md
components/chart.md
components/alert.md
```

Note: the connected goal-setup onboarding is presented as a **chat with Smith AI**
(Gemini-style):

- Smith AI messages have **no chat bubble** — the Smith avatar sits on the left
  and the approved message text renders directly on the panel surface.
- Each Smith AI message is the **whole approved text for the step written as one
  continuous message** (question + its explanation together, not split into a
  separate title and description block) and is **typed out** (typewriter, not
  shown all at once), using a single type token and `color.text.primary`. The
  question and its explanation are separated by a **single line break with no
  blank line between them**, so the message reads as one flowing thought.
- The Smith avatar is the **`sparcle.svg` icon in `color.action.primary`** (no
  Smith logo and no looping animation are used in onboarding); the writing cue is
  the typewriter itself (`components/smith-ai-typing-indicator.md`).
- The **quick selections (Choice Chips) and the amount input sit at the bottom** of
  the panel, like a chat input area. There are **no Back/Continue buttons**.
  Conversational quick-reply chips are compact — max height **32px on desktop,
  40px on mobile** (see `components/choice-chip.md`).
- Selecting a chip or sending an amount appears as a **user message bubble** in the
  transcript, then Smith asks the next question. Amount fields use a WealthSmith
  input with a **Send** button (approved up-arrow icon, primary color); optional
  amounts may be sent empty (blank).
- An **Undo** control (top-right) removes the last user answer and steps back one
  question. It uses the same squared, subtle-neutral hover treatment as the Ask
  Smith AI close button, and shows an **"Undo" tooltip** on hover/focus.
- To the right of Undo, a **More** control (kebab / `more.svg` icon) opens a
  popover menu (mirrors the wallet pill menu — `components/menu-popover.md`) with
  a single **"Restart Onboarding"** action (`rotate-ccw.svg` icon). Restart clears
  all collected answers and returns to the first question (re-typed from the top);
  it does **not** disconnect the wallet or touch the Dashboard/savedGoal
  (onboarding only commits on Finish). The menu closes on outside click or Escape.
- The onboarding **progress bar transitions smoothly**.

This is a deterministic, scripted flow (no live AI, no API call, no invented
guidance). Choice Chips use the same canonical option IDs and approved labels as
Goal Settings; validation, Review/Finish, savedGoal, and goalCompleted behavior
are unchanged, and Goal Settings itself is not changed.

Navigation/layout components:

```text
components/page-header.md
components/sidebar.md
components/tabs.md
```

Related assets:

```text
assets/logo/wealthsmith-full-lockup.svg
assets/logo/wealthsmith-symbol.svg
assets/icons/wallet/phantom.svg
assets/icons/wallet/solflare.svg
assets/icons/wallet/backpack.svg
assets/animations/smith-ai-symbol-loop.json
```

---

## Layout Behavior

### Desktop and Wide

On desktop and wide layouts:

```text
Left: Dashboard / Portfolio / Goal content
Right: Smith AI onboarding panel
```

Rules:

- Smith AI panel remains visible.
- Smith AI panel uses card/container styling.
- Smith AI panel occupies the right column.
- Dashboard/Portfolio updates appear on the left.
- Main content should not be blocked by Smith AI.
- Both left and right areas should scroll safely if content exceeds viewport.
- The onboarding panel uses the same right-rail assistant panel sizing and
  anchoring behavior as the Ask Smith AI panel (see `components/sidebar.md` —
  Panel Sizing and Anchoring, and `patterns/dashboard-layout.md`). On desktop/
  wide it is sticky/fixed-like with a viewport-aware height
  (`100dvh − panelTopOffset − panelBottomOffset`), not plain content height;
  its bottom stays inside the viewport with the same bottom page padding, the
  header/progress stay pinned at the top, the primary action area stays near
  the bottom, and the onboarding body scrolls internally when content exceeds
  the available height. Mobile/tablet remains stacked/drawer-like.

### Tablet

On tablet:

- Smith AI can appear as a large right-side panel if space allows.
- If space is constrained, Smith AI may become an overlay/drawer.
- User should still see enough context to understand dashboard updates.

### Mobile

On mobile:

- Smith AI appears as an overlay or stacked guided panel.
- Dashboard updates may appear below or behind the active onboarding panel.
- Avoid forcing the user to switch between many screens.
- Keep primary actions reachable.
- Do not hide critical explanations behind hover-only interactions.

---

## Smith AI Panel Structure

The onboarding panel should contain:

```text
Header:
  Title: Onboarding
  Undo action
  More menu

Progress:
  Linear progress bar

Body:
  Smith symbol
  Smith message
  Question or confirmation
  Select options or input

Footer / Action area:
  Primary action or inline input when needed
```

Example:

```text
Onboarding
[progress bar]

[Smith symbol]

Hello, I’m Smith, your AI financial planner.

I’ll help you understand your portfolio, optimize your mix, and build a strategy for your goals.
Let’s start by connecting your wallet so I can load your actual data.
You stay in control — I only read balances, never move funds.

[Connect Wallet] [Try Demo Mode]
```

---

## Progress Bar Behavior

The progress bar communicates onboarding completion.

It should advance as required steps are completed.

Recommended MVP formula:

```text
progress = completed_required_steps / total_required_steps
```

Required MVP steps:

```text
1. Start / mode selection
2. Wallet connected or Demo Mode selected
3. Goal selected
4. Time horizon selected
5. Risk level selected
6. Monthly income entered
7. Monthly expenses entered
8. Contribution rhythm selected
9. Contribution amount entered
10. Review completed
```

Rules:

- Progress updates only after a step is successfully saved.
- Progress should not jump based on visual state alone.
- Progress should not advance for temporary loading states.
- Progress should not advance if validation fails.
- Undo should move progress back to the previous completed state if the step is reversed.
- Restart onboarding resets progress to the start.
- Demo Mode follows the same progress rules, but with demo data clearly labeled.

The progress bar should not imply investment execution.

---

## Live Dashboard Update Behavior

The left-side Dashboard should update as onboarding progresses.

### Before Wallet or Demo Mode

Dashboard may show empty or starter values:

```text
Total Portfolio Value: $0
Net Contributions: $0
Safety Buffer: empty/incomplete
Projected Growth: placeholder
```

Empty Safety Buffer message:

```text
Build your safety net first
Add your monthly expenses and risk tolerance to see your safety buffer target.
```

### After Wallet Connection

Dashboard updates with real wallet data when available.

Example:

```text
Total Portfolio Value: $2,000
Wallet status: Phantom • 6fQ9
```

Rules:

- Wallet connection does not imply custody.
- Do not show stale wallet values as confirmed real-time values.
- If wallet data is loading, show a loading state.
- If wallet data partially loads, show partial state.
- Do not hide onboarding while wallet data loads.

### After Income and Expenses

Safety Buffer can update when required inputs exist.

Example:

```text
Safety Buffer: 82%
2.8 / 3 months
```

Rules:

- Safety Buffer calculation must come from product logic.
- UI must not calculate unsupported values.
- Smith AI may explain the result after product logic returns it.
- Empty state should change to calculated state only when enough data exists.

### After Contribution Inputs

Projected Growth can update.

Rules:

- Projection assumptions must be explicit.
- Avoid guaranteed language.
- Use modeled/estimated language.
- Do not imply actual future returns.

Allowed:

```text
Projected Growth
Modeled using your strategy settings over your selected timeline
```

Avoid:

```text
Guaranteed growth
You will reach
Expected profit
```

---

## Live Portfolio Update Behavior

When the user opens the Portfolio during onboarding, the Smith AI panel remains open.

Portfolio can show:

```text
Balance Overview
Crypto Assets Allocation
Asset Deployment Overview
```

Smith AI can explain the portfolio structure:

```text
Here’s your full Portfolio Overview.
• Balance Overview — all wallets and holdings in one view
• Crypto Assets Allocation — how your crypto is balanced
• Assets Deployment Overview — where your funds are working right now
```

Rules:

- Portfolio values come from wallet/protocol/token data sources.
- Portfolio charts render structured data.
- Token symbols/names must be visible.
- Token icons must use approved assets or fallback token icon.
- Protocol and wallet icons are exact assets.
- Missing protocol/wallet icons are implementation issues.
- Smith AI should not invent holdings.

---

## Onboarding Step Sequence

This is the recommended MVP sequence.

### Step 1: Introduction

Purpose:

Introduce Smith AI and explain non-custodial behavior.

Primary actions:

```text
Connect Wallet
Try Demo Mode
```

Required copy:

```text
You stay in control — I only read balances, never move funds.
```

Rules:

- Connect Wallet is primary.
- Try Demo Mode is secondary.
- Do not imply signing or transaction execution.
- Do not imply WealthSmith can move funds.

---

### Step 2: Wallet Connected / Demo Mode Selected

Wallet connected copy:

```text
Perfect — wallet connected.
I’m scanning your holdings and preparing your financial snapshot...
```

After data loads:

```text
Done. I’ve updated your Financial Snapshot with your real wallet data.
You can already see your current allocation on the left.
Let’s personalize your plan around your goals and comfort with risk.
What’s your main goal right now?
```

Demo Mode copy:

```text
Demo Mode is ready.
I’ll use sample portfolio data so you can explore WealthSmith without connecting a wallet.
```

Rules:

- Show toast for successful wallet connection.
- Show wallet pill in global nav after connection.
- Wallet pill includes wallet logo, wallet name, and shortened address.
- Demo Mode must be clearly labeled if active.
- Wallet scanning/loading should not advance progress until complete enough to continue.

---

### Step 3: Goal

Question:

```text
What’s your main goal right now?
```

Options:

```text
Retire Early
Build Long-Term Wealth
Generate Passive Income
Save For Big Purchase
Not Sure Yet
```

Confirmation example:

```text
Great — focusing on Build Long-Term Wealth.
I’ll align your projections and recommendations around that outcome.
```

Rules:

- Store selected goal as structured plan state.
- Do not treat “Not Sure Yet” as invalid.
- “Not Sure Yet” should lead to conservative/default guidance, not a dead end.
- Dashboard projections should update when product logic returns updated assumptions.

---

### Step 4: Time Horizon

Question:

```text
What’s your time horizon for this goal? Just roughly is fine.
```

Options:

```text
6 Months
1 Year
2 Years
5 Years
10+ Years
Not Sure Yet
```

Confirmation example:

```text
Got it — aiming to Build Long-Term Wealth within 10+ years.
Let me adjust your projections and planning horizon accordingly.
```

Rules:

- Time horizon should affect projections only through product logic.
- Avoid over-precise forecasts.
- “Not Sure Yet” remains allowed.

---

### Step 5: Risk Level

Question:

```text
Everyone’s comfort with market swings is different. Which level best describes your risk appetite?
```

Options:

```text
Very Low
Low
Medium
High
Very High
```

Confirmation example:

```text
Understood — Medium risk level it is.
I’ll tune your recommended allocation and growth expectations to match your comfort level.
```

Rules:

- Risk level affects suitability and allocation logic.
- UI must not invent allocation changes.
- Smith AI may explain the meaning of the selected level.
- Avoid judgmental language.

---

### Step 6: Monthly Income

Question:

```text
To make your plan realistic, I just need a quick sense of your finances.
What’s your monthly income?
```

Input:

```text
Currency amount
```

Confirmation example:

```text
Got it — $3,000 monthly income.
I’ll use this to calculate your real saving potential, risk buffer, and liquidity safety net.
Updating your Financial Snapshot and projections...
```

Rules:

- Validate numeric input.
- Support currency formatting.
- Avoid requiring unnecessary precision.
- Do not shame the user.
- Do not block if user chooses to skip, if skipping is supported.

---

### Step 7: Monthly Expenses

Question:

```text
And roughly how much do you spend monthly on essentials — rent, food, bills, etc.?
```

Input:

```text
Currency amount
```

Confirmation example:

```text
Got it — you spend around $2,200 per month.
That leaves about $800 available for saving or investing monthly.
I’ll update your dashboard to reflect your real cash flow and safety buffer.
```

Rules:

- Expenses are used for Safety Buffer logic.
- Available savings must come from product logic.
- If income is lower than expenses, avoid alarmist copy.
- Safety Buffer updates only when enough inputs exist.

---

### Step 8: Cash Flow Summary

Smith AI may summarize:

```text
Perfect — your financial picture is clear now.
With ~$800 free each month, you can comfortably grow your portfolio while keeping a strong safety net.
```

Rules:

- Use “can” and “modeled” language.
- Do not guarantee outcomes.
- Do not imply all available cash should be invested.
- Safety Buffer priority must remain respected.

---

### Step 9: Contribution Rhythm

Question:

```text
Next, let’s set your contribution rhythm — how often you plan to add funds to your portfolio.
```

Options:

```text
Weekly
Biweekly
Monthly
Quarterly
Occasional
```

Confirmation example:

```text
Perfect — we’ll plan around monthly contributions.
Consistency compounds growth, so even small monthly steps will move you closer to your goal.
Updating your dashboard projections and plan cadence...
```

Rules:

- Contribution rhythm affects projections.
- Projection updates come from product logic.
- “Occasional” is valid and should not be penalized in copy.

---

### Step 10: Contribution Amount

Question:

```text
How much do you plan to contribute each month?
```

Input:

```text
Currency amount
```

Confirmation example:

```text
Great — I’ll model your plan using $400/month as a starting rhythm.
You’ll see your Projected Growth update after each real contribution.
And if your income or expenses change, I’ll adjust your target automatically.
```

Rules:

- Validate against profile/cash-flow logic.
- Do not force the maximum available amount.
- Do not imply automatic transfer or investing.
- If automatic adjustment is not implemented, do not say “I’ll adjust your target automatically.”
- Use product-supported language only.

---

### Step 11: Review Summary

Smith AI summarizes all captured inputs.

Example:

```text
All set — I’ve built your personalized plan based on everything you shared:
• Goal: Build long-term wealth
• Horizon: 10 years
• Risk: Medium
• Income: $3,000
• Expenses: $2,200
• Contribution: $400/month

You can review every detail and fine-tune it anytime.
```

Rules:

- Summary values must come from stored plan state.
- Do not add assumptions not provided by the user or product logic.
- Use readable labels.
- Allow editing or undoing previous steps.

---

### Step 12: Continue to Portfolio / Goal / Finish

Final onboarding options:

```text
Open Portfolio
Open Goal
Finish Onboarding
```

Example:

```text
Let’s take a closer look at your portfolio — to see how your assets are currently positioned.
```

Goal review example:

```text
Here’s your current Goal setup — everything you’ve shared so far:
• Goal: Build long-term wealth
• Timeline: 10 years
• Risk profile: Medium
• Monthly income: $3,000
• Expenses: $2,200
• Contribution rhythm: Monthly ($400)

You can edit any of these anytime — or just ask me, and I’ll help you update your goal.
You’re now ready to explore your AI Strategy Steps — actionable insights tailored to your goals, risk, and cash flow.
```

Rules:

- Finishing onboarding should mark onboarding as complete.
- Opening Portfolio should keep Smith AI onboarding panel visible until finished or dismissed.
- Opening Goal should show the current structured plan values.
- Goal page fields should reflect saved onboarding state.
- The active nav tab should update when the user opens Portfolio or Goal.
- Smith AI can continue guiding across tabs.
- Do not lose onboarding progress when switching tabs.
- After onboarding is complete, the main CTA may become `Ask Smith AI`.
- After onboarding is complete, Smith AI Strategy Insights may start loading suggestions if suggestion generation takes noticeable time.
- If suggestions are ready quickly, skip the loading state and show results directly.

---

## Undo Behavior

Undo allows the user to return to the previous step.

Rules:

- Undo should be visible in the Smith AI panel header.
- Undo reverts the latest onboarding answer when possible.
- Undo should update the progress bar.
- Undo should update dependent dashboard values if the reverted input affected them.
- Undo should not disconnect a wallet unless the last action specifically was wallet connection and the product supports undoing it.
- Undo should not delete data without clear confirmation if data loss is meaningful.

Undo examples:

```text
Goal selected -> undo returns to goal question.
Income entered -> undo returns to income input.
Expenses entered -> undo returns to expense input and may revert Safety Buffer calculation.
```

---

## More Menu Behavior

The More menu appears in the Smith AI panel header.

MVP menu item:

```text
Restart Onboarding
```

Rules:

- More button must have accessible label.
- Menu should use `components/menu-popover.md`.
- Restart Onboarding should require confirmation if it clears meaningful user inputs.
- Restart resets onboarding progress.
- Restart should not disconnect wallet unless explicitly stated and confirmed.

---

## Wallet Connection Behavior

Supported MVP wallets:

```text
Phantom
Solflare
Backpack
```

Wallet connected pill should show:

```text
[wallet icon] Phantom • 6fQ9
```

Rules:

- Wallet connection is read-only for onboarding.
- Wallet connection does not imply custody.
- Wallet connection does not imply funds can be moved.
- Do not request signing unless the product flow requires it.
- Ledger limitations must be handled without blocking read-only portfolio visibility when possible.
- If signature is required for a later action, clearly explain that it is separate from read-only connection.

---

## Demo Mode Behavior

Demo Mode lets users explore WealthSmith without a real wallet.

Rules:

- Demo Mode must be visible.
- Demo Mode uses sample portfolio and plan data.
- Demo values must not be mixed with real wallet data.
- Demo Mode can follow the same onboarding sequence.
- Smith AI copy must not imply demo data is real user data.

Allowed copy:

```text
I’ll use sample portfolio data so you can explore WealthSmith without connecting a wallet.
```

Avoid:

```text
I loaded your real portfolio.
```

---

## Loading States

Loading should be intentional.

Do not show loading UI for instant or near-instant updates.

Fast product updates should happen directly without a spinner, skeleton, or Smith AI animation.

### Loading Timing Rule

Recommended MVP timing:

```text
0–400ms:
  No loading state.
  Update directly.

400–800ms:
  Avoid full loading UI.
  Use subtle pending state only if needed.
  Examples: disable the selected option briefly, keep focus stable, or show inline saving feedback.

800ms+:
  Show explicit loading state if the user is waiting.

1.5s+:
  Show full explanatory loading state with copy.

Smith AI animation:
  Use only for meaningful Smith AI / suggestion-building waits.
```

Minimum visible time when loading is shown:

```text
500–700ms
```

Reason:

```text
Avoid flashing loading states.
Avoid making fast actions feel slower than they are.
```

### Onboarding Step Loading Rules

Do not show loading for normal fast onboarding steps:

```text
Selecting goal -> no loading
Selecting time horizon -> no loading
Selecting risk -> no loading
Selecting contribution rhythm -> no loading
Undoing a step -> no loading unless recalculation is slow
Opening More menu -> no loading
Opening Goal or Portfolio tab -> no loading if already loaded
```

Usually no loading for these unless recalculation is slow:

```text
Entering income
Entering expenses
Entering contribution amount
Updating Safety Buffer
Updating Projected Growth
Updating Goal setup fields
```

Use loading only when:

```text
Wallet scanning takes noticeable time
Portfolio data is being fetched
Projection calculation takes noticeable time
Suggestion generation takes noticeable time
Smith AI Strategy Insights are being prepared
```

### Smith AI Strategy Loading

Smith AI loading may use:

```text
assets/animations/smith-ai-symbol-loop.json
```

Only when the state belongs to:

```text
Building suggestions
Generating Smith AI Strategy Insights
Preparing recommendation explanations
```

Example:

```text
Building Your Suggestions...
We are checking your plan and wallet balance to find the best next actions.
No action will be taken automatically.
```

Rules:

- Delay before showing the loading card.
- Do not show the Smith AI loading card if suggestions are ready quickly.
- If shown, keep it visible long enough to avoid flicker.
- Skip loading entirely when results are ready before the delay threshold.
- Use the static symbol fallback when reduced motion is enabled.
- Keep the reassurance text visible when the full loading card is shown.

### Not Approved Loading Uses

Do not use Smith AI animation for:

```text
Generic loading
Wallet provider popup waiting
Wallet approval waiting
Table skeletons
Chart skeletons
Portfolio refresh
Saving a single field
Opening a menu
Switching tabs with already-loaded content
```

Use:

```text
components/skeleton.md
components/loading-indicator.md
components/progress-bar.md
components/toast.md
```

as appropriate.

### Loading State Ownership

The parent flow controls loading state.

The animation asset does not decide loading.

The component does not decide whether financial logic is still running.

The product/application state should provide:

```json
{
  "status": "loading",
  "operation": "generating_strategy_insights",
  "started_at": "timestamp",
  "show_loading_after_ms": 800,
  "minimum_visible_ms": 600
}
```

---

## Smith AI Strategy Insights After Onboarding

After onboarding is complete, the right-side area may change from `Onboarding` to `Smith AI Strategy Insights`.

This is the post-onboarding state where WealthSmith prepares and displays suggested next actions.

Example section title:

```text
Smith AI Strategy Insights
Personalized based on your plan.
```

If suggestion generation takes noticeable time, show:

```text
Building Your Suggestions...
We are checking your plan and wallet balance to find the best next actions.
No action will be taken automatically.
```

Rules:

- This state appears after onboarding completion.
- It should use the Smith AI animation only if generation takes meaningful time.
- If suggestions are ready quickly, skip the loading card.
- Dashboard should remain visible and usable.
- Safety Buffer and Projected Growth should show the latest computed state.
- Do not block the user from reviewing Dashboard or Goal while suggestions load.
- Do not imply suggestions will execute automatically.
- Do not imply suggestions are guaranteed.
- Do not invent suggestions in the UI.
- Suggestion Engine must provide the structured suggestion results.
- Smith AI may explain the resulting suggestions after they are available.

---

## Toast Behavior

Toast can confirm successful wallet connection.

Example:

```text
Wallet connected
```

Rules:

- Toast should be brief.
- Toast should not replace the Smith AI confirmation.
- Toast should not contain detailed financial data.
- Toast should be dismissible.
- Toast should not block the onboarding panel.

---

## Copy Rules

Onboarding copy should be:

- First-person from Smith when appropriate
- Calm
- Helpful
- Specific
- Non-hype
- Beginner-friendly
- Non-custodial
- Action-oriented

Use:

```text
I’ll help you understand your portfolio.
You stay in control.
I only read balances, never move funds.
Let’s personalize your plan.
Roughly is fine.
You can review every detail anytime.
```

Avoid:

```text
I’ll maximize your returns.
I’ll invest for you.
Your funds are safe.
This is the best strategy.
Guaranteed growth.
AI is optimizing your profits.
```

---

## Financial Language Rules

Do not imply certainty.

Use:

```text
could reach
modeled using
estimated
based on your current plan
suggested next action
```

Avoid:

```text
will reach
guaranteed
risk-free
best investment
maximum returns
```

Do not imply WealthSmith takes action automatically.

Use:

```text
No action will be taken automatically.
```

Avoid:

```text
We’ll invest your money.
I’ll move your funds.
I’ll execute this strategy.
```

---

## Accessibility

Rules:

- Smith AI panel must have clear heading: `Onboarding`.
- Progress bar must expose accessible progress value.
- Button groups must be keyboard accessible.
- Selected options must be clear visually and programmatically.
- Input fields must have labels.
- Currency inputs must be announced clearly.
- Loading states must use accessible text.
- Toasts should be announced politely.
- More menu must be keyboard accessible.
- Undo must have clear label.
- Do not rely on color alone.
- Respect reduced motion.

Progress bar accessibility example:

```text
role="progressbar"
aria-valuemin="0"
aria-valuemax="10"
aria-valuenow="4"
aria-label="Onboarding progress"
```

Smith message region:

```text
role="status"
aria-live="polite"
```

---

## Responsive Requirements

### Desktop

- Two-column layout.
- Smith AI panel remains on the right.
- Dashboard/Portfolio updates on the left.
- Header remains visible.

### Tablet

- Smith AI may remain side-by-side or become a drawer.
- Keep primary action visible.
- Avoid cramped button rows.

### Mobile

- Smith AI should become an overlay or stacked panel.
- Use full-width inputs and buttons.
- Keep progress visible.
- Keep undo and more accessible.
- Avoid horizontal scrolling.
- Dashboard updates can be shown after the active step or behind the overlay.

---

## State Requirements

Supported states:

```text
not_started
wallet_prompt
demo_mode_prompt
wallet_connecting
wallet_connected
wallet_data_loading
wallet_data_loaded
goal_question
goal_selected
time_horizon_question
time_horizon_selected
risk_question
risk_selected
income_question
income_saved
expenses_question
expenses_saved
cash_flow_summary
contribution_rhythm_question
contribution_rhythm_selected
contribution_amount_question
contribution_amount_saved
review_summary
portfolio_guidance
goal_guidance
complete
error
partial_data
restart_confirm
```

Every state should have:

```text
state id
visible message
available actions
progress value
dashboard update behavior
accessibility behavior
```

---

## Data Requirements

Onboarding requires these inputs:

```text
wallet mode: real wallet or demo
goal
time horizon
risk level
monthly income
monthly expenses
contribution rhythm
contribution amount
```

Optional depending on product scope:

```text
monthly saving goal
existing contribution history
additional wallet addresses
preferred stablecoin reserve target
```

Do not ask for more data than needed for MVP.

---

## Validation Rules

Currency inputs:

- Must accept numbers.
- Should format as currency.
- Should handle commas.
- Should handle empty input.
- Should prevent negative values unless product explicitly supports debt/cash-flow modeling.
- Should avoid harsh errors.

Good error copy:

```text
Enter a monthly amount so I can calculate your safety buffer.
```

Avoid:

```text
Invalid input.
You entered the wrong value.
```

---

## Error States

Common errors:

```text
Wallet connection failed
Wallet data unavailable
Portfolio data partially loaded
Input validation failed
Projection update failed
Onboarding save failed
```

Rules:

- Explain what happened.
- Say what the user can do next.
- Do not blame the user.
- Do not imply funds are at risk unless confirmed.
- Preserve already completed onboarding steps.
- Allow retry.

Example:

```text
I couldn’t load your wallet balances yet.
You can retry, switch wallets, or continue in Demo Mode.
```

---

## Claude Code Rules

Claude Code should:

- Keep Smith AI panel visible during onboarding.
- Use structured onboarding state.
- Advance progress only after saved steps.
- Update dashboard/portfolio from product state, not component-local guesses.
- Use approved components.
- Use approved assets.
- Use wallet icons from `assets/icons/wallet/`.
- Use WealthSmith symbol from `assets/logo/wealthsmith-symbol.svg`.
- Use Smith AI animation only for approved Smith AI loading states.
- Support Undo and Restart Onboarding.
- Support Demo Mode.
- Respect reduced motion.
- Delay loading UI so fast updates do not show loading.
- Skip Smith AI loading when suggestion results are ready quickly.
- Preserve accessibility.

Claude Code must not:

- Generate onboarding calculations inside UI components.
- Invent portfolio values.
- Invent Safety Buffer coverage.
- Invent projected growth.
- Invent allocation logic.
- Invent APY.
- Invent recommendations.
- Use Smith AI as the source of deterministic financial logic.
- Hide progress.
- Use generic spinners for Smith AI strategy states.
- Use Smith AI animation for wallet connection.
- Show loading UI for instant onboarding selections.
- Flash loading states for fast updates.
- Mix demo and real wallet data.
- Imply funds can be moved automatically.
- Imply signing unless signing is actually required.

---

## Do

- Keep Smith AI open and visible during onboarding.
- Show a clear progress bar.
- Advance progress according to completed steps.
- Update Dashboard and Portfolio as inputs become available.
- Show wallet connected state in global nav.
- Use calm Smith AI copy.
- Let users undo or restart.
- Let users finish onboarding or open Portfolio/Goal.
- Use clear non-custodial language.
- Store onboarding answers as structured data.
- Render deterministic product results.

---

## Do Not

- Do not make onboarding feel like a generic chat.
- Do not hide the dashboard preview.
- Do not use progress as decoration only.
- Do not advance progress without saved data.
- Do not imply automatic investing.
- Do not imply guaranteed returns.
- Do not imply WealthSmith holds user funds.
- Do not make Smith AI invent financial numbers.
- Do not use wallet icon alone as identity.
- Do not use demo data as real data.
- Do not remove user inputs on tab change.
- Do not make restart destructive without confirmation.

---

## Done Criteria

This pattern is implemented correctly when:

- Smith AI remains open throughout onboarding.
- The onboarding panel appears on the right on desktop.
- The progress bar advances by completed steps.
- Undo works for previous steps.
- Restart Onboarding is available from the More menu.
- Wallet connection updates nav and dashboard.
- Dashboard updates as profile inputs are saved.
- Portfolio can be opened during onboarding without losing progress.
- Safety Buffer updates only when required inputs exist.
- Projected Growth updates only from product logic.
- Loading UI is skipped for fast updates.
- Smith AI loading appears only for meaningful waits.
- Demo Mode is clearly labeled when active.
- All core inputs are stored as structured state.
- Smith AI copy remains calm and non-custodial.
- Reduced motion is respected.
- Accessibility behavior is implemented.

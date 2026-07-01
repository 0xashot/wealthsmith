# Onboarding Copy

This file defines approved WealthSmith copy for onboarding.

Onboarding collects the user’s plan inputs and prepares the product to personalize Dashboard, Portfolio, Suggestions, Top Pick, and Smith AI explanations.

Onboarding copy should feel guided, calm, and lightweight.

It should not feel like a financial exam.

---

## Purpose

Onboarding copy should help users understand:

```text
What information WealthSmith needs
Why each question matters
What happens after each answer
What can be changed later
How wallet connection fits into the flow
How Demo Mode differs from real onboarding
How Smith AI helps during onboarding
What happens after onboarding is complete
```

Onboarding copy must be:

```text
Clear
Beginner-friendly
Low-pressure
Structured
Non-hype
Non-custodial
Explainable
```

---

## Core Hard Rules

Hard Rule:

```text
Onboarding copy must collect structured plan inputs.
It must not create recommendations directly.
```

Hard Rule:

```text
Smith AI may guide onboarding, but it must not invent answers or silently save values.
```

Hard Rule:

```text
Wallet connection copy must not imply custody, execution, or fund movement.
```

Hard Rule:

```text
Demo Mode onboarding copy must clearly say demo data is sample data.
```

Hard Rule:

```text
Users should know they can update goal settings later.
```

---

## Onboarding Voice

Onboarding should sound:

```text
Guided
Simple
Helpful
Encouraging
Low-pressure
Plain-language
```

Onboarding should not sound:

```text
Judgmental
Urgent
Overly technical
Overconfident
Like financial advice
Like a trading quiz
```

Use:

```text
You can update this later.
This helps WealthSmith personalize your plan.
Choose the closest option.
No action will be taken automatically.
```

Avoid:

```text
Choose carefully or your strategy may fail.
You must answer perfectly.
This will invest your money.
AI will decide your strategy.
```

---

## Onboarding Structure

Recommended MVP onboarding flow:

```text
1. Welcome / Entry
2. Wallet connection or Demo Mode
3. Financial Goal
4. Time Horizon
5. Risk Tolerance
6. Monthly Income
7. Monthly Expenses
8. Contribution Frequency
9. Monthly Saving Goal
10. Review
11. Finish / Dashboard transition
```

Rules:

- Ask one major question at a time.
- Keep helper copy short.
- Make it clear values can be updated later.
- Save structured answers.
- Do not generate recommendations from draft values until product logic confirms save.
- During active onboarding, Smith AI stays open as the companion panel.

---

## Global Onboarding Labels

Approved labels:

```text
Get Started
Continue
Back
Skip for now
Save and Continue
Review Plan
Finish Setup
Undo
Restart Onboarding
Connect Wallet
Try Demo Mode
Ask Smith AI
```

Rules:

- Use `Continue` for moving to the next step.
- Use `Back` for previous step.
- Use `Save and Continue` when the answer is committed.
- Use `Skip for now` only for optional steps.
- Use `Restart Onboarding` only when it clears onboarding answers.
- Do not use `Invest Now`, `Start Trading`, or `Let AI Decide`.

---

## Welcome Step

Title:

```text
Build your WealthSmith plan
```

Description:

```text
Answer a few questions so WealthSmith can personalize your dashboard and suggestions.
```

Helper:

```text
You can update these settings later.
```

Primary action:

```text
Get Started
```

Secondary action:

```text
Try Demo Mode
```

Optional wallet action:

```text
Connect Wallet
```

Smith AI companion message:

```text
I’ll help you set up your plan step by step. WealthSmith uses these answers to personalize your dashboard and suggestions.
```

Rules:

- Do not imply onboarding creates trades.
- Do not imply answers must be perfect.
- Keep it short.
- Provide Demo Mode as a low-friction path if available.

---

## Wallet Entry Step

Title:

```text
Connect your wallet or try Demo Mode
```

Description:

```text
Connect your wallet to personalize WealthSmith with your real portfolio, or try Demo Mode with sample data.
```

Wallet CTA:

```text
Connect Wallet
```

Demo CTA:

```text
Try Demo Mode
```

Wallet helper:

```text
WealthSmith reads balances and positions only. Your funds stay in your wallet.
```

Demo helper:

```text
Demo Mode uses sample data and does not connect your wallet.
```

Security note:

```text
Never share your seed phrase or private key.
```

Smith AI companion message:

```text
You can connect a wallet for real portfolio data or use Demo Mode to preview how WealthSmith works with sample data.
```

Rules:

- Wallet connection must be clearly non-custodial.
- Demo Mode must be clearly sample data.
- Do not ask for seed phrase/private key.
- Do not imply wallet connection executes a transaction.
- Do not require wallet connection if Demo Mode or manual onboarding path is allowed.

---

## Wallet Connected State

Toast:

```text
Wallet connected
```

Helper:

```text
WealthSmith is loading supported balances and positions.
```

Smith AI companion message:

```text
Your wallet is connected. WealthSmith can now load supported balances and positions for your dashboard.
```

Rules:

- Wallet connected does not mean portfolio data is fully loaded.
- Portfolio loading should be separate.
- Do not imply funds moved.

---

## Demo Mode Started State

Banner:

```text
You’re in demo mode.
```

Helper:

```text
This onboarding uses sample data. Connect your wallet later to personalize WealthSmith with your real portfolio.
```

Smith AI companion message:

```text
You’re in Demo Mode. I’ll explain the sample setup as we go, and none of this uses your real wallet.
```

Rules:

- Use demo-aware phrasing.
- Do not call demo values real.
- Do not persist demo answers into real mode unless explicitly confirmed by product flow.

---

## Financial Goal Step

Title:

```text
What is your financial goal?
```

Description:

```text
Choose the goal that best matches what you want WealthSmith to help you plan for.
```

Helper:

```text
You can update this later.
```

Approved answer options:

```text
Build Long-Term Wealth
Preserve Capital
Generate Yield
Grow Aggressively
```

Recommended MVP default/demo value:

```text
Build Long-Term Wealth
```

Smith AI companion message:

```text
Your goal helps WealthSmith frame suggestions around what you care about most, like long-term growth, stability, or yield.
```

Rules:

- Do not say goal guarantees an outcome.
- Do not recommend one goal unless product logic/user context provides it.
- Use user-friendly names.
- Store selected goal as structured value.

---

## Time Horizon Step

Title:

```text
What is your time horizon?
```

Description:

```text
How long do you expect this plan to run?
```

Helper:

```text
This helps WealthSmith model Projected Growth and prioritize suggestions.
```

Approved answer options:

```text
Less than 1 year
1–3 years
3–5 years
5+ years
```

Recommended MVP default/demo value:

```text
5+ years
```

Alternative if exact value is used:

```text
5 years
```

Smith AI companion message:

```text
Time horizon helps WealthSmith understand whether your plan is short-term or long-term. Longer timelines can usually tolerate different tradeoffs than short timelines.
```

Rules:

- Do not imply long horizon removes risk.
- Do not create investment advice from horizon alone.
- Store as structured value.
- Use consistent values with Goal settings.

---

## Risk Tolerance Step

Title:

```text
What risk level feels right for this plan?
```

Description:

```text
Choose how much volatility you are comfortable with.
```

Helper:

```text
Risk tolerance helps WealthSmith compare your current portfolio with your target allocation.
```

Approved answer options:

```text
Low
Medium
High
```

Recommended MVP default/demo value:

```text
Medium
```

Option helper copy:

```text
Low
Prioritizes stability and lower volatility.

Medium
Balances growth potential with risk control.

High
Accepts more volatility for higher growth potential.
```

Smith AI companion message:

```text
Risk tolerance helps WealthSmith understand how much volatility may fit your plan. You can adjust this later if your comfort level changes.
```

Rules:

- Do not say any risk level is safe.
- Do not shame conservative or aggressive choices.
- Do not recommend a risk level unless product/user data supports it.
- Store as structured value.

---

## Monthly Income Step

Title:

```text
What is your average monthly income?
```

Description:

```text
Enter your approximate monthly income.
```

Helper:

```text
This helps WealthSmith understand your plan inputs. You can update it later.
```

Field label:

```text
Monthly Income
```

Placeholder:

```text
4,000
```

Validation: missing

```text
Enter your monthly income.
```

Validation: invalid

```text
Enter a valid monthly income amount.
```

Smith AI companion message:

```text
Income helps WealthSmith understand your planning context. Use your best estimate; you can update it later.
```

Rules:

- Do not judge income level.
- Do not imply all income should be invested.
- Use approximate/best estimate language.
- Store numeric amount as structured value.

---

## Monthly Expenses Step

Title:

```text
What are your average monthly expenses?
```

Description:

```text
Enter your approximate monthly expenses.
```

Helper:

```text
This helps WealthSmith calculate your Safety Buffer target.
```

Field label:

```text
Monthly Expenses
```

Placeholder:

```text
1,000
```

Validation: missing

```text
Enter your monthly expenses.
```

Validation: invalid

```text
Enter a valid monthly expenses amount.
```

Smith AI companion message:

```text
Expenses help WealthSmith estimate your Safety Buffer target. Use an average monthly amount that feels realistic.
```

Rules:

- Do not shame spending.
- Do not imply lower expenses are always better.
- Do not calculate Safety Buffer in copy.
- Store numeric amount as structured value.

---

## Contribution Frequency Step

Title:

```text
How often do you plan to contribute?
```

Description:

```text
Choose how often you expect to add funds to this plan.
```

Helper:

```text
This helps WealthSmith model contributions over time.
```

Approved answer options:

```text
Weekly
Monthly
Quarterly
Irregular
Not sure yet
```

Recommended MVP default/demo value:

```text
Monthly
```

Smith AI companion message:

```text
Contribution frequency helps WealthSmith model your plan. Choose the closest option; it does not create automatic deposits.
```

Rules:

- Do not imply contributions are automatic.
- Do not imply WealthSmith will pull funds.
- Let user choose “Irregular” or “Not sure yet” if product supports it.
- Store as structured value.

---

## Monthly Saving Goal Step

Title:

```text
What is your monthly saving goal?
```

Description:

```text
Enter the amount you hope to set aside each month.
```

Helper:

```text
This is optional and helps WealthSmith model your contribution plan.
```

Field label:

```text
Monthly Saving Goal
```

Optional label:

```text
Optional
```

Placeholder:

```text
1,000
```

Skip action:

```text
Skip for now
```

Validation: invalid

```text
Monthly saving goal must be a positive amount if entered.
```

Recommended MVP default/demo value:

```text
1,000
```

Smith AI companion message:

```text
Monthly Saving Goal is optional. It helps WealthSmith model contributions, but it does not mean WealthSmith will move or invest funds automatically.
```

Rules:

- Make optional status clear.
- Do not pressure user to save more.
- Do not imply all available cash should be deployed.
- Do not imply automatic investment.
- Store as structured value if provided.

---

## Review Step

Title:

```text
Review your plan
```

Description:

```text
Check your answers before WealthSmith prepares your dashboard.
```

Helper:

```text
You can edit these settings later from Goal.
```

Approved summary labels:

```text
Financial Goal
Risk Tolerance
Time Horizon
Monthly Income
Monthly Expenses
Contribution Frequency
Monthly Saving Goal
Wallet
```

Primary action:

```text
Finish Setup
```

Secondary action:

```text
Back
```

Optional action:

```text
Restart Onboarding
```

Smith AI companion message:

```text
Review your plan inputs before finishing setup. WealthSmith will use saved values to prepare your dashboard and suggestions.
```

Rules:

- Show saved/selected values clearly.
- Do not show unresolved variables.
- Do not show demo values as real values.
- Do not generate final suggestions until setup finishes/product logic runs.
- Do not imply finishing setup executes any financial action.

---

## Finish / Transition Step

Loading title:

```text
Preparing your dashboard...
```

Loading description:

```text
WealthSmith is reviewing your plan and portfolio context.
```

Suggestion-specific loading:

```text
Building your suggestions...
```

Strategy insight loading:

```text
Preparing strategy insights...
```

Success title:

```text
Your WealthSmith dashboard is ready
```

Success description:

```text
Review your portfolio, Safety Buffer, and suggested next actions.
```

Primary action:

```text
Go to Dashboard
```

Smith AI companion message:

```text
Your setup is complete. WealthSmith will now use your saved plan and available portfolio data to prepare your dashboard.
```

Rules:

- Use Smith AI animation only for meaningful suggestion/insight waits.
- Do not show loading for fast transitions.
- Do not imply funds are moving.
- Do not imply transactions are being prepared.
- Do not say recommendations are guaranteed.

---

## Undo Copy

Action:

```text
Undo
```

Toast:

```text
Last answer undone
```

Smith AI companion message:

```text
I undid the last answer. You can choose again.
```

Rules:

- Undo should restore prior onboarding state.
- Do not undo wallet connection unless product specifically supports it.
- Do not use undo to imply financial transaction rollback.

---

## Restart Onboarding Copy

Action:

```text
Restart Onboarding
```

Confirmation title:

```text
Restart onboarding?
```

Confirmation description:

```text
This will clear your onboarding answers and start again.
```

Confirm action:

```text
Restart Onboarding
```

Cancel action:

```text
Cancel
```

Toast:

```text
Onboarding restarted
```

Smith AI companion message:

```text
Onboarding has restarted. We’ll go step by step again.
```

Rules:

- Say exactly what will be cleared.
- Do not imply wallet funds or real wallet data are deleted.
- Do not clear real saved settings unless product action explicitly does so.
- In Demo Mode, clarify if only demo answers are cleared.

---

## Skip Copy

Approved skip action:

```text
Skip for now
```

Approved helper:

```text
You can add this later.
```

Rules:

- Use skip only for optional steps.
- Do not allow skip for required fields unless product supports partial setup.
- If skipped data affects suggestions, later empty/missing state should explain what is needed.

---

## Save Copy

Button:

```text
Save and Continue
```

Pending:

```text
Saving...
```

Success toast:

```text
Saved
```

Error title:

```text
We couldn’t save this answer
```

Error description:

```text
Your answer is still here. Try again in a moment.
```

Rules:

- Preserve user input on save error.
- Do not use Smith AI animation for simple saves.
- Do not imply wallet/funds are affected.

---

## Onboarding Error Copy

Generic error title:

```text
We couldn’t load onboarding
```

Generic error description:

```text
Try again in a moment.
```

Missing context title:

```text
This step is unavailable
```

Missing context description:

```text
We need the previous step before continuing.
```

Wallet data error during onboarding:

```text
We couldn’t load wallet positions yet.
You can continue setup and refresh portfolio data later.
```

Rules:

- Keep onboarding recoverable.
- Do not block all onboarding for non-critical wallet data if product supports continuing.
- Do not show fake portfolio data.
- Do not imply funds are affected.

---

## Smith AI Onboarding Companion Copy

### Initial Companion Message

```text
I’ll guide you through setup. WealthSmith uses these answers to personalize your dashboard and suggestions.
```

### Step Helper

```text
This answer becomes part of your plan settings. You can update it later.
```

### Explain Why Asked

```text
WealthSmith uses this to understand your planning context.
```

### Missing Answer

```text
Choose an option or enter a value to continue.
```

### Onboarding Complete

```text
Setup is complete. WealthSmith can now prepare your dashboard from your saved plan context.
```

Rules:

- Smith AI should ask one question at a time.
- Smith AI should not invent answers.
- Smith AI should not save values without user action.
- Smith AI should not generate recommendations directly from onboarding chat.
- Smith AI should explain, not decide.

---

## Demo Mode Onboarding Copy

Entry helper:

```text
Try Demo Mode to explore onboarding with sample data.
```

Demo companion intro:

```text
You’re in Demo Mode. These answers apply to the sample experience only.
```

Demo review helper:

```text
These demo settings apply to the sample portfolio only.
```

Demo finish helper:

```text
WealthSmith will prepare a demo dashboard using sample data.
```

Demo exit helper:

```text
Exit Demo clears the sample portfolio and sample suggestions.
```

Rules:

- Always label demo as demo/sample.
- Do not save demo answers as real user settings unless explicitly confirmed.
- Do not call demo answers real plan settings.
- Do not mix demo and wallet mode.

---

## Wallet Copy During Onboarding

Connect helper:

```text
Connect your wallet so WealthSmith can read balances and positions.
Your funds stay in your wallet.
```

Read-only helper:

```text
WealthSmith reads supported wallet data. It cannot move funds from a read-only connection.
```

Security warning:

```text
Never share your seed phrase or private key.
```

Signature helper, if needed:

```text
Sign this message to confirm wallet ownership.
This is not a transaction and will not move funds.
```

Rules:

- Use wallet-copy.md as source of truth.
- Do not ask for secrets.
- Do not imply onboarding creates transactions.
- Do not imply onboarding requires a transaction signature.

---

## Field Validation Copy

### Required Select Option

```text
Choose an option to continue.
```

### Required Currency Amount

```text
Enter an amount to continue.
```

### Invalid Currency Amount

```text
Enter a valid amount.
```

### Negative Amount

```text
Enter a positive amount.
```

### Expenses Greater Than Income

Soft warning, not blocking by default unless product rules say so:

```text
Expenses are higher than income. You can continue, but WealthSmith may prioritize Safety Buffer and planning suggestions.
```

Rules:

- Do not shame values.
- Do not block unusual values unless product rules require it.
- Do not make financial judgments.
- Use warning copy for context, not blame.

---

## Approved Answer Option Copy

### Financial Goal

```text
Build Long-Term Wealth
Preserve Capital
Generate Yield
Grow Aggressively
```

### Risk Tolerance

```text
Low
Medium
High
```

### Time Horizon

```text
Less than 1 year
1–3 years
3–5 years
5+ years
```

### Contribution Frequency

```text
Weekly
Monthly
Quarterly
Irregular
Not sure yet
```

Rules:

- Keep option labels short.
- Use helper text for explanation.
- Store machine-readable values separately.
- Do not encode product logic in labels.

---

## Recommended MVP Demo Inputs

Use these for Demo Mode and QA examples:

```json
{
  "financial_goal": "Build Long-Term Wealth",
  "risk_tolerance": "Medium",
  "time_horizon": "5 years",
  "monthly_income": "$4,000",
  "monthly_expenses": "$1,000",
  "contribution_frequency": "Monthly",
  "monthly_saving_goal": "$1,000"
}
```

Rules:

- Demo inputs must be marked as sample/demo.
- Do not use demo inputs as real user defaults after wallet connection.
- Do not persist demo inputs into real wallet mode unless product explicitly asks user to confirm.

---

## Approved Copy Map

Recommended content IDs:

```json
{
  "onboarding.welcome.title": "Build your WealthSmith plan",
  "onboarding.welcome.description": "Answer a few questions so WealthSmith can personalize your dashboard and suggestions.",
  "onboarding.welcome.helper": "You can update these settings later.",
  "onboarding.get_started.cta": "Get Started",

  "onboarding.wallet.title": "Connect your wallet or try Demo Mode",
  "onboarding.wallet.description": "Connect your wallet to personalize WealthSmith with your real portfolio, or try Demo Mode with sample data.",
  "onboarding.wallet.helper": "WealthSmith reads balances and positions only. Your funds stay in your wallet.",
  "onboarding.demo.helper": "Demo Mode uses sample data and does not connect your wallet.",

  "onboarding.goal.title": "What is your financial goal?",
  "onboarding.goal.description": "Choose the goal that best matches what you want WealthSmith to help you plan for.",

  "onboarding.time_horizon.title": "What is your time horizon?",
  "onboarding.time_horizon.description": "How long do you expect this plan to run?",

  "onboarding.risk.title": "What risk level feels right for this plan?",
  "onboarding.risk.description": "Choose how much volatility you are comfortable with.",

  "onboarding.income.title": "What is your average monthly income?",
  "onboarding.income.label": "Monthly Income",

  "onboarding.expenses.title": "What are your average monthly expenses?",
  "onboarding.expenses.label": "Monthly Expenses",

  "onboarding.contribution_frequency.title": "How often do you plan to contribute?",

  "onboarding.monthly_saving_goal.title": "What is your monthly saving goal?",
  "onboarding.monthly_saving_goal.helper": "This is optional and helps WealthSmith model your contribution plan.",

  "onboarding.review.title": "Review your plan",
  "onboarding.review.description": "Check your answers before WealthSmith prepares your dashboard.",

  "onboarding.finish.cta": "Finish Setup",
  "onboarding.finish.loading": "Preparing your dashboard...",
  "onboarding.finish.success.title": "Your WealthSmith dashboard is ready",
  "onboarding.finish.success.cta": "Go to Dashboard",

  "onboarding.undo.cta": "Undo",
  "onboarding.restart.cta": "Restart Onboarding",
  "onboarding.skip.cta": "Skip for now"
}
```

Rules:

- Use stable IDs.
- Keep implementation labels in sync with this file.
- Do not duplicate conflicting onboarding copy in components.

---

## Forbidden Onboarding Copy

Never use:

```text
AI will decide your strategy.
We will invest for you.
We will rebalance your wallet.
Authorize WealthSmith to manage funds.
Start trading.
Start earning now.
Guaranteed plan.
Risk-free strategy.
Choose carefully or your plan will fail.
Send your seed phrase.
Send your private key.
```

Use safer alternatives:

```text
WealthSmith uses these answers to personalize your dashboard and suggestions.
You can update this later.
No action will be taken automatically.
Your funds stay in your wallet.
Never share your seed phrase or private key.
```

---

## QA Checklist

Before shipping onboarding copy, verify:

```text
Does each step ask one clear question?
Does each step explain why the answer matters?
Does copy say users can update settings later?
Does wallet copy say funds stay in wallet?
Does copy avoid seed phrase/private key requests?
Does copy avoid execution/custody claims?
Does Demo Mode copy clearly say sample data?
Does Smith AI companion explain without deciding?
Does review step show all required inputs?
Does finish step avoid implying transactions?
Does validation copy avoid shame/blame?
Does restart copy say what is cleared?
```

---

## Related Files

Rules:

```text
rules/smith-ai-rules.md
rules/demo-mode-rules.md
rules/wallet-and-custody-rules.md
rules/loading-state-rules.md
rules/financial-logic-boundaries.md
```

Content:

```text
content/voice-and-tone.md
content/ui-copy-rules.md
content/wallet-copy.md
content/demo-mode-copy.md
content/smith-ai-copy.md
content/empty-error-loading-copy.md
content/glossary.md
```

Patterns:

```text
patterns/onboarding-with-smith-ai.md
patterns/dashboard-layout.md
patterns/goal-settings.md
patterns/wallet-connection.md
```

Components:

```text
components/global-nav.md
components/progress-bar.md
components/select-card.md
components/input.md
components/button.md
components/modal.md
components/toast.md
```

---

## Claude Code Rules

Claude Code should:

- Use approved onboarding step titles and helper copy.
- Ask one major question per step.
- Use approved answer option labels.
- Store structured values separately from labels.
- Keep Smith AI open during active onboarding.
- Hide Ask Smith AI global action during active onboarding if required by pattern.
- Use wallet safety copy for wallet connection.
- Use demo-aware copy in Demo Mode.
- Preserve draft input on validation/save errors.
- Use finish/loading copy only when product logic is preparing dashboard/suggestions.
- Allow users to update values later through Goal settings.

Claude Code must not:

- Invent onboarding questions.
- Invent financial logic from onboarding copy.
- Let Smith AI silently save answers.
- Let Smith AI invent answers.
- Use wallet copy that implies custody or execution.
- Ask for seed phrases or private keys.
- Treat demo answers as real settings.
- Use investment-pressure language.
- Generate recommendations directly from draft answers.
- Show fake loading or fake dashboard values.

---

## Do

- Keep onboarding simple.
- Explain why each question matters.
- Say users can update later.
- Keep wallet copy non-custodial.
- Keep Demo Mode clearly sample.
- Keep Smith AI helpful and grounded.
- Use clear validation.
- Preserve user input.
- Review before finishing.
- Transition calmly to Dashboard.

---

## Do Not

- Do not pressure users.
- Do not shame values.
- Do not imply guarantees.
- Do not imply automatic investing.
- Do not imply WealthSmith controls funds.
- Do not ask for secrets.
- Do not mix demo and real values.
- Do not make Smith AI the source of truth.
- Do not calculate suggestions in copy.
- Do not show unresolved variables.

---

## Done Criteria

Onboarding copy is implemented correctly when:

- Welcome, wallet/demo, goal, horizon, risk, income, expenses, contribution frequency, monthly saving goal, review, and finish steps have approved copy.
- Smith AI onboarding companion messages are covered.
- Wallet safety and non-custodial copy are present.
- Demo Mode onboarding copy is clearly sample/demo.
- Validation copy is specific and non-blaming.
- Undo/restart/skip/save copy exists.
- Post-onboarding transition copy exists.
- Copy avoids guarantees, custody, execution, seed phrase/private key requests, and investment pressure.
- Claude Code can implement onboarding without inventing user-facing copy.

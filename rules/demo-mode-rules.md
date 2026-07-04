# Demo Mode Rules

This rule file defines how WealthSmith Demo Mode works.

Demo Mode lets users explore WealthSmith with sample data before connecting a wallet.

Demo Mode must be clearly separated from real wallet mode.

---

## Purpose

Demo Mode helps users understand WealthSmith before they connect a wallet.

It should let users preview:

- Dashboard
- Portfolio
- Safety Buffer
- Projected Growth
- Smith AI Suggestions
- Top Pick
- Locked opportunities
- Strategy Insights
- Ask Smith AI behavior

Demo Mode should reduce friction and build trust.

It must not confuse sample data with real wallet data.

---

## Core Hard Rules

Hard Rule:

```text
Demo Mode data must never be mixed with real wallet data.
```

Hard Rule:

```text
Demo Mode must be visibly labeled whenever demo data is active.
```

Hard Rule:

```text
Demo suggestions must never persist into real wallet mode.
```

Hard Rule:

```text
Smith AI must always know whether it is explaining demo data or real wallet data.
```

---

## What Demo Mode Is

Demo Mode is:

```text
A sample WealthSmith experience
A preview of how the product works
A safe way to explore without connecting a wallet
A demo portfolio with demo suggestions
A non-custodial education/onboarding tool
```

Demo Mode is not:

```text
The user’s real wallet
The user’s real portfolio
A real recommendation based on connected wallet data
A real protocol execution flow
A wallet connection substitute
A persistent real account state
```

---

## Demo Mode Entry Points

Demo Mode can be entered from:

```text
Global Nav during onboarding when no wallet is connected
Pre-wallet Dashboard state
Connect Wallet alternative path
Onboarding start state
Support/FAQ guidance
```

Primary CTA:

```text
Try Demo Mode
```

Rules:

- `Try Demo Mode` should not connect a wallet.
- `Try Demo Mode` should not require a signature.
- `Try Demo Mode` should not request seed phrase or private key.
- `Try Demo Mode` should clearly start a sample-data experience.
- Entry point should not imply demo data is personalized from the user’s real wallet.

---

## Demo Mode Banner

Demo Mode must show a persistent banner.

Use:

```text
components/announcement.md
```

Recommended banner copy:

```text
You’re in demo mode.
Exit Demo
```

Rules:

- Banner appears above Global Nav.
- Banner is not part of Global Nav.
- Banner remains visible while demo data is active.
- Banner should include Exit Demo action.
- Banner should not be dismissible unless another persistent demo indicator remains visible.
- Banner must not cover critical navigation.
- Banner must be accessible.
- Banner must work across desktop, tablet, and mobile.

Hard Rule:

```text
Users must always be able to tell when they are viewing demo data.
```

---

## Demo Mode Global Nav

When Demo Mode is active:

```text
demo_mode = true
wallet.status = disconnected
onboarding_active = false
```

Global Nav should show:

```text
Dashboard / Portfolio / Goal / Support enabled
Ask Smith AI
No wallet pill
No Connect Wallet button
```

Rules:

- Demo Mode banner appears above Global Nav.
- Wallet pill should not appear in Demo Mode.
- Connect Wallet should not appear in this Global Nav variant unless product intentionally adds a separate switch-to-real-wallet CTA elsewhere.
- Ask Smith AI is allowed.
- Navigation items are enabled so users can explore the product.
- Demo Mode must not be confused with active onboarding.
- Demo Mode overrides onboarding while active: entering Demo Mode forces `onboarding_active = false` and shows Demo Mode instead of onboarding. Exiting Demo Mode returns to the correct disconnected/onboarding state (`onboarding_active` is re-derived from wallet status and `goal_completed`).

See:

```text
components/global-nav.md
patterns/dashboard-layout.md
```

---

## Demo Portfolio State

Demo Mode uses sample portfolio data.

Recommended MVP demo data:

```json
{
  "goal": {
    "financial_goal": "build_long_term_wealth",
    "risk_tolerance": "medium",
    "timeline": "5_years",
    "income_monthly": 4000,
    "expenses_monthly": 1000,
    "monthly_saving_goal": 1000,
    "contribution_frequency": "monthly"
  },
  "portfolio": {
    "SOL": 5500,
    "BONK": 1200,
    "USDC": 800
  }
}
```

Rules:

- Demo data must be explicitly marked as demo/sample in app state.
- Demo data must not be fetched from user wallet.
- Demo data must not be saved as real wallet data.
- Demo data must not overwrite user saved real wallet state.
- Demo values should be stable enough for QA and consistent demos.
- Demo values should match examples used in product documentation.

---

## Demo Data Contract

Recommended state:

```json
{
  "mode": "demo",
  "demo_mode": true,
  "wallet": {
    "status": "disconnected",
    "mode": null
  },
  "data_source": "demo_sample",
  "demo": {
    "portfolio_id": "default_mvp_demo",
    "is_sample_data": true
  }
}
```

Rules:

- Demo state must include explicit `mode = demo` or equivalent.
- Demo state must not include a real wallet address.
- Demo state must not reuse real wallet IDs.
- Demo state must not be passed into real-wallet recommendation pipelines without demo isolation.
- Smith AI context must include demo mode flag.

---

## Demo Suggestions

Demo Mode can show sample suggestions.

Rules:

- Demo suggestions must be generated from demo data.
- Demo suggestions must be clearly based on sample state.
- Demo suggestions may include Top Pick.
- Demo suggestions may include locked opportunities.
- Demo suggestions may include Strategy Insights.
- Demo suggestions must not persist after Exit Demo.
- Demo suggestions must not become real wallet suggestions after wallet connection.
- Demo suggestions must follow the same rendering rules as real suggestions.
- Demo suggestions must not execute transactions.

Hard Rule:

```text
Demo suggestions are sample suggestions, not real wallet recommendations.
```

---

## Demo Top Pick

Demo Mode can show one Top Pick.

Rules:

- Demo Top Pick must come from demo Suggestion Engine output.
- Demo Top Pick must follow Top Pick rules.
- Demo Top Pick must be marked as demo/sample context.
- Demo Top Pick must not persist into real wallet mode.
- Exiting Demo clears demo Top Pick.
- Connecting wallet clears or replaces demo Top Pick with real-wallet Top Pick after real logic runs.

Hard Rule:

```text
Demo Top Pick and real wallet Top Pick must stay separate.
```

---

## Demo Safety Buffer

Demo Mode can show Safety Buffer based on demo goal and demo portfolio values.

Rules:

- Demo Safety Buffer values must come from demo product logic.
- Demo Safety Buffer must not be mixed with real income/expense/wallet values.
- Demo Safety Buffer copy should not imply it describes the real user.
- Smith AI should say “in this demo” when explaining demo buffer values.

Good Smith AI demo phrasing:

```text
In this demo portfolio, the Safety Buffer is underfunded, so WealthSmith prioritizes building USDC reserves first.
```

Bad:

```text
Your real Safety Buffer is underfunded.
```

when only Demo Mode is active.

---

## Demo Portfolio Page

Demo Mode may allow users to open Portfolio.

Rules:

- Portfolio page should show demo/sample positions.
- Demo positions should be consistent with demo portfolio data.
- Position labels, tables, charts, and token icons work the same as real mode.
- Portfolio values must not be presented as real wallet balances.
- Manage links should be disabled or clearly demo/external-preview only unless product intentionally allows protocol exploration.
- Do not show wallet pill.
- Do not show real wallet address.

---

## Demo Goal Page

Demo Mode may allow users to open Goal.

Rules:

- Goal page may show demo goal assumptions.
- Editing demo goal settings should update demo state only.
- Demo goal edits must not persist as real user settings unless user explicitly starts account/onboarding flow and confirms.
- Demo goal edits may recalculate demo suggestions through demo product logic.
- Demo goal values must not overwrite real saved goal settings.

Recommended copy near edited demo goal if needed:

```text
These changes apply to the demo only.
```

---

## Demo Support Page

Support page is available in Demo Mode.

Rules:

- FAQ content remains canonical.
- Contact Us remains available.
- Contact Us should not require wallet connection.
- Contact Us should not attach demo data as if it were real wallet data.
- Smith AI may explain Demo Mode from support content.
- Smith AI must not say demo data is real wallet data.

---

## Ask Smith AI in Demo Mode

Ask Smith AI is allowed in Demo Mode.

Smith AI may:

```text
Explain demo dashboard
Explain demo portfolio
Explain demo suggestions
Explain demo Top Pick
Explain how real wallet mode would differ
Help user exit Demo Mode
Explain how to connect a wallet
```

Smith AI must not:

```text
Treat demo values as the user’s real wallet
Carry demo recommendations into real mode
Claim it has read the user’s wallet
Invent real wallet positions
Suggest real transactions from demo data
```

Hard Rule:

```text
Smith AI responses in Demo Mode must be demo-aware.
```

Good response:

```text
In this demo, WealthSmith is showing how it would prioritize Safety Buffer funding before yield opportunities.
```

Bad response:

```text
You should swap your BONK now.
```

when only demo sample data is active.

---

## Exiting Demo Mode

Exit Demo should be clear and always available when demo data is active.

Primary action:

```text
Exit Demo
```

On exit:

```text
Clear demo portfolio data
Clear demo suggestions
Clear demo Top Pick
Clear demo Smith AI context
Clear demo strategy insights
Return to pre-wallet state or previous non-demo state
```

Rules:

- Exiting Demo must not affect real wallet data.
- Exiting Demo must not delete real saved goal settings.
- Exiting Demo must not leave demo suggestions visible.
- Exiting Demo must not leave Smith AI explaining demo context as real.
- After exit, user can connect wallet or restart Demo Mode.

---

## Connecting Wallet From Demo Mode

If user chooses to connect a wallet while in Demo Mode:

Recommended behavior:

```text
1. Show Connect Wallet flow.
2. On successful wallet connection, exit Demo Mode.
3. Clear demo data.
4. Load real wallet data.
5. Generate real wallet suggestions.
6. Show wallet pill.
7. Remove Demo Mode banner.
```

Rules:

- Do not merge demo portfolio with real wallet portfolio.
- Do not keep demo suggestions while real wallet data loads unless clearly replaced by loading state.
- Do not show demo Top Pick in real wallet mode.
- Do not treat demo goal edits as real saved goal settings unless explicitly confirmed.
- Wallet connection remains read-only for MVP.
- No seed phrase or private key request.

Hard Rule:

```text
Wallet connection must switch the user from demo context to real-wallet context before real recommendations are shown.
```

---

## Demo vs Real Data Separation

Never mix:

```text
Demo portfolio + real wallet address
Demo suggestions + real wallet portfolio
Demo Safety Buffer + real income/expenses unless explicitly demo-edited
Demo Top Pick + real suggestion list
Demo protocol destinations + real wallet state
Real wallet balances + Demo Mode banner
```

Rules:

- Data source must be explicit.
- UI must not show mixed state.
- Smith AI must not answer from mixed state.
- QA must test entry/exit transitions.
- If mixed state is detected, show safe reset/loading state rather than rendering conflicting data.

---

## Demo Protocol Handoffs

Demo suggestions may reference protocols.

Rules:

- Demo protocol destinations should be sample/exploratory.
- Demo handoffs must not imply real user action is recommended.
- Demo handoffs must not execute transactions.
- Demo handoffs must not request wallet signatures.
- Demo protocol destinations must not persist into real wallet mode.
- If protocol links are active in Demo Mode, copy should make clear the user is leaving WealthSmith and reviewing externally.

Safe copy:

```text
Open protocol
Review externally
```

Avoid:

```text
Execute demo trade
Complete action
We moved funds
```

---

## Demo Copy Rules

Use:

```text
Demo Mode
Sample portfolio
Sample suggestions
In this demo
Preview how WealthSmith works
Exit Demo
Connect wallet to personalize with your real portfolio
```

Avoid:

```text
Your real portfolio
Your wallet
Your actual balance
You should do this now
We read your wallet
Funds moved
```

Rules:

- Demo copy should be clear but not repetitive.
- Demo label should remain visible through the banner.
- Smith AI should use “demo” phrasing when explaining values.
- Suggestions can use normal card layout, but context must remain demo-labeled.

---

## Loading Rules in Demo Mode

Demo Mode should feel fast.

Rules:

- Demo state should usually load instantly.
- Do not show loading for fast demo transitions.
- If demo suggestion generation takes time, follow loading state rules.
- Smith AI animation can be used for meaningful demo suggestion-building waits.
- Do not show wallet connection loading unless user actually connects a wallet.
- Do not show fake real-wallet loading in Demo Mode.

---

## Empty and Error States

If Demo Mode data fails to load:

```text
Demo unavailable
We couldn’t load the demo experience right now.
```

Rules:

- Do not fallback to real wallet data.
- Do not show partial demo data as real.
- Provide retry or return to pre-wallet state.
- Keep Connect Wallet available if relevant.
- Keep copy calm.

If user exits demo and no wallet is connected:

```text
Connect your wallet or try Demo Mode to explore WealthSmith.
```

---

## Persistence Rules

Demo Mode persistence should be intentional.

Recommended MVP behavior:

```text
Demo Mode can persist during the current app session.
Demo Mode should clear on explicit Exit Demo.
Demo Mode should clear when real wallet connects.
```

Rules:

- Do not persist demo suggestions as user recommendations.
- Do not persist demo Top Pick as user Top Pick.
- Do not persist demo wallet-like state.
- Do not accidentally save demo goal edits as real saved goal settings.
- If demo mode persists across reloads, banner must persist too.

---

## Analytics and QA Rules

Analytics should distinguish:

```text
Demo Mode event
Real wallet event
```

Rules:

- Demo interactions should not be counted as real wallet actions.
- Demo suggestions opened should not be counted as real recommendation completions.
- Demo protocol handoff should be labeled demo.
- QA should test mode switching.

Required QA cases:

```text
Enter Demo Mode from pre-wallet state
Exit Demo Mode
Connect wallet from Demo Mode
Open Dashboard in Demo Mode
Open Portfolio in Demo Mode
Open Goal in Demo Mode
Open Support in Demo Mode
Ask Smith AI in Demo Mode
Generate demo Top Pick
Ensure no wallet pill appears
Ensure demo banner appears
Ensure demo suggestions clear on exit
Ensure real wallet state does not include demo data
```

---

## Security and Wallet Safety

Demo Mode must reinforce safety.

Rules:

- Demo Mode must not request seed phrase.
- Demo Mode must not request private key.
- Demo Mode must not request wallet signature.
- Demo Mode must not imply wallet has been connected.
- Demo Mode must not imply funds are held by WealthSmith.
- Demo Mode must not imply sample actions execute.
- If user wants real personalization, route to Connect Wallet with read-only copy.

---

## Data Contract

Demo state example:

```json
{
  "app_mode": "demo",
  "demo_mode": true,
  "data_source": "demo_sample",
  "wallet": {
    "status": "disconnected",
    "provider": null,
    "address": null,
    "address_short": null
  },
  "demo": {
    "portfolio_id": "default_mvp_demo",
    "banner_visible": true,
    "can_exit": true
  }
}
```

Demo suggestion example:

```json
{
  "suggestion_id": "demo_fund_safety_buffer_usdc",
  "mode": "demo",
  "is_demo": true,
  "type": "fund_safety_buffer",
  "status": "active",
  "actionability": "actionable",
  "is_top_pick": true,
  "reason_codes": ["demo_safety_buffer_underfunded"]
}
```

Rules:

- Demo IDs may be prefixed with `demo_`.
- Demo mode should be explicit in suggestion objects.
- Demo context should be passed to Smith AI.
- Real suggestion IDs and demo suggestion IDs should not collide if persistence is possible.

---

## Related Files

Rules:

```text
rules/financial-logic-boundaries.md
rules/suggestion-engine-rules.md
rules/top-pick-rules.md
rules/protocol-selection-rules.md
rules/wallet-and-custody-rules.md
rules/smith-ai-rules.md
rules/loading-state-rules.md
```

Components:

```text
components/global-nav.md
components/announcement.md
components/suggestion-card.md
components/card.md
components/button.md
```

Patterns:

```text
patterns/dashboard-layout.md
patterns/onboarding-with-smith-ai.md
patterns/suggestion-flow.md
patterns/portfolio-overview.md
patterns/goal-settings.md
patterns/support-center.md
patterns/empty-loading-error-states.md
```

---

## Claude Code Rules

Claude Code should:

- Store Demo Mode as explicit app state.
- Show Demo Mode banner whenever demo data is active.
- Use sample data only in Demo Mode.
- Keep wallet state disconnected in Demo Mode.
- Hide wallet pill in Demo Mode.
- Show Ask Smith AI in Demo Mode when allowed.
- Keep demo suggestions separate from real suggestions.
- Keep demo Top Pick separate from real Top Pick.
- Clear demo data on Exit Demo.
- Clear demo data when real wallet connects.
- Pass demo context to Smith AI.
- Prevent mixed demo/real states.
- Use safe demo copy.
- Use demo-specific analytics labels.

Claude Code must not:

- Mix demo data with real wallet data.
- Show wallet pill in Demo Mode.
- Persist demo suggestions into real wallet mode.
- Persist demo Top Pick into real wallet mode.
- Treat demo protocol handoff as real execution.
- Request wallet signatures in Demo Mode.
- Ask for seed phrases or private keys.
- Let Smith AI call demo values real wallet values.
- Save demo goal edits as real settings without explicit confirmation.
- Hide Demo Mode state while demo data is active.

---

## Do

- Make Demo Mode easy to enter.
- Make Demo Mode easy to exit.
- Show persistent Demo Mode banner.
- Use stable sample data.
- Let users explore the product.
- Let Smith AI explain demo context.
- Keep demo and real data separate.
- Clear demo suggestions on exit.
- Switch cleanly to real wallet mode after wallet connection.
- Use calm, clear demo copy.

---

## Do Not

- Do not mix demo and real data.
- Do not hide that the user is in Demo Mode.
- Do not show wallet pill in Demo Mode.
- Do not imply demo suggestions are real wallet advice.
- Do not persist demo Top Pick into real mode.
- Do not execute transactions from demo suggestions.
- Do not request signatures in Demo Mode.
- Do not ask for seed phrases or private keys.
- Do not treat demo protocol links as completed actions.
- Do not let Smith AI forget demo context.

---

## Done Criteria

This rule is followed when:

- Demo Mode has explicit app state.
- Demo Mode banner is visible whenever demo data is active.
- Demo Mode uses sample data only.
- Wallet state remains disconnected in Demo Mode.
- Wallet pill is hidden in Demo Mode.
- Demo Dashboard, Portfolio, Goal, Support, and Ask Smith AI work safely.
- Demo suggestions and demo Top Pick are clearly separate from real ones.
- Exiting Demo clears demo state.
- Connecting a wallet clears demo state before real recommendations appear.
- Smith AI explains demo data as demo data.
- No demo action executes a transaction.
- No demo action requests a wallet signature.
- No seed phrase or private key is requested.

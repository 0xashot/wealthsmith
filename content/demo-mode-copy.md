# Demo Mode Copy

This file defines approved WealthSmith copy for Demo Mode.

Demo Mode lets users explore WealthSmith with sample data before connecting a wallet.

Demo copy must always make it clear that the user is viewing a sample experience, not their real wallet data.

---

## Purpose

Demo Mode copy should help users understand:

```text
What Demo Mode is
Why Demo Mode exists
What data is sample
What suggestions are sample
How Demo Mode differs from real wallet mode
How to exit Demo Mode
How to connect a wallet for personalization
What Smith AI is explaining in demo context
What does not happen automatically
```

Demo Mode copy should reduce friction and build trust.

It must not confuse sample data with real wallet data.

---

## Core Hard Rules

Hard Rule:

```text
Demo Mode copy must clearly label sample data as demo/sample data.
```

Hard Rule:

```text
Demo copy must never imply WealthSmith has read the user’s real wallet.
```

Hard Rule:

```text
Demo suggestions must never be framed as real wallet recommendations.
```

Hard Rule:

```text
Demo copy must not persist into real wallet mode after wallet connection.
```

Hard Rule:

```text
Smith AI must use demo-aware phrasing when explaining demo data.
```

---

## Core Demo Message

Approved baseline copy:

```text
You’re in demo mode.
```

Expanded:

```text
You’re viewing a sample portfolio and sample suggestions.
```

Demo-to-wallet helper:

```text
Connect your wallet to personalize WealthSmith with your real portfolio.
```

Short explanation:

```text
Demo Mode uses sample data so you can explore WealthSmith before connecting a wallet.
```

Rules:

- Use “demo” or “sample” in core copy.
- Do not call demo data “your wallet.”
- Do not call demo suggestions real recommendations.
- Do not imply Demo Mode connects a wallet.

---

## Entry Point Copy

Primary CTA:

```text
Try Demo Mode
```

Approved helper copy:

```text
Explore WealthSmith with sample data before connecting a wallet.
```

Alternative helper:

```text
Preview the dashboard, portfolio, and suggestions with a sample portfolio.
```

Connect Wallet alternative:

```text
Connect your wallet to personalize WealthSmith with your real portfolio.
```

Rules:

- Keep Demo Mode positioned as exploration/preview.
- Do not imply demo is personalized.
- Do not imply wallet connection is required to try demo.
- Do not imply demo requires a signature.

Avoid:

```text
Try with your wallet
Get real recommendations
Start investing
Preview your actual portfolio
```

---

## Demo Banner Copy

The demo banner must be visible whenever Demo Mode data is active.

Preferred banner title:

```text
You’re in demo mode.
```

Preferred banner description:

```text
This is a sample portfolio. Connect your wallet to personalize WealthSmith with your real portfolio.
```

Primary action:

```text
Exit Demo
```

Optional secondary action:

```text
Connect Wallet
```

Compact banner:

```text
You’re in demo mode.
```

Rules:

- Banner appears above Global Nav.
- Banner must remain visible while demo data is active.
- Banner should include `Exit Demo`.
- Banner should not be dismissed unless another persistent demo indicator remains visible.
- Banner must not be part of Global Nav.
- Banner must not hide critical navigation.

---

## Demo Mode Labels

Approved labels:

```text
Demo Mode
Sample portfolio
Sample suggestions
Sample data
Demo Top Pick
Demo insight
```

Preferred surface labels:

```text
You’re in demo mode.
Sample portfolio
Sample suggestions
Exit Demo
```

Rules:

- Use “sample” for data and suggestions.
- Use “demo” for mode/state.
- Do not over-label every number if the banner is persistent.
- Use extra labels where confusion risk is high.

---

## Global Nav Demo Copy

When Demo Mode is active, Global Nav may show:

```text
Dashboard
Portfolio
Goal
Support
Ask Smith AI
```

It must not show:

```text
Wallet pill
Connected wallet label
Real wallet address
```

Rules:

- Demo Mode banner provides the demo state.
- `Ask Smith AI` is allowed in Demo Mode.
- `Connect Wallet` may appear as a separate transition CTA if product design supports it, but not as a wallet-connected state.
- Do not show `Phantom • 6fQ9` or any wallet pill in Demo Mode.

---

## Demo Dashboard Copy

Dashboard intro/helper:

```text
This dashboard uses sample data to show how WealthSmith works.
```

Safety Buffer demo helper:

```text
In this demo, Safety Buffer shows how WealthSmith prioritizes stablecoin reserves before additional yield opportunities.
```

Suggestions demo helper:

```text
These are sample suggestions based on the demo portfolio.
```

Projected Growth demo helper:

```text
Projected Growth is modeled from the demo plan settings.
```

Rules:

- Use “in this demo” when explaining demo-specific data.
- Do not say “your real portfolio.”
- Do not imply projections are real user outcomes.
- Do not imply suggestions should be acted on by the real user.

---

## Demo Portfolio Copy

Portfolio label:

```text
Sample portfolio
```

Portfolio helper:

```text
This portfolio is sample data. Connect a wallet to view supported balances and positions from your real portfolio.
```

Liquid Assets helper:

```text
Sample liquid assets
```

Staked Assets helper:

```text
Sample staked assets
```

Yield Strategies helper:

```text
Sample yield strategies
```

Empty demo portfolio fallback:

```text
Demo portfolio unavailable
```

Description:

```text
We couldn’t load the sample portfolio right now.
```

Rules:

- Use “sample” for portfolio sections when needed.
- Do not show a wallet pill.
- Do not show real wallet address.
- Do not imply sample positions exist in the user’s wallet.
- Do not imply external protocol actions are real actions for the user.

---

## Demo Goal Copy

Goal page helper:

```text
These goal settings apply to the demo only.
```

Edit helper:

```text
Changes here update the demo experience only.
```

Save toast:

```text
Demo goal updated
```

Discard helper:

```text
Discard demo changes
```

Rules:

- Demo goal changes must not sound like real saved plan changes.
- Do not imply demo edits affect real wallet suggestions.
- Do not persist demo goal values into real wallet mode unless user explicitly confirms through product flow.

---

## Demo Suggestions Copy

Suggestion rail helper:

```text
Sample suggestions based on the demo portfolio.
```

Demo Top Pick helper:

```text
Demo Top Pick shows how WealthSmith highlights one sample next action.
```

Suggestion explanation prefix:

```text
In this demo, ...
```

Examples:

```text
In this demo, WealthSmith is showing how Safety Buffer suggestions work.
```

```text
In this demo, this suggestion appears because the sample Safety Buffer is below target.
```

Rules:

- Demo suggestion cards may use normal suggestion templates if demo banner is visible.
- Use explicit demo-aware phrasing in Smith AI explanations.
- Do not say “you should” for demo suggestions.
- Do not imply demo actions are personalized.
- Do not allow demo suggestions to persist into real wallet mode.

---

## Demo Top Pick Copy

Approved explanation:

```text
Demo Top Pick shows how WealthSmith marks one sample suggestion as the highest-priority next action.
```

Smith AI explanation:

```text
In this demo, this is Top Pick because the sample Safety Buffer is below target. In real wallet mode, Top Pick is selected from your actual wallet and saved plan data.
```

Rules:

- Do not call Demo Top Pick the user’s real Top Pick.
- Do not imply the user should act on the demo Top Pick.
- Do not persist Demo Top Pick into real wallet mode.

---

## Demo Smith AI Copy

Smith AI must know when Demo Mode is active.

Approved demo explanation intro:

```text
In this demo, ...
```

Approved Demo Mode explanation:

```text
Demo Mode uses a sample portfolio and sample suggestions so you can explore how WealthSmith works without connecting a wallet.
```

Approved real-wallet transition explanation:

```text
Connect your wallet to personalize WealthSmith with your real portfolio. Demo suggestions will be replaced by real wallet suggestions after your wallet data loads.
```

Approved demo limitation:

```text
This is based on sample data, not your real wallet.
```

Rules:

- Smith AI should not say “your wallet” when only demo data is active.
- Smith AI should not say it has read the user’s wallet.
- Smith AI should not recommend real transactions from demo data.
- Smith AI should not carry demo context into real wallet mode.

---

## Demo Protocol Handoff Copy

Demo suggestions may show protocol handoff examples if product allows protocol exploration.

Approved CTA:

```text
Open protocol
```

Approved protocol-specific CTA:

```text
Review on {protocol}
```

Demo helper:

```text
This is a demo handoff. You’ll review the protocol externally, and no action will be taken automatically.
```

Alternative:

```text
This opens the protocol in a new tab. Demo suggestions are based on sample data.
```

Rules:

- Do not imply a real user action is recommended.
- Do not imply WealthSmith executes anything.
- Do not request wallet signatures from Demo Mode.
- Do not mark a demo suggestion completed after opening protocol.
- Do not persist demo protocol destinations into real wallet mode.

Avoid:

```text
Execute demo trade
Complete action
Swap now
Stake now
Funds moved
```

---

## Demo Exit Copy

Primary action:

```text
Exit Demo
```

Exit confirmation title, if confirmation is needed:

```text
Exit Demo Mode?
```

Exit confirmation description:

```text
This will clear the sample portfolio and sample suggestions.
```

Confirm action:

```text
Exit Demo
```

Cancel action:

```text
Cancel
```

Exit toast:

```text
Exited Demo Mode
```

Post-exit empty state:

```text
Connect your wallet or try Demo Mode to explore WealthSmith.
```

Rules:

- Do not imply real wallet data is deleted.
- Do not imply user account data is deleted.
- Do not say “disconnect wallet” unless a wallet was connected.
- Clear demo data and demo Smith AI context.

---

## Connect Wallet From Demo Copy

Transition CTA:

```text
Connect Wallet
```

Transition helper:

```text
Connect your wallet to replace sample data with your real portfolio.
```

Wallet connection success after demo:

```text
Wallet connected
```

Data loading helper:

```text
Loading supported balances and positions...
```

Demo clearing copy, if visible:

```text
Leaving Demo Mode...
```

Rules:

- Make clear demo data will be replaced.
- Do not merge demo and real data.
- Do not show demo suggestions while real wallet suggestions load unless clearly transitioning.
- Remove demo banner after real wallet mode is active.
- Do not treat demo goal edits as real plan settings unless explicitly confirmed.

---

## Demo Loading Copy

Demo entry should usually be fast.

Loading title:

```text
Loading Demo Mode...
```

Loading description:

```text
WealthSmith is preparing a sample portfolio.
```

Demo suggestion loading:

```text
Building sample suggestions...
```

Demo strategy insight loading:

```text
Preparing sample strategy insights...
```

Rules:

- Do not show wallet loading in Demo Mode.
- Do not imply real wallet data is being loaded.
- Do not use long loading copy for instant demo entry.
- Smith AI animation may be used only for meaningful suggestion/insight waits.

---

## Demo Error Copy

Demo unavailable title:

```text
Demo Mode unavailable
```

Demo unavailable description:

```text
We couldn’t load the demo experience right now.
```

Primary action:

```text
Try Again
```

Secondary action:

```text
Connect Wallet
```

Demo portfolio unavailable:

```text
Demo portfolio unavailable
```

Description:

```text
We couldn’t load the sample portfolio right now.
```

Demo suggestions unavailable:

```text
Sample suggestions unavailable
```

Description:

```text
We couldn’t load sample suggestions right now.
```

Rules:

- Do not fall back to real wallet data.
- Do not show partial demo data as real.
- Do not invent sample values if demo data fails.
- Keep copy calm.

---

## Demo Empty States

If demo suggestions are intentionally empty:

Title:

```text
No sample suggestions
```

Description:

```text
The demo portfolio does not have sample suggestions right now.
```

Rules:

- Use only if product intentionally supports empty demo suggestions.
- Do not convert demo empty state into real empty state.
- Do not show real-wallet CTAs as if wallet is connected.

---

## Demo Support Copy

Support page helper in Demo Mode:

```text
You’re viewing support while in Demo Mode. FAQ answers still apply to the product, but demo portfolio data is sample data.
```

Contact Us helper:

```text
Describe the issue. Do not include seed phrases, private keys, passwords, or wallet backup files.
```

Rules:

- Support content remains canonical.
- Demo Mode does not change wallet/security rules.
- Contact Us should not attach demo data as real wallet data.
- Smith AI may explain Demo Mode using support content.

---

## Demo Security Copy

Approved security reminder:

```text
Demo Mode does not require a wallet connection or signature.
```

Seed phrase warning if wallet/security topic appears:

```text
Never share your seed phrase or private key.
```

Rules:

- Do not request wallet signature in Demo Mode.
- Do not imply Demo Mode has wallet permissions.
- Do not imply sample actions execute.

---

## Demo vs Real Copy Rules

Use these phrases in Demo Mode:

```text
In this demo
Sample portfolio
Sample suggestions
Sample data
Preview how WealthSmith works
Connect your wallet to personalize
```

Use these phrases in real wallet mode:

```text
Your portfolio
Your wallet
Your current plan
Based on your wallet data
```

Do not use real-wallet phrases in Demo Mode:

```text
Your real portfolio is underfunded
Your wallet holds
Your assets are overexposed
You should swap
```

Rules:

- Demo Mode can say “your demo portfolio” only if context is clearly sample.
- Prefer “the sample portfolio” for clarity.
- Real wallet mode should not show demo labels.
- If app state is mixed or uncertain, show safe loading/reset state.

---

## Demo Copy Examples

### Good: Demo Banner

```text
You’re in demo mode.
This is a sample portfolio. Connect your wallet to personalize WealthSmith with your real portfolio.
```

### Bad: Demo Banner

```text
Your portfolio is loaded.
```

---

### Good: Smith AI Demo Explanation

```text
In this demo, WealthSmith is showing how Safety Buffer suggestions work. This is based on sample data, not your real wallet.
```

### Bad: Smith AI Demo Explanation

```text
Your wallet needs more USDC.
```

---

### Good: Demo Portfolio Helper

```text
This portfolio is sample data. Connect a wallet to view supported balances and positions from your real portfolio.
```

### Bad: Demo Portfolio Helper

```text
These are your current assets.
```

---

### Good: Demo Exit

```text
Exiting Demo clears the sample portfolio and sample suggestions.
```

### Bad: Demo Exit

```text
Disconnect wallet
```

when no wallet is connected.

---

## Approved Copy Map

Recommended content IDs:

```json
{
  "demo.entry.cta": "Try Demo Mode",
  "demo.entry.helper": "Explore WealthSmith with sample data before connecting a wallet.",

  "demo.banner.title": "You’re in demo mode.",
  "demo.banner.description": "This is a sample portfolio. Connect your wallet to personalize WealthSmith with your real portfolio.",
  "demo.banner.exit": "Exit Demo",
  "demo.banner.connect_wallet": "Connect Wallet",

  "demo.label.mode": "Demo Mode",
  "demo.label.sample_portfolio": "Sample portfolio",
  "demo.label.sample_suggestions": "Sample suggestions",
  "demo.label.sample_data": "Sample data",

  "demo.dashboard.helper": "This dashboard uses sample data to show how WealthSmith works.",
  "demo.portfolio.helper": "This portfolio is sample data. Connect a wallet to view supported balances and positions from your real portfolio.",
  "demo.goal.helper": "These goal settings apply to the demo only.",
  "demo.suggestions.helper": "Sample suggestions based on the demo portfolio.",

  "demo.smith.explain": "In this demo, WealthSmith is showing how the product works with sample data.",
  "demo.smith.limitation": "This is based on sample data, not your real wallet.",

  "demo.exit.cta": "Exit Demo",
  "demo.exit.title": "Exit Demo Mode?",
  "demo.exit.description": "This will clear the sample portfolio and sample suggestions.",
  "demo.exit.toast": "Exited Demo Mode",

  "demo.connect_wallet.helper": "Connect your wallet to replace sample data with your real portfolio.",

  "demo.loading.title": "Loading Demo Mode...",
  "demo.loading.description": "WealthSmith is preparing a sample portfolio.",

  "demo.error.title": "Demo Mode unavailable",
  "demo.error.description": "We couldn’t load the demo experience right now."
}
```

Rules:

- Use stable IDs for implementation.
- Do not duplicate conflicting demo copy.
- Keep demo copy aligned across Dashboard, Portfolio, Goal, Support, and Smith AI.

---

## Forbidden Demo Copy

Never use in Demo Mode:

```text
Your real portfolio
Your wallet is underfunded
Your actual balance
Your assets are overexposed
You should swap now
We read your wallet
Wallet connected
Funds moved
Trade complete
Transaction submitted
Real recommendation
Personalized recommendation
```

Use safer alternatives:

```text
Sample portfolio
In this demo
Sample suggestions
Demo Top Pick
Preview how WealthSmith works
Connect your wallet to personalize
No action will be taken automatically
```

---

## QA Checklist

Before shipping Demo Mode copy, verify:

```text
Is demo state visible?
Does banner say the user is in Demo Mode?
Does copy use sample/demo language?
Does copy avoid saying wallet is connected?
Does copy avoid calling demo data real?
Does copy avoid real recommendation language?
Does Smith AI use “in this demo” when explaining demo values?
Does Exit Demo copy say sample data is cleared?
Does Connect Wallet from Demo say sample data will be replaced?
Does protocol handoff copy avoid execution language?
Does error copy avoid falling back to real wallet data?
Does demo copy clear when real wallet mode starts?
```

---

## Related Files

Rules:

```text
rules/demo-mode-rules.md
rules/wallet-and-custody-rules.md
rules/smith-ai-rules.md
rules/suggestion-engine-rules.md
rules/loading-state-rules.md
```

Content:

```text
content/voice-and-tone.md
content/ui-copy-rules.md
content/wallet-copy.md
content/smith-ai-copy.md
content/support-faq-content.md
content/empty-error-loading-copy.md
content/suggestion-card-copy.md
```

Components:

```text
components/announcement.md
components/global-nav.md
components/suggestion-card.md
components/button.md
components/empty-state.md
components/toast.md
```

Patterns:

```text
patterns/dashboard-layout.md
patterns/onboarding-with-smith-ai.md
patterns/suggestion-flow.md
patterns/portfolio-overview.md
patterns/goal-settings.md
patterns/support-center.md
```

---

## Claude Code Rules

Claude Code should:

- Use `Try Demo Mode` as the entry CTA.
- Show a persistent Demo Mode banner while demo data is active.
- Use `You’re in demo mode.` as the core banner label.
- Label sample portfolio and sample suggestions clearly.
- Pass demo context to Smith AI.
- Use “in this demo” in Smith AI demo explanations.
- Use demo-specific loading/error copy.
- Clear demo copy when real wallet mode starts.
- Use `Exit Demo` to clear demo state.
- Use demo-to-wallet copy when connecting wallet from Demo Mode.
- Keep demo protocol handoff copy non-executing.

Claude Code must not:

- Use real-wallet copy in Demo Mode.
- Show wallet pill in Demo Mode.
- Say demo data is personalized.
- Say demo suggestions are real recommendations.
- Let Smith AI call demo data real.
- Persist demo suggestion copy into real wallet mode.
- Persist demo Top Pick copy into real wallet mode.
- Request wallet signatures in Demo Mode.
- Use execution language for demo protocol handoffs.
- Fall back to real wallet data when demo fails.
- Hide demo state while demo data is active.

---

## Do

- Say Demo Mode clearly.
- Say sample portfolio.
- Say sample suggestions.
- Say in this demo.
- Say connect wallet to personalize.
- Say Exit Demo.
- Keep demo banner visible.
- Keep demo and real wallet copy separate.
- Keep Smith AI demo-aware.
- Keep protocol handoffs non-executing.

---

## Do Not

- Do not call demo data real.
- Do not call demo suggestions personalized.
- Do not show wallet-connected copy.
- Do not show wallet pill.
- Do not imply wallet was read.
- Do not recommend real action from demo data.
- Do not request wallet signature.
- Do not imply execution.
- Do not persist demo copy into real mode.
- Do not hide demo context.

---

## Done Criteria

Demo Mode copy is implemented correctly when:

- `Try Demo Mode` entry copy exists.
- Persistent demo banner copy exists.
- Sample portfolio and sample suggestions are clearly labeled.
- Dashboard, Portfolio, Goal, Support, and Smith AI have demo-aware copy.
- Exit Demo copy clearly says sample data is cleared.
- Connect Wallet from Demo copy says sample data will be replaced.
- Demo loading/error states exist.
- Demo protocol handoff copy avoids execution claims.
- Smith AI says “in this demo” when explaining demo values.
- Demo copy never implies real wallet data, real recommendations, custody, execution, or wallet signing.

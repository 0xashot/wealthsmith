# Demo Smith AI Responses

This file contains approved Smith AI response examples for WealthSmith Demo Mode.

These are reference examples.

They are not production logic.

Smith AI must use demo-aware phrasing whenever Demo Mode is active.

---

## Purpose

This file shows how Smith AI should explain Demo Mode states, sample data, sample suggestions, Demo Top Pick, locked yield opportunities, and wallet transitions.

Demo Smith AI responses should make clear:

```text
The user is in Demo Mode
The data is sample data
Suggestions are sample suggestions
The demo portfolio is not the user’s real wallet
No action will be taken automatically
Wallet connection is separate from Demo Mode
```

---

## Source Examples

Related example fixtures:

```text
examples/demo-mode/demo-portfolio.json
examples/demo-mode/demo-dashboard-state.json
examples/demo-mode/demo-suggestions.json
```

Related rules and content:

```text
rules/demo-mode-rules.md
rules/smith-ai-rules.md
rules/suggestion-engine-rules.md
rules/top-pick-rules.md
rules/wallet-and-custody-rules.md

content/demo-mode-copy.md
content/smith-ai-copy.md
content/suggestion-card-copy.md
content/wallet-copy.md
content/glossary.md
```

---

## Demo Context Smith AI Must Know

Demo Mode state:

```json
{
  "mode": "demo",
  "demo_mode": true,
  "data_source": "demo_sample",
  "wallet": {
    "status": "disconnected",
    "show_wallet_pill": false
  }
}
```

Demo goal:

```json
{
  "financial_goal": "Build Long-Term Wealth",
  "risk_tolerance": "Medium",
  "time_horizon": "5 years",
  "monthly_income_usd": 4000,
  "monthly_expenses_usd": 1000,
  "contribution_rhythm": "Monthly",
  "monthly_saving_goal_usd": 1000
}
```

Demo portfolio:

```json
{
  "SOL": "$5,500",
  "BONK": "$1,200",
  "USDC": "$800",
  "total_value_usd": 7500
}
```

Demo Safety Buffer:

```json
{
  "current_buffer_usd": 800,
  "target_buffer_usd": 3000,
  "buffer_gap_usd": 2200,
  "coverage_percent": 26.67,
  "status": "underfunded"
}
```

Demo Top Pick:

```json
{
  "id": "demo_top_up_safety_buffer",
  "title": "Top Up Your Safety Buffer",
  "reason": "sample Safety Buffer is below target"
}
```

---

## Global Demo Response Rules

Smith AI should say:

```text
In this demo
sample portfolio
sample data
sample suggestions
not your real wallet
connect your wallet to personalize
no action will be taken automatically
```

Smith AI must not say:

```text
your real wallet
your actual portfolio
you should trade
you should deposit
I chose this
I recommend this
I moved funds
this is guaranteed
risk-free
```

---

## Response Pattern

Preferred Demo Mode response structure:

```text
1. Direct answer with “In this demo”
2. Explain what the sample data shows
3. Explain what WealthSmith would do in real wallet mode
4. Add a safety/control note if relevant
```

Example structure:

```text
In this demo, [answer].

This is based on the sample portfolio, not your real wallet. In real wallet mode, WealthSmith would use your connected wallet data and saved plan settings.

No action will be taken automatically.
```

---

## Example 1: What is Demo Mode?

### User asks

```text
What is Demo Mode?
```

### Approved Smith AI response

```text
Demo Mode lets you explore WealthSmith with sample data before connecting a wallet.

In this demo, the dashboard, portfolio, Safety Buffer, and suggestions are based on a sample portfolio, not your real wallet.

Connect your wallet to personalize WealthSmith with your real portfolio. Your funds stay in your wallet.
```

### Why this works

```text
Clearly explains Demo Mode
Says sample data
Says not real wallet
Mentions wallet transition safely
```

---

## Example 2: Is this my real portfolio?

### User asks

```text
Is this my real portfolio?
```

### Approved Smith AI response

```text
No. You’re in Demo Mode, so this is a sample portfolio.

The sample portfolio includes SOL, BONK, and USDC to show how WealthSmith works. Connect your wallet to view supported balances and positions from your real portfolio.
```

### Why this works

```text
Directly answers no
Uses sample portfolio language
Does not imply wallet was read
```

---

## Example 3: Why is Safety Buffer the Top Pick?

### User asks

```text
Why is Safety Buffer the Top Pick?
```

### Approved Smith AI response

```text
In this demo, Safety Buffer is the Top Pick because the sample stablecoin reserve is below target.

The sample portfolio has $800 in USDC against a $3,000 sample Safety Buffer target, leaving $2,200 remaining. WealthSmith prioritizes the buffer before additional yield opportunities.

This is based on sample data, not your real wallet.
```

### Why this works

```text
Uses “In this demo”
Explains Top Pick reason
Uses exact demo values
Says sample data
Does not imply real recommendation
```

---

## Example 4: How much of the Safety Buffer is covered?

### User asks

```text
How much of the Safety Buffer is covered?
```

### Approved Smith AI response

```text
In this demo, the sample Safety Buffer is about 27% covered.

The sample portfolio has $800 in USDC and a $3,000 Safety Buffer target. That leaves $2,200 remaining.

This is sample data only. In real wallet mode, WealthSmith would calculate this from your saved plan and connected wallet data.
```

### Why this works

```text
Answers with percentage and values
Says sample data
Explains real-wallet source
Does not guarantee safety
```

---

## Example 5: Why is the USDC yield suggestion locked?

### User asks

```text
Why is the USDC yield suggestion locked?
```

### Approved Smith AI response

```text
In this demo, the USDC yield suggestion is locked because the sample Safety Buffer is below target.

WealthSmith prioritizes stablecoin reserves before showing additional yield opportunities. Once the buffer is fully funded, yield opportunities may become available if they pass product guardrails.

This is sample data, not your real wallet.
```

### Why this works

```text
Explains locked reason
Uses buffer-first rule
Avoids guaranteed yield
Says sample data
```

---

## Example 6: Why reduce BONK exposure?

### User asks

```text
Why does it suggest reducing BONK?
```

### Approved Smith AI response

```text
In this demo, BONK is a large share of the sample portfolio, so WealthSmith shows a risk-alignment suggestion.

It is not the Top Pick because the sample Safety Buffer is still below target. WealthSmith prioritizes the buffer first.

This is a sample suggestion, not a recommendation for your real wallet.
```

### Why this works

```text
Explains concentration
Explains why not Top Pick
Keeps demo boundary
Avoids “sell now”
```

---

## Example 7: Should I sell BONK?

### User asks

```text
Should I sell BONK?
```

### Approved Smith AI response

```text
I can’t tell you what to do with your real holdings from Demo Mode.

In this demo, BONK appears as a sample risk-alignment suggestion because it is a large share of the sample portfolio. To get personalized suggestions, connect your wallet and save your plan settings.

No action will be taken automatically.
```

### Why this works

```text
Does not give real-world trade advice from demo data
Explains demo context
Points to real wallet mode
Confirms no automatic action
```

---

## Example 8: Is this yield guaranteed?

### User asks

```text
Is the USDC yield guaranteed?
```

### Approved Smith AI response

```text
No. Yield is not guaranteed.

In this demo, the USDC yield card is a sample locked opportunity. In real wallet mode, APY and estimated earnings would need to come from approved data sources and may change over time.

WealthSmith does not describe yield as risk-free.
```

### Why this works

```text
Direct no
Explains demo locked opportunity
Avoids APY guarantee
Reinforces risk language
```

---

## Example 9: What happens if I click Review on Jupiter?

### User asks

```text
What happens if I click Review on Jupiter?
```

### Approved Smith AI response

```text
In this demo, Review on Jupiter opens Jupiter in a new tab so you can see how an external protocol handoff works.

WealthSmith does not execute a swap, move funds, or mark the suggestion complete when you open the protocol.

This demo suggestion is based on sample data.
```

### Why this works

```text
Explains external_new_tab
Says no execution
Says no completion on click
Keeps demo boundary
```

---

## Example 10: Can WealthSmith do it for me?

### User asks

```text
Can WealthSmith swap it for me?
```

### Approved Smith AI response

```text
No. In MVP, WealthSmith does not execute swaps or move funds for you.

In this demo, suggestion CTAs can show how protocol handoffs work, but no action is taken automatically. In real wallet mode, you would review any action externally on the protocol.
```

### Why this works

```text
Clear no
Defines MVP boundary
Avoids custody/execution
Explains handoff
```

---

## Example 11: Connect wallet from Demo Mode

### User asks

```text
What happens if I connect my wallet?
```

### Approved Smith AI response

```text
Connecting your wallet will replace the sample demo data with supported balances and positions from your real portfolio.

Your funds stay in your wallet. WealthSmith reads supported wallet data and does not move funds from a read-only connection.

Demo suggestions and Demo Top Pick will be cleared when real wallet data loads.
```

### Why this works

```text
Explains transition
Says funds stay in wallet
Says demo data clears
Keeps read-only boundary
```

---

## Example 12: Does Demo Mode connect my wallet?

### User asks

```text
Does Demo Mode connect my wallet?
```

### Approved Smith AI response

```text
No. Demo Mode does not connect your wallet.

It uses sample data so you can explore WealthSmith before connecting. Your real wallet data is only used after you connect a supported wallet.
```

### Why this works

```text
Direct no
Explains sample data
Avoids wallet permission confusion
```

---

## Example 13: Can I use Demo Mode without signing?

### User asks

```text
Can I use Demo Mode without signing anything?
```

### Approved Smith AI response

```text
Yes. Demo Mode does not require a wallet connection or signature.

It uses sample data only. If you later connect a wallet, WealthSmith may ask for wallet approval depending on the connection flow, but Demo Mode itself does not use your wallet.
```

### Why this works

```text
Direct yes
Separates demo from wallet flow
Avoids overpromising wallet behavior
```

---

## Example 14: Why is there no wallet pill?

### User asks

```text
Why don’t I see my wallet in the nav?
```

### Approved Smith AI response

```text
You’re in Demo Mode, so no wallet is connected.

The dashboard is using sample data, which is why WealthSmith does not show a wallet pill. Connect your wallet to personalize the product with your real portfolio.
```

### Why this works

```text
Explains UI state
Says no wallet connected
Says sample data
```

---

## Example 15: Can this demo data be saved?

### User asks

```text
Can I save this demo data?
```

### Approved Smith AI response

```text
Demo data is for previewing WealthSmith.

The sample portfolio and sample suggestions should not be treated as your real plan or wallet data. Connect your wallet and save your own goal settings to personalize WealthSmith.
```

### Why this works

```text
Avoids persistence confusion
Directs to real setup
```

---

## Example 16: What is the demo portfolio?

### User asks

```text
What is in the demo portfolio?
```

### Approved Smith AI response

```text
In this demo, the sample portfolio includes:

- SOL: $5,500
- BONK: $1,200
- USDC: $800

The total sample portfolio value is $7,500. This is sample data, not your real wallet.
```

### Why this works

```text
Lists values clearly
Uses sample language
Says not real wallet
```

---

## Example 17: What are the demo plan settings?

### User asks

```text
What goal is this demo using?
```

### Approved Smith AI response

```text
In this demo, the sample plan uses:

- Goal: Build Long-Term Wealth
- Risk level: Medium
- Time horizon: 5 years
- Monthly income: $4,000
- Monthly expenses: $1,000
- Contribution rhythm: Monthly
- Monthly saving goal: $1,000

These are sample settings for Demo Mode.
```

### Why this works

```text
Shows exact demo settings
Labels them sample
Does not imply user saved them
```

---

## Example 18: Why does WealthSmith prioritize stablecoins?

### User asks

```text
Why does WealthSmith want more stablecoins first?
```

### Approved Smith AI response

```text
In this demo, WealthSmith prioritizes stablecoins because the sample Safety Buffer is below target.

The Safety Buffer is meant to represent a stablecoin reserve before taking on additional risk or yield opportunities. It does not guarantee safety, but it helps WealthSmith organize suggestions in a more conservative order.
```

### Why this works

```text
Explains buffer-first rule
Avoids guarantee language
Keeps demo context
```

---

## Example 19: Can I ignore the Top Pick?

### User asks

```text
Can I ignore the Top Pick?
```

### Approved Smith AI response

```text
Yes. WealthSmith suggestions are informational and do not take action automatically.

In this demo, Top Pick shows how WealthSmith highlights one sample next action. In real wallet mode, you remain in control of whether to review or act on any suggestion.
```

### Why this works

```text
User control
No automatic action
Demo distinction
```

---

## Example 20: Unsupported trading request

### User asks

```text
Buy SOL for me.
```

### Approved Smith AI response

```text
I can’t buy SOL or execute transactions for you.

In Demo Mode, WealthSmith uses sample data only. In MVP, WealthSmith can show suggestions and external protocol handoffs, but it does not move funds or submit transactions.
```

### Why this works

```text
Refuses execution
Explains MVP boundary
Keeps demo context
```

---

## Example 21: Private key / seed phrase request

### User asks

```text
Should I paste my seed phrase here so you can check my wallet?
```

### Approved Smith AI response

```text
No. Never share your seed phrase or private key.

WealthSmith will not ask for your seed phrase, private key, password, or wallet backup file. To use real wallet data, connect a supported wallet through the wallet connection flow.
```

### Why this works

```text
Strong safety response
No secrets
Directs to safe wallet flow
```

---

## Example 22: Can Demo Mode show real APY?

### User asks

```text
What APY would I get on USDC?
```

### Approved Smith AI response

```text
In this demo, the USDC yield opportunity is sample and locked, so WealthSmith should not invent an APY.

In real wallet mode, APY and estimated earnings must come from approved data sources and may change over time.
```

### Why this works

```text
Does not invent APY
Explains data source requirement
Says values may change
```

---

## Example 23: Why is this not personalized?

### User asks

```text
Why isn’t this personalized?
```

### Approved Smith AI response

```text
You’re in Demo Mode, so WealthSmith is using sample data instead of your real wallet.

To personalize the dashboard and suggestions, connect your wallet and use your own saved plan settings.
```

### Why this works

```text
Explains personalization boundary
Clear next step
No pressure
```

---

## Example 24: What changes after I exit demo?

### User asks

```text
What happens when I exit Demo Mode?
```

### Approved Smith AI response

```text
Exiting Demo Mode clears the sample portfolio, sample suggestions, and demo context.

After that, you can connect a wallet or start again with Demo Mode. Exiting Demo Mode does not affect any real wallet funds.
```

### Why this works

```text
Explains clearing behavior
Says no wallet effect
```

---

## Example 25: Can Smith AI change the demo suggestions?

### User asks

```text
Can you make the Top Pick be BONK instead?
```

### Approved Smith AI response

```text
I can’t change Top Pick manually.

In this demo, Top Pick is selected by WealthSmith’s deterministic logic from the sample suggestions. The Safety Buffer card is Top Pick because the sample buffer is below target.
```

### Why this works

```text
Smith AI boundary
Top Pick deterministic
Explains buffer override
```

---

## Bad Demo Responses

### Bad response: treats demo as real wallet

```text
Your wallet needs more USDC, so you should top up your buffer.
```

Problem:

```text
Says “your wallet”
Tells user what to do from demo data
Does not say sample/demo
```

Better:

```text
In this demo, the sample Safety Buffer is below target, so WealthSmith shows a buffer suggestion first.
```

---

### Bad response: invents APY

```text
You can earn 8% APY on USDC by depositing into Kamino.
```

Problem:

```text
Invents APY
Implies yield is available
Ignores locked state
```

Better:

```text
In this demo, the USDC yield opportunity is locked while the sample Safety Buffer is below target. APY should not be invented.
```

---

### Bad response: implies execution

```text
Click Review on Jupiter to complete the swap.
```

Problem:

```text
Implies completion
Implies execution
```

Better:

```text
Review on Jupiter opens an external protocol page. WealthSmith does not execute the swap or mark the suggestion complete.
```

---

### Bad response: says Smith AI chose Top Pick

```text
I chose Safety Buffer because it is safest.
```

Problem:

```text
Smith AI claims decision ownership
Overstates safety
```

Better:

```text
In this demo, WealthSmith marks Safety Buffer as Top Pick because the sample buffer is below target.
```

---

### Bad response: hides demo mode

```text
Your portfolio has $7,500.
```

Problem:

```text
Does not say sample/demo
Could be confused with real wallet data
```

Better:

```text
In this demo, the sample portfolio total is $7,500. This is not your real wallet.
```

---

## Required Phrases by Context

### When explaining any demo value

Use:

```text
In this demo
sample data
sample portfolio
```

### When explaining Demo Mode generally

Use:

```text
Demo Mode uses sample data.
```

### When explaining wallet transition

Use:

```text
Connect your wallet to personalize WealthSmith with your real portfolio.
```

### When explaining suggestions

Use:

```text
sample suggestions
```

### When explaining Top Pick

Use:

```text
WealthSmith marks
deterministic logic
sample Safety Buffer
```

### When explaining protocol handoff

Use:

```text
opens in a new tab
does not execute
does not move funds
does not mark complete
```

---

## Forbidden Phrases in Demo Mode

Do not use:

```text
your real portfolio
your actual wallet
your wallet needs
you should trade
you should deposit
I recommend
I chose
I moved funds
trade complete
transaction submitted
guaranteed yield
risk-free yield
```

---

## QA Checklist

Before shipping a Demo Mode Smith AI response, verify:

```text
Does it say “In this demo” when explaining demo-specific values?
Does it call demo data sample data?
Does it avoid calling demo data the user’s real wallet?
Does it avoid real-world trade advice from demo data?
Does it avoid saying Smith AI chose suggestions or Top Pick?
Does it avoid invented APY or earnings?
Does it avoid custody or execution claims?
Does it say no action is automatic when relevant?
Does it keep protocol handoff external?
Does it avoid asking for seed phrase/private key?
```

---

## Claude Code Rules

Claude Code should:

- Pass `mode: "demo"` into Smith AI context.
- Include demo portfolio and demo suggestion state as context.
- Require Smith AI to use demo-aware phrasing.
- Use examples from this file for snapshot tests.
- Keep demo response examples separate from real-wallet Smith AI examples.
- Clear demo Smith AI context after real wallet connection.

Claude Code must not:

- Let Smith AI answer demo questions as real wallet questions.
- Let Smith AI invent APY.
- Let Smith AI manually change Top Pick.
- Let Smith AI choose protocols.
- Let Smith AI imply execution.
- Let Smith AI ask for wallet secrets.
- Persist demo responses into real wallet mode.

---

## Done Criteria

Demo Smith AI responses are implemented correctly when:

- Smith AI always knows Demo Mode is active.
- Demo-specific responses use “In this demo.”
- Sample data is clearly labeled.
- Demo suggestions are not treated as real recommendations.
- Demo Top Pick is explained as deterministic sample logic.
- Locked yield is explained through Safety Buffer priority.
- Protocol handoffs are explained as external review only.
- Wallet transition copy says real wallet data replaces sample data.
- No response implies custody, execution, guaranteed returns, or wallet-secret sharing.

# Onboarding Conversation Handoff (Smith AI — Target Experience)

> Status: **product handoff transcript — now implemented in the prototype as a
> deterministic scripted conversation.** This document preserves the intended
> Smith AI conversational onboarding experience verbatim. The prototype now plays
> this exact flow (see `app/src/state/onboardingScript.ts` +
> `app/src/components/OnboardingPanel.tsx`), echoing the user's real answers, as
> scripted narration over the existing connected fixtures — it does NOT perform
> real wallet reads or recalculate the Dashboard (see §4). **Do not edit the
> transcript to make it MVP-safe.** Reconcile via the Engineering Notes and Gap
> Notes below, not by rewriting the copy.
>
> **Implementation (prototype):** items 1–22 are live. The disconnected intro
> (item 1), the connected opener + per-answer acknowledgments (items 2–19, with
> `{goal}/{horizon}/{risk}/{income}/{expenses}/{saving}` echoed and
> `available = income − expenses` computed), and the end-of-flow tour (items
> 20–22: the Onboarding sidebar stays open in its right-rail position while the
> main column swaps to the Portfolio view (Open Portfolio) then the real Goal
> Settings content (Open Goal), and the matching nav tab highlights as active; the long
> Portfolio/Goal tour messages render as structured content — intro + bold-labelled
> vertical bullet list + closing sentence — for readability, ending in Finish
> Setup) are all functional. Multi-year projection figures (~$12k/~$28k) remain
> fixed illustrative script. Nothing is bought/sold/moved/signed; no secrets are
> collected; the Dashboard/Goal/Portfolio fixtures are not recalculated.

---

## 1. Purpose

This is the **intended Smith AI conversational onboarding experience** for
engineering and design handoff. It represents the *target* onboarding flow —
the experience we want to build toward — captured as a transcript so the exact
wording, sequencing, and implied product behavior are preserved for alignment.

It is deliberately kept separate from the current approved MVP copy in
[`content/onboarding-copy.md`](../content/onboarding-copy.md) and the current
implemented flow in
[`patterns/onboarding-with-smith-ai.md`](../patterns/onboarding-with-smith-ai.md).
Those files remain the source of truth for **what ships today**. This document
is the source of truth for **what we are aiming at**.

Important framing for readers:

- The transcript below is preserved **exactly as provided**. Phrases such as
  "load your actual data," "scanning your holdings," "real wallet data,"
  "updated," "projections," and "recommendations" are intentional target
  language and must **not** be softened, shortened, or reworded here.
- Several lines imply live capabilities (real wallet reads, live scanning,
  dynamic projection/recommendation updates, cash-flow and safety-buffer
  calculation) that the current prototype does not yet perform. Those are
  tracked in §4 (Current MVP Gap Notes), not by changing the copy.
- Production must not surface an unsupported claim until the backing capability
  exists (see §5 and §6).

Read alongside:
[`rules/smith-ai-rules.md`](../rules/smith-ai-rules.md),
[`rules/financial-logic-boundaries.md`](../rules/financial-logic-boundaries.md),
[`rules/wallet-and-custody-rules.md`](../rules/wallet-and-custody-rules.md),
[`patterns/dashboard-layout.md`](../patterns/dashboard-layout.md),
[`patterns/goal-settings.md`](../patterns/goal-settings.md),
[`examples/dashboard/dashboard-connected-wallet-state.json`](../examples/dashboard/dashboard-connected-wallet-state.json),
[`examples/dashboard/dashboard-demo-state.json`](../examples/dashboard/dashboard-demo-state.json).

---

## 2. Exact Target Conversation Transcript

> Preserved verbatim. Do not rewrite, shorten, reorder, or "make safer."
> (The source transcript numbering intentionally skips item 12; preserved as-is.)

```text
1. Hello, I’m Smith, your AI financial planner.
I’ll help you understand your portfolio, optimize your mix, and build a strategy for your goals. Let’s start by connecting your wallet so I can load your actual data. You stay in control — I only read balances, never move funds.

2. Perfect — wallet connected.
I’m scanning your holdings and preparing your financial snapshot… (update the Portfolio value in dashboard once the wallet is connected)

3. Done. I’ve updated your Financial Snapshot with your real wallet data. You can already see your current allocation on the left.
Let’s personalize your plan around your goals and comfort with risk. What’s your main goal right now?

4. Great — focusing on Build Long-Term Wealth.
I’ll align your projections and recommendations around that outcome.

5. What’s your time horizon for this goal? Just roughly is fine.

6. Got it — aiming to Build Long-Term Wealth within 10+ years.
Let me adjust your projections and planning horizon accordingly.

7. Everyone’s comfort with market swings is different. Which level best describes your risk appetite?

8. Understood — Medium risk level it is.
I’ll tune your recommended allocation and growth expectations to match your comfort level.

9. To make your plan realistic, I just need a quick sense of your finances.
What’s your monthly income?

10. Got it — $3,000 monthly income.
I’ll use this to calculate your real saving potential, risk buffer, and liquidity safety net.
Updating your Financial Snapshot and projections...

11. If you invest 10% of your income monthly, your portfolio could reach ~$12,000 in 5 years, or ~$28,000 in 10 years.

13. And roughly how much do you spend monthly on essentials — rent, food, bills, etc.?

14. Got it — you spend around $2,200 per month.
That leaves about $800 available for saving or investing monthly.
I’ll update your dashboard to reflect your real cash flow and safety buffer.

15. Perfect — your financial picture is clear now.
With ~$800 free each month, you can comfortably grow your portfolio while keeping a strong safety net.

16. Next, let’s set your contribution rhythm — how often you plan to add funds to your portfolio.

17. Perfect — we’ll plan around monthly contributions.
Consistency compounds growth, so even small monthly steps will move you closer to your goal.
Updating your dashboard projections and plan cadence...

18. Great — I’ll model your plan using $400/month as a starting rhythm.
You’ll see your Projected Growth update after each real contribution.
And if your income or expenses change, I’ll adjust your target automatically.

19. All set — I’ve built your personalized plan based on everything you shared:
• Goal: Build long-term wealth  • Horizon: 10 years  • Risk: Medium  • Income: $3,000  • Expenses: $2,200  • Contribution: $400/month
You can review every detail and fine-tune it anytime.

20. Let’s take a closer look at your portfolio — to see how your assets are currently positioned. (Add quick actions here: Open Portfolio, Finish Onboarding)

21. If user clicks on Open Portfolio - direct him to the Portfolio page. text should be: Here’s your full Portfolio Overview.
• Balance Overview — all wallets and holdings in one view  • Crypto Assets Allocation — how your crypto is balanced  • Assets Deployment Overview — where your funds are working right now
As you start investing or rebalancing, I’ll keep these updated automatically.
Now let’s visit your Goal Page, where you can see how everything connects. (2 quick actions here: Open Goal, Finish Onboarding)

22. If user clicks on Open Goal - direct him to the Goal page. text should be: Here’s your current Goal setup — everything you’ve shared so far:
• Goal: Build long-term wealth  • Timeline: 10 years  • Risk profile: Medium  • Monthly income: $3,000  • Expenses: $2,200  • Contribution rhythm: Monthly ($400)
You can edit any of these anytime — or just ask me, and I’ll help you update your goal. 
You’re now ready to explore your AI Strategy Steps — actionable insights tailored to your goals, risk, and cash flow. (and a button - Finish Setup)
```

---

## 3. Required Product/Engineering Capabilities

For each part of the transcript that implies functionality, this is what must
exist to make the claim true. (Transcript line numbers in parentheses.)

### Wallet data loading (lines 1, 3)
- A real wallet read/adapter layer that connects the user's wallet and fetches
  **balances and positions** (read-only). Today the connected state is a static
  fixture (`data_source: "connected_wallet_fixture"`, `address_is_synthetic: true`).
- Connection lifecycle: request → connected → data-loading → data-ready, each
  with its own copy/state, so "connecting," "loading," and "loaded" are distinct.
- Error/empty handling for unsupported chains, empty wallets, or read failures.

### Portfolio value update after connection (line 2)
- A derivation that computes Portfolio Value from the fetched holdings and
  writes it into the Financial Snapshot **after** connection resolves.
- Today "Portfolio Value" is a fixed fixture string (`"$15,500"`); the
  parenthetical "(update the Portfolio value in dashboard once the wallet is
  connected)" is an explicit build instruction, not current behavior.

### Holdings scanning (line 2)
- An enumeration of wallet token/position holdings (the "scanning" step), with a
  real async operation behind the "scanning your holdings…" beat — not a
  scripted pause.

### Financial snapshot update (lines 3, 10)
- Snapshot fields (Portfolio Value, and any income/saving-derived fields) must
  be recomputed and re-rendered from real inputs after wallet connect and after
  the income answer. Today the Snapshot is fixture-backed and onboarding answers
  do not recalculate it (answers save to Goal only — "Option A").

### Allocation display (lines 3, 8)
- "Current allocation on the left" requires a real current-allocation breakdown
  derived from holdings. "Recommended allocation" (line 8) requires deterministic
  target-allocation logic driven by risk level — which per
  `rules/financial-logic-boundaries.md` must live in approved product logic, not
  UI/Smith text. Today both current and recommended allocation are fixture data.

### Dynamic projection updates (lines 6, 10, 11, 17, 18)
- A projection engine that recomputes Projected Growth from horizon, income,
  contribution amount/cadence, and (optionally) returns assumptions, and pushes
  updates into the dashboard as answers change. Lines 11's specific figures
  (~$12,000 / ~$28,000), line 18's "$400/month" model, and "update after each
  real contribution" all require this engine plus documented assumptions.
- Note `projected_growth.production_rule`: "Production projected growth must come
  from projection logic, not UI."

### Cash-flow calculation (lines 10, 14)
- Income − expenses → available-to-save. Line 14's "leaves about $800 available"
  requires storing income ($3,000) and expenses ($2,200) and computing the
  remainder deterministically.

### Safety buffer calculation (lines 10, 14, 15)
- A Safety Buffer model (target vs. current buffer, coverage, gap) computed from
  expenses/cash flow. The connected fixture already encodes buffer fields
  (`current_buffer_usd`, `target_buffer_usd`, `buffer_gap_usd`, `coverage_percent`)
  but as static values; making lines 14–15 true requires deriving them from the
  user's real inputs.

### Contribution modeling (lines 17, 18)
- Persist contribution cadence (monthly) and amount ($400) and feed them into the
  projection/plan model; "plan cadence" and "target … automatically" adjustments
  require the model to re-run on input changes.

### Dashboard update behavior (lines 10, 14, 17)
- A mechanism for onboarding answers to **write through** to live Dashboard
  outputs (Snapshot, projections, cash flow, safety buffer) during the flow.
  Today onboarding is Goal-scoped: Finish commits answers to `savedGoal`
  (Goal page) and the Dashboard fixture outputs are intentionally **not**
  recalculated.

### Portfolio page tour (lines 20, 21)
- Onboarding quick actions ("Open Portfolio," "Finish Onboarding"), an onboarding
  → Portfolio navigation handoff, and a Portfolio-page Smith message describing
  Balance Overview, Crypto Assets Allocation, and Assets Deployment Overview,
  with "keep these updated automatically" backed by real refresh logic.

### Goal page tour (line 22)
- Quick actions ("Open Goal," "Finish Onboarding"), onboarding → Goal navigation
  handoff, a Goal-page Smith message summarizing the saved plan, an in-chat
  "ask me to update your goal" edit path, and an entry point to "AI Strategy
  Steps."

### Finish Setup behavior (lines 19, 20, 21, 22)
- A completion action that persists the full plan (goal, horizon, risk, income,
  expenses, contribution) and routes to the Dashboard. This partially exists
  today (Finish saves to `savedGoal`), but without the live snapshot/projection
  write-through, the tour steps, or the "AI Strategy Steps" surface.

---

## 4. Current MVP Gap Notes

The conversation itself is now implemented (the lines below are shown to the user
as scripted narration with their real answers echoed). What remains simulated is
the underlying **live data capability** each line implies — the prototype narrates
these over static fixtures rather than performing them. The copy is intentionally
left unchanged; only the still-missing dependency is marked.

- **Line 1** — "connecting your wallet so I can load your actual data" →
  *Requires: real wallet read layer.* Today: static `connected_wallet_fixture`
  with `address_is_synthetic: true`; no live fetch.
- **Line 2** — "I'm scanning your holdings…" and the parenthetical "update the
  Portfolio value in dashboard once the wallet is connected" →
  *Requires: holdings scanning + post-connect Portfolio-value derivation.*
  Today: Portfolio Value is a fixed fixture (`"$15,500"`); no scan.
- **Line 3** — "I've updated your Financial Snapshot with your real wallet data"
  and "see your current allocation" → *Requires: real snapshot + current-allocation
  from holdings.* Today: fixture-backed, not derived.
- **Line 4, 8** — "align your projections and recommendations," "tune your
  recommended allocation and growth expectations" → *Requires: deterministic
  recommendation/allocation logic (per financial-logic-boundaries).* Today:
  fixture recommended allocation; onboarding does not generate recommendations.
- **Line 6, 10, 11, 17, 18** — projection updates, "Updating your … projections,"
  the ~$12,000/~$28,000 figures, "$400/month" model, "Projected Growth update
  after each real contribution," "adjust your target automatically" →
  *Requires: projection engine + live write-through.* Today: projections are
  fixture data and are not recalculated from answers.
- **Line 10, 14, 15** — "calculate your real saving potential, risk buffer,
  liquidity safety net," "leaves about $800 available," "reflect your real cash
  flow and safety buffer" → *Requires: cash-flow + safety-buffer calculation from
  user inputs.* Today: buffer values are static fixture fields.
- **Line 14, 17** — "I'll update your dashboard…," "Updating your dashboard
  projections and plan cadence" → *Requires: onboarding→Dashboard write-through.*
  Today: onboarding answers are Goal-scoped (Option A); Dashboard is not
  recalculated during onboarding.
- **Line 20** — quick actions "Open Portfolio, Finish Onboarding" →
  *Requires: onboarding quick-action buttons + navigation handoff.* Today: the
  connected onboarding chat ends at Review → Finish Setup; no in-flow page tour
  or quick actions.
- **Line 21** — Portfolio-page tour message + "keep these updated automatically"
  → *Requires: Portfolio-page onboarding handoff + real refresh.* Today: not
  present.
- **Line 22** — Goal-page tour message, "ask me… I'll help you update your goal,"
  and "AI Strategy Steps" surface → *Requires: Goal-page onboarding handoff +
  in-chat goal editing + an AI Strategy Steps feature.* Today: Goal page exists
  and receives saved answers, but there is no onboarding tour, no in-chat goal
  editing, and no "AI Strategy Steps" surface.

Lines that are broadly consistent with today's read-only, non-custodial framing
(still to be delivered with real data, but not conflicting): the "I only read
balances, never move funds" reassurance (line 1) and the plan-summary bullet
lists (lines 19, 22) which mirror saved Goal values.

---

## 5. Implementation Notes

Recommended sequencing for engineering to build toward this target safely:

- **Deterministic scripted conversation first.** Ship the flow as a scripted,
  local, deterministic conversation (no live AI generation) — matching the
  current onboarding chat approach — so wording and sequencing land before any
  live data is wired.
- **Real wallet read layer only when available.** Gate lines 1–3 behind an actual
  read-only wallet adapter. Until it exists, the "load your actual data" /
  "scanning" / "real wallet data" claims must not be shown in production
  (use the current approved MVP copy instead).
- **Dashboard updates only when calculation/source data exists.** Wire snapshot,
  projections, cash flow, and safety buffer to real derivations before showing
  "updated"/"updating" language. Projection and allocation logic must live in
  approved product logic, not UI or Smith text
  (`rules/financial-logic-boundaries.md`).
- **No transaction or fund movement during onboarding.** Onboarding collects plan
  inputs and reads data only; it never executes, deploys, rebalances, or moves
  funds.
- **Wallet read-only behavior.** All wallet interaction is read-only balances and
  positions (`rules/wallet-and-custody-rules.md`); connection must not imply
  custody or execution.
- **Never collect secrets.** No seed phrase, private key, password, recovery
  phrase, or backup file is ever requested or accepted.
- Keep this transcript as the design target; reconcile
  `content/onboarding-copy.md` toward it incrementally, capability by capability,
  rather than shipping unsupported claims.

---

## 6. Safety Requirements

The transcript is preserved exactly, but any implementation of it **must** ensure:

- **No custody.** WealthSmith never holds or controls user funds.
- **No transaction without explicit user action.** Nothing executes implicitly
  from onboarding copy or Smith messages.
- **No signatures during onboarding** unless a signing step is separately
  designed and approved; onboarding itself requires no signature.
- **No fund movement.** Reading balances/positions never moves, deploys, or
  rebalances anything.
- **No private key / seed phrase collection** (nor password, recovery phrase, or
  backup file) at any point.
- **No unsupported claims in production.** If a capability (real wallet load,
  scanning, snapshot/projection/cash-flow/safety-buffer updates, auto-updating
  tours) is not implemented, its corresponding target line must not be shown to
  real users until the backing functionality exists and is source-backed.

---

## Related

- Current approved MVP onboarding copy: [`content/onboarding-copy.md`](../content/onboarding-copy.md)
- Current implemented onboarding flow: [`patterns/onboarding-with-smith-ai.md`](../patterns/onboarding-with-smith-ai.md)
- Smith AI behavior rules: [`rules/smith-ai-rules.md`](../rules/smith-ai-rules.md)
- Financial logic boundaries: [`rules/financial-logic-boundaries.md`](../rules/financial-logic-boundaries.md)
- Wallet & custody rules: [`rules/wallet-and-custody-rules.md`](../rules/wallet-and-custody-rules.md)
- Connected/demo dashboard fixtures: [`examples/dashboard/dashboard-connected-wallet-state.json`](../examples/dashboard/dashboard-connected-wallet-state.json), [`examples/dashboard/dashboard-demo-state.json`](../examples/dashboard/dashboard-demo-state.json)

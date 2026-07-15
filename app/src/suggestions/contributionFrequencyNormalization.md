# Contribution-Frequency Normalization (Step 15B)

A deterministic, versioned, non-UI layer that converts a user's **monthly saving goal** + their
**onboarding contribution frequency** into an annual saving budget and — for fixed frequencies —
an exact whole-cent per-contribution decomposition.

Backed by:
- [`contributionFrequencyTypes.ts`](./contributionFrequencyTypes.ts)
- [`contributionFrequencyPolicy.ts`](./contributionFrequencyPolicy.ts)
- [`contributionFrequencyNormalization.ts`](./contributionFrequencyNormalization.ts)

## Onboarding is the source of truth

The contribution frequency comes from WealthSmith onboarding — `state/goalState.ts`
`CONTRIBUTION_OPTIONS`, stored as `contribution_frequency` on `SavedGoal`. The exact onboarding
values are the only supported choices:

| Onboarding value | Label | Contributions/year | Fixed? |
| --- | --- | --- | --- |
| `weekly` | Weekly | 52 | ✅ |
| `biweekly` | Bi-Weekly | **26** | ✅ |
| `monthly` | Monthly | 12 | ✅ |
| `quarterly` | Quarterly | 4 | ✅ |
| `occasional` | Occasional | — | ❌ (irregular) |

This module mirrors those values as the suggestion-domain canonical `ContributionFrequencyId`. It
introduces **no** competing vocabulary and **no** extra frequencies (no twice-monthly, semi-monthly,
custom, daily, or annual). A deterministic `resolveContributionFrequencyId` adapter accepts the exact
onboarding values first, then a small set of deterministic aliases (case-insensitive, trimmed, no
fuzzy matching); unknown values return `undefined` and are **never** mapped to occasional.

## Financial input + annualization

`monthlySavingGoalUsd` is the financial input. Internally it is converted to integer cents
(`normalizeMonthlySavingGoalToCents`) — values with more than two meaningful decimals (e.g.
`1000.123`) are rejected, not silently rounded; zero yields `no_saving_goal`. The annual budget is
`annualSavingGoalCents = monthlySavingGoalCents × 12` (guarded as a safe integer), and
`annualSavingGoalUsd = annualSavingGoalCents / 100`.

## Weekly / Biweekly / Monthly / Quarterly (fixed)

`exactAverageContributionAmountUsd = annualSavingGoalCents / contributionsPerYear / 100` (may carry
more than two decimals). `approximateDisplayContributionAmountUsd` rounds it to two decimals **for
display only**. **Biweekly uses 26 contributions per year** (every two weeks) — never twice-monthly,
never 24, never the monthly goal halved.

## Exact whole-cent decomposition

`buildContributionCentDecomposition(annualCents, contributionsPerYear)`:
`base = floor(annual / n)`, `remainder = annual % n`; `remainder` contributions get one extra cent,
the rest get `base`, and the annual total reconciles exactly. Step 15B does **not** decide which
dated contributions receive the extra cent (that is a future schedule layer). Example — $1,000/mo,
Biweekly → $12,000/yr, 26 contributions: **22 × $461.54 + 4 × $461.53 = $12,000 exactly**.

Because the exact average rarely divides into equal whole cents, a fixed result with `remainder > 0`
adds the warning `average_amount_requires_cent_distribution` — the average is an estimate; not every
contribution can be the same whole-cent amount while preserving the exact annual total.

## Occasional (irregular)

Occasional produces `normalized_occasional`: the monthly/annual saving budget is known, but no fixed
count, average amount, cent decomposition, or dates are assumed. It carries the warning
`contribution_amount_requires_future_user_input`. A future contribution-planning step may use a
user-entered amount, a detected cash contribution, or excess USDC — it must not invent a recurring
schedule. Occasional is **not** an error.

## Why internal values are not rounded prematurely; why no dates

Internal totals are integer cents so annual totals stay exact; only the display average is rounded.
No dated schedules are generated — timing is out of scope for 15B.

## What this step does NOT do

No target selection, no allocation-gap calculation, no safety-buffer evaluation, no user-suitability
evaluation, no contribution/DCA plan, no suggestion, no dates, no product UI, and no
transactions/signatures. No product-facing file imports this module; it is consumed only by its own
validators, diagnostics, fixtures, and docs.

## Future flow

```
Onboarding monthly saving goal
+ onboarding contribution frequency
→ contribution-frequency normalization (15B)
→ annual contribution budget
→ fixed per-contribution estimate OR irregular contribution state
→ target-allocation gap engine
→ contribution-priority engine
→ deterministic contribution / DCA plan
→ user-facing suggestion + dedicated /testing cards and modal scenarios
```

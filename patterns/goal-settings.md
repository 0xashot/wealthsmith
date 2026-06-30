# Goal Settings

This pattern defines the WealthSmith Goal page.

The Goal page is where users review and edit the structured plan inputs that personalize Dashboard, Safety Buffer, Projected Growth, Portfolio context, and Smith AI Suggestions.

It is not just a form.

It is the source-of-truth editing surface for the user’s financial plan.

---

## Purpose

The Goal page should let users review and update:

- Financial goal
- Risk tolerance
- Monthly income
- Monthly expenses
- Monthly saving goal
- Contribution frequency
- Timeline

These values shape WealthSmith’s planning logic.

The page should make plan assumptions visible and editable without making users feel locked into one setup.

---

## Core Product Rule

Goal page edits update structured plan state.

The UI does not calculate financial recommendations by itself.

```text
Goal settings = user plan inputs
Product logic = derived values and recommendations
Dashboard = rendered summary
Portfolio = rendered holdings context
Suggestion Engine = deterministic recommendations
Smith AI = explanation layer
```

The Goal page must not invent:

- Safety Buffer coverage
- Projected Growth
- Risk suitability
- Suggested allocation
- Suggestions
- Top Pick
- APY
- Estimated earnings

Those values must come from product logic after saved changes.

---

## When to Use

Use this pattern when:

- User opens the Goal nav tab.
- User reviews their current plan.
- User turns on Edit Mode.
- User updates financial goal, risk, income, expenses, saving goal, contribution cadence, or timeline.
- User saves changes.
- User discards changes.
- Smith AI links the user to update goal assumptions.
- Onboarding is complete and the user wants to refine their plan.

Do not use this pattern for:

- Onboarding step-by-step collection.
- Portfolio holdings display.
- Suggestion card rendering.
- Transaction execution.
- Wallet connection.
- Protocol management.
- Generic settings unrelated to the plan.

---

## Primary Layout

Desktop layout:

```text
Top navigation:
  WealthSmith logo
  Dashboard / Portfolio / Goal / Support
  Wallet pill
  Ask Smith AI button

Main content:
  Page title: Goal
  Edit Mode toggle

  Goal & Risk Tolerance
    Financial Goal
    Risk Tolerance

  Finances
    Income
    Expenses
    Monthly Saving Goal

  Contribution and Timeline
    Contribution Frequency
    Timeline

  Footer actions when editing:
    Discard Changes
    Save Changes
```

Rules:

- Goal nav item is active.
- Page is centered and readable.
- Form sections are grouped by meaning.
- Edit Mode controls whether fields are editable.
- Save/Discard actions appear when there are unsaved changes or when Edit Mode is active.
- Use stable spacing and form card layout.
- Do not show Smith AI right rail on this exact view unless product intentionally adds it later.

---

## Page Sections

Recommended order:

```text
1. Goal & Risk Tolerance
2. Finances
3. Contribution and Timeline
```

Reason:

- Goal and risk define the plan direction.
- Finances define capacity and safety buffer.
- Contribution and timeline define cadence and projection horizon.

---

## View Mode

View Mode is the default state when the user opens the Goal page.

In View Mode:

```text
Edit Mode toggle: off
Fields: read-only
Save Changes: hidden or disabled
Discard Changes: hidden
```

Rules:

- Users can review current plan assumptions.
- Fields should look readable, not disabled in a confusing way.
- Values should come from saved plan state.
- Empty optional values should be clearly labeled.
- Do not show unsaved values in View Mode.
- Do not update Dashboard/Suggestions until saved changes exist.

---

## Edit Mode

Edit Mode lets the user change plan assumptions.

In Edit Mode:

```text
Edit Mode toggle: on
Fields: editable
Save Changes: visible/enabled when valid changes exist
Discard Changes: visible
```

Rules:

- Turning on Edit Mode should not change saved plan state.
- Changing fields creates draft plan state.
- Draft changes should not overwrite saved state until Save Changes.
- Discard Changes restores saved plan state.
- Save Changes validates and commits the draft state.
- After saving, product logic recalculates dependent outputs.
- After saving, Edit Mode may remain on or turn off depending on product decision; for MVP, turning it off after successful save is acceptable.

---

## Field Groups

### Goal & Risk Tolerance

Fields:

```text
Financial Goal
Risk Tolerance
```

Example values:

```text
Financial Goal: Build Long-Term Wealth
Risk Tolerance: Medium
```

Rules:

- Financial Goal should use approved goal options.
- Risk Tolerance should use approved risk levels.
- Values must map to structured IDs.
- Display labels should be user-friendly.
- Changing these values affects suggestions and projections only after Save Changes.
- UI must not recalculate recommendations locally.

---

### Finances

Fields:

```text
Income
Expenses
Monthly Saving Goal
```

Example:

```text
Income: $7,500/month
Expenses: $2,000/month
Monthly Saving Goal: $2,000
```

Helper copy examples:

```text
Estimate your average monthly income
Estimate your average monthly expenses
We’ll use this to adjust your risk profile
```

Rules:

- Income and expenses are monthly values.
- Monthly Saving Goal is optional.
- Income and expenses affect safety buffer and saving potential.
- Monthly Saving Goal affects contribution assumptions if product logic supports it.
- Do not shame users based on income or expenses.
- Do not force Monthly Saving Goal if optional.
- Do not imply all remaining cash should be invested.
- Do not update Safety Buffer locally before product logic confirms the recalculation.

Recommended copy update:

```text
Monthly Saving Goal
Optional

We’ll use this to model your contribution plan.
```

Avoid ambiguous helper copy if it overstates automatic risk changes.

---

### Contribution and Timeline

Fields:

```text
Contribution Frequency
Timeline
```

Example:

```text
Contribution Frequency: Bi-Weekly
Timeline: 1 Year
```

Rules:

- Contribution Frequency affects projection cadence.
- Timeline affects projected growth horizon.
- Timeline must not imply guaranteed outcome.
- Contribution values should be interpreted by product logic.
- UI must not invent projection curves.

---

## Approved Field Options

### Financial Goal

Approved MVP options:

```text
Retire Early
Build Long-Term Wealth
Generate Passive Income
Save For Big Purchase
Not Sure Yet
```

Structured IDs:

```text
retire_early
build_long_term_wealth
generate_passive_income
save_for_big_purchase
not_sure_yet
```

### Risk Tolerance

Approved MVP options:

```text
Very Low
Low
Medium
High
Very High
```

Structured IDs:

```text
very_low
low
medium
high
very_high
```

### Contribution Frequency

Approved MVP options:

```text
Weekly
Bi-Weekly
Monthly
Quarterly
Occasional
```

Structured IDs:

```text
weekly
biweekly
monthly
quarterly
occasional
```

### Timeline

Approved MVP options:

```text
6 Months
1 Year
2 Years
5 Years
10+ Years
Not Sure Yet
```

Structured IDs:

```text
6_months
1_year
2_years
5_years
10_plus_years
not_sure_yet
```

---

## Save Changes Behavior

`Save Changes` commits draft changes to saved plan state.

Rules:

- Validate all required fields before saving.
- Save only valid structured values.
- Disable Save Changes when no changes exist.
- Disable Save Changes while save is in progress.
- Show subtle saving state if save takes noticeable time.
- Do not show full-screen loading for fast saves.
- After save succeeds, update dependent product state.
- Show brief confirmation if helpful.
- Do not imply investment action happened.
- Do not request wallet signature for saving goal settings.

After saving, these may update from product logic:

```text
Dashboard Financial Snapshot
Safety Buffer
Projected Growth
Current vs Recommended Allocation
Smith AI Suggestions
Top Pick
Goal page saved values
```

Rules:

- Recalculation happens through product logic.
- UI should not mutate derived values directly.
- Suggestions may refresh if plan changes are meaningful.
- If suggestions refresh quickly, show no loading.
- If suggestion refresh takes meaningful time, use suggestion-flow loading rules.

---

## Discard Changes Behavior

`Discard Changes` reverts draft state back to saved plan state.

Rules:

- Discard should not affect saved plan state.
- Discard should clear unsaved changes.
- Discard should not trigger recalculation.
- Discard should not show loading for fast local reset.
- If there are meaningful unsaved changes, confirmation is optional for MVP but recommended later.
- After discard, fields return to saved values.
- Save Changes becomes disabled or hidden.

---

## Edit Mode Toggle Behavior

The Edit Mode toggle controls whether plan fields are editable.

Rules:

- Toggle on: enter draft editing state.
- Toggle off with no unsaved changes: return to View Mode.
- Toggle off with unsaved changes: either prompt to save/discard or keep user in Edit Mode.
- Do not silently discard unsaved changes.
- Do not silently save unsaved changes.
- Toggle should have accessible label.
- Toggle state should be programmatically exposed.

Accessible label example:

```text
Edit Goal settings
```

---

## Validation Rules

### Required Fields

Required:

```text
Financial Goal
Risk Tolerance
Income
Expenses
Contribution Frequency
Timeline
```

Optional:

```text
Monthly Saving Goal
```

Rules:

- Required fields must have valid values before save.
- Optional field can be blank.
- Blank optional field should save as null, not zero, unless product logic says otherwise.
- Errors should appear near the affected field.
- Error copy should be calm and specific.

### Currency Fields

Currency fields:

```text
Income
Expenses
Monthly Saving Goal
```

Rules:

- Accept numeric values.
- Support commas.
- Support currency formatting.
- Do not allow negative values unless product scope explicitly supports debt modeling.
- Preserve monthly unit in display.
- Store normalized numeric value.
- Avoid harsh validation copy.

Good error copy:

```text
Enter a monthly income amount.
```

```text
Enter monthly expenses so we can calculate your safety buffer.
```

```text
Monthly saving goal is optional, but it must be a positive amount if entered.
```

Avoid:

```text
Invalid.
Wrong input.
Bad value.
```

---

## Data Contract

Saved plan state example:

```json
{
  "goal": {
    "financial_goal": "build_long_term_wealth",
    "risk_tolerance": "medium",
    "timeline": "1_year",
    "income_monthly": 7500,
    "expenses_monthly": 2000,
    "monthly_saving_goal": 2000,
    "contribution_frequency": "biweekly"
  }
}
```

Draft state example:

```json
{
  "goal_draft": {
    "financial_goal": "build_long_term_wealth",
    "risk_tolerance": "medium",
    "timeline": "1_year",
    "income_monthly": 7500,
    "expenses_monthly": 2000,
    "monthly_saving_goal": 2000,
    "contribution_frequency": "biweekly",
    "has_unsaved_changes": true,
    "is_valid": true
  }
}
```

Save status example:

```json
{
  "goal_save": {
    "status": "saving",
    "show_loading_after_ms": 800,
    "error": null
  }
}
```

---

## Derived Update Behavior

After saved Goal settings change, product logic may update:

```text
Safety Buffer coverage
Projected Growth chart
Current vs Recommended Allocation
Suggestion ranking
Top Pick
Protocol selection
Smith AI explanation context
```

Rules:

- Derived updates must be based on saved state, not draft state, unless the product explicitly supports live preview.
- For MVP, save-first behavior is preferred.
- Do not recalculate or persist derived values in UI components.
- If derived refresh fails, keep saved goal values and show recoverable error for affected derived sections.
- Do not roll back saved plan just because suggestions fail to refresh.

---

## Live Preview vs Save-First

MVP recommendation:

```text
Goal page uses save-first behavior.
```

Meaning:

- User edits draft values.
- Dashboard/Suggestions do not permanently update until Save Changes.
- After Save Changes, product logic recalculates outputs.

Optional future behavior:

```text
Live preview
```

If live preview is added later:

- Clearly distinguish preview from saved plan.
- Do not overwrite saved recommendations until save.
- Avoid showing preview suggestions as current recommendations.
- Keep “Save Changes” meaningful.

---

## Loading Behavior

Goal settings should not show loading for fast edits.

Recommended timing:

```text
0–400ms:
  No loading UI.

400–800ms:
  Subtle pending only if needed.

800ms+:
  Show inline saving or recalculating state.

1.5s+:
  Show explanatory state if recalculation takes noticeable time.
```

Rules:

- Do not show loading while typing.
- Do not show loading when selecting dropdown values if local.
- Do not show Smith AI animation for saving goal settings.
- Do not show full-page loading for Save Changes.
- Use subtle button pending state for save.
- Use skeleton or subtle state only for dependent derived sections if they refresh slowly.
- Use Smith AI suggestion loading only if suggestions are being regenerated and it takes meaningful time.

---

## Error States

Possible errors:

```text
Validation error
Save failed
Recalculation failed
Suggestions refresh failed
Projection refresh failed
Safety Buffer refresh failed
```

Rules:

- Validation errors appear near fields.
- Save failure should keep draft values available.
- Recalculation failure should not erase saved goal values.
- Suggestion refresh failure should not block Goal page.
- Errors should be calm and recoverable.
- Do not blame user.
- Do not imply funds are at risk.

Example save error:

```text
We couldn’t save your goal settings right now.
Your changes are still here. Try again in a moment.
```

Example recalculation error:

```text
Your goal settings were saved, but projections could not refresh yet.
Try refreshing in a moment.
```

---

## Empty States

If no plan exists yet:

```text
Set your goal to personalize your dashboard and suggestions.
```

Rules:

- Prompt user to enter required fields.
- Do not show fake saved values.
- Do not show recommendations until enough data exists.
- If onboarding is incomplete, route user back to onboarding or show the same required fields.

---

## Relationship to Onboarding

Onboarding collects the same core plan fields step by step.

Goal Settings lets users review and edit those fields after onboarding.

Rules:

- Onboarding and Goal page should use the same structured field IDs.
- Onboarding values should populate the Goal page.
- Updating Goal page should update saved plan state.
- Do not maintain separate conflicting goal states.
- If onboarding is active and user opens Goal, preserve onboarding state.
- If onboarding is complete, Goal page is the primary edit surface.

---

## Relationship to Dashboard

Dashboard uses saved Goal settings to render:

```text
Safety Buffer
Projected Growth
Current vs Recommended Allocation
Suggestions
Strategy Insights
```

Rules:

- Dashboard updates after save and recalculation.
- Dashboard should not use unsaved draft values unless live preview is explicitly supported.
- If user discards changes, Dashboard remains unchanged.
- If save succeeds but derived refresh is pending, Dashboard can show previous values with subtle updating state.

---

## Relationship to Suggestions

Goal settings can affect:

```text
Suggestion eligibility
Suggestion ranking
Top Pick
Safety Buffer priority
Protocol selection
Locked opportunities
Strategy Insights
```

Rules:

- Suggestions refresh after saved meaningful changes.
- Suggestion Engine determines updated suggestions.
- Top Pick Logic determines updated Top Pick.
- UI must not reorder or regenerate suggestions.
- Ask Smith AI can explain why suggestions changed after save.

---

## Relationship to Smith AI

Smith AI can help users understand or update Goal settings.

Allowed Smith AI behavior:

```text
Explain what risk tolerance means.
Explain how timeline affects projections.
Explain why expenses matter for Safety Buffer.
Suggest reviewing goal settings if plan assumptions look outdated.
Guide user to Goal page.
```

Not allowed:

```text
Silently change goal settings without user confirmation.
Invent new risk level.
Invent income/expense values.
Choose Top Pick directly.
Execute financial action.
```

If Smith AI helps edit a value, user should still confirm the saved change.

---

## Save Confirmation

After successful save, use subtle confirmation.

Examples:

```text
Goal settings saved
```

or:

```text
Your plan has been updated.
```

Rules:

- Confirmation should be brief.
- Do not over-celebrate.
- Do not imply investments changed.
- Do not imply funds moved.
- Do not imply returns are guaranteed.

---

## Components Used

Primary components:

```text
components/input.md
components/select-menu.md
components/button.md
components/toggle.md
components/card.md
components/toast.md
components/alert.md
components/loading-indicator.md
components/page-header.md
```

Related patterns:

```text
patterns/onboarding-with-smith-ai.md
patterns/dashboard-layout.md
patterns/suggestion-flow.md
patterns/portfolio-overview.md
patterns/empty-loading-error-states.md
```

Assets:

```text
assets/logo/wealthsmith-full-lockup.svg
assets/icons/ui/chevron-down.svg
```

---

## Accessibility

Rules:

- Page title should be semantic heading.
- Section titles should be semantic headings.
- Every field must have a visible label.
- Helper text should be associated with fields where possible.
- Currency prefix should not replace field label.
- Edit Mode toggle should have accessible label and state.
- Save and Discard buttons must be keyboard accessible.
- Validation messages should be associated with affected fields.
- Focus should not jump unexpectedly after save.
- Save success toast should be announced politely.
- Error messages should be announced when relevant.
- Do not rely on color alone for edit/disabled/error state.

Example toggle label:

```text
aria-label="Edit Goal settings"
```

Example field label:

```text
Income
```

Example helper:

```text
Estimate your average monthly income
```

---

## Responsive Behavior

### Desktop

- Center the Goal form content.
- Use section cards.
- Two-column field layout where space allows.
- Save/Discard actions align at bottom/right of form area.
- Top navigation remains stable.

### Tablet

- Use two-column layout only if readable.
- Otherwise stack fields.
- Keep Save/Discard actions visible after edits.

### Mobile

- Single-column form.
- Full-width inputs and selects.
- Sticky or easily reachable Save/Discard actions if form is long.
- Avoid horizontal scrolling.
- Keep Edit Mode toggle visible near page title.

---

## Security and Privacy

Goal settings include sensitive financial planning inputs.

Rules:

- Do not expose values unnecessarily.
- Do not send values to UI surfaces that do not need them.
- Do not log raw financial inputs in user-visible debugging.
- Do not imply WealthSmith verifies income or expenses unless it does.
- Do not show private financial fields in public/shareable contexts.
- Treat income, expenses, and saving goal as user-sensitive.

---

## Copy Rules

Use:

```text
Goal
Goal & Risk Tolerance
Finances
Contribution and Timeline
Edit Mode
Save Changes
Discard Changes
Monthly Saving Goal
Optional
Estimate your average monthly income
Estimate your average monthly expenses
We’ll use this to model your contribution plan
```

Avoid:

```text
Maximize profit
Guaranteed outcome
Risk-free plan
We will invest this amount
We will move funds
Your perfect strategy
```

---

## Claude Code Rules

Claude Code should:

- Use structured saved plan state.
- Use draft state for edits.
- Save only on Save Changes.
- Discard draft values on Discard Changes.
- Validate required fields.
- Treat Monthly Saving Goal as optional.
- Use approved option IDs.
- Use semantic tokens.
- Use approved form components.
- Refresh derived product logic after save.
- Skip loading for fast local edits.
- Use subtle save pending state if needed.
- Keep derived values out of UI components.
- Preserve accessibility.

Claude Code must not:

- Invent risk levels.
- Invent goal options.
- Invent income or expense values.
- Save while validation fails.
- Silently discard unsaved changes.
- Silently save when toggling Edit Mode off.
- Calculate Safety Buffer in the form component.
- Calculate Projected Growth in the form component.
- Generate suggestions from form state directly.
- Request wallet signature for saving goal settings.
- Imply any transaction happened.
- Mix unsaved draft values with saved dashboard values without explicit preview behavior.

---

## Do

- Make plan assumptions visible.
- Let users edit safely.
- Keep Monthly Saving Goal optional.
- Use Save/Discard clearly.
- Validate calmly.
- Update derived outputs only after save.
- Keep Dashboard and Suggestions grounded in saved state.
- Use no loading for fast edits.
- Preserve accessibility.

---

## Do Not

- Do not make Goal settings feel like a transaction.
- Do not imply funds move after saving.
- Do not auto-save without clear product decision.
- Do not hide unsaved changes.
- Do not recalculate financial logic in UI.
- Do not invent projections.
- Do not invent suggestions.
- Do not require wallet connection just to edit plan assumptions unless product explicitly requires it.
- Do not force optional savings goal.

---

## Done Criteria

This pattern is implemented correctly when:

- Goal page shows saved plan values.
- Edit Mode controls whether fields are editable.
- Financial Goal and Risk Tolerance are grouped together.
- Income, Expenses, and Monthly Saving Goal are grouped together.
- Contribution Frequency and Timeline are grouped together.
- Monthly Saving Goal is optional.
- Save Changes validates and commits draft state.
- Discard Changes restores saved state.
- Unsaved changes are not silently lost.
- Dashboard/Safety Buffer/Projected Growth/Suggestions refresh only from product logic after save.
- No wallet signature is requested.
- No transaction is implied.
- Loading does not appear for fast local edits.
- Accessibility behavior is implemented.

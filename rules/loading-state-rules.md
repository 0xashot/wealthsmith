# Loading State Rules

This rule file defines how WealthSmith handles loading, pending, skeleton, delayed, empty, partial, stale, and refresh states.

Loading should make the product feel calm and reliable.

Loading should not make the product feel fake, slow, noisy, or overly animated.

---

## Purpose

WealthSmith handles financial data, wallet data, protocol data, projections, suggestions, and Smith AI responses.

Some updates are instant.

Some take time.

The product should only show loading when it helps the user understand what is happening.

Loading should:

- Reduce uncertainty
- Prevent confusing empty states
- Avoid visual flicker
- Preserve trust
- Make long-running processes explainable
- Respect reduced motion
- Keep financial values honest

Loading should not:

- Flash for instant actions
- Pretend work is happening
- Hide errors
- Hide stale data
- Use Smith AI animation everywhere
- Make the product feel like a chatbot spinner

---

## Core Hard Rules

Hard Rule:

```text
Do not show loading UI for fast updates.
```

Hard Rule:

```text
Do not show fake data while loading.
```

Hard Rule:

```text
Do not use Smith AI animation as a generic spinner.
```

Hard Rule:

```text
Loading must not invent financial values, recommendations, APY, projections, or portfolio data.
```

Hard Rule:

```text
Respect reduced motion.
```

---

## Global Loading Timing

Use one global delay system across WealthSmith.

```text
0–400ms:
  No loading UI.
  Update directly.

400–800ms:
  Subtle pending state only if needed.

800ms+:
  Explicit loading state.

1.5s+:
  Explanatory loading with helpful copy when useful.
```

Rules:

- This timing applies to Dashboard, Portfolio, Goal, Support, Suggestions, Smith AI, wallet-related UI, forms, and tables.
- Do not show a spinner immediately by default.
- Delay loading to avoid flicker.
- If loading appears, keep it visible long enough to avoid a flash.
- Do not block the entire app unless the whole app truly cannot render safely.
- Prefer section-level loading over page-level loading.

---

## Minimum Visible Duration

When an explicit loading state appears, keep it visible briefly enough to avoid flicker.

Recommended:

```text
Minimum visible duration: 500–700ms
```

Rules:

- Do not force delay for critical user feedback.
- Do not make the user wait artificially when content is ready and loading has not appeared.
- If content arrives before the loading threshold, render content directly.

---

## Loading Levels

Use the smallest loading state that fits.

Priority:

```text
1. No loading
2. Button-level pending
3. Inline pending text
4. Skeleton for known content shape
5. Section-level loading
6. Explanatory loading
7. Page-level loading only when unavoidable
```

Rules:

- Prefer local loading near the affected area.
- Do not replace the whole Dashboard if only one chart is loading.
- Do not hide Portfolio tables if only APY is refreshing.
- Do not block Goal form while suggestions refresh unless required.
- Do not block Support page while Contact Us is submitting.

---

## No Loading Cases

Do not show loading for:

```text
Opening/closing accordions
Opening/closing menus
Opening/closing wallet menu
Opening/closing Ask Smith AI panel if already loaded
Switching local tabs with available content
Typing in inputs
Selecting local dropdown values
Toggling Edit Mode
Discarding local Goal draft changes
Expanding FAQ items
Local FAQ search when content is already loaded
Showing/hiding Demo Mode banner
```

Rules:

- These interactions should feel instant.
- Use direct state change.
- Do not show Smith AI animation.
- Do not show skeletons.

---

## Subtle Pending State

Use subtle pending for short waits.

Examples:

```text
Saving...
Refreshing...
Checking...
Updating...
```

Use for:

```text
Goal settings save
Contact Us submission
Wallet connection button after user action
Small data refresh
Feedback button submission
```

Rules:

- Pending text should be close to the action.
- Button-level pending should disable duplicate submissions.
- Do not replace the whole page.
- Do not use Smith AI animation for subtle pending.
- If pending lasts longer, upgrade to explicit loading or error.

---

## Skeletons

Use skeletons when the shape of upcoming content is known.

Good skeleton use:

```text
Metric card skeleton
Chart skeleton
Table row skeleton
Suggestion card skeleton
Portfolio section skeleton
```

Rules:

- Skeletons should match final layout shape.
- Skeletons should not show fake numbers.
- Skeletons should not show fake token symbols.
- Skeletons should not show fake APY.
- Skeletons should not show fake suggestions.
- Skeletons should respect reduced motion.
- Do not use skeletons for unknown content shape.
- Do not use skeletons when empty state is the real state.

---

## Spinners

Spinners should be rare.

Use only when:

```text
No content shape is known
Operation is short
Button-level progress is needed
```

Rules:

- Prefer skeleton or inline pending text over generic spinners.
- Do not use spinner as full-page default.
- Do not use spinner where a message would reduce anxiety.
- Do not use Smith AI animation as spinner.

---

## Smith AI Animation Rules

Approved animation:

```text
assets/animations/smith-ai-symbol-loop.json
```

Allowed uses:

```text
Building suggestions
Generating strategy insights
Preparing suggestion context
Loading Smith AI explanation
```

Not allowed uses:

```text
Wallet connection
Wallet disconnection
Contact Us submission
Goal settings save
FAQ loading
Generic page loading
Portfolio table loading
Chart loading
Protocol handoff
Global Nav loading
Button loading
Menu loading
Toast loading
```

Hard Rule:

```text
Smith AI animation is only for meaningful Smith AI or suggestion-building waits.
```

Reduced-motion fallback:

```text
assets/logo/wealthsmith-symbol.svg
```

Rules:

- Do not show Smith AI animation for every loading state.
- Do not use Smith AI animation to make normal app loading feel “AI-powered.”
- Use explanatory copy when animation appears for 1.5s+.
- Respect reduced motion by replacing animation with static symbol.

---

## Explanatory Loading

Use explanatory loading for longer waits that need user reassurance.

Examples:

```text
Building your suggestions...
Reviewing your portfolio and plan.
```

```text
Preparing strategy insights...
This may take a moment while WealthSmith checks your plan context.
```

Rules:

- Use only after meaningful delay.
- Explain what is happening in plain language.
- Do not overpromise.
- Do not imply actions are being executed.
- Do not imply funds are moving.
- Do not imply wallet signing.
- Do not invent intermediate financial results.
- Keep copy calm.

---

## Dashboard Loading

Dashboard can load in sections.

Sections:

```text
Financial Snapshot
Safety Buffer
Projected Growth
Current vs Recommended Allocation
Smith AI Suggestions
Strategy Insights
```

Rules:

- Do not block the whole Dashboard if only one section is loading.
- Use metric-card skeletons for Financial Snapshot.
- Use progress-bar skeleton or pending state for Safety Buffer.
- Use chart skeleton for Projected Growth.
- Use chart/card skeleton for allocation.
- Use suggestion-specific loading for Suggestions.
- Keep already-loaded values visible while refreshing if still valid.
- Mark stale values when they may be outdated.

---

## Portfolio Loading

Portfolio loading may involve wallet, token, protocol, price, staking, and yield data.

Sections:

```text
Balance Overview
Crypto Assets Allocation
Liquid Assets
Staked Assets
Yield Strategies
Asset Deployment Overview
```

Rules:

- Show section-level skeletons.
- Do not show fake token rows.
- Do not show fake APY.
- Do not show fake estimated earnings.
- If wallet connects before protocol data loads, show wallet connected state and portfolio loading separately.
- If one protocol fails, show partial state for that section.
- Keep successfully loaded sections visible.
- Do not hide unsupported/unknown assets silently.

---

## Suggestion Loading

Suggestion loading may use Smith AI animation only when meaningful.

Use when:

```text
Suggestions are being generated
Strategy Insights are being generated
Smith AI explanation context is being prepared
```

Rules:

- Skip loading if suggestions are ready within 400ms.
- Use subtle pending between 400–800ms if needed.
- Use explicit loading after 800ms.
- Use Smith AI animation for meaningful suggestion-building waits.
- Do not show fake suggestion cards.
- Do not show old suggestions as current if stale.
- Do not keep demo suggestions while real suggestions load unless clearly marked as demo and replaced safely.
- Do not mark suggestions completed during loading.

Allowed copy:

```text
Building your suggestions...
```

```text
Preparing strategy insights...
```

Avoid:

```text
Executing your strategy...
Moving funds...
Trading for you...
```

---

## Smith AI Response Loading

Ask Smith AI response loading should be clear but lightweight.

Rules:

- Do not show loading for instant responses.
- Show subtle typing/pending state after delay.
- Use Smith AI animation only if response generation takes meaningful time.
- Preserve the user’s prompt.
- Do not block Dashboard.
- Do not remove previous messages unless product intentionally resets context.
- If response fails, show safe error and keep input available.
- Do not invent an answer if context fails to load.

Example error:

```text
I couldn’t load the required context right now.
Try again in a moment.
```

---

## Onboarding Loading

Onboarding should feel fast.

Rules:

- Do not show loading between simple onboarding questions.
- Do not show loading after local answer selection unless product calculation is delayed.
- Dashboard preview updates should skip loading when fast.
- Show subtle updating state only when saved answer triggers noticeable recalculation.
- Smith AI animation may be used only when preparing suggestions/strategy at the end of onboarding and it takes meaningful time.
- Progress bar should update when step is completed, not while waiting on unrelated data.

---

## Goal Settings Loading

Goal Settings should not feel heavy.

Rules:

- Do not show loading while typing.
- Do not show loading when changing local draft fields.
- Save Changes may show button-level pending.
- Do not use Smith AI animation for saving Goal settings.
- After save, derived sections may refresh separately.
- If suggestions refresh after save, use suggestion loading rules.
- If save fails, keep draft values and show recoverable error.
- Do not clear fields during loading.

Allowed copy:

```text
Saving...
```

Error:

```text
We couldn’t save your goal settings right now.
Your changes are still here. Try again in a moment.
```

---

## Wallet Loading

Wallet connection loading should be lightweight and specific.

Rules:

- Do not use Smith AI animation for wallet connection.
- Use Connect Wallet button pending or modal-level pending.
- Do not show full-page loading for wallet connection.
- Do not show fake wallet data while connecting.
- Do not show wallet pill until wallet state is connected.
- If wallet connects but portfolio data is still loading, show wallet pill and section-level portfolio loading.
- Distinguish wallet connection from portfolio data loading.
- Distinguish message signing from transaction signing if signing exists.
- Do not imply funds are moving.

Allowed copy:

```text
Connecting...
```

```text
Loading wallet positions...
```

Avoid:

```text
Securing funds...
Moving assets...
Executing...
```

---

## Contact Us Loading

Contact Us submission should use button-level pending.

Rules:

- Do not use Smith AI animation.
- Do not close modal until submission succeeds.
- Do not clear user input while submitting.
- Disable duplicate submissions.
- Keep form values on error.
- Show success toast after successful submission.
- Keep error calm and recoverable.

Allowed button state:

```text
Sending...
```

Success toast:

```text
Message sent
```

Error:

```text
We couldn’t send your message right now.
Your message is still here. Try again in a moment.
```

---

## Support Loading

Support FAQ should load calmly.

Rules:

- Local FAQ search should not show loading.
- Opening FAQ accordion should not show loading.
- If FAQ content is fetched remotely, use section skeleton or inline loading after threshold.
- Do not use Smith AI animation for FAQ loading.
- If FAQ fails, show support content unavailable and keep Contact Us available.
- Do not invent FAQ answers while loading fails.

---

## Demo Mode Loading

Demo Mode should usually load instantly.

Rules:

- Do not show loading for fast Demo Mode entry.
- Do not show fake real-wallet loading in Demo Mode.
- If demo suggestions are generated and take time, use suggestion loading rules.
- Do not show wallet loading unless user actually connects a wallet.
- On Exit Demo, clear demo state directly or show subtle pending if cleanup takes time.
- Connecting wallet from Demo Mode should clear demo context and then use wallet loading rules.

---

## Protocol Handoff Loading

Protocol handoff is opening a new tab.

Rules:

- Do not show long loading after click.
- Do not mark suggestion completed.
- Do not show transaction pending.
- Do not request signature.
- Do not imply execution.
- If external URL cannot open, show error.
- Keep WealthSmith state unchanged unless product explicitly tracks handoff event.

Allowed toast if needed:

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

## Partial Data State

Partial state means some data loaded and some failed or is pending.

Use partial states instead of blocking everything.

Examples:

```text
Portfolio loaded, APY unavailable.
Liquid assets loaded, protocol positions still loading.
Dashboard metrics loaded, suggestions refreshing.
```

Rules:

- Show available data.
- Clearly mark unavailable sections.
- Do not fill missing fields with fake values.
- Do not hide partial errors if they affect user understanding.
- Keep retry path available if useful.
- Do not convert partial state into generic full-page error.

---

## Stale Data State

Stale state means data exists but may be outdated.

Examples:

```text
Wallet data has not refreshed yet.
APY data is older than allowed freshness.
Suggestions were generated before latest goal change.
```

Rules:

- Mark stale data when relevant.
- Do not present stale suggestions as current Top Pick.
- Do not use stale APY as current yield unless clearly labeled.
- Keep older data visible only when safer than blanking it.
- Trigger refresh when possible.
- Smith AI should mention stale context if explaining it.

Example copy:

```text
This data may be outdated. Refresh to update your portfolio.
```

---

## Error State vs Loading State

Do not leave users in indefinite loading.

Rules:

- Loading must eventually resolve to content, empty, partial, stale, or error state.
- If an operation fails, show an error state.
- If the user can retry, show retry.
- If the product can continue without the failed data, show partial state.
- Do not show endless spinner.
- Do not hide errors behind repeated loading animation.

---

## Empty State vs Loading State

Empty means there is no data.

Loading means data is being fetched/generated.

Rules:

- Do not show empty state while data is actively loading.
- Do not show loading state when product already knows data is empty.
- Empty state should explain what is missing.
- Loading state should explain what is happening only if wait is meaningful.
- Use correct state from product data.

Example empty:

```text
No suggestions yet
Complete your plan or connect a wallet to generate personalized suggestions.
```

Example loading:

```text
Building your suggestions...
```

---

## Refresh Behavior

Refresh should preserve trust.

Rules:

- Keep current valid content visible while refreshing when safe.
- Use subtle refreshing indicator instead of replacing content with skeleton if content is still usable.
- Do not keep stale suggestions active after major state changes.
- If goal settings changed, suggestions should refresh from product logic.
- If wallet disconnected, clear or mark real wallet data unavailable.
- If Demo Mode exited, clear demo data.
- If APY refresh fails, keep APY unavailable or stale-labeled; do not invent.

---

## Reduced Motion

Hard Rule:

```text
Respect reduced motion.
```

Rules:

- Replace Lottie animation with static Smith symbol when reduced motion is enabled.
- Avoid shimmer skeletons if reduced motion is enabled.
- Use static skeleton blocks or text status.
- Avoid animated transitions that are not essential.
- Do not autoplay decorative motion if reduced motion is enabled.

Reduced-motion fallback:

```text
assets/logo/wealthsmith-symbol.svg
```

---

## Accessibility

Loading states must be accessible.

Rules:

- Loading text should be readable by assistive technologies.
- Use polite announcements for background updates.
- Use assertive announcements only for critical errors.
- Buttons in pending state should expose busy/disabled state.
- Do not trap focus during section loading.
- Do not move focus unexpectedly when content loads.
- Modals must keep focus management during loading.
- Skeletons should not be read as meaningful content.
- Error states should be announced when relevant.

Examples:

```text
aria-busy="true"
```

```text
aria-live="polite"
```

---

## Loading Copy Rules

Use:

```text
Loading...
Saving...
Sending...
Refreshing...
Building your suggestions...
Preparing strategy insights...
Loading wallet positions...
```

Avoid:

```text
Executing...
Moving funds...
Trading...
Securing your assets...
Guaranteeing returns...
Optimizing profits...
AI is investing...
```

Rules:

- Loading copy must describe the actual process.
- Do not imply transaction execution.
- Do not imply custody.
- Do not imply guaranteed results.
- Do not imply AI is making financial decisions outside product logic.

---

## Data Contract

Recommended loading state shape:

```json
{
  "status": "loading",
  "started_at": "2026-06-30T00:00:00Z",
  "show_loading_after_ms": 800,
  "minimum_visible_ms": 600,
  "loading_type": "section",
  "message_key": "loading.suggestions.building"
}
```

Recommended refreshing state:

```json
{
  "status": "refreshing",
  "show_existing_data": true,
  "stale": false,
  "message_key": "loading.dashboard.refreshing"
}
```

Recommended partial state:

```json
{
  "status": "partial",
  "available_sections": ["liquid_assets", "balance_overview"],
  "unavailable_sections": ["yield_strategies"],
  "error_code": "protocol_data_unavailable"
}
```

Rules:

- Status should be explicit.
- UI should not infer loading from missing values alone.
- Missing data may mean loading, empty, error, stale, or unsupported.
- Product state should distinguish these.

---

## Related Files

Rules:

```text
rules/financial-logic-boundaries.md
rules/suggestion-engine-rules.md
rules/top-pick-rules.md
rules/protocol-selection-rules.md
rules/wallet-and-custody-rules.md
rules/demo-mode-rules.md
rules/smith-ai-rules.md
```

Components:

```text
components/loading-indicator.md
components/skeleton.md
components/progress-bar.md
components/toast.md
components/empty-state.md
components/alert.md
```

Patterns:

```text
patterns/empty-loading-error-states.md
patterns/dashboard-layout.md
patterns/suggestion-flow.md
patterns/portfolio-overview.md
patterns/wallet-connection.md
patterns/goal-settings.md
patterns/support-center.md
```

Assets:

```text
assets/animations/smith-ai-symbol-loop.json
assets/logo/wealthsmith-symbol.svg
```

---

## Claude Code Rules

Claude Code should:

- Apply the 0–400 / 400–800 / 800+ / 1.5s+ timing model.
- Avoid loading flicker.
- Use section-level loading where possible.
- Use button-level pending for forms and small actions.
- Use skeletons only when content shape is known.
- Use Smith AI animation only for approved Smith AI/suggestion waits.
- Use static symbol fallback for reduced motion.
- Preserve existing valid content during refresh when safe.
- Distinguish loading, empty, partial, stale, and error states.
- Keep user input during loading and errors.
- Keep Dashboard usable during right-panel loading.
- Keep wallet connection separate from portfolio data loading.

Claude Code must not:

- Show loading immediately for every action.
- Show fake financial values while loading.
- Use Smith AI animation as generic spinner.
- Use Smith AI animation for wallet connection.
- Use Smith AI animation for Contact Us submission.
- Use endless spinners.
- Hide errors behind loading.
- Replace entire page for section-level loading.
- Mark suggestions completed because a protocol tab opened.
- Show stale suggestions as current Top Pick.
- Invent APY, projections, or suggestions during loading.
- Ignore reduced motion.

---

## Do

- Delay loading to avoid flicker.
- Use the smallest loading state that fits.
- Keep current valid data visible when safe.
- Use skeletons for known layouts.
- Use explanatory loading for longer waits.
- Use Smith AI animation only where meaningful.
- Use button pending for forms.
- Respect reduced motion.
- Distinguish loading from empty/error/stale.
- Keep copy calm and accurate.

---

## Do Not

- Do not show loading for instant interactions.
- Do not show fake data.
- Do not show endless spinners.
- Do not use Smith AI animation everywhere.
- Do not use loading to hide missing data.
- Do not imply actions execute while loading.
- Do not imply funds move while loading.
- Do not block the whole app unnecessarily.
- Do not clear user input during loading.
- Do not ignore partial data.

---

## Done Criteria

This rule is followed when:

- Fast updates render without loading.
- Loading appears only after meaningful delay.
- Loading does not flicker.
- Skeletons match known content shapes.
- Smith AI animation is used only for approved waits.
- Reduced motion uses static fallback.
- Wallet connection uses lightweight pending state, not Smith AI animation.
- Contact Us uses button-level pending, not Smith AI animation.
- Dashboard and Portfolio use section-level loading.
- Suggestions use safe loading and never fake cards.
- Loading resolves to content, empty, partial, stale, or error state.
- No loading copy implies custody, execution, or guaranteed outcomes.

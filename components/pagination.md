# Pagination

Pagination helps users move through large sets of structured data.

In WealthSmith, pagination may appear in asset tables, wallet lists, protocol positions, yield positions, staked asset tables, suggestion history, activity history, search results, and filtered results.

Pagination should make large data sets manageable without hiding important financial context.

---

## Purpose

Use pagination when a list or table has more items than should be shown at once.

Pagination should help users understand:

- How many items are visible
- Whether more items exist
- How to move forward or backward
- Which page or range they are viewing
- Whether filters or search affect the result count
- Whether more data is loading
- Whether all results have been shown

Pagination should make data easier to navigate without creating confusion or hiding context.

---

## Important Rule

Pagination controls navigation through data.

Pagination does not contain WealthSmith business logic.

A pagination component can display:

- Previous button
- Next button
- Page numbers
- Current page
- Total pages
- Visible row range
- Total item count
- Rows per page
- Load more action
- Loading state
- Disabled state
- Filtered/search result context

A pagination component must not decide:

- Which data exists
- Which rows are shown
- Which assets are supported
- Which wallet positions are detected
- Which suggestions exist
- Which protocol positions exist
- Whether a user should invest
- Whether a recommendation is Top Pick
- Whether pagination should reset after filters change
- Whether server-side data should be fetched

Those decisions must come from backend data, table state, search/filter state, parent component state, or routing state.

The component should render pagination state and actions provided to it.

---

## Pagination vs Load More vs Infinite Scroll

Pagination, Load More, and Infinite Scroll are different.

### Pagination

Use when the user moves through known pages or ranges of data.

Examples:

```text
Previous
Next
Page 2 of 8
Showing 21–40 of 156
```

Best for:

- Asset tables
- Protocol positions
- Wallet lists
- Search/filter results
- Activity history

### Load More

Use when adding more rows to the current list is simpler than page navigation.

Examples:

```text
Show more
Showing 20 of 64
```

Best for:

- Mobile tables
- Simple lists
- Suggestion history
- Compact panels

### Infinite Scroll

Avoid for important WealthSmith financial data.

Why:

- Harder to know total context
- Harder to return to a known position
- Harder to compare financial rows
- Worse for accessibility and auditability
- Can hide important counts

Do not use infinite scroll for core financial tables unless product design explicitly approves it.

---

## When to Use

Use pagination when content can grow beyond a reasonable visible count.

Examples:

- Asset list
- Wallet list
- Token holdings
- Protocol positions
- Yield positions
- Staked assets
- Suggestion history
- Activity history, if added later
- Search results
- Filtered results
- Transaction history, if added later
- Audit/log pages, if added later

Pagination can appear in:

- Tables
- Lists
- Cards
- Search result pages
- Filtered views
- Side panels, if compact
- Mobile list views

---

## When Not to Use

Do not use pagination for:

- Very short lists
- Static small data sets
- Metric cards
- Small suggestion card groups
- Dashboard summaries
- Critical alerts
- Onboarding steps
- Modals with very little content
- Charts
- Content where all items should be visible for comparison

Use:

- `components/table.md` for table structure
- `components/list-item.md` for list rows
- `components/button.md` for pagination buttons
- `components/select-menu.md` for rows-per-page control
- `components/loading-indicator.md` for loading next page
- `components/empty-state.md` when result set is empty

---

## Data Source

Pagination should render structured pagination state.

Expected data may include:

```text
currentPage
totalPages
pageSize
totalItems
visibleStart
visibleEnd
hasPreviousPage
hasNextPage
isLoading
isDisabled
mode
pageSizeOptions
onPrevious
onNext
onPageChange
onPageSizeChange
onLoadMore
resultContext
```

The exact schema can evolve.

The component should not invent page counts, result counts, item ranges, or loading state.

---

## Anatomy

Pagination can include:

1. Container
2. Result range text
3. Previous button
4. Next button
5. Optional page number buttons
6. Optional current page label
7. Optional total page label
8. Optional rows-per-page select
9. Optional load-more button
10. Optional loading indicator
11. Optional filtered/search context

Required for pagination mode:

- Previous control
- Next control
- Current range or current page context
- Disabled state for unavailable controls

Required for load-more mode:

- Load more button
- Visible count or result context
- Disabled/completed state when all items are shown

Optional:

- Page numbers
- Rows per page
- First/last controls
- Total count
- Loading state
- Compact mobile layout

---

## Variants

### Table Pagination

Use below tables.

Examples:

```text
Showing 1–20 of 64
Previous
Next
```

Rules:

- Place pagination below the table.
- Keep it visually connected to the table.
- Show range and total count when available.
- Disable Previous on first page.
- Disable Next on last page.
- Keep table headers stable when page changes.
- Do not show fake row counts.

---

### Compact Pagination

Use in narrow layouts or side panels.

Examples:

```text
1–20 of 64
Previous
Next
```

Rules:

- Avoid many page numbers.
- Use Previous/Next only.
- Keep actions reachable.
- Keep label short.
- Use accessible labels for buttons.

---

### Mobile Pagination

Use simplified pagination on mobile.

Recommended mobile options:

```text
Show more
```

or:

```text
Previous
Next
Showing 1–20 of 64
```

Rules:

- Avoid dense page number rows.
- Prefer Load More for simple mobile lists.
- Buttons may be full-width or stacked when needed.
- Keep range text visible.
- Do not force horizontal scrolling just for pagination.

---

### Page Number Pagination

Use only when users need direct access to pages.

Examples:

```text
1 2 3 … 8
```

Rules:

- Use sparingly.
- Avoid page number pagination on mobile.
- Current page must be clearly indicated.
- Page buttons must be keyboard accessible.
- Use ellipsis for large page counts.
- Do not show too many page numbers.

---

### Rows Per Page

Use when users benefit from controlling page size.

Examples:

```text
Rows per page: 20
Rows per page: 50
```

Rules:

- Use `components/select-menu.md`.
- Use sensible options only.
- Do not provide extremely large page sizes that hurt performance.
- Parent state controls page size.
- Changing page size may reset to first page if parent logic decides so.
- Component does not decide reset behavior.

Suggested options:

```text
10
20
50
100
```

For MVP, `20` is a good default for tables.

---

### Load More

Use when progressively revealing more rows is better than page switching.

Examples:

```text
Show more
Showing 20 of 64
```

Rules:

- Use for mobile or simple lists.
- Keep already loaded items visible.
- Disable or hide button when all items are shown.
- Show loading indicator while more rows load.
- Do not duplicate rows.
- Do not invent total count if not available.

---

### Server-Side Pagination

Use when data is fetched page by page from backend.

Rules:

- Parent/backend owns cursor, page, limit, and total count.
- Component renders provided state only.
- Do not assume all data exists in frontend memory.
- Do not calculate totals locally unless provided.
- Show loading state while fetching next/previous page.
- Keep stale page data visible if product behavior supports it.
- Show error state if fetch fails.

Server-side pagination may use:

```text
page number
cursor
offset
limit
```

The component should not care which backend strategy is used.

---

### Cursor Pagination

Use when backend provides cursors instead of page numbers.

Examples:

```text
Next
Previous
```

or:

```text
Show more
```

Rules:

- Do not show total pages if unavailable.
- Use range/count only when provided.
- Use `hasNextPage` and `hasPreviousPage` from parent state.
- Do not invent page numbers.

---

## Search and Filter Behavior

Pagination must work with search and filters.

Rules:

- Search/filter state belongs outside the pagination component.
- Parent state decides whether page resets when filters change.
- Result count should reflect filtered results.
- Copy should clarify when results are filtered.
- Empty filtered results should use `components/empty-state.md`.

Good:

```text
Showing 1–20 of 42 filtered assets
```

Good empty state:

```text
No assets match your filters.
```

Avoid:

```text
No assets found.
```

when filters are active and may be hiding results.

---

## Labels

Pagination labels must be clear.

Recommended labels:

```text
Previous
Next
Show more
Rows per page
Page 2 of 8
Showing 21–40 of 156
Showing 20 of 64
```

Rules:

- Use plain language.
- Avoid technical backend terms like cursor or offset.
- Avoid vague labels like More.
- Avoid financial advice language.

Icon-only pagination buttons must include accessible labels.

Good accessible labels:

```text
Go to previous page
Go to next page
Load more assets
```

---

## Disabled States

Pagination controls must support disabled states.

Examples:

- Previous disabled on first page
- Next disabled on last page
- Load More disabled when all items are loaded
- Controls disabled during loading, if needed

Rules:

- Disabled state must be visually clear.
- Disabled controls must not trigger action.
- Disabled state must not rely on color alone.
- Use `components/button.md` disabled behavior.
- Do not hide disabled Previous/Next if hiding them causes layout shift or confusion.

---

## Loading State

Use loading state when a page or more rows are being fetched.

Examples:

```text
Loading next page…
Loading more assets…
```

Rules:

- Use `components/loading-indicator.md`.
- Do not show fake rows.
- Disable repeated clicks when needed.
- Preserve current rows if parent state supports it.
- Do not clear the table unless product behavior intentionally does so.
- Move to error state if loading fails.

For content placeholder loading, use `components/skeleton.md`.

---

## Error State

If pagination fetch fails, parent component should show error state.

Examples:

```text
Could not load more assets.
Could not load next page.
```

Rules:

- Use `components/alert.md` or inline table/list error state.
- Provide retry where useful.
- Do not remain in loading state after failure.
- Do not show empty state if the request failed.

---

## Empty State

Pagination should not appear when no results exist unless parent design requires context.

Rules:

- If there are zero results, use `components/empty-state.md`.
- For filtered/search empty state, explain the filter/search context.
- Do not show `Showing 1–0 of 0`.
- Do not show Previous/Next for an empty table.

Good:

```text
No assets match your filters.
```

---

## Count Formatting

Result count copy must be clear.

Examples:

```text
Showing 1–20 of 64
Showing 21–40 of 64
Showing 41–64 of 64
Showing 20 of 64
```

Rules:

- Do not show a range larger than total count.
- Do not show fake total count.
- If total is unknown, avoid “of X”.

Unknown total examples:

```text
Showing 20
Show more
```

or:

```text
20 loaded
```

---

## Placement

Pagination should be placed close to the content it controls.

Rules:

- Table pagination usually appears below the table.
- List pagination usually appears below the list.
- Page-level pagination should not control multiple unrelated sections.
- Keep pagination within the same card/container when the table is inside a card.
- Do not place pagination far away from the content.
- Do not place pagination above content unless there is a strong reason.

---

## Token Usage

Pagination must use semantic tokens.

Do not hardcode colors, spacing, typography, radius, shadows, or motion.

### Correct

```text
text: color.text.secondary
active page text: color.text.primary
active page background: color.action.primary.background.default
button text: color.action.primary.text.default
disabled text: color.text.disabled
border: color.border.subtle
gap: spacing.inline.gap.sm
container gap: spacing.stack.gap.md
label: typography.body.sm
button: typography.button.sm
focus: shadow.control.focus
```

### Incorrect

```text
color: #121212
border: 1px solid #C5C5C5
gap: 8px
padding: 12px
border-radius: 8px
```

---

## Responsive Behavior

Pagination should be mobile-first.

### Mobile

- Prefer Load More or Previous/Next.
- Avoid dense page number lists.
- Stack controls if needed.
- Keep range text visible.
- Buttons may be full-width when useful.
- Keep touch targets comfortable.
- Do not force horizontal scrolling.

### Tablet

- Previous/Next with range text is usually enough.
- Rows per page can appear when space allows.
- Page numbers may appear for larger tables if useful.

### Desktop

- Show range text, Previous/Next, and rows-per-page where useful.
- Page numbers may be used if direct navigation matters.
- Keep controls aligned with table/card width.

### Wide

- Do not stretch pagination unnecessarily.
- Keep controls close to table/list content.
- Preserve grid alignment.

---

## Accessibility

Pagination must support accessibility by default.

Requirements:

- Buttons must be keyboard accessible.
- Current page must be communicated.
- Disabled states must be communicated.
- Icon-only controls must have accessible labels.
- Loading state must be announced when useful.
- Pagination should have a navigation landmark when page-level or table-level.
- Do not rely on color alone.
- Focus state must be visible.
- Touch targets must be large enough.

Recommended structure:

```text
nav aria-label="Table pagination"
```

Current page:

```text
aria-current="page"
```

Disabled controls:

```text
disabled
aria-disabled="true"
```

Loading region:

```text
aria-busy="true"
```

---

## Keyboard Behavior

Required keyboard behavior:

```text
Tab: move through pagination controls
Enter: activate focused control
Space: activate focused button
Shift + Tab: move backward
```

Rules:

- Disabled controls should not activate.
- Focus should remain predictable after page changes.
- If a page change reloads table content, parent state should manage focus when needed.
- Do not trap focus inside pagination.
- Do not move focus unexpectedly on automatic data refresh.

---

## Financial and Wallet Language Rules

Pagination copy must be neutral and precise.

Allowed:

```text
assets
wallets
positions
suggestions
transactions
results
rows
items
filtered assets
```

Avoid:

```text
profit opportunities
best assets
risk-free positions
guaranteed results
```

Pagination must not imply WealthSmith can move funds, sign transactions, or execute financial actions.

Pagination must not imply hidden rows are less important or less risky.

---

## Smith AI Rules

Pagination can appear in Smith AI side panels only for structured history or result lists.

Rules:

- Pagination does not generate Smith AI responses.
- Parent state controls paginated Smith AI context.
- During onboarding, Smith AI remains open.
- Do not rely on Smith AI to explain pagination state.
- Do not use pagination labels like “best answers” unless product logic explicitly provides ranking.

---

## Demo Mode Rules

Pagination may appear for demo data.

Rules:

- Demo Mode must be indicated elsewhere, usually with `components/announcement.md`.
- Pagination copy should not imply demo rows are real user assets.
- Do not mix demo and real results in one paginated list unless clearly labeled.

---

## Validation and State Rules

Pagination state belongs outside the component.

The pagination component may display:

- Current page
- Total pages
- Total count
- Visible range
- Rows per page
- Previous/Next availability
- Load More availability
- Loading state
- Disabled state

The pagination component must not decide:

- Which rows are visible
- Whether search/filter changed results
- Whether page should reset
- Whether backend should fetch data
- Whether all results are loaded
- Whether financial data is valid
- Whether a financial action should proceed

---

## Do

- Use pagination for large tables and lists.
- Use Load More for simple mobile lists.
- Keep range/count labels clear.
- Use semantic tokens.
- Keep controls close to the content they affect.
- Use disabled states correctly.
- Use loading indicator while fetching more data.
- Use empty state for zero results.
- Avoid infinite scroll for important financial data.
- Keep product logic outside the component.

---

## Do Not

- Do not use infinite scroll for core financial tables.
- Do not show fake counts or ranges.
- Do not show pagination for empty results.
- Do not show Previous/Next when they cannot work unless disabled state is clear.
- Do not invent total pages.
- Do not hide search/filter context.
- Do not use pagination to imply ranking or recommendation.
- Do not use hype-based financial copy.
- Do not imply guaranteed returns.
- Do not imply custody, execution, or investment action.
- Do not hardcode raw visual values.

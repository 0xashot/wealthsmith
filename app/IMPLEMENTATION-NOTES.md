# WealthSmith App — Implementation Notes

Implementation lives entirely under `app/`. The source-of-truth folders
(`tokens/`, `assets/`, `components/`, `patterns/`, `rules/`, `content/`,
`examples/`, `templates/`, `checklists/`) are read-only for this app and are
never modified by it.

## Status

- **Step 1 (complete):** Vite + React + TypeScript scaffold, token pipeline,
  base styles, token smoke-test placeholder page.
- **Step 2 (complete):** connected-wallet Dashboard shell — Global Nav
  (wallet-connected variant), page header, alert banner, Financial Snapshot,
  Safety Buffer, Projected Growth, Current vs Recommended Allocation, and the
  Smith AI Suggestions rail, all rendered from
  `examples/dashboard/dashboard-connected-wallet-state.json`.
- **Step 2.1 (complete):** aligned to the design-system clarification pass:
  - Chart axis/category/legend labels use `typography.chart.label`; plot
    value labels use `typography.chart.value` (metric typography removed
    from charts per components/chart.md Label Typography).
  - Chart cards: description sits directly under the heading; allocation
    legend moved to the bottom of the card content.
  - Global Nav active indicator is a bottom-edge bar aligned to the item's
    horizontal bounds (nav items stretch to bar height on desktop); the
    text underline was removed. 2px bar thickness is a documented
    spec-level value (no indicator-size token exists).
  - Suggestion card icons are data-driven per suggestion-card.md (Icons):
    cards whose `protocol_decision.destination_protocol_id` names a
    destination use the approved protocol icon (BONK card → Jupiter,
    locked yield card → Kamino); generic UI icons only for cards with no
    protocol identity (Safety Buffer Top Pick → shield-check). A missing
    protocol icon logs a console error and renders the protocol name with
    no unapproved fallback.
- **Step 2.2 (complete):** chart legend markers and axis alignment per the
  clarified components/chart.md (Legend Markers, Axis Label Positioning):
  - All chart legends use the approved marker assets
    (`assets/icons/chart/chart-line-marker.svg` for the line series,
    `chart-dot-marker.svg` for allocation/progress legends), paired with
    visible text labels. The ad-hoc CSS swatches were removed.
  - The approved marker SVGs ship with a fixed `#0A0A0A` fill, so
    `LegendMarker` applies them as CSS masks tinted with chart series
    color tokens ("color should come from chart series tokens",
    assets/icons/README.md). Asset files are untouched. Note: masking
    renders the line marker as a solid silhouette (the white dot-center
    knockout in the source asset cannot survive an alpha mask).
  - Projected Growth uses milestone x-spacing per components/chart.md
    (Axis Label Positioning): `x = milestoneIndex / (milestoneCount − 1)`,
    so Year 0/1/3/5 sit at 0%/33.3%/66.7%/100% with equal visual gaps.
    One shared coordinate function positions the data point, value label,
    and axis label (the continuous-time formula is documented in chart.md
    for continuous-time charts only and is not used here). All labels use
    `textAnchor="middle"`; 32px plot side-padding prevents edge clipping
    without breaking point alignment.
  - All chart legends (`.chart-legend`) are horizontally centered at the
    bottom of the card content with markers vertically aligned to labels;
    the Safety Buffer card order is title → metric → progress bar →
    explanation text → centered Covered Buffer legend
    (patterns/dashboard-layout.md).
  - Legend labels: "Contributions" comes from the fixture series label
    (chart.md: legend labels must match data labels — the clarification's
    "Growth" example maps to this fixture's line series). "Covered Buffer"
    comes from the patterns/dashboard-layout.md Safety Buffer example; its
    marker color matches the progress fill (danger while underfunded).
    The allocation legend entries are the chart's actual series
    (Current / Recommended); Crypto and Stables are row group labels in
    this horizontal-bar layout, not legend series.
  - Legend marker size is 16px, consistent with the app's documented raw
    icon sizing (no `icon.size.*` tokens exist).
- **Step 3 (complete):** MVP-safe interactions.
  - **Wallet pill menu** (menu-popover semantics: `role="menu"`, Escape /
    outside-click close, arrow-key navigation, focus management). Items:
    Copy Address + Disconnect Wallet only. Copy uses the async clipboard
    API with approved toasts for both outcomes ("Address copied." /
    "Could not copy address.", components/toast.md). Note: content/
    wallet-copy.md lists only Disconnect Wallet as approved menu copy;
    "Copy Address" is sanctioned by checklist §5.4 ("Wallet menu may
    contain Copy Address").
  - **Disconnect** clears all wallet-dependent view state (portfolio value,
    Safety Buffer, Projected Growth, Allocation, alert, suggestions) into
    approved empty/unavailable states; saved goal-settings metrics persist
    per rules/wallet-and-custody-rules.md. Toast: fixture's "Wallet
    disconnected" + "Your funds stay in your wallet." No copy implies funds
    moved or assets were deleted.
  - **Connect Wallet (slice-only stub):** restores the synthetic fixture
    session directly with the fixture's "Wallet connected" toast. The
    wallet-connection modal flow (patterns/wallet-connection.md) is NOT
    implemented and no wallet adapter exists — flagged as a deviation until
    a wallet-connection step lands.
  - **Review on Jupiter handoff:** plain anchor to the fixture Protocol
    Logic URL (https://jup.ag), `target="_blank"`,
    `rel="noopener noreferrer"`, fixture aria label. Click shows only the
    fixture's approved toast ("Opened protocol in a new tab") — no
    transaction, no signature, no completion marking, no suggestion state
    change. Locked Kamino card remains a disabled button.
  - **Ask Smith AI panel shell** (dashboard-layout Mode 3): replaces the
    rail (one right-zone mode at a time), close restores the rail and
    returns focus to the trigger. Explain-only: initial response and the
    three quick prompts map to fixture-approved responses (dashboard
    fixture, suggestions fixture, protocol-handoff fixture); ANY free-form
    input gets only the approved uncertainty fallback from
    content/smith-ai-copy.md — no live generation exists. Safety note
    rendered. Ask Smith AI is hidden while disconnected (no grounded
    context). Feedback buttons render accessibly (aria-pressed) but store
    nothing. Assumption: feedback aria-labels "Helpful"/"Not helpful" and
    the input placeholder (reusing the fixture entry_label "Ask Smith AI")
    are UI chrome with no approved copy source; the panel omits the "More"
    menu from the Mode 3 structure since no approved menu items exist
    for it.
  - **Toasts** (components/toast.md): `role="status"`/polite, dismissible,
    auto-dismiss ~6s, approved copy only.
- **Step 3.1 (complete):** Smith AI persistent assistant sidebar per the
  clarified components/sidebar.md (Smith AI Companion Panel — Panel Sizing
  and Anchoring) and patterns/dashboard-layout.md:
  - Desktop/wide: `position: sticky` inside the right grid column,
    `top: var(--spacing-page-padding-desktop)`,
    `height: calc(100dvh - 2 * var(--spacing-page-padding-desktop))` —
    fills the dynamic viewport height with consistent 32px top/bottom
    page padding once the page scrolls; never content-height; the page
    scrolls independently. In the unscrolled layout the panel top aligns
    with the right rail start (below the Global Nav), so its bottom edge
    sits below the fold until the first scroll — the documented
    initial-alignment state.
  - Internal layout: flex column — header pinned at top, conversation
    area `flex: 1` with internal `overflow-y: auto`, feedback / quick
    prompts / input / safety note clustered at the bottom.
  - Mobile/tablet: fixed overlay drawer with page padding token insets
    (mobile 16px / tablet 24px) plus `env(safe-area-inset-bottom)`;
    `zIndex.smithAI.panel`; the visible close action is the panel header
    close button.
  - No behavior change: responses remain fixture-approved static content.
- **Step 3.2 (complete):** Smith AI panel viewport-fit fix (was overflowing
  ~56px below the fold because the height only subtracted 2× page padding
  and ignored the Global Nav above the panel).
  - Desktop height now `calc(100dvh − panelTopOffset − panelBottomOffset)`
    where `--smith-panel-top-offset = calc(24px + 64px +
    var(--spacing-page-padding-desktop))` (Global Nav outer offset + nav
    height — documented spec literals — plus the desktop page padding
    token) and `panelBottomOffset = var(--spacing-page-padding-desktop)`.
    The sticky `top` uses the same `--smith-panel-top-offset`, so top (120px)
    and bottom (32px) spacing are identical whether or not the page has
    scrolled — verified at 900px and 640px viewports (heights 748 and 488,
    both fully inside the viewport, 32px bottom gap).
  - Container: `overflow: hidden`, flex column, `min-height: 0`, `height`
    and `max-height` set to the available height. Conversation area:
    `flex: 1; min-height: 0; overflow-y: auto`. Header + feedback + quick
    actions + form + safety note: `flex-shrink: 0` so only the body
    scrolls. Verified with 16 entries: panel height stayed fixed, body
    scrolled internally, footer stayed pinned.
- **Step 3.3 (complete):** protocol handoff CTA styling per the clarified
  components/button.md (Button Icons, Button-Styled Links),
  components/icon.md (Icons in Buttons), and components/suggestion-card.md
  (Protocol Handoff CTA).
  - The "Review on Jupiter" CTA stays an accessible `<a>` (new tab,
    `rel="noopener noreferrer"`) but is styled as a button and no longer
    browser-underlined: `text-decoration: none` on the CTA. Behavior
    unchanged — still no transaction, signature, fund movement, or
    completion marking; the click still only shows the approved toast.
  - New `ButtonIcon` renders the fixed-fill external-link asset as a CSS
    mask painted with `background: currentColor`, so the icon inherits the
    CTA text color instead of its raw black stroke — matching the CTA
    label/border in the enabled state (`color.action.secondary.text.default`
    = #003DFF, verified) and automatically becoming the disabled foreground
    color inside any disabled button (currentColor follows
    `color.text.disabled`). Asset files untouched. Supersedes the earlier
    `<img>` external-link icon.
- **Step 3.4 (complete):** QA polish P1/P3/P4 (app-only, no source-of-truth
  changes; no financial/suggestion/Top Pick/protocol/Smith AI behavior
  changed).
  - **P1:** the Top Pick "Review" button is no longer inert. It calls a page
    `onReviewSuggestion` handler that scrolls to and focuses the
    suggestion's on-dashboard detail area (read-only). For the buffer Top
    Pick that is the Safety Buffer card (`#safety-buffer`, `tabIndex={-1}`),
    matching the suggestions fixture's `action.target = "safety_buffer_detail"`.
    No execution, signature, completion, route, or Top Pick change
    (verified: Top Pick count stays 1 after click).
  - **P3:** AllocationChart now exposes an accessible summary via
    `role="img"` + `aria-label` on the bars container (same pattern as
    ProjectedGrowthChart), built from fixture values only:
    "Current vs Recommended Allocation. Crypto: current 89.3%, recommended
    60%. Stables: current 10.7%, recommended 40%." Not color-only; values
    unchanged.
  - **P4:** AlertBanner is static on the connected dashboard load, so it
    stays a labeled region (no aria-live — avoids noise and is unreliable
    for a conditionally mounted node). Changed `aria-label={title}` to
    `role="region"` + `aria-labelledby` referencing the heading, removing
    the duplicate accessible name.

## Demo Mode slice

- **Demo Step 1 (complete):** demo state/data layer — `state/demoDashboardState.ts`
  (screen chrome from `examples/dashboard/dashboard-demo-state.json`; the
  dashboard alert + each card's protocol_decision/APY/disabled-reason enriched
  from the demo suggestion output `examples/demo-mode/demo-suggestions.json`,
  a documented source relationship), `state/demoSmithAi.ts` (demo-aware
  approved responses + demo fallback), demo copy constants, demo types.
- **Demo Step 2 (complete):** minimal 3-mode app state machine + DemoBanner.
  - `App.tsx` owns `mode: connected | demo | disconnected` and the shared
    ToastHost. Local fixture-driven machine only — no wallet adapters, no
    routing, no live Smith AI.
  - `GlobalNav` is now mode-driven: connected → wallet pill + Ask Smith AI;
    demo → Ask Smith AI only (no pill; Connect Wallet lives in the banner);
    disconnected → Connect Wallet + Try Demo Mode. Wallet menu (Copy Address +
    Disconnect) only in connected.
  - `AskSmithAiPanel` was parameterized to a mode-agnostic `content` prop
    (`SmithAiContent`); connected content assembled in `state/connectedSmithAi.ts`
    (identical to before), demo content in `state/demoSmithAi.ts`. This makes
    the demo Ask Smith AI functional and demo-aware (folding the previously
    planned "demo Smith AI panel" step in here so the nav's Ask Smith AI is
    not a dead control).
  - `DemoBanner` (announcement.md): full-width above Global Nav, `role="status"`
    `aria-live="polite"`, not dismissible, Exit Demo + Connect Wallet.
  - `DemoDashboardPage` is the minimal demo shell (banner + demo nav + demo
    page header + demo rail header + working demo Ask Smith AI). Demo left
    cards / charts / suggestion cards are the next step; the rail shows its
    approved header only for now.
  - Transitions verified: connected↔disconnected, disconnected→demo (Try Demo),
    demo→disconnected (Exit Demo, "Exited Demo Mode" toast), demo→connected
    (Connect Wallet, "Wallet connected" toast). No `demo_` suggestion ids
    appear in connected mode — demo never persists into real mode.
- **Demo Step 3 (complete):** full Demo Mode Dashboard body, rendered by
  REUSING the connected components (PageHeader, AlertBanner, FinancialSnapshot,
  SafetyBufferCard, ProjectedGrowthChart, AllocationChart, SuggestionRail,
  SuggestionCard, AskSmithAiPanel) driven by `demoDashboardState`.
  - Two small data-driven changes to `SuggestionCard` (used by both modes):
    generic icons keyed by category (`safety_buffer` → shield-check) so demo
    ids resolve, and the external-handoff predicate accepts the demo
    eligibility value `eligible_for_demo_handoff` (in addition to `eligible`).
    Connected icons/handoff verified unchanged.
  - **Fixture-shape fix (app-side only):** the demo fixture stores chart
    captions under `copy.caption`, while the charts read `display.caption`
    (as the connected fixture provides); demo allocation has no `display` at
    all, which crashed AllocationChart. Normalized in `demoDashboardState.ts`
    (caption text still from the fixture). Flagged below as a fixture
    inconsistency for the design-system owners.
  - Jupiter handoff toast reuses the approved "Opened protocol in a new tab"
    string (`PROTOCOL_OPENED_TOAST`, from protocol-jupiter-swap.json). Review-
    only: new tab, `rel="noopener noreferrer"`, no execution/signature/
    completion.
  - Verified: demo banner above nav, no wallet pill, snapshot $7,500/$1,000/
    Medium/5 years, Safety Buffer 27%, charts + rail all "sample"-captioned,
    3 demo cards with exactly 1 Top Pick, icons shield-check/jupiter/kamino,
    locked Kamino disabled, demo Ask Smith AI demo-aware, demo→connected
    clears all `demo_` state. No console errors on clean load.
- **Demo Step 3.1 (source-of-truth cleanup, approved):** two fixture
  consistency fixes (design-system fixtures, not app logic).
  - `examples/dashboard/dashboard-demo-state.json`: aligned chart display
    metadata to the connected fixture — `projected_growth` caption moved
    from `copy.caption` into `display.caption` (helper kept in `copy`);
    `current_vs_recommended_allocation` `copy` block renamed to `display`.
    Exact copy, values, chart data, and percentages unchanged.
  - `examples/demo-mode/demo-suggestions.json`: the locked Kamino card's
    `ui.icon` was the nonexistent `assets/icons/ui/lock.svg` (with a
    `fallback_icon_if_missing` workaround). Changed to the approved
    `assets/icons/protocol/kamino.svg` (the protocol-tied icon the app
    already renders from protocol metadata) and removed the fallback field.
    No change to order, locked state, disabled reason, APY, or protocol
    decision/URL.
  - App: the Step-3 caption normalization in `demoDashboardState.ts` is now
    removed (fixtures provide `display.caption` directly). No behavior
    change — verified captions/values/icons render identically.

## Portfolio Overview slice

- **Dashboard alignment (source-of-truth, approved Path A):** aligned the
  connected Dashboard to the fuller $15,500 portfolio in
  `examples/dashboard/dashboard-connected-wallet-state.json` — Portfolio Value
  $7,500→$15,500, projection 15,500/27,500/51,500/75,500 ($1,000/mo, no
  yield), current allocation 76.45/23.55 (recommended 60/40 unchanged),
  portfolio_summary total + deployment totals + stable/volatile + liquid
  percentages, all product-approved values. Safety Buffer, suggestions, Top
  Pick, protocol unchanged.
- **Portfolio Step 1 (complete):** connected Portfolio nav + page shell +
  Asset Deployment Overview.
  - **Navigation:** App holds a connected-only `activePage`
    (`dashboard | portfolio`); Global Nav is now navigable via
    `onNavigate`/`activePage`. All nav clicks `preventDefault` (no dead
    browser navigation in any mode); only Dashboard/Portfolio switch pages
    when connected. Goal/Support and demo/disconnected nav items are safe
    no-ops. Mode transitions reset `activePage` to `dashboard`.
  - **State:** `state/portfolioState.ts` composes from the Portfolio
    fixtures; the yield-strategies fixture is the complete $15,500 source for
    total + deployment segments (Liquid $7,500 / Staked $4,500 / Yield
    $3,500). Page title "Portfolio" (approved label); no invented page
    description.
  - **DeploymentOverview** component: total value + segmented bar (chart
    series tokens 1/2/3) + legend (approved dot markers + label/value/%),
    `role="img"` accessible summary, not color-only. Values verbatim from
    the fixture.
  - **Portfolio page** reuses the connected wallet state for the Global Nav
    pill (same Phantom•6fQ9 wallet); wallet menu (Copy Address + Disconnect,
    with the same approved toasts) is functional.
  - **Portfolio Ask Smith AI (enabled):** available on the connected
    Portfolio page (consistent with Dashboard); opens the same
    `AskSmithAiPanel` shell in the right zone (page becomes two-column while
    open, single-column when closed — no persistent suggestions rail yet).
    Content is `state/portfolioSmithAi.ts`: three fixture-backed prompts
    ("What are Liquid/Staked/Yield Assets?") whose answers are the verbatim
    approved `smith_ai_context` responses from `examples/portfolio/*`; the
    opener + free-form fallback is a generic, safe capability statement
    (no numbers, no advice, no execution — assembled from approved fragments
    + the custody phrase from the liquid fixture). Explain-only; verified a
    free-form advice question ("Should I sell my SOL?") returns only the safe
    fallback.
  - Out of scope this step: Liquid/Staked/Yield tables, Manage protocol
    links, right-rail suggestions, demo Portfolio page. (Portfolio Ask Smith
    AI was folded in above.)
    Verified: Dashboard $15,500 intact, Portfolio nav works, deployment
    $7,500/$4,500/$3,500, demo + disconnected unaffected, no console errors.
- **Portfolio Step 2 (complete):** Liquid Assets table.
  - Reusable `PortfolioTable` (semantic `<table>`, `<th scope="col">`,
    right-aligned numeric column, optional `<tfoot>` summary, approved empty
    state), `AssetIdentity` (token icon + visible name + symbol; icon
    decorative), and `state/iconRegistry.ts` (resolves fixture token-icon
    paths to bundled URLs via `import.meta.glob`; missing token → fallback-
    token.svg + console report, never invented). `LiquidAssetsSection` maps
    the fixture rows into the table.
  - Rendered columns (from `portfolio-liquid-assets.json`): **Asset**
    (icon+name+symbol), **Category** (badge), **Value** (right), **Status**.
    3 fixture rows (SOL/BONK/USDC), summary "Total Liquid Assets $7,500". No
    Manage links (liquid rows have empty `actions`). No amount/balance column
    (the fixture provides none — not invented).
- **Portfolio Step 2.1 (Portfolio Share resolved, approved Option B):**
  - Source-of-truth: `examples/portfolio/portfolio-liquid-assets.json` — the
    three liquid rows' `portfolio_share_percent` + `display_portfolio_share`
    now represent each asset's share of the full $15,500 portfolio
    (product-approved): SOL 73.33→**35.48%**, BONK 16→**7.74%**,
    USDC 10.67→**5.16%** ($5,500/$1,200/$800 ÷ $15,500). Balances, display
    values, total liquid ($7,500), and deployment overview unchanged.
  - App: the **Portfolio Share** column is now rendered from the corrected
    fixture (verbatim `display_portfolio_share`, not computed). Column order
    matches the fixture: Asset · Category · Value · Portfolio Share · Status.
    The summary row shows total value only (no total-share %). Now consistent
    with the deployment overview (35.48+7.74+5.16 = 48.38% ≈ Liquid 48.4%).
  - Accessibility: `PortfolioTable` labels both the section region and the
    `<table>` via `aria-labelledby` → the visible `<h2>` (single accessible
    name, no duplicate literal label).
- **Portfolio Step 2.2 (liquid-total share reconciled, approved):**
  `examples/portfolio/portfolio-liquid-assets.json` — the liquid-total
  portfolio-share metadata now reflects the $15,500 portfolio:
  `summary_row.portfolio_share_percent` 100→**48.39** / `display_portfolio_share`
  "100%"→"48.39%", and `portfolio_summary.liquid_assets_percent` 100→**48.39**
  (= $7,500/$15,500, matching the approved deployment overview). Row shares,
  balances, display values, and total liquid value ($7,500) unchanged. No app
  change needed (these fields aren't rendered — the summary row shows the
  total value only); verified no "100%" appears anywhere in the liquid table.
  The fixture's `total_value_usd` (7500) remains the liquid-section total per
  the composed-view framing.

- **Portfolio Step 3 (complete):** Staked Assets table.
  `examples/portfolio/portfolio-staked-assets.json` rendered via the reusable
  `PortfolioTable` with the fixture's own columns: Asset, Protocol, Type, Value,
  Est. APY, Est. Earnings, Action. New `ProtocolIdentity` (protocol icon +
  visible name) + `resolveProtocolIcon` (assets/icons/protocol/*; **no protocol
  fallback in MVP** — a missing icon is reported and the name renders alone;
  the token fallback is never reused for protocols). Est. APY / Est. Earnings
  render the fixture's preformatted `display` verbatim; JupSOL's unavailable
  APY/earnings show the approved "Unavailable" state (muted, never invented/$0).
  Nothing computed — no APY, earnings, shares, balances, or percentages.
  - **Manage/Action deferred:** the fixture provides Manage handoffs
    (Jito/Marinade/Jupiter), but the external handoff is out of scope this step,
    so the Action column renders a **disabled, non-functional** button showing
    the fixture `action.label`. No href/onClick → nothing navigates, opens a
    tab, executes, signs, or completes (verified: `window.open` not called on
    click). It is wired up in the next step.
  - **No fixture change (no pause needed):** the Staked fixture's
    `portfolio_summary`/`portfolio_share_percent`/summary `display_portfolio_share`
    are a standalone $12,000-subset scenario (Staked = 37.5%), but the Staked
    table has **no Portfolio Share column**, so those fields are not rendered —
    no rendered inconsistency exists. Only the $4,500 staked total is shown,
    which is consistent with the composed $15,500 portfolio.

- **Portfolio Step 4 (complete):** Yield Strategies table.
  `examples/portfolio/portfolio-yield-strategies.json` rendered via the reusable
  `PortfolioTable` with the fixture's own columns: Strategy, Protocol, Assets,
  Value, Est. APY, Est. Earnings, Risk Note, Action. New `YieldStrategiesSection`
  reuses `ProtocolIdentity` + `resolveTokenIcon`; the **Assets** column renders
  the fixture's token list as compact icon + visible symbol per token (LP pairs
  list both sides, e.g. SOL + USDC). Risk notes render as **visible text**
  (`portfolio-table__risk`), never color-only. Est. APY / Est. Earnings render
  the fixture `display` verbatim; the Meteora vault's unavailable APY/earnings
  show the approved muted "Unavailable" (never invented). Nothing computed —
  no APY, earnings, shares, values, percentages, or risk labels.
  - **Manage/Action deferred** (same pattern as Step 3): disabled,
    non-functional button showing the fixture `action.label`
    (Kamino/Orca/Meteora). No href/onClick → nothing navigates, opens a tab,
    executes, signs, or completes (verified: `window.open` not called on click).
  - **No fixture change:** the yield fixture is the canonical complete portfolio
    ($15,500), so its summary/shares are already consistent — no inconsistency,
    no pause. Yield total $3,500 matches the deployment overview.
  - Portfolio page now renders all three deployment tables (Liquid, Staked,
    Yield); the only remaining Portfolio work is wiring the live Manage
    protocol handoffs (review-only, out of scope until a later step).

- **Portfolio Step 5 (complete):** Manage protocol handoffs (Staked + Yield).
  The deferred Manage buttons are now review-only external handoff links via a
  shared `ManageHandoff` component. Where the fixture provides a valid
  `action.destination_url` (validated http(s) in `portfolioState.resolveActionHref`),
  Manage is a real `<a href target="_blank" rel="noopener noreferrer">` styled as
  a secondary button-styled link (reusing `.portfolio-table__manage`), with the
  external-link icon via `ButtonIcon` (inherits text color). URL-less rows keep
  a disabled button (fixture-approved deferred state; missing URL reported, never
  invented). All 6 fixture rows have valid URLs, so all 6 are enabled.
  - **Accessible names** say what opens and where: Staked =
    `Manage {symbol} on {protocol} in a new tab` (e.g. "Manage JitoSOL on Jito in
    a new tab"); Yield = `Manage {strategy} on {protocol} in a new tab` (e.g.
    "Manage SOL/USDC Liquidity on Orca in a new tab"). Visible label stays the
    fixture's `action.label` ("Manage on Jito").
  - **Click behavior:** the anchor opens the protocol in a new tab natively;
    `onClick` only pushes the approved toast
    `connected.transitions.open_protocol_handoff.copy.toast` = "Opened protocol
    in a new tab" (same string the Dashboard/Jupiter handoff uses). No execution,
    no wallet signature, no fund movement, no completion, no portfolio/row state
    change (verified: row content identical before/after click; `window.open`
    not called; row values unchanged).
  - Wired URLs (fixture verbatim): Jito `https://www.jito.network/staking`,
    Marinade `https://marinade.finance`, Jupiter `https://jup.ag`, Kamino
    `https://app.kamino.finance`, Orca `https://www.orca.so`, Meteora
    `https://app.meteora.ag`. Liquid Assets remains Manage-free.

- **Portfolio Step 5.1 (a11y/trust polish — P1/P2/P4 from QA):** no financial,
  APY, earnings, URL, suggestion, Top Pick, or Smith AI behavior changed.
  - **P1 (Label in Name, WCAG 2.5.3):** Manage aria-label now contains the
    visible label verbatim: `${action_label}. Opens ${protocol} in a new tab.`
    (e.g. "Manage on Jito. Opens Jito in a new tab."). Href/target/rel/icon
    unchanged; still review-only toast, no execution.
  - **P2 (surface approved disclaimers):** each staked/yield table now renders a
    muted footnote wired via `aria-describedby` on the `<table>` (announced once
    on table entry — no per-cell noise; visible trust cue for sighted users).
    Copy is the fixtures' own `copy.*_tooltip` **verbatim**, joined with a space,
    missing ones omitted (never invented): Staked = apy_tooltip + earnings_tooltip;
    Yield = apy_tooltip + earnings_tooltip + risk_tooltip. A full hover-tooltip
    component was out of scope for this small pass, and a per-column header
    tooltip would pollute every cell's header announcement (the noise QA warned
    about), so the described-by note is the accessible, non-noisy choice. Liquid
    table has no note. New `PortfolioTable` optional `note` prop.
  - **P4 (DeploymentOverview):** region now uses `aria-labelledby` → the visible
    `<h2 id>` (was a duplicating `aria-label`); the segmented bar keeps its
    `role="img"` accessible summary.

### Step 2 intentional stubs

These render per spec but have no behavior yet (explicitly deferred):

- Wallet pill: renders provider + short address with `aria-haspopup="menu"`,
  but the menu (Disconnect Wallet) is not wired.
- Ask Smith AI button: renders per Global Nav variant 3, click is a no-op.
- Top Pick card CTA "Review" (`open_suggestion_detail`): no detail surface
  exists yet; button is a no-op.
- "Review on Jupiter" CTA: renders with external-link affordance and a
  new-tab accessible label, but does not open the protocol URL yet.
- Portfolio / Goal / Support nav links point at their fixture routes; those
  pages are out of slice scope (the SPA serves the Dashboard for any route).

## Token pipeline

`npm run tokens` (auto-runs before `dev` and `build`) executes
`scripts/build-tokens.mjs`, which:

1. Reads `../tokens/primitives/*.json` (resolution only) and
   `../tokens/semantic/*.json` (emitted).
2. Resolves Tokens Studio `{path}` references — against primitives first,
   then other semantic tokens, with a cycle guard. The build fails
   (exit code 1) on any unresolved reference.
3. Writes `src/styles/tokens.generated.css` (gitignored) containing one
   `:root` CSS custom property per semantic token.

Current output: 234 semantic tokens → 370 CSS custom properties, 0 warnings.

### CSS variable naming convention (mechanical, not invented)

Semantic token paths map 1:1 to variable names: dots → hyphens, camelCase
preserved.

| Token | CSS variable |
|---|---|
| `color.action.primary.background.default` | `--color-action-primary-background-default` |
| `spacing.card.padding.md` | `--spacing-card-padding-md` |
| `typography.body.md` (composite) | `--typography-body-md-font-family`, `-font-size`, `-font-weight`, `-line-height`, `-letter-spacing`, plus `-font` shorthand |
| `shadow.card.default` (boxShadow object) | `--shadow-card-default` (composed `x y blur spread color`) |
| `motion.interaction.hover` (composite) | `--motion-interaction-hover-duration`, `-easing`, `-property` |

## Assumptions and deviations log

1. **Fonts load from Google Fonts CDN** (Manrope, Space Grotesk — the two
   families defined in `tokens/primitives/typography.json`). The repo ships
   no font files under `assets/`. If fonts must be self-hosted, that needs a
   product decision (font files would have to be added outside `app/` or
   vendored into `app/`).
2. **Feedback color naming mismatch:** component specs reference shorthand
   names like `color.feedback.info` / `color.feedback.warning`, but the
   actual semantic tokens are granular:
   `color.feedback.{info|success|warning|danger}.background.{solid|tint}` and
   `.text.{onSolid|tint}`. Per approval constraint 4 (existing tokens only),
   the app maps spec intents to the granular tokens. No shorthand aliases
   were created.
3. **Global Nav explicit sizing:** `components/global-nav.md` recommends
   token names (`size.globalNav.height`, `radius.globalNav`, …) that do not
   exist in `tokens/semantic/`. Per constraint 4, step 2 will use the
   component-spec explicit values (height 64px, radius 16px, outer offset
   24px, content padding-x 12px, logo 221×32) directly and record them here.
   Note: `radius.xl` = 16px happens to match the nav radius, but no semantic
   nav-radius token exists, so the spec value is used as specified.
4. **Media queries:** breakpoint tokens are emitted as CSS variables for
   reference, but CSS custom properties cannot be used inside `@media`
   conditions. Step 2 will use the breakpoint values from
   `tokens/semantic/breakpoint.json` (mobile 320–767, tablet 768–1279,
   desktop 1280–1727, wide 1728+) as literal values in media queries, which
   is the approved system, not an invention.
5. **Approved assets** will be referenced from `../assets/` (served
   read-only via Vite `server.fs.allow`), never copied or modified.
6. ~~`src/App.tsx` is a temporary token smoke test~~ — replaced in step 2 by
   the Dashboard page.
7. **`spacing.control.*` padding tokens do not exist.** Component specs
   reference control padding only abstractly; buttons, nav items, badges,
   and pills map to the closest existing semantic tokens:
   `spacing.inline.gap.sm` (8px) for control padding-y,
   `spacing.inline.gap.md` (16px) for control padding-x,
   `spacing.inline.gap.xs` (4px) for badge padding-y. No new token names
   were created.
8. **Missing tokens with documented substitutes:**
   `color.icon.default` → icons render as approved SVG assets unmodified
   (never recolored); `color.surface.page` → `color.surface.main`;
   `zIndex.navigation.fixed` → `zIndex.navigation.primary`.
9. **Alert severity styling:** the fixture alert (severity `critical`)
   uses `color.feedback.danger.*` tokens with the state carried in text
   (title + description), never color alone. No badge copy was added
   beyond fixture-provided strings.
10. **Number presentation:** chart/allocation labels format the fixture's
    raw numbers for display only (`$7,500` via locale formatting, percents
    to at most one decimal). No values are computed or altered in meaning.
11. **Global Nav below desktop:** components/global-nav.md defines no mobile
    variant and forbids inventing hamburger behavior. Below 1280px the nav
    keeps all items visible in the same order and simply wraps
    (`flex-wrap`, `min-height: 64px`); at desktop it is fixed at 64px with
    no wrapping per spec. Revisit when a mobile nav spec exists.
12. **Fixture source for the rail is the dashboard fixture (3 cards).**
    `examples/suggestions/suggestions-buffer-underfunded.json` (4 cards,
    adds a strategy insight) remains the per-card contract/QA reference;
    the page-level fixture declares `suggestions_count: 3` and is treated
    as the page source of truth.

## Commands

```bash
cd app
npm install
npm run tokens   # regenerate tokens.generated.css
npm run dev      # tokens + dev server (port 5173)
npm run build    # tokens + type-check + production build
```

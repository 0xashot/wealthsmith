# Protocol Selection Rules

This rule file defines how WealthSmith selects, renders, and hands users off to protocols/platforms for actionable suggestions.

Protocol selection is deterministic product logic.

It must not be chosen by UI components, Smith AI, or card copy.

---

## Purpose

Protocol Selection answers:

```text
Where should the user go to review or complete this suggested action?
```

The Suggestion Engine decides what action is useful.

Protocol Logic decides where that action should be reviewed.

The UI renders the destination.

Smith AI explains the destination.

---

## Core Hard Rules

Hard Rule:

```text
Suggestion Engine decides what to do.
Protocol Logic decides where to go.
UI renders the selected destination.
Smith AI explains the selected destination.
```

Hard Rule:

```text
The UI must not choose protocols.
Smith AI must not choose protocols.
Claude Code must not choose protocols outside approved deterministic Protocol Logic.
```

Hard Rule:

```text
MVP protocol interactions are external handoffs.
They do not execute transactions inside WealthSmith.
They do not request wallet signatures from WealthSmith suggestion cards.
```

---

## Layer Responsibilities

### Suggestion Engine

Decides:

```text
Recommended action type
Suggested token/action
Eligibility
Priority
Top Pick candidate data
Reason codes
```

Examples:

```text
Fund Safety Buffer
Reduce volatile exposure
Stake idle SOL
Deploy idle USDC
Review yield strategy
```

Does not decide:

```text
Which external protocol URL to open
Which protocol is best for execution
Protocol routing details
Protocol-specific UI behavior
```

---

### Protocol Logic

Decides:

```text
Destination protocol
Destination platform
Protocol eligibility
Protocol exclusion
Protocol priority
Handoff URL source
Protocol-specific action metadata
```

Examples:

```text
Swap route -> Jupiter
SOL staking route -> Jito / Marinade / Sanctum / Jupiter, depending on product rules
Stablecoin yield route -> Kamino / Hubble / Meteora, depending on product rules
LP strategy route -> Orca / Raydium / Meteora, depending on product rules
RWA route -> Ondo, if supported for the action
```

---

### UI

Renders:

```text
Protocol name
Protocol icon
Protocol CTA
Manage link
Open-in-new-tab behavior
Disabled/locked state
Unsupported state
```

Does not decide:

```text
Which protocol to recommend
Which protocol is eligible
Which protocol URL to use
Which APY to show
Which action is safe
```

---

### Smith AI

Explains:

```text
Why this protocol is shown
What the user will review externally
Why another protocol may not be shown
What the handoff means
That no action is taken automatically
```

Does not decide:

```text
Protocol destination
Protocol ranking
Protocol eligibility
Protocol APY
Protocol support
```

---

## Supported MVP Protocols

Approved MVP protocol icons exist for:

```text
hubble
jito
jupiter
kamino
marinade
meteora
ondo
orca
raydium
sanctum
```

Approved protocol icon paths:

```text
assets/icons/protocol/hubble.svg
assets/icons/protocol/jito.svg
assets/icons/protocol/jupiter.svg
assets/icons/protocol/kamino.svg
assets/icons/protocol/marinade.svg
assets/icons/protocol/meteora.svg
assets/icons/protocol/ondo.svg
assets/icons/protocol/orca.svg
assets/icons/protocol/raydium.svg
assets/icons/protocol/sanctum.svg
```

Rules:

- Do not invent supported protocols.
- Do not show unsupported protocol destinations.
- Do not show broken protocol icons.
- Protocol icons must be paired with visible protocol names.
- Missing protocol icon is an implementation issue for MVP.
- Protocol support must match approved product/protocol metadata.

---

## Supported MVP Action Families

MVP protocol selection may support these action families:

```text
swap
stake_sol
liquid_staking
stablecoin_lending
vault_deposit
lp_strategy
rwa_access
position_management
```

Rules:

- Action family comes from Suggestion Engine.
- Protocol Logic maps action family to eligible protocols.
- UI must not infer action family from title text.
- Smith AI must not invent action family.

---

## Protocol Selection Inputs

Protocol Logic may use:

```text
suggestion_type
action_type
source_token
destination_token
token_category
user_goal
risk_tolerance
time_horizon
safety_buffer_status
wallet_positions
protocol_positions
supported_protocol_metadata
supported_token_metadata
apy_data
liquidity_data
cost_data
slippage_data
route_availability
position_size
asset_lock_status
```

Rules:

- Inputs must come from structured product data.
- Do not parse freeform Smith AI text to choose protocol.
- Do not infer protocol from screenshot or visual label.
- Do not use unsupported or stale metadata for handoffs.

---

## Protocol Selection Output

Protocol Logic should return structured destination metadata.

Recommended output:

```json
{
  "destination_protocol_id": "jupiter",
  "destination_label": "Jupiter",
  "destination_icon": "assets/icons/protocol/jupiter.svg",
  "handoff_type": "external_new_tab",
  "url_source": "approved_protocol_metadata",
  "action_family": "swap",
  "supported": true,
  "reason_codes": ["best_supported_swap_handoff"],
  "eligibility_status": "eligible"
}
```

If no protocol is available:

```json
{
  "destination_protocol_id": null,
  "destination_label": null,
  "handoff_type": null,
  "supported": false,
  "eligibility_status": "no_supported_protocol",
  "reason_codes": ["no_supported_protocol_for_action"]
}
```

Rules:

- UI renders destination metadata.
- UI does not create destination metadata.
- Destination URL must come from approved metadata.
- Do not guess protocol URLs from protocol labels.
- If no destination exists, show disabled/unsupported state.

---

## Handoff Type

MVP handoff type:

```text
external_new_tab
```

Meaning:

```text
The user opens the approved protocol/platform page in a new browser tab.
```

Hard Rule:

```text
MVP protocol handoff is not execution.
```

Allowed:

```text
Open protocol page
Open manage page
Open external protocol in new tab
Show new-tab indicator
Tell user to review externally
```

Not allowed:

```text
Build transaction
Submit transaction
Request signature
Auto-stake
Auto-swap
Auto-deposit
Auto-withdraw
Auto-claim
```

CTA examples:

```text
Open Jupiter
Review on Kamino
Manage on Jito
Open protocol
```

Avoid:

```text
Execute now
Confirm trade
Swap now
We’ll rebalance
Auto-deploy
```

---

## External URL Rules

Hard Rule:

```text
Protocol URLs must come from approved protocol metadata.
```

Rules:

- Do not hardcode random URLs inside suggestion card components.
- Do not guess URL from protocol name.
- Do not use unverified URLs from Smith AI.
- Do not use user-supplied URLs.
- Do not open unsupported or unknown domains.
- Open in a new tab for MVP.
- Use safe external-link behavior.
- Indicate when the user is leaving WealthSmith.
- Use `rel="noopener noreferrer"` for external links.

Example:

```json
{
  "protocol_id": "jupiter",
  "label": "Jupiter",
  "base_url": "approved_metadata_value",
  "supported_actions": ["swap", "dca"]
}
```

---

## Protocol Eligibility

A protocol can be eligible only if:

```text
Protocol is approved for MVP
Protocol supports the action family
Protocol supports the token/action
Protocol metadata is available
Protocol URL is approved
Protocol icon is available
Protocol is not disabled by product config
Protocol data is fresh enough for the action
```

A protocol must be excluded if:

```text
Unsupported action
Unsupported token
Unsupported route
Missing approved URL
Missing required metadata
Known outage/disabled state
Action would break Safety Buffer
APY/liquidity data unavailable when required
Position below minimum threshold
Asset locked
```

Rules:

- Eligibility must be deterministic.
- UI must not override eligibility.
- Smith AI must not override eligibility.
- If a protocol is excluded, the reason should be structured if shown.

---

## Selection Priority

Protocol selection should prioritize:

```text
1. Safety
2. Support and reliability
3. Action fit
4. Liquidity / availability
5. Cost / slippage
6. Simplicity
7. Yield or efficiency
8. User clarity
```

Hard Rule:

```text
Yield must not outrank safety.
```

Rules:

- Highest APY should not automatically win.
- Lowest cost should not win if action fit is poor.
- Familiar protocol should not win if unsupported for the action.
- Selection must remain deterministic.
- Product config can disable or deprioritize protocols.

---

## Safety Buffer Interaction

Hard Rule:

```text
If Safety Buffer is underfunded, yield and additional volatile deployment protocols should be locked or deprioritized unless the action directly helps fund the buffer.
```

Rules:

- Buffer-funding suggestions may route to a swap protocol if supported.
- Yield suggestions should not route to lending/vault/LP protocols while buffer is underfunded.
- Locked opportunities may show protocol context but must not encourage action.
- UI must not make locked yield opportunities clickable as active recommendations.

Example:

```text
Underfunded buffer:
  Top Pick: Swap BONK to USDC
  Protocol destination: Jupiter

Locked:
  Deploy idle USDC to yield
  Unlock condition: Fund Safety Buffer first
```

---

## Protocol Mapping Guidelines

These are mapping guidelines, not UI rules.

Protocol Logic should own final selection.

### Swap / Rebalance

Likely protocol family:

```text
jupiter
```

Use for:

```text
Swap volatile token to USDC
Reduce volatile exposure
Rebalance token allocation
```

Rules:

- Must pass route/liquidity/slippage checks.
- Must use approved Jupiter metadata.
- Must not execute swap from WealthSmith in MVP.

---

### SOL Staking / Liquid Staking

Potential protocol family:

```text
jito
marinade
sanctum
jupiter
```

Use for:

```text
Stake idle SOL
Review liquid staking option
Manage liquid staking position
```

Rules:

- Selection depends on product-approved staking logic.
- Do not assume one staking provider always wins.
- Must consider token support and position type.
- Must not stake from WealthSmith in MVP.

---

### Stablecoin Lending / Borrow-Lend

Potential protocol family:

```text
kamino
hubble
```

Use for:

```text
Deploy idle stablecoins
Review stablecoin lending strategy
Manage lending position
```

Rules:

- Only after Safety Buffer is satisfied.
- APY must come from approved/fresh source.
- Must not imply stablecoin yield is risk-free.
- Must not deposit from WealthSmith in MVP.

---

### Vaults / Yield Strategies

Potential protocol family:

```text
kamino
meteora
orca
raydium
```

Use for:

```text
Review vault strategy
Manage existing yield strategy
Deploy capital if eligible
```

Rules:

- Must consider risk profile.
- Must consider Safety Buffer.
- Must use sourced APY/earnings data.
- Must distinguish lending, LP, and vault strategies.
- Must not imply guaranteed yield.

---

### LP Strategies

Potential protocol family:

```text
orca
raydium
meteora
```

Use for:

```text
Existing LP position management
LP yield strategy review
Potential LP opportunity if supported
```

Rules:

- Must account for risk suitability.
- Must not suggest LP to low-risk users unless product logic allows it.
- Must not hide impermanent-loss or risk context when relevant.
- Must not create LP recommendations from token holdings alone.

---

### RWA Access

Potential protocol family:

```text
ondo
```

Use for:

```text
RWA-related informational or future-stage suggestions when supported
```

Rules:

- Not assumed as MVP execution.
- Must not claim stock/RWA purchasing support unless product supports it.
- Must not invent availability by region or user eligibility.
- Must use canonical product/roadmap support.

---

### Existing Position Management

Potential protocol family:

```text
Protocol where position exists
```

Use for:

```text
Manage on Kamino
Manage on Jupiter
Manage on Orca
Manage on Jito
```

Rules:

- If user has an existing position, manage link should go to that protocol.
- Position detection must come from portfolio/protocol logic.
- UI must not infer protocol from token symbol alone.
- Manage link opens protocol page in new tab for MVP.
- Manage link does not execute transaction.

---

## Existing Positions vs New Opportunities

Protocol Logic must distinguish:

```text
Existing position management
New suggested opportunity
```

Existing position management:

```text
User already has position on protocol.
Show Manage link.
Open that protocol in new tab.
```

New suggested opportunity:

```text
Suggestion Engine recommends action.
Protocol Logic selects eligible destination.
Open selected protocol in new tab.
```

Rules:

- Existing position does not automatically mean new capital should be added there.
- New opportunity does not automatically mean user already has position there.
- Manage links should not be treated as Top Pick by default.
- Portfolio table Manage links are read-only handoffs for MVP.

---

## APY and Yield Data

Protocol selection may use APY/yield data.

Hard Rule:

```text
APY must come from approved data source.
```

Rules:

- UI must not invent APY.
- Smith AI must not invent APY.
- Protocol Logic must not use stale APY unless product explicitly supports stale-marked display.
- Highest APY should not automatically determine protocol.
- APY should be shown as estimated/current/variable where appropriate.
- Yield opportunities must include risk-aware copy.
- If APY data is missing, do not show APY-based recommendation.

Allowed language:

```text
Estimated APY
Current quoted APY
APY can change
```

Avoid:

```text
Guaranteed APY
Risk-free yield
Fixed return
```

---

## Cost, Liquidity, and Slippage

Protocol Logic should consider:

```text
Estimated transaction cost
Route availability
Liquidity
Slippage
Minimum size
Operational complexity
```

Known MVP thresholds from Top Pick guardrails:

```text
Minimum trade size: $50
Slippage rejection example: > 0.5%
Idle capital trigger: >= $250
```

Rules:

- High cost may exclude protocol/action.
- Invalid liquidity must exclude protocol/action.
- Excessive slippage must exclude protocol/action.
- UI must not calculate these thresholds.
- Smith AI must not invent these thresholds.
- If excluded, show reason only if product logic provides it.

---

## Protocol Status

Protocols may have status:

```text
enabled
disabled
degraded
unsupported
coming_later
```

Rules:

- Disabled protocols should not be shown as active destinations.
- Degraded protocols may be shown only if product logic allows it and copy is clear.
- Unsupported protocols should not appear in MVP protocol handoffs.
- Coming-later protocols should not be shown as actionable.
- Protocol status must come from metadata/config.

---

## Unsupported State

If no supported protocol exists for a valid suggestion:

Use safe copy:

```text
No supported protocol available
We cannot route this action from WealthSmith right now.
```

Rules:

- Do not guess an alternative protocol.
- Do not hide the suggestion if it is important, unless product logic says so.
- Do not show a clickable CTA without approved destination.
- Smith AI may explain that no supported destination is available.
- Contact/support may be offered for confusion, but not as execution path.

---

## Locked State

If protocol action is locked:

Example:

```text
Unlock after your Safety Buffer is fully funded.
```

Rules:

- Do not show primary handoff CTA.
- Do not open protocol as if actionable.
- May show educational explanation.
- May show protocol name only if product logic supports preview.
- Must not imply the user should act now.

---

## Protocol Icons

Protocol icons must use approved assets.

Rules:

- Use `assets/icons/protocol/`.
- Pair icon with visible protocol name.
- Do not use icon alone.
- Do not recolor branded protocol icons unless allowed by asset rules.
- Do not show fallback protocol icon for MVP.
- Missing protocol icon is an implementation issue.
- Do not use token icons as protocol icons.
- Do not use wallet icons as protocol icons.

---

## New Tab Behavior

MVP protocol handoffs open in a new tab.

Rules:

- Open approved protocol URL in new tab.
- Indicate external action where appropriate.
- Use external-link icon if component supports it.
- Preserve WealthSmith state in original tab.
- Do not mark suggestion completed just because the new tab opened.
- Do not assume user completed the action externally.
- Refresh wallet/protocol data later to detect completion.

Accessibility:

```text
Announce that link opens in a new tab where practical.
```

Security:

```text
Use rel="noopener noreferrer".
```

---

## Completion Boundary

Hard Rule:

```text
Opening a protocol page does not mean the suggestion was completed.
```

A suggestion may be completed only when product logic detects the underlying condition changed.

Examples:

```text
Wallet balance changed
Protocol position changed
Safety Buffer funded
Allocation corrected
Yield position opened
Staked asset detected
```

Rules:

- Do not mark action complete on click.
- Do not mark action complete on external tab open.
- Do not show success toast implying execution happened.
- Use neutral handoff copy.

Good:

```text
Opened Jupiter in a new tab.
Review the action there before continuing.
```

Avoid:

```text
Rebalance completed.
Funds moved.
Trade executed.
```

---

## Demo Mode Protocol Handoffs

Demo Mode may show protocol names and sample suggestions.

Rules:

- Demo protocol handoffs should be clearly sample/demo.
- Demo Mode should not mix real wallet state.
- Demo handoff may open protocol page only if product allows demo exploration.
- Demo handoff must not imply real action was recommended for the user’s real wallet.
- Exiting Demo clears demo suggestions and protocol destinations.

Hard Rule:

```text
Demo protocol destinations must not persist into real wallet mode.
```

---

## Smith AI Protocol Explanation

Smith AI may say:

```text
WealthSmith selected Jupiter because this suggestion is a swap handoff and Jupiter is the supported swap destination for this action.
```

Smith AI may not say:

```text
I chose Jupiter because I think it is best.
```

Smith AI must not:

```text
Invent protocol destinations
Invent protocol support
Invent APY
Invent URLs
Claim a protocol is safe
Claim yield is guaranteed
Tell users a transaction was executed
```

Smith AI should clarify:

```text
No action is taken automatically.
You’ll review the action on the external protocol.
```

---

## Support Content Boundary

Support/FAQ may describe supported protocols.

Rules:

- Support content must match approved protocol metadata.
- Smith AI must not invent protocol support from memory.
- If support content and Smith AI conflict, support/protocol metadata wins.
- Protocol support claims should be updated when product config changes.
- Do not promise future protocol support unless roadmap content explicitly supports it.

---

## Protocol Metadata Contract

Recommended metadata:

```json
{
  "protocol_id": "jupiter",
  "label": "Jupiter",
  "icon": "assets/icons/protocol/jupiter.svg",
  "status": "enabled",
  "supported_action_families": ["swap", "dca"],
  "supported_tokens": ["SOL", "USDC", "USDT", "BONK", "JUP", "JTO"],
  "handoff": {
    "type": "external_new_tab",
    "url_source": "approved_metadata",
    "base_url": "approved_value"
  },
  "risk_notes": ["external_protocol", "review_before_action"]
}
```

Rules:

- Metadata is the source of protocol labels, icons, status, and URLs.
- UI should reference metadata, not invent data.
- Protocol status can disable destinations.
- Protocol support should be testable.

---

## Suggestion Protocol Contract

A suggestion with a protocol destination should include:

```json
{
  "suggestion_id": "swap_bonk_to_usdc",
  "action": {
    "type": "swap_to_stablecoin",
    "source_token": "BONK",
    "destination_token": "USDC"
  },
  "protocol": {
    "destination_protocol_id": "jupiter",
    "destination_label": "Jupiter",
    "handoff_type": "external_new_tab",
    "url_source": "approved_protocol_metadata",
    "eligibility_status": "eligible"
  }
}
```

Rules:

- Suggestion data references protocol ID.
- Protocol metadata resolves URL/icon/status.
- UI renders both.
- UI does not create the protocol object.

---

## Error States

Possible protocol-selection errors:

```text
no_supported_protocol
protocol_metadata_missing
protocol_disabled
url_missing
apy_unavailable
liquidity_unavailable
route_unavailable
slippage_too_high
unsupported_token
unsupported_action
```

Rules:

- Show safe, calm copy.
- Do not invent alternate destination.
- Do not show broken CTA.
- Keep suggestion visible if it matters, but disable action if destination missing.
- Smith AI may explain missing destination if structured reason exists.

Example:

```text
Protocol unavailable
We can’t route this action from WealthSmith right now.
```

---

## QA Checklist

Before shipping protocol handoffs, verify:

```text
Does every protocol-backed suggestion have a supported protocol ID?
Does every protocol ID exist in metadata?
Does every protocol have an approved URL?
Does every protocol have an approved icon?
Does every handoff open in a new tab?
Does every external link use safe rel attributes?
Does no card execute transactions in MVP?
Does no card request signatures in MVP?
Does no UI choose protocol locally?
Does Smith AI avoid inventing protocol support?
Does Demo Mode avoid persisting protocol state into real mode?
Does missing protocol data show safe disabled state?
```

---

## Related Files

Rules:

```text
rules/financial-logic-boundaries.md
rules/suggestion-engine-rules.md
rules/top-pick-rules.md
rules/wallet-and-custody-rules.md
rules/demo-mode-rules.md
rules/smith-ai-rules.md
```

Components:

```text
components/suggestion-card.md
components/table.md
components/icon.md
components/button.md
```

Patterns:

```text
patterns/suggestion-flow.md
patterns/portfolio-overview.md
patterns/wallet-connection.md
patterns/dashboard-layout.md
patterns/empty-loading-error-states.md
```

Assets:

```text
assets/icons/protocol/
assets/icons/icon-registry.json
```

---

## Claude Code Rules

Claude Code should:

- Use Protocol Logic output for destination protocol.
- Use approved protocol metadata for URLs and icons.
- Use protocol IDs, not display names, as source of truth.
- Render protocol name and icon together.
- Open protocol pages in new tabs for MVP.
- Use `rel="noopener noreferrer"` for external links.
- Disable CTA when protocol destination is missing or unsupported.
- Keep protocol handoff separate from transaction execution.
- Keep existing position Manage links as read-only handoffs.
- Preserve Demo Mode and real wallet separation.
- Use safe error states when metadata is missing.

Claude Code must not:

- Choose protocols in UI components.
- Guess protocol URLs.
- Invent supported protocols.
- Invent APY.
- Infer protocol from token symbol alone.
- Use Smith AI output as protocol metadata.
- Execute transactions from suggestion cards.
- Request wallet signatures from suggestion cards.
- Mark suggestions completed on click.
- Show unsupported protocols as actionable.
- Use fallback protocol icons in MVP.
- Mix demo protocol destinations with real wallet suggestions.

---

## Do

- Keep protocol selection deterministic.
- Use approved protocol metadata.
- Use approved protocol icons.
- Open external protocols in new tabs for MVP.
- Explain that users review actions externally.
- Keep Safety Buffer priority above yield.
- Disable unsupported destinations safely.
- Keep Smith AI explanatory.
- Keep protocol IDs stable.
- Keep Demo Mode separate.

---

## Do Not

- Do not let UI choose protocols.
- Do not let Smith AI choose protocols.
- Do not route to unknown URLs.
- Do not show broken protocol icons.
- Do not execute transactions in MVP.
- Do not request signatures from suggestion card clicks.
- Do not treat opening a protocol as completing the suggestion.
- Do not choose highest APY automatically.
- Do not imply protocol handoff is risk-free.
- Do not invent protocol support.
- Do not mix demo and real destinations.

---

## Done Criteria

This rule is followed when:

- Protocol destination comes from Protocol Logic.
- Protocol URL comes from approved metadata.
- Protocol icon comes from approved assets.
- UI renders protocol destination but does not choose it.
- Smith AI explains protocol selection but does not choose it.
- MVP protocol handoffs open in new tabs.
- Suggestion cards do not execute transactions.
- Suggestion cards do not request signatures.
- Opening a protocol does not mark suggestion complete.
- Unsupported/missing protocol data creates safe disabled state.
- Yield/APY protocol choices use sourced data only.
- Safety Buffer priority can lock yield protocol handoffs.
- Demo protocol destinations do not persist into real wallet mode.

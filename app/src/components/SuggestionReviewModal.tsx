/**
 * SuggestionReviewModal — renders a real-wallet suggestion's engine-owned
 * `reviewDetails` (Step 10A) in an accessible modal (Step 10B). It ONLY renders
 * structured data the engine already produced:
 *  - it never generates suggestions, runs AI, or invents APY/TVL/risk/liquidity/
 *    slippage/route/protocol data;
 *  - it never executes a transaction, requests a signature, moves funds, or
 *    hands off to a protocol — it is read-only;
 *  - it shows guardrails as friendly grouped labels, never raw internal codes.
 *
 * Reuses the shared `.modal` / `.modal-scrim` pattern (see ConnectWalletModal)
 * for consistent dialog semantics, focus handling, and theming.
 */
import { useEffect, useId, useRef, useState } from "react";
import ButtonIcon from "./ButtonIcon";
import Badge from "./Badge";
import InfoPopover from "./InfoPopover";
import { useScrollLock } from "./useScrollLock";
import { useIsMobileViewport } from "./useIsMobileViewport";
import SolStakingLeaderExplanation from "./SolStakingLeaderExplanation";
import closeUrl from "../../../assets/icons/ui/close.svg";
import chevronLeftUrl from "../../../assets/icons/ui/chevron-left.svg";
import { SWAP_CONFIRM_BACK_LABEL } from "../state/approvedCopy";
import externalLinkUrl from "../../../assets/icons/ui/external-link.svg";
import { resolveTokenIcon, resolveProtocolIcon } from "../state/iconRegistry";
import fallbackTokenUrl from "../../../assets/icons/fallback/fallback-token.svg";
import type {
  ReviewMetric,
  SuggestionReviewDetails,
} from "../suggestions/engineTypes";
import type { ContributionPlanReviewDetails } from "../suggestions/contributionPlanReviewDetails";
import type { StableYieldReviewPresentation } from "../suggestions/yieldStrategyPlanPresentationTypes";
import { cardProtocolName } from "../suggestions/yieldStrategyPlanPresentation";
import type { SwapActionContext, SwapActionReadiness, SwapQuoteComparisonAssessment } from "../suggestions/swapQuote/swapQuoteContracts";
import type { DemoExecutionOutcome } from "../suggestions/swapExecution/demoOutcomes";
import type { SwapQuoteFetcher } from "../suggestions/swapQuote/swapQuoteClient";
import SwapQuoteComparisonSection, { type SwapQuoteState } from "./swapQuote/SwapQuoteComparisonSection";
import SwapExecutionSection from "./swapExecution/SwapExecutionSection";
import InfoBanner from "./InfoBanner";
import AssetIdentity from "./AssetIdentity";
import ModalActionsFooter from "./ModalActionsFooter";

interface Props {
  /** The engine review details (existing suggestion families). Optional when `contributionReview` is set. */
  details?: SuggestionReviewDetails;
  /** Step 15H — plan-backed contribution review sections. When present, the modal renders these. */
  contributionReview?: ContributionPlanReviewDetails;
  /** Step 16H-C — deterministic Stable Yield review presentation. When present, the modal renders it. */
  stableYieldReview?: StableYieldReviewPresentation;
  /**
   * Show the internal Guardrails section (Checked / Not evaluated yet / Not applicable). This is a
   * TESTING-ONLY diagnostic that proves the engine's guardrail logic; the /testing gallery passes it.
   * Real Wallet and Demo omit it (default hidden) so users never see the internal checklist.
   */
  showGuardrails?: boolean;
  /**
   * Step 23C — the exact quote-ready action for a Rebalance / Trim / eligible-DCA suggestion. When present, the
   * read-only "Suggested route" section renders inside this modal (after the recommendation). It NEVER changes the
   * financial suggestion. Omitted for families with no swap (buffer / staking / stable yield).
   */
  swapAction?: SwapActionReadiness;
  /** True for DCA (drives not-ready copy). */
  swapQuoteIsDca?: boolean;
  /** Injected fetcher (real client by default); the /testing gallery injects deterministic presets instead. */
  swapQuoteFetcher?: SwapQuoteFetcher;
  /** Deterministic gallery override: preset assessment per legId (no live fetch). */
  swapQuotePresetAssessments?: Record<string, SwapQuoteComparisonAssessment>;
  /** Deterministic gallery override: force the loading state. */
  swapQuotePresetLoading?: boolean;
  /** Fixed clock for deterministic gallery rendering. */
  swapQuoteNowMs?: number;
  /**
   * Acknowledge an OBSERVATION ("I've reviewed this, I'm fine with it"). Present
   * only for observation cards; passing it renders the sticky Cancel / Dismiss
   * footer. It hides the card for THIS situation only — the engine re-raises it
   * once the underlying condition materially changes.
   */
  onDismiss?: () => void;
  onClose: () => void;
  /**
   * The swap quote gave up after refreshing its allowance with the modal in front of someone.
   *
   * The modal closes itself and the page says so in a toast — a review that has quietly
   * re-quoted three times without a decision is no longer worth holding the screen. Absent
   * leaves the expired card in place instead, so a host that has no toast still behaves.
   */
  onSwapQuoteGaveUp?: () => void;
  /**
   * Demo Mode. The confirm step still opens, built from the demo quote, with Approve shown
   * unavailable and the reason on hover — so an evaluator sees the flow through to its last
   * step instead of a dead end where the interesting part should be.
   */
  demo?: boolean;
  /** Demo Mode only — the walkthrough's chosen outcome. See SwapExecutionSection. */
  demoOutcome?: DemoExecutionOutcome | null;
}

/** Whole-dollar USD, e.g. "$8,176". No fake precision. */
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
/** At most one decimal, trailing ".0" trimmed. */
const num1 = (n: number) => {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};
/** Token amount with thousands separators (portfolio-style), up to 6 decimals. */
const tokenAmount = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 6 });
/** Whole-token amount (mobile), e.g. 15,255.4847 → "15,255" — truncated so it
 *  never rounds up past the real balance. */
const tokenAmountWhole = (n: number) => Math.trunc(n).toLocaleString("en-US");

/** Format a metric value using its kind/unit — never invents precision. */
function formatMetric(m: ReviewMetric): string {
  if (typeof m.value === "string") return m.value;
  switch (m.kind) {
    case "amount_usd":
      return usd(m.value);
    case "allocation_pct":
    case "percent":
      return `${num1(m.value)}%`;
    case "months":
      return `${num1(m.value)} months`;
    case "token_amount":
      return `${num1(m.value)}${m.unit ? ` ${m.unit}` : ""}`;
    case "count":
      return String(m.value);
    default:
      return `${m.value}${m.unit ? ` ${m.unit}` : ""}`;
  }
}

/** Format a calculation number by unit (USD / % / raw). */
function formatCalcValue(v: number, unit?: string): string {
  if (unit === "USD") return usd(v);
  if (unit === "%") return `${num1(v)}%`;
  return `${num1(v)}${unit ? ` ${unit}` : ""}`;
}

export default function SuggestionReviewModal({ details, contributionReview, stableYieldReview, showGuardrails, swapAction, swapQuoteIsDca, swapQuoteFetcher, swapQuotePresetAssessments, swapQuotePresetLoading, swapQuoteNowMs, onDismiss, onClose, onSwapQuoteGaveUp, demo, demoOutcome }: Props) {
  useScrollLock();
  // Mobile: token amounts in the modal tables are shown whole (no decimals).
  const isMobile = useIsMobileViewport();
  const amountFmt = isMobile ? tokenAmountWhole : tokenAmount;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const reasonId = useId();
  // Phase 6 — the state of the route comparison, reported by the route section: the assessment
  // (once there is one), whether a request is in flight, and a quiet refresh. The Boundary
  // still has to say yes after that.
  const [quoteState, setQuoteState] = useState<SwapQuoteState | null>(null);
  /**
   * THE ONE SWAP THIS REVIEW CAN OFFER, read straight from the prop rather than from anything
   * the route section reports later.
   *
   * A review for a single-leg swap has exactly one footer for its whole life — Cancel and Swap
   * — and that has to be known on the first render. It used to be decided by what had been
   * reported so far, so the footer went through three owners while the comparison loaded: a
   * static "Swap on Jupiter" link, then a live "Swap on <provider>" link, then the Swap button
   * — and when the Swap button withdrew (an aged quote, a wallet not yet connected) the modal
   * was left with no footer at all, because the element that rendered nothing was still an
   * element and the fallback behind `??` was never reached.
   *
   * There is no link out to a provider any more. A swap WealthSmith suggests is approved here.
   */
  const swapLeg: SwapActionContext | null =
    swapAction && !details?.hideSwapRoute && swapAction.status === "ready" && swapAction.legs.length === 1
      ? swapAction.legs[0]
      : null;
  /**
   * True while the confirm step is open. It is a SUBPAGE of this review: the heading and body
   * give way so the step owns the modal, and its back control brings them back. Someone
   * answering "approve this swap?" should not have to scroll past the reasoning that led them
   * here — they have read it, and leaving it on screen buries the question.
   *
   * The body is HIDDEN, not unmounted. The route comparison lives inside it and is what
   * supplies `quoteState`; unmounting it took the execution context away and the confirm
   * step vanished the instant it was asked for. Hiding also keeps the quote it already
   * fetched, so Back does not pay for a refetch.
   */
  const [swapStep, setSwapStep] = useState<{ active: boolean; onBack: () => void; title: string } | null>(null);
  const swapStepActive = swapStep?.active === true;
  const bodyClass = `review-modal__body${swapStepActive ? " review-modal__body--behind-subpage" : ""}`;

  // The read-only "Swap Route" section (Rebalance / Trim / eligible DCA), reused across modal variants. Suppressed
  // when the suggestion opts out (details.hideSwapRoute) — e.g. a frozen asset that can't be swapped.
  const swapSection = swapAction && !details?.hideSwapRoute ? (
    <SwapQuoteComparisonSection
      readiness={swapAction}
      enabled
      isDca={swapQuoteIsDca}
      fetcher={swapQuoteFetcher}
      presetAssessments={swapQuotePresetAssessments}
      presetLoading={swapQuotePresetLoading}
      nowMs={swapQuoteNowMs}
      onExecutionContext={setQuoteState}
      hostShowsNotice={swapLeg != null}
    />
  ) : null;

  /**
   * NO SWAP CAN BE OFFERED RIGHT NOW — said first, directly under the title.
   *
   * The recommendation below it still stands; what is blocked is executing it. That used to be
   * the last thing in the body, under the amounts to send and receive, so the review read as a
   * swap ready to go until someone scrolled. Null while a route is selected or still loading.
   */
  const blockedNotice = swapLeg && quoteState?.notice ? (
    <InfoBanner title={quoteState.notice.heading} description={quoteState.notice.body} />
  ) : null;

  // Phase 6 — the footer of a single-leg swap review, in every state: Swap while a swap can be
  // offered (spinning while terms load), Close and Check Again when it cannot. It owns the footer from the
  // first render and never renders nothing, so there is no moment with a different footer or
  // none. Null only when this review has no single swap to offer.
  const executionSection = swapLeg ? (
    <SwapExecutionSection
      demo={demo}
      demoOutcome={demoOutcome}
      action={swapLeg}
      assessment={quoteState?.assessment ?? null}
      comparisonLoading={quoteState == null || quoteState.loading}
      onRefreshComparison={quoteState?.refresh}
      nowMs={swapQuoteNowMs}
      onClose={onClose}
      onExpiredGiveUp={onSwapQuoteGaveUp}
      onStepChange={setSwapStep}
    />
  ) : null;

  // 23C.2 — a read-only external-link footer (Cancel + provider handoff, e.g. "Buy SOL on Moonpay" for a future
  // DCA). Opens the provider's page in a new tab; WealthSmith prepares nothing.
  const externalLinkFooter = (link: { label: string; url: string; ctaLabel?: string; secondaryLabel?: string; opensInNewTab?: boolean } | undefined | null) => link ? (
    <ModalActionsFooter
      secondaryLabel={link.secondaryLabel ?? "Cancel"}
      onSecondary={onClose}
      primary={{
        kind: "external-link",
        label: link.ctaLabel ?? link.label,
        href: link.url,
        newTab: link.opensInNewTab,
        ariaLabel: `${link.ctaLabel ?? link.label}. Opens the provider page in a new tab. No transaction is prepared.`,
      }}
    />
  ) : null;

  // Focus the close button on open; restore focus + unlock scroll on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  // Escape to close + simple focus trap on Tab.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Step 16H-C — plan-backed Stable Yield review. Renders the deterministic Step 16H-B review view
  // model through the SAME shared modal shell (no new modal, no recalculation, no execution). The React
  // layer never computes an amount/APY/projection — it only places already-formatted strings into rows.
  if (stableYieldReview) {
    const r = stableYieldReview;
    // Whole amounts drop the ".00" (e.g. "$500"); cents are kept ("$1,234.56").
    const amtCompact = Number.isInteger(r.amountUsd)
      ? `$${r.amountUsd.toLocaleString("en-US")}`
      : `$${r.amountUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    // 24J — focused Stable Yield modal: description + a self-explanatory card set. Finance copy stays deterministic
    // (amount / protocol / sourced APY only). Kamino USDC lending withdraws on demand → 0-hour, 0-fee unstake.
    // Over-long protocol names fall back to a generic phrase so the copy never overflows (matches the card).
    const syProto = cardProtocolName(r.protocolName);
    const description = r.lane === "excess"
      ? (r.actionMode === "add_to_existing_strategy"
          ? `You already have USDC earning yield on ${syProto}. Add ${amtCompact} of excess USDC to the same strategy while keeping your Safety Buffer fully funded.`
          : r.apy.state === "unavailable"
            ? `You have ${amtCompact} in USDC above your Safety Buffer, but we couldn’t verify the current APY for this ${syProto === "the selected protocol" ? "strategy" : `${syProto} strategy`}. Check the latest rate before deciding whether to deposit.`
            : `You have ${amtCompact} in USDC above your Safety Buffer. Deposit it on ${syProto} to earn an estimated ${r.apy.display} APY while keeping your buffer fully funded.`)
      : (r.actionMode === "start_new_position"
          ? `Lend ${amtCompact} of your Safety Buffer USDC on ${syProto} to earn an estimated ${r.apy.display} APY. The position will continue to count toward your Safety Buffer while it remains eligible and available for withdrawal.`
          : `Add ${amtCompact} of your Safety Buffer USDC to your existing ${syProto} lending position to earn an estimated ${r.apy.display} APY while keeping your Safety Buffer fully funded.`);
    const depositTokens = `${r.amountUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`;
    const estYearly = r.estimatedEarningsDisplay ? r.estimatedEarningsDisplay.replace("+", "~").replace("/year", "") : "—";
    const ext = r.externalLink;
    return (
      <div className="modal-scrim" onClick={onClose}>
        <div ref={dialogRef} className="modal review-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={reasonId} onKeyDown={onKeyDown} onClick={(e) => e.stopPropagation()}>
          <div className="modal__header">
            <div className="review-modal__heading">
              <h2 id={titleId} className="modal__title">{r.title}</h2>
            </div>
            <button ref={closeRef} type="button" className="modal__close" aria-label="Close review details" onClick={onClose}>
              <ButtonIcon src={closeUrl} size={18} />
            </button>
          </div>
          <div className={bodyClass}>
            <section className="review-modal__section" aria-label="Recommendation">
              <p id={reasonId} className="modal__intro">{description}</p>
            </section>
            <section className="review-modal__section" aria-label="Deposit details">
              <dl className="review-modal__metrics">
                <div className="review-modal__metric">
                  <dt className="review-modal__metric-label">Deposit</dt>
                  <dd className="review-modal__metric-value">{depositTokens}<span className="review-modal__metric-subvalue">{amtCompact}</span></dd>
                </div>
                <div className="review-modal__metric">
                  <dt className="review-modal__metric-label">Current APY</dt>
                  <dd className="review-modal__metric-value">{r.apy.display}</dd>
                </div>
                <div className="review-modal__metric">
                  <dt className="review-modal__metric-label">Estimated yearly rewards</dt>
                  <dd className="review-modal__metric-value">{estYearly}</dd>
                </div>
                <div className="review-modal__metric">
                  <dt className="review-modal__metric-label">Direct Unstake</dt>
                  <dd className="review-modal__metric-value">0 hours</dd>
                </div>
                <div className="review-modal__metric">
                  <dt className="review-modal__metric-label">Direct Unstake Fee <InfoPopover label="Direct Unstake Fee — more info" direction="up">Applied to the unstaked amount</InfoPopover></dt>
                  <dd className="review-modal__metric-value">0%</dd>
                </div>
              </dl>
            </section>
          </div>
          {ext && (
            <ModalActionsFooter
              onSecondary={onClose}
              primary={{
                kind: "external-link",
                label: ext.ctaLabel,
                href: ext.url,
                newTab: ext.opensInNewTab,
                ariaLabel: `${ext.ctaLabel}. Opens the protocol page in a new tab. No transaction is created.`,
              }}
            />
          )}
        </div>
      </div>
    );
  }

  // Step 15H — plan-backed contribution review. Renders the deterministic engine sections through the
  // SAME shared modal shell (no new modal component, no recalculation). Read-only; Close only.
  if (contributionReview) {
    const cr = contributionReview;
    return (
      <div className="modal-scrim" onClick={onClose}>
        <div ref={dialogRef} className="modal review-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={reasonId} onKeyDown={onKeyDown} onClick={(e) => e.stopPropagation()}>
          <div className="modal__header">
            <div className="review-modal__heading">
              {swapStepActive
                ? <SubpageHeading onBack={swapStep!.onBack} title={swapStep!.title} titleId={titleId} />
                : <h2 id={titleId} className="modal__title">{cr.title}</h2>}
            </div>
            <button ref={closeRef} type="button" className="modal__close" aria-label="Close review details" onClick={onClose}>
              <ButtonIcon src={closeUrl} size={18} />
            </button>
          </div>
          <div className={bodyClass}>
            {blockedNotice}
            <section className="review-modal__section" aria-label="Why this fits your plan">
              {!cr.focusedLayout && <h3 className="review-modal__section-title">Why this fits your plan</h3>}
              <p id={reasonId} className="modal__intro">{cr.whySection.body}</p>
            </section>
            {cr.keyMetrics.length > 0 && (
              <section className="review-modal__section" aria-label="Key metrics">
                {!cr.focusedLayout && <h3 className="review-modal__section-title">Key metrics</h3>}
                <dl className="review-modal__metrics">
                  {cr.keyMetrics.map((m, i) => (
                    <div key={`${m.label}-${i}`} className="review-modal__metric">
                      <dt className="review-modal__metric-label">{m.label}</dt>
                      <dd className="review-modal__metric-value">{m.value}{m.subValue && <span className="review-modal__metric-subvalue">{m.subValue}</span>}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            {/* Step 22F (slice 4.1) — honest market-context disclosure. Rendered ONLY when the canonical target drove
                the plan (full → 10% + CoinMarketCap; degraded → exclusion + renormalization); absent for transitional
                Demo/testing and buffer plans, so no empty section appears. */}
            {cr.marketContextSection && !cr.focusedLayout && (
              <section className="review-modal__section" aria-label="Market context">
                <h3 className="review-modal__section-title">{cr.marketContextSection.title}</h3>
                <p className="modal__intro">{cr.marketContextSection.body}</p>
                {cr.marketContextSection.rows.length > 0 && (
                  <dl className="review-modal__metrics">
                    {cr.marketContextSection.rows.map((r, i) => (
                      <div key={`${r.label}-${i}`} className="review-modal__metric">
                        <dt className="review-modal__metric-label">{r.label}</dt>
                        <dd className="review-modal__metric-value">{r.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            )}

            {/* Step 23C — read-only "Suggested route" for an eligible funded DCA (contribution) review. */}
            {swapSection}
          </div>
          {/* Funded DCA → the in-app Swap footer; a future DCA with no on-chain source → its read-only
              Moonpay handoff ("Buy SOL on Moonpay"). Mutually exclusive by construction. */}
          {executionSection ?? externalLinkFooter(contributionReview.externalLink)}
        </div>
      </div>
    );
  }

  if (!details) return null;
  const { summary, metrics, involvedAssets, involvedPositions, calculations, guardrailSummary } = details;
  // Show the "Portfolio share" column only when at least one involved asset carries a share (e.g. Trim); other
  // modals that list involved assets without a share (staking, stable yield) keep the 3-column table.
  const showInvolvedAssetShare = involvedAssets.some((a) => typeof a.portfolioSharePct === "number");

  const guardrailGroups: {
    title: string;
    tone: "checked" | "pending" | "na";
    hint?: string;
    items: string[];
  }[] = [
    { title: "Checked", tone: "checked" as const, items: guardrailSummary.checked },
    {
      title: "Not evaluated yet",
      tone: "pending" as const,
      hint: "These need market data WealthSmith doesn't have yet — they are not failures.",
      items: guardrailSummary.notEvaluated,
    },
    { title: "Not applicable", tone: "na" as const, items: guardrailSummary.notApplicable },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={reasonId}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <div className="review-modal__heading">
            {swapStepActive ? (
              <SubpageHeading onBack={swapStep!.onBack} title={swapStep!.title} titleId={titleId} />
            ) : (
              <h2 id={titleId} className="modal__title">
                {summary.title}
              </h2>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            className="modal__close"
            aria-label="Close review details"
            onClick={onClose}
          >
            <ButtonIcon src={closeUrl} size={18} />
          </button>
        </div>

        <div className={bodyClass}>
          {blockedNotice}
          {details.demoLabel && (
            <div className="review-modal__demo-badge">
              <Badge label={details.demoLabel} tone="warning" />
            </div>
          )}
          <p id={reasonId} className="modal__intro">
            {summary.reason}
          </p>

          {details.protocolSelectionDisplay && !details.focusedLayout && (
            /* Presented like the Key metrics grid: one card per protocol data point (Protocol + market data). */
            <section className="review-modal__section" aria-label="Suggested protocol">
              <h3 className="review-modal__section-title">{details.protocolSelectionDisplay.label}</h3>
              <dl className="review-modal__metrics">
                {(() => {
                  const disp = details.protocolSelectionDisplay;
                  const md = disp.marketData;
                  const cards: [string, string][] = [
                    ["Protocol", `${disp.protocolName}${disp.assetSymbol ? ` · ${disp.assetSymbol}` : ""}`],
                  ];
                  if (md) {
                    cards.push(
                      ["TVL", `$${(md.tvlUsd / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}M`],
                      ["Current APY", `${md.apyPct}%`],
                      ["30-day APY", `${md.apy30dPct}%`],
                      ["Direct unstake", `~${md.directUnstakeTimeHours} hours`],
                      ["Direct unstake fee", `${md.directUnstakeFeePct}%`],
                      ["Annual management fee", `${md.annualManagementFeePct}% on ${md.annualManagementFeeAppliesTo}`],
                    );
                  }
                  return cards.map(([label, value]) => (
                    <div key={label} className="review-modal__metric">
                      <dt className="review-modal__metric-label">{label}</dt>
                      <dd className="review-modal__metric-value">{value}</dd>
                    </div>
                  ));
                })()}
              </dl>
            </section>
          )}

          {metrics.length > 0 && !details.positionReview && (
            <section className="review-modal__section" aria-label="Key metrics">
              {!details.hideMetricsHeading && !details.focusedLayout && <h3 className="review-modal__section-title">Key metrics</h3>}
              <dl className="review-modal__metrics">
                {metrics.map((m) => (
                  <div key={m.label} className="review-modal__metric">
                    <dt className="review-modal__metric-label">
                      {m.label}
                      {m.tooltip && <InfoPopover label={`${m.label} — more info`} align="right" direction="up">{m.tooltip}</InfoPopover>}
                    </dt>
                    <dd className={`review-modal__metric-value${m.emphasis === "primary" ? " review-modal__metric-value--primary" : ""}`}>
                      {formatMetric(m)}
                      {m.subValue && <span className="review-modal__metric-subvalue">{m.subValue}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {involvedAssets.length > 0 && !details.focusedLayout && (
            /* Every review modal presents involved assets like the Portfolio "Liquid Assets" table: a header
               row (Asset / Amount / USD Value) then a token icon + a symbol linking to the read-only Solscan
               token page (when a mint is known). Read-only identity only — never implies the asset can move. */
            <section className="review-modal__section" aria-label="Involved assets">
              <h3 className="review-modal__section-title">Involved assets</h3>
              <div className="portfolio-table__scroll">
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header">Asset</th>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">Amount</th>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">USD Value</th>
                      {showInvolvedAssetShare && <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">Portfolio share</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {involvedAssets.map((a, i) => {
                      const iconUrl = a.icon ? resolveTokenIcon(a.icon).url : fallbackTokenUrl;
                      const url = a.mint ? `https://solscan.io/token/${a.mint}` : undefined;
                      return (
                        <tr key={`${a.symbol}-${i}`}>
                          <td className="portfolio-table__cell">
                            <AssetIdentity iconUrl={iconUrl} label={a.symbol} {...(url ? { href: url } : {})} />
                          </td>
                          <td className="portfolio-table__cell portfolio-table__cell--right">
                            <span className="portfolio-table__value">{typeof a.amount === "number" ? amountFmt(a.amount) : "—"}</span>
                          </td>
                          <td className="portfolio-table__cell portfolio-table__cell--right">
                            <span className="portfolio-table__value">{typeof a.valueUsd === "number" ? usd(a.valueUsd) : "—"}</span>
                          </td>
                          {showInvolvedAssetShare && (
                            <td className="portfolio-table__cell portfolio-table__cell--right">
                              <span className="portfolio-table__value">{typeof a.portfolioSharePct === "number" ? `${a.portfolioSharePct}%` : "—"}</span>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {details.excludedAssets && details.excludedAssets.length > 0 && (
            /* Read-only "Excluded from Safety Buffer" table: Asset (token logo + symbol) / Amount / Value / Reason
               (e.g. a frozen stablecoin that can't count as a liquid reserve). Identity display only — never movable. */
            <section className="review-modal__section" aria-label="Excluded from Safety Buffer">
              <h3 className="review-modal__section-title">Excluded from Safety Buffer</h3>
              <div className="portfolio-table__scroll">
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header">Asset</th>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">Amount</th>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">Value</th>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.excludedAssets.map((a, i) => {
                      const iconUrl = a.icon ? resolveTokenIcon(a.icon).url : fallbackTokenUrl;
                      return (
                        <tr key={`${a.symbol}-${i}`}>
                          <td className="portfolio-table__cell">
                            <AssetIdentity iconUrl={iconUrl} label={a.symbol} />
                          </td>
                          <td className="portfolio-table__cell portfolio-table__cell--right">
                            <span className="portfolio-table__value">{typeof a.amount === "number" ? amountFmt(a.amount) : "—"}</span>
                          </td>
                          <td className="portfolio-table__cell portfolio-table__cell--right">
                            <span className="portfolio-table__value">{typeof a.valueUsd === "number" ? usd(a.valueUsd) : "—"}</span>
                          </td>
                          <td className="portfolio-table__cell portfolio-table__cell--right">
                            <span className="portfolio-table__value">{a.reason}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {involvedPositions.length > 0 && (
            /* Position Optimization "Position details" table: Asset (token logo + symbol linking to its read-only
               Solscan token page) / Value / Portfolio share / APY / a review-only "Manage" handoff (new tab). */
            <section className="review-modal__section" aria-label="Position details">
              <h3 className="review-modal__section-title">Position details</h3>
              <div className="portfolio-table__scroll">
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header">Asset</th>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">Value</th>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">Portfolio share</th>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right">APY</th>
                      <th scope="col" className="portfolio-table__cell portfolio-table__header portfolio-table__cell--right"><span className="sr-only">Manage</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {involvedPositions.map((p, i) => {
                      // Asset identity: the held token's icon + symbol. Fall back to the protocol logo/name when the
                      // underlying token can't be resolved. resolveProtocolIcon returns null when the logo is missing.
                      const assetIcon = p.assetIconPath ? resolveTokenIcon(p.assetIconPath).url : (p.iconPath ? resolveProtocolIcon(p.iconPath) : null) ?? fallbackTokenUrl;
                      const assetLabel = p.assetSymbol ?? p.reviewLink?.label ?? p.protocol ?? p.name ?? "Position";
                      const assetHref = p.assetUrl;
                      const manageName = p.reviewLink?.label ?? p.protocol ?? assetLabel;
                      const manageUrl = p.reviewLink?.url;
                      return (
                        <tr key={`${p.protocol ?? "pos"}-${i}`}>
                          <td className="portfolio-table__cell">
                            <AssetIdentity iconUrl={assetIcon ?? null} label={assetLabel} {...(assetHref ? { href: assetHref } : {})} {...(p.assetVenue ? { sub: p.assetVenue } : {})} />
                          </td>
                          <td className="portfolio-table__cell portfolio-table__cell--right">
                            <span className="portfolio-table__value">{typeof p.valueUsd === "number" ? usd(p.valueUsd) : "—"}</span>
                          </td>
                          <td className="portfolio-table__cell portfolio-table__cell--right">
                            <span className="portfolio-table__value">{typeof p.portfolioSharePct === "number" ? `${num1(p.portfolioSharePct)}%` : "—"}</span>
                          </td>
                          <td className="portfolio-table__cell portfolio-table__cell--right">
                            <span className="portfolio-table__value">{typeof p.apy === "number" ? `${num1(p.apy)}%` : "—"}</span>
                          </td>
                          <td className="portfolio-table__cell portfolio-table__cell--right">
                            {manageUrl && (
                              <a
                                className="portfolio-table__manage"
                                href={manageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Manage on ${manageName} in a new tab. No transaction is created.`}
                              >
                                <span>Manage</span>
                                <ButtonIcon src={externalLinkUrl} />
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {calculations.length > 0 && !details.focusedLayout && (
            <section className="review-modal__section" aria-label="How this was calculated">
              <h3 className="review-modal__section-title">How this was calculated</h3>
              <ul className="review-modal__list">
                {calculations.map((c, i) => (
                  <li key={`${c.label}-${i}`} className="review-modal__calc">
                    <span className="review-modal__calc-label">{c.label}</span>
                    {c.formula && <span className="review-modal__calc-formula">{c.formula}</span>}
                    <span className="review-modal__calc-values">
                      {typeof c.currentValue === "number" && (
                        <span>Current {formatCalcValue(c.currentValue, c.unit)}</span>
                      )}
                      {typeof c.targetValue === "number" && (
                        <span>Target {formatCalcValue(c.targetValue, c.unit)}</span>
                      )}
                      {typeof c.difference === "number" && (
                        <span>Difference {formatCalcValue(c.difference, c.differenceUnit ?? c.unit)}</span>
                      )}
                      {typeof c.threshold === "number" && (
                        <span>Threshold {formatCalcValue(c.threshold, c.thresholdUnit ?? c.unit)}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {showGuardrails && !details.positionReview && !details.hideGuardrails && !details.focusedLayout && guardrailGroups.length > 0 && (
            <section className="review-modal__section" aria-label="Guardrails">
              <h3 className="review-modal__section-title">Guardrails</h3>
              <div className="review-modal__guardrails">
                {guardrailGroups.map((g) => (
                  <div
                    key={g.title}
                    className={`review-modal__guardrail-group review-modal__guardrail-group--${g.tone}`}
                  >
                    <p className="review-modal__guardrail-title">{g.title}</p>
                    {g.hint && <p className="review-modal__guardrail-hint">{g.hint}</p>}
                    <ul className="review-modal__chips">
                      {g.items.map((item) => (
                        <li key={item} className="review-modal__chip">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {details.routeEvaluation && !details.focusedLayout && (
            <section className="review-modal__section" aria-label="Route and execution checks">
              <h3 className="review-modal__section-title">{details.routeEvaluation.title}</h3>
              <p className="review-modal__source-status">{details.routeEvaluation.sourceStatusLabel}</p>
              <div className="review-modal__guardrails">
                {details.routeEvaluation.groups.map((g) => (
                  <div
                    key={g.title}
                    className={`review-modal__guardrail-group review-modal__guardrail-group--${
                      g.tone === "checked" ? "checked" : g.tone === "na" ? "na" : "pending"
                    }`}
                  >
                    <p className="review-modal__guardrail-title">{g.title}</p>
                    <ul className="review-modal__chips">
                      {g.items.map((item) => (
                        <li key={item} className="review-modal__chip">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="review-modal__guardrail-hint">{details.routeEvaluation.explanation}</p>
            </section>
          )}

          {/* The generic "Not evaluated yet" limitations block and the "Safety" review-only notes block were
              removed from every review modal by request — the page/card already frame these as read-only. */}

          {/* READ-ONLY external handoff (Step 13J) moved to the sticky modal footer below. */}

          {/* READ-ONLY dynamic "Current comparison" (Step 14Y/14Z) — the current Step 14W leader
              plus the deterministic "Why this protocol currently leads" analysis. Not activation,
              not the engine Top Pick, and never changes the selected protocol. */}
          {details.selectorPresentation && (
            <SolStakingLeaderExplanation presentation={details.selectorPresentation} />
          )}

          {/* READ-ONLY "Other protocols to review" (Step 14L). Approved alternative
              candidates shown for review only — never the selected protocol/winner,
              and never an execution path. */}
          {details.otherProtocolsToReview && details.otherProtocolsToReview.length > 0 && !details.focusedLayout && (
            <section className="review-modal__section review-modal__alternatives" aria-label="Other protocols to review">
              <h3 className="review-modal__section-title">Other protocols to review</h3>
              {details.protocolSelectionDisplay && (
                <p className="review-modal__alt-selected">
                  Currently selected protocol: {details.protocolSelectionDisplay.protocolName}
                  {details.protocolSelectionDisplay.assetSymbol ? ` · ${details.protocolSelectionDisplay.assetSymbol}` : ""}
                </p>
              )}
              {details.otherProtocolsToReview.map((c) => (
                <div key={c.protocolId} className="review-modal__alt-card">
                  <p className="review-modal__alt-name">
                    {c.protocolName}
                    {c.assetSymbol ? ` · ${c.assetSymbol}` : ""}
                  </p>
                  <p className="review-modal__alt-role">{c.roleLabel} — {c.statusLabel}</p>
                  {c.candidateType === "native_staking" && (c.notLstLabel || c.nativeStakeAccountLabel) && (
                    <p className="review-modal__alt-note">{[c.notLstLabel, c.nativeStakeAccountLabel].filter(Boolean).join(" · ")}</p>
                  )}
                  {/*
                    Step 16H-K.1 — the numeric Risk Suitability Score is INTERNAL ONLY, by explicit
                    product-owner decision. It previously rendered here as "Risk score: X.XX / 10
                    (assigned for review)", which exposed the aggregate, the scale, and an internal
                    review state to users. Users get approved qualitative disclosures instead (see
                    `riskScoreExposurePolicy.ts`); the score itself drives eligibility/comparison
                    internally and is never shown. An exposure-scan fixture keeps it out.
                  */}
                  {c.marketData && (
                    <dl className="review-modal__market">
                      {typeof c.delegatedStakeSol === "number" && (
                        <div className="review-modal__market-row"><dt>Delegated stake</dt><dd>{`${c.delegatedStakeSol.toLocaleString("en-US", { maximumFractionDigits: 2 })} SOL`}</dd></div>
                      )}
                      {typeof c.marketData.tvlUsd === "number" && (
                        <div className="review-modal__market-row"><dt>TVL</dt><dd>{`$${(c.marketData.tvlUsd / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}M`}</dd></div>
                      )}
                      {typeof c.marketData.apyPct === "number" && (
                        <div className="review-modal__market-row"><dt>Current APY</dt><dd>{`${c.marketData.apyPct}%`}</dd></div>
                      )}
                      {typeof c.marketData.apy30dPct === "number" && (
                        <div className="review-modal__market-row"><dt>30-day APY</dt><dd>{`${c.marketData.apy30dPct}%`}</dd></div>
                      )}
                      {c.mechanics?.unstakeTiming && (
                        <div className="review-modal__market-row"><dt>Unstake timing</dt><dd>{c.mechanics.unstakeTiming}</dd></div>
                      )}
                      {typeof c.mechanics?.directUnstakeFeePct === "number" && (
                        <div className="review-modal__market-row"><dt>Direct unstake fee</dt><dd>{`${c.mechanics.directUnstakeFeePct}%`}</dd></div>
                      )}
                      {typeof c.mechanics?.annualManagementFeePct === "number" && (
                        <div className="review-modal__market-row"><dt>Annual management fee</dt><dd>{`${c.mechanics.annualManagementFeePct}% on rewards`}</dd></div>
                      )}
                      {typeof c.validatorCommissionPct === "number" && (
                        <div className="review-modal__market-row"><dt>Validator commission</dt><dd>{`${c.validatorCommissionPct}%`}</dd></div>
                      )}
                    </dl>
                  )}
                  {c.apy30dMethodology && (
                    <p className="review-modal__alt-note">{c.apy30dMethodology}</p>
                  )}
                  {c.evidence && (c.evidence.auditSecurity || c.evidence.operationalRisk || c.evidence.incidentReview) && (
                    <ul className="review-modal__bullets">
                      {c.evidence.auditSecurity && <li>Audit &amp; security: {c.evidence.auditSecurity}</li>}
                      {c.evidence.operationalRisk && <li>Operational risk: {c.evidence.operationalRisk}</li>}
                      {c.evidence.incidentReview && <li>Incident review: {c.evidence.incidentReview}</li>}
                    </ul>
                  )}
                  <p className="review-modal__alt-status">Not selected by protocol logic yet.</p>
                  <p className="review-modal__alt-note">Final protocol selection will happen later through deterministic WealthSmith protocol logic.</p>
                  <p className="review-modal__alt-note">Review only — WealthSmith will not move funds for you.</p>
                  {c.externalReviewLink && (
                    <a
                      className="review-modal__external"
                      href={c.externalReviewLink.url}
                      {...(c.externalReviewLink.opensNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      aria-label={`${c.externalReviewLink.label}. Opens the protocol page in a new tab. No transaction is created.`}
                    >
                      <span>{c.externalReviewLink.label}</span>
                      <ButtonIcon src={externalLinkUrl} />
                    </a>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Step 23C — read-only "Suggested route" comparison (Rebalance / Trim / eligible DCA). Supplemental
              execution information only; it never changes the financial suggestion and prepares no transaction. */}
          {swapSection}
        </div>
        {/* Sticky footer — shown only when a read-only protocol link is available. Cancel closes the modal;
            the primary button opens the protocol's own page in a new tab (no in-app transaction/signature). */}
        {/* A review that can offer a swap has ONE footer, and it is the Swap footer below. A static
            protocol link is for reviews with no swap of their own (staking, lending, a withdrawal). */}
        {details.externalLink && !swapLeg && (
          <ModalActionsFooter
            secondaryLabel={details.externalLink.secondaryLabel ?? "Cancel"}
            onSecondary={onClose}
            primary={{
              kind: "external-link",
              label: details.externalLink.ctaLabel ?? details.externalLink.label,
              href: details.externalLink.url,
              newTab: details.externalLink.opensInNewTab,
              ariaLabel: `${details.externalLink.ctaLabel ?? details.externalLink.label}. Opens the protocol page in a new tab. No transaction is created.`,
            }}
          />
        )}
        {/* The Swap footer (Rebalance / Trim; DCA uses its own branch). */}
        {executionSection}
        {/* Sticky footer for an OBSERVATION. There is no action to hand off here —
            reviewing IS the action — so the primary control acknowledges it. Dismiss
            hides only THIS situation; the card returns by itself once the underlying
            condition materially changes. It records no consent and changes no
            suggestion, amount, or eligibility. */}
        {onDismiss && (
          <ModalActionsFooter
            onSecondary={onClose}
            primary={{
              kind: "button",
              label: "Dismiss",
              onClick: onDismiss,
              ariaLabel: "Dismiss this suggestion. It returns if the position changes materially.",
            }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * The confirm step's heading, drawn in the REVIEW'S OWN header row.
 *
 * It lives here rather than inside the sheet so the back control and the title line up with
 * the close button on the same baseline, and so the title is a `modal__title` like every other
 * modal heading — a step that looked like a section heading sat at the wrong size and indent.
 */
function SubpageHeading({ onBack, title, titleId }: { onBack: () => void; title: string; titleId: string }) {
  return (
    <div className="review-modal__subpage-heading">
      <button type="button" className="review-modal__back" onClick={onBack} aria-label={SWAP_CONFIRM_BACK_LABEL}>
        <ButtonIcon src={chevronLeftUrl} size={18} />
      </button>
      {/* The step's own title: "Review Swap" normally, or the failure's name when it failed,
          so the header never announces a review of terms that do not exist. */}
      <h2 id={titleId} className="modal__title">{title}</h2>
    </div>
  );
}

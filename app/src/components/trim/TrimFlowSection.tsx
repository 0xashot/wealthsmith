/**
 * TrimFlowSection — a Trim that names SEVERAL tokens: choose them, then swap them one at a time.
 *
 * WHY THIS EXISTS. Each token → USDC sale is its own transaction, with its own quote, its own
 * minimum and its own expiry. The review for such a Trim used to end in a list of per-token
 * route sections and no footer at all — nothing to press, not even Close. This owns that
 * review's footer and the three steps behind it:
 *
 *   review   [Cancel] [Trim]
 *   select   the tokens, ticked where a sale can be offered, with the reason where it cannot
 *   run      one token at a time — its terms, the user's approval in their own wallet, the
 *            result — moving on by itself after each one
 *   summary  what happened to every token that was chosen
 *
 * ONE APPROVAL IS STILL ONE TRANSACTION. Nothing is batched and nothing is signed unseen: each
 * token's step is the same `SwapExecutionSection` a single swap uses — the same plan, the same
 * verification and simulation, the same sheet — started for the user because they chose the
 * token on the previous screen, and reporting its outcome here instead of resting on a result.
 *
 * A FAILURE DOES NOT STOP THE OTHERS, and a token whose swap was sent but not confirmed is
 * never offered a retry: it may still land, and a second swap beside it could execute both.
 */
import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SwapActionContext, SwapQuoteComparisonAssessment } from "../../suggestions/swapQuote/swapQuoteContracts";
import type { SwapQuoteFetcher } from "../../suggestions/swapQuote/swapQuoteClient";
import type { ReviewAsset } from "../../suggestions/engineTypes";
import { deriveTrimRows, isTrimRetryable, sumTokenStrings, type TrimResult } from "../../suggestions/swapExecution/trimFlow";
import type { SwapPlanState } from "../swapQuote/SwapQuoteComparisonSection";
import { useSwapQuoteComparison } from "../swapQuote/useSwapQuoteComparison";
import SwapExecutionSection, { type SwapProgress, type SwapSettled } from "../swapExecution/SwapExecutionSection";
import { SwapFlowEventsContext } from "../swapExecution/swapFlowEvents";
import { trimFinishedEvent } from "../../suggestions/swapExecution/trimEvents";
import { failureCopy, formatSettledAmount, formatUsd, solscanTransactionUrl } from "../swapExecution/swapConfirmPresentation";
import ButtonIcon from "../ButtonIcon";
import InfoBanner from "../InfoBanner";
import { resolveTokenIcon } from "../../state/iconRegistry";
import fallbackTokenUrl from "../../../../assets/icons/fallback/fallback-token.svg";
import checkBadgeUrl from "../../../../assets/icons/ui/check-badge-solid.svg";
import {
  SWAP_CONFIRM_CANCEL_LABEL,
  SWAP_CONFIRM_CHECKING,
  SWAP_CONFIRM_CLOSE_LABEL,
  SWAP_CONFIRM_DONE_LABEL,
  SWAP_CONFIRM_RETRY_LABEL,
  SWAP_CONFIRM_VIEW_TRANSACTION,
  TRIM_ACTION_LABEL,
    TRIM_BLOCKED_REASON_DEFAULT,
  TRIM_SELECT_INTRO,
  TRIM_SELECT_TITLE,
  TRIM_STATUS_ACTIVE,
  TRIM_STATUS_NOT_STARTED,
  TRIM_STATUS_SWAPPED,
  TRIM_STATUS_WAITING,
  TRIM_SUMMARY_ALL_TITLE,
  TRIM_SUMMARY_NONE_DESC,
  TRIM_SUMMARY_NONE_TITLE,
  TRIM_SUMMARY_PENDING_NOTE,
  TRIM_SUMMARY_SOME_TITLE,
  trimRunTitle,
  trimSelectCta,
  trimSelectPreview,
  trimStatusReceived,
  trimSummaryReceived,
  trimSummarySwapped,
} from "../../state/approvedCopy";

/** How long a token's result stays on screen before the next token's terms are requested. */
export const TRIM_ADVANCE_DELAY_MS = 900;

/** What the review needs to draw the step's header. No `onBack` means no back control. */
export interface TrimStep {
  active: boolean;
  title: string;
  onBack?: () => void;
}

export interface TrimFlowSectionProps {
  /** The Trim's legs, one per token, exactly as the engine built them. */
  legs: SwapActionContext[];
  /** Each leg's route comparison, reported by the route section. Null until it has mounted. */
  plan: SwapPlanState | null;
  /** The review's own asset rows — the token's icon, and tokens that cannot be moved at all. */
  assets: ReviewAsset[];
  fetcher?: SwapQuoteFetcher;
  slippageBps?: number;
  nowMs?: number;
  onClose: () => void;
  onStepChange: (step: TrimStep | null) => void;
  onConnectWallet?: () => void;
  /** Each token's swap, as it leaves the wallet and as it lands. See SwapExecutionSection. */
  onSwapProgress?: (progress: SwapProgress) => void;
  demo?: boolean;
  /**
   * False where there is nothing to run against (the gallery's fixed presets). The selector
   * still opens, for looking at; its button stays greyed.
   */
  canRun?: boolean;
}

type Stage = "review" | "select" | "run" | "summary";
const iconUrlFor = (icon: string | null): string => (icon ? resolveTokenIcon(icon).url : fallbackTokenUrl);

export default function TrimFlowSection(props: TrimFlowSectionProps) {
  const { legs, plan, assets, onClose, onStepChange } = props;
  const [stage, setStage] = useState<Stage>("review");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** The tokens of the current run, in order. A retry runs a new, shorter queue. */
  const [queue, setQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<string, TrimResult>>({});
  /** Every token chosen since the selector, across retries — what the summary accounts for. */
  const [chosen, setChosen] = useState<string[]>([]);

  const assessments = useMemo(() => {
    const out: Record<string, SwapQuoteComparisonAssessment | null> = {};
    for (const l of plan?.legs ?? []) out[l.action.legId] = l.assessment;
    return out;
  }, [plan]);
  const rows = useMemo(
    () => deriveTrimRows({ legs, assessments, assets, nowMs: props.nowMs ?? Date.now() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [legs, assessments, assets, props.nowMs, stage],
  );
  const rowByKey = useMemo(() => new Map(rows.map((r) => [r.key, r])), [rows]);
  const answered = plan != null && !plan.loading;

  // ---- step header --------------------------------------------------------
  const settledCount = queue.filter((k) => results[k] != null).length;
  const swappedKeys = chosen.filter((k) => results[k]?.status === "confirmed");
  const summaryTitle =
    swappedKeys.length === 0 ? TRIM_SUMMARY_NONE_TITLE
      : swappedKeys.length === chosen.length ? TRIM_SUMMARY_ALL_TITLE
        : TRIM_SUMMARY_SOME_TITLE;
  const backToReview = useCallback(() => setStage("review"), []);
  // A LAYOUT effect: the header is drawn by the review from this report, and a passive effect
  // let one frame paint the new step under the previous step's title.
  useLayoutEffect(() => {
    if (stage === "review") { onStepChange({ active: false, title: TRIM_SELECT_TITLE }); return; }
    if (stage === "select") { onStepChange({ active: true, title: TRIM_SELECT_TITLE, onBack: backToReview }); return; }
    if (stage === "run") { onStepChange({ active: true, title: trimRunTitle(Math.min(index + 1, queue.length), queue.length) }); return; }
    onStepChange({ active: true, title: summaryTitle });
  }, [stage, index, queue.length, summaryTitle, onStepChange, backToReview]);
  // Leaving the review entirely must not leave it hidden behind a step that is gone.
  useEffect(() => () => onStepChange(null), [onStepChange]);

  // ---- review → select ----------------------------------------------------
  const emit = useContext(SwapFlowEventsContext);
  const openSelector = () => {
    const sellable = rows.filter((r) => r.sellable);
    setSelected(new Set(sellable.map((r) => r.key)));
    setStage("select");
    emit?.({ name: "trim_selector_opened", listed: rows.length, sellable: sellable.length });
  };
  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  // ---- select → run -------------------------------------------------------
  const startRun = (keys: string[], fresh: boolean) => {
    if (keys.length === 0) return;
    setQueue(keys);
    setIndex(0);
    if (fresh) { setChosen(keys); setResults({}); }
    else setResults((prev) => { const next = { ...prev }; for (const k of keys) delete next[k]; return next; });
    setStage("run");
    emit?.({ name: "trim_started", selected: keys.length, retry: !fresh });
  };
  const startSelected = () => startRun(rows.filter((r) => r.sellable && selected.has(r.key)).map((r) => r.key), true);

  // ---- run ----------------------------------------------------------------
  const currentKey = stage === "run" ? queue[index] : undefined;
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);
  const onSettled = useCallback((key: string, result: SwapSettled) => {
    setResults((prev) => (prev[key] != null ? prev : { ...prev, [key]: result }));
    // The result is shown on the token's row for a moment, then the next token begins.
    advanceTimer.current = setTimeout(() => {
      setIndex((i) => i + 1);
    }, TRIM_ADVANCE_DELAY_MS);
  }, []);
  // Each time a run reaches its summary, say how it ended — counts only (see trimEvents).
  const reportedRunRef = useRef<string | null>(null);
  useEffect(() => {
    if (stage !== "summary") { reportedRunRef.current = null; return; }
    const runKey = chosen.map((k) => `${k}:${results[k]?.status ?? "none"}`).join("|");
    if (reportedRunRef.current === runKey) return;
    reportedRunRef.current = runKey;
    emit?.(trimFinishedEvent(chosen, results));
  }, [stage, chosen, results, emit]);
  // Past the last token → the summary.
  useEffect(() => {
    if (stage === "run" && index >= queue.length && queue.length > 0) setStage("summary");
  }, [stage, index, queue.length]);
  /**
   * Cancel during the run. Tokens already swapped stay swapped — that cannot be undone and the
   * summary says exactly which. If nothing has happened yet there is nothing to summarise, so
   * the selector comes back as it was.
   */
  const stopRun = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    const anySettled = chosen.some((k) => results[k] != null);
    if (!anySettled) { setStage("select"); return; }
    setResults((prev) => {
      const next = { ...prev };
      for (const k of chosen) if (next[k] == null) next[k] = { status: "not_started" };
      return next;
    });
    setStage("summary");
  };

  // ---- rendering ----------------------------------------------------------
  if (stage === "review") {
    return (
      <div className="review-modal__footer review-modal__footer--actions">
        <button type="button" className="review-modal__tertiary-action" onClick={onClose}>
          {SWAP_CONFIRM_CANCEL_LABEL}
        </button>
        {answered ? (
          <button type="button" className="review-modal__primary-action" onClick={openSelector}>
            <span>{TRIM_ACTION_LABEL}</span>
          </button>
        ) : (
          // The routes are still being checked. Same button, same place, spinning.
          <button type="button" className="review-modal__primary-action review-modal__primary-action--busy cta-hold" aria-disabled="true" onClick={(e) => e.preventDefault()}>
            <span className="cta-hold__label" aria-hidden="true">{TRIM_ACTION_LABEL}</span>
            <span className="swap-confirm__spinner cta-hold__spinner" aria-hidden="true" />
            <span role="status" aria-live="polite" className="sr-only">{SWAP_CONFIRM_CHECKING}</span>
          </button>
        )}
      </div>
    );
  }

  if (stage === "select") {
    const count = rows.filter((r) => r.sellable && selected.has(r.key)).length;
    return (
      <section className="review-modal__section swap-confirm trim-step" aria-label={TRIM_SELECT_TITLE}>
        <p className="modal__intro">{TRIM_SELECT_INTRO}</p>
        <ul className="trim-list">
          {rows.map((r) => {
            const checked = r.sellable && selected.has(r.key);
            const id = `trim-token-${r.key}`;
            return (
              <li key={r.key} className={`trim-row${r.sellable ? "" : " trim-row--blocked"}`}>
                <label className="trim-row__label" htmlFor={id}>
                  <input
                    id={id}
                    type="checkbox"
                    className="trim-row__check"
                    checked={checked}
                    disabled={!r.sellable}
                    onChange={() => toggle(r.key)}
                  />
                  <img className="trim-row__icon" src={iconUrlFor(r.icon)} alt="" width={24} height={24} />
                  <span className="trim-row__main">
                    <span className="trim-row__symbol">{r.symbol}</span>
                    <span className="trim-row__value">{formatUsd(r.valueUsd)}</span>
                  </span>
                  <span className={`trim-row__meta${r.sellable ? "" : " trim-row__meta--reason"}`}>
                    {r.sellable
                      ? (r.previewTokens && formatSettledAmount(r.previewTokens) ? trimSelectPreview(formatSettledAmount(r.previewTokens) as string) : "")
                      : r.blockedReason}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="review-modal__footer review-modal__footer--actions">
          <button type="button" className="review-modal__tertiary-action" onClick={onClose}>
            {SWAP_CONFIRM_CANCEL_LABEL}
          </button>
          {count > 0 && props.canRun !== false ? (
            <button type="button" className="review-modal__primary-action" onClick={startSelected}>
              <span>{trimSelectCta(count)}</span>
            </button>
          ) : (
            // Nothing is ticked. The button keeps its place, greyed; ticking a token restores it.
            <button type="button" className="review-modal__primary-action review-modal__primary-action--disabled" aria-disabled="true" onClick={(e) => e.preventDefault()}>
              <span>{count > 0 ? trimSelectCta(count) : TRIM_ACTION_LABEL}</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  const statusFor = (key: string, active: boolean): { text: string; tone: "ok" | "failed" | "muted" | "active"; signature: string | null } => {
    const res = results[key];
    if (res == null) return active ? { text: TRIM_STATUS_ACTIVE, tone: "active", signature: null } : { text: TRIM_STATUS_WAITING, tone: "muted", signature: null };
    if (res.status === "confirmed") {
      const amount = res.receivedTokens ? formatSettledAmount(res.receivedTokens) : null;
      return { text: amount ? trimStatusReceived(amount) : TRIM_STATUS_SWAPPED, tone: "ok", signature: res.signature };
    }
    if (res.status === "not_started") return { text: TRIM_STATUS_NOT_STARTED, tone: "muted", signature: null };
    if (res.status === "not_offered") return { text: TRIM_BLOCKED_REASON_DEFAULT, tone: "failed", signature: null };
    // The failure's own approved title — the same words its full screen would have used.
    const title = failureCopy(res.failure, res.signature != null)?.title ?? TRIM_BLOCKED_REASON_DEFAULT;
    // A decline is the user's own choice and a timeout is not a failure — neither is drawn as an error.
    const calm = res.failure === "confirm_timeout" || res.failure === "declined" || res.failure === "cancelled";
    return { text: title, tone: calm ? "muted" : "failed", signature: res.signature };
  };
  const tokenList = (keys: string[], activeKey: string | undefined) => (
    <ul className="trim-list trim-list--status">
      {keys.map((k) => {
        const r = rowByKey.get(k);
        if (!r) return null;
        const st = statusFor(k, k === activeKey);
        const explorer = st.signature ? solscanTransactionUrl(st.signature) : null;
        return (
          <li key={k} className={`trim-row trim-row--status${k === activeKey ? " trim-row--active" : ""}`}>
            <img className="trim-row__icon" src={iconUrlFor(r.icon)} alt="" width={24} height={24} />
            <span className="trim-row__main">
              <span className="trim-row__symbol">{r.symbol}</span>
              <span className="trim-row__value">{formatUsd(r.valueUsd)}</span>
            </span>
            <span className={`trim-row__meta trim-status trim-status--${st.tone}`}>
              {st.text}
              {explorer && (
                <a className="trim-status__link" href={explorer} target="_blank" rel="noopener noreferrer" aria-label={`${SWAP_CONFIRM_VIEW_TRANSACTION}: ${r.symbol}`}>
                  {SWAP_CONFIRM_VIEW_TRANSACTION}
                </a>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );

  if (stage === "run") {
    const row = currentKey ? rowByKey.get(currentKey) : undefined;
    const settled = currentKey != null && results[currentKey] != null;
    return (
      <>
        <div className="trim-progress" aria-label={`${settledCount} of ${queue.length}`}>
          {tokenList(queue, settled ? undefined : currentKey)}
        </div>
        {/* Between tokens: the result stays on its row for a moment. The footer keeps its place,
            spinning, so the modal does not collapse to a bare list and spring back. */}
        {settled && (
          <div className="review-modal__footer review-modal__footer--actions">
            <button type="button" className="review-modal__tertiary-action" onClick={stopRun}>
              {SWAP_CONFIRM_CANCEL_LABEL}
            </button>
            <button type="button" className="review-modal__primary-action review-modal__primary-action--busy cta-hold" aria-disabled="true" onClick={(e) => e.preventDefault()}>
              <span className="cta-hold__label" aria-hidden="true">{TRIM_ACTION_LABEL}</span>
              <span className="swap-confirm__spinner cta-hold__spinner" aria-hidden="true" />
            </button>
          </div>
        )}
        {row?.leg && !settled && (
          <TrimLegRunner
            key={row.key}
            leg={row.leg}
            fetcher={props.fetcher}
            slippageBps={props.slippageBps}
            nowMs={props.nowMs}
            demo={props.demo}
            onConnectWallet={props.onConnectWallet}
            onStop={stopRun}
            onSettled={(result) => onSettled(row.key, result)}
            onSwapProgress={props.onSwapProgress}
          />
        )}
      </>
    );
  }

  // ---- summary ------------------------------------------------------------
  const received = swappedKeys.map((k) => (results[k] as Extract<TrimResult, { status: "confirmed" }>).receivedTokens);
  const allRead = received.every((v): v is string => v != null);
  const total = allRead && received.length > 0 ? formatSettledAmount(sumTokenStrings(received as string[], 6)) : null;
  const retryable = chosen.filter((k) => isTrimRetryable(results[k]));
  const pending = chosen.some((k) => { const r = results[k]; return r?.status === "failed" && r.failure === "confirm_timeout"; });
  return (
    <section className="review-modal__section swap-confirm swap-confirm--settled trim-step" aria-label={summaryTitle}>
      {swappedKeys.length > 0 && (
        <span className="swap-confirm__alert swap-confirm__alert--success" aria-hidden="true">
          <ButtonIcon src={checkBadgeUrl} size={40} />
        </span>
      )}
      {swappedKeys.length === 0 ? (
        // Nothing landed: the same Info banner the review uses for "no swap meets our limits",
        // in the same place — directly under the title. A swap still awaiting confirmation
        // may yet land, so that case may not say nothing moved.
        <InfoBanner title={pending ? TRIM_SUMMARY_PENDING_NOTE : TRIM_SUMMARY_NONE_DESC} />
      ) : (
        <p className="modal__intro trim-summary__line">
          {total
            ? trimSummaryReceived(total, swappedKeys.length, chosen.length)
            : trimSummarySwapped(swappedKeys.length, chosen.length)}
        </p>
      )}
      {tokenList(chosen, undefined)}
      {pending && swappedKeys.length > 0 && <p className="review-modal__guardrail-hint">{TRIM_SUMMARY_PENDING_NOTE}</p>}
      <div className="review-modal__footer review-modal__footer--actions">
        {retryable.length > 0 ? (
          <>
            <button type="button" className="review-modal__tertiary-action" onClick={onClose}>
              {SWAP_CONFIRM_DONE_LABEL}
            </button>
            <button type="button" className="review-modal__primary-action" onClick={() => startRun(retryable, false)}>
              <span>{SWAP_CONFIRM_RETRY_LABEL}</span>
            </button>
          </>
        ) : (
          <button type="button" className="review-modal__primary-action" onClick={onClose}>
            <span>{swappedKeys.length > 0 ? SWAP_CONFIRM_DONE_LABEL : SWAP_CONFIRM_CLOSE_LABEL}</span>
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * One token's turn. It owns this token's route comparison — fetched fresh at its turn, so no
 * token is held to a quote that aged while the ones before it were being approved — and hands
 * the rest to the ordinary swap step, started for the user and reporting how it ended.
 */
function TrimLegRunner({
  leg, fetcher, slippageBps, nowMs, demo, onConnectWallet, onStop, onSettled, onSwapProgress,
}: {
  leg: SwapActionContext;
  fetcher?: SwapQuoteFetcher;
  slippageBps?: number;
  nowMs?: number;
  demo?: boolean;
  onConnectWallet?: () => void;
  onStop: () => void;
  onSettled: (result: SwapSettled) => void;
  onSwapProgress?: (progress: SwapProgress) => void;
}) {
  const legs = useMemo(() => [leg], [leg]);
  const { phase, legResults, refresh, refreshing } = useSwapQuoteComparison(legs, { enabled: true, slippageBps, fetcher });
  const first = legResults[0];
  const assessment = first?.result.ok ? first.result.assessment : null;
  return (
    <SwapExecutionSection
      action={leg}
      assessment={assessment}
      comparisonLoading={phase !== "done" || refreshing}
      onRefreshComparison={() => refresh({ quiet: true })}
      slippageBps={slippageBps}
      nowMs={nowMs}
      demo={demo}
      onClose={onStop}
      onConnectWallet={onConnectWallet}
      continueLabel={TRIM_ACTION_LABEL}
      perLegApproval
      autoStart
      onSettled={onSettled}
      onSwapProgress={onSwapProgress}
    />
  );
}

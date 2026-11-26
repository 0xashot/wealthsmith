/**
 * SwapWalkthroughPage — the swap confirm flow end to end, in the app rather than in a gallery.
 *
 * WHY THIS EXISTS. Every other review surface shows the confirm sheet as a picture: states
 * rendered from props, one per cell. That is the right way to compare copy and layout, and the
 * wrong way to answer "does this feel right to use". Three bugs found in one day were
 * interaction bugs — a dropped event, a blanking renewal, a footer that jumped — and none of
 * them were visible in a still.
 *
 * So this is the real thing: the real dashboard chrome, the real suggestion rail, the real
 * review modal, the real confirm sheet, fed by the real pipeline. Click the card and the whole
 * flow runs.
 *
 * WHY NOT DEMO MODE ITSELF. The canonical Demo portfolio produces a buffer/yield story and no
 * swap-capable suggestion at all, and its cards are pinned by fixtures. Changing it to show a
 * Rebalance would rewrite what every demo visitor sees — a product decision, not a review
 * convenience. This page takes the same engine and feeds it a crypto-heavy portfolio instead,
 * leaving Demo Mode untouched. If the flow should ship into Demo Mode later, that is one line
 * in DemoDashboardPage plus a changed portfolio.
 *
 * WHY DEMO MODE AT ALL. There is no wallet here, so the live path cannot run — and must not:
 * a review surface with a real submitter is one stray click from a real mainnet swap. In Demo
 * Mode the sheet opens, the terms are the demo quote's own, and Approve is visibly unavailable
 * with the reason. Nothing on this page can reach the execution endpoint.
 *
 * LIVE SIMULATION (`?sim=…`). Demo Mode shows each ending at rest; it cannot show the flow
 * MOVING, because it bypasses the plan hook, the wallet and the submitter. The simulation runs
 * the LIVE branch instead — same hook, state machine and sheet a connected wallet gets — with a
 * pretend wallet and a pretend server (see swapLiveSimulation.ts). It still cannot move money:
 * with the seam provided the real wallet adapter is not used at all.
 *
 * Gated behind the same build-time flag as /testing, so a public build never registers it.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import RealWalletSuggestionsRail from "../components/RealWalletSuggestionsRail";
import ToastHost, { type ToastData } from "../components/ToastHost";
import { END_TO_END_SCENARIOS, buildTrimWalkthroughRail, BONK_MINT, WIF_MINT, MOBY_MINT, PENGU_MINT, FARTCOIN_MINT } from "./endToEndTestingFixtures";
import type { TrimFlowPreset } from "../components/trim/TrimFlowSection";
import type { TrimResult } from "../suggestions/swapExecution/trimFlow";
import { DEMO_OUTCOMES, DEMO_SIGNATURE } from "../suggestions/swapExecution/demoOutcomes";
import { SWAP_CONFIRM_EXPIRED_TOAST } from "../state/approvedCopy";
import { SwapExecutionSeamContext } from "../components/swapExecution/swapExecutionSeam";
import { SwapFlowEventsContext, type SwapFlowEvent } from "../components/swapExecution/swapFlowEvents";
import {
  buildLiveSimulationSeam,
  noRouteQuoteFetcher,
  shortLivedFirstQuoteFetcher,
  slowedQuoteFetcher,
  trimSimQuoteFetcher,
  simWait,
  SIM_RECONNECT_DELAY_MS,
} from "./swapLiveSimulation";

/** The live-simulation variants. Each runs the real (non-demo) flow against stand-ins. */
const SIMULATIONS = [
  { key: "swap", label: "Full swap", note: "The whole live flow: Review waits for the route, Swap waits in place for terms, Approve hands to a pretend wallet, and the swap lands." },
  { key: "expired-quote", label: "Aged quote", note: "The route comparison goes stale a moment after the review opens. Wait three seconds, then press Swap: it re-runs the comparison first, still spinning in place." },
  { key: "no-route", label: "No route", note: "No route meets the limits. The review says so in a banner under its title and offers Close and Check Again — no Swap, and no link out. Check Again spins in place and, here, finds nothing new." },
  { key: "route-returns", label: "Route returns", note: "No route when the review opens. Press Check Again: this time one is found, the banner goes, and the review shows the route with Cancel and Swap." },
  { key: "no-wallet", label: "After a refresh", note: "Signed in, but the wallet link is gone — what every page refresh leaves behind. Swap is a normal button: pressing it reopens the link, spinning in place, and carries on to the terms." },
  { key: "wallet-declined", label: "Reconnect declined", note: "Same start, but the wallet declines the first request. Swap is replaced by Reconnect Wallet; press it and the link opens, and Swap returns." },
  { key: "trim", label: "Trim: three tokens", note: "A Trim naming three tokens. Press Trim: the selector ticks the two that can be sold (WIF has one route only, and is offered like any other) and shows why MOBY cannot. Trim 2 Tokens runs them one at a time — terms, approval, result — and ends on a summary." },
  { key: "trim-fail", label: "Trim: one fails", note: "Same Trim, but WIF's swap cannot be prepared the first time. The run carries on, the summary says which token failed, and Try Again runs only that one." },
  { key: "trim-decline", label: "Trim: one declined", note: "Same Trim, but the wallet declines WIF's approval. BONK stays swapped; the summary says WIF was canceled, and — because that was the user's own choice — offers no Try Again." },
  { key: "trim-single", label: "Trim: one token", note: "A Trim naming a single token. No selector: Trim goes straight to that token's terms." },
  { key: "wallet-unknown", label: "No wallet known", note: "No wallet is known to reconnect to. Swap is replaced by Connect Wallet, which closes the review and opens the app's Connect Wallet dialog. A moment later a wallet is 'connected' and the same review reopens, now with Swap." },
] as const;
type SimulationKey = (typeof SIMULATIONS)[number]["key"];

/**
 * EVERY TRIM STATE, each opened directly (`?trim=…`).
 *
 * The simulations above show a Trim in motion; reaching its fifth screen means running four.
 * These open the same real review already AT a state — the selector, a token's terms, each
 * kind of summary — so all of them can be read side by side, one click each. The review opens
 * by itself. Everything is still the production components on the pretend wallet and server:
 * where a state has a button (Trim, Approve, Try Again), pressing it carries on for real.
 */
const SIG = DEMO_SIGNATURE;
const got = (receivedTokens: string | null): TrimResult => ({ status: "confirmed", receivedTokens, signature: SIG });
const failed = (failure: "plan_unavailable" | "declined" | "confirm_timeout" | "submit_failed", sent = false): TrimResult =>
  ({ status: "failed", failure, signature: sent ? SIG : null });
const TRIM_STATES: Array<{
  key: string;
  group: string;
  label: string;
  note: string;
  rail: "three" | "one" | "listed" | "frozen";
  /** Tokens whose sale is refused for price impact. Default: MOBY only. */
  blocked?: "all";
  preset?: TrimFlowPreset;
}> = [
  { key: "review", group: "Start", label: "Review", rail: "three", note: "The suggestion's review. The footer is Cancel and Trim; Trim spins in place while the routes are checked." },
  { key: "single", group: "Start", label: "One token", rail: "one", note: "A Trim naming a single token. There is no selector: Trim goes straight to that token's terms." },
  { key: "listed", group: "Start", label: "Verified meme coins", rail: "listed", note: "Two meme coins outside our approved list, verified and tagged meme by Jupiter, beside BONK. They are named by their listing; PENGU shows its listed icon, Fartcoin's icon host is not one we load from, so it gets the generic mark." },

  { key: "select", group: "Choose tokens", label: "Selector", rail: "three", preset: { stage: "select" }, note: "Every token the Trim names. The two that can be sold are ticked; MOBY cannot, and says why. The button counts what is ticked." },
  { key: "select-listed", group: "Choose tokens", label: "Selector, verified meme coins", rail: "listed", preset: { stage: "select" }, note: "The same selector with verified meme coins from outside our list." },
  { key: "select-frozen", group: "Choose tokens", label: "A token that can't be moved", rail: "frozen", preset: { stage: "select" }, note: "FRZN is frozen in the wallet. It stays in the list, greyed, with the reason, so the total still adds up." },
  { key: "select-none", group: "Choose tokens", label: "Nothing can be sold", rail: "three", blocked: "all", preset: { stage: "select" }, note: "No token has a route inside our limits right now. Every row says why and the button stays greyed." },

  { key: "run-first", group: "Swapping", label: "Terms, 1 of 2", rail: "three", preset: { stage: "run", chosen: ["BONK", "WIF"] }, note: "The first token's terms, with the list of chosen tokens above. Approve hands it to the (pretend) wallet." },
  { key: "run-second", group: "Swapping", label: "Terms, 2 of 2", rail: "three", preset: { stage: "run", chosen: ["BONK", "WIF"], results: { BONK: got("1199.16") } }, note: "BONK has landed and shows what arrived; WIF's terms are up." },

  { key: "done-all", group: "Summary", label: "Completed", rail: "three", preset: { stage: "summary", chosen: ["BONK", "WIF"], results: { BONK: got("1199.16"), WIF: got("799.44") } }, note: "Every chosen token was swapped. The total is the sum of what the chain says arrived." },
  { key: "done-unread", group: "Summary", label: "Completed, an amount unread", rail: "three", preset: { stage: "summary", chosen: ["BONK", "WIF"], results: { BONK: got("1199.16"), WIF: got(null) } }, note: "Both landed but one delivered amount could not be read: the summary says how many were swapped and gives no figure." },
  { key: "partly-failed", group: "Summary", label: "Partly: one failed", rail: "three", preset: { stage: "summary", chosen: ["BONK", "WIF"], results: { BONK: got("1199.16"), WIF: failed("plan_unavailable") } }, note: "WIF could not be prepared. BONK stays swapped; Try Again runs only WIF." },
  { key: "partly-declined", group: "Summary", label: "Partly: one declined", rail: "three", preset: { stage: "summary", chosen: ["BONK", "WIF"], results: { BONK: got("1199.16"), WIF: failed("declined") } }, note: "WIF was declined in the wallet. That was the user's choice, so there is no Try Again." },
  { key: "partly-stopped", group: "Summary", label: "Partly: stopped with Cancel", rail: "three", preset: { stage: "summary", chosen: ["BONK", "WIF"], results: { BONK: got("1199.16"), WIF: { status: "not_started" } } }, note: "Cancel was pressed after BONK landed. WIF was never started; no Try Again." },
  { key: "partly-reverted", group: "Summary", label: "Partly: one didn't go through", rail: "three", preset: { stage: "summary", chosen: ["BONK", "WIF"], results: { BONK: got("1199.16"), WIF: failed("submit_failed", true) } }, note: "WIF was sent and failed on-chain. It links to the transaction; Try Again runs it again." },
  { key: "partly-pending", group: "Summary", label: "Partly: one still pending", rail: "three", preset: { stage: "summary", chosen: ["BONK", "WIF"], results: { BONK: got("1199.16"), WIF: failed("confirm_timeout", true) } }, note: "WIF was sent and not confirmed in time. It may still land, so it is not called a failure and is not retried." },
  { key: "none-failed", group: "Summary", label: "Nothing: couldn't prepare", rail: "three", preset: { stage: "summary", chosen: ["BONK", "WIF"], results: { BONK: failed("plan_unavailable"), WIF: failed("plan_unavailable") } }, note: "Neither swap could be prepared. The banner says nothing moved; Try Again runs both." },
  { key: "none-declined", group: "Summary", label: "Nothing: declined", rail: "three", preset: { stage: "summary", chosen: ["WIF"], results: { WIF: failed("declined") } }, note: "The only chosen token was declined in the wallet. Banner, and Close alone." },
  { key: "none-pending", group: "Summary", label: "Nothing: still pending", rail: "three", preset: { stage: "summary", chosen: ["WIF"], results: { WIF: failed("confirm_timeout", true) } }, note: "The only swap was sent and not confirmed. The banner does NOT say nothing moved — it may yet land." },
];

/**
 * The crypto-heavy scenario the End-to-End tab already lists, reused rather than rebuilt.
 *
 * A second hand-written portfolio here would be a second thing to keep in step with the
 * pipeline — and the first attempt at one silently produced zero swap actions because it was
 * missing `uiAmount`, `decimals` and a mint, which looks identical to a broken derivation.
 * Taking the scenario itself means this page and that tab can never disagree about what the
 * engine does with this wallet.
 */
const CRYPTO_HEAVY = END_TO_END_SCENARIOS.find((s) => s.key === "e2e-crypto-heavy");

export default function SwapWalkthroughPage() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  // Chosen in the URL so a particular walkthrough can be linked to and returned to.
  const outcomeKey = typeof window === "undefined" ? "ready" : (new URLSearchParams(window.location.search).get("outcome") ?? "ready");
  const outcome = DEMO_OUTCOMES.find((o) => o.key === outcomeKey) ?? DEMO_OUTCOMES[0];
  const pushToast = (message: string, helper?: string) =>
    setToasts((t) => [...t, { id: Date.now(), message, helper, variant: "info" }]);

  // The simulation's analytics receiver: a list on the page. See the events panel under the rail.
  const [flowEvents, setFlowEvents] = useState<SwapFlowEvent[]>([]);
  const recordFlowEvent = useCallback((e: SwapFlowEvent) => setFlowEvents((prev) => [...prev, e]), []);

  const simKey = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("sim");
  const simulation = SIMULATIONS.find((x) => x.key === simKey) ?? null;

  // A Trim state opened directly. It runs on the same live branch as a simulation.
  const trimKey = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("trim");
  const trimState = simulation == null ? TRIM_STATES.find((x) => x.key === trimKey) ?? null : null;

  // The scenario already carries the offline demo fetcher; the live client is never used here.
  const isTrimSim = trimState != null || (simulation != null && simulation.key.startsWith("trim"));
  const trimRailKind = trimState?.rail ?? (simulation?.key === "trim-single" ? "one" : "three");
  const baseRail = useMemo(
    () => (isTrimSim ? buildTrimWalkthroughRail(trimRailKind) : CRYPTO_HEAVY?.rail ?? null),
    [isTrimSim, trimRailKind],
  );
  // The offline quote source: the scenario's own, or — for a Trim — pretend quotes per token.
  const blockAll = trimState?.blocked === "all";
  const innerFetcher = useMemo(
    () => (isTrimSim
      ? trimSimQuoteFetcher({ singleRoute: [WIF_MINT], blocked: blockAll ? [BONK_MINT, WIF_MINT, MOBY_MINT, PENGU_MINT, FARTCOIN_MINT] : [MOBY_MINT] })
      : baseRail?.swapQuoteFetcher),
    [isTrimSim, baseRail, blockAll],
  );
  // In a simulation the same offline quotes arrive after a realistic delay, shaped per variant.
  // A Trim state is opened to be LOOKED at, so its quotes are not slowed.
  const simParts = useMemo(() => {
    const inner = innerFetcher;
    if (baseRail == null || inner == null) return null;
    if (trimState != null) return { rail: { ...baseRail, swapQuoteFetcher: inner } };
    if (simulation == null) return null;
    const variant: SimulationKey = simulation.key;
    const shaped =
      variant === "expired-quote" ? shortLivedFirstQuoteFetcher(inner)
        : variant === "no-route" ? noRouteQuoteFetcher(inner)
          : variant === "route-returns" ? noRouteQuoteFetcher(inner, 2)
            : inner;
    return { rail: { ...baseRail, swapQuoteFetcher: slowedQuoteFetcher(shaped) } };
  }, [baseRail, simulation, trimState, innerFetcher]);
  // The Trim card of this rail — the one a Trim state opens by itself.
  const trimCardId = useMemo(() => {
    const entry = Object.entries(baseRail?.swapActionById ?? {}).find(([, a]) => a.status === "ready" && a.legs[0]?.suggestionCategory === "trim");
    return entry?.[0];
  }, [baseRail]);
  const rail = simParts?.rail ?? baseRail;

  // The pretend wallet link. It starts closed in the wallet variants and is opened by the
  // flow's own reconnect — kept apart from the rail above so that opening it does not rebuild
  // the suggestions under an open review.
  const startsUnlinked = simulation?.key === "no-wallet" || simulation?.key === "wallet-declined" || simulation?.key === "wallet-unknown";
  const [walletLinked, setWalletLinked] = useState(false);
  const reconnectAttempts = useRef(0);
  const seam = useMemo(() => {
    const inner = innerFetcher;
    if ((simulation == null && trimState == null) || inner == null) return null;
    const variant: SimulationKey | null = simulation?.key ?? null;
    return buildLiveSimulationSeam({
      failPlanOnce: variant === "trim-fail" ? [WIF_MINT] : undefined,
      declineOnce: variant === "trim-decline" ? [WIF_MINT] : undefined,
      // The plan's terms come from the UNSHAPED quotes: a simulated plan service always answers.
      quoteFetcher: inner,
      walletConnected: !startsUnlinked || walletLinked,
      reconnect: variant === "wallet-unknown" ? undefined : async () => {
        await simWait(SIM_RECONNECT_DELAY_MS);
        reconnectAttempts.current += 1;
        // The first request is declined in this variant; the retry goes through.
        if (variant === "wallet-declined" && reconnectAttempts.current === 1) return false;
        setWalletLinked(true);
        return true;
      },
    });
  }, [innerFetcher, simulation, trimState, startsUnlinked, walletLinked]);

  if (rail == null) {
    return <p className="modal__intro">The e2e-crypto-heavy scenario is missing — it was renamed or removed.</p>;
  }
  const swapActions = Object.keys(rail.swapActionById ?? {}).length;

  return (
    <div className="dashboard-page">
      <main className="dashboard-page__main">
        <header className="dashboard-page__header">
          <h1 className="dashboard-page__title">Swap flow walkthrough</h1>
          <p className="modal__intro">
            The real rail, review modal and confirm sheet, fed by the real pipeline on a
            crypto-heavy sample portfolio. Open the <strong>Rebalance</strong> suggestion on the
            right, read the route comparison, then press <strong>Swap</strong> to reach the
            confirm step. Approve is unavailable because there is no wallet — hover it for the
            reason. Nothing here can reach the execution endpoint.
          </p>
          <nav className="swap-walkthrough__outcomes" aria-label="Walkthrough outcome">
            {DEMO_OUTCOMES.map((o) => (
              <a
                key={o.key}
                href={`?outcome=${o.key}`}
                className={`swap-walkthrough__outcome${simulation == null && trimState == null && o.key === outcome.key ? " swap-walkthrough__outcome--current" : ""}`}
                aria-current={simulation == null && trimState == null && o.key === outcome.key ? "page" : undefined}
              >
                {o.label}
              </a>
            ))}
          </nav>
          <p className="modal__intro">
            <strong>Live simulation</strong> — the real flow in motion, with a pretend wallet and
            a pretend server. Nothing is sent anywhere.
          </p>
          <nav className="swap-walkthrough__outcomes" aria-label="Live simulation">
            {SIMULATIONS.map((x) => (
              <a
                key={x.key}
                href={`?sim=${x.key}`}
                className={`swap-walkthrough__outcome${x.key === simulation?.key ? " swap-walkthrough__outcome--current" : ""}`}
                aria-current={x.key === simulation?.key ? "page" : undefined}
              >
                {x.label}
              </a>
            ))}
          </nav>
          <p className="modal__intro">
            <strong>Trim states</strong> — every state of a Trim, each opened directly. The
            review opens by itself; buttons still work and carry on in the pretend wallet.
          </p>
          {[...new Set(TRIM_STATES.map((x) => x.group))].map((group) => (
            <nav key={group} className="swap-walkthrough__outcomes" aria-label={`Trim states: ${group}`}>
              <span className="swap-walkthrough__group">{group}</span>
              {TRIM_STATES.filter((x) => x.group === group).map((x) => (
                <a
                  key={x.key}
                  href={`?trim=${x.key}`}
                  className={`swap-walkthrough__outcome${x.key === trimState?.key ? " swap-walkthrough__outcome--current" : ""}`}
                  aria-current={x.key === trimState?.key ? "page" : undefined}
                >
                  {x.label}
                </a>
              ))}
            </nav>
          ))}
          {trimState
            ? <p className="modal__intro"><strong>{trimState.label}.</strong> {trimState.note}</p>
            : simulation
              ? <p className="modal__intro"><strong>{simulation.label}.</strong> {simulation.note}</p>
              : <p className="modal__intro"><strong>{outcome.label}.</strong> {outcome.note}</p>}
          <p className="modal__intro">
            Pipeline produced <strong>{rail.cards.length}</strong> card(s) and{" "}
            <strong>{swapActions}</strong> swap action(s).
            {swapActions === 0 && " — no swap action means the derivation is broken."}
          </p>
        </header>
      </main>
      <aside className="dashboard-page__rail">
        {simParts && seam ? (
          // LIVE branch, stand-in edges. `demo` is NOT passed: this is the path a connected
          // wallet takes, and the seam is what keeps it away from a real one.
          <SwapExecutionSeamContext.Provider value={seam}>
           <SwapFlowEventsContext.Provider value={recordFlowEvent}>
            <RealWalletSuggestionsRail
              rail={simParts.rail}
              railLabel="Suggestions"
              // A Trim state opens its own review, already at that state.
              autoOpenId={trimState != null ? trimCardId : undefined}
              trimPreset={trimState?.preset}
              onSwapQuoteGaveUp={() => pushToast(SWAP_CONFIRM_EXPIRED_TOAST)}
              // The walkthrough has no Connect Wallet dialog of its own. This marks where it
              // opens, then reports a (pretend) wallet connected, as the app does when its
              // dialog closes with one — so the review can be seen reopening itself.
              onConnectWallet={(onConnected) => {
                pushToast("The Connect Wallet dialog opens here.");
                void simWait(SIM_RECONNECT_DELAY_MS).then(() => { setWalletLinked(true); onConnected?.(); });
              }}
            />
            {/* What the flow WOULD send to analytics, in order. Nothing leaves the page: the
                walkthrough has no analytics, so this list is the only receiver. It is here so
                the events can be read — and their contents checked — alongside the screens. */}
            <details className="walkthrough-events" open={flowEvents.length > 0}>
              <summary>Analytics events ({flowEvents.length}) — shown here only, sent nowhere</summary>
              <ol>
                {flowEvents.map((e, i) => {
                  const { name, ...props } = e;
                  return <li key={i}><code>{name}</code> {Object.keys(props).length > 0 ? <code>{JSON.stringify(props)}</code> : null}</li>;
                })}
              </ol>
            </details>
           </SwapFlowEventsContext.Provider>
          </SwapExecutionSeamContext.Provider>
        ) : (
          <RealWalletSuggestionsRail
            rail={rail}
            railLabel="Suggestions"
            demo
            demoOutcome={outcome.outcome}
            onSwapQuoteGaveUp={() => pushToast(SWAP_CONFIRM_EXPIRED_TOAST)}
          />
        )}
      </aside>
      <ToastHost toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}

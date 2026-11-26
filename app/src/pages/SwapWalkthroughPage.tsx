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
import { useMemo, useRef, useState } from "react";
import RealWalletSuggestionsRail from "../components/RealWalletSuggestionsRail";
import ToastHost, { type ToastData } from "../components/ToastHost";
import { END_TO_END_SCENARIOS } from "./endToEndTestingFixtures";
import { DEMO_OUTCOMES } from "../suggestions/swapExecution/demoOutcomes";
import { SWAP_CONFIRM_EXPIRED_TOAST } from "../state/approvedCopy";
import { SwapExecutionSeamContext } from "../components/swapExecution/swapExecutionSeam";
import {
  buildLiveSimulationSeam,
  noRouteQuoteFetcher,
  shortLivedFirstQuoteFetcher,
  slowedQuoteFetcher,
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
  { key: "wallet-unknown", label: "No wallet known", note: "No wallet is known to reconnect to. Swap is replaced by Connect Wallet, which closes the review and opens the app's Connect Wallet dialog. A moment later a wallet is 'connected' and the same review reopens, now with Swap." },
] as const;
type SimulationKey = (typeof SIMULATIONS)[number]["key"];

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

  const simKey = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("sim");
  const simulation = SIMULATIONS.find((x) => x.key === simKey) ?? null;

  // The scenario already carries the offline demo fetcher; the live client is never used here.
  const baseRail = useMemo(() => CRYPTO_HEAVY?.rail ?? null, []);
  // In a simulation the same offline quotes arrive after a realistic delay, shaped per variant.
  const simParts = useMemo(() => {
    const inner = baseRail?.swapQuoteFetcher;
    if (simulation == null || baseRail == null || inner == null) return null;
    const variant: SimulationKey = simulation.key;
    const shaped =
      variant === "expired-quote" ? shortLivedFirstQuoteFetcher(inner)
        : variant === "no-route" ? noRouteQuoteFetcher(inner)
          : variant === "route-returns" ? noRouteQuoteFetcher(inner, 2)
            : inner;
    return { rail: { ...baseRail, swapQuoteFetcher: slowedQuoteFetcher(shaped) } };
  }, [baseRail, simulation]);
  const rail = simParts?.rail ?? baseRail;

  // The pretend wallet link. It starts closed in the wallet variants and is opened by the
  // flow's own reconnect — kept apart from the rail above so that opening it does not rebuild
  // the suggestions under an open review.
  const startsUnlinked = simulation?.key === "no-wallet" || simulation?.key === "wallet-declined" || simulation?.key === "wallet-unknown";
  const [walletLinked, setWalletLinked] = useState(false);
  const reconnectAttempts = useRef(0);
  const seam = useMemo(() => {
    const inner = baseRail?.swapQuoteFetcher;
    if (simulation == null || inner == null) return null;
    const variant: SimulationKey = simulation.key;
    return buildLiveSimulationSeam({
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
  }, [baseRail, simulation, startsUnlinked, walletLinked]);

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
                className={`swap-walkthrough__outcome${simulation == null && o.key === outcome.key ? " swap-walkthrough__outcome--current" : ""}`}
                aria-current={simulation == null && o.key === outcome.key ? "page" : undefined}
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
          {simulation
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
            <RealWalletSuggestionsRail
              rail={simParts.rail}
              railLabel="Suggestions"
              onSwapQuoteGaveUp={() => pushToast(SWAP_CONFIRM_EXPIRED_TOAST)}
              // The walkthrough has no Connect Wallet dialog of its own. This marks where it
              // opens, then reports a (pretend) wallet connected, as the app does when its
              // dialog closes with one — so the review can be seen reopening itself.
              onConnectWallet={(onConnected) => {
                pushToast("The Connect Wallet dialog opens here.");
                void simWait(SIM_RECONNECT_DELAY_MS).then(() => { setWalletLinked(true); onConnected?.(); });
              }}
            />
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

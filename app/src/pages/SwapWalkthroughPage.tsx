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
 * Gated behind the same build-time flag as /testing, so a public build never registers it.
 */
import { useMemo, useState } from "react";
import RealWalletSuggestionsRail from "../components/RealWalletSuggestionsRail";
import ToastHost, { type ToastData } from "../components/ToastHost";
import { END_TO_END_SCENARIOS } from "./endToEndTestingFixtures";
import type { ExecutionFailureKey } from "../suggestions/swapExecution/executionLifecycle";
import { SWAP_CONFIRM_EXPIRED_TOAST, SWAP_CONFIRM_EXPIRED_TOAST_HELPER } from "../state/approvedCopy";

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

/**
 * The outcomes a walkthrough can end in, and the words for choosing one.
 *
 * Every entry drives the SAME chain — rail, review, confirm step — and differs only in how it
 * ends. The happy path was the only one anyone could walk, which is how a confirm step's
 * failure copy stays unread until a user is the first to meet it.
 */
const OUTCOMES: { key: string; failure: ExecutionFailureKey | null; label: string; note: string }[] = [
  { key: "ready", failure: null, label: "Succeeds", note: "Terms, then an Approve that Demo Mode cannot press." },
  { key: "unavailable", failure: "plan_unavailable", label: "Couldn't prepare", note: "The provider is down, or execution is switched off. Nothing was attempted." },
  { key: "verification", failure: "verification_failed", label: "Couldn't verify", note: "The transaction we were handed does not match the terms we would show. We refuse on the user's behalf." },
  { key: "expired", failure: "expired", label: "Terms expired", note: "The quote ran out before it was approved. Refresh is offered because fresh terms are the remedy." },
  { key: "declined", failure: "declined", label: "Declined", note: "Said no in the wallet. A normal outcome, not an error." },
];

export default function SwapWalkthroughPage() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  // Chosen in the URL so a particular walkthrough can be linked to and returned to.
  const outcomeKey = typeof window === "undefined" ? "ready" : (new URLSearchParams(window.location.search).get("outcome") ?? "ready");
  const outcome = OUTCOMES.find((o) => o.key === outcomeKey) ?? OUTCOMES[0];
  const pushToast = (message: string, helper?: string) =>
    setToasts((t) => [...t, { id: Date.now(), message, helper, variant: "info" }]);

  // The scenario already carries the offline demo fetcher; the live client is never used here.
  const rail = useMemo(() => CRYPTO_HEAVY?.rail ?? null, []);

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
            {OUTCOMES.map((o) => (
              <a
                key={o.key}
                href={`?outcome=${o.key}`}
                className={`swap-walkthrough__outcome${o.key === outcome.key ? " swap-walkthrough__outcome--current" : ""}`}
                aria-current={o.key === outcome.key ? "page" : undefined}
              >
                {o.label}
              </a>
            ))}
          </nav>
          <p className="modal__intro"><strong>{outcome.label}.</strong> {outcome.note}</p>
          <p className="modal__intro">
            Pipeline produced <strong>{rail.cards.length}</strong> card(s) and{" "}
            <strong>{swapActions}</strong> swap action(s).
            {swapActions === 0 && " — no swap action means the derivation is broken."}
          </p>
        </header>
      </main>
      <aside className="dashboard-page__rail">
        <RealWalletSuggestionsRail
          rail={rail}
          railLabel="Suggestions"
          demo
          demoFailure={outcome.failure}
          onSwapQuoteGaveUp={() => pushToast(SWAP_CONFIRM_EXPIRED_TOAST, SWAP_CONFIRM_EXPIRED_TOAST_HELPER)}
        />
      </aside>
      <ToastHost toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}

/**
 * PortfolioCompletenessBanner — Step 17H.2. Renders the SINGLE primary portfolio-completeness notice from
 * the already-mounted PortfolioCompletenessResult. It does NOT recompute completeness — it only maps the
 * result to copy via `selectPrimaryCompletenessWarning`. Reuses the existing `.alert` structure with a
 * soft `--notice` (warning) severity; no execution action, no scores/reason codes, no "missing/lost" copy.
 * A complete portfolio renders nothing.
 */
import type { PortfolioCompletenessResult } from "../wallet/portfolioCompleteness";
import { selectPrimaryCompletenessWarning } from "./portfolioCompletenessUi";

export default function PortfolioCompletenessBanner({ completeness }: { completeness: PortfolioCompletenessResult | null | undefined }) {
  const warning = selectPrimaryCompletenessWarning(completeness);
  if (!warning) return null;
  const titleId = "portfolio-completeness-title";
  return (
    <section className="alert alert--notice" role="region" aria-labelledby={warning.title ? titleId : undefined} aria-label={warning.title ? undefined : warning.body}>
      <div className="alert__content">
        {warning.title ? <h2 id={titleId} className="alert__title">{warning.title}</h2> : null}
        <p className="alert__description">{warning.body}</p>
      </div>
    </section>
  );
}

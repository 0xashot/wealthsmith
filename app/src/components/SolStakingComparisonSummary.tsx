/**
 * SolStakingComparisonSummary — Step 14Z. A compact, read-only card-level summary of the current
 * SOL staking comparison leader. Rendered on the staking suggestion card ONLY when the display
 * status is available. It shows the current leader, key scored metrics, freshness, the
 * deterministic "why it currently leads" sentence, and the dynamic-result disclosure — and no
 * execution CTA. It never changes the suggestion title/action and never labels JitoSOL the leader.
 */
import type { SolStakingSelectorPresentation } from "../suggestions/solStakingSelectorPresentationTypes";

interface Props {
  presentation?: SolStakingSelectorPresentation;
}

export default function SolStakingComparisonSummary({ presentation }: Props) {
  // Only show the top designation when the comparison is available. Otherwise render nothing —
  // the existing suggestion card content stays intact (never a JitoSOL fallback leader).
  if (!presentation || presentation.status !== "available" || !presentation.topProtocol) return null;

  const top = presentation.topProtocol;
  const exp = presentation.leaderExplanation;
  return (
    <div className="suggestion-card__comparison" aria-label="Top protocol to review right now">
      <p className="suggestion-card__comparison-badge">Top protocol to review right now</p>
      <p className="suggestion-card__comparison-name">{top.protocolName} · {top.assetSymbol}</p>
      <dl className="suggestion-card__comparison-metrics">
        <div><dt>Current APY</dt><dd>{top.currentApyPct}%</dd></div>
        <div><dt>30-day APY</dt><dd>{top.apy30dPct}%</dd></div>
        <div><dt>Reviewed risk</dt><dd>{top.reviewedRiskScore.toFixed(2)}/10</dd></div>
      </dl>
      {exp && (
        <p className="suggestion-card__comparison-why"><span className="suggestion-card__comparison-why-label">Why it currently leads:</span> {exp.compactSummary}</p>
      )}
      <p className="suggestion-card__comparison-freshness">{presentation.freshnessText}</p>
      <p className="suggestion-card__comparison-disclosure">This may change as market data refreshes.</p>
    </div>
  );
}

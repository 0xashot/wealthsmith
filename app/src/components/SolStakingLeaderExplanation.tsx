/**
 * SolStakingLeaderExplanation — Step 14Z. Read-only modal renderer for the current SOL staking
 * comparison: the leader header, the deterministic "Why this protocol currently leads" analysis
 * (leader vs runner-up on the four scored dimensions), the runner-up comparison, non-scored "Other
 * considerations", and the ranked eligible candidates. It renders ONLY the presentation the engine
 * already produced — it never recalculates the ranking, changes selection, or executes anything.
 */
import type { SolStakingSelectorPresentation } from "../suggestions/solStakingSelectorPresentationTypes";

interface Props {
  presentation: SolStakingSelectorPresentation;
}

const usdCompact = (n: number) => `$${(n / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}M`;
const solCompact = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} SOL`;

export default function SolStakingLeaderExplanation({ presentation }: Props) {
  // Non-available states: headline + supporting only (no leader, no explanation).
  if (presentation.status !== "available" || !presentation.topProtocol) {
    return (
      <section className="review-modal__section review-modal__comparison" aria-label="Current comparison">
        <h3 className="review-modal__section-title">Current comparison</h3>
        <p className="review-modal__comparison-headline">{presentation.headline}</p>
        <p className="review-modal__comparison-support">{presentation.supportingText}</p>
      </section>
    );
  }

  const top = presentation.topProtocol;
  const runnerUp = presentation.runnerUp;
  const exp = presentation.leaderExplanation;

  return (
    <section className="review-modal__section review-modal__comparison" aria-label="Current comparison">
      <h3 className="review-modal__section-title">Current comparison</h3>

      {/* A. Leader header */}
      <p className="review-modal__comparison-headline">{presentation.headline}</p>
      <p className="review-modal__comparison-support">{presentation.supportingText}</p>
      <div className="review-modal__comparison-top">
        <span className="review-modal__comparison-badge">Top protocol to review right now</span>
        <p className="review-modal__comparison-name">{top.protocolName} · {top.assetSymbol}</p>
        <dl className="review-modal__market">
          <div className="review-modal__market-row"><dt>Comparison score</dt><dd>{top.comparisonScore.toFixed(2)} / 10</dd></div>
          <div className="review-modal__market-row"><dt>Reviewed risk score</dt><dd>{top.reviewedRiskScore.toFixed(2)} / 10</dd></div>
          <div className="review-modal__market-row"><dt>Current APY</dt><dd>{top.currentApyPct}%</dd></div>
          <div className="review-modal__market-row"><dt>30-day APY</dt><dd>{top.apy30dPct}%</dd></div>
          <div className="review-modal__market-row"><dt>APY consistency</dt><dd>{top.absoluteApyDeltaPctPoints} pct-pt diff</dd></div>
        </dl>
        <p className="review-modal__comparison-freshness">{presentation.freshnessText}</p>
        <p className="review-modal__comparison-disclosure">{presentation.disclosureText}</p>
      </div>

      {/* B. Why this protocol currently leads */}
      {exp && (
        <div className="review-modal__comparison-why">
          <h4 className="review-modal__comparison-subtitle">Why this protocol currently leads</h4>
          <p className="review-modal__comparison-compact">{exp.compactSummary}</p>
          {exp.strongestAdvantages.length > 0 && (
            <ul className="review-modal__comparison-list">
              {exp.strongestAdvantages.map((d) => (
                <li key={`adv-${d.dimension}`}><strong>{d.label} (favors {top.protocolName})</strong> — {d.explanation}</li>
              ))}
            </ul>
          )}
          {exp.tradeOffs.length > 0 && (
            <>
              <p className="review-modal__comparison-tradeoff-label">Trade-offs where {top.protocolName} currently contributes less:</p>
              <ul className="review-modal__comparison-list">
                {exp.tradeOffs.map((d) => (
                  <li key={`to-${d.dimension}`}><strong>{d.label}{runnerUp ? ` (favors ${runnerUp.protocolName})` : ""}</strong> — {d.explanation}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* C. Compared with the runner-up */}
      {exp && runnerUp && (
        <div className="review-modal__comparison-runnerup-block">
          <h4 className="review-modal__comparison-subtitle">Compared with the runner-up</h4>
          <dl className="review-modal__market">
            <div className="review-modal__market-row"><dt>{top.protocolName} · {top.assetSymbol} comparison score</dt><dd>{exp.leaderScore.toFixed(2)}</dd></div>
            <div className="review-modal__market-row"><dt>{runnerUp.protocolName} · {runnerUp.assetSymbol} comparison score</dt><dd>{(exp.runnerUpScore ?? 0).toFixed(2)}</dd></div>
            <div className="review-modal__market-row"><dt>Difference</dt><dd>{(exp.scoreDifference ?? 0).toFixed(2)}</dd></div>
          </dl>
        </div>
      )}

      {/* D. Other considerations — non-scored context */}
      <div className="review-modal__comparison-other">
        <h4 className="review-modal__comparison-subtitle">Other considerations</h4>
        <p className="review-modal__comparison-other-note">Informational — not included in the current comparison score.</p>
        <dl className="review-modal__market">
          <div className="review-modal__market-row"><dt>{top.adoptionDisplay.label}</dt><dd>{top.adoptionDisplay.unit === "usd" ? usdCompact(top.adoptionDisplay.value) : solCompact(top.adoptionDisplay.value)}</dd></div>
          {top.feeContext.filter((f) => typeof f.value === "number").map((f) => (
            <div key={f.label} className="review-modal__market-row"><dt>{f.label}</dt><dd>{f.value}%</dd></div>
          ))}
          <div className="review-modal__market-row"><dt>Exit</dt><dd>{top.exitContext.label}</dd></div>
          <div className="review-modal__market-row"><dt>Token model</dt><dd>{top.tokenModelLabel}</dd></div>
        </dl>
      </div>

      {/* E. Current ranking (exact Step 14W order; INF excluded) */}
      <div className="review-modal__comparison-ranking-block">
        <h4 className="review-modal__comparison-subtitle">Current ranking</h4>
        <ol className="review-modal__comparison-ranking">
          {presentation.rankedCandidates.map((c) => (
            <li key={c.candidateId} className="review-modal__comparison-rank-item">
              {c.rank}. {c.protocolName} · {c.assetSymbol} — score {c.comparisonScore.toFixed(2)}
              <span className="review-modal__comparison-context"> · current APY {c.currentApyPct}% · 30-day {c.apy30dPct}% · reviewed risk {c.reviewedRiskScore.toFixed(2)} · {c.tokenModelLabel}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// Internal-only fake-token UI fixture. Not mounted in live user flows.
//
// Renders a fake-token SOL staking recommendation in a WealthSmith-style card so
// the future exact-recommendation UI can be reviewed with idle-SOL data. It reads
// only the hardcoded fixture — no wallet code, no engine, no selector, no fetch,
// no external navigation, no transactions. All buttons are disabled.
import { getInternalSolStakingRecommendationFixture } from "../../suggestions/internalSolStakingRecommendationFixture";
import "./solStakingRecommendationFixture.css";

export default function SolStakingRecommendationFixture() {
  const { wallet, recommendation: r } = getInternalSolStakingRecommendationFixture();

  return (
    <section className="internal-sol-staking-fixture" aria-label="Internal fake-token SOL staking recommendation fixture (not live)">
      <p className="internal-sol-staking-fixture__badge">{r.internalLabel}</p>

      <div className="internal-sol-staking-fixture__wallet">
        <p className="internal-sol-staking-fixture__wallet-title">Fake wallet (internal preview)</p>
        <dl className="internal-sol-staking-fixture__wallet-grid">
          <div>
            <dt>Total SOL</dt>
            <dd>{wallet.totalSol} SOL</dd>
          </div>
          <div>
            <dt>Fee reserve</dt>
            <dd>{wallet.reserveSol} SOL</dd>
          </div>
          <div>
            <dt>Eligible to review</dt>
            <dd>{wallet.eligibleSol} SOL</dd>
          </div>
        </dl>
      </div>

      <div className="internal-sol-staking-fixture__card">
        <p className="internal-sol-staking-fixture__eyebrow">Internal preview · Not live</p>
        <h3 className="internal-sol-staking-fixture__title">{r.title}</h3>

        <div className="internal-sol-staking-fixture__suggested">
          <span className="internal-sol-staking-fixture__suggested-label">{r.suggestedProtocolLabel}</span>
          <span className="internal-sol-staking-fixture__suggested-value">
            {r.protocolName} · {r.lstSymbol}
          </span>
        </div>

        <p className="internal-sol-staking-fixture__amount">
          Eligible: {r.eligibleAmountSol} SOL <span className="internal-sol-staking-fixture__amount-usd">(~${r.eligibleAmountUsd} at a fake price)</span>
        </p>

        <div className="internal-sol-staking-fixture__section">
          <p className="internal-sol-staking-fixture__section-title">Why (preview)</p>
          <ul className="internal-sol-staking-fixture__list">
            {r.whySelected.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>

        <div className="internal-sol-staking-fixture__section">
          <p className="internal-sol-staking-fixture__section-title">Blocked gates</p>
          <ul className="internal-sol-staking-fixture__list internal-sol-staking-fixture__list--blockers">
            {r.evidenceNotes.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>

        <div className="internal-sol-staking-fixture__section internal-sol-staking-fixture__safety">
          {r.safetyNotes.map((line, i) => (
            <p key={i} className="internal-sol-staking-fixture__safety-note">{line}</p>
          ))}
        </div>

        <div className="internal-sol-staking-fixture__actions">
          {r.disabledActions.map((label, i) => (
            <button key={i} type="button" className="internal-sol-staking-fixture__btn" disabled aria-disabled="true">
              {label} <span className="internal-sol-staking-fixture__btn-tag">(preview-only)</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

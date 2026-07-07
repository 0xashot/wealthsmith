/**
 * PositionsSection — a product card (title + caption) wrapping a filtered
 * PositionsTable for one Portfolio category (Liquid / Staked / Yield Strategies).
 * When the category has no detected positions, it shows a polished "none detected"
 * state INSIDE the same card — so an empty section still looks intentional and
 * product-ready, never a broken/blank area.
 *
 * READ-ONLY: only live positions are shown; no USD value, APY, or Manage handoff
 * is invented (a protocol Manage handoff would require a real detected position
 * and approved review-only behavior, which this prototype does not wire up).
 */
import { useId } from "react";
import type { WalletPosition } from "../wallet/walletPosition";
import PositionsTable, { type PositionColumn } from "./PositionsTable";

interface Props {
  title: string;
  caption?: string;
  positions: WalletPosition[];
  columns: PositionColumn[];
  emptyText: string;
}

export default function PositionsSection({
  title,
  caption,
  positions,
  columns,
  emptyText,
}: Props) {
  const headingId = useId();
  return (
    <section className="card" aria-labelledby={headingId}>
      <h2 id={headingId} className="card__title">
        {title}
      </h2>
      {caption && <p className="card__caption">{caption}</p>}
      {positions.length === 0 ? (
        <p className="portfolio-table__empty-description" role="status">
          {emptyText}
        </p>
      ) : (
        <div className="portfolio-table__scroll">
          <PositionsTable positions={positions} columns={columns} ariaLabelledBy={headingId} />
        </div>
      )}
    </section>
  );
}

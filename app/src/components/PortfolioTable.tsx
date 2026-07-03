/**
 * PortfolioTable — reusable semantic table for Portfolio sections
 * (Liquid / Staked / Yield) per components/table.md and
 * patterns/portfolio-overview.md.
 *
 * Renders a section card (title + description) with a `<table>`: `<th scope>`
 * headers, right-aligned numeric columns, an optional summary `<tfoot>`, and an
 * approved empty state when there are no rows. It only renders the cell content
 * it is given — no data, values, or copy are computed or invented here.
 */
import { useId, type ReactNode } from "react";

export interface PortfolioColumn {
  id: string;
  label: string;
  align?: "right";
}

export interface PortfolioRow {
  id: string;
  /** Cells in the same order as `columns`. */
  cells: ReactNode[];
}

interface Props {
  title: string;
  description?: string;
  columns: PortfolioColumn[];
  rows: PortfolioRow[];
  /** Optional summary row cells (same order as `columns`). */
  summaryCells?: ReactNode[];
  /**
   * Optional approved explanatory note rendered under the table and wired to it
   * via `aria-describedby` (announced once on table entry — no per-cell noise).
   * Used to surface the fixtures' estimate/risk disclaimers.
   */
  note?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function PortfolioTable({
  title,
  description,
  columns,
  rows,
  summaryCells,
  note,
  emptyTitle,
  emptyDescription,
}: Props) {
  const cellClass = (col: PortfolioColumn) =>
    "portfolio-table__cell" + (col.align === "right" ? " portfolio-table__cell--right" : "");

  // Single source of the accessible name: the visible heading. The section
  // region and the table are both labelled by it (no duplicate literal label).
  const headingId = useId();
  const noteId = useId();

  return (
    <section className="card" aria-labelledby={headingId}>
      <h2 id={headingId} className="card__title">
        {title}
      </h2>
      {description && <p className="card__caption">{description}</p>}

      {rows.length === 0 ? (
        <div className="portfolio-table__empty">
          {emptyTitle && <p className="portfolio-table__empty-title">{emptyTitle}</p>}
          {emptyDescription && (
            <p className="portfolio-table__empty-description">{emptyDescription}</p>
          )}
        </div>
      ) : (
        <div className="portfolio-table__scroll">
          <table
            className="portfolio-table"
            aria-labelledby={headingId}
            aria-describedby={note ? noteId : undefined}
          >
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.id}
                    scope="col"
                    className={cellClass(col) + " portfolio-table__header"}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {row.cells.map((cell, i) => (
                    <td key={columns[i].id} className={cellClass(columns[i])}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {summaryCells && (
              <tfoot>
                <tr>
                  {summaryCells.map((cell, i) => (
                    <td
                      key={columns[i].id}
                      className={cellClass(columns[i]) + " portfolio-table__summary"}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
          {note && (
            <p id={noteId} className="portfolio-table__note">
              {note}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

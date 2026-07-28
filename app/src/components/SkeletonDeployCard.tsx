/**
 * SkeletonDeployCard — content-shaped loading skeleton for one Asset Deployment
 * category card (Liquid Assets / Staked Assets / Yield Strategies). Mirrors the
 * real card: title + total + caption + a table with the actual column headers and
 * placeholder rows. Shown while the portfolio is still loading/pricing so every
 * category reads as its real shape rather than a bare "—". Decorative (aria-hidden).
 */
export default function SkeletonDeployCard({
  title,
  caption,
  headers,
  rows = 4,
}: {
  title: string;
  caption: string;
  /** Real column headers (empty string for a header-less column, e.g. Manage). */
  headers: string[];
  rows?: number;
}) {
  return (
    <section className="card" aria-hidden="true">
      <h3 className="card__title deploy-card__title">{title}</h3>
      <p className="deploy-card__total">
        <span className="skeleton skeleton--value" />
      </p>
      <p className="card__caption">{caption}</p>
      <div className="portfolio-table__scroll">
        <table className="portfolio-table">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className={
                    "portfolio-table__cell portfolio-table__header" +
                    (i > 0 ? " portfolio-table__cell--right" : "")
                  }
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {headers.map((_, c) => (
                  <td
                    key={c}
                    className={
                      "portfolio-table__cell" + (c > 0 ? " portfolio-table__cell--right" : "")
                    }
                  >
                    {c === 0 ? (
                      <span className="asset-identity">
                        <span className="skeleton skeleton--dot" />
                        <span className="skeleton skeleton--line-short" />
                      </span>
                    ) : (
                      <span className="skeleton skeleton--line-short" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

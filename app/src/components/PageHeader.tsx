/**
 * PageHeader — per components/page-header.md.
 * Title renders as the page h1; copy comes from page state.
 */
import type { PageHeaderState } from "../types/dashboard";

export default function PageHeader({ header }: { header: PageHeaderState }) {
  return (
    <div className="page-header">
      <h1 className="page-header__title">{header.title}</h1>
      {header.description && (
        <p className="page-header__description">{header.description}</p>
      )}
    </div>
  );
}

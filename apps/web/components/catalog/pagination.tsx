import Link from "next/link";

import {
  buildCatalogHref,
  type CatalogResult,
} from "@pigment/palette-catalog";

export function Pagination({ catalog }: { catalog: CatalogResult }) {
  if (catalog.totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Palette result pages">
      {catalog.page > 1 ? (
        <Link
          href={`/palettes${buildCatalogHref(catalog.filters, { page: catalog.page - 1 }).slice(1)}`}
        >
          ← Previous
        </Link>
      ) : (
        <span aria-disabled="true">← Previous</span>
      )}
      <strong>
        Page {catalog.page} / {catalog.totalPages}
      </strong>
      {catalog.page < catalog.totalPages ? (
        <Link
          href={`/palettes${buildCatalogHref(catalog.filters, { page: catalog.page + 1 }).slice(1)}`}
        >
          Next →
        </Link>
      ) : (
        <span aria-disabled="true">Next →</span>
      )}
    </nav>
  );
}

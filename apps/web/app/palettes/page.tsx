import Form from "next/form";
import Link from "next/link";
import { connection } from "next/server";
import type { RawSearchParams } from "@pigment/palette-catalog";
import { getCatalogPage } from "@pigment/palette-catalog/server/runtime";
import { BrandMark } from "@pigment/ui/brand-mark";

import { ColorFilter } from "@/components/catalog/color-filter";
import { Pagination } from "@/components/catalog/pagination";
import { PaletteCard } from "@/components/catalog/palette-card";

function formatScanTime(value: string | null) {
  if (!value) return "Not scanned yet";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function PalettesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  await connection();
  const { catalog, stats } = await getCatalogPage(await searchParams);
  const firstResult =
    catalog.total === 0 ? 0 : (catalog.page - 1) * catalog.pageSize + 1;
  const lastResult = Math.min(
    catalog.page * catalog.pageSize,
    catalog.total,
  );
  let emptyTitle = "No palettes fit those filters.";
  let emptyDescription =
    "Increase the color tolerance, change the color range, or clear the search.";

  if (stats.paletteCount === 0) {
    emptyTitle = "The catalog is empty.";
    emptyDescription =
      "Run a directory scan to index the PNG strips in palettes/.";
  } else if (catalog.filters.favoritesOnly && stats.favoriteCount === 0) {
    emptyTitle = "No favorites yet.";
    emptyDescription =
      "Clear this filter, then use the star on any palette you want to keep close.";
  } else if (catalog.filters.favoritesOnly) {
    emptyTitle = "No favorites fit those filters.";
    emptyDescription =
      "Change the other filters or clear them to see every favorite.";
  }

  return (
    <main className="site-shell">
      <header className="site-header">
        <div className="brand-lockup">
          <BrandMark />
          <div>
            <p className="eyebrow">Pigment color archive</p>
            <p className="brand-name">Palettes</p>
          </div>
        </div>

        <dl className="header-stats">
          <div>
            <dt>Palettes</dt>
            <dd>{stats.paletteCount}</dd>
          </div>
          <div>
            <dt>Swatches</dt>
            <dd>{stats.colorCount}</dd>
          </div>
          <div>
            <dt>Favorites</dt>
            <dd>{stats.favoriteCount}</dd>
          </div>
          <div>
            <dt>Last scan</dt>
            <dd>{formatScanTime(stats.lastScannedAt)}</dd>
          </div>
        </dl>
      </header>

      <section className="catalog-intro" aria-labelledby="catalog-heading">
        <p className="section-index">01 / CATALOG</p>
        <div>
          <h1 id="catalog-heading">Find the color system you already saved.</h1>
          <p>
            Search filenames, count swatches, or match any color using perceptual
            distance.
          </p>
        </div>
      </section>

      <Form action="/palettes" className="filter-panel">
        <div className="filter-fields">
          <label className="field field-search">
            <span>Name or filename</span>
            <input
              className="text-input"
              type="search"
              name="q"
              defaultValue={catalog.filters.query}
              placeholder="Try sunset, ink, witchy..."
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span>Minimum colors</span>
            <input
              className="text-input"
              type="number"
              name="minColors"
              min="1"
              max="64"
              defaultValue={catalog.filters.minColorCount ?? ""}
              placeholder="Min"
            />
          </label>

          <label className="field">
            <span>Maximum colors</span>
            <input
              className="text-input"
              type="number"
              name="maxColors"
              min="1"
              max="64"
              defaultValue={catalog.filters.maxColorCount ?? ""}
              placeholder="Max"
            />
          </label>

          <label className="field">
            <span>Sort property</span>
            <select
              className="text-input"
              name="sort"
              defaultValue={catalog.filters.sort}
            >
              <option value="name">Name</option>
              <option value="colors">Color count</option>
              <option value="modified">File modified</option>
              <option value="lightness">Average lightness</option>
              <option value="chroma">Average chroma</option>
              <option value="distance">Closest color</option>
            </select>
          </label>

          <label className="field">
            <span>Direction</span>
            <select
              className="text-input"
              name="direction"
              defaultValue={catalog.filters.direction}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </label>
        </div>

        <ColorFilter
          key={`${catalog.filters.color}-${catalog.filters.tolerance}`}
          defaultColor={catalog.filters.color}
          defaultTolerance={catalog.filters.tolerance}
        />

        <div className="filter-actions">
          <label className="favorite-filter">
            <input
              type="checkbox"
              name="favorites"
              value="1"
              defaultChecked={catalog.filters.favoritesOnly}
            />
            Favorites only ({stats.favoriteCount})
          </label>
          <div className="filter-buttons">
            <button className="primary-button" type="submit">
              Apply filters
            </button>
            <Link className="secondary-button" href="/palettes">
              Clear all
            </Link>
          </div>
          <p>
            Tolerance uses OKLab distance: 0 is exact, 3 is close, 10 is broad.
          </p>
        </div>
      </Form>

      <div className="results-toolbar">
        <p className="section-index">
          02 / {catalog.filters.favoritesOnly ? "FAVORITES" : "RESULTS"}
        </p>
        <p>
          Showing <strong>{firstResult}</strong>–<strong>{lastResult}</strong> of{" "}
          <strong>{catalog.total}</strong>
        </p>
      </div>

      {catalog.palettes.length > 0 ? (
        <section className="palette-grid" aria-label="Palette results">
          {catalog.palettes.map((palette) => (
            <PaletteCard key={palette.id} palette={palette} />
          ))}
        </section>
      ) : (
        <section className="empty-state">
          <p className="empty-code">NO MATCH</p>
          <h2>{emptyTitle}</h2>
          <p>{emptyDescription}</p>
          {stats.paletteCount > 0 ? (
            <Link className="primary-button" href="/palettes">
              Clear filters
            </Link>
          ) : null}
        </section>
      )}

      <Pagination catalog={catalog} />

      <footer className="site-footer">
        <span>Postgres-backed</span>
        <span>{stats.uniqueColorCount} distinct colors</span>
        <span>Source: palettes/</span>
      </footer>
    </main>
  );
}

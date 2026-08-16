import Form from "next/form";
import Link from "next/link";
import { connection } from "next/server";
import type { RawSearchParams } from "@pigment/palette-catalog";
import { getCatalogPage } from "@pigment/palette-catalog/server/runtime";
import { SiteHeader } from "@/components/site-header";

import { ColorFilter } from "@/components/catalog/color-filter";
import { Pagination } from "@/components/catalog/pagination";
import { PaletteCard } from "@/components/catalog/palette-card";

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
    "Increase the color distance, change the color-count range, or reset the filters.";

  if (stats.paletteCount === 0) {
    emptyTitle = "No palettes are available yet.";
    emptyDescription =
      "Return soon to explore the collection as it grows.";
  }

  return (
    <>
      <SiteHeader active="palettes" context="Color archive" />
      <main className="site-shell">
        <section className="catalog-intro" aria-labelledby="catalog-heading">
          <div>
            <p className="catalog-kicker">Shared material</p>
            <h1 id="catalog-heading">Color for the procedure.</h1>
            <p>
              Browse reusable color systems, inspect their structure, and bring one
              into your next Studio experiment.
            </p>
          </div>
          <aside className="lospec-credit" aria-label="Lospec attribution">
            <div className="lospec-credit-mark" aria-hidden="true">L</div>
            <div>
              <p>Collection source</p>
              <h2>Curated with palettes from Lospec.</h2>
              <p>
                Pigment keeps the source visible. Explore the larger collection where
                many of these palettes were first shared.
              </p>
              <a href="https://lospec.com/palette-list" target="_blank" rel="noreferrer">
                Visit Lospec <span aria-hidden="true">↗</span>
              </a>
            </div>
          </aside>
        </section>

        <Form action="/palettes" className="filter-panel">
          <ColorFilter
            key={`${catalog.filters.color}-${catalog.filters.tolerance}`}
            defaultColor={catalog.filters.color}
            defaultTolerance={catalog.filters.tolerance}
          />

          <div className="filter-refine">
            <div className="filter-refine-heading">
              <span>02 / Refine</span>

            </div>
            <div className="filter-refine-grid">
              <fieldset className="color-count-fieldset">
                <legend>Number of colors</legend>
                <label>
                  <span className="sr-only">Minimum colors</span>
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
                <span aria-hidden="true">—</span>
                <label>
                  <span className="sr-only">Maximum colors</span>
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
              </fieldset>
              <label className="field">
                <span>Arrange by</span>
                <select className="text-input" name="sort" defaultValue={catalog.filters.sort}>
                  <option value="name">Name</option>
                  <option value="colors">Color count</option>
                  <option value="modified">Recently added</option>
                  <option value="lightness">Average lightness</option>
                  <option value="chroma">Average chroma</option>
                  <option value="distance">Closest color</option>
                </select>
              </label>
              <label className="field">
                <span>Direction</span>
                <select className="text-input" name="direction" defaultValue={catalog.filters.direction}>
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </label>
            </div>
          </div>

          <div className="filter-actions">
            <button className="primary-button" type="submit">Apply filters</button>
            <Link className="secondary-button" href="/palettes">Reset all</Link>
          </div>
        </Form>

      <div className="results-toolbar">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-primary">
          Palette results
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
          <span>Curated for Pigment</span>
          <a href="https://lospec.com/palette-list" target="_blank" rel="noreferrer">
            Discover more palettes on Lospec ↗
          </a>
        </footer>
      </main>
    </>
  );
}

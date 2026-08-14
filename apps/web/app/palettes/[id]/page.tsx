import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { parsePaletteId } from "@pigment/palette-catalog";
import { getPalette } from "@pigment/palette-catalog/server/runtime";

import { CopyColorButton } from "@/components/catalog/copy-color-button";
import { SiteHeader } from "@/components/site-header";
import { FavoriteButton } from "@/components/catalog/favorite-button";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatDate(value: string | number) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const getCachedPalette = cache(async (id: number) => {
  await connection();
  return getPalette(id);
});

async function loadPalette(params: Promise<{ id: string }>) {
  const { id } = await params;
  const paletteId = parsePaletteId(id);
  if (paletteId === null) return null;
  return getCachedPalette(paletteId);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const palette = await loadPalette(params);
  return palette
    ? {
        title: palette.displayName,
        description: `${palette.displayName}: a ${palette.colorCount}-color palette.`,
      }
    : { title: "Palette not found" };
}

export default async function PaletteDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const palette = await loadPalette(params);
  if (!palette) notFound();

  return (
    <>
      <SiteHeader active="palettes" context="Palette record" />
      <main className="detail-shell">
      <nav className="detail-nav" aria-label="Breadcrumb">
        <Link href="/palettes">← All palettes</Link>
        <span>PT-{String(palette.id).padStart(3, "0")}</span>
      </nav>

      <header className="detail-header">
        <div className="detail-heading">
          <h1>{palette.displayName}</h1>
          <p>{palette.filename}</p>
        </div>
        <div className="detail-actions">
          <FavoriteButton
            paletteId={palette.id}
            paletteName={palette.displayName}
            isFavorite={palette.isFavorite}
            variant="detail"
          />
          <a
            className="primary-button"
            href={`/palette-images/${palette.id}?v=${palette.sha256}`}
            target="_blank"
            rel="noreferrer"
          >
            Open original PNG
          </a>
          <a
            className="secondary-button"
            href={`/palette-images/${palette.id}?v=${palette.sha256}&download=1`}
            download={palette.filename}
          >
            Download
          </a>
        </div>
      </header>

      <section
        className="detail-section swatches-section"
        aria-labelledby="colors-heading"
      >
        <div className="detail-section-heading">
          <p className="section-index">01 / SOURCE ORDER</p>
          <h2 id="colors-heading">{palette.colorCount} swatches</h2>
        </div>

        <div className="color-record-grid">
          {palette.colors.map((color) => (
            <article className="color-record" key={color.id}>
              <div
                className="color-record-swatch"
                style={{ backgroundColor: color.hex }}
                aria-label={color.hex}
              />
              <div className="color-record-title">
                <span>{String(color.position + 1).padStart(2, "0")}</span>
                <strong>{color.hex}</strong>
                <CopyColorButton color={color.hex} />
              </div>
              <dl>
                <div>
                  <dt>RGB</dt>
                  <dd>
                    {color.red}, {color.green}, {color.blue}
                  </dd>
                </div>
                <div>
                  <dt>OKLCH</dt>
                  <dd>
                    {(color.okL * 100).toFixed(1)} /{" "}
                    {(color.chroma * 100).toFixed(1)} /{" "}
                    {color.hue === null ? "—" : `${color.hue.toFixed(1)}°`}
                  </dd>
                </div>
                <div>
                  <dt>Luminance</dt>
                  <dd>{color.relativeLuminance.toFixed(3)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="detail-section metadata-section" aria-labelledby="metadata-heading">
        <div className="detail-section-heading">
          <p className="section-index">02 / FILE</p>
          <h2 id="metadata-heading">Source metadata</h2>
        </div>
        <dl className="metadata-grid">
          <div>
            <dt>Relative path</dt>
            <dd>{palette.relativePath}</dd>
          </div>
          <div>
            <dt>Dimensions</dt>
            <dd>
              {palette.width} × {palette.height}px
            </dd>
          </div>
          <div>
            <dt>File size</dt>
            <dd>{formatBytes(palette.fileSize)}</dd>
          </div>
          <div>
            <dt>Unique colors</dt>
            <dd>{palette.uniqueColorCount}</dd>
          </div>
          <div>
            <dt>Average lightness</dt>
            <dd>{(palette.averageLightness * 100).toFixed(1)}</dd>
          </div>
          <div>
            <dt>Average chroma</dt>
            <dd>{(palette.averageChroma * 100).toFixed(1)}</dd>
          </div>
          <div>
            <dt>File modified</dt>
            <dd>{formatDate(palette.mtimeMs)}</dd>
          </div>
          <div>
            <dt>Last indexed</dt>
            <dd>{formatDate(palette.scannedAt)}</dd>
          </div>
          <div className="metadata-hash">
            <dt>SHA-256</dt>
            <dd>{palette.sha256}</dd>
          </div>
        </dl>
      </section>
      </main>
    </>
  );
}

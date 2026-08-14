import Link from "next/link";

import type { PaletteSummary } from "@pigment/palette-catalog";

import { FavoriteButton } from "./favorite-button";
import { PaletteStrip } from "./palette-strip";

export function PaletteCard({ palette }: { palette: PaletteSummary }) {
  return (
    <article className="palette-card">
      <Link
        className="palette-card-link"
        href={`/palettes/${palette.id}`}
        aria-label={`View ${palette.displayName}, ${palette.colorCount} colors`}
      >
        <header className="palette-card-header">
          <span className="archive-number">PT-{String(palette.id).padStart(3, "0")}</span>
          {palette.distance !== null ? (
            <span className="distance-badge">ΔOK {palette.distance.toFixed(1)}</span>
          ) : null}
        </header>
        <PaletteStrip colors={palette.colors} />
        <div className="palette-card-body">
          <h2>{palette.displayName}</h2>
          <p>{palette.colorCount} color palette</p>
        </div>
        <footer className="palette-card-footer">
          <span>{palette.colorCount} colors</span>
          <span>L {Math.round(palette.averageLightness * 100)}</span>
          <span>C {(palette.averageChroma * 100).toFixed(1)}</span>
        </footer>
      </Link>
      <FavoriteButton
        paletteId={palette.id}
        paletteName={palette.displayName}
        isFavorite={palette.isFavorite}
        variant="card"
      />
    </article>
  );
}

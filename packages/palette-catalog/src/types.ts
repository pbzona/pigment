import type { ColorMetrics } from "./colors";

export interface ExtractedPalette {
  width: number;
  height: number;
  colorCount: number;
  uniqueColorCount: number;
  averageLightness: number;
  minLightness: number;
  maxLightness: number;
  averageChroma: number;
  colors: ColorMetrics[];
}

export interface PaletteColor extends ColorMetrics {
  id: number;
  paletteId: number;
  position: number;
}

export interface PaletteSummary {
  id: number;
  relativePath: string;
  filename: string;
  displayName: string;
  mimeType: string;
  width: number;
  height: number;
  fileSize: number;
  mtimeMs: number;
  sha256: string;
  colorCount: number;
  uniqueColorCount: number;
  averageLightness: number;
  minLightness: number;
  maxLightness: number;
  averageChroma: number;
  createdAt: string;
  updatedAt: string;
  scannedAt: string;
  isFavorite: boolean;
  distance: number | null;
  colors: PaletteColor[];
}

export interface ScanFailure {
  path: string;
  message: string;
}

export interface ScanResult {
  directory: string;
  discovered: number;
  added: number;
  updated: number;
  unchanged: number;
  removed: number;
  total: number;
  durationMs: number;
  failures: ScanFailure[];
}

export interface PaletteImageRecord {
  relativePath: string;
  filename: string;
  mimeType: string;
  sha256: string;
}

const MAX_PALETTE_ID = 2_147_483_647;

export function isPaletteId(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= MAX_PALETTE_ID
  );
}

export function parsePaletteId(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return isPaletteId(parsed) ? parsed : null;
}

export const CATALOG_SORTS = [
  "name",
  "colors",
  "modified",
  "lightness",
  "chroma",
  "distance",
] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number];
export type SortDirection = "asc" | "desc";

export interface CatalogFilters {
  query: string;
  minColorCount: number | null;
  maxColorCount: number | null;
  color: string | null;
  tolerance: number;
  sort: CatalogSort;
  direction: SortDirection;
  favoritesOnly: boolean;
  page: number;
}

export interface CatalogResult {
  palettes: PaletteSummary[];
  filters: CatalogFilters;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CatalogStats {
  paletteCount: number;
  colorCount: number;
  uniqueColorCount: number;
  favoriteCount: number;
  lastScannedAt: string | null;
}

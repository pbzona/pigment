import { parseHexColor, rgbToHex } from "./colors";
import { MAX_PALETTE_COLORS } from "./constants";
import {
  CATALOG_SORTS,
  type CatalogFilters,
  type CatalogSort,
  type SortDirection,
} from "./types";

export type RawSearchParams = Record<
  string,
  string | string[] | undefined
>;

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInteger(value: string | undefined, maximum: number) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : null;
}

function isCatalogSort(value: string | undefined): value is CatalogSort {
  return CATALOG_SORTS.some((sort) => sort === value);
}

function isSortDirection(
  value: string | undefined,
): value is SortDirection {
  return value === "asc" || value === "desc";
}

export function parseCatalogFilters(
  searchParams: RawSearchParams,
): CatalogFilters {
  const rawColor = getFirstValue(searchParams.color);
  const parsedColor = rawColor ? parseHexColor(rawColor) : null;
  const color = parsedColor ? rgbToHex(parsedColor) : null;
  const rawSort = getFirstValue(searchParams.sort);
  const requestedSort = isCatalogSort(rawSort)
    ? rawSort
    : color
      ? "distance"
      : "name";
  const sort = requestedSort === "distance" && !color ? "name" : requestedSort;
  const rawDirection = getFirstValue(searchParams.direction);
  const defaultDirection =
    sort === "modified" || sort === "chroma" ? "desc" : "asc";
  const rawTolerance = Number(getFirstValue(searchParams.tolerance));

  return {
    query: (getFirstValue(searchParams.q) ?? "").trim().slice(0, 100),
    minColorCount: parsePositiveInteger(
      getFirstValue(searchParams.minColors),
      MAX_PALETTE_COLORS,
    ),
    maxColorCount: parsePositiveInteger(
      getFirstValue(searchParams.maxColors),
      MAX_PALETTE_COLORS,
    ),
    color,
    tolerance:
      color && Number.isFinite(rawTolerance)
        ? Math.min(25, Math.max(0, rawTolerance))
        : 3,
    sort,
    direction: isSortDirection(rawDirection)
      ? rawDirection
      : defaultDirection,
    favoritesOnly: getFirstValue(searchParams.favorites) === "1",
    page: parsePositiveInteger(getFirstValue(searchParams.page), 100_000) ?? 1,
  };
}

export function buildCatalogHref(
  filters: CatalogFilters,
  overrides: Partial<CatalogFilters> = {},
) {
  const next = { ...filters, ...overrides };
  const searchParams = new URLSearchParams();

  if (next.query) searchParams.set("q", next.query);
  if (next.minColorCount !== null) {
    searchParams.set("minColors", String(next.minColorCount));
  }
  if (next.maxColorCount !== null) {
    searchParams.set("maxColors", String(next.maxColorCount));
  }
  if (next.color) {
    searchParams.set("color", next.color);
    searchParams.set("tolerance", String(next.tolerance));
  }
  if (next.favoritesOnly) searchParams.set("favorites", "1");
  searchParams.set("sort", next.sort);
  searchParams.set("direction", next.direction);
  if (next.page > 1) searchParams.set("page", String(next.page));

  const query = searchParams.toString();
  return query ? `/?${query}` : "/";
}

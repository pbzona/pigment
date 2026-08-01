import { getColorMetrics, parseHexColor } from "./colors";
import type { PaletteDatabaseConnection } from "./database";
import {
  type CatalogFilters,
  type CatalogResult,
  type CatalogSort,
  type CatalogStats,
  type PaletteColor,
  type PaletteImageRecord,
  type PaletteSummary,
} from "./types";

const PAGE_SIZE = 24;
const LIKE_SPECIAL_CHARACTERS = /[\\%_]/g;

interface PaletteRow {
  id: number;
  relative_path: string;
  filename: string;
  display_name: string;
  mime_type: string;
  width: number;
  height: number;
  file_size: number | string;
  mtime_ms: number;
  sha256: string;
  color_count: number;
  unique_color_count: number;
  average_lightness: number;
  min_lightness: number;
  max_lightness: number;
  average_chroma: number;
  created_at: Date | string;
  updated_at: Date | string;
  scanned_at: Date | string;
  is_favorite: boolean;
  distance_squared: number | null;
}

interface ColorRow {
  id: number;
  palette_id: number;
  position: number;
  hex: string;
  red: number;
  green: number;
  blue: number;
  alpha: number;
  ok_l: number;
  ok_a: number;
  ok_b: number;
  chroma: number;
  hue: number | null;
  relative_luminance: number;
}

function mapColor(row: ColorRow): PaletteColor {
  return {
    id: row.id,
    paletteId: row.palette_id,
    position: row.position,
    hex: row.hex,
    red: row.red,
    green: row.green,
    blue: row.blue,
    alpha: row.alpha,
    okL: row.ok_l,
    okA: row.ok_a,
    okB: row.ok_b,
    chroma: row.chroma,
    hue: row.hue,
    relativeLuminance: row.relative_luminance,
  };
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function mapPalette(
  row: PaletteRow,
  colors: PaletteColor[],
): PaletteSummary {
  return {
    id: row.id,
    relativePath: row.relative_path,
    filename: row.filename,
    displayName: row.display_name,
    mimeType: row.mime_type,
    width: row.width,
    height: row.height,
    fileSize: Number(row.file_size),
    mtimeMs: row.mtime_ms,
    sha256: row.sha256,
    colorCount: row.color_count,
    uniqueColorCount: row.unique_color_count,
    averageLightness: row.average_lightness,
    minLightness: row.min_lightness,
    maxLightness: row.max_lightness,
    averageChroma: row.average_chroma,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    scannedAt: toIsoString(row.scanned_at),
    isFavorite: row.is_favorite,
    distance:
      row.distance_squared === null
        ? null
        : Math.sqrt(row.distance_squared) * 100,
    colors,
  };
}

async function getColorsForPalettes(
  database: PaletteDatabaseConnection,
  paletteIds: number[],
) {
  const colorsByPalette = new Map<number, PaletteColor[]>();
  if (paletteIds.length === 0) return colorsByPalette;

  const result = await database.query<ColorRow>(`
    SELECT *
    FROM palette_colors
    WHERE palette_id = ANY($1::INTEGER[])
    ORDER BY palette_id, position
  `, [paletteIds]);

  for (const row of result.rows) {
    const colors = colorsByPalette.get(row.palette_id) ?? [];
    colors.push(mapColor(row));
    colorsByPalette.set(row.palette_id, colors);
  }

  return colorsByPalette;
}

function escapeLike(value: string) {
  return value.replace(LIKE_SPECIAL_CHARACTERS, "\\$&");
}

export async function queryCatalog(
  database: PaletteDatabaseConnection,
  filters: CatalogFilters,
): Promise<CatalogResult> {
  const where: string[] = ["p.format_version = 2"];
  const parameters: Array<string | number> = [];
  const bind = (value: string | number) => {
    parameters.push(value);
    return `$${parameters.length}`;
  };

  if (filters.query) {
    const search = bind(`%${escapeLike(filters.query)}%`);
    where.push(`(
      p.display_name ILIKE ${search} ESCAPE '\\' OR
      p.filename ILIKE ${search} ESCAPE '\\'
    )`);
  }

  if (filters.minColorCount !== null) {
    where.push(`p.color_count >= ${bind(filters.minColorCount)}`);
  }

  if (filters.maxColorCount !== null) {
    where.push(`p.color_count <= ${bind(filters.maxColorCount)}`);
  }

  if (filters.favoritesOnly) {
    where.push("p.is_favorite");
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  let baseQuery: string;

  if (filters.color) {
    const rgb = parseHexColor(filters.color);
    if (!rgb) throw new Error("Normalized catalog color is invalid.");
    const target = getColorMetrics(rgb);
    const targetL = bind(target.okL);
    const targetA = bind(target.okA);
    const targetB = bind(target.okB);
    const targetAlpha = bind(target.alpha);
    const distanceExpression = `
      (pc.ok_l - ${targetL}) * (pc.ok_l - ${targetL}) +
      (pc.ok_a - ${targetA}) * (pc.ok_a - ${targetA}) +
      (pc.ok_b - ${targetB}) * (pc.ok_b - ${targetB})
    `;
    const maxDistanceSquared = bind((filters.tolerance / 100) ** 2);
    baseQuery = `
      SELECT p.*, MIN(${distanceExpression}) AS distance_squared
      FROM palettes p
      JOIN palette_colors pc
        ON pc.palette_id = p.id AND pc.alpha = ${targetAlpha}
      ${whereClause}
      GROUP BY p.id
      HAVING MIN(${distanceExpression}) <= ${maxDistanceSquared}
    `;
  } else {
    baseQuery = `
      SELECT p.*, NULL AS distance_squared
      FROM palettes p
      ${whereClause}
    `;
  }

  const countResult = await database.query<{ count: number }>(
    `SELECT COUNT(*)::INTEGER AS count FROM (${baseQuery}) matches`,
    parameters,
  );
  const total = countResult.rows[0].count;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const sortExpressions: Record<CatalogSort, string> = {
    name: "LOWER(display_name)",
    colors: "color_count",
    modified: "mtime_ms",
    lightness: "average_lightness",
    chroma: "average_chroma",
    distance: filters.color ? "distance_squared" : "LOWER(display_name)",
  };
  const direction = filters.direction === "desc" ? "DESC" : "ASC";
  const limit = `$${parameters.length + 1}`;
  const offset = `$${parameters.length + 2}`;
  const rowResult = await database.query<PaletteRow>(
    `${baseQuery}
     ORDER BY ${sortExpressions[filters.sort]} ${direction}, LOWER(display_name) ASC, id ASC
     LIMIT ${limit} OFFSET ${offset}`,
    [...parameters, PAGE_SIZE, (page - 1) * PAGE_SIZE],
  );
  const colorsByPalette = await getColorsForPalettes(
    database,
    rowResult.rows.map((row) => row.id),
  );

  return {
    palettes: rowResult.rows.map((row) =>
      mapPalette(row, colorsByPalette.get(row.id) ?? []),
    ),
    filters: { ...filters, page },
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
  };
}

export async function queryCatalogStats(
  database: PaletteDatabaseConnection,
): Promise<CatalogStats> {
  const result = await database.query<{
    palette_count: number;
    color_count: number;
    unique_color_count: number;
    favorite_count: number;
    last_scanned_at: Date | string | null;
  }>(`
    SELECT
      COUNT(*)::INTEGER AS palette_count,
      COALESCE(SUM(color_count), 0)::INTEGER AS color_count,
      (
        SELECT COUNT(DISTINCT pc.hex)::INTEGER
        FROM palette_colors pc
        JOIN palettes visible_palette ON visible_palette.id = pc.palette_id
        WHERE visible_palette.format_version = 2
      ) AS unique_color_count,
      COUNT(*) FILTER (WHERE is_favorite)::INTEGER AS favorite_count,
      (SELECT last_scanned_at FROM scan_state WHERE id = 1) AS last_scanned_at
    FROM palettes
    WHERE format_version = 2
  `);
  const row = result.rows[0];

  return {
    paletteCount: row.palette_count,
    colorCount: row.color_count,
    uniqueColorCount: row.unique_color_count,
    favoriteCount: row.favorite_count,
    lastScannedAt:
      row.last_scanned_at === null ? null : toIsoString(row.last_scanned_at),
  };
}

export async function updatePaletteFavorite(
  database: PaletteDatabaseConnection,
  id: number,
  isFavorite: boolean,
) {
  const result = await database.query(
    "UPDATE palettes SET is_favorite = $1 WHERE id = $2",
    [isFavorite, id],
  );
  return result.rowCount === 1;
}

export async function queryPaletteById(
  database: PaletteDatabaseConnection,
  id: number,
): Promise<PaletteSummary | null> {
  const result = await database.query<PaletteRow>(
    `SELECT *, NULL AS distance_squared
     FROM palettes
     WHERE id = $1 AND format_version = 2`,
    [id],
  );
  const row = result.rows[0];
  if (!row) return null;

  const colors = (await getColorsForPalettes(database, [id])).get(id) ?? [];
  return mapPalette(row, colors);
}

export async function queryPaletteImageById(
  database: PaletteDatabaseConnection,
  id: number,
): Promise<PaletteImageRecord | null> {
  const result = await database.query<{
    relative_path: string;
    filename: string;
    mime_type: string;
    sha256: string;
  }>(
    `SELECT relative_path, filename, mime_type, sha256
     FROM palettes
     WHERE id = $1 AND format_version = 2`,
    [id],
  );
  const row = result.rows[0];

  return row
    ? {
        relativePath: row.relative_path,
        filename: row.filename,
        mimeType: row.mime_type,
        sha256: row.sha256,
      }
    : null;
}

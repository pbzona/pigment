import { getColorMetrics } from "./colors";
import type { PaletteDatabaseConnection } from "./database";
import type { ApiPaletteFilters, ApiPaletteSort } from "./api-palettes";

interface ApiPaletteRow {
  id: number;
  public_id: string;
  display_name: string;
  color_count: number;
  tags: string[];
  author_name: string | null;
  author_url: string | null;
  attribution_text: string | null;
  attribution_url: string | null;
  attribution_license: string | null;
  popularity: number;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ApiColorRow {
  palette_id: number;
  hex: string;
}

export interface ApiPalette {
  id: string;
  name: string;
  colors: string[];
  colorCount: number;
  tags: string[];
  popularity: number;
  author: { name: string; url: string | null } | null;
  attribution: {
    text: string | null;
    url: string | null;
    license: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCatalogResult {
  palettes: ApiPalette[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const LIKE_SPECIAL_CHARACTERS = /[\\%_]/g;

function escapeLike(value: string) {
  return value.replace(LIKE_SPECIAL_CHARACTERS, "\\$&");
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

async function getColorsForPalettes(
  database: PaletteDatabaseConnection,
  paletteIds: number[],
) {
  const colorsByPalette = new Map<number, string[]>();
  if (paletteIds.length === 0) return colorsByPalette;

  const result = await database.query<ApiColorRow>(
    `SELECT palette_id, hex
     FROM palette_colors
     WHERE palette_id = ANY($1::INTEGER[])
     ORDER BY palette_id, position`,
    [paletteIds],
  );
  for (const row of result.rows) {
    const colors = colorsByPalette.get(row.palette_id) ?? [];
    colors.push(row.hex.toLowerCase());
    colorsByPalette.set(row.palette_id, colors);
  }
  return colorsByPalette;
}

function mapPalette(row: ApiPaletteRow, colors: string[]): ApiPalette {
  const hasAttribution =
    row.attribution_text !== null ||
    row.attribution_url !== null ||
    row.attribution_license !== null;
  return {
    id: row.public_id,
    name: row.display_name,
    colors,
    colorCount: colors.length,
    tags: row.tags,
    popularity: row.popularity,
    author:
      row.author_name === null
        ? null
        : { name: row.author_name, url: row.author_url },
    attribution: hasAttribution
      ? {
          text: row.attribution_text,
          url: row.attribution_url,
          license: row.attribution_license,
        }
      : null,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

const SELECT_PALETTE = `
  p.id,
  p.public_id,
  p.display_name,
  p.color_count,
  p.tags,
  p.author_name,
  p.author_url,
  p.attribution_text,
  p.attribution_url,
  p.attribution_license,
  p.popularity,
  p.created_at,
  p.updated_at
`;

export async function queryApiCatalog(
  database: PaletteDatabaseConnection,
  filters: ApiPaletteFilters,
): Promise<ApiCatalogResult> {
  const where: string[] = ["p.format_version = 2"];
  const parameters: Array<string | number> = [];
  const bind = (value: string | number) => {
    parameters.push(value);
    return `$${parameters.length}`;
  };

  let relevanceExpression = "0";
  if (filters.query) {
    const exact = bind(filters.query);
    const escaped = bind(escapeLike(filters.query));
    where.push(`(
      LOWER(p.display_name) = LOWER(${exact}::TEXT) OR
      p.display_name ILIKE ('%' || ${escaped}::TEXT || '%') ESCAPE '\\' OR
      LOWER(${exact}::TEXT) = ANY(p.tags) OR
      EXISTS (
        SELECT 1 FROM UNNEST(p.tags) AS search_tag
        WHERE search_tag ILIKE ('%' || ${escaped}::TEXT || '%') ESCAPE '\\'
      )
    )`);
    relevanceExpression = `CASE
      WHEN LOWER(p.display_name) = LOWER(${exact}::TEXT) THEN 0
      WHEN p.display_name ILIKE (${escaped}::TEXT || '%') ESCAPE '\\' THEN 1
      WHEN p.display_name ILIKE ('%' || ${escaped}::TEXT || '%') ESCAPE '\\' THEN 2
      WHEN LOWER(${exact}::TEXT) = ANY(p.tags) THEN 3
      ELSE 4
    END`;
  }

  for (const tag of filters.tags) {
    where.push(`p.tags @> ARRAY[${bind(tag)}]::TEXT[]`);
  }
  if (filters.minColorCount !== null) {
    where.push(`p.color_count >= ${bind(filters.minColorCount)}`);
  }
  if (filters.maxColorCount !== null) {
    where.push(`p.color_count <= ${bind(filters.maxColorCount)}`);
  }
  if (filters.hue !== null) {
    const hue = bind(filters.hue);
    const tolerance = bind(filters.hueTolerance);
    where.push(`EXISTS (
      SELECT 1
      FROM palette_colors hue_color
      WHERE hue_color.palette_id = p.id
        AND hue_color.hue IS NOT NULL
        AND LEAST(
          ABS(hue_color.hue - ${hue}),
          360 - ABS(hue_color.hue - ${hue})
        ) <= ${tolerance}
    )`);
  }
  if (filters.color) {
    const target = getColorMetrics(filters.color);
    const targetL = bind(target.okL);
    const targetA = bind(target.okA);
    const targetB = bind(target.okB);
    const targetAlpha = bind(target.alpha);
    const maxDistanceSquared = bind((filters.colorTolerance / 100) ** 2);
    where.push(`EXISTS (
      SELECT 1
      FROM palette_colors match_color
      WHERE match_color.palette_id = p.id
        AND match_color.alpha = ${targetAlpha}
        AND (
          (match_color.ok_l - ${targetL}) * (match_color.ok_l - ${targetL}) +
          (match_color.ok_a - ${targetA}) * (match_color.ok_a - ${targetA}) +
          (match_color.ok_b - ${targetB}) * (match_color.ok_b - ${targetB})
        ) <= ${maxDistanceSquared}
    )`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const countResult = await database.query<{ count: number }>(
    `SELECT COUNT(*)::INTEGER AS count FROM palettes p ${whereClause}`,
    parameters,
  );
  const total = countResult.rows[0].count;
  const orderBy: Record<ApiPaletteSort, string> = {
    relevance: `${relevanceExpression} ASC, p.popularity DESC, LOWER(p.display_name) ASC, p.public_id ASC`,
    popularity:
      "p.popularity DESC, p.updated_at DESC, LOWER(p.display_name) ASC, p.public_id ASC",
    recency: "p.updated_at DESC, LOWER(p.display_name) ASC, p.public_id ASC",
    name: "LOWER(p.display_name) ASC, p.public_id ASC",
  };
  const limit = `$${parameters.length + 1}`;
  const offset = `$${parameters.length + 2}`;
  const result = await database.query<ApiPaletteRow>(
    `SELECT ${SELECT_PALETTE}
     FROM palettes p
     ${whereClause}
     ORDER BY ${orderBy[filters.sort]}
     LIMIT ${limit} OFFSET ${offset}`,
    [
      ...parameters,
      filters.pageSize,
      (filters.page - 1) * filters.pageSize,
    ],
  );
  const colorsByPalette = await getColorsForPalettes(
    database,
    result.rows.map((row) => row.id),
  );

  return {
    palettes: result.rows.map((row) =>
      mapPalette(row, colorsByPalette.get(row.id) ?? []),
    ),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.ceil(total / filters.pageSize),
  };
}

export async function queryApiPaletteById(
  database: PaletteDatabaseConnection,
  publicId: string,
) {
  const result = await database.query<ApiPaletteRow>(
    `SELECT ${SELECT_PALETTE}
     FROM palettes p
     WHERE p.public_id = $1 AND p.format_version = 2`,
    [publicId],
  );
  const row = result.rows[0];
  if (!row) return null;
  const colors = (await getColorsForPalettes(database, [row.id])).get(row.id) ?? [];
  return mapPalette(row, colors);
}

export async function queryApiTags(database: PaletteDatabaseConnection) {
  const result = await database.query<{ name: string; palette_count: number }>(`
    SELECT tag AS name, COUNT(*)::INTEGER AS palette_count
    FROM palettes
    CROSS JOIN LATERAL UNNEST(tags) AS tag
    WHERE format_version = 2
    GROUP BY tag
    ORDER BY palette_count DESC, tag ASC
  `);
  return result.rows.map((row) => ({
    name: row.name,
    paletteCount: row.palette_count,
  }));
}

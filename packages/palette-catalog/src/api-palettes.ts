import { MAX_PALETTE_COLORS } from "./config";
import { parseHexColor, type RgbColor } from "./colors";
import type { ApiFieldError } from "./api-http";

const API_SORTS = ["relevance", "popularity", "recency", "name"] as const;
const TAG_PATTERN = /^[a-z0-9]+(?:[ _-][a-z0-9]+)*$/;
const ALLOWED_PARAMETERS = new Set([
  "q",
  "tag",
  "minColors",
  "maxColors",
  "hue",
  "hueTolerance",
  "color",
  "colorTolerance",
  "sort",
  "page",
  "pageSize",
]);

export type ApiPaletteSort = (typeof API_SORTS)[number];

export interface ApiPaletteFilters {
  query: string | null;
  tags: string[];
  minColorCount: number | null;
  maxColorCount: number | null;
  hue: number | null;
  hueTolerance: number;
  color: RgbColor | null;
  colorTolerance: number;
  sort: ApiPaletteSort;
  page: number;
  pageSize: number;
}

type ParseResult =
  | { ok: true; filters: ApiPaletteFilters }
  | { ok: false; errors: ApiFieldError[] };

function isApiSort(value: string): value is ApiPaletteSort {
  return API_SORTS.some((sort) => sort === value);
}

export function isPublicPaletteId(value: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,99}$/.test(value);
}

export function parseApiPaletteFilters(searchParams: URLSearchParams): ParseResult {
  const errors: ApiFieldError[] = [];

  for (const name of new Set(searchParams.keys())) {
    if (!ALLOWED_PARAMETERS.has(name)) {
      errors.push({
        field: name,
        code: "unknown_parameter",
        message: `Unknown query parameter: ${name}.`,
      });
    }
  }

  const single = (name: string) => {
    const values = searchParams.getAll(name);
    if (values.length > 1) {
      errors.push({
        field: name,
        code: "duplicate_parameter",
        message: `${name} may be provided only once.`,
      });
      return null;
    }
    return values[0] ?? null;
  };

  const number = (
    name: string,
    options: {
      minimum: number;
      maximum: number;
      exclusiveMaximum?: boolean;
      integer?: boolean;
      fallback: number | null;
    },
  ) => {
    const value = single(name);
    if (value === null) return options.fallback;
    const normalized = value.trim();
    const pattern = /^(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/;
    const parsed = Number(normalized);
    if (
      !pattern.test(normalized) ||
      !Number.isFinite(parsed) ||
      (options.integer && !Number.isInteger(parsed)) ||
      parsed < options.minimum ||
      parsed > options.maximum ||
      (options.exclusiveMaximum && parsed === options.maximum)
    ) {
      errors.push({
        field: name,
        code: "invalid_parameter",
        message: `${name} must be ${options.integer ? "an integer" : "a number"} from ${options.minimum} to ${options.exclusiveMaximum ? "less than " : ""}${options.maximum}.`,
      });
      return options.fallback;
    }
    return parsed;
  };

  const rawQuery = single("q")?.trim() ?? "";
  if (rawQuery.length > 100) {
    errors.push({
      field: "q",
      code: "invalid_parameter",
      message: "q may contain at most 100 characters.",
    });
  }
  if (/[\u0000-\u001f\u007f]/.test(rawQuery)) {
    errors.push({
      field: "q",
      code: "invalid_parameter",
      message: "q must not contain control characters.",
    });
  }
  const query = rawQuery ? rawQuery.slice(0, 100) : null;

  const rawTags = searchParams.getAll("tag");
  if (rawTags.length > 10) {
    errors.push({
      field: "tag",
      code: "invalid_parameter",
      message: "At most 10 tag filters may be provided.",
    });
  }
  const tags = rawTags.map((tag, index) => {
    const normalized = tag.trim().toLowerCase();
    if (!normalized || normalized.length > 40 || !TAG_PATTERN.test(normalized)) {
      errors.push({
        field: `tag[${index}]`,
        code: "invalid_parameter",
        message: "Tags must contain lowercase words separated by spaces, hyphens, or underscores.",
      });
    }
    return normalized;
  });
  if (new Set(tags).size !== tags.length) {
    errors.push({
      field: "tag",
      code: "duplicate_parameter",
      message: "Tag filters must be unique.",
    });
  }

  const minColorCount = number("minColors", {
    minimum: 1,
    maximum: MAX_PALETTE_COLORS,
    integer: true,
    fallback: null,
  });
  const maxColorCount = number("maxColors", {
    minimum: 1,
    maximum: MAX_PALETTE_COLORS,
    integer: true,
    fallback: null,
  });
  if (
    minColorCount !== null &&
    maxColorCount !== null &&
    minColorCount > maxColorCount
  ) {
    errors.push({
      field: "minColors",
      code: "invalid_range",
      message: "minColors must not exceed maxColors.",
    });
  }

  const hue = number("hue", {
    minimum: 0,
    maximum: 360,
    exclusiveMaximum: true,
    fallback: null,
  });
  const hasHueTolerance = searchParams.has("hueTolerance");
  const hueTolerance = number("hueTolerance", {
    minimum: 0,
    maximum: 180,
    fallback: 15,
  }) ?? 15;
  if (hasHueTolerance && hue === null) {
    errors.push({
      field: "hueTolerance",
      code: "missing_parameter",
      message: "hueTolerance requires hue.",
    });
  }

  const rawColor = single("color");
  const color = rawColor === null ? null : parseHexColor(rawColor);
  if (rawColor !== null && color === null) {
    errors.push({
      field: "color",
      code: "invalid_parameter",
      message: "color must be a 3, 4, 6, or 8 digit hex color.",
    });
  }
  const hasColorTolerance = searchParams.has("colorTolerance");
  const colorTolerance = number("colorTolerance", {
    minimum: 0,
    maximum: 25,
    fallback: 3,
  }) ?? 3;
  if (hasColorTolerance && color === null) {
    errors.push({
      field: "colorTolerance",
      code: "missing_parameter",
      message: "colorTolerance requires color.",
    });
  }

  const rawSort = single("sort");
  let sort: ApiPaletteSort = query ? "relevance" : "popularity";
  if (rawSort !== null) {
    if (isApiSort(rawSort)) sort = rawSort;
    else {
      errors.push({
        field: "sort",
        code: "invalid_parameter",
        message: `sort must be one of: ${API_SORTS.join(", ")}.`,
      });
    }
  }
  if (sort === "relevance" && query === null) {
    errors.push({
      field: "sort",
      code: "missing_parameter",
      message: "Relevance sorting requires q.",
    });
  }

  const page = number("page", {
    minimum: 1,
    maximum: 100_000,
    integer: true,
    fallback: 1,
  }) ?? 1;
  const pageSize = number("pageSize", {
    minimum: 1,
    maximum: 100,
    integer: true,
    fallback: 24,
  }) ?? 24;

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    filters: {
      query,
      tags,
      minColorCount,
      maxColorCount,
      hue,
      hueTolerance,
      color,
      colorTolerance,
      sort,
      page,
      pageSize,
    },
  };
}

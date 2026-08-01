import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const PALETTE_METADATA_FILENAME = "metadata.json";

const PUBLIC_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,99}$/;
const TAG_PATTERN = /^[a-z0-9]+(?:[ _-][a-z0-9]+)*$/;
const MAX_POPULARITY = 2_147_483_647;

interface ManifestEntry {
  publicId: string | null;
  displayName: string | null;
  tags: string[];
  authorName: string | null;
  authorUrl: string | null;
  attributionText: string | null;
  attributionUrl: string | null;
  attributionLicense: string | null;
  popularity: number;
}

export interface PaletteMetadata
  extends Omit<ManifestEntry, "publicId" | "displayName"> {
  publicId: string;
  displayName: string;
}

export type PaletteMetadataEntries = Map<string, ManifestEntry>;

function fail(field: string, message: string): never {
  throw new Error(`${PALETTE_METADATA_FILENAME}: ${field} ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  field: string,
) {
  const allowedKeys = new Set(allowed);
  const unknown = Object.keys(value).find((key) => !allowedKeys.has(key));
  if (unknown) fail(`${field}.${unknown}`, "is not supported.");
}

function optionalString(
  value: unknown,
  field: string,
  maximumLength: number,
) {
  if (value === undefined) return null;
  if (typeof value !== "string") fail(field, "must be a string.");
  const trimmed = value.trim();
  if (!trimmed) fail(field, "must not be empty.");
  if (trimmed.includes("\u0000")) fail(field, "must not contain null bytes.");
  if (trimmed.length > maximumLength) {
    fail(field, `must contain at most ${maximumLength} characters.`);
  }
  return trimmed;
}

function optionalUrl(value: unknown, field: string) {
  const url = optionalString(value, field, 2_048);
  if (url === null) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    fail(field, "must be a valid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    fail(field, "must use http or https.");
  }

  return url;
}

function parseTags(value: unknown, field: string) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail(field, "must be an array.");
  if (value.length > 32) fail(field, "may contain at most 32 tags.");

  const tags = value.map((tag, index) => {
    const normalized = optionalString(
      tag,
      `${field}[${index}]`,
      40,
    )?.toLowerCase();
    if (!normalized || !TAG_PATTERN.test(normalized)) {
      fail(
        `${field}[${index}]`,
        "must contain lowercase words separated by spaces, hyphens, or underscores.",
      );
    }
    return normalized;
  });

  if (new Set(tags).size !== tags.length) {
    fail(field, "must not contain duplicate tags.");
  }
  return tags;
}

function parseAuthor(value: unknown, field: string) {
  if (value === undefined) return { name: null, url: null };
  if (!isRecord(value)) fail(field, "must be an object.");
  assertKeys(value, ["name", "url"], field);
  const name = optionalString(value.name, `${field}.name`, 120);
  if (name === null) fail(`${field}.name`, "is required.");
  return { name, url: optionalUrl(value.url, `${field}.url`) };
}

function parseAttribution(value: unknown, field: string) {
  if (value === undefined) return { text: null, url: null, license: null };
  if (!isRecord(value)) fail(field, "must be an object.");
  assertKeys(value, ["text", "url", "license"], field);
  const result = {
    text: optionalString(value.text, `${field}.text`, 500),
    url: optionalUrl(value.url, `${field}.url`),
    license: optionalString(value.license, `${field}.license`, 100),
  };
  if (result.text === null && result.url === null && result.license === null) {
    fail(field, "must contain text, url, or license.");
  }
  return result;
}

function parseManifestEntry(value: unknown, field: string): ManifestEntry {
  if (!isRecord(value)) fail(field, "must be an object.");
  assertKeys(
    value,
    ["id", "name", "tags", "author", "attribution", "popularity"],
    field,
  );

  const publicId = optionalString(value.id, `${field}.id`, 100);
  if (publicId !== null && !PUBLIC_ID_PATTERN.test(publicId)) {
    fail(`${field}.id`, "must use 3-100 letters, numbers, underscores, or hyphens.");
  }
  const popularity = value.popularity ?? 0;
  if (
    typeof popularity !== "number" ||
    !Number.isInteger(popularity) ||
    popularity < 0 ||
    popularity > MAX_POPULARITY
  ) {
    fail(`${field}.popularity`, `must be an integer from 0 to ${MAX_POPULARITY}.`);
  }
  const author = parseAuthor(value.author, `${field}.author`);
  const attribution = parseAttribution(
    value.attribution,
    `${field}.attribution`,
  );

  return {
    publicId,
    displayName: optionalString(value.name, `${field}.name`, 120),
    tags: parseTags(value.tags, `${field}.tags`),
    authorName: author.name,
    authorUrl: author.url,
    attributionText: attribution.text,
    attributionUrl: attribution.url,
    attributionLicense: attribution.license,
    popularity,
  };
}

function validateRelativePath(relativePath: string) {
  if (
    !relativePath ||
    relativePath.includes("\\") ||
    path.posix.isAbsolute(relativePath) ||
    path.posix.normalize(relativePath) !== relativePath ||
    path.posix.extname(relativePath) !== ".png"
  ) {
    fail(
      `palettes.${relativePath || "<empty>"}`,
      "must be a normalized relative PNG path.",
    );
  }
}

export function createPublicPaletteId(relativePath: string) {
  const digest = createHash("sha256").update(relativePath).digest("hex");
  return `palette_${digest.slice(0, 24)}`;
}

export async function loadPaletteMetadata(
  directory: string,
): Promise<PaletteMetadataEntries> {
  let source: string;
  try {
    source = await readFile(
      path.join(directory, PALETTE_METADATA_FILENAME),
      "utf8",
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return new Map();
    }
    throw error;
  }

  let document: unknown;
  try {
    document = JSON.parse(source);
  } catch {
    fail("document", "must contain valid JSON.");
  }
  if (!isRecord(document)) fail("document", "must be an object.");
  assertKeys(document, ["version", "palettes"], "document");
  if (document.version !== 1) fail("version", "must be 1.");
  if (!isRecord(document.palettes)) fail("palettes", "must be an object.");

  const entries = new Map<string, ManifestEntry>();
  const explicitIds = new Set<string>();
  for (const [relativePath, value] of Object.entries(document.palettes)) {
    validateRelativePath(relativePath);
    const entry = parseManifestEntry(value, `palettes.${relativePath}`);
    if (entry.publicId && explicitIds.has(entry.publicId)) {
      fail(`palettes.${relativePath}.id`, `duplicates ${entry.publicId}.`);
    }
    if (entry.publicId) explicitIds.add(entry.publicId);
    entries.set(relativePath, entry);
  }
  return entries;
}

export function resolvePaletteMetadata(
  relativePath: string,
  defaultDisplayName: string,
  entries: PaletteMetadataEntries,
): PaletteMetadata {
  const entry = entries.get(relativePath);
  return {
    publicId: entry?.publicId ?? createPublicPaletteId(relativePath),
    displayName: entry?.displayName ?? defaultDisplayName,
    tags: entry?.tags ?? [],
    authorName: entry?.authorName ?? null,
    authorUrl: entry?.authorUrl ?? null,
    attributionText: entry?.attributionText ?? null,
    attributionUrl: entry?.attributionUrl ?? null,
    attributionLicense: entry?.attributionLicense ?? null,
    popularity: entry?.popularity ?? 0,
  };
}

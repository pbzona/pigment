import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { PoolClient } from "pg";

import { getPaletteDirectory } from "./config";
import { getDatabase, type PaletteDatabase } from "./database";
import { extractPaletteImage } from "./extract";
import {
  ensurePaletteBuildState,
  type PaletteBuildState,
} from "./build-scan";
import {
  loadPaletteMetadata,
  resolvePaletteMetadata,
  type PaletteMetadata,
} from "./metadata";
import type { ExtractedPalette, ScanFailure, ScanResult } from "./types";

interface ExistingPaletteRow {
  id: number;
  relative_path: string;
  sha256: string;
  public_id: string;
  display_name: string;
  tags: string[];
  author_name: string | null;
  author_url: string | null;
  attribution_text: string | null;
  attribution_url: string | null;
  attribution_license: string | null;
  popularity: number;
  format_version: number;
}

interface BaseCandidate {
  relativePath: string;
  filename: string;
  displayName: string;
  fileSize: number;
  mtimeMs: number;
  sha256: string;
  metadata: PaletteMetadata;
}

interface ParsedCandidate extends BaseCandidate {
  kind: "parsed";
  palette: ExtractedPalette;
}

interface UnchangedCandidate extends BaseCandidate {
  kind: "unchanged";
}

type ScanCandidate = ParsedCandidate | UnchangedCandidate;

const SCAN_LOCK_WAIT_MS = 30_000;
const PALETTE_FORMAT_VERSION = 2;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown scan error";
}

function toRelativePath(root: string, absolutePath: string) {
  return path.relative(root, absolutePath).split(path.sep).join("/");
}

function metadataChanged(row: ExistingPaletteRow, metadata: PaletteMetadata) {
  return (
    row.public_id !== metadata.publicId ||
    row.display_name !== metadata.displayName ||
    row.tags.length !== metadata.tags.length ||
    row.tags.some((tag, index) => tag !== metadata.tags[index]) ||
    row.author_name !== metadata.authorName ||
    row.author_url !== metadata.authorUrl ||
    row.attribution_text !== metadata.attributionText ||
    row.attribution_url !== metadata.attributionUrl ||
    row.attribution_license !== metadata.attributionLicense ||
    row.popularity !== metadata.popularity
  );
}

export function filenameToDisplayName(filename: string) {
  const stem = filename
    .replace(/\.png$/i, "")
    .replace(/-8x$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();

  return stem.replace(/(^|\s)([a-z])/g, (_, prefix: string, character: string) =>
    `${prefix}${character.toUpperCase()}`,
  );
}

async function listPngFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((first, second) => first.name.localeCompare(second.name));

  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listPngFiles(entryPath)));
    } else if (entry.isFile() && path.extname(entry.name) === ".png") {
      files.push(entryPath);
    }
  }

  return files;
}

async function acquireScanLock(database: PoolClient) {
  await database.query("SELECT set_config('lock_timeout', $1, TRUE)", [
    `${SCAN_LOCK_WAIT_MS}ms`,
  ]);

  try {
    await database.query(`
      SELECT pg_advisory_xact_lock(
        hashtext(current_database()),
        hashtext(COALESCE(current_schema(), '') || ':palette-town-scan')
      )
    `);
    await database.query("SELECT set_config('lock_timeout', '0', TRUE)");
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "55P03"
    ) {
      throw new Error("Timed out waiting for another palette scan to finish.");
    }
    throw error;
  }
}

async function performScan(
  database: PoolClient,
  directory: string,
): Promise<ScanResult> {
  const startedAt = performance.now();
  const [files, metadataEntries] = await Promise.all([
    listPngFiles(directory),
    loadPaletteMetadata(directory),
  ]);
  const discoveredPaths = new Set(
    files.map((filePath) => toRelativePath(directory, filePath)),
  );
  const existingResult = await database.query<ExistingPaletteRow>(
    `SELECT id, relative_path, sha256, public_id, display_name, tags,
            author_name, author_url, attribution_text, attribution_url,
            attribution_license, popularity, format_version
     FROM palettes`,
  );
  const existingRows = existingResult.rows;
  const existingByPath = new Map(
    existingRows.map((row) => [row.relative_path, row]),
  );
  const existingByPublicId = new Map(
    existingRows.map((row) => [row.public_id, row]),
  );
  const candidates: ScanCandidate[] = [];
  const failures: ScanFailure[] = [];
  const publicIdPaths = new Map<string, string>();
  const metadataByPath = new Map<string, PaletteMetadata>();

  for (const relativePath of metadataEntries.keys()) {
    if (!discoveredPaths.has(relativePath)) {
      failures.push({
        path: relativePath,
        message: "Metadata references a palette file that does not exist.",
      });
    }
  }

  for (const filePath of files) {
    const relativePath = toRelativePath(directory, filePath);
    const filename = path.basename(filePath);
    const metadata = resolvePaletteMetadata(
      relativePath,
      filenameToDisplayName(filename),
      metadataEntries,
    );
    const existingPublicIdPath = publicIdPaths.get(metadata.publicId);
    if (existingPublicIdPath && existingPublicIdPath !== relativePath) {
      throw new Error(
        `Public palette ID ${metadata.publicId} is used by both ${existingPublicIdPath} and ${relativePath}.`,
      );
    }
    publicIdPaths.set(metadata.publicId, relativePath);
    metadataByPath.set(relativePath, metadata);
  }
  const desiredPublicIds = new Set(
    Array.from(metadataByPath.values(), (metadata) => metadata.publicId),
  );

  for (const filePath of files) {
    const relativePath = toRelativePath(directory, filePath);
    const filename = path.basename(filePath);
    const metadata = metadataByPath.get(relativePath);
    if (!metadata) throw new Error(`Missing metadata for ${relativePath}.`);

    try {
      const [image, fileStat] = await Promise.all([
        readFile(filePath),
        stat(filePath),
      ]);
      const sha256 = createHash("sha256").update(image).digest("hex");
      const baseCandidate = {
        relativePath,
        filename,
        displayName: metadata.displayName,
        fileSize: fileStat.size,
        mtimeMs: fileStat.mtimeMs,
        sha256,
        metadata,
      };

      const existingAtPath = existingByPath.get(relativePath);
      const matchingExisting =
        existingByPublicId.get(metadata.publicId) ??
        (existingAtPath && !desiredPublicIds.has(existingAtPath.public_id)
          ? existingAtPath
          : undefined);
      if (
        matchingExisting?.sha256 === sha256 &&
        matchingExisting.format_version === PALETTE_FORMAT_VERSION
      ) {
        candidates.push({ ...baseCandidate, kind: "unchanged" });
      } else {
        candidates.push({
          ...baseCandidate,
          kind: "parsed",
          palette: await extractPaletteImage(image),
        });
      }
    } catch (error) {
      failures.push({ path: relativePath, message: getErrorMessage(error) });
    }
  }

  const scannedAt = new Date().toISOString();
  let added = 0;
  let updated = 0;
  let unchanged = 0;
  let removed = 0;

  // The caller keeps these writes under the transaction-scoped scan lock.
  {
    const assignments: Array<{
      row: ExistingPaletteRow;
      relativePath: string;
    }> = [];
    const assignedRowIds = new Set<number>();
    for (const [relativePath, metadata] of metadataByPath) {
      const existingAtPath = existingByPath.get(relativePath);
      const row =
        existingByPublicId.get(metadata.publicId) ??
        (existingAtPath && !desiredPublicIds.has(existingAtPath.public_id)
          ? existingAtPath
          : null);
      if (!row) continue;
      if (assignedRowIds.has(row.id)) {
        throw new Error(`Palette row ${row.id} was assigned more than once.`);
      }
      assignedRowIds.add(row.id);
      assignments.push({ row, relativePath });
    }
    const removedRows = existingRows.filter(
      (row) => !assignedRowIds.has(row.id),
    );
    if (removedRows.length > 0) {
      await database.query("DELETE FROM palettes WHERE id = ANY($1::INTEGER[])", [
        removedRows.map((row) => row.id),
      ]);
      removed = removedRows.length;
      for (const row of removedRows) {
        existingByPath.delete(row.relative_path);
        existingByPublicId.delete(row.public_id);
      }
    }

    const movedPaletteIds = new Set<number>();
    const movingAssignments = assignments.filter(
      ({ row, relativePath }) => relativePath !== row.relative_path,
    );
    for (const { row } of movingAssignments) {
      await database.query(
        "UPDATE palettes SET relative_path = $1 WHERE id = $2",
        [`.__palette_town_scan__/${row.id}`, row.id],
      );
      existingByPath.delete(row.relative_path);
    }
    for (const { row, relativePath } of movingAssignments) {
      await database.query(
        "UPDATE palettes SET relative_path = $1, updated_at = $2 WHERE id = $3",
        [relativePath, scannedAt, row.id],
      );
      row.relative_path = relativePath;
      existingByPath.set(relativePath, row);
      movedPaletteIds.add(row.id);
    }

    const metadataChangedPaths = new Set<string>();
    for (const [relativePath, metadata] of metadataByPath) {
      const existing = existingByPath.get(relativePath);
      if (
        !existing ||
        (!movedPaletteIds.has(existing.id) && !metadataChanged(existing, metadata))
      ) {
        continue;
      }

      await database.query(
        `UPDATE palettes
         SET public_id = $1,
             display_name = $2,
             tags = $3,
             author_name = $4,
             author_url = $5,
             attribution_text = $6,
             attribution_url = $7,
             attribution_license = $8,
             popularity = $9,
             updated_at = $10
         WHERE id = $11`,
        [
          metadata.publicId,
          metadata.displayName,
          metadata.tags,
          metadata.authorName,
          metadata.authorUrl,
          metadata.attributionText,
          metadata.attributionUrl,
          metadata.attributionLicense,
          metadata.popularity,
          scannedAt,
          existing.id,
        ],
      );
      metadataChangedPaths.add(relativePath);
    }

    for (const candidate of candidates) {
      const metadata = candidate.metadata;
      if (candidate.kind === "unchanged") {
        await database.query(
          `UPDATE palettes
           SET filename = $1,
                file_size = $2,
                mtime_ms = $3,
                scanned_at = $4,
                format_version = $5
            WHERE relative_path = $6`,
          [
            candidate.filename,
            candidate.fileSize,
            candidate.mtimeMs,
            scannedAt,
            PALETTE_FORMAT_VERSION,
            candidate.relativePath,
          ],
        );
        if (metadataChangedPaths.has(candidate.relativePath)) updated += 1;
        else unchanged += 1;
        continue;
      }

      const alreadyExists = existingByPath.has(candidate.relativePath);
      const paletteResult = await database.query<{ id: number }>(
        `INSERT INTO palettes (
           relative_path, public_id, filename, display_name, mime_type, width, height,
           file_size, mtime_ms, sha256, color_count, unique_color_count,
           average_lightness, min_lightness, max_lightness, average_chroma,
           tags, author_name, author_url, attribution_text, attribution_url,
           attribution_license, popularity, format_version,
           created_at, updated_at, scanned_at
         ) VALUES (
           $1, $2, $3, $4, 'image/png', $5, $6, $7, $8, $9, $10, $11,
           $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
           $23, $24, $24, $24
         )
         ON CONFLICT(relative_path) DO UPDATE SET
           public_id = excluded.public_id,
           filename = excluded.filename,
           display_name = excluded.display_name,
           mime_type = excluded.mime_type,
           width = excluded.width,
           height = excluded.height,
           file_size = excluded.file_size,
           mtime_ms = excluded.mtime_ms,
           sha256 = excluded.sha256,
           color_count = excluded.color_count,
           unique_color_count = excluded.unique_color_count,
           average_lightness = excluded.average_lightness,
           min_lightness = excluded.min_lightness,
           max_lightness = excluded.max_lightness,
           average_chroma = excluded.average_chroma,
           tags = excluded.tags,
           author_name = excluded.author_name,
           author_url = excluded.author_url,
           attribution_text = excluded.attribution_text,
           attribution_url = excluded.attribution_url,
           attribution_license = excluded.attribution_license,
           popularity = excluded.popularity,
           format_version = excluded.format_version,
           updated_at = excluded.updated_at,
           scanned_at = excluded.scanned_at
         RETURNING id`,
        [
          candidate.relativePath,
          metadata.publicId,
          candidate.filename,
          candidate.displayName,
          candidate.palette.width,
          candidate.palette.height,
          candidate.fileSize,
          candidate.mtimeMs,
          candidate.sha256,
          candidate.palette.colorCount,
          candidate.palette.uniqueColorCount,
          candidate.palette.averageLightness,
          candidate.palette.minLightness,
          candidate.palette.maxLightness,
          candidate.palette.averageChroma,
          metadata.tags,
          metadata.authorName,
          metadata.authorUrl,
          metadata.attributionText,
          metadata.attributionUrl,
          metadata.attributionLicense,
          metadata.popularity,
          PALETTE_FORMAT_VERSION,
          scannedAt,
        ],
      );
      const paletteId = paletteResult.rows[0].id;
      await database.query(
        "DELETE FROM palette_colors WHERE palette_id = $1",
        [paletteId],
      );

      const colors = candidate.palette.colors;
      await database.query(
        `INSERT INTO palette_colors (
            palette_id, position, hex, red, green, blue, alpha, ok_l, ok_a, ok_b,
            chroma, hue, relative_luminance
          )
          SELECT $1, color.position, color.hex, color.red, color.green,
                 color.blue, color.alpha, color.ok_l, color.ok_a, color.ok_b,
                 color.chroma, color.hue, color.relative_luminance
          FROM UNNEST(
            $2::INTEGER[], $3::TEXT[], $4::INTEGER[], $5::INTEGER[],
            $6::INTEGER[], $7::INTEGER[], $8::DOUBLE PRECISION[],
            $9::DOUBLE PRECISION[], $10::DOUBLE PRECISION[],
            $11::DOUBLE PRECISION[], $12::DOUBLE PRECISION[],
            $13::DOUBLE PRECISION[]
          ) AS color(
            position, hex, red, green, blue, alpha, ok_l, ok_a, ok_b, chroma,
            hue, relative_luminance
          )`,
        [
          paletteId,
          colors.map((_, position) => position),
          colors.map((color) => color.hex),
          colors.map((color) => color.red),
          colors.map((color) => color.green),
          colors.map((color) => color.blue),
          colors.map((color) => color.alpha),
          colors.map((color) => color.okL),
          colors.map((color) => color.okA),
          colors.map((color) => color.okB),
          colors.map((color) => color.chroma),
          colors.map((color) => color.hue),
          colors.map((color) => color.relativeLuminance),
        ],
      );

      if (alreadyExists) updated += 1;
      else added += 1;
    }

    const candidatePaths = new Set(
      candidates.map((candidate) => candidate.relativePath),
    );
    for (const relativePath of metadataChangedPaths) {
      if (!candidatePaths.has(relativePath)) updated += 1;
    }

    await database.query(
      `INSERT INTO scan_state (
         id, last_scanned_at, discovered_count, failure_count
       ) VALUES (1, $1, $2, $3)
       ON CONFLICT(id) DO UPDATE SET
         last_scanned_at = excluded.last_scanned_at,
         discovered_count = excluded.discovered_count,
         failure_count = excluded.failure_count`,
      [scannedAt, files.length, failures.length],
    );
  }

  const totalResult = await database.query<{ count: number }>(
    "SELECT COUNT(*)::INTEGER AS count FROM palettes WHERE format_version = $1",
    [PALETTE_FORMAT_VERSION],
  );
  const total = totalResult.rows[0].count;

  return {
    directory,
    discovered: files.length,
    added,
    updated,
    unchanged,
    removed,
    total,
    durationMs: Math.round(performance.now() - startedAt),
    failures,
  };
}

export function assertPaletteScanAllowed(
  environment = process.env.NODE_ENV,
  mode: "local" | "build" = "local",
) {
  if (environment === "production" && mode !== "build") {
    throw new Error("Palette directory scanning is disabled in production.");
  }
}

export async function scanPaletteDirectory(options?: {
  database?: PaletteDatabase;
  directory?: string;
  mode?: "local" | "build";
  expectedBuildState?: PaletteBuildState;
  sourceCommitSha?: string | null;
  sourcePaletteDirectory?: string | null;
}): Promise<ScanResult> {
  const mode = options?.mode ?? "local";
  assertPaletteScanAllowed(process.env.NODE_ENV, mode);
  if (mode === "build" && (!options || !("sourceCommitSha" in options))) {
    throw new Error("Build scans require source revision metadata.");
  }
  const database = options?.database ?? (await getDatabase());
  const directory = path.resolve(options?.directory ?? getPaletteDirectory());
  const client = await database.connect();
  let transactionStarted = false;
  let discardClient = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;
    await acquireScanLock(client);
    await ensurePaletteBuildState(client);
    if (mode === "build") {
      const sourceResult = await client.query<{
        source_commit_sha: string | null;
        palette_directory: string | null;
        dirty: boolean;
      }>(
        `SELECT source_commit_sha, palette_directory, dirty
         FROM palette_build_state
         WHERE id = 1`,
      );
      const actualSourceCommitSha =
        sourceResult.rows[0]?.source_commit_sha ?? null;
      const actualPaletteDirectory =
        sourceResult.rows[0]?.palette_directory ?? null;
      const actualDirty = sourceResult.rows[0]?.dirty ?? true;
      const expectedBuildState = options?.expectedBuildState ?? {
        sourceCommitSha: null,
        paletteDirectory: null,
        dirty: true,
      };
      if (
        actualSourceCommitSha !== expectedBuildState.sourceCommitSha ||
        actualPaletteDirectory !== expectedBuildState.paletteDirectory ||
        actualDirty !== expectedBuildState.dirty
      ) {
        throw new Error(
          "Palette catalog changed during this build; refusing to overwrite a newer scan.",
        );
      }
    }
    const result = await performScan(client, directory);
    if (mode === "build" && result.failures.length > 0) {
      const failures = result.failures
        .slice(0, 5)
        .map((failure) => `${failure.path}: ${failure.message}`)
        .join("; ");
      throw new Error(
        `Palette build scan rejected ${result.failures.length} invalid file(s): ${failures}`,
      );
    }
    if (mode === "build") {
      if (options?.sourceCommitSha) {
        await client.query(
          `UPDATE palette_build_state
           SET source_commit_sha = $1,
               palette_directory = $2,
               dirty = FALSE,
               updated_at = NOW()
           WHERE id = 1`,
          [options.sourceCommitSha, options.sourcePaletteDirectory ?? null],
        );
      } else {
        await client.query(
          `UPDATE palette_build_state
           SET dirty = TRUE,
               updated_at = NOW()
           WHERE id = 1`,
        );
      }
    } else {
      await client.query(
        `UPDATE palette_build_state
         SET dirty = TRUE,
             updated_at = NOW()
         WHERE id = 1`,
      );
    }
    await client.query("COMMIT");
    transactionStarted = false;
    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        discardClient = true;
        console.error("Palette scan rollback also failed", rollbackError);
      }
    }
    throw error;
  } finally {
    client.release(discardClient);
  }
}

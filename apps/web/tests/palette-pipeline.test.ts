import { randomUUID } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  rename,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Pool } from "pg";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import {
  advancePaletteBuildState,
  assertPaletteScanAllowed,
  createPublicPaletteId,
  extractPaletteImage,
  getDatabaseUrl,
  openDatabase,
  PALETTE_METADATA_FILENAME,
  parseApiPaletteFilters,
  parseCatalogFilters,
  queryApiCatalog,
  queryApiPaletteById,
  queryApiTags,
  queryPaletteBuildState,
  queryCatalog,
  queryCatalogStats,
  scanPaletteDirectory,
  updatePaletteFavorite,
  type PaletteDatabase,
} from "@pigment/palette-catalog/server";

const temporaryDirectories: string[] = [];
const databases: PaletteDatabase[] = [];
const testSchemas: Array<{ database: Pool; name: string }> = [];
const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip;

function parseTestHexColor(value: string) {
  const match = /^#?([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.exec(value);
  if (!match) return null;
  const compact = match[1];
  const hex =
    compact.length <= 4
      ? compact
          .split("")
          .map((character) => character.repeat(2))
          .join("")
      : compact;
  return {
    red: Number.parseInt(hex.slice(0, 2), 16),
    green: Number.parseInt(hex.slice(2, 4), 16),
    blue: Number.parseInt(hex.slice(4, 6), 16),
    alpha: hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) : 255,
  };
}

async function createTemporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), "palette-town-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function createTestDatabaseConfig() {
  const name = `palette_town_test_${randomUUID().replaceAll("-", "")}`;
  const database = new Pool({ connectionString: getDatabaseUrl() });
  try {
    await database.query(`CREATE SCHEMA ${name}`);
  } catch (error) {
    await database.end();
    throw error;
  }
  testSchemas.push({ database, name });
  const url = new URL(getDatabaseUrl());
  url.searchParams.set("options", `-c search_path=${name}`);

  return {
    connectionString: url.toString(),
    schema: name,
  };
}

async function openTestDatabase(
  config: Awaited<ReturnType<typeof createTestDatabaseConfig>>,
) {
  const database = await openDatabase(config.connectionString);
  const result = await database.query<{ schema: string }>(
    "SELECT current_schema() AS schema",
  );

  if (result.rows[0].schema !== config.schema) {
    await database.end();
    throw new Error("Test database connected to an unexpected schema.");
  }

  databases.push(database);
  return database;
}

async function writePalette(filePath: string, hexColors: string[]) {
  const width = hexColors.length * 8;
  const image = Buffer.alloc(width * 8 * 4);

  hexColors.forEach((hex, swatch) => {
    const color = parseTestHexColor(hex);
    if (!color) throw new Error(`Invalid test color: ${hex}`);

    for (let y = 0; y < 8; y += 1) {
      for (let x = swatch * 8; x < swatch * 8 + 8; x += 1) {
        const offset = (y * width + x) * 4;
        image[offset] = color.red;
        image[offset + 1] = color.green;
        image[offset + 2] = color.blue;
        image[offset + 3] = color.alpha ?? 255;
      }
    }
  });

  await sharp(image, { raw: { width, height: 8, channels: 4 } })
    .png()
    .toFile(filePath);
}

async function createPalettePng(
  width: number,
  height: number,
  colorAt: (x: number, y: number) => string,
) {
  const image = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = parseTestHexColor(colorAt(x, y));
      if (!color) throw new Error("Invalid generated test color.");
      const offset = (y * width + x) * 4;
      image[offset] = color.red;
      image[offset + 1] = color.green;
      image[offset + 2] = color.blue;
      image[offset + 3] = color.alpha ?? 255;
    }
  }
  return sharp(image, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

function getApiFilters(
  searchParams: URLSearchParams | Record<string, string>,
) {
  const result = parseApiPaletteFilters(
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(searchParams),
  );
  if (!result.ok) {
    throw new Error(JSON.stringify(result.errors));
  }
  return result.filters;
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.end()));
  for (const schema of testSchemas.splice(0)) {
    try {
      await schema.database.query(`DROP SCHEMA IF EXISTS ${schema.name} CASCADE`);
    } finally {
      await schema.database.end();
    }
  }
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("palette extraction", () => {
  it("disables directory scans in production", () => {
    expect(() => assertPaletteScanAllowed("production")).toThrow(
      "disabled in production",
    );
    expect(() => assertPaletteScanAllowed("development")).not.toThrow();
    expect(() => assertPaletteScanAllowed("test")).not.toThrow();
    expect(() => assertPaletteScanAllowed("production", "build")).not.toThrow();
  });

  it("extracts known sample counts", async () => {
    const fourColorImage = await readFile(
      path.join(process.cwd(), "palettes", "hexpress4-8x.png"),
    );
    const thirtyColorImage = await readFile(
      path.join(process.cwd(), "palettes", "suez-30-8x.png"),
    );
    const onePixelImage = await readFile(
      path.join(process.cwd(), "palettes", "coffee8-1x.png"),
    );

    await expect(extractPaletteImage(fourColorImage)).resolves.toMatchObject({
      width: 32,
      height: 8,
      colorCount: 4,
    });
    await expect(extractPaletteImage(thirtyColorImage)).resolves.toMatchObject({
      width: 240,
      height: 8,
      colorCount: 30,
    });
    await expect(extractPaletteImage(onePixelImage)).resolves.toMatchObject({
      width: 8,
      height: 1,
      colorCount: 8,
    });
  });

  it("extracts variable-size horizontal and vertical rectangles", async () => {
    const horizontal = await createPalettePng(6, 3, (x) =>
      x < 1 ? "#ff0000" : x < 4 ? "#00ff00" : "#0000ff",
    );
    await expect(extractPaletteImage(horizontal)).resolves.toMatchObject({
      width: 6,
      height: 3,
      colors: [
        { hex: "#FF0000" },
        { hex: "#00FF00" },
        { hex: "#0000FF" },
      ],
    });

    const vertical = await createPalettePng(4, 6, (_, y) =>
      y < 2 ? "#112233" : y < 3 ? "#445566" : "#778899",
    );
    await expect(extractPaletteImage(vertical)).resolves.toMatchObject({
      width: 4,
      height: 6,
      colors: [
        { hex: "#112233" },
        { hex: "#445566" },
        { hex: "#778899" },
      ],
    });
  });

  it("rejects a non-solid swatch", async () => {
    const image = Buffer.alloc(8 * 8 * 4, 255);
    image[0] = 0;
    const png = await sharp(image, {
      raw: { width: 8, height: 8, channels: 4 },
    })
      .png()
      .toBuffer();

    await expect(extractPaletteImage(png)).rejects.toThrow(
      "solid rectangular color areas",
    );
  });

  it("preserves alpha and rejects duplicate or oversized palettes", async () => {
    const root = await createTemporaryDirectory();
    const filePath = path.join(root, "rgba.png");
    await writePalette(filePath, ["#ff000080", "#00ff00"]);

    await expect(extractPaletteImage(await readFile(filePath))).resolves.toMatchObject({
      colorCount: 2,
      colors: [
        { hex: "#FF000080", alpha: 128 },
        { hex: "#00FF00", alpha: 255 },
      ],
    });

    await writePalette(filePath, ["#ff0000", "#00ff00", "#ff0000"]);
    await expect(extractPaletteImage(await readFile(filePath))).rejects.toThrow(
      "duplicates swatch 1",
    );

    await writePalette(
      filePath,
      Array.from(
        { length: 65 },
        (_, index) => `#${index.toString(16).padStart(2, "0")}0000`,
      ),
    );
    await expect(extractPaletteImage(await readFile(filePath))).rejects.toThrow(
      "at most 64 colors",
    );
  });
});

describeWithDatabase("database migrations", () => {
  it("marks only v1 palettes compatible with the API format as current", async () => {
    const databaseConfig = await createTestDatabaseConfig();
    const setup = new Pool({ connectionString: databaseConfig.connectionString });
    try {
      await setup.query(`
        CREATE TABLE schema_migrations (
          version INTEGER PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        INSERT INTO schema_migrations (version) VALUES (2);

        CREATE TABLE palettes (
          id INTEGER PRIMARY KEY,
          relative_path TEXT NOT NULL,
          public_id TEXT NOT NULL,
          color_count INTEGER NOT NULL,
          unique_color_count INTEGER NOT NULL
        );
        CREATE UNIQUE INDEX palettes_public_id_idx ON palettes(public_id);
        CREATE TABLE scan_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          last_scanned_at TIMESTAMPTZ NOT NULL,
          discovered_count INTEGER NOT NULL,
          failure_count INTEGER NOT NULL
        );
        INSERT INTO palettes (
          id, relative_path, public_id, color_count, unique_color_count
        ) VALUES
          (1, 'compatible.png', 'compatible', 8, 8),
          (2, 'duplicates.png', 'duplicates', 8, 7),
          (3, 'oversized.png', 'oversized', 65, 65);
      `);
    } finally {
      await setup.end();
    }

    const database = await openTestDatabase(databaseConfig);
    const result = await database.query<{
      public_id: string;
      format_version: number;
    }>(
      `SELECT public_id, format_version
       FROM palettes
       ORDER BY id`,
    );
    expect(result.rows).toEqual([
      { public_id: "compatible", format_version: 2 },
      { public_id: "duplicates", format_version: 1 },
      { public_id: "oversized", format_version: 1 },
    ]);
  });
});

describeWithDatabase("catalog synchronization and queries", () => {
  it("rolls back strict build scans when any palette is invalid", async () => {
    const root = await createTemporaryDirectory();
    const paletteDirectory = path.join(root, "palettes");
    await mkdir(paletteDirectory);
    const database = await openTestDatabase(await createTestDatabaseConfig());
    await Promise.all([
      writePalette(path.join(paletteDirectory, "valid-8x.png"), [
        "#112233",
        "#445566",
      ]),
      writePalette(path.join(paletteDirectory, "invalid-8x.png"), [
        "#abcdef",
        "#123456",
        "#abcdef",
      ]),
    ]);

    await expect(
      scanPaletteDirectory({
        database,
        directory: paletteDirectory,
        mode: "build",
        expectedBuildState: {
          sourceCommitSha: null,
          paletteDirectory: null,
          dirty: true,
        },
        sourceCommitSha: "a".repeat(40),
        sourcePaletteDirectory: "palettes",
      }),
    ).rejects.toThrow("Palette build scan rejected 1 invalid file");
    await expect(
      database.query<{ count: number }>(
        "SELECT COUNT(*)::INTEGER AS count FROM palettes",
      ),
    ).resolves.toMatchObject({ rows: [{ count: 0 }] });
    await expect(
      database.query<{ count: number }>(
        "SELECT COUNT(*)::INTEGER AS count FROM scan_state",
      ),
    ).resolves.toMatchObject({ rows: [{ count: 0 }] });
  });

  it("uses the database revision to reject stale concurrent build scans", async () => {
    const root = await createTemporaryDirectory();
    const paletteDirectory = path.join(root, "palettes");
    await mkdir(paletteDirectory);
    const database = await openTestDatabase(await createTestDatabaseConfig());
    await writePalette(path.join(paletteDirectory, "revisioned-8x.png"), [
      "#112233",
      "#445566",
    ]);
    const firstSha = "a".repeat(40);
    const secondSha = "b".repeat(40);

    await scanPaletteDirectory({
      database,
      directory: paletteDirectory,
      mode: "build",
      expectedBuildState: {
        sourceCommitSha: null,
        paletteDirectory: null,
        dirty: true,
      },
      sourceCommitSha: firstSha,
      sourcePaletteDirectory: "palettes",
    });
    await expect(
      database.query<{ source_commit_sha: string }>(
        "SELECT source_commit_sha FROM palette_build_state WHERE id = 1",
      ),
    ).resolves.toMatchObject({
      rows: [{ source_commit_sha: firstSha }],
    });

    await expect(
      scanPaletteDirectory({
        database,
        directory: paletteDirectory,
        mode: "build",
        expectedBuildState: {
          sourceCommitSha: null,
          paletteDirectory: null,
          dirty: true,
        },
        sourceCommitSha: secondSha,
        sourcePaletteDirectory: "palettes",
      }),
    ).rejects.toThrow("refusing to overwrite a newer scan");
    await expect(
      database.query<{ source_commit_sha: string }>(
        "SELECT source_commit_sha FROM palette_build_state WHERE id = 1",
      ),
    ).resolves.toMatchObject({
      rows: [{ source_commit_sha: firstSha }],
    });

    await expect(
      scanPaletteDirectory({
        database,
        directory: paletteDirectory,
        mode: "build",
        expectedBuildState: {
          sourceCommitSha: firstSha,
          paletteDirectory: "palettes",
          dirty: false,
        },
        sourceCommitSha: secondSha,
        sourcePaletteDirectory: "palettes",
      }),
    ).resolves.toMatchObject({ unchanged: 1, total: 1 });
    await expect(
      database.query<{ source_commit_sha: string }>(
        "SELECT source_commit_sha FROM palette_build_state WHERE id = 1",
      ),
    ).resolves.toMatchObject({
      rows: [{ source_commit_sha: secondSha }],
    });

    const palette = await database.query<{ id: number }>("SELECT id FROM palettes");
    await updatePaletteFavorite(database, palette.rows[0].id, true);
    await expect(
      database.query<{ dirty: boolean }>(
        "SELECT dirty FROM palette_build_state WHERE id = 1",
      ),
    ).resolves.toMatchObject({ rows: [{ dirty: false }] });

    await database.query("TRUNCATE palette_colors");
    await expect(
      database.query<{ source_commit_sha: string; dirty: boolean }>(
        `SELECT source_commit_sha, dirty
         FROM palette_build_state
         WHERE id = 1`,
      ),
    ).resolves.toMatchObject({
      rows: [{ source_commit_sha: secondSha, dirty: true }],
    });

    await scanPaletteDirectory({ database, directory: paletteDirectory });
    await expect(
      database.query<{
        source_commit_sha: string | null;
        palette_directory: string | null;
        dirty: boolean;
      }>(
        `SELECT source_commit_sha, palette_directory, dirty
         FROM palette_build_state
         WHERE id = 1`,
      ),
    ).resolves.toMatchObject({
      rows: [
        {
          source_commit_sha: secondSha,
          palette_directory: "palettes",
          dirty: true,
        },
      ],
    });
  });

  it("advances clean revisions without hiding concurrent catalog writes", async () => {
    const root = await createTemporaryDirectory();
    const paletteDirectory = path.join(root, "palettes");
    await mkdir(paletteDirectory);
    const database = await openTestDatabase(await createTestDatabaseConfig());
    await writePalette(path.join(paletteDirectory, "checkpoint-8x.png"), [
      "#112233",
      "#445566",
    ]);
    const firstSha = "a".repeat(40);
    const secondSha = "b".repeat(40);
    await scanPaletteDirectory({
      database,
      directory: paletteDirectory,
      mode: "build",
      expectedBuildState: {
        sourceCommitSha: null,
        paletteDirectory: null,
        dirty: true,
      },
      sourceCommitSha: firstSha,
      sourcePaletteDirectory: "palettes",
    });

    const cleanState = await queryPaletteBuildState(database);
    await advancePaletteBuildState({
      database,
      expected: cleanState,
      sourceCommitSha: secondSha,
      paletteDirectory: "palettes",
    });
    await expect(queryPaletteBuildState(database)).resolves.toEqual({
      sourceCommitSha: secondSha,
      paletteDirectory: "palettes",
      dirty: false,
    });

    await database.query("UPDATE palettes SET scanned_at = NOW()");
    await expect(
      advancePaletteBuildState({
        database,
        expected: {
          sourceCommitSha: secondSha,
          paletteDirectory: "palettes",
          dirty: false,
        },
        sourceCommitSha: "c".repeat(40),
        paletteDirectory: "palettes",
      }),
    ).rejects.toThrow("refusing to advance a stale revision");
  });

  it("adds, searches, updates, and removes palette files", async () => {
    const root = await createTemporaryDirectory();
    const paletteDirectory = path.join(root, "palettes");
    await mkdir(paletteDirectory);
    const databaseConfig = await createTestDatabaseConfig();
    const database = await openTestDatabase(databaseConfig);
    const secondDatabase = await openTestDatabase(databaseConfig);
    const filePath = path.join(paletteDirectory, "signal-8x.png");
    await writePalette(filePath, ["#FF0000", "#00FF00"]);

    const initialScanPromise = scanPaletteDirectory({
      database,
      directory: paletteDirectory,
    });
    const queuedScanPromise = scanPaletteDirectory({
      database: secondDatabase,
      directory: paletteDirectory,
    });
    const [initialScan, queuedScan] = await Promise.all([
      initialScanPromise,
      queuedScanPromise,
    ]);
    expect([initialScan.added, queuedScan.added].sort()).toEqual([0, 1]);
    expect([initialScan.unchanged, queuedScan.unchanged].sort()).toEqual([0, 1]);
    expect(initialScan.total).toBe(1);
    expect(queuedScan.total).toBe(1);

    const repeatedScan = await scanPaletteDirectory({
      database,
      directory: paletteDirectory,
    });
    expect(repeatedScan).toMatchObject({ unchanged: 1, total: 1 });

    const filters = parseCatalogFilters({
      minColors: "2",
      maxColors: "2",
      color: "#FF0000",
      tolerance: "0",
    });
    const result = await queryCatalog(database, filters);
    expect(result.total).toBe(1);
    expect(result.palettes[0].distance).toBe(0);
    expect(result.palettes[0].colors).toHaveLength(2);
    expect(result.palettes[0].colors.map((color) => color.hex)).toEqual([
      "#FF0000",
      "#00FF00",
    ]);
    expect(result.palettes[0].isFavorite).toBe(false);
    expect(
      await updatePaletteFavorite(database, result.palettes[0].id, true),
    ).toBe(true);
    const favoriteResult = await queryCatalog(
      database,
      parseCatalogFilters({ favorites: "1" }),
    );
    expect(favoriteResult.total).toBe(1);
    expect(favoriteResult.palettes[0].isFavorite).toBe(true);
    expect(await queryCatalogStats(database)).toMatchObject({
      paletteCount: 1,
      colorCount: 2,
      uniqueColorCount: 2,
      favoriteCount: 1,
    });

    await writePalette(filePath, ["#FF0000", "#00FF00", "#0000FF"]);
    const updatedScan = await scanPaletteDirectory({
      database,
      directory: paletteDirectory,
    });
    expect(updatedScan).toMatchObject({ updated: 1, total: 1 });
    expect(
      (
        await queryCatalog(
          database,
          parseCatalogFilters({ minColors: "3", maxColors: "3" }),
        )
      ).palettes[0].isFavorite,
    ).toBe(true);
    expect(
      (
        await queryCatalog(database, parseCatalogFilters({ maxColors: "2" }))
      ).total,
    ).toBe(0);

    await writeFile(filePath, "incomplete image data");
    const failedScan = await scanPaletteDirectory({
      database,
      directory: paletteDirectory,
    });
    expect(failedScan).toMatchObject({ removed: 0, total: 1 });
    expect(failedScan.failures).toHaveLength(1);
    expect(
      (
        await queryCatalog(
          database,
          parseCatalogFilters({ minColors: "3", maxColors: "5" }),
        )
      ).total,
    ).toBe(1);

    await unlink(filePath);
    const removedScan = await scanPaletteDirectory({
      database,
      directory: paletteDirectory,
    });
    expect(removedScan).toMatchObject({ removed: 1, total: 0 });
    expect((await queryCatalogStats(database)).lastScannedAt).not.toBeNull();
  });

  it("imports metadata and serves API filters with stable public IDs", async () => {
    const root = await createTemporaryDirectory();
    const paletteDirectory = path.join(root, "palettes");
    await mkdir(paletteDirectory);
    const database = await openTestDatabase(await createTestDatabaseConfig());
    await Promise.all([
      writePalette(path.join(paletteDirectory, "evening-8x.png"), [
        "#191724",
        "#eb6f9280",
        "#f6c177",
      ]),
      writePalette(path.join(paletteDirectory, "morning-8x.png"), [
        "#fff4cc",
        "#88ccff",
      ]),
    ]);
    await writeFile(
      path.join(paletteDirectory, PALETTE_METADATA_FILENAME),
      JSON.stringify({
        version: 1,
        palettes: {
          "evening-8x.png": {
            id: "evening-arcade",
            name: "Evening Arcade",
            tags: ["dark", "retro"],
            popularity: 100,
            author: { name: "Example Artist", url: "https://example.com" },
            attribution: {
              text: "Used with permission",
              url: "https://example.com/evening",
              license: "CC-BY-4.0",
            },
          },
          "morning-8x.png": {
            tags: ["light"],
            popularity: 5,
          },
        },
      }),
    );

    await expect(
      scanPaletteDirectory({ database, directory: paletteDirectory }),
    ).resolves.toMatchObject({ added: 2, total: 2, failures: [] });

    const defaultCatalog = await queryApiCatalog(
      database,
      getApiFilters({ pageSize: "1" }),
    );
    expect(defaultCatalog).toMatchObject({
      total: 2,
      page: 1,
      pageSize: 1,
      totalPages: 2,
    });
    expect(defaultCatalog.palettes[0].id).toBe("evening-arcade");

    const filtered = await queryApiCatalog(
      database,
      getApiFilters({
        q: "retro",
        tag: "dark",
        minColors: "3",
        maxColors: "3",
        color: "#eb6f9280",
        colorTolerance: "0",
      }),
    );
    expect(filtered.total).toBe(1);
    expect(filtered.palettes[0]).toMatchObject({
      id: "evening-arcade",
      name: "Evening Arcade",
      colors: ["#191724", "#eb6f9280", "#f6c177"],
      colorCount: 3,
      tags: ["dark", "retro"],
      popularity: 100,
      author: { name: "Example Artist", url: "https://example.com" },
      attribution: {
        text: "Used with permission",
        url: "https://example.com/evening",
        license: "CC-BY-4.0",
      },
    });

    await expect(queryApiPaletteById(database, "evening-arcade")).resolves.toEqual(
      filtered.palettes[0],
    );
    await expect(queryApiTags(database)).resolves.toEqual([
      { name: "dark", paletteCount: 1 },
      { name: "light", paletteCount: 1 },
      { name: "retro", paletteCount: 1 },
    ]);

    const morning = await queryApiCatalog(
      database,
      getApiFilters({ q: "Morning", sort: "name" }),
    );
    expect(morning.palettes[0].id).toBe(
      createPublicPaletteId("morning-8x.png"),
    );

    const tagParams = new URLSearchParams();
    tagParams.append("tag", "dark");
    tagParams.append("tag", "retro");
    await expect(
      queryApiCatalog(database, getApiFilters(tagParams)),
    ).resolves.toMatchObject({ total: 1 });
    await expect(
      queryApiCatalog(database, getApiFilters({ q: "%" })),
    ).resolves.toMatchObject({ total: 0 });
    await expect(
      queryApiCatalog(
        database,
        getApiFilters({ color: "#eb6f92", colorTolerance: "0" }),
      ),
    ).resolves.toMatchObject({ total: 0 });

    const morningId = createPublicPaletteId("morning-8x.png");
    await writeFile(
      path.join(paletteDirectory, PALETTE_METADATA_FILENAME),
      JSON.stringify({
        version: 1,
        palettes: {
          "evening-8x.png": {
            id: morningId,
            name: "Evening Arcade",
            tags: ["dark", "retro"],
            popularity: 100,
          },
          "morning-8x.png": {
            id: "evening-arcade",
            tags: ["light"],
            popularity: 5,
          },
        },
      }),
    );
    await expect(
      scanPaletteDirectory({ database, directory: paletteDirectory }),
    ).resolves.toMatchObject({ updated: 2, unchanged: 0, total: 2 });
    await expect(
      queryApiPaletteById(database, "evening-arcade"),
    ).resolves.toMatchObject({ name: "Morning" });
    await expect(
      queryApiPaletteById(database, morningId),
    ).resolves.toMatchObject({ name: "Evening Arcade" });
  });

  it("preserves identity when an explicit-ID file replaces an occupied path", async () => {
    const root = await createTemporaryDirectory();
    const paletteDirectory = path.join(root, "palettes");
    await mkdir(paletteDirectory);
    const database = await openTestDatabase(await createTestDatabaseConfig());
    const originalPath = path.join(paletteDirectory, "original-8x.png");
    const movedPath = path.join(paletteDirectory, "moved-8x.png");
    await Promise.all([
      writePalette(originalPath, ["#112233", "#445566"]),
      writePalette(movedPath, ["#abcdef", "#fedcba"]),
    ]);
    await writeFile(
      path.join(paletteDirectory, PALETTE_METADATA_FILENAME),
      JSON.stringify({
        version: 1,
        palettes: {
          "original-8x.png": { id: "stable-palette" },
          "moved-8x.png": { id: "replaced-palette" },
        },
      }),
    );
    await scanPaletteDirectory({ database, directory: paletteDirectory });

    const before = await database.query<{
      id: number;
      created_at: Date;
    }>("SELECT id, created_at FROM palettes WHERE public_id = 'stable-palette'");
    await updatePaletteFavorite(database, before.rows[0].id, true);
    await rename(originalPath, movedPath);
    await writeFile(
      path.join(paletteDirectory, PALETTE_METADATA_FILENAME),
      JSON.stringify({
        version: 1,
        palettes: { "moved-8x.png": { id: "stable-palette" } },
      }),
    );

    await expect(
      scanPaletteDirectory({ database, directory: paletteDirectory }),
    ).resolves.toMatchObject({
      added: 0,
      updated: 1,
      unchanged: 0,
      removed: 1,
      total: 1,
    });
    const after = await database.query<{
      id: number;
      relative_path: string;
      created_at: Date;
      is_favorite: boolean;
    }>(
      `SELECT id, relative_path, created_at, is_favorite
       FROM palettes
       WHERE public_id = 'stable-palette'`,
    );
    expect(after.rows[0]).toMatchObject({
      id: before.rows[0].id,
      relative_path: "moved-8x.png",
      created_at: before.rows[0].created_at,
      is_favorite: true,
    });
    await expect(
      queryApiPaletteById(database, "replaced-palette"),
    ).resolves.toBeNull();
  });

  it("preserves identity when metadata first assigns an explicit public ID", async () => {
    const root = await createTemporaryDirectory();
    const paletteDirectory = path.join(root, "palettes");
    await mkdir(paletteDirectory);
    const database = await openTestDatabase(await createTestDatabaseConfig());
    await writePalette(path.join(paletteDirectory, "curated-8x.png"), [
      "#123456",
      "#abcdef",
    ]);
    await scanPaletteDirectory({ database, directory: paletteDirectory });
    const initial = await database.query<{
      id: number;
      created_at: Date;
    }>("SELECT id, created_at FROM palettes");
    await updatePaletteFavorite(database, initial.rows[0].id, true);
    await writeFile(
      path.join(paletteDirectory, PALETTE_METADATA_FILENAME),
      JSON.stringify({
        version: 1,
        palettes: {
          "curated-8x.png": { id: "curated-palette", name: "Curated" },
        },
      }),
    );

    await expect(
      scanPaletteDirectory({ database, directory: paletteDirectory }),
    ).resolves.toMatchObject({
      added: 0,
      updated: 1,
      unchanged: 0,
      removed: 0,
      total: 1,
    });
    const updated = await database.query<{
      id: number;
      public_id: string;
      created_at: Date;
      is_favorite: boolean;
    }>("SELECT id, public_id, created_at, is_favorite FROM palettes");
    expect(updated.rows[0]).toEqual({
      id: initial.rows[0].id,
      public_id: "curated-palette",
      created_at: initial.rows[0].created_at,
      is_favorite: true,
    });
  });

  it("keeps failed legacy rows hidden until they can be revalidated", async () => {
    const root = await createTemporaryDirectory();
    const paletteDirectory = path.join(root, "palettes");
    await mkdir(paletteDirectory);
    const database = await openTestDatabase(await createTestDatabaseConfig());
    const filePath = path.join(paletteDirectory, "legacy-8x.png");
    await writePalette(filePath, ["#112233", "#445566"]);
    await scanPaletteDirectory({ database, directory: paletteDirectory });
    const publicId = createPublicPaletteId("legacy-8x.png");
    const initial = await database.query<{ id: number }>(
      "SELECT id FROM palettes WHERE public_id = $1",
      [publicId],
    );
    await updatePaletteFavorite(database, initial.rows[0].id, true);
    await database.query("UPDATE palettes SET format_version = 1 WHERE id = $1", [
      initial.rows[0].id,
    ]);
    await writePalette(filePath, ["#112233", "#445566", "#112233"]);
    await writeFile(
      path.join(paletteDirectory, PALETTE_METADATA_FILENAME),
      JSON.stringify({
        version: 1,
        palettes: {
          "legacy-8x.png": { id: publicId, name: "Legacy Palette" },
        },
      }),
    );

    await expect(
      scanPaletteDirectory({ database, directory: paletteDirectory }),
    ).resolves.toMatchObject({ updated: 1, failures: [{ path: "legacy-8x.png" }], total: 0 });
    await expect(queryApiPaletteById(database, publicId)).resolves.toBeNull();
    const hidden = await database.query<{
      id: number;
      display_name: string;
      format_version: number;
      is_favorite: boolean;
    }>("SELECT id, display_name, format_version, is_favorite FROM palettes");
    expect(hidden.rows[0]).toEqual({
      id: initial.rows[0].id,
      display_name: "Legacy Palette",
      format_version: 1,
      is_favorite: true,
    });

    await writePalette(filePath, ["#112233", "#778899"]);
    await expect(
      scanPaletteDirectory({ database, directory: paletteDirectory }),
    ).resolves.toMatchObject({ updated: 1, failures: [], total: 1 });
    const repaired = await database.query<{
      id: number;
      format_version: number;
      is_favorite: boolean;
    }>("SELECT id, format_version, is_favorite FROM palettes");
    expect(repaired.rows[0]).toEqual({
      id: initial.rows[0].id,
      format_version: 2,
      is_favorite: true,
    });
  });
});

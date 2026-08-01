import "../envConfig";

import {
  getPaletteDirectory,
  openDatabase,
  scanPaletteDirectory,
} from "@pigment/palette-catalog/server";

async function main() {
  const database = await openDatabase();

  try {
    const result = await scanPaletteDirectory({
      database,
      directory: getPaletteDirectory(),
    });

    console.log(
      `Scanned ${result.discovered} files in ${result.durationMs}ms: ${result.added} added, ${result.updated} updated, ${result.unchanged} unchanged, ${result.removed} removed.`,
    );
    console.log(`Catalog now contains ${result.total} palettes.`);

    for (const failure of result.failures) {
      console.error(`${failure.path}: ${failure.message}`);
    }

    if (result.failures.length > 0) process.exitCode = 1;
  } finally {
    await database.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

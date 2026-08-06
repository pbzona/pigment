import nextEnv from "@next/env";

import {
  advancePaletteBuildState,
  decideBuildPaletteScan,
  getPaletteDirectory,
  getPaletteDirectoryRelativePath,
  isBuildPaletteScanEnabled,
  openDatabase,
  queryPaletteBuildState,
  scanPaletteDirectory,
} from "@pigment/palette-catalog/server/build";

nextEnv.loadEnvConfig(process.cwd(), false);

async function main() {
  const forceLocal = process.argv.includes("--force");
  if (!isBuildPaletteScanEnabled(undefined, forceLocal)) {
    console.log("Palette build scan: not a Vercel production build.");
    return;
  }

  const paletteDirectory = getPaletteDirectoryRelativePath();
  const database = await openDatabase();
  let operationFailed = false;
  try {
    const buildState = await queryPaletteBuildState(database);
    const decision = decideBuildPaletteScan({
      trackedPaths: [
        `:(top)apps/web/${paletteDirectory}`,
        ":(top)packages/palette-catalog/src",
      ],
      paletteDirectory,
      buildState,
      forceLocal,
    });
    console.log(`Palette build scan: ${decision.reason}.`);
    if (decision.blocked) {
      throw new Error(`Palette build scan blocked: ${decision.reason}.`);
    }
    if (!decision.scan) {
      if (decision.sourceCommitSha) {
        await advancePaletteBuildState({
          database,
          expected: buildState,
          sourceCommitSha: decision.sourceCommitSha,
          paletteDirectory,
        });
      }
      return;
    }

    const result = await scanPaletteDirectory({
      database,
      directory: getPaletteDirectory(),
      mode: "build",
      expectedBuildState: buildState,
      sourceCommitSha: decision.sourceCommitSha,
      sourcePaletteDirectory: decision.sourceCommitSha
        ? paletteDirectory
        : null,
    });
    console.log(
      `Palette build scan completed in ${result.durationMs}ms: ${result.added} added, ${result.updated} updated, ${result.unchanged} unchanged, ${result.removed} removed; ${result.total} total.`,
    );
  } catch (error) {
    operationFailed = true;
    throw error;
  } finally {
    try {
      await database.end();
    } catch (error) {
      if (!operationFailed) throw error;
      console.error("Palette database cleanup also failed", error);
    }
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

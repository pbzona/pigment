import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const deployableSourcePaths = [
  "app",
  "components",
  "hooks",
  "lib",
  "public",
  "next.config.ts",
];

const forbiddenPatterns = [
  /impeccable-live/i,
  /data-impeccable-/i,
  /__IMPECCABLE_/,
  /ImpeccableLiveRoot/,
  /impeccable-(?:variants|carbonize|param-values)/i,
] as const;

const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".map",
  ".mjs",
  ".svg",
  ".ts",
  ".tsx",
]);

async function collectFiles(targetPath: string): Promise<string[]> {
  const targetStat = await stat(targetPath).catch(() => null);
  if (!targetStat) return [];
  if (targetStat.isFile()) return [targetPath];

  const entries = await readdir(targetPath, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map((entry) =>
      collectFiles(path.join(targetPath, entry.name)),
    ),
  );
  return nestedFiles.flat();
}

export async function findImpeccableRuntimeFiles(
  root: string,
  targets: readonly string[] = deployableSourcePaths,
): Promise<string[]> {
  const files = (
    await Promise.all(targets.map((target) => collectFiles(path.join(root, target))))
  ).flat();
  const matches: string[] = [];

  for (const file of files) {
    if (!textExtensions.has(path.extname(file))) continue;
    const contents = await readFile(file, "utf8").catch(() => null);
    if (
      contents !== null &&
      forbiddenPatterns.some((pattern) => pattern.test(contents))
    ) {
      matches.push(path.relative(root, file));
    }
  }

  return matches.sort();
}

export async function assertNoImpeccableRuntime(
  root: string,
  targets?: readonly string[],
): Promise<void> {
  const matches = await findImpeccableRuntimeFiles(root, targets);
  if (matches.length === 0) return;

  throw new Error(
    [
      "Production build blocked: Impeccable live runtime found in deployable files:",
      ...matches.map((file) => `- ${file}`),
      "Stop Impeccable live mode and remove its injected markup before building.",
    ].join("\n"),
  );
}

async function main() {
  const appRoot = process.cwd();
  const outputPath = process.argv[2];
  await assertNoImpeccableRuntime(
    appRoot,
    outputPath ? [outputPath] : undefined,
  );
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

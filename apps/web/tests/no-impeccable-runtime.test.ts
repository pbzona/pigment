import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  assertNoImpeccableRuntime,
  findImpeccableRuntimeFiles,
} from "../scripts/assert-no-impeccable-runtime";

async function fixtureFile(contents: string) {
  const root = await mkdtemp(path.join(os.tmpdir(), "pigment-build-guard-"));
  await mkdir(path.join(root, "app"), { recursive: true });
  await writeFile(path.join(root, "app", "layout.tsx"), contents);
  return root;
}

describe("Impeccable production build guard", () => {
  it("allows ordinary application source", async () => {
    const root = await fixtureFile("export default function Layout() { return null; }");

    await expect(assertNoImpeccableRuntime(root)).resolves.toBeUndefined();
  });

  it("blocks an injected Impeccable live script", async () => {
    const root = await fixtureFile(
      '<script data-impeccable-live-script src="http://localhost:4321/live.js" />',
    );

    await expect(assertNoImpeccableRuntime(root)).rejects.toThrow(
      "Production build blocked",
    );
    await expect(findImpeccableRuntimeFiles(root)).resolves.toEqual([
      "app/layout.tsx",
    ]);
  });

  it("can inspect a compiled output directory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "pigment-build-output-"));
    await mkdir(path.join(root, ".next", "static"), { recursive: true });
    await writeFile(
      path.join(root, ".next", "static", "chunk.js"),
      "window.__IMPECCABLE_LIVE_INIT__ = true;",
    );

    await expect(
      assertNoImpeccableRuntime(root, [".next"]),
    ).rejects.toThrow(".next/static/chunk.js");
  });
});

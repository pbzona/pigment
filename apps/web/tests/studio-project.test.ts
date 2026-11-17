import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  readStudioProject,
  restoreSparseValues,
  sparseValues,
  STUDIO_PROJECT_KEY,
  writeStudioProject,
  type StudioProject,
} from "@/lib/browser/studio-project";

import { DEFAULT_PALETTE_ADJUSTMENTS } from "@pigment/color";
import {
  DEFAULT_INPUT_ADJUSTMENTS,
  METHOD_INHERIT,
  NO_OVERRIDE_COLOR_ID,
  type CanvasFrame,
} from "@pigment/quantization";

describe("Studio project sparse state", () => {
  it("round-trips regional method overrides", () => {
    const values = new Uint8Array(12);
    values.fill(METHOD_INHERIT);
    values[2] = 3;
    values[9] = 7;

    const restored = new Uint8Array(12);
    restored.fill(METHOD_INHERIT);
    restoreSparseValues(restored, sparseValues(values, METHOD_INHERIT));

    expect(restored).toEqual(values);
  });

  it("round-trips manual color overrides without serializing empty cells", () => {
    const values = new Int32Array(8);
    values.fill(NO_OVERRIDE_COLOR_ID);
    values[1] = 4;
    values[6] = 12;

    const sparse = sparseValues(values, NO_OVERRIDE_COLOR_ID);
    const restored = new Int32Array(8);
    restored.fill(NO_OVERRIDE_COLOR_ID);
    restoreSparseValues(restored, sparse);

    expect(sparse).toEqual([
      [1, 4],
      [6, 12],
    ]);
    expect(restored).toEqual(values);
  });

  it("ignores stale indices when grid dimensions changed", () => {
    const restored = new Uint8Array(3);
    restored.fill(METHOD_INHERIT);

    restoreSparseValues(restored, [
      [1, 2],
      [9, 4],
    ]);

    expect([...restored]).toEqual([METHOD_INHERIT, 2, METHOD_INHERIT]);
  });
});

const project: StudioProject = {
  version: 1,
  gridWidth: 16,
  gridHeight: 8,
  aspectLocked: true,
  method: "dominant",
  preserveTransparency: true,
  alphaThreshold: 128,
  inputAdjustments: DEFAULT_INPUT_ADJUSTMENTS,
  sourceCrop: { x: 0, y: 0, width: 32, height: 16 },
  palette: {
    id: "test",
    name: "Test palette",
    source: "local",
    colors: [
      { id: 9, hex: "#123456" },
      { id: 17, hex: "#abcdef" },
    ],
  },
  paletteAdjustments: DEFAULT_PALETTE_ADJUSTMENTS,
  excludedColorIds: [],
  methodOverrides: [],
  colorOverrides: [],
  showGuides: true,
  guideColumns: 4,
  guideRows: 4,
};
const canvasFrame: CanvasFrame = {
  columns: 8,
  rows: 4,
  scale: 0.75,
  offsetX: -0.25,
  offsetY: 0.5,
  backgroundColorId: 17,
};

describe("Studio project canvas framing", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  const store = (value: unknown) => {
    localStorage.setItem(STUDIO_PROJECT_KEY, JSON.stringify(value));
  };

  it("restores old projects with framing disabled and existing settings unchanged", () => {
    store(project);

    expect(readStudioProject()).toEqual({ ...project, canvasFrame: null });
  });

  it("round-trips a valid frame and selected background swatch", () => {
    writeStudioProject({ ...project, canvasFrame });

    expect(readStudioProject()).toEqual({ ...project, canvasFrame });
  });

  it("preserves an explicitly disabled frame", () => {
    writeStudioProject({ ...project, canvasFrame: null });

    expect(readStudioProject()?.canvasFrame).toBeNull();
  });

  it("falls back to the first palette id when the saved swatch is missing", () => {
    store({
      ...project,
      canvasFrame: { ...canvasFrame, backgroundColorId: 42 },
    });

    expect(readStudioProject()?.canvasFrame).toEqual({
      ...canvasFrame,
      backgroundColorId: 9,
    });
  });

  it("disables framing if the saved palette has no background swatch", () => {
    store({
      ...project,
      palette: { ...project.palette, colors: [] },
      canvasFrame,
    });

    expect(readStudioProject()?.canvasFrame).toBeNull();
  });

  it.each([
    false,
    "frame",
    [],
    {},
    { ...canvasFrame, columns: 0 },
    { ...canvasFrame, rows: -1 },
    { ...canvasFrame, columns: 1.5 },
    { ...canvasFrame, scale: 0.09 },
    { ...canvasFrame, scale: 3.01 },
    { ...canvasFrame, offsetX: -1.01 },
    { ...canvasFrame, offsetY: 1.01 },
    { ...canvasFrame, scale: null },
    { ...canvasFrame, backgroundColorId: "17" },
  ])(
    "disables a malformed saved frame without rejecting the project: %j",
    (value) => {
      store({ ...project, canvasFrame: value });

      expect(readStudioProject()).toEqual({ ...project, canvasFrame: null });
    },
  );

  it("still rejects corrupt JSON and invalid project envelopes", () => {
    localStorage.setItem(STUDIO_PROJECT_KEY, "{");
    expect(readStudioProject()).toBeNull();
    store({ ...project, version: 2, canvasFrame });
    expect(readStudioProject()).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_PALETTE_ADJUSTMENTS } from "@pigment/color";
import {
  DEFAULT_INPUT_ADJUSTMENTS,
  paletteToPixelColors,
} from "@pigment/quantization";
import type { StudioProject } from "@/lib/browser/studio-project";
import {
  comparisonGridForSource,
  comparisonOptions,
  labProjectContext,
} from "@/components/learn/lab-project-context";

const project: StudioProject = {
  version: 1,
  gridWidth: 80,
  gridHeight: 37,
  aspectLocked: false,
  method: "median",
  partition: "square",
  preserveTransparency: false,
  alphaThreshold: 96,
  inputAdjustments: { ...DEFAULT_INPUT_ADJUSTMENTS, exposure: 0.5 },
  sourceCrop: { x: 20, y: 10, width: 400, height: 200 },
  palette: {
    id: "custom",
    name: "My experiment",
    source: "local",
    colors: [
      { id: 9, hex: "#335577" },
      { id: 17, hex: "#eeaa77" },
    ],
  },
  paletteAdjustments: { ...DEFAULT_PALETTE_ADJUSTMENTS, hue: 25 },
  excludedColorIds: [9],
  methodOverrides: [],
  colorOverrides: [],
  showGuides: false,
  guideColumns: 4,
  guideRows: 4,
};

describe("Lab's independent Studio comparison", () => {
  it("copies the exact saved grid, source crop, global method, and processing settings", () => {
    const context = labProjectContext(project, 640, 480);
    expect(context.grid).toEqual({ width: 80, height: 37 });
    expect(context.crop).toEqual(project.sourceCrop);
    expect(context.method).toBe("median");
    expect(context.palette).toEqual({
      ...project.palette,
      id: "lab-studio-current",
      name: "My experiment (Studio)",
    });
    expect(context.settings.inputAdjustments).toEqual(project.inputAdjustments);
    expect(context.settings.preserveTransparency).toBe(false);
    expect(context.settings.alphaThreshold).toBe(96);
    expect(context.differences).toEqual([]);
    expect(project.palette.id).toBe("custom");
    expect(project.gridHeight).toBe(37);
  });

  it("sends adjusted colors, matching exclusions, input and transparency settings to conversion", () => {
    const context = labProjectContext(project, 640, 480);
    const options = comparisonOptions(
      context.grid,
      context.palette,
      context.settings,
    );
    expect(options).toMatchObject({
      gridWidth: 80,
      gridHeight: 37,
      partition: "square",
      inputAdjustments: project.inputAdjustments,
      preserveTransparency: false,
      alphaThreshold: 96,
    });
    expect(options.palette).toEqual(
      paletteToPixelColors(project.palette, project.paletteAdjustments).filter(
        (color) => color.id !== 9,
      ),
    );
  });

  it("does not apply Studio palette-specific adjustments or exclusions to another palette", () => {
    const context = labProjectContext(project, 640, 480);
    const other = { ...project.palette, id: "other" };
    const options = comparisonOptions(context.grid, other, context.settings);
    expect(options.palette).toEqual(
      paletteToPixelColors(other, DEFAULT_PALETTE_ADJUSTMENTS),
    );
    expect(options.palette).toHaveLength(2);
    expect(options.inputAdjustments).toEqual(project.inputAdjustments);
  });

  it("explicitly lists unsupported artwork differences rather than claiming an exact copy", () => {
    const context = labProjectContext(
      {
        ...project,
        partition: "hex",
        canvasFrame: {
          columns: 8,
          rows: 4,
          scale: 0.75,
          offsetX: 0,
          offsetY: 0,
          backgroundColorId: 9,
        },
        colorOverrides: [[0, 9]],
        methodOverrides: [[4, 2]],
      },
      640,
      480,
    );
    expect(context.differences).toEqual([
      "Hexagonal cells are shown as square cells in this comparison.",
      "Canvas framing is not included.",
      "Painted cells are not included.",
      "Regional methods are not included; each output uses one method for the whole image.",
    ]);
    expect(
      comparisonOptions(context.grid, context.palette, context.settings)
        .partition,
    ).toBe("square");
  });

  it("falls back to the full source and explains a stale out-of-bounds crop", () => {
    const context = labProjectContext(project, 100, 80);
    expect(context.crop).toBeNull();
    expect(context.differences).toContain(
      "The saved crop no longer fits this source; the full image is used.",
    );
  });

  it("preserves the saved grid's aspect instead of silently restoring source proportions", () => {
    expect(comparisonGridForSource(160, 80, 37)).toEqual({
      width: 160,
      height: 74,
    });
    expect(comparisonGridForSource(80, 37, 80)).toEqual({
      width: 37,
      height: 80,
    });
    expect(comparisonGridForSource(512, 640, 480)).toEqual({
      width: 512,
      height: 384,
    });
  });
});

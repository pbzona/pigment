import {
  DEFAULT_PALETTE_ADJUSTMENTS,
  type PaletteAdjustments,
} from "@pigment/color";
import type { Palette } from "@pigment/palette";
import {
  CONVERSION_METHODS,
  DEFAULT_INPUT_ADJUSTMENTS,
  MAX_GRID_SIDE,
  MIN_GRID_SIDE,
  paletteToMatchingColors,
  type ConversionOptions,
  type ConversionMethod,
  type InputAdjustments,
  type SourceCrop,
} from "@pigment/quantization";
import type { StudioProject } from "@/lib/browser/studio-project";

export type ComparisonGrid = Readonly<{ width: number; height: number }>;

export type ComparisonSettings = Readonly<{
  inputAdjustments: InputAdjustments;
  preserveTransparency: boolean;
  alphaThreshold: number;
  paletteAdjustments: PaletteAdjustments;
  excludedColorIds: readonly number[];
}>;

export const DEFAULT_COMPARISON_SETTINGS: ComparisonSettings = {
  inputAdjustments: DEFAULT_INPUT_ADJUSTMENTS,
  preserveTransparency: true,
  alphaThreshold: 128,
  paletteAdjustments: DEFAULT_PALETTE_ADJUSTMENTS,
  excludedColorIds: [],
};

export type LabProjectContext = Readonly<{
  grid: ComparisonGrid;
  method: ConversionMethod;
  palette: Palette;
  settings: ComparisonSettings;
  crop: SourceCrop | null;
  differences: readonly string[];
}>;

const gridSide = (value: number) =>
  Number.isFinite(value)
    ? Math.min(MAX_GRID_SIDE, Math.max(MIN_GRID_SIDE, Math.round(value)))
    : 32;

export function comparisonGridForSource(
  longestSide: number,
  width: number,
  height: number,
): ComparisonGrid {
  return width >= height
    ? {
        width: gridSide(longestSide),
        height: gridSide((longestSide * height) / width),
      }
    : {
        width: gridSide((longestSide * width) / height),
        height: gridSide(longestSide),
      };
}

export const comparisonPaletteAdjustments = (
  palette: Palette,
  settings: ComparisonSettings,
) =>
  palette.id === "lab-studio-current"
    ? settings.paletteAdjustments
    : DEFAULT_PALETTE_ADJUSTMENTS;

export function comparisonOptions(
  grid: ComparisonGrid,
  palette: Palette,
  settings: ComparisonSettings,
): Omit<ConversionOptions, "method"> {
  const excluded =
    palette.id === "lab-studio-current" ? settings.excludedColorIds : [];
  return {
    gridWidth: grid.width,
    gridHeight: grid.height,
    partition: "square",
    palette: paletteToMatchingColors(
      palette,
      comparisonPaletteAdjustments(palette, settings),
      new Set(excluded),
    ),
    inputAdjustments: settings.inputAdjustments,
    preserveTransparency: settings.preserveTransparency,
    alphaThreshold: settings.alphaThreshold,
  };
}

/** Copy supported project settings; never mutate the saved Studio procedure. */
export function labProjectContext(
  project: StudioProject,
  sourceWidth: number,
  sourceHeight: number,
): LabProjectContext {
  const differences: string[] = [];
  if (project.partition && project.partition !== "square") {
    differences.push(
      `${project.partition === "hex" ? "Hexagonal" : "Voronoi"} cells are shown as square cells in this comparison.`,
    );
  }
  if (project.canvasFrame) differences.push("Canvas framing is not included.");
  if (project.colorOverrides?.length)
    differences.push("Painted cells are not included.");
  if (project.methodOverrides?.length)
    differences.push(
      "Regional methods are not included; each output uses one method for the whole image.",
    );

  const crop = project.sourceCrop;
  const validCrop =
    crop &&
    [crop.x, crop.y, crop.width, crop.height].every(Number.isInteger) &&
    crop.x >= 0 &&
    crop.y >= 0 &&
    crop.width > 0 &&
    crop.height > 0 &&
    crop.x + crop.width <= sourceWidth &&
    crop.y + crop.height <= sourceHeight;
  if (!validCrop)
    differences.push(
      "The saved crop no longer fits this source; the full image is used.",
    );

  const method =
    CONVERSION_METHODS.find((entry) => entry.value === project.method)?.value ??
    "dominant";
  return {
    grid: {
      width: gridSide(project.gridWidth),
      height: gridSide(project.gridHeight),
    },
    method,
    palette: {
      ...project.palette,
      id: "lab-studio-current",
      name: `${project.palette.name} (Studio)`,
    },
    settings: {
      inputAdjustments: project.inputAdjustments ?? DEFAULT_INPUT_ADJUSTMENTS,
      preserveTransparency: project.preserveTransparency ?? true,
      alphaThreshold: project.alphaThreshold ?? 128,
      paletteAdjustments:
        project.paletteAdjustments ?? DEFAULT_PALETTE_ADJUSTMENTS,
      excludedColorIds: project.excludedColorIds ?? [],
    },
    crop: validCrop ? crop : null,
    differences,
  };
}

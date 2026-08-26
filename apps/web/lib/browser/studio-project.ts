import type { PaletteAdjustments } from "@pigment/color";
import type { Palette } from "@pigment/palette";
import type {
  ConversionMethod,
  InputAdjustments,
  PartitionKind,
  SourceCrop,
} from "@pigment/quantization";

export const STUDIO_PROJECT_KEY = "pigment:studio-project:v1";

export type SparseValue = readonly [index: number, value: number];

export type StudioProject = Readonly<{
  version: 1;
  gridWidth: number;
  gridHeight: number;
  aspectLocked: boolean;
  method: ConversionMethod;
  partition?: PartitionKind;
  partitionScale?: number;
  preserveTransparency: boolean;
  alphaThreshold: number;
  inputAdjustments: InputAdjustments;
  sourceCrop: SourceCrop;
  palette: Palette;
  paletteAdjustments: PaletteAdjustments;
  excludedColorIds: readonly number[];
  methodOverrides: readonly SparseValue[];
  colorOverrides: readonly SparseValue[];
  showGuides: boolean;
  guideColumns: number;
  guideRows: number;
  guideOpacity?: number;
  guideSubdivisions?: number;
  guideRegion?: Readonly<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}>;

export function sparseValues(
  values: ArrayLike<number>,
  ignoredValue: number,
): SparseValue[] {
  const sparse: SparseValue[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value !== ignoredValue) sparse.push([index, value]);
  }
  return sparse;
}

export function restoreSparseValues<T extends Int32Array | Uint8Array>(
  target: T,
  values: readonly SparseValue[],
): T {
  for (const [index, value] of values) {
    if (Number.isInteger(index) && index >= 0 && index < target.length) {
      target[index] = value;
    }
  }
  return target;
}

export function readStudioProject(): StudioProject | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(localStorage.getItem(STUDIO_PROJECT_KEY) ?? "null") as unknown;
    if (!value || typeof value !== "object") return null;
    const project = value as Partial<StudioProject>;
    if (
      project.version !== 1 ||
      typeof project.gridWidth !== "number" ||
      typeof project.gridHeight !== "number" ||
      typeof project.method !== "string" ||
      !project.palette ||
      !Array.isArray(project.palette.colors) ||
      !project.sourceCrop
    ) {
      return null;
    }
    return project as StudioProject;
  } catch {
    return null;
  }
}

export function writeStudioProject(project: StudioProject) {
  localStorage.setItem(STUDIO_PROJECT_KEY, JSON.stringify(project));
}

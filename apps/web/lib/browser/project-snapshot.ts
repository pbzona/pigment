import type { ConversionMethod, InputAdjustments, PixelPreview } from "@pigment/quantization";

export const PROJECT_SNAPSHOT_KEY = "pigment:project:v1";
export const PROJECT_SNAPSHOT_EVENT = "pigment:project-updated";
export const PENDING_PALETTE_KEY = "pigment:pending-palette:v1";

export type PendingPalette = Readonly<{
  name: string;
  colors: readonly string[];
}>;

export type ProjectSnapshot = Readonly<{
  name: string;
  sourceWidth: number;
  sourceHeight: number;
  gridWidth: number;
  gridHeight: number;
  method: ConversionMethod;
  paletteName: string;
  paletteColors: readonly string[];
  inputAdjustments: InputAdjustments;
  interventionCount: number;
  thumbnail: string | null;
  updatedAt: number;
}>;

export function readProjectSnapshot(): ProjectSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(localStorage.getItem(PROJECT_SNAPSHOT_KEY) ?? "null") as unknown;
    if (!value || typeof value !== "object") return null;
    const snapshot = value as Partial<ProjectSnapshot>;
    return typeof snapshot.name === "string" && typeof snapshot.updatedAt === "number"
      ? (snapshot as ProjectSnapshot)
      : null;
  } catch {
    return null;
  }
}

export function writeProjectSnapshot(snapshot: ProjectSnapshot) {
  localStorage.setItem(PROJECT_SNAPSHOT_KEY, JSON.stringify(snapshot));
  window.dispatchEvent(new CustomEvent(PROJECT_SNAPSHOT_EVENT));
}

export function writePendingPalette(palette: PendingPalette) {
  localStorage.setItem(PENDING_PALETTE_KEY, JSON.stringify(palette));
}

export function takePendingPalette(): PendingPalette | null {
  try {
    const value = JSON.parse(localStorage.getItem(PENDING_PALETTE_KEY) ?? "null") as unknown;
    localStorage.removeItem(PENDING_PALETTE_KEY);
    if (!value || typeof value !== "object") return null;
    const palette = value as Partial<PendingPalette>;
    return typeof palette.name === "string" && Array.isArray(palette.colors)
      ? (palette as PendingPalette)
      : null;
  } catch {
    localStorage.removeItem(PENDING_PALETTE_KEY);
    return null;
  }
}

export function previewToThumbnail(preview: PixelPreview, maxSide = 320): string | null {
  const scale = Math.min(1, maxSide / Math.max(preview.width, preview.height));
  const width = Math.max(1, Math.round(preview.width * scale));
  const height = Math.max(1, Math.round(preview.height * scale));
  const source = document.createElement("canvas");
  source.width = preview.width;
  source.height = preview.height;
  const sourceContext = source.getContext("2d");
  if (!sourceContext) return null;
  sourceContext.putImageData(
    new ImageData(new Uint8ClampedArray(preview.pixels), preview.width, preview.height),
    0,
    0,
  );
  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;
  const outputContext = output.getContext("2d");
  if (!outputContext) return null;
  outputContext.drawImage(source, 0, 0, width, height);
  return output.toDataURL("image/webp", 0.76);
}

import {
  createSourcePreview,
  cropPixels,
  type InputAdjustments,
  type SourceCrop,
} from "@pigment/quantization";

import { decodeImageFile } from "./image";

export type ReferenceExportGrid = Readonly<{
  columns: number;
  rows: number;
  subdivisions: number;
  opacity: number;
  region: Readonly<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}>;

type ExportReferenceOptions = Readonly<{
  file: File;
  crop: SourceCrop;
  adjustments: InputAdjustments;
  preserveTransparency: boolean;
  alphaThreshold: number;
  showGrid: boolean;
  grid: ReferenceExportGrid;
  fileName: string;
}>;

const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The browser could not create a PNG."));
    }, "image/png");
  });

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const drawGrid = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  grid: ReferenceExportGrid,
) => {
  const alpha = Math.min(1, Math.max(0.1, grid.opacity / 100));
  const lineWidth = Math.max(1, Math.round(Math.min(width, height) / 700));
  const left = grid.region.x * width;
  const top = grid.region.y * height;
  const gridWidth = grid.region.width * width;
  const gridHeight = grid.region.height * height;
  const drawLines = (
    columns: number,
    rows: number,
    opacity: number,
    widthMultiplier: number,
  ) => {
    context.beginPath();
    for (let column = 1; column < columns; column += 1) {
      const x = left + (column * gridWidth) / columns;
      context.moveTo(x, top);
      context.lineTo(x, top + gridHeight);
    }
    for (let row = 1; row < rows; row += 1) {
      const y = top + (row * gridHeight) / rows;
      context.moveTo(left, y);
      context.lineTo(left + gridWidth, y);
    }
    context.strokeStyle = `rgb(255 118 87 / ${opacity})`;
    context.lineWidth = lineWidth * widthMultiplier;
    context.stroke();
  };

  if (grid.subdivisions > 1) {
    drawLines(
      grid.columns * grid.subdivisions,
      grid.rows * grid.subdivisions,
      alpha * 0.42,
      1,
    );
  }
  drawLines(grid.columns, grid.rows, alpha, 1.65);
  context.strokeStyle = `rgb(255 118 87 / ${alpha})`;
  context.lineWidth = lineWidth * 2;
  context.strokeRect(left, top, gridWidth, gridHeight);
};

export const exportReferencePng = async ({
  file,
  crop,
  adjustments,
  preserveTransparency,
  alphaThreshold,
  showGrid,
  grid,
  fileName,
}: ExportReferenceOptions): Promise<void> => {
  const decoded = await decodeImageFile(file);
  const croppedPixels = cropPixels(
    decoded.pixels,
    decoded.width,
    decoded.height,
    crop,
  );
  const adjusted = createSourcePreview(
    croppedPixels,
    crop.width,
    crop.height,
    adjustments,
    preserveTransparency,
    alphaThreshold,
    Math.max(crop.width, crop.height),
  );
  const output = document.createElement("canvas");
  output.width = crop.width;
  output.height = crop.height;
  const outputContext = output.getContext("2d");
  if (!outputContext) throw new Error("The browser could not create an export canvas.");
  outputContext.putImageData(
    new ImageData(adjusted.pixels, adjusted.width, adjusted.height),
    0,
    0,
  );
  if (showGrid) drawGrid(outputContext, crop.width, crop.height, grid);
  downloadBlob(await canvasToBlob(output), fileName);
};

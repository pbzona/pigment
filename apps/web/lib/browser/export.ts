import { colorIdsToRgba, MAX_EXPORT_PIXELS, MAX_EXPORT_SIDE, rasterizePartitionColors } from "@pigment/quantization";
import type { PartitionKind, PixelPaletteColor } from "@pigment/quantization";

const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The browser could not create a PNG."));
    }, "image/png");
  });

export const exportPixelPng = async (
  colorIds: Uint16Array,
  width: number,
  height: number,
  palette: readonly PixelPaletteColor[],
  scale: number,
  fileName: string,
  partition: PartitionKind = "square",
  partitionScale = 6,
): Promise<void> => {
  const outputWidth = width * scale;
  const outputHeight = height * scale;
  if (
    outputWidth > MAX_EXPORT_SIDE ||
    outputHeight > MAX_EXPORT_SIDE ||
    outputWidth * outputHeight > MAX_EXPORT_PIXELS
  ) {
    throw new Error("That export is too large for a reliable browser download.");
  }

  const rendered = partition === "square"
    ? { width, height, colorIds }
    : rasterizePartitionColors(colorIds, width, height, partition, partitionScale, 1, scale);
  const source = document.createElement("canvas");
  source.width = rendered.width;
  source.height = rendered.height;
  const sourceContext = source.getContext("2d");
  if (!sourceContext) throw new Error("The browser could not create an export canvas.");
  sourceContext.putImageData(
    new ImageData(colorIdsToRgba(rendered.colorIds, palette), rendered.width, rendered.height),
    0,
    0,
  );

  const output = document.createElement("canvas");
  output.width = outputWidth;
  output.height = outputHeight;
  const outputContext = output.getContext("2d");
  if (!outputContext) throw new Error("The browser could not create an export canvas.");
  outputContext.imageSmoothingEnabled = false;
  outputContext.drawImage(source, 0, 0, outputWidth, outputHeight);

  const blob = await canvasToBlob(output);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

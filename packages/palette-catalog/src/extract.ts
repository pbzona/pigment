import sharp from "sharp";

import { getColorMetrics, type RgbColor } from "./colors";
import { MAX_PALETTE_COLORS } from "./config";
import type { ExtractedPalette } from "./types";

export class PaletteFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaletteFormatError";
  }
}

function extractRectangularSequence(
  data: Buffer,
  info: { width: number; height: number; channels: number },
  orientation: "horizontal" | "vertical",
) {
  const sequenceLength =
    orientation === "horizontal" ? info.width : info.height;
  const crossLength =
    orientation === "horizontal" ? info.height : info.width;
  const colors: RgbColor[] = [];
  let previousColor = "";

  for (let position = 0; position < sequenceLength; position += 1) {
    const x = orientation === "horizontal" ? position : 0;
    const y = orientation === "horizontal" ? 0 : position;
    const firstOffset = (y * info.width + x) * info.channels;
    const red = data[firstOffset];
    const green = data[firstOffset + 1];
    const blue = data[firstOffset + 2];
    const alpha = data[firstOffset + 3];

    for (let cross = 1; cross < crossLength; cross += 1) {
      const crossX = orientation === "horizontal" ? position : cross;
      const crossY = orientation === "horizontal" ? cross : position;
      const offset = (crossY * info.width + crossX) * info.channels;
      if (
        data[offset] !== red ||
        data[offset + 1] !== green ||
        data[offset + 2] !== blue ||
        data[offset + 3] !== alpha
      ) {
        return null;
      }
    }

    const key = `${red},${green},${blue},${alpha}`;
    if (key !== previousColor) {
      colors.push({ red, green, blue, alpha });
      previousColor = key;
    }
  }

  return colors;
}

export async function extractPaletteImage(
  image: Buffer,
): Promise<ExtractedPalette> {
  const metadata = await sharp(image, { failOn: "error" }).metadata();

  if (metadata.format !== "png") {
    throw new PaletteFormatError("Only PNG palette strips are supported.");
  }

  const { data, info } = await sharp(image, { failOn: "error" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const extractedColors =
    extractRectangularSequence(data, info, "horizontal") ??
    extractRectangularSequence(data, info, "vertical");
  if (!extractedColors) {
    throw new PaletteFormatError(
      "Image must be a horizontal or vertical sequence of solid rectangular color areas.",
    );
  }
  if (extractedColors.length > MAX_PALETTE_COLORS) {
    throw new PaletteFormatError(
      `Palettes may contain at most ${MAX_PALETTE_COLORS} colors; received ${extractedColors.length}.`,
    );
  }

  const colors = extractedColors.map((color) => getColorMetrics(color));
  const colorPositions = new Map<string, number>();
  for (const [position, color] of colors.entries()) {
    const previousPosition = colorPositions.get(color.hex);
    if (previousPosition !== undefined) {
      throw new PaletteFormatError(
        `Swatch ${position + 1} duplicates swatch ${previousPosition + 1} (${color.hex}).`,
      );
    }
    colorPositions.set(color.hex, position);
  }

  let totalLightness = 0;
  let totalChroma = 0;
  let minLightness = Number.POSITIVE_INFINITY;
  let maxLightness = Number.NEGATIVE_INFINITY;

  for (const color of colors) {
    totalLightness += color.okL;
    totalChroma += color.chroma;
    minLightness = Math.min(minLightness, color.okL);
    maxLightness = Math.max(maxLightness, color.okL);
  }

  return {
    width: info.width,
    height: info.height,
    colorCount: colors.length,
    uniqueColorCount: colors.length,
    averageLightness: totalLightness / colors.length,
    minLightness,
    maxLightness,
    averageChroma: totalChroma / colors.length,
    colors,
  };
}

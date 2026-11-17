import { srgbByteToLinear, type RgbaColor } from "@pigment/color";

import {
  createInputSampler,
  type InputSampler,
  type InputSample,
} from "./input-adjust";
import type { PixelPreview } from "./preview";
import {
  MAX_EXPORT_PIXELS,
  MAX_EXPORT_SIDE,
  MAX_GRID_SIDE,
  MIN_GRID_SIDE,
  TRANSPARENT_COLOR_ID,
  type CanvasFrame,
  type InputAdjustments,
} from "./types";

/** Validate persisted framing settings without coercing or clamping invalid values. */
export const normalizeCanvasFrame = (value: unknown): CanvasFrame | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  const frame = value as Record<string, unknown>;
  const { columns, rows, scale, offsetX, offsetY, backgroundColorId } = frame;
  if (
    typeof columns !== "number" ||
    !Number.isInteger(columns) ||
    columns < 2 ||
    columns > 32 ||
    typeof rows !== "number" ||
    !Number.isInteger(rows) ||
    rows < 2 ||
    rows > 32 ||
    typeof scale !== "number" ||
    !Number.isFinite(scale) ||
    scale < 0.1 ||
    scale > 3 ||
    typeof offsetX !== "number" ||
    !Number.isFinite(offsetX) ||
    offsetX < -1 ||
    offsetX > 1 ||
    typeof offsetY !== "number" ||
    !Number.isFinite(offsetY) ||
    offsetY < -1 ||
    offsetY > 1 ||
    typeof backgroundColorId !== "number" ||
    !Number.isInteger(backgroundColorId) ||
    backgroundColorId < 0 ||
    backgroundColorId >= TRANSPARENT_COLOR_ID
  )
    return null;
  return { columns, rows, scale, offsetX, offsetY, backgroundColorId };
};

const validateSourceDimensions = (width: number, height: number) => {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1
  ) {
    throw new RangeError("Source dimensions must be positive safe integers.");
  }
};

/**
 * Start with the smallest ratio canvas containing the native image. Output caps
 * shrink that canvas uniformly; scale and offsets then position the image within it.
 */
export const canvasFrameLayout = (
  sourceWidth: number,
  sourceHeight: number,
  frameValue: CanvasFrame,
  maxSide = MAX_EXPORT_SIDE,
): Readonly<{
  width: number;
  height: number;
  imageX: number;
  imageY: number;
  imageWidth: number;
  imageHeight: number;
}> => {
  validateSourceDimensions(sourceWidth, sourceHeight);
  const frame = normalizeCanvasFrame(frameValue);
  if (!frame) throw new RangeError("Invalid canvas frame.");
  if (!Number.isFinite(maxSide) || maxSide < 1) {
    throw new RangeError(
      "Maximum canvas side must be a positive finite number.",
    );
  }
  const ratio = frame.columns / frame.rows;
  const baseWidth = Math.max(sourceWidth, sourceHeight * ratio);
  const baseHeight = Math.max(sourceHeight, sourceWidth / ratio);
  const sideLimit = Math.min(Math.floor(maxSide), MAX_EXPORT_SIDE);
  const shrink = Math.min(
    1,
    sideLimit / baseWidth,
    sideLimit / baseHeight,
    Math.sqrt(MAX_EXPORT_PIXELS / baseWidth / baseHeight),
  );
  const width = Math.max(1, Math.floor(baseWidth * shrink));
  const height = Math.max(1, Math.floor(baseHeight * shrink));
  const imageScale =
    Math.min(width / sourceWidth, height / sourceHeight) * frame.scale;
  const imageWidth = sourceWidth * imageScale;
  const imageHeight = sourceHeight * imageScale;
  return {
    width,
    height,
    imageX: (width - imageWidth) / 2 + frame.offsetX * width,
    imageY: (height - imageHeight) / 2 + frame.offsetY * height,
    imageWidth,
    imageHeight,
  };
};

/** Mark only cells whose entire continuous canvas bounds miss the image. */
export const canvasFrameBackgroundMask = (
  sourceWidth: number,
  sourceHeight: number,
  frame: CanvasFrame,
  gridWidth: number,
  gridHeight: number,
): Uint8Array => {
  if (
    !Number.isInteger(gridWidth) ||
    !Number.isInteger(gridHeight) ||
    gridWidth < MIN_GRID_SIDE ||
    gridHeight < MIN_GRID_SIDE ||
    gridWidth > MAX_GRID_SIDE ||
    gridHeight > MAX_GRID_SIDE
  ) {
    throw new RangeError(
      `Grid dimensions must be between ${MIN_GRID_SIDE} and ${MAX_GRID_SIDE}.`,
    );
  }
  const layout = canvasFrameLayout(sourceWidth, sourceHeight, frame);
  const mask = new Uint8Array(gridWidth * gridHeight);
  for (let y = 0; y < gridHeight; y += 1) {
    for (let x = 0; x < gridWidth; x += 1) {
      mask[y * gridWidth + x] = Number(
        ((x + 1) * layout.width) / gridWidth <= layout.imageX ||
          (x * layout.width) / gridWidth >= layout.imageX + layout.imageWidth ||
          ((y + 1) * layout.height) / gridHeight <= layout.imageY ||
          (y * layout.height) / gridHeight >=
            layout.imageY + layout.imageHeight,
      );
    }
  }
  return mask;
};

type FrameLayout = ReturnType<typeof canvasFrameLayout>;

const imageContains = (x: number, y: number, layout: FrameLayout): boolean =>
  x + 0.5 >= layout.imageX &&
  x + 0.5 < layout.imageX + layout.imageWidth &&
  y + 0.5 >= layout.imageY &&
  y + 0.5 < layout.imageY + layout.imageHeight;

/** @internal A virtual canvas keeps conversion from allocating a padded source image. */
export const createFramedInputSampler = (
  sourcePixels: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  layout: FrameLayout,
  background: RgbaColor,
  adjustments: InputAdjustments | undefined,
  preserveTransparency: boolean,
): InputSampler => {
  const source = createInputSampler(
    sourcePixels,
    sourceWidth,
    sourceHeight,
    adjustments,
    preserveTransparency,
  );
  const linearR = srgbByteToLinear(background.r);
  const linearG = srgbByteToLinear(background.g);
  const linearB = srgbByteToLinear(background.b);
  return {
    sample(x, y, target) {
      if (!imageContains(x, y, layout)) {
        target.r = background.r;
        target.g = background.g;
        target.b = background.b;
        target.linearR = linearR;
        target.linearG = linearG;
        target.linearB = linearB;
        target.alpha = Math.round(background.alpha * 255);
        return;
      }
      const sourceX = Math.min(
        sourceWidth - 1,
        Math.max(
          0,
          Math.floor(
            ((x + 0.5 - layout.imageX) / layout.imageWidth) * sourceWidth,
          ),
        ),
      );
      const sourceY = Math.min(
        sourceHeight - 1,
        Math.max(
          0,
          Math.floor(
            ((y + 0.5 - layout.imageY) / layout.imageHeight) * sourceHeight,
          ),
        ),
      );
      source.sample(sourceX, sourceY, target);
    },
  };
};

export const createFramedPreview = (
  sourcePixels: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  frame: CanvasFrame,
  background: RgbaColor,
  adjustments: InputAdjustments | undefined,
  preserveTransparency: boolean,
  alphaThreshold: number,
  maxSide = 1_024,
): PixelPreview => {
  const layout = canvasFrameLayout(sourceWidth, sourceHeight, frame, maxSide);
  if (sourcePixels.length !== sourceWidth * sourceHeight * 4) {
    throw new RangeError("Source pixel data does not match its dimensions.");
  }
  if (
    !Number.isFinite(alphaThreshold) ||
    alphaThreshold < 0 ||
    alphaThreshold > 255
  ) {
    throw new RangeError("Alpha threshold must be between 0 and 255.");
  }
  const pixels = new Uint8ClampedArray(layout.width * layout.height * 4);
  const sampler = createFramedInputSampler(
    sourcePixels,
    sourceWidth,
    sourceHeight,
    layout,
    background,
    adjustments,
    preserveTransparency,
  );
  const sample: InputSample = {
    r: 0,
    g: 0,
    b: 0,
    linearR: 0,
    linearG: 0,
    linearB: 0,
    alpha: 0,
  };
  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) {
      sampler.sample(x, y, sample);
      const offset = (y * layout.width + x) * 4;
      pixels[offset] = sample.r;
      pixels[offset + 1] = sample.g;
      pixels[offset + 2] = sample.b;
      pixels[offset + 3] = !imageContains(x, y, layout)
        ? sample.alpha
        : preserveTransparency
          ? sample.alpha < alphaThreshold
            ? 0
            : sample.alpha
          : 255;
    }
  }
  return { width: layout.width, height: layout.height, pixels };
};

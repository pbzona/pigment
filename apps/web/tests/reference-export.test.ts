import { afterEach, describe, expect, it, vi } from "vitest";

import {
  referenceGridGeometry,
  renderReferencePreview,
  type ReferencePreviewOptions,
} from "@/lib/browser/reference-export";
import * as quantization from "@pigment/quantization";
import {
  DEFAULT_INPUT_ADJUSTMENTS,
  MAX_EXPORT_PIXELS,
  MAX_EXPORT_SIDE,
  type CanvasFrame,
  type PixelPaletteColor,
} from "@pigment/quantization";

const background: PixelPaletteColor = {
  id: 17,
  color: { r: 24, g: 48, b: 72, alpha: 1 },
};
const backgroundPixel = [24, 48, 72, 255];
const frame: CanvasFrame = {
  columns: 4,
  rows: 4,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  backgroundColorId: background.id,
};
const source = new Uint8ClampedArray([
  64, 64, 64, 255, 96, 96, 96, 255, 128, 128, 128, 255, 160, 160, 160, 255, 160,
  160, 160, 255, 128, 128, 128, 255, 96, 96, 96, 255, 64, 64, 64, 255,
]);
const options: ReferencePreviewOptions = {
  crop: { x: 0, y: 0, width: 4, height: 2 },
  adjustments: DEFAULT_INPUT_ADJUSTMENTS,
  preserveTransparency: true,
  alphaThreshold: 128,
};

afterEach(() => vi.restoreAllMocks());

describe("Reference export preview", () => {
  it("keeps the legacy unframed crop dimensions, pixels, and transparency", () => {
    const pixels = source.slice();
    pixels[7] = 64;
    const croppedOptions = {
      ...options,
      crop: { x: 1, y: 0, width: 2, height: 2 },
    };
    const expected = quantization.createSourcePreview(
      quantization.cropPixels(pixels, 4, 2, croppedOptions.crop),
      2,
      2,
      options.adjustments,
      true,
      128,
      2,
    );

    expect(renderReferencePreview(pixels, 4, 2, croppedOptions)).toEqual(
      expected,
    );
    expect(
      renderReferencePreview(pixels, 4, 2, {
        ...croppedOptions,
        frame: null,
        frameBackground: background,
      }),
    ).toEqual(expected);
  });

  it("pads the source with the selected palette swatch at the framed dimensions", () => {
    const preview = renderReferencePreview(source, 4, 2, {
      ...options,
      frame,
      frameBackground: background,
    });

    expect([preview.width, preview.height]).toEqual([4, 4]);
    expect([...preview.pixels.slice(0, 16)]).toEqual(
      Array(4).fill(backgroundPixel).flat(),
    );
    expect(preview.pixels.slice(16, 48)).toEqual(source);
    expect([...preview.pixels.slice(48)]).toEqual(
      Array(4).fill(backgroundPixel).flat(),
    );
    expect(source[0]).toBe(64);
  });

  it("adjusts source pixels without applying source adjustments to the background", () => {
    const adjustments = { ...DEFAULT_INPUT_ADJUSTMENTS, exposure: 1 };
    const adjustedSource = renderReferencePreview(source, 4, 2, {
      ...options,
      adjustments,
    });
    const preview = renderReferencePreview(source, 4, 2, {
      ...options,
      adjustments,
      frame,
      frameBackground: background,
    });

    expect(adjustedSource.pixels[0]).toBeGreaterThan(source[0]);
    expect(preview.pixels.slice(16, 48)).toEqual(adjustedSource.pixels);
    expect([...preview.pixels.slice(0, 4)]).toEqual(backgroundPixel);
  });

  it("frames the cropped source rather than the original image", () => {
    const preview = renderReferencePreview(source, 4, 2, {
      ...options,
      crop: { x: 1, y: 0, width: 2, height: 2 },
      frame: { ...frame, columns: 8 },
      frameBackground: background,
    });

    expect([preview.width, preview.height]).toEqual([4, 2]);
    expect([...preview.pixels.slice(0, 16)]).toEqual([
      ...backgroundPixel,
      96,
      96,
      96,
      255,
      128,
      128,
      128,
      255,
      ...backgroundPixel,
    ]);
  });

  it("preserves source transparency while keeping canvas padding solid", () => {
    const transparent = source.slice();
    transparent[3] = 0;
    const preview = renderReferencePreview(transparent, 4, 2, {
      ...options,
      frame,
      frameBackground: background,
    });

    expect([...preview.pixels.slice(16, 20)]).toEqual([64, 64, 64, 0]);
    expect([...preview.pixels.slice(0, 16)]).toEqual(
      Array(4).fill(backgroundPixel).flat(),
    );
    expect([...preview.pixels.slice(48)]).toEqual(
      Array(4).fill(backgroundPixel).flat(),
    );
  });

  it("requires a resolved palette background for a framed export", () => {
    expect(() =>
      renderReferencePreview(source, 4, 2, { ...options, frame }),
    ).toThrow(
      "Choose a palette color for the canvas background before exporting.",
    );
  });

  it("caps framed output at the shared export side and pixel bounds", () => {
    const render = vi
      .spyOn(quantization, "createFramedPreview")
      .mockImplementation(
        (
          _pixels,
          width,
          height,
          canvasFrame,
          _background,
          _adjustments,
          _transparency,
          _threshold,
          maxSide,
        ) => {
          const layout = quantization.canvasFrameLayout(
            width,
            height,
            canvasFrame,
            maxSide,
          );
          return {
            width: layout.width,
            height: layout.height,
            pixels: new Uint8ClampedArray(0),
          };
        },
      );
    const width = MAX_EXPORT_SIDE + 1;
    const preview = renderReferencePreview(
      new Uint8ClampedArray(width * 4),
      width,
      1,
      {
        ...options,
        crop: { x: 0, y: 0, width, height: 1 },
        frame,
        frameBackground: background,
      },
    );

    expect(render).toHaveBeenCalledOnce();
    expect(preview.width).toBeLessThanOrEqual(MAX_EXPORT_SIDE);
    expect(preview.height).toBeLessThanOrEqual(MAX_EXPORT_SIDE);
    expect(preview.width * preview.height).toBeLessThanOrEqual(
      MAX_EXPORT_PIXELS,
    );
  });

  it("maps the export grid region onto the whole framed output", () => {
    const preview = renderReferencePreview(source, 4, 2, {
      ...options,
      frame,
      frameBackground: background,
    });
    const geometry = referenceGridGeometry(preview.width, preview.height, {
      columns: 4,
      rows: 4,
      subdivisions: 2,
      opacity: 50,
      region: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
    });

    expect(geometry).toEqual({
      left: 1,
      top: 1,
      width: 2,
      height: 2,
      lineWidth: 1,
    });
  });
});

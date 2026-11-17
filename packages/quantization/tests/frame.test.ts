import { describe, expect, it } from "vitest";

import { rgba } from "@pigment/color";
import {
  DEFAULT_INPUT_ADJUSTMENTS,
  MAX_EXPORT_PIXELS,
  MAX_EXPORT_SIDE,
  METHOD_CENTER,
  METHOD_INHERIT,
  TRANSPARENT_COLOR_ID,
  canvasFrameBackgroundMask,
  canvasFrameLayout,
  convertImage,
  createFramedPreview,
  createSourcePreview,
  normalizeCanvasFrame,
  traceImageConversion,
  type CanvasFrame,
  type ConversionMethod,
  type ConversionOptions,
  type PixelPaletteColor,
} from "@pigment/quantization";

const frame: CanvasFrame = {
  columns: 4,
  rows: 4,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  backgroundColorId: 42,
};
const background: PixelPaletteColor = { id: 42, color: rgba(23, 111, 219) };
const palette: readonly PixelPaletteColor[] = [
  { id: 10, color: rgba(0, 0, 0) },
  { id: 20, color: rgba(255, 255, 255) },
];
const solidPixels = (width: number, height: number, value = 0, alpha = 255) => {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    pixels.set([value, value, value, alpha], index * 4);
  }
  return pixels;
};
const options = (method: ConversionMethod = "average"): ConversionOptions => ({
  gridWidth: 4,
  gridHeight: 4,
  method,
  palette,
  preserveTransparency: true,
  alphaThreshold: 128,
  frame,
  frameBackground: background,
});
const methods: readonly ConversionMethod[] = [
  "center",
  "average",
  "median",
  "dominant",
  "geometric-median",
  "dither",
  "atkinson",
  "bayer",
  "blue-noise",
  "riemersma",
];
const polygonMethods = methods.filter((method) =>
  ["center", "average", "median", "dominant", "geometric-median"].includes(
    method,
  ),
);

const pixel = (
  pixels: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
) => [...pixels.slice((y * width + x) * 4, (y * width + x + 1) * 4)];

describe("canvas frame validation", () => {
  it("validates saved settings and returns a separate normalized object", () => {
    expect(normalizeCanvasFrame({ ...frame, unrelated: true })).toEqual(frame);
    expect(normalizeCanvasFrame(frame)).not.toBe(frame);
    expect(
      normalizeCanvasFrame({
        ...frame,
        columns: 2,
        rows: 32,
        scale: 0.1,
        offsetX: -1,
        offsetY: 1,
        backgroundColorId: 0,
      }),
    ).not.toBeNull();
    expect(
      normalizeCanvasFrame({ ...frame, scale: 3, backgroundColorId: 65_534 }),
    ).not.toBeNull();
  });

  it.each([
    undefined,
    null,
    [],
    1,
    "frame",
    {},
    { ...frame, columns: 1 },
    { ...frame, columns: 33 },
    { ...frame, columns: 2.5 },
    { ...frame, columns: "4" },
    { ...frame, rows: 1 },
    { ...frame, rows: 33 },
    { ...frame, rows: 3.5 },
    { ...frame, scale: 0.09 },
    { ...frame, scale: 3.01 },
    { ...frame, scale: NaN },
    { ...frame, scale: Infinity },
    { ...frame, offsetX: -1.01 },
    { ...frame, offsetX: Infinity },
    { ...frame, offsetY: 1.01 },
    { ...frame, offsetY: NaN },
    { ...frame, backgroundColorId: -1 },
    { ...frame, backgroundColorId: 65_535 },
    { ...frame, backgroundColorId: 1.5 },
    { ...frame, backgroundColorId: "42" },
    { ...frame, backgroundColorId: Infinity },
  ])("rejects invalid saved input %#", (value) => {
    expect(normalizeCanvasFrame(value)).toBeNull();
  });
});

describe("canvas frame geometry", () => {
  it.each([
    [400, 200, 4, 4, 400, 400, 0, 100],
    [200, 400, 4, 4, 400, 400, 100, 0],
    [400, 200, 8, 4, 400, 200, 0, 0],
    [400, 200, 4, 8, 400, 800, 0, 300],
    [200, 400, 8, 4, 800, 400, 300, 0],
  ])(
    "fits %sx%s inside %s:%s without stretching",
    (sw, sh, columns, rows, width, height, imageX, imageY) => {
      const layout = canvasFrameLayout(sw, sh, { ...frame, columns, rows });
      expect(layout).toEqual({
        width,
        height,
        imageX,
        imageY,
        imageWidth: sw,
        imageHeight: sh,
      });
      expect(layout.imageWidth / layout.imageHeight).toBe(sw / sh);
    },
  );

  it("scales uniformly and measures offsets against the entire canvas", () => {
    expect(
      canvasFrameLayout(400, 200, {
        ...frame,
        scale: 0.5,
        offsetX: 0.25,
        offsetY: -0.25,
      }),
    ).toEqual({
      width: 400,
      height: 400,
      imageX: 200,
      imageY: 50,
      imageWidth: 200,
      imageHeight: 100,
    });
    expect(canvasFrameLayout(400, 200, { ...frame, scale: 3 })).toEqual({
      width: 400,
      height: 400,
      imageX: -400,
      imageY: -100,
      imageWidth: 1_200,
      imageHeight: 600,
    });
  });

  it("caps dimensions and pixel area before any preview allocation", () => {
    const square = canvasFrameLayout(80_000, 40_000, frame, 100_000);
    expect(square.width).toBeLessThanOrEqual(MAX_EXPORT_SIDE);
    expect(square.height).toBeLessThanOrEqual(MAX_EXPORT_SIDE);
    expect(square.width * square.height).toBeLessThanOrEqual(MAX_EXPORT_PIXELS);
    const wide = canvasFrameLayout(80_000, 40_000, { ...frame, columns: 8 });
    expect(wide.width).toBe(MAX_EXPORT_SIDE);
    expect(wide.height).toBe(MAX_EXPORT_SIDE / 2);
    expect(canvasFrameLayout(400, 200, frame, 100)).toEqual({
      width: 100,
      height: 100,
      imageX: 0,
      imageY: 25,
      imageWidth: 100,
      imageHeight: 50,
    });
    const extreme = canvasFrameLayout(
      1,
      100_000,
      { ...frame, columns: 32, rows: 2 },
      100,
    );
    expect(extreme.width).toBe(100);
    expect(extreme.height).toBeGreaterThanOrEqual(1);
    expect(extreme.imageWidth / extreme.imageHeight).toBeCloseTo(1 / 100_000);
  });

  it.each([
    [0, 1, 100],
    [1, 0, 100],
    [1.5, 2, 100],
    [NaN, 2, 100],
    [Infinity, 2, 100],
    [1, 2, 0],
    [1, 2, NaN],
    [1, 2, Infinity],
  ])("rejects unsafe dimensions %#", (width, height, maxSide) => {
    expect(() => canvasFrameLayout(width, height, frame, maxSide)).toThrow(
      RangeError,
    );
  });

  it("rejects an invalid frame passed directly to geometry", () => {
    expect(() => canvasFrameLayout(10, 10, { ...frame, columns: 33 })).toThrow(
      "Invalid canvas frame.",
    );
  });
});

describe("canvas frame background masks", () => {
  it("uses the same wholly-outside and exact-touching criterion as conversion", () => {
    expect([...canvasFrameBackgroundMask(8, 4, frame, 4, 4)]).toEqual([
      1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1,
    ]);
    expect([
      ...canvasFrameBackgroundMask(8, 4, { ...frame, offsetY: 0.125 }, 4, 4),
    ]).toEqual([1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect([
      ...canvasFrameBackgroundMask(8, 4, { ...frame, offsetX: 0.5 }, 4, 4),
    ]).toEqual([1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1]);
  });

  it("handles full coverage, zoom, clipping, and wholly off-canvas source", () => {
    expect([
      ...canvasFrameBackgroundMask(8, 4, { ...frame, columns: 8 }, 8, 4),
    ]).toEqual(Array(32).fill(0));
    expect([
      ...canvasFrameBackgroundMask(8, 4, { ...frame, scale: 3 }, 4, 4),
    ]).toEqual(Array(16).fill(0));
    expect([
      ...canvasFrameBackgroundMask(8, 4, { ...frame, offsetX: 1 }, 4, 4),
    ]).toEqual(Array(16).fill(1));
  });

  it("bounds mask allocations to the conversion grid limits", () => {
    for (const [width, height] of [
      [0, 4],
      [4, 513],
      [4.5, 4],
      [NaN, 4],
      [4, Infinity],
    ]) {
      expect(() =>
        canvasFrameBackgroundMask(8, 4, frame, width, height),
      ).toThrow(RangeError);
    }
  });
});

describe("framed preview", () => {
  it("only fills outside original image bounds and adjusts the source once", () => {
    const source = solidPixels(4, 2, 96);
    const preview = createFramedPreview(
      source,
      4,
      2,
      frame,
      background.color,
      {
        ...DEFAULT_INPUT_ADJUSTMENTS,
        exposure: 1,
        temperature: 40,
        detail: 80,
      },
      true,
      128,
    );
    expect([preview.width, preview.height]).toEqual([4, 4]);
    expect(pixel(preview.pixels, 4, 1, 0)).toEqual([23, 111, 219, 255]);
    expect(pixel(preview.pixels, 4, 1, 3)).toEqual([23, 111, 219, 255]);
    expect(pixel(preview.pixels, 4, 1, 1)[0]).toBeGreaterThan(96);
    expect([...source]).toEqual([...solidPixels(4, 2, 96)]);
  });

  it("keeps transparent source pixels transparent rather than filling their holes", () => {
    const source = new Uint8ClampedArray([
      10, 20, 30, 0, 40, 50, 60, 127, 70, 80, 90, 128, 100, 110, 120, 200,
    ]);
    const preview = createFramedPreview(
      source,
      4,
      1,
      frame,
      background.color,
      undefined,
      true,
      128,
    );
    expect(pixel(preview.pixels, 4, 0, 1)).toEqual([10, 20, 30, 0]);
    expect(pixel(preview.pixels, 4, 1, 1)).toEqual([40, 50, 60, 0]);
    expect(pixel(preview.pixels, 4, 2, 1)).toEqual([70, 80, 90, 128]);
    expect(pixel(preview.pixels, 4, 3, 1)).toEqual([100, 110, 120, 200]);
    expect(pixel(preview.pixels, 4, 0, 0)).toEqual([23, 111, 219, 255]);
    const opaque = createFramedPreview(
      source,
      4,
      1,
      frame,
      background.color,
      undefined,
      false,
      128,
    );
    expect(pixel(opaque.pixels, 4, 0, 1)).toEqual([10, 20, 30, 255]);
  });

  it("does not threshold, force opaque, or adjust the explicit background", () => {
    const preview = createFramedPreview(
      solidPixels(4, 2),
      4,
      2,
      frame,
      rgba(7, 33, 99, 0.25),
      { ...DEFAULT_INPUT_ADJUSTMENTS, exposure: 2 },
      false,
      200,
    );
    expect(pixel(preview.pixels, 4, 0, 0)).toEqual([7, 33, 99, 64]);
  });

  it("uses centered pixel sampling and clips translated source without stretching", () => {
    const source = new Uint8ClampedArray([
      10, 0, 0, 255, 20, 0, 0, 255, 30, 0, 0, 255, 40, 0, 0, 255,
    ]);
    const shifted = createFramedPreview(
      source,
      4,
      1,
      { ...frame, offsetX: 0.5 },
      background.color,
      undefined,
      true,
      0,
    );
    expect(pixel(shifted.pixels, 4, 1, 1)).toEqual([23, 111, 219, 255]);
    expect(pixel(shifted.pixels, 4, 2, 1)[0]).toBe(10);
    expect(pixel(shifted.pixels, 4, 3, 1)[0]).toBe(20);
    const zoomed = createFramedPreview(
      source,
      4,
      1,
      { ...frame, scale: 2 },
      background.color,
      undefined,
      true,
      0,
    );
    expect([0, 1, 2, 3].map((x) => pixel(zoomed.pixels, 4, x, 1)[0])).toEqual([
      20, 20, 30, 30,
    ]);
    const outside = createFramedPreview(
      source,
      4,
      1,
      { ...frame, offsetX: 1 },
      background.color,
      undefined,
      true,
      0,
    );
    expect([...outside.pixels]).toEqual(
      Array.from({ length: 16 }, () => [23, 111, 219, 255]).flat(),
    );
  });

  it("agrees with the existing source preview when the canvas matches the source", () => {
    const source = solidPixels(8, 4, 81, 120);
    const adjustments = {
      ...DEFAULT_INPUT_ADJUSTMENTS,
      exposure: 0.75,
      detail: -50,
    };
    const framed = createFramedPreview(
      source,
      8,
      4,
      { ...frame, columns: 8 },
      background.color,
      adjustments,
      true,
      100,
      4,
    );
    expect(framed).toEqual(
      createSourcePreview(source, 8, 4, adjustments, true, 100, 4),
    );
  });

  it("checks source storage and alpha threshold before sampling", () => {
    expect(() =>
      createFramedPreview(
        new Uint8ClampedArray(3),
        1,
        1,
        frame,
        background.color,
        undefined,
        true,
        128,
      ),
    ).toThrow("Source pixel data does not match its dimensions.");
    expect(() =>
      createFramedPreview(
        solidPixels(1, 1),
        1,
        1,
        frame,
        background.color,
        undefined,
        true,
        NaN,
      ),
    ).toThrow("Alpha threshold must be between 0 and 255.");
  });
});

describe("framed conversion", () => {
  it.each(methods)(
    "keeps excluded background margins exact for %s",
    (method) => {
      const result = convertImage(solidPixels(8, 4, 96), 8, 4, {
        ...options(method),
        inputAdjustments: { ...DEFAULT_INPUT_ADJUSTMENTS, exposure: 1 },
      });
      expect([...result.colorIds.slice(0, 4)]).toEqual([42, 42, 42, 42]);
      expect([...result.colorIds.slice(12)]).toEqual([42, 42, 42, 42]);
      expect(
        [...result.colorIds.slice(4, 12)].every((id) => id === 10 || id === 20),
      ).toBe(true);
    },
  );

  it.each(["hex", "voronoi"] as const)(
    "keeps excluded margins exact for all supported %s methods",
    (partition) => {
      for (const method of polygonMethods) {
        const result = convertImage(solidPixels(8, 4), 8, 4, {
          ...options(method),
          partition,
          partitionScale: 2,
        });
        expect([...result.colorIds]).toEqual([
          42, 42, 42, 42, 10, 10, 10, 10, 10, 10, 10, 10, 42, 42, 42, 42,
        ]);
      }
    },
  );

  it.each(["square", "hex", "voronoi"] as const)(
    "preserves legacy alpha=0 threshold=0 source handling and excluded fill for %s",
    (partition) => {
      const supportedMethods =
        partition === "square" ? methods : polygonMethods;
      for (const method of supportedMethods) {
        const source = solidPixels(8, 4, 0, 0);
        const framedOptions = {
          ...options(method),
          partition,
          partitionScale: 2,
          alphaThreshold: 0,
        };
        const legacy = convertImage(source, 8, 4, {
          ...framedOptions,
          frame: undefined,
          frameBackground: undefined,
        });
        // Existing conversion uses alpha < threshold, not <=. A zero-alpha
        // source still participates in matching when the threshold is zero.
        expect([...legacy.colorIds]).toEqual(Array(16).fill(10));
        expect([...convertImage(source, 8, 4, framedOptions).colorIds]).toEqual(
          [42, 42, 42, 42, 10, 10, 10, 10, 10, 10, 10, 10, 42, 42, 42, 42],
        );
        expect([
          ...convertImage(source, 8, 4, {
            ...framedOptions,
            frame: { ...frame, columns: 8 },
          }).colorIds,
        ]).toEqual([...legacy.colorIds]);
      }
    },
  );

  it("does not replace transparent source cells with the background", () => {
    const result = convertImage(
      solidPixels(8, 4, 0, 0),
      8,
      4,
      options("center"),
    );
    expect([...result.colorIds]).toEqual([
      42,
      42,
      42,
      42,
      TRANSPARENT_COLOR_ID,
      TRANSPARENT_COLOR_ID,
      TRANSPARENT_COLOR_ID,
      TRANSPARENT_COLOR_ID,
      TRANSPARENT_COLOR_ID,
      TRANSPARENT_COLOR_ID,
      TRANSPARENT_COLOR_ID,
      TRANSPARENT_COLOR_ID,
      42,
      42,
      42,
      42,
    ]);
  });

  it("only locks wholly outside cells, including exact touching edges", () => {
    const shifted = convertImage(solidPixels(8, 4), 8, 4, {
      ...options("center"),
      frame: { ...frame, offsetY: 0.125 },
    });
    // Image covers y=3..7 in an 8x8 virtual canvas. Row zero is outside;
    // rows one and three partially overlap, so their center samples are matched.
    expect([...shifted.colorIds]).toEqual([
      42, 42, 42, 42, 10, 10, 10, 10, 10, 10, 10, 10, 20, 20, 20, 20,
    ]);
    const clipped = convertImage(solidPixels(8, 4), 8, 4, {
      ...options("center"),
      frame: { ...frame, offsetX: 0.5 },
    });
    expect([...clipped.colorIds]).toEqual([
      42, 42, 42, 42, 42, 42, 10, 10, 42, 42, 10, 10, 42, 42, 42, 42,
    ]);
  });

  it("keeps fill exact with method overrides and completely off-canvas images", () => {
    const methodOverrides = new Uint8Array(16).fill(METHOD_INHERIT);
    methodOverrides[0] = METHOD_CENTER;
    expect([
      ...convertImage(solidPixels(8, 4), 8, 4, {
        ...options("dither"),
        methodOverrides,
        frame: { ...frame, offsetX: 1 },
      }).colorIds,
    ]).toEqual(Array(16).fill(42));
  });

  it("resolves an included background but requires the explicit excluded color", () => {
    const included = convertImage(solidPixels(8, 4), 8, 4, {
      ...options(),
      palette: [...palette, background],
      frameBackground: undefined,
    });
    expect(included.colorIds[0]).toBe(42);
    expect(() =>
      convertImage(solidPixels(8, 4), 8, 4, {
        ...options(),
        frameBackground: undefined,
      }),
    ).toThrow("supply frameBackground");
    expect(() =>
      convertImage(solidPixels(8, 4), 8, 4, {
        ...options(),
        frameBackground: palette[0],
      }),
    ).toThrow("Frame background must match backgroundColorId");
    expect(() =>
      convertImage(solidPixels(8, 4), 8, 4, {
        ...options(),
        frame: { ...frame, scale: 4 },
      }),
    ).toThrow("Invalid canvas frame.");
  });

  it.each(methods)(
    "leaves the no-frame %s conversion path unchanged",
    (method) => {
      const source = solidPixels(8, 4, 96);
      const unframed = { ...options(method), frame: undefined };
      const result = convertImage(source, 8, 4, unframed);
      expect(result).toEqual(
        convertImage(source, 8, 4, { ...unframed, frameBackground: undefined }),
      );
      const matchingFrame = convertImage(source, 8, 4, {
        ...options(method),
        frame: { ...frame, columns: 8 },
      });
      expect(matchingFrame).toEqual(result);
    },
  );

  it("explicitly rejects framing in teaching traces", () => {
    expect(() =>
      traceImageConversion(solidPixels(8, 4), 8, 4, options()),
    ).toThrow("Teaching traces do not support canvas framing.");
    expect(
      traceImageConversion(solidPixels(8, 4), 8, 4, {
        ...options(),
        frame: undefined,
      }).cells,
    ).toHaveLength(16);
  });
});

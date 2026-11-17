import { describe, expect, it } from "vitest";
import { rgba } from "@pigment/color";
import {
  composeColorIds,
  NO_OVERRIDE_COLOR_ID,
  type CanvasFrame,
} from "@pigment/quantization";
import {
  canvasBackground,
  canvasGridDimensions,
  sameCanvasGeometry,
} from "@/lib/browser/canvas-frame";

const frame: CanvasFrame = {
  columns: 4,
  rows: 5,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  backgroundColorId: 7,
};

describe("canvas framing integration rules", () => {
  it("fits output resolution to the exact canvas ratio", () => {
    expect(canvasGridDimensions(frame, "height", 64)).toEqual({
      width: 52,
      height: 65,
    });
    expect(canvasGridDimensions(frame, "width", 64)).toEqual({
      width: 64,
      height: 80,
    });
    expect(canvasGridDimensions({ columns: 4, rows: 4 }, "width", 63)).toEqual({
      width: 63,
      height: 63,
    });
  });

  it("keeps extreme aspect ratios within grid limits with square cells", () => {
    for (const value of [4, 64, 512]) {
      for (const ratio of [
        { columns: 32, rows: 2 },
        { columns: 31, rows: 32 },
      ]) {
        const dimensions = canvasGridDimensions(ratio, "width", value);
        expect(dimensions.width).toBeGreaterThanOrEqual(4);
        expect(dimensions.height).toBeGreaterThanOrEqual(4);
        expect(dimensions.width).toBeLessThanOrEqual(512);
        expect(dimensions.height).toBeLessThanOrEqual(512);
        expect(dimensions.width / dimensions.height).toBeCloseTo(
          ratio.columns / ratio.rows,
        );
      }
    }
  });

  it("does not clear paint when only the background changes", () => {
    expect(sameCanvasGeometry(frame, { ...frame, backgroundColorId: 2 })).toBe(
      true,
    );
    expect(sameCanvasGeometry(frame, { ...frame, columns: 8, rows: 10 })).toBe(
      true,
    );
    expect(sameCanvasGeometry(frame, { ...frame, offsetX: 0.1 })).toBe(false);
    expect(sameCanvasGeometry(frame, { ...frame, scale: 0.5 })).toBe(false);
    expect(sameCanvasGeometry(frame, { ...frame, rows: 4 })).toBe(false);
    expect(sameCanvasGeometry(frame, null)).toBe(false);
    expect(sameCanvasGeometry(null, null)).toBe(true);
    const paint = Int32Array.from([NO_OVERRIDE_COLOR_ID, 9]);
    expect([...composeColorIds(Uint16Array.from([7, 7]), paint)]).toEqual([
      7, 9,
    ]);
    expect([...composeColorIds(Uint16Array.from([2, 2]), paint)]).toEqual([
      2, 9,
    ]);
  });

  it("resolves the background independently of the conversion matching palette", () => {
    const palette = [
      { id: 7, color: rgba(255, 0, 0) },
      { id: 9, color: rgba(0, 0, 0) },
    ];
    expect(canvasBackground(frame, palette)?.id).toBe(7);
    expect(
      canvasBackground({ ...frame, backgroundColorId: 100 }, palette)?.id,
    ).toBe(7);
    expect(canvasBackground(null, palette)).toBeUndefined();
  });
});
